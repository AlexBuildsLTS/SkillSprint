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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Lock,
  Fingerprint,
  Bell,
  Moon,
  Globe,
  Shield,
  ChevronRight,
  User,
  LogOut,
  CreditCard,
  LifeBuoy,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  white: '#ffffff',
  danger: '#ef4444',
  success: '#10b981',
  border: 'rgba(255, 255, 255, 0.08)',
};

interface SettingsMenuItemProps {
  icon: React.ComponentType<any>;
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
          Haptics.selectionAsync();
          onPress();
        }
      }}
      style={styles.menuItem}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
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
      {rightComponent ||
        (showChevron && <ChevronRight size={16} color={THEME.slate} />)}
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(true);

  // Helper for consistent section headers
  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      {/* Background Gradient */}
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* PROFILE CARD */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/settings/profile-view')} // Go to detailed view
          >
            <GlassCard intensity="heavy" style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  {user?.profile?.avatar_url ? (
                    // If you have an Image component, use it here. Text fallback:
                    <Text style={styles.avatarText}>
                      {user.email?.[0].toUpperCase()}
                    </Text>
                  ) : (
                    <User size={28} color={THEME.indigo} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>
                    {user?.profile?.full_name || 'SkillSprint User'}
                  </Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
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

          {/* GENERAL */}
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
              onPress={() => Alert.alert('Premium', 'Upgrade coming soon.')}
              color="#f59e0b"
            />
          </GlassCard>

          {/* PREFERENCES */}
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
                    Haptics.selectionAsync();
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
                    Haptics.selectionAsync();
                    setDarkModeEnabled(v);
                  }}
                  trackColor={{ false: '#334155', true: THEME.indigo }}
                  thumbColor="#ffffff"
                />
              }
            />
          </GlassCard>

          {/* SECURITY */}
          <SectionHeader title="SECURITY" />
          <GlassCard intensity="light" style={styles.menuGroup}>
            <SettingsMenuItem
              icon={Lock}
              label="Change Password"
              onPress={() => router.push('/(tabs)/settings/change-password')} // Ensure this route exists or alert
              color="#10b981"
            />
            <SettingsMenuItem
              icon={Fingerprint}
              label="Biometrics"
              onPress={() => Alert.alert('Security', 'Biometrics enabled.')}
              color="#10b981"
            />
          </GlassCard>

          {/* SUPPORT */}
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
              onPress={() => {}}
              color="#8b5cf6"
            />
          </GlassCard>

          {/* LOGOUT */}
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={async () => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
                await signOut();
              }}
            >
              <LogOut size={20} color={THEME.danger} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>v1.0.0 (Build 42)</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 100 },

  // Profile Card
  profileCard: { marginBottom: 24, padding: 20, borderRadius: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
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

  // Sections
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

  // Menu Item
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

  // Logout
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
