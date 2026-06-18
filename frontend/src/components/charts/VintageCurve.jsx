import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Vintage analysis — Stage-3 (NPL) rate by origination quarter. A cohort that
// rises above its peers signals underwriting-quality drift in that period. Bars
// the engine flagged as robust-z outliers are red. Built from the credit rows.
export default function VintageCurve({ rows = [], flaggedQuarters = [], height = 220 }) {
  const byQ = {};
  for (const r of rows || []) {
    const q = String(r.origination_quarter || '').trim(); if (!q) continue;
    (byQ[q] = byQ[q] || { n: 0, s3: 0 }).n++;
    if (Number(r.assigned_stage) === 3) byQ[q].s3++;
  }
  const data = Object.entries(byQ)
    .filter(([, v]) => v.n >= 3)
    .map(([q, v]) => ({ quarter: q, rate: +((v.s3 / v.n) * 100).toFixed(1), n: v.n }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));
  if (data.length < 2) return <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Not enough origination history to plot vintage cohorts.</div>;
  const flagged = new Set(flaggedQuarters || []);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fontSize: 9.5, fill: 'var(--color-text-3)' }} angle={-25} textAnchor="end" height={48} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} unit="%" />
          <Tooltip formatter={(v) => [`${v}%`, 'Stage-3 rate']} labelFormatter={(l) => `${l}`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Bar dataKey="rate" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {data.map((d, i) => <Cell key={i} fill={flagged.has(d.quarter) ? '#C41E3A' : '#185FA5'} fillOpacity={flagged.has(d.quarter) ? 0.9 : 0.55} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* inline legend — the colour encoding isn't otherwise labelled */}
      <div style={{ display: 'flex', gap: 16, fontSize: 9.5, color: 'var(--color-text-2)', marginTop: 2, paddingLeft: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#C41E3A', opacity: 0.9 }} />flagged cohort (outlier)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#185FA5', opacity: 0.55 }} />within normal range</span>
      </div>
    </div>
  );
}
