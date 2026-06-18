import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Landmark, FileText, Settings, Key } from 'lucide-react';
import { fixtureCases } from '../../data/caseRegistry.js';
import { useApp } from '../../context/AppContext.jsx';
import { DOMAINS } from '../../data/domainRegistry.js';
import { DETECTION_AGENT_IDS } from '../../data/agentMeta.js';
import OctaveLogo from '../shared/OctaveLogo.jsx';

// ─── BUSINESS SIDEBAR — VERB-FIRST (simplified) ──────────────────────────────
// Reorganised from 20+ links (browse-by-domain) to FIVE verbs that mirror how
// an auditor actually works: see what needs attention (Now), work the cases
// (Investigate), read the bank's regulatory position (Bank Position), produce
// outputs (Reports), and configure / learn (Settings).
//
// The 11 business domains are no longer destinations — they're a filter on the
// Investigate page and clickable tiles on Now. Audit Plan, Rule Parameters,
// Data Hub, Engine Map, Scenario Lab and Glossary all live under Settings.
// Old routes still resolve via redirects in App.jsx, so bookmarks survive.

const NAV = [
  { to: '/business-view',          end: true,  icon: LayoutDashboard, label: 'Now',           sub: "What needs you today" },
  { to: '/business-view/investigate', end: false, icon: FolderKanban,  label: 'Investigate',   sub: 'Cases & findings', badge: 'cases' },
  { to: '/business-view/position', end: false, icon: Landmark,        label: 'Bank Position', sub: 'Capital · liquidity · compliance' },
  { to: '/business-view/reports',  end: false, icon: FileText,        label: 'Reports',       sub: 'Board & CBSL packs' },
  { to: '/business-view/settings', end: false, icon: Settings,        label: 'Settings',      sub: 'Data · rules · plan · learn' },
];

export default function BusinessSidebar() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  // Static demo cases only count in demo mode (once cleared, show the bank's own).
  const activeCases = fixtureCases(state).filter(c => c.status !== 'resolved' && c.status !== 'closed').length
    + (state.cases || []).filter(c => c.status !== 'resolved' && c.status !== 'closed').length;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => navigate('/business-view')} style={{ cursor: 'pointer' }}>
        <div className="sidebar-logo-title">
          Sentinel
          <span style={{ color: '#F5B841', fontWeight: 600 }}> · </span>
          <OctaveLogo height={11} style={{ verticalAlign: 'baseline' }} />
        </div>
        <div className="sidebar-logo-sub">Internal Audit Platform</div>
      </div>

      <div className="sidebar-section" style={{ marginTop: 8 }}>
        {NAV.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ alignItems: 'flex-start', paddingTop: 9, paddingBottom: 9 }}
            >
              <Icon size={16} className="sidebar-item-icon" style={{ marginTop: 1 }} />
              <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                  {item.badge === 'cases' && activeCases > 0 && (
                    <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: 'rgba(196,30,58,0.15)', color: '#F6A5B2' }}>
                      {activeCases}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 1 }}>{item.sub}</span>
              </span>
            </NavLink>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div
          className="sidebar-api-indicator"
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
        >
          <Key size={13} />
          <span style={{ flex: 1 }}>
            {state.apiKeyStatus === 'valid' ? 'API Key Connected' : 'Configure API Key'}
          </span>
          <span className={`dot ${state.apiKeyStatus === 'valid' ? 'dot-green' : 'dot-gray'}`} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 8, paddingLeft: 8 }}>
          {DOMAINS.length} domains · {DETECTION_AGENT_IDS.length} detection agents
        </div>
      </div>
    </aside>
  );
}
