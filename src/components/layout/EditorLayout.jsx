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
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: 40, userSelect: 'none',
    }}>
      <div
        style={{
          width: '80%', maxWidth: 340, padding: '48px 32px',
          border: '2px dashed var(--color-border-strong)',
          borderRadius: 16, textAlign: 'center',
          animation: 'uploadPulse 2.5s ease-in-out infinite',
          background: 'rgba(91,79,245,0.02)',
        }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          const uploadZone = document.querySelector('[data-upload-zone]');
          if (uploadZone) uploadZone.dispatchEvent(new Event('triggerUpload'));
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
          color: 'var(--color-text-primary)', marginBottom: 6,
        }}>
          Drop your clips here to start
        </div>
        <div style={{
          fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6,
          marginBottom: 24,
        }}>
          Import videos, photos, and audio to begin editing your reel
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            const input = document.querySelector('input[type="file"][data-media-input]');
            if (input) input.click();
          }}
          style={{
            padding: '10px 28px', fontSize: 14, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Browse Files
        </button>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>MP4, MOV, WebM, JPG, PNG, MP3, WAV</span>
        </div>
      </div>
    </div>
  );
}
