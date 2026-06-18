import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AGENT_META } from '../../data/agentMeta.js';
import { plainStatistic } from '../../utils/auditLanguage.js';
import { Activity, Info, Target, Layers, GitBranch, AlertTriangle, CheckCircle, Sparkles, X, Shield, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import InfoHint from './InfoHint.jsx';
import {
  RegulatoryCitationsSection,
  RemediationSlaSection,
  ControlFailureSection,
  ConfidenceSection,
  DataLineageSection,
} from './ExplainabilitySections.jsx';

// ─── EXPLAINABILITY PANEL (layered disclosure) ───────────────────────────────
// The full audit-grade trail is 14 sections — correct for a CBSL response, but
// overwhelming for everyday triage. Phase D splits it into three layers so an
// auditor sees the DECISION first and reveals depth on demand:
//   • Layer 1 (always): Summary · Why flagged · Recommended action + SLA
//   • Layer 2 "Show evidence": domain context, signals, methodology, trail,
//     counterfactual, data lineage, cross-agent corroboration
//   • Layer 3 "Audit-grade view": how-to-verify, control failure, regulatory
//     citations, confidence + calibration metadata
// "Copy as working paper" serialises all three layers to plain text for the
// auditor's evidence file.

// ─── EVIDENCE BLOCK (Phase 1 — grounded, re-performable proof) ───────────────
// Renders the deterministic detection evidence carried on a finding: the source
// row it came from, the exact rule(s) that fired (field, value, operator,
// threshold), and the engine stamp. This is what lets an auditor re-perform the
// finding rather than trust a narrative.
function EvidenceBlock({ finding }) {
  const ev = finding?.evidence;
  if (!ev?.triggeredBy?.length) return null;
  const det = finding.detection || {};
  const isStat = det.method === 'statistical-test';
  const isComputed = det.method === 'deterministic-rule' || isStat;
  const stat = ev.statistic;
  const fmt = (v) => typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString() : v) : String(v);
  return (
    <Section title="Evidence" icon={Shield} color="#0F6E56" help="The source record and the exact rule that produced this finding. Deterministic and re-performable — re-running the engine on the same data yields the identical result.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: isComputed ? 'rgba(11,191,122,0.14)' : 'rgba(245,184,65,0.16)', color: isComputed ? '#0BBF7A' : '#B45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <CheckCircle size={11} /> {isStat ? 'Statistical test' : isComputed ? 'Deterministic rule' : (det.method || 'computed')}
          </span>
          {det.engineVersion && <span style={{ fontSize: 10.5, color: 'var(--color-text-3)', fontFamily: 'var(--font-mono, monospace)' }}>engine v{det.engineVersion}</span>}
          {ev.sourceRef?.key != null && (
            <span style={{ fontSize: 11, color: 'var(--color-text-2)', fontFamily: 'var(--font-mono, monospace)' }}>
              source: {ev.sourceRef.field || 'row'}={String(ev.sourceRef.key)}{ev.sourceRef.rowIndex != null ? ` · row ${ev.sourceRef.rowIndex + 1}` : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ev.triggeredBy.map((t, i) => (
            <div key={i} style={{ padding: '8px 10px', background: 'rgba(15,110,86,0.05)', borderLeft: '3px solid #0F6E56', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)' }}>
                {t.field} = <strong>{fmt(t.value)}</strong> {t.op} {fmt(t.threshold)}
              </div>
              {t.rule && <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 2, lineHeight: 1.45 }}>{t.rule}</div>}
            </div>
          ))}
        </div>
        {stat && Number.isFinite(stat.p) && (() => {
          const plain = plainStatistic(stat);
          return (
            <div style={{ padding: '8px 10px', background: 'rgba(124,58,237,0.06)', borderLeft: '3px solid #7C3AED', borderRadius: 6 }}>
              {/* Plain audit language first — what it means + what to do. */}
              {plain && <div style={{ fontSize: 11.5, color: 'var(--color-text)', lineHeight: 1.5, fontWeight: 600 }}>{plain.headline}</div>}
              {plain && <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 3, lineHeight: 1.45 }}>{plain.action}</div>}
              {/* The raw statistics stay, for the model-governance / regulator reader. */}
              <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontFamily: 'var(--font-mono, monospace)', marginTop: 6, paddingTop: 5, borderTop: '1px dashed var(--color-border)' }}>
                {stat.test}: {stat.value != null ? `stat=${fmt(Math.round(stat.value * 1000) / 1000)}` : ''}{stat.df != null ? ` · df=${stat.df}` : ''} · p={stat.p < 1e-3 ? stat.p.toExponential(2) : (Math.round(stat.p * 1e4) / 1e4)}{stat.peerMedian != null ? ` · peer median=${fmt(Math.round(stat.peerMedian * 100) / 100)}` : ''}{finding.fdr ? ` · FDR ${finding.fdr.significant ? 'significant' : 'advisory'} (q=${finding.fdr.q})` : ''}
              </div>
            </div>
          );
        })()}
        {ev.recomputedExposureLkr > 0 && (
          <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Recomputed exposure: LKR {Math.round(ev.recomputedExposureLkr).toLocaleString()}</div>
        )}
      </div>
    </Section>
  );
}

export default function ExplainabilityPanel({ data, source, loading, error, finding, agentId }) {
  // Hooks must run unconditionally, before any early return.
  const [showEvidence, setShowEvidence] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} />;
  // Compute-first: when there's no LLM narrative but the finding carries
  // deterministic evidence, the evidence IS the artifact — show it.
  if (!data) {
    if (finding?.evidence?.triggeredBy?.length) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <EvidenceBlock finding={finding} />
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontStyle: 'italic', lineHeight: 1.5 }}>
            No AI narrative generated — this finding is grounded entirely in the deterministic evidence above and is reproducible from the source data. Connect an API key to add a plain-English explanation on top.
          </div>
        </div>
      );
    }
    return <IdleState />;
  }

  async function copyWorkingPaper() {
    try {
      await navigator.clipboard.writeText(buildWorkingPaper(data, agentId, finding));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked (insecure context / permissions) — silent no-op */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <SourceBadge source={source} />
        <button
          type="button"
          onClick={copyWorkingPaper}
          title="Copy the full trail (all three layers) as plain text for your evidence file"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'var(--color-surface-2)', color: copied ? '#0BBF7A' : 'var(--color-text-2)', border: '1px solid var(--color-border)', fontFamily: 'inherit' }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy as working paper'}
        </button>
      </div>

      {/* ─── Grounded evidence (deterministic) — the primary artifact ─────── */}
      {finding?.evidence?.triggeredBy?.length > 0 && <EvidenceBlock finding={finding} />}

      {/* ─── LAYER 1 — the decision: what is it, why, what to do ─────────── */}
      <Section title="Summary" icon={Info} color="#185FA5">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.55 }}>{data.summary}</div>
      </Section>

      {data.why_flagged && (
        <Section title="Why flagged" icon={AlertTriangle} color="#C41E3A">
          <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6, padding: 12, background: 'rgba(196,30,58,0.04)', borderLeft: '3px solid #C41E3A', borderRadius: 6 }}>{data.why_flagged}</div>
        </Section>
      )}

      <RemediationSlaSection sla={data.remediation_sla} />

      {/* ─── Disclosure toggles ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
        <LayerToggle open={showEvidence} onClick={() => setShowEvidence(v => !v)} label="evidence" icon={Layers} />
        <LayerToggle open={showAudit} onClick={() => setShowAudit(v => !v)} label="audit-grade view" icon={Shield} />
      </div>

      {/* ─── LAYER 2 — evidence ──────────────────────────────────────────── */}
      {showEvidence && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {data.domain_context && (
            <Section title="Why this matters to your domain" icon={Target} color="#B45309">
              <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6, padding: 12, background: 'rgba(245,184,65,0.05)', borderLeft: '3px solid #F5B841', borderRadius: 6 }}>{data.domain_context}</div>
            </Section>
          )}

          {Array.isArray(data.signals) && data.signals.length > 0 && (
            <Section title="Signals that fired" icon={Activity} color="#C41E3A" help="Each signal is a measurement compared against its active threshold. Distance and direction from the threshold drive the severity.">
              <SignalsTable signals={data.signals} />
            </Section>
          )}

          {data.agent_methodology && (
            <Section title="How the agent detected this" icon={Layers} color="#4B3F72" help="The detection logic of the primary agent, its data sources, and the thresholds currently in effect.">
              <AgentMethodologyCard m={data.agent_methodology} />
            </Section>
          )}

          {Array.isArray(data.trail) && data.trail.length > 0 && (
            <Section title="Step-by-step trail" icon={GitBranch} color="#0F6E56" help="Each step records what an agent did, what data it touched, and the result. Click any step with an 'Explain' chip for a deeper walkthrough.">
              <TrailSteps steps={data.trail} />
            </Section>
          )}

          {data.counterfactual && (
            <Section title="What would have changed the outcome" icon={GitBranch} color="#185FA5">
              <div style={{ fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.6, fontStyle: 'italic' }}>{data.counterfactual}</div>
            </Section>
          )}

          <DataLineageSection lineage={data.data_lineage} />

          {data.corroboration && (
            <Section title="Cross-agent corroboration" icon={Layers} color="#7C3AED" help="Findings from other agents on the same entity. Independent detection paths converging is what makes a finding case-worthy.">
              {Array.isArray(data.corroboration) ? (
                data.corroboration.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontStyle: 'italic', padding: 12, background: 'var(--color-surface-2)', borderRadius: 6 }}>
                    No other agent has corroborating findings on this entity — single-agent signal.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.corroboration.map((c, i) => (
                      <div key={i} style={{ padding: '10px 12px', background: 'rgba(124,58,237,0.05)', borderLeft: '3px solid #7C3AED', borderRadius: 6 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: '#7C3AED', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.agent}</span>
                          {c.entity && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-2)' }}>entity: {c.entity}</span>}
                          {c.finding_ref && <span style={{ fontSize: 10.5, color: 'var(--color-text-3)' }}>ref {c.finding_ref}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.55 }}>{c.evidence}</div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6, padding: 12, background: 'rgba(124,58,237,0.05)', borderLeft: '3px solid #7C3AED', borderRadius: 6 }}>{data.corroboration}</div>
              )}
            </Section>
          )}
        </div>
      )}

      {/* ─── LAYER 3 — audit-grade (CBSL response / evidence file) ────────── */}
      {showAudit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {data.how_to_verify && (
            <Section title="How to verify" icon={CheckCircle} color="#0BBF7A">
              <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6 }}>{data.how_to_verify}</div>
            </Section>
          )}
          <ControlFailureSection cf={data.control_failure} />
          <RegulatoryCitationsSection citations={data.regulatory_citations} fallbackText={data.regulatory_hook} />
          <ConfidenceSection value={data.confidence} metadata={data.confidence_metadata} />
        </div>
      )}
    </div>
  );
}

// ─── LAYER TOGGLE ────────────────────────────────────────────────────────────
function LayerToggle({ open, onClick, label, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        background: open ? 'rgba(24,95,165,0.08)' : 'var(--color-surface-2)',
        color: open ? '#185FA5' : 'var(--color-text-2)',
        border: `1px solid ${open ? 'rgba(24,95,165,0.3)' : 'var(--color-border)'}`,
      }}
    >
      <Icon size={13} />
      {open ? 'Hide' : 'Show'} {label}
      {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
    </button>
  );
}

// ─── WORKING-PAPER SERIALISER ────────────────────────────────────────────────
// Flattens the full trail (all three layers) into plain text an auditor can
// paste into a working paper / evidence file. Mirrors the on-screen order.
function buildWorkingPaper(data, agentId, finding) {
  const L = [];
  const p = (s = '') => L.push(s);
  p('SENTINEL — EXPLAINABILITY WORKING PAPER');
  p('================================================');
  if (agentId) p(`Source agent: ${agentId}`);
  p('');
  // Grounded, re-performable engine evidence FIRST — the deterministic artifact a
  // regulator / model-validator re-checks. Mirrors the on-screen Evidence block so
  // the copied paper stays in sync with the engine output (rules + p-value + FDR).
  const ev = finding?.evidence;
  if (ev?.triggeredBy?.length) {
    const det = finding.detection || {};
    p('0. GROUNDED EVIDENCE (DETERMINISTIC — RE-PERFORMABLE)');
    p(`Method: ${det.method === 'statistical-test' ? 'Statistical test' : det.method === 'deterministic-rule' ? 'Deterministic rule' : (det.method || 'computed')}${det.engineVersion ? ` · engine v${det.engineVersion}` : ''}`);
    if (ev.sourceRef?.key != null) p(`Source record: ${ev.sourceRef.field || 'row'}=${ev.sourceRef.key}${ev.sourceRef.rowIndex != null ? ` (row ${ev.sourceRef.rowIndex + 1})` : ''}`);
    ev.triggeredBy.forEach(t => p(`  - ${t.field} = ${t.value} ${t.op} ${t.threshold}${t.rule ? `  [${t.rule}]` : ''}`));
    const s = ev.statistic;
    if (s && Number.isFinite(s.p)) {
      const pv = s.p < 1e-3 ? s.p.toExponential(2) : (Math.round(s.p * 1e4) / 1e4);
      p(`Statistic: ${s.test}${s.value != null ? ` stat=${Math.round(s.value * 1000) / 1000}` : ''}${s.df != null ? ` df=${s.df}` : ''} p=${pv}${s.peerMedian != null ? ` peer-median=${s.peerMedian}` : ''}${s.mad != null ? ` MAD=${s.mad}` : ''}`);
    }
    if (finding.fdr) p(`FDR control: ${finding.fdr.significant ? 'significant discovery' : 'advisory (below FDR)'} at q=${finding.fdr.q}${finding.fdr.pAdjusted != null ? ` · adjusted p=${finding.fdr.pAdjusted}` : ''}`);
    if (ev.recomputedExposureLkr > 0) p(`Recomputed exposure: LKR ${Math.round(ev.recomputedExposureLkr).toLocaleString()}`);
    p('');
  }
  p('1. SUMMARY');
  p(data.summary || '—');
  p('');
  if (data.why_flagged) { p('2. WHY FLAGGED'); p(data.why_flagged); p(''); }
  const sla = data.remediation_sla;
  if (sla && typeof sla === 'object') {
    p('3. RECOMMENDED ACTION & SLA');
    if (sla.action_summary) p(`Action: ${sla.action_summary}`);
    if (sla.action_owner_role) p(`Owner: ${sla.action_owner_role}`);
    if (sla.internal_deadline) p(`Internal deadline: ${sla.internal_deadline}`);
    if (sla.regulatory_deadline) p(`Regulatory deadline: ${sla.regulatory_deadline}`);
    if (sla.escalation_policy) p(`Escalation: ${sla.escalation_policy}`);
    p('');
  }
  if (Array.isArray(data.signals) && data.signals.length) {
    p('4. SIGNALS THAT FIRED');
    data.signals.forEach(s => p(`  - ${s.label}: ${s.value} vs threshold ${s.threshold}${s.breached ? '  [BREACHED]' : ''}`));
    p('');
  }
  if (data.agent_methodology?.how_it_detects) { p('5. METHODOLOGY'); p(data.agent_methodology.how_it_detects); p(''); }
  if (Array.isArray(data.trail) && data.trail.length) {
    p('6. STEP-BY-STEP TRAIL');
    data.trail.forEach(t => p(`  ${t.step ?? '·'}. [${t.agent || 'system'}] ${t.action || ''}${t.result ? ' -> ' + t.result : ''}`));
    p('');
  }
  if (data.counterfactual) { p('7. COUNTERFACTUAL'); p(data.counterfactual); p(''); }
  if (Array.isArray(data.data_lineage) && data.data_lineage.length) {
    p('8. DATA LINEAGE');
    data.data_lineage.forEach(d => p(`  - ${d.source}${d.row_identifier ? ' [' + d.row_identifier + ']' : ''}${d.record_count != null ? ' (' + d.record_count + ' recs)' : ''}`));
    p('');
  }
  if (data.how_to_verify) { p('9. HOW TO VERIFY'); p(data.how_to_verify); p(''); }
  const cf = data.control_failure;
  if (cf && (cf.control_id || cf.description)) {
    p('10. CONTROL FAILURE');
    if (cf.control_id) p(`Control: ${cf.control_id}${cf.control_type ? ' (' + cf.control_type + ')' : ''}`);
    if (cf.description) p(cf.description);
    if (cf.owner_role) p(`Owner: ${cf.owner_role}`);
    p('');
  }
  const cites = Array.isArray(data.regulatory_citations) ? data.regulatory_citations.filter(Boolean) : [];
  if (cites.length) {
    p('11. REGULATORY CITATIONS');
    cites.forEach(c => p(`  - ${[c.regulator, c.directive].filter(Boolean).join(' · ')}${c.section ? ' §' + c.section : ''}${c.title ? ' — ' + c.title : ''}`));
    p('');
  } else if (data.regulatory_hook) {
    p('11. REGULATORY CONTEXT'); p(data.regulatory_hook); p('');
  }
  if (data.confidence != null) {
    p('12. CONFIDENCE');
    p(`${Math.round((data.confidence || 0) * 100)}%`);
    const m = data.confidence_metadata || {};
    if (m.calibration_date) p(`Calibrated: ${m.calibration_date}`);
    if (m.false_positive_rate != null) p(`Measured FP rate: ${(m.false_positive_rate * 100).toFixed(1)}%`);
    if (m.validation_cohort_size != null) p(`Validation cohort: ${m.validation_cohort_size}`);
    if (m.note) p(`Note: ${m.note}`);
  }
  return L.join('\n');
}

// ─── SIGNALS TABLE WITH BAR CHART ────────────────────────────────────────────
function SignalsTable({ signals }) {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <>
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
        {signals.map((s, i) => (
          <SignalRow
            key={i}
            s={s}
            last={i === signals.length - 1}
            onClick={s.detail ? () => setOpenIdx(i) : null}
          />
        ))}
      </div>
      {openIdx != null && signals[openIdx]?.detail && (
        <ExplainPopover
          title={signals[openIdx].label}
          kind="signal"
          meta={[
            { label: 'Measured value', value: signals[openIdx].value },
            { label: 'Threshold',      value: signals[openIdx].threshold },
            { label: 'Status',         value: signals[openIdx].breached ? 'Breached' : 'Within tolerance', color: signals[openIdx].breached ? '#C41E3A' : '#0BBF7A' },
          ]}
          body={signals[openIdx].detail}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </>
  );
}

// Parse a possibly-formatted signal figure ("0.94", "312%", "LKR 5,000,000") to a number.
function parseFigure(v) {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

function SignalRow({ s, last, onClick }) {
  const breached = !!s.breached;
  const strength = Math.min(1, Math.max(0, Number(s.strength) || 0));
  const color = breached ? '#C41E3A' : strength > 0.8 ? '#B45309' : '#0BBF7A';
  const clickable = !!onClick;

  // Threshold tick: where the line sat on the same visual scale the bar fill
  // uses. Only drawn when value & threshold are both parseable numbers — gives
  // "the threshold was here, the value landed there" at a glance.
  const fillPct = Math.round(strength * 100);
  const numVal = parseFigure(s.value);
  const numThr = parseFigure(s.threshold);
  const tickPct = (Number.isFinite(numVal) && Number.isFinite(numThr) && numVal !== 0)
    ? Math.max(3, Math.min(97, (numThr / numVal) * fillPct))
    : null;

  return (
    <button
      type="button"
      onClick={onClick || undefined}
      disabled={!clickable}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '10px 12px', borderBottom: last ? 'none' : '1px solid var(--color-border)',
        background: 'var(--color-surface)', border: 'none',
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'inherit',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
      onMouseLeave={e => { if (clickable) e.currentTarget.style.background = 'var(--color-surface)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          {s.label}
          {clickable && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: 'rgba(245,184,65,0.18)', color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explain</span>
          )}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          <span style={{ color: breached ? '#C41E3A' : 'var(--color-text)' }}>{s.value}</span>
          <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}>vs</span>
          <span style={{ color: 'var(--color-text-2)' }}>{s.threshold}</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'var(--color-border)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${fillPct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
        {tickPct != null && (
          <span
            title={`Threshold: ${s.threshold}`}
            style={{ position: 'absolute', left: `${tickPct}%`, top: -2, width: 2, height: 10, background: 'var(--color-text)', opacity: 0.55, transform: 'translateX(-1px)', borderRadius: 1 }}
          />
        )}
      </div>
      {tickPct != null && (
        <div style={{ fontSize: 9, color: 'var(--color-text-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 2, height: 8, background: 'var(--color-text)', opacity: 0.55, display: 'inline-block', borderRadius: 1 }} /> threshold {s.threshold}
        </div>
      )}
    </button>
  );
}

// Shared popover used by signals + trail steps when `detail` is present.
function ExplainPopover({ title, kind, meta = [], body, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,30,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '80vh', overflowY: 'auto', background: 'white', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.3)', padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B45309' }}>{kind === 'signal' ? 'Signal explanation' : 'Trail step explanation'}</div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.4, marginBottom: meta.length > 0 ? 12 : 16 }}>{title}</div>
          {meta.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
              {meta.map((m, i) => (
                <div key={i} style={{ padding: '8px 10px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: m.color || 'var(--color-text)', fontFamily: 'var(--font-display)', marginTop: 2 }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{body}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── AGENT METHODOLOGY CARD ──────────────────────────────────────────────────
function AgentMethodologyCard({ m }) {
  return (
    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--color-text)' }}>{m.agent}</div>
      {m.how_it_detects && (
        <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', marginTop: 6, lineHeight: 1.5 }}>{m.how_it_detects}</div>
      )}
      {Array.isArray(m.data_sources) && m.data_sources.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <InlineLabel>Data sources</InlineLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {m.data_sources.map((d, i) => (
              <span key={i} style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>{d}</span>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(m.active_thresholds) && m.active_thresholds.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <InlineLabel>Active thresholds</InlineLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {m.active_thresholds.map((t, i) => (
              <span key={i} title={`Default: ${t.default}${t.modified ? ' (modified)' : ''}`} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: t.modified ? 'rgba(245,184,65,0.14)' : 'var(--color-surface)', color: t.modified ? '#B45309' : 'var(--color-text-2)', border: `1px solid ${t.modified ? 'rgba(245,184,65,0.35)' : 'var(--color-border)'}`, fontWeight: 700, cursor: 'help' }}>
                {t.label}: <span style={{ fontFamily: 'var(--font-display)' }}>{t.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InlineLabel({ children }) {
  return <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 4 }}>{children}</div>;
}

// ─── TRAIL STEPS ─────────────────────────────────────────────────────────────
function TrailSteps({ steps }) {
  const [openIdx, setOpenIdx] = useState(null);
  const open = openIdx != null ? steps[openIdx] : null;
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((step, i) => (
          <TrailStep
            key={i}
            step={step}
            onClick={step.detail ? () => setOpenIdx(i) : null}
          />
        ))}
      </div>
      {open?.detail && (
        <ExplainPopover
          title={open.action}
          kind="trail"
          meta={[
            { label: 'Step',     value: open.step != null ? String(open.step) : '·' },
            { label: 'Agent',    value: (AGENT_META[open.agent]?.name) || open.agent || 'System' },
            ...(open.data_touched ? [{ label: 'Data source', value: open.data_touched }] : []),
            ...(open.result      ? [{ label: 'Result',      value: open.result }] : []),
          ]}
          body={open.detail}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </>
  );
}

function TrailStep({ step, onClick }) {
  const agentMeta = step.agent && AGENT_META[step.agent] ? AGENT_META[step.agent] : null;
  const color = agentMeta?.color || 'var(--color-text-3)';
  const label = agentMeta?.name || step.agent || 'System';
  const clickable = !!onClick;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: 13, background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
        {step.step || '·'}
      </div>
      <button
        type="button"
        onClick={onClick || undefined}
        disabled={!clickable}
        style={{
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px',
          textAlign: 'left', width: '100%', cursor: clickable ? 'pointer' : 'default',
          fontFamily: 'inherit', transition: 'all 0.12s',
        }}
        onMouseEnter={e => { if (clickable) { e.currentTarget.style.borderColor = 'rgba(15,110,86,0.35)'; e.currentTarget.style.background = 'var(--color-surface)'; } }}
        onMouseLeave={e => { if (clickable) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface-2)'; } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
          {step.data_touched && (
            <span style={{ fontSize: 10, color: 'var(--color-text-3)', padding: '2px 6px', borderRadius: 10, background: 'rgba(0,0,0,0.04)', fontFamily: 'var(--font-mono, monospace)' }}>
              {step.data_touched}
            </span>
          )}
          {clickable && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: 'rgba(15,110,86,0.14)', color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: 'auto' }}>Explain</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5, marginBottom: step.result ? 4 : 0 }}>
          {step.action}
        </div>
        {step.result && (
          <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ color: '#0BBF7A' }}>→</span>
            <span>{step.result}</span>
          </div>
        )}
      </button>
    </div>
  );
}

function Section({ title, icon: Icon, color = 'var(--color-text-3)', help, children }) {
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

function SourceBadge({ source }) {
  if (!source) return null;
  const map = {
    demo:      { label: 'Curated trail', color: 'var(--color-text-3)' },
    generated: { label: 'Derived by Explainability Agent', color: '#7C3AED' },
    live:      { label: 'Live Explainability Agent trace', color: '#0BBF7A' },
  };
  const m = map[source];
  if (!m) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 10, background: m.color + '14', color: m.color, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', width: 'fit-content' }}>
      <Sparkles size={10} /> {m.label}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 14 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: '#F5B841', animation: `pulseDot 1.3s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Tracing agent signals…</div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div style={{ padding: 16, background: 'rgba(196,30,58,0.05)', border: '1px solid rgba(196,30,58,0.2)', borderRadius: 'var(--radius)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-red)', marginBottom: 4 }}>Explainability unavailable</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{message}</div>
    </div>
  );
}

function IdleState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 10, padding: 24, textAlign: 'center' }}>
      <Sparkles size={22} style={{ color: '#F5B841' }} />
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>Pick a finding on the left</div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', maxWidth: 320, lineHeight: 1.5 }}>
        Explainability will trace the agents that produced the finding, the signals that fired, the thresholds that were crossed, and how to verify it.
      </div>
    </div>
  );
}
