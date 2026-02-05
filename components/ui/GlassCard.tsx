import React from 'react';
import { ViewStyle } from 'react-native';
import { clsx } from 'clsx';
import Animated, { FadeIn } from 'react-native-reanimated';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'light' | 'heavy';
  style?: ViewStyle | ViewStyle[] | null;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  intensity = 'heavy',
  style,
}) => {
  // Simulating Glassmorphism in React Native without expo-blur (standard fallback)
  // Logic: Semi-transparent background + light border + shadow

  const intensityStyles = {
    light: 'bg-gray-800/40 border-white/5',
    heavy: 'bg-gray-900/80 border-white/10',
  };

  return (
    <Animated.View
      entering={FadeIn}
      className={clsx(
        'rounded-3xl border shadow-2xl shadow-black/50 backdrop-blur-xl',
        intensityStyles[intensity],
        className,
      )}
      style={style}
    >
      {children}
    </Animated.View>
  );
};
