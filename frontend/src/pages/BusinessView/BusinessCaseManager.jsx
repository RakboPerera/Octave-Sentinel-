import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { fixtureCases } from '../../data/caseRegistry.js';
import { DOMAINS, getDomain } from '../../data/domainRegistry.js';
import { AGENT_META } from '../../data/agentMeta.js';
import { THRESHOLDS } from '../../data/thresholdRegistry.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import { useApp } from '../../context/AppContext.jsx';
import { useDialog } from '../../components/shared/Dialog.jsx';
import ExplainabilityPanel from '../../components/business/ExplainabilityPanel.jsx';
import useExplainability from '../../hooks/useExplainability.js';
import AsOfStamp from '../../components/business/AsOfStamp.jsx';
import { DEFAULT_SLA_POLICY, AGEING_BUCKETS, bucketForAge, resolveCaseSla, slaStatus, workingDaysBetween } from '../../utils/slaPolicy.js';
import { FolderKanban, Filter, Clock, ChevronRight, ChevronLeft, Info, AlertOctagon, Layers, X, MessageCircle, CheckCircle2, Send, TimerReset, ClipboardCheck } from 'lucide-react';
import RemediationPanel, { isOverdue, REM_STATUS } from '../../components/business/RemediationPanel.jsx';
import { SlaPill, Num, sevColor as sevColorOf } from '../../components/shared/ui.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';

// ─── BUSINESS CASE MANAGER ───────────────────────────────────────────────────
// Re-frames cases as a domain-first kanban. Cases are grouped by domain by
// default and cross-domain cases (touching 3+ domains) get a distinctive
// multi-domain glyph.

const STATUS_COLUMNS = [
  { id: 'open',          label: 'New / Open',     accent: '#C41E3A' },
  { id: 'investigating', label: 'Investigating',  accent: '#B45309' },
  { id: 'remediation',   label: 'Remediation',    accent: '#CA8A04' },
  { id: 'resolved',      label: 'Resolved',       accent: '#0BBF7A' },
];

export default function BusinessCaseManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useApp();
  const { alert } = useDialog();
  const caseWorkbench = state.caseWorkbench || {};
  const me = state.auth?.user || null;
  const actor = () => (me ? { name: me.name, role: me.role } : null);

  // FOUR-EYES (SoD): a case must be concluded (resolved) or dismissed as a false
  // positive by someone OTHER than the person who worked it. The reducer also
  // enforces this defensively; here we explain the block to the user.
  async function handleStatusChange(caseId, status) {
    const wb = caseWorkbench[caseId] || {};
    if (status === 'resolved' && wb.workedBy?.name && me && wb.workedBy.name === me.name) {
      await alert({
        title: 'Segregation of duties',
        message: `This case was worked by ${wb.workedBy.name}. Under four-eyes review, a different reviewer must conclude it. Sign in as the reviewer (or have them resolve it).`,
        danger: true,
      });
      return;
    }
    dispatch({ type: 'SET_CASE_STATUS', caseId, payload: status, actor: actor() });
  }

  async function handleMarkFalsePositive(caseId, payload) {
    const wb = caseWorkbench[caseId] || {};
    if (wb.workedBy?.name && me && wb.workedBy.name === me.name) {
      await alert({
        title: 'Segregation of duties',
        message: `This case was worked by ${wb.workedBy.name}. A different reviewer must dismiss it as a false positive.`,
        danger: true,
      });
      return;
    }
    dispatch({ type: 'MARK_CASE_FALSE_POSITIVE', caseId, payload: { ...payload, author: me?.name, actor: actor() } });
  }

  // ?domain=<id> query param lets Now / domain deep-dives deep-link into a
  // pre-filtered Investigate view (domains are filters here, not destinations).
  const domainParam = new URLSearchParams(location.search).get('domain');
  const [domainFilter, setDomainFilter] = useState(domainParam || null);
  const [severityFilter, setSeverityFilter] = useState(() => location.state?.severityFilter || null);
  const [fpFilter, setFpFilter] = useState('all'); // 'all' | 'only_fp' | 'hide_fp'
  const [staleOnly, setStaleOnly] = useState(() => !!location.state?.staleOnly);
  const [groupMode, setGroupMode] = useState('domain'); // 'domain' | 'status'
  const [openCaseId, setOpenCaseId] = useState(() => location.state?.openCaseId || null);

  // Consume one-shot navigation state from Now / the Header bell (severity
  // filter, stale-only, or a specific case to open), then clear it so a
  // back-navigate doesn't re-apply the same intent.
  useEffect(() => {
    const st = location.state;
    if (st && (st.severityFilter || st.staleOnly || st.openCaseId)) {
      if (st.severityFilter) setSeverityFilter(st.severityFilter);
      if (st.staleOnly) setStaleOnly(true);
      if (st.openCaseId) setOpenCaseId(st.openCaseId);
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state?.severityFilter, location.state?.staleOnly, location.state?.openCaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge static cases (CASES) with dynamically generated ones (state.cases).
  // The `domains` field in caseRegistry.js holds AGENT ids — which is the
  // Agent-Platform model. For Business Platform we translate those agent-ids
  // into business-domain ids via the agent→domain map derived from
  // domainRegistry. This keeps the caseRegistry file untouched.
  // caseWorkbench overrides status and supplies notes per-case, uniformly
  // across static and auto-generated cases.
  const allCases = useMemo(() => {
    const out = [];
    // Static demo cases only in demo mode; once cleared, show the bank's own.
    for (const c of fixtureCases(state)) {
      const agentIds = c.domains || [];
      const domainIds = agentsToDomainIds(agentIds);
      const wb = caseWorkbench[c.id] || {};
      out.push({
        ...c,
        agents: agentIds,
        domainIds,
        status: wb.status || c.status || 'open',
        notes: wb.notes || [],
        stateHistory: wb.stateHistory || [],
        falsePositive: !!wb.falsePositive,
      });
    }
    for (const c of state.cases || []) {
      if (out.find(x => x.id === c.id)) continue;
      const agentIds = [c.agentId].filter(Boolean);
      const domainIds = agentsToDomainIds(agentIds);
      const wb = caseWorkbench[c.id] || {};
      out.push({
        id: c.id,
        title: c.title,
        severity: c.severity,
        status: wb.status || c.status || 'open',
        agents: agentIds,
        domainIds,
        finding_ids: [],
        // Carry the finding index so the explainability drawer can resolve the
        // EXACT engine finding this case was promoted from (evidence.key_findings
        // [findingIndex]). Dropping it forced the drawer to fall back to a
        // title-only finding with no severity.
        findingIndex: c.findingIndex,
        exposureLkr: c.exposureLkr || 0,
        description: c.description,
        recommendedAction: c.recommendedAction,
        evidence: c.evidence,
        createdAt: c.createdAt,
        slaHours: c.slaHours,
        notes: wb.notes || [],
        stateHistory: wb.stateHistory || [],
        falsePositive: !!wb.falsePositive,
      });
    }
    return out;
  }, [state.cases, caseWorkbench, state.demoMode]);

  const openCase = useMemo(() => allCases.find(c => c.id === openCaseId), [allCases, openCaseId]);

  // Stats
  const stats = useMemo(() => {
    const s = { total: allCases.length, critical: 0, high: 0, open: 0, investigating: 0, resolved: 0, exposure: 0, multiDomain: 0 };
    for (const c of allCases) {
      s.exposure += c.exposureLkr || 0;
      if (c.severity === 'critical') s.critical++;
      if (c.severity === 'high') s.high++;
      if (c.status === 'open') s.open++;
      if (c.status === 'investigating') s.investigating++;
      if (c.status === 'resolved' || c.status === 'closed') s.resolved++;
      if ((c.domainIds || []).length >= 3) s.multiDomain++;
    }
    return s;
  }, [allCases]);

  // SLA policy comes from the Audit Plan (configurable via Wave 5 #4).
  // Falls back to DEFAULT_SLA_POLICY if the plan hasn't been saved yet.
  const slaPolicy = state.auditPlan?.slaPolicy || DEFAULT_SLA_POLICY;

  const filtered = useMemo(() => allCases.filter(c => {
    if (domainFilter && !(c.domainIds || []).includes(domainFilter)) return false;
    if (severityFilter && c.severity !== severityFilter) return false;
    const isFP = !!(caseWorkbench[c.id]?.falsePositive);
    if (fpFilter === 'only_fp' && !isFP) return false;
    if (fpFilter === 'hide_fp' && isFP) return false;
    if (staleOnly && !computeCaseTiming(c, slaPolicy).isStale) return false;
    return true;
  }), [allCases, domainFilter, severityFilter, fpFilter, staleOnly, caseWorkbench, slaPolicy]);

  // Count of stale cases for the toolbar chip label.
  const staleCount = useMemo(() => allCases.filter(c => computeCaseTiming(c, slaPolicy).isStale).length, [allCases, slaPolicy]);

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Header stats={stats} />

      <RemediationRollup cases={allCases} remediation={state.remediation || {}} bankProfile={state.bankProfile} />

      <AgeingSlaBoard cases={allCases} slaPolicy={slaPolicy} isCustomSla={!!state.auditPlan?.slaPolicy} onFilterStale={() => setStaleOnly(true)} />

      <Toolbar
        domainFilter={domainFilter}
        onDomainFilter={setDomainFilter}
        severityFilter={severityFilter}
        onSeverityFilter={setSeverityFilter}
        fpFilter={fpFilter}
        onFpFilter={setFpFilter}
        staleOnly={staleOnly}
        onStaleOnly={setStaleOnly}
        staleCount={staleCount}
        groupMode={groupMode}
        onGroupMode={setGroupMode}
      />

      {groupMode === 'status' ? (
        <StatusKanban cases={filtered} navigate={navigate} onOpen={setOpenCaseId} />
      ) : (
        <DomainGroups cases={filtered} navigate={navigate} domainFilter={domainFilter} onOpen={setOpenCaseId} />
      )}

      {openCase && (
        <CaseDetailDrawer
          caseItem={openCase}
          caseWorkbench={caseWorkbench[openCase.id] || {}}
          onClose={() => setOpenCaseId(null)}
          onStatusChange={(status) => handleStatusChange(openCase.id, status)}
          onAddNote={(text) => dispatch({ type: 'ADD_CASE_NOTE', caseId: openCase.id, payload: { text, author: me?.name, actor: actor() } })}
          onMarkFalsePositive={(payload) => handleMarkFalsePositive(openCase.id, payload)}
          onUnmarkFalsePositive={() => dispatch({ type: 'UNMARK_CASE_FALSE_POSITIVE', caseId: openCase.id })}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// ─── REMEDIATION ROLL-UP ─────────────────────────────────────────────────────
// The CAE's portfolio-of-actions view: of all open cases, how many have a tracked
// remediation, where are they in the lifecycle, and how many are overdue. This is
// the line between "we detect" and "we close the loop".
function RemediationRollup({ cases, remediation, bankProfile }) {
  const asOfMs = bankProfile?.asOfDate ? Date.parse(bankProfile.asOfDate) : Date.now();
  const rollup = useMemo(() => {
    const counts = { open: 0, in_progress: 0, remediated: 0, verified: 0, risk_accepted: 0 };
    let tracked = 0, overdue = 0;
    for (const c of cases || []) {
      const r = remediation[c.id];
      if (!r) continue;
      tracked++;
      if (counts[r.status] != null) counts[r.status]++;
      if (isOverdue(r, asOfMs)) overdue++;
    }
    return { counts, tracked, overdue, untracked: (cases?.length || 0) - tracked };
  }, [cases, remediation, asOfMs]);
  const total = cases?.length || 0;
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 16px', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ClipboardCheck size={15} style={{ color: '#0F6E56' }} />
        <span style={{ fontSize: 12.5, fontWeight: 800 }}>Remediation</span>
        <InfoHint
          align="left"
          size={11}
          title="Remediation roll-up"
          text="The portfolio view of management actions: of all cases shown, how many have a tracked remediation and where each sits in its lifecycle — open, in progress, remediated, verified, or risk-accepted. The counts are a direct tally of remediation records; 'overdue' means the target date has passed (against the bank profile's as-of date) without reaching verified. Cases with no remediation yet are shown as 'not yet assigned'."
        />
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{rollup.tracked}/{total} cases tracked</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', flex: 1 }}>
        {REM_STATUS.map(s => (
          <span key={s.v} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: s.color }} />
            <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{rollup.counts[s.v]}</span>
            <span style={{ color: 'var(--color-text-3)' }}>{s.label}</span>
          </span>
        ))}
        {rollup.overdue > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, color: '#C41E3A', padding: '2px 8px', borderRadius: 6, background: 'rgba(196,30,58,0.12)' }}>
            {rollup.overdue} overdue
          </span>
        )}
        {rollup.untracked > 0 && <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{rollup.untracked} not yet assigned</span>}
      </div>
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function Header({ stats }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FolderKanban size={20} style={{ color: '#B45309' }} />
          Investigate
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 880, lineHeight: 1.55 }}>
          Every open case and finding, grouped by the business domain it touches. Cross-domain cases (3+ domains) surface compound risk —
          that's where sign-off gets complicated and where audit value compounds.
        </p>
        <div style={{ marginTop: 6 }}>
          <AsOfStamp source="Cases from case registry · SLA policy from audit plan" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 8 }}>
        <Stat label="Active cases" value={stats.total} help="Every case currently in the manager — the static case registry merged with cases the engine generated this cycle. It is a straight count of all cases regardless of status (open, investigating, remediation, or resolved), not just unresolved ones." />
        <Stat label="Critical" value={stats.critical} color="#C41E3A" help="How many of these cases carry a Critical severity, counted directly from each case's engine-assigned severity. Critical cases also get the tightest SLA, so this is the queue that breaches soonest." />
        <Stat label="Multi-domain" value={stats.multiDomain} color="#B45309" help="Cases that touch 3 or more business domains, mapped from the agents that raised them. Multi-domain cases signal compound risk — the same issue spans several owners, so sign-off is harder and audit value is highest. It is a fixed ≥3 rule, not a model judgement." />
        <Stat label="Exposure" value={formatLkr(stats.exposure)} small help="The sum of each case's own exposure figure across all cases shown. Exposure is taken once per case (entity-deduped at the point each case was built), so the same balance is not added twice within a case — but this header total does add distinct cases together." />
      </div>
    </div>
  );
}

function Stat({ label, value, color, small, help }) {
  return (
    <div style={{ padding: '10px 14px', background: (color || 'var(--color-text)') + '08', border: `1px solid ${color || 'var(--color-border)'}40`, borderRadius: 10, minWidth: 100 }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: color || 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
        {label}{help && <InfoHint text={help} title={label} size={11} align="right" />}
      </div>
      <div style={{ fontSize: small ? 14 : 22, fontWeight: 800, color: color || 'var(--color-text)', fontFamily: 'var(--font-display)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ─── TOOLBAR ─────────────────────────────────────────────────────────────────
function Toolbar({ domainFilter, onDomainFilter, severityFilter, onSeverityFilter, fpFilter, onFpFilter, staleOnly, onStaleOnly, staleCount = 0, groupMode, onGroupMode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Filter size={12} /> Filters
      </div>

      {/* Group mode */}
      <div style={{ display: 'flex', background: 'var(--color-surface-2)', borderRadius: 14, padding: 2, border: '1px solid var(--color-border)' }}>
        {[{ id: 'domain', label: 'By domain' }, { id: 'status', label: 'Kanban' }].map(g => (
          <button
            key={g.id}
            onClick={() => onGroupMode(g.id)}
            style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: groupMode === g.id ? 'white' : 'transparent', color: groupMode === g.id ? '#B45309' : 'var(--color-text-2)', border: 'none' }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Domain filter */}
      <select
        value={domainFilter || ''}
        onChange={e => onDomainFilter(e.target.value || null)}
        style={{ fontSize: 11.5, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', cursor: 'pointer' }}
      >
        <option value="">All domains</option>
        {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
      </select>

      {/* Severity filter */}
      <div style={{ display: 'flex', gap: 4 }}>
        {['critical', 'high'].map(s => (
          <button
            key={s}
            onClick={() => onSeverityFilter(severityFilter === s ? null : s)}
            style={{
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: severityFilter === s ? (s === 'critical' ? 'rgba(196,30,58,0.14)' : 'rgba(180,83,9,0.14)') : 'transparent',
              color: severityFilter === s ? (s === 'critical' ? '#C41E3A' : '#B45309') : 'var(--color-text-2)',
              border: `1px solid ${severityFilter === s ? (s === 'critical' ? '#C41E3A' : '#B45309') : 'var(--color-border)'}`,
              textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Stale filter — cases in their current status longer than the severity-scaled SLA */}
      <button
        onClick={() => onStaleOnly && onStaleOnly(!staleOnly)}
        title="Toggle stale-only view. Critical cases become stale after 3 days in their current status, high after 7, medium after 14, low after 21."
        style={{
          marginLeft: 'auto', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          background: staleOnly ? 'rgba(196,30,58,0.14)' : 'transparent',
          color: staleOnly ? '#C41E3A' : 'var(--color-text-2)',
          border: `1px solid ${staleOnly ? '#C41E3A' : 'var(--color-border)'}`,
          display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
        }}
      >
        <Clock size={11} /> Stale · {staleCount}
      </button>

      {/* False-positive filter */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { id: 'all',     label: 'All' },
          { id: 'only_fp', label: 'False positives' },
          { id: 'hide_fp', label: 'Hide FPs' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => onFpFilter(f.id)}
            style={{
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: fpFilter === f.id ? 'rgba(11,191,122,0.12)' : 'transparent',
              color: fpFilter === f.id ? '#0BBF7A' : 'var(--color-text-2)',
              border: `1px solid ${fpFilter === f.id ? '#0BBF7A' : 'var(--color-border)'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── DOMAIN-GROUPED VIEW ─────────────────────────────────────────────────────
function DomainGroups({ cases, navigate, domainFilter, onOpen }) {
  const grouped = useMemo(() => {
    const g = {};
    for (const c of cases) {
      const doms = (c.domainIds || []).length ? c.domainIds : ['_unassigned'];
      for (const d of doms) {
        if (!g[d]) g[d] = [];
        g[d].push(c);
      }
    }
    return g;
  }, [cases]);

  const domainOrder = domainFilter ? [domainFilter] : DOMAINS.map(d => d.id);
  const displayed = domainOrder.filter(id => (grouped[id] || []).length > 0);

  if (displayed.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--color-text-3)', background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: 10 }}>
        No cases matching the current filters.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {displayed.map(domId => {
        const dom = getDomain(domId);
        const items = grouped[domId] || [];
        return (
          <div key={domId} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B45309' }}>
                  {dom?.ownerRole || 'Unassigned'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>
                  {dom?.label || 'Unassigned'} · {items.length} case{items.length !== 1 ? 's' : ''}
                </div>
              </div>
              {dom && (
                <button
                  onClick={() => navigate(`/business-view/${domId}`)}
                  style={{ fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 10, background: 'rgba(245,184,65,0.12)', color: '#B45309', border: '1px solid rgba(245,184,65,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Open domain <ChevronRight size={11} />
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
              {items.map(c => <CaseCard key={c.id} c={c} navigate={navigate} onOpen={onOpen} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── STATUS KANBAN ───────────────────────────────────────────────────────────
function StatusKanban({ cases, navigate, onOpen }) {
  const byStatus = useMemo(() => {
    const g = {};
    for (const col of STATUS_COLUMNS) g[col.id] = [];
    for (const c of cases) {
      const key = STATUS_COLUMNS.find(col => col.id === c.status)?.id || 'open';
      g[key].push(c);
    }
    return g;
  }, [cases]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, minHeight: 400 }}>
      {STATUS_COLUMNS.map(col => (
        <div key={col.id} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: col.accent }}>{col.label}</div>
            <div style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 8, background: 'white', fontWeight: 800, color: col.accent }}>{byStatus[col.id].length}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byStatus[col.id].map(c => <CaseCard key={c.id} c={c} navigate={navigate} onOpen={onOpen} compact />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CASE CARD ───────────────────────────────────────────────────────────────
// SLA resolution — was previously a hard-coded lookup
// (`{ critical: 3, high: 7, medium: 14 }`). Now driven by the audit-policy
// table on BusinessAuditPlan (state.auditPlan.slaPolicy), so compliance
// findings can carry a tighter SLA than operations findings. Multi-domain
// cases use the tightest applicable SLA — see `resolveCaseSla` in
// utils/slaPolicy.js.

// Timing info for a case: days since createdAt, days in current status (since
// last stateHistory transition), whether the case is stale.
function computeCaseTiming(c, slaPolicy) {
  const now = Date.now();
  const created = c.createdAt ? new Date(c.createdAt).getTime() : null;
  const daysSinceCreated = created ? Math.max(0, (now - created) / (24 * 3600 * 1000)) : null;

  const history = c.stateHistory || [];
  const lastChange = history.length > 0 ? new Date(history[history.length - 1].at).getTime() : created;
  const daysInStatus = lastChange ? Math.max(0, (now - lastChange) / (24 * 3600 * 1000)) : null; // calendar — display

  const threshold = resolveCaseSla(c, slaPolicy || DEFAULT_SLA_POLICY);
  // CC3: SLA breach / staleness is decided on WORKING days in status, not
  // calendar days, so the thresholds line up with FTRA/CBSL working-day windows.
  const workingDaysInStatus = lastChange != null ? workingDaysBetween(lastChange, now) : null;
  const active = ['open', 'investigating', 'remediation'].includes(c.status);
  const isStale = active && !c.falsePositive && workingDaysInStatus != null && workingDaysInStatus >= threshold;

  return { daysSinceCreated, daysInStatus, workingDaysInStatus, isStale, threshold };
}

function formatDays(d) {
  if (d == null) return '—';
  if (d < 1) {
    const h = d * 24;
    return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(h < 10 ? 1 : 0)}h`;
  }
  if (d < 60) return `${d.toFixed(d < 10 ? 1 : 0)}d`;
  return `${Math.floor(d / 30)}mo`;
}

// "N working day(s)" with correct pluralisation (compliance critical SLA = 1).
function workingDaysLabel(n) {
  return `${n} working ${Number(n) === 1 ? 'day' : 'days'}`;
}

function CaseCard({ c, navigate, onOpen, compact }) {
  const { state } = useApp();
  const slaPolicy = state.auditPlan?.slaPolicy || DEFAULT_SLA_POLICY;
  // Use the shared severity palette so medium reads blue everywhere (was gold
  // here only) — consistent with Now, the heatmap, and the severity tokens.
  const sevColor = sevColorOf(c.severity);
  const multiDomain = (c.domainIds || []).length >= 3;
  const noteCount = (c.notes || []).length;
  const timing = computeCaseTiming(c, slaPolicy);
  const sla = timing.workingDaysInStatus != null ? slaStatus(timing.workingDaysInStatus, timing.threshold) : 'unknown';

  return (
    <div
      onClick={() => onOpen && onOpen(c.id)}
      style={{
        background: 'var(--color-surface)', border: `1px solid ${timing.isStale ? '#C41E3A60' : 'var(--color-border)'}`,
        borderLeft: `3px solid ${sevColor}`, borderRadius: 8, padding: compact ? '9px 11px' : '12px 14px',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fontWeight: 800, color: 'var(--color-text-3)' }}>{c.id}</span>
        <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: sevColor + '18', color: sevColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.severity}</span>
        {sla !== 'unknown' && (
          <span title={timing.daysInStatus != null ? `In '${c.status}' for ${formatDays(timing.daysInStatus)} (${workingDaysLabel(timing.workingDaysInStatus ?? 0)}) — SLA for ${c.severity} cases is ${workingDaysLabel(timing.threshold)}` : undefined}>
            <SlaPill status={sla} />
          </span>
        )}
        {multiDomain && (
          <span title={`Touches ${(c.domainIds || []).length} domains`} style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: 'rgba(124,58,237,0.14)', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Layers size={9} /> Multi-domain
          </span>
        )}
      </div>
      <div style={{ fontSize: compact ? 12 : 12.5, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.4, marginBottom: 6 }}>
        {c.title}
      </div>
      {(c.domainIds || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {(c.domainIds || []).slice(0, 4).map(d => (
            <button
              key={d}
              onClick={(e) => { e.stopPropagation(); navigate(`/business-view/${d}`); }}
              style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: 'rgba(245,184,65,0.10)', color: '#B45309', border: '1px solid rgba(245,184,65,0.22)', cursor: 'pointer' }}
            >
              {getDomain(d)?.label.split(' ')[0] || d}
            </button>
          ))}
          {(c.domainIds || []).length > 4 && (
            <span style={{ fontSize: 9.5, color: 'var(--color-text-3)', fontWeight: 700 }}>+{c.domainIds.length - 4}</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {c.exposureLkr > 0 && (
          <Num style={{ fontSize: 11, fontWeight: 800, color: sevColor, fontFamily: 'var(--font-display)' }}>{formatLkr(c.exposureLkr)}</Num>
        )}
        <span style={{ fontSize: 10, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {noteCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#185FA5' }}>
              <MessageCircle size={10} /> {noteCount}
            </span>
          )}
          {c.branch_name ? `${c.branch_name}` : (c.agents || []).length ? `${(c.agents || []).length} agents` : ''}
        </span>
      </div>
      {(timing.daysSinceCreated != null || timing.daysInStatus != null) && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--color-border)', display: 'flex', gap: 10, fontSize: 9.5, color: 'var(--color-text-3)', fontFamily: 'var(--font-mono, monospace)', flexWrap: 'wrap' }}>
          {timing.daysSinceCreated != null && (
            <span>Opened {formatDays(timing.daysSinceCreated)} ago</span>
          )}
          {timing.daysInStatus != null && (
            <span style={{ color: timing.isStale ? '#C41E3A' : 'var(--color-text-3)', fontWeight: timing.isStale ? 800 : 500 }}>
              · In status {formatDays(timing.daysInStatus)}{timing.isStale ? ` (SLA ${workingDaysLabel(timing.threshold)})` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CASE DETAIL DRAWER ──────────────────────────────────────────────────────
// Click a case card → this portal drawer opens. Shows case identity, explain-
// ability (via the shared ExplainabilityPanel if a linked finding exists), a
// stage-transition stepper, and a notes/comments thread persisted in
// state.caseWorkbench.
function CaseDetailDrawer({ caseItem, caseWorkbench = {}, onClose, onStatusChange, onAddNote, onMarkFalsePositive, onUnmarkFalsePositive, navigate }) {
  // Body scroll lock + escape to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const [noteText, setNoteText] = useState('');
  const sevColor = sevColorOf(caseItem.severity);
  const multiDomain = (caseItem.domainIds || []).length >= 3;

  function submitNote() {
    const t = noteText.trim();
    if (!t) return;
    onAddNote(t);
    setNoteText('');
  }

  const [fpFormOpen, setFpFormOpen] = useState(false);
  const isFP = !!caseWorkbench.falsePositive;

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,30,0.38)', zIndex: 9998, display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(760px, 96vw)', height: '100%', background: 'var(--color-bg, #F7F6F1)', overflowY: 'auto', boxShadow: '-16px 0 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Sticky header */}
        <div style={{ position: 'sticky', top: 0, background: 'var(--color-bg, #F7F6F1)', borderBottom: '1px solid var(--color-border)', padding: '14px 20px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)' }}>{caseItem.id}</span>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: sevColor + '18', color: sevColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{caseItem.severity}</span>
              {multiDomain && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: 'rgba(124,58,237,0.14)', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Layers size={10} /> Multi-domain
                </span>
              )}
              {isFP && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: 'rgba(11,191,122,0.14)', color: '#0BBF7A', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✓ Marked false positive
                </span>
              )}
            </div>
            {!isFP && (
              <button
                onClick={() => setFpFormOpen(o => !o)}
                style={{ background: 'none', border: '1px solid rgba(11,191,122,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#0BBF7A', cursor: 'pointer', fontFamily: 'inherit' }}
                title="Mark this case as a false positive and contribute the reason to the feedback loop"
              >
                Mark false positive
              </button>
            )}
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 6, borderRadius: 6, display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
          <h2 style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.35 }}>{caseItem.title}</h2>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Stage transitions */}
          <StageTransitions currentStatus={caseItem.status} onChange={onStatusChange} />

          {/* State-transition timeline — renders the caseWorkbench stateHistory */}
          <StateTransitionTimeline
            caseItem={caseItem}
            history={caseWorkbench.stateHistory || []}
          />

          {/* False-positive form or summary */}
          {(fpFormOpen && !isFP) && (
            <FalsePositiveForm
              caseItem={caseItem}
              onCancel={() => setFpFormOpen(false)}
              onSubmit={(payload) => { onMarkFalsePositive(payload); setFpFormOpen(false); }}
            />
          )}
          {isFP && (
            <FalsePositiveSummary workbench={caseWorkbench} onUnmark={onUnmarkFalsePositive} />
          )}

          {/* Identity block */}
          <DetailSection title="Case identity" icon={Info}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {caseItem.exposureLkr > 0 && <Kv label="Exposure" value={formatLkr(caseItem.exposureLkr)} color={sevColor} />}
              {caseItem.branch_name && <Kv label="Branch" value={`${caseItem.branch_code || ''} ${caseItem.branch_name}`.trim()} />}
              {caseItem.createdAt && <Kv label="Created" value={new Date(caseItem.createdAt).toLocaleString()} />}
              {caseItem.slaHours && <Kv label="SLA" value={`${caseItem.slaHours} h`} />}
            </div>
            {(caseItem.domainIds || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>Domains touched</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(caseItem.domainIds || []).map(d => (
                    <button
                      key={d}
                      onClick={() => { navigate(`/business-view/${d}`); onClose(); }}
                      style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: 'rgba(245,184,65,0.10)', color: '#B45309', border: '1px solid rgba(245,184,65,0.25)', cursor: 'pointer' }}
                    >
                      {getDomain(d)?.label || d}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(caseItem.agents || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>Agents involved</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(caseItem.agents || []).map(a => {
                    const m = AGENT_META[a];
                    if (!m) return null;
                    return (
                      <span key={a} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: m.color + '18', color: m.color }}>
                        {m.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </DetailSection>

          {/* Explainability — reuses the same component the deep-dive uses */}
          <CaseExplainabilitySection caseItem={caseItem} />

          {/* Remediation — the management-action lifecycle to closure */}
          <DetailSection title="Remediation" icon={ClipboardCheck}>
            <RemediationPanel caseId={caseItem.id} />
          </DetailSection>

          {/* Description + recommended action (for auto-generated cases) */}
          {(caseItem.description || caseItem.recommendedAction) && (
            <DetailSection title="Context" icon={AlertOctagon}>
              {caseItem.description && (
                <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 10 }}>{caseItem.description}</div>
              )}
              {caseItem.recommendedAction && (
                <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.55, padding: 12, background: 'rgba(11,191,122,0.06)', borderLeft: '3px solid #0BBF7A', borderRadius: 6 }}>
                  <strong style={{ color: '#0BBF7A' }}>Recommended action:</strong> {caseItem.recommendedAction}
                </div>
              )}
            </DetailSection>
          )}

          {/* Notes & comments */}
          <DetailSection title={`Notes & comments${(caseItem.notes || []).length ? ` · ${caseItem.notes.length}` : ''}`} icon={MessageCircle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {(caseItem.notes || []).length === 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontStyle: 'italic' }}>No notes yet. Add the first one below.</div>
              )}
              {(caseItem.notes || []).map((n, i) => (
                <div key={i} style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid #185FA5', borderRadius: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: '#185FA5' }}>{n.author}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{new Date(n.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note, question, or update for the audit trail…"
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitNote(); } }}
                style={{ flex: 1, resize: 'vertical', padding: '8px 10px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
              <button
                onClick={submitNote}
                disabled={!noteText.trim()}
                style={{ alignSelf: 'flex-end', padding: '7px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: noteText.trim() ? 'pointer' : 'not-allowed', background: '#185FA5', color: 'white', border: 'none', opacity: noteText.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Send size={11} /> Add
              </button>
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--color-text-3)', marginTop: 4 }}>⌘/Ctrl + Enter to save</div>
          </DetailSection>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Case workbench stage buttons — visually kanban-like
function StageTransitions({ currentStatus, onChange }) {
  const effective = STATUS_COLUMNS.find(c => c.id === currentStatus) ? currentStatus : 'open';
  const idx = STATUS_COLUMNS.findIndex(c => c.id === effective);
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 10 }}>
        Stage — click to move this case
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATUS_COLUMNS.length}, 1fr)`, gap: 6 }}>
        {STATUS_COLUMNS.map((col, i) => {
          const active = col.id === effective;
          const done = i < idx;
          return (
            <button
              key={col.id}
              onClick={() => onChange(col.id)}
              style={{
                padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                background: active ? col.accent : done ? col.accent + '18' : 'var(--color-surface-2)',
                color: active ? 'white' : done ? col.accent : 'var(--color-text-2)',
                border: `1px solid ${active ? col.accent : done ? col.accent + '40' : 'var(--color-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}
            >
              {done && <CheckCircle2 size={11} />} {col.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── STATE-TRANSITION TIMELINE ───────────────────────────────────────────────
// Renders the full audit trail of status changes for a case. Every row of the
// caseWorkbench stateHistory becomes a timeline entry: from → to, when, who.
function StateTransitionTimeline({ caseItem, history }) {
  const entries = (history || []).slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  // If no recorded history but a createdAt is present, synthesise the opening event.
  if (entries.length === 0 && caseItem.createdAt) {
    entries.push({ from: null, to: caseItem.status || 'open', at: caseItem.createdAt, by: 'System' });
  }
  if (entries.length === 0) return null;

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Clock size={12} style={{ color: '#B45309' }} />
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
          State transitions — {entries.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {entries.map((t, i) => {
          const last = i === entries.length - 1;
          const toColor = statusColor(t.to);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 10, position: 'relative' }}>
              {/* Marker column */}
              <div style={{ position: 'relative', width: 22 }}>
                <span style={{ position: 'absolute', left: 7, top: 4, width: 8, height: 8, borderRadius: 4, background: toColor, boxShadow: `0 0 0 3px ${toColor}18` }} />
                {!last && (
                  <span style={{ position: 'absolute', left: 10, top: 14, bottom: -8, width: 2, background: 'var(--color-border)' }} />
                )}
              </div>
              {/* Transition text */}
              <div style={{ padding: '2px 0 12px' }}>
                <div style={{ fontSize: 11.5, color: 'var(--color-text)', fontWeight: 600 }}>
                  {t.from ? (
                    <>
                      <StatusInline status={t.from} dim />
                      <span style={{ color: 'var(--color-text-3)', margin: '0 6px' }}>→</span>
                      <StatusInline status={t.to} />
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'var(--color-text-3)', marginRight: 4 }}>Opened as</span>
                      <StatusInline status={t.to} />
                    </>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 2 }}>
                  {new Date(t.at).toLocaleString()} · by {t.by || 'System'}
                </div>
              </div>
              {/* Age since this event */}
              <div style={{ padding: '2px 0', fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
                {formatDays(hoursFrom(t.at) / 24)} ago
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusInline({ status, dim }) {
  const color = statusColor(status);
  return (
    <span style={{
      display: 'inline-block', fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 5,
      background: color + (dim ? '10' : '18'), color: dim ? 'var(--color-text-3)' : color,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {status === 'investigating' ? 'invest.' : status}
    </span>
  );
}

function statusColor(s) {
  return s === 'open' ? '#C41E3A'
    : s === 'investigating' ? '#B45309'
    : s === 'remediation'   ? '#CA8A04'
    : s === 'resolved' || s === 'closed' ? '#0BBF7A'
    : 'var(--color-text-3)';
}

function hoursFrom(iso) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

// ─── FALSE-POSITIVE FORM + SUMMARY ───────────────────────────────────────────
const FP_CATEGORIES = [
  { id: 'threshold_too_sensitive',       label: 'Threshold too sensitive',         hint: 'The rule fired but the underlying pattern is within normal business behaviour — threshold is tuned too tight.' },
  { id: 'data_quality_issue',            label: 'Data quality issue',              hint: 'Input data was stale, mis-mapped, or missing context. Fix the data pipeline, not the rule.' },
  { id: 'legitimate_business_activity',  label: 'Legitimate business activity',    hint: 'Pattern matches the rule, but the context (sector, channel, customer type) is genuinely normal and documented.' },
  { id: 'duplicate_with_other_finding',  label: 'Duplicate of another finding',    hint: 'Another agent already flagged the same pattern; this is a redundant surfacing.' },
  { id: 'outdated_rule',                 label: 'Rule is outdated',                hint: 'The rule reflects an older policy; the current CBSL / SLFRS / FATF guidance is different.' },
  { id: 'other',                         label: 'Other',                           hint: 'None of the above — describe in detail.' },
];

function FalsePositiveForm({ caseItem, onCancel, onSubmit }) {
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [suggestedRuleId, setSuggestedRuleId] = useState('');

  // Surface the thresholds tied to the source agent as an optional hint dropdown.
  const suggestionOptions = useMemo(() => {
    const agentId = caseItem.agentId || (caseItem.agents && caseItem.agents[0]);
    const block = THRESHOLDS[agentId];
    if (!block?.rules) return [];
    return block.rules.map(r => ({ id: r.id, label: `${r.label} (${r.id})` }));
  }, [caseItem]);

  const selectedCategory = FP_CATEGORIES.find(c => c.id === category);
  const canSubmit = category && reason.trim().length >= 20;

  return (
    <div style={{ background: 'rgba(11,191,122,0.05)', border: '1px solid rgba(11,191,122,0.25)', borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0BBF7A', marginBottom: 10 }}>
        Mark case as false positive
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.5, margin: '0 0 12px' }}>
        Your reason feeds the <strong>Feedback Loop agent</strong>. When 3+ similar false positives accumulate on the same agent rule, the agent will recommend a rule-parameter change that an authorised approver can accept in Rule Parameters. Nothing changes automatically.
      </p>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'block', marginBottom: 4 }}>Category *</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 6, background: 'white' }}
        >
          <option value="">— Select a category —</option>
          {FP_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {selectedCategory && (
          <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 4, fontStyle: 'italic' }}>{selectedCategory.hint}</div>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'block', marginBottom: 4 }}>Reason * (min 20 chars)</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Why is this a false positive? Be specific — the feedback loop agent uses this rationale to calibrate its recommendation."
          style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 6, background: 'white', fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }}
        />
      </div>

      {suggestionOptions.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'block', marginBottom: 4 }}>Suggested rule to adjust (optional)</label>
          <select
            value={suggestedRuleId}
            onChange={e => setSuggestedRuleId(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 6, background: 'white' }}
          >
            <option value="">— No suggestion —</option>
            {suggestionOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button
          onClick={onCancel}
          style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', borderRadius: 6, fontFamily: 'inherit' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit({ category, reason: reason.trim(), suggestedRuleId: suggestedRuleId || null, author: 'Auditor' })}
          disabled={!canSubmit}
          style={{ padding: '6px 14px', fontSize: 11.5, fontWeight: 800, cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? '#0BBF7A' : 'var(--color-surface-2)', color: canSubmit ? 'white' : 'var(--color-text-3)', border: 'none', borderRadius: 6, fontFamily: 'inherit', opacity: canSubmit ? 1 : 0.6 }}
        >
          Submit false positive
        </button>
      </div>
    </div>
  );
}

function FalsePositiveSummary({ workbench, onUnmark }) {
  const cat = FP_CATEGORIES.find(c => c.id === workbench.falsePositiveCategory);
  return (
    <div style={{ background: 'rgba(11,191,122,0.05)', border: '1px solid rgba(11,191,122,0.25)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0BBF7A' }}>
          Marked false positive
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--color-text-3)' }}>
          {workbench.falsePositiveMarkedAt ? new Date(workbench.falsePositiveMarkedAt).toLocaleString() : ''} · {workbench.falsePositiveMarkedBy || 'Auditor'}
        </span>
        <button
          onClick={onUnmark}
          style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '3px 10px', fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Unmark
        </button>
      </div>
      {cat && (
        <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', marginBottom: 6 }}>
          <strong style={{ color: 'var(--color-text)' }}>Category:</strong> {cat.label}
        </div>
      )}
      {workbench.falsePositiveReason && (
        <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5, marginBottom: 6, whiteSpace: 'pre-wrap' }}>
          <strong style={{ color: 'var(--color-text-3)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Reason</strong>
          {workbench.falsePositiveReason}
        </div>
      )}
      {workbench.falsePositiveSuggestedRuleId && (
        <div style={{ fontSize: 11, color: 'var(--color-text-2)' }}>
          <strong style={{ color: 'var(--color-text-3)' }}>Suggested rule to adjust:</strong> <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{workbench.falsePositiveSuggestedRuleId}</span>
        </div>
      )}
    </div>
  );
}

function CaseExplainabilitySection({ caseItem }) {
  // Use the agentId from auto-generated cases OR the first agent from static cases
  const agentId = caseItem.agentId || (caseItem.agents && caseItem.agents[0]) || null;
  // Resolve the SPECIFIC finding this case was promoted from, so the trail grounds
  // to this case's entity / exposure / severity — not a default. Auto-generated
  // cases carry the agent result in .evidence and the source index in
  // .findingIndex. Memoised (stable reference) so useExplainability's effect deps
  // don't loop. Keyed on the fields the value is derived from.
  const finding = useMemo(() => {
    const kf = caseItem.evidence?.key_findings;
    if (Array.isArray(kf) && Number.isInteger(caseItem.findingIndex) && kf[caseItem.findingIndex]) {
      return kf[caseItem.findingIndex];
    }
    if (Array.isArray(kf) && kf.length === 1) return kf[0];
    // Static fixture cases carry NON-EMPTY finding_ids (engine cases are
    // normalised to [] — empty, so don't treat that as a static case).
    if (Array.isArray(caseItem.finding_ids) && caseItem.finding_ids.length) {
      return { entity_ids: caseItem.finding_ids, finding: caseItem.title };
    }
    // Last resort — synthesise a minimal finding from the case fields so the
    // generator still grounds to the right text, severity, and exposure.
    return { finding: caseItem.description || caseItem.title, severity: caseItem.severity, affected_exposure_lkr: caseItem.exposureLkr };
  }, [caseItem.id, caseItem.evidence, caseItem.findingIndex, caseItem.title, caseItem.description, caseItem.severity, caseItem.exposureLkr, caseItem.finding_ids]);
  const findingIndex = Number.isInteger(caseItem.findingIndex) ? caseItem.findingIndex : 0;
  const { loading, source, data, error } = useExplainability(agentId, findingIndex, finding);

  if (!agentId) return null;

  return (
    <DetailSection title="Explainability" icon={Layers}>
      <ExplainabilityPanel
        loading={loading}
        source={source}
        data={data}
        error={error}
        finding={finding}
        agentId={agentId}
      />
    </DetailSection>
  );
}

function DetailSection({ title, icon: Icon, children }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        {Icon && <Icon size={13} style={{ color: '#B45309' }} />}
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Kv({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: color || 'var(--color-text)', fontFamily: color ? 'var(--font-display)' : 'inherit', marginTop: 3 }}>{value}</div>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
// Map every agent to the business domains it feeds, derived once from
// domainRegistry. This is the same source of truth that DomainDeepDive's
// Agent Roster used, so Case Manager groups consistently with deep-dive.
let _agentToDomainsCache = null;
function agentToDomains() {
  if (_agentToDomainsCache) return _agentToDomainsCache;
  const m = {};
  for (const d of DOMAINS) {
    for (const a of d.agentsPrimary || []) {
      if (!m[a]) m[a] = new Set();
      m[a].add(d.id);
    }
    for (const a of d.agentsSecondary || []) {
      if (!m[a]) m[a] = new Set();
      m[a].add(d.id);
    }
  }
  _agentToDomainsCache = m;
  return m;
}

function agentsToDomainIds(agentIds) {
  const map = agentToDomains();
  const out = new Set();
  for (const a of agentIds || []) {
    const doms = map[a];
    if (doms) doms.forEach(d => out.add(d));
  }
  // Fallback: if no domain matches, bucket under 'risk' so the case is visible
  return out.size ? [...out] : ['risk'];
}

// ─── FINDING AGEING + SLA BOARD (Wave 5) ─────────────────────────────────────
// Ageing distribution of all active cases against the configurable SLA
// policy on the Audit Plan page. The board is the CAE's view of "who's
// breaching SLA right now" with drill-through to the filtered case list.
//   • Ageing buckets (< 3d / 3-7d / 7-14d / 14-30d / 30+)
//   • Per-bucket: count + how many breach SLA
//   • Domain x severity matrix of breached SLAs (which cases need escalation)
//   • Escalation call-out for cases crossing 2x the SLA threshold
function AgeingSlaBoard({ cases, slaPolicy, isCustomSla, onFilterStale }) {
  const stats = useMemo(() => computeAgeingStats(cases || [], slaPolicy), [cases, slaPolicy]);
  const active = stats.activeCases;
  if (active.length === 0) return null;

  const totalBreached = active.filter(s => s.slaStatus !== 'green').length;
  const escalationRequired = active.filter(s => s.slaStatus === 'red');

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid #B45309', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <TimerReset size={14} style={{ color: '#B45309' }} />
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>Finding ageing & SLA board</div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: isCustomSla ? 'rgba(11,191,122,0.14)' : 'rgba(245,184,65,0.12)', color: isCustomSla ? '#0BBF7A' : '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isCustomSla ? 'Audit-plan policy' : 'Default policy (not configured)'}
        </span>
        {totalBreached > 0 && (
          <button onClick={onFilterStale} style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', background: 'rgba(196,30,58,0.14)', color: '#C41E3A', border: '1px solid rgba(196,30,58,0.35)', borderRadius: 6 }}>
            {totalBreached} breach{totalBreached === 1 ? '' : 'es'} · show stale only
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-2)', lineHeight: 1.55, marginBottom: 10 }}>
        Active cases ({active.length}) grouped by days in current status. SLA is resolved per case as the tightest applicable domain × severity policy. Breach = days-in-status &gt; SLA; critical breach = &gt; 2× SLA and requires EXCO escalation.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
        {AGEING_BUCKETS.map(bucket => {
          const bucketCases = active.filter(s => s.bucket === bucket.id);
          const breached = bucketCases.filter(s => s.slaStatus !== 'green').length;
          const color = breached > 0 ? '#C41E3A' : bucketCases.length > 0 ? '#B45309' : 'var(--color-text-3)';
          return (
            <div key={bucket.id} style={{ padding: '9px 11px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${color}`, borderRadius: 6 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{bucket.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', fontFamily: 'var(--font-display)', marginTop: 2 }}>{bucketCases.length}</div>
              {breached > 0 && (
                <div style={{ fontSize: 10, color: '#C41E3A', fontWeight: 700, marginTop: 2 }}>{breached} breach{breached === 1 ? '' : 'es'}</div>
              )}
            </div>
          );
        })}
      </div>

      {escalationRequired.length > 0 && (
        <div style={{ padding: 12, background: 'rgba(196,30,58,0.06)', border: '1px solid rgba(196,30,58,0.25)', borderLeft: '3px solid #C41E3A', borderRadius: 6, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <AlertOctagon size={13} style={{ color: '#C41E3A' }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#C41E3A' }}>EXCO escalation required</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text)', lineHeight: 1.55 }}>
            {escalationRequired.length} active case{escalationRequired.length === 1 ? '' : 's'} {escalationRequired.length === 1 ? 'has' : 'have'} exceeded 2× the SLA threshold. Per the audit-plan escalation policy, critical cases at this ageing must be reported to the Executive Committee within 24 hours; compliance cases carrying FTRA §7 deadlines must be escalated to CEO / CBSL FIU immediately.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {escalationRequired.slice(0, 8).map(s => (
              <span key={s.caseId} style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 5, background: 'rgba(196,30,58,0.12)', color: '#C41E3A', fontFamily: 'var(--font-mono, monospace)' }}>
                {s.caseId} · {(s.workingDaysInStatus ?? s.daysInStatus).toFixed(0)} / {workingDaysLabel(s.slaDays)}
              </span>
            ))}
            {escalationRequired.length > 8 && <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>+{escalationRequired.length - 8} more</span>}
          </div>
        </div>
      )}

      {stats.breachMatrix.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>SLA breaches by domain × severity</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)' }}>
                <th style={{ padding: '5px 10px', textAlign: 'left', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Domain</th>
                {['critical', 'high', 'medium', 'low'].map(sev => (
                  <th key={sev} style={{ padding: '5px 10px', textAlign: 'center', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{sev}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.breachMatrix.map(row => (
                <tr key={row.domainId} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--color-text)' }}>{row.domainLabel}</td>
                  {['critical', 'high', 'medium', 'low'].map(sev => {
                    const count = row[sev] || 0;
                    return (
                      <td key={sev} style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {count > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-display)', color: sev === 'critical' ? '#C41E3A' : '#B45309' }}>{count}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-3)' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <AsOfStamp compact source="Ageing = now vs last status change · SLA from audit plan" />
      </div>
    </div>
  );
}

function computeAgeingStats(cases, slaPolicy) {
  const active = [];
  for (const c of cases) {
    if (!['open', 'investigating', 'remediation'].includes(c.status)) continue;
    if (c.falsePositive) continue;
    const timing = computeCaseTiming(c, slaPolicy);
    if (timing.daysInStatus == null) continue;
    active.push({
      caseId: c.id,
      severity: (c.severity || 'medium').toLowerCase(),
      domainIds: c.domainIds || [],
      daysInStatus: timing.daysInStatus,
      workingDaysInStatus: timing.workingDaysInStatus,
      slaDays: timing.threshold,
      bucket: bucketForAge(timing.daysInStatus), // calendar buckets ("< 3 days") stay calendar
      slaStatus: slaStatus(timing.workingDaysInStatus ?? timing.daysInStatus, timing.threshold),
    });
  }

  const matrix = {};
  for (const s of active) {
    if (s.slaStatus === 'green') continue;
    for (const domainId of s.domainIds) {
      const d = getDomain(domainId);
      if (!d) continue;
      if (!matrix[domainId]) {
        matrix[domainId] = { domainId, domainLabel: d.label, critical: 0, high: 0, medium: 0, low: 0 };
      }
      matrix[domainId][s.severity] = (matrix[domainId][s.severity] || 0) + 1;
    }
  }
  const breachMatrix = Object.values(matrix).sort((a, b) => (b.critical + b.high) - (a.critical + a.high));

  return { activeCases: active, breachMatrix };
}
