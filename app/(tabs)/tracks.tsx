import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Terminal,
  Cpu,
  Server,
  Code,
  Smartphone,
  ArrowRight,
  Search,
  Zap,
  Lock,
  Star,
  RefreshCcw,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Tables } from '@/supabase/database.types';
import { Theme } from '@/lib/shared/Theme';

// --- TYPES & CONSTANTS ---
type Track = Tables<'tracks'>;

const THEME = {
  ...Theme.colors,
  obsidian: '#020617',
  surface: '#1e293b',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  textDim: '#94a3b8',
  border: 'rgba(255,255,255,.08)',
  gold: '#fbbf24',
};

const ICON_MAP: Record<string, any> = {
  terminal: Terminal,
  cpu: Cpu,
  server: Server,
  code: Code,
  smartphone: Smartphone,
  zap: Zap,
};

const GRADIENT_MAP: Record<string, readonly [string, string]> = {
  'from-yellow-400-to-blue-500': ['#fbbf24', '#3b82f6'],
  'from-orange-600-to-red-600': ['#ea580c', '#dc2626'],
  'from-red-500-to-orange-500': ['#ef4444', '#f97316'],
  'from-blue-600-to-blue-800': ['#2563eb', '#1e40af'],
  'from-blue-400-to-purple-500': ['#60a5fa', '#a855f7'],
  default: [THEME.indigo, '#4338ca'],
};

// --- SUB-COMPONENTS ---

const TrackCard = React.memo(function TrackCard({
  item,
  index,
  onPress,
}: {
  item: Track;
  index: number;
  onPress: (id: string) => void;
}) {
  const IconComponent = ICON_MAP[item.icon || ''] || Code;
  const gradientColors =
    GRADIENT_MAP[item.color_gradient || ''] || GRADIENT_MAP.default;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80)
        .springify()
        .damping(15)}
    >
      <TouchableOpacity
        style={styles.cardContainer}
        activeOpacity={0.85}
        onPress={() => onPress(item.id)}
      >
        <LinearGradient
          colors={[THEME.surface, '#111827']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBg}
        />

        <View style={styles.cardContent}>
          <View style={styles.iconBoxWrapper}>
            <LinearGradient
              colors={gradientColors}
              style={styles.iconBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <IconComponent size={28} color="white" />
            </LinearGradient>
            <View
              style={[styles.iconGlow, { backgroundColor: gradientColors[0] }]}
            />
          </View>

          <View style={styles.textColumn}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.is_premium && (
                <Lock size={14} color={THEME.gold} style={styles.lockIcon} />
              )}
            </View>

            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.badgesRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.difficulty}</Text>
              </View>
              <View style={[styles.badge, styles.xpBadge]}>
                <Star size={10} color={THEME.indigo} fill={THEME.indigo} />
                <Text style={[styles.badgeText, { color: THEME.indigo }]}>
                  10 LESSONS
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionColumn}>
            <View style={styles.arrowCircle}>
              <ArrowRight size={20} color="white" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

TrackCard.displayName = 'TrackCard';

// --- MAIN SCREEN ---

export default function TracksScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: tracks,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ['tracks-list'],
    queryFn: async ({ signal }) => {
      const { data, error: queryError } = await supabase
        .from('tracks')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: true })
        .abortSignal(signal);

      if (queryError) throw queryError;
      return data as Track[];
    },
    retry: 2,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleTrackPress = useCallback(
    (id: string) => {
      Haptics.selectionAsync();
      router.push(`/tracks/${id}`);
    },
    [router],
  );

  const renderItem: ListRenderItem<Track> = useCallback(
    ({ item, index }) => (
      <TrackCard item={item} index={index} onPress={handleTrackPress} />
    ),
    [handleTrackPress],
  );

  const ListEmptyComponent = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Code size={48} color={THEME.textDim} />
        <Text style={styles.emptyText}>
          {error ? 'Failed to load tracks' : 'No tracks available yet.'}
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <RefreshCcw size={16} color="white" style={styles.retryIcon} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, error, refetch]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ambientGlow} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>SKILL SPRINT</Text>
            <Text style={styles.headerTitle}>Learning Paths</Text>
          </View>

          <TouchableOpacity style={styles.searchButton}>
            <Search size={22} color="white" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.indigo}
              progressBackgroundColor={THEME.surface}
            />
          }
          ListHeaderComponent={
            <View style={styles.promoBanner}>
              <LinearGradient
                colors={['#4f46e5', '#9333ea']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.promoGradient}
              >
                <View style={styles.promoContent}>
                  <Zap size={24} color="#fbbf24" fill="#fbbf24" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoTitle}>Daily Sprint Active</Text>
                    <Text style={styles.promoSubtitle}>
                      +50 XP Bonus available now
                    </Text>
                  </View>
                  <ArrowRight size={20} color="white" />
                </View>
              </LinearGradient>
            </View>
          }
          ListEmptyComponent={ListEmptyComponent}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.obsidian },

  // Background glow
  ambientGlow: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: 0,
    height: 400,
    backgroundColor: 'rgba(99, 102, 241, .15)',
    borderRadius: 100,
    opacity: 0.6,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 10,
  },
  headerGreeting: {
    color: THEME.indigo,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.1)',
  },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Promo banner
  promoBanner: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: THEME.indigo,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 1, height: 4 },
  },
  promoGradient: { padding: 20 },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  promoTitle: { color: 'white', fontWeight: '800', fontSize: 16 },
  promoSubtitle: {
    color: 'rgba(255,255,255,.8)',
    fontSize: 13,
  },

  // Track card
  cardContainer: {
    marginBottom: 16,
    height: 130,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cardBg: { position: 'absolute', width: '100%', height: '100%' },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 24,
  },

  iconBoxWrapper: { position: 'relative', marginRight: 16 },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.2)',
  },
  iconGlow: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    bottom: -10,
    borderRadius: 18,
    opacity: 0.4,
    transform: [{ scale: 0.9 }],
    zIndex: 1,
  },

  textColumn: { flex: 1, justifyContent: 'center', gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  lockIcon: { marginLeft: 6 },
  cardDesc: {
    fontSize: 13,
    color: THEME.textDim,
    lineHeight: 18,
  },

  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.05)',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, .1)',
    borderColor: 'rgba(99, 102, 241, .2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textDim,
    textTransform: 'uppercase',
  },

  actionColumn: { justifyContent: 'center', marginLeft: 8 },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyText: { color: THEME.textDim, fontSize: 16 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  retryIcon: { marginRight: 8 },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },  
  safeArea: { flex: 1 },
});
