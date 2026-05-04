import React from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import { FILTERS } from '../../utils/constants';

export default function FiltersPanel() {
  const selectedClipId = useUIStore(s => s.selectedClipId);
  const selectedTrackId = useUIStore(s => s.selectedTrackId);
  const tracks = useProjectStore(s => s.tracks);
  const updateClip = useProjectStore(s => s.updateClip);

  const selectedClip = selectedTrackId && selectedClipId
    ? tracks.find(t => t.id === selectedTrackId)?.clips.find(c => c.id === selectedClipId)
    : null;

  if (!selectedClip) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
        Select a clip to apply filters
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '10px 14px',
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-strong)',
        overflowX: 'auto',
        maxWidth: 500,
      }}>
        {FILTERS.map(f => (
          <div key={f.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div
              className={`filter-swatch ${selectedClip.filter === f.id ? 'active' : ''}`}
              onClick={() => updateClip(selectedTrackId, selectedClipId, { filter: f.id })}
              style={{
                background: f.id === 'none' ? 'var(--color-bg-surface)' : undefined,
                filter: f.css !== 'none' ? f.css : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #ff6b6b, #48dbfb, #feca57, #ff9ff3)',
                borderRadius: 6,
              }} />
            </div>
            <span style={{ fontSize: 9, color: selectedClip.filter === f.id ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', fontWeight: selectedClip.filter === f.id ? 600 : 400 }}>
              {f.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
