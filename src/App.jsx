import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import AnalyzePage from './pages/AnalyzePage';
import BreakdownPage from './pages/BreakdownPage';
import ExportView from './components/export/ExportView';
import ExportModal from './components/export/ExportModal';
import KeyboardShortcutsModal from './components/shared/KeyboardShortcutsModal';
import ContextMenu from './components/shared/ContextMenu';
import ToastContainer from './components/shared/ToastContainer';
import ContextualTip from './components/ui/ContextualTip';
import AuthModal from './components/auth/AuthModal';
import useUIStore from './stores/useUIStore';
import useProjectStore from './stores/useProjectStore';
import useAuthStore from './stores/useAuthStore';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useAutoSave from './hooks/useAutoSave';
import { isSupabaseConfigured, supabase } from './lib/supabase';

function AppShell() {
  const showShortcutsModal = useUIStore(s => s.showShortcutsModal);
  const showExportModal = useUIStore(s => s.showExportModal);

  useKeyboardShortcuts();
  useAutoSave();

  // Prevent accidental data loss
  useEffect(() => {
    const handler = (e) => {
      const state = useProjectStore.getState();
      if (state.tracks.some(t => t.clips.length > 0) || state.mediaItems.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor/:projectId" element={<EditorPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/breakdown" element={<BreakdownPage />} />
        <Route path="/export" element={<ExportView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showExportModal && <ExportModal />}
      {showShortcutsModal && <KeyboardShortcutsModal />}
      <ContextMenu />
      <ContextualTip />
      <ToastContainer />
    </>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const initialize = useAuthStore(s => s.initialize);

  useEffect(() => {
    initialize();
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          useAuthStore.setState({ user: session.user, session, isAuthenticated: true, isLoading: false });
        } else if (event === 'SIGNED_OUT') {
          useAuthStore.setState({ user: null, session: null, isAuthenticated: false });
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f8f8fa' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700 }}>
          <span style={{ color: '#0d0d12' }}>Snap</span>
          <span style={{ color: '#5b4ff5' }}>Verse</span>
        </div>
        <div style={{ width: 24, height: 24, border: '3px solid #5b4ff5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (isSupabaseConfigured() && !isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
