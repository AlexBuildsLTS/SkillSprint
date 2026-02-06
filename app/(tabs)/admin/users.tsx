import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Ban,
  CheckCircle,
  UserCog,
  ChevronLeft,
  Trash2,
  Calendar,
  X,
  ShieldAlert,
  Clock,
  Mail,
  Fingerprint,
  AlertTriangle, // Added for Delete Modal
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Bento3DCard } from '@/components/ui/Bento3DCard';
import { GlassCard } from '@/components/ui/GlassCard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  white: '#ffffff',
  surface: 'rgba(30, 41, 59, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

type UserRole = 'MEMBER' | 'PREMIUM' | 'MODERATOR' | 'ADMIN';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  status?: 'active' | 'banned' | 'suspended';
  banned_until?: string;
  created_at: string;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modals
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false); // NEW STATE
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data as UserProfile[]);
    } catch (e: any) {
      console.error('Fetch error:', e);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, []),
  );

  // --- ACTIONS ---

  const handleRoleUpdate = async (newRole: UserRole) => {
    if (!selectedUser) return;
    triggerHaptic('selection');
    setRoleModalVisible(false);
    setProcessingId(selectedUser.id);

    try {
      const { error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: selectedUser.id,
        new_role: newRole,
      });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, role: newRole } : u,
        ),
      );
      Alert.alert('Role Updated', `${selectedUser.username} is now ${newRole}`);
    } catch (e: any) {
      Alert.alert('Update Failed', e.message);
    } finally {
      setProcessingId(null);
      setSelectedUser(null);
    }
  };

  const executeBan = async (durationDays: number | null) => {
    if (!selectedUser) return;
    triggerHaptic('warning');
    setBanModalVisible(false);
    setProcessingId(selectedUser.id);

    let banUntil = null;
    if (durationDays) {
      const d = new Date();
      d.setDate(d.getDate() + durationDays);
      banUntil = d.toISOString();
    }

    try {
      const { error } = await supabase.functions.invoke('admin-deactivate', {
        body: {
          userId: selectedUser.id,
          banUntil: banUntil, // Matches your fixed Edge Function payload
        },
      });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, status: 'banned', banned_until: banUntil || undefined }
            : u,
        ),
      );

      Alert.alert(
        'User Restricted',
        `${selectedUser.username} access revoked.`,
      );
    } catch (e: any) {
      Alert.alert('Deactivation Failed', e.message);
    } finally {
      setProcessingId(null);
      setSelectedUser(null);
    }
  };

  const handleUnban = async (user: UserProfile) => {
    triggerHaptic('success');
    setProcessingId(user.id);
    try {
      // Use the Edge Function for unban to ensure Auth status is cleared
      const { error } = await supabase.functions.invoke('admin-deactivate', {
        body: { userId: user.id, banUntil: null },
      });
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: 'active' } : u)),
      );
      Alert.alert('Success', 'User unbanned successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcessingId(null);
    }
  };

  // TRIGGER DELETE MODAL INSTEAD OF NATIVE ALERT
  const handleDeleteTrigger = (user: UserProfile) => {
    triggerHaptic('warning');
    setSelectedUser(user);
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    if (!selectedUser) return;
    setDeleteModalVisible(false);
    setProcessingId(selectedUser.id);

    try {
      const { error } = await supabase.functions.invoke('admin-delete', {
        body: { userId: selectedUser.id },
      });

      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      Alert.alert('Success', 'User deleted permanently.');
    } catch (e: any) {
      Alert.alert('Delete Failed', e.message);
    } finally {
      setProcessingId(null);
      setSelectedUser(null);
    }
  };

  const triggerHaptic = (type: 'selection' | 'success' | 'warning') => {
    if (Platform.OS !== 'web') {
      if (type === 'selection') Haptics.selectionAsync();
      if (type === 'success')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (type === 'warning')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  // --- RENDER CARD ---
  const renderUserCard = ({
    item,
    index,
  }: {
    item: UserProfile;
    index: number;
  }) => {
    const isBanned = item.status === 'banned';
    const roleColor =
      item.role === 'ADMIN'
        ? THEME.danger
        : item.role === 'MODERATOR'
          ? THEME.success
          : item.role === 'PREMIUM'
            ? THEME.warning
            : THEME.slate;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.cardContainer}
      >
        <Bento3DCard style={{ flex: 1 }}>
          <View style={[styles.cardInner, isBanned && styles.cardBanned]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.userInfoLeft}>
                <View style={styles.avatarWrapper}>
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {item.username?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.textStack}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.userName,
                        isBanned && styles.strikethrough,
                      ]}
                      numberOfLines={1}
                    >
                      {item.full_name || item.username}
                    </Text>
                    {isBanned ? (
                      <View style={styles.bannedBadge}>
                        <Text style={styles.bannedText}>BANNED</Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.rolePill,
                          {
                            borderColor: roleColor + '40',
                            backgroundColor: roleColor + '10',
                          },
                        ]}
                      >
                        <Text style={[styles.roleText, { color: roleColor }]}>
                          {item.role}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.metaRow}>
                    <Mail size={10} color={THEME.slate} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.username}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Fingerprint size={10} color={THEME.slate} />
                    <Text style={styles.metaText}>
                      ID: {item.id.slice(0, 8)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setSelectedUser(item);
                  setRoleModalVisible(true);
                }}
              >
                <UserCog size={18} color={THEME.indigo} />
                <Text style={styles.actionText}>Role</Text>
              </TouchableOpacity>

              {isBanned ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleUnban(item)}
                >
                  {processingId === item.id ? (
                    <ActivityIndicator size="small" color={THEME.success} />
                  ) : (
                    <CheckCircle size={18} color={THEME.success} />
                  )}
                  <Text style={[styles.actionText, { color: THEME.success }]}>
                    Activate
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setSelectedUser(item);
                    setBanModalVisible(true);
                  }}
                >
                  <Ban size={18} color={THEME.warning} />
                  <Text style={[styles.actionText, { color: THEME.warning }]}>
                    Ban
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDeleteTrigger(item)}
              >
                {processingId === item.id && item.status !== 'banned' ? (
                  <ActivityIndicator size="small" color={THEME.danger} />
                ) : (
                  <Trash2 size={18} color={THEME.danger} />
                )}
                <Text style={[styles.actionText, { color: THEME.danger }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Bento3DCard>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* TOP HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={THEME.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>User Directory</Text>
            <Text style={styles.headerSub}>{users.length} Active Accounts</Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchSection}>
          <GlassCard style={styles.searchBar} intensity="light">
            <Search size={20} color={THEME.slate} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor={THEME.slate}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color={THEME.slate} />
              </TouchableOpacity>
            )}
          </GlassCard>
        </View>

        {/* LIST */}
        <FlatList
          data={users.filter(
            (u) =>
              u.username.toLowerCase().includes(search.toLowerCase()) ||
              u.id.includes(search),
          )}
          keyExtractor={(item) => item.id}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadUsers}
              tintColor={THEME.indigo}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <UsersIconPlaceholder />
              <Text style={styles.emptyText}>No users matching "{search}"</Text>
            </View>
          }
        />

        {/* --- MODALS --- */}

        {/* 1. ROLE MODAL */}
        <Modal
          visible={roleModalVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalCard} intensity="heavy">
              <View style={styles.modalHeader}>
                <UserCog size={32} color={THEME.indigo} />
                <Text style={styles.modalTitle}>Modify Access Level</Text>
                <Text style={styles.modalSub}>
                  Updating role for{' '}
                  <Text style={{ color: THEME.white, fontWeight: 'bold' }}>
                    {selectedUser?.username}
                  </Text>
                </Text>
              </View>
              <View style={styles.roleList}>
                {['MEMBER', 'PREMIUM', 'MODERATOR', 'ADMIN'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.modalOption,
                      selectedUser?.role === role && styles.modalOptionActive,
                    ]}
                    onPress={() => handleRoleUpdate(role as UserRole)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        selectedUser?.role === role && { color: THEME.white },
                      ]}
                    >
                      {role}
                    </Text>
                    {selectedUser?.role === role && (
                      <CheckCircle size={18} color={THEME.white} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setRoleModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>

        {/* 2. BAN MODAL */}
        <Modal
          visible={banModalVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalCard} intensity="heavy">
              <View style={styles.modalHeader}>
                <ShieldAlert size={32} color={THEME.warning} />
                <Text style={styles.modalTitle}>Restrict Account</Text>
                <Text style={styles.modalSub}>
                  This will force log out the user.
                </Text>
              </View>
              <View style={styles.actionList}>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => executeBan(1)}
                >
                  <Clock size={20} color={THEME.slate} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.modalOptionText}>24 Hour Timeout</Text>
                    <Text style={styles.modalOptionSub}>
                      Temporary restriction
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => executeBan(7)}
                >
                  <Calendar size={20} color={THEME.slate} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.modalOptionText}>7 Day Suspension</Text>
                    <Text style={styles.modalOptionSub}>Standard penalty</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    {
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    },
                  ]}
                  onPress={() => executeBan(null)}
                >
                  <Ban size={20} color={THEME.danger} />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={[styles.modalOptionText, { color: THEME.danger }]}
                    >
                      Permanent Ban
                    </Text>
                    <Text
                      style={[
                        styles.modalOptionSub,
                        { color: 'rgba(239,68,68,0.6)' },
                      ]}
                    >
                      Indefinite restriction
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setBanModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>

        {/* 3. DELETE MODAL (NEW GLASS CARD POPUP) */}
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalCard} intensity="heavy">
              <View style={styles.modalHeader}>
                <AlertTriangle size={40} color={THEME.danger} />
                <Text
                  style={[
                    styles.modalTitle,
                    { color: THEME.danger, marginTop: 16 },
                  ]}
                >
                  Permanent Deletion
                </Text>
                <Text style={styles.modalSub}>
                  Are you absolutely sure you want to delete{' '}
                  {selectedUser?.username}? This action cannot be undone.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={executeDelete}
              >
                <Text style={styles.deleteConfirmText}>
                  CONFIRM PERMANENT DELETE
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// Helper for empty state icon
const UsersIconPlaceholder = () => (
  <View
    style={{
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(255,255,255,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    }}
  >
    <Search size={30} color={THEME.slate} />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: THEME.white },
  headerSub: { fontSize: 12, color: THEME.slate, fontWeight: '600' },
  searchSection: { paddingHorizontal: 24, marginBottom: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 18,
    gap: 12,
  },
  searchInput: { flex: 1, color: THEME.white, fontSize: 16, height: '100%' },
  listContent: { paddingHorizontal: 24, paddingBottom: 100, gap: 16 },
  cardContainer: { height: 165 },
  cardInner: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: 'space-between',
  },
  cardBanned: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfoLeft: { flexDirection: 'row', gap: 14, flex: 1 },
  // SLEEK ROUND AVATARS
  avatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 26 },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: THEME.indigo, fontWeight: '800', fontSize: 20 },
  textStack: { flex: 1, justifyContent: 'center', gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: {
    color: THEME.white,
    fontWeight: '700',
    fontSize: 16,
    maxWidth: '60%',
  },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.6 },
  bannedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: THEME.danger,
    borderRadius: 4,
  },
  bannedText: { color: 'white', fontSize: 8, fontWeight: '900' },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: THEME.slate, fontSize: 11, fontWeight: '500' },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionText: { fontSize: 11, fontWeight: '700', color: THEME.slate },
  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.6 },
  emptyText: { color: THEME.slate, fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.white,
    marginTop: 12,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: THEME.slate,
    textAlign: 'center',
    lineHeight: 20,
  },
  roleList: { gap: 10, marginBottom: 20 },
  actionList: { gap: 10, marginBottom: 20 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: THEME.indigo,
  },
  modalOptionText: { fontSize: 15, fontWeight: '600', color: THEME.slate },
  modalOptionSub: {
    fontSize: 11,
    color: THEME.slate,
    marginTop: 2,
    opacity: 0.7,
  },
  modalCancel: { paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: THEME.slate, fontWeight: '700', fontSize: 14 },
  deleteConfirmBtn: {
    backgroundColor: THEME.danger,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  deleteConfirmText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
