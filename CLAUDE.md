# Sentinel by Octave — working notes

Internal-audit platform for a CBSL-regulated bank (client-neutral). React/Vite frontend + Express/Anthropic backend. Detection is a **deterministic rule + transparent-statistics engine**; the LLM only narrates. **Never imply opaque ML / black-box scoring** — every finding must be a transparent rule or statistic grounded in source rows.

## Before changing an agent, a threshold, a detector's output, or data wiring
A single agent is defined in **~13 places that must stay in lockstep** (detector + meta + thresholds + domains + source-system + data-source + Data Hub tile + synthetic generator + sample CSV + backend prompt/route/schema). Changing one without the others is the #1 source of bugs here.

1. **Read `CHANGE-MAP.md`** (repo root) — it lists, per kind of change, the exact files to update together.
2. **Run `cd frontend && npm run check` before you finish.** It's a headless consistency check that exits non-zero with the precise file to fix when the roster/thresholds drift. It also gates the build (`prebuild`), so don't bypass it.

## Verifying changes
- `cd frontend && npm run build` — runs the consistency check, then the Vite build.
- Use the preview tools to smoke-test affected routes; confirm **zero console errors**.
- Detection is computed in code over the full population; the LLM path is optional and only narrates.
