import React from 'react';
import { Clock } from 'lucide-react';

// ─── AS-OF STAMP (Wave 5) ─────────────────────────────────────────────────────
// Every page that renders agent output needs a visible freshness marker —
// a CAE cannot defend findings without knowing when the data behind them
// was last refreshed. Previously only Reports + Compliance had this; now
// any business-view page can drop in <AsOfStamp />.
//
// Defaults to "now" when no explicit `asOf` is supplied because demo data
// is embedded in the bundle — the render time is effectively the data time.
// For uploaded data the caller should pass the actual upload / run timestamp.
//
// Props:
//   asOf    — ISO timestamp string or Date (optional; defaults to render time)
//   label   — override default "Generated" text
//   source  — optional short sentence on data provenance
//   compact — truthy → small inline badge; falsy → full block
export default function AsOfStamp({ asOf, label = 'Generated', source, compact = false, style }) {
  const when = asOf instanceof Date ? asOf : asOf ? new Date(asOf) : new Date();
  const display = Number.isNaN(when.getTime())
    ? '—'
    : when.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  if (compact) {
    return (
      <span
        title={source || undefined}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: 'var(--color-text-3)', fontFamily: 'var(--font-mono, monospace)',
          ...style,
        }}
      >
        <Clock size={10} style={{ color: '#185FA5' }} /> {display}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--color-text-3)', ...style }}>
      <Clock size={11} style={{ color: '#185FA5' }} />
      <span>
        <strong style={{ fontWeight: 700, color: 'var(--color-text-2)' }}>{label}</strong> {display}
        {source && <span style={{ marginLeft: 8 }}>· {source}</span>}
      </span>
    </div>
  );
}
