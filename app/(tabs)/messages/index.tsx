/**
 * ============================================================================
 * 🛡️ SKILLSPRINT SECURE INBOX - PRODUCTION BUILD v4.1 (TS FIXED)
 * ============================================================================
 * Architecture:
 * - Decryption Engine: Previews decrypted securely on the client side via AES-CBC.
 * - Real-Time Presence: Evaluates 'last_seen_at' for true online status.
 * - Interaction: Pull-to-refresh, Long-press context menus for Mute/Delete.
 * - UI: Glassmorphism, Adaptive scrolling for Mobile Tab Bars.
 * ============================================================================
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  useWindowDimensions,
  RefreshControl,
  Platform,
  Pressable,
  StyleSheet, // TS Fix: Imported StyleSheet
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Search,
  Edit,
  X,
  User,
  Waypoints,
  MessageSquareOff,
  Trash2,
  BellOff,
  Lock,
  ChevronRight,
  ShieldCheck,
  Shield,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient'; // TS Fix: Imported LinearGradient
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import CryptoJS from 'crypto-js';

import { GlassCard } from '@/components/ui/GlassCard';
import { Database } from '@/database.types';

// ============================================================================
// 🎨 THEME & CRYPTO CONFIGURATION
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

// Must match EXACTLY with [id].tsx
const ENCRYPTION_SECRET = CryptoJS.enc.Utf8.parse(
  'SKILLSPRINT_SUPER_SECRET_KEY_123',
);

type UserRole = Database['public']['Enums']['user_role'];

// ============================================================================
// 🔐 DECRYPTION PREVIEW ENGINE
// ============================================================================
const decryptPreview = (hash: string | undefined): string => {
  if (!hash) return 'Start a secure tunnel...';
  try {
    const parts = hash.split(':');
    if (parts.length !== 2) return '🔒 Encrypted payload';

    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const decrypted = CryptoJS.AES.decrypt(parts[1], ENCRYPTION_SECRET, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const originalText = decrypted.toString(CryptoJS.enc.Utf8);
    if (originalText.startsWith('{')) {
      const payload = JSON.parse(originalText);
      if (payload.attachmentType === 'image') return '🖼️ Encrypted Image';
      if (payload.attachmentType === 'file') return '📄 Encrypted Document';
      return payload.text || '🔒 Encrypted Payload';
    }
    return originalText;
  } catch (e) {
    return '🔒 Decryption Failed';
  }
};

// ============================================================================
// 🧩 MICRO-COMPONENTS
// ============================================================================
const RoleBadge = ({ role }: { role: UserRole | undefined }) => {
  if (!role || role === 'MEMBER') return null;
  const color =
    role === 'ADMIN'
      ? THEME.danger
      : role === 'PREMIUM'
        ? THEME.warning
        : THEME.indigo;
  const Icon =
    role === 'ADMIN' ? Shield : role === 'PREMIUM' ? Zap : ShieldCheck;
  let label = role === 'MODERATOR' ? 'MOD' : role === 'PREMIUM' ? 'PRO' : role;

  return (
    <View
      style={[
        styles.roleBadge,
        { backgroundColor: `${color}15`, borderColor: `${color}40` },
      ]}
    >
      <Icon size={10} color={color} />
      <Text style={[styles.roleText, { color }]}>{label}</Text>
    </View>
  );
};

// ============================================================================
// 🚀 MAIN SCREEN COMPONENT
// ============================================================================
export default function MessagesInboxScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // --- Inbox State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Actions State ---
  const [selectedConv, setSelectedConv] = useState<any | null>(null);

  // --- New Chat Modal State ---
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // ============================================================================
  // 🔄 DATA FETCHING & SYNC
  // ============================================================================
  useEffect(() => {
    if (user?.id) fetchConversations();
  }, [user?.id]);

  const fetchConversations = async (silentRefresh = false) => {
    if (!user?.id) return; // TS Fix
    if (!silentRefresh) setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          id, updated_at,
          conversation_participants!inner(user_id, last_read_at, profiles(id, username, full_name, avatar_url, presence_status, last_seen_at, role)),
          messages(content, created_at, sender_id)
        `,
        )
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch user's muted conversations
      const { data: mutedData } = await supabase
        .from('muted_conversations')
        .select('conversation_id')
        .eq('user_id', user.id as string); // TS Fix

      const mutedIds = new Set(mutedData?.map((m) => m.conversation_id) || []);

      const formatted = (data || []).map((conv: any) => {
        const me = conv.conversation_participants.find(
          (p: any) => p.user_id === user.id,
        );
        const other = conv.conversation_participants.find(
          (p: any) => p.user_id !== user.id,
        )?.profiles;

        // True Presence Engine
        const lastSeen = other?.last_seen_at
          ? new Date(other.last_seen_at).getTime()
          : 0;
        const isActuallyOnline = lastSeen > Date.now() - 5 * 60000;

        // Sort to get absolute latest message
        const sortedMessages = conv.messages?.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const lastMessage = sortedMessages?.[0];

        // Unread logic
        const hasUnread =
          lastMessage && me?.last_read_at
            ? new Date(lastMessage.created_at) > new Date(me.last_read_at)
            : false;

        return {
          id: conv.id,
          otherUser: { ...other, isActuallyOnline },
          lastMessage,
          previewText: decryptPreview(lastMessage?.content),
          hasUnread,
          isMuted: mutedIds.has(conv.id),
          updatedAt: conv.updated_at,
        };
      });

      setConversations(formatted);
    } catch (err) {
      console.error('[Inbox Sync Error]:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchConversations(true);
  }, [user?.id]);

  // ============================================================================
  // 🔍 NEW CHAT ENGINE
  // ============================================================================
  const handleUserSearch = async (text: string) => {
    if (!user?.id) return;
    setUserSearchQuery(text);
    if (text.length < 2) {
      setSearchedUsers([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, presence_status, role')
        .neq('id', user.id as string) // TS Fix
        .or(`username.ilike.%${text}%,full_name.ilike.%${text}%`)
        .limit(10);

      if (error) throw error;
      setSearchedUsers(data || []);
    } catch (err) {
      console.error('Directory search failed:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const startNewChat = async (targetUserId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsNewChatModalOpen(false);

    try {
      const { data: conversationId, error } = await supabase.rpc(
        'create_or_get_conversation' as any,
        {
          target_user_id: targetUserId,
        },
      );

      if (error) throw error;
      if (conversationId) router.push(`/messages/${conversationId}`);
    } catch (err) {
      Alert.alert(
        'Handshake Failed',
        'Could not establish a secure connection.',
      );
    }
  };

  // ============================================================================
  // ⚡ CONTEXT ACTIONS (Mute/Delete)
  // ============================================================================
  const handleMuteConversation = async () => {
    if (!selectedConv || !user?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (selectedConv.isMuted) {
        await supabase
          .from('muted_conversations')
          .delete()
          .eq('user_id', user.id as string)
          .eq('conversation_id', selectedConv.id);
      } else {
        await supabase.from('muted_conversations').insert({
          user_id: user.id as string,
          conversation_id: selectedConv.id,
        });
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id ? { ...c, isMuted: !c.isMuted } : c,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSelectedConv(null);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConv || !user?.id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      'Purge Terminal',
      'This removes the conversation from your device. The other user retains their encrypted copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('conversation_participants')
              .delete()
              .eq('conversation_id', selectedConv.id)
              .eq('user_id', user.id as string);
            setConversations((prev) =>
              prev.filter((c) => c.id !== selectedConv.id),
            );
            setSelectedConv(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ],
    );
  };

  // ============================================================================
  // 🎨 UI RENDERERS
  // ============================================================================
  const renderConversationItem = ({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => {
    const formatTime = (iso: string) => {
      const d = new Date(iso);
      if (new Date().toDateString() === d.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
      <Animated.View entering={FadeInUp.delay(index * 20)}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            Haptics.selectionAsync();
            router.push(`/messages/${item.id}`);
          }}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setSelectedConv(item);
          }}
          style={styles.convItem}
        >
          <View style={styles.avatarContainer}>
            {item.otherUser?.avatar_url ? (
              <Image
                source={{ uri: item.otherUser.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>
                  {item.otherUser?.username?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.presenceDot,
                {
                  backgroundColor: item.otherUser?.isActuallyOnline
                    ? THEME.success
                    : THEME.slate,
                },
              ]}
            />
          </View>

          <View style={styles.convDetails}>
            <View style={styles.convHeaderRow}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              >
                <Text
                  style={[
                    styles.convName,
                    item.hasUnread && { color: THEME.white },
                  ]}
                  numberOfLines={1}
                >
                  {item.otherUser?.full_name ||
                    item.otherUser?.username ||
                    'Unknown User'}
                </Text>
                {item.isMuted && (
                  <BellOff
                    size={12}
                    color={THEME.slate}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.convTime,
                  item.hasUnread && { color: THEME.indigo },
                ]}
              >
                {item.lastMessage
                  ? formatTime(item.lastMessage.created_at)
                  : ''}
              </Text>
            </View>

            <View style={styles.convPreviewRow}>
              <Text
                style={[
                  styles.convPreviewText,
                  item.hasUnread && styles.convPreviewUnread,
                ]}
                numberOfLines={1}
              >
                {item.previewText}
              </Text>
              {item.hasUnread && <View style={styles.unreadBadge} />}
            </View>
          </View>
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
            <Waypoints size={32} color={THEME.indigo} />
            <Text style={styles.headerTitle}>Terminals</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsNewChatModalOpen(true);
            }}
            style={styles.newChatBtn}
          >
            <Edit size={20} color={THEME.white} />
          </TouchableOpacity>
        </View>

        {/* --- SEARCH BAR --- */}
        <View style={styles.searchContainer}>
          <GlassCard style={styles.searchCard}>
            <Search size={18} color={THEME.slate} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search active connections..."
              placeholderTextColor={THEME.slate}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={THEME.slate} />
              </TouchableOpacity>
            )}
          </GlassCard>
        </View>

        {/* --- INBOX LIST --- */}
        {isLoading ? (
          <ActivityIndicator
            color={THEME.indigo}
            style={{ flex: 1 }}
            size="large"
          />
        ) : (
          <FlatList
            data={conversations.filter(
              (c) =>
                c.otherUser?.username
                  ?.toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                c.otherUser?.full_name
                  ?.toLowerCase()
                  .includes(searchQuery.toLowerCase()),
            )}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: isMobile ? 120 : 60 },
            ]}
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
                  <Lock size={32} color={THEME.slate} />
                </View>
                <Text style={styles.emptyTitle}>Secure Environment</Text>
                <Text style={styles.emptySub}>
                  No active transmissions. Tap the pen icon to initiate a
                  verified AES-256 handshake.
                </Text>
              </Animated.View>
            }
          />
        )}
      </SafeAreaView>

      {/* ============================================================================
          🛠️ MODALS & ACTION SHEETS
      ============================================================================ */}

      {/* Context Menu (Long Press Conversation) */}
      <Modal
        visible={!!selectedConv}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedConv(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedConv(null)}
        >
          <Animated.View entering={FadeInUp} style={styles.contextMenu}>
            <Text style={styles.contextTitle}>
              Terminal Options: @{selectedConv?.otherUser?.username}
            </Text>

            <TouchableOpacity
              onPress={handleMuteConversation}
              style={styles.actionBtn}
            >
              {selectedConv?.isMuted ? (
                <BellOff size={22} color={THEME.danger} />
              ) : (
                <BellOff size={22} color={THEME.white} />
              )}
              <Text
                style={[
                  styles.actionText,
                  selectedConv?.isMuted && { color: THEME.danger },
                ]}
              >
                {selectedConv?.isMuted
                  ? 'Unmute Transmissions'
                  : 'Mute Incoming Signals'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteConversation}
              style={styles.actionBtn}
            >
              <Trash2 size={22} color={THEME.danger} />
              <Text style={[styles.actionText, { color: THEME.danger }]}>
                Purge from Device
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedConv(null)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* New Chat Directory Modal */}
      <Modal
        visible={isNewChatModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Initiate Handshake</Text>
            <TouchableOpacity
              onPress={() => setIsNewChatModalOpen(false)}
              style={styles.modalCloseBtn}
            >
              <X size={20} color={THEME.slate} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <GlassCard style={styles.searchCard}>
              <Search size={18} color={THEME.slate} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search global directory (@username)..."
                placeholderTextColor={THEME.slate}
                value={userSearchQuery}
                onChangeText={handleUserSearch}
                autoFocus
                autoCapitalize="none"
              />
              {isSearchingUsers && (
                <ActivityIndicator size="small" color={THEME.indigo} />
              )}
            </GlassCard>
          </View>

          <FlatList
            data={searchedUsers}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 60 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => startNewChat(item.id)}
                style={styles.directoryItem}
              >
                <View>
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      style={styles.dirAvatar}
                    />
                  ) : (
                    <View style={[styles.dirAvatar, styles.avatarPlaceholder]}>
                      <User size={24} color={THEME.indigo} />
                    </View>
                  )}
                </View>
                <View style={styles.dirInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.dirName}>
                      {item.full_name || item.username}
                    </Text>
                    <RoleBadge role={item.role} />
                  </View>
                  <Text style={styles.dirUsername}>@{item.username}</Text>
                </View>
                <ChevronRight size={20} color={THEME.slate} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={() =>
              userSearchQuery.length >= 2 && !isSearchingUsers ? (
                <Text style={styles.emptyDirText}>
                  No verified identities found for "{userSearchQuery}"
                </Text>
              ) : null
            }
          />
        </View>
      </Modal>
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
    paddingBottom: 16,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.white,
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  newChatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  // Search
  searchContainer: { paddingHorizontal: 20, paddingBottom: 16 },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  searchInput: {
    flex: 1,
    color: THEME.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },

  // List Items
  listContainer: { paddingHorizontal: 10 },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '900', color: THEME.indigo },
  presenceDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: THEME.obsidian,
  },

  convDetails: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  convHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  convName: { fontSize: 16, fontWeight: '900', color: THEME.slate },
  convTime: { fontSize: 11, fontWeight: 'bold', color: THEME.slate },
  convPreviewRow: { flexDirection: 'row', alignItems: 'center' },
  convPreviewText: {
    flex: 1,
    fontSize: 14,
    color: THEME.slate,
    fontWeight: '500',
  },
  convPreviewUnread: { color: THEME.white, fontWeight: '800' },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.indigo,
    marginLeft: 10,
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },

  // Badges
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
  },
  roleText: {
    fontSize: 8,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 0.5,
  },

  // Empty State
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

  // Action Menu
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  contextMenu: {
    backgroundColor: '#1e293b',
    margin: 20,
    marginBottom: 50,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
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
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  actionText: {
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

  // Directory Modal
  modalRoot: { flex: 1, backgroundColor: THEME.obsidian },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: THEME.glassBorder,
  },
  modalTitle: { fontSize: 24, fontWeight: '900', color: THEME.white },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchContainer: { padding: 20 },
  directoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dirAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  dirInfo: { flex: 1, marginLeft: 16 },
  dirName: { fontSize: 16, fontWeight: '900', color: THEME.white },
  dirUsername: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.slate,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyDirText: {
    textAlign: 'center',
    color: THEME.slate,
    marginTop: 40,
    fontSize: 14,
    fontWeight: '600',
  },
});
