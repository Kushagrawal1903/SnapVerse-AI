import React, { useState, useRef, useEffect } from 'react';
import useUIStore from '../../stores/useUIStore';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import { EXPORT_PRESETS } from '../../utils/constants';
import { exportVideo, downloadBlob, loadFFmpeg } from '../../services/exportService';
import { CanvasEngine } from '../../services/canvasEngine';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { showToast } from '../../stores/useToastStore';

export default function ExportModal() {
  const setShowExportModal = useUIStore(s => s.setShowExportModal);
  const [step, setStep] = useState(1); // 1: Platform, 2: Quality, 3: Export
  const [platform, setPlatform] = useState(() => {
    // Remember last platform (Step 23)
    return localStorage.getItem('snapverse_lastPlatform') || 'instagram';
  });
  const [quality, setQuality] = useState('Standard');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState('');
  const cancelledRef = useRef(false);

  const preset = EXPORT_PRESETS[platform];
  const duration = useProjectStore(s => s.duration);

  // Save last platform choice
  useEffect(() => {
    localStorage.setItem('snapverse_lastPlatform', platform);
  }, [platform]);

  const estimateTime = () => {
    const base = duration * (quality === 'High' ? 3 : quality === 'Standard' ? 2 : 1);
    if (base < 60) return `~${Math.ceil(base)}s`;
    return `~${Math.ceil(base / 60)}min`;
  };

  const resolveMediaSource = (media) => media?.objectUrl || media?.fileUrl || null;

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setError('');
    setExportResult(null);
    cancelledRef.current = false;

    try {
      setStage('Loading encoder...');
      setProgress(5);
      await loadFFmpeg();
      if (cancelledRef.current) return;

      setStage('Preparing canvas...');
      setProgress(10);
      const state = useProjectStore.getState();
      if (!state?.tracks?.length || !state.tracks.some(t => t.clips?.length > 0)) {
        throw new Error('Add clips to the timeline before exporting.');
      }
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = preset.width;
      renderCanvas.height = preset.height;
      const engine = new CanvasEngine(renderCanvas);
      let registeredVisualMedia = 0;

      for (const track of state.tracks) {
        for (const clip of track.clips) {
          if (!clip.mediaId) continue;
          const media = state.mediaItems.find(m => m.id === clip.mediaId);
          const mediaSrc = resolveMediaSource(media);
          if (!mediaSrc) continue;

          if (media.type === 'video') {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = mediaSrc;
            video.muted = true;
            video.preload = 'auto';
            video.playsInline = true;
            await new Promise((resolve) => {
              video.oncanplay = resolve;
              video.onerror = resolve;
              video.load();
              setTimeout(resolve, 3000);
            });
            engine.registerMedia(media.id, video);
            registeredVisualMedia += 1;
          } else if (media.type === 'photo') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = mediaSrc;
            await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
            engine.registerMedia(media.id, img);
            registeredVisualMedia += 1;
          }
        }
      }

      if (registeredVisualMedia === 0) {
        throw new Error('No renderable media found. Re-add media and try export again.');
      }

      if (cancelledRef.current) return;

      setStage('Rendering frames...');
      const onRenderProgress = (frameProgress) => setProgress(10 + frameProgress * 60);
      const onEncodeProgress = (encodeProgress) => {
        setStage('Encoding video...');
        setProgress(70 + encodeProgress * 25);
      };

      const blob = await exportVideo(
        renderCanvas, engine, state.tracks, state.aspectRatio, state.duration,
        preset.fps, quality, onRenderProgress, onEncodeProgress, cancelledRef
      );

      if (cancelledRef.current || !blob) return;

      setStage('Downloading...');
      setProgress(98);
      const projectName = state.projectName || 'snapverse_export';
      const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${platform}.mp4`;
      downloadBlob(blob, fileName);

      if (isSupabaseConfigured()) {
        const user = useAuthStore.getState().user;
        const projectId = state.projectId;
        if (user && user.id !== 'local' && projectId) {
          try {
            await supabase.from('exports').insert({
              project_id: projectId, user_id: user.id, platform: preset.label,
              quality, format: 'mp4', file_size: blob.size, duration: state.duration, status: 'complete',
            });
          } catch {}
        }
      }

      setProgress(100);
      setStage('Complete!');
      setExportResult({ size: (blob.size / (1024 * 1024)).toFixed(1), fileName });
      setIsExporting(false);
      showToast('Export complete! File downloaded.', 'success', 4000);
      engine.destroy();
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.message || 'Export failed');
      setIsExporting(false);
      showToast('Export failed — check console for details', 'error', 4000);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setIsExporting(false);
    setProgress(0);
    setStage('');
  };

  const platformEmojis = { instagram: '📸', tiktok: '🎵', youtube: '📺' };

  return (
    <div className="modal-overlay" onClick={() => !isExporting && setShowExportModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ padding: '24px 28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                Export Reel
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                {!isExporting && `Step ${step} of 3`}
              </p>
            </div>
            {!isExporting && (
              <button onClick={() => setShowExportModal(false)} style={{
                background: 'none', border: 'none', color: 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: 18, padding: 4,
              }}>×</button>
            )}
          </div>

          {/* Step indicators */}
          {!isExporting && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: s <= step ? 'var(--color-accent-primary)' : 'var(--color-border)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
          )}

          {/* Export progress view */}
          {isExporting ? (
            <div className="animate-fade-in">
              {/* Stage steps */}
              <div style={{ marginBottom: 20 }}>
                {['Loading encoder', 'Rendering frames', 'Encoding video', 'Complete'].map((label, i) => {
                  const stageIndex = progress < 10 ? 0 : progress < 70 ? 1 : progress < 95 ? 2 : 3;
                  const isDone = i < stageIndex;
                  const isCurrent = i === stageIndex;
                  return (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                      color: isDone ? 'var(--color-accent-secondary)' : isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      fontSize: 12, fontWeight: isCurrent ? 600 : 400,
                    }}>
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : isCurrent ? (
                        <div style={{ width: 14, height: 14, border: '2px solid var(--color-accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      ) : (
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--color-border)' }} />
                      )}
                      {label}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 6 }}>
                <div className="export-progress-bar">
                  <div className="export-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{stage}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{Math.round(progress)}%</span>
                </div>
              </div>

              {progress >= 100 && exportResult ? (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, fontFamily: 'var(--font-display)' }}>Export Complete!</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                    {exportResult.fileName} · {exportResult.size} MB
                  </div>
                  <button className="btn-export" onClick={() => setShowExportModal(false)} style={{ width: '100%', justifyContent: 'center' }}>
                    Done
                  </button>
                </div>
              ) : (
                <button className="btn-ghost" onClick={handleCancel} style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Step 1: Platform */}
              {step === 1 && (
                <div className="animate-fade-in">
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>Choose platform</div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                    {Object.entries(EXPORT_PRESETS).map(([key, val]) => (
                      <button
                        key={key}
                        className="card"
                        onClick={() => setPlatform(key)}
                        style={{
                          flex: 1, padding: '20px 12px', textAlign: 'center', cursor: 'pointer',
                          border: platform === key ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                          background: platform === key ? 'rgba(91,79,245,0.04)' : 'white',
                          transition: 'all 0.15s', borderRadius: 12,
                        }}
                      >
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{platformEmojis[key]}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{val.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {val.width}×{val.height} · {val.fps}fps
                        </div>
                      </button>
                    ))}
                  </div>
                  <button className="btn-export" onClick={() => setStep(2)} style={{ width: '100%', justifyContent: 'center', padding: '12px 0' }}>
                    Next →
                  </button>
                </div>
              )}

              {/* Step 2: Quality */}
              {step === 2 && (
                <div className="animate-fade-in">
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>Select quality</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    {[
                      { id: 'Draft', label: 'Draft', desc: 'Fast rendering, lower quality', crf: 28 },
                      { id: 'Standard', label: 'Standard', desc: 'Balanced quality & speed', crf: 23 },
                      { id: 'High', label: 'High', desc: 'Best quality, slower', crf: 18 },
                    ].map(q => (
                      <button
                        key={q.id}
                        onClick={() => setQuality(q.id)}
                        style={{
                          padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                          border: quality === q.id ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                          background: quality === q.id ? 'rgba(91,79,245,0.04)' : 'white',
                          borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{q.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{q.desc}</div>
                        </div>
                        {quality === q.id && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                    <button className="btn-export" onClick={() => setStep(3)} style={{ flex: 2, justifyContent: 'center' }}>Next →</button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm & Export */}
              {step === 3 && (
                <div className="animate-fade-in">
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>Ready to export</div>

                  {/* Summary card */}
                  <div style={{
                    background: 'var(--color-bg-surface)', borderRadius: 10,
                    padding: 16, marginBottom: 20,
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Platform</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{platformEmojis[platform]} {preset.label}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Resolution</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{preset.width}×{preset.height}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quality</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{quality}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Est. Time</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{estimateTime()}</div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 8,
                      background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                      fontSize: 12, marginBottom: 16,
                    }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" onClick={() => setStep(2)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                    <button className="btn-export" onClick={handleExport} style={{ flex: 2, justifyContent: 'center', padding: '12px 0', fontSize: 14 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Export to {preset.label}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
