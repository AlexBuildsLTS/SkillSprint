/**
 * ============================================================================
 * 🔔 SKILLSPRINT UNIFIED NOTIFICATIONS CENTER - AAAA+ TIER v9.2
 * ============================================================================
 * Architecture:
 * - True Disappearance: UI aggressively filters out any notification marked as read.
 * - Database Level Filtering: The fetch query strictly requests ONLY unread items.
 * - Anti-Placebo Engine: Actions use `.select()` to verify DB commits and rollback if failed.
 * ============================================================================
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Modal,
  Pressable,
  Alert,
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
  SlideOutLeft,
  ZoomIn,
} from 'react-native-reanimated';
import {
  Bell,
  MessageSquare,
  Ticket,
  Trophy,
  Info,
  CheckCheck,
  Trash2,
  Filter,
  MoreVertical,
  ChevronRight,
} from 'lucide-react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Database } from '@/supabase/database.types';

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
type FilterType = 'ALL' | 'MESSAGES' | 'SYSTEM' | 'SUPPORT';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const TAB_BAR_HEIGHT = isMobile ? 85 : 0;
  const bottomPadding = Math.max(insets.bottom, 20) + TAB_BAR_HEIGHT;

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [selectedNotice, setSelectedNotice] = useState<NotificationRow | null>(
    null,
  );

  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_read', false) // 🛡️ CRITICAL FIX: Only fetch UNREAD items from the database
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
          if (payload.new.is_read) {
            // 🛡️ CRITICAL FIX: If a notification gets marked as read from another device, instantly remove it here
            setNotifications((prev) =>
              prev.filter((n) => n.id !== payload.new.id),
            );
          } else {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id ? (payload.new as NotificationRow) : n,
              ),
            );
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== payload.old.id),
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

  const filteredData = useMemo(() => {
    switch (activeFilter) {
      case 'MESSAGES':
        return notifications.filter(
          (n) => n.type === 'message' || n.type === 'SECURE_MESSAGE',
        );
      case 'SUPPORT':
        return notifications.filter((n) => n.type === 'TICKET_UPDATE');
      case 'SYSTEM':
        return notifications.filter(
          (n) =>
            n.type !== 'message' &&
            n.type !== 'SECURE_MESSAGE' &&
            n.type !== 'TICKET_UPDATE',
        );
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const unreadCount = notifications.length; // Because the array now ONLY contains unread items.

  // ============================================================================
  // 📝 ACTIONS: INSTANT DISAPPEARANCE & DB VERIFICATION
  // ============================================================================
  const handleInteract = async (item: NotificationRow) => {
    Haptics.selectionAsync();

    if (!item.is_read) {
      // 1. INSTANT UI DISAPPEARANCE
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));

      // 2. Database confirmation
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', item.id)
        .select();

      if (error || !data || data.length === 0) {
        // Rollback: put it back in the list if DB fails
        setNotifications((prev) =>
          [item, ...prev].sort(
            (a, b) =>
              new Date(b.created_at!).getTime() -
              new Date(a.created_at!).getTime(),
          ),
        );
        if (Platform.OS === 'web')
          window.alert('Database Security blocked marking this as read.');
        else
          Alert.alert(
            'Action Failed',
            'Database Security blocked marking this as read.',
          );
      }
    }

    if (item.type === 'message' || item.type === 'SECURE_MESSAGE')
      router.push('/messages');
    else if (item.type === 'TICKET_UPDATE') router.push('/support');
    else if (item.type === 'LEVEL_UP') router.push('/settings/profile');
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const backup = [...notifications];

    // 1. INSTANT UI DISAPPEARANCE
    setNotifications([]);

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id as string)
      .eq('is_read', false)
      .select();

    if (error || !data || data.length === 0) {
      // Rollback
      setNotifications(backup);
      if (Platform.OS === 'web')
        window.alert('Sync Error: Could not mark all as read on the server.');
      else
        Alert.alert('Sync Error', 'Could not mark all as read on the server.');
    }
  };

  const clearAllNotifications = () => {
    if (notifications.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const executePurge = async () => {
      const backup = [...notifications];

      // 1. INSTANT UI DISAPPEARANCE
      setNotifications([]);

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id as string)
        .select();

      if (error || !data) {
        setNotifications(backup);
        if (Platform.OS === 'web')
          window.alert('Purge Failed: Database blocked deletion.');
        else Alert.alert('Purge Failed', 'Database blocked deletion.');
      }
    };

    if (Platform.OS === 'web') {
      if (
        window.confirm(
          'Are you sure you want to clear your entire notification history?',
        )
      )
        executePurge();
    } else {
      Alert.alert(
        'Purge Feed',
        'Are you sure you want to clear your entire notification history?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Purge All', style: 'destructive', onPress: executePurge },
        ],
      );
    }
  };

  const deleteSingle = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedNotice(null);

    const backup = [...notifications];
    const removedItem = notifications.find((n) => n.id === id);

    // 1. INSTANT UI DISAPPEARANCE
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .select();

    if (error || !data || data.length === 0) {
      if (removedItem)
        setNotifications((prev) =>
          [removedItem, ...prev].sort(
            (a, b) =>
              new Date(b.created_at!).getTime() -
              new Date(a.created_at!).getTime(),
          ),
        );
      if (Platform.OS === 'web')
        window.alert('Error: Database blocked deletion.');
      else Alert.alert('Error', 'Database blocked deletion.');
    }
  };

  const FilterPill = ({ label, type }: { label: string; type: FilterType }) => {
    const isActive = activeFilter === type;
    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          setActiveFilter(type);
        }}
        style={[styles.filterPill, isActive && styles.filterPillActive]}
      >
        <Text
          style={[
            styles.filterPillText,
            isActive && styles.filterPillTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderNotification = ({
    item,
    index,
  }: {
    item: NotificationRow;
    index: number;
  }) => {
    let Icon = Info;
    let color = THEME.slate;
    let bgPulse = THEME.glassSurface;

    if (item.type === 'message' || item.type === 'SECURE_MESSAGE') {
      Icon = MessageSquare;
      color = THEME.indigo;
      bgPulse = 'rgba(99, 102, 241, 0.05)';
    } else if (item.type === 'TICKET_UPDATE') {
      Icon = Ticket;
      color = THEME.warning;
      bgPulse = 'rgba(245, 158, 11, 0.05)';
    } else if (item.type === 'LEVEL_UP') {
      Icon = Trophy;
      color = THEME.success;
      bgPulse = 'rgba(16, 185, 129, 0.05)';
    }

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 30)}
        exiting={SlideOutLeft}
        layout={Layout.springify()}
      >
        <View
          style={[
            styles.notificationCard,
            { backgroundColor: bgPulse, borderColor: color },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleInteract(item)}
            style={styles.cardContent}
          >
            <View
              style={[styles.iconWrapper, { backgroundColor: color + '20' }]}
            >
              <Icon size={22} color={color} />
              <View style={styles.unreadDot} />
            </View>
            <View style={styles.textContent}>
              <Text
                style={[styles.title, { color: THEME.white }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.message} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={styles.timeLabel}>
                {new Date(item.created_at || '').toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedNotice(item);
            }}
            style={styles.desktopActionIcon}
          >
            <MoreVertical size={20} color={THEME.slate} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBox}>
              <Bell size={24} color={THEME.white} />
              {unreadCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerTitle}>Feed</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={markAllAsRead}
              style={[styles.actionBtn, unreadCount === 0 && { opacity: 0.5 }]}
              disabled={unreadCount === 0}
            >
              <CheckCheck size={20} color={THEME.success} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearAllNotifications}
              style={[
                styles.actionBtn,
                { marginLeft: 12 },
                notifications.length === 0 && { opacity: 0.5 },
              ]}
              disabled={notifications.length === 0}
            >
              <Trash2 size={20} color={THEME.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['ALL', 'MESSAGES', 'SYSTEM', 'SUPPORT'] as FilterType[]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => <FilterPill label={item} type={item} />}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator
            color={THEME.indigo}
            style={{ flex: 1 }}
            size="large"
          />
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: bottomPadding },
            ]}
            style={!isMobile ? styles.desktopContainer : {}}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={THEME.indigo}
              />
            }
            ListEmptyComponent={
              <Animated.View entering={FadeInDown} style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                  {activeFilter === 'ALL' ? (
                    <Bell size={32} color={THEME.slate} />
                  ) : (
                    <Filter size={32} color={THEME.slate} />
                  )}
                </View>
                <Text style={styles.emptyTitle}>
                  {activeFilter === 'ALL' ? 'All Caught Up' : 'No Matches'}
                </Text>
                <Text style={styles.emptySub}>
                  {activeFilter === 'ALL'
                    ? 'You have no pending alerts or system notifications.'
                    : `There are no recent ${activeFilter.toLowerCase()} alerts in your feed.`}
                </Text>
              </Animated.View>
            }
          />
        )}
      </SafeAreaView>

      <Modal
        visible={!!selectedNotice}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotice(null)}
      >
        <Pressable
          style={[
            styles.modalBackdrop,
            !isMobile && { justifyContent: 'center', alignItems: 'center' },
          ]}
          onPress={() => setSelectedNotice(null)}
        >
          <Animated.View
            entering={isMobile ? FadeInUp : ZoomIn}
            style={
              isMobile ? styles.contextMenuMobile : styles.contextMenuDesktop
            }
          >
            <Text style={styles.contextTitle}>Alert Options</Text>

            <TouchableOpacity
              onPress={() => {
                handleInteract(selectedNotice!);
                setSelectedNotice(null);
              }}
              style={styles.modalActionBtn}
            >
              <CheckCheck size={22} color={THEME.success} />
              <Text style={[styles.modalActionText, { color: THEME.success }]}>
                Mark as Read & Hide
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                handleInteract(selectedNotice!);
                setSelectedNotice(null);
              }}
              style={styles.modalActionBtn}
            >
              <ChevronRight size={22} color={THEME.white} />
              <Text style={styles.modalActionText}>View Details / Resolve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => deleteSingle(selectedNotice!.id)}
              style={styles.modalActionBtn}
            >
              <Trash2 size={22} color={THEME.danger} />
              <Text style={[styles.modalActionText, { color: THEME.danger }]}>
                Delete from Database
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedNotice(null)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: THEME.danger,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: THEME.obsidian,
  },
  headerBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.white,
    marginLeft: 16,
    letterSpacing: -0.5,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  filterContainer: { paddingBottom: 16 },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: THEME.glassSurface,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: THEME.indigo,
  },
  filterPillText: {
    color: THEME.slate,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  filterPillTextActive: { color: THEME.white },
  listContainer: { paddingHorizontal: 16, paddingTop: 8 },
  desktopContainer: { alignSelf: 'center', width: '100%', maxWidth: 800 },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: THEME.glassSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
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
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.danger,
    borderWidth: 3,
    borderColor: THEME.obsidian,
  },
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
  desktopActionIcon: {
    padding: 16,
    opacity: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  contextMenuMobile: {
    backgroundColor: '#1e293b',
    margin: 20,
    marginBottom: 50,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  contextMenuDesktop: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    width: 400,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  contextTitle: {
    color: THEME.slate,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  closeBtn: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
  },
  closeText: {
    color: THEME.white,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
