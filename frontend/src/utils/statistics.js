// ─── STATISTICS — the deterministic math spine for the detection engine ──────
// Pure, dependency-free, side-effect-free. NO Date / Math.random, so anything
// built on it stays byte-reproducible (the engine's core property). Every
// function is a plain mathematical transform of its inputs.
//
// Why this exists: the engine used fixed cutoffs ("flag if ≥ 70%") and a
// heuristic confidence ("0.6 + margin"). Those aren't defensible to a regulator.
// These primitives let detectors decide with TRANSPARENT statistics instead —
// robust z-scores (resistant to outliers), real tail probabilities (p-values),
// false-discovery-rate control, and calibration — all explainable and grounded.
//
// Implementations follow standard references:
//   • erf/erfc — Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7)
//   • incomplete gamma (chi-square, Poisson tails) — Numerical Recipes gser/gcf
//   • Benjamini–Hochberg (1995) step-up FDR
//   • Pool-Adjacent-Violators isotonic regression (Ayer et al. 1955)

// ─── DESCRIPTIVE ─────────────────────────────────────────────────────────────
function clean(values) {
  const out = [];
  for (const v of values || []) if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  return out;
}

export function mean(values) {
  const v = clean(values);
  if (!v.length) return null;
  return v.reduce((s, x) => s + x, 0) / v.length;
}

export function median(values) {
  const v = clean(values).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Linear-interpolation quantile (type-7, R/d3 default). p in [0,1].
export function quantile(values, p) {
  const v = clean(values).sort((a, b) => a - b);
  if (!v.length) return null;
  if (p <= 0) return v[0];
  if (p >= 1) return v[v.length - 1];
  const idx = (v.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return v[lo];
  return v[lo] + (idx - lo) * (v[hi] - v[lo]);
}

// Standard deviation. sample=true → divide by n-1 (default), else n.
export function stdev(values, { sample = true } = {}) {
  const v = clean(values);
  const n = v.length;
  if (n < (sample ? 2 : 1)) return null;
  const m = v.reduce((s, x) => s + x, 0) / n;
  const ss = v.reduce((s, x) => s + (x - m) ** 2, 0);
  return Math.sqrt(ss / (sample ? n - 1 : n));
}

// Median Absolute Deviation: median(|x − median(x)|). A robust scale estimate —
// unlike stdev, a few extreme outliers don't inflate it, so an outlier is judged
// against the BULK of the data, not against a spread the outlier itself widened.
export function mad(values) {
  const v = clean(values);
  if (!v.length) return null;
  const med = median(v);
  return median(v.map(x => Math.abs(x - med)));
}

export function iqr(values) {
  const q1 = quantile(values, 0.25), q3 = quantile(values, 0.75);
  if (q1 == null || q3 == null) return null;
  return q3 - q1;
}

// ─── ROBUST OUTLIER DETECTION ────────────────────────────────────────────────
// Iglewicz–Hoaglin modified z-score: 0.6745·(x − median)/MAD. The 0.6745 makes
// it comparable to a standard z under normality (0.6745 = Φ⁻¹(0.75)). Robust to
// outliers (uses median + MAD, not mean + stdev). |Mᵢ| > 3.5 is the published
// outlier rule of thumb. Returns 0 when MAD = 0 (no dispersion → can't judge),
// which is the false-positive-safe choice.
export function modifiedZ(x, med, madVal) {
  if (!Number.isFinite(x) || !Number.isFinite(med) || !Number.isFinite(madVal) || madVal <= 0) return 0;
  return (0.6745 * (x - med)) / madVal;
}

// Convenience: modified-z of x against a population array.
export function modifiedZAgainst(x, values) {
  const med = median(values), m = mad(values);
  return { z: modifiedZ(x, med, m), median: med, mad: m };
}

// Tukey fences for outlier flagging. k = 1.5 (outlier), 3 (far-out).
export function tukeyFences(values, k = 1.5) {
  const q1 = quantile(values, 0.25), q3 = quantile(values, 0.75);
  if (q1 == null || q3 == null) return null;
  const spread = q3 - q1;
  return { q1, q3, iqr: spread, lower: q1 - k * spread, upper: q3 + k * spread };
}

// Fraction of values ≤ x, in [0,1].
export function percentileRank(x, values) {
  const v = clean(values);
  if (!v.length) return null;
  let c = 0;
  for (const y of v) if (y <= x) c++;
  return c / v.length;
}

// ─── SPECIAL FUNCTIONS (for exact tail probabilities) ────────────────────────
// Lanczos log-gamma.
function gammaln(xx) {
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = xx, y = xx;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y += 1; ser += cof[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// Regularized lower incomplete gamma P(a,x) via series (Numerical Recipes gser).
function gser(a, x) {
  if (x <= 0) return 0;
  const gln = gammaln(a);
  let ap = a, sum = 1 / a, del = sum;
  for (let n = 0; n < 300; n++) {
    ap += 1; del *= x / ap; sum += del;
    if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

// Regularized upper incomplete gamma Q(a,x) via continued fraction (gcf).
function gcf(a, x) {
  const gln = gammaln(a);
  const FPMIN = 1e-300;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

// P(a,x) lower regularized incomplete gamma.
export function gammaLower(a, x) {
  if (x < 0 || a <= 0) return NaN;
  return x < a + 1 ? gser(a, x) : 1 - gcf(a, x);
}
// Q(a,x) upper regularized incomplete gamma.
export function gammaUpper(a, x) {
  if (x < 0 || a <= 0) return NaN;
  return x < a + 1 ? 1 - gser(a, x) : gcf(a, x);
}

// ─── DISTRIBUTION TAILS (p-values) ───────────────────────────────────────────
// erf via A&S 7.1.26.
function erf(x) {
  const s = x < 0 ? -1 : 1; const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return s * y;
}

// Upper-tail of the standard normal: P(Z ≥ z) = 1 − Φ(z).
export function normalSf(z) {
  if (!Number.isFinite(z)) return z > 0 ? 0 : 1;
  return 0.5 * (1 - erf(z / Math.SQRT2));
}
// Two-sided normal p-value from a z-score.
export function normalTwoSidedP(z) { return Math.min(1, 2 * normalSf(Math.abs(z))); }

// Upper-tail chi-square: P(χ²_df ≥ x) = Q(df/2, x/2).
export function chiSquareSf(x, df) {
  if (!(x >= 0) || !(df > 0)) return NaN;
  return gammaUpper(df / 2, x / 2);
}

// Poisson upper tail P(X ≥ k | λ) = P(k, λ) (regularized lower incomplete gamma).
// For "is this count of events surprisingly high vs the base rate λ?".
export function poissonSf(k, lambda) {
  if (lambda <= 0) return k <= 0 ? 1 : 0;
  if (k <= 0) return 1;
  return gammaLower(k, lambda);
}

// Binomial upper tail P(X ≥ k | n, p) = Σ_{i=k}^{n} C(n,i) pⁱ (1−p)ⁿ⁻ⁱ.
export function binomialSf(k, n, p) {
  if (n <= 0) return 0;
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return k <= 0 ? 1 : 0;
  if (p >= 1) return 1;
  const lp = Math.log(p), lq = Math.log(1 - p);
  let s = 0;
  for (let i = k; i <= n; i++) {
    const logC = gammaln(n + 1) - gammaln(i + 1) - gammaln(n - i + 1);
    s += Math.exp(logC + i * lp + (n - i) * lq);
  }
  return Math.min(1, Math.max(0, s));
}

// ─── MULTIPLE-TESTING CONTROL (Benjamini–Hochberg FDR) ───────────────────────
// Given m p-values from m independent anomaly tests, controls the expected
// proportion of false discoveries at level q. Without it, running many tests
// over a large population guarantees spurious "findings". Returns, aligned to
// the INPUT order: { significant, pAdjusted }, plus the rejection threshold.
// significant[i] is true iff test i is a discovery at FDR q.
export function benjaminiHochberg(pvalues, q = 0.05) {
  const m = pvalues.length;
  if (!m) return { significant: [], pAdjusted: [], threshold: null, discoveries: 0 };
  const order = pvalues.map((p, i) => ({ p: Number.isFinite(p) ? p : 1, i })).sort((a, b) => a.p - b.p);
  // Step-up: largest rank k (1-based) with p(k) ≤ (k/m)·q ⇒ reject ranks 1..k.
  let kMax = 0, threshold = null;
  for (let r = 1; r <= m; r++) {
    if (order[r - 1].p <= (r / m) * q) { kMax = r; threshold = order[r - 1].p; }
  }
  // BH-adjusted p-values (monotone from the largest rank down).
  const adjSorted = new Array(m);
  let prev = 1;
  for (let r = m; r >= 1; r--) {
    const adj = Math.min(prev, (m / r) * order[r - 1].p);
    adjSorted[r - 1] = adj; prev = adj;
  }
  const significant = new Array(m).fill(false);
  const pAdjusted = new Array(m).fill(1);
  for (let r = 1; r <= m; r++) {
    const idx = order[r - 1].i;
    pAdjusted[idx] = adjSorted[r - 1];
    if (r <= kMax) significant[idx] = true;
  }
  return { significant, pAdjusted, threshold, discoveries: kMax };
}

// ─── ISOTONIC REGRESSION (Pool-Adjacent-Violators) ───────────────────────────
// Fits a monotone non-decreasing step function — used in S4 to calibrate
// reported confidence to OBSERVED precision (so "0.8 confidence" really means
// "~80% confirmed"). points: [{x, y, weight?}]. Returns the fitted y aligned to
// x-sorted order, the sorted xs, and a calibrate(x) interpolator.
export function isotonicRegression(points) {
  const pts = (points || [])
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map(p => ({ x: p.x, y: p.y, w: Number.isFinite(p.weight) && p.weight > 0 ? p.weight : 1 }))
    .sort((a, b) => a.x - b.x);
  if (!pts.length) return { x: [], y: [], calibrate: () => null };
  // PAV: maintain a stack of blocks {sumWY, sumW, n, value}; merge left while the
  // previous block's value exceeds the new one (monotonicity violated).
  const stack = [];
  for (const p of pts) {
    let blk = { sumWY: p.w * p.y, sumW: p.w, n: 1, value: p.y };
    while (stack.length && stack[stack.length - 1].value > blk.value) {
      const last = stack.pop();
      blk = { sumWY: last.sumWY + blk.sumWY, sumW: last.sumW + blk.sumW, n: last.n + blk.n, value: 0 };
      blk.value = blk.sumWY / blk.sumW;
    }
    stack.push(blk);
  }
  const fitted = [];
  for (const blk of stack) for (let i = 0; i < blk.n; i++) fitted.push(blk.value);
  const xs = pts.map(p => p.x);
  const calibrate = (x) => {
    if (x <= xs[0]) return fitted[0];
    if (x >= xs[xs.length - 1]) return fitted[fitted.length - 1];
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i]) {
        const span = xs[i] - xs[i - 1] || 1;
        return fitted[i - 1] + ((x - xs[i - 1]) / span) * (fitted[i] - fitted[i - 1]);
      }
    }
    return fitted[fitted.length - 1];
  };
  return { x: xs, y: fitted, calibrate };
}

// ─── DISTRIBUTION DRIFT (model governance) ───────────────────────────────────
// Population Stability Index between a baseline and a current sample, over the
// baseline's quantile bins. PSI < 0.1 = stable, 0.1–0.25 = moderate shift,
// > 0.25 = significant shift (recalibrate). Returns { psi, bins }.
export function psi(baseline, current, bins = 10) {
  const b = clean(baseline), c = clean(current);
  if (b.length < bins || c.length < 1) return { psi: null, bins: [] };
  // Bin edges from baseline quantiles (equal-frequency).
  const edges = [];
  for (let i = 1; i < bins; i++) edges.push(quantile(b, i / bins));
  const bucket = (x) => { let i = 0; while (i < edges.length && x > edges[i]) i++; return i; };
  const bCount = new Array(bins).fill(0), cCount = new Array(bins).fill(0);
  for (const x of b) bCount[bucket(x)]++;
  for (const x of c) cCount[bucket(x)]++;
  let total = 0; const detail = [];
  for (let i = 0; i < bins; i++) {
    const bp = bCount[i] / b.length || 0, cp = cCount[i] / c.length || 0;
    const bpA = Math.max(bp, 1e-4), cpA = Math.max(cp, 1e-4); // avoid log(0)
    const contrib = (cpA - bpA) * Math.log(cpA / bpA);
    total += contrib;
    detail.push({ bin: i, basePct: Math.round(bp * 1000) / 1000, currPct: Math.round(cp * 1000) / 1000, contrib: Math.round(contrib * 1000) / 1000 });
  }
  return { psi: Math.round(total * 1000) / 1000, bins: detail };
}

// Two-sample Kolmogorov–Smirnov statistic D (max CDF gap) + asymptotic p-value.
export function ksTwoSample(a, b) {
  const x = clean(a).sort((p, q) => p - q), y = clean(b).sort((p, q) => p - q);
  if (!x.length || !y.length) return { d: null, p: null };
  const all = [...x, ...y].sort((p, q) => p - q);
  let i = 0, j = 0, d = 0;
  for (const v of all) {
    while (i < x.length && x[i] <= v) i++;
    while (j < y.length && y[j] <= v) j++;
    d = Math.max(d, Math.abs(i / x.length - j / y.length));
  }
  const n = (x.length * y.length) / (x.length + y.length);
  // Kolmogorov asymptotic survival: Q(λ) = 2 Σ (-1)^{k-1} e^{-2k²λ²}.
  const lambda = (Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * d;
  let p = 0; for (let k = 1; k <= 100; k++) p += (k % 2 ? 1 : -1) * Math.exp(-2 * k * k * lambda * lambda);
  p = Math.max(0, Math.min(1, 2 * p));
  return { d: Math.round(d * 1000) / 1000, p: Math.round(p * 1e6) / 1e6 };
}

// ─── GEO ─────────────────────────────────────────────────────────────────────
// Great-circle distance (km) between two lat/long points. For "impossible
// travel": distance ÷ elapsed time vs a feasible speed.
export function haversineKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
