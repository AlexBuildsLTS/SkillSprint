/**
 * ============================================================================
 * ⚡ SCREEN: DAILY SPRINT ENGINE (CORE GAME LOOP)
 * ============================================================================
 * PATH: app/sprint.tsx
 */

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
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  CheckCircle2,
  Trophy,
  Flame,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';

// INTERNAL SERVICES - FIXED PATH
import { api } from '@/services/api';
import { SprintCard, SprintResult } from '@/services/types';
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

interface ComboMetrics {
  current: number;
  max: number;
  multiplier: number;
}

const SprintProgressBar = memo(function SprintProgressBar({ 
  total, 
  current 
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

const SprintCard3D = memo(function SprintCard3D({ 
  isActive, 
  children 
}: { 
  isActive: boolean; 
  children: React.ReactNode; 
}) {
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
  }, [isActive, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ perspective: 1000 }, { scale: scale.value }],
  }));

  return <Animated.View style={[styles.cardWrapper, animatedStyle]}>{children}</Animated.View>;
});

export default function SprintScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<'initializing' | 'active' | 'summary'>('initializing');
  const [cards, setCards] = useState<SprintCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState<ComboMetrics>({ current: 0, max: 0, multiplier: 1 });
  const [result, setResult] = useState<SprintResult | null>(null);
  const comboScale = useSharedValue(1);

  const initSprint = useCallback(async () => {
    try {
      const data = await api.generateDailySprint();
      if (data?.length) {
        setCards(data);
        setStatus('active');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Neural Link Failure', 'Uplink lost.', [{ text: 'Exit', onPress: () => router.back() }]);
    }
  }, [router]);

  useEffect(() => {
    initSprint();
  }, [initSprint]);

  const handleAnswer = useCallback((index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const correctIdx = cards[currentIndex].correctAnswer ?? 0;
    const isCorrect = index === correctIdx;

    if (isCorrect) {
      setScore(s => s + 1);
      setCombo(prev => {
        const newCurrent = prev.current + 1;
        if (newCurrent > 1) {
          comboScale.value = withSequence(withSpring(1.5), withSpring(1));
        }
        return { 
          current: newCurrent, 
          max: Math.max(prev.max, newCurrent), 
          multiplier: 1 + Math.floor(newCurrent / 3) * 0.1 
        };
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setCombo(prev => ({ ...prev, current: 0, multiplier: 1 }));
      Vibration.vibrate(100);
    }
  }, [isAnswered, cards, currentIndex, comboScale]);

  const handleNext = useCallback(async () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setStatus('initializing');
      const totalXP = Math.floor(((score * 10) + (combo.max * 5)) * combo.multiplier);
      try {
        const res = await api.completeSprint(totalXP, score);
        setResult(res);
        setStatus('summary');
      } catch (err) {
        console.error(err);
        setResult({ xpEarned: totalXP, questionsCorrect: score, totalQuestions: cards.length, newStreak: 1 });
        setStatus('summary');
      }
    }
  }, [currentIndex, cards, score, combo]);

  const comboStyle = useAnimatedStyle(() => ({
    transform: [{ scale: comboScale.value }]
  }));

  if (status === 'initializing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.indigo} />
        <Text style={styles.loaderText}>SYNCING NEURAL PATHWAYS...</Text>
      </View>
    );
  }

  if (status === 'summary' && result) {
    return (
      <SafeAreaView style={styles.summaryContainer}>
        <Trophy size={80} color={THEME.warning} />
        <Text style={styles.summaryTitle}>SPRINT COMPLETE</Text>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statBox}>
            <Text style={styles.statLabel}>XP</Text>
            <Text style={styles.statValue}>+{result.xpEarned}</Text>
          </GlassCard>
          <GlassCard style={styles.statBox}>
            <Text style={styles.statLabel}>ACCURACY</Text>
            <Text style={styles.statValue}>{Math.round((score / cards.length) * 100)}%</Text>
          </GlassCard>
        </View>
        <Button onPress={() => router.replace('/')} fullWidth>RETURN TO HQ</Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.hudHeader}>
        <TouchableOpacity onPress={() => router.back()}><X size={20} color={THEME.slate} /></TouchableOpacity>
        <SprintProgressBar total={cards.length} current={currentIndex} />
        <Animated.View style={[styles.comboCounter, comboStyle]}>
          <Flame size={16} color={THEME.warning} />
          <Text style={[styles.comboText, { color: THEME.warning }]}>{combo.current}x</Text>
        </Animated.View>
      </View>

      <Animated.View entering={SlideInRight} key={currentIndex} style={styles.cardStack}>
        <SprintCard3D isActive={true}>
          <GlassCard intensity="heavy" style={styles.cardInner}>
            <Text style={styles.questionText}>{cards[currentIndex].title}</Text>
            <Text style={styles.contentText}>{cards[currentIndex].content}</Text>
            <View style={styles.optionsGrid}>
              {cards[currentIndex].options?.map((opt: string, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  onPress={() => handleAnswer(idx)} 
                  disabled={isAnswered} 
                  style={[
                    styles.optionBase, 
                    !isAnswered && selectedOption === idx ? styles.optionSelected : 
                    isAnswered && idx === cards[currentIndex].correctAnswer ? styles.optionCorrect : 
                    isAnswered && selectedOption === idx ? styles.optionWrong : styles.optionNormal
                  ]}
                >
                  <Text style={[styles.optionTextBase, (isAnswered && idx === cards[currentIndex].correctAnswer) || selectedOption === idx ? { color: 'white' } : { color: THEME.slate }]}>
                    {opt}
                  </Text>
                  {isAnswered && idx === cards[currentIndex].correctAnswer && <CheckCircle2 size={18} color={THEME.success} />}
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </SprintCard3D>
      </Animated.View>

      <View style={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
        {(isAnswered || cards[currentIndex].type === 'info') && (
          <Button fullWidth size="lg" onPress={handleNext}>CONTINUE</Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.obsidian },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.obsidian },
  loaderText: { color: THEME.indigo, marginTop: 20, fontWeight: '900' },
  hudHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  comboCounter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  comboText: { color: THEME.warning, fontWeight: '900' },
  progressContainer: { flex: 1, flexDirection: 'row', height: 6, gap: 4 },
  progressSegment: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
  progressSegmentCompleted: { backgroundColor: THEME.success },
  progressSegmentActive: { backgroundColor: THEME.indigo },
  cardStack: { flex: 1, padding: 20 },
  cardWrapper: { flex: 1 },
  cardInner: { flex: 1, padding: 24, borderRadius: 32 },
  questionText: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  contentText: { color: THEME.slate, fontSize: 16, marginBottom: 30 },
  optionsGrid: { gap: 12 },
  optionBase: { padding: 18, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionNormal: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' },
  optionSelected: { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: THEME.indigo },
  optionCorrect: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: THEME.success },
  optionWrong: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: THEME.danger },
  optionTextBase: { fontSize: 15, fontWeight: '600', flex: 1 },
  summaryContainer: { flex: 1, backgroundColor: THEME.obsidian, justifyContent: 'center', alignItems: 'center', padding: 40 },
  summaryTitle: { color: 'white', fontSize: 32, fontWeight: '900', marginVertical: 20 },
  statsGrid: { flexDirection: 'row', gap: 15, marginBottom: 40 },
  statBox: { flex: 1, padding: 20, alignItems: 'center', borderRadius: 20 },
  statLabel: { color: THEME.slate, fontSize: 10, fontWeight: '900' },
  statValue: { color: 'white', fontSize: 24, fontWeight: '900' },
});