import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DOMAINS, getDomain } from '../../data/domainRegistry.js';
import { AGENT_META } from '../../data/agentMeta.js';
import InfoHint from '../../components/business/InfoHint.jsx';
import { FlaskConical, Play, Filter, ChevronRight, Target, Layers, Clock } from 'lucide-react';

// ─── BUSINESS SCENARIO LAB ───────────────────────────────────────────────────
// Pre-scripted demo scenarios showing end-to-end cross-agent detection.
// Re-framed: scenarios tagged with primary domain impact. Filter by domain.

// Scenarios are structural walk-through scripts. Descriptions describe what the
// agents do — not specific numeric outcomes. The actual numbers appear at play
// time, derived from the findings the agents produce on the loaded data.
const SCENARIOS = [
  {
    id: 'insider-fraud-br14',
    scripted: true,
    title: 'Insider-enabled loan fraud — BR-14',
    subtitle: 'Credit officer initiates AND approves disbursements, bypasses SoD',
    primaryDomains: ['consumer', 'people', 'operations'],
    touchedDomains: ['consumer', 'people', 'operations', 'technology', 'audit'],
    agents: ['credit', 'controls', 'insider', 'accessRights', 'conduct'],
    severity: 'critical',
    description: 'Shows how Controls, Credit, Insider-Risk, Access-Rights and Conduct agents converge on the same branch and staff subject — each contributing an independent signal that combines into a high-severity case.',
    entities: ['BR-14', 'STF-1847'],
  },
  {
    id: 'phantom-receivable-sus017',
    scripted: true,
    title: 'Phantom receivable — SUS-017',
    subtitle: 'CEFT receivables account with rapid growth and near-zero clearing',
    primaryDomains: ['operations', 'compliance'],
    touchedDomains: ['operations', 'compliance', 'finance'],
    agents: ['suspense', 'transaction', 'digital'],
    severity: 'critical',
    description: 'Suspense agent runs growth × clearing analysis; Transaction agent traces CEFT velocity on the same account; Digital agent surfaces the coordinated access patterns backing it.',
    entities: ['SUS-017'],
  },
  {
    id: 'tbml-corp-0887',
    scripted: true,
    title: 'Trade-based money laundering — BNK-CORP-0887',
    subtitle: 'Over-invoicing with duplicate LCs and undisclosed connected group',
    primaryDomains: ['corporate', 'compliance'],
    touchedDomains: ['corporate', 'compliance', 'risk'],
    agents: ['trade', 'transaction', 'connectedParty', 'kyc'],
    severity: 'critical',
    description: 'Trade agent flags invoice deviation against customs medians; Connected-Party agent aggregates exposure across the obligor group; Transaction agent correlates CEFT structuring on the same entity.',
    entities: ['BNK-CORP-0887'],
  },
  {
    id: 'single-obligor-breach',
    scripted: true,
    title: 'Single-obligor limit breach',
    subtitle: 'Aggregate corporate exposure approaching CBSL limit',
    primaryDomains: ['corporate', 'risk'],
    touchedDomains: ['corporate', 'risk', 'finance'],
    agents: ['connectedParty', 'credit'],
    severity: 'critical',
    description: 'Connected-Party agent aggregates exposure per customer and surfaces those at or above the CBSL single-obligor threshold, cross-referenced with Credit agent stage findings.',
    entities: [],
  },
  {
    id: 'wealth-mis-selling',
    title: 'Wealth mis-selling by a relationship manager',
    subtitle: 'Conservative customers placed in high-risk products',
    primaryDomains: ['consumer'],
    touchedDomains: ['consumer', 'people'],
    agents: ['wealth', 'conduct'],
    severity: 'critical',
    description: 'Wealth-Suitability agent matches customer risk profiles against product risk ratings to detect gaps; Conduct agent cross-checks for prior cases against the same relationship manager.',
    entities: [],
  },
  {
    id: 'alm-gap-breach',
    title: 'ALM repricing gap breach',
    subtitle: 'Liability-sensitive mid-tenor bucket exceeds IRRBB limit',
    primaryDomains: ['treasury', 'risk'],
    touchedDomains: ['treasury', 'risk', 'finance'],
    agents: ['alm', 'capital'],
    severity: 'high',
    description: 'ALM agent computes bucket-level repricing gaps and sensitivity scenarios; Capital agent correlates with LCR/NSFR posture.',
    entities: [],
  },
  {
    id: 'vendor-concentration',
    title: 'Critical vendor concentration',
    subtitle: 'Core-banking vendor with stale assessment and no exit plan',
    primaryDomains: ['operations', 'technology'],
    touchedDomains: ['operations', 'technology', 'risk'],
    agents: ['thirdParty'],
    severity: 'critical',
    description: 'Third-Party Risk agent compounds concentration, assessment staleness, CBSL outsourcing-notification gap and absence of a documented exit plan into a single critical finding.',
    entities: [],
  },
];

export default function BusinessScenarioLab() {
  const navigate = useNavigate();
  const [domainFilter, setDomainFilter] = useState(null);

  const filtered = SCENARIOS.filter(s => !domainFilter || s.touchedDomains.includes(domainFilter));

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Header count={SCENARIOS.length} filteredCount={filtered.length} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={12} /> Filter
        </div>
        <select value={domainFilter || ''} onChange={e => setDomainFilter(e.target.value || null)} style={{ fontSize: 11.5, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', cursor: 'pointer' }}>
          <option value="">All domains</option>
          {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
        {filtered.map(s => (
          <ScenarioCard
            key={s.id}
            s={s}
            onRun={() => navigate(`/business-view/scenarios/${s.id}`)}
            onOpenDomain={() => navigate(`/business-view/${s.primaryDomains[0]}`)}
          />
        ))}
      </div>
    </div>
  );
}

function Header({ count, filteredCount }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
        <FlaskConical size={20} style={{ color: '#7C3AED' }} />
        Scenario Lab
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 980, lineHeight: 1.55 }}>
        End-to-end demonstration cases. Each scenario shows how multiple agents combine signals around one entity to produce compound severity.
        Scenarios are tagged by the business domains they impact. Showing {filteredCount} of {count} scenarios.
      </p>
    </div>
  );
}

function ScenarioCard({ s, onRun, onOpenDomain }) {
  const sevColor = s.severity === 'critical' ? '#C41E3A' : s.severity === 'high' ? '#B45309' : '#CA8A04';
  const multiDomain = s.touchedDomains.length >= 3;

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${sevColor}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 7px', borderRadius: 8, background: sevColor + '18', color: sevColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.severity}</span>
          {multiDomain && (
            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 7px', borderRadius: 8, background: 'rgba(124,58,237,0.14)', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Layers size={9} /> Multi-domain
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--color-text-3)', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}>
            {s.agents.length} agent{s.agents.length !== 1 ? 's' : ''}
            <InfoHint text="How many distinct detection agents take part in this walk-through. Compound severity comes from independent agents converging on the same entity, so a higher count means a stronger combined signal." size={10} align="left" />
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3 }}>{s.title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', marginTop: 4, lineHeight: 1.4 }}>{s.subtitle}</div>
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--color-text)', lineHeight: 1.5 }}>{s.description}</div>

      <div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 5, display: 'flex', alignItems: 'center' }}>
          Agents in play
          <InfoHint text="The detection agents that contribute a signal in this scenario. Each runs independently against its own data source; the case is built from where they overlap." size={10} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {s.agents.map(a => (
            <span key={a} style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8, background: (AGENT_META[a]?.color || '#999') + '18', color: AGENT_META[a]?.color || '#999' }}>
              {AGENT_META[a]?.name || a}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 5, display: 'flex', alignItems: 'center' }}>
          Domains affected
          <InfoHint text="The business domains this scenario touches, used to tag and filter it. A scenario spanning three or more domains is marked multi-domain." size={10} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {s.touchedDomains.map(d => (
            <span key={d} style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8, background: 'rgba(245,184,65,0.12)', color: '#B45309' }}>
              {getDomain(d)?.label || d}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {s.scripted ? (
          <button
            onClick={onRun}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #F5B841, #E09A1F)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Play size={11} /> Run walk-through
          </button>
        ) : (
          <span
            title="A step-by-step scripted walk-through for this scenario is being authored. Open the primary domain to see the live findings the agents produce on the loaded data."
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, background: 'var(--color-surface-2)', color: 'var(--color-text-3)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'default' }}
          >
            <Clock size={11} /> Walk-through in progress
          </span>
        )}
        <button
          onClick={onOpenDomain}
          style={{ padding: '7px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Open primary domain
        </button>
      </div>
    </div>
  );
}
