import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('api', {
  onMediaUpdate: (callback: (data: any) => void) => {
    const handler = (_: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('media-update', handler);
    return () => { ipcRenderer.removeListener('media-update', handler); };
  },
  onLyricsUpdate: (callback: (data: any) => void) => {
    const handler = (_: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('lyrics-update', handler);
    return () => { ipcRenderer.removeListener('lyrics-update', handler); };
  },
  onLyricsStatus: (callback: (status: string) => void) => {
    const handler = (_: IpcRendererEvent, status: string) => callback(status);
    ipcRenderer.on('lyrics-status', handler);
    return () => { ipcRenderer.removeListener('lyrics-status', handler); };
  },
  onThumbnailUpdate: (callback: (data: string | null) => void) => {
    const handler = (_: IpcRendererEvent, data: string | null) => callback(data);
    ipcRenderer.on('thumbnail-update', handler);
    return () => { ipcRenderer.removeListener('thumbnail-update', handler); };
  },
  onSettingsChanged: (callback: (data: any) => void) => {
    const handler = (_: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('settings-changed', handler);
    return () => { ipcRenderer.removeListener('settings-changed', handler); };
  },
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getThumbnail: () => ipcRenderer.invoke('get-thumbnail'),
  getLyrics: () => ipcRenderer.invoke('get-lyrics'),
  getLyricsStatus: () => ipcRenderer.invoke('get-lyrics-status'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  mediaCommand: (cmd: string) => ipcRenderer.send('media-command', cmd),
  openSettings: () => ipcRenderer.send('open-settings'),
  toggleOverlay: () => ipcRenderer.send('toggle-overlay'),
  trayOpenSettings: () => ipcRenderer.send('tray-open-settings'),
  trayQuit: () => ipcRenderer.send('tray-quit'),
  closeWindow: () => ipcRenderer.send('close-window'),
});
