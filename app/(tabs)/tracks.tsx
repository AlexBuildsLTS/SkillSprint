import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  StatusBar, 
  RefreshControl,
  Dimensions,
  Platform,
  Image
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
  Star
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring,  } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// --- THEME ENGINE ---
const THEME = {
  obsidian: '#020617',
  charcoal: '#0f172a',
  surface: '#1e293b',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  text: '#f8fafc',
  textDim: '#94a3b8',
  border: 'rgba(255,255,255,0.08)',
  gold: '#fbbf24'
};

// --- ASSET MAPPING ---
const IconMap: Record<string, any> = {
  'terminal': Terminal,
  'cpu': Cpu,
  'server': Server,
  'code': Code,
  'smartphone': Smartphone,
  'zap': Zap
};

const GradientMap: Record<string, readonly [string, string]> = {
  'from-yellow-400-to-blue-500': ['#fbbf24', '#3b82f6'],
  'from-orange-600-to-red-600': ['#ea580c', '#dc2626'],
  'from-red-500-to-orange-500': ['#ef4444', '#f97316'],
  'from-blue-600-to-blue-800': ['#2563eb', '#1e40af'],
  'from-blue-400-to-purple-500': ['#60a5fa', '#a855f7'],
  'default': ['#6366f1', '#4338ca']
};

export default function TracksScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // --- DATA FETCHING (CRASH PROOF) ---
  const { data: tracks, isLoading, refetch } = useQuery({
    queryKey: ['tracks-list'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: true })
        .abortSignal(signal); // Prevents "Signal Aborted" crash
      
      if (error) throw error;
      return data;
    },
    retry: 1
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // --- RENDER ITEM ---
  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const IconComponent = IconMap[item.icon] || Code;
    const gradientColors = GradientMap[item.color_gradient] || GradientMap['default'];

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
        <TouchableOpacity 
          style={styles.cardContainer} 
          activeOpacity={0.9}
          onPress={() => {
            Haptics.selectionAsync();
            router.push(`/tracks/${item.id}`); // This route must exist in your file system
          }}
        >
          {/* Card Background */}
          <LinearGradient
            colors={[THEME.surface, '#111827']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardBg}
          />
          
          {/* Content Row */}
          <View style={styles.cardContent}>
            
            {/* Left: Icon Box */}
            <View style={styles.iconBoxWrapper}>
              <LinearGradient
                colors={gradientColors}
                style={styles.iconBox}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <IconComponent size={28} color="white" />
              </LinearGradient>
              {/* Glow Effect */}
              <View style={[styles.iconGlow, { backgroundColor: gradientColors[0] }]} />
            </View>

            {/* Center: Text Info */}
            <View style={styles.textColumn}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.is_premium && <Lock size={14} color={THEME.gold} style={{marginLeft: 6}} />}
              </View>
              
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>

              {/* Meta Badges */}
              <View style={styles.badgesRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.difficulty}</Text>
                </View>
                <View style={[styles.badge, styles.xpBadge]}>
                  <Star size={10} color={THEME.indigo} fill={THEME.indigo} />
                  <Text style={[styles.badgeText, { color: THEME.indigo }]}>10 LESSONS</Text>
                </View>
              </View>
            </View>

            {/* Right: Action Arrow */}
            <View style={styles.actionColumn}>
              <View style={styles.arrowCircle}>
                <ArrowRight size={20} color="white" />
              </View>
            </View>

          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* BACKGROUND AMBIANCE */}
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ambientGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        {/* HEADER AREA */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>SKILL SPRINT</Text>
            <Text style={styles.headerTitle}>Learning Paths</Text>
          </View>
          <TouchableOpacity style={styles.searchButton}>
            <Search size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* LIST */}
        <FlatList
          data={tracks}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
                start={{x:0, y:0}} end={{x:1, y:0}}
                style={styles.promoGradient}
              >
                <View style={styles.promoContent}>
                  <Zap size={24} color="#fbbf24" fill="#fbbf24" />
                  <View style={{flex: 1}}>
                    <Text style={styles.promoTitle}>Daily Sprint Active</Text>
                    <Text style={styles.promoSubtitle}>+50 XP Bonus available now</Text>
                  </View>
                  <ArrowRight size={20} color="white" />
                </View>
              </LinearGradient>
            </View>
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Code size={48} color={THEME.textDim} />
                <Text style={styles.emptyText}>No tracks available yet.</Text>
                <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Reload Database</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.obsidian },
  
  // Ambiance
  ambientGlow: {
    position: 'absolute', top: -100, left: -100, right: 0, height: 400,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    transform: [{ scaleX: 1.5 }],
    borderRadius: 1000,
    filter: 'blur(80px)', // Valid in React Native? No, but works in Expo Go usually or ignored.
    opacity: 0.6
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    marginBottom: 10
  },
  headerGreeting: {
    color: THEME.indigo, fontSize: 12, fontWeight: '900', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 4
  },
  headerTitle: {
    color: 'white', fontSize: 32, fontWeight: '800', letterSpacing: -0.5
  },
  searchButton: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Promo Banner
  promoBanner: { marginBottom: 24, borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: THEME.indigo, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: {width: 0, height: 4} },
  promoGradient: { padding: 20 },
  promoContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  promoTitle: { color: 'white', fontWeight: '800', fontSize: 16 },
  promoSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  // Card Styling
  cardContainer: {
    marginBottom: 16, height: 130, borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 6
  },
  cardBg: { position: 'absolute', width: '100%', height: '100%' },
  cardContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16,
    borderWidth: 1, borderColor: THEME.border, borderRadius: 24
  },

  // Icon Column
  iconBoxWrapper: { position: 'relative', marginRight: 16 },
  iconBox: {
    width: 64, height: 64, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  iconGlow: {
    position: 'absolute', top: 10, left: 0, right: 0, bottom: -10,
    borderRadius: 18, opacity: 0.4, transform: [{scale: 0.9}], zIndex: 1
  },

  // Text Column
  textColumn: { flex: 1, justifyContent: 'center', gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: 'white', letterSpacing: 0.3 },
  cardDesc: { fontSize: 13, color: THEME.textDim, lineHeight: 18 },
  
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' },
  badgeText: { fontSize: 10, fontWeight: '800', color: THEME.textDim, textTransform: 'uppercase' },

  // Action Column
  actionColumn: { justifyContent: 'center', marginLeft: 8 },
  arrowCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center'
  },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 16 },
  emptyText: { color: THEME.textDim, fontSize: 16 },
  retryBtn: { padding: 12, backgroundColor: THEME.surface, borderRadius: 12, borderWidth: 1, borderColor: THEME.border },
  retryText: { color: 'white', fontWeight: 'bold' }
});