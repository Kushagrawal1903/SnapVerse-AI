import React, { useState, useRef, useCallback } from 'react';
import EditorLayout from './EditorLayout';
import RightPanel from './RightPanel';
import TimelinePanel from '../timeline/TimelinePanel';
import FiltersPanel from '../effects/FiltersPanel';
import AdjustmentsPanel from '../effects/AdjustmentsPanel';
import TextEditor from '../text/TextEditor';
import AudioControls from '../audio/AudioControls';
import SpeedCurvePanel from '../timeline/SpeedCurvePanel';
import useUIStore from '../../stores/useUIStore';
import useProjectStore from '../../stores/useProjectStore';

const HANDLE_HEIGHT = 7;
const MIN_TOP = 300;
const MIN_TIMELINE = 200;

export default function AppLayout() {
  const [topHeight, setTopHeight] = useState(null); // null = use CSS default
  const mainColumnRef = useRef(null);
  const isDragging = useRef(false);
  const rafRef = useRef(null);

  const showFilters = useUIStore(s => s.showFilters);
  const showAdjustments = useUIStore(s => s.showAdjustments);
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const tracks = useProjectStore(s => s.tracks);

  // Get selected clip for floating panels
  let selectedClip = null;
  if (selectedClipIds.size === 1) {
    const id = Array.from(selectedClipIds)[0];
    tracks.forEach(t => t.clips.forEach(c => {
      if (c.id === id) selectedClip = c;
    }));
  }

  const handleVerticalDragStart = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;

    const container = mainColumnRef.current;
    if (!container) return;

    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const totalAvailable = rect.height - HANDLE_HEIGHT;
        const newTopHeight = e.clientY - rect.top;
        const clampedTop = Math.max(MIN_TOP, Math.min(newTopHeight, totalAvailable - MIN_TIMELINE));
        setTopHeight(clampedTop);
      });
    };

    const onMouseUp = () => {
      isDragging.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Calculate heights — no topbar subtraction since topbar is external
  const topSectionStyle = topHeight
    ? { height: topHeight, minHeight: MIN_TOP }
    : { height: '55%', minHeight: MIN_TOP };

  const timelineSectionStyle = topHeight
    ? { height: `calc(100% - ${topHeight}px - ${HANDLE_HEIGHT}px)`, minHeight: MIN_TIMELINE }
    : { height: '45%', minHeight: MIN_TIMELINE };

  return (
    <div
      className="snapverse-editor"
      style={{
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        overflow: 'hidden',
        background: 'var(--color-bg-secondary)',
      }}
    >
      {/* MAIN COLUMN (editor + timeline) */}
      <div
        ref={mainColumnRef}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}
      >
        {/* TOP SECTION — editor panels */}
        <div
          style={{
            ...topSectionStyle,
            display: 'flex',
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <EditorLayout />

          {/* Floating panels */}
          {showFilters && <FiltersPanel />}
          {showAdjustments && <AdjustmentsPanel />}
          {selectedClip?.type === 'text' && <TextEditor />}
          {selectedClip?.type === 'audio' && <AudioControls />}
          <SpeedCurvePanel />
        </div>

        {/* DRAG HANDLE */}
        <div
          onMouseDown={handleVerticalDragStart}
          className="layout-drag-handle"
        >
          <div className="layout-drag-handle-dots">
            <span /><span /><span />
          </div>
        </div>

        {/* TIMELINE SECTION */}
        <div
          style={{
            ...timelineSectionStyle,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <TimelinePanel />
        </div>
      </div>

      {/* FULL-HEIGHT RIGHT PANEL (AI Director / Properties) */}
      <div
        style={{
          width: 320,
          minWidth: 260,
          maxWidth: 420,
          flexShrink: 0,
          background: 'var(--color-ai-bg)',
          borderLeft: '1px solid var(--color-ai-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <RightPanel />
      </div>
    </div>
  );
}
