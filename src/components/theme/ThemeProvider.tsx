'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

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
  const isSyncingRef = useRef(false);

  // Apply theme to DOM and optionally sync to Electron
  const applyTheme = (targetTheme: Theme, syncElectron: boolean = true) => {
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

    // Only sync with Electron native chrome when explicitly requested
    if (syncElectron && typeof window !== 'undefined' && window.electronAPI?.theme?.set) {
      isSyncingRef.current = true;
      window.electronAPI.theme.set(targetTheme)
        .catch(console.error)
        .finally(() => {
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 150);
        });
    }
  };

  useEffect(() => {
    // Read stored theme from localStorage or default to dark
    const stored = (localStorage.getItem('cineflow_theme') as Theme) || 'dark';
    setThemeState(stored);
    applyTheme(stored, true);

    // Listen to system changes if in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      setThemeState(current => {
        if (current === 'system') {
          applyTheme('system', false);
        }
        return current;
      });
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    // Listen to Electron IPC theme changes from native OS
    let unsubscribe: (() => void) | undefined;
    if (typeof window !== 'undefined' && window.electronAPI?.theme?.onChange) {
      unsubscribe = window.electronAPI.theme.onChange(({ theme: incomingTheme }) => {
        if (isSyncingRef.current) return;
        if (incomingTheme === 'dark' || incomingTheme === 'light' || incomingTheme === 'system') {
          setThemeState(incomingTheme);
          applyTheme(incomingTheme, false); // DO NOT echo back to Electron
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
    applyTheme(newTheme, true);
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
