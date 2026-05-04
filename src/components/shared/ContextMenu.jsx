import React, { useEffect, useRef } from 'react';
import useUIStore from '../../stores/useUIStore';

export default function ContextMenu() {
  const contextMenu = useUIStore(s => s.contextMenu);
  const closeContextMenu = useUIStore(s => s.closeContextMenu);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeContextMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeContextMenu]);

  if (!contextMenu) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {contextMenu.items.map((item, i) => (
        <button
          key={i}
          className="context-menu-item"
          onClick={() => { item.action(); closeContextMenu(); }}
          style={{ color: item.danger ? '#e74c3c' : undefined }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
