// ─── LOSS EVENT CAPTURE ──────────────────────────────────────────────────────
// Post-processor. Takes the full set of agent findings already in state and
// computes estimated loss / recovery for each, grouped by Basel-II operational-
// loss category. NOT an LLM agent — deterministic rule engine.
//
// Usage:
//   import { captureLossEvents } from '../utils/lossEventCapture.js';
//   const events = captureLossEvents(allFindings);
//   const summary = summariseLossEvents(events);
//
// Loss-given-event multipliers below are midpoint estimates from ACFE /
// ORX / Basel committee published ranges for financial services. They apply
// to the `affected_exposure_lkr` field on a finding to produce an Expected
// Loss (EL) estimate. Recovery rates are typical industry benchmarks.
// Override in a single place if Demo Bank has its own loss-data-pool history.

// FIX M4: Delegate exposure extraction to the shared util so a new alias
// added to any prompt schema is picked up everywhere without parallel edits.
import { extractExposure } from './exposureDedup.js';

// Basel II event-type taxonomy (simplified to the four most relevant for Demo Bank):
//   IEF  — Internal Fraud (insider-enabled)
//   EEF  — External Fraud (ATO, structuring, TBML, origination fraud)
//   BDSF — Business Disruption & System Failures (third-party, access)
//   EPW  — Employment Practices & Workplace Safety (conduct)
//   CPBP — Clients, Products & Business Practices (mis-selling, suitability)

const AGENT_LOSS_PROFILE = {
  // agentId: { eventType, lge_fraction_by_severity, recovery_fraction, note }
  credit:         { eventType: 'Credit',  lge: { critical: 0.35, high: 0.18, medium: 0.06 }, recovery: 0.55, note: 'Misstaged-loan ECL understatement → expected loss ≈ provision gap × LGE; partial recovery via workout.' },
  creditFraud:    { eventType: 'EEF',     lge: { critical: 0.70, high: 0.40, medium: 0.15 }, recovery: 0.18, note: 'Origination fraud has high LGE because proceeds typically leave the bank fast; recovery mostly via legal proceedings.' },
  transaction:    { eventType: 'EEF',     lge: { critical: 0.60, high: 0.30, medium: 0.10 }, recovery: 0.22, note: 'Structuring / layering — portion recoverable via counterparty-bank cooperation and asset freezes.' },
  suspense:       { eventType: 'IEF',     lge: { critical: 0.45, high: 0.20, medium: 0.07 }, recovery: 0.30, note: 'Phantom receivable — recovery via GL unwind if caught within 90d; rapid deterioration thereafter.' },
  kyc:            { eventType: 'EEF',     lge: { critical: 0.25, high: 0.10, medium: 0.03 }, recovery: 0.40, note: 'Regulatory penalty + downstream fraud enabled — base penalty recoverable.' },
  staffAccess:    { eventType: 'IEF',     lge: { critical: 0.55, high: 0.25, medium: 0.08 }, recovery: 0.25, note: 'Consolidated insider + controls + entitlement failure; LGE higher due to system-enabled persistence.' },
  controls:       { eventType: 'IEF',     lge: { critical: 0.45, high: 0.18, medium: 0.06 }, recovery: 0.32, note: 'Branch-level SoD failures; recovery depends on discovery latency.' },
  insider:        { eventType: 'IEF',     lge: { critical: 0.60, high: 0.28, medium: 0.10 }, recovery: 0.20, note: 'Individual insider fraud pattern.' },
  accessRights:   { eventType: 'IEF',     lge: { critical: 0.35, high: 0.12, medium: 0.04 }, recovery: 0.35, note: 'Entitlement-layer failure — typically enables rather than causes loss directly.' },
  digital:        { eventType: 'EEF',     lge: { critical: 0.70, high: 0.35, medium: 0.12 }, recovery: 0.28, note: 'ATO / SIM-swap fraud — recovery mostly via MFA bypass blocks and carrier SIM-swap investigations.' },
  trade:          { eventType: 'EEF',     lge: { critical: 0.25, high: 0.10, medium: 0.03 }, recovery: 0.15, note: 'TBML — exposure is regulatory and reputational; LGE is low on direct loss, high on penalties.' },
  mje:            { eventType: 'IEF',     lge: { critical: 0.40, high: 0.15, medium: 0.05 }, recovery: 0.55, note: 'Journal anomalies — most recoverable via reversal if caught before period close.' },
  capital:        { eventType: 'BDSF',    lge: { critical: 0.05, high: 0.02, medium: 0.00 }, recovery: 0.60, note: 'CAR/LCR breaches — loss is primarily regulatory, not transactional.' },
  balance:        { eventType: 'BDSF',    lge: { critical: 0.03, high: 0.01, medium: 0.00 }, recovery: 0.60, note: 'Helper of capital; same loss profile.' },
  wealth:         { eventType: 'CPBP',    lge: { critical: 0.30, high: 0.15, medium: 0.05 }, recovery: 0.50, note: 'Mis-selling — partial refund via customer remediation programmes.' },
  collateral:     { eventType: 'Credit',  lge: { critical: 0.40, high: 0.20, medium: 0.07 }, recovery: 0.45, note: 'Collateral shortfalls — LGE is the unsecured slice.' },
  connectedParty: { eventType: 'Credit',  lge: { critical: 0.20, high: 0.09, medium: 0.03 }, recovery: 0.55, note: 'Single-obligor breaches — expected loss only on correlated default.' },
  alm:            { eventType: 'BDSF',    lge: { critical: 0.08, high: 0.03, medium: 0.01 }, recovery: 0.50, note: 'IRRBB — loss via NII erosion under adverse scenarios.' },
  thirdParty:     { eventType: 'BDSF',    lge: { critical: 0.15, high: 0.06, medium: 0.02 }, recovery: 0.45, note: 'Vendor concentration — loss via business disruption during incident.' },
  regReporting:   { eventType: 'BDSF',    lge: { critical: 0.04, high: 0.015, medium: 0.005 },recovery: 0.65, note: 'Returns integrity — loss is regulatory fine + remediation cost.' },
  conduct:        { eventType: 'EPW',     lge: { critical: 0.20, high: 0.08, medium: 0.03 }, recovery: 0.50, note: 'Conduct cases — loss via HR remediation + litigation.' },
};

const DEFAULT_PROFILE = { eventType: 'Other', lge: { critical: 0.30, high: 0.12, medium: 0.04 }, recovery: 0.35, note: 'Default profile when agent not in registry.' };

const getExposure = extractExposure;

// Main API. Returns an array of loss event records, one per qualifying finding.
// A finding qualifies if (a) severity is critical/high/medium AND (b) either
// exposure > 0 OR the agent's profile has a non-zero LGE even at zero exposure.
export function captureLossEvents(allFindings) {
  const out = [];
  for (const item of allFindings || []) {
    const agentId = item.agentId;
    const profile = AGENT_LOSS_PROFILE[agentId] || DEFAULT_PROFILE;
    const sev = (item.severity || 'medium').toLowerCase();
    const lgeFraction = profile.lge[sev] ?? 0;
    const exposure = getExposure(item);
    if (lgeFraction === 0 && exposure === 0) continue;

    const grossLoss = Math.round(exposure * lgeFraction);
    const recovery = Math.round(grossLoss * profile.recovery);
    const netLoss = Math.max(0, grossLoss - recovery);

    out.push({
      event_id: `LE-${agentId.toUpperCase()}-${(item.findingIndex ?? 0).toString().padStart(3, '0')}`,
      source_agent: agentId,
      source_finding_ref: `${agentId}::${item.findingIndex}`,
      event_type: profile.eventType,
      severity: sev,
      entity_ids: item.finding?.entity_ids || [],
      exposure_lkr: exposure,
      gross_loss_lkr: grossLoss,
      expected_recovery_lkr: recovery,
      net_loss_lkr: netLoss,
      lge_fraction: lgeFraction,
      recovery_fraction: profile.recovery,
      domain_tags: item.domainTags || [],
      narrative: `${item.finding?.finding || ''} · ${profile.note}`,
      captured_at: new Date().toISOString(),
    });
  }
  return out;
}

// Summarise across captured events. Useful for the audit-plan / board-pack view.
export function summariseLossEvents(events) {
  const summary = {
    total_events: events.length,
    total_gross_loss_lkr: 0,
    total_expected_recovery_lkr: 0,
    total_net_loss_lkr: 0,
    by_severity: { critical: 0, high: 0, medium: 0 },
    by_event_type: {},
    by_agent: {},
    by_domain: {},
    top_events: [],
  };
  for (const e of events) {
    summary.total_gross_loss_lkr       += e.gross_loss_lkr;
    summary.total_expected_recovery_lkr += e.expected_recovery_lkr;
    summary.total_net_loss_lkr          += e.net_loss_lkr;
    summary.by_severity[e.severity] = (summary.by_severity[e.severity] || 0) + 1;
    summary.by_event_type[e.event_type] = (summary.by_event_type[e.event_type] || 0) + e.net_loss_lkr;
    summary.by_agent[e.source_agent]    = (summary.by_agent[e.source_agent] || 0) + e.net_loss_lkr;
    for (const d of e.domain_tags) {
      summary.by_domain[d] = (summary.by_domain[d] || 0) + e.net_loss_lkr;
    }
  }
  // Top-10 events by net loss
  summary.top_events = [...events].sort((a, b) => b.net_loss_lkr - a.net_loss_lkr).slice(0, 10);
  return summary;
}

// Convenience hook-friendly selector — deterministic, no state of its own.
export function getLossEventCoveragePct(events) {
  // % of the total flagged-finding population that produced a capturable loss
  // record. A simple sanity metric on how much of detection translates to
  // quantified loss.
  if (!events || events.length === 0) return 0;
  return Math.round((events.filter(e => e.gross_loss_lkr > 0).length / events.length) * 100);
}
