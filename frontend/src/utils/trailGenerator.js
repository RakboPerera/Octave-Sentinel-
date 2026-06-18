import { AGENT_META, REGULATORY } from '../data/agentMeta.js';
import { THRESHOLDS, getDefaults, agentLocalKey } from '../data/thresholdRegistry.js';
import { getDomain } from '../data/domainRegistry.js';

// ─── STRUCTURED CITATIONS + SLAs + CONTROLS (Wave 1 audit-grade schema) ──────
// Per-agent defaults used when the finding itself does not declare structured
// audit metadata. These aren't guesses — they're the canonical Demo Bank / CBSL /
// SLFRS references applicable to each agent's detection domain. Auditors can
// verify each citation against the cited directive.
export const AGENT_REGULATORY_CITATIONS = {
  credit: [
    { regulator: 'ICASL', directive: 'SLFRS 9',           section: '5.5',  title: 'Impairment — Significant Increase in Credit Risk',
      effective_date: '2018-01-01',
      relevance: 'Defines the 30-day DPD SICR and 90-day DPD Stage 3 rebuttable presumptions used to classify this loan.' },
    { regulator: 'CBSL',  directive: 'Banking Act Direction No. 13/2021', section: '4', title: 'Classification of advances',
      effective_date: '2021-06-01',
      relevance: 'Prescribes minimum classification and provisioning for non-performing advances.' },
  ],
  transaction: [
    { regulator: 'CBSL', directive: 'FTRA No. 6 of 2006', section: '7', title: 'Reporting of suspicious transactions',
      effective_date: '2006-03-01',
      relevance: 'STR filing obligation on detection of structuring/suspicious flows — 5 working days from identification.' },
  ],
  suspense: [
    { regulator: 'CBSL', directive: 'Banking Act Direction No. 05/2024', section: '3', title: 'Maintenance of suspense accounts',
      effective_date: '2024-01-01',
      relevance: 'Unreconciled balances exceeding 90 days require CBSL notification and Board-level tracking.' },
  ],
  kyc: [
    { regulator: 'CBSL', directive: 'Financial Institutions Act KYC/CDD Rules 2016', section: '3', title: 'Customer Due Diligence',
      effective_date: '2016-01-01',
      relevance: 'CDD completeness and PEP identification; Enhanced Due Diligence for high-risk categories.' },
    { regulator: 'CBSL', directive: 'FTRA No. 6 of 2006', section: '2', title: 'Customer identification obligations',
      effective_date: '2006-03-01',
      relevance: 'Beneficial ownership disclosure for corporate customers.' },
  ],
  controls: [
    { regulator: 'CBSL', directive: 'Banking Act Direction No. 11/2007', section: '3', title: 'Internal control system',
      effective_date: '2007-03-23',
      relevance: 'Requires segregation of duties and limits on single-user override rates at branch level.' },
  ],
  digital: [
    { regulator: 'CBSL', directive: 'Payment Card and Mobile Payment Systems Regulations', section: '4', title: 'Fraud monitoring',
      effective_date: '2020-06-01',
      relevance: 'Mandatory monitoring of session anomalies and customer-side account takeover indicators.' },
  ],
  trade: [
    { regulator: 'CBSL', directive: 'Exchange Control Act & FTRA', section: '—', title: 'Trade-based money laundering',
      effective_date: '2006-03-01',
      relevance: 'Over-invoicing, duplicate LC, and shell-consignee patterns require STR assessment.' },
  ],
  insider: [
    { regulator: 'CBSL', directive: 'Banking Act Direction No. 11/2007', section: '5', title: 'Fit-and-proper / staff conduct',
      effective_date: '2007-03-23',
      relevance: 'Patterns of override concentration on a single staff member are a red flag under internal control guidance.' },
  ],
  mje: [
    { regulator: 'ICASL', directive: 'SLAuS 240',       section: '32', title: 'Auditor responsibilities — fraud',
      effective_date: '2010-01-01',
      relevance: 'Manual journal entries outside normal business hours are a standard fraud risk factor for auditors.' },
    { regulator: 'CBSL',  directive: 'Banking Act Direction No. 11/2007', section: '3', title: 'Maker–checker controls',
      effective_date: '2007-03-23',
      relevance: 'Journal entries without independent review fail internal control minimum standards.' },
  ],
  capital: [
    { regulator: 'BCBS/CBSL', directive: 'Basel III · Banking Act Direction No. 01/2016', section: '—', title: 'Capital adequacy and liquidity',
      effective_date: '2016-01-01',
      relevance: 'Defines the Tier 1, Total CAR, LCR and NSFR regulatory floors used on this page.' },
  ],
  balance: [
    { regulator: 'CBSL', directive: 'Banking Act Direction No. 01/2016', section: '—', title: 'Liquidity management',
      effective_date: '2016-01-01',
      relevance: 'Balance-sheet structural metrics feed the LCR / NSFR calculations.' },
  ],
  wealth: [
    { regulator: 'CBSL', directive: 'CBSL Direction No. 1/2021 — Customer Suitability', section: '—', title: 'Suitability & mis-selling',
      effective_date: '2021-01-01',
      relevance: 'Concentration in single product above 40% requires RM-level suitability file. Risk-profile gap tolerance ≤1.' },
  ],
  collateral: [
    { regulator: 'ICASL', directive: 'SLFRS 9', section: 'B5.5', title: 'Collateral in ECL measurement',
      effective_date: '2018-01-01',
      relevance: 'Stale valuations invalidate the collateral offset used in expected credit loss.' },
    { regulator: 'CBSL',  directive: 'Banking Act Direction No. 13/2021', section: '5', title: 'Valuation frequency',
      effective_date: '2021-06-01',
      relevance: 'Property collateral must be revalued at least every 3 years; more frequent for distressed facilities.' },
  ],
  connectedParty: [
    { regulator: 'CBSL', directive: 'Banking Act Direction No. 03/2018', section: '—', title: 'Large Exposures',
      effective_date: '2018-01-01',
      relevance: 'Single-obligor 25% cap and connected-group 40% cap of regulatory capital (Tier 1 + Tier 2).' },
    { regulator: 'CBSL', directive: 'Banking Act Direction No. 11/2007', section: '7', title: 'Related-party transactions',
      effective_date: '2007-03-23',
      relevance: 'Board disclosure and approval requirements for related-party exposures.' },
  ],
  alm: [
    { regulator: 'BCBS/CBSL', directive: 'IRRBB Standards (April 2016) · Banking Act Direction No. 07/2021', section: '—', title: 'Interest Rate Risk in the Banking Book',
      effective_date: '2021-01-01',
      relevance: 'EVE and NII sensitivity limits; cumulative gap limits per time bucket.' },
  ],
  thirdParty: [
    { regulator: 'CBSL', directive: 'Banking Act Direction No. 02/2020', section: '—', title: 'Outsourcing',
      effective_date: '2020-01-01',
      relevance: 'Critical-vendor concentration, exit plan readiness, and annual assessment requirements.' },
  ],
  accessRights: [
    { regulator: 'CBSL', directive: 'Banking Act Direction No. 11/2007', section: '3.4', title: 'Logical access & SoD',
      effective_date: '2007-03-23',
      relevance: 'Dormant privileged accounts and toxic entitlement combinations breach the SoD control minimum.' },
    { regulator: 'CBSL', directive: 'Banking Act Direction No. 05/2024', section: '—', title: 'Mandatory SoD pairs',
      effective_date: '2024-01-01',
      relevance: 'Prescribes mandatory SoD for Payment Initiation/Authorisation, User Admin/Privileged Access, and Audit/Operations functions.' },
  ],
  conduct: [
    { regulator: 'CBSL', directive: 'Fit-and-Proper Directions · Corporate Governance Direction No. 12/2007', section: '14', title: 'Staff conduct & whistleblowing',
      effective_date: '2007-09-01',
      relevance: 'Recurring conduct events on a single subject require HR escalation and conflict-of-interest review. §14 mandates a whistleblower protection policy.' },
  ],
  creditFraud: [
    { regulator: 'CBSL', directive: 'FTRA No. 6 of 2006 · Banking Act Direction No. 11/2007', section: '—', title: 'Origination fraud',
      effective_date: '2007-03-23',
      relevance: 'First-payment defaults, shell-borrower patterns, and siphoning are standard fraud-risk indicators.' },
  ],
  regReporting: [
    { regulator: 'CBSL', directive: 'Banking Act — Periodical Returns', section: '—', title: 'Regulatory returns',
      effective_date: '2000-01-01',
      relevance: 'Submission timeliness, completeness and sign-off requirements.' },
  ],
};

// Regulatory deadlines (hard — driven by statute or CBSL direction).
// Internal deadlines are owner + severity-based and set in generateSla() below.
const REGULATORY_DEADLINES = {
  transaction: 'File STR within 5 working days (FTRA §7)',
  suspense:    'Notify CBSL within 5 working days of breach of 90-day guideline',
  kyc:         'PEP EDD refresh within 30 days of identification',
  connectedParty: 'CBSL notification within 48 hours of single-obligor breach',
  capital:     'Notify CBSL prior to the quarterly CAR / LCR return if projected breach',
  trade:       'File STR within 5 working days if TBML indicators confirmed (FTRA §7)',
  creditFraud: 'File STR within 5 working days if fraud confirmed (FTRA §7)',
};

export const CONTROL_FAILURE_TEMPLATES = {
  credit: {
    control_id: 'CTRL-CR-02',
    control_type: 'Detective',
    description: 'Monthly SLFRS 9 staging committee review of all advances, with exception log for manual overrides.',
    owner_role: 'Head of Credit Risk',
  },
  transaction: {
    control_id: 'CTRL-AML-03',
    control_type: 'Detective',
    description: 'Automated transaction monitoring against structuring, velocity and hub-and-spoke scenarios.',
    owner_role: 'Compliance Officer',
  },
  suspense: {
    control_id: 'CTRL-OPS-04',
    control_type: 'Detective',
    description: 'Daily suspense aging reconciliation with escalation to Head of Finance for items >30 days.',
    owner_role: 'Head of Finance Operations',
  },
  kyc: {
    control_id: 'CTRL-AML-01',
    control_type: 'Preventive',
    description: 'CDD completion at onboarding and periodic refresh; PEP screening; beneficial-owner identification for corporates.',
    owner_role: 'Head of Compliance',
  },
  controls: {
    control_id: 'CTRL-OPS-01',
    control_type: 'Preventive',
    description: 'Maker–checker segregation and override-approval hierarchy at branch level.',
    owner_role: 'Head of Branch Operations',
  },
  digital: {
    control_id: 'CTRL-DIG-02',
    control_type: 'Detective',
    description: 'Real-time session monitoring (device, geography, MFA, biometric) with rule-based fraud triggers.',
    owner_role: 'Head of Digital Banking',
  },
  trade: {
    control_id: 'CTRL-TRD-02',
    control_type: 'Detective',
    description: 'LC / invoice anomaly screening — over/under-invoicing, duplicate shipment, shell consignee.',
    owner_role: 'Head of Trade Finance',
  },
  insider: {
    control_id: 'CTRL-HR-01',
    control_type: 'Detective',
    description: 'Behavioural monitoring of staff with elevated privileges; periodic rotation and holiday enforcement.',
    owner_role: 'Chief People Officer',
  },
  mje: {
    control_id: 'CTRL-FIN-02',
    control_type: 'Preventive',
    description: 'Maker–checker on all manual journals; independent review of after-hours postings.',
    owner_role: 'Chief Financial Officer',
  },
  capital: {
    control_id: 'CTRL-TRE-01',
    control_type: 'Detective',
    description: 'Monthly ALCO review of capital and liquidity ratios; stress-testing per ICAAP.',
    owner_role: 'Chief Financial Officer',
  },
  collateral: {
    control_id: 'CTRL-CR-04',
    control_type: 'Preventive',
    description: 'Independent valuation refresh every 3 years (annual for distressed facilities) and LTV recalculation.',
    owner_role: 'Head of Credit Administration',
  },
  connectedParty: {
    control_id: 'CTRL-CR-05',
    control_type: 'Preventive',
    description: 'Group-exposure aggregation and CBSL Large Exposures limit monitoring; related-party disclosures to Board.',
    owner_role: 'Head of Credit Risk',
  },
  alm: {
    control_id: 'CTRL-TRE-02',
    control_type: 'Detective',
    description: 'Monthly ALCO review of repricing gaps, EVE and NII sensitivities against approved limits.',
    owner_role: 'Head of Treasury',
  },
  thirdParty: {
    control_id: 'CTRL-OPS-06',
    control_type: 'Preventive',
    description: 'Annual vendor criticality assessment, exit plan testing, and CBSL outsourcing notification compliance.',
    owner_role: 'Head of Operational Risk',
  },
  accessRights: {
    control_id: 'CTRL-IT-03',
    control_type: 'Preventive',
    description: 'Quarterly entitlement review; dormant account disabling; SoD-violation scanning.',
    owner_role: 'Chief Information Security Officer',
  },
  conduct: {
    control_id: 'CTRL-HR-02',
    control_type: 'Detective',
    description: 'Conduct-event tracking, whistleblower channel, and trend analysis per staff member.',
    owner_role: 'Chief People Officer',
  },
  creditFraud: {
    control_id: 'CTRL-CR-06',
    control_type: 'Detective',
    description: 'First-payment-default monitoring; post-disbursement fund-flow tracing; shell-borrower pattern scans.',
    owner_role: 'Head of Credit Fraud',
  },
  regReporting: {
    control_id: 'CTRL-FIN-03',
    control_type: 'Preventive',
    description: 'Maker–checker on all regulatory returns; sign-off log; schedule tracker for periodical submissions.',
    owner_role: 'Head of Regulatory Reporting',
  },
};

// Internal SLA per severity (days from identification). This is the Case
// Manager's default SLA when the finding does not declare its own — kept
// conservative so users can tighten but rarely need to loosen.
const INTERNAL_SLA_DAYS = {
  critical: 2,
  high: 7,
  medium: 14,
  low: 30,
};

// ─── UNIVERSAL TRAIL GENERATOR ───────────────────────────────────────────────
// Deterministic fallback that produces a complete 14-section explainability
// trail for ANY finding (§1–§14 below), using only data available client-side:
//   - the finding object itself (signals, drivers, exposure, action)
//   - the agent's methodology (AGENT_META)
//   - the threshold registry (defaults + active values)
//   - the domain registry (owner role, regulatory tags)
//
// This is the guarantee that every click, on every finding, everywhere in the
// Business Platform, produces a substantive trail GROUNDED to that finding —
// even without an API key. It is the sole source of explainability trails (the
// old pre-rendered curated-trail module was retired because it rendered a fixed
// fictional narrative per agent, mismatched to the real finding).

// ─── DATA SOURCE LOOKUP ─────────────────────────────────────────────────────
// Maps each agent to the CSV(s) it consumes. Mirrors Data Hub configuration.
const DATA_SOURCES = {
  credit:         { csv: '01_credit_portfolio.csv',   fields: 'loan_id, exposure_lkr, assigned_stage, dpd_days, collateral_ratio, restructure_count, sector, branch_code, override_flag' },
  transaction:    { csv: '02_transactions.csv',       fields: 'txn_id, account_id, amount_lkr, counterparty_id, channel, timestamp, branch_code' },
  suspense:       { csv: '03_suspense_accounts.csv',  fields: 'account_id, account_type, branch_code, balance_lkr, aging_days, inflow_lkr_30d, outflow_lkr_30d, counterparty_source_id' },
  kyc:            { csv: '04_kyc_customers.csv',      fields: 'customer_id, risk_rating, pep_flag, last_kyc_review, introducer_code, country_of_origin, beneficial_owner_disclosed' },
  controls:       { csv: '05_internal_controls.csv',  fields: 'transaction_id, branch_code, staff_id, initiator_id, approver_id, override_flag, approval_timestamp' },
  digital:        { csv: '06_digital_sessions.csv',   fields: 'session_id, account_id, login_city, device_id, timestamp, mfa_result, biometric_score' },
  trade:          { csv: '07_trade_treasury.csv',     fields: 'lc_id, customer_id, hs_code, invoice_value_lkr, shipment_period, fx_position_lkr' },
  insider:        { csv: '09_insider_risk.csv',       fields: 'staff_id, transaction_id, role, initiator_flag, approver_flag, timestamp, amount_lkr' },
  mje:            { csv: '08_mje_testing.csv',        fields: 'entry_id, gl_account, amount_lkr, entry_date, entry_time, maker_id, approver_id, document_ref' },
  capital:        { csv: '10_capital_structure.csv',  fields: 'quarter, tier1_lkr, tier2_lkr, rwa_lkr, hqla_lkr, net_cash_outflows_30d_lkr' },
  balance:        { csv: '11_balance_sheet_drivers.csv', fields: 'quarter, total_assets_lkr, total_deposits_lkr, retained_earnings_lkr, top10_depositor_pct' },
  wealth:         { csv: '13_wealth_portfolio.csv',   fields: 'customer_id, risk_profile, product_id, product_risk_rating, holding_lkr, rm_code, hold_days' },
  collateral:     { csv: '14_collateral_register.csv', fields: 'collateral_id, loan_id, type, valuation_lkr, valuation_date, valuer_code, ltv_ratio' },
  connectedParty: { csv: '15_connected_parties.csv',  fields: 'customer_id, group_id, relationship_type, aggregate_exposure_lkr, shared_director_flag' },
  alm:            { csv: '16_alm_gap.csv',            fields: 'bucket, rate_sensitive_assets_lkr, rate_sensitive_liabilities_lkr, gap_lkr, eve_sensitivity_bps' },
  thirdParty:     { csv: '17_vendor_register.csv',    fields: 'vendor_id, criticality, annual_spend_lkr, contract_end_date, last_assessment_date, cbsl_category' },
  accessRights:   { csv: '18_access_rights.csv',      fields: 'user_id, role, privilege_level, last_login_days, dormant_flag, sod_conflict_flag, toxic_combination_code' },
  conduct:        { csv: '19_conduct_register.csv',   fields: 'case_id, subject_role, category, severity, opened_date, resolution_status, recurrence_count' },
};

// ─── THRESHOLD KEY LOOKUP ────────────────────────────────────────────────────
// Given an agent + a finding's primary driver text, pick the most relevant
// threshold rule to render in the signals panel.
function pickRelevantThresholds(agentId, finding) {
  const block = THRESHOLDS[agentId];
  if (!block) return [];
  const rules = block.rules || [];
  if (rules.length <= 3) return rules;

  const text = [
    finding.finding, finding.explanation, finding.primary_driver, finding.secondary_driver,
    ...(finding.secondary_drivers || []), finding.risk_interpretation, finding.pattern_detected,
  ].filter(Boolean).join(' ').toLowerCase();

  // Score each rule by keyword overlap with the finding text
  const scored = rules.map(r => {
    const keywords = (r.label + ' ' + (r.description || '')).toLowerCase().split(/\W+/).filter(w => w.length > 4);
    const hits = keywords.filter(k => text.includes(k)).length;
    return { rule: r, score: hits };
  });
  scored.sort((a, b) => b.score - a.score);

  // Top 3, or all if fewer
  return scored.slice(0, 3).map(s => s.rule);
}

// ─── SEVERITY TO STRENGTH ────────────────────────────────────────────────────
function severityStrength(severity) {
  const s = (severity || 'medium').toLowerCase();
  if (s === 'critical') return 0.94;
  if (s === 'high') return 0.78;
  if (s === 'medium') return 0.58;
  return 0.35;
}

// ─── MAIN GENERATOR ──────────────────────────────────────────────────────────
export function generateTrail({ finding, agentId, findingIndex, activeThresholds = {} }) {
  const f = finding || {};
  const meta = AGENT_META[agentId] || { name: agentId, methodology: 'Agent methodology description unavailable.' };
  const domainId = (f.domain_tags || [])[0];
  const domain = domainId ? getDomain(domainId) : null;
  const reg = REGULATORY[agentId];
  const dataSource = DATA_SOURCES[agentId] || { csv: '—', fields: '' };
  const defaults = getDefaults();
  const agentThresholds = activeThresholds[agentId] || defaults[agentId] || {};
  const defaultThresholds = defaults[agentId] || {};

  const exposure = f.affected_exposure_lkr || f.affected_balance_lkr || f.exposure_lkr || f.aggregate_exposure_lkr || 0;
  const text = f.finding || f.explanation || f.pattern_detected || f.pattern_explanation || f.risk_interpretation || f.risk_signal || '';
  const entityIds = f.entity_ids || [f.loan_id, f.customer_id, f.account_id, f.branch_code, f.user_id, f.vendor_id, f.collateral_id, f.subject_role].filter(Boolean);
  const score = f.anomaly_score || severityStrength(f.severity);

  // ─── §1 summary ─────────────────────────────────────────────────────────
  // FIX M-D: Normalise severity to lowercase before comparison — LLMs occasionally
  // return 'Critical' (capital C) which would silently fall through to 'Observation'.
  const sev = (f.severity || 'medium').toLowerCase();
  const sevPrefix = sev === 'critical' ? 'Critical finding' : sev === 'high' ? 'High-severity signal' : 'Observation';
  const summary = text ? `${sevPrefix} — ${truncate(text, 160)}` : `${sevPrefix} from ${meta.name}.`;

  // ─── §2 domain_context ──────────────────────────────────────────────────
  let domain_context;
  if (domain) {
    domain_context = `This finding sits in ${domain.label}. As ${domain.ownerRole}, you'll want to evaluate whether the signal reflects isolated noise or a systemic issue in your book. ${exposure > 0 ? `Exposure under review: ${formatLkr(exposure)}.` : ''}`;
  } else {
    domain_context = `This finding was produced by ${meta.name} and may affect multiple domains. Use the Engine Map to see which business lines it feeds.`;
  }

  // ─── §3 signals ─────────────────────────────────────────────────────────
  const relevantRules = pickRelevantThresholds(agentId, f);
  const signals = [];
  // Primary driver-based signals
  if (f.primary_driver) {
    signals.push({
      label: f.primary_driver,
      value: renderSignalValue(f, 'primary'),
      threshold: renderRuleThreshold(relevantRules[0], agentThresholds),
      strength: Math.min(1, score + 0.05),
      breached: true,
    });
  }
  (f.secondary_drivers || [f.secondary_driver].filter(Boolean)).slice(0, 3).forEach((d, i) => {
    if (!d) return;
    signals.push({
      label: d,
      value: '—',
      threshold: renderRuleThreshold(relevantRules[i + 1], agentThresholds),
      strength: Math.max(0.4, score - 0.1 * (i + 1)),
      breached: true,
    });
  });
  // If we still have zero signals, synthesise one from the finding's score.
  if (signals.length === 0 && text) {
    signals.push({
      label: `Composite score: ${truncate(text, 70)}`,
      value: (score * 100).toFixed(0),
      threshold: '—',
      strength: score,
      breached: true,
    });
  }

  // ─── §4 agent_methodology ───────────────────────────────────────────────
  const methodologyThresholds = relevantRules.map(r => {
    const key = agentLocalKey(r.id);
    const val = agentThresholds[key] ?? r.default;
    return {
      label: r.label,
      value: val,
      default: r.default,
      modified: val !== r.default,
    };
  });
  const agent_methodology = {
    agent: meta.name,
    how_it_detects: meta.methodology,
    data_sources: [dataSource.csv],
    active_thresholds: methodologyThresholds,
  };

  // ─── §5 trail ───────────────────────────────────────────────────────────
  const trail = [];
  trail.push({
    step: 1,
    agent: agentId,
    data_touched: dataSource.csv,
    action: `Ingested ${dataSource.csv} and applied ${meta.name}'s detection logic.`,
    result: `Found entity${entityIds.length > 1 ? 's' : ''} ${entityIds.slice(0, 3).join(', ') || '—'} with anomaly score ${score.toFixed(2)}.`,
  });
  if (f.primary_driver) {
    trail.push({
      step: 2,
      agent: agentId,
      data_touched: '',
      action: `Tested primary driver against active threshold.`,
      result: f.primary_driver,
    });
  }
  if ((f.secondary_drivers || []).length > 0 || f.secondary_driver) {
    trail.push({
      step: trail.length + 1,
      agent: agentId,
      data_touched: '',
      action: `Examined secondary drivers to confirm the anomaly is not isolated noise.`,
      result: (f.secondary_drivers || [f.secondary_driver]).filter(Boolean).slice(0, 2).join(' · '),
    });
  }
  trail.push({
    step: trail.length + 1,
    agent: 'orchestrator',
    data_touched: '',
    action: `Classified severity at ${(f.severity || 'medium').toUpperCase()}.`,
    result: `Agent output promoted to ${(f.severity || 'medium')} tier. ${exposure > 0 ? `Exposure ${formatLkr(exposure)}.` : ''}`,
  });

  // ─── §6 why_flagged ─────────────────────────────────────────────────────
  const topRule = relevantRules[0];
  const topKey = topRule ? agentLocalKey(topRule.id) : null;
  const topVal = topRule ? (agentThresholds[topKey] ?? topRule.default) : null;
  const why_flagged = topRule
    ? `The combination of ${f.primary_driver || 'the agent\'s drivers'} breached the "${topRule.label}" threshold (currently ${topVal}${topVal !== topRule.default ? ', modified from default ' + topRule.default : ''}). With this data against this threshold, the agent elevates severity to ${f.severity || 'medium'}.`
    : `${meta.name} applied its detection logic against ${dataSource.csv} and classified this record as ${f.severity || 'medium'}.`;

  // ─── §7 counterfactual ──────────────────────────────────────────────────
  let counterfactual;
  if (topRule && typeof topRule.default === 'number') {
    const direction = ((f.severity || 'medium') === 'critical' ? 'tighter' : 'looser');
    counterfactual = `Had the "${topRule.label}" threshold been ${direction} (say, ${bumpValue(topRule.default, topRule)}), this record would likely have been classified one tier ${direction === 'tighter' ? 'more severe' : 'less severe'}. Tune it in Rule Parameters to see the re-evaluation live.`;
  } else {
    counterfactual = 'This finding is qualitatively classified — threshold sensitivity is less informative. Review the raw signals above for context.';
  }

  // ─── §8 how_to_verify ───────────────────────────────────────────────────
  const how_to_verify = f.recommended_action
    ? `Recommended action: ${f.recommended_action} To verify the detection itself, pull ${dataSource.csv} and confirm the fields driving the anomaly (${dataSource.fields.split(',').slice(0, 3).join(',')}) for ${entityIds[0] || 'this entity'}.`
    : `Pull the source data (${dataSource.csv}) and inspect the fields driving the anomaly (${dataSource.fields.split(',').slice(0, 3).join(',')}) for ${entityIds[0] || 'this entity'}.`;

  // ─── §9 corroboration ───────────────────────────────────────────────────
  // Structured array shape matches explainability.js schema (agent, entity, finding_ref, evidence).
  // corroboration_text is kept for UI display; corroboration array is for audit/export pipelines.
  const signalsList = (f.orchestrator_signals || []).filter(s => s.target_agent !== agentId);
  const corroboration = signalsList.length > 0
    ? signalsList.map(s => ({
        agent: s.target_agent,
        entity: s.shared_entity_id || entityIds[0] || null,
        finding_ref: s.signal_type || null,
        evidence: s.description || `${AGENT_META[s.target_agent]?.name || s.target_agent} independently flagged the same entity.`,
      }))
    : [];
  const others = [...new Set(signalsList.map(s => AGENT_META[s.target_agent]?.name || s.target_agent))];
  const corroboration_text = signalsList.length > 0
    ? `This finding shares signals with ${others.length} other agent${others.length !== 1 ? 's' : ''} (${others.join(', ')}). When multiple agents independently implicate the same entity, confidence compounds.`
    : `Single-agent finding — no cross-signal corroboration detected yet. If this entity surfaces in a second agent's output, the case manager will auto-correlate.`;

  // ─── §10 data_lineage ───────────────────────────────────────────────────
  // Declare record_count so auditor knows whether we're looking at one row or
  // a sample. When the finding identifies a specific entity, we're a single
  // record; otherwise we default to the finding's own affected-count field.
  const primaryEntity = entityIds[0];
  const recordCount = f.affected_record_count
                   || f.affected_customer_count
                   || f.affected_transaction_count
                   || (primaryEntity ? 1 : null);
  const rowIdentifier = primaryEntity ? renderRowIdentifier(agentId, f, primaryEntity) : null;

  const data_lineage = [
    {
      source: dataSource.csv,
      columns: (dataSource.fields || '').split(',').map(s => s.trim()).filter(Boolean),
      row_identifier: rowIdentifier || undefined,
      record_count: recordCount || undefined,
      sampling_frame: f.sampling_frame || undefined,
      sampling_method: f.sampling_method || undefined,
      as_of: f.as_of_date || undefined,
    },
  ];

  // ─── §11 confidence + confidence_metadata ───────────────────────────────
  const confidence = Math.min(0.98, Math.max(0.45, score));
  // When a finding doesn't carry calibration provenance of its own we declare
  // the generator's fallback note so auditors know this is heuristic, not a
  // validated probability. Curated trails supply proper metadata.
  const confidence_metadata = f.confidence_metadata || {
    note: 'Heuristic confidence derived from anomaly score — not calibrated against a validated cohort. Curated trails carry calibration date + measured FP rate.',
  };

  // ─── §12 regulatory_citations (structured) + hook (backcompat) ──────────
  const regulatory_citations = Array.isArray(f.regulatory_citations) && f.regulatory_citations.length > 0
    ? f.regulatory_citations
    : (AGENT_REGULATORY_CITATIONS[agentId] || []);
  const regulatory_hook = reg
    ? `${reg.label}: ${reg.body}`
    : (f.regulatory_context || '');

  // ─── §13 remediation_sla ─────────────────────────────────────────────────
  const remediation_sla = f.remediation_sla || generateSla(agentId, f);

  // ─── §14 control_failure ─────────────────────────────────────────────────
  const control_failure = f.control_failure || CONTROL_FAILURE_TEMPLATES[agentId] || null;

  return {
    summary,
    domain_context,
    signals,
    agent_methodology,
    trail,
    why_flagged,
    counterfactual,
    how_to_verify,
    corroboration,
    corroboration_text,
    data_lineage,
    confidence,
    confidence_metadata,
    regulatory_hook,
    regulatory_citations,
    remediation_sla,
    control_failure,
  };
}

// ─── HELPERS FOR AUDIT-GRADE SCHEMA ──────────────────────────────────────────
function renderRowIdentifier(agentId, f, primaryEntity) {
  // Agent-aware primary-key naming so the row_identifier is a usable SQL-like
  // lookup, not just a raw id.
  const keyByAgent = {
    credit: 'loan_id',
    creditFraud: 'loan_id',
    collateral: 'collateral_id',
    connectedParty: 'group_id',
    suspense: 'account_id',
    transaction: 'account_id',
    kyc: 'customer_id',
    wealth: 'customer_id',
    digital: 'account_id',
    trade: 'lc_id',
    mje: 'entry_id',
    insider: 'staff_id',
    accessRights: 'user_id',
    conduct: 'case_id',
    thirdParty: 'vendor_id',
    controls: 'transaction_id',
    alm: 'bucket',
    capital: 'quarter',
    balance: 'quarter',
    regReporting: 'return_id',
  };
  const key = keyByAgent[agentId] || 'entity_id';
  return `${key}='${primaryEntity}'`;
}

export function generateSla(agentId, f) {
  const severity = (f.severity || 'medium').toLowerCase();
  const internalDays = INTERNAL_SLA_DAYS[severity] ?? INTERNAL_SLA_DAYS.medium;
  const today = new Date();
  const due = new Date(today.getTime() + internalDays * 24 * 60 * 60 * 1000);
  const ownerRole = CONTROL_FAILURE_TEMPLATES[agentId]?.owner_role || 'Domain Owner';
  const regulatoryDeadline = REGULATORY_DEADLINES[agentId] || null;

  return {
    action_summary: f.recommended_action || 'Investigate, confirm root cause, and remediate at the control layer.',
    action_owner_role: ownerRole,
    internal_deadline: `${internalDays} day${internalDays === 1 ? '' : 's'} (by ${due.toISOString().slice(0, 10)})`,
    regulatory_deadline: regulatoryDeadline,
    escalation_policy: severity === 'critical'
      ? 'If not remediated within SLA, escalate to Executive Committee; if breach is regulatory, notify CBSL / CEO immediately.'
      : severity === 'high'
        ? 'If not remediated within SLA, escalate to domain-owning EXCO member.'
        : 'If not remediated within SLA, re-age and include in next cycle audit observation log.',
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
}

function renderSignalValue(f, which) {
  if (f.anomaly_score != null && which === 'primary') return (f.anomaly_score * 100).toFixed(0);
  return '—';
}

function renderRuleThreshold(rule, activeThresholds) {
  if (!rule) return '—';
  const key = agentLocalKey(rule.id);
  const val = activeThresholds[key] ?? rule.default;
  return val;
}

function bumpValue(defaultVal, rule) {
  if (typeof defaultVal !== 'number') return defaultVal;
  const step = rule.bounds?.step || (defaultVal < 1 ? 0.05 : 1);
  return Math.round((defaultVal + step) * 100) / 100;
}

function formatLkr(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return `LKR ${(n / 1e9).toFixed(2)} Bn`;
  if (Math.abs(n) >= 1e6) return `LKR ${(n / 1e6).toFixed(0)} Mn`;
  return `LKR ${n.toFixed(0)}`;
}
