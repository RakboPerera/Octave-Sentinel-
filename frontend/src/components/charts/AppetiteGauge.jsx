import React from 'react';

// Capital/liquidity ratio against its CBSL regulatory FLOOR and the bank's
// internal APPETITE — a horizontal RAG bar with a marker at the measured value.
// Red = below the statutory floor, amber = floor→appetite buffer, green = at/above
// appetite. Makes "how much headroom do we have?" instant. `gauges`:
// [{ label, value, floor, appetite, unit }].
export default function AppetiteGauge({ gauges = [] }) {
  const items = (gauges || []).filter(g => Number.isFinite(g.value) && Number.isFinite(g.floor));
  if (!items.length) return <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Run the capital agent to chart ratios against floor &amp; appetite.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((g, i) => {
        const appetite = Number.isFinite(g.appetite) ? g.appetite : g.floor;
        const scaleMax = Math.max(g.value, appetite, g.floor) * 1.25 || 1;
        const pct = (v) => `${Math.max(0, Math.min(100, (v / scaleMax) * 100))}%`;
        const ok = g.value >= appetite, amber = g.value >= g.floor && g.value < appetite;
        const markColor = ok ? '#0BBF7A' : amber ? '#B45309' : '#C41E3A';
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{g.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: markColor, fontFamily: 'var(--font-display)' }}>{g.value.toFixed(1)}{g.unit || '%'}</span>
            </div>
            <div style={{ position: 'relative', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--color-surface-2)' }}>
              {/* RAG bands */}
              <div style={{ position: 'absolute', left: 0, width: pct(g.floor), top: 0, bottom: 0, background: 'rgba(196,30,58,0.18)' }} />
              <div style={{ position: 'absolute', left: pct(g.floor), width: `calc(${pct(appetite)} - ${pct(g.floor)})`, top: 0, bottom: 0, background: 'rgba(180,83,9,0.18)' }} />
              <div style={{ position: 'absolute', left: pct(appetite), right: 0, top: 0, bottom: 0, background: 'rgba(11,191,122,0.18)' }} />
              {/* floor & appetite ticks */}
              <div title={`CBSL floor ${g.floor}${g.unit || '%'}`} style={{ position: 'absolute', left: pct(g.floor), top: 0, bottom: 0, width: 2, background: '#C41E3A' }} />
              <div title={`Internal appetite ${appetite}${g.unit || '%'}`} style={{ position: 'absolute', left: pct(appetite), top: 0, bottom: 0, width: 2, background: '#0BBF7A' }} />
              {/* measured marker */}
              <div style={{ position: 'absolute', left: pct(g.value), top: -2, bottom: -2, width: 3, background: markColor, transform: 'translateX(-1.5px)', borderRadius: 2, boxShadow: '0 0 0 1px #fff' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--color-text-3)', marginTop: 2 }}>
              <span style={{ color: '#C41E3A' }}>floor {g.floor}{g.unit || '%'}</span>
              <span style={{ color: '#0BBF7A' }}>appetite {appetite}{g.unit || '%'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
