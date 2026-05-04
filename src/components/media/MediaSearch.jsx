import React from 'react';

export default function MediaSearch({ value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="text"
        className="input-field"
        placeholder="Search media..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingLeft: 32, fontSize: 12, height: 34 }}
      />
    </div>
  );
}
