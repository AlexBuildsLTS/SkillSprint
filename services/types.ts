import { Database } from '@/supabase/database.types';

// --- DATABASE HELPERS ---
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Profile = Tables<'profiles'>;
export type UserStats = Tables<'user_stats'>;
export type Track = Tables<'tracks'>;
export type Lesson = Tables<'lessons'>;

// --- SPRINT & AI TYPES ---
export interface SprintCard {
  title: string;
  description?: string;
  content: string;
  type: 'code' | 'quiz' | 'info';
  codeSnippet?: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
}

export interface SprintResult {
  xpEarned: number;
  questionsCorrect: number;
  totalQuestions: number;
  newStreak: number;
}

// --- DASHBOARD ANALYTICS TYPES ---
export interface TrackXPStats {
  track_title: string;
  total_xp: number;
  lessons_completed: number;
}

export interface WeeklyActivity {
  day_label: string;
  sprint_count: number;
}

export interface UserDashboardStats {
  xp: number;
  streak_days: number;
  level: number;
  weekly_sprints: number;
  track_breakdown: TrackXPStats[];
  activity_chart: WeeklyActivity[];
  next_level_xp: number;
  current_level_base_xp: number;
}

export interface LessonRow {
  id: string;
  title: string;
  order: number;
  content: any; // or better: { text?: string; code?: string; questions?: any[] }
}

export interface GetLessonDetailsResult {
  id: string;
  question: string;
  options?: any;
  answer?: any;
  type?: string;
  explanation?: string;
  lesson_id: string;
  created_at: string;
  updated_at: string;
}
