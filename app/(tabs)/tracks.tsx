import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Smartphone, Database, Palette, ChevronRight, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import Animated, { FadeInDown } from 'react-native-reanimated';

const iconMap = {
  mobile: <Smartphone size={22} color="white" />,
  data: <Database size={22} color="white" />,
  design: <Palette size={22} color="white" />,
};

export default function TracksScreen() {
  const { data: tracks, isLoading, refetch } = useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tracks').select('*').eq('is_published', true);
      if (error) throw error;
      return data;
    }
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-950">
      <ScrollView 
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />}
      >
          <Text className="text-xs font-black text-indigo-500 uppercase tracking-[3px] mb-2">Curated Paths</Text>
          <Text className="mb-8 text-4xl font-black text-white">Tracks</Text>
          
          <View className="gap-4">
            {tracks?.map((track, index) => (
              <Animated.View key={track.id} entering={FadeInDown.delay(index * 100).springify()}>
                <TouchableOpacity activeOpacity={0.9}>
                  <GlassCard className="flex-row items-center p-4 border-slate-800" intensity="light">
                    <View className="items-center justify-center border w-14 h-14 rounded-2xl bg-indigo-500/10 border-indigo-500/20">
                        {iconMap[track.icon as keyof typeof iconMap] || iconMap.data}
                    </View>
                    
                    <View className="flex-1 ml-4">
                        <Text className="mb-1 text-lg font-bold text-white">{track.title}</Text>
                        <Text className="mb-3 text-xs text-slate-400" numberOfLines={1}>{track.description}</Text>
                        <View className="w-full h-1 overflow-hidden rounded-full bg-slate-800">
                            <View className="w-1/3 h-full bg-indigo-500" />
                        </View>
                    </View>
                    <ChevronRight size={18} color="#475569" />
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            ))}

            <GlassCard className="flex-row items-center p-4 border-dashed opacity-40 grayscale border-slate-700" intensity="light">
                <View className="items-center justify-center w-14 h-14 rounded-2xl bg-slate-900">
                    <Lock size={20} color="#475569" />
                </View>
                <View className="flex-1 ml-4">
                    <Text className="font-bold text-slate-500">Advanced Logic</Text>
                    <Text className="text-slate-600 text-[10px] uppercase font-bold tracking-tighter">Unlocks at Level 10</Text>
                </View>
            </GlassCard>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}