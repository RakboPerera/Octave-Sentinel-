import React from 'react';
import InfoHint from '../business/InfoHint.jsx';

// ─── SENTINEL UI PRIMITIVES ──────────────────────────────────────────────────
// Shared presentational building blocks so views stop hand-rolling inline
// styles (which had drifted to 224 uppercase + 337 fontWeight:800 instances).
// These encode the design decisions from the visual review:
//   • Tamed type — sentence-case section titles; uppercase reserved for a
//     single restrained "eyebrow" per card.
//   • Tabular figures — all numerics align vertically.
//   • Color roles — gold = action/attention, turquoise = live/positive,
//     dark = neutral; the severity palette is the single source for risk.
// Purely visual: no business logic, no layout/panel restructuring.

export const TOKENS = {
  gold: '#B45309', goldBright: '#F5B841',
  positive: '#0BBF7A',
  text: 'var(--color-text)', text2: 'var(--color-text-2)', text3: 'var(--color-text-3)',
  border: 'var(--color-border)', surface: 'var(--color-surface)', surface2: 'var(--color-surface-2)',
};

export const SEVERITY = {
  critical: '#C41E3A',
  high:     '#B45309',
  medium:   '#185FA5',
  low:      '#6B7280',
};
export function sevColor(s) {
  return SEVERITY[(s || 'medium').toLowerCase()] || SEVERITY.medium;
}

// ─── EYEBROW — the ONLY place uppercase micro-labels belong ───────────────────
// Optional `help` renders a click-to-open InfoHint beside the label so any
// metric/column label can carry a plain-English "what is this / how computed".
export function Eyebrow({ children, color = 'var(--color-text-3)', style, help, helpTitle }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color, fontFamily: 'var(--font-display)', display: help ? 'inline-flex' : undefined, alignItems: help ? 'center' : undefined, gap: help ? 4 : undefined, ...style }}>
      {children}
      {help && <InfoHint text={help} title={helpTitle || (typeof children === 'string' ? children : undefined)} size={11} />}
    </div>
  );
}

// ─── SECTION TITLE — sentence case, display font, calm weight ─────────────────
export function SectionTitle({ children, size = 14, style, help, helpTitle }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: size, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--color-text)', display: help ? 'inline-flex' : undefined, alignItems: help ? 'center' : undefined, gap: help ? 6 : undefined, ...style }}>
      {children}
      {help && <InfoHint text={help} title={helpTitle || (typeof children === 'string' ? children : undefined)} />}
    </div>
  );
}

// ─── NUM — tabular figures so columns of numbers align ───────────────────────
export function Num({ children, style }) {
  return <span style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', ...style }}>{children}</span>;
}

// ─── CARD — the standard surface, optional accent edge + hover lift ───────────
export function Card({ children, accent, hover = false, padding = 16, style, ...rest }) {
  const base = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderLeft: accent ? `3px solid ${accent}` : '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding,
    transition: 'box-shadow 0.18s var(--ease-out), transform 0.18s var(--ease-out), border-color 0.18s',
    ...style,
  };
  const onEnter = hover ? (e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; } : undefined;
  const onLeave = hover ? (e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; } : undefined;
  return <div style={base} onMouseEnter={onEnter} onMouseLeave={onLeave} {...rest}>{children}</div>;
}

// ─── STAT — big tabular number + restrained label ─────────────────────────────
// Optional `help` adds a click-to-open InfoHint next to the label explaining
// what the metric means and how it is computed.
export function Stat({ label, value, accent = 'var(--color-text)', size = 28, sub, help, helpTitle }) {
  return (
    <div>
      <Eyebrow help={help} helpTitle={helpTitle || (typeof label === 'string' ? label : undefined)}>{label}</Eyebrow>
      <div style={{ fontSize: size, fontWeight: 800, color: accent, fontFamily: 'var(--font-display)', lineHeight: 1.1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── CHIP — pill with a tone ──────────────────────────────────────────────────
// tone: 'neutral' | 'positive' | 'attention' | severity name | hex color
export function Chip({ children, tone = 'neutral', solid = false, style }) {
  const map = {
    neutral: 'var(--color-text-3)', positive: '#0BBF7A', attention: '#B45309',
    critical: SEVERITY.critical, high: SEVERITY.high, medium: SEVERITY.medium, low: SEVERITY.low,
  };
  const c = map[tone] || tone;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 7, fontSize: 10, fontWeight: 800, letterSpacing: '0.03em',
      background: solid ? c : `${c}1A`, color: solid ? 'white' : c, textTransform: 'uppercase', ...style,
    }}>
      {children}
    </span>
  );
}

// ─── SLA PILL — filled status pill (green within, amber over, red breached) ───
export function SlaPill({ status }) {
  const map = { green: ['#0BBF7A', 'On track'], amber: ['#B45309', 'At risk'], red: ['#C41E3A', 'Breached'], unknown: ['#9A9893', '—'] };
  const [c, label] = map[status] || map.unknown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, background: `${c}18`, color: c }}>
      <span style={{ width: 5, height: 5, borderRadius: 3, background: c }} />
      {label}
    </span>
  );
}

// ─── BAND METER — shows where a ratio sits across floor → appetite → value ────
// For 'gte' metrics, the safe (green) zone is to the right of appetite; the
// breach (red) zone is left of the floor. 'lte' mirrors it. Gives the KRI rail
// a visual "are we comfortable / drifting / breaching" read, not just a number.
export function BandMeter({ value, floor, appetite, compare = 'gte', status, unit = '', dp = 2 }) {
  if (value == null || !Number.isFinite(value) || floor == null) return null;
  const stops = [floor, appetite, value].filter(v => v != null && Number.isFinite(v));
  let lo = Math.min(...stops), hi = Math.max(...stops);
  const pad = (hi - lo) * 0.25 || Math.abs(hi) * 0.1 || 1;
  lo -= pad; hi += pad;
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  const statusColor = { red: '#C41E3A', amber: '#B45309', green: '#0BBF7A' }[status] || '#9A9893';
  // Hover titles carry the actual numbers, not just the marker name (UI review #10).
  const sym = compare === 'gte' ? '≥' : compare === 'lte' ? '≤' : '';
  const f = (v) => `${Number(v).toFixed(dp)}${unit}`;

  // Track gradient: green safe side, amber middle, red breach side.
  const floorPct = ((floor - lo) / (hi - lo)) * 100;
  const appPct = appetite != null ? ((appetite - lo) / (hi - lo)) * 100 : floorPct;
  const grad = compare === 'gte'
    ? `linear-gradient(90deg, #C41E3A22 0%, #C41E3A22 ${floorPct}%, #B4530922 ${floorPct}%, #B4530922 ${appPct}%, #0BBF7A22 ${appPct}%, #0BBF7A22 100%)`
    : `linear-gradient(90deg, #0BBF7A22 0%, #0BBF7A22 ${appPct}%, #B4530922 ${appPct}%, #B4530922 ${floorPct}%, #C41E3A22 ${floorPct}%, #C41E3A22 100%)`;

  return (
    <div style={{ position: 'relative', height: 6, borderRadius: 3, background: grad, marginTop: 6 }}>
      {/* floor marker (regulatory) */}
      <span title={`Regulatory floor: ${sym} ${f(floor)}`} style={{ position: 'absolute', left: pos(floor), top: -2, width: 2, height: 10, background: '#C41E3A', transform: 'translateX(-1px)', borderRadius: 1 }} />
      {/* appetite marker (internal) */}
      {appetite != null && <span title={`Internal appetite: ${sym} ${f(appetite)}`} style={{ position: 'absolute', left: pos(appetite), top: -2, width: 2, height: 10, background: '#B45309', transform: 'translateX(-1px)', borderRadius: 1, opacity: 0.7 }} />}
      {/* value dot */}
      <span title={`Current: ${f(value)}`} style={{ position: 'absolute', left: pos(value), top: '50%', width: 10, height: 10, borderRadius: 5, background: statusColor, border: '2px solid var(--color-surface)', transform: 'translate(-5px, -5px)', boxShadow: '0 0 0 1px ' + statusColor }} />
    </div>
  );
}

// ─── SPARKLINE — tiny inline trend (SVG, no chart lib needed) ─────────────────
// Hoverable: the svg carries a trend summary and each vertex its own value
// tooltip (UI review #10) — no chart library, just native <title> elements.
export function Sparkline({ data = [], color = '#0BBF7A', width = 64, height = 18, unit = '', dp = 1, label }) {
  const nums = (data || []).filter(v => typeof v === 'number' && Number.isFinite(v));
  if (nums.length < 2) return null;
  const min = Math.min(...nums), max = Math.max(...nums);
  const span = max - min || 1;
  const f = (v) => `${Number(v).toFixed(dp)}${unit}`;
  const coords = nums.map((v, i) => ({
    v,
    x: (i / (nums.length - 1)) * width,
    y: height - ((v - min) / span) * height,
  }));
  const pts = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const first = nums[0], last = nums[nums.length - 1];
  const summary = `${label ? label + ' — ' : ''}trend ${f(first)} → ${f(last)} (min ${f(min)}, max ${f(max)})`;
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }} role="img" aria-label={summary}>
      <title>{summary}</title>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* invisible-ish hover targets so each point reveals its value */}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3.5} fill={color} fillOpacity={i === coords.length - 1 ? 0.9 : 0} style={{ cursor: 'default' }}>
          <title>{f(c.v)}</title>
        </circle>
      ))}
    </svg>
  );
}
