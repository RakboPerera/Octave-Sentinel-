// ─── REPORT SERIALIZER (Wave 3) ──────────────────────────────────────────────
// Converts findings into structured, regulator-submittable records. CBSL /
// Board / HoB packs all build on this so the same finding exports the same
// way regardless of which pack it appears in.
//
// Previously the export was free-text — a CBSL submission would need manual
// reformatting. Now each finding emits a row with: entity_id, account, branch,
// amount, severity, regulation, required action, owner role, internal /
// regulatory deadlines, and source agent.

import { AGENT_META } from '../data/agentMeta.js';
import { getDomain } from '../data/domainRegistry.js';
import {
  AGENT_REGULATORY_CITATIONS,
  CONTROL_FAILURE_TEMPLATES,
  generateSla,
} from './trailGenerator.js';
import { canonicalEntityOf, dedupedExposureBreakdown } from './exposureDedup.js';

// FIX L1: Use a random 6-char suffix instead of a per-instance sequential
// counter so concurrent exports from different browser tabs can't produce
// duplicate pack IDs.
// FIX L5: The stamp is precise to the second and the suffix is base36(6),
// giving ~2 billion combinations per second — collision risk is negligible
// for human-driven exports. If pack generation is ever automated to fire at
// rates faster than ~once/second per kind, swap in crypto.randomUUID() (or a
// monotonically-increasing counter persisted in localStorage) for a stronger
// uniqueness guarantee.
export function nextPackId(kind) {
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${kind.toUpperCase()}-${stamp}-${rand}`;
}

// Turn a single finding into the canonical CBSL/Board row shape.
export function serializeFinding(f) {
  const fr = f.finding || {};
  const citations = Array.isArray(fr.regulatory_citations) && fr.regulatory_citations.length > 0
    ? fr.regulatory_citations
    : (AGENT_REGULATORY_CITATIONS[f.agentId] || []);
  const primaryCitation = citations[0];
  const sla = fr.remediation_sla || generateSla(f.agentId, fr);
  const cf = fr.control_failure || CONTROL_FAILURE_TEMPLATES[f.agentId] || null;

  const entity = canonicalEntityOf(f) || (fr.entity_ids || [])[0] || null;

  return {
    // Identification
    record_id: `${f.agentId}::${f.arrayKey || 'key_findings'}::${f.findingIndex}`,
    source_agent: AGENT_META[f.agentId]?.name || f.agentId,
    severity: (f.severity || 'medium').toUpperCase(),
    as_of: fr.as_of_date || null,

    // What & where
    entity_id: entity,
    account: fr.account_id || null,
    customer: fr.customer_id || null,
    loan: fr.loan_id || null,
    branch: fr.branch_code || null,
    domains: (f.domainTags || []).map(id => getDomain(id)?.label || id),

    // Finding + quantification
    finding: fr.finding || fr.explanation || fr.pattern_detected || '',
    // FIX H-2: capital and balance agents use aggregate_exposure_lkr; without it
    // exports showed LKR 0 for those agents while exposureDedup.js counted it correctly.
    amount_lkr: fr.affected_exposure_lkr || fr.affected_balance_lkr || fr.exposure_lkr || fr.aggregate_exposure_lkr || 0,

    // Audit-grade context (all of Wave 1 schema is carried through the export)
    primary_citation: primaryCitation ? formatCitation(primaryCitation) : null,
    all_citations: citations.map(formatCitation),
    control_failure: cf ? {
      id: cf.control_id,
      type: cf.control_type,
      description: cf.description,
      owner_role: cf.owner_role,
    } : null,
    remediation: {
      summary: sla.action_summary,
      owner_role: sla.action_owner_role,
      internal_deadline: sla.internal_deadline,
      regulatory_deadline: sla.regulatory_deadline,
      escalation_policy: sla.escalation_policy,
    },
  };
}

function formatCitation(c) {
  if (!c) return null;
  const ref = [c.regulator, c.directive].filter(Boolean).join(' · ');
  const sec = c.section ? `§${c.section}${c.paragraph ? '(' + c.paragraph + ')' : ''}` : '';
  return {
    regulator: c.regulator,
    directive: c.directive,
    section: sec,
    effective_date: c.effective_date,
    title: c.title,
    relevance: c.relevance,
    display: [ref, sec].filter(Boolean).join(' '),
  };
}

// Build a full pack (JSON + text version) — used for export download.
// dataSource ('engine-output' | 'illustrative-fixtures') records whether the
// findings came from a real deterministic-engine run or the static demo
// fixtures, so an exported artifact never misrepresents its provenance.
export function buildPack({ kind, title, recipient, findings, bankScale, notes, dataSource = 'engine-output' }) {
  const rows = findings.map(serializeFinding);
  const breakdown = dedupedExposureBreakdown(findings);

  const pack = {
    pack_id: nextPackId(kind),
    kind,
    title,
    recipient,
    generated_at: new Date().toISOString(),
    generator: 'Sentinel Business Platform · Reports v2',
    data_source: dataSource,
    bank: {
      name: 'Demo Bank',
      currency: 'LKR',
      total_assets_lkr: bankScale?.totalAssetsLkr ?? null,
      total_loans_lkr: bankScale?.totalLoansLkr ?? null,
      tier1_pct: bankScale?.tier1Pct ?? null,
      lcr_pct: bankScale?.lcrPct ?? null,
    },
    summary: {
      finding_count: rows.length,
      critical_count: rows.filter(r => r.severity === 'CRITICAL').length,
      high_count: rows.filter(r => r.severity === 'HIGH').length,
      unique_entities: breakdown.unique_entities,
      multi_agent_entities: breakdown.multi_agent_entities,
      exposure_lkr_entity_deduped: breakdown.total,
      exposure_overlaps: breakdown.overlaps.slice(0, 10),
    },
    findings: rows,
    notes: notes || null,
  };
  return pack;
}

// Render a pack as CSV (one row per finding) — easy to import in Excel or a
// regulatory submission template.
export function packToCsv(pack) {
  const cols = [
    'record_id', 'severity', 'source_agent', 'entity_id', 'customer', 'loan', 'account', 'branch',
    'amount_lkr', 'domains', 'finding',
    'primary_citation', 'control_id', 'control_type', 'owner_role',
    'internal_deadline', 'regulatory_deadline',
  ];
  const header = cols.join(',');
  const rows = pack.findings.map(r => cols.map(c => csvCell(resolveCell(r, c))).join(','));
  const preamble = [
    `# ${pack.title}`,
    `# Pack ID: ${pack.pack_id}`,
    `# Generated: ${pack.generated_at}`,
    `# Recipient: ${pack.recipient}`,
    `# Bank: ${pack.bank.name}`,
    `# Data source: ${pack.data_source === 'illustrative-fixtures' ? 'ILLUSTRATIVE FIXTURES (engine not yet run on live/demo data)' : 'Deterministic engine output'}`,
    `# Findings: ${pack.summary.finding_count} (${pack.summary.critical_count} critical, ${pack.summary.high_count} high)`,
    `# Entity-deduped exposure: LKR ${pack.summary.exposure_lkr_entity_deduped.toLocaleString()}`,
  ];
  return [...preamble, '', header, ...rows].join('\n');
}

function resolveCell(r, c) {
  if (c === 'domains') return (r.domains || []).join('; ');
  if (c === 'primary_citation') return r.primary_citation?.display || '';
  if (c === 'control_id') return r.control_failure?.id || '';
  if (c === 'control_type') return r.control_failure?.type || '';
  if (c === 'owner_role') return r.control_failure?.owner_role || r.remediation?.owner_role || '';
  if (c === 'internal_deadline') return r.remediation?.internal_deadline || '';
  if (c === 'regulatory_deadline') return r.remediation?.regulatory_deadline || '';
  return r[c] ?? '';
}

function csvCell(v) {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  // FIX L6: also quote on CR (\r) and tab (\t) — CRLF parsers and TSV importers
  // would otherwise split or shift cells silently.
  return /[,"\n\r\t]/.test(s) ? `"${s}"` : s;
}

// Download helper — triggered from the UI Export button.
export function downloadFile(content, filename, mime = 'text/plain;charset=utf-8') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
