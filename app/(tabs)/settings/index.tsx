/**
 * ============================================================================
 * SCREEN: SETTINGS (MAIN)
 * ============================================================================
 * PATH: app/(tabs)/settings/index.tsx
 * * UPDATES:
 * - Added <Stack.Screen headerShown: false> to remove native header/border.
 * - Verified Router Push to Profile View.
 * - Optimized Header layout.
 * ============================================================================
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router'; // Added Stack import
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Lock,
  Fingerprint,
  Bell,
  Moon,
  Shield,
  ChevronRight,
  User,
  LogOut,
  CreditCard,
  LifeBuoy,
  Cog,
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';

// --- THEME CONSTANTS ---
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  white: '#ffffff',
  danger: '#ef4444',
  success: '#10b981',
  border: 'rgba(255, 255, 255, 0.08)',
};

/**
 * -----------------------------------------------------------------------------
 * COMPONENT: SETTINGS MENU ITEM
 * Reusable row component for settings lists.
 * -----------------------------------------------------------------------------
 */
interface SettingsMenuItemProps {
  icon: React.ElementType;
  label: string;
  value?: string | boolean;
  onPress?: () => void;
  showChevron?: boolean;
  rightComponent?: React.ReactNode;
  color?: string;
  isDestructive?: boolean;
}

const SettingsMenuItem: React.FC<SettingsMenuItemProps> = ({
  icon: Icon,
  label,
  value,
  onPress,
  showChevron = true,
  rightComponent,
  color = THEME.indigo,
  isDestructive = false,
}) => {
  return (
    <TouchableOpacity
      onPress={() => {
        if (onPress) {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          onPress();
        }
      }}
      style={styles.menuItem}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        {/* Icon Container with dynamic background tint */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDestructive
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(99, 102, 241, 0.1)',
            },
          ]}
        >
          <Icon size={20} color={isDestructive ? THEME.danger : color} />
        </View>

        {/* Text Content */}
        <View style={styles.menuTextContainer}>
          <Text
            style={[styles.menuLabel, isDestructive && { color: THEME.danger }]}
          >
            {label}
          </Text>
          {value && typeof value === 'string' && (
            <Text style={styles.menuValue}>{value}</Text>
          )}
        </View>
      </View>

      {/* Right Side Actions/Chevron */}
      {rightComponent ||
        (showChevron && <ChevronRight size={16} color={THEME.slate} />)}
    </TouchableOpacity>
  );
};

/**
 * -----------------------------------------------------------------------------
 * MAIN COMPONENT: SETTINGS SCREEN
 * -----------------------------------------------------------------------------
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Local state for UI toggles
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(true);

  // Helper for consistent section headers
  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* CRITICAL: This hides the default "Settings" header and the white line border. 
        It allows our custom Cog header to be the only one visible.
      */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Global Background Gradient */}
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* --- CUSTOM HEADER (Cog Only) --- */}
        <View style={styles.header}>
          <Cog size={28} color={THEME.white} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* --- PROFILE CARD (Clickable) --- */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              // Navigate to Profile View
              router.push('/(tabs)/settings/profile-view');
            }}
          >
            <GlassCard intensity="heavy" style={styles.profileCard}>
              <View style={styles.profileRow}>
                {/* Avatar Logic: Image -> Initials -> Fallback Icon */}
                <View style={styles.avatarContainer}>
                  {user?.profile?.avatar_url ? (
                    <Image
                      source={{ uri: user.profile.avatar_url }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {user?.profile?.full_name || 'SkillSprint User'}
                  </Text>
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {user?.email}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {user?.profile?.role || 'MEMBER'}
                    </Text>
                  </View>
                </View>

                <ChevronRight size={20} color={THEME.slate} />
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* --- SECTION: GENERAL --- */}
          <SectionHeader title="GENERAL" />
          <GlassCard intensity="light" style={styles.menuGroup}>
            <SettingsMenuItem
              icon={User}
              label="Account Details"
              onPress={() => router.push('/(tabs)/settings/profile-view')}
            />
            <SettingsMenuItem
              icon={CreditCard}
              label="Subscription"
              value="Free Plan"
              onPress={() =>
                Alert.alert('Premium', 'Upgrade functionality coming soon.')
              }
              color="#f59e0b"
            />
          </GlassCard>

          {/* --- SECTION: PREFERENCES --- */}
          <SectionHeader title="PREFERENCES" />
          <GlassCard intensity="light" style={styles.menuGroup}>
            <SettingsMenuItem
              icon={Bell}
              label="Notifications"
              showChevron={false}
              rightComponent={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(v) => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setNotificationsEnabled(v);
                  }}
                  trackColor={{ false: '#334155', true: THEME.indigo }}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsMenuItem
              icon={Moon}
              label="Dark Mode"
              showChevron={false}
              rightComponent={
                <Switch
                  value={darkModeEnabled}
                  onValueChange={(v) => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setDarkModeEnabled(v);
                  }}
                  trackColor={{ false: '#334155', true: THEME.indigo }}
                  thumbColor="#ffffff"
                />
              }
            />
          </GlassCard>

          {/* --- SECTION: SECURITY --- */}
          <SectionHeader title="SECURITY" />
          <GlassCard intensity="light" style={styles.menuGroup}>
            <SettingsMenuItem
              icon={Lock}
              label="Change Password"
              onPress={() => router.push('/(tabs)/settings/change-password')}
              color="#10b981"
            />
            <SettingsMenuItem
              icon={Fingerprint}
              label="Biometrics"
              onPress={() => router.push('/(tabs)/settings/biometric')}
              color="#10b981"
            />
          </GlassCard>

          {/* --- SECTION: SUPPORT --- */}
          <SectionHeader title="SUPPORT" />
          <GlassCard intensity="light" style={styles.menuGroup}>
            <SettingsMenuItem
              icon={LifeBuoy}
              label="Help Center"
              onPress={() => router.push('/(tabs)/support')}
              color="#38bdf8"
            />
            <SettingsMenuItem
              icon={Shield}
              label="Privacy & Terms"
              onPress={() => {
                /* TODO: Open Web Browser */
              }}
              color="#8b5cf6"
            />
          </GlassCard>

          {/* --- LOGOUT AREA --- */}
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.8}
              onPress={async () => {
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Warning,
                  );
                }
                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: signOut },
                ]);
              }}
            >
              <LogOut size={20} color={THEME.danger} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>v1.0.4 (Build 204)</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center', // Center Horizontally
    justifyContent: 'center', // Center Vertically
    // No border here (Native header hidden via Stack.Screen)
  },

  scrollContent: { padding: 20, paddingBottom: 100 },

  // PROFILE CARD
  profileCard: { marginBottom: 24, padding: 20, borderRadius: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    overflow: 'hidden', // Ensures image stays circular
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: THEME.indigo },

  profileName: { color: 'white', fontSize: 18, fontWeight: '700' },
  profileEmail: { color: THEME.slate, fontSize: 13, marginBottom: 6 },

  badge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: THEME.slate, fontSize: 10, fontWeight: '800' },

  // SECTIONS
  sectionHeader: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 8,
    marginTop: 8,
  },
  menuGroup: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },

  // MENU ITEMS
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: 'white' },
  menuValue: { fontSize: 12, color: THEME.slate, marginTop: 2 },

  // LOGOUT
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: { color: THEME.danger, fontWeight: '700', fontSize: 15 },
  versionText: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 11,
    marginTop: 16,
  },
});
