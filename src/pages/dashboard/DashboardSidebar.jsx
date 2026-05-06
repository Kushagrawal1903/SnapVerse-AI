import React from 'react';
import Tooltip from '../../components/shared/Tooltip';

export default function DashboardSidebar({ pathname, onNavigate }) {
  const items = [
    {
      path: '/', label: 'Projects',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#5b4ff5' : 'none'} stroke={active ? '#5b4ff5' : '#8888a0'} strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
      )
    },
    {
      path: '/analyze', label: 'Reel Analyzer',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#5b4ff5' : '#8888a0'} strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
        </svg>
      )
    },
    {
      path: '/breakdown', label: 'Viral Breakdown',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#5b4ff5' : '#8888a0'} strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      )
    },
  ];

  return (
    <aside style={{
      width: 64, flexShrink: 0, background: '#ffffff',
      borderRight: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 4,
    }}>
      {items.map(item => {
        const active = pathname === item.path;
        return (
          <Tooltip key={item.path} label={item.label} side="right">
            <button onClick={() => onNavigate(item.path)}
              style={{
                width: 44, height: 44, borderRadius: 10, border: 'none',
                background: active ? 'rgba(91,79,245,0.1)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
              }}
              onMouseEnter={e => !active && (e.currentTarget.style.background = '#f5f5f7')}
              onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}>
              {item.icon(active)}
            </button>
          </Tooltip>
        );
      })}
      <div style={{ flex: 1 }} />
      <Tooltip label="Help" side="right">
        <button style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8888a0" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </button>
      </Tooltip>
    </aside>
  );
}
