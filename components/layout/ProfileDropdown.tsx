/**
 * =============================================================
 * 👤 PROFILE DROPDOWN COMPONENT
 * =============================================================
 * Dropdown menu for profile actions
 * =============================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  useWindowDimensions,
 Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  Edit
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface ProfileDropdownProps {
  visible: boolean;
  onClose: () => void;
  anchorPosition: { x: number; y: number };
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

  const menuItems = [
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
    {
      icon: LogOut,
      label: 'Sign Out',
      onPress: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
        await signOut();
      },
      color: '#ef4444',
      isDestructive: true,
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        onPress={onClose}
      >
        <View
          style={{
            position: 'absolute',
            top: anchorPosition.y + 60,
            right: isDesktop ? undefined : 16,
            left: isDesktop ? anchorPosition.x - 200 : undefined,
            width: isDesktop ? 240 : width - 32,
            maxWidth: 280,
          }}
        >
          {Platform.OS === 'ios' ? (
            <BlurView
              tint="dark"
              intensity={50}
              className="overflow-hidden border rounded-2xl border-white/10"
            >
              <View className="bg-black/40">
                {/* User Info Header */}
                <View className="px-4 py-3 border-b border-white/10">
                  <View className="flex-row items-center gap-3">
                    {user?.profile?.avatar_url ? (
                      <Image
                        source={{ uri: user.profile.avatar_url }}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <View className="items-center justify-center w-10 h-10 rounded-full bg-indigo-500/30">
                        <Text className="text-lg font-black text-indigo-300">
                          {user?.profile?.username?.[0]?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-white">
                        {user?.profile?.full_name || user?.profile?.username || 'User'}
                      </Text>
                      <Text className="text-xs text-slate-400">
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
                      className={`flex-row items-center gap-3 px-4 py-3 ${
                        index < menuItems.length - 1 ? 'border-b border-white/5' : ''
                      } ${item.isDestructive ? 'bg-red-500/10' : ''}`}
                    >
                      <Icon size={18} color={item.color} />
                      <Text
                        className={`text-sm font-semibold ${
                          item.isDestructive ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </BlurView>
          ) : (
            <View className="bg-[#0A101F] rounded-2xl border border-white/10 overflow-hidden">
              {/* User Info Header */}
              <View className="px-4 py-3 border-b border-white/10">
                <View className="flex-row items-center gap-3">
                  {user?.profile?.avatar_url ? (
                    <Image
                      source={{ uri: user.profile.avatar_url }}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <View className="items-center justify-center w-10 h-10 rounded-full bg-indigo-500/30">
                      <Text className="text-lg font-black text-indigo-300">
                        {user?.profile?.username?.[0]?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">
                      {user?.profile?.full_name || user?.profile?.username || 'User'}
                    </Text>
                    <Text className="text-xs text-slate-400">
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
                    className={`flex-row items-center gap-3 px-4 py-3 ${
                      index < menuItems.length - 1 ? 'border-b border-white/5' : ''
                    } ${item.isDestructive ? 'bg-red-500/10' : ''}`}
                  >
                    <Icon size={18} color={item.color} />
                    <Text
                      className={`text-sm font-semibold ${
                        item.isDestructive ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
};
