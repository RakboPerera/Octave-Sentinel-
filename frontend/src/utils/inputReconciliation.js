// ─── INPUT RECONCILIATION (IPE — Information Provided by Entity) ─────────────
// An auditor's first question about any data extract is "how do I know it's
// complete and accurate?". The platform previously trusted whatever CSV was
// uploaded. This module computes the population control totals (record count +
// total monetary value) from the parsed file and, when the auditor supplies
// expected totals from an independent source (core banking / GL / trial
// balance), ties them out — so the run records an explicit completeness &
// accuracy assertion rather than an implicit assumption.
//
// The population totals are recorded on every run even without expected figures:
// "we analysed N records totalling LKR X — 100% of the provided population" is
// itself the IPE control-total artifact that belongs in the working papers.

import { num } from './detectionEngine.js';

// The monetary field that represents this agent's population value, if any.
// Agents that are count-based (KYC, access, conduct) reconcile on record count.
export const POPULATION_EXPOSURE_FIELD = {
  credit: 'exposure_lkr',
  suspense: 'current_balance_lkr',
  controls: 'amount_lkr',
  mje: 'amount_lkr',
  collateral: 'exposure_lkr',
  connectedParty: 'aggregate_exposure_lkr',
  thirdParty: 'annual_spend_lkr',
  wealth: 'holding_lkr',
  creditFraud: 'facility_lkr',
  transaction: 'amount_lkr',
  insider: 'amount_lkr',
  trade: 'invoice_amount_lkr',
};

// Compute the control totals from the parsed rows (the full population).
export function computePopulationTotals(agentId, rows) {
  const safe = Array.isArray(rows) ? rows : [];
  const field = POPULATION_EXPOSURE_FIELD[agentId] || null;
  let total = 0; let valued = 0;
  if (field) {
    for (const r of safe) {
      const v = num(r?.[field]);
      if (v != null) { total += v; valued++; }
    }
  }
  return {
    recordCount: safe.length,
    exposureField: field,
    totalExposureLkr: field ? Math.round(total) : null,
    valuedRecords: field ? valued : null,
  };
}

// Tie the computed totals out against expected control totals from an
// independent source. `expected` = { recordCount?, totalExposureLkr? }.
// tolerancePct applies to the exposure comparison (counts must match exactly).
export function reconcile(totals, expected, tolerancePct = 1) {
  if (!expected || (expected.recordCount == null && expected.totalExposureLkr == null)) {
    return { status: 'no-control', message: 'No expected control totals supplied — population recorded but not tied out.' };
  }
  const checks = [];
  let worst = 'pass';
  if (expected.recordCount != null) {
    const exp = Number(expected.recordCount);
    const diff = totals.recordCount - exp;
    const ok = diff === 0;
    if (!ok) worst = 'fail';
    checks.push({ metric: 'Record count', expected: exp, actual: totals.recordCount, variance: diff, ok });
  }
  if (expected.totalExposureLkr != null && totals.totalExposureLkr != null) {
    const exp = Number(expected.totalExposureLkr);
    const variancePct = exp ? ((totals.totalExposureLkr - exp) / exp) * 100 : (totals.totalExposureLkr ? 100 : 0);
    const ok = Math.abs(variancePct) <= tolerancePct;
    if (!ok && worst !== 'fail') worst = 'warn';
    checks.push({ metric: 'Total value (LKR)', expected: exp, actual: totals.totalExposureLkr, variancePct: Math.round(variancePct * 100) / 100, ok, tolerancePct });
  }
  return {
    status: worst, // 'pass' | 'warn' | 'fail'
    checks,
    message: worst === 'pass' ? 'Extract ties out to the expected control totals.'
      : worst === 'warn' ? 'Total value variance exceeds tolerance — confirm extract accuracy before relying on findings.'
      : 'Record count does not match the expected population — the extract may be incomplete.',
  };
}

// Convenience: build the full reconciliation record stored on a run. `provenance`
// = { sourceSystem, extractedBy, extractedOn } — the lineage attestation that
// turns a CSV into audit evidence (which system of record, who extracted it,
// when). Without it the tie-out is to an unattributed file; with it the run
// records WHERE the population came from and WHO is accountable for completeness.
export function buildReconciliation(agentId, rows, expected, tolerancePct = 1, provenance = null) {
  const totals = computePopulationTotals(agentId, rows);
  const tieOut = reconcile(totals, expected, tolerancePct);
  return { ...totals, expected: expected || null, tieOut, provenance: provenance || null };
}

// A one-line completeness statement for working papers / the assurance view.
export function completenessStatement(recon) {
  if (!recon) return null;
  const p = recon.provenance;
  const src = p?.sourceSystem ? `from ${p.sourceSystem}` : 'from the provided extract';
  const who = p?.extractedBy ? `, extracted by ${p.extractedBy}` : '';
  const when = p?.extractedOn ? ` on ${String(p.extractedOn).slice(0, 10)}` : '';
  const n = (recon.recordCount ?? 0).toLocaleString();
  const tie = recon.tieOut?.status;
  const tieMsg = tie === 'pass' ? 'tied out to source control totals (complete & accurate)'
    : tie === 'warn' ? 'value variance above tolerance vs source — confirm before relying'
    : tie === 'fail' ? 'record count does NOT match source — extract may be incomplete'
    : 'population recorded; no independent source total supplied to tie out';
  return `${n} records analysed ${src}${who}${when} — ${tieMsg}.`;
}
