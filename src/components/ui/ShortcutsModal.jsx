import React from 'react';
import useUIStore from '../../stores/useUIStore';

export default function ShortcutsModal() {
  const showShortcutsModal = useUIStore(s => s.showShortcutsModal);
  const setShowShortcutsModal = useUIStore(s => s.setShowShortcutsModal);

  if (!showShortcutsModal) return null;

  const categories = [
    {
      title: "Timeline Navigation",
      shortcuts: [
        { key: "Space", label: "Play / Pause" },
        { key: "Home", label: "Jump to start (00:00:00)" },
        { key: "End", label: "Jump to end of last clip" },
        { key: "← / →", label: "Nudge playhead" },
        { key: "Shift + ←/→", label: "Jump 1 second" },
        { key: "J / K / L", label: "Shuttle Controls (Rev/Pause/Fwd)" },
        { key: "F", label: "Zoom to fit all clips" },
        { key: "Shift + F", label: "Zoom to selection" },
        { key: "[ / ]", label: "Jump to prev/next clip boundary" },
      ]
    },
    {
      title: "Clip Operations",
      shortcuts: [
        { key: "S", label: "Split clip at playhead" },
        { key: "Delete", label: "Delete selected clip" },
        { key: "Shift + Del", label: "Ripple delete and close gap" },
        { key: "Ctrl + C", label: "Copy selected clips" },
        { key: "Ctrl + X", label: "Cut selected clips" },
        { key: "Ctrl + V", label: "Paste clips at playhead" },
        { key: "Ctrl + D", label: "Duplicate selected clips" },
        { key: "M", label: "Mute/unmute selected clip" },
        { key: "T", label: "Add text clip at playhead" },
        { key: "Esc", label: "Clear selection" },
      ]
    },
    {
      title: "Workflow & UI",
      shortcuts: [
        { key: "Ctrl + Z", label: "Undo" },
        { key: "Ctrl + Shift + Z", label: "Redo" },
        { key: "Ctrl + E", label: "Open effects panel for clip" },
        { key: "G", label: "Toggle timeline snap" },
        { key: "R", label: "Toggle ripple edit mode" },
        { key: "B", label: "Toggle beat sync" },
        { key: "I / O", label: "Set Loop In / Out points" },
        { key: "\\", label: "Toggle playback loop" },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowShortcutsModal(false)}>
      <div 
        className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl p-8 max-w-4xl w-full mx-4"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fade-in 0.2s ease-out' }}
      >
        <div className="flex justify-between items-center mb-8 border-b border-[#333] pb-4">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            Keyboard Shortcuts
          </h2>
          <button 
            onClick={() => setShowShortcutsModal(false)}
            className="text-[#888] hover:text-white transition-colors p-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((category, idx) => (
            <div key={idx}>
              <h3 className="text-[#888] font-semibold mb-4 tracking-wider uppercase text-xs">
                {category.title}
              </h3>
              <div className="space-y-3">
                {category.shortcuts.map((shortcut, sIdx) => (
                  <div key={sIdx} className="flex justify-between items-center">
                    <span className="text-[#ccc] text-sm">{shortcut.label}</span>
                    <span className="bg-[#2a2a2a] border border-[#444] rounded px-2 py-1 text-xs text-white font-mono shadow-sm">
                      {shortcut.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
