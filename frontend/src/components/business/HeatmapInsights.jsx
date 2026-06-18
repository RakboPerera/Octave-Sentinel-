import React, { useMemo } from 'react';
import { getDomain } from '../../data/domainRegistry.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import InfoHint from './InfoHint.jsx';
import { Flame, Target, MapPin, AlertOctagon } from 'lucide-react';

// ─── HEATMAP INSIGHTS ───────────────────────────────────────────────────────
// A compact strip of metrics computed directly from the heatmap matrix. Sits
// above the matrix on the Command Centre. Every number links back to a cell
// or domain in the matrix, so the auditor can go from summary → detail in one
// click.
//
// Props:
//   matrix       — the heatmap matrix (domainId → category → { criticals, highs, mediums, exposure, findings[] })
//   onPickCell   — (domainId, category) => void — same handler the matrix uses
//   onPickDomain — domainId => void
export default function HeatmapInsights({ matrix, entityExposure, onPickCell, onPickDomain }) {
  const insights = useMemo(() => computeInsights(matrix), [matrix]);
  if (!insights) return null;

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Flame size={11} style={{ color: '#C41E3A' }} />
        Heatmap summary
        <InfoHint
          title="Heatmap summary"
          text="Metrics derived from the matrix below. Every number is clickable — opens the relevant cell or domain drill-down. These count detection FINDINGS (each unique finding once across the matrix), which is why the headline can exceed the header's 'Critical' badge — that badge counts open critical CASES, and several findings can roll into one case. Per-domain and per-category sub-counts are cell-level, so they can total more than the headline (a finding tagged to several domains is shown in each)."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <InsightTile
          label="Critical findings"
          value={insights.totalCriticals}
          sub={`${insights.totalHighs} high · ${insights.totalMediums} medium`}
          accent={insights.totalCriticals > 0 ? '#C41E3A' : 'var(--color-text-3)'}
          icon={AlertOctagon}
          help="Total critical-severity findings across the whole matrix, counting each unique finding once however many domains it is tagged to. Severity is set by the deterministic rule that fired, so the count is reproducible from the same data."
        />
        <InsightTile
          label="Domain with most criticals"
          value={insights.topDomain ? getDomain(insights.topDomain.id)?.label || insights.topDomain.id : '—'}
          sub={insights.topDomain ? `${insights.topDomain.criticals} critical${insights.topDomain.criticals !== 1 ? 's' : ''}` : 'No critical cells'}
          accent="#B45309"
          icon={MapPin}
          onClick={insights.topDomain ? () => onPickDomain?.(insights.topDomain.id) : null}
          help="The business domain carrying the most critical findings, ranked by critical count then flagged exposure. The universal 'audit' watchtower domain is excluded so it never pins the top. Click to open that domain's deep-dive."
        />
        <InsightTile
          label="Top risk category"
          value={insights.topCategory?.name || '—'}
          sub={insights.topCategory ? `${insights.topCategory.criticals} critical · ${insights.topCategory.highs} high` : 'No active cells'}
          accent="#7C3AED"
          icon={Target}
          help="The enterprise risk category with the most criticals across all domains, ranked by critical count then exposure. Categories come from a fixed agent-to-category mapping, not inferred — the same agent always lands in the same column."
        />
        <InsightTile
          label="Flagged exposure"
          value={formatLkr(entityExposure != null ? entityExposure : (insights.totalExposure || 0))}
          sub={`entity-deduped · ${insights.activeCells} active cell${insights.activeCells !== 1 ? 's' : ''}`}
          accent="var(--color-text)"
          icon={Flame}
          help="Total LKR exposure tied to flagged entities, de-duplicated so an entity caught by several agents is counted once. This is the same basis as Reports and Bank Position, so the figures reconcile."
        />
        <InsightTile
          label="Hottest cell"
          value={insights.hottestCell ? `${(getDomain(insights.hottestCell.domainId)?.label.split(' ')[0] || insights.hottestCell.domainId)} · ${insights.hottestCell.category.split(' ')[0]}` : '—'}
          sub={insights.hottestCell ? `${insights.hottestCell.criticals} crit · ${formatLkr(insights.hottestCell.exposure)}` : '—'}
          accent="#C41E3A"
          icon={Flame}
          onClick={insights.hottestCell ? () => onPickCell?.(insights.hottestCell.domainId, insights.hottestCell.category) : null}
          help="The single domain × category cell with the highest concentration of risk, ranked by criticals then exposure then highs. Click to jump straight into that cell's findings."
        />
      </div>
    </div>
  );
}

function InsightTile({ label, value, sub, accent, icon: Icon, onClick, help }) {
  const clickable = !!onClick;
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onClick || undefined}
        disabled={!clickable}
        style={{
          padding: '10px 12px', background: 'var(--color-surface-2)', border: `1px solid var(--color-border)`, borderLeft: `3px solid ${accent}`, borderRadius: 8,
          cursor: clickable ? 'pointer' : 'default', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2, width: '100%', fontFamily: 'inherit', transition: 'all 0.12s',
        }}
        onMouseEnter={e => { if (clickable) { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.borderColor = accent + '55'; } }}
        onMouseLeave={e => { if (clickable) { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.borderColor = 'var(--color-border)'; } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {Icon && <Icon size={11} style={{ color: accent }} />}
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: accent, fontFamily: 'var(--font-display)', lineHeight: 1.2, marginTop: 2 }}>{value}</div>
        {sub && <div style={{ fontSize: 10.5, color: 'var(--color-text-2)' }}>{sub}</div>}
      </button>
      {/* InfoHint lives outside the button (no nested-button) — pinned top-right of the tile. */}
      {help && (
        <span style={{ position: 'absolute', top: 7, right: 8 }}>
          <InfoHint title={label} text={help} size={12} align="right" />
        </span>
      )}
    </div>
  );
}

function computeInsights(matrix) {
  if (!matrix) return null;
  const byDomain = {};           // domainId -> { criticals, highs, mediums, exposure }
  const byCategory = {};         // category -> { criticals, highs, mediums, exposure }
  const cellStats = [];          // list of active cells for hottest-cell ranking

  let totalCriticals = 0, totalHighs = 0, totalMediums = 0, totalExposure = 0;
  let activeCells = 0;

  // A single finding is tagged to multiple domains (e.g. a trade-finance
  // finding touches both commercial and corporate), so it appears in several
  // (domain, category) cells. For top-level roll-ups we must count each
  // finding exactly once — otherwise the "Flagged exposure" tile balloons
  // 2–3× as tags are added. Per-domain / per-category breakdowns keep the
  // multi-tag reach (that's the point of the matrix); only the headline
  // totals get de-duplicated here.
  const seenFindings = new Set();
  const keyOf = (f) => `${f.agentId}:${f.arrayKey || 'default'}:${f.findingIndex}`;

  // The 'audit' domain is a universal watchtower — every finding is tagged
  // to it, so including it in the per-domain ranking would always pin audit
  // at the top. Exclude it from the rollup but keep it in the matrix view.
  const EXCLUDE_FROM_RANKING = new Set(['audit']);

  for (const [domainId, byCat] of Object.entries(matrix)) {
    for (const [category, cell] of Object.entries(byCat)) {
      const { criticals = 0, highs = 0, mediums = 0, exposure = 0, findings = [] } = cell || {};

      // De-duped headline totals — count each unique finding once across the
      // whole matrix, regardless of how many domain tags it carries.
      for (const f of findings) {
        const k = keyOf(f);
        if (seenFindings.has(k)) continue;
        seenFindings.add(k);
        const sev = (f.severity || 'medium').toLowerCase();
        const exp = f.finding?.affected_exposure_lkr
                 || f.finding?.affected_balance_lkr
                 || f.finding?.exposure_lkr
                 || 0;
        if (sev === 'critical') totalCriticals++;
        else if (sev === 'high') totalHighs++;
        else if (sev === 'medium') totalMediums++;
        totalExposure += (Number.isFinite(exp) ? exp : 0);
      }

      if (criticals + highs + mediums > 0) {
        activeCells++;
        cellStats.push({ domainId, category, criticals, highs, mediums, exposure });

        if (!EXCLUDE_FROM_RANKING.has(domainId)) {
          if (!byDomain[domainId]) byDomain[domainId] = { id: domainId, criticals: 0, highs: 0, mediums: 0, exposure: 0 };
          byDomain[domainId].criticals += criticals;
          byDomain[domainId].highs     += highs;
          byDomain[domainId].mediums   += mediums;
          byDomain[domainId].exposure  += exposure;

          if (!byCategory[category]) byCategory[category] = { name: category, criticals: 0, highs: 0, mediums: 0, exposure: 0 };
          byCategory[category].criticals += criticals;
          byCategory[category].highs     += highs;
          byCategory[category].mediums   += mediums;
          byCategory[category].exposure  += exposure;
        }
      }
    }
  }

  // Dev-mode sanity check: flagged exposure should never exceed the bank's
  // loan book. If this trips, something is still double-counting upstream.
  if (typeof window !== 'undefined' && totalExposure > 450_000_000_000) {
    // eslint-disable-next-line no-console
    console.warn('[HeatmapInsights] totalExposure exceeds loan book (LKR 430 Bn) — check dedup logic', { totalExposure });
  }

  // Ranker: criticals descending, then exposure descending, then highs descending.
  const rank = (a, b) => (b.criticals - a.criticals) || (b.exposure - a.exposure) || (b.highs - a.highs);

  const topDomain   = Object.values(byDomain).sort(rank)[0] || null;
  const topCategory = Object.values(byCategory).sort(rank)[0] || null;
  const hottestCell = cellStats.sort(rank)[0] || null;

  return {
    totalCriticals, totalHighs, totalMediums, totalExposure,
    activeCells,
    topDomain,
    topCategory,
    hottestCell,
  };
}
