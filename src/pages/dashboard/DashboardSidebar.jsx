import React, { useState } from 'react';
import Tooltip from '../../components/shared/Tooltip';

export default function DashboardSidebar({ pathname, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const items = [
    {
      path: '/', label: 'Projects',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#3b82f6' : 'none'} stroke={active ? '#3b82f6' : '#8888a0'} strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
      )
    },
    {
      path: '/analyze', label: 'Reel Analyzer',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#3b82f6' : '#8888a0'} strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
        </svg>
      )
    },
    {
      path: '/breakdown', label: 'Viral Breakdown',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#3b82f6' : '#8888a0'} strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      )
    },
  ];

  return (
    <aside style={{
      width: expanded ? 220 : 72,
      boxSizing: 'border-box',
      flexShrink: 0,
      background: '#ffffff',
      borderRight: '1px solid rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      padding: expanded ? '16px 10px' : '16px 8px',
      gap: 6,
      transition: 'width 380ms cubic-bezier(0.2, 0.9, 0.2, 1), padding 380ms ease',
      overflow: 'hidden',
    }}
    onMouseEnter={() => setExpanded(true)}
    onMouseLeave={() => setExpanded(false)}>
      {items.map(item => {
        const active = pathname === item.path;
        const button = (
          <button onClick={() => onNavigate(item.path)}
            title={!expanded ? item.label : undefined}
            style={{
              width: expanded ? '100%' : 48,
              height: 44,
              borderRadius: 12,
              border: 'none',
              background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: expanded ? 'flex-start' : 'center',
              gap: expanded ? 12 : 0,
              padding: expanded ? '0 14px' : 0,
              margin: expanded ? '0' : '0 auto',
              transition: 'background 200ms ease, padding 380ms ease, transform 200ms ease',
            }}
            onMouseEnter={e => {
              if (!active) e.currentTarget.style.background = '#f5f5f7';
              e.currentTarget.style.transform = 'translateX(1px)';
            }}
            onMouseLeave={e => {
              if (!active) e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateX(0)';
            }}>
            <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {item.icon(active)}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? '#3b82f6' : '#5f6472',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              maxWidth: expanded ? 160 : 0,
              opacity: expanded ? 1 : 0,
              transform: expanded ? 'translateX(0)' : 'translateX(-8px)',
              transition: 'max-width 380ms ease, opacity 200ms ease, transform 280ms ease',
              pointerEvents: 'none',
            }}>
              {item.label}
            </span>
          </button>
        );
        return (
          expanded ? (
            <div key={item.path}>{button}</div>
          ) : (
            <Tooltip key={item.path} label={item.label} side="right">
              {button}
            </Tooltip>
          )
        );
      })}
      <div style={{ flex: 1 }} />
      <Tooltip label={!expanded ? 'Help' : ''} side="right">
        <button style={{
          width: expanded ? '100%' : 48,
          height: 44,
          borderRadius: 12,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          padding: expanded ? '0 14px' : 0,
          margin: expanded ? '0' : '0 auto',
          gap: 12,
          transition: 'background 200ms ease, padding 380ms ease, transform 200ms ease',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8888a0" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#5f6472',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            maxWidth: expanded ? 160 : 0,
            opacity: expanded ? 1 : 0,
            transform: expanded ? 'translateX(0)' : 'translateX(-8px)',
            transition: 'max-width 380ms ease, opacity 200ms ease, transform 280ms ease',
            pointerEvents: 'none'
          }}>
            Help
          </span>
        </button>
      </Tooltip>
    </aside>
  );
}
