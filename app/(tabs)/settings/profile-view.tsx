/**
 * =============================================================
 * 👤 PROFILE VIEW SCREEN
 * =============================================================
 * Detailed profile management with role-based access.
 * =============================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import {
  Settings,
  LifeBuoy,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Camera,
  User,
  ShieldAlert,
  Crown,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import * as Haptics from 'expo-haptics';

// THEME CONSTANTS
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  white: '#ffffff',
};

export default function ProfileViewScreen() {
  const router = useRouter();
  const { user, signOut, refreshUserData } = useAuth();
  const [uploading, setUploading] = useState(false);

  // Role Logic
  const role = user?.profile?.role || 'MEMBER';
  const isStaff = role === 'ADMIN' || role === 'MODERATOR';
  const isPremium = role === 'PREMIUM' || isStaff;

  // --- AVATAR UPLOAD LOGIC ---
  const uploadAvatar = async () => {
    if (!user) return;
    try {
      setUploading(true);

      // 1. Pick
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled || !result.assets || !result.assets[0].base64) {
        setUploading(false);
        return;
      }

      // 2. Upload
      const image = result.assets[0];
      const fileExt = image.uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(image.base64!), {
          contentType: image.mimeType ?? 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // 3. Update DB
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshUserData();
      Alert.alert('Updated', 'Your profile picture has been changed.');
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  // --- MENU ITEM COMPONENT ---
  const MenuItem = ({
    icon: Icon,
    label,
    onPress,
    color = 'white',
    subtitle,
  }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={styles.menuItem}
      activeOpacity={0.7}
    >
      <View style={styles.menuLeft}>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <Icon size={20} color={color} />
        </View>
        <View>
          <Text style={styles.menuLabel}>{label}</Text>
          {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
        </View>
      </View>
      <ChevronRight size={16} color="#475569" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* PADDING TOP 120: Ensures content clears the fixed MainHeader from _layout.tsx 
         PADDING BOTTOM 100: Ensures content clears the Tab Bar on mobile
      */}
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: 120,
          paddingBottom: 120,
        }}
      >
        {/* --- HEADER PROFILE SECTION --- */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            onPress={uploadAvatar}
            disabled={uploading}
            style={styles.avatarWrapper}
          >
            <View style={styles.avatarContainer}>
              {uploading ? (
                <ActivityIndicator color="#6366f1" />
              ) : user?.profile?.avatar_url ? (
                <Image
                  source={{ uri: user.profile.avatar_url }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.profile?.username?.[0]?.toUpperCase()}
                </Text>
              )}
            </View>

            <View style={styles.editBadge}>
              <Camera size={14} color="white" />
            </View>
          </TouchableOpacity>

          <Text style={styles.nameText}>
            {user?.profile?.full_name || 'User'}
          </Text>
          <Text style={styles.handleText}>
            @{user?.profile?.username || 'username'}
          </Text>

          {/* Role Chip */}
          <View
            style={[
              styles.roleChip,
              {
                borderColor: isStaff
                  ? THEME.success
                  : isPremium
                    ? THEME.warning
                    : THEME.slate,
              },
            ]}
          >
            {isStaff ? (
              <ShieldAlert size={12} color={THEME.success} />
            ) : isPremium ? (
              <Crown size={12} color={THEME.warning} />
            ) : null}
            <Text
              style={[
                styles.roleText,
                {
                  color: isStaff
                    ? THEME.success
                    : isPremium
                      ? THEME.warning
                      : THEME.slate,
                },
              ]}
            >
              {role} ACCOUNT
            </Text>
          </View>
        </View>

        {/* --- MENU GROUPS --- */}
        <View style={styles.menuGroup}>
          <GlassCard intensity="light" className="overflow-hidden">
            <MenuItem
              icon={User}
              label="Edit Profile"
              subtitle="Personal details & preferences"
              onPress={() => router.push('/(tabs)/settings/profile')}
              color="#6366f1"
            />

            {/* ADMIN ACCESS */}
            {isStaff && (
              <MenuItem
                icon={ShieldAlert}
                label="Admin Console"
                subtitle="User management & system logs"
                onPress={() => router.push('/(tabs)/admin/')}
                color="#10b981"
              />
            )}

            <MenuItem
              icon={LifeBuoy}
              label="Support Center"
              subtitle="Tickets & FAQ"
              onPress={() => router.push('/(tabs)/support')}
              color="#38bdf8"
            />

            <MenuItem
              icon={Settings}
              label="Advanced Settings"
              subtitle="Security, notifications, data"
              onPress={() => router.push('/(tabs)/settings')}
              color="#94a3b8"
            />
          </GlassCard>

          <GlassCard intensity="light" className="mt-6 overflow-hidden">
            <MenuItem
              icon={CreditCard}
              label="Subscription"
              subtitle={isPremium ? 'Manage Premium Plan' : 'Upgrade to Pro'}
              onPress={() => {}}
              color="#f59e0b"
            />
            <MenuItem
              icon={ShieldCheck}
              label="Privacy Policy"
              onPress={() => {}}
              color="#8b5cf6"
            />
          </GlassCard>

          <TouchableOpacity
            onPress={async () => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              await signOut();
            }}
            style={styles.logoutBtn}
          >
            <LogOut size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Terminate Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.obsidian },
  profileHeader: { alignItems: 'center', marginBottom: 32 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 40, fontWeight: '900', color: THEME.indigo },
  editBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: THEME.indigo,
    padding: 6,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: THEME.obsidian,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
    marginBottom: 4,
  },
  handleText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 6,
  },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  menuGroup: { gap: 0 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 16, fontWeight: '700', color: 'white' },
  menuSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: THEME.danger },
});
