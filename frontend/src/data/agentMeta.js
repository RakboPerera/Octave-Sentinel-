// ─── SENTINEL AGENT METADATA ─────────────────────────────────────────────────
// Single source of truth for agent colors, names, methodology, and regulatory context.
//
// `role` classifies each entry:
//   'detection' — true detection agent, emits findings (counts toward headline agent total).
//   'helper'    — produces narrative / supporting analysis to another agent's output; not
//                 independently listed as an agent. E.g. `balance` explains `capital`'s LCR bridge.
//   'meta'      — operates on other agents' findings (orchestration, explainability).
//                 Functional but not a detection agent.
//   'utility'   — one-shot client-side bootstrap; no LLM call; not an agent.

import { describeDetector } from '../utils/detectionEngine.js';

export const AGENT_META = {
  credit:      { role: 'detection', name: 'Credit Intelligence',       color: '#185FA5', icon: '◈', solves: 'Detects loans whose SLFRS 9 staging is materially understated — loans that should be in a higher risk stage than they are currently classified. This is the audit problem of "provisions look adequate until you look under the hood." Credit Committee gets a ranked list of restage-required loans with the ECL restatement impact quantified.', methodology: 'Deterministic SLFRS 9 stage-trigger rules (DPD, collateral ratio, restructure count) flag loans whose assigned stage is below their evidence-implied stage; vintage-cohort and sector-peer robust-z statistics surface underwriting drift. No opaque ML — every flag is a transparent rule or statistic grounded to the loan row.' },
  creditFraud: { role: 'detection', name: 'Credit Fraud & Origination', color: '#831843', icon: '⊠', path: null, solves: 'Catches loans that should never have been written in the first place — fictitious borrowers, shell-borrower guarantor chains, immediate post-disbursement siphoning to undisclosed counterparties, first-payment defaults. Credit Intelligence is backward-looking (is existing book misstaged?); this agent is forward-looking (is new origination fraudulent?).', methodology: 'Complements Credit Intelligence — Credit flags staging anomalies (backward-looking), this agent flags origination fraud (forward-looking): immediate post-disbursement siphoning, guarantor-chain concentration, shell-borrower patterns, first-payment default cohorts, and facility amounts that exceed sector peer median beyond tolerance. Scores 0.0–1.0 on a composite of 7 indicators.' },
  transaction: { role: 'detection', name: 'Transaction Surveillance',  color: '#2D5A8E', icon: '⟳', solves: 'Identifies AML-reportable transaction patterns — structuring below the STR threshold, unusual velocity vs baseline, hub-and-spoke layering, Benford-law deviations in a payment stream. Produces the STR-filing queue for CBSL FIU with full entity-level evidence.', methodology: "Benford's Law first-digit test across all transactions, structuring cluster detection (3+ txns below threshold, combined >threshold within 24h), velocity scoring vs 90-day rolling baseline." },
  suspense:    { role: 'detection', name: 'Suspense & Reconciliation', color: '#993C1D', icon: '⊟', solves: 'Detects the "extraction pool" risk — GL suspense accounts growing rapidly while their clearing activity collapses, aged past the CBSL 90-day limit. Phantom-receivable patterns like SUS-017 (LKR 1.24 Bn, 312% growth, 0.08 clearing ratio) get escalated before they reach auditor-detected breach territory.', methodology: 'Daily growth-rate × clearing-ratio analysis per account. Flags: growth >50% in 30d, clearing ratio <0.30, aging >90d (CBSL breach). Phantom receivable score combines all three.' },
  kyc:         { role: 'detection', name: 'Identity & KYC / AML',      color: '#0F6E56', icon: '✦', solves: 'Surfaces onboarding and due-diligence failures across 836K customers — stale PEP EDD reviews, undisclosed beneficial ownership, FATF grey-list exposure without EDD, introducer concentration indicative of deliberate problem-account routing. Targets CBSL KYC-direction breaches before a regulator finds them.', methodology: '47-rule CDD compliance engine applied to every account nightly. Rules cover: document expiry, PEP EDD status, FATF-country exposure, beneficial ownership, introducer concentration.' },
  staffAccess: { role: 'detection', name: 'Staff, Access & Control Risk', color: '#3A5A3A', icon: '⚙', path: null, solves: 'Gives Internal Audit one place to see staff-enabled fraud risk across three layers that used to live in separate agents: branch operational controls, individual staff behavioural patterns, and system entitlements. Multi-layer convergence (same subject flagged at ≥2 layers) is what turns a suspicion into a case.', methodology: 'Consolidated staff, access-rights and branch-control risk surface. Combines three sub-agents: Internal Controls (branch composite — override rate, SoD, approval turnaround, off-hours, approver concentration, temporal clustering), Insider Risk (staff-level composite across 6 behavioural dimensions — SoD, override concentration, off-hours, cluster approvals, turnaround anomaly, session deviation), and Access Rights (entitlement layer — toxic combinations, dormant privileged accounts, leaver-account detection, review-cycle enforcement). Outputs are a unified list of at-risk branches, at-risk staff, and at-risk entitlements with cross-layer evidence.' },
  controls:    { role: 'helper', helperTo: 'staffAccess', group: 'staffAccess', name: 'Internal Controls',         color: '#3A5A3A', icon: '⚙', solves: 'Branch-level composite control scoring. Feeds the Staff, Access & Control Risk agent.', methodology: '6-dimension composite score per branch: override rate (25%), SoD violations (20%), approval turnaround (15%), off-hours approvals (15%), approver concentration (15%), temporal clustering (10%). Branch-level component of Staff, Access & Control Risk. The dedicated agent-platform page remains for deep drill-down.' },
  digital:     { role: 'detection', name: 'Digital Fraud & Identity',  color: '#993556', icon: '⊕', solves: 'Catches account takeover and session-level fraud — behavioural-biometric deviation from the customer\'s 14-month baseline, physically-impossible travel between consecutive sessions, device fingerprints shared across multiple accounts. Surfaces SIM-swap cases where MFA passed but the physical pattern is inconsistent.', methodology: 'Behavioral biometrics against 14-month session baseline. Geographic velocity vs Sri Lanka city-pair travel times. Device fingerprint clustering across accounts.' },
  trade:       { role: 'detection', name: 'Trade Finance & Treasury',  color: '#2E7D32', icon: '◎', solves: 'Detects trade-based money laundering and FX-rail abuse — HS-code invoice-price deviations from customs/COMTRADE medians (over/under-invoicing), duplicate letters of credit on overlapping shipment windows, FX position limit breaches. Produces the STR-eligible TBML case queue.', methodology: 'HS code price benchmarking vs UN COMTRADE + Sri Lanka Customs medians (flag: >25% deviation). Duplicate LC detection on overlapping shipment periods.' },
  insider:     { role: 'helper', helperTo: 'staffAccess', group: 'staffAccess', name: 'Insider Risk',              color: '#4B3F72', icon: '◉', solves: 'Staff-level behavioural composite scoring. Feeds the Staff, Access & Control Risk agent.', methodology: 'Staff risk scoring across 6 dimensions: SoD violations (25%), override concentration (20%), off-hours activity (18%), same-cluster approvals (18%), approval turnaround anomaly (12%), session deviation (7%). Staff-level component of Staff, Access & Control Risk.' },
  mje:         { role: 'detection', name: 'MJE Testing',               color: '#0BBF7A', icon: '⊞', solves: 'Full-population manual journal testing — the line-by-line audit procedure that traditionally runs on sample. Catches after-hours postings to sensitive GL accounts, round-number amounts lacking documentation, same-person maker-checker breaches, tax-variance anomalies. Replaces sampling with 100% coverage.', methodology: 'Full-population MJE testing: timing flags, amount anomalies (round numbers, Benford deviation), GL sensitivity (suspense/capital/intercompany), maker-checker SoD, document completeness.' },
  capital:     { role: 'detection', name: 'Capital & Liquidity',       color: '#1D4ED8', icon: '⌖', solves: 'Produces Basel III CAR/LCR/NSFR live and projects them four quarters forward under the current trajectory. Early-warns on a ratio breach (amber → red) before the next quarterly submission so ALCO has time to act. Answers "is Demo Bank heading toward a regulatory breach, and if so, which drivers?".', methodology: 'Basel III ratio computation from capital structure and liquidity inputs across 8 quarters. Tier 1/Tier 2/CAR, LCR with HQLA composition, NSFR with ASF/RSF, 4-quarter forward projection, LCR bridge attribution across 5 drivers, ALCO action generation.' },
  balance:     { role: 'helper',    name: 'Balance Sheet Drivers',     color: '#0EA5E9', icon: '↔', path: null,                 helperTo: 'capital', methodology: 'Helper sub-routine consumed by Capital & Liquidity. Attributes 8-quarter LCR and CAR movement to five structural drivers (loan book growth, deposit growth, retained earnings, HQLA composition shift, corporate depositor concentration). Populates the LCR bridge shown on the Regulatory Capital page. Not listed as an independent agent — its output is rendered as a section inside Capital & Liquidity.' },
  compseed:    { role: 'utility',   name: 'Compliance History Seed',   color: '#6366F1', icon: '⧉', path: null,                 methodology: 'Client-side bootstrap utility. Loads 4-quarter composite score history into the local run ledger so the Compliance quarterly-trend chart has context on first load. Not a detection agent — no LLM call, no findings produced.' },
  orchestrator:{ role: 'meta',      name: 'Orchestrator',              color: '#111110', icon: '◎', path: null,                 methodology: 'Meta-agent. Receives signal feeds from every detection agent, detects multi-agent correlations on shared entities, and elevates cross-agent patterns to case-worthy status. Combined severity = max(individual) + 0.25 bonus when 3+ agents converge. Threshold for case creation: 0.85.' },

  // ─── PHASE 2 DOMAIN DEEP-DIVE AGENTS ─────────────────────────────────
  // These populate the Business Platform only — not exposed in Agent View nav.
  wealth:        { role: 'detection', name: 'Wealth Suitability',       color: '#7C3AED', icon: '❖', path: null, solves: 'Detects mis-selling in wealth management — customers with conservative risk profiles placed into high-risk products, single-product concentration beyond suitability, rapid churning for fee revenue. Protects the bank from conduct claims and refund liability.', methodology: 'Suitability gap detection (customer risk profile vs product risk rating), single-product concentration, churn velocity per RM. Identifies mis-selling and fee-harvesting patterns in consumer wealth.' },
  collateral:    { role: 'detection', name: 'Collateral Integrity',     color: '#B45309', icon: '◇', path: null, solves: 'Makes sure the collateral behind each facility is actually worth what the loan book assumes — stale valuations beyond 365 days, LTV above 85%, the same asset pledged twice, valuer concentration. A clean credit book can still be unsecured if the collateral layer is decayed.', methodology: 'Stale valuation scan (days since valuation), LTV breach detection, double-pledge aggregation, valuer concentration monitoring. Produces the LTV and stale-collateral view for Commercial/Corporate.' },
  connectedParty:{ role: 'detection', name: 'Connected Party',          color: '#BE123C', icon: '⬡', path: null, solves: 'Enforces the CBSL 25% single-obligor limit by consolidating connected-group exposure that\'s otherwise hidden behind shell companies and shared directorships. The difference between "BNK-CORP-0887 at 22.8%" and "connected group at 25.1%" is the difference between compliant and a reportable breach.', methodology: 'CBSL single-obligor limit monitoring, connected-group aggregation via shared directors and beneficial owners, shell-company pattern detection, related-party disclosure gap identification.' },
  alm:           { role: 'detection', name: 'ALM & IRRBB',              color: '#0F766E', icon: '⇅', path: null, solves: 'Monitors interest-rate risk in the banking book — repricing gaps per bucket, EVE sensitivity under ±200 bps parallel shifts, NII vulnerability. When the loan book grew 50% but deposits didn\'t extend in tenor, this agent is what surfaces the repricing mismatch.', methodology: 'Repricing gap analysis per bucket, cumulative gap as % of assets, EVE sensitivity to parallel shifts, NII sensitivity to rate scenarios, liquidity-bucket strain detection.' },
  thirdParty:    { role: 'detection', name: 'Third-Party Risk',         color: '#475569', icon: '◈', path: null, solves: 'Tracks vendor concentration and exit readiness — critical vendors (core banking, CEFT switch) with no documented exit plan, assessment staleness past 365 days, CBSL material-outsourcing notifications overdue. The vendor layer is where Business Disruption losses live.', methodology: 'Vendor concentration per category, critical-contract exit-readiness window, assessment staleness, CBSL material-outsourcing notification gap detection.' },
  accessRights:  { role: 'helper', helperTo: 'staffAccess', group: 'staffAccess', name: 'Access Rights',            color: '#0891B2', icon: '⚿', path: null, solves: 'Entitlement-layer anomaly detection. Feeds the Staff, Access & Control Risk agent.', methodology: 'Dormant privileged-account detection, toxic entitlement combinations (Maker+Approver type pairs), privileged review cycle enforcement, SoD breakdown at the entitlement layer, leaver active-account detection. Entitlement-level component of Staff, Access & Control Risk.' },
  conduct:       { role: 'detection', name: 'Conduct & Grievance',      color: '#9333EA', icon: '◐', path: null, solves: 'Integrates HR/conduct signals (grievances, whistleblower cases) with operational risk — 3 prior conduct cases on a staff member that Internal Controls later flags for insider fraud is a failure of information integration, not a new finding. This agent fixes that gap.', methodology: 'Recurrence detection per subject, case-ageing monitoring, whistleblower clustering in rolling windows, cross-agent match with insider-risk flagged staff.' },
  regReporting:  { role: 'detection', name: 'Regulatory Reporting Integrity', color: '#334155', icon: '▤', path: null, solves: 'Gives Demo Bank an independent-of-submission check on its own CBSL returns — recomputes Stage 3, Large Exposures, CAR, LCR, NSFR from live agent outputs and flags variances above per-line tolerance. Answers "can we defend our submission if CBSL calls us in?" before the call comes.', methodology: 'Independent-of-submission validation. For each line item in Demo Bank\'s CBSL returns (Form CAR, LCR, NSFR, Large Exposures, Stage 3, STR/FIU), this agent recomputes the expected value from live agent outputs and compares against the submitted value. Flags line-items where |expected − submitted| exceeds a per-line materiality gate. Produces a return-by-return defensibility dashboard and a remediation backlog.' },
  explainability:{ role: 'meta',      name: 'Explainability',           color: '#F5B841', icon: '✸', path: null, methodology: 'Meta-agent. Given any finding produced by a detection agent, synthesises a 14-section trail (summary, domain context, signals, methodology, step-by-step trace, why-flagged, counterfactual, how-to-verify, corroboration, data lineage, confidence, regulatory citations, remediation SLA, control failure). Runs live when data is uploaded; demo trails pre-rendered for zero-API-key playback. Does not produce its own findings.' },
  feedbackLoop:  { role: 'meta',      name: 'Feedback Loop',            color: '#7C3AED', icon: '⟲', path: null, solves: 'Closes the learning loop: auditors mark cases as false positives with a category and rationale, this agent analyses the pattern and recommends rule-parameter changes that would eliminate the same false positives next time without suppressing true positives. An authorized approver reviews and accepts or rejects each recommendation; accepted changes flow into the threshold audit log.', methodology: 'Meta-agent. Consumes (a) false-positive cases with reason + category, (b) true-positive cases (as a preservation guard), (c) current thresholds. Runs a change-rationale search with a hard constraint: no recommendation may suppress an existing critical finding. Minimum 3 false positives on the same agent/rule required before a recommendation will be issued — below that, it returns a "more data needed" note rather than speculating. Never auto-applies — always human-gated.' },
};

// SINGLE-SOURCE the "how it detects" prose. For every agent the deterministic
// engine actually detects, overwrite the (otherwise drift-prone) methodology
// string with the engine's OWN truthful summary — so the explanation can never
// claim a method the engine doesn't run (e.g. the old "Isolation Forest" copy).
// Non-engine agents (orchestrator / explainability / feedbackLoop) keep their
// curated prose. This runs once at module load.
for (const [id, meta] of Object.entries(AGENT_META)) {
  const d = describeDetector(id);
  if (d) meta.methodology = d.summary;
}

// ─── AUTHORIZED APPROVER POLICY ─────────────────────────────────────────────
// Roles allowed to approve / reject feedback-loop recommendations. Extend this
// list as new roles are added. The auth gate is enforced in the UI (Rule
// Parameters page) by checking state.auth.user.role against this set.
export const AUTHORIZED_APPROVER_ROLES = [
  'Chief Internal Auditor',
  'Chief Risk Officer',
  'Chief Compliance Officer',
  'Head of Internal Audit',
];

// FIX L3: Use exact (case-insensitive) match instead of .includes() so
// "Head of Internal Audit Assistant" no longer matches "Head of Internal Audit".
export function isAuthorizedApprover(user) {
  if (!user) return false;
  const role = user.role || user.title || user.position;
  if (!role) return false;
  const roleStr = String(role).trim().toLowerCase();
  return AUTHORIZED_APPROVER_ROLES.some(r => roleStr === r.toLowerCase());
}

// Agent-group metadata. Agents can be loosely grouped so the Business View
// can present overlapping-concern agents as a single "risk surface" without
// physically merging the backend prompts or agent-platform pages. Use
// AGENT_GROUPS[groupId] to get the human-readable wrapper.
export const AGENT_GROUPS = {
  staffAccess: {
    label: 'Staff, Access & Control Risk',
    color: '#3A5A3A',
    icon: '⚙',
    summary: 'Consolidated detection agent combining three previously-separate engines — Internal Controls (branch-level composite), Insider Risk (staff-level composite), Access Rights (entitlement layer). All three operate on the same input streams (approval logs, session logs, entitlement tables) and produce unified output. The sub-engines remain available as standalone agent-platform pages for deep drill-down.',
    memberIds: ['controls', 'insider', 'accessRights'],
  },
};
export function getAgentGroup(agentId) {
  const m = AGENT_META[agentId];
  return m?.group ? AGENT_GROUPS[m.group] : null;
}

// Convenience selectors — use these to iterate agents by role.
export const DETECTION_AGENT_IDS = Object.entries(AGENT_META)
  .filter(([, m]) => m.role === 'detection')
  .map(([id]) => id);
export const META_AGENT_IDS = Object.entries(AGENT_META)
  .filter(([, m]) => m.role === 'meta')
  .map(([id]) => id);
export const HELPER_AGENT_IDS = Object.entries(AGENT_META)
  .filter(([, m]) => m.role === 'helper')
  .map(([id]) => id);
export const UTILITY_AGENT_IDS = Object.entries(AGENT_META)
  .filter(([, m]) => m.role === 'utility')
  .map(([id]) => id);

export const REGULATORY = {
  credit:      { code: 'SLFRS 9', label: 'SLFRS 9 — ECL Staging', body: 'ECL provisions must accurately reflect each loan\'s stage classification. Misstaging reduces provisions and understates regulatory capital requirements.' },
  transaction: { code: 'FTRA §7', label: 'FTRA — Section 7', body: 'Structuring (deliberately breaking transactions below LKR 5M) is a criminal offence. Banks must file STRs with CBSL FIU within 5 working days.' },
  suspense:    { code: 'CBSL Susp.', label: 'CBSL Suspense Guidelines', body: 'All suspense balances aged beyond 90 days must be escalated to the Board Audit Committee. Phantom receivable characteristics are independently STR-eligible under FTRA.' },
  kyc:         { code: 'CBSL KYC', label: 'CBSL KYC/AML Direction', body: 'PEP accounts require Enhanced Due Diligence with annual review. Material KYC gaps on legal entities require beneficial ownership disclosure.' },
  controls:    { code: 'CBSL 5/2024', label: 'CBSL Direction No. 5/2024', body: 'No single staff member may have end-to-end control over any credit or payment transaction. SoD violations at this level constitute a material control failure requiring regulatory disclosure.' },
  digital:     { code: 'CBSL 2/2025', label: 'CBSL Circular No. 2/2025', body: 'Enhanced authentication controls for high-value digital transactions. Account Takeover via SIM swap is a reportable fraud event.' },
  trade:       { code: 'FATF TBML', label: 'FATF TBML Guidance (2020)', body: 'Over/under-invoicing is the primary method globally for cross-border value transfer. CBSL requires invoice plausibility checks on all LC-financed trade transactions.' },
  insider:     { code: 'CBSL 5/2024', label: 'CBSL Direction No. 5/2024', body: 'Banks must ensure SoD on all credit and payment transactions. Insider fraud above regulatory thresholds triggers mandatory regulatory notification.' },
  mje:         { code: 'CBSL FR', label: 'CBSL Financial Reporting', body: 'Manual journal entries above LKR 10M require Maker-Checker approval from different individuals. After-hours postings to sensitive GL accounts require documented emergency authorisation.' },
  capital:     { code: 'Basel III', label: 'Basel III — Capital & Liquidity', body: 'CBSL enforces Basel III minimums for Sri Lankan LCBs (Banking Act Direction 01/2016): Tier 1 ratio 8.5%, total CAR 12.5%, LCR 100%, NSFR 100%, leverage 3.0%. Demo Bank holds higher internal appetite buffers (Tier 1 10.5%, total CAR 14.0%). Projected breaches within a 4-quarter window require ALCO remediation and disclosure in the ICAAP.' },
  creditFraud: { code: 'CBSL 5/2024 + FTRA', label: 'Origination Integrity', body: 'CBSL Direction 5/2024 requires banks to detect and prevent loan-origination fraud. First-payment default + post-disbursement siphoning is an STR-eligible pattern under FTRA §7. Losses incurred through origination fraud are excluded from ECL model coverage — they are operational losses, not credit losses.' },
  staffAccess: { code: 'CBSL 5/2024 + ISO 27001', label: 'Staff, Access & Control Risk', body: 'CBSL Direction 5/2024 sets SoD and control-environment expectations. ISO 27001 governs entitlement-layer hygiene (toxic combinations, dormant privileges, leaver accounts). Insider-enabled fraud above materiality thresholds requires mandatory regulatory notification; repeated entitlement-layer failures are a supervisory concern.' },
  regReporting:{ code: 'CBSL FR + ICAAP', label: 'Regulatory Returns Integrity', body: 'CBSL Banking Act §46A requires accurate regulatory returns. A material misstatement in the CAR, LCR, NSFR, Stage 3 or Large Exposures return is a reportable event; repeated misstatements are grounds for supervisory action. ICAAP requires banks to document how they assure themselves of returns accuracy.' },
};

export const FINDING_STATUSES = ['new', 'under_review', 'escalated', 'closed'];

export const STATUS_META = {
  new:          { label: 'New',          color: '#6B7280', bg: '#F3F3F1', icon: '○' },
  under_review: { label: 'Under Review', color: '#185FA5', bg: '#E6F1FB', icon: '◐' },
  escalated:    { label: 'Escalated',    color: '#C41E3A', bg: '#FCEEF1', icon: '◉' },
  closed:       { label: 'Closed',       color: '#0BBF7A', bg: '#E8FDF4', icon: '●' },
};

// FIX H3: The standalone Agent Platform pages were removed in the V3 refactor.
// `DOMAIN_TO_PATH` previously mapped agent ids to /agents/<id> routes that no
// longer exist in App.jsx — any consumer hitting these paths would silently
// land on the catch-all `*` route. Per-agent path: fields on AGENT_META were
// removed for the same reason. Use the domain deep-dive route instead:
//   /business-view/<domainId>  (resolved from domainRegistry.js)

export function getFindingKey(agentId, index) {
  return `${agentId}::${index}`;
}

export function getNextStatus(current) {
  const idx = FINDING_STATUSES.indexOf(current || 'new');
  return FINDING_STATUSES[Math.min(idx + 1, FINDING_STATUSES.length - 1)];
}


// ─── AGENT OPS METADATA (Wave 4) ─────────────────────────────────────────────
// Per-agent version, deployment date, data-source dependency graph and
// control owner. Lives separately from AGENT_META so the detection metadata
// doesn't get cluttered with ops info. Engine Map renders this.
export const AGENT_OPS_META = {
  credit:         { version: 'v2.3.1', deployed_at: '2026-03-15', owner_role: 'Head of Credit Risk',          depends_on: ['01_credit_portfolio.csv', '14_collateral_register.csv'] },
  creditFraud:    { version: 'v1.2.0', deployed_at: '2026-02-01', owner_role: 'Head of Credit Fraud',         depends_on: ['01_credit_portfolio.csv', '22_credit_fraud_originations.csv'] },
  transaction:    { version: 'v3.0.2', deployed_at: '2026-04-01', owner_role: 'Chief Compliance Officer',     depends_on: ['02_transactions.csv'] },
  suspense:       { version: 'v2.1.0', deployed_at: '2026-01-20', owner_role: 'Head of Finance Operations',    depends_on: ['03_suspense_accounts.csv', 'orchestrator → transaction'] },
  kyc:            { version: 'v2.4.3', deployed_at: '2026-03-01', owner_role: 'Head of Compliance',            depends_on: ['04_kyc_customers.csv'] },
  staffAccess:    { version: 'v1.8.0', deployed_at: '2026-02-14', owner_role: 'Chief Internal Auditor',        depends_on: ['05_internal_controls.csv', '09_insider_risk.csv', '18_access_rights.csv'] },
  controls:       { version: 'v2.0.1', deployed_at: '2026-02-14', owner_role: 'Chief Internal Auditor',        depends_on: ['05_internal_controls.csv'] },
  digital:        { version: 'v2.2.0', deployed_at: '2026-02-28', owner_role: 'Head of Digital Banking',       depends_on: ['06_digital_sessions.csv'] },
  trade:          { version: 'v1.6.1', deployed_at: '2026-01-10', owner_role: 'Head of Trade Finance',         depends_on: ['07_trade_treasury.csv'] },
  insider:        { version: 'v1.7.0', deployed_at: '2026-02-14', owner_role: 'Chief People Officer',          depends_on: ['09_insider_risk.csv'] },
  mje:            { version: 'v2.1.2', deployed_at: '2026-01-25', owner_role: 'Chief Financial Officer',       depends_on: ['08_mje_testing.csv'] },
  capital:        { version: 'v2.2.0', deployed_at: '2026-02-20', owner_role: 'Chief Financial Officer',       depends_on: ['10_capital_structure.csv', '11_balance_sheet_drivers.csv'] },
  balance:        { version: 'v1.3.0', deployed_at: '2026-02-20', owner_role: 'Chief Financial Officer',       depends_on: ['11_balance_sheet_drivers.csv'] },
  wealth:         { version: 'v1.1.0', deployed_at: '2026-01-30', owner_role: 'Head of Consumer Wealth',       depends_on: ['13_wealth_portfolio.csv'] },
  collateral:     { version: 'v1.4.2', deployed_at: '2026-03-05', owner_role: 'Head of Credit Administration', depends_on: ['14_collateral_register.csv'] },
  connectedParty: { version: 'v1.5.0', deployed_at: '2026-03-10', owner_role: 'Head of Credit Risk',           depends_on: ['15_connected_parties.csv'] },
  alm:            { version: 'v2.0.0', deployed_at: '2026-02-05', owner_role: 'Head of Treasury',              depends_on: ['16_alm_gap.csv'] },
  thirdParty:     { version: 'v1.2.0', deployed_at: '2026-01-15', owner_role: 'Head of Operational Risk',      depends_on: ['17_vendor_register.csv'] },
  accessRights:   { version: 'v1.6.0', deployed_at: '2026-02-10', owner_role: 'CISO',                          depends_on: ['18_access_rights.csv'] },
  conduct:        { version: 'v1.1.0', deployed_at: '2026-01-20', owner_role: 'Chief People Officer',          depends_on: ['19_conduct_register.csv'] },
  regReporting:   { version: 'v1.3.1', deployed_at: '2026-03-20', owner_role: 'Head of Regulatory Reporting',  depends_on: ['23_reg_reporting_submissions.csv', 'orchestrator → capital, credit, kyc'] },
  orchestrator:   { version: 'v3.1.0', deployed_at: '2026-04-10', owner_role: 'Chief Internal Auditor',        depends_on: ['all detection agents'] },
  explainability: { version: 'v2.0.0', deployed_at: '2026-04-21', owner_role: 'Chief Internal Auditor',        depends_on: ['any finding'] },
  feedbackLoop:   { version: 'v1.0.1', deployed_at: '2026-03-25', owner_role: 'Chief Internal Auditor',        depends_on: ['case_manager false-positive rationales'] },
};
