import React, { useMemo, useState } from 'react';
import { CATEGORIES, computeScore, computeScoreBreakdown, daysAgoISO, todayISO, formatShortDate, computeMomentum, getMasteryTier } from '../utils/algorithm.js';

export default function Statistics({ entries = {}, selectedDate, onSelectDate }) {
  const [trendDays, setTrendDays] = useState(14); // 7, 14, 30
  const [showFormula, setShowFormula] = useState(false);

  // 1. Trend Data for Area Chart
  const trendData = useMemo(() => {
    const data = [];
    let rollingSum = 0;
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = daysAgoISO(i);
      const score = computeScore(entries[date]);
      rollingSum += score;
      const ma = Math.round(rollingSum / (trendDays - i));
      data.push({ date, score, ma, label: formatShortDate(date) });
    }
    return data;
  }, [entries, trendDays]);

  const maxTrendScore = useMemo(() => {
    const max = Math.max(...trendData.map((d) => d.score), 10);
    return Math.ceil(max / 20) * 20;
  }, [trendData]);

  // 2. Category Distribution for Radar/Pillar Balance (Last 7 Days)
  const categoryTotals7d = useMemo(() => {
    const totals = { kanji: 0, bunpou: 0, vocab: 0, listening: 0 };
    for (let i = 6; i >= 0; i--) {
      const date = daysAgoISO(i);
      const e = entries[date] || {};
      CATEGORIES.forEach((c) => {
        totals[c.id] += e[c.id] || 0;
      });
    }
    const maxVal = Math.max(...Object.values(totals), 1);
    return { totals, maxVal };
  }, [entries]);

  // 3. Weekly Volume Stacked Bars (Last 8 Weeks)
  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
      const weekTotals = { kanji: 0, bunpou: 0, vocab: 0, listening: 0, total: 0, label: `W-${w}` };
      for (let d = 6; d >= 0; d--) {
        const daysAgo = w * 7 + d;
        const date = daysAgoISO(daysAgo);
        const e = entries[date] || {};
        CATEGORIES.forEach((c) => {
          const v = e[c.id] || 0;
          weekTotals[c.id] += v;
          weekTotals.total += v;
        });
      }
      weeks.push(weekTotals);
    }
    const maxWeek = Math.max(...weeks.map((w) => w.total), 1);
    return { weeks, maxWeek };
  }, [entries]);

  // Active Date Score Breakdown
  const activeBreakdown = useMemo(() => {
    return computeScoreBreakdown(entries[selectedDate] || {});
  }, [entries, selectedDate]);

  const momentum = useMemo(() => computeMomentum(entries), [entries]);
  const tier = useMemo(() => getMasteryTier(momentum), [momentum]);

  // SVG Area Path generator
  const areaChartPoints = useMemo(() => {
    const width = 360;
    const height = 130;
    const padding = 20;

    const points = trendData.map((d, i) => {
      const x = padding + (i / (trendData.length - 1)) * (width - padding * 2);
      const y = height - padding - (d.score / maxTrendScore) * (height - padding * 2);
      return { x, y, ...d };
    });

    if (points.length < 2) return { linePath: '', areaPath: '', points: [] };

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { linePath, areaPath, points };
  }, [trendData, maxTrendScore]);

  // Radar Polygon Points (4 Axes)
  const radarPoints = useMemo(() => {
    const cx = 110;
    const cy = 100;
    const r = 70;
    const axes = [
      { id: 'kanji', angle: -Math.PI / 2 }, // Top
      { id: 'bunpou', angle: 0 },            // Right
      { id: 'vocab', angle: Math.PI / 2 },   // Bottom
      { id: 'listening', angle: Math.PI },   // Left
    ];

    const polyPoints = axes.map((axis) => {
      const val = categoryTotals7d.totals[axis.id] || 0;
      const ratio = Math.min(1.0, val / categoryTotals7d.maxVal);
      const currentR = Math.max(12, ratio * r);
      const x = cx + currentR * Math.cos(axis.angle);
      const y = cy + currentR * Math.sin(axis.angle);
      return `${x},${y}`;
    }).join(' ');

    return { cx, cy, r, polyPoints, axes };
  }, [categoryTotals7d]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Score Trend Area Chart */}
      <div style={{ border: '3px solid var(--border)', padding: '16px', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              TREN SKOR HARIAN
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700 }}>
              Konsistensi Momentum
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTrendDays(days)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  border: '1.5px solid var(--border)',
                  background: trendDays === days ? 'var(--text)' : 'var(--btn-bg)',
                  color: trendDays === days ? 'var(--bg)' : 'var(--text)',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                }}
              >
                {days}H
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox="0 0 360 140" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--kanji)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--kanji)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            <line x1="20" y1="20" x2="340" y2="20" stroke="var(--border)" strokeOpacity="0.15" strokeDasharray="3 3" />
            <line x1="20" y1="65" x2="340" y2="65" stroke="var(--border)" strokeOpacity="0.15" strokeDasharray="3 3" />
            <line x1="20" y1="110" x2="340" y2="110" stroke="var(--border)" strokeWidth="1.5" />

            {/* Area & Line */}
            {areaChartPoints.areaPath && (
              <path d={areaChartPoints.areaPath} fill="url(#scoreAreaGrad)" />
            )}
            {areaChartPoints.linePath && (
              <path d={areaChartPoints.linePath} fill="none" stroke="var(--kanji)" strokeWidth="2.5" />
            )}

            {/* Dots */}
            {areaChartPoints.points.map((p, i) => (
              <g key={i} onClick={() => onSelectDate && onSelectDate(p.date)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.date === selectedDate ? 5 : 3}
                  fill={p.date === selectedDate ? 'var(--bunpou)' : 'var(--card-bg)'}
                  stroke={p.date === selectedDate ? 'var(--border)' : 'var(--kanji)'}
                  strokeWidth="2"
                />
              </g>
            ))}
          </svg>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>{trendData[0]?.label}</span>
          <span>Puncak: {maxTrendScore} pts</span>
          <span>{trendData[trendData.length - 1]?.label}</span>
        </div>
      </div>

      {/* 2. Grid for Category Balance Radar + Weekly Stacked Volume */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Radar / Category Balance */}
        <div style={{ border: '3px solid var(--border)', padding: '16px', background: 'var(--card-bg)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>
            RADAR KESEIMBANGAN (7 HARI)
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
            Harmoni 4 Pilar
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 220 200" style={{ width: '100%', maxWidth: 220, height: 'auto' }}>
              {/* Concentric diamond guides */}
              {[0.33, 0.66, 1.0].map((s, idx) => (
                <polygon
                  key={idx}
                  points={`${radarPoints.cx},${radarPoints.cy - radarPoints.r * s} ${radarPoints.cx + radarPoints.r * s},${radarPoints.cy} ${radarPoints.cx},${radarPoints.cy + radarPoints.r * s} ${radarPoints.cx - radarPoints.r * s},${radarPoints.cy}`}
                  fill="none"
                  stroke="var(--border)"
                  strokeOpacity="0.2"
                  strokeWidth="1"
                />
              ))}

              {/* Axes lines */}
              <line x1={radarPoints.cx} y1={radarPoints.cy - radarPoints.r} x2={radarPoints.cx} y2={radarPoints.cy + radarPoints.r} stroke="var(--border)" strokeOpacity="0.25" />
              <line x1={radarPoints.cx - radarPoints.r} y1={radarPoints.cy} x2={radarPoints.cx + radarPoints.r} y2={radarPoints.cy} stroke="var(--border)" strokeOpacity="0.25" />

              {/* User Polygon */}
              <polygon
                points={radarPoints.polyPoints}
                fill="var(--bunpou)"
                fillOpacity="0.25"
                stroke="var(--bunpou)"
                strokeWidth="2"
              />

              {/* Axis Labels */}
              <text x={radarPoints.cx} y="15" textAnchor="middle" fill="var(--kanji)" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fontWeight="700">KANJI</text>
              <text x="210" y={radarPoints.cy + 3} textAnchor="end" fill="var(--bunpou)" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fontWeight="700">BUNPOU</text>
              <text x={radarPoints.cx} y="195" textAnchor="middle" fill="var(--vocab)" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fontWeight="700">VOCAB</text>
              <text x="10" y={radarPoints.cy + 3} textAnchor="start" fill="var(--listening)" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fontWeight="700">LISTEN</text>
            </svg>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '10px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>
            {CATEGORIES.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 8, height: 8, background: c.color, borderRadius: '1px' }} />
                <span>{c.label}: <b>{categoryTotals7d.totals[c.id]}</b></span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Stacked Bars */}
        <div style={{ border: '3px solid var(--border)', padding: '16px', background: 'var(--card-bg)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>
            VOLUME MINGGUAN (8 MINGGU)
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
            Total Aktivitas Belajar
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', borderBottom: '2px solid var(--border)', paddingBottom: '4px' }}>
            {weeklyData.weeks.map((w, idx) => {
              const heightPct = Math.max(6, (w.total / weeklyData.maxWeek) * 100);
              const kRatio = w.total > 0 ? (w.kanji / w.total) * 100 : 25;
              const bRatio = w.total > 0 ? (w.bunpou / w.total) * 100 : 25;
              const vRatio = w.total > 0 ? (w.vocab / w.total) * 100 : 25;
              const lRatio = w.total > 0 ? (w.listening / w.total) * 100 : 25;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '22px' }}>
                  <div
                    title={`Minggu ke-${idx + 1}: ${w.total} aktivitas`}
                    style={{
                      width: '18px',
                      height: `${heightPct}%`,
                      minHeight: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1.5px solid var(--border)',
                      borderRadius: '1px',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ height: `${kRatio}%`, background: 'var(--kanji)' }} />
                    <div style={{ height: `${bRatio}%`, background: 'var(--bunpou)' }} />
                    <div style={{ height: `${vRatio}%`, background: 'var(--vocab)' }} />
                    <div style={{ height: `${lRatio}%`, background: 'var(--listening)' }} />
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    W{idx + 1}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
            Warna bertumpuk merefleksikan porsi K/B/V/L per minggu
          </div>
        </div>
      </div>

      {/* 3. Mathematical Breakdown Drawer */}
      <div style={{ border: '3px solid var(--border)', background: 'var(--card-bg)', overflow: 'hidden' }}>
        <button
          onClick={() => setShowFormula(!showFormula)}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'none',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--text)',
          }}
        >
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              ALGORITMA SKOR V3.0 • MATEMATIKA KOGNITIF
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: 700 }}>
              Rincian Perhitungan Tanggal: {selectedDate} ({activeBreakdown.finalScore} poin)
            </div>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '18px', fontWeight: 700 }}>
            {showFormula ? '▲' : '▼'}
          </div>
        </button>

        {showFormula && (
          <div style={{ borderTop: '2px solid var(--border)', padding: '16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: 1.6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div style={{ border: '1.5px solid var(--border)', padding: '10px', background: 'var(--input-bg)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>VOLUME TERBOBOT</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{activeBreakdown.weightedVolume}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Raw: {activeBreakdown.rawVolume} item</div>
              </div>
              <div style={{ border: '1.5px solid var(--border)', padding: '10px', background: 'var(--input-bg)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SATURASI SUBLINEAR</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{activeBreakdown.saturatedVolume}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Skor volume efektif</div>
              </div>
              <div style={{ border: '1.5px solid var(--border)', padding: '10px', background: 'var(--input-bg)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PENGALI VARIASI & ENTROPI</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--kanji)' }}>{activeBreakdown.varietyMult}x</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Entropi: {activeBreakdown.entropy} (4/4 pilar)</div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderLeft: '3px solid var(--bunpou)', paddingLeft: '10px' }}>
              <b>Notice:</b> Algoritma v3.0 menerapkan pembobotan kognitif aktif (Kanji 1.2x, Bunpou 1.15x, Vocab 1.0x, Listening 0.9x) dan bonus harmoni Shannon Entropy (maks 2.0x). Seluruh riwayat lama tetap kompatibel dan dihitung ulang secara otomatis.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
