import { useEffect, useRef } from 'react';
import useProjectStore from '../stores/useProjectStore';
import useUIStore from '../stores/useUIStore';
import { saveProject } from '../services/storageService';

const AUTO_SAVE_DELAY = 10000; // 10 seconds of changes

export default function useAutoSave() {
  const tracks = useProjectStore(s => s.tracks);
  const mediaItems = useProjectStore(s => s.mediaItems);
  const projectName = useProjectStore(s => s.projectName);
  const aspectRatio = useProjectStore(s => s.aspectRatio);
  const saveState = useProjectStore(s => s.saveState);
  const timerRef = useRef(null);
  const lastSavedRef = useRef(null);

  useEffect(() => {
    // Skip if already saved or currently saving
    if (saveState !== 'unsaved') return;

    // Debounce auto-save
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      const performSave = async () => {
        try {
          // Set saving state
          useUIStore.setState({ saveStatus: 'saving' });
          
          const state = useProjectStore.getState();
          await saveProject({
            projectName: state.projectName,
            aspectRatio: state.aspectRatio,
            tracks: state.tracks,
            mediaItems: state.mediaItems.map(m => ({ ...m, file: undefined, objectUrl: undefined })),
          });

          // Set saved state  
          useProjectStore.setState({ saveState: 'saved', lastSaved: Date.now() });
          useUIStore.setState({ saveStatus: 'saved', lastSavedTime: Date.now() });
          lastSavedRef.current = Date.now();

          // Reset to idle after showing "saved" for 2 seconds
          setTimeout(() => {
            useUIStore.setState({ saveStatus: 'idle' });
          }, 2000);
        } catch (err) {
          console.error('Auto-save failed:', err);
          useProjectStore.setState({ saveState: 'error' });
          useUIStore.setState({ saveStatus: 'idle' });
        }
      };
      performSave();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tracks, mediaItems, projectName, aspectRatio, saveState]);

  // Also save on unmount if unsaved
  useEffect(() => {
    return () => {
      const state = useProjectStore.getState();
      if (state.saveState === 'unsaved') {
        saveProject({
          projectName: state.projectName,
          aspectRatio: state.aspectRatio,
          tracks: state.tracks,
          mediaItems: state.mediaItems.map(m => ({ ...m, file: undefined, objectUrl: undefined })),
        }).catch(console.error);
      }
    };
  }, []);
}
