/**
 * =============================================================
 * 📱 MAIN HEADER COMPONENT
 * =============================================================
 * Responsive header that adapts for mobile/desktop
 * =============================================================
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Menu,
  Bell,
  Settings,
  User,
  ChevronLeft,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ProfileDropdown } from './ProfileDropdown';

const DESKTOP_WIDTH = 1024;

interface MainHeaderProps {
  title?: string;
  showBack?: boolean;
  rightActions?: React.ReactNode;
  onBackPress?: () => void;
}

export const MainHeader: React.FC<MainHeaderProps> = ({
  title,
  showBack = false,
  rightActions,
  onBackPress,
}) => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const isDesktop = width >= DESKTOP_WIDTH;
  const [dropdownVisible, setDropdownVisible] = React.useState(false);
  const [avatarPosition, setAvatarPosition] = React.useState({ x: 0, y: 0 });
  const avatarRef = React.useRef<View>(null);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleProfile = (event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (avatarRef.current) {
      avatarRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setAvatarPosition({ x: pageX, y: pageY });
        setDropdownVisible(true);
      });
    } else {
      // Fallback for web/desktop
      const { pageX, pageY } = event?.nativeEvent || { pageX: width - 100, pageY: 80 };
      setAvatarPosition({ x: pageX, y: pageY });
      setDropdownVisible(true);
    }
  };

  const handleSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/settings');
  };

  // Desktop Header (Horizontal Bar)
  if (isDesktop) {
    return (
      <View className="h-16 border-b border-white/5 bg-[#0A101F]">
        <View className="flex-row items-center justify-between h-full px-8">
          {/* Left Section */}
          <View className="flex-row items-center gap-6">
            {showBack && (
              <TouchableOpacity
                onPress={handleBack}
                className="items-center justify-center w-10 h-10 rounded-xl bg-white/5"
              >
                <ChevronLeft size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
            {title && (
              <Text className="text-xl font-black text-white">{title}</Text>
            )}
            {!title && (
              <Image 
                source={require('@/assets/images/favico.png')}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Right Section */}
          <View className="flex-row items-center gap-3">
            {rightActions || (
              <>
                <TouchableOpacity
                  onPress={handleSettings}
                  className="items-center justify-center w-10 h-10 rounded-xl bg-white/5"
                >
                  <Settings size={20} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  ref={avatarRef}
                  onPress={handleProfile}
                  className="items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20"
                >
                  {user?.profile?.avatar_url ? (
                    <Image
                      source={{ uri: user.profile.avatar_url }}
                      className="w-8 h-8 rounded-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="items-center justify-center w-8 h-8 rounded-full bg-indigo-500/30">
                      <Text className="text-xs font-bold text-indigo-300">
                        {user?.profile?.username?.[0]?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Mobile Header (Compact with Blur) - Always show on mobile
  return (
    <SafeAreaView edges={['top']} className="bg-transparent">
      {Platform.OS === 'ios' ? (
        <BlurView tint="dark" intensity={30} className="border-b border-white/5">
          <View className="flex-row items-center justify-between px-4 h-14">
            {/* Left Section */}
            <View className="flex-row items-center flex-1 gap-3">
              {showBack && (
                <TouchableOpacity
                  onPress={handleBack}
                  className="items-center justify-center w-9 h-9 rounded-xl"
                >
                  <ChevronLeft size={22} color="#ffffff" />
                </TouchableOpacity>
              )}
              {title && (
                <Text className="flex-1 text-lg font-black text-white" numberOfLines={1}>
                  {title}
                </Text>
              )}
              {!title && (
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Right Section */}
            <View className="flex-row items-center gap-2">
              {rightActions || (
                <>
                  <TouchableOpacity
                    onPress={handleSettings}
                    className="items-center justify-center w-9 h-9 rounded-xl"
                  >
                    <Settings size={20} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleProfile}
                    className="items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/30"
                  >
                    {user?.profile?.avatar_url ? (
                      <View className="items-center justify-center overflow-hidden rounded-full w-7 h-7 bg-indigo-500/20">
                        <Text className="text-xs font-bold text-indigo-300">
                          {user.profile.username?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    ) : (
                      <User size={18} color="#6366f1" />
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </BlurView>
      ) : (
        <View className="bg-[#0A101F] border-b border-white/5">
          <View className="flex-row items-center justify-between px-4 h-14">
            {/* Left Section */}
            <View className="flex-row items-center flex-1 gap-3">
              {showBack && (
                <TouchableOpacity
                  onPress={handleBack}
                  className="items-center justify-center w-9 h-9 rounded-xl bg-white/5"
                >
                  <ChevronLeft size={22} color="#ffffff" />
                </TouchableOpacity>
              )}
              {title && (
                <Text className="flex-1 text-lg font-black text-white" numberOfLines={1}>
                  {title}
                </Text>
              )}
              {!title && (
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Right Section */}
            <View className="flex-row items-center gap-2">
              {rightActions || (
                <>
                  <TouchableOpacity
                    onPress={handleSettings}
                    className="items-center justify-center w-9 h-9 rounded-xl bg-white/5"
                  >
                    <Settings size={20} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    ref={avatarRef}
                    onPress={handleProfile}
                    className="items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/30"
                  >
                    {user?.profile?.avatar_url ? (
                      <Image
                        source={{ uri: user.profile.avatar_url }}
                        className="rounded-full w-7 h-7"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center justify-center rounded-full w-7 h-7 bg-indigo-500/20">
                        <Text className="text-xs font-bold text-indigo-300">
                          {user?.profile?.username?.[0]?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      )}
      
      {/* Profile Dropdown */}
      <ProfileDropdown
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        anchorPosition={avatarPosition}
      />
    </SafeAreaView>
  );
};
