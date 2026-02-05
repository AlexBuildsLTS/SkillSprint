import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  Zap,
  Star,
  ArrowRight,
  Target,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { CodeEmulator } from '@/components/lesson/CodeEmulator';
import { Bento3DCard } from '@/components/ui/Bento3DCard';

/**
 * -----------------------------------------------------------------------------
 * MODULE: THEME CONFIGURATION
 * -----------------------------------------------------------------------------
 * Centralized color palette for the lesson interface.
 */
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  gold: '#fbbf24',
  emerald: '#10b981',
  border: 'rgba(255,255,255,0.08)',
  slate: '#94a3b8',
  white: '#ffffff',
};

/**
 * -----------------------------------------------------------------------------
 * MODULE: MAIN COMPONENT (LessonScreen)
 * -----------------------------------------------------------------------------
 * Handles the lesson logic, data fetching, language detection, and UI rendering.
 */
export default function LessonScreen() {
  // Navigation & Param Hooks
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const lessonId = Array.isArray(id) ? id[0] : id || '';

  // Local State
  const [step, setStep] = useState<'LEARN' | 'PRACTICE'>('LEARN');
  const [showSuccess, setShowSuccess] = useState(false);

  // Animation Values
  const barWidth = useSharedValue(0);

  /**
   * ---------------------------------------------------------------------------
   * SUB-MODULE: DATA FETCHING & PROCESSING
   * ---------------------------------------------------------------------------
   * Fetches lesson details from Supabase and normalizes data for the UI.
   * Includes the Critical Language Detection Logic.
   */
  const { data: context, isLoading } = useQuery({
    queryKey: ['lesson-final-sync', lessonId],
    queryFn: async () => {
      // 1. RPC Call to Supabase
      const { data, error } = await supabase.rpc('get_lesson_details', {
        p_lesson_id: lessonId,
      });

      if (error) throw error;
      const res = data as any;

      // 2. Parse Content JSON (Handle potential parsing errors safely)
      let content = res.lesson.content;
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch (e) {
          content = { text: 'Error loading content.', starter_code: '' };
        }
      }

      // 3. CRITICAL: ROBUST LANGUAGE DETECTION ENGINE
      // Maps the human-readable "Track Title" to the "Emulator Kernel Key"
      const rawTitle = (res.track_title || '').toLowerCase();
      let detectedLang = 'javascript'; // Default fallback

      if (rawTitle.includes('python')) {
        detectedLang = 'python';
      } else if (rawTitle.includes('java') && !rawTitle.includes('script')) {
        // Strict check to ensure "JavaScript" doesn't trigger "Java" mode
        detectedLang = 'java';
      } else if (rawTitle.includes('sql') || rawTitle.includes('data')) {
        detectedLang = 'sql';
      } else if (rawTitle.includes('type') || rawTitle.includes('ts')) {
        detectedLang = 'typescript';
      } else if (rawTitle.includes('c++') || rawTitle.includes('cpp')) {
        detectedLang = 'cpp';
      } else if (rawTitle.includes('c#') || rawTitle.includes('csharp')) {
        detectedLang = 'csharp';
      } else if (rawTitle.includes('go')) {
        detectedLang = 'go';
      } else if (rawTitle.includes('rust')) {
        detectedLang = 'rust';
      } else if (rawTitle.includes('swift')) {
        detectedLang = 'swift';
      } else if (rawTitle.includes('kotlin')) {
        detectedLang = 'kotlin';
      } else if (rawTitle.includes('php')) {
        detectedLang = 'php';
      } else if (rawTitle.includes('ruby')) {
        detectedLang = 'ruby';
      }

      // 4. Return Normalized Data Object
      return {
        title: res.lesson.title,
        text: content.text,
        starter: content.starter_code || '',
        xp: res.lesson.xp_reward || 50,

        // Mission Text: From Questions Table -> Fallback string
        missionText: res.questions?.[0]?.question || 'Execute logic.',

        // Hint: From Questions Table -> Fallback string
        hint: res.questions?.[0]?.hint || 'No hint available for this task.',

        // Answer: Sanitize quotes for comparison logic
        expected: res.questions?.[0]?.answer
          ? String(res.questions[0].answer).replace(/"/g, '')
          : '',

        // Language: The result of the detection engine above
        lang: detectedLang,
      };
    },
    enabled: !!lessonId,
  });

  /**
   * ---------------------------------------------------------------------------
   * SUB-MODULE: COMPLETION HANDLER (FIXED & SECURE)
   * ---------------------------------------------------------------------------
   * Triggered when the Emulator validates the code successfully.
   * Updates Supabase with the exact lesson ID to ensure Analytics work.
   */
  const onComplete = async () => {
    setShowSuccess(true);
    // Animate XP Bar
    barWidth.value = withDelay(400, withTiming(1, { duration: 1200 }));

    // 🔒 SECURE TRANSACTION: Record Lesson + Award XP + Update Stats
    try {
      const { data: userSession } = await supabase.auth.getUser();

      if (userSession?.user) {
        // We use the new Transaction RPC to link this specific lesson to the user
        const { data, error } = await supabase.rpc(
          'complete_lesson_transaction',
          {
            p_lesson_id: lessonId,
            p_user_id: userSession.user.id,
          },
        );

        if (error) {
          console.error('XP Transaction Failed:', error.message);
        } else {
          console.log(
            'Lesson Recorded Successfully. New XP:',
            (data as any)?.new_xp,
          );
          // Pre-fetch the dashboard stats so they are ready when user navigates back
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      }
    } catch (err) {
      console.error('Unexpected error during completion:', err);
    }
  };

  // Animated Style for XP Bar
  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  // Loading State
  if (isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.indigo} />
      </View>
    );

  /**
   * ---------------------------------------------------------------------------
   * SUB-MODULE: RENDER (UI)
   * ---------------------------------------------------------------------------
   */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.container}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={22} color="white" />
          </TouchableOpacity>
          <View>
            <Text style={styles.trackLabel}>{context?.lang.toUpperCase()}</Text>
            <Text style={styles.headerT}>{context?.title}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          {/* MISSION CARD (Bento3D Style) */}
          <Bento3DCard style={{ marginBottom: 20, width: '100%' }}>
            <View
              style={[
                styles.cardContent,
                styles.glassEffect,
                { borderColor: THEME.emerald + '40', minHeight: 120 },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Target size={16} color={THEME.gold} />
                  <Text style={[styles.cardLabel, { color: THEME.gold }]}>
                    Task
                  </Text>
                </View>
                <Zap size={14} color={THEME.emerald} fill={THEME.emerald} />
              </View>
              <Text style={styles.missionText}>{context?.missionText}</Text>
            </View>
          </Bento3DCard>

          {/* STEP 1: LEARNING CONTENT */}
          {step === 'LEARN' ? (
            <Animated.View entering={FadeInDown}>
              <Text style={styles.bodyText}>{context?.text}</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setStep('PRACTICE')}
              >
                <Text style={styles.actionBtnT}>INITIALIZE TASK</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            /* STEP 2: CODE EMULATOR */
            <View>
              <CodeEmulator
                language={context?.lang || 'javascript'}
                code={context?.starter || ''}
                expectedOutput={context?.expected}
                hint={context?.hint}
                onComplete={onComplete}
              />
            </View>
          )}
        </ScrollView>

        {/* SUCCESS MODAL & XP REWARD */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.overlay}>
            <Animated.View
              entering={ZoomIn.duration(400)}
              style={styles.rewardCard}
            >
              <LinearGradient
                colors={['#1e293b', '#020617']}
                style={StyleSheet.absoluteFill}
              />
              <Zap size={44} color={THEME.gold} fill={THEME.gold} />
              <Text style={styles.rewardTitle}>Mission Success</Text>

              <View style={styles.xpBox}>
                <View style={styles.xpHead}>
                  <Text style={styles.xpT}>+{context?.xp} XP EARNED</Text>
                  <Star size={14} color={THEME.gold} fill={THEME.gold} />
                </View>
                <View style={styles.xpTrack}>
                  <Animated.View style={[styles.xpFill, barStyle]} />
                </View>
              </View>

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => {
                  setShowSuccess(false);
                  // Critical: Refresh Dashboard Stats to show new XP Breakdown
                  queryClient.invalidateQueries({
                    queryKey: ['dashboard-stats'],
                  });
                  router.back();
                }}
              >
                <Text style={styles.nextBtnT}>CONTINUE</Text>
                <ArrowRight size={20} color="white" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/**
 * -----------------------------------------------------------------------------
 * MODULE: STYLESHEET
 * -----------------------------------------------------------------------------
 */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.obsidian,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderBottomWidth: 1,
    borderColor: THEME.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  trackLabel: {
    color: THEME.indigo,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerT: { color: 'white', fontSize: 18, fontWeight: 'bold' },
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: THEME.slate,
  },
  missionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  bodyText: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 30,
  },
  actionBtn: {
    backgroundColor: THEME.indigo,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionBtnT: { color: 'white', fontWeight: 'bold' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  rewardCard: {
    width: '100%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rewardTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
  },
  xpBox: { width: '100%', marginVertical: 20 },
  xpHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  xpT: { color: THEME.gold, fontWeight: '900', fontSize: 12 },
  xpTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpFill: { height: '100%', backgroundColor: THEME.indigo },
  nextBtn: {
    backgroundColor: THEME.indigo,
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  nextBtnT: { color: 'white', fontWeight: 'bold' },
});
