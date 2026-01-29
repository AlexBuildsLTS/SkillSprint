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
  Dimensions,
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
  Terminal,
  Sparkles,
  Zap,
  ShieldCheck,
  MessageSquare,
  Clock,
  ChevronRight,
  AlertCircle,
  Code2,
  Cpu,
  Layers,
  Activity,
  History,
  Info,
  Settings2,
} from 'lucide-react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';

/**
 * SKILLSPRINT DESIGN SYSTEM CONFIG
 * Strict adherence to the Obsidian/Indigo aesthetic for AAA quality.
 */
const THEME = {
  obsidian: '#020617',
  charcoal: '#0f172a',
  slate: '#1e293b',
  indigo: '#6366f1',
  indigoLight: '#818cf8',
  userBubble: '#4f46e5',
  aiBubble: 'rgba(30, 41, 59, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  success: '#10b981',
  accent: '#a855f7',
  danger: '#ef4444',
  warning: '#f59e0b',
};

type MessageRole = 'user' | 'ai';

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

const QUICK_PROMPTS = [
  'Explain React',
  'Explain API Design',
  'Explain The Difference Between Frontend and Backend',
  'Explain Edge Functions',
  'Review my code'
];

/**
 * CORE COMPONENT: ChatBubble
 * Preserves your original bubble structure with optimized physics.
 */
const ChatBubble = memo(function ChatBubble({
  message,
  isDesktop,
}: {
  message: ChatMessage;
  isDesktop: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.text);
    setCopied(true);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setTimeout(() => setCopied(false), 2000);
  };

  const entryAnimation = isUser ? FadeInDown : FadeInUp;

  return (
    <Animated.View
      entering={entryAnimation.springify().damping(18).stiffness(120)}
      layout={LinearTransition.springify().mass(0.8)}
      style={[
        styles.bubbleRow,
        isUser
          ? { justifyContent: 'flex-end' }
          : { justifyContent: 'flex-start' },
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.aiAvatar}>
            <Bot size={16} color="#38bdf8" />
          </View>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          { maxWidth: isDesktop ? 650 : '78%' },
        ]}
      >
        <Text style={styles.messageText}>{message.text}</Text>

        <View style={styles.bubbleFooter}>
          <View style={styles.bubbleFooterMeta}>
            <Clock size={10} color="#cbd5e1" style={{ marginRight: 4 }} />
            <Text style={styles.timestamp}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {!isUser && (
            <TouchableOpacity
              onPress={handleCopy}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.copyBtn}
            >
              {copied ? (
                <CheckCircle2 size={12} color="#4ade80" />
              ) : (
                <Copy size={12} color={THEME.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.userAvatar}>
            <User size={16} color="white" />
          </View>
        </View>
      )}
    </Animated.View>
  );
});

/**
 * PRIMARY SCREEN: AIChatScreen
 * Fully adaptive, zero-warning production implementation.
 */
export default function AIChatScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const flatListRef = useRef<FlatList>(null);

  // Layout State
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  // Interaction State
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'ai',
      text: "Hello! I'm SprintBot ⚡. Ready to architect your micro-learning logic. What's the task?",
      timestamp: Date.now(),
    },
  ]);

  // Performance scrolling
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * NETWORK HANDLER: handleSend
   * Optimized for the Deno Edge Function interface.
   */
  const handleSend = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!overridePrompt) setInput('');
    setIsLoading(true);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // PROD-PATH: Triggering the Deno Edge Function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { prompt: textToSend },
      });

      if (error) throw error;

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data?.text || 'The architect is silent. Please try rephrasing.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      console.error('[SkillSprint-AI] Failure:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'ai',
        text: `Architecture Error: ${err.message || 'Connection lost.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setMessages([
      {
        id: Date.now().toString(),
        role: 'ai',
        text: 'System memory purged.',
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      {/* COMPONENT: Premium Adaptive Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isDesktop && styles.desktopWidth]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Sparkles size={20} color="#38bdf8" />
            </View>
            <View>
              <Text style={styles.headerTitle}>SprintBot AI</Text>
              <View style={styles.headerStatusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSubtitle}>Core Online</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerActionBtn}>
              <Info size={18} color={THEME.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClear}
              style={styles.headerActionBtn}
            >
              <Trash2 size={18} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* COMPONENT: Chat Thread */}
      <View style={styles.flex1}>
        <View style={[styles.flex1, isDesktop && styles.desktopWidth]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble message={item} isDesktop={isDesktop} />
            )}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="on-drag"
            onContentSizeChange={scrollToBottom}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              isLoading ? (
                <Animated.View
                  entering={FadeInDown}
                  style={styles.loadingContainer}
                >
                  <ActivityIndicator color={THEME.indigo} size="small" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </Animated.View>
              ) : (
                <View style={{ height: 20 }} />
              )
            }
          />
        </View>
      </View>

      {/* COMPONENT: Interaction Layer */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        style={{ width: '100%' }}
      >
        <View
          style={[
            styles.inputWrapper,
            isDesktop && styles.desktopWidth,
            { paddingBottom: Platform.OS === 'ios' ? 10 : 20 + insets.bottom },
          ]}
        >
          {/* Quick Prompt Carousel */}
          <View style={styles.promptRow}>
            {QUICK_PROMPTS.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.promptChip}
                onPress={() => handleSend(p)}
                disabled={isLoading}
              >
                <Zap
                  size={10}
                  color={THEME.indigo}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.promptChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <BlurView intensity={30} tint="dark" style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { maxHeight: 150 }]}
              placeholder="Query the system..."
              placeholderTextColor="#64748b"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={isLoading || !input.trim()}
              style={[
                styles.sendButton,
                (!input.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Send size={18} color="white" />
              )}
            </TouchableOpacity>
          </BlurView>

          <View style={styles.footerMeta}>
            <ShieldCheck size={10} color={THEME.textSecondary} />
            <Text style={styles.footerMetaText}>
              SkillSprint Deno-Logic Protected
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * PRODUCTION STYLESHEET
 * Precision layouts for both Mobile and High-Resolution Desktop.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.obsidian,
  },
  flex1: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  desktopWidth: {
    maxWidth: 1024,
    width: '100%',
    alignSelf: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: THEME.glassBorder,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: THEME.obsidian,
    borderBottomWidth: 1,
    borderBottomColor: THEME.glassBorder,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: 0.5,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 22,
    gap: 12,
    width: '100%',
    alignItems: 'flex-end',
  },
  avatarContainer: {
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: THEME.userBubble,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: THEME.aiBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  messageText: {
    color: THEME.textPrimary,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  bubbleFooterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  copyBtn: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 44,
    marginBottom: 30,
  },
  loadingText: {
    color: THEME.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.glassBorder,
    backgroundColor: THEME.obsidian,
    marginBottom: Platform.OS === 'ios' ? 0 : 72,
  },
  promptRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
    flexWrap: 'wrap',
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  promptChipText: {
    color: THEME.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 28,
    padding: 8,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    color: 'white',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.6,
    shadowOpacity: 0,
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
    opacity: 0.8,
  },
  footerMetaText: {
    fontSize: 9,
    color: THEME.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
