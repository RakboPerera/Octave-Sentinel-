import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getDomain } from '../../data/domainRegistry.js';
import { AGENT_META } from '../../data/agentMeta.js';
import { useDomainSnapshot, useDomainFindings } from '../../hooks/useDomainData.js';
import useExplainability from '../../hooks/useExplainability.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import { Num } from '../../components/shared/ui.jsx';
import { tagFindingSubUnit } from '../../utils/domainTagging.js';
import ExplainabilityPanel from '../../components/business/ExplainabilityPanel.jsx';
import SubUnitFilter from '../../components/business/SubUnitFilter.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import { ChevronLeft, Sparkles, Activity, Gauge, Search, Filter } from 'lucide-react';

// ─── DOMAIN DEEP-DIVE ────────────────────────────────────────────────────────
// Three-section structure:
//   §1 Snapshot
//   §2 Audit Risk Profile
//   §3 Live findings — two-column (case list left, explainability inline right)
//
// Everything else (agent roster, coverage matrix, correlations, regulatory
// lens, open cases) has been removed per product direction — Engine Map
// covers the agent-level story, Case Manager covers case state, and every
// finding's regulatory hook lives in its explainability trail.

export default function DomainDeepDive() {
  const { domainId } = useParams();
  const navigate = useNavigate();
  const domain = getDomain(domainId);

  const snapshot = useDomainSnapshot(domainId);
  const findings = useDomainFindings(domainId);

  // Sub-unit tagging
  const findingsWithSubUnit = useMemo(
    () => findings.map(f => ({ ...f, subUnitId: tagFindingSubUnit(f, domainId) })),
    [findings, domainId]
  );

  const subUnitCounts = useMemo(() => {
    const c = {};
    for (const f of findingsWithSubUnit) if (f.subUnitId) c[f.subUnitId] = (c[f.subUnitId] || 0) + 1;
    return c;
  }, [findingsWithSubUnit]);

  const [activeSubUnit, setActiveSubUnit] = useState(null);
  const [severityFilter, setSeverityFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredFindings = useMemo(() => {
    let list = findingsWithSubUnit;
    if (activeSubUnit) list = list.filter(f => f.subUnitId === activeSubUnit);
    if (severityFilter) list = list.filter(f => (f.severity || '').toLowerCase() === severityFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f => {
        const text = (f.finding?.finding || f.finding?.explanation || f.finding?.pattern_detected || '').toLowerCase();
        const ids = (f.finding?.entity_ids || []).join(' ').toLowerCase();
        return text.includes(q) || ids.includes(q);
      });
    }
    return list;
  }, [findingsWithSubUnit, activeSubUnit, severityFilter, search]);

  // Reset selection when filters change
  useEffect(() => { setSelectedIndex(0); }, [activeSubUnit, severityFilter, search, domainId]);

  const selected = filteredFindings[selectedIndex];

  if (!domain) return <Navigate to="/business-view" replace />;

  return (
    <div style={{ maxWidth: 1500, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <button
        onClick={() => navigate('/business-view')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, width: 'fit-content' }}
      >
        <ChevronLeft size={14} /> All domains
      </button>

      {/* §1 Snapshot */}
      <DomainSnapshot domain={domain} snapshot={snapshot} />

      {/* §2 Audit Risk Profile */}
      <AuditRiskProfile snapshot={snapshot} />

      {/* §3 Live findings with inline explainability */}
      <FindingsAndExplainability
        domain={domain}
        findings={filteredFindings}
        subUnitCounts={subUnitCounts}
        activeSubUnit={activeSubUnit}
        setActiveSubUnit={setActiveSubUnit}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        search={search}
        setSearch={setSearch}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        selected={selected}
      />
    </div>
  );
}

// ─── §1 SNAPSHOT ─────────────────────────────────────────────────────────────
function DomainSnapshot({ domain, snapshot }) {
  const { touchedAgents = [], aggregateExposureLkr = 0, openCriticals = 0 } = snapshot || {};

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px 24px 20px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#B45309' }}>
        {domain.ownerRole}
      </div>
      <h2 style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{domain.label}</h2>
      <p style={{ fontSize: 13.5, color: 'var(--color-text-2)', margin: '10px 0 0', maxWidth: 900, lineHeight: 1.55 }}>
        {domain.pitch}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {(domain.subUnits || []).map(u => (
          <span key={u.id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', fontWeight: 600 }}>
            {u.label}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
        <Stat label="Open criticals" value={openCriticals} accent={openCriticals > 0 ? 'red' : 'muted'} help="Count of agent findings classified critical in this domain. Tune severity bands in Rule Parameters." />
        <Stat label="Aggregate exposure" value={aggregateExposureLkr > 0 ? formatLkr(aggregateExposureLkr) : '—'} accent={aggregateExposureLkr > 0 ? 'amber' : 'muted'} help="Sum of affected exposure across all flagged findings in this domain (key findings only)." />
        <Stat label="Agents feeding" value={`${touchedAgents.length}`} accent="muted" help="Number of distinct agents that currently have findings routed to this domain." />
      </div>
    </div>
  );
}

function Stat({ label, value, accent, help }) {
  const color = accent === 'red' ? 'var(--color-red)' : accent === 'green' ? '#0BBF7A' : accent === 'amber' ? '#B45309' : 'var(--color-text)';
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 4, display: 'flex', alignItems: 'center' }}>
        {label}{help && <InfoHint text={help} title={label} size={11} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  );
}

// ─── §2 AUDIT RISK PROFILE ───────────────────────────────────────────────────
function AuditRiskProfile({ snapshot }) {
  const { severityCounts = {}, residualRisk = 'low' } = snapshot || {};
  const residualColor = residualRisk === 'critical' ? '#C41E3A' : residualRisk === 'high' ? '#B45309' : residualRisk === 'medium' ? '#185FA5' : '#0BBF7A';
  const residualLabel = residualRisk === 'critical' ? 'Critical' : residualRisk === 'high' ? 'Elevated' : residualRisk === 'medium' ? 'Moderate' : 'Low';

  return (
    <Panel title="Audit risk profile" icon={Gauge} intro="ISA 315 combined residual risk — derived from active findings, their severity, and exposure under review." help="Residual combines severity volume and exposure. Critical if 3+ criticals, or 2+ criticals with (3+ highs OR exposure ≥ elevated-gate), or 1+ critical with exposure ≥ critical-gate. High if 1+ critical, 3+ highs, or 6+ mediums with exposure ≥ elevated-gate. Medium if 1+ high or 3+ mediums. Default gates: critical LKR 20 Bn, elevated LKR 5 Bn. If performance materiality / tolerable misstatement are set on the Audit Plan page, those values replace the default gates so residual tiers respect your ISA 320 thresholds.">
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'center' }}>
        <div style={{ padding: 16, textAlign: 'center', background: residualColor + '14', border: `1px solid ${residualColor}40`, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: residualColor, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Residual Risk
            <InfoHint title="Residual risk" align="center" text="The domain's overall risk tier after controls, derived by a fixed rule from the live critical/high/medium counts and exposure beside it. It is a deterministic banding (e.g. 3+ criticals = Critical), not a model score — clearing or downgrading findings moves the tier." />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: residualColor, fontFamily: 'var(--font-display)' }}>{residualLabel}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <SeverityBox label="Critical" count={severityCounts.critical || 0} color="#C41E3A" help="Number of active findings in this domain the engine classified Critical. Each finding's severity is set by a fixed rule against your Rule Parameters thresholds — no probability or ranking model is involved." />
          <SeverityBox label="High" count={severityCounts.high || 0} color="#B45309" help="Number of active findings classified High by the deterministic severity rule (exposure and signal strength below the Critical cut but above the Medium one). Counts feed the residual-risk tier on the left." />
          <SeverityBox label="Medium" count={severityCounts.medium || 0} color="#185FA5" help="Number of active findings classified Medium — flagged by the rules but below the High exposure/signal cut. Re-tuning thresholds in Rule Parameters re-classifies these counts." />
        </div>
      </div>
    </Panel>
  );
}

function SeverityBox({ label, count, color, help }) {
  return (
    <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
        {label}{help && <InfoHint text={help} title={`${label} findings`} size={11} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'var(--font-display)', marginTop: 4 }}>{count}</div>
    </div>
  );
}

// ─── §3 FINDINGS + INLINE EXPLAINABILITY ─────────────────────────────────────
function FindingsAndExplainability({
  domain, findings, subUnitCounts, activeSubUnit, setActiveSubUnit,
  severityFilter, setSeverityFilter, search, setSearch,
  selectedIndex, setSelectedIndex, selected,
}) {
  return (
    <Panel
      title="Live findings in your domain"
      icon={Activity}
      intro="Each case on the left shows the full explainability on the right — how the agents reached the finding, which signals fired, and how to verify it."
      help="Findings are sorted by severity. Use the sub-unit pills to zoom into a segment of your book (e.g. Cards within Consumer Banking). Every case has a full 14-section explainability trail authored by the Explainability Agent."
    >
      {/* Filter bar */}
      <FilterBar
        domain={domain}
        subUnitCounts={subUnitCounts}
        activeSubUnit={activeSubUnit}
        setActiveSubUnit={setActiveSubUnit}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        search={search}
        setSearch={setSearch}
      />

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, marginTop: 14, alignItems: 'flex-start' }}>
        {/* Left: findings list */}
        <FindingsList
          findings={findings}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />

        {/* Right: inline explainability for the selected finding */}
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', minHeight: 520 }}>
          {selected ? (
            <ExplainabilitySlot item={selected} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 480, gap: 10, textAlign: 'center', padding: 24 }}>
              <Sparkles size={22} style={{ color: '#F5B841' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>No findings match your filters</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', maxWidth: 320, lineHeight: 1.5 }}>
                Clear filters or adjust your search to see active findings in this domain.
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function ExplainabilitySlot({ item }) {
  const { loading, source, data, error } = useExplainability(item.agentId, item.findingIndex, item.finding);
  return (
    <ExplainabilityPanel
      loading={loading}
      source={source}
      data={data}
      error={error}
      finding={item.finding}
      agentId={item.agentId}
    />
  );
}

// ─── FILTER BAR ──────────────────────────────────────────────────────────────
function FilterBar({ domain, subUnitCounts, activeSubUnit, setActiveSubUnit, severityFilter, setSeverityFilter, search, setSearch }) {
  const hasSubUnits = (domain.subUnits || []).length > 0 && Object.values(subUnitCounts).some(v => v > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search findings by text or entity (e.g. BR-14, STF-1847)…"
            style={{ width: '100%', padding: '6px 10px 6px 30px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['critical', 'high', 'medium'].map(s => (
            <button
              key={s}
              onClick={() => setSeverityFilter(severityFilter === s ? null : s)}
              style={{
                padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: severityFilter === s ? (s === 'critical' ? 'rgba(196,30,58,0.14)' : s === 'high' ? 'rgba(180,83,9,0.14)' : 'rgba(202,138,4,0.14)') : 'var(--color-surface-2)',
                color: severityFilter === s ? (s === 'critical' ? '#C41E3A' : s === 'high' ? '#B45309' : '#185FA5') : 'var(--color-text-2)',
                border: `1px solid ${severityFilter === s ? (s === 'critical' ? '#C41E3A' : s === 'high' ? '#B45309' : '#185FA5') : 'var(--color-border)'}`,
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {hasSubUnits && (
        <SubUnitFilter
          subUnits={domain.subUnits}
          counts={subUnitCounts}
          active={activeSubUnit}
          onChange={setActiveSubUnit}
        />
      )}
    </div>
  );
}

// ─── FINDINGS LIST (LEFT COLUMN) ─────────────────────────────────────────────
function FindingsList({ findings, selectedIndex, onSelect }) {
  return (
    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 10, maxHeight: 720, overflowY: 'auto' }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', padding: '4px 6px 10px' }}>
        {findings.length} finding{findings.length !== 1 ? 's' : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {findings.map((item, i) => (
          <FindingListRow key={i} item={item} selected={i === selectedIndex} onClick={() => onSelect(i)} />
        ))}
      </div>
      {findings.length === 0 && (
        <div style={{ padding: 16, fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', fontStyle: 'italic' }}>
          No findings match your filters.
        </div>
      )}
    </div>
  );
}

function FindingListRow({ item, selected, onClick }) {
  const f = item.finding;
  const agentMeta = AGENT_META[item.agentId];
  const sev = (item.severity || 'medium').toLowerCase();
  const sevColor = sev === 'critical' ? '#C41E3A' : sev === 'high' ? '#B45309' : '#185FA5';
  const text = f.finding || f.explanation || f.pattern_detected || f.pattern_explanation || f.risk_interpretation || f.risk_signal || '';
  const exposure = f.affected_exposure_lkr || f.affected_balance_lkr || f.exposure_lkr || 0;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '12px 14px',
        background: selected ? 'white' : 'var(--color-surface)',
        border: `1px solid ${selected ? 'rgba(245,184,65,0.45)' : 'var(--color-border)'}`,
        borderLeft: `4px solid ${sevColor}`,
        borderRadius: 8,
        boxShadow: selected ? '0 2px 6px rgba(245,184,65,0.15)' : 'none',
        cursor: 'pointer',
        transition: 'all 0.12s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.background = 'white';
          e.currentTarget.style.borderColor = 'rgba(245,184,65,0.25)';
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.background = 'var(--color-surface)';
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 6, background: sevColor + '18', color: sevColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sev}</span>
        {agentMeta && (
          <span style={{ fontSize: 9, fontWeight: 700, color: agentMeta.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{agentMeta.name}</span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: selected ? 'var(--color-text)' : 'var(--color-text-2)', lineHeight: 1.5, fontWeight: selected ? 600 : 500 }}>
        {truncate(text, 150)}
      </div>
      {exposure > 0 && (
        <div style={{ fontSize: 10, fontWeight: 800, color: sevColor, fontFamily: 'var(--font-display)', marginTop: 6 }}>
          <Num>{formatLkr(exposure)}</Num>
        </div>
      )}
    </button>
  );
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
}

// ─── SHARED PANEL ────────────────────────────────────────────────────────────
function Panel({ title, icon: Icon, intro, help, children }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: intro ? 4 : 12 }}>
        {Icon && <Icon size={14} style={{ color: '#B45309' }} />}
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>{title}</h3>
        {help && <InfoHint text={help} title={title} />}
      </div>
      {intro && <p style={{ fontSize: 11.5, color: 'var(--color-text-3)', margin: '0 0 14px', lineHeight: 1.5 }}>{intro}</p>}
      {children}
    </div>
  );
}
