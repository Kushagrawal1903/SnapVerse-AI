import { get, set, del, keys } from 'idb-keyval';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';

const PROJECT_PREFIX = 'snapverse_project_';
const INDEX_KEY = 'snapverse_projects_index';
const MEDIA_PREFIX = 'snapverse_media_';

function pickProjectThumbnail(mediaItems = []) {
  const withFileUrl = mediaItems.find((item) => item?.fileUrl);
  if (withFileUrl?.fileUrl) return withFileUrl.fileUrl;

  const withObjectUrl = mediaItems.find((item) => item?.objectUrl);
  if (withObjectUrl?.objectUrl) return withObjectUrl.objectUrl;

  const withThumbUrl = mediaItems.find((item) => item?.thumbnailUrl);
  if (withThumbUrl?.thumbnailUrl) return withThumbUrl.thumbnailUrl;

  const withThumb = mediaItems.find((item) => item?.thumbnail);
  if (withThumb?.thumbnail) return withThumb.thumbnail;

  return null;
}

// ═══════════════════════════════════════
// IndexedDB (local persistence)
// ═══════════════════════════════════════

export async function saveProject(projectData) {
  try {
    if (!projectData?.projectId) {
      throw new Error('Cannot save project without projectId');
    }
    const projectId = projectData.projectId;
    const key = `${PROJECT_PREFIX}${projectId}`;
    
    await set(key, {
      ...projectData,
      projectId,
      savedAt: Date.now(),
    });

    // Update local index
    const index = await get(INDEX_KEY) || [];
    const existingIdx = index.findIndex(p => p.id === projectId);
    const summary = {
      id: projectId,
      name: projectData.projectName || 'Untitled Project',
      aspect_ratio: projectData.aspectRatio || '9:16',
      target_platform: projectData.targetPlatform || 'Instagram Reels',
      thumbnail_url: projectData.thumbnailUrl || pickProjectThumbnail(projectData.mediaItems || []),
      duration: projectData.duration || 0,
      updated_at: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      index[existingIdx] = { ...index[existingIdx], ...summary };
    } else {
      index.push(summary);
    }
    await set(INDEX_KEY, index);

    // Also save to Supabase if authenticated
    if (isSupabaseConfigured()) {
      const user = useAuthStore.getState().user;
      if (user && user.id !== 'local') {
        const payload = {
          user_id: user.id,
          name: projectData.projectName || 'Untitled Project',
          aspect_ratio: projectData.aspectRatio || '9:16',
          target_platform: projectData.targetPlatform || 'Instagram Reels',
          thumbnail_url: projectData.thumbnailUrl || pickProjectThumbnail(projectData.mediaItems || []),
          timeline_state: {
            tracks: projectData.tracks || [],
            clips: [],
          },
          duration: projectData.duration || 0,
          updated_at: new Date().toISOString(),
        };
        if (projectId) payload.id = projectId;

        const { data, error } = await supabase
          .from('projects')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

        if (!error && data) {
          return data.id;
        }
      }
    }
    return projectId;
  } catch (e) {
    console.error('Failed to save project:', e);
    return false;
  }
}

export async function loadProject(projectId) {
  try {
    const data = await get(`${PROJECT_PREFIX}${projectId}`);
    return data || null;
  } catch (e) {
    console.error('Failed to load project:', e);
    return null;
  }
}

export async function deleteLocalProject(projectId) {
  try {
    await del(`${PROJECT_PREFIX}${projectId}`);
    const index = await get(INDEX_KEY) || [];
    await set(INDEX_KEY, index.filter(p => p.id !== projectId));
  } catch(e) {
    console.error('Failed to delete local project', e);
  }
}

export async function saveMediaBlob(mediaId, blob) {
  try {
    await set(MEDIA_PREFIX + mediaId, blob);
  } catch (e) {
    console.error('Failed to save media blob:', e);
  }
}

export async function loadMediaBlob(mediaId) {
  try {
    return await get(MEDIA_PREFIX + mediaId);
  } catch (e) {
    console.error('Failed to load media blob:', e);
    return null;
  }
}

export async function deleteMediaBlob(mediaId) {
  try {
    await del(MEDIA_PREFIX + mediaId);
  } catch (e) {
    console.error('Failed to delete media blob:', e);
  }
}

export async function clearAllData() {
  try {
    const allKeys = await keys();
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith('snapverse_')) {
        await del(key);
      }
    }
  } catch (e) {
    console.error('Failed to clear data:', e);
  }
}

// ═══════════════════════════════════════
// Supabase Storage (cloud media uploads)
// ═══════════════════════════════════════

export async function uploadMediaToSupabase(file, userId, projectId) {
  if (!isSupabaseConfigured()) return null;

  try {
    const ext = file.name.split('.').pop();
    const fileName = `${userId}/${projectId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(data.path);

    return { path: data.path, publicUrl };
  } catch (e) {
    console.error('Supabase upload failed:', e);
    return null;
  }
}

export async function uploadThumbnailToSupabase(dataUrl, userId, projectId, mediaId) {
  if (!isSupabaseConfigured() || !dataUrl) return null;

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const fileName = `${userId}/${projectId}/thumbs/${mediaId}.jpg`;

    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (e) {
    console.error('Thumbnail upload failed:', e);
    return null;
  }
}

export async function insertMediaItem(mediaItem, projectId, userId) {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('media_items').insert({
      id: mediaItem.id,
      project_id: projectId,
      user_id: userId,
      file_name: mediaItem.name,
      file_type: mediaItem.type,
      file_url: mediaItem.fileUrl || mediaItem.objectUrl,
      r2_key: mediaItem.r2Key || '',
      duration: mediaItem.duration || null,
      thumbnail_url: mediaItem.thumbnail || null,
      waveform_data: mediaItem.waveform || null,
      file_size: mediaItem.size || null,
    });
  } catch (e) {
    console.error('Failed to insert media item:', e);
  }
}

// Restore blob URLs from IndexedDB for media items
export async function restoreMediaBlobs(mediaItems) {
  const restored = [];
  for (const item of mediaItems) {
    if (!item.objectUrl || item.objectUrl.startsWith('blob:')) {
      const blob = await loadMediaBlob(item.id);
      if (blob) {
        restored.push({ ...item, objectUrl: URL.createObjectURL(blob), isOffline: false });
      } else if (item.fileUrl) {
        restored.push({ ...item, objectUrl: item.fileUrl, isOffline: false });
      } else {
        restored.push({ ...item, objectUrl: null, isOffline: true });
      }
    } else {
      restored.push(item);
    }
  }
  return restored;
}
