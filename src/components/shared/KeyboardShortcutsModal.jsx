import React from 'react';
import useUIStore from '../../stores/useUIStore';

export default function KeyboardShortcutsModal() {
  const setShowShortcutsModal = useUIStore(s => s.setShowShortcutsModal);

  const categories = [
    {
      title: "Timeline Navigation",
      shortcuts: [
        { keys: ["Space"], label: "Play / Pause" },
        { keys: ["Home"], label: "Jump to start (00:00:00)" },
        { keys: ["End"], label: "Jump to end of last clip" },
        { keys: ["←", "→"], label: "Nudge playhead" },
        { keys: ["Shift", "←/→"], label: "Jump 1 second" },
        { keys: ["J", "K", "L"], label: "Shuttle Controls" },
        { keys: ["F"], label: "Zoom to fit all clips" },
        { keys: ["Shift", "F"], label: "Zoom to selection" },
        { keys: ["[", "]"], label: "Jump to clip boundary" },
      ]
    },
    {
      title: "Clip Operations",
      shortcuts: [
        { keys: ["S"], label: "Split clip at playhead" },
        { keys: ["Delete"], label: "Delete selected clip" },
        { keys: ["Shift", "Del"], label: "Ripple delete" },
        { keys: ["Ctrl", "C"], label: "Copy selected clips" },
        { keys: ["Ctrl", "X"], label: "Cut selected clips" },
        { keys: ["Ctrl", "V"], label: "Paste clips at playhead" },
        { keys: ["Ctrl", "D"], label: "Duplicate clips" },
        { keys: ["M"], label: "Mute/unmute selected clip" },
        { keys: ["T"], label: "Add text clip" },
        { keys: ["Esc"], label: "Clear selection" },
      ]
    },
    {
      title: "Workflow & UI",
      shortcuts: [
        { keys: ["Ctrl", "Z"], label: "Undo" },
        { keys: ["Ctrl", "Shift", "Z"], label: "Redo" },
        { keys: ["Ctrl", "E"], label: "Open effects panel" },
        { keys: ["G"], label: "Toggle timeline snap" },
        { keys: ["R"], label: "Toggle ripple edit mode" },
        { keys: ["B"], label: "Toggle beat sync" },
        { keys: ["I", "O"], label: "Set Loop In / Out points" },
        { keys: ["\\"], label: "Toggle playback loop" },
      ]
    }
  ];

  return (
    <div className="modal-overlay" onClick={() => setShowShortcutsModal(false)}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: '800px', maxWidth: '90vw' }}
      >
        <div style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
            Keyboard Shortcuts
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
            {categories.map((category, idx) => (
              <div key={idx}>
                <h4 style={{ color: 'var(--color-accent-primary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, fontWeight: 700 }}>
                  {category.title}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {category.shortcuts.map((s, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{s.label}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {s.keys.map((k, j) => (
                          <React.Fragment key={j}>
                            <span className="shortcut-key">{k}</span>
                            {j < s.keys.length - 1 && <span style={{ fontSize: 10, color: 'var(--color-text-muted)', alignSelf: 'center' }}>+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, textAlign: 'right', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <button className="btn-primary" onClick={() => setShowShortcutsModal(false)}>Got it</button>
          </div>
        </div>
      </div>
    </div>
  );
}
