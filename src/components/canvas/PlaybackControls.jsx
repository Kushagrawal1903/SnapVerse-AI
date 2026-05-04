import React from 'react';
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
        title={isPlaying ? 'Pause' : 'Play'}
        style={{ width: 36, height: 36, background: 'var(--color-accent-primary)', color: 'white', borderRadius: '50%' }}
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
  );
}
