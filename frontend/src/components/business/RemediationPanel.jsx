import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';

// Remediation tracker for a confirmed finding — the management-action lifecycle
// that turns "we found it" into "it's owned, due-dated, fixed, and re-verified".
// This is what makes the platform an AUDIT workflow, not just a detector.
export const REM_STATUS = [
  { v: 'open', label: 'Open', color: '#C41E3A' },
  { v: 'in_progress', label: 'In progress', color: '#B45309' },
  { v: 'remediated', label: 'Remediated (mgmt)', color: '#185FA5' },
  { v: 'verified', label: 'Verified & closed', color: '#0BBF7A' },
  { v: 'risk_accepted', label: 'Risk accepted', color: '#6B7280' },
];
const CLOSED = ['verified', 'risk_accepted'];

export function isOverdue(rem, asOfMs) {
  if (!rem?.dueDate) return false;
  const due = Date.parse(rem.dueDate);
  return Number.isFinite(due) && due < (asOfMs || Date.now()) && !CLOSED.includes(rem.status);
}

export default function RemediationPanel({ caseId, asOfMs }) {
  const { state, dispatch } = useApp();
  const asOf = asOfMs ?? (state.bankProfile?.asOfDate ? Date.parse(state.bankProfile.asOfDate) : Date.now());
  const r = state.remediation?.[caseId] || { status: 'open', mgmtOwner: '', agreedAction: '', dueDate: '', mgmtResponse: '' };
  const set = (patch) => dispatch({ type: 'SET_REMEDIATION', caseId, payload: patch, actor: state.auth?.user?.name });
  const overdue = isOverdue(r, asOf);
  const inp = { width: '100%', padding: '6px 9px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', fontFamily: 'inherit', color: 'var(--color-text)' };
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 14, background: 'var(--color-surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ClipboardCheck size={14} style={{ color: '#0F6E56' }} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--color-text)' }}>Remediation</span>
        {overdue && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(196,30,58,0.14)', color: '#C41E3A' }}><AlertTriangle size={11} /> OVERDUE</span>}
      </div>
      {/* status pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {REM_STATUS.map(s => (
          <button key={s.v} onClick={() => set({ status: s.v })} style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${r.status === s.v ? s.color : 'var(--color-border)'}`, background: r.status === s.v ? s.color : 'var(--color-surface)', color: r.status === s.v ? '#fff' : 'var(--color-text-2)' }}>{s.label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Management owner</span>
          <input style={inp} value={r.mgmtOwner || ''} placeholder="e.g. Head of Credit Ops" onChange={e => set({ mgmtOwner: e.target.value })} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: overdue ? '#C41E3A' : 'var(--color-text-3)' }}>Target date</span>
          <input type="date" style={{ ...inp, borderColor: overdue ? '#C41E3A' : 'var(--color-border)' }} value={r.dueDate || ''} onChange={e => set({ dueDate: e.target.value })} />
        </label>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Agreed action</span>
        <textarea style={{ ...inp, minHeight: 46, resize: 'vertical' }} value={r.agreedAction || ''} placeholder="The corrective action management has committed to." onChange={e => set({ agreedAction: e.target.value })} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Management response</span>
        <textarea style={{ ...inp, minHeight: 40, resize: 'vertical' }} value={r.mgmtResponse || ''} placeholder="Management's response / acceptance / rationale." onChange={e => set({ mgmtResponse: e.target.value })} />
      </label>
      {r.updatedAt && <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 8 }}>Last updated {String(r.updatedAt).replace('T', ' ').slice(0, 16)}{r.history?.length ? ` · ${r.history.length} status change${r.history.length === 1 ? '' : 's'}` : ''}</div>}
    </div>
  );
}
