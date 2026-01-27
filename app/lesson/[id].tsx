import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Zap,
  Terminal,
  Code2,
  AlertTriangle,
  Play,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { CodeEmulator } from '@/components/lesson/CodeEmulator';
import * as Haptics from 'expo-haptics';

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  success: '#10b981',
  surface: '#0f172a',
  border: 'rgba(255, 255, 255, 0.08)',
};

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lessonId = Array.isArray(id) ? id[0] : id;

  const [step, setStep] = useState<'LEARN' | 'PRACTICE'>('LEARN');
  const [userCode, setUserCode] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, tracks(*)')
        .eq('id', lessonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const context = useMemo(() => {
    if (!lesson) return null;
    const content =
      typeof lesson.content === 'string'
        ? JSON.parse(lesson.content)
        : (lesson.content as any);
    const trackT = lesson.tracks?.title?.toLowerCase() || '';
    let lang = 'python';
    if (trackT.includes('java')) lang = 'java';
    else if (trackT.includes('kotlin')) lang = 'kotlin';
    return {
      lang,
      code: content?.code || '',
      text: content?.text || lesson.title,
      questions: content?.questions || [],
    };
  }, [lesson]);

  if (isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.indigo} size="large" />
      </View>
    );
  if (!lesson || !context) return null;

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
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerT}>{lesson.title}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {step === 'LEARN' ? (
            <Animated.View entering={FadeInDown}>
              <Text style={styles.bodyText}>{context.text}</Text>
              {/* KNOWLEDGE CHECK MODULE */}
              {context.questions.length > 0 && (
                <View style={styles.quizCard}>
                  <Text style={styles.qTitle}>KNOWLEDGE_CHECK</Text>
                  <Text style={styles.qText}>
                    {context.questions[0].question}
                  </Text>
                  {context.questions[0].options.map(
                    (opt: string, i: number) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.optBtn,
                          selectedOption === i && { borderColor: THEME.indigo },
                        ]}
                        onPress={() => setSelectedOption(i)}
                      >
                        <Text style={{ color: 'white' }}>{opt}</Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              )}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setStep('PRACTICE')}
              >
                <Text style={styles.actionBtnT}>
                  INITIALIZE PRACTICE TERMINALS
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.ideContainer}>
              {/* TERMINAL 1: SOURCE EDITOR */}
              <View style={styles.panelHead}>
                <Code2 size={14} color={THEME.indigo} />
                <Text style={styles.panelTitle}>SOURCE_EDITOR v2.1</Text>
              </View>
              <TextInput
                multiline
                style={styles.editor}
                defaultValue={userCode || context.code}
                onChangeText={setUserCode}
                spellCheck={false}
                autoCapitalize="none"
              />

              {/* TERMINAL 2: EXECUTION KERNEL */}
              <View style={styles.panelHead}>
                <Terminal size={14} color={THEME.success} />
                <Text style={styles.panelTitle}>LIVE_RUNTIME_FEED</Text>
              </View>
              <CodeEmulator
                language={context.lang}
                code={userCode || context.code}
                onComplete={() => router.back()}
              />
            </View>
          )}
        </ScrollView>
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
    backgroundColor: '#020617',
  },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerT: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  scroll: { padding: 20 },
  bodyText: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 25,
  },
  quizCard: {
    backgroundColor: THEME.surface,
    padding: 20,
    borderRadius: 24,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  qTitle: {
    color: THEME.indigo,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 10,
  },
  qText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  optBtn: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: THEME.indigo,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionBtnT: { color: 'white', fontWeight: '900' },
  ideContainer: { gap: 10 },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  panelTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  editor: {
    backgroundColor: '#050a18',
    color: '#10b981',
    padding: 20,
    borderRadius: 20,
    fontFamily: 'monospace',
    minHeight: 180,
    borderWidth: 1,
    borderColor: THEME.border,
    textAlignVertical: 'top',
  },
});
