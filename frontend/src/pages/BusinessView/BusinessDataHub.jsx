import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import { buildDataQualityReport, appendUploadLogEntry, readUploadLog } from '../../utils/dataQualityReport.js';
import { DETECTOR_AGENTS } from '../../utils/detectionEngine.js';
import { runDetectionLocally, runFullDemo, SOURCE_SYSTEM } from '../../utils/liveRun.js';
import { replaceLedger } from '../../utils/runLedger.js';
import axios from 'axios';
import { useApp } from '../../context/AppContext.jsx';
import InfoTooltip from '../../components/shared/InfoTooltip.jsx';
import InfoHint from '../../components/business/InfoHint.jsx';
import {
  Upload, Download, CheckCircle, AlertCircle, Trash2,
  ChevronRight, Zap, Eye, EyeOff, ArrowRight, RefreshCw, MapPin, Sparkles
} from 'lucide-react';

// ─── AGENT CONFIG ─────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id: 'credit', name: 'Credit Intelligence', color: '#185FA5', bg: '#E6F1FB', icon: '◈',
    tagline: 'SLFRS 9 staging • Vintage cohort • Override anomalies',
    what: 'Detects loans classified in a lower SLFRS 9 stage than their feature combination warrants — identifying understated provisions across the portfolio.',
    required: ['loan_id','exposure_lkr','assigned_stage','dpd_days','collateral_ratio'],
    optional: ['restructure_count','sector','branch_code','override_flag','origination_quarter','customer_risk_rating'],
    columnDefs: {
      loan_id: 'Unique loan reference (e.g. BNK-CR-2025-0441)',
      exposure_lkr: 'Outstanding balance in LKR',
      assigned_stage: 'Current SLFRS 9 stage — 1, 2, or 3',
      dpd_days: 'Days past due at analysis date',
      collateral_ratio: 'Collateral value ÷ exposure. 0.0–1.5+',
      restructure_count: 'Times the loan has been restructured',
      sector: 'Sector e.g. Construction, Agriculture, Consumer',
      branch_code: 'Originating branch code e.g. BR-14',
      override_flag: 'true or false — was this approval override-approved?',
      origination_quarter: 'Quarter originated e.g. 2025-Q3',
      customer_risk_rating: 'Internal rating 1 (low) – 5 (high)',
    },
    sampleRows: [
      { loan_id:'BNK-CR-2025-0441', exposure_lkr:'287000000', assigned_stage:'1', dpd_days:'67', collateral_ratio:'0.38', restructure_count:'2', sector:'Construction', branch_code:'BR-14', override_flag:'true', origination_quarter:'2025-Q3' },
      { loan_id:'BNK-CR-2025-0872', exposure_lkr:'144000000', assigned_stage:'2', dpd_days:'88', collateral_ratio:'0.52', restructure_count:'0', sector:'Agriculture', branch_code:'BR-56', override_flag:'false', origination_quarter:'2025-Q2' },
      { loan_id:'BNK-CR-2025-1203', exposure_lkr:'198000000', assigned_stage:'1', dpd_days:'0',  collateral_ratio:'0.81', restructure_count:'0', sector:'Construction', branch_code:'BR-23', override_flag:'true', origination_quarter:'2025-Q4' },
      { loan_id:'BNK-CR-2025-0334', exposure_lkr:'76000000',  assigned_stage:'1', dpd_days:'12', collateral_ratio:'0.74', restructure_count:'0', sector:'SME Manufacturing', branch_code:'BR-14', override_flag:'true', origination_quarter:'2025-Q3' },
      { loan_id:'BNK-CR-2025-1567', exposure_lkr:'112000000', assigned_stage:'2', dpd_days:'45', collateral_ratio:'0.41', restructure_count:'2', sector:'Hospitality', branch_code:'BR-41', override_flag:'false', origination_quarter:'2024-Q4' },
      { loan_id:'BNK-CR-2025-0918', exposure_lkr:'93000000',  assigned_stage:'1', dpd_days:'29', collateral_ratio:'0.68', restructure_count:'0', sector:'Trade & Services', branch_code:'BR-16', override_flag:'false', origination_quarter:'2025-Q1' },
      { loan_id:'BNK-CR-2025-2041', exposure_lkr:'67000000',  assigned_stage:'1', dpd_days:'7',  collateral_ratio:'0.77', restructure_count:'0', sector:'SME Manufacturing', branch_code:'BR-14', override_flag:'true', origination_quarter:'2025-Q3' },
    ],
  },
  {
    id: 'transaction', name: 'Transaction Surveillance', color: '#2D5A8E', bg: '#EDF3FA', icon: '⟳',
    tagline: 'Structuring detection • Benford\'s Law • STR eligibility',
    what: 'Scans transactions for deliberate structuring below the LKR 5M STR threshold, velocity anomalies, and hub-and-spoke routing patterns consistent with layering.',
    required: ['transaction_id','account_id','amount_lkr','transaction_type','timestamp'],
    optional: ['channel','counterparty_account','counterparty_bank','city','device_id'],
    columnDefs: {
      transaction_id: 'Unique transaction reference',
      account_id: 'Account that initiated the transaction',
      amount_lkr: 'Transaction amount in LKR',
      transaction_type: 'CEFT / RTGS / ATM / POS / Transfer',
      timestamp: 'ISO datetime — YYYY-MM-DDTHH:MM:SS',
      channel: 'Digital / Branch / ATM / Mobile',
      counterparty_account: 'Beneficiary account number',
      counterparty_bank: 'Beneficiary bank name',
      city: 'City from IP geolocation or branch',
      device_id: 'Device fingerprint hash',
    },
    sampleRows: [
      { transaction_id:'TXN-20251220-0001', account_id:'BNK-0841-X', amount_lkr:'4950000', transaction_type:'CEFT', timestamp:'2025-12-20T23:47:02', channel:'Digital', counterparty_account:'SAM-9921-A', counterparty_bank:'Sampath Bank', city:'Colombo' },
      { transaction_id:'TXN-20251220-0002', account_id:'BNK-0841-X', amount_lkr:'4870000', transaction_type:'CEFT', timestamp:'2025-12-20T23:48:15', channel:'Digital', counterparty_account:'SAM-9921-A', counterparty_bank:'Sampath Bank', city:'Colombo' },
      { transaction_id:'TXN-20251220-0003', account_id:'BNK-0841-X', amount_lkr:'4920000', transaction_type:'CEFT', timestamp:'2025-12-20T23:49:31', channel:'Digital', counterparty_account:'SAM-9921-B', counterparty_bank:'Sampath Bank', city:'Colombo' },
      { transaction_id:'TXN-20251220-0004', account_id:'BNK-3312-B', amount_lkr:'4890000', transaction_type:'CEFT', timestamp:'2025-12-20T14:22:07', channel:'Digital', counterparty_account:'COM-1122-X', counterparty_bank:'Commercial Bank', city:'Kandy' },
      { transaction_id:'TXN-20251220-0005', account_id:'SUS-017',    amount_lkr:'8700000', transaction_type:'RTGS', timestamp:'2025-12-20T09:14:22', channel:'Digital', counterparty_account:'EXT-4412-R', counterparty_bank:'HNB', city:'Colombo' },
      { transaction_id:'TXN-20251219-0041', account_id:'BNK-7741-C', amount_lkr:'9800000', transaction_type:'RTGS', timestamp:'2025-12-19T02:21:03', channel:'Digital', counterparty_account:'EXT-8833-K', counterparty_bank:'BOC', city:'Gampaha' },
      { transaction_id:'TXN-20251218-0088', account_id:'BNK-5523-D', amount_lkr:'4980000', transaction_type:'CEFT', timestamp:'2025-12-18T11:04:55', channel:'Digital', counterparty_account:'PAN-0021-Z', counterparty_bank:'Pan Asia Bank', city:'Colombo' },
    ],
  },
  {
    id: 'suspense', name: 'Suspense & Reconciliation', color: '#993C1D', bg: '#FAECE7', icon: '⊟',
    tagline: 'Phantom receivables • Aging tiers • CEFT fraud',
    what: 'Identifies accounts where balance growth significantly outpaces clearing activity — the definitive phantom receivable signature. Flags CBSL 90-day guideline breaches.',
    required: ['account_id','account_type','branch_code','current_balance_lkr','aging_days'],
    optional: ['growth_rate_30d_pct','clearing_ratio','inflow_lkr_30d','outflow_lkr_30d','balance_30d_ago_lkr','auto_match_pct','prior_30d_inflow_lkr','counterparty_source_id','last_reaging_date','reaged_by_staff_id'],
    columnDefs: {
      account_id: 'Suspense or nostro account ID',
      account_type: 'CEFT Receivables / Fee Suspense / NOSTRO / Clearing',
      branch_code: 'Owning branch code',
      current_balance_lkr: 'Current unreconciled balance in LKR',
      aging_days: 'Days since oldest unreconciled entry',
      growth_rate_30d_pct: 'Balance % growth over last 30 days',
      clearing_ratio: 'Outflows ÷ inflows in period. 0.95+ is healthy',
      inflow_lkr_30d: 'Total inflows in last 30 days',
      outflow_lkr_30d: 'Total outflows in last 30 days',
      balance_30d_ago_lkr: 'Balance 30 days ago for trend calculation',
      auto_match_pct: 'Automated reconciliation match rate 0–100%',
      prior_30d_inflow_lkr: 'Total inflows in the 30 days before current period',
      counterparty_source_id: 'Primary counterparty source for inflows — for concentration analysis',
      last_reaging_date: 'Date the account aging was last reset — YYYY-MM-DD (blank if never)',
      reaged_by_staff_id: 'Staff ID who performed the re-aging (blank if never)',
    },
    sampleRows: [
      { account_id:'SUS-017', account_type:'CEFT Receivables', branch_code:'BR-72', current_balance_lkr:'1240000000', aging_days:'94', growth_rate_30d_pct:'312', clearing_ratio:'0.08', inflow_lkr_30d:'940000000', outflow_lkr_30d:'75000000', balance_30d_ago_lkr:'301000000' },
      { account_id:'SUS-031', account_type:'CEFT Receivables', branch_code:'BR-16', current_balance_lkr:'340000000', aging_days:'38', growth_rate_30d_pct:'187', clearing_ratio:'0.21', inflow_lkr_30d:'220000000', outflow_lkr_30d:'46000000', balance_30d_ago_lkr:'118000000' },
      { account_id:'SUS-044', account_type:'Fee Suspense',     branch_code:'BR-14', current_balance_lkr:'87000000',  aging_days:'67', growth_rate_30d_pct:'44',  clearing_ratio:'0.41', inflow_lkr_30d:'22000000',  outflow_lkr_30d:'9000000',  balance_30d_ago_lkr:'60000000' },
      { account_id:'NOS-USD-01', account_type:'NOSTRO USD',   branch_code:'BR-16', current_balance_lkr:'710000000', aging_days:'12', growth_rate_30d_pct:'8',   clearing_ratio:'0.87', inflow_lkr_30d:'180000000', outflow_lkr_30d:'157000000', balance_30d_ago_lkr:'657000000' },
      { account_id:'SUS-082', account_type:'Fee Suspense',     branch_code:'BR-23', current_balance_lkr:'97000000',  aging_days:'22', growth_rate_30d_pct:'120', clearing_ratio:'0.44', inflow_lkr_30d:'53000000',  outflow_lkr_30d:'23000000',  balance_30d_ago_lkr:'44000000' },
      { account_id:'SUS-101', account_type:'CEFT Receivables', branch_code:'BR-41', current_balance_lkr:'34000000',  aging_days:'8',  growth_rate_30d_pct:'12',  clearing_ratio:'0.91', inflow_lkr_30d:'28000000',  outflow_lkr_30d:'25000000',  balance_30d_ago_lkr:'30000000' },
    ],
  },
  {
    id: 'kyc', name: 'Identity & KYC / AML', color: '#0F6E56', bg: '#E1F5EE', icon: '✦',
    tagline: '47-rule CDD engine • PEP screening • Beneficial ownership',
    what: 'Applies a 47-rule compliance framework to identify KYC gaps, expired documents, PEP accounts without current EDD, and FATF high-risk jurisdiction exposure.',
    required: ['customer_id','risk_rating','kyc_last_refresh_date','account_open_date'],
    optional: ['pep_flag','country_of_origin','entity_type','introducer_code','beneficial_owner_disclosed','dormant_flag','pep_relationship_type','occupation','monthly_txn_volume_lkr','source_of_funds'],
    columnDefs: {
      customer_id: 'Unique customer reference',
      risk_rating: 'high / medium / low',
      kyc_last_refresh_date: 'Date of last KYC refresh — YYYY-MM-DD',
      account_open_date: 'Account opening date — YYYY-MM-DD',
      pep_flag: 'true or false — Politically Exposed Person',
      country_of_origin: 'ISO 2-letter country code e.g. LK, PK',
      entity_type: 'Individual / Company / Partnership / Trust',
      introducer_code: 'Introducer staff or agent code',
      beneficial_owner_disclosed: 'true or false — for legal entities',
      dormant_flag: 'true or false — dormant >12 months',
      pep_relationship_type: 'self / spouse / associate / family — type of PEP relationship (blank if not PEP)',
      occupation: 'Customer occupation or business type — for cash-intensive screening',
      monthly_txn_volume_lkr: 'Average monthly transaction volume in LKR — for plausibility check',
      source_of_funds: 'Declared source of funds — salary, business, inheritance, etc.',
    },
    sampleRows: [
      { customer_id:'BNK-C-0041-X', risk_rating:'high',   kyc_last_refresh_date:'2024-01-15', account_open_date:'2018-03-22', pep_flag:'true',  country_of_origin:'LK', entity_type:'Individual', introducer_code:'INT-BR14-007', beneficial_owner_disclosed:'true',  dormant_flag:'false' },
      { customer_id:'BNK-C-3312-B', risk_rating:'high',   kyc_last_refresh_date:'2023-06-10', account_open_date:'2020-11-05', pep_flag:'false', country_of_origin:'LK', entity_type:'Company',    introducer_code:'INT-BR16-003', beneficial_owner_disclosed:'false', dormant_flag:'false' },
      { customer_id:'BNK-C-7741-C', risk_rating:'medium', kyc_last_refresh_date:'2023-02-28', account_open_date:'2019-07-14', pep_flag:'false', country_of_origin:'LK', entity_type:'Individual', introducer_code:'INT-BR23-012', beneficial_owner_disclosed:'true',  dormant_flag:'false' },
      { customer_id:'BNK-C-8834-G', risk_rating:'high',   kyc_last_refresh_date:'2022-09-01', account_open_date:'2021-04-18', pep_flag:'false', country_of_origin:'PK', entity_type:'Individual', introducer_code:'INT-BR72-001', beneficial_owner_disclosed:'true',  dormant_flag:'false' },
      { customer_id:'BNK-C-5521-D', risk_rating:'medium', kyc_last_refresh_date:'2024-08-20', account_open_date:'2017-01-09', pep_flag:'false', country_of_origin:'LK', entity_type:'Individual', introducer_code:'INT-BR41-008', beneficial_owner_disclosed:'true',  dormant_flag:'true'  },
      { customer_id:'BNK-C-2209-F', risk_rating:'high',   kyc_last_refresh_date:'2024-03-11', account_open_date:'2022-06-30', pep_flag:'true',  country_of_origin:'LK', entity_type:'Individual', introducer_code:'INT-BR14-007', beneficial_owner_disclosed:'true',  dormant_flag:'false' },
    ],
  },
  {
    id: 'controls', name: 'Internal Controls', color: '#3A5A3A', bg: '#E8FDF4', icon: '⚙',
    tagline: 'SoD violations • Override concentration • Branch scoring',
    what: 'Detects Segregation of Duties violations where the same staff member both initiates and approves. Scores each branch on a 6-dimension composite to identify insider fraud risk.',
    required: ['transaction_id','branch_code','initiator_id','approver_id','amount_lkr','transaction_type','timestamp'],
    optional: ['override_flag','approval_time_minutes','customer_id','loan_id'],
    columnDefs: {
      transaction_id: 'Unique transaction reference',
      branch_code: 'Branch where transaction originated',
      initiator_id: 'Staff ID who initiated the transaction',
      approver_id: 'Staff ID who approved — SoD violation if same as initiator',
      amount_lkr: 'Transaction amount in LKR',
      transaction_type: 'Loan Disbursement / CEFT / RTGS / Account Open',
      timestamp: 'ISO datetime of approval',
      override_flag: 'true or false — was standard control overridden',
      approval_time_minutes: 'Minutes from initiation to approval. <2 mins = suspicious',
      customer_id: 'Related customer ID (optional)',
      loan_id: 'Related loan ID (optional)',
    },
    sampleRows: [
      { transaction_id:'TXN-BR14-20251104-0441', branch_code:'BR-14', initiator_id:'STF-1847', approver_id:'STF-1847', amount_lkr:'8700000',  transaction_type:'Loan Disbursement', timestamp:'2025-11-04T21:43:00', override_flag:'true',  approval_time_minutes:'1' },
      { transaction_id:'TXN-BR14-20251118-0872', branch_code:'BR-14', initiator_id:'STF-1847', approver_id:'STF-1847', amount_lkr:'14200000', transaction_type:'Loan Disbursement', timestamp:'2025-11-18T22:11:00', override_flag:'true',  approval_time_minutes:'2' },
      { transaction_id:'TXN-BR14-20251212-0334', branch_code:'BR-14', initiator_id:'STF-1847', approver_id:'STF-1847', amount_lkr:'11900000', transaction_type:'Loan Disbursement', timestamp:'2025-12-12T20:58:00', override_flag:'true',  approval_time_minutes:'1' },
      { transaction_id:'TXN-BR23-20251207-1203', branch_code:'BR-23', initiator_id:'STF-2341', approver_id:'STF-2341', amount_lkr:'4100000',  transaction_type:'CEFT',             timestamp:'2025-12-07T15:22:00', override_flag:'false', approval_time_minutes:'2' },
      { transaction_id:'TXN-BR41-20251201-0088', branch_code:'BR-41', initiator_id:'STF-3312', approver_id:'STF-3401', amount_lkr:'2800000',  transaction_type:'CEFT',             timestamp:'2025-12-01T10:44:00', override_flag:'false', approval_time_minutes:'8' },
      { transaction_id:'TXN-BR14-20251208-0778', branch_code:'BR-14', initiator_id:'STF-1847', approver_id:'STF-1847', amount_lkr:'9300000',  transaction_type:'Loan Disbursement', timestamp:'2025-12-08T21:17:00', override_flag:'true',  approval_time_minutes:'1' },
    ],
  },
  {
    id: 'digital', name: 'Digital Fraud & Identity', color: '#993556', bg: '#FBEAF0', icon: '⊕',
    tagline: 'Behavioral biometrics • Impossible travel • ATO detection',
    what: 'Compares each session\'s behavioral biometric score against the user\'s historical baseline. Detects impossible travel, unregistered devices initiating high-value transfers, and device sharing across multiple accounts.',
    required: ['session_id','account_id','device_id','login_city','behavioral_score','timestamp'],
    optional: ['is_registered_device','mfa_triggered','mfa_passed','previous_session_city','minutes_since_last_session','transaction_count','max_transaction_lkr'],
    columnDefs: {
      session_id: 'Unique session identifier',
      account_id: 'Account that logged in',
      device_id: 'Device fingerprint hash',
      login_city: 'City from IP geolocation',
      behavioral_score: 'Biometric match 0–100. 100 = perfect match to baseline',
      timestamp: 'Session start datetime — ISO format',
      is_registered_device: 'true or false — seen before for this account',
      mfa_triggered: 'true or false — step-up auth was required',
      mfa_passed: 'true or false — step-up auth succeeded',
      previous_session_city: 'City of the immediately preceding session',
      minutes_since_last_session: 'Minutes elapsed since last login',
      transaction_count: 'Number of transactions in this session',
      max_transaction_lkr: 'Largest single transaction in session',
    },
    sampleRows: [
      { session_id:'SES-BNK-20251220-8847', account_id:'BNK-0841-X',   device_id:'DEV-F221-1199', login_city:'Colombo',   behavioral_score:'28', timestamp:'2025-12-20T23:47:00', is_registered_device:'false', mfa_triggered:'true',  mfa_passed:'false', previous_session_city:'Colombo',   minutes_since_last_session:'4320', transaction_count:'0', max_transaction_lkr:'0' },
      { session_id:'SES-BNK-20251218-9121', account_id:'BNK-3312-B',   device_id:'DEV-B882-4412', login_city:'Colombo',   behavioral_score:'61', timestamp:'2025-12-18T14:50:00', is_registered_device:'true',  mfa_triggered:'true',  mfa_passed:'true',  previous_session_city:'Jaffna',    minutes_since_last_session:'18',   transaction_count:'2', max_transaction_lkr:'14800000' },
      { session_id:'SES-BNK-20251215-7734', account_id:'BNK-7741-C',   device_id:'DEV-C331-7721', login_city:'Gampaha',   behavioral_score:'44', timestamp:'2025-12-15T02:17:00', is_registered_device:'false', mfa_triggered:'true',  mfa_passed:'true',  previous_session_city:'Gampaha',   minutes_since_last_session:'8640', transaction_count:'1', max_transaction_lkr:'9800000' },
      { session_id:'SES-BNK-20251210-6612', account_id:'BNK-STF-1847', device_id:'DEV-A4F7-9921', login_city:'Ratnapura', behavioral_score:'57', timestamp:'2025-12-10T21:43:00', is_registered_device:'true',  mfa_triggered:'false', mfa_passed:'true',  previous_session_city:'Ratnapura', minutes_since_last_session:'780',  transaction_count:'0', max_transaction_lkr:'0' },
      { session_id:'SES-BNK-20251220-4421', account_id:'BNK-8834-G',   device_id:'DEV-A4F7-9921', login_city:'Colombo',   behavioral_score:'72', timestamp:'2025-12-20T11:22:00', is_registered_device:'false', mfa_triggered:'false', mfa_passed:'true',  previous_session_city:'Colombo',   minutes_since_last_session:'120',  transaction_count:'3', max_transaction_lkr:'4800000' },
    ],
  },
  {
    id: 'trade', name: 'Trade Finance & Treasury', color: '#2E7D32', bg: '#E8F5E9', icon: '◎',
    tagline: 'Invoice forensics • TBML • LCR/NSFR monitoring',
    what: 'Benchmarks declared unit prices against HS code industry medians to detect over/under-invoicing. Identifies duplicate LC applications on overlapping shipment periods and treasury limit breaches.',
    required: ['document_id','customer_id','hs_code','declared_unit_price','invoice_currency','counterparty_country'],
    optional: ['commodity_description','quantity','lc_reference','shipment_period_start','shipment_period_end','invoice_amount_lkr','lc_amount_lkr','trade_direction','position_id','currency_pair','position_amount','approved_limit','trader_id'],
    columnDefs: {
      document_id: 'Invoice or LC document reference',
      customer_id: 'Demo Bank customer or corporate ID',
      hs_code: 'Harmonised System commodity code',
      declared_unit_price: 'Price per unit in invoice currency',
      invoice_currency: 'ISO currency code — USD, EUR, etc.',
      counterparty_country: 'ISO 2-letter country code of overseas counterparty',
      commodity_description: 'Human-readable commodity name',
      quantity: 'Number of units',
      lc_reference: 'Letter of Credit reference number',
      shipment_period_start: 'Start of shipment window — YYYY-MM-DD',
      shipment_period_end: 'End of shipment window — YYYY-MM-DD',
      invoice_amount_lkr: 'Total invoice in LKR equivalent',
      lc_amount_lkr: 'Letter of Credit face value in LKR — for invoice vs LC consistency check',
      trade_direction: 'import or export — direction of goods flow',
      position_id: 'Treasury FX position ID',
      currency_pair: 'FX pair e.g. USD/LKR',
      position_amount: 'Position size in base currency',
      approved_limit: 'Approved limit in base currency',
      trader_id: 'Trader staff ID',
    },
    sampleRows: [
      { document_id:'INV-2025-3441', customer_id:'BNK-CORP-0887', hs_code:'6203', declared_unit_price:'34.70', invoice_currency:'USD', counterparty_country:'AE', commodity_description:"Men's apparel", quantity:'5000', lc_reference:'LC-2025-3341', shipment_period_start:'2025-11-01', shipment_period_end:'2025-12-31', invoice_amount_lkr:'530000000' },
      { document_id:'INV-2025-3687', customer_id:'BNK-CORP-0887', hs_code:'6203', declared_unit_price:'33.90', invoice_currency:'USD', counterparty_country:'AE', commodity_description:"Men's apparel", quantity:'4800', lc_reference:'LC-2025-3687', shipment_period_start:'2025-11-15', shipment_period_end:'2025-12-31', invoice_amount_lkr:'517000000' },
      { document_id:'INV-2025-4112', customer_id:'BNK-CORP-2341', hs_code:'0901', declared_unit_price:'2.10',  invoice_currency:'USD', counterparty_country:'DE', commodity_description:'Coffee unroasted', quantity:'20000', lc_reference:'LC-2025-4002', shipment_period_start:'2025-12-01', shipment_period_end:'2026-01-31', invoice_amount_lkr:'126000000' },
      { document_id:'INV-2025-5881', customer_id:'BNK-CORP-4412', hs_code:'7108', declared_unit_price:'28.00', invoice_currency:'USD', counterparty_country:'SG', commodity_description:'Gold unwrought', quantity:'3000', lc_reference:'LC-2025-5701', shipment_period_start:'2025-12-10', shipment_period_end:'2026-02-28', invoice_amount_lkr:'252000000' },
      { document_id:'INV-2025-2201', customer_id:'BNK-CORP-1122', hs_code:'4011', declared_unit_price:'42.50', invoice_currency:'USD', counterparty_country:'CN', commodity_description:'Rubber tyres', quantity:'1200', lc_reference:'LC-2025-2201', shipment_period_start:'2025-10-01', shipment_period_end:'2025-11-30', invoice_amount_lkr:'153000000' },
    ],
  },
  {
    id: 'insider', name: 'Insider Risk', color: '#4B3F72', bg: '#F3F1FF', icon: '◉',
    tagline: 'Staff access logs • override patterns • approval timing',
    what: 'Scores every staff member with system access on 6 insider fraud dimensions — SoD violations, override concentration, same-cluster approvals, off-hours activity, approval turnaround anomaly, and session behavioral deviation.',
    required: ['staff_id','branch_code','transaction_id','role','initiator_flag','approver_flag','timestamp','amount_lkr'],
    optional: ['override_flag','approval_time_minutes','session_id','login_city','device_id','is_registered_device','customer_id','loan_id'],
    columnDefs: {
      staff_id: 'Staff member unique ID — e.g. STF-1847',
      branch_code: 'Branch where activity occurred — e.g. BR-14',
      transaction_id: 'Transaction reference being initiated/approved',
      role: 'Staff role — e.g. Relationship Manager, Branch Manager',
      initiator_flag: 'true if this staff member initiated the transaction',
      approver_flag: 'true if this staff member approved the transaction',
      timestamp: 'ISO datetime of the action — YYYY-MM-DDTHH:MM:SS',
      amount_lkr: 'Transaction amount in LKR',
      override_flag: 'true if an override was applied',
      approval_time_minutes: 'Minutes elapsed from initiation to approval',
      session_id: 'Login session ID at time of action',
      login_city: 'City inferred from login IP address',
      device_id: 'Device fingerprint ID',
      is_registered_device: 'true if device is pre-registered to this staff member',
      customer_id: 'Customer account affected',
      loan_id: 'Loan ID if credit transaction',
    },
    sampleRows: [
      { staff_id:'STF-1847', branch_code:'BR-14', transaction_id:'TXN-2025-441A', role:'Senior Loans Officer', initiator_flag:'true',  approver_flag:'true',  timestamp:'2025-12-20T21:43:00', amount_lkr:'14500000', override_flag:'true',  approval_time_minutes:'1.2', session_id:'SES-BNK-20251210-6612', login_city:'Ratnapura', device_id:'DEV-RMB14-001', is_registered_device:'true', customer_id:'BNK-C-0441', loan_id:'BNK-CR-2025-0441' },
      { staff_id:'STF-1847', branch_code:'BR-14', transaction_id:'TXN-2025-872B', role:'Senior Loans Officer', initiator_flag:'true',  approver_flag:'true',  timestamp:'2025-12-20T22:11:00', amount_lkr:'12200000', override_flag:'true',  approval_time_minutes:'1.4', session_id:'SES-BNK-20251210-6612', login_city:'Ratnapura', device_id:'DEV-RMB14-001', is_registered_device:'true', customer_id:'BNK-C-0872', loan_id:'BNK-CR-2025-0872' },
      { staff_id:'STF-2341', branch_code:'BR-23', transaction_id:'TXN-2025-334C', role:'Senior Credit Officer', initiator_flag:'false', approver_flag:'true',  timestamp:'2025-12-19T14:22:00', amount_lkr:'8400000',  override_flag:'true',  approval_time_minutes:'8.7', session_id:'SES-BNK-20251219-2234', login_city:'Embilipitiya', device_id:'DEV-SCO23-004', is_registered_device:'true', customer_id:'BNK-C-3341', loan_id:'BNK-CR-2025-0334' },
      { staff_id:'STF-1109', branch_code:'BR-11', transaction_id:'TXN-2025-621D', role:'Branch Manager', initiator_flag:'false', approver_flag:'true',  timestamp:'2025-12-18T10:15:00', amount_lkr:'21300000', override_flag:'false', approval_time_minutes:'24.3',session_id:'SES-BNK-20251218-8891', login_city:'Batticaloa', device_id:'DEV-BM11-002', is_registered_device:'true', customer_id:'BNK-C-6210', loan_id:'BNK-CR-2025-0621' },
      { staff_id:'STF-0771', branch_code:'BR-56', transaction_id:'TXN-2025-918E', role:'Relationship Manager', initiator_flag:'true',  approver_flag:'false', timestamp:'2025-12-17T09:30:00', amount_lkr:'9300000',  override_flag:'false', approval_time_minutes:null, session_id:'SES-BNK-20251217-7712', login_city:'Matara', device_id:'DEV-RM56-007', is_registered_device:'true', customer_id:'BNK-C-9180', loan_id:'BNK-CR-2025-0918' },
    ],
  },
  {
    id: 'mje', name: 'MJE Testing', color: '#0BBF7A', bg: '#ECFEFF', icon: '⊞',
    tagline: 'Manual journal entries • GL accounts • maker-checker',
    what: 'Full-population testing of all manual journal entries. Scores each entry on timing anomalies, amount patterns (Benford, round numbers), GL account sensitivity, maker-checker SoD, and supporting document completeness.',
    required: ['entry_id','gl_account','gl_name','amount_lkr','debit_credit','entry_date','entry_time','maker_id','approver_id'],
    optional: ['description','cost_centre','period','document_ref','is_reversal','reversal_of','authorisation_level','is_automated'],
    columnDefs: {
      entry_id: 'Unique MJE reference — e.g. MJE-2026-4201',
      gl_account: 'General Ledger account code',
      gl_name: 'Human-readable GL account name',
      amount_lkr: 'Entry amount in LKR (absolute value)',
      debit_credit: 'Dr or Cr — debit or credit side of entry',
      entry_date: 'Date of posting — YYYY-MM-DD',
      entry_time: 'Time of posting — HH:MM:SS',
      maker_id: 'Staff ID who created the entry',
      approver_id: 'Staff ID who approved the entry',
      description: 'Narrative description of the entry purpose',
      cost_centre: 'Cost centre or branch code',
      period: 'Accounting period — e.g. 2025-12',
      document_ref: 'Supporting document reference — leave blank if none',
      is_reversal: 'true if this entry reverses a prior entry',
      reversal_of: 'entry_id of the original entry being reversed',
      authorisation_level: 'Required auth level — standard, senior, director',
      is_automated: 'true if generated by an automated system (not manual)',
    },
    sampleRows: [
      { entry_id:'MJE-2026-4201', gl_account:'SUS-001',         gl_name:'CEFT Receivables Suspense',   amount_lkr:'185000000', debit_credit:'Dr', entry_date:'2025-12-31', entry_time:'23:47:00', maker_id:'STF-1847', approver_id:'STF-1847', description:'Month-end CEFT clearing adjustment', cost_centre:'BR-14', period:'2025-12', document_ref:'',             is_reversal:'false', reversal_of:'',             authorisation_level:'senior',   is_automated:'false' },
      { entry_id:'MJE-2026-4202', gl_account:'SUS-044',         gl_name:'Fee Suspense BR-14',          amount_lkr:'9450000',   debit_credit:'Cr', entry_date:'2025-12-31', entry_time:'23:52:00', maker_id:'STF-1847', approver_id:'STF-1847', description:'Fee accrual reversal',            cost_centre:'BR-14', period:'2025-12', document_ref:'',             is_reversal:'true',  reversal_of:'MJE-2025-3981', authorisation_level:'standard', is_automated:'false' },
      { entry_id:'MJE-2026-4203', gl_account:'4100-PROV',       gl_name:'Loan Loss Provision',        amount_lkr:'45000000',  debit_credit:'Cr', entry_date:'2025-12-30', entry_time:'17:14:00', maker_id:'STF-2210', approver_id:'STF-0441', description:'Q4 2025 SLFRS 9 ECL provision',  cost_centre:'HEAD', period:'2025-12', document_ref:'ECL-RPT-Q4-2025', is_reversal:'false', reversal_of:'',             authorisation_level:'director', is_automated:'false' },
      { entry_id:'MJE-2026-4205', gl_account:'1200-LOANS',      gl_name:'Loans Receivable',           amount_lkr:'185000000', debit_credit:'Dr', entry_date:'2025-12-31', entry_time:'00:03:00', maker_id:'STF-1847', approver_id:'STF-1847', description:'Loan balance adjustment',         cost_centre:'BR-14', period:'2025-12', document_ref:'',             is_reversal:'false', reversal_of:'',             authorisation_level:'director', is_automated:'false' },
      { entry_id:'MJE-2026-4205', gl_account:'3300-INT-INCOME', gl_name:'Interest Income Accrual',    amount_lkr:'2340000',   debit_credit:'Cr', entry_date:'2025-12-29', entry_time:'09:45:00', maker_id:'STF-3312', approver_id:'STF-0888', description:'December interest accrual',       cost_centre:'HEAD', period:'2025-12', document_ref:'INT-ACC-DEC',     is_reversal:'false', reversal_of:'',             authorisation_level:'standard', is_automated:'false' },
    ],
  },
  {
    id: 'capital', name: 'Capital & Liquidity', color: '#1D4ED8', bg: '#E8F0FE', icon: '⌖',
    tagline: 'Basel III ratios • capital structure • liquidity trends • projection',
    what: 'Computes Tier 1 / Tier 2 / CAR, the Basel III leverage ratio, LCR (with HQLA composition), and NSFR from quarterly capital-structure inputs. Builds an 8-quarter historical trend, projects 4 quarters forward, attributes LCR movement across 5 drivers, and generates ALCO remediation actions. Feeds the Regulatory Capital dashboard and the Basel III framework score on Compliance.',
    required: ['quarter','tier1_capital_lkr_bn','tier2_capital_lkr_bn','rwa_credit_lkr_bn','rwa_market_lkr_bn','rwa_operational_lkr_bn','hqla_level1_lkr_bn','hqla_level2a_lkr_bn','hqla_level2b_lkr_bn','net_cash_outflow_30d_lkr_bn','available_stable_funding_lkr_bn','required_stable_funding_lkr_bn'],
    optional: ['total_exposure_measure_lkr_bn','peer_median_car','peer_median_lcr','peer_median_nsfr'],
    columnDefs: {
      quarter: 'Quarter label — e.g. Q4 25',
      tier1_capital_lkr_bn: 'Tier 1 capital in LKR billions (common equity + retained earnings)',
      tier2_capital_lkr_bn: 'Tier 2 capital in LKR billions (subordinated debt + general provisions)',
      rwa_credit_lkr_bn: 'Credit risk-weighted assets in LKR Bn',
      rwa_market_lkr_bn: 'Market risk-weighted assets in LKR Bn',
      rwa_operational_lkr_bn: 'Operational risk-weighted assets in LKR Bn',
      hqla_level1_lkr_bn: 'Level 1 HQLA — cash, CBSL reserves, government securities — LKR Bn',
      hqla_level2a_lkr_bn: 'Level 2A HQLA — qualifying covered bonds, select corporate debt — LKR Bn',
      hqla_level2b_lkr_bn: 'Level 2B HQLA — lower-quality assets subject to larger haircuts — LKR Bn',
      net_cash_outflow_30d_lkr_bn: 'Projected net cash outflow under 30-day stress scenario — LKR Bn',
      available_stable_funding_lkr_bn: 'ASF — weighted stable funding available — LKR Bn',
      required_stable_funding_lkr_bn: 'RSF — weighted stable funding required — LKR Bn',
      total_exposure_measure_lkr_bn: 'Basel III leverage exposure measure (on- + off-balance-sheet) — LKR Bn. Enables the leverage ratio (Tier 1 ÷ this); leave blank if unavailable.',
      peer_median_car: 'Peer median CAR percentage — Sri Lankan LCB median (leave blank if unknown)',
      peer_median_lcr: 'Peer median LCR percentage (optional)',
      peer_median_nsfr: 'Peer median NSFR percentage (optional)',
    },
    sampleRows: [
      { quarter:'Q1 24', tier1_capital_lkr_bn:'146.00', tier2_capital_lkr_bn:'32.00', rwa_credit_lkr_bn:'870.0', rwa_market_lkr_bn:'48.0', rwa_operational_lkr_bn:'82.0', hqla_level1_lkr_bn:'132.70', hqla_level2a_lkr_bn:'11.25', hqla_level2b_lkr_bn:'0.30', net_cash_outflow_30d_lkr_bn:'45.0',  available_stable_funding_lkr_bn:'541.45', required_stable_funding_lkr_bn:'350.00', peer_median_car:'15.8', peer_median_lcr:'234.0', peer_median_nsfr:'128.0', total_exposure_measure_lkr_bn:'2028.0' },
      { quarter:'Q3 24', tier1_capital_lkr_bn:'163.90', tier2_capital_lkr_bn:'35.20', rwa_credit_lkr_bn:'950.0', rwa_market_lkr_bn:'58.0', rwa_operational_lkr_bn:'92.0', hqla_level1_lkr_bn:'137.80', hqla_level2a_lkr_bn:'9.35',  hqla_level2b_lkr_bn:'0.25', net_cash_outflow_30d_lkr_bn:'50.0',  available_stable_funding_lkr_bn:'564.68', required_stable_funding_lkr_bn:'380.00', peer_median_car:'16.0', peer_median_lcr:'228.0', peer_median_nsfr:'128.0', total_exposure_measure_lkr_bn:'2375.0' },
      { quarter:'Q1 25', tier1_capital_lkr_bn:'184.80', tier2_capital_lkr_bn:'38.40', rwa_credit_lkr_bn:'1030.0', rwa_market_lkr_bn:'66.0', rwa_operational_lkr_bn:'104.0', hqla_level1_lkr_bn:'138.90', hqla_level2a_lkr_bn:'9.87',  hqla_level2b_lkr_bn:'0.40', net_cash_outflow_30d_lkr_bn:'57.0',  available_stable_funding_lkr_bn:'596.77', required_stable_funding_lkr_bn:'415.00', peer_median_car:'16.2', peer_median_lcr:'220.0', peer_median_nsfr:'128.0', total_exposure_measure_lkr_bn:'2758.0' },
      { quarter:'Q3 25', tier1_capital_lkr_bn:'208.56', tier2_capital_lkr_bn:'41.74', rwa_credit_lkr_bn:'1130.0', rwa_market_lkr_bn:'75.0', rwa_operational_lkr_bn:'115.0', hqla_level1_lkr_bn:'138.00', hqla_level2a_lkr_bn:'17.82', hqla_level2b_lkr_bn:'0.67', net_cash_outflow_30d_lkr_bn:'69.0',  available_stable_funding_lkr_bn:'656.59', required_stable_funding_lkr_bn:'470.00', peer_median_car:'16.4', peer_median_lcr:'212.0', peer_median_nsfr:'128.0', total_exposure_measure_lkr_bn:'3208.0' },
      { quarter:'Q4 25', tier1_capital_lkr_bn:'222.60', tier2_capital_lkr_bn:'44.24', rwa_credit_lkr_bn:'1180.0', rwa_market_lkr_bn:'80.0', rwa_operational_lkr_bn:'120.0', hqla_level1_lkr_bn:'141.07', hqla_level2a_lkr_bn:'23.24', hqla_level2b_lkr_bn:'1.66', net_cash_outflow_30d_lkr_bn:'81.6', available_stable_funding_lkr_bn:'691.50', required_stable_funding_lkr_bn:'500.00', peer_median_car:'16.5', peer_median_lcr:'208.0', peer_median_nsfr:'128.0', total_exposure_measure_lkr_bn:'3478.0' },
    ],
  },
  {
    id: 'balance', name: 'Balance Sheet Drivers', color: '#0EA5E9', bg: '#E0F2FE', icon: '↔',
    tagline: 'Loan book • deposits • HQLA mix • depositor concentration',
    what: 'Attributes 8-quarter LCR and CAR movement to five structural drivers: loan book growth, deposit growth, retained earnings buffer, HQLA composition shift, and corporate depositor concentration. Produces the narrative LCR bridge shown on the Regulatory Capital page.',
    required: ['quarter','loan_book_lkr_bn','deposits_lkr_bn','retained_earnings_lkr_bn','hqla_level1_share_pct','top10_depositor_share_pct'],
    optional: ['corporate_deposit_lkr_bn'],
    columnDefs: {
      quarter: 'Quarter label — e.g. Q4 25',
      loan_book_lkr_bn: 'Gross loan book in LKR Bn',
      deposits_lkr_bn: 'Total customer deposits in LKR Bn',
      retained_earnings_lkr_bn: 'Retained earnings added to Tier 1 capital in the quarter — LKR Bn',
      hqla_level1_share_pct: 'Level 1 assets as % of total HQLA',
      top10_depositor_share_pct: 'Share of total deposits held by top-10 depositors — %',
      corporate_deposit_lkr_bn: 'Corporate deposit balance — LKR Bn (optional)',
    },
    sampleRows: [
      { quarter:'Q1 24', loan_book_lkr_bn:'620.0',  deposits_lkr_bn:'780.0', retained_earnings_lkr_bn:'18.5', hqla_level1_share_pct:'92.0', top10_depositor_share_pct:'21.2', corporate_deposit_lkr_bn:'214.0' },
      { quarter:'Q3 24', loan_book_lkr_bn:'720.0',  deposits_lkr_bn:'815.0', retained_earnings_lkr_bn:'24.0', hqla_level1_share_pct:'93.4', top10_depositor_share_pct:'24.0', corporate_deposit_lkr_bn:'242.0' },
      { quarter:'Q1 25', loan_book_lkr_bn:'835.0',  deposits_lkr_bn:'852.0', retained_earnings_lkr_bn:'31.5', hqla_level1_share_pct:'93.1', top10_depositor_share_pct:'27.8', corporate_deposit_lkr_bn:'268.0' },
      { quarter:'Q3 25', loan_book_lkr_bn:'960.0',  deposits_lkr_bn:'890.0', retained_earnings_lkr_bn:'39.5', hqla_level1_share_pct:'88.2', top10_depositor_share_pct:'31.7', corporate_deposit_lkr_bn:'290.0' },
      { quarter:'Q4 25', loan_book_lkr_bn:'1045.0', deposits_lkr_bn:'915.0', retained_earnings_lkr_bn:'44.8', hqla_level1_share_pct:'85.0', top10_depositor_share_pct:'34.5', corporate_deposit_lkr_bn:'308.0' },
    ],
  },
  {
    id: 'compseed', name: 'Compliance History Seed', color: '#6366F1', bg: '#EEF2FF', icon: '⧉',
    tagline: 'Quarterly composite scores • ledger seed',
    what: 'One-time import utility: loads a four-quarter composite-score history directly into the local run ledger so the Compliance quarterly-trend chart has context before any live agent has run. This is a client-side import — no LLM call is made.',
    required: ['quarter','cbsl','basel','fatf','aml','sod','composite'],
    optional: [],
    columnDefs: {
      quarter: 'Quarter label — e.g. Q4 25',
      cbsl: 'CBSL framework score 0-100',
      basel: 'Basel III framework score 0-100',
      fatf: 'FATF framework score 0-100',
      aml: 'AML / STR framework score 0-100',
      sod: 'Segregation of Duties framework score 0-100',
      composite: 'Weighted composite score 0-100',
    },
    sampleRows: [
      { quarter:'Q1 25', cbsl:'78', basel:'92', fatf:'70', aml:'76', sod:'74', composite:'79' },
      { quarter:'Q2 25', cbsl:'74', basel:'90', fatf:'66', aml:'74', sod:'70', composite:'76' },
      { quarter:'Q3 25', cbsl:'70', basel:'87', fatf:'60', aml:'69', sod:'66', composite:'73' },
      { quarter:'Q4 25', cbsl:'68', basel:'84', fatf:'56', aml:'65', sod:'61', composite:'69' },
    ],
    clientHandler: 'seedLedger',
  },

  // ─── PHASE 2 DOMAIN AGENTS ─────────────────────────────────────────────
  // Business-Platform-only detection agents. Upload their CSVs here; findings
  // surface in the corresponding domain deep-dive page.
  {
    id: 'wealth', name: 'Wealth Suitability', color: '#7C3AED', bg: '#F3EEFE', icon: '❖',
    tagline: 'Suitability gaps • Concentration • RM churn velocity',
    what: 'Detects consumer wealth mis-selling: customers in unsuitable-risk products, single-product concentration, and relationship-manager-driven churning.',
    required: ['customer_id','risk_profile','product_id','product_risk_rating','holding_lkr','rm_code'],
    optional: ['hold_days','min_hold_days','fees_ytd_lkr','switches_90d','suitability_gap_flag'],
    columnDefs: {
      customer_id: 'Wealth customer identifier', risk_profile: 'Customer risk profile 1 (conservative) – 5 (aggressive)',
      product_id: 'Product identifier', product_risk_rating: 'Product risk rating 1–5',
      holding_lkr: 'Current holding value in LKR', rm_code: 'Relationship Manager code',
      hold_days: 'Days held since allocation', min_hold_days: 'Recommended minimum holding period',
      fees_ytd_lkr: 'Fees to bank YTD', switches_90d: 'Product switches in last 90 days',
    },
    sampleRows: [
      { customer_id:'WM-00182', risk_profile:'2', product_id:'PROD-E05', product_risk_rating:'5', holding_lkr:'28000000', rm_code:'RM-014', switches_90d:'6' },
      { customer_id:'WM-01103', risk_profile:'1', product_id:'PROD-E04', product_risk_rating:'4', holding_lkr:'9200000',  rm_code:'RM-031', switches_90d:'3' },
    ],
  },
  {
    id: 'collateral', name: 'Collateral Integrity', color: '#B45309', bg: '#FDF4E7', icon: '◇',
    tagline: 'Stale valuations • LTV breaches • Double-pledges',
    what: 'Audits the collateral register for stale valuations, LTV breaches, double-pledging, and valuer concentration.',
    required: ['collateral_id','loan_id','valuation_lkr','valuation_date','ltv_ratio'],
    optional: ['type','valuer_code','pledge_count','exposure_lkr','branch_code'],
    columnDefs: {
      collateral_id: 'Unique collateral identifier', loan_id: 'Associated loan',
      valuation_lkr: 'Valuation in LKR', valuation_date: 'Date of last valuation',
      ltv_ratio: 'Loan-to-value ratio', valuer_code: 'Valuer reference',
      pledge_count: 'Number of active pledges on this collateral',
    },
    sampleRows: [
      { collateral_id:'COL-34891', loan_id:'BNK-CR-2025-0441', valuation_lkr:'420000000', valuation_date:'2022-06-15', ltv_ratio:'0.94', valuer_code:'VAL-007' },
    ],
  },
  {
    id: 'connectedParty', name: 'Connected Party', color: '#BE123C', bg: '#FDECEF', icon: '⬡',
    tagline: 'Single-obligor limits • Shared directors • Shell patterns',
    what: 'Detects CBSL single-obligor and related-party limit breaches, shared-director networks, and shell-company patterns.',
    required: ['customer_id','aggregate_exposure_lkr','single_obligor_pct'],
    optional: ['group_id','relationship_type','shared_director_flag','shared_director_count','beneficial_owner_id','registered_capital_lkr','cbsl_disclosure_status'],
    columnDefs: {
      customer_id: 'Customer identifier', aggregate_exposure_lkr: 'Aggregate exposure in LKR',
      single_obligor_pct: '% of bank capital base', group_id: 'Connected group identifier',
      shared_director_count: 'Number of shared directors', beneficial_owner_id: 'Beneficial owner reference',
    },
    sampleRows: [
      { customer_id:'BNK-CORP-0887', group_id:'GRP-018', aggregate_exposure_lkr:'24300000000', single_obligor_pct:'25.1', shared_director_count:'4' },
    ],
  },
  {
    id: 'alm', name: 'ALM & IRRBB', color: '#0F766E', bg: '#ECFDF5', icon: '⇅',
    tagline: 'Repricing gaps • EVE/NII sensitivity • Liquidity buckets',
    what: 'Audits asset-liability position for interest-rate risk in the banking book, repricing gap breaches, duration mismatches.',
    required: ['bucket','rate_sensitive_assets_lkr','rate_sensitive_liabilities_lkr'],
    optional: ['gap_lkr','cumulative_gap_lkr','cumulative_gap_pct','eve_sensitivity_bps','scenario','nii_impact_pct'],
    columnDefs: {
      bucket: 'Repricing bucket e.g. 6m-1y',
      rate_sensitive_assets_lkr: 'RSA in LKR',
      rate_sensitive_liabilities_lkr: 'RSL in LKR',
    },
    sampleRows: [
      { bucket:'6m-1y', rate_sensitive_assets_lkr:'94000000000', rate_sensitive_liabilities_lkr:'185000000000', gap_lkr:'-91000000000', cumulative_gap_pct:'-20.3' },
    ],
  },
  {
    id: 'thirdParty', name: 'Third-Party Risk', color: '#475569', bg: '#F1F5F9', icon: '◈',
    tagline: 'Vendor concentration • Exit readiness • CBSL outsourcing',
    what: 'Audits the vendor register for concentration risk, stale assessments, critical-exit readiness, and CBSL outsourcing gaps.',
    required: ['vendor_id','category','criticality','annual_spend_lkr'],
    optional: ['concentration_pct','contract_end_date','last_assessment_date','cbsl_category','exit_plan_status'],
    columnDefs: {
      vendor_id: 'Vendor identifier', category: 'Spend category',
      criticality: 'critical | high | medium | low', concentration_pct: '% of category spend',
    },
    sampleRows: [
      { vendor_id:'VND-0012', category:'Core Banking Platform', criticality:'critical', annual_spend_lkr:'820000000', concentration_pct:'78', contract_end_date:'2026-05-11' },
    ],
  },
  {
    id: 'accessRights', name: 'Access Rights', color: '#0891B2', bg: '#ECFEFF', icon: '⚿',
    tagline: 'Dormant privileged • Toxic combinations • SoD at entitlement layer',
    what: 'Audits user access entitlements for privilege creep, dormant accounts, toxic combinations, and review-cycle failures.',
    required: ['user_id','role','privilege_level'],
    optional: ['last_login_days','last_review_days','dormant_flag','sod_conflict_flag','toxic_combination_code','toxic_combination_description'],
    columnDefs: {
      user_id: 'Staff/user identifier', role: 'Role title',
      privilege_level: 'admin | privileged | standard',
      last_login_days: 'Days since last login',
    },
    sampleRows: [
      { user_id:'STF-1847', role:'Branch Manager', privilege_level:'privileged', last_review_days:'287', toxic_combination_code:'TOXIC-LI-LA' },
    ],
  },
  {
    id: 'conduct', name: 'Conduct & Grievance', color: '#9333EA', bg: '#F5F0FE', icon: '◐',
    tagline: 'Recurrence • Whistleblower clusters • Case ageing',
    what: 'Audits the conduct register for recurrence patterns, whistleblower clusters, and cross-agent matches with insider risk.',
    required: ['case_id','subject_role','category','severity','opened_date'],
    optional: ['resolution_status','closed_date','days_open','recurrence_count','whistleblower_flag','branch_code'],
    columnDefs: {
      case_id: 'Case reference', subject_role: 'Subject staff ID or role',
      category: 'e.g. behaviour, process-breach, financial-misconduct',
    },
    sampleRows: [
      { case_id:'CD-00487', subject_role:'STF-1847', category:'process-breach', severity:'high', opened_date:'2025-11-03', recurrence_count:'3', branch_code:'BR-14' },
    ],
  },
  {
    id: 'kyc_sanctions', name: 'Sanctions Screening', color: '#0F6E56', bg: '#E8F5F0', icon: '⊘',
    tagline: 'OFAC / UN / EU sanctions hits • Fuzzy match review',
    what: 'Extension of the KYC Agent: fuzzy-match sanctions screening, review ageing, PEP overlap.',
    required: ['customer_id','list_source','match_score','match_type'],
    optional: ['match_target_name','review_status','days_open','pep_flag','recommended_action'],
    columnDefs: {
      customer_id: 'Customer identifier',
      list_source: 'OFAC | UN | EU | other',
      match_score: 'Fuzzy match score 0.0–1.0',
      match_type: 'exact | phonetic | partial | fuzzy',
    },
    sampleRows: [
      { customer_id:'CUST-10041', list_source:'OFAC', match_score:'0.94', match_type:'exact', review_status:'open' },
    ],
  },
  {
    id: 'tax_positions', name: 'Tax Positions', color: '#0BBF7A', bg: '#E8FDF4', icon: '⊞',
    tagline: 'Deferred tax • VAT reconciliation • Variance analysis',
    what: 'Extension of the MJE Agent: tests booked tax positions against expected amounts, flags variance above threshold.',
    required: ['position_id','tax_type','amount_lkr','expected_amount_lkr'],
    optional: ['variance_pct','temp_perm_diff','valuation_allowance','aging_days','reconciled_flag','period'],
    columnDefs: {
      position_id: 'Tax position reference',
      tax_type: 'Income Tax | VAT | WHT | Deferred Tax | …',
      amount_lkr: 'Booked amount',
      expected_amount_lkr: 'Computed expected amount',
    },
    sampleRows: [
      { position_id:'TAX-002', tax_type:'Deferred Tax Asset', amount_lkr:'1200000000', expected_amount_lkr:'1350000000', variance_pct:'-11.1', period:'2025-Q4' },
    ],
  },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
}

function downloadCsv(rows, filename) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

function fmtNum(v) {
  const n = Number(v);
  if (isNaN(n)) return v;
  if (Math.abs(n) >= 1e9) return (n/1e9).toFixed(2)+'B';
  if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1)+'K';
  return n % 1 !== 0 ? n.toFixed(2) : String(n);
}

function isNumericCol(col, rows) {
  return rows.slice(0,5).every(r => r[col] !== undefined && r[col] !== '' && !isNaN(Number(r[col])));
}

// ─── SCROLLABLE DATA TABLE ────────────────────────────────────────────────────

function DataTable({ rows, color, maxRows = 3, highlightRequired = [], label }) {
  const [showAll, setShowAll] = useState(false);
  if (!rows.length) return null;
  const cols = Object.keys(rows[0]);
  const display = showAll ? rows : rows.slice(0, maxRows);

  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      {label && (
        <div style={{ padding:'10px 14px', background:'var(--color-surface-2)', borderBottom:'1px solid var(--color-border)', fontSize:11, fontWeight:600, color:'var(--color-text-2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>{label}</span>
          <span style={{ fontWeight:400, color:'var(--color-text-3)' }}>{rows.length} rows</span>
        </div>
      )}
      <div style={{ overflowX:'auto' }}>
        <table className="data-table" style={{ minWidth: cols.length * 120 }}>
          <thead>
            <tr>
              {cols.map(col => (
                <th key={col} style={{ whiteSpace:'nowrap', fontSize:11, background:'var(--color-surface-2)' }}>
                  <span style={{ color: highlightRequired.includes(col) ? color : 'var(--color-text-2)', fontWeight: highlightRequired.includes(col) ? 600 : 400 }}>{col}</span>
                  {highlightRequired.includes(col) && <span style={{ color, fontSize:9, marginLeft:2 }}>*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((row, i) => (
              <tr key={i}>
                {cols.map(col => {
                  const v = row[col] ?? '—';
                  const isNum = isNumericCol(col, rows);
                  const isBool = v === 'true' || v === 'false';
                  return (
                    <td key={col} style={{ fontSize:12, whiteSpace:'nowrap', fontFamily: isNum ? 'monospace' : 'inherit', color: v === 'true' && col.includes('flag') ? '#3A5A3A' : v === 'false' ? 'var(--color-text-3)' : 'inherit', textAlign: isNum ? 'right' : 'left' }}>
                      {isNum && !isBool ? fmtNum(v) : String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > maxRows && (
        <button onClick={() => setShowAll(!showAll)} style={{ width:'100%', padding:'8px', fontSize:12, color:'var(--color-text-2)', background:'var(--color-surface-2)', border:'none', borderTop:'1px solid var(--color-border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          {showAll ? <><EyeOff size={13}/>Show less</> : <><Eye size={13}/>Show all {rows.length} rows</>}
        </button>
      )}
    </div>
  );
}

// ─── UPLOAD PANEL ─────────────────────────────────────────────────────────────

function UploadPanel({ agent }) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [mapping, setMapping] = useState({});
  const [needsMapping, setNeedsMapping] = useState(false);
  const [parsedCols, setParsedCols] = useState([]);
  const [qaReport, setQaReport] = useState(null);
  // Optional expected control totals for input reconciliation (IPE tie-out).
  const [expectedCount, setExpectedCount] = useState('');
  const [expectedExposureBn, setExpectedExposureBn] = useState('');

  const uploaded = state.uploadedData[agent.id];
  const loading = state.agentLoading[agent.id];
  const error = state.agentErrors[agent.id];
  const result = state.agentResults[agent.id];
  const hasKey = state.apiKey && state.apiKeyStatus === 'valid';
  // Engine-supported agents detect locally (deterministic, full population, no key).
  const isEngine = DETECTOR_AGENTS.includes(agent.id);

  function processFile(file) {
    setParseError(null); setNeedsMapping(false); setMapping({}); setQaReport(null);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        if (!res.data.length) { setParseError('File appears empty — check it has a header row and data rows.'); return; }
        const fileCols = Object.keys(res.data[0]);
        setParsedCols(fileCols);
        const normalise = s => s.toLowerCase().replace(/[\s\-]/g,'_');
        const missing = agent.required.filter(r => !fileCols.some(c => normalise(c) === normalise(r)));
        // Full-population ceiling. The deterministic engine processes rows
        // in-memory (O(n)), so there is no prompt-size cap; 100k is a safe
        // in-browser bound for a single extract. Only metadata is persisted
        // (see slimUploaded), so a large file does not bloat localStorage.
        const ROW_CEILING = 100000;
        const rowsForAgent = res.data.slice(0, ROW_CEILING);

        // Wave 4: run the data-quality report on every upload so the user
        // sees defects before running the agent.
        const report = buildDataQualityReport({
          rows: rowsForAgent,
          required: agent.required,
          agentId: agent.id,
        });
        setQaReport(report);
        appendUploadLogEntry({ agentId: agent.id, filename: file.name, report });

        if (missing.length > 0) {
          // Try auto-mapping
          const autoMap = {};
          agent.required.forEach(req => {
            const match = fileCols.find(c => normalise(c) === normalise(req));
            autoMap[req] = match || '';
          });
          setMapping(autoMap);
          setNeedsMapping(true);
          setParsedCols(fileCols);
          dispatch({ type: 'UPLOAD_DATA', agentId: agent.id, rows: rowsForAgent, filename: file.name });
        } else {
          dispatch({ type: 'UPLOAD_DATA', agentId: agent.id, rows: rowsForAgent, filename: file.name });
          dispatch({ type: 'SET_MODE', agentId: agent.id, payload: 'live' });
        }
      },
      error: () => setParseError('CSV parse failed. Ensure the file uses comma separators and UTF-8 encoding.'),
    });
  }

  async function runAgent() {
    let rows = uploaded?.rows;
    if (needsMapping) {
      rows = rows.map(row => {
        const out = {};
        Object.entries(mapping).forEach(([req, col]) => { if (col) out[req] = row[col]; });
        Object.keys(row).forEach(k => { if (!Object.values(mapping).includes(k)) out[k] = row[k]; });
        return out;
      });
    }
    if (!rows?.length) return;

    // Client-side handler path (no LLM) — used by Compliance History Seed
    if (agent.clientHandler === 'seedLedger') {
      try {
        const entries = rows.map(r => ({
          q: String(r.quarter),
          cbsl: Number(r.cbsl), basel: Number(r.basel), fatf: Number(r.fatf),
          aml: Number(r.aml), sod: Number(r.sod), composite: Number(r.composite),
        }));
        replaceLedger(entries);
        dispatch({ type: 'AGENT_SUCCESS', agentId: agent.id, payload: {
          key_findings: [],
          seed_summary: { rows_imported: entries.length, quarters: entries.map(e => e.q).join(', ') },
        } });
        dispatch({ type: 'SET_MODE', agentId: agent.id, payload: 'live' });
      } catch (err) {
        dispatch({ type: 'AGENT_ERROR', agentId: agent.id, payload: err.message });
      }
      return;
    }

    // Deterministic engine path — runs locally over the full population, no LLM,
    // no API key. The grounded, reproducible result is the system of record.
    if (DETECTOR_AGENTS.includes(agent.id)) {
      dispatch({ type: 'AGENT_LOADING', agentId: agent.id });
      setNeedsMapping(false);
      const expectedControls = (expectedCount || expectedExposureBn) ? {
        recordCount: expectedCount ? parseInt(expectedCount, 10) : null,
        totalExposureLkr: expectedExposureBn ? Math.round(parseFloat(expectedExposureBn) * 1e9) : null,
      } : null;
      try {
        runDetectionLocally(agent.id, rows, state, dispatch, expectedControls);
      } catch (err) {
        dispatch({ type: 'AGENT_ERROR', agentId: agent.id, payload: err.message });
      }
      return;
    }
    // Agents still pending a deterministic detector (cross-row aggregation) keep
    // the LLM path for now; their output is labelled AI-generated, not grounded.
    if (!hasKey) { dispatch({ type: 'TOGGLE_SETTINGS' }); return; }
    dispatch({ type: 'AGENT_LOADING', agentId: agent.id });
    setNeedsMapping(false);
    try {
      const res = await axios.post(`/api/agent/${agent.id}`, { data: rows, thresholds: state.thresholds?.[agent.id] || {}, maxTokens: state.agentConfig?.[agent.id]?.maxTokens ?? undefined }, { headers: { 'x-api-key': state.apiKey }, timeout: 240000 });
      dispatch({ type: 'AGENT_SUCCESS', agentId: agent.id, payload: res.data.result });
      dispatch({ type: 'SET_MODE', agentId: agent.id, payload: 'live' });
    } catch (err) {
      dispatch({ type: 'AGENT_ERROR', agentId: agent.id, payload: err.response?.data?.error || err.message });
    }
  }

  function clear() {
    dispatch({ type: 'CLEAR_UPLOAD', agentId: agent.id });
    setParseError(null); setNeedsMapping(false); setMapping({});
  }

  // ── State: analysis complete ──
  if (result) {
    const findings = result.key_findings?.length || 0;
    const critical = result.key_findings?.filter(f => (f.severity || '').toLowerCase() === 'critical').length || 0;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ padding:'16px 20px', background:'var(--color-green-light)', border:'1px solid rgba(59,109,17,0.25)', borderRadius:12 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
            <CheckCircle size={20} style={{ color:'var(--color-green)', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--color-green)' }}>Analysis complete</div>
              <div style={{ fontSize:12, color:'var(--color-text-2)' }}>{uploaded?.rows?.length?.toLocaleString()} records · {findings} finding{findings!==1?'s':''}{critical>0?` · ${critical} critical`:''}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => navigate('/business-view')} className="btn btn-primary" style={{ background:agent.color, fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
              <ChevronRight size={15}/>View in Command Centre
            </button>
            <button onClick={clear} className="btn btn-secondary btn-sm" style={{ display:'flex', alignItems:'center', gap:5 }}>
              <RefreshCw size={12}/>Re-sync / load extract
            </button>
          </div>
        </div>
        {result.key_findings?.slice(0,2).map((f, i) => (
          <div key={i} style={{ padding:'12px 14px', background: (f.severity||'').toLowerCase()==='critical'?'var(--color-red-light)':'#E8FDF4', borderRadius:8, fontSize:12, color: (f.severity||'').toLowerCase()==='critical'?'var(--color-red)':'#3A5A3A', lineHeight:1.5 }}>
            <strong>{(f.severity||'medium').toUpperCase()}:</strong> {(f.finding || f.explanation || '').substring(0,180)}...
          </div>
        ))}
      </div>
    );
  }

  // ── State: loading ──
  if (loading) {
    return (
      <div style={{ padding:'32px 24px', textAlign:'center', border:'1px solid var(--color-border)', borderRadius:12, background:'var(--color-surface-2)' }}>
        <div className="spinner" style={{ width:28, height:28, margin:'0 auto 16px' }} />
        <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>{isEngine ? 'Running deterministic detection…' : 'Agent running analysis…'}</div>
        <div style={{ fontSize:12, color:'var(--color-text-2)', lineHeight:1.6, maxWidth:300, margin:'0 auto' }}>
          {isEngine
            ? `The ${agent.name} rule engine is scoring every record against your configured thresholds. Findings are grounded to source rows and reproducible.`
            : `Claude is reviewing your data against the ${agent.name} detection framework. This typically takes 30–90 seconds.`}
        </div>
      </div>
    );
  }

  // ── State: uploaded, awaiting run ──
  if (uploaded) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {/* File pill */}
        <div style={{ display:'flex', gap:10, alignItems:'center', padding:'12px 14px', background:`${agent.color}0C`, border:`1px solid ${agent.color}33`, borderRadius:10 }}>
          <CheckCircle size={16} style={{ color:agent.color, flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{uploaded.filename}</div>
            <div style={{ fontSize:11, color:'var(--color-text-2)' }}>{uploaded.rows.length.toLocaleString()} records loaded · {uploaded.rows.length >= 100000 ? 'capped at 100,000 records' : 'full population'}</div>
          </div>
          <button onClick={clear} style={{ color:'var(--color-text-3)', cursor:'pointer', padding:4, flexShrink:0 }}><Trash2 size={14}/></button>
        </div>

        {/* Column mapping if needed */}
        {needsMapping && (
          <div style={{ padding:'14px 16px', background:'#E8FDF4', border:'1px solid rgba(133,79,11,0.2)', borderRadius:10 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#3A5A3A', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <AlertCircle size={14}/>Column names don't match exactly — please map them below
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {agent.required.map(req => (
                <div key={req} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                  <code style={{ minWidth:160, padding:'3px 8px', background:`${agent.color}12`, borderRadius:4, color:agent.color, fontSize:11 }}>{req} *</code>
                  <ArrowRight size={12} style={{ color:'var(--color-text-3)', flexShrink:0 }} />
                  <select value={mapping[req]||''} onChange={e => setMapping(m=>({...m,[req]:e.target.value}))} style={{ flex:1 }}>
                    <option value="">— not mapped —</option>
                    {parsedCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded data preview */}
        {qaReport && <QaReportPanel report={qaReport} />}
        <DataTable rows={uploaded.rows} color={agent.color} maxRows={5} highlightRequired={agent.required} label="Offline extract — preview" />

        {/* Error */}
        {error && (
          <div style={{ padding:'10px 14px', background:'var(--color-red-light)', border:'1px solid rgba(163,45,45,0.2)', borderRadius:8, fontSize:12, color:'var(--color-red)', display:'flex', gap:8 }}>
            <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }}/>{error}
          </div>
        )}

        {/* Input reconciliation (IPE) — optional expected control totals */}
        {isEngine && (
          <div style={{ padding:'12px 14px', background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius:10 }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:'var(--color-text)', marginBottom:2 }}>Input reconciliation (optional)</div>
            <div style={{ fontSize:10.5, color:'var(--color-text-3)', marginBottom:8, lineHeight:1.45 }}>
              Enter the expected population from an independent source (core banking / GL) to tie the extract out. Leave blank to just record what was analysed.
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <label style={{ fontSize:11, color:'var(--color-text-2)', display:'flex', flexDirection:'column', gap:3 }}>
                Expected record count
                <input value={expectedCount} onChange={e=>setExpectedCount(e.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" placeholder={String(uploaded.rows.length)} style={{ width:140, padding:'6px 8px', fontSize:12, border:'1px solid var(--color-border)', borderRadius:6, background:'var(--color-surface)' }} />
              </label>
              <label style={{ fontSize:11, color:'var(--color-text-2)', display:'flex', flexDirection:'column', gap:3 }}>
                Expected total (LKR Bn)
                <input value={expectedExposureBn} onChange={e=>setExpectedExposureBn(e.target.value.replace(/[^0-9.]/g,''))} inputMode="decimal" placeholder="optional" style={{ width:140, padding:'6px 8px', fontSize:12, border:'1px solid var(--color-border)', borderRadius:6, background:'var(--color-surface)' }} />
              </label>
            </div>
          </div>
        )}

        {/* API key warning — only for AI-path agents (engine needs no key) */}
        {!isEngine && !hasKey && (
          <div style={{ padding:'10px 14px', background:'#E8FDF4', border:'1px solid rgba(133,79,11,0.2)', borderRadius:8, fontSize:12, color:'#3A5A3A', display:'flex', gap:8, alignItems:'center' }}>
            <AlertCircle size={13} style={{ flexShrink:0 }}/>
            API key required to run.&nbsp;
            <button onClick={() => dispatch({ type:'TOGGLE_SETTINGS' })} style={{ fontWeight:700, color:'#3A5A3A', cursor:'pointer', textDecoration:'underline', background:'none', border:'none', padding:0 }}>Configure →</button>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={runAgent}
          disabled={(!isEngine && !hasKey) || (needsMapping && agent.required.some(r => !mapping[r]))}
          style={{ width:'100%', padding:'14px', fontSize:14, fontWeight:700, color:'white', background: ((!isEngine && !hasKey) || (needsMapping && agent.required.some(r=>!mapping[r]))) ? 'var(--color-text-3)' : agent.color, border:'none', borderRadius:10, cursor: ((!isEngine && !hasKey) || (needsMapping && agent.required.some(r=>!mapping[r]))) ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.15s', boxShadow: (isEngine || hasKey) ? `0 4px 14px ${agent.color}44` : 'none' }}
        >
          <Zap size={16}/> {isEngine ? `Detect with the ${agent.name} rule engine` : `Run ${agent.name} agent on this extract`}
        </button>
        <div style={{ fontSize:11, color:'var(--color-text-3)', textAlign:'center' }}>
          {isEngine
            ? 'Detection runs locally in your browser over the full population — deterministic, grounded to source rows, no data leaves the device.'
            : 'Your data is sent directly to the Anthropic API and is never stored on any server'}
        </div>
      </div>
    );
  }

  // ── State: empty — show drop zone ──
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {parseError && (
        <div style={{ padding:'10px 14px', background:'var(--color-red-light)', border:'1px solid rgba(163,45,45,0.2)', borderRadius:8, fontSize:12, color:'var(--color-red)', display:'flex', gap:8, alignItems:'flex-start' }}>
          <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }}/>{parseError}
        </div>
      )}
      <div
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        style={{ border:`2px dashed ${dragOver ? agent.color : 'var(--color-border-strong)'}`, borderRadius:12, padding:'36px 24px', textAlign:'center', cursor:'pointer', transition:'all 0.15s', background: dragOver ? `${agent.color}06` : 'transparent' }}
      >
        <div style={{ width:52, height:52, borderRadius:14, background:`${agent.color}14`, border:`1px solid ${agent.color}33`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:24, color:agent.color }}>
          <Upload size={24}/>
        </div>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Drop an offline CSV extract here</div>
        <div style={{ fontSize:12, color:'var(--color-text-2)', marginBottom:4 }}>or click to browse files</div>
        <div style={{ fontSize:11, color:'var(--color-text-3)' }}>Offline extract · CSV · headers required · up to 2,000 rows</div>
        <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); }} />
      </div>

      {!hasKey && (
        <div style={{ padding:'10px 14px', background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius:8, fontSize:12, color:'var(--color-text-2)', display:'flex', gap:8, alignItems:'center' }}>
          <AlertCircle size={13} style={{ flexShrink:0 }}/>
          You'll need an Anthropic API key to run analysis after upload.&nbsp;
          <button onClick={() => dispatch({ type:'TOGGLE_SETTINGS' })} style={{ fontWeight:600, color:'var(--color-blue)', cursor:'pointer', textDecoration:'underline', background:'none', border:'none', padding:0 }}>Configure key →</button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function BusinessDataHub() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [activeAgent, setActiveAgent] = useState('credit');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);

  const agent = AGENTS.find(a => a.id === activeAgent);
  const uploadedCount = AGENTS.filter(a => state.uploadedData[a.id]?.rows?.length > 0).length;
  const resultCount = AGENTS.filter(a => state.agentResults[a.id]).length;
  const pendingCount = AGENTS.filter(a => state.uploadedData[a.id]?.rows?.length > 0 && !state.agentResults[a.id]).length;

  async function runAllUploaded() {
    // Skip agents disabled in Agent Configuration — a bank only bulk-runs the
    // agents it has switched on. (A single agent can still be run explicitly.)
    const toRun = AGENTS.filter(a => state.agentConfig?.[a.id]?.enabled !== false && state.uploadedData[a.id]?.rows?.length > 0 && !state.agentResults[a.id]);
    if (!toRun.length) return;
    // Only the (non-engine) AI-path agents need an API key. If those are the
    // only ones queued and there's no key, prompt for it; otherwise run the
    // deterministic engine agents locally regardless.
    const needKey = toRun.some(a => !DETECTOR_AGENTS.includes(a.id));
    if (needKey && !state.apiKey && toRun.every(a => !DETECTOR_AGENTS.includes(a.id))) { dispatch({ type:'TOGGLE_SETTINGS' }); return; }
    setBulkRunning(true);
    for (const ag of toRun) {
      dispatch({ type:'BULK_PROGRESS', agentId:ag.id, status:'running' });
      dispatch({ type:'AGENT_LOADING', agentId:ag.id });
      try {
        if (DETECTOR_AGENTS.includes(ag.id)) {
          runDetectionLocally(ag.id, state.uploadedData[ag.id].rows, state, dispatch);
        } else if (state.apiKey) {
          const res = await axios.post(`/api/agent/${ag.id}`, { data: state.uploadedData[ag.id].rows, thresholds: state.thresholds?.[ag.id] || {}, maxTokens: state.agentConfig?.[ag.id]?.maxTokens ?? undefined }, { headers:{ 'x-api-key': state.apiKey }, timeout:240000 });
          dispatch({ type:'AGENT_SUCCESS', agentId:ag.id, payload:res.data.result });
        } else {
          dispatch({ type:'AGENT_ERROR', agentId:ag.id, payload:'API key required for this agent (deterministic detector pending).' });
          dispatch({ type:'BULK_PROGRESS', agentId:ag.id, status:'error' });
          continue;
        }
        dispatch({ type:'BULK_PROGRESS', agentId:ag.id, status:'done' });
      } catch(err) {
        dispatch({ type:'AGENT_ERROR', agentId:ag.id, payload:err.response?.data?.error||err.message });
        dispatch({ type:'BULK_PROGRESS', agentId:ag.id, status:'error' });
      }
    }
    setBulkRunning(false); setBulkDone(true);
  }

  // ONE-CLICK DEMO — load the 23 bundled Demo Bank sample datasets and run the real
  // engine over every agent, so every engine-derived view (Detection Assurance,
  // Engine Map findings, all statistical surfaces) populates with genuine output.
  function loadDemo(realistic = false) {
    setBulkRunning(true);
    try { runFullDemo(state, dispatch, (id, status) => dispatch({ type: 'BULK_PROGRESS', agentId: id, status }), { realistic }); }
    finally { setBulkRunning(false); setBulkDone(true); }
  }

  return (
    <div style={{ maxWidth:1400 }}>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:16, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ marginBottom:6 }}>Data Sources</h2>
          <p style={{ fontSize:13, color:'var(--color-text-2)', lineHeight:1.6, maxWidth:660 }}>
            Each agent is wired to a source system in the bank's data lake — core banking, the general ledger, IAM, regulatory reporting. Sync the live feed to run detection over the full population, or load a sample feed to explore. Every source also documents the schema it reads, with an offline extract upload as a fallback.
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          {/* The full-population sync is the RECOMMENDED path — its ~2–5% anomaly
              rates read like a real bank. The sample feed is tiny so every detector
              fires once, which makes some rates look exaggerated (high KYC-gap,
              0% Stage-3) — fine for a wiring check, misleading as headline numbers. */}
          <button onClick={() => loadDemo(true)} disabled={bulkRunning} className="btn" style={{ fontSize:13, display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'#0F6E56', color:'#fff', border:'1px solid #0F6E56', fontWeight:700, cursor: bulkRunning ? 'default' : 'pointer' }} title="Recommended — syncs the full population from every source system (~9,000 records, ~2–5% anomalies); ratios and rates read realistically and the engine discriminates at scale.">
            {bulkRunning ? <><span className="spinner" style={{ width:14, height:14 }}/>Syncing…</> : <><Sparkles size={16}/>Sync data lake · full population</>}
          </button>
          <button onClick={() => loadDemo(false)} disabled={bulkRunning} className="btn" style={{ fontSize:13, display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'var(--color-surface)', color:'#185FA5', border:'1px solid #185FA5', fontWeight:700, cursor: bulkRunning ? 'default' : 'pointer' }} title="A small sample feed so every detector fires once. Rates are exaggerated (e.g. high KYC-gap, 0% Stage-3) — use the full-population sync for believable headline figures.">
            {bulkRunning ? <><span className="spinner" style={{ width:14, height:14 }}/>Syncing…</> : <><Sparkles size={16}/>Load sample feed</>}
          </button>
          {pendingCount > 0 && (
            <button onClick={runAllUploaded} disabled={bulkRunning} className="btn btn-primary" style={{ fontSize:13, display:'flex', alignItems:'center', gap:8, padding:'10px 20px', boxShadow:'0 4px 14px rgba(26,25,23,0.15)' }}>
              {bulkRunning ? <><span className="spinner" style={{ width:14, height:14 }}/>Running {pendingCount} extract{pendingCount>1?'s':''}…</> : <><Zap size={16}/>Run {pendingCount} offline extract{pendingCount>1?'s':''}</>}
            </button>
          )}
        </div>
      </div>

      {/* ── Agent status strip ── */}
      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:8, fontSize:10, fontWeight:800, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--color-text-3)' }}>
        Detection agents
        <InfoHint align="left" title="Agent status strip" text="One card per detection agent — click a card to open its source schema and upload panel. The status line reads straight from the run state: 'Not synced' (no feed loaded), a record count once a feed is loaded, 'Syncing…' while detection runs, or '✓ Results ready'. A green dot means results exist; a coloured dot means a feed is loaded or running." size={11} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(9, 1fr)', gap:8, marginBottom:20 }}>
        {AGENTS.map(ag => {
          const up = state.uploadedData[ag.id];
          const res = state.agentResults[ag.id];
          const loading = state.agentLoading[ag.id];
          const prog = state.bulkProgress[ag.id];
          const isActive = activeAgent === ag.id;
          const dotColor = res ? '#3B6D11' : (up || loading || prog==='running') ? ag.color : 'transparent';
          return (
            <button key={ag.id} onClick={() => setActiveAgent(ag.id)} style={{ padding:'12px 10px', background: isActive ? `${ag.color}10` : 'var(--color-surface)', border:`1px solid ${isActive ? ag.color+'55' : 'var(--color-border)'}`, borderRadius:10, cursor:'pointer', transition:'all 0.15s', borderTop:`3px solid ${isActive ? ag.color : 'transparent'}`, textAlign:'left' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <span style={{ fontSize:16 }}>{ag.icon}</span>
                {(up || res || loading) && <span style={{ width:7, height:7, borderRadius:'50%', background:dotColor, display:'block', marginTop:2, ...(loading||prog==='running' ? { animation:'pulse 1.5s ease-in-out infinite' } : {}) }} />}
              </div>
              <div style={{ fontSize:11, fontWeight:600, color: isActive ? ag.color : 'var(--color-text)', lineHeight:1.3 }}>{ag.name.split(' ').slice(0,2).join(' ')}</div>
              <div style={{ fontSize:10, color:'var(--color-text-3)', marginTop:3 }}>
                {res ? '✓ Results ready' : loading||prog==='running' ? 'Syncing…' : up ? `${up.rows.length.toLocaleString()} records` : 'Not synced'}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Bulk done banner ── */}
      {bulkDone && resultCount > 0 && (
        <div className="animate-fade-in" style={{ marginBottom:20, padding:'16px 20px', background:'linear-gradient(135deg, #F0FDF4, #ECFDF5)', border:'1px solid rgba(59,109,17,0.3)', borderRadius:10, display:'flex', gap:16, alignItems:'center' }}>
          <CheckCircle size={20} style={{ color:'#16A34A', flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#15803D', marginBottom:4, display:'flex', alignItems:'center' }}>{resultCount} of {AGENTS.length} agents completed analysis<InfoHint align="left" title="Run summary" text="Agents that returned a result in this run, out of all configured agents. 'Total findings' sums every agent's flagged items; 'critical' counts those the deterministic severity rules classified Critical. These are tallies of the engine output, not estimates." size={11} /></div>
            <div style={{ display:'flex', gap:16, fontSize:12, color:'#166534' }}>
              <span>📋 {AGENTS.reduce((s,a) => s + (state.agentResults[a.id]?.key_findings?.length || 0), 0)} total findings</span>
              {AGENTS.reduce((s,a) => s + (state.agentResults[a.id]?.key_findings?.filter(f=>(f.severity||'').toLowerCase()==='critical')?.length || 0), 0) > 0 && (
                <span style={{ fontWeight:700, color:'#C41E3A' }}>🔴 {AGENTS.reduce((s,a) => s + (state.agentResults[a.id]?.key_findings?.filter(f=>(f.severity||'').toLowerCase()==='critical')?.length || 0), 0)} critical — immediate action required</span>
              )}
            </div>
          </div>
          <button onClick={() => navigate('/business-view')} className="btn btn-sm" style={{ background:'var(--color-green)', color:'white', border:'none', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            Command Centre <ChevronRight size={12}/>
          </button>
        </div>
      )}

      {/* ── Main content: two-column ── */}
      {agent && (
        <div className="animate-fade-in" key={agent.id} style={{ display:'grid', gridTemplateColumns:'1fr 440px', gap:20, alignItems:'start' }}>

          {/* LEFT — Schema + Sample reference */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Agent identity */}
            <div style={{ padding:'20px 24px', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:14, borderTop:`3px solid ${agent.color}` }}>
              <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:14 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:agent.bg, border:`1px solid ${agent.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:agent.color, flexShrink:0 }}>{agent.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:700, marginBottom:3 }}>{agent.name}</div>
                  <div style={{ fontSize:12, color:'var(--color-text-2)', marginBottom:6 }}>{agent.tagline}</div>
                  <div style={{ fontSize:12, color:'var(--color-text-2)', lineHeight:1.6 }}>{agent.what}</div>
                </div>
              </div>
              {/* Source-system lineage — gives the "wired to the data lake" impression.
                  "Connected" once a feed has been synced/loaded for this agent; otherwise
                  "Not synced". The named source comes from SOURCE_SYSTEM (liveRun). */}
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', padding:'10px 12px', marginBottom:14, background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius:9 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background: state.uploadedData[agent.id] ? '#3B6D11' : 'var(--color-text-3)', flexShrink:0 }} />
                <span style={{ fontSize:11.5, color:'var(--color-text-2)' }}>
                  <span style={{ fontWeight:700, color:'var(--color-text)' }}>Source</span> · {SOURCE_SYSTEM[agent.id] || 'Bank data lake'}
                </span>
                <span style={{ marginLeft:'auto', fontSize:10.5, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase', color: state.uploadedData[agent.id] ? '#3B6D11' : 'var(--color-text-3)' }}>
                  {state.uploadedData[agent.id] ? `Connected · ${state.uploadedData[agent.id].rows.length.toLocaleString()} records` : 'Not synced'}
                </span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => downloadCsv(agent.sampleRows, `sentinel-schema-${agent.id}.csv`)} className="btn btn-secondary btn-sm" style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <Download size={13}/>Download source schema
                </button>
                <button onClick={() => loadDemo(true)} disabled={bulkRunning} className="btn btn-sm" style={{ background:agent.color, color:'white', border:'none', display:'flex', alignItems:'center', gap:5, cursor: bulkRunning ? 'default' : 'pointer' }}>
                  {bulkRunning ? 'Syncing…' : <>Sync this source <ChevronRight size={12}/></>}
                </button>
              </div>
            </div>

            {/* Schema */}
            <div style={{ padding:'20px 24px', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--color-text-2)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                Source Schema
                <InfoTooltip text="The columns Sentinel reads from this source feed. Required columns must be present; optional columns improve analysis accuracy but won't cause errors if absent. Column names are case-insensitive and underscores/spaces are interchangeable — so an offline extract maps cleanly too." width={300} position="right" />
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:agent.color, marginBottom:8 }}>Required — read from the source feed</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {agent.required.map(col => (
                    <span key={col} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:500, padding:'5px 10px', background:agent.bg, color:agent.color, border:`1px solid ${agent.color}33`, borderRadius:6 }}>
                      {col}
                      <InfoTooltip text={agent.columnDefs[col]||col} position="top" width={220} />
                    </span>
                  ))}
                </div>
              </div>
              {agent.optional.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--color-text-3)', marginBottom:8 }}>Optional — improves accuracy</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {agent.optional.map(col => (
                      <span key={col} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, padding:'4px 10px', background:'var(--color-surface-2)', color:'var(--color-text-2)', border:'1px solid var(--color-border)', borderRadius:6 }}>
                        {col}
                        {agent.columnDefs[col] && <InfoTooltip text={agent.columnDefs[col]} position="top" width={220} />}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sample data */}
            <div style={{ padding:'20px 24px', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--color-text-2)', textTransform:'uppercase', letterSpacing:'0.07em', display:'flex', alignItems:'center', gap:7 }}>
                  Source Feed — Sample Records
                  <InfoTooltip text="A sample of records as they arrive from this source system — the column names and data types Sentinel reads. Download the source schema to get a pre-formatted starter file for an offline extract." position="right" />
                </div>
                <span style={{ fontSize:11, color:'var(--color-text-3)' }}>Demo Bank FY 2025 · grounded reference feed</span>
              </div>
              <DataTable rows={agent.sampleRows} color={agent.color} maxRows={7} highlightRequired={agent.required} />
            </div>
          </div>

          {/* RIGHT — Upload + run */}
          <div style={{ position:'sticky', top:20, display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ padding:'22px 24px', border:`2px solid ${agent.color}33`, borderRadius:14, backgroundImage:`linear-gradient(135deg, ${agent.bg}40 0%, var(--color-surface) 60%)` }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>{agent.icon}</span> Offline extract
              </div>
              <div style={{ fontSize:12, color:'var(--color-text-2)', lineHeight:1.6, marginBottom:18 }}>
                Sentinel normally reads this source straight from the data lake. When a direct connection isn't available, upload an offline CSV extract matching the source schema on the left — you'll see a preview, then run detection with one click. Findings appear directly in the agent module.
              </div>
              <UploadPanel key={agent.id} agent={agent} />
            </div>

            {/* Workflow steps (only when no data uploaded) */}
            {!state.uploadedData[agent.id] && !state.agentResults[agent.id] && (
              <div style={{ padding:'16px 20px', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--color-text-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>How it works</div>
                {[
                  { n:'1', title:'Sync the source', body:'Pull this source straight from the data lake — or load the sample feed to explore.' },
                  { n:'2', title:'No live feed? Get the schema', body:'Download the source schema and fill it with an offline extract. Keep the column names.' },
                  { n:'3', title:'Upload & preview', body:'Drop the extract above. You\'ll see a preview of the records before running.' },
                  { n:'4', title:'Run detection', body:'The engine analyses the feed with the same deterministic framework as a live sync. Findings appear instantly.' },
                ].map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom: i<3 ? '1px solid var(--color-border)' : 'none' }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:`${agent.color}15`, border:`1px solid ${agent.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:agent.color, flexShrink:0 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>{s.title}</div>
                      <div style={{ fontSize:11, color:'var(--color-text-2)', lineHeight:1.5 }}>{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QA REPORT PANEL (Wave 4) ────────────────────────────────────────────────
// Renders the data-quality report produced at upload time: accepted vs
// rejected row counts, per-column completeness, and first 50 warnings.
// Appears above the data preview so a user sees defects before running
// the agent against dirty data.
function QaReportPanel({ report }) {
  const problems = (report.warnings || []).filter(w => w.level !== 'info');
  const statusColor = report.ok ? '#0BBF7A' : problems.length > 0 ? '#B45309' : 'var(--color-text-3)';
  const completenessEntries = Object.entries(report.completeness || {});
  const lowCompleteness = completenessEntries.filter(([, pct]) => pct < 90).sort((a, b) => a[1] - b[1]);

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${statusColor}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
          Data quality report
          <InfoHint title="Data quality report" align="left" text="A schema validation run on every upload, before detection. It checks each row for the required columns, coerces and range-checks numeric fields, and validates enumerated values against the source schema. These are fixed rules — purely a sanity check on the feed, so findings are never blamed on dirty input." />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 6, background: statusColor + '18', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {report.ok ? 'Clean' : `${problems.length} issue${problems.length === 1 ? '' : 's'}`}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-3)' }}>{new Date(report.generated_at).toLocaleString()}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: problems.length > 0 || lowCompleteness.length > 0 ? 10 : 0 }}>
        <QaStat label="Total rows" value={report.total_rows.toLocaleString()} help="Data rows parsed from the uploaded CSV (header row excluded). Files are capped at 100,000 rows; anything beyond that is not read." />
        <QaStat label="Accepted" value={report.accepted_rows.toLocaleString()} color="#0BBF7A" help="Rows where every required column for this agent has a non-empty value. Only accepted rows are scored by the detection engine." />
        <QaStat label="Rejected (missing required)" value={report.rejected_rows.toLocaleString()} color={report.rejected_rows > 0 ? '#C41E3A' : 'var(--color-text-3)'} help="Rows dropped because at least one required column was blank. Total = Accepted + Rejected — fix the source extract if this is non-zero so the population is complete." />
      </div>
      {lowCompleteness.length > 0 && (
        <div style={{ marginBottom: problems.length > 0 ? 10 : 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 4, display: 'flex', alignItems: 'center' }}>Columns below 90% completeness<InfoHint align="left" title="Column completeness" text="For each column, the percentage of rows with a non-empty value. Only columns under 90% are listed here, worst first. Sparse optional columns weaken signals that rely on them — but won't reject a row; only missing required columns do that." size={11} /></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {lowCompleteness.slice(0, 10).map(([col, pct]) => (
              <span key={col} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(180,83,9,0.1)', color: '#B45309', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
                {col} {pct}%
              </span>
            ))}
          </div>
        </div>
      )}
      {problems.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 4, display: 'flex', alignItems: 'center' }}>Warnings ({problems.length})<InfoHint align="left" title="Validation warnings" text="Row-level issues from the schema checks: a numeric field that won't parse, a value outside its expected range, or an enumerated field with an unexpected value. Warnings flag suspect cells but do not reject the row — review them before trusting findings on those records. Display is capped at the first 50." size={11} /></div>
          <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, fontFamily: 'var(--font-mono, monospace)' }}>
            {problems.slice(0, 20).map((w, i) => (
              <div key={i} style={{ padding: '2px 7px', background: 'rgba(180,83,9,0.05)', borderRadius: 4, color: 'var(--color-text-2)' }}>
                {w.text}
              </div>
            ))}
            {problems.length > 20 && <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2 }}>+{problems.length - 20} more — export CSV / JSON to see full list</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function QaStat({ label, value, color, help }) {
  return (
    <div style={{ padding: '6px 8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
        {label}{help && <InfoHint text={help} title={label} size={11} />}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: color || 'var(--color-text)', fontFamily: 'var(--font-display)', marginTop: 1 }}>{value}</div>
    </div>
  );
}
