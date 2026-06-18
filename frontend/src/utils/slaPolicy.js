// ─── SLA POLICY (Wave 5 #4) ──────────────────────────────────────────────────
// Case Manager SLA was hard-coded at `critical: 3, high: 7, medium: 14` in
// BusinessCaseManager.jsx. The review flagged this as an ISA 330 gap:
// compliance findings (FTRA 5-day STR; CBSL 48h single-obligor) need a
// 1–2 day SLA, not 3. This module turns the SLA into a domain × severity
// policy table that lives on the Audit Plan and is snapshotted at sign-off.
//
// CC3: SLA day counts are WORKING days (FTRA "5 working days"), not calendar
// days. Breach is decided on working days elapsed (see workingDaysBetween /
// slaStatusWorkingDays below); the raw calendar age is still shown to the user.
//
// Shape of state.auditPlan.slaPolicy:
//   {
//     [domainId]: { critical: 2, high: 5, medium: 10, low: 21 },
//     ...
//     default: { critical: 3, high: 7, medium: 14, low: 21 }
//   }

export const SEVERITIES = ['critical', 'high', 'medium', 'low'];

// Domain-aware default that reflects the regulatory urgency of each domain.
// Compliance domain is tightest because of FTRA STR + CBSL notification
// deadlines; operations and people are the most forgiving.
export const DEFAULT_SLA_POLICY = {
  default:     { critical: 3, high: 7,  medium: 14, low: 21 },
  consumer:    { critical: 3, high: 7,  medium: 14, low: 21 },
  commercial:  { critical: 3, high: 7,  medium: 14, low: 21 },
  corporate:   { critical: 2, high: 5,  medium: 10, low: 21 },
  treasury:    { critical: 2, high: 5,  medium: 10, low: 21 },
  risk:        { critical: 2, high: 5,  medium: 10, low: 21 },
  compliance:  { critical: 1, high: 3,  medium: 7,  low: 14 },  // FTRA 5-day STR / CBSL 48h notifications
  finance:     { critical: 2, high: 5,  medium: 10, low: 21 },
  operations:  { critical: 3, high: 7,  medium: 14, low: 21 },
  technology:  { critical: 2, high: 5,  medium: 10, low: 21 },
  audit:       { critical: 3, high: 7,  medium: 14, low: 21 },
  people:      { critical: 3, high: 10, medium: 21, low: 30 },
};

// Resolve the SLA (in days) for a given case — picks the TIGHTEST applicable
// domain policy, with fallback to default. A multi-domain case uses the
// minimum SLA across its domains (the most stringent wins).
export function resolveCaseSla(caseObj, policy) {
  const p = policy || DEFAULT_SLA_POLICY;
  const severity = (caseObj.severity || 'medium').toLowerCase();
  const domainIds = caseObj.domainIds || (caseObj.domainId ? [caseObj.domainId] : []);
  const candidates = [];
  for (const d of domainIds) {
    const domainPolicy = p[d] || null;
    if (domainPolicy && domainPolicy[severity] != null) candidates.push(domainPolicy[severity]);
  }
  if (candidates.length === 0) {
    const fallback = p.default || DEFAULT_SLA_POLICY.default;
    return fallback[severity] ?? DEFAULT_SLA_POLICY.default[severity] ?? 14;
  }
  return Math.min(...candidates);
}

// Compute ageing bucket. Used by the ageing/SLA board in Case Manager.
export const AGEING_BUCKETS = [
  { id: 'fresh',     label: '< 3 days',    min: 0,   max: 3 },
  { id: 'near-sla',  label: '3–7 days',    min: 3,   max: 7 },
  { id: 'past-sla',  label: '7–14 days',   min: 7,   max: 14 },
  { id: 'stale',     label: '14–30 days',  min: 14,  max: 30 },
  { id: 'critical-stale', label: '30+ days', min: 30, max: Infinity },
];

// FIX M10: Return 'unknown' for unparseable input — using 'fresh' implies a
// healthy state and would mask cases that have no recorded age.
export function bucketForAge(days) {
  if (days == null || !Number.isFinite(days)) return 'unknown';
  if (days < 0) return 'unknown';
  for (const b of AGEING_BUCKETS) {
    if (days >= b.min && days < b.max) return b.id;
  }
  return 'critical-stale';
}

// SLA breach classification — for the ageing board colour / escalation.
//   green : within SLA
//   amber : > SLA but ≤ 2× SLA
//   red   : > 2× SLA  (requires EXCO escalation per the severity rules)
// `daysInStatus` should be WORKING days (use workingDaysBetween) so the band
// lines up with the working-day SLA thresholds.
export function slaStatus(daysInStatus, slaDays) {
  if (daysInStatus == null || !Number.isFinite(daysInStatus)) return 'unknown';
  if (daysInStatus <= slaDays) return 'green';
  if (daysInStatus <= slaDays * 2) return 'amber';
  return 'red';
}

// ─── WORKING-DAY SLA COMPUTATION (CC3) ───────────────────────────────────────
// FTRA "5 working days" / CBSL notification deadlines are WORKING-day windows.
// Counting raw calendar days overstates urgency (a Friday-opened critical looks
// breached by Monday) and misrepresents the regulatory clock, so SLA breach is
// decided on working days elapsed. The raw calendar age is still shown to users
// ("opened 6d ago") because that's what they intuitively expect.
//
// Saturdays and Sundays are always non-working. Sri Lanka public/bank holidays
// vary year to year and most are lunar (monthly Poya days, Vesak, Sinhala &
// Tamil New Year, Eid, Deepavali, Good Friday); we deliberately DO NOT ship a
// built-in lunar calendar, because a wrong holiday date is worse than none for a
// regulatory deadline. The three fixed-date national holidays that recur every
// year are included as 'MM-DD' rules; pass the full CBSL gazetted bank-holiday
// list via `holidays` (a Set mixing recurring 'MM-DD' and specific 'YYYY-MM-DD'
// strings) to make the count gazette-exact. Refresh the gazette list annually.
export const SL_FIXED_HOLIDAYS = new Set([
  '02-04', // National (Independence) Day
  '05-01', // May Day / International Workers' Day
  '12-25', // Christmas Day
]);

function pad2(n) { return n < 10 ? `0${n}` : `${n}`; }

// True if `date` (a Date) is a Sri Lanka working day. `holidays` may contain
// recurring 'MM-DD' rules and/or specific 'YYYY-MM-DD' dates.
export function isWorkingDay(date, holidays = SL_FIXED_HOLIDAYS) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false; // Sunday / Saturday
  if (holidays && holidays.size) {
    const mmdd = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    if (holidays.has(mmdd) || holidays.has(`${date.getFullYear()}-${mmdd}`)) return false;
  }
  return true;
}

// Whole working days elapsed strictly AFTER the start instant, up to and
// including the end instant's date. The start day itself is day 0 (matches
// "within N working days of opening"). Returns null on unparseable input, 0 when
// end <= start.
export function workingDaysBetween(startMs, endMs, holidays = SL_FIXED_HOLIDAYS) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs <= startMs) return 0;
  const cur = new Date(startMs); cur.setHours(0, 0, 0, 0);
  const end = new Date(endMs);   end.setHours(0, 0, 0, 0);
  let count = 0;
  // Hard cap the loop at ~10 years of days as a runaway guard.
  for (let i = 0; i < 3700 && cur < end; i++) {
    cur.setDate(cur.getDate() + 1);
    if (isWorkingDay(cur, holidays)) count++;
  }
  return count;
}

// SLA status decided on WORKING days. openedAtMs / asOfMs are epoch milliseconds.
export function slaStatusWorkingDays(openedAtMs, asOfMs, slaWorkingDays, holidays = SL_FIXED_HOLIDAYS) {
  const wd = workingDaysBetween(openedAtMs, asOfMs, holidays);
  if (wd == null) return 'unknown';
  return slaStatus(wd, slaWorkingDays);
}
