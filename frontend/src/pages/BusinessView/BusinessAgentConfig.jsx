import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { AGENT_META, AGENT_OPS_META, DETECTION_AGENT_IDS } from '../../data/agentMeta.js';
import { DETECTOR_AGENTS } from '../../utils/detectionEngine.js';
import { Card, Eyebrow, SectionTitle, Chip } from '../../components/shared/ui.jsx';
import { useDialog } from '../../components/shared/Dialog.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import { Bot, RotateCcw, CheckCircle, AlertCircle, Circle, Cpu } from 'lucide-react';

// ─── AGENT CONFIGURATION (Settings → Agents) ─────────────────────────────────
// Lets an audit team configure the detection agents to their bank: switch
// agents on/off (a bank may not run all of them) and assign the owning role.
// Enable/disable governs the run in Data Hub. Detection itself is COMPUTED
// LOCALLY by the deterministic engine over the full population — there is no
// token limit on detection. The token budget only ever applied to the optional
// AI narrative path, which engine-supported agents don't use; it is therefore
// shown only for any agent still on the (legacy) AI-generation path.

const DETECTOR_SET = new Set(DETECTOR_AGENTS);

export default function BusinessAgentConfig() {
  const { state, dispatch } = useApp();
  const { confirm } = useDialog();
  const cfg = state.agentConfig || {};
  const enabledCount = DETECTION_AGENT_IDS.filter(id => cfg[id]?.enabled !== false).length;
  const total = DETECTION_AGENT_IDS.length;

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)' }}>
            <Bot size={20} style={{ color: '#B45309' }} /> Agent Configuration
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 820, lineHeight: 1.55 }}>
            Switch detection agents on or off and assign the owning role. Disabled agents are skipped when you sync all sources in Data Sources. Detection is <strong>computed locally over the full population</strong> — there is no token limit on what it analyses. Helper and meta agents (orchestrator, explainability, feedback-loop) run automatically and aren't configured here.
          </p>
        </div>
        <button onClick={async () => { if (await confirm({ title: 'Reset agent configuration', message: 'Reset all agents to their default enabled state, owners, and token limits?', confirmLabel: 'Reset', danger: true })) dispatch({ type: 'RESET_AGENT_CONFIG' }); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', fontFamily: 'inherit' }}>
          <RotateCcw size={13} /> Reset to defaults
        </button>
      </div>

      <Card padding={14} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Eyebrow>Agents enabled</Eyebrow>
          <InfoHint
            title="Agents enabled"
            text="A simple count of detection agents currently switched on, out of the total available. Disabled agents are skipped when you sync all sources, so this is how many will run on the next bulk run — not a score."
            size={11}
          />
        </span>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: enabledCount === total ? '#0BBF7A' : '#B45309', fontVariantNumeric: 'tabular-nums' }}>
          {enabledCount} <span style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 600 }}>/ {total}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>
          {enabledCount === total ? 'All detection agents will run.' : `${total - enabledCount} agent${total - enabledCount === 1 ? '' : 's'} excluded from bulk runs.`}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DETECTION_AGENT_IDS.map(id => (
          <AgentRow key={id} id={id} config={cfg[id] || {}} state={state} dispatch={dispatch} />
        ))}
      </div>
    </div>
  );
}

function AgentRow({ id, config, state, dispatch }) {
  const meta = AGENT_META[id] || { name: id, color: '#666' };
  const ops = AGENT_OPS_META[id] || {};
  const enabled = config.enabled !== false;
  // Engine-supported agents detect locally (no LLM, no token cap). The token
  // budget only applies to the legacy AI-generation path, so it is hidden here
  // for engine agents and the row instead states detection is computed locally.
  const engineSupported = DETECTOR_SET.has(id);

  const [owner, setOwner] = useState(config.ownerRole || '');
  const [tokens, setTokens] = useState(config.maxTokens != null ? String(config.maxTokens) : '');
  useEffect(() => { setOwner(config.ownerRole || ''); }, [config.ownerRole]);
  useEffect(() => { setTokens(config.maxTokens != null ? String(config.maxTokens) : ''); }, [config.maxTokens]);

  function patch(p) { dispatch({ type: 'SET_AGENT_CONFIG', payload: { agentId: id, patch: p } }); }

  function commitTokens() {
    const t = tokens.trim();
    if (t === '') { patch({ maxTokens: null }); return; }
    let n = parseInt(t, 10);
    if (!Number.isFinite(n)) { setTokens(config.maxTokens != null ? String(config.maxTokens) : ''); return; }
    n = Math.max(1024, Math.min(32000, n));
    setTokens(String(n));
    patch({ maxTokens: n });
  }

  // Live run status
  const result = state.agentResults?.[id];
  const error = state.agentErrors?.[id];
  const findingCount = result?.key_findings?.length;
  let status;
  if (error) status = { label: 'Last run failed', color: '#C41E3A', Icon: AlertCircle };
  else if (result) status = { label: `Ran · ${findingCount ?? 0} finding${findingCount === 1 ? '' : 's'}`, color: '#0BBF7A', Icon: CheckCircle };
  else status = { label: 'Not run', color: 'var(--color-text-3)', Icon: Circle };
  const StatusIcon = status.Icon;

  const dataSource = (ops.depends_on || []).filter(d => /\.csv$/i.test(d))[0] || (ops.depends_on || [])[0] || '—';

  return (
    <Card padding={14} accent={enabled ? meta.color : 'var(--color-border)'} style={{ opacity: enabled ? 1 : 0.62 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Toggle on={enabled} onChange={() => patch({ enabled: !enabled })} />
        <span style={{ width: 8, height: 8, borderRadius: 4, background: meta.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)' }}>{meta.name}</span>
            {ops.version && <Chip tone="neutral">{ops.version}</Chip>}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 2, fontFamily: 'var(--font-mono, monospace)' }}>{dataSource}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: status.color }}>
          <StatusIcon size={12} /> {status.label}
          <InfoHint
            title="Run status"
            text="The result of this agent's last run on the loaded data. 'Ran · N findings' is the count it returned (computed deterministically over the full population); 'Not run' means it hasn't executed in this session, and 'Last run failed' means its source data was missing or errored."
            size={11}
            align="left"
          />
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--color-border)', flexWrap: 'wrap' }}>
        <Field label="Owning role" style={{ flex: 1, minWidth: 200 }}>
          <input
            value={owner}
            disabled={!enabled}
            onChange={e => setOwner(e.target.value)}
            onBlur={() => patch({ ownerRole: owner.trim() })}
            placeholder="e.g. Head of Credit Risk"
            style={inputStyle}
          />
        </Field>
        {engineSupported ? (
          <Field label="Detection mode" hint="Findings are computed in code over 100% of the source records, then narrated. No token limit applies to detection.">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#0BBF7A', padding: '6px 0' }}>
              <Cpu size={13} /> Computed locally · full population
            </span>
          </Field>
        ) : (
          <Field label="AI generation tokens" hint="This agent has no deterministic detector yet, so findings are AI-generated. This budget caps that generation call (1024–32000). Blank = platform default.">
            <input
              value={tokens}
              disabled={!enabled}
              onChange={e => setTokens(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitTokens}
              placeholder="default"
              inputMode="numeric"
              style={{ ...inputStyle, width: 110, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
            />
          </Field>
        )}
      </div>
    </Card>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      title={on ? 'Enabled — click to disable' : 'Disabled — click to enable'}
      style={{
        width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0, position: 'relative',
        background: on ? '#0BBF7A' : 'var(--color-border)', transition: 'background 0.15s', padding: 0,
      }}
    >
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 9, background: 'white', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
        {label}{hint && <InfoHint text={hint} title={label} size={11} />}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%', padding: '6px 9px', fontSize: 12.5, border: '1px solid var(--color-border)', borderRadius: 6,
  background: 'var(--color-surface-2)', fontFamily: 'inherit', color: 'var(--color-text)',
};
