import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Code,
  Cpu,
  Globe,
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
} from 'lucide-react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

import { Bento3DCard } from '@/components/ui/Bento3DCard';
import { GlassCard } from '@/components/ui/GlassCard';

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  emerald: '#10b981',
  rose: '#f43f5e',
  slate: '#94a3b8',
  white: '#ffffff',
};

const LANGUAGES = [
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
    icon: Braces, // "Braces" represents JS syntax better
    color: '#eab308',
    desc: 'Web & Async',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    icon: ShieldAlert, // Represents "Type Safety"
    color: '#3178c6',
    desc: 'Type Safety',
  },
  {
    id: 'rust',
    name: 'Rust',
    icon: Zap, // "Zap" for Blazing Speed/Safety
    color: '#f97316',
    desc: 'Systems & Memory',
  },
  {
    id: 'java',
    name: 'Java',
    icon: Code, // Generic Code fits Java's verbosity
    color: '#ef4444',
    desc: 'Enterprise OOP',
  },
  {
    id: 'cpp',
    name: 'C++',
    icon: Cpu, // CPU for high performance
    color: '#00599c',
    desc: 'High Performance',
  },
  {
    id: 'csharp',
    name: 'C#',
    icon: Hash, // "Hash" literally fits C-Sharp
    color: '#178600',
    desc: '.NET Ecosystem',
  },
  {
    id: 'go',
    name: 'Go',
    icon: Box, // "Box" for Containers/Go Routines
    color: '#06b6d4',
    desc: 'Concurrency',
  },
  {
    id: 'sql',
    name: 'SQL',
    icon: Database,
    color: '#10b981',
    desc: 'Data Querying',
  },
  {
    id: 'swift',
    name: 'Swift',
    icon: Smartphone, // Mobile specific
    color: '#F05138',
    desc: 'Apple & iOS',
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    icon: Smartphone, // Mobile specific
    color: '#7F52FF',
    desc: 'Modern Android',
  },
  {
    id: 'php',
    name: 'PHP',
    icon: Server, // Server specific
    color: '#777BB4',
    desc: 'Server-side Web',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    icon: Gem, // "Gem" fits Ruby perfectly
    color: '#CC342D',
    desc: 'Dev Happiness',
  },
];

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export default function SprintSetupScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Responsive Grid Logic
  const isDesktop = width >= 1024;

  // Columns: 3 on Desktop, 2 on Mobile/Tablet
  const numColumns = isDesktop ? 3 : 2;
  const gap = 12;
  const containerWidth = isDesktop ? 1000 : width - 40;
  const cardWidth = (containerWidth - gap * (numColumns - 1)) / numColumns;

  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [difficulty, setDifficulty] = useState('INTERMEDIATE');

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={THEME.slate} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CONFIGURE SPRINT</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { alignItems: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth: 1000 }}>
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
                    entering={FadeInDown.delay(200 + index * 50)}
                    style={{ width: cardWidth, height: 140 }}
                  >
                    {/* Direct onPress on BentoCard to avoid touch conflicts */}
                    <Bento3DCard
                      style={{ flex: 1 }}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedLang(lang);
                      }}
                    >
                      <View
                        style={[
                          styles.langCard,
                          isSelected && {
                            borderColor: lang.color,
                            backgroundColor: `${lang.color}15`,
                          },
                        ]}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
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

                        <View>
                          <Text
                            style={[
                              styles.langName,
                              isSelected && {
                                color: lang.color,
                                fontWeight: '900',
                              },
                            ]}
                          >
                            {lang.name}
                          </Text>
                          <Text style={styles.langDesc}>{lang.desc}</Text>
                        </View>
                      </View>
                    </Bento3DCard>
                  </Animated.View>
                );
              })}
            </View>

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
                      Haptics.selectionAsync();
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

        <Animated.View entering={SlideInRight.delay(500)} style={styles.footer}>
          <View
            style={{
              width: '100%',
              maxWidth: 1000,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              alignSelf: 'center',
            }}
          >
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
  scrollContent: { padding: 20, paddingBottom: 120 },

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

  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  langCard: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
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
