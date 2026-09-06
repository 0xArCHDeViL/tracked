import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  Flame, Trophy, Zap, Target, Calendar, Volume2, VolumeX, Sun, Moon,
  BarChart3, Download, Upload, Plus, Minus, Check, ChevronLeft, ChevronRight,
  Sliders, Sparkles, RefreshCw, Layers
} from 'lucide-react';

import {
  CATEGORIES, todayISO, daysAgoISO, formatDateIndo, computeScore,
  computeStreak, computeMomentum, getMasteryTier
} from './utils/algorithm.js';

import {
  loadInitialData, createDebouncedSaver, saveTargets, saveTheme,
  saveSoundSetting, exportJSON, exportCSV, isValidEntriesShape, getStorageStats
} from './utils/storage.js';

import { playClickSound, playGoalChime, playFanfare, triggerHaptic } from './utils/feedback.js';
import { animatePress, createCelebrationBurst } from './utils/motion.js';

import { AppSkeleton, HeatmapSkeleton, StatisticsSkeleton } from './components/SkeletonLoader.jsx';
import StatCounter from './components/StatCounter.jsx';

// Lazy-loaded visual modules for performance
const Heatmap = lazy(() => import('./components/Heatmap.jsx'));
const Statistics = lazy(() => import('./components/Statistics.jsx'));

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState({});
  const [targets, setTargets] = useState({ kanji: 15, bunpou: 10, vocab: 30, listening: 25 });
  const [theme, setTheme] = useState('light');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  // UI state
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [activeTabMobile, setActiveTabMobile] = useState('habit'); // 'habit' | 'stats'
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // Initialize Debounced Saver
  const saveQueueRef = useRef(null);

  useEffect(() => {
    saveQueueRef.current = createDebouncedSaver(
      () => setSaveStatus('saved'),
      () => setSaveStatus('error'),
      () => setSaveStatus('saving')
    );
  }, []);

  // Load initial data
  useEffect(() => {
    (async () => {
      const data = await loadInitialData();
      setEntries(data.entries);
      setTargets(data.targets);
      setTheme(data.theme);
      setSoundEnabled(data.soundEnabled);
      setLoaded(true);
    })();

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Apply theme to body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Calculations
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const todayScore = useMemo(() => computeScore(entries[todayISO()]), [entries]);
  const bestScore = useMemo(() => {
    return Object.values(entries).reduce((max, e) => Math.max(max, computeScore(e)), 0);
  }, [entries]);

  const momentum = useMemo(() => computeMomentum(entries), [entries]);
  const masteryTier = useMemo(() => getMasteryTier(momentum), [momentum]);
  const currentEntry = entries[selectedDate] || {};

  // Mutation & Persistence
  const updateCategory = useCallback((catId, val, btnElem) => {
    if (btnElem) animatePress(btnElem);
    playClickSound(soundEnabled);
    triggerHaptic('tap');

    const nextVal = Math.max(0, parseInt(val, 10) || 0);
    const prevVal = currentEntry[catId] || 0;
    const catTarget = targets[catId] || 15;

    // Trigger celebration if crossing target threshold
    if (prevVal < catTarget && nextVal >= catTarget) {
      playGoalChime(soundEnabled);
      triggerHaptic('goal');
      if (btnElem) {
        const rect = btnElem.getBoundingClientRect();
        createCelebrationBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    }

    const nextEntries = {
      ...entries,
      [selectedDate]: {
        ...entries[selectedDate],
        [catId]: nextVal,
      },
    };

    setEntries(nextEntries);
    if (saveQueueRef.current) {
      saveQueueRef.current(nextEntries);
    }
  }, [entries, selectedDate, currentEntry, targets, soundEnabled]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '1') updateCategory('kanji', (currentEntry.kanji || 0) + 5);
      else if (e.key === '2') updateCategory('bunpou', (currentEntry.bunpou || 0) + 5);
      else if (e.key === '3') updateCategory('vocab', (currentEntry.vocab || 0) + 5);
      else if (e.key === '4') updateCategory('listening', (currentEntry.listening || 0) + 5);
      else if (e.key.toLowerCase() === 't') setSelectedDate(todayISO());
      else if (e.key.toLowerCase() === 'd') {
        const nextT = theme === 'light' ? 'dark' : 'light';
        setTheme(nextT);
        saveTheme(nextT);
      } else if (e.key.toLowerCase() === 'm') {
        setSoundEnabled((prev) => {
          saveSoundSetting(!prev);
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentEntry, updateCategory, theme]);

  // Date step
  const stepDate = (offset) => {
    playClickSound(soundEnabled);
    triggerHaptic('tap');
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const toggleTheme = () => {
    playClickSound(soundEnabled);
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    saveTheme(next);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    playClickSound(next);
    setSoundEnabled(next);
    saveSoundSetting(next);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
      setDeferredPrompt(null);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!isValidEntriesShape(parsed)) {
          alert('File tidak sesuai skema (harus JSON ekspor trac/ked).');
          return;
        }
        if (!window.confirm(`Impor ${Object.keys(parsed).length} entri data? Data hari yang sama akan diperbarui.`)) return;
        const merged = { ...entries, ...parsed };
        setEntries(merged);
        if (saveQueueRef.current) saveQueueRef.current(merged);
      } catch (err) {
        alert('File tidak valid.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!loaded) {
    return <AppSkeleton />;
  }

  const storageStats = getStorageStats(entries);

  return (
    <div
      className="tracked-root"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100dvh',
        boxSizing: 'border-box',
        padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(40px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* 1. Header with Controls & Save Status */}
        <header style={{ borderBottom: '4px solid var(--border)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>日本語 HABIT SYSTEM</span>
              <span>•</span>
              <span style={{ color: saveStatus === 'saving' ? 'var(--listening)' : saveStatus === 'error' ? 'var(--kanji)' : 'var(--vocab)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                ● {saveStatus === 'saving' ? 'MENYIMPAN...' : saveStatus === 'error' ? 'GAGAL SIMPAN' : 'TERSIMPAN LOKAL'}
              </span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>trac</span><span style={{ color: 'var(--kanji)' }}>/</span><span>ked</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Install PWA Button */}
            {deferredPrompt && !isStandalone && (
              <button
                onClick={handleInstallClick}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'var(--bunpou)',
                  color: '#fff',
                  border: '2px solid var(--border)',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  boxShadow: '2px 2px 0px var(--shadow)',
                }}
              >
                + PASANG PWA
              </button>
            )}

            {/* Target Settings Modal Button */}
            <button
              onClick={() => setShowTargetModal(true)}
              title="Atur Target Harian"
              aria-label="Atur Target Harian"
              style={{
                width: 42,
                height: 42,
                background: 'var(--card-bg)',
                border: '2px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 0px var(--shadow)',
              }}
            >
              <Sliders size={18} />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Suara Aktif' : 'Suara Senyap'}
              aria-label="Toggle Sound"
              style={{
                width: 42,
                height: 42,
                background: 'var(--card-bg)',
                border: '2px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 0px var(--shadow)',
              }}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              title="Ganti Tema"
              aria-label="Toggle Theme"
              style={{
                width: 42,
                height: 42,
                background: 'var(--card-bg)',
                border: '2px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 0px var(--shadow)',
              }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* 2. Mobile Tab Switcher (< 768px) */}
        <div className="mobile-tab-bar" style={{ display: 'none', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', border: '2px solid var(--border)', padding: '4px', background: 'var(--card-bg)' }}>
            <button
              onClick={() => setActiveTabMobile('habit')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                border: 'none',
                background: activeTabMobile === 'habit' ? 'var(--text)' : 'transparent',
                color: activeTabMobile === 'habit' ? 'var(--bg)' : 'var(--text)',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <Zap size={16} /> HABIT COMMANDER
            </button>
            <button
              onClick={() => setActiveTabMobile('stats')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                border: 'none',
                background: activeTabMobile === 'stats' ? 'var(--text)' : 'transparent',
                color: activeTabMobile === 'stats' ? 'var(--bg)' : 'var(--text)',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <BarChart3 size={16} /> ANALITIK & GRAFIK
            </button>
          </div>
        </div>

        {/* 3. Main Bento Grid (Tablet/Pad 2-Column or Mobile Single Column) */}
        <div className="bento-container">
          {/* LEFT COLUMN: Habit Commander */}
          <div className={`bento-col-left ${activeTabMobile === 'stats' ? 'mobile-hidden' : ''}`}>
            {/* Bento Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              {/* Streak */}
              <div style={{ border: '3px solid var(--border)', padding: '12px 14px', background: 'var(--card-bg)', boxShadow: '3px 3px 0px var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>STREAK</span>
                  <Flame size={14} color="var(--kanji)" />
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, color: 'var(--kanji)' }}>
                  <StatCounter value={streak} suffix="H" />
                </div>
              </div>

              {/* Today Score */}
              <div style={{ border: '3px solid var(--border)', padding: '12px 14px', background: 'var(--card-bg)', boxShadow: '3px 3px 0px var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>SKOR HARI INI</span>
                  <Zap size={14} color="var(--bunpou)" />
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, color: 'var(--bunpou)' }}>
                  <StatCounter value={todayScore} />
                </div>
              </div>

              {/* Best Score */}
              <div style={{ border: '3px solid var(--border)', padding: '12px 14px', background: 'var(--card-bg)', boxShadow: '3px 3px 0px var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>REKOR PUNCAK</span>
                  <Trophy size={14} color="var(--listening)" />
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800 }}>
                  <StatCounter value={bestScore} />
                </div>
              </div>
            </div>

            {/* Date Navigator Bar */}
            <div style={{ border: '3px solid var(--border)', padding: '12px 16px', background: 'var(--card-bg)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '3px 3px 0px var(--shadow)' }}>
              <button
                onClick={() => stepDate(-1)}
                title="Hari Sebelumnya"
                aria-label="Hari Sebelumnya"
                style={{
                  width: 44,
                  height: 44,
                  border: '2px solid var(--border)',
                  background: 'var(--btn-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={20} />
              </button>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Calendar size={12} />
                  <span>{selectedDate === todayISO() ? 'HARI INI' : selectedDate}</span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 700 }}>
                  {formatDateIndo(selectedDate)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {selectedDate !== todayISO() && (
                  <button
                    onClick={() => setSelectedDate(todayISO())}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      fontWeight: 700,
                      border: '2px solid var(--border)',
                      background: 'var(--text)',
                      color: 'var(--bg)',
                      padding: '0 10px',
                      height: 44,
                      cursor: 'pointer',
                    }}
                  >
                    HARI INI
                  </button>
                )}
                <button
                  onClick={() => stepDate(1)}
                  title="Hari Berikutnya"
                  aria-label="Hari Berikutnya"
                  style={{
                    width: 44,
                    height: 44,
                    border: '2px solid var(--border)',
                    background: 'var(--btn-bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* 4 Category Habit Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {CATEGORIES.map((cat) => {
                const val = currentEntry[cat.id] || 0;
                const target = targets[cat.id] || cat.defaultTarget;
                const pct = Math.min(100, Math.round((val / target) * 100));
                const isDone = val >= target;

                return (
                  <div
                    key={cat.id}
                    style={{
                      border: '3px solid var(--border)',
                      padding: '14px',
                      background: 'var(--card-bg)',
                      boxShadow: '3px 3px 0px var(--shadow)',
                      position: 'relative',
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: cat.color,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '2px',
                          }}
                        >
                          {cat.num}
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, lineHeight: 1.1 }}>
                            {cat.label}
                          </div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)' }}>
                            {cat.unit} • Bobot: {cat.weight}x
                          </div>
                        </div>
                      </div>

                      {/* Done Badge / Ratio */}
                      <div style={{ textAlign: 'right' }}>
                        {isDone ? (
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 700, background: cat.color, color: '#fff', padding: '3px 8px', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> SELESAI
                          </span>
                        ) : (
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {val} / {target} ({pct}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Striped Progress Bar */}
                    <div
                      style={{
                        height: '10px',
                        background: 'var(--btn-bg)',
                        border: '1.5px solid var(--border)',
                        marginBottom: '12px',
                        overflow: 'hidden',
                        borderRadius: '1px',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: cat.color,
                          transition: 'width 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)',
                        }}
                      />
                    </div>

                    {/* Stepper + Input */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--border)', background: 'var(--input-bg)', height: 48 }}>
                        <button
                          onClick={(e) => updateCategory(cat.id, val - 5, e.currentTarget)}
                          style={stepperBtnStyle}
                          aria-label={`Kurang 5 ${cat.label}`}
                        >
                          <Minus size={18} />
                        </button>
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => updateCategory(cat.id, e.target.value)}
                          style={{
                            width: 54,
                            height: '100%',
                            textAlign: 'center',
                            border: 'none',
                            outline: 'none',
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '18px',
                            fontWeight: 700,
                            background: 'transparent',
                            color: 'var(--text)',
                            padding: 0,
                          }}
                        />
                        <button
                          onClick={(e) => updateCategory(cat.id, val + 5, e.currentTarget)}
                          style={stepperBtnStyle}
                          aria-label={`Tambah 5 ${cat.label}`}
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {/* Preset Action Chips */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[1, 5, 10, 25].map((amt) => (
                          <button
                            key={amt}
                            onClick={(e) => updateCategory(cat.id, val + amt, e.currentTarget)}
                            style={chipBtnStyle}
                          >
                            +{amt}
                          </button>
                        ))}
                        <button
                          onClick={(e) => updateCategory(cat.id, target, e.currentTarget)}
                          style={{
                            ...chipBtnStyle,
                            background: isDone ? 'var(--btn-bg)' : 'var(--text)',
                            color: isDone ? 'var(--text)' : 'var(--bg)',
                          }}
                        >
                          🎯 Target
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Data Management & Export Footer */}
            <div style={{ border: '3px solid var(--border)', padding: '16px', background: 'var(--card-bg)', boxShadow: '3px 3px 0px var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  DATA & CADANGAN OFFLINE
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)' }}>
                  {storageStats.daysRecorded} hari • {Math.round(storageStats.approxBytes / 1024)} KB
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => exportJSON(entries)}
                  style={actionBtnStyle}
                >
                  <Download size={14} /> EXPORT JSON
                </button>
                <button
                  onClick={() => exportCSV(entries)}
                  style={{ ...actionBtnStyle, background: 'var(--btn-bg)', color: 'var(--text)' }}
                >
                  <Download size={14} /> EXPORT CSV
                </button>
                <label
                  style={{
                    ...actionBtnStyle,
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={14} /> IMPORT
                  <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Visualizations & Analytics */}
          <div className={`bento-col-right ${activeTabMobile === 'habit' ? 'mobile-hidden' : ''}`}>
            {/* Mastery Tier Banner */}
            <div style={{ border: '3px solid var(--border)', padding: '16px', background: 'var(--card-bg)', marginBottom: '20px', boxShadow: '3px 3px 0px var(--shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  STATUS MASTERY • 7-DAY EWMA MOMENTUM
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 800, color: masteryTier.color }}>
                  {masteryTier.title}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {masteryTier.desc}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)' }}>
                  INDEKS MOMENTUM
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', fontWeight: 900, color: masteryTier.color }}>
                  <StatCounter value={momentum} />
                </div>
              </div>
            </div>

            {/* 16-Week Heatmap */}
            <div style={{ marginBottom: '20px' }}>
              <Suspense fallback={<HeatmapSkeleton />}>
                <Heatmap
                  entries={entries}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => {
                    setSelectedDate(d);
                    if (window.innerWidth < 768) setActiveTabMobile('habit');
                  }}
                />
              </Suspense>
            </div>

            {/* Statistics Studio (Area, Radar, Stacked Bars, Formula Drawer) */}
            <div>
              <Suspense fallback={<StatisticsSkeleton />}>
                <Statistics
                  entries={entries}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => {
                    setSelectedDate(d);
                    if (window.innerWidth < 768) setActiveTabMobile('habit');
                  }}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Target Configuration Modal */}
        {showTargetModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'var(--card-bg)',
                border: '4px solid var(--border)',
                boxShadow: '6px 6px 0px var(--shadow)',
                padding: '24px',
                maxWidth: 440,
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 800 }}>
                  Target Harian Kustom
                </div>
                <button
                  onClick={() => setShowTargetModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', fontWeight: 800, cursor: 'pointer', color: 'var(--text)' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {CATEGORIES.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: c.color }}>
                        {c.label}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)' }}>
                        {c.unit}
                      </div>
                    </div>
                    <input
                      type="number"
                      value={targets[c.id] || c.defaultTarget}
                      onChange={(e) => {
                        const next = { ...targets, [c.id]: Math.max(1, parseInt(e.target.value, 10) || 1) };
                        setTargets(next);
                        saveTargets(next);
                      }}
                      style={{
                        width: 70,
                        padding: '8px',
                        border: '2px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '16px',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowTargetModal(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--text)',
                  color: 'var(--bg)',
                  border: '2px solid var(--border)',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                SIMPAN TARGET
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global & Responsive Layout Styles */}
      <style>{`
        :root, [data-theme="light"] {
          --bg: #F4F1EA;
          --card-bg: #FDFCFA;
          --text: #1A1A1A;
          --text-muted: #6B6658;
          --border: #1A1A1A;
          --shadow: #1A1A1A;
          --input-bg: #FFFFFF;
          --btn-bg: #E8E4D8;
          --btn-hover: #D8D2BE;
          --kanji: #FF4B1F;
          --bunpou: #0047AB;
          --vocab: #1A8A3E;
          --listening: #B8860B;
        }

        [data-theme="dark"] {
          --bg: #121212;
          --card-bg: #1C1C1C;
          --text: #F0EFEA;
          --text-muted: #9E998B;
          --border: #383838;
          --shadow: #000000;
          --input-bg: #262626;
          --btn-bg: #2A2A2A;
          --btn-hover: #383838;
          --kanji: #FF5A30;
          --bunpou: #2672EC;
          --vocab: #28B052;
          --listening: #D4A017;
        }

        * { box-sizing: border-box; }
        body { margin: 0; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        button, label { touch-action: manipulation; user-select: none; }

        /* Bento Grid: 2 Column for Tablets & Desktop */
        .bento-container {
          display: grid;
          grid-template-columns: 44% 56%;
          gap: 20px;
          align-items: start;
        }

        /* Responsive Mobile Layout (< 768px) */
        @media (max-width: 768px) {
          .bento-container {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .mobile-tab-bar {
            display: block !important;
          }
          .mobile-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

const stepperBtnStyle = {
  width: 44,
  height: '100%',
  border: 'none',
  background: 'var(--btn-bg)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text)',
};

const chipBtnStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '12px',
  fontWeight: 700,
  border: '2px solid var(--border)',
  background: 'var(--btn-bg)',
  color: 'var(--text)',
  padding: '6px 10px',
  cursor: 'pointer',
  borderRadius: '2px',
};

const actionBtnStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '12px',
  border: '2px solid var(--border)',
  background: 'var(--text)',
  color: 'var(--bg)',
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 700,
  minHeight: '44px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};
