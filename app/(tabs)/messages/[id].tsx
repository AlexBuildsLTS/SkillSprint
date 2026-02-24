/**
 * ============================================================================
 * 🛡️ SKILLSPRINT SECURE CHAT TERMINAL - PRODUCTION BUILD v4.1 (TS FIXED)
 * ============================================================================
 * Architecture:
 * - Encryption: AES-256-CBC with randomized per-message IVs.
 * - UI Engine: Dynamic Inset Calculation (Resolves Tab Bar Overlap).
 * - Realtime: Supabase Websockets with strict channel isolation.
 * - Features: Block, Mute, Long-Press Context Menus, True Presence.
 * ============================================================================
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Alert,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Send,
  Paperclip,
  ChevronLeft,
  Settings,
  Camera,
  Smile,
  ShieldCheck,
  UserX,
  BellOff,
  Shield,
  Zap,
  X,
  FileText,
  CheckCheck,
  Circle,
  Trash2,
  Copy,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeInDown,
  Layout,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import CryptoJS from 'crypto-js';

import { GlassCard } from '@/components/ui/GlassCard';
import { Database } from '@/database.types';

// ============================================================================
// 🎨 CONFIGURATION & CRYPTO
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

const COMMON_EMOJIS = [
  '👍',
  '🔥',
  '🚀',
  '💻',
  '💡',
  '✅',
  '👀',
  '😂',
  '💯',
  '🙏',
  '🎉',
  '💀',
  '🤖',
  '🤯',
  '😎',
  '🙌',
];

// Must be exactly 32 chars for AES-256
const ENCRYPTION_SECRET = CryptoJS.enc.Utf8.parse(
  'SKILLSPRINT_SUPER_SECRET_KEY_123',
);

type UserRole = Database['public']['Enums']['user_role'];

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  presence_status: string | null;
  last_seen_at: string | null;
  role: UserRole;
}

interface DecryptedPayload {
  text: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'file' | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string | null; // Fixed TS mismatch here
  created_at: string;
  decryptedText?: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'file' | null;
  profiles?: Partial<ProfileData>;
  isDecrypted?: boolean;
}

// ============================================================================
// 🔐 ADVANCED ENCRYPTION ENGINE (AES-256-CBC)
// ============================================================================
const encryptPayload = (
  text: string,
  attachUrl?: string | null,
  attachType?: string | null,
): string => {
  const payload = JSON.stringify({
    text,
    attachmentUrl: attachUrl,
    attachmentType: attachType,
  });
  const iv = CryptoJS.lib.WordArray.random(16); // Unique IV per message
  const encrypted = CryptoJS.AES.encrypt(payload, ENCRYPTION_SECRET, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return iv.toString() + ':' + encrypted.toString();
};

const decryptPayload = (
  hash: string,
): DecryptedPayload & { success: boolean } => {
  try {
    const parts = hash.split(':');
    if (parts.length !== 2) throw new Error('Legacy or corrupt payload');

    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const decrypted = CryptoJS.AES.decrypt(parts[1], ENCRYPTION_SECRET, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const originalText = decrypted.toString(CryptoJS.enc.Utf8);
    return { ...JSON.parse(originalText), success: true };
  } catch (e) {
    return { text: '🔒 Decryption Failed', success: false };
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

const PresenceIndicator = ({
  status,
  lastSeen,
}: {
  status: string | null;
  lastSeen: string | null;
}) => {
  const isActuallyOnline = useMemo(() => {
    if (!lastSeen) return false;
    const lastActive = new Date(lastSeen).getTime();
    return lastActive > Date.now() - 5 * 60000; // 5 Min threshold
  }, [lastSeen]);

  const color = isActuallyOnline
    ? THEME.success
    : status === 'BUSY'
      ? THEME.warning
      : THEME.slate;
  return <View style={[styles.presenceDot, { backgroundColor: color }]} />;
};

// ============================================================================
// 🚀 MAIN SCREEN COMPONENT
// ============================================================================
export default function ActiveChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refreshUserData } = useAuth();

  // --- Responsive & Layout Engine ---
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Dynamic bottom padding to completely clear the Expo Router bottom tab bar
  const TAB_BAR_HEIGHT = isMobile ? 80 : 0;
  const bottomPadding =
    keyboardHeight > 0
      ? keyboardHeight + 10
      : Math.max(insets.bottom, 20) + TAB_BAR_HEIGHT;

  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [recipient, setRecipient] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // --- Feature State ---
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [pendingFile, setPendingFile] = useState<{
    uri: string;
    type: 'image' | 'file';
    name: string;
  } | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const recipientRef = useRef<ProfileData | null>(null);

  // ============================================================================
  // 🔄 LIFECYCLE & REALTIME
  // ============================================================================
  useEffect(() => {
    // Custom Keyboard Listeners (Overrides buggy KeyboardAvoidingView on Android)
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );

    if (conversationId && user?.id) {
      loadChatData();
      checkBlockAndMuteStatus();
    }

    const channel = supabase
      .channel(`secure_room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.new.sender_id !== user?.id) {
            const decrypted = decryptPayload(payload.new.content);
            const newMsg: Message = {
              ...(payload.new as any),
              decryptedText: decrypted.text,
              attachmentUrl: decrypted.attachmentUrl,
              attachmentType: decrypted.attachmentType as any,
              isDecrypted: decrypted.success,
              profiles: recipientRef.current || {},
            };
            setMessages((prev) => [newMsg, ...prev]);
            if (!isMuted)
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => {
      showSub.remove();
      hideSub.remove();
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const loadChatData = async () => {
    try {
      const { data: partData } = await supabase
        .from('conversation_participants')
        .select('profiles(*)')
        .eq('conversation_id', conversationId as string) // TS Fix
        .neq('user_id', user?.id as string) // TS Fix
        .single();

      if (partData?.profiles) {
        const p = partData.profiles as unknown as ProfileData;
        setRecipient(p);
        recipientRef.current = p;
      }

      const { data: msgData, error } = await supabase
        .from('messages')
        .select('*, profiles:sender_id(username, full_name, avatar_url, role)')
        .eq('conversation_id', conversationId as string) // TS Fix
        .order('created_at', { ascending: false });

      if (error) throw error;

      const decryptedHistory = (msgData || []).map((m) => {
        const dec = decryptPayload(m.content);
        return {
          ...m,
          decryptedText: dec.text,
          attachmentUrl: dec.attachmentUrl,
          attachmentType: dec.attachmentType,
          isDecrypted: dec.success,
        };
      });
      setMessages(decryptedHistory as Message[]); // TS Fix
    } catch (e) {
      console.error('[Load Error]', e);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBlockAndMuteStatus = async () => {
    if (!recipientRef.current?.id || !user?.id || !conversationId) return;

    const { data: blockData } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', recipientRef.current.id)
      .single();
    if (blockData) setIsBlocked(true);

    const { data: muteData } = await supabase
      .from('muted_conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId as string)
      .single();
    if (muteData) setIsMuted(true);
  };

  // ============================================================================
  // 📝 ACTIONS (SEND, BLOCK, MUTE, COPY)
  // ============================================================================
  const handlePickAttachment = async (mode: 'image' | 'file') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEmojiPicker(false);

    try {
      if (mode === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
          setPendingFile({
            uri: result.assets[0].uri,
            type: 'image',
            name: result.assets[0].fileName || 'image.jpg',
          });
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (!result.canceled && result.assets[0]) {
          setPendingFile({
            uri: result.assets[0].uri,
            type: 'file',
            name: result.assets[0].name,
          });
        }
      }
    } catch (e) {
      console.warn('Attachment cancelled or failed');
    }
  };

  const handleSendMessage = async () => {
    if (isBlocked) {
      Alert.alert(
        'Action Denied',
        'You must unblock this user to send transmissions.',
      );
      return;
    }
    if ((!inputText.trim() && !pendingFile) || isSending || !user?.id) return;

    setShowEmojiPicker(false);
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let attachmentData = null;
    if (pendingFile) {
      const fileExt = pendingFile.name.split('.').pop() || 'bin';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const formData = new FormData();
      formData.append('file', {
        uri: pendingFile.uri,
        name: pendingFile.name,
        type:
          pendingFile.type === 'image'
            ? `image/${fileExt}`
            : 'application/octet-stream',
      } as any);
      const { error } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, formData);
      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from('message-attachments').getPublicUrl(fileName);
        attachmentData = { url: publicUrl, type: pendingFile.type };
      }
    }

    const textToSend = inputText.trim();
    setInputText('');
    setPendingFile(null);

    const cipherText = encryptPayload(
      textToSend,
      attachmentData?.url,
      attachmentData?.type,
    );

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      content: cipherText,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      decryptedText: textToSend,
      attachmentUrl: attachmentData?.url,
      attachmentType: attachmentData?.type as any,
      isDecrypted: true,
      profiles: {
        role: user.profile?.role as UserRole,
        full_name: user.profile?.full_name,
        avatar_url: user.profile?.avatar_url,
      },
    };
    setMessages((prev) => [optimisticMsg, ...prev]);

   try {
      const { error } = await supabase.functions.invoke('send-message', {
        body: { conversationId, content: cipherText },
      });
      if (error) throw error;
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      Alert.alert("Transmission Failed", "Could not reach secure server.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = async () => {
    if (selectedMessage?.decryptedText) {
      await Clipboard.setStringAsync(selectedMessage.decryptedText);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSelectedMessage(null);
  };

  const toggleBlockUser = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!recipient?.id || !user?.id) return;

    if (isBlocked) {
      await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', recipient.id);
      setIsBlocked(false);
    } else {
      await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: recipient.id });
      setIsBlocked(true);
    }
  };

  const toggleMute = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user?.id || !conversationId) return;

    if (isMuted) {
      await supabase
        .from('muted_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId as string);
      setIsMuted(false);
    } else {
      await supabase.from('muted_conversations').insert({
        user_id: user.id,
        conversation_id: conversationId as string,
      });
      setIsMuted(true);
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setSelectedMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    await supabase.from('messages').delete().eq('id', msgId);
  };

  const handleTogglePresence = async (
    status: 'ONLINE' | 'OFFLINE' | 'BUSY',
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await supabase.functions.invoke('presence-handler', { body: { status } });
      if (refreshUserData) await refreshUserData();
    } catch (e) {
      console.error('Presence error', e);
    }
    setShowSettings(false);
  };

  // ============================================================================
  // 🎨 UI RENDERERS
  // ============================================================================
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const roleColor = isMe
      ? THEME.indigo
      : item.profiles?.role === 'ADMIN'
        ? THEME.danger
        : THEME.slate;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 15)}
        layout={Layout.springify()}
        style={[
          styles.msgRow,
          { justifyContent: isMe ? 'flex-end' : 'flex-start' },
        ]}
      >
        {!isMe && (
          <Image
            source={{
              uri:
                item.profiles?.avatar_url || 'https://via.placeholder.com/100',
            }}
            style={styles.chatAvatar}
          />
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setSelectedMessage(item);
          }}
          style={{
            maxWidth: isMobile ? '80%' : '60%',
            alignItems: isMe ? 'flex-end' : 'flex-start',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            {!isMe && (
              <Text style={styles.senderName}>
                {item.profiles?.full_name ||
                  item.profiles?.username ||
                  'Unknown'}
              </Text>
            )}
            <RoleBadge role={item.profiles?.role as UserRole} />
          </View>

          <View
            style={[
              styles.bubble,
              {
                backgroundColor: isMe ? THEME.indigo : THEME.glassSurface,
                borderColor: isMe ? THEME.indigo : THEME.glassBorder,
                borderBottomRightRadius: isMe ? 4 : 20,
                borderBottomLeftRadius: isMe ? 20 : 4,
              },
            ]}
          >
            {item.attachmentUrl && item.attachmentType === 'image' && (
              <Image
                source={{ uri: item.attachmentUrl }}
                style={styles.bubbleImage}
              />
            )}
            {item.attachmentUrl && item.attachmentType === 'file' && (
              <View style={styles.fileLink}>
                <FileText size={20} color={THEME.white} />
                <Text style={styles.fileLinkText}>Encrypted Document</Text>
              </View>
            )}
            {item.decryptedText ? (
              <Text style={styles.msgText}>{item.decryptedText}</Text>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-end',
                marginTop: 6,
              }}
            >
              {!item.isDecrypted && (
                <Lock
                  size={10}
                  color={THEME.danger}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={styles.msgTime}>
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {isMe && (
                <CheckCheck
                  size={12}
                  color="rgba(255,255,255,0.7)"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {isMe && (
          <Image
            source={{
              uri:
                item.profiles?.avatar_url || 'https://via.placeholder.com/100',
            }}
            style={[styles.chatAvatar, { marginLeft: 8, marginRight: 0 }]}
          />
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Dynamic Header */}
      <View style={{ paddingTop: insets.top }}>
        <GlassCard style={styles.header} intensity="heavy">
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <ChevronLeft size={24} color={THEME.white} />
            </TouchableOpacity>

            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: 12,
              }}
            >
              <View>
                <Image
                  source={{
                    uri:
                      recipient?.avatar_url ||
                      'https://via.placeholder.com/100',
                  }}
                  style={styles.headerAvatar}
                />
                <PresenceIndicator
                  status={recipient?.presence_status || null}
                  lastSeen={recipient?.last_seen_at || null}
                />
              </View>
              <View style={{ marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.headerTitle}>
                    {recipient?.full_name ||
                      recipient?.username ||
                      'Secure Line'}
                  </Text>
                  {isMuted && (
                    <BellOff
                      size={12}
                      color={THEME.slate}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
                {isBlocked ? (
                  <Text style={[styles.headerStatus, { color: THEME.danger }]}>
                    USER BLOCKED
                  </Text>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Unlock
                      size={10}
                      color={THEME.success}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.headerStatus}>AES-256-CBC SECURED</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={styles.iconBtn}
            >
              <Settings size={20} color={THEME.slate} />
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <ActivityIndicator
            color={THEME.indigo}
            style={{ flex: 1 }}
            size="large"
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              setShowEmojiPicker(false);
            }}
          />
        )}
      </View>

      {/* Dynamic Input Bar (Solves the Tab Bar issue perfectly) */}
      <Animated.View
        style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}
      >
        {isBlocked ? (
          <View style={styles.blockedBanner}>
            <AlertCircle color={THEME.danger} size={20} />
            <Text style={styles.blockedText}>
              You blocked this user. Unblock to send messages.
            </Text>
            <TouchableOpacity
              onPress={toggleBlockUser}
              style={styles.unblockBtn}
            >
              <Text style={styles.unblockBtnText}>Unblock</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <GlassCard style={styles.inputCard} intensity="heavy">
            {pendingFile && (
              <Animated.View
                entering={FadeInDown}
                exiting={FadeOut}
                style={styles.attachmentPreview}
              >
                <View style={styles.previewBox}>
                  {pendingFile.type === 'image' ? (
                    <Image
                      source={{ uri: pendingFile.uri }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <FileText color={THEME.white} size={24} />
                  )}
                  <TouchableOpacity
                    style={styles.removeAttach}
                    onPress={() => setPendingFile(null)}
                  >
                    <X size={12} color="white" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
            <View style={styles.inputRow}>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                style={styles.attachBtn}
              >
                <Smile
                  size={22}
                  color={showEmojiPicker ? THEME.warning : THEME.slate}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePickAttachment('image')}
                style={styles.attachBtn}
              >
                <Camera size={22} color={THEME.slate} />
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                placeholder="Encrypted payload..."
                placeholderTextColor={THEME.slate}
                value={inputText}
                onChangeText={setInputText}
                multiline
                onFocus={() => setShowEmojiPicker(false)}
              />

              <TouchableOpacity
                onPress={handleSendMessage}
                style={[
                  styles.sendBtn,
                  !inputText.trim() &&
                    !pendingFile && { backgroundColor: 'rgba(99,102,241,0.5)' },
                ]}
                disabled={(!inputText.trim() && !pendingFile) || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {/* Emoji Panel */}
            {showEmojiPicker && (
              <Animated.View entering={SlideInDown} style={styles.emojiPanel}>
                {COMMON_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiBtn}
                    onPress={() => setInputText((prev) => prev + emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}
          </GlassCard>
        )}
      </Animated.View>

      {/* ================= MODALS ================= */}
      <Modal
        visible={!!selectedMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedMessage(null)}
        >
          <Animated.View entering={FadeInUp} style={styles.contextMenu}>
            <Text style={styles.contextTitle}>Message Options</Text>
            <TouchableOpacity
              onPress={handleCopyMessage}
              style={styles.actionBtn}
            >
              <Copy size={20} color={THEME.white} />
              <Text style={styles.actionText}>Copy Decrypted Text</Text>
            </TouchableOpacity>
            {selectedMessage?.sender_id === user?.id && (
              <TouchableOpacity
                onPress={handleDeleteMessage}
                style={styles.actionBtn}
              >
                <Trash2 size={20} color={THEME.danger} />
                <Text style={[styles.actionText, { color: THEME.danger }]}>
                  Delete for Everyone
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setSelectedMessage(null)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowSettings(false)}
        >
          <View
            style={styles.settingsSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Link Configuration</Text>

            <View style={{ marginBottom: 24 }}>
              <Text style={styles.sectionLabel}>YOUR BROADCAST STATUS</Text>
              <View style={styles.statusSelectRow}>
                <TouchableOpacity
                  onPress={() => handleTogglePresence('ONLINE')}
                  style={[
                    styles.statusOption,
                    user?.profile?.presence_status === 'ONLINE' &&
                      styles.statusActive,
                  ]}
                >
                  <Circle
                    fill={THEME.success}
                    size={10}
                    color={THEME.success}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.statusOptionText}>ONLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleTogglePresence('BUSY')}
                  style={[
                    styles.statusOption,
                    user?.profile?.presence_status === 'BUSY' &&
                      styles.statusActive,
                  ]}
                >
                  <Circle
                    fill={THEME.warning}
                    size={10}
                    color={THEME.warning}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.statusOptionText}>BUSY</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={toggleMute} style={styles.actionBtn}>
              {isMuted ? (
                <BellOff color={THEME.danger} size={22} />
              ) : (
                <BellOff color={THEME.slate} size={22} />
              )}
              <Text
                style={[styles.actionText, isMuted && { color: THEME.danger }]}
              >
                {isMuted ? 'Unmute Transmissions' : 'Mute Incoming Signals'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleBlockUser}
              style={styles.actionBtn}
            >
              <UserX color={THEME.danger} size={22} />
              <Text style={[styles.actionText, { color: THEME.danger }]}>
                {isBlocked ? 'Unblock User' : 'Sever Connection (Block)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Close Configuration</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: THEME.glassBorder,
    borderRadius: 0,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  headerTitle: { color: 'white', fontWeight: '900', fontSize: 18 },
  headerStatus: {
    color: THEME.success,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: THEME.obsidian,
  },
  listContent: { padding: 16, paddingTop: 24 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  senderName: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 6,
  },
  bubble: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  msgText: { color: 'white', fontSize: 16, lineHeight: 24 },
  msgTime: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' },
  bubbleImage: {
    width: 220,
    height: 180,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: THEME.obsidian,
  },
  fileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  fileLinkText: {
    color: 'white',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
  },
  roleText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginLeft: 3,
  },
  inputWrapper: { width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)' },
  inputCard: {
    padding: 12,
    borderTopWidth: 1,
    borderColor: THEME.glassBorder,
    borderRadius: 0,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  chatInput: {
    flex: 1,
    backgroundColor: THEME.glassSurface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    color: 'white',
    marginHorizontal: 8,
    fontSize: 16,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  attachBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentPreview: { paddingBottom: 12, paddingLeft: 50 },
  previewBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: THEME.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.indigo,
  },
  previewImage: { width: '100%', height: '100%', borderRadius: 12 },
  removeAttach: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: THEME.danger,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.obsidian,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 16,
    borderTopWidth: 1,
    borderColor: THEME.danger,
  },
  blockedText: {
    color: THEME.danger,
    flex: 1,
    marginLeft: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  unblockBtn: {
    backgroundColor: THEME.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unblockBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  emojiPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.glassBorder,
  },
  emojiBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  emojiText: { fontSize: 24 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 50,
    borderTopWidth: 1,
    borderColor: THEME.glassBorder,
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
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 24,
  },
  sectionLabel: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  statusSelectRow: { flexDirection: 'row', gap: 12 },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: THEME.indigo,
  },
  statusOptionText: { color: 'white', fontWeight: '900', fontSize: 13 },
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
});
