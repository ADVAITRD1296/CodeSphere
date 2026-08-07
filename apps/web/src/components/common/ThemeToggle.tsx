'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export const ThemeToggle: React.FC<{ style?: React.CSSProperties; className?: string }> = ({ style, className }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`ide-pill-btn ${className || ''}`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle theme"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        fontSize: '0.78rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      {theme === 'dark' ? (
        <>
          <Sun size={14} style={{ color: 'var(--yellow)', transition: 'transform 0.3s ease' }} />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon size={14} style={{ color: 'var(--blue)', transition: 'transform 0.3s ease' }} />
          <span>Dark</span>
        </>
      )}
    </button>
  );
};
