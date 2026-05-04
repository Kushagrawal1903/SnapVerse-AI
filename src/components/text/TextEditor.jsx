import React from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import { TEXT_PRESETS, FONTS, TEXT_ANIMATIONS } from '../../utils/constants';

export default function TextEditor() {
  const selectedClipId = useUIStore(s => s.selectedClipId);
  const selectedTrackId = useUIStore(s => s.selectedTrackId);
  const tracks = useProjectStore(s => s.tracks);
  const updateClip = useProjectStore(s => s.updateClip);

  const clip = selectedTrackId && selectedClipId
    ? tracks.find(t => t.id === selectedTrackId)?.clips.find(c => c.id === selectedClipId && c.type === 'text')
    : null;

  if (!clip) return null;

  const update = (key, value) => updateClip(selectedTrackId, selectedClipId, { [key]: value });

  return (
    <div className="animate-slide-up" style={{
      position: 'absolute', bottom: 232, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-strong)', padding: 16, width: 320, zIndex: 30,
    }}>
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Text Editor</h4>

      {/* Text content */}
      <textarea
        value={clip.text}
        onChange={(e) => update('text', e.target.value)}
        className="input-field"
        rows={2}
        style={{ marginBottom: 10, resize: 'none', fontSize: 13 }}
      />

      {/* Presets */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {TEXT_PRESETS.map(p => (
          <button
            key={p.id}
            className="pill-tab"
            style={{ fontSize: 10 }}
            onClick={() => updateClip(selectedTrackId, selectedClipId, {
              font: p.font, fontSize: p.size, fontColor: p.color, textBg: p.bg, textAlign: p.align, bold: p.bold,
            })}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Font */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, marginBottom: 8 }}>
        <select
          className="input-field"
          value={clip.font}
          onChange={(e) => update('font', e.target.value)}
          style={{ fontSize: 12, height: 34 }}
        >
          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <input
          type="number"
          className="input-field"
          value={clip.fontSize}
          onChange={(e) => update('fontSize', parseInt(e.target.value) || 24)}
          style={{ fontSize: 12, height: 34 }}
          min={8}
          max={120}
        />
      </div>

      {/* Color + Align */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          <label style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Color</label>
          <input type="color" value={clip.fontColor} onChange={(e) => update('fontColor', e.target.value)} style={{ width: 28, height: 28, border: 'none', cursor: 'pointer' }} />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {['left', 'center', 'right'].map(a => (
            <button
              key={a}
              className={`btn-icon ${clip.textAlign === a ? 'active' : ''}`}
              onClick={() => update('textAlign', a)}
              style={{ width: 28, height: 28, fontSize: 10 }}
            >
              {a === 'left' ? '⬅' : a === 'right' ? '➡' : '⬌'}
            </button>
          ))}
        </div>
      </div>

      {/* Animations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Entrance</label>
          <select className="input-field" value={clip.entrance} onChange={(e) => update('entrance', e.target.value)} style={{ fontSize: 11, height: 30 }}>
            {TEXT_ANIMATIONS.entrance.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Exit</label>
          <select className="input-field" value={clip.exit} onChange={(e) => update('exit', e.target.value)} style={{ fontSize: 11, height: 30 }}>
            {TEXT_ANIMATIONS.exit.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
