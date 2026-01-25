import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  StyleSheet,
  ListRenderItemInfo,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Plus,
  HelpCircle,
  X,
  Send,
  Lock,
  ShieldAlert,
  ChevronDown,
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Shield,
  ShieldCheck,
  MoreVertical,
  Filter,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

// INTERNAL SERVICES & CONTEXT
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { Bento3DCard } from '@/components/ui/Bento3DCard';

// --- CONSTANTS ---
const STAFF_ROLES = ['ADMIN', 'MODERATOR'];
const THEME = {
  obsidian: '#020617',
  slate: '#94a3b8',
  indigo: '#6366f1',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  white: '#ffffff',
  glassBorder: 'rgba(255,255,255,0.08)',
  cardBg: 'rgba(15, 23, 42, 0.6)',
};

// --- TYPES ---
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
  created_at: string;
  is_internal: boolean;
  user_id: string;
  author?: {
    full_name: string;
    role: UserRole;
    avatar_url?: string;
  };
}

// --- HELPER COMPONENT: ROLE BADGE ---
const RoleBadge = ({ role }: { role: UserRole }) => {
  if (role === 'ADMIN')
    return (
      <View
        style={[
          styles.roleBadge,
          {
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          },
        ]}
      >
        <Shield size={10} color={THEME.danger} />
        <Text style={[styles.roleText, { color: THEME.danger }]}>ADMIN</Text>
      </View>
    );
  if (role === 'MODERATOR')
    return (
      <View
        style={[
          styles.roleBadge,
          {
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
          },
        ]}
      >
        <ShieldCheck size={10} color={THEME.success} />
        <Text style={[styles.roleText, { color: THEME.success }]}>MOD</Text>
      </View>
    );
  if (role === 'PREMIUM')
    return (
      <View
        style={[
          styles.roleBadge,
          {
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
          },
        ]}
      >
        <User size={10} color={THEME.warning} />
        <Text style={[styles.roleText, { color: THEME.warning }]}>PRO</Text>
      </View>
    );
  return (
    <View
      style={[
        styles.roleBadge,
        {
          backgroundColor: 'rgba(148, 163, 184, 0.1)',
          borderColor: 'rgba(148, 163, 184, 0.2)',
        },
      ]}
    >
      <Text style={[styles.roleText, { color: THEME.slate }]}>MEMBER</Text>
    </View>
  );
};

// --- HELPER COMPONENT: STATUS DOT ---
const StatusDot = ({ status }: { status: TicketStatus }) => {
  const colors = {
    open: '#3b82f6',
    in_progress: '#eab308',
    pending: '#a855f7',
    resolved: '#10b981',
    closed: '#64748b',
  };
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors[status] || colors.open,
      }}
    />
  );
};

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function SupportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // ROLE CHECK
  const userRole = user?.profile?.role || 'MEMBER';
  const isStaff = STAFF_ROLES.includes(userRole);

  // STATE: TABS & DATA
  const [activeTab, setActiveTab] = useState<'my_tickets' | 'queue' | 'faq'>(
    isStaff ? 'queue' : 'my_tickets',
  );
  const [tickets, setTickets] = useState<TicketUI[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // STATE: MODALS
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  // STATE: SELECTED ITEM & FORMS
  const [selectedTicket, setSelectedTicket] = useState<TicketUI | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [reply, setReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================================================
  // 1. DATA LOADING LOGIC
  // ==========================================================================
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // FIX: Removed 'email' from the select string because it doesn't exist on public.profiles
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

      // Transform Data
      const safeData: TicketUI[] = (data || []).map((t: any) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        updated_at: t.updated_at,
        user_id: t.user_id,
        // Fallback for email since we aren't fetching it anymore
        user: t.user
          ? { ...t.user, email: 'Hidden' }
          : { full_name: 'Unknown', email: '', role: 'MEMBER' },
      }));

      setTickets(safeData);
      setFilteredTickets(safeData);
    } catch (e: any) {
      console.error('Load Tickets Error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, isStaff]);

  // Load on focus and tab change
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Search Filter Effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTickets(tickets);
    } else {
      const lower = searchQuery.toLowerCase();
      const filtered = tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(lower) ||
          t.id.toLowerCase().includes(lower) ||
          (t.user?.full_name && t.user.full_name.toLowerCase().includes(lower)),
      );
      setFilteredTickets(filtered);
    }
  }, [searchQuery, tickets]);

  // ==========================================================================
  // 2. ACTION HANDLERS
  // ==========================================================================

  // CREATE NEW TICKET
  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Required', 'Please fill in both subject and message.');
      return;
    }

    setIsSubmitting(true);
    try {
      // A. Insert Ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          user_id: user!.id,
          subject: subject,
          category: 'General',
          status: 'open',
          priority: 'medium',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // B. Insert Initial Message
      const { error: msgError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          user_id: user!.id,
          message: message,
          is_internal: false,
        });

      if (msgError) throw msgError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreateModalVisible(false);
      setSubject('');
      setMessage('');
      loadData(); // Refresh list
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // LOAD TICKET DETAILS (Includes Messages)
  const loadTicketDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      // FIX: Removed 'email' from user:profiles select
      const { data, error } = await supabase
        .from('tickets')
        .select(
          `
          *,
          messages:ticket_messages(
            *,
            author:profiles!ticket_messages_user_id_fkey(full_name, role, avatar_url)
          ),
          user:profiles!tickets_user_id_fkey(full_name, role, avatar_url)
        `,
        )
        .eq('id', id)
        .order('created_at', {
          foreignTable: 'ticket_messages',
          ascending: true,
        })
        .single();

      if (error) throw error;

      const messages = (data.messages || []).filter((msg: any) => {
        if (!isStaff && msg.is_internal) return false;
        return true;
      });

      // Mock email in the UI object since we can't fetch it from profiles
      const ticketWithUser = {
        ...data,
        user: data.user ? { ...data.user, email: '' } : undefined,
        messages,
      };

      setSelectedTicket(ticketWithUser as any);
      setDetailModalVisible(true);
    } catch (e: any) {
      console.error('Load Detail Error:', e);
      Alert.alert('Error', 'Could not load ticket details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // SEND REPLY (Supports Internal Notes)
  const handleReply = async (isInternal: boolean) => {
    if (!selectedTicket || !user) return;
    const content = isInternal ? internalNote : reply;

    if (!content.trim()) return;

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
      else setReply('');

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await loadTicketDetails(selectedTicket.id); // Refresh conversation
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // UPDATE STATUS
  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setSelectedTicket((prev) =>
        prev ? { ...prev, status: newStatus } : null,
      );
      setStatusModalVisible(false);
      loadData(); // Refresh main list
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // ==========================================================================
  // 3. RENDERERS
  // ==========================================================================

  const renderTicketItem = ({ item }: ListRenderItemInfo<TicketUI>) => {
    const statusColor =
      item.status === 'resolved'
        ? THEME.success
        : item.status === 'in_progress'
          ? THEME.warning
          : item.status === 'closed'
            ? THEME.slate
            : THEME.indigo;

    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <Bento3DCard
          onPress={() => loadTicketDetails(item.id)}
          className="mb-3 border bg-slate-900/50 border-white/5 active:bg-slate-800/80"
        >
          <View style={styles.cardRow}>
            {/* LEFT: INFO */}
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text style={styles.ticketSubject} numberOfLines={1}>
                  {item.subject}
                </Text>
                {item.priority === 'high' && (
                  <AlertTriangle
                    size={14}
                    color={THEME.danger}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Text style={styles.ticketMeta}>
                  #{item.id.substring(0, 6)}
                </Text>
                <View style={styles.dotSeparator} />
                <Text style={styles.ticketMeta}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>

                {/* Staff sees who created it */}
                {isStaff && item.user && (
                  <>
                    <View style={styles.dotSeparator} />
                    <View style={styles.miniUserBadge}>
                      <User size={10} color="#94a3b8" />
                      <Text style={styles.miniUserName}>
                        {item.user.full_name}
                      </Text>
                      <RoleBadge role={item.user.role} />
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* RIGHT: STATUS */}
            <View
              style={[
                styles.statusPill,
                {
                  borderColor: statusColor + '40',
                  backgroundColor: statusColor + '10',
                },
              ]}
            >
              <StatusDot status={item.status} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </Bento3DCard>
      </Animated.View>
    );
  };

  // ==========================================================================
  // 4. MAIN LAYOUT
  // ==========================================================================
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Support Center</Text>
          {isStaff && (
            <View style={styles.staffBadge}>
              <ShieldAlert size={12} color="#818cf8" />
              <Text style={styles.staffText}>STAFF MODE</Text>
            </View>
          )}
        </View>

        {/* TABS */}
        <View style={styles.tabContainer}>
          {isStaff && (
            <TabButton
              title="Queue"
              count={tickets.length}
              isActive={activeTab === 'queue'}
              onPress={() => setActiveTab('queue')}
            />
          )}
          <TabButton
            title="My Tickets"
            isActive={activeTab === 'my_tickets'}
            onPress={() => setActiveTab('my_tickets')}
          />
          <TabButton
            title="FAQ"
            isActive={activeTab === 'faq'}
            onPress={() => setActiveTab('faq')}
          />
        </View>
      </View>

      {/* BODY CONTENT */}
      <View style={styles.content}>
        {/* SEARCH BAR (Only for ticket lists) */}
        {activeTab !== 'faq' && (
          <View style={styles.searchBar}>
            <Search size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tickets..."
              placeholderTextColor="#475569"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* FAQ VIEW */}
        {activeTab === 'faq' ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <GlassCard className="p-6 mb-4 bg-slate-900/40 border-white/5">
              <View style={styles.faqHeader}>
                <HelpCircle size={24} color={THEME.indigo} />
                <Text style={styles.faqTitle}>How do sprints work?</Text>
              </View>
              <Text style={styles.faqText}>
                Daily sprints are AI-generated tasks tailored to your skill
                gaps. Completing them earns XP and maintains your streak.
              </Text>
            </GlassCard>
            <GlassCard className="p-6 bg-slate-900/40 border-white/5">
              <View style={styles.faqHeader}>
                <ShieldCheck size={24} color={THEME.success} />
                <Text style={styles.faqTitle}>Data Privacy</Text>
              </View>
              <Text style={styles.faqText}>
                We use AES-256 encryption. Your data is never sold to third
                parties.
              </Text>
            </GlassCard>
          </ScrollView>
        ) : /* TICKET LIST VIEW */
        loading ? (
          <View style={styles.centerEmpty}>
            <ActivityIndicator color={THEME.indigo} size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredTickets}
            keyExtractor={(i) => i.id}
            renderItem={renderTicketItem}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadData}
                tintColor={THEME.indigo}
              />
            }
            ListEmptyComponent={
              <View style={styles.centerEmpty}>
                <MessageSquare size={48} color="#334155" />
                <Text style={styles.emptyText}>No tickets found.</Text>
                <Text style={styles.emptySub}>Create one to get started.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* FAB - CREATE TICKET */}
      {(!isStaff || activeTab === 'my_tickets') && activeTab !== 'faq' && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setCreateModalVisible(true);
          }}
          style={styles.fab}
        >
          <Plus size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* ===================================================================
          MODALS SECTION
         =================================================================== */}

      {/* 1. CREATE TICKET MODAL */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Request</Text>
                <TouchableOpacity
                  onPress={() => setCreateModalVisible(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <Text style={styles.label}>Subject</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Brief summary..."
                  placeholderTextColor="#475569"
                  value={subject}
                  onChangeText={setSubject}
                />
                <Text style={styles.label}>Message</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    { height: 160, textAlignVertical: 'top' },
                  ]}
                  placeholder="Describe your issue..."
                  placeholderTextColor="#475569"
                  multiline
                  value={message}
                  onChangeText={setMessage}
                />
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={isSubmitting}
                  style={styles.primaryButton}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#020617" />
                  ) : (
                    <Text style={styles.primaryButtonText}>SUBMIT TICKET</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 2. TICKET DETAILS MODAL */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
          {/* Modal Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity
              onPress={() => setDetailModalVisible(false)}
              style={styles.closeButton}
            >
              <X size={20} color="white" />
            </TouchableOpacity>

            {/* Status Changer (Staff Only) */}
            {isStaff ? (
              <TouchableOpacity
                onPress={() => setStatusModalVisible(true)}
                style={styles.statusDropdown}
              >
                <Text style={styles.statusDropdownText}>
                  {selectedTicket?.status.replace('_', ' ')}
                </Text>
                <ChevronDown size={14} color="#818cf8" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.statusPill, { borderColor: THEME.indigo }]}>
                <Text style={[styles.statusText, { color: THEME.indigo }]}>
                  {selectedTicket?.status.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={{ flex: 1, padding: 20 }}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {selectedTicket && (
                <>
                  {/* Ticket Info Card */}
                  <GlassCard className="p-5 mb-8 bg-slate-900/40 border-white/10">
                    <Text style={styles.detailSubject}>
                      {selectedTicket.subject}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 12,
                      }}
                    >
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryText}>
                          {selectedTicket.category}
                        </Text>
                      </View>
                      <Clock
                        size={12}
                        color="#64748b"
                        style={{ marginRight: 4, marginLeft: 12 }}
                      />
                      <Text style={styles.detailDate}>
                        {new Date(selectedTicket.created_at).toLocaleString()}
                      </Text>
                    </View>
                    {/* User Info inside details */}
                    {selectedTicket.user && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 16,
                          paddingTop: 16,
                          borderTopWidth: 1,
                          borderTopColor: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: 'rgba(99,102,241,0.2)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 8,
                          }}
                        >
                          <Text
                            style={{ color: '#818cf8', fontWeight: 'bold' }}
                          >
                            {selectedTicket.user.full_name[0]}
                          </Text>
                        </View>
                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                          {selectedTicket.user.full_name}
                        </Text>
                        <View style={{ marginLeft: 8 }}>
                          <RoleBadge role={selectedTicket.user.role} />
                        </View>
                      </View>
                    )}
                  </GlassCard>

                  {/* Conversation Thread */}
                  <View style={{ gap: 16, paddingBottom: 20 }}>
                    {selectedTicket.messages?.map((msg) => {
                      const isMe = msg.user_id === user?.id;
                      return (
                        <View
                          key={msg.id}
                          style={[
                            styles.messageBubble,
                            isMe ? styles.messageMe : styles.messageOther,
                            msg.is_internal && styles.messageInternal,
                          ]}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginBottom: 6,
                              justifyContent: 'space-between',
                            }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={[
                                  styles.messageAuthor,
                                  msg.is_internal && { color: '#facc15' },
                                ]}
                              >
                                {msg.author?.full_name || 'User'}
                              </Text>
                              {msg.author && (
                                <View style={{ marginLeft: 6 }}>
                                  <RoleBadge role={msg.author.role} />
                                </View>
                              )}
                            </View>
                            {msg.is_internal && (
                              <Lock size={12} color="#facc15" />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.messageText,
                              msg.is_internal && { color: '#fef08a' },
                            ]}
                          >
                            {msg.message}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Reply Box */}
            <View style={styles.replyContainer}>
              {isStaff && (
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <TextInput
                    style={[
                      styles.replyInput,
                      {
                        borderColor: 'rgba(234, 179, 8, 0.3)',
                        color: '#facc15',
                      },
                    ]}
                    placeholder="Internal Staff Note (Hidden from user)..."
                    placeholderTextColor="#64748b"
                    value={internalNote}
                    onChangeText={setInternalNote}
                  />
                  <TouchableOpacity
                    onPress={() => handleReply(true)}
                    disabled={isSubmitting}
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(234, 179, 8, 0.3)',
                      },
                    ]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#facc15" />
                    ) : (
                      <Lock size={20} color="#facc15" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flexDirection: 'row' }}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type a reply..."
                  placeholderTextColor="#475569"
                  multiline
                  value={reply}
                  onChangeText={setReply}
                />
                <TouchableOpacity
                  onPress={() => handleReply(false)}
                  disabled={isSubmitting}
                  style={styles.sendButton}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#020617" />
                  ) : (
                    <Send size={24} color="#020617" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* 3. STATUS CHANGE MODAL */}
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
            {(
              ['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]
            ).map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleStatusChange(status)}
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
                  <CheckCircle size={20} color={THEME.indigo} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// 💅 STYLES & SUBCOMPONENTS
// ============================================================================

const TabButton = ({ title, isActive, onPress, count }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.tabBtn, isActive && styles.tabBtnActive]}
  >
    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
      {title}
    </Text>
    {/* Optional count badge could go here */}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },

  // HEADER
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#020617',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: 'white' },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
  },
  staffText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // TABS
  tabContainer: { flexDirection: 'row', gap: 10 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabBtnActive: { backgroundColor: THEME.indigo, borderColor: THEME.indigo },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 12 },
  tabTextActive: { color: 'white' },

  // CONTENT
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.5)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  searchInput: { flex: 1, color: 'white', marginLeft: 10, fontSize: 16 },
  centerEmpty: { alignItems: 'center', marginTop: 80, opacity: 0.5 },
  emptyText: {
    color: '#94a3b8',
    marginTop: 16,
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptySub: { color: '#64748b', marginTop: 4 },

  // TICKET CARD
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ticketSubject: { color: 'white', fontSize: 16, fontWeight: '700' },
  ticketMeta: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    marginHorizontal: 6,
  },
  miniUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniUserName: {
    color: '#94a3b8',
    fontSize: 10,
    marginLeft: 4,
    fontWeight: 'bold',
    marginRight: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },

  // ROLES
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleText: { fontSize: 8, fontWeight: '900', marginLeft: 2 },

  // FAQ
  faqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  faqTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  faqText: { color: '#94a3b8', lineHeight: 22 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.indigo,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '90%',
    padding: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 24, fontWeight: '900', color: 'white' },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 99,
  },
  label: {
    color: THEME.indigo,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputField: {
    backgroundColor: 'rgba(15,23,42,0.5)',
    color: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: THEME.indigo,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#020617', fontWeight: '900', fontSize: 16 },

  // DETAILS
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statusDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
  },
  statusDropdownText: {
    color: '#818cf8',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 6,
    textTransform: 'uppercase',
  },
  detailSubject: {
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
    marginBottom: 4,
  },
  categoryTag: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailDate: { color: '#64748b', fontSize: 12 },

  // MESSAGES
  messageBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  messageMe: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  messageInternal: {
    marginLeft: 20,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  messageAuthor: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  messageText: { color: 'white', fontSize: 15, lineHeight: 22 },

  // REPLY AREA
  replyContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0f172a',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#020617',
    color: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.indigo,
    borderRadius: 16,
  },

  // STATUS MODAL
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
