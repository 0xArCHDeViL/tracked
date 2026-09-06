import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const CATEGORIES = [
  { id: 'kanji', label: 'Kanji', color: '#FF4B1F', num: '01' },
  { id: 'bunpou', label: 'Bunpou', color: '#0047AB', num: '02' },
  { id: 'vocab', label: 'Vocab', color: '#1A8A3E', num: '03' },
  { id: 'listening', label: 'Listening', color: '#B8860B', num: '04' },
];

const STORAGE_KEY = 'entries';

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function computeScore(entry) {
  if (!entry) return 0;
  const cats = CATEGORIES.filter(c => entry[c.id] && entry[c.id] > 0);
  const volume = CATEGORIES.reduce((sum, c) => sum + (entry[c.id] || 0), 0);
  const variety = cats.length; // 0-4
  const varietyMult = 1 + variety * 0.25; // full 4/4 = x2
  const volumeScore = Math.min(volume, 200) * 0.5 + Math.max(0, volume - 200) * 0.1;
  return Math.round(volumeScore * varietyMult);
}

function computeStreak(entriesMap) {
  let streak = 0;
  let cursor = todayISO();
  if (!entriesMap[cursor] || computeScore(entriesMap[cursor]) === 0) {
    cursor = daysAgoISO(1);
  }
  while (entriesMap[cursor] && computeScore(entriesMap[cursor]) > 0) {
    streak++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return streak;
}

// Storage adapter: Offline-first with localStorage and Claude window.storage support
const storageAdapter = {
  async get(key) {
    if (typeof window !== 'undefined' && window.storage) {
      try {
        const res = await window.storage.get(key, false);
        if (res && res.value) return res;
      } catch (e) {
        // Fallback to localStorage
      }
    }
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
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

function useStorage() {
  const [entries, setEntries] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);
  const pendingRef = useRef(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await storageAdapter.get(STORAGE_KEY);
        if (res && res.value) {
          setEntries(JSON.parse(res.value));
        }
      } catch (e) {
        console.warn('Error reading storage', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const flush = useCallback(async () => {
    if (inFlightRef.current || pendingRef.current === null) return;
    const toSave = pendingRef.current;
    pendingRef.current = null;
    inFlightRef.current = true;
    try {
      const ok = await storageAdapter.set(STORAGE_KEY, JSON.stringify(toSave));
      if (!ok) setError('Gagal nyimpen data — cek izin storage browser.');
      else setError(null);
    } catch (e) {
      setError('Gagal nyimpen — coba lagi.');
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current !== null) flush();
    }
  }, []);

  const persist = useCallback((next) => {
    setEntries(next);
    pendingRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 300);
  }, [flush]);

  return { entries, persist, loaded, error };
}

function HeatCell({ date, score, isToday, isSelected, onClick }) {
  let bg = '#E8E4D8';
  let border = '2px solid #1A1A1A';
  if (score > 0) {
    if (score < 20) bg = '#D8D2BE';
    else if (score < 50) bg = '#F5C99E';
    else if (score < 90) bg = '#FF8F5A';
    else bg = '#FF4B1F';
  }
  
  if (isSelected) {
    border = '2.5px solid #0047AB';
  } else if (isToday) {
    border = '2.5px solid #1A8A3E';
  }

  return (
    <div
      onClick={onClick}
      title={`${date}: ${score} poin`}
      style={{
        width: '18px',
        height: '18px',
        background: bg,
        border: border,
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.08s ease',
        boxSizing: 'border-box',
        borderRadius: '2px',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    />
  );
}

function Heatmap({ entries, onSelectDate, selectedDate }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 111; i >= 0; i--) {
      const date = daysAgoISO(i);
      arr.push({ date, score: computeScore(entries[date]) });
    }
    return arr;
  }, [entries]);

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${weeks.length}, 18px)`,
            gap: '4px',
            width: 'max-content',
            padding: '2px',
          }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 18px)', gap: '4px' }}>
              {week.map((d) => (
                <HeatCell
                  key={d.date}
                  date={d.date}
                  score={d.score}
                  isToday={d.date === todayISO()}
                  isSelected={d.date === selectedDate}
                  onClick={() => onSelectDate(d.date)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#1A1A1A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>SEPI</span>
          {['#E8E4D8', '#D8D2BE', '#F5C99E', '#FF8F5A', '#FF4B1F'].map((c) => (
            <div key={c} style={{ width: 14, height: 14, background: c, border: '1.5px solid #1A1A1A', borderRadius: '1px' }} />
          ))}
          <span>GACOR</span>
        </div>
        <div style={{ fontSize: '10px', color: '#6B6658' }}>
          ■ Hijau: Hari ini | ■ Biru: Dipilih
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ cat, value, onChange }) {
  const [local, setLocal] = useState(value || 0);
  useEffect(() => setLocal(value || 0), [value]);

  const commit = (v) => {
    const n = Math.max(0, parseInt(v, 10) || 0);
    setLocal(n);
    onChange(cat.id, n);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 140px',
        alignItems: 'center',
        borderBottom: '2px solid #1A1A1A',
        padding: '12px 0',
        gap: '10px',
      }}
    >
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          color: '#fff',
          background: cat.color,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          borderRadius: '2px',
        }}
      >
        {cat.num}
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 600, color: '#1A1A1A' }}>
        {cat.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #1A1A1A', background: '#fff', height: 44 }}>
        <button
          onClick={() => commit(local - 5)}
          style={btnStyle}
          aria-label={`Kurang 5 ${cat.label}`}
        >
          −
        </button>
        <input
          type="number"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          style={{
            width: 48,
            height: '100%',
            textAlign: 'center',
            border: 'none',
            outline: 'none',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '16px',
            fontWeight: 700,
            background: 'transparent',
            padding: 0,
          }}
        />
        <button
          onClick={() => commit(local + 5)}
          style={btnStyle}
          aria-label={`Tambah 5 ${cat.label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  width: 44,
  height: 44,
  border: 'none',
  background: '#E8E4D8',
  cursor: 'pointer',
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: '20px',
  color: '#1A1A1A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
};

function StatStamp({ label, value, color }) {
  return (
    <div style={{ border: `3px solid ${color || '#1A1A1A'}`, padding: '10px 14px', position: 'relative', background: '#FDFCFA' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.05em', color: '#6B6658', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, lineHeight: 1, color: color || '#1A1A1A' }}>
        {value}
      </div>
    </div>
  );
}

export default function App() {
  const { entries, persist, loaded, error } = useStorage();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const currentEntry = entries[selectedDate] || {};

  const updateCategory = (catId, value) => {
    const next = {
      ...entries,
      [selectedDate]: {
        ...entries[selectedDate],
        [catId]: value,
      },
    };
    persist(next);
  };

  const streak = useMemo(() => computeStreak(entries), [entries]);
  const todayScore = computeScore(entries[todayISO()]);
  const bestScore = useMemo(
    () => Object.values(entries).reduce((max, e) => Math.max(max, computeScore(e)), 0),
    [entries]
  );

  const exportJSON = async () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const fileName = `tracked-backup-${todayISO()}.json`;

    // Try Web Share API with file if supported on mobile
    if (navigator.canShare && navigator.canShare({ files: [new File([dataStr], fileName, { type: 'application/json' })] })) {
      try {
        const file = new File([dataStr], fileName, { type: 'application/json' });
        await navigator.share({
          files: [file],
          title: 'trac/ked Data Backup',
          text: 'Backup data habit tracker trac/ked',
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share error', err);
      }
    }

    // Fallback standard download
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const dates = Object.keys(entries).sort();
    const rows = [
      ['Date', 'Kanji', 'Bunpou', 'Vocab', 'Listening', 'Score'].join(','),
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
  };

  const isValidEntriesShape = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    return Object.entries(obj).every(([date, val]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
      return Object.entries(val).every(
        ([k, v]) => CATEGORIES.some((c) => c.id === k) && typeof v === 'number'
      );
    });
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!isValidEntriesShape(parsed)) {
          alert('File nggak sesuai format (harus JSON hasil export trac/ked).');
          return;
        }
        const incomingDays = Object.keys(parsed).length;
        const willOverwrite = Object.keys(parsed).some((d) => entries[d]);
        const msg = willOverwrite
          ? `Ini bakal menimpa data yang udah ada di hari yang sama (${incomingDays} entri di file). Lanjut?`
          : `Import ${incomingDays} entri baru?`;
        if (!window.confirm(msg)) return;
        persist({ ...entries, ...parsed });
      } catch (err) {
        alert('File nggak valid — pastikan itu JSON hasil export yang benar.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!loaded) {
    return (
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", padding: 40, color: '#1A1A1A' }}>
        Memuat data offline...
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#F4F1EA',
        color: '#1A1A1A',
        minHeight: '100vh',
        boxSizing: 'border-box',
        padding: 'max(20px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(50px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
      }}
    >
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        * { box-sizing: border-box; }
        button, label { touch-action: manipulation; }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ borderBottom: '4px solid #1A1A1A', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#6B6658', letterSpacing: '0.1em', marginBottom: '2px' }}>
              HABIT / SYSTEM • OFFLINE FIRST
            </div>
            <div style={{ fontSize: '34px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>
              <span>trac</span><span style={{ color: '#FF4B1F' }}>/</span><span>ked</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {deferredPrompt && !isInstalled && (
              <button
                onClick={handleInstallClick}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#0047AB',
                  color: '#fff',
                  border: '2px solid #1A1A1A',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                }}
              >
                + PASANG PWA
              </button>
            )}
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>
              {selectedDate}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FF4B1F', color: '#fff', padding: '10px 14px', marginBottom: '16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>
            {error}
          </div>
        )}

        {/* Stat stamps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '24px' }}>
          <StatStamp label="STREAK" value={`${streak}H`} color="#FF4B1F" />
          <StatStamp label="SKOR HARI INI" value={todayScore} color="#0047AB" />
          <StatStamp label="REKOR TERBAIK" value={bestScore} />
        </div>

        {/* Heatmap */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#6B6658', marginBottom: '10px' }}>
            16 MINGGU TERAKHIR — geser & sentuh kotak untuk memilih tanggal
          </div>
          <Heatmap entries={entries} onSelectDate={setSelectedDate} selectedDate={selectedDate} />
        </div>

        {/* Checklist for selected date */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>
              Checklist — {selectedDate === todayISO() ? 'Hari ini' : selectedDate}
            </div>
            {selectedDate !== todayISO() && (
              <button
                onClick={() => setSelectedDate(todayISO())}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 600,
                  background: '#E8E4D8',
                  border: '2px solid #1A1A1A',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                ← kembali ke hari ini
              </button>
            )}
          </div>
          {CATEGORIES.map((cat) => (
            <CategoryRow
              key={`${selectedDate}-${cat.id}`}
              cat={cat}
              value={currentEntry[cat.id]}
              onChange={updateCategory}
            />
          ))}
        </div>

        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#6B6658', marginBottom: '20px', lineHeight: 1.5 }}>
          Skor = (volume terhitung × 0.5, diminishing return di atas 200) × (1 + 0.25 per kategori aktif). 4 kategori penuh = bonus pengali 2x.
        </div>

        {/* Export / Import Bar */}
        <div style={{ borderTop: '4px solid #1A1A1A', paddingTop: '16px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#6B6658', marginBottom: '10px' }}>
            MANAJEMEN DATA & CADANGAN (OFFLINE)
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={exportJSON}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                border: '2px solid #1A1A1A',
                background: '#1A1A1A',
                color: '#fff',
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                minHeight: '44px',
              }}
            >
              EXPORT JSON
            </button>
            <button
              onClick={exportCSV}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                border: '2px solid #1A1A1A',
                background: '#FDFCFA',
                color: '#1A1A1A',
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                minHeight: '44px',
              }}
            >
              EXPORT CSV
            </button>
            <label
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                border: '2px solid #1A1A1A',
                background: '#E8E4D8',
                color: '#1A1A1A',
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '44px',
              }}
            >
              IMPORT JSON
              <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
