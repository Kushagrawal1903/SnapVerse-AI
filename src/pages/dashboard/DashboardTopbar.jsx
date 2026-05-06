import React, { useState, useRef, useEffect } from 'react';
import useAuthStore from '../../stores/useAuthStore';

export default function DashboardTopbar({ searchQuery, setSearchQuery, onNavigate }) {
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header style={{
      height: 56, display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16, flexShrink: 0,
      background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.08)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        onClick={() => onNavigate('/')}>
        <span style={{ color: '#0d0d12' }}>Snap</span>
        <span style={{ color: '#3b82f6' }}>Verse</span>
      </div>

      <div style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
        <input type="text" placeholder="Search projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', height: 36, padding: '0 12px 0 36px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 14, background: '#f5f5f7', outline: 'none', transition: 'border-color 0.15s, background 0.15s', fontFamily: "'DM Sans', sans-serif" }}
          onFocus={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#3b82f6'; }}
          onBlur={e => { e.target.style.background = '#f5f5f7'; e.target.style.borderColor = 'rgba(0,0,0,0.12)'; }}
        />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9999b0" strokeWidth="2"
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>

      <div style={{ flex: 1 }} />



      <div style={{ position: 'relative' }} ref={menuRef}>
        <button onClick={() => setShowUserMenu(!showUserMenu)}
          style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#3b82f6', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {user?.email?.[0]?.toUpperCase() ?? 'U'}
        </button>
        {showUserMenu && (
          <div style={{ position: 'absolute', right: 0, top: 42, minWidth: 200, background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0d0d12' }}>{user?.user_metadata?.full_name ?? 'User'}</div>
              <div style={{ fontSize: 12, color: '#8888a0', marginTop: 2 }}>{user?.email}</div>
            </div>
            {[
              { label: 'My Projects', action: () => onNavigate('/') },
              { label: 'Account Settings', action: () => {} },
              { separator: true },
              { label: 'Sign Out', action: () => signOut(), danger: true },
            ].map((item, i) => item.separator ? (
              <div key={i} style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
            ) : (
              <button key={i} onClick={() => { item.action(); setShowUserMenu(false); }}
                style={{ width: '100%', padding: '10px 16px', border: 'none', textAlign: 'left', background: 'transparent', cursor: 'pointer', fontSize: 13, color: item.danger ? '#E24B4A' : '#0d0d12', transition: 'background 0.1s', fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(226,75,74,0.06)' : '#f5f5f7'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
