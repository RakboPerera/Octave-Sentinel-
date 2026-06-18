#!/usr/bin/env node
// ─── CONSISTENCY CHECK ───────────────────────────────────────────────────────
// One command that flags when a change to "the agents" (or thresholds) has left
// the ~13 places that define an agent out of step. Run via `npm run check`; it
// also runs automatically before every build (the `prebuild` script), so drift
// fails FAST with a precise message instead of surfacing as a wrong number /
// white-screen in the UI later.
//
// HOW IT WORKS
//   1. IMPORT the cleanly node-importable registries. Importing them also
//      EXECUTES their load-time self-checks (detectionEngine: every detector has
//      DETECTOR_META, meta-named thresholds exist, the coverage guardrail; and
//      thresholdRegistry: bounds) — so those fire headlessly here too.
//   2. TEXT-SCAN the modules that can't be imported in node (JSX, or anything
//      that transitively uses import.meta.glob) for their agent-id key sets.
//   3. Assert the cross-registry invariants. ERRORs fail the build; WARNs are
//      reported but don't gate (softer couplings).
//
// WHEN YOU ADD/RENAME/REMOVE AN AGENT and this fails, the message names exactly
// which file still needs the matching change. See ../../CHANGE-MAP.md.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src');
const BACKEND = resolve(__dirname, '../../backend');

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
const read = (p) => readFileSync(p, 'utf8');

// Extract the balanced block of text starting at `marker` (open/close chars).
function block(src, marker, open = '{', close = '}') {
  const i = src.indexOf(marker);
  if (i < 0) return '';
  let depth = 0, start = -1;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === open) { if (depth === 0) start = j + 1; depth++; }
    else if (c === close) { depth--; if (depth === 0) return src.slice(start, j); }
  }
  return '';
}
// Top-level `key:` identifiers inside an object-literal block (ignores nested
// keys by tracking brace/bracket depth; values here are strings or shallow objects).
function topKeys(blockText) {
  let d = 0, out = [];
  for (let i = 0; i < blockText.length; i++) {
    const c = blockText[i];
    if (c === '{' || c === '[') d++;
    else if (c === '}' || c === ']') d--;
    else if (d === 0) {
      const m = /^([A-Za-z_$][\w$]*|'[^']+'|"[^"]+")\s*:/.exec(blockText.slice(i));
      if (m) { out.push(m[1].replace(/['"]/g, '')); i += m[0].length - 1; }
    }
  }
  return out;
}

// ─── 1. IMPORT pure registries (runs their load-time guardrails) ──────────────
let DETECTOR_AGENTS = [], AGENT_META = {}, getDefaults = null;
try {
  const eng = await import(new URL('../src/utils/detectionEngine.js', import.meta.url).href);
  DETECTOR_AGENTS = eng.DETECTOR_AGENTS || Object.keys(eng.DETECTOR_META || {});
} catch (e) {
  err(`detectionEngine.js failed to import / its load-time self-check threw:\n    ${e.message}`);
}
try {
  const tr = await import(new URL('../src/data/thresholdRegistry.js', import.meta.url).href);
  getDefaults = tr.getDefaults;
} catch (e) {
  err(`thresholdRegistry.js failed to import / bounds validator threw:\n    ${e.message}`);
}
try {
  const am = await import(new URL('../src/data/agentMeta.js', import.meta.url).href);
  AGENT_META = am.AGENT_META || {};
} catch (e) {
  err(`agentMeta.js failed to import:\n    ${e.message}`);
}

const detectors = new Set(DETECTOR_AGENTS);
if (!detectors.size) err('Could not determine the detector roster (DETECTOR_AGENTS empty).');

// ─── 2. TEXT-SCAN the non-importable modules for their agent-id sets ──────────
const sourceSystem = new Set(topKeys(block(read(resolve(SRC, 'utils/liveRun.js')), 'SOURCE_SYSTEM = {')));
const dataSources  = new Set(topKeys(block(read(resolve(SRC, 'utils/trailGenerator.js')), 'DATA_SOURCES = {')));
// gens is a shorthand object: `const gens = { credit, transaction, ... }`
const gensBlock = block(read(resolve(SRC, 'data/syntheticPortfolio.js')), 'const gens = {');
const gens = new Set(gensBlock.split(',').map(s => s.trim()).filter(s => /^[A-Za-z_$][\w$]*$/.test(s)));
// DataHub AGENTS: array of objects, each with `id: '...'`
const agentsArr = block(read(resolve(SRC, 'pages/BusinessView/BusinessDataHub.jsx')), 'const AGENTS = [', '[', ']');
const dataHubTiles = new Set([...agentsArr.matchAll(/\bid:\s*['"]([\w]+)['"]/g)].map(m => m[1]));

// Backend: prompt files vs route wiring
let promptFiles = [];
try { promptFiles = readdirSync(resolve(BACKEND, 'prompts')).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, '')); } catch { /* backend optional */ }
// A prompt may be wired by ANY route file (agents.js, orchestrator.js, …) or server.js.
const backendWiringSrc = (() => {
  try {
    const routeFiles = readdirSync(resolve(BACKEND, 'routes')).filter(f => f.endsWith('.js')).map(f => read(resolve(BACKEND, 'routes', f)));
    let serverSrc = ''; try { serverSrc = read(resolve(BACKEND, 'server.js')); } catch { /* ok */ }
    return routeFiles.join('\n') + '\n' + serverSrc;
  } catch { return ''; }
})();

// ─── 3. INVARIANTS ────────────────────────────────────────────────────────────
// ERROR: every detector must have identity + a source-system label.
for (const a of detectors) {
  if (!(a in AGENT_META)) err(`agent "${a}" has a detector (detectionEngine.D) but NO entry in data/agentMeta.js (AGENT_META) — add its identity (name/role/colour/domains).`);
  if (sourceSystem.size && !sourceSystem.has(a)) err(`agent "${a}" has a detector but is MISSING from SOURCE_SYSTEM in utils/liveRun.js — add its data-lake source name.`);
}
// ERROR: no orphan prompt (a backend prompt no route/server ever wires in).
if (promptFiles.length && backendWiringSrc) {
  for (const p of promptFiles) {
    if (!backendWiringSrc.includes(p)) err(`backend/prompts/${p}.js exists but is not referenced by any backend route or server.js — wire it in or delete the orphan prompt.`);
  }
}
// WARN: softer couplings (covered indirectly elsewhere, but worth surfacing).
for (const a of detectors) {
  if (dataSources.size && !dataSources.has(a)) warn(`agent "${a}" has no entry in trailGenerator DATA_SOURCES — its explainability trail will show "—" for the data source.`);
  if (dataHubTiles.size && !dataHubTiles.has(a)) warn(`agent "${a}" has no Data Hub source tile (BusinessDataHub AGENTS) — users can't see/sync its schema.`);
}
// WARN: orphan synthetic generator (generates data no detector consumes directly).
for (const g of gens) {
  if (!detectors.has(g)) warn(`syntheticPortfolio gens has "${g}" which is not a detector id — confirm it's an intentional cross-feed (e.g. sanctions→kyc), else it's an orphan generator.`);
}

// ─── 4. CLIENT-NEUTRALITY GUARD ───────────────────────────────────────────────
// The platform is client-neutral: the bank name is tenant config (bankProfile),
// never hardcoded. Fail if a retired client identity reappears in app source.
// (Add more retired client tokens to RETIRED_CLIENT if you re-skin for a new demo.)
// Case-insensitive: a lowercase "ntb" (e.g. an email domain like ntb.lk) is just
// as much a client leak as "NTB". \b keeps it from matching camelCase substrings
// like agentBlock / dominantBaseline.
const RETIRED_CLIENT = /\bNTB\b|Nations Trust/i;
const scanRoots = [resolve(SRC), resolve(BACKEND, 'prompts'), resolve(BACKEND, 'routes'), resolve(BACKEND, 'config')];
for (const base of scanRoots) {
  let files = [];
  try { files = readdirSync(base, { recursive: true }); } catch { continue; }
  for (const f of files) {
    const rel = String(f);
    if (!/\.(jsx?|csv)$/.test(rel) || rel.includes('node_modules')) continue;
    let txt = ''; try { txt = read(resolve(base, rel)); } catch { continue; }
    if (RETIRED_CLIENT.test(txt)) err(`client-identity leak: ${rel} contains "NTB"/"Nations Trust" — the bank name is tenant config (bankProfile.js), never hardcode the client.`);
  }
}
try { if (RETIRED_CLIENT.test(read(resolve(BACKEND, 'server.js')))) err('client-identity leak: backend/server.js contains "NTB"/"Nations Trust".'); } catch { /* ok */ }

// ─── REPORT ───────────────────────────────────────────────────────────────────
const line = '─'.repeat(64);
console.log(`\n${line}\nSentinel consistency check\n${line}`);
console.log(`Detector roster (${detectors.size}): ${[...detectors].join(', ')}`);
console.log(`agentMeta:${Object.keys(AGENT_META).length}  sourceSystem:${sourceSystem.size}  dataSources:${dataSources.size}  dataHubTiles:${dataHubTiles.size}  gens:${gens.size}  prompts:${promptFiles.length}`);
if (warns.length) { console.log(`\n⚠ ${warns.length} warning(s):`); warns.forEach(w => console.log(`  • ${w}`)); }
if (errors.length) {
  console.log(`\n✗ ${errors.length} error(s):`);
  errors.forEach(e => console.log(`  • ${e}`));
  console.log(`\nFAILED — fix the above (see CHANGE-MAP.md for the lockstep checklist).\n`);
  process.exit(1);
}
console.log(`\n✓ All consistency invariants hold.\n`);
