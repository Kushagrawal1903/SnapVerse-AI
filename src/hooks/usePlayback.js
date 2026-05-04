import { useEffect, useRef } from 'react';
import useProjectStore from '../stores/useProjectStore';
import { AudioPlaybackManager } from '../services/audioEngine';

export default function usePlayback(canvasEngineRef) {
  const animRef = useRef(null);
  const lastTimeRef = useRef(0);
  const audioManagerRef = useRef(null);

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

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);

      // Stop audio
      audioManagerRef.current?.stopAll();

      // Pause all videos
      canvasEngineRef.current?.pauseAllVideos();

      // Render single frame at current time
      if (canvasEngineRef.current) {
        canvasEngineRef.current.renderFrame(currentTime, tracks, aspectRatio);
      }
      return;
    }

    // Start audio playback (only if forward normal speed)
    const store = useProjectStore.getState();
    if (store.shuttleSpeed === 1) {
      audioManagerRef.current?.startPlayback(currentTime, tracks, mediaItems);
    }

    // Start video playback
    canvasEngineRef.current?.playVideos(currentTime, tracks);

    lastTimeRef.current = performance.now();

    const tick = (now) => {
      const state = useProjectStore.getState();
      const delta = ((now - lastTimeRef.current) / 1000) * (state.shuttleSpeed || 1);
      lastTimeRef.current = now;
      let newTime = state.currentTime + delta;
      
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

      setCurrentTime(newTime);
      
      if (canvasEngineRef.current) {
        canvasEngineRef.current.renderFrame(
          newTime,
          state.tracks,
          state.aspectRatio
        );
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);

  // Re-render when currentTime changes manually (seeking)
  useEffect(() => {
    if (!isPlaying && canvasEngineRef.current) {
      canvasEngineRef.current.renderFrame(currentTime, tracks, aspectRatio);
    }
  }, [currentTime, tracks, aspectRatio]);
}
