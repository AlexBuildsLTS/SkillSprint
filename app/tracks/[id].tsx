import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Dimensions, 
  StatusBar,
  ImageBackground
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, PlayCircle, Trophy, Clock, BarChart3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

const THEME = {
  obsidian: '#020617',
  charcoal: '#0f172a',
  surface: '#1e293b',
  indigo: '#6366f1',
  indigoDark: '#4338ca',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  success: '#10b981',
  border: 'rgba(255,255,255,0.08)',
};

export default function TrackDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const trackId = Array.isArray(id) ? id[0] : id;

  const { data: track, isLoading, error } = useQuery({
    queryKey: ['track', trackId],
    queryFn: async () => {
      if (!trackId) return null;
      const { data, error } = await supabase
        .from('tracks')
        .select('*, lessons(*)')
        .eq('id', trackId)
        .single();
      
      if (error) throw error;
      
      if (data.lessons) {
        data.lessons.sort((a: any, b: any) => a.order - b.order);
      }
      return data;
    },
    enabled: !!trackId,
  });

  // --- LOADING STATE (SKELETON) ---
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.skeleton, { width: 40, height: 40, borderRadius: 12 }]} />
          <View style={[styles.skeleton, { width: 150, height: 24, borderRadius: 4 }]} />
        </View>
        <View style={{ padding: 24, gap: 16 }}>
          <View style={[styles.skeleton, { width: '100%', height: 200, borderRadius: 24 }]} />
          <View style={[styles.skeleton, { width: '60%', height: 20, borderRadius: 4 }]} />
          <View style={[styles.skeleton, { width: '100%', height: 80, borderRadius: 16 }]} />
          <View style={[styles.skeleton, { width: '100%', height: 80, borderRadius: 16 }]} />
        </View>
      </SafeAreaView>
    );
  }

  // --- ERROR STATE ---
  if (error || !track) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Trophy size={48} color={THEME.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
        <Text style={styles.errorTitle}>Track Not Found</Text>
        <Text style={styles.errorText}>We couldn&apos;t load the course details.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalXp = track.lessons?.reduce((sum: number, l: any) => sum + (l.xp_reward || 0), 0) || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* BACKGROUND GRADIENT */}
      <LinearGradient
        colors={[THEME.charcoal, THEME.obsidian]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Course Overview</Text>
          <View style={{ width: 40 }} /> 
        </Animated.View>

        <FlatList
          data={track.lessons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              {/* HERO CARD */}
              <View style={styles.heroCard}>
                <LinearGradient
                  colors={[THEME.indigo, THEME.indigoDark]}
                  style={styles.heroGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.iconCircle}>
                    <Trophy size={32} color="white" />
                  </View>
                  <Text style={styles.trackTitle}>{track.title}</Text>
                  <Text style={styles.trackDesc}>{track.description}</Text>
                  
                  {/* STATS ROW */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <BarChart3 size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.statText}>{track.difficulty}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                      <Trophy size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.statText}>{totalXp} Total XP</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                      <Clock size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.statText}>{track.lessons?.length || 0} Lessons</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.sectionTitle}>Curriculum</Text>
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(200 + (index * 50)).duration(400)}>
              <TouchableOpacity style={styles.lessonCard} activeOpacity={0.8}>
                <View style={styles.lessonLeft}>
                  <View style={styles.indexContainer}>
                    <Text style={styles.lessonIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lessonTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.lessonSubtitle}>+{item.xp_reward} XP Reward</Text>
                  </View>
                </View>
                <View style={styles.playButton}>
                  <PlayCircle size={20} color={THEME.indigo} fill={THEME.indigo} stroke="white" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.obsidian },
  errorContainer: { flex: 1, backgroundColor: THEME.obsidian, alignItems: 'center', justifyContent: 'center', padding: 24 },
  
  // Skeleton
  skeleton: { backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 12 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: THEME.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Hero Card
  heroCard: { 
    marginBottom: 32, 
    borderRadius: 32, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroGradient: { padding: 24, alignItems: 'center' },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  trackTitle: { fontSize: 24, fontWeight: '800', color: 'white', textAlign: 'center', marginBottom: 8 },
  trackDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  
  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  statText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  divider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)' },

  // List
  listContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: 'white', marginBottom: 16, marginLeft: 4 },
  
  // Lesson Card
  lessonCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: THEME.charcoal,
    padding: 16, borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1, borderColor: THEME.border,
  },
  lessonLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  indexContainer: { 
    width: 40, height: 40, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  lessonIndex: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' },
  lessonTitle: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  lessonSubtitle: { color: THEME.indigo, fontSize: 12, fontWeight: '600' },
  playButton: { opacity: 0.8 },

  // Error
  errorTitle: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  errorText: { color: THEME.textSecondary, marginBottom: 24 },
  primaryBtn: { backgroundColor: THEME.indigo, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: 'white', fontWeight: '700' },
});