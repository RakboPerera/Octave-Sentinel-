import React from 'react';
import { cityCoords } from '../../data/cityGeo.js';

// Impossible-travel map: for each flagged digital session, the two login cities
// plotted on an equirectangular grid with a connecting arc and the implied
// travel speed. A line spanning continents at thousands of km/h is the signal.
// `events`: [{ from, to, kmh, account }].
export default function GeoVelocity({ events = [], width = 520, height = 240 }) {
  const pts = [];
  const evs = [];
  for (const e of events || []) {
    const a = cityCoords(e.from), b = cityCoords(e.to);
    if (!a || !b) continue;
    evs.push({ ...e, a, b });
    pts.push(a, b);
  }
  if (!evs.length) return <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>No geocodable impossible-travel sessions in the current run.</div>;
  // Fit the projection to the points (with margin), equirectangular.
  const lons = pts.map(p => p.lon), lats = pts.map(p => p.lat);
  let minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const padL = Math.max(8, (maxLon - minLon) * 0.15) || 8, padA = Math.max(6, (maxLat - minLat) * 0.15) || 6;
  minLon -= padL; maxLon += padL; minLat -= padA; maxLat += padA;
  const m = 24;
  const X = (lon) => m + ((lon - minLon) / (maxLon - minLon || 1)) * (width - 2 * m);
  const Y = (lat) => m + ((maxLat - lat) / (maxLat - minLat || 1)) * (height - 2 * m);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      <rect x={m} y={m} width={width - 2 * m} height={height - 2 * m} fill="var(--color-surface-2)" stroke="var(--color-border)" />
      {/* graticule */}
      {[0.25, 0.5, 0.75].map(f => (
        <g key={f} stroke="var(--color-border)" strokeDasharray="2 4">
          <line x1={m + f * (width - 2 * m)} y1={m} x2={m + f * (width - 2 * m)} y2={height - m} />
          <line x1={m} y1={m + f * (height - 2 * m)} x2={width - m} y2={m + f * (height - 2 * m)} />
        </g>
      ))}
      {evs.map((e, i) => {
        const x1 = X(e.a.lon), y1 = Y(e.a.lat), x2 = X(e.b.lon), y2 = Y(e.b.lat);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 24;
        return (
          <g key={i}>
            <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke="#C41E3A" strokeWidth="1.4" strokeOpacity="0.8" />
            <circle cx={x1} cy={y1} r="4" fill="#185FA5" /><circle cx={x2} cy={y2} r="4" fill="#C41E3A" />
            <text x={x1} y={y1 - 6} fontSize="9" fill="var(--color-text-2)" textAnchor="middle">{e.from}</text>
            <text x={x2} y={y2 - 6} fontSize="9" fill="var(--color-text-2)" textAnchor="middle">{e.to}</text>
            <text x={mx} y={my - 2} fontSize="9" fontWeight="700" fill="#C41E3A" textAnchor="middle">{Math.round(e.kmh).toLocaleString()} km/h</text>
          </g>
        );
      })}
      {/* inline legend — endpoint colours aren't otherwise labelled */}
      <g fontSize="9" fill="var(--color-text-2)">
        <circle cx={m + 8} cy={height - m - 10} r="4" fill="#185FA5" /><text x={m + 16} y={height - m - 7}>origin (earlier login)</text>
        <circle cx={m + 150} cy={height - m - 10} r="4" fill="#C41E3A" /><text x={m + 158} y={height - m - 7}>destination (later login)</text>
      </g>
    </svg>
  );
}
