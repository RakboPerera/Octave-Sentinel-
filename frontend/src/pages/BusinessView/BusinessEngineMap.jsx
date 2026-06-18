import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { DOMAINS, getDomain } from '../../data/domainRegistry.js';
import { AGENT_META, REGULATORY, DETECTION_AGENT_IDS, AGENT_GROUPS, AGENT_OPS_META } from '../../data/agentMeta.js';
import { THRESHOLDS } from '../../data/thresholdRegistry.js';
import { describeDetector, describeArchitecture, thresholdEngineStatus } from '../../utils/detectionEngine.js';
import { useAllFindings } from '../../hooks/useDomainData.js';
import useExplainability from '../../hooks/useExplainability.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import ExplainabilityPanel from '../../components/business/ExplainabilityPanel.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import { Cpu, ChevronRight, Info, Database as DbIcon, Layers, Play, FlaskConical, Activity, Eye, Settings2, BookOpen, Scale, Sliders, Target, X } from 'lucide-react';

// ─── ENGINE MAP ──────────────────────────────────────────────────────────────
// "Under the hood" view for audit defensibility. Shows how the 17 detection
// agents feed the 11 domains. Two modes: Agent-to-Domain (pick an agent, see domains)
// and Domain-to-Agent (pick a domain, see agents).

export default function BusinessEngineMap() {
  const navigate = useNavigate();
  const findings = useAllFindings();
  const [mode, setMode] = useState('agents'); // 'agents' | 'domains'
  const [selectedAgent, setSelectedAgent] = useState('credit');
  const [selectedDomain, setSelectedDomain] = useState('consumer');

  // Build the bidirectional map once
  const { agentToDomains, domainToAgents } = useMemo(() => buildMaps(), []);

  // Findings per agent
  const findingsPerAgent = useMemo(() => {
    const m = {};
    for (const f of findings) m[f.agentId] = (m[f.agentId] || 0) + 1;
    return m;
  }, [findings]);

  // Detection agents only — balance is a helper to capital, compseed is a utility,
  // orchestrator/explainability are meta-agents. None of those are user-selectable
  // engines in their own right.
  const allAgents = DETECTION_AGENT_IDS;

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Header />

      <ArchitecturePanel navigate={navigate} />

      <ModeToggle mode={mode} setMode={setMode} />

      {mode === 'agents' ? (
        <AgentToDomainView
          agents={allAgents}
          selected={selectedAgent}
          onSelect={setSelectedAgent}
          agentToDomains={agentToDomains}
          findingsPerAgent={findingsPerAgent}
          navigate={navigate}
        />
      ) : (
        <DomainToAgentView
          selected={selectedDomain}
          onSelect={setSelectedDomain}
          domainToAgents={domainToAgents}
          findingsPerAgent={findingsPerAgent}
          navigate={navigate}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Cpu size={20} style={{ color: '#7C3AED' }} />
        Engine Map
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 980, lineHeight: 1.55 }}>
        Under the hood of the Business Platform — the detection engines (agents) and which business domains they feed.
        Audit-defensibility view: use this to explain to a regulator or auditor how Sentinel arrived at its findings.
      </p>
    </div>
  );
}

// How Sentinel detects — the compute-first → AI-narrate architecture, with LIVE
// coverage numbers derived from the engine (describeArchitecture), so this can
// never claim a stale count or a method the engine doesn't run.
function ArchitecturePanel({ navigate }) {
  const arch = describeArchitecture();
  const methods = Object.entries(arch.methodBreakdown);
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 18, background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(11,191,122,0.04))' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>How Sentinel detects</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12, background: 'rgba(11,191,122,0.13)', color: '#0BBF7A' }}>{arch.detectorCount} deterministic detectors</span>
          {methods.map(([label, n]) => <span key={label} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 12, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>{n} {label.toLowerCase()}</span>)}
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.55, margin: '0 0 12px', maxWidth: 980 }}>
        Findings are <strong>computed, not generated</strong>. A deterministic rule engine scores 100% of the source population in code using the thresholds you set in Rule Parameters; the AI writes the plain-English explanation on top but never decides whether a finding exists. That makes every finding reproducible and grounded in source rows.
      </p>
      {/* Honest positioning — scope & the three lines of defence (Fix #5). */}
      <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.55, margin: '0 0 14px', maxWidth: 980, padding: '10px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
        <strong>Where this sits.</strong> Sentinel is a <strong>third-line (internal audit) assurance</strong> tool — it independently re-performs {arch.detectorCount} high-value automated tests over the bank's own data. It does <em>not</em> replace first-line controls or second-line (risk/compliance) monitoring, and these detectors are a targeted test set, <em>not</em> the whole audit universe (IT general controls, model risk, cyber, governance, branch operations and others remain manual scopes). Treat the output as evidence to direct audit effort, not a sign-off.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginBottom: 12 }}>
        {arch.pipeline.map((s, i) => (
          <div key={s.step} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', marginBottom: 3 }}>{i + 1}. {s.step}</div>
            <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', lineHeight: 1.45 }}>{s.detail}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {arch.properties.map(p => <span key={p} style={{ fontSize: 10.5, color: 'var(--color-text-3)' }}>✓ {p.split(' — ')[0]}</span>)}
        </div>
        <button onClick={() => navigate('/business-view/detection-assurance')} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8, background: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Activity size={12} /> Detection Assurance (accuracy &amp; precision)
        </button>
      </div>
    </div>
  );
}

function ModeToggle({ mode, setMode }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--color-surface-2)', borderRadius: 16, padding: 3, border: '1px solid var(--color-border)', width: 'fit-content' }}>
      {[{ id: 'agents', label: 'Agent → Domains' }, { id: 'domains', label: 'Domain → Agents' }].map(m => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          style={{ padding: '5px 14px', borderRadius: 13, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: mode === m.id ? 'white' : 'transparent', color: mode === m.id ? '#7C3AED' : 'var(--color-text-2)', border: 'none' }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function AgentToDomainView({ agents, selected, onSelect, agentToDomains, findingsPerAgent, navigate }) {
  const findings = useAllFindings();
  const meta = AGENT_META[selected] || {};
  const thresholdBlock = THRESHOLDS[selected];
  const regulatory = REGULATORY[selected];
  const feedsDomains = agentToDomains[selected] || [];
  const [tab, setTab] = useState('overview');

  const agentFindings = useMemo(() => findings.filter(f => f.agentId === selected), [findings, selected]);
  const workedExample = useMemo(() => {
    if (agentFindings.length === 0) return null;
    const sevOrder = { critical: 0, high: 1, medium: 2 };
    return [...agentFindings].sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9))[0];
  }, [agentFindings]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 14 }}>
      {/* Agent list */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 10, maxHeight: 780, overflowY: 'auto' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', padding: '4px 8px 8px' }}>
          {agents.length} agents
        </div>
        {agents.map(a => {
          const m = AGENT_META[a] || {};
          const count = findingsPerAgent[a] || 0;
          const active = selected === a;
          const groupInfo = m.group ? AGENT_GROUPS[m.group] : null;
          return (
            <button
              key={a}
              onClick={() => { onSelect(a); setTab('overview'); }}
              title={groupInfo ? `Part of ${groupInfo.label} group` : undefined}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                border: `1px solid ${active ? 'rgba(124,58,237,0.3)' : 'transparent'}`,
                textAlign: 'left', marginBottom: 3,
                position: 'relative',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 4, background: m.color || '#999', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? '#7C3AED' : 'var(--color-text-2)', flex: 1 }}>{m.name || a}</span>
              {groupInfo && (
                <span style={{ fontSize: 8.5, fontWeight: 800, padding: '1px 5px', borderRadius: 6, background: 'rgba(58,90,58,0.15)', color: '#3A5A3A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group</span>
              )}
              {count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: active ? 'rgba(124,58,237,0.2)' : 'var(--color-surface-2)', color: active ? '#7C3AED' : 'var(--color-text-3)' }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Agent detail — tabbed */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        {meta.group && AGENT_GROUPS[meta.group] && (
          <div style={{ background: 'rgba(58,90,58,0.08)', border: '1px solid rgba(58,90,58,0.22)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ width: 24, height: 24, borderRadius: 6, background: AGENT_GROUPS[meta.group].color + '20', color: AGENT_GROUPS[meta.group].color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>
              {AGENT_GROUPS[meta.group].icon}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: AGENT_GROUPS[meta.group].color, marginBottom: 3 }}>
                Grouped with: {AGENT_GROUPS[meta.group].memberIds.filter(id => id !== selected).map(id => AGENT_META[id]?.name || id).join(' · ')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{AGENT_GROUPS[meta.group].summary}</div>
            </div>
          </div>
        )}
        {/* Agent header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 42, height: 42, borderRadius: 10, background: (meta.color || '#7C3AED') + '18', color: meta.color || '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>
            {meta.icon || '◈'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{meta.name || selected}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Detection Engine</div>
          </div>
          {agentFindings.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 10, background: 'rgba(196,30,58,0.12)', color: '#C41E3A' }}>
              {agentFindings.length} active finding{agentFindings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Sub-tab bar */}
        <AgentSubTabs
          tab={tab}
          setTab={setTab}
          counts={{
            domains: feedsDomains.length,
            rules: thresholdBlock?.rules?.length || 0,
            findings: agentFindings.length,
          }}
        />

        <div style={{ marginTop: 16 }}>
          {tab === 'overview' && (
            <AgentOverviewTab
              meta={meta}
              regulatory={regulatory}
              feedsDomains={feedsDomains}
              navigate={navigate}
              selectedAgentId={selected}
              agentFindings={agentFindings}
              allFindings={findings}
            />
          )}
          {tab === 'how' && (
            <AgentHowItWorksTab meta={meta} workedExample={workedExample} agentId={selected} />
          )}
          {tab === 'rules' && (
            <AgentRulesTab thresholdBlock={thresholdBlock} navigate={navigate} selectedAgentId={selected} />
          )}
          {tab === 'findings' && (
            <AgentFindingsTab findings={agentFindings} />
          )}
        </div>
      </div>
    </div>
  );
}

function AgentSubTabs({ tab, setTab, counts }) {
  const tabs = [
    { id: 'overview', label: 'Overview',           icon: BookOpen },
    { id: 'how',      label: 'How it works',       icon: FlaskConical },
    { id: 'rules',    label: `Rules & thresholds${counts.rules ? ` · ${counts.rules}` : ''}`, icon: Sliders },
    { id: 'findings', label: `Findings${counts.findings ? ` · ${counts.findings}` : ''}`,      icon: Activity },
  ];
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--color-border)' }}>
      {tabs.map(t => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: active ? 800 : 600,
              color: active ? '#7C3AED' : 'var(--color-text-2)',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${active ? '#7C3AED' : 'transparent'}`,
              marginBottom: -1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <Icon size={13} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function AgentOverviewTab({ meta, regulatory, feedsDomains, navigate, selectedAgentId, agentFindings = [], allFindings = [] }) {
  // Surface helper agents that feed into this agent. Currently only `balance`
  // helper-feeds `capital` — keep this driven by AGENT_META.helperTo so adding
  // more helpers in future doesn't require touching this component.
  const helpers = Object.entries(AGENT_META).filter(([, m]) => m.helperTo === selectedAgentId);

  // ── Detection stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const sev = { critical: 0, high: 0, medium: 0 };
    const entities = new Set();
    let scoreSum = 0, scoreCount = 0;
    for (const f of agentFindings) {
      const s = (f.severity || 'medium').toLowerCase();
      if (sev[s] != null) sev[s]++;
      for (const e of (f.finding?.entity_ids || [])) entities.add(e);
      const score = Number(f.finding?.anomaly_score);
      if (Number.isFinite(score)) { scoreSum += score; scoreCount++; }
    }
    return {
      total: agentFindings.length,
      critical: sev.critical,
      high: sev.high,
      medium: sev.medium,
      entitiesTouched: entities.size,
      avgScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    };
  }, [agentFindings]);

  // ── Cross-agent dependency graph ────────────────────────────────────────
  const signalsOut = useMemo(() => {
    const counts = new Map();
    for (const f of agentFindings) {
      for (const sig of (f.finding?.orchestrator_signals || [])) {
        if (sig.target_agent && sig.target_agent !== selectedAgentId) {
          counts.set(sig.target_agent, (counts.get(sig.target_agent) || 0) + 1);
        }
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [agentFindings, selectedAgentId]);

  const signalsIn = useMemo(() => {
    const counts = new Map();
    for (const f of allFindings) {
      if (f.agentId === selectedAgentId) continue;
      for (const sig of (f.finding?.orchestrator_signals || [])) {
        if (sig.target_agent === selectedAgentId) {
          counts.set(f.agentId, (counts.get(f.agentId) || 0) + 1);
        }
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [allFindings, selectedAgentId]);

  return (
    <div>
      {/* What this agent solves — business framing, above methodology */}
      {meta.solves && (
        <div style={{ background: 'linear-gradient(135deg, rgba(245,184,65,0.06), rgba(24,95,165,0.04))', border: '1px solid rgba(245,184,65,0.25)', borderLeft: `3px solid ${meta.color || '#F5B841'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Target size={13} style={{ color: '#B45309' }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B45309' }}>
              What this agent solves
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6 }}>{meta.solves}</div>
        </div>
      )}

      {/* Detection stats strip */}
      {stats.total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
          <StatBox label="Active findings" value={stats.total} color="var(--color-text)" help="How many findings this agent is currently raising on the loaded dataset. Each is produced by a deterministic rule crossing a threshold over 100% of the source rows — not a sample." />
          <StatBox label="Critical"   value={stats.critical} color="#C41E3A" help="Of this agent's findings, how many are critical severity. The band is fixed by the rule that fired, so it is reproducible and not a judgement call." />
          <StatBox label="High"       value={stats.high}     color="#B45309" help="Of this agent's findings, how many are high severity — rule-assigned, one tier below critical." />
          <StatBox label="Entities touched" value={stats.entitiesTouched} color="var(--color-text-2)" help="Distinct entities (customers, accounts, journals, etc.) named across this agent's findings, de-duplicated. Shows the breadth of the population the agent flagged, not just the finding count." />
          {stats.avgScore != null && (
            <StatBox label="Avg anomaly score" value={stats.avgScore.toFixed(2)} color="#7C3AED" help="Average of the per-finding severity scores — a transparent composite the rule engine computes from how far each case breaches its threshold, normalised 0–1. It is a deterministic ranking aid, not an opaque machine-learning output." />
          )}
        </div>
      )}

      {/* Severity distribution mini-chart */}
      {stats.total > 0 && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <SectionTitle label="Severity distribution" />
            <InfoHint
              title="Severity distribution"
              text="Each bar is the count of this agent's findings at that severity; bar length is scaled to the largest band so the mix is read at a glance. Severity is assigned deterministically by the rule that fired — the chart just tallies those rule outcomes."
              size={11}
              align="left"
            />
          </span>
          <SeverityBars critical={stats.critical} high={stats.high} medium={stats.medium} />
        </div>
      )}

      {/* Cross-agent dependency graph */}
      {(signalsOut.length > 0 || signalsIn.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <SectionTitle label="Cross-agent dependencies (from orchestrator signals)" />
            <InfoHint
              title="Cross-agent dependencies"
              text="When one agent's finding implies another should look harder, it emits an orchestrator signal. The left column counts signals this agent sends out to other agents; the right counts signals it receives. Each tag shows the other agent and the number of signals — these are explicit, rule-emitted links, not inferred correlations."
              size={11}
              align="left"
            />
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <DepsColumn label="Sends signals to" items={signalsOut} direction="out" />
            <DepsColumn label="Receives signals from" items={signalsIn} direction="in" />
          </div>
        </div>
      )}

      {meta.methodology && (
        <>
          <SectionTitle label="How it detects" />
          <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 16 }}>{meta.methodology}</div>
        </>
      )}

      {regulatory && (
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderLeft: '3px solid #185FA5', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Scale size={13} style={{ color: '#185FA5' }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#185FA5' }}>
              {regulatory.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.55 }}>{regulatory.body}</div>
        </div>
      )}

      <SectionTitle label={`Feeds ${feedsDomains.length} business domain${feedsDomains.length !== 1 ? 's' : ''}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        {feedsDomains.map(({ domainId, tier }) => {
          const d = getDomain(domainId);
          return (
            <button
              key={domainId}
              onClick={() => navigate(`/business-view/${domainId}`)}
              style={{ padding: '10px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${tier === 'primary' ? '#C41E3A' : '#CA8A04'}`, borderRadius: 7, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--color-text)' }}>{d?.label}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: tier === 'primary' ? '#C41E3A' : '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                {tier}
              </div>
            </button>
          );
        })}
      </div>

      {helpers.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionTitle label={`Helper sub-routines (${helpers.length})`} />
          <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.55, marginBottom: 10 }}>
            These are support agents whose output is rendered as a section inside this agent's deliverables — not independently listed as agents.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {helpers.map(([id, m]) => (
              <div key={id} style={{ padding: '10px 12px', background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)', borderLeft: `3px solid ${m.color}`, borderRadius: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: m.color }} />
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--color-text)' }}>{m.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: 'rgba(14,165,233,0.14)', color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Helper</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{m.methodology}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentHowItWorksTab({ meta, workedExample, agentId }) {
  const desc = describeDetector(agentId);
  return (
    <div>
      {desc ? (
        // Engine-derived (truthful, auto-updating): method, inputs, rules with
        // LIVE threshold values, and the explicit compute-vs-narrate boundary.
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 6, background: 'rgba(11,191,122,0.13)', color: '#0BBF7A' }}>{desc.methodLabel}</span>
            {desc.crossAgent && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>uses: {desc.crossAgent.join(', ')}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 12 }}>{desc.summary}</div>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 5 }}>Inputs it reads</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
            {desc.inputs.map(c => <span key={c} style={{ fontSize: 10.5, fontFamily: 'var(--font-mono, monospace)', padding: '2px 7px', borderRadius: 5, background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>{c}</span>)}
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 5 }}>Rules it applies (live thresholds)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {desc.rules.map((r, i) => (
              <div key={i} style={{ fontSize: 11.5, color: 'var(--color-text)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                <span style={{ color: '#0BBF7A', flexShrink: 0 }}>▸</span>
                <span>{r.when}{r.thresholds.length > 0 && <span style={{ color: 'var(--color-text-3)' }}> — {r.thresholds.map(t => `${t.key}=${t.value ?? '—'}`).join(', ')}</span>}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', lineHeight: 1.5, padding: '8px 10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
            <strong>Reproducible &amp; grounded:</strong> runs over 100% of the population in code; same data → identical result. Every finding cites its source row + the rule that fired.{desc.narrate && ' The AI writes the explanation on top — it never decides whether a finding exists or its severity.'}
          </div>
        </div>
      ) : meta.methodology && (
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>
            Methodology <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>· meta-agent (operates on other agents’ findings)</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6 }}>{meta.methodology}</div>
        </div>
      )}

      {workedExample ? (
        <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(245,184,65,0.04))', border: '1px solid rgba(124,58,237,0.22)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <FlaskConical size={14} style={{ color: '#7C3AED' }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C3AED' }}>
              Worked example · {(workedExample.severity || 'medium')}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, lineHeight: 1.5 }}>
            {truncate(workedExample.finding?.finding || workedExample.finding?.explanation || '', 240)}
          </div>
          <WorkedExampleExplain item={workedExample} />
        </div>
      ) : (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>
          No worked example available — this agent has not produced any findings on the current dataset.
        </div>
      )}
    </div>
  );
}

// Per-threshold honesty badge: is this knob actually wired into the live engine,
// or is it a non-detection setting (notification policy, SLA, legacy)? Derived
// from the same source as the coverage guardrail (thresholdEngineStatus) so the
// label can never drift from what the engine really consults.
const ENGINE_STATUS_BADGE = {
  engine:        { label: 'Live in engine',        color: '#0BBF7A', bg: 'rgba(11,191,122,0.13)', help: 'Drives live detection — editing it changes what the engine flags on real data.' },
  notification:  { label: 'Notification policy',   color: '#185FA5', bg: 'rgba(24,95,165,0.10)',  help: 'A regulatory notification/reporting trigger, not a detection rule.' },
  sla:           { label: 'Action SLA',            color: '#185FA5', bg: 'rgba(24,95,165,0.10)',  help: 'An action deadline used by escalation/SLA tracking, not detection.' },
  informational: { label: 'Informational',         color: '#6B7280', bg: 'rgba(107,114,128,0.12)', help: 'The input arrives pre-aggregated; this value is contextual and does not change detection.' },
  'needs-input': { label: 'Needs data column',     color: '#B45309', bg: 'rgba(245,184,65,0.15)', help: 'Computable once the data feed carries the required column. Not active in detection yet.' },
  meta:          { label: 'Feedback-loop setting', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', help: 'Tunes the feedback-loop meta-agent, not a detection threshold.' },
  retired:       { label: 'Legacy (inactive)',     color: '#6B7280', bg: 'rgba(107,114,128,0.12)', help: 'An LLM-era knob the deterministic engine replaced. It no longer affects detection.' },
};
function EngineStatusBadge({ ruleId }) {
  const parts = String(ruleId || '').split('.');
  const agentId = parts[0], key = parts.slice(1).join('.');
  if (!agentId || !key) return null;
  let status; try { status = thresholdEngineStatus(agentId, key); } catch { status = null; }
  const cfg = ENGINE_STATUS_BADGE[status];
  if (!cfg) return null;
  return (
    <span title={cfg.help} style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 7, background: cfg.bg, color: cfg.color, letterSpacing: '0.02em', cursor: 'help', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function AgentRulesTab({ thresholdBlock, navigate }) {
  if (!thresholdBlock?.rules?.length) {
    return (
      <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>
        No tunable thresholds registered for this agent.
      </div>
    );
  }

  // Group by regulatory basis
  const groups = {};
  for (const r of thresholdBlock.rules) {
    const key = r.regulatory || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.5, maxWidth: 640 }}>
          Thresholds tagged <strong style={{ color: '#0BBF7A' }}>Live in engine</strong> govern what this agent flags — their values are read live from the registry, so editing them in Rule Parameters immediately reflows every finding. Other tags (notification policy, action SLA, legacy) are configurable but do <strong>not</strong> change detection; their role is shown on each row.
        </div>
        <button
          onClick={() => navigate('/business-view/rule-parameters')}
          style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 8, background: 'linear-gradient(135deg, #F5B841, #E09A1F)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Settings2 size={12} /> Edit in Rule Parameters
        </button>
      </div>

      {Object.entries(groups).map(([group, rules]) => (
        <div key={group} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#185FA5', marginBottom: 6 }}>
            {group}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rules.map(r => <ThresholdRow key={r.id} rule={r} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ThresholdRow({ rule }) {
  const { min, max } = rule.bounds || {};
  const pct = Number.isFinite(min) && Number.isFinite(max) && max > min
    ? Math.max(0, Math.min(100, ((rule.default - min) / (max - min)) * 100))
    : null;
  const valueLabel = rule.type === 'lkr'
    ? formatLkr(rule.default)
    : rule.type === 'percentage'
      ? `${rule.default}%`
      : rule.type === 'days'
        ? `${rule.default} d`
        : String(rule.default);

  return (
    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 7, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {rule.label}<EngineStatusBadge ruleId={rule.id} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#7C3AED', fontFamily: 'var(--font-display)' }}>{valueLabel}</div>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 3, lineHeight: 1.4 }}>{rule.description}</div>
      {pct != null && (
        <div style={{ marginTop: 8 }}>
          <div style={{ position: 'relative', height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'visible' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: '#7C3AED', borderRadius: 2 }} />
            <div style={{ position: 'absolute', left: `calc(${pct}% - 4px)`, top: -3, width: 10, height: 10, borderRadius: 5, background: '#7C3AED', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9.5, color: 'var(--color-text-3)', fontFamily: 'var(--font-display)' }}>
            <span>{typeof min === 'number' ? min : '—'}</span>
            <span>{typeof max === 'number' ? max : '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentFindingsTab({ findings }) {
  if (findings.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>
        This agent is not producing any findings on the current dataset.
      </div>
    );
  }
  return (
    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', maxHeight: 560, overflowY: 'auto' }}>
      {findings.map((f, i) => {
        const sev = (f.severity || 'medium').toLowerCase();
        const sevColor = sev === 'critical' ? '#C41E3A' : sev === 'high' ? '#B45309' : '#CA8A04';
        const exp = f.finding?.affected_exposure_lkr || f.finding?.affected_balance_lkr || 0;
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto 100px', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--color-border)', alignItems: 'center', fontSize: 11.5 }}>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: sevColor + '18', color: sevColor, textTransform: 'uppercase', width: 'fit-content', letterSpacing: '0.04em' }}>{sev}</span>
            <span style={{ color: 'var(--color-text)', lineHeight: 1.45 }}>
              {truncate(f.finding?.finding || f.finding?.explanation || '', 120)}
            </span>
            <span style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {(f.domainTags || []).slice(0, 2).map(d => (
                <span key={d} style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: 'rgba(245,184,65,0.1)', color: '#B45309' }}>{getDomain(d)?.label.split(' ')[0] || d}</span>
              ))}
            </span>
            <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: exp > 0 ? 'var(--color-text)' : 'var(--color-text-3)' }}>
              {exp > 0 ? formatLkr(exp) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Compact explainability slot for the worked-example card
function WorkedExampleExplain({ item }) {
  const [expanded, setExpanded] = useState(false);
  const { data, source } = useExplainability(item.agentId, item.findingIndex, item.finding);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 10, background: 'rgba(124,58,237,0.14)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Eye size={10} /> See how the agent traced this
      </button>
    );
  }

  return (
    <div style={{ marginTop: 4, background: 'white', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14, maxHeight: 440, overflowY: 'auto' }}>
      <ExplainabilityPanel data={data} source={source} loading={false} error={null} finding={item.finding} agentId={item.agentId} />
      <button
        onClick={() => setExpanded(false)}
        style={{ marginTop: 10, fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 10, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
      >
        Collapse
      </button>
    </div>
  );
}

function truncate(s, n) { if (!s) return ''; return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; }

function DomainToAgentView({ selected, onSelect, domainToAgents, findingsPerAgent, navigate }) {
  const d = getDomain(selected);
  const primary = d?.agentsPrimary || [];
  const secondary = d?.agentsSecondary || [];
  const [openAgentId, setOpenAgentId] = useState(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14 }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 10, maxHeight: 600, overflowY: 'auto' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', padding: '4px 8px 8px' }}>
          {DOMAINS.length} domains
        </div>
        {DOMAINS.map(dom => {
          const active = selected === dom.id;
          return (
            <button
              key={dom.id}
              onClick={() => onSelect(dom.id)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 7, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                border: `1px solid ${active ? 'rgba(124,58,237,0.3)' : 'transparent'}`,
                textAlign: 'left', marginBottom: 3,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? '#7C3AED' : 'var(--color-text-2)' }}>{dom.label}</span>
              <span style={{ fontSize: 9.5, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dom.ownerRole}</span>
            </button>
          );
        })}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B45309' }}>{d.ownerRole}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{d.label}</div>
          <p style={{ fontSize: 12, color: 'var(--color-text-2)', margin: '6px 0 0', lineHeight: 1.5 }}>{d.pitch}</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: '8px 0 0', fontStyle: 'italic' }}>
            Click any agent card below for a quick-look at role, methodology, regulatory context, and current findings.
          </p>
        </div>

        <SectionTitle label={`Primary agents (${primary.length})`} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 }}>
          {primary.map(a => <AgentMiniCard key={a} agentId={a} findingCount={findingsPerAgent[a] || 0} onClick={() => setOpenAgentId(a)} />)}
        </div>

        {secondary.length > 0 && (
          <>
            <SectionTitle label={`Secondary agents (${secondary.length})`} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 14 }}>
              {secondary.map(a => <AgentMiniCard key={a} agentId={a} findingCount={findingsPerAgent[a] || 0} onClick={() => setOpenAgentId(a)} compact />)}
            </div>
          </>
        )}

        <button
          onClick={() => navigate(`/business-view/${selected}`)}
          style={{ marginTop: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #F5B841, #E09A1F)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Open {d.label} deep-dive <ChevronRight size={12} />
        </button>
      </div>

      {openAgentId && (
        <AgentQuickLook agentId={openAgentId} onClose={() => setOpenAgentId(null)} onOpenInMap={() => { onSelect(selected); setOpenAgentId(null); /* stays in domain mode but caller can toggle mode */ }} />
      )}
    </div>
  );
}

function AgentMiniCard({ agentId, findingCount, compact, onClick }) {
  const meta = AGENT_META[agentId] || {};
  return (
    <button
      onClick={onClick}
      style={{
        padding: compact ? '7px 9px' : '9px 11px',
        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 7,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left', width: '100%', transition: 'all 0.12s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'; e.currentTarget.style.background = 'var(--color-surface)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface-2)'; } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: meta.color || '#999' }} />
        <span style={{ fontSize: compact ? 11 : 12, fontWeight: 800, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.name || agentId}</span>
        {findingCount > 0 && (
          <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: 'rgba(196,30,58,0.12)', color: '#C41E3A' }}>{findingCount}</span>
        )}
      </div>
      {!compact && (meta.solves || meta.methodology) && (
        <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {(meta.solves || meta.methodology).slice(0, 120)}…
        </div>
      )}
    </button>
  );
}

function AgentQuickLook({ agentId, onClose, onOpenInMap }) {
  const meta = AGENT_META[agentId] || {};
  const regulatory = REGULATORY[agentId];
  const thresholdBlock = THRESHOLDS[agentId];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,30,0.45)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-bg, #F7F6F1)', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.3)', padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-bg, #F7F6F1)', position: 'sticky', top: 0, zIndex: 1 }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: (meta.color || '#7C3AED') + '18', color: meta.color || '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
            {meta.icon || '◈'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{meta.name || agentId}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{meta.role === 'detection' ? 'Detection agent' : meta.role === 'helper' ? `Helper (feeds ${AGENT_META[meta.helperTo]?.name || meta.helperTo})` : 'Agent'}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {meta.solves && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B45309', marginBottom: 6 }}>What this agent solves</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.55 }}>{meta.solves}</div>
            </div>
          )}

          {meta.methodology && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>How it detects</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.55 }}>{meta.methodology}</div>
            </div>
          )}

          {regulatory && (
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderLeft: '3px solid #185FA5', borderRadius: 6, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Scale size={12} style={{ color: '#185FA5' }} />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#185FA5' }}>{regulatory.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text)', lineHeight: 1.55 }}>{regulatory.body}</div>
            </div>
          )}

          {AGENT_OPS_META[selectedAgentId] && (
            <div style={{ padding: 12, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>Agent ops metadata (Wave 4)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                <OpsField label="Version" value={AGENT_OPS_META[selectedAgentId].version} mono />
                <OpsField label="Deployed" value={AGENT_OPS_META[selectedAgentId].deployed_at} mono />
                <OpsField label="Control owner" value={AGENT_OPS_META[selectedAgentId].owner_role} />
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 4 }}>Depends on</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(AGENT_OPS_META[selectedAgentId].depends_on || []).map(d => (
                    <span key={d} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-mono, monospace)' }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {thresholdBlock?.rules?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>Tunable thresholds ({thresholdBlock.rules.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {/* Wave 4: show ALL rules, not a truncated 6 — CAE needs the full threshold landscape to audit the detection regime. */}
                {thresholdBlock.rules.map(r => (
                  <span key={r.id} title={r.description} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', fontWeight: 700 }}>
                    {r.label}: <span style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{r.default}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function OpsField({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginTop: 2, fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}

function StatBox({ label, value, color, help }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</span>
        {help && <InfoHint title={label} text={help} size={11} align="left" />}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'var(--font-display)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function SeverityBars({ critical = 0, high = 0, medium = 0 }) {
  const total = critical + high + medium;
  if (total === 0) return null;
  const bars = [
    { label: 'Critical', count: critical, color: '#C41E3A' },
    { label: 'High',     count: high,     color: '#B45309' },
    { label: 'Medium',   count: medium,   color: '#CA8A04' },
  ];
  const maxCount = Math.max(1, ...bars.map(b => b.count));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {bars.map(b => (
        <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', alignItems: 'center', gap: 10, fontSize: 11.5 }}>
          <span style={{ fontWeight: 700, color: b.color }}>{b.label}</span>
          <div style={{ height: 10, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((b.count / maxCount) * 100)}%`, height: '100%', background: b.color, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-text)', textAlign: 'right' }}>{b.count}</span>
        </div>
      ))}
    </div>
  );
}

function DepsColumn({ label, items, direction }) {
  const arrow = direction === 'out' ? '→' : '←';
  return (
    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>{label}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontStyle: 'italic' }}>— none —</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {items.map(([agentId, count]) => {
            const m = AGENT_META[agentId] || { name: agentId, color: '#999' };
            return (
              <span key={agentId} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: m.color + '14', color: m.color, border: `1px solid ${m.color}40`, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ opacity: 0.6 }}>{arrow}</span>
                {m.name}
                <span style={{ opacity: 0.75, fontFamily: 'var(--font-display)', fontWeight: 800 }}>·{count}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ label }) {
  return <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 8 }}>{label}</div>;
}

function buildMaps() {
  const agentToDomains = {};
  const domainToAgents = {};
  for (const d of DOMAINS) {
    domainToAgents[d.id] = {
      primary: d.agentsPrimary || [],
      secondary: d.agentsSecondary || [],
    };
    for (const a of d.agentsPrimary || []) {
      if (!agentToDomains[a]) agentToDomains[a] = [];
      agentToDomains[a].push({ domainId: d.id, tier: 'primary' });
    }
    for (const a of d.agentsSecondary || []) {
      if (!agentToDomains[a]) agentToDomains[a] = [];
      agentToDomains[a].push({ domainId: d.id, tier: 'secondary' });
    }
  }
  return { agentToDomains, domainToAgents };
}
