/**
 * =============================================================
 * ⚙️ SETTINGS PAGE
 * =============================================================
 * Main settings page with menu items
 * =============================================================
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
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
  Mail,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import * as Haptics from 'expo-haptics';

interface SettingsMenuItemProps {
  icon: React.ComponentType<any>;
  label: string;
  value?: string | boolean;
  onPress?: () => void;
  showChevron?: boolean;
  rightComponent?: React.ReactNode;
  color?: string;
}

const SettingsMenuItem: React.FC<SettingsMenuItemProps> = ({
  icon: Icon,
  label,
  value,
  onPress,
  showChevron = true,
  rightComponent,
  color = '#6366f1',
}) => {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      className="flex-row items-center justify-between p-4 border-b border-white/5 last:border-0"
      disabled={!onPress}
    >
      <View className="flex-row items-center flex-1 gap-4">
        <View className="items-center justify-center w-10 h-10 rounded-full bg-white/5">
          <Icon size={20} color={color} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-white">{label}</Text>
          {value && typeof value === 'string' && (
            <Text className="mt-1 text-sm text-slate-400">{value}</Text>
          )}
        </View>
      </View>
      {rightComponent || (showChevron && <ChevronRight size={16} color="#475569" />)}
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#020617]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Profile Section */}
        <GlassCard intensity="light" className="mb-6">
          <View className="p-4">
            <View className="flex-row items-center gap-4 mb-4">
              <View className="items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20">
                <User size={24} color="#6366f1" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black text-white">
                  {user?.profile?.full_name || 'User'}
                </Text>
                <Text className="text-sm text-slate-400">
                  {user?.email}
                </Text>
              </View>
            </View>
            <SettingsMenuItem
              icon={User}
              label="Edit Profile"
              value="Update your profile information"
              onPress={() => router.push('/(tabs)/settings/profile')}
              color="#6366f1"
            />
            <SettingsMenuItem
              icon={Mail}
              label="Email"
              value={user?.email}
              onPress={() => {
                Alert.alert('Email', `Your email: ${user?.email}`);
              }}
              color="#38bdf8"
            />
          </View>
        </GlassCard>

        {/* Security Section */}
        <GlassCard intensity="light" className="mb-6">
          <View className="p-2">
            <Text className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-slate-400">
              Security
            </Text>
            <SettingsMenuItem
              icon={Lock}
              label="Change Password"
              onPress={() => router.push('/(tabs)/settings/change-password')}
              color="#ef4444"
            />
            <SettingsMenuItem
              icon={Fingerprint}
              label="Biometric Authentication"
              onPress={() => router.push('/(tabs)/settings/biometric')}
              color="#10b981"
            />
            <SettingsMenuItem
              icon={Shield}
              label="Two-Factor Authentication"
              value="Not enabled"
              onPress={() => {
                Alert.alert(
                  'Coming Soon',
                  'Two-factor authentication will be available in a future update.'
                );
              }}
              color="#f59e0b"
            />
          </View>
        </GlassCard>

        {/* Preferences Section */}
        <GlassCard intensity="light" className="mb-6">
          <View className="p-2">
            <Text className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-slate-400">
              Preferences
            </Text>
            <View className="flex-row items-center justify-between p-4 border-b border-white/5">
              <View className="flex-row items-center flex-1 gap-4">
                <View className="items-center justify-center w-10 h-10 rounded-full bg-white/5">
                  <Bell size={20} color="#6366f1" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-white">
                    Notifications
                  </Text>
                  <Text className="mt-1 text-sm text-slate-400">
                    Receive push notifications
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setNotificationsEnabled(value);
                }}
                trackColor={{ false: '#1e293b', true: '#6366f1' }}
                thumbColor="#ffffff"
              />
            </View>
            <View className="flex-row items-center justify-between p-4 border-b border-white/5 last:border-0">
              <View className="flex-row items-center flex-1 gap-4">
                <View className="items-center justify-center w-10 h-10 rounded-full bg-white/5">
                  <Moon size={20} color="#6366f1" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-white">
                    Dark Mode
                  </Text>
                  <Text className="mt-1 text-sm text-slate-400">
                    Always use dark theme
                  </Text>
                </View>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDarkModeEnabled(value);
                }}
                trackColor={{ false: '#1e293b', true: '#6366f1' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </GlassCard>

        {/* About Section */}
        <GlassCard intensity="light">
          <View className="p-2">
            <Text className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-slate-400">
              About
            </Text>
            <SettingsMenuItem
              icon={Globe}
              label="Language"
              value="English"
              onPress={() => {
                Alert.alert('Language', 'Language selection coming soon.');
              }}
              color="#3b82f6"
            />
            <SettingsMenuItem
              icon={Shield}
              label="Privacy Policy"
              onPress={() => {
                Alert.alert('Privacy Policy', 'Privacy policy coming soon.');
              }}
              color="#8b5cf6"
            />
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
