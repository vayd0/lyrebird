import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { createInterface } from 'readline';
import * as path from 'path';
import { app } from 'electron';

export interface MediaInfo {
  title: string;
  artist: string;
  album: string;
  position: number;
  duration: number;
  status: string;
  trackChanged: boolean;
  thumbnail: string | null;
}

export class MediaDetector extends EventEmitter {
  private process: ChildProcess | null = null;
  private lastTrackKey = '';

  start() {
    this.spawn();
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  sendCommand(cmd: string) {
    this.process?.stdin?.write(cmd + '\n');
  }

  private getBridgePath(): { cmd: string; args: string[] } {
    if (app.isPackaged) {
      const exe = path.join(process.resourcesPath, 'media-bridge', 'MediaBridge.exe');
      return { cmd: exe, args: [] };
    }
    return {
      cmd: 'dotnet',
      args: ['run', '-c', 'Release', '--project', path.join(app.getAppPath(), 'media-bridge')],
    };
  }

  private spawn() {
    this.stop();

    const { cmd, args } = this.getBridgePath();

    this.process = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    });

    const rl = createInterface({ input: this.process.stdout! });

    rl.on('line', (line) => {
      try {
        const info: MediaInfo = JSON.parse(line);
        this.emit('update', info);

        const trackKey = `${info.artist}|||${info.title}`;
        if (trackKey !== this.lastTrackKey) {
          this.lastTrackKey = trackKey;
          this.emit('trackChanged', info);
        }
      } catch {
        // ignore malformed lines
      }
    });

    this.process.on('exit', () => {
      setTimeout(() => this.spawn(), 3000);
    });
  }
}
