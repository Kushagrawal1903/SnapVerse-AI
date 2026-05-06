import { supabase, isSupabaseConfigured } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';
import { TRACK_CONFIG } from '../utils/constants';
import { saveProject, loadProject as loadLocalProject } from './storageService';

function defaultTracks() {
  return TRACK_CONFIG.map(t => ({
    id: t.id, label: t.label, icon: t.icon, accepts: t.accepts,
    clips: [], muted: false, solo: false, volume: 100, locked: false, height: 80, isCustom: false,
  }));
}

export async function loadUserProjects() {
  if (!isSupabaseConfigured()) {
    const { get } = await import('idb-keyval');
    const index = await get('snapverse_projects_index') || [];
    return index.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
  const user = useAuthStore.getState().user;
  if (!user || user.id === 'local') {
    const { get } = await import('idb-keyval');
    const index = await get('snapverse_projects_index') || [];
    return index.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, thumbnail_url, aspect_ratio, target_platform, duration, updated_at, created_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createNewProject(opts = {}) {
  const localFallback = () => {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      name: opts.name || 'Untitled Project',
      aspect_ratio: opts.aspectRatio || '9:16',
      target_platform: opts.targetPlatform || 'Instagram Reels',
      timeline_state: { tracks: defaultTracks(), clips: [] },
      duration: 0,
      created_at: now,
      updated_at: now,
    };
  };

  const persistLocalProject = async (project) => {
    await saveProject({
      projectId: project.id,
      projectName: project.name,
      aspectRatio: project.aspect_ratio,
      tracks: project.timeline_state?.tracks || defaultTracks(),
      mediaItems: [],
      duration: project.duration || 0,
      targetPlatform: project.target_platform,
    });
    return project;
  };

  if (!isSupabaseConfigured()) {
    const project = localFallback();
    return persistLocalProject(project);
  }

  const user = useAuthStore.getState().user;
  if (!user || user.id === 'local') {
    return persistLocalProject(localFallback());
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: opts.name || 'Untitled Project',
        aspect_ratio: opts.aspectRatio || '9:16',
        target_platform: opts.targetPlatform || 'Instagram Reels',
        timeline_state: { tracks: defaultTracks(), clips: [] },
        duration: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase insert failed, falling back to local project:', err);
    return persistLocalProject(localFallback());
  }
}

export async function getProjectById(projectId) {
  if (!projectId) return null;

  const local = await loadLocalProject(projectId);
  if (local) {
    return {
      id: local.projectId,
      name: local.projectName || 'Untitled Project',
      aspect_ratio: local.aspectRatio || '9:16',
      target_platform: local.targetPlatform || 'Instagram Reels',
      thumbnail_url: local.thumbnailUrl || null,
      timeline_state: { tracks: local.tracks || defaultTracks(), clips: [] },
      duration: local.duration || 0,
      updated_at: local.savedAt ? new Date(local.savedAt).toISOString() : new Date().toISOString(),
      media_items: local.mediaItems || [],
    };
  }

  if (!isSupabaseConfigured()) return null;

  const user = useAuthStore.getState().user;
  if (!user || user.id === 'local') return null;

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) return null;

  const { data: mediaItems } = await supabase
    .from('media_items')
    .select('*')
    .eq('project_id', project.id);

  return {
    ...project,
    media_items: mediaItems || [],
  };
}

export async function deleteProject(projectId) {
  const { deleteLocalProject } = await import('./storageService');
  await deleteLocalProject(projectId);
  
  if (!isSupabaseConfigured()) return;
  await supabase.from('projects').delete().eq('id', projectId);
}

export async function duplicateProject(projectId) {
  if (!isSupabaseConfigured()) return null;
  const { data: original } = await supabase
    .from('projects').select('*').eq('id', projectId).single();

  if (!original) return null;
  return createNewProject({
    name: `${original.name} (copy)`,
    aspectRatio: original.aspect_ratio,
    targetPlatform: original.target_platform,
  });
}

export async function renameProject(projectId, newName) {
  if (!isSupabaseConfigured()) return;
  await supabase
    .from('projects')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', projectId);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
