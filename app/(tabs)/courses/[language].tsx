import React, { useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ArrowRight, 
  Book, 
  Server, 
  Box, 
  Code, 
  Database, 
  Terminal, 
  Smartphone,
  Cpu, 
  Globe 
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import Animated, { FadeInDown } from 'react-native-reanimated';

// --- THEME ---
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  white: '#ffffff',
};

// --- ICON MAPPING ---
// Maps the string stored in DB (e.g., 'Server') to the actual component
const ICON_MAP: Record<string, any> = {
  Server: Server,
  Box: Box,
  Code: Code,
  Database: Database,
  Terminal: Terminal,
  Smartphone: Smartphone,
  Cpu: Cpu,
  Globe: Globe,
  Book: Book, // Fallback
};

export default function LanguageGuidesScreen() {
  // 1. Capture the dynamic parameter (e.g., "Java", "Python")
  const { language } = useLocalSearchParams();
  const router = useRouter();

  // Ensure language is a string
  const targetLanguage = Array.isArray(language) ? language[0] : language || '';

  // 2. Fetch Guides for this Language
  const { data: guides, isLoading } = useQuery({
    queryKey: ['study-guides', targetLanguage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_guides')
        .select('*')
        .eq('language', targetLanguage) // Filters by the URL param
        .order('title');
      
      if (error) throw error;
      return data;
    },
    enabled: !!targetLanguage,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.indigo} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Background */}
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {targetLanguage.toUpperCase()} MODULES
          </Text>
          <View style={{ width: 40 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Hero Text */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Available Guides</Text>
            <Text style={styles.heroSub}>
              Select a topic to begin reading.
            </Text>
          </View>

          {/* Guides List */}
          {guides?.map((guide, index) => {
            // Resolve Icon
            const IconComponent = ICON_MAP[guide.icon || 'Book'] || ICON_MAP.Book;
            const accentColor = guide.color_hex || THEME.indigo;

            return (
              <Animated.View 
                key={guide.id}
                entering={FadeInDown.delay(index * 100).springify()}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push(`/courses/guide/${guide.id}`)}
                >
                  <GlassCard style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconBox, { backgroundColor: `${accentColor}20` }]}>
                        <IconComponent size={24} color={accentColor} />
                      </View>
                      
                      {/* Difficulty Badge */}
                      <View style={[styles.badge, { borderColor: `${accentColor}30` }]}>
                        <Text style={[styles.badgeText, { color: accentColor }]}>
                          {guide.difficulty}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.content}>
                      <Text style={styles.title}>{guide.title}</Text>
                      <Text style={styles.desc} numberOfLines={2}>
                        {guide.description}
                      </Text>
                    </View>
                    
                    <View style={styles.footer}>
                      <Text style={styles.readMore}>View Chapters</Text>
                      <ArrowRight size={16} color={THEME.white} />
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
          
          {/* Empty State */}
          {!isLoading && guides?.length === 0 && (
            <View style={styles.emptyContainer}>
              <Book size={48} color={THEME.slate} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyText}>
                No guides available for {targetLanguage} yet.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: THEME.obsidian 
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 20, 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    color: 'white', 
    fontWeight: '900', 
    fontSize: 16, 
    letterSpacing: 1 
  },

  // Content
  scroll: { padding: 24, paddingBottom: 100, gap: 20 },
  hero: { marginBottom: 10 },
  heroTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  heroSub: { color: THEME.slate, fontSize: 14, marginTop: 4 },

  // Card
  card: { padding: 20, borderRadius: 24, minHeight: 160, justifyContent: 'space-between' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    borderWidth: 1 
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  content: { marginTop: 16, marginBottom: 16 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  desc: { color: THEME.slate, fontSize: 14, lineHeight: 20 },
  
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  readMore: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 16 },
  emptyText: { color: THEME.slate, fontSize: 14 },
});