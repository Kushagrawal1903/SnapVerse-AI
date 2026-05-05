import { useEffect, useRef } from 'react';
import useProjectStore from '../stores/useProjectStore';
import useUIStore from '../stores/useUIStore';

export default function useKeyboardShortcuts() {
  const shuttleState = useRef({ speed: 0 });

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const project = useProjectStore.getState();
      const ui = useUIStore.getState();

      switch (e.key) {
        case ' ':
          e.preventDefault();
          project.togglePlay();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) project.seekBy(-1);
          else project.seekBy(-1 / 30);
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) project.seekBy(1);
          else project.seekBy(1 / 30);
          break;

        case 'Home':
          e.preventDefault();
          project.setCurrentTime(0);
          break;

        case 'End':
          e.preventDefault();
          project.setCurrentTime(project.duration);
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          if (e.shiftKey) {
            // Zoom to selection
            if (ui.selectedClipIds.size > 0) {
              let minStart = Infinity, maxEnd = 0;
              project.tracks.forEach(t => t.clips.forEach(c => {
                if (ui.selectedClipIds.has(c.id)) {
                  minStart = Math.min(minStart, c.startTime);
                  maxEnd = Math.max(maxEnd, c.startTime + c.duration - (c.trimIn||0) - (c.trimOut||0));
                }
              }));
              if (maxEnd > minStart) {
                const availableWidth = window.innerWidth * 0.6; // approx timeline width
                ui.setTimelineZoom(Math.max(2, availableWidth / (maxEnd - minStart)));
                project.setCurrentTime(minStart);
              }
            }
          } else {
            // Zoom to fit
            if (project.duration > 0) {
              const availableWidth = window.innerWidth * 0.6;
              ui.setTimelineZoom(Math.max(2, availableWidth / project.duration));
            }
          }
          break;

        case '[':
          {
            e.preventDefault();
            // Jump to previous clip boundary
            let prevBoundary = 0;
            project.tracks.forEach(t => t.clips.forEach(c => {
              const end = c.startTime + c.duration - (c.trimIn||0) - (c.trimOut||0);
              if (c.startTime < project.currentTime - 0.05 && c.startTime > prevBoundary) prevBoundary = c.startTime;
              if (end < project.currentTime - 0.05 && end > prevBoundary) prevBoundary = end;
            }));
            project.setCurrentTime(prevBoundary);
          }
          break;

        case ']':
          {
            e.preventDefault();
            // Jump to next clip boundary
            let nextBoundary = project.duration;
            project.tracks.forEach(t => t.clips.forEach(c => {
              const end = c.startTime + c.duration - (c.trimIn||0) - (c.trimOut||0);
              if (c.startTime > project.currentTime + 0.05 && c.startTime < nextBoundary) nextBoundary = c.startTime;
              if (end > project.currentTime + 0.05 && end < nextBoundary) nextBoundary = end;
            }));
            project.setCurrentTime(nextBoundary);
          }
          break;

        case 'l':
        case 'L':
          if (!e.ctrlKey && !e.metaKey) {
            if (shuttleState.current.speed <= 0) shuttleState.current.speed = 1;
            else shuttleState.current.speed = Math.min(shuttleState.current.speed * 2, 16);
            project.setShuttleSpeed(shuttleState.current.speed);
            if (!project.isPlaying) project.setIsPlaying(true);
          }
          break;

        case 'j':
        case 'J':
          if (!e.ctrlKey && !e.metaKey) {
            if (shuttleState.current.speed >= 0) shuttleState.current.speed = -1;
            else shuttleState.current.speed = Math.max(shuttleState.current.speed * 2, -16);
            project.setShuttleSpeed(shuttleState.current.speed);
            if (!project.isPlaying) project.setIsPlaying(true);
          }
          break;

        case 'k':
        case 'K':
          if (!e.ctrlKey && !e.metaKey) {
            shuttleState.current.speed = 0;
            project.setShuttleSpeed(1);
            project.setIsPlaying(false);
          }
          break;

        case 'i':
        case 'I':
          if (e.altKey) project.clearLoop();
          else project.setLoopIn(project.currentTime);
          break;

        case 'o':
        case 'O':
          if (e.altKey) project.clearLoop();
          else project.setLoopOut(project.currentTime);
          break;

        case '\\':
          project.toggleLoop();
          break;

        case 's':
        case 'S':
          if (!e.ctrlKey && !e.metaKey) {
            if (ui.selectedClipIds.size > 0) {
              ui.selectedClipIds.forEach(id => {
                const tId = project.tracks.find(t => t.clips.some(c => c.id === id))?.id;
                if (tId) project.splitClip(tId, id, project.currentTime);
              });
            }
          }
          break;

        case 'Delete':
        case 'Backspace':
          {
            if (ui.selectedClipIds.size > 0) {
              // Shift+Delete -> force ripple delete
              const isRipple = e.shiftKey || ui.rippleEdit;
              project.deleteClips(ui.selectedClipIds, isRipple);
              ui.clearSelection();
            }
          }
          break;
          
        case 'x':
        case 'X':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (ui.selectedClipIds.size > 0) {
              const toCopy = [];
              project.tracks.forEach(t => t.clips.forEach(c => {
                if (ui.selectedClipIds.has(c.id)) toCopy.push({...c, trackId: t.id});
              }));
              ui.setClipboardClips(toCopy);
              project.deleteClips(ui.selectedClipIds, ui.rippleEdit);
              ui.clearSelection();
            }
          }
          break;

        case 'c':
        case 'C':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (ui.selectedClipIds.size > 0) {
              const toCopy = [];
              project.tracks.forEach(t => t.clips.forEach(c => {
                if (ui.selectedClipIds.has(c.id)) toCopy.push({...c, trackId: t.id});
              }));
              ui.setClipboardClips(toCopy);
            }
          } else {
            ui.setCanvasMode(ui.canvasMode === 'crop' ? 'select' : 'crop');
          }
          break;
          
        case 'v':
        case 'V':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (ui.clipboardClips && ui.clipboardClips.length > 0) {
              project.pasteClips(ui.clipboardClips, project.currentTime);
            }
          }
          break;
          
        case 'd':
        case 'D':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (ui.selectedClipIds.size > 0) {
              project.duplicateClips(ui.selectedClipIds);
            }
          }
          break;

        case 'm':
        case 'M':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (ui.selectedClipIds.size > 0) {
              project.tracks.forEach(t => t.clips.forEach(c => {
                if (ui.selectedClipIds.has(c.id) && (c.type === 'video' || c.type === 'audio')) {
                  project.updateClip(t.id, c.id, { volume: c.volume > 0 ? 0 : 100 });
                }
              }));
            }
          }
          break;

        case 't':
        case 'T':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const textTrack = project.tracks.find(t => t.accepts.includes('text'));
            if (textTrack) {
              const id = project.addClip(textTrack.id, {
                type: 'text', text: 'New Text', startTime: project.currentTime, duration: 5
              });
              ui.selectClip(id);
              ui.setEditingTextClipId(id);
            }
          }
          break;

        case 'g':
        case 'G':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            ui.toggleSnap();
          }
          break;

        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            ui.toggleRipple();
          }
          break;

        case 'b':
        case 'B':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            ui.toggleBeatSync();
          }
          break;

        case 'e':
        case 'E':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (ui.selectedClipIds.size > 0) {
              ui.setShowClipProperties(true);
              ui.setActiveLeftTab('effects'); // assuming an effects tab exists or just show properties
            }
          }
          break;

        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              project.redo();
            } else {
              project.undo();
            }
          }
          break;

        case 'Escape':
          ui.clearSelection();
          ui.setShowFilters(false);
          ui.setShowAdjustments(false);
          break;

        case '?':
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            ui.setShowShortcutsModal(true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
