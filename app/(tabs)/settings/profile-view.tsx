import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import {
  Settings,
  LifeBuoy,
  LogOut,
  ChevronRight,
  ShieldAlert,
  CreditCard,
  Camera,
  User,
  Crown,
  ChevronLeft,
  SlidersHorizontal,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';

/**
 * ============================================================================
 * CONFIGURATION & THEME
 * ============================================================================
 */
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  white: '#ffffff',
  border: 'rgba(255, 255, 255, 0.08)',
};

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  isLast?: boolean;
}

/**
 * ============================================================================
 * SUB-COMPONENT: MENU ITEM ROW
 * Renders a clickable row with icon, label, subtitle, and chevron.
 * ============================================================================
 */
const MenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  label,
  subtitle,
  onPress,
  color = 'white',
  isLast = false,
}) => (
  <TouchableOpacity
    onPress={() => {
      if (Platform.OS !== 'web') Haptics.selectionAsync();
      onPress();
    }}
    style={[styles.menuItem, isLast && styles.menuItemLast]}
    activeOpacity={0.7}
  >
    <View style={styles.menuLeft}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={20} color={color} />
      </View>
      <View>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
    </View>
    <ChevronRight size={16} color={THEME.slate} />
  </TouchableOpacity>
);

/**
 * ============================================================================
 * MAIN SCREEN: PROFILE VIEW
 * Handles avatar upload, user details display, and navigation to sub-settings.
 * ============================================================================
 */
export default function ProfileViewScreen() {
  const router = useRouter();
  const { user, signOut, refreshUserData } = useAuth();
  const [uploading, setUploading] = useState(false);

  // Role Determination Logic
  const role = user?.profile?.role || 'MEMBER';
  const isStaff = role === 'ADMIN' || role === 'MODERATOR';
  const isPremium = role === 'PREMIUM' || isStaff;

  /**
   * Handles Image Selection & Upload to Supabase Storage
   */
  const uploadAvatar = async () => {
    if (!user) return;
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Optimize for network performance
        base64: true,
      });

      if (result.canceled || !result.assets || !result.assets[0].base64) {
        setUploading(false);
        return;
      }

      const image = result.assets[0];
      const fileExt = image.uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(image.base64!), {
          contentType: image.mimeType ?? 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update Profile Table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshUserData();
      Alert.alert('Success', 'Profile picture updated successfully.');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'An unknown error occurred.',
      );
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handles User Sign Out
   */
  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={THEME.white} />
          </TouchableOpacity>
          <View style={styles.headerIconBox}>
            <SlidersHorizontal size={18} color={THEME.white} />
          </View>
          <View style={{ width: 40 }} /* Spacer for balance */ />
        </View>

        {/* --- SCROLLABLE CONTENT --- */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* PROFILE SUMMARY SECTION */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              onPress={uploadAvatar}
              disabled={uploading}
              style={styles.avatarWrapper}
              activeOpacity={0.8}
            >
              <View style={styles.avatarContainer}>
                {uploading ? (
                  <ActivityIndicator color={THEME.indigo} />
                ) : user?.profile?.avatar_url ? (
                  <Image
                    source={{ uri: user.profile.avatar_url }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {user?.profile?.username?.[0]?.toUpperCase() || 'U'}
                  </Text>
                )}
              </View>
              <View style={styles.editBadge}>
                <Camera size={14} color="white" />
              </View>
            </TouchableOpacity>

            <Text style={styles.nameText}>
              {user?.profile?.full_name || 'SkillSprint User'}
            </Text>
            <Text style={styles.handleText}>
              @{user?.profile?.username || 'username'}
            </Text>

            {/* ROLE BADGE */}
            <View
              style={[
                styles.roleChip,
                {
                  borderColor: isStaff
                    ? THEME.success
                    : isPremium
                      ? THEME.warning
                      : THEME.border,
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

          {/* MENU GROUPS */}
          <View style={styles.menuGroup}>
            {/* GROUP 1: ACCOUNT MANAGEMENT */}
            <GlassCard intensity="light" style={styles.card}>
              <MenuItem
                icon={User}
                label="Edit Details"
                subtitle="Update personal information"
                onPress={() => router.push('/(tabs)/settings/profile')}
                color={THEME.indigo}
              />

              {isStaff && (
                <MenuItem
                  icon={ShieldAlert}
                  label="Admin Console"
                  subtitle="Manage users & content"
                  onPress={() => router.push('/(tabs)/admin')}
                  color={THEME.success}
                />
              )}

              <MenuItem
                icon={Settings}
                label="Advanced Settings"
                subtitle="Security, notifications, data"
                onPress={() => router.push('/(tabs)/settings')}
                color={THEME.slate}
                isLast={true}
              />
            </GlassCard>

            {/* GROUP 2: SUPPORT & BILLING */}
            <GlassCard intensity="light" style={styles.card}>
              <MenuItem
                icon={LifeBuoy}
                label="Support Center"
                subtitle="Get help with your account"
                onPress={() => router.push('/(tabs)/support')}
                color="#38bdf8"
              />
              <MenuItem
                icon={CreditCard}
                label="Subscription"
                subtitle={isPremium ? 'Manage Premium Plan' : 'Upgrade to Pro'}
                onPress={() => {
                  /* TODO: Implement Billing Portal */
                }}
                color={THEME.warning}
                isLast={true}
              />
            </GlassCard>

            {/* SIGN OUT BUTTON */}
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.logoutBtn}
              activeOpacity={0.8}
            >
              <LogOut
                size={20}
                color={THEME.danger}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>
              User ID: {user?.id?.slice(0, 8) || 'Unknown'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * ============================================================================
 * STYLESHEET
 * ============================================================================
 */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  // CONTENT CONTAINER
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },

  // PROFILE HEADER SECTION
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, fontWeight: '800', color: THEME.indigo },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.indigo,
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: THEME.obsidian,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  handleText: {
    fontSize: 14,
    color: THEME.slate,
    fontWeight: '500',
    marginBottom: 16,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  roleText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  // MENUS
  menuGroup: { gap: 20 },
  card: { padding: 16, borderRadius: 24, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemLast: {
    borderBottomWidth: 0, // Remove border for last item
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 16, fontWeight: '600', color: 'white' },
  menuSub: { fontSize: 12, color: THEME.slate, marginTop: 2 },

  // FOOTER ACTIONS
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    marginTop: 10,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: THEME.danger },
  versionText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
