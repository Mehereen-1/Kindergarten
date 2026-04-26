'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type SiteTheme = 'classic' | 'ocean' | 'sunrise';
export type ColorMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: SiteTheme;
  colorMode: ColorMode;
  setTheme: (theme: SiteTheme) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
};

const THEME_STORAGE_KEY = 'site-theme';
const MODE_STORAGE_KEY = 'site-color-mode';
const DEFAULT_THEME: SiteTheme = 'classic';
const DEFAULT_MODE: ColorMode = 'light';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: SiteTheme, mode: ColorMode) {
  document.documentElement.setAttribute('data-site-theme', theme);
  document.documentElement.setAttribute('data-color-mode', mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [colorMode, setColorMode] = useState<ColorMode>(DEFAULT_MODE);

  useEffect(() => {
    let resolvedTheme: SiteTheme = DEFAULT_THEME;
    let resolvedMode: ColorMode = DEFAULT_MODE;

    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as SiteTheme | null;
      if (saved === 'classic' || saved === 'ocean' || saved === 'sunrise') {
        resolvedTheme = saved;
      }
      const savedMode = localStorage.getItem(MODE_STORAGE_KEY) as ColorMode | null;
      if (savedMode === 'light' || savedMode === 'dark') {
        resolvedMode = savedMode;
      }
    } catch {
      // Ignore localStorage read errors.
    }

    setTheme(resolvedTheme);
    setColorMode(resolvedMode);
    applyTheme(resolvedTheme, resolvedMode);
  }, []);

  useEffect(() => {
    applyTheme(theme, colorMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(MODE_STORAGE_KEY, colorMode);
    } catch {
      // Ignore localStorage write errors.
    }
  }, [theme, colorMode]);

  const value = useMemo(
    () => ({
      theme,
      colorMode,
      setTheme,
      setColorMode,
      toggleColorMode: () => setColorMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    }),
    [theme, colorMode]
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
