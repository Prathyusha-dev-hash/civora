import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/useTheme';

export function ThemeToggle({ className = '' }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Current theme is ${theme}. Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C97B0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E7EEF5] dark:focus-visible:ring-offset-[#263746] ${
        isDark
          ? 'bg-[#202C38] hover:bg-[#2D3C49] text-[#F2F5F8] border border-[#40515F] shadow-xs'
          : 'bg-white hover:bg-[#F7F9FB] text-[#2E4A62] border border-[#E1E7EE] shadow-2xs'
      } ${className}`}
    >
      <div className="relative flex items-center justify-center w-4 h-4">
        {isDark ? (
          <Moon className="w-4 h-4 text-[#8FAFCB] transition-transform duration-200 group-hover:-rotate-12" />
        ) : (
          <Sun className="w-4 h-4 text-[#B7791F] transition-transform duration-200 group-hover:rotate-45" />
        )}
      </div>

      <span className="font-semibold tracking-wide">
        {isDark ? 'Dark' : 'Light'}
      </span>

      {/* Visual Indicator Dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full transition-colors ${
          isDark ? 'bg-[#8FAFCB]' : 'bg-[#7C97B0]'
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

export default ThemeToggle;
