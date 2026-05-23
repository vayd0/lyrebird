import { useState, useEffect } from 'react';
import OverlayView from './views/OverlayView';
import SettingsView from './views/SettingsView';
import TrayMenuView from './views/TrayMenuView';

export default function App() {
  const [view, setView] = useState<'overlay' | 'settings' | 'tray-menu'>('overlay');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'settings') setView('settings');
    else if (hash === 'tray-menu') setView('tray-menu');
    else setView('overlay');
  }, []);

  if (view === 'settings') return <SettingsView />;
  if (view === 'tray-menu') return <TrayMenuView />;
  return <OverlayView />;
}
