# Sentinel by Octave
### Agentic AI Audit Intelligence Platform

---

## Overview

Sentinel is a full-stack agentic AI platform that runs 17 specialised detection agents plus an orchestrator, explainability meta-agent, and feedback-loop meta-agent against bank data, detects anomalies, and surfaces cross-domain correlations. Built on Claude Sonnet 4 (`claude-sonnet-4-20250514`).

**Detection agents (17):**
- Credit Intelligence — SLFRS 9 staging anomalies, vintage cohort analysis
- Credit Fraud & Origination — shell borrowers, FPD cohorts, siphoning patterns
- Transaction Surveillance — Benford's Law, structuring detection, AML
- Suspense & Reconciliation — phantom receivable detection, CBSL aging
- Identity & KYC / AML — 47-rule CDD compliance + sanctions screening
- Staff, Access & Control Risk — consolidated from Internal Controls + Insider Risk + Access Rights
- Digital Fraud & Identity — behavioral biometrics, impossible travel, ATO
- Trade Finance & Treasury — TBML, over-invoicing, FX position limits
- MJE Testing — full-population manual-journal testing
- Capital & Liquidity — Basel III CAR / LCR / NSFR + 4-quarter projection
- Wealth Suitability — mis-selling, concentration, churn velocity
- Collateral Integrity — stale valuations, LTV breaches, double pledges
- Connected Party — CBSL 25% single-obligor limit, shared-director networks
- ALM & IRRBB — repricing gaps, EVE sensitivity, NII vulnerability
- Third-Party Risk — vendor concentration, exit readiness, CBSL notifications
- Conduct & Grievance — recurrence, ageing, whistleblower clustering
- Regulatory Reporting Integrity — independent recomputation of CBSL returns

**Meta-agents (3):** Orchestrator, Explainability, Feedback Loop.

---

## Local Development

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Run backend (port 8000)
cd backend && node server.js

# 3. Run frontend (port 5173) — in separate terminal
cd frontend && npm run dev
```

Navigate to `http://localhost:5173`. Enter your Anthropic API key in Settings (top right).

---

## Deployment on Render

This repo is configured for one-click Render deployment via `render.yaml`.

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — no manual config needed
5. Deploy

**No environment variables required** — the Anthropic API key is entered by the user at runtime in the UI and sent per-request. It is never stored server-side.

---

## Architecture

```
sentinel-ntb/
├── backend/
│   ├── server.js          # Express server, serves frontend/dist in prod
│   ├── routes/
│   │   ├── agents.js      # POST /api/agent/:agentName
│   │   └── orchestrator.js # POST /api/orchestrate
│   └── prompts/           # System prompts for each agent
│       ├── credit.js
│       ├── transaction.js
│       ├── suspense.js
│       ├── kyc.js
│       ├── internalControls.js
│       ├── digitalFraud.js
│       ├── tradeTreasury.js
│       └── orchestrator.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/AppContext.jsx
│   │   ├── data/demoData.js      # neutral demo data (Bank Profile-driven)
│   │   ├── pages/                # Agent pages, Command Centre, etc.
│   │   └── components/           # Shared UI components
│   └── vite.config.js
├── sample-data/                  # Sample CSVs for testing live agents
├── render.yaml                   # Render deployment config
└── package.json
```

---

## Sample Data

The `sample-data/` folder contains 23 CSV files (one per agent, plus supplementary reference sets) with realistic demo data including embedded anomalies for testing. Upload via the Data Hub → select agent tab → upload CSV → Run Agent.

---

## Tech Stack

- **Frontend:** React 18, Vite, Recharts, D3, Lucide
- **Backend:** Node.js 20, Express
- **AI:** Anthropic Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **Deploy:** Render (single web service)
