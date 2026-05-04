import { create } from 'zustand';
import { generateId } from '../utils/clipUtils';
import { TRACK_CONFIG } from '../utils/constants';

const MAX_HISTORY = 50;

function createEmptyTracks() {
  return TRACK_CONFIG.map(t => ({ id: t.id, label: t.label, icon: t.icon, accepts: t.accepts, clips: [], muted: false, locked: false }));
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
  
  // History
  history: [],
  historyIndex: -1,

  // === ACTIONS ===
  
  setProjectName: (name) => set({ projectName: name }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  
  // Playback
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),
  setVolume: (v) => set({ volume: v }),
  toggleMute: () => set(s => ({ isMuted: !s.isMuted })),
  setShuttleSpeed: (speed) => set({ shuttleSpeed: speed }),
  setLoopIn: (time) => set({ loopIn: time }),
  setLoopOut: (time) => set({ loopOut: time }),
  toggleLoop: () => set(s => ({ isLooping: !s.isLooping })),
  clearLoop: () => set({ loopIn: null, loopOut: null, isLooping: false }),
  seekBy: (delta) => set(s => ({ currentTime: Math.max(0, Math.min(s.currentTime + delta, s.duration)) })),
  
  // History
  pushHistory: () => {
    const state = get();
    const snap = snapshot(state);
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(snap);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({ ...prev, history, historyIndex: historyIndex - 1 });
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({ ...next, history, historyIndex: historyIndex + 1 });
  },

  // Media
  addMedia: (media) => {
    set(s => ({ mediaItems: [...s.mediaItems, { ...media, id: media.id || generateId() }] }));
  },
  
  removeMedia: (id) => {
    set(s => ({ mediaItems: s.mediaItems.filter(m => m.id !== id) }));
  },

  // Clips
  addClip: (trackId, clip) => {
    get().pushHistory();
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
      volume: 100,
      fadeIn: 0,
      fadeOut: 0,
      speed: 1,
      // Text props
      text: clip.text || '',
      font: clip.font || 'DM Sans',
      fontSize: clip.fontSize || 24,
      fontColor: clip.fontColor || '#ffffff',
      textAlign: clip.textAlign || 'center',
      textBg: clip.textBg || 'none',
      entrance: clip.entrance || 'None',
      exit: clip.exit || 'None',
      ...clip,
      id: generateId(),
    };
    set(s => ({
      tracks: s.tracks.map(t =>
        t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
      )
    }));
    get().recalcDuration();
    return newClip.id;
  },

  removeClip: (trackId, clipId, ripple = false) => {
    get().pushHistory();
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
      })
    }));
    get().recalcDuration();
  },

  updateClip: (trackId, clipId, updates) => {
    set(s => ({
      tracks: s.tracks.map(t =>
        t.id === trackId
          ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c) }
          : t
      )
    }));
  },

  updateClips: (updatesMap) => {
    set(s => ({
      tracks: s.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => updatesMap[c.id] ? { ...c, ...updatesMap[c.id] } : c)
      }))
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
    get().pushHistory();
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
      })
    }));
    get().recalcDuration();
  },

  duplicateClips: (clipIds) => {
    get().pushHistory();
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
      return { tracks: newTracks };
    });
    get().recalcDuration();
  },

  pasteClips: (clipsToPaste, time) => {
    get().pushHistory();
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
      return { tracks: newTracks };
    });
    get().recalcDuration();
  },

  closeGap: (trackId, gapStartTime, gapDuration) => {
    get().pushHistory();
    get().shiftClips(trackId, gapStartTime + gapDuration - 0.01, -gapDuration);
  },

  closeAllGaps: () => {
    get().pushHistory();
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
      return { tracks: newTracks };
    });
    get().recalcDuration();
  },

  moveClip: (fromTrackId, toTrackId, clipId, newStartTime) => {
    get().pushHistory();
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
      })
    }));
    get().recalcDuration();
  },

  splitClip: (trackId, clipId, time) => {
    get().pushHistory();
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
      )
    }));
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
}));

export default useProjectStore;
