import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import { ChevronLeft, Award } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { CodeEmulator } from '@/components/lesson/CodeEmulator';
import * as Haptics from 'expo-haptics';

// Fix unused vars warning
const { width } = Dimensions.get('window');

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  success: '#10b981',
  text: '#f8fafc',
  dim: '#94a3b8',
  gold: '#fbbf24'
};

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const lessonId = Array.isArray(id) ? id[0] : id;
  const [step, setStep] = useState<'LEARN' | 'COMPLETE'>('LEARN');

  // 1. Fetch Lesson Data
  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      
      const { data, error } = await supabase
        .from('lessons')
        .select('*, tracks(title)')
        .eq('id', lessonId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 60 
  });

  // 2. Completion Logic
  const completeLesson = useMutation({
    mutationFn: async () => {
      if (!user || !lesson) return;
      
      const { error } = await supabase.from('user_progress').insert({
        user_id: user.id,
        lesson_id: lesson.id,
        is_completed: true,
        score: 100,
        completed_at: new Date().toISOString()
      });

      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['track'] });
      setStep('COMPLETE');
    },
  });

  // 3. SMART CONTENT ADAPTER
  const interactiveContent = useMemo(() => {
    if (!lesson) return null;

    let contentText = "Complete the coding challenge.";
    let mockCode = "";
    let isVisual = false;

    // TypeScript Fix: Optional chaining ?. for safe access
    const title = lesson.title?.toLowerCase() || "";
    // TypeScript Fix: Handle nested relation safely
    const trackTitle = lesson.tracks?.title?.toLowerCase() || "";
    
    isVisual = title.includes('react') || title.includes('native') || trackTitle.includes('react');

    try {
      const raw = lesson.content;
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        contentText = parsed.text || contentText;
        mockCode = parsed.code || "";
      } else if (typeof raw === 'object' && raw !== null) {
        // @ts-ignore
        contentText = raw.text || contentText;
        // @ts-ignore
        mockCode = raw.code || "";
      }
    } catch {
      if (typeof lesson.content === 'string') contentText = lesson.content;
    }

    if (!mockCode) {
      if (isVisual) {
        mockCode = `import React from 'react';\nimport { View } from 'react-native';\n\nexport default function App() {\n  return <View style={{ width: 100, height: 100, backgroundColor: '#6366f1' }} />;\n}`;
      } else if (trackTitle.includes('python')) {
        mockCode = `def system_check():\n    print("Core Online")\n    return True\n\nsystem_check()`;
      } else {
        mockCode = `fn main() {\n    println!("Ready");\n}`;
      }
    }

    return { 
      text: contentText, 
      code: mockCode, 
      isVisual, 
      language: isVisual ? 'javascript' : (trackTitle.includes('python') ? 'python' : 'rust') 
    };
  }, [lesson]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={THEME.indigo} /></View>;
  }

  // TypeScript Fix: Ensure lesson is not null before rendering
  if (error || !interactiveContent || !lesson) {
    return (
      <View style={styles.center}>
        <Text style={{color: 'white'}}>Error loading lesson.</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{color: THEME.indigo, marginTop: 10}}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  // Use variables after null check
  const title = lesson.title;
  const order = lesson.order;
  const reward = lesson.xp_reward;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[THEME.obsidian, '#111827']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerText}>LESSON {order}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Animated.Text entering={FadeInDown} style={styles.title}>
            {title}
          </Animated.Text>

          <Animated.Text entering={FadeInDown.delay(100)} style={styles.body}>
            {interactiveContent.text}
          </Animated.Text>

          {step === 'LEARN' && (
            <Animated.View entering={FadeInDown.delay(200)} style={{ flex: 1, minHeight: 400 }}>
              <CodeEmulator
                language={interactiveContent.language}
                code={interactiveContent.code}
                visualMode={interactiveContent.isVisual}
                onComplete={() => completeLesson.mutate()}
              />
            </Animated.View>
          )}

          {step === 'COMPLETE' && (
            <Animated.View entering={SlideInUp.springify()} style={styles.success}>
              <Award size={64} color={THEME.gold} />
              <Text style={styles.successTitle}>Mission Accomplished!</Text>
              <Text style={styles.xp}>+{reward} XP</Text>
              <TouchableOpacity style={styles.finishBtn} onPress={() => router.back()}>
                <Text style={styles.finishText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.obsidian },
  center: { flex: 1, backgroundColor: THEME.obsidian, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerText: { color: THEME.indigo, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: 'white', marginBottom: 16 },
  body: { fontSize: 16, color: THEME.dim, lineHeight: 26, marginBottom: 20 },
  success: { backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 30, borderRadius: 24, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: THEME.success },
  successTitle: { color: 'white', fontSize: 22, fontWeight: '800', marginTop: 16 },
  xp: { color: THEME.gold, fontSize: 32, fontWeight: '700', marginVertical: 10 },
  finishBtn: { backgroundColor: THEME.success, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' },
  finishText: { color: THEME.obsidian, fontWeight: 'bold' }
});