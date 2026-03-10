/**
 * ============================================================================
 * 🧠 MODULE: AI NEURAL INTERFACE (CHAT)
 * ============================================================================
 */

import React, { useState, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  StatusBar,
  Image,
  Alert,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import {
  Send,
  Bot,
  User,
  Trash2,
  Copy,
  CheckCircle2,
  Sparkles,
  Zap,
  Clock,
  Settings,
  Download,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

/**
 * 🎨 DESIGN SYSTEM CONFIGURATION
 */
const THEME = {
  obsidian: '#020617',
  charcoal: '#0f172a',
  navy: '#1e293b',
  slate: '#1e293b',
  indigo: '#6366f1',
  indigoLight: '#818cf8',
  userBubble: '#4f46e5',
  aiBubble: '#1e293b',
  errorBubble: 'rgba(244, 63, 94, 0.1)',
  errorText: '#f43f5e',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  success: '#10b981',
};

type MessageRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

const QUICK_PROMPTS = [
  'Explain Java Architecture',
  'Code Optimization',
  'Debug Protocol',
  'Explain Edge Functions',
];

/**
 * ============================================================================
 * 🧩 SUB-MODULE: ChatBubble
 * ============================================================================
 */
const ChatBubble = memo(function ChatBubble({
  message,
  userAvatar,
  userName,
  userRole,
}: {
  message: ChatMessage;
  userAvatar: string | null;
  userName: string;
  userRole: string;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.content);
    setCopied(true);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSystem) {
    return (
      <Animated.View
        entering={FadeInUp}
        layout={LinearTransition.springify()}
        style={styles.errorBubbleContainer}
      >
        <View style={styles.errorBubble}>
          <AlertCircle
            size={14}
            color={THEME.errorText}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.errorTextContent}>{message.content}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={(isUser ? FadeInDown : FadeInUp).springify().damping(20)}
      layout={LinearTransition.springify()}
      style={[
        styles.bubbleContainer,
        isUser ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
      ]}
    >
      <View
        style={[styles.bubbleRow, isUser && { flexDirection: 'row-reverse' }]}
      >
        <View style={styles.avatarSpace}>
          {!isUser ? (
            <View style={[styles.avatarImg, styles.botAvatarGlow]}>
              <Bot size={20} color="#38bdf8" />
            </View>
          ) : userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarImg, { backgroundColor: THEME.indigo }]}>
              <User size={18} color="white" />
            </View>
          )}
        </View>

        <View style={{ maxWidth: Platform.OS === 'web' ? '70%' : '85%' }}>
          <View
            style={[
              styles.nameHeader,
              isUser && { justifyContent: 'flex-end' },
            ]}
          >
            <Text style={styles.nameLabel}>
              {isUser ? userName : 'SprintBot AI'}
            </Text>
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: isUser
                    ? '#1e293b'
                    : 'rgba(56, 189, 248, 0.1)',
                },
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  { color: isUser ? THEME.indigo : '#38bdf8' },
                ]}
              >
                {isUser ? userRole : 'SYSTEM'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.bubbleBody,
              isUser ? styles.userBody : styles.aiBody,
            ]}
          >
            <Text style={styles.messageTextContent}>{message.content}</Text>

            <View style={styles.bubbleFooter}>
              <View style={styles.metaRow}>
                <Clock
                  size={10}
                  color={isUser ? 'rgba(255,255,255,0.6)' : THEME.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.timestamp,
                    isUser && { color: 'rgba(255,255,255,0.6)' },
                  ]}
                >
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              {!isUser && (
                <TouchableOpacity
                  onPress={handleCopy}
                  style={styles.copyAction}
                  accessibilityLabel="Copy response"
                  accessibilityRole="button"
                >
                  {copied ? (
                    <CheckCircle2 size={12} color={THEME.success} />
                  ) : (
                    <Copy size={12} color={THEME.textSecondary} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

/**
 * ============================================================================
 * 🚀 PRIMARY MODULE: AIChatScreen
 * ============================================================================
 */
export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const flatListRef = useRef<FlatList>(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{
    avatar: string | null;
    name: string;
    role: string;
  }>({
    avatar: null,
    name: 'Commander',
    role: 'ADMIN',
  });

  const loadChatCore = async () => {
    try {
      if (!user?.id) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile({
          avatar: profile.avatar_url,
          name: profile.full_name || 'Commander',
          role: profile.role || 'MEMBER',
        });
      }

      if (messages.length === 0) {
        setIsHydrating(true);
        const { data: history, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (history && history.length > 0) {
          setMessages(
            history.map((h) => ({
              ...h,
              role: h.role as MessageRole,
              created_at: h.created_at || new Date().toISOString(),
            })),
          );
        } else {
          setMessages([
            {
              id: 'init-link',
              role: 'assistant',
              content: 'Sprint Link Stable. I am SprintBot⚡, Ready to assist.',
              created_at: new Date().toISOString(),
            },
          ]);
        }
      }
    } catch (err) {
      console.error('[AI Chat] Load Failure:', err);
    } finally {
      setIsHydrating(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChatCore();
    }, [user?.id]),
  );

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt || input).trim();
    if (!textToSend || loading || !user?.id) return;

    Keyboard.dismiss();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await supabase
        .from('chat_history')
        .insert({ user_id: user.id, role: 'user', content: textToSend });

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { prompt: textToSend, userId: user.id },
      });

      if (error) throw error;

      const aiResponse = data?.text || data?.reply || 'Signal interrupted.';

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      await supabase
        .from('chat_history')
        .insert({ user_id: user.id, role: 'ai', content: aiResponse });

      if (Platform.OS !== 'web')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `Neural Link Severed: ${err.message || 'Connection timeout.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
      if (Platform.OS !== 'web')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  };

  const handleExportTranscript = async () => {
    setShowSettings(false);
    if (messages.length === 0) return;

    let transcript = `=== SkillSprint AI Neural Transcript ===\nDate: ${new Date().toLocaleDateString()}\n\n`;
    messages.forEach((m) => {
      const sender =
        m.role === 'user'
          ? userProfile.name
          : m.role === 'system'
            ? 'SYSTEM'
            : 'SprintBot AI';
      transcript += `[${new Date(m.created_at).toLocaleTimeString()}] ${sender}:\n${m.content}\n\n`;
    });

    if (Platform.OS === 'web') {
      const blob = new Blob([transcript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SprintBot_Transcript_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await Clipboard.setStringAsync(transcript);
      Alert.alert(
        'Transcript Exported',
        'The conversation has been copied to your clipboard.',
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Triggered from dropdown
  const triggerPurgeConfirmation = () => {
    setShowSettings(false);
    setShowPurgeConfirm(true);
  };

  // Actual purge execution
  const executePurge = async () => {
    setShowPurgeConfirm(false);
    if (!user?.id) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    await supabase.from('chat_history').delete().eq('user_id', user.id);

    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Memory wiped. Ready for new inputs.',
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const TAB_BAR_HEIGHT = 60;
  const bottomPadding =
    Platform.OS === 'ios'
      ? insets.bottom + TAB_BAR_HEIGHT
      : TAB_BAR_HEIGHT + 20;

  return (
    <SafeAreaView style={styles.rootContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.mainWrapper}>
        {/* FLUID HEADER */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.headerLeft}>
            <View style={styles.botIconContainer}>
              <Sparkles size={20} color="#38bdf8" />
            </View>
            <View>
              <Text style={styles.headerTitle}>SprintBot AI</Text>
              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSubtitle}>CORE ONLINE</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowSettings(!showSettings)}
              style={styles.headerActionBtn}
              accessibilityLabel="Chat Settings"
              accessibilityRole="button"
            >
              <Settings size={18} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CHAT LIST */}
        <View style={styles.flex1}>
          {isHydrating ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" color={THEME.indigo} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ChatBubble
                  message={item}
                  userAvatar={userProfile.avatar}
                  userName={userProfile.name}
                  userRole={userProfile.role}
                />
              )}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: false })
              }
              onLayout={() =>
                flatListRef.current?.scrollToEnd({ animated: false })
              }
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              ListFooterComponent={
                loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={THEME.indigo} size="small" />
                    <Text style={styles.loadingText}>Synthesizing...</Text>
                  </View>
                ) : (
                  <View style={{ height: 20 }} />
                )
              }
            />
          )}
        </View>

        {/* UNIFIED INPUT AREA */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={{ width: '100%' }}
        >
          <View style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}>
            {!loading && messages.length <= 2 && (
              <View style={styles.chipRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {QUICK_PROMPTS.map((p, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.chip}
                      onPress={() => handleSend(p)}
                      accessibilityLabel={`Prompt: ${p}`}
                      accessibilityRole="button"
                    >
                      <Zap
                        size={12}
                        color={THEME.indigo}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.chipText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {Platform.OS === 'ios' || Platform.OS === 'web' ? (
              <BlurView intensity={30} tint="dark" style={styles.inputBar}>
                <TextInput
                  style={[
                    styles.input,
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                  placeholder="Query system core..."
                  placeholderTextColor="#64748b"
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={1500}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => handleSend()}
                  disabled={!input.trim() || loading}
                  style={[
                    styles.sendBtn,
                    (!input.trim() || loading) && {
                      backgroundColor: THEME.navy,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Send size={18} color="white" />
                  )}
                </TouchableOpacity>
              </BlurView>
            ) : (
              <View
                style={[
                  styles.inputBar,
                  { backgroundColor: 'rgba(15, 23, 42, 0.95)' },
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Query system core..."
                  placeholderTextColor="#64748b"
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={1500}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => handleSend()}
                  disabled={!input.trim() || loading}
                  style={[
                    styles.sendBtn,
                    (!input.trim() || loading) && {
                      backgroundColor: THEME.navy,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Send size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.footerMeta}>
              <ShieldCheck size={12} color={THEME.textSecondary} />
              <Text style={styles.footerMetaText}>Encrypted Neural Link</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* 🚀 WEB-SAFE PREMIUM SETTINGS DROPDOWN */}
      {showSettings && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={styles.overlayBackdrop}
            onPress={() => setShowSettings(false)}
          />
          <Animated.View
            entering={FadeInDown.duration(200).springify().damping(20)}
            style={[
              styles.settingsDropdown,
              { top: Math.max(insets.top, 16) + 60 },
            ]}
          >
            <TouchableOpacity
              onPress={handleExportTranscript}
              style={styles.dropdownItem}
            >
              <Download size={18} color={THEME.textPrimary} />
              <Text style={styles.dropdownText}>Export Transcript</Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <TouchableOpacity
              onPress={triggerPurgeConfirmation}
              style={styles.dropdownItem}
            >
              <Trash2 size={18} color={THEME.errorText} />
              <Text style={[styles.dropdownText, { color: THEME.errorText }]}>
                Purge Memory
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* 🚀 CUSTOM PURGE CONFIRMATION MODAL */}
      {showPurgeConfirm && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={styles.overlayBackdropDark}
            onPress={() => setShowPurgeConfirm(false)}
          />
          <View style={styles.centerModalWrapper}>
            <Animated.View
              entering={FadeInDown.springify().damping(20)}
              style={styles.confirmModal}
            >
              <View style={styles.confirmIconBox}>
                <Trash2 size={24} color={THEME.errorText} />
              </View>
              <Text style={styles.confirmTitle}>Purge Registry?</Text>
              <Text style={styles.confirmDesc}>
                This will wipe all neural history forever. This action cannot be
                undone.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  onPress={() => setShowPurgeConfirm(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Abort</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={executePurge}
                  style={styles.purgeBtn}
                >
                  <Text style={styles.purgeBtnText}>Purge</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/**
 * 🎨 STYLESHEET
 */
const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: THEME.obsidian },
  mainWrapper: { flex: 1, width: '100%', backgroundColor: THEME.obsidian },
  flex1: { flex: 1, width: '100%' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.glassBorder,
    backgroundColor: THEME.obsidian,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  botIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.textPrimary,
    letterSpacing: 0.5,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.success,
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 10,
    color: THEME.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerRight: { position: 'relative' },
  headerActionBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },

  // Overlay & Dropdown
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  settingsDropdown: {
    position: 'absolute',
    right: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
    zIndex: 11,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  dropdownText: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: THEME.glassBorder,
  },

  // Confirm Modal
  overlayBackdropDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 20,
  },
  centerModalWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 21,
    padding: 24,
  },
  confirmModal: {
    backgroundColor: THEME.charcoal,
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 20,
  },
  confirmIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: THEME.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  purgeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: THEME.errorText,
    alignItems: 'center',
  },
  purgeBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },

  // List & Bubbles
  listContent: { padding: 24, paddingBottom: 20 },
  bubbleContainer: { marginBottom: 28, width: '100%' },
  bubbleRow: { flexDirection: 'row', gap: 14, width: '100%' },
  avatarSpace: { width: 38, height: 38 },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botAvatarGlow: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },

  nameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  nameLabel: { color: 'white', fontSize: 13, fontWeight: '800' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  bubbleBody: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
  },
  userBody: {
    backgroundColor: THEME.userBubble,
    borderColor: THEME.indigoLight,
    borderTopRightRadius: 4,
  },
  aiBody: {
    backgroundColor: THEME.aiBubble,
    borderColor: THEME.glassBorder,
    borderTopLeftRadius: 4,
  },
  messageTextContent: {
    color: THEME.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  timestamp: {
    fontSize: 10,
    color: THEME.textSecondary,
    fontWeight: '700',
  },
  copyAction: { padding: 5 },

  errorBubbleContainer: {
    alignItems: 'center',
    marginVertical: 16,
    width: '100%',
  },
  errorBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.errorBubble,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  errorTextContent: { color: THEME.errorText, fontSize: 13, fontWeight: '600' },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 52,
    marginTop: 10,
  },
  loadingText: { color: THEME.textSecondary, fontSize: 13, fontWeight: '700' },

  inputWrapper: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: THEME.glassBorder,
    backgroundColor: THEME.obsidian,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    marginRight: 10,
  },
  chipText: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 32,
    padding: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    maxHeight: 120,
    paddingTop: 14,
    paddingBottom: 14,
    marginRight: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  footerMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    opacity: 0.6,
  },
  footerMetaText: {
    fontSize: 9,
    color: THEME.textSecondary,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
