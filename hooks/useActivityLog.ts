import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

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

      const dayMap = new Map<string, number>();
      const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + i);
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
        dayMap.set(dayName, 0);
      }

      data?.forEach((sprint) => {
        const date = new Date(sprint.date);
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
        if (sprint.is_completed) {
          dayMap.set(dayName, (dayMap.get(dayName) || 0) + 1);
        }
      });

      const maxCount = Math.max(...Array.from(dayMap.values()), 1);
      return days.map((day) => {
        const count = dayMap.get(day) || 0;
        return {
          day,
          count,
          height: Math.max((count / maxCount) * 100, count > 0 ? 20 : 0),
        };
      }) as ActivityData[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};
