// ─── DOMAIN DATA HOOKS ───────────────────────────────────────────────────────
// Thin convenience hooks around the pure selectors in domainAggregations.js.
// Reactive to changes in state.agentResults so uploaded-data reruns flow
// through to Business Platform automatically.

import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { demoData } from '../data/demoData.js';
import { collectFindings } from '../utils/domainTagging.js';
import {
  resolveResults,
  computeDomainSnapshot,
  computeCoverageMatrix,
  collectCorrelationsForDomain,
  computeBankScale,
} from '../utils/domainAggregations.js';
import { extractExposure } from '../utils/exposureDedup.js';
import { captureLossEvents, summariseLossEvents } from '../utils/lossEventCapture.js';

// Unified results (live overrides demo)
export function useResolvedResults() {
  const { state } = useApp();
  return useMemo(() => resolveResults(state.agentResults, demoData), [state.agentResults]);
}

// Audit-plan materiality (ISA 320). Returns null fields when not yet set.
export function useAuditPlanMateriality() {
  const { state } = useApp();
  const plan = state.auditPlan || {};
  return useMemo(() => ({
    performanceMateriality: Number(plan.materiality) > 0 ? Number(plan.materiality) : null,
    tolerableMisstatement: Number(plan.tolerableMisstatement) > 0 ? Number(plan.tolerableMisstatement) : null,
  }), [plan.materiality, plan.tolerableMisstatement]);
}

// FIX M4: extractExposure is imported from utils/exposureDedup so every
// consumer (dedup, rollups, materiality comparisons) uses the same alias list.

// All findings across all agents, with domain tags and materiality-adjusted severity.
// If the auditor has set performance materiality / tolerable misstatement on the
// Audit Plan page, severity is escalated for findings whose exposure breaches
// materiality and de-escalated for findings below tolerable misstatement.
// This makes every downstream consumer (heatmap, residual risk, case counts,
// compliance scoring, risk register) reflow when those values change.
export function useAllFindings() {
  const results = useResolvedResults();
  const { performanceMateriality, tolerableMisstatement } = useAuditPlanMateriality();

  return useMemo(() => {
    const raw = collectFindings(results);
    if (performanceMateriality == null && tolerableMisstatement == null) return raw;

    return raw.map(f => {
      const exposure = extractExposure(f);
      let sev = (f.severity || 'medium').toLowerCase();
      const originalSeverity = sev;
      let adjustment = null;

      // Escalate if exposure meets performance materiality — ISA 320 treats
      // these as material misstatements that cannot go uncorrected.
      if (performanceMateriality != null && exposure >= performanceMateriality) {
        if (sev === 'medium') { sev = 'high';     adjustment = 'escalated_materiality'; }
        else if (sev === 'high')   { sev = 'critical'; adjustment = 'escalated_materiality'; }
      }
      // De-emphasise findings that sit below tolerable misstatement — these
      // do not individually reach the threshold that warrants the current tier.
      else if (tolerableMisstatement != null && exposure > 0 && exposure < tolerableMisstatement) {
        if (sev === 'critical')    { sev = 'high';   adjustment = 'deescalated_tolerable'; }
        else if (sev === 'high')   { sev = 'medium'; adjustment = 'deescalated_tolerable'; }
      }

      if (!adjustment) return f;
      return { ...f, severity: sev, originalSeverity, materialityAdjustment: adjustment, exposureLkr: exposure };
    });
  }, [results, performanceMateriality, tolerableMisstatement]);
}

// Per-domain snapshot (KPIs, severity counts, exposure, coverage %)
export function useDomainSnapshot(domainId) {
  const allFindings = useAllFindings();
  const { state } = useApp();
  const auditPlan = state.auditPlan;
  return useMemo(
    () => computeDomainSnapshot(domainId, allFindings, auditPlan),
    [domainId, allFindings, auditPlan]
  );
}

// Per-domain findings — filtered list with domain-specific ordering
export function useDomainFindings(domainId) {
  const allFindings = useAllFindings();
  return useMemo(() => {
    const list = allFindings.filter(f => f.domainTags.includes(domainId));
    // Sort: criticals first, then high, then medium, then by agent alphabetically
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return list.sort((a, b) => {
      const sA = sevOrder[(a.severity || 'medium').toLowerCase()] ?? 9;
      const sB = sevOrder[(b.severity || 'medium').toLowerCase()] ?? 9;
      if (sA !== sB) return sA - sB;
      if (a.isKeyFinding !== b.isKeyFinding) return a.isKeyFinding ? -1 : 1;
      return a.agentId.localeCompare(b.agentId);
    });
  }, [domainId, allFindings]);
}

// Coverage matrix for the "What Sentinel is watching" section
export function useCoverageMatrix(domainId) {
  const allFindings = useAllFindings();
  return useMemo(() => computeCoverageMatrix(domainId, allFindings), [domainId, allFindings]);
}

// Correlations touching this domain
export function useDomainCorrelations(domainId) {
  const { state } = useApp();
  const allFindings = useAllFindings();
  return useMemo(
    () => collectCorrelationsForDomain(domainId, allFindings, state.cases),
    [domainId, allFindings, state.cases]
  );
}

// Bank-wide scale (for the landing ribbon)
export function useBankScale() {
  const results = useResolvedResults();
  return useMemo(() => computeBankScale(results), [results]);
}

// Loss Event Capture — post-processor over the full findings population.
// Returns { events, summary } derived deterministically from agent findings
// and the loss-given-event profile registered per agent.
export function useLossEvents() {
  const allFindings = useAllFindings();
  return useMemo(() => {
    const events = captureLossEvents(allFindings);
    return { events, summary: summariseLossEvents(events) };
  }, [allFindings]);
}
