import React, { useCallback, useState } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import TimelineClip from './TimelineClip';

export default function TimelineTrack({ config, track }) {
  const addClip = useProjectStore(s => s.addClip);
  const closeGap = useProjectStore(s => s.closeGap);
  const timelineZoom = useUIStore(s => s.timelineZoom);
  const openContextMenu = useUIStore(s => s.openContextMenu);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
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
  }, [config, addClip, timelineZoom]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    const data = e.dataTransfer.types.includes('application/snapverse-media');
    if (data) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

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

  return (
    <div className="timeline-track">
      <div className="timeline-track-label">
        <span style={{ fontSize: 14 }}>{config.icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{config.label}</span>
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
        }}
      >
        {gaps.map((g, i) => (
          <div
            key={`gap-${i}`}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
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
              cursor: 'context-menu',
            }}
            title="Right-click to Close Gap"
          />
        ))}
        {track?.clips.map(clip => (
          <TimelineClip key={clip.id} clip={clip} trackId={config.id} />
        ))}
      </div>
    </div>
  );
}
