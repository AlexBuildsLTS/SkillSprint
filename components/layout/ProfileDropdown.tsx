/**
 * =============================================================
 * 👤 PROFILE DROPDOWN COMPONENT
 * =============================================================
 * Dropdown menu for profile actions with Admin Support
 * =============================================================
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  useWindowDimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Settings,
  LogOut,
  Edit,
  ShieldAlert, // Icon for Admin Console
  LifeBuoy, // Icon for Support
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface ProfileDropdownProps {
  visible: boolean;
  onClose: () => void;
  anchorPosition: { x: number; y: number };
}

interface MenuItem {
  icon: any;
  label: string;
  onPress: () => void;
  color: string;
  isDestructive?: boolean;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  visible,
  onClose,
  anchorPosition,
}) => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Check Role
  const isStaff =
    user?.profile?.role === 'ADMIN' || user?.profile?.role === 'MODERATOR';

  // Base Menu Items
  const menuItems: MenuItem[] = [
    {
      icon: User,
      label: 'View Profile',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/(tabs)/settings/profile-view');
      },
      color: '#6366f1',
    },
    {
      icon: Edit,
      label: 'Edit Profile',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/(tabs)/settings/profile');
      },
      color: '#8b5cf6',
    },
    // ADDED SUPPORT CENTER HERE
    {
      icon: LifeBuoy,
      label: 'Support Center',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/(tabs)/support');
      },
      color: '#3b82f6', // Blue
    },
    {
      icon: Settings,
      label: 'Settings',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/(tabs)/settings');
      },
      color: '#94a3b8',
    },
  ];

  // Add Admin Console if staff (inserted before Settings to keep hierarchy)
  if (isStaff) {
    // Finding index of Settings to insert Admin before it
    const settingsIndex = menuItems.findIndex(
      (item) => item.label === 'Settings',
    );
    if (settingsIndex !== -1) {
      menuItems.splice(settingsIndex, 0, {
        icon: ShieldAlert,
        label: 'Admin Console',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onClose();
          router.push('/(tabs)/admin/');
        },
        color: '#10b981', // Emerald green for admin
      });
    }
  }

  // Add Logout at the very end
  menuItems.push({
    icon: LogOut,
    label: 'Sign Out',
    onPress: async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onClose();
      await signOut();
    },
    color: '#ef4444',
    isDestructive: true,
  } as MenuItem);

  if (!visible) return null;

  // Render Inner Content (Shared between Blur and View)
  const renderContent = () => (
    <View
      style={{
        backgroundColor: Platform.OS === 'ios' ? 'rgba(0,0,0,0.5)' : '#0A101F',
      }}
    >
      {/* User Info Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {user?.profile?.avatar_url ? (
            <Image
              source={{ uri: user.profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.profile?.username?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.profile?.full_name || user?.profile?.username || 'User'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <TouchableOpacity
            key={index}
            onPress={item.onPress}
            style={[
              styles.menuItem,
              index < menuItems.length - 1 && styles.borderBottom,
              item.isDestructive && styles.destructiveBg,
            ]}
          >
            <Icon size={18} color={item.color} />
            <Text
              style={[
                styles.menuText,
                item.isDestructive && { color: '#ef4444' },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={{
            position: 'absolute',
            // On desktop, align to anchor; fallback to fixed right for mobile
            top: anchorPosition.y + 10,
            right: isDesktop ? width - anchorPosition.x - 40 : 20,
            width: 260,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {Platform.OS === 'ios' ? (
            <BlurView
              tint="dark"
              intensity={80}
              style={StyleSheet.absoluteFill}
            >
              {renderContent()}
            </BlurView>
          ) : (
            renderContent()
          )}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'transparent' }, // Transparent so you can click outside to close
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#818cf8' },
  userName: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  userEmail: { fontSize: 12, color: '#94a3b8' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  destructiveBg: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  menuText: { fontSize: 14, fontWeight: '600', color: 'white' },
});
