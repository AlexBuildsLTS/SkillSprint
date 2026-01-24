import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  interpolate, 
  interpolateColor, 
  Extrapolation,
  FadeInDown
} from 'react-native-reanimated';

const SPRING_CONFIG = { damping: 15, stiffness: 120, mass: 1 };

interface Bento3DProps {
  children?: React.ReactNode;
  className?: string;
  onPress?: () => void;
  delay?: number;
  style?: any;
}

export const Bento3DCard = ({ children, className, onPress, delay = 0, style }: Bento3DProps) => {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: withSpring(scale.value) },
    ],
    borderColor: interpolateColor(
      glowOpacity.value,
      [0, 1],
      ['rgba(255,255,255,0.05)', 'rgba(99, 102, 241, 0.4)']
    ),
    backgroundColor: interpolateColor(
      glowOpacity.value,
      [0, 1],
      ['rgba(15, 23, 42, 0.3)', 'rgba(99, 102, 241, 0.08)']
    ),
  }));

  const onPointerMove = (e: any) => {
    if (Platform.OS === 'web') {
      const { nativeEvent } = e;
      // 3D Tilt Logic from Login Screen
      rotateY.value = interpolate(nativeEvent.offsetX, [0, 300], [-10, 10], Extrapolation.CLAMP);
      rotateX.value = interpolate(nativeEvent.offsetY, [0, 200], [10, -10], Extrapolation.CLAMP);
    }
  };

  const onEnter = () => {
    scale.value = withSpring(1.05, SPRING_CONFIG);
    glowOpacity.value = withTiming(1, { duration: 300 });
  };

  const onLeave = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
    glowOpacity.value = withTiming(0, { duration: 300 });
    rotateX.value = withSpring(0);
    rotateY.value = withSpring(0);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={[styles.cardBase, animatedStyle, style]}
    >
      <Pressable
        onPress={onPress}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onPointerMove={onPointerMove}
        style={styles.innerContent}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
  },
  innerContent: {
    padding: 24,
    flex: 1,
    justifyContent: 'space-between',
  }
});