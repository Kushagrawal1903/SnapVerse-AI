import React from 'react';
import useToastStore from '../../stores/useToastStore';

const TYPE_STYLES = {
  success: { borderColor: '#1D9E75', bg: 'rgba(29,158,117,0.08)', icon: '✓', iconColor: '#1D9E75' },
  info:    { borderColor: '#5b4ff5', bg: 'rgba(91,79,245,0.06)', icon: 'ℹ', iconColor: '#5b4ff5' },
  warning: { borderColor: '#EF9F27', bg: 'rgba(239,159,39,0.08)', icon: '⚠', iconColor: '#EF9F27' },
  error:   { borderColor: '#E24B4A', bg: 'rgba(226,75,74,0.08)', icon: '✕', iconColor: '#E24B4A' },
};

function ToastItem({ toast }) {
  const dismissToast = useToastStore(s => s.dismissToast);
  const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'white',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
        borderLeft: `3.5px solid ${style.borderColor}`,
        minWidth: 280,
        maxWidth: 420,
        animation: toast.exiting ? 'toastExit 0.25s ease-in forwards' : 'toastEnter 0.3s ease-out',
        pointerEvents: 'auto',
        fontSize: 13,
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Icon */}
      <span style={{
        fontSize: 14, fontWeight: 700, color: style.iconColor,
        width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {toast.type === 'success' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={style.iconColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : toast.type === 'error' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={style.iconColor} strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : toast.type === 'warning' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={style.iconColor} strokeWidth="2.5" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={style.iconColor} strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
      </span>

      {/* Message */}
      <span style={{ flex: 1, lineHeight: 1.4, fontWeight: 500 }}>{toast.message}</span>

      {/* Action button */}
      {toast.action && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.action.onClick();
            dismissToast(toast.id);
          }}
          style={{
            background: 'none', border: 'none', color: '#5b4ff5',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap',
            fontFamily: 'var(--font-body)',
          }}
        >
          {toast.action.label}
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={() => dismissToast(toast.id)}
        style={{
          background: 'none', border: 'none', color: 'var(--color-text-muted)',
          cursor: 'pointer', padding: 2, fontSize: 14, lineHeight: 1, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore(s => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 240, // Above the timeline (220px) + some padding
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
