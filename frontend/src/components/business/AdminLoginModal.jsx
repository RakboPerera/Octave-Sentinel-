import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AUTHORIZED_APPROVER_ROLES } from '../../data/agentMeta.js';

// ─── ADMIN LOGIN MODAL ────────────────────────────────────────────────────────
// Shown when an unauthorised user attempts an action that requires an
// authorised-approver role (e.g. approving / rejecting a feedback-loop
// recommendation). The user signs in as one of the AUTHORIZED_APPROVER_ROLES;
// on success the `onLoginSuccess` callback fires with the new user object so
// the calling page can resume the interrupted action.
//
// Demo-only: any 4-digit PIN is accepted. In a production deployment this
// would be replaced with the bank's SSO / MFA flow.

export default function AdminLoginModal({ open, onClose, onLoginSuccess, actionLabel = 'proceed' }) {
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setRole(''); setName(''); setPin(''); setError(''); setSubmitting(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the name field once mounted
    setTimeout(() => { nameRef.current?.focus(); }, 40);
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  const pinOk = /^\d{4}$/.test(pin);
  const nameOk = name.trim().length >= 2;
  const roleOk = !!role;
  const canSubmit = pinOk && nameOk && roleOk && !submitting;

  function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    // Demo flow — no network, just synthesise a user object and hand it back.
    // Tiny delay so the button state transition is visible.
    setTimeout(() => {
      const user = { name: name.trim(), role, loginAt: new Date().toISOString(), viaAdminModal: true };
      onLoginSuccess(user);
      setSubmitting(false);
    }, 120);
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,30,0.55)', zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(460px, 100%)', maxHeight: '90vh', overflowY: 'auto',
          background: 'white', borderRadius: 14, boxShadow: '0 32px 70px rgba(0,0,0,0.4)',
          padding: 0, border: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(124,58,237,0.12)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={18} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>Admin sign-in required</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Feedback-loop rule changes</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.55, margin: 0 }}>
            You are about to <strong>{actionLabel}</strong> a rule-parameter change. Only users in the following roles may approve or reject feedback-loop recommendations. Sign in as an authorised role to continue — every approval is captured in the threshold audit log with your name and role attached.
          </p>

          <div>
            <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'block', marginBottom: 5 }}>Role *</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 7, background: 'var(--color-surface-2)', fontFamily: 'inherit' }}
            >
              <option value="">— Select an authorised role —</option>
              {AUTHORIZED_APPROVER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'block', marginBottom: 5 }}>Name *</label>
            <input
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 7, background: 'var(--color-surface-2)', fontFamily: 'inherit' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'block', marginBottom: 5 }}>
              Admin PIN * <span style={{ color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 'normal', textTransform: 'none' }}>(4 digits)</span>
            </label>
            <input
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit) submit(); }}
              style={{ width: '100%', padding: '8px 10px', fontSize: 15, border: '1px solid var(--color-border)', borderRadius: 7, background: 'var(--color-surface-2)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.3em' }}
            />
          </div>

          {/* Demo-mode notice — escalated to red in production builds so that
              a deployed instance cannot be mistaken for a real auth flow.
              FIX L3: Strengthen the warning when import.meta.env.PROD is true
              (Vite production build) — these are the builds most likely to be
              shown to bankers / regulators who would NOT expect a mock PIN. */}
          {import.meta.env.PROD ? (
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(196,30,58,0.10)', border: '2px solid rgba(196,30,58,0.45)', borderRadius: 6 }}>
              <AlertTriangle size={14} style={{ color: '#C41E3A', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 11, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                <strong style={{ color: '#C41E3A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Production build — demo authentication is active.</strong>
                <div style={{ marginTop: 4 }}>This screen accepts <em>any</em> 4-digit PIN and trusts whatever role you select. <strong>Do not use it to authorise real rule changes.</strong> A bank SSO + MFA flow must replace this modal before any non-demo deployment.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, padding: '8px 10px', background: 'rgba(245,184,65,0.1)', border: '1px solid rgba(245,184,65,0.3)', borderRadius: 6 }}>
              <AlertTriangle size={13} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                <strong style={{ color: '#B45309' }}>Demo mode.</strong> Any 4-digit PIN is accepted for demonstration. In a production deployment this form is replaced by the bank's SSO + MFA challenge.
              </div>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 11.5, color: '#C41E3A', padding: '6px 10px', background: 'rgba(196,30,58,0.08)', borderRadius: 6 }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', borderRadius: 7, fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              padding: '7px 16px', fontSize: 12, fontWeight: 800, cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? '#7C3AED' : 'var(--color-surface-2)',
              color: canSubmit ? 'white' : 'var(--color-text-3)',
              border: 'none', borderRadius: 7, fontFamily: 'inherit',
              opacity: canSubmit ? 1 : 0.55,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign in & continue'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
