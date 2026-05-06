import React, { useState, useRef, useEffect } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import { saveProject } from '../../services/storageService';
import { isSupabaseConfigured } from '../../lib/supabase';

const resolveProjectThumbnail = (mediaItems = []) =>
  mediaItems.find((m) => m?.fileUrl)?.fileUrl ||
  mediaItems.find((m) => m?.objectUrl)?.objectUrl ||
  mediaItems.find((m) => m?.thumbnailUrl)?.thumbnailUrl ||
  mediaItems.find((m) => m?.thumbnail)?.thumbnail ||
  null;

export default function TopBar() {
  const projectName = useProjectStore(s => s.projectName);
  const setProjectName = useProjectStore(s => s.setProjectName);
  const setShowShortcutsModal = useUIStore(s => s.setShowShortcutsModal);
  const saveStatus = useUIStore(s => s.saveStatus);
  const currentView = useUIStore(s => s.currentView);
  const setCurrentView = useUIStore(s => s.setCurrentView);

  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = () => {
    const state = useProjectStore.getState();
    if (!state.projectId) return;
    saveProject({
      projectId: state.projectId,
      projectName: state.projectName,
      aspectRatio: state.aspectRatio,
      tracks: state.tracks,
      thumbnailUrl: resolveProjectThumbnail(state.mediaItems),
      mediaItems: state.mediaItems.map(m => ({ ...m, file: undefined, objectUrl: undefined })),
    });
    useUIStore.setState({ saveStatus: 'saved' });
    setTimeout(() => useUIStore.setState({ saveStatus: 'idle' }), 2000);
  };

  return (
    <nav className="flex justify-between items-center px-4 h-14 bg-surface border-b border-outline-variant shrink-0 relative z-20 shadow-sm">
      {/* Logo & Project Name */}
      <div className="flex items-center gap-4">
        <div 
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-1 cursor-pointer group"
        >
          <span className="font-display font-bold text-xl text-primary group-hover:text-surface-tint transition-colors">
            SnapVerse
          </span>
        </div>
        
        <div className="w-px h-6 bg-outline-variant"></div>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent border-none font-body-md text-sm font-semibold text-on-surface hover:bg-surface-container-lowest focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary rounded px-2 py-1 outline-none transition-all w-48 truncate"
          />
          <SaveIndicator />
        </div>
      </div>

      {/* Center Navigation */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex bg-surface-container-low p-1 rounded-lg border border-outline-variant shadow-sm">
        {['editor', 'analyze', 'breakdown'].map(view => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            className={`px-4 py-1.5 rounded-md font-label-sm transition-all duration-200 capitalize ${
              currentView === view 
                ? 'bg-surface text-primary shadow-sm border border-outline-variant' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {view === 'editor' ? 'Editor' : view === 'analyze' ? 'Reel Analyzer' : 'Viral Breakdown'}
          </button>
        ))}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <button
          className="w-8 h-8 rounded hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors"
          title="Keyboard Shortcuts"
          onClick={() => setShowShortcutsModal(true)}
        >
          <span className="material-symbols-outlined text-[20px]">keyboard</span>
        </button>

        <button 
          className="px-3 py-1.5 rounded-lg border border-outline-variant font-label-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-1 shadow-sm"
          onClick={handleSave}
        >
          <span className="material-symbols-outlined text-[16px]">save</span> Save
        </button>

        <button 
          className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm font-medium hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-1 shadow-sm"
          onClick={() => setCurrentView('export')}
        >
          <span className="material-symbols-outlined text-[16px]">ios_share</span> Export
        </button>

        {/* User menu */}
        {user && (
          <div ref={menuRef} className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-display font-bold text-sm flex items-center justify-center cursor-pointer border border-primary/20 hover:scale-105 transition-transform"
              title={user.email}
            >
              {(user.email || 'U')[0].toUpperCase()}
            </button>
            
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-2 min-w-[200px] z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-outline-variant mb-1">
                  <div className="text-sm font-semibold text-on-surface truncate">{user.email}</div>
                  <div className="text-[10px] text-outline font-mono-label mt-1">
                    {isSupabaseConfigured() ? 'CLOUD SYNC ACTIVE' : 'LOCAL MODE ONLY'}
                  </div>
                </div>
                {isSupabaseConfigured() && (
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error-container hover:text-on-error-container rounded-lg transition-colors flex items-center gap-2"
                    onClick={() => { signOut(); setShowMenu(false); }}
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function SaveIndicator() {
  const saveStatus = useUIStore(s => s.saveStatus);
  const lastSavedTime = useUIStore(s => s.lastSavedTime);
  const saveState = useProjectStore(s => s.saveState);
  
  const [, forceUpdate] = useState(0);
  
  // Update relative time display every 30s
  useEffect(() => {
    const timer = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Determine visual state: combine store-level saveState with UI saveStatus
  const status = saveStatus === 'saving' ? 'saving' : saveStatus === 'saved' ? 'saved' : saveState === 'unsaved' ? 'unsaved' : 'saved';
  
  const getRelativeTime = () => {
    if (!lastSavedTime) return '';
    const diff = Math.floor((Date.now() - lastSavedTime) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const configs = {
    saving: { color: '#5b4ff5', text: 'Saving...', dot: true, spinning: true },
    saved: { color: '#1D9E75', text: `Saved ${getRelativeTime()}`.trim(), dot: true, spinning: false },
    unsaved: { color: '#EF9F27', text: 'Unsaved', dot: true, spinning: false },
  };
  const cfg = configs[status] || configs.saved;

  return (
    <span style={{
      fontSize: 11, color: cfg.color, display: 'flex', alignItems: 'center', gap: 5,
      fontWeight: 500, transition: 'color 0.2s', fontFamily: 'var(--font-body)',
    }}>
      {cfg.spinning ? (
        <div style={{ width: 8, height: 8, border: `1.5px solid ${cfg.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      ) : (
        <div style={{
          width: 6, height: 6, borderRadius: '50%', background: cfg.color,
          animation: status === 'unsaved' ? 'unsavedPulse 2s ease-in-out infinite' : 'none',
        }} />
      )}
      {cfg.text}
    </span>
  );
}
