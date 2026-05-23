import { useState, useEffect, useCallback } from 'react';
import { MediaInfo, LyricLine, Settings } from '../types';
import { useSyncedLyrics } from '../hooks/useSyncedLyrics';
import LyricsOverlay from '../components/LyricsOverlay';

type LyricsStatus = 'idle' | 'loading' | 'loaded' | 'not-found';

export default function OverlayView() {
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null);
  const [lyricsStatus, setLyricsStatus] = useState<LyricsStatus>('idle');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    window.api.getSettings().then(setSettings);
    window.api.getThumbnail().then(setThumbnail);
    window.api.getLyrics().then(setLyrics);
    window.api.getLyricsStatus().then((s) => setLyricsStatus(s as LyricsStatus));
    const unsub1 = window.api.onMediaUpdate(setMedia);
    const unsub2 = window.api.onLyricsUpdate(setLyrics);
    const unsub3 = window.api.onLyricsStatus((s) => setLyricsStatus(s as LyricsStatus));
    const unsub4 = window.api.onThumbnailUpdate(setThumbnail);
    const unsub5 = window.api.onSettingsChanged(setSettings);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, []);

  const isPlaying = media?.status === 'Playing';
  const isSynced = lyrics !== null && lyrics.length > 0 && lyrics[0].time >= 0;
  const currentIndex = useSyncedLyrics(isSynced ? lyrics : null, media?.position ?? 0, isPlaying, settings?.lyrics.offset ?? 0.5);

  if (!settings) return null;

  const hidden = settings.behavior.autoHideOnPause && !isPlaying && lyricsStatus !== 'idle';

  return (
    <div style={{ height: '100%', opacity: hidden ? 0 : 1, transition: 'opacity 0.4s ease' }}>
      <LyricsOverlay
        lyrics={lyrics}
        currentIndex={currentIndex}
        title={media?.title ?? ''}
        artist={media?.artist ?? ''}
        isPlaying={isPlaying}
        isSynced={isSynced}
        status={lyricsStatus}
        settings={settings}
        thumbnail={thumbnail}
      />
    </div>
  );
}
