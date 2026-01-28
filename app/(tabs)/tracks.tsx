import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import {
  Terminal,
  Code,
  Smartphone,
  Cpu,
  Globe,
  Database,
  ArrowRight,
  Zap,
  Lock,
  Star,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '@/components/ui/GlassCard';

// --- THEME CONSTANTS ---
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  slate: '#94a3b8',
  emerald: '#10b981',
  gold: '#fbbf24',
  border: 'rgba(255,255,255,0.06)',
};

const CATEGORIES = ['ALL', 'FRONTEND', 'BACKEND', 'SYSTEMS', 'DATA'];

const ICON_MAP: Record<string, any> = {
  terminal: Terminal,
  code: Code,
  smartphone: Smartphone,
  cpu: Cpu,
  globe: Globe,
  database: Database,
};

// --- SUB-COMPONENT: SLEEK TRACK CARD ---
const TrackCard = ({
  item,
  index,
  onPress,
}: {
  item: any;
  index: number;
  onPress: (id: string) => void;
}) => {
  const Icon = ICON_MAP[item.icon] || Code;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)
        .springify()
        .damping(15)}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(item.id)}
        style={styles.cardWrapper}
      >
        <GlassCard intensity="light" style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View
              style={[styles.iconBox, { backgroundColor: `${THEME.indigo}20` }]}
            >
              <Icon size={24} color={THEME.indigo} />
            </View>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.diffBadge,
                  {
                    borderColor:
                      item.difficulty === 'ADVANCED'
                        ? THEME.violet
                        : THEME.emerald,
                  },
                ]}
              >
                <Text style={styles.diffText}>{item.difficulty}</Text>
              </View>
              {item.is_premium && <Lock size={12} color={THEME.gold} />}
            </View>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.metaRow}>
              <Star size={12} color={THEME.indigo} fill={THEME.indigo} />
              <Text style={styles.metaText}>20 NODES</Text>
              <View style={styles.dot} />
              <Zap size={12} color={THEME.emerald} fill={THEME.emerald} />
              <Text style={styles.metaText}>+500 XP</Text>
            </View>
            <View style={styles.arrowBox}>
              <ArrowRight size={16} color="white" />
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- MAIN SCREEN ---
export default function TracksScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ALL');

  const {
    data: tracks,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['tracks-dynamic-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filteredTracks = useMemo(() => {
    if (activeTab === 'ALL') return tracks;
    return tracks?.filter((t: any) => t.category === activeTab);
  }, [tracks, activeTab]);

  const handlePress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/tracks/${id}`);
  };

  if (isLoading)
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={THEME.indigo} />
      </View>
    );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>CHOOSE YOUR PATH</Text>
            <Text style={styles.headerTitle}>Learning Paths</Text>
          </View>
          <TouchableOpacity style={styles.searchBtn}>
            <Zap size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* PROFESSIONAL TAB NAVIGATION */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab(cat);
                }}
                style={[styles.tab, activeTab === cat && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === cat && styles.activeTabText,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* DYNAMIC TRACK LIST */}
        <FlatList
          data={filteredTracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TrackCard item={item} index={index} onPress={handlePress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={THEME.indigo}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No paths available in this category.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    color: THEME.indigo,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },

  tabBarWrapper: { marginTop: 15, marginBottom: 10 },
  tabsScroll: { paddingHorizontal: 24, gap: 10 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activeTab: { backgroundColor: THEME.indigo, borderColor: THEME.indigo },
  tabText: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  activeTabText: { color: 'white' },

  listContent: { padding: 24, paddingBottom: 100 },
  cardWrapper: { marginBottom: 20 },
  cardInner: { padding: 20, borderRadius: 24 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  diffText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  cardContent: { marginBottom: 20 },
  cardTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  cardDesc: { color: THEME.slate, fontSize: 14, marginTop: 6, lineHeight: 20 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 16,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: THEME.slate },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loaderContainer: {
    flex: 1,
    backgroundColor: THEME.obsidian,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: THEME.slate, fontSize: 14 },
});
