import React, { useRef, useState, useCallback } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import { getMediaType, generateId } from '../../utils/clipUtils';
import { generateVideoThumbnail, generateImageThumbnail, generateAudioWaveform } from '../../services/thumbnailService';
import { saveMediaBlob, uploadMediaToSupabase, uploadThumbnailToSupabase, insertMediaItem } from '../../services/storageService';
import { isSupabaseConfigured } from '../../lib/supabase';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function MediaUploadZone() {
  const addMedia = useProjectStore(s => s.addMedia);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    const type = getMediaType(file);
    if (!type) {
      setError(`Unsupported format: ${file.name}`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (max 500MB): ${file.name}`);
      return;
    }

    setError('');
    const id = generateId();
    setProcessingStatus(`Processing ${file.name}...`);

    // Generate thumbnail / waveform
    let metadata = {};
    if (type === 'video') {
      setProcessingStatus('Generating video thumbnail...');
      metadata = await generateVideoThumbnail(file);
    } else if (type === 'photo') {
      setProcessingStatus('Processing image...');
      metadata = await generateImageThumbnail(file);
    } else if (type === 'audio') {
      setProcessingStatus('Analyzing audio waveform...');
      metadata = await generateAudioWaveform(file);
    }

    const objectUrl = URL.createObjectURL(file);

    // Save blob to IndexedDB for offline persistence
    setProcessingStatus('Saving locally...');
    await saveMediaBlob(id, file);

    const mediaItem = {
      id,
      name: file.name,
      type,
      size: file.size,
      file,
      objectUrl,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration || (type === 'photo' ? 5 : 0),
      width: metadata.width,
      height: metadata.height,
      waveform: metadata.waveform,
      fileUrl: null,
    };

    // Upload to Supabase Storage if configured
    if (isSupabaseConfigured()) {
      const user = useAuthStore.getState().user;
      const projectId = useProjectStore.getState().projectId;
      if (user && user.id !== 'local' && projectId) {
        setProcessingStatus('Uploading to cloud...');
        const uploadResult = await uploadMediaToSupabase(file, user.id, projectId);
        if (uploadResult) {
          mediaItem.fileUrl = uploadResult.publicUrl;
          mediaItem.r2Key = uploadResult.path;
        }

        // Upload thumbnail
        if (metadata.thumbnail) {
          const thumbUrl = await uploadThumbnailToSupabase(metadata.thumbnail, user.id, projectId, id);
          if (thumbUrl) mediaItem.thumbnailUrl = thumbUrl;
        }

        // Insert into database
        await insertMediaItem(mediaItem, projectId, user.id);
      }
    }

    addMedia(mediaItem);
    setProcessingStatus('');
  }, [addMedia]);

  const handleFiles = useCallback(async (files) => {
    setIsProcessing(true);
    setError('');
    for (const file of files) {
      await processFile(file);
    }
    setIsProcessing(false);
    setProcessingStatus('');
  }, [processFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  return (
    <div
      className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{ padding: '16px 12px' }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".mp4,.mov,.webm,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.aac,.ogg"
        onChange={(e) => handleFiles(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />
      {isProcessing ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 20, border: '2px solid var(--color-accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>{processingStatus || 'Processing...'}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            Drop files or click to browse
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            Video, Photo, Audio · Max 500MB
          </span>
        </div>
      )}
      {error && (
        <div style={{
          marginTop: 8, padding: '6px 10px', borderRadius: 6,
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', fontSize: 11, textAlign: 'center',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
