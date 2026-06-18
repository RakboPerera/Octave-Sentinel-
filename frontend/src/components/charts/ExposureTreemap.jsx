import React from 'react';

// Materiality map — each agent is a rectangle sized by its flagged exposure
// (LKR) and coloured by its worst severity. The biggest red blocks are where the
// money and the risk concentrate. Custom squarified-ish SVG (slice & dice).
// `items`: [{ label, exposure, critical, high }].
const SEV_COLOR = { critical: '#C41E3A', high: '#B45309', medium: '#CA8A04' };

function layout(items, x, y, w, h, horizontal) {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];
  const total = items.reduce((s, it) => s + it.size, 0);
  let half = 0, i = 0;
  for (; i < items.length; i++) { if (half + items[i].size > total / 2 && i > 0) break; half += items[i].size; }
  const a = items.slice(0, i), b = items.slice(i);
  const frac = half / total;
  if (horizontal) {
    const wa = w * frac;
    return [...layout(a, x, y, wa, h, !horizontal), ...layout(b, x + wa, y, w - wa, h, !horizontal)];
  }
  const ha = h * frac;
  return [...layout(a, x, y, w, ha, !horizontal), ...layout(b, x, y + ha, w, h - ha, !horizontal)];
}

export default function ExposureTreemap({ items = [], width = 520, height = 280 }) {
  const data = (items || []).filter(it => it.exposure > 0).map(it => ({ ...it, size: it.exposure }))
    .sort((p, q) => q.size - p.size);
  if (!data.length) return <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>No exposure-bearing findings to map.</div>;
  const rects = layout(data, 0, 0, width, height, width >= height);
  const fmt = (v) => v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${Math.round(v / 1e3)}K`;
  return (
    <div>
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      {rects.map((r, i) => {
        const color = r.critical > 0 ? SEV_COLOR.critical : r.high > 0 ? SEV_COLOR.high : SEV_COLOR.medium;
        const showLabel = r.w > 54 && r.h > 26;
        return (
          <g key={i}>
            <rect x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} fill={color} fillOpacity="0.82" stroke="#fff" strokeWidth="1.5" rx="3">
              <title>{`${r.label}: LKR ${Math.round(r.exposure).toLocaleString()} flagged · ${r.critical} critical, ${r.high} high`}</title>
            </rect>
            {showLabel && <text x={r.x + 7} y={r.y + 16} fontSize="10.5" fontWeight="700" fill="#fff">{r.label.length > 16 ? r.label.slice(0, 15) + '…' : r.label}</text>}
            {showLabel && r.h > 40 && <text x={r.x + 7} y={r.y + 31} fontSize="9.5" fill="rgba(255,255,255,0.85)">LKR {fmt(r.exposure)}</text>}
          </g>
        );
      })}
    </svg>
    {/* inline legend — block size and colour encoding aren't otherwise labelled */}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 9.5, color: 'var(--color-text-2)', marginTop: 4 }}>
      <span>Block size = LKR exposure flagged</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: SEV_COLOR.critical, opacity: 0.82 }} />critical</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: SEV_COLOR.high, opacity: 0.82 }} />high</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: SEV_COLOR.medium, opacity: 0.82 }} />medium</span>
    </div>
    </div>
  );
}
