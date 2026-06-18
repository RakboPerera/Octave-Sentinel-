# Sentinel — Change Map (keep these in lockstep)

A single "agent" is defined in **~13 places**. When you change one, the others usually must change too. The biggest source of bugs in this codebase has been changing one part and silently leaving the rest out of step (orphaned "Isolation Forest" labels, mismatched explainability trails, a dropped `findingIndex`).

**The guard:** `cd frontend && npm run check` runs a headless consistency check and exits non-zero (with the exact file to fix) when the agent roster / thresholds drift. It also runs automatically before every build (the `prebuild` script), so a broken invariant fails the build instead of surfacing as a wrong number in the UI later. `[checked]` below = the check enforces it; `[warned]` = surfaced but non-gating.

---

## Add / rename / remove a detection agent
1. `frontend/src/utils/detectionEngine.js` — the `D` detector map (logic) **+ `DETECTOR_META`** (how it detects). `[checked: detector ⇒ meta; coverage guardrail]`
2. `frontend/src/data/thresholdRegistry.js` — its threshold rules block. `[checked: meta-named thresholds must exist + bounds]`
3. `frontend/src/data/agentMeta.js` — identity (name / role / colour / icon / domains). `[checked: every detector needs an entry]`
4. `frontend/src/data/domainRegistry.js` — which business domain(s) it feeds.
5. `frontend/src/utils/liveRun.js` — `SOURCE_SYSTEM` data-lake source label. `[checked: every detector needs an entry]`
6. `frontend/src/utils/trailGenerator.js` — `DATA_SOURCES` (csv + fields for the explainability trail). `[warned if missing]`
7. `frontend/src/pages/BusinessView/BusinessDataHub.jsx` — `AGENTS` source tile (schema/columns shown to users). `[warned if missing]`
8. `frontend/src/data/syntheticPortfolio.js` — `gens` realistic-data generator (if it should get a generated dataset). `[warned: orphan generator]`
9. `frontend/src/data/demoDatasets.js` — `DEMO_SLOTS` mapping + add the sample CSV under `frontend/src/data/sample-data/`.
10. AI path only (if it has an LLM agent): `backend/prompts/<name>.js` **+ wire it in a `backend/routes/*.js`** + add a `backend/config/agentSchemas.js` output schema. `[checked: no orphan prompt]`

## Add / change a threshold
- `frontend/src/data/thresholdRegistry.js` (knob + bounds + regulatory tag) **AND** actually read it in a detector in `detectionEngine.js`, **OR** tag it in `NON_ENGINE_THRESHOLDS`. `[checked: an unused, untagged knob fails the build — no illusory dials]`

## Change a detector's OUTPUT fields (the finding shape)
- Update everything that reads them: `enrichAgentResult` (prudential metrics), `trailGenerator` (explainability), `BusinessReports` (working paper), `backend/config/agentSchemas.js` (runtime validation), and any view rendering them.

## Retire a method / algorithm name / label
- The label lives in `thresholdRegistry` (knob label/description) **and** `agentMeta.methodology` — and `agentMeta.methodology` is **overridden at runtime by the engine's own `describeDetector`**, so fix the engine's self-description too. (This is exactly how the stale "Isolation Forest" label survived earlier.)

## Regulatory floors / prudential metrics
- A floor in `frontend/src/data/regulatoryFloors.js` must be **produced** by `enrichAgentResult` (detectionEngine) and **consumed** by Compliance / Regulatory Capital. Add it in all three.

## Info-icon help text (prose drift surface — no automated check)
- `help=` / `<InfoHint text=…>` copy describes a metric or chart. If you change what a metric **means or how it's computed**, update its explanation too. The shared `Stat`/`SectionTitle`/`Eyebrow` (`components/shared/ui.jsx`) take a `help` prop; the click popover is `components/business/InfoHint.jsx`.

---

## The one command
```
cd frontend && npm run check     # headless; also runs on `npm run build` via prebuild
```
Exit 1 = drift. The message names the file to fix. To extend coverage, add invariants in `frontend/scripts/consistency-check.mjs`.
