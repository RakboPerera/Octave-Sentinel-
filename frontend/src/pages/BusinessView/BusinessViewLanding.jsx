import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DOMAINS, getDomainsByGroup, GROUP_LABELS } from '../../data/domainRegistry.js';
import { useAllFindings, useBankScale } from '../../hooks/useDomainData.js';
import { useApp } from '../../context/AppContext.jsx';
import { computeDomainSnapshot, formatLkr } from '../../utils/domainAggregations.js';
// Landing and Deep-Dive consume the SAME computeDomainSnapshot function so
// both surfaces render identical numbers.
import { Briefcase, Building2, Landmark, Coins, ShieldAlert, ClipboardCheck, Settings2, Server, Users, ChevronRight, Sparkles } from 'lucide-react';
import InfoHint from '../../components/business/InfoHint.jsx';
import AsOfStamp from '../../components/business/AsOfStamp.jsx';

const DOMAIN_ICONS = {
  consumer: Briefcase, commercial: Building2, corporate: Landmark, treasury: Coins,
  risk: ShieldAlert, compliance: ClipboardCheck, finance: Coins, operations: Settings2,
  technology: Server, audit: ClipboardCheck, people: Users,
};

export default function BusinessViewLanding() {
  const navigate = useNavigate();
  const allFindings = useAllFindings();
  const { state } = useApp();
  const auditPlan = state.auditPlan;
  const frontOffice = getDomainsByGroup('front-office');
  const control = getDomainsByGroup('control-support');
  const bankScale = useBankScale();

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <HeaderSection />
      <BankRibbon scale={bankScale} />
      <GroupSection
        title={GROUP_LABELS['front-office']}
        domains={frontOffice}
        allFindings={allFindings}
        auditPlan={auditPlan}
        onOpen={(id) => navigate(`/business-view/${id}`)}
      />
      <GroupSection
        title={GROUP_LABELS['control-support']}
        domains={control}
        allFindings={allFindings}
        auditPlan={auditPlan}
        onOpen={(id) => navigate(`/business-view/${id}`)}
      />
      <FooterNote />
    </div>
  );
}

function HeaderSection() {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 12 }}>
        Business Platform
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 10px', borderRadius: 10, background: 'rgba(245,184,65,0.12)', color: '#B45309', border: '1px solid rgba(245,184,65,0.25)' }}>
          Domain-first view
        </span>
      </h2>
      <p style={{ fontSize: 13.5, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 980, lineHeight: 1.55 }}>
        Audit intelligence re-organised around the Bank's business structure. Pick a domain to see what the agents are watching for that domain,
        which findings apply today, and how cross-agent signals correlate. Every insight is clickable — the
        <Sparkles size={11} style={{ display: 'inline', margin: '0 2px -1px', color: '#F5B841' }} />
        <strong style={{ color: '#B45309', fontWeight: 700 }}> Explain ↗</strong> button reveals which agents produced it and how.
      </p>
      <div style={{ marginTop: 6 }}>
        <AsOfStamp source="Domain snapshots derived from current agent outputs" />
      </div>
    </div>
  );
}

function BankRibbon({ scale }) {
  const items = [
    { label: 'Loan book', value: formatLkr(scale.totalLoansLkr), help: 'Total gross loans. Source: Credit agent.' },
    { label: 'Deposits',  value: formatLkr(scale.totalDepositsLkr), help: 'Total customer deposits. Source: Balance Sheet Drivers agent.' },
    { label: 'Tier 1 CAR', value: scale.tier1Pct != null ? `${Number(scale.tier1Pct).toFixed(2)}%` : '—', help: 'Tier 1 capital adequacy. Basel III minimum 10.0% for Sri Lanka LCBs.' },
    { label: 'LCR', value: scale.lcrPct != null ? `${Number(scale.lcrPct).toFixed(1)}%` : '—', help: 'Liquidity Coverage Ratio — HQLA vs 30-day stressed cash outflows. Basel III minimum 100%.' },
    { label: 'Stage 3', value: scale.stage3Pct != null ? `${Number(scale.stage3Pct).toFixed(2)}%` : '—', help: 'Non-performing loans as % of gross loans. Source: Credit agent.' },
    { label: 'Customers', value: scale.customerCount ? scale.customerCount.toLocaleString('en-US') : '—', help: 'Total analysed customer accounts. Source: KYC agent.' },
  ];
  return (
    <div style={{ display: 'flex', gap: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 20px', overflow: 'hidden' }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ flex: 1, padding: '0 12px', borderRight: i < items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
            {it.label}<InfoHint text={it.help} title={it.label} size={11} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', fontFamily: 'var(--font-display)', marginTop: 2 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function GroupSection({ title, domains, allFindings, auditPlan, onOpen }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
        {domains.map(d => <DomainCard key={d.id} domain={d} allFindings={allFindings} auditPlan={auditPlan} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function DomainCard({ domain, allFindings, auditPlan, onOpen }) {
  const Icon = DOMAIN_ICONS[domain.id] || Briefcase;
  const snapshot = computeDomainSnapshot(domain.id, allFindings, auditPlan);
  const { openCriticals = 0, coveragePct = 0, aggregateExposureLkr = 0, residualRisk = 'low' } = snapshot || {};
  const residualColor = residualRisk === 'critical' ? '#C41E3A' : residualRisk === 'high' ? '#B45309' : residualRisk === 'medium' ? '#CA8A04' : '#0BBF7A';

  return (
    <button
      onClick={() => onOpen(domain.id)}
      style={{
        textAlign: 'left',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)';
        e.currentTarget.style.borderColor = 'rgba(245,184,65,0.35)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,184,65,0.12)', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{domain.label}</div>
            <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 2 }}>{domain.ownerRole}</div>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
      </div>

      <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
        {domain.pitch}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(domain.subUnits || []).slice(0, 4).map(u => (
          <span key={u.id} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 10, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', fontWeight: 600 }}>
            {u.label}
          </span>
        ))}
        {(domain.subUnits?.length || 0) > 4 && (
          <span style={{ fontSize: 10.5, padding: '2px 8px', color: 'var(--color-text-3)', fontWeight: 600 }}>+{domain.subUnits.length - 4} more</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
        <CardMetric label="Criticals" value={openCriticals} color={openCriticals > 0 ? '#C41E3A' : 'var(--color-text-3)'} />
        <CardMetric label="Exposure" value={aggregateExposureLkr > 0 ? formatLkr(aggregateExposureLkr) : '—'} color="var(--color-text)" size="sm" />
        <CardMetric label="Residual" value={residualRisk} color={residualColor} size="sm" transform="capitalize" />
      </div>
    </button>
  );
}

function CardMetric({ label, value, color, size = 'lg', transform }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</div>
      <div style={{ fontSize: size === 'lg' ? 16 : 12.5, fontWeight: 800, color, marginTop: 3, fontFamily: 'var(--font-display)', textTransform: transform || 'none' }}>
        {value}
      </div>
    </div>
  );
}

function FooterNote() {
  return (
    <div style={{ fontSize: 11, color: 'var(--color-text-3)', padding: '14px 16px', borderTop: '1px solid var(--color-border)', marginTop: 8, lineHeight: 1.55 }}>
      Every figure on these pages derives from the connected data-lake sources processed by the agents. Sync new data in <strong>Data Sources</strong> and the Business Platform
      updates end-to-end. Tune detection sensitivity in <strong>Rule Parameters</strong>. Pre-rendered explainability ships with the demo — no API key required.
    </div>
  );
}
