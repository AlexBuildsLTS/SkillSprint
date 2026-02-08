import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  ZoomIn,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  Play,
  Star,
  Zap,
  Check,
  RotateCcw,
  Lock,
  Trophy,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// --- IMPORTS FROM YOUR PROJECT STRUCTURE ---
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';

/**
 * -----------------------------------------------------------------------------
 * THEME CONFIGURATION (Obsidian Palette)
 * Professional, dark-mode centric color scheme for engineering aesthetic.
 * -----------------------------------------------------------------------------
 */
const THEME = {
  obsidian: '#020617', // Deepest background
  darkSlate: '#0f172a', // Secondary background
  indigo: '#6366f1', // Primary Action
  slate: '#94a3b8', // Muted text
  emerald: '#10b981', // Success state
  gold: '#fbbf24', // Achievements
  danger: '#ef4444', // Errors
  border: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.1)',
  white: '#ffffff',
};

const { width } = Dimensions.get('window');

/**
 * -----------------------------------------------------------------------------
 * TRACK DETAIL SCREEN
 * Displays the roadmap nodes for a specific engineering track.
 * Handles auto-refresh on return via useFocusEffect.
 * -----------------------------------------------------------------------------
 */
export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const trackId = Array.isArray(id) ? id[0] : id || '';

  // --- DATA FETCHING & SYNCHRONIZATION ---
  const {
    data,
    isLoading,
    error,
    refetch, // <--- CRITICAL: Extracted refetch function
  } = useQuery({
    queryKey: ['track-roadmap-v8', trackId], // Bumped version key to ensure freshness
    queryFn: async () => {
      if (!trackId) throw new Error('Missing Track ID');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Fetch Track Metadata
      const trackRes = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single();
      if (trackRes.error) throw trackRes.error;

      // 2. Fetch Lessons (Nodes)
      const lessonsRes = await supabase
        .from('lessons')
        .select('*')
        .eq('track_id', trackId)
        .order('order', { ascending: true });
      if (lessonsRes.error) throw lessonsRes.error;

      // 3. Fetch Completion Status
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
        totalXp: lessonsRes.data.reduce(
          (sum, item) => sum + (item.xp_reward || 0),
          0,
        ),
      };
    },
    enabled: !!trackId,
  });

  // --- AUTOMATIC REFRESH ON FOCUS ---
  // This solves the issue where you have to manually refresh after completing a lesson.
  useFocusEffect(
    useCallback(() => {
      // Re-fetch data silently when screen comes into focus
      refetch();
    }, [refetch]),
  );

  // --- HANDLERS ---
  const handleNodePress = (lessonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/lesson/${lessonId}`);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tracks');
    }
  };

  // --- LOADING STATE ---
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.indigo} />
        <Text style={styles.loadingText}>Synchronizing Neural Link...</Text>
      </View>
    );
  }

  // --- ERROR STATE ---
  if (error || !data?.track) {
    return (
      <View style={styles.center}>
        <Lock size={48} color={THEME.danger} />
        <Text style={styles.errorText}>Protocol Error: Path Offline</Text>
        <TouchableOpacity
          onPress={() => router.replace('/tracks')}
          style={styles.errorBtn}
        >
          <Text style={styles.errorBtnText}>Return to Base</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate Progress for Hero
  const completedCount = data.completedLessonIds.size;
  const totalCount = data.lessons.length;
  const percentComplete =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.root}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#020617']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* --- HEADER --- */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data.track.title}
          </Text>
          {/* Spacer for alignment */}
          <View style={{ width: 44 }} />
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* --- HERO SECTION --- */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.hero}
          >
            <GlassCard intensity="heavy" style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
                  ]}
                >
                  <Trophy size={20} color={THEME.indigo} />
                </View>
                <View style={styles.heroContent}>
                  <Text style={styles.heroTitle}>Track Progress</Text>
                  <Text style={styles.heroSubtitle}>
                    {percentComplete}% Complete
                  </Text>
                </View>
                <View style={styles.xpBadge}>
                  <Zap size={14} color={THEME.gold} fill={THEME.gold} />
                  <Text style={styles.xpText}>{data.totalXp} XP</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${percentComplete}%` },
                  ]}
                  layout={Layout.springify()}
                />
              </View>

              <Text style={styles.desc}>{data.track.description}</Text>
            </GlassCard>
          </Animated.View>

          <Text style={styles.sectionLabel}>CURRICULUM NODES</Text>

          {/* --- NODES LIST (Bento Style) --- */}
          {data.lessons.map((lesson, index) => {
            const isCompleted = data.completedLessonIds.has(lesson.id);
            // Stagger animation based on index for "waterfall" effect
            const enteringAnim = FadeInDown.delay(300 + index * 50)
              .springify()
              .damping(12);

            return (
              <Animated.View
                key={lesson.id}
                entering={enteringAnim}
                layout={Layout.springify()} // Smooth reordering if needed
              >
                <TouchableOpacity
                  onPress={() => handleNodePress(lesson.id)}
                  activeOpacity={0.9}
                  style={styles.cardWrapper}
                >
                  <GlassCard
                    intensity={isCompleted ? 'light' : 'heavy'}
                    style={[
                      styles.nodeCard,
                      isCompleted ? styles.completedCardBorder : {}, // Green glow border if done
                    ]}
                  >
                    {/* LEFT: Index or Replay */}
                    <View style={styles.leftBox}>
                      {isCompleted ? (
                        <Animated.View entering={ZoomIn}>
                          <View style={[styles.iconBox, styles.replayBox]}>
                            <RotateCcw size={16} color={THEME.slate} />
                          </View>
                        </Animated.View>
                      ) : (
                        <View style={styles.iconBox}>
                          <Text style={styles.indexText}>
                            {(index + 1).toString().padStart(2, '0')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* CENTER: Content */}
                    <View style={styles.centerBox}>
                      <Text
                        style={[
                          styles.nodeTitle,
                          isCompleted && styles.dimmedText,
                        ]}
                        numberOfLines={1}
                      >
                        {lesson.title}
                      </Text>

                      <View style={styles.metaRow}>
                        {isCompleted ? (
                          <View style={styles.completedBadge}>
                            <Text style={styles.completedText}>
                              MODULE COMPLETE
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.xpRow}>
                            <Star size={12} color={THEME.indigo} />
                            <Text style={styles.nodeXp}>
                              +{lesson.xp_reward} XP
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* RIGHT: Action Icon */}
                    <View style={styles.rightBox}>
                      {isCompleted ? (
                        <Animated.View entering={ZoomIn.springify()}>
                          <View style={[styles.actionBtn, styles.completedBtn]}>
                            <Check size={18} color="white" strokeWidth={3} />
                          </View>
                        </Animated.View>
                      ) : (
                        <View style={[styles.actionBtn, styles.playBtn]}>
                          <Play size={16} color="white" fill="white" />
                        </View>
                      )}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {/* Bottom Padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * -----------------------------------------------------------------------------
 * STYLES (Mobile Optimized)
 * Uses absolute pixels and flexbox to ensure consistency across iOS/Android.
 * -----------------------------------------------------------------------------
 */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.obsidian,
    gap: 16,
  },
  loadingText: {
    color: THEME.slate,
    marginTop: 10,
    fontSize: 12,
    letterSpacing: 1,
  },
  errorText: { color: THEME.white, fontSize: 16, fontWeight: 'bold' },
  errorBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  errorBtnText: { color: THEME.white },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  headerTitle: {
    color: THEME.white,
    fontSize: 16,
    fontWeight: '700',
    maxWidth: width * 0.6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 10 },

  // HERO CARD
  hero: { marginBottom: 30 },
  heroCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Slightly darker glass
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroContent: { flex: 1 },
  heroTitle: {
    color: THEME.slate,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  heroSubtitle: { color: THEME.white, fontSize: 18, fontWeight: '800' },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.1)', // Gold tint
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  xpText: { color: THEME.gold, fontSize: 12, fontWeight: 'bold' },

  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.indigo,
    borderRadius: 3,
  },
  desc: {
    color: THEME.slate,
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },

  sectionLabel: {
    color: THEME.indigo,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
  },

  // NODE CARD
  cardWrapper: { marginBottom: 12 },
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  completedCardBorder: {
    borderColor: 'rgba(16, 185, 129, 0.3)', // Emerald glow
    backgroundColor: 'rgba(16, 185, 129, 0.03)', // Very faint green tint
  },

  // Left: Index
  leftBox: { marginRight: 16 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  replayBox: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  indexText: {
    color: THEME.slate,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold',
  },

  // Center: Info
  centerBox: { flex: 1, paddingRight: 8 },
  nodeTitle: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  dimmedText: { color: THEME.slate },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nodeXp: { color: THEME.indigo, fontSize: 11, fontWeight: '700' },

  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedText: {
    color: THEME.emerald,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Right: Action
  rightBox: {},
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20, // Circular
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playBtn: {
    backgroundColor: THEME.indigo,
  },
  completedBtn: {
    backgroundColor: THEME.emerald,
  },
});
