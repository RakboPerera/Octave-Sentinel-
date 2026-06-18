// ─── ENTITY-LEVEL EXPOSURE DEDUP (Wave 2) ────────────────────────────────────
// When the same entity (SUS-017, BNK-CORP-0887, BR-14, etc.) is flagged by
// multiple agents, naively summing `affected_exposure_lkr` across findings
// inflates the portfolio view — the same LKR is counted once per agent.
// This util does a canonical-entity dedup so rollups (Command Centre tile,
// BusinessReports, BusinessRiskRegister, Board pack) show the true
// at-risk exposure and not the sum of agent perspectives on it.
//
// Rule: if two findings share at least one entity_id and either (a) the
// same first entity_id, or (b) mention the same branch + same customer_id,
// we treat the larger of their exposures as the canonical exposure and the
// smaller as redundant for rollup purposes. Per-agent findings remain
// visible — the dedup is applied ONLY when summing for exposure totals.

// FIX M5: Expanded to cover alternate branch-code conventions used in Demo Bank data
// (BR-, BRANCH-, BRN-, B-). Keep case-insensitive.
const BRANCH_PREFIX_RE = /^(BR|BRANCH|BRN|B)-/i;

// Canonical key: the first entity_id that isn't a branch code. Branch-only
// findings (e.g. SoD violations at BR-14 in aggregate) key on the branch.
function canonicalKey(finding) {
  const ids = extractEntityIds(finding);
  if (ids.length === 0) return null;
  const nonBranch = ids.find(id => !BRANCH_PREFIX_RE.test(id));
  return nonBranch || ids[0];
}

function extractEntityIds(f) {
  const raw = f.finding || f;
  const declared = Array.isArray(raw.entity_ids) ? raw.entity_ids : [];
  const inferred = [
    raw.loan_id, raw.customer_id, raw.account_id, raw.branch_code,
    raw.user_id, raw.vendor_id, raw.collateral_id, raw.lc_id,
    raw.group_id, raw.staff_id, raw.entry_id,
    // FIX H-3: Phase 2 agent entity fields missing — dedup was broken for
    // staffAccess (subject_id), wealth (rm_code), and conduct (case_id).
    raw.subject_id, raw.rm_code, raw.case_id,
  ].filter(Boolean);
  return [...new Set([...declared, ...inferred].filter(Boolean).map(String))];
}

// FIX M4: Canonical exposure extractor used everywhere a finding's monetary
// magnitude is read. Different agents emit different field names — keep all
// known aliases in one place so rollups, dedup, and per-domain totals stay in
// sync. Accepts either a wrapper { finding: {...} } (from collectFindings) or
// the raw finding object itself.
export function extractExposure(f) {
  if (!f) return 0;
  const r = f.finding || f;
  const e = r.affected_exposure_lkr ?? r.affected_balance_lkr ?? r.exposure_lkr ?? r.aggregate_exposure_lkr ?? 0;
  return Number.isFinite(e) ? e : 0;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
// Returns the total exposure across findings with entity-level dedup applied.
// Two findings that reference the same canonical entity only contribute the
// larger of the two exposures.
export function dedupedExposureTotal(findings) {
  if (!Array.isArray(findings) || findings.length === 0) return 0;

  const byEntity = new Map();
  let orphanSum = 0;

  for (const f of findings) {
    const key = canonicalKey(f);
    const exp = extractExposure(f);
    if (!key) {
      // No canonical entity — fall through and count it (no risk of dedup).
      orphanSum += exp;
      continue;
    }
    const existing = byEntity.get(key) || 0;
    if (exp > existing) byEntity.set(key, exp);
  }

  let entitySum = 0;
  for (const v of byEntity.values()) entitySum += v;
  return entitySum + orphanSum;
}

// Returns a breakdown showing which entities are double-counted so callers
// can render a transparency note ("3 entities appear in 2+ agents — largest
// exposure retained per entity to avoid over-stating risk"). Handy for the
// Board pack and audit workpapers.
export function dedupedExposureBreakdown(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return { total: 0, unique_entities: 0, multi_agent_entities: 0, overlaps: [] };
  }

  const byEntity = new Map(); // key -> { exposure_max, agents:Set, findings_count }
  let orphanSum = 0;
  let orphanCount = 0;

  for (const f of findings) {
    const key = canonicalKey(f);
    const exp = extractExposure(f);
    const agentId = f.agentId || f.agent || 'unknown';

    // FIX M6: Warn when exposure field exists but is non-finite so silent
    // zero-exposure rollups are visible in the console.
    const r = f.finding || f;
    const rawExp = r.affected_exposure_lkr ?? r.affected_balance_lkr ?? r.exposure_lkr ?? r.aggregate_exposure_lkr;
    if (rawExp != null && !Number.isFinite(rawExp)) {
      console.warn(`exposureDedup: non-finite exposure in "${agentId}" finding (got ${rawExp}). Treated as 0.`, f);
    }

    if (!key) {
      orphanSum += exp;
      orphanCount++;
      continue;
    }
    const entry = byEntity.get(key) || { exposure_max: 0, agents: new Set(), findings_count: 0 };
    entry.exposure_max = Math.max(entry.exposure_max, exp);
    entry.agents.add(agentId);
    entry.findings_count++;
    byEntity.set(key, entry);
  }

  const overlaps = [];
  let entitySum = 0;
  let multiAgentCount = 0;
  for (const [key, entry] of byEntity.entries()) {
    entitySum += entry.exposure_max;
    if (entry.agents.size > 1) {
      multiAgentCount++;
      overlaps.push({
        entity: key,
        exposure_lkr: entry.exposure_max,
        agents: [...entry.agents],
        findings_count: entry.findings_count,
      });
    }
  }

  overlaps.sort((a, b) => b.exposure_lkr - a.exposure_lkr);
  return {
    total: entitySum + orphanSum,
    unique_entities: byEntity.size + orphanCount,
    multi_agent_entities: multiAgentCount,
    overlaps,
  };
}

// Canonical entity extraction exposed for callers that need per-entity
// rollups (Risk Register, case manager cross-references).
export function canonicalEntityOf(finding) {
  return canonicalKey(finding);
}
