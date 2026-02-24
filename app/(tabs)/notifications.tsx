/**
 * ============================================================================
 * 🔔 SKILLSPRINT UNIFIED NOTIFICATIONS CENTER
 * ============================================================================
 * Architecture:
 * - Unified Feed: Aggregates System, Ticket, Level, and Message alerts.
 * - Real-Time Sync: Supabase WebSockets listen for new alerts instantly.
 * - Interactive: Mark as read, clear all, and route to specific screens.
 * - Adaptive UI: Clears mobile tab bars and scales for desktop.
 * ============================================================================
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import {
  Bell,
  MessageSquare,
  Ticket,
  Trophy,
  Info,
  CheckCheck,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Database } from '@/database.types';

// ============================================================================
// 🎨 THEME & CONSTANTS
// ============================================================================
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  white: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassSurface: 'rgba(30, 41, 59, 0.4)',
};

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Adaptive Engine
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const TAB_BAR_HEIGHT = isMobile ? 85 : 0;
  const bottomPadding = Math.max(insets.bottom, 20) + TAB_BAR_HEIGHT;

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ============================================================================
  // 🔄 DATA FETCHING & REALTIME
  // ============================================================================
  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    fetchNotifications();

    // ⚡ REALTIME LISTENER: Instantly show new notifications
    if (!user?.id) return;
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationRow, ...prev]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id ? (payload.new as NotificationRow) : n,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    fetchNotifications(true);
  };

  // ============================================================================
  // 📝 ACTIONS
  // ============================================================================
  const markAsRead = async (id: string, type: string) => {
    Haptics.selectionAsync();

    // Optimistic UI Update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    // Background DB Update
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);

    // Smart Routing based on Notification Type
    if (type === 'message' || type === 'SECURE_MESSAGE') {
      router.push('/messages'); // Route to inbox
    } else if (type === 'TICKET_UPDATE') {
      router.push('/support'); // Route to support tickets
    }
  };

  const markAllAsRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id as string)
      .eq('is_read', false);
  };

  const clearAllNotifications = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setNotifications([]);
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user?.id as string);
  };

  // ============================================================================
  // 🎨 UI RENDERERS
  // ============================================================================
  const renderNotification = ({
    item,
    index,
  }: {
    item: NotificationRow;
    index: number;
  }) => {
    // Determine Icon and Color based on type
    let Icon = Info;
    let color = THEME.slate;
    let bgPulse = 'transparent';

    if (item.type === 'message' || item.type === 'SECURE_MESSAGE') {
      Icon = MessageSquare;
      color = THEME.indigo;
      bgPulse = 'rgba(99, 102, 241, 0.1)';
    } else if (item.type === 'TICKET_UPDATE') {
      Icon = Ticket;
      color = THEME.warning;
      bgPulse = 'rgba(245, 158, 11, 0.1)';
    } else if (item.type === 'LEVEL_UP') {
      Icon = Trophy;
      color = THEME.success;
      bgPulse = 'rgba(16, 185, 129, 0.1)';
    }

    const isUnread = !item.is_read;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 40)}
        layout={Layout.springify()}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => markAsRead(item.id, item.type)}
          style={[
            styles.notificationCard,
            isUnread && { backgroundColor: bgPulse, borderColor: color },
          ]}
        >
          <View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}>
            <Icon size={22} color={color} />
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          <View style={styles.textContent}>
            <Text style={[styles.title, isUnread && { color: THEME.white }]}>
              {item.title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.timeLabel}>
              {new Date(item.created_at || '').toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <ChevronRight
            size={20}
            color={THEME.slate}
            style={{ opacity: 0.5 }}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ============================================================================
  // 🖥️ MAIN RENDER
  // ============================================================================
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Bell size={32} color={THEME.indigo} />
            <Text style={styles.headerTitle}>Alerts</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={markAllAsRead} style={styles.actionBtn}>
              <CheckCheck size={20} color={THEME.success} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearAllNotifications}
              style={[styles.actionBtn, { marginLeft: 12 }]}
            >
              <Trash2 size={20} color={THEME.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- NOTIFICATIONS LIST --- */}
        {isLoading ? (
          <ActivityIndicator
            color={THEME.indigo}
            style={{ flex: 1 }}
            size="large"
          />
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: bottomPadding },
            ]}
            style={isMobile ? {} : styles.desktopContainer}
            showsHorizontalScrollIndicator={false}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={THEME.indigo}
              />
            }
            ListHeaderComponent={
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
              </View>
            }
            ListEmptyComponent={
              <Animated.View entering={FadeInDown} style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                  <Bell size={32} color={THEME.slate} />
                </View>
                <Text style={styles.emptyTitle}>All Caught Up</Text>
                <Text style={styles.emptySub}>
                  You have no pending alerts or system notifications.
                </Text>
              </Animated.View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// 🎨 STYLES
// ============================================================================
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },

  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.white,
    marginLeft: 12,
    letterSpacing: -0.5,
  },

  headerActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },

  // List
  listContainer: { paddingHorizontal: 16 },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: THEME.glassSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },

  // Icon
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.danger,
    borderWidth: 2,
    borderColor: THEME.obsidian,
  },

  // Content
  textContent: { flex: 1, marginLeft: 16, marginRight: 8 },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.slate,
    marginBottom: 4,
  },
  message: { fontSize: 14, color: THEME.slate, lineHeight: 20 },
  timeLabel: {
    fontSize: 11,
    color: THEME.slate,
    fontWeight: 'bold',
    marginTop: 8,
    opacity: 0.7,
  },
  // Desktop Optimization
  desktopContainer: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  desktopContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  desktopHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.white,
    marginBottom: 12,
  },
  emptySub: {
    fontSize: 14,
    color: THEME.slate,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.slate,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
});
