import React, { useMemo, useState } from 'react';
import { computeScore, daysAgoISO, todayISO } from '../utils/algorithm.js';

export default function Heatmap({ entries = {}, onSelectDate, selectedDate }) {
  const [hovered, setHovered] = useState(null);

  // 16 weeks = 112 days
  const days = useMemo(() => {
    const arr = [];
    for (let i = 111; i >= 0; i--) {
      const date = daysAgoISO(i);
      arr.push({ date, score: computeScore(entries[date]) });
    }
    return arr;
  }, [entries]);

  const weeks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < days.length; i += 7) {
      arr.push(days.slice(i, i + 7));
    }
    return arr;
  }, [days]);

  // Month label positions (0 to 15 columns)
  const monthMarkers = useMemo(() => {
    const markers = [];
    let lastMonth = '';
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
    weeks.forEach((week, wi) => {
      const d = week[0]?.date;
      if (d) {
        const m = d.slice(5, 7);
        if (m !== lastMonth) {
          const idx = parseInt(m, 10) - 1;
          markers.push({ col: wi, name: monthNames[idx] || '' });
          lastMonth = m;
        }
      }
    });
    return markers;
  }, [weeks]);

  // SVG coordinate calculations
  // Total width: 340, height: 72
  // Axis label width: 22, Left margin: 24
  // 16 cols -> colWidth: 16px, gap: 3.5px -> (16 * 19.5 = 312px)
  const cellW = 15;
  const cellH = 7;
  const gap = 3.5;
  const startX = 24;
  const startY = 14;

  const getCellColor = (score) => {
    if (!score || score <= 0) return 'var(--cell-empty)';
    if (score < 25) return '#D8D2BE';
    if (score < 60) return '#F5C99E';
    if (score < 100) return '#FF8F5A';
    return '#FF4B1F';
  };

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: '16px',
        background: 'var(--card-bg)',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Header: Title & Live Hover Details (No filler text) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em' }}>
          HEATMAP • 16 MINGGU
        </span>
        {hovered ? (
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>
            {hovered.date}: <span style={{ color: 'var(--kanji)' }}>{hovered.score} pts</span>
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {selectedDate}: {computeScore(entries[selectedDate])} pts
          </span>
        )}
      </div>

      {/* 100% Fluid SVG Matrix — Zero Horizontal Scroll */}
      <svg
        viewBox="0 0 340 76"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Month Labels */}
        {monthMarkers.map((m, idx) => (
          <text
            key={idx}
            x={startX + m.col * (cellW + gap)}
            y="9"
            fontFamily="'IBM Plex Mono', monospace"
            fontSize="8"
            fontWeight="600"
            fill="var(--text-muted)"
          >
            {m.name}
          </text>
        ))}

        {/* Day of week labels */}
        <text x="2" y={startY + 1 * (cellH + gap) + 6} fontFamily="'IBM Plex Mono', monospace" fontSize="7" fill="var(--text-muted)">Sen</text>
        <text x="2" y={startY + 3 * (cellH + gap) + 6} fontFamily="'IBM Plex Mono', monospace" fontSize="7" fill="var(--text-muted)">Rab</text>
        <text x="2" y={startY + 5 * (cellH + gap) + 6} fontFamily="'IBM Plex Mono', monospace" fontSize="7" fill="var(--text-muted)">Jum</text>

        {/* 16x7 Cells */}
        {weeks.map((week, wi) => {
          const colX = startX + wi * (cellW + gap);
          return week.map((d, di) => {
            const rowY = startY + di * (cellH + gap);
            const isToday = d.date === todayISO();
            const isSelected = d.date === selectedDate;
            const fillColor = getCellColor(d.score);

            return (
              <g
                key={d.date}
                onClick={() => onSelectDate && onSelectDate(d.date)}
                onMouseEnter={() => setHovered({ date: d.date, score: d.score })}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={colX}
                  y={rowY}
                  width={cellW}
                  height={cellH}
                  rx="1"
                  fill={fillColor}
                  stroke={isSelected ? 'var(--bunpou)' : isToday ? 'var(--vocab)' : 'var(--border)'}
                  strokeWidth={isSelected ? '1.5' : isToday ? '1.2' : '0.5'}
                />
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}
