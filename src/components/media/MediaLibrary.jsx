import React, { useState } from 'react';
import MediaUploadZone from './MediaUploadZone';
import MediaFilters from './MediaFilters';
import MediaSearch from './MediaSearch';
import MediaGrid from './MediaGrid';
import MediaPreviewModal from './MediaPreviewModal';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function MediaLibrary() {
  const mediaItems = useProjectStore(s => s.mediaItems);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const showPreviewModal = useUIStore(s => s.showPreviewModal);

  const filtered = mediaItems.filter(m => {
    if (filter !== 'all' && m.type !== filter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
          Media Library
        </h2>
        <MediaSearch value={search} onChange={setSearch} />
      </div>

      {/* Filter tabs */}
      <MediaFilters active={filter} onChange={setFilter} />

      {/* Upload zone */}
      <div style={{ padding: '8px 12px 4px' }}>
        <MediaUploadZone />
      </div>

      {/* Media grid */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filtered.length > 0 ? (
          <MediaGrid items={filtered} />
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
            {mediaItems.length === 0 ? 'Upload media to get started' : 'No matching media'}
          </div>
        )}
      </div>

      {showPreviewModal && <MediaPreviewModal />}
    </div>
  );
}

// Step 22: Loading Skeleton States
export function MediaSkeleton() {
  return (
    <div style={{ padding: '8px 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ 
            aspectRatio: '1', borderRadius: 6, background: 'var(--color-bg-surface)', 
            border: '1px solid var(--color-border)', overflow: 'hidden'
          }}>
            <div style={{ width: '100%', height: '70%', background: 'var(--color-border)', animation: 'shimmerPulse 1.5s ease-in-out infinite alternate', animationDelay: `${i * 0.1}s` }} />
            <div style={{ padding: 6 }}>
              <div style={{ width: '80%', height: 6, borderRadius: 3, background: 'var(--color-border)', animation: 'shimmerPulse 1.5s ease-in-out infinite alternate', animationDelay: `${i * 0.1 + 0.2}s` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
