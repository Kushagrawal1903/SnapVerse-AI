import React, { useEffect, useState } from 'react';
import TopBar from './components/layout/TopBar';
import EditorLayout from './components/layout/EditorLayout';
import TimelinePanel from './components/timeline/TimelinePanel';
import FiltersPanel from './components/effects/FiltersPanel';
import AdjustmentsPanel from './components/effects/AdjustmentsPanel';
import TextEditor from './components/text/TextEditor';
import AudioControls from './components/audio/AudioControls';
import ExportModal from './components/export/ExportModal';
import KeyboardShortcutsModal from './components/shared/KeyboardShortcutsModal';
import ContextMenu from './components/shared/ContextMenu';
import AuthModal from './components/auth/AuthModal';
import ClipPropertiesPanel from './components/timeline/ClipPropertiesPanel';
import useUIStore from './stores/useUIStore';
import useProjectStore from './stores/useProjectStore';
import useAuthStore from './stores/useAuthStore';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useAutoSave from './hooks/useAutoSave';
import { loadProject } from './services/storageService';
import { isSupabaseConfigured } from './lib/supabase';
import { supabase } from './lib/supabase';

export default function App() {
  const showExportModal = useUIStore(s => s.showExportModal);
  const showShortcutsModal = useUIStore(s => s.showShortcutsModal);
  const showFilters = useUIStore(s => s.showFilters);
  const showAdjustments = useUIStore(s => s.showAdjustments);
  const selectedClipIds = useUIStore(s => s.selectedClipIds);
  const tracks = useProjectStore(s => s.tracks);

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const user = useAuthStore(s => s.user);
  const initialize = useAuthStore(s => s.initialize);

  // Get selected clip (if only 1 is selected) for legacy panels
  let selectedClip = null;
  if (selectedClipIds.size === 1) {
    const id = Array.from(selectedClipIds)[0];
    tracks.forEach(t => t.clips.forEach(c => {
      if (c.id === id) selectedClip = c;
    }));
  }

  // Keyboard shortcuts
  useKeyboardShortcuts();
  
  // Auto-save
  useAutoSave();

  // Initialize auth on mount
  useEffect(() => {
    initialize();

    // Listen for auth state changes
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          useAuthStore.setState({
            user: session.user,
            session,
            isAuthenticated: true,
            isLoading: false,
          });
        } else if (event === 'SIGNED_OUT') {
          useAuthStore.setState({
            user: null,
            session: null,
            isAuthenticated: false,
          });
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  // Load project after auth
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadUserProject = async () => {
      // Try loading from Supabase first
      if (isSupabaseConfigured() && user?.id !== 'local') {
        try {
          const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (projects?.length) {
            const project = projects[0];
            const timelineState = project.timeline_state || {};
            useProjectStore.getState().loadProject({
              projectId: project.id,
              projectName: project.name,
              aspectRatio: project.aspect_ratio,
              tracks: timelineState.tracks,
              mediaItems: [],
            });

            // Load media items from Supabase
            const { data: mediaItems } = await supabase
              .from('media_items')
              .select('*')
              .eq('project_id', project.id);

            if (mediaItems?.length) {
              mediaItems.forEach(m => {
                useProjectStore.getState().addMedia({
                  id: m.id,
                  name: m.file_name,
                  type: m.file_type,
                  objectUrl: m.file_url,
                  thumbnail: m.thumbnail_url,
                  duration: m.duration,
                  waveform: m.waveform_data,
                  fileUrl: m.file_url,
                  size: m.file_size,
                });
              });
            }

            useProjectStore.getState().pushHistory();
            return;
          }
        } catch (err) {
          console.warn('Failed to load from Supabase, falling back to local:', err);
        }
      }

      // Fallback: load from IndexedDB
      const data = await loadProject();
      if (data) {
        useProjectStore.getState().loadProject(data);
      }
      useProjectStore.getState().pushHistory();
    };

    loadUserProject();
  }, [isAuthenticated, user?.id]);

  // Loading screen
  if (isLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'var(--color-bg-primary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: 'var(--color-text-primary)' }}>Snap</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: 'var(--color-accent-primary)' }}>Verse</span>
        </div>
        <div style={{ width: 24, height: 24, border: '3px solid var(--color-accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // Auth gate — show auth modal if Supabase configured but not authenticated
  if (isSupabaseConfigured() && !isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="app-layout">
      <TopBar />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        <EditorLayout />
        
        {/* Floating panels */}
        {showFilters && <FiltersPanel />}
        {showAdjustments && <AdjustmentsPanel />}
        {selectedClip?.type === 'text' && <TextEditor />}
        {selectedClip?.type === 'audio' && <AudioControls />}
        <ClipPropertiesPanel />
      </div>

      <TimelinePanel />

      {/* Modals */}
      {showExportModal && <ExportModal />}
      {showShortcutsModal && <KeyboardShortcutsModal />}
      
      {/* Context menu */}
      <ContextMenu />
    </div>
  );
}
