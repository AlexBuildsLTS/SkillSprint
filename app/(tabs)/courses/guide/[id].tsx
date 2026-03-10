import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Clock, BookOpen } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  FadeInDown,
} from 'react-native-reanimated';

// Import our Zero-Dependency Parser
import { CustomMarkdown } from '@/components/ui/CustomMarkdown';

// --- THEME ---
const THEME = {
  obsidian: '#020617',
  deepSlate: '#0f172a',
  indigo: '#6366f1',
  slate: '#94a3b8',
  white: '#ffffff',
  text: '#cbd5e1',
};

export default function GuideReaderScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Reanimated Shared Value for Scroll Tracking
  const scrollY = useSharedValue(0);

  const { data, isLoading } = useQuery({
    queryKey: ['guide-content', id],
    queryFn: async () => {
      const guideId = Array.isArray(id) ? id[0] : id;

      const guideRes = await supabase
        .from('study_guides')
        .select('*')
        .eq('id', guideId)
        .single();

      if (guideRes.error) throw guideRes.error;

      const chapterRes = await supabase
        .from('study_chapters')
        .select('*')
        .eq('guide_id', guideId)
        .order('sort_order', { ascending: true });

      if (chapterRes.error) throw chapterRes.error;

      // Calculate total read time
      const totalTime = chapterRes.data.reduce(
        (acc, curr) => acc + (curr.read_time_min || 0),
        0,
      );

      return {
        guide: guideRes.data,
        chapters: chapterRes.data,
        totalTime,
      };
    },
  });

  // --- ANIMATED STYLES ---

  // High-performance scroll tracking on the UI thread
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animates the header background from transparent to solid obsidian on scroll
  const animatedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 50],
      [0, 0.95],
      Extrapolation.CLAMP,
    );
    const borderOpacity = interpolate(
      scrollY.value,
      [0, 50],
      [0, 0.2],
      Extrapolation.CLAMP,
    );

    return {
      backgroundColor: `rgba(2, 6, 23, ${opacity})`,
      borderBottomColor: `rgba(99, 102, 241, ${borderOpacity})`,
    };
  });

  // Fades out the hero section as the user scrolls down
  const animatedHeroStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, 20],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.indigo} />
      </View>
    );
  }

  // Calculate dynamic padding for web to ensure it reads like a blog
  const isDesktop = width > 800;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.obsidian, THEME.deepSlate]}
        style={StyleSheet.absoluteFill}
      />

      {/* FIXED ANIMATED HEADER */}
      <Animated.View style={[styles.headerContainer, animatedHeaderStyle]}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ChevronLeft size={24} color={THEME.white} />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {data?.guide?.title?.toUpperCase()}
            </Text>

            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* CONTENT SCROLL */}
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          // Responsive max-width for Desktop/Web reading
          isDesktop && {
            alignSelf: 'center',
            width: 800,
            paddingHorizontal: 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <SafeAreaView edges={['top']} />

        {/* HERO SECTION */}
        <Animated.View style={[styles.heroSection, animatedHeroStyle]}>
          <View style={styles.heroBadge}>
            <BookOpen size={16} color={THEME.indigo} />
            <Text style={styles.heroBadgeText}>
              {data?.guide?.language} Masterclass
            </Text>
          </View>

          <Text style={styles.heroTitle}>{data?.guide?.title}</Text>
          <Text style={styles.heroDesc}>{data?.guide?.description}</Text>

          <View style={styles.heroMetaRow}>
            <Clock size={14} color={THEME.slate} />
            <Text style={styles.heroMetaText}>
              Total Read Time: {data?.totalTime} mins
            </Text>
            <Text style={styles.heroMetaDot}>•</Text>
            <Text style={styles.heroMetaText}>
              {data?.chapters?.length} Chapters
            </Text>
          </View>
        </Animated.View>

        {/* CHAPTERS RENDERER */}
        {data?.chapters.map((chapter, index) => (
          <Animated.View
            key={chapter.id}
            style={styles.chapterBlock}
            entering={FadeInDown.delay(300 + index * 150)
              .springify()
              .damping(14)}
          >
            {/* Redesigned Metadata Header */}
            <View style={styles.chapterMetaContainer}>
              <View style={styles.chapterIndexBox}>
                <Text style={styles.chapterIndex}>CHAPTER {index + 1}</Text>
              </View>
              <View style={styles.timeBadge}>
                <Clock size={12} color={THEME.slate} />
                <Text style={styles.timeText}>
                  {chapter.read_time_min} min read
                </Text>
              </View>
            </View>

            <Text style={styles.chapterTitle}>{chapter.title}</Text>

            {/* Our Secure Custom Parser */}
            <CustomMarkdown content={chapter.content} />

            {/* Subtle Divider */}
            {index !== data.chapters.length - 1 && (
              <View style={styles.divider} />
            )}
          </Animated.View>
        ))}

        {/* Bottom Padding */}
        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </View>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.obsidian,
  },

  // --- Header Styles ---
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent', // Overridden by Reanimated
  },
  safeHeader: {
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: THEME.white,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 2,
    opacity: 0.9,
  },

  // --- Content Styles ---
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 100,
    paddingBottom: 40,
  },

  // --- Hero Section ---
  heroSection: {
    marginBottom: 48,
    marginTop: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    gap: 8,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: THEME.indigo,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: THEME.white,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroDesc: {
    color: THEME.text,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMetaText: {
    color: THEME.slate,
    fontSize: 13,
    fontWeight: '600',
  },
  heroMetaDot: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 14,
  },

  // --- Chapter Block ---
  chapterBlock: {
    marginBottom: 20,
  },
  chapterMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  chapterIndexBox: {
    backgroundColor: THEME.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chapterIndex: {
    color: THEME.obsidian,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timeText: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: '600',
  },
  chapterTitle: {
    color: THEME.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -0.5,
  },

  // --- Divider ---
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 48,
    marginBottom: 24,
    borderRadius: 1,
  },
});
