'use client';

import { Palette } from 'lucide-react';
import { SiteTheme, useTheme } from '@/app/providers/ThemeProvider';

const THEMES: Array<{ value: SiteTheme; label: string }> = [
  { value: 'classic', label: 'Classic (Default)' },
  { value: 'contrast-light', label: 'High Contrast Light' },
  { value: 'contrast-dark', label: 'High Contrast Dark' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'sunrise', label: 'Sunrise' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      <label className="flex items-center gap-2 rounded-full border border-[#d7d5c8] bg-[#ffffffee] backdrop-blur-md px-3 py-2 shadow-[0_10px_30px_rgba(20,20,20,0.08)]">
        <Palette className="h-4 w-4 text-[#5f5a45]" />
        <span className="text-xs font-semibold text-[#5f5a45]">Theme</span>
        <select
          value={theme}
          onChange={(event) => setTheme(event.target.value as SiteTheme)}
          className="rounded-full border border-[#d7d5c8] bg-white px-2 py-1 text-xs font-medium text-[#3f3b2d] focus:outline-none focus:ring-2 focus:ring-[#b7b39a]"
          aria-label="Select website theme"
        >
          {THEMES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
