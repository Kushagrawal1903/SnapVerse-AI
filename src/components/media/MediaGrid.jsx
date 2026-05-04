import React from 'react';
import MediaItem from './MediaItem';

export default function MediaGrid({ items }) {
  return (
    <div className="media-grid">
      {items.map(item => (
        <MediaItem key={item.id} item={item} />
      ))}
    </div>
  );
}
