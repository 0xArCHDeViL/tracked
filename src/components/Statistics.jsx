import React, { useMemo, useState } from 'react';
import { CATEGORIES, computeScore, computeScoreBreakdown, daysAgoISO, formatShortDate } from '../utils/algorithm.js';

export default function Statistics({ entries = {}, selectedDate, onSelectDate }) {
  const [trendDays, setTrendDays] = useState(14);
  const [showFormula, setShowFormula] = useState(false);

  // 1. Trend Data
  const trendData = useMemo(() => {
    const data = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = daysAgoISO(i);
      const score = computeScore(entries[date]);
      data.push({ date, score, label: formatShortDate(date) });
    }
    return data;
  }, [entries, trendDays]);

  const maxTrendScore = useMemo(() => {
    const max = Math.max(...trendData.map((d) => d.score), 10);
    return Math.ceil(max / 20) * 20;
  }, [trendData]);

  // 2. 7-Day Category Distribution
  const category7d = useMemo(() => {
    const counts = { kanji: 0, bunpou: 0, vocab: 0, listening: 0 };
    let total = 0;
    for (let i = 6; i >= 0; i--) {
      const e = entries[daysAgoISO(i)] || {};
      CATEGORIES.forEach((c) => {
        const v = e[c.id] || 0;
        counts[c.id] += v;
        total += v;
      });
    }
    return { counts, total };
  }, [entries]);

  // 3. 8-Week Volume Data
  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
      const totals = { kanji: 0, bunpou: 0, vocab: 0, listening: 0, total: 0 };
      for (let d = 6; d >= 0; d--) {
        const e = entries[daysAgoISO(w * 7 + d)] || {};
        CATEGORIES.forEach((c) => {
          const v = e[c.id] || 0;
          totals[c.id] += v;
          totals.total += v;
        });
      }
      weeks.push(totals);
    }
    const maxWeek = Math.max(...weeks.map((w) => w.total), 1);
    return { weeks, maxWeek };
  }, [entries]);

  // SVG Area calculations (340x90)
  const chartWidth = 340;
  const chartHeight = 85;
  const padX = 14;
  const padY = 12;

  const points = useMemo(() => {
    return trendData.map((d, i) => {
      const x = padX + (i / (trendData.length - 1)) * (chartWidth - padX * 2);
      const y = chartHeight - padY - (d.score / maxTrendScore) * (chartHeight - padY * 2);
      return { x, y, ...d };
    });
  }, [trendData, maxTrendScore]);

  const paths = useMemo(() => {
    if (points.length < 2) return { line: '', area: '' };
    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      line += ` L ${points[i].x} ${points[i].y}`;
    }
    const area = `${line} L ${points[points.length - 1].x} ${chartHeight - padY} L ${points[0].x} ${chartHeight - padY} Z`;
    return { line, area };
  }, [points]);

  const activeBreakdown = useMemo(() => {
    return computeScoreBreakdown(entries[selectedDate] || {});
  }, [entries, selectedDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* 1. Score Trend (Swiss Minimalist Line Chart) */}
      <div style={{ border: '1px solid var(--border)', padding: '16px', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em' }}>
            TREN SKOR
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '10px',
                  fontWeight: 700,
                  border: '1px solid var(--border)',
                  background: trendDays === d ? 'var(--text)' : 'transparent',
                  color: trendDays === d ? 'var(--bg)' : 'var(--text)',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  borderRadius: '1px',
                }}
              >
                {d}H
              </button>
            ))}
          </div>
        </div>

        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="swissAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--kanji)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--kanji)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Hairline baseline */}
          <line x1={padX} y1={chartHeight - padY} x2={chartWidth - padX} y2={chartHeight - padY} stroke="var(--border)" strokeWidth="1" />

          {/* Area & Line */}
          {paths.area && <path d={paths.area} fill="url(#swissAreaGrad)" />}
          {paths.line && <path d={paths.line} fill="none" stroke="var(--kanji)" strokeWidth="1.5" />}

          {/* Data Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.date === selectedDate ? 3.5 : 2}
              fill={p.date === selectedDate ? 'var(--bunpou)' : 'var(--card-bg)'}
              stroke="var(--kanji)"
              strokeWidth="1.2"
              onClick={() => onSelectDate && onSelectDate(p.date)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>{trendData[0]?.label}</span>
          <span>{maxTrendScore} PTS MAX</span>
          <span>{trendData[trendData.length - 1]?.label}</span>
        </div>
      </div>

      {/* 2. Category Distribution (Swiss Horizontal Proportional Bars) */}
      <div style={{ border: '1px solid var(--border)', padding: '16px', background: 'var(--card-bg)' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '12px' }}>
          DISTRIBUSI KATEGORI (7 HARI)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {CATEGORIES.map((cat) => {
            const count = category7d.counts[cat.id] || 0;
            const pct = category7d.total > 0 ? Math.round((count / category7d.total) * 100) : 0;

            return (
              <div key={cat.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{cat.num} {cat.label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{count} min ({pct}%)</span>
                </div>
                <div style={{ height: '4px', background: 'var(--cell-empty)', width: '100%', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: cat.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Weekly Volume (Minimalist 8-Week Stacked Bars) */}
      <div style={{ border: '1px solid var(--border)', padding: '16px', background: 'var(--card-bg)' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '12px' }}>
          VOLUME MINGGUAN (8 MINGGU)
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '80px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
          {weeklyData.weeks.map((w, idx) => {
            const heightPct = Math.max(4, (w.total / weeklyData.maxWeek) * 100);
            const kRatio = w.total > 0 ? (w.kanji / w.total) * 100 : 25;
            const bRatio = w.total > 0 ? (w.bunpou / w.total) * 100 : 25;
            const vRatio = w.total > 0 ? (w.vocab / w.total) * 100 : 25;
            const lRatio = w.total > 0 ? (w.listening / w.total) * 100 : 25;

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10%' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${heightPct}%`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: `${kRatio}%`, background: 'var(--kanji)' }} />
                  <div style={{ height: `${bRatio}%`, background: 'var(--bunpou)' }} />
                  <div style={{ height: `${vRatio}%`, background: 'var(--vocab)' }} />
                  <div style={{ height: `${lRatio}%`, background: 'var(--listening)' }} />
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  W{idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Score Math Breakdown Accordion (Strict Tabular Numbers, Zero Filler Essay) */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
        <button
          onClick={() => setShowFormula(!showFormula)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            color: 'var(--text)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <span>RINCIAN SKOR • {selectedDate} ({activeBreakdown.finalScore} PTS)</span>
          <span>{showFormula ? '▲' : '▼'}</span>
        </button>

        {showFormula && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
            <div style={{ padding: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--text-muted)' }}>VOLUME</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700 }}>{activeBreakdown.weightedVolume}</div>
            </div>
            <div style={{ padding: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--text-muted)' }}>SATURASI</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700 }}>{activeBreakdown.saturatedVolume}</div>
            </div>
            <div style={{ padding: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--text-muted)' }}>VARIASI</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--kanji)' }}>{activeBreakdown.varietyMult}x</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
