import React from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Findings-over-time: each engine run plotted in sequence so a sudden jump or
// drop in volume (or criticals) is itself a signal. `snapshots`: the assurance
// history [{ ts, agentId, findings, critical }] — optionally filtered to one agent.
export default function BacktestTrend({ snapshots = [], height = 200 }) {
  const data = (snapshots || []).map((s, i) => ({
    run: i + 1,
    findings: s.findings || 0,
    critical: s.critical || 0,
    label: `${s.agentId} · ${String(s.ts || '').slice(0, 10)}`,
  }));
  if (data.length < 2) return <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Run history will trend here once the engine has run more than once.</div>;
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="run" tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} allowDecimals={false} />
          <Tooltip formatter={(v, n) => [v, n === 'findings' ? 'Findings' : 'Critical']} labelFormatter={(l, p) => p?.[0]?.payload?.label || `Run ${l}`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Area dataKey="findings" name="findings" stroke="#185FA5" fill="#185FA5" fillOpacity={0.12} strokeWidth={2} />
          <Line dataKey="critical" name="critical" stroke="#C41E3A" strokeWidth={2} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
      {/* inline legend — the two series aren't otherwise labelled */}
      <div style={{ display: 'flex', gap: 16, fontSize: 9.5, color: 'var(--color-text-2)', marginTop: 2, paddingLeft: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 9, borderRadius: 2, background: '#185FA5', opacity: 0.4 }} />total findings (area)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: '#C41E3A' }} />criticals (line)</span>
      </div>
    </div>
  );
}
