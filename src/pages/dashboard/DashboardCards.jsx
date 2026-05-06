import React, { useEffect, useRef, useState } from 'react';
import { formatDate } from '../../services/projectService';

export function ProjectCard({ project, onOpen, onDuplicate, onDelete, onRename }) {
  const [hovered, setHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return undefined;
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu]);

  const fallbackThumb = '#e5e7eb';

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'white', borderRadius: 12, overflow: 'visible',
        border: `1.5px solid ${hovered ? 'rgba(59,130,246,0.3)' : 'rgba(0,0,0,0.07)'}`,
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        zIndex: showMenu ? 50 : hovered ? 5 : 1,
      }}
      onClick={() => onOpen(project)}>
      <div style={{ aspectRatio: '16/9', background: '#ededf0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: fallbackThumb }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(13,13,18,0.45)" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="4"/>
              <polygon points="10 8 16 12 10 16 10 8" fill="rgba(13,13,18,0.45)" stroke="none"/>
            </svg>
            <span style={{ fontSize: 11, color: 'rgba(13,13,18,0.62)', fontWeight: 600 }}>
              {project.aspect_ratio ?? '9:16'} · {(project.name || 'Project').slice(0, 24)}
            </span>
          </div>
        )}
        {project.target_platform && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 500, color: 'white' }}>
            {project.target_platform}
          </div>
        )}
        {hovered && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#5b4ff5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#0d0d12', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
          <div style={{ fontSize: 11, color: '#9999b0', marginTop: 2 }}>{formatDate(project.updated_at)}</div>
        </div>
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowMenu(!showMenu)}
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: showMenu ? '#ededf0' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#ededf0'}
            onMouseLeave={e => !showMenu && (e.currentTarget.style.background = 'transparent')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#8888a0">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {showMenu && <ProjectCardMenu project={project} onClose={() => setShowMenu(false)} onOpen={onOpen} onDuplicate={onDuplicate} onDelete={onDelete} onRename={onRename} />}
        </div>
      </div>
    </div>
  );
}

function ProjectCardMenu({ project, onClose, onOpen, onDuplicate, onDelete }) {
  return (
    <div style={{ position: 'absolute', right: 0, top: 32, minWidth: 160, zIndex: 100, background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '4px 0' }}>
      {[
        { label: 'Open', action: () => onOpen(project) },
        { label: 'Duplicate', action: () => onDuplicate(project.id) },
        { separator: true },
        { label: 'Delete', action: () => onDelete(project.id), danger: true },
      ].map((item, i) => item.separator ? (
        <div key={i} style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '3px 0' }} />
      ) : (
        <button key={i} onClick={() => { item.action(); onClose(); }}
          style={{ width: '100%', padding: '8px 14px', border: 'none', textAlign: 'left', background: 'transparent', cursor: 'pointer', fontSize: 13, color: item.danger ? '#E24B4A' : '#0d0d12', transition: 'background 0.1s', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(226,75,74,0.06)' : '#f5f5f7'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ProjectGridSkeleton({ count = 8 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.07)' }}>
          <div style={{ aspectRatio: '16/9', background: '#ededf0', animation: 'shimmerPulse 1.5s ease-in-out infinite alternate' }} />
          <div style={{ padding: '10px 12px' }}>
            <div style={{ height: 13, width: '60%', background: '#ededf0', borderRadius: 4, animation: 'shimmerPulse 1.5s ease-in-out infinite alternate', marginBottom: 6 }} />
            <div style={{ height: 11, width: '40%', background: '#ededf0', borderRadius: 4, animation: 'shimmerPulse 1.5s ease-in-out infinite alternate' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyProjectsState({ onCreate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5b4ff5" strokeWidth="1.5">
          <rect x="2" y="2" width="20" height="20" rx="4"/>
          <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0d0d12', margin: '0 0 8px', fontFamily: "'Syne', sans-serif" }}>No projects yet</h3>
        <p style={{ fontSize: 14, color: '#8888a0', margin: 0 }}>Create your first project and start editing</p>
      </div>
      <button onClick={onCreate}
        style={{ height: 40, padding: '0 24px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 8, boxShadow: '0 4px 12px rgba(59,130,246,0.3)', fontFamily: "'DM Sans', sans-serif" }}>
        + New Project
      </button>
    </div>
  );
}

export function NewProjectCard({ onCreate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onCreate} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 24px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset' : '0 8px 24px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 280,
      }}>
      
      {/* Background Image with Zoom on Hover */}
      <div style={{
        position: 'absolute', inset: -2, zIndex: 0,
        backgroundImage: "url('/assets/start_project_bg.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        transition: 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }} />

      {/* Dark Gradient Overlay for Text Readability */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to bottom, rgba(13,13,18,0) 0%, rgba(13,13,18,0.1) 40%, rgba(13,13,18,0.95) 100%)',
        transition: 'opacity 0.4s ease',
        opacity: hovered ? 1 : 0.85,
      }} />

      {/* Badge at the top left */}
      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 2 }}>
        <div style={{ 
          display: 'inline-block', padding: '5px 12px', borderRadius: 99, 
          border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
          fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif"
        }}>
          Workspace
        </div>
      </div>

      {/* Content at the bottom */}
      <div style={{ position: 'relative', zIndex: 2, padding: '36px 24px 32px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: 0, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Start Blank Project
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", fontWeight: 400, maxWidth: '90%' }}>
          Open a clean canvas and build your narrative from scratch. Powered by SnapVerse Engine.
        </p>
      </div>
    </div>
  );
}

export function TemplatesColumn({ onCreateFromTemplate }) {
  const templates = [
    { id: 'social-vlog', category: 'AI Template', categoryColor: '#00b894', title: 'Social Vlog Starter', description: 'Auto-cuts silences, applies bright LUT.', preset: { aspectRatio: '9:16', targetPlatform: 'TikTok' } },
    { id: 'cinematic-reel', category: 'Template', categoryColor: '#3b82f6', title: 'Cinematic Reel', description: '24fps timeline with film grain presets.', preset: { aspectRatio: '9:16', targetPlatform: 'Instagram Reels' } },
    { id: 'product-showcase', category: 'Template', categoryColor: '#ff6b35', title: 'Product Showcase', description: 'Clean cuts, text overlays, zoom transitions.', preset: { aspectRatio: '1:1', targetPlatform: 'Instagram Reels' } },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {templates.map(t => (
        <div key={t.id} onClick={() => onCreateFromTemplate(t)}
          style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'all 0.15s', flex: 1 }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={t.categoryColor}>
                {t.category === 'AI Template' ? <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> : <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>}
              </svg>
              <span style={{ fontSize: 11, fontWeight: 500, color: t.categoryColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.category}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c0c0c8" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0d0d12', marginBottom: 3 }}>{t.title}</div>
          <div style={{ fontSize: 12, color: '#8888a0', lineHeight: 1.4 }}>{t.description}</div>
        </div>
      ))}
    </div>
  );
}
