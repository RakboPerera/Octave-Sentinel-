import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { DOMAINS } from '../../data/domainRegistry.js';
import { useAllFindings, useBankScale } from '../../hooks/useDomainData.js';
import { AGENT_META } from '../../data/agentMeta.js';
import { THRESHOLDS, getDefaults } from '../../data/thresholdRegistry.js';
import { formatLkr } from '../../utils/domainAggregations.js';
import { Shield, Target, CheckSquare, User, AlertTriangle, Sliders, Clock } from 'lucide-react';
import InfoHint from '../../components/business/InfoHint.jsx';
import { DEFAULT_SLA_POLICY, SEVERITIES } from '../../utils/slaPolicy.js';

// ─── BUSINESS AUDIT PLAN ─────────────────────────────────────────────────────
// ISA 315 materiality + scope + risk assessment — domain-scoped rather than
// agent-scoped. Also captures a snapshot of current Rule Parameters thresholds
// at sign-off time.

const RISK_LEVELS = [
  { value: 1, label: 'Low',       color: '#0BBF7A' },
  { value: 2, label: 'Moderate',  color: '#185FA5' },
  { value: 3, label: 'Elevated',  color: '#CA8A04' },
  { value: 4, label: 'High',      color: '#B45309' },
  { value: 5, label: 'Critical',  color: '#C41E3A' },
];

// ─── ISA 330 COMBINED-RISK LOOKUP ────────────────────────────────────────────
// Replaces the old invented formula `min(5, round((ir+cr)/2 * 1.2))` with a
// transparent 5×5 grid. Each cell = Inherent × Control mapping defended by
// ISA 330 guidance (the audit response must be proportionate to the combined
// RMM — risk of material misstatement). The grid is made visible to the
// user so a CAE can defend the mapping to an external auditor.
//            CR=1  CR=2  CR=3  CR=4  CR=5
//   IR=1:    Low   Low   Mod   Elev  High
//   IR=2:    Low   Mod   Mod   Elev  High
//   IR=3:    Mod   Mod   Elev  High  High
//   IR=4:    Elev  Elev  High  High  Crit
//   IR=5:    High  High  High  Crit  Crit
const COMBINED_RISK_MATRIX = [
  // IR=1
  [1, 1, 2, 3, 4],
  // IR=2
  [1, 2, 2, 3, 4],
  // IR=3
  [2, 2, 3, 4, 4],
  // IR=4
  [3, 3, 4, 4, 5],
  // IR=5
  [4, 4, 4, 5, 5],
];

function combinedRisk(ir, cr) {
  const i = Math.max(1, Math.min(5, Number(ir) || 3)) - 1;
  const c = Math.max(1, Math.min(5, Number(cr) || 3)) - 1;
  return COMBINED_RISK_MATRIX[i][c];
}

// ─── ISA 320 MATERIALITY GUARDRAILS ──────────────────────────────────────────
// ISA 320 guidance: overall materiality is typically a % of a benchmark
// (profit, assets, equity). Performance materiality is usually 50–75% of
// overall materiality to reduce the probability that aggregate uncorrected
// misstatements exceed overall materiality.
// These guardrails warn the user when their entry sits outside industry norms;
// they do NOT block the save (auditor judgement can override, but must be
// documented).
// Demo Bank FY2025 benchmarks (from annual report): Assets 700.3 Bn, Equity 96.9 Bn,
// Pre-tax profit ≈ 28 Bn (grossed up from PAT 19.3 Bn at ~30% effective tax).
function assessMateriality(performanceMateriality, tolerableMisstatement, bank) {
  const warnings = [];
  const pm = Number(performanceMateriality) || 0;
  const tm = Number(tolerableMisstatement) || 0;

  if (pm > 0 && bank.totalAssetsLkr) {
    const pctAssets = pm / bank.totalAssetsLkr * 100;
    if (pctAssets > 1.0) warnings.push({
      level: 'warn',
      text: `Performance materiality is ${pctAssets.toFixed(2)}% of total assets. ISA 320 typically places overall materiality at 0.5–1% of assets, so performance materiality (50–75% of that) would normally fall below 0.75% of assets. Document the justification for the higher threshold.`,
    });
    if (pctAssets < 0.1) warnings.push({
      level: 'info',
      text: `Performance materiality is only ${pctAssets.toFixed(3)}% of total assets. This is unusually tight — sampling and testing intensity will be high. Confirm this is not an accidental order-of-magnitude error.`,
    });
  }

  if (pm > 0 && tm > 0) {
    const ratio = tm / pm;
    if (ratio > 0.75) warnings.push({
      level: 'warn',
      text: `Tolerable misstatement is ${(ratio * 100).toFixed(0)}% of performance materiality. ISA 320 typically places it at 50–75%. A higher ratio reduces the buffer for undetected misstatements.`,
    });
    if (ratio < 0.40) warnings.push({
      level: 'info',
      text: `Tolerable misstatement is ${(ratio * 100).toFixed(0)}% of performance materiality — tighter than the 50–75% ISA norm. This will flag more findings as material, increasing audit workload.`,
    });
  }

  if (pm === 0 || tm === 0) {
    warnings.push({
      level: 'info',
      text: 'Set both performance materiality and tolerable misstatement to activate materiality flow-through on every Business Platform surface.',
    });
  }

  return warnings;
}

export default function BusinessAuditPlan() {
  const { state, dispatch } = useApp();
  const allFindings = useAllFindings();
  const derivedScale = useBankScale();
  // Materiality benchmarks come from the Bank Profile (the audited annual-report
  // figures) when set; the agent-derived scale is the fallback. Profile figures
  // are the defensible ISA 320 basis, so they take precedence.
  const profile = state.bankProfile || {};
  const bank = useMemo(() => ({
    ...derivedScale,
    totalAssetsLkr: profile.totalAssetsLkr || derivedScale?.totalAssetsLkr,
    totalEquityLkr: profile.totalEquityLkr || derivedScale?.totalEquityLkr,
    preTaxProfitLkr: profile.preTaxProfitLkr || derivedScale?.preTaxProfitLkr,
  }), [derivedScale, profile.totalAssetsLkr, profile.totalEquityLkr, profile.preTaxProfitLkr]);

  const plan = state.auditPlan || {};
  const [materiality, setMateriality] = useState(plan.materiality || '');
  const [tolerable, setTolerable] = useState(plan.tolerableMisstatement || '');
  const [scope, setScope] = useState(plan.scope || {});
  const [riskAssessment, setRisk] = useState(plan.riskAssessment || {});
  const [slaPolicy, setSlaPolicy] = useState(plan.slaPolicy || DEFAULT_SLA_POLICY);
  const [signOffRole, setSignOffRole] = useState('');
  const [signOffName, setSignOffName] = useState('');
  const [saved, setSaved] = useState(false);

  // Compute findings count per domain for context
  const findingsByDomain = useMemo(() => {
    const c = {};
    for (const d of DOMAINS) {
      c[d.id] = {
        critical: allFindings.filter(f => f.domainTags.includes(d.id) && f.severity === 'critical').length,
        total: allFindings.filter(f => f.domainTags.includes(d.id)).length,
      };
    }
    return c;
  }, [allFindings]);

  // ISA 320 guardrail warnings — recomputed live as the user edits.
  const materialityWarnings = useMemo(
    () => assessMateriality(materiality, tolerable, bank || {}),
    [materiality, tolerable, bank],
  );

  function save() {
    dispatch({
      type: 'SET_AUDIT_PLAN',
      payload: {
        materiality: Number(materiality),
        tolerableMisstatement: Number(tolerable),
        scope, riskAssessment,
        slaPolicy,
        signOffs: plan.signOffs || [],
        thresholdsSnapshot: state.thresholds || getDefaults(),
        snapshotAt: new Date().toISOString(),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addSignOff() {
    if (!signOffName.trim() || !signOffRole) return;
    const signOffs = [...(plan.signOffs || []), { name: signOffName.trim(), role: signOffRole, date: new Date().toISOString(), phase: 'Planning' }];
    dispatch({
      type: 'SET_AUDIT_PLAN',
      payload: { ...plan, materiality: Number(materiality), tolerableMisstatement: Number(tolerable), scope, riskAssessment, signOffs },
    });
    setSignOffName('');
    setSignOffRole('');
  }

  const thresholdsInEffect = state.thresholds || getDefaults();
  const modifiedCount = countModifiedThresholds(thresholdsInEffect);

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Header saved={saved} onSave={save} />

      <MaterialitySection
        materiality={materiality}
        setMateriality={setMateriality}
        tolerable={tolerable}
        setTolerable={setTolerable}
        warnings={materialityWarnings}
        bank={bank}
      />

      <ScopeSection
        findingsByDomain={findingsByDomain}
        scope={scope}
        setScope={setScope}
        riskAssessment={riskAssessment}
        setRisk={setRisk}
      />

      <CombinedRiskMatrix />

      <SlaPolicySection
        slaPolicy={slaPolicy}
        setSlaPolicy={setSlaPolicy}
      />

      <ThresholdsSnapshot modifiedCount={modifiedCount} thresholds={thresholdsInEffect} />

      <SignOffSection
        signOffs={plan.signOffs || []}
        name={signOffName}
        setName={setSignOffName}
        role={signOffRole}
        setRole={setSignOffRole}
        onAdd={addSignOff}
      />
    </div>
  );
}

function Header({ saved, onSave }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} style={{ color: '#B45309' }} />
          Audit Plan
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 900, lineHeight: 1.55 }}>
          ISA 315 — Understanding the Entity and Its Environment. Scope is defined by business domain (not by agent), so the plan reads
          naturally to heads of business. Thresholds in effect at sign-off are snapshotted for defensibility.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {saved && <span style={{ fontSize: 12, color: '#0BBF7A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><CheckSquare size={13} /> Saved</span>}
        <button onClick={onSave} style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #F5B841, #E09A1F)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          Save Audit Plan
        </button>
      </div>
    </div>
  );
}

function MaterialitySection({ materiality, setMateriality, tolerable, setTolerable, warnings, bank }) {
  const matNum = Number(materiality) || 0;
  const tolNum = Number(tolerable) || 0;
  const assetsBn = bank?.totalAssetsLkr ? (bank.totalAssetsLkr / 1e9).toFixed(1) : '—';
  return (
    <Panel title="Materiality & Tolerable Misstatement" icon={Target} help="ISA 320 — Performance materiality is set below overall materiality to reduce the probability that aggregate uncorrected misstatements exceed overall materiality. Values here flow through to every business-view surface: domain residual risk tiers, finding severity escalation, heatmap cells, and case counts.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <NumInput
          label="Performance Materiality (LKR)"
          value={materiality}
          onChange={setMateriality}
          placeholder="500,000,000"
          hint={`ISA 320: normally 0.5–1% of total assets. Bank total assets = LKR ${assetsBn} Bn (0.5–1% = LKR ${bank?.totalAssetsLkr ? (bank.totalAssetsLkr * 0.005 / 1e6).toFixed(0) + '–' + (bank.totalAssetsLkr * 0.01 / 1e6).toFixed(0) + ' Mn' : '—'}). Findings with exposure ≥ this value are escalated one severity tier.`}
        />
        <NumInput
          label="Tolerable Misstatement (LKR)"
          value={tolerable}
          onChange={setTolerable}
          placeholder="250,000,000"
          hint={`ISA 320: typically 50–75% of performance materiality${matNum > 0 ? ' (LKR ' + (matNum * 0.5 / 1e6).toFixed(0) + '–' + (matNum * 0.75 / 1e6).toFixed(0) + ' Mn)' : ''}. Findings below this value are de-emphasised.`}
        />
      </div>

      <MaterialityGuardrails warnings={warnings} />
      <DownstreamImpact materiality={matNum} tolerable={tolNum} />
    </Panel>
  );
}

function MaterialityGuardrails({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {warnings.map((w, i) => {
        const color = w.level === 'warn' ? '#B45309' : '#185FA5';
        const bg = w.level === 'warn' ? 'rgba(180,83,9,0.05)' : 'rgba(24,95,165,0.04)';
        const border = w.level === 'warn' ? 'rgba(180,83,9,0.25)' : 'rgba(24,95,165,0.22)';
        return (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px', background: bg, border: `1px solid ${border}`, borderLeft: `3px solid ${color}`, borderRadius: 6, fontSize: 11.5, color: 'var(--color-text)', lineHeight: 1.5 }}>
            <AlertTriangle size={13} style={{ color, flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong style={{ color, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9.5 }}>
                ISA 320 {w.level === 'warn' ? 'guardrail' : 'note'}
              </strong>
              {' — '}{w.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── SLA POLICY SECTION (Wave 5 #4) ──────────────────────────────────────────
// Domain × severity table driving Case Manager ageing. Previously the Case
// Manager used a single hard-coded lookup (critical 3d / high 7d / medium
// 14d) for every domain — ignoring the fact that Compliance findings carry
// FTRA 5-day STR deadlines and CBSL 48h notifications that need a tighter
// SLA. This table is snapshotted at audit-plan sign-off for defensibility.
function SlaPolicySection({ slaPolicy, setSlaPolicy }) {
  const domainsWithDefault = [{ id: 'default', label: 'Default (fallback)' }, ...DOMAINS.map(d => ({ id: d.id, label: d.label }))];
  function updateCell(domainId, severity, value) {
    const num = Math.max(0, Math.floor(Number(value) || 0));
    setSlaPolicy(prev => ({
      ...prev,
      [domainId]: { ...(prev[domainId] || {}), [severity]: num },
    }));
  }
  function resetToDefaults() {
    setSlaPolicy(DEFAULT_SLA_POLICY);
  }
  return (
    <Panel title="Case SLA policy · domain × severity" icon={Clock} help="Ageing SLA in days, broken out by domain × severity. The Case Manager reads this table to colour-code ageing and raise escalation alerts. Multi-domain cases use the tightest applicable SLA. Snapshotted at audit-plan sign-off — later edits do not change the snapshot.">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.55, flex: 1, minWidth: 260 }}>
          Compliance defaults to <strong>1/3/7/14 days</strong> because FTRA §7 (STR filing) and CBSL Direction 03/2018 (single-obligor notification) have hard 48h–5 working-day regulatory deadlines. Other domains follow the ISA 330 response-proportionality norm.
        </div>
        <button onClick={resetToDefaults} style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', borderRadius: 6 }}>Reset to defaults</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ ...th, minWidth: 200 }}>Domain</th>
              {SEVERITIES.map((sev, i) => (
                <th key={sev} style={{ ...th, textAlign: 'center', minWidth: 80 }}>
                  {sev.toUpperCase()}<br /><span style={{ fontSize: 9, color: 'var(--color-text-3)', fontWeight: 600 }}>days</span>
                  {i === 0 && <InfoHint title="SLA days by severity" align="center" text="The number of days a case of this severity in this domain may stay open before the Case Manager flags it overdue. It is a fixed policy you set here — the tightest applicable row wins for a multi-domain case — not a computed estimate." size={11} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domainsWithDefault.map(d => {
              const row = slaPolicy[d.id] || {};
              const isDefault = d.id === 'default';
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)', background: isDefault ? 'rgba(245,184,65,0.04)' : 'transparent' }}>
                  <td style={{ ...td, fontWeight: isDefault ? 800 : 700, color: isDefault ? '#B45309' : 'var(--color-text)' }}>{d.label}</td>
                  {SEVERITIES.map(sev => (
                    <td key={sev} style={{ ...td, textAlign: 'center' }}>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={row[sev] ?? ''}
                        onChange={e => updateCell(d.id, sev, e.target.value)}
                        style={{ width: 56, padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface-2)', color: 'var(--color-text)', textAlign: 'center' }}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CombinedRiskMatrix() {
  return (
    <Panel title="Combined-risk matrix (ISA 330)" icon={AlertTriangle} help="Combined risk (risk of material misstatement, RMM) is a lookup of Inherent × Control risk, not a computed formula. This 5×5 matrix is the lookup in effect and is snapshotted at sign-off for defensibility.">
      <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', marginBottom: 10, lineHeight: 1.55 }}>
        ISA 330 requires the audit response to be proportionate to the combined inherent + control risk. The matrix replaces the previous invented formula — it's an explicit lookup that a CAE or external auditor can defend line-by-line.
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'center' }}></th>
            {[1, 2, 3, 4, 5].map(cr => (
              <th key={cr} style={{ ...th, textAlign: 'center' }}>Control = {cr} · {RISK_LEVELS[cr - 1].label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMBINED_RISK_MATRIX.map((row, i) => (
            <tr key={i}>
              <th style={{ ...th, textAlign: 'left' }}>Inherent = {i + 1} · {RISK_LEVELS[i].label}</th>
              {row.map((v, j) => {
                const level = RISK_LEVELS[v - 1];
                return (
                  <td key={j} style={{ padding: 6, textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 10, background: level.color + '18', color: level.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {level.label}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function DownstreamImpact({ materiality, tolerable }) {
  const hasValues = materiality > 0 || tolerable > 0;
  return (
    <div style={{ marginTop: 14, padding: 12, background: hasValues ? 'rgba(11,191,122,0.07)' : 'rgba(245,184,65,0.06)', border: `1px solid ${hasValues ? 'rgba(11,191,122,0.25)' : 'rgba(245,184,65,0.25)'}`, borderRadius: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: hasValues ? '#0BBF7A' : '#B45309', marginBottom: 6 }}>
        {hasValues ? 'Live — these values drive downstream behaviour' : 'Not yet wired — set values below to activate'}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.55 }}>
        When you save, the following surfaces reflow in real time:
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <li><strong>Severity escalation</strong> — any finding with exposure ≥ performance materiality is promoted one tier (medium → high, high → critical) across every page.</li>
          <li><strong>Severity de-emphasis</strong> — findings below tolerable misstatement are demoted one tier so attention focuses on material exposures.</li>
          <li><strong>Residual risk tiers</strong> — the domain-card pills on the landing page use performance materiality as the "critical" exposure gate (replacing the default LKR 20 Bn).</li>
          <li><strong>Heatmap, compliance score, case counts</strong> — all derive from the adjusted severity, so they shift automatically.</li>
        </ul>
      </div>
    </div>
  );
}

function NumInput({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px 12px', fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 700, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
      />
      <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4 }}>{hint}</div>
    </div>
  );
}

function ScopeSection({ findingsByDomain, scope, setScope, riskAssessment, setRisk }) {
  return (
    <Panel title="Scope & Risk Assessment by Domain" icon={AlertTriangle} help="ISA 330 — For each business domain, assess inherent and control risk. Combined risk informs audit procedure intensity.">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
              <th style={th}>In Scope</th>
              <th style={th}>Domain</th>
              <th style={th}>Owning Role</th>
              <th style={th}>Agents Deployed</th>
              <th style={th}>Findings<InfoHint title="Findings (crit · total)" text="Live count of active findings tagged to this domain — 'N crit' is how many are Critical, 'M total' is all severities. Counts come straight from the deterministic engine's current results, so they update as agents run or thresholds change." size={11} /></th>
              <th style={{ ...th, textAlign: 'center' }}>Inherent</th>
              <th style={{ ...th, textAlign: 'center' }}>Control</th>
              <th style={{ ...th, textAlign: 'center' }}>Combined<InfoHint title="Combined risk (ISA 330)" align="center" text="Risk of material misstatement, read from the 5×5 Inherent × Control lookup grid below — not a computed average. The cell where your selected Inherent and Control rows meet is the combined tier; changing either dropdown moves it deterministically." size={11} /></th>
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map(d => {
              const inScope = scope[d.id]?.inScope ?? true;
              const ir = riskAssessment[d.id]?.inherent ?? 3;
              const cr = riskAssessment[d.id]?.control ?? 3;
              const combined = combinedRisk(ir, cr);
              const comb = RISK_LEVELS.find(l => l.value === combined);
              const findings = findingsByDomain[d.id] || { total: 0, critical: 0 };
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={inScope}
                      onChange={() => setScope(prev => ({ ...prev, [d.id]: { ...prev[d.id], inScope: !inScope } }))}
                    />
                  </td>
                  <td style={{ ...td, fontWeight: 700 }}>{d.label}</td>
                  <td style={{ ...td, fontSize: 10.5, color: 'var(--color-text-2)' }}>{d.ownerRole}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(d.agentsPrimary || []).slice(0, 4).map(a => (
                        <span key={a} style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, background: (AGENT_META[a]?.color || '#999') + '18', color: AGENT_META[a]?.color || '#999' }}>
                          {(AGENT_META[a]?.name || a).split(' ')[0]}
                        </span>
                      ))}
                      {(d.agentsPrimary || []).length > 4 && <span style={{ fontSize: 9, color: 'var(--color-text-3)' }}>+{d.agentsPrimary.length - 4}</span>}
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ fontSize: 11, color: findings.critical > 0 ? '#C41E3A' : 'var(--color-text-2)', fontWeight: 700 }}>
                      {findings.critical > 0 && <span>{findings.critical} crit · </span>}
                      {findings.total} total
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <RiskDropdown value={ir} onChange={v => setRisk(prev => ({ ...prev, [d.id]: { ...prev[d.id], inherent: v } }))} />
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <RiskDropdown value={cr} onChange={v => setRisk(prev => ({ ...prev, [d.id]: { ...prev[d.id], control: v } }))} />
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 9px', borderRadius: 10, background: comb.color + '18', color: comb.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {comb.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RiskDropdown({ value, onChange }) {
  const level = RISK_LEVELS.find(l => l.value === value) || RISK_LEVELS[2];
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ fontSize: 10.5, padding: '3px 7px', border: `1px solid ${level.color}40`, borderRadius: 10, background: level.color + '15', color: level.color, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
    >
      {RISK_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
    </select>
  );
}

function ThresholdsSnapshot({ modifiedCount, thresholds }) {
  return (
    <Panel title="Detection thresholds in effect at sign-off" icon={Sliders} help="A snapshot of every Rule Parameters threshold captured at audit plan sign-off. Gives defensibility: findings were produced against these explicit parameters.">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ padding: '6px 12px', borderRadius: 10, background: modifiedCount > 0 ? 'rgba(245,184,65,0.12)' : 'rgba(11,191,122,0.12)', color: modifiedCount > 0 ? '#B45309' : '#0BBF7A', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          {modifiedCount === 0 ? 'All defaults' : `${modifiedCount} threshold${modifiedCount !== 1 ? 's' : ''} modified from defaults`}
          <InfoHint title="Modified thresholds" align="left" text="How many detection thresholds currently differ from their shipped defaults, counted by comparing every Rule Parameters value against its default. 'All defaults' means none were changed — the engine is running the out-of-the-box configuration." size={11} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
          Change thresholds in Rule Parameters; this snapshot freezes when you save the plan.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
        {Object.entries(THRESHOLDS).map(([agentId, block]) => (
          <div key={agentId} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: AGENT_META[agentId]?.color || '#999' }} />
              <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--color-text)' }}>{block.agentLabel}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {block.rules.slice(0, 4).map(r => {
                const key = r.id.split('.').slice(1).join('.');
                const val = thresholds[agentId]?.[key] ?? r.default;
                const modified = val !== r.default;
                return (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                    <span style={{ color: 'var(--color-text-2)' }}>{r.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: modified ? '#B45309' : 'var(--color-text)' }}>{val}</span>
                  </div>
                );
              })}
              {block.rules.length > 4 && (
                <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 600 }}>+{block.rules.length - 4} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SignOffSection({ signOffs, name, setName, role, setRole, onAdd }) {
  // Dedupe the FULL list — a domain owner role (e.g. Chief Internal Auditor)
  // can also be one of the appended audit roles, which previously produced
  // duplicate <option> keys.
  const ROLES = Array.from(new Set([...DOMAINS.map(d => d.ownerRole), 'Chief Internal Auditor', 'Audit Partner', 'Audit Committee Member']));
  return (
    <Panel title="Sign-offs" icon={User} help="Record sign-offs by role. Name is a reference only — the audit trail is about the role approving the plan.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 14 }}>
        <select value={role} onChange={e => setRole(e.target.value)} style={selectStyle}>
          <option value="">— Select role —</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Reference name or initials" style={selectStyle} />
        <button onClick={onAdd} disabled={!name.trim() || !role} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: name && role ? 'pointer' : 'not-allowed', background: '#185FA5', color: 'white', border: 'none', opacity: name && role ? 1 : 0.5 }}>
          Add Sign-Off
        </button>
      </div>

      {signOffs.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontStyle: 'italic' }}>No sign-offs recorded yet.</div>}
      {signOffs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {signOffs.map((s, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'var(--color-surface-2)', borderLeft: '3px solid #185FA5', borderRadius: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{s.role}</span>
                <span style={{ color: 'var(--color-text-2)' }}>· {s.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-3)' }}>
                  {new Date(s.date).toLocaleDateString()} · {s.phase}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── UI HELPERS ──────────────────────────────────────────────────────────────
function Panel({ title, icon: Icon, help, children }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        {Icon && <Icon size={14} style={{ color: '#B45309' }} />}
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>{title}</h3>
        {help && <InfoHint text={help} title={title} />}
      </div>
      {children}
    </div>
  );
}

const th = { padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' };
const td = { padding: '9px 10px' };
const selectStyle = { fontSize: 12, padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface-2)', color: 'var(--color-text)' };

function countModifiedThresholds(thresholds) {
  const defaults = getDefaults();
  let count = 0;
  for (const [agentId, rules] of Object.entries(defaults)) {
    for (const [key, defaultVal] of Object.entries(rules)) {
      const current = thresholds[agentId]?.[key];
      if (current !== undefined && current !== defaultVal) count++;
    }
  }
  return count;
}
