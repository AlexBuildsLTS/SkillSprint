/**
 * ============================================================================
 * 🚀 SCREEN: SPRINT EXECUTION - V9.2 (ANTI-TRAP SECURE BUILD)
 * ============================================================================
 * Architecture:
 * - Anti-Trap UX: Close button explicitly rendered during the 'initializing' phase.
 * - Network Fail-Safe: 15-second abort controller prevents infinite loading screens.
 * - Strict Routing: Replaced router.back() with router.replace('/') on complete to prevent stack memory leaks.
 * ============================================================================
 */

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
  useWindowDimensions,
  Platform,
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

export default function SprintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const terminalHeight = Math.max(450, screenHeight * 0.6);

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

  useEffect(() => {
    let isMounted = true;

    const initSprint = async () => {
      try {
        // 🛡️ Fail-Safe: Enforce a strict 15-second timeout on the API call
        const fetchPromise = api.generateDailySprint(topic);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), 15000),
        );

        const responseData = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as any;

        if (!isMounted) return;

        let finalTasks: SprintCard[] = [];
        if (Array.isArray(responseData)) {
          finalTasks = responseData;
        } else if (
          responseData?.content &&
          Array.isArray(responseData.content)
        ) {
          finalTasks = responseData.content;
        } else if (responseData?.tasks && Array.isArray(responseData.tasks)) {
          finalTasks = responseData.tasks;
        } else if (responseData) {
          finalTasks = Object.values(responseData).filter(
            (x) => typeof x === 'object',
          ) as SprintCard[];
        }

        if (finalTasks.length > 0) {
          setCards(finalTasks);
          setStatus('active');
        } else {
          throw new Error(
            'No valid content payload returned from Edge Function.',
          );
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Sprint Init Failed:', err.message);

        // Show the actual error message to the user before falling back
        Alert.alert(
          'Initialization Failed',
          err.message || 'Falling back to offline mode.',
          [{ text: 'OK' }],
        );

        setCards([
          {
            title: 'Offline Sandbox',
            content:
              'Network unreachable. Use this terminal to test your syntax.',
            type: 'code',
            codeSnippet: '// Enter code here',
            options: [],
            correctAnswer: 0,
            answer: '', // Added the missing 'answer' property
          },
        ]);
        setStatus('active');
      }
    };
    initSprint();

    return () => {
      isMounted = false;
    };
  }, [topic, difficulty]);

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

  // 🛡️ ANTI-TRAP LOADING STATE: Explicitly renders the back button.
  if (status === 'initializing') {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.absoluteHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <X size={24} color={THEME.slate} />
          </TouchableOpacity>
        </SafeAreaView>
        <ActivityIndicator
          size="large"
          color={THEME.indigo}
          style={{ transform: [{ scale: 1.5 }], marginBottom: 20 }}
        />
        <Text style={styles.loaderText}>INITIALIZING SPRINT...</Text>
        <Text style={{ color: THEME.slate, marginTop: 10, fontSize: 12 }}>
          Establishing secure connection
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
    (currentCard.codeSnippet &&
      currentCard.codeSnippet.length > 0 &&
      (!currentCard.options || currentCard.options.length === 0));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.hudHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <X size={20} color={THEME.white} />
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

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={SlideInRight}
            key={currentIndex}
            style={styles.cardStack}
          >
            <View style={[styles.cardContent, styles.glassEffect]}>
              <View style={styles.cardHeader}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Zap size={18} color={THEME.emerald} fill={THEME.emerald} />
                  <Text style={[styles.cardLabel, { color: THEME.emerald }]}>
                    CURRENT TASK
                  </Text>
                </View>
              </View>
              <Text style={styles.questionText}>{currentCard.title}</Text>
              <Text style={styles.contentText}>{currentCard.content}</Text>
            </View>

            <View style={{ marginTop: 20 }}>
              {isCodingTask ? (
                <View
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    height: terminalHeight,
                    width: '100%',
                    backgroundColor: '#0f172a',
                  }}
                >
                  <CodeEmulator
                    language={topic.toLowerCase()}
                    code={currentCard.codeSnippet || ''}
                    expectedOutput={currentCard.answer}
                    hint={currentCard.explanation}
                    onComplete={handleCodeSuccess}
                  />
                </View>
              ) : (
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
                          flexShrink: 1,
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

                  {isAnswered && currentCard.explanation && (
                    <Animated.View
                      entering={FadeIn}
                      style={styles.explanationBox}
                    >
                      <Text style={styles.explanationText}>
                        {currentCard.explanation}
                      </Text>
                    </Animated.View>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>

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
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    padding: 20,
    zIndex: 50,
  },
  loaderText: {
    color: THEME.white,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 16,
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
    borderWidth: 1,
    borderColor: THEME.border,
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
  glassEffect: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(148, 163, 184, 0.15)',
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
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  questionText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  contentText: { color: THEME.slate, fontSize: 16, lineHeight: 26 },
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
  explanationBox: {
    marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.indigo,
  },
  explanationText: { color: THEME.white, fontSize: 14, lineHeight: 22 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: THEME.obsidian,
    borderTopWidth: 1,
    borderColor: THEME.border,
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
