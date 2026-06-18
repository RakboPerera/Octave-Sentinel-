import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, ChevronLeft, Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import InfoTooltip from '../../components/shared/InfoTooltip.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';

// ─── SCENARIO DATA ────────────────────────────────────────────────────────────

const SCENARIOS = {
  growth: {
    title: 'The Growth Trap',
    subtitle: 'How 50% loan growth conceals credit quality deterioration',
    color: '#185FA5',
    totalSeverity: 0.94,
    fraudType: 'Insider-Enabled Loan Fraud with GL Manipulation',
    entities: ['BR-14', 'STF-1847', 'LKR 1.41 Bn exposure'],
    steps: [
      {
        id: 1, agent: 'Credit Intelligence', agentColor: '#185FA5', agentIcon: '◈',
        title: 'Portfolio sweep — 16,631 loans analysed',
        narrative: 'The Credit Intelligence Agent scores every loan in the portfolio with deterministic rules — no model guesses. It recomputes the SLFRS 9 stage from DPD, restructure count and watch flags, then runs a robust-z outlier test on collateral ratio, sector concentration and override flag against each loan\'s peer and vintage cohort. Loans whose computed position diverges materially from their assigned stage are flagged.',
        finding: '89 loans flagged with an outlier score >0.65 (robust-z beyond the peer/vintage band). 12 critical (score >0.85). Estimated flagged exposure: LKR 1.41 Bn. Average outlier score: 0.71.',
        severity: 0.71,
        metric: '89 flagged',
        metricSub: 'LKR 1.41 Bn exposure',
        evidence: { type: 'stat', label: 'Portfolio scan completed', value: '89 outlier loans detected across 16,631 analysed' },
        signal: null,
      },
      {
        id: 2, agent: 'Credit Intelligence', agentColor: '#185FA5', agentIcon: '◈',
        title: 'SLFRS 9 staging gap analysis',
        narrative: 'For each flagged loan, the agent predicts the correct stage from the feature combination using SLFRS 9 criteria. Where the predicted stage is higher than the assigned stage, the loan is flagged as misstaged — meaning provisions are understated and ECL is materially incorrect.',
        finding: '34 loans are predicted misstaged. 11 loans at Stage 1 should be Stage 3. Combined ECL understatement if corrected: LKR 1.1 Bn. Stage 3 ratio would move from 3.50% to 4.12% — pushing Demo Bank above peer-median 2.84% and close to the 4.5% internal amber threshold.',
        severity: 0.86,
        metric: '34 misstaged',
        metricSub: 'LKR 1.1 Bn ECL impact',
        evidence: { type: 'alert', label: 'SLFRS 9 breach detected', value: '11 Stage 1 loans predicted Stage 3 — regulatory provisioning gap confirmed' },
        signal: 'Orchestrator signal → Internal Controls Agent: BR-14 has 11 override-approved flagged loans. Investigate override concentration.',
      },
      {
        id: 3, agent: 'Credit Intelligence', agentColor: '#185FA5', agentIcon: '◈',
        title: 'Vintage cohort analysis — quality deterioration confirmed',
        narrative: 'The agent stratifies the loan book by origination quarter and measures early default rate at equivalent maturity. This reveals whether underwriting standards deteriorated during the rapid growth period — a risk invisible to traditional portfolio sampling.',
        finding: 'Q3 2025 cohort defaulting at 1.7× the rate of the equivalent 2024-Q3 cohort at the same maturity. Q4 2025 at 1.8×. Both cohorts originated during Demo Bank\'s peak growth period. Projected Stage 3 migration: 1.6–1.8% vs historical 0.7–0.9%.',
        severity: 0.89,
        metric: '1.7–1.8× default rate',
        metricSub: 'vs prior-year cohorts',
        evidence: { type: 'warning', label: 'Vintage quality alert', value: 'Q3–Q4 2025 underwriting standards appear significantly weaker than prior cohorts' },
        signal: null,
      },
      {
        id: 4, agent: 'Internal Controls', agentColor: '#3A5A3A', agentIcon: '⚙',
        title: 'Override concentration analysis — STF-1847 identified',
        narrative: 'Responding to the orchestrator signal, the Internal Controls Agent analyses override patterns at BR-14. It finds that 87% of all branch overrides are approved by a single staff member — STF-1847. The agent then checks all transactions involving this individual against the Segregation of Duties framework.',
        finding: 'STF-1847: 4 SoD violations, 87% override concentration, 3 loans to borrowers with shared guarantor addresses, 12 off-hours approvals. Branch BR-14 composite score: 41/100. The lowest in the Demo Bank network.',
        severity: 0.94,
        metric: 'BR-14: 41/100',
        metricSub: 'STF-1847: 87% override concentration',
        evidence: { type: 'critical', label: '⚠ Insider pattern confirmed', value: 'Single approver responsible for 87% of overrides + 4 SoD violations + off-hours activity' },
        signal: 'Orchestrator signal → KYC Agent: Verify introducer codes for BR-14 loans. Cross-check borrower addresses and guarantor relationships.',
      },
      {
        id: 5, agent: 'MJE Testing', agentColor: '#0BBF7A', agentIcon: '⊞',
        title: 'MJE scan — 2 journal entries flagged at BR-14',
        narrative: 'The MJE Testing Agent runs its full-population test across all 847 manual journal entries. Two entries at BR-14 match a critical pattern: posted after midnight, round amounts, to sensitive GL accounts (Loans Receivable and CEFT Suspense), with STF-1847 as both maker and checker, and no supporting documents attached.',
        finding: 'MJE-2026-4201 (LKR 185M to SUS-001 at 23:47) and MJE-2026-4205 (LKR 185M to Loans Receivable at 00:03) — both approved by STF-1847. SoD violation + midnight posting + round number + sensitive GL + no documentation = risk score 97/100. These entries are consistent with balance sheet manipulation to conceal the fictitious loans.',
        severity: 0.93,
        metric: 'MJE risk 97/100',
        metricSub: 'SoD + midnight + no docs',
        evidence: { type: 'critical', label: 'MJE manipulation confirmed', value: 'STF-1847 posted LKR 370M in midnight journal entries to sensitive GL accounts with no documentation' },
        signal: 'Orchestrator: MJE evidence links to Credit + Controls signals on BR-14/STF-1847. Balance sheet manipulation confirmed. Elevating to 5-agent correlation.',
      },
      {
        id: 6, agent: 'Orchestrator', agentColor: '#3D3C38', agentIcon: '◎',
        title: 'Cross-agent correlation — CORR-001 severity 0.98',
        narrative: 'The Orchestrator receives signals from five independently operating agents — Credit Intelligence, Internal Controls, KYC, Digital Fraud, and MJE Testing — all converging on Branch BR-14 and staff member STF-1847. The MJE evidence is the final piece: it shows not only that STF-1847 approved anomalous loans, but also manipulated the GL entries to conceal them.',
        finding: 'CORR-001: BR-14/STF-1847 flagged by 5 agents. Combined severity 0.98. Fraud type: Insider-enabled loan fraud with GL manipulation. STF-1847 manufactured or inflated loans, approved via SoD violations, concealed via midnight MJE postings. Case BNK-2025-FR-0847 opened.',
        severity: 0.98,
        metric: 'Severity 0.98 / 1.00',
        metricSub: '5 agents · Case opened',
        evidence: { type: 'critical', label: '🔴 CASE OPENED: BNK-2025-FR-0847', value: '5-agent correlation · STF-1847 suspended · Field audit deployed to BR-14 · LKR 387M frozen' },
        signal: null,
      },
    ],
  },

  ceft: {
    title: 'CEFT Suspense Fraud',
    subtitle: 'A phantom receivable routed through CEFT infrastructure',
    color: '#993C1D',
    totalSeverity: 0.99,
    fraudType: 'Coordinated CEFT Payment Fraud',
    entities: ['SUS-017', 'DEV-A4F7-9921', 'LKR 1.24 Bn'],
    steps: [
      {
        id: 1, agent: 'Suspense & Reconciliation', agentColor: '#993C1D', agentIcon: '⊟',
        title: 'Daily reconciliation — SUS-017 growth anomaly',
        narrative: 'The Suspense Agent runs its daily automated sweep across 143 suspense and clearing accounts. The growth-rate anomaly detector compares each account\'s 30-day balance growth against its clearing ratio. SUS-017 is an extreme outlier on both dimensions simultaneously.',
        finding: 'SUS-017 (Pettah Main Street CEFT Receivables): Balance LKR 1.24 Bn. 30-day growth: +312%. Aging: 94 days. Clearing ratio: 0.08 (benchmark: 0.95). CBSL 90-day guideline breached. Phantom receivable pattern: confirmed.',
        severity: 0.94,
        metric: '+312% in 30 days',
        metricSub: 'Clearing ratio: 0.08',
        evidence: { type: 'critical', label: 'Phantom receivable pattern confirmed', value: 'SUS-017: Growth 312%, clearing 0.08, aged 94 days — regulatory breach' },
        signal: 'Orchestrator signal → Transaction Agent: Analyse all CEFT flows linked to SUS-017 in last 30 days. Flag structuring patterns.',
      },
      {
        id: 2, agent: 'Transaction Surveillance', agentColor: '#2D5A8E', agentIcon: '⟳',
        title: 'Structuring cluster — 15 CEFT transfers in 22 minutes',
        narrative: 'Responding to the orchestrator signal, the Transaction Agent analyses CEFT flows from accounts linked to SUS-017. It finds a textbook structuring cluster: 15 transfers in 22 minutes, each deliberately below the LKR 5M STR threshold, totalling LKR 71.25M.',
        finding: '15 CEFT transfers from BNK-0841-X in 22 minutes. Amounts: LKR 4.6M–4.95M — all below the LKR 5M threshold. Combined: LKR 71.25M. Structuring score: 0.94. STR eligible. Hub-and-spoke routing: 89% to same 3 external accounts.',
        severity: 0.96,
        metric: '15 txns · LKR 71.25M',
        metricSub: 'Structuring score: 0.94',
        evidence: { type: 'critical', label: 'Structuring confirmed — STR required', value: '15 CEFT transfers all below LKR 5M threshold. Combined LKR 71.25M. 22 minutes.' },
        signal: null,
      },
      {
        id: 3, agent: 'Transaction Surveillance', agentColor: '#2D5A8E', agentIcon: '⟳',
        title: "Benford's Law deviation — network-wide structuring",
        narrative: "The Transaction Agent runs a Benford's Law first-digit frequency test across all 284,719 transactions in the analysis window. This reveals whether the SUS-017 pattern is an isolated incident or a network-wide phenomenon.",
        finding: "First digit '4' appears at 18.3% vs 9.7% expected under Benford's Law. Chi-squared p-value: 0.003. This is not an isolated account — systematic structuring below LKR 5M is occurring across multiple accounts. STR queue: 4 accounts. Total STR-eligible volume: LKR 1.44 Bn.",
        severity: 0.97,
        metric: "18.3% vs 9.7%",
        metricSub: "First digit '4' — p=0.003",
        evidence: { type: 'warning', label: "Benford's Law: network-wide anomaly", value: "Systematic structuring confirmed across portfolio — not isolated to SUS-017" },
        signal: 'Orchestrator signal → Digital Agent: Identify device fingerprints associated with SUS-017 counterparty accounts. Check for account sharing.',
      },
      {
        id: 4, agent: 'Digital Fraud & Identity', agentColor: '#993556', agentIcon: '⊕',
        title: 'Device sharing cluster — fraud network identified',
        narrative: 'The Digital Agent analyses session logs for accounts in the SUS-017 counterparty network. It identifies device DEV-A4F7-9921 being used to access four distinct accounts — two of which are confirmed as SUS-017 counterparties. The behavioral score for the initiating session is 28/100.',
        finding: 'Device DEV-A4F7-9921: 4 accounts accessed. 2 accounts are SUS-017 counterparties. Session BNK-0841-X at 23:47: behavioral score 28/100, unregistered device, MFA triggered, MFA failed, session blocked. Off-hours. Pattern: device used to coordinate fund routing.',
        severity: 0.98,
        metric: 'Behavioral score: 28',
        metricSub: 'DEV-A4F7-9921 → 4 accounts',
        evidence: { type: 'critical', label: 'Fraud coordination device identified', value: 'DEV-A4F7-9921 used across 4 accounts — 2 confirmed SUS-017 counterparties' },
        signal: null,
      },
      {
        id: 5, agent: 'KYC / AML', agentColor: '#0F6E56', agentIcon: '✦',
        title: 'FATF-country customer linked to SUS-017 network',
        narrative: 'The KYC Agent cross-references the SUS-017 counterparty accounts against the customer compliance database. It identifies BNK-C-8834-G — a customer from a FATF grey-list country — with no Enhanced Due Diligence on file, and whose account is in the SUS-017 counterparty network.',
        finding: 'BNK-C-8834-G: customer in a FATF grey-listed jurisdiction, EDD overdue 312 days, account linked to SUS-017 network via device DEV-A4F7-9921. STR grounds: FATF exposure + suspicious network + no EDD. Urgency: immediate.',
        severity: 0.99,
        metric: 'EDD overdue 312 days',
        metricSub: 'FATF country · STR required',
        evidence: { type: 'critical', label: 'FATF exposure + suspicious network', value: 'BNK-C-8834-G: high-risk jurisdiction origin, no EDD, linked to SUS-017 fraud network' },
        signal: null,
      },
      {
        id: 6, agent: 'Orchestrator', agentColor: '#3D3C38', agentIcon: '◎',
        title: 'Correlation CORR-002 — severity 0.99',
        narrative: 'The Orchestrator has received signals from four independent agents — all converging on SUS-017 and its counterparty network. The combined severity of 0.99 is the highest of this audit cycle. Account freeze and STR filing are triggered automatically.',
        finding: 'CORR-002: SUS-017 flagged by 4 agents. Combined severity 0.99. Fraud type: CEFT suspense fraud — coordinated external scheme. SUS-017 frozen. STR filed with CBSL FIU. Forensic evidence package generated. Signal → account freeze → STR completed within the same detection run.',
        severity: 0.99,
        metric: 'STR filed',
        metricSub: 'Signal → Freeze → STR',
        evidence: { type: 'critical', label: '🔴 ACCOUNT FROZEN · STR FILED', value: 'SUS-017 network dismantled — signal to freeze to STR in one detection run.' },
        signal: null,
      },
    ],
  },

  insider: {
    title: 'Branch Insider Fraud',
    subtitle: 'Eleven weeks of signals — six agents — one case',
    color: '#3A5A3A',
    totalSeverity: 0.96,
    fraudType: 'Insider-Enabled Loan Fraud — STF-1847',
    entities: ['BR-14 Ratnapura', 'STF-1847', 'LKR 187 Mn'],
    steps: [
      {
        id: 1, agent: 'Internal Controls', agentColor: '#3A5A3A', agentIcon: '⚙',
        title: 'Week 1 — Override rate anomaly at BR-14',
        narrative: 'The Controls Agent flags BR-14 for an override rate of 12.1% — more than double the network average of 4.8%. This is within the amber threshold. A watch flag is set, enhanced monitoring begins, but no immediate action is triggered.',
        finding: 'BR-14 override rate: 12.1%. Network average: 4.8%. Branch placed on elevated monitoring. Insufficient to trigger investigation alone — below the 14% critical threshold.',
        severity: 0.44,
        metric: '12.1% override rate',
        metricSub: 'Watch flag placed',
        evidence: { type: 'stat', label: 'Week 1: BR-14 enters amber monitoring', value: 'Override rate 12.1% — 2.5× network average. Enhanced monitoring begins.' },
        signal: null,
      },
      {
        id: 2, agent: 'Credit Intelligence', agentColor: '#185FA5', agentIcon: '◈',
        title: 'Week 3 — Staging anomalies at BR-14',
        narrative: 'The Credit Agent\'s weekly portfolio scan surfaces three BR-14 loans with outlier scores above 0.85. All three are override-approved. Two share guarantor addresses. An orchestrator signal fires to Internal Controls — the two agents now share a data point.',
        finding: '3 BR-14 loans: scores 0.88, 0.91, 0.94. Exposure: LKR 187 Mn combined. All override-approved. 2 loans share guarantor residential addresses. Signal → Controls Agent.',
        severity: 0.68,
        metric: 'LKR 187 Mn flagged',
        metricSub: 'Shared guarantors',
        evidence: { type: 'warning', label: 'Week 3: Credit + Controls signals overlap', value: '3 anomalous loans at BR-14 — all override-approved — shared guarantors' },
        signal: 'Orchestrator: Credit + Controls signals now share entity BR-14. Correlation building.',
      },
      {
        id: 3, agent: 'Identity & KYC / AML', agentColor: '#0F6E56', agentIcon: '✦',
        title: 'Week 5 — Introducer INT-BR14-007 flagged',
        narrative: 'The KYC Agent processes its monthly gap refresh and identifies that a single introducer at BR-14 — INT-BR14-007 — has KYC gaps on 34% of their 41 introduced accounts. Two of the three anomalous borrowers were introduced by this same individual.',
        finding: 'INT-BR14-007: 14 of 41 accounts have KYC gaps. 2 of 3 anomalous borrowers introduced by this code. Systematic onboarding failure pattern. Cross-link to Credit Agent findings confirmed.',
        severity: 0.74,
        metric: '34% gap rate',
        metricSub: 'INT-BR14-007',
        evidence: { type: 'warning', label: 'Week 5: 3 agents now flagging BR-14', value: 'KYC introducer concentrated: 14/41 accounts with gaps, including 2 anomalous borrowers' },
        signal: 'Orchestrator: 3 independent agents now share BR-14. Combined entity correlation forming.',
      },
      {
        id: 4, agent: 'Internal Controls', agentColor: '#3A5A3A', agentIcon: '⚙',
        title: 'Week 7 — SoD violations confirmed',
        narrative: 'The Controls Agent detects 4 Segregation of Duties violations — the same staff member, STF-1847, both initiating and approving loan disbursements. This is the hard trigger. Override concentration rises to 87%. Branch score drops to 41/100 — critical.',
        finding: 'STF-1847: 4 SoD violations. 87% of all BR-14 overrides. 3 cluster approvals (shared guarantors). 12 off-hours approvals. Branch score: 41/100. First definitive insider indicator confirmed.',
        severity: 0.88,
        metric: '4 SoD violations',
        metricSub: 'STF-1847 · BR-14: 41/100',
        evidence: { type: 'critical', label: 'Week 7: SoD violations — first hard evidence', value: 'STF-1847 initiates AND approves disbursements. 87% override concentration.' },
        signal: 'Orchestrator signal → Digital Agent: Audit STF-1847 system access logs. Look for off-hours activity and document access.',
      },
      {
        id: 5, agent: 'Insider Risk', agentColor: '#4B3F72', agentIcon: '◉',
        title: 'Week 8 — Insider Risk Agent: score 94/100',
        narrative: 'The Insider Risk Agent has been quietly building a 6-dimension risk profile for STF-1847 across the full 14-month access history. By Week 8 it has enough evidence to compute a definitive score. STF-1847 matches all six insider fraud indicators simultaneously — the highest combined score in the Demo Bank network.',
        finding: 'STF-1847 risk score: 94/100 (Critical). All 6 dimensions breached: SoD violations (4), override concentration (87%), same-cluster approvals (3), off-hours approvals (12), approval turnaround 1.4 min (below 2-min threshold), session behavioral deviation. Network average: 18/100.',
        severity: 0.91,
        metric: 'STF-1847: 94/100',
        metricSub: 'All 6 insider dimensions',
        evidence: { type: 'critical', label: 'Week 8: Insider Risk confirms the primary actor', value: 'STF-1847 scores 94/100 — highest in Demo Bank network. All 6 insider fraud dimensions confirmed simultaneously.' },
        signal: 'Orchestrator signal → Digital Agent: Audit STF-1847 system access logs immediately. Insider Risk score now definitive.',
      },
      {
        id: 6, agent: 'Digital Fraud & Identity', agentColor: '#993556', agentIcon: '⊕',
        title: 'Week 9 — Off-hours document download',
        narrative: 'The Digital Agent detects staff account STF-1847 accessing the loan management system at 21:43 on a Saturday — downloading three loan documentation files. No transaction initiated. The behavioral pattern of accessing documents without transacting is consistent with document alteration or data extraction.',
        finding: 'Session SES-BNK-20251210-6612: STF-1847 at 21:43 Saturday. Loan management system access. 3 loan files downloaded — the same 3 anomalous loans. No transaction. Evidence preservation urgency: HIGH.',
        severity: 0.93,
        metric: 'Off-hours access',
        metricSub: '3 loan files downloaded',
        evidence: { type: 'critical', label: 'Week 9: Digital evidence of data manipulation', value: 'STF-1847 accessed loan files off-hours on a Saturday — the 3 flagged loans only' },
        signal: 'Orchestrator: 6 agents now all share BR-14/STF-1847. Combined severity computing.',
      },
      {
        id: 7, agent: 'Credit Intelligence', agentColor: '#185FA5', agentIcon: '◈',
        title: 'Week 10 — Round-trip disbursement confirmed',
        narrative: 'The Credit Agent identifies that all three anomalous BR-14 loans had 87% drawdown within 30 days — anomalous for commercial loans. The Transaction Agent cross-references and finds the disbursed funds returned from the same counterparty network within 7 days. The loans may be fictitious.',
        finding: 'LKR 187 Mn disbursed. Drawdown rate: 87% within 30 days. Round-trip pattern: outbound matches inbound from same counterparty within 7 days. Loans likely fictitious — funds recycled.',
        severity: 0.95,
        metric: 'Round-trip confirmed',
        metricSub: 'LKR 187 Mn recycled',
        evidence: { type: 'critical', label: 'Week 10: Fictitious loans confirmed', value: 'LKR 187 Mn disbursed and returned in 7 days — loans appear to be fabricated' },
        signal: null,
      },
      {
        id: 8, agent: 'Orchestrator', agentColor: '#3D3C38', agentIcon: '◎',
        title: 'Week 11 — All six signals correlated',
        narrative: 'The Orchestrator has accumulated signals from six independently operating agents over 11 weeks — each insufficient alone, but together definitive. It computes the combined severity and elevates this to a case-worthy correlation.',
        finding: 'CORR-001: BR-14/STF-1847 flagged by 6 agents over 11 weeks. Combined severity: 0.96. Fraud type: insider-enabled loan fraud — fictitious loans, override abuse, document manipulation, fund recycling. Case BNK-2025-FR-0847 opened. Emergency response triggered.',
        severity: 0.96,
        metric: 'Severity 0.96 / 1.00',
        metricSub: '6 agents · 11 weeks',
        evidence: { type: 'critical', label: '🔴 CASE BNK-2025-FR-0847 OPENED', value: '6-agent correlation · STF-1847 suspended · Field audit deployed to BR-14' },
        signal: null,
      },
    ],
  },

  // ─── TBML — BNK-CORP-0887 ──────────────────────────────────────────────
  // Trade-based money laundering via over-invoicing, duplicate LCs, and a
  // previously undisclosed connected group. Four agents converge.
  tbml: {
    title: 'Trade-Based Money Laundering — BNK-CORP-0887',
    subtitle: 'Over-invoicing + duplicate LCs + undisclosed connected group',
    color: '#2E7D32',
    totalSeverity: 0.95,
    fraudType: 'Trade-Based Money Laundering (TBML)',
    entities: ['BNK-CORP-0887', 'Duplicate LC cluster', 'Connected group of 4 entities'],
    steps: [
      {
        id: 1, agent: 'Trade Finance & Treasury', agentColor: '#2E7D32', agentIcon: '◎',
        title: 'HS-code price benchmarking — 14 LCs flagged',
        narrative: 'The Trade Finance & Treasury Agent compares every letter-of-credit invoice price against UN COMTRADE and Sri Lanka Customs medians for the same HS code, origin, and destination. Deviations beyond the configured tolerance are classified as potential over- or under-invoicing — the single most common TBML typology per FATF guidance.',
        finding: '14 LCs executed for BNK-CORP-0887 in the last 90 days show invoice prices 32–71% above the HS-code median. Aggregate over-invoicing value: LKR 612 Mn. Counterparties cluster on 3 trading companies registered in the same offshore jurisdiction.',
        severity: 0.74,
        metric: '14 LCs flagged',
        metricSub: 'LKR 612 Mn over-invoicing',
        evidence: { type: 'warning', label: 'Invoice deviation cluster detected', value: 'Prices 32–71% above customs/COMTRADE median — consistent with value transfer via over-invoicing' },
        signal: 'Orchestrator signal → Transaction Surveillance: profile BNK-CORP-0887 outflow velocity for layering behaviour.',
      },
      {
        id: 2, agent: 'Trade Finance & Treasury', agentColor: '#2E7D32', agentIcon: '◎',
        title: 'Duplicate LC detection — overlapping shipment windows',
        narrative: 'The agent scans for LCs issued on the same underlying shipment — same bill of lading, same vessel, same port-pair and dates — within the duplicate-LC overlap tolerance. Duplicate LC is a classic TBML move: the same goods finance two separate hard-currency flows.',
        finding: '3 LC pairs with shipment-window overlap of 4–11 days. Same vessel name, same container IDs, same bill-of-lading numbers. Duplicate value financed: LKR 218 Mn. Both LCs settled in full — proceeds drawn down within 48 hours of each discharge.',
        severity: 0.86,
        metric: '3 duplicate LC pairs',
        metricSub: 'LKR 218 Mn double-financed',
        evidence: { type: 'critical', label: 'Duplicate LC confirmed', value: 'Same bill-of-lading referenced on two LCs settled days apart — FATF TBML red-flag #3' },
        signal: null,
      },
      {
        id: 3, agent: 'Transaction Surveillance', agentColor: '#2D5A8E', agentIcon: '⟳',
        title: 'Structuring + velocity pattern downstream of LC settlement',
        narrative: 'Triggered by the orchestrator signal, Transaction Surveillance profiles every outflow from BNK-CORP-0887 for 48 hours post-settlement. It applies structuring detection (clusters of sub-threshold payments) and compares velocity against the account\'s 90-day baseline.',
        finding: 'Post-settlement outflow velocity 6.8× the 90-day baseline. 41 outbound payments of LKR 4.6–4.9 Mn each to 12 distinct counterparties within 36 hours — all sitting just below the LKR 5 Mn STR threshold. Benford deviation p-value 0.004. Structuring score 0.79.',
        severity: 0.88,
        metric: 'Structuring score 0.79',
        metricSub: '41 payments below STR threshold',
        evidence: { type: 'critical', label: 'Layering behaviour confirmed', value: 'Velocity 6.8× baseline + 41 sub-threshold payments + Benford p=0.004 = classic layering fingerprint' },
        signal: 'Orchestrator signal → Connected Party Agent: resolve the 12 downstream counterparties against BNK-CORP-0887 ownership graph.',
      },
      {
        id: 4, agent: 'Connected Party', agentColor: '#BE123C', agentIcon: '⬡',
        title: 'Beneficial ownership resolution — undisclosed connected group',
        narrative: 'The Connected Party Agent walks the directorship and beneficial-ownership graph. It applies the CBSL shared-director trigger and beneficial-owner match rules to detect undisclosed related-party exposure.',
        finding: '4 of the 12 downstream counterparties share directors with BNK-CORP-0887 or its immediate parent. None are declared as related parties in Demo Bank\'s large-exposure return. Aggregate undisclosed related-party exposure: LKR 1.47 Bn — equivalent to 6.8% of capital base. CBSL Single-Obligor limit breach is imminent if disclosed exposures are added.',
        severity: 0.92,
        metric: 'LKR 1.47 Bn undisclosed',
        metricSub: '6.8% of capital base',
        evidence: { type: 'critical', label: 'Related-party concealment', value: '4 counterparties share directors with the customer — none declared in the CBSL large-exposure return' },
        signal: 'Orchestrator signal → KYC Agent: re-verify beneficial ownership disclosures on BNK-CORP-0887 and its connected group.',
      },
      {
        id: 5, agent: 'Identity & KYC / AML', agentColor: '#0F6E56', agentIcon: '✦',
        title: 'CDD recheck — PEP exposure and beneficial-owner gaps',
        narrative: 'The KYC Agent rechecks the customer file against the current 47-rule CDD engine, including PEP cross-reference, BO completeness, and FATF jurisdiction exposure.',
        finding: '2 of the 4 connected counterparties have a director listed as a PEP in a FATF grey-listed jurisdiction. Enhanced Due Diligence for both was last refreshed 412 and 498 days ago — well past the 365-day staleness threshold. Beneficial ownership disclosure incomplete on 3 entities.',
        severity: 0.90,
        metric: '2 PEPs · BO gaps × 3',
        metricSub: 'EDD stale by 47–133 days',
        evidence: { type: 'alert', label: 'Material KYC breach', value: 'Stale PEP EDD + incomplete BO disclosure on connected group — CBSL KYC Direction violation' },
        signal: 'Orchestrator: enough independent signals to open a case.',
      },
      {
        id: 6, agent: 'Orchestrator', agentColor: '#111110', agentIcon: '◎',
        title: 'Cross-agent correlation — TBML fraud pattern confirmed',
        narrative: 'Four agents — Trade, Transaction, Connected Party, and KYC — converge on the same customer, the same connected group, and the same fund flow. Combined severity crosses the case-worthy threshold.',
        finding: 'CORR-TBML-0887: BNK-CORP-0887 + 4 connected entities flagged by 4 agents. Combined severity 0.95. Fraud type: Trade-based money laundering via over-invoicing + duplicate LCs + undisclosed related-party layering. Case BNK-2026-TBML-0087 opened. STR filed with CBSL FIU. Further LC facilities suspended pending enhanced review.',
        severity: 0.95,
        metric: 'Severity 0.95 / 1.00',
        metricSub: '4 agents · STR filed',
        evidence: { type: 'critical', label: '🔴 CASE OPENED: BNK-2026-TBML-0087', value: 'STR filed with CBSL FIU within 48 h · LC line suspended · EDD programme re-initiated · LKR 830 Mn frozen' },
        signal: null,
      },
    ],
  },

  // ─── SINGLE-OBLIGOR LIMIT BREACH ──────────────────────────────────────
  // CBSL single-obligor limit monitoring detects connected-group exposure
  // that, once aggregated, breaches the 25% of capital-base limit.
  sobl: {
    title: 'Single-Obligor Limit Breach',
    subtitle: 'Connected-group aggregation reveals a CBSL Large Exposure breach',
    color: '#BE123C',
    totalSeverity: 0.93,
    fraudType: 'CBSL Large Exposure Breach · Undisclosed Related Parties',
    entities: ['Connected group CG-024', '5 borrowers', '26.4% of capital base'],
    steps: [
      {
        id: 1, agent: 'Connected Party', agentColor: '#BE123C', agentIcon: '⬡',
        title: 'Shared-director scan across the loan book',
        narrative: 'The Connected Party Agent walks the corporate registry graph for every legal-entity borrower. Where two or more borrowers share directors above the configured shared-director trigger, they are provisionally grouped — the first step in detecting concealed concentration.',
        finding: '5 corporate borrowers share 2+ directors. Registry analysis reveals 3 additional directors common across the group via their immediate parents. All 5 were on-boarded in separate months across 2023–2025 with no connected-party disclosure.',
        severity: 0.68,
        metric: '5 borrowers clustered',
        metricSub: 'CG-024 formed',
        evidence: { type: 'alert', label: 'Connected group provisionally identified', value: '5 borrowers + 2 parents share a directorial core of 6 individuals — not declared as connected' },
        signal: null,
      },
      {
        id: 2, agent: 'Connected Party', agentColor: '#BE123C', agentIcon: '⬡',
        title: 'Aggregate exposure calculation — CBSL single-obligor breach',
        narrative: 'The agent aggregates total funded + unfunded exposure across the provisional group. This is compared against the CBSL single-obligor limit (25% of the bank\'s capital base) per the Large Exposures Direction.',
        finding: 'Aggregate group exposure: LKR 8.91 Bn (funded LKR 6.20 Bn + unfunded LKR 2.71 Bn). Demo Bank capital base: LKR 33.75 Bn. Group exposure / capital base = 26.4% — exceeding the 25% single-obligor limit by 140 bps. Breach of CBSL Large Exposures Direction.',
        severity: 0.90,
        metric: '26.4% of capital',
        metricSub: 'Limit: 25% · Breach +140 bps',
        evidence: { type: 'critical', label: 'CBSL Large Exposures Direction breached', value: 'Aggregate group exposure 26.4% vs 25% limit — immediate CBSL notification required' },
        signal: 'Orchestrator signal → Credit Intelligence: profile the credit quality and collateral position of every loan in CG-024.',
      },
      {
        id: 3, agent: 'Credit Intelligence', agentColor: '#185FA5', agentIcon: '◈',
        title: 'Credit quality + collateral integrity across the group',
        narrative: 'Credit Intelligence runs its deterministic SLFRS 9 + robust-z outlier test against the 5 group borrowers, and Collateral Integrity verifies LTV, valuation dates, and any double-pledge issues across their combined security pool.',
        finding: '2 of 5 borrowers carry outlier scores above 0.78 — concentration in a single sector, collateral ratio below 0.55, 1 restructure in the last 12 months. Collateral pool includes 2 properties with valuations older than 400 days (stale-valuation breach) and 1 property pledged to two separate loans within the group (double-pledge).',
        severity: 0.86,
        metric: '2 stale valuations · 1 double-pledge',
        metricSub: 'Group outlier score 0.78 avg',
        evidence: { type: 'warning', label: 'Collateral integrity compromised', value: 'LTV deterioration + stale valuations + double-pledge reduce effective security by ~28%' },
        signal: null,
      },
      {
        id: 4, agent: 'Balance Sheet Drivers', agentColor: '#0EA5E9', agentIcon: '↔',
        title: 'CAR impact projection — capital headroom erosion',
        narrative: 'Balance Sheet Drivers projects the CAR impact of marking the excess exposure (1.4% of capital base) to the required higher risk-weight under CBSL direction, plus the ECL uplift required once misstaging on the 2 anomalous loans is corrected.',
        finding: 'Projected CAR impact: −87 bps over the next two quarters (−52 bps from RWA uplift on the connected group, −35 bps from ECL restatement on the 2 misstaged loans). Total CAR would move from 15.2% to 14.3% — inside the CBSL amber band and dangerously close to the 14.0% regulatory minimum.',
        severity: 0.88,
        metric: 'CAR −87 bps',
        metricSub: '15.2% → 14.3%',
        evidence: { type: 'critical', label: 'CAR headroom at risk', value: 'Projected CAR 14.3% vs 14.0% minimum — 30 bps buffer only after correction' },
        signal: 'Orchestrator signal → Capital & Liquidity: evaluate ALCO actions and forced disclosure path.',
      },
      {
        id: 5, agent: 'Capital & Liquidity', agentColor: '#1D4ED8', agentIcon: '⌖',
        title: 'ALCO actions generated — notification, remediation, disclosure',
        narrative: 'Given the imminent CAR breach and the confirmed large-exposure violation, the Capital & Liquidity Agent assembles ALCO actions: mandatory CBSL notification, exposure remediation path, ICAAP update, and Board Audit Committee escalation.',
        finding: 'ALCO action list: (a) Notify CBSL within 24 h under Large Exposures Direction §4.2, (b) Cap new facilities to the group at zero pending remediation, (c) Refresh connected-party disclosures in the large-exposure return, (d) Add the breach to the next ICAAP cycle, (e) Escalate to Board Audit Committee at its next meeting.',
        severity: 0.90,
        metric: '5 ALCO actions',
        metricSub: '24 h CBSL notification',
        evidence: { type: 'critical', label: 'Escalation path confirmed', value: 'CBSL notification within 24 h, BAC within 7 days, Large Exposures return refresh within 30 days' },
        signal: 'Orchestrator: correlation strong enough to open a case now.',
      },
      {
        id: 6, agent: 'Orchestrator', agentColor: '#111110', agentIcon: '◎',
        title: 'Case opened — CBSL Large Exposure breach',
        narrative: 'Four agents — Connected Party, Credit Intelligence, Balance Sheet Drivers, and Capital & Liquidity — converge on the same group with the same root cause and mutually reinforcing evidence. Combined severity crosses the case-worthy threshold.',
        finding: 'CORR-SOBL-024: CG-024 flagged by 4 agents. Combined severity 0.93. Breach type: CBSL Single-Obligor Limit exceeded via undisclosed connected-party exposure. Case BNK-2026-SOBL-024 opened. CBSL notification drafted. Remediation plan with 90-day target. Large Exposures return refresh scheduled.',
        severity: 0.93,
        metric: 'Severity 0.93 / 1.00',
        metricSub: '4 agents · CBSL notified',
        evidence: { type: 'critical', label: '🔴 CASE OPENED: BNK-2026-SOBL-024', value: 'CBSL notification issued · New facilities to CG-024 frozen · ICAAP update triggered · 90-day remediation plan agreed' },
        signal: null,
      },
    ],
  },
};

// ─── SEVERITY METER ───────────────────────────────────────────────────────────
function SeverityMeter({ value, color, size = 120 }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(value, 1);
  const pct = Math.round(value * 100);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={value >= 0.9 ? '#C41E3A' : value >= 0.7 ? '#26EA9F' : color}
        strokeWidth={10} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.3s' }} />
      <text x={size/2} y={size/2 + 6} textAnchor="middle" fill="var(--color-text)" fontSize={size < 100 ? 14 : 18}
        fontWeight={700} style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── EVIDENCE CARD ────────────────────────────────────────────────────────────
function EvidenceCard({ ev, agentColor, agentIcon, agentName, stepNum }) {
  const bg = ev.type === 'critical' ? 'var(--color-red-light)' : ev.type === 'warning' ? '#E8FDF4' : ev.type === 'alert' ? '#E6F1FB' : 'var(--color-surface-2)';
  const tc = ev.type === 'critical' ? 'var(--color-red)' : ev.type === 'warning' ? '#3A5A3A' : ev.type === 'alert' ? 'var(--color-blue)' : 'var(--color-text-2)';
  return (
    <div className="animate-fade-in" style={{ padding: '10px 14px', background: bg, border: `1px solid ${tc}22`, borderRadius: 8, borderLeft: `3px solid ${tc}` }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{agentIcon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: agentColor, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>{agentName}</span>
        <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>Step {stepNum}</span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: tc, marginBottom: 3 }}>{ev.label}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{ev.value}</div>
    </div>
  );
}

// ─── BUSINESS ID → LEGACY SCENARIO ID MAP ───────────────────────────────────
// The Business Platform's ScenarioLab uses domain-oriented IDs. Map them to
// the legacy step-scripted SCENARIOS keys so we can reuse the existing play-through.
const BIZ_ID_MAP = {
  'insider-fraud-br14':        'growth',
  'phantom-receivable-sus017': 'ceft',
  'tbml-corp-0887':            'tbml',
  'single-obligor-breach':     'sobl',
  // wealth-mis-selling, alm-gap-breach and vendor-concentration have no scripted
  // walk-through yet. They are intentionally absent: the Scenario Lab routes them
  // to their live domain rather than to an unrelated fraud script. Add a key here
  // (and a matching SCENARIOS entry) only when a grounded walk-through is authored.
};

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function BusinessScenarioPlayer() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(-1);      // -1 = not started
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(2500);
  const evidenceRef = useRef(null);
  const timerRef = useRef(null);

  const legacyId = BIZ_ID_MAP[scenarioId] || scenarioId;
  const scenario = SCENARIOS[legacyId];
  if (!scenario) return <Navigate to="/business-view/scenarios" replace />;
  const { steps, color } = scenario;

  // Auto-advance
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (running && step < steps.length - 1) {
      timerRef.current = setTimeout(() => setStep(s => s + 1), speed);
    } else if (step >= steps.length - 1) {
      setRunning(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [running, step, speed]);

  // Scroll evidence panel
  useEffect(() => {
    if (evidenceRef.current) {
      evidenceRef.current.scrollTo({ top: evidenceRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [step]);

  const activeStep = step >= 0 ? steps[step] : null;
  const completedSteps = step >= 0 ? steps.slice(0, step + 1) : [];
  const currentSeverity = activeStep?.severity || 0;

  function start() {
    if (step >= steps.length - 1) { setStep(-1); setTimeout(() => { setStep(0); setRunning(true); }, 100); }
    else { setRunning(true); if (step === -1) setStep(0); }
  }
  function pause() { setRunning(false); clearTimeout(timerRef.current); }
  function reset() { setRunning(false); setStep(-1); clearTimeout(timerRef.current); }

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/business-view/scenarios')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronLeft size={14} /> All Scenarios
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{scenario.title}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{scenario.subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <label style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Speed</label>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ fontSize: 12, padding: '4px 8px', width: 120 }}>
            <option value={4000}>Slow (4s)</option>
            <option value={2500}>Normal (2.5s)</option>
            <option value={1200}>Fast (1.2s)</option>
            <option value={600}>Very fast</option>
          </select>
          <button onClick={reset} disabled={step === -1} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <RotateCcw size={13} /> Reset
          </button>
          <button
            onClick={running ? pause : start}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', color: 'white', background: running ? '#3A5A3A' : color, display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s', boxShadow: `0 4px 12px ${color}44` }}
          >
            {running ? <><Pause size={15} />Pause</> : step >= steps.length - 1 ? <><RotateCcw size={15} />Replay</> : step === -1 ? <><Play size={15} />Start Scenario</> : <><Play size={15} />Continue</>}
          </button>
        </div>
      </div>

      {/* ── Entities bar ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Entities under investigation:</span>
        {scenario.entities.map((e, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', background: `${color}14`, color, border: `1px solid ${color}33`, borderRadius: 20 }}>{e}</span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-2)' }}>Fraud type: <strong>{scenario.fraudType}</strong></span>
      </div>

      {/* ── Three-panel main layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 300px', gap: 16, minHeight: 540 }}>

        {/* LEFT — Step timeline */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Detection Steps</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>{steps.length} total · {Math.max(0, step + 1)} completed</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {steps.map((s, i) => {
              const isDone = i < step;
              const isActive = i === step;
              const isPending = i > step;
              return (
                <div key={i} onClick={() => setStep(i)} style={{ padding: '11px 14px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', background: isActive ? `${s.agentColor}0C` : 'transparent', borderLeft: `3px solid ${isActive ? s.agentColor : isDone ? s.agentColor + '66' : 'transparent'}`, transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: isDone ? s.agentColor : isActive ? s.agentColor : 'var(--color-surface-2)', color: isDone || isActive ? 'white' : 'var(--color-text-3)', marginTop: 1 }}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isActive ? s.agentColor : isDone ? 'var(--color-text-2)' : 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.agentIcon} {s.agent.split(' ')[0]}
                      </div>
                      <div style={{ fontSize: 11, color: isActive ? 'var(--color-text)' : isPending ? 'var(--color-text-3)' : 'var(--color-text-2)', lineHeight: 1.4, fontWeight: isActive ? 600 : 400 }}>
                        {s.title.length > 45 ? s.title.substring(0, 45) + '…' : s.title}
                      </div>
                      {(isDone || isActive) && s.metric && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: s.agentColor, marginTop: 3 }}>{s.metric}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-3)', marginBottom: 5 }}>
              <span>Progress</span><span>{Math.round(Math.max(0, step + 1) / steps.length * 100)}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${Math.max(0, step + 1) / steps.length * 100}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>

        {/* CENTER — Active step focus */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!activeStep ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 20, opacity: 0.15 }}>◎</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Ready to begin</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', maxWidth: 360, lineHeight: 1.7, marginBottom: 28 }}>
                This scenario plays through {steps.length} detection steps — showing exactly what each agent finds, how it scores the risk, and how signals combine into a case.
              </div>
              <button onClick={start} style={{ padding: '12px 32px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: 'white', background: color, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 6px 20px ${color}44` }}>
                <Play size={18} /> Start Scenario
              </button>
            </div>
          ) : (
            <div key={step} className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Agent header */}
              <div style={{ padding: '18px 22px', background: 'var(--color-surface)', border: `1px solid var(--color-border)`, borderRadius: 12, borderLeft: `5px solid ${activeStep.agentColor}` }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: `${activeStep.agentColor}15`, border: `1px solid ${activeStep.agentColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: activeStep.agentColor, flexShrink: 0 }}>
                    {activeStep.agentIcon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: activeStep.agentColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{activeStep.agent}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Step {step + 1} of {steps.length}</span>
                      {running && <span style={{ width: 7, height: 7, borderRadius: '50%', background: activeStep.agentColor, display: 'inline-block', animation: 'pulse 1s ease-in-out infinite' }} />}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{activeStep.title}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.75, padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
                  {activeStep.narrative}
                </div>
              </div>

              {/* Finding box */}
              <div style={{ padding: '16px 20px', background: activeStep.severity >= 0.9 ? 'var(--color-red-light)' : activeStep.severity >= 0.7 ? '#FFF8F0' : 'var(--color-surface)', border: `1px solid ${activeStep.severity >= 0.9 ? 'rgba(163,45,45,0.25)' : 'var(--color-border)'}`, borderRadius: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: activeStep.severity >= 0.9 ? 'var(--color-red)' : activeStep.severity >= 0.7 ? '#3A5A3A' : 'var(--color-text-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {activeStep.severity >= 0.9 ? <AlertTriangle size={13} /> : <CheckCircle size={13} />}
                  {activeStep.severity >= 0.9 ? 'Critical Finding' : activeStep.severity >= 0.7 ? 'High Severity Finding' : 'Finding'}
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.75, marginBottom: 14 }}>{activeStep.finding}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ padding: '8px 14px', background: `${activeStep.agentColor}12`, borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: activeStep.agentColor }}>{activeStep.metric}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2, display: 'inline-flex', alignItems: 'center' }}>
                      {activeStep.metricSub}
                      <InfoHint
                        title="Headline figure"
                        text="The single number this step turns on, with its qualifying detail below — pulled straight from the deterministic finding (a count, rate, ratio or amount the engine computed over the source records). It drives this step's severity; nothing is estimated by a model."
                        size={10}
                        align="center"
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '8px 14px', background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                      Severity score
                      <InfoHint
                        title="Severity score"
                        text="This step's severity on a 0–1 scale — a transparent composite of the deterministic statistics in the finding (e.g. threshold breaches, rates, ratios), not an opaque ML output. Above 0.7 is high, above 0.9 is critical."
                        size={10}
                      />
                    </div>
                    <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${activeStep.severity * 100}%`, background: activeStep.severity >= 0.9 ? '#C41E3A' : activeStep.severity >= 0.7 ? '#26EA9F' : activeStep.agentColor, borderRadius: 4, transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: activeStep.severity >= 0.9 ? 'var(--color-red)' : 'var(--color-text)', marginTop: 4 }}>{activeStep.severity.toFixed(2)} / 1.00</div>
                  </div>
                </div>
              </div>

              {/* Signal output */}
              {activeStep.signal && (
                <div style={{ padding: '12px 16px', background: '#F0F0EE', border: '1px solid rgba(83,74,183,0.2)', borderRadius: 8, fontSize: 12, color: '#3D3C38', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>◎</span>
                  <span><strong>Orchestrator:</strong> {activeStep.signal}</span>
                </div>
              )}

              {/* Nav controls */}
              {step >= steps.length - 1 && (() => {
                const caseMap = { growth: 'CASE-001', ceft: 'CASE-002', insider: 'CASE-001', tbml: 'CASE-003' };
                const caseId = caseMap[legacyId];
                return (
                  <div style={{ padding:'12px 14px', background:'linear-gradient(135deg,#1a1917,#252420)', border:'1px solid rgba(239,159,39,0.4)', borderRadius:10, marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#26EA9F', marginBottom:4 }}>This investigation is live in Sentinel</div>
                    <div style={{ fontSize:11, color:'rgba(244,242,236,0.65)', lineHeight:1.6 }}>
                      {caseId}: {caseId==='CASE-001' ? 'BR-14 insider fraud — STF-1847 suspended, field audit deployed, LKR 387M frozen.' : 'SUS-017 CEFT phantom — account frozen, STR filed with FIU-STR-2025-1847.'}<br/>
                      Evidence, remediation steps and regulatory status are tracked in the Case Manager.
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step <= 0}>← Previous</button>
                {step < steps.length - 1
                  ? <button onClick={() => setStep(s => s + 1)} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: color, color: 'white', border: 'none' }}>Next step →</button>
                  : <>
                      <button onClick={() => navigate('/business-view/cases')} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: color, color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                        <CheckCircle size={15} /> View Live Case →
                      </button>
                    </>
                }
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Severity + Evidence accumulator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Severity meter */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Combined Severity
              <InfoTooltip text="The Orchestrator combines individual agent scores using: max(scores) + 0.15 per additional confirming agent. A combined score above 0.95 triggers automatic case opening and management escalation. Multi-agent confirmation is statistically far stronger than any single-agent finding." position="bottom" width={280} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <SeverityMeter value={currentSeverity} color={color} size={110} />
            </div>
            <div style={{ fontSize: 12, color: currentSeverity >= 0.9 ? 'var(--color-red)' : currentSeverity >= 0.7 ? '#3A5A3A' : 'var(--color-text-2)', fontWeight: 600, marginBottom: 6 }}>
              {currentSeverity >= 0.9 ? '🔴 Critical — immediate action' : currentSeverity >= 0.7 ? '🟡 High — escalation required' : currentSeverity > 0 ? '🟢 Monitoring' : 'Not started'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              Final: {(scenario.totalSeverity * 100).toFixed(0)}% · {steps.length} steps
            </div>
          </div>

          {/* Agent signal matrix */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-2)', marginBottom: 10, display: 'flex', alignItems: 'center' }}>
              Agent Signals
              <InfoHint
                title="Agent signals"
                text="One row per agent in this scenario. A lit dot means that agent has contributed a signal in the steps completed so far; an unlit dot means it hasn't fired yet. Watching them light up shows how independent agents converge on the same case."
                size={10}
                align="left"
              />
            </div>
            {[...new Map(steps.map(s => [s.agent, s])).values()].map((s, i) => {
              const contributed = completedSteps.some(cs => cs.agent === s.agent);
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, width: 18, textAlign: 'center' }}>{s.agentIcon}</span>
                  <div style={{ flex: 1, fontSize: 11, color: contributed ? 'var(--color-text)' : 'var(--color-text-3)', fontWeight: contributed ? 500 : 400 }}>
                    {s.agent.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: contributed ? s.agentColor : 'var(--color-border)', transition: 'background 0.3s', ...(contributed ? { boxShadow: `0 0 6px ${s.agentColor}` } : {}) }} />
                </div>
              );
            })}
          </div>

          {/* Evidence accumulator */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-2)', flex: 1, display: 'inline-flex', alignItems: 'center' }}>
                Evidence Log
                <InfoHint
                  title="Evidence log"
                  text="The append-only record of what each agent found, in the order steps complete — one entry per step. It is the auditable trail behind the combined severity, so every figure in the case can be traced back to the agent and finding that produced it."
                  size={10}
                />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: completedSteps.length > 0 ? color : 'var(--color-border)', color: completedSteps.length > 0 ? 'white' : 'var(--color-text-3)' }}>
                {completedSteps.length}
              </span>
            </div>
            <div ref={evidenceRef} style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {completedSteps.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <div style={{ textAlign: 'center', color: 'var(--color-text-3)', fontSize: 12 }}>
                    <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>📋</div>
                    Evidence will accumulate as steps complete
                  </div>
                </div>
              ) : (
                completedSteps.map((s, i) => (
                  <EvidenceCard key={i} ev={s.evidence} agentColor={s.agentColor} agentIcon={s.agentIcon} agentName={s.agent} stepNum={i + 1} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
