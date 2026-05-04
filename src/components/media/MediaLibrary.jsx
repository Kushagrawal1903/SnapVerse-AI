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
