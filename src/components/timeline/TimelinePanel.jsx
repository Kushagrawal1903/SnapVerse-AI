import React, { useRef, useCallback, useEffect, useState } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import TimelineRuler from './TimelineRuler';
import TimelineTrack from './TimelineTrack';
import TimelineControls from './TimelineControls';
import ClipPropertiesPanel from './ClipPropertiesPanel';
import SpeedCurvePanel from './SpeedCurvePanel';
import KeyframeTimeline from './KeyframeTimeline';
import TimelineMiniMap from './TimelineMiniMap';

export default function TimelinePanel() {
  const tracks = useProjectStore(s => s.tracks);
  const currentTime = useProjectStore(s => s.currentTime);
  const isPlaying = useProjectStore(s => s.isPlaying);
  const duration = useProjectStore(s => s.duration);
  const setCurrentTime = useProjectStore(s => s.setCurrentTime);
  const timelineZoom = useUIStore(s => s.timelineZoom);
  const rubberBand = useUIStore(s => s.rubberBand);
  const setRubberBand = useUIStore(s => s.setRubberBand);
  const selectClip = useUIStore(s => s.selectClip);
  const clearSelection = useUIStore(s => s.clearSelection);
  const containerRef = useRef(null);
  
  // Force re-render on scroll for minimap update
  const [, setScrollUpdate] = useState(0);

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -3 : 3;
      useUIStore.getState().setTimelineZoom(timelineZoom + delta);
    }
  }, [timelineZoom]);

  // Auto-scroll to follow playhead during playback
  useEffect(() => {
    if (!isPlaying || !containerRef.current) return;
    const container = containerRef.current;
    const playheadX = 100 + currentTime * timelineZoom;
    const scrollLeft = container.scrollLeft;
    const viewWidth = container.clientWidth;

    if (playheadX > scrollLeft + viewWidth - 80) {
      container.scrollLeft = playheadX - viewWidth / 2;
    }
  }, [currentTime, isPlaying, timelineZoom]);

  // Drag playhead
  const handlePlayheadDrag = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const handleMove = (moveE) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const x = moveE.clientX - rect.left + scrollLeft - 100;
      const time = Math.max(0, Math.min(x / timelineZoom, duration));
      setCurrentTime(time);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [timelineZoom, duration, setCurrentTime]);

  // Rubber-band selection
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 || e.target.closest('.timeline-clip') || e.target.closest('.playhead') || e.target.closest('.timeline-minimap-container')) return;
    
    // Clear selection if clicking empty area without Shift/Ctrl
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      clearSelection();
    }

    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const startY = e.clientY - rect.top + containerRef.current.scrollTop;

    setRubberBand({ active: true, startX, startY, endX: startX, endY: startY });

    const handleMove = (moveE) => {
      const currentX = moveE.clientX - rect.left + containerRef.current.scrollLeft;
      const currentY = moveE.clientY - rect.top + containerRef.current.scrollTop;
      setRubberBand({ endX: currentX, endY: currentY });
      
      // Compute intersection
      const rx1 = Math.min(startX, currentX);
      const rx2 = Math.max(startX, currentX);
      const ry1 = Math.min(startY, currentY);
      const ry2 = Math.max(startY, currentY);

      const state = useProjectStore.getState();
      const newSelection = new Set(useUIStore.getState().selectedClipIds);
      
      if (!moveE.shiftKey && !moveE.ctrlKey && !moveE.metaKey) {
        newSelection.clear();
      }

      // We need to approximate clip bounds.
      let trackY = 30; // Ruler
      state.tracks.forEach(t => {
        const tHeight = t.height || 80;
        t.clips.forEach(c => {
          const cx1 = 100 + c.startTime * timelineZoom;
          const cx2 = cx1 + (c.duration - (c.trimIn||0) - (c.trimOut||0)) * timelineZoom;
          const cy1 = trackY;
          const cy2 = trackY + tHeight;
          
          const intersects = !(rx2 < cx1 || rx1 > cx2 || ry2 < cy1 || ry1 > cy2);
          if (intersects) {
            newSelection.add(c.id);
          } else if (!moveE.shiftKey && !moveE.ctrlKey && !moveE.metaKey) {
            newSelection.delete(c.id);
          }
        });
        trackY += tHeight + 12; // Height + padding/margin
      });
      
      useUIStore.setState({ selectedClipIds: newSelection, showClipProperties: newSelection.size > 0 });
    };

    const handleUp = () => {
      setRubberBand({ active: false });
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [clearSelection, setRubberBand, timelineZoom]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
  }, []);

  const totalWidth = duration * timelineZoom + 200;

  // Compute rubber band rect
  const rbStyle = rubberBand.active ? {
    position: 'absolute',
    left: Math.min(rubberBand.startX, rubberBand.endX),
    top: Math.min(rubberBand.startY, rubberBand.endY),
    width: Math.abs(rubberBand.endX - rubberBand.startX),
    height: Math.abs(rubberBand.endY - rubberBand.startY),
    backgroundColor: 'rgba(91, 79, 245, 0.2)',
    border: '1px solid rgba(91, 79, 245, 0.8)',
    pointerEvents: 'none',
    zIndex: 100,
  } : null;

  return (
    <div className="timeline-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <TimelineControls />
      <div
        ref={containerRef}
        className="timeline-tracks-area"
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
        onScroll={() => setScrollUpdate(Date.now())}
        style={{ position: 'relative', overflow: 'auto', flex: 1 }}
      >
        <div style={{ minWidth: totalWidth, position: 'relative', minHeight: '100%' }}>
          {rubberBand.active && <div style={rbStyle} />}
          <TimelineRuler containerRef={containerRef} />
          {tracks.map((track) => (
            <TimelineTrack
              key={track.id}
              config={{
                id: track.id,
                icon: track.icon,
                label: track.label,
                accepts: track.accepts,
              }}
              track={track}
            />
          ))}
          {/* Playhead */}
          <div
            className="playhead"
            style={{ left: 100 + currentTime * timelineZoom }}
            onMouseDown={handlePlayheadDrag}
          />
        </div>
        <KeyframeTimeline />
      </div>
      <div className="timeline-minimap-container">
        <TimelineMiniMap containerRef={containerRef} />
      </div>
    </div>
  );
}
