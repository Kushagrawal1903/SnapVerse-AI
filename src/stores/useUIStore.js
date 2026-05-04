import { create } from 'zustand';

const useUIStore = create((set) => ({
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
}));

export default useUIStore;
