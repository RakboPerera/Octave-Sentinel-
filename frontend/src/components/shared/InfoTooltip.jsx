import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export default function InfoTooltip({ text, width = 280, position = 'top' }) {
  // `hover` = transient peek on mouse-over; `pinned` = click-to-open (stays open
  // until an outside click / Escape). The box is shown when either is true, so
  // the explanation is reachable by CLICK/TAP, not hover-only (works on touch).
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const visible = hover || pinned;
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  // While pinned, close on outside click or Escape.
  useEffect(() => {
    if (!pinned) return;
    function onDown(e) { if (iconRef.current && iconRef.current.contains(e.target)) return; setPinned(false); }
    function onKey(e) { if (e.key === 'Escape') setPinned(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [pinned]);

  function computeCoords() {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const GAP = 10;
    const TIP = 285; // max tooltip width

    let top, left;

    if (position === 'top') {
      top = rect.top + scrollY - GAP;
      left = rect.left + scrollX + rect.width / 2;
    } else if (position === 'bottom') {
      top = rect.bottom + scrollY + GAP;
      left = rect.left + scrollX + rect.width / 2;
    } else if (position === 'right') {
      top = rect.top + scrollY + rect.height / 2;
      left = rect.right + scrollX + GAP;
    } else if (position === 'left') {
      top = rect.top + scrollY + rect.height / 2;
      left = rect.left + scrollX - GAP;
    }

    setCoords({ top, left });
  }

  function show() {
    computeCoords();
    setHover(true);
  }

  function hide() {
    setHover(false);
  }

  function toggle(e) {
    e.stopPropagation();
    e.preventDefault();
    computeCoords();
    setPinned(p => !p);
  }

  // Tooltip box styles based on position
  function boxStyle() {
    const base = {
      position: 'absolute',
      zIndex: 99999,
      width: Math.min(width, 320),
      background: '#1a1917',
      color: '#e8e6e0',
      fontSize: 12,
      lineHeight: 1.65,
      padding: '10px 14px',
      borderRadius: 9,
      boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.12)',
      pointerEvents: pinned ? 'auto' : 'none',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
    };

    if (position === 'top') {
      return { ...base, top: coords.top, left: coords.left, transform: 'translate(-50%, -100%)' };
    } else if (position === 'bottom') {
      return { ...base, top: coords.top, left: coords.left, transform: 'translateX(-50%)' };
    } else if (position === 'right') {
      return { ...base, top: coords.top, left: coords.left, transform: 'translateY(-50%)' };
    } else if (position === 'left') {
      return { ...base, top: coords.top, left: coords.left, transform: 'translate(-100%, -50%)' };
    }
    return base;
  }

  // Arrow style
  function arrowStyle() {
    const common = { position: 'absolute', width: 0, height: 0 };
    if (position === 'top') {
      return { ...common, top: '100%', left: '50%', transform: 'translateX(-50%)', borderTop: '6px solid #1a1917', borderLeft: '6px solid transparent', borderRight: '6px solid transparent' };
    } else if (position === 'bottom') {
      return { ...common, bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderBottom: '6px solid #1a1917', borderLeft: '6px solid transparent', borderRight: '6px solid transparent' };
    } else if (position === 'right') {
      return { ...common, right: '100%', top: '50%', transform: 'translateY(-50%)', borderRight: '6px solid #1a1917', borderTop: '6px solid transparent', borderBottom: '6px solid transparent' };
    } else if (position === 'left') {
      return { ...common, left: '100%', top: '50%', transform: 'translateY(-50%)', borderLeft: '6px solid #1a1917', borderTop: '6px solid transparent', borderBottom: '6px solid transparent' };
    }
    return common;
  }

  if (!text) return null;

  return (
    <>
      <span
        ref={iconRef}
        role="button"
        tabIndex={0}
        aria-label="More information"
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={toggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggle(e); }}
      >
        <Info size={13} style={{ color: pinned ? 'var(--color-text)' : 'var(--color-text-3)' }} />
      </span>

      {visible && createPortal(
        <div style={boxStyle()}>
          {text}
          <div style={arrowStyle()} />
        </div>,
        document.body
      )}
    </>
  );
}
