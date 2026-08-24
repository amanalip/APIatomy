import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('apiatomy_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  });

  // Listen to OS system color-scheme changes if user hasn't explicitly set preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apiatomy_theme');
      if (saved) return;

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setThemeState(e.matches ? 'dark' : 'light');
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (typeof (mediaQuery as any).addListener === 'function') {
        (mediaQuery as any).addListener(handleChange);
        return () => (mediaQuery as any).removeListener(handleChange);
      }
    } catch {
      // Ignore media query errors
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('apiatomy_theme', next);
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem('apiatomy_theme', newTheme);
    } catch {
      // Ignore storage errors
    }
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
