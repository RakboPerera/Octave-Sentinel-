// ─── CURRENT REGULATORY SNAPSHOT ─────────────────────────────────────────────
// Bank-reported ratios as at the last published period. Used ONLY as fallback
// values for derived computations (e.g. computeComplianceSnapshot in
// AppContext.jsx) when live agent output and the demoData historical_trend
// are both unavailable.
//
// FIX L8: These figures were previously hardcoded at three sites in
// AppContext.jsx, so a quarter-end refresh required hunting through reducer
// code. Update this file at quarter-end; every consumer reflows.
//
// IMPORTANT: these are CURRENT POINT-IN-TIME values, not regulatory floors.
// Floors live in regulatoryFloors.js and must NOT be edited here.

export const CURRENT_REGULATORY_SNAPSHOT = {
  // FY2025 Demo Bank published ratios
  as_of: 'FY2025',
  car_total_pct: 20.17,
  car_tier1_pct: 19.06,
  lcr_pct: 203.4,
  nsfr_pct: 138.3,
  stage3_ratio_pct: 3.50,        // audit-observed underlying — see credit.js prompt
  stage3_reported_pct: 0.91,     // bank-submitted figure
};
