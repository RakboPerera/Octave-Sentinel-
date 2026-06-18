import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { runFullDemo } from '../../utils/liveRun.js';
import { Sparkles } from 'lucide-react';

// One-click empty-state CTA: loads the bundled Demo Bank sample datasets and runs the
// real deterministic engine, so an engine-derived view that has no results yet
// populates with genuine output instead of a dead end.
export default function RunDemoCTA({ label = 'Load demo dataset & run the engine', sub = 'Runs the deterministic engine over the 23 bundled Demo Bank sample datasets — populates this view with real, reproducible findings.' }) {
  const { state, dispatch } = useApp();
  const [running, setRunning] = useState(false);
  function go() {
    setRunning(true);
    // Defer one tick so the button can paint its running state before the
    // synchronous engine sweep dispatches its batch of updates.
    setTimeout(() => {
      try { runFullDemo(state, dispatch); } finally { setRunning(false); }
    }, 30);
  }
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <button onClick={go} disabled={running} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#185FA5,#0F6E56)', color: '#fff', border: 'none', cursor: running ? 'default' : 'pointer', boxShadow: '0 3px 12px rgba(24,95,165,0.25)' }}>
        <Sparkles size={15} /> {running ? 'Running the engine…' : label}
      </button>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 8, maxWidth: 460, marginInline: 'auto', lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}
