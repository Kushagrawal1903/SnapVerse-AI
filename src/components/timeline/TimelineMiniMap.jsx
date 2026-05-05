import React, { useRef, useCallback } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function TimelineMiniMap({ containerRef }) {
  const tracks = useProjectStore(s => s.tracks);
  const duration = useProjectStore(s => s.duration);
  const timelineZoom = useUIStore(s => s.timelineZoom);
  const minimapRef = useRef(null);

  // Hardcode height to 40px
  const height = 40;
  
  // Calculate width proportional to duration
  const viewportWidth = window.innerWidth; 
  // Let's assume the minimap scales to the viewport width.
  // Actually, better to just let it take 100% width and calculate ratios.

  const handleDrag = useCallback((e) => {
    if (e.buttons !== 1 || !containerRef.current || !minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    // Convert percent to scrollLeft
    const totalWidth = duration * timelineZoom + 200;
    const scrollMax = Math.max(0, totalWidth - containerRef.current.clientWidth);
    containerRef.current.scrollLeft = percent * scrollMax;
  }, [containerRef, duration, timelineZoom]);

  const handleMouseDown = useCallback((e) => {
    handleDrag(e);
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', handleDrag);
    }, { once: true });
  }, [handleDrag]);

  // Calculate viewport box position
  let viewLeft = 0;
  let viewWidth = 100;
  
  if (containerRef.current && minimapRef.current) {
    const totalWidth = duration * timelineZoom + 200;
    if (totalWidth > 0) {
      const scrollPercent = containerRef.current.scrollLeft / totalWidth;
      const viewPercent = containerRef.current.clientWidth / totalWidth;
      viewLeft = scrollPercent * 100;
      viewWidth = viewPercent * 100;
    }
  }

  return (
    <div 
      ref={minimapRef}
      onMouseDown={handleMouseDown}
      style={{
        height: `${height}px`,
        width: '100%',
        background: '#0a0a0a',
        borderTop: '1px solid var(--color-border)',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
    >
      {/* Track representations */}
      <div style={{ position: 'absolute', inset: 0, padding: '2px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {tracks.map(t => (
          <div key={t.id} style={{ flex: 1, position: 'relative', background: 'rgba(255,255,255,0.02)' }}>
            {t.clips.map(c => {
              const left = (c.startTime / duration) * 100;
              const width = (c.duration / duration) * 100;
              let color = 'rgba(91, 79, 245, 0.5)';
              if (c.type === 'audio') color = 'rgba(46, 204, 113, 0.5)';
              if (c.type === 'text') color = 'rgba(241, 196, 15, 0.5)';
              if (c.type === 'adjustment') color = 'rgba(155, 89, 182, 0.5)';

              return (
                <div 
                  key={c.id} 
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 0, bottom: 0,
                    background: color,
                    borderRadius: 1
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Viewport Box */}
      <div 
        style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: `${viewLeft}%`,
          width: `${viewWidth}%`,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.4)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
