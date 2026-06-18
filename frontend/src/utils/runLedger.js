// Local run ledger — persists composite-score snapshots across Data Hub runs
// so the Compliance quarterly-trend chart populates organically over time.
// Stored under localStorage key 'sentinel_ledger'. Capped at 8 entries.

const LEDGER_KEY = 'sentinel_ledger';
const MAX_ENTRIES = 8;

// Seed defaults — Q1 25 → Q4 25, matches the old hardcoded QUARTERLY_TREND.
// Used on first page load if the ledger is empty.
const SEED = [
  { q: 'Q1 25', cbsl: 78, basel: 92, fatf: 70, aml: 76, sod: 74, composite: 79, seeded: true },
  { q: 'Q2 25', cbsl: 74, basel: 90, fatf: 66, aml: 74, sod: 70, composite: 76, seeded: true },
  { q: 'Q3 25', cbsl: 70, basel: 87, fatf: 60, aml: 69, sod: 66, composite: 73, seeded: true },
  { q: 'Q4 25', cbsl: 68, basel: 84, fatf: 56, aml: 65, sod: 61, composite: 69, seeded: true },
];

// FIX L7: Distinguish "ledger never populated" (key absent → seed) from
// "ledger explicitly cleared" (key present but []). The previous version
// silently re-seeded after clearLedger() because length === 0 was treated as
// "no ledger". Now an explicit empty array is preserved, and only missing /
// unparseable storage returns SEED.
export function readLedger() {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (raw == null) return [...SEED];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...SEED];
    return parsed;
  } catch {
    return [...SEED];
  }
}

// Append a snapshot. If the most recent entry is within the same calendar
// quarter, replace it rather than appending — a second run in the same
// quarter should update, not duplicate.
export function appendSnapshot(snapshot) {
  const existing = readLedger();
  const currentQ = snapshot.q;
  const last = existing[existing.length - 1];

  const next = last && last.q === currentQ && !last.seeded
    ? [...existing.slice(0, -1), { ...snapshot, seeded: false }]
    : [...existing, { ...snapshot, seeded: false }].slice(-MAX_ENTRIES);

  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('Failed to persist ledger snapshot', e);
  }
  return next;
}

// Build a YYYY-Qn label for the current calendar quarter.
export function currentQuarterLabel(date = new Date()) {
  const q = Math.floor(date.getMonth() / 3) + 1;
  const yy = String(date.getFullYear()).slice(-2);
  return `Q${q} ${yy}`;
}

// FIX L7: Write an explicit empty array rather than removing the key, so the
// next readLedger() returns [] (cleared state) instead of re-seeding.
export function clearLedger() {
  try { localStorage.setItem(LEDGER_KEY, '[]'); } catch {}
}

// Overwrite the ledger with a fresh series. Used by the Compliance History
// Seed import path so replaying the import produces an exact 4-row ledger,
// not 4 rows appended on top of the seeded defaults.
export function replaceLedger(entries) {
  const cleaned = (entries || []).slice(-MAX_ENTRIES).map(e => ({ ...e, seeded: false }));
  try { localStorage.setItem(LEDGER_KEY, JSON.stringify(cleaned)); } catch {}
  return cleaned;
}
