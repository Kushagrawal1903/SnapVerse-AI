import React, { useCallback } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import { formatDuration } from '../../utils/timeFormat';
import { TRACK_TYPES } from '../../utils/constants';

export default function MediaItem({ item }) {
  const addClip = useProjectStore(s => s.addClip);
  const removeMedia = useProjectStore(s => s.removeMedia);
  const setShowPreviewModal = useUIStore(s => s.setShowPreviewModal);
  const openContextMenu = useUIStore(s => s.openContextMenu);

  const typeIcon = item.type === 'video' ? '▶' : item.type === 'audio' ? '♪' : '◻';
  const typeColor = item.type === 'video' ? 'var(--color-clip-video-text)' : item.type === 'audio' ? 'var(--color-clip-audio-text)' : 'var(--color-clip-photo-text)';

  const handleAddToTimeline = useCallback(() => {
    const trackMap = { video: TRACK_TYPES.VIDEO_1, photo: TRACK_TYPES.PHOTO, audio: TRACK_TYPES.AUDIO_1 };
    const trackId = trackMap[item.type];
    if (!trackId) return;
    const track = useProjectStore.getState().tracks.find(t => t.id === trackId);
    const lastEnd = track ? Math.max(0, ...track.clips.map(c => c.startTime + c.duration)) : 0;
    addClip(trackId, {
      mediaId: item.id,
      name: item.name,
      type: item.type,
      startTime: lastEnd,
      duration: item.duration || 5,
    });
  }, [item, addClip]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, [
      { label: 'Add to Timeline', action: handleAddToTimeline },
      { label: 'Preview', action: () => setShowPreviewModal(item.id) },
      { label: 'Delete', action: () => removeMedia(item.id), danger: true },
    ]);
  }, [openContextMenu, handleAddToTimeline, setShowPreviewModal, removeMedia, item.id]);

  const handleDragStart = useCallback((e) => {
    e.dataTransfer.setData('application/snapverse-media', JSON.stringify({
      mediaId: item.id,
      type: item.type,
      name: item.name,
      duration: item.duration,
    }));
    e.dataTransfer.effectAllowed = 'copy';
    useUIStore.getState().setIsDraggingMedia({ type: item.type });
  }, [item]);

  const handleDragEnd = useCallback(() => {
    useUIStore.getState().setIsDraggingMedia(null);
  }, []);

  return (
    <div
      className="media-item"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={() => setShowPreviewModal(item.id)}
      onContextMenu={handleContextMenu}
      title={item.name}
    >
      {/* Thumbnail */}
      <div style={{
        width: '100%',
        height: 80,
        background: item.type === 'audio' ? 'var(--color-clip-audio)' : 'var(--color-bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 24, color: typeColor, opacity: 0.5 }}>{typeIcon}</span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '70%',
        }}>
          {item.name}
        </span>
        {item.duration > 0 && (
          <span className="badge" style={{
            background: item.type === 'video' ? 'var(--color-clip-video)' : item.type === 'audio' ? 'var(--color-clip-audio)' : 'var(--color-clip-photo)',
            color: typeColor,
          }}>
            {formatDuration(item.duration)}
          </span>
        )}
      </div>
    </div>
  );
}
