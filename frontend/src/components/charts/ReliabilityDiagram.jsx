import React from 'react';

// Calibration / reliability diagram (S4): each agent plotted as (stated
// confidence, observed precision). The 45° line is perfect calibration — points
// BELOW it are over-confident (stated > realised), ABOVE are under-confident.
// Pure SVG so the diagonal renders cleanly. `points`: [{label, stated, observed, n}].
export default function ReliabilityDiagram({ points = [], size = 240 }) {
  const pts = (points || []).filter(p => Number.isFinite(p.stated) && Number.isFinite(p.observed));
  const pad = 30, plot = size - pad * 2;
  const X = v => pad + v * plot;
  const Y = v => pad + (1 - v) * plot;
  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
        {/* frame */}
        <rect x={pad} y={pad} width={plot} height={plot} fill="var(--color-surface-2)" stroke="var(--color-border)" />
        {/* 45° perfect-calibration line */}
        <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} stroke="#0BBF7A" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={X(0.62)} y={Y(0.7)} fontSize="8.5" fill="#0BBF7A" transform={`rotate(-45 ${X(0.66)} ${Y(0.66)})`}>perfect calibration</text>
        {/* axes ticks */}
        {[0, 0.5, 1].map(t => (
          <g key={t}>
            <text x={X(t)} y={size - pad + 12} fontSize="8" fill="var(--color-text-3)" textAnchor="middle">{(t * 100).toFixed(0)}%</text>
            <text x={pad - 6} y={Y(t) + 3} fontSize="8" fill="var(--color-text-3)" textAnchor="end">{(t * 100).toFixed(0)}%</text>
          </g>
        ))}
        <text x={pad + plot / 2} y={size - 4} fontSize="9" fill="var(--color-text-2)" textAnchor="middle">stated confidence →</text>
        <text x={10} y={pad + plot / 2} fontSize="9" fill="var(--color-text-2)" textAnchor="middle" transform={`rotate(-90 10 ${pad + plot / 2})`}>observed precision →</text>
        {/* points */}
        {pts.map((p, i) => {
          const over = p.stated - p.observed > 0.15, under = p.observed - p.stated > 0.15;
          const c = over ? '#C41E3A' : under ? '#B45309' : '#185FA5';
          return <circle key={i} cx={X(Math.max(0, Math.min(1, p.stated)))} cy={Y(Math.max(0, Math.min(1, p.observed)))} r={Math.min(8, 3 + Math.sqrt(p.n || 1))} fill={c} fillOpacity="0.6" stroke={c} strokeWidth="1"><title>{`${p.label}: stated ${(p.stated * 100).toFixed(0)}% vs observed ${(p.observed * 100).toFixed(0)}% (${p.n} cases)`}</title></circle>;
        })}
      </svg>
      {pts.length === 0 && <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', marginTop: -size / 2 }}>No auditor-labelled cases yet — calibration appears once findings are confirmed / marked false-positive.</div>}
    </div>
  );
}
