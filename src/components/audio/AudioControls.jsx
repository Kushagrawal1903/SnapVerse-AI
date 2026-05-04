import React from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function AudioControls() {
  const selectedClipId = useUIStore(s => s.selectedClipId);
  const selectedTrackId = useUIStore(s => s.selectedTrackId);
  const tracks = useProjectStore(s => s.tracks);
  const updateClip = useProjectStore(s => s.updateClip);

  const clip = selectedTrackId && selectedClipId
    ? tracks.find(t => t.id === selectedTrackId)?.clips.find(c => c.id === selectedClipId && c.type === 'audio')
    : null;

  if (!clip) return null;

  const update = (key, value) => updateClip(selectedTrackId, selectedClipId, { [key]: value });

  return (
    <div className="animate-slide-up" style={{
      position: 'absolute', bottom: 232, right: 340, 
      background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-strong)', padding: 16, width: 220, zIndex: 30,
    }}>
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Audio</h4>

      {/* Volume */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Volume</label>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{clip.volume}%</span>
        </div>
        <input type="range" className="slider-input" min="0" max="200" value={clip.volume} onChange={(e) => update('volume', parseInt(e.target.value))} />
      </div>

      {/* Fade In */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Fade In</label>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{clip.fadeIn}s</span>
        </div>
        <input type="range" className="slider-input" min="0" max="3" step="0.1" value={clip.fadeIn} onChange={(e) => update('fadeIn', parseFloat(e.target.value))} />
      </div>

      {/* Fade Out */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Fade Out</label>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{clip.fadeOut}s</span>
        </div>
        <input type="range" className="slider-input" min="0" max="3" step="0.1" value={clip.fadeOut} onChange={(e) => update('fadeOut', parseFloat(e.target.value))} />
      </div>

      {/* Speed */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Speed</label>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{clip.speed}x</span>
        </div>
        <input type="range" className="slider-input" min="0.5" max="2" step="0.1" value={clip.speed || 1} onChange={(e) => update('speed', parseFloat(e.target.value))} />
      </div>
    </div>
  );
}
