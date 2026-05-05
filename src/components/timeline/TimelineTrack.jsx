import React, { useCallback, useState, useRef, useEffect } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import TimelineClip from './TimelineClip';

export default function TimelineTrack({ config, track }) {
  const addClip = useProjectStore(s => s.addClip);
  const closeGap = useProjectStore(s => s.closeGap);
  const updateTrack = useProjectStore(s => s.updateTrack);
  const deleteTrack = useProjectStore(s => s.deleteTrack);
  const timelineZoom = useUIStore(s => s.timelineZoom);
  const openContextMenu = useUIStore(s => s.openContextMenu);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  
  const isLocked = track?.locked || false;
  const label = track?.label || config.label;
  const [tempLabel, setTempLabel] = useState(label);
  const inputRef = useRef(null);

  useEffect(() => {
    setTempLabel(label);
  }, [label]);

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingLabel]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isLocked) return;

    const data = e.dataTransfer.getData('application/snapverse-media');
    if (!data) return;
    try {
      const media = JSON.parse(data);
      if (!config.accepts.includes(media.type)) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const startTime = Math.max(0, x / timelineZoom);

      const snap = useUIStore.getState().snapToGrid;
      const snappedStart = snap ? Math.round(startTime * 2) / 2 : startTime;

      addClip(config.id, {
        mediaId: media.mediaId,
        name: media.name,
        type: media.type,
        startTime: snappedStart,
        duration: media.duration || 5,
      });
    } catch {}
  }, [config, addClip, timelineZoom, isLocked]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (isLocked) return;
    const data = e.dataTransfer.types.includes('application/snapverse-media');
    if (data) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }, [isLocked]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleResizeStart = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = track?.height || 80;

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(32, Math.min(160, startHeight + delta));
      updateTrack(track.id, { height: newHeight });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRenameSubmit = () => {
    setIsEditingLabel(false);
    if (tempLabel.trim() && track) {
      updateTrack(track.id, { label: tempLabel.trim() });
    } else {
      setTempLabel(label);
    }
  };

  const gaps = [];
  if (track && track.clips.length > 0) {
    const sorted = [...track.clips].sort((a,b) => a.startTime - b.startTime);
    let currentEnd = 0;
    sorted.forEach(c => {
      const start = c.startTime;
      if (start - currentEnd > 0.05) {
        gaps.push({ start: currentEnd, end: start, duration: start - currentEnd });
      }
      currentEnd = Math.max(currentEnd, start + c.duration - (c.trimIn||0) - (c.trimOut||0));
    });
  }

  const trackHeight = track?.height || 80;

  return (
    <div className="timeline-track" style={{ height: trackHeight, minHeight: trackHeight, opacity: isLocked ? 0.6 : 1 }}>
      <div className="timeline-track-label" style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
          <span style={{ fontSize: 14 }}>{config.icon}</span>
          {isEditingLabel ? (
            <input
              ref={inputRef}
              value={tempLabel}
              onChange={e => setTempLabel(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
              style={{ flex: 1, background: '#000', color: '#fff', border: '1px solid var(--color-accent-primary)', fontSize: 11, padding: '2px 4px', width: '100%' }}
            />
          ) : (
            <span 
              onDoubleClick={() => setIsEditingLabel(true)}
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: 11, fontWeight: 600, cursor: 'text' }}
              title="Double-click to rename"
            >
              {label}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => updateTrack(track.id, { locked: !isLocked })}
              style={{
                width: 20, height: 20, background: isLocked ? 'var(--color-danger)' : 'transparent',
                color: isLocked ? '#fff' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 10, cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title={isLocked ? "Unlock Track" : "Lock Track"}
            >
              🔒
            </button>
            {track?.isCustom && (
              <button
                onClick={() => deleteTrack(track.id)}
                style={{
                  width: 20, height: 20, background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 10, cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Delete Track"
              >
                🗑
              </button>
            )}
          </div>
          {(config.accepts.includes('audio') || config.accepts.includes('video')) && track && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button
                onClick={() => updateTrack(track.id, { muted: !track.muted })}
                style={{
                  width: 20, height: 20, background: track.muted ? 'var(--color-danger)' : 'transparent',
                  color: track.muted ? '#fff' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 10, cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Mute Track"
              >M</button>
              <button
                onClick={() => updateTrack(track.id, { solo: !track.solo })}
                style={{
                  width: 20, height: 20, background: track.solo ? 'var(--color-warning)' : 'transparent',
                  color: track.solo ? '#000' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 10, cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Solo Track"
              >S</button>
            </div>
          )}
        </div>
      </div>
      <div
        className="timeline-track-content"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          background: isDragOver
            ? 'rgba(91, 79, 245, 0.08)'
            : 'var(--color-timeline-track)',
          borderColor: isDragOver ? 'var(--color-accent-primary)' : 'transparent',
          border: isDragOver ? '1.5px dashed var(--color-accent-primary)' : '1.5px solid transparent',
          transition: 'all 0.15s ease',
          position: 'relative',
          pointerEvents: isLocked ? 'none' : 'auto',
          overflow: 'hidden'
        }}
      >
        {gaps.map((g, i) => (
          <div
            key={`gap-${i}`}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isLocked) return;
              openContextMenu(e.clientX, e.clientY, [
                { label: 'Close Gap', action: () => closeGap(track.id, g.start, g.duration) }
              ]);
            }}
            style={{
              position: 'absolute',
              left: g.start * timelineZoom,
              width: g.duration * timelineZoom,
              top: 0, bottom: 0,
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              cursor: isLocked ? 'default' : 'context-menu',
            }}
            title={isLocked ? "" : "Right-click to Close Gap"}
          />
        ))}
        {track?.clips.map(clip => (
          <TimelineClip key={clip.id} clip={clip} trackId={config.id} />
        ))}
      </div>
      
      {/* Resize Handle */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0, height: 4,
          cursor: 'row-resize',
          zIndex: 10,
        }}
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
