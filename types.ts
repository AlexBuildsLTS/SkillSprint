
export type UserRole = 'MEMBER' | 'PREMIUM' | 'MODERATOR' | 'ADMIN';

export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  bio?: string;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  streak_days: number;
  xp: number;
  level: number;
  last_active_date: string; // ISO Date string
  total_sprints_completed: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  xp_bonus: number;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  awarded_at: string;
  badge_details?: Badge; // For joined queries
}

export interface Track {
  id: string;
  slug?: string;
  title: string;
  description: string;
  icon: string;
  color: string; // Mapped from color_gradient in DB
  is_premium: boolean;
  is_published: boolean;
  total_lessons: number;
  completed_lessons: number; // Computed on client or via view
}

export enum QuestionType {
  MCQ = 'mcq',
  TRUE_FALSE = 'true_false',
  INPUT = 'input',
  INFO = 'info'
}

export interface SprintCard {
  id: string;
  type: QuestionType;
  title: string;
  content: string; // Markdown or text
  options?: string[];
  correctAnswer?: string | number; // Index or string value
  explanation?: string;
}

export interface SprintResult {
  xpEarned: number;
  questionsCorrect: number;
  totalQuestions: number;
  newStreak: number;
}
