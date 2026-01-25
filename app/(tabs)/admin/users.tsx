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
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Ban,
  CheckCircle,
  Mail,
  Shield,
  UserCog,
  Clock,
  X,
  ChevronLeft,
  User as UserIcon,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Bento3DCard } from '@/components/ui/Bento3DCard';

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  white: '#ffffff',
};

type UserRole = 'MEMBER' | 'PREMIUM' | 'MODERATOR' | 'ADMIN';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  status?: 'active' | 'banned' | 'suspended';
  created_at: string;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [roleModalVisible, setRoleModalVisible] = useState(false);
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
    setRoleModalVisible(false);

    // Optimistic Update
    const prevUsers = [...users];
    setUsers(
      users.map((u) =>
        u.id === selectedUser.id ? { ...u, role: newRole } : u,
      ),
    );

    try {
      // Call the secure SQL function we created
      const { error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: selectedUser.id,
        new_role: newRole,
      });

      if (error) throw error;
      Alert.alert('Success', `Role updated to ${newRole}`);
    } catch (e: any) {
      setUsers(prevUsers); // Revert on error
      Alert.alert('Error', e.message);
    }
  };

  const handleBanToggle = async (user: UserProfile) => {
    if (actionLoading) return;
    const newStatus = user.status === 'banned' ? 'active' : 'banned';

    Alert.alert(
      `Confirm ${newStatus === 'banned' ? 'Ban' : 'Unban'}`,
      `Are you sure you want to ${newStatus === 'banned' ? 'ban' : 'unban'} ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(user.id);
            try {
              // Call the secure SQL function
              const { error } = await supabase.rpc('admin_update_user_status', {
                target_user_id: user.id,
                new_status: newStatus,
              });

              if (error) throw error;

              // Local update
              setUsers(
                users.map((u) =>
                  u.id === user.id ? { ...u, status: newStatus } : u,
                ),
              );
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  // --- RENDER ---

  const renderUserCard = ({ item }: { item: UserProfile }) => {
    const isBanned = item.status === 'banned';
    return (
      <Bento3DCard
        className={`mb-3 border ${isBanned ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900/40 border-white/5'}`}
        onPress={() => {}} // Could open detail view
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {/* Avatar */}
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {item.username?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}

            {/* Info */}
            <View style={{ marginLeft: 12 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text
                  style={[
                    styles.userName,
                    isBanned && {
                      textDecorationLine: 'line-through',
                      color: THEME.danger,
                    },
                  ]}
                >
                  {item.full_name || item.username}
                </Text>
                {/* Role Badge Inline */}
                <View
                  style={[
                    styles.roleBadge,
                    {
                      borderColor:
                        item.role === 'ADMIN'
                          ? THEME.danger
                          : item.role === 'MODERATOR'
                            ? THEME.success
                            : 'rgba(255,255,255,0.2)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      {
                        color:
                          item.role === 'ADMIN'
                            ? THEME.danger
                            : item.role === 'MODERATOR'
                              ? THEME.success
                              : THEME.slate,
                      },
                    ]}
                  >
                    {item.role}
                  </Text>
                </View>
              </View>
              <Text style={styles.userEmail}>@{item.username}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                setSelectedUser(item);
                setRoleModalVisible(true);
              }}
              style={styles.actionBtn}
            >
              <UserCog size={18} color={THEME.indigo} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleBanToggle(item)}
              style={[
                styles.actionBtn,
                { borderColor: isBanned ? THEME.success : THEME.danger },
              ]}
            >
              {actionLoading === item.id ? (
                <ActivityIndicator size="small" color="white" />
              ) : isBanned ? (
                <CheckCircle size={18} color={THEME.success} />
              ) : (
                <Ban size={18} color={THEME.danger} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Bento3DCard>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.obsidian }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Directory</Text>
        </View>

        {/* SEARCH */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View style={styles.searchBar}>
            <Search size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor="#475569"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* LIST */}
        <FlatList
          data={users.filter(
            (u) =>
              (u.full_name?.toLowerCase() || '').includes(
                search.toLowerCase(),
              ) ||
              (u.username?.toLowerCase() || '').includes(search.toLowerCase()),
          )}
          keyExtractor={(item) => item.id}
          renderItem={renderUserCard}
          contentContainerStyle={{ padding: 24, paddingTop: 0 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadUsers}
              tintColor={THEME.indigo}
            />
          }
        />

        {/* ROLE CHANGE MODAL */}
        <Modal
          visible={roleModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRoleModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change Role</Text>
              <Text style={styles.modalSub}>
                Select new role for {selectedUser?.username}
              </Text>

              <View style={{ gap: 8, marginTop: 16 }}>
                {['MEMBER', 'PREMIUM', 'MODERATOR', 'ADMIN'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    onPress={() => handleRoleUpdate(role as UserRole)}
                    style={[
                      styles.roleOption,
                      selectedUser?.role === role && styles.roleOptionActive,
                    ]}
                  >
                    <Text style={styles.roleOptionText}>{role}</Text>
                    {selectedUser?.role === role && (
                      <CheckCircle size={16} color={THEME.indigo} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => setRoleModalVisible(false)}
                style={{ marginTop: 20, alignItems: 'center' }}
              >
                <Text style={{ color: '#64748b' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  backBtn: {
    marginRight: 16,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: 'white' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchInput: { flex: 1, marginLeft: 12, color: 'white', fontSize: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: THEME.indigo, fontWeight: 'bold' },
  userName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  userEmail: { color: '#64748b', fontSize: 12 },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  roleText: { fontSize: 9, fontWeight: '800' },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  modalSub: { color: '#64748b', textAlign: 'center', marginBottom: 12 },
  roleOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleOptionActive: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderColor: THEME.indigo,
    borderWidth: 1,
  },
  roleOptionText: { color: 'white', fontWeight: 'bold' },
});
