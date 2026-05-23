import { Settings, LogOut } from 'lucide-react';

export default function TrayMenuView() {
  return (
    <div className="tray-menu">
      <button className="tray-menu-item" onClick={() => window.api.trayOpenSettings()}>
        <Settings size={16} />
        <span>Settings</span>
      </button>
      <div className="tray-menu-sep" />
      <button className="tray-menu-item tray-menu-quit" onClick={() => window.api.trayQuit()}>
        <LogOut size={16} />
        <span>Quit</span>
      </button>
    </div>
  );
}
