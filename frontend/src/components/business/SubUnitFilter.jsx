import React from 'react';

// ─── SUB-UNIT FILTER ─────────────────────────────────────────────────────────
// Pill row that lets the user filter findings to a sub-unit within a domain.
// Sub-unit counts are derived from a tagging function passed by the parent.

export default function SubUnitFilter({ subUnits, counts, active, onChange }) {
  const total = Object.values(counts || {}).reduce((s, v) => s + v, 0);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
      <Pill
        active={active === null}
        onClick={() => onChange(null)}
        label="All sub-units"
        count={total}
      />
      {subUnits.map(u => (
        <Pill
          key={u.id}
          active={active === u.id}
          onClick={() => onChange(u.id)}
          label={u.label}
          count={counts?.[u.id] || 0}
        />
      ))}
    </div>
  );
}

function Pill({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 11px', borderRadius: 14,
        fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
        background: active ? 'rgba(245,184,65,0.14)' : 'var(--color-surface-2)',
        color: active ? '#B45309' : 'var(--color-text-2)',
        border: `1px solid ${active ? 'rgba(245,184,65,0.3)' : 'var(--color-border)'}`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {label}
      <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 7, background: active ? 'rgba(245,184,65,0.2)' : 'rgba(0,0,0,0.04)', fontWeight: 800, fontFamily: 'var(--font-display)', color: active ? '#B45309' : 'var(--color-text-3)' }}>
        {count}
      </span>
    </button>
  );
}
