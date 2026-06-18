import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { useDialog } from '../../components/shared/Dialog.jsx';
import { Database, Sliders, Shield, Key, Cpu, FlaskConical, BookOpen, ChevronRight, CheckCircle, Trash2, AlertTriangle, Bot, Building2, Gauge, Bell, Download, Upload, ShieldCheck, ShieldAlert } from 'lucide-react';
import { verifyAuditTrail, exportAuditTrail } from '../../utils/auditTrail.js';

// ─── SETTINGS HUB ────────────────────────────────────────────────────────────
// Single home for everything that is configuration, reference, or learning —
// surfaces that an auditor sets up once or visits occasionally, rather than the
// daily Now → Investigate → Reports flow. Previously these were scattered across
// "Data & Tools", "Audit Workbench", and "Command" sidebar groups.

export default function SettingsHub() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const keyConnected = state.apiKeyStatus === 'valid';

  const CONFIGURE = [
    { icon: Building2, label: 'Bank Profile', desc: "Your bank's name, financial year, and benchmark figures that drive materiality.", to: '/business-view/bank-profile' },
    { icon: Bot,      label: 'Agents', desc: 'Enable or disable agents, assign owning roles, and override token limits.', to: '/business-view/agents' },
    { icon: Database, label: 'Data Sources', desc: 'Connect the bank data-lake sources, review data-quality reports, and run detection over the full population.', to: '/business-view/data' },
    { icon: Sliders,  label: 'Rule Parameters', desc: 'Tune detection thresholds and review feedback-loop recommendations.', to: '/business-view/rule-parameters' },
    { icon: Gauge,    label: 'Risk Appetite', desc: 'Set internal-appetite buffers above the CBSL regulatory floors.', to: '/business-view/risk-appetite' },
    { icon: Shield,   label: 'Audit Plan', desc: 'Set performance materiality, tolerable misstatement, scope and sign-offs.', to: '/business-view/audit-plan' },
    { icon: Bell,     label: 'Notifications', desc: 'Escalation matrix — who is notified on which trigger, via which channel.', to: '/business-view/notifications' },
  ];

  const LEARN = [
    { icon: ShieldCheck,  label: 'Detection Assurance', desc: 'How each agent detects and how accurate it is — method, calibrated confidence, and measured precision.', to: '/business-view/detection-assurance' },
    { icon: Cpu,          label: 'Engine Map', desc: 'How the agents connect — data sources, dependencies, and orchestration.', to: '/business-view/engine-map' },
    { icon: FlaskConical, label: 'Scenario Lab', desc: 'Guided walk-throughs of the platform on pre-built fraud cases.', to: '/business-view/scenarios' },
    { icon: BookOpen,     label: 'Glossary', desc: 'Definitions for every acronym, regulatory reference, and metric.', to: '/business-view/glossary' },
  ];

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Settings</h2>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', margin: '4px 0 0' }}>
          Configure the platform, manage your data, and learn how Sentinel works.
        </p>
      </div>

      {/* API key — the one setting that gates Live mode */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
        style={{
          textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderLeft: `3px solid ${keyConnected ? '#0BBF7A' : '#B45309'}`, borderRadius: 'var(--radius-lg)',
          padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <span style={{ width: 38, height: 38, borderRadius: 10, background: keyConnected ? 'rgba(11,191,122,0.12)' : 'rgba(245,184,65,0.14)', color: keyConnected ? '#0BBF7A' : '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Key size={18} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            Anthropic API Key
            {keyConnected && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#0BBF7A' }}><CheckCircle size={12} /> Connected</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
            {keyConnected ? 'Live analysis is enabled. Click to manage or clear your key.' : 'Add your key to enable Live Analysis. Without it, the platform runs on the demo dataset.'}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--color-text-3)' }} />
      </button>

      <Section title="Configure" items={CONFIGURE} navigate={navigate} />
      <Section title="Reference & Learn" items={LEARN} navigate={navigate} />

      <AuditTrailCard state={state} />

      <ConfigBackupCard state={state} dispatch={dispatch} />

      {/* FIX Phase F: demo-data control — only while the workspace still carries
          the bundled demo fixtures. Clearing them gives a real team a clean
          slate (no pre-authored false-positive rationales or recommendations). */}
      {state.demoMode && <ClearDemoCard dispatch={dispatch} />}
    </div>
  );
}

// ─── AUDIT TRAIL (tamper-evident) ────────────────────────────────────────────
// Surfaces the hash-chained record of audit-relevant actions (threshold changes,
// case conclusions, false-positive dismissals): how many entries, whether the
// chain is intact, and a one-click signed export for the evidence file.
function AuditTrailCard({ state }) {
  const trail = state.auditTrail || [];
  const v = verifyAuditTrail(trail);
  const intact = v.valid;

  function exportTrail() {
    const blob = new Blob([exportAuditTrail(trail)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-audit-trail-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.createObjectURL && setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const Icon = trail.length === 0 ? Shield : intact ? ShieldCheck : ShieldAlert;
  const color = trail.length === 0 ? 'var(--color-text-3)' : intact ? '#0BBF7A' : '#C41E3A';

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 18, background: 'var(--color-surface)', marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Icon size={22} style={{ color, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Audit trail</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 3, lineHeight: 1.55, maxWidth: 560 }}>
              Hash-chained, tamper-evident record of threshold changes, case conclusions, and false-positive dismissals — who did what, when. Altering any past entry breaks the chain.
            </div>
            <div style={{ fontSize: 12, marginTop: 8, fontWeight: 700, color }}>
              {trail.length === 0
                ? 'No actions recorded yet.'
                : intact
                  ? `${trail.length} entr${trail.length === 1 ? 'y' : 'ies'} · chain intact ✓`
                  : `Chain BROKEN at entry #${v.brokenAt} — ${v.reason}`}
            </div>
          </div>
        </div>
        <button onClick={exportTrail} disabled={trail.length === 0}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: trail.length === 0 ? 'default' : 'pointer', opacity: trail.length === 0 ? 0.5 : 1, background: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
          <Download size={14} /> Export signed trail
        </button>
      </div>
    </div>
  );
}

// ─── CONFIG EXPORT / IMPORT ──────────────────────────────────────────────────
// Portability for the org-level configuration: one person configures the
// platform, exports a JSON, and teammates import it (also backup + dev→prod
// promotion). Working data (cases/findings) is never included — config only.
function ConfigBackupCard({ state, dispatch }) {
  const fileRef = useRef(null);
  const { confirm } = useDialog();
  const [msg, setMsg] = useState(null); // { kind, text }

  function exportConfig() {
    const bundle = {
      _sentinelConfig: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      bank: state.bankProfile?.shortName || 'config',
      config: {
        bankProfile: state.bankProfile,
        agentConfig: state.agentConfig,
        appetiteOverrides: state.appetiteOverrides,
        customPresets: state.customPresets,
        escalationPolicy: state.escalationPolicy,
        thresholds: state.thresholds,
        activePreset: state.activePreset,
        auditPlan: state.auditPlan,
      },
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-config-${(state.bankProfile?.shortName || 'export').replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ kind: 'ok', text: 'Configuration exported.' });
  }

  const cfgBtn = (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: color, color: 'white', border: 'none' });

  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch {
        setMsg({ kind: 'err', text: 'Could not read that file — invalid JSON.' });
        return;
      }
      if (!parsed || parsed._sentinelConfig !== true || !parsed.config) {
        setMsg({ kind: 'err', text: 'Not a Sentinel configuration file.' });
        return;
      }
      const ok = await confirm({
        title: 'Import configuration',
        message: 'This replaces your Bank Profile, Agents, Risk Appetite, Rule Parameters, presets, escalation matrix and audit plan. Cases and findings are unaffected.',
        confirmLabel: 'Import',
        danger: true,
      });
      if (!ok) return;
      dispatch({ type: 'IMPORT_CONFIG', payload: parsed.config });
      setMsg({ kind: 'ok', text: `Imported configuration${parsed.exportedAt ? ` (exported ${parsed.exportedAt.slice(0, 10)})` : ''}.` });
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 12 }}>Configuration backup</div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(24,95,165,0.10)', color: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Download size={17} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Export / import configuration</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', marginTop: 3, lineHeight: 1.5 }}>
            Download all platform configuration (bank profile, agents, risk appetite, rule parameters, presets, escalation matrix, audit plan) as a JSON file — to back it up, share a baseline with your team, or promote it between environments. Working data (cases, findings) is never included.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={exportConfig} style={cfgBtn('#185FA5')}><Download size={13} /> Export configuration</button>
            <button onClick={() => fileRef.current?.click()} style={{ ...cfgBtn('var(--color-text-2)'), background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}><Upload size={13} /> Import…</button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: 'none' }} />
            {msg && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: msg.kind === 'ok' ? '#0BBF7A' : '#C41E3A' }}>
                {msg.kind === 'ok' ? <CheckCircle size={13} /> : <AlertTriangle size={13} />} {msg.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClearDemoCard({ dispatch }) {
  const [confirming, setConfirming] = React.useState(false);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 12 }}>Workspace</div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid #B45309', borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(245,184,65,0.14)', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Trash2 size={17} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Clear demo data</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', marginTop: 3, lineHeight: 1.5 }}>
            Remove the bundled demo fixtures — the seeded false-positive case markings and the demo feedback-loop recommendations — so your team starts from a clean workspace. The "Presentation" link is also hidden. This can't be undone.
          </div>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} style={btn('#B45309')}>
              <Trash2 size={13} /> Clear demo data
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#C41E3A', fontWeight: 600 }}>
                <AlertTriangle size={13} /> This removes seeded demo annotations. Sure?
              </span>
              <button onClick={() => dispatch({ type: 'EXIT_DEMO_MODE' })} style={btn('#C41E3A')}>Yes, clear it</button>
              <button onClick={() => setConfirming(false)} style={{ ...btn('var(--color-text-3)'), background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function btn(color) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '7px 14px', borderRadius: 8,
    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: color, color: 'white', border: 'none',
  };
}

function Section({ title, items, navigate }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        {items.map(it => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              onClick={() => navigate(it.to)}
              style={{
                textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,184,65,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(245,184,65,0.12)', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={17} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{it.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', marginTop: 3, lineHeight: 1.45 }}>{it.desc}</div>
              </div>
              <ChevronRight size={15} style={{ color: 'var(--color-text-3)', flexShrink: 0, marginTop: 2 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
