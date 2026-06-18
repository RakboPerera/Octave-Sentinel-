import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import OctaveLogo from '../../components/shared/OctaveLogo.jsx';

const DEMO_CRED = { email: 'auditor@demobank.lk', password: 'sentinel2026' };

// Role drives permissions + segregation of duties (four-eyes). Preparers work
// cases; reviewers/approvers conclude them and approve threshold changes.
// Approver roles mirror AUTHORIZED_APPROVER_ROLES in data/agentMeta.js.
const ROLE_OPTIONS = [
  { value: 'Audit Associate', group: 'Preparer' },
  { value: 'Auditor', group: 'Preparer' },
  { value: 'Senior Audit Manager', group: 'Reviewer' },
  { value: 'Head of Internal Audit', group: 'Approver' },
  { value: 'Chief Internal Auditor', group: 'Approver' },
  { value: 'Chief Risk Officer', group: 'Approver' },
  { value: 'Chief Compliance Officer', group: 'Approver' },
];

const CAPABILITIES = [
  { icon: '◈', label: '17 Detection Agents', sub: 'Credit · KYC · AML · Fraud · Controls' },
  { icon: '⟳', label: '100% Population Coverage', sub: 'No sampling across LKR 700.3 Bn AUM' },
  { icon: '◉', label: 'Orchestrator Correlation', sub: 'Multi-agent confirmed findings' },
  { icon: '⊟', label: 'Case Workflow', sub: 'STR · CBSL · remediation gates' },
];

const SIGNALS = [
  { color: '#C41E3A', label: 'SUS-017', text: 'LKR 1.24 Bn unreconciled · 94 days · CBSL breach' },
  { color: '#4B3F72', label: 'STF-1847', text: 'Insider risk score 94/100 across 6 dimensions' },
  { color: '#2D5A8E', label: 'BNK-0841-X', text: '15 CEFT transfers in 22 min · all sub-threshold' },
];

export default function Login() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_CRED.email);
  const [password, setPassword] = useState(DEMO_CRED.password);
  const [role, setRole] = useState('Senior Audit Manager');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signalIdx, setSignalIdx] = useState(0);

  // The login screen is a deliberate, stable step in the demo flow. Even if a
  // prior session is still authenticated we render it (credentials pre-filled)
  // rather than auto-bouncing to the platform — that auto-redirect made /login
  // flash and vanish when entering from the landing. Sign-in handles routing.

  // Cycle live signal preview
  useEffect(() => {
    const t = setInterval(() => setSignalIdx(i => (i + 1) % SIGNALS.length), 2800);
    return () => clearInterval(t);
  }, []);

  function submit(e) {
    e?.preventDefault?.();
    setError('');
    if (!email || !password) { setError('Enter email and password'); return; }
    if (password.length < 4) { setError('Password too short'); return; }
    setLoading(true);
    // Mock auth — any reasonable input passes. Demo creds surface a nicer role label.
    setTimeout(() => {
      const name = email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      dispatch({ type: 'LOGIN', payload: { email, name, role, initials: initialsOf(name) } });
      navigate('/business-view', { replace: true });
    }, 420);
  }

  const signal = SIGNALS[signalIdx];

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f1a', color: '#f2f2ee', fontFamily: 'var(--font-display), var(--font)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Ambient background */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(900px 600px at 20% 20%, rgba(38,234,159,0.10), transparent 60%), radial-gradient(700px 500px at 80% 80%, rgba(24,95,165,0.18), transparent 60%), linear-gradient(180deg, #0b0f1a 0%, #05070d 100%)' }} />
      <GridOverlay />

      {/* Top nav */}
      <nav style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Sentinel by <OctaveLogo height={12} style={{ verticalAlign:'baseline' }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Demo Bank · FY 2025</div>
        </div>
        <button onClick={() => navigate('/')}
          style={{ background: 'transparent', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.14)', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          ← Back to overview
        </button>
      </nav>

      {/* Main split */}
      <main style={{ position: 'relative', zIndex: 2, flex: 1, display: 'grid', gridTemplateColumns: '1.05fr 1fr', maxWidth: 1280, width: '100%', margin: '0 auto', padding: '48px 40px', gap: 64, alignItems: 'center' }}>

        {/* LEFT — pitch */}
        <section>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(38,234,159,0.10)', border: '1px solid rgba(38,234,159,0.30)', color: '#26EA9F', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#26EA9F', animation: 'pulse 2s infinite' }} />
            Secure audit console
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, margin: 0, color: 'white' }}>
            Sign in to the<br/>
            <span style={{ color: '#26EA9F' }}>Sentinel</span> platform.
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55, marginTop: 20, maxWidth: 480 }}>
            Seventeen AI detection agents monitor 100% of Demo Bank transactions, accounts, and entities continuously. Sign in to review today's findings, orchestrator correlations, and open investigation cases.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 32, maxWidth: 540 }}>
            {CAPABILITIES.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                <div style={{ fontSize: 18, color: '#26EA9F', lineHeight: 1 }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', marginTop: 2 }}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Live signal preview */}
          <div style={{ marginTop: 28, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, maxWidth: 540 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)' }}>Live agent signal</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {SIGNALS.map((_, i) => (
                  <span key={i} style={{ width: 5, height: 5, borderRadius: 3, background: i === signalIdx ? '#26EA9F' : 'rgba(255,255,255,0.18)' }} />
                ))}
              </div>
            </div>
            <div key={signalIdx} style={{ display: 'flex', gap: 10, animation: 'fadeIn 0.4s ease-out' }}>
              <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 800, color: 'white', background: signal.color, letterSpacing: '0.04em' }}>{signal.label}</span>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>{signal.text}</div>
            </div>
          </div>
        </section>

        {/* RIGHT — login card */}
        <section>
          <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #26EA9F, #13a06b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#05070d' }}>
                <Shield size={16} strokeWidth={2.5} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>Auditor sign in</div>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.48)', marginBottom: 24 }}>
              Use your Demo Bank audit credentials. SSO and MFA will be enabled for production rollout.
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field
                label="Email"
                icon={<User size={14} />}
                value={email}
                onChange={setEmail}
                placeholder="name@demobank.lk"
                type="email"
                autoFocus
              />
              <Field
                label="Password"
                icon={<Lock size={14} />}
                value={password}
                onChange={setPassword}
                placeholder="••••••••••"
                type="password"
              />

              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Role</span>
                <select value={role} onChange={e => setRole(e.target.value)}
                  style={{ padding: '11px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#f2f2ee', fontSize: 13, fontFamily: 'inherit' }}>
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value} style={{ color: '#111' }}>{r.value} — {r.group}</option>)}
                </select>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>Reviewers/approvers conclude cases & approve threshold changes; a case must be concluded by someone other than its preparer (four-eyes).</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'rgba(255,255,255,0.50)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: '#26EA9F' }} />
                  Keep me signed in
                </label>
                <a href="#" onClick={e => e.preventDefault()} style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Forgot password?</a>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(196,30,58,0.12)', border: '1px solid rgba(196,30,58,0.30)', color: '#F6A5B2', fontSize: 12 }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ marginTop: 4, padding: '13px 18px', background: loading ? 'rgba(38,234,159,0.45)' : 'linear-gradient(135deg, #26EA9F, #13a06b)', color: '#05070d', fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', border: 'none', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 18px rgba(38,234,159,0.25)' }}>
                {loading ? 'Signing in…' : <>Sign in <ArrowRight size={15} strokeWidth={2.5} /></>}
              </button>
            </form>

            {/* Demo creds hint */}
            {/* FIX L4: In production builds, switch to an explicit "any
                credentials accepted" warning so a deployed instance is not
                mistaken for a real SSO flow. The green "Demo access" badge
                reads as promotional copy — fine in dev, misleading in prod. */}
            {import.meta.env.PROD ? (
              <div style={{ marginTop: 22, padding: '12px 14px', background: 'rgba(196,30,58,0.10)', border: '2px solid rgba(196,30,58,0.40)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F6A5B2', marginBottom: 6 }}>
                  <AlertTriangle size={12} /> Demo authentication
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>
                  This sign-in is a mock. <strong style={{ color: '#F6A5B2' }}>Any email and any password of 4+ characters will succeed.</strong> SSO + MFA must replace this screen before any non-demo deployment.
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
                  Walkthrough credentials: <code style={{ color: 'white', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>auditor@demobank.lk</code> · <code style={{ color: 'white', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>sentinel2026</code>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 22, padding: '12px 14px', background: 'rgba(38,234,159,0.06)', border: '1px dashed rgba(38,234,159,0.30)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#26EA9F', marginBottom: 6 }}>
                  <CheckCircle2 size={12} /> Demo access
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>
                  Pre-filled for you: <code style={{ color: 'white', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>auditor@demobank.lk</code> · <code style={{ color: 'white', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>sentinel2026</code>
                </div>
              </div>
            )}
          </div>

          {/* Footer badges */}
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: 'rgba(255,255,255,0.40)' }}>
            <span>© 2026 <OctaveLogo height={8} style={{ verticalAlign:'baseline' }} /> · Demo Bank</span>
            <span style={{ display: 'flex', gap: 14 }}>
              <span>SOC 2 Type II</span>
              <span>ISO 27001</span>
              <span>CBSL aligned</span>
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, icon, value, onChange, placeholder, type = 'text', autoFocus }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${focus ? '#26EA9F' : 'rgba(255,255,255,0.12)'}`, transition: 'border-color 0.15s' }}>
        <span style={{ color: focus ? '#26EA9F' : 'rgba(255,255,255,0.45)' }}>{icon}</span>
        <input
          autoFocus={autoFocus}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: 13.5, fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );
}

function GridOverlay() {
  return (
    <svg aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.35 }}>
      <defs>
        <pattern id="gridPat" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gridPat)" />
    </svg>
  );
}

function initialsOf(name) {
  return name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AU';
}
