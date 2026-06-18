// ─── AGENT OUTPUT SCHEMAS (CC2: runtime payload validation) ──────────────────
// The agents return free-form LLM JSON. `tryParseJson` only guarantees the text
// PARSED — not that the shape is usable. A valid-JSON-but-wrong-shape response
// (a bare array, an empty object, the wrong schema entirely, a finding list that
// came back as a string, or a numeric `severity`) would otherwise flow straight
// to the UI — silently producing zero findings, or crashing downstream code such
// as `(f.severity || 'medium').toLowerCase()` and the exposure aggregations.
//
// This module declares, per agent, the keys its prompt actually instructs (see
// backend/prompts/*.js) and a tolerant validator. Validation is deliberately
// PERMISSIVE: it rejects only shapes the frontend genuinely cannot consume, so a
// legitimate response is never thrown away. A rejection is treated like a parse
// failure by runAgentWithRetries — the model gets another attempt before the
// request fails, rather than persisting garbage.
//
// `anchors`  — summary/position objects the schema always includes. At least one
//              (OR at least one declared array) must be present.
// `arrays`   — list keys the schema declares; if present they MUST be arrays.

export const AGENT_SCHEMAS = {
  // ── Phase 1 ──────────────────────────────────────────────────────────────
  credit:         { anchors: ['portfolio_summary'], arrays: ['flagged_loans', 'vintage_analysis', 'sector_concentration', 'branch_concentration', 'key_findings', 'orchestrator_signals'] },
  transaction:    { anchors: ['surveillance_summary'], arrays: ['structuring_clusters', 'velocity_anomalies', 'network_anomalies', 'str_queue', 'key_findings', 'orchestrator_signals'] },
  suspense:       { anchors: ['reconciliation_summary'], arrays: ['flagged_accounts', 'growth_anomalies', 'key_findings', 'orchestrator_signals'] },
  kyc:            { anchors: ['compliance_summary'], arrays: ['kyc_gaps', 'pep_findings', 'beneficial_ownership_gaps', 'introducer_concentration', 'branch_compliance_heatmap', 'str_assessments', 'key_findings', 'orchestrator_signals'] },
  controls:       { anchors: ['controls_summary'], arrays: ['sod_violations', 'branch_risk_scores', 'flagged_approvers', 'temporal_anomalies', 'key_findings', 'orchestrator_signals'] },
  digital:        { anchors: ['digital_summary'], arrays: ['anomalous_sessions', 'impossible_travel_cases', 'device_sharing_clusters', 'key_findings', 'orchestrator_signals'] },
  trade:          { anchors: ['trade_summary'], arrays: ['pricing_anomalies', 'duplicate_lc_cases', 'treasury_breaches', 'key_findings', 'orchestrator_signals'] },
  insider:        { anchors: ['summary'], arrays: ['staff_profiles', 'key_findings', 'collusion_pairs', 'approval_chain_anomalies', 'orchestrator_signals'] },
  mje:            { anchors: ['mje_summary'], arrays: ['mje_entries', 'benford_distribution', 'gl_reconciliation', 'key_findings', 'orchestrator_signals'] },
  capital:        { anchors: ['capital_position', 'liquidity_position'], arrays: ['historical_trend', 'forward_projection', 'lcr_drivers', 'alco_actions', 'key_findings', 'orchestrator_signals'] },
  // NOTE: the live `balance` prompt emits window/net_movement/lcr_drivers, but
  // the bundled demo block uses structural_summary/drivers. Accept BOTH so
  // neither the live nor the demo shape is ever falsely rejected.
  balance:        { anchors: ['structural_summary', 'window', 'net_movement'], arrays: ['drivers', 'lcr_drivers', 'key_findings', 'orchestrator_signals'] },

  // ── Phase 2 ──────────────────────────────────────────────────────────────
  wealth:         { anchors: ['portfolio_summary'], arrays: ['suitability_flags', 'concentration_flags', 'churn_flags', 'key_findings', 'orchestrator_signals'] },
  collateral:     { anchors: ['collateral_summary'], arrays: ['stale_valuations', 'ltv_breaches', 'double_pledges', 'valuer_concentration', 'key_findings', 'orchestrator_signals'] },
  connectedParty: { anchors: ['connected_summary'], arrays: ['single_obligor_breaches', 'connected_group_breaches', 'shared_director_networks', 'shell_patterns', 'key_findings', 'orchestrator_signals'] },
  alm:            { anchors: ['alm_summary'], arrays: ['bucket_gaps', 'rate_scenarios', 'key_findings', 'orchestrator_signals'] },
  thirdParty:     { anchors: ['vendor_summary'], arrays: ['concentration_flags', 'stale_assessments', 'critical_exit_readiness', 'cbsl_notification_gaps', 'key_findings', 'orchestrator_signals'] },
  accessRights:   { anchors: ['access_summary'], arrays: ['dormant_privileged', 'review_overdue', 'toxic_combinations', 'sod_conflicts', 'key_findings', 'orchestrator_signals'] },
  conduct:        { anchors: ['conduct_summary'], arrays: ['recurring_subjects', 'overdue_cases', 'whistleblower_clusters', 'key_findings', 'orchestrator_signals'] },

  // ── Phase 3 ──────────────────────────────────────────────────────────────
  creditFraud:    { anchors: ['origination_summary'], arrays: ['flagged_facilities', 'guarantor_chains', 'key_findings', 'orchestrator_signals'] },
  regReporting:   { anchors: ['reporting_summary'], arrays: ['variances', 'return_coverage', 'key_findings', 'orchestrator_signals'] },
  staffAccess:    { anchors: ['consolidated_summary'], arrays: ['cross_layer_subjects', 'toxic_combos', 'key_findings', 'orchestrator_signals'] },

  // ── Structured-envelope agents (different output contracts) ──────────────
  explainability: { anchors: ['summary'], arrays: ['signals', 'trail', 'corroboration', 'data_lineage', 'regulatory_citations'], envelope: true },
  feedbackLoop:   { anchors: ['run_summary', 'recommendations', 'insufficient_evidence'], arrays: ['recommendations', 'insufficient_evidence'], envelope: true },
  // orchestrator is run outside the /:agentName route today, but schema kept here
  // so any future caller can validate it through the same path.
  orchestrator:   { anchors: ['correlations', 'kri_summary'], arrays: ['correlations', 'systemic_patterns', 'priority_actions'], envelope: true },
};

// Severity must be a STRING the frontend can `.toLowerCase()`. Unknown string
// values are tolerated (the UI falls back to 'medium'); non-strings are not.
export const SEVERITY_IS_STRING_KEY = 'severity';

// Validate a parsed agent payload against its declared schema.
// Returns { ok: boolean, errors: string[] }. Permissive by design — see header.
export function validateAgentResult(agentName, payload) {
  // 1. Must be a plain, non-null, non-array object.
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    const got = Array.isArray(payload) ? 'array' : payload === null ? 'null' : typeof payload;
    return { ok: false, errors: [`expected a JSON object, got ${got}`] };
  }

  // 2. Reject an empty object — no usable content.
  const keys = Object.keys(payload);
  if (keys.length === 0) return { ok: false, errors: ['payload object is empty'] };

  const errors = [];
  const schema = AGENT_SCHEMAS[agentName];

  if (schema) {
    // 3. Wrong-schema guard: a valid response always carries at least one anchor
    //    object OR at least one of its declared finding arrays. Neither present
    //    means the model answered with an off-schema shape we can't consume.
    const hasAnchor = (schema.anchors || []).some(a => a in payload);
    const hasAnyArray = (schema.arrays || []).some(k => Array.isArray(payload[k]));
    if (!hasAnchor && !hasAnyArray) {
      errors.push(`payload does not match the ${agentName} schema — none of [${[...(schema.anchors || []), ...(schema.arrays || [])].join(', ')}] present`);
    }

    // 4. Declared list keys, when present, must actually be arrays. Catches the
    //    classic "key_findings": "none" / null regression that drops findings.
    for (const k of (schema.arrays || [])) {
      if (k in payload && payload[k] != null && !Array.isArray(payload[k])) {
        errors.push(`"${k}" must be an array, got ${typeof payload[k]}`);
      }
    }
  }

  // 5. Frontend-crash guard: any finding object carrying a non-string severity
  //    would throw on (f.severity || 'medium').toLowerCase(). Scan the agent's
  //    declared arrays (or all top-level arrays when the agent is unknown).
  const scanKeys = schema && schema.arrays ? schema.arrays : keys;
  for (const k of scanKeys) {
    const arr = payload[k];
    if (!Array.isArray(arr)) continue;
    const bad = arr.some(item => item && typeof item === 'object'
      && SEVERITY_IS_STRING_KEY in item && typeof item[SEVERITY_IS_STRING_KEY] !== 'string');
    if (bad) { errors.push(`"${k}[].severity" must be a string when present`); }
  }

  return { ok: errors.length === 0, errors };
}
