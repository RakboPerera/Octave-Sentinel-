// ─── DOMAIN REGISTRY ─────────────────────────────────────────────────────────
// Structural definition of Demo Bank's 11 business domains for the Business Platform.
// Zero hardcoded scale numbers — all figures derive from agent outputs via
// domainAggregations.js. This file is pure configuration: who owns a domain
// (role label only, no names), which agents feed it, what risk vectors it
// faces, and which regulatory regime applies.

// ─── DOMAIN GROUP LABELS ──────────────────────────────────────────────────────
export const GROUP_LABELS = {
  'front-office':   'Front Office — Customer Pillars',
  'control-support': 'Control & Support Functions',
};

// ─── DOMAINS ──────────────────────────────────────────────────────────────────
// Each entry is self-describing. The deep-dive template reads this object.
// `agentsPrimary` are first-line feeds, `agentsSecondary` provide cross-signals.
// `riskVectors` drive the coverage matrix. `gap: 'partial' | 'not-covered'` is
// honest about where Sentinel still has blind spots.
export const DOMAINS = [
  // ─── FRONT OFFICE ─────────────────────────────────────────────────────────
  {
    id: 'consumer',
    label: 'Consumer Banking',
    group: 'front-office',
    ownerRole: 'Head of Consumer Banking',
    pitch: 'Retail banking for individuals — savings, cards, leasing, personal loans, wealth management, digital channels.',
    subUnits: [
      { id: 'cards',    label: 'Cards & Consumer Assets' },
      { id: 'leasing',  label: 'Leasing' },
      { id: 'branches', label: 'Branch Network' },
      { id: 'wealth',   label: 'Consumer Portfolio & Wealth' },
      { id: 'digital',  label: 'Digital Banking' },
      { id: 'personal', label: 'Personal Loans' },
    ],
    agentsPrimary:   ['credit', 'creditFraud', 'digital', 'kyc', 'staffAccess', 'wealth'],
    agentsSecondary: ['transaction'],
    riskVectors: [
      { id: 'slfrs9',       label: 'SLFRS 9 Staging & ECL',         primaryAgents: ['credit'],              severity: 'high' },
      { id: 'origination-fraud', label: 'Origination Fraud & FPD',  primaryAgents: ['creditFraud'],          severity: 'high' },
      { id: 'card-fraud',   label: 'Card & Digital Fraud',          primaryAgents: ['digital','transaction'], severity: 'high' },
      { id: 'onboarding',   label: 'Onboarding & KYC Integrity',    primaryAgents: ['kyc'],                  severity: 'medium' },
      { id: 'branch-sod',   label: 'Branch SoD & Overrides',        primaryAgents: ['staffAccess'],          severity: 'high' },
      { id: 'wealth-suit',  label: 'Wealth Suitability & Mis-sell', primaryAgents: ['wealth'],               severity: 'medium' },
      { id: 'leasing-rv',   label: 'Leasing Residual Values',       primaryAgents: ['credit','collateral'],  severity: 'medium' },
    ],
    regulatoryTags: ['SLFRS 9', 'CBSL KYC', 'FTRA', 'CBSL 5/2024', 'CBSL 2/2025'],
  },
  {
    id: 'commercial',
    label: 'Commercial Banking',
    group: 'front-office',
    ownerRole: 'Head of Commercial Banking',
    pitch: 'Banking for entrepreneurs, SMEs and mid-market corporates — trade finance, term loans, leasing, business banking.',
    subUnits: [
      { id: 'sme',           label: 'SME Banking' },
      { id: 'institutional', label: 'Institutional Banking' },
      { id: 'trade',         label: 'Commercial Trade Finance' },
      { id: 'ccredit',       label: 'Commercial Credit' },
    ],
    agentsPrimary:   ['credit', 'creditFraud', 'trade', 'kyc', 'collateral'],
    agentsSecondary: ['transaction', 'connectedParty', 'staffAccess'],
    riskVectors: [
      { id: 'sme-concentration', label: 'SME Sector Concentration',     primaryAgents: ['credit'],              severity: 'high' },
      { id: 'origination-fraud', label: 'Origination Fraud & FPD',     primaryAgents: ['creditFraud'],          severity: 'high' },
      { id: 'tbml',              label: 'Trade-Based Money Laundering', primaryAgents: ['trade'],               severity: 'high' },
      { id: 'collateral',        label: 'Collateral Quality & LTV',     primaryAgents: ['collateral'],          severity: 'high' },
      { id: 'introducer',        label: 'Introducer Integrity',         primaryAgents: ['kyc'],                 severity: 'medium' },
      { id: 'restructure',       label: 'Restructure & Forbearance',    primaryAgents: ['credit'],              severity: 'medium' },
    ],
    regulatoryTags: ['SLFRS 9', 'FATF TBML', 'CBSL KYC', 'CBSL Large Exposures'],
  },
  {
    id: 'corporate',
    label: 'Corporate Banking',
    group: 'front-office',
    ownerRole: 'Head of Corporate Banking',
    pitch: 'Banking for large corporates — working capital, structured finance, syndications, transaction banking, cash management.',
    subUnits: [
      { id: 'cbanking',      label: 'Corporate Banking' },
      { id: 'structured',    label: 'Structured Finance & Syndicates' },
      { id: 'transactionbk', label: 'Transaction Banking' },
      { id: 'corpcredit',    label: 'Corporate Credit' },
    ],
    agentsPrimary:   ['credit', 'creditFraud', 'trade', 'transaction', 'connectedParty', 'collateral'],
    agentsSecondary: ['kyc', 'staffAccess'],
    riskVectors: [
      { id: 'single-obligor', label: 'Single-Obligor & Large Exposure', primaryAgents: ['connectedParty','credit'], severity: 'high' },
      { id: 'connected',      label: 'Connected Party & Related Party', primaryAgents: ['connectedParty'],          severity: 'high' },
      { id: 'syndication',    label: 'Syndication & Structured Risk',   primaryAgents: ['credit','trade'],          severity: 'medium' },
      { id: 'corp-structuring', label: 'Transaction Structuring',       primaryAgents: ['transaction'],             severity: 'medium' },
    ],
    regulatoryTags: ['CBSL Large Exposures', 'CBSL Related Parties', 'SLFRS 9', 'FTRA'],
  },
  {
    id: 'treasury',
    label: 'Treasury & Investment Banking',
    group: 'front-office',
    ownerRole: 'Head of Treasury',
    pitch: 'Balance-sheet management, FX trading, fixed income, ALM, liquidity buffers, investment banking advisory.',
    subUnits: [
      { id: 'trading',    label: 'Treasury Trading & ALM' },
      { id: 'sales',      label: 'Treasury Sales' },
      { id: 'alm',        label: 'Asset-Liability Management' },
      { id: 'investment', label: 'Investment Banking' },
    ],
    agentsPrimary:   ['trade', 'mje', 'transaction', 'alm'],
    agentsSecondary: ['staffAccess', 'capital'],
    riskVectors: [
      { id: 'fx-limits', label: 'FX Position Limits',               primaryAgents: ['trade'],        severity: 'high' },
      { id: 'irrbb',     label: 'Interest Rate Risk (IRRBB) & ALM', primaryAgents: ['alm'],          severity: 'high' },
      { id: 'mtm',       label: 'Mark-to-Market Valuation',         primaryAgents: ['trade','mje'],  severity: 'medium' },
      { id: 'liquidity', label: 'Liquidity Bucket Monitoring',      primaryAgents: ['alm','capital'],severity: 'medium' },
    ],
    regulatoryTags: ['Basel III', 'CBSL Liquidity', 'CBSL FX'],
  },

  // ─── CONTROL & SUPPORT ────────────────────────────────────────────────────
  {
    id: 'risk',
    label: 'Risk',
    group: 'control-support',
    ownerRole: 'Chief Risk Officer',
    pitch: 'Enterprise risk oversight — credit, market, operational, liquidity, ESRM, ICAAP.',
    subUnits: [
      { id: 'erm',         label: 'Enterprise Risk Management' },
      { id: 'appetite',    label: 'Risk Appetite' },
      { id: 'icaap',       label: 'ICAAP & Stress Testing' },
      { id: 'esrm',        label: 'Environmental & Social Risk' },
    ],
    agentsPrimary:   ['credit', 'capital', 'balance', 'alm', 'regReporting', 'connectedParty'],
    // MJE is routed here as secondary because manual journals that touch
    // provisioning or related-party GLs are risk-book issues, not purely
    // finance-reporting issues. Fix for the "MJE only tagged to Finance"
    // orphan-signal bug.
    agentsSecondary: ['transaction', 'staffAccess', 'trade', 'creditFraud', 'mje'],
    riskVectors: [
      { id: 'appetite-breach',  label: 'Risk Appetite Breaches',      primaryAgents: ['credit','capital'], severity: 'high' },
      { id: 'concentration',    label: 'Concentration Risk',          primaryAgents: ['credit','connectedParty'], severity: 'high' },
      { id: 'stress',           label: 'Stress-Test Sensitivity',     primaryAgents: ['capital','alm'], severity: 'medium' },
      { id: 'heatmap-drift',    label: 'Heatmap Drift & Emerging',    primaryAgents: ['credit','trade','digital'], severity: 'medium' },
      // New: vintage quality is a forward-looking credit risk that was
      // previously orphaned in the Credit agent's output — it now surfaces
      // here as a dedicated risk vector so the CRO sees it.
      { id: 'vintage-quality',  label: 'Credit Vintage Quality & Forward ECL', primaryAgents: ['credit','creditFraud'], severity: 'high' },
    ],
    regulatoryTags: ['Basel III', 'CBSL ICAAP', 'SLFRS S1/S2', 'SLFRS 9'],
  },
  {
    id: 'compliance',
    label: 'Compliance & Financial Crime',
    group: 'control-support',
    ownerRole: 'Chief Compliance Officer',
    pitch: 'AML, KYC, sanctions, FTRA, PEP screening, regulatory correspondence, STR pipeline.',
    subUnits: [
      { id: 'aml',       label: 'AML Operations' },
      { id: 'sanctions', label: 'Sanctions Screening' },
      { id: 'pep',       label: 'PEP / EDD' },
      { id: 'regulatory', label: 'Regulatory Liaison' },
    ],
    agentsPrimary:   ['kyc', 'transaction', 'suspense', 'digital', 'regReporting'],
    // MJE added as secondary — manual journals to related-party GLs are a
    // compliance concern (CBSL Direction No. 03/2018 related-party rules).
    agentsSecondary: ['staffAccess', 'mje', 'connectedParty'],
    riskVectors: [
      { id: 'str',       label: 'STR Pipeline',                primaryAgents: ['transaction','suspense','kyc'], severity: 'high' },
      { id: 'reg-returns', label: 'Regulatory Returns Integrity', primaryAgents: ['regReporting'],            severity: 'high' },
      { id: 'sanctions-hits', label: 'Sanctions Hit Quality',  primaryAgents: ['kyc'],    severity: 'high' },
      { id: 'pep-edd',   label: 'PEP EDD Currency',            primaryAgents: ['kyc'],    severity: 'medium' },
      { id: 'structuring', label: 'Structuring Detection',     primaryAgents: ['transaction'], severity: 'high' },
    ],
    regulatoryTags: ['FTRA', 'CBSL KYC', 'FATF', 'UN Sanctions', 'CBSL Banking Act §46A'],
  },
  {
    id: 'finance',
    label: 'Finance & Capital',
    group: 'control-support',
    ownerRole: 'Chief Financial Officer',
    pitch: 'Financial reporting, regulatory capital, liquidity ratios, journal integrity, tax positions.',
    subUnits: [
      { id: 'frep',    label: 'Financial Reporting' },
      { id: 'regcap',  label: 'Regulatory Capital' },
      { id: 'treasury-finance', label: 'Treasury Finance' },
      { id: 'tax',     label: 'Tax' },
    ],
    agentsPrimary:   ['mje', 'capital', 'balance', 'credit', 'regReporting'],
    agentsSecondary: ['staffAccess', 'suspense'],
    riskVectors: [
      { id: 'mje-anomaly',  label: 'MJE Anomalies',          primaryAgents: ['mje'],     severity: 'high' },
      { id: 'car-impact',   label: 'Capital Adequacy Impact',primaryAgents: ['capital','credit'], severity: 'high' },
      { id: 'reg-returns',  label: 'Regulatory Returns Integrity', primaryAgents: ['regReporting'], severity: 'high' },
      { id: 'tax-positions',label: 'Tax Position Integrity', primaryAgents: ['mje'],     severity: 'medium' },
      { id: 'bs-drivers',   label: 'Balance-Sheet Drivers',  primaryAgents: ['balance'], severity: 'medium' },
    ],
    regulatoryTags: ['Basel III', 'SLFRS', 'CBSL Financial Reporting', 'CBSL Banking Act §46A'],
  },
  {
    id: 'operations',
    label: 'Operations & Service Delivery',
    group: 'control-support',
    ownerRole: 'Head of Operations',
    pitch: 'Branch operations, service delivery, reconciliation, settlements, outsourcing.',
    subUnits: [
      { id: 'branchops',  label: 'Branch Operations' },
      { id: 'service',    label: 'Service Delivery' },
      { id: 'recon',      label: 'Reconciliation & Settlements' },
      { id: 'outsource',  label: 'Outsourcing Management' },
    ],
    agentsPrimary:   ['staffAccess', 'suspense', 'digital', 'thirdParty'],
    agentsSecondary: [],
    riskVectors: [
      { id: 'recon-age',    label: 'Reconciliation Ageing',     primaryAgents: ['suspense'],   severity: 'high' },
      { id: 'branch-ops',   label: 'Branch Operations Controls',primaryAgents: ['staffAccess'],severity: 'medium' },
      { id: 'vendor-conc',  label: 'Vendor Concentration',      primaryAgents: ['thirdParty'], severity: 'medium' },
      { id: 'digital-ops',  label: 'Digital Channel Operations',primaryAgents: ['digital'],    severity: 'medium' },
    ],
    regulatoryTags: ['CBSL Suspense', 'CBSL 5/2024', 'CBSL Outsourcing'],
  },
  {
    id: 'technology',
    label: 'Technology & Cybersecurity',
    group: 'control-support',
    ownerRole: 'Chief Information Officer & CISO',
    pitch: 'Infrastructure, application delivery, data platforms, cybersecurity, identity management.',
    subUnits: [
      { id: 'infra',     label: 'Infrastructure' },
      { id: 'apps',      label: 'Application Delivery' },
      { id: 'cyber',     label: 'Cybersecurity' },
      { id: 'data',      label: 'Data Platforms' },
    ],
    agentsPrimary:   ['digital', 'staffAccess', 'thirdParty'],
    agentsSecondary: [],
    riskVectors: [
      { id: 'identity-fraud',label: 'Identity Fraud & ATO',    primaryAgents: ['digital'],      severity: 'high' },
      { id: 'access-rights', label: 'Access Rights & Privilege',primaryAgents: ['staffAccess'], severity: 'high' },
      { id: 'session',       label: 'Session Anomalies',       primaryAgents: ['digital'],      severity: 'medium' },
      { id: 'vendor-cyber',  label: 'Third-Party Cyber Risk',  primaryAgents: ['thirdParty'],   severity: 'medium' },
    ],
    regulatoryTags: ['CBSL 2/2025', 'CBSL Cyber', 'ISO 27001'],
  },
  {
    id: 'audit',
    label: 'Internal Audit Workbench',
    group: 'control-support',
    ownerRole: 'Chief Internal Auditor',
    pitch: 'Cross-domain audit planning, coverage mapping, continuous assurance, regulatory reporting.',
    subUnits: [
      { id: 'planning',  label: 'Audit Planning' },
      { id: 'coverage',  label: 'Coverage Mapping' },
      { id: 'continuous',label: 'Continuous Assurance' },
      { id: 'reporting', label: 'Audit Reporting' },
    ],
    agentsPrimary:   ['credit','creditFraud','transaction','suspense','kyc','staffAccess','digital','trade','mje','capital','balance','wealth','collateral','connectedParty','alm','thirdParty','conduct','regReporting'],
    agentsSecondary: [],
    riskVectors: [
      { id: 'coverage-gaps',    label: 'Coverage Gap Detection',          primaryAgents: [],              severity: 'high' },
      { id: 'plan-sign',        label: 'Plan Sign-off & Materiality',     primaryAgents: [],              severity: 'medium' },
      { id: 'continuous-mon',   label: 'Continuous Monitoring',           primaryAgents: [],              severity: 'medium' },
      { id: 'reporting-integrity', label: 'Regulatory Reporting Integrity', primaryAgents: ['regReporting'], severity: 'high' },
      { id: 'origination-risk', label: 'Origination Fraud Oversight',     primaryAgents: ['creditFraud'], severity: 'high' },
    ],
    regulatoryTags: ['ISA 315', 'ISA 320', 'ISA 330', 'CBSL Banking Act §46A'],
  },
  {
    id: 'people',
    label: 'People & Conduct',
    group: 'control-support',
    ownerRole: 'Chief People Officer',
    pitch: 'Workforce, conduct, grievance, whistleblowing, insider-risk adjacent behaviour.',
    subUnits: [
      { id: 'workforce', label: 'Workforce' },
      { id: 'conduct',   label: 'Conduct & Grievance' },
      { id: 'whistle',   label: 'Whistleblowing' },
    ],
    agentsPrimary:   ['staffAccess', 'conduct'],
    agentsSecondary: [],
    riskVectors: [
      { id: 'conduct',       label: 'Conduct Breaches',       primaryAgents: ['conduct'],  severity: 'high' },
      { id: 'whistleblower', label: 'Whistleblower Patterns', primaryAgents: ['conduct'],  severity: 'medium' },
      { id: 'insider-behav', label: 'Insider-Risk Behaviour', primaryAgents: ['staffAccess'], severity: 'high' },
    ],
    regulatoryTags: ['CBSL 5/2024', 'Labour Act'],
  },
];

export const DOMAINS_BY_ID = DOMAINS.reduce((acc, d) => { acc[d.id] = d; return acc; }, {});

export function getDomainsByGroup(group) {
  return DOMAINS.filter(d => d.group === group);
}

export function getDomain(id) {
  return DOMAINS_BY_ID[id] || null;
}
