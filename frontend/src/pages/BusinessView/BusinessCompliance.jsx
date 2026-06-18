import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DOMAINS } from '../../data/domainRegistry.js';
import { useAllFindings, useResolvedResults, useAuditPlanMateriality } from '../../hooks/useDomainData.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import { dedupedExposureBreakdown } from '../../utils/exposureDedup.js';
import { readLedger } from '../../utils/runLedger.js';
import { REGULATORY_FLOORS, COMPLIANCE_FRAMEWORKS, evaluateAgainstFloor, resolveFloors } from '../../data/regulatoryFloors.js';
import { useApp } from '../../context/AppContext.jsx';
import { ClipboardCheck, Shield, TrendingUp } from 'lucide-react';
import InfoHint from '../../components/business/InfoHint.jsx';

// ─── BUSINESS COMPLIANCE SCORING (Wave 2 rebuild) ────────────────────────────
// Audit-grade scoring:
//   1. Bank-wide framework composites are driven by REGULATORY_FLOORS (single
//      source of truth with CBSL/Basel/SLFRS/FTRA citations) — the value is
//      the % of floors in green for that framework, with any 'regulatory-breach'
//      forcing the framework to its floor.
//   2. Per-domain score is exposure-weighted against audit-plan materiality,
//      not a count-based penalty. A LKR 50 Mn critical and a LKR 50 Bn
//      critical no longer scored identically.
//   3. Unmeasured / missing-data floors are disclosed explicitly rather than
//      silently dropping out of the composite.
// Replaces the old count-based 100 − crit×9 − high×4 − med×1 scheme which
// was flagged as audit-indefensible in the review.

export default function BusinessCompliance() {
  const navigate = useNavigate();
  const results = useResolvedResults();
  const allFindings = useAllFindings();
  const { performanceMateriality, tolerableMisstatement } = useAuditPlanMateriality();
  const { state } = useApp();
  const appetiteOverrides = state.appetiteOverrides || {};

  // Measured values for each regulatory floor — derived only from agent output.
  const measurements = useMemo(() => deriveMeasurements(results), [results]);

  // Per-framework composites built from the floors in REGULATORY_FLOORS, with
  // the bank's configured internal-appetite overrides applied.
  const frameworkScores = useMemo(() => computeFrameworkScores(measurements, appetiteOverrides), [measurements, appetiteOverrides]);

  // Bank-wide composite — weighted average of framework scores (only measured ones).
  const composite = useMemo(() => {
    const presentScores = Object.values(frameworkScores).filter(s => s.score != null);
    if (presentScores.length === 0) return { value: null, missing: Object.keys(frameworkScores) };
    const value = Math.round(presentScores.reduce((a, s) => a + s.score, 0) / presentScores.length);
    const missing = Object.entries(frameworkScores).filter(([, s]) => s.score == null).map(([k]) => k);
    return { value, missing };
  }, [frameworkScores]);

  // Per-domain — exposure-weighted against materiality.
  const perDomain = useMemo(() => computePerDomain(allFindings, performanceMateriality, tolerableMisstatement), [allFindings, performanceMateriality, tolerableMisstatement]);

  const now = useMemo(() => new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', []);

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Header composite={composite} asOf={now} />

      <FrameworkGrid scores={frameworkScores} />

      <ComplianceTrendChart />

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <SectionHeader
          title="Compliance by domain"
          icon={ClipboardCheck}
          help="Per-domain compliance composite built from (a) coverage of primary agents for the domain, (b) count of critical/high findings, and (c) aggregate flagged exposure against audit-plan materiality. Entity-level deduplication is applied — the same customer flagged by 3 agents counts once per domain."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {DOMAINS.map(d => {
            const p = perDomain[d.id];
            const color = p.score >= 85 ? '#0BBF7A' : p.score >= 65 ? '#B45309' : '#C41E3A';
            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/business-view/${d.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/business-view/${d.id}`); } }}
                style={{ background: 'var(--color-surface-2)', border: `1px solid var(--color-border)`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--color-text)' }}>{d.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.ownerRole}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{p.score}</div>
                    <DomainScoreExplain domainLabel={d.label} detail={p} color={color} />
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ color: '#C41E3A' }}>{p.criticals} crit</span>
                  <span style={{ color: '#B45309' }}>{p.highs} high</span>
                  <span style={{ color: 'var(--color-text-3)' }}>{p.mediums} med</span>
                  {p.exposureLkr > 0 && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-2)' }}>
                      {formatLkr(p.exposureLkr)}
                    </span>
                  )}
                </div>
                <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${p.score}%`, height: '100%', background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RegulatoryFloorsTable measurements={measurements} />
      <RegulatoryMap />
    </div>
  );
}

function Header({ composite, asOf }) {
  const isEmpty = composite.value == null;
  const color = isEmpty ? 'var(--color-text-3)' : composite.value >= 85 ? '#0BBF7A' : composite.value >= 65 ? '#B45309' : '#C41E3A';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardCheck size={20} style={{ color: '#B45309' }} />
          Compliance Scoring
          <InfoHint title="Compliance Scoring" text="Compliance scores are computed by transparent rules, not a model. Each framework score is the share of its regulatory floors currently in the green, capped to a failing band on any regulatory breach; per-domain scores are exposure-weighted against audit-plan materiality. Every floor cites its governing CBSL / Basel / SLFRS / FTRA directive." />
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 940, lineHeight: 1.55 }}>
          Framework composites built from the <strong>Regulatory Floors registry</strong> (single source of truth with CBSL / Basel / SLFRS / FTRA citations). Per-domain scores are exposure-weighted against audit-plan materiality, not a count of findings.
        </p>
        <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 6 }}>
          Generated {asOf} · Source: current agent outputs
        </div>
      </div>
      <div style={{ padding: '14px 22px', background: color + '10', border: `1px solid ${color}30`, borderRadius: 12, textAlign: 'center', minWidth: 200 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          Bank-wide composite
          <InfoHint title="Bank-wide composite" text="Weighted average of the measured framework scores; frameworks still awaiting data are excluded from the average rather than counted as zero. Recomputes as agents run and more floors become measurable." />
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{isEmpty ? '—' : composite.value}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4 }}>
          {isEmpty
            ? `${composite.missing.length} of ${Object.keys(COMPLIANCE_FRAMEWORKS).length} frameworks awaiting data`
            : composite.missing.length > 0 ? `${composite.missing.length} framework${composite.missing.length === 1 ? '' : 's'} awaiting data` : 'out of 100 — all frameworks measured'}
        </div>
      </div>
    </div>
  );
}

function FrameworkGrid({ scores }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
      {Object.entries(COMPLIANCE_FRAMEWORKS).map(([id, fw]) => (
        <FrameworkCard key={id} id={id} framework={fw} scoreData={scores[id]} />
      ))}
    </div>
  );
}

function FrameworkCard({ id, framework, scoreData }) {
  const score = scoreData?.score;
  const isEmpty = score == null;
  const hasBreach = scoreData?.breaches?.length > 0;
  const color = isEmpty ? 'var(--color-text-3)' : hasBreach ? '#C41E3A' : score >= 85 ? '#0BBF7A' : score >= 65 ? '#B45309' : '#C41E3A';

  return (
    <div style={{ background: 'var(--color-surface)', border: isEmpty ? '1px dashed var(--color-border)' : '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>{framework.label}</div>
          <InfoHint title={framework.label} text="Score is the percentage of this framework's regulatory floors currently in the green, measured deterministically against the floors registry. Any single regulatory breach caps the framework in a failing band regardless of the other floors. Floors still awaiting agent data are disclosed and excluded from the percentage, not scored as zero." size={12} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{isEmpty ? '—' : score}</div>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {framework.floors.map(f => <span key={f} style={{ padding: '1px 6px', borderRadius: 5, background: 'rgba(0,0,0,0.04)' }}>{REGULATORY_FLOORS[f]?.label || f}</span>)}
      </div>
      {hasBreach && (
        <div style={{ fontSize: 11, color: '#C41E3A', marginTop: 8, fontWeight: 700 }}>
          {scoreData.breaches.length} regulatory breach{scoreData.breaches.length === 1 ? '' : 'es'}
        </div>
      )}
      {scoreData?.unmeasured?.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 6, fontStyle: 'italic' }}>
          {scoreData.unmeasured.length} floor{scoreData.unmeasured.length === 1 ? '' : 's'} awaiting agent data
        </div>
      )}
      <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
        <div style={{ width: `${score || 0}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function RegulatoryFloorsTable({ measurements }) {
  const { state } = useApp();
  const ov = state.appetiteOverrides || {};
  const floors = resolveFloors(ov);
  const rows = Object.values(floors).map(f => {
    const measured = measurements[f.key];
    const { status, reason } = evaluateAgainstFloor(measured, f.key, ov[f.key]);
    return { floor: f, measured, status, reason };
  });
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
      <SectionHeader title="Regulatory floors — live status" icon={Shield} help="Each floor cites the governing directive and section. 'regulatory-breach' means the measured value breaches the published floor. 'amber' means we're above the floor but below Demo Bank's internal appetite — a watch state, not a breach." />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9.5, fontWeight: 800 }}>
              <th style={thCell}>Metric</th>
              <th style={thCell}>Measured</th>
              <th style={thCell}>Floor</th>
              <th style={thCell}>Appetite</th>
              <th style={thCell}>Status</th>
              <th style={thCell}>Citation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => <FloorRow key={r.floor.key} r={r} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FloorRow({ r }) {
  const { floor, measured, status, reason } = r;
  const statusColor = status === 'regulatory-breach' ? '#C41E3A' : status === 'amber' ? '#B45309' : status === 'green' ? '#0BBF7A' : 'var(--color-text-3)';
  const statusLabel = status === 'regulatory-breach' ? 'BREACH' : status === 'amber' ? 'AMBER' : status === 'green' ? 'GREEN' : 'NO DATA';
  const compare = floor.compare === 'gte' ? '≥' : '≤';
  return (
    <tr style={{ borderTop: '1px solid var(--color-border)' }}>
      <td style={{ ...tdCell, fontWeight: 700, color: 'var(--color-text)' }}>{floor.label}</td>
      <td style={{ ...tdCell, fontFamily: 'var(--font-display)', fontWeight: 700, color: statusColor }}>{measured != null ? `${measured} ${floor.metric}` : '—'}</td>
      <td style={{ ...tdCell, fontFamily: 'var(--font-display)', color: 'var(--color-text-2)' }}>{compare} {floor.value}{floor.metric}</td>
      <td style={{ ...tdCell, fontFamily: 'var(--font-display)', color: 'var(--color-text-2)' }}>{floor.internal_appetite != null ? `${compare} ${floor.internal_appetite}${floor.metric}` : '—'}</td>
      <td style={{ ...tdCell }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: statusColor + '18', color: statusColor }}>{statusLabel}</span>
          <InfoHint text={reason} title={`${floor.label} status`} size={11} />
        </span>
      </td>
      <td style={{ ...tdCell, fontSize: 10.5, color: 'var(--color-text-2)' }}>
        <div style={{ fontWeight: 700 }}>{floor.citation.regulator} · {floor.citation.directive}</div>
        <div style={{ color: 'var(--color-text-3)' }}>§{floor.citation.section} · eff. {floor.citation.effective_date}</div>
      </td>
    </tr>
  );
}

const thCell = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border)' };
const tdCell = { padding: '8px', verticalAlign: 'top' };

function RegulatoryMap() {
  const regimes = {};
  for (const d of DOMAINS) {
    for (const t of d.regulatoryTags || []) {
      if (!regimes[t]) regimes[t] = [];
      regimes[t].push(d);
    }
  }
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
      <SectionHeader title="Regulatory regime × Domain map" icon={Shield} help="Which regulatory regime applies to which business domain. Sourced from each domain's regulatoryTags in the registry." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {Object.entries(regimes).sort((a, b) => b[1].length - a[1].length).map(([regime, domains]) => (
          <div key={regime} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#185FA5' }}>{regime}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {domains.map(d => (
                <span key={d.id} style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8, background: 'rgba(0,0,0,0.04)', color: 'var(--color-text-2)' }}>{d.label}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DomainScoreExplain({ domainLabel, detail, color }) {
  const body = (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginBottom: 8, lineHeight: 1.45 }}>
        Composite is exposure-weighted against audit-plan materiality, then adjusted for coverage.
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <tbody>
          <tr><td style={{ padding: '2px 0' }}>Base (full compliance)</td><td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}>100</td></tr>
          <tr><td style={{ padding: '2px 0', color: '#C41E3A' }}>Critical weighted penalty</td><td style={{ textAlign: 'right', color: '#C41E3A', fontFamily: 'var(--font-display)' }}>−{detail.penalties.critical}</td></tr>
          <tr><td style={{ padding: '2px 0', color: '#B45309' }}>High weighted penalty</td><td style={{ textAlign: 'right', color: '#B45309', fontFamily: 'var(--font-display)' }}>−{detail.penalties.high}</td></tr>
          <tr><td style={{ padding: '2px 0', color: 'var(--color-text-3)' }}>Medium weighted penalty</td><td style={{ textAlign: 'right', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)' }}>−{detail.penalties.medium}</td></tr>
          <tr><td style={{ padding: '2px 0', color: '#C41E3A' }}>Materiality breach bonus</td><td style={{ textAlign: 'right', color: '#C41E3A', fontFamily: 'var(--font-display)' }}>−{detail.penalties.materiality}</td></tr>
          <tr style={{ borderTop: '1px solid var(--color-border)' }}>
            <td style={{ padding: '4px 0 0', fontWeight: 700 }}>Score</td>
            <td style={{ textAlign: 'right', padding: '4px 0 0', fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{detail.score}</td>
          </tr>
        </tbody>
      </table>
      {detail.exposureLkr > 0 && (
        <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 8, lineHeight: 1.45 }}>
          Aggregate exposure (entity-deduped): <strong>{formatLkr(detail.exposureLkr)}</strong>{detail.materialityCrossed ? ' — exceeds performance materiality' : ''}.
        </div>
      )}
      <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 6, lineHeight: 1.45 }}>
        Tuning thresholds in <strong>Rule Parameters</strong> or materiality on the <strong>Audit Plan</strong> reflows this score.
      </div>
    </div>
  );
  return <InfoHint text={body} title={`${domainLabel} — how the score is built`} size={13} align="right" />;
}

function SectionHeader({ title, icon: Icon, help }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      {Icon && <Icon size={14} style={{ color: '#B45309' }} />}
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>{title}</h3>
      {help && <InfoHint text={help} title={title} />}
    </div>
  );
}

// ─── COMPLIANCE TREND (recharts) ─────────────────────────────────────────────
// Quarterly composite + per-framework scores from the persistent run ledger,
// which accumulates a snapshot on every Data Hub run (seeded Q1–Q4 25 on first
// load). Turns "are we improving or sliding?" into a visible trajectory.
const TREND_SERIES = [
  { key: 'composite', label: 'Composite', color: '#111110', width: 2.6 },
  { key: 'cbsl',  label: 'CBSL',  color: '#185FA5', width: 1.4 },
  { key: 'basel', label: 'Basel', color: '#0F6E56', width: 1.4 },
  { key: 'fatf',  label: 'FATF',  color: '#B45309', width: 1.4 },
  { key: 'aml',   label: 'AML',   color: '#993556', width: 1.4 },
  { key: 'sod',   label: 'SoD',   color: '#7C3AED', width: 1.4 },
];

function ComplianceTrendChart() {
  const data = useMemo(() => readLedger(), []);
  if (!Array.isArray(data) || data.length < 2) return null;
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
      <SectionHeader
        title="Compliance composite trend"
        icon={TrendingUp}
        help="Composite and per-framework scores over recent quarters, accumulated in the local run ledger — a snapshot is recorded on every data-source sync. The composite (bold) is the weighted average of the framework lines."
      />
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="q" tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
            {TREND_SERIES.map(s => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={s.width} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── MEASUREMENT DERIVATION ──────────────────────────────────────────────────
// Pulls the numeric values we need to evaluate each floor from the current
// agent outputs. If a value is missing, it stays null and the floor reports
// 'unknown' — we do NOT silently drop missing data from the composite.
function deriveMeasurements(results) {
  const m = {};
  const cap = results.capital;
  m.tier1_car = cap?.capital_position?.car_tier1_pct ?? cap?.capital_position?.tier1_pct ?? null;
  m.total_car = cap?.capital_position?.car_total_pct ?? null;
  m.leverage_ratio = cap?.capital_position?.leverage_ratio_pct ?? null;
  m.lcr = cap?.liquidity_position?.lcr_pct ?? null;
  m.nsfr = cap?.liquidity_position?.nsfr_pct ?? null;

  const credit = results.credit;
  m.stage3_ratio = credit?.capital_impact?.current_stage3_ratio ?? null;

  const kyc = results.kyc;
  m.kyc_gap_pct = kyc?.compliance_summary?.kyc_gap_pct ?? null;
  m.str_filing_days = null; // Operational metric, tracked separately via Case Manager SLA.

  // Suspense / connectedParty / ALM — if the agent ran and produced a worst-case metric.
  const suspense = results.suspense;
  if (suspense?.aging_distribution) {
    // Worst case: max aging_days across flagged_accounts, if present.
    const worst = (suspense.flagged_accounts || []).reduce((max, a) => Math.max(max, a.aging_days || 0), 0);
    m.suspense_aging_days = worst || null;
  }

  const cp = results.connectedParty;
  if (cp?.single_obligor_breaches?.length) {
    m.single_obligor = Math.max(...cp.single_obligor_breaches.map(b => b.exposure_pct_of_capital || 0));
  }
  if (cp?.connected_group_breaches?.length) {
    m.connected_group = Math.max(...cp.connected_group_breaches.map(b => b.exposure_pct_of_capital || 0));
  }

  const alm = results.alm;
  if (alm?.alm_summary) {
    m.irrbb_eve_limit_pct = alm.alm_summary.eve_sensitivity_pct ?? null;
    m.irrbb_cumulative_gap_pct = Math.abs(alm.alm_summary.cumulative_gap_pct ?? 0) || null;
  }

  return m;
}

// ─── FRAMEWORK SCORING ───────────────────────────────────────────────────────
// A framework's score is the % of its floors in 'green', forced to 0 on any
// regulatory breach. Unmeasured floors are disclosed (not silently excluded).
function computeFrameworkScores(measurements, appetiteOverrides = {}) {
  const out = {};
  for (const [id, fw] of Object.entries(COMPLIANCE_FRAMEWORKS)) {
    const breaches = [];
    const greens = [];
    const unmeasured = [];
    for (const floorKey of fw.floors) {
      const val = measurements[floorKey];
      const { status } = evaluateAgainstFloor(val, floorKey, appetiteOverrides[floorKey]);
      if (status === 'regulatory-breach') breaches.push(floorKey);
      else if (status === 'green') greens.push(floorKey);
      else if (status === 'unknown') unmeasured.push(floorKey);
    }
    const measured = fw.floors.length - unmeasured.length;
    let score = null;
    if (measured > 0) {
      if (breaches.length > 0) {
        // Any regulatory breach caps the framework at a failing score.
        score = Math.max(20, Math.round(50 * (greens.length / measured)));
      } else {
        score = Math.round(100 * (greens.length / measured));
      }
    }
    out[id] = { score, breaches, greens, unmeasured };
  }
  return out;
}

// ─── PER-DOMAIN SCORING (exposure-weighted) ──────────────────────────────────
// Weighted penalty: criticals and highs scale with their proportion of the
// finding's exposure vs audit-plan performance materiality. A LKR 100M
// critical when PM = LKR 50M takes a bigger penalty than a LKR 1M critical.
function computePerDomain(allFindings, performanceMateriality, tolerableMisstatement) {
  const pm = performanceMateriality ?? 100_000_000; // LKR 100 Mn default if not set
  const tm = tolerableMisstatement   ?? 20_000_000;  // LKR 20  Mn default if not set
  const out = {};

  for (const d of DOMAINS) {
    const domainFindings = allFindings.filter(f => f.domainTags.includes(d.id));
    const severityBuckets = { critical: [], high: [], medium: [] };
    for (const f of domainFindings) {
      const s = (f.severity || 'medium').toLowerCase();
      if (severityBuckets[s]) severityBuckets[s].push(f);
    }
    // Exposure (entity-deduped so the same customer across agents counts once).
    const breakdown = dedupedExposureBreakdown(domainFindings);
    const exposureLkr = breakdown.total;
    const materialityCrossed = exposureLkr >= pm;

    // Exposure-weighted penalties: each severity contributes a base weight
    // plus an exposure multiplier (exposure / PM), capped per-severity so one
    // huge finding doesn't blow the whole score.
    const critExpFactor = Math.min(3, severityBuckets.critical.reduce((a, f) => a + Math.min(3, (f.finding?.affected_exposure_lkr || 0) / pm), 0));
    const highExpFactor = Math.min(2, severityBuckets.high.reduce((a, f) => a + Math.min(2, (f.finding?.affected_exposure_lkr || 0) / tm / 5), 0));

    const penalties = {
      critical: Math.round(severityBuckets.critical.length * 8 + critExpFactor * 10),
      high:     Math.round(severityBuckets.high.length     * 4 + highExpFactor * 6),
      medium:   Math.round(severityBuckets.medium.length   * 1),
      materiality: materialityCrossed ? 8 : 0,
    };

    const penaltyTotal = penalties.critical + penalties.high + penalties.medium + penalties.materiality;
    const score = Math.max(25, Math.min(100, 100 - penaltyTotal));

    out[d.id] = {
      score,
      criticals: severityBuckets.critical.length,
      highs: severityBuckets.high.length,
      mediums: severityBuckets.medium.length,
      findings: domainFindings.length,
      exposureLkr,
      materialityCrossed,
      penalties,
    };
  }
  return out;
}
