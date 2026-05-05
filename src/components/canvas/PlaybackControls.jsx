import React, { useState, useRef, useCallback } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import { formatTimecode } from '../../utils/timeFormat';

export default function PlaybackControls() {
  const isPlaying = useProjectStore(s => s.isPlaying);
  const togglePlay = useProjectStore(s => s.togglePlay);
  const currentTime = useProjectStore(s => s.currentTime);
  const duration = useProjectStore(s => s.duration);
  const setCurrentTime = useProjectStore(s => s.setCurrentTime);
  const volume = useProjectStore(s => s.volume);
  const setVolume = useProjectStore(s => s.setVolume);
  const isMuted = useProjectStore(s => s.isMuted);
  const toggleMute = useProjectStore(s => s.toggleMute);
  const shuttleSpeed = useProjectStore(s => s.shuttleSpeed);
  const isLooping = useProjectStore(s => s.isLooping);
  const toggleLoop = useProjectStore(s => s.toggleLoop);

  const formatSpeed = (speed) => {
    if (speed === 1) return '';
    if (speed > 0 && speed < 1) return '½×';
    if (speed < 0) return `${Math.abs(speed)}×↓`;
    return `${speed}×`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Wide progress bar scrubber */}
      <WideProgressBar 
        currentTime={currentTime}
        duration={duration}
        onSeek={setCurrentTime}
      />

      {/* Controls row */}
      <div className="playback-bar">
        {/* To start */}
        <button className="btn-icon" onClick={() => setCurrentTime(0)} title="To Start">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>

        {/* Rewind 5s */}
        <button className="btn-icon" onClick={() => setCurrentTime(currentTime - 5)} title="Rewind 5s">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
        </button>

        {/* Play/Pause */}
        <button
          className="btn-icon"
          onClick={togglePlay}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          style={{
            width: 36, height: 36, background: 'var(--color-accent-primary)', color: 'white', borderRadius: '50%',
            animation: isPlaying ? 'none' : 'none',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        {/* Forward 5s */}
        <button className="btn-icon" onClick={() => setCurrentTime(currentTime + 5)} title="Forward 5s">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
        </button>

        {/* Shuttle Speed */}
        {shuttleSpeed !== 1 && (
          <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--color-accent-primary)', marginLeft: 8, width: 24 }}>
            {formatSpeed(shuttleSpeed)}
          </span>
        )}

        {/* Loop Toggle */}
        <button 
          className={`btn-icon ${isLooping ? 'active' : ''}`} 
          onClick={toggleLoop} 
          title="Toggle Loop (\)"
          style={{ color: isLooping ? 'var(--color-accent-primary)' : 'inherit' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
        </button>

        {/* Timecode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          <span className="timecode">{formatTimecode(currentTime)}</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>/</span>
          <span className="timecode" style={{ opacity: 0.6 }}>{formatTimecode(duration)}</span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Volume */}
        <button className="btn-icon" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted || volume === 0 ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          )}
        </button>
        <input
          type="range"
          className="slider-input"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ width: 60 }}
        />
      </div>
    </div>
  );
}

// Wide Progress Bar Scrubber (Step 8)
function WideProgressBar({ currentTime, duration, onSeek }) {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPos, setHoverPos] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);
  const barRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getTimeFromEvent = useCallback((e) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }, [duration]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const t = getTimeFromEvent(e);
    onSeek(t);

    const handleMove = (moveE) => {
      const t2 = getTimeFromEvent(moveE);
      onSeek(t2);
    };
    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleMouseMove = (e) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setHoverPos(x);
    setHoverTime((x / rect.width) * duration);
  };

  return (
    <div
      ref={barRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      style={{
        width: '100%',
        height: isHovering || isDragging ? 10 : 6,
        background: 'var(--color-bg-secondary)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'height 0.15s ease',
        flexShrink: 0,
      }}
    >
      {/* Filled progress */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${progress}%`,
        background: 'var(--color-accent-primary)',
        transition: isDragging ? 'none' : 'width 0.05s linear',
        borderRadius: '0 2px 2px 0',
      }} />

      {/* Playhead dot */}
      <div style={{
        position: 'absolute',
        left: `${progress}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: isHovering || isDragging ? 12 : 8,
        height: isHovering || isDragging ? 12 : 8,
        background: '#fff',
        borderRadius: '50%',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        border: '2px solid var(--color-accent-primary)',
        transition: 'width 0.15s, height 0.15s',
        zIndex: 2,
      }} />

      {/* Hover time tooltip */}
      {isHovering && (
        <div style={{
          position: 'absolute',
          left: hoverPos,
          bottom: '100%',
          marginBottom: 4,
          transform: 'translateX(-50%)',
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.85)',
          borderRadius: 4,
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: '#fff',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          {hoverTime.toFixed(1)}s
        </div>
      )}
    </div>
  );
}
