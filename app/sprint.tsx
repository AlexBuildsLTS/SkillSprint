/**
 * ============================================================================
 * ⚡ SCREEN: DAILY SPRINT ENGINE (CORE GAME LOOP)
 * ============================================================================
 * PATH: app/sprint.tsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Trophy,
  Brain,
  Code,
  Flame,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';

// INTERNAL SERVICES
import { api } from '@/services/api';
import { SprintCard, SprintResult, SprintCardType } from '@/services/types';
import Button from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

const THEME = {
  indigo: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  obsidian: '#020617',
  slate: '#94a3b8',
  white: '#ffffff',
};

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 1,
};

interface SprintState {
  status: 'initializing' | 'active' | 'paused' | 'calculating' | 'summary';
  startTime: number;
  questionStartTime: number;
  timeSpent: number;
}

interface ComboMetrics {
  current: number;
  max: number;
  multiplier: number;
}

const SprintProgressBar = ({
  total,
  current,
}: {
  total: number;
  current: number;
}) => {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === current;
        const isCompleted = index < current;

        return (
          <Animated.View
            key={index}
            style={[
              styles.progressSegment,
              isCompleted && styles.progressSegmentCompleted,
              isActive && styles.progressSegmentActive,
            ]}
          />
        );
      })}
    </View>
  );
};

const SprintCard3D = ({ isActive, children }: any) => {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 400 });
    } else {
      scale.value = withTiming(0.8);
      opacity.value = withTiming(0);
    }
  }, [isActive, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ perspective: 1000 }, { scale: scale.value }],
  }));

  if (!isActive && opacity.value === 0) return null;

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <GlassCard intensity="heavy" style={styles.cardInner}>
        {children}
      </GlassCard>
    </Animated.View>
  );
};

export default function SprintScreen() {
  const router = useRouter();

  const [session, setSession] = useState<SprintState>({
    status: 'initializing',
    startTime: Date.now(),
    questionStartTime: Date.now(),
    timeSpent: 0,
  });

  const [cards, setCards] = useState<SprintCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState<ComboMetrics>({
    current: 0,
    max: 0,
    multiplier: 1,
  });
  const [result, setResult] = useState<SprintResult | null>(null);

  const comboScale = useSharedValue(1);

  useEffect(() => {
    const initSprint = async () => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const data = await api.generateDailySprint();

        if (data && data.length > 0) {
          setCards(data);
          setSession((prev) => ({
            ...prev,
            status: 'active',
            startTime: Date.now(),
            questionStartTime: Date.now(),
          }));
        } else {
          throw new Error('Empty data received');
        }
      } catch (err: any) {
        console.error('Sprint Init Error:', err);
        Alert.alert(
          'Connection Issue',
          'Unable to connect to Neural Link (AI). Please try again.',
          [{ text: 'Exit', onPress: () => router.back() }],
        );
      }
    };

    initSprint();
  }, [router]);

  const handleAnswer = useCallback(
    (index: number) => {
      if (isAnswered) return;

      Haptics.selectionAsync();
      setSelectedOption(index);
      setIsAnswered(true);

      const currentCard = cards[currentIndex];
      // Default to 0 if correctAnswer is missing to prevent crash
      const correctIdx = currentCard.correctAnswer ?? 0;
      const isCorrect = index === correctIdx;

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScore((s) => s + 1);

        setCombo((prev) => {
          const newCurrent = prev.current + 1;
          const newMax = Math.max(prev.max, newCurrent);
          const newMult = 1 + Math.floor(newCurrent / 3) * 0.1;

          if (newCurrent > 1) {
            comboScale.value = withSequence(withSpring(1.5), withSpring(1));
          }

          return { current: newCurrent, max: newMax, multiplier: newMult };
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setCombo((prev) => ({ ...prev, current: 0, multiplier: 1 }));
        Vibration.vibrate(100);
      }
    },
    [isAnswered, cards, currentIndex, comboScale],
  );

  const handleNext = async () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setSession((prev) => ({ ...prev, questionStartTime: Date.now() }));
    } else {
      setSession((prev) => ({ ...prev, status: 'calculating' }));

      const baseXP = score * 10;
      const speedBonus =
        (Date.now() - session.startTime) / 1000 < cards.length * 15 ? 50 : 0;
      const comboBonus = combo.max * 5;
      const totalXP = Math.floor(
        (baseXP + speedBonus + comboBonus) * combo.multiplier,
      );

      try {
        const resultData = await api.completeSprint(totalXP, score);
        setResult(resultData);
        setSession((prev) => ({ ...prev, status: 'summary' }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Fallback result if API fails
        setResult({
          xpEarned: totalXP,
          questionsCorrect: score,
          totalQuestions: cards.length,
          newStreak: 1,
        });
        setSession((prev) => ({ ...prev, status: 'summary' }));
      }
    }
  };

  // --- RENDER: LOADING STATE ---
  if (session.status === 'initializing' || session.status === 'calculating') {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={THEME.indigo} />
        <Text style={styles.loaderText}>
          {session.status === 'initializing'
            ? 'INITIALIZING NEURAL LINK...'
            : 'CALCULATING MASTERY...'}
        </Text>
      </View>
    );
  }

  // --- RENDER: SUMMARY STATE ---
  if (session.status === 'summary' && result) {
    return (
      <SafeAreaView style={styles.summaryContainer}>
        <View style={styles.summaryBackground}>
          <View style={styles.summaryBlobTop} />
          <View style={styles.summaryBlobBottom} />
        </View>

        <Animated.View
          entering={FadeIn.duration(800)}
          style={styles.summaryContent}
        >
          <View style={styles.trophyContainer}>
            <Trophy size={64} color="#FACC15" />
            <Animated.View style={styles.trophyGlow} />
          </View>

          <Text style={styles.summaryTitle}>SPRINT COMPLETE</Text>
          <Text style={styles.summarySub}>Neural pathways reinforced.</Text>

          <View style={styles.statsGrid}>
            <GlassCard style={styles.statBox} intensity="light">
              <Text style={styles.statLabel}>XP GAINED</Text>
              <Text style={[styles.statValue, { color: THEME.indigo }]}>
                +{result.xpEarned}
              </Text>
            </GlassCard>

            <GlassCard style={styles.statBox} intensity="light">
              <Text style={styles.statLabel}>ACCURACY</Text>
              <Text style={[styles.statValue, { color: THEME.success }]}>
                {Math.round((result.questionsCorrect / cards.length) * 100)}%
              </Text>
            </GlassCard>

            <GlassCard style={styles.statBox} intensity="light">
              <Text style={styles.statLabel}>MAX COMBO</Text>
              <Text style={[styles.statValue, { color: THEME.warning }]}>
                {combo.max}x
              </Text>
            </GlassCard>
          </View>

          <Button
            onPress={() => router.replace('/')}
            fullWidth
            size="lg"
            className="mt-8 shadow-xl shadow-indigo-500/30"
          >
            RETURN TO HQ
          </Button>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const currentCard = cards[currentIndex];

  // --- RENDER: ACTIVE GAME LOOP ---
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER HUD */}
      <View style={styles.hudHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={THEME.slate} />
        </TouchableOpacity>

        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <SprintProgressBar total={cards.length} current={currentIndex} />
        </View>

        <View style={styles.comboCounter}>
          <Flame
            size={16}
            color={combo.current > 1 ? THEME.warning : THEME.slate}
          />
          <Text
            style={[
              styles.comboText,
              combo.current > 1 && { color: THEME.warning },
            ]}
          >
            {combo.current}x
          </Text>
        </View>
      </View>

      {/* MAIN CARD STACK */}
      <View style={styles.cardStack}>
        <SprintCard3D isActive={true}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* TYPE BADGE */}
            <View style={styles.typeBadge}>
              {currentCard.type === 'info' ? (
                <Brain size={14} color={THEME.indigo} />
              ) : (
                <Code size={14} color={THEME.indigo} />
              )}
              <Text style={styles.typeText}>
                {currentCard.type === 'info' ? 'KNOWLEDGE' : 'CHALLENGE'}
              </Text>
            </View>

            {/* QUESTION TEXT */}
            <Text style={styles.questionText}>{currentCard.title}</Text>
            <Text style={styles.contentText}>{currentCard.content}</Text>

            {/* OPTIONS MATRIX */}
            {currentCard.options && (
              <View style={styles.optionsGrid}>
                {currentCard.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const correctIdx = currentCard.correctAnswer ?? 0;
                  const isCorrect = idx === correctIdx;

                  let styleState = styles.optionNormal;
                  let textStyle = styles.optionTextNormal;
                  let icon = null;

                  if (isAnswered) {
                    if (isCorrect) {
                      styleState = styles.optionCorrect;
                      textStyle = styles.optionTextCorrect;
                      icon = <CheckCircle2 size={18} color={THEME.success} />;
                    } else if (isSelected) {
                      styleState = styles.optionWrong;
                      textStyle = styles.optionTextWrong;
                      icon = <AlertTriangle size={18} color={THEME.danger} />;
                    } else {
                      styleState = styles.optionDimmed;
                    }
                  } else if (isSelected) {
                    styleState = styles.optionSelected;
                    textStyle = styles.optionTextSelected;
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleAnswer(idx)}
                      disabled={isAnswered}
                      activeOpacity={0.9}
                      style={[styles.optionBase, styleState]}
                    >
                      <Text style={[styles.optionTextBase, textStyle]}>
                        {option}
                      </Text>
                      {icon && <View style={styles.optionIcon}>{icon}</View>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* EXPLANATION REVEAL */}
            {isAnswered && (
              <Animated.View
                entering={FadeIn.duration(400)}
                style={styles.explanationBox}
              >
                <Text style={styles.explanationTitle}>ANALYSIS</Text>
                <Text style={styles.explanationText}>
                  {currentCard.explanation ||
                    'Good effort! Review the concept.'}
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        </SprintCard3D>
      </View>

      {/* FOOTER CONTROLS */}
      <View style={styles.footer}>
        {isAnswered || currentCard.type === 'info' ? (
          <Button
            fullWidth
            size="lg"
            onPress={handleNext}
            className="flex-row gap-2"
          >
            <Text style={styles.btnText}>
              {currentIndex === cards.length - 1
                ? 'COMPLETE SPRINT'
                : 'CONTINUE'}
            </Text>
            <ArrowRight size={20} color="white" />
          </Button>
        ) : (
          <Text style={styles.hintText}>Select an option to proceed</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // LAYOUT
  container: {
    flex: 1,
    backgroundColor: THEME.obsidian,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: THEME.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: THEME.indigo,
    marginTop: 20,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 12,
  },

  // HEADER HUD
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  comboCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  comboText: {
    color: THEME.slate,
    fontWeight: '900',
    fontSize: 14,
  },

  // PROGRESS BAR
  progressContainer: {
    flexDirection: 'row',
    height: 6,
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  progressSegmentCompleted: {
    backgroundColor: THEME.success,
  },
  progressSegmentActive: {
    backgroundColor: THEME.indigo,
  },

  // CARD STACK
  cardStack: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  cardWrapper: {
    flex: 1,
    width: '100%',
  },
  cardInner: {
    flex: 1,
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // CONTENT TYPOGRAPHY
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  typeText: {
    color: THEME.indigo,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  questionText: {
    color: THEME.white,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 12,
  },
  contentText: {
    color: THEME.slate,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 32,
  },

  // OPTIONS
  optionsGrid: {
    gap: 12,
  },
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
  optionDimmed: {
    opacity: 0.5,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  optionTextBase: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  optionTextNormal: { color: THEME.slate },
  optionTextSelected: { color: THEME.white },
  optionTextCorrect: { color: THEME.success },
  optionTextWrong: { color: THEME.danger },
  optionIcon: { marginLeft: 12 },

  // EXPLANATION
  explanationBox: {
    marginTop: 24,
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  explanationTitle: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  explanationText: {
    color: THEME.white,
    fontSize: 14,
    lineHeight: 22,
  },

  // FOOTER
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  hintText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // SUMMARY SCREEN
  summaryContainer: {
    flex: 1,
    backgroundColor: THEME.obsidian,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  summaryBlobTop: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    filter: 'blur(80px)',
  },
  summaryBlobBottom: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    filter: 'blur(60px)',
  },
  summaryContent: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    alignItems: 'center',
  },
  trophyContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    backgroundColor: 'rgba(250, 204, 21, 0.3)',
    borderRadius: 50,
    zIndex: -1,
    filter: 'blur(40px)',
  },
  summaryTitle: {
    color: THEME.white,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
    textAlign: 'center',
  },
  summarySub: {
    color: THEME.slate,
    fontSize: 16,
    marginBottom: 48,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statBox: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statLabel: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
});
