import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BusinessCompliance from './BusinessCompliance.jsx';
import BusinessRegulatoryCapital from './BusinessRegulatoryCapital.jsx';
import BusinessRiskRegister from './BusinessRiskRegister.jsx';
import { ShieldCheck, TrendingUp, FileText } from 'lucide-react';

// ─── BANK POSITION ───────────────────────────────────────────────────────────
// Consolidates the three read-only "where does the bank stand" surfaces —
// Compliance Scoring, Regulatory Capital, Risk Register — behind one route with
// tabs. Previously these were three separate sidebar entries; an auditor reads
// them as one coherent "regulatory position" picture, so they live together.
// Deep-links (?tab=capital / ?tab=register) keep old bookmarks working.

const TABS = [
  { id: 'compliance', label: 'Compliance Scoring', icon: ShieldCheck, Component: BusinessCompliance },
  { id: 'capital',    label: 'Regulatory Capital', icon: TrendingUp,  Component: BusinessRegulatoryCapital },
  { id: 'register',   label: 'Risk Register',      icon: FileText,    Component: BusinessRiskRegister },
];

export default function BankPosition() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initial = TABS.find(t => t.id === params.get('tab'))?.id || 'compliance';
  const [active, setActive] = useState(initial);

  // Re-sync the active tab when the ?tab= query changes in place (e.g. a deep-link
  // to a different tab is followed while already on /position — the component does
  // not remount, so without this the tab would stay stale).
  useEffect(() => {
    const fromUrl = TABS.find(t => t.id === new URLSearchParams(location.search).get('tab'))?.id;
    if (fromUrl && fromUrl !== active) setActive(fromUrl);
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const ActiveComponent = TABS.find(t => t.id === active)?.Component || BusinessCompliance;

  function pick(id) {
    setActive(id);
    // Keep the URL in sync so the tab is bookmarkable / shareable.
    navigate(`/business-view/position?tab=${id}`, { replace: true });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Bank Position</h2>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-2)', margin: '4px 0 0' }}>
          Where Demo Bank stands against CBSL regulatory floors and its own internal appetite — capital, liquidity, compliance, and the consolidated risk register.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', cursor: 'pointer',
                fontSize: 13, fontWeight: isActive ? 700 : 500, fontFamily: 'inherit',
                background: 'transparent', border: 'none',
                color: isActive ? '#B45309' : 'var(--color-text-2)',
                borderBottom: `2px solid ${isActive ? '#F5B841' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Active surface */}
      <div>
        <ActiveComponent />
      </div>
    </div>
  );
}
