import React, { useState, useMemo } from 'react';
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
  BookOpen,
  TerminalSquare,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { CodeEmulator } from '@/components/lesson/CodeEmulator';
import { Bento3DCard } from '@/components/ui/Bento3DCard';

/**
 * -----------------------------------------------------------------------------
 * MODULE: THEME CONFIGURATION
 * -----------------------------------------------------------------------------
 */
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  gold: '#fbbf24',
  emerald: '#10b981',
  border: 'rgba(255,255,255,0.08)',
  slate: '#94a3b8',
  white: '#ffffff',
  surface: 'rgba(15, 23, 42, 0.6)',
};

/**
 * -----------------------------------------------------------------------------
 * MODULE: MAIN COMPONENT (LessonScreen)
 * -----------------------------------------------------------------------------
 */
export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const lessonId = Array.isArray(id) ? id[0] : id || '';

  const [step, setStep] = useState<'LEARN' | 'PRACTICE'>('LEARN');
  const [showSuccess, setShowSuccess] = useState(false);

  const barWidth = useSharedValue(0);

  /**
   * ---------------------------------------------------------------------------
   * DATA FETCHING & LANGUAGE DETECTION
   * ---------------------------------------------------------------------------
   */
  const { data: context, isLoading } = useQuery({
    queryKey: ['lesson-final-sync', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_lesson_details', {
        p_lesson_id: lessonId,
      });

      if (error) throw error;
      const res = data as any;

      let content = res.lesson.content;
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch (e) {
          content = { text: 'Error loading content.', starter_code: '' };
        }
      }

      const rawTitle = (res.track_title || '').toLowerCase();
      let detectedLang = 'javascript'; 

      if (rawTitle.includes('python')) {
        detectedLang = 'python';
      } else if (rawTitle.includes('java') && !rawTitle.includes('script')) {
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
      } else if (rawTitle.includes('r')) {
        detectedLang = 'r';
      } else if (rawTitle.includes('dart') || rawTitle.includes('flutter')) {
        detectedLang = 'dart';
      } else if (
        rawTitle.includes('bash') ||
        rawTitle.includes('shell') ||
        rawTitle.includes('linux')
      ) {
        detectedLang = 'bash';
      } else if (rawTitle.includes('react native')) {
        detectedLang = 'react native';
      }

      return {
        title: res.lesson.title,
        text: content.text,
        starter: content.starter_code || '',
        xp: res.lesson.xp_reward || 25,
        missionText: res.questions?.[0]?.question || 'Execute logic.',
        hint: res.questions?.[0]?.hint || 'No hint available for this task.',
        expected: res.questions?.[0]?.answer
          ? String(res.questions[0].answer).replace(/"/g, '')
          : '',
        lang: detectedLang,
      };
    },
    enabled: !!lessonId,
  });

  /**
   * ---------------------------------------------------------------------------
   * DYNAMIC TEXT PARSER
   * Splits the raw database string into structured UI components.
   * ---------------------------------------------------------------------------
   */
  const parsedContent = useMemo(() => {
    if (!context?.text) return { briefing: '', mission: '' };
    
    const raw = context.text;
    let briefing = raw;
    let mission = '';

    if (raw.includes('YOUR MISSION:')) {
      const parts = raw.split('YOUR MISSION:');
      briefing = parts[0].replace('ENTERPRISE BRIEFING:', '').trim();
      mission = parts[1].trim();
    } else {
      briefing = raw.replace('ENTERPRISE BRIEFING:', '').trim();
    }

    return { briefing, mission };
  }, [context?.text]);

  const onComplete = async () => {
    setShowSuccess(true);
    barWidth.value = withDelay(400, withTiming(1, { duration: 1200 }));

    try {
      const { data: userSession } = await supabase.auth.getUser();

      if (userSession?.user) {
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
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      }
    } catch (err) {
      console.error('Unexpected error during completion:', err);
    }
  };

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  if (isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.indigo} />
      </View>
    );

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
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
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
          
          {/* TOP CARD: The Evaluation Target */}
          <Bento3DCard style={{ marginBottom: 24, width: '100%' }}>
            <View
              style={[
                styles.cardContent,
                styles.glassEffect,
                { borderColor: THEME.emerald + '40' },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Target size={16} color={THEME.gold} />
                  <Text style={[styles.cardLabel, { color: THEME.gold }]}>
                    Evaluation Target
                  </Text>
                </View>
                <Zap size={14} color={THEME.emerald} fill={THEME.emerald} />
              </View>
              <Text style={styles.missionText}>{context?.missionText}</Text>
            </View>
          </Bento3DCard>

          {/* STEP 1: LEARNING DOSSIER */}
          {step === 'LEARN' ? (
            <View style={{ gap: 20 }}>
              
              {/* THE BRIEFING CALLOUT */}
              {parsedContent.briefing ? (
                <Animated.View entering={FadeInDown.delay(100)} style={styles.dossierCard}>
                  <View style={styles.dossierHeader}>
                    <BookOpen size={16} color={THEME.indigo} />
                    <Text style={[styles.dossierLabel, { color: THEME.indigo }]}>Enterprise Briefing</Text>
                  </View>
                  <Text style={styles.dossierText}>{parsedContent.briefing}</Text>
                </Animated.View>
              ) : null}

              {/* THE MISSION CALLOUT */}
              {parsedContent.mission ? (
                <Animated.View entering={FadeInDown.delay(200)} style={[styles.dossierCard, { borderLeftColor: THEME.slate }]}>
                  <View style={styles.dossierHeader}>
                    <TerminalSquare size={16} color={THEME.white} />
                    <Text style={[styles.dossierLabel, { color: THEME.white }]}>Deployment Details</Text>
                  </View>
                  <Text style={[styles.dossierText, { color: '#e2e8f0' }]}>{parsedContent.mission}</Text>
                </Animated.View>
              ) : null}

              <Animated.View entering={FadeInDown.delay(300)} style={{ marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setStep('PRACTICE')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnT}>INITIALIZE TERMINAL</Text>
                  <ArrowRight size={18} color="white" />
                </TouchableOpacity>
              </Animated.View>

            </View>
          ) : (
            /* STEP 2: CODE EMULATOR */
            <Animated.View entering={FadeInDown}>
              <CodeEmulator
                language={context?.lang || 'javascript'}
                code={context?.starter || ''}
                expectedOutput={context?.expected}
                hint={context?.hint}
                onComplete={onComplete}
              />
            </Animated.View>
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
              <Text style={styles.rewardTitle}>Execution Validated</Text>

              <View style={styles.xpBox}>
                <View style={styles.xpHead}>
                  <Text style={styles.xpT}>+{context?.xp} XP SECURED</Text>
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
                  queryClient.invalidateQueries({
                    queryKey: ['dashboard-stats'],
                  });
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
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
  
  // Bento Top Card
  glassEffect: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
  },
  cardContent: {
    padding: 20,
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  missionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 26,
  },

  // Dossier Design (The Polished Learning Text)
  dossierCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: THEME.indigo,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.border,
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dossierLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dossierText: {
    color: THEME.slate,
    fontSize: 15,
    lineHeight: 26,
  },

  // Action Button
  actionBtn: {
    backgroundColor: THEME.indigo,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBtnT: { color: 'white', fontWeight: '900', letterSpacing: 1 },
  
  // Success Modal
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
    fontWeight: '900',
    marginTop: 15,
  },
  xpBox: { width: '100%', marginVertical: 24 },
  xpHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  xpT: { color: THEME.gold, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  xpTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
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
  nextBtnT: { color: 'white', fontWeight: '900', letterSpacing: 1 },
});

