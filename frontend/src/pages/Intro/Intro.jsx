import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OctaveLogo from '../../components/shared/OctaveLogo.jsx';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const STATS = [
  { num:'17',        label:'Detection Agents',    sub:'100% population — no sampling' },
  { num:'23',        label:'Data Sources',        sub:'Documented, validated schemas' },
  { num:'11',        label:'Business Domains',    sub:'Cross-domain correlation' },
  { num:'LKR 700Bn', label:'Assets Under Watch',  sub:'Demo Bank balance sheet' },
];

const CASES = [
  { id:'CASE-001', title:'BR-14 Insider-Enabled Loan Fraud', color:'#C41E3A', sev:'critical', exposure:'LKR 387M', agents:6 },
  { id:'CASE-002', title:'SUS-017 CEFT Phantom Receivable',  color:'#C41E3A', sev:'critical', exposure:'LKR 1.24Bn', agents:3 },
  { id:'CASE-003', title:'BNK-CORP-0887 Trade-Based Money Laundering', color:'#C41E3A', sev:'critical', exposure:'LKR 421M', agents:3 },
];

const WORKFLOW = [
  { n:'01', icon:'⬆', title:'Connect your data sources', body:'Each of the 17 detection agents is wired to a source system in the bank data lake — core banking, the GL, IAM, regulatory reporting — with a documented schema of required fields and optional enrichment columns. (No live connection yet? Drop an offline CSV extract instead.)' },
  { n:'02', icon:'⚡', title:'The engine scores every record', body:'A deterministic engine scores 100% of your data in code — no sampling, no LLM in the decision. Each detector applies a transparent method: SLFRS-9 staging rules, Benford digit tests, robust-z outliers vs peers, counterparty-graph analysis, geo-velocity, with a false-discovery-rate control over the statistical findings.' },
  { n:'03', icon:'◉', title:'Orchestrator correlates', body:'When two or more agents independently flag the same entity, the Orchestrator computes a combined severity score. Multi-agent confirmation is statistically definitive.' },
  { n:'04', icon:'⊟', title:'Drill into any finding', body:'Click any alert to open the 4-tab finding drawer: signal analysis, detection steps, regulatory framework, and recommended action — all evidence-backed.' },
  { n:'05', icon:'🗂', title:'Open a case', body:'Open an investigation case from any finding. The Case Manager tracks evidence, STR filing deadlines, CBSL notifications, and remediation steps with gated resolution.' },
  { n:'06', icon:'📋', title:'Report to the board', body:'Generate board-ready audit reports, AML submissions, and fraud investigation packages. Every report carries an audit opinion, regulatory citations, and management action plan.' },
];

// ─── LIVE ALERTS PREVIEW ──────────────────────────────────────────────────────

const LIVE_ALERTS = [
  { agent:'Suspense Agent', color:'#993C1D', score:0.99, text:'SUS-017 (Pettah Main St): LKR 1.24Bn unreconciled 94 days. CBSL 90-day guideline breached.' },
  { agent:'Insider Risk',   color:'#4B3F72', score:0.94, text:'STF-1847 scores 94/100 — all 6 insider fraud dimensions confirmed simultaneously.' },
  { agent:'Transaction',    color:'#2D5A8E', score:0.91, text:'BNK-0841-X: 15 CEFT transfers in 22 min, all below LKR 5M STR threshold.' },
];

// ─── TAB 1 · USER JOURNEY STAGES ─────────────────────────────────────────────
// Seven-stage auditor journey from raw data to closed feedback loop.
// Each stage carries a visual spec rendered by the JourneyDetail panel.
const JOURNEY_STAGES = [
  {
    n: '01', icon: '⬆', title: 'Connect data', color: '#185FA5',
    shortLabel: 'Connect',
    headline: 'Connect the data lake. Sentinel does the rest.',
    body: 'Sentinel reads 23 documented source feeds — credit portfolio, transactions, suspense accounts, KYC customers, branch controls, digital sessions, trade finance, ALM gap, capital structure. A schema validator runs on ingest; the Data Quality Report surfaces completeness %, type mismatches, and range violations before the agent ever reads a row. When a live connection isn\'t available, an offline CSV extract follows the same path.',
    entity: 'BNK-Demo-Data',
    detail: { kind: 'upload', file: '01_credit_portfolio.csv', rows: 14203, schemaOk: true, missingRequired: 0, warnings: 47 },
  },
  {
    n: '02', icon: '⚡', title: 'Agents analyse', color: '#2D5A8E',
    shortLabel: 'Analyse',
    headline: '17 agents. 100% of the data. Computed, not guessed.',
    body: 'No sampling. A deterministic engine scores every record in code against your thresholds — SLFRS-9 staging, Benford digit tests, robust-z outliers vs peers, counterparty-graph layering, vintage cohorts, geo-velocity, IRRBB repricing gaps — then bounds the statistical findings with a false-discovery-rate control. Every record is scored; the significant ones surface as findings, each with its source row and the statistic that fired.',
    entity: 'parallel-fan-out',
    detail: { kind: 'agent-grid' },
  },
  {
    n: '03', icon: '⚙', title: 'Set thresholds', color: '#7C3AED',
    shortLabel: 'Thresholds',
    headline: 'Tune. Every change is audited.',
    body: 'Rule Parameters exposes every detection threshold — robust-z cutoffs, DPD staging gates, structuring scores, suspense aging limits. Four calibrated presets ship out-of-the-box (Balanced · Conservative · Aggressive · CBSL-Strict). Every edit captures actor, role, old→new, and rationale into the threshold audit log — ISA 330 defensible.',
    entity: 'credit.dpd_stage3',
    detail: { kind: 'thresholds' },
  },
  {
    n: '04', icon: '◈', title: 'Findings emerge', color: '#C41E3A',
    shortLabel: 'Findings',
    headline: 'Signals become evidence.',
    body: 'Each agent emits structured findings — severity, entity IDs, domain tags, affected exposure, regulatory citations. The Orchestrator watches for the same entity flagged by 2+ agents and composes a consolidated correlation. Three agents converging on BR-14, for instance, is what turns "odd" into "case-worthy".',
    entity: 'BR-14 · SUS-017 · BNK-CORP-0887',
    detail: { kind: 'findings' },
  },
  {
    n: '05', icon: '🗂', title: 'Cases assemble', color: '#B45309',
    shortLabel: 'Cases',
    headline: 'Critical findings auto-bundle.',
    body: 'Critical-severity findings and multi-agent correlations bundle into cases. Case Manager groups them by business domain, highlights cross-domain cases (3+ domains = compound risk), and tracks ageing against the domain × severity SLA policy from the Audit Plan. Compliance findings inherit FTRA 5-day deadlines; connected-party breaches carry CBSL 48h notifications.',
    entity: '3 critical · 10 open',
    detail: { kind: 'cases' },
  },
  {
    n: '06', icon: '✦', title: 'Investigate & explain', color: '#0F6E56',
    shortLabel: 'Explain',
    headline: 'Every finding. 14 sections of evidence.',
    body: 'Click any finding to open its full explainability trail: summary · signals that fired · agent methodology · step-by-step trail · counterfactual · regulatory citations (CBSL directive + section + effective date) · data lineage with row IDs · remediation SLA with owner + regulatory deadline · control failure linkage · confidence + calibration metadata. Submission-ready for CBSL.',
    entity: 'SUS-017 · phantom receivable',
    detail: { kind: 'explain' },
  },
  {
    n: '07', icon: '⟲', title: 'Close the loop', color: '#F5B841',
    shortLabel: 'Feedback',
    headline: 'False positives teach the model.',
    body: 'Marked false positives accumulate per-rule in the Case Manager. At ≥3 FPs on a rule the Feedback Loop agent composes a rule-change recommendation with projected FP reduction and — critically — a guarantee that no existing critical finding will be suppressed. An authorised approver (CIA / CRO / CCO) reviews and accepts. The threshold change flows back into Rule Parameters; the audit log records it as `via feedback loop`.',
    entity: 'rule → recommendation → approval',
    detail: { kind: 'feedback' },
  },
];

// ─── TAB 2 · TECHNICAL ARCHITECTURE LAYERS ───────────────────────────────────
// Five-layer system diagram, top-down: UI → state → meta agents → detection
// agents → data. Each node renders with its accent colour.
const ARCHITECTURE_LAYERS = [
  {
    id: 'ui',
    label: 'Business Platform UI',
    tagline: 'What the auditor sees',
    accent: '#F5B841',
    nodes: [
      { label: 'Command Centre',  color: '#B45309' },
      { label: 'Risk Heatmap',    color: '#B45309' },
      { label: 'Compliance',      color: '#185FA5' },
      { label: 'Regulatory Capital', color: '#185FA5' },
      { label: 'Case Manager',    color: '#B45309' },
      { label: 'Risk Register',   color: '#185FA5' },
      { label: 'Audit Plan',      color: '#7C3AED' },
      { label: 'Engine Map',      color: '#6B7280' },
      { label: 'Rule Parameters', color: '#7C3AED' },
      { label: 'Reports',         color: '#0F6E56' },
      { label: 'Data Sources',    color: '#475569' },
    ],
    flow: 'reads state · dispatches actions',
  },
  {
    id: 'state',
    label: 'Application state',
    tagline: 'React Context + reducer + localStorage',
    accent: '#0BBF7A',
    nodes: [
      { label: 'agentResults',            color: '#0BBF7A' },
      { label: 'caseWorkbench',           color: '#B45309' },
      { label: 'thresholdAuditLog',       color: '#7C3AED' },
      { label: 'feedbackRecommendations', color: '#7C3AED' },
      { label: 'auditPlan · slaPolicy',   color: '#185FA5' },
      { label: 'uploadedData',            color: '#475569' },
      { label: 'activeFinding (drawer)',  color: '#C41E3A' },
    ],
    flow: 'persists across sessions · drives every derived view',
  },
  {
    id: 'meta',
    label: 'Meta agents',
    tagline: 'Operate on other agents\' output',
    accent: '#7C3AED',
    nodes: [
      { label: 'Orchestrator',   color: '#111110', sub: 'Cross-agent correlation · systemic patterns · consolidated severity' },
      { label: 'Explainability', color: '#F5B841', sub: '14-section audit-grade trail · regulatory citations · lineage + SLA' },
      { label: 'Feedback Loop',  color: '#7C3AED', sub: 'FP accumulation · rule-change recommendations · human-gated approval' },
    ],
    flow: 'synthesise signals into cases, trails, recommendations',
  },
  {
    id: 'agents',
    label: '17 detection agents',
    tagline: 'Domain models · run against 100% of the data',
    accent: '#185FA5',
    subgroups: [
      {
        tier: 'L1 · Transaction / Event',
        nodes: [
          { label: 'Transaction',    color: '#2D5A8E' },
          { label: 'Digital Fraud',  color: '#993556' },
          { label: 'MJE Testing',    color: '#0BBF7A' },
          { label: 'Credit Fraud',   color: '#831843' },
        ],
      },
      {
        tier: 'L2 · Account / Position',
        nodes: [
          { label: 'Credit',         color: '#185FA5' },
          { label: 'Suspense',       color: '#993C1D' },
          { label: 'Trade',          color: '#2E7D32' },
          { label: 'Collateral',     color: '#B45309' },
          { label: 'Wealth',         color: '#7C3AED' },
          { label: 'Capital',        color: '#1D4ED8' },
          { label: 'ALM / IRRBB',    color: '#0F766E' },
        ],
      },
      {
        tier: 'L3 · Entity / Behavioural',
        nodes: [
          { label: 'KYC / AML',      color: '#0F6E56' },
          { label: 'Staff, Access & Control', color: '#3A5A3A' },
          { label: 'Connected Party',color: '#BE123C' },
          { label: 'Third-Party',    color: '#475569' },
          { label: 'Conduct',        color: '#9333EA' },
        ],
      },
      {
        tier: 'L4 · Regulatory',
        nodes: [
          { label: 'Reg Reporting Integrity', color: '#334155' },
        ],
      },
    ],
    flow: 'each reads its own source feed · emits structured findings with severity + citations',
  },
  {
    id: 'data',
    label: 'Data sources',
    tagline: '23 schemas · external regulatory references',
    accent: '#475569',
    subgroups: [
      {
        tier: 'Demo Bank data',
        nodes: [
          { label: '01 credit_portfolio' },
          { label: '02 transactions' },
          { label: '03 suspense_accounts' },
          { label: '04 kyc_customers' },
          { label: '05 internal_controls' },
          { label: '06 digital_sessions' },
          { label: '07 trade_treasury' },
          { label: '08 mje_testing' },
          { label: '09 insider_risk' },
          { label: '10 capital_structure' },
          { label: '11 balance_sheet' },
          { label: '12 compliance_seed' },
          { label: '13 wealth_portfolio' },
          { label: '14 collateral' },
          { label: '15 connected_parties' },
          { label: '16 alm_gap' },
          { label: '17 vendor_register' },
          { label: '18 access_rights' },
          { label: '19 conduct_register' },
          { label: '20 sanctions_hits' },
          { label: '21 tax_positions' },
          { label: '22 credit_fraud_origin' },
          { label: '23 reg_reporting' },
        ],
      },
      {
        tier: 'External reference',
        nodes: [
          { label: 'CBSL directives', color: '#185FA5' },
          { label: 'SLFRS 9 rules',   color: '#0F6E56' },
          { label: 'FATF list',       color: '#7C3AED' },
          { label: 'Benford distribution', color: '#0EA5E9' },
          { label: 'UN COMTRADE',     color: '#2E7D32' },
        ],
      },
    ],
    flow: 'synced from the data lake via Data Sources · validated · read-only',
  },
];

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height:1, background:'#E8E6DF', margin:'0' }} />;
}

function Section({ children, dark=false, style={} }) {
  return (
    <section style={{ background: dark ? '#111110' : '#fff', padding:'80px 0', ...style }}>
      <div style={{ maxWidth:1160, margin:'0 auto', padding:'0 40px' }}>
        {children}
      </div>
    </section>
  );
}

function Eyebrow({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#26EA9F', marginBottom:12 }}>
      {children}
    </div>
  );
}

function H2({ children, dark=false }) {
  return (
    <h2 style={{ fontSize:'clamp(28px,3.5vw,44px)', fontWeight:900, letterSpacing:'-0.03em', color: dark ? '#f4f2ec' : '#111110', lineHeight:1.1, margin:'0 0 16px' }}>
      {children}
    </h2>
  );
}

function Body({ children, dark=false }) {
  return (
    <p style={{ fontSize:16, color: dark ? 'rgba(232,230,224,0.55)' : '#6b6963', lineHeight:1.7, margin:'0 0 0', maxWidth:560 }}>
      {children}
    </p>
  );
}

// ─── TAB SWITCHER ────────────────────────────────────────────────────────────
function TabSwitcher({ tab, onChange }) {
  const tabs = [
    { id: 'overview',     label: 'Business User Overview',    hint: 'The auditor\'s journey' },
    { id: 'architecture', label: 'Technical Architecture',    hint: 'How it\'s structured' },
    { id: 'build',        label: 'Build Architecture',        hint: 'For the platform team' },
  ];
  return (
    <div role="tablist" aria-label="Sentinel tabs" style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8E6DF', marginBottom: 36 }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1, maxWidth: 360, padding: '16px 20px', textAlign: 'left',
              background: active ? 'white' : 'transparent',
              border: 'none', borderBottom: `3px solid ${active ? '#111110' : 'transparent'}`,
              marginBottom: -1, cursor: active ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#FAFAF8'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: active ? '#26EA9F' : '#9c9890', marginBottom: 4 }}>
              {t.hint}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: active ? '#111110' : '#6b6963', letterSpacing: '-0.01em' }}>
              {t.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── TAB 1 · JOURNEY FLOW ────────────────────────────────────────────────────
// Horizontal band of 7 numbered stages above a detail panel. Clicking a stage
// pins it; the active stage also auto-advances every 6s unless paused.
function JourneyFlow({ activeStage, onSelectStage, onHoverEnter, onHoverLeave }) {
  const stage = JOURNEY_STAGES[activeStage];
  return (
    <div onMouseEnter={onHoverEnter} onMouseLeave={onHoverLeave}>
      {/* Horizontal stage rail */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${JOURNEY_STAGES.length}, 1fr)`, gap: 6 }}>
          {JOURNEY_STAGES.map((s, i) => {
            const isActive = i === activeStage;
            const isPast = i < activeStage;
            return (
              <button
                key={s.n}
                onClick={() => onSelectStage(i)}
                aria-label={`Stage ${s.n} — ${s.title}`}
                style={{
                  position: 'relative',
                  padding: '16px 10px 14px', border: 'none', cursor: 'pointer',
                  background: isActive ? 'white' : '#FAFAF8',
                  borderRadius: 10,
                  boxShadow: isActive ? `0 10px 28px ${s.color}33, 0 0 0 1px ${s.color}` : '0 0 0 1px #E8E6DF',
                  fontFamily: 'inherit', textAlign: 'left',
                  transition: 'all 0.2s',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'white'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#FAFAF8'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: isActive || isPast ? s.color : '#E8E6DF',
                    color: isActive || isPast ? 'white' : '#9c9890',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, flexShrink: 0,
                  }}>{s.n}</span>
                  <span style={{ fontSize: 15, color: isActive ? s.color : '#9c9890' }}>{s.icon}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: isActive ? '#111110' : '#6b6963', lineHeight: 1.3, letterSpacing: '-0.01em' }}>{s.shortLabel}</div>
                <div style={{ fontSize: 10, color: '#9c9890', marginTop: 2, lineHeight: 1.3 }}>{s.title}</div>
                {/* Connector line to next stage (except the last) */}
                {i < JOURNEY_STAGES.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 30, right: -6, width: 6, height: 2,
                    background: isPast ? s.color : '#E8E6DF',
                    transition: 'background 0.3s',
                  }} />
                )}
                {/* Feedback-loop arrow: stage 7 loops back to stage 3 */}
                {i === JOURNEY_STAGES.length - 1 && (
                  <div style={{
                    position: 'absolute', top: -6, right: 6,
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
                    color: s.color, padding: '1px 7px', borderRadius: 8,
                    background: `${s.color}14`, border: `1px solid ${s.color}33`,
                  }}>↻ loops to 03</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28,
        padding: '28px 32px', background: 'white', border: '1px solid #E8E6DF', borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 18,
              background: stage.color, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800,
            }}>{stage.n}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: stage.color }}>Stage {stage.n} · {stage.title}</div>
              <div style={{ fontSize: 11, color: '#9c9890', marginTop: 1, fontFamily: 'var(--font-mono, monospace)' }}>{stage.entity}</div>
            </div>
          </div>
          <h3 style={{ fontSize: 'clamp(22px,2.4vw,30px)', fontWeight: 900, letterSpacing: '-0.02em', color: '#111110', lineHeight: 1.2, margin: '0 0 14px' }}>
            {stage.headline}
          </h3>
          <p style={{ fontSize: 14, color: '#4b4a47', lineHeight: 1.7, margin: 0 }}>{stage.body}</p>
        </div>
        <div style={{ minHeight: 240 }}>
          <JourneyDetailVisual stage={stage} />
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: '#9c9890', textAlign: 'center' }}>
        Click a stage to pin it · auto-advances every 6 seconds
      </div>
    </div>
  );
}

// ─── TAB 1 · STAGE DETAIL VISUALS ────────────────────────────────────────────
// Each stage has a bespoke visual. Kept small & self-contained.
function JourneyDetailVisual({ stage }) {
  const kind = stage.detail?.kind;

  if (kind === 'upload') {
    const d = stage.detail;
    return (
      <div style={{ padding: 18, background: '#FAFAF8', border: `1px solid ${stage.color}33`, borderRadius: 12, height: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: stage.color, marginBottom: 10 }}>Data Sources · sync in progress</div>
        <div style={{ padding: 12, background: 'white', borderRadius: 8, border: '1px dashed #E8E6DF', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono, monospace)', color: '#111110', fontWeight: 700 }}>{d.file}</div>
          <div style={{ fontSize: 10.5, color: '#9c9890', marginTop: 2 }}>{d.rows.toLocaleString()} records · {d.warnings} warnings · {d.missingRequired} missing required</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {['Schema shape', 'Required columns', 'Type coercion', 'Range validation'].map((c, i) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'white', borderRadius: 6, border: '1px solid #E8E6DF' }}>
              <span style={{ width: 14, height: 14, borderRadius: 7, background: '#0BBF7A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>✓</span>
              <span style={{ fontSize: 11, color: '#111110', fontWeight: 600 }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'agent-grid') {
    return (
      <div style={{ padding: 16, background: '#FAFAF8', border: `1px solid ${stage.color}33`, borderRadius: 12, height: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: stage.color, marginBottom: 10 }}>17 agents · parallel fan-out</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
          {[
            { l: 'Credit', c: '#185FA5' },    { l: 'CrFraud', c: '#BE123C' }, { l: 'Trans', c: '#2D5A8E' },
            { l: 'Susp', c: '#993C1D' },      { l: 'KYC', c: '#0F6E56' },     { l: 'Staff', c: '#4B3F72' },
            { l: 'Digi', c: '#993556' },      { l: 'Trade', c: '#2E7D32' },   { l: 'MJE', c: '#0BBF7A' },
            { l: 'Cap', c: '#1D4ED8' },       { l: 'Wlth', c: '#7C3AED' },    { l: 'Coll', c: '#B45309' },
            { l: 'CPty', c: '#A21CAF' },      { l: 'ALM', c: '#0F766E' },     { l: 'Vndr', c: '#475569' },
            { l: 'Cnd', c: '#9333EA' },       { l: 'RegRp', c: '#0891B2' },
          ].map((a, i) => (
            <div key={i} style={{
              padding: '10px 6px', background: 'white', borderRadius: 6,
              border: `1px solid ${a.c}44`, textAlign: 'center',
              animation: `pulse-${i} 2s ease-in-out infinite`,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: a.c, marginBottom: 3 }}>{a.l}</div>
              <div style={{ height: 3, background: `${a.c}22`, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${40 + (i * 13) % 60}%`, height: '100%', background: a.c }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 10.5, color: '#6b6963', lineHeight: 1.5 }}>
          Each agent scores 100% of its data deterministically. SLFRS-9 staging · Benford digit tests · robust-z vs peers · counterparty graph · geo-velocity · IRRBB gaps — FDR-controlled.
        </div>
      </div>
    );
  }

  if (kind === 'thresholds') {
    return (
      <div style={{ padding: 16, background: '#FAFAF8', border: `1px solid ${stage.color}33`, borderRadius: 12, height: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: stage.color, marginBottom: 10 }}>Rule parameters</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {['Balanced', 'Conservative', 'Aggressive', 'CBSL-Strict'].map((p, i) => (
            <span key={p} style={{
              fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 14,
              background: i === 3 ? stage.color : 'white',
              color: i === 3 ? 'white' : '#6b6963',
              border: i === 3 ? 'none' : '1px solid #E8E6DF',
            }}>{p}</span>
          ))}
        </div>
        <div style={{ padding: 10, background: 'white', borderRadius: 8, border: '1px solid #E8E6DF', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: '#6b6963' }}>credit.dpd_stage3</span>
            <span style={{ fontWeight: 800, color: stage.color, fontFamily: 'var(--font-display)' }}>90 days</span>
          </div>
          <div style={{ height: 3, background: '#E8E6DF', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '62%', height: '100%', background: stage.color }} />
          </div>
        </div>
        <div style={{ padding: '8px 10px', background: '#FEF3E2', borderTop: '1px solid rgba(180,83,9,0.22)', borderRight: '1px solid rgba(180,83,9,0.22)', borderBottom: '1px solid rgba(180,83,9,0.22)', borderLeft: '3px solid #B45309', borderRadius: 6 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#B45309', marginBottom: 2 }}>Audit log appended</div>
          <div style={{ fontSize: 10.5, color: '#6b6963', lineHeight: 1.5 }}>
            credit.dpd_stage3 · 95 → 90 · by <strong>CIA, M. Fernando</strong> · "Tightened per ALCO Q4 review"
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'findings') {
    return (
      <div style={{ padding: 16, background: '#FAFAF8', border: `1px solid ${stage.color}33`, borderRadius: 12, height: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: stage.color, marginBottom: 10 }}>Findings · orchestrator correlation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { agent: 'Suspense',    entity: 'SUS-017',       sev: 'critical', color: '#993C1D' },
            { agent: 'Transaction', entity: 'SUS-017 network', sev: 'critical', color: '#2D5A8E' },
            { agent: 'KYC',         entity: 'BNK-C-8834-G',  sev: 'high',     color: '#0F6E56' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'white', borderTop: '1px solid #E8E6DF', borderRight: '1px solid #E8E6DF', borderBottom: '1px solid #E8E6DF', borderLeft: `3px solid ${f.color}`, borderRadius: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: f.color, color: 'white', textTransform: 'uppercase' }}>{f.sev}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#111110' }}>{f.agent}</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: '#9c9890', marginLeft: 'auto' }}>{f.entity}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: '10px 12px', background: '#111110', borderRadius: 8 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#26EA9F', marginBottom: 3 }}>◎ Orchestrator · consolidated</div>
          <div style={{ fontSize: 11, color: '#f4f2ec', lineHeight: 1.5 }}>
            <strong>SUS-017 phantom receivable.</strong> 3 agents converge · combined severity 0.99 · exposure <strong>LKR 1.24 Bn</strong> · FTRA 5-day filing due.
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'cases') {
    return (
      <div style={{ padding: 16, background: '#FAFAF8', border: `1px solid ${stage.color}33`, borderRadius: 12, height: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: stage.color, marginBottom: 10 }}>Case Manager · ageing board</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 10 }}>
          {[
            { l: '< 3d',   n: 4, c: '#0BBF7A' },
            { l: '3–7d',   n: 2, c: '#B45309' },
            { l: '7–14d',  n: 3, c: '#B45309' },
            { l: '14+',    n: 1, c: '#C41E3A' },
          ].map(b => (
            <div key={b.l} style={{ padding: '8px 6px', background: 'white', borderRadius: 6, borderTop: `1px solid ${b.c}33`, borderRight: `1px solid ${b.c}33`, borderBottom: `1px solid ${b.c}33`, borderLeft: `3px solid ${b.c}`, textAlign: 'center' }}>
              <div style={{ fontSize: 9.5, color: '#9c9890', fontWeight: 700 }}>{b.l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111110', fontFamily: 'var(--font-display)' }}>{b.n}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {CASES.map(c => (
            <div key={c.id} style={{ padding: '8px 10px', background: 'white', borderTop: '1px solid #E8E6DF', borderRight: '1px solid #E8E6DF', borderBottom: '1px solid #E8E6DF', borderLeft: `3px solid ${c.color}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ fontSize: 9.5, color: '#9c9890' }}>{c.id}</code>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#111110', flex: 1 }}>{c.title}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: c.color, fontFamily: 'var(--font-display)' }}>{c.exposure}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'explain') {
    return (
      <div style={{ padding: 16, background: '#FAFAF8', border: `1px solid ${stage.color}33`, borderRadius: 12, height: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: stage.color, marginBottom: 10 }}>Explainability trail · 14 sections</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {[
            { s: 'Summary',     ok: true },
            { s: 'Domain',      ok: true },
            { s: 'Signals',     ok: true },
            { s: 'Methodology', ok: true },
            { s: 'Trail',       ok: true },
            { s: 'Why flagged', ok: true },
            { s: 'Counterfact', ok: true },
            { s: 'Verify',      ok: true },
            { s: 'Corroborate', ok: true },
            { s: 'Lineage',     ok: true, accent: true },
            { s: 'Confidence',  ok: true, accent: true },
            { s: 'Reg citation',ok: true, accent: true },
            { s: 'Remediation', ok: true, accent: true },
            { s: 'Control fail',ok: true, accent: true },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '6px 8px', background: 'white', borderRadius: 5,
              border: `1px solid ${s.accent ? stage.color : '#E8E6DF'}`,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 11, height: 11, borderRadius: 6, background: s.accent ? stage.color : '#0BBF7A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800 }}>✓</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#111110' }}>{s.s}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'white', borderTop: '1px solid #E8E6DF', borderRight: '1px solid #E8E6DF', borderBottom: '1px solid #E8E6DF', borderLeft: `3px solid ${stage.color}`, borderRadius: 6 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: stage.color, marginBottom: 2 }}>Regulatory citation</div>
          <div style={{ fontSize: 10.5, color: '#6b6963', lineHeight: 1.5 }}>
            CBSL · Banking Act Direction 05/2024 §3(b) · eff. 2024-03-15 — Maintenance of suspense accounts.
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'feedback') {
    return (
      <div style={{ padding: 16, background: '#FAFAF8', border: `1px solid ${stage.color}33`, borderRadius: 12, height: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: stage.color, marginBottom: 10 }}>Feedback loop · approval flow</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ padding: '8px 10px', background: 'white', border: '1px solid #E8E6DF', borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: '#9c9890', marginBottom: 3 }}>① Case Manager</div>
            <div style={{ fontSize: 11, color: '#111110', fontWeight: 600 }}>3 cases on <code style={{ fontFamily: 'var(--font-mono, monospace)' }}>kyc.introducer_gap_pct</code> marked false-positive</div>
          </div>
          <div style={{ padding: '8px 10px', background: 'white', border: `1px solid ${stage.color}55`, borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: stage.color, marginBottom: 3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>② Recommendation · pending</div>
            <div style={{ fontSize: 11, color: '#111110' }}>Raise threshold <strong>15 → 18%</strong> · prevents 3 FPs · 0 criticals suppressed</div>
          </div>
          <div style={{ padding: '8px 10px', background: '#F0FDF4', border: '1px solid rgba(16,163,74,0.25)', borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: '#16A34A', marginBottom: 3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>③ Approved by CIA</div>
            <div style={{ fontSize: 11, color: '#111110' }}>Threshold updated · audit log entry: <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10 }}>via feedback loop</code></div>
          </div>
        </div>
      </div>
    );
  }

  return <div style={{ padding: 20, fontSize: 12, color: '#9c9890' }}>—</div>;
}

// ─── TAB 2 · TECHNICAL ARCHITECTURE DIAGRAM ──────────────────────────────────
// 5-layer vertical stack with arrows between layers.
function ArchitectureDiagram() {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6b6963', lineHeight: 1.7, marginBottom: 24, maxWidth: 700 }}>
        Sentinel is a layered system: 23 data sources feed a deterministic detection engine (17 agents) that scores 100% of the population in code; meta-agents correlate and explain, results persist in React state, and the Business Platform UI renders them. Detection is computed locally and is reproducible; the LLM only writes narrative on top. Every threshold edit and case transition is captured in an append-only audit log.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ARCHITECTURE_LAYERS.map((layer, i) => (
          <React.Fragment key={layer.id}>
            <ArchitectureLayer layer={layer} />
            {i < ARCHITECTURE_LAYERS.length - 1 && <LayerConnector flow={layer.flow} />}
          </React.Fragment>
        ))}
      </div>

      {/* Cross-cutting concerns call-out */}
      <div style={{ marginTop: 24, padding: '16px 20px', background: '#111110', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#26EA9F', marginBottom: 4 }}>Cross-cutting</div>
          <div style={{ fontSize: 12, color: '#f4f2ec', fontWeight: 700 }}>Audit log</div>
          <div style={{ fontSize: 10.5, color: 'rgba(232,230,224,0.55)', lineHeight: 1.5, marginTop: 2 }}>Every threshold edit, case transition, FP recommendation approval — captured append-only with actor + role + rationale.</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5B841', marginBottom: 4 }}>Backend</div>
          <div style={{ fontSize: 12, color: '#f4f2ec', fontWeight: 700 }}>Deterministic engine (+ Anthropic SDK for narrative)</div>
          <div style={{ fontSize: 10.5, color: 'rgba(232,230,224,0.55)', lineHeight: 1.5, marginTop: 2 }}>Detection runs in pure JavaScript over the full population — reproducible, no API key needed. Claude is called only to narrate findings the engine has already decided; it never determines whether a finding exists.</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 4 }}>No API key?</div>
          <div style={{ fontSize: 12, color: '#f4f2ec', fontWeight: 700 }}>Deterministic demo fallback</div>
          <div style={{ fontSize: 10.5, color: 'rgba(232,230,224,0.55)', lineHeight: 1.5, marginTop: 2 }}>Every UI surface also renders off bundled demo data + pre-rendered explainability trails — the platform works end-to-end offline.</div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureLayer({ layer }) {
  const { subgroups, nodes } = layer;
  return (
    <div style={{
      background: 'white', borderTop: `1px solid #E8E6DF`, borderRight: `1px solid #E8E6DF`, borderBottom: `1px solid #E8E6DF`, borderLeft: `4px solid ${layer.accent}`,
      borderRadius: 12, padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: layer.accent }}>{layer.id.toUpperCase()} LAYER</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#111110', letterSpacing: '-0.01em' }}>{layer.label}</div>
        </div>
        <div style={{ fontSize: 11, color: '#9c9890' }}>{layer.tagline}</div>
      </div>

      {subgroups ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subgroups.map(sg => (
            <div key={sg.tier}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9c9890', marginBottom: 5 }}>{sg.tier}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {sg.nodes.map(n => <ArchChip key={n.label} node={n} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {nodes.some(n => n.sub) ? (
            nodes.map(n => (
              <div key={n.label} style={{ padding: '8px 10px', background: '#FAFAF8', borderTop: `1px solid ${(n.color || layer.accent) + '33'}`, borderRight: `1px solid ${(n.color || layer.accent) + '33'}`, borderBottom: `1px solid ${(n.color || layer.accent) + '33'}`, borderLeft: `3px solid ${n.color || layer.accent}`, borderRadius: 6 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#111110' }}>{n.label}</div>
                {n.sub && <div style={{ fontSize: 10.5, color: '#6b6963', marginTop: 2, lineHeight: 1.5 }}>{n.sub}</div>}
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {nodes.map(n => <ArchChip key={n.label} node={n} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArchChip({ node }) {
  const color = node.color || '#6b6963';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 9px', borderRadius: 14,
      background: 'white', border: `1px solid ${color}44`,
      fontSize: 10.5, fontWeight: 700, color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 3, background: color }} />
      {node.label}
    </span>
  );
}

function LayerConnector({ flow }) {
  return (
    <div style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: '#E8E6DF' }} />
      <span style={{ position: 'relative', background: 'white', padding: '2px 10px', fontSize: 10, color: '#9c9890', fontStyle: 'italic', border: '1px solid #E8E6DF', borderRadius: 10, fontFamily: 'var(--font-mono, monospace)' }}>
        ▼ {flow}
      </span>
    </div>
  );
}

// ─── TAB 3 · BUILD ARCHITECTURE ──────────────────────────────────────────────
// A single diagram aimed at the platform team productionising Sentinel.
// Three bands: CLIENT (React), HTTP (four endpoints), BACKEND (Node + Express
// + Anthropic). External = Anthropic API. Intentionally one dense picture —
// no supporting prose, the diagram is the deliverable.
function BuildArchitectureDiagram() {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6b6963', lineHeight: 1.7, marginBottom: 20, maxWidth: 720 }}>
        Single-page build view for the platform team. Everything in the white boxes is in this repo today; the grey boundary is where production adds SSO, durable state, and scheduled orchestration.
      </div>

      {/* ─── BAND 1 · CLIENT ───────────────────────────────────────────────── */}
      <ArchBand
        label="CLIENT"
        accent="#F5B841"
        tagline="React 18 · Vite · React Router · serves the whole UI"
      >
        {/* Pages row */}
        <ArchNode title="Pages" sub="frontend/src/pages">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <ArchPill color="#6b6963">Intro</ArchPill>
            <ArchPill color="#6b6963">Login</ArchPill>
            <ArchPill color="#B45309">Business Platform · 16 routes</ArchPill>
          </div>
          <div style={{ fontSize: 10, color: '#9c9890', marginTop: 6, fontFamily: 'var(--font-mono, monospace)' }}>
            Command Centre · Risk Heatmap · Compliance · Regulatory Capital · Case Manager · Risk Register · Audit Plan · Engine Map · Rule Parameters · Reports · Data Sources · Scenario Lab · Glossary · Domain Deep-Dive (×11)
          </div>
        </ArchNode>

        <ArchSubConnector label="read · subscribe" />

        {/* Hooks */}
        <ArchNode title="Hooks" sub="frontend/src/hooks" accent="#7C3AED">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <ArchPill color="#7C3AED" mono>useAllFindings</ArchPill>
            <ArchPill color="#7C3AED" mono>useDomainSnapshot</ArchPill>
            <ArchPill color="#7C3AED" mono>useDomainFindings</ArchPill>
            <ArchPill color="#7C3AED" mono>useExplainability</ArchPill>
            <ArchPill color="#7C3AED" mono>useBankScale</ArchPill>
            <ArchPill color="#7C3AED" mono>useAuditPlanMateriality</ArchPill>
            <ArchPill color="#7C3AED" mono>useLossEvents</ArchPill>
          </div>
        </ArchNode>

        <ArchSubConnector label="read state · dispatch actions" />

        {/* State + localStorage */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 10 }}>
          <ArchNode title="AppContext" sub="frontend/src/context/AppContext.jsx · reducer + 14 state slices" accent="#0BBF7A">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <ArchPill color="#0BBF7A" mono>agentResults</ArchPill>
              <ArchPill color="#B45309" mono>caseWorkbench</ArchPill>
              <ArchPill color="#7C3AED" mono>thresholds · activePreset</ArchPill>
              <ArchPill color="#7C3AED" mono>thresholdAuditLog</ArchPill>
              <ArchPill color="#7C3AED" mono>feedbackRecommendations</ArchPill>
              <ArchPill color="#185FA5" mono>auditPlan · slaPolicy</ArchPill>
              <ArchPill color="#475569" mono>uploadedData</ArchPill>
              <ArchPill color="#C41E3A" mono>activeFinding</ArchPill>
              <ArchPill color="#6b6963" mono>auth · apiKey · cases · runLedger</ArchPill>
            </div>
          </ArchNode>
          <ArchNode title="Persistence" sub="browser localStorage (demo)" accent="#0BBF7A" faded>
            <div style={{ fontSize: 11, color: '#6b6963', lineHeight: 1.5 }}>
              Entire slice set serialised on every mutation. Survives refresh, per-browser only.
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: '#B45309', fontWeight: 700, padding: '4px 8px', background: '#FEF3E2', borderRadius: 6, border: '1px solid rgba(180,83,9,0.22)' }}>
              Prod swap → Postgres + Redis (durable, multi-user)
            </div>
          </ArchNode>
        </div>

        <ArchSubConnector label="selectors derive · pure" />

        {/* Utils + Data modules */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ArchNode title="Utils · selectors" sub="frontend/src/utils" accent="#185FA5">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <ArchPill color="#185FA5" mono>domainAggregations</ArchPill>
              <ArchPill color="#185FA5" mono>domainTagging</ArchPill>
              <ArchPill color="#185FA5" mono>exposureDedup</ArchPill>
              <ArchPill color="#185FA5" mono>slaPolicy</ArchPill>
              <ArchPill color="#185FA5" mono>thresholdEvaluator</ArchPill>
              <ArchPill color="#185FA5" mono>trailGenerator</ArchPill>
              <ArchPill color="#185FA5" mono>reportSerializer</ArchPill>
              <ArchPill color="#185FA5" mono>dataQualityReport</ArchPill>
              <ArchPill color="#185FA5" mono>lossEventCapture</ArchPill>
              <ArchPill color="#185FA5" mono>runLedger</ArchPill>
            </div>
          </ArchNode>
          <ArchNode title="Bundled data modules" sub="frontend/src/data" accent="#475569">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <ArchPill color="#475569" mono>domainRegistry</ArchPill>
              <ArchPill color="#475569" mono>agentMeta · AGENT_OPS_META</ArchPill>
              <ArchPill color="#475569" mono>thresholdRegistry</ArchPill>
              <ArchPill color="#475569" mono>regulatoryFloors</ArchPill>
              <ArchPill color="#475569" mono>riskVectorAuditMeta</ArchPill>
              <ArchPill color="#475569" mono>caseRegistry</ArchPill>
              <ArchPill color="#475569" mono>demoData</ArchPill>
              <ArchPill color="#475569" mono>trailGenerator</ArchPill>
              <ArchPill color="#475569" mono>acronyms</ArchPill>
            </div>
          </ArchNode>
        </div>

        {/* Libs */}
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#FAFAF8', border: '1px solid #E8E6DF', borderRadius: 8 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9c9890', marginBottom: 6 }}>Libraries</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {['React 18', 'Vite', 'React Router', 'Papa Parse (CSV)', 'Axios', 'lucide-react'].map(l => (
              <span key={l} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'white', border: '1px solid #E8E6DF', color: '#6b6963' }}>{l}</span>
            ))}
          </div>
        </div>
      </ArchBand>

      {/* ─── BAND 2 · HTTP BOUNDARY ───────────────────────────────────────── */}
      <div style={{ position: 'relative', margin: '12px 0' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: '#111110', opacity: 0.6 }} />
        <div style={{ position: 'relative', background: '#111110', color: '#f4f2ec', borderRadius: 12, padding: '14px 20px', boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '3px 9px', borderRadius: 8, background: 'rgba(38,234,159,0.18)', color: '#26EA9F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>HTTP</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#f4f2ec' }}>Client ⇄ Backend boundary</span>
            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'rgba(232,230,224,0.45)', fontStyle: 'italic' }}>JSON · POST · x-api-key header</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
            <ArchEndpoint method="POST" path="/api/agent/<detection-id>" sub="credit · creditFraud · transaction · suspense · kyc · staffAccess · controls · digital · trade · insider · mje · capital · balance · wealth · collateral · connectedParty · alm · thirdParty · accessRights · conduct · regReporting (×21)" />
            <ArchEndpoint method="POST" path="/api/agent/orchestrator"  sub="cross-agent correlation · systemic patterns" />
            <ArchEndpoint method="POST" path="/api/agent/explainability" sub="14-section audit-grade trail synthesis" />
            <ArchEndpoint method="POST" path="/api/agent/feedbackLoop"   sub="FP accumulation → rule-change recommendation" />
          </div>
        </div>
      </div>

      {/* ─── BAND 3 · BACKEND + EXTERNAL ──────────────────────────────────── */}
      <ArchBand
        label="BACKEND"
        accent="#185FA5"
        tagline="Node · Express · Anthropic SDK · stateless"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 10 }}>
          <ArchNode title="Routes" sub="backend/routes" accent="#185FA5">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <ArchPill color="#185FA5" mono block>agents.js</ArchPill>
              <ArchPill color="#185FA5" mono block>orchestrator.js</ArchPill>
            </div>
            <div style={{ fontSize: 10, color: '#9c9890', marginTop: 6, lineHeight: 1.5 }}>
              Dispatches to the prompt module matching the agent id, forwards the input rows, returns the parsed JSON.
            </div>
          </ArchNode>

          <ArchNode title="Typed prompt modules · 24" sub="backend/prompts/*.js" accent="#7C3AED">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {[
                'credit', 'creditFraud', 'transaction',
                'suspense', 'kyc', 'staffAccess',
                'controls', 'digitalFraud', 'trade',
                'insiderRisk', 'mje', 'capital',
                'balance', 'wealth', 'collateral',
                'connectedParty', 'alm', 'thirdParty',
                'accessRights', 'conduct', 'regReporting',
                'orchestrator', 'explainability', 'feedbackLoop',
              ].map(p => (
                <span key={p} style={{ fontSize: 9.5, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, padding: '3px 6px', borderRadius: 4, background: '#FAFAF8', color: '#4b4a47', border: '1px solid #E8E6DF', textAlign: 'center' }}>{p}</span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#9c9890', marginTop: 6, lineHeight: 1.5 }}>
              Each prompt defines an exact JSON shape the LLM must return. Output is schema-validated before dispatch.
            </div>
          </ArchNode>

          <ArchNode title="Anthropic SDK" sub="@anthropic-ai/sdk · Claude" accent="#0F6E56">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ padding: '6px 10px', background: '#F0FDF4', borderRadius: 6, border: '1px solid rgba(16,163,74,0.22)', fontSize: 11, color: '#111110' }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Model</div>
                <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5 }}>claude-opus · structured JSON</code>
              </div>
              <div style={{ fontSize: 10, color: '#9c9890', lineHeight: 1.5 }}>
                One SDK call per agent invocation · response JSON returned to the route handler · no state held server-side.
              </div>
            </div>
          </ArchNode>
        </div>

        <ArchSubConnector label="external call" arrow="→" horizontal />

        {/* External */}
        <div style={{ padding: '14px 18px', background: '#111110', color: '#f4f2ec', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(38,234,159,0.18)', color: '#26EA9F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>☁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f4f2ec' }}>Anthropic API</div>
            <div style={{ fontSize: 10.5, color: 'rgba(232,230,224,0.55)', lineHeight: 1.5, marginTop: 2 }}>
              Only external service. One network hop per agent call. Response returned as JSON; a deterministic offline fallback (<code style={{ fontFamily: 'var(--font-mono, monospace)' }}>trailGenerator</code> + <code style={{ fontFamily: 'var(--font-mono, monospace)' }}>demoData</code>) keeps every UI surface functional without an API key.
            </div>
          </div>
        </div>
      </ArchBand>

      {/* ─── RESPONSE PATH CALL-OUT ───────────────────────────────────────── */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#FAFAF8', borderTop: '1px solid #E8E6DF', borderRight: '1px solid #E8E6DF', borderBottom: '1px solid #E8E6DF', borderLeft: '3px solid #0BBF7A', borderRadius: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0BBF7A', marginBottom: 4 }}>Response path</div>
        <div style={{ fontSize: 12, color: '#4b4a47', lineHeight: 1.6, fontFamily: 'var(--font-mono, monospace)' }}>
          Anthropic → Route handler → JSON response → Axios resolver → <strong>AGENT_SUCCESS</strong> dispatch → AppContext reducer → localStorage persist → hooks re-evaluate → UI re-renders
        </div>
      </div>

      {/* ─── PRODUCTION NOTE ──────────────────────────────────────────────── */}
      <div style={{ marginTop: 12, padding: '12px 16px', background: '#FEF3E2', borderTop: '1px solid rgba(180,83,9,0.25)', borderRight: '1px solid rgba(180,83,9,0.25)', borderBottom: '1px solid rgba(180,83,9,0.25)', borderLeft: '3px solid #B45309', borderRadius: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B45309', marginBottom: 4 }}>For the platform team</div>
        <div style={{ fontSize: 12, color: '#4b4a47', lineHeight: 1.6 }}>
          No database, no auth server, no message broker in this build — deliberate, to keep the demo portable. Productionising adds: durable state (Postgres + Redis), SSO + RBAC on the API layer, scheduled orchestration for the detection agents, a PII-tokenisation proxy in front of the Anthropic SDK, and immutable WORM storage for the threshold audit log + explainability trails.
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3 · ATOMS ───────────────────────────────────────────────────────────
function ArchBand({ label, accent, tagline, children }) {
  return (
    <div style={{
      background: 'white', borderTop: '1px solid #E8E6DF', borderRight: '1px solid #E8E6DF', borderBottom: '1px solid #E8E6DF', borderLeft: `4px solid ${accent}`,
      borderRadius: 12, padding: '16px 20px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>{label}</div>
        <div style={{ fontSize: 11.5, color: '#6b6963', fontStyle: 'italic' }}>{tagline}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {children}
      </div>
    </div>
  );
}

function ArchNode({ title, sub, accent = '#6b6963', faded = false, children }) {
  return (
    <div style={{
      padding: '11px 14px',
      background: faded ? '#FAFAF8' : 'white',
      border: `1px solid ${accent}33`,
      borderRadius: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#111110', letterSpacing: '-0.01em' }}>{title}</span>
        {sub && <span style={{ fontSize: 10, color: '#9c9890', fontFamily: 'var(--font-mono, monospace)' }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function ArchPill({ color = '#6b6963', mono = false, block = false, children }) {
  return (
    <span style={{
      display: block ? 'block' : 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 12,
      background: 'white', border: `1px solid ${color}44`,
      fontSize: 10.5, fontWeight: 700, color,
      fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit',
      width: block ? 'fit-content' : undefined,
    }}>
      {!block && <span style={{ width: 5, height: 5, borderRadius: 3, background: color }} />}
      {children}
    </span>
  );
}

function ArchSubConnector({ label, arrow = '▼', horizontal = false }) {
  return (
    <div style={{ position: 'relative', height: horizontal ? 18 : 22, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
      {!horizontal && <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: '#E8E6DF' }} />}
      <span style={{ position: 'relative', background: 'white', padding: '1px 8px', fontSize: 9.5, color: '#9c9890', fontStyle: 'italic', border: '1px solid #E8E6DF', borderRadius: 8, fontFamily: 'var(--font-mono, monospace)' }}>
        {arrow} {label}
      </span>
    </div>
  );
}

function ArchEndpoint({ method, path, sub }) {
  return (
    <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#26EA9F', color: '#111110', letterSpacing: '0.05em' }}>{method}</span>
        <code style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: '#f4f2ec', fontWeight: 700 }}>{path}</code>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(232,230,224,0.5)', lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Intro() {
  const navigate = useNavigate();
  const [alertIdx, setAlertIdx] = useState(0);

  // ─── TAB STATE ────────────────────────────────────────────────────────────
  // Two-tab deep dive below the hero: Business User Overview · Technical Architecture.
  const [tab, setTab] = useState('overview');
  const [activeStage, setActiveStage] = useState(0);
  const [paused, setPaused] = useState(false);

  // Cycle live alerts
  useEffect(() => {
    const t = setInterval(() => setAlertIdx(i => (i + 1) % LIVE_ALERTS.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Auto-advance the journey stages every 6 seconds unless paused (hover/click).
  useEffect(() => {
    if (tab !== 'overview' || paused) return;
    const t = setInterval(() => setActiveStage(i => (i + 1) % JOURNEY_STAGES.length), 6000);
    return () => clearInterval(t);
  }, [tab, paused]);

  function enter() { navigate('/login'); }

  const alert = LIVE_ALERTS[alertIdx];

  return (
    <div style={{ background:'#fff', color:'#1a1917', fontFamily:'var(--font-display), var(--font)', overflowX:'hidden' }}>

      {/* ── FIXED NAV ── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', height:56, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(8px)', borderBottom:'1px solid #E8E6DF' }}>
        <div style={{ fontSize:15, fontWeight:800, letterSpacing:'-0.02em', color:'#111110' }}>
          Sentinel by <OctaveLogo height={11} style={{ verticalAlign:'baseline' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'#9c9890', letterSpacing:'0.06em', textTransform:'uppercase' }}>Demo Bank · FY 2025</span>
          <button onClick={enter}
            style={{ padding:'8px 20px', background:'#111110', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'-0.01em' }}>
            Enter platform →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ maxWidth:1160, margin:'0 auto', padding:'140px 40px 80px', display:'grid', gridTemplateColumns:'1fr 380px', gap:64, alignItems:'center' }}>

        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'4px 12px', background:'#E8FDF4', border:'1px solid rgba(38,234,159,0.3)', borderRadius:20, marginBottom:24 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#26EA9F' }} />
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#0BBF7A' }}>
              <OctaveLogo height={9} style={{ verticalAlign:'baseline', marginRight:4 }} /> · Agentic AI Audit Intelligence
            </span>
          </div>

          <h1 style={{ fontSize:'clamp(52px,6.5vw,84px)', fontWeight:900, lineHeight:0.94, letterSpacing:'-0.04em', color:'#111110', margin:'0 0 24px' }}>
            Sentinel<br/>
            by <OctaveLogo height="0.72em" style={{ verticalAlign:'baseline', marginLeft:'0.1em' }} />
          </h1>

          <p style={{ fontSize:19, color:'#4b4a47', lineHeight:1.65, margin:'0 0 12px', maxWidth:520 }}>
            Seventeen AI detection agents. Every transaction. No sampling. Full-population detection across Demo Bank's entire LKR 700Bn ecosystem.
          </p>
          <p style={{ fontSize:13, color:'#9c9890', margin:'0 0 40px' }}>Confidential · Internal audit use only</p>

          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {STATS.map((s,i) => (
              <div key={i} style={{ padding:'14px 20px', background:'#FAFAF8', border:'1px solid #E8E6DF', borderRadius:10 }}>
                <div style={{ fontSize:22, fontWeight:900, color:'#111110', letterSpacing:'-0.02em', lineHeight:1 }}>{s.num}</div>
                <div style={{ fontSize:11, fontWeight:600, color:'#4b4a47', marginTop:3 }}>{s.label}</div>
                <div style={{ fontSize:10, color:'#9c9890', marginTop:1 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live alert card */}
        <div style={{ background:'#FAFAF8', border:'1px solid #E8E6DF', borderRadius:16, overflow:'hidden', boxShadow:'0 16px 48px rgba(0,0,0,0.07)' }}>
          <div style={{ padding:'11px 16px', borderBottom:'1px solid #E8E6DF', display:'flex', alignItems:'center', gap:8, background:'white' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#C41E3A' }} />
            <span style={{ fontSize:10, fontWeight:700, color:'#C41E3A', letterSpacing:'0.07em', textTransform:'uppercase' }}>Live · Critical alerts</span>
            <span style={{ marginLeft:'auto', fontSize:10, color:'#9c9890' }}>Command Centre</span>
          </div>
          {LIVE_ALERTS.map((a,i) => (
            <div key={i} style={{ padding:'12px 16px', borderBottom:i<2?'1px solid #E8E6DF':'none', background:'white', opacity: i===alertIdx?1:0.45, transition:'opacity 0.5s' }}>
              <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:5 }}>
                <div style={{ width:5, height:5, borderRadius:1, background:a.color, flexShrink:0 }} />
                <span style={{ fontSize:10, fontWeight:700, color:a.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{a.agent}</span>
              </div>
              <p style={{ fontSize:11, color:'#4b4a47', lineHeight:1.55, margin:'0 0 7px' }}>{a.text}</p>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ flex:1, height:3, borderRadius:2, background:'#F4F3EF', overflow:'hidden' }}>
                  <div style={{ width:`${a.score*100}%`, height:'100%', background:'#C41E3A', borderRadius:2 }} />
                </div>
                <span style={{ fontSize:10, fontWeight:800, color:'#C41E3A', fontVariantNumeric:'tabular-nums' }}>{a.score.toFixed(2)}</span>
              </div>
            </div>
          ))}
          <div style={{ padding:'9px 16px', background:'#FAFAF8', textAlign:'center', fontSize:11, color:'#9c9890', borderTop:'1px solid #E8E6DF' }}>
            Demo Bank FY 2025 · Demo data pre-loaded
          </div>
        </div>
      </section>

      <Divider />

      {/* ── THE PROBLEM ── */}
      <Section>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
          <div>
            <Eyebrow>Why Sentinel exists</Eyebrow>
            <H2>Always on.<br/>Fully covered.</H2>
            <Body>Internal audit traditionally runs in cycles — planned, scoped, sampled, reported. Between cycles the bank is dark. Within each cycle only a sliver of the portfolio is ever examined. Sentinel inverts the model: seventeen AI agents run continuously against every transaction, every account, every session — <strong>24 hours a day, 365 days a year</strong>. Coverage is 100% by design, not by exception.</Body>
          </div>
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                { label:'Traditional cadence', value:'Periodic', sub:'Cycles with gaps between', color:'#C41E3A', bg:'#FEF0F0' },
                { label:'Sentinel cadence', value:'24/7 live', sub:'No gap between checks', color:'#16A34A', bg:'#F0FDF4' },
                { label:'Traditional coverage', value:'3–5%', sub:'Portfolio sampling rate', color:'#C41E3A', bg:'#FEF0F0' },
                { label:'Sentinel coverage', value:'100%', sub:'Every record, every day', color:'#16A34A', bg:'#F0FDF4' },
              ].map((s,i) => (
                <div key={i} style={{ padding:'20px', background:s.bg, borderRadius:12, border:`1px solid ${s.color}22` }}>
                  <div style={{ fontSize:28, fontWeight:900, color:s.color, letterSpacing:'-0.03em', lineHeight:1, marginBottom:6 }}>{s.value}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:s.color, marginBottom:2 }}>{s.label}</div>
                  <div style={{ fontSize:11, color:s.color, opacity:0.7 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── TABBED DEEP DIVE (Tab 1 · Business user overview / Tab 2 · Technical architecture) ── */}
      <Section style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Eyebrow>How Sentinel works</Eyebrow>
              <H2>From raw data to audit-defensible evidence.</H2>
            </div>
            <Body>Two views — the auditor's journey, and the engineering underneath.</Body>
          </div>

          <TabSwitcher tab={tab} onChange={setTab} />

          {tab === 'overview' && (
            <JourneyFlow
              activeStage={activeStage}
              onSelectStage={(i) => { setActiveStage(i); setPaused(true); }}
              onHoverEnter={() => setPaused(true)}
              onHoverLeave={() => setPaused(false)}
            />
          )}
          {tab === 'architecture' && <ArchitectureDiagram />}
          {tab === 'build' && <BuildArchitectureDiagram />}
        </div>
      </Section>

      {/* ── DARK CTA (shared, below tabs) ── */}
      <section style={{ background: '#111110', padding: '96px 40px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#26EA9F', marginBottom: 16 }}>
            Demo Bank · FY 2025 · Demo data pre-loaded
          </div>
          <h2 style={{ fontSize: 'clamp(32px,4.5vw,56px)', fontWeight: 900, letterSpacing: '-0.04em', color: '#f4f2ec', lineHeight: 1.05, margin: '0 0 20px' }}>
            The platform is live.<br />Critical findings need your attention.
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(232,230,224,0.5)', maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.65 }}>
            Enter the Business Platform to triage live critical findings, multi-agent correlations, and branch-level risk across every domain.
          </p>
          <button onClick={enter}
            style={{ padding: '18px 52px', background: '#26EA9F', color: '#111110', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em', transition: 'all 0.2s', boxShadow: '0 8px 32px rgba(38,234,159,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FAC775'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#26EA9F'; e.currentTarget.style.transform = 'none'; }}>
            Enter Sentinel →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <div style={{ background:'#111110', borderTop:'1px solid rgba(255,255,255,0.06)', padding:'18px 40px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'rgba(232,230,224,0.2)' }}>Sentinel by <OctaveLogo height={8} style={{ verticalAlign:'baseline', opacity:0.4 }} /> · Demo Bank · FY 2025 · Confidential</span>
        <span style={{ fontSize:11, color:'rgba(232,230,224,0.2)' }}>17 detection agents · 100% coverage · LKR 700Bn AUM</span>
      </div>
    </div>
  );
}
