import { create } from 'zustand';
import { generateId } from '../utils/clipUtils';
import { TRACK_CONFIG } from '../utils/constants';
import { showToast } from './useToastStore';

const MAX_HISTORY = 50;

function createEmptyTracks() {
  return TRACK_CONFIG.map(t => ({ id: t.id, label: t.label, icon: t.icon, accepts: t.accepts, clips: [], muted: false, solo: false, volume: 100, locked: false, height: 80, isCustom: false }));
}

function snapshot(state) {
  return JSON.parse(JSON.stringify({ tracks: state.tracks, mediaItems: state.mediaItems, projectName: state.projectName, aspectRatio: state.aspectRatio }));
}

const useProjectStore = create((set, get) => ({
  // Project meta
  projectId: null,
  projectName: 'Untitled Project',
  aspectRatio: '9:16',
  
  // Media library
  mediaItems: [],
  
  // Tracks
  tracks: createEmptyTracks(),
  
  // Playback
  currentTime: 0,
  isPlaying: false,
  duration: 30,
  volume: 1,
  isMuted: false,
  shuttleSpeed: 1,
  loopIn: null,
  loopOut: null,
  isLooping: false,
  
  // Save state
  saveState: 'saved', // 'saved' | 'saving' | 'unsaved' | 'error'
  lastSaved: null,
  
  // History (with action names)
  history: [],
  historyIndex: -1,
  lastActionName: null,

  // === ACTIONS ===
  
  setProjectName: (name) => {
    set({ projectName: name, saveState: 'unsaved' });
  },
  setAspectRatio: (ratio) => set({ aspectRatio: ratio, saveState: 'unsaved' }),
  
  // Playback
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setVolume: (v) => set({ volume: v }),
  toggleMute: () => set(s => ({ isMuted: !s.isMuted })),
  setShuttleSpeed: (speed) => set({ shuttleSpeed: speed }),
  setLoopIn: (time) => set({ loopIn: time }),
  setLoopOut: (time) => set({ loopOut: time }),
  toggleLoop: () => set(s => ({ isLooping: !s.isLooping })),
  clearLoop: () => set({ loopIn: null, loopOut: null, isLooping: false }),
  seekBy: (delta) => set(s => ({ currentTime: Math.max(0, Math.min(s.currentTime + delta, s.duration)) })),
  seek: (time) => set({ currentTime: Math.max(0, time) }),
  
  // History (with action names)
  pushHistory: (actionName = '') => {
    const state = get();
    const snap = snapshot(state);
    snap._actionName = actionName || state.lastActionName || '';
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(snap);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1, lastActionName: null, saveState: 'unsaved' });
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const current = history[historyIndex];
    const prev = history[historyIndex - 1];
    const actionName = current._actionName || 'last change';
    set({ ...prev, history, historyIndex: historyIndex - 1, saveState: 'unsaved' });
    showToast(`Undone: ${actionName}`, 'info', 2000);
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    const actionName = next._actionName || 'change';
    set({ ...next, history, historyIndex: historyIndex + 1, saveState: 'unsaved' });
    showToast(`Redone: ${actionName}`, 'info', 2000);
  },

  // Media
  addMedia: (media) => {
    const mediaItem = { ...media, id: media.id || generateId() };
    set(s => ({ mediaItems: [...s.mediaItems, mediaItem] }));

    // Auto-add first clip to timeline if timeline is empty
    const state = get();
    const allClips = state.tracks.reduce((sum, t) => sum + t.clips.length, 0);
    if (allClips === 0) {
      const trackMap = { video: 'video1', photo: 'photo', audio: 'audio1' };
      const trackId = trackMap[mediaItem.type];
      if (trackId) {
        const newClipId = get().addClip(trackId, {
          mediaId: mediaItem.id,
          name: mediaItem.name,
          type: mediaItem.type,
          startTime: 0,
          duration: mediaItem.duration || 5,
        });
        showToast('Clip added to timeline — press Space to preview', 'info', 3000);
        // Auto-play for 1.5s then pause
        setTimeout(() => {
          get().play();
          setTimeout(() => get().pause(), 1500);
        }, 300);
      }
    }
  },
  
  removeMedia: (id) => {
    set(s => ({ mediaItems: s.mediaItems.filter(m => m.id !== id) }));
  },

  // Tracks
  updateTrack: (trackId, updates) => {
    get().pushHistory('Update track');
    set(s => ({
      tracks: s.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t)
    }));
  },
  
  addTrack: (type) => {
    get().pushHistory('Add track');
    const newTrack = {
      id: generateId(),
      label: `Custom ${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      icon: type === 'video' ? '🎬' : type === 'audio' ? '🎵' : '📝',
      accepts: [type],
      clips: [],
      muted: false,
      solo: false,
      volume: 100,
      locked: false,
      height: 80,
      isCustom: true
    };
    set(s => ({ tracks: [...s.tracks, newTrack] }));
  },

  deleteTrack: (trackId) => {
    get().pushHistory('Delete track');
    set(s => ({ tracks: s.tracks.filter(t => t.id !== trackId || !t.isCustom) }));
  },

  reorderTracks: (startIndex, endIndex) => {
    get().pushHistory('Reorder tracks');
    set(s => {
      const newTracks = Array.from(s.tracks);
      const [removed] = newTracks.splice(startIndex, 1);
      newTracks.splice(endIndex, 0, removed);
      return { tracks: newTracks };
    });
  },

  // Clips
  addClip: (trackId, clip) => {
    set(s => ({ lastActionName: `Add ${clip.type || 'clip'}` }));
    get().pushHistory(`Add ${clip.type || 'clip'}`);
    const newClip = {
      id: generateId(),
      mediaId: clip.mediaId || null,
      name: clip.name || 'Untitled',
      type: clip.type,
      startTime: clip.startTime || 0,
      duration: clip.duration || 5,
      trimIn: 0,
      trimOut: 0,
      filter: 'none',
      adjustments: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, vignette: 0, grain: 0, blur: 0 },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 100 },
      crop: { x: 0, y: 0, width: 1, height: 1 },
      chromaKey: { enabled: false, color: [0, 255, 0], threshold: 40, feather: 20 },
      volume: clip.type === 'audio' ? 80 : 100, // Smart default: audio at 80%
      fadeIn: 0,
      fadeOut: 0,
      speed: 1,
      // Text props (smart defaults)
      text: clip.text || '',
      font: clip.font || 'DM Sans',
      fontSize: clip.fontSize || 36,
      fontColor: clip.fontColor || '#ffffff',
      textAlign: clip.textAlign || 'center',
      textBg: clip.textBg || 'none',
      entrance: clip.entrance || 'None',
      exit: clip.exit || 'None',
      // Transitions
      transitionType: clip.transitionType || 'None',
      transitionDuration: clip.transitionDuration || 0.5,
      ...clip,
      id: generateId(),
      _isNew: true, // flag for animation
    };
    set(s => ({
      tracks: s.tracks.map(t =>
        t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
      ),
      saveState: 'unsaved',
    }));
    get().recalcDuration();
    // Clear the _isNew flag after animation
    setTimeout(() => {
      set(s => ({
        tracks: s.tracks.map(t => ({
          ...t,
          clips: t.clips.map(c => c.id === newClip.id ? { ...c, _isNew: false } : c)
        }))
      }));
    }, 300);
    return newClip.id;
  },

  removeClip: (trackId, clipId, ripple = false) => {
    get().pushHistory('Delete clip');
    set(s => ({
      tracks: s.tracks.map(t => {
        if (t.id !== trackId) return t;
        const clipToDelete = t.clips.find(c => c.id === clipId);
        let newClips = t.clips.filter(c => c.id !== clipId);
        if (ripple && clipToDelete) {
          const effectiveDuration = clipToDelete.duration - (clipToDelete.trimIn || 0) - (clipToDelete.trimOut || 0);
          newClips = newClips.map(c => c.startTime >= clipToDelete.startTime ? { ...c, startTime: Math.max(0, c.startTime - effectiveDuration) } : c);
        }
        return { ...t, clips: newClips };
      }),
      saveState: 'unsaved',
    }));
    get().recalcDuration();
    showToast('Clip deleted', 'info', 2000);
  },

  updateClip: (trackId, clipId, updates) => {
    set(s => ({
      tracks: s.tracks.map(t =>
        t.id === trackId
          ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c) }
          : t
      ),
      saveState: 'unsaved',
    }));
  },

  updateClips: (updatesMap) => {
    set(s => ({
      tracks: s.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => updatesMap[c.id] ? { ...c, ...updatesMap[c.id] } : c)
      })),
      saveState: 'unsaved',
    }));
  },

  shiftClips: (trackId, afterTime, delta) => {
    set(s => ({
      tracks: s.tracks.map(t =>
        t.id === trackId
          ? { ...t, clips: t.clips.map(c => c.startTime >= afterTime ? { ...c, startTime: Math.max(0, c.startTime + delta) } : c) }
          : t
      )
    }));
    get().recalcDuration();
  },

  deleteClips: (clipIds, ripple = false) => {
    get().pushHistory('Delete clips');
    set(s => ({
      tracks: s.tracks.map(t => {
        let newClips = [...t.clips];
        const toDelete = newClips.filter(c => clipIds.has(c.id));
        if (toDelete.length === 0) return t;

        newClips = newClips.filter(c => !clipIds.has(c.id));
        if (ripple) {
          toDelete.sort((a,b) => b.startTime - a.startTime).forEach(del => {
            const effectiveDuration = del.duration - (del.trimIn || 0) - (del.trimOut || 0);
            newClips = newClips.map(c => c.startTime >= del.startTime ? { ...c, startTime: Math.max(0, c.startTime - effectiveDuration) } : c);
          });
        }
        return { ...t, clips: newClips };
      }),
      saveState: 'unsaved',
    }));
    get().recalcDuration();
    showToast(`${clipIds.size} clip${clipIds.size > 1 ? 's' : ''} deleted`, 'info', 2000);
  },

  duplicateClips: (clipIds) => {
    get().pushHistory('Duplicate clips');
    set(s => {
      const newTracks = s.tracks.map(t => {
        const toDup = t.clips.filter(c => clipIds.has(c.id));
        if (toDup.length === 0) return t;
        
        const maxEnd = Math.max(...toDup.map(c => c.startTime + c.duration - (c.trimIn||0) - (c.trimOut||0)));
        const minStart = Math.min(...toDup.map(c => c.startTime));
        
        const duplicates = toDup.map(c => ({
          ...c,
          id: generateId(),
          startTime: maxEnd + (c.startTime - minStart)
        }));
        
        return { ...t, clips: [...t.clips, ...duplicates] };
      });
      return { tracks: newTracks, saveState: 'unsaved' };
    });
    get().recalcDuration();
    showToast('Clips duplicated', 'success', 1500);
  },

  pasteClips: (clipsToPaste, time) => {
    get().pushHistory('Paste clips');
    set(s => {
      if (!clipsToPaste || clipsToPaste.length === 0) return s;
      const minStart = Math.min(...clipsToPaste.map(c => c.startTime));
      const newClipsByTrack = {};
      clipsToPaste.forEach(c => {
        if (!newClipsByTrack[c.trackId]) newClipsByTrack[c.trackId] = [];
        newClipsByTrack[c.trackId].push({
          ...c,
          id: generateId(),
          startTime: time + (c.startTime - minStart)
        });
      });
      
      const newTracks = s.tracks.map(t => {
        if (newClipsByTrack[t.id]) {
          return { ...t, clips: [...t.clips, ...newClipsByTrack[t.id]] };
        }
        return t;
      });
      return { tracks: newTracks, saveState: 'unsaved' };
    });
    get().recalcDuration();
  },

  closeGap: (trackId, gapStartTime, gapDuration) => {
    get().pushHistory('Close gap');
    get().shiftClips(trackId, gapStartTime + gapDuration - 0.01, -gapDuration);
  },

  closeAllGaps: () => {
    get().pushHistory('Close all gaps');
    set(s => {
      const newTracks = s.tracks.map(t => {
        if (t.clips.length <= 1) return t;
        let sorted = [...t.clips].sort((a,b) => a.startTime - b.startTime);
        let currentEnd = 0;
        const packed = sorted.map(c => {
          const effectiveDur = c.duration - (c.trimIn || 0) - (c.trimOut || 0);
          const placedClip = { ...c, startTime: Math.max(0, currentEnd) };
          currentEnd = placedClip.startTime + effectiveDur;
          return placedClip;
        });
        return { ...t, clips: packed };
      });
      return { tracks: newTracks, saveState: 'unsaved' };
    });
    get().recalcDuration();
  },

  moveClip: (fromTrackId, toTrackId, clipId, newStartTime) => {
    get().pushHistory('Move clip');
    const state = get();
    let clip = null;
    for (const t of state.tracks) {
      const found = t.clips.find(c => c.id === clipId);
      if (found) { clip = { ...found }; break; }
    }
    if (!clip) return;
    clip.startTime = Math.max(0, newStartTime);
    set(s => ({
      tracks: s.tracks.map(t => {
        if (t.id === fromTrackId) return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
        if (t.id === toTrackId) return { ...t, clips: [...t.clips, clip] };
        return t;
      }),
      saveState: 'unsaved',
    }));
    get().recalcDuration();
  },

  splitClip: (trackId, clipId, time) => {
    get().pushHistory('Split clip');
    const state = get();
    const track = state.tracks.find(t => t.id === trackId);
    if (!track) return;
    const clip = track.clips.find(c => c.id === clipId);
    if (!clip) return;
    const splitPoint = time - clip.startTime;
    if (splitPoint <= 0 || splitPoint >= clip.duration) return;
    const clip1 = { ...clip, duration: splitPoint, id: generateId() };
    const clip2 = { ...clip, startTime: time, duration: clip.duration - splitPoint, trimIn: clip.trimIn + splitPoint, id: generateId() };
    set(s => ({
      tracks: s.tracks.map(t =>
        t.id === trackId
          ? { ...t, clips: [...t.clips.filter(c => c.id !== clipId), clip1, clip2] }
          : t
      ),
      saveState: 'unsaved',
    }));
    showToast('Clip split', 'info', 1500);
  },

  recalcDuration: () => {
    const state = get();
    let maxEnd = 5;
    state.tracks.forEach(t => {
      t.clips.forEach(c => {
        const end = c.startTime + c.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });
    set({ duration: maxEnd + 2 });
  },

  // Helper: get all clips
  getAllClips: () => {
    return get().tracks.flatMap(t => t.clips);
  },

  getAllVideoClips: () => {
    return get().tracks.flatMap(t => t.clips.filter(c => c.type === 'video'));
  },

  getClip: (clipId) => {
    for (const t of get().tracks) {
      const c = t.clips.find(c => c.id === clipId);
      if (c) return c;
    }
    return null;
  },

  // Bulk load for persistence
  loadProject: (data) => {
    set({
      projectId: data.projectId || null,
      projectName: data.projectName || 'Untitled Project',
      aspectRatio: data.aspectRatio || '9:16',
      mediaItems: data.mediaItems || [],
      tracks: data.tracks || createEmptyTracks(),
      currentTime: 0,
      isPlaying: false,
      saveState: 'saved',
      lastSaved: Date.now(),
    });
  },

  getProjectSnapshot: () => {
    const s = get();
    return {
      projectName: s.projectName,
      aspectRatio: s.aspectRatio,
      duration: s.duration,
      currentTime: s.currentTime,
      mediaCount: s.mediaItems.length,
      tracks: s.tracks.map(t => ({
        id: t.id,
        label: t.label,
        clipCount: t.clips.length,
        clips: t.clips.map(c => ({
          name: c.name, type: c.type, startTime: c.startTime, duration: c.duration,
          filter: c.filter, text: c.text, volume: c.volume,
        })),
      })),
    };
  },

  autoEnhanceProject: () => {
    get().pushHistory('Auto-enhance project');
    let enhancementsCount = 0;
    
    set(s => {
      const newTracks = s.tracks.map(t => {
        const newClips = t.clips.map((c, i, arr) => {
          let updated = { ...c };
          
          // Audio: normalize volume to 70%
          if (c.type === 'audio' && c.volume === 100) {
            updated.volume = 70;
            enhancementsCount++;
            
            // Fade in first audio clip, fade out last audio clip
            if (i === 0) {
              updated.fadeIn = 1;
              enhancementsCount++;
            }
            if (i === arr.length - 1) {
              updated.fadeOut = 1;
              enhancementsCount++;
            }
          }
          
          // Video: apply cinematic filter if none
          if (c.type === 'video' && c.filter === 'none') {
            updated.filter = 'cinematic';
            enhancementsCount++;
            
            // Apply Fade transition if 'None' or 'Cut'
            if (i > 0 && c.transitionType === 'None') {
              updated.transitionType = 'Fade';
              updated.transitionDuration = 0.5;
              enhancementsCount++;
            }
          }
          
          return updated;
        });
        return { ...t, clips: newClips };
      });
      return { tracks: newTracks, saveState: 'unsaved' };
    });
    
    showToast(`Auto-enhanced: ${enhancementsCount} improvements applied`, 'success', 3000);
    return enhancementsCount;
  },
}));

export default useProjectStore;
