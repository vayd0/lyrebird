import { execFile } from 'child_process';
import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const PS_SCRIPT = `
param([long]$hwnd)

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class DesktopWidget {
    static readonly IntPtr HWND_BOTTOM = new IntPtr(1);
    const uint SWP_NOMOVE = 0x0002;
    const uint SWP_NOSIZE = 0x0001;
    const uint SWP_NOACTIVATE = 0x0010;

    const int GWL_EXSTYLE = -20;
    const int WS_EX_TOOLWINDOW = 0x00000080;
    const int WS_EX_NOACTIVATE = 0x08000000;

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    public static void SendToDesktop(long hwndValue) {
        IntPtr hwnd = new IntPtr(hwndValue);

        int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
        exStyle |= WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
        SetWindowLong(hwnd, GWL_EXSTYLE, exStyle);

        SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
    }
}
"@

[DesktopWidget]::SendToDesktop($hwnd)
Write-Output "OK"
`;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function embedInDesktop(window: BrowserWindow): Promise<boolean> {
  return new Promise((resolve) => {
    const hwndBuffer = window.getNativeWindowHandle();
    const hwnd =
      hwndBuffer.length >= 8
        ? hwndBuffer.readBigInt64LE(0).toString()
        : hwndBuffer.readInt32LE(0).toString();

    const scriptPath = path.join(app.getPath('temp'), 'lyrics-desktop.ps1');
    fs.writeFileSync(scriptPath, PS_SCRIPT, 'utf-8');

    const sendToBottom = () => {
      execFile(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-hwnd', hwnd],
        { timeout: 5000, windowsHide: true },
        () => {}
      );
    };

    execFile(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-hwnd', hwnd],
      { timeout: 10000, windowsHide: true },
      (err, stdout) => {
        const ok = !err && stdout.trim() === 'OK';
        if (ok) {
          // Keep pushing to bottom when other windows change
          intervalHandle = setInterval(sendToBottom, 2000);
          window.on('focus', sendToBottom);
        }
        resolve(ok);
      }
    );
  });
}

export function stopDesktopEmbed() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
