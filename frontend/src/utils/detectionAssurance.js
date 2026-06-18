// ─── DETECTION ASSURANCE / MODEL GOVERNANCE (Phase 3 — gap 7) ────────────────
// A bank using AI/automated detection in a control function must be able to
// answer "how accurate is it, and how do you know?". Previously there was no
// answer: the only "confidence" was a number the LLM made up about itself, and
// no false-positive / precision rate was measured.
//
// Because detection is now deterministic and grounded (Phase 1), this module
// derives real, reproducible assurance metrics per agent:
//   • method      — deterministic-rule (engine) vs ai-generated (legacy/demo)
//   • coverage    — rows analysed, findings raised, severity distribution
//   • confidence  — average MARGIN-based confidence (distance past threshold),
//                   not a self-reported LLM number
//   • precision   — confirmed / (confirmed + auditor-marked false positives),
//                   from the case workbench
//   • reproducibility — the engine content hash (same data ⇒ same hash)

import { DETECTOR_AGENTS } from './detectionEngine.js';
import { isotonicRegression } from './statistics.js';

function avg(nums) {
  const v = nums.filter(n => typeof n === 'number' && Number.isFinite(n));
  return v.length ? v.reduce((s, n) => s + n, 0) / v.length : null;
}

// agentResults: state.agentResults ({ [agentId]: block }). cases: state.cases (or
// merged). caseWorkbench: state.caseWorkbench (FP marks keyed by case id).
export function computeDetectionAssurance(agentResults = {}, cases = [], caseWorkbench = {}) {
  const perAgent = [];

  // FP / case stats grouped by agent (cases carry agentId; FP lives in workbench).
  const caseStatsByAgent = {};
  for (const c of cases || []) {
    const aid = c.agentId || (Array.isArray(c.agents) ? c.agents[0] : null);
    if (!aid) continue;
    const s = caseStatsByAgent[aid] || (caseStatsByAgent[aid] = { total: 0, fp: 0 });
    s.total++;
    if (caseWorkbench[c.id]?.falsePositive) s.fp++;
  }

  for (const [agentId, block] of Object.entries(agentResults || {})) {
    if (!block || typeof block !== 'object') continue;
    const findings = Array.isArray(block.key_findings) ? block.key_findings : [];
    const eng = block._engine || null;
    const deterministic = !!eng?.supported || DETECTOR_AGENTS.includes(agentId);

    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) {
      const sev = String(f?.severity || 'medium').toLowerCase();
      if (bySeverity[sev] != null) bySeverity[sev]++;
    }
    const avgConfidence = avg(findings.map(f => f?.confidence));

    // S1 — statistical rigour: how many findings rest on a real distribution
    // (p-value) vs a rule/margin, and the multiple-testing (FDR) outcome.
    const statFindings = findings.filter(f => f?.evidence?.statistic && Number.isFinite(f.evidence.statistic.p));
    const pValueFindings = findings.filter(f => f?.confidenceBasis === 'p-value').length;
    const belowFdr = findings.filter(f => f?.belowFdr).length;
    const fdr = eng?.fdr || null; // { tested, discoveries, q } | null

    const cs = caseStatsByAgent[agentId] || { total: 0, fp: 0 };
    const confirmed = cs.total - cs.fp;
    const precision = cs.total > 0 ? confirmed / cs.total : null;

    perAgent.push({
      agentId,
      method: deterministic ? 'deterministic-rule' : 'ai-generated',
      deterministic,
      rowsAnalysed: eng?.rowsAnalysed ?? null,
      findings: findings.length,
      bySeverity,
      avgConfidence,
      statisticalFindings: statFindings.length,
      pValueConfidence: pValueFindings,
      belowFdr,
      fdr,
      cases: cs.total,
      falsePositives: cs.fp,
      precision,
      reproducible: !!eng?.deterministic,
      contentHash: eng?.contentHash || null,
      engineVersion: eng?.version || null,
    });
  }

  // ── CONFIDENCE CALIBRATION (S4) ──────────────────────────────────────────
  // Close the loop: does a "0.8 confidence" finding really get confirmed ~80% of
  // the time? Fit an isotonic (monotone) curve mapping each agent's STATED
  // confidence → its OBSERVED precision, using agents that have auditor-labelled
  // cases. The fitted curve gives a calibrated confidence and a reliability gap
  // (stated − observed). With no labels yet, calibration is null (honest).
  const calPoints = perAgent
    .filter(a => a.cases >= 3 && a.avgConfidence != null && a.precision != null)
    .map(a => ({ x: a.avgConfidence, y: a.precision, weight: a.cases }));
  const calibrator = calPoints.length >= 2 ? isotonicRegression(calPoints) : null;
  let calibrationGap = null;
  if (calPoints.length) {
    const gaps = calPoints.map(p => Math.abs(p.x - p.y));
    calibrationGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  }
  for (const a of perAgent) {
    if (a.avgConfidence == null) { a.calibratedConfidence = null; a.reliability = null; continue; }
    a.calibratedConfidence = calibrator ? Math.round(calibrator.calibrate(a.avgConfidence) * 1000) / 1000 : null;
    if (a.precision != null && a.cases >= 3) {
      const gap = a.avgConfidence - a.precision;
      a.reliability = gap > 0.15 ? 'over-confident' : gap < -0.15 ? 'under-confident' : 'calibrated';
    } else {
      a.reliability = 'unlabelled';
    }
  }

  perAgent.sort((a, b) => a.agentId.localeCompare(b.agentId));

  // ── Overall roll-up ──
  const totalFindings = perAgent.reduce((s, a) => s + a.findings, 0);
  const totalCases = perAgent.reduce((s, a) => s + a.cases, 0);
  const totalFp = perAgent.reduce((s, a) => s + a.falsePositives, 0);
  const detCount = perAgent.filter(a => a.deterministic).length;
  const totalStatTests = perAgent.reduce((s, a) => s + (a.fdr?.tested || 0), 0);
  const totalDiscoveries = perAgent.reduce((s, a) => s + (a.fdr?.discoveries || 0), 0);
  const overall = {
    agents: perAgent.length,
    deterministicAgents: detCount,
    aiAgents: perAgent.length - detCount,
    totalFindings,
    totalCases,
    falsePositives: totalFp,
    precision: totalCases > 0 ? (totalCases - totalFp) / totalCases : null,
    avgConfidence: avg(perAgent.map(a => a.avgConfidence)),
    statisticalTests: totalStatTests,
    fdrDiscoveries: totalDiscoveries,
    calibrationGap, // mean |stated confidence − observed precision| across labelled agents (null if no labels)
  };

  return { perAgent, overall };
}

// ── Narrative grounding check ────────────────────────────────────────────────
// When an LLM narrative is attached to a (deterministic) finding, every numeric
// value it cites should appear in the finding's evidence. Returns the unmatched
// numbers so ungrounded narrative can be flagged/stripped rather than trusted.
export function checkNarrativeGrounding(finding) {
  const narrative = finding?.narrative || finding?.recommended_action_ai || '';
  const ev = finding?.evidence;
  if (!narrative || !ev?.triggeredBy?.length) return { grounded: true, unmatched: [] };
  const allowed = new Set();
  for (const t of ev.triggeredBy) {
    if (typeof t.value === 'number') allowed.add(Math.round(t.value * 100) / 100);
    if (typeof t.threshold === 'number') allowed.add(Math.round(t.threshold * 100) / 100);
  }
  if (typeof ev.recomputedExposureLkr === 'number') allowed.add(Math.round(ev.recomputedExposureLkr));
  const cited = (String(narrative).match(/\d[\d,]*\.?\d*/g) || [])
    .map(s => parseFloat(s.replace(/,/g, '')))
    .filter(n => Number.isFinite(n) && n > 0);
  const unmatched = cited.filter(n => {
    const r = Math.round(n * 100) / 100;
    // tolerate exact match or within 1% of an allowed value
    return ![...allowed].some(a => a === r || (a !== 0 && Math.abs((r - a) / a) <= 0.01));
  });
  return { grounded: unmatched.length === 0, unmatched };
}
