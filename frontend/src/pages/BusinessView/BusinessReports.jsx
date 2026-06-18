import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { DOMAINS, getDomain } from '../../data/domainRegistry.js';
import { useAllFindings, useBankScale } from '../../hooks/useDomainData.js';
import { AGENT_META } from '../../data/agentMeta.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import { Num } from '../../components/shared/ui.jsx';
import { dedupedExposureBreakdown } from '../../utils/exposureDedup.js';
import { buildPack, packToCsv, downloadFile, serializeFinding } from '../../utils/reportSerializer.js';
import InfoHint from '../../components/business/InfoHint.jsx';
import { FileText, Download, Briefcase, Building2, FileSpreadsheet, Shield, Eye, X, Clock, Hash } from 'lucide-react';

// ─── BUSINESS REPORTS ────────────────────────────────────────────────────────
// Three generator flows: Heads-of-Business Pack (per domain), Board Pack,
// CBSL Pack. Each pack compiles the relevant data from agent results and
// domain registry, previews in a modal, and offers a text-export.

// The agents whose findings belong in a CBSL prudential submission, in the order
// they should appear. Used both to FILTER the pack and to ORDER its groups — the
// group labels are derived from AGENT_META so they always match the serialized
// `source_agent`, rather than being re-typed (which silently dropped groups).
const CBSL_AGENTS = ['connectedParty', 'kyc', 'suspense', 'trade', 'capital', 'alm'];

export default function BusinessReports() {
  const navigate = useNavigate();
  const { state } = useApp();
  const allFindings = useAllFindings();
  const bank = useBankScale();
  // Provenance: did the deterministic engine actually run (live or on demo CSVs),
  // or are these the static illustrative fixtures (demoData fallback)? Surfaced
  // on every pack so an exported board/CBSL artifact never misrepresents its source.
  const dataSource = Object.keys(state.agentResults || {}).length > 0 ? 'engine-output' : 'illustrative-fixtures';

  const [previewType, setPreviewType] = useState(null); // 'hob' | 'board' | 'cbsl'
  const [hobDomain, setHobDomain] = useState('consumer');

  // Build packs once per render so the header/CSV/JSON all share the same pack_id
  const packs = useMemo(() => ({
    hob: (domainId) => {
      const d = getDomain(domainId);
      const findings = allFindings.filter(f => f.domainTags.includes(domainId));
      return buildPack({
        kind: 'HOB',
        title: `Heads of Business Pack — ${d.label}`,
        recipient: d.ownerRole,
        findings,
        bankScale: bank,
        dataSource,
      });
    },
    board: buildPack({
      kind: 'BOARD',
      title: 'Board Pack — Sentinel Cycle Summary',
      recipient: 'Board of Directors · Demo Bank',
      findings: allFindings,
      bankScale: bank,
      dataSource,
      notes: 'Exposure totals use entity-level deduplication — the same customer flagged by multiple agents is counted at the larger of their exposures, not the sum.',
    }),
    cbsl: buildPack({
      kind: 'CBSL',
      title: 'CBSL Submission Pack — Prudential Findings',
      recipient: 'Central Bank of Sri Lanka — Bank Supervision',
      // Only material findings reach a regulatory submission — critical + high.
      // 'medium' is routine and 'low' is advisory/below-FDR (statistically not
      // significant), so neither belongs in a CBSL pack.
      findings: allFindings.filter(f => CBSL_AGENTS.includes(f.agentId) && ['critical', 'high'].includes(f.severity)),
      bankScale: bank,
      dataSource,
      notes: 'Prepared per CBSL submission schema. Findings are grouped by directive reference; each row carries its citation, owner role, and regulatory deadline.',
    }),
  }), [allFindings, bank, dataSource]);

  function exportPack(kind) {
    const pack = kind === 'hob' ? packs.hob(hobDomain) : packs[kind];
    const safe = pack.pack_id.replace(/[^A-Z0-9-]/g, '_');
    downloadFile(packToCsv(pack), `${safe}.csv`, 'text/csv;charset=utf-8');
    downloadFile(JSON.stringify(pack, null, 2), `${safe}.json`, 'application/json;charset=utf-8');
  }

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Header />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <PackCard
          icon={Briefcase}
          accent="#185FA5"
          title="Heads of Business Pack"
          description="One pack per domain — snapshot, active findings, risk profile, coverage map, recommended actions. Tailored for EVP Consumer / Commercial / Corporate / Treasury."
          onPreview={() => setPreviewType('hob')}
          onExport={() => exportPack('hob')}
        />
        <PackCard
          icon={Building2}
          accent="#B45309"
          title="Board Pack"
          description="Bank-wide executive summary — Critical Signals, composite Compliance, Capital posture, top 10 cases, cross-domain entities. Entity-deduped exposure totals."
          onPreview={() => setPreviewType('board')}
          onExport={() => exportPack('board')}
        />
        <PackCard
          icon={Shield}
          accent="#0F6E56"
          title="CBSL Pack"
          description="Regulatory submission format with structured rows — entity, amount, directive section, owner, internal + regulatory deadlines. JSON + CSV export."
          onPreview={() => setPreviewType('cbsl')}
          onExport={() => exportPack('cbsl')}
        />
      </div>

      {previewType === 'hob' && (
        <PreviewModal
          title={`Heads of Business Pack · ${getDomain(hobDomain)?.label}`}
          pack={packs.hob(hobDomain)}
          onClose={() => setPreviewType(null)}
          onExport={() => exportPack('hob')}
          extra={
            <select value={hobDomain} onChange={e => setHobDomain(e.target.value)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          }
        >
          <HoBContent domainId={hobDomain} allFindings={allFindings} navigate={navigate} />
        </PreviewModal>
      )}

      {previewType === 'board' && (
        <PreviewModal title="Board Pack" pack={packs.board} onClose={() => setPreviewType(null)} onExport={() => exportPack('board')}>
          <BoardContent allFindings={allFindings} bank={bank} pack={packs.board} />
        </PreviewModal>
      )}

      {previewType === 'cbsl' && (
        <PreviewModal title="CBSL Pack" pack={packs.cbsl} onClose={() => setPreviewType(null)} onExport={() => exportPack('cbsl')}>
          <CBSLContent pack={packs.cbsl} />
        </PreviewModal>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileText size={20} style={{ color: '#B45309' }} />
        Reports & Exports
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 980, lineHeight: 1.55 }}>
        Generate stakeholder-ready packs from the current agent outputs. Heads-of-Business packs are tuned for each domain owner;
        the Board Pack rolls cross-domain signals into an executive summary; the CBSL Pack formats findings for regulatory submission.
      </p>
    </div>
  );
}

function PackCard({ icon: Icon, accent, title, description, onPreview, onExport }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${accent}`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{title}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{description}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button onClick={onPreview} style={btnPrimary(accent)}><Eye size={12} /> Preview</button>
        <button onClick={onExport} style={btnSecondary} title="Downloads a CSV (regulator-submittable) and a JSON (machine-readable) side-by-side"><Download size={12} /> Export CSV + JSON</button>
      </div>
    </div>
  );
}

const btnPrimary = (color) => ({
  padding: '6px 14px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
  background: color, color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 5,
});
const btnSecondary = {
  padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
  background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 5,
};

// ─── PREVIEW MODAL ───────────────────────────────────────────────────────────
function PreviewModal({ title, pack, onClose, onExport, extra, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,12,18,0.5)', zIndex: 9997, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 0, width: 960, maxWidth: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={17} style={{ color: '#B45309' }} />
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>{title}</div>
            {extra}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onExport && (
              <button onClick={onExport} style={{ padding: '6px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: '#0F6E56', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Download size={12} /> Export CSV + JSON
              </button>
            )}
            <button onClick={onClose} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
              <X size={14} />
            </button>
          </div>
        </div>
        {pack && <PackStamp pack={pack} />}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 28px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function PackStamp({ pack }) {
  return (
    <div style={{ padding: '10px 20px', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 10.5, color: 'var(--color-text-2)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Hash size={10} style={{ color: '#B45309' }} /> <strong style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text)' }}>{pack.pack_id}</strong></span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} style={{ color: '#185FA5' }} /> {pack.generated_at.replace('T', ' ').slice(0, 19)} UTC</span>
      <span style={{ color: 'var(--color-text-3)' }}>{pack.generator}</span>
      {(() => {
        const fixture = pack.data_source === 'illustrative-fixtures';
        return (
          <span title={fixture ? 'These findings are static illustrative fixtures — load data and run the engine for live output.' : 'Findings produced by the deterministic detection engine.'} style={{ fontWeight: 800, fontSize: 9, padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em', background: fixture ? 'rgba(180,83,9,0.14)' : 'rgba(11,191,122,0.14)', color: fixture ? '#B45309' : '#0BBF7A' }}>
            {fixture ? 'Illustrative data' : 'Engine output'}
          </span>
        );
      })()}
      <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center' }}>
        {pack.summary.finding_count} findings · {pack.summary.critical_count} crit · {pack.summary.high_count} high · {formatLkr(pack.summary.exposure_lkr_entity_deduped)} entity-deduped
        <InfoHint
          align="right"
          size={11}
          title="Entity-deduped exposure"
          text="When the same customer, account, or loan is flagged by several agents, each agent values the same underlying balance — naively summing would count those rupees more than once. This total keeps only the LARGEST exposure per distinct entity (matched on entity id), so it reflects true at-risk exposure rather than the sum of agent perspectives."
        />
      </span>
    </div>
  );
}

// ─── HEADS OF BUSINESS PACK ──────────────────────────────────────────────────
function HoBContent({ domainId, allFindings, navigate }) {
  const d = getDomain(domainId);
  const findings = allFindings.filter(f => f.domainTags.includes(domainId));
  const criticals = findings.filter(f => f.severity === 'critical');
  const highs = findings.filter(f => f.severity === 'high');
  // Entity-deduped — a LKR 1.24 Bn entity flagged by 3 agents counts once.
  const { total: exposure, overlaps, multi_agent_entities } = dedupedExposureBreakdown(findings);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section label="TO" value={d.ownerRole} />
      <Section label="DOMAIN" value={d.label} />
      <Section label="PERIOD" value={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />

      <PackSection title={<><span>Executive summary</span><InfoHint align="left" size={11} title="How these figures are derived" text="Critical and high counts are direct tallies of findings the deterministic engine scored at each severity for this domain. Exposure is entity-deduped — a customer flagged by multiple agents is counted once at its largest exposure, not summed — so the figure reflects true at-risk exposure rather than the sum of agent perspectives." /></>}>
        <p style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6 }}>
          This cycle, {d.label} shows <strong>{criticals.length} critical</strong> and <strong>{highs.length} high</strong> severity findings across {findings.length} total signals from {new Set(findings.map(f => f.agentId)).size} detection agents. Total exposure under review: <strong>{formatLkr(exposure)}</strong> (entity-deduped{multi_agent_entities > 0 ? `, ${multi_agent_entities} ${multi_agent_entities === 1 ? 'entity' : 'entities'} flagged by multiple agents` : ''}).
        </p>
      </PackSection>

      {criticals.length > 0 && (
        <PackSection title={`Critical findings (${criticals.length})`}>
          {criticals.slice(0, 6).map(f => <StructuredFindingRow key={`${f.agentId}-${f.findingIndex}`} r={serializeFinding(f)} />)}
        </PackSection>
      )}

      {highs.length > 0 && (
        <PackSection title={`High severity findings (${highs.length})`}>
          {highs.slice(0, 4).map(f => <StructuredFindingRow key={`${f.agentId}-${f.findingIndex}`} r={serializeFinding(f)} />)}
        </PackSection>
      )}

      <PackSection title="Regulatory touchpoints">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(d.regulatoryTags || []).map(t => (
            <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: 'rgba(24,95,165,0.08)', color: '#185FA5', fontWeight: 700 }}>{t}</span>
          ))}
        </div>
      </PackSection>
    </div>
  );
}

// ─── BOARD PACK ──────────────────────────────────────────────────────────────
function BoardContent({ allFindings, bank, pack }) {
  const criticals = allFindings.filter(f => f.severity === 'critical');
  const exposure = pack.summary.exposure_lkr_entity_deduped;
  const topDomains = DOMAINS.map(d => ({
    d,
    count: allFindings.filter(f => f.domainTags.includes(d.id) && f.severity === 'critical').length,
  })).filter(x => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section label="TO" value="Board of Directors" />
      <Section label="PERIOD" value={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
      <Section label="BANK SCALE" value={`Assets ${formatLkr(bank?.totalAssetsLkr)} · Loans ${formatLkr(bank?.totalLoansLkr)} · Tier 1 ${bank?.tier1Pct ?? '—'}% · LCR ${bank?.lcrPct ?? '—'}%`} />

      <PackSection title={<><span>Executive summary</span><InfoHint align="left" size={11} title="How these figures are derived" text="The critical count is a straight tally of findings the deterministic engine scored Critical. Exposure is entity-deduped: where one customer, account, or loan is flagged by multiple agents it is counted once at its largest exposure, never summed, so the same rupees are not double-counted." /></>}>
        <p style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.6 }}>
          Sentinel is currently tracking <strong>{criticals.length} critical</strong> findings across the bank, with entity-deduped exposure under review at <strong>{formatLkr(exposure)}</strong> ({pack.summary.multi_agent_entities} entities flagged by multiple agents — counted once each at the largest exposure). Top-impacted domains this cycle are listed below.
        </p>
      </PackSection>

      <PackSection title="Top impacted domains">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Domain</th>
              <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Owner</th>
              <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>Criticals<InfoHint align="right" size={11} title="Criticals per domain" text="The number of Critical-severity findings tagged to this domain in the current cycle, counted directly from the engine's findings — one finding can belong to several domains, so a multi-domain finding is counted in each. Domains are ranked by this count; only those with at least one critical appear." /></th>
            </tr>
          </thead>
          <tbody>
            {topDomains.map(x => (
              <tr key={x.d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{x.d.label}</td>
                <td style={{ padding: '8px 10px', color: 'var(--color-text-2)', fontSize: 11 }}>{x.d.ownerRole}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#C41E3A', fontFamily: 'var(--font-display)' }}>{x.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PackSection>

      {pack.summary.exposure_overlaps.length > 0 && (
        <PackSection title="Cross-agent entities (multi-agent corroboration)">
          <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginBottom: 8, lineHeight: 1.5 }}>
            Entities flagged by multiple agents — the strongest cases for board attention because the signal is independently corroborated.
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Entity</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Agents</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Exposure</th>
              </tr>
            </thead>
            <tbody>
              {pack.summary.exposure_overlaps.slice(0, 8).map(o => (
                <tr key={o.entity} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>{o.entity}</td>
                  <td style={{ padding: '6px 10px', color: 'var(--color-text-2)' }}>{o.agents.join(', ')}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800 }}><Num>{formatLkr(o.exposure_lkr)}</Num></td>
                </tr>
              ))}
            </tbody>
          </table>
        </PackSection>
      )}

      <PackSection title="Board-level attention items (structured)">
        {pack.findings.filter(r => r.severity === 'CRITICAL').slice(0, 6).map(r => <StructuredFindingRow key={r.record_id} r={r} />)}
      </PackSection>
    </div>
  );
}

// ─── CBSL PACK (structured rows) ─────────────────────────────────────────────
function CBSLContent({ pack }) {
  const byAgent = pack.findings.reduce((acc, r) => {
    const key = r.source_agent;
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});
  // Derive the group order from the CBSL agent ids via AGENT_META so the labels
  // ALWAYS match the serialized `source_agent` (previously these were re-typed by
  // hand and drifted, silently dropping Connected Party + KYC from the preview).
  // Append any other groups present so a finding can never be hidden.
  const preferred = CBSL_AGENTS.map(id => AGENT_META[id]?.name).filter(Boolean);
  const groupOrder = [...preferred, ...Object.keys(byAgent).filter(k => !preferred.includes(k))];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section label="TO" value="Central Bank of Sri Lanka — Bank Supervision" />
      <Section label="FROM" value="Demo Bank · Chief Internal Auditor" />
      <Section label="PERIOD" value={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
      <Section label="FORMAT" value="Structured rows — each finding carries directive citation, owner, internal SLA and regulatory deadline. CSV + JSON exports available." />

      {groupOrder.filter(g => byAgent[g]).map(group => (
        <PackSection key={group} title={group}>
          {byAgent[group].slice(0, 6).map(r => <StructuredFindingRow key={r.record_id} r={r} />)}
        </PackSection>
      ))}

      {pack.findings.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>No CBSL-submittable findings at current severity thresholds.</p>
      )}
    </div>
  );
}

// ─── STRUCTURED FINDING ROW — the submittable unit ──────────────────────────
function StructuredFindingRow({ r }) {
  const sevColor = r.severity === 'CRITICAL' ? '#C41E3A' : r.severity === 'HIGH' ? '#B45309' : '#185FA5';
  return (
    <div style={{ padding: '12px 14px', background: 'var(--color-surface-2)', borderLeft: `3px solid ${sevColor}`, borderRadius: 6, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 6, background: sevColor + '18', color: sevColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.severity}</span>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'var(--color-text-3)' }}>{r.record_id}</span>
        <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>· {r.source_agent}</span>
        {r.entity_id && <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono, monospace)', padding: '1px 6px', borderRadius: 5, background: 'rgba(0,0,0,0.06)', color: 'var(--color-text)', fontWeight: 700 }}>entity: {r.entity_id}</span>}
        {r.amount_lkr > 0 && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: 'var(--color-text)' }}>{formatLkr(r.amount_lkr)}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.55 }}>{r.finding}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, fontSize: 10.5 }}>
        {r.primary_citation && <MetaChip label="Regulation" value={r.primary_citation.display} tooltip={r.primary_citation.relevance} />}
        {r.control_failure?.id && <MetaChip label="Control" value={`${r.control_failure.id} (${r.control_failure.type})`} tooltip={r.control_failure.description} />}
        {r.remediation?.owner_role && <MetaChip label="Owner" value={r.remediation.owner_role} help="The role accountable for remediating this finding, derived deterministically from the source agent's domain owner (the EVP / head-of-function mapped in the domain registry). It names a role, not an individual, so the pack stays valid as staff change." />}
        {r.remediation?.internal_deadline && <MetaChip label="Internal SLA" value={r.remediation.internal_deadline} help="Demo Bank's own resolution deadline for this finding — set by the severity-scaled SLA policy in the Audit Plan (e.g. critical findings due fastest). It is the internal commitment to close the case, separate from any regulator-imposed date." />}
        {r.remediation?.regulatory_deadline && <MetaChip label="Regulatory deadline" value={r.remediation.regulatory_deadline} color="#C41E3A" help="The date imposed by the governing directive (e.g. FTRA / CBSL reporting windows) for findings that carry a statutory obligation. Computed from the finding's citation, not estimated — missing it is a regulatory breach, so it is shown in red." />}
      </div>
    </div>
  );
}

function MetaChip({ label, value, color, tooltip, help }) {
  return (
    <div title={tooltip || ''} style={{ padding: '5px 8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 5, cursor: tooltip ? 'help' : 'default' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
        {label}{help && <InfoHint text={help} title={label} size={11} align="left" />}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: color || 'var(--color-text)', marginTop: 1 }}>{value}</div>
    </div>
  );
}

function Section({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, fontSize: 11.5, borderBottom: '1px dashed var(--color-border)', paddingBottom: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</span>
      <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

function PackSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B45309', marginBottom: 8 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}
