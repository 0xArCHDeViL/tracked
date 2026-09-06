import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  Flame, Trophy, Zap, Sliders, Volume2, VolumeX, Sun, Moon,
  ChevronLeft, ChevronRight, Plus, Minus, Download, Upload, BarChart3, Check
} from 'lucide-react';

import {
  CATEGORIES, todayISO, daysAgoISO, formatDateIndo, computeScore,
  computeStreak, computeMomentum, getMasteryTier
} from './utils/algorithm.js';

import {
  loadInitialData, createDebouncedSaver, saveTargets, saveTheme,
  saveSoundSetting, exportJSON, exportCSV, isValidEntriesShape
} from './utils/storage.js';

import { playClickSound, playGoalChime, triggerHaptic } from './utils/feedback.js';
import { animatePress, createCelebrationBurst } from './utils/motion.js';

import StatCounter from './components/StatCounter.jsx';

// Lazy-loaded visual modules for optimal hydration
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
  const [saveStatus, setSaveStatus] = useState('saved');
  const [activeTab, setActiveTab] = useState('habit'); // 'habit' | 'stats'
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const saveQueueRef = useRef(null);

  useEffect(() => {
    saveQueueRef.current = createDebouncedSaver(
      () => setSaveStatus('saved'),
      () => setSaveStatus('error'),
      () => setSaveStatus('saving')
    );
  }, []);

  useEffect(() => {
    (async () => {
      const data = await loadInitialData();
      setEntries(data.entries);
      setTargets(data.targets);
      setTheme(data.theme);
      setSoundEnabled(data.soundEnabled);
      setLoaded(true);
    })();

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Derived metrics
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const todayScore = useMemo(() => computeScore(entries[todayISO()]), [entries]);
  const momentum = useMemo(() => computeMomentum(entries), [entries]);
  const tier = useMemo(() => getMasteryTier(momentum), [momentum]);
  const currentEntry = entries[selectedDate] || {};

  // Handlers
  const updateCategory = useCallback((catId, val, btnElem) => {
    if (btnElem) animatePress(btnElem);
    playClickSound(soundEnabled);
    triggerHaptic('tap');

    const nextVal = Math.max(0, parseInt(val, 10) || 0);
    const prevVal = currentEntry[catId] || 0;
    const catTarget = targets[catId] || 15;

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
    if (saveQueueRef.current) saveQueueRef.current(nextEntries);
  }, [entries, selectedDate, currentEntry, targets, soundEnabled]);

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

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!isValidEntriesShape(parsed)) {
          alert('Format JSON tidak valid.');
          return;
        }
        const merged = { ...entries, ...parsed };
        setEntries(merged);
        if (saveQueueRef.current) saveQueueRef.current(merged);
      } catch (err) {
        alert('Gagal membaca file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!loaded) return null;

  return (
    <div className="swiss-root">
      <div className="swiss-shell">
        {/* 1. Header (Brand & Controls, Zero Filler) */}
        <header className="swiss-header">
          <div className="brand-group">
            <span className="brand-title">trac<span style={{ color: 'var(--accent)' }}>/</span>ked</span>
            <span className="brand-status">
              ● {saveStatus === 'saving' ? 'SIMPAN...' : saveStatus === 'error' ? 'ERR' : 'LOKAL'}
            </span>
          </div>

          <div className="control-group">
            {deferredPrompt && (
              <button
                onClick={() => {
                  deferredPrompt.prompt();
                  setDeferredPrompt(null);
                }}
                className="swiss-icon-btn"
                title="Pasang PWA"
              >
                +PWA
              </button>
            )}
            <button
              onClick={() => setShowTargetModal(true)}
              className="swiss-icon-btn"
              title="Target"
              aria-label="Target"
            >
              <Sliders size={16} />
            </button>
            <button
              onClick={toggleSound}
              className="swiss-icon-btn"
              title="Suara"
              aria-label="Suara"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={toggleTheme}
              className="swiss-icon-btn"
              title="Tema"
              aria-label="Tema"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* 2. Metrics Bar (3 Equal Columns, 1px Hairline Grid) */}
        <div className="swiss-metrics">
          <div className="metric-col">
            <span className="metric-label">STREAK</span>
            <span className="metric-val" style={{ color: 'var(--accent)' }}>
              <StatCounter value={streak} suffix="H" />
            </span>
          </div>
          <div className="metric-col">
            <span className="metric-label">SKOR HARI INI</span>
            <span className="metric-val">
              <StatCounter value={todayScore} />
            </span>
          </div>
          <div className="metric-col">
            <span className="metric-label">PANGKAT</span>
            <span className="metric-val" style={{ fontSize: '16px', color: tier.color }}>
              {tier.title.split(' ')[1] || tier.title}
            </span>
          </div>
        </div>

        {/* 3. Navigation Bar (Strict 1-Line Flush Alignment) */}
        <div className="swiss-date-nav">
          <button onClick={() => stepDate(-1)} className="nav-btn" aria-label="Sebelumnya">
            <ChevronLeft size={18} />
          </button>
          <div className="date-center">
            <span className="date-text">{formatDateIndo(selectedDate)}</span>
            {selectedDate !== todayISO() && (
              <button onClick={() => setSelectedDate(todayISO())} className="today-chip">
                HARI INI
              </button>
            )}
          </div>
          <button onClick={() => stepDate(1)} className="nav-btn" aria-label="Berikutnya">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* 4. Tab Selector (Seamless View Switcher) */}
        <div className="swiss-tabs">
          <button
            onClick={() => setActiveTab('habit')}
            className={`tab-btn ${activeTab === 'habit' ? 'active' : ''}`}
          >
            HABIT COMMANDER
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          >
            STATISTIK & HEATMAP
          </button>
        </div>

        {/* 5. View Content */}
        {activeTab === 'habit' ? (
          <div className="habit-stack">
            {CATEGORIES.map((cat) => {
              const val = currentEntry[cat.id] || 0;
              const target = targets[cat.id] || cat.defaultTarget;
              const pct = Math.min(100, Math.round((val / target) * 100));
              const isDone = val >= target;

              return (
                <div key={cat.id} className="category-row">
                  {/* Top: Category Title & Compact Stepper */}
                  <div className="cat-top">
                    <div className="cat-meta">
                      <span className="cat-num">{cat.num}</span>
                      <span className="cat-name">{cat.label}</span>
                      <span className="cat-ratio">{val}/{target}</span>
                    </div>

                    <div className="cat-stepper">
                      <button
                        onClick={(e) => updateCategory(cat.id, val - 5, e.currentTarget)}
                        className="stepper-btn"
                        aria-label={`Kurang 5 ${cat.label}`}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => updateCategory(cat.id, e.target.value)}
                        className="stepper-input"
                      />
                      <button
                        onClick={(e) => updateCategory(cat.id, val + 5, e.currentTarget)}
                        className="stepper-btn"
                        aria-label={`Tambah 5 ${cat.label}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Middle: Hairline Progress */}
                  <div className="cat-progress-track">
                    <div
                      className="cat-progress-fill"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>

                  {/* Bottom: 4 Action Buttons in 100% Equal Grid */}
                  <div className="cat-actions-grid">
                    {[1, 5, 10].map((amt) => (
                      <button
                        key={amt}
                        onClick={(e) => updateCategory(cat.id, val + amt, e.currentTarget)}
                        className="action-chip"
                      >
                        +{amt}
                      </button>
                    ))}
                    <button
                      onClick={(e) => updateCategory(cat.id, target, e.currentTarget)}
                      className={`action-chip ${isDone ? 'done' : 'target'}`}
                    >
                      {isDone ? <Check size={12} /> : '🎯'} {target}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Data Bar (Equal 3-Column Grid) */}
            <div className="data-grid">
              <button onClick={() => exportJSON(entries)} className="data-btn">
                <Download size={13} /> JSON
              </button>
              <button onClick={() => exportCSV(entries)} className="data-btn">
                <Download size={13} /> CSV
              </button>
              <label className="data-btn" style={{ cursor: 'pointer' }}>
                <Upload size={13} /> IMPORT
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        ) : (
          <div className="stats-stack">
            <Suspense fallback={null}>
              <Heatmap
                entries={entries}
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setActiveTab('habit');
                }}
              />
            </Suspense>

            <Suspense fallback={null}>
              <Statistics
                entries={entries}
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setActiveTab('habit');
                }}
              />
            </Suspense>
          </div>
        )}

        {/* Modal Target Settings */}
        {showTargetModal && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <div className="modal-header">
                <span className="modal-title">TARGET HARIAN</span>
                <button onClick={() => setShowTargetModal(false)} className="modal-close">✕</button>
              </div>

              <div className="modal-body">
                {CATEGORIES.map((c) => (
                  <div key={c.id} className="modal-row">
                    <span style={{ fontWeight: 600 }}>{c.label}</span>
                    <input
                      type="number"
                      value={targets[c.id] || c.defaultTarget}
                      onChange={(e) => {
                        const next = { ...targets, [c.id]: Math.max(1, parseInt(e.target.value, 10) || 1) };
                        setTargets(next);
                        saveTargets(next);
                      }}
                      className="modal-input"
                    />
                  </div>
                ))}
              </div>

              <button onClick={() => setShowTargetModal(false)} className="modal-save-btn">
                SIMPAN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pure Swiss Minimalist CSS Stylesheet */}
      <style>{`
        :root, [data-theme="light"] {
          --bg: #F8F7F4;
          --card-bg: #FFFFFF;
          --text: #111111;
          --text-muted: #737373;
          --border: #E5E5E5;
          --cell-empty: #EFEFEA;
          --btn-bg: #F2F1EC;
          --accent: #FF3B30;
          --kanji: #E03E1A;
          --bunpou: #0055D4;
          --vocab: #15803D;
          --listening: #B45309;
        }

        [data-theme="dark"] {
          --bg: #0F0F0F;
          --card-bg: #181818;
          --text: #F5F5F5;
          --text-muted: #8E8E8E;
          --border: #262626;
          --cell-empty: #222222;
          --btn-bg: #222222;
          --accent: #FF453A;
          --kanji: #FF5A36;
          --bunpou: #2F80ED;
          --vocab: #22C55E;
          --listening: #F59E0B;
        }

        html, body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background-color: var(--bg);
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

        .swiss-root {
          min-height: 100dvh;
          width: 100%;
          overflow-x: hidden;
          padding: 24px 16px 40px;
          background-color: var(--bg);
          color: var(--text);
          box-sizing: border-box;
        }

        .swiss-shell {
          max-width: 680px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* Header */
        .swiss-header {
          display: flex;
          justifyContent: space-between;
          align-items: center;
          width: 100%;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .brand-group {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .brand-status {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: var(--text-muted);
        }
        .control-group {
          display: flex;
          gap: 6px;
        }
        .swiss-icon-btn {
          width: 34px;
          height: 34px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 1px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 700;
        }

        /* Metrics Bar (3 Equal Columns) */
        .swiss-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border: 1px solid var(--border);
          background: var(--card-bg);
          width: 100%;
        }
        .metric-col {
          padding: 12px 8px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .metric-col:not(:last-child) {
          border-right: 1px solid var(--border);
        }
        .metric-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          font-weight: 600;
        }
        .metric-val {
          font-size: 24px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }

        /* Date Navigation */
        .swiss-date-nav {
          display: flex;
          justifyContent: space-between;
          align-items: center;
          border: 1px solid var(--border);
          background: var(--card-bg);
          height: 42px;
          width: 100%;
          padding: 0 4px;
        }
        .nav-btn {
          width: 34px;
          height: 34px;
          border: none;
          background: transparent;
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .date-center {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .date-text {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 700;
        }
        .today-chip {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          background: var(--text);
          color: var(--bg);
          border: none;
          padding: 2px 6px;
          cursor: pointer;
          border-radius: 1px;
        }

        /* Tabs */
        .swiss-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid var(--border);
          background: var(--card-bg);
          padding: 2px;
          width: 100%;
        }
        .tab-btn {
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          padding: 8px 0;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        .tab-btn.active {
          background: var(--text);
          color: var(--bg);
        }

        /* Stacks */
        .habit-stack, .stats-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
        }

        /* Category Row */
        .category-row {
          border: 1px solid var(--border);
          background: var(--card-bg);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        .cat-top {
          display: flex;
          justifyContent: space-between;
          align-items: center;
          width: 100%;
        }
        .cat-meta {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .cat-num {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .cat-name {
          font-size: 16px;
          font-weight: 700;
        }
        .cat-ratio {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--text-muted);
        }
        .cat-stepper {
          display: flex;
          align-items: center;
          border: 1px solid var(--border);
          height: 34px;
        }
        .stepper-btn {
          width: 32px;
          height: 100%;
          border: none;
          background: var(--btn-bg);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .stepper-input {
          width: 44px;
          height: 100%;
          border: none;
          text-align: center;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 14px;
          font-weight: 700;
          background: transparent;
          color: var(--text);
          padding: 0;
          outline: none;
        }
        .cat-progress-track {
          height: 3px;
          background: var(--cell-empty);
          width: 100%;
          overflow: hidden;
        }
        .cat-progress-fill {
          height: 100%;
          transition: width 0.25s ease;
        }
        .cat-actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          width: 100%;
        }
        .action-chip {
          height: 32px;
          border: 1px solid var(--border);
          background: var(--btn-bg);
          color: var(--text);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          cursor: pointer;
          border-radius: 1px;
        }
        .action-chip.target {
          background: var(--text);
          color: var(--bg);
        }
        .action-chip.done {
          background: var(--vocab);
          color: #fff;
          border-color: var(--vocab);
        }

        /* Data Bar (Equal 3-Column Grid) */
        .data-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          width: 100%;
        }
        .data-btn {
          height: 36px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          color: var(--text);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 1000;
        }
        .modal-dialog {
          background: var(--card-bg);
          border: 1px solid var(--border);
          padding: 20px;
          max-width: 360px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .modal-header {
          display: flex;
          justifyContent: space-between;
          align-items: center;
        }
        .modal-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 700;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: var(--text);
        }
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .modal-row {
          display: flex;
          justifyContent: space-between;
          align-items: center;
          font-size: 14px;
        }
        .modal-input {
          width: 60px;
          padding: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 14px;
          text-align: center;
        }
        .modal-save-btn {
          padding: 10px;
          background: var(--text);
          color: var(--bg);
          border: none;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
