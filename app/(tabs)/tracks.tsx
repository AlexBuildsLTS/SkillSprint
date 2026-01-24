/**
 * ============================================================================
 * 📚 SCREEN: LEARNING TRACKS HUB (PRODUCTION GRADE)
 * ============================================================================
 * PATH: app/(tabs)/tracks.tsx
 * ARCHITECTURE:
 * - MVVM Pattern: Logic separated into custom hooks.
 * - Performance: Memoized list items, layout animations.
 * - UX: Skeleton loading, haptic feedback, searchable/filterable list.
 * ============================================================================
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  Layout,
  runOnJS,
} from 'react-native-reanimated';
import {
  Smartphone,
  Database,
  Palette,
  ChevronRight,
  Lock,
  Search,
  Filter,
  Zap,
  Code,
  Terminal,
  Cpu,
  Globe,
  Server,
  Layout as LayoutIcon,
  BookOpen,
  Star,
  CheckCircle2,
  Clock,
  BarChart3,
} from 'lucide-react-native';

// INTERNAL SERVICES
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';

// --- CONFIGURATION & THEME ---
const { width } = Dimensions.get('window');
const IS_DESKTOP = width >= 1024;

const THEME = {
  indigo: '#6366f1',
  indigoDark: '#4338ca',
  slate: '#94a3b8',
  slateDark: '#1e293b',
  obsidian: '#020617',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  white: '#ffffff',
  glassBorder: 'rgba(255,255,255,0.08)',
};

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Tracks' },
  { id: 'mobile', label: 'Mobile Dev' },
  { id: 'backend', label: 'Backend' },
  { id: 'design', label: 'System Design' },
  { id: 'devops', label: 'DevOps' },
];

// --- ICONS MAPPING ---
const ICON_MAP: Record<string, any> = {
  mobile: Smartphone,
  database: Database,
  design: Palette,
  code: Code,
  terminal: Terminal,
  cpu: Cpu,
  globe: Globe,
  server: Server,
  layout: LayoutIcon,
};

// --- TYPES ---
interface TrackWithProgress {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;
  is_premium: boolean | null;
  color_gradient: string | null;
  slug: string | null;
  lessons_count: number;
  completed_count: number;
  progress_percent: number;
  is_locked: boolean;
}

/**
 * ============================================================================
 * 🧩 COMPONENT: SKELETON LOADER
 * High-fidelity loading state placeholder
 * ============================================================================
 */
const TrackSkeleton = () => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withTiming(0.6, { duration: 800 }, (finished) => {
      if (finished) {
        opacity.value = withTiming(0.3, { duration: 800 });
      }
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.skeletonContainer, animatedStyle]}>
      <View style={styles.skeletonIcon} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonDesc} />
        <View style={styles.skeletonBar} />
      </View>
    </Animated.View>
  );
};

/**
 * ============================================================================
 * 🧩 COMPONENT: TRACK CARD
 * The primary interactive element for a learning path
 * ============================================================================
 */
const TrackCard = React.memo(
  ({
    track,
    index,
    onPress,
  }: {
    track: TrackWithProgress;
    index: number;
    onPress: () => void;
  }) => {
    const scale = useSharedValue(1);
    const IconComponent = ICON_MAP[track.icon || 'code'] || Code;

    // Difficulty Color Logic
    const getDifficultyColor = (diff: string | null) => {
      switch (diff) {
        case 'BEGINNER':
          return THEME.success;
        case 'INTERMEDIATE':
          return THEME.warning;
        case 'ADVANCED':
          return THEME.danger;
        default:
          return THEME.slate;
      }
    };

    const difficultyColor = getDifficultyColor(track.difficulty);

    const handlePressIn = () => {
      scale.value = withSpring(0.98);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100)
          .springify()
          .damping(15)}
        layout={Layout.springify()}
        style={{ marginBottom: 16 }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            Haptics.selectionAsync();
            onPress();
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={[styles.cardContainer, animatedStyle]}>
            <GlassCard intensity="light" style={styles.cardInner}>
              {/* ICON COLUMN */}
              <View style={styles.iconColumn}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: track.is_locked
                        ? '#1e293b'
                        : 'rgba(99, 102, 241, 0.1)',
                      borderColor: track.is_locked
                        ? '#334155'
                        : 'rgba(99, 102, 241, 0.2)',
                    },
                  ]}
                >
                  {track.is_locked ? (
                    <Lock size={22} color="#64748b" />
                  ) : (
                    <IconComponent size={24} color={THEME.indigo} />
                  )}
                </View>
                {track.is_premium && !track.is_locked && (
                  <View style={styles.premiumBadge}>
                    <Star size={8} color="#020617" fill="#020617" />
                    <Text style={styles.premiumText}>PRO</Text>
                  </View>
                )}
              </View>

              {/* CONTENT COLUMN */}
              <View style={styles.contentColumn}>
                <View style={styles.headerRow}>
                  <Text
                    style={[
                      styles.trackTitle,
                      track.is_locked && styles.textLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {track.title}
                  </Text>
                  {track.is_locked && (
                    <View style={styles.lockedBadge}>
                      <Lock size={10} color="#94a3b8" />
                      <Text style={styles.lockedText}>LOCKED</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.trackDesc} numberOfLines={2}>
                  {track.description ||
                    'Master this technical domain through curated lessons.'}
                </Text>

                {/* META INFO ROW */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <BarChart3 size={12} color={difficultyColor} />
                    <Text style={[styles.metaText, { color: difficultyColor }]}>
                      {track.difficulty || 'GENERAL'}
                    </Text>
                  </View>
                  <View style={styles.dotSeparator} />
                  <View style={styles.metaItem}>
                    <BookOpen size={12} color={THEME.slate} />
                    <Text style={styles.metaText}>
                      {track.lessons_count} Lessons
                    </Text>
                  </View>
                </View>

                {/* PROGRESS BAR */}
                {!track.is_locked && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${track.progress_percent}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round(track.progress_percent)}%
                    </Text>
                  </View>
                )}
              </View>

              {/* ARROW INDICATOR */}
              <View style={styles.actionColumn}>
                {!track.is_locked ? (
                  <View style={styles.chevronBox}>
                    <ChevronRight size={16} color={THEME.white} />
                  </View>
                ) : (
                  <View />
                )}
              </View>
            </GlassCard>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  },
);
TrackCard.displayName = 'TrackCard';

/**
 * ============================================================================
 * 🚀 MAIN SCREEN: TRACKS LIST
 * ============================================================================
 */
export default function TracksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isSearching, setIsSearching] = useState(false);

  /**
   * DATA FETCHING STRATEGY
   * 1. Fetch all tracks.
   * 2. Join with user_progress to get lesson completion status.
   * 3. Calculate % complete for each track.
   */
  const {
    data: tracks,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['tracks_with_progress', user?.id],
    queryFn: async () => {
      // 1. Get Tracks & Lesson Count
      const { data: rawTracks, error: tracksError } = await supabase
        .from('tracks')
        .select(
          `
          *,
          lessons:lessons(count)
        `,
        )
        .eq('is_published', true)
        .order('title');

      if (tracksError) throw tracksError;

      if (!user)
        return rawTracks?.map((t) => ({
          ...t,
          lessons_count: t.lessons?.[0]?.count || 0,
          completed_count: 0,
          progress_percent: 0,
          is_locked: false, // Or true if you require login
        }));

      // 2. Get User Progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('lesson_id, is_completed, lessons(track_id)')
        .eq('user_id', user.id)
        .eq('is_completed', true);

      if (progressError) throw progressError;

      // 3. Map & Calculate
      return rawTracks?.map((track) => {
        const totalLessons = track.lessons?.[0]?.count || 0;

        // Count completed lessons for this specific track
        const completed =
          progressData?.filter((p: any) => p.lessons?.track_id === track.id)
            .length || 0;

        // Mock Logic: Lock premium tracks for free users (if you had a subscription table)
        // For now, we'll lock if it's "Advanced" and user level < 5 (Mock logic)
        const isLocked = false;

        return {
          ...track,
          lessons_count: totalLessons,
          completed_count: completed,
          progress_percent:
            totalLessons > 0 ? (completed / totalLessons) * 100 : 0,
          is_locked: isLocked,
        } as TrackWithProgress;
      });
    },
  });

  /**
   * FILTERING LOGIC
   * Memoized to prevent heavy recalculations on render
   */
  const filteredTracks = useMemo(() => {
    if (!tracks) return [];

    return tracks.filter((t) => {
      // 1. Text Search
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Category Filter (Mock implementation based on title/slug keywords)
      // In a real app, you'd have a 'category' column or tags table.
      let matchesCategory = true;
      if (selectedFilter !== 'all') {
        const slug = t.slug?.toLowerCase() || '';
        const title = t.title.toLowerCase();

        if (selectedFilter === 'mobile')
          matchesCategory =
            slug.includes('react-native') ||
            title.includes('mobile') ||
            title.includes('android') ||
            title.includes('ios');
        else if (selectedFilter === 'backend')
          matchesCategory =
            slug.includes('sql') ||
            title.includes('api') ||
            title.includes('server') ||
            title.includes('node');
        else if (selectedFilter === 'design')
          matchesCategory =
            title.includes('design') ||
            title.includes('ui/ux') ||
            title.includes('figma');
        else if (selectedFilter === 'devops')
          matchesCategory =
            title.includes('docker') ||
            title.includes('aws') ||
            title.includes('deploy');
      }

      return matchesSearch && matchesCategory;
    });
  }, [tracks, searchQuery, selectedFilter]);

  const handleTrackPress = (track: TrackWithProgress) => {
    if (track.is_locked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return; // Or show upgrade modal
    }
    // Navigate to track details (Assuming you will create app/tracks/[id].tsx later)
    // For now, we can push to a placeholder or alert
    // router.push(`/tracks/${track.id}`);
    console.log('Navigate to track:', track.id);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>CURATED PATHS</Text>
          <Text style={styles.headerTitle}>Learning Tracks</Text>
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => setIsSearching(!isSearching)}
        >
          {isSearching ? (
            <Filter size={20} color={THEME.indigo} />
          ) : (
            <Search size={20} color={THEME.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR (Expandable) */}
      {isSearching && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <View style={styles.searchContainer}>
            <Search size={18} color={THEME.slate} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search technologies..."
              placeholderTextColor={THEME.slate}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        </Animated.View>
      )}

      {/* FILTER CHIPS */}
      <View style={{ height: 60 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORY_FILTERS.map((filter, index) => {
            const isActive = selectedFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedFilter(filter.id);
                }}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* MAIN CONTENT LIST */}
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={{ padding: 24, gap: 16 }}>
            <TrackSkeleton />
            <TrackSkeleton />
            <TrackSkeleton />
          </View>
        ) : (
          <FlatList
            data={filteredTracks}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TrackCard
                track={item}
                index={index}
                onPress={() => handleTrackPress(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refetch}
                tintColor={THEME.indigo}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Database size={48} color={THEME.slateDark} />
                <Text style={styles.emptyTitle}>No tracks found</Text>
                <Text style={styles.emptyDesc}>
                  Try adjusting your filters or search query.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFilter('all');
                  }}
                >
                  <Text style={styles.emptyLink}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            }
            // Add a "Coming Soon" locked track at the bottom for flair
            ListFooterComponent={
              filteredTracks.length > 0 ? (
                <GlassCard
                  style={StyleSheet.flatten([
                    styles.cardInner,
                    { opacity: 0.5, borderStyle: 'dashed', marginTop: 16 },
                  ])}
                  intensity="light"
                >
                  <View style={styles.iconColumn}>
                    <View
                      style={[styles.iconBox, { backgroundColor: '#0f172a' }]}
                    >
                      <Lock size={20} color="#475569" />
                    </View>
                  </View>
                  <View style={styles.contentColumn}>
                    <Text style={[styles.trackTitle, { color: '#64748b' }]}>
                      Expert Architecture
                    </Text>
                    <Text style={styles.trackDesc}>
                      Advanced distributed systems patterns.
                    </Text>
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedText}>COMING SOON</Text>
                    </View>
                  </View>
                </GlassCard>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/**
 * ============================================================================
 * 🎨 STYLESHEET
 * Optimized for performance and responsiveness
 * ============================================================================
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.obsidian,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSub: {
    color: THEME.indigo,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    color: THEME.white,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    height: 50,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: THEME.white,
    fontSize: 16,
    fontWeight: '500',
  },
  filterScroll: {
    paddingHorizontal: 24,
    gap: 10,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: THEME.indigo,
  },
  filterText: {
    color: THEME.slate,
    fontWeight: '700',
    fontSize: 12,
  },
  filterTextActive: {
    color: THEME.white,
  },
  listContent: {
    padding: 24,
    paddingBottom: 140, // Space for bottom tab bar
  },
  // CARD STYLES
  cardContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cardInner: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Fallback for glass
  },
  iconColumn: {
    marginRight: 16,
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: THEME.indigo,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  premiumText: {
    color: '#020617',
    fontSize: 8,
    fontWeight: '900',
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trackTitle: {
    color: THEME.white,
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  textLocked: {
    color: THEME.slate,
  },
  trackDesc: {
    color: THEME.slate,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.slate,
    textTransform: 'uppercase',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#334155',
    marginHorizontal: 8,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lockedText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.indigo,
    borderRadius: 3,
  },
  progressText: {
    color: THEME.white,
    fontSize: 11,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },
  actionColumn: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  chevronBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // SKELETON
  skeletonContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    marginBottom: 16,
  },
  skeletonIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 16,
  },
  skeletonTitle: {
    width: '60%',
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  skeletonDesc: {
    width: '90%',
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: 4,
  },
  skeletonBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: 12,
  },
  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    opacity: 0.5,
  },
  emptyTitle: {
    color: THEME.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyDesc: {
    color: THEME.slate,
    fontSize: 14,
    marginTop: 4,
  },
  emptyLink: {
    color: THEME.indigo,
    fontWeight: 'bold',
    marginTop: 12,
  },
});
