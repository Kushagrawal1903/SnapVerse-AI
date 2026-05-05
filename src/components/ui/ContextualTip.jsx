import React, { useEffect, useState } from 'react';
import useUIStore from '../../stores/useUIStore';

export default function ContextualTip() {
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const isDraggingMedia = useUIStore(s => s.isDraggingMedia);
  const [tip, setTip] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let newTip = null;
    let icon = '💡';

    if (isDraggingMedia) {
      newTip = 'Drop on an empty track to add';
      icon = '🖱️';
    } else if (selectedClipIds.size > 1) {
      newTip = 'Press Del to delete clips, Ctrl+C to copy';
      icon = '⌨️';
    } else if (selectedClipIds.size === 1) {
      newTip = 'Press S to split at playhead, Del to remove';
      icon = '✂️';
    }

    if (newTip) {
      setTip({ text: newTip, icon });
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [selectedClipIds, isDraggingMedia]);

  if (!tip) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 100,
        background: 'rgba(20,20,20,0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 14px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: 14 }}>{tip.icon}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        {tip.text}
      </span>
    </div>
  );
}
