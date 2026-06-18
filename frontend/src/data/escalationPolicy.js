// ─── ESCALATION POLICY (Settings → Notifications) ───────────────────────────
// The bank's documented escalation matrix — who is notified, on what trigger,
// and via which channel. This is a governance artifact (ISA 265 / CBSL
// expectations on communicating control deficiencies): an external auditor asks
// "what is your escalation path when a critical fires?" — this is the answer.
// Delivery (email/in-app push) is a separate integration; this defines the
// policy that such delivery would read.
export const DEFAULT_ESCALATION_POLICY = [
  {
    id: 'critical_case',
    label: 'Critical case opened',
    description: 'A finding is promoted to a critical case.',
    recipients: ['Chief Risk Officer', 'Chief Internal Auditor'],
    channel: 'in-app',
    note: 'Immediate — review within the critical SLA.',
  },
  {
    id: 'regulatory_breach',
    label: 'Regulatory-floor breach',
    description: 'A KRI breaches a CBSL regulatory floor (not just internal appetite).',
    recipients: ['Chief Compliance Officer', 'Chief Executive Officer'],
    channel: 'email',
    note: 'CBSL notification required per the governing directive deadline.',
  },
  {
    id: 'sla_breach',
    label: 'Case SLA breached',
    description: 'An open case exceeds its severity-based SLA on the Audit Plan.',
    recipients: ['Domain Owner', 'Chief Internal Auditor'],
    channel: 'in-app',
    note: 'Escalate per the severity-based SLA policy.',
  },
  {
    id: 'str_eligible',
    label: 'STR-eligible finding',
    description: 'A transaction/trade/fraud finding meets STR criteria.',
    recipients: ['Chief Compliance Officer'],
    channel: 'email',
    note: 'FTRA §7 — file STR with CBSL FIU within 5 working days.',
  },
];

export const ESCALATION_CHANNELS = [
  { id: 'in-app', label: 'In-app' },
  { id: 'email', label: 'Email' },
  { id: 'both', label: 'Both' },
];
