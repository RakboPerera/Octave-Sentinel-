// ─── REGULATORY FLOORS — SINGLE SOURCE OF TRUTH (Wave 2) ─────────────────────
// Every regulatory minimum / ceiling / tolerance shown anywhere in the
// Business Platform MUST be cited from this file. Hard-coded numbers
// scattered across BusinessCompliance, BusinessRegulatoryCapital,
// BusinessRiskRegister etc. are a compliance risk — when CBSL updates a
// direction we have to chase dozens of strings. One file, one change.
//
// Shape per entry:
//   key      — short identifier used by callers
//   label    — short display name
//   metric   — unit label (for the UI)
//   value    — numeric floor or ceiling (percentage as percent, not ratio)
//   compare  — 'gte' (ratio must be ≥ value) | 'lte' (ratio must be ≤ value)
//   citation — structured { regulator, directive, section, effective_date, title }
//   internal_appetite — optional Demo Bank internal target above/below the regulatory floor
//   compliance_band_ambers — optional { lower, upper } for amber band (between floor and green)
//
// NOTE ON AMBIGUITY: a healthy bank typically targets INTERNAL APPETITE above
// the regulatory FLOOR. Previously the platform conflated these (orchestrator
// marked Demo Bank's LCR 203% as "amber" because amber = 150–250 in that view, yet
// the regulatory floor is 100%). This registry keeps the two cleanly
// separated so the Compliance page can report against the floor and the
// Regulatory Capital / Risk pages can surface both.

export const REGULATORY_FLOORS = {
  tier1_car: {
    key: 'tier1_car',
    label: 'Tier 1 Capital Adequacy Ratio',
    metric: '%',
    value: 8.5,
    compare: 'gte',
    citation: {
      regulator: 'CBSL',
      directive: 'Banking Act Direction No. 01/2016',
      section: '2',
      effective_date: '2017-01-01',
      title: 'Capital Adequacy Requirements under Basel III',
    },
    internal_appetite: 10.5,
    compliance_band_ambers: { lower: 10.0, upper: 12.0 },
  },
  total_car: {
    key: 'total_car',
    label: 'Total Capital Adequacy Ratio',
    metric: '%',
    value: 12.5,
    compare: 'gte',
    citation: {
      regulator: 'CBSL',
      directive: 'Banking Act Direction No. 01/2016',
      section: '2',
      effective_date: '2017-01-01',
      title: 'Capital Adequacy Requirements under Basel III',
    },
    internal_appetite: 14.0,
    compliance_band_ambers: { lower: 13.5, upper: 15.5 },
  },
  leverage_ratio: {
    key: 'leverage_ratio',
    label: 'Leverage Ratio',
    metric: '%',
    value: 3.0,
    compare: 'gte',
    citation: {
      regulator: 'BCBS/CBSL',
      directive: 'Basel III Leverage Ratio Framework · CBSL Direction No. 01/2016',
      section: '4',
      effective_date: '2018-01-01',
      title: 'Leverage Ratio',
    },
    internal_appetite: 5.0,
  },
  lcr: {
    key: 'lcr',
    label: 'Liquidity Coverage Ratio',
    metric: '%',
    value: 100,
    compare: 'gte',
    citation: {
      regulator: 'CBSL',
      directive: 'Banking Act Direction No. 01/2016',
      section: '5',
      effective_date: '2019-01-01',
      title: 'Liquidity Coverage Ratio',
    },
    internal_appetite: 120,
  },
  nsfr: {
    key: 'nsfr',
    label: 'Net Stable Funding Ratio',
    metric: '%',
    value: 100,
    compare: 'gte',
    citation: {
      regulator: 'CBSL',
      directive: 'Banking Act Direction No. 12/2018',
      section: '3',
      effective_date: '2019-07-01',
      title: 'Net Stable Funding Ratio',
    },
    internal_appetite: 110,
  },
  stage3_ratio: {
    key: 'stage3_ratio',
    label: 'Stage 3 / Gross Loans',
    metric: '%',
    value: 5.0,
    compare: 'lte',
    citation: {
      regulator: 'ICASL',
      directive: 'SLFRS 9 · CBSL Banking Act Direction No. 13/2021',
      section: '5.5',
      effective_date: '2018-01-01',
      title: 'SLFRS 9 Impairment — industry observable norm',
    },
    internal_appetite: 3.5,
  },
  single_obligor: {
    key: 'single_obligor',
    label: 'Single-Obligor Exposure (% of Capital Base)',
    metric: '%',
    value: 25,
    compare: 'lte',
    citation: {
      regulator: 'CBSL',
      directive: 'Banking Act Direction No. 03/2018',
      section: '4',
      effective_date: '2018-06-01',
      title: 'Large Exposures',
    },
  },
  connected_group: {
    key: 'connected_group',
    label: 'Connected-Group Exposure (% of Capital Base)',
    metric: '%',
    value: 40,
    compare: 'lte',
    citation: {
      regulator: 'CBSL',
      directive: 'Banking Act Direction No. 03/2018',
      section: '5',
      effective_date: '2018-06-01',
      title: 'Large Exposures — connected groups',
    },
  },
  suspense_aging_days: {
    key: 'suspense_aging_days',
    label: 'Suspense Aging (days)',
    metric: 'days',
    value: 90,
    compare: 'lte',
    citation: {
      regulator: 'CBSL',
      directive: 'Banking Act Direction No. 05/2024',
      section: '3',
      effective_date: '2024-03-15',
      title: 'Maintenance of suspense accounts',
    },
    internal_appetite: 30,
  },
  str_filing_days: {
    key: 'str_filing_days',
    label: 'STR Filing Deadline (working days)',
    metric: 'days',
    value: 5,
    compare: 'lte',
    citation: {
      regulator: 'CBSL',
      directive: 'FTRA No. 6 of 2006',
      section: '7',
      effective_date: '2006-03-06',
      title: 'Reporting of suspicious transactions',
    },
  },
  kyc_gap_pct: {
    key: 'kyc_gap_pct',
    label: 'KYC Gap Rate (bank-wide)',
    metric: '%',
    value: 2,
    compare: 'lte',
    citation: {
      regulator: 'CBSL',
      directive: 'Financial Institutions Act KYC/CDD Rules 2016',
      section: '3',
      effective_date: '2016-07-01',
      title: 'Customer Due Diligence',
    },
    internal_appetite: 1,
  },
  irrbb_eve_limit_pct: {
    key: 'irrbb_eve_limit_pct',
    label: 'IRRBB EVE Sensitivity (% of Tier 1)',
    metric: '%',
    value: 15,
    compare: 'lte',
    citation: {
      regulator: 'BCBS/CBSL',
      directive: 'IRRBB Standards (April 2016) · CBSL Direction No. 07/2021',
      section: '4',
      effective_date: '2022-01-01',
      title: 'Interest Rate Risk in the Banking Book',
    },
  },
  irrbb_cumulative_gap_pct: {
    key: 'irrbb_cumulative_gap_pct',
    label: 'Cumulative Repricing Gap (% of Assets)',
    metric: '%',
    value: 20,
    compare: 'lte',
    citation: {
      regulator: 'BCBS/CBSL',
      directive: 'IRRBB Standards · CBSL Direction No. 07/2021',
      section: '4',
      effective_date: '2022-01-01',
      title: 'Cumulative repricing gap limits',
    },
  },
};

// ─── STATUS CALCULATION ──────────────────────────────────────────────────────
// Given a measured value and a floor entry, return { status, reason } where
// status is 'breach' | 'regulatory-breach' | 'amber' | 'green'. Regulatory
// breaches are separate from 'amber' (internal appetite band) — this
// distinction is what fixes the threshold-ambiguity issue.
// ─── INTERNAL-APPETITE OVERRIDES (Settings → Risk Appetite) ──────────────────
// The CBSL regulatory floor is statutory and fixed. Demo Bank's INTERNAL APPETITE
// (the buffer it holds above the floor) is policy and editable. This merges a
// config override map { [floorKey]: appetiteValue } over the registry so every
// consumer reflects the bank's configured appetite.
export function resolveFloors(overrides = {}) {
  if (!overrides || Object.keys(overrides).length === 0) return REGULATORY_FLOORS;
  const out = {};
  for (const [k, f] of Object.entries(REGULATORY_FLOORS)) {
    const o = overrides[k];
    out[k] = (o != null && Number.isFinite(o)) ? { ...f, internal_appetite: o } : f;
  }
  return out;
}

// `appetiteOverride` (optional) replaces the registry internal_appetite for
// this evaluation — so the Risk Appetite editor flows into compliance scoring.
export function evaluateAgainstFloor(measuredValue, floorKey, appetiteOverride) {
  const base = REGULATORY_FLOORS[floorKey];
  const floor = (base && appetiteOverride != null && Number.isFinite(appetiteOverride))
    ? { ...base, internal_appetite: appetiteOverride }
    : base;
  if (!floor || measuredValue == null || !Number.isFinite(measuredValue)) {
    return { status: 'unknown', reason: 'No measurement available.' };
  }

  const regulatorOk = floor.compare === 'gte'
    ? measuredValue >= floor.value
    : measuredValue <= floor.value;

  if (!regulatorOk) {
    return {
      status: 'regulatory-breach',
      reason: `${measuredValue} breaches ${floor.citation.regulator} ${floor.citation.directive} ${floor.compare === 'gte' ? 'minimum' : 'maximum'} of ${floor.value}${floor.metric}.`,
    };
  }

  if (floor.internal_appetite != null) {
    const appetiteOk = floor.compare === 'gte'
      ? measuredValue >= floor.internal_appetite
      : measuredValue <= floor.internal_appetite;
    if (!appetiteOk) {
      return {
        status: 'amber',
        reason: `Above regulatory floor but below internal appetite of ${floor.internal_appetite}${floor.metric}.`,
      };
    }
  }

  return { status: 'green', reason: `Comfortably within both regulatory floor and internal appetite.` };
}

// ─── COMPLIANCE FRAMEWORK COMPOSITES ─────────────────────────────────────────
// Used by BusinessCompliance.jsx to compose the five-framework bank-wide score.
// Each framework maps to a set of floors — the per-framework score is the % of
// floors in 'green' status. Floors that cannot be measured (no data) are
// disclosed rather than silently excluded.
export const COMPLIANCE_FRAMEWORKS = {
  CBSL:    { label: 'CBSL Prudential',              floors: ['tier1_car', 'total_car', 'leverage_ratio', 'lcr', 'nsfr', 'suspense_aging_days'] },
  Basel:   { label: 'Basel III',                     floors: ['tier1_car', 'total_car', 'leverage_ratio', 'irrbb_eve_limit_pct', 'irrbb_cumulative_gap_pct'] },
  SLFRS:   { label: 'SLFRS 9 Credit Impairment',     floors: ['stage3_ratio'] },
  FATF:    { label: 'FATF / Financial Crime',        floors: ['str_filing_days', 'kyc_gap_pct'] },
  LargeEx: { label: 'CBSL Large Exposures',          floors: ['single_obligor', 'connected_group'] },
};
