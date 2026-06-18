// ─── TAMPER-EVIDENT AUDIT TRAIL (Phase 2 — gap 6) ───────────────────────────
// The platform's record of who-did-what (threshold changes, case conclusions,
// false-positive dismissals, sign-offs, runs) lived as plain, freely-editable
// localStorage. That is not an audit trail — anyone could rewrite history.
//
// This module maintains an APPEND-ONLY, HASH-CHAINED log: each entry's hash
// covers its own content PLUS the previous entry's hash, so altering or
// deleting any past entry breaks every hash after it. `verifyAuditTrail` recomputes
// the chain and reports the first broken link; `exportAuditTrail` produces a
// portable signed record for the working-paper file. Server persistence is the
// remaining production step — until then this makes tampering DETECTABLE.

import { stableHash } from './detectionEngine.js';

export const GENESIS_HASH = 'GENESIS';

// Compute the canonical hash of an entry's content (everything except `hash`).
function hashEntry(e) {
  return stableHash({
    seq: e.seq, ts: e.ts, actor: e.actor, actor_role: e.actor_role,
    action: e.action, summary: e.summary, payloadHash: e.payloadHash, prevHash: e.prevHash,
  });
}

// Append a new event to the chain. Returns a NEW array (never mutates).
// evt: { actor, actor_role, action, summary, payload?, ts? }
export function chainAppend(trail, evt) {
  const safe = Array.isArray(trail) ? trail : [];
  const prev = safe[safe.length - 1];
  const entry = {
    seq: safe.length,
    ts: evt.ts || new Date().toISOString(),
    actor: evt.actor || 'system',
    actor_role: evt.actor_role || null,
    action: evt.action,
    summary: evt.summary || '',
    payloadHash: stableHash(evt.payload ?? null),
    prevHash: prev ? prev.hash : GENESIS_HASH,
  };
  entry.hash = hashEntry(entry);
  return [...safe, entry];
}

// Recompute the chain and detect tampering. Returns
// { valid, length, brokenAt|null, reason|null }.
export function verifyAuditTrail(trail) {
  const safe = Array.isArray(trail) ? trail : [];
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < safe.length; i++) {
    const e = safe[i];
    if (e.seq !== i) return { valid: false, length: safe.length, brokenAt: i, reason: `sequence mismatch at #${i}` };
    if (e.prevHash !== prevHash) return { valid: false, length: safe.length, brokenAt: i, reason: `broken link at #${i} (prevHash)` };
    if (hashEntry(e) !== e.hash) return { valid: false, length: safe.length, brokenAt: i, reason: `content altered at #${i}` };
    prevHash = e.hash;
  }
  return { valid: true, length: safe.length, brokenAt: null, reason: null };
}

// Portable signed export for the evidence file.
export function exportAuditTrail(trail) {
  const safe = Array.isArray(trail) ? trail : [];
  const verification = verifyAuditTrail(safe);
  return JSON.stringify({
    _sentinelAuditTrail: true,
    exportedAt: new Date().toISOString(),
    entryCount: safe.length,
    headHash: safe.length ? safe[safe.length - 1].hash : GENESIS_HASH,
    verification,
    entries: safe,
  }, null, 2);
}
