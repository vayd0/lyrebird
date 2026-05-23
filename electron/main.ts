import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import * as path from 'path';
import { MediaDetector } from './media';
import { fetchLyrics } from './lyrics';
import { loadSettings, saveSettings, Settings } from './settings';
import { embedInDesktop, stopDesktopEmbed } from './desktop';

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let trayMenuWindow: BrowserWindow | null = null;
let mediaDetector: MediaDetector | null = null;
let tray: Tray | null = null;
let currentTrackKey = '';
let currentThumbnail: string | null = null;
let currentLyrics: any[] | null = null;

const iconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.ico')
  : path.join(__dirname, '../src/assets/img/icon.ico');
let currentLyricsStatus = 'idle';
let settings: Settings;

function getBaseUrl() {
  if (!app.isPackaged) return 'http://localhost:5173';
  return `file://${path.join(__dirname, '../dist/index.html')}`;
}

function createMainWindow() {
  settings = loadSettings();
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().size;

  const x = settings.window.x ?? screenWidth - settings.window.width - 40;
  const y = settings.window.y ?? screenHeight - settings.window.height - 80;

  mainWindow = new BrowserWindow({
    width: settings.window.width,
    height: settings.window.height,
    x,
    y,
    frame: false,
    resizable: true,
    movable: true,
    skipTaskbar: true,
    transparent: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('will-resize', (e) => e.preventDefault());

  let moveTimer: ReturnType<typeof setTimeout> | null = null;
  mainWindow.on('moved', () => {
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      if (!mainWindow) return;
      const [nx, ny] = mainWindow.getPosition();
      settings.window.x = nx;
      settings.window.y = ny;
      saveSettings(settings);
    }, 300);
  });


  mainWindow.once('ready-to-show', async () => {
    mainWindow?.show();
    await embedInDesktop(mainWindow!);
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(`${getBaseUrl()}#overlay`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'overlay' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 910,
    height: 580,
    minWidth: 750,
    minHeight: 480,
    frame: false,
    transparent: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  const base = getBaseUrl();
  if (!app.isPackaged) {
    settingsWindow.loadURL(`${base}#settings`);
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'settings' });
  }

  settingsWindow.on('closed', () => { settingsWindow = null; });
}

function applyWindowSettings(s: Settings) {
  if (!mainWindow) return;
  const [curW, curH] = mainWindow.getSize();
  if (curW !== s.window.width || curH !== s.window.height) {
    const [curX, curY] = mainWindow.getPosition();
    mainWindow.setBounds({
      x: curX,
      y: curY,
      width: s.window.width,
      height: s.window.height,
    });
  }
  mainWindow.setAlwaysOnTop(s.window.alwaysOnTop);
  app.setLoginItemSettings({ openAtLogin: s.behavior.launchOnStartup });
}

function showTrayMenu() {
  if (trayMenuWindow) {
    trayMenuWindow.close();
    return;
  }

  const trayBounds = tray!.getBounds();
  const winWidth = 180;
  const winHeight = 120;
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - winWidth / 2);
  const y = Math.round(trayBounds.y - winHeight - 4);

  trayMenuWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    frame: false,
    transparent: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  trayMenuWindow.once('ready-to-show', () => trayMenuWindow?.show());
  trayMenuWindow.on('blur', () => {
    trayMenuWindow?.close();
  });
  trayMenuWindow.on('closed', () => { trayMenuWindow = null; });

  if (!app.isPackaged) {
    trayMenuWindow.loadURL(`${getBaseUrl()}#tray-menu`);
  } else {
    trayMenuWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'tray-menu' });
  }
}

function startMediaDetection() {
  mediaDetector = new MediaDetector();

  mediaDetector.on('update', (info) => {
    if (info.thumbnail && info.thumbnail !== currentThumbnail) {
      currentThumbnail = info.thumbnail;
      mainWindow?.webContents.send('thumbnail-update', info.thumbnail);
    }
    mainWindow?.webContents.send('media-update', {
      title: info.title,
      artist: info.artist,
      album: info.album,
      position: info.position,
      duration: info.duration,
      status: info.status,
    });
  });

  mediaDetector.on('trackChanged', async (info) => {
    const trackKey = `${info.artist}|||${info.title}`;
    if (trackKey === currentTrackKey) return;
    currentTrackKey = trackKey;

    currentLyrics = null;
    currentLyricsStatus = 'loading';
    mainWindow?.webContents.send('lyrics-status', 'loading');

    if (!info.title) {
      currentLyrics = null;
      currentLyricsStatus = 'idle';
      mainWindow?.webContents.send('lyrics-update', null);
      mainWindow?.webContents.send('lyrics-status', 'idle');
      return;
    }

    const lyrics = await fetchLyrics(info.artist, info.title, info.album, info.duration);
    if (currentTrackKey !== trackKey) return;

    currentLyrics = lyrics;
    currentLyricsStatus = lyrics ? 'loaded' : 'not-found';
    mainWindow?.webContents.send('lyrics-update', lyrics);
    mainWindow?.webContents.send('lyrics-status', currentLyricsStatus);
  });

  mediaDetector.start();
}

app.whenReady().then(() => {
  createMainWindow();

  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Lyrebird');
  tray.on('click', () => openSettingsWindow());
  tray.on('right-click', () => showTrayMenu());

  startMediaDetection();

  ipcMain.handle('get-settings', () => settings);
  ipcMain.handle('get-thumbnail', () => currentThumbnail);
  ipcMain.handle('get-lyrics', () => currentLyrics);
  ipcMain.handle('get-lyrics-status', () => currentLyricsStatus);

  ipcMain.handle('save-settings', (_, newSettings: Settings) => {
    settings = newSettings;
    saveSettings(settings);
    applyWindowSettings(settings);
    mainWindow?.webContents.send('settings-changed', settings);
  });

  ipcMain.on('media-command', (_, cmd: string) => mediaDetector?.sendCommand(cmd));
  ipcMain.on('open-settings', () => openSettingsWindow());

  ipcMain.on('toggle-overlay', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
  });

  globalShortcut.register('Alt+Shift+L', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
  });

  ipcMain.on('tray-open-settings', () => {
    trayMenuWindow?.close();
    openSettingsWindow();
  });

  ipcMain.on('tray-quit', () => {
    trayMenuWindow?.close();
    stopDesktopEmbed();
    app.quit();
  });

  ipcMain.on('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win === settingsWindow) {
      settingsWindow?.close();
    } else {
      stopDesktopEmbed();
      app.quit();
    }
  });
});

app.on('window-all-closed', () => {
  // keep running in tray
});
