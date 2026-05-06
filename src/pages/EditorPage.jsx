import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useProjectStore from '../stores/useProjectStore';
import useUIStore from '../stores/useUIStore';
import AppLayout from '../components/layout/AppLayout';
import { saveProject } from '../services/storageService';
import { getProjectById } from '../services/projectService';

const resolveProjectThumbnail = (mediaItems = []) =>
  mediaItems.find((m) => m?.fileUrl)?.fileUrl ||
  mediaItems.find((m) => m?.objectUrl)?.objectUrl ||
  mediaItems.find((m) => m?.thumbnailUrl)?.thumbnailUrl ||
  mediaItems.find((m) => m?.thumbnail)?.thumbnail ||
  null;

function SaveIndicator() {
  const saveStatus = useUIStore(s => s.saveStatus);
  const lastSavedTime = useUIStore(s => s.lastSavedTime);
  const saveState = useProjectStore(s => s.saveState);
  const [, forceUpdate] = useState(0);
  useEffect(() => { const t = setInterval(() => forceUpdate(n => n + 1), 30000); return () => clearInterval(t); }, []);
  const status = saveStatus === 'saving' ? 'saving' : saveStatus === 'saved' ? 'saved' : saveState === 'unsaved' ? 'unsaved' : 'saved';
  const getRelativeTime = () => { if (!lastSavedTime) return ''; const d = Math.floor((Date.now() - lastSavedTime) / 1000); if (d < 5) return 'just now'; if (d < 60) return `${d}s ago`; if (d < 3600) return `${Math.floor(d / 60)}m ago`; return `${Math.floor(d / 3600)}h ago`; };
  const cfgs = {
    saving: { color: '#3b82f6', text: 'Saving...' },
    saved: { color: '#1D9E75', text: `Saved ${getRelativeTime()}`.trim() },
    unsaved: { color: '#EF9F27', text: 'Unsaved' },
  };
  const c = cfgs[status] || cfgs.saved;
  return (
    <span style={{ fontSize: 11, color: c.color, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
      {status === 'saving' ? (
        <div style={{ width: 8, height: 8, border: `1.5px solid ${c.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      ) : (
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, animation: status === 'unsaved' ? 'unsavedPulse 2s ease-in-out infinite' : 'none' }} />
      )}
      {c.text}
    </span>
  );
}

export default function EditorPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const projectName = useProjectStore(s => s.projectName);
  const setProjectName = useProjectStore(s => s.setProjectName);
  const setShowShortcutsModal = useUIStore(s => s.setShowShortcutsModal);
  const setShowExportModal = useUIStore(s => s.setShowExportModal);

  useEffect(() => {
    if (!projectId) { navigate('/'); return; }
    const loadProj = async () => {
      const state = useProjectStore.getState();
      if (state.projectId === projectId) { setLoading(false); return; }

      try {
        const project = await getProjectById(projectId);
        if (project) {
          const ts = project.timeline_state || {};
          const mediaItems = (project.media_items || []).map(m => ({
            id: m.id,
            name: m.file_name || m.name,
            type: m.file_type || m.type,
            objectUrl: m.file_url || m.objectUrl,
            thumbnail: m.thumbnail_url || m.thumbnail,
            duration: m.duration,
            waveform: m.waveform_data || m.waveform,
            fileUrl: m.file_url || m.fileUrl,
            size: m.file_size || m.size,
          }));

          useProjectStore.getState().loadProject({
            projectId: project.id,
            projectName: project.name,
            aspectRatio: project.aspect_ratio,
            tracks: ts.tracks,
            mediaItems,
          });
          useProjectStore.getState().pushHistory();
        }
      } catch (err) {
        console.warn('Failed to load project:', err);
      }
      setLoading(false);
    };
    loadProj();
  }, [projectId, navigate]);

  const handleSave = () => {
    const state = useProjectStore.getState();
    saveProject({
      projectId: state.projectId,
      projectName: state.projectName,
      aspectRatio: state.aspectRatio,
      tracks: state.tracks,
      thumbnailUrl: resolveProjectThumbnail(state.mediaItems),
      mediaItems: state.mediaItems.map(m => ({ ...m, file: undefined, objectUrl: undefined })),
    });
    useUIStore.setState({ saveStatus: 'saved', lastSavedTime: Date.now() });
    setTimeout(() => useUIStore.setState({ saveStatus: 'idle' }), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, background: '#f8f8fa' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700 }}>
          <span style={{ color: '#0d0d12' }}>Snap</span><span style={{ color: '#3b82f6' }}>Verse</span>
        </div>
        <div style={{ width: 200, height: 3, background: '#ededf0', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#3b82f6', borderRadius: 99, animation: 'loading-bar 1.5s ease-in-out infinite' }} />
        </div>
        <p style={{ fontSize: 13, color: '#9999b0' }}>Loading project...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Editor Top Bar */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', zIndex: 100 }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8888a0', padding: '0 6px 0 0', transition: 'color 0.15s', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={e => e.currentTarget.style.color = '#0d0d12'} onMouseLeave={e => e.currentTarget.style.color = '#8888a0'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Projects
        </button>

        <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.1)' }} />

        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
          <span style={{ color: '#0d0d12' }}>Snap</span><span style={{ color: '#3b82f6' }}>Verse</span>
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.1)' }} />

        <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
          style={{ background: 'transparent', border: 'none', fontSize: 13, fontWeight: 600, color: '#0d0d12', outline: 'none', width: 160, padding: '4px 8px', borderRadius: 4, fontFamily: "'DM Sans', sans-serif" }}
          onFocus={e => { e.target.style.background = '#f5f5f7'; }} onBlur={e => { e.target.style.background = 'transparent'; }} />

        <SaveIndicator />

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 2, background: '#f5f5f7', borderRadius: 8, padding: 3 }}>
          {[
            { label: 'Editor', path: `/editor/${projectId}`, match: '/editor' },
            { label: 'Reel Analyzer', path: '/analyze', match: '/analyze' },
            { label: 'Viral Breakdown', path: '/breakdown', match: '/breakdown' },
          ].map(tab => {
            const active = tab.match === '/editor';
            return (
              <button key={tab.label} onClick={() => navigate(tab.path)}
                style={{ padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400, background: active ? '#3b82f6' : 'transparent', color: active ? 'white' : '#8888a0', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <button title="Keyboard shortcuts" onClick={() => setShowShortcutsModal(true)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8888a0', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
        </button>

        <button onClick={handleSave}
          style={{ height: 28, padding: '0 14px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', background: 'white', color: '#0d0d12', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save
        </button>

        <button onClick={() => setShowExportModal(true)}
          style={{ height: 28, padding: '0 16px', borderRadius: 6, border: 'none', background: '#ff6b35', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>

      {/* Editor workspace */}
      <AppLayout />
    </div>
  );
}
