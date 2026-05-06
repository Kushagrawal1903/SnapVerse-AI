import React from 'react';
import useUIStore from '../../stores/useUIStore';
import useAuthStore from '../../stores/useAuthStore';
import useProjectStore from '../../stores/useProjectStore';

export default function DashboardLayout({ children, currentTab }) {
  const setCurrentView = useUIStore(s => s.setCurrentView);
  const user = useAuthStore(s => s.user);

  const handleCreateProject = () => {
    useProjectStore.getState().resetProject();
    setCurrentView('editor');
  };

  return (
    <div className="flex h-screen bg-background text-on-background font-body-md overflow-hidden">
      {/* SIDEBAR */}
      <aside className="flex flex-col justify-between py-4 w-20 bg-surface-container-low border-r border-outline-variant z-40">
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="mb-4 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden mb-2 border border-outline-variant">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-outline">person</span>
              )}
            </div>
          </div>
          
          <button onClick={() => setCurrentView('dashboard')} className="w-full px-2 group">
            <div className={`flex flex-col items-center justify-center rounded-xl m-1 p-2 transition-all cursor-pointer ${currentTab === 'dashboard' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: currentTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>folder_open</span>
              <span className="font-label-sm text-[10px] text-center">Projects</span>
            </div>
          </button>
          
          <button onClick={() => setCurrentView('assetStore')} className="w-full px-2 group">
            <div className={`flex flex-col items-center justify-center rounded-xl m-1 p-2 transition-all cursor-pointer ${currentTab === 'assetStore' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: currentTab === 'assetStore' ? "'FILL' 1" : "'FILL' 0" }}>auto_awesome</span>
              <span className="font-label-sm text-[10px] text-center">Store</span>
            </div>
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-2 w-full">
          <button onClick={handleCreateProject} className="w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center mb-4 hover:bg-surface-tint transition-colors shadow-sm cursor-pointer" title="New Project">
            <span className="material-symbols-outlined">add</span>
          </button>
          
          <button className="w-full px-2">
            <div className="flex flex-col items-center justify-center text-on-surface-variant p-2 hover:bg-surface-container-high transition-all rounded-xl m-1 cursor-pointer">
              <span className="material-symbols-outlined mb-1">help_outline</span>
              <span className="font-label-sm text-[10px] text-center">Help</span>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        {/* TOP NAV */}
        <nav className="flex justify-between items-center px-6 h-16 w-full bg-surface border-b border-outline-variant flex-shrink-0">
          <div className="flex items-center gap-6">
            <span className="font-display text-2xl font-black text-primary tracking-tight flex items-center gap-1">
              SnapVerse
            </span>
            <div className="relative hidden md:flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline-variant" style={{ fontSize: 20 }}>search</span>
              <input className="pl-10 pr-4 py-2 w-64 rounded-full bg-surface-container-low text-on-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary font-body-md placeholder:text-outline outline-none transition-all" placeholder={currentTab === 'dashboard' ? "Search projects..." : "Search assets..."} type="text" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="font-label-sm text-primary border border-primary px-4 py-2 rounded-lg hover:bg-primary-fixed transition-colors">Upgrade</button>
            <button onClick={() => useAuthStore.getState().signOut()} className="font-label-sm text-on-surface-variant hover:text-on-surface transition-colors">Sign Out</button>
          </div>
        </nav>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
