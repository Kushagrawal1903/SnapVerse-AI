import React, { useRef, useCallback } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function KeyframeTimeline() {
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const keyframedProperty = useUIStore(s => s.keyframedProperty);
  const timelineZoom = useUIStore(s => s.timelineZoom);
  const currentTime = useProjectStore(s => s.currentTime);
  const setCurrentTime = useProjectStore(s => s.setCurrentTime);
  const updateClip = useProjectStore(s => s.updateClip);
  const tracks = useProjectStore(s => s.tracks);

  const containerRef = useRef(null);

  if (selectedClipIds.size !== 1 || !keyframedProperty) return null;

  const clipId = Array.from(selectedClipIds)[0];
  let clip = null;
  let trackId = null;

  tracks.forEach(t => {
    const found = t.clips.find(c => c.id === clipId);
    if (found) { clip = found; trackId = t.id; }
  });

  if (!clip || !clip.transformKeyframes || !clip.transformKeyframes[keyframedProperty]) return null;

  const keyframes = clip.transformKeyframes[keyframedProperty] || [];
  const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);

  const handleDragPoint = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const initialTime = keyframes[index].time;

    const handleMove = (moveE) => {
      const dx = moveE.clientX - startX;
      const dTime = dx / timelineZoom;
      let newTime = Math.max(clip.startTime, Math.min(clip.startTime + effectiveDuration, initialTime + dTime));
      
      const newKf = [...keyframes];
      newKf[index] = { ...newKf[index], time: newTime };
      updateClip(trackId, clip.id, {
        transformKeyframes: { ...clip.transformKeyframes, [keyframedProperty]: newKf }
      });
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      useProjectStore.getState().pushHistory();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleBgClick = (e) => {
    if (e.target !== containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = clip.startTime + (x / timelineZoom);
    setCurrentTime(clickTime);
  };

  const handleAddKeyframe = () => {
    const currentVal = clip.transform?.[keyframedProperty] ?? (keyframedProperty.includes('scale') ? 1 : keyframedProperty === 'opacity' ? 100 : 0);
    const time = currentTime;
    const newKf = [...keyframes];
    const idx = newKf.findIndex(k => Math.abs(k.time - time) < 0.1);
    if (idx >= 0) newKf.splice(idx, 1);
    else newKf.push({ time, value: currentVal });
    
    updateClip(trackId, clip.id, {
      transformKeyframes: { ...clip.transformKeyframes, [keyframedProperty]: newKf }
    });
  };

  return (
    <div style={{
      marginTop: 8,
      padding: '8px 0',
      background: 'var(--color-bg-secondary)',
      borderTop: '1px solid var(--color-border)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center'
    }}>
      <div style={{ width: 100, flexShrink: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
          {keyframedProperty.replace('X', ' X').replace('Y', ' Y')}
        </span>
        <button 
          onClick={handleAddKeyframe}
          style={{ fontSize: 10, padding: '2px 4px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer', color: 'var(--color-text-primary)' }}
        >
          {keyframes.some(k => Math.abs(k.time - currentTime) < 0.1) ? '- Remove' : '+ Add'}
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', height: 24 }}>
        {/* Playhead line for mini-timeline */}
        <div style={{
          position: 'absolute',
          left: (currentTime - clip.startTime) * timelineZoom,
          top: 0, bottom: 0,
          width: 1,
          background: 'var(--color-accent-primary)',
          pointerEvents: 'none'
        }} />

        <div 
          ref={containerRef}
          onMouseDown={handleBgClick}
          style={{
            position: 'absolute',
            left: clip.startTime * timelineZoom,
            width: effectiveDuration * timelineZoom,
            height: '100%',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 4,
            cursor: 'text'
          }}
        >
          {keyframes.map((kf, i) => (
            <div
              key={i}
              onMouseDown={(e) => handleDragPoint(e, i)}
              style={{
                position: 'absolute',
                left: (kf.time - clip.startTime) * timelineZoom,
                top: '50%',
                transform: 'translate(-50%, -50%) rotate(45deg)',
                width: 10,
                height: 10,
                background: 'var(--color-accent-primary)',
                border: '1px solid #fff',
                cursor: 'ew-resize'
              }}
              title={`Time: ${kf.time.toFixed(2)}s, Value: ${kf.value}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
