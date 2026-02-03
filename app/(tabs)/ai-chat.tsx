/**
 * ============================================================================
 * 🧠 MODULE: AI NEURAL INTERFACE (CHAT) - V11.5 (TAB-SAFE + VISUALS FIXED)
 * ============================================================================
 * PATH: app/(tabs)/ai-chat.tsx
 * VERSION: 11.5.0 (Production Master)
 * * * FIXES INCLUDED:
 * 1. TAB BAR OBSTRUCTION: Input area now has dynamic bottom padding.
 * 2. VISUALS: Robot Icon for AI, User Icon for User.
 * 3. COLORS: High-contrast bubble colors (User=Indigo, AI=Dark Slate).
 * 4. CRASH: Android BlurView fallback enabled.
 * ============================================================================
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
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
  useWindowDimensions,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
  Alert,
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
  ShieldCheck,
  Clock,
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

// UI COMPONENT SYSTEM
import { GlassCard } from '@/components/ui/GlassCard';

/**
 * 🎨 DESIGN SYSTEM CONFIGURATION
 * Updated with High-Contrast Bubble Colors
 */
const THEME = {
  obsidian: '#020617',
  charcoal: '#0f172a',
  slate: '#1e293b',
  indigo: '#6366f1',
  indigoLight: '#818cf8',
  userBubble: '#4f46e5', // Bright Indigo for User
  aiBubble: '#1e293b', // Dark Slate for AI (Distinct Contrast)
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  success: '#10b981',
};

type MessageRole = 'user' | 'assistant';

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
 * Features:
 * - Robot Icon for AI
 * - Distinct Background Colors
 */
const ChatBubble = memo(function ChatBubble({
  message,
  userAvatar,
  userName,
  userRole,
  isDesktop,
}: {
  message: ChatMessage;
  userAvatar: string | null;
  userName: string;
  userRole: string;
  isDesktop: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.content);
    setCopied(true);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setTimeout(() => setCopied(false), 2000);
  };

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
        {/* AVATAR SYSTEM */}
        <View style={styles.avatarSpace}>
          {!isUser ? (
            // 🤖 AI AVATAR: ROBOT ICON
            <View style={[styles.avatarImg, styles.botAvatarGlow]}>
              <Bot size={20} color="#38bdf8" />
            </View>
          ) : // 👤 USER AVATAR
          userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarImg, { backgroundColor: THEME.indigo }]}>
              <User size={18} color="white" />
            </View>
          )}
        </View>

        {/* MESSAGE BODY */}
        <View style={{ maxWidth: isDesktop ? 720 : '80%' }}>
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

          {/* Conditional Styling for Bubble Colors */}
          <GlassCard
            intensity="heavy"
            style={{
              ...styles.bubbleBody,
              ...(isUser ? styles.userBody : styles.aiBody),
            }}
          >
            <Text style={styles.messageTextContent}>{message.content}</Text>

            <View style={styles.bubbleFooter}>
              <View style={styles.metaRow}>
                <Clock
                  size={10}
                  color={THEME.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.timestamp}>
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
                >
                  {copied ? (
                    <CheckCircle2 size={12} color={THEME.success} />
                  ) : (
                    <Copy size={12} color={THEME.textSecondary} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const flatListRef = useRef<FlatList>(null);
  const isDesktop = width >= 1024;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userProfile, setUserProfile] = useState<{
    avatar: string | null;
    name: string;
    role: string;
  }>({
    avatar: null,
    name: 'Learner',
    role: 'MEMBER',
  });
  const [userId, setUserId] = useState<string | null>(null);

  /**
   * DATA HYDRATION
   */
  const loadChatCore = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile({
          avatar: profile.avatar_url,
          name: profile.full_name || 'Learner',
          role: profile.role || 'MEMBER',
        });
      }

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
            role:
              h.role === 'ai'
                ? 'assistant'
                : h.role === 'user'
                  ? 'user'
                  : 'assistant',
            created_at: h.created_at || new Date().toISOString(), // Ensure created_at is a string
          })),
        );
      } else {
        setMessages([
          {
            id: 'init-link',
            role: 'assistant',
            content:
              'Neural link stable. I am SprintBot ⚡. Ready to architect.',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('[AI Chat] Load Failure:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChatCore();
    }, []),
  );

  /**
   * NETWORK DISPATCH
   */
  const handleSend = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt || input).trim();
    if (!textToSend || loading || !userId) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await supabase.from('chat_history').insert({
        user_id: userId,
        role: 'user',
        content: textToSend,
      });

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { prompt: textToSend, userId },
      });

      if (error) throw error;

      const aiResponse = data?.text || 'Signal interrupted.';

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      await supabase.from('chat_history').insert({
        user_id: userId,
        role: 'assistant',
        content: aiResponse,
      });

      if (Platform.OS !== 'web')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Connection Failure: ${err.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert('Purge Registry?', 'Wipe all neural history?', [
      { text: 'Abort', style: 'cancel' },
      {
        text: 'Purge',
        style: 'destructive',
        onPress: async () => {
          if (!userId) return;
          await supabase.from('chat_history').delete().eq('user_id', userId);
          setMessages([
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: 'Memory wiped.',
              created_at: new Date().toISOString(),
            },
          ]);
        },
      },
    ]);
  };

  /**
   * LAYOUT CALCULATIONS FOR TAB BAR
   * This ensures the input field sits ABOVE the tab bar.
   */
  const TAB_BAR_HEIGHT = 60; // Standard tab bar height
  const bottomPadding =
    Platform.OS === 'ios'
      ? insets.bottom + TAB_BAR_HEIGHT
      : TAB_BAR_HEIGHT + 20;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isDesktop && styles.desktopBound]}>
          <View style={styles.headerLeft}>
            <View style={styles.botIconContainer}>
              <Sparkles size={20} color="#38bdf8" />
            </View>
            <View>
              <Text style={styles.headerTitle}>SprintBot AI</Text>
              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSubtitle}>Core Online</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleClearHistory}
              style={styles.headerActionBtn}
            >
              <Trash2 size={18} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* CHAT LIST */}
      <View style={styles.flex1}>
        <View style={[styles.flex1, isDesktop && styles.desktopBound]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                isDesktop={isDesktop}
                userAvatar={userProfile.avatar}
                userName={userProfile.name}
                userRole={userProfile.role}
              />
            )}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={THEME.indigo} size="small" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              ) : (
                <View style={{ height: 20 }} />
              )
            }
          />
        </View>
      </View>

      {/* INPUT AREA - TAB BAR SAFE */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight + 10 : 20}
        style={{ width: '100%' }}
      >
        <View
          style={[
            styles.inputWrapper,
            isDesktop && styles.desktopBound,
            { paddingBottom: bottomPadding }, // CRITICAL: Pushes input above Tab Bar
          ]}
        >
          {!loading && messages.length < 5 && (
            <View style={styles.chipRow}>
              {QUICK_PROMPTS.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chip}
                  onPress={() => handleSend(p)}
                >
                  <Zap
                    size={10}
                    color={THEME.indigo}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.chipText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* CRASH FIX: ANDROID FALLBACK */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={30} tint="dark" style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder="Query system core..."
                placeholderTextColor="#64748b"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={1000}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={loading || !input.trim()}
                style={styles.sendBtn}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={20} color="white" />
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
                maxLength={1000}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={loading || !input.trim()}
                style={styles.sendBtn}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footerMeta}>
            <ShieldCheck size={10} color={THEME.textSecondary} />
            <Text style={styles.footerMetaText}>Encrypted Neural Link</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * 🎨 STYLESHEET
 */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.obsidian },
  flex1: { flex: 1, width: '100%', alignSelf: 'center' },
  desktopBound: {
    maxWidth: 1024,
    width: '100%',
    alignSelf: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: THEME.glassBorder,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  header: {
    paddingVertical: 16,
    backgroundColor: THEME.obsidian,
    borderBottomWidth: 1,
    borderBottomColor: THEME.glassBorder,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    fontSize: 20,
    fontWeight: '900',
    color: THEME.textPrimary,
    letterSpacing: 0.8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.success,
    marginRight: 8,
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerRight: { flexDirection: 'row', gap: 12 },
  headerActionBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },

  listContent: { padding: 20, paddingBottom: 60 },
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
  nameLabel: { color: 'white', fontSize: 14, fontWeight: '800' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  bubbleBody: { padding: 18, borderRadius: 24 },
  userBody: { backgroundColor: THEME.userBubble, borderTopRightRadius: 4 },
  aiBody: {
    backgroundColor: THEME.aiBubble,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
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
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  timestamp: {
    fontSize: 10,
    color: 'rgba(248, 250, 252, 0.6)',
    fontWeight: '600',
  },
  copyAction: { padding: 5 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 52,
    marginBottom: 30,
  },
  loadingText: { color: THEME.textSecondary, fontSize: 13, fontWeight: '700' },

  inputWrapper: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.glassBorder,
    backgroundColor: THEME.obsidian,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 10,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  chipText: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    padding: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    maxHeight: 150,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
