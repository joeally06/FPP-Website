'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeConfig, getThemeById, THEME_PRESETS } from './theme-config';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (themeId: string) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(THEME_PRESETS.default);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active theme from API
  useEffect(() => {
    const fetchActiveTheme = async () => {
      try {
        const response = await fetch('/api/theme');
        if (response.ok) {
          const data = await response.json();
          let activeTheme = getThemeById(data.themeId || 'default');
          
          // Apply custom particle settings if they exist
          if (data.customParticles && data.customParticles[activeTheme.id]) {
            activeTheme = {
              ...activeTheme,
              particles: data.customParticles[activeTheme.id] as any
            };
          }
          
          setThemeState(activeTheme);
        }
      } catch (error) {
        console.error('Failed to fetch active theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveTheme();
  }, []);

  const setTheme = async (themeId: string) => {
    try {
      // Update theme in database
      const response = await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });

      if (response.ok) {
        const newTheme = getThemeById(themeId);
        setThemeState(newTheme);
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
