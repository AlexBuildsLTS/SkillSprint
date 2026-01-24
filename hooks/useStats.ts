import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Database } from '../supabase/database.types';

type UserStats = Database['public']['Tables']['user_stats']['Row'];

export const useStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID provided');

      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as UserStats;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
