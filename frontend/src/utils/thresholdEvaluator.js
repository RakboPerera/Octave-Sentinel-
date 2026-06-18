// ─── THRESHOLD EVALUATOR ─────────────────────────────────────────────────────
// Client-side re-classification engine. Given the existing demo findings
// (which preserve their raw signals like anomaly_score, dpd, clearing_ratio),
// re-derive each finding's severity under a new threshold config WITHOUT
// calling the LLM. Enables instant "Apply & Rerun" in demo mode.
//
// For live mode (uploaded data), thresholds are passed in the agent POST body
// and the LLM produces freshly-classified findings. This evaluator is not used
// for live mode — the LLM is.

import { getDefaults } from '../data/thresholdRegistry.js';
import { extractExposure } from './exposureDedup.js';

// Severity rank helper — higher is worse. Used to ensure evaluators only
// escalate (or preserve) severity, never silently downgrade it.
const SEVERITY_RANK = { critical: 3, high: 2, medium: 1, low: 0 };

function maxSev(a, b) {
  const ra = SEVERITY_RANK[a] ?? 1;
  const rb = SEVERITY_RANK[b] ?? 1;
  return ra >= rb ? a : b;
}

// Map agentId → evaluator function. Each evaluator looks at a finding,
// consults the current thresholds, and returns an updated finding (possibly
// with a changed severity). Evaluators are additive: they only escalate
// severity, never downgrade a finding that was critical for other reasons.

const EVALUATORS = {
  // FIX C3: Credit evaluator no longer downgrades severity. A finding that is
  // critical due to exposure size or other signals stays critical even if the
  // anomaly_score falls below the flag threshold.
  credit: (f, t) => {
    if (typeof f.anomaly_score !== 'number') return f;
    const critical = t.isoforest_critical ?? 0.85;
    const flag = t.isoforest_flag ?? 0.65;
    const score = f.anomaly_score;
    let derived;
    if (score >= critical) derived = 'critical';
    else if (score >= flag) derived = 'high';
    else derived = 'medium';
    // Only escalate — never downgrade.
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  transaction: (f, t) => {
    if (typeof f.structuring_score !== 'number' && typeof f.anomaly_score !== 'number') return f;
    const cutoff = t.structuring_score ?? 0.60;
    const score = f.structuring_score ?? f.anomaly_score;
    let derived;
    if (score >= cutoff + 0.25) derived = 'critical';
    else if (score >= cutoff) derived = 'high';
    else derived = 'medium';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  suspense: (f, t) => {
    if (typeof f.growth_rate_30d_pct !== 'number' && typeof f.aging_days !== 'number') return f;
    const growth = t.growth_pct_30d ?? 50;
    const aging = t.aging_breach_days ?? 90;
    const clearingMin = t.clearing_ratio_min ?? 0.30;
    let score = 0;
    if ((f.growth_rate_30d_pct || 0) >= growth * 1.5) score += 2;
    else if ((f.growth_rate_30d_pct || 0) >= growth) score += 1;
    if ((f.aging_days || 0) >= aging) score += 1;
    if (typeof f.clearing_ratio === 'number' && f.clearing_ratio < clearingMin) score += 2;
    const derived = score >= 3 ? 'critical' : score >= 2 ? 'high' : score >= 1 ? 'medium' : 'medium';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  kyc: (f, t) => {
    if (typeof f.total_accounts_introduced !== 'number' || typeof f.accounts_with_gaps !== 'number') return f;
    // FIX H5: An introducer with zero accounts can't be flagged on gap rate —
    // dividing by zero produces Infinity which would breach any threshold.
    if (f.total_accounts_introduced === 0) return f;
    const threshold = t.introducer_gap_pct ?? 15;
    const minCount = t.introducer_min_count ?? 3;
    const gapPct = (f.accounts_with_gaps / f.total_accounts_introduced) * 100;
    const flagged = gapPct >= threshold && f.accounts_with_gaps >= minCount;
    if (!flagged) return f;
    const derived = gapPct >= threshold * 2 ? 'high' : 'medium';
    return { ...f, flag: true, severity: maxSev(f.severity || 'medium', derived) };
  },

  controls: (f, t) => {
    if (typeof f.branch_score !== 'number' && typeof f.composite_score !== 'number') return f;
    const score = f.branch_score ?? f.composite_score;
    const floor = t.branch_composite_score ?? 65;
    let derived;
    if (score < floor - 15) derived = 'critical';
    else if (score < floor) derived = 'high';
    else derived = 'medium';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  // FIX H6: New evaluators for agents that previously had no client-side
  // severity logic — threshold preview now shows impact for all agents.

  digital: (f, t) => {
    if (typeof f.session_anomaly_score !== 'number' && typeof f.biometric_deviation !== 'number') return f;
    const sessionCutoff = t.session_anomaly_score ?? 0.70;
    const bioCutoff = t.biometric_deviation ?? 0.75;
    const sessionScore = f.session_anomaly_score ?? 0;
    const bioScore = f.biometric_deviation ?? 0;
    let derived = 'medium';
    if (sessionScore >= sessionCutoff + 0.15 || bioScore >= bioCutoff + 0.10) derived = 'critical';
    else if (sessionScore >= sessionCutoff || bioScore >= bioCutoff) derived = 'high';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  trade: (f, t) => {
    if (typeof f.invoice_deviation_pct !== 'number' && typeof f.fx_limit_breach_pct !== 'number') return f;
    const devCutoff = t.invoice_deviation_pct ?? 25;
    const fxCutoff = t.fx_limit_breach_pct ?? 95;
    let derived = 'medium';
    if ((f.invoice_deviation_pct || 0) >= devCutoff + 20) derived = 'critical';
    else if ((f.invoice_deviation_pct || 0) >= devCutoff) derived = 'high';
    if ((f.fx_limit_breach_pct || 0) >= fxCutoff) derived = maxSev(derived, 'high');
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  insider: (f, t) => {
    if (typeof f.risk_score !== 'number' && typeof f.composite_score !== 'number') return f;
    const cutoff = t.risk_score_flag ?? 0.70;
    const score = f.risk_score ?? f.composite_score ?? 0;
    let derived;
    if (score >= cutoff + 0.15) derived = 'critical';
    else if (score >= cutoff) derived = 'high';
    else derived = 'medium';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  mje: (f, t) => {
    if (typeof f.entry_hour !== 'number' && typeof f.round_amount_pct !== 'number') return f;
    const lateHour = t.late_entry_hour ?? 19;
    const roundPct = t.round_amount_pct ?? 15;
    let score = 0;
    if (typeof f.entry_hour === 'number' && f.entry_hour >= lateHour) score++;
    if (typeof f.round_amount_pct === 'number' && f.round_amount_pct >= roundPct) score++;
    if (f.maker_checker_breach === true) score += 2;
    const derived = score >= 3 ? 'critical' : score >= 2 ? 'high' : score >= 1 ? 'medium' : 'medium';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  capital: (f, t) => {
    if (typeof f.tier1_pct !== 'number' && typeof f.car_pct !== 'number') return f;
    const tier1Min = t.tier1_min ?? 10.0;
    const carMin = t.car_min ?? 14.0;
    const lcrMin = t.lcr_min ?? 100;
    const nsfrMin = t.nsfr_min ?? 100;
    let derived = 'medium';
    const tier1 = f.tier1_pct;
    const car = f.car_pct;
    const lcr = f.lcr_pct;
    const nsfr = f.nsfr_pct;
    if ((typeof tier1 === 'number' && tier1 < tier1Min - 2) ||
        (typeof car === 'number' && car < carMin - 2) ||
        (typeof lcr === 'number' && lcr < lcrMin - 10) ||
        (typeof nsfr === 'number' && nsfr < nsfrMin - 10)) {
      derived = 'critical';
    } else if ((typeof tier1 === 'number' && tier1 < tier1Min) ||
               (typeof car === 'number' && car < carMin) ||
               (typeof lcr === 'number' && lcr < lcrMin) ||
               (typeof nsfr === 'number' && nsfr < nsfrMin)) {
      derived = 'high';
    }
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  balance: (f, t) => {
    if (typeof f.depositor_concentration_pct !== 'number') return f;
    const concLimit = t.depositor_concentration_pct ?? 35;
    const hqlaMin = t.hqla_quality_min ?? 60;
    let derived = 'medium';
    if ((f.depositor_concentration_pct || 0) >= concLimit + 15) derived = 'critical';
    else if ((f.depositor_concentration_pct || 0) >= concLimit) derived = 'high';
    if (typeof f.hqla_level1_pct === 'number' && f.hqla_level1_pct < hqlaMin) {
      derived = maxSev(derived, 'high');
    }
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  creditFraud: (f, t) => {
    if (typeof f.composite_score !== 'number' && typeof f.shell_borrower_score !== 'number') return f;
    const critCutoff = t.composite_critical ?? 0.80;
    const shellCutoff = t.shell_borrower_score ?? 0.75;
    const composite = f.composite_score ?? 0;
    const shell = f.shell_borrower_score ?? 0;
    let derived = 'medium';
    if (composite >= critCutoff || shell >= shellCutoff + 0.10) derived = 'critical';
    else if (composite >= critCutoff - 0.15 || shell >= shellCutoff) derived = 'high';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  regReporting: (f, t) => {
    // FIX H-4: Demo data key_findings use anomaly_score, not variance_score/bps_variance.
    // Guard now also accepts anomaly_score so demo-mode re-scoring fires correctly.
    const score = f.variance_score ?? f.anomaly_score ?? null;
    const bps   = f.bps_variance ?? null;
    if (score === null && bps === null) return f;
    // FIX M6: regReporting has two parallel signal scales — a 0–1 composite
    // variance score, and a raw basis-points variance. They escalate
    // asymmetrically:
    //   critical = composite ≥ severity_critical                (cutoff in registry)
    //            OR raw bps ≥ 2× the materiality tolerance      (gross overshoot)
    //   high     = composite within 0.20 of critical OR bps ≥ tolerance
    // The 2× multiplier on bps mirrors typical regulatory practice: at one
    // tolerance the return is "material variance", at twice the tolerance it
    // is "egregious variance" warranting Board notification.
    const critCutoff = t.severity_critical ?? 0.80;
    const carBps = t.car_tolerance_bps ?? 10;
    let derived = 'medium';
    if ((score || 0) >= critCutoff) derived = 'critical';
    else if ((bps || 0) >= carBps * 2) derived = 'critical';
    else if ((score || 0) >= critCutoff - 0.20 || (bps || 0) >= carBps) derived = 'high';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  staffAccess: (f, t) => {
    if (typeof f.composite_score !== 'number') return f;
    const critical = t.composite_critical ?? 0.85;
    const flag = t.composite_flag ?? 0.70;
    let derived;
    if (f.composite_score >= critical) derived = 'critical';
    else if (f.composite_score >= flag) derived = 'high';
    else derived = 'medium';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  wealth: (f, t) => {
    if (typeof f.gap !== 'number' && typeof f.concentration_pct !== 'number') return f;
    const profileGap = t.risk_profile_gap ?? 2;
    const conc = t.concentration_pct ?? 40;
    let derived = f.severity || 'medium';
    if (typeof f.gap === 'number') {
      if (f.gap >= profileGap + 1) derived = maxSev(derived, 'critical');
      else if (f.gap >= profileGap) derived = maxSev(derived, 'high');
    }
    if (typeof f.concentration_pct === 'number') {
      if (f.concentration_pct >= conc + 20) derived = maxSev(derived, 'critical');
      else if (f.concentration_pct >= conc) derived = maxSev(derived, 'high');
    }
    return { ...f, severity: derived };
  },

  collateral: (f, t) => {
    if (typeof f.days_since_valuation !== 'number' && typeof f.ltv_ratio !== 'number') return f;
    const stale = t.stale_days ?? 365;
    const ltvBreach = (t.ltv_breach_pct ?? 85) / 100;
    let derived = f.severity || 'medium';
    if (typeof f.days_since_valuation === 'number') {
      if (f.days_since_valuation >= stale * 3) derived = maxSev(derived, 'critical');
      else if (f.days_since_valuation >= stale) derived = maxSev(derived, 'high');
    }
    if (typeof f.ltv_ratio === 'number') {
      if (f.ltv_ratio >= ltvBreach + 0.05) derived = maxSev(derived, 'critical');
      else if (f.ltv_ratio >= ltvBreach) derived = maxSev(derived, 'high');
    }
    return { ...f, severity: derived };
  },

  connectedParty: (f, t) => {
    if (typeof f.capital_base_pct !== 'number') return f;
    const limit = t.single_obligor_pct ?? 25;
    const aggLimit = t.aggregate_pct ?? 40;
    const pct = f.capital_base_pct;
    let derived;
    if (pct >= limit || pct >= aggLimit) derived = 'critical';
    else if (pct >= limit - 3 || pct >= aggLimit - 3) derived = 'high';
    else derived = 'medium';
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  alm: (f, t) => {
    if (typeof f.cumulative_gap_pct !== 'number' && typeof f.eve_sensitivity_bps !== 'number') return f;
    const gapLimit = t.cumulative_gap_pct ?? 20;
    const eveLimit = t.eve_sensitivity_bps ?? 15;
    let derived = 'medium';
    const gapAbs = Math.abs(f.cumulative_gap_pct ?? 0);
    if (gapAbs >= gapLimit) derived = 'critical';
    else if (gapAbs >= gapLimit - 5) derived = 'high';
    if ((f.eve_sensitivity_bps || 0) >= eveLimit) derived = maxSev(derived, 'high');
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  thirdParty: (f, t) => {
    if (typeof f.concentration_pct !== 'number' && typeof f.days_since_assessment !== 'number') return f;
    const conc = t.concentration_pct ?? 60;
    const stale = t.assessment_stale ?? 365;
    let derived = 'medium';
    if (typeof f.concentration_pct === 'number') {
      if (f.concentration_pct >= conc + 15) derived = 'critical';
      else if (f.concentration_pct >= conc) derived = 'high';
    }
    if (typeof f.days_since_assessment === 'number' && f.days_since_assessment >= stale * 1.5) {
      derived = maxSev(derived, 'high');
    }
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },

  accessRights: (f, t) => {
    if (typeof f.last_login_days !== 'number' && typeof f.days_since_review !== 'number') return f;
    const dormant = t.dormant_days ?? 90;
    const review = t.priv_review_days ?? 90;
    let derived = 'medium';
    if (typeof f.last_login_days === 'number') {
      if (f.last_login_days >= dormant * 2) derived = 'critical';
      else if (f.last_login_days >= dormant) derived = maxSev(derived, 'high');
    }
    if (typeof f.days_since_review === 'number') {
      if (f.days_since_review >= review * 3) derived = maxSev(derived, 'critical');
      else if (f.days_since_review >= review) derived = maxSev(derived, 'high');
    }
    return { ...f, severity: derived };
  },

  conduct: (f, t) => {
    const rec = t.recurrence_flag ?? 2;
    const daysLimit = t.resolution_days ?? 60;
    let derived = 'medium';
    if (typeof f.case_count === 'number') {
      if (f.case_count >= rec + 1) derived = 'critical';
      else if (f.case_count >= rec) derived = maxSev(derived, 'high');
    }
    if (typeof f.days_open === 'number') {
      if (f.days_open >= daysLimit * 2) derived = maxSev(derived, 'critical');
      else if (f.days_open >= daysLimit) derived = maxSev(derived, 'high');
    }
    return { ...f, severity: maxSev(f.severity || 'medium', derived) };
  },
};

// Walk every agent block, every finding array, and re-evaluate severity.
// FIX M2: Instead of a hardcoded ARRAY_KEYS list, dynamically iterate all
// array-valued properties in each block. This ensures newly-added agents or
// custom array keys are re-evaluated without requiring a list update.
// Returns a new results object — does not mutate.
export function reEvaluateAllResults(results, thresholds = {}) {
  if (!results) return results;
  const out = {};
  for (const [agentId, block] of Object.entries(results)) {
    if (!block || typeof block !== 'object') { out[agentId] = block; continue; }
    const evaluator = EVALUATORS[agentId];
    const t = thresholds[agentId] || {};
    const newBlock = { ...block };

    // Re-evaluate every array-valued property that looks like a findings list.
    // Arrays of primitives (numbers, strings) are skipped — we only touch
    // arrays of objects (findings).
    // FIX M5: Decide per-element rather than from element [0] alone — a mixed
    // array (e.g. ["tag", { finding: ... }]) would otherwise be skipped wholesale.
    for (const [k, val] of Object.entries(block)) {
      if (!Array.isArray(val)) continue;
      if (val.length === 0 || !val.some(e => e && typeof e === 'object' && !Array.isArray(e))) {
        newBlock[k] = val;
        continue;
      }
      if (!evaluator) { newBlock[k] = val; continue; }
      newBlock[k] = val.map(f => (f && typeof f === 'object' && !Array.isArray(f) ? evaluator(f, t) : f));
    }
    out[agentId] = newBlock;
  }
  return out;
}

// Preview impact: compare severity distributions across all findings before/after.
export function computeImpactDiff(beforeResults, afterResults) {
  const count = (results) => {
    const out = { critical: 0, high: 0, medium: 0, low: 0, totalExposure: 0 };
    for (const [, block] of Object.entries(results || {})) {
      if (!block) continue;
      const findings = block.key_findings || [];
      for (const f of findings) {
        const s = (f.severity || 'medium').toLowerCase();
        if (out[s] != null) out[s]++;
        out.totalExposure += extractExposure(f); // unified alias list (FIX M4)
      }
    }
    return out;
  };
  const before = count(beforeResults);
  const after = count(afterResults);
  return {
    before, after,
    delta: {
      critical: after.critical - before.critical,
      high: after.high - before.high,
      medium: after.medium - before.medium,
      exposure: after.totalExposure - before.totalExposure,
    },
  };
}

export { EVALUATORS };
