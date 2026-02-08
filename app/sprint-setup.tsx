import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Code,
  Cpu,
  Database,
  Terminal,
  Zap,
  ChevronLeft,
  Play,
  ShieldAlert,
  Check,
  Smartphone,
  Server,
  Gem,
  Braces,
  Hash,
  Box,
  Layers,
  BarChart3,
  Command,
} from 'lucide-react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

import { Bento3DCard } from '@/components/ui/Bento3DCard';
import { GlassCard } from '@/components/ui/GlassCard';

// ────────────────────────────────────────────────────────────────────────
// 🎨 THEME & CONSTANTS
// ────────────────────────────────────────────────────────────────────────

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  emerald: '#10b981',
  rose: '#f43f5e',
  slate: '#94a3b8',
  white: '#ffffff',
} as const;

type Language = {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  desc: string;
};

// [CRITICAL UPDATE] Added Dart, R, Bash to the list
const LANGUAGES: Language[] = [
  {
    id: 'python',
    name: 'Python',
    icon: Terminal,
    color: '#3b82f6',
    desc: 'Data & Scripting',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: Braces,
    color: '#eab308',
    desc: 'Web & Async',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    icon: ShieldAlert,
    color: '#3178c6',
    desc: 'Type Safety',
  },
  {
    id: 'rust',
    name: 'Rust',
    icon: Zap,
    color: '#f97316',
    desc: 'Systems & Memory',
  },
  {
    id: 'go',
    name: 'Go',
    icon: Box,
    color: '#06b6d4',
    desc: 'Concurrency',
  },
  {
    id: 'java',
    name: 'Java',
    icon: Code,
    color: '#ef4444',
    desc: 'Enterprise OOP',
  },
  {
    id: 'cpp',
    name: 'C++',
    icon: Cpu,
    color: '#00599c',
    desc: 'High Performance',
  },
  {
    id: 'csharp',
    name: 'C#',
    icon: Hash,
    color: '#178600',
    desc: '.NET Ecosystem',
  },
  {
    id: 'swift',
    name: 'Swift',
    icon: Smartphone,
    color: '#F05138',
    desc: 'Apple & iOS',
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    icon: Smartphone,
    color: '#7F52FF',
    desc: 'Modern Android',
  },
  {
    id: 'dart',
    name: 'Dart',
    icon: Layers,
    color: '#00B4AB',
    desc: 'Flutter Apps',
  },
  {
    id: 'sql',
    name: 'SQL',
    icon: Database,
    color: '#10b981',
    desc: 'Data Querying',
  },
  {
    id: 'r',
    name: 'R',
    icon: BarChart3,
    color: '#276DC3',
    desc: 'Data Science',
  },
  {
    id: 'php',
    name: 'PHP',
    icon: Server,
    color: '#777BB4',
    desc: 'Server-side Web',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    icon: Gem,
    color: '#CC342D',
    desc: 'Dev Happiness',
  },
  {
    id: 'bash',
    name: 'Bash',
    icon: Command,
    color: '#4EAA25',
    desc: 'Shell Scripting',
  },
];

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

// ────────────────────────────────────────────────────────────────────────
// 🚀 COMPONENT: SPRINT SETUP SCREEN
// ────────────────────────────────────────────────────────────────────────

export default function SprintSetupScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // 📐 LAYOUT CALCULATION (Responsive Grid)
  const { cardWidth, gap } = useMemo(() => {
    const isDesktop = width >= 1024;
    const isTablet = width >= 768;

    // Grid Logic:
    // Desktop (>1024px): 4 Columns
    // Tablet (>768px): 3 Columns
    // Mobile: 2 Columns
    const columns = isDesktop ? 4 : isTablet ? 3 : 2;

    const gridGap = 12;
    // Padding logic matches styles.scrollContent (20px left + 20px right)
    const paddingHorizontal = 40;

    // Max Width constraint for large screens
    const maxWidth = 1200;
    const effectiveWidth = Math.min(width, maxWidth) - paddingHorizontal;

    // Calculate precise width to prevent wrapping issues
    const calculatedCardWidth = Math.floor(
      (effectiveWidth - gridGap * (columns - 1)) / columns,
    );

    return {
      cardWidth: calculatedCardWidth,
      gap: gridGap,
    };
  }, [width]);

  // State
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('INTERMEDIATE');

  const handleStart = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.push({
      pathname: '/sprint',
      params: {
        topic: selectedLang.name,
        difficulty: difficulty,
      },
    });
  };

  return (
    <View style={styles.root}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={THEME.slate} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CONFIGURE SPRINT</Text>
        </View>

        {/* Main Content */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { alignItems: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Max Width Container for Desktop Alignment */}
          <View style={{ width: '100%', maxWidth: 1200 }}>
            <Animated.View
              entering={FadeInDown.delay(100)}
              style={styles.heroSection}
            >
              <Text style={styles.heroTitle}>Select Protocol</Text>
              <Text style={styles.heroSub}>
                Choose your language vector and complexity level.
              </Text>
            </Animated.View>

            <Text style={styles.sectionLabel}>TARGET LANGUAGE</Text>

            {/* LANGUAGE GRID */}
            <View style={[styles.grid, { gap }]}>
              {LANGUAGES.map((lang, index) => {
                const isSelected = selectedLang.id === lang.id;
                const Icon = lang.icon;

                return (
                  <Animated.View
                    key={lang.id}
                    entering={FadeInDown.delay(200 + index * 30).springify()}
                    style={{ width: cardWidth, height: 140 }}
                  >
                    <Bento3DCard
                      style={{ flex: 1 }}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync();
                        setSelectedLang(lang);
                      }}
                    >
                      <View
                        style={[
                          styles.langCard,
                          isSelected && {
                            borderColor: lang.color,
                            backgroundColor: `${lang.color}15`, // ~8% opacity
                          },
                        ]}
                      >
                        {/* Header: Icon + Checkbox */}
                        <View style={styles.cardHeader}>
                          <View
                            style={[
                              styles.iconBox,
                              { backgroundColor: `${lang.color}20` },
                            ]}
                          >
                            <Icon size={24} color={lang.color} />
                          </View>
                          {isSelected && (
                            <View
                              style={[
                                styles.checkBadge,
                                { backgroundColor: lang.color },
                              ]}
                            >
                              <Check size={10} color="white" strokeWidth={4} />
                            </View>
                          )}
                        </View>

                        {/* Footer: Name + Desc */}
                        <View>
                          <Text
                            style={[
                              styles.langName,
                              isSelected && {
                                color: lang.color,
                                fontWeight: '900',
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {lang.name}
                          </Text>
                          <Text style={styles.langDesc} numberOfLines={1}>
                            {lang.desc}
                          </Text>
                        </View>
                      </View>
                    </Bento3DCard>
                  </Animated.View>
                );
              })}
            </View>

            {/* DIFFICULTY SELECTION */}
            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>
              COMPLEXITY LEVEL
            </Text>
            <GlassCard style={styles.diffContainer}>
              {DIFFICULTIES.map((diff) => {
                const active = difficulty === diff;
                return (
                  <TouchableOpacity
                    key={diff}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      setDifficulty(diff);
                    }}
                    style={[styles.diffBtn, active && styles.diffBtnActive]}
                  >
                    <Text
                      style={[styles.diffText, active && styles.diffTextActive]}
                    >
                      {diff}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </GlassCard>
          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <Animated.View entering={SlideInRight.delay(500)} style={styles.footer}>
          <View style={styles.footerInner}>
            <View style={styles.footerInfo}>
              <Text style={styles.footerLabel}>POTENTIAL REWARD</Text>
              <Text style={styles.xpText}>
                {difficulty === 'ADVANCED'
                  ? '500 XP'
                  : difficulty === 'INTERMEDIATE'
                    ? '300 XP'
                    : '150 XP'}
              </Text>
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <LinearGradient
                colors={[THEME.indigo, THEME.violet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startGradient}
              >
                <Text style={styles.startText}>INITIALIZE SPRINT</Text>
                <Play size={16} color="white" fill="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 🖌️ STYLES
// ────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Space for footer
  },

  heroSection: { marginBottom: 30 },
  heroTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSub: { color: THEME.slate, fontSize: 16 },

  sectionLabel: {
    color: THEME.indigo,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 15,
    marginTop: 10,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  langCard: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  langDesc: { color: THEME.slate, fontSize: 11, fontWeight: '500' },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  diffContainer: {
    flexDirection: 'row',
    padding: 6,
    borderRadius: 18,
    gap: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },
  diffBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  diffText: { color: THEME.slate, fontSize: 12, fontWeight: '700' },
  diffTextActive: { color: 'white' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerInner: {
    width: '100%',
    maxWidth: 1200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',
  },
  footerInfo: { gap: 4 },
  footerLabel: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  xpText: { color: THEME.emerald, fontSize: 20, fontWeight: '900' },

  startBtn: { borderRadius: 16, overflow: 'hidden' },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  startText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
