'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Apply theme to DOM and Electron
  const applyTheme = (targetTheme: Theme) => {
    let active: ResolvedTheme = 'dark';

    if (targetTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      active = prefersDark ? 'dark' : 'light';
    } else {
      active = targetTheme;
    }

    setResolvedTheme(active);

    const root = document.documentElement;
    if (active === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Sync with Electron native chrome & titlebar
    if (typeof window !== 'undefined' && window.electronAPI?.theme?.set) {
      window.electronAPI.theme.set(targetTheme).catch(console.error);
    }
  };

  useEffect(() => {
    setMounted(true);

    // Read stored theme from localStorage or default to dark
    const stored = (localStorage.getItem('cineflow_theme') as Theme) || 'dark';
    setThemeState(stored);
    applyTheme(stored);

    // Listen to system changes if in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    // Listen to Electron IPC theme changes
    let unsubscribe: (() => void) | undefined;
    if (typeof window !== 'undefined' && window.electronAPI?.theme?.onChange) {
      unsubscribe = window.electronAPI.theme.onChange(({ theme: incomingTheme }) => {
        if (incomingTheme === 'dark' || incomingTheme === 'light' || incomingTheme === 'system') {
          setThemeState(incomingTheme);
          applyTheme(incomingTheme);
        }
      });
    }

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      unsubscribe?.();
    };
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('cineflow_theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
