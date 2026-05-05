import { useEffect, useRef } from 'react';
import useProjectStore from '../stores/useProjectStore';
import useUIStore from '../stores/useUIStore';
import { AudioPlaybackManager } from '../services/audioEngine';

export default function usePlayback(canvasEngineRef) {
  const animRef = useRef(null);
  const lastTimeRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const audioManagerRef = useRef(null);
  const currentTimeRef = useRef(0); // Holds internal high-precision time (Step 19)

  const isPlaying = useProjectStore(s => s.isPlaying);
  const currentTime = useProjectStore(s => s.currentTime);
  const duration = useProjectStore(s => s.duration);
  const setCurrentTime = useProjectStore(s => s.setCurrentTime);
  const setIsPlaying = useProjectStore(s => s.setIsPlaying);
  const tracks = useProjectStore(s => s.tracks);
  const aspectRatio = useProjectStore(s => s.aspectRatio);
  const mediaItems = useProjectStore(s => s.mediaItems);
  const volume = useProjectStore(s => s.volume);
  const isMuted = useProjectStore(s => s.isMuted);
  
  const hoveredFilter = useUIStore(s => s.hoveredFilter);
  const selectedClipIds = useUIStore(s => s.selectedClipIds);

  // Initialize audio manager
  useEffect(() => {
    audioManagerRef.current = new AudioPlaybackManager();
    return () => {
      audioManagerRef.current?.destroy();
    };
  }, []);

  // Preload audio buffers when media items change
  useEffect(() => {
    if (!audioManagerRef.current) return;
    const audioMedia = mediaItems.filter(m => m.type === 'audio' && m.objectUrl);
    for (const media of audioMedia) {
      audioManagerRef.current.loadAudioBuffer(media.id, media.objectUrl).catch(() => {});
    }

    // Also load video audio (videos have audio tracks too)
    const videoMedia = mediaItems.filter(m => m.type === 'video' && m.objectUrl);
    for (const media of videoMedia) {
      audioManagerRef.current.loadAudioBuffer(media.id, media.objectUrl).catch(() => {});
    }
  }, [mediaItems]);

  // Update master volume
  useEffect(() => {
    audioManagerRef.current?.setMasterVolume(volume, isMuted);
  }, [volume, isMuted]);

  // Sync internal ref when seeking manually
  useEffect(() => {
    if (!isPlaying) {
      currentTimeRef.current = currentTime;
      if (canvasEngineRef.current) {
        canvasEngineRef.current.renderFrame(currentTime, tracks, aspectRatio, hoveredFilter, selectedClipIds);
      }
    }
  }, [currentTime, isPlaying]); // Intentionally omitting tracks/aspectRatio to avoid thrashing, we handle re-render below

  // Immediate re-render for filter hover or track edits while paused
  useEffect(() => {
    if (!isPlaying && canvasEngineRef.current) {
      canvasEngineRef.current.renderFrame(currentTime, tracks, aspectRatio, hoveredFilter, selectedClipIds);
    }
  }, [tracks, aspectRatio, hoveredFilter, selectedClipIds, isPlaying]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);

      // Stop audio
      audioManagerRef.current?.stopAll();

      // Pause all videos
      canvasEngineRef.current?.pauseAllVideos();
      return;
    }

    // Start audio playback (only if forward normal speed)
    const store = useProjectStore.getState();
    if (store.shuttleSpeed === 1) {
      audioManagerRef.current?.startPlayback(currentTimeRef.current, tracks, mediaItems);
    }

    // Start video playback
    canvasEngineRef.current?.playVideos(currentTimeRef.current, tracks);

    lastTimeRef.current = performance.now();
    lastUiUpdateRef.current = performance.now();

    const tick = (now) => {
      const state = useProjectStore.getState();
      const delta = ((now - lastTimeRef.current) / 1000) * (state.shuttleSpeed || 1);
      lastTimeRef.current = now;
      
      let newTime = currentTimeRef.current + delta;
      
      if (state.isLooping && state.loopOut !== null && newTime >= state.loopOut) {
        newTime = state.loopIn !== null ? state.loopIn : 0;
      } else if (state.isLooping && state.loopIn !== null && newTime < state.loopIn && state.shuttleSpeed < 0) {
        newTime = state.loopOut !== null ? state.loopOut : state.duration;
      } else if (newTime >= state.duration) {
        if (state.shuttleSpeed > 0) {
          setIsPlaying(false);
          useProjectStore.getState().setShuttleSpeed(1);
          setCurrentTime(0);
          return;
        }
      } else if (newTime <= 0 && state.shuttleSpeed < 0) {
        setIsPlaying(false);
        useProjectStore.getState().setShuttleSpeed(1);
        setCurrentTime(0);
        return;
      }

      currentTimeRef.current = newTime;
      
      // Step 19: Only dispatch to Zustand ~10fps (every 100ms) to avoid React re-render thrashing
      if (now - lastUiUpdateRef.current > 100) {
        setCurrentTime(newTime);
        lastUiUpdateRef.current = now;
      }
      
      // But render to canvas at 60fps
      if (canvasEngineRef.current) {
        canvasEngineRef.current.renderFrame(
          newTime,
          state.tracks,
          state.aspectRatio,
          useUIStore.getState().hoveredFilter,
          useUIStore.getState().selectedClipIds
        );
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);
}
