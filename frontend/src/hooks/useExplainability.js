// ─── EXPLAINABILITY HOOK ─────────────────────────────────────────────────────
// Two-path resolver (in priority order):
//   1. Live Explainability Agent    (if API key is configured)
//   2. Deterministic trail generator (utils/trailGenerator.js — universal default)
//
// The generator GROUNDS every trail to the actual finding passed in (entity ids,
// exposure, severity, the rule/statistic that fired). It guarantees that every
// finding, everywhere, has a full trail to render even with no API key.
//
// Note: there is deliberately NO pre-rendered "curated trail" path any more. The
// old explainabilityDemo.js hand-authored a fixed hero narrative per agent
// (a single fictional loan/staff/account), keyed by agentId::index only — so it
// rendered the SAME story for every case of an agent, mismatched to the real
// entity, and even named an "Isolation Forest" the deterministic engine never
// runs. Grounding to the real finding is the whole point; we don't override it.

import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { generateTrail } from '../utils/trailGenerator.js';

const CACHE = new Map();
function cacheKey(agentId, findingIndex) { return `${agentId}::${findingIndex}`; }

export default function useExplainability(agentId, findingIndex, findingPayload) {
  const { state } = useApp();

  const initial = () => {
    // Generate immediately from the actual finding — no blank state ever.
    const generated = safelyGenerate({ agentId, findingIndex, finding: findingPayload, thresholds: state.thresholds });
    if (generated) return { loading: false, source: 'generated', data: generated, error: null };
    return { loading: false, source: null, data: null, error: null };
  };

  const [state_, setState] = useState(initial);

  useEffect(() => {
    let cancelled = false;

    // 1. cached live trail (from a previous call this session)
    const ck = cacheKey(agentId, findingIndex);
    if (CACHE.has(ck)) {
      setState({ loading: false, source: 'live', data: CACHE.get(ck), error: null });
      return;
    }

    // 3. generator fallback — always succeeds for any finding
    const generated = safelyGenerate({ agentId, findingIndex, finding: findingPayload, thresholds: state.thresholds });

    // If API key is configured we upgrade to the live agent, using the
    // generated trail as an immediate placeholder so the UI is never empty.
    if (state.apiKeyStatus === 'valid' && state.apiKey) {
      setState({ loading: true, source: generated ? 'generated' : null, data: generated, error: null });
      (async () => {
        try {
          const response = await fetch('/api/agent/explainability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': state.apiKey },
            body: JSON.stringify({
              insight: findingPayload || { finding: 'Unknown', agentId, findingIndex },
            }),
          });
          const json = await response.json();
          if (cancelled) return;
          if (!response.ok) throw new Error(json?.error || 'Explainability agent failed');
          CACHE.set(ck, json.result);
          setState({ loading: false, source: 'live', data: json.result, error: null });
        } catch (err) {
          if (cancelled) return;
          // Keep the generated trail on live failure — never leave the UI empty.
          setState({
            loading: false,
            source: generated ? 'generated' : null,
            data: generated,
            error: generated ? null : (err.message || 'Failed to generate explainability'),
          });
        }
      })();
      return () => { cancelled = true; };
    }

    // No API key → generator fallback is the final output.
    setState({ loading: false, source: 'generated', data: generated, error: null });
    return () => { cancelled = true; };
  }, [agentId, findingIndex, state.apiKey, state.apiKeyStatus, state.thresholds, findingPayload]);

  return state_;
}

function safelyGenerate({ agentId, findingIndex, finding, thresholds }) {
  if (!agentId || !finding) return null;
  try {
    return generateTrail({ finding, agentId, findingIndex, activeThresholds: thresholds });
  } catch (e) {
    console.warn('trailGenerator failed', e);
    return null;
  }
}
