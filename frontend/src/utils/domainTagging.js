// ─── DOMAIN TAGGING ──────────────────────────────────────────────────────────
// Given a finding from any agent, infer which business domain(s) it affects.
// Deterministic, pure — no state, no LLM. Uses:
//   1. Explicit domain_tags[] on the finding (when the agent emitted them)
//   2. Agent-level default mapping (from domainRegistry.agentsPrimary)
//   3. Content-level heuristics on branch_code / sector / entity_ids / product

import { DOMAINS } from '../data/domainRegistry.js';

// Build the reverse index: agentId → [domainIds that list this agent as primary or secondary]
const AGENT_TO_DOMAINS = (() => {
  const idx = {};
  for (const d of DOMAINS) {
    for (const a of [...(d.agentsPrimary || []), ...(d.agentsSecondary || [])]) {
      if (!idx[a]) idx[a] = [];
      if (!idx[a].includes(d.id)) idx[a].push(d.id);
    }
  }
  return idx;
})();

// Sector → domain bias (front-office pillars)
const SECTOR_BIASES = {
  'construction': ['commercial', 'corporate'],
  'infrastructure': ['corporate'],
  'hospitality': ['commercial'],
  'agriculture': ['commercial'],
  'sme manufacturing': ['commercial'],
  'trade & services': ['commercial'],
  'consumer/personal': ['consumer'],
  'personal': ['consumer'],
  'leasing': ['consumer'],
  'wealth': ['consumer'],
};

// FIX M8: Tightened keyword regexes to reduce false positives.
// Key changes: removed bare "lc" (too short), tightened "over-invoic" to full
// word, split "branch"/"sod" into specific phrases, removed bare "session"
// and "hr" which matched too broadly, scoped "fx" to limit/breach phrases.
// FIX M7: Further tightening — drop bare "card" (was tagging corporate card
// receivables as consumer); broaden "branch" detection to catch findings
// keyed on BR-NN codes or override patterns; broaden "insider" detection to
// include "insider fraud" and "staff fraud" phrasings.
const KEYWORD_BIASES = [
  { re: /\b(credit\s+card|debit\s+card|consumer\s+card|card\s+(holder|fraud|receivable|portfolio))\b/i, domains: ['consumer'] },
  { re: /\b(leasing|lease\s+facility)\b/i,                        domains: ['consumer'] },
  { re: /\b(wealth|suitability|mis-sell|rm-\d+)\b/i,             domains: ['consumer'] },
  { re: /\b(sme|business\s+banking)\b/i,                          domains: ['commercial'] },
  { re: /\b(trade\s+finance|letter\s+of\s+credit|tbml|over-invoicing)\b/i, domains: ['commercial', 'corporate'] },
  { re: /\b(syndicate|structured\s+finance|large\s+exposure|single-obligor|connected\s+party|related\s+party)\b/i, domains: ['corporate', 'risk'] },
  { re: /\b(treasury|irrbb|alm|repricing|duration\s+gap)\b/i,    domains: ['treasury'] },
  { re: /\beve\s+sensitivity\b|\bnii\s+sensitivity\b/i,           domains: ['treasury'] },
  { re: /\bfx\s+(limit|breach|position|exposure)\b/i,             domains: ['treasury'] },
  { re: /\b(str\b|structuring|smurfing|aml\b|sanctions|pep\b|edd\b|ftra)\b/i, domains: ['compliance'] },
  // Suspense / reconciliation is an Operations function — Compliance gets
  // involved only when the breach is a CBSL guideline violation. Don't
  // auto-tag every reconciliation finding to Compliance.
  { re: /\b(suspense|nostro|clearing\s+ratio|reaging|reconciliation)\b/i, domains: ['operations'] },
  { re: /\b(mje\b|manual\s+journal|tax\s+position|deferred\s+tax)\b/i,   domains: ['finance'] },
  { re: /\b(car\b|capital\s+adequacy|tier\s+1|lcr\b|nsfr\b|basel)\b/i,   domains: ['finance', 'risk'] },
  { re: /\b(sod\s+violation|override\s+concentration|maker[- ]checker)\b/i, domains: ['operations'] },
  // FIX M7: branch detection — was scoped to "branch <score|composite|...>"
  // which missed "BR-14 override pattern" and similar branch-keyed findings.
  { re: /\b(branch\s+(score|composite|control|operation|override|fraud)|BR-\d+|branch\s+code)\b/i, domains: ['operations'] },
  { re: /\b(sim\s+swap|impossible\s+travel|biometric|ato\b|account\s+takeover)\b/i, domains: ['technology', 'consumer'] },
  { re: /\b(access\s+rights?|privileged\s+account|entitlement|dormant\s+account|toxic\s+combo)\b/i, domains: ['technology', 'operations'] },
  { re: /\b(vendor\b|outsourc|third[- ]party\s+risk)\b/i,         domains: ['operations', 'technology'] },
  { re: /\b(conduct\s+case|whistleblower|grievance)\b/i,           domains: ['people', 'risk'] },
  // FIX M7: include "insider fraud", "insider-enabled", "staff fraud", and
  // STF-NN code patterns so findings that don't use the exact phrase
  // "insider risk" still tag through.
  { re: /\b(insider\s+(risk|fraud|enabled)|insider-enabled|rogue\s+staff|staff\s+fraud|stf-\d+)\b/i, domains: ['people', 'operations'] },
];

export function tagFinding(finding, agentId) {
  const tags = new Set();

  // 1) Explicit tags from agent
  if (Array.isArray(finding?.domain_tags)) {
    for (const t of finding.domain_tags) tags.add(t);
  }

  // 2) Keyword heuristics on text fields
  const text = [
    finding?.finding,
    finding?.primary_driver,
    finding?.explanation,
    finding?.pattern_detected,
    finding?.pattern_explanation,
    finding?.risk_interpretation,
    finding?.risk_signal,
    ...(Array.isArray(finding?.secondary_drivers) ? finding.secondary_drivers : []),
  ].filter(Boolean).join(' ');

  for (const { re, domains } of KEYWORD_BIASES) {
    if (re.test(text)) domains.forEach(d => tags.add(d));
  }

  // 3) Sector bias
  const sector = (finding?.sector || '').toLowerCase();
  if (sector && SECTOR_BIASES[sector]) {
    SECTOR_BIASES[sector].forEach(d => tags.add(d));
  }

  // 4) Fallback: agent-level default (this finding at minimum touches the domains that depend on this agent)
  if (tags.size === 0 && agentId && AGENT_TO_DOMAINS[agentId]) {
    AGENT_TO_DOMAINS[agentId].forEach(d => tags.add(d));
  }

  // 5) Always tag Internal Audit Workbench — every finding is in scope for audit
  tags.add('audit');

  return Array.from(tags);
}

// ─── FINDING ENUMERATION ─────────────────────────────────────────────────────
// Walk every agent's result block (from state.agentResults OR demoData) and
// return a flat list: [{ agentId, findingIndex, finding, domainTags }]
const FINDING_ARRAY_KEYS = [
  // Existing agents
  'key_findings',
  'flagged_loans', 'flagged_accounts',
  'structuring_clusters', 'velocity_anomalies', 'network_anomalies',
  'kyc_gaps', 'pep_findings', 'introducer_concentration',
  'growth_anomalies', 'branch_findings',
  'str_queue', 'str_assessments',
  // New Phase 2 agents
  'suitability_flags', 'concentration_flags', 'churn_flags',
  'stale_valuations', 'ltv_breaches', 'double_pledges', 'valuer_concentration',
  'single_obligor_breaches', 'connected_group_breaches', 'shared_director_networks', 'shell_patterns',
  'bucket_gaps', 'rate_scenarios',
  'critical_exit_readiness', 'stale_assessments', 'cbsl_notification_gaps',
  'dormant_privileged', 'review_overdue', 'toxic_combinations', 'sod_conflicts',
  'recurring_subjects', 'overdue_cases', 'whistleblower_clusters',
  // FIX H-1: staffAccess consolidated findings and regReporting variances were
  // missing — their findings were silently dropped from all domain views and exports.
  'cross_layer_subjects', 'toxic_combos', 'variances',
];

// Return a flat array of findings across all agents with domain tags applied.
// Accepts either state.agentResults or demoData — shape is the same.
export function collectFindings(results) {
  const out = [];
  if (!results) return out;
  for (const [agentId, block] of Object.entries(results)) {
    if (!block || typeof block !== 'object') continue;
    for (const key of FINDING_ARRAY_KEYS) {
      const arr = block[key];
      if (!Array.isArray(arr)) continue;
      arr.forEach((f, i) => {
        // Guard each element: a malformed agent result (wrong-shape JSON) can
        // put a null or primitive into a findings array. CC2 validates the live
        // backend path, but demo/injected results are unvalidated — without this
        // guard `f.severity` would throw and blank out every Business view.
        if (!f || typeof f !== 'object' || Array.isArray(f)) return;
        out.push({
          agentId,
          findingIndex: i,
          arrayKey: key,
          finding: f,
          domainTags: tagFinding(f, agentId),
          // primary key_findings get first-class severity treatment
          isKeyFinding: key === 'key_findings',
          severity: f.severity || 'medium',
        });
      });
    }
  }
  return out;
}

export function filterFindingsForDomain(allFindings, domainId) {
  return allFindings.filter(f => f.domainTags.includes(domainId));
}

export function getAgentsTouchedByDomain(domainId, allFindings) {
  const set = new Set();
  for (const f of allFindings) {
    if (f.domainTags.includes(domainId)) set.add(f.agentId);
  }
  return Array.from(set);
}

// ─── SUB-UNIT TAGGING ────────────────────────────────────────────────────────
// Infers the sub-unit within a domain that a finding belongs to, based on
// entity-id prefixes, account/product types, branch codes, and the finding
// text. Heuristic — additive signals — not mutually exclusive; we pick the
// strongest match. Returns the sub-unit id (matching domainRegistry.subUnits)
// or null if no clear match.

const SUB_UNIT_RULES = {
  consumer: [
    { id: 'cards',    match: (s) => /\bcard\b|credit.card|debit.card|amex/i.test(s) },
    { id: 'leasing',  match: (s, f) => /leasing|lease|\bBNK-LS\b/i.test(s) || (f.facility_type || '').toLowerCase().includes('leas') },
    { id: 'wealth',   match: (s) => /\bWM-\d+\b|wealth|portfolio.manager|\bRM-\d+\b|mutual.fund|unit.trust/i.test(s) },
    { id: 'digital',  match: (s) => /digital.banking|mobile.app|nations.direct|online.banking|SIM.swap|impossible.travel/i.test(s) },
    { id: 'personal', match: (s) => /personal.loan|housing.loan|vehicle.loan/i.test(s) },
    { id: 'branches', match: (s) => /\bBR-\d+\b|branch/i.test(s) },
  ],
  commercial: [
    { id: 'trade',         match: (s) => /trade.finance|LC\b|letter.of.credit|invoice|TBML/i.test(s) },
    { id: 'sme',           match: (s) => /\bSME\b|small.business|entrepreneur/i.test(s) },
    { id: 'institutional', match: (s) => /institutional|mid.market/i.test(s) },
    { id: 'ccredit',       match: (s) => /commercial.credit|commercial.loan/i.test(s) },
  ],
  corporate: [
    { id: 'structured',    match: (s) => /syndicat|structured.finance|project.finance/i.test(s) },
    { id: 'transactionbk', match: (s) => /cash.management|transaction.banking|supply.chain/i.test(s) },
    { id: 'corpcredit',    match: (s) => /corporate.credit|working.capital/i.test(s) },
    { id: 'cbanking',      match: (s) => /\bBNK-CORP\b|large.corporate|corporate.banking/i.test(s) },
  ],
  treasury: [
    { id: 'trading', match: (s) => /FX|forex|fixed.income|trading|ALM\b|gap.analysis|IRRBB/i.test(s) },
    { id: 'sales',   match: (s) => /treasury.sales|client.forex/i.test(s) },
    { id: 'alm',     match: (s) => /\bALM\b|IRRBB|repricing|duration.gap/i.test(s) },
    { id: 'investment', match: (s) => /investment.banking|advisory/i.test(s) },
  ],
  risk: [
    { id: 'appetite', match: (s) => /appetite|limit.breach/i.test(s) },
    { id: 'icaap',    match: (s) => /ICAAP|stress.test/i.test(s) },
    { id: 'esrm',     match: (s) => /environmental|ESG|social.risk/i.test(s) },
    { id: 'erm',      match: () => true }, // fallback
  ],
  compliance: [
    { id: 'sanctions', match: (s) => /sanction|OFAC|UN.sanctions/i.test(s) },
    { id: 'pep',       match: (s) => /\bPEP\b|politically.exposed|EDD/i.test(s) },
    { id: 'aml',       match: (s) => /\bAML\b|STR|structuring|money.laundering/i.test(s) },
    { id: 'regulatory',match: () => true }, // fallback
  ],
  finance: [
    { id: 'tax',    match: (s) => /\btax\b|VAT|deferred.tax|transfer.pricing/i.test(s) },
    { id: 'regcap', match: (s) => /\bCAR\b|Tier.1|capital.ratio|LCR|NSFR|Basel/i.test(s) },
    { id: 'frep',   match: (s) => /financial.reporting|journal|\bMJE\b/i.test(s) },
    { id: 'treasury-finance', match: () => true }, // fallback
  ],
  operations: [
    { id: 'recon',     match: (s) => /reconciliation|suspense|nostro|clearing/i.test(s) },
    { id: 'outsource', match: (s) => /vendor|outsourc|third.party/i.test(s) },
    { id: 'branchops', match: (s) => /\bBR-\d+\b|branch.operation/i.test(s) },
    { id: 'service',   match: () => true },
  ],
  technology: [
    { id: 'cyber', match: (s) => /cyber|SIM.swap|ATO|account.takeover|phishing|fraud.identity/i.test(s) },
    { id: 'data',  match: (s) => /data.platform|data.lake|ETL/i.test(s) },
    { id: 'apps',  match: (s) => /application|core.banking|payments.system/i.test(s) },
    { id: 'infra', match: () => true },
  ],
  audit: [
    { id: 'planning',   match: (s) => /audit.plan|materiality|scope/i.test(s) },
    { id: 'continuous', match: (s) => /continuous|monitoring/i.test(s) },
    { id: 'reporting',  match: (s) => /report|disclosure/i.test(s) },
    { id: 'coverage',   match: () => true },
  ],
  people: [
    { id: 'conduct',   match: (s) => /conduct|behaviour|misconduct/i.test(s) },
    { id: 'whistle',   match: (s) => /whistle|grievance/i.test(s) },
    { id: 'workforce', match: () => true },
  ],
};

export function tagFindingSubUnit(finding, domainId) {
  const rules = SUB_UNIT_RULES[domainId];
  if (!rules) return null;
  const f = finding.finding || {};
  const text = [
    f.finding, f.explanation, f.pattern_detected, f.pattern_explanation, f.risk_interpretation,
    f.risk_signal, f.description, f.primary_driver, f.secondary_driver,
    (f.entity_ids || []).join(' '), f.loan_id, f.customer_id, f.account_id, f.branch_code,
    f.user_id, f.vendor_id, f.collateral_id, f.product_id, f.facility_type,
  ].filter(Boolean).join(' ');
  for (const r of rules) {
    if (r.match(text, f)) return r.id;
  }
  return null;
}
