import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer } from 'recharts';
import { useResolvedResults, useAllFindings } from '../../hooks/useDomainData.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import { evaluateAgainstFloor, resolveFloors } from '../../data/regulatoryFloors.js';
import { useApp } from '../../context/AppContext.jsx';
import { executiveData } from '../../data/demoData.js';
import { TrendingUp, Shield, Coins, AlertTriangle, Gauge, Activity } from 'lucide-react';
import EmptyStat from '../../components/business/EmptyStat.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import AsOfStamp from '../../components/business/AsOfStamp.jsx';

// ─── BUSINESS REGULATORY CAPITAL ─────────────────────────────────────────────
// Domain-aware regulatory capital view. Shows CAR/LCR/NSFR alongside
// capital consumption by business line, plus ALM findings from the ALM agent.

export default function BusinessRegulatoryCapital() {
  const navigate = useNavigate();
  const results = useResolvedResults();
  const allFindings = useAllFindings();

  const capital = results.capital || {};
  const alm = results.alm || {};
  const credit = results.credit || {};

  // Strictly data-driven — no annual-report fallbacks. If the Capital agent
  // has not run, the ratio is null and EmptyStat renders "—" with a helper.
  const tier1 = capital.capital_position?.car_tier1_pct ?? null;
  const carTotal = capital.capital_position?.car_total_pct ?? null;
  const lcr = capital.liquidity_position?.lcr_pct ?? null;
  const nsfr = capital.liquidity_position?.nsfr_pct ?? null;
  const leverage = capital.capital_position?.leverage_ratio_pct ?? null;

  // Capital consumption by domain — derived from credit sector concentration + known proxies
  const consumptionByDomain = useMemo(() => deriveConsumption(credit), [credit]);

  const almFindings = useMemo(() => allFindings.filter(f => f.agentId === 'alm'), [allFindings]);
  const mjeFindings = useMemo(() => allFindings.filter(f => f.agentId === 'mje'), [allFindings]);

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Header />

      {/* Core ratios — thresholds sourced from regulatoryFloors.js (single source of truth) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <RatioCardWithFloor label="Tier 1 CAR" value={tier1}    floorKey="tier1_car" />
        <RatioCardWithFloor label="Total CAR"  value={carTotal} floorKey="total_car" />
        <RatioCardWithFloor label="LCR"        value={lcr}      floorKey="lcr" />
        <RatioCardWithFloor label="NSFR"       value={nsfr}     floorKey="nsfr" />
        <RatioCardWithFloor label="Leverage"   value={leverage} floorKey="leverage_ratio" />
      </div>

      {/* 8-quarter trend + forward projection against floor / appetite bands */}
      <RatioTrendChart
        trend={capital.historical_trend?.length ? capital.historical_trend : executiveData.regulatory_trend}
        projection={capital.forward_projection?.length ? capital.forward_projection : executiveData.regulatory_projection}
      />

      {/* ICAAP policy block + stress scenarios */}
      <ICAAPPolicyBlock tier1={tier1} carTotal={carTotal} lcr={lcr} nsfr={nsfr} capital={capital} />
      <StressScenarioBlock alm={alm} capital={capital} />

      {/* Capital consumption by domain — only rendered if Credit agent has sector data */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <SectionHeader title="Capital consumption by domain" icon={Coins} help="Share of credit book per customer pillar, derived from Credit agent's sector concentration output. Populates once Credit agent has run on loan-portfolio data." />
        {consumptionByDomain.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', marginBottom: 6 }}>—</div>
            Sync the <strong>Core Banking — Loans (LAS)</strong> source in Data Sources and run the Credit agent to populate domain-level capital consumption.
          </div>
        ) : (
          <>
            <div>
              {consumptionByDomain.map(d => (
                <div key={d.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{d.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-2)', fontFamily: 'var(--font-display)' }}>{d.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${d.pct}%`, height: '100%', background: d.color, transition: 'width 0.3s' }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Narrative sentence is generated only from current figures — rule-based, not hardcoded commentary */}
            <DataDrivenCapitalNarrative tier1={tier1} carTotal={carTotal} lcr={lcr} criticals={allFindings.filter(f => f.severity === 'critical').length} />
          </>
        )}
      </div>

      {/* ALM / IRRBB findings */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <SectionHeader title="ALM & IRRBB signals" icon={Gauge} help="IRRBB (Interest Rate Risk in the Banking Book) findings raised by the ALM agent. It compares asset and liability repricing dates to find the repricing gap — the net amount repricing in each time bucket — and estimates how a rate shock would move Economic Value of Equity (EVE, the present value of the balance sheet). A large gap or a big modelled EVE swing is flagged here. Treasury-domain ownership." />
        {almFindings.length === 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontStyle: 'italic' }}>No ALM findings currently flagged.</div>
        )}
        {almFindings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {almFindings.slice(0, 4).map((f, i) => (
              <div key={i} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <SeverityPill severity={f.severity} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ALM & IRRBB</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.5 }}>{f.finding?.finding}</div>
                {f.finding?.recommended_action && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 6, display: 'flex', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#0BBF7A' }}>Action:</span>
                    <span>{f.finding.recommended_action}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ALCO / actions */}
      {Array.isArray(capital.alco_actions) && capital.alco_actions.length > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <SectionHeader title="ALCO actions" icon={AlertTriangle} help="ALCO-level remediation items proposed by the Capital agent." />
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {capital.alco_actions.slice(0, 6).map((a, i) => (
              <li key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: '#185FA5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.55 }}>
                  {typeof a === 'string' ? a : (a.action || a.description || JSON.stringify(a))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
        <TrendingUp size={20} style={{ color: '#185FA5' }} />
        Regulatory Capital
        <InfoHint title="Regulatory Capital" text="Basel III capital and liquidity ratios computed directly from the Capital, Balance, and ALM agent outputs, each compared against its CBSL regulatory floor and Demo Bank's internal appetite from the regulatoryFloors registry. Status is a deterministic rule, not a model prediction." />
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 980, lineHeight: 1.55 }}>
        Basel III capital and liquidity ratios, with capital consumption split by business line and ALM/IRRBB signals.
        All figures pulled from the current Capital, Balance, and ALM agent outputs.
      </p>
      <div style={{ marginTop: 6 }}>
        <AsOfStamp source="Ratios from Capital agent · Floors from regulatoryFloors registry" />
      </div>
    </div>
  );
}

// ─── RATIO TREND CHART (recharts) ────────────────────────────────────────────
// 8 quarters of history (solid) + 4-quarter projection (dashed) for a chosen
// ratio, with the CBSL regulatory floor (red line) and Demo Bank internal appetite
// (amber line) drawn as references. Makes "are we drifting toward a breach?"
// a glance instead of a number. recharts was already a dependency, unused.
const TREND_METRICS = [
  { key: 'tier1', label: 'Tier 1 CAR', floorKey: 'tier1_car' },
  { key: 'car',   label: 'Total CAR',  floorKey: 'total_car' },
  { key: 'lcr',   label: 'LCR',        floorKey: 'lcr' },
  { key: 'nsfr',  label: 'NSFR',       floorKey: 'nsfr' },
];

function RatioTrendChart({ trend = [], projection = [] }) {
  const { state } = useApp();
  const [metric, setMetric] = useState('lcr');
  const cfg = TREND_METRICS.find(m => m.key === metric) || TREND_METRICS[0];
  const floor = resolveFloors(state.appetiteOverrides)[cfg.floorKey];

  const data = useMemo(() => {
    const hist = (trend || []).map(r => ({ q: r.q, hist: r[metric] }));
    if (hist.length && projection?.length) {
      const lastVal = trend[trend.length - 1]?.[metric];
      hist[hist.length - 1] = { ...hist[hist.length - 1], proj: lastVal }; // connect solid → dashed
      return [...hist, ...projection.map(r => ({ q: r.q, proj: r[metric] }))];
    }
    return hist;
  }, [trend, projection, metric]);

  if (!data.length) return null;

  const vals = data.flatMap(d => [d.hist, d.proj]).filter(v => typeof v === 'number');
  const floorV = floor?.value, appV = floor?.internal_appetite;
  const lo = Math.min(...vals, floorV ?? Infinity);
  const hi = Math.max(...vals, appV ?? -Infinity);
  const pad = (hi - lo) * 0.12 || 5;

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Activity size={15} style={{ color: '#185FA5' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>Ratio trend &amp; projection</div>
          <InfoHint title="Ratio trend" text="Eight quarters of history (solid) and a four-quarter projection under the current trajectory (dashed). The red line is the CBSL regulatory floor; the amber line is Demo Bank's internal appetite." />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TREND_METRICS.map(m => {
            const on = m.key === metric;
            return (
              <button key={m.key} onClick={() => setMetric(m.key)} style={{
                padding: '5px 11px', borderRadius: 7, fontSize: 11.5, fontWeight: on ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit',
                background: on ? 'rgba(24,95,165,0.1)' : 'var(--color-surface-2)', color: on ? '#185FA5' : 'var(--color-text-2)',
                border: `1px solid ${on ? 'rgba(24,95,165,0.3)' : 'var(--color-border)'}`,
              }}>{m.label}</button>
            );
          })}
        </div>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="q" tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <YAxis domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} axisLine={false} tickLine={false} width={40} unit="%" />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}
              formatter={(v, n) => [v != null ? `${Number(v).toFixed(1)}%` : '—', n === 'hist' ? cfg.label : 'Projection']}
            />
            {floorV != null && <ReferenceArea y1={Math.floor(lo - pad)} y2={floorV} fill="#C41E3A" fillOpacity={0.05} />}
            {floorV != null && <ReferenceLine y={floorV} stroke="#C41E3A" strokeDasharray="5 3" label={{ value: `CBSL floor ${floorV}%`, position: 'insideBottomRight', fontSize: 9.5, fill: '#C41E3A' }} />}
            {appV != null && <ReferenceLine y={appV} stroke="#B45309" strokeDasharray="5 3" label={{ value: `Appetite ${appV}%`, position: 'insideTopRight', fontSize: 9.5, fill: '#B45309' }} />}
            <Line type="monotone" dataKey="hist" stroke="#185FA5" strokeWidth={2.2} dot={{ r: 2.5 }} connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="proj" stroke="#185FA5" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 6 }}>
        Solid = reported history · dashed = projection under current trajectory (no ALCO intervention).
      </div>
    </div>
  );
}

// ─── RATIO CARD — sourced from regulatoryFloors registry (Wave 4) ────────────
// Replaces the hand-tuned min/stretch numbers with the single source of truth.
// The status split (regulatory-breach / amber / green) mirrors the definition
// in regulatoryFloors.evaluateAgainstFloor, so every Business Platform page
// shows the same status for the same value.
// Per-ratio plain-language meaning + how it's computed. Surfaced via a
// click-through InfoHint on every primary ratio card. Deterministic statistics
// only — no opaque scoring.
const RATIO_HELP = {
  tier1_car: "Tier 1 Capital Adequacy Ratio: core (going-concern) capital as a share of risk-weighted assets. Computed by the Capital agent as Tier 1 capital ÷ RWA, then compared against the CBSL floor and Demo Bank's internal appetite.",
  total_car: "Total Capital Adequacy Ratio: total regulatory capital (Tier 1 + Tier 2) as a share of risk-weighted assets. The Capital agent computes total capital ÷ RWA, evaluated against the CBSL Basel III floor and internal appetite.",
  lcr: "Liquidity Coverage Ratio: high-quality liquid assets divided by projected net cash outflows over a 30-day stress window. Measures whether the bank can survive a short, sharp liquidity shock; compared against the 100% CBSL floor and internal appetite.",
  nsfr: "Net Stable Funding Ratio: available stable funding divided by required stable funding over a one-year horizon. Measures structural funding resilience; compared against the CBSL floor and internal appetite.",
  leverage_ratio: "Leverage Ratio: Tier 1 capital as a share of total (non-risk-weighted) exposure. A backstop to the risk-weighted CAR; computed by the Capital agent and compared against the CBSL floor and internal appetite.",
};

function RatioCardWithFloor({ label, value, floorKey }) {
  const { state } = useApp();
  const ov = state.appetiteOverrides?.[floorKey];
  const floor = resolveFloors(state.appetiteOverrides)[floorKey];
  if (!floor) return null;
  const { status, reason } = evaluateAgainstFloor(value, floorKey, ov);
  const statusColor = status === 'regulatory-breach' ? '#C41E3A' : status === 'amber' ? '#B45309' : status === 'green' ? '#0BBF7A' : 'var(--color-text-3)';
  const statusLabel = status === 'regulatory-breach' ? 'REGULATORY BREACH' : status === 'amber' ? 'INSIDE APPETITE' : status === 'green' ? 'GREEN' : 'NO DATA';
  const ratioHelp = RATIO_HELP[floorKey];

  if (value == null) {
    return (
      <div style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</div>
          {ratioHelp && <InfoHint text={ratioHelp} title={label} size={12} />}
        </div>
        <EmptyStat size="lg" agentName="Capital & Liquidity" hint={`No ${label} data yet — run the Capital agent.`} />
        <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 4 }}>Regulatory floor: {floor.compare === 'gte' ? '≥' : '≤'} {floor.value}{floor.metric}</div>
      </div>
    );
  }

  const floorVal = floor.value;
  const appetite = floor.internal_appetite ?? floorVal;
  // Show progress against internal appetite (the aspirational level).
  const pctOfAppetite = floor.compare === 'gte'
    ? Math.min(100, Math.max(0, (value / appetite) * 100))
    : Math.min(100, Math.max(0, (appetite / Math.max(0.0001, value)) * 100));

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</div>
          {ratioHelp && <InfoHint text={ratioHelp} title={label} size={12} />}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 5, background: statusColor + '18', color: statusColor }}>{statusLabel}</span>
          <InfoHint text={reason} title={`${label} status`} size={11} />
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)', fontFamily: 'var(--font-display)', marginTop: 4 }}>
        {Number(value).toFixed(2)}<span style={{ fontSize: 15, color: 'var(--color-text-3)' }}>{floor.metric}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 4, lineHeight: 1.5 }}>
        Floor {floor.compare === 'gte' ? '≥' : '≤'} {floor.value}{floor.metric}
        {floor.internal_appetite != null && ` · Appetite ${floor.compare === 'gte' ? '≥' : '≤'} ${floor.internal_appetite}${floor.metric}`}
      </div>
      <div style={{ fontSize: 9.5, color: 'var(--color-text-3)', marginTop: 2 }}>
        {floor.citation.regulator} · {floor.citation.directive} §{floor.citation.section}
      </div>
      <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pctOfAppetite}%`, height: '100%', background: statusColor, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

// ─── ICAAP POLICY BLOCK — Wave 4 ─────────────────────────────────────────────
// Previously missing — the page showed ratios but had no link to the
// documented ICAAP policy floors or Board-escalation triggers. A CBSL
// inspector would ask: "where is the policy?" This block is the answer.
function ICAAPPolicyBlock({ tier1, carTotal, lcr, nsfr, capital }) {
  const { state } = useApp();
  const ov = state.appetiteOverrides || {};
  const floors = resolveFloors(ov);
  // Evaluate current position against the internal-appetite bands — those are
  // the de-facto ICAAP policy levels the Board has set above regulatory floors.
  const policy = [
    { label: 'Tier 1 CAR',  value: tier1,    floorKey: 'tier1_car' },
    { label: 'Total CAR',   value: carTotal, floorKey: 'total_car' },
    { label: 'LCR',         value: lcr,      floorKey: 'lcr' },
    { label: 'NSFR',        value: nsfr,     floorKey: 'nsfr' },
  ];
  const escalations = policy.filter(p => {
    const { status } = evaluateAgainstFloor(p.value, p.floorKey, ov[p.floorKey]);
    return status === 'regulatory-breach' || status === 'amber';
  });

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
      <SectionHeader title="ICAAP policy & Board escalation" icon={Shield} help="Demo Bank's ICAAP policy sets internal-appetite floors above the CBSL regulatory minimums. Any metric slipping into the amber appetite band triggers ALCO review; a regulatory-floor breach requires CBSL notification prior to the next quarterly return." />
      <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.55, marginBottom: 12 }}>
        Demo Bank's ICAAP (Internal Capital Adequacy Assessment Process) establishes internal appetite floors above the CBSL regulatory minimums. Those appetite floors live in <strong>regulatoryFloors.js</strong> and are applied across every Business Platform surface. A metric inside the amber appetite band triggers ALCO review; a regulatory-floor breach triggers mandatory CBSL notification.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        {policy.map(p => {
          const floor = floors[p.floorKey];
          const { status, reason } = evaluateAgainstFloor(p.value, p.floorKey, ov[p.floorKey]);
          const statusColor = status === 'regulatory-breach' ? '#C41E3A' : status === 'amber' ? '#B45309' : status === 'green' ? '#0BBF7A' : 'var(--color-text-3)';
          return (
            <div key={p.floorKey} style={{ padding: '10px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${statusColor}`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text)' }}>{p.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 3 }}>
                Regulatory floor: <strong>{floor.compare === 'gte' ? '≥' : '≤'} {floor.value}{floor.metric}</strong>
                {floor.internal_appetite != null && <> · Appetite: <strong>{floor.compare === 'gte' ? '≥' : '≤'} {floor.internal_appetite}{floor.metric}</strong></>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>
                  {p.value != null ? `Current ${Number(p.value).toFixed(2)}${floor.metric} — ${status}` : 'No data yet'}
                </div>
                {p.value != null && <InfoHint text={reason} title={`${p.label} vs policy`} size={11} />}
              </div>
            </div>
          );
        })}
      </div>
      {escalations.length > 0 && (
        <div style={{ marginTop: 12, padding: 12, background: 'rgba(196,30,58,0.04)', border: '1px solid rgba(196,30,58,0.2)', borderLeft: '3px solid #C41E3A', borderRadius: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C41E3A', marginBottom: 4 }}>Escalation required</div>
          <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.55 }}>
            {escalations.length} metric{escalations.length === 1 ? '' : 's'} {escalations.length === 1 ? 'has' : 'have'} slipped below policy appetite or the regulatory floor. Convene ALCO within <strong>5 business days</strong>. Capital plan and remediation timetable must be presented to Board Audit Committee at the next meeting.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STRESS SCENARIO BLOCK — Wave 4 ──────────────────────────────────────────
// Reads the ALM agent's rate scenarios and surfaces a simple ICAAP-style
// view: which scenarios breach the ALCO-approved NII / EVE limits, and what
// the projected capital impact would be.
function StressScenarioBlock({ alm, capital }) {
  const scenarios = alm?.rate_scenarios || [];
  const projection = capital?.historical_trend || capital?.forward_projection || [];
  if (scenarios.length === 0 && projection.length === 0) return null;
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
      <SectionHeader title="Stress scenarios & projected capital path" icon={Activity} help="Under which stress scenarios do the ratios breach ICAAP policy or CBSL floors. Projection is the forward capital trend from the Capital agent; the scenario table is from the ALM agent." />
      {scenarios.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>Rate scenarios (ALM agent)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)' }}>
                <th style={{ ...thSc }}>Scenario</th>
                <th style={{ ...thSc, textAlign: 'right' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    EVE Δ
                    <InfoHint text="Change in Economic Value of Equity — the present value of the balance sheet — under this rate shock. A long-run, value-based view of interest-rate risk." title="EVE Δ" size={11} />
                  </span>
                </th>
                <th style={{ ...thSc, textAlign: 'right' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    NII Δ
                    <InfoHint text="Change in Net Interest Income — interest earned minus interest paid — over the next 12 months under this rate shock. A near-term, earnings-based view of interest-rate risk." title="NII Δ" size={11} />
                  </span>
                </th>
                <th style={thSc}>Status</th>
                <th style={thSc}>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={tdSc}><strong>{s.scenario}</strong></td>
                  <td style={{ ...tdSc, textAlign: 'right', fontFamily: 'var(--font-display)', color: s.eve_impact_pct < -5 ? '#C41E3A' : 'var(--color-text)' }}>{s.eve_impact_pct > 0 ? '+' : ''}{s.eve_impact_pct?.toFixed(1)}%</td>
                  <td style={{ ...tdSc, textAlign: 'right', fontFamily: 'var(--font-display)', color: Math.abs(s.nii_impact_pct) > 10 ? '#C41E3A' : 'var(--color-text)' }}>{s.nii_impact_pct > 0 ? '+' : ''}{s.nii_impact_pct?.toFixed(1)}%</td>
                  <td style={tdSc}>{s.flag ? <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 5, background: 'rgba(196,30,58,0.14)', color: '#C41E3A', textTransform: 'uppercase' }}>Breach</span> : <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 5, background: 'rgba(11,191,122,0.14)', color: '#0BBF7A', textTransform: 'uppercase' }}>Within</span>}</td>
                  <td style={{ ...tdSc, color: 'var(--color-text-2)' }}>{s.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {projection.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>Forward capital path (Capital agent)</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            {projection.length} quarter{projection.length === 1 ? '' : 's'} of forward projection available in the Capital agent output. Breaches trigger ICAAP escalation per the policy block above.
          </div>
        </>
      )}
    </div>
  );
}

const thSc = { padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-3)' };
const tdSc = { padding: '7px 10px' };

function SectionHeader({ title, icon: Icon, help }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      {Icon && <Icon size={14} style={{ color: '#B45309' }} />}
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>{title}</h3>
      {help && <InfoHint text={help} title={title} />}
    </div>
  );
}

function SeverityPill({ severity }) {
  const s = (severity || 'medium').toLowerCase();
  const color = s === 'critical' ? '#C41E3A' : s === 'high' ? '#B45309' : s === 'medium' ? '#CA8A04' : '#6B7280';
  return <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: color + '18', color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s}</span>;
}

function deriveConsumption(credit) {
  // Strict rule: only derived numbers, never placeholders. If no data → empty array.
  const sectors = credit?.sector_concentration || [];
  if (sectors.length === 0) return [];

  const secTotals = {};
  let total = 0;
  for (const s of sectors) {
    const exp = s.flagged_exposure_lkr || 0;
    total += exp;
    let pillar = 'Commercial Banking';
    const name = (s.sector || '').toLowerCase();
    if (name.includes('consumer') || name.includes('personal')) pillar = 'Consumer Banking';
    else if (name.includes('infrastructure') || name.includes('hospital')) pillar = 'Corporate Banking';
    else if (name.includes('sme') || name.includes('trade')) pillar = 'Commercial Banking';
    secTotals[pillar] = (secTotals[pillar] || 0) + exp;
  }
  if (total === 0) return [];

  const consumer = Math.round((secTotals['Consumer Banking'] || 0) / total * 100);
  const commercial = Math.round((secTotals['Commercial Banking'] || 0) / total * 100);
  const corporate = Math.round((secTotals['Corporate Banking'] || 0) / total * 100);
  const treasury = Math.max(0, 100 - consumer - commercial - corporate);

  return [
    { label: 'Consumer Banking',          color: '#185FA5', pct: consumer },
    { label: 'Commercial Banking',        color: '#2D5A8E', pct: commercial },
    { label: 'Corporate Banking',         color: '#0F6E56', pct: corporate },
    { label: 'Treasury & Investment Banking', color: '#7C3AED', pct: treasury },
  ];
}

// Rule-based narrative — only renders when data supports a specific statement.
// Never carries static commentary; every sentence depends on live values.
function DataDrivenCapitalNarrative({ tier1, carTotal, lcr, criticals }) {
  const sentences = [];
  if (carTotal != null) {
    if (carTotal < 14.0) {
      sentences.push(`Total CAR ${carTotal.toFixed(2)}% is below the Basel III minimum of 14.0% — immediate remediation required.`);
    } else if (carTotal < 15.0) {
      sentences.push(`Total CAR ${carTotal.toFixed(2)}% is ${((carTotal - 14.0) * 100).toFixed(0)} bps above the Basel III minimum — limited headroom.`);
    } else {
      sentences.push(`Total CAR ${carTotal.toFixed(2)}% sits ${((carTotal - 14.0) * 100).toFixed(0)} bps above the Basel III minimum.`);
    }
  }
  if (lcr != null) {
    if (lcr < 100) {
      sentences.push(`LCR ${lcr.toFixed(1)}% is below the 100% regulatory floor.`);
    } else if (lcr < 150) {
      sentences.push(`LCR ${lcr.toFixed(1)}% is inside the internal amber band (100–150%).`);
    }
  }
  if (criticals > 0) {
    sentences.push(`${criticals} critical finding${criticals !== 1 ? 's' : ''} across the bank may affect RWA if acted on — monitor cumulative CAR impact.`);
  }
  if (sentences.length === 0) return null;
  return (
    <div style={{ marginTop: 14, background: 'var(--color-surface-2)', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 6 }}>
        Data-driven observation
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.55 }}>{sentences.join(' ')}</div>
    </div>
  );
}
