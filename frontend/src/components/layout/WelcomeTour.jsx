import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, FolderKanban, Landmark, FileText, Settings, X, ArrowRight, ArrowLeft } from 'lucide-react';

// ─── WELCOME TOUR (first-login orientation) ──────────────────────────────────
// A one-time, dismissible overlay that teaches the verb-first workflow so a
// first-time auditor isn't dropped into the platform cold. Keyed by a
// localStorage flag so it shows exactly once; "Skip" or finishing both set it.
// Purely additive — it overlays the app and touches no existing state.

const TOUR_KEY = 'sentinel_tour_seen';

const STEPS = [
  {
    icon: LayoutDashboard,
    title: 'Start at "Now"',
    body: 'Every session opens here. It answers one question — what needs you today — with a ranked queue of the cases that are critical, breaching SLA, or still open. No hunting through dashboards.',
  },
  {
    icon: FolderKanban,
    title: 'Work it in "Investigate"',
    body: 'Open any case to see its full explainability: a one-line decision up top, then "Show evidence" for the signals and trail, and "Audit-grade view" for citations and control failures. Copy the whole thing as a working paper for your evidence file.',
  },
  {
    icon: Landmark,
    title: 'Check "Bank Position"',
    body: "Capital, liquidity, and compliance against both the CBSL regulatory floor and Demo Bank's internal appetite — kept distinct so an amber internal flag is never mistaken for a regulatory breach.",
  },
  {
    icon: FileText,
    title: 'Produce in "Reports"',
    body: 'Build Board and CBSL submission packs from your findings — entity-deduped exposure, regulatory citations, and remediation deadlines already attached to each row.',
  },
  {
    icon: Settings,
    title: 'Configure in "Settings"',
    body: 'Connect your data-lake sources, tune detection thresholds (opening on the dozen that matter, grouped by audit concern), set your audit plan, and manage your API key. Everything configuration lives here.',
  },
];

export default function WelcomeTour() {
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem(TOUR_KEY) === '1'; } catch { return true; }
  });
  const [step, setStep] = useState(0);

  if (seen) return null;

  function finish() {
    try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* storage blocked — tour just won't persist */ }
    setSeen(true);
  }

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,15,26,0.6)', zIndex: 10070, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 'min(520px, 100%)', background: 'white', borderRadius: 16, boxShadow: '0 30px 70px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,184,65,0.14)', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
              Getting started · {step + 1} of {STEPS.length}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{s.title}</div>
          </div>
          <button onClick={finish} aria-label="Skip tour" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px', fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.65, minHeight: 96 }}>
          {s.body}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', paddingBottom: 4 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? '#F5B841' : 'var(--color-border)', transition: 'all 0.2s' }} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button onClick={finish} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-3)', fontFamily: 'inherit' }}>
            Skip
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={secondaryBtn}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button onClick={() => (isLast ? finish() : setStep(s => s + 1))} style={primaryBtn}>
              {isLast ? 'Get started' : <>Next <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9,
  fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
  background: 'linear-gradient(135deg, #F5B841, #E09A1F)', color: 'white', border: 'none',
};
const secondaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)',
};
