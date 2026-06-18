// ─── THRESHOLD REGISTRY ──────────────────────────────────────────────────────
// Single source of truth for all detection thresholds across all agents.
// Every threshold here is:
//   (a) rendered as a tunable control in Rule Parameters
//   (b) injected into the agent's prompt at invocation time
//   (c) used by thresholdEvaluator.js to re-classify demo findings client-side
//
// Adding a new threshold: add an entry here, then reference t.<id> in the agent
// prompt function and in any frontend severity logic for that agent.

// Type hints for the UI
// integer      | whole number with min/max
// float        | decimal with min/max/step
// percentage   | 0–100 integer or decimal percentage
// lkr          | monetary in LKR
// days         | duration in whole days
// probability  | 0–1 float

export const THRESHOLDS = {
  // ─── CREDIT INTELLIGENCE ────────────────────────────────────────────────
  credit: {
    agentLabel: 'Credit Intelligence',
    group: 'SLFRS 9 Staging & ECL',
    rules: [
      { id: 'credit.isoforest_critical', label: 'Critical anomaly score (retired)', description: 'Legacy anomaly-score gate — RETIRED. Credit now flags staging deterministically (SLFRS 9 stage-trigger rules + peer/vintage statistics); no anomaly-score model runs. Kept only for backward compatibility.', type: 'probability', default: 0.85, bounds: { min: 0.50, max: 0.99, step: 0.01 }, regulatory: 'SLFRS 9 — SICR' },
      { id: 'credit.isoforest_flag',     label: 'Flag anomaly score (retired)',     description: 'Legacy anomaly-score gate — RETIRED. Superseded by deterministic SLFRS 9 stage-trigger rules; no anomaly-score model runs. Kept only for backward compatibility.', type: 'probability', default: 0.65, bounds: { min: 0.30, max: 0.90, step: 0.01 }, regulatory: 'SLFRS 9 — SICR' },
      { id: 'credit.dpd_stage2',         label: 'DPD → Stage 2',                   description: 'Days past due at which staging moves to Stage 2.',            type: 'days',        default: 30,   bounds: { min: 15, max: 60,  step: 1 },    regulatory: 'SLFRS 9' },
      { id: 'credit.dpd_stage3',         label: 'DPD → Stage 3',                   description: 'Days past due at which staging moves to Stage 3 (rebuttable).',type: 'days',        default: 90,   bounds: { min: 60, max: 180, step: 1 },    regulatory: 'SLFRS 9 — 90-day presumption' },
      { id: 'credit.collateral_stage2',  label: 'Collateral ratio — Stage 2 floor',description: 'Collateral ratio below which loan moves to Stage 2.',          type: 'float',       default: 0.70, bounds: { min: 0.40, max: 0.90, step: 0.01 }, regulatory: 'SLFRS 9' },
      { id: 'credit.collateral_stage3',  label: 'Collateral ratio — Stage 3 floor',description: 'Collateral ratio below which loan moves to Stage 3.',          type: 'float',       default: 0.40, bounds: { min: 0.20, max: 0.60, step: 0.01 }, regulatory: 'SLFRS 9' },
      { id: 'credit.restructure_stage3', label: 'Restructure count → Stage 3',     description: 'Number of restructures within 18 months that triggers Stage 3.',type: 'integer',     default: 2,    bounds: { min: 1, max: 4, step: 1 },        regulatory: 'Demo Bank Staging Policy' },
      { id: 'credit.car_impact_bps',     label: 'CAR impact notification threshold',description: 'CAR basis-point impact above which CBSL Board notification is required.', type: 'integer', default: 50, bounds: { min: 25, max: 100, step: 5 }, regulatory: 'CBSL Capital Adequacy' },
      { id: 'credit.sector_npl_flag',    label: 'Sector NPL flag threshold',       description: 'Sector NPL % above which sector concentration is flagged.',    type: 'percentage',  default: 2.0,  bounds: { min: 1.0, max: 5.0, step: 0.1 },  regulatory: 'Internal policy' },
    ],
  },

  // ─── TRANSACTION SURVEILLANCE ───────────────────────────────────────────
  transaction: {
    agentLabel: 'Transaction Surveillance',
    group: 'AML & Structuring Detection',
    rules: [
      { id: 'transaction.structuring_score',   label: 'Structuring score cutoff',      description: 'Composite score above which a cluster is flagged as structuring.', type: 'probability', default: 0.60, bounds: { min: 0.30, max: 0.95, step: 0.01 }, regulatory: 'FTRA §7' },
      { id: 'transaction.benford_pvalue',      label: "Benford's Law p-value",          description: 'p-value below which first-digit distribution is flagged.',        type: 'probability', default: 0.05, bounds: { min: 0.001, max: 0.10, step: 0.001 }, regulatory: 'AML best practice' },
      { id: 'transaction.str_threshold_lkr',   label: 'STR reporting threshold (LKR)', description: 'Single-transaction threshold above which an STR review triggers.',type: 'lkr',        default: 5000000, bounds: { min: 1000000, max: 10000000, step: 100000 }, regulatory: 'FTRA' },
      { id: 'transaction.cluster_window_min',  label: 'Structuring cluster time window (min)',description: 'Minutes within which transactions cluster for structuring score.', type: 'integer',default: 1440, bounds: { min: 60, max: 4320, step: 60 }, regulatory: 'FTRA' },
      { id: 'transaction.cluster_min_count',   label: 'Cluster minimum transactions',  description: 'Minimum transactions in a cluster to score.',                    type: 'integer',     default: 3,    bounds: { min: 2, max: 10, step: 1 },       regulatory: 'Internal' },
      { id: 'transaction.velocity_multiplier', label: 'Velocity multiplier',           description: 'Multiple of baseline velocity above which account is flagged.',    type: 'float',       default: 3.0,  bounds: { min: 1.5, max: 10.0, step: 0.1 }, regulatory: 'Internal' },
      { id: 'transaction.concentration_pct',   label: 'Counterparty concentration',    description: 'Outflow concentration to top-3 counterparties that flags layering.',type: 'percentage', default: 70,   bounds: { min: 40, max: 95, step: 1 },      regulatory: 'FATF' },
    ],
  },

  // ─── SUSPENSE & RECONCILIATION ──────────────────────────────────────────
  suspense: {
    agentLabel: 'Suspense & Reconciliation',
    group: 'Reconciliation Integrity',
    rules: [
      { id: 'suspense.growth_pct_30d',       label: '30-day growth flag (%)',        description: 'Balance growth over 30 days above which account is flagged.',     type: 'percentage',  default: 50, bounds: { min: 20, max: 200, step: 5 }, regulatory: 'CBSL Suspense' },
      { id: 'suspense.clearing_ratio_min',   label: 'Clearing ratio minimum',        description: 'Clearing ratio below which account is flagged as phantom.',     type: 'float',       default: 0.30, bounds: { min: 0.05, max: 0.60, step: 0.01 }, regulatory: 'CBSL Suspense' },
      { id: 'suspense.aging_breach_days',    label: 'CBSL aging breach (days)',      description: 'Age above which suspense balance is a CBSL regulatory breach.', type: 'days',        default: 90, bounds: { min: 60, max: 180, step: 1 }, regulatory: 'CBSL Suspense' },
      { id: 'suspense.size_material_lkr',    label: 'Material balance threshold',    description: 'Balance above which finding is material.',                       type: 'lkr',         default: 100000000, bounds: { min: 10000000, max: 1000000000, step: 10000000 }, regulatory: 'Internal' },
    ],
  },

  // ─── KYC / AML ─────────────────────────────────────────────────────────
  kyc: {
    agentLabel: 'Identity & KYC / AML',
    group: 'CDD & Compliance',
    rules: [
      { id: 'kyc.introducer_gap_pct',  label: 'Introducer gap rate',      description: 'Gap rate per introducer above which concentration is flagged.',   type: 'percentage', default: 15, bounds: { min: 5, max: 40, step: 1 },   regulatory: 'CBSL KYC' },
      { id: 'kyc.introducer_min_count',label: 'Introducer minimum count', description: 'Minimum gap accounts required to flag an introducer.',             type: 'integer',    default: 3,  bounds: { min: 1, max: 10, step: 1 },   regulatory: 'Internal' },
      { id: 'kyc.edd_stale_days',      label: 'PEP EDD staleness (days)', description: 'Days since last EDD review above which PEP is flagged.',           type: 'days',       default: 365,bounds: { min: 180, max: 730, step: 30 },regulatory: 'CBSL KYC' },
      { id: 'kyc.bo_gap_tolerance',    label: 'Beneficial ownership gap tolerance', description: 'Maximum tolerated % of accounts without BO disclosure.', type: 'percentage', default: 2,  bounds: { min: 0, max: 10, step: 0.5 }, regulatory: 'FATF' },
      { id: 'kyc.sanctions_match_min', label: 'Sanctions match score floor', description: 'Fuzzy-match score above which a hit requires manual review.',  type: 'probability',default: 0.82,bounds:{ min: 0.60, max: 0.98, step: 0.01 }, regulatory: 'UN/OFAC Sanctions' },
    ],
  },

  // ─── STAFF, ACCESS & CONTROL RISK ───────────────────────────────────────
  // Consolidated composite agent. Its own thresholds govern cross-layer
  // correlation scoring. Sub-agents (controls/insider/accessRights) retain
  // their own threshold blocks below for backend/agent-platform compatibility.
  staffAccess: {
    agentLabel: 'Staff, Access & Control Risk',
    group: 'Cross-Layer Staff Risk',
    rules: [
      { id: 'staffAccess.composite_critical',        label: 'Composite staff risk — critical',        description: 'Cross-layer composite (branch controls × staff behaviour × entitlement exposure) above which consolidated severity becomes critical.', type: 'probability', default: 0.85, bounds: { min: 0.50, max: 0.99, step: 0.01 }, regulatory: 'CBSL 5/2024' },
      { id: 'staffAccess.composite_flag',            label: 'Composite staff risk — flag',            description: 'Cross-layer composite above which consolidated severity becomes flag-worthy.',                                                                type: 'probability', default: 0.70, bounds: { min: 0.40, max: 0.90, step: 0.01 }, regulatory: 'CBSL 5/2024' },
      { id: 'staffAccess.multi_layer_boost',         label: 'Multi-layer corroboration boost',        description: 'Severity uplift applied when a subject is flagged at ≥2 layers (branch + staff + entitlement). 0.0 = no boost, 0.3 = strong boost.',        type: 'float',       default: 0.25, bounds: { min: 0.0, max: 0.5, step: 0.01 }, regulatory: 'Internal policy' },
      { id: 'staffAccess.evidence_preservation_sla', label: 'Evidence-preservation SLA (hours)',      description: 'When a staff risk score crosses critical, window within which system access logs must be preserved.',                                        type: 'integer',     default: 4,    bounds: { min: 1, max: 48, step: 1 },      regulatory: 'CBSL 5/2024 + ISO 27001' },
    ],
  },

  // ─── INTERNAL CONTROLS ─────────────────────────────────────────────────
  controls: {
    agentLabel: 'Internal Controls',
    group: 'Branch & Staff Controls',
    rules: [
      { id: 'controls.sod_violation_flag',      label: 'SoD violations — flag',           description: 'Number of SoD violations at a branch that triggers review.', type: 'integer',   default: 3,  bounds: { min: 1, max: 10, step: 1 },  regulatory: 'CBSL 5/2024' },
      { id: 'controls.override_concentration_pct',label: 'Override concentration flag',   description: 'Single-approver share of branch overrides that flags insider fraud.', type: 'percentage', default: 70, bounds: { min: 40, max: 95, step: 1 }, regulatory: 'CBSL 5/2024' },
      { id: 'controls.branch_composite_score',  label: 'Branch composite score floor',    description: 'Branch composite (0-100) below which audit is required.',    type: 'integer',   default: 65, bounds: { min: 40, max: 85, step: 1 },  regulatory: 'Internal' },
      { id: 'controls.off_hours_pct',           label: 'Off-hours approvals (%)',         description: 'Proportion of approvals between 21:00-06:00 that flags branch.', type: 'percentage', default: 15, bounds: { min: 5, max: 40, step: 1 }, regulatory: 'Internal' },
    ],
  },

  // ─── DIGITAL FRAUD ─────────────────────────────────────────────────────
  digital: {
    agentLabel: 'Digital Fraud & Identity',
    group: 'Session & Biometric Anomalies',
    rules: [
      { id: 'digital.travel_impossible_ratio', label: 'Impossible-travel ratio',        description: 'Ratio of min-travel-time to elapsed-time above which session pair is flagged.',  type: 'float', default: 3.0, bounds: { min: 1.2, max: 10.0, step: 0.1 }, regulatory: 'CBSL 2/2025' },
      { id: 'digital.biometric_deviation',     label: 'Behavioural deviation — critical cutoff', description: 'Behavioural-biometric deviation (0–1) at/above which a flagged session is escalated to CRITICAL (vs the session-anomaly flag cutoff for high).', type: 'probability', default: 0.90, bounds: { min: 0.75, max: 0.99, step: 0.01 }, regulatory: 'Internal' },
      { id: 'digital.mfa_fail_window',         label: 'MFA-fail window (min)',          description: 'Window for repeated MFA failures to flag ATO attempt.',             type: 'integer',     default: 30,   bounds: { min: 5, max: 120, step: 5 },       regulatory: 'Internal' },
      { id: 'digital.session_anomaly_score',   label: 'Session anomaly score flag',     description: 'Composite session score above which flag triggers.',                type: 'probability', default: 0.70, bounds: { min: 0.40, max: 0.95, step: 0.01 }, regulatory: 'Internal' },
    ],
  },

  // ─── TRADE FINANCE & TREASURY ───────────────────────────────────────────
  trade: {
    agentLabel: 'Trade Finance & Treasury',
    group: 'TBML & FX Limits',
    rules: [
      { id: 'trade.invoice_deviation_pct',  label: 'Invoice price deviation',  description: 'Deviation from customs/COMTRADE median that flags over/under-invoicing.', type: 'percentage', default: 25, bounds: { min: 10, max: 60, step: 1 }, regulatory: 'FATF TBML' },
      { id: 'trade.fx_limit_breach_pct',    label: 'FX limit breach tolerance',description: 'Utilisation % above which FX limit breach is flagged.',                  type: 'percentage', default: 95, bounds: { min: 80, max: 100, step: 1 },regulatory: 'CBSL FX' },
      { id: 'trade.duplicate_lc_overlap',   label: 'Duplicate LC overlap days',description: 'Shipment-period overlap above which duplicate LC is flagged.',          type: 'days',       default: 7,  bounds: { min: 1, max: 30, step: 1 }, regulatory: 'FATF TBML' },
    ],
  },

  // ─── INSIDER RISK ───────────────────────────────────────────────────────
  insider: {
    agentLabel: 'Insider Risk',
    group: 'Staff Behaviour',
    rules: [
      { id: 'insider.risk_score_flag',        label: 'Insider risk score flag', description: 'Composite staff risk score above which insider alert triggers.',    type: 'probability', default: 0.70, bounds: { min: 0.40, max: 0.95, step: 0.01 }, regulatory: 'CBSL 5/2024' },
      { id: 'insider.off_hours_staff_pct',    label: 'Staff off-hours activity',description: 'Staff off-hours activity % that flags behavioural anomaly. Unified with controls off-hours threshold to prevent contradictory severity outputs.',       type: 'percentage',  default: 15,   bounds: { min: 5, max: 50, step: 1 },       regulatory: 'Internal' },
      { id: 'insider.cross_cluster_min',      label: 'Same-cluster approvals',  description: 'Same-cluster approvals by one approver that flags collusion.',     type: 'integer',     default: 3,    bounds: { min: 1, max: 10, step: 1 },       regulatory: 'Internal' },
    ],
  },

  // ─── MJE TESTING ────────────────────────────────────────────────────────
  mje: {
    agentLabel: 'MJE Testing',
    group: 'Journal Integrity',
    rules: [
      { id: 'mje.round_amount_pct',        label: 'Round-amount concentration',description: 'Round-number concentration in journals that triggers anomaly.',    type: 'percentage', default: 15, bounds: { min: 5, max: 40, step: 1 }, regulatory: 'CBSL FR' },
      { id: 'mje.late_entry_hour',         label: 'Late-entry hour (24h)',     description: 'Hour after which manual journals are flagged as late.',             type: 'integer',    default: 19, bounds: { min: 16, max: 23, step: 1 },regulatory: 'Internal' },
      { id: 'mje.manual_material_lkr',     label: 'Manual journal material threshold', description: 'LKR threshold above which manual journals need Maker-Checker.',type: 'lkr',   default: 10000000, bounds: { min: 1000000, max: 100000000, step: 1000000 }, regulatory: 'CBSL FR' },
      { id: 'mje.tax_variance_pct',        label: 'Tax position variance',     description: 'Variance % between booked and expected tax position that flags review.', type: 'percentage', default: 5, bounds: { min: 1, max: 20, step: 0.5 }, regulatory: 'IRD' },
    ],
  },

  // ─── CAPITAL & LIQUIDITY ────────────────────────────────────────────────
  capital: {
    agentLabel: 'Capital & Liquidity',
    group: 'Basel III Ratios',
    rules: [
      { id: 'capital.tier1_min',  label: 'Tier 1 minimum',             description: 'Regulatory Tier 1 CAR minimum under Basel III (Sri Lanka LCBs).',          type: 'percentage', default: 10.0, bounds: { min: 8.0,  max: 14.0, step: 0.1 }, regulatory: 'Basel III' },
      { id: 'capital.car_min',    label: 'Total CAR minimum',          description: 'Regulatory Total CAR minimum under Basel III.',                            type: 'percentage', default: 14.0, bounds: { min: 10.0, max: 18.0, step: 0.1 }, regulatory: 'Basel III' },
      { id: 'capital.lcr_min',    label: 'LCR minimum',                description: 'Liquidity Coverage Ratio minimum.',                                        type: 'percentage', default: 100,  bounds: { min: 80,   max: 150,  step: 1   }, regulatory: 'Basel III' },
      { id: 'capital.nsfr_min',   label: 'NSFR minimum',               description: 'Net Stable Funding Ratio minimum.',                                        type: 'percentage', default: 100,  bounds: { min: 80,   max: 150,  step: 1   }, regulatory: 'Basel III' },
      { id: 'capital.leverage_min', label: 'Leverage ratio minimum',   description: 'Basel III leverage-ratio floor (Tier 1 / total exposure measure).',         type: 'percentage', default: 3.0,  bounds: { min: 3.0,  max: 8.0,  step: 0.1 }, regulatory: 'Basel III' },
    ],
  },

  // ─── BALANCE SHEET DRIVERS ──────────────────────────────────────────────
  balance: {
    agentLabel: 'Balance Sheet Drivers',
    group: 'Structural Attribution',
    rules: [
      { id: 'balance.depositor_concentration_pct', label: 'Corporate depositor concentration', description: '% of deposits from top-10 corporate depositors that flags concentration risk.', type: 'percentage', default: 35, bounds: { min: 20, max: 60, step: 1 }, regulatory: 'CBSL Liquidity' },
      { id: 'balance.hqla_quality_min',            label: 'HQLA Level 1 share',                description: 'Minimum share of Level 1 HQLA in total HQLA.',                                   type: 'percentage', default: 60, bounds: { min: 30, max: 90, step: 1 }, regulatory: 'Basel III' },
    ],
  },

  // ─── WEALTH SUITABILITY (NEW) ───────────────────────────────────────────
  wealth: {
    agentLabel: 'Wealth Suitability',
    group: 'Mis-selling & Suitability',
    rules: [
      { id: 'wealth.risk_profile_gap', label: 'Risk-profile gap tolerance', description: 'Gap between customer risk profile and product risk rating that flags suitability risk. CBSL Direction 1/2021 requires no material gap — tolerance of >1 allows Low Risk client to receive Moderate product.', type: 'integer', default: 1, bounds: { min: 1, max: 4, step: 1 }, regulatory: 'CBSL Direction 1/2021 — Wealth Management' },
      { id: 'wealth.concentration_pct', label: 'Single-product concentration',description: '% of portfolio in a single product above which concentration is flagged.',           type: 'percentage', default: 40, bounds: { min: 20, max: 80, step: 1 }, regulatory: 'Internal' },
      { id: 'wealth.churn_velocity',    label: 'Churn velocity flag',        description: 'Number of product-switches in 90 days that flags churning.',                         type: 'integer',    default: 4,  bounds: { min: 2,  max: 10, step: 1 }, regulatory: 'Conduct' },
    ],
  },

  // ─── COLLATERAL INTEGRITY (NEW) ────────────────────────────────────────
  collateral: {
    agentLabel: 'Collateral Integrity',
    group: 'LTV & Valuation',
    rules: [
      { id: 'collateral.stale_days',      label: 'Valuation staleness (days)',description: 'Days since last valuation above which collateral is flagged stale.',   type: 'days',     default: 365, bounds: { min: 180, max: 1095, step: 30 }, regulatory: 'CBSL Collateral' },
      { id: 'collateral.ltv_breach_pct',  label: 'LTV breach threshold',      description: 'LTV above which breach is flagged.',                                     type: 'percentage', default: 85, bounds: { min: 60, max: 95, step: 1 }, regulatory: 'CBSL' },
      { id: 'collateral.pledge_max_count',label: 'Double-pledge tolerance',   description: 'Maximum pledges on a single collateral before flag.',                    type: 'integer',    default: 1,  bounds: { min: 1,  max: 3, step: 1 }, regulatory: 'Internal' },
    ],
  },

  // ─── CONNECTED PARTY (NEW) ─────────────────────────────────────────────
  connectedParty: {
    agentLabel: 'Connected Party',
    group: 'Single-Obligor & Related Parties',
    rules: [
      { id: 'connectedParty.single_obligor_pct', label: 'Single-obligor limit',       description: '% of capital base above which single-obligor exposure is a CBSL breach.',type: 'percentage', default: 25,  bounds: { min: 15, max: 40, step: 0.5 }, regulatory: 'CBSL Large Exposures' },
      { id: 'connectedParty.aggregate_pct',      label: 'Aggregate connected limit',  description: '% of capital above which aggregate connected-group exposure is flagged.', type: 'percentage', default: 40,  bounds: { min: 25, max: 60, step: 1 },  regulatory: 'CBSL Related Parties' },
      { id: 'connectedParty.shared_director_flag',label: 'Shared director trigger',   description: 'Minimum shared directors to flag a connected group.',                     type: 'integer',    default: 2,   bounds: { min: 1,  max: 5, step: 1 },   regulatory: 'Internal' },
    ],
  },

  // ─── ALM & IRRBB (NEW) ──────────────────────────────────────────────────
  alm: {
    agentLabel: 'ALM & IRRBB',
    group: 'Interest Rate & Duration Risk',
    rules: [
      { id: 'alm.cumulative_gap_pct',  label: 'Cumulative gap limit',      description: 'Cumulative repricing gap as % of assets above which flag triggers.',type: 'percentage', default: 20,  bounds: { min: 5, max: 40, step: 1 }, regulatory: 'CBSL IRRBB' },
      { id: 'alm.eve_sensitivity_bps', label: 'EVE sensitivity (bps)',     description: 'Economic Value of Equity sensitivity to 200bps shift.',              type: 'integer',    default: 15,  bounds: { min: 5, max: 30, step: 1 }, regulatory: 'Basel IRRBB' },
      { id: 'alm.nii_sensitivity_pct', label: 'NII sensitivity (%)',       description: 'Net Interest Income sensitivity to 100bps parallel shift.',          type: 'percentage', default: 10,  bounds: { min: 2, max: 25, step: 0.5 },regulatory: 'Basel IRRBB' },
    ],
  },

  // ─── THIRD-PARTY RISK (NEW) ─────────────────────────────────────────────
  thirdParty: {
    agentLabel: 'Third-Party Risk',
    group: 'Vendor & Outsourcing',
    rules: [
      { id: 'thirdParty.concentration_pct',label: 'Vendor concentration flag',description: '% of category spend to one vendor above which concentration flags.',type: 'percentage', default: 60, bounds: { min: 30, max: 90, step: 1 }, regulatory: 'CBSL Outsourcing' },
      { id: 'thirdParty.assessment_stale', label: 'Vendor assessment staleness',description: 'Days since last risk assessment above which vendor flags.',         type: 'days',       default: 365,bounds: { min: 180, max: 730, step: 30 }, regulatory: 'CBSL Outsourcing' },
      { id: 'thirdParty.critical_exit_days',label: 'Critical contract exit window',description: 'Days to contract end below which critical-vendor exit readiness flags.',type: 'days',default: 180,bounds: { min: 30, max: 365, step: 30 }, regulatory: 'CBSL Outsourcing' },
    ],
  },

  // ─── ACCESS RIGHTS (NEW) ────────────────────────────────────────────────
  accessRights: {
    agentLabel: 'Access Rights',
    group: 'Privilege & Entitlements',
    rules: [
      { id: 'accessRights.dormant_days',   label: 'Dormant account threshold',  description: 'Days without login above which account is flagged dormant.',    type: 'days',    default: 90, bounds: { min: 30,  max: 365, step: 5 },regulatory: 'CIS Benchmark' },
      { id: 'accessRights.priv_review_days',label: 'Privileged review cycle',    description: 'Days between required reviews of privileged accounts.',        type: 'days',    default: 90, bounds: { min: 30,  max: 180, step: 5 },regulatory: 'CBSL Cyber' },
      { id: 'accessRights.toxic_combo_max',label: 'Toxic-combo tolerance',      description: 'Number of users with toxic entitlement combinations tolerated.',type: 'integer', default: 0,  bounds: { min: 0,   max: 5, step: 1 },   regulatory: 'CBSL 5/2024' },
    ],
  },

  // ─── CREDIT FRAUD / ORIGINATION ─────────────────────────────────────────
  creditFraud: {
    agentLabel: 'Credit Fraud & Origination',
    group: 'Origination Integrity',
    rules: [
      { id: 'creditFraud.siphon_window_hours',    label: 'Post-disbursement siphon window',    description: 'Hours after disbursement within which >X% of proceeds leaving to unrelated counterparties is flagged.', type: 'integer',    default: 72,  bounds: { min: 12, max: 240, step: 12 }, regulatory: 'FTRA §7' },
      { id: 'creditFraud.siphon_outflow_pct',     label: 'Post-disbursement outflow %',         description: 'Share of disbursed facility moving to non-declared-counterparty accounts that triggers siphon flag.', type: 'percentage', default: 85,  bounds: { min: 50, max: 99, step: 1 },   regulatory: 'FTRA §7' },
      { id: 'creditFraud.first_payment_default_d',label: 'First-payment default window (days)', description: 'Days after first due date within which missed payment counts as first-payment default. Aligned to CBSL SLFRS 9 90-day Stage 3 presumption.',         type: 'days',       default: 90,  bounds: { min: 30, max: 120, step: 5 },  regulatory: 'SLFRS 9 — 90-day Stage 3 presumption' },
      { id: 'creditFraud.guarantor_concentration',label: 'Guarantor concentration threshold',   description: 'Number of distinct facilities on which a single guarantor appears before concentration flag.',     type: 'integer',    default: 6,   bounds: { min: 3, max: 15, step: 1 },    regulatory: 'Internal policy' },
      { id: 'creditFraud.shell_borrower_score',   label: 'Shell-borrower composite score',      description: 'Composite over BO disclosure, business age, sector plausibility, address sharing; above this → flag.',type: 'probability',default: 0.75,bounds: { min: 0.50, max: 0.95, step: 0.01 },regulatory: 'CBSL KYC + FATF' },
      { id: 'creditFraud.amount_vs_cohort_sigma', label: 'Amount-vs-cohort σ cutoff',          description: 'Facility amount deviation above sector-peer cohort median in standard deviations.',            type: 'float',      default: 3.0, bounds: { min: 1.5, max: 6.0, step: 0.1 },regulatory: 'Internal policy' },
      { id: 'creditFraud.composite_critical',     label: 'Composite origination-fraud cutoff', description: 'Overall score above which origination fraud is flagged as critical.',                          type: 'probability',default: 0.80,bounds: { min: 0.50, max: 0.99, step: 0.01 },regulatory: 'Internal policy' },
    ],
  },

  // ─── REGULATORY REPORTING INTEGRITY ─────────────────────────────────────
  regReporting: {
    agentLabel: 'Regulatory Reporting Integrity',
    group: 'CBSL Returns Defensibility',
    rules: [
      { id: 'regReporting.car_tolerance_bps',      label: 'CAR return tolerance (bps)',     description: 'Absolute bps difference between Sentinel-computed and submitted CAR above which a material variance is flagged.', type: 'integer',    default: 10,   bounds: { min: 1, max: 50, step: 1 },    regulatory: 'CBSL Banking Act §46A' },
      { id: 'regReporting.lcr_tolerance_pct',      label: 'LCR return tolerance (%)',       description: 'Absolute pct difference between Sentinel-computed and submitted LCR above which a material variance is flagged.', type: 'percentage', default: 2.0,  bounds: { min: 0.5, max: 10, step: 0.5 },regulatory: 'CBSL Banking Act §46A' },
      { id: 'regReporting.nsfr_tolerance_pct',     label: 'NSFR return tolerance (%)',      description: 'Absolute pct difference between Sentinel-computed and submitted NSFR above which a material variance is flagged.', type: 'percentage',default: 2.0,   bounds: { min: 0.5, max: 10, step: 0.5 },regulatory: 'CBSL Banking Act §46A' },
      { id: 'regReporting.stage3_tolerance_bps',   label: 'Stage 3 tolerance (bps)',        description: 'Absolute bps difference between Credit-Intelligence-computed Stage 3 ratio and submitted return value.',       type: 'integer',    default: 15,   bounds: { min: 5, max: 50, step: 1 },    regulatory: 'SLFRS 9 + CBSL FR' },
      { id: 'regReporting.large_exp_tolerance_pct',label: 'Large-exposure tolerance (%)',    description: 'Absolute pct difference between aggregated connected-party exposure and submitted Large Exposure return.',  type: 'percentage', default: 1.0,  bounds: { min: 0.2, max: 5.0, step: 0.1 },regulatory: 'CBSL Large Exposures' },
      { id: 'regReporting.str_reconciliation_lag', label: 'STR-submission lag (days)',      description: 'Days between Transaction agent STR-eligibility flag and the actual STR filing with CBSL FIU.',              type: 'days',       default: 5,    bounds: { min: 1, max: 20, step: 1 },    regulatory: 'FTRA §7' },
      { id: 'regReporting.severity_critical',      label: 'Material variance — critical',    description: 'Threshold above which any variance becomes a critical finding requiring immediate remediation.',                type: 'probability',default: 0.80, bounds: { min: 0.50, max: 0.99, step: 0.01 },regulatory: 'CBSL Banking Act §46A' },
      { id: 'regReporting.leverage_tolerance_bps', label: 'Leverage ratio tolerance (bps)',  description: 'Absolute bps difference between Capital-agent-computed and submitted leverage ratio above which a material variance is flagged. Any submitted value below the CBSL 3.0% floor is always critical regardless of tolerance.', type: 'integer', default: 15, bounds: { min: 1, max: 50, step: 1 }, regulatory: 'Basel III / CBSL Direction No. 01/2016' },
    ],
  },

  // ─── FEEDBACK LOOP (META) ───────────────────────────────────────────────
  // FIX H4: Surfaces the numeric tunables of the feedback-loop meta-agent in
  // Rule Parameters so auditors can adjust learning sensitivity. True-positive
  // preservation is a fixed policy (asserted inline in the prompt) and is not
  // included here.
  feedbackLoop: {
    agentLabel: 'Feedback Loop',
    group: 'Learning & Recalibration',
    rules: [
      { id: 'feedbackLoop.min_false_positives',         label: 'Min false positives before recommendation', description: 'Per agent/rule, the minimum number of auditor-marked false positives required before the feedback loop will issue a tuning recommendation. Below this count the agent returns "more data needed".', type: 'integer',     default: 3,    bounds: { min: 1, max: 10, step: 1 },       regulatory: 'Internal policy' },
      { id: 'feedbackLoop.min_confidence',              label: 'Min recommendation confidence',            description: 'Recommendations below this confidence are held back rather than surfaced for approval.',                                                                                                  type: 'probability', default: 0.60, bounds: { min: 0.30, max: 0.95, step: 0.01 }, regulatory: 'Internal policy' },
      { id: 'feedbackLoop.max_recommendations_per_run', label: 'Max recommendations per run',              description: 'Caps the output so the human approver always has a focused, prioritised list.',                                                                                                              type: 'integer',     default: 5,    bounds: { min: 1, max: 20, step: 1 },       regulatory: 'Internal policy' },
    ],
  },

  // ─── CONDUCT & GRIEVANCE (NEW) ─────────────────────────────────────────
  conduct: {
    agentLabel: 'Conduct & Grievance',
    group: 'Behavioural & HR Signals',
    rules: [
      { id: 'conduct.recurrence_flag',       label: 'Recurrence flag',          description: 'Number of recurring conduct events for same subject that flags.',type: 'integer', default: 2, bounds: { min: 1, max: 5, step: 1 }, regulatory: 'Internal' },
      { id: 'conduct.resolution_days',       label: 'Open-case ageing (days)', description: 'Days a conduct case remains open before escalation.',           type: 'days',    default: 60,bounds: { min: 14, max: 180, step: 1 }, regulatory: 'Internal' },
      { id: 'conduct.whistleblower_window',  label: 'Whistleblower cluster (days)',description: 'Window during which multiple whistleblower cases cluster.',  type: 'days',    default: 30,bounds: { min: 7,  max: 90, step: 1 },  regulatory: 'Internal' },
    ],
  },
};

// FIX M9: Validate that every rule's bounds are internally consistent and that
// the default value falls within them. Runs at module load time so
// misconfigured thresholds fail fast rather than producing silently wrong LLM inputs.
(function validateThresholdRegistry() {
  for (const [agentId, agentBlock] of Object.entries(THRESHOLDS)) {
    for (const rule of agentBlock.rules || []) {
      const { id, default: def, bounds } = rule;
      if (!bounds) continue;
      const { min, max } = bounds;
      if (typeof min !== 'number' || typeof max !== 'number') {
        throw new Error(`Threshold ${id}: bounds min/max must be numbers`);
      }
      if (min > max) {
        throw new Error(`Threshold ${id}: min (${min}) > max (${max})`);
      }
      // FIX M-1: null/undefined default previously passed validation silently,
      // then rendered as NaN in the Rule Parameters sliders.
      if (def == null) {
        throw new Error(`Threshold ${id}: default value is missing (null or undefined)`);
      }
      if (def < min || def > max) {
        throw new Error(`Threshold ${id}: default (${def}) is outside bounds [${min}, ${max}]`);
      }
    }
  }
})();

// ─── FLATTENERS & HELPERS ─────────────────────────────────────────────────

export function getAllThresholds() {
  const out = [];
  for (const [agentId, block] of Object.entries(THRESHOLDS)) {
    for (const rule of block.rules) {
      out.push({ ...rule, agentId, agentLabel: block.agentLabel, group: block.group });
    }
  }
  return out;
}

export function getDefaults() {
  const out = {};
  for (const [agentId, block] of Object.entries(THRESHOLDS)) {
    out[agentId] = {};
    for (const rule of block.rules) {
      const key = rule.id.split('.').slice(1).join('.');
      out[agentId][key] = rule.default;
    }
  }
  return out;
}

export function getAgentDefaults(agentId) {
  return getDefaults()[agentId] || {};
}

// Maps threshold-id notation (credit.dpd_stage3) to agent-local key (dpd_stage3)
export function agentLocalKey(thresholdId) {
  return thresholdId.split('.').slice(1).join('.');
}

// ─── EVERYDAY THRESHOLDS (Phase E) ───────────────────────────────────────────
// The full registry exposes ~100 tunable thresholds across 24 agents — correct
// for an expert, overwhelming as a default. This curated subset is the dozen an
// auditor actually reaches for, grouped by AUDIT CONCERN rather than by agent
// (an auditor thinks "tighten Stage 2 staging", not "tune the credit agent").
// Rule Parameters opens on these; "All controls (expert)" reveals the full grid.
export const EVERYDAY_THRESHOLDS = {
  'SLFRS 9 Staging':         ['credit.dpd_stage2', 'credit.dpd_stage3', 'credit.isoforest_critical'],
  'AML & Financial Crime':   ['transaction.structuring_score', 'transaction.str_threshold_lkr', 'trade.invoice_deviation_pct'],
  'KYC & Onboarding':        ['kyc.introducer_gap_pct', 'kyc.edd_stale_days'],
  'Capital & Liquidity':     ['capital.tier1_min', 'capital.lcr_min'],
  'Connected-Party Limits':  ['connectedParty.single_obligor_pct'],
  'Reconciliation':          ['suspense.aging_breach_days'],
  'IT & Access Controls':    ['accessRights.toxic_combo_max'],
};

// Returns the everyday subset as [{ concern, rules: [...rule + agentId] }],
// ordered by EVERYDAY_THRESHOLDS insertion order. Unknown ids are skipped.
export function getEverydayThresholds() {
  const ruleById = {};
  for (const [agentId, block] of Object.entries(THRESHOLDS)) {
    for (const rule of block.rules) ruleById[rule.id] = { ...rule, agentId, agentLabel: block.agentLabel };
  }
  return Object.entries(EVERYDAY_THRESHOLDS)
    .map(([concern, ids]) => ({ concern, rules: ids.map(id => ruleById[id]).filter(Boolean) }))
    .filter(g => g.rules.length > 0);
}

// ─── PRESETS ──────────────────────────────────────────────────────────────
// Named configurations for quick switching in Rule Parameters.
// Multipliers applied to defaults where it makes sense; explicit values otherwise.
export const PRESETS = {
  Balanced:      { label: 'Balanced',      description: 'Default thresholds as shipped — balanced sensitivity.' },
  Conservative:  { label: 'Conservative',  description: 'Weaker triggers — fewer findings, higher precision.' },
  Aggressive:    { label: 'Aggressive',    description: 'Tighter triggers — more findings, broader coverage.' },
  'CBSL-Strict': { label: 'CBSL-Strict',   description: 'Strictest interpretation of Sri Lanka regulatory minimums.' },
};

// Preset deltas applied to the default registry. Express as { ruleId: value }.
// Leave empty for Balanced (== defaults).
export const PRESET_VALUES = {
  Balanced: {},
  Conservative: {
    'credit.isoforest_critical': 0.90,
    'credit.isoforest_flag':     0.75,
    'transaction.structuring_score': 0.70,
    'suspense.growth_pct_30d': 75,
    'controls.sod_violation_flag': 5,
    'kyc.introducer_gap_pct': 20,
  },
  Aggressive: {
    'credit.isoforest_critical': 0.78,
    'credit.isoforest_flag':     0.55,
    'credit.dpd_stage3':         75,
    'transaction.structuring_score': 0.50,
    'transaction.benford_pvalue': 0.10,
    'suspense.growth_pct_30d': 35,
    'suspense.aging_breach_days': 60,
    'controls.sod_violation_flag': 2,
    'controls.branch_composite_score': 72,
    'kyc.introducer_gap_pct': 10,
  },
  'CBSL-Strict': {
    // Credit + compliance gates — aligned with prior preset.
    'credit.dpd_stage3': 90,
    'credit.car_impact_bps': 25,
    'suspense.aging_breach_days': 60,
    'controls.sod_violation_flag': 1,
    'controls.override_concentration_pct': 50,
    'connectedParty.single_obligor_pct': 20,
    'kyc.bo_gap_tolerance': 0,
    'transaction.str_threshold_lkr': 5000000,
    // Capital / liquidity — previously missing. A "strict" preset that left
    // these at the CBSL regulatory floor was misleading; these uplift the
    // internal-appetite band so Sentinel flags well before a regulatory breach.
    //   Tier 1 CAR   : CBSL floor 8.5%  → strict appetite 10.5% (+200bps)
    //   Total CAR    : CBSL floor 12.5% → strict appetite 15.0% (+250bps)
    //   LCR          : CBSL floor 100%  → strict appetite 110%  (+10ppt)
    //   NSFR         : CBSL floor 100%  → strict appetite 110%  (+10ppt)
    //   Leverage     : CBSL floor 3.0%  → strict appetite 5.0%  (+200bps)
    'capital.tier1_min': 10.5,
    'capital.car_min': 15.0,
    'capital.lcr_min': 110,
    'capital.nsfr_min': 110,
    'capital.leverage_min': 5.0,
  },
};

export function applyPresetToDefaults(presetName) {
  const defaults = getDefaults();
  const overrides = PRESET_VALUES[presetName] || {};
  for (const [ruleId, value] of Object.entries(overrides)) {
    const [agentId, ...rest] = ruleId.split('.');
    const key = rest.join('.');
    if (!defaults[agentId]) defaults[agentId] = {};
    defaults[agentId][key] = value;
  }
  return defaults;
}
