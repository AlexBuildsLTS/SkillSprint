/**
 * ============================================================================
 * SCREEN: ADMIN COMMAND CENTER
 * ============================================================================
 * The central hub for platform metrics, AI generation, and content moderation.
 * * FEATURES:
 * - Real-time Database Stats (Users, Tickets, Latency)
 * - AI Track Generation Interface (Neural Pipeline)
 * - Draft Management for Content Approval
 * - System Health Monitoring
 * * PATH: app/(tabs)/admin/index.tsx
 * ============================================================================
 */

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
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// ICONS
import {
  Users,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Activity,
  Cpu,
  Search,
  Globe,
  Lock,
  Layers,
  Server,
  BarChart3,
  EyeOff,
  CheckCircle2,
  FileCode,
} from 'lucide-react-native';

// SERVICES & COMPONENTS
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import { Bento3DCard } from '@/components/ui/Bento3DCard'; // 3D Tilt Effect
import { GlassCard } from '@/components/ui/GlassCard'; // Static Glass Effect

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- THEME CONFIGURATION ---
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  white: '#ffffff',
  accent: '#facc15', // Yellow for AI/Attention
  border: 'rgba(255, 255, 255, 0.08)',
};

// --- TYPES ---
type StatsState = {
  totalUsers: number;
  activeTickets: number;
  premiumUsers: number;
  dbLatency: string;
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
    systemUptime: '99.9%',
  });

  // --- DATA FETCHING ---
  const loadStats = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const start = Date.now();

    try {
      // Parallel fetch for dashboard metrics
      const [
        { count: userCount },
        { count: premCount },
        { count: ticketCount },
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
        supabase
          .from('tracks')
          .select('id, title, created_at, difficulty, category')
          .eq('is_published', false) // Only drafts
          .order('created_at', { ascending: false }),
      ]);

      const end = Date.now();
      const latency = end - start;

      setStats({
        totalUsers: userCount || 0,
        premiumUsers: premCount || 0,
        activeTickets: ticketCount || 0,
        dbLatency: `${latency}ms`,
        systemUptime: '99.9%',
      });

      setDrafts((draftData as DraftTrack[]) || []);
      setSystemStatus(latency > 1500 ? 'DEGRADED' : 'OPERATIONAL');
    } catch (error) {
      console.error('[Admin Telemetry Failure]:', error);
      setSystemStatus('MAINTENANCE');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  // --- ACTIONS ---

  const handlePublish = async (id: string) => {
    if (Platform.OS !== 'web')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const { error } = await supabase
      .from('tracks')
      .update({ is_published: true })
      .eq('id', id);

    if (error) Alert.alert('Error', error.message);
    else {
      loadStats(false); // Refresh list without full spinner
    }
  };

  const handleGenerateTrack = useCallback(async () => {
    if (!topic.trim()) return;

    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsGenerating(true);

    try {
      // 1. Call Edge Function / API Service
      await api.generateTrack(topic.trim());

      // 2. Reset UI
      setTopic('');
      loadStats(false);

      Alert.alert(
        'Neural Synthesis Complete',
        'Architecture compiled. Review content in Draft Inventory.',
      );
    } catch (error: any) {
      Alert.alert('Generation Failed', error.message || 'AI Kernel Timeout.');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, loadStats]);

  // Dynamic Grid sizing
  const CARD_GAP = 12;
  const PADDING = 32; // 16 left + 16 right
  const gridWidth = (SCREEN_WIDTH - PADDING - CARD_GAP) / 2;

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

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
          {/* --- HEADER --- */}
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.header}
          >
            <View>
              <Text style={styles.headerTitle}>Command Center</Text>
              <View style={styles.infraBadge}>
                <Globe size={12} color={THEME.slate} />
                <Text style={styles.headerSub}>ADMIN ROOT ACCESS • v3.0</Text>
              </View>
            </View>

            {/* Status Pill */}
            <View
              style={[
                styles.statusPill,
                systemStatus === 'OPERATIONAL'
                  ? styles.statusOp
                  : styles.statusDeg,
              ]}
            >
              <Activity
                size={10}
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

          {/* --- DIAGNOSTICS BAR --- */}
          <GlassCard style={styles.diagnosticBar} intensity="light">
            <View style={styles.diagItem}>
              <Server size={14} color={THEME.indigo} />
              <Text style={styles.diagText}>
                Ping: <Text style={{ color: 'white' }}>{stats.dbLatency}</Text>
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
          </GlassCard>

          {/* --- SYSTEM SNAPSHOT (BENTO GRID) --- */}
          <View style={styles.sectionHeader}>
            <Layers size={16} color={THEME.white} />
            <Text style={styles.sectionLabel}>SYSTEM SNAPSHOT</Text>
          </View>

          <View style={styles.bentoGrid}>
            {/* Card 1: Users */}
            <Bento3DCard
              style={{ width: gridWidth, height: 120 }}
              onPress={() => router.push('/(tabs)/admin/users')}
            >
              <View style={styles.bentoInner}>
                <View style={styles.iconCircle}>
                  <Users size={20} color={THEME.indigo} />
                </View>
                <Text style={styles.bentoValue}>{stats.totalUsers}</Text>
                <Text style={styles.bentoLabel}>ACCOUNTS</Text>
              </View>
            </Bento3DCard>

            {/* Card 2: Alerts */}
            <Bento3DCard
              style={{ width: gridWidth, height: 120 }}
              onPress={() => router.push('/(tabs)/support')}
            >
              <View style={styles.bentoInner}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                  ]}
                >
                  <AlertTriangle size={20} color={THEME.danger} />
                </View>
                <Text style={styles.bentoValue}>{stats.activeTickets}</Text>
                <Text style={styles.bentoLabel}>ACTIVE ALERTS</Text>
              </View>
            </Bento3DCard>

            {/* Card 3: Revenue (Full Width) */}
            <Bento3DCard style={{ width: gridWidth, height: 120 }}>
              <View style={styles.revenueRow}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <TrendingUp size={20} color={THEME.success} />
                    <Text style={styles.bentoValue}>{stats.premiumUsers}</Text>
                  </View>
                  <Text style={styles.bentoLabel}>PREMIUM SUBSCRIBERS</Text>
                </View>
                <BarChart3 size={0} color={THEME.success} opacity={0.2} />
              </View>
            </Bento3DCard>
          </View>

          {/* --- NEURAL TRACK SYNTHESIS (AI) --- */}
          <View style={styles.sectionHeader}>
            <Cpu size={16} color={THEME.accent} />
            <Text style={styles.sectionLabel}>NEURAL TRACK SYNTHESIS</Text>
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
                returnKeyType="go"
                onSubmitEditing={handleGenerateTrack}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.genBtn,
                (isGenerating || !topic) && styles.disabled,
              ]}
              onPress={handleGenerateTrack}
              disabled={isGenerating || !topic}
              activeOpacity={0.8}
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

          {/* --- DRAFT INVENTORY --- */}
          <View style={styles.sectionHeader}>
            <EyeOff size={16} color={THEME.warning} />
            <Text style={styles.sectionLabel}>
              DRAFT INVENTORY ({drafts.length})
            </Text>
          </View>

          <View style={styles.draftContainer}>
            {drafts.length === 0 ? (
              <View style={styles.emptyState}>
                <FileCode size={32} color={THEME.slate} opacity={0.3} />
                <Text style={styles.emptyText}>No pending architectures.</Text>
              </View>
            ) : (
              drafts.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInUp.delay(index * 100)}
                >
                  <GlassCard style={styles.draftCard}>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>{item.difficulty}</Text>
                        </View>
                        {item.category && (
                          <View
                            style={[
                              styles.tag,
                              { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                            ]}
                          >
                            <Text
                              style={[styles.tagText, { color: THEME.indigo }]}
                            >
                              {item.category}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.draftTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.draftSub}>
                        Created {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.publishBtn}
                      onPress={() => handlePublish(item.id)}
                    >
                      <CheckCircle2 size={20} color={THEME.success} />
                    </TouchableOpacity>
                  </GlassCard>
                </Animated.View>
              ))
            )}
          </View>

          {/* --- FOOTER --- */}
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

// --- STYLES ---
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: THEME.obsidian },
  scrollWrapper: { padding: 16, paddingBottom: 100 },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: THEME.white },
  headerSub: {
    fontSize: 10,
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
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  // DIAGNOSTICS
  diagnosticBar: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    marginBottom: 30,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  diagItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  diagText: { fontSize: 11, color: THEME.slate, fontWeight: '600' },

  // SECTIONS
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.white,
    letterSpacing: 1,
  },

  // BENTO GRID
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  bentoInner: { padding: 16, height: '100%', justifyContent: 'space-between' },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bentoValue: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.white,
    lineHeight: 32,
  },
  bentoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.slate,
    letterSpacing: 0.5,
  },
  revenueRow: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },

  // AI CARD
  aiCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.15)',
    marginBottom: 32,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiStatus: {
    color: THEME.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  input: {
    flex: 1,
    height: 48,
    color: THEME.white,
    fontSize: 14,
    marginLeft: 10,
  },
  genBtn: {
    backgroundColor: THEME.indigo,
    height: 48,
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
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  disabled: { opacity: 0.5 },

  // DRAFTS
  draftContainer: { gap: 12 },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  draftTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  draftSub: { color: THEME.slate, fontSize: 11 },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { fontSize: 9, fontWeight: '800', color: THEME.slate },
  publishBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    marginLeft: 12,
  },
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: THEME.slate, fontSize: 12 },

  // FOOTER
  footer: {
    alignItems: 'center',
    opacity: 0.4,
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    color: THEME.slate,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
