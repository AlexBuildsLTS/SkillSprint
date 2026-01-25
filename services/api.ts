import { supabase } from '../lib/supabase';
import { SprintCard, SprintResult } from './types';

export const api = {
  /**
   * ⚡ GENERATES DAILY SPRINT
   * Calls the 'generate-sprint' Edge Function
   */
  generateDailySprint: async (): Promise<SprintCard[]> => {
    const { data, error } = await supabase.functions.invoke('generate-sprint', {
      method: 'POST',
    });

    if (error) {
      console.error('Edge Function (generate-sprint) Error:', error);
      throw error;
    }

    // Validation: Ensure the AI returned a valid array
    if (!Array.isArray(data)) {
      console.error('Invalid Data Received:', data);
      throw new Error('Invalid sprint data structure received from AI.');
    }

    return data as SprintCard[];
  },

  /**
   * 🏆 COMPLETE SPRINT
   * Sends results to 'complete-sprint' to update user XP, streaks, and stats
   */
  completeSprint: async (xp: number, score: number): Promise<SprintResult> => {
    const { data, error } = await supabase.functions.invoke('complete-sprint', {
      body: { xpEarned: xp, questionsCorrect: score },
    });

    if (error) {
      console.error('Edge Function (complete-sprint) Error:', error);
      throw error;
    }
    return data as SprintResult;
  },

  /**
   * 📚 GENERATE TRACK FUNCTION (ADMIN)
   * Calls 'generate-track' to create a full course (Track + Lessons) from a topic string.
   */
  generateTrack: async (topic: string): Promise<any> => {
    const { data, error } = await supabase.functions.invoke('generate-track', {
      body: { topic },
    });

    if (error) {
      console.error('Edge Function (generate-track) Error:', error);
      throw error;
    }

    return data;
  },
};
