import React, { useCallback, useState, useRef, useEffect } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import TimelineClip from './TimelineClip';
import { showToast } from '../../stores/useToastStore';

const TRACK_HINTS = {
  text: '📝 Titles, captions, stickers',
  video1: '🎬 Your main clip — drag here',
  video2: '🎬 B-roll footage, overlays',
  photo: '📷 Photos, freeze frames',
  audio1: '🎵 Music, sound effects',
  audio2: '🎵 Voiceover, narration',
};

export default function TimelineTrack({ config, track, renderMode, trackHeight }) {
  const addClip = useProjectStore(s => s.addClip);
  const closeGap = useProjectStore(s => s.closeGap);
  const updateTrack = useProjectStore(s => s.updateTrack);
  const deleteTrack = useProjectStore(s => s.deleteTrack);
  const timelineZoom = useUIStore(s => s.timelineZoom);
  const openContextMenu = useUIStore(s => s.openContextMenu);
  const isDraggingMedia = useUIStore(s => s.isDraggingMedia);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  
  const isLocked = track?.locked || false;
  const label = track?.label || config.label;
  const [tempLabel, setTempLabel] = useState(label);
  const inputRef = useRef(null);

  // Smart drag-drop: is this the suggested track for the dragged media?
  const isSuggestedTarget = isDraggingMedia && config.accepts.includes(isDraggingMedia.type);
  const isNonTarget = isDraggingMedia && !isSuggestedTarget;

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
      if (!config.accepts.includes(media.type)) {
        showToast(`This track only accepts ${config.accepts.join(', ')} media`, 'warning', 2500);
        return;
      }
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
      showToast(`"${media.name}" added to ${config.label}`, 'success', 2000);
    } catch {}
    
    // Clear drag state
    useUIStore.getState().setIsDraggingMedia(null);
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
    const startHeight = track?.height || 64;

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(40, Math.min(160, startHeight + delta));
      updateTrack(track.id, { height: newHeight });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
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

  // ─── RENDER: HEADER MODE ───
  if (renderMode === 'header') {
    return (
      <div style={{
        height: trackHeight,
        minHeight: trackHeight,
        position: 'relative',
        opacity: isLocked ? 0.6 : 1,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div className="timeline-track-label" style={{ height: '100%' }}>
          {/* Row 1: Icon + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%' }}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>{config.icon}</span>
            {isEditingLabel ? (
              <input
                ref={inputRef}
                value={tempLabel}
                onChange={e => setTempLabel(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
                style={{
                  flex: 1, background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-accent-primary)', fontSize: 10, padding: '1px 4px',
                  borderRadius: 3, width: '100%', outline: 'none',
                }}
              />
            ) : (
              <span 
                onDoubleClick={() => setIsEditingLabel(true)}
                style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, fontSize: 10, fontWeight: 600, cursor: 'text',
                  color: 'var(--color-text-primary)',
                }}
                title="Double-click to rename"
              >
                {label}
              </span>
            )}
          </div>

          {/* Row 2: Controls */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {/* Lock */}
            <button
              className="track-ctrl-btn"
              onClick={() => updateTrack(track.id, { locked: !isLocked })}
              style={{
                background: isLocked ? 'rgba(226,75,74,0.15)' : 'transparent',
                color: isLocked ? '#E24B4A' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
              }}
              title={isLocked ? "Unlock Track" : "Lock Track"}
            >
              {isLocked ? '🔒' : '🔓'}
            </button>

            {/* Mute */}
            {(config.accepts.includes('audio') || config.accepts.includes('video')) && track && (
              <button
                className="track-ctrl-btn"
                onClick={() => updateTrack(track.id, { muted: !track.muted })}
                style={{
                  background: track.muted ? 'rgba(226,75,74,0.15)' : 'transparent',
                  color: track.muted ? '#E24B4A' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
                title="Mute Track"
              >
                M
              </button>
            )}

            {/* Solo */}
            {(config.accepts.includes('audio') || config.accepts.includes('video')) && track && (
              <button
                className="track-ctrl-btn"
                onClick={() => updateTrack(track.id, { solo: !track.solo })}
                style={{
                  background: track.solo ? 'rgba(91,79,245,0.2)' : 'transparent',
                  color: track.solo ? '#5b4ff5' : 'var(--color-text-muted)',
                  border: `1px solid ${track.solo ? '#5b4ff5' : 'var(--color-border)'}`,
                }}
                title="Solo Track"
              >
                S
              </button>
            )}

            {/* Delete custom track */}
            {track?.isCustom && (
              <button
                className="track-ctrl-btn"
                onClick={() => deleteTrack(track.id)}
                style={{
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
                title="Delete Track"
              >
                🗑
              </button>
            )}
          </div>
        </div>

        {/* Track height resize handle */}
        <div 
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0, height: 4,
            cursor: 'ns-resize',
            zIndex: 10,
            transition: 'background 0.15s',
          }}
          onMouseDown={handleResizeStart}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,79,245,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        />
      </div>
    );
  }

  // ─── RENDER: CONTENT MODE ───
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

  const hasClips = track?.clips.length > 0;
  const hintText = TRACK_HINTS[config.id] || `Drag ${config.accepts.join('/')} here`;

  return (
    <div style={{
      height: trackHeight,
      minHeight: trackHeight,
      position: 'relative',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      opacity: isLocked ? 0.6 : isNonTarget ? 0.35 : 1,
      transition: 'opacity 0.2s ease',
      boxShadow: isSuggestedTarget ? '0 0 0 1.5px var(--color-accent-primary) inset, 0 0 12px rgba(91,79,245,0.1) inset' : 'none',
    }}>
      <div
        className="timeline-track-content"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          height: '100%',
          background: isDragOver
            ? 'rgba(91, 79, 245, 0.08)'
            : isSuggestedTarget
            ? 'rgba(91, 79, 245, 0.03)'
            : 'var(--color-timeline-track)',
          borderColor: isDragOver ? 'var(--color-accent-primary)' : 'transparent',
          border: isDragOver ? '1.5px dashed var(--color-accent-primary)' : '1.5px solid transparent',
          transition: 'all 0.15s ease',
          position: 'relative',
          pointerEvents: isLocked ? 'none' : 'auto',
          overflow: 'hidden'
        }}
      >
        {/* Track hint label when empty */}
        {!hasClips && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isSuggestedTarget ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
            fontSize: 11, fontWeight: isSuggestedTarget ? 600 : 400,
            opacity: isSuggestedTarget ? 0.9 : 0.4,
            pointerEvents: 'none', userSelect: 'none',
            transition: 'all 0.2s ease',
          }}>
            {isSuggestedTarget ? '⬇ Drop here' : hintText}
          </div>
        )}

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
              top: 3, bottom: 3,
              background: 'rgba(226, 75, 74, 0.06)',
              border: '1px dashed rgba(226, 75, 74, 0.25)',
              borderRadius: 4,
              cursor: isLocked ? 'default' : 'context-menu',
            }}
            title={isLocked ? "" : "Right-click to Close Gap"}
          />
        ))}
        {track?.clips.map(clip => (
          <TimelineClip key={clip.id} clip={clip} trackId={config.id} />
        ))}
      </div>
    </div>
  );
}
