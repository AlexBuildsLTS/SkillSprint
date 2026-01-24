import { supabase } from './supabase';
import { UserProfile, UserStats, Track, SprintCard, SprintResult } from '../types';


export const api = {
  /**
   * Get the current authenticated user's profile
   */
  getUserProfile: async (): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  /**
   * Get the current user's stats
   */
  getUserStats: async (): Promise<UserStats | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
        if (error.code === 'PGRST116') {
             return {
                 user_id: user.id,
                 streak_days: 0,
                 xp: 0,
                 level: 1,
                 last_active_date: new Date().toISOString(),
                 total_sprints_completed: 0
             }
        }
        throw error;
    }
    return data as UserStats;
  },

  /**
   * Fetch all available tracks
   */
  getTracks: async (): Promise<Track[]> => {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return data.map((t: any) => ({
        ...t,
        completed_lessons: 0 // In prod, this should join with user_progress
    })) as Track[];
  },

  /**
   * Generate Sprint (Calls Edge Function)
   */
  generateDailySprint: async (): Promise<SprintCard[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No session");

    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-sprint`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function Error: ${errorText}`);
    }

    const data = await response.json();
    return data as SprintCard[];
  },

  /**
   * Complete Sprint (Calls Real Edge Function)
   */
  completeSprint: async (score: number, totalQuestions: number): Promise<SprintResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No session");

    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/complete-sprint`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score, totalQuestions }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function Error: ${errorText}`);
    }

    return await response.json();
  }
};