import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface Bento3DCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
  onPress?: () => void;
  delay?: number;
}

export function Bento3DCard({
  children,
  style,
  onPress,
  delay = 0,
}: Bento3DCardProps) {
  // Shared Values for 3D Transform
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1); // Start visible
  const opacity = useSharedValue(0); // Fade in on mount

  // Entrance Animation
  React.useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
  }, []);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(0.98);
    })
    .onUpdate((e) => {
      // ⚡ DIALED DOWN INTENSITY:
      // Dividing by larger numbers (e.g. 200/100) to make movement subtle
      rotateX.value = interpolate(e.y, [0, 200], [5, -5], Extrapolation.CLAMP);
      rotateY.value = interpolate(e.x, [0, 200], [-5, 5], Extrapolation.CLAMP);
    })
    .onFinalize(() => {
      rotateX.value = withSpring(0);
      rotateY.value = withSpring(0);
      scale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { perspective: 1000 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Pressable onPress={onPress} style={[{ flex: 1 }, style]}>
        <Animated.View style={[styles.card, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    // Provide a subtle base shadow, remove if NativeWind handles it
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden', // Ensures inner content clips to border
  },
});
