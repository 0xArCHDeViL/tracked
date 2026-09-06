import { CATEGORIES, computeScore, todayISO } from './algorithm.js';

const STORAGE_KEY = 'entries';
const TARGETS_KEY = 'tracked_targets';
const THEME_KEY = 'tracked_theme';
const SOUND_KEY = 'tracked_sound';

export const DEFAULT_TARGETS = {
  kanji: 30,
  bunpou: 25,
  vocab: 30,
  listening: 25,
};

export const storageAdapter = {
  async get(key) {
    if (typeof window !== 'undefined' && window.storage) {
      try {
        const res = await window.storage.get(key, false);
        if (res && res.value) return res.value;
      } catch (e) {}
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },

  async set(key, value) {
    let ok = false;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        ok = true;
      } catch (e) {
        console.warn('localStorage save failed', e);
      }
    }
    if (typeof window !== 'undefined' && window.storage) {
      try {
        await window.storage.set(key, value, false);
        ok = true;
      } catch (e) {}
    }
    return ok;
  },
};

export async function loadInitialData() {
  let entries = {};
  let targets = { ...DEFAULT_TARGETS };
  let theme = 'light';
  let soundEnabled = true;

  try {
    const rawEntries = await storageAdapter.get(STORAGE_KEY);
    if (rawEntries) entries = JSON.parse(rawEntries);
  } catch (e) {
    console.warn('Error loading entries', e);
  }

  try {
    const rawTargets = await storageAdapter.get(TARGETS_KEY);
    if (rawTargets) targets = { ...DEFAULT_TARGETS, ...JSON.parse(rawTargets) };
  } catch (e) {}

  try {
    const rawTheme = await storageAdapter.get(THEME_KEY);
    if (rawTheme === 'dark' || rawTheme === 'light') theme = rawTheme;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch (e) {}

  try {
    const rawSound = await storageAdapter.get(SOUND_KEY);
    if (rawSound !== null) soundEnabled = rawSound === 'true';
  } catch (e) {}

  return { entries, targets, theme, soundEnabled };
}

export function createDebouncedSaver(onSuccess, onError, onStartSaving) {
  let timer = null;
  let pendingData = null;
  let inFlight = false;

  const flush = async () => {
    if (inFlight || pendingData === null) return;
    const toSave = pendingData;
    pendingData = null;
    inFlight = true;

    if (onStartSaving) onStartSaving();

    try {
      const ok = await storageAdapter.set(STORAGE_KEY, JSON.stringify(toSave));
      if (!ok) {
        if (onError) onError('Gagal menyimpan — cek memori atau izin storage peramban.');
      } else {
        if (onSuccess) onSuccess();
      }
    } catch (e) {
      if (onError) onError('Gagal menyimpan data ke storage.');
    } finally {
      inFlight = false;
      if (pendingData !== null) flush();
    }
  };

  return function queueSave(data) {
    pendingData = data;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 300);
  };
}

const TIMER_KEY = 'tracked_timer';

export async function saveTargets(targets) {
  return storageAdapter.set(TARGETS_KEY, JSON.stringify(targets));
}

export async function saveTheme(theme) {
  return storageAdapter.set(THEME_KEY, theme);
}

export async function saveSoundSetting(enabled) {
  return storageAdapter.set(SOUND_KEY, String(enabled));
}

export async function saveTimerState(timerState) {
  return storageAdapter.set(TIMER_KEY, JSON.stringify(timerState));
}

export async function loadTimerState() {
  try {
    const raw = await storageAdapter.get(TIMER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export async function clearTimerState() {
  return storageAdapter.set(TIMER_KEY, 'null');
}

export async function exportJSON(entries) {
  const dataStr = JSON.stringify(entries, null, 2);
  const fileName = `tracked-backup-${todayISO()}.json`;

  if (navigator.canShare && navigator.canShare({ files: [new File([dataStr], fileName, { type: 'application/json' })] })) {
    try {
      const file = new File([dataStr], fileName, { type: 'application/json' });
      await navigator.share({
        files: [file],
        title: 'trac/ked Habit Backup',
        text: `Cadangan data kebiasaan belajar bahasa Jepang (${Object.keys(entries).length} hari)`,
      });
      return;
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('Share error', err);
    }
  }

  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(entries) {
  const dates = Object.keys(entries).sort();
  const rows = [
    ['Date', 'Kanji (min)', 'Bunpou (min)', 'Vocab (min)', 'Listening (min)', 'Score'].join(','),
  ];

  dates.forEach((date) => {
    const e = entries[date] || {};
    const row = [
      date,
      e.kanji || 0,
      e.bunpou || 0,
      e.vocab || 0,
      e.listening || 0,
      computeScore(e),
    ];
    rows.push(row.join(','));
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tracked-habits-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function isValidEntriesShape(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Object.entries(obj).every(([date, val]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
    return Object.entries(val).every(
      ([k, v]) => CATEGORIES.some((c) => c.id === k) && typeof v === 'number'
    );
  });
}

export function getStorageStats(entries) {
  const daysRecorded = Object.keys(entries).length;
  const totalVolume = Object.values(entries).reduce((sum, e) => {
    return sum + CATEGORIES.reduce((csum, c) => csum + (e[c.id] || 0), 0);
  }, 0);
  const jsonSize = new Blob([JSON.stringify(entries)]).size;
  return { daysRecorded, totalVolume, approxBytes: jsonSize };
}
