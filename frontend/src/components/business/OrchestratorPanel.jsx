import React from 'react';
import axios from 'axios';
import { Sparkles, AlertCircle, Loader2, Network } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { useAllFindings } from '../../hooks/useDomainData.js';
import { dedupedExposureBreakdown } from '../../utils/exposureDedup.js';
import { AGENT_META } from '../../data/agentMeta.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import InfoHint from './InfoHint.jsx';

// ─── CROSS-DOMAIN CORRELATION ────────────────────────────────────────────────
// The deterministic engine already surfaces a real cross-domain signal: the SAME
// entity (customer / account / loan) independently flagged by more than one
// detector. That corroboration is the strongest case for escalation, so it's
// shown here directly from engine output — no API key, no LLM required.
//
// An optional LLM pass (/api/orchestrate) can layer a narrative on top when an
// API key is configured; it is an enhancement, not a prerequisite. (Previously
// this panel ONLY ran the LLM and read an `orchestrator_signals` field the
// deterministic engine never emits, so it always read "0 signals from 0 agents".)
export default function OrchestratorPanel() {
  const { state, dispatch } = useApp();
  const { agentResults = {}, orchestratorLoading, orchestratorResult, apiKey, apiKeyStatus } = state;
  const allFindings = useAllFindings();

  const { overlaps, signals, agentSummaries, agentsWithSignals } = React.useMemo(() => {
    // Engine-derived correlations: entities flagged by >1 agent.
    const breakdown = dedupedExposureBreakdown(allFindings);
    const overlaps = breakdown.overlaps || [];
    // Signals ARE the findings (the engine emits findings, not a separate
    // orchestrator_signals field) — synthesise them so the optional LLM pass and
    // the header counts reflect real engine output rather than always reading 0.
    const signals = [];
    const agentSummaries = {};
    const withSignals = new Set();
    for (const [agentId, result] of Object.entries(agentResults)) {
      if (!result) continue;
      const fs = (result.key_findings || []).filter(f => f.severity === 'critical' || f.severity === 'high');
      for (const f of fs.slice(0, 8)) {
        signals.push({
          source_agent: agentId,
          severity: f.severity,
          entity_id: f.customer_id || f.account_id || f.loan_id || f.entity_id || null,
          finding: f.finding,
          exposure: f.affected_exposure_lkr,
        });
        withSignals.add(agentId);
      }
      agentSummaries[agentId] = summariseAgentResult(agentId, result);
    }
    return { overlaps, signals, agentSummaries, agentsWithSignals: [...withSignals] };
  }, [allFindings, agentResults]);

  const keyReady = apiKey && apiKeyStatus === 'valid';
  const canRun = keyReady && signals.length >= 2 && !orchestratorLoading;

  async function run() {
    if (!canRun) return;
    dispatch({ type: 'ORCHESTRATOR_LOADING' });
    try {
      const res = await axios.post('/api/orchestrate', { signals, agentSummaries }, {
        headers: { 'x-api-key': apiKey },
        timeout: 180000,
      });
      dispatch({ type: 'ORCHESTRATOR_SUCCESS', payload: res.data.result });
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      dispatch({ type: 'ORCHESTRATOR_ERROR', payload: msg });
    }
  }

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Network size={16} style={{ color: '#7C3AED' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Cross-domain correlation</span>
              <InfoHint
                title="Cross-domain correlation"
                text="A 'signal' is a critical or high finding emitted by one detector (capped at 8 per agent so no single agent dominates the count). Multi-agent corroboration means the SAME entity — customer, account, or loan — surfaced independently in more than one agent's signals. That convergence is computed by matching entity ids across agent outputs, not inferred by a model, and it is the strongest case for escalation."
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              {overlaps.length > 0
                ? `${overlaps.length} entit${overlaps.length === 1 ? 'y' : 'ies'} flagged by multiple agents · from ${signals.length} signal${signals.length === 1 ? '' : 's'} across ${agentsWithSignals.length} agent${agentsWithSignals.length === 1 ? '' : 's'}`
                : `${signals.length} signal${signals.length === 1 ? '' : 's'} across ${agentsWithSignals.length} agent${agentsWithSignals.length === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
        {keyReady ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={run}
            disabled={!canRun}
            title={signals.length < 2 ? 'Run at least 2 agents to layer an AI narrative' : 'Add an AI narrative over the engine correlations'}
            style={{ opacity: canRun ? 1 : 0.55, cursor: canRun ? 'pointer' : 'not-allowed' }}
          >
            {orchestratorLoading ? (<><Loader2 size={13} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} /> Analysing…</>) : (<><Sparkles size={13} style={{ marginRight: 6 }} /> Deepen with AI</>)}
          </button>
        ) : (
          <span style={{ fontSize: 10.5, color: 'var(--color-text-3)', maxWidth: 220, textAlign: 'right', lineHeight: 1.4 }}>
            AI narrative optional — add an API key in Settings to layer it over these engine correlations.
          </span>
        )}
      </div>

      {/* Engine-derived cross-agent correlations — always shown, no API key. */}
      {overlaps.length > 0 ? (
        <Section title={`Cross-agent entities (${overlaps.length})`}>
          {overlaps.slice(0, 6).map((o, i) => <CrossAgentCard key={o.entity || i} o={o} />)}
          <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', lineHeight: 1.45, marginTop: 2 }}>
            The same entity independently flagged by two or more detectors — the strongest cases for escalation because the signal is corroborated across domains.
          </div>
        </Section>
      ) : (
        <div style={{ padding: 10, background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
          No entity is currently flagged by more than one agent. Cross-domain correlations appear here once independent detectors converge on the same customer, account, or loan.
        </div>
      )}

      {state.orchestratorError && !orchestratorLoading && (
        <div style={{ padding: 10, background: 'var(--color-red-light)', borderRadius: 8, fontSize: 12, color: 'var(--color-red)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {state.orchestratorError}
        </div>
      )}

      {orchestratorResult && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={11} /> AI narrative layer
          </div>
          <OrchestratorResult result={orchestratorResult} />
        </>
      )}
    </div>
  );
}

// One corroborated entity: who flagged it, combined exposure, finding count.
function CrossAgentCard({ o }) {
  const agentCount = (o.agents || []).length;
  const color = agentCount >= 3 ? '#C41E3A' : '#B45309';
  return (
    <div style={{ padding: 10, border: `1px solid var(--color-border)`, borderLeft: `3px solid ${color}`, borderRadius: 6, background: 'var(--color-surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 6, background: color + '18', color, letterSpacing: '0.04em' }}>{agentCount} agents</span>
          <InfoHint
            align="left"
            size={11}
            title="Agents & combined exposure"
            text="How many distinct detectors independently flagged this entity (3+ turns the card red). The exposure shown is the LARGEST of those agents' figures for the entity — not the sum — because each agent is valuing the same underlying balance, so summing would double-count the same rupees."
          />
        </span>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 11.5, color: 'var(--color-text)' }}>{o.entity}</span>
        {o.exposure_lkr > 0 && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: 'var(--color-text)' }}>{formatLkr(o.exposure_lkr)}</span>}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 5 }}>
        {(o.agents || []).map(a => AGENT_META[a]?.name || a).join(' · ')}
        {o.findings_count ? ` · ${o.findings_count} findings` : ''}
      </div>
    </div>
  );
}

function OrchestratorResult({ result }) {
  const correlations = result.correlations || [];
  const systemic = result.systemic_patterns || [];
  const priority = result.priority_actions || [];
  const exec = result.executive_summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {exec && (
        <div style={{ padding: 12, background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 12, lineHeight: 1.6 }}>
          {typeof exec === 'string' ? exec : exec.headline || exec.summary || JSON.stringify(exec)}
        </div>
      )}

      {systemic.length > 0 && (
        <Section title={`Systemic patterns (${systemic.length})`}>
          {systemic.map((p, i) => (
            <Card key={i} severity={p.severity}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{p.pattern || p.title || p.description}</div>
              {p.description && p.description !== (p.pattern || p.title) && (
                <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 4 }}>{p.description}</div>
              )}
              {p.contributing_agents && (
                <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 6 }}>
                  Agents: {(Array.isArray(p.contributing_agents) ? p.contributing_agents : [p.contributing_agents]).join(', ')}
                </div>
              )}
            </Card>
          ))}
        </Section>
      )}

      {correlations.length > 0 && (
        <Section title={`Correlations (${correlations.length})`}>
          {correlations.slice(0, 10).map((c, i) => (
            <Card key={i} severity={c.severity || c.combined_severity}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{c.narrative || c.title || c.description}</div>
              {c.shared_entity_id && (
                <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 4 }}>Entity: {c.shared_entity_id}</div>
              )}
              {c.agents_involved && (
                <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 2 }}>
                  Agents: {(Array.isArray(c.agents_involved) ? c.agents_involved : [c.agents_involved]).join(', ')}
                </div>
              )}
            </Card>
          ))}
        </Section>
      )}

      {priority.length > 0 && (
        <Section title={`Priority actions (${priority.length})`}>
          {priority.slice(0, 10).map((a, i) => (
            <Card key={i}>
              <div style={{ fontSize: 12 }}>{a.action || a.description || a.title || JSON.stringify(a)}</div>
              {a.deadline && <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 4 }}>Deadline: {a.deadline}</div>}
            </Card>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function Card({ children, severity }) {
  const color =
    severity === 'critical' || severity >= 0.85 ? 'var(--color-red)' :
    severity === 'high' || severity >= 0.65 ? 'var(--color-amber, #B45309)' :
    'var(--color-border)';
  return (
    <div style={{ padding: 10, border: `1px solid ${color}`, borderLeft: `3px solid ${color}`, borderRadius: 6, background: 'var(--color-surface-2)' }}>
      {children}
    </div>
  );
}

// Extract a compact per-agent summary to feed into the orchestrator userMessage.
// Picks the first top-level summary object plus the first 3 key_findings so the
// request doesn't bloat when several agents have each generated large envelopes.
function summariseAgentResult(agentId, result) {
  const summaryKey = Object.keys(result).find(k => /summary$|_summary/i.test(k));
  return {
    agentId,
    summary: summaryKey ? result[summaryKey] : null,
    top_findings: (result.key_findings || []).slice(0, 3).map(f => ({
      finding: f.finding,
      severity: f.severity,
      entity_ids: f.entity_ids,
      exposure: f.affected_exposure_lkr || f.affected_balance_lkr,
    })),
  };
}
