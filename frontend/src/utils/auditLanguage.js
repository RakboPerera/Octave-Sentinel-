// ─── AUDIT-LANGUAGE TRANSLATION ──────────────────────────────────────────────
// The engine speaks statistics (p-values, robust-z, χ²). A Head of Internal Audit
// thinks in materiality, likelihood and "what do I test next". This translates a
// finding's statistical evidence into one plain sentence an auditor can act on,
// so the daily surfaces stay readable while the raw statistics remain available
// for the model-governance audience.

// "1 in N by chance" from a p-value, capped so tiny p reads sensibly.
function oddsPhrase(p) {
  if (!(p > 0)) return 'effectively impossible by chance';
  if (p < 1e-6) return 'vanishingly unlikely by chance (well under 1 in a million)';
  const n = Math.round(1 / p);
  return `roughly a 1-in-${n.toLocaleString()} chance of arising naturally`;
}

// stat: { test, value, df?, p, peerMedian?, mad? }. Returns { headline, action } | null.
export function plainStatistic(stat) {
  if (!stat || !Number.isFinite(stat.p)) return null;
  const odds = oddsPhrase(stat.p);
  if (stat.test === 'robust-z') {
    const z = Math.abs(stat.value || 0);
    return {
      headline: `This value sits about ${z.toFixed(1)} robust standard deviations from the peer norm${stat.peerMedian != null ? ` (peer median ${stat.peerMedian})` : ''} — ${odds}.`,
      action: 'Treat as a genuine outlier, not noise; pull the source record and a small peer sample to confirm.',
    };
  }
  if (String(stat.test || '').startsWith('benford')) {
    return {
      headline: `The digit distribution is materially inconsistent with the natural (Benford) pattern — ${odds}.`,
      action: 'Sample the highest-deviation amount cohorts for supporting documentation; look for fabricated or plug entries.',
    };
  }
  if (stat.test === 'binomial-gap-rate') {
    return {
      headline: `This count is far above what the bank-wide base rate would produce — ${odds}.`,
      action: 'Review the relationship and sample-test the underlying accounts.',
    };
  }
  return {
    headline: `This pattern is statistically significant — ${odds}.`,
    action: 'Confirm against source and test a representative sample.',
  };
}
