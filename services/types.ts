// types.ts
import { Database } from '@/supabase/database.types';

// --- DATABASE HELPERS ---
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Profile = Tables<'profiles'>;

// --- SPRINT ENGINE TYPES ---

// 1. Define the specific strings the AI/DB returns (LOWERCASE to match AI)
export type SprintCardType = 'info' | 'mcq' | 'true_false';

// 2. The Shape of a Card (Matches the AI JSON)
export interface SprintCard {
  // AI doesn't always return an ID, generate one on front-end or allow optional
  id?: string; 
  type: SprintCardType;
  title: string;
  content: string;
  options?: string[];      
  correctAnswer?: number;  // Index 0-3
  explanation?: string;
  xp_reward?: number;
}

// 3. The Result Payload
export interface SprintResult {
  xpEarned: number;
  questionsCorrect: number;
  totalQuestions?: number;
  newStreak: number;
}