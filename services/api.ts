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
 *
 * STATUS: PRODUCTION READY
 */
export const api = {
  /**
   * 🧠 AI: GENERATE DAILY SPRINT
   * Calls the 'generate-sprint' Edge Function to create a personalized learning session.
   * @param language - The target programming language (e.g., 'Python', 'Java').
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
          answer: undefined,
        },
      ];
    }
  },

  /**
   * 🏆 GAMIFICATION: COMPLETE SPRINT
   * Submits sprint results to the 'complete-sprint' Edge Function.
   * Handles XP awarding, streak updates, and user progress recording server-side.
   * @param xp - Total XP earned in this session.
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
   * @param topic - The subject matter (e.g., "Rust Systems").
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
   * @param userId - The UUID of the current user.
   */
  getDashboardStats: async (userId: string): Promise<UserDashboardStats> => {
    try {
      // 1. CALL THE MASTER RPC (get_dashboard_stats)
      // This single call returns: XP, Level, Streak, Weekly Count, Breakdown, and Chart.
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        target_user_id: userId,
      });

      if (error) throw error;

      // The RPC returns exactly the shape we need.
      // We safely cast it here to ensure Type Safety.
      const stats = data as any;

      return {
        xp: stats.xp || 0,
        streak_days: stats.streak_days || 0,
        level: stats.level || 1,
        weekly_sprints: stats.weekly_sprints || 0,

        // Ensure arrays are arrays (defensive coding)
        track_breakdown: (stats.track_breakdown || []) as TrackXPStats[],
        activity_chart: (stats.activity_chart || []) as WeeklyActivity[],

        // Pass through the calculated thresholds directly from SQL
        // This ensures the frontend matches the backend math perfectly.
        current_level_base_xp: stats.current_level_base_xp || 0,
        next_level_xp: stats.next_level_xp || 1000,
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
        next_level_xp: 1000,
        current_level_base_xp: 0,
      };
    }
  },

  /**
   * 🎖️ BADGES: GET USER BADGES
   * Retrieves joined data of earned badges and their details.
   * @param userId - The UUID of the current user.
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

  /**
   * 📚 LESSONS: GET TRACK LESSONS
   * (Optional: Keeping this if you use it elsewhere in your app)
   */
  getTrackLessons: async (trackId: string) => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('track_id', trackId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * 📝 USER PROGRESS: GET LESSON STATUS
   * (Optional: Keeping this for completeness)
   */
  getUserProgress: async (userId: string, lessonId: string) => {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * 🔔 NOTIFICATIONS: FETCH REAL-TIME NOTIFICATIONS
   * Direct Supabase query for immediate display.
   */
  getNotifications: async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * 🔔 NOTIFICATIONS: MARK READ (EDGE FUNCTION)
   * All mutations MUST bypass direct DB access via Deno Wall.
   */
  markNotificationRead: async (notificationId: string) => {
    const { data, error } = await supabase.functions.invoke(
      'notification-handler',
      {
        body: { action: 'MARK_READ', notificationId },
      },
    );
    if (error) throw error;
    return data;
  },

  /**
   * 🔔 NOTIFICATIONS: MARK ALL READ (EDGE FUNCTION)
   */
  markAllNotificationsRead: async () => {
    const { data, error } = await supabase.functions.invoke(
      'notification-handler',
      {
        body: { action: 'MARK_ALL_READ' },
      },
    );
    if (error) throw error;
    return data;
  },

  /**
   * 💬 MESSAGING: FETCH CONVERSATIONS
   */
  getConversations: async () => {
    // This query fetches conversations with participant details and last message
    const { data, error } = await supabase
      .from('conversations')
      .select(
        '*, conversation_participants!inner(user_id, profiles(*)), messages(content, created_at, sender_id)',
      )
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * 💬 MESSAGING: SEND MESSAGE (EDGE FUNCTION)
   * Strictly Deno-mediated for encryption validation/parsing.
   */
  sendMessage: async (conversationId: string, content: string) => {
    const { data, error } = await supabase.functions.invoke('send-message', {
      body: { conversationId, content },
    });
    if (error) throw error;
    return data;
  },

  /**
   * 🌐 PRESENCE: UPDATE STATUS (EDGE FUNCTION)
   */
  updatePresence: async (status: 'ONLINE' | 'OFFLINE' | 'BUSY') => {
    const { data, error } = await supabase.functions.invoke(
      'presence-handler',
      {
        body: { status },
      },
    );
    if (error) throw error;
    return data;
  },
};
