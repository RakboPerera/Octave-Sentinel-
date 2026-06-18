// ─── INSIGHT ↔ SAMPLE-DATA VALIDATOR ─────────────────────────────────────────
// Runs the REAL detection engine over the REAL bundled sample CSVs (the data the
// default one-click demo uses) and checks two things:
//   1. GROUNDING — every finding maps back to an actual source row (sourceRef).
//   2. NAMED ENTITIES — the entities cited in the UI narrative (SUS-017, STF-1847,
//      BR-14, BNK-CORP-0887, MJE-2026-4205 …) exist in the CSVs with their figures.
// Pure node; mirrors loadDemoDatasets() + runDetectionLocally() ctx wiring.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Papa from 'papaparse';
import { detectFindings, DETECTOR_AGENTS, computeReturnReferences, enrichAgentResult } from '../src/utils/detectionEngine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, '../src/data/sample-data');

const DEMO_SLOTS = {
  '01_credit_portfolio.csv': 'credit', '02_transactions.csv': 'transaction', '03_suspense_accounts.csv': 'suspense',
  '04_kyc_customers.csv': 'kyc', '05_internal_controls.csv': 'controls', '06_digital_sessions.csv': 'digital',
  '07_trade_treasury.csv': 'trade', '08_mje_testing.csv': 'mje', '09_insider_risk.csv': 'insider',
  '10_capital_structure.csv': 'capital', '11_balance_sheet_drivers.csv': 'balance', '13_wealth_portfolio.csv': 'wealth',
  '14_collateral_register.csv': 'collateral', '15_connected_parties.csv': 'connectedParty', '16_alm_gap.csv': 'alm',
  '17_vendor_register.csv': 'thirdParty', '18_access_rights.csv': 'accessRights', '19_conduct_register.csv': 'conduct',
  '20_sanctions_hits.csv': 'sanctions', '22_credit_fraud_originations.csv': 'creditFraud', '23_reg_reporting_submissions.csv': 'regReporting',
};

// Load + parse every sample CSV into { slot: rows[] } (mirrors loadDemoDatasets).
const rawByFile = {};
const datasets = {};
for (const file of readdirSync(DATA)) {
  if (!file.endsWith('.csv')) continue;
  const text = readFileSync(resolve(DATA, file), 'utf8');
  rawByFile[file] = text;
  const slot = DEMO_SLOTS[file];
  if (slot) datasets[slot] = Papa.parse(text.trim(), { header: true, skipEmptyLines: true }).data || [];
}
if (datasets.insider) datasets.staffAccess = datasets.insider; // consolidated agent shares the file

const asOfMs = Date.parse('31 Dec 2025');
function ctxFor(agentId) {
  const ctx = { asOfMs, computedAt: '2025-12-31T00:00:00.000Z' };
  if (agentId === 'regReporting') ctx.computedReturns = computeReturnReferences({ capital: datasets.capital, credit: datasets.credit, connectedParty: datasets.connectedParty });
  else if (agentId === 'staffAccess') ctx.accessRows = datasets.accessRights || null;
  else if (agentId === 'kyc') ctx.sanctionsRows = datasets.sanctions || null;
  return ctx;
}

console.log('\n' + '═'.repeat(76));
console.log('INSIGHT ↔ SAMPLE-DATA VALIDATION  (default demo = 23 bundled CSVs)');
console.log('═'.repeat(76));

let totFind = 0, totCrit = 0, totHigh = 0, ungrounded = 0;
const perAgent = [];
for (const agentId of DETECTOR_AGENTS) {
  const rows = datasets[agentId];
  if (!rows || !rows.length) { perAgent.push({ agentId, rows: 0, note: 'no sample slot' }); continue; }
  let result;
  try { result = detectFindings(agentId, rows, null, ctxFor(agentId)); }
  catch (e) { perAgent.push({ agentId, rows: rows.length, error: e.message }); continue; }
  try { enrichAgentResult(agentId, rows, result); } catch { /* enrich optional */ }
  const ks = result.key_findings || [];
  const crit = ks.filter(f => f.severity === 'critical').length;
  const high = ks.filter(f => f.severity === 'high').length;
  // GROUNDING: every finding must point at a real source row.
  let bad = 0;
  for (const f of ks) {
    const ri = f.evidence?.sourceRef?.rowIndex;
    const key = f.evidence?.sourceRef?.key;
    const grounded = (Number.isInteger(ri) && ri >= 0 && ri < rows.length) || (key != null && rows.some(r => Object.values(r).includes(key)));
    if (!grounded) bad++;
  }
  ungrounded += bad;
  totFind += ks.length; totCrit += crit; totHigh += high;
  perAgent.push({ agentId, rows: rows.length, findings: ks.length, crit, high, bad,
    sample: ks.slice(0, 2).map(f => `${f.severity}:${f.evidence?.sourceRef?.key ?? '—'}`).join(' | ') });
}

console.log('\nPER-AGENT (engine run over sample CSVs):');
for (const a of perAgent) {
  if (a.note) { console.log(`  ${a.agentId.padEnd(15)} ${a.note}`); continue; }
  if (a.error) { console.log(`  ${a.agentId.padEnd(15)} ✗ ERROR: ${a.error}`); continue; }
  const flag = a.bad ? `  ⚠ ${a.bad} UNGROUNDED` : '';
  console.log(`  ${a.agentId.padEnd(15)} rows=${String(a.rows).padStart(4)}  findings=${String(a.findings).padStart(3)}  crit=${a.crit} high=${a.high}${flag}`);
  if (a.sample) console.log(`  ${' '.repeat(15)}   e.g. ${a.sample}`);
}
console.log(`\nTOTALS  findings=${totFind}  critical=${totCrit}  high=${totHigh}  ungrounded=${ungrounded}`);

// ─── NAMED ENTITY CHECK ───────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(76));
console.log('NAMED ENTITIES cited in UI narrative — present in sample CSVs?');
console.log('─'.repeat(76));
const ENTITIES = ['SUS-017', 'STF-1847', 'BR-14', 'BNK-CORP-0887', 'MJE-2026-4205', 'MJE-2026-4201', 'DEV-A4F7-9921', 'BNK-C-8834-G', 'BNK-0841-X', 'INT-BR14-007'];
for (const ent of ENTITIES) {
  const hits = [];
  for (const [file, text] of Object.entries(rawByFile)) {
    const n = (text.match(new RegExp(ent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (n) hits.push(`${file}×${n}`);
  }
  console.log(`  ${ent.padEnd(15)} ${hits.length ? '✓ ' + hits.join(', ') : '✗ NOT FOUND in any sample CSV'}`);
}

// Spot-check SUS-017 figures (cited: ~LKR 1.24 Bn, 94 days aged).
const sus = (datasets.suspense || []).find(r => Object.values(r).some(v => String(v).includes('SUS-017')));
if (sus) {
  console.log('\nSUS-017 row (suspense CSV) — cited as LKR 1.24 Bn, 94 days aged:');
  console.log('  ' + JSON.stringify(sus));
}
const stf = (datasets.insider || []).find(r => Object.values(r).some(v => String(v).includes('STF-1847')));
if (stf) {
  console.log('\nSTF-1847 row (insider CSV) — cited as score 94/100, 6 dimensions:');
  console.log('  ' + JSON.stringify(stf));
}
console.log('');
