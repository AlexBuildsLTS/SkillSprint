import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Code,
  Terminal,
  Database,
  Smartphone,
  Server,
  Cpu,
  Globe,
  BookOpen,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Bento3DCard } from '@/components/ui/Bento3DCard';

// THEME
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  white: '#ffffff',
};

// Static List of Supported Languages (Categories)
const CATEGORIES = [
  {
    id: 'Java',
    name: 'Java Ecosystem',
    icon: Server,
    color: '#ef4444',
    count: '12 Guides',
  },
  {
    id: 'Python',
    name: 'Python & AI',
    icon: Terminal,
    color: '#3b82f6',
    count: '8 Guides',
  },
  {
    id: 'JavaScript',
    name: 'Web Modern',
    icon: Globe,
    color: '#eab308',
    count: '15 Guides',
  },
  {
    id: 'Rust',
    name: 'Systems Core',
    icon: Cpu,
    color: '#f97316',
    count: '5 Guides',
  },
  {
    id: 'SQL',
    name: 'Data Mastery',
    icon: Database,
    color: '#10b981',
    count: '6 Guides',
  },
  {
    id: 'Mobile',
    name: 'React Native',
    icon: Smartphone,
    color: '#8b5cf6',
    count: '9 Guides',
  },
];

export default function CoursesCatalogScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <BookOpen size={24} color={THEME.white} />
          <Text style={styles.headerTitle}>KNOWLEDGE BASE</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Select a Technology</Text>
            <Text style={styles.heroSub}>
              Deep dive into specific frameworks, tools, and concepts.
            </Text>
          </View>

          <View style={styles.grid}>
            {CATEGORIES.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <Animated.View
                  key={cat.id}
                  entering={FadeInDown.delay(index * 100).springify()}
                  style={styles.cardContainer}
                >
                  <Bento3DCard
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      // Navigate to the dynamic language page
                      router.push(`/courses/${cat.id}`);
                    }}
                  >
                    <View
                      style={[styles.card, { borderColor: cat.color + '40' }]}
                    >
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: cat.color + '20' },
                        ]}
                      >
                        <Icon size={28} color={cat.color} />
                      </View>
                      <View>
                        <Text style={styles.cardName}>{cat.name}</Text>
                        <Text style={styles.cardCount}>{cat.count}</Text>
                      </View>
                    </View>
                  </Bento3DCard>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scroll: { padding: 24, paddingBottom: 100 },
  hero: { marginBottom: 32 },
  heroTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSub: { color: THEME.slate, fontSize: 16, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  cardContainer: { width: '47%', height: 160 },
  card: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderRadius: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardCount: { color: THEME.slate, fontSize: 12, fontWeight: '600' },
});
