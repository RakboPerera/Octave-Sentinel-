// Sentinel by Octave — Pre-built Demo Bank demo data
// All figures grounded in Demo Bank Annual Report FY2025
// Total assets: LKR 700.3 Bn | Loans: LKR 430.4 Bn | Stage 3: 3.50% (NPL)
// LCR: 203.4% | NSFR: 138.3% | 90 branches | 835,944 customers
// Note: Stage 3 ratio aligned to Demo Bank's published ~3-5% NPL range. Earlier
// versions of this demo used 0.91% which matched the unadjusted SLFRS 9
// classification before the 34 misstaged loans were considered.

export const demoData = {

  // ─── CREDIT INTELLIGENCE AGENT ───────────────────────────────────────────
  credit: {
    portfolio_summary: {
      // Universe note: Demo Bank's published loan book for FY2025 is ~LKR 430 Bn. The
      // `total_loans_analyzed` below is the stratified sample used by this demo
      // run (construction/agri/SME/hospitality high-risk cohorts, FY2025 vintages).
      // Full-book analysis would analyse ~380,000 loans.
      analysis_universe: 'Demo Bank FY2025 stratified high-risk cohort',
      total_loans_analyzed: 16631,
      total_loans_full_book: 380000,
      total_exposure_lkr: 43040000000,
      total_exposure_full_book_lkr: 430400000000,
      flagged_count: 89,
      flagged_loans_shown: 12,
      flagged_loans_selection: 'Top 12 by anomaly score (all critical + high); full list exportable via Reports',
      flagged_exposure_lkr: 1410000000,
      critical_count: 12,
      avg_anomaly_score: 0.71,
      misstaged_count: 34,
      misstaged_exposure_lkr: 1100000000,
    },
    flagged_loans: [
      { loan_id: 'BNK-CR-2025-0441', branch_code: 'BR-14', exposure_lkr: 287000000, assigned_stage: 1, predicted_stage: 3, anomaly_score: 0.94, primary_driver: 'LTV 94% — 2.8σ above Stage 1 peers', secondary_driver: 'Restructure count 2 — top 4% of portfolio', explanation: 'Construction sector loan with collateral ratio 0.38 and two prior restructurings. DPD trending upward at 67 days. Feature combination is statistically rare for Stage 1 classification.', recommended_action: 'Immediate reclassification to Stage 3. Initiate enhanced monitoring and collateral valuation review.', override_flag: true },
      { loan_id: 'BNK-CR-2025-0872', branch_code: 'BR-14', exposure_lkr: 144000000, assigned_stage: 2, predicted_stage: 3, anomaly_score: 0.91, primary_driver: 'DPD 88 days — threshold breach imminent', secondary_driver: 'Agriculture sector NPL 2.8% — off-harvest period', explanation: 'Agriculture financing showing 88 days past due during off-harvest season. Collateral is crop inventory with seasonal valuation decline. Provision cover insufficient at current Stage 2 classification.', recommended_action: 'Reclassify to Stage 3 immediately. Initiate agricultural collateral revaluation.', override_flag: false },
      { loan_id: 'BNK-CR-2025-1203', branch_code: 'BR-14', exposure_lkr: 198000000, assigned_stage: 1, predicted_stage: 2, anomaly_score: 0.87, primary_driver: 'Sector risk — Construction NPL 3.2%', secondary_driver: 'LTV 81% — above Stage 1 threshold', explanation: 'Real estate development loan in construction sector. LTV elevated following market cooling. No DPD but sector deterioration flags significant increase in credit risk warranting Stage 2 reclassification.', recommended_action: 'Reclassify to Stage 2. Commission independent property valuation. Enhanced monitoring quarterly.', override_flag: true },
      { loan_id: 'BNK-CR-2025-0334', branch_code: 'BR-23', exposure_lkr: 76000000, assigned_stage: 1, predicted_stage: 2, anomaly_score: 0.84, primary_driver: 'Exposure size 3.1σ above sector cohort median', secondary_driver: 'Override-approved — no collateral document on file', explanation: 'SME manufacturing loan significantly above peers in the same sector and risk rating cohort. Approved via override with incomplete collateral documentation. Anomalous feature combination for Stage 1.', recommended_action: 'Obtain missing collateral documentation. Reclassify to Stage 2 pending review. Escalate override to Branch Audit.', override_flag: true },
      { loan_id: 'BNK-CR-2025-1567', branch_code: 'BR-14', exposure_lkr: 112000000, assigned_stage: 2, predicted_stage: 3, anomaly_score: 0.89, primary_driver: 'Restructure count 2 within 18 months', secondary_driver: 'Collateral ratio 0.41 — below Stage 2 floor', explanation: 'Hospitality sector borrower with two restructuring events in 18 months and collateral ratio at the borderline of Stage 3 criteria. Combined feature set predicts Stage 3 with 89% confidence.', recommended_action: 'Reclassify to Stage 3. Initiate recovery proceedings review. Provision to 66.7% minimum.', override_flag: false },
      { loan_id: 'BNK-CR-2025-0918', branch_code: 'BR-56', exposure_lkr: 93000000, assigned_stage: 1, predicted_stage: 2, anomaly_score: 0.82, primary_driver: 'Customer risk rating 4 — inconsistent with Stage 1', secondary_driver: 'DPD 29 days — at threshold boundary', explanation: 'Corporate borrower with internal risk rating 4 (elevated) classified at Stage 1 with DPD at 29 days. Risk rating and DPD proximity to threshold create anomalous feature combination requiring stage review.', recommended_action: 'Monitor daily. Trigger Stage 2 reclassification if DPD reaches 30 days. Review risk rating basis.', override_flag: false },
      { loan_id: 'BNK-CR-2025-2041', branch_code: 'BR-23', exposure_lkr: 67000000, assigned_stage: 1, predicted_stage: 2, anomaly_score: 0.79, primary_driver: 'Branch BR-14 override concentration pattern', secondary_driver: 'Guarantors share residential address', explanation: 'Loan approved at Ratnapura branch (BR-14) where override rate is 14.3% — highest in network. Guarantors for this facility share a residential address with guarantors on two other flagged loans at the same branch.', recommended_action: 'Escalate to Internal Audit for review of BR-14 override patterns. Verify guarantor independence.', override_flag: true },
      { loan_id: 'BNK-CR-2025-1788', branch_code: 'BR-14', exposure_lkr: 55000000, assigned_stage: 2, predicted_stage: 3, anomaly_score: 0.88, primary_driver: 'DPD 91 days — Stage 3 threshold exceeded', secondary_driver: 'No repayment in 90 days', explanation: 'Export-oriented manufacturer with DPD 91 days — technically past Stage 3 threshold. Retained at Stage 2 without documented justification for the exception. Regulatory compliance risk.', recommended_action: 'Immediate reclassification to Stage 3 and regulatory disclosure. Document exception rationale or correct staging.', override_flag: false },
      { loan_id: 'BNK-CR-2025-0621', branch_code: 'BR-11', exposure_lkr: 134000000, assigned_stage: 1, predicted_stage: 2, anomaly_score: 0.77, primary_driver: '2025-Q3 vintage — 1.7x default rate vs prior cohort', secondary_driver: 'LTV 74% — approaching Stage 2 boundary', explanation: 'New origination from the rapid growth period Q3 2025. This vintage cohort shows early default indicators at 1.7x the rate of equivalent 2024-Q3 cohort at same maturity. Elevated forward-looking risk.', recommended_action: 'Reclassify to Stage 2 given SICR signals. Increase monitoring frequency for all Q3 2025 vintage loans.', override_flag: false },
      { loan_id: 'BNK-CR-2025-1122', branch_code: 'BR-14', exposure_lkr: 42000000, assigned_stage: 1, predicted_stage: 3, anomaly_score: 0.93, primary_driver: 'Collateral ratio 0.31 — below Stage 3 threshold', secondary_driver: 'DPD 78 days + restructure count 1', explanation: 'Small business loan with collateral ratio 0.31 (below the 0.40 Stage 3 trigger). Combined with 78 DPD and one prior restructuring, three independent Stage 3 indicators are present while loan remains at Stage 1.', recommended_action: 'Immediate reclassification to Stage 3. Initiate collateral enforcement review.', override_flag: false },
      { loan_id: 'BNK-CR-2025-0773', branch_code: 'BR-23', exposure_lkr: 89000000, assigned_stage: 2, predicted_stage: 3, anomaly_score: 0.86, primary_driver: 'Legal notice served — Stage 3 trigger event', secondary_driver: 'No record of Stage 3 migration post-legal notice', explanation: 'Legal demand notice served to borrower 34 days ago. Under SLFRS 9, service of legal notice is a Stage 3 trigger event. Loan has not been reclassified. Provisioning is materially understated.', recommended_action: 'Immediate Stage 3 reclassification. Regulatory compliance breach must be remedied. Provision to minimum 66.7%.', override_flag: false },
      { loan_id: 'BNK-CR-2025-1456', branch_code: 'BR-41', exposure_lkr: 213000000, assigned_stage: 1, predicted_stage: 2, anomaly_score: 0.81, primary_driver: 'Infrastructure sector concentration — single obligor 4.9% of sector book', secondary_driver: 'Disbursement 87% utilised within 30 days of approval', explanation: 'Large infrastructure financing where single obligor represents 4.9% of Demo Bank\'s infrastructure sector exposure. Rapid drawdown rate anomalous for capital project financing. Concentration and utilisation pattern flagged.', recommended_action: 'Apply Stage 2 given concentration risk and unusual drawdown velocity. Obtain project progress certificate.', override_flag: false },
    ],
    vintage_analysis: [
      { cohort: '2024-Q1', loan_count: 1842, total_exposure_lkr: 4100000000, avg_anomaly_score: 0.31, projected_stage3_migration_pct: 0.7, risk_flag: 'green' },
      { cohort: '2024-Q2', loan_count: 2104, total_exposure_lkr: 4800000000, avg_anomaly_score: 0.34, projected_stage3_migration_pct: 0.8, risk_flag: 'green' },
      { cohort: '2024-Q3', loan_count: 2318, total_exposure_lkr: 5200000000, avg_anomaly_score: 0.38, projected_stage3_migration_pct: 0.9, risk_flag: 'green' },
      { cohort: '2024-Q4', loan_count: 2567, total_exposure_lkr: 6100000000, avg_anomaly_score: 0.42, projected_stage3_migration_pct: 1.0, risk_flag: 'amber' },
      { cohort: '2025-Q1', loan_count: 3012, total_exposure_lkr: 7400000000, avg_anomaly_score: 0.51, projected_stage3_migration_pct: 1.2, risk_flag: 'amber' },
      { cohort: '2025-Q2', loan_count: 3891, total_exposure_lkr: 9800000000, avg_anomaly_score: 0.61, projected_stage3_migration_pct: 1.4, risk_flag: 'amber' },
      { cohort: '2025-Q3', loan_count: 4234, total_exposure_lkr: 11200000000, avg_anomaly_score: 0.68, projected_stage3_migration_pct: 1.6, risk_flag: 'red' },
      { cohort: '2025-Q4', loan_count: 3890, total_exposure_lkr: 10400000000, avg_anomaly_score: 0.72, projected_stage3_migration_pct: 1.8, risk_flag: 'red' },
    ],
    sector_concentration: [
      { sector: 'Construction', flagged_count: 23, flagged_exposure_lkr: 412000000, avg_anomaly_score: 0.79, npl_rate_pct: 3.2 },
      { sector: 'Agriculture', flagged_count: 18, flagged_exposure_lkr: 287000000, avg_anomaly_score: 0.74, npl_rate_pct: 2.8 },
      { sector: 'Consumer/Personal', flagged_count: 14, flagged_exposure_lkr: 198000000, avg_anomaly_score: 0.68, npl_rate_pct: 1.1 },
      { sector: 'SME Manufacturing', flagged_count: 12, flagged_exposure_lkr: 176000000, avg_anomaly_score: 0.71, npl_rate_pct: 1.4 },
      { sector: 'Trade & Services', flagged_count: 9, flagged_exposure_lkr: 143000000, avg_anomaly_score: 0.66, npl_rate_pct: 0.9 },
      { sector: 'Infrastructure', flagged_count: 7, flagged_exposure_lkr: 134000000, avg_anomaly_score: 0.73, npl_rate_pct: 0.6 },
      { sector: 'Hospitality', flagged_count: 6, flagged_exposure_lkr: 112000000, avg_anomaly_score: 0.77, npl_rate_pct: 2.1 },
    ],
    branch_concentration: [
      { branch_code: 'BR-14', flagged_count: 14, flagged_exposure_lkr: 387000000, override_flagged_count: 11, risk_signal: 'CRITICAL: 14.3% override rate + 11 override-approved flagged loans. Insider loan fraud pattern.' },
      { branch_code: 'BR-23', flagged_count: 9, flagged_exposure_lkr: 198000000, override_flagged_count: 6, risk_signal: 'HIGH: Embilipitiya branch — elevated override rate 9.8%. Construction sector concentration.' },
      { branch_code: 'BR-56', flagged_count: 7, flagged_exposure_lkr: 144000000, override_flagged_count: 2, risk_signal: 'MEDIUM: Matara branch — Agriculture sector vintage Q3 2025 cohort quality concern.' },
      { branch_code: 'BR-11', flagged_count: 6, flagged_exposure_lkr: 112000000, override_flagged_count: 1, risk_signal: 'MEDIUM: Batticaloa — Eastern Province exposure, post-event stress indicators.' },
      { branch_code: 'BR-41', flagged_count: 5, flagged_exposure_lkr: 98000000, override_flagged_count: 0, risk_signal: 'LOW: Kandy branch — vintage Q4 2025 cohort showing early stress indicators.' },
    ],

    fli_overlays: {
      gdp_growth_forecast: -1.2,
      construction_sector_npl_trend: 'deteriorating',
      macro_overlay_applied_lkr: 340000000,
      overlay_basis: 'Q4 2025 CBSL sector NPL data — construction sector 3.2% vs 0.9% portfolio avg',
      management_staging_policy: 'Demo Bank Staging Policy v4.1 (Oct 2025) — DPD triggers supplemented by qualitative overlays for concentration risk',
      agent_vs_policy_conflicts: [
        { loan_id: 'BNK-CR-2025-0441', assigned_stage: 1, policy_required_stage: 3, conflict_reason: 'DPD 67 days, collateral ratio 0.38 — both breach Stage 3 triggers under policy v4.1', override_authorised_by: 'STF-1847', policy_ref: 'Section 4.2.1' },
        { loan_id: 'BNK-CR-2025-0872', assigned_stage: 1, policy_required_stage: 3, conflict_reason: 'Restructured twice in 12 months — automatic Stage 3 trigger per Section 4.3', override_authorised_by: 'STF-1847', policy_ref: 'Section 4.3.0' },
        { loan_id: 'BNK-CR-2025-1203', assigned_stage: 2, policy_required_stage: 3, conflict_reason: 'Guarantor defaulted on separate facility — cross-default clause triggers Stage 3', override_authorised_by: 'STF-1847', policy_ref: 'Section 4.4.2' },
        { loan_id: 'BNK-CR-2025-3341', assigned_stage: 1, policy_required_stage: 2, conflict_reason: 'Construction sector exposure >LKR 50M requires minimum Stage 2 per Q4 overlay', override_authorised_by: 'STF-2341', policy_ref: 'ALCO Overlay Dec-2025' },
      ],
    },
    capital_impact: {
      current_tier1_car: 19.06,
      current_stage3_ratio: 3.50,
      if_corrected_stage3_ratio: 4.12,
      ecl_restatement_lkr: 1100000000,
      rwa_increase_lkr: 4200000000,
      car_impact_bps: -47,
      corrected_tier1_car: 18.59,
      cbsl_notification_threshold_bps: 50,
      notification_required: false,
      notification_threshold_note: 'Impact of 47bps is below the 50bps CBSL notification threshold — however the combination with SUS-017 ECL exposure may breach threshold in aggregate',
      aggregate_impact_with_sus017_bps: 61,
      aggregate_notification_required: true,
    },
    key_findings: [
      { finding: '34 loans totalling LKR 1.1 Bn are predicted to be misstaged under SLFRS 9 criteria. If corrected, Stage 3 ratio moves from 3.50% to 4.12% — pushing Demo Bank above the peer-median 2.84% and approaching the internal amber threshold of 4.5%.', severity: 'critical', affected_exposure_lkr: 1100000000, anomaly_score: 0.95, primary_driver: 'Systemic SLFRS 9 misstaging across 34 loans', secondary_drivers: ['Stage 3 ratio deterioration from 3.50% to 4.12%', 'ECL restatement of LKR 1.1 Bn required', 'Override-approved loans concentrated in misstaged cohort'], entity_ids: [], recommended_action: 'Convene emergency Staging Committee. Correct misstaging before next regulatory submission. Review ECL model parameters.' },
      { finding: 'Branch BR-14 (Ratnapura) has 11 override-approved loans in the flagged cohort — the highest concentration in the network. Combined with override rate of 14.3%, this pattern is consistent with insider-enabled loan fraud.', severity: 'critical', affected_exposure_lkr: 387000000, anomaly_score: 0.96, primary_driver: 'Override concentration at BR-14 with 14.3% override rate', secondary_drivers: ['11 override-approved loans in flagged cohort', 'Highest override concentration in network', 'Pattern consistent with insider-enabled loan fraud'], entity_ids: ['BR-14'], recommended_action: 'Immediate Internal Audit investigation of BR-14. Freeze new override approvals pending review. Engage Compliance and HR.' },
      { finding: 'Q3 and Q4 2025 vintage cohorts are defaulting at 1.7-1.8x the rate of equivalent 2024 cohorts at the same maturity. Projected Stage 3 migration across the two cohorts is LKR 370 Mn (on a watched cohort notional of LKR 21.6 Bn). This indicates underwriting standards may have deteriorated during the rapid loan growth period.', severity: 'high', affected_exposure_lkr: 370000000, watched_cohort_notional_lkr: 21600000000, anomaly_score: 0.78, primary_driver: 'Vintage cohort quality deterioration in Q3-Q4 2025', secondary_drivers: ['Default rate 1.7-1.8x above prior year cohorts', 'Projected Stage 3 migration LKR 370 Mn', 'Watched cohort notional LKR 21.6 Bn (not at immediate risk)'], entity_ids: [], recommended_action: 'Initiate vintage quality review for all Q3-Q4 2025 originations. Incorporate override flag as a model feature in next ECL calibration. Set tighter approval parameters for high-growth branches.' },
      { finding: 'Construction sector concentration in flagged loans (23 loans, LKR 412 Mn, average anomaly score 0.79) is disproportionate to sector weight in the portfolio. NPL rate of 3.2% is 3.5x the bank-wide average.', severity: 'high', affected_exposure_lkr: 412000000, anomaly_score: 0.79, primary_driver: 'Construction sector NPL rate 3.2% — 3.5x bank-wide average', secondary_drivers: ['23 flagged loans with LKR 412 Mn exposure', 'Average anomaly score 0.79 across sector', 'Disproportionate sector weight in flagged population'], entity_ids: [], recommended_action: 'Apply sector risk weight ceiling for construction in next credit policy review. Commission sector portfolio stress test.' },
    ],
    orchestrator_signals: [
      { signal_type: 'insider_fraud_risk', target_agent: 'controls', shared_entity_id: 'BR-14', description: 'BR-14 has 11 override-approved flagged loans. Cross-reference with Internal Controls Agent override data.', severity: 'critical' },
      { signal_type: 'kyc_cross_reference', target_agent: 'kyc', shared_entity_id: 'BNK-CR-2025-2041', description: 'Guarantors on flagged BR-14 loans share residential addresses. KYC verification required.', severity: 'high' },
      { signal_type: 'disbursement_routing', target_agent: 'transaction', shared_entity_id: 'BNK-CR-2025-1788', description: 'Stage 3 loan with DPD 91 days. Check disbursement routing for round-trip patterns.', severity: 'high' },
    ],
  },

  // ─── TRANSACTION SURVEILLANCE AGENT ──────────────────────────────────────
  transaction: {
    surveillance_summary: {
      total_transactions_analyzed: 284719,
      total_volume_lkr: 47800000000,
      flagged_transactions: 847,
      str_eligible_count: 4,
      structuring_clusters: 7,
      high_risk_accounts: 23,
      benford_deviation_detected: true,
    },
    structuring_clusters: [
      { account_id: 'BNK-0841-X', branch_code: 'BR-72', cluster_transactions: 15, cluster_timespan_minutes: 22, combined_amount_lkr: 71250000, max_single_txn_lkr: 4950000, structuring_score: 0.94, str_eligible: true, explanation: '15 CEFT transfers in 22 minutes, all between LKR 4.6M and LKR 4.95M. Combined total LKR 71.25M — would have triggered 14 STRs if single transactions. Velocity 41x above account baseline.' },
      { account_id: 'BNK-3312-B', branch_code: 'BR-34', cluster_transactions: 8, cluster_timespan_minutes: 94, combined_amount_lkr: 38400000, max_single_txn_lkr: 4890000, structuring_score: 0.87, str_eligible: true, explanation: '8 transactions over 94 minutes, amounts clustered at 92-98% of LKR 5M threshold. All directed to same two beneficiary accounts at Sampath Bank. Round-trip risk elevated.' },
      { account_id: 'BNK-7741-C', branch_code: 'BR-14', cluster_transactions: 6, cluster_timespan_minutes: 187, combined_amount_lkr: 28800000, max_single_txn_lkr: 4920000, structuring_score: 0.79, str_eligible: false, explanation: '6 transactions over 3 hours showing deliberate amount reduction pattern. Each subsequent transaction is LKR 30-50K less than previous — consistent with systematic threshold testing.' },
      { account_id: 'BNK-5523-D', branch_code: 'BR-23', cluster_transactions: 11, cluster_timespan_minutes: 41, combined_amount_lkr: 52800000, max_single_txn_lkr: 4980000, structuring_score: 0.91, str_eligible: true, explanation: '11 RTGS transactions in 41 minutes to 4 different beneficiaries at 3 banks. Amount clustering at 98-99.6% of STR threshold. Extreme precision in amount selection suggests deliberate structuring.' },
    ],
    velocity_anomalies: [
      { account_id: 'BNK-0841-X', branch_code: 'BR-72', txn_count_in_window: 47, implied_baseline_count: 3, velocity_multiple: 15.7, total_volume_lkr: 219000000, risk_flag: 'critical' },
      { account_id: 'BNK-2209-F', branch_code: 'BR-72', txn_count_in_window: 34, implied_baseline_count: 4, velocity_multiple: 8.5, total_volume_lkr: 87000000, risk_flag: 'critical' },
      { account_id: 'SUS-017', branch_code: 'BR-72', txn_count_in_window: 312, implied_baseline_count: 28, velocity_multiple: 11.1, total_volume_lkr: 1240000000, risk_flag: 'critical' },
      { account_id: 'BNK-8834-G', branch_code: 'BR-16', txn_count_in_window: 19, implied_baseline_count: 5, velocity_multiple: 3.8, total_volume_lkr: 44000000, risk_flag: 'high' },
      { account_id: 'BNK-1122-H', branch_code: 'BR-11', txn_count_in_window: 22, implied_baseline_count: 6, velocity_multiple: 3.7, total_volume_lkr: 31000000, risk_flag: 'high' },
    ],
    network_anomalies: [
      { account_id: 'SUS-017', pattern: 'Hub-and-spoke — 89% of debits to same 3 external accounts', counterparty_concentration_pct: 89, total_flow_lkr: 1240000000, explanation: 'Suspense account SUS-017 shows extreme counterparty concentration. LKR 1.24 Bn processed with 89% of outflows going to 3 accounts at one other bank. Classic money mule network structure.' },
      { account_id: 'BNK-0841-X', pattern: 'Round-trip — outbound LKR 71.25M, inbound LKR 68.9M within 7 days', counterparty_concentration_pct: 97, total_flow_lkr: 71250000, explanation: 'Near-complete round-trip of structured funds. Outbound LKR 71.25M through structuring cluster, inbound LKR 68.9M from same counterparty network 5 days later. Layering pattern.' },
    ],
    benford_analysis: {
      deviation_detected: true,
      most_deviant_digit: 4,
      expected_pct: 9.7,
      actual_pct: 18.3,
      interpretation: 'First digit "4" appears at 18.3% vs expected 9.7% under Benford\'s Law. Transactions in the LKR 4.0M-4.99M range are artificially concentrated — consistent with systematic structuring below the LKR 5M STR threshold. Chi-squared p-value: 0.003 (highly significant).',
    },
    str_queue: [
      { account_id: 'BNK-0841-X', str_grounds: 'Structuring score 0.94 — 15 CEFT transactions in 22 minutes, all below LKR 5M STR threshold. Combined LKR 71.25M.', amount_lkr: 71250000, urgency: 'immediate' },
      { account_id: 'BNK-3312-B', str_grounds: 'Structuring score 0.87 — 8 transactions with hub-and-spoke routing to 2 external accounts. Round-trip risk.', amount_lkr: 38400000, urgency: 'within_24h' },
      { account_id: 'SUS-017', str_grounds: 'Suspense account — LKR 1.24 Bn velocity anomaly (11.1x baseline), 89% concentration to 3 external accounts. 94 days unreconciled.', amount_lkr: 1240000000, urgency: 'immediate' },
      { account_id: 'BNK-5523-D', str_grounds: 'Structuring score 0.91 — 11 RTGS to 4 beneficiaries at 3 banks. Amount precision at 98-99.6% of threshold indicates deliberate structuring.', amount_lkr: 52800000, urgency: 'within_24h' },
    ],
    key_findings: [
      { finding: 'Benford\'s Law deviation detected across full transaction population — first digit "4" appears at 18.3% vs expected 9.7%. This indicates systematic structuring below the LKR 5M STR threshold is occurring at a network-wide level. Identified structuring clusters aggregate to LKR 191 Mn; population under surveillance is LKR 47.8 Bn.', severity: 'critical', affected_exposure_lkr: 191250000, population_under_surveillance_lkr: 47800000000, anomaly_score: 0.94, primary_driver: 'Network-wide systematic structuring below LKR 5M STR threshold', secondary_drivers: ['First digit 4 at 18.3% vs expected 9.7%', 'Chi-squared p-value 0.003', 'Identified structuring clusters aggregate LKR 191 Mn (cluster-level affected exposure)'], entity_ids: [], recommended_action: 'Immediate CBSL FIU notification. Suspend all accounts in structuring clusters pending investigation. Engage Compliance Officer for bulk STR assessment.' },
      { finding: '4 accounts are STR-eligible under CBSL FIU guidelines. Largest: SUS-017 with LKR 1.24 Bn in suspicious flows. Combined STR exposure: LKR 1.44 Bn.', severity: 'critical', affected_exposure_lkr: 1440000000, anomaly_score: 0.96, primary_driver: '4 STR-eligible accounts with combined LKR 1.44 Bn suspicious exposure', secondary_drivers: ['SUS-017 largest at LKR 1.24 Bn', 'CBSL FIU filing obligation triggered', 'FTRA 5-day filing deadline applies'], entity_ids: ['SUS-017', 'BNK-0841-X'], recommended_action: 'File STRs within 5 working days as required by FTRA. Freeze accounts SUS-017 and BNK-0841-X pending investigation.' },
      { finding: 'Account SUS-017 shows hub-and-spoke routing pattern with 89% counterparty concentration — the primary indicator of a money mule network used for layering proceeds through Demo Bank\'s CEFT infrastructure.', severity: 'critical', affected_exposure_lkr: 1240000000, anomaly_score: 0.97, primary_driver: 'Hub-and-spoke routing with 89% counterparty concentration at SUS-017', secondary_drivers: ['Money mule network structure detected', 'LKR 1.24 Bn processed through 3 external accounts', 'CEFT infrastructure exploited for layering'], entity_ids: ['SUS-017'], recommended_action: 'Escalate to Fraud Investigation Unit. Cross-reference SUS-017 counterparties against KYC database for related party exposure.' },
    ],
    orchestrator_signals: [
      { signal_type: 'suspense_cross_reference', target_agent: 'suspense', shared_entity_id: 'SUS-017', description: 'SUS-017 showing velocity 11.1x baseline and STR-eligible flows. Reconciliation Agent must review aging.', severity: 'critical' },
      { signal_type: 'digital_fraud_link', target_agent: 'digital', shared_entity_id: 'BNK-0841-X', description: 'Account BNK-0841-X with structuring score 0.94 — check session logs for ATO or behavioral anomaly.', severity: 'critical' },
      { signal_type: 'credit_disbursement', target_agent: 'credit', shared_entity_id: 'BNK-CR-2025-1788', description: 'Round-trip flow from recently disbursed loan BNK-CR-2025-1788. Loan may be fictitious.', severity: 'high' },
    ],
  },

  // ─── SUSPENSE & RECONCILIATION AGENT ─────────────────────────────────────
  suspense: {
    reconciliation_summary: {
      total_accounts_analyzed: 143,
      total_unreconciled_balance_lkr: 8420000000,
      critical_accounts: 3,
      red_accounts: 7,
      flagged_accounts_shown: 4,
      flagged_accounts_selection: 'Representatives across tiers (1 critical/phantom-receivable, 1 red, 2 amber/watch); full 7 red + 14 amber + 22 watch accounts exportable via Reports',
      amber_accounts: 14,
      watch_accounts: 22,
      growth_anomalies: 5,
      phantom_receivable_risk_accounts: 2,
    },
    flagged_accounts: [
      { account_id: 'SUS-017', account_type: 'CEFT Receivables', branch_code: 'BR-72', current_balance_lkr: 1240000000, aging_days: 94, growth_rate_30d_pct: 312, clearing_ratio: 0.08, risk_tier: 'critical', pattern_detected: 'Phantom receivable + CEFT fraud indicators', ceft_fraud_indicators: true, phantom_receivable_risk: true, explanation: 'SUS-017 balance grew 312% in 30 days while clearing activity (outflows/inflows ratio) collapsed to 0.08. Legitimate CEFT receivables clear within 3-5 business days. 94 days aging with this growth rate is the definitive phantom receivable signature. Cross-referenced with Transaction Agent — 89% counterparty concentration to 3 external accounts.', recommended_action: 'IMMEDIATE FREEZE. Regulatory breach — exceeds 90-day CBSL guideline. Initiate forensic review. File STR. Notify CBSL FIU.', regulatory_breach_risk: true },
      { account_id: 'SUS-031', account_type: 'CEFT Receivables', branch_code: 'BR-16', current_balance_lkr: 340000000, aging_days: 38, growth_rate_30d_pct: 187, clearing_ratio: 0.21, risk_tier: 'amber', pattern_detected: 'Rapid growth anomaly — growth rate 4x normal', ceft_fraud_indicators: true, phantom_receivable_risk: false, explanation: 'SUS-031 (City Office) grew 187% in 30 days — 4x the normal CEFT receivables growth rate for this branch. Aging at 38 days is still within tolerance but growth rate trajectory projects critical status within 15 days. Clearing ratio declining.', recommended_action: 'Escalate to Branch Manager and Compliance immediately. Require written explanation of balance composition. Monitor daily.', regulatory_breach_risk: false },
      { account_id: 'SUS-044', account_type: 'Fee Suspense', branch_code: 'BR-14', current_balance_lkr: 87000000, aging_days: 67, growth_rate_30d_pct: 44, clearing_ratio: 0.41, risk_tier: 'red', pattern_detected: 'Unreconciled fee suspense — 67 days', ceft_fraud_indicators: false, phantom_receivable_risk: false, explanation: 'BR-14 (Ratnapura) fee suspense account unreconciled for 67 days. Consistent with Internal Controls findings at this branch — SoD violations and override abuse. Fee suspense used to park undisclosed income.', recommended_action: 'Cross-reference with Internal Audit investigation of BR-14. Require reconciliation within 5 business days. Escalate to Head of Finance.', regulatory_breach_risk: false },
      { account_id: 'NOS-USD-01', account_type: 'NOSTRO USD', branch_code: 'BR-16', current_balance_lkr: 710000000, aging_days: 12, growth_rate_30d_pct: 8, clearing_ratio: 0.87, risk_tier: 'amber', pattern_detected: 'NOSTRO reconciliation break — USD 2.3 Mn outstanding', ceft_fraud_indicators: false, phantom_receivable_risk: false, explanation: 'USD NOSTRO account with Citibank shows USD 2.3 Mn reconciliation break (LKR 710 Mn equivalent) outstanding 12 days. Within 30-day watch threshold but USD NOSTRO breaks should clear within 5 business days per Treasury policy.', recommended_action: 'Treasury to obtain Citibank statement and identify break within 3 business days. Escalate to Head of Treasury if unresolved by day 15.', regulatory_breach_risk: false },
    ],
    aging_distribution: {
      watch_0_30: { count: 22, balance_lkr: 890000000 },
      amber_31_60: { count: 14, balance_lkr: 1240000000 },
      red_61_90: { count: 7, balance_lkr: 2310000000 },
      critical_90_plus: { count: 3, balance_lkr: 3980000000 },
    },
    growth_anomalies: [
      { account_id: 'SUS-017', balance_30d_ago_lkr: 301000000, current_balance_lkr: 1240000000, growth_pct: 312, aging_days: 94, risk_interpretation: 'CRITICAL — Phantom receivable pattern confirmed. Growth 312% with clearing ratio 0.08.' },
      { account_id: 'SUS-031', balance_30d_ago_lkr: 118000000, current_balance_lkr: 340000000, growth_pct: 187, aging_days: 38, risk_interpretation: 'HIGH — CEFT receivables growth 4x normal rate. Trajectory toward critical within 15 days.' },
      { account_id: 'SUS-082', balance_30d_ago_lkr: 44000000, current_balance_lkr: 97000000, growth_pct: 120, aging_days: 22, risk_interpretation: 'MEDIUM — Fee suspense growth rate elevated. Monitor for clearing within 30 days.' },
    ],
    key_findings: [
      { finding: 'SUS-017 (Pettah Main Street CEFT Receivables) shows definitive phantom receivable pattern: 312% balance growth in 30 days, clearing ratio collapsed to 0.08, 94 days unreconciled. Regulatory breach. Coordinated with Transaction Agent — LKR 1.24 Bn in suspicious flows.', severity: 'critical', affected_balance_lkr: 1240000000, anomaly_score: 0.98, primary_driver: 'Phantom receivable pattern confirmed at SUS-017', secondary_drivers: ['312% balance growth in 30 days', 'Clearing ratio collapsed to 0.08', '94 days unreconciled — CBSL guideline breached'], entity_ids: ['SUS-017'], recommended_action: 'IMMEDIATE FREEZE. Regulatory breach — CBSL guideline exceeded. Forensic review. STR filing. CBSL FIU notification.' },
      { finding: 'Total unreconciled suspense balance across Demo Bank network: LKR 8.42 Bn. Of this, LKR 3.98 Bn (47%) is in accounts exceeding 90-day CBSL guideline — a systemic reconciliation control failure.', severity: 'critical', affected_balance_lkr: 3980000000, anomaly_score: 0.92, primary_driver: 'Systemic reconciliation control failure — 47% of balance exceeds CBSL 90-day guideline', secondary_drivers: ['LKR 8.42 Bn total unreconciled balance', 'LKR 3.98 Bn in accounts exceeding 90-day limit', '3 accounts in critical category'], entity_ids: [], recommended_action: 'Emergency reconciliation programme. All accounts >60 days to be reviewed by CFO within 5 business days. Implement daily automated reconciliation reporting.' },
    ],
      reconciliation_depth: {
        source_system_sync: [
          { system: 'Core Banking', status: 'Synced', last_sync: '2026-04-10 06:00', breaks: 2, note: 'Minor timing differences on 2 CEFT entries — expected to auto-clear T+1.' },
          { system: 'CEFT Switch', status: 'Mismatch', last_sync: '2026-04-10 05:55', breaks: 7, note: 'Interface sync delay — 7 entries in CEFT switch not yet reflected in core GL. SUS-017 primary source.' },
          { system: 'RTGS Switch', status: 'Synced', last_sync: '2026-04-10 05:30', breaks: 0, note: 'All RTGS entries confirmed and matched.' },
          { system: 'ATM Network', status: 'Synced', last_sync: '2026-04-10 06:05', breaks: 0, note: 'ATM settlement batch completed successfully.' },
        ],
        auto_match_rates: [
          { account_id: 'SUS-017', account_name: 'CEFT Receivables (Pettah)', auto_match_pct: 8, unmatched_items: 47, break_lkr: 136200000, interpretation: 'Critical — 8% match rate means 92% of entries are unmatched. A legitimate CEFT receivables account should auto-match at 90%+. The 47 unmatched items with LKR 136M break is the phantom receivable mass.' },
          { account_id: 'SUS-031', account_name: 'NOSTRO Clearing (CBD)', auto_match_pct: 31, unmatched_items: 12, break_lkr: 29400000, interpretation: 'Elevated — 31% match rate is significantly below the 80% threshold for NOSTRO clearing. 12 unmatched items require written explanation.' },
          { account_id: 'SUS-044', account_name: 'Fee Suspense (BR-14)', auto_match_pct: 52, unmatched_items: 4, break_lkr: 4600000, interpretation: 'Watch — 52% match rate is below threshold but improving. 4 unmatched items linked to BR-14 override activity under investigation.' },
          { account_id: 'SUS-099', account_name: 'CEFT Receivables (BR-22)', auto_match_pct: 88, unmatched_items: 1, break_lkr: 120000, interpretation: 'Normal — 88% auto-match rate within acceptable range. 1 unmatched item is a timing difference expected to clear T+1.' },
        ],
        reaging_detected: [
          { account_id: 'SUS-031', original_age_days: 87, reset_to_days: 12, reset_date: '2026-02-28', reset_by: 'STF-2341', method: 'Journal entry reversal + repost on Feb 28', risk: 'high', interpretation: 'The SUS-031 balance aged 87 days — approaching the CBSL 90-day breach threshold. On Feb 28, STF-2341 reversed the entries and reposted them, resetting the aging clock to 12 days. This concealed an imminent CBSL reporting breach. Re-aging via reversal-repost is a well-documented fraud technique to avoid regulatory escalation.' },
        ],
        cutoff_analysis: [
          { tier: 'T+0 Same day',   pct: 61, interpretation: '61% of entries clear within the posting day — as expected for well-managed suspense.' },
          { tier: 'T+1 Next day',   pct: 22, interpretation: '22% take until the next business day — within acceptable range for batch-processed items.' },
          { tier: 'T+2+ Delayed',   pct: 17, interpretation: '17% take 2+ days to clear — elevated. CBSL recommends <10% for T+2+. Concentrated in SUS-017.' },
        ],
      },
    orchestrator_signals: [
      { signal_type: 'ceft_fraud_confirmed', target_agent: 'transaction', shared_entity_id: 'SUS-017', description: 'Phantom receivable pattern confirmed at SUS-017. Cross-reference all CEFT flows originating from this account.', severity: 'critical' },
      { signal_type: 'branch_control_failure', target_agent: 'controls', shared_entity_id: 'BR-14', description: 'Fee suspense SUS-044 at BR-14 unreconciled 67 days — consistent with control failures identified at this branch.', severity: 'high' },
    ],
  },

  // ─── IDENTITY, KYC & AML AGENT ───────────────────────────────────────────
  kyc: {
    compliance_summary: {
      total_customers_analyzed: 835944,
      kyc_gap_count: 39290,
      kyc_gap_pct: 4.7,
      pep_accounts: 34,
      pep_related_accounts: 89,
      edd_required_count: 127,
      beneficial_ownership_gaps: 234,
      str_assessment_required: 7,
      fatf_country_exposure: 18,
      overdue_refresh_count: 12847,
    },
    kyc_gaps: [
      { customer_id: 'BNK-C-0041-X', gap_type: 'PEP — EDD overdue 14 months', risk_rating: 'high', days_overdue: 428, regulatory_breach: true, priority: 'critical' },
      { customer_id: 'BNK-C-3312-B', gap_type: 'Beneficial ownership not disclosed — corporate entity', risk_rating: 'high', days_overdue: 287, regulatory_breach: true, priority: 'critical' },
      { customer_id: 'BNK-C-7741-C', gap_type: 'NIC expired — identity document invalid', risk_rating: 'medium', days_overdue: 184, regulatory_breach: false, priority: 'high' },
      { customer_id: 'BNK-C-8834-G', gap_type: 'FATF grey-list country — EDD not performed', risk_rating: 'high', days_overdue: 312, regulatory_breach: true, priority: 'critical' },
      { customer_id: 'BNK-C-5521-D', gap_type: 'Dormant reactivation — KYC refresh not done', risk_rating: 'medium', days_overdue: 67, regulatory_breach: false, priority: 'high' },
    ],
    pep_findings: [
      { customer_id: 'BNK-C-0041-X', pep_type: 'direct', edd_current: false, last_review_days_ago: 428, action_required: 'IMMEDIATE EDD refresh. Regulatory breach. Suspend account until EDD completed.' },
      { customer_id: 'BNK-C-2209-F', pep_type: 'related', edd_current: false, last_review_days_ago: 187, action_required: 'EDD refresh within 30 days. Enhanced transaction monitoring in interim.' },
      { customer_id: 'BNK-C-4412-G', pep_type: 'direct', edd_current: true, last_review_days_ago: 34, action_required: 'EDD current. Maintain annual review schedule. Next due in 331 days.' },
    ],
    beneficial_ownership_gaps: [
      { customer_id: 'BNK-C-3312-B', entity_type: 'Private Limited Company', gap_description: 'Ultimate beneficial owner (>25% shareholding) not identified or documented', regulatory_breach: true },
      { customer_id: 'BNK-C-9921-K', entity_type: 'Partnership', gap_description: 'Partnership deed expired 2022 — beneficial ownership structure may have changed', regulatory_breach: false },
    ],
    introducer_concentration: [
      { introducer_code: 'INT-BR14-007', accounts_with_gaps: 14, total_accounts_introduced: 41, flag: true, risk_interpretation: 'BR-14 introducer INT-BR14-007 has KYC gaps on 34% of introduced accounts. Consistent with systemic onboarding failures at Ratnapura branch. Cross-reference with credit findings.' },
      { introducer_code: 'INT-BR23-012', accounts_with_gaps: 6, total_accounts_introduced: 28, flag: true, risk_interpretation: 'BR-23 introducer with 21% gap rate. Review introducer vetting process at this branch.' },
    ],
    branch_compliance_heatmap: [
      { branch_code: 'BR-14', gap_rate_pct: 12.4, critical_gaps: 8, pep_accounts: 2, risk_score: 87 },
      { branch_code: 'BR-72', gap_rate_pct: 9.1, critical_gaps: 5, pep_accounts: 1, risk_score: 76 },
      { branch_code: 'BR-68', gap_rate_pct: 8.3, critical_gaps: 4, pep_accounts: 3, risk_score: 74 },
      { branch_code: 'BR-23', gap_rate_pct: 7.2, critical_gaps: 6, pep_accounts: 0, risk_score: 68 },
      { branch_code: 'BR-11', gap_rate_pct: 6.8, critical_gaps: 3, pep_accounts: 2, risk_score: 64 },
      { branch_code: 'BR-41', gap_rate_pct: 3.1, critical_gaps: 1, pep_accounts: 1, risk_score: 31 },
      { branch_code: 'BR-34', gap_rate_pct: 1.9, critical_gaps: 0, pep_accounts: 0, risk_score: 19 },
    ],
    str_assessments: [
      { customer_id: 'BNK-C-0041-X', grounds: 'PEP status + high velocity transactions + EDD overdue 14 months', urgency: 'immediate' },
      { customer_id: 'BNK-C-8834-G', grounds: 'FATF grey-list country + EDD not performed + account linked to SUS-017 network', urgency: 'immediate' },
    ],
    key_findings: [
      { finding: 'KYC gap rate of 4.7% (39,290 accounts) exceeds the 2% green threshold. Of these, 847 relate to the HSBC migration batch and require resolution before Q2 2026 integration deadline.', severity: 'high', affected_customer_count: 39290, anomaly_score: 0.75, primary_driver: 'KYC gap rate 4.7% — exceeds 2% green threshold', secondary_drivers: ['39,290 accounts with KYC gaps', '847 gaps from HSBC migration batch', 'Q2 2026 integration deadline at risk'], entity_ids: [], recommended_action: 'Deploy dedicated KYC remediation team. Prioritise high-risk and PEP accounts. Set 90-day remediation target for all critical gaps.' },
      { finding: 'Introducer INT-BR14-007 introduced 41 accounts with 34% KYC gap rate — disproportionately high and consistent with systemic control failures at BR-14 identified by Internal Controls and Credit agents.', severity: 'critical', affected_customer_count: 41, anomaly_score: 0.93, primary_driver: 'Introducer INT-BR14-007 with 34% KYC gap rate at BR-14', secondary_drivers: ['41 accounts introduced with systemic gaps', 'Consistent with BR-14 control failures', 'Cross-agent corroboration from Controls and Credit'], entity_ids: ['BR-14'], recommended_action: 'Suspend INT-BR14-007 introducer privileges. Review all 41 introduced accounts. Incorporate into BR-14 investigation.' },
      { finding: '2 accounts require immediate STR assessment: PEP with overdue EDD (BNK-C-0041-X) and FATF-country customer linked to SUS-017 suspicious network (BNK-C-8834-G).', severity: 'critical', affected_customer_count: 2, anomaly_score: 0.94, primary_driver: 'PEP and FATF-country customers with overdue EDD linked to suspicious network', secondary_drivers: ['BNK-C-0041-X PEP EDD overdue 14 months', 'BNK-C-8834-G linked to SUS-017 network', 'Regulatory breach on both accounts'], entity_ids: ['SUS-017'], recommended_action: 'File STRs within 5 working days. Freeze accounts pending investigation. Notify CBSL FIU.' },
    ],
    orchestrator_signals: [
      { signal_type: 'br14_systemic_failure', target_agent: 'controls', shared_entity_id: 'BR-14', description: 'BR-14 KYC gap rate 12.4% with suspect introducer — confirms systemic control failure at this branch.', severity: 'critical' },
      { signal_type: 'sus017_kyc_link', target_agent: 'suspense', shared_entity_id: 'BNK-C-8834-G', description: 'FATF-country customer linked to SUS-017 network. KYC gaps + suspicious flows = cross-agent STR case.', severity: 'critical' },
    ],
  },

  // ─── STAFF, ACCESS & CONTROL RISK (CONSOLIDATED) ─────────────────────────
  // Aggregated over Controls (branch), Insider (staff), Access Rights (entitlement).
  // Presents a single cross-layer risk picture; each item carries the evidence
  // from all three sub-engines. The sub-engine demoData blocks below remain for
  // agent-platform page compatibility.
  staffAccess: {
    consolidated_summary: {
      total_staff_analysed: 2462,
      total_branches_analysed: 90,
      total_privileged_users_analysed: 412,
      critical_subjects: 2,
      high_subjects: 5,
      medium_subjects: 8,
      subjects_shown: 3,
      subjects_selection: 'Top 3 cross-layer subjects (critical + 1 high); full list exportable via Reports',
      multi_layer_match_count: 4,
      avg_composite_score: 21,
      network_baseline: 14,
      composition: 'Branch Controls (30%) + Insider Risk (45%) + Access Rights (25%) weighted composite',
    },
    cross_layer_subjects: [
      {
        subject_id: 'STF-1847', subject_type: 'staff', branch_code: 'BR-14', role: 'Senior Credit Officer',
        composite_score: 97, severity: 'critical',
        layers_firing: ['controls', 'insider', 'accessRights'],
        layer_breakdown: {
          controls:     { composite: 41, violations: 4, signal: '87% override concentration + 4 SoD violations + 22.1% off-hours' },
          insider:      { composite: 96, signal: '6D staff-risk score top of network; 18-month no-leave pattern (ACFE red-flag)' },
          accessRights: { composite: 98, signal: 'Toxic Loan-Init + Loan-Approve entitlement combination; privileged review overdue 287 days' },
        },
        narrative: 'Three-layer breach converging on one subject. The access-rights layer made it *possible*, the controls layer made it *visible*, and the insider-risk layer quantifies the *pattern*. Cross-layer composite 97/100 is the highest in the consolidated history.',
        recommended_action: 'IMMEDIATE suspension. Preserve all system access, email, approval logs within 4h evidence-preservation SLA. Engage Legal + HR + Internal Audit. Evaluate CBSL notification under Direction 5/2024.',
      },
      {
        subject_id: 'STF-2341', subject_type: 'staff', branch_code: 'BR-23', role: 'Credit Officer',
        composite_score: 72, severity: 'high',
        layers_firing: ['controls', 'insider'],
        layer_breakdown: {
          controls: { composite: 54, violations: 1, signal: 'Override concentration 61% + 1 SoD violation' },
          insider:  { composite: 72, signal: '6D composite above 70 threshold; approval turnaround materially faster than peer median' },
          accessRights: { composite: null, signal: 'No entitlement-layer finding' },
        },
        narrative: 'Two-layer breach. Absent an entitlement-layer signal, this is a process-discipline issue rather than a system-enabled fraud. Still case-worthy but at investigative-not-suspension tier.',
        recommended_action: 'Enhanced monitoring 90 days. Rotate approver responsibilities at BR-23. Require written explanation of override patterns.',
      },
      {
        subject_id: 'BR-14', subject_type: 'branch', branch_code: 'BR-14',
        composite_score: 88, severity: 'critical',
        layers_firing: ['controls', 'insider', 'accessRights'],
        layer_breakdown: {
          controls:     { composite: 41, signal: 'Branch composite 41/100 — lowest in 90-branch network; fails 5 of 6 control dimensions' },
          insider:      { composite: 96, signal: 'Branch hosts the top-composite staff (STF-1847 at 96/100)' },
          accessRights: { composite: 98, signal: 'Branch manager holds toxic entitlement combination; 4 other staff have dormant-but-privileged accounts' },
        },
        narrative: 'Three-layer failure at branch level — not a single-employee issue. Branch composite 41/100 is a systemic finding; immediate field audit warranted.',
        recommended_action: 'Field audit within 48h. Freeze new credit approvals pending review. Cycle all privileged access at BR-14 through emergency re-attestation.',
      },
    ],
    toxic_combos: [
      { user_id: 'STF-1847', entitlements: ['Loan-Init', 'Loan-Approve'],      severity: 'critical', evidence: 'System-permitted SoD breach; used in 4 confirmed SoD violations at operational layer.' },
      { user_id: 'STF-2103', entitlements: ['MJE-Maker', 'MJE-Approver'],      severity: 'critical', evidence: 'Toxic maker/approver on same user; zero tolerance per policy.' },
      { user_id: 'STF-3341', entitlements: ['CEFT-Init', 'CEFT-Settle'],       severity: 'critical', evidence: 'Payment init + settle on same user.' },
      { user_id: 'STF-4482', entitlements: ['Override-Grant', 'Approve-Any'],  severity: 'high',     evidence: 'Elevated combination; flagged pending review.' },
    ],
    key_findings: [
      { finding: 'Three-layer failure converging on STF-1847 at BR-14: branch controls (41/100 composite), staff behaviour (96/100), access rights (toxic combination + overdue review). Composite 97/100 — the highest consolidated staff-risk score in the system. Multi-layer corroboration boost applied (0.25) pushes case-worthiness well above the 0.85 threshold.', severity: 'critical', anomaly_score: 0.97, primary_driver: 'STF-1847 firing at all three layers simultaneously', secondary_drivers: ['Controls: 4 SoD + 87% override concentration', 'Insider: 6D composite 96/100 + leave red-flag', 'AccessRights: toxic entitlement combo + overdue review'], entity_ids: ['STF-1847', 'BR-14'], recommended_action: 'IMMEDIATE suspension. Evidence-preservation SLA 4h. Three-layer investigation coordinated by Internal Audit.' },
      { finding: 'BR-14 is a branch-level systemic failure — 3 staff with high composite scores, 5 staff with dormant-but-privileged accounts, branch composite 41/100 (lowest in network). Not an isolated-employee issue.', severity: 'critical', anomaly_score: 0.94, primary_driver: 'BR-14 fails all three layers concurrently', secondary_drivers: ['Branch composite 41/100', 'Multiple high-risk staff concentrated at one branch', 'Entitlement-layer hygiene failure branch-wide'], entity_ids: ['BR-14'], recommended_action: 'Field audit within 48h; privileged-access re-attestation cycle at BR-14.' },
      { finding: '4 toxic entitlement combinations exist across the network. Current policy is zero-tolerance. 2 of the 4 are at BR-14; 1 is the subject of a confirmed Controls-layer SoD finding.', severity: 'high', anomaly_score: 0.83, primary_driver: 'Zero-tolerance policy breached 4 times', secondary_drivers: ['Access-rights hygiene network-wide', 'Entitlement split required'], entity_ids: ['STF-1847', 'STF-2103', 'STF-3341', 'STF-4482'], recommended_action: 'Immediate entitlement splits. Review privileged-access governance end-to-end.' },
    ],
    orchestrator_signals: [
      { signal_type: 'three_layer_match', target_agent: 'credit',   shared_entity_id: 'BR-14',      description: 'BR-14 three-layer staff-risk failure. Credit already flags 11 override-approved anomalous loans at this branch. Case-worthy.', severity: 'critical' },
      { signal_type: 'three_layer_match', target_agent: 'creditFraud', shared_entity_id: 'STF-1847', description: 'Same staff responsible for 7 of 9 facilities on the BNK-G-0127 guarantor chain (origination-fraud cluster).', severity: 'critical' },
    ],
  },

  // ─── INTERNAL CONTROLS AGENT ─────────────────────────────────────────────
  controls: {
    controls_summary: {
      total_transactions_analyzed: 18743,
      sod_violations: 7,
      network_override_rate_pct: 4.8,
      high_risk_branches: 4,
      flagged_approvers: 3,
      off_hours_approvals: 143,
      branches_below_threshold: 4,
    },
    sod_violations: [
      { transaction_id: 'TXN-BR14-20251104-0441', branch_code: 'BR-14', staff_id: 'STF-1847', amount_lkr: 8700000, transaction_type: 'Loan disbursement', severity: 'critical' },
      { transaction_id: 'TXN-BR14-20251118-0872', branch_code: 'BR-14', staff_id: 'STF-1847', amount_lkr: 14200000, transaction_type: 'Loan disbursement', severity: 'critical' },
      { transaction_id: 'TXN-BR23-20251207-1203', branch_code: 'BR-23', staff_id: 'STF-2341', amount_lkr: 4100000, transaction_type: 'CEFT transfer approval', severity: 'high' },
      { transaction_id: 'TXN-BR14-20251212-0334', branch_code: 'BR-14', staff_id: 'STF-1847', amount_lkr: 11900000, transaction_type: 'Loan disbursement', severity: 'critical' },
    ],
    branch_risk_scores: [
      { branch_code: 'BR-14', composite_score: 41, override_rate_pct: 14.3, sod_violation_count: 4, off_hours_approval_pct: 22.1, approver_concentration_index: 0.87, risk_tier: 'critical', primary_concern: 'Single approver (STF-1847) responsible for 87% of overrides. 4 SoD violations. Pattern consistent with insider fraud.' },
      { branch_code: 'BR-23', composite_score: 54, override_rate_pct: 9.8, sod_violation_count: 1, off_hours_approval_pct: 11.4, approver_concentration_index: 0.61, risk_tier: 'amber', primary_concern: 'Override rate 9.8% — double the network average. Off-hours approvals elevated.' },
      { branch_code: 'BR-11', composite_score: 58, override_rate_pct: 7.2, sod_violation_count: 1, off_hours_approval_pct: 8.9, approver_concentration_index: 0.44, risk_tier: 'amber', primary_concern: 'Eastern Province branch — override rate elevated post-December events. Control environment strained.' },
      { branch_code: 'BR-56', composite_score: 61, override_rate_pct: 6.8, sod_violation_count: 0, off_hours_approval_pct: 7.1, approver_concentration_index: 0.38, risk_tier: 'amber', primary_concern: 'Override rate above 5% threshold. Matara branch — seasonal agricultural disbursement pressure.' },
      { branch_code: 'BR-41', composite_score: 74, override_rate_pct: 4.2, sod_violation_count: 0, off_hours_approval_pct: 3.8, approver_concentration_index: 0.21, risk_tier: 'green', primary_concern: 'None — within all thresholds.' },
      { branch_code: 'BR-75', composite_score: 82, override_rate_pct: 1.8, sod_violation_count: 0, off_hours_approval_pct: 2.1, approver_concentration_index: 0.14, risk_tier: 'green', primary_concern: 'None — Private Banking Centre performing well.' },
    ],
    flagged_approvers: [
      { staff_id: 'STF-1847', branch_code: 'BR-14', override_count: 34, override_concentration_pct: 87, sod_violations: 4, same_cluster_approvals: 3, off_hours_approvals: 12, risk_narrative: 'CRITICAL: STF-1847 (Ratnapura) is responsible for 87% of branch overrides, has 4 confirmed SoD violations, approved 3 loans to borrowers sharing guarantor addresses, and processed 12 off-hours approvals. Combined pattern is consistent with insider-enabled loan fraud. Immediate suspension recommended.' },
      { staff_id: 'STF-2341', branch_code: 'BR-23', override_count: 11, override_concentration_pct: 61, sod_violations: 1, same_cluster_approvals: 0, off_hours_approvals: 4, risk_narrative: 'HIGH: STF-2341 (Embilipitiya) — elevated override concentration. 1 SoD violation. Pattern is concerning but not yet definitive. Enhanced monitoring and formal explanation required.' },
    ],
    temporal_anomalies: [
      { branch_code: 'BR-14', off_hours_count: 31, off_hours_pct: 22.1, weekend_approvals: 8, risk_interpretation: '22.1% of BR-14 approvals occur outside business hours — 5.5x the network average of 4%. 8 weekend approvals with no documented emergency justification. Consistent with fraudulent activity being conducted to avoid peer observation.' },
    ],
    key_findings: [
      { finding: 'Staff member STF-1847 at BR-14 has 4 confirmed SoD violations, 87% approver concentration, and 12 off-hours approvals. This individual appears to be the primary actor in a suspected insider loan fraud scheme at Ratnapura branch.', severity: 'critical', branch_code: 'BR-14', anomaly_score: 0.97, primary_driver: 'STF-1847 matches multiple insider fraud indicators simultaneously', secondary_drivers: ['4 confirmed SoD violations', '87% approver concentration — highest in network', '12 off-hours approvals consistent with avoiding peer observation'], entity_ids: ['STF-1847', 'BR-14'], recommended_action: 'IMMEDIATE SUSPENSION of STF-1847. Preserve all system access logs. Engage HR and Legal. Brief Head of Internal Audit and CEO. Notify CBSL if regulatory threshold met.' },
      { finding: 'BR-14 composite risk score is 41/100 — the lowest in the Demo Bank network. The branch fails 5 of 6 control dimensions. Systemic control breakdown confirmed across credit, compliance, and operations functions.', severity: 'critical', branch_code: 'BR-14', anomaly_score: 0.95, primary_driver: 'BR-14 composite score 41/100 — systemic control breakdown', secondary_drivers: ['Fails 5 of 6 control dimensions', 'Lowest composite score in Demo Bank network', 'Control failure spans credit, compliance, and operations'], entity_ids: ['BR-14'], recommended_action: 'Deploy Internal Audit field team to BR-14 within 48 hours. Freeze all new credit approvals at this branch until investigation complete.' },
      { finding: '4 branches are below the 65/100 composite risk threshold: BR-14 (41), BR-23 (54), BR-11 (58), BR-56 (61). This represents 4.4% of the branch network with systemic control concerns.', severity: 'high', branch_code: 'Network-wide', anomaly_score: 0.76, primary_driver: '4.4% of branch network below 65/100 composite threshold', secondary_drivers: ['BR-14 at 41 — confirmed insider fraud', 'BR-23 at 54 — elevated override rate', 'BR-11 and BR-56 approaching threshold boundary'], entity_ids: ['BR-14', 'BR-23', 'BR-11', 'BR-56'], recommended_action: 'Schedule targeted audits for all 4 branches within Q1 2026. Apply enhanced monitoring and daily exception reporting.' },
    ],
    orchestrator_signals: [
      { signal_type: 'insider_fraud_confirmed', target_agent: 'credit', shared_entity_id: 'STF-1847', description: 'STF-1847 at BR-14 confirmed as high-risk insider — cross-reference with all loans approved by this individual.', severity: 'critical' },
      { signal_type: 'kyc_cross_check', target_agent: 'kyc', shared_entity_id: 'BR-14', description: 'BR-14 systemic control failure — KYC gaps at 12.4% consistent with introducer fraud pattern.', severity: 'critical' },
    ],
  },

  // ─── DIGITAL FRAUD & IDENTITY AGENT ──────────────────────────────────────
  digital: {
    digital_summary: {
      total_sessions_analyzed: 148247,
      anomalous_sessions: 312,
      critical_sessions: 23,
      impossible_travel_cases: 4,
      unregistered_device_high_value: 18,
      mfa_challenges_triggered: 89,
      population_shift_detected: false,
      psi_score: 0.07,
    },
    anomalous_sessions: [
      { session_id: 'SES-BNK-20251220-8847', branch_code: 'BR-72', account_id: 'BNK-0841-X', anomaly_type: 'Behavioral anomaly + unregistered device + off-hours', behavioral_score: 28, risk_score: 0.94, device_registered: false, geo_anomaly: false, impossible_travel: false, max_txn_lkr: 4950000, mfa_triggered: true, mfa_passed: false, explanation: 'Session at 23:47 from unregistered device. Behavioral biometric score 28/100 vs user baseline 86. Navigation pattern: direct to CEFT transfer without browsing — inconsistent with 14 months of user history. MFA triggered, failed, session attempted to continue. Blocked.', recommended_action: 'Account BNK-0841-X temporarily suspended pending owner verification. Force full device re-registration and identity verification before reinstatement.' },
      { session_id: 'SES-BNK-20251218-9121', branch_code: 'BR-34', account_id: 'BNK-3312-B', anomaly_type: 'Impossible travel — Jaffna to Colombo in 18 minutes', behavioral_score: 61, risk_score: 0.88, device_registered: true, geo_anomaly: true, impossible_travel: true, max_txn_lkr: 14800000, mfa_triggered: true, mfa_passed: true, explanation: 'Login from Jaffna IP at 14:32. CEFT transfer initiated from Colombo IP at 14:50. 18-minute gap; minimum Jaffna-Colombo travel time is 330 minutes. MFA passed — suggests SIM swap or credential + OTP sharing.', recommended_action: 'Flag for SIM swap investigation. Contact account owner via registered alternate channel. Reverse CEFT transfer if within dispute window.' },
      { session_id: 'SES-BNK-20251215-7734', branch_code: 'BR-14', account_id: 'BNK-7741-C', anomaly_type: 'First-use device + immediate high-value transfer', behavioral_score: 44, risk_score: 0.82, device_registered: false, geo_anomaly: false, impossible_travel: false, max_txn_lkr: 9800000, mfa_triggered: true, mfa_passed: true, explanation: 'Device registered to account for first time at 02:17. Within 4 minutes, RTGS transfer of LKR 9.8M initiated. Off-hours (02:21). MFA passed. Pattern consistent with account takeover using stolen credentials and newly registered device to bypass device-fingerprint checks.', recommended_action: 'Reverse RTGS transfer if within SLA window. Notify account owner. Require full identity re-verification before account reinstatement.' },
      { session_id: 'SES-BNK-20251210-6612', branch_code: 'BR-14', account_id: 'BNK-STF-1847', anomaly_type: 'Staff account — off-hours access to loan management system', behavioral_score: 57, risk_score: 0.78, device_registered: true, geo_anomaly: false, impossible_travel: false, max_txn_lkr: 0, mfa_triggered: false, mfa_passed: true, explanation: 'Staff account STF-1847 (flagged by Internal Controls Agent) accessed loan management system at 21:43 on a Saturday. Downloaded 3 loan documentation files. No transaction initiated — access pattern suggests document alteration or data extraction.', recommended_action: 'Preserve access logs. Cross-reference with Internal Controls investigation. Escalate to IT Security and Internal Audit.' },
    ],
    impossible_travel_cases: [
      { account_id: 'BNK-3312-B', session_id: 'SES-BNK-20251218-9121', from_city: 'Jaffna', to_city: 'Colombo', time_elapsed_minutes: 18, minimum_travel_minutes: 330, risk_interpretation: 'Impossible travel. 18 minutes vs 330 minimum. SIM swap or credential sharing suspected. MFA was passed — indicates OTP was compromised.' },
      { account_id: 'BNK-5523-D', session_id: 'SES-BNK-20251219-4421', from_city: 'Kandy', to_city: 'Colombo', time_elapsed_minutes: 12, minimum_travel_minutes: 150, risk_interpretation: 'Impossible travel. 12 minutes vs 150 minimum. Account is corporate — verify if multiple authorized users share credentials.' },
    ],
    device_sharing_clusters: [
      { device_id: 'DEV-A4F7-9921', account_count: 4, account_ids: ['BNK-8834-G', 'BNK-2209-F', 'BNK-0093-T', 'BNK-4412-R'], risk: 'critical', interpretation: 'One device accessing 4 distinct accounts. Two accounts are in the SUS-017 suspicious network. Device sharing across multiple accounts is a money mule coordination indicator.' },
    ],
    population_shift: {
      detected: false,
      psi_score: 0.07,
      mean_behavioral_score: 74.2,
      expected_mean: 75.0,
      interpretation: 'Current population PSI score 0.07 — below the 0.10 recalibration threshold. No significant model drift detected in the existing Demo Bank customer population. Note: PSI monitoring will be critical when HSBC migration batch is integrated.',
      recommendation: 'Maintain current model. Rerun PSI assessment immediately upon HSBC migration batch integration.',
    },
    key_findings: [
      { finding: 'Staff member STF-1847 (flagged by Internal Controls Agent) accessed the loan management system at 21:43 on a Saturday and downloaded loan documentation files. Off-hours document access by a flagged insider is a critical evidence preservation concern.', severity: 'critical', affected_account_count: 1, anomaly_score: 0.93, primary_driver: 'Flagged insider STF-1847 accessing loan system off-hours on weekend', secondary_drivers: ['Downloaded loan documentation files at 21:43 Saturday', 'Corroborates Internal Controls Agent insider fraud finding', 'Evidence preservation risk — potential document alteration'], entity_ids: ['STF-1847', 'BR-14'], recommended_action: 'Immediately preserve all system access logs for STF-1847. Lock document access. Coordinate with Internal Audit investigation.' },
      { finding: '4 impossible travel cases detected — 2 with MFA passed, suggesting SIM swap or OTP sharing. Combined high-value transaction exposure in these sessions: LKR 38.6 Mn.', severity: 'high', affected_account_count: 4, anomaly_score: 0.82, primary_driver: 'Impossible travel with MFA bypass indicating SIM swap or credential sharing', secondary_drivers: ['4 impossible travel cases detected', '2 cases passed MFA despite physical impossibility', 'LKR 38.6 Mn combined high-value exposure'], entity_ids: [], recommended_action: 'Contact all 4 account holders via registered alternate channel. Investigate SIM swap possibility with telco. Review MFA methodology — consider push notification over SMS OTP.' },
      { finding: 'Device DEV-A4F7-9921 is shared across 4 accounts, two of which are linked to the SUS-017 suspicious network. This device may be used to coordinate fraudulent activity.', severity: 'critical', affected_account_count: 4, anomaly_score: 0.92, primary_driver: 'Single device coordinating access across 4 accounts linked to SUS-017 network', secondary_drivers: ['Device DEV-A4F7-9921 shared across 4 accounts', '2 accounts in SUS-017 suspicious network', 'Money mule coordination indicator'], entity_ids: ['SUS-017'], recommended_action: 'Block device DEV-A4F7-9921. Freeze all 4 accounts pending investigation. Coordinate with Transaction Agent investigation of SUS-017 network.' },
    ],
    orchestrator_signals: [
      { signal_type: 'insider_digital_evidence', target_agent: 'controls', shared_entity_id: 'STF-1847', description: 'STF-1847 accessed loan system off-hours and downloaded documents. Digital evidence confirms insider threat.', severity: 'critical' },
      { signal_type: 'device_network_link', target_agent: 'transaction', shared_entity_id: 'DEV-A4F7-9921', description: 'Device shared across 4 accounts linked to SUS-017 network. Device is coordination hub for fraudulent activity.', severity: 'critical' },
    ],
  },

  // ─── INSIDER RISK AGENT ──────────────────────────────────────────────────
  // Staff-level composite scoring. Complements Controls (branch-level) and
  // AccessRights (entitlement-level). When the staff-access consolidation
  // ships, this block will merge into a unified staff_profiles array.
  insider: {
    insider_summary: {
      total_staff_analysed: 2462,
      flagged_staff: 12,
      critical_staff: 2,
      high_staff: 4,
      medium_staff: 6,
      flagged_staff_shown: 5,
      flagged_staff_selection: 'Top 5 by composite risk score (all critical + 3 of 4 high); full list exportable via Reports',
      avg_network_risk_score: 18,
      network_risk_baseline: 14,
      risk_score_method: 'Weighted composite across 6 dimensions: SoD violations (25%), override concentration (20%), off-hours activity (18%), same-cluster approvals (18%), approval turnaround anomaly (12%), session deviation (7%). Scored 0–100.',
    },
    flagged_staff: [
      {
        staff_id: 'STF-1847', branch_code: 'BR-14', role: 'Senior Credit Officer', tenure_years: 8,
        composite_risk_score: 96,
        dimensions: {
          sod_violations: { count: 4, score: 25, contribution: 25.0 },
          override_concentration: { pct: 87, score: 20, contribution: 20.0 },
          off_hours_activity: { pct: 22.1, score: 18, contribution: 18.0 },
          same_cluster_approvals: { count: 3, score: 18, contribution: 18.0 },
          approval_turnaround_anomaly: { median_sec: 84, peer_median_sec: 1080, score: 12, contribution: 12.0 },
          session_deviation: { behavioral_score: 57, baseline: 86, score: 7, contribution: 3.0 },
        },
        severity: 'critical',
        behavioral_narrative: 'STF-1847 matches five of six insider-fraud indicators simultaneously. Single approver for 87% of BR-14 overrides, 4 confirmed SoD violations, 22.1% of approvals outside business hours, 3 loans approved to borrowers sharing guarantor addresses, and approval turnaround of 84 seconds median (peer median 18 minutes). Digital agent also flags off-hours loan-system document access on Saturday 21:43. Pattern is definitive for insider-enabled loan fraud.',
        leave_pattern: 'No annual leave taken in 18 months — a known insider-fraud indicator (ACFE 2024 red-flag list).',
        linked_findings: ['credit::BNK-CR-2025-0441', 'credit::BNK-CR-2025-0872', 'controls::BR-14', 'digital::SES-BNK-20251210-6612', 'mje::MJE-2026-4201', 'mje::MJE-2026-4205'],
        recommended_action: 'IMMEDIATE SUSPENSION pending Internal Audit + HR investigation. Preserve all system access, email, and approval logs. Coordinate with Legal for evidence chain-of-custody. Consider CBSL notification under Direction 5/2024.',
      },
      {
        staff_id: 'STF-2341', branch_code: 'BR-23', role: 'Credit Officer', tenure_years: 5,
        composite_risk_score: 72,
        dimensions: {
          sod_violations: { count: 1, score: 25, contribution: 6.25 },
          override_concentration: { pct: 61, score: 20, contribution: 14.2 },
          off_hours_activity: { pct: 11.4, score: 18, contribution: 9.1 },
          same_cluster_approvals: { count: 0, score: 18, contribution: 0 },
          approval_turnaround_anomaly: { median_sec: 192, peer_median_sec: 1080, score: 12, contribution: 10.6 },
          session_deviation: { behavioral_score: 72, baseline: 80, score: 7, contribution: 2.1 },
        },
        severity: 'high',
        behavioral_narrative: 'Elevated override concentration (61%) at BR-23 with 1 SoD violation. Approval turnaround materially faster than peer median. Pattern is concerning but not yet definitive for insider fraud.',
        leave_pattern: 'Annual leave current. No pattern red-flags.',
        linked_findings: ['controls::BR-23', 'credit::BNK-CR-2025-0334'],
        recommended_action: 'Enhanced monitoring for 90 days. Require formal written explanation of override patterns. Rotate approver responsibilities at BR-23.',
      },
      {
        staff_id: 'STF-3102', branch_code: 'Finance', role: 'Senior Finance Officer', tenure_years: 12,
        composite_risk_score: 68,
        dimensions: {
          sod_violations: { count: 0, score: 25, contribution: 0 },
          override_concentration: { pct: 0, score: 20, contribution: 0 },
          off_hours_activity: { pct: 19.4, score: 18, contribution: 15.5 },
          same_cluster_approvals: { count: 0, score: 18, contribution: 0 },
          approval_turnaround_anomaly: { median_sec: 180, peer_median_sec: 600, score: 12, contribution: 8.4 },
          session_deviation: { behavioral_score: 64, baseline: 82, score: 7, contribution: 4.1 },
        },
        severity: 'high',
        behavioral_narrative: 'Finance officer approving MJE-2026-4203 (LKR 45M provision) with 3-minute turnaround on a 23:58 entry. No SoD breach, but late-night approval speed is incompatible with a genuine review of a material provision. Pattern of approving late-night Finance MJEs by the same individual across 6 entries in Q1 2026.',
        leave_pattern: 'Reduced leave usage trend — 4 days taken in last 12 months against 14-day entitlement.',
        linked_findings: ['mje::MJE-2026-4203'],
        recommended_action: 'Review MJE approval protocol — Finance materiality threshold LKR 10M requires supporting IFRS 9 ECL document. Require Head-of-Finance sign-off on all >LKR 25M provisions.',
      },
      {
        staff_id: 'STF-3891', branch_code: 'Treasury', role: 'Treasury Dealer', tenure_years: 3,
        composite_risk_score: 58,
        dimensions: {
          sod_violations: { count: 0, score: 25, contribution: 0 },
          override_concentration: { pct: 0, score: 20, contribution: 0 },
          off_hours_activity: { pct: 8.1, score: 18, contribution: 6.5 },
          same_cluster_approvals: { count: 0, score: 18, contribution: 0 },
          approval_turnaround_anomaly: { median_sec: 600, peer_median_sec: 600, score: 12, contribution: 0 },
          session_deviation: { behavioral_score: 58, baseline: 78, score: 7, contribution: 5.2 },
        },
        severity: 'high',
        behavioral_narrative: 'Treasury dealer TRD-047 with weekend NOSTRO entry and two FX position breaches flagged by Trade agent. Session behavioural score trending below baseline since Feb 2026 — possible disengagement or external-pressure indicator.',
        leave_pattern: 'Pattern typical for Treasury desk.',
        linked_findings: ['mje::MJE-2026-4207', 'trade::FX-USD-20251218-441', 'trade::FX-EUR-20251219-882'],
        recommended_action: 'Review FX limit breach escalation with Head of Treasury. Include dealer in next behavioural baseline recalibration.',
      },
      {
        staff_id: 'STF-1109', branch_code: 'Operations', role: 'Reconciliation Officer', tenure_years: 2,
        composite_risk_score: 44,
        dimensions: {
          sod_violations: { count: 0, score: 25, contribution: 0 },
          override_concentration: { pct: 0, score: 20, contribution: 0 },
          off_hours_activity: { pct: 6.2, score: 18, contribution: 5.0 },
          same_cluster_approvals: { count: 0, score: 18, contribution: 0 },
          approval_turnaround_anomaly: { median_sec: 720, peer_median_sec: 600, score: 12, contribution: 0 },
          session_deviation: { behavioral_score: 78, baseline: 80, score: 7, contribution: 0.6 },
        },
        severity: 'medium',
        behavioral_narrative: 'Medium-risk flag owing only to association with SUS-017 (reconciliation officer responsible for the CEFT receivables account under investigation). No independent behavioural red-flags.',
        leave_pattern: 'Normal.',
        linked_findings: ['mje::MJE-2026-4206', 'suspense::SUS-017'],
        recommended_action: 'Include in SUS-017 investigation witness list; no immediate action against individual.',
      },
    ],
    risk_score_distribution: [
      { band: '90–100 (critical)', count: 1, pct: 0.04, narrative: 'STF-1847 — sole critical insider. Typical for a 2,462-staff bank: 0.04% expected; Demo Bank sits at that baseline.' },
      { band: '70–89 (high)',       count: 4, pct: 0.16, narrative: '4 staff in high band. Peer median is 0.12% per ACFE 2024 — Demo Bank slightly elevated.' },
      { band: '50–69 (medium)',     count: 7, pct: 0.28, narrative: '7 medium-risk staff. Dominated by off-hours activity + approval turnaround anomalies.' },
      { band: '30–49 (watch)',      count: 24, pct: 0.97, narrative: 'Watch band; routine monitoring only.' },
      { band: '0–29 (baseline)',    count: 2426, pct: 98.55, narrative: 'Remaining 98.55% of staff inside baseline.' },
    ],
    cross_agent_corroboration: [
      { staff_id: 'STF-1847', agents_corroborating: ['controls', 'credit', 'digital', 'mje', 'kyc'], correlation_strength: 0.98, narrative: '5-agent corroboration — highest in current data. Case-worthy per orchestrator threshold (0.85).' },
      { staff_id: 'STF-2341', agents_corroborating: ['controls', 'credit'],                         correlation_strength: 0.74, narrative: '2-agent corroboration. Below case-worthy threshold but warrants enhanced monitoring.' },
      { staff_id: 'STF-3102', agents_corroborating: ['mje'],                                         correlation_strength: 0.52, narrative: 'Single-agent signal. Not case-worthy alone; add to review pipeline.' },
    ],
    key_findings: [
      { finding: 'STF-1847 composite risk score 96/100 — the highest staff risk score in the Demo Bank network. 5-agent corroboration (Controls, Credit, Digital, MJE, KYC) confirms insider-enabled loan fraud pattern. Case-worthy under orchestrator rules (correlation 0.98 vs 0.85 threshold).', severity: 'critical', anomaly_score: 0.98, primary_driver: '5-agent corroboration of insider fraud pattern against STF-1847', secondary_drivers: ['Composite risk 96/100 — highest in network', 'SoD + override concentration + off-hours + cluster approvals', '18-month leave non-usage (ACFE red-flag)'], entity_ids: ['STF-1847', 'BR-14'], recommended_action: 'IMMEDIATE SUSPENSION of STF-1847. Preserve all system logs. Engage HR + Legal + Internal Audit. CBSL notification evaluation under Direction 5/2024.' },
      { finding: 'Network avg staff risk score 18/100 vs peer baseline 14/100 — 29% above benchmark. Driven by concentration at BR-14 and elevated off-hours activity cluster in Finance.', severity: 'high', anomaly_score: 0.78, primary_driver: 'Network staff risk 29% above peer baseline', secondary_drivers: ['BR-14 concentration of high-risk staff', 'Off-hours activity cluster in Finance', '4 staff in high-severity band vs peer-median 3'], entity_ids: [], recommended_action: 'Commission HR-led control environment review at BR-14 and Finance. Incorporate staff-risk dashboard into quarterly operating committee.' },
    ],
    orchestrator_signals: [
      { signal_type: 'staff_risk_cross_ref', target_agent: 'controls',     shared_entity_id: 'STF-1847', description: 'Staff composite 96/100 corroborates branch-level control findings.', severity: 'critical' },
      { signal_type: 'staff_risk_cross_ref', target_agent: 'mje',          shared_entity_id: 'STF-1847', description: 'Same staff responsible for MJE-2026-4201 + 4205. Journal-integrity + insider patterns converge.', severity: 'critical' },
      { signal_type: 'staff_risk_cross_ref', target_agent: 'digital',      shared_entity_id: 'STF-1847', description: 'Off-hours loan-system document download session SES-BNK-20251210-6612 attributed to this staff.', severity: 'critical' },
    ],
  },

  // ─── TRADE FINANCE & TREASURY AGENT ──────────────────────────────────────
  trade: {
    trade_summary: {
      documents_analyzed: 847,
      pricing_anomalies: 6,
      pricing_anomalies_shown: 3,
      pricing_anomalies_selection: 'Top 3 by illicit flow magnitude; 3 additional minor cases exportable via Reports',
      duplicate_lc_cases: 2,
      high_risk_country_transactions: 3,
      estimated_suspicious_flow_lkr: 412000000,
      tbml_risk_accounts: 4,
    },
    pricing_anomalies: [
      { document_id: 'INV-2025-3441', customer_id: 'BNK-CORP-0887', hs_code: '6203', commodity_description: 'Men\'s apparel — woven fabric', declared_unit_price: 34.70, benchmark_unit_price: 18.20, deviation_pct: 90.7, anomaly_type: 'over_invoicing', estimated_illicit_flow_lkr: 187000000, counterparty_country: 'UAE', explanation: 'Apparel exported at USD 34.70/unit vs HS code 6203 industry benchmark USD 18.20/unit — 91% premium. Combined with UAE counterparty (elevated TBML risk), this pattern is consistent with over-invoicing to extract foreign currency.' },
      { document_id: 'INV-2025-4112', customer_id: 'BNK-CORP-2341', hs_code: '0901', commodity_description: 'Coffee — unroasted', declared_unit_price: 2.10, benchmark_unit_price: 4.80, deviation_pct: -56.3, anomaly_type: 'under_invoicing', estimated_illicit_flow_lkr: 78000000, counterparty_country: 'Germany', explanation: 'Coffee exported at USD 2.10/kg vs global benchmark USD 4.80/kg — 56% below market. Under-invoicing at this scale suggests value transfer to overseas counterparty — a trade-based wealth migration technique.' },
      { document_id: 'INV-2025-5881', customer_id: 'BNK-CORP-4412', hs_code: '7108', commodity_description: 'Gold — unwrought', declared_unit_price: 28.00, benchmark_unit_price: 62.50, deviation_pct: -55.2, anomaly_type: 'under_invoicing', estimated_illicit_flow_lkr: 147000000, counterparty_country: 'Singapore', explanation: 'Precious metal export at USD 28/gram vs spot benchmark USD 62.50/gram. Significant under-invoicing on gold export is a known TBML vector. FATF has flagged Sri Lanka-Singapore gold trade corridors.', },
    ],
    duplicate_lc_cases: [
      { customer_id: 'BNK-CORP-0887', branch_code: 'BR-16', lc_reference_1: 'LC-2025-3341', lc_reference_2: 'LC-2025-3687', overlap_period: '15 Nov 2025 – 31 Dec 2025', combined_amount_lkr: 234000000, explanation: 'Same corporate customer (BNK-CORP-0887) has two overlapping LC applications for apparel exports with identical HS codes and overlapping shipment periods. Combined value LKR 234 Mn. This customer is also flagged for over-invoicing — compound TBML risk.' },
    ],
    treasury_breaches: [
      { position_id: 'FX-USD-20251218-441', currency_pair: 'USD/LKR', position_amount: 8700000, approved_limit: 7500000, breach_pct: 16, trader_id: 'TRD-047', intraday_only: true, severity: 'medium' },
      { position_id: 'FX-EUR-20251219-882', currency_pair: 'EUR/LKR', position_amount: 4200000, approved_limit: 3500000, breach_pct: 20, trader_id: 'TRD-047', intraday_only: false, severity: 'high' },
    ],
    nop_summary: {
      usd_position: 12400000,
      eur_position: 3800000,
      gbp_position: 1200000,
      sgd_position: 890000,
      total_nop_lkr_equivalent: 6230000000,
      concentration_risk: false,
    },
    liquidity_trends: {
      lcr_current: 203.4,
      lcr_trend: 'declining',
      nsfr_current: 138.3,
      nsfr_trend: 'declining',
      commentary: 'Both LCR and NSFR have declined materially in 2025 — LCR from 320.6% to 203.4% (-37%), NSFR from 154.7% to 138.3% (-11%). This is consistent with 50% loan growth outpacing stable funding base. Both metrics remain above regulatory minimums (100%) but headroom is contracting. Continued aggressive lending without commensurate deposit growth will pressure LCR below 200% in Q2 2026.',
    },

    counterparty_network: {
      ubo_conflicts: [
        { customer_id: 'BNK-CORP-0887', linked_accounts: ['BNK-CORP-2341', 'BNK-CORP-4490'], ubo_declared: 'Abdul R. Mansoor (100%)', ubo_linked: 'Same UBO across 3 corporate accounts with different beneficial ownership declarations', risk: 'critical', combined_exposure_lkr: 892000000 },
        { customer_id: 'BNK-CORP-4412', linked_accounts: ['BNK-CORP-5512'], ubo_declared: 'Sunrise Holdings (BVI)', ubo_linked: 'BVI shell company — same registered agent as BNK-CORP-0887. Potential common ownership.', risk: 'high', combined_exposure_lkr: 341000000 },
      ],
      roundtrip_lc: [
        { lc_reference: 'LC-2025-3341', customer_id: 'BNK-CORP-0887', amount_lkr: 234000000, finding: 'LC issued by Demo Bank backed by a fixed deposit of the same customer. Goods imported, re-exported, and re-imported within 90 days. Net trade value: zero. LC financing used to generate artificial turnover and KYC activity.', supporting_deposit_id: 'FD-BNK-0887-2025', risk_score: 0.92 },
      ],
      multi_bank_structuring: [
        { customer_id: 'BNK-CORP-2341', finding: 'Same HS code (0901 coffee) invoiced through Demo Bank, Sampath Bank, and Commercial Bank within same quarter. Combined LC values suggest single shipment financed three times at three institutions.', evidence: 'SL Customs import manifest cross-reference', risk_score: 0.87, estimated_double_financing_lkr: 378000000 },
      ],
    },
    hqla_breakdown: {
      total_hqla_lkr: 41200000000,
      level1_govt_securities: 28400000000,
      level1_cbsl_reserves: 7800000000,
      level2a_assets: 5000000000,
      level2b_assets: 0,
      concentration_risk: 'Level 1 government securities concentrated in 3-5 year maturity band — duration mismatch risk in rising rate environment',
      hqla_trend: [
        { q: 'Q1 25', hqla: 52100000000 },
        { q: 'Q2 25', hqla: 49800000000 },
        { q: 'Q3 25', hqla: 46300000000 },
        { q: 'Q4 25', hqla: 41200000000 },
      ],
    },
    liquidity_stress: {
      scenario_30d_outflow_lkr: 48600000000,
      hqla_coverage: 41200000000,
      stress_lcr: 84.8,
      stress_lcr_passes_minimum: false,
      key_assumptions: [
        { item: 'Retail deposit runoff rate', stressed: '10% (Basel III standard)', actual_used: '12% given HSBC migration uncertainty' },
        { item: 'Corporate deposit runoff', stressed: '25% (Basel III)', actual_used: '40% (3 top 10 depositors at risk)' },
        { item: 'LC drawdown probability', stressed: '100% of committed undrawn', actual_used: '100%' },
        { item: 'HQLA haircut', stressed: '0% L1, 15% L2A', actual_used: 'Standard applied' },
      ],
      early_warning_indicators: [
        { indicator: 'Wholesale funding >20% of total funding', current: '23.4%', threshold: '20%', status: 'breached', trend: 'Increasing' },
        { indicator: 'Top 10 depositor concentration', current: '31.2%', threshold: '30%', status: 'breached', trend: 'Stable' },
        { indicator: 'Loan-to-deposit ratio', current: '85.7%', threshold: '80%', status: 'breached', trend: 'Increasing' },
        { indicator: 'HQLA as % of total assets', current: '5.9%', threshold: '8%', status: 'breached', trend: 'Declining' },
        { indicator: 'Unencumbered HQLA coverage of next 30d net outflows', current: '84.8%', threshold: '100%', status: 'breached', trend: 'Declining' },
      ],
      funding_concentration: [
        { depositor: 'Top depositor (concealed)', amount_lkr: 8200000000, pct_of_funding: 9.1, type: 'Corporate current', maturity: 'On demand', risk: 'Single depositor withdrawal could breach LCR minimum' },
        { depositor: 'Depositors 2-5 (concealed)', amount_lkr: 12400000000, pct_of_funding: 13.8, type: 'Mixed', maturity: 'Mix 30-90d', risk: 'Rollover risk at current rate environment' },
        { depositor: 'Depositors 6-10 (concealed)', amount_lkr: 7700000000, pct_of_funding: 8.6, type: 'Term', maturity: '90-180d', risk: 'Moderate' },
      ],
    },
    key_findings: [
      { finding: 'Customer BNK-CORP-0887 is flagged for both over-invoicing (HS 6203, 91% above benchmark) AND duplicate LC applications on overlapping shipments. Combined TBML exposure: LKR 421 Mn. This customer also appeared in Transaction Agent structuring cluster analysis.', severity: 'critical', affected_exposure_lkr: 421000000, anomaly_score: 0.95, primary_driver: 'BNK-CORP-0887 compound TBML — over-invoicing plus duplicate LCs', secondary_drivers: ['Over-invoicing at 91% above benchmark on HS 6203', 'Duplicate LC applications on overlapping shipments', 'Cross-agent corroboration from Transaction Agent structuring analysis'], entity_ids: ['BNK-CORP-0887'], recommended_action: 'Suspend LC processing for BNK-CORP-0887. Escalate to CBSL FIU for TBML investigation. File STR. Conduct customer exit assessment.' },
      { finding: 'Gold export under-invoicing (HS 7108) — declared price 55% below spot benchmark. LKR 147 Mn estimated illicit outflow through precious metal trade route. FATF-flagged corridor.', severity: 'high', affected_exposure_lkr: 147000000, anomaly_score: 0.83, primary_driver: 'Gold export under-invoicing at 55% below spot benchmark', secondary_drivers: ['LKR 147 Mn estimated illicit outflow', 'FATF-flagged Sri Lanka-Singapore gold trade corridor', 'HS 7108 precious metal trade vector'], entity_ids: ['BNK-CORP-4412'], recommended_action: 'Refer BNK-CORP-4412 for enhanced trade finance review. Require customs/export board certification before further gold export financing.' },
      { finding: 'LCR has declined 37% in 2025 (320.6% to 203.4%). At current lending growth rate, LCR will breach 200% amber threshold in Q1 2026 and approach the critical 150% boundary by Q3 2026 without liability-side action.', severity: 'high', affected_exposure_lkr: 0, anomaly_score: 0.77, primary_driver: 'LCR declining 37% in 2025 — approaching regulatory thresholds', secondary_drivers: ['LCR from 320.6% to 203.4% in 12 months', 'Projected breach of 200% amber threshold in Q1 2026', 'Loan growth outpacing stable funding base'], entity_ids: [], recommended_action: 'Treasury to present LCR stabilization plan to ALCO. Consider term deposit campaign and REPO facility to shore up HQLA buffer before Q2 2026 HSBC integration.' },
    ],
    orchestrator_signals: [
      { signal_type: 'tbml_cross_reference', target_agent: 'transaction', shared_entity_id: 'BNK-CORP-0887', description: 'Trade TBML suspect BNK-CORP-0887 also appears in Transaction Agent structuring analysis. Cross-agent STR case.', severity: 'critical' },
      { signal_type: 'kyc_pep_trade', target_agent: 'kyc', shared_entity_id: 'BNK-CORP-4412', description: 'Gold export under-invoicing — verify beneficial ownership and PEP screening for BNK-CORP-4412.', severity: 'high' },
    ],
  },

  // ─── MJE TESTING AGENT ───────────────────────────────────────────────
  mje: {
    mje_summary: {
      total_entries_tested: 847,
      flagged_count: 23,
      escalated_count: 5,
      benford_failures: 8,
      sod_violations: 3,
      after_hours_entries: 12,
      avg_risk_score: 34,
    },
    mje_entries: [
      { entry_id: 'MJE-2026-4201', gl_account: 'SUS-001', gl_name: 'CEFT Receivables Suspense', amount_lkr: 185000000, staff_id: 'STF-1847', department: 'Operations', cost_centre: 'Operations', timestamp: '2026-01-14T22:45:00Z', entry_time: '22:45', day_of_week: 'Tuesday', risk_score: 92, flags: ['After-hours','Round number','Suspense GL','Missing approval docs'], benford_result: 'Fail', status: 'Escalated', maker_id: 'STF-1847', checker_id: 'STF-1847', approver_id: 'STF-1847', sod_violation: true, debit_account: 'SUS-001', credit_account: '2999-CLEARING', doc_completeness_pct: 33, fs_impact: 'Balance Sheet: Suspense balance artificially inflated', reversal_chain: 'Original → Reversal → Repost (3-step chain)', explanation: 'High-risk MJE: after-hours posting to suspense GL by same person who initiated and approved. Missing invoice and approval documents. Reversal chain detected — aging clock potentially reset.', recommended_action: 'Escalate to Head of Accounting. Obtain supporting documents within 48h. Investigate reversal chain and link to insider risk profile of STF-1847.' },
      { entry_id: 'MJE-2026-4202', gl_account: 'SUS-044', gl_name: 'Fee Suspense BR-14', amount_lkr: 9450000, staff_id: 'STF-1847', department: 'Operations', cost_centre: 'Operations', timestamp: '2026-01-21T23:10:00Z', entry_time: '23:10', day_of_week: 'Wednesday', risk_score: 88, flags: ['After-hours','Suspense GL','SoD violation'], benford_result: 'Fail', status: 'Escalated', maker_id: 'STF-1847', checker_id: 'STF-1847', approver_id: 'STF-1847', sod_violation: true, debit_account: 'SUS-044', credit_account: 'EXT-ACCT', doc_completeness_pct: 33, fs_impact: 'Balance Sheet: Fee suspense posting, external credit', reversal_chain: null, explanation: 'Second after-hours SoD violation by STF-1847 within 7 days. Amount to external account. Both maker and approver ID identical.', recommended_action: 'Immediate escalation. Freeze SUS-044 pending investigation. Cross-reference with STF-1847 insider risk profile.' },
      { entry_id: 'MJE-2026-4203', gl_account: '3200', gl_name: 'Provision for Loan Losses', amount_lkr: 45000000, staff_id: 'STF-2341', department: 'Finance', cost_centre: 'Finance', timestamp: '2026-02-10T23:58:00Z', entry_time: '23:58', day_of_week: 'Monday', risk_score: 85, flags: ['After-hours','Round number','High amount','Provision account'], benford_result: 'Fail', status: 'Flagged', maker_id: 'STF-2341', checker_id: 'STF-3102', approver_id: 'STF-3102', sod_violation: false, debit_account: '3200', credit_account: '1999-CONTRA', doc_completeness_pct: 67, fs_impact: 'P&L: Provision charge impacts profitability reporting', reversal_chain: null, explanation: 'Round-number after-hours posting to provision account. Approval turnaround 3 minutes — insufficient for LKR 45M provision review. Missing IFRS 9 ECL calculation backing document.', recommended_action: 'Obtain ECL calculation document. Review Board approval for provision above materiality threshold of LKR 10M.' },
      { entry_id: 'MJE-2026-4205', gl_account: '1200', gl_name: 'Loans Receivable', amount_lkr: 185000000, staff_id: 'STF-1847', department: 'Operations', cost_centre: 'Operations', timestamp: '2026-02-28T00:15:00Z', entry_time: '00:15', day_of_week: 'Wednesday', risk_score: 97, flags: ['Midnight','Round number','Month-end','Capital account','Materiality breach'], benford_result: 'Fail', status: 'Escalated', maker_id: 'STF-1847', checker_id: 'STF-1847', approver_id: 'STF-1847', sod_violation: true, debit_account: '1200', credit_account: '2999-CLEARING', doc_completeness_pct: 0, fs_impact: 'Balance Sheet: Loans receivable balance inflated at month-end', reversal_chain: 'Original → Reversal (2-step — reversal pending)', explanation: 'Highest risk MJE: midnight month-end round-number posting to loans receivable with no supporting documents. SoD violation. LKR 185M exceeds materiality threshold. No documents present.', recommended_action: 'IMMEDIATE ESCALATION to CFO and Head of Internal Audit. Reverse entry pending investigation. Preserve all system logs for STF-1847.' },
      { entry_id: 'MJE-2026-4206', gl_account: '4200', gl_name: 'Fee Income', amount_lkr: 850000, staff_id: 'STF-1109', department: 'Operations', cost_centre: 'Operations', timestamp: '2026-03-05T09:15:00Z', entry_time: '09:15', day_of_week: 'Thursday', risk_score: 48, flags: ['Suspense GL link'], benford_result: 'Pass', status: 'Under Review', maker_id: 'STF-1109', checker_id: 'STF-3201', approver_id: 'STF-3201', sod_violation: false, debit_account: 'SUS-017', credit_account: '4200', doc_completeness_pct: 100, fs_impact: 'P&L: Fee income recognition from SUS-017 account', reversal_chain: null, explanation: 'Business-hours entry with proper maker-checker. Flagged only because source account is SUS-017 which is under investigation. Documents complete.', recommended_action: 'Review in context of SUS-017 investigation. Entry itself appears procedurally correct.' },
      { entry_id: 'MJE-2026-4207', gl_account: '1100', gl_name: 'Cash and Equivalents', amount_lkr: 2800000, staff_id: 'STF-3891', department: 'Treasury', cost_centre: 'Treasury', timestamp: '2026-03-08T10:45:00Z', entry_time: '10:45', day_of_week: 'Saturday', risk_score: 72, flags: ['Weekend posting','Treasury GL'], benford_result: 'Pass', status: 'Flagged', maker_id: 'STF-3891', checker_id: 'STF-4120', approver_id: 'STF-4120', sod_violation: false, debit_account: '1100', credit_account: 'NOSTRO-USD', doc_completeness_pct: 67, fs_impact: 'Balance Sheet: Cash balance adjustment', reversal_chain: null, explanation: 'Weekend posting to cash GL. Maker-checker intact. Missing FX conversion supporting document. Treasury entries on weekends require Head of Treasury sign-off.', recommended_action: 'Obtain Head of Treasury weekend approval email. Attach FX conversion document.' },
      { entry_id: 'MJE-2026-4208', gl_account: '2400', gl_name: 'Accrued Expenses', amount_lkr: 89450, staff_id: 'STF-2201', department: 'Finance', cost_centre: 'Finance', timestamp: '2026-03-10T14:30:00Z', entry_time: '14:30', day_of_week: 'Monday', risk_score: 22, flags: [], benford_result: 'Pass', status: 'Cleared', maker_id: 'STF-2201', checker_id: 'STF-3310', approver_id: 'STF-3310', sod_violation: false, debit_account: '2400', credit_account: '5100-STAFF-COSTS', doc_completeness_pct: 100, fs_impact: 'P&L: Staff cost accrual — routine', reversal_chain: null, explanation: 'Routine business-hours expense accrual. Full documentation. Proper maker-checker. No anomalies.', recommended_action: 'No action required. Auto-cleared.' },
    ],
    benford_distribution: [
      { digit: '1', expected: 30.1, actual: 28.4 },
      { digit: '2', expected: 17.6, actual: 16.8 },
      { digit: '3', expected: 12.5, actual: 11.9 },
      { digit: '4', expected: 9.7,  actual: 14.2 },
      { digit: '5', expected: 7.9,  actual: 12.6 },
      { digit: '6', expected: 6.7,  actual: 6.1 },
      { digit: '7', expected: 5.8,  actual: 4.9 },
      { digit: '8', expected: 5.1,  actual: 3.2 },
      { digit: '9', expected: 4.6,  actual: 1.9 },
    ],
    gl_reconciliation: [
      { gl: 'SUS-001', name: 'CEFT Receivables Suspense', gl_balance_lkr: 148000000, sub_ledger_lkr: 141200000, break_lkr: 6800000, aging: '94d', status: 'Investigating', priority: 'Critical' },
      { gl: 'SUS-044', name: 'Fee Suspense BR-14', gl_balance_lkr: 8900000, sub_ledger_lkr: 8760000, break_lkr: 140000, aging: '67d', status: 'Investigating', priority: 'High' },
      { gl: '3200', name: 'Provision for Loan Losses', gl_balance_lkr: 2840000000, sub_ledger_lkr: 2840000000, break_lkr: 0, aging: '0d', status: 'Matched', priority: 'Low' },
      { gl: '1200', name: 'Loans Receivable', gl_balance_lkr: 430400000000, sub_ledger_lkr: 430280000000, break_lkr: 120000000, aging: '28d', status: 'Investigating', priority: 'Critical' },
      { gl: '4200', name: 'Fee Income', gl_balance_lkr: 1240000000, sub_ledger_lkr: 1240000000, break_lkr: 0, aging: '0d', status: 'Matched', priority: 'Low' },
    ],

    reversal_analysis: {
      total_reversals_tested: 89,
      unmatched_reversals: [
        { entry_id: 'MJE-2025-3981', gl_account: 'SUS-044', amount_lkr: 9450000, reversal_date: '2025-12-31', original_entry_id: null, finding: 'Reversal posted with no traceable original entry — creates an unexplained credit to fee suspense', risk_score: 88, maker_id: 'STF-1847' },
        { entry_id: 'MJE-2025-4112', gl_account: '3300-INT-INCOME', amount_lkr: 14200000, reversal_date: '2025-11-30', original_entry_id: null, finding: 'Month-end income reversal with no corresponding accrual — understates November interest income', risk_score: 76, maker_id: 'STF-0441' },
      ],
      net_zero_manipulations: [
        { period: '2025-Q4', gl_account: '1200-LOANS', net_effect_lkr: 0, gross_entries_lkr: 240000000, entry_count: 6, finding: 'Six entries net to zero over the quarter but peak balance mid-period was LKR 120M — used to inflate loan book for quarter-end reporting, then reversed', manipulation_type: 'Window dressing', maker_id: 'STF-1847', severity: 'critical' },
        { period: '2025-Q3', gl_account: '4100-PROV', net_effect_lkr: 0, gross_entries_lkr: 85000000, entry_count: 4, finding: 'Provision reversals and re-postings net to zero — but timing pattern suggests provision understatement during the quarter', manipulation_type: 'Provision smoothing', maker_id: 'STF-2210', severity: 'high' },
      ],
      intercompany_offsets: [
        { entry_id: 'MJE-2025-7821', debit_account: 'IC-BNK-FINANCE', credit_account: 'SUS-001', amount_lkr: 45000000, finding: 'Intercompany receivable from Demo Bank Finance used to offset CEFT suspense balance — masks unreconciled position', risk_score: 84 },
        { entry_id: 'MJE-2025-8134', debit_account: 'IC-BNK-INSURANCE', credit_account: '1200-LOANS', amount_lkr: 28000000, finding: 'Loan balance supported by intercompany claim rather than customer obligation — inflates performing loan book', risk_score: 79 },
      ],
    },
    key_findings: [
      { finding: 'STF-1847 is responsible for 2 of the 5 escalated MJE entries, both after-hours, both SoD violations, both to suspense GL accounts. The MJE pattern is consistent with the insider fraud pattern already confirmed by the Internal Controls and Insider Risk agents.', severity: 'critical', anomaly_score: 0.94, primary_driver: 'STF-1847 responsible for 2 escalated MJE entries with SoD violations to suspense GLs', secondary_drivers: ['Both entries after-hours with SoD violations', 'Both posted to suspense GL accounts', 'Consistent with multi-agent insider fraud pattern'], entity_ids: ['STF-1847', 'BR-14'], recommended_action: 'Include MJE entries in the STF-1847 forensic investigation package. Freeze all pending journal entries initiated by STF-1847.' },
      { finding: 'MJE-2026-4205 (midnight, month-end, round-number, LKR 185M, zero documents, SoD violation) is the highest-risk single entry in the population. The combination of 5 simultaneous high-risk flags is statistically improbable in legitimate accounting.', severity: 'critical', anomaly_score: 0.98, primary_driver: 'MJE-2026-4205 has 5 simultaneous high-risk flags — statistically improbable', secondary_drivers: ['Midnight month-end posting with zero documents', 'LKR 185M round-number amount exceeds materiality', 'SoD violation — maker and checker identical (STF-1847)'], entity_ids: ['STF-1847'], recommended_action: 'Immediate reversal pending investigation. Escalate to CFO. Preserve all system access logs for STF-1847.' },
      { finding: "Benford's Law analysis on MJE amounts shows first digits '4' and '5' are over-represented at 14.2% and 12.6% vs expected 9.7% and 7.9%. This pattern in journal entries (rather than transactions) typically indicates deliberate amount selection to stay below internal materiality review thresholds.", severity: 'high', anomaly_score: 0.76, primary_driver: 'Benford deviation in MJE amounts indicating deliberate sub-threshold structuring', secondary_drivers: ['First digit 4 at 14.2% vs expected 9.7%', 'First digit 5 at 12.6% vs expected 7.9%', 'Pattern suggests deliberate amount selection below materiality thresholds'], entity_ids: [], recommended_action: "Review all MJE amounts between LKR 9M and LKR 10M (sub-threshold structuring). Apply enhanced review to entries from frequent filers." },
    ],
    orchestrator_signals: [
      { signal_type: 'mje_insider_link', target_agent: 'insider', shared_entity_id: 'STF-1847', description: 'MJE testing confirms 2 SoD violations by STF-1847 — consistent with insider fraud pattern. Include in forensic package.', severity: 'critical' },
      { signal_type: 'mje_suspense_link', target_agent: 'suspense', shared_entity_id: 'SUS-001', description: 'MJE entries to SUS-001 are consistent with the phantom receivable pattern. Cross-reference MJE-2026-4201 with SUS-017 account activity.', severity: 'critical' },
    ],
  },
  insiderRisk: {
    summary: {
      total_staff_analysed: 2462,
      flagged_staff: 12,
      critical_staff: 2,
      network_avg_risk_score: 18,
      total_flagged_transactions: 847,
      suspicious_exposure_lkr: 418000000,
    },
    staff_profiles: [
      {
        staff_id: 'STF-1847',
        role: 'Senior Loans Officer',
        branch_code: 'BR-14',
        branch_name: 'Ratnapura',
        risk_score: 94,
        risk_trend: 'Increasing',
        sessions_analysed: 342,
        flagged_sessions: 23,
        flagged_pct: 6.7,
        peer_avg_flagged_pct: 1.2,
        override_count: 34,
        override_concentration_pct: 87,
        sod_violations: 4,
        same_cluster_approvals: 3,
        off_hours_approvals: 12,
        linked_exposure_lkr: 387000000,
        linked_loans: ['BNK-CR-2025-0441','BNK-CR-2025-0872','BNK-CR-2025-1203'],
        linked_accounts: ['SUS-044'],
        peer_avg_overrides: 2.1,
        peer_avg_sessions: 289,
        policy_violations: 3,
        conduct_breaches: 2,
        training_overdue: true,
        leave_pattern: 'Unusual — 4 unplanned absences in the 2 days before each flagged override cluster',
        behavioural_change: 'Significant — posting volume increased 340% since October 2025. Override approvals shifted from business hours to 21:00–23:00.',
        historical_alerts: [
          { alert_id: 'ALT-3891', date: '2025-11-15', type: 'Off-hours access', resolution: 'Investigated — explained as loan deadline emergency', outcome: 'Closed — no action' },
          { alert_id: 'ALT-3402', date: '2025-10-08', type: 'Override concentration spike', resolution: 'Branch Manager reviewed and cleared as peak season activity', outcome: 'Closed — false positive' },
        ],
        required_actions: ['Immediate suspension pending investigation','Preserve all system access logs — do not allow further logins','Interview Branch Manager (BR-14) regarding oversight failures','Engage HR and Legal within 24 hours','Cross-reference with all BNK-CR loans approved October–December 2025'],
        severity: 'critical',
        finding: 'STF-1847 matches all 6 insider fraud indicators simultaneously: 4 SoD violations, 87% override concentration, 3 same-cluster loan approvals, 12 off-hours approvals, 1.4 minute average approval time, and corroborating signals from Credit, KYC, and Digital agents.',
        recommended_action: 'IMMEDIATE SUSPENSION of STF-1847. Preserve all system access logs. Engage HR and Legal. Brief Head of Internal Audit and CEO. Notify CBSL if regulatory threshold met.',
      },
      {
        staff_id: 'STF-2341',
        role: 'Branch Operations Lead',
        branch_code: 'BR-23',
        branch_name: 'Embilipitiya',
        risk_score: 71,
        risk_trend: 'Increasing',
        sessions_analysed: 267,
        flagged_sessions: 11,
        flagged_pct: 4.1,
        peer_avg_flagged_pct: 1.2,
        override_count: 11,
        override_concentration_pct: 61,
        sod_violations: 1,
        same_cluster_approvals: 0,
        off_hours_approvals: 4,
        linked_exposure_lkr: 31000000,
        linked_loans: ['BNK-CR-2025-2041'],
        linked_accounts: [],
        peer_avg_overrides: 2.1,
        peer_avg_sessions: 289,
        policy_violations: 1,
        conduct_breaches: 0,
        training_overdue: false,
        leave_pattern: 'Normal',
        behavioural_change: 'Minor — override approvals increased 22% since November 2025. Within watch threshold.',
        historical_alerts: [
          { alert_id: 'ALT-3710', date: '2025-12-01', type: 'Override rate elevated', resolution: 'Reviewed by Compliance — agricultural disbursement period', outcome: 'Monitoring extended 30 days' },
        ],
        required_actions: ['Formal written explanation of override approvals required','Compliance Officer review within 14 days','Enhanced monitoring for next 60 days'],
        severity: 'high',
        finding: 'STF-2341 has 1 SoD violation, 61% override concentration, and 4 off-hours approvals. Pattern is concerning but not definitive. Significant increase in posting activity since November 2025.',
        recommended_action: 'Formal explanation required within 5 business days. Compliance Officer review. Enhanced monitoring for 60 days.',
      },
      {
        staff_id: 'STF-1109',
        role: 'Teller',
        branch_code: 'BR-72',
        branch_name: 'Pettah Main St',
        risk_score: 44,
        risk_trend: 'Stable',
        sessions_analysed: 445,
        flagged_sessions: 6,
        flagged_pct: 1.3,
        peer_avg_flagged_pct: 1.2,
        override_count: 3,
        override_concentration_pct: 12,
        sod_violations: 0,
        same_cluster_approvals: 0,
        off_hours_approvals: 1,
        linked_exposure_lkr: 0,
        linked_loans: [],
        linked_accounts: ['SUS-017'],
        peer_avg_overrides: 2.1,
        peer_avg_sessions: 289,
        policy_violations: 0,
        conduct_breaches: 0,
        training_overdue: false,
        leave_pattern: 'Normal',
        behavioural_change: 'None — within historical baseline.',
        historical_alerts: [],
        required_actions: ['No immediate action required','Maintain standard monitoring cadence'],
        severity: 'medium',
        finding: 'STF-1109 is linked to SUS-017 account processing. No direct fraud indicators identified but linked exposure requires watch-level monitoring.',
        recommended_action: 'Watch monitoring for 30 days. No action required unless further signals emerge.',
      },
    ],
    collusion_pairs: [
      {
        staff_a: 'STF-1847', role_a: 'Senior Loans Officer', branch_a: 'BR-14',
        staff_b: 'INT-BR14-007', role_b: 'External Introducer', branch_b: 'External',
        co_occurrences: 14, expected_co_occurrences: 1.2, co_occurrence_ratio: 11.7,
        pattern: 'INT-BR14-007 introduced 14 borrowers approved by STF-1847. All 14 have KYC gaps. 11 of 14 loans flagged as anomalous by Credit Agent.',
        severity: 'critical', risk_score: 0.97, financial_exposure_lkr: 387000000,
        finding: 'Probability of 14 co-occurrences against 1.2 expected: p<0.0001. Coordinated pair: introducer brings fabricated borrowers, loan officer approves without genuine due diligence.',
      },
      {
        staff_a: 'STF-2341', role_a: 'Senior Credit Officer', branch_a: 'BR-23',
        staff_b: 'STF-0891', role_b: 'Branch Operations Manager', branch_b: 'BR-23',
        co_occurrences: 8, expected_co_occurrences: 2.1, co_occurrence_ratio: 3.8,
        pattern: 'STF-2341 initiates loan; STF-0891 approves — bypassing the credit committee pathway for amounts above LKR 5M. 8 instances. All off-hours.',
        severity: 'high', risk_score: 0.74, financial_exposure_lkr: 143000000,
        finding: 'Two staff members systematically bypassing dual-control on credit above threshold. Individually each appears within normal bounds; combined pattern is statistically anomalous.',
      },
    ],
    approval_chain_anomalies: [
      {
        anomaly_type: 'Consistent bypassing of same approver',
        description: 'STF-1847 routes all loan approvals to themselves (SoD violation) or STF-0091 — the approver with shortest avg turnaround (0.9 min). The remaining 6 eligible approvers are never used by STF-1847.',
        affected_approver_bypassed: 'STF-4412 (Credit Manager — most experienced)',
        instances: 23, p_value: 0.0003, severity: 'critical',
      },
      {
        anomaly_type: 'Split-transaction approval to avoid committee review',
        description: '4 corporate loan applications split into tranches of LKR 4.8M–4.9M each — just below the LKR 5M credit committee threshold — approved individually by STF-1847 within same day.',
        instances: 4, combined_exposure_lkr: 87000000, severity: 'high',
      },
    ],
    key_findings: [
      { finding: 'STF-1847 (BR-14) matches all 6 insider fraud indicators simultaneously: SoD violations, override concentration, same-cluster approvals, off-hours activity, approval turnaround anomaly, and multi-agent corroboration from Credit, KYC, and Digital agents.', severity: 'critical', anomaly_score: 0.97, primary_driver: 'STF-1847 matches all 6 insider fraud indicators simultaneously', secondary_drivers: ['4 SoD violations with 87% override concentration', 'Multi-agent corroboration from Credit, KYC, and Digital agents', 'Off-hours activity and 1.4-minute approval turnaround anomaly'], entity_ids: ['STF-1847', 'BR-14'], recommended_action: 'Immediate suspension. Forensic investigation. CBSL notification.' },
      { finding: '12 staff members across the 90-branch network have risk scores above the 40/100 watch threshold. 2 are in the critical band (above 80). Network average is 18/100 — the outliers are statistically significant.', severity: 'high', anomaly_score: 0.78, primary_driver: '12 staff above 40/100 watch threshold — 2 in critical band', secondary_drivers: ['Network average 18/100 — outliers are statistically significant', '2 critical-band staff concentrated at BR-14', 'Risk score distribution skewed by insider fraud indicators'], entity_ids: [], recommended_action: 'Deploy Compliance review for all 12 flagged staff. Monthly reporting to Head of Internal Audit.' },
      { finding: 'BR-14 shows the highest staff risk concentration in the network — both its flagged staff members are among the top 2 highest-risk individuals, confirming a branch-level control environment failure rather than isolated individual behaviour.', severity: 'high', anomaly_score: 0.85, primary_driver: 'BR-14 staff risk concentration — top 2 highest-risk individuals at same branch', secondary_drivers: ['Branch-level control environment failure confirmed', 'Not isolated individual behaviour — systemic at branch level', 'Consistent with Credit, Controls, and KYC agent findings at BR-14'], entity_ids: ['BR-14'], recommended_action: 'Branch-level control audit at BR-14 in addition to individual investigations.' },
    ],
    orchestrator_signals: [
      { signal_type: 'insider_fraud_confirmed', target_agent: 'credit', shared_entity_id: 'STF-1847', description: 'STF-1847 confirmed as high-risk insider. Cross-reference all loans approved or overridden by this individual.', severity: 'critical' },
      { signal_type: 'controls_cross_ref', target_agent: 'controls', shared_entity_id: 'BR-14', description: 'BR-14 composite score 41/100 linked to STF-1847 concentration. Branch-level audit required.', severity: 'critical' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPITAL & LIQUIDITY agent — feeds the Basel III ratios into Regulatory
  // Capital page, Compliance composite (Basel score), and Command Centre
  // Bank Ribbon (Tier 1, LCR, NSFR).
  // ═══════════════════════════════════════════════════════════════════════════
  capital: {
    capital_position: {
      car_tier1_pct: 19.06,
      car_total_pct: 20.17,
      tier1_lkr: 88_400_000_000,
      tier2_lkr: 8_500_000_000,
      rwa_lkr: 463_500_000_000,
      leverage_ratio_pct: 12.14,
    },
    liquidity_position: {
      lcr_pct: 203.4,
      nsfr_pct: 138.3,
      hqla_total_lkr: 148_200_000_000,
      hqla_level1_share_pct: 86.0,
    },
    historical_trend: [
      { q: 'Q1 2024', car: 17.8, tier1: 14.6, lcr: 320.6, nsfr: 154.7 },
      { q: 'Q2 2024', car: 17.9, tier1: 14.7, lcr: 312.4, nsfr: 151.3 },
      { q: 'Q3 2024', car: 18.1, tier1: 14.9, lcr: 294.8, nsfr: 148.6 },
      { q: 'Q4 2024', car: 18.3, tier1: 15.1, lcr: 278.1, nsfr: 145.2 },
      { q: 'Q1 2025', car: 18.6, tier1: 15.4, lcr: 261.7, nsfr: 143.8 },
      { q: 'Q2 2025', car: 18.8, tier1: 15.6, lcr: 244.2, nsfr: 141.4 },
      { q: 'Q3 2025', car: 19.0, tier1: 15.8, lcr: 226.8, nsfr: 139.7 },
      { q: 'Q4 2025', car: 19.06, tier1: 15.9, lcr: 203.4, nsfr: 138.3 },
    ],
    alco_actions: [
      { action: 'Accelerate retail deposit mobilisation to stabilise LCR — target +15% YoY.', owner: 'Treasury + Consumer Banking' },
      { action: 'Increase Level 1 HQLA share from 86% to 90% — rotate Level 2A holdings into T-bills.', owner: 'Treasury ALM' },
      { action: 'Stress test under -200bps scenario quarterly given NII sensitivity trend.', owner: 'Treasury ALM + Risk' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BALANCE SHEET DRIVERS — provides total assets/deposits/growth figures and
  // attributes LCR/CAR movement to structural drivers.
  // ═══════════════════════════════════════════════════════════════════════════
  balance: {
    structural_summary: {
      total_assets_lkr:   700_309_000_000,
      total_deposits_lkr: 502_219_000_000,
      loan_deposit_ratio_pct: 85.7,
      hqla_total_lkr:     148_200_000_000,
      top10_depositor_concentration_pct: 34.5,
      wholesale_funding_pct: 23.4,
    },
    drivers: [
      { driver: 'Loan book growth (+50% YoY)',        impact_lcr_bps: -84, impact_car_bps: -70,  direction: 'negative', note: 'RWA expansion outpaces HQLA accumulation.' },
      { driver: 'Deposit growth (+11% YoY)',           impact_lcr_bps: +18, impact_car_bps: +20,  direction: 'positive', note: 'Stable funding base lagging asset growth.' },
      { driver: 'Retained earnings buffer',            impact_lcr_bps: 0,   impact_car_bps: +130, direction: 'positive', note: 'Capital accretion from FY2025 net profit.' },
      { driver: 'HQLA composition shift',              impact_lcr_bps: -32, impact_car_bps: 0,    direction: 'negative', note: 'Level 2A share increased from 8% to 14%.' },
      { driver: 'Corporate depositor concentration',   impact_lcr_bps: -19, impact_car_bps: 0,    direction: 'negative', note: 'Top-10 depositors now 34.5% of funding.' },
    ],
  },

  orchestrator: {
    correlations: [
      { correlation_id: 'CORR-001', agents_involved: ['controls', 'credit', 'kyc', 'digital'], shared_entity_type: 'branch', shared_entity_id: 'BR-14', combined_severity: 0.98, narrative: 'Branch BR-14 (Ratnapura) has been independently flagged by four agents. Internal Controls: SoD violations and override concentration by STF-1847 (41/100 composite score). Credit: 14 override-approved anomalous loans totalling LKR 387 Mn. KYC: 12.4% gap rate with suspect introducer. Digital: STF-1847 accessed loan system off-hours downloading documents. Combined pattern is definitive insider-enabled loan fraud. This is the most significant finding in this audit cycle.', recommended_action: 'Convene emergency response: (1) Suspend STF-1847 immediately. (2) Deploy field audit team to BR-14 within 48 hours. (3) Freeze all new credit at this branch. (4) Preserve all digital evidence. (5) Notify CBSL if exposure exceeds regulatory threshold. (6) Engage forensic accountants.', case_worthy: true, fraud_type_suspected: 'Insider-enabled loan fraud' },
      { correlation_id: 'CORR-002', agents_involved: ['transaction', 'suspense', 'digital', 'kyc'], shared_entity_type: 'account', shared_entity_id: 'SUS-017', combined_severity: 0.99, narrative: 'Account SUS-017 has been flagged by four agents with converging signals. Suspense: 312% balance growth, clearing ratio 0.08, 94 days unreconciled — phantom receivable pattern confirmed. Transaction: LKR 1.24 Bn in suspicious CEFT flows, hub-and-spoke routing to 3 external accounts, STR-eligible. Digital: Device DEV-A4F7-9921 linked to SUS-017 network used to access 4 accounts. KYC: One account in SUS-017 network has FATF-country exposure with no EDD. This is a coordinated CEFT suspense fraud scheme.', recommended_action: 'IMMEDIATE FREEZE of SUS-017. STR filing within 24 hours. CBSL FIU notification. Forensic investigation of all accounts in SUS-017 network. Preserve all CEFT transaction logs.', case_worthy: true, fraud_type_suspected: 'CEFT suspense account fraud — coordinated external scheme' },
      { correlation_id: 'CORR-003', agents_involved: ['transaction', 'trade', 'kyc'], shared_entity_type: 'account', shared_entity_id: 'BNK-CORP-0887', combined_severity: 0.94, narrative: 'Corporate customer BNK-CORP-0887 flagged by three agents. Trade Finance: Over-invoicing at 91% premium plus duplicate LC applications — LKR 421 Mn TBML exposure. Transaction: Structuring cluster with score 0.87, hub-and-spoke to external accounts. KYC: Beneficial ownership not fully disclosed on this corporate entity. Three independent signals converging on same corporate customer indicates sophisticated TBML scheme using Demo Bank\'s trade finance and CEFT infrastructure.', recommended_action: 'Suspend all facilities for BNK-CORP-0887. File STR. Refer to CBSL FIU for TBML investigation. Commission forensic review of all trade documents for last 24 months.', case_worthy: true, fraud_type_suspected: 'Trade-based money laundering (TBML)' },
    ],
    kri_summary: {
      stage3_ratio: { value: 3.50, unit: 'pct', status: 'amber', trend: 'deteriorating' },
      lcr: { value: 203.4, unit: 'pct', status: 'amber', trend: 'deteriorating' },
      override_rate: { value: 4.8, unit: 'pct', status: 'amber', trend: 'deteriorating' },
      kyc_gap_rate: { value: 4.7, unit: 'pct', status: 'amber', trend: 'stable' },
      suspense_aging_exposure_lkr: { value: 8.42, unit: 'lkr_bn', status: 'red', trend: 'deteriorating' },
      active_fraud_scores_high: { value: 23, unit: 'count', status: 'amber', trend: 'deteriorating' },
      str_queue_count: { value: 4, unit: 'count', status: 'amber', trend: 'deteriorating' },
      branches_below_threshold: { value: 4, unit: 'count', status: 'amber', trend: 'stable' },
    },
    systemic_patterns: [
      { pattern_type: 'Systemic branch control failure', affected_entities: ['BR-14', 'BR-23', 'BR-11', 'BR-56'], description: '4 branches below the 65/100 control threshold. BR-14 at 41/100 — confirmed insider fraud. 3 additional branches show elevated override rates. Network-wide control culture concern in high-growth branches.', severity: 'critical' },
      { pattern_type: 'CEFT infrastructure exploitation', affected_entities: ['SUS-017', 'BNK-0841-X', 'BNK-3312-B'], description: 'Multiple independent accounts are exploiting CEFT payment infrastructure for structuring and suspense fraud. This suggests knowledge of Demo Bank\'s CEFT monitoring gaps — possible insider enablement.', severity: 'critical' },
    ],
    priority_actions: [
      { rank: 1, action: 'EMERGENCY: Suspend STF-1847, freeze BR-14 credit operations, deploy field audit team', urgency: 'immediate', responsible_function: 'Internal Audit + HR + Legal', estimated_exposure_lkr: 387000000, agents_basis: ['controls', 'credit', 'kyc', 'digital'] },
      { rank: 2, action: 'Freeze SUS-017, file STR with CBSL FIU, initiate CEFT fraud forensic investigation', urgency: 'immediate', responsible_function: 'Compliance + Treasury', estimated_exposure_lkr: 1240000000, agents_basis: ['suspense', 'transaction', 'digital'] },
      { rank: 3, action: 'Suspend BNK-CORP-0887 facilities, file TBML STR, refer to CBSL FIU', urgency: 'within_24h', responsible_function: 'Compliance + Trade Finance', estimated_exposure_lkr: 421000000, agents_basis: ['trade', 'transaction', 'kyc'] },
      { rank: 4, action: 'Initiate KYC remediation programme — 39,290 gaps, prioritise critical and PEP accounts', urgency: 'within_week', responsible_function: 'Compliance', estimated_exposure_lkr: 0, agents_basis: ['kyc'] },
      { rank: 5, action: 'Treasury ALCO: present LCR stabilisation plan — LCR declining, 50% loan growth needs liability counterweight', urgency: 'within_week', responsible_function: 'Treasury + CFO', estimated_exposure_lkr: 0, agents_basis: ['trade'] },
    ],
    executive_summary: 'This audit cycle has identified three critical cross-agent correlations requiring immediate board-level attention. First, Branch BR-14 (Ratnapura) is confirmed as the site of insider-enabled loan fraud — four agents independently flagging the same branch and staff member STF-1847, with combined severity 0.98. Second, SUS-017 (Pettah Main Street CEFT Receivables) is confirmed as an active fraud vehicle — phantom receivable pattern, LKR 1.24 Bn in suspicious flows, and coordinated digital access patterns, combined severity 0.99. Third, corporate customer BNK-CORP-0887 is conducting TBML through Demo Bank\'s trade finance infrastructure, with over-invoicing, duplicate LCs, and CEFT structuring converging on one entity, combined severity 0.94. Total estimated exposure under active investigation: LKR 2.05 Bn. Sentinel has simultaneously detected three independent fraud schemes across credit, payments, and trade finance — evidence that the cross-agent correlation model is functioning as designed.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2 AGENTS — Domain-specific deep-dive coverage for Business Platform
  // All findings carry domain_tags so the Business Platform tagger can route
  // them to the correct domain deep-dive page. Raw signals are preserved so
  // Rule Parameters' client-side re-evaluator can re-classify severity
  // without re-invoking the agents.
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── WEALTH SUITABILITY ───────────────────────────────────────────────
  wealth: {
    portfolio_summary: { total_customers: 4218, total_aum_lkr: 87400000000, flagged_customers: 41, suitability_gaps: 23, concentration_flags: 12, churn_flags: 6 },
    suitability_flags: [
      { customer_id: 'WM-00182', rm_code: 'RM-014', customer_risk_profile: 2, product_risk_rating: 5, gap: 3, holding_lkr: 28000000, severity: 'critical', explanation: 'Conservative profile (2) holding high-risk equity-linked product (5) — 3-level suitability gap.', recommended_action: 'Liquidate and refund. Review RM-014 book for similar cases.' },
      { customer_id: 'WM-00447', rm_code: 'RM-014', customer_risk_profile: 2, product_risk_rating: 5, gap: 3, holding_lkr: 14500000, severity: 'critical', explanation: 'Same RM placed another conservative customer into equity-linked product.', recommended_action: 'Escalate to Wealth head of supervision. Audit RM-014 entire book.' },
      { customer_id: 'WM-01103', rm_code: 'RM-031', customer_risk_profile: 1, product_risk_rating: 4, gap: 3, holding_lkr: 9200000, severity: 'critical', explanation: 'Ultra-conservative retiree in growth fund with 4-year min hold.', recommended_action: 'Convert to capital-preserving product immediately.' },
      { customer_id: 'WM-00928', rm_code: 'RM-008', customer_risk_profile: 3, product_risk_rating: 5, gap: 2, holding_lkr: 42000000, severity: 'high', explanation: 'Moderate profile in aggressive product; gap within tolerance but concentration elevated.', recommended_action: 'Review suitability; consider product switch.' },
    ],
    concentration_flags: [
      { customer_id: 'WM-00182', rm_code: 'RM-014', concentrated_product: 'Equity Growth Fund', concentration_pct: 68, portfolio_lkr: 41000000, severity: 'high', explanation: '68% of portfolio in single high-risk fund.' },
      { customer_id: 'WM-02044', rm_code: 'RM-022', concentrated_product: 'Corporate Bond III', concentration_pct: 54, portfolio_lkr: 78000000, severity: 'high', explanation: '54% in single issuer exposure.' },
    ],
    churn_flags: [
      { rm_code: 'RM-014', affected_customers: 9, avg_switches_90d: 5.2, fees_lkr: 4800000, severity: 'critical', pattern_explanation: 'RM-014 customers average 5.2 switches in 90 days — classic fee-harvesting pattern. Fees earned LKR 4.8M over window.' },
      { rm_code: 'RM-031', affected_customers: 4, avg_switches_90d: 4.5, fees_lkr: 1900000, severity: 'high', pattern_explanation: 'Above-threshold churn velocity across 4 customers.' },
    ],
    key_findings: [
      { finding: 'RM-014 has 9 customers subjected to suitability gaps AND churn velocity — combined pattern indicates deliberate mis-selling for fee income.', severity: 'critical', affected_exposure_lkr: 87000000, anomaly_score: 0.93, primary_driver: 'RM-level concentration of suitability gaps AND churn', secondary_drivers: ['Conservative customers in high-risk products', '5.2 switches per 90 days'], entity_ids: ['RM-014', 'WM-00182', 'WM-00447'], recommended_action: 'Suspend RM-014 immediately. Freeze all products sold by this RM pending investigation.', domain_tags: ['consumer'] },
      { finding: '12 consumer wealth customers over-concentrated in single products — policy requires ≤40% in any one product.', severity: 'high', affected_exposure_lkr: 312000000, anomaly_score: 0.78, primary_driver: 'Single-product holding > 40% of portfolio', secondary_drivers: ['Relationship-manager recommendation records absent'], entity_ids: ['WM-00182', 'WM-02044'], recommended_action: 'Compliance review of top-12 over-concentrated portfolios.', domain_tags: ['consumer'] },
    ],
    orchestrator_signals: [
      { signal_type: 'rm_concentration', target_agent: 'insider', shared_entity_id: 'RM-014', description: 'RM-014 flagged by Wealth Suitability; cross-check for insider patterns.', severity: 'high' },
    ],
  },

  // ─── COLLATERAL INTEGRITY ─────────────────────────────────────────────
  collateral: {
    collateral_summary: { total_collateral_records: 12847, total_value_lkr: 612000000000, stale_count: 287, ltv_breach_count: 43, double_pledge_count: 7, flagged_count: 341 },
    stale_valuations: [
      { collateral_id: 'COL-34891', loan_id: 'BNK-CR-2025-0441', days_since_valuation: 1247, valuation_lkr: 420000000, type: 'Commercial property', severity: 'critical', explanation: 'Valuation 3.4 years old on LKR 420M collateral backing BR-14 flagged loan.', recommended_action: 'Commission independent valuation within 10 days.' },
      { collateral_id: 'COL-29103', loan_id: 'BNK-CR-2025-0872', days_since_valuation: 892, valuation_lkr: 180000000, type: 'Agriculture land', severity: 'high', explanation: 'Seasonal asset, valuation 2.4 years stale.', recommended_action: 'Revalue under current season conditions.' },
      { collateral_id: 'COL-41872', loan_id: 'BNK-CR-2025-1567', days_since_valuation: 1102, valuation_lkr: 145000000, type: 'Hospitality property', severity: 'high', explanation: 'Tourism-sector asset, market has shifted materially post-pandemic.', recommended_action: 'Revalue with current tourism-market comparables.' },
    ],
    ltv_breaches: [
      { collateral_id: 'COL-34891', loan_id: 'BNK-CR-2025-0441', ltv_ratio: 0.94, valuation_lkr: 420000000, exposure_lkr: 287000000, severity: 'critical', explanation: 'LTV 94% against stale valuation — breach of 85% limit.' },
      { collateral_id: 'COL-55112', loan_id: 'BNK-CR-2025-2041', ltv_ratio: 0.89, valuation_lkr: 75000000, exposure_lkr: 67000000, severity: 'high', explanation: 'LTV 89% on BR-23 facility.' },
    ],
    double_pledges: [
      { collateral_id: 'COL-38201', pledge_count: 3, total_pledged_lkr: 520000000, collateral_value_lkr: 310000000, over_pledge_ratio: 1.68, explanation: 'Asset pledged against 3 facilities, combined > 1.6x valuation.' },
    ],
    valuer_concentration: [
      { valuer_code: 'VAL-007', book_share_pct: 28.4, stale_ratio_pct: 12.1, risk_interpretation: 'Single valuer responsible for 28% of book — elevated model-risk and potential compromise.' },
    ],
    key_findings: [
      { finding: 'Collateral COL-34891 backing critical-flagged loan BNK-CR-2025-0441 has stale valuation AND LTV breach — double-weakness on the bank\'s largest construction exposure.', severity: 'critical', affected_exposure_lkr: 287000000, anomaly_score: 0.96, primary_driver: 'Stale 1247-day valuation + LTV 94%', secondary_drivers: ['Construction sector softening', 'BR-14 flagged branch'], entity_ids: ['COL-34891', 'BNK-CR-2025-0441', 'BR-14'], recommended_action: 'Independent revaluation within 10 days. If current value shortfall > 15%, raise provision immediately.', domain_tags: ['commercial', 'corporate'] },
      { finding: 'Valuer VAL-007 is responsible for 28% of bank\'s total collateral valuations — concentration exceeds 25% model-risk threshold.', severity: 'high', affected_exposure_lkr: 0, anomaly_score: 0.81, primary_driver: 'Single-valuer book concentration 28%', secondary_drivers: ['Stale-valuation ratio 12% on VAL-007 files'], entity_ids: ['VAL-007'], recommended_action: 'Diversify valuer panel. Commission second-opinion valuations on 10% sample of VAL-007 work.', domain_tags: ['commercial', 'corporate', 'risk'] },
    ],
    orchestrator_signals: [
      { signal_type: 'collateral_weakness', target_agent: 'credit', shared_entity_id: 'BNK-CR-2025-0441', description: 'Collateral stale + LTV breach on already-flagged loan. Combined severity boost.', severity: 'critical' },
    ],
  },

  // ─── CONNECTED PARTY ──────────────────────────────────────────────────
  connectedParty: {
    connected_summary: { total_customers: 11042, total_groups_identified: 284, single_obligor_breaches: 3, aggregate_breaches: 5, shared_director_networks: 12, shell_pattern_flags: 4 },
    single_obligor_breaches: [
      { customer_id: 'BNK-CORP-0887', aggregate_exposure_lkr: 24300000000, capital_base_pct: 25.1, severity: 'critical', explanation: 'Corporate obligor aggregate exposure 25.1% of capital base — breaches CBSL single-obligor limit of 25%.', recommended_action: 'Immediate exposure reduction plan. CBSL notification required.' },
      { customer_id: 'BNK-CORP-0421', aggregate_exposure_lkr: 21800000000, capital_base_pct: 22.5, severity: 'high', explanation: 'Approaching CBSL limit at 22.5% — elevated monitoring required.', recommended_action: 'Freeze new drawdowns pending exposure plan.' },
    ],
    connected_group_breaches: [
      { group_id: 'GRP-018', member_customers: ['BNK-CORP-0887', 'BNK-CORP-1203', 'BNK-CORP-2041'], aggregate_exposure_lkr: 38900000000, capital_base_pct: 40.1, severity: 'critical', explanation: 'Connected group aggregate 40.1% breaches 40% CBSL related-party limit.' },
    ],
    shared_director_networks: [
      { network_id: 'NET-007', members: ['BNK-CORP-0887', 'BNK-CORP-1203', 'BNK-CORP-2041', 'BNK-CORP-3311'], shared_directors: 4, aggregate_exposure_lkr: 41200000000, disclosure_gap: true, explanation: 'Four customers share 4 directors; no CBSL related-party disclosure on file.' },
    ],
    shell_patterns: [
      { customer_id: 'BNK-CORP-4187', registered_capital_lkr: 500000, facility_exposure_lkr: 180000000, ratio: 360, beneficial_owner_id: 'BO-00812', explanation: 'Registered capital LKR 500K but facility LKR 180M — 360x leverage on BO. Shell-like structure.' },
    ],
    key_findings: [
      { finding: 'BNK-CORP-0887 breaches CBSL single-obligor limit (25.1% vs 25% cap) — immediate regulatory exposure. Same entity flagged by Trade Finance for TBML.', severity: 'critical', affected_exposure_lkr: 24300000000, anomaly_score: 0.97, primary_driver: 'CBSL single-obligor limit breach', secondary_drivers: ['Also flagged by Trade/Treasury Agent for over-invoicing', 'Part of connected group GRP-018'], entity_ids: ['BNK-CORP-0887', 'GRP-018'], recommended_action: 'CBSL notification within 48 hours. Exposure-reduction plan to board within 7 days.', domain_tags: ['corporate', 'risk'] },
      { finding: 'Connected group GRP-018 (4 customers, 4 shared directors) has NO related-party disclosure on file, breaching CBSL related-party transaction directions. Group aggregate exposure is LKR 38.9 Bn; the LKR 24.3 Bn BNK-CORP-0887 leg is captured separately as a single-obligor breach, so the incremental group exposure here is LKR 14.6 Bn.', severity: 'critical', affected_exposure_lkr: 14600000000, group_aggregate_exposure_lkr: 38900000000, anomaly_score: 0.94, primary_driver: 'Undisclosed connected group', secondary_drivers: ['40.1% of capital (group aggregate)', '4 shared directors', 'Incremental exposure LKR 14.6 Bn beyond BNK-CORP-0887 single-obligor finding'], entity_ids: ['GRP-018', 'NET-007'], recommended_action: 'File related-party disclosure. Retrospective board approval. Possible breach report to CBSL.', domain_tags: ['corporate', 'risk', 'compliance'] },
    ],
    orchestrator_signals: [
      { signal_type: 'entity_match', target_agent: 'trade', shared_entity_id: 'BNK-CORP-0887', description: 'Single-obligor breach on same entity Trade Agent flagged for TBML.', severity: 'critical' },
    ],
  },

  // ─── ALM & IRRBB ──────────────────────────────────────────────────────
  alm: {
    alm_summary: { total_assets_lkr: 700300000000, total_liabilities_lkr: 603400000000, cumulative_gap_lkr: -142000000000, cumulative_gap_pct: -20.3, eve_sensitivity_bps: 18, nii_sensitivity_pct: 11.4, bucket_strain_count: 2, overall_status: 'breach' },
    bucket_gaps: [
      { bucket: '1d-1m',  rate_sensitive_assets_lkr: 82000000000,  rate_sensitive_liabilities_lkr: 61000000000,  gap_lkr: 21000000000,  cumulative_gap_pct: 3.0,  eve_sensitivity_bps: 4, strain_flag: false, explanation: 'Short-end net asset-sensitive — healthy.' },
      { bucket: '1-3m',   rate_sensitive_assets_lkr: 48000000000,  rate_sensitive_liabilities_lkr: 72000000000,  gap_lkr: -24000000000, cumulative_gap_pct: -0.4, eve_sensitivity_bps: 5, strain_flag: false, explanation: 'Marginal liability-sensitive.' },
      { bucket: '3-6m',   rate_sensitive_assets_lkr: 64000000000,  rate_sensitive_liabilities_lkr: 118000000000, gap_lkr: -54000000000, cumulative_gap_pct: -8.1, eve_sensitivity_bps: 9, strain_flag: true,  explanation: 'Liability concentration — mass deposit repricing.' },
      { bucket: '6m-1y',  rate_sensitive_assets_lkr: 94000000000,  rate_sensitive_liabilities_lkr: 185000000000, gap_lkr: -91000000000, cumulative_gap_pct: -20.3, eve_sensitivity_bps: 18, strain_flag: true, explanation: 'Cumulative gap 20.3% of assets — breaches 20% IRRBB limit.' },
      { bucket: '1y+',    rate_sensitive_assets_lkr: 142000000000, rate_sensitive_liabilities_lkr: 90000000000,  gap_lkr: 52000000000,  cumulative_gap_pct: -12.8,eve_sensitivity_bps: 2, strain_flag: false, explanation: 'Long-end asset-sensitive offset.' },
    ],
    rate_scenarios: [
      { scenario: 'Parallel +200bps', basis_point_shift: 200, eve_impact_pct: -6.2, nii_impact_pct: +8.1, flag: false, interpretation: 'Mild negative EVE; positive NII.' },
      { scenario: 'Parallel -200bps', basis_point_shift: -200, eve_impact_pct: +5.8, nii_impact_pct: -11.4, flag: true, interpretation: 'NII drops 11.4% — exceeds 10% threshold.' },
      { scenario: 'Steepener',        basis_point_shift: 0, eve_impact_pct: -2.1,  nii_impact_pct: +1.2, flag: false, interpretation: 'Within tolerance.' },
      { scenario: 'Flattener',        basis_point_shift: 0, eve_impact_pct: -4.8,  nii_impact_pct: -6.3, flag: false, interpretation: 'Monitor — largest EVE hit among scenarios.' },
    ],
    key_findings: [
      { finding: 'Cumulative repricing gap at 6m-1y bucket reaches -20.3% of assets (gap notional LKR 91 Bn) — breaches IRRBB 20% limit. Driven by mass CASA repricing and slower asset repricing. NII-at-risk under -200bps stress scenario is LKR 4.1 Bn (11.4% of annual NII).', severity: 'critical', affected_exposure_lkr: 4100000000, gap_notional_lkr: 91000000000, anomaly_score: 0.92, primary_driver: '6m-1y bucket cumulative gap', secondary_drivers: ['NII-at-risk LKR 4.1 Bn under -200bps stress (11.4% of NII)', 'Gap notional LKR 91 Bn — not a loss amount', 'Loan book grew 50% YoY but deposits shorter-tenor', 'CASA concentration'], entity_ids: [], recommended_action: 'ALCO to present remediation plan at next meeting. Consider FRA hedges for 6m-1y band.', domain_tags: ['treasury', 'risk'] },
      { finding: 'Parallel -200bps scenario produces NII impact of -11.4%, exceeding 10% bank-internal tolerance.', severity: 'high', affected_exposure_lkr: 0, anomaly_score: 0.83, primary_driver: 'NII sensitivity to rates falling', secondary_drivers: ['Floor-structured loan book', 'Non-repricing liability concentration'], entity_ids: [], recommended_action: 'Consider rate-floor products for new originations.', domain_tags: ['treasury', 'risk'] },
    ],
    orchestrator_signals: [
      { signal_type: 'liquidity_link', target_agent: 'capital', shared_entity_id: '6m-1y', description: 'ALM gap + LCR declining — compounding liquidity risk.', severity: 'high' },
    ],
  },

  // ─── THIRD-PARTY RISK ─────────────────────────────────────────────────
  thirdParty: {
    vendor_summary: { total_vendors: 184, critical_vendors: 23, total_annual_spend_lkr: 4200000000, concentration_flags: 4, stale_assessments: 19, critical_exit_flags: 3, cbsl_notification_gaps: 2 },
    concentration_flags: [
      { vendor_id: 'VND-0012', category: 'Core Banking Platform', concentration_pct: 78, annual_spend_lkr: 820000000, severity: 'critical', explanation: '78% of core banking spend with single vendor — CBSL outsourcing concentration flag.', recommended_action: 'Develop dual-sourcing strategy. CBSL consultation required.' },
      { vendor_id: 'VND-0041', category: 'ATM / Cash Services', concentration_pct: 67, annual_spend_lkr: 310000000, severity: 'high', explanation: '67% of ATM services with single vendor.' },
    ],
    stale_assessments: [
      { vendor_id: 'VND-0012', days_since_assessment: 412, criticality: 'critical', annual_spend_lkr: 820000000, severity: 'high', explanation: 'Critical vendor assessment 412 days stale — breaches 365-day cycle.' },
      { vendor_id: 'VND-0087', days_since_assessment: 528, criticality: 'high', annual_spend_lkr: 140000000, severity: 'medium', explanation: 'Assessment 528 days stale.' },
    ],
    critical_exit_readiness: [
      { vendor_id: 'VND-0012', days_to_contract_end: 142, criticality: 'critical', exit_plan_status: 'absent', severity: 'critical', explanation: 'Core banking contract ends in 142 days — below 180-day threshold, no documented exit plan.' },
    ],
    cbsl_notification_gaps: [
      { vendor_id: 'VND-0012', cbsl_category: 'Core banking outsourcing', gap_description: 'Material outsourcing notification to CBSL last filed 3 years ago; annual update missing.', severity: 'high' },
    ],
    key_findings: [
      { finding: 'Core banking vendor VND-0012: 78% concentration + stale assessment + no exit plan + CBSL notification gap — material outsourcing risk on a Tier-1 system.', severity: 'critical', affected_exposure_lkr: 820000000, anomaly_score: 0.95, primary_driver: 'Compound vendor risk on core banking system', secondary_drivers: ['Concentration 78%', 'Assessment stale 412 days', 'No exit plan', 'CBSL notification overdue'], entity_ids: ['VND-0012'], recommended_action: 'Immediate dual-sourcing plan. CBSL consultation. Refresh assessment. Document exit scenarios within 30 days.', domain_tags: ['operations', 'technology'] },
    ],
    orchestrator_signals: [],
  },

  // ─── ACCESS RIGHTS ────────────────────────────────────────────────────
  accessRights: {
    access_summary: { total_users: 2462, privileged_users: 87, dormant_privileged: 6, review_overdue: 14, toxic_combos: 4, sod_conflicts: 9, leaver_active: 2 },
    dormant_privileged: [
      { user_id: 'STF-0412', role: 'DBA', privilege_level: 'admin', last_login_days: 187, severity: 'critical', explanation: 'Database administrator account dormant 187 days but still active — privilege escalation risk.', recommended_action: 'Suspend account immediately. Re-request access if user still requires.' },
      { user_id: 'STF-0921', role: 'Payments Admin', privilege_level: 'privileged', last_login_days: 142, severity: 'high', explanation: 'Payments admin dormant 142 days.', recommended_action: 'Suspend pending review.' },
    ],
    review_overdue: [
      { user_id: 'STF-1847', role: 'Branch Manager', days_since_review: 287, privilege_level: 'privileged', severity: 'critical', explanation: 'BR-14 branch manager (subject of insider-fraud findings) privileged access not reviewed for 287 days.', recommended_action: 'Emergency revocation pending investigation closure.' },
    ],
    toxic_combinations: [
      { user_id: 'STF-2103', combo_code: 'TOXIC-MK-AP', combo_description: 'Payment Maker + Payment Approver', severity: 'critical', explanation: 'Same user can initiate and approve payments — SoD violation at entitlement level.' },
      { user_id: 'STF-3341', combo_code: 'TOXIC-VC-VA', combo_description: 'Vendor Create + Vendor Approve', severity: 'critical', explanation: 'Same user can create and approve vendors — fraud vector for fictitious vendors.' },
    ],
    sod_conflicts: [
      { user_id: 'STF-1847', conflict_description: 'Loan Initiator + Loan Approver (SoD violation from Controls Agent — confirmed at access-rights layer).', severity: 'critical', explanation: 'Entitlement level confirms the system-permitted SoD violations.' },
    ],
    key_findings: [
      { finding: 'STF-1847 (BR-14 branch manager) has toxic loan-init + loan-approve entitlements AND no privileged access review for 287 days — this is the system-level root cause of the insider-fraud pattern Controls Agent detected.', severity: 'critical', affected_exposure_lkr: 387000000, anomaly_score: 0.98, primary_driver: 'Toxic entitlement combination at access-rights layer', secondary_drivers: ['Privileged review overdue 287 days', 'Cross-agent match with Controls and Credit'], entity_ids: ['STF-1847', 'BR-14'], recommended_action: 'Emergency revocation of STF-1847 access. Access-rights layer review across all branch managers.', domain_tags: ['technology', 'operations'] },
      { finding: '4 users hold toxic entitlement combinations — 0 tolerated under policy.', severity: 'critical', affected_exposure_lkr: 0, anomaly_score: 0.89, primary_driver: 'Toxic combos: Maker+Approver pairs', secondary_drivers: ['SoD breakdowns at entitlement level'], entity_ids: ['STF-2103', 'STF-3341'], recommended_action: 'Immediate entitlement split. Joint Ops + Tech review.', domain_tags: ['technology', 'operations'] },
    ],
    orchestrator_signals: [
      { signal_type: 'entity_match', target_agent: 'controls', shared_entity_id: 'STF-1847', description: 'Access Rights Agent confirms system-permitted SoD for subject of Controls Agent finding.', severity: 'critical' },
    ],
  },

  // ─── CONDUCT & GRIEVANCE ──────────────────────────────────────────────
  conduct: {
    conduct_summary: { total_cases: 124, open_cases: 38, recurring_subjects: 7, overdue_cases: 11, whistleblower_clusters: 1, cross_agent_matches: 3 },
    recurring_subjects: [
      { subject_role: 'STF-1847', case_count: 3, categories: ['behaviour', 'process-breach'], earliest_case: '2024-08-12', latest_case: '2025-11-03', severity: 'critical', explanation: '3 prior conduct cases on same subject — pattern of recurring issues ahead of Controls findings.', recommended_action: 'HR to reconcile conduct history with insider findings.' },
      { subject_role: 'STF-3341', case_count: 2, categories: ['process-breach'], earliest_case: '2025-03-21', latest_case: '2025-09-11', severity: 'high', explanation: 'Repeat process breaches.' },
    ],
    overdue_cases: [
      { case_id: 'CD-00412', subject_role: 'STF-2103', category: 'behaviour', days_open: 182, severity: 'critical', explanation: 'Case open 182 days — 3x resolution threshold.' },
      { case_id: 'CD-00521', subject_role: 'STF-4482', category: 'grievance',  days_open: 98,  severity: 'high',     explanation: 'Employee grievance unresolved past 60 days.' },
    ],
    whistleblower_clusters: [
      { window_start: '2025-09-01', window_end: '2025-09-28', case_count: 4, categories: ['financial-misconduct', 'governance'], severity: 'high', explanation: '4 whistleblower cases clustered in September — all pointing to Branch BR-14.' },
    ],
    key_findings: [
      { finding: 'STF-1847 has 3 prior conduct cases preceding the insider-fraud detection — the conduct register was a leading indicator that was missed.', severity: 'critical', affected_exposure_lkr: 387000000, anomaly_score: 0.91, primary_driver: 'Recurring conduct pattern on subject of fraud', secondary_drivers: ['Whistleblower cluster centred on BR-14', 'Cross-agent match with Controls, Credit, Access Rights'], entity_ids: ['STF-1847', 'BR-14'], recommended_action: 'Integrate conduct register into insider-risk monitoring. Case-level reconciliation across all branches.', domain_tags: ['people', 'risk'] },
      { finding: 'September 2025 whistleblower cluster: 4 cases pointing to BR-14 — systemic signal that preceded the Controls-level fraud detection.', severity: 'high', affected_exposure_lkr: 0, anomaly_score: 0.82, primary_driver: 'Whistleblower cluster in 30-day window', secondary_drivers: ['All centred on BR-14', 'Financial-misconduct category'], entity_ids: ['BR-14'], recommended_action: 'Whistleblower-channel effectiveness review. Ensure early signals trigger audit escalation.', domain_tags: ['people', 'risk'] },
    ],
    orchestrator_signals: [
      { signal_type: 'leading_indicator', target_agent: 'insider', shared_entity_id: 'STF-1847', description: 'Conduct register had 3 prior cases on subject of insider-risk flag.', severity: 'high' },
    ],
  },

  // ─── CREDIT FRAUD & ORIGINATION ────────────────────────────────────────
  // Complements Credit Intelligence. Credit detects STAGING anomalies
  // (backward-looking). This agent detects ORIGINATION fraud (forward-looking):
  // fictitious borrowers, post-disbursement siphoning, shell-guarantor chains,
  // facility amounts that exceed sector peers by 3σ, first-payment defaults.
  creditFraud: {
    origination_summary: {
      facilities_analysed: 8420,
      facilities_full_book: 380000,
      analysis_universe: 'Originations Jul 2025 – Mar 2026 (post rapid-growth window); representative shell-borrower cohort',
      flagged_count: 47,
      flagged_count_shown: 5,
      flagged_selection: 'Top 5 by composite origination-fraud score; full list exportable via Reports',
      critical_count: 11,
      flagged_exposure_lkr: 2180000000,
      first_payment_default_rate_pct: 1.34,
      fpd_rate_peer_median_pct: 0.42,
      avg_composite_score: 0.69,
      shell_borrower_suspects: 8,
      guarantor_concentration_clusters: 4,
      siphon_pattern_cases: 6,
    },
    flagged_facilities: [
      {
        loan_id: 'BNK-OR-2026-0091', branch_code: 'BR-14', borrower_id: 'BNK-C-FNY-0341', facility_lkr: 142000000, sector: 'Construction', disbursed_on: '2026-01-18',
        composite_score: 0.94, severity: 'critical',
        indicators: {
          post_disbursement_siphon: { outflow_to_undisclosed_pct: 91, window_hours: 28, flag: true },
          first_payment_default: { payments_missed: 1, days_past_due: 47, flag: true },
          guarantor_concentration: { guarantor_id: 'BNK-G-0127', facilities_on_guarantor: 9, flag: true },
          shell_borrower_score: 0.83,
          amount_vs_cohort_sigma: 3.8,
          override_flag: true,
        },
        explanation: 'Disbursed LKR 142M to a 3-month-old SPV borrower on Jan 18. Within 28 hours, 91% of proceeds moved to 3 previously-undisclosed counterparties via CEFT. First payment missed at 47 days past due. Guarantor BNK-G-0127 is guarantor-of-record on 9 other BR-14 facilities. Facility amount is 3.8σ above sector-peer cohort median. Override-approved by STF-1847.',
        recommended_action: 'IMMEDIATE facility suspension and legal review. File STR under FTRA §7 for post-disbursement siphon pattern. Cross-reference with Connected Party Agent on BNK-G-0127 guarantor chain.',
      },
      {
        loan_id: 'BNK-OR-2026-0133', branch_code: 'BR-14', borrower_id: 'BNK-C-FNY-0401', facility_lkr: 98000000, sector: 'SME Manufacturing', disbursed_on: '2026-02-02',
        composite_score: 0.90, severity: 'critical',
        indicators: {
          post_disbursement_siphon: { outflow_to_undisclosed_pct: 87, window_hours: 52, flag: true },
          first_payment_default: { payments_missed: 0, days_past_due: 18, flag: false },
          guarantor_concentration: { guarantor_id: 'BNK-G-0127', facilities_on_guarantor: 9, flag: true },
          shell_borrower_score: 0.79,
          amount_vs_cohort_sigma: 3.2,
          override_flag: true,
        },
        explanation: 'Second BR-14 facility in the same chain. 87% of proceeds left within 52 hours to the same counterparty network flagged in BNK-OR-2026-0091. Shared guarantor BNK-G-0127. Same override approver STF-1847.',
        recommended_action: 'Group-level investigation. Freeze remaining facilities on BNK-G-0127 guarantor chain pending review.',
      },
      {
        loan_id: 'BNK-OR-2026-0178', branch_code: 'BR-23', borrower_id: 'BNK-C-SME-4412', facility_lkr: 67000000, sector: 'Trade & Services', disbursed_on: '2026-02-10',
        composite_score: 0.86, severity: 'critical',
        indicators: {
          post_disbursement_siphon: { outflow_to_undisclosed_pct: 0, window_hours: 0, flag: false },
          first_payment_default: { payments_missed: 2, days_past_due: 73, flag: true },
          guarantor_concentration: { guarantor_id: 'BNK-G-0204', facilities_on_guarantor: 4, flag: false },
          shell_borrower_score: 0.41,
          amount_vs_cohort_sigma: 2.1,
          override_flag: false,
        },
        explanation: 'First-payment default at 73 days past due — definitive FPD under current 60-day threshold. Borrower is a registered SME with adequate BO disclosure but the facility was sized 2.1σ above sector cohort median. No siphon signature. Classic origination-sizing mistake, not fraud.',
        recommended_action: 'Include in FPD cohort review. Credit Committee to revisit SME facility-sizing parameters.',
      },
      {
        loan_id: 'BNK-OR-2026-0219', branch_code: 'BR-14', borrower_id: 'BNK-C-FNY-0466', facility_lkr: 84000000, sector: 'Construction', disbursed_on: '2026-02-22',
        composite_score: 0.82, severity: 'high',
        indicators: {
          post_disbursement_siphon: { outflow_to_undisclosed_pct: 74, window_hours: 96, flag: false },
          first_payment_default: { payments_missed: 0, days_past_due: 0, flag: false },
          guarantor_concentration: { guarantor_id: 'BNK-G-0127', facilities_on_guarantor: 9, flag: true },
          shell_borrower_score: 0.78,
          amount_vs_cohort_sigma: 2.7,
          override_flag: true,
        },
        explanation: 'Third facility on BNK-G-0127 guarantor chain at BR-14. Below-threshold outflow (74% vs 85% flag) but pattern-similar to siphoned facilities. Override-approved. Shell-borrower score 0.78 above threshold.',
        recommended_action: 'Include in BR-14 guarantor-chain investigation. Monitor for siphon behaviour through Q2 2026.',
      },
      {
        loan_id: 'BNK-OR-2026-0254', branch_code: 'BR-56', borrower_id: 'BNK-C-AGRI-9921', facility_lkr: 42000000, sector: 'Agriculture', disbursed_on: '2026-03-02',
        composite_score: 0.74, severity: 'high',
        indicators: {
          post_disbursement_siphon: { outflow_to_undisclosed_pct: 0, window_hours: 0, flag: false },
          first_payment_default: { payments_missed: 1, days_past_due: 42, flag: false },
          guarantor_concentration: { guarantor_id: null, facilities_on_guarantor: 0, flag: false },
          shell_borrower_score: 0.22,
          amount_vs_cohort_sigma: 3.4,
          override_flag: false,
        },
        explanation: 'Agricultural borrower with facility 3.4σ above agri-sector cohort median. One missed payment at 42 days past due — below FPD flag threshold but worth monitoring. No fraud signature; sizing-quality issue only.',
        recommended_action: 'Agri-portfolio sizing review. Monitor for FPD trigger.',
      },
    ],
    guarantor_chains: [
      { guarantor_id: 'BNK-G-0127', facilities_count: 9, aggregate_exposure_lkr: 412000000, chain_branches: ['BR-14'], chain_severity: 'critical', narrative: '9 facilities share BNK-G-0127 as guarantor-of-record, all originated at BR-14 within a 12-week window (Dec 2025 – Feb 2026). All 9 borrowers are <12-months-old corporates with similar SIC profiles. Three facilities exhibit post-disbursement siphon patterns. Guarantor-chain concentration threshold (6) breached at 150%.' },
      { guarantor_id: 'BNK-G-0088', facilities_count: 7, aggregate_exposure_lkr: 188000000, chain_branches: ['BR-23', 'BR-56'], chain_severity: 'high',     narrative: '7 facilities on BNK-G-0088 across two branches — flagged pending verification of guarantor independence.' },
    ],
    fpd_cohort_analysis: {
      origination_period: 'Jul 2025 – Mar 2026',
      total_originations: 8420,
      first_payment_defaults: 113,
      fpd_rate_pct: 1.34,
      peer_median_pct: 0.42,
      peer_source: 'CBSL Banking Sector Originations Report Q3 2025',
      narrative: 'FPD rate 1.34% is 3.2x peer median — consistent with the Credit Intelligence vintage-cohort finding that Q3–Q4 2025 originations are defaulting at 1.7–1.8x prior-year cohorts at equivalent maturity. Origination-fraud agent and Credit-Intelligence agent converge: the problem is both quality (Credit) and fraud (CreditFraud).',
    },
    key_findings: [
      { finding: '9 facilities sharing guarantor BNK-G-0127 at BR-14 total LKR 412 Mn — a guarantor-chain concentration pattern. 3 of the 9 show post-disbursement siphon signatures (>85% outflow to undisclosed counterparties within 72h). Consistent with shell-borrower origination fraud operated through a single guarantor of convenience.', severity: 'critical', affected_exposure_lkr: 412000000, anomaly_score: 0.96, primary_driver: 'Single guarantor on 9 BR-14 facilities totalling LKR 412 Mn with 3 confirmed siphon patterns', secondary_drivers: ['All 9 borrowers are <12-month-old corporates', 'Originations clustered in 12-week window', 'STF-1847 is override-approver on 7 of 9'], entity_ids: ['BNK-G-0127', 'BR-14'], recommended_action: 'IMMEDIATE freeze of BNK-G-0127 guarantor chain. Cross-reference with Connected Party and KYC agents. File STRs under FTRA §7 for the 3 confirmed siphon cases. Expand investigation window to 18 months.' },
      { finding: 'First-payment default rate on 2025-Q3 through 2026-Q1 originations reached 1.34% — 3.2x the peer median of 0.42%. 113 FPDs on 8,420 facilities materially exceeds the Credit Committee\'s 0.75% internal amber threshold.', severity: 'critical', affected_exposure_lkr: 2180000000, anomaly_score: 0.89, primary_driver: 'FPD rate 1.34% — 3.2x peer median', secondary_drivers: ['113 FPDs on 8,420 originations', 'Cohort correlates with Credit-Intelligence vintage-quality deterioration', 'Compounding fraud and quality signals in same cohort'], entity_ids: [], recommended_action: 'Emergency Credit Committee. Revisit underwriting parameters for rapid-growth branches. Stage 2 classification for remainder of cohort on precautionary basis.' },
      { finding: '8 suspected shell borrowers (composite shell-score > 0.75) received aggregate facilities of LKR 642 Mn between Oct 2025 and Feb 2026 — 6 of them are borrowers on the BNK-G-0127 guarantor chain.', severity: 'high', affected_exposure_lkr: 642000000, anomaly_score: 0.81, primary_driver: 'Shell-borrower score above 0.75 threshold on 8 recent originations', secondary_drivers: ['6 of 8 are on the BNK-G-0127 chain', 'Aggregate exposure LKR 642 Mn', 'Beneficial ownership disclosure gaps on 5 of 8'], entity_ids: ['BNK-G-0127'], recommended_action: 'KYC agent to rerun BO disclosure on all 8 entities. Independent business-address verification via field visit.' },
    ],
    orchestrator_signals: [
      { signal_type: 'entity_match',       target_agent: 'credit',         shared_entity_id: 'BR-14',       description: 'CreditFraud flags BR-14 origination ring. Credit Intelligence already flagged BR-14 for override concentration. Double signal — origination and staging compromised at same branch.', severity: 'critical' },
      { signal_type: 'entity_match',       target_agent: 'connectedParty', shared_entity_id: 'BNK-G-0127',  description: 'Guarantor-chain concentration (9 facilities on same guarantor). Connected Party Agent should resolve the guarantor\'s directorship graph.', severity: 'critical' },
      { signal_type: 'siphon_str_eligible',target_agent: 'transaction',    shared_entity_id: 'BNK-OR-2026-0091', description: '3 confirmed post-disbursement siphon patterns meet STR eligibility under FTRA §7. Transaction Agent to lift the counterparty network for structuring checks.', severity: 'critical' },
      { signal_type: 'kyc_revalidation',   target_agent: 'kyc',            shared_entity_id: 'BNK-C-FNY-0341', description: '8 suspected shell borrowers need BO disclosure re-verification under CBSL KYC Direction.', severity: 'high' },
    ],
  },

  // ─── REGULATORY REPORTING INTEGRITY ────────────────────────────────────
  // Validates Demo Bank's CBSL submissions against Sentinel's own recomputed view.
  // Each line item in the CAR/LCR/NSFR/Large-Exposures/Stage-3/STR returns is
  // reconciled agent-side vs submission-side; variances above per-line
  // tolerance are flagged.
  regReporting: {
    reporting_summary: {
      returns_reviewed: 6,
      line_items_reconciled: 147,
      material_variances: 7,
      critical_variances: 3,
      last_reconciliation: '2026-04-10',
      defensibility_score: 0.86,
      defensibility_narrative: '86 / 100: most line items reconcile cleanly but three material variances persist across Stage 3, Large Exposures, and STR-lag. CBSL supervision-cycle readiness is adequate if the three are remediated before Q2 2026 submission.',
    },
    variances: [
      {
        return: 'Stage 3 (Quarterly NPL return)',
        line_item: 'Stage 3 ratio — network',
        submitted: '0.91%',
        computed: '3.50%',
        variance: '+259 bps',
        tolerance: '15 bps',
        severity: 'critical',
        explanation: 'Submitted Stage 3 ratio materially understates the Credit-Intelligence-computed ratio. 34 misstaged loans aggregating LKR 1.1 Bn are the driver. CBSL FR Directive §3.2 requires corrective submission within 30 days of identification.',
        source_agent: 'credit',
        recommended_action: 'Amended Stage 3 return. Staging Committee to correct the 34 loans before next quarterly submission.',
      },
      {
        return: 'Large Exposures Return',
        line_item: 'BNK-CORP-0887 aggregate exposure',
        submitted: '22.8% of capital',
        computed: '25.1% of capital',
        variance: '+2.3 pp',
        tolerance: '1.0 pp',
        severity: 'critical',
        explanation: 'Submitted return excludes 4 counterparties that Connected Party Agent identifies as part of the BNK-CORP-0887 connected group. When aggregated per CBSL Large Exposures Direction, exposure breaches the 25% single-obligor limit.',
        source_agent: 'connectedParty',
        recommended_action: 'Re-file Large Exposures return with connected-group consolidation. CBSL notification within 48 hours of confirmation.',
      },
      {
        return: 'STR / CBSL FIU',
        line_item: 'STR filing lag',
        submitted: 'n/a',
        computed: '11 days avg',
        variance: 'exceeds 5-day FTRA requirement',
        tolerance: '5 days',
        severity: 'critical',
        explanation: 'Transaction Agent raises STR-eligibility flags that are taking 11 days on average to reach FIU filing — more than double the FTRA §7 statutory 5-working-day window. 3 of the last 12 STRs were filed beyond 10 days.',
        source_agent: 'transaction',
        recommended_action: 'Compliance process review. Dedicated STR triage queue. Automated escalation at day 3.',
      },
      {
        return: 'Form CAR (Capital Adequacy)',
        line_item: 'Total CAR',
        submitted: '20.22%',
        computed: '20.17%',
        variance: '-5 bps',
        tolerance: '10 bps',
        severity: 'medium',
        explanation: 'Immaterial — within tolerance. Variance driven by RWA rounding convention difference between submission template and Capital Agent recomputation.',
        source_agent: 'capital',
        recommended_action: 'Align RWA rounding convention at next template refresh. No CBSL action needed.',
      },
      {
        return: 'LCR return',
        line_item: 'All-currency LCR',
        submitted: '203.8%',
        computed: '203.4%',
        variance: '-0.4 pp',
        tolerance: '2.0 pp',
        severity: 'low',
        explanation: 'Immaterial — within tolerance.',
        source_agent: 'capital',
        recommended_action: 'No action.',
      },
      {
        return: 'NSFR return',
        line_item: 'NSFR ratio',
        submitted: '138.3%',
        computed: '138.3%',
        variance: '0.0 pp',
        tolerance: '2.0 pp',
        severity: 'low',
        explanation: 'Clean match.',
        source_agent: 'capital',
        recommended_action: 'No action.',
      },
      {
        return: 'KYC / AML return',
        line_item: 'Pending STR assessments',
        submitted: '4',
        computed: '7',
        variance: '+3 cases',
        tolerance: '0 cases',
        severity: 'high',
        explanation: 'Three STR-eligible cases flagged by Transaction/KYC agents are not represented in the submitted pending-assessment list. Ageing beyond 5 working days.',
        source_agent: 'kyc',
        recommended_action: 'Reconcile pending-assessment list with FIU queue before next monthly submission.',
      },
    ],
    return_coverage: [
      { return: 'Form CAR',              items: 28, reconciled: 26, variances: 2, status: 'amber', last_review: '2026-04-10' },
      { return: 'LCR / NSFR',            items: 41, reconciled: 41, variances: 0, status: 'green', last_review: '2026-04-10' },
      { return: 'Large Exposures',       items: 18, reconciled: 16, variances: 2, status: 'critical', last_review: '2026-04-09' },
      { return: 'Stage 3 / NPL',         items: 12, reconciled: 11, variances: 1, status: 'critical', last_review: '2026-04-08' },
      { return: 'KYC / AML / PEP',       items: 24, reconciled: 23, variances: 1, status: 'amber', last_review: '2026-04-09' },
      { return: 'STR Pipeline (FIU)',    items: 24, reconciled: 23, variances: 1, status: 'critical', last_review: '2026-04-10' },
    ],
    key_findings: [
      { finding: 'Three returns are in critical variance against Sentinel\'s recomputed view: Stage 3 (+259 bps), Large Exposures (+2.3 pp single-obligor breach), and STR-lag (11 days vs 5-day FTRA requirement). Each of these is an individually reportable supervisory event under CBSL Banking Act §46A.', severity: 'critical', anomaly_score: 0.97, primary_driver: 'Three material variances in concurrently-reviewed returns', secondary_drivers: ['Stage 3 submission understated by 259 bps', 'Large Exposures omits connected-group consolidation', 'STR filing lag exceeds FTRA statutory 5-day window'], entity_ids: ['BNK-CORP-0887'], recommended_action: 'Emergency Reporting Integrity Review with CFO + Head of Compliance. Amended returns and CBSL notifications within 48 hours of Board Audit Committee sign-off.' },
      { finding: 'Defensibility score 86/100 — adequate but below target 95/100. 7 of 147 line items (4.8%) carry material variance. Variance cluster is specifically in high-stakes returns (Stage 3, Large Exposures, STR), not in volumetric returns.', severity: 'high', anomaly_score: 0.78, primary_driver: 'Variance concentration in regulatory-critical returns', secondary_drivers: ['4.8% material-variance rate across reconciled items', '3 of 7 variances are critical', 'Remaining 4 variances clustered in KYC / pending-assessment register'], entity_ids: [], recommended_action: 'Include returns-integrity KPI in the ICAAP. Institutionalise monthly reconciliation cycle across all returns.' },
    ],
    orchestrator_signals: [
      { signal_type: 'reg_reporting_variance', target_agent: 'credit',         shared_entity_id: 'Stage3 return',          description: 'Stage 3 ratio submission understated by 259 bps. Credit agent\'s 34 misstaged loans are the driver.', severity: 'critical' },
      { signal_type: 'reg_reporting_variance', target_agent: 'connectedParty', shared_entity_id: 'Large Exposures return', description: 'Submitted Large Exposures return excludes 4 counterparties that Connected Party Agent treats as same group.', severity: 'critical' },
      { signal_type: 'reg_reporting_variance', target_agent: 'transaction',    shared_entity_id: 'STR queue',               description: 'STR filing lag 11 days vs 5-day FTRA statutory window.', severity: 'critical' },
    ],
  },
};

// Demo Bank branch data for heatmap (90 branches, 8 risk domains)
export const branchRiskData = [
  { code: 'BR-14', name: 'Ratnapura', credit: 87, transaction: 72, suspense: 68, kyc: 88, controls: 94, digital: 78, trade: 31, treasury: 22, aml_flag: true, cbsl_flag: true, sla_breach: true, open_cases: 3, top_finding: 'Insider fraud — STF-1847: 4 SoD violations, 87% override concentration. Multi-agent severity 0.98.', agent_path: '/agents/controls' },
  { code: 'BR-72', name: 'Pettah Main St', credit: 44, transaction: 91, suspense: 98, kyc: 76, controls: 52, digital: 88, trade: 41, treasury: 29, aml_flag: true, cbsl_flag: true, sla_breach: true, open_cases: 2, top_finding: 'SUS-017 phantom receivable: LKR 1.24 Bn, 312% growth in 30d, clearing ratio 0.08. CBSL breach.', agent_path: '/agents/suspense' },
  { code: 'BR-23', name: 'Embilipitiya', credit: 68, transaction: 58, suspense: 41, kyc: 62, controls: 78, digital: 44, trade: 22, treasury: 18, aml_flag: false, cbsl_flag: false, sla_breach: true, open_cases: 1, top_finding: 'STF-2341: 1 SoD violation, 61% override concentration. KYC gap rate 7.2% — above 5% threshold.', agent_path: '/agents/controls' },
  { code: 'BR-11', name: 'Batticaloa', credit: 61, transaction: 48, suspense: 52, kyc: 64, controls: 72, digital: 38, trade: 19, treasury: 14, aml_flag: false, cbsl_flag: false, sla_breach: false, open_cases: 1, top_finding: 'Credit anomaly score elevated — Eastern Province post-event override rate 7.2%, above 5% threshold.', agent_path: '/agents/credit' },
  { code: 'BR-56', name: 'Matara', credit: 54, transaction: 38, suspense: 44, kyc: 41, controls: 61, digital: 29, trade: 27, treasury: 21, aml_flag: false, cbsl_flag: false, sla_breach: false, open_cases: 0, top_finding: 'Agricultural seasonal pressure — override rate 6.8%. Approaching 65/100 composite threshold.', agent_path: '/agents/controls' },
  { code: 'BR-41', name: 'Kandy', credit: 38, transaction: 32, suspense: 28, kyc: 34, controls: 42, digital: 27, trade: 31, treasury: 24, aml_flag: false, cbsl_flag: false, sla_breach: false, open_cases: 0, top_finding: 'All dimensions within acceptable range. Composite score 74/100 — green.', agent_path: '/agents/controls' },
  { code: 'BR-16', name: 'City Office', credit: 29, transaction: 44, suspense: 62, kyc: 38, controls: 34, digital: 41, trade: 52, treasury: 48, aml_flag: false, cbsl_flag: false, sla_breach: false, open_cases: 0, top_finding: 'Elevated trade finance exposure. Suspense aging elevated at 62 — approaching amber threshold.', agent_path: '/agents/trade' },
  { code: 'BR-34', name: 'Jaffna', credit: 21, transaction: 18, suspense: 19, kyc: 22, controls: 24, digital: 17, trade: 14, treasury: 11, aml_flag: false, cbsl_flag: false, sla_breach: false, open_cases: 0, top_finding: 'All risk dimensions low. No active findings.', agent_path: '/command-centre' },
  { code: 'BR-75', name: 'Private Banking', credit: 18, transaction: 22, suspense: 14, kyc: 19, controls: 24, digital: 21, trade: 28, treasury: 31, aml_flag: false, cbsl_flag: false, sla_breach: false, open_cases: 0, top_finding: 'Private Banking Centre — all dimensions well within limits. Best-performing branch.', agent_path: '/command-centre' },
  { code: 'BR-62', name: 'Nawam Mawatha', credit: 24, transaction: 31, suspense: 22, kyc: 28, controls: 27, digital: 24, trade: 41, treasury: 38, aml_flag: false, cbsl_flag: false, sla_breach: false, open_cases: 0, top_finding: 'Trade and treasury elevated but within limits. Watch: FX position monitoring recommended.', agent_path: '/agents/trade' },
];

export const kpiData = {
  stage3Ratio: { value: '3.50%', label: 'Stage 3 Ratio', status: 'amber', trend: 'vs peer-median 2.84%', note: '+23% if 34 misstaged loans corrected' },
  lcr: { value: '203.4%', label: 'LCR (All Currency)', status: 'amber', trend: '↓ from 320.6%', note: 'Watch: declining trend' },
  loanGrowth: { value: '+50%', label: 'Loan Growth YoY', status: 'amber', trend: 'LKR 143 Bn new origination', note: 'Vintage risk elevated' },
  overrideRate: { value: '4.8%', label: 'Network Override Rate', status: 'amber', trend: 'BR-14: 14.3%', note: 'BR-14 critical outlier' },
  kycGapRate: { value: '4.7%', label: 'KYC Gap Rate', status: 'amber', trend: '39,290 accounts', note: '847 HSBC migration gaps' },
  suspenseAging: { value: 'LKR 8.42 Bn', label: 'Suspense Aging >30d', status: 'red', trend: '3 accounts >90 days', note: 'Regulatory breach risk' },
  fraudScores: { value: '23', label: 'Active Fraud Scores >0.8', status: 'amber', trend: '4 STR-eligible cases', note: 'SUS-017 critical' },
  branchesRisk: { value: '4', label: 'Branches Below Threshold', status: 'amber', trend: 'BR-14 at 41/100', note: 'Field audit required' },
};


export const peerBenchmarks = {
  credit: {
    stage3_ratio:        { bank: 3.50, peer_median: 2.84, peer_best: 0.71, peer_worst: 5.12, source: 'CBSL Banking Sector Report Q3 2025' },
    override_rate:       { bank: 4.8,  peer_median: 2.1,  peer_best: 0.8,  peer_worst: 6.3,  source: 'CBSL Supervisory Review 2025' },
    ecl_coverage:        { bank: 68.2, peer_median: 74.1, peer_best: 82.3, peer_worst: 61.0, source: 'Published financials Q3 2025' },
    loan_growth_yoy:     { bank: 50.1, peer_median: 18.3, peer_best: 12.1, peer_worst: 54.2, source: 'CBSL Monthly Bulletin Nov 2025' },
  },
  kyc: {
    kyc_gap_rate:        { bank: 4.7,  peer_median: 2.9,  peer_best: 1.2,  peer_worst: 7.8,  source: 'CBSL AML Compliance Review 2025' },
    pep_edd_overdue_pct: { bank: 14.2, peer_median: 8.1,  peer_best: 2.3,  peer_worst: 22.4, source: 'CBSL FIU Industry Survey 2025' },
    str_filing_rate:     { bank: 0.031,peer_median: 0.044,peer_best: 0.089,peer_worst: 0.011,source: 'CBSL FIU Annual Report 2024' },
  },
  controls: {
    override_rate_branch:{ bank: 14.3, peer_median: 3.2,  peer_best: 0.9,  peer_worst: 18.1, source: 'CBSL Supervisory Review 2025 — branch-level' },
    sod_violation_rate:  { bank: 0.021,peer_median: 0.003,peer_best: 0.000,peer_worst: 0.041,source: 'Internal audit industry benchmarking 2025' },
    avg_approval_minutes:{ bank: 1.4,  peer_median: 18.4, peer_best: 12.1, peer_worst: 2.1,  source: 'CBSL Credit Process Review 2024' },
  },
  liquidity: {
    lcr:                 { bank: 203.4,peer_median: 248.1,peer_best: 312.4,peer_worst: 128.4,source: 'CBSL Liquidity Report Q4 2025' },
    nsfr:                { bank: 138.3,peer_median: 149.8,peer_best: 168.2,peer_worst: 112.1,source: 'CBSL Liquidity Report Q4 2025' },
    wholesale_funding_pct:{ bank:23.4, peer_median:16.8,  peer_best:11.2,  peer_worst:31.4,  source: 'CBSL Funding Structure Report 2025' },
    ld_ratio:            { bank: 85.7, peer_median: 78.3, peer_best: 68.1, peer_worst: 91.2, source: 'CBSL Banking Sector Report Q3 2025' },
  },
  mje: {
    mje_sod_rate:        { bank: 0.47, peer_median: 0.12, peer_best: 0.00, peer_worst: 0.93, source: 'Internal audit benchmarking — SL banking 2025' },
    after_hours_mje_pct: { bank: 8.3,  peer_median: 3.1,  peer_best: 0.9,  peer_worst: 12.4, source: 'Internal audit benchmarking — SL banking 2025' },
  },
  insider: {
    avg_network_risk_score:{ bank:18,  peer_median: 14,   peer_best: 9,    peer_worst: 24,   source: 'ACFE South Asia Fraud Survey 2024' },
    insider_fraud_losses:  { bank: null,peer_median:0.08, peer_best:0.02,  peer_worst:0.31,  source: 'ACFE — % of revenue lost to insider fraud, financial services' },
  },
};


export const executiveData = {
  regulatory_trend: [
    { q: 'Q1 24', car: 17.8,  tier1: 14.6, tier2: 3.2, lcr: 320.6, nsfr: 154.7, peer_car: 15.8, peer_lcr: 234.0 },
    { q: 'Q2 24', car: 17.9,  tier1: 14.7, tier2: 3.2, lcr: 312.4, nsfr: 151.3, peer_car: 15.9, peer_lcr: 231.0 },
    { q: 'Q3 24', car: 18.1,  tier1: 14.9, tier2: 3.2, lcr: 294.8, nsfr: 148.6, peer_car: 16.0, peer_lcr: 228.0 },
    { q: 'Q4 24', car: 18.3,  tier1: 15.1, tier2: 3.2, lcr: 278.1, nsfr: 145.2, peer_car: 16.1, peer_lcr: 224.0 },
    { q: 'Q1 25', car: 18.6,  tier1: 15.4, tier2: 3.2, lcr: 261.7, nsfr: 143.8, peer_car: 16.2, peer_lcr: 220.0 },
    { q: 'Q2 25', car: 18.8,  tier1: 15.6, tier2: 3.2, lcr: 244.2, nsfr: 141.4, peer_car: 16.3, peer_lcr: 216.0 },
    { q: 'Q3 25', car: 19.0,  tier1: 15.8, tier2: 3.2, lcr: 226.8, nsfr: 139.7, peer_car: 16.4, peer_lcr: 212.0 },
    { q: 'Q4 25', car: 19.06, tier1: 15.9, tier2: 3.16,lcr: 203.4, nsfr: 138.3, peer_car: 16.5, peer_lcr: 208.0 },
  ],
  // Forward projection (Q1 26 – Q4 26) under current trajectory (no ALCO intervention)
  regulatory_projection: [
    { q: 'Q1 26', car: 19.10, tier1: 15.95, tier2: 3.15, lcr: 185.2, nsfr: 136.4, projection: true },
    { q: 'Q2 26', car: 19.14, tier1: 16.00, tier2: 3.14, lcr: 166.1, nsfr: 134.2, projection: true },
    { q: 'Q3 26', car: 19.16, tier1: 16.03, tier2: 3.13, lcr: 147.5, nsfr: 131.8, projection: true },
    { q: 'Q4 26', car: 19.18, tier1: 16.06, tier2: 3.12, lcr: 128.9, nsfr: 129.2, projection: true },
  ],
  regulatory_drivers: [
    { driver: 'Loan book growth (+50% YoY)', impact_lcr: -84, impact_car: -0.7, direction: 'negative', note: 'RWA expansion outpaces HQLA accumulation' },
    { driver: 'Deposit growth (+11% YoY)',   impact_lcr: +18, impact_car: +0.2, direction: 'positive', note: 'Stable funding base lagging asset growth' },
    { driver: 'Retained earnings buffer',    impact_lcr: 0,   impact_car: +1.3, direction: 'positive', note: 'Capital accretion from FY 2025 net profit' },
    { driver: 'HQLA composition (Level 1 %)',impact_lcr: -32, impact_car: 0,    direction: 'negative', note: 'Level 2A share increased from 8% to 14%' },
    { driver: 'Corporate deposit concentration', impact_lcr: -19, impact_car: 0, direction: 'negative', note: 'Top-10 depositors now 34.5% of funding' },
  ],
  regulatory_thresholds: {
    car_min: 11.5, car_amber: 13.0,
    lcr_min: 100,  lcr_amber: 150,  lcr_watch: 250,
    nsfr_min: 100, nsfr_amber: 115,
  },
  ai_roi: {
    alerts_auto_resolved: 847,
    analyst_hours_saved: 2340,
    fraud_detected_lkr: 2100000000,
    false_positive_rate: 4.2,
    avg_detection_time_minutes: 3.2,
    manual_baseline_minutes: 240,
    monthly_savings: [
      { month: 'Jul', savings: 48 }, { month: 'Aug', savings: 61 },
      { month: 'Sep', savings: 74 }, { month: 'Oct', savings: 82 },
      { month: 'Nov', savings: 91 }, { month: 'Dec', savings: 103 },
      { month: 'Jan', savings: 118 }, { month: 'Feb', savings: 127 },
      { month: 'Mar', savings: 141 }, { month: 'Apr', savings: 156 },
    ],
  },
  risk_appetite: [
    { metric: 'Stage 3 Ratio', actual: 3.50, limit: 4.5, unit: '%', higher_is_better: false, status: 'amber' },
    { metric: 'CAR (Tier 1)', actual: 19.06, limit: 11.5, unit: '%', higher_is_better: true, status: 'green' },
    { metric: 'LCR (All Currency)', actual: 203.4, limit: 120.0, unit: '%', higher_is_better: true, status: 'amber' },
    { metric: 'NSFR', actual: 138.3, limit: 100.0, unit: '%', higher_is_better: true, status: 'green' },
    { metric: 'Network Override Rate', actual: 4.8, limit: 5.0, unit: '%', higher_is_better: false, status: 'amber' },
    { metric: 'KYC Gap Rate', actual: 4.7, limit: 2.0, unit: '%', higher_is_better: false, status: 'red' },
    { metric: 'Suspense >90d (LKR Bn)', actual: 3.98, limit: 0, unit: ' Bn', higher_is_better: false, status: 'red' },
    { metric: 'Active Fraud Score >0.8', actual: 23, limit: 10, unit: '', higher_is_better: false, status: 'amber' },
  ],
};