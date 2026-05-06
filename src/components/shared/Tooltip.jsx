import React, { useState } from 'react';

export default function Tooltip({ label, side = 'right', children }) {
  const [visible, setVisible] = useState(false);

  const positionStyle = {};
  if (side === 'right') {
    positionStyle.left = 'calc(100% + 8px)';
    positionStyle.top = '50%';
    positionStyle.transform = 'translateY(-50%)';
  } else if (side === 'left') {
    positionStyle.right = 'calc(100% + 8px)';
    positionStyle.top = '50%';
    positionStyle.transform = 'translateY(-50%)';
  } else if (side === 'top') {
    positionStyle.bottom = 'calc(100% + 8px)';
    positionStyle.left = '50%';
    positionStyle.transform = 'translateX(-50%)';
  } else if (side === 'bottom') {
    positionStyle.top = 'calc(100% + 8px)';
    positionStyle.left = '50%';
    positionStyle.transform = 'translateX(-50%)';
  }

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          style={{
            position: 'absolute',
            ...positionStyle,
            background: '#0d0d12',
            color: 'white',
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            padding: '4px 10px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
