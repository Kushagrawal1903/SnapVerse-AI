import { useEffect, useRef } from 'react';
import useProjectStore from '../stores/useProjectStore';
import useUIStore from '../stores/useUIStore';

export default function useKeyboardShortcuts() {
  const shuttleState = useRef({ speed: 0 });

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          useProjectStore.getState().togglePlay();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) useProjectStore.getState().seekBy(-1);
          else useProjectStore.getState().seekBy(-1 / 30);
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) useProjectStore.getState().seekBy(1);
          else useProjectStore.getState().seekBy(1 / 30);
          break;

        case 'Home':
          e.preventDefault();
          useProjectStore.getState().setCurrentTime(0);
          break;

        case 'End':
          e.preventDefault();
          useProjectStore.getState().setCurrentTime(
            useProjectStore.getState().duration
          );
          break;

        case 'l':
        case 'L':
          if (!e.ctrlKey && !e.metaKey) {
            const store = useProjectStore.getState();
            if (shuttleState.current.speed <= 0) shuttleState.current.speed = 1;
            else shuttleState.current.speed = Math.min(shuttleState.current.speed * 2, 16);
            store.setShuttleSpeed(shuttleState.current.speed);
            if (!store.isPlaying) store.setIsPlaying(true);
          }
          break;

        case 'j':
        case 'J':
          if (!e.ctrlKey && !e.metaKey) {
            const store = useProjectStore.getState();
            if (shuttleState.current.speed >= 0) shuttleState.current.speed = -1;
            else shuttleState.current.speed = Math.max(shuttleState.current.speed * 2, -16);
            store.setShuttleSpeed(shuttleState.current.speed);
            if (!store.isPlaying) store.setIsPlaying(true);
          }
          break;

        case 'k':
        case 'K':
          if (!e.ctrlKey && !e.metaKey) {
            shuttleState.current.speed = 0;
            useProjectStore.getState().setShuttleSpeed(1);
            useProjectStore.getState().setIsPlaying(false);
          }
          break;

        case 'i':
        case 'I':
          if (e.altKey) useProjectStore.getState().clearLoop();
          else useProjectStore.getState().setLoopIn(useProjectStore.getState().currentTime);
          break;

        case 'o':
        case 'O':
          if (e.altKey) useProjectStore.getState().clearLoop();
          else useProjectStore.getState().setLoopOut(useProjectStore.getState().currentTime);
          break;

        case '\\':
          useProjectStore.getState().toggleLoop();
          break;

        case 's':
        case 'S':
          if (!e.ctrlKey && !e.metaKey) {
            const { selectedClipIds } = useUIStore.getState();
            const { tracks, splitClip, currentTime } = useProjectStore.getState();
            if (selectedClipIds.size > 0) {
              selectedClipIds.forEach(id => {
                const tId = tracks.find(t => t.clips.some(c => c.id === id))?.id;
                if (tId) splitClip(tId, id, currentTime);
              });
            }
          }
          break;

        case 'Delete':
        case 'Backspace':
          {
            const { selectedClipIds, clearSelection, rippleEdit } = useUIStore.getState();
            if (selectedClipIds.size > 0) {
              useProjectStore.getState().deleteClips(selectedClipIds, rippleEdit);
              clearSelection();
            }
          }
          break;
          
        case 'c':
        case 'C':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const { selectedClipIds, setClipboardClips } = useUIStore.getState();
            const { tracks } = useProjectStore.getState();
            if (selectedClipIds.size > 0) {
              const toCopy = [];
              tracks.forEach(t => t.clips.forEach(c => {
                if (selectedClipIds.has(c.id)) toCopy.push({...c, trackId: t.id});
              }));
              setClipboardClips(toCopy);
            }
          }
          break;
          
        case 'v':
        case 'V':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const { clipboardClips } = useUIStore.getState();
            const { currentTime, pasteClips } = useProjectStore.getState();
            if (clipboardClips && clipboardClips.length > 0) {
              pasteClips(clipboardClips, currentTime);
            }
          }
          break;
          
        case 'd':
        case 'D':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const { selectedClipIds } = useUIStore.getState();
            if (selectedClipIds.size > 0) {
              useProjectStore.getState().duplicateClips(selectedClipIds);
            }
          }
          break;

        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              useProjectStore.getState().redo();
            } else {
              useProjectStore.getState().undo();
            }
          }
          break;

        case 'Escape':
          useUIStore.getState().clearSelection();
          useUIStore.getState().setShowFilters(false);
          useUIStore.getState().setShowAdjustments(false);
          break;

        case '?':
          useUIStore.getState().setShowShortcutsModal(true);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
