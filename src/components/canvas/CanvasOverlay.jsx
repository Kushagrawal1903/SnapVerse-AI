import React, { useCallback, useState } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import { ASPECT_RATIOS } from '../../utils/constants';

export default function CanvasOverlay() {
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const canvasMode = useUIStore(s => s.canvasMode);
  const tracks = useProjectStore(s => s.tracks);
  const updateClip = useProjectStore(s => s.updateClip);
  const currentTime = useProjectStore(s => s.currentTime);
  const aspectRatio = useProjectStore(s => s.aspectRatio);

  const [dragging, setDragging] = useState(null); // 'pan', 'scale-tl', 'rotate', etc.
  const [snapGuides, setSnapGuides] = useState({ h: false, v: false });

  if (selectedClipIds.size !== 1) return null;
  const clipId = Array.from(selectedClipIds)[0];
  let clip = null;
  let trackId = null;

  tracks.forEach(t => {
    const found = t.clips.find(c => c.id === clipId);
    if (found) { clip = found; trackId = t.id; }
  });

  if (!clip || (clip.type !== 'video' && clip.type !== 'photo' && clip.type !== 'text')) return null;

  const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);
  if (currentTime < clip.startTime || currentTime >= clip.startTime + effectiveDuration) return null;

  const ar = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['9:16'];
  const cw = ar.displayW;
  const ch = ar.displayH;
  const cx = cw / 2;
  const cy = ch / 2;

  const tr = clip.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 100 };
  const cr = clip.crop || { x: 0, y: 0, width: 1, height: 1 };

  const handlePointerDown = (action, e) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(action);
    setSnapGuides({ h: false, v: false });

    const startX = e.clientX;
    const startY = e.clientY;
    const initialTr = { ...tr };
    const initialCr = { ...cr };

    const handlePointerMove = (moveE) => {
      const dx = moveE.clientX - startX;
      const dy = moveE.clientY - startY;

      if (canvasMode === 'select') {
        if (action === 'pan') {
          let newX = initialTr.x + dx / cw;
          let newY = initialTr.y + dy / ch;
          
          let snapH = false;
          let snapV = false;
          
          // Snap to center (x=0, y=0 because 0 is center in our transform logic)
          if (Math.abs(newX * cw) < 5) { newX = 0; snapV = true; }
          if (Math.abs(newY * ch) < 5) { newY = 0; snapH = true; }
          
          setSnapGuides({ h: snapH, v: snapV });

          updateClip(trackId, clip.id, {
            transform: {
              ...initialTr,
              x: newX,
              y: newY,
            }
          });
        } else if (action === 'rotate') {
          // Basic rotation math relative to center
          const rect = moveE.currentTarget.getBoundingClientRect(); // This doesn't work well on window move.
          // Instead, calculate angle from center of canvas.
          // We need canvas center in screen coordinates. We assume canvas is centered, but we don't know rect.
          // Alternatively, dy simply controls rotation degrees for simplicity.
          updateClip(trackId, clip.id, {
            transform: {
              ...initialTr,
              rotation: initialTr.rotation + dx * 0.5,
            }
          });
        } else if (action.startsWith('scale')) {
          // Uniform scaling based on distance dragged horizontally or vertically
          const scaleDelta = (action.includes('l') ? -dx : dx) / cw + (action.includes('t') ? -dy : dy) / ch;
          updateClip(trackId, clip.id, {
            transform: {
              ...initialTr,
              scaleX: Math.max(0.1, initialTr.scaleX + scaleDelta),
              scaleY: Math.max(0.1, initialTr.scaleY + scaleDelta),
            }
          });
        }
      } else if (canvasMode === 'crop') {
        // Crop logic (normalized 0 to 1)
        if (action === 'crop-l') {
          const delta = dx / cw;
          updateClip(trackId, clip.id, { crop: { ...initialCr, x: Math.max(0, initialCr.x + delta), width: Math.max(0.1, initialCr.width - delta) } });
        } else if (action === 'crop-r') {
          const delta = dx / cw;
          updateClip(trackId, clip.id, { crop: { ...initialCr, width: Math.max(0.1, initialCr.width + delta) } });
        } else if (action === 'crop-t') {
          const delta = dy / ch;
          updateClip(trackId, clip.id, { crop: { ...initialCr, y: Math.max(0, initialCr.y + delta), height: Math.max(0.1, initialCr.height - delta) } });
        } else if (action === 'crop-b') {
          const delta = dy / ch;
          updateClip(trackId, clip.id, { crop: { ...initialCr, height: Math.max(0.1, initialCr.height + delta) } });
        }
      }
    };

    const handlePointerUp = () => {
      setDragging(null);
      setSnapGuides({ h: false, v: false });
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      useProjectStore.getState().pushHistory();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Snap Guides */}
      {snapGuides.v && <div style={{ position: 'absolute', left: cx, top: 0, bottom: 0, width: 1, background: 'cyan', zIndex: 10 }} />}
      {snapGuides.h && <div style={{ position: 'absolute', left: 0, right: 0, top: cy, height: 1, background: 'cyan', zIndex: 10 }} />}

      {canvasMode === 'select' && (
        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
          <g transform={`translate(${cx + tr.x * cw}, ${cy + tr.y * ch}) rotate(${tr.rotation}) scale(${tr.scaleX}, ${tr.scaleY}) translate(${-cx}, ${-cy})`}>
            {/* Box */}
            <rect
              x={0} y={0} width={cw} height={ch}
              fill="rgba(91,79,245,0.1)" stroke="var(--color-accent-primary)" strokeWidth={2 / tr.scaleX}
              style={{ pointerEvents: 'auto', cursor: 'move' }}
              onPointerDown={(e) => handlePointerDown('pan', e)}
            />
            {/* Corners */}
            <circle cx={0} cy={0} r={6 / tr.scaleX} fill="#fff" stroke="var(--color-accent-primary)" strokeWidth={2 / tr.scaleX} style={{ pointerEvents: 'auto', cursor: 'nwse-resize' }} onPointerDown={(e) => handlePointerDown('scale-tl', e)} />
            <circle cx={cw} cy={0} r={6 / tr.scaleX} fill="#fff" stroke="var(--color-accent-primary)" strokeWidth={2 / tr.scaleX} style={{ pointerEvents: 'auto', cursor: 'nesw-resize' }} onPointerDown={(e) => handlePointerDown('scale-tr', e)} />
            <circle cx={cw} cy={ch} r={6 / tr.scaleX} fill="#fff" stroke="var(--color-accent-primary)" strokeWidth={2 / tr.scaleX} style={{ pointerEvents: 'auto', cursor: 'nwse-resize' }} onPointerDown={(e) => handlePointerDown('scale-br', e)} />
            <circle cx={0} cy={ch} r={6 / tr.scaleX} fill="#fff" stroke="var(--color-accent-primary)" strokeWidth={2 / tr.scaleX} style={{ pointerEvents: 'auto', cursor: 'nesw-resize' }} onPointerDown={(e) => handlePointerDown('scale-bl', e)} />
            {/* Rotation Handle */}
            <line x1={cx} y1={0} x2={cx} y2={-30 / tr.scaleY} stroke="var(--color-accent-primary)" strokeWidth={2 / tr.scaleX} />
            <circle cx={cx} cy={-30 / tr.scaleY} r={6 / tr.scaleX} fill="#fff" stroke="var(--color-accent-primary)" strokeWidth={2 / tr.scaleX} style={{ pointerEvents: 'auto', cursor: 'crosshair' }} onPointerDown={(e) => handlePointerDown('rotate', e)} />
          </g>
        </svg>
      )}

      {canvasMode === 'crop' && (
        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* We assume crop happens on the unscaled/unrotated image for simplicity, but rendered using transform. */}
          <g transform={`translate(${cx + tr.x * cw}, ${cy + tr.y * ch}) rotate(${tr.rotation}) scale(${tr.scaleX}, ${tr.scaleY}) translate(${-cx}, ${-cy})`}>
            {/* Darkened out-of-bounds */}
            <path
              d={`M0,0 H${cw} V${ch} H0 Z M${cr.x * cw},${cr.y * ch} V${(cr.y + cr.height) * ch} H${(cr.x + cr.width) * cw} V${cr.y * ch} Z`}
              fill="rgba(0,0,0,0.6)" fillRule="evenodd"
            />
            {/* Crop Box */}
            <rect
              x={cr.x * cw} y={cr.y * ch} width={cr.width * cw} height={cr.height * ch}
              fill="transparent" stroke="#fff" strokeWidth={2 / tr.scaleX}
            />
            {/* Edge Handles */}
            <rect x={cr.x * cw - 4/tr.scaleX} y={(cr.y + cr.height/2) * ch - 12/tr.scaleY} width={8/tr.scaleX} height={24/tr.scaleY} fill="#fff" style={{ pointerEvents: 'auto', cursor: 'ew-resize' }} onPointerDown={(e) => handlePointerDown('crop-l', e)} />
            <rect x={(cr.x + cr.width) * cw - 4/tr.scaleX} y={(cr.y + cr.height/2) * ch - 12/tr.scaleY} width={8/tr.scaleX} height={24/tr.scaleY} fill="#fff" style={{ pointerEvents: 'auto', cursor: 'ew-resize' }} onPointerDown={(e) => handlePointerDown('crop-r', e)} />
            <rect x={(cr.x + cr.width/2) * cw - 12/tr.scaleX} y={cr.y * ch - 4/tr.scaleY} width={24/tr.scaleX} height={8/tr.scaleY} fill="#fff" style={{ pointerEvents: 'auto', cursor: 'ns-resize' }} onPointerDown={(e) => handlePointerDown('crop-t', e)} />
            <rect x={(cr.x + cr.width/2) * cw - 12/tr.scaleX} y={(cr.y + cr.height) * ch - 4/tr.scaleY} width={24/tr.scaleX} height={8/tr.scaleY} fill="#fff" style={{ pointerEvents: 'auto', cursor: 'ns-resize' }} onPointerDown={(e) => handlePointerDown('crop-b', e)} />
          </g>
        </svg>
      )}

      {/* Inline Text Editing */}
      {clip.type === 'text' && (
        <div 
          style={{ 
            position: 'absolute', 
            top: cy + (tr.y || 0) * ch + ch * 0.3, // default y is ~80% height relative to top, which is +30% from center
            left: cx + (tr.x || 0) * cw,
            transform: `translate(-50%, -50%) rotate(${tr.rotation || 0}deg) scale(${tr.scaleX || 1}, ${tr.scaleY || 1})`,
            pointerEvents: 'auto'
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <textarea
            value={clip.textData?.content || ''}
            onChange={(e) => {
              updateClip(trackId, clip.id, { textData: { ...clip.textData, content: e.target.value } });
            }}
            placeholder="Type here..."
            style={{
              background: 'transparent',
              border: canvasMode === 'select' ? '1px dashed rgba(255,255,255,0.5)' : 'none',
              color: 'transparent', // We render text in canvasEngine, so the textarea text is invisible but caret works
              caretColor: clip.textData?.color || '#fff',
              fontSize: (clip.textData?.size || 24) * (cw / 390),
              fontFamily: clip.textData?.font || 'DM Sans',
              fontWeight: clip.textData?.bold ? 'bold' : 'normal',
              textAlign: clip.textData?.align || 'center',
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              minWidth: cw * 0.8,
              minHeight: ch * 0.2,
            }}
          />
        </div>
      )}
    </div>
  );
}
