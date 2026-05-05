import React, { useState, useRef, useEffect } from 'react';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import { saveProject } from '../../services/storageService';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function TopBar() {
  const projectName = useProjectStore(s => s.projectName);
  const setProjectName = useProjectStore(s => s.setProjectName);
  const setShowExportModal = useUIStore(s => s.setShowExportModal);
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
    saveProject({
      projectName: state.projectName,
      aspectRatio: state.aspectRatio,
      tracks: state.tracks,
      mediaItems: state.mediaItems.map(m => ({ ...m, file: undefined, objectUrl: undefined })),
    });
    useUIStore.setState({ saveStatus: 'saved' });
    setTimeout(() => useUIStore.setState({ saveStatus: 'idle' }), 2000);
  };

  return (
    <header className="topbar">
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--color-text-primary)' }}>
            Snap
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--color-accent-primary)' }}>
            Verse
          </span>
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{
            border: 'none', background: 'transparent', fontFamily: 'var(--font-body)',
            fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)',
            outline: 'none', padding: '4px 8px', borderRadius: 6, width: 200,
            transition: 'background 0.15s',
          }}
          onFocus={(e) => e.target.style.background = 'var(--color-bg-surface)'}
          onBlur={(e) => e.target.style.background = 'transparent'}
        />
        {/* Save status indicator */}
        <SaveIndicator />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-surface)', padding: 4, borderRadius: 8, gap: 4 }}>
        {['editor', 'analyze', 'breakdown'].map(view => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            style={{
              padding: '6px 16px',
              border: 'none',
              background: currentView === view ? 'var(--color-bg-secondary)' : 'transparent',
              color: currentView === view ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              boxShadow: currentView === view ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {view === 'editor' ? 'Editor' : view === 'analyze' ? 'Reel Analyzer' : 'Viral Breakdown'}
          </button>
        ))}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          className="btn-icon tooltip"
          data-tooltip="Keyboard Shortcuts"
          onClick={() => setShowShortcutsModal(true)}
          style={{ fontSize: 16 }}
        >
          ?
        </button>
        <button className="btn-outline" onClick={handleSave}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save
        </button>
        <button className="btn-export" onClick={() => setShowExportModal(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>

        {/* User menu */}
        {user && (
          <div ref={menuRef} style={{ position: 'relative', marginLeft: 4 }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--color-accent-primary)', color: 'white',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)',
              }}
              title={user.email}
            >
              {(user.email || 'U')[0].toUpperCase()}
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: 'white', borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-strong)', border: '1px solid var(--color-border)',
                padding: 4, minWidth: 200, zIndex: 100, animation: 'fadeIn 0.15s ease-out',
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {user.email}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {isSupabaseConfigured() ? 'Cloud Mode' : 'Local Mode'}
                  </div>
                </div>
                {isSupabaseConfigured() && (
                  <button
                    className="context-menu-item"
                    onClick={() => { signOut(); setShowMenu(false); }}
                    style={{ color: '#e74c3c' }}
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
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
