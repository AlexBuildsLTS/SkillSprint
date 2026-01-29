import { supabase } from '@/lib/supabase';
import {
  SprintCard,
  SprintResult,
  UserDashboardStats,
  TrackXPStats,
  WeeklyActivity,
} from './types';

export const api = {
  /**
   * 🧠 AI: Generate Daily Sprint via Supabase Edge Function
   */
  generateDailySprint: async (language: string): Promise<SprintCard[]> => {
    const { data, error } = await supabase.functions.invoke('generate-sprint', {
      body: { language, difficulty: 'INTERMEDIATE' },
    });

    if (error) {
      console.error('AI Gen Error:', error);
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
    return data as SprintCard[];
  },

  /**
   * 🏆 GAMIFICATION: Complete Sprint & Update Database
   */
  completeSprint: async (xp: number, score: number): Promise<SprintResult> => {
    const { data, error } = await supabase.functions.invoke('complete-sprint', {
      body: { xpEarned: xp, questionsCorrect: score },
    });

    if (error) {
      return {
        xpEarned: xp,
        questionsCorrect: score,
        totalQuestions: 5,
        newStreak: 1,
      };
    }
    return data as SprintResult;
  },

  /**
   * 🛠️ ADMIN: Generate a new learning Track via AI
   */
  generateTrack: async (topic: string) => {
    const { data, error } = await supabase.functions.invoke('generate-track', {
      body: { topic },
    });
    if (error) throw error;
    return data;
  },

  /**
   * 📊 DASHBOARD: Unified Statistics Fetch
   * Syncs Frontend Leveling Math with PostgreSQL Formula: Floor((XP/100)^0.6) + 1
   */
  getDashboardStats: async (userId: string): Promise<UserDashboardStats> => {
    // 1. Core User Stats (XP, Level, Streak)
    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 2. Track Breakdown by Language (via Postgres RPC)
    const { data: trackData } = await supabase.rpc('get_user_track_xp', {
      target_user_id: userId,
    });

    // 3. Weekly Activity Data for Charting (via Postgres RPC)
    const { data: activityData } = await supabase.rpc('get_weekly_activity', {
      target_user_id: userId,
    });

    const currentXp = stats?.xp || 0;
    const currentLevel = stats?.level || 1;

    /**
     * 📐 MATHEMATICAL ALIGNMENT
     * To find the XP threshold for a specific level based on our curve:
     * XP = 100 * (Level - 1)^(1/0.6)
     */
    const getXpThreshold = (lvl: number) => {
      if (lvl <= 1) return 0;
      // We use 1.6667 as an approximation of 1/0.6
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
  },

  /**
   * 🎖️ BADGES: Retrieve all earned badges for the user
   */
  getUserBadges: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Badge Fetch Error:', error);
      throw error;
    }
    return data;
  },
};
