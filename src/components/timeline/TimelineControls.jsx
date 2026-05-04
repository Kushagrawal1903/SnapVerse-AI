import React from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function TimelineControls() {
  const timelineZoom = useUIStore(s => s.timelineZoom);
  const setTimelineZoom = useUIStore(s => s.setTimelineZoom);
  const snapToGrid = useUIStore(s => s.snapToGrid);
  const toggleSnap = useUIStore(s => s.toggleSnap);
  const magneticTimeline = useUIStore(s => s.magneticTimeline);
  const toggleMagnetic = useUIStore(s => s.toggleMagnetic);
  const rippleEdit = useUIStore(s => s.rippleEdit);
  const toggleRipple = useUIStore(s => s.toggleRipple);
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const clearSelection = useUIStore(s => s.clearSelection);
  const splitClip = useProjectStore(s => s.splitClip);
  const deleteClips = useProjectStore(s => s.deleteClips);
  const closeAllGaps = useProjectStore(s => s.closeAllGaps);
  const currentTime = useProjectStore(s => s.currentTime);
  const tracks = useProjectStore(s => s.tracks);
  const undo = useProjectStore(s => s.undo);
  const redo = useProjectStore(s => s.redo);

  const hasSelection = selectedClipIds.size > 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-bg-primary)',
      flexShrink: 0,
    }}>
      {/* Undo / Redo */}
      <button className="btn-icon" onClick={undo} title="Undo (Ctrl+Z)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      </button>
      <button className="btn-icon" onClick={redo} title="Redo (Ctrl+Shift+Z)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

      {/* Split */}
      <button
        className="btn-icon"
        onClick={() => {
          if (hasSelection) {
            selectedClipIds.forEach(id => {
              const tId = tracks.find(t => t.clips.some(c => c.id === id))?.id;
              if (tId) splitClip(tId, id, currentTime);
            });
          }
        }}
        title="Split at Playhead (S)"
        disabled={!hasSelection}
        style={{ opacity: hasSelection ? 1 : 0.4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><polyline points="8 6 4 12 8 18"/><polyline points="16 6 20 12 16 18"/></svg>
      </button>

      {/* Delete */}
      <button
        className="btn-icon"
        onClick={() => { if (hasSelection) { deleteClips(selectedClipIds, rippleEdit); clearSelection(); } }}
        title="Delete (Del)"
        disabled={!hasSelection}
        style={{ opacity: hasSelection ? 1 : 0.4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

      {/* Snap toggle */}
      <button
        className={`pill-tab ${snapToGrid ? 'active' : ''}`}
        onClick={toggleSnap}
        style={{ fontSize: 11, padding: '3px 10px' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="3" y1="15" x2="21" y2="15"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
        Snap
      </button>

      {/* Magnetic toggle */}
      <button
        className={`pill-tab ${magneticTimeline ? 'active' : ''}`}
        onClick={toggleMagnetic}
        title="Magnetic Timeline"
        style={{ fontSize: 11, padding: '3px 10px' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
          <path d="M4 14v-4a8 8 0 0 1 16 0v4"/><path d="M2 14h4v6H2z"/><path d="M18 14h4v6h-4z"/>
        </svg>
        Magnet
      </button>

      {/* Ripple toggle */}
      <button
        className={`pill-tab ${rippleEdit ? 'active' : ''}`}
        onClick={toggleRipple}
        title="Ripple Edit Mode"
        style={{ fontSize: 11, padding: '3px 10px' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
          <polyline points="15 18 9 12 15 6"/><polyline points="21 18 15 12 21 6"/>
        </svg>
        Ripple
      </button>

      {/* Close Gaps */}
      <button
        className="btn-icon"
        onClick={closeAllGaps}
        title="Close All Gaps"
        style={{ marginLeft: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Zoom controls */}
      <button className="btn-icon" onClick={() => setTimelineZoom(timelineZoom - 3)} title="Zoom Out">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', minWidth: 32, textAlign: 'center' }}>
        {timelineZoom}px/s
      </span>
      <button className="btn-icon" onClick={() => setTimelineZoom(timelineZoom + 3)} title="Zoom In">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
    </div>
  );
}
