'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type SiteTheme =
  | 'classic'
  | 'ocean'
  | 'sunrise'
  | 'contrast-light'
  | 'contrast-dark';

type ThemeContextValue = {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
};

const STORAGE_KEY = 'site-theme';
const DEFAULT_THEME: SiteTheme = 'classic';

const VALID_THEMES: SiteTheme[] = [
  'classic',
  'ocean',
  'sunrise',
  'contrast-light',
  'contrast-dark',
];

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: SiteTheme) {
  document.documentElement.setAttribute('data-site-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SiteTheme | null;
      if (saved && VALID_THEMES.includes(saved)) {
        setTheme(saved);
        applyTheme(saved);
        return;
      }
    } catch {
      // Ignore localStorage read errors.
    }

    applyTheme(DEFAULT_THEME);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage write errors.
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
