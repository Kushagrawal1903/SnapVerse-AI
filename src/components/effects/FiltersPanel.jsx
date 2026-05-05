import React from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import { FILTERS } from '../../utils/constants';

export default function FiltersPanel() {
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const setHoveredFilter = useUIStore(s => s.setHoveredFilter);
  const tracks = useProjectStore(s => s.tracks);
  const updateClip = useProjectStore(s => s.updateClip);
  const mediaItems = useProjectStore(s => s.mediaItems);

  const selectedClip = selectedClipIds.size > 0
    ? tracks.flatMap(t => t.clips.map(c => ({ ...c, trackId: t.id }))).find(c => selectedClipIds.has(c.id))
    : null;

  const media = selectedClip?.mediaId ? mediaItems.find(m => m.id === selectedClip.mediaId) : null;

  if (!selectedClip || (selectedClip.type !== 'video' && selectedClip.type !== 'photo')) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
        Select a video or photo clip to apply filters
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
        border: '1px solid var(--color-border)',
      }}>
        {FILTERS.map(f => {
          const isActive = selectedClip.filter === f.id;
          return (
            <div key={f.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div
                className={`filter-swatch ${isActive ? 'active' : ''}`}
                onClick={() => updateClip(selectedClip.trackId, selectedClip.id, { filter: f.id })}
                onMouseEnter={() => setHoveredFilter(f.id)}
                onMouseLeave={() => setHoveredFilter(null)}
                style={{
                  width: 50, height: 50, borderRadius: 8, cursor: 'pointer',
                  position: 'relative', overflow: 'hidden',
                  border: isActive ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                  boxShadow: isActive ? '0 0 0 2px rgba(91,79,245,0.2)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {media?.thumbnail ? (
                  <img
                    src={media.thumbnail}
                    alt=""
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      filter: f.css !== 'none' ? f.css : undefined,
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #ff6b6b, #48dbfb, #feca57)',
                    filter: f.css !== 'none' ? f.css : undefined,
                  }} />
                )}
                
                {/* Active checkmark */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 2, right: 2,
                    background: 'var(--color-accent-primary)', color: 'white',
                    width: 14, height: 14, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 9, color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', fontWeight: isActive ? 600 : 400 }}>
                {f.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
