import React, { useMemo } from 'react';
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
import {
  ChevronLeft,
  Play,
  Star,
  Zap,
  Check,
  RotateCcw,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

// THEME (Matches your Obsidian Palette)
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  emerald: '#10b981',
  gold: '#fbbf24',
  border: 'rgba(255,255,255,0.06)',
  white: '#ffffff',
};

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const trackId = Array.isArray(id) ? id[0] : id || '';

  // DATA FETCHING
  const { data, isLoading, error } = useQuery({
    queryKey: ['track-roadmap-v7', trackId],
    queryFn: async () => {
      if (!trackId) throw new Error('Missing ID');

      const {
        data: { user },
      } = await supabase.auth.getUser();

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

      let completedSet = new Set<string>();
      if (user && lessonsRes.data.length > 0) {
        const lessonIds = lessonsRes.data.map((l) => l.id);
        const progressRes = await supabase
          .from('user_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .in('lesson_id', lessonIds);

        progressRes.data?.forEach((p) => completedSet.add(p.lesson_id));
      }

      return {
        track: trackRes.data,
        lessons: lessonsRes.data,
        completedLessonIds: completedSet,
      };
    },
    enabled: !!trackId,
  });

  const handleNodePress = (lessonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/lesson/${lessonId}`);
  };

  useFocusEffect(
    React.useCallback(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, []),
  );

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
          {/* HERO */}
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

          {/* NODES LIST */}
          {data.lessons.map((lesson, index) => {
            const isCompleted = data.completedLessonIds.has(lesson.id);

            return (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => handleNodePress(lesson.id)}
                activeOpacity={0.8}
              >
                <GlassCard
                  intensity="heavy"
                  style={[
                    styles.nodeCard,
                    isCompleted ? styles.completedBorder : {},
                  ]}
                >
                  {/* --- LEFT SIDE --- */}
                  {/* If completed: Replay Button. If New: Index Number */}
                  <View style={styles.leftBox}>
                    {isCompleted ? (
                      <View style={[styles.iconBox, styles.replayBox]}>
                        <RotateCcw size={16} color={THEME.slate} />
                      </View>
                    ) : (
                      <View style={styles.iconBox}>
                        <Text style={styles.indexText}>{index + 1}</Text>
                      </View>
                    )}
                  </View>

                  {/* --- CENTER TEXT --- */}
                  <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    <Text
                      style={[
                        styles.nodeTitle,
                        isCompleted && { color: THEME.slate }, // Dim title if done
                      ]}
                    >
                      {lesson.title}
                    </Text>
                    <Text
                      style={[
                        styles.nodeSub,
                        isCompleted && { color: THEME.slate },
                      ]}
                    >
                      {isCompleted ? 'COMPLETED' : `+${lesson.xp_reward} XP`}
                    </Text>
                  </View>

                  {/* --- RIGHT SIDE --- */}
                  {/* If completed: Green Checkmark. If New: Play Button */}
                  <View style={styles.rightBox}>
                    {isCompleted ? (
                      <View style={[styles.iconBox, styles.completedBox]}>
                        <Check size={18} color="white" strokeWidth={4} />
                      </View>
                    ) : (
                      <View style={[styles.iconBox, styles.playBox]}>
                        <Play size={16} color="white" fill="white" />
                      </View>
                    )}
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
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

  // NODE CARD LAYOUT
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    minHeight: 80,
  },
  completedBorder: {
    borderColor: 'rgba(16, 185, 129, 0.4)', // Green border when done
    backgroundColor: 'rgba(2, 6, 23, 0.6)', // Darker bg
  },
  leftBox: { justifyContent: 'center', alignItems: 'center' },
  rightBox: { justifyContent: 'center', alignItems: 'center' },

  // SHARED ICON BOX STYLES
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playBox: {
    backgroundColor: THEME.indigo,
    borderColor: THEME.indigo,
  },
  completedBox: {
    backgroundColor: THEME.emerald,
    borderColor: THEME.emerald,
  },
  replayBox: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // TEXT
  indexText: { color: THEME.slate, fontWeight: 'bold' },
  nodeTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  nodeSub: {
    color: THEME.emerald,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
