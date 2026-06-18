// ─── BUNDLED DEMO DATASETS ───────────────────────────────────────────────────
// The 23 Demo Bank sample CSVs are bundled into the app (Vite ?raw glob) so the whole
// deterministic engine can be exercised with ONE click — no manual upload. This
// is what makes Detection Assurance, the Engine Map findings, and every
// statistical surface (p-values, FDR, robust-z, calibration, drift, backtesting,
// graph, vintage, geo-velocity) populate with REAL engine output in the demo.
import Papa from 'papaparse';

// Eagerly inline every sample CSV as a raw string (≈68 KB total — trivial).
const RAW = import.meta.glob('./sample-data/*.csv', { query: '?raw', import: 'default', eager: true });

// filename → state slot (a detector agentId, or a cross-feed slot like 'sanctions').
export const DEMO_SLOTS = {
  '01_credit_portfolio.csv': 'credit',
  '02_transactions.csv': 'transaction',
  '03_suspense_accounts.csv': 'suspense',
  '04_kyc_customers.csv': 'kyc',
  '05_internal_controls.csv': 'controls',
  '06_digital_sessions.csv': 'digital',
  '07_trade_treasury.csv': 'trade',
  '08_mje_testing.csv': 'mje',
  '09_insider_risk.csv': 'insider',
  '10_capital_structure.csv': 'capital',
  '11_balance_sheet_drivers.csv': 'balance',
  '13_wealth_portfolio.csv': 'wealth',
  '14_collateral_register.csv': 'collateral',
  '15_connected_parties.csv': 'connectedParty',
  '16_alm_gap.csv': 'alm',
  '17_vendor_register.csv': 'thirdParty',
  '18_access_rights.csv': 'accessRights',
  '19_conduct_register.csv': 'conduct',
  '20_sanctions_hits.csv': 'sanctions',          // cross-feed for kyc
  '22_credit_fraud_originations.csv': 'creditFraud',
  '23_reg_reporting_submissions.csv': 'regReporting',
};

export const DEMO_FILE_BY_SLOT = Object.fromEntries(Object.entries(DEMO_SLOTS).map(([f, s]) => [s, f]));

function parse(csv) {
  return Papa.parse(String(csv || '').trim(), { header: true, skipEmptyLines: true }).data || [];
}

// Parse all bundled CSVs into { [slot]: rows[] }. staffAccess shares the insider
// behaviour file (the consolidated agent scores the same staff actions, then
// correlates with the entitlement/access layer via ctx.accessRows).
export function loadDemoDatasets() {
  const out = {};
  for (const [path, text] of Object.entries(RAW)) {
    const file = path.split('/').pop();
    const slot = DEMO_SLOTS[file];
    if (slot) out[slot] = parse(text);
  }
  if (out.insider) out.staffAccess = out.insider;
  return out;
}
