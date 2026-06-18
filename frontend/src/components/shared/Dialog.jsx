import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

// ─── IN-APP DIALOG (replaces native confirm/prompt/alert) ────────────────────
// UI review fix #4 — the config pages used window.confirm/prompt/alert, which
// are unbranded OS popups that block the thread and look broken on mobile.
// This provides promise-based confirm() / prompt() / alert() via a context hook
// that renders a styled, keyboard-friendly modal consistent with the platform.
//
//   const { confirm, prompt, alert } = useDialog();
//   if (await confirm({ title, message, danger })) { ... }
//   const name = await prompt({ title, message, placeholder });  // null if cancelled

const DialogContext = createContext(null);
export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { kind, title, message, ..., resolve }
  const [value, setValue] = useState('');

  const confirm = useCallback((opts = {}) => new Promise(resolve => {
    setDialog({ kind: 'confirm', confirmLabel: 'Confirm', cancelLabel: 'Cancel', ...opts, resolve });
  }), []);
  const prompt = useCallback((opts = {}) => new Promise(resolve => {
    setValue(opts.defaultValue || '');
    setDialog({ kind: 'prompt', confirmLabel: 'Save', cancelLabel: 'Cancel', ...opts, resolve });
  }), []);
  const alert = useCallback((opts = {}) => new Promise(resolve => {
    setDialog({ kind: 'alert', confirmLabel: 'OK', ...opts, resolve });
  }), []);

  const finish = useCallback((result) => {
    setDialog(d => { d?.resolve(result); return null; });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      {dialog && <DialogModal dialog={dialog} value={value} setValue={setValue} onFinish={finish} />}
    </DialogContext.Provider>
  );
}

function DialogModal({ dialog, value, setValue, onFinish }) {
  const { kind, title, message, confirmLabel, cancelLabel, danger, placeholder } = dialog;
  const accent = danger ? '#C41E3A' : '#B45309';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key === 'Escape') onFinish(kind === 'prompt' ? null : false);
      if (e.key === 'Enter' && kind !== 'prompt') onFinish(true); // confirm & alert both resolve true
    }
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [kind, onFinish]);

  const cancelResult = kind === 'prompt' ? null : false;
  const confirmResult = kind === 'prompt' ? (value || '').trim() : true;

  return createPortal(
    <div onMouseDown={() => onFinish(cancelResult)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,30,0.5)', zIndex: 10080, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onMouseDown={e => e.stopPropagation()}
        style={{ width: 'min(440px, 100%)', background: 'white', borderRadius: 14, boxShadow: '0 30px 70px rgba(0,0,0,0.4)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {danger && <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(196,30,58,0.1)', color: '#C41E3A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertTriangle size={17} /></span>}
          <div style={{ flex: 1 }}>
            {title && <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>{title}</div>}
            {message && <div style={{ fontSize: 12.5, color: 'var(--color-text-2)', marginTop: 5, lineHeight: 1.55 }}>{message}</div>}
          </div>
        </div>

        {kind === 'prompt' && (
          <div style={{ padding: '6px 20px 4px' }}>
            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (value || '').trim()) onFinish((value || '').trim()); }}
              placeholder={placeholder || ''}
              style={{ width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-surface-2)', fontFamily: 'inherit' }}
            />
          </div>
        )}

        <div style={{ padding: '12px 20px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {kind !== 'alert' && (
            <button onClick={() => onFinish(cancelResult)}
              style={{ padding: '8px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', borderRadius: 8, fontFamily: 'inherit' }}>
              {cancelLabel}
            </button>
          )}
          <button autoFocus={kind !== 'prompt'} onClick={() => onFinish(confirmResult)}
            disabled={kind === 'prompt' && !(value || '').trim()}
            style={{ padding: '8px 18px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: accent, color: 'white', border: 'none', borderRadius: 8, fontFamily: 'inherit', opacity: (kind === 'prompt' && !(value || '').trim()) ? 0.5 : 1 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
