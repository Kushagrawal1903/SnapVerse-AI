import React, { useRef, useCallback, useEffect, useState } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import TimelineRuler from './TimelineRuler';
import TimelineTrack from './TimelineTrack';
import TimelineControls from './TimelineControls';
import KeyframeTimeline from './KeyframeTimeline';
import TimelineMiniMap from './TimelineMiniMap';

const TRACK_HEADER_WIDTH = 120;

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
  const headerScrollRef = useRef(null);
  
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
    const playheadX = currentTime * timelineZoom;
    const scrollLeft = container.scrollLeft;
    const viewWidth = container.clientWidth;

    if (playheadX > scrollLeft + viewWidth - 80) {
      container.scrollLeft = playheadX - viewWidth / 2;
    }
  }, [currentTime, isPlaying, timelineZoom]);

  // Sync vertical scroll between headers and content
  const syncVerticalScroll = useCallback(() => {
    if (containerRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollTop = containerRef.current.scrollTop;
    }
  }, []);

  // Drag playhead
  const handlePlayheadDrag = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const handleMove = (moveE) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const x = moveE.clientX - rect.left + scrollLeft;
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

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const startY = e.clientY - rect.top + containerRef.current.scrollTop;

    setRubberBand({ active: true, startX, startY, endX: startX, endY: startY });

    const handleMove = (moveE) => {
      if (!containerRef.current) return;
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

      let trackY = 0;
      state.tracks.forEach(t => {
        const tHeight = t.height || 64;
        t.clips.forEach(c => {
          const cx1 = c.startTime * timelineZoom;
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
        trackY += tHeight;
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
  const playheadX = currentTime * timelineZoom;

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
    <div className="timeline-panel">
      <TimelineControls />
      
      {/* Ruler row */}
      <div style={{ display: 'flex', flexShrink: 0, height: 28 }}>
        {/* Track header spacer for ruler */}
        <div style={{
          width: TRACK_HEADER_WIDTH,
          flexShrink: 0,
          background: 'var(--color-bg-primary)',
          borderRight: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Tracks
          </span>
        </div>
        {/* Ruler — scrolls with content */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: totalWidth,
            transform: `translateX(-${containerRef.current?.scrollLeft || 0}px)`,
          }}>
            <TimelineRuler containerRef={containerRef} />
          </div>
        </div>
      </div>
      
      {/* Tracks area: headers (fixed) + clips (scrollable) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Track headers — fixed left, vertical scroll synced */}
        <div
          ref={headerScrollRef}
          style={{
            width: TRACK_HEADER_WIDTH,
            flexShrink: 0,
            overflowY: 'hidden',
            overflowX: 'hidden',
          }}
        >
          {tracks.map((track) => {
            const trackHeight = track.height || 64;
            return (
              <TimelineTrack
                key={track.id}
                config={{
                  id: track.id,
                  icon: track.icon,
                  label: track.label,
                  accepts: track.accepts,
                }}
                track={track}
                renderMode="header"
                trackHeight={trackHeight}
              />
            );
          })}
        </div>

        {/* Clips area — scrolls both axes */}
        <div
          ref={containerRef}
          className="timeline-tracks-area"
          onWheel={handleWheel}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onMouseDown={handleMouseDown}
          onScroll={() => {
            setScrollUpdate(Date.now());
            syncVerticalScroll();
          }}
          style={{ position: 'relative', overflow: 'auto', flex: 1 }}
        >
          <div style={{ minWidth: totalWidth, position: 'relative', minHeight: '100%' }}>
            {rubberBand.active && <div style={rbStyle} />}
            {tracks.map((track) => {
              const trackHeight = track.height || 64;
              return (
                <TimelineTrack
                  key={track.id}
                  config={{
                    id: track.id,
                    icon: track.icon,
                    label: track.label,
                    accepts: track.accepts,
                  }}
                  track={track}
                  renderMode="content"
                  trackHeight={trackHeight}
                />
              );
            })}
            {/* Playhead */}
            <div
              className="playhead"
              style={{ left: playheadX }}
              onMouseDown={handlePlayheadDrag}
            />
          </div>
          <KeyframeTimeline />
        </div>
      </div>

      {/* MiniMap */}
      <div className="timeline-minimap-container">
        <TimelineMiniMap containerRef={containerRef} />
      </div>
    </div>
  );
}
