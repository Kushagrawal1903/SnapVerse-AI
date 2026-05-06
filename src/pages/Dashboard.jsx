import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useProjectStore from '../stores/useProjectStore';
import { loadUserProjects, createNewProject, deleteProject, duplicateProject, getProjectById } from '../services/projectService';
import DashboardTopbar from './dashboard/DashboardTopbar';
import DashboardSidebar from './dashboard/DashboardSidebar';
import { ProjectCard, ProjectGridSkeleton, EmptyProjectsState, NewProjectCard, TemplatesColumn } from './dashboard/DashboardCards';
import { showToast } from '../stores/useToastStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore(s => s.user);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('personal');
  const [sortBy, setSortBy] = useState('recent');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUserProjects()
      .then(p => { setProjects(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const openCreateModal = useCallback(() => {
    setNewProjectName('');
    setShowCreateModal(true);
  }, []);

  const handleConfirmCreate = useCallback(async (e) => {
    e?.preventDefault();
    const finalName = newProjectName.trim() || 'Untitled Project';
    setIsCreating(true);
    try {
      const project = await createNewProject({ name: finalName });
      if (project) {
        useProjectStore.getState().loadProject({
          projectId: project.id, projectName: project.name,
          aspectRatio: project.aspect_ratio, tracks: project.timeline_state?.tracks, mediaItems: [],
        });
        setShowCreateModal(false);
        setIsCreating(false);
        navigate(`/editor/${project.id}`);
      }
    } catch (err) { 
      console.error('Failed to create project', err); 
      showToast(err.message || 'Failed to create project', 'error');
      setIsCreating(false);
    }
  }, [navigate, newProjectName]);

  const handleCreateFromTemplate = useCallback(async (template) => {
    try {
      const project = await createNewProject({ name: template.title, ...template.preset });
      if (project) {
        useProjectStore.getState().loadProject({
          projectId: project.id, projectName: project.name,
          aspectRatio: project.aspect_ratio || template.preset.aspectRatio, tracks: project.timeline_state?.tracks, mediaItems: [],
        });
        navigate(`/editor/${project.id}`);
      }
    } catch (err) { 
      console.error('Failed to create from template', err); 
      showToast(err.message || 'Failed to create from template', 'error');
    }
  }, [navigate]);

  const handleOpenProject = useCallback((project) => {
    const open = async () => {
      const fullProject = await getProjectById(project.id);
      if (fullProject) {
        const ts = fullProject.timeline_state || {};
        const mediaItems = (fullProject.media_items || []).map(m => ({
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
          projectId: fullProject.id,
          projectName: fullProject.name,
          aspectRatio: fullProject.aspect_ratio || '9:16',
          tracks: ts.tracks || [],
          mediaItems,
        });
      } else {
        // Minimal fallback; EditorPage will attempt hydration by route ID.
        useProjectStore.getState().loadProject({
          projectId: project.id,
          projectName: project.name,
          aspectRatio: project.aspect_ratio || '9:16',
          tracks: [],
          mediaItems: [],
        });
      }
      navigate(`/editor/${project.id}`);
    };
    open().catch((err) => {
      console.error('Failed to open project', err);
      showToast('Failed to open project', 'error');
    });
  }, [navigate]);

  const handleDeleteProject = useCallback(async (id) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleDuplicateProject = useCallback(async (id) => {
    const dup = await duplicateProject(id);
    if (dup) setProjects(prev => [dup, ...prev]);
  }, []);

  const filtered = projects.filter(p =>
    !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'alphabetical') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'oldest') return new Date(a.updated_at) - new Date(b.updated_at);
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardTopbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNavigate={navigate} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <DashboardSidebar pathname={pathname} onNavigate={navigate} />
        <main style={{ flex: 1, overflowY: 'auto', background: '#f8f8fa' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px' }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 600, color: '#0d0d12', fontFamily: "'Syne', sans-serif", margin: 0 }}>Projects</h1>
              <p style={{ fontSize: 14, color: '#8888a0', margin: '6px 0 0' }}>Manage, organize, and create new visual experiences.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 40 }}>
              <NewProjectCard onCreate={openCreateModal} />
              <TemplatesColumn onCreateFromTemplate={handleCreateFromTemplate} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 0, background: '#ededf0', borderRadius: 8, padding: 3 }}>
                  {['personal', 'shared'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '6px 20px', borderRadius: 6, border: 'none', fontSize: 13,
                        fontWeight: activeTab === tab ? 500 : 400, cursor: 'pointer', transition: 'all 0.15s',
                        background: activeTab === tab ? 'white' : 'transparent',
                        color: activeTab === tab ? '#0d0d12' : '#8888a0',
                        boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  style={{ height: 32, padding: '0 10px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, fontSize: 13, background: 'white', cursor: 'pointer', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                  <option value="recent">Recent</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>

              {loading ? (
                <ProjectGridSkeleton count={8} />
              ) : sorted.length === 0 ? (
                <EmptyProjectsState onCreate={openCreateModal} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, paddingBottom: 32 }}>
                  {sorted.map(project => (
                    <ProjectCard key={project.id} project={project} onOpen={handleOpenProject} onDuplicate={handleDuplicateProject} onDelete={handleDeleteProject} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div style={{ padding: '24px 32px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: '#0d0d12' }}>Name Your Project</h3>
              <form onSubmit={handleConfirmCreate}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#0d0d12', display: 'block', marginBottom: 8 }}>Project Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Summer Vlog"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                    style={{ width: '100%', height: 40, fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                    style={{ padding: '0 20px', height: 36, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isCreating}
                    style={{ padding: '0 20px', height: 36, fontFamily: "'DM Sans', sans-serif", background: '#3b82f6', border: 'none' }}
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
