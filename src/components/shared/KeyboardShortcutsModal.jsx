import React from 'react';
import useUIStore from '../../stores/useUIStore';

const shortcuts = [
  { keys: ['Space'], desc: 'Play / Pause' },
  { keys: ['←'], desc: 'Rewind 5 seconds' },
  { keys: ['→'], desc: 'Forward 5 seconds' },
  { keys: ['Home'], desc: 'Jump to start' },
  { keys: ['S'], desc: 'Split clip at playhead' },
  { keys: ['Delete'], desc: 'Delete selected clip' },
  { keys: ['Ctrl', 'Z'], desc: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo' },
  { keys: ['Ctrl', 'Scroll'], desc: 'Timeline zoom' },
  { keys: ['Esc'], desc: 'Clear selection' },
  { keys: ['?'], desc: 'Show this help' },
];

export default function KeyboardShortcutsModal() {
  const setShowShortcutsModal = useUIStore(s => s.setShowShortcutsModal);

  return (
    <div className="modal-overlay" onClick={() => setShowShortcutsModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Keyboard Shortcuts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shortcuts.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{s.desc}</span>
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
          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <button className="btn-primary" onClick={() => setShowShortcutsModal(false)}>Got it</button>
          </div>
        </div>
      </div>
    </div>
  );
}
