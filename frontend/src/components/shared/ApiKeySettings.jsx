import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import axios from 'axios';

export default function ApiKeySettings() {
  const { state, dispatch } = useApp();
  const [inputKey, setInputKey] = useState(state.apiKey || '');
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testMessage, setTestMessage] = useState('');

  async function handleTest() {
    if (!inputKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    setTestMessage('');
    try {
      // Dedicated auth-check endpoint: backend pings Anthropic with a 1-token
      // request so we can tell a valid key apart from a network / backend issue.
      await axios.post('/api/auth-check', {}, {
        headers: { 'x-api-key': inputKey.trim(), 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      setTestResult('valid');
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setTestResult('invalid');
        setTestMessage('Invalid API key — please check and retry.');
      } else {
        // Network error, CORS, 5xx, timeout — we genuinely don't know.
        setTestResult('inconclusive');
        setTestMessage(
          err.code === 'ECONNABORTED'
            ? 'Test timed out. Backend may be unreachable — try again.'
            : status
              ? `Test inconclusive (HTTP ${status}). Try again or check the backend.`
              : 'Test inconclusive — backend unreachable. Check your connection and retry.'
        );
      }
    }
    setTesting(false);
  }

  function handleSave() {
    const key = inputKey.trim();
    dispatch({ type: 'SET_API_KEY', payload: key });
    // Only mark 'valid' if we positively verified via handleTest. 'inconclusive'
    // and 'invalid' both block the valid badge; user may still save the key
    // (they may be offline and test again later) but the connected indicator
    // will not mislead them.
    const status = !key ? 'unconfigured' : testResult === 'valid' ? 'valid' : testResult === 'invalid' ? 'invalid' : 'unconfigured';
    dispatch({ type: 'SET_API_KEY_STATUS', payload: status });
    dispatch({ type: 'CLOSE_SETTINGS' });
  }

  function handleClear() {
    setInputKey('');
    setTestResult(null);
    dispatch({ type: 'SET_API_KEY', payload: '' });
    dispatch({ type: 'SET_API_KEY_STATUS', payload: 'unconfigured' });
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: 'CLOSE_SETTINGS' })}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Key size={18} />
            <h3>Anthropic API Key</h3>
          </div>
          <button onClick={() => dispatch({ type: 'CLOSE_SETTINGS' })} style={{ padding: 4, color: 'var(--color-text-2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 20, lineHeight: 1.6 }}>
          Enter your Anthropic API key to enable Live Analysis mode in any agent module. Your key is held in browser memory only and is never stored on any server.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}>API Key</label>
          <div style={{ position: 'relative' }}>
            <input
              type={show ? 'text' : 'password'}
              value={inputKey}
              onChange={e => { setInputKey(e.target.value); setTestResult(null); }}
              placeholder="sk-ant-api03-..."
              style={{ paddingRight: 40, fontFamily: 'monospace', fontSize: 13 }}
            />
            <button
              onClick={() => setShow(!show)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', cursor: 'pointer' }}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--color-surface-2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
          <strong>Model:</strong> claude-sonnet-4-20250514 &nbsp;·&nbsp; <strong>Security:</strong> Key is session-only, cleared on tab close &nbsp;·&nbsp; <strong>Calls go to:</strong> api.anthropic.com directly from this server
        </div>

        {testResult === 'valid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-green-light)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--color-green)' }}>
            <CheckCircle size={15} /> Key validated successfully
          </div>
        )}
        {testResult === 'invalid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-red-light)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--color-red)' }}>
            <AlertCircle size={15} /> {testMessage || 'Invalid API key — please check and retry'}
          </div>
        )}
        {testResult === 'inconclusive' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-amber-light, #FEF3C7)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--color-amber, #92400E)' }}>
            <AlertCircle size={15} /> {testMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {state.apiKey && (
            <button className="btn btn-secondary btn-sm" onClick={handleClear}>Clear key</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleTest} disabled={!inputKey.trim() || testing}>
            {testing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Test connection'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!inputKey.trim()}>
            Save & activate
          </button>
        </div>
      </div>
    </div>
  );
}
