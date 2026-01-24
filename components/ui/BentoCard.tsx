import React from 'react';
import { Pressable, View, Text, ViewStyle, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  FadeInDown 
} from 'react-native-reanimated';

interface BentoCardProps {
  children?: React.ReactNode;
  className?: string;
  onPress?: () => void;
  delay?: number;
  title?: string;
  value?: string | number;
  icon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[]; // FIXED: Added style prop support
}

export const BentoCard = ({ 
  children, 
  className = "", 
  onPress, 
  delay = 0,
  title,
  value,
  icon,
  style 
}: BentoCardProps) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      scale.value = withSpring(1.02);
    }
  };

  const handleHoverOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).springify()}
      style={[animatedStyle, style]} // FIXED: Applying the style prop
      className={`bg-slate-900/40 border border-slate-800 rounded-[24px] overflow-hidden ${className}`}
    >
      <Pressable 
        onPress={onPress}
        onPointerEnter={handleHoverIn}
        onPointerLeave={handleHoverOut}
        className="justify-between flex-1 p-5"
      >
        {children ? children : (
          <>
            <View className="flex-row items-start justify-between">
              <View className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                {icon}
              </View>
              {title && (
                <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-[1px]">
                  {title}
                </Text>
              )}
            </View>
            {value && (
              <Text className="mt-4 text-3xl font-black tracking-tight text-white">
                {value}
              </Text>
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};