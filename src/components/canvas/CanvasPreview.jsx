import React, { useRef, useEffect, useMemo } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import usePlayback from '../../hooks/usePlayback';
import { CanvasEngine } from '../../services/canvasEngine';
import { ASPECT_RATIOS } from '../../utils/constants';
import PlaybackControls from './PlaybackControls';
import CanvasToolbar from './CanvasToolbar';
import CanvasOverlay from './CanvasOverlay';

export default function CanvasPreview() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const aspectRatio = useProjectStore(s => s.aspectRatio);
  const mediaItems = useProjectStore(s => s.mediaItems);
  const tracks = useProjectStore(s => s.tracks);
  const ar = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['9:16'];

  // Initialize engine
  useEffect(() => {
    if (canvasRef.current) {
      engineRef.current = new CanvasEngine(canvasRef.current);
      engineRef.current.setSize(aspectRatio);
    }
    return () => engineRef.current?.destroy();
  }, []);

  // Update canvas size on aspect ratio change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSize(aspectRatio);
    }
  }, [aspectRatio]);

  // Register media elements
  useEffect(() => {
    if (!engineRef.current) return;
    // Create hidden video/img elements for each media item used in tracks
    const usedMediaIds = new Set();
    tracks.forEach(t => t.clips.forEach(c => { if (c.mediaId) usedMediaIds.add(c.mediaId); }));

    usedMediaIds.forEach(mediaId => {
      const media = mediaItems.find(m => m.id === mediaId);
      if (!media || !media.objectUrl) return;

      if (media.type === 'video') {
        const video = document.createElement('video');
        video.src = media.objectUrl;
        video.muted = true;
        video.preload = 'auto';
        video.playsInline = true;
        video.load();
        engineRef.current.registerMedia(mediaId, video);
      } else if (media.type === 'photo') {
        const img = new Image();
        img.src = media.objectUrl;
        img.onload = () => engineRef.current?.registerMedia(mediaId, img);
      }
    });
  }, [tracks, mediaItems]);

  // Playback loop
  usePlayback(engineRef);

  return (
    <>
      <CanvasToolbar />
      <div className="canvas-wrapper" style={{ width: ar.displayW, height: ar.displayH, position: 'relative' }}>
        <canvas
          id="main-preview-canvas"
          ref={canvasRef}
          width={ar.displayW}
          height={ar.displayH}
          style={{ display: 'block', width: '100%', height: '100%', background: '#000' }}
        />
        <CanvasOverlay />
      </div>
      <PlaybackControls />
    </>
  );
}
