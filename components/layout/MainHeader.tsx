/**
 * =============================================================
 * 📱 MAIN HEADER COMPONENT (Production Ready)
 * =============================================================
 * Architecture Notes:
 * - Desktop Layout: Logo is explicitly omitted (handled by Sidebar).
 * - Mobile Layout: Utilizes adaptive-icon.png as the fallback brand marker.
 * - Deno Wall Principle: Client is untrusted. Notifications here
 * are optimistically updated, but actual state syncs via API.
 * - Cross-Platform: Platform-specific measuring for precise dropdowns.
 * =============================================================
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  ChevronLeft,
  Dna,
  MessageSquare,
  CheckCheck,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// External Components
import { ProfileDropdown } from './ProfileDropdown';

const DESKTOP_WIDTH = 1024;

// --- Interfaces & Types (Aligned with DB) ---
interface MainHeaderProps {
  title?: string;
  showBack?: boolean;
  rightActions?: React.ReactNode;
  onBackPress?: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
}

// =============================================================
// INLINE NOTIFICATION DROPDOWN COMPONENT
// =============================================================
const NotificationDropdown = ({
  visible,
  onClose,
  anchorPosition,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: {
  visible: boolean;
  onClose: () => void;
  anchorPosition: { x: number; y: number };
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) => {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_WIDTH;

  if (!visible) return null;

  // Positioning Logic: Calculate safe bounds to prevent bleed
  const dropdownWidth = 320;
  const padding = 16;
  
  let leftPos = anchorPosition.x - dropdownWidth + 40;
  // Bound check
  if (leftPos < padding) leftPos = padding;
  if (leftPos + dropdownWidth > width - padding) leftPos = width - dropdownWidth - padding;

  const topPos = Platform.OS === 'web' ? anchorPosition.y + 50 : anchorPosition.y + 40;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} 
        onPress={onClose}
      >
        <View
          style={{
            position: 'absolute',
            top: topPos,
            left: isDesktop ? leftPos : undefined,
            right: !isDesktop ? padding : undefined,
            width: isDesktop ? dropdownWidth : width - (padding * 2),
            maxHeight: height * 0.6,
          }}
          className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onStartShouldSetResponder={() => true} // Prevent tap-through
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/5 bg-[#1F2937]/50">
            <Text className="font-bold text-white">Notifications</Text>
            <TouchableOpacity
              onPress={onMarkAllRead}
              className="flex-row items-center gap-1"
            >
              <CheckCheck size={14} color="#9CA3AF" />
              <Text className="text-xs text-gray-400">Mark all read</Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View className="items-center justify-center py-8">
                <Text className="text-sm text-gray-500">
                  No new notifications
                </Text>
              </View>
            ) : (
              notifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => onMarkRead(item.id)}
                  className={`px-4 py-3 border-b border-white/5 flex-row gap-3 ${
                    !item.is_read ? 'bg-indigo-500/10' : 'bg-transparent'
                  }`}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-sm ${!item.is_read ? 'text-white font-bold' : 'text-gray-300'}`}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="text-xs text-gray-400 mt-1"
                      numberOfLines={2}
                    >
                      {item.message}
                    </Text>
                    <Text className="text-[10px] text-gray-500 mt-2">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {!item.is_read && (
                    <View className="w-2 h-2 mt-1 rounded-full bg-indigo-500" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

// =============================================================
// MAIN HEADER COMPONENT EXPORT
// =============================================================
export const MainHeader: React.FC<MainHeaderProps> = ({
  title,
  showBack = false,
  rightActions,
  onBackPress,
}) => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { user } = useAuth();

  const isDesktop = width >= DESKTOP_WIDTH;

  // --- UI State ---
  const [profileVisible, setProfileVisible] = useState(false);
  const [notiVisible, setNotiVisible] = useState(false);
  const [avatarPosition, setAvatarPosition] = useState({ x: 0, y: 0 });
  const [bellPosition, setBellPosition] = useState({ x: 0, y: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // --- Refs ---
  const avatarRef = useRef<View>(null);
  const bellRef = useRef<View>(null);

  // --- Real-time Fetch & Sync ---
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await api.getNotifications(user.id);
      setNotifications(data as unknown as Notification[]);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // --- Handlers ---
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBackPress) onBackPress();
    else router.back();
  }, [onBackPress, router]);

  const handleMessages = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/messages');
  }, [router]);

  const handleSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/settings/profile-view');
  }, [router]);

  // Unified Element Measurement Tool for Dropdowns
  const measureAndOpen = (
    ref: React.RefObject<View | null>,
    setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
    setVisible: React.Dispatch<React.SetStateAction<boolean>>,
    event?: any,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      const el = ref.current as any;
      if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setPosition({ x: rect.left, y: rect.top });
      } else {
        const { pageX = width - 100, pageY = 80 } = event?.nativeEvent || {};
        setPosition({ x: pageX, y: pageY });
      }
      setVisible(true);
    } else {
      ref.current?.measure((x, y, w, h, pageX, pageY) => {
        setPosition({ x: pageX, y: pageY });
        setVisible(true);
      });
    }
  };

  const handleNotificationRead = async (id: string) => {
    // Optimistic UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await api.markNotificationRead(id);
    } catch (err) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      fetchNotifications();
    }
  };

  // =============================================================
  // RENDER SECTIONS
  // =============================================================

  const renderRightActions = () => {
    if (rightActions) return rightActions;

    return (
      <View className="flex-row items-center gap-2 md:gap-3">
        <TouchableOpacity
          onPress={handleMessages}
          className="items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5"
        >
          <MessageSquare size={isDesktop ? 20 : 18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          ref={bellRef}
          onPress={(e) =>
            measureAndOpen(bellRef, setBellPosition, setNotiVisible, e)
          }
          className="relative items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5"
        >
          <Bell size={isDesktop ? 20 : 18} color="#94a3b8" />
          {unreadCount > 0 && (
            <View className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 border border-[#0A101F]" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSettings}
          className="items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5"
        >
          <Dna size={isDesktop ? 20 : 18} color="#09b363" />
        </TouchableOpacity>

        <TouchableOpacity
          ref={avatarRef}
          onPress={(e) =>
            measureAndOpen(avatarRef, setAvatarPosition, setProfileVisible, e)
          }
          className="items-center justify-center w-9 h-9 md:w-10 md:h-10 ml-1 rounded-xl bg-indigo-500/20"
        >
          {user?.profile?.avatar_url ? (
            <Image
              source={{ uri: user.profile.avatar_url }}
              className="w-7 h-7 md:w-8 md:h-8 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-500/30">
              <Text className="text-xs font-bold text-indigo-300">
                {user?.profile?.username?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const HeaderContent = () => (
    <View className="flex-row items-center justify-between px-4 md:px-8 h-14 md:h-16">
      <View className="flex-row items-center flex-1 gap-3 md:gap-6">
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            className="items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5"
          >
            <ChevronLeft size={isDesktop ? 20 : 22} color="#ffffff" />
          </TouchableOpacity>
        )}

        {title ? (
          <Text
            className="flex-1 text-lg font-black text-white md:text-xl"
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : !isDesktop ? (
          <Image
            source={require('@/assets/images/adaptive-icon.png')}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
        ) : null}
      </View>

      {renderRightActions()}
    </View>
  );

  return (
    <>
      {isDesktop ? (
        <View className="border-b border-white/5 bg-[#0A101F]">
          <HeaderContent />
        </View>
      ) : (
        <SafeAreaView edges={['top']} className="bg-transparent">
          {Platform.OS === 'ios' ? (
            <BlurView
              tint="dark"
              intensity={30}
              className="border-b border-white/5"
            >
              <HeaderContent />
            </BlurView>
          ) : (
            <View className="bg-[#0A101F] border-b border-white/5">
              <HeaderContent />
            </View>
          )}
        </SafeAreaView>
      )}

      <ProfileDropdown
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        anchorPosition={avatarPosition}
      />

      <NotificationDropdown
        visible={notiVisible}
        onClose={() => setNotiVisible(false)}
        anchorPosition={bellPosition}
        notifications={notifications}
        onMarkRead={handleNotificationRead}
        onMarkAllRead={handleMarkAllRead}
      />
    </>
  );
};
