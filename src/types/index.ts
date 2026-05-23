export interface MediaInfo {
  title: string;
  artist: string;
  album: string;
  position: number;
  duration: number;
  status: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface Settings {
  window: {
    width: number;
    height: number;
    x: number | null;
    y: number | null;
    alwaysOnTop: boolean;
    opacity: number;
    padding: number;
  };
  theme: {
    backgroundType: 'gradient' | 'albumArt' | 'solid' | 'transparent';
    primaryColor: string;
    secondaryColor: string;
    blurIntensity: number;
    borderRadius: number;
    backgroundOpacity: number;
  };
  typography: {
    fontFamily: string;
    activeFontSize: number;
    inactiveFontSize: number;
    lineSpacing: number;
  };
  lyrics: {
    transitionSpeed: number;
    alignment: 'center' | 'left' | 'right';
    showPastLyrics: boolean;
    fadeEdges: boolean;
    offset: number;
  };
  behavior: {
    autoHideOnPause: boolean;
    showTrackInfo: boolean;
    showControls: boolean;
    showSettingsButton: boolean;
    launchOnStartup: boolean;
  };
}

type CleanupFn = () => void;

declare global {
  interface Window {
    api: {
      onMediaUpdate: (callback: (data: MediaInfo) => void) => CleanupFn;
      onLyricsUpdate: (callback: (data: LyricLine[] | null) => void) => CleanupFn;
      onLyricsStatus: (callback: (status: string) => void) => CleanupFn;
      onThumbnailUpdate: (callback: (data: string | null) => void) => CleanupFn;
      onSettingsChanged: (callback: (data: Settings) => void) => CleanupFn;
      getSettings: () => Promise<Settings>;
      getThumbnail: () => Promise<string | null>;
      getLyrics: () => Promise<LyricLine[] | null>;
      getLyricsStatus: () => Promise<string>;
      saveSettings: (settings: Settings) => Promise<void>;
      mediaCommand: (cmd: string) => void;
      openSettings: () => void;
      toggleOverlay: () => void;
      trayOpenSettings: () => void;
      trayQuit: () => void;
      closeWindow: () => void;
    };
  }
}
