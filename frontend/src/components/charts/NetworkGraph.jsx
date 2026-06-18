import React from 'react';

// Counterparty network — the account→counterparty money-flow graph the engine's
// graph detector analyses. Collection HUBS (high in-degree) are red, distribution
// FANS (high out-degree) amber. Grounded: built directly from the transaction
// rows. Radial layout keeps it deterministic (no random force sim).
export default function NetworkGraph({ rows = [], maxNodes = 28, size = 360 }) {
  const inDeg = {}, outDeg = {}, edgeSet = new Set(), edges = [];
  for (const r of rows || []) {
    const a = String(r.account_id || '').trim(), b = String(r.counterparty_account || '').trim();
    if (!a || !b || a === b) continue;
    (outDeg[a] = outDeg[a] || new Set()).add(b);
    (inDeg[b] = inDeg[b] || new Set()).add(a);
    const k = a + '' + b;
    if (!edgeSet.has(k)) { edgeSet.add(k); edges.push([a, b]); }
  }
  const score = (n) => (inDeg[n]?.size || 0) + (outDeg[n]?.size || 0);
  const nodes = Array.from(new Set([...Object.keys(inDeg), ...Object.keys(outDeg)]))
    .sort((x, y) => score(y) - score(x)).slice(0, maxNodes);
  if (nodes.length < 3) return <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Not enough counterparty links to plot a network.</div>;
  const idx = Object.fromEntries(nodes.map((n, i) => [n, i]));
  const cx = size / 2, cy = size / 2, R = size / 2 - 34;
  const pos = (i) => { const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; };
  const maxScore = Math.max(...nodes.map(score), 1);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
      {edges.filter(([a, b]) => a in idx && b in idx).map(([a, b], i) => {
        const [x1, y1] = pos(idx[a]), [x2, y2] = pos(idx[b]);
        const recip = edgeSet.has(b + '' + a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={recip ? '#C41E3A' : 'var(--color-border)'} strokeWidth={recip ? 1.4 : 0.7} strokeOpacity={recip ? 0.8 : 0.5} />;
      })}
      {nodes.map((n, i) => {
        const [x, y] = pos(i);
        const ind = inDeg[n]?.size || 0, outd = outDeg[n]?.size || 0;
        const hub = ind >= 4 && ind >= outd, fan = outd >= 4 && outd > ind;
        const c = hub ? '#C41E3A' : fan ? '#B45309' : '#185FA5';
        const r = 3 + (score(n) / maxScore) * 8;
        return <g key={n}><circle cx={x} cy={y} r={r} fill={c} fillOpacity="0.65" stroke={c} strokeWidth="1"><title>{`${n} — in ${ind}, out ${outd}${hub ? ' (collection hub)' : fan ? ' (distribution fan)' : ''}`}</title></circle></g>;
      })}
      <g fontSize="9" fill="var(--color-text-2)">
        <circle cx={14} cy={size - 26} r="4" fill="#C41E3A" /><text x={22} y={size - 23}>collection hub</text>
        <circle cx={120} cy={size - 26} r="4" fill="#B45309" /><text x={128} y={size - 23}>distribution fan</text>
        <line x1={236} y1={size - 26} x2={250} y2={size - 26} stroke="#C41E3A" strokeWidth="1.4" /><text x={254} y={size - 23}>round-trip</text>
      </g>
    </svg>
  );
}
