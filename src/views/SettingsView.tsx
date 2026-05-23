import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings } from '../types';
import logoSvg from '../assets/img/logo.svg';
import { AppWindow, Sun, Type, Music, Settings as SettingsIcon, ChevronDown } from 'lucide-react';

const sections = [
  { id: 'behavior', label: 'General', color: '#000000' },
  { id: 'lyrics', label: 'Lyrics', color: '#000000' },
  { id: 'text', label: 'Text', color: '#000000' },
  { id: 'theme', label: 'Theme', color: '#000000' },
  { id: 'window', label: 'Window', color: '#000000' },
] as const;

const sectionIcons: Record<string, JSX.Element> = {
  window: <AppWindow size={20} />,
  theme: <Sun size={20} />,
  text: <Type size={20} />,
  lyrics: <Music size={20} />,
  behavior: <SettingsIcon size={20} />,
};

type SectionId = (typeof sections)[number]['id'];

const fonts = [
  'Segoe UI', 'Arial', 'Calibri', 'Cambria',
  'Consolas', 'Georgia', 'Verdana', 'Trebuchet MS',
];

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('behavior');
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const navRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const sidebarRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    window.api.getSettings().then(setSettings);
  }, []);

  const updateIndicator = useCallback(() => {
    const btn = navRefs.current.get(activeSection);
    const nav = sidebarRef.current;
    if (!btn || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({ top: btnRect.top - navRect.top, height: btnRect.height });
  }, [activeSection]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    requestAnimationFrame(updateIndicator);
  }, [settings]);

  const update = useCallback(
    (path: string, value: any) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const next = deepSet(prev, path, value);
        clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => window.api.saveSettings(next), 120);
        return next;
      });
    },
    []
  );

  if (!settings) return null;

  const active = sections.find((s) => s.id === activeSection)!;

  return (
    <div className="s-root">
      <div className="s-main-bg" />
      <div className="s-titlebar">
        <div className="s-title-group">
          <img className="s-logo" src={logoSvg} alt="" draggable={false} />
          <span className="s-title">Lyrebird</span>
        </div>
        <div className="s-traffic">
          <button className="s-traffic-btn s-traffic-close" onClick={() => window.api.closeWindow()} />
        </div>
      </div>

      <div className="s-body">
        <nav className="s-sidebar" ref={sidebarRef}>
          {indicator && (
            <div className="s-nav-indicator" style={{ top: indicator.top, height: indicator.height }} />
          )}
          {sections.map((s) => (
            <button
              key={s.id}
              ref={(el) => { if (el) navRefs.current.set(s.id, el); }}
              className={`s-nav-item ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <span className="s-nav-icon" style={{ color: activeSection === s.id ? '#fff' : undefined }}>
                {sectionIcons[s.id]}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <main className="s-content">
          <div className="s-panel">
            <div className="s-hero">
              <div className="s-hero-icon" style={{ color: active.color }}>
                {sectionIcons[active.id]}
              </div>
              <h2>{active.label}</h2>
            </div>

            {activeSection === 'window' && (
              <div className="s-groups">
                <div className="s-group">
                  <GroupTitle>Dimensions</GroupTitle>
                  <Slider label="Width" value={settings.window.width} min={280} max={600} suffix=" px" onChange={(v) => update('window.width', v)} />
                  <Slider label="Height" value={settings.window.height} min={300} max={800} suffix=" px" onChange={(v) => update('window.height', v)} />
                  <Slider label="Padding" value={settings.window.padding} min={0} max={40} suffix=" px" onChange={(v) => update('window.padding', v)} />
                </div>
                <div className="s-group">
                  <GroupTitle>Display</GroupTitle>
                  <Slider label="Opacity" value={settings.window.opacity} min={20} max={100} suffix="%" onChange={(v) => update('window.opacity', v)} />
                  <Toggle label="Always on top" value={settings.window.alwaysOnTop} onChange={(v) => update('window.alwaysOnTop', v)} />
                </div>
              </div>
            )}

            {activeSection === 'theme' && (
              <div className="s-groups">
                <div className="s-group">
                  <GroupTitle>Background type</GroupTitle>
                  <Segments
                    value={settings.theme.backgroundType}
                    options={[
                      { value: 'gradient', label: 'Gradient' },
                      { value: 'solid', label: 'Solid' },
                      { value: 'albumArt', label: 'Album art' },
                      { value: 'transparent', label: 'None' },
                    ]}
                    onChange={(v) => update('theme.backgroundType', v)}
                  />
                  {(settings.theme.backgroundType === 'solid' || settings.theme.backgroundType === 'gradient') && (
                    <Color label="Primary color" value={settings.theme.primaryColor} onChange={(v) => update('theme.primaryColor', v)} />
                  )}
                  {settings.theme.backgroundType === 'gradient' && (
                    <Color label="Secondary color" value={settings.theme.secondaryColor} onChange={(v) => update('theme.secondaryColor', v)} />
                  )}
                  {settings.theme.backgroundType === 'albumArt' && (
                    <Slider label="Blur intensity" value={settings.theme.blurIntensity} min={0} max={50} suffix=" px" onChange={(v) => update('theme.blurIntensity', v)} />
                  )}
                </div>
                <div className="s-group">
                  <GroupTitle>Style</GroupTitle>
                  <Slider label="Background opacity" value={settings.theme.backgroundOpacity} min={30} max={100} suffix="%" onChange={(v) => update('theme.backgroundOpacity', v)} />
                  <Slider label="Border radius" value={settings.theme.borderRadius} min={0} max={32} suffix=" px" onChange={(v) => update('theme.borderRadius', v)} />
                </div>
              </div>
            )}

            {activeSection === 'text' && (
              <div className="s-groups">
                <div className="s-group">
                  <GroupTitle>Font</GroupTitle>
                  <Select label="Family" value={settings.typography.fontFamily} options={fonts.map((f) => ({ value: f, label: f }))} onChange={(v) => update('typography.fontFamily', v)} />
                </div>
                <div className="s-group">
                  <GroupTitle>Sizes</GroupTitle>
                  <Slider label="Active line" value={settings.typography.activeFontSize} min={14} max={36} suffix=" px" onChange={(v) => update('typography.activeFontSize', v)} />
                  <Slider label="Inactive lines" value={settings.typography.inactiveFontSize} min={10} max={28} suffix=" px" onChange={(v) => update('typography.inactiveFontSize', v)} />
                  <Slider label="Line spacing" value={settings.typography.lineSpacing} min={1} max={3} step={0.1} onChange={(v) => update('typography.lineSpacing', v)} />
                </div>
              </div>
            )}

            {activeSection === 'lyrics' && (
              <div className="s-groups">
                <div className="s-group">
                  <GroupTitle>Animation</GroupTitle>
                  <Slider label="Transition speed" value={settings.lyrics.transitionSpeed} min={100} max={800} suffix=" ms" onChange={(v) => update('lyrics.transitionSpeed', v)} />
                </div>
                <div className="s-group">
                  <GroupTitle>Layout</GroupTitle>
                  <Segments
                    value={settings.lyrics.alignment}
                    options={[
                      { value: 'left', label: 'Left' },
                      { value: 'center', label: 'Center' },
                      { value: 'right', label: 'Right' },
                    ]}
                    onChange={(v) => update('lyrics.alignment', v)}
                  />
                  <Toggle label="Show past lines" value={settings.lyrics.showPastLyrics} onChange={(v) => update('lyrics.showPastLyrics', v)} />
                  <Toggle label="Fade edges" value={settings.lyrics.fadeEdges} onChange={(v) => update('lyrics.fadeEdges', v)} />
                  <Slider label="Sync offset" value={settings.lyrics.offset} min={-1} max={2} step={0.1} suffix=" s" onChange={(v) => update('lyrics.offset', v)} />
                </div>
              </div>
            )}

            {activeSection === 'behavior' && (
              <div className="s-groups">
                <div className="s-group">
                  <GroupTitle>Visibility</GroupTitle>
                  <Toggle label="Hide on pause" value={settings.behavior.autoHideOnPause} onChange={(v) => update('behavior.autoHideOnPause', v)} />
                  <Toggle label="Track info" value={settings.behavior.showTrackInfo} onChange={(v) => update('behavior.showTrackInfo', v)} />
                  <Toggle label="Playback controls" value={settings.behavior.showControls} onChange={(v) => update('behavior.showControls', v)} />
                  <Toggle label="Settings button" value={settings.behavior.showSettingsButton} onChange={(v) => update('behavior.showSettingsButton', v)} />
                  <Toggle label="Launch on startup" value={settings.behavior.launchOnStartup} onChange={(v) => update('behavior.launchOnStartup', v)} />
                  <div className="s-field s-field-row" style={{ cursor: 'pointer' }} onClick={() => window.api.toggleOverlay()}>
                    <span>Toggle overlay</span>
                    <span className="s-field-value">Alt+Shift+L</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <div className="s-group-title">{children}</div>;
}

function Slider({ label, value, min, max, step = 1, suffix = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="s-field">
      <div className="s-field-head">
        <span>{label}</span>
        <span className="s-field-value">{step < 1 ? value.toFixed(1) : value}{suffix}</span>
      </div>
      <div className="s-slider-track">
        <div className="s-slider-fill" style={{ width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="s-field s-field-row" onClick={() => onChange(!value)} style={{ cursor: 'pointer' }}>
      <span>{label}</span>
      <button className={`toggle ${value ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onChange(!value); }}>
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}

function Segments({ value, options, onChange }: {
  value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="s-segments">
      {options.map((o) => (
        <button
          key={o.value}
          className={`s-segment ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="s-field">
      <span className="s-field-label">{label}</span>
      <div className="s-select" ref={ref}>
        <button className="s-select-trigger" onClick={() => setOpen(!open)}>
          <span style={{ fontFamily: selected?.value }}>{selected?.label}</span>
          <ChevronDown size={12} strokeWidth={2.5} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {open && (
          <div className="s-select-dropdown">
            {options.map((o) => (
              <button
                key={o.value}
                className={`s-select-option ${o.value === value ? 'active' : ''}`}
                style={{ fontFamily: o.value }}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="s-field s-field-row">
      <span>{label}</span>
      <div className="s-color-wrapper">
        <div className="s-color-preview" style={{ background: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function deepSet(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const result = { ...obj };
  let cur = result;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...cur[keys[i]] };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return result;
}
