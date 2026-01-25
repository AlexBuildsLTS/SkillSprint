import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Database,
  Activity,
  Zap,
  Terminal,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Bento3DCard } from '@/components/ui/Bento3DCard';
import { api } from '@/services/api'; // Ensure api.ts has generateTrack

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  white: '#ffffff',
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Generator State
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTickets: 0,
    premiumUsers: 0,
    dbLatency: '0ms',
  });

  const loadStats = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      const { count: premCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'PREMIUM');
      const { count: ticketCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);
      const end = Date.now();

      setStats({
        totalUsers: userCount || 0,
        premiumUsers: premCount || 0,
        activeTickets: ticketCount || 0,
        dbLatency: `${end - start}ms`,
      });
    } catch (error) {
      console.error('Stats Load Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTrack = async () => {
    if (!topic.trim()) {
      Alert.alert(
        'Missing Input',
        'Please enter a topic name (e.g. "Advanced Python")',
      );
      return;
    }

    setIsGenerating(true);
    try {
      // Calls the Edge Function we created
      await api.generateTrack(topic);

      Alert.alert(
        'Success',
        `Track "${topic}" created successfully! Check the Tracks tab.`,
        [
          { text: 'Stay Here', style: 'cancel' },
          { text: 'View Tracks', onPress: () => router.push('/(tabs)/tracks') },
        ],
      );
      setTopic('');
    } catch (error: any) {
      Alert.alert('Generation Failed', error.message || 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: THEME.obsidian }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadStats}
              tintColor={THEME.indigo}
            />
          }
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Command Center</Text>
            <View style={styles.badge}>
              <Activity size={12} color={THEME.success} />
              <Text style={styles.badgeText}>OPERATIONAL</Text>
            </View>
          </View>

          {/* SYSTEM HEALTH */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <View style={styles.healthPill}>
              <Database size={14} color={THEME.indigo} />
              <Text style={styles.healthText}>
                Latency:{' '}
                <Text style={{ color: 'white' }}>{stats.dbLatency}</Text>
              </Text>
            </View>
            <View style={styles.healthPill}>
              <ShieldCheck size={14} color={THEME.success} />
              <Text style={styles.healthText}>
                Auth: <Text style={{ color: 'white' }}>Secure</Text>
              </Text>
            </View>
          </View>

          {/* STATS GRID */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 32,
            }}
          >
            {/* Total Users */}
            <Bento3DCard
              className="w-[48%] bg-slate-900/40 border-white/5"
              onPress={() => router.push('/(tabs)/admin/users')}
            >
              <View style={{ gap: 12 }}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
                  ]}
                >
                  <Users size={20} color={THEME.indigo} />
                </View>
                <View>
                  <Text style={styles.statValue}>{stats.totalUsers}</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                </View>
              </View>
            </Bento3DCard>

            {/* Support Queue */}
            <Bento3DCard
              className="w-[48%] bg-slate-900/40 border-white/5"
              onPress={() => router.push('/(tabs)/support')}
            >
              <View style={{ gap: 12 }}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
                  ]}
                >
                  <AlertTriangle size={20} color={THEME.danger} />
                </View>
                <View>
                  <Text style={styles.statValue}>{stats.activeTickets}</Text>
                  <Text style={styles.statLabel}>Active Tickets</Text>
                </View>
              </View>
            </Bento3DCard>

            {/* Premium Users */}
            <Bento3DCard className="w-full bg-slate-900/40 border-white/5">
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                    ]}
                  >
                    <TrendingUp size={20} color={THEME.success} />
                  </View>
                  <View>
                    <Text style={styles.statValue}>{stats.premiumUsers}</Text>
                    <Text style={styles.statLabel}>Premium Subscribers</Text>
                  </View>
                </View>
              </View>
            </Bento3DCard>
          </View>

          {/* --- NEW SECTION: AI COURSE GENERATOR --- */}
          <Text style={styles.sectionTitle}>Content Operations</Text>

          <View style={styles.generatorCard}>
            <View style={styles.cardHeader}>
              <Zap size={20} color="#FACC15" />
              <Text style={styles.cardTitle}>AI Course Generator</Text>
            </View>

            <Text style={styles.cardDesc}>
              Instant course creation. Enter a topic (e.g. &quot;Rust
              Fundamentals&quot;) and the AI will generate the track and
              lessons.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter topic..."
              placeholderTextColor={THEME.slate}
              value={topic}
              onChangeText={setTopic}
              editable={!isGenerating}
            />

            <TouchableOpacity
              style={[styles.genButton, isGenerating && styles.disabledButton]}
              onPress={handleGenerateTrack}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.btnText}>GENERATING...</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>GENERATE TRACK</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* MANAGEMENT LINKS */}
          <Text style={styles.sectionTitle}>Management</Text>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/admin/users')}
            style={styles.navItem}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    width: 40,
                    height: 40,
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  },
                ]}
              >
                <Users size={20} color={THEME.indigo} />
              </View>
              <View>
                <Text style={styles.navTitle}>User Directory</Text>
                <Text style={styles.navSub}>
                  Manage roles, bans, and profiles
                </Text>
              </View>
            </View>
            <ArrowRight size={20} color="#475569" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '900', color: 'white' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.success,
    marginLeft: 6,
  },
  healthPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  healthText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '600',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 32, fontWeight: '900', color: 'white' },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    marginTop: 32,
    marginBottom: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  navTitle: { fontSize: 16, fontWeight: 'bold', color: 'white' },
  navSub: { fontSize: 12, color: '#64748b' },

  // New Styles for Generator
  generatorCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  cardDesc: {
    color: THEME.slate,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
  },
  genButton: {
    backgroundColor: THEME.indigo,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { opacity: 0.7 },
  btnText: { color: 'white', fontWeight: '800', letterSpacing: 1 },
});
