import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  CheckCircle2,
  Trophy,
  Flame,
  AlertTriangle,
  Zap,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  SlideInRight,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { api } from '@/services/api';
import { SprintCard, SprintResult } from '@/services/types';
import Button from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Bento3DCard } from '@/components/ui/Bento3DCard';
import { CodeEmulator } from '@/components/lesson/CodeEmulator';

const THEME = {
  indigo: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  emerald: '#10b981',
  obsidian: '#020617',
  slate: '#94a3b8',
  white: '#ffffff',
  glassSurface: 'rgba(30, 41, 59, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

/**
 * 📊 COMPONENT: SPRINT PROGRESS BAR
 */
const SprintProgressBar = memo(function SprintProgressBar({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={`bar-${index}`}
          style={[
            styles.progressSegment,
            index < current && styles.progressSegmentCompleted,
            index === current && styles.progressSegmentActive,
          ]}
        />
      ))}
    </View>
  );
});

/**
 * 🃏 COMPONENT: 3D CARD CONTAINER
 */
const SprintCard3D = memo(function SprintCard3D({
  isActive,
  children,
}: {
  isActive: boolean;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1);
      opacity.value = withTiming(1);
    }
  }, [isActive, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ perspective: 1000 }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      {children}
    </Animated.View>
  );
});

/**
 * 🚀 MAIN SPRINT SCREEN
 */
export default function SprintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const topic = Array.isArray(params.topic)
    ? params.topic[0]
    : params.topic || 'General';
  const difficulty = Array.isArray(params.difficulty)
    ? params.difficulty[0]
    : params.difficulty || 'INTERMEDIATE';

  const [status, setStatus] = useState<'initializing' | 'active' | 'summary'>(
    'initializing',
  );
  const [cards, setCards] = useState<SprintCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [result, setResult] = useState<SprintResult | null>(null);
  const comboScale = useSharedValue(1);

  // 1. INIT
  useEffect(() => {
    const initSprint = async () => {
      try {
        const responseData = (await api.generateDailySprint(topic)) as any;

        let finalTasks: SprintCard[] = [];
        if (Array.isArray(responseData)) {
          finalTasks = responseData;
        } else if (
          responseData &&
          responseData.content &&
          Array.isArray(responseData.content)
        ) {
          finalTasks = responseData.content;
        } else if (
          responseData &&
          responseData.tasks &&
          Array.isArray(responseData.tasks)
        ) {
          finalTasks = responseData.tasks;
        } else {
          finalTasks = Object.values(responseData).filter(
            (x) => typeof x === 'object',
          ) as SprintCard[];
        }

        if (finalTasks.length > 0) {
          setCards(finalTasks);
          setStatus('active');
        } else {
          throw new Error('No content generated');
        }
      } catch (err) {
        console.error('Sprint Init Failed:', err);
        Alert.alert('Connection Failed', 'Using offline mode.', [
          { text: 'OK' },
        ]);
        setCards([
          {
            title: 'System Offline',
            content: 'Network unreachable. Verify connection.',
            type: 'code',
            codeSnippet: "print('Offline Mode')",
            options: ['Retry'],
            correctAnswer: 0,
          },
        ]);
        setStatus('active');
      }
    };
    initSprint();
  }, [topic, difficulty]);

  // 2. HANDLERS
  const handleAnswer = useCallback(
    (index: number) => {
      if (isAnswered) return;
      setSelectedOption(index);
      setIsAnswered(true);
      const correctIdx = cards[currentIndex].correctAnswer ?? 0;
      if (index === correctIdx) {
        setScore((s) => s + 1);
        setCombo((prev) => prev + 1);
        comboScale.value = withSequence(withSpring(1.5), withSpring(1));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setCombo(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [isAnswered, cards, currentIndex, comboScale],
  );

  const handleCodeSuccess = useCallback(() => {
    if (isAnswered) return;
    setIsAnswered(true);
    setScore((s) => s + 1);
    setCombo((prev) => prev + 1);
    comboScale.value = withSequence(withSpring(1.5), withSpring(1));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [isAnswered, comboScale]);

  const handleNext = useCallback(async () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setStatus('initializing');
      try {
        const xpEarned = score * 100;
        const res = await api.completeSprint(xpEarned, score);
        setResult(res);
        setStatus('summary');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        setResult({
          xpEarned: score * 100,
          questionsCorrect: score,
          totalQuestions: cards.length,
          newStreak: 1,
        });
        setStatus('summary');
      }
    }
  }, [currentIndex, cards, score]);

  // --- RENDER ---
  if (status === 'initializing') {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={THEME.indigo} />
        <Text style={styles.loaderText}>
          INITIALIZING {topic.toUpperCase()}...
        </Text>
      </View>
    );
  }

  if (status === 'summary' && result) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[THEME.obsidian, '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.summaryContainer}>
          <Animated.View
            entering={FadeIn.delay(300)}
            style={{ alignItems: 'center', gap: 20, width: '100%' }}
          >
            <Trophy size={80} color={THEME.warning} />
            <Text style={styles.summaryTitle}>SPRINT COMPLETE</Text>
            <GlassCard style={styles.statBox} intensity="heavy">
              <Text style={styles.statLabel}>XP EARNED</Text>
              <Text style={styles.statValue}>+{result.xpEarned}</Text>
            </GlassCard>
            <View style={{ width: '100%', marginTop: 20 }}>
              <Button onPress={() => router.replace('/')} fullWidth size="lg">
                RETURN TO DASHBOARD
              </Button>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  const currentCard = cards[currentIndex];
  if (!currentCard) return null;

  const isCodingTask =
    currentCard.type === 'code' ||
    (currentCard.codeSnippet && currentCard.codeSnippet.length > 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HUD */}
        <View style={styles.hudHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <X size={20} color={THEME.slate} />
          </TouchableOpacity>
          <SprintProgressBar total={cards.length} current={currentIndex} />
          <Animated.View
            style={{
              transform: [{ scale: comboScale }],
              flexDirection: 'row',
              gap: 4,
              alignItems: 'center',
            }}
          >
            <Flame size={16} color={THEME.warning} fill={THEME.warning} />
            <Text style={{ color: THEME.warning, fontWeight: '900' }}>
              {combo}x
            </Text>
          </Animated.View>
        </View>

        {/* SCROLL CONTENT */}
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={SlideInRight}
            key={currentIndex}
            style={styles.cardStack}
          >
            {/* 1. TASK CARD - CORRECT PATTERN: Bento3DCard > View (Glass Effect) */}
            <Bento3DCard style={{ marginBottom: 24, width: '100%' }}>
              <View
                style={[
                  styles.cardContent,
                  styles.glassEffect,
                  { borderColor: THEME.emerald + '40', minHeight: 120 },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Zap size={18} color={THEME.emerald} fill={THEME.emerald} />
                    <Text style={[styles.cardLabel, { color: THEME.emerald }]}>
                      CURRENT TASK
                    </Text>
                  </View>
                </View>

                <View>
                  <Text style={styles.questionText}>{currentCard.title}</Text>
                  <Text style={styles.contentText}>{currentCard.content}</Text>
                </View>
              </View>
            </Bento3DCard>

            {/* 2. INTERACTION AREA */}
            <GlassCard intensity="heavy" style={styles.interactionCard}>
              {isCodingTask ? (
                // Code Emulator Container
                <View
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <CodeEmulator
                    language={topic.toLowerCase()}
                    code={currentCard.codeSnippet || ''}
                    onComplete={handleCodeSuccess}
                  />
                </View>
              ) : (
                // Quiz Options
                <View style={styles.optionsGrid}>
                  {currentCard.options?.map((opt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleAnswer(idx)}
                      disabled={isAnswered}
                      style={[
                        styles.optionBase,
                        !isAnswered && selectedOption === idx
                          ? styles.optionSelected
                          : isAnswered && idx === currentCard.correctAnswer
                            ? styles.optionCorrect
                            : isAnswered && selectedOption === idx
                              ? styles.optionWrong
                              : styles.optionNormal,
                      ]}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: 16,
                        }}
                      >
                        {opt}
                      </Text>
                      {isAnswered && idx === currentCard.correctAnswer && (
                        <CheckCircle2 size={20} color={THEME.success} />
                      )}
                      {isAnswered &&
                        selectedOption === idx &&
                        idx !== currentCard.correctAnswer && (
                          <AlertTriangle size={20} color={THEME.danger} />
                        )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </GlassCard>
          </Animated.View>
        </ScrollView>

        {/* FOOTER */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          {isAnswered && (
            <Button fullWidth size="lg" onPress={handleNext}>
              {currentIndex < cards.length - 1 ? 'CONTINUE' : 'COMPLETE SPRINT'}
            </Button>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.obsidian },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.obsidian,
  },
  loaderText: {
    color: THEME.indigo,
    marginTop: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },

  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },

  progressContainer: { flex: 1, flexDirection: 'row', height: 6, gap: 4 },
  progressSegment: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
  },
  progressSegmentCompleted: { backgroundColor: THEME.success },
  progressSegmentActive: { backgroundColor: THEME.indigo },

  cardStack: { flex: 1 },
  cardWrapper: { flex: 1 },

  // --- GLASS CARD PATTERN FROM INDEX.TSX ---
  glassEffect: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
  },
  cardContent: {
    padding: 20,
    borderRadius: 24,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: THEME.slate,
  },
  // ----------------------------------------

  questionText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  contentText: { color: THEME.slate, fontSize: 16, lineHeight: 26 },

  interactionCard: { padding: 20, borderRadius: 24 },

  optionsGrid: { gap: 12 },
  optionBase: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionNormal: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: THEME.border,
  },
  optionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: THEME.indigo,
  },
  optionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: THEME.success,
  },
  optionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: THEME.danger,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  summaryTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statBox: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 24,
    width: '100%',
    backgroundColor: THEME.glassSurface,
  },
  statLabel: {
    color: THEME.slate,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  statValue: { color: 'white', fontSize: 48, fontWeight: '900' },
});
