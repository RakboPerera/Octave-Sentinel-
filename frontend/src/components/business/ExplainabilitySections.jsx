import React from 'react';
import { Shield, Clock, ShieldAlert, Activity, Database, Info, AlertTriangle } from 'lucide-react';
import InfoHint from './InfoHint.jsx';

// ─── SHARED EXPLAINABILITY SECTIONS (Wave 1 audit-grade schema) ──────────────
// Rendered by ExplainabilityPanel, the single inline trail surface used across
// the platform (Now drilldown, Investigate, Domain deep-dive, Engine Map).
//
// Sections provided here (all render null if their input is missing):
//   • <RegulatoryCitationsSection citations /> — structured regulator/directive/section
//   • <RemediationSlaSection sla />           — owner + internal deadline + regulatory deadline
//   • <ControlFailureSection cf />            — control id/type/description/last-tested
//   • <ConfidenceSection value metadata />    — confidence with calibration provenance
//   • <DataLineageSection lineage />          — per-source record count + sampling + row id
//
// Schema keys align with backend/prompts/explainability.js and are populated by
// the deterministic trailGenerator.js (grounded to the finding) or the live
// Explainability Agent when an API key is configured.

export function SectionFrame({ title, icon: Icon, color = 'var(--color-text-3)', help, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        {Icon && (
          <span style={{ width: 20, height: 20, borderRadius: 6, background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={12} />
          </span>
        )}
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{title}</div>
        {help && <InfoHint text={help} title={title} />}
      </div>
      {children}
    </div>
  );
}

// ─── REGULATORY CITATIONS ────────────────────────────────────────────────────
// Replaces the old free-text `regulatory_hook` with a structured list. A
// regulator can only verify a citation they can look up; "CBSL 5/2024" is
// not a citation. Expected shape:
//   { regulator: 'CBSL', directive: 'Direction No. 05/2024', section: '3.2',
//     paragraph: 'b', effective_date: '2024-03-15',
//     title: 'Large Exposures Direction',
//     relevance: 'Defines the 25% single-obligor limit this finding breaches.' }
export function RegulatoryCitationsSection({ citations, fallbackText }) {
  const list = Array.isArray(citations) ? citations.filter(Boolean) : [];
  if (list.length === 0 && !fallbackText) return null;

  return (
    <SectionFrame
      title="Regulatory citations"
      icon={Shield}
      color="#185FA5"
      help="Each citation must be specific enough for a regulator to look up: regulator, directive number, section/paragraph, effective date. Relevance explains why this citation applies to this finding."
    >
      {list.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((c, i) => <CitationCard key={i} c={c} />)}
        </div>
      ) : (
        <div style={{ padding: 12, background: 'rgba(24,95,165,0.04)', border: '1px solid rgba(24,95,165,0.18)', borderRadius: 8, fontSize: 11.5, color: 'var(--color-text)', lineHeight: 1.5 }}>
          {fallbackText}
        </div>
      )}
    </SectionFrame>
  );
}

function CitationCard({ c }) {
  const header = [c.regulator, c.directive].filter(Boolean).join(' · ');
  const sub = [
    c.section ? `§${c.section}${c.paragraph ? '(' + c.paragraph + ')' : ''}` : null,
    c.effective_date ? `eff. ${c.effective_date}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <div style={{ padding: '10px 12px', background: 'rgba(24,95,165,0.05)', border: '1px solid rgba(24,95,165,0.18)', borderLeft: '3px solid #185FA5', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: c.title || c.relevance ? 4 : 0 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: '#185FA5', fontFamily: 'var(--font-display)' }}>{header || '—'}</span>
        {sub && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-3)', fontFamily: 'var(--font-mono, monospace)' }}>{sub}</span>}
      </div>
      {c.title && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>{c.title}</div>}
      {c.relevance && <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.55 }}>{c.relevance}</div>}
    </div>
  );
}

// ─── REMEDIATION SLA ─────────────────────────────────────────────────────────
// Under FTRA / CBSL, many findings carry hard regulatory deadlines (STR filing
// within 5 working days; single-obligor breach notification within 48 hours).
// Case Manager cannot enforce an SLA that isn't attached to the finding.
// Shape: { action_owner_role, internal_deadline, regulatory_deadline,
//          escalation_policy, action_summary }
export function RemediationSlaSection({ sla }) {
  if (!sla || typeof sla !== 'object') return null;
  const { action_owner_role, action_summary, internal_deadline, regulatory_deadline, escalation_policy } = sla;
  if (!action_owner_role && !internal_deadline && !regulatory_deadline && !action_summary) return null;

  return (
    <SectionFrame
      title="Remediation SLA"
      icon={Clock}
      color="#B45309"
      help="Structured remediation with owner and hard deadlines. Regulatory deadlines (e.g., FTRA 5-day STR filing) are shown separately from internal SLAs. Case Manager honours these when ageing findings."
    >
      <div style={{ padding: 12, background: 'rgba(180,83,9,0.04)', border: '1px solid rgba(180,83,9,0.2)', borderLeft: '3px solid #B45309', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {action_summary && (
          <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.55, fontWeight: 600 }}>{action_summary}</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
          {action_owner_role && <MetaCell label="Owner" value={action_owner_role} />}
          {internal_deadline && <MetaCell label="Internal deadline" value={internal_deadline} />}
          {regulatory_deadline && <MetaCell label="Regulatory deadline" value={regulatory_deadline} color="#C41E3A" />}
        </div>
        {escalation_policy && (
          <div style={{ fontSize: 11, color: 'var(--color-text-2)', lineHeight: 1.5, paddingTop: 6, borderTop: '1px dashed rgba(180,83,9,0.3)' }}>
            <span style={{ fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9.5 }}>Escalation </span>
            {escalation_policy}
          </div>
        )}
      </div>
    </SectionFrame>
  );
}

// ─── CONTROL FAILURE ─────────────────────────────────────────────────────────
// Links a finding to the specific control that failed. Auditors need this to
// remediate at the control layer, not just the symptom.
// Shape: { control_id, control_type, description, owner_role, last_tested_date,
//          last_test_outcome }
export function ControlFailureSection({ cf }) {
  if (!cf || typeof cf !== 'object') return null;
  const { control_id, control_type, description, owner_role, last_tested_date, last_test_outcome } = cf;
  if (!control_id && !description) return null;

  return (
    <SectionFrame
      title="Control failure"
      icon={ShieldAlert}
      color="#C41E3A"
      help="Which control should have prevented or detected this — its ID, type (preventive/detective), owner, and when it was last tested. Drives remediation at the control layer rather than the symptom."
    >
      <div style={{ padding: 12, background: 'rgba(196,30,58,0.04)', border: '1px solid rgba(196,30,58,0.2)', borderLeft: '3px solid #C41E3A', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {control_id && <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', padding: '2px 8px', borderRadius: 6, background: '#C41E3A', color: 'white' }}>{control_id}</span>}
          {control_type && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(196,30,58,0.12)', color: '#C41E3A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{control_type}</span>}
          {owner_role && <span style={{ fontSize: 11, color: 'var(--color-text-2)' }}>owner: <strong>{owner_role}</strong></span>}
        </div>
        {description && <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.55 }}>{description}</div>}
        {(last_tested_date || last_test_outcome) && (
          <div style={{ fontSize: 11, color: 'var(--color-text-2)', display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px dashed rgba(196,30,58,0.25)' }}>
            {last_tested_date && <span>Last tested: <strong>{last_tested_date}</strong></span>}
            {last_test_outcome && <span>Outcome: <strong>{last_test_outcome}</strong></span>}
          </div>
        )}
      </div>
    </SectionFrame>
  );
}

// ─── CONFIDENCE WITH CALIBRATION METADATA ────────────────────────────────────
// Bare percentage is insufficient: auditors need to know the calibration date,
// the validation cohort size, and the model's measured false-positive rate.
// Shape: value (0..1) + metadata: { calibration_date, false_positive_rate,
//          validation_cohort_size, note }
export function ConfidenceSection({ value, metadata }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 85 ? '#0BBF7A' : pct >= 65 ? '#F5B841' : '#C41E3A';
  const m = metadata || {};
  return (
    <div style={{ padding: 14, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Activity size={10} /> Confidence
        <InfoHint title="Confidence" text="Model-reported posterior probability that the finding is a true positive at the current thresholds. Calibration metadata tells you when this was last validated and the measured false-positive rate — without that, the number is not auditable." />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <ConfidenceGauge pct={pct} color={color} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--color-text-2)', flex: 1 }}>
          {m.calibration_date && <div>Calibrated <strong>{m.calibration_date}</strong></div>}
          {m.false_positive_rate != null && <div>Measured FP rate <strong>{(m.false_positive_rate * 100).toFixed(1)}%</strong></div>}
          {m.validation_cohort_size != null && <div>Validation cohort <strong>{Number(m.validation_cohort_size).toLocaleString()}</strong></div>}
          {!m.calibration_date && m.false_positive_rate == null && m.note && (
            <div style={{ fontStyle: 'italic', color: 'var(--color-text-3)', lineHeight: 1.5 }}>{m.note}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact donut gauge — clearer at a glance than a flat progress bar.
function ConfidenceGauge({ pct, color }) {
  const r = 26, c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }} aria-label={`Confidence ${pct}%`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${filled} ${c}`} transform="rotate(-90 36 36)"
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-display)" fontWeight="800" fontSize="17" fill={color}>{pct}%</text>
    </svg>
  );
}

// ─── DATA LINEAGE WITH RECORD COUNT + SAMPLING ───────────────────────────────
// Every lineage row must disclose either the exact record identifier
// (single row) or the record_count + sampling_frame/method (sample-based).
// Without this, the finding is not reproducible.
export function DataLineageSection({ lineage }) {
  const list = Array.isArray(lineage) ? lineage.filter(Boolean) : [];
  if (list.length === 0) return null;

  return (
    <SectionFrame
      title="Data lineage"
      icon={Database}
      color="#475569"
      help="Exactly which tables, columns, and rows the finding was computed from. For sample-based claims, the sampling frame and method must be declared so the result is reproducible."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.map((d, i) => <LineageCard key={i} d={d} />)}
      </div>
    </SectionFrame>
  );
}

function LineageCard({ d }) {
  const cols = Array.isArray(d.columns) ? d.columns.join(', ') : (d.fields || '');
  return (
    <div style={{ padding: '8px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11.5 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#475569' }}>{d.source}</span>
        {d.row_identifier && (
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: 'var(--color-text-3)' }}>{d.row_identifier}</span>
        )}
        {d.record_count != null && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: 'rgba(15,110,86,0.12)', color: '#0F6E56' }}>
            {Number(d.record_count).toLocaleString()} rec{d.record_count === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {cols && (
        <div style={{ fontSize: 11, color: 'var(--color-text-2)', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1.5 }}>columns: {cols}</div>
      )}
      {(d.sampling_frame || d.sampling_method) && (
        <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 5, paddingTop: 5, borderTop: '1px dashed var(--color-border)', lineHeight: 1.5 }}>
          {d.sampling_frame && <><span style={{ fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9.5 }}>Frame </span>{d.sampling_frame}{' '}</>}
          {d.sampling_method && <><span style={{ fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9.5 }}>Method </span>{d.sampling_method}</>}
        </div>
      )}
      {d.as_of && (
        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 3, fontStyle: 'italic' }}>as of {d.as_of}</div>
      )}
    </div>
  );
}

// ─── METADATA CELL (shared small util) ────────────────────────────────────────
function MetaCell({ label, value, color = 'var(--color-text)' }) {
  return (
    <div style={{ padding: '6px 9px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color, fontFamily: 'var(--font-display)', marginTop: 1 }}>{value}</div>
    </div>
  );
}

// ─── COMPACT NO-DATA PLACEHOLDER (used by Drawer when nothing authored) ───────
export function MissingSectionPlaceholder({ label, reason }) {
  return (
    <div style={{ padding: 10, fontSize: 11, color: 'var(--color-text-3)', background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)', borderRadius: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
      <Info size={11} style={{ color: 'var(--color-text-3)' }} />
      <span><strong>{label}</strong> — {reason || 'not yet authored on this finding.'}</span>
    </div>
  );
}
