import React from 'react';
import { Pressable, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  onPress: () => void;
  delay?: number;
}

export const BentoCard = ({
  children,
  className,
  onPress,
  delay = 0,
}: BentoCardProps) => {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0.1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: `rgba(99, 102, 241, ${borderOpacity.value + 0.1})`,
  }));

  const onHoverIn = () => {
    if (Platform.OS === 'web') {
      scale.value = withSpring(1.02, { damping: 10 });
      borderOpacity.value = withSpring(0.6);
    }
  };

  const onHoverOut = () => {
    scale.value = withSpring(1);
    borderOpacity.value = withSpring(0.1);
  };

  return (
    <Animated.View
      style={animatedStyle}
      className={`bg-slate-900/40 border rounded-[24px] overflow-hidden ${className}`}
    >
      <Pressable
        onPress={onPress}
        onPointerEnter={onHoverIn}
        onPointerLeave={onHoverOut}
        className="flex-1 p-5"
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
