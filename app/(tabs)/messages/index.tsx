/**
 * ============================================================================
 * 🛡️ SKILLSPRINT SECURE INBOX - PRODUCTION BUILD v7.0 (NODE-FORGE E2EE)
 * ============================================================================
 * Architecture:
 * - Realtime Engine: Subscribes to global messages & profiles. Automatically
 * bubbles active conversations to the top with fluid spring animations.
 * - E2EE Previews: Asynchronously decrypts the last message securely.
 * - Cross-Platform: Uses secureStorage wrapper for Web/Native safe keystore.
 * - True Presence: Instantly updates online/busy indicators without refreshing.
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
  StyleSheet,
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
import secureStorage from '@/lib/secureStorage'; // Web-safe storage wrapper
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import forge from 'node-forge';

import { GlassCard } from '@/components/ui/GlassCard';
import { Database } from '@/supabase/database.types';

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

// Legacy fallback for old messages encrypted before RSA implementation
const LEGACY_SECRET = forge.util.createBuffer(
  'SKILLSPRINT_SUPER_SECRET_KEY_123',
  'utf8',
);

type UserRole = Database['public']['Enums']['user_role'];

// ============================================================================
// 🔐 ASYNC DECRYPTION PREVIEW ENGINE
// ============================================================================
const getLocalPrivateKey = async (): Promise<string | null> => {
  try {
    return await secureStorage.getItem('skillsprint_private_key');
  } catch (e) {
    return null;
  }
};

const decryptPreviewAsync = async (
  message: any | undefined,
  currentUserId: string | undefined,
): Promise<string> => {
  if (!message || !message.content) return 'Start a secure tunnel...';

  // If we are the sender and it's an RSA encrypted key, we don't have the recipient's private key to read it back.
  if (message.sender_id === currentUserId && message.encrypted_aes_key) {
    return '🔒 Encrypted & Sent';
  }

  try {
    const parts = message.content.split(':');
    if (parts.length !== 2) return '🔒 Encrypted payload';

    let decryptedPayloadStr = '';

    if (!message.encrypted_aes_key) {
      // Legacy Symmetric Decryption
      const iv = forge.util.hexToBytes(parts[0]);
      const encryptedPayload = forge.util.decode64(parts[1]);

      const decipher = forge.cipher.createDecipher('AES-CBC', LEGACY_SECRET);
      decipher.start({ iv: iv });
      decipher.update(forge.util.createBuffer(encryptedPayload));
      decipher.finish();
      decryptedPayloadStr = forge.util.decodeUtf8(decipher.output.getBytes());
    } else {
      // True E2EE Asymmetric + Symmetric Decryption
      const privateKeyPem = await getLocalPrivateKey();
      if (!privateKeyPem) return '🔒 Key Locked';

      const iv = forge.util.decode64(parts[0]);
      const encryptedPayload = forge.util.decode64(parts[1]);

      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const decryptedAESKey = privateKey.decrypt(
        forge.util.decode64(message.encrypted_aes_key),
        'RSA-OAEP',
      );

      const decipher = forge.cipher.createDecipher('AES-CBC', decryptedAESKey);
      decipher.start({ iv: iv });
      decipher.update(forge.util.createBuffer(encryptedPayload));
      const pass = decipher.finish();
      if (!pass) return '🔒 Decryption Failed';

      decryptedPayloadStr = forge.util.decodeUtf8(decipher.output.getBytes());
    }

    // Parse JSON Payload if applicable
    if (decryptedPayloadStr.startsWith('{')) {
      const payloadObj = JSON.parse(decryptedPayloadStr);
      if (payloadObj.attachmentType === 'image') return '🖼️ Encrypted Image';
      if (payloadObj.attachmentType === 'file') return '📄 Encrypted Document';
      return payloadObj.text || '🔒 Encrypted Payload';
    }
    return decryptedPayloadStr;
  } catch (e) {
    return '🔒 Decryption Error';
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

const UserAvatar = ({
  url,
  name,
  size = 56,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) => {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: THEME.glassBorder,
        }}
      />
    );
  }
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(99,102,241,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: THEME.glassBorder,
      }}
    >
      <Text
        style={{ color: THEME.indigo, fontWeight: '900', fontSize: size * 0.4 }}
      >
        {initial}
      </Text>
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
  const [isProvisioningKeys, setIsProvisioningKeys] = useState(false);

  // --- Actions State ---
  const [selectedConv, setSelectedConv] = useState<any | null>(null);

  // --- New Chat Modal State ---
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // ============================================================================
  // 🔑 BACKGROUND KEY PROVISIONING
  // ============================================================================
  const ensureUserHasKeys = async () => {
    if (!user?.id) return;
    try {
      let privKey = await secureStorage.getItem('skillsprint_private_key');
      let pubKey = await secureStorage.getItem('skillsprint_public_key');

      const { data: profile } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', user.id)
        .single();

      if (!privKey || !pubKey || !profile?.public_key) {
        setIsProvisioningKeys(true);
        console.log(
          '[E2EE Inbox] Provisioning RSA-2048 keys for discoverability...',
        );

        await new Promise((resolve) => setTimeout(resolve, 50));
        const keypair = forge.pki.rsa.generateKeyPair({
          bits: 2048,
          e: 0x10001,
        });
        privKey = forge.pki.privateKeyToPem(keypair.privateKey);
        pubKey = forge.pki.publicKeyToPem(keypair.publicKey);

        await secureStorage.setItem('skillsprint_private_key', privKey);
        await secureStorage.setItem('skillsprint_public_key', pubKey);

        await supabase
          .from('profiles')
          .update({ public_key: pubKey })
          .eq('id', user.id);
        console.log('[E2EE Inbox] Keys synced to global directory.');
      }
    } catch (error) {
      console.error('[E2EE Provisioning Error]', error);
    } finally {
      setIsProvisioningKeys(false);
    }
  };

  // ============================================================================
  // 🔄 DATA FETCHING & REALTIME SYNC
  // ============================================================================
  useEffect(() => {
    if (user?.id) {
      ensureUserHasKeys().then(() => fetchConversations());
    }

    // REALTIME: Listen for any new messages globally to bubble conversations to top
    const messageChannel = supabase
      .channel('inbox_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          // A new message arrived! Fetch silently to decrypt preview and re-sort
          fetchConversations(true);
        },
      )
      .subscribe();

    // REALTIME: Listen for profile updates to update online/busy dots instantly
    const profileChannel = supabase
      .channel('inbox_profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => {
          fetchConversations(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  const fetchConversations = async (silentRefresh = false) => {
    if (!user?.id) return;
    if (!silentRefresh) setIsLoading(true);

    try {
      const { data, error } = await supabase.from('conversations').select(`
          id, updated_at,
          conversation_participants!inner(user_id, last_read_at, profiles(id, username, full_name, avatar_url, presence_status, last_seen_at, role)),
          messages(content, created_at, sender_id, encrypted_aes_key)
        `);

      if (error) throw error;

      const { data: mutedData } = await supabase
        .from('muted_conversations')
        .select('conversation_id')
        .eq('user_id', user.id);

      const mutedIds = new Set(mutedData?.map((m) => m.conversation_id) || []);

      const formatted = await Promise.all(
        (data || []).map(async (conv: any) => {
          const me = conv.conversation_participants.find(
            (p: any) => p.user_id === user.id,
          );
          const other = conv.conversation_participants.find(
            (p: any) => p.user_id !== user.id,
          )?.profiles;

          // True Presence Evaluation
          const lastSeen = other?.last_seen_at
            ? new Date(other.last_seen_at).getTime()
            : 0;
          const isActuallyOnline = lastSeen > Date.now() - 5 * 60000;
          let actualStatus = other?.presence_status;
          if (actualStatus === 'ONLINE' && !isActuallyOnline)
            actualStatus = 'OFFLINE';

          // Sort messages internally to find the absolute latest one
          const sortedMessages = conv.messages?.sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
          const lastMessage = sortedMessages?.[0];

          const hasUnread =
            lastMessage && me?.last_read_at
              ? new Date(lastMessage.created_at) > new Date(me.last_read_at)
              : false;

          const previewText = await decryptPreviewAsync(lastMessage, user.id);

          return {
            id: conv.id,
            otherUser: { ...other, actualStatus },
            lastMessage,
            previewText,
            hasUnread,
            isMuted: mutedIds.has(conv.id),
            updatedAt: conv.updated_at,
          };
        }),
      );

      // GUARANTEED SORTING: Bubble newest activity to the very top
      const sortedConversations = formatted.sort((a, b) => {
        const timeA = a.lastMessage
          ? new Date(a.lastMessage.created_at).getTime()
          : new Date(a.updatedAt).getTime();
        const timeB = b.lastMessage
          ? new Date(b.lastMessage.created_at).getTime()
          : new Date(b.updatedAt).getTime();
        return timeB - timeA;
      });

      setConversations(sortedConversations);
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
        .neq('id', user.id)
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
        { target_user_id: targetUserId },
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
          .eq('user_id', user.id)
          .eq('conversation_id', selectedConv.id);
      } else {
        await supabase
          .from('muted_conversations')
          .insert({ user_id: user.id, conversation_id: selectedConv.id });
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
              .eq('user_id', user.id);
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

    const statusColor =
      item.otherUser?.actualStatus === 'ONLINE'
        ? THEME.success
        : item.otherUser?.actualStatus === 'BUSY'
          ? THEME.warning
          : THEME.slate;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 20)}
        layout={Layout.springify()}
      >
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
            <UserAvatar
              url={item.otherUser?.avatar_url}
              name={item.otherUser?.username}
              size={56}
            />
            <View
              style={[styles.presenceDot, { backgroundColor: statusColor }]}
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
              {item.hasUnread && (
                <View style={styles.unreadBadgeContainer}>
                  <Text style={styles.unreadBadgeText}>NEW</Text>
                </View>
              )}
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isProvisioningKeys && (
              <ActivityIndicator
                size="small"
                color={THEME.indigo}
                style={{ marginRight: 16 }}
              />
            )}
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
                  verified E2EE handshake.
                </Text>
              </Animated.View>
            }
          />
        )}
      </SafeAreaView>

      {/* ============================================================================
          🛠️ MODALS & ACTION SHEETS
      ============================================================================ */}

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
                  <UserAvatar
                    url={item.avatar_url}
                    name={item.username}
                    size={48}
                  />
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
  unreadBadgeContainer: {
    backgroundColor: THEME.indigo,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: THEME.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
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
