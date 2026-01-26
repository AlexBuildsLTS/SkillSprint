import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  PlayCircle,
  Trophy,
  Clock,
  BarChart3,
  Code2,
  Gamepad2,
  Globe,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

const THEME = {
  obsidian: '#020617',
  charcoal: '#0f172a',
  surface: '#1e293b',
  indigo: '#6366f1',
  indigoDark: '#4338ca',
  accent: '#8b5cf6',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  success: '#10b981',
  border: 'rgba(255,255,255,0.08)',
};

export default function TrackDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const trackId = Array.isArray(id) ? id[0] : id;
  const scrollY = useSharedValue(0);

  // OPTIMIZED QUERY: Fixes "Signal Aborted" and Reflows
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

      if (data.lessons) {
        data.lessons.sort((a: any, b: any) => a.order - b.order);
      }
      return data;
    },
    enabled: !!trackId,
    staleTime: 1000 * 60 * 5, // 5 Minutes Cache (CRITICAL FOR PERFORMANCE)
    retry: 2, // Retry only twice to prevent loop
  });

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            scrollY.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [2, 1, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const getLessonIcon = (index: number) => {
    if (index % 3 === 0) return <Code2 size={20} color={THEME.indigo} />;
    if (index % 3 === 1) return <Globe size={20} color={THEME.accent} />;
    return <Gamepad2 size={20} color={THEME.success} />;
  };

  const handleLessonPress = useCallback(
    (lessonId: string) => {
      Haptics.selectionAsync();
      router.push(`/lesson/${lessonId}`);
    },
    [router],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View
          style={{ height: HEADER_HEIGHT, backgroundColor: THEME.charcoal }}
        />
        <View style={{ padding: 24, gap: 16 }}>
          <View style={[styles.skeleton, { height: 40, width: '60%' }]} />
          <View style={[styles.skeleton, { height: 200 }]} />
        </View>
      </View>
    );
  }

  if (error || !track) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Trophy
            size={64}
            color={THEME.textSecondary}
            style={{ opacity: 0.2, marginBottom: 20 }}
          />
          <Text style={styles.errorText}>Track not found</Text>
          <TouchableOpacity onPress={router.back} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Return to Base</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalXp =
    track.lessons?.reduce(
      (sum: number, l: any) => sum + (l.xp_reward || 0),
      0,
    ) || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.headerBackground, headerStyle]}>
        <LinearGradient
          colors={[THEME.indigoDark, THEME.obsidian]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View
          style={[
            styles.circle,
            {
              top: -50,
              left: -50,
              width: 300,
              height: 300,
              backgroundColor: THEME.indigo,
              opacity: 0.15,
            },
          ]}
        />
        <View
          style={[
            styles.circle,
            {
              bottom: 50,
              right: -100,
              width: 400,
              height: 400,
              backgroundColor: THEME.accent,
              opacity: 0.1,
            },
          ]}
        />
      </Animated.View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View style={styles.heroCard}>
              <View style={styles.heroContent}>
                <View style={styles.iconCircle}>
                  <Trophy size={36} color={THEME.indigo} />
                </View>
                <Text style={styles.trackTitle}>{track.title}</Text>
                <Text style={styles.trackDesc}>{track.description}</Text>

                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <BarChart3 size={16} color={THEME.textSecondary} />
                    <Text style={styles.statLabel}>{track.difficulty}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Trophy size={16} color={THEME.textSecondary} />
                    <Text style={styles.statLabel}>{totalXp} XP</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Clock size={16} color={THEME.textSecondary} />
                    <Text style={styles.statLabel}>
                      {track.lessons?.length} Levels
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          <Text style={styles.sectionTitle}>Mission Roadmap</Text>

          {track.lessons?.map((lesson: any, index: number) => (
            <Animated.View
              key={lesson.id}
              entering={FadeInDown.delay(200 + index * 30).duration(300)} // Lower delay for speed
              style={{ marginBottom: 12 }}
            >
              <TouchableOpacity
                style={styles.lessonCard}
                activeOpacity={0.7}
                onPress={() => handleLessonPress(lesson.id)}
              >
                <View style={styles.lessonLeft}>
                  <View style={styles.iconBox}>{getLessonIcon(index)}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lessonTitle} numberOfLines={1}>
                      {lesson.title}
                    </Text>
                    <View style={styles.lessonMeta}>
                      <Text style={styles.lessonXp}>
                        +{lesson.xp_reward} XP
                      </Text>
                      {index % 2 === 0 && (
                        <Text style={styles.tag}>INTERACTIVE</Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.playBtn}>
                  <PlayCircle
                    size={24}
                    color={THEME.textPrimary}
                    fill={THEME.indigo}
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.obsidian },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  circle: { position: 'absolute', borderRadius: 999 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 50,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 },
  heroCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 32,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  heroContent: { alignItems: 'center' },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.indigo,
  },
  trackTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackDesc: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    padding: 6,
    width: '100%',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  statLabel: { color: 'white', fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
    marginLeft: 4,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.charcoal,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  lessonLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  lessonTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lessonXp: { color: THEME.indigo, fontSize: 12, fontWeight: '700' },
  tag: {
    color: THEME.success,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  playBtn: { opacity: 0.9 },
  skeleton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
    borderRadius: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: THEME.indigo,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
