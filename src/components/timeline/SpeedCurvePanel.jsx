import React, { useState, useEffect } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function SpeedCurvePanel() {
  const speedCurveClipId = useUIStore(s => s.speedCurveClipId);
  const setSpeedCurveClipId = useUIStore(s => s.setSpeedCurveClipId);
  const tracks = useProjectStore(s => s.tracks);
  const updateClip = useProjectStore(s => s.updateClip);
  
  const [clip, setClip] = useState(null);
  const [trackId, setTrackId] = useState(null);
  
  // Find clip
  useEffect(() => {
    if (!speedCurveClipId) {
      setClip(null);
      return;
    }
    let found = null;
    let tId = null;
    tracks.forEach(t => {
      const c = t.clips.find(c => c.id === speedCurveClipId);
      if (c) {
        found = c;
        tId = t.id;
      }
    });
    setClip(found);
    setTrackId(tId);
  }, [speedCurveClipId, tracks]);

  if (!speedCurveClipId || !clip) return null;

  const keyframes = clip.speedKeyframes || [
    { time: 0, speed: 1 },
    { time: 1, speed: 1 }
  ];

  const handleApplyPreset = (type) => {
    let newKeyframes;
    if (type === 'ease-in') {
      newKeyframes = [
        { time: 0, speed: 0.2 },
        { time: 1, speed: 1, easeIn: [0.5, 0.2] }
      ];
    } else if (type === 'hero') {
      newKeyframes = [
        { time: 0, speed: 1 },
        { time: 0.3, speed: 1 },
        { time: 0.4, speed: 0.2, easeIn: [0.35, 1] },
        { time: 0.6, speed: 0.2 },
        { time: 0.7, speed: 1, easeIn: [0.65, 0.2] },
        { time: 1, speed: 1 }
      ];
    } else {
      newKeyframes = [
        { time: 0, speed: 1 },
        { time: 1, speed: 1 }
      ];
    }
    updateClip(trackId, clip.id, { speedKeyframes: newKeyframes, speed: 1 });
  };

  const handleClear = () => {
    updateClip(trackId, clip.id, { speedKeyframes: null });
  };

  const width = 400;
  const height = 200;
  
  const getX = (t) => t * width;
  const getY = (s) => height - ((s - 0.1) / 3.9) * height; // mapping 0.1x - 4x

  // Generate SVG path
  let pathD = `M ${getX(keyframes[0].time)} ${getY(keyframes[0].speed)}`;
  for (let i = 1; i < keyframes.length; i++) {
    const k1 = keyframes[i - 1];
    const k2 = keyframes[i];
    
    const cp1x = k1.easeOut ? getX(k1.easeOut[0]) : getX(k1.time + (k2.time - k1.time)/3);
    const cp1y = k1.easeOut ? getY(k1.easeOut[1]) : getY(k1.speed);
    const cp2x = k2.easeIn ? getX(k2.easeIn[0]) : getX(k2.time - (k2.time - k1.time)/3);
    const cp2y = k2.easeIn ? getY(k2.easeIn[1]) : getY(k2.speed);
    
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${getX(k2.time)} ${getY(k2.speed)}`;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 12,
        padding: 24, width: 480, boxShadow: 'var(--shadow-elevated)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-text-primary)' }}>Speed Ramp: {clip.name}</h3>
          <button className="btn-icon" onClick={() => setSpeedCurveClipId(null)}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn-secondary" onClick={() => handleApplyPreset('ease-in')}>Ease In</button>
          <button className="btn-secondary" onClick={() => handleApplyPreset('hero')}>Hero Slow-Mo</button>
          <button className="btn-secondary" onClick={handleClear} style={{ marginLeft: 'auto', color: 'var(--color-danger)' }}>Clear Curve</button>
        </div>

        <div style={{ position: 'relative', width: 400, height: 200, background: 'var(--color-bg-secondary)', borderRadius: 8, overflow: 'hidden', margin: '0 auto' }}>
          {/* Grid */}
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', border: '1px solid rgba(255,255,255,0.1)' }} />

          <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
            <path d={pathD} fill="none" stroke="var(--color-accent-primary)" strokeWidth="3" />
            
            {keyframes.map((k, i) => (
              <circle key={i} cx={getX(k.time)} cy={getY(k.speed)} r="5" fill="#fff" stroke="var(--color-accent-primary)" strokeWidth="2" />
            ))}
          </svg>
          
          <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>4x</div>
          <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>0.1x</div>
        </div>
        
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16, textAlign: 'center' }}>
          * Presets only. Full bezier dragging in future updates.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn-primary" onClick={() => setSpeedCurveClipId(null)}>Done</button>
        </div>
      </div>
    </div>
  );
}
