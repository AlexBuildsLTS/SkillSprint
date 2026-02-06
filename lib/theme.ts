import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  lazy,
  Suspense,
} from 'react';

import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode } from 'react';

export type Theme = typeof lightTheme;

export const THEMES = {
  light: 'light',
  dark: 'dark',
} as const;

export type ThemeType = (typeof THEMES)[keyof typeof THEMES];

const THEME_STORAGE_KEY = 'THEME_MODE';

export const COLORS = {
  primary: '#6366f1',
  secondary: '#94a3b8',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  obsidian: '#020617',
  slate: '#64748b',
  white: '#ffffff',
} as const;

export const lightTheme = {
  // Professional Light Theme
  background: '#f8fafc', // Slate 50
  foreground: '#0f172a', // Slate 900
  card: '#ffffff',
  cardForeground: '#0f172a',
  popover: '#ffffff',
  popoverForeground: '#0f172a',
  primary: '#6366f1', // Indigo 500
  primaryForeground: '#ffffff',
  secondary: '#f1f5f9', // Slate 100
  secondaryForeground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b', // Slate 500
  accent: '#f1f5f9',
  accentForeground: '#0f172a',
  destructive: '#ef4444', // Red 500
  destructiveForeground: '#ffffff',
  border: '#e2e8f0', // Slate 200
  input: '#e2e8f0',
  ring: '#6366f1',
  obsidian: '#f8fafc', // Swapped for light theme
  indigo: '#6366f1',
  slate: '#64748b',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  white: '#0f172a', // text color
  glass: {
    bg: 'rgba(255, 255, 255, 0.8)',
    card: 'rgba(255, 255, 255, 0.9)',
    primary: '#6366f1',
    text: '#0f172a',
    white: '#0f172a',
  },
  linearGradient: ['#f8fafc', '#e2e8f0'],
};

export const glassTheme = {
  // Glassmorphism Theme
  background: '#020617',
  foreground: '#f8fafc',
  card: 'rgba(15, 23, 42, 0.8)',
  cardForeground: '#f8fafc',
  popover: 'rgba(2, 6, 23, 0.9)',
  popoverForeground: '#f8fafc',
  primary: '#6366f1',
  primaryForeground: '#ffffff',
  secondary: 'rgba(30, 41, 59, 0.7)',
  secondaryForeground: '#f8fafc',
  muted: 'rgba(30, 41, 59, 0.5)',
  mutedForeground: '#94a3b8',
  accent: 'rgba(99, 102, 241, 0.15)',
  accentForeground: '#6366f1',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  border: 'rgba(255, 255, 255, 0.1)',
  input: 'rgba(255, 255, 255, 0.05)',
  ring: '#6366f1',
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  white: '#ffffff',
  glass: {
    bg: 'rgba(15, 23, 42, 0.8)',
    card: 'rgba(15, 23, 42, 0.9)',
    primary: '#6366f1',
    text: '#94a3b8',
    white: '#ffffff',
    border: 'rgba(255, 255, 255, 0.1)',
    input: 'rgba(255, 255, 255, 0.05)',
    ring: '#6366f1',
    obsidian: '#020617',
    indigo: '#6366f1',
    slate: '#94a3b8',
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
  },
  linearGradient: ['#020617', '#1e1b4b'],
};

export const darkTheme = {
  // Existing Dark Theme
  background: '#020617', // Obsidian
  foreground: '#f8fafc', // Slate 50
  card: '#0f172a', // Slate 900
  cardForeground: '#f8fafc',
  popover: '#020617',
  popoverForeground: '#f8fafc',
  primary: '#6366f1', // Indigo 500
  primaryForeground: '#ffffff',
  secondary: '#1e293b', // Slate 800
  secondaryForeground: '#f8fafc',
  muted: '#1e293b',
  mutedForeground: '#94a3b8', // Slate 400
  accent: '#1e293b',
  accentForeground: '#f8fafc',
  destructive: '#ef4444', // Red 500
  destructiveForeground: '#ffffff',
  border: '#1e293b',
  input: '#1e293b',
  ring: '#6366f1',
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  white: '#ffffff',
  glass: {
    bg: 'rgba(15, 23, 42, 0.8)',
    card: 'rgba(15, 23, 42, 0.9)',
    primary: '#6366f1',
    text: '#94a3b8',
    white: '#ffffff',
  },
  linearGradient: ['#020617', '#0f172a'],
};

interface ThemeContextType {
  theme: typeof lightTheme | typeof darkTheme;
  colorScheme: 'light' | 'dark';
  toggleTheme: () => void;
  isDark: boolean;
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState(darkTheme);
  const value: ThemeContextType = {
    theme: currentTheme,
    colorScheme: colorScheme ?? 'dark',
    toggleTheme: () => {},
    isDark: colorScheme === 'dark',
  };

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          const newColorScheme = savedTheme as 'light' | 'dark';
          setColorScheme(newColorScheme);
          setCurrentTheme(newColorScheme === 'dark' ? darkTheme : lightTheme);
        } else {
          // default to dark
          setColorScheme('dark');
          setCurrentTheme(darkTheme);
        }
      } catch (error) {
        console.error('Failed to load theme from storage', error);
        // default to dark
        setColorScheme('dark');
        setCurrentTheme(darkTheme);
      }
    };
    loadTheme();
  }, [setColorScheme]);

  const toggleTheme = useCallback(async () => {
    const newColorScheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(newColorScheme);
    setCurrentTheme(newColorScheme === 'dark' ? darkTheme : lightTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newColorScheme);
    } catch (error) {
      console.error('Failed to save theme to storage', error);
    }
  }, [colorScheme, setColorScheme]);
};
