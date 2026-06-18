// ─── DATA QUALITY REPORT (Wave 4) ────────────────────────────────────────────
// Runs lightweight row-level checks after a CSV is parsed in BusinessDataHub.
// A CAE can't defend agent findings if the upstream data had silent defects,
// so each upload now produces a summary the user sees before running the
// agent:
//   • row count (accepted / rejected / capped)
//   • per-column completeness
//   • type-coercion warnings (e.g. amount fields with non-numeric values)
//   • basic range / value warnings (e.g. negative DPD, out-of-range stages)
//
// Deliberately simple — this is a data sanity check, not a full profiling
// tool.

// Column-level validator hints keyed by agent id. These mirror the schema
// descriptions in BusinessDataHub's AGENTS array but as machine-checkable
// rules. Unknown agents just get completeness checks.
const AGENT_VALIDATORS = {
  credit: {
    numeric: ['exposure_lkr', 'dpd_days', 'collateral_ratio', 'restructure_count', 'anomaly_score'],
    enum: { assigned_stage: ['1', '2', '3', 1, 2, 3], override_flag: ['true', 'false', true, false, '1', '0', 1, 0, 'yes', 'no', 'y', 'n'] },
    range: { dpd_days: { min: 0, max: 3650 }, collateral_ratio: { min: 0, max: 5 }, exposure_lkr: { min: 0 } },
  },
  transaction: {
    numeric: ['amount_lkr'],
    range: { amount_lkr: { min: 0 } },
  },
  suspense: {
    numeric: ['balance_lkr', 'aging_days', 'inflow_lkr_30d', 'outflow_lkr_30d'],
    range: { aging_days: { min: 0, max: 1825 }, balance_lkr: { min: 0 } },
  },
  kyc: {
    enum: { pep_flag: ['true', 'false', true, false, '1', '0', 'yes', 'no'] },
  },
  controls: {
    enum: { override_flag: ['true', 'false', true, false, '1', '0', 'yes', 'no'] },
  },
  capital: {
    numeric: ['tier1_lkr', 'tier2_lkr', 'rwa_lkr', 'hqla_lkr', 'net_cash_outflows_30d_lkr'],
    range: { rwa_lkr: { min: 0 }, hqla_lkr: { min: 0 } },
  },
  alm: {
    numeric: ['rate_sensitive_assets_lkr', 'rate_sensitive_liabilities_lkr', 'gap_lkr', 'eve_sensitivity_bps'],
  },
  collateral: {
    numeric: ['valuation_lkr', 'ltv_ratio'],
    range: { ltv_ratio: { min: 0, max: 3 }, valuation_lkr: { min: 0 } },
  },
  connectedParty: {
    numeric: ['aggregate_exposure_lkr'],
    range: { aggregate_exposure_lkr: { min: 0 } },
  },
};

// Produce a structured QA report.
//   rows    — array of row objects (already parsed from CSV)
//   required — required column names from the agent schema (post-mapping)
//   agentId — for validator lookup
export function buildDataQualityReport({ rows, required = [], agentId }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      total_rows: 0,
      accepted_rows: 0,
      rejected_rows: 0,
      completeness: {},
      warnings: [{ level: 'error', text: 'No rows after parse.' }],
      generated_at: new Date().toISOString(),
    };
  }

  const validator = AGENT_VALIDATORS[agentId] || {};
  const completeness = {};
  const warnings = [];
  let rejected = 0;

  // Initialise completeness counters for every column we encounter + the required list.
  const columns = new Set(required);
  for (const r of rows) for (const c of Object.keys(r)) columns.add(c);
  for (const c of columns) completeness[c] = { present: 0, missing: 0 };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    let rowRejected = false;

    for (const c of columns) {
      const v = row[c];
      if (v == null || v === '') completeness[c].missing++;
      else completeness[c].present++;
    }

    for (const r of required) {
      const v = row[r];
      if (v == null || v === '') rowRejected = true; // missing required field
    }

    // Numeric coercion checks (warning only — we don't reject)
    for (const field of validator.numeric || []) {
      const v = row[field];
      if (v == null || v === '') continue;
      const num = Number(v);
      if (!Number.isFinite(num)) {
        warnings.push({ level: 'warn', row: i + 2, text: `Column ${field} is non-numeric at row ${i + 2}: "${v}"` });
      }
    }

    // Range checks
    for (const [field, rng] of Object.entries(validator.range || {})) {
      const v = row[field];
      if (v == null || v === '') continue;
      const num = Number(v);
      if (!Number.isFinite(num)) continue; // already warned above
      if (rng.min != null && num < rng.min) warnings.push({ level: 'warn', row: i + 2, text: `${field} ${num} below expected minimum ${rng.min} at row ${i + 2}` });
      if (rng.max != null && num > rng.max) warnings.push({ level: 'warn', row: i + 2, text: `${field} ${num} above expected maximum ${rng.max} at row ${i + 2}` });
    }

    // Enum checks
    for (const [field, allowed] of Object.entries(validator.enum || {})) {
      const v = row[field];
      if (v == null || v === '') continue;
      if (!allowed.includes(v) && !allowed.includes(String(v).toLowerCase())) {
        warnings.push({ level: 'warn', row: i + 2, text: `${field} has unexpected value "${v}" at row ${i + 2} — expected one of ${allowed.slice(0, 6).join(', ')}` });
      }
    }

    if (rowRejected) rejected++;
  }

  // Summarise column completeness into % for the report.
  const completenessPct = {};
  for (const [c, { present, missing }] of Object.entries(completeness)) {
    const total = present + missing;
    completenessPct[c] = total > 0 ? Math.round((present / total) * 100) : 0;
  }

  // Cap warnings so the UI doesn't explode for a dirty dataset.
  // FIX M9: keep the pre-truncation warn count separate from the display
  // array so the upload-audit log records the true number of warnings, not
  // just the displayed slice.
  const warnCountTotal = warnings.filter(w => w.level === 'warn').length;
  const trimmedWarnings = warnings.slice(0, 50);
  if (warnings.length > 50) trimmedWarnings.push({ level: 'info', text: `+${warnings.length - 50} more warnings truncated from display.` });

  return {
    ok: rejected === 0 && warnings.filter(w => w.level === 'error').length === 0,
    total_rows: rows.length,
    accepted_rows: rows.length - rejected,
    rejected_rows: rejected,
    completeness: completenessPct,
    warnings: trimmedWarnings,
    warning_count_total: warnCountTotal,
    generated_at: new Date().toISOString(),
  };
}

// ─── UPLOAD AUDIT LOG ────────────────────────────────────────────────────────
// In-session log of every CSV upload so a CAE can see what flowed into which
// agent in this working session. Persists to localStorage so a refresh
// doesn't nuke the provenance trail.
const LOG_KEY = 'sentinel.upload_audit_log.v1';
const MAX_ENTRIES = 50;

export function appendUploadLogEntry({ agentId, filename, report }) {
  const entry = {
    id: `${agentId}::${Date.now()}`,
    agentId,
    filename,
    timestamp: new Date().toISOString(),
    total_rows: report.total_rows,
    accepted_rows: report.accepted_rows,
    rejected_rows: report.rejected_rows,
    // FIX M9: prefer the pre-truncation count when present; the warnings array
    // is capped at 50 entries by buildDataQualityReport for UI rendering.
    warning_count: report.warning_count_total ?? (report.warnings || []).filter(w => w.level === 'warn').length,
    ok: report.ok,
  };
  const existing = readUploadLog();
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  try { localStorage.setItem(LOG_KEY, JSON.stringify(updated)); } catch {}
  return entry;
}

export function readUploadLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearUploadLog() {
  try { localStorage.removeItem(LOG_KEY); } catch {}
}
