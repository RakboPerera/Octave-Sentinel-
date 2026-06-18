import React, { useMemo, useState } from 'react';
import { ACRONYMS } from '../../data/acronyms.js';
import { BookOpen, Search } from 'lucide-react';

// ─── BUSINESS GLOSSARY ───────────────────────────────────────────────────────
// Compact, searchable glossary of banking terms used throughout Sentinel.
// Data shared with the Agent Platform glossary — same acronym definitions.

export default function BusinessGlossary() {
  const [search, setSearch] = useState('');
  const entries = useMemo(() => Object.entries(ACRONYMS).sort(([a], [b]) => a.localeCompare(b)), []);

  const filtered = entries.filter(([key, val]) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      key.toLowerCase().includes(q) ||
      (val.expansion || '').toLowerCase().includes(q) ||
      (val.definition || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Header count={entries.length} />

      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search glossary…"
          style={{ width: '100%', padding: '10px 12px 10px 34px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
        {filtered.map(([key, val]) => (
          <div key={key} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#185FA5', fontFamily: 'var(--font-display)' }}>{key}</div>
            {val.expansion && <div style={{ fontSize: 11, color: 'var(--color-text-2)', fontWeight: 700, marginTop: 2 }}>{val.expansion}</div>}
            {val.definition && <div style={{ fontSize: 12, color: 'var(--color-text)', marginTop: 7, lineHeight: 1.5 }}>{val.definition}</div>}
            {val.seeAlso && (
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>
                <span style={{ fontWeight: 700 }}>See also:</span> {Array.isArray(val.seeAlso) ? val.seeAlso.join(', ') : val.seeAlso}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>
            No entries match your search.
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ count }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
        <BookOpen size={20} style={{ color: '#185FA5' }} />
        Glossary
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '6px 0 0', maxWidth: 860, lineHeight: 1.55 }}>
        {count} banking and audit terms used across Sentinel. Searchable by acronym, expansion, or definition.
      </p>
    </div>
  );
}
