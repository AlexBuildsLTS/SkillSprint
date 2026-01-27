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
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Activity,
  Zap,
  BookOpen,
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
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Bento3DCard } from '@/components/ui/Bento3DCard';
import { api } from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  white: '#ffffff',
  surface: '#0f172a',
  border: 'rgba(255, 255, 255, 0.08)',
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

  /**
   * --- MODULE: TELEMETRY ENGINE ---
   * Hoisted to top to prevent "used before declaration" errors.
   */
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
          .select('id, title, created_at, difficulty')
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

  /**
   * --- MODULE: REAL-TIME ENGINE ---
   */
  useEffect(() => {
    const channel = supabase
      .channel('admin-master-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracks' },
        () => loadStats(false),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => loadStats(false),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStats]);

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
    else loadStats(false);
  };

  const handleGenerateTrack = useCallback(async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const result = await api.generateTrack(topic.trim());
      if (result.success) {
        setTopic('');
        loadStats(false);
        Alert.alert(
          'Synthesis Complete',
          'The new architecture is in the Drafts section.',
        );
      }
    } catch (error: any) {
      Alert.alert('Neural Pipeline Error', error.message);
    } finally {
      setIsGenerating(false);
    }
  }, [topic, loadStats]);

  const gridWidth = useMemo(() => (SCREEN_WIDTH - 52) / 2, []);

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
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Command Center</Text>
              <View style={styles.infraBadge}>
                <Globe size={10} color={THEME.slate} />
                <Text style={styles.headerSub}>
                  Infrastructure v2.43 • Root
                </Text>
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
          </View>

          {/* DIAGNOSTICS BAR */}
          <View style={styles.diagnosticBar}>
            <View style={styles.diagItem}>
              <Server size={14} color={THEME.indigo} />
              <Text style={styles.diagText}>
                Ping: <Text style={styles.white}>{stats.dbLatency}</Text>
              </Text>
            </View>
            <View style={styles.diagItem}>
              <Lock size={14} color={THEME.success} />
              <Text style={styles.diagText}>
                SSL: <Text style={styles.white}>Active</Text>
              </Text>
            </View>
            <View style={styles.diagItem}>
              <BarChart3 size={14} color={THEME.accent} />
              <Text style={styles.diagText}>
                Uptime: <Text style={styles.white}>{stats.systemUptime}</Text>
              </Text>
            </View>
          </View>

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
            <Text style={styles.sectionLabel}>Neural Pipeline Engine</Text>
          </View>
          <View style={styles.aiCard}>
            <Text style={styles.aiStatus}>KERNEL: ONLINE</Text>
            <View style={styles.inputBox}>
              <Search size={18} color={THEME.slate} />
              <TextInput
                style={styles.input}
                placeholder="Specify topic architecture..."
                placeholderTextColor="#475569"
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
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>INITIATE SYNTHESIS</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* DRAFT INVENTORY MODULE */}
          <View style={styles.sectionHeader}>
            <EyeOff size={18} color={THEME.warning} />
            <Text style={styles.sectionLabel}>Draft Inventory</Text>
          </View>
          <View style={styles.draftContainer}>
            {drafts.length === 0 ? (
              <Text style={styles.emptyText}>No pending architectures.</Text>
            ) : (
              drafts.map((item) => (
                <View key={item.id} style={styles.draftCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.draftTitle}>{item.title}</Text>
                    <Text style={styles.draftSub}>
                      {item.difficulty} • Created{' '}
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.publishBtn}
                    onPress={() => handlePublish(item.id)}
                  >
                    <CheckCircle2 size={20} color={THEME.success} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* MANAGEMENT NAVIGATION */}
          <View style={styles.sectionHeader}>
            <ShieldCheck size={18} color={THEME.success} />
            <Text style={styles.sectionLabel}>Management Interface</Text>
          </View>
          <View style={styles.navStack}>
            <NavRow
              icon={<Users size={20} color={THEME.indigo} />}
              label="Identity & Access"
              sub="Roles & Security"
              onPress={() => router.push('/(tabs)/admin/users')}
            />
            <NavRow
              icon={<BookOpen size={20} color={THEME.success} />}
              label="Repository"
              sub={`${stats.totalTracks} Tracks Active`}
              onPress={() => router.push('/(tabs)/tracks')}
            />
            <NavRow
              icon={<MessageSquare size={20} color={THEME.warning} />}
              label="Support Hub"
              sub="Priority Tickets"
              onPress={() => router.push('/(tabs)/support')}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>SECURE CORE ACCESS ONLY</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function NavRow({ icon, label, sub, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.navRow}>
      <View style={styles.navLeft}>
        <View style={styles.navIconBg}>{icon}</View>
        <View>
          <Text style={styles.navLabel}>{label}</Text>
          <Text style={styles.navSub}>{sub}</Text>
        </View>
      </View>
      <ChevronRight size={18} color="#334155" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: THEME.obsidian },
  scrollWrapper: { padding: 20, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: { fontSize: 32, fontWeight: '900', color: THEME.white },
  headerSub: { fontSize: 11, color: THEME.slate, fontWeight: 'bold' },
  infraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusOp: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: THEME.success,
  },
  statusDeg: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: THEME.warning,
  },
  statusText: { fontSize: 10, fontWeight: '900', marginLeft: 6 },
  diagnosticBar: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 32,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  diagItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagText: { fontSize: 11, color: THEME.slate, fontWeight: 'bold' },
  white: { color: 'white' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.white,
    textTransform: 'uppercase',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  bentoInner: { padding: 4, gap: 12 },
  bentoValue: { fontSize: 28, fontWeight: '900', color: THEME.white },
  bentoLabel: { fontSize: 10, fontWeight: '800', color: THEME.slate },
  fullBento: { width: '100%', padding: 20 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  aiCard: {
    backgroundColor: '#0f172a',
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 32,
  },
  aiStatus: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2,6,23,0.8)',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: { flex: 1, height: 56, color: THEME.white, fontSize: 15 },
  genBtn: {
    backgroundColor: THEME.indigo,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: 'white', fontWeight: '900' },
  disabled: { opacity: 0.3 },
  draftContainer: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 32,
  },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    marginBottom: 8,
  },
  draftTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  draftSub: { color: THEME.slate, fontSize: 12, marginTop: 2 },
  publishBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: THEME.slate, textAlign: 'center', padding: 20 },
  navStack: { gap: 10 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surface,
    padding: 18,
    borderRadius: 20,
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: { fontSize: 16, fontWeight: 'bold', color: THEME.white },
  navSub: { fontSize: 12, color: THEME.slate },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    opacity: 0.3,
    paddingBottom: 40,
  },
  footerText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
  },
});
