import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

// Observed first-digit distribution vs the Benford expectation. The chart IS the
// input to the χ² test the engine ran — bars that pull away from the curve are
// exactly what drove the small p-value. Grounded: `dist` comes from the finding.
export default function BenfordChart({ dist, height = 220, title }) {
  if (!Array.isArray(dist) || !dist.length) return null;
  const data = dist.map(d => ({ digit: String(d.digit), observed: +(d.observed * 100).toFixed(2), expected: +(d.expected * 100).toFixed(2) }));
  return (
    <div>
      {title && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 8 }}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="digit" tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} unit="%" />
          <Tooltip formatter={(v, n) => [`${v}%`, n === 'observed' ? 'Observed' : 'Benford expected']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="observed" name="Observed" fill="#185FA5" radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Line dataKey="expected" name="Benford expected" stroke="#C41E3A" strokeWidth={2} dot={{ r: 3, fill: '#C41E3A' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
