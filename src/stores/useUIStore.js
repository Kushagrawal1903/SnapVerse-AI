import { create } from 'zustand';

const useUIStore = create((set) => ({
  // Navigation
  currentView: 'editor', // 'editor' | 'analyze' | 'breakdown'
  setCurrentView: (view) => set({ currentView: view }),

  // Selection
  selectedClipIds: new Set(),
  clipboardClips: [],
  selectedMediaId: null,
  
  // Timeline
  timelineZoom: 10, // pixels per second
  timelineScroll: 0,
  snapToGrid: true,
  magneticTimeline: true,
  rippleEdit: false,
  beatSync: false,
  snapGuides: { x: null, y: null, active: false, type: null, value: null },
  
  // Rubber Band Selection
  rubberBand: { active: false, startX: 0, startY: 0, endX: 0, endY: 0 },
  
  // Panels
  activeLeftTab: 'media', // 'media' | 'effects' | 'text' | 'audio'
  showExportModal: false,
  showShortcutsModal: false,
  showApiKeyModal: false,
  showPreviewModal: null, // mediaId or null
  
  // Context menu
  contextMenu: null, // { x, y, items, data }
  
  // Clip editing
  editingTextClipId: null,
  showClipProperties: false,
  showFilters: false,
  showAdjustments: false,
  speedCurveClipId: null,
  canvasMode: 'select', // 'select' | 'crop'
  keyframedProperty: null, // e.g. 'scaleX', 'opacity'
  saveStatus: 'idle', // 'idle' | 'saving' | 'saved'

  // Actions
  selectClip: (clipId, { shift = false, ctrl = false } = {}) => set((s) => {
    const newSelection = new Set(s.selectedClipIds);
    if (!clipId) {
      newSelection.clear();
    } else if (ctrl) {
      if (newSelection.has(clipId)) {
        newSelection.delete(clipId);
      } else {
        newSelection.add(clipId);
      }
    } else if (shift) {
      newSelection.add(clipId);
    } else {
      newSelection.clear();
      newSelection.add(clipId);
    }
    return { selectedClipIds: newSelection, showClipProperties: newSelection.size > 0 };
  }),
  clearSelection: () => set({ selectedClipIds: new Set(), showClipProperties: false }),
  setClipboardClips: (clips) => set({ clipboardClips: clips }),
  
  setRubberBand: (rb) => set((s) => ({ rubberBand: { ...s.rubberBand, ...rb } })),
  
  selectMedia: (id) => set({ selectedMediaId: id }),
  
  setTimelineZoom: (z) => set({ timelineZoom: Math.max(2, Math.min(60, z)) }),
  setTimelineScroll: (s) => set({ timelineScroll: s }),
  toggleSnap: () => set(s => ({ snapToGrid: !s.snapToGrid })),
  toggleMagnetic: () => set(s => ({ magneticTimeline: !s.magneticTimeline })),
  toggleRipple: () => set(s => ({ rippleEdit: !s.rippleEdit })),
  toggleBeatSync: () => set(s => ({ beatSync: !s.beatSync })),
  setSnapGuides: (guides) => set(s => ({ snapGuides: { ...s.snapGuides, ...guides } })),
  
  setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),
  setShowExportModal: (v) => set({ showExportModal: v }),
  setShowShortcutsModal: (v) => set({ showShortcutsModal: v }),
  setShowApiKeyModal: (v) => set({ showApiKeyModal: v }),
  setShowPreviewModal: (id) => set({ showPreviewModal: id }),
  
  openContextMenu: (x, y, items, data) => set({ contextMenu: { x, y, items, data } }),
  closeContextMenu: () => set({ contextMenu: null }),
  
  setEditingTextClipId: (id) => set({ editingTextClipId: id }),
  setShowFilters: (v) => set({ showFilters: v }),
  setShowAdjustments: (v) => set({ showAdjustments: v }),
  setSpeedCurveClipId: (id) => set({ speedCurveClipId: id }),
  setCanvasMode: (mode) => set({ canvasMode: mode }),
  setKeyframedProperty: (prop) => set({ keyframedProperty: prop }),
}));

export default useUIStore;
