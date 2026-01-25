import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../supabase/database.types';

type DailySprint = Database['public']['Tables']['daily_sprints']['Row'];

interface ActivityData {
  day: string;
  count: number;
  height: number;
}

export const useActivityLog = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['activityLog', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID provided');

      // Get last 7 days of sprints
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const { data, error } = await supabase
        .from('daily_sprints')
        .select('date, is_completed')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      // Create a map of day -> count
      const dayMap = new Map<string, number>();
      const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

      // Initialize all days to 0
      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + i);
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Monday = 0
        dayMap.set(dayName, 0);
      }

      // Count completed sprints per day
      data?.forEach((sprint) => {
        const date = new Date(sprint.date);
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
        if (sprint.is_completed) {
          dayMap.set(dayName, (dayMap.get(dayName) || 0) + 1);
        }
      });

      // Convert to array with height percentages (max 100%)
      const maxCount = Math.max(...Array.from(dayMap.values()), 1);
      const activityData: ActivityData[] = days.map((day, index) => {
        const count = dayMap.get(day) || 0;
        return {
          day,
          count,
          height: Math.max((count / maxCount) * 100, count > 0 ? 20 : 0), // Minimum 20% if there's activity
        };
      });

      return activityData;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
