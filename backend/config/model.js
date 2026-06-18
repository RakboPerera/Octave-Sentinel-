// ─── ANTHROPIC MODEL CONFIG ──────────────────────────────────────────────────
// Single source of truth for the Claude model id used across the backend.
// Both server.js (auth-check) and routes/agents.js (detection runs) import
// from here so a model bump is a one-line change.
//
// If you change MODEL_ID, also update the display string shown in
// frontend/src/components/shared/ApiKeySettings.jsx so users see the model
// they're actually calling.

export const MODEL_ID = 'claude-sonnet-4-20250514';
