import React from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function MediaPreviewModal() {
  const showPreviewModal = useUIStore(s => s.showPreviewModal);
  const setShowPreviewModal = useUIStore(s => s.setShowPreviewModal);
  const mediaItems = useProjectStore(s => s.mediaItems);
  const item = mediaItems.find(m => m.id === showPreviewModal);

  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowPreviewModal(null)}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 0, maxWidth: 480, overflow: 'hidden' }}>
        {/* Preview content */}
        <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
          {item.type === 'video' && (
            <video src={item.objectUrl} controls autoPlay style={{ width: '100%', maxHeight: 400 }} />
          )}
          {item.type === 'photo' && (
            <img src={item.objectUrl} alt={item.name} style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }} />
          )}
          {item.type === 'audio' && (
            <div style={{ padding: 40, width: '100%' }}>
              {item.thumbnail && <img src={item.thumbnail} alt="Waveform" style={{ width: '100%', height: 60, borderRadius: 6 }} />}
              <audio src={item.objectUrl} controls autoPlay style={{ width: '100%', marginTop: 16 }} />
            </div>
          )}
        </div>
        {/* Footer */}
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{item.type}</div>
          </div>
          <button className="btn-ghost" onClick={() => setShowPreviewModal(null)}>Close</button>
        </div>
      </div>
    </div>
  );
}
