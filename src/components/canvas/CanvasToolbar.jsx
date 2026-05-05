import React from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import { ASPECT_RATIOS, TRACK_TYPES } from '../../utils/constants';

export default function CanvasToolbar() {
  const aspectRatio = useProjectStore(s => s.aspectRatio);
  const setAspectRatio = useProjectStore(s => s.setAspectRatio);
  const addClip = useProjectStore(s => s.addClip);
  const currentTime = useProjectStore(s => s.currentTime);
  const showFilters = useUIStore(s => s.showFilters);
  const setShowFilters = useUIStore(s => s.setShowFilters);
  const showAdjustments = useUIStore(s => s.showAdjustments);
  const setShowAdjustments = useUIStore(s => s.setShowAdjustments);

  const handleAddText = () => {
    addClip(TRACK_TYPES.TEXT, {
      type: 'text',
      name: 'Text Layer',
      text: 'Your Text Here',
      font: 'DM Sans',
      fontSize: 32,
      fontColor: '#ffffff',
      textAlign: 'center',
      textBg: 'rgba(0,0,0,0.5)',
      entrance: 'Fade In',
      exit: 'Fade Out',
      startTime: currentTime,
      duration: 3,
    });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'var(--color-bg-primary)',
      borderRadius: 'var(--radius-pill)',
      padding: '4px 8px',
      boxShadow: 'var(--shadow-default)',
    }}>
      <button
        className={`btn-icon ${showFilters ? 'active' : ''}`}
        onClick={() => { setShowFilters(!showFilters); setShowAdjustments(false); }}
        title="Filters"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
      </button>
      <button
        className={`btn-icon ${showAdjustments ? 'active' : ''}`}
        onClick={() => { setShowAdjustments(!showAdjustments); setShowFilters(false); }}
        title="Adjustments"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

      <button className="btn-icon" onClick={handleAddText} title="Add Text">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
      </button>

      <button 
        className={`btn-icon ${useUIStore(s => s.canvasMode) === 'crop' ? 'active' : ''}`} 
        onClick={() => {
          const store = useUIStore.getState();
          store.setCanvasMode(store.canvasMode === 'crop' ? 'select' : 'crop');
        }} 
        title="Crop (C)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg>
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

      {/* Aspect ratio selector */}
      {Object.entries(ASPECT_RATIOS).map(([key, val]) => (
        <button
          key={key}
          className={`pill-tab ${aspectRatio === key ? 'active' : ''}`}
          onClick={() => setAspectRatio(key)}
          style={{ fontSize: 10, padding: '3px 8px' }}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
