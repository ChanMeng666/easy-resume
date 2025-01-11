'use client';

import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-4 left-4 bg-background-paper text-foreground px-4 py-2 rounded-full shadow-lg hover:bg-primary-main hover:text-white transition-colors print:hidden"
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? '🌞' : '🌙'}
    </button>
  );
} 