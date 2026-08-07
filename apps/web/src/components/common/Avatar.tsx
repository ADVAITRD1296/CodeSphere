'use client';

import React from 'react';

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  isOnline?: boolean;
  showStatus?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  color = '#89b4fa',
  size = 28,
  isOnline = false,
  showStatus = false,
  className = '',
  style = {},
}) => {
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        color: '#11111b',
        fontWeight: 700,
        fontSize: `${Math.max(10, Math.floor(size * 0.45))}px`,
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        ...style,
      }}
    >
      <span>{initial}</span>
      {showStatus && (
        <div
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: `${Math.max(6, Math.floor(size * 0.3))}px`,
            height: `${Math.max(6, Math.floor(size * 0.3))}px`,
            borderRadius: '50%',
            backgroundColor: isOnline ? 'var(--green)' : 'var(--overlay0)',
            border: '2px solid var(--crust)',
          }}
        />
      )}
    </div>
  );
};
