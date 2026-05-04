import React from 'react';
import MediaLibrary from '../media/MediaLibrary';
import CanvasPreview from '../canvas/CanvasPreview';
import AIAdvisorPanel from '../ai/AIAdvisorPanel';

export default function EditorLayout() {
  return (
    <div className="editor-layout">
      <div className="panel-left">
        <MediaLibrary />
      </div>
      <div className="panel-center">
        <CanvasPreview />
      </div>
      <div className="panel-right">
        <AIAdvisorPanel />
      </div>
    </div>
  );
}
