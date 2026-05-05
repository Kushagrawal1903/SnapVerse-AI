import React, { useEffect, useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import ExportModal from './components/export/ExportModal';
import KeyboardShortcutsModal from './components/shared/KeyboardShortcutsModal';
import ContextMenu from './components/shared/ContextMenu';
import ToastContainer from './components/shared/ToastContainer';
import ContextualTip from './components/ui/ContextualTip';
import AuthModal from './components/auth/AuthModal';
import ReelAnalyzer from './components/ai/ReelAnalyzer';
import ViralBreakdown from './components/ai/ViralBreakdown';
import TopBar from './components/layout/TopBar';
import useUIStore from './stores/useUIStore';
import useProjectStore from './stores/useProjectStore';
import useAuthStore from './stores/useAuthStore';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useAutoSave from './hooks/useAutoSave';
import { loadProject, restoreMediaBlobs } from './services/storageService';
import { showToast } from './stores/useToastStore';
import { isSupabaseConfigured } from './lib/supabase';
import { supabase } from './lib/supabase';

export default function App() {
  const showExportModal = useUIStore(s => s.showExportModal);
  const showShortcutsModal = useUIStore(s => s.showShortcutsModal);
  const currentView = useUIStore(s => s.currentView);

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const user = useAuthStore(s => s.user);
  const initialize = useAuthStore(s => s.initialize);

  // Keyboard shortcuts
  useKeyboardShortcuts();
  
  // Auto-save
  useAutoSave();

  // Prevent accidental data loss — beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const state = useProjectStore.getState();
      const hasContent = state.tracks.some(t => t.clips.length > 0) || state.mediaItems.length > 0;
      if (hasContent) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
        if (data.mediaItems?.length > 0) {
          data.mediaItems = await restoreMediaBlobs(data.mediaItems);
          const offlineCount = data.mediaItems.filter(m => m.isOffline).length;
          if (offlineCount > 0) {
            showToast(`${offlineCount} media item(s) offline. Please re-upload.`, 'warning', 5000);
          }
        }
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
    <>
      {currentView === 'editor' && <AppLayout />}

      {currentView === 'analyze' && (
        <div className="app-layout">
          <TopBar />
          <ReelAnalyzer />
        </div>
      )}
      {currentView === 'breakdown' && (
        <div className="app-layout">
          <TopBar />
          <ViralBreakdown />
        </div>
      )}

      {/* Modals */}
      {showExportModal && <ExportModal />}
      {showShortcutsModal && <KeyboardShortcutsModal />}
      
      {/* Context menu */}
      <ContextMenu />

      {/* Contextual Tips */}
      <ContextualTip />

      {/* Toast notifications */}
      <ToastContainer />
    </>
  );
}
