/**
 * SKILLSPRINT MOBILE - TRACKS EXPLORATION SCREEN
 * ----------------------------------------------
 * This component serves as the main hub for users to discover learning paths.
 *
 * ARCHITECTURAL OVERVIEW:
 * 1. Data Layer: TanStack Query fetches tracks joined with lesson counts from Supabase.
 * 2. Filter Layer: Memoized filtering logic handles Search + Category + Difficulty.
 * 3. UI Layer: Uses "Bento" grid styling with Glassmorphism overlays via Expo Linear Gradient.
 * 4. Animation: Reanimated 3 handles entry sequences and layout transitions.
 *
 * CRITICAL FIXES (v2.1):
 * - Fixed layout inconsistency where long descriptions pushed content off-card.
 * - Enforced strict height constraints for uniform Bento grid alignment.
 * - Optimized re-renders with React.memo and useCallback.
 *
 * @author SkillSprint Engineering
 * @version 2.1.0 (Stable Layouts)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Keyboard,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';

// --- NAVIGATION & SAFE AREA ---
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- DATA & STATE MANAGEMENT ---
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// --- UI & ANIMATION LIBRARIES ---
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  Layout,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// --- ICONS (LUCIDE) ---
import {
  Terminal,
  Code,
  Smartphone,
  Cpu,
  Globe,
  Database,
  Zap,
  Lock,
  Search,
  Layers,
  Server,
  Cloud,
  Shield,
  X,
  LayoutTemplate,
  BrainCircuit,
  Box,
  ChevronRight,
  Route,
} from 'lucide-react-native';

// --- CUSTOM COMPONENTS ---
import { GlassCard } from '@/components/ui/GlassCard';

// ---------------------------------------------------------------------------
// CONFIGURATION & CONSTANTS
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Global Design System Theme
 * Centralized colors to ensure consistency across the UI.
 */
const THEME = {
  background: {
    primary: '#020617', // Obsidian
    secondary: '#0f172a', // Charcoal
    tertiary: '#1e293b', // Slate 800
  },
  text: {
    primary: '#ffffff',
    secondary: '#94a3b8', // Slate 400
    tertiary: '#64748b', // Slate 500
  },
  accent: {
    indigo: '#6366f1',
    violet: '#8b5cf6',
    emerald: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',
    cyan: '#06b6d4',
  },
  ui: {
    border: 'rgba(255,255,255,0.08)',
    glass: 'rgba(255,255,255,0.03)',
    inputBg: 'rgba(255,255,255,0.05)',
  },
};

/**
 * Filter Categories
 * These match the 'category' enum/check constraint in the Supabase 'tracks' table.
 */
export const CATEGORIES = [
  'ALL',
  'FRONTEND',
  'BACKEND',
  'SYSTEMS',
  'MOBILE',
  'DATA',
  'AI',
  'DEVOPS',
  'CLOUD',
  'SECURITY',
] as const;

/**
 * Difficulty Levels
 * Matches the 'difficulty' column in the database.
 */
const DIFFICULTIES = ['ALL LEVELS', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

/**
 * Icon Mapping
 * Maps the string stored in DB column 'icon' to actual React Components.
 */
const ICON_MAP: Record<string, any> = {
  terminal: Terminal,
  code: Code,
  smartphone: Smartphone,
  cpu: Cpu,
  globe: Globe,
  database: Database,
  server: Server,
  cloud: Cloud,
  shield: Shield,
  activity: Zap,
  layout: LayoutTemplate,
  zap: Zap,
  brain: BrainCircuit,
  box: Box,
};

// ---------------------------------------------------------------------------
// TYPESCRIPT INTERFACES
// ---------------------------------------------------------------------------

interface TrackData {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  difficulty: string;
  color_gradient: string;
  is_premium: boolean;
  slug: string | null;
  lessons?: { count: number }[] | null;
}

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Gradient Parser
 * Robustly maps DB strings to Expo Linear Gradient colors.
 */
const getGradientColors = (
  gradientStr: string | null,
): [string, string, ...string[]] => {
  if (!gradientStr) return ['#1e293b', '#0f172a'];

  const s = gradientStr.toLowerCase();

  if (s.includes('blue')) return ['#1e3a8a', '#0f172a'];
  if (s.includes('purple')) return ['#581c87', '#0f172a'];
  if (s.includes('red')) return ['#7f1d1d', '#0f172a'];
  if (s.includes('green') || s.includes('emerald'))
    return ['#064e3b', '#0f172a'];
  if (s.includes('orange')) return ['#7c2d12', '#0f172a'];
  if (s.includes('cyan')) return ['#0e7490', '#0f172a'];
  if (s.includes('pink')) return ['#831843', '#0f172a'];
  if (s.includes('indigo')) return ['#312e81', '#0f172a'];
  if (s.includes('yellow')) return ['#713f12', '#0f172a'];
  if (s.includes('slate')) return ['#334155', '#0f172a'];

  return ['#334155', '#0f172a'];
};

const getLessonCount = (item: TrackData): number => {
  if (Array.isArray(item.lessons) && item.lessons.length > 0) {
    return item.lessons[0].count;
  }
  return 0;
};

// ---------------------------------------------------------------------------
// SUB-COMPONENTS
// ---------------------------------------------------------------------------

/**
 * FilterChip Component
 * Smoothly animated selection pills.
 */
const FilterChip = ({
  label,
  isActive,
  onPress,
  variant = 'primary',
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        isActive
          ? variant === 'primary'
            ? THEME.accent.indigo
            : 'rgba(16, 185, 129, 0.15)'
          : 'rgba(255,255,255,0.03)',
        { duration: 200 },
      ),
      borderColor: withTiming(
        isActive
          ? variant === 'primary'
            ? THEME.accent.indigo
            : THEME.accent.emerald
          : THEME.ui.border,
        { duration: 200 },
      ),
    };
  });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Animated.View
        style={[
          styles.filterChip,
          variant === 'secondary' && styles.filterChipSecondary,
          animatedStyle,
        ]}
      >
        <Text
          style={[
            styles.filterText,
            isActive && {
              color: variant === 'primary' ? 'white' : THEME.accent.emerald,
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * TrackCard Component
 * The visual workhorse. Contains strict layout logic to prevent overflows.
 */
const TrackCard = React.memo(
  ({
    item,
    index,
    onPress,
  }: {
    item: TrackData;
    index: number;
    onPress: (id: string) => void;
  }) => {
    const Icon = ICON_MAP[item.icon] || Code;
    const colors = getGradientColors(item.color_gradient);
    const nodeCount = getLessonCount(item);

    const getDifficultyColor = (diff: string) => {
      switch (diff) {
        case 'BEGINNER':
          return THEME.accent.emerald;
        case 'INTERMEDIATE':
          return THEME.accent.amber;
        case 'ADVANCED':
          return THEME.accent.rose;
        default:
          return THEME.text.secondary;
      }
    };

    const diffColor = getDifficultyColor(item.difficulty);

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 60)
          .springify()
          .damping(16)}
        layout={Layout.springify()}
        style={styles.cardWrapper}
      >
        <TouchableOpacity
          activeOpacity={0.94}
          onPress={() => onPress(item.id)}
          style={styles.cardTouchable}
        >
          {/* 1. Base Gradient Layer */}
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            locations={[0.1, 0.95]}
          />

          {/* 2. Glass Texture Overlay */}
          <GlassCard style={styles.cardInner}>
            {/* Top Row: Icon & Badge */}
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Icon size={24} color="white" />
              </View>

              <View
                style={[
                  styles.badgeContainer,
                  { borderColor: diffColor, backgroundColor: `${diffColor}15` },
                ]}
              >
                <Text style={[styles.badgeText, { color: diffColor }]}>
                  {item.difficulty}
                </Text>
              </View>
            </View>

            {/* Middle Row: Content (STRICT FLEX CONSTRAINTS) */}
            <View style={styles.cardBody}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.is_premium && (
                  <Lock
                    size={14}
                    color={THEME.accent.amber}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
              {/* Force max 2 lines to prevent layout shift */}
              <Text
                style={styles.cardDesc}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.description}
              </Text>
            </View>

            {/* Bottom Row: Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Layers size={13} color={THEME.text.secondary} />
                  <Text style={styles.statText}>{nodeCount} Nodes</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Zap size={13} color={THEME.accent.amber} />
                  <Text
                    style={[styles.statText, { color: THEME.accent.amber }]}
                  >
                    +500 XP
                  </Text>
                </View>
              </View>

              <View style={styles.actionIcon}>
                <ChevronRight size={18} color="white" />
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  },
);

// ---------------------------------------------------------------------------
// MAIN SCREEN COMPONENT
// ---------------------------------------------------------------------------

export default function TracksScreen() {
  const router = useRouter();

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeDifficulty, setActiveDifficulty] = useState('ALL LEVELS');

  // --- DATA FETCHING ---
  const {
    data: tracks,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['tracks-pro-v2'],
    queryFn: async () => {
      // Supabase Join Query
      const { data, error } = await supabase
        .from('tracks')
        .select(
          `
          *,
          lessons (count)
        `,
        )
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[TracksScreen] Error:', error);
        throw error;
      }
      return data as TrackData[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- MEMOIZED FILTERING ---
  const filteredData = useMemo(() => {
    if (!tracks) return [];
    const query = searchQuery.toLowerCase().trim();

    return tracks.filter((track) => {
      const matchesSearch =
        track.title.toLowerCase().includes(query) ||
        track.description?.toLowerCase().includes(query);

      const matchesCategory =
        activeCategory === 'ALL' || track.category === activeCategory;

      const matchesDifficulty =
        activeDifficulty === 'ALL LEVELS' ||
        track.difficulty === activeDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [tracks, searchQuery, activeCategory, activeDifficulty]);

  // --- HANDLERS ---
  const handleTrackPress = useCallback(
    (id: string) => {
      Haptics.selectionAsync();
      router.push(`/tracks/${id}`);
    },
    [router],
  );

  const clearSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  // --- SUB-RENDERS ---
  const renderEmptyState = () => (
    <Animated.View
      entering={FadeInDown.springify()}
      style={styles.emptyContainer}
    >
      <View style={styles.emptyIconCircle}>
        <Search size={32} color={THEME.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No paths found</Text>
      <Text style={styles.emptyDesc}>
        We couldn't find any learning paths matching "{searchQuery}".
        {'\n'}Try adjusting your filters.
      </Text>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => {
          setSearchQuery('');
          setActiveCategory('ALL');
          setActiveDifficulty('ALL LEVELS');
        }}
      >
        <Text style={styles.resetButtonText}>Clear All Filters</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleArea}>
            <Route size={18} color={THEME.accent.cyan} /> 
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>BETA</Text>
        </View>
      </View>
      <Text style={styles.headerSubtitle}>
        Master professional skills
      </Text>

      <View style={styles.searchContainer}>
        <View style={styles.searchIconWrapper}>
          <Search size={18} color={THEME.text.secondary} />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Python, React, Architecture..."
          placeholderTextColor={THEME.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          selectionColor={THEME.accent.indigo}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <X size={14} color={THEME.text.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[THEME.background.primary, '#050505']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderHeader()}

        {/* Filters */}
        <View style={styles.filtersWrapper}>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `cat-${item}`}
            renderItem={({ item }) => (
              <FilterChip
                label={item}
                isActive={activeCategory === item}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(item);
                }}
              />
            )}
            contentContainerStyle={styles.filterContentContainer}
            style={styles.filterList}
          />

          <FlatList
            data={DIFFICULTIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `diff-${item}`}
            renderItem={({ item }) => (
              <FilterChip
                label={item}
                isActive={activeDifficulty === item}
                variant="secondary"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveDifficulty(item);
                }}
              />
            )}
            contentContainerStyle={styles.filterContentContainer}
            style={styles.filterList}
          />
        </View>

        {/* List Content */}
        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.accent.indigo} />
            <Text style={styles.loadingText}>Loading curriculum...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TrackCard item={item} index={index} onPress={handleTrackPress} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={Keyboard.dismiss}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={THEME.accent.indigo}
                colors={[THEME.accent.indigo]}
              />
            }
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.background.primary,
  },
  safeArea: {
    flex: 1,
  },

  // HEADER
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text.primary,
    letterSpacing: -0.5,
  },
  betaBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  betaText: {
    color: THEME.accent.indigo,
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: THEME.text.secondary,
    fontSize: 14,
    marginBottom: 16,
  },

  // SEARCH
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.ui.inputBg,
    borderRadius: 14,
    height: 48,
    borderWidth: 1,
    borderColor: THEME.ui.border,
  },
  searchIconWrapper: {
    paddingLeft: 14,
    paddingRight: 10,
  },
  searchInput: {
    flex: 1,
    color: THEME.text.primary,
    fontSize: 15,
    height: '100%',
    fontWeight: '500',
  },
  clearButton: {
    padding: 8,
    marginRight: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },

  // FILTERS
  filtersWrapper: {
    paddingBottom: 10,
  },
  filterList: {
    marginBottom: 10,
    maxHeight: 40,
  },
  filterContentContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: THEME.ui.border,
  },
  filterChipSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  filterText: {
    color: THEME.text.secondary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },

  // LOADING
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  loadingText: {
    marginTop: 12,
    color: THEME.text.tertiary,
    fontSize: 14,
  },

  // LIST CONTENT
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 10,
  },

  // --- CARD STYLES (STRICT LAYOUT) ---
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cardTouchable: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 185, // FIXED HEIGHT FOR CONSISTENCY
  },
  cardInner: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between', // CRITICAL: This pushes Footer to bottom, Header to top
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  // Header Section
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8, // Fixed gap
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Body Section (Flexible height)
  cardBody: {
    flex: 1, // Takes available space
    justifyContent: 'center', // Centers content vertically in the middle area
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    color: THEME.text.primary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    flex: 1, // Ensures title doesn't push lock icon
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 18, // Tight line height for dense info
    fontWeight: '500',
  },

  // Footer Section
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8, // Fixed gap from body
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    color: THEME.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // EMPTY STATE
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.ui.border,
  },
  emptyTitle: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyDesc: {
    color: THEME.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: THEME.ui.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.ui.border,
  },
  resetButtonText: {
    color: THEME.accent.indigo,
    fontWeight: '600',
    fontSize: 14,
  },
});
