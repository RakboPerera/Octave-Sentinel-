// ─── BANK PROFILE (tenant identity + benchmark figures) ──────────────────────
// The bank's identity and the balance-sheet benchmarks that drive materiality
// guardrails and the header context. This is a single editable config object
// (Settings → Bank Profile) so the platform is client-neutral by default — each
// tenant sets its own legal name, short name, and benchmark figures.
//
// Money fields are stored in LKR (not Bn) so they can feed materiality maths
// directly. Defaults are neutral demo figures — replace per tenant.
export const DEFAULT_BANK_PROFILE = {
  name: 'Demo Bank',
  shortName: 'Demo Bank',
  financialYear: 'FY 2025',
  asOfDate: '31 Dec 2025',
  totalAssetsLkr: 700_300_000_000,   // 700.3 Bn
  totalEquityLkr: 96_900_000_000,    // 96.9 Bn
  preTaxProfitLkr: 28_000_000_000,   // ≈ 28 Bn (grossed up from PAT 19.3 Bn @ ~30% tax)
  customerCount: 835_944,
};

// Fields the editor exposes, with type + label, so the form and validation stay
// in one place.
export const BANK_PROFILE_FIELDS = {
  identity: [
    { key: 'name',          label: 'Legal name',     type: 'text', placeholder: 'Demo Bank PLC' },
    { key: 'shortName',     label: 'Short name',     type: 'text', placeholder: 'Demo Bank', hint: 'Shown in the header badge.' },
    { key: 'financialYear', label: 'Financial year', type: 'text', placeholder: 'FY 2025' },
    { key: 'asOfDate',      label: 'As-of date',     type: 'text', placeholder: '31 Dec 2025' },
  ],
  benchmarks: [
    { key: 'totalAssetsLkr',  label: 'Total assets',     type: 'lkrBn', hint: 'ISA 320 materiality is typically 0.5–1% of total assets.' },
    { key: 'totalEquityLkr',  label: 'Total equity',     type: 'lkrBn' },
    { key: 'preTaxProfitLkr', label: 'Pre-tax profit',   type: 'lkrBn' },
    { key: 'customerCount',   label: 'Customer count',   type: 'int' },
  ],
};
