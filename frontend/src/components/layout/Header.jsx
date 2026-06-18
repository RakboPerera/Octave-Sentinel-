import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, matchPath } from 'react-router-dom';
import { Key, Bell, ChevronRight, LogOut, ChevronDown, Presentation, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { fixtureCases } from '../../data/caseRegistry.js';
import { DOMAINS } from '../../data/domainRegistry.js';

// ─── HEADER (post-agent-platform removal) ────────────────────────────────────
// Route labels now cover Business Platform routes only. Previously Header
// also labelled /agents/*, /cases, /heatmap, /reports, etc. — those routes
// no longer exist.

const ROUTE_LABELS = {
  '/business-view':                    'Now',
  '/business-view/heatmap':            'Risk Heatmap',
  '/business-view/investigate':        'Investigate',
  '/business-view/position':           'Bank Position',
  '/business-view/reports':            'Reports',
  '/business-view/settings':           'Settings',
  '/business-view/overview':           'All Domains',
  '/business-view/audit-plan':         'Audit Plan',
  '/business-view/scenarios':          'Scenario Lab',
  '/business-view/engine-map':         'Engine Map',
  '/business-view/glossary':           'Glossary',
  '/business-view/data':               'Data Sources',
  '/business-view/rule-parameters':    'Rule Parameters',
  '/business-view/agents':             'Agent Configuration',
  '/business-view/bank-profile':       'Bank Profile',
  '/business-view/risk-appetite':      'Risk Appetite',
  '/business-view/notifications':      'Notifications',
};

export default function Header() {
  const { state, dispatch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  // Match domain deep-dive routes e.g. /business-view/consumer. Only treat the
  // param as a domain when it's a REAL domain id — otherwise named routes like
  // /business-view/investigate would be mis-read as a "domain".
  const domainMatch = matchPath('/business-view/:domainId', location.pathname);
  const matchedDomain = domainMatch ? DOMAINS.find(d => d.id === domainMatch.params.domainId) : null;
  const domainLabel = matchedDomain ? matchedDomain.label : null;
  // Match scenario-player routes e.g. /business-view/scenarios/:id
  const scenarioPlayerMatch = matchPath('/business-view/scenarios/:scenarioId', location.pathname);
  const label = scenarioPlayerMatch ? 'Scenario Walk-Through'
             : ROUTE_LABELS[location.pathname]
             || domainLabel
             || 'Sentinel';
  // Static demo cases only count in demo mode; otherwise count the bank's own.
  const allCriticalCases = [...fixtureCases(state), ...(state.cases || [])];
  const criticalCases = allCriticalCases.filter(c => (c.status === 'open' || c.status === 'investigating') && c.severity === 'critical').length;
  const isLive = Object.keys(state.agentResults || {}).length > 0;
  // Provenance: engine-on-a-connected-source = truly "Live"; engine-on-the-bundled
  // sample feed = "Demo (engine run)" — NOT "Live data" (no real source is wired).
  // demoMode stays true until the user clears the demo / connects a source.
  const dataBadge = !isLive
    ? { label: 'Demo data', color: '#B45309', bg: 'rgba(245,184,65,0.14)', bd: 'rgba(245,184,65,0.3)', green: false, title: 'Showing a demo dataset from the bundled sample feed. Connect the bank data lake in Settings → Data Sources to run live.' }
    : state.demoMode
    ? { label: 'Demo (engine run)', color: '#185FA5', bg: 'rgba(24,95,165,0.12)', bd: 'rgba(24,95,165,0.3)', green: false, title: 'Demo dataset analysed by the deterministic engine. Connect your data lake in Settings → Data Sources (and clear demo data) to go live.' }
    : { label: 'Live data', color: 'var(--color-green, #0BBF7A)', bg: 'rgba(11,191,122,0.12)', bd: 'rgba(11,191,122,0.3)', green: true, title: 'Showing results from your connected data sources.' };

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const user = state.auth?.user;
  function handleLogout() {
    dispatch({ type: 'LOGOUT' });
    navigate('/login', { replace: true });
  }

  return (
    <header className="header">
      <div className="header-breadcrumb">
        <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => navigate('/business-view')}>Sentinel</span>
        <ChevronRight size={13} style={{ opacity: 0.4 }} />
        <span className="header-breadcrumb-current">{label}</span>
        {matchedDomain && (
          <>
            <ChevronRight size={13} style={{ opacity: 0.4 }} />
            <span style={{ fontSize: 12, color: '#F5B841' }}>Domain View</span>
          </>
        )}
      </div>

      <div className="header-actions">
        {/* FIX M8: Surface the persistence warning written by the previous
            session so the user knows their results may not have survived. */}
        {state.persistenceWarning && (
          <div
            className="header-badge"
            title={state.persistenceWarning}
            style={{ background: 'rgba(245,184,65,0.15)', color: '#F5B841', borderColor: 'rgba(245,184,65,0.35)', cursor: 'pointer', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onClick={() => dispatch({ type: 'DISMISS_PERSISTENCE_WARNING' })}
          >
            <AlertTriangle size={12} />
            Storage warning
            <X size={11} style={{ opacity: 0.7, marginLeft: 4 }} />
          </div>
        )}

        {/* Demo vs Live data state — so the user always knows whether the
            numbers came from their upload or the bundled demo dataset. */}
        <div
          className="header-badge"
          title={dataBadge.title}
          style={{ background: dataBadge.bg, color: dataBadge.color, borderColor: dataBadge.bd }}
        >
          <span className={`dot ${dataBadge.green ? 'dot-green' : ''}`} style={dataBadge.green ? undefined : { background: dataBadge.color }} />
          {dataBadge.label}
        </div>

        <div className="header-badge">
          <span className="dot dot-green" />
          {[state.bankProfile?.shortName, state.bankProfile?.financialYear, state.bankProfile?.asOfDate].filter(Boolean).join(' · ')}
        </div>

        {criticalCases > 0 && (
          <div
            className="header-badge"
            style={{ background: 'var(--color-red-light)', color: 'var(--color-red)', borderColor: 'rgba(163,45,45,0.2)', cursor: 'pointer' }}
            onClick={() => navigate('/business-view/investigate', { state: { severityFilter: 'critical' } })}
          >
            <Bell size={12} />
            {criticalCases} Critical
          </div>
        )}

        <button
          className={`header-key-btn ${state.apiKeyStatus === 'valid' ? 'connected' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
        >
          <Key size={13} />
          {state.apiKeyStatus === 'valid' ? 'Connected' : 'API Key'}
        </button>

        {user && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', color: 'rgba(255,255,255,0.85)' }}
              title={`${user.name} · ${user.role}`}
            >
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #26EA9F, #13a06b)', color: '#05070d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                {user.initials}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 240, background: 'var(--color-panel)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.45)', zIndex: 50 }}>
                <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{user.email}</div>
                  <div style={{ fontSize: 10.5, color: '#26EA9F', fontWeight: 700, marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{user.role}</div>
                </div>
                {/* Presentation is a demo-only marketing affordance — moved
                    here from the top bar to declutter the header (UI review #5). */}
                {state.demoMode && (
                  <button onClick={() => { setMenuOpen(false); navigate('/'); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'transparent', color: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Presentation size={14} /> View presentation
                  </button>
                )}
                <button onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'transparent', color: '#F6A5B2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,30,58,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
