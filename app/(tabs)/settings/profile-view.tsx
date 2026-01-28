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
  ChevronLeft,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function ProfileViewScreen() {
  const router = useRouter();
  const { user, signOut, refreshUserData } = useAuth();
  const [uploading, setUploading] = useState(false);

  const role = user?.profile?.role || 'MEMBER';
  const isStaff = role === 'ADMIN' || role === 'MODERATOR';
  const isPremium = role === 'PREMIUM' || isStaff;

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
      Alert.alert('Success', 'Profile picture updated.');
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const MenuItem = ({
    icon: Icon,
    label,
    onPress,
    color = 'white',
    subtitle,
  }: any) => (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
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
      <ChevronRight size={16} color={THEME.slate} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={THEME.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileSection}>
            <TouchableOpacity
              onPress={uploadAvatar}
              disabled={uploading}
              style={styles.avatarWrapper}
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
                    {user?.profile?.username?.[0]?.toUpperCase()}
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

          <View style={styles.menuGroup}>
            <GlassCard intensity="light" style={styles.card}>
              <MenuItem
                icon={User}
                label="Edit Details"
                subtitle="Update personal information"
                onPress={() => router.push('/(tabs)/settings/profile')}
                color={THEME.indigo}
              />

              {/* ADMIN ACCESS */}
              {isStaff && (
                <MenuItem
                  icon={ShieldAlert}
                  label="Admin Console"
                  subtitle="Manage users & content"
                  onPress={() => router.push('/(tabs)/admin/')}
                  color={THEME.success}
                />
              )}

              {/* ADVANCED SETTINGS LINK (ADDED BACK) */}
              <MenuItem
                icon={Settings}
                label="Advanced Settings"
                subtitle="Security, notifications, data"
                onPress={() => router.push('/(tabs)/settings')}
                color={THEME.slate}
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
              />
            </GlassCard>

            <TouchableOpacity
              onPress={async () => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
                await signOut();
              }}
              style={styles.logoutBtn}
            >
              <LogOut
                size={20}
                color={THEME.danger}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>
              User ID: {user?.id?.slice(0, 8)}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 100 },
  profileSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
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
  menuGroup: { gap: 20 },
  card: { padding: 16, borderRadius: 24 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
    color: '#475569',
    fontSize: 11,
    marginTop: 20,
  },
});
