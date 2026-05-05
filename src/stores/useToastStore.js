import { create } from 'zustand';

let toastIdCounter = 0;

const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: ({ message, type = 'info', duration = 3000, action = null }) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    const toast = { id, message, type, duration, action, createdAt: Date.now(), exiting: false };

    set(s => {
      const updated = [...s.toasts, toast];
      // Keep max 3 visible
      if (updated.length > 3) {
        updated.shift();
      }
      return { toasts: updated };
    });

    // Auto-dismiss (0 = persistent)
    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }

    return id;
  },

  dismissToast: (id) => {
    set(s => ({
      toasts: s.toasts.map(t => t.id === id ? { ...t, exiting: true } : t)
    }));
    // Remove from DOM after exit animation
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 300);
  },

  clearAll: () => set({ toasts: [] }),
}));

// Convenience function for use anywhere
export function showToast(message, type = 'info', duration = 3000, action = null) {
  return useToastStore.getState().addToast({ message, type, duration, action });
}

export default useToastStore;
