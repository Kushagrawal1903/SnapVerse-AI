import { useEffect, useRef } from 'react';
import useProjectStore from '../stores/useProjectStore';
import useAuthStore from '../stores/useAuthStore';
import useUIStore from '../stores/useUIStore';
import { saveProject } from '../services/storageService';
import { isSupabaseConfigured } from '../lib/supabase';

export default function useAutoSave() {
  const timerRef = useRef(null);
  const lastSavedRef = useRef('');

  const tracks = useProjectStore(s => s.tracks);
  const projectName = useProjectStore(s => s.projectName);
  const aspectRatio = useProjectStore(s => s.aspectRatio);
  const mediaItems = useProjectStore(s => s.mediaItems);
  const projectId = useProjectStore(s => s.projectId);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    // Generate a snapshot hash to detect meaningful changes
    const clipCount = tracks.reduce((sum, t) => sum + t.clips.length, 0);
    const snapshot = `${projectName}|${aspectRatio}|${clipCount}|${tracks.map(t => t.clips.map(c => `${c.id}:${c.startTime}:${c.duration}`).join(',')).join('|')}`;

    if (snapshot === lastSavedRef.current) return;

    // Debounce save
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Don't save if nothing on the timeline
      if (clipCount === 0 && mediaItems.length === 0) return;

      useUIStore.setState({ saveStatus: 'saving' });

      try {
        await saveProject({
          projectId,
          projectName,
          aspectRatio,
          tracks,
          mediaItems: mediaItems.map(m => ({
            id: m.id,
            name: m.name,
            type: m.type,
            duration: m.duration,
            thumbnail: m.thumbnail,
            fileUrl: m.fileUrl,
            size: m.size,
          })),
          duration: useProjectStore.getState().duration,
        });

        lastSavedRef.current = snapshot;
        useUIStore.setState({ saveStatus: 'saved' });
        setTimeout(() => useUIStore.setState({ saveStatus: 'idle' }), 2000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        useUIStore.setState({ saveStatus: 'idle' });
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tracks, projectName, aspectRatio, mediaItems, projectId, isAuthenticated]);
}
