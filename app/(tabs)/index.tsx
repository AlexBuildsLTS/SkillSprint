import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import {
  Flame,
  Zap,
  Award,
  Activity,
  ChevronRight,
  Target,
  BarChart2,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  Layout,
  LinearTransition,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';

import { Bento3DCard } from '@/components/ui/Bento3DCard';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  orange: '#f97316',
  purple: '#a855f7',
  white: '#ffffff',
  slate: '#94a3b8',
  emerald: '#10b981',
};

const TrackBar = ({
  title,
  xp,
  max,
}: {
  title: string;
  xp: number;
  max: number;
}) => {
  const widthPercent = Math.min((xp / max) * 100, 100);
  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            color: THEME.slate,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Text>
        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
          {xp} XP
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 4,
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${widthPercent}%`,
            backgroundColor: THEME.indigo,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { user, refreshUserData } = useAuth();

  const [showXpDetails, setShowXpDetails] = useState(false);

  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: () => api.getDashboardStats(user?.id!),
    enabled: !!user?.id,
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await refetch();
    await refreshUserData();
  }, [refetch, refreshUserData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const maxTrackXP =
    stats?.track_breakdown?.reduce(
      (max, t) => Math.max(max, t.total_xp),
      100,
    ) || 100;
  const defaultDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const chartData = defaultDays.map((day) => {
    const match = stats?.activity_chart?.find(
      (d) => d.day_label && d.day_label.trim().startsWith(day),
    );
    return { day, value: match ? Number(match.sprint_count) : 0 };
  });

  return (
    <View style={styles.root}>
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
          {/* HEADER */}
          <Animated.View
            entering={FadeInDown.duration(800)}
            style={styles.headerTextContainer}
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
                {user?.user_metadata?.username || 'Operator'}
              </Text>
            </Text>
          </Animated.View>

          <View
            style={[
              styles.gridContainer,
              isDesktop && styles.desktopGridContainer,
            ]}
          >
            {/* ROW 1: STREAK & LEVEL */}
            <View style={[styles.row, !isDesktop && styles.mobileStack]}>
              <Bento3DCard style={{ flex: 1 }}>
                <View
                  style={[
                    styles.cardContent,
                    styles.glassEffect,
                    { borderColor: THEME.orange + '40', minHeight: 140 },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Flame size={18} color={THEME.orange} fill={THEME.orange} />
                    <Text style={[styles.cardLabel, { color: THEME.orange }]}>
                      STREAK
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.statValue}>
                      {stats?.streak_days || 0}
                    </Text>
                    <Text style={styles.statSub}>Day Active Streak</Text>
                  </View>
                </View>
              </Bento3DCard>

              <Bento3DCard style={{ flex: 1 }}>
                <View
                  style={[
                    styles.cardContent,
                    styles.glassEffect,
                    { borderColor: THEME.purple + '40', minHeight: 140 },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Award size={18} color={THEME.purple} />
                    <Text style={[styles.cardLabel, { color: THEME.purple }]}>
                      LEVEL
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.statValue}>{stats?.level || 1}</Text>
                    <Text style={styles.statSub}>Current Rank</Text>
                  </View>
                </View>
              </Bento3DCard>
            </View>

            {/* ROW 2: DAILY SPRINT & WEEKLY TARGET */}
            <View style={[styles.row, !isDesktop && styles.mobileStack]}>
              <Bento3DCard
                style={{ flex: 1.5 }}
                onPress={() => router.push('/sprint-setup')}
              >
                <LinearGradient
                  colors={['#4f46e5', '#4338ca']}
                  style={[
                    styles.cardContent,
                    {
                      borderWidth: 0,
                      justifyContent: 'space-between',
                      minHeight: 160,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.statValue,
                        { fontSize: 24, color: 'white' },
                      ]}
                    >
                      Daily Sprint
                    </Text>
                    <View style={styles.ctaRow}>
                      <Text style={styles.ctaText}>START SESSION</Text>
                      <ChevronRight size={14} color={THEME.white} />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    >
                      +50 XP BONUS
                    </Text>
                  </View>
                </LinearGradient>
              </Bento3DCard>

              <Bento3DCard style={{ flex: 1 }}>
                <View
                  style={[
                    styles.cardContent,
                    styles.glassEffect,
                    {
                      justifyContent: 'space-between',
                      borderColor: THEME.emerald + '40',
                      minHeight: 160,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Target size={18} color={THEME.emerald} />
                    <Text style={[styles.cardLabel, { color: THEME.emerald }]}>
                      WEEKLY
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 28,
                      }}
                    >
                      {stats?.weekly_sprints || 0}
                      <Text style={{ color: THEME.slate, fontSize: 16 }}>
                        /5
                      </Text>
                    </Text>
                    <View
                      style={{
                        width: '100%',
                        height: 6,
                        backgroundColor: '#334155',
                        marginTop: 12,
                        borderRadius: 3,
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(((stats?.weekly_sprints || 0) / 5) * 100, 100)}%`,
                          height: '100%',
                          backgroundColor: THEME.emerald,
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </View>
                </View>
              </Bento3DCard>
            </View>

            {/* ROW 3: ACTIVITY LOG */}
            <Bento3DCard style={{ width: '100%', marginBottom: 16 }}>
              <View
                style={[
                  styles.cardContent,
                  styles.glassEffect,
                  { minHeight: 180 },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Activity size={16} color={THEME.slate} />
                  <Text style={[styles.cardLabel, { marginLeft: 8 }]}>
                    ACTIVITY LOG
                  </Text>
                </View>
                <View style={styles.chartContainer}>
                  {chartData.map((d, i) => (
                    <View key={i} style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(d.value * 20, 15)}%`,
                            backgroundColor:
                              d.value > 0 ? THEME.indigo : '#334155',
                          },
                        ]}
                      />
                      <Text style={styles.dayLabel}>{d.day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Bento3DCard>

            {/* ROW 4: TOTAL XP / BREAKDOWN (AUTO-EXPANDING HEIGHT) */}
            <Bento3DCard
              style={{ width: '100%' }} // No fixed height here
              onPress={() => {
                Haptics.selectionAsync();
                setShowXpDetails(!showXpDetails);
              }}
            >
              <Animated.View
                layout={LinearTransition.springify()}
                style={[
                  styles.cardContent,
                  styles.glassEffect,
                  {
                    borderColor: THEME.indigo + '40',
                    justifyContent: 'flex-start',
                    minHeight: 240,
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

                {!showXpDetails ? (
                  <Animated.View
                    entering={FadeIn}
                    key="main"
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      minHeight: 120,
                    }}
                  >
                    <Text style={[styles.statValue, { fontSize: 48 }]}>
                      {stats?.xp?.toLocaleString() || 0}
                    </Text>
                    <Text style={styles.statSub}>Total XP Earned</Text>
                    <Text style={styles.tapHint}>Tap to view breakdown</Text>
                  </Animated.View>
                ) : (
                  // AUTO-EXPANDING CONTENT
                  <Animated.View
                    entering={FadeIn}
                    key="breakdown"
                    style={{ paddingTop: 16 }}
                  >
                    {stats?.track_breakdown?.length ? (
                      stats.track_breakdown.map((t, i) => (
                        <TrackBar
                          key={i}
                          title={t.track_title}
                          xp={t.total_xp}
                          max={maxTrackXP}
                        />
                      ))
                    ) : (
                      <View
                        style={{
                          height: 100,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: THEME.slate, fontSize: 12 }}>
                          No track data available.
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  scrollContent: { paddingBottom: 100 },
  mobileScroll: { padding: 16 },
  desktopScroll: { paddingHorizontal: 40, paddingTop: 20, width: '100%' },
  headerTextContainer: { marginBottom: 30, alignItems: 'flex-start' },
  dateLabel: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  greeting: { color: THEME.white, fontSize: 32, fontWeight: '800' },
  username: { color: THEME.indigo },
  gridContainer: { gap: 16, width: '100%' },
  desktopGridContainer: { maxWidth: 1600, alignSelf: 'center', width: '100%' },

  row: { flexDirection: 'row', gap: 16, width: '100%', marginBottom: 16 },
  mobileStack: { flexDirection: 'column', height: 'auto', gap: 16 },

  glassEffect: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
  },

  // Added flexGrow to allow content to push height
  cardContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'space-between',
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: THEME.slate,
  },

  statValue: {
    color: THEME.white,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  statSub: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },

  ctaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ctaText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginRight: 4,
  },

  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    marginTop: 10,
  },
  barWrapper: { alignItems: 'center', flex: 1, gap: 8 },
  bar: { width: 8, borderRadius: 4 },
  dayLabel: { color: THEME.slate, fontSize: 10, fontWeight: '700' },

  tapHint: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    color: THEME.slate,
    fontSize: 10,
    opacity: 0.6,
  },
});
