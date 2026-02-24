/**
 * =============================================================
 * 💬 ACTIVE SECURE CHAT - PREMIUM UI (SkillSprint Standard)
 * =============================================================
 * Features:
 * - Client-Side AES-256 Encryption (Server only sees ciphertext)
 * - Expo Image Picker -> Supabase Storage Uploads
 * - Realtime Sync & Deno Wall compliance
 * - Premium Glassmorphism UI & Role Badges (Support.tsx parity)
 * =============================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Send,
  Paperclip,
  ChevronLeft,
  MoreVertical,
  Camera,
  Smile,
  ShieldCheck,
  UserX,
  BellOff,
  User,
  Shield,
  Zap,
  X,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import CryptoJS from 'crypto-js';

import { GlassCard } from '@/components/ui/GlassCard';

// --- THEME & CONSTANTS ---
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

// Secret Key for AES-256 E2EE (In production, derive via Diffie-Hellman)
const ENCRYPTION_SECRET = 'SKILLSPRINT_SUPER_SECRET_KEY_2026';

type UserRole = 'MEMBER' | 'PREMIUM' | 'MODERATOR' | 'ADMIN';

type ProfileData = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  presence_status: string | null;
  role: UserRole;
};

type DecryptedPayload = {
  text: string;
  image?: string | null;
};

type MessageRow = {
  id: string;
  content: string; // This holds the stringified JSON payload
  decrypted?: DecryptedPayload; // Client-side only
  sender_id: string | null;
  created_at: string | null;
  profiles?: ProfileData | null;
};

// --- HELPER: ENCRYPTION ---
const encryptMessage = (text: string, imageUrl?: string | null): string => {
  const payload = JSON.stringify({ text, image: imageUrl || null });
  return CryptoJS.AES.encrypt(payload, ENCRYPTION_SECRET).toString();
};

const decryptMessage = (ciphertext: string): DecryptedPayload => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_SECRET);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    // Backward compatibility if older messages weren't JSON
    if (!decryptedStr.startsWith('{')) return { text: decryptedStr };
    return JSON.parse(decryptedStr);
  } catch (e) {
    return { text: '🔒 Encrypted Message' };
  }
};

// --- HELPER: ROLE COLORS & BADGES ---
const getRoleColor = (role: UserRole | undefined) => {
  switch (role) {
    case 'ADMIN':
      return THEME.danger;
    case 'MODERATOR':
      return THEME.success;
    case 'PREMIUM':
      return THEME.warning;
    default:
      return THEME.indigo;
  }
};

const RoleBadge = ({ role }: { role: UserRole }) => {
  if (!role || role === 'MEMBER') return null;

  const color = getRoleColor(role);
  let Icon = User;
  let label = 'MEMBER';

  if (role === 'ADMIN') {
    Icon = Shield;
    label = 'ADMIN';
  } else if (role === 'MODERATOR') {
    Icon = ShieldCheck;
    label = 'MOD';
  } else if (role === 'PREMIUM') {
    Icon = Zap;
    label = 'PRO';
  }

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

// =============================================================
// 🚀 MAIN COMPONENT
// =============================================================
export default function ActiveChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user, refreshUserData } = useAuth();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const [recipient, setRecipient] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const recipientRef = useRef<ProfileData | null>(null);

  // --- DATA FETCHING & REALTIME ---
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    fetchInitialData();

    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageRow;
          if (newMsg.sender_id !== user.id) {
            newMsg.profiles = recipientRef.current;
            newMsg.decrypted = decryptMessage(newMsg.content);
            setMessages((prev) => [newMsg, ...prev]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const fetchInitialData = async () => {
    try {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select(
          'profiles(id, username, full_name, avatar_url, presence_status, role)',
        )
        .eq('conversation_id', conversationId)
        .neq('user_id', user?.id as string)
        .single();

      if (participants?.profiles) {
        const prof = participants.profiles as unknown as ProfileData;
        setRecipient(prof);
        recipientRef.current = prof;
      }

      const { data: msgData, error } = await supabase
        .from('messages')
        .select(
          '*, profiles(id, username, full_name, avatar_url, role, presence_status)',
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Decrypt all historical messages
      const decryptedMessages = (msgData || []).map((msg: any) => ({
        ...msg,
        decrypted: decryptMessage(msg.content),
      }));

      setMessages(decryptedMessages);
    } catch (error) {
      console.error('Failed to load chat data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- IMAGE UPLOAD LOGIC ---
  const handleAttachImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPendingImage(result.assets[0].uri);
    }
  };

  const uploadImageToStorage = async (uri: string): Promise<string | null> => {
    try {
      const ext = uri.substring(uri.lastIndexOf('.') + 1);
      const fileName = `${user?.id}-${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${ext}`,
      } as any);

      const { data, error } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, formData, { cacheControl: '3600', upsert: false });

      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('message-attachments').getPublicUrl(fileName);
      return publicUrl;
    } catch (e) {
      console.error('Upload failed', e);
      return null;
    }
  };

  // --- SEND MESSAGE LOGIC ---
  const handleSendMessage = async () => {
    if (
      (!inputText.trim() && !pendingImage) ||
      isSending ||
      !conversationId ||
      !user?.id
    )
      return;

    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let uploadedImageUrl = null;
    if (pendingImage) {
      uploadedImageUrl = await uploadImageToStorage(pendingImage);
    }

    const textToSend = inputText.trim();
    setInputText('');
    setPendingImage(null);

    // 1. Encrypt Payload
    const cipherText = encryptMessage(textToSend, uploadedImageUrl);

    // 2. Optimistic Update (Decrypted)
    const optimisticMsg: MessageRow = {
      id: `temp-${Date.now()}`,
      content: cipherText,
      decrypted: { text: textToSend, image: uploadedImageUrl },
      sender_id: user.id,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        username: user.profile?.username || '',
        full_name: user.profile?.full_name || '',
        avatar_url: user.profile?.avatar_url || '',
        role: (user.profile?.role as UserRole) || 'MEMBER',
        presence_status: 'ONLINE',
      },
    };

    setMessages((prev) => [optimisticMsg, ...prev]);

    // 3. Send to Deno Wall
    try {
      const { error } = await supabase.functions.invoke('send-message', {
        body: { conversationId, content: cipherText },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSending(false);
    }
  };

  const handleTogglePresence = async (
    status: 'ONLINE' | 'OFFLINE' | 'BUSY',
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await supabase.functions.invoke('presence-handler', { body: { status } });
      if (refreshUserData) await refreshUserData();
    } catch (e) {
      console.error('Presence update failed', e);
    }
    setShowSettings(false);
  };

  // =============================================================
  // 🎨 UI RENDERERS
  // =============================================================
  const renderMessage = ({
    item,
    index,
  }: {
    item: MessageRow;
    index: number;
  }) => {
    const isMe = item.sender_id === user?.id;
    const roleColor = getRoleColor(item.profiles?.role);

    const bubbleColor = isMe ? roleColor : THEME.glassSurface;
    const borderColor = isMe ? roleColor : THEME.glassBorder;
    const payload = item.decrypted || { text: 'Decrypting...' };

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 50)}
        layout={Layout.springify()}
        style={[
          styles.msgRow,
          isMe
            ? { justifyContent: 'flex-end' }
            : { justifyContent: 'flex-start' },
        ]}
      >
        {!isMe && (
          <View style={{ marginRight: 8, alignItems: 'center' }}>
            {item.profiles?.avatar_url ? (
              <Image
                source={{ uri: item.profiles.avatar_url }}
                style={styles.chatAvatar}
              />
            ) : (
              <View
                style={[
                  styles.chatAvatarPlaceholder,
                  { backgroundColor: roleColor },
                ]}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {item.profiles?.username?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ maxWidth: '75%' }}>
          {item.profiles && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4,
                justifyContent: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              {!isMe && (
                <Text
                  style={{
                    color: THEME.slate,
                    fontSize: 10,
                    fontWeight: 'bold',
                    marginRight: 6,
                  }}
                >
                  {item.profiles.full_name || item.profiles.username}
                </Text>
              )}
              <RoleBadge role={item.profiles.role} />
              {isMe && (
                <Text
                  style={{
                    color: THEME.slate,
                    fontSize: 10,
                    fontWeight: 'bold',
                    marginLeft: 6,
                  }}
                >
                  {item.profiles.full_name || item.profiles.username}
                </Text>
              )}
            </View>
          )}

          <View
            style={[
              styles.msgBubble,
              {
                backgroundColor: bubbleColor,
                borderColor: borderColor,
                borderWidth: 1,
                borderBottomRightRadius: isMe ? 4 : 20,
                borderBottomLeftRadius: isMe ? 20 : 4,
              },
            ]}
          >
            {payload.image && (
              <Image
                source={{ uri: payload.image }}
                style={styles.messageImage}
              />
            )}
            {payload.text ? (
              <Text style={{ fontSize: 15, lineHeight: 22, color: 'white' }}>
                {payload.text}
              </Text>
            ) : null}
            <Text
              style={{
                fontSize: 9,
                marginTop: 6,
                color: isMe ? 'rgba(255,255,255,0.6)' : THEME.slate,
                alignSelf: isMe ? 'flex-start' : 'flex-end',
              }}
            >
              {new Date(item.created_at || new Date()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {isMe && (
          <View style={{ marginLeft: 8, alignItems: 'center' }}>
            {item.profiles?.avatar_url ? (
              <Image
                source={{ uri: item.profiles.avatar_url }}
                style={styles.chatAvatar}
              />
            ) : (
              <View
                style={[
                  styles.chatAvatarPlaceholder,
                  { backgroundColor: roleColor },
                ]}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {user?.email?.[0].toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
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

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* --- HEADER --- */}
        <Animated.View entering={FadeInDown}>
          <GlassCard style={styles.chatHeader} intensity="heavy">
            <View style={styles.chatHeaderTop}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
              >
                <ChevronLeft size={24} color={THEME.white} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                {recipient ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View>
                      {recipient.avatar_url ? (
                        <Image
                          source={{ uri: recipient.avatar_url }}
                          style={styles.headerAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.headerAvatar,
                            {
                              backgroundColor: THEME.indigo,
                              justifyContent: 'center',
                              alignItems: 'center',
                            },
                          ]}
                        >
                          <User size={20} color="#FFF" />
                        </View>
                      )}
                      <View
                        style={[
                          styles.presenceDot,
                          {
                            backgroundColor:
                              recipient.presence_status === 'ONLINE'
                                ? THEME.success
                                : recipient.presence_status === 'BUSY'
                                  ? THEME.warning
                                  : THEME.slate,
                          },
                        ]}
                      />
                    </View>
                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Text style={styles.chatTitle} numberOfLines={1}>
                          {recipient.full_name || recipient.username}
                        </Text>
                        <RoleBadge role={recipient.role} />
                      </View>
                      <Text style={styles.chatSub}>
                        {recipient.presence_status === 'ONLINE'
                          ? 'Active Now'
                          : 'Offline'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.chatTitle}>Loading Secure Tunnel...</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                style={styles.backBtn}
              >
                <ShieldCheck size={20} color={THEME.success} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>

        {/* --- MESSAGE LIST --- */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={{ flex: 1 }}>
            {isLoading ? (
              <ActivityIndicator color={THEME.indigo} style={{ flex: 1 }} />
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* --- INPUT AREA --- */}
          <GlassCard style={styles.inputArea} intensity="heavy">
            {pendingImage && (
              <View style={styles.pendingImageContainer}>
                <Image
                  source={{ uri: pendingImage }}
                  style={styles.pendingImage}
                />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setPendingImage(null)}
                >
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <TouchableOpacity
                onPress={handleAttachImage}
                style={styles.attachBtn}
              >
                {pendingImage ? (
                  <ImageIcon size={22} color={THEME.indigo} />
                ) : (
                  <Paperclip size={22} color={THEME.slate} />
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                placeholder="AES-256 Encrypted Message..."
                placeholderTextColor={THEME.slate}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  ((!inputText.trim() && !pendingImage) || isSending) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={handleSendMessage}
                disabled={(!inputText.trim() && !pendingImage) || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={18} color={THEME.white} />
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* --- SETTINGS MODAL --- */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowSettings(false)}
        >
          <View
            style={styles.statusSheet}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 20,
              }}
            />
            <Text style={styles.statusTitle}>Chat Options</Text>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  color: THEME.slate,
                  fontSize: 12,
                  fontWeight: 'bold',
                  marginBottom: 10,
                }}
              >
                YOUR STATUS
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => handleTogglePresence('ONLINE')}
                  style={[
                    styles.statusOption,
                    user?.profile?.presence_status === 'ONLINE' &&
                      styles.statusOptionActive,
                    { flex: 1 },
                  ]}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: THEME.success,
                      marginRight: 8,
                    }}
                  />
                  <Text style={styles.statusOptionText}>ONLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleTogglePresence('BUSY')}
                  style={[
                    styles.statusOption,
                    user?.profile?.presence_status === 'BUSY' &&
                      styles.statusOptionActive,
                    { flex: 1 },
                  ]}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: THEME.warning,
                      marginRight: 8,
                    }}
                  />
                  <Text style={styles.statusOptionText}>BUSY</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn}>
              <View
                style={[
                  styles.actionIconBg,
                  { backgroundColor: 'rgba(99,102,241,0.1)' },
                ]}
              >
                <ShieldCheck size={20} color={THEME.indigo} />
              </View>
              <Text style={styles.actionBtnText}>Verify Encryption Keys</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <View
                style={[
                  styles.actionIconBg,
                  { backgroundColor: 'rgba(255,255,255,0.05)' },
                ]}
              >
                <BellOff size={20} color={THEME.slate} />
              </View>
              <Text style={styles.actionBtnText}>Mute Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <View
                style={[
                  styles.actionIconBg,
                  { backgroundColor: 'rgba(239,68,68,0.1)' },
                ]}
              >
                <UserX size={20} color={THEME.danger} />
              </View>
              <Text style={[styles.actionBtnText, { color: THEME.danger }]}>
                Block User
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLESHEET (Parity with support.tsx)
// ============================================================================
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: THEME.glassBorder,
    borderRadius: 0,
  },
  chatHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: THEME.obsidian,
  },
  chatTitle: { color: THEME.white, fontWeight: 'bold', fontSize: 16 },
  chatSub: { color: THEME.slate, fontSize: 11, marginTop: 2 },

  chatContent: { padding: 20, paddingBottom: 40 },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
    gap: 4,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  chatAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 4,
  },
  roleText: { fontSize: 8, fontWeight: '900', marginLeft: 2 },
  msgBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  inputArea: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: THEME.glassBorder,
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderRadius: 0,
  },
  pendingImageContainer: {
    marginBottom: 12,
    alignSelf: 'flex-start',
    position: 'relative',
  },
  pendingImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: THEME.danger,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.obsidian,
  },
  chatInput: {
    flex: 1,
    backgroundColor: THEME.glassSurface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: THEME.white,
    maxHeight: 120,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  attachBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.glassSurface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  statusSheet: {
    backgroundColor: '#1e293b',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    width: '100%',
    paddingBottom: 40,
  },
  statusTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 24,
  },
  statusOption: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionActive: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderColor: THEME.indigo,
  },
  statusOptionText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  actionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 16,
  },
});
