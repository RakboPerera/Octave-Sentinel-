import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import WelcomeTour from './components/layout/WelcomeTour.jsx';
import ApiKeySettings from './components/shared/ApiKeySettings.jsx';
import { useApp } from './context/AppContext.jsx';
import './styles/platform.css';
import './styles/intro.css';

// ─── PAGES (post-agent-platform removal) ─────────────────────────────────────
// Only Presentation (Intro + Login) and Business Platform pages remain. The
// Agent Platform was removed and its pages + their supporting shared
// components have been deleted.
// UI review fix #8 — lazy-load the heavy marketing Intro and the rarely-hit
// reference pages so they're not in the main bundle the authenticated app pays
// for on first paint.
const Intro = lazy(() => import('./pages/Intro/Intro.jsx'));
import Login from './pages/Login/Login.jsx';

// ─── SIMPLIFIED IA (verb-first) ──────────────────────────────────────────────
// Primary surfaces: Now · Investigate · Bank Position · Reports · Settings.
// The three Bank-Position surfaces (Compliance / Reg Capital / Risk Register)
// are composed inside BankPosition; their old standalone routes redirect.
// Now is the flagship landing surface after login — kept eager so the first
// authenticated paint is instant. Every other Business-Platform page is
// route-split via lazy() (UI review fix #8 / code-review B3) so they leave the
// main bundle; they all render inside the single <Suspense> boundary below.
import Now from './pages/BusinessView/Now.jsx';
const BankPosition = lazy(() => import('./pages/BusinessView/BankPosition.jsx'));
const SettingsHub = lazy(() => import('./pages/BusinessView/SettingsHub.jsx'));
const BusinessAgentConfig = lazy(() => import('./pages/BusinessView/BusinessAgentConfig.jsx'));
const BusinessBankProfile = lazy(() => import('./pages/BusinessView/BusinessBankProfile.jsx'));
const BusinessRiskAppetite = lazy(() => import('./pages/BusinessView/BusinessRiskAppetite.jsx'));
const BusinessNotifications = lazy(() => import('./pages/BusinessView/BusinessNotifications.jsx'));
const DetectionAssurance = lazy(() => import('./pages/BusinessView/DetectionAssurance.jsx'));

const BusinessView = lazy(() => import('./pages/BusinessView/BusinessView.jsx'));
const DomainDeepDive = lazy(() => import('./pages/BusinessView/DomainDeepDive.jsx'));
const BusinessRiskHeatmap = lazy(() => import('./pages/BusinessView/BusinessRiskHeatmap.jsx'));
const BusinessCaseManager = lazy(() => import('./pages/BusinessView/BusinessCaseManager.jsx'));
const BusinessAuditPlan = lazy(() => import('./pages/BusinessView/BusinessAuditPlan.jsx'));
const BusinessScenarioLab = lazy(() => import('./pages/BusinessView/BusinessScenarioLab.jsx'));
const BusinessScenarioPlayer = lazy(() => import('./pages/BusinessView/BusinessScenarioPlayer.jsx'));
const BusinessReports = lazy(() => import('./pages/BusinessView/BusinessReports.jsx'));
const BusinessEngineMap = lazy(() => import('./pages/BusinessView/BusinessEngineMap.jsx'));
const BusinessGlossary = lazy(() => import('./pages/BusinessView/BusinessGlossary.jsx'));
const BusinessDataHub = lazy(() => import('./pages/BusinessView/BusinessDataHub.jsx'));
const BusinessRuleParametersPage = lazy(() => import('./pages/BusinessView/BusinessRuleParametersPage.jsx'));

// ─── ERROR BOUNDARY ──────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, retried: false };
    this._retryTimer = null;
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    console.error('Sentinel render error:', error, info?.componentStack?.split('\n').slice(0, 3).join(' '));
    // Auto-retry once after 50ms — clears transient first-render errors
    if (!this.state.retried) {
      this._retryTimer = setTimeout(() => this.setState({ hasError: false, retried: true }), 50);
    }
  }
  componentWillUnmount() { clearTimeout(this._retryTimer); }
  render() {
    if (this.state.hasError) {
      if (!this.state.retried) return null; // first attempt — auto-retries in 50ms
      return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-2)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>A component failed to render. This may be a temporary issue.</div>
          <button onClick={() => this.setState({ hasError: false, retried: false })}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--color-panel)', color: 'white', border: 'none', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RequireAuth({ children }) {
  const { state } = useApp();
  const location = useLocation();
  if (!state.auth?.loggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function PlatformLayout({ children, title }) {
  const { state } = useApp();
  return (
    <RequireAuth>
      <div className="platform-layout">
        <Sidebar />
        <div className="main-content">
          <Header title={title} />
          <main className="page-content animate-fade-in">
            {children}
          </main>
        </div>
        {state.settingsOpen && <ApiKeySettings />}
        <WelcomeTour />
      </div>
    </RequireAuth>
  );
}

export default function App() {
  const location = useLocation();
  const isIntro = location.pathname === '/';

  useEffect(() => {
    if (isIntro) {
      document.body.classList.add('intro-mode');
    } else {
      document.body.classList.remove('intro-mode');
    }
  }, [isIntro]);

  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-3)', fontSize: 13 }}>Loading…</div>}>
    <Routes>
      {/* ─── Presentation ─── */}
      <Route path="/" element={<Intro />} />
      <Route path="/login" element={<Login />} />

      {/* ─── Business Platform (verb-first IA) ─── */}

      {/* NOW — the triage landing. Replaces the 99-cell heatmap as home. */}
      <Route path="/business-view" element={
        <PlatformLayout title="Now"><Now /></PlatformLayout>
      } />
      <Route path="/business-view/now" element={<Navigate to="/business-view" replace />} />

      {/* The full cross-domain heatmap is now a secondary "view as heatmap". */}
      <Route path="/business-view/heatmap" element={
        <PlatformLayout title="Risk Heatmap"><BusinessRiskHeatmap /></PlatformLayout>
      } />
      <Route path="/business-view/risk-heatmap" element={<Navigate to="/business-view/heatmap" replace />} />

      {/* INVESTIGATE — unified case + finding workspace. */}
      <Route path="/business-view/investigate" element={
        <PlatformLayout title="Investigate"><BusinessCaseManager /></PlatformLayout>
      } />
      <Route path="/business-view/cases" element={<Navigate to="/business-view/investigate" replace />} />

      {/* BANK POSITION — tabbed Compliance / Reg Capital / Risk Register. */}
      <Route path="/business-view/position" element={
        <PlatformLayout title="Bank Position"><BankPosition /></PlatformLayout>
      } />
      <Route path="/business-view/compliance" element={<Navigate to="/business-view/position?tab=compliance" replace />} />
      <Route path="/business-view/regulatory-capital" element={<Navigate to="/business-view/position?tab=capital" replace />} />
      <Route path="/business-view/risk-register" element={<Navigate to="/business-view/position?tab=register" replace />} />

      {/* REPORTS — pack builder. */}
      <Route path="/business-view/reports" element={
        <PlatformLayout title="Reports"><BusinessReports /></PlatformLayout>
      } />

      {/* SETTINGS — hub for everything configuration / reference / learn. */}
      <Route path="/business-view/settings" element={
        <PlatformLayout title="Settings"><SettingsHub /></PlatformLayout>
      } />

      {/* Configuration / reference surfaces — reached via Settings hub. */}
      <Route path="/business-view/data" element={
        <PlatformLayout title="Data Sources"><BusinessDataHub /></PlatformLayout>
      } />
      <Route path="/business-view/rule-parameters" element={
        <PlatformLayout title="Rule Parameters"><BusinessRuleParametersPage /></PlatformLayout>
      } />
      <Route path="/business-view/agents" element={
        <PlatformLayout title="Agent Configuration"><BusinessAgentConfig /></PlatformLayout>
      } />
      <Route path="/business-view/bank-profile" element={
        <PlatformLayout title="Bank Profile"><BusinessBankProfile /></PlatformLayout>
      } />
      <Route path="/business-view/risk-appetite" element={
        <PlatformLayout title="Risk Appetite"><BusinessRiskAppetite /></PlatformLayout>
      } />
      <Route path="/business-view/notifications" element={
        <PlatformLayout title="Notifications"><BusinessNotifications /></PlatformLayout>
      } />
      <Route path="/business-view/detection-assurance" element={
        <PlatformLayout title="Detection Assurance"><DetectionAssurance /></PlatformLayout>
      } />
      <Route path="/business-view/audit-plan" element={
        <PlatformLayout title="Audit Plan"><BusinessAuditPlan /></PlatformLayout>
      } />
      <Route path="/business-view/engine-map" element={
        <PlatformLayout title="Engine Map"><BusinessEngineMap /></PlatformLayout>
      } />
      <Route path="/business-view/scenarios" element={
        <PlatformLayout title="Scenario Lab"><BusinessScenarioLab /></PlatformLayout>
      } />
      <Route path="/business-view/scenarios/:scenarioId" element={
        <PlatformLayout title="Scenario Walk-Through"><BusinessScenarioPlayer /></PlatformLayout>
      } />
      <Route path="/business-view/glossary" element={
        <PlatformLayout title="Glossary"><BusinessGlossary /></PlatformLayout>
      } />

      {/* All-domains overview — still reachable, no longer in primary nav. */}
      <Route path="/business-view/overview" element={
        <PlatformLayout title="All Domains"><BusinessView /></PlatformLayout>
      } />

      {/* Domain deep-dive — dynamic, must stay LAST before the catch-all. */}
      <Route path="/business-view/:domainId" element={
        <PlatformLayout title="Domain Deep-Dive"><DomainDeepDive /></PlatformLayout>
      } />

      {/* Any other path → back to Presentation */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
