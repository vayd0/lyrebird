import { useRef, useEffect, useCallback, CSSProperties } from 'react';
import { LyricLine, Settings } from '../types';
import { Settings as SettingsIcon, SkipBack, SkipForward, Play, Pause } from 'lucide-react';

interface Props {
  lyrics: LyricLine[] | null;
  currentIndex: number;
  title: string;
  artist: string;
  isPlaying: boolean;
  isSynced: boolean;
  status: string;
  settings: Settings;
  thumbnail: string | null;
}

export default function LyricsOverlay({
  lyrics,
  currentIndex,
  title,
  artist,
  isPlaying,
  isSynced,
  status,
  settings,
  thumbnail,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!isSynced || currentIndex < 0) return;
    const el = lineRefs.current.get(currentIndex);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentIndex, isSynced]);

  const setLineRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) lineRefs.current.set(index, el);
    else lineRefs.current.delete(index);
  }, []);

  const { theme, typography, lyrics: lyricsSettings, behavior } = settings;

  const bgMap: Record<string, string> = {
    solid: theme.primaryColor,
    gradient: `linear-gradient(160deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`,
    albumArt: 'transparent',
    transparent: 'transparent',
  };

  const overlayStyle: CSSProperties = {
    borderRadius: theme.borderRadius,
    fontFamily: `'${typography.fontFamily}', sans-serif`,
    background: bgMap[theme.backgroundType] ?? 'transparent',
    opacity: settings.window.opacity / 100,
    padding: settings.window.padding,
  };

  const viewportStyle: CSSProperties = {
    WebkitMaskImage: lyricsSettings.fadeEdges
      ? 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)'
      : 'none',
    maskImage: lyricsSettings.fadeEdges
      ? 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)'
      : 'none',
  };

  const lineStyle = (i: number): CSSProperties => {
    const isActive = isSynced && i === currentIndex;
    const isPast = isSynced && i < currentIndex;
    return {
      fontSize: isActive ? typography.activeFontSize : typography.inactiveFontSize,
      lineHeight: typography.lineSpacing,
      textAlign: lyricsSettings.alignment,
      transition: `all ${lyricsSettings.transitionSpeed}ms ease`,
      opacity: isPast && !lyricsSettings.showPastLyrics ? 0 : undefined,
    };
  };

  const showAlbumBg = theme.backgroundType === 'albumArt' && thumbnail;

  return (
    <div className="overlay" style={overlayStyle}>
      {showAlbumBg && (
        <div
          className="bg-album"
          style={{
            backgroundImage: `url(${thumbnail})`,
            filter: `blur(${theme.blurIntensity}px) brightness(0.4)`,
            opacity: theme.backgroundOpacity / 100,
            borderRadius: theme.borderRadius,
          }}
        />
      )}

      <div className="titlebar">
        {behavior.showSettingsButton && (
          <button className="btn-settings" onClick={() => window.api.openSettings()}>
            <SettingsIcon size={14} />
          </button>
        )}
      </div>

      {behavior.showTrackInfo && title && (
        <div className="track-info">
          {thumbnail && <img className="track-cover" src={thumbnail} draggable={false} alt="" />}
          <div className="track-title">{title}</div>
          <div className="track-artist">{artist}</div>
        </div>
      )}

      {behavior.showControls && title && (
        <div className="controls">
          <button className="ctrl-btn" onClick={() => window.api.mediaCommand('prev')}>
            <SkipBack size={16} fill="currentColor" />
          </button>
          <button className="ctrl-btn ctrl-play" onClick={() => window.api.mediaCommand(isPlaying ? 'pause' : 'play')}>
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button className="ctrl-btn" onClick={() => window.api.mediaCommand('next')}>
            <SkipForward size={16} fill="currentColor" />
          </button>
        </div>
      )}

      {status === 'loading' && <div className="status-message">Searching for lyrics…</div>}
      {status === 'not-found' && <div className="status-message">No lyrics found</div>}
      {status === 'idle' && !title && <div className="status-message">Waiting for music…</div>}

      {lyrics && lyrics.length > 0 && (
        <div className="lyrics-viewport" ref={viewportRef} style={viewportStyle}>
          <div className="lyrics-spacer" />
          {lyrics.map((line, i) => (
            <div
              key={i}
              ref={(el) => setLineRef(i, el)}
              className={[
                'lyric-line',
                isSynced && i === currentIndex ? 'active' : '',
                isSynced && i < currentIndex ? 'past' : '',
                !isSynced ? 'plain' : '',
              ].filter(Boolean).join(' ')}
              style={lineStyle(i)}
            >
              {line.text}
            </div>
          ))}
          <div className="lyrics-spacer" />
        </div>
      )}
    </div>
  );
}
