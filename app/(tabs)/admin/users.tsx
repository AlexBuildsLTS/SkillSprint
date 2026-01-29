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
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Bento3DCard } from '@/components/ui/Bento3DCard';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isDesktop = width >= 768;

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
  banned_until?: string; // For temporary bans
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
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [banDate, setBanDate] = useState(''); // Simple text input for date YYYY-MM-DD

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
    setProcessingId(selectedUser.id);

    try {
      // Direct SQL update via RPC is faster/safer if you have it, 
      // otherwise use the edge function pattern you established.
      // We'll assume the RPC for roles as it's cleaner for simple updates.
      const { error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: selectedUser.id,
        new_role: newRole,
      });

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
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
    setBanModalVisible(false);
    setProcessingId(selectedUser.id);

    // Calculate date if duration provided, else permanent (null date or far future)
    let banUntil = null;
    if (durationDays) {
        const d = new Date();
        d.setDate(d.getDate() + durationDays);
        banUntil = d.toISOString();
    }

    try {
        // Call your Edge Function for deactivation
        const { error } = await supabase.functions.invoke('admin-deactivate', {
            body: { 
                userId: selectedUser.id, 
                banUntil: banUntil // Pass this to your function if it supports it
            }
        });

        if (error) throw error;

        setUsers(prev => prev.map(u => 
            u.id === selectedUser.id ? { ...u, status: 'banned', banned_until: banUntil || undefined } : u
        ));
        
        Alert.alert('User Deactivated', `${selectedUser.username} has been restricted.`);
    } catch (e: any) {
        Alert.alert('Deactivation Failed', e.message);
    } finally {
        setProcessingId(null);
        setSelectedUser(null);
    }
  };

  const handleUnban = async (user: UserProfile) => {
      setProcessingId(user.id);
      try {
          // Reactivate via RPC or Function
          const { error } = await supabase.rpc('admin_update_user_status', {
              target_user_id: user.id,
              new_status: 'active'
          });
          if (error) throw error;

          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'active' } : u));
      } catch (e: any) {
          Alert.alert('Error', e.message);
      } finally {
          setProcessingId(null);
      }
  };

  const handleDelete = (user: UserProfile) => {
    Alert.alert(
        'Critical Action',
        `Permanently delete ${user.username}? This cannot be undone.`,
        [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'DELETE', 
                style: 'destructive',
                onPress: async () => {
                    setProcessingId(user.id);
                    try {
                        const { error } = await supabase.functions.invoke('admin-delete', {
                            body: { userId: user.id }
                        });
                        if (error) throw error;
                        
                        setUsers(prev => prev.filter(u => u.id !== user.id));
                        Alert.alert('Deleted', 'User removed from database.');
                    } catch (e: any) {
                        Alert.alert('Delete Failed', e.message);
                    } finally {
                        setProcessingId(null);
                    }
                }
            }
        ]
    );
  };

  // --- RENDER ITEM ---

  const renderUserCard = ({ item }: { item: UserProfile }) => {
    const isBanned = item.status === 'banned';
    return (
      <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 12 }}>
        <Bento3DCard style={{ width: '100%' }}>
          <View style={[styles.cardContent, isBanned && styles.cardBanned]}>
            
            {/* LEFT: INFO */}
            <View style={styles.cardLeft}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{item.username?.[0]?.toUpperCase()}</Text>
                </View>
              )}
              
              <View style={{ marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.userName, isBanned && styles.textBanned]}>
                    {item.full_name || item.username}
                  </Text>
                  {/* Role Badge */}
                  <View style={[
                    styles.roleBadge, 
                    item.role === 'ADMIN' ? { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: THEME.danger } : 
                    item.role === 'MODERATOR' ? { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: THEME.success } : {}
                  ]}>
                    <Text style={[
                      styles.roleText, 
                      item.role === 'ADMIN' ? { color: THEME.danger } : 
                      item.role === 'MODERATOR' ? { color: THEME.success } : { color: THEME.slate }
                    ]}>
                      {item.role}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userEmail}>ID: {item.id.slice(0, 8)}... • Joined {new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </View>

            {/* RIGHT: ACTIONS */}
            <View style={styles.cardActions}>
              <TouchableOpacity 
                onPress={() => { setSelectedUser(item); setRoleModalVisible(true); }}
                style={styles.iconBtn}
              >
                <UserCog size={18} color={THEME.indigo} />
              </TouchableOpacity>

              {isBanned ? (
                 <TouchableOpacity 
                    onPress={() => handleUnban(item)}
                    style={[styles.iconBtn, { borderColor: THEME.success }]}
                 >
                    {processingId === item.id ? <ActivityIndicator size="small" color={THEME.success} /> : <CheckCircle size={18} color={THEME.success} />}
                 </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                    onPress={() => { setSelectedUser(item); setBanModalVisible(true); }}
                    style={[styles.iconBtn, { borderColor: THEME.warning }]}
                >
                    <Ban size={18} color={THEME.warning} />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                onPress={() => handleDelete(item)}
                style={[styles.iconBtn, { borderColor: THEME.danger, backgroundColor: 'rgba(239,68,68,0.1)' }]}
              >
                 {processingId === item.id && item.status !== 'banned' ? <ActivityIndicator size="small" color={THEME.danger} /> : <Trash2 size={18} color={THEME.danger} />}
              </TouchableOpacity>
            </View>

          </View>
        </Bento3DCard>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
        {/* BACKGROUND GRADIENT */}
        <LinearGradient
            colors={[THEME.obsidian, '#0f172a']}
            style={StyleSheet.absoluteFill}
        />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={THEME.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Directory</Text>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={THEME.slate} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or ID..."
              placeholderTextColor={THEME.slate}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* USER LIST */}
        <FlatList
          data={users.filter(u => 
            u.username.toLowerCase().includes(search.toLowerCase()) || 
            u.full_name?.toLowerCase().includes(search.toLowerCase())
          )}
          keyExtractor={item => item.id}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadUsers} tintColor={THEME.indigo} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Text style={{ color: THEME.slate }}>No users found.</Text>
            </View>
          }
        />

        {/* ROLE MODAL */}
        <Modal visible={roleModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <Animated.View entering={SlideInUp.springify()} style={styles.modalBox}>
                    <Text style={styles.modalTitle}>Change Role</Text>
                    <Text style={styles.modalSub}>Select new access level for <Text style={{color: THEME.indigo}}>{selectedUser?.username}</Text></Text>
                    
                    <View style={styles.roleGrid}>
                        {['MEMBER', 'PREMIUM', 'MODERATOR', 'ADMIN'].map((role) => (
                            <TouchableOpacity 
                                key={role}
                                style={[styles.roleOption, selectedUser?.role === role && styles.roleOptionActive]}
                                onPress={() => handleRoleUpdate(role as UserRole)}
                            >
                                <Text style={[styles.roleOptionText, selectedUser?.role === role && { color: THEME.white }]}>{role}</Text>
                                {selectedUser?.role === role && <CheckCircle size={16} color={THEME.white} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity onPress={() => setRoleModalVisible(false)} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>

        {/* BAN/DEACTIVATE MODAL */}
        <Modal visible={banModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <Animated.View entering={SlideInUp.springify()} style={styles.modalBox}>
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                        <ShieldAlert size={40} color={THEME.warning} />
                    </View>
                    <Text style={styles.modalTitle}>Restrict Access</Text>
                    <Text style={styles.modalSub}>
                        Select restriction duration for <Text style={{color: THEME.warning}}>{selectedUser?.username}</Text>.
                        This will log the user out immediately.
                    </Text>

                    <View style={{ gap: 10, width: '100%', marginBottom: 20 }}>
                        <TouchableOpacity style={styles.banOption} onPress={() => executeBan(1)}>
                            <Clock size={18} color={THEME.slate} />
                            <Text style={styles.banOptionText}>24 Hours (Timeout)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.banOption} onPress={() => executeBan(7)}>
                            <Calendar size={18} color={THEME.slate} />
                            <Text style={styles.banOptionText}>7 Days (Suspension)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.banOption, { borderColor: THEME.danger }]} onPress={() => executeBan(null)}>
                            <Ban size={18} color={THEME.danger} />
                            <Text style={[styles.banOptionText, { color: THEME.danger }]}>Permanent Ban</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => setBanModalVisible(false)} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.white,
    letterSpacing: 0.5,
  },

  searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: { flex: 1, marginLeft: 12, color: THEME.white, fontSize: 16 },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // User Card Styles
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
  },
  cardBanned: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 14 },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: THEME.indigo, fontWeight: 'bold', fontSize: 16 },
  userName: { color: THEME.white, fontWeight: '700', fontSize: 15 },
  textBanned: { textDecorationLine: 'line-through', color: THEME.slate, opacity: 0.7 },
  userEmail: { color: THEME.slate, fontSize: 11, marginTop: 2 },
  
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  roleText: { fontSize: 9, fontWeight: '800' },

  cardActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: Math.min(width - 40, 400),
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: THEME.white, textAlign: 'center', marginBottom: 8 },
  modalSub: { fontSize: 14, color: THEME.slate, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  
  roleGrid: { gap: 8, width: '100%' },
  roleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  roleOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: THEME.indigo,
  },
  roleOptionText: { color: THEME.slate, fontWeight: '600', fontSize: 14 },
  
  banOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  banOptionText: { color: THEME.white, fontWeight: '600', fontSize: 14 },

  cancelBtn: { marginTop: 16, alignItems: 'center', padding: 10 },
  cancelText: { color: THEME.slate, fontWeight: 'bold' },
});