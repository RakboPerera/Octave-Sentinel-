import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── INFO HINT — CLICK-TO-TOGGLE POPOVER ─────────────────────────────────────
// Click the `i` dot → a popover appears anchored to the dot.
// Click outside / press Escape / click the dot again → the popover closes.
// Portal-rendered, so it's never clipped by parent overflow/stacking contexts.
//
// Props:
//   text   — string or ReactNode for the popover body
//   title  — optional bold header
//   size   — dot diameter (default 14)
//   align  — 'left' | 'right' | 'center' — how to anchor the popover relative to the trigger

export default function InfoHint({ text, title, size = 14, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      const pop = document.getElementById('infohint-popover-root');
      if (pop && pop.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle(e) {
    e.stopPropagation();
    e.preventDefault();
    if (open) { setOpen(false); return; }
    // Compute position before opening
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 280;
    let left = r.left + r.width / 2 - width / 2;
    if (align === 'left') left = r.left;
    else if (align === 'right') left = r.right - width;
    left = Math.max(8, Math.min(window.innerWidth - width - 8, left));
    const top = r.bottom + 6;
    setPos({ top, left, width });
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label="More information"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: size / 2,
          fontSize: Math.max(8, size - 5),
          fontWeight: 800,
          background: open ? '#F5B841' : 'var(--color-surface-2)',
          color: open ? 'white' : 'var(--color-text-3)',
          border: `1px solid ${open ? '#F5B841' : 'var(--color-border)'}`,
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
          userSelect: 'none',
          lineHeight: 1,
          verticalAlign: 'middle',
          marginLeft: 4,
          padding: 0,
          transition: 'all 0.1s',
        }}
      >
        i
      </button>
      {open && pos && createPortal(
        <div
          id="infohint-popover-root"
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '10px 12px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
            zIndex: 10000,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: 'var(--color-text)',
            animation: 'fadeIn 0.12s ease',
          }}
        >
          {title && (
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#B45309', marginBottom: 6 }}>
              {title}
            </div>
          )}
          <div>{text}</div>
        </div>,
        document.body
      )}
    </>
  );
}
