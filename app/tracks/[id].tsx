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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Code2, Terminal } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { CodeEmulator } from '@/components/lesson/CodeEmulator';

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
  const lessonId = Array.isArray(id) ? id[0] : id;

  const [step, setStep] = useState<'LEARN' | 'PRACTICE'>('LEARN');
  const [userCode, setUserCode] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(
    null,
  );

  // 1. ROBUST DATA FETCHING
  // Explicitly join the 'questions' table!
  const {
    data: lesson,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['lesson-full', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(
          `
          *,
          questions (*),
          tracks (title, difficulty)
        `,
        )
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  // 2. DATA TRANSFORMATION
  const context = useMemo(() => {
    if (!lesson) return null;

    // Use the explicit table data first, fallback to JSON content if needed
    const dbQuestion = lesson.questions?.[0];
    const contentJson =
      typeof lesson.content === 'string'
        ? JSON.parse(lesson.content)
        : lesson.content;

    return {
      title: lesson.title,
      text: contentJson?.text || 'No content available.',
      code: contentJson?.code || '// Write your code here',
      trackTitle: lesson.tracks?.title,
      // Priority: DB Table -> JSON Content
      question: dbQuestion?.question || contentJson?.questions?.[0]?.question,
      options:
        dbQuestion?.options || contentJson?.questions?.[0]?.options || [],
      correctIndex:
        dbQuestion?.answer ?? contentJson?.questions?.[0]?.answer_index ?? 0,
      explanation: dbQuestion?.explanation,
    };
  }, [lesson]);

  const handleQuizCheck = () => {
    if (selectedOption === null || !context) return;
    const isCorrect = selectedOption === context.correctIndex;
    setQuizResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      Alert.alert('Correct!', context.explanation || 'Great job!');
    } else {
      Alert.alert('Incorrect', 'Try reading the lesson text again.');
    }
  };

  if (isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.indigo} />
      </View>
    );
  if (error || !context)
    return (
      <View style={styles.center}>
        <Text style={{ color: 'white' }}>Error loading lesson.</Text>
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
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text style={styles.trackLabel}>{context.trackTitle}</Text>
            <Text style={styles.headerT}>{context.title}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {step === 'LEARN' ? (
            <Animated.View entering={FadeInDown}>
              {/* LESSON TEXT */}
              <Text style={styles.bodyText}>{context.text}</Text>

              {/* QUIZ SECTION (FROM DB) */}
              {context.question && (
                <View style={styles.quizCard}>
                  <Text style={styles.qTitle}>KNOWLEDGE CHECK</Text>
                  <Text style={styles.qText}>{context.question}</Text>

                  {context.options.map((opt: string, i: number) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.optBtn,
                        selectedOption === i && {
                          borderColor: THEME.indigo,
                          backgroundColor: 'rgba(99,102,241,0.1)',
                        },
                        quizResult === 'correct' &&
                          i === context.correctIndex && {
                            borderColor: THEME.success,
                            backgroundColor: 'rgba(16,185,129,0.1)',
                          },
                      ]}
                      onPress={() => setSelectedOption(i)}
                      disabled={quizResult === 'correct'}
                    >
                      <Text style={{ color: 'white' }}>{opt}</Text>
                    </TouchableOpacity>
                  ))}

                  {quizResult !== 'correct' && (
                    <TouchableOpacity
                      style={styles.checkBtn}
                      onPress={handleQuizCheck}
                    >
                      <Text style={styles.checkBtnT}>CHECK ANSWER</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* NEXT BUTTON */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  !context.question || quizResult === 'correct'
                    ? {}
                    : { opacity: 0.5 },
                ]}
                onPress={() => setStep('PRACTICE')}
                disabled={context.question && quizResult !== 'correct'}
              >
                <Text style={styles.actionBtnT}>INITIALIZE TERMINAL</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.ideContainer}>
              <View style={styles.panelHead}>
                <Code2 size={14} color={THEME.indigo} />
                <Text style={styles.panelTitle}>SOURCE_EDITOR</Text>
              </View>

              <TextInput
                multiline
                style={styles.editor}
                defaultValue={context.code} // Pre-filled with "Emulator Trigger" code
                onChangeText={setUserCode}
                spellCheck={false}
                autoCapitalize="none"
              />

              <View style={styles.panelHead}>
                <Terminal size={14} color={THEME.success} />
                <Text style={styles.panelTitle}>RUNTIME_PREVIEW</Text>
              </View>

              <CodeEmulator
                language={context.trackTitle?.toLowerCase() || 'python'}
                code={userCode || context.code}
                onComplete={() => {
                  Alert.alert('Lesson Complete', '+100 XP');
                  router.back();
                }}
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
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderBottomWidth: 1,
    borderColor: THEME.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  trackLabel: {
    color: THEME.indigo,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  headerT: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  scroll: { padding: 20, paddingBottom: 50 },
  bodyText: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 30,
  },
  quizCard: {
    backgroundColor: THEME.surface,
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  qTitle: {
    color: THEME.indigo,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 1,
  },
  qText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  optBtn: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  checkBtn: { alignItems: 'center', padding: 12, marginTop: 10 },
  checkBtnT: { color: THEME.indigo, fontWeight: 'bold', fontSize: 12 },
  actionBtn: {
    backgroundColor: THEME.indigo,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: THEME.indigo,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  actionBtnT: { color: 'white', fontWeight: '900', letterSpacing: 1 },
  ideContainer: { gap: 10 },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
    marginBottom: 5,
  },
  panelTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  editor: {
    backgroundColor: '#050a18',
    color: '#e2e8f0',
    padding: 20,
    borderRadius: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 150,
    borderWidth: 1,
    borderColor: THEME.border,
    textAlignVertical: 'top',
  },
});
