import React, { useMemo, useState } from 'react';
import { computeScore, daysAgoISO, todayISO, formatDateIndo } from '../utils/algorithm.js';

function HeatCell({ date, score, isToday, isSelected, onClick, onHover }) {
  let bg = 'var(--btn-bg)';
  let border = '2px solid var(--border)';

  if (score > 0) {
    if (score < 20) bg = '#D8D2BE';
    else if (score < 50) bg = '#F5C99E';
    else if (score < 90) bg = '#FF8F5A';
    else bg = '#FF4B1F';
  }

  if (isSelected) {
    border = '2.5px solid var(--bunpou)';
  } else if (isToday) {
    border = '2.5px solid var(--vocab)';
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => onHover(date, score, e)}
      onMouseLeave={() => onHover(null)}
      style={{
        width: '18px',
        height: '18px',
        backgroundColor: bg,
        border,
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.08s ease',
        boxSizing: 'border-box',
        borderRadius: '2px',
        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
        zIndex: isSelected ? 2 : 1,
      }}
    />
  );
}

export default function Heatmap({ entries = {}, onSelectDate, selectedDate }) {
  const [hoveredInfo, setHoveredInfo] = useState(null);

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

  // Derive month labels for week columns
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = '';
    weeks.forEach((week, wi) => {
      const firstDay = week[0]?.date;
      if (firstDay) {
        const m = firstDay.slice(5, 7);
        if (m !== lastMonth) {
          const monthNames = {
            '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR', '05': 'MEI', '06': 'JUN',
            '07': 'JUL', '08': 'AGU', '09': 'SEP', '10': 'OKT', '11': 'NOV', '12': 'DES',
          };
          labels.push({ index: wi, label: monthNames[m] || '' });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [weeks]);

  const handleHover = (date, score, event) => {
    if (!date) {
      setHoveredInfo(null);
      return;
    }
    setHoveredInfo({ date, score });
  };

  return (
    <div style={{ border: '3px solid var(--border)', padding: '16px', background: 'var(--card-bg)', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
          HEATMAP KONSISTENSI 16 MINGGU
        </div>
        {hoveredInfo ? (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text)', fontWeight: 700 }}>
            {hoveredInfo.date}: <span style={{ color: 'var(--kanji)' }}>{hoveredInfo.score} poin</span>
          </div>
        ) : (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)' }}>
            sentuh kotak untuk memilih tanggal
          </div>
        )}
      </div>

      {/* Month Markers */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '6px' }}>
        <div style={{ minWidth: 'max-content' }}>
          <div style={{ display: 'flex', position: 'relative', height: '16px', marginBottom: '4px', paddingLeft: '28px' }}>
            {monthLabels.map((m, idx) => (
              <span
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${28 + m.index * 22}px`,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid with Day of Week Axis */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 18px)', gap: '4px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '4px' }}>
              <span>Min</span>
              <span>Sen</span>
              <span>Sel</span>
              <span>Rab</span>
              <span>Kam</span>
              <span>Jum</span>
              <span>Sab</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${weeks.length}, 18px)`,
                gap: '4px',
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
                      onHover={handleHover}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>SEPI</span>
          {['var(--btn-bg)', '#D8D2BE', '#F5C99E', '#FF8F5A', '#FF4B1F'].map((c, i) => (
            <div key={i} style={{ width: 14, height: 14, backgroundColor: c, border: '1.5px solid var(--border)', borderRadius: '1px' }} />
          ))}
          <span style={{ color: 'var(--text-muted)' }}>GACOR</span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--vocab)', fontWeight: 700 }}>■</span> Hari Ini &nbsp;|&nbsp; <span style={{ color: 'var(--bunpou)', fontWeight: 700 }}>■</span> Dipilih
        </div>
      </div>
    </div>
  );
}
