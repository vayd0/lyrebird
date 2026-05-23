import { useState, useEffect, useRef } from 'react';
import { LyricLine } from '../types';

export function useSyncedLyrics(
  lyrics: LyricLine[] | null,
  serverPosition: number,
  isPlaying: boolean,
  offset: number = 0.5
): number {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const positionRef = useRef(serverPosition);
  const timestampRef = useRef(Date.now());

  useEffect(() => {
    positionRef.current = serverPosition;
    timestampRef.current = Date.now();
  }, [serverPosition]);

  useEffect(() => {
    if (!lyrics || lyrics.length === 0) {
      setCurrentIndex(-1);
      return;
    }

    const findIndex = (position: number): number => {
      for (let i = lyrics.length - 1; i >= 0; i--) {
        if (position >= lyrics[i].time) return i;
      }
      return -1;
    };

    const tick = () => {
      const elapsed = (Date.now() - timestampRef.current) / 1000;
      const estimated = positionRef.current + (isPlaying ? elapsed : 0) + offset;
      setCurrentIndex(findIndex(estimated));
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [lyrics, isPlaying]);

  return currentIndex;
}
