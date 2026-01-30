/**
 * ============================================================================
 * 📊 SCREEN: DASHBOARD (HOME) - V9.0 (FINAL ARCHITECT GRADE)
 * ============================================================================
 * PATH: app/(tabs)/index.tsx
 * STATUS: PRODUCTION READY - FULL SYNC ENABLED
 * FEATURES:
 * - Real-time Supabase Level/XP Sync.
 * - Dynamic Multi-Language XP Breakdown (Auto-Expand).
 * - Weekly Sprint Activity Chart (True Data).
 * - 3D Gyroscopic Bento Cards (Touch & Mouse).
 * - Responsive Layout (Zero Clipping).
 * ============================================================================
 */

import React, { useCallback, useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  interpolate,
  Extrapolation,
  withSequence,
} from 'react-native-reanimated';

// ICONS
import {
  Flame,
  Zap,
  Award,
  Activity,
  ChevronRight,
  Target,
  BarChart2,
  Code2,
} from 'lucide-react-native';

// CONTEXT & SERVICES
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

// --- THEME ENGINE ---
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  indigoDark: '#4338ca',
  orange: '#f97316',
  purple: '#a855f7',
  emerald: '#10b981',
  slate: '#94a3b8',
  white: '#ffffff',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassBg: 'rgba(15, 23, 42, 0.6)',
};

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

// --- TYPES ---
interface TrackData {
  track_title: string;
  total_xp: number;
}

interface ActivityData {
  day_label: string;
  sprint_count: number;
}

interface DashboardStats {
  xp: number;
  level: number;
  streak_days: number;
  current_level_base_xp: number;
  next_level_xp: number;
  weekly_sprints: number;
  track_breakdown: TrackData[];
  activity_chart: ActivityData[];
}

/**
 * ============================================================================
 * 🧩 COMPONENT: TRACK BAR (XP BREAKDOWN ROW)
 * Renders a language progress bar.
 * ============================================================================
 */
const TrackBar = memo(
  ({ title, xp, max }: { title: string; xp: number; max: number }) => {
    const widthPercent = Math.min((xp / max) * 100, 100);

    return (
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.trackContainer}
      >
        <View style={styles.trackHeader}>
          <View style={styles.trackTitleRow}>
            <Code2 size={12} color={THEME.slate} />
            <Text style={styles.trackTitle}>{title || 'Unknown'}</Text>
          </View>
          <Text style={styles.trackXp}>{xp.toLocaleString()} XP</Text>
        </View>
        <View style={styles.trackRail}>
          <View style={[styles.trackFill, { width: `${widthPercent}%` }]} />
        </View>
      </Animated.View>
    );
  },
);
TrackBar.displayName = 'TrackBar';

/**
 * ============================================================================
 * 🧊 COMPONENT: 3D BENTO CARD (INTERNAL)
 * We define it here to ensure it has access to all props and context perfectly.
 * ============================================================================
 */
const Bento3DCard = memo(
  ({
    children,
    style,
    onPress,
    height = 200,
  }: {
    children: React.ReactNode;
    style?: any;
    onPress?: () => void;
    height?: number | 'auto';
  }) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    // ANIMATION VALUES
    const rotateX = useSharedValue(0);
    const rotateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);
    const [layout, setLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { perspective: 1000 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
        { scale: withSpring(scale.value, SPRING_CONFIG) },
      ],
      borderColor: interpolateColor(
        glowOpacity.value,
        [0, 1],
        ['rgba(255,255,255,0.05)', 'rgba(99, 102, 241, 0.5)'],
      ),
      shadowOpacity: interpolate(glowOpacity.value, [0, 1], [0, 0.3]),
    }));

    // --- INTERACTION LOGIC ---
    const handlePressIn = () => {
      scale.value = withSpring(0.98, SPRING_CONFIG);
      glowOpacity.value = withTiming(1, { duration: 200 });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, SPRING_CONFIG);
      glowOpacity.value = withTiming(0, { duration: 400 });
      if (!isDesktop) {
        rotateX.value = withSpring(0);
        rotateY.value = withSpring(0);
      }
    };

    const handleMove = (event: any) => {
      let x = 0;
      let y = 0;

      if (Platform.OS === 'web') {
        x = event.nativeEvent.offsetX;
        y = event.nativeEvent.offsetY;
      } else {
        x = event.nativeEvent.locationX;
        y = event.nativeEvent.locationY;
      }

      if (layout.width > 0 && layout.height > 0) {
        const rotateXVal = interpolate(
          y,
          [0, layout.height],
          [5, -5],
          Extrapolation.CLAMP,
        );
        const rotateYVal = interpolate(
          x,
          [0, layout.width],
          [-5, 5],
          Extrapolation.CLAMP,
        );

        rotateX.value = rotateXVal;
        rotateY.value = rotateYVal;
      }
    };

    return (
      <Animated.View
        layout={LinearTransition.springify()}
        style={[styles.bentoContainer, style, animatedStyle]}
        onLayout={(e: LayoutChangeEvent) => setLayout(e.nativeEvent.layout)}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onHoverIn={() => isDesktop && (glowOpacity.value = withTiming(1))}
          onHoverOut={() => isDesktop && (glowOpacity.value = withTiming(0))}
          // @ts-ignore
          onPointerMove={isDesktop ? handleMove : undefined}
          onTouchMove={!isDesktop ? handleMove : undefined}
          style={{ flex: 1, width: '100%' }}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  },
);
Bento3DCard.displayName = 'Bento3DCard';

/**
 * ============================================================================
 * 🚀 MAIN DASHBOARD COMPONENT
 * ============================================================================
 */
export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { user, refreshUserData } = useAuth();

  // STATE
  const [showXpDetails, setShowXpDetails] = useState(false);

  // --- QUERY: DASHBOARD STATS ---
  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: () => api.getDashboardStats(user?.id!),
    enabled: !!user?.id,
    refetchOnWindowFocus: true, // Auto-refresh when coming back to app
  });

  // --- REFRESH HANDLER ---
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Promise.all([refetch(), refreshUserData()]);
  }, [refetch, refreshUserData]);

  // --- DERIVED DATA ---
  const maxTrackXP =
    stats?.track_breakdown?.reduce(
      (max, t) => Math.max(max, t.total_xp),
      100,
    ) || 100;

  // Level Logic (Defensive Defaults)
  const currentLevel = stats?.level || 1;
  const currentXP = stats?.xp || 0;
  const baseXP = stats?.current_level_base_xp || 0;
  const nextTarget = stats?.next_level_xp || 1000;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((currentXP - baseXP) / (nextTarget - baseXP)) * 100),
  );

  // Chart Data Mapper (Mon, Tue... -> Last 7 Days)
  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return dayMap[d.getDay()];
  });

  const chartData = last7Days.map((day) => {
    // SQL returns "Mon", "Tue" etc. We match strictly.
    const match = stats?.activity_chart?.find(
      (d) => d.day_label?.trim() === day,
    );
    return {
      day: day.charAt(0),
      value: match ? Number(match.sprint_count) : 0,
    };
  });

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.root}>
      {/* GLOBAL BACKGROUND */}
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop ? styles.desktopScroll : styles.mobileScroll,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={THEME.indigo}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* --- HEADER --- */}
          <Animated.View
            entering={FadeInDown.duration(800)}
            style={styles.header}
          >
            <Text style={styles.dateLabel}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.greeting}>
              {getGreeting()},{'\n'}
              <Text style={styles.username}>
                {user?.user_metadata?.full_name?.split(' ')[0] || 'Operator'}
              </Text>
            </Text>
          </Animated.View>

          {/* --- MAIN GRID --- */}
          <View style={[styles.grid, isDesktop && styles.desktopGrid]}>
            {/* ROW 1: STREAK & LEVEL */}
            <View style={[styles.row, !isDesktop && styles.mobileRow]}>
              {/* CARD: STREAK */}
              <Bento3DCard style={{ flex: 1 }}>
                <View
                  style={[
                    styles.cardInner,
                    { borderColor: THEME.orange + '40' },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Flame size={18} color={THEME.orange} fill={THEME.orange} />
                    <Text style={[styles.cardLabel, { color: THEME.orange }]}>
                      STREAK
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.statMain}>
                      {stats?.streak_days || 0}
                    </Text>
                    <Text style={styles.statSub}>Day Active Streak</Text>
                  </View>
                </View>
              </Bento3DCard>

              {/* CARD: LEVEL */}
              <Bento3DCard style={{ flex: 1 }}>
                <View
                  style={[
                    styles.cardInner,
                    { borderColor: THEME.purple + '40' },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Award size={18} color={THEME.purple} />
                    <Text style={[styles.cardLabel, { color: THEME.purple }]}>
                      LEVEL {currentLevel}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.statMain}>
                      {currentXP.toLocaleString()}
                    </Text>
                    <Text style={styles.statSub}>
                      {`${Math.floor(nextTarget - currentXP)} XP to Lvl ${currentLevel + 1}`}
                    </Text>
                    {/* LEVEL PROGRESS BAR */}
                    <View style={styles.progressBarBg}>
                      <Animated.View
                        layout={LinearTransition}
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${progressPercent}%`,
                            backgroundColor: THEME.purple,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </Bento3DCard>
            </View>

            {/* ROW 2: ACTIONS (DAILY & WEEKLY) */}
            <View style={[styles.row, !isDesktop && styles.mobileRow]}>
              {/* CARD: DAILY SPRINT (Primary CTA) */}
              <Bento3DCard
                style={{ flex: 1.5 }}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/sprint-setup');
                }}
              >
                <LinearGradient
                  colors={[THEME.indigo, THEME.indigoDark]}
                  style={[styles.cardInner, styles.sprintCard]}
                >
                  <View>
                    <View style={styles.cardHeader}>
                      <Zap size={18} color={THEME.white} fill={THEME.white} />
                      <Text style={[styles.cardLabel, { color: THEME.white }]}>
                        DAILY SPRINT
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.statMain,
                        { color: 'white', fontSize: 28, marginTop: 4 },
                      ]}
                    >
                      Start Session
                    </Text>
                    <View style={styles.ctaRow}>
                      <Text style={styles.ctaText}>INITIALIZE</Text>
                      <ChevronRight size={16} color={THEME.white} />
                    </View>
                  </View>
                  <View style={styles.bonusBadge}>
                    <Text style={styles.bonusText}>+50 XP BONUS</Text>
                  </View>
                </LinearGradient>
              </Bento3DCard>

              {/* CARD: WEEKLY TARGET */}
              <Bento3DCard style={{ flex: 1 }}>
                <View
                  style={[
                    styles.cardInner,
                    { borderColor: THEME.emerald + '40' },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Target size={18} color={THEME.emerald} />
                    <Text style={[styles.cardLabel, { color: THEME.emerald }]}>
                      SPRINTS WEEKLY
                    </Text>
                  </View>
                  <View>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'baseline' }}
                    >
                      <Text style={styles.statMain}>
                        {stats?.weekly_sprints || 0}
                      </Text>
                      <Text
                        style={[
                          styles.statSub,
                          { fontSize: 18, marginLeft: 4 },
                        ]}
                      >
                        / 5
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <Animated.View
                        layout={LinearTransition}
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(((stats?.weekly_sprints || 0) / 5) * 100, 100)}%`,
                            backgroundColor: THEME.emerald,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </Bento3DCard>
            </View>

            {/* ROW 3: ACTIVITY CHART */}
            <Bento3DCard style={{ width: '100%' }}>
              <View style={[styles.cardInner, { minHeight: 200 }]}>
                <View style={styles.cardHeader}>
                  <Activity size={16} color={THEME.emerald} />
                  <Text
                    style={[
                      styles.cardLabel,
                      { marginLeft: 8, color: THEME.emerald },
                    ]}
                  >
                    ACTIVITY CHART
                  </Text>
                </View>

                {/* CHART BARS */}
                <View style={styles.chartContainer}>
                  {chartData.map((d, i) => (
                    <View key={i} style={styles.chartCol}>
                      <View style={styles.barTrack}>
                        <Animated.View
                          layout={LinearTransition.springify()}
                          style={[
                            styles.barFill,
                            {
                              height: `${Math.max(d.value * 20, 8)}%`, // Min 8% visibility
                              backgroundColor:
                                d.value > 0 ? THEME.indigo : '#334155',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartLabel}>{d.day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Bento3DCard>

            {/* ROW 4: XP BREAKDOWN (AUTO-EXPANDING) */}
            <Bento3DCard
              style={{ width: '100%' }}
              height="auto" // Tells component to allow flex growth
              onPress={() => {
                Haptics.selectionAsync();
                setShowXpDetails(!showXpDetails);
              }}
            >
              <Animated.View
                layout={LinearTransition.springify().damping(16)}
                style={[
                  styles.cardInner,
                  {
                    borderColor: THEME.indigo + '40',
                    // Auto-height logic
                    minHeight: showXpDetails ? 300 : 130,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Zap size={18} color={THEME.indigo} fill={THEME.indigo} />
                  <Text style={[styles.cardLabel, { color: THEME.indigo }]}>
                    {showXpDetails ? 'XP BREAKDOWN' : 'TOTAL EXPERIENCE'}
                  </Text>
                  <BarChart2
                    size={16}
                    color={THEME.slate}
                    style={{ marginLeft: 'auto', opacity: 0.7 }}
                  />
                </View>

                {/* CONTENT SWAP WITH ANIMATION */}
                {!showXpDetails ? (
                  <Animated.View entering={FadeIn} key="summary">
                    <Text style={styles.statMain}>
                      {currentXP.toLocaleString()}
                    </Text>
                    <Text style={styles.statSub}>Total XP Earned</Text>
                    <Text style={styles.tapHint}>Tap to view breakdown</Text>
                  </Animated.View>
                ) : (
                  <Animated.View
                    entering={FadeIn}
                    key="details"
                    style={{ paddingTop: 12 }}
                  >
                    {stats?.track_breakdown?.length ? (
                      // Render ALL languages dynamically from SQL response
                      stats.track_breakdown.map((t, i) => (
                        <TrackBar
                          key={i}
                          title={t.track_title}
                          xp={t.total_xp}
                          max={maxTrackXP}
                        />
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>
                          No track data recorded yet.
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                )}
              </Animated.View>
            </Bento3DCard>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// --- STYLESHEET (PROFESSIONAL GRADE) ---
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },

  // SCROLL CONTAINERS
  scrollContent: { paddingBottom: 120 },
  mobileScroll: { padding: 16 },
  desktopScroll: { paddingHorizontal: 64, paddingTop: 32 },

  // HEADER
  header: { marginBottom: 32, paddingLeft: 4 },
  dateLabel: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
  },
  greeting: {
    color: THEME.white,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 44,
  },
  username: { color: THEME.indigo },

  // LAYOUT GRID
  grid: { gap: 16 },
  desktopGrid: { maxWidth: 1280, alignSelf: 'center', width: '100%' },
  row: { flexDirection: 'row', gap: 16 },
  mobileRow: { flexDirection: 'column', gap: 16 },

  // BENTO CARD CORE
  bentoContainer: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent', // Handled by animated style
    overflow: 'hidden', // Ensures masking
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  cardInner: {
    flexGrow: 1, // Crucial for layout expansion
    padding: 24,
    backgroundColor: THEME.glassBg,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    borderRadius: 24,
    justifyContent: 'space-between',
  },
  sprintCard: {
    borderWidth: 0, // Gradient card has no border
  },

  // CARD TYPOGRAPHY
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  statMain: {
    color: THEME.white,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  statSub: {
    color: THEME.slate,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // ACTIONS
  ctaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ctaText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginRight: 4,
  },
  bonusBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  bonusText: { color: THEME.white, fontSize: 10, fontWeight: '800' },

  // PROGRESS BARS
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },

  // ACTIVITY CHART
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    marginTop: 10,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    gap: 8,
  },
  barTrack: {
    width: 8,
    height: '80%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4 },
  chartLabel: { color: THEME.slate, fontSize: 10, fontWeight: '700' },

  // TRACK BREAKDOWN (XP)
  trackContainer: { marginBottom: 16 },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trackTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackTitle: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  trackXp: { color: THEME.white, fontSize: 11, fontWeight: '700' },
  trackRail: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: THEME.indigo,
    borderRadius: 4,
  },

  // STATES
  tapHint: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    color: THEME.slate,
    fontSize: 10,
    opacity: 0.5,
  },
  emptyState: { padding: 20, alignItems: 'center' },
  emptyText: { color: THEME.slate, fontStyle: 'italic', fontSize: 12 },
});
