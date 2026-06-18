// ─── BACKEND THRESHOLD DEFAULTS ──────────────────────────────────────────────
// CC1: SINGLE SOURCE OF TRUTH. These defaults are no longer hand-maintained here
// — they are DERIVED at module load from frontend/src/data/thresholdRegistry.js,
// which is the canonical registry (it owns the values, bounds, labels, types and
// regulatory citations, and runs its own bounds-vs-default validator on import).
// Both tiers are deployed from the same repo as one Render service (see
// render.yaml: `npm run build:deploy` then `npm start`), so the registry file is
// always present at runtime. This removes the hand-sync step that previously let
// the two copies drift silently.
//
// Each agent block holds the short-form keys used when templating prompt strings
// (e.g. credit.dpd_stage3 → DEFAULTS.credit.dpd_stage3). Prompt functions merge:
// { ...DEFAULTS[agent], ...requestOverrides }.
//
// The registry imports nothing browser- or Vite-specific; if that ever changes,
// the load-time guard below fails fast rather than shipping empty defaults.

import { getDefaults } from '../../frontend/src/data/thresholdRegistry.js';

export const DEFAULTS = getDefaults();

// Fail-fast guard: a registry refactor that broke getDefaults() would otherwise
// yield {} here, making withOverrides() reject every Rule Parameters change and
// every prompt template fall back to bare `${undefined}`. Catch it at boot.
(function assertDefaultsDerived() {
  const agentCount = Object.keys(DEFAULTS).length;
  if (agentCount < 20) {
    throw new Error(`thresholdDefaults: derived DEFAULTS has only ${agentCount} agents — the threshold registry import looks broken.`);
  }
  for (const [agentId, block] of Object.entries(DEFAULTS)) {
    if (!block || typeof block !== 'object' || Object.keys(block).length === 0) {
      throw new Error(`thresholdDefaults: agent "${agentId}" derived no threshold keys from the registry.`);
    }
    for (const [k, v] of Object.entries(block)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error(`thresholdDefaults: ${agentId}.${k} derived a non-numeric default (${JSON.stringify(v)}).`);
      }
    }
  }
})();

// FIX M1: Validate overrides against known defaults before merging.
// Rejects unknown keys (typos) and non-numeric values so the LLM never
// receives a nonsensical threshold configuration.
export function withOverrides(agentId, overrides = {}) {
  const base = DEFAULTS[agentId] || {};
  if (!overrides || typeof overrides !== 'object' || Object.keys(overrides).length === 0) {
    return { ...base };
  }
  const result = { ...base };
  for (const [key, val] of Object.entries(overrides)) {
    if (!(key in base)) {
      throw new Error(`Unknown threshold key "${key}" for agent "${agentId}". Valid keys: ${Object.keys(base).join(', ')}`);
    }
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`Threshold "${key}" for agent "${agentId}" must be a finite number, got ${JSON.stringify(val)}`);
    }
    result[key] = val;
  }
  return result;
}
