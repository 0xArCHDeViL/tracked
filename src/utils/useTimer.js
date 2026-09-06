import { useState, useEffect, useRef, useCallback } from 'react';
import { saveTimerState, loadTimerState, clearTimerState } from './storage.js';

export function useTimer(onComplete) {
  const [activeCategory, setActiveCategory] = useState(null);  // category id
  const [startedAt, setStartedAt] = useState(null);             // epoch ms
  const [elapsed, setElapsed] = useState(0);                    // seconds
  const intervalRef = useRef(null);

  // Restore timer on mount (crash recovery)
  useEffect(() => {
    (async () => {
      const saved = await loadTimerState();
      if (saved && saved.categoryId && saved.startedAt) {
        const now = Date.now();
        const elapsedMs = now - saved.startedAt;
        // Only restore if timer was running < 12 hours (sanity check)
        if (elapsedMs > 0 && elapsedMs < 12 * 60 * 60 * 1000) {
          setActiveCategory(saved.categoryId);
          setStartedAt(saved.startedAt);
          setElapsed(Math.floor(elapsedMs / 1000));
        } else {
          await clearTimerState();
        }
      }
    })();
  }, []);

  // Tick every second when running
  useEffect(() => {
    if (activeCategory && startedAt) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeCategory, startedAt]);

  const start = useCallback((categoryId) => {
    const now = Date.now();
    setActiveCategory(categoryId);
    setStartedAt(now);
    setElapsed(0);
    saveTimerState({ categoryId, startedAt: now });
  }, []);

  const stop = useCallback(() => {
    if (!activeCategory || !startedAt) return 0;
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const cat = activeCategory;
    setActiveCategory(null);
    setStartedAt(null);
    setElapsed(0);
    clearTimerState();
    if (onComplete) onComplete(cat, minutes);
    return minutes;
  }, [activeCategory, startedAt, elapsed, onComplete]);

  const cancel = useCallback(() => {
    setActiveCategory(null);
    setStartedAt(null);
    setElapsed(0);
    clearTimerState();
  }, []);

  return {
    activeCategory,
    elapsed,        // seconds
    elapsedMinutes: Math.floor(elapsed / 60),
    elapsedFormatted: `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`,
    isRunning: !!activeCategory,
    start,
    stop,
    cancel,
  };
}
