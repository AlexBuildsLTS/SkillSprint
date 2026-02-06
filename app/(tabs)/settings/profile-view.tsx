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
 * ============================================================================
 */
export default function ProfileViewScreen() {
  const router = useRouter();
  const { user, signOut: supabaseSignOut, refreshUserData } = useAuth();
  const [uploading, setUploading] = useState(false);

  // Role Determination
  const role = user?.profile?.role || 'MEMBER';
  const isStaff = role === 'ADMIN' || role === 'MODERATOR';
  const isPremium = role === 'PREMIUM' || isStaff;

  /**
   * Handles Image Upload
   */
  const uploadAvatar = async () => {
    if (!user) return;
    try {
      setUploading(true);

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

      const image = result.assets[0];
      const fileExt = image.uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(image.base64!), {
          contentType: image.mimeType ?? 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshUserData();
      Alert.alert('Success', 'Profile picture updated successfully.');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handles Sign Out
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
          await supabaseSignOut();
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
          <View style={{ width: 40 }} />
        </View>

        {/* --- CONTENT --- */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* PROFILE IMAGE SECTION */}
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

          {/* MENU ITEMS */}
          <View style={styles.menuGroup}>
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
                onPress={() => {}}
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

  // SCROLL CONTENT
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },

  // PROFILE SECTION
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
  },
  avatarContainer: {
    width: 120, // Increased size for modern look
    height: 120,
    borderRadius: 60, // Perfectly round
    backgroundColor: '#05091B', // Darker indigo background
    borderWidth: 6,
    borderColor: 'rgba(5, 9, 27, 1.00)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Ensures content stays inside circle
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60, // Force rounded image corners for Android compat
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '800',
    color: THEME.indigo,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: THEME.indigo,
    padding: 8,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: THEME.obsidian,
  },

  // TEXT STYLES
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  handleText: {
    fontSize: 15,
    color: THEME.slate,
    fontWeight: '500',
    marginBottom: 16,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // MENU
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
    borderBottomWidth: 0,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 16, fontWeight: '600', color: 'white' },
  menuSub: { fontSize: 13, color: THEME.slate, marginTop: 2 },

  // LOGOUT BUTTON
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
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
