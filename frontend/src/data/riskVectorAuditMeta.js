// ─── RISK VECTOR AUDIT METADATA (Wave 4) ─────────────────────────────────────
// ISA 315 / 330 audit artefacts per risk vector in domainRegistry.js.
//   • objective        — what an audit of this risk is trying to assure
//   • criteria         — the regulatory / policy standard the risk is measured against
//   • inherentRisk     — static 1-5 ISA 315 inherent risk rating (before controls)
//   • sampling         — default sampling methodology for this vector
//   • reviewCadence    — how often the vector is retested (ISA 330)
//
// Keyed by `${domainId}.${vectorId}` — unknown keys fall through to a domain-
// level default in getRiskVectorAuditMeta().

export const RISK_VECTOR_AUDIT_META = {
  // Consumer
  'consumer.slfrs9': {
    objective: 'Obtain reasonable assurance that consumer-loan Expected Credit Loss is measured on correctly-staged exposures.',
    criteria: 'SLFRS 9 §5.5 (Significant Increase in Credit Risk); Demo Bank Staging Policy v4.1; CBSL Banking Act Direction 13/2021 §4.',
    inherentRisk: 4,
    sampling: 'Stratified by sector and vintage; 100% of facilities over LKR 100 Mn; risk-based sample below.',
    reviewCadence: 'Quarterly',
  },
  'consumer.card-fraud': {
    objective: 'Assure transaction-monitoring and device-fingerprinting controls over card + digital channels.',
    criteria: 'CBSL Payment Card Regulations §4; FTRA §7 on suspicious transactions.',
    inherentRisk: 4,
    sampling: 'Real-time — 100% of transactions scanned; sample audit of 500 flagged sessions/month.',
    reviewCadence: 'Monthly',
  },
  'consumer.onboarding': {
    objective: 'Assure customer due diligence completeness at account opening.',
    criteria: 'CBSL KYC/CDD Rules 2016 §3; FATF Recommendation 10.',
    inherentRisk: 3,
    sampling: 'Risk-based: 100% of PEP / FATF-grey-list accounts; 5% random of retail onboardings/month.',
    reviewCadence: 'Monthly',
  },
  'consumer.branch-sod': {
    objective: 'Assure segregation of duties and override controls at branch level.',
    criteria: 'CBSL Banking Act Direction 11/2007 §3 (internal control system).',
    inherentRisk: 4,
    sampling: '100% of branches; weighted by asset size and override rate.',
    reviewCadence: 'Quarterly',
  },
  'consumer.wealth-suit': {
    objective: 'Assure product suitability and anti-misselling controls in wealth management.',
    criteria: 'CBSL Customer Suitability guidance; FCA-equivalent KID / suitability assessment.',
    inherentRisk: 3,
    sampling: 'RM-level sample of client portfolios; 100% of portfolios >LKR 100 Mn.',
    reviewCadence: 'Semi-annual',
  },

  // Commercial
  'commercial.sme-concentration': {
    objective: 'Assure SME sector-concentration limits are respected across the loan book.',
    criteria: 'Demo Bank Credit Policy §6; CBSL Banking Act Direction 13/2021 §5 (concentration).',
    inherentRisk: 4,
    sampling: '100% of sector aggregates; risk-based sample at borrower level.',
    reviewCadence: 'Quarterly',
  },
  'commercial.tbml': {
    objective: 'Assure trade-based money-laundering controls over LC and invoice processing.',
    criteria: 'FTRA §7; FATF Recommendations 10–14; CBSL Exchange Control Act.',
    inherentRisk: 5,
    sampling: '100% of LCs over USD 500k; statistical sample below.',
    reviewCadence: 'Monthly',
  },
  'commercial.collateral': {
    objective: 'Assure collateral valuation freshness and LTV adequacy.',
    criteria: 'SLFRS 9 §B5.5 (collateral in ECL); CBSL Direction 13/2021 §5 (valuation frequency).',
    inherentRisk: 4,
    sampling: '100% of collateral >LKR 50 Mn; risk-based sample below.',
    reviewCadence: 'Quarterly',
  },
  'commercial.introducer': {
    objective: 'Assure introducer-channel CDD integrity and prevent introducer-driven onboarding fraud.',
    criteria: 'CBSL KYC/CDD Rules 2016 §3 (introducer obligations).',
    inherentRisk: 4,
    sampling: '100% of introducers with >20 accounts; full review at gap rate >15%.',
    reviewCadence: 'Quarterly',
  },

  // Corporate
  'corporate.single-obligor': {
    objective: 'Assure no obligor exceeds the CBSL single-obligor limit of 25% of capital base.',
    criteria: 'CBSL Banking Act Direction 03/2018 §4 (Large Exposures).',
    inherentRisk: 5,
    sampling: '100% of obligors > 15% of capital base.',
    reviewCadence: 'Monthly',
  },
  'corporate.connected': {
    objective: 'Assure connected-party aggregation identifies all group exposures correctly.',
    criteria: 'CBSL Banking Act Direction 03/2018 §5 (connected groups); Direction 11/2007 §7.',
    inherentRisk: 5,
    sampling: '100% of known corporate groups; shared-director / common-BO scans on full population.',
    reviewCadence: 'Monthly',
  },
  'corporate.corp-structuring': {
    objective: 'Assure transaction structuring controls over corporate payment flows.',
    criteria: 'FTRA §7; CBSL Banking Act §46A.',
    inherentRisk: 4,
    sampling: 'Real-time monitoring; sample of structuring-flagged corporates/month.',
    reviewCadence: 'Monthly',
  },

  // Treasury
  'treasury.irrbb': {
    objective: 'Assure EVE and NII sensitivities remain within ALCO-approved IRRBB limits.',
    criteria: 'BCBS IRRBB Standards April 2016; CBSL Direction 07/2021.',
    inherentRisk: 4,
    sampling: '100% of rate-sensitive assets and liabilities; bucket-level full population.',
    reviewCadence: 'Monthly',
  },
  'treasury.liquidity': {
    objective: 'Assure Liquidity Coverage Ratio remains above regulatory and internal-appetite floors.',
    criteria: 'CBSL Direction 01/2016 §5 (LCR); Direction 12/2018 (NSFR).',
    inherentRisk: 3,
    sampling: 'Daily LCR computation; full HQLA + net cash outflow tracking.',
    reviewCadence: 'Weekly (daily during stress)',
  },

  // Risk (CRO domain)
  'risk.appetite-breach': {
    objective: 'Assure the bank operates within the Board-approved Risk Appetite Statement.',
    criteria: 'Demo Bank Risk Appetite Statement 2025; CBSL ICAAP guidance.',
    inherentRisk: 3,
    sampling: '100% of appetite metrics; monthly breach register review.',
    reviewCadence: 'Monthly',
  },
  'risk.concentration': {
    objective: 'Assure single-obligor and sector concentrations within risk appetite.',
    criteria: 'CBSL Direction 03/2018; Demo Bank Credit Policy §6.',
    inherentRisk: 4,
    sampling: '100% of exposures > 15% of capital base; sector aggregate roll-ups.',
    reviewCadence: 'Monthly',
  },
  'risk.stress': {
    objective: 'Assure stress-test scenarios and their impact on capital are fully modelled.',
    criteria: 'CBSL ICAAP; BCBS stress-testing principles.',
    inherentRisk: 3,
    sampling: 'Quarterly ICAAP stress suite; scenario coverage review.',
    reviewCadence: 'Quarterly',
  },
  'risk.vintage-quality': {
    objective: 'Assure recent-origination vintages do not exhibit deterioration above prior cohorts.',
    criteria: 'SLFRS 9 forward-looking ECL; Demo Bank Credit Policy §4 (origination quality).',
    inherentRisk: 4,
    sampling: 'Vintage cohort analysis on full origination book; monthly vintage migration report.',
    reviewCadence: 'Monthly',
  },

  // Compliance
  'compliance.str': {
    objective: 'Assure STR pipeline identifies, reviews and files suspicious-transaction reports within statutory deadlines.',
    criteria: 'FTRA §7 (5 working days); FIU Sri Lanka guidance.',
    inherentRisk: 5,
    sampling: '100% of STR-eligible alerts; audit sample of filed and discarded STRs.',
    reviewCadence: 'Monthly',
  },
  'compliance.pep-edd': {
    objective: 'Assure PEP Enhanced Due Diligence remains current for all identified PEPs.',
    criteria: 'CBSL KYC/CDD Rules 2016 §5 (EDD); FATF Recommendation 12.',
    inherentRisk: 4,
    sampling: '100% of PEP customers; 30-day refresh SLA enforced.',
    reviewCadence: 'Monthly',
  },
  'compliance.sanctions-hits': {
    objective: 'Assure sanctions screening produces high-quality hits and clears false positives defensibly.',
    criteria: 'UN Sanctions regime; OFAC; CBSL sanctions directives.',
    inherentRisk: 4,
    sampling: '100% of transactions screened; audit sample of clearing decisions.',
    reviewCadence: 'Monthly',
  },
  'compliance.structuring': {
    objective: 'Assure transaction-surveillance detects structuring patterns below STR thresholds.',
    criteria: 'FTRA §7; FATF Recommendations 10 / 20.',
    inherentRisk: 5,
    sampling: 'Real-time — 100% of transactions through rule engine + Benford analytics.',
    reviewCadence: 'Continuous',
  },
  'compliance.reg-returns': {
    objective: 'Assure regulatory return submissions are timely, complete, and accurate.',
    criteria: 'CBSL periodical-returns calendar; Banking Act §46.',
    inherentRisk: 3,
    sampling: '100% of scheduled returns; pre-submission maker-checker review.',
    reviewCadence: 'Per-submission',
  },

  // Finance
  'finance.mje-anomaly': {
    objective: 'Assure manual journal entries follow maker-checker and are free of fraud indicators.',
    criteria: 'SLAuS 240 §32; CBSL Direction 11/2007 §3; Demo Bank Finance Policy §MJE-02.',
    inherentRisk: 4,
    sampling: '100% of MJEs >LKR 10 Mn; all after-hours postings; 5% random sample below.',
    reviewCadence: 'Monthly',
  },
  'finance.car-impact': {
    objective: 'Assure critical findings are reflected in the forward capital projection.',
    criteria: 'CBSL ICAAP; Basel III capital rules; CBSL Direction 01/2016.',
    inherentRisk: 4,
    sampling: 'Quarterly capital projection with scenario overlay.',
    reviewCadence: 'Quarterly',
  },
  'finance.tax-positions': {
    objective: 'Assure tax positions and deferred-tax balances are recognised correctly.',
    criteria: 'Inland Revenue Act; LKAS 12; Demo Bank Tax Policy.',
    inherentRisk: 3,
    sampling: 'Full review annually; quarterly top-10 tax positions.',
    reviewCadence: 'Quarterly',
  },

  // Operations
  'operations.recon': {
    objective: 'Assure suspense and reconciliation items age within CBSL and internal limits.',
    criteria: 'CBSL Banking Act Direction 05/2024 §3 (suspense accounts).',
    inherentRisk: 4,
    sampling: '100% of suspense accounts; daily aging report.',
    reviewCadence: 'Daily (operational) / Monthly (audit sample)',
  },
  'operations.outsource': {
    objective: 'Assure critical-vendor concentration, exit readiness and assessment currency.',
    criteria: 'CBSL Banking Act Direction 02/2020 (outsourcing).',
    inherentRisk: 3,
    sampling: '100% of critical vendors; annual assessment cycle.',
    reviewCadence: 'Annual (assessment) / Quarterly (concentration)',
  },
};

// Domain-level fallback audit meta — used when a specific vector isn't in the
// table above. Keeps the UI honest even for new vectors that haven't been
// individually audited yet.
const DOMAIN_DEFAULTS = {
  consumer:   { reviewCadence: 'Quarterly',  inherentRisk: 3 },
  commercial: { reviewCadence: 'Quarterly',  inherentRisk: 4 },
  corporate:  { reviewCadence: 'Monthly',    inherentRisk: 4 },
  treasury:   { reviewCadence: 'Monthly',    inherentRisk: 3 },
  risk:       { reviewCadence: 'Monthly',    inherentRisk: 3 },
  compliance: { reviewCadence: 'Monthly',    inherentRisk: 4 },
  finance:    { reviewCadence: 'Quarterly',  inherentRisk: 3 },
  operations: { reviewCadence: 'Monthly',    inherentRisk: 3 },
  technology: { reviewCadence: 'Quarterly',  inherentRisk: 3 },
  audit:      { reviewCadence: 'Continuous', inherentRisk: 2 },
  people:     { reviewCadence: 'Semi-annual',inherentRisk: 3 },
};

export function getRiskVectorAuditMeta(domainId, vectorId) {
  const key = `${domainId}.${vectorId}`;
  if (RISK_VECTOR_AUDIT_META[key]) return RISK_VECTOR_AUDIT_META[key];
  const dom = DOMAIN_DEFAULTS[domainId] || { reviewCadence: 'Quarterly', inherentRisk: 3 };
  return {
    objective: `Assure controls operate effectively over the ${vectorId.replace(/-/g, ' ')} risk in this domain.`,
    criteria: 'Domain policy + applicable CBSL / SLFRS guidance (see domain regulatory tags).',
    inherentRisk: dom.inherentRisk,
    sampling: 'Risk-based sampling per domain audit methodology.',
    reviewCadence: dom.reviewCadence,
  };
}

// Given inherent risk (1..5) and a residual signal (critical/high/medium/low),
// return a projected NEXT REVIEW DATE. Critical findings shorten the cycle.
export function nextReviewDate(reviewCadence, residual) {
  const today = new Date();
  const daysByCadence = {
    'Continuous':               1,
    'Daily (operational) / Monthly (audit sample)': 7,
    'Daily': 1,
    'Weekly (daily during stress)': 7,
    'Monthly':                  30,
    'Per-submission':           30,
    'Quarterly':                90,
    'Semi-annual':              180,
    'Annual':                   365,
    'Annual (assessment) / Quarterly (concentration)': 90,
  };
  const base = daysByCadence[reviewCadence] ?? 90;
  // Residual escalation: critical halves the cycle, high 0.75×, medium 1×, low 1.5×.
  const factor = residual === 'critical' ? 0.5 : residual === 'high' ? 0.75 : residual === 'low' ? 1.5 : 1;
  const days = Math.max(1, Math.round(base * factor));
  const due = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  return { due: due.toISOString().slice(0, 10), days };
}
