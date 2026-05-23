import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

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
  };
  behavior: {
    autoHideOnPause: boolean;
    showTrackInfo: boolean;
    showControls: boolean;
    showSettingsButton: boolean;
    launchOnStartup: boolean;
  };
}

export const defaults: Settings = {
  window: {
    width: 380,
    height: 520,
    x: null,
    y: null,
    alwaysOnTop: true,
    opacity: 100,
    padding: 28,
  },
  theme: {
    backgroundType: 'gradient',
    primaryColor: '#1a1a2e',
    secondaryColor: '#0f3460',
    blurIntensity: 20,
    borderRadius: 16,
    backgroundOpacity: 90,
  },
  typography: {
    fontFamily: 'Segoe UI',
    activeFontSize: 20,
    inactiveFontSize: 16,
    lineSpacing: 1.5,
  },
  lyrics: {
    transitionSpeed: 350,
    alignment: 'center',
    showPastLyrics: true,
    fadeEdges: true,
  },
  behavior: {
    autoHideOnPause: false,
    showTrackInfo: true,
    showControls: true,
    showSettingsButton: true,
    launchOnStartup: false,
  },
};

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8');
    const saved = JSON.parse(raw);
    return deepMerge(defaults, saved);
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings: Settings): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

function deepMerge(base: any, override: any): any {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (
      typeof base[key] === 'object' &&
      base[key] !== null &&
      typeof override[key] === 'object' &&
      override[key] !== null &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}
