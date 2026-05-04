import React, { useCallback, useRef, useState, useEffect } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function TimelineClip({ clip, trackId }) {
  const updateClip = useProjectStore(s => s.updateClip);
  const updateClips = useProjectStore(s => s.updateClips);
  const removeClip = useProjectStore(s => s.removeClip);
  const deleteClips = useProjectStore(s => s.deleteClips);
  const duplicateClips = useProjectStore(s => s.duplicateClips);
  const pasteClips = useProjectStore(s => s.pasteClips);
  const splitClip = useProjectStore(s => s.splitClip);
  const addClip = useProjectStore(s => s.addClip);
  const selectClip = useUIStore(s => s.selectClip);
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const setClipboardClips = useUIStore(s => s.setClipboardClips);
  const clipboardClips = useUIStore(s => s.clipboardClips);
  const timelineZoom = useUIStore(s => s.timelineZoom);
  const magneticTimeline = useUIStore(s => s.magneticTimeline);
  const rippleEdit = useUIStore(s => s.rippleEdit);
  const openContextMenu = useUIStore(s => s.openContextMenu);
  const currentTime = useProjectStore(s => s.currentTime);
  const tracks = useProjectStore(s => s.tracks);
  const mediaItems = useProjectStore(s => s.mediaItems);
  const waveCanvasRef = useRef(null);
  
  const [snapIndicator, setSnapIndicator] = useState(null);
  const [isRippling, setIsRippling] = useState(false);

  const isSelected = selectedClipIds.has(clip.id);
  const left = clip.startTime * timelineZoom;
  const width = Math.max(20, (clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0)) * timelineZoom);

  const typeClass = `type-${clip.type}`;

  // Draw waveform for audio clips
  useEffect(() => {
    if (clip.type !== 'audio' || !waveCanvasRef.current) return;
    const media = mediaItems.find(m => m.id === clip.mediaId);
    if (!media?.waveform?.length) return;

    const canvas = waveCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width: cw, height: ch } = canvas;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = clip.type === 'audio' ? 'rgba(0,133,110,0.4)' : 'rgba(91,79,245,0.3)';
    const barW = cw / media.waveform.length;
    media.waveform.forEach((val, i) => {
      const barH = val * ch * 0.8;
      ctx.fillRect(i * barW, (ch - barH) / 2, Math.max(1, barW - 0.5), barH);
    });
  }, [clip.mediaId, clip.type, mediaItems]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (!selectedClipIds.has(clip.id)) {
      selectClip(clip.id, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
    } else if (e.ctrlKey || e.metaKey) {
      selectClip(clip.id, { ctrl: true });
      return; 
    }

    const startX = e.clientX;
    const initialStarts = {};
    const currentSelection = useUIStore.getState().selectedClipIds;
    
    tracks.forEach(t => t.clips.forEach(c => {
      if (currentSelection.has(c.id)) {
        initialStarts[c.id] = { trackId: t.id, startTime: c.startTime };
      }
    }));

    let snapCandidates = [0];
    if (magneticTimeline) {
      tracks.forEach(t => t.clips.forEach(c => {
        if (!currentSelection.has(c.id)) {
          snapCandidates.push(c.startTime);
          snapCandidates.push(c.startTime + c.duration - (c.trimIn||0) - (c.trimOut||0));
        }
      }));
    }

    const handleMouseMove = (moveE) => {
      const dx = moveE.clientX - startX;
      let dt = dx / timelineZoom;
      
      let snapTarget = null;
      if (magneticTimeline) {
        const candidateTime = initialStarts[clip.id].startTime + dt;
        const candidateEnd = candidateTime + clip.duration - (clip.trimIn||0) - (clip.trimOut||0);
        
        let bestDist = 8 / timelineZoom;
        let snapDelta = dt;

        snapCandidates.forEach(cand => {
          if (Math.abs(cand - candidateTime) < bestDist) {
            bestDist = Math.abs(cand - candidateTime);
            snapDelta = cand - initialStarts[clip.id].startTime;
            snapTarget = cand;
          }
          if (Math.abs(cand - candidateEnd) < bestDist) {
            bestDist = Math.abs(cand - candidateEnd);
            snapDelta = cand - (initialStarts[clip.id].startTime + clip.duration - (clip.trimIn||0) - (clip.trimOut||0));
            snapTarget = cand;
          }
        });
        dt = snapDelta;
      }
      setSnapIndicator(snapTarget);

      const updates = {};
      Object.entries(initialStarts).forEach(([id, data]) => {
        updates[id] = { startTime: Math.max(0, data.startTime + dt) };
      });
      updateClips(updates);
    };

    const handleMouseUp = () => {
      setSnapIndicator(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      useProjectStore.getState().pushHistory();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [clip, timelineZoom, selectedClipIds, selectClip, magneticTimeline, tracks, updateClips]);

  const handleTrimMouseDown = useCallback((side, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedClipIds.has(clip.id)) {
      selectClip(clip.id);
    }
    const startX = e.clientX;
    const origStart = clip.startTime;
    const origDuration = clip.duration;
    const origTrimIn = clip.trimIn || 0;
    const origTrimOut = clip.trimOut || 0;

    const origDownstream = [];
    if (rippleEdit) {
      setIsRippling(true);
      const track = tracks.find(t => t.id === trackId);
      track.clips.forEach(c => {
        if (c.startTime > origStart) origDownstream.push({ id: c.id, origStart: c.startTime });
      });
    }

    const handleMouseMove = (moveE) => {
      const dx = moveE.clientX - startX;
      const dt = dx / timelineZoom;
      let durationDelta = 0;

      if (side === 'left') {
        const newTrimIn = Math.max(0, origTrimIn + dt);
        const maxTrim = origDuration - origTrimOut - 0.5;
        const clampedTrimIn = Math.min(newTrimIn, maxTrim);
        updateClip(trackId, clip.id, {
          startTime: origStart + (clampedTrimIn - origTrimIn),
          trimIn: clampedTrimIn,
        });
        durationDelta = origTrimIn - clampedTrimIn;
      } else {
        if (clip.type === 'photo') {
          const newDuration = Math.max(0.5, origDuration + dt);
          updateClip(trackId, clip.id, { duration: newDuration });
          durationDelta = newDuration - origDuration;
        } else {
          const newTrimOut = Math.max(0, origTrimOut - dt);
          const maxTrim = origDuration - origTrimIn - 0.5;
          const clampedTrimOut = Math.min(newTrimOut, maxTrim);
          updateClip(trackId, clip.id, { trimOut: clampedTrimOut });
          durationDelta = origTrimOut - clampedTrimOut;
        }
      }

      if (rippleEdit && durationDelta !== 0 && origDownstream.length > 0) {
        const updates = {};
        origDownstream.forEach(c => {
          updates[c.id] = { startTime: Math.max(0, c.origStart + durationDelta) };
        });
        updateClips(updates);
      }
    };

    const handleMouseUp = () => {
      setIsRippling(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      useProjectStore.getState().pushHistory();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [clip, trackId, timelineZoom, selectClip, updateClip, updateClips, rippleEdit, tracks, selectedClipIds]);

  const handleTrimDoubleClick = useCallback((side, e) => {
    e.stopPropagation();
    if (side === 'right' && clip.type === 'photo') {
      const val = window.prompt("Enter exact duration (seconds):", clip.duration.toFixed(2));
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0.1) {
        updateClip(trackId, clip.id, { duration: parsed });
        useProjectStore.getState().pushHistory();
      }
    }
  }, [clip, trackId, updateClip]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedClipIds.has(clip.id)) {
      selectClip(clip.id);
    }
    const currentSelection = useUIStore.getState().selectedClipIds;
    
    openContextMenu(e.clientX, e.clientY, [
      { label: '✂ Split at Playhead', action: () => {
        currentSelection.forEach(id => {
          const tId = tracks.find(t => t.clips.some(c => c.id === id))?.id;
          if (tId) splitClip(tId, id, currentTime);
        });
      }},
      { label: '📋 Copy', action: () => {
        const toCopy = [];
        tracks.forEach(t => t.clips.forEach(c => {
          if (currentSelection.has(c.id)) toCopy.push({...c, trackId: t.id});
        }));
        setClipboardClips(toCopy);
      }},
      { label: '📑 Paste', action: () => {
        pasteClips(clipboardClips, currentTime);
      }, disabled: !clipboardClips || clipboardClips.length === 0 },
      { label: '📋 Duplicate', action: () => {
        duplicateClips(currentSelection);
      }},
      { label: '🗑 Delete', action: () => {
        deleteClips(currentSelection, rippleEdit);
        useUIStore.getState().clearSelection();
      }, danger: true },
    ]);
  }, [clip.id, selectedClipIds, selectClip, tracks, currentTime, splitClip, setClipboardClips, clipboardClips, pasteClips, duplicateClips, deleteClips, rippleEdit, openContextMenu]);

  // Get thumbnail for video/photo clips
  const media = mediaItems.find(m => m.id === clip.mediaId);
  const showThumb = (clip.type === 'video' || clip.type === 'photo') && media?.thumbnail;

  return (
    <>
      <div
        className={`timeline-clip ${typeClass} ${isSelected ? 'selected' : ''} ${isRippling ? 'rippling' : ''}`}
        style={{ left, width, position: 'absolute' }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        title={`${clip.name} (${clip.duration.toFixed(1)}s)`}
      >
        {/* Left trim handle */}
        <div className="trim-handle left" onMouseDown={(e) => handleTrimMouseDown('left', e)} onDoubleClick={(e) => handleTrimDoubleClick('left', e)} />

        {/* Thumbnail strip for video/photo */}
        {showThumb && (
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.3, overflow: 'hidden',
            borderRadius: 'inherit', pointerEvents: 'none',
          }}>
            <img src={media.thumbnail} alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover',
            }} />
          </div>
        )}

        {/* Waveform for audio clips */}
        {clip.type === 'audio' && (
          <canvas
            ref={waveCanvasRef}
            width={Math.max(20, width)}
            height={30}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              pointerEvents: 'none', borderRadius: 'inherit',
            }}
          />
        )}

        {/* Clip label */}
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, pointerEvents: 'none', position: 'relative', zIndex: 1,
          textShadow: showThumb ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
        }}>
          {clip.type === 'text' ? (clip.text || clip.name) : clip.name}
        </span>

        {/* Right trim handle */}
        <div className="trim-handle right" onMouseDown={(e) => handleTrimMouseDown('right', e)} onDoubleClick={(e) => handleTrimDoubleClick('right', e)} />
      </div>

      {snapIndicator !== null && (
        <div style={{
          position: 'absolute',
          left: snapIndicator * timelineZoom,
          top: -2000, bottom: -2000, width: 2,
          background: 'var(--color-accent-primary)', zIndex: 10, pointerEvents: 'none'
        }} />
      )}
    </>
  );
}
