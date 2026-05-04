import React from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function ClipPropertiesPanel() {
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const showClipProperties = useUIStore(s => s.showClipProperties);
  const tracks = useProjectStore(s => s.tracks);
  const updateClip = useProjectStore(s => s.updateClip);

  if (!showClipProperties || selectedClipIds.size === 0) return null;

  // Find all selected clips
  const selectedClips = [];
  tracks.forEach(t => t.clips.forEach(c => {
    if (selectedClipIds.has(c.id)) selectedClips.push({ ...c, trackId: t.id });
  }));

  if (selectedClips.length === 0) return null;

  const isMultiSelect = selectedClips.length > 1;

  // If multi-select, show count
  if (isMultiSelect) {
    return (
      <div style={{
        position: 'absolute', right: 20, top: 20, width: 280,
        background: 'rgba(20, 20, 20, 0.95)', border: '1px solid var(--color-border)',
        borderRadius: 12, padding: 16, zIndex: 100, backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          Clip Properties
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          {selectedClips.length} clips selected — common properties only
        </div>
      </div>
    );
  }

  // Single select
  const clip = selectedClips[0];

  return (
    <div style={{
      position: 'absolute', right: 20, top: 20, width: 280,
      background: 'rgba(20, 20, 20, 0.95)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: 16, zIndex: 100, backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Clip Properties
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          {clip.type}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Name</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-primary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clip.name}
          </span>
        </div>
        
        {clip.type === 'photo' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Duration (s)</span>
            <input 
              type="number" 
              step="0.1" 
              min="0.1"
              value={clip.duration}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0.1) {
                  updateClip(clip.trackId, clip.id, { duration: val });
                }
              }}
              style={{
                width: 80, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', borderRadius: 4, padding: '4px 8px', fontSize: 12,
                textAlign: 'right'
              }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Duration</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>
              {clip.duration.toFixed(2)}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
