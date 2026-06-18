import React from 'react';

// Benjamini–Hochberg FDR plot: every statistical finding's p-value ranked
// ascending, with the BH critical line (rank/m · q). Findings BELOW the line are
// discoveries (controlled false-positive rate); above it are demoted to advisory.
// `pvals`: number[]; `q`: FDR level. Pure SVG, log-scaled y for readability.
export default function FdrStrip({ pvals = [], q = 0.05, width = 520, height = 180 }) {
  const ps = (pvals || []).filter(p => Number.isFinite(p)).sort((a, b) => a - b);
  const m = ps.length;
  if (!m) return <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>No statistical (p-value) findings in the current run.</div>;
  const pad = { l: 44, r: 10, t: 12, b: 26 };
  const pw = width - pad.l - pad.r, ph = height - pad.t - pad.b;
  const lo = Math.max(1e-6, Math.min(...ps, q / m) / 2), hi = 1;
  const ly = v => Math.log10(Math.max(v, lo));
  const Y = v => pad.t + (1 - (ly(v) - ly(lo)) / (ly(hi) - ly(lo))) * ph;
  const X = i => pad.l + (m === 1 ? pw / 2 : (i / (m - 1)) * pw);
  const crit = i => ((i + 1) / m) * q; // BH critical value at rank i (0-based)
  const ticks = [1, 0.5, 0.1, 0.05, 0.01, 0.001].filter(t => t >= lo);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%">
      <rect x={pad.l} y={pad.t} width={pw} height={ph} fill="var(--color-surface-2)" stroke="var(--color-border)" />
      {ticks.map(t => (
        <g key={t}>
          <line x1={pad.l} y1={Y(t)} x2={pad.l + pw} y2={Y(t)} stroke="var(--color-border)" strokeDasharray="2 3" />
          <text x={pad.l - 5} y={Y(t) + 3} fontSize="8" fill="var(--color-text-3)" textAnchor="end">{t}</text>
        </g>
      ))}
      {/* BH critical line */}
      <polyline fill="none" stroke="#C41E3A" strokeWidth="1.5" strokeDasharray="4 3" points={ps.map((_, i) => `${X(i)},${Y(crit(i))}`).join(' ')} />
      {/* p-values */}
      {ps.map((p, i) => {
        const sig = p <= crit(i);
        return <circle key={i} cx={X(i)} cy={Y(p)} r="3.5" fill={sig ? '#0BBF7A' : '#9CA3AF'} stroke={sig ? '#0BBF7A' : '#9CA3AF'}><title>{`rank ${i + 1}/${m}: p=${p < 1e-3 ? p.toExponential(2) : p.toFixed(4)} ${sig ? '(significant after FDR)' : '(below FDR → advisory)'}`}</title></circle>;
      })}
      <text x={pad.l + pw / 2} y={height - 6} fontSize="9" fill="var(--color-text-2)" textAnchor="middle">findings ranked by p-value →</text>
      <text x={pad.l + 4} y={pad.t + 10} fontSize="8.5" fill="#C41E3A">BH critical (rank/m·q={q})</text>
    </svg>
  );
}
