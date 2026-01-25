import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../supabase/database.types';

interface WeeklyTarget {
  completed: number;
  target: number;
  percentage: number;
}

export const useWeeklyTarget = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['weeklyTarget', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID provided');

      // Get current week (Monday to Sunday)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('daily_sprints')
        .select('id')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('date', monday.toISOString().split('T')[0])
        .lte('date', sunday.toISOString().split('T')[0]);

      if (error) throw error;

      const completed = data?.length || 0;
      const target = 5; // Weekly target of 5 sprints
      const percentage = Math.min((completed / target) * 100, 100);

      return {
        completed,
        target,
        percentage,
      } as WeeklyTarget;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
