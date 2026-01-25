import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { UserStats } from '../services/types';

export const useStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as UserStats;
    },
    enabled: !!userId,
  });
};
