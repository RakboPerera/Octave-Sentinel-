import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { appendSnapshot, currentQuarterLabel } from '../utils/runLedger.js';
import { demoData } from '../data/demoData.js';
import { getDefaults, applyPresetToDefaults } from '../data/thresholdRegistry.js';
import { chainAppend } from '../utils/auditTrail.js';
import { AGENT_OPS_META, DETECTION_AGENT_IDS } from '../data/agentMeta.js';
import { DEFAULT_BANK_PROFILE } from '../data/bankProfile.js';
import { DEFAULT_ESCALATION_POLICY } from '../data/escalationPolicy.js';
import { CURRENT_REGULATORY_SNAPSHOT } from '../data/currentSnapshot.js';

const AppContext = createContext(null);

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem('sentinel_state') || '{}');
    const results = JSON.parse(localStorage.getItem('sentinel_results') || '{}');
    // FIX-E: merge the separately-stored capped row samples back into uploadedData
    // so the raw-row charts can re-render. rowCount stays the true population size.
    try {
      const rowSamples = JSON.parse(localStorage.getItem('sentinel_row_samples') || '{}');
      if (results.uploadedData) {
        for (const [k, sample] of Object.entries(rowSamples)) {
          if (results.uploadedData[k] && Array.isArray(sample)) results.uploadedData[k].rows = sample;
        }
      }
    } catch { /* samples are optional */ }
    // FIX M8: Pick up the persistence warning written by the prior session so
    // the UI can surface that some data didn't survive the refresh.
    const warning = localStorage.getItem('sentinel_persist_warning') || null;
    // FIX Phase F: once the user clears demo data, never re-seed the demo
    // fixtures (false-positive markings + recommendations) on reload.
    const demoCleared = localStorage.getItem('sentinel_demo_cleared') === '1';
    // Re-hydrate per-case `evidence` from the separately-persisted agentResults.
    // The heavy evidence (a full agent-result block) is stripped from each case
    // before persisting — embedding it in every case bloated sentinel_state to
    // ~8 MB on a realistic run, blowing the browser quota and forcing the case
    // set to revert to the illustrative snapshot on reload (metrics realistic,
    // cases stale). Re-attaching here keeps the case detail/explainability
    // identical to the in-session shape while sentinel_state stays small.
    const ar = results.agentResults || {};
    const cases = Array.isArray(saved.cases)
      ? saved.cases.map(c => (c && !c.evidence && c.agentId && ar[c.agentId]) ? { ...c, evidence: ar[c.agentId] } : c)
      : saved.cases;
    return { ...saved, ...results, cases, _persistenceWarning: warning, _demoCleared: demoCleared };
  } catch (e) {
    console.warn('Failed to load saved state:', e);
  }
  return {};
}

const savedState = loadSavedState();

// Bump this any time the seed shape changes — on next load, users whose
// previous _seedVersion is older will have the seed merged onto their state.
const SEED_VERSION = 'state-history-1';

const initialState = {
  auth: savedState.auth || { loggedIn: false, user: null, loginAt: null },
  apiKey: '',
  apiKeyStatus: 'unconfigured', // 'unconfigured' | 'valid' | 'invalid'
  settingsOpen: false,
  activeMode: {}, // { [agentId]: 'demo' | 'live' }
  agentResults: savedState.agentResults || {}, // { [agentId]: resultObject }
  agentLoading: {}, // { [agentId]: boolean }
  agentErrors: {}, // { [agentId]: string }
  orchestratorResult: null,
  orchestratorLoading: false,
  orchestratorError: null,
  cases: savedState.cases || [], // auto-generated from agent findings
  activeScenario: null,
  scenarioStep: 0,
  scenarioRunning: false,
  uploadedData: savedState.uploadedData || {}, // { [agentId]: { rows: [], filename: '', uploadedAt: '' } }
  bulkRunning: false,
  bulkProgress: {},
  activeFinding: null, // { finding, agentId, agentName, agentColor, agentData }
  // Audit workbench — finding-level review state
  findingWorkbench: savedState.findingWorkbench || {}, // { "credit::0": { status, notes, owner, remediationSteps, reviewedAt } }
  // Case workbench — per-case status override + notes/comments. Keyed by case id so
  // it works uniformly across static caseRegistry entries and auto-generated cases.
  // Seed demo FP markings on first boot OR when localStorage has an empty
  // workbench (common after earlier versions shipped without the seed).
  caseWorkbench: (() => {
    // FIX Phase F: demo cleared → never seed; honour whatever the user has.
    if (savedState._demoCleared) return (savedState.caseWorkbench && typeof savedState.caseWorkbench === 'object') ? savedState.caseWorkbench : {};
    const saved = savedState.caseWorkbench;
    if (!saved || typeof saved !== 'object') return seedCaseWorkbench();
    // Already has user-authored entries → preserve as-is.
    const hasAnyFp = Object.values(saved).some(v => v && v.falsePositive);
    if (hasAnyFp || savedState._seedVersion === SEED_VERSION) return saved;
    // Merge seed onto whatever the user already had (seed only fills gaps).
    return { ...seedCaseWorkbench(), ...saved };
  })(),
  _seedVersion: SEED_VERSION,
  // Audit planning & documentation
  auditPlan: savedState.auditPlan || { materiality: null, tolerableMisstatement: null, scope: {}, riskAssessment: {}, signOffs: [] },
  // Rule Parameters — active thresholds keyed by agentId, with audit log
  // FIX M-2: Deep-merge saved thresholds with current defaults so newly added
  // rules (e.g. capital.leverage_min) always appear even for users with existing
  // saved state, while preserving any values they have already customised.
  thresholds: (() => {
    const fresh = getDefaults();
    if (!savedState.thresholds) return fresh;
    const merged = { ...fresh };
    for (const [agentId, saved] of Object.entries(savedState.thresholds)) {
      if (merged[agentId]) merged[agentId] = { ...merged[agentId], ...saved };
    }
    return merged;
  })(),
  activePreset: savedState.activePreset || 'Balanced',
  thresholdAuditLog: savedState.thresholdAuditLog || [], // [{ ts, ruleId, from, to, actor, triggered_by?, recommendation_id? }]
  // Tamper-evident, hash-chained record of audit-relevant actions (threshold
  // changes, case conclusions, false-positive dismissals). See utils/auditTrail.js.
  auditTrail: savedState.auditTrail || [],
  // Feedback-loop recommendations produced by the Feedback Loop agent from
  // false-positive case patterns. Approvals apply the threshold change via
  // SET_THRESHOLD with actor='feedback_loop_approved'. Only users whose role
  // sits in AUTHORIZED_APPROVER_ROLES (see agentMeta.js) may approve/reject.
  // Seed demo recommendations on first boot OR when the saved array is empty.
  feedbackRecommendations: (() => {
    // FIX Phase F: demo cleared → never seed demo recommendations.
    if (savedState._demoCleared) return Array.isArray(savedState.feedbackRecommendations) ? savedState.feedbackRecommendations : [];
    return (Array.isArray(savedState.feedbackRecommendations) && savedState.feedbackRecommendations.length > 0)
      ? savedState.feedbackRecommendations
      : seedFeedbackRecommendations();
  })(),
  feedbackLoopLastRunAt: savedState.feedbackLoopLastRunAt || null,
  // FIX Phase F: demoMode true until the user explicitly clears demo data.
  // Gates seeded fixtures and the marketing "Presentation" link.
  demoMode: !savedState._demoCleared,
  // Agent Configuration — per-agent run settings (enable/disable, owner role,
  // token-limit override). Defaults seed from AGENT_OPS_META; saved overrides
  // are deep-merged so newly added agents still appear for existing users.
  agentConfig: (() => {
    const fresh = defaultAgentConfig();
    if (!savedState.agentConfig) return fresh;
    const merged = { ...fresh };
    for (const [id, cfg] of Object.entries(savedState.agentConfig)) {
      if (merged[id]) merged[id] = { ...merged[id], ...cfg };
    }
    return merged;
  })(),
  // Bank Profile — tenant identity + benchmark figures (Settings → Bank
  // Profile). Saved values merge over defaults so new fields always appear.
  bankProfile: { ...DEFAULT_BANK_PROFILE, ...(savedState.bankProfile || {}) },
  // Risk Appetite — per-metric internal-appetite overrides (Settings → Risk
  // Appetite). { [floorKey]: number }. Empty = use the registry appetite. The
  // statutory regulatory floor itself is never overridable here.
  appetiteOverrides: (savedState.appetiteOverrides && typeof savedState.appetiteOverrides === 'object') ? savedState.appetiteOverrides : {},
  // Custom threshold presets — the bank's saved "house tuning" snapshots, in
  // addition to the built-in Balanced/Conservative/Aggressive/CBSL-Strict.
  // { [name]: { thresholds: {<agent>:{<key>:val}}, createdAt } }
  customPresets: (savedState.customPresets && typeof savedState.customPresets === 'object') ? savedState.customPresets : {},
  // Escalation matrix — documented who-gets-notified-on-what policy (Settings →
  // Notifications). Saved rules merge by id over defaults so new triggers appear.
  escalationPolicy: (() => {
    if (!Array.isArray(savedState.escalationPolicy)) return DEFAULT_ESCALATION_POLICY;
    const byId = Object.fromEntries(savedState.escalationPolicy.map(r => [r.id, r]));
    return DEFAULT_ESCALATION_POLICY.map(d => byId[d.id] ? { ...d, ...byId[d.id] } : d);
  })(),
  // FIX M8: Surface localStorage persistence problems so a header/banner can
  // tell the user their last session wasn't fully saved (e.g. results blob
  // exceeded the 4MB guard or quota was hit). Cleared on user dismiss.
  persistenceWarning: savedState._persistenceWarning || null,
  // Drift baseline (S4) — the FIRST live run's distribution of each agent's key
  // numeric field, captured once and frozen as the reference. Subsequent runs are
  // compared to it (PSI/KS) so input-population shift is detectable. Shape:
  // { [agentId]: { field, values:number[], capturedAt } }.
  driftBaseline: (savedState.driftBaseline && typeof savedState.driftBaseline === 'object') ? savedState.driftBaseline : {},
  // Assurance history (S4 backtesting) — a per-run snapshot of each agent's
  // headline assurance metrics so precision/findings can be tracked over time.
  // Capped, newest-last. [{ ts, agentId, findings, critical, contentHash }].
  assuranceHistory: Array.isArray(savedState.assuranceHistory) ? savedState.assuranceHistory : [],
  // Remediation tracker — the management-action lifecycle per case:
  // { [caseId]: { status, mgmtOwner, agreedAction, dueDate, mgmtResponse, updatedAt, history[] } }.
  // status: open → in_progress → remediated → verified | risk_accepted.
  remediation: (savedState.remediation && typeof savedState.remediation === 'object') ? savedState.remediation : {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, auth: { loggedIn: true, user: action.payload, loginAt: new Date().toISOString() } };
    case 'LOGOUT':
      return { ...state, auth: { loggedIn: false, user: null, loginAt: null } };
    case 'SET_API_KEY':
      return { ...state, apiKey: action.payload, apiKeyStatus: action.payload ? 'valid' : 'unconfigured' };
    case 'SET_API_KEY_STATUS':
      return { ...state, apiKeyStatus: action.payload };
    case 'TOGGLE_SETTINGS':
      return { ...state, settingsOpen: !state.settingsOpen };
    case 'CLOSE_SETTINGS':
      return { ...state, settingsOpen: false };
    case 'SET_MODE':
      return { ...state, activeMode: { ...state.activeMode, [action.agentId]: action.payload } };
    // S4 — drift baseline: capture the first live run's distribution for an agent,
    // frozen as the reference. Ignored if a baseline already exists for that agent.
    case 'CAPTURE_DRIFT_BASELINE': {
      const { agentId, field, values, capturedAt } = action.payload || {};
      if (!agentId || !field || !Array.isArray(values) || values.length === 0) return state;
      if (state.driftBaseline[agentId]) return state; // freeze the first baseline
      return { ...state, driftBaseline: { ...state.driftBaseline, [agentId]: { field, values, capturedAt } } };
    }
    case 'RESET_DRIFT_BASELINE':
      return { ...state, driftBaseline: {} };
    // S4 — backtesting: append a per-run assurance snapshot (capped, newest-last).
    case 'PUSH_ASSURANCE_SNAPSHOT': {
      const snap = action.payload;
      if (!snap || !snap.agentId) return state;
      const next = [...state.assuranceHistory, snap].slice(-200);
      return { ...state, assuranceHistory: next };
    }
    case 'AGENT_LOADING':
      return { ...state, agentLoading: { ...state.agentLoading, [action.agentId]: true }, agentErrors: { ...state.agentErrors, [action.agentId]: null } };
    case 'AGENT_SUCCESS': {
      const newCases = generateCases(action.agentId, action.payload);
      const mergedResults = { ...state.agentResults, [action.agentId]: action.payload };
      // Persist a composite snapshot so the quarterly-trend chart populates over time.
      try {
        const snapshot = computeComplianceSnapshot(mergedResults);
        if (snapshot) appendSnapshot(snapshot);
      } catch (e) { console.warn('ledger snapshot failed', e); }
      // Replace THIS agent's auto-generated cases (id prefix `CASE-<AGENT>-`) with
      // the fresh set, rather than appending. A re-run reflects the current engine
      // output exactly — no stale cases from an earlier run linger, and because
      // the ids are deterministic, any annotations on still-present findings keep
      // matching. Cases from other agents and manual cases are untouched.
      const prefix = `CASE-${String(action.agentId).toUpperCase()}-`;
      const keptCases = state.cases.filter(c => !(typeof c.id === 'string' && c.id.startsWith(prefix)));
      return {
        ...state,
        agentResults: mergedResults,
        agentLoading: { ...state.agentLoading, [action.agentId]: false },
        cases: [...keptCases, ...newCases],
      };
    }
    case 'AGENT_ERROR':
      return { ...state, agentLoading: { ...state.agentLoading, [action.agentId]: false }, agentErrors: { ...state.agentErrors, [action.agentId]: action.payload } };
    case 'ORCHESTRATOR_LOADING':
      return { ...state, orchestratorLoading: true, orchestratorError: null };
    case 'ORCHESTRATOR_SUCCESS':
      return { ...state, orchestratorResult: action.payload, orchestratorLoading: false, orchestratorError: null };
    case 'ORCHESTRATOR_ERROR':
      return { ...state, orchestratorLoading: false, orchestratorError: action.payload || 'Orchestration failed' };
    case 'SET_SCENARIO':
      return { ...state, activeScenario: action.payload, scenarioStep: 0, scenarioRunning: false };
    case 'SCENARIO_STEP':
      return { ...state, scenarioStep: action.payload };
    case 'SCENARIO_RUNNING':
      return { ...state, scenarioRunning: action.payload };
    case 'UPLOAD_DATA':
      return { ...state, uploadedData: { ...state.uploadedData, [action.agentId]: { rows: action.rows, filename: action.filename, uploadedAt: new Date().toISOString() } } };
    case 'CLEAR_UPLOAD':
      return { ...state, uploadedData: { ...state.uploadedData, [action.agentId]: null } };
    case 'BULK_RUNNING':
      return { ...state, bulkRunning: action.payload };
    case 'BULK_PROGRESS':
      return { ...state, bulkProgress: { ...state.bulkProgress, [action.agentId]: action.status } };
    case 'OPEN_FINDING':
      return { ...state, activeFinding: { ...action.payload, _openedAt: Date.now() } };
    case 'CLOSE_FINDING':
      return { ...state, activeFinding: null };
    case 'ADD_CASE':
      return { ...state, cases: [...state.cases, action.payload] };
    case 'UPDATE_CASE':
      return { ...state, cases: state.cases.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
    // ── Audit Plan ──
    case 'SET_AUDIT_PLAN':
      return { ...state, auditPlan: { ...state.auditPlan, ...action.payload } };
    // ── Audit Workbench ──
    case 'SET_FINDING_STATUS': {
      const wb = { ...state.findingWorkbench };
      wb[action.key] = { ...(wb[action.key] || { status: 'new', notes: [], owner: '', remediationSteps: [], reviewedAt: null }), status: action.payload };
      return { ...state, findingWorkbench: wb };
    }
    case 'ADD_FINDING_NOTE': {
      const wb = { ...state.findingWorkbench };
      const entry = wb[action.key] || { status: 'new', notes: [], owner: '', remediationSteps: [], reviewedAt: null };
      wb[action.key] = { ...entry, notes: [...entry.notes, { text: action.payload, timestamp: new Date().toISOString() }] };
      return { ...state, findingWorkbench: wb };
    }
    case 'SET_FINDING_OWNER': {
      const wb = { ...state.findingWorkbench };
      wb[action.key] = { ...(wb[action.key] || { status: 'new', notes: [], owner: '', remediationSteps: [], reviewedAt: null }), owner: action.payload };
      return { ...state, findingWorkbench: wb };
    }
    case 'ADD_REMEDIATION_STEP': {
      const wb = { ...state.findingWorkbench };
      const entry = wb[action.key] || { status: 'new', notes: [], owner: '', remediationSteps: [], reviewedAt: null };
      wb[action.key] = { ...entry, remediationSteps: [...entry.remediationSteps, { text: action.payload, done: false }] };
      return { ...state, findingWorkbench: wb };
    }
    case 'TOGGLE_REMEDIATION_STEP': {
      const wb = { ...state.findingWorkbench };
      const entry = wb[action.key];
      if (!entry) return state;
      const steps = [...entry.remediationSteps];
      steps[action.index] = { ...steps[action.index], done: !steps[action.index].done };
      wb[action.key] = { ...entry, remediationSteps: steps };
      return { ...state, findingWorkbench: wb };
    }
    // ── Rule Parameters / Thresholds ──
    case 'SET_THRESHOLD': {
      const { agentId, key, value, actor, actorRole, rationale } = action.payload;
      const prev = state.thresholds?.[agentId]?.[key];
      const nextAgent = { ...(state.thresholds[agentId] || {}), [key]: value };
      // Pick up the logged-in user's role if the caller didn't specify one.
      const resolvedActor = actor || state.auth?.user?.name || 'user';
      const resolvedActorRole = actorRole || state.auth?.user?.role || null;
      const entry = {
        ts: new Date().toISOString(),
        ruleId: `${agentId}.${key}`,
        from: prev,
        to: value,
        actor: resolvedActor,
        actor_role: resolvedActorRole,
        rationale: rationale || null,
      };
      const trail = chainAppend(state.auditTrail, {
        actor: resolvedActor, actor_role: resolvedActorRole, action: 'THRESHOLD_CHANGE',
        summary: `${agentId}.${key}: ${prev} → ${value}${rationale ? ` (${rationale})` : ''}`,
        payload: { ruleId: `${agentId}.${key}`, from: prev, to: value },
      });
      return { ...state, thresholds: { ...state.thresholds, [agentId]: nextAgent }, thresholdAuditLog: [...state.thresholdAuditLog, entry], auditTrail: trail };
    }
    case 'APPLY_PRESET': {
      const preset = action.payload;
      const newThresholds = applyPresetToDefaults(preset);
      const entry = { ts: new Date().toISOString(), ruleId: `preset:${preset}`, from: state.activePreset, to: preset, actor: 'user' };
      return { ...state, thresholds: newThresholds, activePreset: preset, thresholdAuditLog: [...state.thresholdAuditLog, entry] };
    }
    case 'RESET_THRESHOLDS': {
      const entry = { ts: new Date().toISOString(), ruleId: 'preset:Balanced', from: state.activePreset, to: 'Balanced', actor: 'user' };
      return { ...state, thresholds: getDefaults(), activePreset: 'Balanced', thresholdAuditLog: [...state.thresholdAuditLog, entry] };
    }
    // ── Case Workbench ──
    case 'SET_CASE_STATUS': {
      const wb = { ...state.caseWorkbench };
      const entry = wb[action.caseId] || { status: null, notes: [], stateHistory: [] };
      const fromStatus = entry.status || action.fromStatus || null;
      const toStatus = action.payload;
      if (fromStatus === toStatus) return state; // no-op, don't log

      const actorName = action.actor?.name || action.by || 'Auditor';
      const actorRole = action.actor?.role || null;

      // FOUR-EYES (SoD): concluding a case (→ resolved) must be done by someone
      // OTHER than the person who worked it. Defensive guard — the UI also blocks
      // this — so a same-person conclusion can never be persisted.
      if (toStatus === 'resolved' && entry.workedBy?.name && entry.workedBy.name === actorName && !action.fourEyesAttested) {
        return state;
      }

      const transition = { from: fromStatus, to: toStatus, at: new Date().toISOString(), by: actorName, by_role: actorRole };
      const next = {
        ...entry,
        status: toStatus,
        updatedAt: new Date().toISOString(),
        stateHistory: [...(entry.stateHistory || []), transition],
      };
      // The "worker" of record is whoever advanced it into active investigation.
      if (toStatus === 'investigating' || toStatus === 'remediation') {
        next.workedBy = { name: actorName, role: actorRole, at: transition.at };
      }
      if (toStatus === 'resolved') {
        next.reviewedBy = { name: actorName, role: actorRole, at: transition.at };
      }
      wb[action.caseId] = next;
      const trail = chainAppend(state.auditTrail, {
        actor: actorName, actor_role: actorRole, action: 'CASE_STATUS',
        summary: `Case ${action.caseId}: ${fromStatus || '—'} → ${toStatus}`,
        payload: { caseId: action.caseId, from: fromStatus, to: toStatus },
      });
      return { ...state, caseWorkbench: wb, auditTrail: trail };
    }
    case 'ADD_CASE_NOTE': {
      const wb = { ...state.caseWorkbench };
      const entry = wb[action.caseId] || { status: null, notes: [], stateHistory: [] };
      const note = { text: action.payload.text, author: action.payload.author || 'Auditor', timestamp: new Date().toISOString() };
      wb[action.caseId] = { ...entry, notes: [...entry.notes, note] };
      return { ...state, caseWorkbench: wb };
    }
    // REMEDIATION lifecycle — the management-action track that turns a confirmed
    // finding into a tracked, owned, due-dated remediation through to audit
    // verification. Distinct from the auditor's investigation status. Patch-merge.
    case 'SET_REMEDIATION': {
      const rem = { ...(state.remediation || {}) };
      const cur = rem[action.caseId] || { status: 'open', mgmtOwner: '', agreedAction: '', dueDate: '', mgmtResponse: '', history: [] };
      const patch = action.payload || {};
      const history = cur.history || [];
      const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
      if (patch.status && patch.status !== cur.status) next.history = [...history, { from: cur.status, to: patch.status, at: next.updatedAt, by: action.actor || state.auth?.user?.name || 'user' }];
      rem[action.caseId] = next;
      return { ...state, remediation: rem };
    }
    case 'MARK_CASE_FALSE_POSITIVE': {
      const wb = { ...state.caseWorkbench };
      const entry = wb[action.caseId] || { status: null, notes: [], stateHistory: [] };
      const actorName = action.payload.actor?.name || action.payload.author || 'Auditor';
      const actorRole = action.payload.actor?.role || null;
      // FOUR-EYES (SoD): dismissing a flagged item as a false positive is a
      // conclusion — it must be made by someone other than the case worker.
      if (entry.workedBy?.name && entry.workedBy.name === actorName && !action.payload.fourEyesAttested) {
        return state;
      }
      wb[action.caseId] = {
        ...entry,
        falsePositive: true,
        falsePositiveCategory: action.payload.category,
        falsePositiveReason: action.payload.reason,
        falsePositiveSuggestedRuleId: action.payload.suggestedRuleId || null,
        falsePositiveMarkedAt: new Date().toISOString(),
        falsePositiveMarkedBy: actorName,
        falsePositiveMarkedByRole: actorRole,
      };
      const trail = chainAppend(state.auditTrail, {
        actor: actorName, actor_role: actorRole, action: 'FALSE_POSITIVE',
        summary: `Case ${action.caseId} dismissed as false positive (${action.payload.category || 'uncategorised'})`,
        payload: { caseId: action.caseId, category: action.payload.category, reason: action.payload.reason },
      });
      return { ...state, caseWorkbench: wb, auditTrail: trail };
    }
    case 'UNMARK_CASE_FALSE_POSITIVE': {
      const wb = { ...state.caseWorkbench };
      const entry = wb[action.caseId];
      if (!entry) return state;
      const { falsePositive, falsePositiveCategory, falsePositiveReason, falsePositiveSuggestedRuleId, falsePositiveMarkedAt, falsePositiveMarkedBy, ...rest } = entry;
      wb[action.caseId] = rest;
      return { ...state, caseWorkbench: wb };
    }
    // ── Feedback-Loop Recommendations ──
    case 'SET_FEEDBACK_RECOMMENDATIONS': {
      return { ...state, feedbackRecommendations: action.payload, feedbackLoopLastRunAt: new Date().toISOString() };
    }
    case 'APPROVE_RECOMMENDATION': {
      const rec = (state.feedbackRecommendations || []).find(r => r.id === action.payload.recommendationId);
      if (!rec || rec.status !== 'pending') return state;
      const { agentId, key } = parseRuleId(rec.ruleId);
      const prev = state.thresholds?.[agentId]?.[key];
      const nextAgent = { ...(state.thresholds[agentId] || {}), [key]: rec.recommendedValue };
      const logEntry = {
        ts: new Date().toISOString(),
        ruleId: rec.ruleId,
        from: prev,
        to: rec.recommendedValue,
        actor: action.payload.reviewer || 'feedback_loop_approver',
        triggered_by: 'feedback_loop',
        recommendation_id: rec.id,
      };
      const recs = state.feedbackRecommendations.map(r =>
        r.id === rec.id ? { ...r, status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: action.payload.reviewer || 'Approver' } : r
      );
      return {
        ...state,
        thresholds: { ...state.thresholds, [agentId]: nextAgent },
        thresholdAuditLog: [...state.thresholdAuditLog, logEntry],
        feedbackRecommendations: recs,
      };
    }
    case 'REJECT_RECOMMENDATION': {
      const recs = (state.feedbackRecommendations || []).map(r =>
        r.id === action.payload.recommendationId && r.status === 'pending'
          ? { ...r, status: 'rejected', rejectReason: action.payload.reason || '', reviewedAt: new Date().toISOString(), reviewedBy: action.payload.reviewer || 'Approver' }
          : r
      );
      return { ...state, feedbackRecommendations: recs };
    }
    case 'MARK_FINDING_REVIEWED': {
      const wb = { ...state.findingWorkbench };
      wb[action.key] = { ...(wb[action.key] || { status: 'new', notes: [], owner: '', remediationSteps: [], reviewedAt: null }), reviewedAt: new Date().toISOString(), status: 'under_review' };
      return { ...state, findingWorkbench: wb };
    }
    case 'DISMISS_PERSISTENCE_WARNING':
      try { localStorage.removeItem('sentinel_persist_warning'); } catch {}
      return { ...state, persistenceWarning: null };
    case 'SET_AGENT_CONFIG': {
      const { agentId, patch } = action.payload;
      if (!agentId) return state;
      return { ...state, agentConfig: { ...state.agentConfig, [agentId]: { ...(state.agentConfig[agentId] || {}), ...patch } } };
    }
    case 'RESET_AGENT_CONFIG':
      return { ...state, agentConfig: defaultAgentConfig() };
    case 'SET_BANK_PROFILE':
      return { ...state, bankProfile: { ...state.bankProfile, ...action.payload } };
    case 'RESET_BANK_PROFILE':
      return { ...state, bankProfile: { ...DEFAULT_BANK_PROFILE } };
    case 'SET_APPETITE_OVERRIDE': {
      const { key, value } = action.payload;
      if (!key) return state;
      const next = { ...state.appetiteOverrides };
      if (value == null || !Number.isFinite(value)) delete next[key]; // revert to registry default
      else next[key] = value;
      return { ...state, appetiteOverrides: next };
    }
    case 'RESET_APPETITE_OVERRIDES':
      return { ...state, appetiteOverrides: {} };
    case 'SAVE_CUSTOM_PRESET': {
      const { name, thresholds } = action.payload;
      if (!name) return state;
      return { ...state, customPresets: { ...state.customPresets, [name]: { thresholds, createdAt: new Date().toISOString() } } };
    }
    case 'DELETE_CUSTOM_PRESET': {
      const next = { ...state.customPresets };
      delete next[action.payload.name];
      return { ...state, customPresets: next };
    }
    case 'SET_ESCALATION_RULE': {
      const { id, patch } = action.payload;
      return { ...state, escalationPolicy: state.escalationPolicy.map(r => r.id === id ? { ...r, ...patch } : r) };
    }
    case 'RESET_ESCALATION_POLICY':
      return { ...state, escalationPolicy: DEFAULT_ESCALATION_POLICY };
    case 'IMPORT_CONFIG': {
      // Restore an exported configuration bundle. Only the org-level config
      // slices are imported — cases, findings, and workbench (working data)
      // are left untouched. Each slice is guarded so a malformed file can't
      // corrupt state.
      const c = action.payload || {};
      const next = { ...state };
      if (c.bankProfile && typeof c.bankProfile === 'object') next.bankProfile = { ...DEFAULT_BANK_PROFILE, ...c.bankProfile };
      if (c.agentConfig && typeof c.agentConfig === 'object') next.agentConfig = { ...defaultAgentConfig(), ...c.agentConfig };
      // Filter appetite overrides to finite numbers only — SET_APPETITE_OVERRIDE
      // enforces this, so the import path must too (a stringy/NaN override would
      // flow into floor comparisons as NaN and silently mask a breach).
      if (c.appetiteOverrides && typeof c.appetiteOverrides === 'object') {
        const clean = {};
        for (const [k, v] of Object.entries(c.appetiteOverrides)) {
          if (typeof v === 'number' && Number.isFinite(v)) clean[k] = v;
        }
        next.appetiteOverrides = clean;
      }
      // Custom presets: keep only entries whose `thresholds` is an object.
      if (c.customPresets && typeof c.customPresets === 'object') {
        const clean = {};
        for (const [name, preset] of Object.entries(c.customPresets)) {
          if (preset && typeof preset === 'object' && preset.thresholds && typeof preset.thresholds === 'object') clean[name] = preset;
        }
        next.customPresets = clean;
      }
      if (Array.isArray(c.escalationPolicy)) {
        const byId = Object.fromEntries(c.escalationPolicy.map(r => [r.id, r]));
        next.escalationPolicy = DEFAULT_ESCALATION_POLICY.map(d => byId[d.id] ? { ...d, ...byId[d.id] } : d);
      }
      // Merge imported thresholds onto current defaults per-agent (mirrors the
      // boot-time loader) so a config exported by an older app version doesn't
      // permanently strip threshold rules shipped since that export.
      if (c.thresholds && typeof c.thresholds === 'object') {
        const merged = { ...getDefaults() };
        for (const [agentId, saved] of Object.entries(c.thresholds)) {
          if (merged[agentId] && saved && typeof saved === 'object') merged[agentId] = { ...merged[agentId], ...saved };
        }
        next.thresholds = merged;
      }
      if (typeof c.activePreset === 'string') next.activePreset = c.activePreset;
      if (c.auditPlan && typeof c.auditPlan === 'object') next.auditPlan = { ...state.auditPlan, ...c.auditPlan };
      return next;
    }
    case 'EXIT_DEMO_MODE': {
      // FIX Phase F: clear the pre-authored demo fixtures so a real team starts
      // from a clean workspace — wipe seeded case-workbench markings (FP
      // rationales, demo state history) and drop demo-seeded recommendations.
      // The flag is persisted so reload doesn't re-seed.
      try { localStorage.setItem('sentinel_demo_cleared', '1'); } catch {}
      const recs = (state.feedbackRecommendations || []).filter(r => r.source !== 'demo-seed');
      return { ...state, demoMode: false, caseWorkbench: {}, feedbackRecommendations: recs };
    }
    default:
      return state;
  }
}

// Default agent run-config: every detection agent enabled, owner seeded from
// the ops registry, token limit left at the platform default (null).
function defaultAgentConfig() {
  const out = {};
  for (const id of DETECTION_AGENT_IDS) {
    out[id] = { enabled: true, ownerRole: AGENT_OPS_META[id]?.owner_role || '', maxTokens: null };
  }
  return out;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function ratioScore(actual, min, green) {
  if (actual == null) return 70;
  // FIX M-E: Guard against division by zero when green === min, which produces
  // NaN that bypasses Math.max/min clamps and renders as blank in the UI.
  if (green <= min) return 70;
  if (actual < min) return 20;
  if (actual >= green) return 95;
  return Math.round(40 + ((actual - min) / (green - min)) * 55);
}

// Mirror of Compliance.buildFrameworks scoring — kept in sync so the ledger
// stores the same composite the page displays.
function computeComplianceSnapshot(agentResults) {
  const kycRaw = agentResults.kyc || demoData.kyc || {};
  const controlsRaw = agentResults.controls || demoData.controls || {};
  const kyc = kycRaw.compliance_summary || {};
  const controls = controlsRaw.controls_summary || {};
  const cap = agentResults.capital || null;
  const latestReg = cap?.historical_trend?.[cap.historical_trend.length - 1];

  const pepOverdue = (kycRaw.pep_findings || []).filter(p => !p.edd_current).length;
  const cbsl = Math.round(clamp(100 - (pepOverdue * 12) - ((kyc.str_assessment_required || 0) * 4), 20, 95));

  // FIX L8: Fallback figures live in currentSnapshot.js — single source so
  // quarter-end updates don't require hunting through reducer code.
  const car = cap?.capital_position?.car_total_pct ?? latestReg?.car ?? CURRENT_REGULATORY_SNAPSHOT.car_tier1_pct;
  const lcr = cap?.liquidity_position?.lcr_pct ?? latestReg?.lcr ?? CURRENT_REGULATORY_SNAPSHOT.lcr_pct;
  const nsfr = cap?.liquidity_position?.nsfr_pct ?? latestReg?.nsfr ?? CURRENT_REGULATORY_SNAPSHOT.nsfr_pct;
  const basel = Math.round((ratioScore(car, 11.5, 18.0) + ratioScore(lcr, 100, 250) + ratioScore(nsfr, 100, 130)) / 3);

  const fatfCountry = kyc.fatf_country_exposure || 0;
  const boGaps = kyc.beneficial_ownership_gaps || 0;
  const fatf = Math.round(clamp(100 - (fatfCountry * 2) - (boGaps * 0.05), 20, 92));

  const strPending = kyc.str_assessment_required || 0;
  const gapPct = kyc.kyc_gap_pct || 0;
  const aml = Math.round(clamp(100 - (gapPct * 6) - (strPending * 2), 30, 95));

  const sodViolations = controls.sod_violations || 0;
  const overridePct = controls.network_override_rate_pct || 0;
  const sod = Math.round(clamp(100 - (sodViolations * 4) - (overridePct * 3), 30, 95));

  // Weights match buildFrameworks: cbsl 25, basel 25, fatf 15, aml 20, sod 15
  const composite = Math.round((cbsl * 25 + basel * 25 + fatf * 15 + aml * 20 + sod * 15) / 100);

  return { q: currentQuarterLabel(), cbsl, basel, fatf, aml, sod, composite };
}

// Build a clean case title from the finding text: trim at a word boundary near
// 90 chars and append an ellipsis, rather than a hard mid-word cut at 80 (which
// produced "…imply Stage 3 (understat"). The full text stays in `description`.
function titleFromText(text, max = 90) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const base = (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).replace(/[\s.,;:]+$/, '');
  return base + '…';
}

function generateCases(agentId, result) {
  const cases = [];
  const now = new Date().toISOString();
  const findings = result?.key_findings || [];
  findings.forEach((f, i) => {
    // Normalise severity on ingest so mixed-case model outputs ("Critical",
    // "HIGH") still land in the right bucket. Only critical/high promote to
    // cases — medium/low stay as findings only.
    const severity = String(f.severity || '').toLowerCase();
    if (severity !== 'critical' && severity !== 'high') return;
    // Guard: a finding may omit the `finding` text field — don't crash the
    // whole AGENT_SUCCESS dispatch on .substring of undefined.
    const text = f.finding || f.explanation || f.pattern_detected || 'Untitled finding';
    cases.push({
      // Deterministic id (agent + finding index) — STABLE across re-syncs, so
      // re-running the same data reuses the same case ids (annotations in
      // caseWorkbench keep matching) and AGENT_SUCCESS can replace-in-place
      // instead of piling up stale duplicates from earlier runs.
      id: `CASE-${agentId.toUpperCase()}-${i}`,
      agentId,
      // findingIndex pins the case to the EXACT finding it was promoted from, so
      // the explainability drawer grounds its trail to THIS finding rather than
      // defaulting to index 0 (which rendered a fixed, wrong-entity narrative).
      findingIndex: i,
      title: titleFromText(text),
      severity,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      description: text,
      recommendedAction: f.recommended_action,
      exposureLkr: f.affected_exposure_lkr || f.affected_balance_lkr || 0,
      evidence: result,
      slaHours: severity === 'critical' ? 4 : 24,
    });
  });
  return cases;
}


export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Persist critical state to localStorage (with size guard)
  useEffect(() => {
    try {
      const toSave = {
        auth: state.auth,
        // Strip each case's heavy `evidence` (a full agent-result block) before
        // persisting — it's duplicated across every case from the same agent and
        // ballooned sentinel_state to ~8 MB on a realistic run (over the browser
        // quota). It's re-hydrated from agentResults on load (see loadSavedState).
        cases: Array.isArray(state.cases) ? state.cases.map(c => (c && c.evidence ? { ...c, evidence: undefined } : c)) : state.cases,
        findingWorkbench: state.findingWorkbench,
        caseWorkbench: state.caseWorkbench,
        auditPlan: state.auditPlan,
        thresholds: state.thresholds,
        activePreset: state.activePreset,
        thresholdAuditLog: state.thresholdAuditLog,
        auditTrail: state.auditTrail,
        feedbackRecommendations: state.feedbackRecommendations,
        feedbackLoopLastRunAt: state.feedbackLoopLastRunAt,
        agentConfig: state.agentConfig,
        bankProfile: state.bankProfile,
        appetiteOverrides: state.appetiteOverrides,
        customPresets: state.customPresets,
        escalationPolicy: state.escalationPolicy,
        driftBaseline: state.driftBaseline,
        assuranceHistory: state.assuranceHistory,
        remediation: state.remediation,
        _seedVersion: state._seedVersion,
      };
      // Save platform state (cases, workbench, audit plan). Guard it in its OWN
      // try/catch: a large case/workbench set (e.g. after a realistic scale run
      // that generates hundreds of cases) can exceed the browser's ~5 MB quota.
      // Previously this write was unguarded, so a QuotaExceededError here threw
      // into the outer catch and aborted the ENTIRE save — including the agent
      // results below — so a big run silently failed to persist and a reload
      // reverted to the prior snapshot. Now a failure here is isolated: agent
      // results still persist, and we surface a warning instead of losing it.
      try {
        localStorage.setItem('sentinel_state', JSON.stringify(toSave));
      } catch (stateErr) {
        console.warn('[sentinel] workspace state exceeded storage quota — agent results still saved:', stateErr.message);
        try { localStorage.setItem('sentinel_persist_warning', 'Workspace state (cases, annotations, audit trail) is too large for browser storage and was not fully saved — agent results are still persisted, but case notes may not survive a refresh. Clear demo data or export a pack via Reports to free space.'); } catch { /* ignore */ }
      }
      // FIX M12: Persist uploadedData without the raw row payload — a 200K-row
      // CSV easily exceeds the 4 MB guard and would silently drop the entire
      // results blob. Keep just the metadata so the UI can show "x.csv —
      // uploaded 10 min ago"; the actual rows are re-required on demand.
      const slimUploaded = Object.fromEntries(
        Object.entries(state.uploadedData || {}).map(([k, v]) => [k, v ? {
          filename: v.filename,
          uploadedAt: v.uploadedAt,
          // Preserve the TRUE population count even when only a capped sample of
          // rows is retained (FIX-E) or rows were dropped entirely. Take the max
          // of the live rows length and any previously-recorded rowCount so a
          // 600-row sample never overwrites the real 2,600.
          rowCount: Math.max(Array.isArray(v.rows) ? v.rows.length : 0, v.rowCount || 0),
        } : null])
      );
      // Save agent results separately with size guard (skip if > 4MB).
      // FIX M8: If the blob is too large or the setItem throws (quota exceeded
      // in some browsers), persist a warning so the next session can surface
      // it to the user instead of failing silently.
      const resultsJson = JSON.stringify({ agentResults: state.agentResults, uploadedData: slimUploaded });
      const sizeMB = (resultsJson.length / 1024 / 1024).toFixed(1);
      if (resultsJson.length < 4 * 1024 * 1024) {
        try {
          localStorage.setItem('sentinel_results', resultsJson);
          localStorage.removeItem('sentinel_persist_warning');
        } catch (quotaErr) {
          const msg = `Browser storage rejected results blob (${sizeMB} MB): ${quotaErr.message}. Recent agent results may not survive a refresh.`;
          console.error('[sentinel] persistence quota error:', msg);
          try { localStorage.setItem('sentinel_persist_warning', msg); } catch {}
        }
      } else {
        const msg = `Agent results too large for localStorage (${sizeMB} MB > 4 MB). Results will not survive a refresh — export to a pack via Reports if you need them later.`;
        console.warn('[sentinel] persistence size guard:', msg);
        try { localStorage.setItem('sentinel_persist_warning', msg); } catch {}
      }
      // FIX-E: persist a CAPPED per-agent row sample in a SEPARATE key (own guard)
      // so the raw-row charts (counterparty network, vintage cohorts, capital
      // gauges) re-render after a reload. Kept apart from the results blob so a
      // large sample can never knock out agentResults persistence (the M12 risk).
      try {
        const ROW_SAMPLE_CAP = 600;
        const samples = Object.fromEntries(
          Object.entries(state.uploadedData || {})
            .filter(([, v]) => Array.isArray(v?.rows) && v.rows.length)
            .map(([k, v]) => [k, v.rows.slice(0, ROW_SAMPLE_CAP)])
        );
        const sampleJson = JSON.stringify(samples);
        if (sampleJson.length < 3 * 1024 * 1024) localStorage.setItem('sentinel_row_samples', sampleJson);
        else localStorage.removeItem('sentinel_row_samples'); // too big — fall back to the re-run notice
      } catch { /* row samples are best-effort — never block the main persist */ }
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }, [state.auth, state.cases, state.findingWorkbench, state.caseWorkbench, state.auditPlan, state.agentResults, state.uploadedData, state.thresholds, state.activePreset, state.thresholdAuditLog, state.auditTrail, state.feedbackRecommendations, state.feedbackLoopLastRunAt, state.agentConfig, state.bankProfile, state.appetiteOverrides, state.customPresets, state.escalationPolicy, state.driftBaseline, state.assuranceHistory, state.remediation]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ─── FEEDBACK-LOOP HELPERS ──────────────────────────────────────────────────
// rule_id format is <agentId>.<key>; split into parts for threshold lookups.
function parseRuleId(ruleId) {
  const [agentId, ...rest] = String(ruleId || '').split('.');
  return { agentId, key: rest.join('.') };
}

// Seed case workbench with:
//   (a) four pre-marked false positives (so the feedback-loop story is
//       visible on first load), AND
//   (b) realistic stateHistory entries for the 10 demo cases (so Command
//       Centre ageing metrics and the drawer timeline have content).
// Case IDs mirror the registry in caseRegistry.js (CASE-001 through CASE-010).
// Relative times below are calibrated to the createdAt values set in the
// registry so ageing computation produces meaningful numbers.
function seedCaseWorkbench() {
  const now = new Date().toISOString();
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();

  return {
    'CASE-001': {
      status: 'investigating',
      notes: [],
      stateHistory: [
        { from: null,   to: 'open',          at: daysAgo(12), by: 'Orchestrator' },
        { from: 'open', to: 'investigating', at: daysAgo(4),  by: 'Internal Audit' },
      ],
    },
    'CASE-002': {
      status: 'open',
      notes: [],
      stateHistory: [
        { from: null, to: 'open', at: daysAgo(8), by: 'Orchestrator' },
      ],
    },
    'CASE-003': {
      status: 'investigating',
      notes: [],
      stateHistory: [
        { from: null,   to: 'open',          at: daysAgo(10), by: 'Orchestrator' },
        { from: 'open', to: 'investigating', at: daysAgo(5),  by: 'Chief Compliance Officer' },
      ],
    },
    'CASE-004': {
      status: 'open',
      notes: [],
      stateHistory: [
        { from: null, to: 'open', at: daysAgo(4), by: 'Orchestrator' },
      ],
    },
    'CASE-005': {
      status: 'open',
      notes: [],
      stateHistory: [
        { from: null, to: 'open', at: daysAgo(14), by: 'Orchestrator' },
      ],
      falsePositive: true,
      falsePositiveCategory: 'data_quality_issue',
      falsePositiveReason: 'Network-wide KYC gap count of 39,290 double-counts 847 accounts from the HSBC migration batch that were deduplicated in the next cycle. Post-dedup figure is 38,443 (4.60%, not 4.70%). Root cause is upstream data pipeline — not a threshold calibration issue. Fix the merge logic, not the rule.',
      falsePositiveSuggestedRuleId: null,
      falsePositiveMarkedAt: daysAgo(2),
      falsePositiveMarkedBy: 'Auditor',
    },
    'CASE-006': {
      status: 'resolved',
      notes: [],
      stateHistory: [
        { from: null,            to: 'open',          at: daysAgo(18), by: 'Orchestrator' },
        { from: 'open',          to: 'investigating', at: daysAgo(14), by: 'Head of Treasury' },
        { from: 'investigating', to: 'remediation',   at: daysAgo(9),  by: 'Head of Treasury' },
        { from: 'remediation',   to: 'resolved',      at: daysAgo(3),  by: 'ALCO' },
      ],
    },
    'CASE-007': {
      status: 'open',
      notes: [],
      stateHistory: [
        { from: null, to: 'open', at: daysAgo(9), by: 'Orchestrator' },
      ],
    },
    'CASE-008': {
      status: 'investigating',
      notes: [],
      stateHistory: [
        { from: null,   to: 'open',          at: daysAgo(5), by: 'Orchestrator' },
        { from: 'open', to: 'investigating', at: daysAgo(3), by: 'Compliance' },
      ],
      falsePositive: true,
      falsePositiveCategory: 'threshold_too_sensitive',
      falsePositiveReason: 'Velocity cluster at BR-72 scored 0.63 on 11 RTGS transactions clustered within 90 seconds. Counterparty trace confirms all 11 recipients are employees of the same corporate customer — this is a payroll batch, not a structuring attempt. The structuring score gate of 0.60 cannot distinguish coordinated-employer batches from deliberate layering without a counterparty-relationship feature. Raising the cutoff to 0.68 would remove this false positive while retaining the BNK-0841-X confirmed cluster at score 0.94.',
      falsePositiveSuggestedRuleId: 'transaction.structuring_score',
      falsePositiveMarkedAt: daysAgo(1),
      falsePositiveMarkedBy: 'Auditor',
    },
    'CASE-009': {
      status: 'investigating',
      notes: [],
      stateHistory: [
        { from: null,   to: 'open',          at: daysAgo(11), by: 'Orchestrator' },
        { from: 'open', to: 'investigating', at: daysAgo(6),  by: 'Trade Compliance' },
      ],
      falsePositive: true,
      falsePositiveCategory: 'legitimate_business_activity',
      falsePositiveReason: 'BNK-CORP-4412 is a 30-year licensed gold refiner with Board-audited inventory and documented long-term offtake contracts. The +55% invoice deviation flagged by the trade agent reflects a negotiated premium on refined product sold into the Singapore precious-metals exchange — not under-invoicing for value extraction. Relationship Manager and Compliance confirmed the pattern matches their declared business model.',
      falsePositiveSuggestedRuleId: 'trade.invoice_deviation_pct',
      falsePositiveMarkedAt: daysAgo(2),
      falsePositiveMarkedBy: 'Auditor',
    },
    'CASE-010': {
      status: 'open',
      notes: [],
      stateHistory: [
        { from: null, to: 'open', at: daysAgo(2), by: 'Orchestrator' },
      ],
      falsePositive: true,
      falsePositiveCategory: 'threshold_too_sensitive',
      falsePositiveReason: 'BR-23 flagged at 61% override concentration against a 70% threshold — the case scored high because concentration crossed into amber. Underlying cause: two approvers at BR-23 were on approved annual leave during the observation window, forcing the remaining pool to take a larger share. Pattern is staffing-temporary, not structural. Threshold could move to 75% without losing BR-14 which sits at 87% — the confirmed fraud pattern.',
      falsePositiveSuggestedRuleId: 'controls.override_concentration_pct',
      falsePositiveMarkedAt: daysAgo(1),
      falsePositiveMarkedBy: 'Auditor',
    },
  };
}

// Seed recommendations so Rule Parameters has content on first load. Each one
// is marked as produced by the "demo seed" so the auditor can tell it's not
// from a real agent run until they click "Run feedback-loop analysis".
function seedFeedbackRecommendations() {
  const now = new Date().toISOString();
  return [
    {
      id: 'REC-TXN-STR-001',
      generatedAt: now,
      source: 'demo-seed',
      sourceCaseIds: ['CASE-008'],
      agentId: 'transaction',
      ruleId: 'transaction.structuring_score',
      currentValue: 0.60,
      recommendedValue: 0.68,
      delta: '+0.08',
      rationale: 'CASE-008 (BR-72 Velocity Cluster) scored 0.63 on a cluster that traced to an employer payroll batch — 11 nearly-identical disbursements within 90 seconds, all to employees of the same corporate customer. The structuring-score gate of 0.60 cannot distinguish coordinated-employer batches from deliberate layering. Raising the cutoff to 0.68 eliminates this false positive while still firing on the confirmed BNK-0841-X cluster, which scored 0.94 — well above either threshold.',
      confidence: 0.71,
      expectedImpact: { falsePositivesEliminated: 1, criticalFindingsPreserved: 7, criticalFindingsSuppressed: 0 },
      status: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      rejectReason: null,
    },
    {
      id: 'REC-TRADE-INV-001',
      generatedAt: now,
      source: 'demo-seed',
      sourceCaseIds: ['CASE-009'],
      agentId: 'trade',
      ruleId: 'trade.invoice_deviation_pct',
      currentValue: 25,
      recommendedValue: 30,
      delta: '+5 pp',
      rationale: 'CASE-009 (Gold Under-Invoicing — HS 7108) was marked false positive as legitimate business activity. BNK-CORP-4412 is a 30-year licensed refiner with audited inventory and documented long-term contracts that run 20-30% above HS-code median by design. Raising the flag gate to 30% would remove this false positive while still firing on BNK-CORP-0887 (+38% deviation, confirmed TBML on CASE-003).',
      confidence: 0.66,
      expectedImpact: { falsePositivesEliminated: 1, criticalFindingsPreserved: 2, criticalFindingsSuppressed: 0 },
      status: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      rejectReason: null,
    },
    {
      id: 'REC-CONTROLS-OVERRIDE-001',
      generatedAt: now,
      source: 'demo-seed',
      sourceCaseIds: ['CASE-010'],
      agentId: 'controls',
      ruleId: 'controls.override_concentration_pct',
      currentValue: 70,
      recommendedValue: 75,
      delta: '+5 pp',
      rationale: 'CASE-010 (BR-23 Elevated Controls Risk — STF-2341) was flagged because override concentration hit 61% against the 70% amber threshold. Root cause was two approvers on approved annual leave during the observation window — a temporary staffing gap, not structural fraud. Raising the concentration gate to 75% would eliminate this false positive while retaining the definitive BR-14 finding, where STF-1847 holds 87% concentration — well above either threshold.',
      confidence: 0.63,
      expectedImpact: { falsePositivesEliminated: 1, criticalFindingsPreserved: 4, criticalFindingsSuppressed: 0 },
      status: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      rejectReason: null,
    },
  ];
}
