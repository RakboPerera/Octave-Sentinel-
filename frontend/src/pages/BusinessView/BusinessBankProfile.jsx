import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { DEFAULT_BANK_PROFILE, BANK_PROFILE_FIELDS } from '../../data/bankProfile.js';
import { Card, Eyebrow } from '../../components/shared/ui.jsx';
import { useDialog } from '../../components/shared/Dialog.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import { Building2, RotateCcw, Save, CheckCircle } from 'lucide-react';

// ─── BANK PROFILE (Settings → Bank Profile) ──────────────────────────────────
// Tenant identity + balance-sheet benchmarks. Identity (name / short name / FY
// / as-of) drives the header context; benchmarks (assets / equity / profit /
// customers) drive the ISA 320 materiality guardrails on the Audit Plan. This
// is what makes the platform configurable to a bank rather than fixed to Demo Bank.
// Money fields are entered in LKR Bn for usability and stored in LKR.

export default function BusinessBankProfile() {
  const { state, dispatch } = useApp();
  const { confirm } = useDialog();
  const profile = state.bankProfile || DEFAULT_BANK_PROFILE;

  // Local form state; commit all on Save.
  const [form, setForm] = useState(() => toForm(profile));
  const [saved, setSaved] = useState(false);
  useEffect(() => { setForm(toForm(profile)); }, [profile]);

  const dirty = JSON.stringify(toForm(profile)) !== JSON.stringify(form);

  function set(key, value) { setForm(f => ({ ...f, [key]: value })); setSaved(false); }

  function save() {
    const patch = {};
    for (const f of BANK_PROFILE_FIELDS.identity) patch[f.key] = (form[f.key] ?? '').trim();
    for (const f of BANK_PROFILE_FIELDS.benchmarks) {
      const raw = form[f.key];
      if (f.type === 'lkrBn') {
        const bn = parseFloat(raw);
        patch[f.key] = Number.isFinite(bn) && bn >= 0 ? Math.round(bn * 1e9) : 0;
      } else { // int
        const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
        patch[f.key] = Number.isFinite(n) && n >= 0 ? n : 0;
      }
    }
    dispatch({ type: 'SET_BANK_PROFILE', payload: patch });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function reset() {
    if (!await confirm({ title: 'Reset bank profile', message: 'Restore the Demo Bank FY2025 default identity and benchmark figures?', confirmLabel: 'Reset', danger: true })) return;
    dispatch({ type: 'RESET_BANK_PROFILE' });
  }

  return (
    <div style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)' }}>
            <Building2 size={20} style={{ color: '#B45309' }} /> Bank Profile
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 760, lineHeight: 1.55 }}>
            Your bank's identity and benchmark figures. Identity appears in the header; the benchmarks drive the ISA 320 materiality guardrails on the Audit Plan. Set these to make the platform yours rather than the Demo Bank demo.
          </p>
        </div>
        <button onClick={reset} style={ghost}>
          <RotateCcw size={13} /> Reset to defaults
        </button>
      </div>

      <Card padding={18}>
        <span style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 12 }}>
          <Eyebrow>Identity</Eyebrow>
          <InfoHint
            title="Identity"
            text="Your bank's name, short name, financial year and as-of date. These are display values that set the header context across the platform — they don't feed any calculation."
            size={11}
          />
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {BANK_PROFILE_FIELDS.identity.map(f => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              <input value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} style={inputStyle} />
            </Field>
          ))}
        </div>
      </Card>

      <Card padding={18}>
        <span style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 12 }}>
          <Eyebrow>Benchmarks</Eyebrow>
          <InfoHint
            title="Benchmarks"
            text="Balance-sheet figures (assets, equity, profit, customers) entered in LKR Bn. These drive the ISA 320 materiality guardrails on the Audit Plan — materiality is computed as a fixed percentage of the relevant benchmark, so changing them changes the materiality thresholds."
            size={11}
          />
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {BANK_PROFILE_FIELDS.benchmarks.map(f => (
            <Field key={f.key} label={f.type === 'lkrBn' ? `${f.label} (LKR Bn)` : f.label} hint={f.hint}>
              <input
                value={form[f.key] ?? ''}
                onChange={e => set(f.key, e.target.value)}
                inputMode="decimal"
                style={{ ...inputStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
              />
            </Field>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={save} disabled={!dirty} style={{ ...primary, opacity: dirty ? 1 : 0.5, cursor: dirty ? 'pointer' : 'default' }}>
          <Save size={14} /> Save profile
        </button>
        {saved && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#0BBF7A' }}><CheckCircle size={14} /> Saved</span>}
        {dirty && !saved && <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Unsaved changes</span>}
      </div>
    </div>
  );
}

// Build the editable form from the stored profile (money LKR → Bn string).
function toForm(p) {
  const f = {};
  for (const fld of BANK_PROFILE_FIELDS.identity) f[fld.key] = p[fld.key] ?? '';
  for (const fld of BANK_PROFILE_FIELDS.benchmarks) {
    f[fld.key] = fld.type === 'lkrBn'
      ? (p[fld.key] != null ? String(+(p[fld.key] / 1e9).toFixed(2)) : '')
      : (p[fld.key] != null ? String(p[fld.key]) : '');
  }
  return f;
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-2)' }}>
        {label}{hint && <InfoHint text={hint} title={label} size={11} />}
      </span>
      {children}
    </label>
  );
}

const inputStyle = { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 7, background: 'var(--color-surface-2)', fontFamily: 'inherit', color: 'var(--color-text)' };
const ghost = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', fontFamily: 'inherit' };
const primary = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 800, fontFamily: 'inherit', background: 'linear-gradient(135deg, #F5B841, #E09A1F)', color: 'white', border: 'none' };
