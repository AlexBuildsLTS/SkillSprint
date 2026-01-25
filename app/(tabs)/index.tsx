import React, { useCallback } from 'react';
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
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// INTERNAL SYSTEM
import { Bento3DCard } from '@/components/ui/Bento3DCard'; // 3D Card
import { useAuth } from '@/context/AuthContext';
import { useStats } from '@/hooks/useStats';

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  orange: '#f97316',
  purple: '#a855f7',
  white: '#ffffff',
  slate: '#94a3b8',
};

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { user, refreshUserData } = useAuth();
  const { data: stats, isLoading, refetch } = useStats(user?.id);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Promise.all([refetch(), refreshUserData()]);
  }, [refetch, refreshUserData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.root}>
      {/* NOTE: MainHeader is REMOVED here because it is now provided globally 
        in app/(tabs)/_layout.tsx to persist across all tabs. 
      */}

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
          {/* TEXT GREETING (No Avatar here - Avatar is in Global Header) */}
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
                {user?.profile?.username || 'Operator'}
              </Text>
            </Text>
          </Animated.View>

          {/* --- BENTO GRID (USING 3D CARDS) --- */}
          <View
            style={[
              styles.gridContainer,
              isDesktop && styles.desktopGridContainer,
            ]}
          >
            {/* ROW 1: STREAK & LEVEL */}
            <View style={[styles.row, !isDesktop && { height: 160 }]}>
              <Bento3DCard
                className="border bg-slate-900/40 border-slate-800"
                style={{ flex: 1.5 }}
                delay={100}
                onPress={() => {}}
              >
                <View style={styles.cardContent}>
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

              <Bento3DCard
                className="border bg-slate-900/40 border-slate-800"
                style={{ flex: 1 }}
                delay={200}
                onPress={() => {}}
              >
                <View style={styles.cardContent}>
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

            {/* ROW 2: XP & SPRINT */}
            <View style={[styles.row, !isDesktop && { height: 160 }]}>
              <Bento3DCard
                className="border bg-slate-900/40 border-slate-800"
                style={{ flex: 1 }}
                delay={300}
                onPress={() => {}}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Zap size={18} color={THEME.indigo} fill={THEME.indigo} />
                    <Text style={[styles.cardLabel, { color: THEME.indigo }]}>
                      TOTAL XP
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.statValue}>
                      {stats?.xp?.toLocaleString() || 0}
                    </Text>
                    <Text style={styles.statSub}>Experience Points</Text>
                  </View>
                  <Activity
                    size={24}
                    color={THEME.slate}
                    style={{
                      opacity: 0.2,
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                    }}
                  />
                </View>
              </Bento3DCard>

              <Bento3DCard
                className="bg-indigo-600 border-indigo-500"
                style={{ flex: 1.5 }}
                onPress={() => router.push('/sprint')}
                delay={400}
              >
                <View
                  style={[
                    styles.cardContent,
                    { justifyContent: 'space-between' },
                  ]}
                >
                  <View>
                    <Text style={[styles.statValue, { fontSize: 24 }]}>
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
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    >
                      0 Sprints Today
                    </Text>
                  </View>
                </View>
              </Bento3DCard>
            </View>

            {/* ROW 3: ACTIVITY LOG */}
            <Bento3DCard
              className="h-40 border bg-slate-900/40 border-slate-800"
              style={{ width: '100%' }}
              delay={500}
              onPress={() => {}}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Activity size={16} color={THEME.slate} />
                  <Text style={[styles.cardLabel, { marginLeft: 8 }]}>
                    ACTIVITY LOG
                  </Text>
                </View>
                <View style={styles.chartContainer}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <View key={i} style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.random() * 60 + 20}%`,
                            backgroundColor: i === 5 ? THEME.indigo : '#334155',
                          },
                        ]}
                      />
                      <Text style={styles.dayLabel}>{day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Bento3DCard>

            {/* ROW 4: WEEKLY TARGET */}
            <Bento3DCard
              className="h-24 border bg-slate-900/40 border-slate-800"
              style={{ width: '100%' }}
              delay={600}
              onPress={() => {}}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                  ]}
                >
                  <Target size={20} color="#10b981" />
                </View>
                <View style={{ marginLeft: 16 }}>
                  <Text
                    style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}
                  >
                    Weekly Target
                  </Text>
                  <Text style={{ color: THEME.slate, fontSize: 12 }}>
                    0/5 Sprints Completed
                  </Text>
                </View>
              </View>
            </Bento3DCard>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.obsidian,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mobileScroll: {
    padding: 16,
  },
  desktopScroll: {
    paddingHorizontal: 40,
    paddingTop: 20,
    width: '100%',
  },
  headerTextContainer: {
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  dateLabel: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  greeting: {
    color: THEME.white,
    fontSize: 32,
    fontWeight: '800',
  },
  username: {
    color: THEME.indigo,
  },
  gridContainer: {
    gap: 16,
    width: '100%',
  },
  desktopGridContainer: {
    maxWidth: 1600,
    alignSelf: 'center',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    height: 180,
    width: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 4,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
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
    height: 60,
    marginTop: 20,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
  dayLabel: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '700',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});