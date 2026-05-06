import React, { useState, useCallback, useRef } from 'react';
import MediaLibrary from '../media/MediaLibrary';
import CanvasPreview from '../canvas/CanvasPreview';
import RightPanel from './RightPanel';
import useProjectStore from '../../stores/useProjectStore';

const MIN_LEFT = 200;
const MAX_LEFT = 400;
const MIN_RIGHT = 220;
const MAX_RIGHT = 480;

function PanelResizer({ onDragStart }) {
  return (
    <div
      onMouseDown={onDragStart}
      className="panel-resizer-v"
    />
  );
}

export default function EditorLayout() {
  const mediaItems = useProjectStore(s => s.mediaItems);
  const tracks = useProjectStore(s => s.tracks);
  const clipCount = tracks.reduce((sum, t) => sum + t.clips.length, 0);
  const isEmpty = mediaItems.length === 0 && clipCount === 0;

  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(300);
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

  const handleRightDragStart = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = rightWidth;

    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const delta = startX - e.clientX; // inverted: dragging left increases width
      const newWidth = Math.max(MIN_RIGHT, Math.min(MAX_RIGHT, startWidth + delta));
      setRightWidth(newWidth);
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
  }, [rightWidth]);

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
        {isEmpty ? <EmptyState /> : <CanvasPreview />}
      </div>

      {/* RIGHT RESIZER */}
      <PanelResizer onDragStart={handleRightDragStart} />

      {/* RIGHT PANEL — Properties / AI */}
      <div style={{
        width: rightWidth,
        minWidth: MIN_RIGHT,
        maxWidth: MAX_RIGHT,
        flexShrink: 0,
        background: 'var(--color-ai-bg)',
        borderLeft: '1px solid var(--color-ai-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <RightPanel />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-10 select-none w-full">
      <div
        className="w-[80%] max-w-[340px] px-8 py-12 border-2 border-dashed border-outline-variant rounded-2xl text-center bg-surface hover:bg-surface-container-lowest hover:border-primary transition-all duration-300 cursor-pointer group"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          const uploadZone = document.querySelector('[data-upload-zone]');
          if (uploadZone) uploadZone.dispatchEvent(new Event('triggerUpload'));
        }}
        onClick={() => {
          const input = document.querySelector('input[type="file"][data-media-input]');
          if (input) input.click();
        }}
      >
        <div className="mb-5 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[32px]">upload_file</span>
          </div>
        </div>
        <div className="font-display font-bold text-xl text-on-surface mb-2">
          Drop clips to begin
        </div>
        <div className="text-sm text-on-surface-variant leading-relaxed mb-6">
          Import video, audio, or images to start building your sequence.
        </div>
        <button className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-sm font-semibold hover:bg-surface-tint transition-colors flex items-center justify-center gap-2 mx-auto shadow-sm pointer-events-none">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Browse Files
        </button>
        <div className="mt-6 flex justify-center gap-4 text-[11px] text-outline uppercase font-mono-label">
          <span>MP4</span>
          <span>MOV</span>
          <span>MP3</span>
          <span>JPG</span>
        </div>
      </div>
    </div>
  );
}
