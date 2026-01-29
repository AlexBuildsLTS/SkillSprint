import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Activity,
  Cpu,
  Search,
  ChevronRight,
  MessageSquare,
  Globe,
  Lock,
  Layers,
  Server,
  BarChart3,
  EyeOff,
  CheckCircle2,
  FileCode,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Bento3DCard } from '@/components/ui/Bento3DCard';
import { api } from '@/services/api'; // Ensure this api service has generateTrack exposed
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Consistent Theme with Main Dashboard
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  white: '#ffffff',
  surface: 'rgba(30, 41, 59, 0.5)', // Glassy
  border: 'rgba(255, 255, 255, 0.1)',
  accent: '#facc15',
};

type StatsState = {
  totalUsers: number;
  activeTickets: number;
  premiumUsers: number;
  dbLatency: string;
  totalTracks: number;
  totalLessons: number;
  systemUptime: string;
};

type DraftTrack = {
  id: string;
  title: string;
  created_at: string;
  difficulty: string;
  category: string;
};

type SystemStatus = 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE' | 'SYNCING';

export default function AdminDashboard() {
  const router = useRouter();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('SYNCING');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [drafts, setDrafts] = useState<DraftTrack[]>([]);

  const [stats, setStats] = useState<StatsState>({
    totalUsers: 0,
    activeTickets: 0,
    premiumUsers: 0,
    dbLatency: '0ms',
    totalTracks: 0,
    totalLessons: 0,
    systemUptime: '99.9%',
  });

  const loadStats = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const start = Date.now();

    try {
      const [
        { count: userCount },
        { count: premCount },
        { count: ticketCount },
        { count: trackCount },
        { count: lessonCount },
        { data: draftData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'PREMIUM'),
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']),
        supabase.from('tracks').select('*', { count: 'exact', head: true }),
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
        supabase
          .from('tracks')
          .select('id, title, created_at, difficulty, category')
          .eq('is_published', false)
          .order('created_at', { ascending: false }),
      ]);

      const end = Date.now();
      const latency = end - start;

      setStats((prev) => ({
        ...prev,
        totalUsers: userCount || 0,
        premiumUsers: premCount || 0,
        activeTickets: ticketCount || 0,
        totalTracks: trackCount || 0,
        totalLessons: lessonCount || 0,
        dbLatency: `${latency}ms`,
      }));

      setDrafts((draftData as DraftTrack[]) || []);
      setSystemStatus(latency > 1500 ? 'DEGRADED' : 'OPERATIONAL');
    } catch (error) {
      console.error('[Admin Telemetry Failure]:', error);
      setSystemStatus('MAINTENANCE');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const handlePublish = async (id: string) => {
    const { error } = await supabase
      .from('tracks')
      .update({ is_published: true })
      .eq('id', id);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Track is now live for all users.');
      loadStats(false);
    }
  };

  const handleGenerateTrack = useCallback(async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      // Call the API service which hits the edge function
      await api.generateTrack(topic.trim());
      setTopic('');
      loadStats(false); // Refresh drafts list
      Alert.alert(
        'Synthesis Complete',
        'The new learning architecture has been compiled and is waiting in Drafts.',
      );
    } catch (error: any) {
      Alert.alert(
        'Neural Pipeline Error',
        error.message || 'Generation failed.',
      );
    } finally {
      setIsGenerating(false);
    }
  }, [topic, loadStats]);

  const gridWidth = (SCREEN_WIDTH - 48) / 2; // Adjusted for padding

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollWrapper}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => loadStats(true)}
              tintColor={THEME.indigo}
            />
          }
        >
          {/* HEADER SECTION */}
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.header}
          >
            <View>
              <Text style={styles.headerTitle}>Command Center</Text>
              <View style={styles.infraBadge}>
                <Globe size={12} color={THEME.slate} />
                <Text style={styles.headerSub}>Admin Root Access • v3.0</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusPill,
                systemStatus === 'OPERATIONAL'
                  ? styles.statusOp
                  : styles.statusDeg,
              ]}
            >
              <Activity
                size={12}
                color={
                  systemStatus === 'OPERATIONAL' ? THEME.success : THEME.warning
                }
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      systemStatus === 'OPERATIONAL'
                        ? THEME.success
                        : THEME.warning,
                  },
                ]}
              >
                {systemStatus}
              </Text>
            </View>
          </Animated.View>

          {/* DIAGNOSTICS BAR */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            style={styles.diagnosticBar}
          >
            <View style={styles.diagItem}>
              <Server size={14} color={THEME.indigo} />
              <Text style={styles.diagText}>
                Ping: <Text style={styles.white}>{stats.dbLatency}</Text>
              </Text>
            </View>
            <View style={styles.diagItem}>
              <Lock size={14} color={THEME.success} />
              <Text style={styles.diagText}>SSL: Secure</Text>
            </View>
            <View style={styles.diagItem}>
              <BarChart3 size={14} color={THEME.accent} />
              <Text style={styles.diagText}>Uptime: {stats.systemUptime}</Text>
            </View>
          </Animated.View>

          {/* STATS BENTO GRID */}
          <View style={styles.sectionHeader}>
            <Layers size={18} color={THEME.white} />
            <Text style={styles.sectionLabel}>System Snapshot</Text>
          </View>
          <View style={styles.bentoGrid}>
            <Bento3DCard
              style={{ width: gridWidth }}
              onPress={() => router.push('/(tabs)/admin/users')}
            >
              <View style={styles.bentoInner}>
                <Users size={24} color={THEME.indigo} />
                <Text style={styles.bentoValue}>{stats.totalUsers}</Text>
                <Text style={styles.bentoLabel}>TOTAL NODES</Text>
              </View>
            </Bento3DCard>
            <Bento3DCard
              style={{ width: gridWidth }}
              onPress={() => router.push('/(tabs)/support')}
            >
              <View style={styles.bentoInner}>
                <AlertTriangle size={24} color={THEME.danger} />
                <Text style={styles.bentoValue}>{stats.activeTickets}</Text>
                <Text style={styles.bentoLabel}>ACTIVE ALERTS</Text>
              </View>
            </Bento3DCard>
            <Bento3DCard style={styles.fullBento}>
              <View style={styles.revenueRow}>
                <TrendingUp size={24} color={THEME.success} />
                <View>
                  <Text style={styles.bentoValue}>{stats.premiumUsers}</Text>
                  <Text style={styles.bentoLabel}>PREMIUM SUBSCRIBERS</Text>
                </View>
              </View>
            </Bento3DCard>
          </View>

          {/* NEURAL PIPELINE (GENERATOR) */}
          <View style={styles.sectionHeader}>
            <Cpu size={18} color={THEME.accent} />
            <Text style={styles.sectionLabel}>Neural Track Synthesis</Text>
          </View>
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiStatus}>AI KERNEL: ONLINE</Text>
              <Activity size={14} color={THEME.success} />
            </View>

            <View style={styles.inputBox}>
              <Search size={18} color={THEME.slate} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 'Advanced Kotlin Coroutines'..."
                placeholderTextColor="#64748b"
                value={topic}
                onChangeText={setTopic}
                editable={!isGenerating}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.genBtn,
                (isGenerating || !topic) && styles.disabled,
              ]}
              onPress={handleGenerateTrack}
              disabled={isGenerating || !topic}
            >
              {isGenerating ? (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.btnText}>SYNTHESIZING...</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>INITIATE GENERATION</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* DRAFT INVENTORY MODULE */}
          <View style={styles.sectionHeader}>
            <EyeOff size={18} color={THEME.warning} />
            <Text style={styles.sectionLabel}>
              Draft Inventory ({drafts.length})
            </Text>
          </View>

          <View style={styles.draftContainer}>
            {drafts.length === 0 ? (
              <View style={styles.emptyState}>
                <FileCode size={32} color={THEME.slate} opacity={0.5} />
                <Text style={styles.emptyText}>No pending architectures.</Text>
              </View>
            ) : (
              drafts.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInUp.delay(index * 100)}
                  style={styles.draftCard}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}
                    >
                      <Text style={styles.draftTag}>{item.difficulty}</Text>
                      <Text
                        style={[
                          styles.draftTag,
                          {
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            color: THEME.indigo,
                          },
                        ]}
                      >
                        {item.category || 'GENERAL'}
                      </Text>
                    </View>
                    <Text style={styles.draftTitle}>{item.title}</Text>
                    <Text style={styles.draftSub}>
                      Created {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.publishBtn}
                    onPress={() => handlePublish(item.id)}
                  >
                    <CheckCircle2 size={24} color={THEME.success} />
                  </TouchableOpacity>
                </Animated.View>
              ))
            )}
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <ShieldCheck size={12} color={THEME.slate} />
            <Text style={styles.footerText}>
              SECURE ROOT ACCESS • ENCRYPTED
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ... styles remain mostly consistent but polished for alignment
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: THEME.obsidian },
  scrollWrapper: { padding: 16, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.white,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 11,
    color: THEME.slate,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusOp: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: THEME.success,
  },
  statusDeg: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: THEME.warning,
  },
  statusText: { fontSize: 10, fontWeight: '900' },

  diagnosticBar: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 32,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  diagItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagText: { fontSize: 11, color: THEME.slate, fontWeight: '700' },
  white: { color: 'white' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  bentoInner: { padding: 4, gap: 8 },
  bentoValue: { fontSize: 28, fontWeight: '900', color: THEME.white },
  bentoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.slate,
    textTransform: 'uppercase',
  },
  fullBento: { width: '100%', padding: 16 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },

  aiCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.2)', // Accent border
    marginBottom: 32,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiStatus: {
    color: THEME.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  input: {
    flex: 1,
    height: 50,
    color: THEME.white,
    fontSize: 14,
    marginLeft: 10,
  },

  genBtn: {
    backgroundColor: THEME.indigo,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  disabled: { opacity: 0.5 },

  draftContainer: { gap: 10 },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  draftTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  draftSub: { color: THEME.slate, fontSize: 11, marginTop: 2 },
  draftTag: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.slate,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  publishBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    marginLeft: 12,
  },

  emptyState: { alignItems: 'center', padding: 30, gap: 10 },
  emptyText: { color: THEME.slate, fontSize: 12 },

  footer: {
    alignItems: 'center',
    opacity: 0.4,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
