import React from 'react';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Video' },
  { id: 'photo', label: 'Photo' },
  { id: 'audio', label: 'Audio' },
];

export default function MediaFilters({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          className={`pill-tab ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
