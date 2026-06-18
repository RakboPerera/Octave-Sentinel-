import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { orchestratorPrompt } from '../prompts/orchestrator.js';
import { runAgentWithRetries } from './agents.js';

const router = Router();

// FIX H5: Cap signal array to prevent DoS / context exhaustion.
const MAX_SIGNALS = 2000;

router.post('/', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const { signals, agentSummaries } = req.body;

  if (!apiKey) return res.status(401).json({ error: 'API key required.' });
  if (!signals || signals.length < 2) return res.status(400).json({ error: 'At least 2 agent signals required for orchestration.' });
  // FIX H5
  if (signals.length > MAX_SIGNALS) return res.status(413).json({ error: `Too many signals (max ${MAX_SIGNALS} per orchestration run).` });

  // FIX H4: Only include agent summaries section in the prompt when summaries
  // are actually present. An empty object confuses the LLM into fabricating context.
  const hasSummaries = agentSummaries && typeof agentSummaries === 'object' && Object.keys(agentSummaries).length > 0;
  const summarySection = hasSummaries
    ? `\n\nAgent summaries (additional context for cross-agent correlation):\n${JSON.stringify(agentSummaries, null, 2)}`
    : '\n\n(No agent summaries provided for this run — correlate from signals only.)';

  const userMessage = `Analyze the following cross-agent signals and return ONLY valid JSON.\n\nAgent signals:\n${JSON.stringify(signals, null, 2)}${summarySection}`;

  try {
    const client = new Anthropic({ apiKey });
    const result = await runAgentWithRetries({
      client,
      agentName: 'orchestrator',
      prompt: orchestratorPrompt,
      userMessage,
      maxTokens: 8192,
    });
    res.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: 'Invalid API key.' });
    if (err.status === 429) return res.status(429).json({ error: 'Rate limit reached. Please retry.' });
    console.error('Orchestrator error:', err.message);
    res.status(500).json({ error: 'Orchestration failed. Please retry.' });
  }
});

export default router;
