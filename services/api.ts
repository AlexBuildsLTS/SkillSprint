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
   * 🧠 AI: Generate Daily Sprint
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
   * 🏆 GAMIFICATION: Complete Sprint
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
   * 🛠️ ADMIN: Generate Track
   */
  generateTrack: async (topic: string) => {
    const { data, error } = await supabase.functions.invoke('generate-track', {
      body: { topic },
    });
    if (error) throw error;
    return data;
  },

  /**
   * 📊 DASHBOARD: Get Full User Stats
   * Integrates Leveling Math and Badge Data
   */
  getDashboardStats: async (userId: string): Promise<UserDashboardStats> => {
    // 1. Fetch Core Stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 2. Fetch Track Breakdown (RPC)
    const { data: trackData } = await supabase.rpc('get_user_track_xp', {
      target_user_id: userId,
    });

    // 3. Fetch Weekly Activity (RPC)
    const { data: activityData } = await supabase.rpc('get_weekly_activity', {
      target_user_id: userId,
    });

    // 4. Leveling Mathematics (Matching SQL Formula: Level = Floor((XP/100)^0.6) + 1)
    const currentXp = stats?.xp || 0;
    const currentLevel = stats?.level || 1;

    // Inverse Formula to find XP needed for a specific level
    const calculateXpForLevel = (lvl: number) =>
      lvl <= 1 ? 0 : Math.floor(100 * Math.pow(lvl - 1, 1 / 0.6));

    const currentLevelBaseXP = calculateXpForLevel(currentLevel);
    const nextLevelThresholdXP = calculateXpForLevel(currentLevel + 1);

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
   * 🎖️ BADGES: Get User Badges
   */
  getUserBadges: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },
};
