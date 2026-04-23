'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
interface ThemeCtx { theme: Theme; toggleTheme: () => void; isDark: boolean; }
const ThemeContext = createContext<ThemeCtx>({ theme: 'light', toggleTheme: () => {}, isDark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Read the class that the inline <script> already applied — avoids any flash
  const [theme, setTheme] = useState<Theme>(() => {
    // During SSR this runs on server — default light; client picks it up from DOM
    if (typeof window === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  // Keep DOM class and localStorage in sync whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('cs-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
