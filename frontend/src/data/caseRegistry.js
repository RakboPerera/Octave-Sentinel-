// ─── SENTINEL CASE LOOKUP REGISTRY ──────────────────────────────────────────
// Single source of truth for finding → case mapping.
// Every component imports from here to resolve case links.

import { SEVERITY_COLORS } from '../utils/severity.js';

// Helper: timestamp N days ago as ISO string. Used to give static demo cases
// realistic `createdAt` values so Command-Centre ageing metrics are meaningful.
const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();

export const CASES = [
  {
    id: 'CASE-001',
    title: 'BR-14 Insider-Enabled Loan Fraud — STF-1847',
    severity: 'critical', status: 'investigating',
    createdAt: daysAgo(12),
    branch_code: 'BR-14', branch_name: 'Ratnapura',
    domains: ['controls', 'credit', 'kyc', 'digital', 'insider', 'mje'],
    finding_ids: ['STF-1847', 'BR-14', 'BNK-CR-2025-0441', 'BNK-CR-2025-0872', 'BNK-CR-2025-1203', 'INT-BR14-007', 'MJE-2026-4201', 'MJE-2026-4205', 'SES-BNK-20251210-6612', 'CORR-001'],
    exposureLkr: 387000000,
    color: '#DC2626',
  },
  {
    id: 'CASE-002',
    title: 'SUS-017 CEFT Phantom Receivable — LKR 1.24 Bn',
    severity: 'critical', status: 'open',
    createdAt: daysAgo(8),
    branch_code: 'BR-72', branch_name: 'Pettah Main St',
    domains: ['suspense', 'transaction', 'digital'],
    finding_ids: ['SUS-017', 'BNK-0841-X', 'DEV-A4F7-9921', 'CORR-002', 'BNK-2209-F'],
    exposureLkr: 1240000000,
    color: '#DC2626',
  },
  {
    id: 'CASE-003',
    title: 'BNK-CORP-0887 Trade-Based Money Laundering',
    severity: 'critical', status: 'investigating',
    createdAt: daysAgo(10),
    branch_code: 'BR-16', branch_name: 'City Office',
    domains: ['trade', 'transaction', 'kyc'],
    finding_ids: ['BNK-CORP-0887', 'INV-2025-3441', 'LC-2025-3341', 'CORR-003'],
    exposureLkr: 421000000,
    color: '#DC2626',
  },
  {
    id: 'CASE-004',
    title: 'BNK-0841-X Structuring — 15 CEFT Transfers',
    severity: 'high', status: 'open',
    createdAt: daysAgo(4),
    branch_code: 'BR-72', branch_name: 'Pettah Main St',
    domains: ['transaction'],
    finding_ids: ['BNK-0841-X'],
    exposureLkr: 71250000,
    color: '#D97706',
  },
  {
    id: 'CASE-005',
    title: 'KYC Gap Remediation — 39,290 Accounts',
    severity: 'high', status: 'open',
    createdAt: daysAgo(14),
    branch_code: null, branch_name: 'Network-wide',
    domains: ['kyc'],
    finding_ids: ['INT-BR14-007', 'INT-BR23-012', 'BNK-C-0041-X', 'BNK-C-3312-B'],
    exposureLkr: 0,
    color: '#D97706',
  },
  {
    id: 'CASE-006',
    title: 'LCR Decline — ALCO Stabilisation Required',
    severity: 'medium', status: 'resolved',
    createdAt: daysAgo(18),
    branch_code: null, branch_name: 'Treasury / Group',
    domains: ['trade'],
    finding_ids: ['LCR-2025', 'NSFR-2025'],
    exposureLkr: 0,
    color: '#185FA5',
  },
  {
    id: 'CASE-007',
    title: 'MJE-2026-4205 GL Manipulation — LKR 185M Loans Receivable',
    severity: 'critical', status: 'open',
    createdAt: daysAgo(9),
    branch_code: 'BR-14', branch_name: 'Ratnapura',
    domains: ['mje', 'controls'],
    finding_ids: ['MJE-2026-4205', 'MJE-2026-4201', 'MJE-2026-4202', 'STF-1847'],
    exposureLkr: 305000000,
    color: '#DC2626',
  },
  {
    id: 'CASE-008',
    title: 'BR-72 Velocity Cluster — LKR 166M Suspicious Flow',
    severity: 'high', status: 'open',
    createdAt: daysAgo(5),
    branch_code: 'BR-72', branch_name: 'Pettah Main St',
    domains: ['transaction', 'digital', 'suspense'],
    finding_ids: ['BNK-0841-X', 'BNK-2209-F', 'SUS-017', 'DEV-A4F7-9921', 'BNK-3312-B'],
    exposureLkr: 166000000,
    color: '#D97706',
  },
  {
    id: 'CASE-009',
    title: 'INV-2025-5881 Gold Under-Invoicing — HS 7108',
    severity: 'high', status: 'open',
    createdAt: daysAgo(11),
    branch_code: 'BR-16', branch_name: 'City Office',
    domains: ['trade', 'kyc'],
    finding_ids: ['INV-2025-5881', 'BNK-CORP-4412'],
    exposureLkr: 147000000,
    color: '#D97706',
  },
  {
    id: 'CASE-010',
    title: 'BR-23 Elevated Controls Risk — STF-2341',
    severity: 'high', status: 'open',
    createdAt: daysAgo(2),
    branch_code: 'BR-23', branch_name: 'Embilipitiya',
    domains: ['controls', 'credit', 'insider'],
    finding_ids: ['STF-2341', 'BR-23', 'BNK-CR-2025-0334', 'BNK-CR-2025-2041', 'INT-BR23-012'],
    exposureLkr: 143000000,
    color: '#D97706',
  },
];

// ─── DEMO-FIXTURE GATE ────────────────────────────────────────────────────────
// The static CASES above are hand-authored demo fixtures. They should ONLY pad
// the case list when the engine hasn't produced any of its own cases — once a
// run exists, showing both would double-count (the engine cases are the truth,
// the fixtures are illustrative). Every consumer that used `state.demoMode ? CASES
// : []` should call this instead, so counts reconcile across Now / Header /
// Sidebar / Investigate / Heatmap / Detection Assurance.
export function fixtureCases(state) {
  const hasEngineCases = Array.isArray(state?.cases) && state.cases.length > 0;
  return (state?.demoMode && !hasEngineCases) ? CASES : [];
}

// ─── LOOKUP HELPERS ───────────────────────────────────────────────────────────

/** Get all cases that mention a given entity ID or branch code */
export function getCasesForEntity(entityId) {
  if (!entityId) return [];
  return CASES.filter(c =>
    c.finding_ids.some(fid => fid.toLowerCase().includes(entityId.toLowerCase()) ||
                              entityId.toLowerCase().includes(fid.toLowerCase())) ||
    c.branch_code === entityId
  );
}

/** Get all cases for a branch code */
export function getCasesForBranch(branchCode) {
  if (!branchCode) return [];
  return CASES.filter(c => c.branch_code === branchCode || c.branch_code === null);
}

/** Get all cases for an audit domain */
export function getCasesForDomain(domain) {
  if (!domain) return [];
  return CASES.filter(c => c.domains.includes(domain));
}

/** Get a single case by ID */
export function getCaseById(id) {
  return CASES.find(c => c.id === id) || null;
}

/** Get cases for a branch × domain combination */
export function getCasesForCell(branchCode, domain) {
  return CASES.filter(c =>
    (c.branch_code === branchCode || c.branch_code === null) &&
    c.domains.includes(domain)
  );
}

/** Severity colours — derived from shared severity constants */
export const CASE_SEV_COLOR = Object.fromEntries(
  Object.entries(SEVERITY_COLORS).map(([k, v]) => [k, v.color])
);
export const CASE_SEV_BG = Object.fromEntries(
  Object.entries(SEVERITY_COLORS).map(([k, v]) => [k, v.bg])
);
export const CASE_STATUS_COLOR = {
  open: '#DC2626', investigating: '#D97706', resolved: '#16A34A', closed: '#9ca3af'
};
