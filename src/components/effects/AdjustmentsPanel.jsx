import React from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

const adjustmentControls = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
  { key: 'grain', label: 'Grain', min: 0, max: 100 },
  { key: 'blur', label: 'Blur', min: 0, max: 20 },
];

export default function AdjustmentsPanel() {
  const selectedClipId = useUIStore(s => s.selectedClipId);
  const selectedTrackId = useUIStore(s => s.selectedTrackId);
  const tracks = useProjectStore(s => s.tracks);
  const updateClip = useProjectStore(s => s.updateClip);

  const selectedClip = selectedTrackId && selectedClipId
    ? tracks.find(t => t.id === selectedTrackId)?.clips.find(c => c.id === selectedClipId)
    : null;

  if (!selectedClip) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
        Select a clip to adjust
      </div>
    );
  }

  const adj = selectedClip.adjustments || {};

  return (
    <div className="animate-fade-in" style={{ position: 'absolute', top: 56, right: 16, zIndex: 30 }}>
      <div style={{
        padding: 16,
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-strong)',
        width: 240,
      }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
          Adjustments
        </h4>
        {adjustmentControls.map(ctrl => (
          <div key={ctrl.key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{ctrl.label}</label>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                {adj[ctrl.key] || 0}
              </span>
            </div>
            <input
              type="range"
              className="slider-input"
              min={ctrl.min}
              max={ctrl.max}
              step={ctrl.key === 'blur' ? 0.5 : 1}
              value={adj[ctrl.key] || 0}
              onChange={(e) => {
                const newAdj = { ...adj, [ctrl.key]: parseFloat(e.target.value) };
                updateClip(selectedTrackId, selectedClipId, { adjustments: newAdj });
              }}
            />
          </div>
        ))}
        <button
          className="btn-ghost"
          style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 11 }}
          onClick={() => updateClip(selectedTrackId, selectedClipId, {
            adjustments: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, vignette: 0, grain: 0, blur: 0 }
          })}
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
