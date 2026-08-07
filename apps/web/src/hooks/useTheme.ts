'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'codesphere-theme';
const THEME_EVENT = 'codesphere-theme-change';

// Apply theme to DOM and dispatch cross-component event
function applyTheme(newTheme: Theme) {
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
  // Dispatch custom event so all useTheme instances sync immediately
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme: newTheme } }));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    // Read stored theme or system preference
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    let initial: Theme;
    if (stored === 'light' || stored === 'dark') {
      initial = stored;
    } else {
      initial = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    setThemeState(initial);
    document.documentElement.setAttribute('data-theme', initial);

    // Listen for theme changes dispatched from any component
    const handleThemeEvent = (e: Event) => {
      const { theme: newTheme } = (e as CustomEvent<{ theme: Theme }>).detail;
      setThemeState(newTheme);
    };

    window.addEventListener(THEME_EVENT, handleThemeEvent);
    return () => window.removeEventListener(THEME_EVENT, handleThemeEvent);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
