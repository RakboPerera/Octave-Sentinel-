import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { fixtureCases } from '../../data/caseRegistry.js';
import { useBankScale } from '../../hooks/useDomainData.js';
import { resolveFloors } from '../../data/regulatoryFloors.js';
import { executiveData } from '../../data/demoData.js';
import { resolveCaseSla, slaStatus, workingDaysBetween } from '../../utils/slaPolicy.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import OrchestratorPanel from '../../components/business/OrchestratorPanel.jsx';
import AsOfStamp from '../../components/business/AsOfStamp.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import { Card, Eyebrow, SectionTitle, Chip, SlaPill, BandMeter, Sparkline, Num, sevColor } from '../../components/shared/ui.jsx';
import { AlertOctagon, Clock, FolderKanban, ChevronRight, Grid3x3, Database, ArrowRight, Upload } from 'lucide-react';

// ─── NOW — THE TRIAGE LANDING ────────────────────────────────────────────────
// Replaces the 99-cell heatmap as the default home. Answers the only question
// an auditor has on Monday morning: "what needs me today?" Rebuilt on the
// shared UI primitives as the visual reference for the rest of the platform —
// severity-edged cards, SLA pills, KRI band meters, tabular figures, calm type.

const SEV_RANK = { critical: 3, high: 2, medium: 1, low: 0 };
const OPEN_STATUSES = new Set(['open', 'investigating', 'remediation']);

// Per-ratio explanations for the KRI rail. Each says what the ratio is, its CBSL
// floor, and how to read the band meter (value vs floor vs internal appetite).
const KRI_HELP = {
  tier1_car: 'Tier 1 Capital Adequacy Ratio — core (going-concern) capital as a share of risk-weighted assets. CBSL floor is 8.5% (Basel III, Direction 01/2016); green is at or above Demo Bank\'s internal appetite, amber sits between the floor and appetite, red is a breach of the regulatory floor.',
  lcr: 'Liquidity Coverage Ratio — high-quality liquid assets against 30-day net stressed outflows. CBSL floor is 100%; the band meter reads green at or above internal appetite, amber between floor and appetite, red below the 100% floor.',
  nsfr: 'Net Stable Funding Ratio — available stable funding against the funding a one-year horizon requires. CBSL floor is 100%; green is at or above internal appetite, amber between floor and appetite, red below the floor.',
  stage3_ratio: 'Stage 3 (credit-impaired) loans as a share of gross loans — the impaired-book gauge under SLFRS 9. This is a ceiling, so lower is better: red above the 5% observable norm, amber between internal appetite and that ceiling, green at or below appetite.',
};

function bandStatus(floor, value) {
  if (!floor || value == null || !Number.isFinite(value)) return null;
  const { compare, value: limit, internal_appetite } = floor;
  if (compare === 'gte') {
    if (value < limit) return 'red';
    if (internal_appetite != null && value < internal_appetite) return 'amber';
    return 'green';
  }
  if (value > limit) return 'red';
  if (internal_appetite != null && value > internal_appetite) return 'amber';
  return 'green';
}

// Pull an 8-quarter series for a ratio from the demo regulatory trend so the
// KRI rail can show a sparkline of where the number has been heading.
function trendSeries(field) {
  const rows = executiveData?.regulatory_trend;
  if (!Array.isArray(rows)) return [];
  return rows.map(r => r?.[field]).filter(v => typeof v === 'number' && Number.isFinite(v));
}

// Persona lens (Fix #5) — Sentinel serves three audit personas with different
// questions. Same engine output, framed for who's signed in: the CAE/Head wants
// coverage + assurance + remediation; a reviewer wants what's awaiting conclusion;
// a preparer wants their worklist. A focused adaptation, not separate dashboards.
function personaFor(role) {
  const r = String(role || '');
  if (/Head of Internal Audit|Chief Internal Auditor|Chief Risk|Chief Compliance/i.test(r)) return 'approver';
  if (/Senior Audit Manager|Manager|Reviewer/i.test(r)) return 'reviewer';
  return 'preparer';
}
function PersonaLens({ role, navigate }) {
  const persona = personaFor(role);
  const cfg = {
    approver: { label: role || 'Head of Internal Audit', lens: 'Your lens: portfolio coverage, detection precision & calibration, and whether findings are being remediated.', cta: 'Detection Assurance', to: '/business-view/detection-assurance', color: '#185FA5' },
    reviewer: { label: role || 'Senior Audit Manager', lens: 'Your lens: cases awaiting independent conclusion (four-eyes) and remediation falling overdue.', cta: 'Review queue', to: '/business-view/investigate', color: '#B45309' },
    preparer: { label: role || 'Auditor', lens: 'Your lens: your worklist — the open findings to investigate, evidence, and document.', cta: 'Open worklist', to: '/business-view/investigate', color: '#0F6E56' },
  }[persona];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 16px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', background: cfg.color, padding: '3px 9px', borderRadius: 6 }}>{cfg.label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--color-text-2)', flex: 1, lineHeight: 1.5 }}>{cfg.lens}</span>
      <button onClick={() => navigate(cfg.to)} style={{ fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 8, border: `1px solid ${cfg.color}`, background: 'var(--color-surface)', color: cfg.color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{cfg.cta} <ArrowRight size={13} /></button>
    </div>
  );
}

export default function Now() {
  const navigate = useNavigate();
  const { state } = useApp();
  const caseWorkbench = state.caseWorkbench || {};
  const scale = useBankScale();
  const isLive = Object.keys(state.agentResults || {}).length > 0;
  const floors = resolveFloors(state.appetiteOverrides);

  const cases = useMemo(() => {
    const byId = new Map();
    const add = (c) => {
      if (byId.has(c.id)) return;
      const wb = caseWorkbench[c.id] || {};
      byId.set(c.id, {
        id: c.id, title: c.title,
        severity: (c.severity || 'medium').toLowerCase(),
        status: wb.status || c.status || 'open',
        exposureLkr: c.exposureLkr || 0,
        createdAt: c.createdAt,
        falsePositive: !!wb.falsePositive,
      });
    };
    // Fixtures only when the engine has no cases of its own — once a run exists,
    // its cases are the truth (fixtureCases handles this so counts don't double).
    fixtureCases(state).forEach(add);
    (state.cases || []).forEach(add);
    return [...byId.values()].filter(c => !c.falsePositive);
  }, [state.cases, caseWorkbench, state.demoMode]);

  const enriched = useMemo(() => {
    const now = Date.now();
    return cases.filter(c => OPEN_STATUSES.has(c.status)).map(c => {
      const createdMs = c.createdAt ? new Date(c.createdAt).getTime() : null;
      const ageDays = createdMs ? Math.floor((now - createdMs) / 86400000) : 0; // calendar — for display
      const slaDays = resolveCaseSla({ severity: c.severity }, null);
      // CC3: SLA breach is decided on WORKING days (FTRA/CBSL deadlines), not
      // calendar days — a Friday-opened case isn't "2 days in" by Sunday.
      const workDays = createdMs != null ? (workingDaysBetween(createdMs, now) ?? 0) : 0;
      const sla = slaStatus(workDays, slaDays);
      const dueIn = slaDays - workDays; // +ve = working days left, -ve = overdue
      return { ...c, ageDays, slaDays, sla, dueIn };
    }).sort((a, b) => {
      const s = (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0);
      if (s) return s;
      const order = { red: 2, amber: 1, green: 0, unknown: 0 };
      const sl = (order[b.sla] ?? 0) - (order[a.sla] ?? 0);
      if (sl) return sl;
      if (b.exposureLkr !== a.exposureLkr) return b.exposureLkr - a.exposureLkr;
      return b.ageDays - a.ageDays;
    });
  }, [cases]);

  const openCriticals = enriched.filter(c => c.severity === 'critical').length;
  const slaBreaching = enriched.filter(c => c.sla === 'red').length;
  const totalOpen = enriched.length;

  const kris = [
    { key: 'tier1_car', label: 'Tier 1 CAR', value: scale.tier1Pct, dp: 2, series: trendSeries('tier1') },
    { key: 'lcr', label: 'LCR', value: scale.lcrPct, dp: 1, series: trendSeries('lcr') },
    { key: 'nsfr', label: 'NSFR', value: scale.nsfrPct, dp: 1, series: trendSeries('nsfr') },
    { key: 'stage3_ratio', label: 'Stage 3 ratio', value: scale.stage3Pct, dp: 2, series: [] },
  ].map(k => { const floor = floors[k.key]; return { ...k, status: bandStatus(floor, k.value), floor, help: KRI_HELP[k.key] }; });

  const openInvestigate = (extra) => navigate('/business-view/investigate', { state: extra || {} });

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Demo→Live ribbon — the one prominent, actionable data-state cue. The
          header keeps a quiet always-on badge; this is the page-level callout
          that turns "you're on the demo" into a one-click path to go live. */}
      {!isLive && <DemoRibbon onUpload={() => navigate('/business-view/data')} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>What needs you today</h2>
          <div style={{ marginTop: 6 }}>
            <AsOfStamp source={isLive && !state.demoMode ? 'Live agent run' : isLive ? 'Bundled demo dataset — analysed by the engine' : 'Demo dataset — connect the data lake in Settings → Data Sources to run live'} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Demo state gets the actionable ribbon above; live state needs no
              page-level chip — the header badge is the single persistent cue. */}
          <button onClick={() => navigate('/business-view/heatmap')} style={ghostBtn}>
            <Grid3x3 size={13} /> View as heatmap
          </button>
        </div>
      </div>

      {/* Persona lens — the same data, framed for who's looking (Fix #5). */}
      <PersonaLens role={state.auth?.user?.role} navigate={navigate} />

      {/* Triage strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <TriageTile label="Open criticals" value={openCriticals} accent="#C41E3A" icon={AlertOctagon} onClick={() => openInvestigate({ severityFilter: 'critical' })} help="Open cases whose severity is critical — the deterministic engine sets severity from the rule that fired, not a judgement call. Counts unresolved cases only (open, investigating or in remediation); resolved and false-positive cases drop out." />
        <TriageTile label="Breaching SLA" value={slaBreaching} accent="#B45309" icon={Clock} onClick={() => openInvestigate({ staleOnly: true })} help="Cases open longer than 2× their severity-based SLA. Compliance findings (FTRA/CBSL) carry the tightest SLAs." />
        <TriageTile label="Open cases" value={totalOpen} accent="#185FA5" icon={FolderKanban} onClick={() => openInvestigate()} help="Every unresolved case in the queue — open, investigating or in remediation — across all severities. False positives are excluded. Click to open the full case list." />
      </div>

      {/* Two-column: queue + KRI rail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        <Card padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionTitle>Today's queue</SectionTitle>
            <button onClick={() => openInvestigate()} style={{ ...ghostBtn, fontSize: 11, padding: '5px 10px' }}>
              All cases <ArrowRight size={12} />
            </button>
          </div>
          {enriched.length === 0 ? (
            <EmptyQueue isLive={isLive} onUpload={() => navigate('/business-view/data')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {enriched.slice(0, 8).map(c => (
                <QueueCard key={c.id} c={c} onOpen={() => openInvestigate({ openCaseId: c.id })} />
              ))}
            </div>
          )}
        </Card>

        <Card padding={16}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Eyebrow>Key ratios</Eyebrow>
              <InfoHint
                title="Key ratios"
                text="The four prudential ratios that decide whether the bank stays open: Tier 1 capital adequacy, LCR, NSFR and the Stage 3 impairment ratio. Each row reads the latest value against its statutory CBSL floor and Demo Bank's internal appetite, with a band meter and an 8-quarter trend where available. Values come straight from the bank-scale figures — no model, no estimate."
                align="left"
              />
            </span>
            <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 4, lineHeight: 1.45 }}>
              Value vs <span style={{ color: '#C41E3A', fontWeight: 700 }}>CBSL floor</span> and <span style={{ color: '#B45309', fontWeight: 700 }}>internal appetite</span>.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {kris.map(k => <KriRow key={k.key} k={k} />)}
          </div>
          <button onClick={() => navigate('/business-view/position')} style={{ ...ghostBtn, fontSize: 11, marginTop: 14, width: '100%', justifyContent: 'center' }}>
            Full bank position <ArrowRight size={12} />
          </button>
        </Card>
      </div>

      <OrchestratorPanel />
    </div>
  );
}

function DemoRibbon({ onUpload }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      padding: '12px 16px', borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(90deg, rgba(245,184,65,0.16), rgba(245,184,65,0.06))',
      border: '1px solid rgba(245,184,65,0.4)', borderLeft: '3px solid #B45309',
    }}>
      <span style={{ display: 'flex', width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: 'rgba(245,184,65,0.22)', color: '#B45309', flexShrink: 0 }}>
        <Database size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#B45309', letterSpacing: '-0.01em' }}>You're viewing the demo dataset</div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', marginTop: 2, lineHeight: 1.45 }}>
          Every figure below is bundled sample data. Connect the bank data lake to run all 17 agents on your own portfolio.
        </div>
      </div>
      <button onClick={onUpload} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9,
        fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
        background: 'linear-gradient(135deg, #F5B841, #E09A1F)', color: 'white', border: 'none',
      }}>
        <Upload size={14} /> Connect data sources
      </button>
    </div>
  );
}

function TriageTile({ label, value, accent, icon: Icon, onClick, help }) {
  return (
    <div style={{
      position: 'relative',
      background: `linear-gradient(180deg, ${accent}0A 0%, var(--color-surface) 70%)`,
      border: '1px solid var(--color-border)', borderLeft: `3px solid ${accent}`, borderRadius: 'var(--radius-lg)',
      transition: 'all 0.15s var(--ease-out)',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* role=button (not a <button>) so the click-through InfoHint — itself a
          <button> — can sit inside it without nesting a button in a button. */}
      <div role="button" tabIndex={0} onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        style={{
        textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%',
        background: 'none', border: 'none', borderRadius: 'var(--radius-lg)', padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Eyebrow>{label}</Eyebrow>
            {help && <InfoHint title={label} text={help} size={12} align="left" />}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: accent, fontFamily: 'var(--font-display)', lineHeight: 1.1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        </div>
        <Icon size={22} style={{ color: accent, opacity: 0.45 }} />
      </div>
    </div>
  );
}

function QueueCard({ c, onOpen }) {
  const sc = sevColor(c.severity);
  const dueLabel = c.dueIn >= 0 ? `due in ${c.dueIn} working ${c.dueIn === 1 ? 'day' : 'days'}` : `${Math.abs(c.dueIn)} working ${Math.abs(c.dueIn) === 1 ? 'day' : 'days'} overdue`;
  return (
    <button onClick={onOpen} style={{
      textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%',
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${sc}`, borderRadius: 8, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.12s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <Chip tone={c.severity} solid>{c.severity}</Chip>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
        <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
          {c.exposureLkr > 0 && <Num>{formatLkr(c.exposureLkr)}</Num>}
          <span>opened {c.ageDays}d ago · {dueLabel}</span>
        </div>
      </div>
      <SlaPill status={c.sla} />
      <ChevronRight size={15} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
    </button>
  );
}

function KriRow({ k }) {
  const color = { red: '#C41E3A', amber: '#B45309', green: '#0BBF7A' }[k.status] || 'var(--color-text-3)';
  const valStr = k.value != null && Number.isFinite(k.value) ? `${Number(k.value).toFixed(k.dp)}%` : '—';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-2)' }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} /> {k.label}
          {k.help && <InfoHint title={k.label} text={k.help} size={11} align="left" />}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {k.series.length > 1 && <Sparkline data={k.series} color={color} unit="%" dp={k.dp} label={k.label} />}
          <Num style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{valStr}</Num>
        </span>
      </div>
      {k.floor && <BandMeter value={k.value} floor={k.floor.value} appetite={k.floor.internal_appetite} compare={k.floor.compare} status={k.status} unit="%" dp={k.dp} />}
    </div>
  );
}

function EmptyQueue({ isLive, onUpload }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-2)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>No open cases.</div>
      {!isLive && (
        <>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>Sync your data sources and run the agents to populate the queue with live findings.</div>
          <button onClick={onUpload} style={{ ...ghostBtn, margin: '12px auto 0' }}>
            <Database size={13} /> Go to Data Sources
          </button>
        </>
      )}
    </div>
  );
}

const ghostBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', fontFamily: 'inherit',
};
