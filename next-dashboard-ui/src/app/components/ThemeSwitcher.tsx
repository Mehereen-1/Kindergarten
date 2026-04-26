'use client';

import { Moon, Palette, Sun } from 'lucide-react';
import { SiteTheme, useTheme } from '@/app/providers/ThemeProvider';

const THEMES: Array<{ value: SiteTheme; label: string }> = [
  { value: 'classic', label: 'Classic (Default)' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'sunrise', label: 'Sunrise' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme, colorMode, toggleColorMode } = useTheme();
  const isDark = colorMode === 'dark';

  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      <div className="flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--color-outline-variant)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-surface-low)_88%,transparent)] backdrop-blur-md px-3 py-2 shadow-[0_10px_30px_rgba(20,20,20,0.14)]">
        <label className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-[var(--color-on-surface-variant)]" />
          <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Theme</span>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as SiteTheme)}
            className="rounded-full border border-[color:color-mix(in_srgb,var(--color-outline-variant)_40%,transparent)] bg-[var(--color-surface)] px-2 py-1 text-xs font-medium text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            aria-label="Select website theme"
          >
            {THEMES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={toggleColorMode}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-[color:color-mix(in_srgb,var(--color-outline-variant)_40%,transparent)] bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
