import { Database } from '@/supabase/database.types';

/**
 * ============================================================================
 * 🛡️ CORE DATABASE TYPE HELPERS (Exported for Global Use)
 * ============================================================================
 */

// FIXED: Explicitly exporting the generic Tables helper
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Profile = Tables<'profiles'>;
export type UserStats = Tables<'user_stats'>;
export type TrackRow = Tables<'tracks'>;
export type LessonRow = Tables<'lessons'>;

/**
 * ============================================================================
 * 🏃 SPRINT & LESSON INTERFACE DEFINITIONS
 * ============================================================================
 */
export type SprintCardType = 'info' | 'mcq' | 'true_false';

export interface SprintCard {
  id?: string;
  type: SprintCardType;
  title: string;
  content: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  xp_reward?: number;
}

export interface SprintResult {
  xpEarned: number;
  questionsCorrect: number;
  totalQuestions?: number;
  newStreak: number;
}
