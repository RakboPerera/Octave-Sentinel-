import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { fixtureCases } from '../../data/caseRegistry.js';
import { AGENT_META } from '../../data/agentMeta.js';
import { computeDetectionAssurance } from '../../utils/detectionAssurance.js';
import { computeReturnReferences } from '../../utils/detectionEngine.js';
import { completenessStatement } from '../../utils/inputReconciliation.js';
import { resolveFloors } from '../../data/regulatoryFloors.js';
import { psi, ksTwoSample } from '../../utils/statistics.js';
import { Card, Eyebrow, SectionTitle, Num } from '../../components/shared/ui.jsx';
import RunDemoCTA from '../../components/business/RunDemoCTA.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import BenfordChart from '../../components/charts/BenfordChart.jsx';
import ReliabilityDiagram from '../../components/charts/ReliabilityDiagram.jsx';
import FdrStrip from '../../components/charts/FdrStrip.jsx';
import NetworkGraph from '../../components/charts/NetworkGraph.jsx';
import ExposureTreemap from '../../components/charts/ExposureTreemap.jsx';
import BacktestTrend from '../../components/charts/BacktestTrend.jsx';
import VintageCurve from '../../components/charts/VintageCurve.jsx';
import AppetiteGauge from '../../components/charts/AppetiteGauge.jsx';
import GeoVelocity from '../../components/charts/GeoVelocity.jsx';
import { ShieldCheck, Cpu, Bot, Activity, History, BarChart3, Share2, Target, Sigma, Layers, TrendingUp, Gauge, MapPin, Database } from 'lucide-react';

const toNum = (v) => { const n = Number(String(v ?? '').replace(/[, ]/g, '')); return Number.isFinite(n) ? n : null; };

// ─── DETECTION ASSURANCE (Phase 3 — model governance) ────────────────────────
// Answers the regulator's question: "how accurate is your detection, and how do
// you know?" Per agent: detection method (deterministic rule vs AI), population
// analysed, findings raised, calibrated confidence, and measured precision from
// auditor-marked false positives. Deterministic agents are reproducible (a
// content hash proves same-data ⇒ same-result).

const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(0)}%`);

export default function DetectionAssurance() {
  const { state } = useApp();
  const navigate = useNavigate();
  const cases = useMemo(
    () => [...fixtureCases(state), ...(state.cases || [])],
    [state.demoMode, state.cases],
  );
  const { perAgent, overall } = useMemo(
    () => computeDetectionAssurance(state.agentResults || {}, cases, state.caseWorkbench || {}),
    [state.agentResults, cases, state.caseWorkbench],
  );

  // Input-distribution DRIFT (S4): compare each agent's current uploaded field
  // distribution to its frozen baseline (PSI + two-sample KS). PSI > 0.25 = the
  // input population has shifted and thresholds may need recalibration.
  const drift = useMemo(() => {
    const baselines = state.driftBaseline || {};
    const uploaded = state.uploadedData || {};
    const out = [];
    for (const [agentId, base] of Object.entries(baselines)) {
      const rows = uploaded[agentId]?.rows;
      if (!base?.values?.length || !Array.isArray(rows) || !rows.length) continue;
      const current = rows.map(r => toNum(r[base.field])).filter(v => v != null);
      if (current.length < 5) continue;
      const { psi: psiVal } = psi(base.values, current);
      const { d, p } = ksTwoSample(base.values, current);
      out.push({ agentId, field: base.field, psi: psiVal, ksD: d, ksP: p, baselineN: base.values.length, currentN: current.length });
    }
    return out.sort((a, b) => (b.psi ?? 0) - (a.psi ?? 0));
  }, [state.driftBaseline, state.uploadedData]);

  // Backtesting (S4): per-agent run history from the assurance snapshot log.
  const history = state.assuranceHistory || [];

  // Statistical insights (Tier 1 charts) — all derived from the live engine output.
  const insights = useMemo(() => {
    const results = state.agentResults || {};
    const allFindings = Object.values(results).flatMap(b => (b && Array.isArray(b.key_findings)) ? b.key_findings : []);
    // Benford distribution from the first finding that carries it (txn preferred, then mje).
    const benfordFinding = (results.transaction?.key_findings || []).find(f => f.benford_dist)
      || (results.mje?.key_findings || []).find(f => f.benford_dist)
      || allFindings.find(f => f.benford_dist);
    // FDR family: every finding carrying a p-value.
    const pvals = allFindings.map(f => f.evidence?.statistic?.p).filter(p => Number.isFinite(p));
    // Reliability: agents with auditor-labelled cases.
    const relPoints = perAgent
      .filter(a => a.cases >= 1 && a.avgConfidence != null && a.precision != null)
      .map(a => ({ label: AGENT_META[a.agentId]?.name || a.agentId, stated: a.avgConfidence, observed: a.precision, n: a.cases }));
    const txnRows = state.uploadedData?.transaction?.rows || [];
    // Treemap: flagged exposure per agent (persisted in agentResults).
    const treemapItems = Object.entries(results).map(([agentId, b]) => {
      const fs = (b && Array.isArray(b.key_findings)) ? b.key_findings : [];
      const exposure = fs.reduce((s, f) => s + (Number(f.affected_exposure_lkr) || 0), 0);
      return { label: AGENT_META[agentId]?.name || agentId, exposure, critical: fs.filter(f => f.severity === 'critical').length, high: fs.filter(f => f.severity === 'high').length };
    }).filter(it => it.exposure > 0);
    // Vintage: credit rows (live) + the quarters the engine flagged as outliers.
    const creditRows = state.uploadedData?.credit?.rows || [];
    const vintageFlagged = (results.credit?.key_findings || [])
      .filter(f => String(f.loan_id || '').startsWith('VINTAGE:'))
      .map(f => String(f.origination_quarter || f.loan_id.replace('VINTAGE:', '')));
    // Appetite gauges: Sentinel-computed ratios vs CBSL floor & internal appetite (Tier 3).
    let appetiteGauges = [];
    const capRows = state.uploadedData?.capital?.rows;
    if (Array.isArray(capRows) && capRows.length) {
      const refs = computeReturnReferences({ capital: capRows });
      const fl = resolveFloors(state.appetiteOverrides);
      appetiteGauges = [
        { label: 'Tier 1 CAR', value: refs.tier1, floor: fl.tier1_car?.value, appetite: fl.tier1_car?.internal_appetite },
        { label: 'Total CAR', value: refs.car, floor: fl.total_car?.value, appetite: fl.total_car?.internal_appetite },
        { label: 'LCR', value: refs.lcr, floor: fl.lcr?.value, appetite: fl.lcr?.internal_appetite },
        { label: 'NSFR', value: refs.nsfr, floor: fl.nsfr?.value, appetite: fl.nsfr?.internal_appetite },
      ].filter(g => Number.isFinite(g.value) && Number.isFinite(g.floor));
    }
    // Geo-velocity events from digital impossible-travel findings (persisted).
    const geoEvents = (results.digital?.key_findings || [])
      .map(f => {
        const t = (f.evidence?.triggeredBy || []).find(x => x.field === 'travel_speed_kmh');
        if (!t || !f.previous_session_city || !f.login_city) return null;
        return { from: f.previous_session_city, to: f.login_city, kmh: t.value, account: f.account_id };
      }).filter(Boolean);
    return { benfordDist: benfordFinding?.benford_dist || null, benfordLabel: benfordFinding?.benford_digits === 2 ? 'first-two-digit' : 'first-digit', pvals, relPoints, txnRows, treemapItems, creditRows, vintageFlagged, appetiteGauges, geoEvents };
  }, [state.agentResults, state.uploadedData, perAgent, state.appetiteOverrides]);

  // FIX B2 (code review): a few visuals (counterparty network, vintage cohorts,
  // capital/liquidity gauges, input drift) rebuild from the raw uploaded rows,
  // which are deliberately NOT persisted across reloads (FIX M12 — they can be
  // huge). agentResults DO persist, so after a reload the engine metrics still
  // show but these row-derived charts go blank. Detect that precise state — an
  // agent whose persisted metadata reports rowCount > 0 but whose rows are gone —
  // so we can explain it rather than silently dropping the charts.
  const { rowsLostOnReload, rowsSampled } = useMemo(() => {
    const vals = Object.values(state.uploadedData || {});
    return {
      // rows entirely gone (e.g. the sample exceeded its storage guard).
      rowsLostOnReload: vals.some(v => v && v.rowCount > 0 && !(Array.isArray(v.rows) && v.rows.length)),
      // FIX-E: rows present but capped — charts reflect a sample, not the full population.
      rowsSampled: vals.some(v => v && Array.isArray(v.rows) && v.rows.length > 0 && v.rowCount > v.rows.length),
    };
  }, [state.uploadedData]);

  const showInsights = overall.agents > 0;

  // Data provenance & completeness (IPE) — per-agent lineage + tie-out, from the
  // reconciliation the engine records on every run.
  const provenanceRows = useMemo(() => {
    const out = [];
    for (const [agentId, b] of Object.entries(state.agentResults || {})) {
      const recon = b?._reconciliation;
      if (!recon) continue;
      out.push({ agentId, name: AGENT_META[agentId]?.name || agentId, statement: completenessStatement(recon), status: recon.tieOut?.status || 'no-control', source: recon.provenance?.sourceSystem });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.agentResults]);

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)' }}>
          <ShieldCheck size={20} style={{ color: '#0BBF7A' }} /> Detection Assurance
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 860, lineHeight: 1.55 }}>
          How each agent detects, and how accurate it is. <strong>Deterministic-rule</strong> agents score every record against your configured thresholds in code — reproducible (same data → same result, proven by the content hash) and grounded to source rows. Where a finding rests on a real distribution (e.g. Benford's Law), its <strong>confidence is a genuine tail probability (1−p)</strong>, not a self-reported number, and those statistical findings pass a <strong>false-discovery-rate (FDR) control</strong> so multiple testing over large populations can't manufacture significance. Precision is measured from the false positives your reviewers have marked. For <em>how</em> each agent detects, see <button onClick={() => navigate('/business-view/engine-map')} style={{ background: 'none', border: 'none', padding: 0, color: '#185FA5', fontWeight: 700, cursor: 'pointer', font: 'inherit' }}>Engine Map → How Sentinel detects</button>.
        </p>
      </div>

      {/* Overall roll-up */}
      <Card padding={16}>
        <Eyebrow>Across all run agents</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginTop: 10 }}>
          <Stat label="Agents run" value={overall.agents} help="How many detection agents have been run in this session. Each agent scores one population (transactions, credit, capital, …) against its configured rules." />
          <Stat label="Deterministic" value={`${overall.deterministicAgents}/${overall.agents}`} accent="#0BBF7A" help="Of the agents run, how many use a deterministic rule engine (reproducible — same data yields the same result and content hash) versus an AI-generated detector. Counted from each agent's method flag." />
          <Stat label="Findings" value={overall.totalFindings} help="Total findings raised across all run agents — every record or cohort that breached a configured threshold or failed a statistical test. Summed from each agent's findings." />
          <Stat label="False positives" value={overall.falsePositives} accent="#B45309" help="Findings your reviewers have examined and marked as false positives. Counted from case dispositions in the workbench; drives the measured precision." />
          <Stat label="Precision" value={pct(overall.precision)} accent="#185FA5" help="Confirmed ÷ (confirmed + auditor-marked false positives)." />
          <Stat label="Avg confidence" value={pct(overall.avgConfidence)} help="A tail probability (1−p) for statistical findings; a reproducible margin score for rule findings — never a self-reported model number." />
          <Stat label="Statistical tests" value={overall.statisticalTests ? `${overall.fdrDiscoveries}/${overall.statisticalTests}` : '—'} accent="#7C3AED" help="Findings resting on a real distribution (p-value), shown as significant-after-FDR ÷ tested. Benjamini–Hochberg bounds the false-positive rate across these tests." />
          <Stat label="Calibration gap" value={overall.calibrationGap == null ? '—' : pct(overall.calibrationGap)} accent={overall.calibrationGap == null ? 'var(--color-text-3)' : overall.calibrationGap <= 0.15 ? '#0BBF7A' : '#B45309'} help="Mean gap between STATED confidence and OBSERVED precision across agents with auditor-labelled cases. Small gap = well-calibrated. '—' until reviewers have marked enough cases." />
        </div>
        {overall.agents === 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 10, textAlign: 'center' }}>
              No agents have been run yet — run the engine to populate precision, calibration, FDR and drift metrics.
            </div>
            <RunDemoCTA />
          </div>
        )}
      </Card>

      {/* Data provenance & completeness (IPE) — the audit-evidence foundation */}
      {provenanceRows.length > 0 && (
        <Card padding={16}>
          <Eyebrow><Database size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Data provenance & completeness (IPE)</Eyebrow>
          <p style={{ fontSize: 11.5, color: 'var(--color-text-2)', margin: '6px 0 10px', maxWidth: 860, lineHeight: 1.5 }}>
            Findings are only as good as the data they ran on. For each agent: which system of record the population came from, who extracted it, and whether it tied out to source control totals (completeness & accuracy). This is the IPE artifact that lets a finding stand as audit evidence.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {provenanceRows.map(p => {
              const c = p.status === 'pass' ? '#0BBF7A' : p.status === 'warn' ? '#B45309' : p.status === 'fail' ? '#C41E3A' : 'var(--color-text-3)';
              return (
                <div key={p.agentId} style={{ display: 'grid', gridTemplateColumns: '1.3fr 2.7fr', gap: 10, alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div><span style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</span>{p.source && <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{p.source}</div>}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.45 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: c, marginRight: 6 }} />{p.statement}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Per-agent table */}
      {perAgent.length > 0 && (
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 0.7fr 0.7fr 0.8fr 0.8fr 1fr', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            {[
              ['Agent', 'Which detection agent — each scores one population (e.g. transactions, credit, capital).'],
              ['Method', 'How it detects: a deterministic rule engine (reproducible — same data yields the same result and content hash) or an AI-generated detector. Read from the agent\'s method flag.'],
              ['Rows', 'Size of the population the agent analysed — the record count it scored end-to-end. Grounded to the source rows.'],
              ['Findings', 'Records or cohorts the agent flagged. “nC” counts criticals; “x/y stat·FDR” shows how many statistical tests stayed significant after false-discovery-rate control.'],
              ['Confidence', 'Mean confidence of the agent’s findings: a tail probability (1−p) for statistical findings, a reproducible margin score for rule findings. The sub-label flags whether it reads as calibrated against observed precision.'],
              ['Precision', 'Confirmed findings ÷ reviewed findings (the bracket shows confirmed/reviewed). Green ≥ 80%, amber ≥ 50%, red below. “—” until reviewers have dispositioned cases.'],
              ['Reproducibility', 'Deterministic agents carry a content hash — re-running on identical data yields the identical hash, proving the result. AI agents carry no hash and are marked not reproducible.'],
            ].map(([h, help]) => (
              <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Eyebrow>{h}</Eyebrow><InfoHint text={help} title={h} size={11} />
              </div>
            ))}
          </div>
          {perAgent.map((a, i) => {
            const label = AGENT_META[a.agentId]?.name || a.agentId;
            return (
              <div key={a.agentId} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 0.7fr 0.7fr 0.8fr 0.8fr 1fr', gap: 0, padding: '12px 16px', borderBottom: i === perAgent.length - 1 ? 'none' : '1px solid var(--color-border)', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{label}</div>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: a.deterministic ? 'rgba(11,191,122,0.13)' : 'rgba(245,184,65,0.15)', color: a.deterministic ? '#0BBF7A' : '#B45309' }}>
                    {a.deterministic ? <Cpu size={11} /> : <Bot size={11} />} {a.deterministic ? 'Rule engine' : 'AI-generated'}
                  </span>
                </div>
                <Num style={{ fontSize: 12.5 }}>{a.rowsAnalysed != null ? a.rowsAnalysed.toLocaleString() : '—'}</Num>
                <Num style={{ fontSize: 12.5 }}>
                  {a.findings}{a.bySeverity.critical ? ` · ${a.bySeverity.critical}C` : ''}
                  {a.fdr ? <span title={`${a.fdr.discoveries} of ${a.fdr.tested} statistical test(s) significant after FDR control (q=${a.fdr.q})`} style={{ display: 'block', fontSize: 9.5, color: '#7C3AED', fontWeight: 700 }}>{a.fdr.discoveries}/{a.fdr.tested} stat·FDR</span> : null}
                </Num>
                <Num style={{ fontSize: 12.5 }}>
                  {pct(a.avgConfidence)}
                  {a.reliability && a.reliability !== 'unlabelled' && (
                    <span title={`Stated confidence vs observed precision: ${a.reliability}. Calibrated estimate ${pct(a.calibratedConfidence)}.`} style={{ display: 'block', fontSize: 9, fontWeight: 700, color: a.reliability === 'calibrated' ? '#0BBF7A' : '#B45309' }}>{a.reliability}</span>
                  )}
                </Num>
                <Num style={{ fontSize: 12.5, fontWeight: 700, color: a.precision == null ? 'var(--color-text-3)' : a.precision >= 0.8 ? '#0BBF7A' : a.precision >= 0.5 ? '#B45309' : '#C41E3A' }}>
                  {pct(a.precision)}{a.cases ? ` (${a.cases - a.falsePositives}/${a.cases})` : ''}
                </Num>
                <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono, monospace)', color: a.reproducible ? 'var(--color-text-2)' : 'var(--color-text-3)' }}>
                  {a.contentHash ? `✓ ${a.contentHash}` : '— (AI, not reproducible)'}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* ── Model-governance evidence — the statistics, for validation/regulator ── */}
      {showInsights && (
        <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sigma size={16} style={{ color: '#7C3AED' }} /> Model-governance evidence
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 880, lineHeight: 1.55 }}>
            The statistics behind the findings — for a model-validation or regulator conversation, not the daily worklist. Each finding's plain-English meaning and recommended test appear on the finding itself; your day-to-day queue lives in <button onClick={() => navigate('/business-view/investigate')} style={{ background: 'none', border: 'none', padding: 0, color: '#185FA5', fontWeight: 700, cursor: 'pointer', font: 'inherit' }}>Investigate</button>.
          </p>
        </div>
      )}
      {showInsights && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
          {insights.benfordDist && (
            <Card padding={16}>
              <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><BarChart3 size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Benford's Law — {insights.benfordLabel}<InfoHint title="Reading the Benford chart" text="X-axis = leading digit(s); Y-axis = how often each occurs (%). Blue bars are what your data shows; the red line is the frequency Benford's Law predicts for naturally-occurring amounts. Where blue pulls away from red, those digits are over- or under-represented — that gap is exactly what drove the χ² test's significance and suggests amounts may have been fabricated or rounded." size={11} /></Eyebrow>
              <p style={{ fontSize: 11, color: 'var(--color-text-2)', margin: '6px 0 8px', lineHeight: 1.45 }}>Observed digit frequencies vs the Benford expectation. Bars that pull away from the curve drove the χ² test's significance.</p>
              <BenfordChart dist={insights.benfordDist} />
            </Card>
          )}
          <Card padding={16}>
            <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><Target size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Confidence calibration<InfoHint title="Reading the calibration plot" text="Each dot is one agent, placed at (stated confidence on the X-axis, observed precision on the Y-axis). The dashed diagonal is perfect calibration. Dots below the line are over-confident (claimed more than reviewers confirmed); above the line, under-confident. Dot size grows with the number of labelled cases behind it." size={11} /></Eyebrow>
            <p style={{ fontSize: 11, color: 'var(--color-text-2)', margin: '6px 0 8px', lineHeight: 1.45 }}>Each agent: stated confidence vs the precision your reviewers actually confirm. On the line = well-calibrated.</p>
            <ReliabilityDiagram points={insights.relPoints} />
          </Card>
          <Card padding={16}>
            <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><Sigma size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />False-discovery-rate control<InfoHint title="Reading the FDR plot" text="Each dot is one statistical finding, sorted left-to-right by p-value (Y-axis is the p-value, log-scaled). The red dashed line is the Benjamini–Hochberg threshold. Green dots fall below the line — significant discoveries with the false-positive rate controlled; grey dots are above it and demoted to advisory. This stops large populations from manufacturing significance by chance." size={11} /></Eyebrow>
            <p style={{ fontSize: 11, color: 'var(--color-text-2)', margin: '6px 0 8px', lineHeight: 1.45 }}>Statistical findings ranked by p-value. Points below the Benjamini–Hochberg line are significant discoveries; above it are demoted to advisory.</p>
            <FdrStrip pvals={insights.pvals} q={0.05} />
          </Card>
          {insights.txnRows.length > 0 && (
            <Card padding={16}>
              <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><Share2 size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Counterparty network<InfoHint title="Reading the network graph" text="Each dot is an account; a line is money flowing between two accounts. Dot size grows with how many counterparties an account touches. Red dots are collection hubs (many accounts pay in), amber dots are distribution fans (one account pays many out), and red lines mark round-trips where money flows both ways. Hubs, fans and round-trips are the layering structures the graph detector surfaces." size={11} /></Eyebrow>
              <p style={{ fontSize: 11, color: 'var(--color-text-2)', margin: '6px 0 8px', lineHeight: 1.45 }}>The account→counterparty money-flow graph. Collection hubs and distribution fans are the layering structures the graph detector surfaces.</p>
              <NetworkGraph rows={insights.txnRows} />
            </Card>
          )}
          {insights.treemapItems.length > 0 && (
            <Card padding={16}>
              <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><Layers size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Materiality map — flagged exposure by agent<InfoHint title="Reading the materiality map" text="Each rectangle is an agent. Its area is proportional to the LKR exposure that agent flagged — bigger block, more money at risk. Colour is the agent's worst severity: red = at least one critical finding, amber = high, gold = medium. The big red blocks are where the money and the risk concentrate; hover a block for its exact exposure and finding counts." size={11} /></Eyebrow>
              <p style={{ fontSize: 11, color: 'var(--color-text-2)', margin: '6px 0 8px', lineHeight: 1.45 }}>Each block is an agent, sized by the LKR exposure it flagged and coloured by its worst severity — where the money and the risk concentrate.</p>
              <ExposureTreemap items={insights.treemapItems} />
            </Card>
          )}
          {insights.creditRows.length > 0 && (
            <Card padding={16}>
              <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><TrendingUp size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Credit vintage cohorts<InfoHint title="Reading the vintage chart" text="Each bar is a loan cohort grouped by origination quarter (X-axis); bar height is that cohort's Stage-3 (non-performing) rate (Y-axis, %). A bar standing taller than its neighbours signals weaker underwriting in that quarter. Red bars are the cohorts the engine flagged as statistical outliers (robust-z); blue bars are within the normal range." size={11} /></Eyebrow>
              <p style={{ fontSize: 11, color: 'var(--color-text-2)', margin: '6px 0 8px', lineHeight: 1.45 }}>Stage-3 (NPL) rate by origination quarter. Red bars are cohorts the engine flagged as robust-z outliers — underwriting-quality drift.</p>
              <VintageCurve rows={insights.creditRows} flaggedQuarters={insights.vintageFlagged} />
            </Card>
          )}
          {insights.appetiteGauges.length > 0 && (
            <Card padding={16}>
              <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><Gauge size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Capital & liquidity vs appetite<InfoHint title="Reading the appetite gauges" text="Each horizontal bar is one ratio (Tier 1 CAR, Total CAR, LCR, NSFR). The bold marker is the Sentinel-computed value. The red tick is the CBSL statutory floor and the green tick is the bank's internal appetite; the band shades red below the floor, amber in the floor-to-appetite buffer, and green at or above appetite. The gap from the marker to the floor is your headroom." size={11} /></Eyebrow>
              <p style={{ fontSize: 11, color: 'var(--color-text-2)', margin: '6px 0 10px', lineHeight: 1.45 }}>Sentinel-computed ratios against the CBSL regulatory floor (red) and the bank's internal appetite (green). The marker shows headroom.</p>
              <AppetiteGauge gauges={insights.appetiteGauges} />
            </Card>
          )}
          {insights.geoEvents.length > 0 && (
            <Card padding={16}>
              <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><MapPin size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Impossible travel (geo-velocity)<InfoHint title="Reading the geo-velocity map" text="Each arc connects the two login cities of one account's back-to-back sessions, plotted on a lon/lat grid. The blue endpoint is the earlier (origin) login, the red endpoint the later (destination) one. The number on each arc is the implied travel speed — great-circle distance ÷ elapsed time. A line spanning a long distance at thousands of km/h is faster than any flight, so the same credentials were used in two places at once." size={11} /></Eyebrow>
              <p style={{ fontSize: 11, color: 'var(--color-text-2)', margin: '6px 0 8px', lineHeight: 1.45 }}>Sessions whose two login cities are too far apart for the elapsed time — great-circle distance ÷ time exceeds feasible air travel.</p>
              <GeoVelocity events={insights.geoEvents} />
            </Card>
          )}
          {rowsLostOnReload && (
            <div style={{ gridColumn: '1 / -1' }}>
              <Card padding={16} accent="#B45309">
                <Eyebrow><Database size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Some live-data visuals need a re-run</Eyebrow>
                <p style={{ fontSize: 11.5, color: 'var(--color-text-2)', margin: '6px 0 10px', lineHeight: 1.5, maxWidth: 780 }}>
                  The counterparty network, credit-vintage cohorts, capital &amp; liquidity gauges and input-drift charts are rebuilt from the raw source records. To stay within browser-storage limits those records aren't kept across a page reload — the engine's findings and metrics above are. Re-sync the data lake (or the demo) to bring these visuals back.
                </p>
                <button onClick={() => navigate('/business-view/data')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', fontFamily: 'inherit' }}>
                  <Database size={13} /> Go to Data Sources
                </button>
              </Card>
            </div>
          )}
          {!rowsLostOnReload && rowsSampled && (
            <div style={{ gridColumn: '1 / -1', fontSize: 10.5, color: 'var(--color-text-3)', lineHeight: 1.45, padding: '2px 2px' }}>
              Note: a capped sample of the source records is retained across reloads, so the row-derived charts above (network, vintage, gauges) reflect that sample rather than the full population. Re-sync for the complete view.
            </div>
          )}
        </div>
      )}

      {/* Input-distribution drift (S4) */}
      {drift.length > 0 && (
        <Card padding={16}>
          <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><Activity size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Input drift vs baseline<InfoHint title="Reading the drift metrics" text="Two transparent statistics compare the current upload to the distribution frozen on the agent's first run. PSI (Population Stability Index): below 0.1 = stable, 0.1–0.25 = moderate shift, above 0.25 = the input population has materially moved. KS D is the largest gap between the two distributions (0 = identical, 1 = no overlap) and KS p is its significance — p below 0.05 means the shift is unlikely to be chance. A shifted input means your thresholds may need re-tuning." size={11} /></Eyebrow>
          <p style={{ fontSize: 11.5, color: 'var(--color-text-2)', margin: '6px 0 10px', maxWidth: 820, lineHeight: 1.5 }}>
            Each agent's first run froze a reference distribution of its key input. The current upload is compared to it — <strong>Population Stability Index</strong> &gt; 0.25 (or a significant KS test) means the input population has shifted and your thresholds may need re-tuning.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {drift.map(d => {
              const shifted = (d.psi != null && d.psi > 0.25) || (d.ksP != null && d.ksP < 0.05);
              const moderate = d.psi != null && d.psi > 0.1 && d.psi <= 0.25;
              const color = shifted ? '#C41E3A' : moderate ? '#B45309' : '#0BBF7A';
              return (
                <div key={d.agentId} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1fr 1fr', gap: 8, fontSize: 12, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 700 }}>{AGENT_META[d.agentId]?.name || d.agentId} <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontFamily: 'var(--font-mono,monospace)' }}>{d.field}</span></span>
                  <span style={{ fontWeight: 800, color }}>{d.psi == null ? '—' : `PSI ${d.psi.toFixed(2)}`}</span>
                  <Num style={{ fontSize: 11 }}>KS D={d.ksD ?? '—'}{d.ksP != null ? `, p=${d.ksP < 1e-3 ? d.ksP.toExponential(1) : d.ksP}` : ''}</Num>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color }}>{shifted ? 'SHIFTED — recalibrate' : moderate ? 'moderate shift' : 'stable'}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Backtesting — run history (S4) */}
      {history.length > 0 && (
        <Card padding={16}>
          <Eyebrow style={{ display: 'inline-flex', alignItems: 'center' }}><History size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Run history (backtesting)<InfoHint title="Reading the run-history trend" text="Each point on the X-axis is one engine run in sequence. The shaded blue area is total findings raised that run; the red line is how many were critical. Plotting volume over time makes detector behaviour auditable — a sudden jump or drop between runs is itself a signal worth explaining. The table below lists the most recent runs with their reproducibility hash." size={11} /></Eyebrow>
          <p style={{ fontSize: 11.5, color: 'var(--color-text-2)', margin: '6px 0 10px' }}>
            {history.length} engine run{history.length === 1 ? '' : 's'} recorded. Tracking findings per run over time makes detector behaviour auditable — a sudden jump or drop is itself a signal.
          </p>
          <BacktestTrend snapshots={history} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
            {history.slice(-8).reverse().map((h, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 0.8fr 1fr', gap: 8, fontSize: 11.5, alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>{AGENT_META[h.agentId]?.name || h.agentId}</span>
                <span style={{ color: 'var(--color-text-3)' }}>{String(h.ts || '').replace('T', ' ').slice(0, 16)}</span>
                <Num style={{ fontSize: 11.5 }}>{h.findings}{h.critical ? ` · ${h.critical}C` : ''}</Num>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono,monospace)', color: 'var(--color-text-3)' }}>{h.contentHash || '—'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', lineHeight: 1.55 }}>
        Reproducibility hash is a deterministic fingerprint of an agent's findings — re-running the engine on identical data yields the identical hash. AI-generated agents (pending a deterministic detector) are not reproducible and carry no hash; their output is labelled accordingly throughout the platform.
      </div>
    </div>
  );
}

function Stat({ label, value, accent = 'var(--color-text)', help }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Eyebrow>{label}</Eyebrow>{help && <InfoHint text={help} title={label} size={11} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent, fontFamily: 'var(--font-display)', lineHeight: 1.1, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
