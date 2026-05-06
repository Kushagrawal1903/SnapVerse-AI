import React, { useState, useRef, useEffect } from 'react';

import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import { EXPORT_PRESETS } from '../../utils/constants';
import { exportVideo, downloadBlob, loadFFmpeg } from '../../services/exportService';
import { CanvasEngine } from '../../services/canvasEngine';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { showToast } from '../../stores/useToastStore';

export default function ExportView() {

  const [platform, setPlatform] = useState('instagram');
  const [quality, setQuality] = useState('Standard');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState('');
  const cancelledRef = useRef(false);

  const preset = EXPORT_PRESETS[platform] || EXPORT_PRESETS['instagram'];
  const duration = useProjectStore(s => s.duration);

  const estimateTime = () => {
    const base = duration * (quality === 'High' ? 3 : quality === 'Standard' ? 2 : 1);
    if (base < 60) return `~${Math.ceil(base)}s`;
    return `~${Math.ceil(base / 60)}min`;
  };

  const estimateSize = () => {
    const mbPerSec = quality === 'High' ? 2.5 : quality === 'Standard' ? 1.2 : 0.5;
    const mb = duration * mbPerSec;
    return mb > 1024 ? `${(mb/1024).toFixed(1)} GB` : `~${mb.toFixed(1)} MB`;
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
    if (isExporting) {
      cancelledRef.current = true;
      setIsExporting(false);
      setProgress(0);
      setStage('');
    } else {
      window.history.back();
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-body-md text-on-surface">
      {/* LEFT: Preview */}
      <div className="flex-1 flex flex-col bg-surface-container border-r border-outline-variant">
        {/* Top bar over preview */}
        <div className="h-14 flex items-center justify-between px-4 bg-surface border-b border-outline-variant">
          <button onClick={handleCancel} className="flex items-center text-on-surface hover:text-primary transition-colors text-sm font-medium">
            <span className="material-symbols-outlined mr-1" style={{ fontSize: 20 }}>arrow_back</span>
            Back to Editor
          </button>
          <div className="flex gap-2">
            <button className="p-1 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>fullscreen</span>
            </button>
          </div>
        </div>

        {/* Video Player Mockup */}
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-outline-variant/30 m-8 rounded-lg text-outline-variant flex-col gap-4">
             <span className="material-symbols-outlined text-[64px]">movie</span>
             <p className="font-mono-label">Video Preview Area</p>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-surface-container-lowest/20 backdrop-blur-md flex items-center justify-center border border-surface-container-lowest/30">
              <span className="material-symbols-outlined text-surface-container-lowest text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            </div>
          </div>
          
          <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4">
            <button className="text-surface-container-lowest hover:text-primary-fixed-dim transition-colors">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            </button>
            <div className="flex-1 h-1 bg-surface-container-lowest/30 rounded-full relative cursor-pointer group">
              <div className="absolute h-full w-[45%] bg-primary rounded-full"></div>
              <div className="absolute top-1/2 -translate-y-1/2 left-[45%] w-3 h-3 bg-surface-container-lowest rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"></div>
            </div>
            <span className="font-mono-label text-surface-container-lowest">00:00 / {formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Settings Panel */}
      <div className="w-full md:w-[360px] bg-surface-container-lowest flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10">
          <h2 className="font-h2 text-xl font-semibold text-on-surface">Export Settings</h2>
          <button onClick={handleCancel} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-6">
          
          {/* Format Selection (using Platform for now to match logic) */}
          <div className="space-y-2">
            <label className="font-label-sm text-on-surface-variant">Platform Profile</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(EXPORT_PRESETS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setPlatform(key)}
                  className={`py-2 px-3 border rounded-lg text-center transition-colors font-body-md ${platform === key ? 'border-primary bg-primary-fixed/20 text-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container-low'}`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label-sm text-on-surface-variant">Resolution</label>
            <div className="relative">
              <select className="w-full appearance-none bg-surface-container-low border border-outline-variant text-on-surface font-body-md rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all pointer-events-none opacity-70">
                <option value="preset">{preset.width}x{preset.height}</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label-sm text-on-surface-variant">Quality</label>
            <div className="flex gap-2">
              {['Draft', 'Standard', 'High'].map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`flex-1 py-1 px-2 border rounded text-center transition-colors font-body-md ${quality === q ? 'border-primary border-2 bg-primary-fixed/20 text-primary' : 'border-outline-variant border text-on-surface hover:bg-surface-container-low'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-outline-variant/50 my-2"></div>

          <div className="flex items-start justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">auto_awesome</span>
                <span className="font-body-md font-medium text-on-surface">AI Smart Upscaling</span>
              </div>
              <span className="font-label-sm text-on-surface-variant max-w-[200px] text-xs">Enhance details and reduce noise. Adds processing time.</span>
            </div>
            <div className="w-10 h-6 bg-surface-variant rounded-full relative cursor-pointer shadow-inner shrink-0 mt-1 opacity-50">
              <div className="w-4 h-4 bg-surface-container-lowest rounded-full absolute left-1 top-1 shadow-sm transition-transform"></div>
            </div>
          </div>

          {/* Export Progress UI overlay inline */}
          {isExporting && (
             <div className="mt-4 p-4 border border-primary/30 bg-primary/5 rounded-lg flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-primary">{stage}</span>
                  <span className="font-mono-label text-primary">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }}></div>
                </div>
                {error && <div className="text-error text-xs">{error}</div>}
             </div>
          )}

          {exportResult && !isExporting && (
             <div className="mt-4 p-4 border border-secondary/30 bg-secondary/5 rounded-lg flex flex-col items-center justify-center gap-2 text-center text-secondary">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
                <span className="font-semibold text-sm">Export Complete!</span>
                <span className="font-label-sm opacity-80">{exportResult.fileName} ({exportResult.size} MB)</span>
             </div>
          )}

        </div>

        {/* Footer / Actions */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex flex-col gap-4 sticky bottom-0">
          <div className="flex justify-between items-center bg-surface-container-low p-2 rounded border border-outline-variant/50">
            <div className="flex flex-col">
              <span className="font-mono-label text-[10px] text-on-surface-variant uppercase">Est. Size</span>
              <span className="font-body-md font-semibold text-on-surface">{estimateSize()}</span>
            </div>
            <div className="h-8 w-px bg-outline-variant"></div>
            <div className="flex flex-col text-right">
              <span className="font-mono-label text-[10px] text-on-surface-variant uppercase">Duration</span>
              <span className="font-body-md text-on-surface">{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            {isExporting ? (
              <button onClick={handleCancel} className="flex-1 py-2 px-4 bg-error text-on-error font-body-md font-medium rounded-lg hover:bg-error/90 transition-colors flex items-center justify-center gap-2 shadow-sm">
                Cancel
              </button>
            ) : exportResult ? (
              <button onClick={() => setExportResult(null)} className="flex-[2] py-2 px-4 bg-primary text-on-primary font-body-md font-medium rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center gap-2 shadow-sm">
                Export Another
              </button>
            ) : (
              <>
                <button className="flex-1 py-2 px-4 border border-primary text-primary font-body-md font-medium rounded-lg hover:bg-primary-fixed/10 transition-colors flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                  <span className="material-symbols-outlined text-[18px]">share</span> Share
                </button>
                <button onClick={handleExport} className="flex-[2] py-2 px-4 bg-primary text-on-primary font-body-md font-medium rounded-lg hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">download</span> Export
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
