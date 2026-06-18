import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { MODEL_ID } from '../config/model.js';
import { validateAgentResult } from '../config/agentSchemas.js';

// ─── PROMPT IMPORTS ──────────────────────────────────────────────────────────
// Prefer the threshold-aware function (…PromptFn / default export). Existing
// string exports are kept for backwards compatibility elsewhere in the repo.
import creditPromptFn from '../prompts/credit.js';
import transactionPromptFn from '../prompts/transaction.js';
import suspensePromptFn from '../prompts/suspense.js';
import kycPromptFn from '../prompts/kyc.js';
import internalControlsPromptFn from '../prompts/internalControls.js';
import digitalFraudPromptFn from '../prompts/digitalFraud.js';
import tradeTreasuryPromptFn from '../prompts/tradeTreasury.js';
import insiderRiskPromptFn from '../prompts/insiderRisk.js';
import mjePromptFn from '../prompts/mje.js';
import capitalPromptFn from '../prompts/capital.js';
import balancePromptFn from '../prompts/balance.js';

// New agents (Phase 2)
import wealthPromptFn from '../prompts/wealth.js';
import collateralPromptFn from '../prompts/collateral.js';
import connectedPartyPromptFn from '../prompts/connectedParty.js';
import almPromptFn from '../prompts/alm.js';
import thirdPartyPromptFn from '../prompts/thirdParty.js';
import accessRightsPromptFn from '../prompts/accessRights.js';
import conductPromptFn from '../prompts/conduct.js';
import explainabilityPromptFn from '../prompts/explainability.js';

// Phase 3 additions
import creditFraudPromptFn from '../prompts/creditFraud.js';
import regReportingPromptFn from '../prompts/regReporting.js';
import staffAccessPromptFn from '../prompts/staffAccess.js';

// Phase 4 — feedback-loop meta-agent
import feedbackLoopPromptFn from '../prompts/feedbackLoop.js';

const router = Router();

// Every entry is a function(overrides) => systemPromptString.
const PROMPT_FNS = {
  credit: creditPromptFn,
  transaction: transactionPromptFn,
  suspense: suspensePromptFn,
  kyc: kycPromptFn,
  controls: internalControlsPromptFn,
  digital: digitalFraudPromptFn,
  trade: tradeTreasuryPromptFn,
  insider: insiderRiskPromptFn,
  mje: mjePromptFn,
  capital: capitalPromptFn,
  balance: balancePromptFn,

  // Phase 2 additions
  wealth: wealthPromptFn,
  collateral: collateralPromptFn,
  connectedParty: connectedPartyPromptFn,
  alm: almPromptFn,
  thirdParty: thirdPartyPromptFn,
  accessRights: accessRightsPromptFn,
  conduct: conductPromptFn,
  explainability: explainabilityPromptFn,

  // Phase 3 additions
  creditFraud: creditFraudPromptFn,   // origination fraud / first-payment default / guarantor-chain concentration
  regReporting: regReportingPromptFn, // independent-of-submission CBSL returns reconciliation
  staffAccess: staffAccessPromptFn,   // consolidated Controls + Insider + AccessRights

  // Phase 4 — feedback-loop meta-agent. Consumes false-positive cases +
  // current thresholds + true-positive preservation set, returns rule-change
  // recommendations that require human approval.
  feedbackLoop: feedbackLoopPromptFn,
};

// FIX H2: Complete token limits for all 24 agents. Agents with verbose
// multi-section schemas need higher limits to avoid silent truncation.
const TOKEN_LIMITS = {
  // Phase 1
  credit:      12000,
  transaction: 10000,
  suspense:    10000,
  kyc:          8000,
  controls:     8000,
  digital:      8000,
  trade:       12000,
  insider:     16000,
  mje:         12000,
  capital:     14000,
  balance:      8000,
  // Phase 2
  wealth:       8000,
  collateral:  10000,
  connectedParty: 10000,
  alm:         10000,
  thirdParty:   8000,
  accessRights: 8000,
  conduct:      8000,
  explainability: 6000,
  // Phase 3
  staffAccess: 14000,
  creditFraud: 12000,
  regReporting: 10000,
  // Phase 4
  feedbackLoop: 10000,
};

router.post('/:agentName', async (req, res) => {
  const { agentName } = req.params;
  const apiKey = req.headers['x-api-key'];
  // `thresholds` is the per-agent override map passed from Rule Parameters.
  // Shape: { dpd_stage3: 120, isoforest_critical: 0.90, ... }
  const { data, context, thresholds } = req.body;

  if (!apiKey) return res.status(401).json({ error: 'API key required. Enter your Anthropic API key in Settings.' });

  // FIX M10: Log invalid agent attempts with neutral message (avoids leaking agent catalog).
  if (!PROMPT_FNS[agentName]) {
    console.warn(`Invalid agent name attempt: "${agentName}" from ${req.ip}`);
    return res.status(400).json({ error: 'Agent not found.' });
  }

  // Upper bound on rows: the whole array is JSON-serialised into the prompt, so
  // an unbounded upload would explode token usage / cost / latency (and could
  // OOM the request). Reject oversize payloads with a clear error.
  const MAX_ROWS = 5000;

  // explainability and feedbackLoop receive structured envelopes, not CSVs.
  // staffAccess receives a three-feed object { controls_data, insider_data, access_data }.
  if (agentName !== 'explainability' && agentName !== 'feedbackLoop' && agentName !== 'staffAccess') {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data provided. Please upload a valid CSV file.' });
    }
    if (data.length > MAX_ROWS) {
      return res.status(413).json({ error: `Too many rows (${data.length}). Split the file — the per-run limit is ${MAX_ROWS}.` });
    }
  } else if (agentName === 'staffAccess') {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'staffAccess requires data with controls_data, insider_data, and access_data arrays.' });
    }
    const totalRows = [...(data.controls_data || []), ...(data.insider_data || []), ...(data.access_data || [])].length;
    if (totalRows > MAX_ROWS) {
      return res.status(413).json({ error: `Too many rows across the three feeds (${totalRows}). The per-run limit is ${MAX_ROWS}.` });
    }
  }

  // FIX M-A: Validate context field — must be a string under 2000 chars to prevent
  // accidental object serialisation or deliberate prompt-injection payloads.
  if (context !== undefined && context !== null) {
    if (typeof context !== 'string') {
      return res.status(400).json({ error: 'context must be a string.' });
    }
    if (context.length > 2000) {
      return res.status(400).json({ error: 'context exceeds 2000-character limit.' });
    }
  }

  // FIX C2: Validate threshold overrides before passing to prompt function.
  // Unknown keys or wrong types get rejected with a 400 rather than being
  // silently forwarded to the LLM or triggering a mis-classified retry.
  const safeThresholds = {};
  if (thresholds && typeof thresholds === 'object') {
    for (const [key, val] of Object.entries(thresholds)) {
      if (val === undefined || val === null) continue;
      if (typeof val !== 'number') {
        return res.status(400).json({ error: `Threshold "${key}" must be a number, got ${typeof val}.` });
      }
      if (!Number.isFinite(val)) {
        return res.status(400).json({ error: `Threshold "${key}" must be a finite number.` });
      }
      safeThresholds[key] = val;
    }
  }

  let prompt;
  try {
    const promptFn = PROMPT_FNS[agentName];
    prompt = typeof promptFn === 'function' ? promptFn(safeThresholds) : promptFn;
  } catch (err) {
    console.error(`Agent ${agentName}: prompt construction failed:`, err.message);
    return res.status(400).json({ error: `Invalid threshold configuration: ${err.message}` });
  }

  // FIX M-B / M-C: Validate structured-envelope shapes before forwarding to LLM.
  // Bad inputs produce garbage outputs with no user-visible error otherwise.
  if (agentName === 'feedbackLoop') {
    const envelope = req.body.envelope || data;
    if (!envelope || !Array.isArray(envelope.false_positives)) {
      return res.status(400).json({ error: 'feedbackLoop requires an envelope with a false_positives array.' });
    }
    if (!envelope.current_thresholds || typeof envelope.current_thresholds !== 'object' || Array.isArray(envelope.current_thresholds)) {
      return res.status(400).json({ error: 'feedbackLoop requires an envelope with a current_thresholds object.' });
    }
  }
  if (agentName === 'explainability') {
    const insight = req.body.insight || data;
    for (const field of ['insight_id', 'insight_text', 'severity', 'primary_agent']) {
      if (!insight || !(field in insight)) {
        return res.status(400).json({ error: `explainability requires insight.${field}.` });
      }
    }
  }

  let userMessage;
  if (agentName === 'explainability') {
    userMessage = `Produce the explainability trail for the following insight. Return ONLY valid JSON matching the schema.\n\n${JSON.stringify(req.body.insight || data, null, 2)}`;
  } else if (agentName === 'feedbackLoop') {
    // feedbackLoop expects a structured envelope: false_positives, true_positives,
    // current_thresholds, agent_catalog. The frontend posts it as req.body.envelope.
    userMessage = `Analyse the following feedback-loop envelope and return ONLY valid JSON matching the schema defined in your instructions.\n\n${JSON.stringify(req.body.envelope || data, null, 2)}`;
  } else if (agentName === 'staffAccess') {
    // staffAccess receives three parallel feeds in a single object.
    const totalRows = [
      ...(data.controls_data || []),
      ...(data.insider_data || []),
      ...(data.access_data || []),
    ].length;
    userMessage = `Analyze the following three-feed data and return ONLY valid JSON matching the schema defined in your instructions. Do not include any text before or after the JSON object.\n\nData (${totalRows} total records across three feeds):\n${JSON.stringify(data, null, 2)}${context ? `\n\nAdditional context: ${context}` : ''}`;
  } else {
    userMessage = `Analyze the following data and return ONLY valid JSON matching the schema defined in your instructions. Do not include any text before or after the JSON object.\n\nData (${data.length} records):\n${JSON.stringify(data, null, 2)}${context ? `\n\nAdditional context: ${context}` : ''}`;
  }

  // Per-agent token-limit override from Agent Configuration. Validated against
  // a safe band; out-of-range or wrong-type is rejected rather than silently
  // clamped so the operator sees a clear error. Absent → platform default.
  let maxTokens = TOKEN_LIMITS[agentName] || 8192;
  if (req.body.maxTokens != null) {
    const mt = req.body.maxTokens;
    if (typeof mt !== 'number' || !Number.isInteger(mt) || mt < 1024 || mt > 32000) {
      return res.status(400).json({ error: 'maxTokens must be an integer between 1024 and 32000.' });
    }
    maxTokens = mt;
  }

  try {
    const client = new Anthropic({ apiKey });
    const result = await runAgentWithRetries({ client, agentName, prompt, userMessage, maxTokens });
    res.json({ success: true, agentName, result, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: 'Invalid API key. Please check your Anthropic API key in Settings.' });
    if (err.status === 429) return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
    console.error(`Agent ${agentName} error:`, err.message);
    res.status(500).json({ error: 'Agent analysis failed. Please retry.' });
  }
});

// ─── SHARED RETRY / PARSE HELPERS ───────────────────────────────────────────
// Retries the underlying messages.create on transient errors (429, 5xx, network)
// with short exponential backoff. Within each successful API response, makes up
// to 2 parse attempts (the second attempt asks the model to retry JSON-only).
export async function runAgentWithRetries({ client, agentName, prompt, userMessage, maxTokens }) {
  const BACKOFF_MS = [0, 1500, 4000]; // before attempt 0, 1, 2
  // FIX H1: Collect all retry errors so callers can inspect the full history.
  const attemptErrors = [];

  for (let attempt = 0; attempt < BACKOFF_MS.length; attempt++) {
    if (BACKOFF_MS[attempt]) await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
    try {
      // FIX M3: Wrap the API call with a 45-second timeout so hanging requests
      // don't accumulate backend connections indefinitely.
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error('API request timeout'), { code: 'ETIMEOUT' })), 45000)
      );
      const message = await Promise.race([
        client.messages.create({
          model: MODEL_ID,
          max_tokens: maxTokens,
          system: prompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
        timeoutPromise,
      ]);

      const rawText = extractText(message, agentName, attempt);
      if (rawText == null) {
        const e = new Error('Model returned no text content');
        attemptErrors.push({ attempt, error: e.message });
        console.warn(`Agent ${agentName}: non-text response on attempt ${attempt + 1}`);
        continue;
      }
      const parsed = tryParseJson(rawText, agentName, attempt);
      if (parsed) {
        // CC2: the text parsed, but is the SHAPE usable? A valid-JSON-but-wrong-
        // schema response (bare array, empty object, list-key returned as a
        // string, non-string severity) would otherwise persist as garbage and
        // silently break the UI. Reject it like a parse failure so the model
        // gets another attempt before the request fails.
        const { ok, errors } = validateAgentResult(agentName, parsed);
        if (ok) return parsed;
        attemptErrors.push({ attempt, error: `Schema validation failed: ${errors.join('; ')}` });
        console.warn(`Agent ${agentName}: schema validation failed on attempt ${attempt + 1} (${errors.join('; ')}), ${attempt < BACKOFF_MS.length - 1 ? 'retrying' : 'giving up'}`);
        continue;
      }
      const e = new Error('Model did not return valid JSON');
      attemptErrors.push({ attempt, error: e.message });
      console.warn(`Agent ${agentName}: JSON parse failed on attempt ${attempt + 1}, ${attempt < BACKOFF_MS.length - 1 ? 'retrying' : 'giving up'}`);
    } catch (err) {
      attemptErrors.push({ attempt, error: err.message, status: err.status, code: err.code });
      const transient = err.status === 429
        || (err.status >= 500 && err.status < 600)
        || err.code === 'ECONNRESET'
        || err.code === 'ETIMEDOUT'
        || err.code === 'ETIMEOUT';
      if (!transient) throw err; // 401, 400, etc — surface immediately
      console.warn(`Agent ${agentName}: transient error (${err.status || err.code}) on attempt ${attempt + 1}, ${attempt < BACKOFF_MS.length - 1 ? 'retrying' : 'giving up'}`);
    }
  }

  const finalError = new Error(`Agent failed after ${BACKOFF_MS.length} attempts`);
  finalError.attemptHistory = attemptErrors;
  console.error(`Agent ${agentName}: all attempts exhausted`, attemptErrors);
  throw finalError;
}

// FIX H3: Log the specific reason text was not returned so operators can
// distinguish content-filter trips from unexpected tool-use responses.
// FIX H1-v2: Scan ALL content blocks for the first `text` block. The Anthropic
// SDK can return a thinking/tool block at index 0 followed by the actual text
// at index 1+; inspecting only content[0] would treat those responses as
// "no text" and force an unnecessary retry.
export function extractText(message, agentName = 'unknown', attempt = 0) {
  const content = message?.content;
  if (!Array.isArray(content) || content.length === 0) {
    console.warn(`Agent ${agentName} attempt ${attempt + 1}: message has no content blocks`, message?.stop_reason);
    return null;
  }
  const otherTypes = [];
  for (const block of content) {
    if (!block) continue;
    if (block.type === 'text') {
      if (typeof block.text !== 'string') {
        console.warn(`Agent ${agentName} attempt ${attempt + 1}: text block has no string content`);
        continue;
      }
      return block.text.trim();
    }
    otherTypes.push(block.type);
  }
  console.warn(`Agent ${agentName} attempt ${attempt + 1}: no text block found among [${otherTypes.join(', ')}] (stop_reason: ${message?.stop_reason})`);
  return null;
}

// FIX M11: Log which parse strategy succeeded or failed so operators can
// distinguish LLM hallucinations from extraction bugs.
export function tryParseJson(rawText, agentName = 'unknown', attempt = 0) {
  if (!rawText) return null;

  // Strategy 1: Direct parse for well-behaved model outputs.
  try { return JSON.parse(rawText); } catch (e1) {
    // Strategy 2: Strip common code-fence wrappers.
    const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try { return JSON.parse(fenced[1].trim()); } catch (e2) {
        // Strategy 3: Scan for the first balanced { ... } or [ ... ] at top level.
        const extracted = extractBalancedJson(rawText);
        if (extracted) {
          try { return JSON.parse(extracted); } catch (e3) {
            console.warn(`Agent ${agentName} attempt ${attempt + 1}: all JSON parse strategies failed`, {
              direct: e1.message,
              fenced: e2.message,
              balanced: e3.message,
              textLength: rawText.length,
            });
            return null;
          }
        }
        console.warn(`Agent ${agentName} attempt ${attempt + 1}: fenced extraction failed, no balanced JSON found`, {
          direct: e1.message,
          fenced: e2.message,
          textLength: rawText.length,
        });
        return null;
      }
    }
    // No code fence — try balanced extraction directly.
    const extracted = extractBalancedJson(rawText);
    if (extracted) {
      try { return JSON.parse(extracted); } catch (e3) {
        console.warn(`Agent ${agentName} attempt ${attempt + 1}: direct and balanced parse both failed`, {
          direct: e1.message,
          balanced: e3.message,
          textLength: rawText.length,
        });
        return null;
      }
    }
    console.warn(`Agent ${agentName} attempt ${attempt + 1}: direct parse failed, no JSON structure found`, {
      direct: e1.message,
      textLength: rawText.length,
    });
    return null;
  }
}

// Robust JSON extractor: locates the first balanced top-level object or array
// using brace/bracket counting with correct string and escape-sequence handling.
// Handles: \" (escaped quote), \\ (escaped backslash), and other \X sequences.
function extractBalancedJson(text) {
  const opens = ['{', '['];
  const closes = { '{': '}', '[': ']' };
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (opens.includes(text[i])) { start = i; break; }
  }
  if (start === -1) return null;
  const openChar = text[start];
  const closeChar = closes[openChar];
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (inStr) {
      if (c === '\\') escape = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export default router;
