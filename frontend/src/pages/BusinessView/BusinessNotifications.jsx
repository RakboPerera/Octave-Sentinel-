import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { ESCALATION_CHANNELS } from '../../data/escalationPolicy.js';
import { Card, Eyebrow, Chip } from '../../components/shared/ui.jsx';
import { useDialog } from '../../components/shared/Dialog.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import { Bell, RotateCcw, Mail, MonitorSmartphone } from 'lucide-react';

// ─── NOTIFICATIONS / ESCALATION MATRIX (Settings → Notifications) ────────────
// The documented escalation policy: who is notified, on what trigger, and via
// which channel. A governance artifact an external auditor expects. Delivery
// (email / in-app push) is a separate integration; this is the policy layer.

export default function BusinessNotifications() {
  const { state, dispatch } = useApp();
  const { confirm } = useDialog();
  const policy = state.escalationPolicy || [];

  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)' }}>
            <Bell size={20} style={{ color: '#B45309' }} /> Notifications &amp; Escalation
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 820, lineHeight: 1.55 }}>
            Your documented escalation matrix — who is notified, on which trigger, via which channel. This is the policy an external auditor asks to see. Recipients are role names (not individuals). Delivery is wired to your bank's email/in-app system on deployment.
          </p>
        </div>
        <button onClick={async () => { if (await confirm({ title: 'Reset escalation matrix', message: 'Restore the default escalation rules, recipients, and channels?', confirmLabel: 'Reset', danger: true })) dispatch({ type: 'RESET_ESCALATION_POLICY' }); }} style={ghost}>
          <RotateCcw size={13} /> Reset to defaults
        </button>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 130px', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
          <span><Eyebrow>Trigger</Eyebrow><InfoHint title="Trigger" text="The condition that fires this rule — typically a finding reaching a given severity (e.g. a critical case opening or an SLA breach). Each trigger maps to one escalation row; the deterministic detectors decide when it fires." size={11} /></span>
          <span><Eyebrow>Notify (roles)</Eyebrow><InfoHint title="Notify (roles)" text="The roles alerted when the trigger fires — drawn from your escalation matrix, not named individuals. Editing the row updates who is on the distribution for that trigger." size={11} /></span>
          <span><Eyebrow>Channel</Eyebrow><InfoHint title="Channel" text="How the alert is delivered: email, in-app, or both. This is the policy layer; the actual send is wired to your bank's email/in-app system on deployment." size={11} align="left" /></span>
        </div>
        {policy.map((rule, i) => <RuleRow key={rule.id} rule={rule} last={i === policy.length - 1} dispatch={dispatch} />)}
      </Card>

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', lineHeight: 1.55 }}>
        The escalation matrix complements the severity-based SLA policy on the <strong>Audit Plan</strong>: the SLA sets <em>how fast</em>, this sets <em>who</em> and <em>how</em>.
      </div>
    </div>
  );
}

function RuleRow({ rule, last, dispatch }) {
  const [recipients, setRecipients] = useState((rule.recipients || []).join(', '));
  const [note, setNote] = useState(rule.note || '');
  useEffect(() => { setRecipients((rule.recipients || []).join(', ')); }, [rule.recipients]);
  useEffect(() => { setNote(rule.note || ''); }, [rule.note]);

  function commitRecipients() {
    const arr = recipients.split(',').map(s => s.trim()).filter(Boolean);
    dispatch({ type: 'SET_ESCALATION_RULE', payload: { id: rule.id, patch: { recipients: arr } } });
  }
  function commitNote() { dispatch({ type: 'SET_ESCALATION_RULE', payload: { id: rule.id, patch: { note: note.trim() } } }); }
  function setChannel(ch) { dispatch({ type: 'SET_ESCALATION_RULE', payload: { id: rule.id, patch: { channel: ch } } }); }

  return (
    <div style={{ padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 130px', gap: 12, alignItems: 'start' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{rule.label}</div>
        <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 2, lineHeight: 1.45 }}>{rule.description}</div>
      </div>
      <div>
        <input value={recipients} onChange={e => setRecipients(e.target.value)} onBlur={commitRecipients} placeholder="Role, Role" style={inputStyle} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {(rule.recipients || []).map(r => <Chip key={r} tone="neutral">{r}</Chip>)}
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} onBlur={commitNote} placeholder="Escalation note / deadline" style={{ ...inputStyle, marginTop: 6, fontSize: 11.5 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ESCALATION_CHANNELS.map(ch => {
          const on = rule.channel === ch.id;
          const Icon = ch.id === 'email' ? Mail : ch.id === 'both' ? Bell : MonitorSmartphone;
          return (
            <button key={ch.id} onClick={() => setChannel(ch.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 7, fontSize: 11.5, fontWeight: on ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit',
              background: on ? 'rgba(245,184,65,0.14)' : 'var(--color-surface-2)', color: on ? '#B45309' : 'var(--color-text-2)',
              border: `1px solid ${on ? 'rgba(245,184,65,0.35)' : 'var(--color-border)'}`,
            }}><Icon size={12} /> {ch.label}</button>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '7px 9px', fontSize: 12.5, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface-2)', fontFamily: 'inherit', color: 'var(--color-text)' };
const ghost = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', fontFamily: 'inherit' };
