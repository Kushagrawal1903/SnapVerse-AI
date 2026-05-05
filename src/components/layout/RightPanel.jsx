import React from 'react';
import useUIStore from '../../stores/useUIStore';
import useProjectStore from '../../stores/useProjectStore';
import AIAdvisorPanel from '../ai/AIAdvisorPanel';
import ClipPropertiesPanel from '../timeline/ClipPropertiesPanel';

export default function RightPanel() {
  const rightPanelTab = useUIStore(s => s.rightPanelTab);
  const setRightPanelTab = useUIStore(s => s.setRightPanelTab);
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const tracks = useProjectStore(s => s.tracks);

  const hasSelection = selectedClipIds.size > 0;

  // Find selected clip name for context header
  let contextLabel = 'AI Director';
  if (hasSelection && rightPanelTab === 'properties') {
    const clipId = Array.from(selectedClipIds)[0];
    for (const t of tracks) {
      const c = t.clips.find(c => c.id === clipId);
      if (c) { contextLabel = c.name || 'Clip Properties'; break; }
    }
    if (selectedClipIds.size > 1) contextLabel = `${selectedClipIds.size} clips selected`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        background: 'var(--color-bg-primary)',
      }}>
        <button
          onClick={() => setRightPanelTab('properties')}
          style={{
            flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: rightPanelTab === 'properties' ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
            borderBottom: rightPanelTab === 'properties' ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Properties
          {hasSelection && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--color-accent-primary)',
              flexShrink: 0,
            }} />
          )}
        </button>
        <button
          onClick={() => setRightPanelTab('ai')}
          style={{
            flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: rightPanelTab === 'ai' ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
            borderBottom: rightPanelTab === 'ai' ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 12 }}>✦</span>
          AI Director
        </button>
      </div>

      {/* Context header */}
      <div style={{
        padding: '8px 14px', borderBottom: '1px solid var(--color-border)',
        fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)',
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--color-bg-surface)',
        flexShrink: 0,
      }}>
        <span style={{
          maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {rightPanelTab === 'properties' ? (hasSelection ? contextLabel : 'No clip selected') : 'AI Director'}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {rightPanelTab === 'properties' ? (
          hasSelection ? (
            <InlineClipProperties />
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12, lineHeight: 1.6 }}>
              <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>⚙️</div>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--color-text-secondary)' }}>No clip selected</div>
              Click a clip on the timeline to see its properties here
            </div>
          )
        ) : (
          <AIAdvisorPanel />
        )}
      </div>
    </div>
  );
}

// Inline clip properties (replaces the floating ClipPropertiesPanel)
function InlineClipProperties() {
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const tracks = useProjectStore(s => s.tracks);
  const updateClip = useProjectStore(s => s.updateClip);

  const selectedClips = [];
  tracks.forEach(t => t.clips.forEach(c => {
    if (selectedClipIds.has(c.id)) selectedClips.push({ ...c, trackId: t.id });
  }));

  if (selectedClips.length === 0) return null;

  if (selectedClips.length > 1) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          {selectedClips.length} clips selected
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Select a single clip to edit its properties
        </div>
      </div>
    );
  }

  const clip = selectedClips[0];

  return (
    <div style={{ padding: '12px 14px' }} className="animate-fade-in">
      {/* Type badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
          {clip.name}
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
          padding: '2px 8px', borderRadius: 4,
          background: clip.type === 'video' ? 'rgba(91,79,245,0.12)' : clip.type === 'audio' ? 'rgba(0,133,110,0.12)' : clip.type === 'text' ? 'rgba(239,159,39,0.12)' : 'rgba(255,100,100,0.12)',
          color: clip.type === 'video' ? '#5b4ff5' : clip.type === 'audio' ? '#00856e' : clip.type === 'text' ? '#ef9f27' : '#ff6464',
        }}>
          {clip.type}
        </span>
      </div>

      {/* Timing */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16,
        padding: 10, background: 'var(--color-bg-surface)', borderRadius: 8,
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Start</div>
          <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
            {clip.startTime.toFixed(2)}s
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</div>
          <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
            {clip.type === 'photo' ? (
              <input
                type="number" step="0.1" min="0.1" value={clip.duration}
                onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0.1) updateClip(clip.trackId, clip.id, { duration: v }); }}
                style={{ width: 60, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: 4, padding: '2px 4px', fontSize: 11, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
              />
            ) : `${clip.duration.toFixed(2)}s`}
          </div>
        </div>
      </div>

      {/* Speed (video/audio) */}
      {(clip.type === 'video' || clip.type === 'audio') && (
        <div style={{ marginBottom: 16, padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>Speed</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{(clip.speed || 1).toFixed(1)}×</span>
          </div>
          <input type="range" className="slider-input" min="0.1" max="4" step="0.1"
            value={clip.speed || 1}
            onChange={e => updateClip(clip.trackId, clip.id, { speed: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[0.25, 0.5, 1, 2, 4].map(s => (
              <button key={s} onClick={() => updateClip(clip.trackId, clip.id, { speed: s })}
                style={{
                  flex: 1, padding: '4px 0', fontSize: 10, borderRadius: 4, cursor: 'pointer',
                  background: (clip.speed || 1) === s ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                  color: (clip.speed || 1) === s ? '#fff' : 'var(--color-text-primary)',
                  border: 'none', fontWeight: 500,
                }}
              >{s}×</button>
            ))}
          </div>
        </div>
      )}

      {/* Volume (audio/video) */}
      {(clip.type === 'audio' || clip.type === 'video') && (
        <div style={{ marginBottom: 16, padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>Volume</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{clip.volume ?? 100}%</span>
          </div>
          <input type="range" className="slider-input" min="0" max="200" step="1"
            value={clip.volume ?? 100}
            onChange={e => updateClip(clip.trackId, clip.id, { volume: parseInt(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Filter (video/photo) */}
      {(clip.type === 'video' || clip.type === 'photo') && (
        <div style={{ marginBottom: 16, padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Filter</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 16, height: 16, borderRadius: 3,
              background: 'linear-gradient(135deg, #ff6b6b, #48dbfb, #feca57)',
              filter: clip.filter !== 'none' ? undefined : 'grayscale(1)',
              flexShrink: 0,
            }} />
            {clip.filter || 'none'}
          </div>
        </div>
      )}

      {/* Transform (video/photo) */}
      {(clip.type === 'video' || clip.type === 'photo') && (
        <div style={{ padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 10 }}>Transform</div>
          {['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'].map(prop => (
            <div key={prop} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                {prop.replace('X', ' X').replace('Y', ' Y')}
              </span>
              <input type="number"
                step={prop.includes('scale') ? '0.1' : prop === 'opacity' ? '1' : '10'}
                value={clip.transform?.[prop] ?? (prop.includes('scale') ? 1 : prop === 'opacity' ? 100 : 0)}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  updateClip(clip.trackId, clip.id, {
                    transform: { ...(clip.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 100 }), [prop]: val }
                  });
                }}
                style={{
                  width: 56, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)', borderRadius: 4, padding: '2px 6px', fontSize: 11, textAlign: 'right',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
