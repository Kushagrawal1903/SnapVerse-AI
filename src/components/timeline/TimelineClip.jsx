import React, { useCallback, useRef, useState, useEffect } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import { encodeWAV } from '../../utils/audioEncoder';
import { getAudioContext } from '../../services/audioEngine';

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
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(null);

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
    
    const startRatio = (clip.trimIn || 0) / clip.duration;
    const endRatio = (clip.duration - (clip.trimOut || 0)) / clip.duration;
    
    const totalSamples = media.waveform.length;
    const startIndex = Math.floor(startRatio * totalSamples);
    const endIndex = Math.max(startIndex + 1, Math.floor(endRatio * totalSamples));
    
    const slice = media.waveform.slice(startIndex, endIndex);
    
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = clip.type === 'audio' ? 'rgba(0,133,110,0.4)' : 'rgba(91,79,245,0.3)';
    
    if (slice.length > 0) {
      const barW = cw / slice.length;
      slice.forEach((val, i) => {
        const barH = val * ch * 0.8;
        ctx.fillRect(i * barW, (ch - barH) / 2, Math.max(1, barW - 0.5), barH);
      });
    }
  }, [clip.mediaId, clip.type, clip.trimIn, clip.trimOut, clip.duration, mediaItems]);

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
      { label: '🎵 Detach Audio', action: async () => {
        if (!media || clip.type !== 'video') return;
        try {
          // Detach takes a bit, so ideally we show a spinner, but we do this sync for now
          const response = await fetch(media.objectUrl);
          const arrayBuffer = await response.arrayBuffer();
          const ctx = getAudioContext();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const wavBlob = encodeWAV(audioBuffer);
          const url = URL.createObjectURL(wavBlob);
          const store = useProjectStore.getState();
          const newMediaId = `detached-${Date.now()}`;
          
          store.addMedia({
            id: newMediaId,
            name: `${clip.name} (Audio)`,
            type: 'audio',
            objectUrl: url,
            duration: clip.duration,
            waveform: []
          });
          
          const audioTrack = tracks.find(t => t.id === 'audio1' || t.accepts?.includes('audio') && !t.accepts?.includes('video'));
          if (audioTrack) {
            store.addClip(audioTrack.id, {
              type: 'audio',
              mediaId: newMediaId,
              startTime: clip.startTime,
              duration: clip.duration,
              trimIn: clip.trimIn || 0,
              trimOut: clip.trimOut || 0,
              name: `${clip.name} (Audio)`
            });
            updateClip(trackId, clip.id, { audioDetached: true });
          }
        } catch (e) {
          console.error('Failed to detach audio', e);
        }
      }, disabled: clip.type !== 'video' || clip.audioDetached },
      { label: '❄ Freeze Frame Here', action: () => {
        const canvas = document.getElementById('main-preview-canvas');
        if (!canvas) return;
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const store = useProjectStore.getState();
          const mediaId = `freeze-${Date.now()}`;
          store.addMedia({
            id: mediaId,
            name: 'Freeze Frame',
            type: 'photo',
            objectUrl: url
          });
          if (rippleEdit) {
            store.shiftClips(trackId, currentTime, 2);
          }
          store.addClip(trackId, {
            type: 'photo',
            mediaId,
            startTime: currentTime,
            duration: 2,
            name: 'Freeze Frame'
          });
        }, 'image/jpeg', 0.9);
      }, disabled: clip.type !== 'video' },
      { label: '⏪ Reverse', action: () => {
        currentSelection.forEach(id => {
          const tId = tracks.find(t => t.clips.some(c => c.id === id))?.id;
          const c = tracks.find(t => t.id === tId)?.clips.find(c => c.id === id);
          if (tId && c) updateClip(tId, id, { reversed: !c.reversed });
        });
      }, disabled: clip.type !== 'video' && clip.type !== 'audio' },
      { label: '🗑 Delete', action: () => {
        deleteClips(currentSelection, rippleEdit);
        useUIStore.getState().clearSelection();
      }, danger: true },
    ]);
  }, [clip.id, selectedClipIds, selectClip, tracks, currentTime, splitClip, setClipboardClips, clipboardClips, pasteClips, duplicateClips, deleteClips, rippleEdit, openContextMenu]);

  // Get thumbnail for video/photo clips
  const media = mediaItems.find(m => m.id === clip.mediaId);
  const showThumb = (clip.type === 'video' || clip.type === 'photo') && media?.thumbnail;

  const handleHoverMove = useCallback((e) => {
    if (e.buttons > 0) {
      setHoverTime(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverX(x);
    setHoverTime(clip.startTime + (x / timelineZoom));
  }, [clip.startTime, timelineZoom]);

  const handleHoverLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  return (
    <>
      <div
        className={`timeline-clip ${typeClass} ${isSelected ? 'selected' : ''} ${isRippling ? 'rippling' : ''}`}
        style={{ left, width, position: 'absolute' }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onMouseMove={handleHoverMove}
        onMouseLeave={handleHoverLeave}
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
        
        {/* Beat Markers */}
        {clip.beats && clip.type === 'audio' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {clip.beats.map((beatTime, i) => {
              const effectiveTime = beatTime - (clip.trimIn || 0);
              if (effectiveTime < 0 || effectiveTime > (clip.duration - (clip.trimIn||0) - (clip.trimOut||0))) return null;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: effectiveTime * timelineZoom,
                  top: 0, bottom: 0,
                  width: 1,
                  background: 'rgba(255, 255, 255, 0.4)',
                  borderLeft: '1px solid var(--color-accent-primary)',
                }} />
              );
            })}
          </div>
        )}
        
        {/* Volume Automation Overlay */}
        {clip.volumeAutomation && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'crosshair' }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const time = (e.clientX - rect.left) / timelineZoom;
              const volume = Math.max(0, Math.min(200, ((rect.height - (e.clientY - rect.top)) / rect.height) * 200));
              
              const currentKfs = clip.volumeKeyframes || [
                { time: 0, volume: clip.volume ?? 100 },
                { time: clip.duration - (clip.trimIn||0) - (clip.trimOut||0), volume: clip.volume ?? 100 }
              ];
              const newKfs = [...currentKfs, { time, volume }].sort((a,b) => a.time - b.time);
              updateClip(trackId, clip.id, { volumeKeyframes: newKfs });
            }}
          >
            <svg width="100%" height="100%" style={{ overflow: 'visible', pointerEvents: 'none' }}>
              {(clip.volumeKeyframes || [
                { time: 0, volume: clip.volume ?? 100 },
                { time: clip.duration - (clip.trimIn||0) - (clip.trimOut||0), volume: clip.volume ?? 100 }
              ]).map((kf, i, arr) => {
                const x = kf.time * timelineZoom;
                const y = `calc(100% - ${kf.volume / 2}%)`;
                
                const next = arr[i + 1];
                return (
                  <g key={i}>
                    {next && (
                      <line
                        x1={x} y1={y}
                        x2={next.time * timelineZoom} y2={`calc(100% - ${next.volume / 2}%)`}
                        stroke="var(--color-accent-primary)" strokeWidth="2"
                      />
                    )}
                    <circle
                      cx={x} cy={y} r="4" fill="#fff" stroke="var(--color-accent-primary)" strokeWidth="2"
                      style={{ pointerEvents: 'auto', cursor: 'ns-resize' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const startY = e.clientY;
                        const startVol = kf.volume;
                        const handleMove = (moveE) => {
                          const dy = moveE.clientY - startY;
                          const dVol = -(dy / e.currentTarget.ownerSVGElement.clientHeight) * 200;
                          const newVol = Math.max(0, Math.min(200, startVol + dVol));
                          const newKfs = [...arr];
                          newKfs[i] = { ...kf, volume: newVol };
                          updateClip(trackId, clip.id, { volumeKeyframes: newKfs });
                        };
                        const handleUp = () => {
                          window.removeEventListener('pointermove', handleMove);
                          window.removeEventListener('pointerup', handleUp);
                        };
                        window.addEventListener('pointermove', handleMove);
                        window.addEventListener('pointerup', handleUp);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (i !== 0 && i !== arr.length - 1) {
                          const newKfs = arr.filter((_, idx) => idx !== i);
                          updateClip(trackId, clip.id, { volumeKeyframes: newKfs });
                        }
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Clip label */}
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, pointerEvents: 'none', position: 'relative', zIndex: 1,
          textShadow: showThumb ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
          display: 'flex', alignItems: 'center', gap: 4
        }}>
          {clip.audioDetached && <span title="Audio Detached">🔗</span>}
          {clip.reversed && <span style={{ background: 'var(--color-danger)', color: '#fff', fontSize: 8, padding: '1px 4px', borderRadius: 2, fontWeight: 'bold' }}>REV</span>}
          {clip.type === 'text' ? (clip.text || clip.name) : clip.name}
        </span>

        {/* Right trim handle */}
        <div className="trim-handle right" onMouseDown={(e) => handleTrimMouseDown('right', e)} onDoubleClick={(e) => handleTrimDoubleClick('right', e)} />
        
        {/* Hover Scrub Preview */}
        {hoverTime !== null && hoverX !== null && media && (clip.type === 'video' || clip.type === 'photo') && (
          <div style={{
            position: 'absolute',
            left: hoverX,
            bottom: '100%',
            marginBottom: 8,
            transform: 'translateX(-50%)',
            width: 120, height: 68,
            background: '#000',
            borderRadius: 4,
            border: '1px solid var(--color-border-strong)',
            overflow: 'hidden',
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-elevated)'
          }}>
            {clip.type === 'photo' ? (
              <img src={media.objectUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            ) : (
              <video 
                src={media.objectUrl}
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                ref={el => {
                  if (el) {
                    const target = (hoverTime - clip.startTime + (clip.trimIn || 0)) * (clip.speed || 1);
                    if (Math.abs(el.currentTime - target) > 0.1) {
                      el.currentTime = target;
                    }
                  }
                }}
              />
            )}
            <div style={{ position: 'absolute', bottom: 2, right: 4, color: 'white', fontSize: 9, textShadow: '0 1px 2px #000', fontWeight: 'bold' }}>
              {hoverTime.toFixed(1)}s
            </div>
          </div>
        )}
        
        {/* Hover Waveform Highlight */}
        {hoverTime !== null && hoverX !== null && clip.type === 'audio' && (
          <div style={{ position: 'absolute', left: hoverX, top: 0, bottom: 0, width: 1, background: 'var(--color-text-primary)', pointerEvents: 'none', boxShadow: '0 0 4px var(--color-bg-primary)' }} />
        )}
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
