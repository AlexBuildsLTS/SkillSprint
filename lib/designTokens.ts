// lib/designTokens.ts
/**
 * ============================================================================
 * 🎨 SKILLSPRINT CENTRALIZED DESIGN TOKENS v1.0
 * ============================================================================
 * @description
 * Single source of truth for all styling. Replaces local THEME objects.
 * Guarantees visual consistency across Web, iOS, and Android APKs.
 * ============================================================================
 */

import { Platform } from "react-native";

export const Colors = {
  // Backgrounds
  obsidian: '#020617',      // Root background
  charcoal: '#0f172a',      // Card surface
  navy: '#1e293b',          // Input / muted surface

  // Brand
  indigo: '#6366f1',        // Primary CTA
  indigoDark: '#4338ca',    // Gradient end
  violet: '#8b5cf6',        // Sprint gradient

  // Accents
  emerald: '#10b981',       // Success / streak
  gold: '#fbbf24',          // XP rewards
  orange: '#f97316',        // Streak fire
  rose: '#f43f5e',          // Danger alt
  cyan: '#06b6d4',          // Info

  // Text
  white: '#f8fafc',         // Primary text
  slate: '#94a3b8',         // Secondary text
  muted: '#64748b',         // Tertiary / disabled

  // Chat Specific
  userBubble: '#6366f1',    // Indigo for user
  aiBubble: '#1e293b',      // Navy for AI
  errorBubble: 'rgba(244, 63, 94, 0.1)', // Subtle rose for system errors

  // Glass & Borders
  glassBorder: 'rgba(255,255,255,0.08)',
  glassBorderBright: 'rgba(255,255,255,0.12)',
  glassBg: 'rgba(15, 23, 42, 0.6)',
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 9999,
} as const;

export const Typography = {
  // Safe font fallback stack for cross-platform consistency
  family: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  code: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
} as const;