import { supabase } from '@/lib/supabase';
import {
  SprintCard,
  SprintResult,
  UserDashboardStats,
  TrackXPStats,
  WeeklyActivity,
} from './types';

/**
 * 🛠️ API SERVICE LAYER
 * Centralizes all communication between the React Native frontend and Supabase.
 * Handles Edge Functions, RPC calls, and standard table queries.
 */
export const api = {
  /**
   * 🧠 AI: GENERATE DAILY SPRINT
   * Calls the 'generate-sprint' Edge Function to create a personalized learning session.
   * * @param language - The target programming language (e.g., 'Python', 'Java').
   * @returns Array of SprintCard objects (lessons/quizzes).
   */
  generateDailySprint: async (language: string): Promise<SprintCard[]> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-sprint',
        {
          body: { language, difficulty: 'INTERMEDIATE' },
        },
      );

      if (error) {
        throw error;
      }

      return data as SprintCard[];
    } catch (error) {
      console.error('❌ API Error [generateDailySprint]:', error);
      // Fallback content to prevent UI crash during outages
      return [
        {
          title: 'System Offline',
          content: 'Neural link unstable. Bypass security manually.',
          type: 'code',
          codeSnippet:
            "# Override Protocol\ndef bypass():\n    return 'Access Granted'",
          description: "Return 'Access Granted' to proceed.",
        },
      ];
    }
  },

  /**
   * 🏆 GAMIFICATION: COMPLETE SPRINT
   * Submits sprint results to the 'complete-sprint' Edge Function.
   * Handles XP awarding, streak updates, and user progress recording server-side.
   * * @param xp - Total XP earned in this session.
   * @param score - Number of correct answers.
   * @returns SprintResult containing new streak and total XP.
   */
  completeSprint: async (xp: number, score: number): Promise<SprintResult> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'complete-sprint',
        {
          body: { xpEarned: xp, questionsCorrect: score },
        },
      );

      if (error) throw error;

      return data as SprintResult;
    } catch (error) {
      console.error('❌ API Error [completeSprint]:', error);
      // Return optimistic response if server fails, to keep user engaged
      return {
        xpEarned: xp,
        questionsCorrect: score,
        totalQuestions: 5,
        newStreak: 1, // Default fallback
      };
    }
  },

  /**
   * 🛠️ ADMIN: GENERATE TRACK
   * AI-driven generation of new learning tracks.
   * * @param topic - The subject matter (e.g., "Rust Systems").
   */
  generateTrack: async (topic: string) => {
    const { data, error } = await supabase.functions.invoke('generate-track', {
      body: { topic },
    });

    if (error) {
      console.error('❌ API Error [generateTrack]:', error);
      throw error;
    }
    return data;
  },

  /**
   * 📊 DASHBOARD: GET FULL USER STATISTICS
   * Aggregates data from multiple tables and RPCs to populate the main dashboard.
   * Syncs frontend progress bar math with the database leveling curve.
   * * @param userId - The UUID of the current user.
   */
  getDashboardStats: async (userId: string): Promise<UserDashboardStats> => {
    try {
      // 1. Fetch Core User Stats (XP, Level, Streak)
      const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError) throw statsError;

      // 2. Fetch Track Breakdown via RPC (SQL Function: get_user_track_xp)
      const { data: trackData, error: trackError } = await supabase.rpc(
        'get_user_track_xp',
        {
          target_user_id: userId,
        },
      );

      if (trackError)
        console.error('⚠️ RPC Warning [get_user_track_xp]:', trackError);

      // 3. Fetch Weekly Activity via RPC (SQL Function: get_weekly_activity)
      const { data: activityData, error: activityError } = await supabase.rpc(
        'get_weekly_activity',
        {
          target_user_id: userId,
        },
      );

      if (activityError)
        console.error('⚠️ RPC Warning [get_weekly_activity]:', activityError);

      // --- LEVELING MATHEMATICS ---
      // Database Formula: Level = Floor((XP / 100)^0.6) + 1
      // UI Requirement: We need the specific XP range for the current level (Base -> Next).

      const currentXp = stats?.xp || 0;
      const currentLevel = stats?.level || 1;

      // Inverse Formula: XP = 100 * (Level - 1)^(1/0.6)
      // 1 / 0.6 is approximately 1.6666667
      const getXpThreshold = (lvl: number) => {
        if (lvl <= 1) return 0;
        return Math.floor(100 * Math.pow(lvl - 1, 1.6667));
      };

      const currentLevelBaseXP = getXpThreshold(currentLevel);
      const nextLevelThresholdXP = getXpThreshold(currentLevel + 1);

      return {
        xp: currentXp,
        streak_days: stats?.streak_days || 0,
        level: currentLevel,
        weekly_sprints: stats?.total_sprints_completed || 0,
        track_breakdown: (trackData as unknown as TrackXPStats[]) || [],
        activity_chart: (activityData as unknown as WeeklyActivity[]) || [],
        next_level_xp: nextLevelThresholdXP,
        current_level_base_xp: currentLevelBaseXP,
      };
    } catch (error) {
      console.error('❌ API Error [getDashboardStats]:', error);
      // Return safe defaults to prevent white-screen of death
      return {
        xp: 0,
        streak_days: 0,
        level: 1,
        weekly_sprints: 0,
        track_breakdown: [],
        activity_chart: [],
        next_level_xp: 100,
        current_level_base_xp: 0,
      };
    }
  },

  /**
   * 🎖️ BADGES: GET USER BADGES
   * Retrieves joined data of earned badges and their details.
   * * @param userId - The UUID of the current user.
   */
  getUserBadges: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*, badges(*)') // Join to get badge details (name, icon)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ API Error [getUserBadges]:', error);
      throw error;
    }
    return data;
  },
};
