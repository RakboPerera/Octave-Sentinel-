// ─── DOMAIN AGGREGATIONS ─────────────────────────────────────────────────────
// Pure selectors that compute per-domain KPIs from the raw agent results.
// NEVER hardcode annual-report numbers here — everything flows from agent output.

import { collectFindings, filterFindingsForDomain, getAgentsTouchedByDomain } from './domainTagging.js';
import { extractExposure } from './exposureDedup.js';
import { getDomain } from '../data/domainRegistry.js';

// ─── RESULTS RESOLVER ────────────────────────────────────────────────────────
// Unified accessor: user-uploaded results (state.agentResults) take precedence
// over demoData fallback. Returns a single object keyed by agentId → result.
export function resolveResults(agentResults, demoData) {
  const agents = new Set([...Object.keys(agentResults || {}), ...Object.keys(demoData || {})]);
  const out = {};
  for (const a of agents) {
    out[a] = (agentResults && agentResults[a]) || (demoData && demoData[a]) || null;
  }
  return out;
}

// ─── DOMAIN SNAPSHOT ─────────────────────────────────────────────────────────
// Metrics shown on the landing card and deep-dive snapshot section.
// auditPlan is optional — when set, its performance materiality replaces the
// default LKR 20 Bn "big exposure" gate, and tolerable misstatement replaces
// the default LKR 5 Bn medium-volume gate, so residual risk tiers reflow
// when the auditor changes these values on the Audit Plan page.
export function computeDomainSnapshot(domainId, allFindings, auditPlan = {}) {
  const domain = getDomain(domainId);
  if (!domain) return null;

  const domainFindings = filterFindingsForDomain(allFindings, domainId);
  const keyFindings = domainFindings.filter(f => f.isKeyFinding);

  const sevCounts = { critical: 0, high: 0, medium: 0 };
  for (const f of keyFindings) {
    const s = (f.severity || 'medium').toLowerCase();
    if (sevCounts[s] != null) sevCounts[s]++;
  }

  // Aggregated exposure across key findings.
  // FIX M4: Use the shared extractExposure so capital / connectedParty findings
  // that emit aggregate_exposure_lkr aren't under-counted relative to the
  // entity-deduped rollup in exposureDedup.js.
  const exposure = keyFindings.reduce((sum, f) => sum + extractExposure(f), 0);

  // Which agents actually have findings that touch this domain
  const touchedAgents = getAgentsTouchedByDomain(domainId, allFindings);

  // Coverage completeness: how many of the domain's primary agents are actually emitting findings
  const expected = [...(domain.agentsPrimary || []), ...(domain.agentsSecondary || [])];
  const coverage = expected.length === 0 ? 1 : expected.filter(a => touchedAgents.includes(a)).length / expected.length;

  // Residual risk — bank-scale calibrated, audit-plan aware.
  // Gates:
  //   criticalGate: domain-level exposure above which a single critical becomes
  //     a critical residual. Defaults to LKR 20 Bn; overridden by
  //     auditPlan.materiality (performance materiality) when set — the
  //     auditor's explicit materiality threshold takes precedence.
  //   elevatedGate: exposure above which a cluster of lower-severity findings
  //     is enough to bump residual. Defaults to LKR 5 Bn; overridden by
  //     auditPlan.tolerableMisstatement when set.
  const performanceMat = Number(auditPlan?.materiality) > 0 ? Number(auditPlan.materiality) : null;
  const tolerableMis   = Number(auditPlan?.tolerableMisstatement) > 0 ? Number(auditPlan.tolerableMisstatement) : null;
  const criticalGate   = performanceMat ?? 20_000_000_000;
  const elevatedGate   = tolerableMis   ?? 5_000_000_000;

  const critN = sevCounts.critical;
  const highN = sevCounts.high;
  const medN  = sevCounts.medium;
  const expGteElevated = exposure >= elevatedGate;
  const expGteCritical = exposure >= criticalGate;
  let residual = 'low';
  if (
    critN >= 3 ||
    (critN >= 2 && highN >= 3) ||
    (critN >= 2 && expGteElevated) ||
    (critN >= 1 && expGteCritical)
  ) residual = 'critical';
  else if (critN >= 1 || highN >= 3 || (medN >= 6 && expGteElevated)) residual = 'high';
  else if (highN >= 1 || medN >= 3) residual = 'medium';

  return {
    domainId,
    findings: domainFindings,
    keyFindings,
    severityCounts: sevCounts,
    openCriticals: sevCounts.critical,
    aggregateExposureLkr: exposure,
    touchedAgents,
    coveragePct: Math.round(coverage * 100),
    residualRisk: residual,
    // Expose gates so the UI can explain which threshold drove residual
    residualGates: { criticalGate, elevatedGate, auditPlanDriven: performanceMat != null || tolerableMis != null },
  };
}

// ─── COVERAGE MATRIX ─────────────────────────────────────────────────────────
// For the "What Sentinel is watching" section — rows = risk vectors from the
// domain registry, columns = the agents, cells = whether the agent is covering
// that vector and whether it's currently producing findings.
export function computeCoverageMatrix(domainId, allFindings) {
  const domain = getDomain(domainId);
  if (!domain) return { rows: [], agents: [] };

  const domainFindings = filterFindingsForDomain(allFindings, domainId);

  // Union of agents that the registry says feed this domain
  const agents = [...new Set([...(domain.agentsPrimary || []), ...(domain.agentsSecondary || [])])];

  const rows = (domain.riskVectors || []).map(v => {
    const coveredBy = new Set(v.primaryAgents || []);

    // cells
    const cells = agents.map(a => {
      const covers = coveredBy.has(a);
      const hasActiveFindings = domainFindings.some(f => f.agentId === a && f.isKeyFinding);
      let status;
      if (!covers) status = 'not-covered';
      else if (hasActiveFindings) status = 'active-findings';
      else status = 'covered-clean';
      return { agentId: a, covers, hasActiveFindings, status };
    });

    const vectorCovered = (v.primaryAgents || []).length > 0;
    const vectorGap = v.gap || (vectorCovered ? null : 'not-covered');

    return {
      vectorId: v.id,
      label: v.label,
      severity: v.severity,
      gap: vectorGap,
      primaryAgents: v.primaryAgents,
      cells,
      coverageStatus: vectorGap === 'not-covered' ? 'gap' : vectorGap === 'partial' ? 'partial' : 'covered',
    };
  });

  return { rows, agents };
}

// ─── CORRELATIONS TOUCHING A DOMAIN ─────────────────────────────────────────
// Re-uses existing orchestrator / case correlation logic. A case touches a
// domain if any of its linked findings tag to that domain.
export function collectCorrelationsForDomain(domainId, allFindings, cases = []) {
  const agentIdsInDomain = new Set(allFindings.filter(f => f.domainTags.includes(domainId)).map(f => f.agentId));

  return (cases || []).filter(c => {
    if (!c) return false;
    if (c.domainId === domainId) return true;
    if (Array.isArray(c.agents)) return c.agents.some(a => agentIdsInDomain.has(a));
    if (c.agentId) return agentIdsInDomain.has(c.agentId);
    return false;
  });
}

// ─── FORMATTING HELPERS ──────────────────────────────────────────────────────
export function formatLkr(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return `LKR ${(n / 1e9).toFixed(2)} Bn`;
  if (Math.abs(n) >= 1e6) return `LKR ${(n / 1e6).toFixed(0)} Mn`;
  if (Math.abs(n) >= 1e3) return `LKR ${(n / 1e3).toFixed(0)} K`;
  return `LKR ${n.toFixed(0)}`;
}

// ─── BANK-WIDE SCALE ──────────────────────────────────────────────────────────
// Pulls scale metrics from agent outputs (capital/balance/credit summaries).
// Used on the Business Platform Overview ribbon. Returns nulls if no data.
export function computeBankScale(results) {
  const out = {
    totalAssetsLkr: null,
    totalLoansLkr: null,
    totalDepositsLkr: null,
    tier1Pct: null,
    lcrPct: null,
    nsfrPct: null,
    stage3Pct: null,
    branchCount: null,
    customerCount: null,
  };

  // ─── Capital agent: Tier 1 / LCR / NSFR ───────────────────────────────────
  const capital = results.capital;
  if (capital?.capital_position) {
    // Accept both field shapes the prompt may emit.
    out.tier1Pct =
      capital.capital_position.car_tier1_pct ??
      capital.capital_position.tier1_pct ??
      capital.capital_position.tier1_car ??
      null;
  }
  if (capital?.liquidity_position) {
    out.lcrPct = capital.liquidity_position.lcr_pct ?? null;
    out.nsfrPct = capital.liquidity_position.nsfr_pct ?? null;
  }
  // Fallback: if Capital agent hasn't run, try the last row of its historical trend.
  if ((out.tier1Pct == null || out.lcrPct == null) && Array.isArray(capital?.historical_trend) && capital.historical_trend.length) {
    const last = capital.historical_trend[capital.historical_trend.length - 1];
    if (out.tier1Pct == null && last?.tier1 != null) out.tier1Pct = last.tier1;
    if (out.lcrPct   == null && last?.lcr   != null) out.lcrPct   = last.lcr;
    if (out.nsfrPct  == null && last?.nsfr  != null) out.nsfrPct  = last.nsfr;
  }

  // ─── Credit agent: loan book + Stage 3 ────────────────────────────────────
  const credit = results.credit;
  if (credit?.portfolio_summary) {
    out.totalLoansLkr = credit.portfolio_summary.total_exposure_lkr ?? null;
  }
  if (credit?.capital_impact) {
    out.stage3Pct = credit.capital_impact.current_stage3_ratio ?? null;
    if (out.tier1Pct == null) out.tier1Pct = credit.capital_impact.current_tier1_car ?? null;
  }

  // ─── Balance agent: total assets + deposits ───────────────────────────────
  const balance = results.balance;
  if (balance?.structural_summary) {
    out.totalAssetsLkr = balance.structural_summary.total_assets_lkr ?? out.totalAssetsLkr;
    out.totalDepositsLkr = balance.structural_summary.total_deposits_lkr ?? out.totalDepositsLkr;
  }

  // ─── Controls: branch count ───────────────────────────────────────────────
  const controls = results.controls;
  if (controls?.controls_summary) {
    out.branchCount = controls.controls_summary.total_branches ?? out.branchCount;
  }

  const kyc = results.kyc;
  if (kyc?.compliance_summary) {
    out.customerCount = kyc.compliance_summary.total_customers_analyzed ?? out.customerCount;
  }

  return out;
}
