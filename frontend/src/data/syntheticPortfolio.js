// ─── SYNTHETIC REALISTIC PORTFOLIO (scale demo) ──────────────────────────────
// The illustrative samples are tiny and seeded so EVERYTHING flags — useful to
// show each detector firing, useless for showing the engine DISCRIMINATES. This
// generator produces a large, MOSTLY-CLEAN portfolio (thousands of rows) with a
// small injected-anomaly rate (~2–5%), so true negatives exist and precision,
// FDR, calibration and the charts mean something. Fully deterministic (seeded
// PRNG — no Date/Math.random), so the same scale → byte-identical data.

// mulberry32 — tiny deterministic PRNG.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const chance = (r, p) => r() < p;
const pad = (n, w) => String(n).padStart(w, '0');
// Log-uniform amount — naturally Benford-conforming first digits (clean data
// must NOT trip the Benford test, or every population flags).
const lkr = (r, minExp, maxExp) => Math.round(Math.pow(10, minExp + r() * (maxExp - minExp)));
// A date string `daysAgo` before the as-of (2026-06-15), ISO yyyy-mm-dd.
const AS_OF = Date.parse('2026-06-15');
const dateAgo = (days) => new Date(AS_OF - days * 86400000).toISOString().slice(0, 10);
const tsAgo = (r, maxDays, hourLo = 8, hourHi = 18) => {
  const d = new Date(AS_OF - ri(r, 0, maxDays) * 86400000);
  d.setUTCHours(ri(r, hourLo, hourHi), ri(r, 0, 59), ri(r, 0, 59), 0);
  return d.toISOString().slice(0, 19);
};
const SECTORS = ['Construction', 'Agriculture', 'Consumer', 'SME Manufacturing', 'Wholesale Trade', 'Tourism', 'Services', 'Real Estate'];
const QUARTERS = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'];
const CITIES = ['Colombo', 'Dehiwala', 'Moratuwa', 'Negombo', 'Kandy', 'Galle', 'Kurunegala', 'Gampaha'];

// ── CREDIT — mostly correctly-staged loans; a few understated + one bad vintage.
function credit(r, n) {
  const out = [];
  const badVintage = pick(r, QUARTERS); // one cohort with elevated Stage-3
  for (let i = 0; i < n; i++) {
    const q = pick(r, QUARTERS);
    const anomaly = chance(r, 0.03);
    const badCohort = q === badVintage && chance(r, 0.35);
    let dpd, coll, stage, rc;
    if (anomaly) { dpd = ri(r, 95, 200); coll = +(0.2 + r() * 0.18).toFixed(2); rc = ri(r, 2, 4); stage = 1; } // understated
    else if (badCohort) { dpd = ri(r, 0, 40); coll = +(0.5 + r() * 0.4).toFixed(2); rc = ri(r, 0, 1); stage = 3; } // genuinely NPL in the bad cohort
    else { dpd = ri(r, 0, 25); coll = +(0.72 + r() * 0.6).toFixed(2); rc = chance(r, 0.1) ? 1 : 0; stage = dpd > 20 ? 2 : 1; }
    out.push({ loan_id: `BNK-CR-${pad(i, 5)}`, exposure_lkr: lkr(r, 6, 8.5), assigned_stage: stage, dpd_days: dpd, collateral_ratio: coll, restructure_count: rc, sector: pick(r, SECTORS), branch_code: `BR-${ri(r, 1, 60)}`, override_flag: chance(r, 0.12), origination_quarter: q, customer_risk_rating: ri(r, 1, 5) });
  }
  return out;
}

// ── TRANSACTION — Benford-conforming amounts; rare structuring + hub + velocity.
function transaction(r, n) {
  const out = []; let tid = 0;
  const nAcct = Math.max(40, Math.floor(n / 12));
  const accts = Array.from({ length: nAcct }, (_, i) => `BNK-AC-${pad(i, 5)}`);
  const cps = Array.from({ length: Math.floor(nAcct * 0.8) }, (_, i) => `CP-${pad(i, 5)}`);
  // baseline clean traffic
  for (let i = 0; i < n; i++) {
    out.push({ transaction_id: `TXN-${pad(tid++, 6)}`, account_id: pick(r, accts), amount_lkr: lkr(r, 4, 6.6), transaction_type: pick(r, ['transfer', 'payment', 'deposit', 'withdrawal']), timestamp: tsAgo(r, 90, 0, 23), channel: pick(r, ['online', 'branch', 'atm', 'mobile']), counterparty_account: pick(r, cps), counterparty_bank: pick(r, ['BNK', 'BOC', 'HNB', 'Sampath', 'Commercial']), city: pick(r, CITIES), device_id: `DEV-${ri(r, 1000, 9999)}` });
  }
  // structuring clusters on a few accounts (≥3 sub-5M txns same day summing ≥5M)
  for (let s = 0; s < Math.max(2, Math.floor(nAcct * 0.02)); s++) {
    const a = pick(r, accts), day = ri(r, 1, 80), cp = pick(r, cps);
    const base = new Date(AS_OF - day * 86400000); base.setUTCHours(9, 0, 0, 0);
    for (let k = 0; k < ri(r, 4, 6); k++) { const ts = new Date(base.getTime() + k * 1800000).toISOString().slice(0, 19); out.push({ transaction_id: `TXN-${pad(tid++, 6)}`, account_id: a, amount_lkr: ri(r, 1200000, 1800000), transaction_type: 'transfer', timestamp: ts, channel: 'online', counterparty_account: cp, counterparty_bank: 'BNK', city: 'Colombo', device_id: `DEV-${ri(r, 1000, 9999)}` }); }
  }
  // a collection hub: many accounts → one counterparty
  const hub = 'CP-HUB-9001';
  for (let k = 0; k < Math.max(8, Math.floor(nAcct * 0.25)); k++) out.push({ transaction_id: `TXN-${pad(tid++, 6)}`, account_id: pick(r, accts), amount_lkr: lkr(r, 5, 6.5), transaction_type: 'transfer', timestamp: tsAgo(r, 60, 0, 23), channel: 'online', counterparty_account: hub, counterparty_bank: 'BNK', city: 'Colombo', device_id: `DEV-${ri(r, 1000, 9999)}` });
  return out;
}

// ── KYC — recent CDD, BO disclosed; rare stale/PEP/BO-gap + one bad introducer.
function kyc(r, n) {
  const out = [];
  const introducers = Array.from({ length: 14 }, (_, i) => `INT-${pad(i, 3)}`);
  const badIntro = pick(r, introducers);
  for (let i = 0; i < n; i++) {
    const fromBad = chance(r, 0.05);
    const intro = fromBad ? badIntro : pick(r, introducers);
    const anomaly = (intro === badIntro && chance(r, 0.45)) || chance(r, 0.02);
    out.push({ customer_id: `CUS-${pad(i, 5)}`, risk_rating: ri(r, 1, 5), kyc_last_refresh_date: dateAgo(anomaly ? ri(r, 400, 900) : ri(r, 10, 330)), account_open_date: dateAgo(ri(r, 200, 3000)), pep_flag: chance(r, anomaly ? 0.4 : 0.03), country_of_origin: pick(r, ['LK', 'LK', 'LK', 'IN', 'AE', 'GB']), entity_type: pick(r, ['individual', 'individual', 'corporate']), introducer_code: intro, beneficial_owner_disclosed: anomaly ? chance(r, 0.3) : true, dormant_flag: chance(r, 0.05) });
  }
  return out;
}

// ── CONTROLS — SoD respected, business hours; rare maker=checker + one bad branch.
function controls(r, n) {
  const out = []; const staff = Array.from({ length: 80 }, (_, i) => `STF-${pad(i, 4)}`);
  const badBranch = `BR-${ri(r, 1, 60)}`;
  for (let i = 0; i < n; i++) {
    const branch = chance(r, 0.04) ? badBranch : `BR-${ri(r, 1, 60)}`;
    const onBad = branch === badBranch;
    const init = pick(r, staff);
    let appr = pick(r, staff); if (appr === init) appr = pick(r, staff);
    const sod = chance(r, onBad ? 0.25 : 0.005);
    const override = chance(r, onBad ? 0.6 : 0.08);
    out.push({ transaction_id: `CTL-${pad(i, 6)}`, branch_code: branch, initiator_id: init, approver_id: sod ? init : (onBad && override ? pick(r, staff.slice(0, 2)) : appr), amount_lkr: lkr(r, 5, 7), transaction_type: pick(r, ['loan', 'transfer', 'waiver']), timestamp: tsAgo(r, 90, onBad && chance(r, 0.5) ? 21 : 8, onBad && chance(r, 0.5) ? 23 : 18), override_flag: override, approval_time_minutes: ri(r, 1, 90), customer_id: `CUS-${ri(r, 0, 9999)}`, loan_id: '' });
  }
  return out;
}

// ── DIGITAL — clean sessions; rare high-deviation / MFA-fail / impossible travel.
function digital(r, n) {
  const out = []; const accts = Array.from({ length: Math.floor(n / 3) }, (_, i) => `BNK-${pad(i, 4)}-X`);
  for (let i = 0; i < n; i++) {
    const a = pick(r, accts), anomaly = chance(r, 0.04);
    const mfaTrig = chance(r, 0.2);
    out.push({ session_id: `SES-${pad(i, 6)}`, account_id: a, device_id: `DEV-${ri(r, 1000, 9999)}`, login_city: pick(r, CITIES), behavioral_score: anomaly ? ri(r, 72, 96) : ri(r, 5, 45), timestamp: tsAgo(r, 60, 0, 23), is_registered_device: chance(r, 0.85), mfa_triggered: mfaTrig, mfa_passed: mfaTrig ? !chance(r, anomaly ? 0.7 : 0.05) : true, previous_session_city: pick(r, CITIES), minutes_since_last_session: ri(r, 60, 4000), transaction_count: ri(r, 0, 5), max_transaction_lkr: lkr(r, 3, 6.5) });
  }
  // one true impossible-travel pair (Colombo → Dubai in 40 min)
  const a = pick(r, accts);
  out.push({ session_id: 'SES-IT-A', account_id: a, device_id: 'DEV-7777', login_city: 'Colombo', behavioral_score: 30, timestamp: '2026-05-01T09:00:00', is_registered_device: true, mfa_triggered: false, mfa_passed: true, previous_session_city: '', minutes_since_last_session: 600, transaction_count: 1, max_transaction_lkr: 500000 });
  out.push({ session_id: 'SES-IT-B', account_id: a, device_id: 'DEV-9999', login_city: 'Dubai', behavioral_score: 40, timestamp: '2026-05-01T09:40:00', is_registered_device: false, mfa_triggered: true, mfa_passed: false, previous_session_city: 'Colombo', minutes_since_last_session: 40, transaction_count: 3, max_transaction_lkr: 9500000 });
  return out;
}

// ── MJE — automated/business-hours/non-round; rare maker=checker / round / late.
function mje(r, n) {
  const out = []; const staff = Array.from({ length: 30 }, (_, i) => `STF-${pad(i, 4)}`);
  const GLS = [['4100', 'Interest Income'], ['5200', 'Operating Expenses'], ['1300', 'Suspense'], ['6100', 'Provisions'], ['2200', 'Deposits']];
  for (let i = 0; i < n; i++) {
    const automated = chance(r, 0.6), anomaly = chance(r, 0.04);
    const maker = pick(r, staff); let appr = pick(r, staff); if (appr === maker) appr = pick(r, staff);
    const round = anomaly && chance(r, 0.6);
    const amt = round ? ri(r, 1, 9) * 1000000 : lkr(r, 5, 7.3);
    const g = pick(r, GLS);
    out.push({ entry_id: `MJE-${pad(i, 6)}`, gl_account: g[0], gl_name: g[1], amount_lkr: amt, debit_credit: pick(r, ['D', 'C']), entry_date: dateAgo(ri(r, 0, 90)), entry_time: `${pad(anomaly && chance(r, 0.5) ? ri(r, 19, 23) : ri(r, 8, 18), 2)}:${pad(ri(r, 0, 59), 2)}`, maker_id: maker, approver_id: (!automated && anomaly && chance(r, 0.5)) ? maker : appr, description: 'period adjustment', cost_centre: `CC-${ri(r, 1, 40)}`, period: '2026-Q2', is_automated: automated });
  }
  return out;
}

// ── WEALTH — suitable, diversified; rare suitability-gap / churn / concentration.
function wealth(r, n) {
  const out = []; const custs = Array.from({ length: Math.floor(n / 5) }, (_, i) => `WC-${pad(i, 4)}`);
  const PRODUCTS = [['P1', 'Money Market', 1], ['P2', 'Govt Bond', 2], ['P3', 'Balanced Fund', 3], ['P4', 'Equity Fund', 4], ['P5', 'Structured Note', 5]];
  for (let i = 0; i < n; i++) {
    const c = pick(r, custs), profile = ri(r, 2, 5), anomaly = chance(r, 0.04);
    const p = anomaly ? PRODUCTS[Math.min(4, profile + ri(r, 1, 2) - 1)] : pick(r, PRODUCTS.filter(x => x[2] <= profile));
    // Similar-sized holdings (tight range) → ~5 per customer → single-product
    // concentration usually well below the 40% limit (clean by construction).
    out.push({ customer_id: c, risk_profile: profile, product_id: p[0], product_name: p[1], product_risk_rating: p[2], holding_lkr: ri(r, 4000000, 9000000), hold_days: ri(r, 30, 900), min_hold_days: 90, rm_code: `RM-${ri(r, 1, 25)}`, fees_ytd_lkr: lkr(r, 4, 6), switches_90d: anomaly && chance(r, 0.5) ? ri(r, 4, 8) : ri(r, 0, 2), suitability_gap_flag: false });
  }
  return out;
}

// ── CONNECTED PARTY — within limits; a few single-obligor + one group aggregating.
function connectedParty(r, n) {
  const out = []; const groups = Array.from({ length: Math.floor(n / 4) }, (_, i) => `GRP-${pad(i, 4)}`);
  const bigGroup = pick(r, groups);
  for (let i = 0; i < n; i++) {
    const g = chance(r, 0.06) ? bigGroup : pick(r, groups);
    const inBig = g === bigGroup;
    const anomaly = chance(r, 0.03);
    out.push({ customer_id: `CP-${pad(i, 5)}`, group_id: g, single_obligor_pct: anomaly ? +(26 + r() * 8).toFixed(1) : (inBig ? +(12 + r() * 6).toFixed(1) : +(2 + r() * 14).toFixed(1)), shared_director_count: chance(r, 0.02) ? ri(r, 2, 3) : ri(r, 0, 1), cbsl_disclosure_status: chance(r, 0.02) ? 'gap' : 'disclosed', aggregate_exposure_lkr: lkr(r, 7, 9) });
  }
  return out;
}

// ── COLLATERAL — sound; rare LTV breach / stale / double-pledge.
function collateral(r, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const anomaly = chance(r, 0.05);
    out.push({ collateral_id: `COL-${pad(i, 5)}`, loan_id: `BNK-CR-${pad(ri(r, 0, 1199), 5)}`, ltv_ratio: anomaly && chance(r, 0.6) ? +(0.86 + r() * 0.25).toFixed(2) : +(0.4 + r() * 0.4).toFixed(2), valuation_date: dateAgo(anomaly && chance(r, 0.5) ? ri(r, 380, 800) : ri(r, 10, 300)), days_since_valuation: '', pledge_count: anomaly && chance(r, 0.4) ? 2 : 1, exposure_lkr: lkr(r, 6, 8) });
  }
  return out;
}

// ── CREDIT FRAUD — clean originations; rare FPD / siphon / shell / σ-outlier + guarantor ring.
function creditFraud(r, n) {
  const out = []; const guarantors = Array.from({ length: Math.floor(n / 2) }, (_, i) => `GUA-${pad(i, 4)}`);
  const ringG = pick(r, guarantors);
  const peerMed = 5e7, peerStd = 1.5e7;
  for (let i = 0; i < n; i++) {
    const anomaly = chance(r, 0.05);
    const fac = anomaly && chance(r, 0.3) ? Math.round(peerMed + (3.2 + r()) * peerStd) : Math.round(peerMed + (r() - 0.5) * peerStd);
    out.push({ loan_id: `CF-${pad(i, 5)}`, borrower_id: `BR-${pad(i, 5)}`, guarantor_id: chance(r, 0.1) ? ringG : pick(r, guarantors), branch_code: `BR-${ri(r, 1, 60)}`, sector: pick(r, SECTORS), facility_lkr: fac, disbursed_on: dateAgo(ri(r, 30, 400)), first_payment_due_on: dateAgo(ri(r, 0, 30)), first_payment_missed: anomaly && chance(r, 0.5), days_past_due_first: anomaly && chance(r, 0.5) ? ri(r, 95, 180) : 0, outflow_to_undisclosed_lkr_72h: anomaly && chance(r, 0.4) ? Math.round(fac * (0.86 + r() * 0.1)) : Math.round(fac * r() * 0.3), outflow_total_lkr_72h: fac, borrower_incorporation_date: dateAgo(anomaly && chance(r, 0.3) ? ri(r, 30, 180) : ri(r, 400, 4000)), borrower_bo_disclosure: anomaly && chance(r, 0.4) ? 'none' : 'disclosed', borrower_business_age_months: anomaly && chance(r, 0.3) ? ri(r, 1, 6) : ri(r, 18, 240), address_sharing_flag: chance(r, 0.04), override_flag: chance(r, 0.1), approver_id: `STF-${ri(r, 1, 80)}`, sector_peer_median_lkr: peerMed, sector_peer_std_lkr: peerStd });
  }
  return out;
}

// ── SUSPENSE — mostly young, well-clearing accounts; a few aged / low-clearing / ballooning.
function suspense(r, n) {
  const out = [];
  const types = ['CEFT Receivables', 'NOSTRO Clearing', 'NOSTRO USD', 'Fee Suspense', 'GL Suspense', 'Card Settlement', 'Inward Remittance', 'Cheque Clearing'];
  for (let i = 0; i < n; i++) {
    const anomaly = chance(r, 0.04);
    const aging = anomaly ? ri(r, 92, 210) : ri(r, 1, 60);
    const clearing = anomaly && chance(r, 0.7) ? +(0.05 + r() * 0.22).toFixed(2) : +(0.42 + r() * 0.5).toFixed(2);
    const growth = anomaly && chance(r, 0.6) ? ri(r, 80, 420) : ri(r, -10, 40);
    const bal = anomaly && chance(r, 0.5) ? lkr(r, 8, 8.2) : lkr(r, 5.5, 7.6);
    const prior = Math.round(bal / (1 + growth / 100));
    out.push({ account_id: `SUS-ACC-${pad(i, 4)}`, account_type: pick(r, types), branch_code: `BR-${ri(r, 1, 60)}`, current_balance_lkr: bal, aging_days: aging, growth_rate_30d_pct: growth, clearing_ratio: clearing, inflow_lkr_30d: Math.round(bal * (0.3 + r() * 0.7)), outflow_lkr_30d: Math.round(bal * r() * 0.4), balance_30d_ago_lkr: prior, auto_match_pct: anomaly ? ri(r, 5, 35) : ri(r, 55, 96), prior_30d_inflow_lkr: Math.round(prior * (0.3 + r() * 0.6)), counterparty_source_id: anomaly && chance(r, 0.5) ? `EXT-${ri(r, 1000, 9999)}-R` : '', last_reaging_date: anomaly && chance(r, 0.4) ? dateAgo(ri(r, 5, 40)) : '', reaged_by_staff_id: anomaly && chance(r, 0.4) ? `STF-${ri(r, 1, 80)}` : '' });
  }
  return out;
}

// ── TRADE — LC/invoice docs with unit prices clustered per HS code (a few mis-invoiced) + FX positions (a few over limit).
function trade(r, n) {
  const out = [];
  const hs = [['620342', 35, 'Mens woven apparel'], ['090210', 2.2, 'Black tea bulk'], ['401110', 85, 'Rubber tyres'], ['271019', 0.9, 'Petroleum oils'], ['854231', 12, 'Electronic ICs'], ['100630', 0.7, 'Rice semi-milled']];
  const countries = ['AE', 'DE', 'IN', 'SG', 'CN', 'GB', 'HK'];
  const nDocs = Math.max(1, n - 15);
  for (let i = 0; i < nDocs; i++) {
    const [code, fair, desc] = pick(r, hs);
    const anomaly = chance(r, 0.04);
    const mult = anomaly ? (chance(r, 0.5) ? 2.2 + r() * 1.5 : 0.3 + r() * 0.25) : (0.85 + r() * 0.3);
    const price = +(fair * mult).toFixed(2);
    const qty = ri(r, 1000, 60000);
    const amt = Math.round(price * qty * 290);
    const hasLc = chance(r, 0.6);
    out.push({ document_id: `${hasLc ? 'LC' : 'INV'}-2026-${pad(i, 4)}`, customer_id: `BNK-CORP-${pad(ri(r, 1, 1400), 4)}`, hs_code: code, declared_unit_price: price, invoice_currency: 'USD', counterparty_country: pick(r, countries), commodity_description: desc, quantity: qty, lc_reference: hasLc ? `LC-2026-${pad(i, 4)}` : '', shipment_period_start: dateAgo(ri(r, 60, 120)), shipment_period_end: dateAgo(ri(r, 10, 59)), invoice_amount_lkr: amt, lc_amount_lkr: hasLc ? Math.round(amt * (0.9 + r() * 0.15)) : '', trade_direction: chance(r, 0.6) ? 'import' : 'export', position_id: '', currency_pair: '', position_amount: '', approved_limit: '', trader_id: '' });
  }
  const pairs = ['USD/LKR', 'EUR/LKR', 'GBP/LKR', 'JPY/LKR'];
  for (let i = 0; i < 15; i++) {
    const limit = lkr(r, 9, 9.5);
    const over = chance(r, 0.25);
    out.push({ document_id: '', customer_id: '', hs_code: '', declared_unit_price: '', invoice_currency: pick(r, ['USD', 'EUR', 'GBP']), counterparty_country: '', commodity_description: '', quantity: '', lc_reference: '', shipment_period_start: '', shipment_period_end: '', invoice_amount_lkr: '', lc_amount_lkr: '', trade_direction: '', position_id: `POS-${pad(i, 4)}`, currency_pair: pick(r, pairs), position_amount: over ? Math.round(limit * (1.1 + r() * 0.4)) : Math.round(limit * (0.4 + r() * 0.5)), approved_limit: limit, trader_id: `TRD-${pad(ri(r, 1, 30), 4)}` });
  }
  return out;
}

// ── INSIDER — staff transaction events. The detector scores a per-staff composite
// (self-init+approve SoD + override rate + off-hours rate) and flags staff over a
// 0.70 cutoff, so anomalies must be CONCENTRATED on a few staff, not sprinkled:
// the clean population is benign (SoD-separated, business hours, ~5% override) and
// a handful of bad actors get a dense block of self-approved off-hours overrides.
function insider(r, n) {
  const out = [];
  const roles = ['Relationship Manager', 'Branch Officer', 'Operations Officer', 'Teller', 'Credit Officer'];
  const staff = Array.from({ length: 80 }, (_, i) => `STF-${pad(i, 4)}`);
  const nBad = 4, perBad = 9;
  const badActors = Array.from({ length: nBad }, (_, i) => staff[(i * 17 + 3) % 80]);
  const cleanStaff = staff.filter(s => !badActors.includes(s));
  let tid = 0;
  // Clean population — SoD-separated, business hours, rare lone override.
  for (let i = 0; i < n - nBad * perBad; i++) {
    const init = chance(r, 0.5);
    out.push({ staff_id: pick(r, cleanStaff), branch_code: `BR-${ri(r, 1, 60)}`, transaction_id: `TXN-IR-${pad(tid++, 5)}`, role: pick(r, roles), initiator_flag: init, approver_flag: !init, timestamp: tsAgo(r, 90, 8, 18) + 'Z', amount_lkr: lkr(r, 4, 6.5), override_flag: chance(r, 0.05), approval_time_minutes: ri(r, 5, 180), session_id: `SES-${pad(tid, 6)}`, login_city: pick(r, CITIES), device_id: `DEV-${ri(r, 1000, 9999)}`, is_registered_device: true, customer_id: `BNK-CUST-${pad(ri(r, 1, 9999), 4)}`, loan_id: `BNK-CR-${pad(ri(r, 1, 1200), 5)}` });
  }
  // Bad actors — dense self-initiated+approved, off-hours, override, rapid approval.
  for (const s of badActors) {
    for (let k = 0; k < perBad; k++) {
      out.push({ staff_id: s, branch_code: `BR-${ri(r, 1, 60)}`, transaction_id: `TXN-IR-${pad(tid++, 5)}`, role: 'Relationship Manager', initiator_flag: true, approver_flag: true, timestamp: tsAgo(r, 90, 21, 23) + 'Z', amount_lkr: lkr(r, 6.8, 7.4), override_flag: chance(r, 0.85), approval_time_minutes: +(0.5 + r() * 2).toFixed(1), session_id: `SES-${pad(tid, 6)}`, login_city: pick(r, CITIES), device_id: chance(r, 0.5) ? `DEV-X-${ri(r, 1000, 9999)}` : `DEV-${ri(r, 1000, 9999)}`, is_registered_device: !chance(r, 0.5), customer_id: `BNK-CUST-${pad(ri(r, 1, 9999), 4)}`, loan_id: `BNK-CR-${pad(ri(r, 1, 1200), 5)}` });
    }
  }
  return out;
}

// ── THIRD-PARTY / VENDOR — mostly low-concentration, recently-assessed; a few critical-concentration / stale / no-exit-plan.
function thirdParty(r, n) {
  const out = [];
  const cats = ['Core Banking Platform', 'ATM / Cash Services', 'Cloud Hosting', 'Card Processing', 'Print & Mail', 'Security Services', 'Telecom', 'Cash-in-Transit', 'Software Licensing'];
  for (let i = 0; i < n; i++) {
    const anomaly = chance(r, 0.06);
    const crit = anomaly && chance(r, 0.6) ? 'critical' : pick(r, ['high', 'medium', 'medium', 'low']);
    out.push({ vendor_id: `VND-${pad(i, 4)}`, vendor_name: `${pick(r, cats)} Provider ${i}`, category: pick(r, cats), criticality: crit, annual_spend_lkr: lkr(r, 7, 8.9), concentration_pct: anomaly && chance(r, 0.7) ? ri(r, 60, 88) : ri(r, 3, 45), contract_end_date: dateAgo(-ri(r, 30, 700)), last_assessment_date: anomaly && chance(r, 0.6) ? dateAgo(ri(r, 420, 900)) : dateAgo(ri(r, 30, 360)), cbsl_category: crit === 'critical' ? 'material_outsourcing' : '', exit_plan_status: (crit === 'critical' && anomaly) ? 'absent' : 'present' });
  }
  return out;
}

// ── ACCESS RIGHTS — mostly active standard users; a few dormant-privileged / stale-review / toxic-combination.
function accessRights(r, n) {
  const out = [];
  const roles = ['Branch Officer', 'Teller', 'Operations Officer', 'Credit Officer', 'Branch Manager', 'DBA', 'Payments Admin', 'System Admin', 'Auditor'];
  const depts = ['Branch', 'Operations', 'IT', 'Treasury', 'Finance', 'Compliance'];
  const toxics = [['TOXIC-LI-LA', 'Loan Initiator + Loan Approver'], ['TOXIC-PM-PA', 'Payment Maker + Payment Approver'], ['TOXIC-UA-AL', 'User Admin + Audit Log Access']];
  for (let i = 0; i < n; i++) {
    const anomaly = chance(r, 0.04);
    const priv = anomaly && chance(r, 0.6) ? pick(r, ['admin', 'privileged']) : pick(r, ['standard', 'standard', 'standard', 'privileged']);
    const dormant = anomaly && chance(r, 0.5);
    const toxic = anomaly && chance(r, 0.4) ? pick(r, toxics) : null;
    // Clean review age stays under the 90-day priv-review threshold (the detector
    // flags last_review_days >= 90 for ALL users, so a clean range of 10-170 would
    // over-flag ~half the population); only anomalies are overdue (>= 190).
    out.push({ user_id: `STF-${pad(i, 4)}`, role: pick(r, roles), department: pick(r, depts), privilege_level: priv, last_login_days: dormant ? ri(r, 95, 280) : ri(r, 0, 45), last_review_days: anomaly && chance(r, 0.5) ? ri(r, 190, 400) : ri(r, 10, 80), dormant_flag: dormant, sod_conflict_flag: !!toxic, toxic_combination_code: toxic ? toxic[0] : '', toxic_combination_description: toxic ? toxic[1] : '' });
  }
  return out;
}

// ── CONDUCT — mostly closed, low-recurrence cases; a few aged-open / repeat-offender / whistleblower.
function conduct(r, n) {
  const out = [];
  const cats = ['behaviour', 'process-breach', 'financial-misconduct', 'harassment', 'data-misuse'];
  for (let i = 0; i < n; i++) {
    const anomaly = chance(r, 0.05);
    // Clean cases: mostly closed, the few open ones are recent (under the
    // resolution SLA so they don't flag); anomalies are aged-open / recurring /
    // whistleblower. Without this, clean "open" cases aged past the SLA over-flag.
    const isOpen = anomaly ? chance(r, 0.7) : chance(r, 0.08);
    const age = isOpen ? (anomaly ? ri(r, 90, 500) : ri(r, 3, 25)) : ri(r, 40, 600);
    out.push({ case_id: `CD-${pad(i, 5)}`, subject_role: `STF-${pad(ri(r, 1, 200), 4)}`, category: pick(r, cats), severity: anomaly ? pick(r, ['high', 'critical']) : pick(r, ['low', 'medium', 'medium', 'high']), opened_date: dateAgo(age), resolution_status: isOpen ? 'open' : 'closed', closed_date: isOpen ? '' : dateAgo(ri(r, 1, 30)), days_open: isOpen ? age : ri(r, 3, 30), recurrence_count: anomaly && chance(r, 0.6) ? ri(r, 2, 4) : 1, whistleblower_flag: anomaly && chance(r, 0.4), branch_code: `BR-${ri(r, 1, 60)}` });
  }
  return out;
}

// ── SANCTIONS HITS — screening matches (cross-feeds KYC); mix of weak/strong, a few strong+open+aged.
function sanctions(r, n) {
  const out = [];
  const sources = ['OFAC', 'UN', 'EU', 'HMT', 'local'];
  const types = ['exact', 'phonetic', 'partial', 'fuzzy'];
  for (let i = 0; i < n; i++) {
    const strong = chance(r, 0.35);
    const score = strong ? +(0.88 + r() * 0.11).toFixed(2) : +(0.78 + r() * 0.09).toFixed(2);
    const open = strong ? chance(r, 0.6) : chance(r, 0.3);
    out.push({ customer_id: `CUST-${pad(ri(r, 10000, 99999), 5)}`, list_source: pick(r, sources), match_score: score, match_type: strong ? pick(r, ['exact', 'phonetic']) : pick(r, types), match_target_name: `listed_${chance(r, 0.5) ? 'individual' : 'entity'}_${pad(ri(r, 1, 300), 3)}`, review_status: open ? 'open' : pick(r, ['in_review', 'cleared']), days_open: open ? ri(r, 6, 30) : ri(r, 1, 5), pep_flag: chance(r, 0.15), recommended_action: strong ? 'Freeze and file STR' : 'Manual review' });
  }
  return out;
}

const SCALE = {
  credit: 1200, transaction: 2600, kyc: 1000, controls: 1400, digital: 1100, mje: 600, wealth: 800, connectedParty: 240, collateral: 500, creditFraud: 320,
  // Entity/event feeds previously left at toy size — now scaled for a credible data-lake population.
  suspense: 400, trade: 300, insider: 250, thirdParty: 120, accessRights: 600, conduct: 150, sanctions: 60,
};

// Generate the realistic portfolio. Returns { [slot]: rows }. Agents not listed
// here fall back to the illustrative bundled samples (handled by the caller).
export function generateRealisticPortfolio(seedBase = 20260615) {
  const gens = { credit, transaction, kyc, controls, digital, mje, wealth, connectedParty, collateral, creditFraud, suspense, trade, insider, thirdParty, accessRights, conduct, sanctions };
  const out = {};
  let s = seedBase;
  for (const [slot, fn] of Object.entries(gens)) out[slot] = fn(rng(s++), SCALE[slot]);
  return out;
}
