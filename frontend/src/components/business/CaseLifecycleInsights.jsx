import React, { useMemo } from 'react';
import InfoHint from './InfoHint.jsx';
import { workingDaysBetween } from '../../utils/slaPolicy.js';
import { Clock, CheckCircle2, Activity, AlertTriangle } from 'lucide-react';

// ─── CASE LIFECYCLE INSIGHTS ────────────────────────────────────────────────
// Consumed by the Command Centre below the heatmap. Surfaces:
//   - Count by status (open / investigating / remediation / resolved)
//   - Stale-case metrics (severity-scaled ageing thresholds)
//   - Avg time-in-current-status per severity
//   - Latest state transitions across all cases (audit-trail strip)
//
// All numbers deep-link into Case Manager, pre-filtered where meaningful.
// Props:
//   cases          — the merged case list (static registry + generated)
//   caseWorkbench  — state.caseWorkbench (for status overrides, FP filter, stateHistory)
//   navigate       — react-router navigate

// Severity-scaled ageing thresholds (WORKING days; mirrors the default-domain
// SLA policy). Cases active longer than this since their *last* state transition
// are "stale". Domain-agnostic by design — the Case Manager SLA board applies
// tighter per-domain SLAs (e.g. compliance critical = 1 working day).
export const AGEING_THRESHOLDS = {
  critical: 3,
  high:     7,
  medium:   14,
  low:      21,
};

const ACTIVE_STATUSES = new Set(['open', 'investigating', 'remediation']);

const STATUS_COLORS = {
  open:          '#C41E3A',
  investigating: '#B45309',
  remediation:   '#CA8A04',
  resolved:      '#0BBF7A',
  closed:        '#0BBF7A',
};

export default function CaseLifecycleInsights({ cases, caseWorkbench = {}, navigate }) {
  const lifecycle = useMemo(
    () => computeLifecycle(cases, caseWorkbench),
    [cases, caseWorkbench]
  );

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Activity size={14} style={{ color: '#B45309' }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Case lifecycle</h3>
        <InfoHint
          title="Case lifecycle"
          text="Every open case has a severity-scaled SLA: critical 3 days, high 7 days, medium 14 days, low 21 days. The ageing clock resets on every state transition (open → investigating → remediation → resolved). Stale cases are ones that have been sitting in their current status longer than the SLA. Click any metric to jump into Case Manager pre-filtered."
        />
        <button
          onClick={() => navigate?.('/business-view/cases')}
          style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 10, background: 'rgba(245,184,65,0.12)', color: '#B45309', border: '1px solid rgba(245,184,65,0.3)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Open Case Manager
        </button>
      </div>

      {/* ── Status distribution ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {Object.entries(lifecycle.byStatus).map(([st, count]) => {
          const color = STATUS_COLORS[st] || 'var(--color-text-3)';
          return (
            <button
              key={st}
              onClick={() => navigate?.('/business-view/cases')}
              style={{ padding: '6px 12px', background: 'var(--color-surface-2)', border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`, borderRadius: 7, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color }}>{prettyStatus(st)}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Stale metrics + avg time-in-status ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
        {['critical', 'high', 'medium'].map(sev => {
          const entry = lifecycle.stale[sev] || { count: 0, avgDays: 0, totalActive: 0 };
          const threshold = AGEING_THRESHOLDS[sev];
          const color = entry.count > 0 ? (sev === 'critical' ? '#C41E3A' : sev === 'high' ? '#B45309' : '#CA8A04') : 'var(--color-text-3)';
          return (
            <button
              key={sev}
              onClick={() => navigate?.('/business-view/cases')}
              style={{
                textAlign: 'left', padding: '10px 12px', background: 'var(--color-surface-2)', border: `1px solid ${color}40`,
                borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={11} style={{ color }} />
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
                  Stale {sev} cases (&gt; {threshold}d)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{entry.count}</span>
                <span style={{ fontSize: 10.5, color: 'var(--color-text-3)' }}>
                  of {entry.totalActive} active · avg {entry.avgDays.toFixed(1)}d in current status
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Recent state transitions (audit-trail strip) ───────────── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={11} /> Last {lifecycle.transitions.length} state changes
          <InfoHint title="State transitions" text="The most recent status changes across all cases. Forms a running audit trail: who moved which case from which status to which, and when. Full per-case history lives in the Case Manager drawer." />
        </div>
        {lifecycle.transitions.length === 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontStyle: 'italic' }}>No state changes recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {lifecycle.transitions.map((t, i) => (
              <button
                key={i}
                onClick={() => navigate?.('/business-view/cases')}
                style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto auto', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fontWeight: 800, color: 'var(--color-text-3)' }}>{t.caseId}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                  {t.from && <StatusChip status={t.from} dim />}
                  {t.from && <span style={{ color: 'var(--color-text-3)' }}>→</span>}
                  <StatusChip status={t.to} />
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--color-text-3)', fontFamily: 'var(--font-display)' }}>{formatAgo(t.at)} · {t.by}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status, dim }) {
  const color = STATUS_COLORS[status] || 'var(--color-text-3)';
  return (
    <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 5, background: color + (dim ? '10' : '18'), color: dim ? 'var(--color-text-3)' : color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {status === 'investigating' ? 'invest.' : status}
    </span>
  );
}

function prettyStatus(s) {
  return s === 'investigating' ? 'Investigating' : s.charAt(0).toUpperCase() + s.slice(1);
}

// Milliseconds → "Xd ago" / "Xh ago"
function formatAgo(isoString) {
  if (!isoString) return '—';
  const delta = Date.now() - new Date(isoString).getTime();
  if (delta < 0) return 'just now';
  const hours = delta / 3_600_000;
  if (hours < 1) return `${Math.round(delta / 60_000)}m ago`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Lifecycle computation ──────────────────────────────────────────────────
function computeLifecycle(cases, caseWorkbench) {
  const byStatus = { open: 0, investigating: 0, remediation: 0, resolved: 0 };
  const statePerSev = { critical: [], high: [], medium: [], low: [] };
  const allTransitions = [];

  for (const c of cases || []) {
    const wb = caseWorkbench[c.id] || {};
    if (wb.falsePositive) continue;                   // FPs are out of the lifecycle
    const status = wb.status || c.status || 'open';
    byStatus[status] = (byStatus[status] || 0) + 1;

    // Time-in-current-status = time since last state transition, or createdAt
    const history = wb.stateHistory || [];
    const lastChange = history.length > 0 ? history[history.length - 1].at : (c.createdAt || null);
    const sev = (c.severity || 'medium').toLowerCase();

    if (ACTIVE_STATUSES.has(status) && lastChange) {
      const lastChangeMs = new Date(lastChange).getTime();
      const daysInStatus = (Date.now() - lastChangeMs) / (24 * 3_600_000); // calendar — for avg display
      // CC3: staleness is judged on WORKING days (not calendar). NOTE: this panel
      // uses the domain-AGNOSTIC AGEING_THRESHOLDS (= the default-domain SLA), so
      // it can read less strict than the Case Manager SLA board for compliance/
      // corporate cases, which apply tighter per-domain SLAs via resolveCaseSla.
      const workingDaysInStatus = workingDaysBetween(lastChangeMs, Date.now()) ?? daysInStatus;
      statePerSev[sev] = statePerSev[sev] || [];
      statePerSev[sev].push({ caseId: c.id, daysInStatus, workingDaysInStatus, status });
    }

    // Collect transitions for the audit-trail strip
    for (const t of history) {
      allTransitions.push({ caseId: c.id, title: c.title || '', from: t.from, to: t.to, at: t.at, by: t.by });
    }
  }

  // Stale metric per severity
  const stale = {};
  for (const sev of ['critical', 'high', 'medium', 'low']) {
    const list = statePerSev[sev] || [];
    const threshold = AGEING_THRESHOLDS[sev];
    const staleList = list.filter(x => x.workingDaysInStatus >= threshold);
    const avgDays = list.length > 0 ? list.reduce((s, x) => s + x.daysInStatus, 0) / list.length : 0;
    stale[sev] = { count: staleList.length, totalActive: list.length, avgDays, staleList };
  }

  // Sort transitions newest-first and cap to 6
  const transitions = allTransitions
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  return { byStatus, stale, transitions };
}
