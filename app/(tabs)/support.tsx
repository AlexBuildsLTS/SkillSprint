import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  LayoutAnimation,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ListRenderItemInfo,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MessageSquare,
  Plus,
  ChevronRight,
  Search,
  Send,
  LifeBuoy,
  ChevronLeft,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Zap,
  Trophy,
  Lock,
  Trash2,
  Code,
  User,
  Shield,
  ShieldCheck,
  ChevronDown,
  X,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Bento3DCard } from '@/components/ui/Bento3DCard';
import { GlassCard } from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';

const { width } = Dimensions.get('window');

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

const STAFF_ROLES = ['ADMIN', 'MODERATOR'];

type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
type UserRole = 'MEMBER' | 'PREMIUM' | 'MODERATOR' | 'ADMIN';

interface TicketUI {
  id: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority?: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  user_id: string;
  user?: {
    full_name: string;
    email: string;
    role: UserRole;
    avatar_url?: string;
  };
  messages?: MessageUI[];
}

interface MessageUI {
  id: string;
  message: string;
  created_at: string | null;
  is_internal: boolean | null;
  user_id: string;
  author?: {
    full_name: string | null;
    role: UserRole;
    avatar_url?: string;
  };
}

// --- FAQ DATA ---
const FAQ_DATA = [
  {
    id: '1',
    icon: Zap,
    color: THEME.warning,
    question: 'Daily Sprints?',
    answer:
      '5 AI-generated tasks generated daily based on your selected language. Completing them builds your streak.',
  },
  {
    id: '2',
    icon: Trophy,
    color: THEME.success,
    question: 'XP Calculation?',
    answer: 'XP is based on task difficulty. Bonuses apply for 7-day streaks.',
  },
  {
    id: '3',
    icon: Code,
    color: THEME.indigo,
    question: 'New Tracks?',
    answer:
      'We release new AI-curated tracks weekly. Premium users can request specific language architectures.',
  },
  {
    id: '4',
    icon: Lock,
    color: '#f43f5e',
    question: 'Premium Access?',
    answer:
      'Unlocks advanced "System Architecture" tracks, unlimited history, and priority support queues.',
  },
];

// --- HELPER: ROLE COLORS ---
const getRoleColor = (role: UserRole | undefined) => {
  switch (role) {
    case 'ADMIN':
      return THEME.danger;
    case 'MODERATOR':
      return THEME.success;
    case 'PREMIUM':
      return THEME.warning;
    default:
      return THEME.indigo; // Member
  }
};

// --- HELPER: ROLE BADGE ---
const RoleBadge = ({ role }: { role: UserRole }) => {
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

export default function SupportScreen() {
  const { user } = useAuth();

  // --- REAL-TIME ROLE CHECK ---
  const [realRole, setRealRole] = useState<UserRole>('MEMBER');

  useEffect(() => {
    if (!user) return;
    const fetchRole = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (data?.role) setRealRole(data.role);
    };
    fetchRole();
  }, [user]);

  const isStaff = STAFF_ROLES.includes(realRole);
  const isAdmin = realRole === 'ADMIN';

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'my_tickets' | 'queue' | 'faq'>(
    'my_tickets',
  );

  useEffect(() => {
    if (isStaff) setActiveTab('queue');
  }, [isStaff]);

  const [tickets, setTickets] = useState<TicketUI[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketUI[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketUI | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // View Modes
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create'>(
    'list',
  );
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  // Forms
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Technical Issue');
  const [newInitialMsg, setNewInitialMsg] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // --- DATA LOADING ---
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select(
          `
          *,
          user:profiles!tickets_user_id_fkey (full_name, role, avatar_url)
        `,
        )
        .order('created_at', { ascending: false });

      if (!isStaff) {
        query = query.eq('user_id', user.id);
      } else {
        if (activeTab === 'my_tickets') {
          query = query.eq('user_id', user.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const safeData: TicketUI[] = (data || []).map((t: any) => ({
        ...t,
        user: t.user || { full_name: 'Unknown', role: 'MEMBER' },
      }));

      setTickets(safeData);
      setFilteredTickets(safeData);
    } catch (e: any) {
      console.error('Load Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, activeTab, isStaff]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTickets(tickets);
    } else {
      const lower = searchQuery.toLowerCase();
      const filtered = tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(lower) ||
          t.id.toLowerCase().includes(lower),
      );
      setFilteredTickets(filtered);
    }
  }, [searchQuery, tickets]);

  // --- DETAIL LOADING (FIXED TYPESCRIPT ERROR) ---
  const loadTicketDetails = async (ticket: TicketUI) => {
    Haptics.selectionAsync();
    setSelectedTicket(ticket);
    setViewMode('detail');

    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select(
          `
          *,
          author:profiles!ticket_messages_user_id_fkey (full_name, role, avatar_url)
        `,
        )
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform & Filter messages
      const transformedMessages: MessageUI[] = (data || [])
        .filter((msg) => isStaff || !msg.is_internal)
        .map((msg: any) => ({
          ...msg,
          author: msg.author
            ? {
                full_name: msg.author.full_name,
                role: msg.author.role,
                // FIX: Convert null to undefined to satisfy strict TS types
                avatar_url: msg.author.avatar_url || undefined,
              }
            : undefined,
        }));

      setSelectedTicket((prev) =>
        prev ? { ...prev, messages: transformedMessages } : null,
      );

      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        500,
      );
    } catch (e) {
      console.error(e);
    }
  };

  // --- ACTIONS ---
  const handleSendMessage = async (isInternal: boolean = false) => {
    const content = isInternal ? internalNote : newMessage;
    if (!content.trim() || !selectedTicket || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: content,
        is_internal: isInternal,
      });

      if (error) throw error;

      if (isInternal) setInternalNote('');
      else setNewMessage('');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadTicketDetails(selectedTicket);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTitle.trim() || !newInitialMsg.trim()) return;
    setIsSubmitting(true);
    try {
      const { data: ticket, error: tErr } = await supabase
        .from('tickets')
        .insert({
          user_id: user!.id,
          subject: newTitle,
          category: newCategory,
          status: 'open',
        })
        .select()
        .single();

      if (tErr) throw tErr;

      const { error: mErr } = await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        user_id: user!.id,
        message: newInitialMsg,
        is_internal: false,
      });

      if (mErr) throw mErr;

      setNewTitle('');
      setNewInitialMsg('');
      setViewMode('list');
      loadData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTicket = (id: string) => {
    if (!isAdmin) return;
    Alert.alert(
      'Delete Ticket',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('tickets').delete().eq('id', id);
            setViewMode('list');
            loadData();
          },
        },
      ],
    );
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', selectedTicket.id);
    setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
    setStatusModalVisible(false);
    loadData();
  };

  // --- RENDERERS ---

  // 1. FAQ Render 
  const renderFAQ = () => (
    <View style={styles.sectionContainer}>
        {/* Added paddingHorizontal: 20 to push content inward from the edges */}
        <View style={{ flexDirection: 'row', marginBottom: 16, paddingHorizontal: 20, alignItems: 'center', gap: 10 }}>
          <LifeBuoy size={24} color={THEME.indigo} />
          <Text style={styles.sectionTitle}>Knowledge Base</Text>
        </View>
      <View style={styles.faqList}>
        {FAQ_DATA.map((item, index) => {
          const Icon = item.icon;
          return (
            <Animated.View
              key={item.id}
              entering={FadeInUp.delay(index * 100).springify()}
            >
              <Bento3DCard style={{ marginBottom: 12, width: '100%' }}>
                <View style={styles.faqContent}>
                  <View
                    style={[
                      styles.faqIconBg,
                      { backgroundColor: item.color + '20' },
                    ]}
                  >
                    <Icon size={24} color={item.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 24 }}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                </View>
              </Bento3DCard>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );

  // 2. Ticket Item
  const renderTicketItem = ({
    item,
    index,
  }: {
    item: TicketUI;
    index: number;
  }) => {
    const statusColor =
      item.status === 'open'
        ? THEME.success
        : item.status === 'closed'
          ? THEME.slate
          : THEME.warning;
    return (
      <Animated.View entering={FadeInUp.delay(index * 100).springify()}>
        <Bento3DCard
          onPress={() => loadTicketDetails(item)}
          style={{ marginBottom: 12 }}
        >
          <View style={styles.ticketCardContent}>
            <View style={styles.ticketCardTop}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  flex: 1,
                }}
              >
                <MessageSquare
                  size={18}
                  color={THEME.indigo}
                  style={{ opacity: 0.8 }}
                />
                <View>
                  <Text style={styles.ticketTitle} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <Text style={styles.ticketSub}>
                    #{item.id.slice(0, 6)} • {item.category}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={THEME.slate} opacity={0.5} />
            </View>
            <View style={styles.ticketCardBottom}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    borderColor: statusColor,
                    backgroundColor: statusColor + '10',
                  },
                ]}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: statusColor,
                    marginRight: 6,
                  }}
                />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {item.status.toUpperCase().replace('_', ' ')}
                </Text>
              </View>
              <Text style={styles.ticketDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Bento3DCard>
      </Animated.View>
    );
  };

  // 3. Chat Message (Dynamic Role Colors)
  const renderChatMessage = ({
    item,
    index,
  }: {
    item: MessageUI;
    index: number;
  }) => {
    const isMe = item.user_id === user?.id;
    const isInternal = item.is_internal;

    // Determine Color based on Role
    const roleColor = getRoleColor(item.author?.role);
    const bubbleColor = isMe
      ? roleColor
      : isInternal
        ? 'rgba(234, 179, 8, 0.15)'
        : '#1e293b';
    const borderColor = isMe
      ? roleColor
      : isInternal
        ? 'rgba(234, 179, 8, 0.4)'
        : THEME.glassBorder;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 50)}
        style={[
          styles.msgRow,
          isMe
            ? { justifyContent: 'flex-end' }
            : { justifyContent: 'flex-start' },
        ]}
      >
        {!isMe && (
          <View style={{ marginRight: 8, alignItems: 'center' }}>
            {item.author?.avatar_url ? (
              <Image
                source={{ uri: item.author.avatar_url }}
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
                  {item.author?.full_name?.[0] || '?'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ maxWidth: '75%' }}>
          {item.author && (
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
                  {item.author.full_name}
                </Text>
              )}
              <RoleBadge role={item.author.role} />
              {isMe && (
                <Text
                  style={{
                    color: THEME.slate,
                    fontSize: 10,
                    fontWeight: 'bold',
                    marginLeft: 6,
                  }}
                >
                  {item.author.full_name}
                </Text>
              )}
            </View>
          )}

          <View
            style={[
              styles.msgBubble,
              {
                backgroundColor: isMe ? roleColor : bubbleColor,
                borderColor: borderColor,
                borderWidth: 1,
                borderBottomRightRadius: isMe ? 4 : 20,
                borderBottomLeftRadius: isMe ? 20 : 4,
              },
            ]}
          >
            {isInternal && (
              <Text
                style={{
                  color: '#facc15',
                  fontSize: 9,
                  fontWeight: '900',
                  marginBottom: 4,
                }}
              >
                INTERNAL NOTE
              </Text>
            )}
            <Text
              style={{
                fontSize: 15,
                lineHeight: 22,
                color: isInternal ? '#fef08a' : 'white',
              }}
            >
              {item.message}
            </Text>
          </View>
        </View>

        {isMe && (
          <View style={{ marginLeft: 8, alignItems: 'center' }}>
            {item.author?.avatar_url ? (
              <Image
                source={{ uri: item.author.avatar_url }}
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return THEME.success;
      case 'in_progress':
        return THEME.warning;
      case 'resolved':
        return THEME.indigo;
      case 'closed':
        return THEME.slate;
      default:
        return THEME.slate;
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* TICKET LIST */}
          {viewMode === 'list' && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadData}
                  tintColor={THEME.indigo}
                />
              }
            >
              <Animated.View
                entering={FadeInDown}
                style={styles.headerContainer}
              >
                <View>
                  <Text style={styles.headerTitle}>Support Hub</Text>
                  <Text style={styles.headerSub}>
                    Logged in as{' '}
                    <Text style={{ color: THEME.indigo }}>{realRole}</Text>
                  </Text>
                </View>
                {(!isStaff || activeTab === 'my_tickets') && (
                  <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => setViewMode('create')}
                  >
                    <LinearGradient
                      colors={[THEME.indigo, '#818cf8']}
                      style={StyleSheet.absoluteFill}
                    />
                    <Plus size={20} color={THEME.white} />
                    <Text style={styles.createBtnText}>New Ticket</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>

              <View style={styles.tabContainer}>
                {isStaff && (
                  <TouchableOpacity
                    onPress={() => setActiveTab('queue')}
                    style={[
                      styles.tabBtn,
                      activeTab === 'queue' && styles.tabBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === 'queue' && styles.tabTextActive,
                      ]}
                    >
                      Queue
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setActiveTab('my_tickets')}
                  style={[
                    styles.tabBtn,
                    activeTab === 'my_tickets' && styles.tabBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'my_tickets' && styles.tabTextActive,
                    ]}
                  >
                    My Tickets
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('faq')}
                  style={[
                    styles.tabBtn,
                    activeTab === 'faq' && styles.tabBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'faq' && styles.tabTextActive,
                    ]}
                  >
                    FAQ
                  </Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'faq' ? (
                renderFAQ()
              ) : (
                <View style={styles.sectionContainer}>
                  <View style={styles.searchBarContainer}>
                    <View style={styles.searchBar}>
                      <Search size={18} color={THEME.slate} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search tickets..."
                        placeholderTextColor={THEME.slate}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                    </View>
                  </View>
                  {loading ? (
                    <ActivityIndicator
                      color={THEME.indigo}
                      style={{ marginTop: 20 }}
                    />
                  ) : (
                    <FlatList
                      data={filteredTickets}
                      renderItem={renderTicketItem}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                      contentContainerStyle={{ paddingHorizontal: 20 }}
                      ListEmptyComponent={
                        <Text style={styles.emptyText}>No tickets found.</Text>
                      }
                    />
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {/* DETAIL VIEW */}
          {viewMode === 'detail' && selectedTicket && (
            <View style={{ flex: 1 }}>
              <GlassCard style={styles.chatHeader} intensity="heavy">
                <View style={styles.chatHeaderTop}>
                  <TouchableOpacity
                    onPress={() => setViewMode('list')}
                    style={styles.backBtn}
                  >
                    <ChevronLeft size={24} color={THEME.white} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {selectedTicket.subject}
                    </Text>
                    <Text style={styles.chatSub}>
                      #{selectedTicket.id.slice(0, 6)} •{' '}
                      {selectedTicket.category}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { borderColor: getStatusColor(selectedTicket.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(selectedTicket.status) },
                      ]}
                    >
                      {selectedTicket.status.toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => handleDeleteTicket(selectedTicket.id)}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={18} color={THEME.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                {isStaff && (
                  <View style={styles.staffControls}>
                    <Text style={styles.staffLabel}>STAFF ACTIONS</Text>
                    <View
                      style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}
                    >
                      <TouchableOpacity
                        onPress={() => setStatusModalVisible(true)}
                        style={styles.actionBtn}
                      >
                        <Text style={styles.actionBtnText}>Change Status</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </GlassCard>

              <FlatList
                ref={flatListRef}
                data={selectedTicket.messages}
                renderItem={renderChatMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chatContent}
              />

              <GlassCard style={styles.inputArea} intensity="heavy">
                {isStaff && (
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <ShieldAlert size={12} color={THEME.warning} />
                      <Text
                        style={{
                          color: THEME.warning,
                          fontSize: 10,
                          marginLeft: 4,
                          fontWeight: 'bold',
                        }}
                      >
                        INTERNAL NOTE
                      </Text>
                    </View>
                    <View style={styles.internalInputContainer}>
                      <TextInput
                        style={styles.internalInput}
                        placeholder="Add team note..."
                        placeholderTextColor={THEME.slate}
                        value={internalNote}
                        onChangeText={setInternalNote}
                      />
                      <TouchableOpacity
                        onPress={() => handleSendMessage(true)}
                        style={styles.internalSendBtn}
                      >
                        <Lock size={16} color={THEME.warning} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Type a message..."
                    placeholderTextColor={THEME.slate}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendBtn,
                      !newMessage.trim() && { opacity: 0.5 },
                    ]}
                    onPress={() => handleSendMessage(false)}
                    disabled={!newMessage.trim()}
                  >
                    <Send size={18} color={THEME.white} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </View>
          )}

          {/* CREATE TICKET VIEW */}
          {viewMode === 'create' && (
            <View style={{ flex: 1, padding: 20 }}>
              <TouchableOpacity
                onPress={() => setViewMode('list')}
                style={{ marginBottom: 20 }}
              >
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
              <Text
                style={{
                  color: 'white',
                  fontSize: 24,
                  fontWeight: 'bold',
                  marginBottom: 20,
                }}
              >
                Create New Ticket
              </Text>
              <GlassCard style={{ padding: 20 }}>
                <Text
                  style={{
                    color: THEME.slate,
                    marginBottom: 8,
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                >
                  SUBJECT
                </Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="Brief summary..."
                  placeholderTextColor={THEME.slate}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <Text
                  style={{
                    color: THEME.slate,
                    marginBottom: 8,
                    marginTop: 20,
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                >
                  CATEGORY
                </Text>
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                  {[
                    'Technical Issue',
                    'Account',
                    'Content Request',
                    'Billing',
                  ].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setNewCategory(cat)}
                      style={[
                        styles.categoryChip,
                        newCategory === cat && {
                          backgroundColor: THEME.indigo,
                          borderColor: THEME.indigo,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text
                  style={{
                    color: THEME.slate,
                    marginBottom: 8,
                    marginTop: 20,
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                >
                  DESCRIPTION
                </Text>
                <TextInput
                  style={[
                    styles.createInput,
                    { height: 120, textAlignVertical: 'top' },
                  ]}
                  placeholder="Describe the issue..."
                  placeholderTextColor={THEME.slate}
                  value={newInitialMsg}
                  onChangeText={setNewInitialMsg}
                  multiline
                />
                <View style={{ marginTop: 30 }}>
                  {isSubmitting ? (
                    <ActivityIndicator color={THEME.indigo} />
                  ) : (
                    <Button onPress={handleCreateTicket} fullWidth size="lg">
                      SUBMIT TICKET
                    </Button>
                  )}
                </View>
              </GlassCard>
            </View>
          )}

          <Modal
            visible={statusModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setStatusModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setStatusModalVisible(false)}
              style={styles.modalOverlayCenter}
            >
              <View style={styles.statusSheet}>
                <Text style={styles.statusTitle}>Update Status</Text>
                {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => handleStatusChange(status as TicketStatus)}
                    style={[
                      styles.statusOption,
                      selectedTicket?.status === status &&
                        styles.statusOptionActive,
                    ]}
                  >
                    <Text style={styles.statusOptionText}>
                      {status.replace('_', ' ')}
                    </Text>
                    {selectedTicket?.status === status && (
                      <CheckCircle2 size={20} color={THEME.indigo} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.white,
    letterSpacing: -0.5,
  },
  headerSub: {
    color: THEME.slate,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
    overflow: 'hidden',
  },
  createBtnText: { color: THEME.white, fontWeight: 'bold', fontSize: 14 },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabBtnActive: { backgroundColor: THEME.indigo },
  tabText: { color: THEME.slate, fontWeight: 'bold', fontSize: 12 },
  tabTextActive: { color: 'white' },
  sectionContainer: { marginBottom: 30 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: { color: THEME.white, fontSize: 18, fontWeight: 'bold' },
  faqList: { gap: 12, paddingHorizontal: 20 },
  faqContent: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  faqIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    color: THEME.white,
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  faqAnswer: { color: THEME.slate, fontSize: 12, lineHeight: 18 },
  searchBarContainer: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  searchInput: { flex: 1, marginLeft: 12, color: THEME.white },
  ticketCardContent: { padding: 16 },
  ticketCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ticketTitle: {
    color: THEME.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  ticketSub: { color: THEME.slate, fontSize: 12 },
  ticketCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  ticketDate: { color: THEME.slate, fontSize: 11 },
  emptyText: { color: THEME.slate, textAlign: 'center', marginTop: 20 },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: THEME.glassBorder,
    borderRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
  chatTitle: { color: THEME.white, fontWeight: 'bold', fontSize: 16 },
  chatSub: { color: THEME.slate, fontSize: 11 },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  staffControls: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  staffLabel: {
    color: THEME.indigo,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  chatContent: { padding: 20, paddingBottom: 20 },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  chatAvatar: { width: 28, height: 28, borderRadius: 14 },
  chatAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarPlaceholderMe: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.slate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 4,
  },
  roleText: { fontSize: 8, fontWeight: '900', marginLeft: 2 },
  msgBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  internalLabel: {
    color: '#facc15',
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 4,
  },
  inputArea: {
    padding: 12,
    borderTopWidth: 1,
    borderColor: THEME.glassBorder,
    borderRadius: 0,
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: THEME.white,
    maxHeight: 100,
    marginRight: 12,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  internalInputContainer: { flexDirection: 'row', marginBottom: 12 },
  internalInput: {
    flex: 1,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    color: '#facc15',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    marginRight: 8,
  },
  internalSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  createInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    padding: 16,
    color: THEME.white,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    fontSize: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.slate,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  statusSheet: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOption: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusOptionActive: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderColor: THEME.indigo,
  },
  statusOptionText: {
    color: 'white',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
