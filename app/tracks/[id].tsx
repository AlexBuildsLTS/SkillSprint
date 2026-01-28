import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Play, Star, Zap } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import * as Haptics from 'expo-haptics';

// RESTORED: Complete color palette for production UI
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  emerald: '#10b981',
  gold: '#fbbf24', // Fixed missing property
  border: 'rgba(255,255,255,0.06)',
};

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // FIXED: Guaranteed string conversion for TypeScript
  const trackId = Array.isArray(id) ? id[0] : id || '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['track-roadmap-v5', trackId],
    queryFn: async () => {
      if (!trackId) throw new Error('Missing ID');

      const trackRes = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single();

      if (trackRes.error) throw trackRes.error;

      const lessonsRes = await supabase
        .from('lessons')
        .select('*')
        .eq('track_id', trackId)
        .order('order', { ascending: true });

      if (lessonsRes.error) throw lessonsRes.error;

      return { track: trackRes.data, lessons: lessonsRes.data };
    },
    enabled: !!trackId,
  });

  const handleNodePress = (lessonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/lesson/${lessonId}`);
  };

  if (isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.indigo} />
      </View>
    );

  if (error || !data?.track)
    return (
      <View style={styles.center}>
        <Text style={{ color: 'white' }}>Protocol Error: Path Offline</Text>
      </View>
    );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/tracks')
            }
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{data.track.title}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.desc}>{data.track.description}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Star size={14} color={THEME.gold} fill={THEME.gold} />
                <Text style={styles.statText}>{data.lessons.length} NODES</Text>
              </View>
              <View style={styles.stat}>
                <Zap size={14} color={THEME.emerald} fill={THEME.emerald} />
                <Text style={styles.statText}>ACTIVE PATH</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>CURRICULUM NODES</Text>

          {data.lessons.map((lesson, index) => (
            <TouchableOpacity
              key={lesson.id}
              onPress={() => handleNodePress(lesson.id)}
              activeOpacity={0.8}
            >
              <GlassCard style={styles.nodeCard}>
                <View style={styles.nodeLeft}>
                  <View style={styles.indexBox}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={styles.nodeTitle}>{lesson.title}</Text>
                    <Text style={styles.nodeSub}>
                      +{lesson.xp_reward || 10} XP Reward
                    </Text>
                  </View>
                </View>
                <View style={styles.playBox}>
                  <Play size={14} color="white" fill="white" />
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.obsidian,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  scroll: { padding: 24, paddingBottom: 60 },
  hero: { marginBottom: 35 },
  desc: { color: THEME.slate, fontSize: 16, lineHeight: 24, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  sectionLabel: {
    color: THEME.indigo,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 20,
  },
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 24,
    marginBottom: 12,
  },
  nodeLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  indexBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  indexText: { color: THEME.slate, fontWeight: 'bold' },
  nodeTitle: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  nodeSub: {
    color: THEME.emerald,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  playBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
