import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DOMAINS, getDomain } from '../../data/domainRegistry.js';
import { useAllFindings } from '../../hooks/useDomainData.js';
import { AGENT_META } from '../../data/agentMeta.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import { dedupedExposureBreakdown } from '../../utils/exposureDedup.js';
import { getRiskVectorAuditMeta, nextReviewDate } from '../../data/riskVectorAuditMeta.js';
import { FileText, Filter, ChevronRight, ChevronDown, Shield, Target, Calendar, Layers } from 'lucide-react';
import InfoHint from '../../components/business/InfoHint.jsx';
import AsOfStamp from '../../components/business/AsOfStamp.jsx';
import { Num, sevColor } from '../../components/shared/ui.jsx';

// ─── BUSINESS RISK REGISTER (Wave 4 rebuild) ─────────────────────────────────
// Upgraded to ISA 315 / 330 audit-workpaper form. Each row now exposes:
//   • Objective   — what an audit of this risk is trying to assure
//   • Criteria    — the regulatory / policy standard
//   • Inherent vs Residual — the ISA 315 split; residual is derived from
//                    current live findings and control effectiveness
//   • Exposure    — entity-deduped (same entity across agents counts once)
//   • Next review — derived from the review cadence and residual severity
//   • Sampling methodology
// Previously a flat list of vectors — now expandable rows that read like an
// audit workpaper, not an operational risk log.

const RISK_LABELS = ['—', 'Low', 'Moderate', 'Elevated', 'High', 'Critical'];
const RISK_COLORS = ['#0BBF7A', '#0BBF7A', '#185FA5', '#CA8A04', '#B45309', '#C41E3A'];

export default function BusinessRiskRegister() {
  const navigate = useNavigate();
  const allFindings = useAllFindings();

  const [domainFilter, setDomainFilter] = useState(null);
  const [severityFilter, setSeverityFilter] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Flatten all risk vectors with derived metrics including audit-grade fields.
  const rows = useMemo(() => {
    const out = [];
    for (const d of DOMAINS) {
      for (const v of d.riskVectors || []) {
        const relevantFindings = allFindings.filter(f =>
          f.domainTags.includes(d.id) &&
          (v.primaryAgents || []).includes(f.agentId),
        );
        const critical = relevantFindings.filter(f => f.severity === 'critical').length;
        const high     = relevantFindings.filter(f => f.severity === 'high').length;
        const medium   = relevantFindings.filter(f => f.severity === 'medium').length;
        // Entity-deduped exposure — critical fix so the same customer across
        // multiple agents is counted once at the larger exposure.
        const exposureData = dedupedExposureBreakdown(relevantFindings);
        const exposure = exposureData.total;
        const agentSet = new Set(relevantFindings.map(f => f.agentId));

        // Residual = highest severity present, else 'low'
        const residual = critical > 0 ? 'critical' : high > 0 ? 'high' : medium > 0 ? 'medium' : 'low';

        // ISA 315 audit-grade meta for this vector.
        const auditMeta = getRiskVectorAuditMeta(d.id, v.id);
        const review = nextReviewDate(auditMeta.reviewCadence, residual);

        // Control-effect proxy: if the agent is actively detecting (findings),
        // controls are partially effective; if no findings but covered, effective.
        const controlsEffective = agentSet.size > 0
          ? (residual === 'critical' ? 'Not effective' : residual === 'high' ? 'Partially effective' : 'Effective')
          : 'Untested in current cycle';

        out.push({
          id: `${d.id}.${v.id}`,
          vectorId: v.id,
          vectorLabel: v.label,
          domainId: d.id,
          domainLabel: d.label,
          ownerRole: d.ownerRole,
          agents: v.primaryAgents || [],
          activeAgents: [...agentSet],
          severity: v.severity,
          residual,
          critical, high, medium,
          total: relevantFindings.length,
          exposure,
          exposureOverlaps: exposureData.overlaps,
          regulatoryTags: d.regulatoryTags || [],
          auditMeta,
          review,
          controlsEffective,
          findings: relevantFindings,
        });
      }
    }
    return out;
  }, [allFindings]);

  const filtered = rows.filter(r => {
    if (domainFilter && r.domainId !== domainFilter) return false;
    if (severityFilter && r.residual !== severityFilter) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 1500, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Header total={rows.length} filtered={filtered.length} />
      <Toolbar
        domainFilter={domainFilter}
        onDomainFilter={setDomainFilter}
        severityFilter={severityFilter}
        onSeverityFilter={setSeverityFilter}
      />

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ ...th, width: 24 }}></th>
                <th style={th}>Risk Vector</th>
                <th style={th}>Domain / Owner</th>
                <th style={{ ...th, textAlign: 'center' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Inherent<InfoHint title="Inherent risk" text="The risk before Sentinel's detection is taken into account — derived from the domain's regulatory weight and exposure (ISA 315). The 'gross' risk if no controls existed." /></span></th>
                <th style={{ ...th, textAlign: 'center' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Residual<InfoHint title="Residual risk" text="Inherent risk adjusted for what the engine actually detected and for materiality — the risk that remains for the auditor to address (ISA 315). Active critical/high findings raise it." /></span></th>
                <th style={{ ...th, textAlign: 'center' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Findings<InfoHint title="Findings" text="Count of engine findings on this risk vector, shown as critical · high · medium (or 'Clean' when none). These are the conditions evidencing the residual risk." /></span></th>
                <th style={{ ...th, textAlign: 'right' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Exposure (deduped)<InfoHint align="left" title="Exposure (deduped)" text="Total LKR exposure of the flagged entities, entity-deduped — each obligor/account is counted once even if several agents flag it, so figures don't double-count." /></span></th>
                <th style={th}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Next review<InfoHint align="left" title="Next review" text="When this risk vector is next scheduled for review. The cadence shortens automatically when active critical/high findings are present." /></span></th>
                <th style={{ ...th, width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <React.Fragment key={r.id}>
                  <RiskRow
                    r={r}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    onOpen={() => navigate(`/business-view/${r.domainId}`)}
                  />
                  {expandedId === r.id && <RiskWorkpaperRow r={r} />}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-3)', fontSize: 12, fontStyle: 'italic' }}>
                    No risk vectors match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Header({ total, filtered }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileText size={20} style={{ color: '#185FA5' }} />
        Risk Register
        <InfoHint title="ISA 315 / 330 Risk Register" text="Each row is an auditable risk vector with (a) Objective of the audit procedure, (b) Criteria / regulatory standard, (c) Condition (active findings), (d) Inherent vs Residual ISA 315 split, (e) Sampling methodology, (f) Next review date derived from the review cadence. Click the chevron on any row to open the full audit workpaper view." />
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 1020, lineHeight: 1.55 }}>
        Each row is an auditable risk vector with inherent + residual rating, entity-deduped exposure, and a next-review date derived from the cadence. Expand any row for the full ISA 315 / 330 workpaper — objective, criteria, sampling, control effectiveness. Showing {filtered} of {total} vectors.
      </p>
      <div style={{ marginTop: 6 }}>
        <AsOfStamp source="Inherent risk per ISA 315 · Residual derived from live findings" />
      </div>
    </div>
  );
}

function Toolbar({ domainFilter, onDomainFilter, severityFilter, onSeverityFilter }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Filter size={12} /> Filters
      </div>
      <select value={domainFilter || ''} onChange={e => onDomainFilter(e.target.value || null)} style={selectStyle}>
        <option value="">All domains</option>
        {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 4 }}>
        {['critical', 'high', 'medium'].map(s => (
          <button
            key={s}
            onClick={() => onSeverityFilter(severityFilter === s ? null : s)}
            style={{
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: severityFilter === s ? (s === 'critical' ? 'rgba(196,30,58,0.14)' : s === 'high' ? 'rgba(180,83,9,0.14)' : 'rgba(202,138,4,0.14)') : 'transparent',
              color: severityFilter === s ? (s === 'critical' ? '#C41E3A' : s === 'high' ? '#B45309' : '#CA8A04') : 'var(--color-text-2)',
              border: `1px solid ${severityFilter === s ? (s === 'critical' ? '#C41E3A' : s === 'high' ? '#B45309' : '#CA8A04') : 'var(--color-border)'}`,
              textTransform: 'capitalize',
            }}
          >
            {s} residual
          </button>
        ))}
      </div>
    </div>
  );
}

function RiskRow({ r, expanded, onToggle, onOpen }) {
  const residualIdx = r.residual === 'critical' ? 5 : r.residual === 'high' ? 4 : r.residual === 'medium' ? 3 : r.residual === 'low' ? 1 : 0;
  const inherent = r.auditMeta.inherentRisk;
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.12s', background: expanded ? 'var(--color-surface-2)' : 'transparent' }}>
      <td style={{ ...td, textAlign: 'center', cursor: 'pointer', borderLeft: `3px solid ${sevColor(r.residual)}` }} onClick={onToggle}>
        {expanded ? <ChevronDown size={14} style={{ color: 'var(--color-text-2)' }} /> : <ChevronRight size={14} style={{ color: 'var(--color-text-3)' }} />}
      </td>
      <td style={{ ...td, cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{r.vectorLabel}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2, fontFamily: 'var(--font-mono, monospace)' }}>{r.id}</div>
      </td>
      <td style={{ ...td, cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ color: 'var(--color-text)' }}>{r.domainLabel}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginTop: 2 }}>{r.ownerRole}</div>
      </td>
      <td style={{ ...td, textAlign: 'center' }}>
        <RiskPill idx={inherent} label={RISK_LABELS[inherent]} />
      </td>
      <td style={{ ...td, textAlign: 'center' }}>
        <RiskPill idx={residualIdx} label={r.residual.toUpperCase()} />
      </td>
      <td style={{ ...td, textAlign: 'center', fontSize: 11 }}>
        {r.total > 0 ? (
          <span style={{ fontWeight: 700 }}>
            <span style={{ color: '#C41E3A' }}>{r.critical}c</span>
            <span style={{ color: 'var(--color-text-3)', margin: '0 3px' }}>·</span>
            <span style={{ color: '#B45309' }}>{r.high}h</span>
            <span style={{ color: 'var(--color-text-3)', margin: '0 3px' }}>·</span>
            <span style={{ color: '#CA8A04' }}>{r.medium}m</span>
          </span>
        ) : (
          <span style={{ color: '#0BBF7A' }}>Clean</span>
        )}
      </td>
      <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: r.exposure > 0 ? 'var(--color-text)' : 'var(--color-text-3)' }}>
        {r.exposure > 0 ? <Num>{formatLkr(r.exposure)}</Num> : '—'}
      </td>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Calendar size={10} style={{ color: '#185FA5' }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{r.review.due}</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>(in {r.review.days}d)</span>
        </div>
      </td>
      <td style={{ ...td, cursor: 'pointer' }} onClick={onOpen}>
        <ChevronRight size={14} style={{ color: 'var(--color-text-3)' }} />
      </td>
    </tr>
  );
}

function RiskWorkpaperRow({ r }) {
  return (
    <tr>
      <td colSpan={9} style={{ padding: 0, background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <WorkpaperField icon={Target} label="Objective" color="#185FA5">
            {r.auditMeta.objective}
          </WorkpaperField>
          <WorkpaperField icon={Shield} label="Criteria (regulatory / policy)" color="#7C3AED">
            {r.auditMeta.criteria}
          </WorkpaperField>
          <WorkpaperField icon={FileText} label="Condition (live findings)" color="#C41E3A">
            {r.total > 0
              ? `${r.total} active finding${r.total === 1 ? '' : 's'} — ${r.critical} critical, ${r.high} high, ${r.medium} medium. Contributing agents: ${r.activeAgents.map(a => AGENT_META[a]?.name || a).join(', ') || '—'}.`
              : 'No active findings at the current thresholds. Controls appear effective this cycle.'}
            {r.exposureOverlaps.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--color-text-2)' }}>
                Entity-deduped: {r.exposureOverlaps.length} entit{r.exposureOverlaps.length === 1 ? 'y' : 'ies'} flagged by multiple agents — largest exposure retained per entity to avoid over-stating risk.
              </div>
            )}
          </WorkpaperField>
          <WorkpaperField icon={Layers} label="Sampling methodology" color="#0F6E56">
            {r.auditMeta.sampling}
          </WorkpaperField>
          <WorkpaperField icon={Shield} label="Control effectiveness" color="#B45309">
            <span style={{ fontWeight: 700 }}>{r.controlsEffective}</span>
            {r.activeAgents.length > 0 && (
              <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 4 }}>
                Continuous testing by {r.activeAgents.length} agent{r.activeAgents.length === 1 ? '' : 's'}: {r.activeAgents.map(a => AGENT_META[a]?.name || a).join(', ')}.
              </div>
            )}
          </WorkpaperField>
          <WorkpaperField icon={Calendar} label="Review cadence & next review" color="#185FA5">
            <span style={{ fontWeight: 700 }}>{r.auditMeta.reviewCadence}</span>
            <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 4 }}>
              Next review due <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{r.review.due}</strong> — cadence shortened from baseline because residual is {r.residual}.
            </div>
          </WorkpaperField>
        </div>
      </td>
    </tr>
  );
}

function WorkpaperField({ icon: Icon, label, color, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={11} style={{ color }} />
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{label}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function RiskPill({ idx, label }) {
  const color = RISK_COLORS[idx] || RISK_COLORS[0];
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 9px', borderRadius: 10, background: color + '18', color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
  );
}

const th = { padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' };
const td = { padding: '9px 12px', verticalAlign: 'middle' };
const selectStyle = { fontSize: 11.5, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', cursor: 'pointer' };
