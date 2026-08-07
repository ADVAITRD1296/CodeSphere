'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  iconColor = 'var(--blue)',
  style = {},
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
        color: 'var(--subtext0)',
        userSelect: 'none',
        ...style,
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          backgroundColor: 'var(--mantle)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
        }}
      >
        <Icon size={26} style={{ color: iconColor, opacity: 0.85 }} />
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: '0.82rem', color: 'var(--subtext0)', maxWidth: '280px', marginBottom: actionLabel ? '16px' : '0' }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};
