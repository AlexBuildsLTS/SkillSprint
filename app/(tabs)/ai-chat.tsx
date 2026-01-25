import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  StatusBar,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Send,
  Bot,
  User,
  Trash2,
  Sparkles,
  Copy,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import {
  useSafeAreaInsets,
  SafeAreaView,
} from 'react-native-safe-area-context'; // Import this

// --- THEME ---
const THEME = {
  obsidian: '#020617',
  charcoal: '#0f172a',
  slate: '#1e293b',
  indigo: '#6366f1',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  userBubble: '#4f46e5',
  aiBubble: 'rgba(30, 41, 59, 0.7)',
  border: 'rgba(255, 255, 255, 0.08)',
};

// --- TYPES ---
interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

// --- COMPONENT: CHAT BUBBLE ---
const ChatBubble = ({
  message,
  isDesktop,
}: {
  message: Message;
  isDesktop: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.text);
    setCopied(true);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
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
          { maxWidth: isDesktop ? 600 : '75%' },
        ]}
      >
        <Text style={styles.messageText}>{message.text}</Text>
        <View style={styles.bubbleFooter}>
          <Text style={styles.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {!isUser && (
            <TouchableOpacity
              onPress={handleCopy}
              hitSlop={10}
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
    </Animated.View>
  );
};

// --- MAIN SCREEN ---
export default function AIChatScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets(); // Get safe area insets
  const flatListRef = useRef<FlatList>(null);
  const isDesktop = width >= 1024;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      role: 'ai',
      text: "Hello! I'm SprintBot ⚡. Ask me anything about coding, architecture, or your daily tasks.",
      timestamp: Date.now(),
    },
  ]);

  // Handlers
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { prompt: userText },
      });

      if (error) throw error;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data?.text || "I'm having trouble connecting right now.",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (Platform.OS !== 'web')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          text: `Connection Error: ${err.message || 'Please check your internet.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  };

  const handleClear = () => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([
      {
        id: Date.now().toString(),
        role: 'ai',
        text: 'Chat cleared.',
        timestamp: Date.now(),
      },
    ]);
  };

  // Adjust offset based on Tab Bar height (approx 80-90 on mobile)
  const tabHeight = Platform.OS === 'ios' ? 90 : 70;
  const keyboardOffset = Platform.OS === 'ios' ? tabHeight + 20 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isDesktop && styles.desktopWidth]}>
          <View style={styles.headerLeft}>
            <Sparkles size={20} color="#38bdf8" />
            <Text style={styles.headerTitle}>SprintBot AI</Text>
          </View>
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Trash2 size={18} color={THEME.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* BODY */}
      <View style={styles.flex1}>
        <View style={[styles.flex1, isDesktop && styles.desktopWidth]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble message={item} isDesktop={isDesktop} />
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
            keyboardDismissMode="on-drag"
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
                <View style={{ height: 10 }} />
              )
            }
          />
        </View>
      </View>

      {/* INPUT - With Keyboard Avoidance */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Adjusted offset
        style={{ width: '100%' }}
      >
        <View
          style={[
            styles.inputWrapper,
            isDesktop && styles.desktopWidth,
            { paddingBottom: Platform.OS === 'ios' ? 10 : 20 + insets.bottom }, // Dynamic bottom padding
          ]}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask coding questions..."
              placeholderTextColor="#64748b"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={isLoading || !input.trim()}
              style={[
                styles.sendButton,
                (!input.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
            >
              <Send size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    borderColor: THEME.border,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: THEME.obsidian,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  clearButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
    width: '100%',
  },
  avatarContainer: {
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  bubble: {
    padding: 14,
    borderRadius: 20,
    minWidth: 120,
  },
  userBubble: {
    backgroundColor: THEME.userBubble,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: THEME.aiBubble,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  messageText: {
    color: THEME.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    opacity: 0.6,
  },
  timestamp: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  copyBtn: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 42,
    marginBottom: 20,
  },
  loadingText: {
    color: THEME.textSecondary,
    fontSize: 13,
  },
  keyboardView: {
    backgroundColor: THEME.obsidian,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    backgroundColor: THEME.obsidian,
    // Add extra margin at bottom to float above tab bar
    marginBottom: Platform.OS === 'ios' ? 0 : 70,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: THEME.charcoal,
    borderRadius: 24,
    padding: 6,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  input: {
    flex: 1,
    color: 'white',
    maxHeight: 100,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginRight: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
});
