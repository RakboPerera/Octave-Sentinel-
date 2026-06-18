import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { REGULATORY_FLOORS } from '../../data/regulatoryFloors.js';
import { Card, Eyebrow, Chip } from '../../components/shared/ui.jsx';
import { useDialog } from '../../components/shared/Dialog.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import { Gauge, RotateCcw, RotateCw, AlertTriangle } from 'lucide-react';

// ─── RISK APPETITE (Settings → Risk Appetite) ────────────────────────────────
// The CBSL regulatory floor is statutory and shown read-only. Demo Bank's INTERNAL
// APPETITE — the buffer it chooses to hold above the floor — is policy and
// editable here. Edits flow into the KRI band meters (Now), the ratio cards and
// trend reference lines (Bank Position → Reg Capital), and compliance scoring.
// Appetite must stay on the safe side of the regulatory floor.

const SYM = { gte: '≥', lte: '≤' };

// Only metrics that define an internal appetite are tunable here. Pure CBSL
// ceilings (e.g. single-obligor, connected-group) have no internal buffer by
// default, so they're not listed — but the engine DOES flag against them
// directly (detection triggers at the ceiling, via resolveFloors). If a metric
// is later given an internal_appetite it appears here and tightens detection.
const TUNABLE = Object.values(REGULATORY_FLOORS).filter(f => f.internal_appetite != null);

export default function BusinessRiskAppetite() {
  const { state, dispatch } = useApp();
  const { confirm } = useDialog();
  const ov = state.appetiteOverrides || {};
  const modifiedCount = Object.keys(ov).length;

  return (
    <div style={{ maxWidth: 980, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)' }}>
            <Gauge size={20} style={{ color: '#B45309' }} /> Risk Appetite
            <InfoHint
              title="Risk appetite"
              text="Each row pairs the statutory CBSL floor (fixed) with your internal appetite (editable). The internal appetite is the self-imposed buffer the bank holds above the floor, and it directly sets where the deterministic detectors flag — tightening it makes the engine flag earlier. No model is involved; status is a simple threshold comparison."
            />
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 800, lineHeight: 1.55 }}>
            Set the internal appetite — the buffer the bank holds above each CBSL regulatory floor. The statutory floor (shown on the left) is fixed; your appetite (right) drives the amber "watch" band on the Command Centre, Bank Position, and compliance scoring — and it now <strong>drives detection</strong>: the capital, single-obligor and connected-group detectors flag at your internal appetite, escalating to <strong>critical</strong> only when the CBSL floor itself is breached. Editing appetite changes what the engine flags. Appetite must stay on the safe side of the floor.
          </p>
        </div>
        {modifiedCount > 0 && (
          <button onClick={async () => { if (await confirm({ title: 'Reset risk appetite', message: 'Revert all internal-appetite overrides to the defaults?', confirmLabel: 'Reset', danger: true })) dispatch({ type: 'RESET_APPETITE_OVERRIDES' }); }} style={ghost}>
            <RotateCcw size={13} /> Reset all ({modifiedCount})
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TUNABLE.map(f => <AppetiteRow key={f.key} floor={f} override={ov[f.key]} dispatch={dispatch} />)}
      </div>
    </div>
  );
}

function AppetiteRow({ floor, override, dispatch }) {
  const effective = override != null ? override : floor.internal_appetite;
  const [val, setVal] = useState(String(effective));
  const [err, setErr] = useState('');
  useEffect(() => { setVal(String(override != null ? override : floor.internal_appetite)); setErr(''); }, [override, floor.internal_appetite]);

  const modified = override != null;
  const sym = SYM[floor.compare] || '';

  function commit() {
    const n = parseFloat(val);
    if (!Number.isFinite(n)) { setVal(String(effective)); setErr(''); return; }
    // Appetite must be on the safe side of (or equal to) the regulatory floor.
    const safe = floor.compare === 'gte' ? n >= floor.value : n <= floor.value;
    if (!safe) {
      setErr(`Appetite must be ${sym} the CBSL floor of ${floor.value}${floor.metric}.`);
      setVal(String(effective));
      return;
    }
    setErr('');
    // If it equals the registry default, clear the override (revert to default).
    if (n === floor.internal_appetite) dispatch({ type: 'SET_APPETITE_OVERRIDE', payload: { key: floor.key, value: null } });
    else dispatch({ type: 'SET_APPETITE_OVERRIDE', payload: { key: floor.key, value: n } });
  }

  function revert() { dispatch({ type: 'SET_APPETITE_OVERRIDE', payload: { key: floor.key, value: null } }); }

  return (
    <Card padding={14} accent={modified ? '#B45309' : 'var(--color-border)'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)' }}>{floor.label}</span>
            {modified && <Chip tone="attention">modified</Chip>}
          </div>
          {floor.citation && (
            <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 2 }}>
              {floor.citation.regulator} · {floor.citation.directive}
            </div>
          )}
        </div>

        {/* Regulatory floor — read-only, statutory */}
        <div style={{ textAlign: 'center', minWidth: 120 }}>
          <Eyebrow>CBSL floor</Eyebrow>
          <InfoHint
            title="CBSL floor"
            text={`The statutory regulatory minimum for ${floor.label.toLowerCase()} — fixed by the Central Bank of Sri Lanka${floor.citation ? ` (${floor.citation.regulator}, ${floor.citation.directive})` : ''}. It is read-only here; a breach of this floor escalates the finding to critical.`}
            size={11}
            align="center"
          />
          <div style={{ fontSize: 14, fontWeight: 800, color: '#C41E3A', fontFamily: 'var(--font-display)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
            {sym} {floor.value}{floor.metric}
          </div>
        </div>

        {/* Internal appetite — editable */}
        <div style={{ minWidth: 150 }}>
          <Eyebrow>Internal appetite</Eyebrow>
          <InfoHint
            title="Internal appetite"
            text="The buffer the bank chooses to hold above the CBSL floor. It must stay on the safe side of the floor, and it drives detection: the engine flags this metric at your internal appetite (a deterministic threshold), escalating to critical only when the statutory floor itself is breached."
            size={11}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#B45309' }}>{sym}</span>
            <input
              value={val}
              onChange={e => setVal(e.target.value.replace(/[^0-9.]/g, ''))}
              onBlur={commit}
              inputMode="decimal"
              style={{ width: 76, padding: '6px 8px', fontSize: 13, fontWeight: 700, textAlign: 'right', border: `1px solid ${err ? '#C41E3A' : 'var(--color-border)'}`, borderRadius: 6, background: 'var(--color-surface-2)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{floor.metric}</span>
            {modified && (
              <button onClick={revert} title="Revert to default" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 2, display: 'flex' }}>
                <RotateCw size={13} />
              </button>
            )}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--color-text-3)', marginTop: 2 }}>default {floor.internal_appetite}{floor.metric}</div>
        </div>
      </div>
      {err && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#C41E3A' }}>
          <AlertTriangle size={12} /> {err}
        </div>
      )}
    </Card>
  );
}

const ghost = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', fontFamily: 'inherit' };
