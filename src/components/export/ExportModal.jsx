import React, { useState, useRef } from 'react';
import useUIStore from '../../stores/useUIStore';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import { EXPORT_PRESETS } from '../../utils/constants';
import { exportVideo, downloadBlob, loadFFmpeg } from '../../services/exportService';
import { CanvasEngine } from '../../services/canvasEngine';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function ExportModal() {
  const setShowExportModal = useUIStore(s => s.setShowExportModal);
  const [platform, setPlatform] = useState('instagram');
  const [quality, setQuality] = useState('Standard');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState('');
  const cancelledRef = useRef(false);

  const preset = EXPORT_PRESETS[platform];

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setError('');
    setExportResult(null);
    cancelledRef.current = false;

    try {
      // Step 1: Load FFmpeg.wasm
      setStage('Loading encoder...');
      setProgress(5);
      await loadFFmpeg();

      if (cancelledRef.current) return;

      // Step 2: Set up render canvas
      setStage('Preparing canvas...');
      setProgress(10);

      const state = useProjectStore.getState();
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = preset.width;
      renderCanvas.height = preset.height;
      const engine = new CanvasEngine(renderCanvas);

      // Register media elements
      for (const track of state.tracks) {
        for (const clip of track.clips) {
          if (!clip.mediaId) continue;
          const media = state.mediaItems.find(m => m.id === clip.mediaId);
          if (!media?.objectUrl) continue;

          if (media.type === 'video') {
            const video = document.createElement('video');
            video.src = media.objectUrl;
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
          } else if (media.type === 'photo') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = media.objectUrl;
            await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
            engine.registerMedia(media.id, img);
          }
        }
      }

      if (cancelledRef.current) return;

      // Step 3: Render frames
      setStage('Rendering frames...');
      const fps = preset.fps;
      const duration = state.duration;
      const totalFrames = Math.ceil(duration * fps);

      const onRenderProgress = (frameProgress) => {
        setProgress(10 + frameProgress * 60); // 10-70%
      };

      const onEncodeProgress = (encodeProgress) => {
        setStage('Encoding video...');
        setProgress(70 + encodeProgress * 25); // 70-95%
      };

      // Render frame by frame and export
      const blob = await exportVideo(
        renderCanvas,
        engine,
        state.tracks,
        state.aspectRatio,
        duration,
        fps,
        quality,
        onRenderProgress,
        onEncodeProgress,
        cancelledRef
      );

      if (cancelledRef.current || !blob) return;

      // Step 4: Download
      setStage('Downloading...');
      setProgress(98);
      const projectName = state.projectName || 'snapverse_export';
      const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${platform}.mp4`;
      downloadBlob(blob, fileName);

      // Save export record to Supabase
      if (isSupabaseConfigured()) {
        const user = useAuthStore.getState().user;
        const projectId = state.projectId;
        if (user && user.id !== 'local' && projectId) {
          try {
            await supabase.from('exports').insert({
              project_id: projectId,
              user_id: user.id,
              platform: preset.label,
              quality,
              format: 'mp4',
              file_size: blob.size,
              duration: duration,
              status: 'complete',
            });
          } catch {}
        }
      }

      setProgress(100);
      setStage('Complete!');
      setExportResult({
        size: (blob.size / (1024 * 1024)).toFixed(1),
        fileName,
      });

      engine.destroy();
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.message || 'Export failed');
      setIsExporting(false);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setIsExporting(false);
    setProgress(0);
    setStage('');
  };

  return (
    <div className="modal-overlay" onClick={() => !isExporting && setShowExportModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            Export Reel
          </h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Render your project using FFmpeg.wasm — entirely in your browser.
          </p>

          {/* Platform presets */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {Object.entries(EXPORT_PRESETS).map(([key, val]) => (
              <button
                key={key}
                className="card"
                onClick={() => !isExporting && setPlatform(key)}
                style={{
                  flex: 1, padding: '14px 12px', textAlign: 'center', cursor: 'pointer',
                  border: platform === key ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                  background: platform === key ? 'rgba(91,79,245,0.04)' : 'white',
                  transition: 'all 0.15s', opacity: isExporting ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>
                  {key === 'instagram' ? '📸' : key === 'tiktok' ? '🎵' : '📺'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{val.label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {val.width}×{val.height}
                </div>
              </button>
            ))}
          </div>

          {/* Quality selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Quality</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Draft', 'Standard', 'High'].map(q => (
                <button
                  key={q}
                  className={`pill-tab ${quality === q ? 'active' : ''}`}
                  onClick={() => !isExporting && setQuality(q)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Settings summary */}
          <div style={{
            background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-default)',
            padding: 14, marginBottom: 20,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Resolution</label>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{preset.width}×{preset.height}</span>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Frame Rate</label>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{preset.fps} fps</span>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Quality</label>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{quality} (CRF {quality === 'High' ? '18' : quality === 'Standard' ? '23' : '28'})</span>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Format</label>
                <span style={{ fontSize: 13, fontWeight: 500 }}>MP4 (H.264)</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-default)',
              background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
              fontSize: 12, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Export progress */}
          {isExporting ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{stage}</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{Math.round(progress)}%</span>
              </div>
              <div className="export-progress-bar">
                <div className="export-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              {progress >= 100 && exportResult ? (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Export Complete!</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    {exportResult.fileName} · {exportResult.size} MB
                  </div>
                  <button className="btn-export" onClick={() => setShowExportModal(false)}>
                    Done
                  </button>
                </div>
              ) : (
                <button className="btn-ghost" onClick={handleCancel} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setShowExportModal(false)} style={{ flex: 1, justifyContent: 'center' }}>
                Cancel
              </button>
              <button className="btn-export" onClick={handleExport} style={{ flex: 2, justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export to {preset.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
