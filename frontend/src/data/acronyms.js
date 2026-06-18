// Central glossary for Sentinel's banking acronyms. Each entry has:
//   expansion — what the letters stand for
//   definition — one or two sentences a non-specialist auditor can parse
//   seeAlso   — optional related terms (rendered as a "see also" line)

export const ACRONYMS = {
  // ─── Regulatory bodies & frameworks ─────────────────────────────────────────
  CBSL:   { expansion: 'Central Bank of Sri Lanka',                        definition: 'Sri Lanka\'s banking regulator. Issues directions and circulars that LCBs must comply with, including KYC, capital, and liquidity rules.' },
  FATF:   { expansion: 'Financial Action Task Force',                      definition: 'Intergovernmental body that sets global AML and counter-terrorism financing standards. Maintains grey- and black-lists of jurisdictions with deficient controls.' },
  FTRA:   { expansion: 'Financial Transactions Reporting Act',             definition: 'Sri Lanka\'s 2006 anti-money-laundering statute. Section 7 criminalises structuring; STRs must be filed with the CBSL FIU within 5 working days.' },
  FIU:    { expansion: 'Financial Intelligence Unit',                      definition: 'CBSL unit that receives and investigates STRs filed by banks and other reporting institutions.' },
  SLFRS:  { expansion: 'Sri Lanka Financial Reporting Standards',          definition: 'IFRS-aligned accounting framework for Sri Lankan entities. SLFRS 9 governs financial-instrument staging and expected-credit-loss provisioning.' },
  ICAAP:  { expansion: 'Internal Capital Adequacy Assessment Process',     definition: 'Annual Basel III disclosure in which a bank documents its own view of capital adequacy under stress, including any planned mitigants.' },
  LCB:    { expansion: 'Licensed Commercial Bank',                         definition: 'A bank licensed by CBSL under the Banking Act to take public deposits and offer the full range of commercial-banking services. The bank operates as a Licensed Commercial Bank.' },
  CEFT:   { expansion: 'Common Electronic Fund Transfer',                  definition: 'LankaClear\'s same-day interbank transfer rail. CEFT transfers are commonly referenced in structuring and suspense-balance cases.' },

  // ─── Capital & liquidity (Basel III) ────────────────────────────────────────
  CAR:    { expansion: 'Capital Adequacy Ratio',                           definition: 'Total regulatory capital (Tier 1 + Tier 2) divided by risk-weighted assets. CBSL minimum for a domestic systemically important LCB is 14%.' },
  LCR:    { expansion: 'Liquidity Coverage Ratio',                         definition: 'HQLA divided by net cash outflows over a 30-day stress scenario. CBSL minimum 100%; internal amber threshold at 150%.' },
  NSFR:   { expansion: 'Net Stable Funding Ratio',                         definition: 'Available stable funding divided by required stable funding over a 1-year horizon. CBSL minimum 100%.' },
  RWA:    { expansion: 'Risk-Weighted Assets',                             definition: 'Sum of assets multiplied by their regulatory risk weight. The denominator in all Basel III capital ratios.' },
  HQLA:   { expansion: 'High-Quality Liquid Assets',                       definition: 'Unencumbered assets that can be converted to cash quickly in a stress scenario. Level 1 (no haircut) includes cash, CBSL reserves and government securities; Level 2 assets take haircuts.' },
  ASF:    { expansion: 'Available Stable Funding',                         definition: 'NSFR numerator. Weighted sum of equity and liabilities based on their funding-stability characteristics.' },
  RSF:    { expansion: 'Required Stable Funding',                          definition: 'NSFR denominator. Weighted sum of assets and off-balance-sheet exposures based on how much stable funding they require.' },
  ALCO:   { expansion: 'Asset-Liability Committee',                        definition: 'Senior-management committee responsible for balance-sheet structure, liquidity strategy, interest-rate risk, and FX position management.' },
  NOP:    { expansion: 'Net Open Position',                                definition: 'Net FX exposure after netting long and short currency positions. CBSL caps aggregate NOP as a percentage of regulatory capital.' },
  REPO:   { expansion: 'Repurchase Agreement',                             definition: 'Short-term secured borrowing against government securities. Commonly used by treasury for overnight liquidity.' },

  // ─── AML / KYC ──────────────────────────────────────────────────────────────
  AML:    { expansion: 'Anti-Money Laundering',                            definition: 'The set of regulatory requirements and internal controls designed to detect and prevent money laundering through the banking system.' },
  CTF:    { expansion: 'Counter-Terrorism Financing',                      definition: 'Controls to detect and block funding of terrorist activity. In Sri Lanka administered under the FTRA alongside AML.' },
  STR:    { expansion: 'Suspicious Transaction Report',                    definition: 'Mandatory filing to the CBSL FIU when a transaction or pattern raises AML/CTF suspicion. Must be filed within 5 working days under FTRA §7.' },
  KYC:    { expansion: 'Know Your Customer',                               definition: 'Customer identification and verification at onboarding plus ongoing monitoring. Part of the broader CDD regime.' },
  CDD:    { expansion: 'Customer Due Diligence',                           definition: 'Risk-based customer assessment, including beneficial ownership, source of funds, and purpose of relationship.' },
  EDD:    { expansion: 'Enhanced Due Diligence',                           definition: 'Heightened CDD applied to PEPs, high-risk jurisdictions, and other high-risk relationships. Must be reviewed at least annually.' },
  PEP:    { expansion: 'Politically Exposed Person',                       definition: 'An individual holding a prominent public position (or close associates/family). Accounts require EDD and senior-management approval.' },
  UBO:    { expansion: 'Ultimate Beneficial Owner',                        definition: 'The natural person who ultimately owns or controls a corporate customer. CBSL and FATF require disclosure to a 25%-ownership threshold or lower where controlling influence exists.' },
  BO:     { expansion: 'Beneficial Owner',                                 definition: 'Any natural person with ownership or effective control of a corporate customer. The ultimate (UBO) level is the one disclosed to regulators.' },

  // ─── Credit ─────────────────────────────────────────────────────────────────
  ECL:    { expansion: 'Expected Credit Loss',                             definition: 'SLFRS 9 forward-looking loss provision, computed per loan from probability of default, loss given default, and exposure at default.' },
  DPD:    { expansion: 'Days Past Due',                                    definition: 'Number of days a loan is behind on contractual payments. A key driver of SLFRS 9 staging (Stage 1 → 2 → 3).' },
  NPL:    { expansion: 'Non-Performing Loan',                              definition: 'A loan classified as impaired — typically Stage 3 under SLFRS 9 or more than 90 days past due.' },

  // ─── Controls & accounting ─────────────────────────────────────────────────
  SoD:    { expansion: 'Segregation of Duties',                            definition: 'Control principle requiring different people to initiate, approve, and record transactions. A breach allows one person to commit and conceal fraud.' },
  MJE:    { expansion: 'Manual Journal Entry',                             definition: 'General-ledger entries posted by hand (not generated by a transaction system). Above LKR 10M they require Maker-Checker approval from different individuals.' },
  GL:     { expansion: 'General Ledger',                                   definition: 'The bank\'s master accounting record where every transaction is ultimately posted against a chart-of-accounts code.' },

  // ─── Digital fraud ──────────────────────────────────────────────────────────
  ATO:    { expansion: 'Account Takeover',                                 definition: 'Unauthorised access to a customer\'s banking account, typically via phishing, SIM swap, or credential stuffing. Reportable to CBSL under Circular 2/2025.' },
  MFA:    { expansion: 'Multi-Factor Authentication',                      definition: 'Authentication requiring two or more independent factors (something you know / have / are). CBSL mandates MFA for high-value digital transactions.' },
  SIM:    { expansion: 'Subscriber Identity Module',                       definition: 'Mobile SIM card. "SIM swap" is a social-engineering attack where the attacker convinces a telco to reissue the victim\'s number to a new SIM.' },

  // ─── Trade finance ──────────────────────────────────────────────────────────
  LC:     { expansion: 'Letter of Credit',                                 definition: 'A bank\'s written guarantee of payment to an exporter on presentation of compliant shipping documents. A common TBML vector when invoicing is manipulated.' },
  TBML:   { expansion: 'Trade-Based Money Laundering',                     definition: 'Moving value across borders by over- or under-invoicing goods and services. FATF identifies it as a primary global value-transfer method.' },
  HS:     { expansion: 'Harmonised System',                                definition: 'UN/WCO standardised 6-digit (extended to 8-10) product-classification code used on every customs declaration. Sentinel benchmarks unit prices by HS code.' },
  FX:     { expansion: 'Foreign Exchange',                                 definition: 'The currency-conversion market. The bank\'s treasury runs active FX, fixed-income, and client forex desks.' },

  // ─── Platform / general ─────────────────────────────────────────────────────
  AUM:    { expansion: 'Assets Under Management',                          definition: 'Total balance-sheet assets the bank manages on behalf of customers and shareholders.' },
  KRI:    { expansion: 'Key Risk Indicator',                               definition: 'A quantitative early-warning metric tied to a specific risk. Each KRI has thresholds (green / amber / red) that trigger escalation.' },
  SME:    { expansion: 'Small and Medium Enterprise',                      definition: 'Customer segment between retail and corporate. The bank runs a dedicated SME lending book via Commercial Banking.' },
  ESG:    { expansion: 'Environmental, Social, Governance',                definition: 'Non-financial risk and performance framework. The bank finances ESG-aligned projects via Corporate Banking.' },

  // ─── Detection methods & statistics (how the engine decides) ─────────────────
  "Benford's Law": { expansion: 'First-digit / first-two-digit law', definition: 'In many natural numeric populations the leading digit follows a fixed distribution (≈30% start with 1). A material χ² deviation from it across transaction or journal amounts suggests fabricated or manipulated figures. Sentinel runs this as an exact χ² test on the amount column.', seeAlso: ['p-value', 'FDR'] },
  "p-value": { expansion: 'Probability value', definition: 'The probability a pattern this extreme would arise by chance alone. For statistical findings, Sentinel reports confidence as 1−p — e.g. p=0.001 means roughly a 1-in-1,000 chance of arising naturally. Lower p = stronger evidence.', seeAlso: ['FDR', 'robust-z'] },
  FDR: { expansion: 'False-Discovery Rate', definition: 'When you run many statistical tests, some will look significant by chance. The Benjamini–Hochberg FDR control bounds the expected proportion of false positives (default 5%); findings that fail it are demoted to advisory, never silently dropped. Applies only to the engine\'s statistical findings, not rule-based regulatory facts.', seeAlso: ['p-value'] },
  "robust-z": { expansion: 'Robust (modified) z-score', definition: 'How far a value sits from its peer group, measured in median-absolute-deviation units (Iglewicz–Hoaglin: 0.6745·(x−median)/MAD). Unlike a standard z-score it isn\'t distorted by the outliers it\'s trying to find. |value| ≳ 3.5 flags a genuine outlier. Used for adaptive, peer-relative thresholds on top of the fixed floors.', seeAlso: ['p-value'] },
  PSI: { expansion: 'Population Stability Index', definition: 'Measures how much an input distribution has shifted versus a frozen baseline. PSI > 0.25 signals a significant shift — your data population has changed and thresholds may need recalibrating. Shown in Detection Assurance → Input drift.', seeAlso: ['KS test', 'drift'] },
  "KS test": { expansion: 'Kolmogorov–Smirnov two-sample test', definition: 'Compares two distributions and returns the maximum gap between them (D) and a p-value. Used alongside PSI to detect input-data drift between the baseline run and the current upload.', seeAlso: ['PSI', 'drift'] },
  Calibration: { expansion: 'Confidence calibration', definition: 'Checks whether stated confidence matches reality — does a "0.8 confidence" finding actually get confirmed ~80% of the time? Sentinel fits an isotonic curve from your reviewers\' confirmed/false-positive labels; the calibration gap (stated − observed) is shown in Detection Assurance.', seeAlso: ['p-value', 'precision'] },
  Drift: { expansion: 'Input-distribution drift', definition: 'A change in the shape of the incoming data versus the first (baseline) run, measured by PSI and the KS test. Significant drift means the population the detectors were tuned on has moved — a signal to re-validate thresholds.', seeAlso: ['PSI', 'KS test'] },
  "Vintage analysis": { expansion: 'Origination-cohort analysis', definition: 'Groups loans by origination quarter and compares each cohort\'s Stage-3 (NPL) rate. A cohort that is a robust-z outlier versus the others indicates underwriting-quality drift in that period.', seeAlso: ['robust-z', 'SLFRS'] },
  "Geo-velocity": { expansion: 'Impossible-travel detection', definition: 'Computes the great-circle distance between two consecutive login cities divided by the elapsed time. If the implied speed exceeds feasible air travel (~1,000 km/h) the session pair is flagged — a stronger signal than a fixed time window.', seeAlso: [] },
  IPE: { expansion: 'Information Provided by Entity', definition: 'Audit term for data the auditee supplies. Sentinel reconciles every extract\'s record count and control totals to the source system and records who extracted it and when (provenance) — so a finding can stand as audit evidence rather than an unverified file.', seeAlso: ['provenance'] },
  Provenance: { expansion: 'Data lineage attestation', definition: 'The record of which system of record a population came from, who extracted it, and when — captured on every run so the completeness & accuracy of the data underlying a finding is traceable.', seeAlso: ['IPE'] },
};

export function getAcronym(term) {
  return ACRONYMS[term] || null;
}

// Grouped export for the Glossary page. Order inside each category is
// deliberate (rough reading order, most-used first). Colour is the accent
// used for the left border of the category panel.
export const CATEGORIES = [
  {
    id: 'regulatory',
    title: 'Regulatory bodies & frameworks',
    blurb: 'Sri Lankan and international supervisors, and the reporting frameworks they enforce.',
    color: '#185FA5',
    terms: ['CBSL', 'FATF', 'FTRA', 'FIU', 'SLFRS', 'ICAAP', 'LCB', 'CEFT'],
  },
  {
    id: 'capital',
    title: 'Capital & liquidity (Basel III)',
    blurb: 'Ratios, buffers, and committees that govern the bank\'s capital and liquidity position.',
    color: '#1D4ED8',
    terms: ['CAR', 'LCR', 'NSFR', 'RWA', 'HQLA', 'ASF', 'RSF', 'ALCO', 'NOP', 'REPO'],
  },
  {
    id: 'aml',
    title: 'AML & KYC',
    blurb: 'Anti-money-laundering controls, customer due diligence, and suspicious-activity reporting.',
    color: '#0F6E56',
    terms: ['AML', 'CTF', 'STR', 'KYC', 'CDD', 'EDD', 'PEP', 'UBO', 'BO'],
  },
  {
    id: 'credit',
    title: 'Credit',
    blurb: 'Loan classification, impairment, and provisioning under SLFRS 9.',
    color: '#B45309',
    terms: ['ECL', 'DPD', 'NPL'],
  },
  {
    id: 'controls',
    title: 'Controls & accounting',
    blurb: 'Core internal-control principles and journal-entry discipline.',
    color: '#3A5A3A',
    terms: ['SoD', 'MJE', 'GL'],
  },
  {
    id: 'digital',
    title: 'Digital fraud',
    blurb: 'Account-takeover and authentication terms relevant to online and mobile banking.',
    color: '#993556',
    terms: ['ATO', 'MFA', 'SIM'],
  },
  {
    id: 'trade',
    title: 'Trade finance',
    blurb: 'Trade documentation, product classification, and trade-based money-laundering vectors.',
    color: '#2E7D32',
    terms: ['LC', 'TBML', 'HS', 'FX'],
  },
  {
    id: 'platform',
    title: 'Platform & general',
    blurb: 'Institution-specific terms and cross-domain shorthand used across Sentinel.',
    color: '#4B3F72',
    terms: ['AUM', 'KRI', 'SME', 'ESG'],
  },
];
