import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Sliders, RotateCcw, Play, CheckCircle2, Info, AlertTriangle, History, Zap, Loader2, X, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { THRESHOLDS, PRESETS, PRESET_VALUES, getDefaults, getAgentDefaults, getAllThresholds, getEverydayThresholds, applyPresetToDefaults } from '../../data/thresholdRegistry.js';
import { reEvaluateAllResults, computeImpactDiff } from '../../utils/thresholdEvaluator.js';
import { thresholdEngineStatus } from '../../utils/detectionEngine.js';
import { demoData } from '../../data/demoData.js';
import { AGENT_META, isAuthorizedApprover, AUTHORIZED_APPROVER_ROLES } from '../../data/agentMeta.js';
import AdminLoginModal from '../../components/business/AdminLoginModal.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import { useDialog } from '../../components/shared/Dialog.jsx';

// ─── RULE PARAMETERS ─────────────────────────────────────────────────────────
// Central control for all detection thresholds across all agents. Edits are
// staged locally; clicking "Apply & Rerun" commits them and (in demo mode)
// re-classifies all demo findings in <50ms by calling the threshold evaluator.

export default function BusinessRuleParametersPage() {
  const { state, dispatch } = useApp();
  const { confirm, prompt, alert } = useDialog();

  // Staging: local copy the user edits before clicking Apply.
  const [staged, setStaged] = useState(() => JSON.parse(JSON.stringify(state.thresholds)));
  const [activeAgent, setActiveAgent] = useState('credit');
  const [search, setSearch] = useState('');
  // Phase E: open on the curated "key thresholds" view, not the full grid.
  const [viewMode, setViewMode] = useState('everyday'); // 'everyday' | 'expert'
  const everydayGroups = useMemo(() => getEverydayThresholds(), []);
  const everydayCount = everydayGroups.reduce((s, g) => s + g.rules.length, 0);
  const totalCount = getAllThresholds().length;
  const [rerunStatus, setRerunStatus] = useState(null); // null | 'running' | 'done'
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Rationale capture — every Apply writes a record to the threshold audit
  // log. An explicit rationale is encouraged (ISA 330 defensibility) and
  // required for any change that loosens a regulatory-floor threshold.
  const [rationaleDraft, setRationaleDraft] = useState('');

  const allAgents = Object.keys(THRESHOLDS);
  const agentBlock = THRESHOLDS[activeAgent];

  // Count changed-from-default per agent for the sidebar badges
  const changedCounts = useMemo(() => {
    const defaults = getDefaults();
    const counts = {};
    for (const a of allAgents) {
      const ad = defaults[a] || {};
      const st = staged[a] || {};
      counts[a] = Object.keys(ad).filter(k => ad[k] !== st[k]).length;
    }
    return counts;
  }, [staged, allAgents]);
  const totalChanged = Object.values(changedCounts).reduce((s, v) => s + v, 0);

  // Impact preview (live)
  const impact = useMemo(() => {
    const before = demoData;
    const after = reEvaluateAllResults(demoData, staged);
    return computeImpactDiff(before, after);
  }, [staged]);

  function setStagedRule(agentId, key, value) {
    setStaged(prev => ({ ...prev, [agentId]: { ...(prev[agentId] || {}), [key]: value } }));
  }
  function resetStaged() {
    setStaged(JSON.parse(JSON.stringify(getDefaults())));
  }
  function applyPresetLocal(name) {
    setStaged(applyPresetToDefaults(name));
  }
  // Custom presets — the bank's saved "house tuning" snapshots.
  const customPresets = state.customPresets || {};
  async function saveCustomPreset() {
    const raw = await prompt({ title: 'Save preset', message: 'Save the current thresholds as a reusable preset.', placeholder: 'e.g. Demo Bank house tuning' });
    const name = (raw || '').trim();
    if (!name) return;
    if (PRESETS[name]) { await alert({ title: 'Name reserved', message: `"${name}" is a built-in preset name. Please choose another.`, confirmLabel: 'OK' }); return; }
    dispatch({ type: 'SAVE_CUSTOM_PRESET', payload: { name, thresholds: JSON.parse(JSON.stringify(staged)) } });
  }
  function applyCustomPreset(name) {
    const p = customPresets[name];
    if (p?.thresholds) setStaged(JSON.parse(JSON.stringify(p.thresholds)));
  }
  async function deleteCustomPreset(name) {
    if (await confirm({ title: 'Delete preset', message: `Delete the saved preset "${name}"?`, confirmLabel: 'Delete', danger: true })) dispatch({ type: 'DELETE_CUSTOM_PRESET', payload: { name } });
  }
  function applyAndRerun() {
    setRerunStatus('running');
    const user = state.auth?.user || null;
    const actor = user?.name || 'user';
    const actorRole = user?.role || null;
    const rationale = rationaleDraft.trim() || null;
    // Commit staged → context
    Object.entries(staged).forEach(([agentId, rules]) => {
      Object.entries(rules).forEach(([key, value]) => {
        if (state.thresholds?.[agentId]?.[key] !== value) {
          dispatch({
            type: 'SET_THRESHOLD',
            payload: { agentId, key, value, actor, actorRole, rationale },
          });
        }
      });
    });
    // Re-evaluate demo data and push into agentResults (this drives all views).
    const reEvaluated = reEvaluateAllResults(demoData, staged);
    Object.entries(reEvaluated).forEach(([agentId, result]) => {
      dispatch({ type: 'AGENT_SUCCESS', agentId, payload: result });
    });
    setRationaleDraft('');
    setTimeout(() => setRerunStatus('done'), 150);
    setTimeout(() => setRerunStatus(null), 2800);
  }

  const filteredRules = agentBlock.rules.filter(r =>
    !search || r.label.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())
  );

  const recommendations = state.feedbackRecommendations || [];
  const user = state.auth?.user || null;
  const canApprove = isAuthorizedApprover(user);

  // Pending intent — when a non-authorised user clicks approve/reject, stash
  // the intent, open the admin-login modal, and replay the action after
  // successful authentication.
  const [pendingIntent, setPendingIntent] = useState(null);
  // { type: 'approve'|'reject', recommendationId, reason? }

  function runIntent(intent, asUser) {
    if (!intent) return;
    const reviewer = asUser?.name || 'Approver';
    if (intent.type === 'approve') {
      dispatch({ type: 'APPROVE_RECOMMENDATION', payload: { recommendationId: intent.recommendationId, reviewer } });
    } else if (intent.type === 'reject') {
      dispatch({ type: 'REJECT_RECOMMENDATION', payload: { recommendationId: intent.recommendationId, reason: intent.reason || '', reviewer } });
    }
  }

  function approveRecommendation(id) {
    const intent = { type: 'approve', recommendationId: id };
    if (canApprove) return runIntent(intent, user);
    setPendingIntent(intent);
  }
  function rejectRecommendation(id, reason) {
    const intent = { type: 'reject', recommendationId: id, reason };
    if (canApprove) return runIntent(intent, user);
    setPendingIntent(intent);
  }

  function onAdminLoginSuccess(loggedInUser) {
    // 1. Persist the login in global state (makes the role sticky across the page).
    dispatch({ type: 'LOGIN', payload: loggedInUser });
    // 2. Replay the deferred intent now that the session is authorised.
    const intent = pendingIntent;
    setPendingIntent(null);
    runIntent(intent, loggedInUser);
  }

  function signOutAdmin() {
    dispatch({ type: 'LOGOUT' });
  }

  // ─── Feedback-loop trigger ──────────────────────────────────────────────────
  // Builds the envelope from the auditor's case-workbench markings and POSTs to
  // /api/agent/feedbackLoop. The response lands in state.feedbackRecommendations
  // via SET_FEEDBACK_RECOMMENDATIONS.
  const [feedbackRunning, setFeedbackRunning] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const hasApiKey = state.apiKey && state.apiKeyStatus === 'valid';

  const fpEnvelope = useMemo(() => buildFeedbackEnvelope(state), [state.caseWorkbench, state.thresholds, state.cases]);

  async function runFeedbackLoop() {
    if (!hasApiKey || feedbackRunning) return;
    setFeedbackError(null);
    setFeedbackRunning(true);
    try {
      const res = await axios.post('/api/agent/feedbackLoop', { envelope: fpEnvelope }, {
        headers: { 'x-api-key': state.apiKey },
        timeout: 120000,
      });
      // Map the prompt's snake_case schema to the camelCase shape the UI and
      // reducer expect. The demo recommendations in AppContext are already
      // camelCase, so the two sources become interchangeable here.
      const recs = (res.data.result?.recommendations || []).map((r, i) => ({
        id: r.id || `REC-${Date.now()}-${i}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        agentId: r.agent_id || r.agentId,
        ruleId: r.rule_id || r.ruleId,
        currentValue: r.current_value ?? r.currentValue,
        recommendedValue: r.recommended_value ?? r.recommendedValue,
        delta: r.delta,
        rationale: r.rationale,
        confidence: r.confidence,
        sourceCaseIds: r.source_case_ids || r.sourceCaseIds || [],
        expectedImpact: (r.expected_impact || r.expectedImpact) && {
          falsePositivesEliminated: (r.expected_impact || r.expectedImpact).false_positives_eliminated
            ?? (r.expected_impact || r.expectedImpact).falsePositivesEliminated,
          criticalFindingsPreserved: (r.expected_impact || r.expectedImpact).critical_findings_preserved
            ?? (r.expected_impact || r.expectedImpact).criticalFindingsPreserved,
          criticalFindingsSuppressed: (r.expected_impact || r.expectedImpact).critical_findings_suppressed
            ?? (r.expected_impact || r.expectedImpact).criticalFindingsSuppressed,
        },
      }));
      dispatch({ type: 'SET_FEEDBACK_RECOMMENDATIONS', payload: recs });
    } catch (err) {
      setFeedbackError(err.response?.data?.error || err.message);
    } finally {
      setFeedbackRunning(false);
    }
  }

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <HeaderBar
        activePreset={state.activePreset}
        totalChanged={totalChanged}
        onPreset={applyPresetLocal}
        onReset={resetStaged}
        onRerun={applyAndRerun}
        rerunStatus={rerunStatus}
        onToggleLog={() => setShowAuditLog(s => !s)}
        customPresets={customPresets}
        onApplyCustom={applyCustomPreset}
        onDeleteCustom={deleteCustomPreset}
        onSaveCustom={saveCustomPreset}
      />

      <FeedbackRecommendationsPanel
        recommendations={recommendations}
        canApprove={canApprove}
        currentUser={user}
        onApprove={approveRecommendation}
        onReject={rejectRecommendation}
        onSignOut={signOutAdmin}
        lastRunAt={state.feedbackLoopLastRunAt}
        onRun={runFeedbackLoop}
        running={feedbackRunning}
        runError={feedbackError}
        canRun={hasApiKey}
        fpCount={fpEnvelope.false_positives.length}
      />

      <AdminLoginModal
        open={!!pendingIntent}
        onClose={() => setPendingIntent(null)}
        onLoginSuccess={onAdminLoginSuccess}
        actionLabel={pendingIntent?.type === 'approve' ? 'approve and apply' : 'reject'}
      />

      <ImpactBar impact={impact} />

      <ViewModeToggle mode={viewMode} onMode={setViewMode} everydayCount={everydayCount} totalCount={totalCount} />

      {viewMode === 'everyday' ? (
        <EverydayPanel groups={everydayGroups} staged={staged} onChange={setStagedRule} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14 }}>
          <AgentListPanel
            agents={allAgents}
            active={activeAgent}
            onSelect={setActiveAgent}
            changedCounts={changedCounts}
          />

          <RulesPanel
            agentId={activeAgent}
            agentBlock={agentBlock}
            staged={staged}
            search={search}
            onSearch={setSearch}
            rules={filteredRules}
            onChange={(k, v) => setStagedRule(activeAgent, k, v)}
            defaults={getAgentDefaults(activeAgent)}
          />
        </div>
      )}

      {totalChanged > 0 && (
        <RationaleCapture rationale={rationaleDraft} onChange={setRationaleDraft} />
      )}

      <FalsePositiveByRulePanel caseWorkbench={state.caseWorkbench} recommendations={recommendations} />

      {showAuditLog && <AuditLogPanel log={state.thresholdAuditLog} />}
    </div>
  );
}

// ─── RATIONALE CAPTURE (Wave 5 #2) ───────────────────────────────────────────
// Every threshold change writes an audit-log entry; capturing the rationale
// here means the log entry can record WHY the change was made, not just
// that it happened. Required by ISA 330 for defensible parameter changes.
function RationaleCapture({ rationale, onChange }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid #B45309', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <History size={13} style={{ color: '#B45309' }} />
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#B45309' }}>Change rationale</div>
        <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>Optional for most changes · REQUIRED when loosening a regulatory-floor threshold</span>
      </div>
      <textarea
        value={rationale}
        onChange={e => onChange(e.target.value)}
        rows={2}
        placeholder="e.g. 'Q2 vintage review surfaced elevated FPD — tightening DPD Stage 2 trigger to 25 days. ALCO-approved.'"
        style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface-2)', fontFamily: 'inherit', resize: 'vertical' }}
      />
      <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4, lineHeight: 1.5 }}>
        Captured in the threshold audit log alongside the old → new value, timestamp, and actor role. This is what an external auditor will ask to see.
      </div>
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function HeaderBar({ activePreset, totalChanged, onPreset, onReset, onRerun, rerunStatus, onToggleLog, customPresets = {}, onApplyCustom, onDeleteCustom, onSaveCustom }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Sliders size={22} style={{ color: '#F5B841' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Rule Parameters</h2>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', marginTop: 2 }}>
            Tune detection thresholds across every agent. Changes apply to all views when you click Apply & Rerun.
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6, maxWidth: 720, lineHeight: 1.5, padding: '8px 10px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 7 }}>
            <strong>How thresholds work:</strong> each value here is a <strong>hard floor</strong> — anything past it always flags. Several detectors add an <strong>adaptive peer-relative layer on top</strong> (robust-z vs the population), so a statistical outlier can be caught even below the fixed cut, never above it. The false-discovery-rate level (≈0.05) and the robust-z cutoff (≈3.5) are fixed methodological constants, not tunable knobs. The badge on each row shows whether it’s <em>live in the engine</em> or a non-detection setting.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <PresetSelector activePreset={activePreset} onPreset={onPreset} customPresets={customPresets} onApplyCustom={onApplyCustom} onDeleteCustom={onDeleteCustom} onSaveCustom={onSaveCustom} />
        {totalChanged > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 14, background: 'rgba(245,184,65,0.12)', color: '#B45309', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={12} />
            {totalChanged} staged change{totalChanged !== 1 ? 's' : ''}
          </div>
        )}
        <button onClick={onToggleLog} style={secondaryBtn}><History size={13} /> Audit log</button>
        <button onClick={onReset} style={secondaryBtn}><RotateCcw size={13} /> Reset</button>
        <button onClick={onRerun} disabled={rerunStatus === 'running'} style={{ ...primaryBtn, opacity: rerunStatus === 'running' ? 0.7 : 1 }}>
          {rerunStatus === 'done' ? <><CheckCircle2 size={13} /> Applied</> :
           rerunStatus === 'running' ? <><Zap size={13} /> Rerunning…</> :
           <><Play size={13} /> Apply & Rerun All Agents</>}
        </button>
      </div>
    </div>
  );
}

const primaryBtn = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
  fontSize: 12, fontWeight: 700, cursor: 'pointer',
  background: 'linear-gradient(135deg, #F5B841, #E09A1F)', color: 'white', border: 'none',
  boxShadow: '0 2px 6px rgba(245,184,65,0.3)',
};
const secondaryBtn = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
  fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
  background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)',
};

// ─── PRESET SELECTOR ─────────────────────────────────────────────────────────
function PresetSelector({ activePreset, onPreset, customPresets = {}, onApplyCustom, onDeleteCustom, onSaveCustom }) {
  const customNames = Object.keys(customPresets);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', background: 'var(--color-surface-2)', borderRadius: 16, padding: 3, gap: 2, border: '1px solid var(--color-border)' }}>
        {Object.keys(PRESETS).map(p => (
          <button
            key={p}
            onClick={() => onPreset(p)}
            title={PRESETS[p].description}
            style={{
              padding: '5px 11px', borderRadius: 13,
              fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: activePreset === p ? '#F5B841' : 'transparent',
              color: activePreset === p ? 'white' : 'var(--color-text-2)',
              transition: 'all 0.12s',
            }}
          >
            {PRESETS[p].label}
          </button>
        ))}
      </div>

      {/* Custom (house) presets — apply on click, × to delete. */}
      {customNames.map(name => (
        <span key={name} title={`Saved ${customPresets[name]?.createdAt?.slice(0, 10) || ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 6px 4px 10px', borderRadius: 13, fontSize: 11.5, fontWeight: 700, background: 'rgba(24,95,165,0.08)', color: '#185FA5', border: '1px solid rgba(24,95,165,0.25)' }}>
          <button onClick={() => onApplyCustom(name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontFamily: 'inherit', fontSize: 11.5, padding: 0 }}>{name}</button>
          <button onClick={() => onDeleteCustom(name)} title="Delete preset" aria-label={`Delete ${name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: 0, display: 'flex' }}>
            <X size={11} />
          </button>
        </span>
      ))}

      <button onClick={onSaveCustom} title="Save the current thresholds as a reusable preset" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 13, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px dashed var(--color-border)', fontFamily: 'inherit' }}>
        <Save size={12} /> Save as preset
      </button>
    </div>
  );
}

// ─── IMPACT BAR ──────────────────────────────────────────────────────────────
function ImpactBar({ impact }) {
  const { before, after, delta } = impact;
  const showDelta = delta.critical !== 0 || delta.high !== 0 || delta.medium !== 0;
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', width: 110, display: 'flex', alignItems: 'center' }}>
        Impact Preview
        <InfoHint title="Impact preview" align="left" text="A live what-if: the deterministic severity rules are re-run over the sample population at your staged thresholds and compared with the current ones. The tiles show the resulting Critical/High/Medium counts — nothing is committed until you click Apply & Rerun." />
      </div>
      <SeverityTile label="Critical" before={before.critical} after={after.critical} delta={delta.critical} color="#C41E3A" help="Findings the severity rules would classify Critical at your staged thresholds. The big number is the new count, 'was' is the current count, and the arrow is the change — green down means fewer flagged, red up means more." />
      <SeverityTile label="High" before={before.high} after={after.high} delta={delta.high} color="#B45309" help="Findings classified High at the staged thresholds. Big number = staged count, 'was' = current count, arrow = the difference. Re-computed deterministically over the sample population, not estimated." />
      <SeverityTile label="Medium" before={before.medium} after={after.medium} delta={delta.medium} color="#CA8A04" help="Findings classified Medium at the staged thresholds. Big number = staged count, 'was' = current count, arrow = the difference between them — nothing is committed until you Apply & Rerun." />
      {!showDelta && (
        <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginLeft: 'auto' }}>
          <Info size={12} style={{ display: 'inline', marginRight: 4 }} />
          No severity changes at current thresholds
        </div>
      )}
    </div>
  );
}

function SeverityTile({ label, before, after, delta, color, help }) {
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '·';
  const deltaColor = delta > 0 ? color : delta < 0 ? '#0BBF7A' : 'var(--color-text-3)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color, display: 'flex', alignItems: 'center' }}>{label}{help && <InfoHint text={help} title={`${label} — impact preview`} size={11} />}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{after}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>was {before}</div>
        {delta !== 0 && <div style={{ fontSize: 11.5, fontWeight: 800, color: deltaColor }}>{arrow}{Math.abs(delta)}</div>}
      </div>
    </div>
  );
}

// ─── AGENT LIST ──────────────────────────────────────────────────────────────
// ─── VIEW MODE TOGGLE (Phase E) ──────────────────────────────────────────────
function ViewModeToggle({ mode, onMode, everydayCount, totalCount }) {
  const tab = (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: active ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'rgba(245,184,65,0.12)' : 'var(--color-surface)',
    color: active ? '#B45309' : 'var(--color-text-2)',
    border: `1px solid ${active ? 'rgba(245,184,65,0.35)' : 'var(--color-border)'}`,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => onMode('everyday')} style={tab(mode === 'everyday')}>
          Key thresholds <span style={{ fontSize: 10.5, opacity: 0.8 }}>({everydayCount})</span>
        </button>
        <button type="button" onClick={() => onMode('expert')} style={tab(mode === 'expert')}>
          All controls <span style={{ fontSize: 10.5, opacity: 0.8 }}>({totalCount})</span>
        </button>
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
        {mode === 'everyday'
          ? 'The thresholds most audits adjust, grouped by concern. Switch to All controls for the full per-agent grid.'
          : 'Every tunable threshold across all agents. Switch to Key thresholds for the curated short list.'}
      </span>
    </div>
  );
}

// ─── EVERYDAY PANEL (Phase E) ────────────────────────────────────────────────
// Renders the curated subset grouped by audit concern. Reuses RuleRow so the
// control behaves identically to the expert grid; only the grouping differs.
function EverydayPanel({ groups, staged, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map(g => (
        <div key={g.concern} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{g.concern}</h3>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{g.rules.length} key threshold{g.rules.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {g.rules.map(rule => {
              const agentId = rule.agentId;
              const localKey = rule.id.split('.').slice(1).join('.');
              const value = staged[agentId]?.[localKey] ?? rule.default;
              return (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  value={value}
                  defaultValue={rule.default}
                  onChange={v => onChange(agentId, localKey, v)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentListPanel({ agents, active, onSelect, changedCounts }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '10px 0', maxHeight: 720, overflowY: 'auto' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-3)', padding: '6px 16px 10px' }}>
        Agents ({agents.length})
      </div>
      {agents.map(a => {
        const meta = AGENT_META[a] || {};
        const changed = changedCounts[a] || 0;
        const isActive = active === a;
        return (
          <button
            key={a}
            onClick={() => onSelect(a)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              padding: '9px 16px', fontSize: 12.5, fontWeight: isActive ? 700 : 500,
              background: isActive ? 'rgba(245,184,65,0.1)' : 'transparent',
              color: isActive ? '#B45309' : 'var(--color-text)',
              border: 'none', borderLeft: `3px solid ${isActive ? '#F5B841' : 'transparent'}`,
              cursor: 'pointer', transition: 'all 0.1s',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 4, background: meta.color || 'var(--color-text-3)' }} />
            <span style={{ flex: 1 }}>{meta.name || a}</span>
            {changed > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 9, background: '#F5B841', color: 'white' }}>{changed}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── RULES PANEL ─────────────────────────────────────────────────────────────
function RulesPanel({ agentId, agentBlock, staged, search, onSearch, rules, onChange, defaults }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, marginBottom: 6 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{agentBlock.agentLabel}</h3>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
            {agentBlock.group}
          </div>
        </div>
        <input
          placeholder="Search thresholds…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{ width: 220, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {rules.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-text-3)', padding: '16px 0' }}>No thresholds match your search.</div>}
        {rules.map(rule => {
          const localKey = rule.id.split('.').slice(1).join('.');
          const currentValue = staged[agentId]?.[localKey];
          const defaultValue = defaults[localKey];
          return (
            <RuleRow
              key={rule.id}
              rule={rule}
              value={currentValue}
              defaultValue={defaultValue}
              onChange={v => onChange(localKey, v)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── ENGINE-STATUS BADGE ─────────────────────────────────────────────────────
// Tells the user, per threshold, whether editing it actually changes what the
// deterministic engine flags ("Live in engine") or whether it's a non-detection
// knob (notification policy, action SLA, legacy, etc.). The status is derived
// from the SAME source the coverage guardrail uses (thresholdEngineStatus), so
// the badge can never drift from reality — a knob that stops driving detection
// loses its green badge automatically.
const ENGINE_STATUS_BADGE = {
  engine:        { label: 'Live in engine',      color: '#0BBF7A', bg: 'rgba(11,191,122,0.13)', help: 'Drives live detection — editing this changes what the engine flags on real data.' },
  notification:  { label: 'Notification policy', color: '#185FA5', bg: 'rgba(24,95,165,0.10)',  help: 'A regulatory notification/reporting trigger, not a detection rule. Editing it does not change what is flagged.' },
  sla:           { label: 'Action SLA',          color: '#185FA5', bg: 'rgba(24,95,165,0.10)',  help: 'An action deadline used by escalation/SLA tracking, not detection.' },
  informational: { label: 'Informational',       color: '#6B7280', bg: 'rgba(107,114,128,0.12)', help: 'The input arrives pre-aggregated; this value is contextual and does not change detection.' },
  'needs-input': { label: 'Needs data column',   color: '#B45309', bg: 'rgba(245,184,65,0.15)', help: 'Computable once the data feed carries the required column. Not active in detection yet.' },
  meta:          { label: 'Feedback-loop setting', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', help: 'Tunes the feedback-loop meta-agent, not a detection threshold.' },
  retired:       { label: 'Legacy (inactive)',   color: '#6B7280', bg: 'rgba(107,114,128,0.12)', help: 'An LLM-era knob the deterministic engine replaced. It no longer affects detection.' },
};
function EngineStatusBadge({ ruleId }) {
  const parts = String(ruleId || '').split('.');
  const agentId = parts[0];
  const key = parts.slice(1).join('.');
  if (!agentId || !key) return null;
  let status;
  try { status = thresholdEngineStatus(agentId, key); } catch { status = null; }
  const cfg = ENGINE_STATUS_BADGE[status];
  if (!cfg) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 7px', borderRadius: 8, background: cfg.bg, color: cfg.color, letterSpacing: '0.03em' }}>
        {cfg.label}
      </span>
      <InfoHint text={cfg.help} title={cfg.label} size={11} />
    </span>
  );
}

function RuleRow({ rule, value, defaultValue, onChange }) {
  const changed = value !== defaultValue;
  const pct = rule.bounds ? ((value - rule.bounds.min) / (rule.bounds.max - rule.bounds.min)) * 100 : 0;

  // Compute preset values for this rule — shown as a compact row below the slider.
  const presetVals = {};
  for (const [p, overrides] of Object.entries(PRESET_VALUES)) {
    presetVals[p] = overrides[rule.id] !== undefined ? overrides[rule.id] : rule.default;
  }

  return (
    <div style={{ padding: 14, background: changed ? 'rgba(245,184,65,0.05)' : 'var(--color-surface-2)', border: `1px solid ${changed ? 'rgba(245,184,65,0.3)' : 'var(--color-border)'}`, borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>
            {rule.label}
            <EngineStatusBadge ruleId={rule.id} />
            {changed && <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: '#F5B841', color: 'white', marginLeft: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Modified</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 2, lineHeight: 1.5 }}>{rule.description}</div>
          {rule.regulatory && (
            <div style={{ fontSize: 10.5, color: '#185FA5', marginTop: 4, fontWeight: 600 }}>
              Regulatory basis: {rule.regulatory}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 140 }}>
          <input
            type="number"
            value={value ?? defaultValue}
            onChange={e => onChange(Number(e.target.value))}
            step={rule.bounds?.step || 1}
            min={rule.bounds?.min}
            max={rule.bounds?.max}
            style={{ width: 110, padding: '5px 8px', fontSize: 13, fontWeight: 700, textAlign: 'right', borderRadius: 6, border: '1px solid var(--color-border)', fontFamily: 'var(--font-display)' }}
          />
          <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>default {defaultValue}</div>
        </div>
      </div>
      {rule.bounds && (() => {
        // Context strip above the slider: shows the shipped default position
        // and (when defined) the recommended-range green zone, so tuning is a
        // visual decision — "how far am I moving from default / out of the
        // recommended band?" — not a blind number nudge.
        const span = (rule.bounds.max - rule.bounds.min) || 1;
        const pct = (v) => Math.max(0, Math.min(100, ((v - rule.bounds.min) / span) * 100));
        const rec = Array.isArray(rule.recommended_range) ? rule.recommended_range : null;
        return (
          <div style={{ marginTop: 8 }}>
            <div style={{ position: 'relative', height: 5, marginBottom: 5 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 3 }} />
              {rec && (
                <div title={`Recommended ${rec[0]}–${rec[1]}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(rec[0])}%`, width: `${Math.max(0, pct(rec[1]) - pct(rec[0]))}%`, background: 'rgba(11,191,122,0.28)', borderRadius: 3 }} />
              )}
              <span title={`Default ${defaultValue}`} style={{ position: 'absolute', top: -2, left: `${pct(defaultValue)}%`, width: 2, height: 9, background: 'var(--color-text-2)', transform: 'translateX(-1px)', borderRadius: 1 }} />
            </div>
            <input
              type="range"
              min={rule.bounds.min}
              max={rule.bounds.max}
              step={rule.bounds.step || 1}
              value={value ?? defaultValue}
              onChange={e => onChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#F5B841' }}
            />
            <div style={{ fontSize: 9, color: 'var(--color-text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 2, height: 8, background: 'var(--color-text-2)', borderRadius: 1, display: 'inline-block' }} /> default {defaultValue}</span>
              {rec && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 6, background: 'rgba(11,191,122,0.28)', borderRadius: 2, display: 'inline-block' }} /> recommended {rec[0]}–{rec[1]}</span>}
            </div>
          </div>
        );
      })()}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-3)', marginTop: 4 }}>
        <span>min {rule.bounds?.min}</span>
        {rule.recommended_range && (
          <span style={{ color: '#0BBF7A', fontWeight: 600 }}>
            recommended {rule.recommended_range[0]}–{rule.recommended_range[1]}
          </span>
        )}
        <span>max {rule.bounds?.max}</span>
      </div>

      {/* Preset comparison row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--color-border)' }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Presets</span>
        {Object.entries(presetVals).map(([p, v]) => (
          <span
            key={p}
            title={`${p}: ${v}`}
            style={{
              fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8,
              background: v === value ? 'rgba(245,184,65,0.18)' : 'var(--color-surface)',
              color: v === value ? '#B45309' : 'var(--color-text-2)',
              border: `1px solid ${v === value ? 'rgba(245,184,65,0.35)' : 'var(--color-border)'}`,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
            }}
            onClick={() => onChange(Number(v))}
          >
            {p}: {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── AUDIT LOG (Wave 5 #2 — full audit-grade view) ───────────────────────────
function AuditLogPanel({ log = [] }) {
  if (log.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--color-text-3)', padding: 14 }}>No threshold changes logged yet. Every edit via Apply & Rerun is recorded here with timestamp, actor, role, old → new value, and rationale.</div>;
  }

  function exportCsv() {
    const cols = ['ts', 'ruleId', 'from', 'to', 'actor', 'actor_role', 'rationale', 'triggered_by', 'recommendation_id'];
    const header = cols.join(',');
    const rows = log.slice().reverse().map(e => cols.map(c => csvCell(e[c])).join(','));
    const csv = [
      `# Sentinel Threshold Audit Log`,
      `# Exported: ${new Date().toISOString()}`,
      `# Total entries: ${log.length}`,
      '',
      header,
      ...rows,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threshold-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function csvCell(v) {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[,"\n]/.test(s) ? `"${s}"` : s;
  }

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <History size={13} style={{ color: '#B45309' }} />
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
          Threshold change history ({log.length})
          <InfoHint title="Threshold change history" align="left" text="An append-only audit log: every Apply & Rerun records the rule changed, its old → new value, who made it, their role, the captured rationale, and whether it came via the feedback loop. It is the ISA 330 defensibility trail an external auditor asks to see; export it to CSV for the file." size={11} />
        </div>
        <button
          onClick={exportCsv}
          style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', borderRadius: 6 }}
        >
          Export CSV
        </button>
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={thLog}>Timestamp</th>
              <th style={thLog}>Rule</th>
              <th style={thLog}>From → To</th>
              <th style={thLog}>Actor</th>
              <th style={thLog}>Rationale / Source</th>
            </tr>
          </thead>
          <tbody>
            {log.slice().reverse().slice(0, 200).map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ ...tdLog, color: 'var(--color-text-3)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>{new Date(e.ts).toLocaleString()}</td>
                <td style={{ ...tdLog, fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>{e.ruleId}</td>
                <td style={tdLog}>
                  <strong style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>{String(e.from)}</strong>
                  <span style={{ color: 'var(--color-text-3)', margin: '0 5px' }}>→</span>
                  <strong style={{ color: '#B45309', fontFamily: 'var(--font-display)' }}>{String(e.to)}</strong>
                </td>
                <td style={{ ...tdLog, fontSize: 10.5 }}>
                  <div style={{ fontWeight: 700 }}>{e.actor || '—'}</div>
                  {e.actor_role && <div style={{ color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9.5, fontWeight: 700 }}>{e.actor_role}</div>}
                </td>
                <td style={{ ...tdLog, fontSize: 11, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                  {e.triggered_by === 'feedback_loop' && (
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: 'rgba(124,58,237,0.14)', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 6 }}>
                      via feedback loop {e.recommendation_id ? `· ${e.recommendation_id}` : ''}
                    </span>
                  )}
                  {e.rationale || (e.triggered_by === 'feedback_loop' ? '' : <span style={{ color: 'var(--color-text-3)', fontStyle: 'italic' }}>no rationale captured</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {log.length > 200 && (
          <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', padding: '8px 0 0', textAlign: 'center' }}>
            Showing 200 most recent. Export CSV to see the full log ({log.length} entries).
          </div>
        )}
      </div>
    </div>
  );
}

const thLog = { padding: '6px 10px', textAlign: 'left', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-3)' };
const tdLog = { padding: '8px 10px', verticalAlign: 'top' };

// ─── FALSE-POSITIVE ACCUMULATION BY RULE (Wave 5 #3) ─────────────────────────
// Visibility gap the review flagged: the Feedback-loop recommendations panel
// only shows recommendations AFTER the agent has run. Before that, the CAE
// can't see which rules are accumulating FPs and whether any recommendation
// is pending. This panel groups the raw FP markings from the Case Manager
// and cross-references them against any active recommendations.
function FalsePositiveByRulePanel({ caseWorkbench = {}, recommendations = [] }) {
  const fpEntries = Object.entries(caseWorkbench).filter(([, v]) => v?.falsePositive);
  if (fpEntries.length === 0) return null;

  // Aggregate FP count per suggested rule id (may be null if the auditor
  // didn't nominate a rule — those go into an "unassigned" bucket).
  const byRule = new Map();
  for (const [caseId, wb] of fpEntries) {
    const ruleId = wb.falsePositiveSuggestedRuleId || '__unassigned__';
    const entry = byRule.get(ruleId) || { ruleId, cases: [], fpCount: 0 };
    entry.fpCount += 1;
    entry.cases.push({ caseId, category: wb.falsePositiveCategory, reason: wb.falsePositiveReason });
    byRule.set(ruleId, entry);
  }

  // Cross-ref with active recommendations so we can show pending / approved / rejected.
  function recStatusFor(ruleId) {
    if (!ruleId || ruleId === '__unassigned__') return null;
    const recs = recommendations.filter(r => r.ruleId === ruleId);
    if (recs.length === 0) return { status: 'none', count: 0 };
    const pending = recs.filter(r => r.status === 'pending').length;
    const approved = recs.filter(r => r.status === 'approved').length;
    const rejected = recs.filter(r => r.status === 'rejected').length;
    if (pending > 0) return { status: 'pending', count: pending };
    if (approved > 0) return { status: 'approved', count: approved };
    return { status: 'rejected', count: rejected };
  }

  const rows = [...byRule.values()].sort((a, b) => b.fpCount - a.fpCount);

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid #7C3AED', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(124,58,237,0.15)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>⟲</span>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>False-positive accumulation by rule<InfoHint title="False-positive accumulation by rule" align="left" text="A live tally of cases auditors marked as false positives in the Case Manager, grouped by the rule each one nominated. It is a count, not an estimate. Once a rule reaches three FPs the Feedback Loop can suggest a threshold change for an authorised reviewer to approve." /></div>
        <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{fpEntries.length} case{fpEntries.length === 1 ? '' : 's'} marked FP across {rows.length} rule{rows.length === 1 ? '' : 's'}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 10 }}>
        The Feedback Loop agent needs ≥3 FPs on the same rule before emitting a recommendation. This view makes the count visible immediately so you know which rules are trending toward a recommendation, and which already have one in flight.
        <br /><strong>Advisory only:</strong> recommendations never change a threshold automatically — an authorised reviewer must approve each one, which applies it through the normal threshold change (audit-logged). The measured precision per agent is on <em>Settings → Detection Assurance</em>.
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr style={{ background: 'var(--color-surface-2)' }}>
            <th style={thLog}>Rule</th>
            <th style={{ ...thLog, textAlign: 'center' }}>FP count</th>
            <th style={{ ...thLog, textAlign: 'center' }}>Recommendation</th>
            <th style={thLog}>Latest rationale</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isUnassigned = r.ruleId === '__unassigned__';
            const rec = recStatusFor(r.ruleId);
            const recColor = rec?.status === 'approved' ? '#0BBF7A' : rec?.status === 'pending' ? '#7C3AED' : rec?.status === 'rejected' ? '#6B7280' : 'var(--color-text-3)';
            const recLabel = isUnassigned ? '—' : rec?.status === 'none' ? (r.fpCount >= 3 ? 'Eligible — run Feedback Loop' : `${3 - r.fpCount} more FP${3 - r.fpCount === 1 ? '' : 's'} to trigger`) : `${rec.status} · ${rec.count}`;
            return (
              <tr key={r.ruleId} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ ...tdLog, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>{isUnassigned ? '(no rule nominated)' : r.ruleId}</td>
                <td style={{ ...tdLog, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, color: r.fpCount >= 3 ? '#7C3AED' : 'var(--color-text)' }}>{r.fpCount}</td>
                <td style={{ ...tdLog, textAlign: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: recColor + '18', color: recColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{recLabel}</span>
                </td>
                <td style={{ ...tdLog, fontSize: 11, color: 'var(--color-text-2)' }}>
                  {r.cases[0]?.reason ? r.cases[0].reason.slice(0, 140) + (r.cases[0].reason.length > 140 ? '…' : '') : <span style={{ color: 'var(--color-text-3)', fontStyle: 'italic' }}>no rationale on latest case</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── FEEDBACK-LOOP RECOMMENDATIONS PANEL ─────────────────────────────────────
function FeedbackRecommendationsPanel({ recommendations, canApprove, currentUser, onApprove, onReject, onSignOut, lastRunAt, onRun, running, runError, canRun, fpCount }) {
  const [expanded, setExpanded] = useState(true);
  const pending = recommendations.filter(r => r.status === 'pending');
  const reviewed = recommendations.filter(r => r.status !== 'pending');

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(245,184,65,0.03))', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}
      >
        <span style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(124,58,237,0.15)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>⟲</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            Feedback-loop recommendations
            {pending.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 8, background: '#7C3AED', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {pending.length} pending
              </span>
            )}
            {canApprove && currentUser && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: 'rgba(11,191,122,0.14)', color: '#0BBF7A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Signed in · {currentUser.role || 'Authorised'}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onSignOut && onSignOut(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onSignOut && onSignOut(); } }}
                  style={{ marginLeft: 4, textDecoration: 'underline', cursor: 'pointer', fontWeight: 800 }}
                >sign out</span>
              </span>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--color-text-2)', marginTop: 2 }}>
            Rule-change suggestions synthesised from auditor-marked false positives. Human approval required — nothing applies automatically.
            {lastRunAt && <span> · Last analysis: {new Date(lastRunAt).toLocaleString()}</span>}
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{expanded ? 'Hide' : 'Show'}</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {onRun && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 8 }}>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-2)' }}>
                {fpCount > 0
                  ? <>Run the meta-agent against <strong>{fpCount}</strong> false-positive case{fpCount === 1 ? '' : 's'} + live thresholds to synthesise new rule-change recommendations.</>
                  : 'Mark cases as false positives in the Case Manager first — the meta-agent needs that input to produce recommendations.'}
                {!canRun && <span style={{ color: '#B45309' }}> · API key required.</span>}
              </div>
              <button
                onClick={onRun}
                disabled={!canRun || running || fpCount === 0}
                className="btn btn-primary btn-sm"
                style={{ opacity: (!canRun || running || fpCount === 0) ? 0.55 : 1, cursor: (!canRun || running || fpCount === 0) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
              >
                {running ? (<><Loader2 size={13} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} /> Analysing…</>) : 'Run analysis'}
              </button>
            </div>
          )}
          {runError && (
            <div style={{ fontSize: 11.5, padding: '8px 12px', background: 'var(--color-red-light)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, color: 'var(--color-red)' }}>
              {runError}
            </div>
          )}
          {recommendations.length === 0 && !running && !runError && (
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', padding: '8px 4px', fontStyle: 'italic' }}>
              No recommendations yet. {fpCount > 0 ? 'Click "Run analysis" above.' : 'Mark case false positives first.'}
            </div>
          )}
          {!canApprove && recommendations.length > 0 && (
            <div style={{ fontSize: 11.5, color: '#B45309', padding: '8px 12px', background: 'rgba(245,184,65,0.12)', border: '1px solid rgba(245,184,65,0.3)', borderRadius: 6 }}>
              <strong>Admin sign-in required.</strong> Click Approve or Reject on any recommendation and you'll be prompted to sign in as an authorised role (Chief Internal Auditor / Chief Risk Officer / Chief Compliance Officer / Head of Internal Audit). Every approval is captured in the threshold audit log with the reviewer's name and role attached.
              {currentUser && !canApprove && <span> · Currently signed in as <strong>{currentUser.name}</strong> ({currentUser.role || 'no role set'}) — not authorised.</span>}
            </div>
          )}
          {pending.map(r => <RecommendationCard key={r.id} rec={r} canApprove={true /* intercept handled by parent */} onApprove={onApprove} onReject={onReject} />)}
          {reviewed.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', cursor: 'pointer', padding: '6px 0' }}>
                Reviewed history · {reviewed.length}
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {reviewed.map(r => <RecommendationCard key={r.id} rec={r} canApprove={false} onApprove={onApprove} onReject={onReject} compact />)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec, canApprove, onApprove, onReject, compact }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const agentMeta = AGENT_META[rec.agentId] || { name: rec.agentId, color: '#666' };
  const statusColor = rec.status === 'approved' ? '#0BBF7A' : rec.status === 'rejected' ? '#6B7280' : '#7C3AED';
  const pending = rec.status === 'pending';

  return (
    <div style={{ background: 'var(--color-surface)', border: `1px solid ${pending ? 'rgba(124,58,237,0.25)' : 'var(--color-border)'}`, borderRadius: 8, padding: compact ? '10px 12px' : '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fontWeight: 800, color: 'var(--color-text-3)' }}>{rec.id}</span>
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: agentMeta.color + '18', color: agentMeta.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{agentMeta.name}</span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-2)' }}>{rec.ruleId}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: statusColor + '18', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{rec.status}</span>
      </div>

      {!compact && (
        <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.55, marginBottom: 8 }}>
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-3)' }}>{String(rec.currentValue)}</strong>
          <span style={{ color: 'var(--color-text-3)', margin: '0 6px' }}>→</span>
          <strong style={{ fontFamily: 'var(--font-display)', color: '#7C3AED' }}>{String(rec.recommendedValue)}</strong>
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-2)' }}>({rec.delta})</span>
        </div>
      )}

      {!compact && rec.rationale && (
        <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.55, marginBottom: 10 }}>{rec.rationale}</div>
      )}

      {!compact && rec.expectedImpact && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <ImpactPill label="FPs eliminated"         value={rec.expectedImpact.falsePositivesEliminated} color="#0BBF7A" help="How many of the auditor-marked false positives this threshold change would have stopped flagging, counted by re-running the rule at the recommended value over the source cases." />
          <ImpactPill label="Criticals preserved"    value={rec.expectedImpact.criticalFindingsPreserved} color="#0BBF7A" help="Critical findings that still flag at the recommended threshold — the check that loosening the rule to cut false positives does not blind it to genuine high-severity cases." />
          <ImpactPill label="Criticals suppressed"   value={rec.expectedImpact.criticalFindingsSuppressed} color={rec.expectedImpact.criticalFindingsSuppressed > 0 ? '#C41E3A' : 'var(--color-text-3)'} help="Critical findings that would STOP flagging at the recommended threshold — the cost side of the change. Anything above zero means real criticals are lost, so review before approving." />
          <ImpactPill label="Confidence"             value={`${Math.round((rec.confidence || 0) * 100)}%`} color="#7C3AED" help="The meta-agent's confidence in this recommendation, scaled mainly by how many false-positive cases support it (it needs at least three on the same rule). It is a sample-size weighting, not a model-accuracy score." />
        </div>
      )}

      {!compact && (rec.sourceCaseIds || []).length > 0 && (
        <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginBottom: 10 }}>
          Source cases: {rec.sourceCaseIds.map(id => <span key={id} style={{ fontFamily: 'var(--font-mono, monospace)', marginRight: 6 }}>{id}</span>)}
        </div>
      )}

      {pending && !compact && !rejectMode && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setRejectMode(true)}
            disabled={!canApprove}
            style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: canApprove ? 'pointer' : 'not-allowed', background: 'transparent', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', borderRadius: 6, fontFamily: 'inherit', opacity: canApprove ? 1 : 0.5 }}
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(rec.id)}
            disabled={!canApprove}
            style={{ padding: '6px 14px', fontSize: 11.5, fontWeight: 800, cursor: canApprove ? 'pointer' : 'not-allowed', background: canApprove ? '#7C3AED' : 'var(--color-surface-2)', color: canApprove ? 'white' : 'var(--color-text-3)', border: 'none', borderRadius: 6, fontFamily: 'inherit', opacity: canApprove ? 1 : 0.6 }}
          >
            Approve & apply
          </button>
        </div>
      )}

      {pending && rejectMode && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={2}
            placeholder="Why is this recommendation being rejected? (required)"
            style={{ width: '100%', padding: '7px 10px', fontSize: 11.5, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface-2)', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setRejectMode(false); setRejectReason(''); }}
              style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: 'var(--color-text-2)', border: '1px solid var(--color-border)', borderRadius: 6, fontFamily: 'inherit' }}
            >
              Cancel
            </button>
            <button
              onClick={() => { onReject(rec.id, rejectReason.trim()); setRejectMode(false); setRejectReason(''); }}
              disabled={rejectReason.trim().length < 10}
              style={{ padding: '5px 12px', fontSize: 11, fontWeight: 800, cursor: rejectReason.trim().length >= 10 ? 'pointer' : 'not-allowed', background: '#C41E3A', color: 'white', border: 'none', borderRadius: 6, fontFamily: 'inherit', opacity: rejectReason.trim().length >= 10 ? 1 : 0.5 }}
            >
              Confirm reject
            </button>
          </div>
        </div>
      )}

      {!pending && rec.reviewedAt && (
        <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 6 }}>
          {rec.status === 'approved' ? 'Approved' : 'Rejected'} by {rec.reviewedBy || 'Approver'} on {new Date(rec.reviewedAt).toLocaleString()}
          {rec.rejectReason && <span> · Reason: {rec.rejectReason}</span>}
        </div>
      )}
    </div>
  );
}

function ImpactPill({ label, value, color, help }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, background: color + '12', border: `1px solid ${color}30` }}>
      <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{value}</span>
      {help && <InfoHint text={help} title={label} size={11} />}
    </div>
  );
}

// ─── FEEDBACK-LOOP ENVELOPE BUILDER ──────────────────────────────────────────
// Extracts auditor-marked FPs from the case workbench, pairs the remaining
// cases as TPs, and packs the current threshold map + agent catalog into the
// shape the feedbackLoop prompt expects (see backend/prompts/feedbackLoop.js).
function buildFeedbackEnvelope(state) {
  const workbench = state.caseWorkbench || {};
  const cases = state.cases || [];
  const caseById = new Map(cases.map(c => [c.id, c]));

  const false_positives = [];
  const true_positives = [];

  for (const [caseId, wb] of Object.entries(workbench)) {
    const c = caseById.get(caseId);
    const base = {
      case_id: caseId,
      agent_id: c?.agentId || wb.agentId || 'unknown',
      finding_ref: c?.findingRef || caseId,
      severity: c?.severity || 'medium',
      exposure_lkr: c?.exposureLkr || 0,
      signals: c?.evidence?.signals || [],
      marked_at: wb.markedAt || wb.falsePositiveMarkedAt || new Date().toISOString(),
      marked_by: wb.markedBy || wb.falsePositiveMarkedBy || state.auth?.user?.name || 'auditor',
    };
    if (wb.falsePositive) {
      false_positives.push({
        ...base,
        category: wb.falsePositiveCategory || 'other',
        reason: wb.falsePositiveReason || '',
        suggested_rule_id: wb.falsePositiveSuggestedRuleId || null,
      });
    } else {
      true_positives.push({ ...base, reason: wb.comment || '' });
    }
  }

  // Current thresholds as a plain { agentId: { key: value } } map.
  const current_thresholds = {};
  for (const [agentId, rules] of Object.entries(state.thresholds || {})) {
    current_thresholds[agentId] = { ...rules };
  }

  // Agent catalog — only include agents referenced by an FP, to keep the
  // payload small. Fall back to the full registry if FPs are empty.
  const relevantAgents = new Set(false_positives.map(fp => fp.agent_id));
  const agent_catalog = {};
  const catalogSource = relevantAgents.size ? Array.from(relevantAgents) : Object.keys(THRESHOLDS);
  for (const agentId of catalogSource) {
    const block = THRESHOLDS[agentId];
    if (!block) continue;
    agent_catalog[agentId] = {
      rules: (block.rules || []).map(r => ({
        id: r.id,
        label: r.label,
        description: r.description,
        default: r.default,
        bounds: r.bounds || { min: null, max: null, step: null },
        regulatory: !!r.regulatory,
      })),
    };
  }

  return { false_positives, true_positives, current_thresholds, agent_catalog };
}
