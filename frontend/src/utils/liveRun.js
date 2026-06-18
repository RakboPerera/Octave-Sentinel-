// ─── LIVE RUN PATH (shared) ──────────────────────────────────────────────────
// The deterministic-engine run path, extracted from the Data Hub so it can be
// triggered from anywhere (Data Hub bulk run, the one-click demo loader on Now /
// Detection Assurance / Engine Map empty states). Runs locally over the full
// population — no LLM, no API key — and the grounded, reproducible result is the
// system of record.
import { detectFindings, DETECTOR_AGENTS, computeReturnReferences, enrichAgentResult } from './detectionEngine.js';
import { buildReconciliation, computePopulationTotals } from './inputReconciliation.js';
import { resolveFloors } from '../data/regulatoryFloors.js';
import { loadDemoDatasets, DEMO_FILE_BY_SLOT } from '../data/demoDatasets.js';
import { generateRealisticPortfolio } from '../data/syntheticPortfolio.js';

export function asOfMsFromProfile(bankProfile) {
  const d = bankProfile?.asOfDate ? Date.parse(bankProfile.asOfDate) : NaN;
  return Number.isFinite(d) ? d : Date.now();
}

// Key numeric field monitored per agent for input-distribution drift (S4).
export const DRIFT_FIELD = {
  credit: 'exposure_lkr', transaction: 'amount_lkr', suspense: 'current_balance_lkr',
  mje: 'amount_lkr', collateral: 'ltv_ratio', connectedParty: 'single_obligor_pct',
  wealth: 'holding_lkr', trade: 'position_amount', creditFraud: 'facility_lkr',
  thirdParty: 'concentration_pct', digital: 'behavioral_score', capital: 'tier1_capital_lkr_bn',
};

// System of record per agent — the upstream source a real extract would come
// from. Used in the provenance/lineage attestation on the IPE reconciliation.
export const SOURCE_SYSTEM = {
  credit: 'Core Banking — Loans (LAS)', creditFraud: 'Loan Origination System', transaction: 'Core Banking — Transactions', suspense: 'GL — Suspense Ledger',
  kyc: 'CDD / KYC System', controls: 'Workflow / Maker-Checker Logs', digital: 'Digital Channel / IAM Logs', trade: 'Trade Finance System',
  mje: 'General Ledger (MJE)', insider: 'Workflow / Access Logs', staffAccess: 'IAM / Entitlement System', capital: 'Regulatory Reporting (Capital)',
  balance: 'ALM / Treasury System', wealth: 'Wealth Management Platform', collateral: 'Collateral Register', connectedParty: 'Related-Party Register',
  alm: 'ALM / Treasury System', thirdParty: 'Vendor Management System', accessRights: 'IAM / Entitlement System', conduct: 'Case / Conduct Register', regReporting: 'Regulatory Reporting System',
};

export function runDetectionLocally(agentId, rows, state, dispatch, expectedControls = null, provenance = null) {
  const ctx = {
    asOfMs: asOfMsFromProfile(state.bankProfile),
    computedAt: new Date().toISOString(),
  };
  // Cross-agent inputs for the consolidating agents (best-effort from prior uploads):
  if (agentId === 'regReporting') {
    ctx.computedReturns = computeReturnReferences({
      capital: state.uploadedData?.capital?.rows,
      credit: state.uploadedData?.credit?.rows,
      connectedParty: state.uploadedData?.connectedParty?.rows,
    });
  } else if (agentId === 'staffAccess') {
    ctx.accessRows = state.uploadedData?.accessRights?.rows || null;
  } else if (agentId === 'kyc') {
    ctx.sanctionsRows = state.uploadedData?.sanctions?.rows || null;
  }
  // Risk Appetite → engine for the ratio detectors.
  if (agentId === 'capital' || agentId === 'connectedParty' || agentId === 'balance') {
    ctx.appetite = resolveFloors(state.appetiteOverrides);
  }
  const result = detectFindings(agentId, rows, state.thresholds, ctx);
  // Publish engine-computed prudential summary metrics (capital ratios, Stage-3,
  // sector concentration, KYC gap rate, suspense aging, ALM IRRBB) onto the result
  // so Bank Position + Compliance read live engine output, not the legacy schema.
  enrichAgentResult(agentId, rows, result);
  result._reconciliation = buildReconciliation(agentId, rows, expectedControls, 1, provenance);
  dispatch({ type: 'AGENT_SUCCESS', agentId, payload: result });
  dispatch({ type: 'SET_MODE', agentId, payload: 'live' });
  // S4 governance: freeze the first run's distribution as the drift baseline, and
  // append an assurance snapshot for backtesting.
  const field = DRIFT_FIELD[agentId];
  if (field) {
    const values = rows.map(r => Number(String(r?.[field] ?? '').replace(/[, ]/g, ''))).filter(Number.isFinite);
    if (values.length) dispatch({ type: 'CAPTURE_DRIFT_BASELINE', payload: { agentId, field, values, capturedAt: ctx.computedAt } });
  }
  const eng = result._engine || {};
  dispatch({ type: 'PUSH_ASSURANCE_SNAPSHOT', payload: { ts: ctx.computedAt, agentId, findings: result.key_findings?.length ?? 0, critical: result.key_findings?.filter(f => f.severity === 'critical').length ?? 0, contentHash: eng.contentHash || null } });
  return result;
}

// ONE-CLICK DEMO: load datasets and run the real engine over every detector
// agent, so all engine-derived views populate with genuine, reproducible output.
// opts.realistic=true overlays a large, MOSTLY-CLEAN synthetic portfolio over the
// high-value agents (thousands of rows, ~2–5% anomalies) so precision/FDR/
// calibration and the charts discriminate; the rest keep the illustrative
// samples. Returns { agents, findings }.
export function runFullDemo(state, dispatch, onProgress = null, opts = {}) {
  const datasets = loadDemoDatasets();
  if (opts.realistic) {
    const synth = generateRealisticPortfolio();
    for (const [slot, rows] of Object.entries(synth)) datasets[slot] = rows;
  }
  // 1. Populate uploadedData for every slot (UI + cross-feeds + drift current).
  for (const [slot, rows] of Object.entries(datasets)) {
    dispatch({ type: 'UPLOAD_DATA', agentId: slot, rows, filename: DEMO_FILE_BY_SLOT[slot] || `${slot}.csv` });
  }
  // 2. Synthetic state with uploadedData so cross-feeds resolve immediately
  //    (dispatch is async — state won't update mid-loop).
  const runState = { ...state, uploadedData: Object.fromEntries(Object.entries(datasets).map(([k, rows]) => [k, { rows }])) };
  const extractedOn = new Date().toISOString();
  let agents = 0, findings = 0;
  for (const agentId of DETECTOR_AGENTS) {
    const rows = datasets[agentId];
    if (!rows || !rows.length) continue;
    if (onProgress) onProgress(agentId, 'running');
    try {
      // Declared SOURCE control totals (== the extract here, so the IPE ties out
      // 'pass') + a lineage attestation, so the run carries a completeness &
      // provenance artifact like a real extract would.
      const totals = computePopulationTotals(agentId, rows);
      const declared = { recordCount: totals.recordCount, totalExposureLkr: totals.totalExposureLkr };
      const provenance = { sourceSystem: SOURCE_SYSTEM[agentId] || 'Source system', extractedBy: opts.realistic ? 'Sentinel scale generator' : 'Sentinel demo loader', extractedOn };
      const r = runDetectionLocally(agentId, rows, runState, dispatch, declared, provenance);
      agents++; findings += r.key_findings?.length || 0;
      if (onProgress) onProgress(agentId, 'done');
    } catch (e) {
      dispatch({ type: 'AGENT_ERROR', agentId, payload: e.message });
      if (onProgress) onProgress(agentId, 'error');
    }
  }
  return { agents, findings };
}
