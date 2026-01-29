import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Vibration,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, CheckCircle2, Trophy, Flame } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  SlideInRight,
} from 'react-native-reanimated';

import { api } from '@/services/api';
import { SprintCard, SprintResult } from '@/services/types';
import Button from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { CodeEmulator } from '@/components/lesson/CodeEmulator';

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

  // Normalize topic param to string
  const topic = Array.isArray(params.topic)
    ? params.topic[0]
    : params.topic || 'General';

  // --- STATE MANAGEMENT ---
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

  // --- INITIALIZATION: FETCH AI TASKS ---
  useEffect(() => {
    const initSprint = async () => {
      try {
        const data = await api.generateDailySprint(topic);
        if (data && data.length > 0) {
          setCards(data);
          setStatus('active');
        } else {
          throw new Error('No cards generated');
        }
      } catch (err) {
        console.error('Sprint Init Failed:', err);
        // Fallback for offline/error state to prevent stuck UI
        Alert.alert('Neural Link Failure', 'Using offline backup.', [
          { text: 'OK', onPress: () => {} },
        ]);
        setCards([
          {
            title: 'System Offline',
            content: 'Neural Net unreachable. Verify integrity.',
            type: 'code',
            codeSnippet: "print('Offline')",
            options: ['Retry'],
            correctAnswer: 0,
          },
        ]);
        setStatus('active');
      }
    };
    initSprint();
  }, [topic]);

  // --- HANDLER: QUIZ ANSWER SELECTION ---
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
        Vibration.vibrate(100);
      }
    },
    [isAnswered, cards, currentIndex, comboScale],
  );

  // --- HANDLER: CODE EMULATOR SUCCESS ---
  const handleCodeSuccess = useCallback(() => {
    if (isAnswered) return;
    setIsAnswered(true);
    setScore((s) => s + 1);
    setCombo((prev) => prev + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [isAnswered]);

  // --- HANDLER: NEXT CARD / FINISH SPRINT ---
  const handleNext = useCallback(async () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // SPRINT COMPLETE
      setStatus('initializing'); // Show loading while submitting
      try {
        // Calculate XP: 100 per correct answer (max 500)
        const xpEarned = score * 100;
        const res = await api.completeSprint(xpEarned, score);
        setResult(res);
        setStatus('summary');
      } catch (err) {
        console.error('Submission Error:', err);
        // Optimistic fallback so user isn't stuck
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

  // --- RENDER: LOADING STATE ---
  if (status === 'initializing') {
    return (
      <View style={styles.center}>
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
      <SafeAreaView style={styles.summaryContainer}>
        <Trophy size={80} color={THEME.warning} />
        <Text style={styles.summaryTitle}>SPRINT COMPLETE</Text>
        <GlassCard style={styles.statBox}>
          <Text style={styles.statLabel}>XP EARNED</Text>
          <Text style={styles.statValue}>+{result.xpEarned}</Text>
        </GlassCard>
        <Button onPress={() => router.replace('/')} fullWidth>
          RETURN TO DASHBOARD
        </Button>
      </SafeAreaView>
    );
  }

  // --- RENDER: ACTIVE SPRINT ---
  const currentCard = cards[currentIndex];
  // Determine if this is a coding task based on type or snippet presence
  const isCodingTask =
    currentCard.type === 'code' ||
    (currentCard.codeSnippet && currentCard.codeSnippet.length > 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HUD HEADER */}
      <View style={styles.hudHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={20} color={THEME.slate} />
        </TouchableOpacity>
        <SprintProgressBar total={cards.length} current={currentIndex} />
        <Animated.View
          style={{
            transform: [{ scale: comboScale }],
            flexDirection: 'row',
            gap: 4,
          }}
        >
          <Flame size={16} color={THEME.warning} />
          <Text style={{ color: THEME.warning, fontWeight: '900' }}>
            {combo}x
          </Text>
        </Animated.View>
      </View>

      {/* QUESTION CARD */}
      <Animated.View
        entering={SlideInRight}
        key={currentIndex}
        style={styles.cardStack}
      >
        <SprintCard3D isActive={true}>
          <GlassCard intensity="heavy" style={styles.cardInner}>
            <Text style={styles.questionText}>{currentCard.title}</Text>
            <Text style={styles.contentText}>{currentCard.content}</Text>

            {isCodingTask ? (
              // CODE EMULATOR MODE
              <View style={{ flex: 1, marginTop: 10 }}>
                <CodeEmulator
                  language={topic.toLowerCase()}
                  code={currentCard.codeSnippet || ''}
                  // Simple check for demo purposes; real logic would be stricter
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
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>
                      {opt}
                    </Text>
                    {isAnswered && idx === currentCard.correctAnswer && (
                      <CheckCircle2 size={18} color={THEME.success} />
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
            CONTINUE
          </Button>
        )}
      </View>
    </SafeAreaView>
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
  loaderText: { color: THEME.indigo, marginTop: 20, fontWeight: '900' },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 15,
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
  cardInner: { flex: 1, padding: 24, borderRadius: 32 },
  questionText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  contentText: { color: THEME.slate, fontSize: 16, marginBottom: 30 },
  optionsGrid: { gap: 12 },
  optionBase: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionNormal: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  optionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: THEME.indigo,
  },
  optionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: THEME.success,
  },
  optionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: THEME.danger,
  },
  summaryContainer: {
    flex: 1,
    backgroundColor: THEME.obsidian,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 20,
  },
  summaryTitle: { color: 'white', fontSize: 32, fontWeight: '900' },
  statBox: {
    padding: 30,
    alignItems: 'center',
    borderRadius: 24,
    width: '100%',
    marginBottom: 30,
  },
  statLabel: {
    color: THEME.slate,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statValue: { color: 'white', fontSize: 48, fontWeight: '900', marginTop: 10 },
});
