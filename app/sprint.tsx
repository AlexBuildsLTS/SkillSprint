import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  StatusBar,
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

import { api } from '@/services/api';
import { SprintCard, SprintResult } from '@/services/types';
import Button from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { CodeEmulator } from '@/components/lesson/CodeEmulator';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * 🎨 THEME CONFIGURATION
 */
const THEME = {
  indigo: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  obsidian: '#020617',
  slate: '#94a3b8',
  white: '#ffffff',
  glassSurface: 'rgba(30, 41, 59, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

/**
 * 📊 COMPONENT: SPRINT PROGRESS BAR
 * Visualizes the user's progress through the 5 daily tasks.
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
 * Adds depth and entry animations to the task card.
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
 * 🚀 MAIN COMPONENT: SPRINT SCREEN
 * Orchestrates the daily learning session: AI fetch -> User interaction -> Result submission.
 */
export default function SprintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // Extract Params from Setup
  const topic = Array.isArray(params.topic)
    ? params.topic[0]
    : params.topic || 'General';
  const difficulty = Array.isArray(params.difficulty)
    ? params.difficulty[0]
    : params.difficulty || 'INTERMEDIATE';

  // State Management
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

  // 1. INIT: Call Gemini Edge Function
  useEffect(() => {
    const initSprint = async () => {
      try {
        // Pass language/topic to generate-sprint edge function
        const data = await api.generateDailySprint(topic);

        if (data && data.length > 0) {
          setCards(data);
          setStatus('active');
        } else {
          throw new Error('No content generated');
        }
      } catch (err) {
        console.error('Sprint Init Failed:', err);
        Alert.alert('Connection Failed', 'Switching to offline backup mode.', [
          { text: 'OK' },
        ]);
        // Fallback content to ensure app doesn't crash
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

  // 2. HANDLER: Quiz Answer
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

  // 3. HANDLER: Code Emulator Success
  const handleCodeSuccess = useCallback(() => {
    if (isAnswered) return;
    setIsAnswered(true);
    setScore((s) => s + 1);
    setCombo((prev) => prev + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [isAnswered]);

  // 4. HANDLER: Next / Complete
  const handleNext = useCallback(async () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // SPRINT COMPLETE
      setStatus('initializing'); // Show loading state during submission
      try {
        const xpEarned = score * 100; // Example XP Calc: 100 per correct
        const res = await api.completeSprint(xpEarned, score);
        setResult(res);
        setStatus('summary');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        console.error('Submit Error:', err);
        // Fallback result if API fails
        setResult({
          xpEarned: score * 100,
          questionsCorrect: score,
          totalQuestions: cards.length,
          newStreak: 1, // Optimistic streak update
        });
        setStatus('summary');
      }
    }
  }, [currentIndex, cards, score]);

  // --- RENDER: LOADING STATE ---
  if (status === 'initializing') {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={THEME.indigo} />
        <Text style={styles.loaderText}>
          INITIALIZING {topic.toUpperCase()} PROTOCOLS...
        </Text>
      </View>
    );
  }

  // --- RENDER: SUMMARY STATE ---
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

            <GlassCard style={styles.statBox} intensity="heavy">
              <Text style={styles.statLabel}>ACCURACY</Text>
              <Text style={styles.statValue}>
                {Math.round(
                  (result.questionsCorrect / result.totalQuestions) * 100,
                )}
                %
              </Text>
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

  // --- RENDER: ACTIVE SPRINT ---
  const currentCard = cards[currentIndex];
  // Determine if this is a coding task based on type
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
        {/* HUD HEADER */}
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

        {/* QUESTION CARD */}
        <Animated.View
          entering={SlideInRight}
          key={currentIndex} // Force re-render animation on index change
          style={styles.cardStack}
        >
          <SprintCard3D isActive={true}>
            <GlassCard intensity="heavy" style={styles.cardInner}>
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.questionText}>{currentCard.title}</Text>
                <Text style={styles.contentText}>{currentCard.content}</Text>
              </View>

              {isCodingTask ? (
                // CODE EMULATOR MODE
                <View
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <CodeEmulator
                    language={topic.toLowerCase()}
                    code={currentCard.codeSnippet || ''}
                    // Passing undefined triggers the "Run" success simulation for now
                    // In a real scenario, you'd pass expected output here.
                    expectedOutput={undefined}
                    onComplete={handleCodeSuccess}
                  />
                </View>
              ) : (
                // QUIZ MODE
                <View style={styles.optionsGrid}>
                  {currentCard.options?.map((opt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleAnswer(idx)}
                      disabled={isAnswered}
                      activeOpacity={0.8}
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
          </SprintCard3D>
        </Animated.View>

        {/* FOOTER ACTION BUTTON */}
        <View style={{ padding: 20, paddingBottom: insets.bottom + 10 }}>
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

// --- STYLES ---
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

  cardStack: { flex: 1, padding: 20 },
  cardWrapper: { flex: 1 },
  cardInner: {
    flex: 1,
    padding: 24,
    borderRadius: 24,
    justifyContent: 'space-between',
  },

  questionText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  contentText: { color: THEME.slate, fontSize: 16, lineHeight: 24 },

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
