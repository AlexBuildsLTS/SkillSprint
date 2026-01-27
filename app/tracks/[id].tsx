import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  PlayCircle,
  Trophy,
  Zap,
  AlertTriangle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/services/types'; // FIXED: Resolvable export
import * as Haptics from 'expo-haptics';

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  surface: '#0f172a',
  text: '#f8fafc',
  dim: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.08)',
  danger: '#ef4444',
};

export default function TrackDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const trackId = Array.isArray(id) ? id[0] : id;

  /**
   * 📡 REAL-TIME REGISTRY FETCH
   * Pulls the track node and joins all child lessons from the database.
   */
  const {
    data: track,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['track', trackId],
    queryFn: async () => {
      if (!trackId) return null;
      const { data, error } = await supabase
        .from('tracks')
        .select('*, lessons(*)')
        .eq('id', trackId)
        .single();

      if (error) throw error;

      // Ensure lessons are sorted by the database 'order' column
      if (data.lessons) {
        (data.lessons as any[]).sort((a, b) => a.order - b.order);
      }

      return data as Tables<'tracks'> & { lessons: Tables<'lessons'>[] };
    },
    enabled: !!trackId,
  });

  if (isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.indigo} size="large" />
      </View>
    );

  if (error || !track) {
    return (
      <View style={styles.center}>
        <AlertTriangle color={THEME.danger} size={48} />
        <Text style={styles.errorText}>TRACK_METADATA_SYNC_FAILED</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={{ color: 'white', fontWeight: '900' }}>
            RETURN TO HUD
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MISSION_ROADMAP</Text>
        </View>

        <FlatList
          data={track.lessons}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => (
            <View style={styles.hero}>
              <View style={styles.trophyCircle}>
                <Trophy size={40} color={THEME.indigo} />
              </View>
              <Text style={styles.title}>{track.title}</Text>
              <Text style={styles.desc}>{track.description}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/lesson/${item.id}`);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.xpBadge}>
                  <Zap size={10} color="#fbbf24" fill="#fbbf24" />
                  <Text style={styles.xpText}>{item.xp_reward} XP</Text>
                </View>
              </View>
              <PlayCircle
                size={28}
                color={THEME.indigo}
                fill="rgba(99, 102, 241, 0.1)"
              />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitle: {
    color: THEME.dim,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  hero: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  trophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.indigo,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    marginTop: 24,
    textAlign: 'center',
    letterSpacing: -1,
  },
  desc: {
    fontSize: 15,
    color: THEME.dim,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    padding: 22,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpText: { color: '#fbbf24', fontSize: 12, fontWeight: '900' },
  errorText: { color: 'white', marginTop: 15, fontWeight: 'bold' },
  retryBtn: {
    marginTop: 25,
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: THEME.indigo,
    borderRadius: 15,
  },
});
