import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function GuideReaderScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['guide-content', id],
    queryFn: async () => {
      // Fetch Guide Metadata
      const guideRes = await supabase.from('study_guides').select('*').eq('id', id).single();
      if (guideRes.error) throw guideRes.error;

      // Fetch Chapters
      const chapterRes = await supabase
        .from('study_chapters')
        .select('*')
        .eq('guide_id', id)
        .order('sort_order', { ascending: true });
        
      if (chapterRes.error) throw chapterRes.error;

      return { guide: guideRes.data, chapters: chapterRes.data };
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Simple Navigation Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data?.guide.title}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {data?.chapters.map((chapter, index) => (
            <View key={chapter.id} style={styles.chapterBlock}>
              <View style={styles.chapterHeader}>
                <Text style={styles.chapterIndex}>CHAPTER {index + 1}</Text>
                <View style={styles.meta}>
                  <Clock size={12} color="#94a3b8" />
                  <Text style={styles.time}>{chapter.read_time_min} min</Text>
                </View>
              </View>
              
              <Text style={styles.chapterTitle}>{chapter.title}</Text>
              
              {/* In a real app, use a Markdown Renderer here */}
              <Text style={styles.text}>{chapter.content}</Text>
              
              <View style={styles.divider} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { padding: 8 },
  headerTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, flex: 1 },
  content: { padding: 24, paddingBottom: 100 },
  chapterBlock: { marginBottom: 40 },
  chapterHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  chapterIndex: { color: '#6366f1', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { color: '#94a3b8', fontSize: 12 },
  chapterTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  text: { color: '#cbd5e1', fontSize: 16, lineHeight: 26 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 32 },
});