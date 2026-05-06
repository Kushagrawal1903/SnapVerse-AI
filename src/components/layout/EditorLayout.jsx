import React, { useState, useCallback, useRef } from 'react';
import MediaLibrary from '../media/MediaLibrary';
import CanvasPreview from '../canvas/CanvasPreview';
import useProjectStore from '../../stores/useProjectStore';

const MIN_LEFT = 200;
const MAX_LEFT = 400;

function PanelResizer({ onDragStart }) {
  return (
    <div
      onMouseDown={onDragStart}
      className="panel-resizer-v"
    />
  );
}

export default function EditorLayout() {
  const [leftWidth, setLeftWidth] = useState(280);
  const isDragging = useRef(false);

  const handleLeftDragStart = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX;
      const newWidth = Math.max(MIN_LEFT, Math.min(MAX_LEFT, startWidth + delta));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [leftWidth]);

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* LEFT PANEL — Media Library */}
      <div style={{
        width: leftWidth,
        minWidth: MIN_LEFT,
        maxWidth: MAX_LEFT,
        flexShrink: 0,
        background: 'var(--color-bg-primary)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <MediaLibrary />
      </div>

      {/* LEFT RESIZER */}
      <PanelResizer onDragStart={handleLeftDragStart} />

      {/* CENTER — Canvas */}
      <div style={{
        flex: 1,
        minWidth: 0,
        background: 'var(--color-bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        gap: 12,
        padding: 16,
      }}>
        <CanvasPreview />
      </div>
    </div>
  );
}
