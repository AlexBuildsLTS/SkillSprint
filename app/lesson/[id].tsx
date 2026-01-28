import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  gold: '#fbbf24',
  border: 'rgba(255,255,255,0.08)',
};

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const lessonId = Array.isArray(id) ? id[0] : id || '';

  const [step, setStep] = useState<'LEARN' | 'PRACTICE'>('LEARN');
  const [userCode, setUserCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const barWidth = useSharedValue(0);

  const { data: context, isLoading } = useQuery({
    queryKey: ['lesson-final-sync', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_lesson_details', {
        p_lesson_id: lessonId,
      });
      if (error) throw error;
      const res = data as any;
      const content =
        typeof res.lesson.content === 'string'
          ? JSON.parse(res.lesson.content)
          : res.lesson.content;
      return {
        title: res.lesson.title,
        text: content.text,
        starter: content.starter_code || '',
        xp: res.lesson.xp_reward || 50,
        missionText: res.questions?.[0]?.question || 'Execute logic.',
        expected: res.questions?.[0]?.answer
          ? String(res.questions[0].answer).replace(/"/g, '')
          : '',
        lang: res.track_title || 'python',
      };
    },
    enabled: !!lessonId,
  });

  useEffect(() => {
    if (context?.starter) setUserCode(context.starter);
  }, [context]);

  const onComplete = () => {
    setShowSuccess(true);
    barWidth.value = withDelay(400, withTiming(1, { duration: 1200 }));
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase.rpc('add_xp', {
          amount: context?.xp || 50,
          target_user_id: data.user.id,
        });
    });
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

        <ScrollView contentContainerStyle={{ padding: 24 }}>
          {/* MISSION BOX */}
          <View style={styles.missionCard}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Target size={14} color={THEME.gold} />
              <Text style={styles.missionTitle}>CURRENT_MISSION</Text>
            </View>
            <Text style={styles.missionText}>{context?.missionText}</Text>
          </View>

          {step === 'LEARN' ? (
            <Animated.View entering={FadeInDown}>
              <Text style={styles.bodyText}>{context?.text}</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setStep('PRACTICE')}
              >
                <Text style={styles.actionBtnT}>INITIALIZE TERMINAL</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View>
              <TextInput
                multiline
                style={styles.editor}
                value={userCode}
                onChangeText={setUserCode}
                spellCheck={false}
                autoCapitalize="none"
              />
              <CodeEmulator
                language={context?.lang || 'python'}
                code={userCode}
                expectedOutput={context?.expected}
                onComplete={onComplete}
              />
            </View>
          )}
        </ScrollView>

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
                  queryClient.invalidateQueries({ queryKey: ['user_stats'] });
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
  missionCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 20,
  },
  missionTitle: { color: THEME.gold, fontSize: 10, fontWeight: '900' },
  missionText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
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
  editor: {
    backgroundColor: '#050a18',
    color: '#a5b4fc',
    padding: 20,
    borderRadius: 20,
    fontFamily: 'monospace',
    minHeight: 200,
    borderWidth: 1,
    borderColor: THEME.border,
    textAlignVertical: 'top',
  },
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
  