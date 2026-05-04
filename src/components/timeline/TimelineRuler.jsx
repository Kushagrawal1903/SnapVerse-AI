import React, { useCallback } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function TimelineRuler({ containerRef }) {
  const duration = useProjectStore(s => s.duration);
  const loopIn = useProjectStore(s => s.loopIn);
  const loopOut = useProjectStore(s => s.loopOut);
  const timelineZoom = useUIStore(s => s.timelineZoom);
  const setCurrentTime = useProjectStore(s => s.setCurrentTime);

  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = containerRef?.current?.scrollLeft || 0;
    const x = e.clientX - rect.left - 100;
    const time = Math.max(0, x / timelineZoom);
    setCurrentTime(time);
  }, [timelineZoom, setCurrentTime, containerRef]);

  // Scrub: drag on ruler to seek
  const handleMouseDown = useCallback((e) => {
    handleSeek(e);

    const handleMove = (moveE) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = moveE.clientX - rect.left - 100;
      const time = Math.max(0, Math.min(x / timelineZoom, duration));
      setCurrentTime(time);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [handleSeek, timelineZoom, duration, setCurrentTime]);

  // Generate tick marks
  const ticks = [];
  const interval = timelineZoom >= 20 ? 1 : timelineZoom >= 10 ? 2 : timelineZoom >= 5 ? 5 : 10;
  for (let t = 0; t <= duration; t += interval) {
    const x = 100 + t * timelineZoom;
    ticks.push(
      <div key={t} style={{ position: 'absolute', left: x, top: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 1, height: t % (interval * 5) === 0 ? 14 : 8, background: 'var(--color-border-strong)' }} />
        {t % (interval * 2) === 0 && (
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginTop: 1, userSelect: 'none' }}>
            {Math.floor(t / 60)}:{String(Math.floor(t % 60)).padStart(2, '0')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="timeline-ruler"
      onMouseDown={handleMouseDown}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      {ticks}
      
      {/* Loop Region Overlay */}
      {loopIn !== null && loopOut !== null && loopOut > loopIn && (
        <div style={{
          position: 'absolute',
          left: 100 + loopIn * timelineZoom,
          top: 0,
          width: (loopOut - loopIn) * timelineZoom,
          height: '100%',
          background: 'rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none'
        }} />
      )}
      
      {/* Loop In Marker */}
      {loopIn !== null && (
        <div style={{ position: 'absolute', left: 100 + loopIn * timelineZoom, top: 0, height: '100%', width: 2, background: 'var(--color-success)', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, borderTop: '10px solid var(--color-success)', borderRight: '10px solid transparent' }} />
        </div>
      )}
      
      {/* Loop Out Marker */}
      {loopOut !== null && (
        <div style={{ position: 'absolute', left: 100 + loopOut * timelineZoom - 2, top: 0, height: '100%', width: 2, background: 'var(--color-danger)', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, borderTop: '10px solid var(--color-danger)', borderLeft: '10px solid transparent' }} />
        </div>
      )}
    </div>
  );
}
