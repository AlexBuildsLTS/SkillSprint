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
   */
  getDashboardStats: async (userId: string): Promise<UserDashboardStats> => {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: trackData } = await supabase.rpc('get_user_track_xp', {
      target_user_id: userId,
    });

    const { data: activityData } = await supabase.rpc('get_weekly_activity', {
      target_user_id: userId,
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count } = await supabase
      .from('daily_sprints')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneWeekAgo.toISOString());

    return {
      xp: stats?.xp || 0,
      streak_days: stats?.streak_days || 0,
      level: stats?.level || 1,
      weekly_sprints: count || 0,
      track_breakdown: (trackData as unknown as TrackXPStats[]) || [],
      activity_chart: (activityData as unknown as WeeklyActivity[]) || [],
    };
  },
};
