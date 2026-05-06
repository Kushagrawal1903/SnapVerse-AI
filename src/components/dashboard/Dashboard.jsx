import React, { useEffect, useState } from 'react';
import useUIStore from '../../stores/useUIStore';
import useAuthStore from '../../stores/useAuthStore';
import useProjectStore from '../../stores/useProjectStore';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import DashboardLayout from '../layout/DashboardLayout';

export default function Dashboard() {
  const setCurrentView = useUIStore(s => s.setCurrentView);
  const user = useAuthStore(s => s.user);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!isSupabaseConfigured() || !user || user.id === 'local') {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
          
        if (data) setProjects(data);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjects();
  }, [user]);

  const handleCreateProject = () => {
    useProjectStore.getState().resetProject();
    setCurrentView('editor');
  };

  const handleOpenProject = (project) => {
    useProjectStore.getState().loadProject({
      projectId: project.id,
      projectName: project.name,
      aspectRatio: project.aspect_ratio || '16:9',
      tracks: project.timeline_state?.tracks || [],
      mediaItems: [] 
    });
    setCurrentView('editor');
  };

  return (
    <DashboardLayout currentTab="dashboard">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-h1 text-2xl text-on-surface mb-2 font-semibold">Projects Overview</h1>
          <p className="font-body-md text-on-surface-variant">Manage, organize, and create new visual experiences.</p>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant w-fit">
          <button className="px-4 py-1.5 rounded-md bg-surface text-primary font-label-sm shadow-sm border border-outline-variant">Personal</button>
          <button className="px-4 py-1.5 rounded-md text-on-surface-variant font-label-sm hover:text-on-surface transition-colors">Shared</button>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
        <div onClick={handleCreateProject} className="lg:col-span-2 relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary p-8 flex flex-col justify-between min-h-[240px] group cursor-pointer shadow-sm hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50"></div>
          <div className="relative z-10">
            <div className="bg-surface/20 w-fit p-2 rounded-lg backdrop-blur-sm mb-4">
              <span className="material-symbols-outlined text-on-primary">add_circle</span>
            </div>
            <h2 className="font-display text-2xl font-semibold text-on-primary mb-2">Start Blank Project</h2>
            <p className="font-body-lg text-primary-fixed-dim max-w-md">Open a clean workspace and build your narrative from scratch with total creative freedom.</p>
          </div>
          <div className="relative z-10 mt-6 flex items-center text-on-primary font-label-sm">
            <span className="mr-2 group-hover:translate-x-1 transition-transform">Create new</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:border-secondary transition-colors cursor-pointer group flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-secondary to-tertiary"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <span className="font-mono-label bg-surface-container px-2 py-1 rounded text-on-surface-variant uppercase text-[10px]">AI Template</span>
            </div>
            <h3 className="font-h2 text-lg font-semibold text-on-surface mb-1 group-hover:text-secondary transition-colors">Social Vlog Starter</h3>
            <p className="font-label-sm text-outline">Auto-cuts silences, applies bright LUT.</p>
          </div>

          <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:border-primary transition-colors cursor-pointer group flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-primary">movie</span>
              <span className="font-mono-label bg-surface-container px-2 py-1 rounded text-on-surface-variant uppercase text-[10px]">Template</span>
            </div>
            <h3 className="font-h2 text-lg font-semibold text-on-surface mb-1 group-hover:text-primary transition-colors">Cinematic Reel</h3>
            <p className="font-label-sm text-outline">24fps timeline with film grain presets.</p>
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-h2 text-xl font-semibold text-on-surface">Recent Projects</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-container-lowest border border-outline-variant border-dashed rounded-xl">
          <span className="material-symbols-outlined text-outline-variant text-4xl mb-4">folder_off</span>
          <p className="text-on-surface-variant font-body-md">No projects found. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
          {projects.map(project => (
            <div key={project.id} onClick={() => handleOpenProject(project)} className="group cursor-pointer flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-default hover:border-outline transition-all">
              <div className="aspect-video bg-surface-container relative overflow-hidden border-b border-outline-variant flex items-center justify-center">
                {project.thumbnail_url ? (
                  <img src={project.thumbnail_url} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <span className="material-symbols-outlined text-outline-variant text-[48px] font-light">movie</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-h2 text-on-surface truncate font-semibold pr-2">{project.name}</h3>
                  <button className="text-outline-variant hover:text-on-surface transition-colors mt-1" onClick={(e) => { e.stopPropagation(); }}>
                    <span className="material-symbols-outlined text-[18px]">more_vert</span>
                  </button>
                </div>
                <p className="font-body-md text-outline text-sm">
                  {new Date(project.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
