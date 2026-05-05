import React, { useState } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

const ZOOM_LABELS = [
  { max: 5, label: 'Overview' },
  { max: 15, label: 'Normal' },
  { max: 30, label: 'Detailed' },
  { max: 60, label: 'Frame-level' },
];

function getZoomLabel(zoom) {
  for (const z of ZOOM_LABELS) {
    if (zoom <= z.max) return z.label;
  }
  return 'Frame-level';
}

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
  const duration = useProjectStore(s => s.duration);
  const undo = useProjectStore(s => s.undo);
  const redo = useProjectStore(s => s.redo);
  const addTrack = useProjectStore(s => s.addTrack);
  const addClip = useProjectStore(s => s.addClip);

  const [showAddMenu, setShowAddMenu] = useState(false);

  const hasSelection = selectedClipIds.size > 0;

  const handleAddAdjustmentLayer = () => {
    const vTrack = tracks.find(t => t.accepts.includes('video') || t.accepts.includes('photo'));
    if (vTrack) {
      const id = addClip(vTrack.id, {
        type: 'adjustment',
        name: 'Adjustment Layer',
        startTime: currentTime,
        duration: 5,
        filter: 'none',
      });
      useUIStore.getState().selectClip(id);
      useUIStore.getState().setShowAdjustments(true);
    }
  };

  const handleFitAll = () => {
    // Calculate zoom level to fit all content
    const container = document.querySelector('.timeline-track-content');
    if (container && duration > 0) {
      const containerWidth = container.clientWidth;
      const targetZoom = Math.max(2, Math.min(60, containerWidth / duration));
      setTimelineZoom(Math.round(targetZoom));
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 10px',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-bg-primary)',
      flexShrink: 0,
      height: 36,
      minHeight: 36,
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

      {/* Add Track & Adjustment Layer */}
      <div style={{ position: 'relative' }}>
        <button 
          className="btn-secondary" 
          style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Track
        </button>
        {showAddMenu && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
            background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
            borderRadius: 6, padding: '4px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            <button className="context-menu-item" onClick={() => { addTrack('video'); setShowAddMenu(false); }}>🎬 Video Track</button>
            <button className="context-menu-item" onClick={() => { addTrack('audio'); setShowAddMenu(false); }}>🎵 Audio Track</button>
            <button className="context-menu-item" onClick={() => { addTrack('text'); setShowAddMenu(false); }}>📝 Text Track</button>
          </div>
        )}
      </div>

      <button 
        className="btn-secondary" 
        style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
        onClick={handleAddAdjustmentLayer}
        title="Add Adjustment Layer to active track"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Adjustment Layer
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

      {/* Auto-Enhance */}
      <button 
        className="btn-primary tooltip" 
        data-tooltip="Auto-Enhance Project"
        onClick={() => {
          useProjectStore.getState().autoEnhanceProject();
        }}
        style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-accent-primary)', marginRight: 12 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 2.5l2 2"/><path d="M21.5 21.5l-2-2"/><path d="M2.5 21.5l2-2"/><path d="M21.5 2.5l-2 2"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><circle cx="12" cy="12" r="5"/></svg>
        Auto-Enhance
      </button>

      {/* Zoom controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="btn-icon" onClick={() => setTimelineZoom(timelineZoom - 3)} title="Zoom Out (-)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>

        <input
          type="range"
          min="2" max="60" step="1"
          value={timelineZoom}
          onChange={e => setTimelineZoom(parseInt(e.target.value))}
          style={{ width: 72, height: 4, accentColor: 'var(--color-accent-primary)' }}
          title={`${getZoomLabel(timelineZoom)} (${timelineZoom}px/s)`}
        />

        <button className="btn-icon" onClick={() => setTimelineZoom(timelineZoom + 3)} title="Zoom In (+)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>

        <span style={{
          fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
          minWidth: 50, textAlign: 'center', fontWeight: 500,
        }}>
          {getZoomLabel(timelineZoom)}
        </span>

        <button
          className="btn-icon"
          onClick={handleFitAll}
          title="Fit All"
          style={{ fontSize: 9, fontWeight: 600, width: 'auto', padding: '2px 6px' }}
        >
          FIT
        </button>
      </div>
    </div>
  );
}
