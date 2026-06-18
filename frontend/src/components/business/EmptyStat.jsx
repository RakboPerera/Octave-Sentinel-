import React from 'react';
import { useNavigate } from 'react-router-dom';

// ─── EMPTY STAT ──────────────────────────────────────────────────────────────
// Universal "no data" treatment. Shows "—" where a number would be and offers
// a helper pointing the user to the agent / Data Sources that would populate it.
// Discipline: never invent or fall back to a hardcoded figure. If the data
// isn't there, we say so, we link to where to put it, and we move on.

export default function EmptyStat({
  label,
  hint = 'No agent output yet.',
  agentName,
  size = 'lg',
  inline = false,
}) {
  const navigate = useNavigate();
  const title = agentName
    ? `${hint} Sync the ${agentName} source in Data Sources to populate this figure.`
    : `${hint} Sync your data sources in Data Sources and run the relevant agent.`;

  if (inline) {
    return (
      <span
        title={title}
        onClick={(e) => { e.stopPropagation?.(); navigate('/business-view/data'); }}
        style={{
          color: 'var(--color-text-3)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          cursor: 'help',
          borderBottom: '1px dashed var(--color-text-3)',
        }}
      >
        —
      </span>
    );
  }

  return (
    <div>
      {label && (
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
          {label}
        </div>
      )}
      <div
        title={title}
        onClick={(e) => { e.stopPropagation?.(); navigate('/business-view/data'); }}
        style={{
          fontSize: size === 'lg' ? 22 : size === 'md' ? 15 : 13,
          fontWeight: 800,
          color: 'var(--color-text-3)',
          fontFamily: 'var(--font-display)',
          marginTop: 3,
          cursor: 'help',
          letterSpacing: '0.02em',
        }}
      >
        —
      </div>
    </div>
  );
}
