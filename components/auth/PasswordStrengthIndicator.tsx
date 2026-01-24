/**
 * ============================================================================
 * 🔐 COMPONENT: PASSWORD STRENGTH METER (NEON EDITION)
 * ============================================================================
 * PATH: components/auth/PasswordStrengthIndicator.tsx
 * STATUS: PRODUCTION READY
 * FEATURES:
 * - Fluid Reanimated Bars (Neon Glow).
 * - Heuristic Feedback (Weak -> Secure).
 * ============================================================================
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';

interface Props {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: Props) => {
  const strength = calculateStrength(password);
  const color = getStrengthColor(strength);

  // Animated Values
  const w1 = useSharedValue(0);
  const w2 = useSharedValue(0);
  const w3 = useSharedValue(0);
  const w4 = useSharedValue(0);

  useEffect(() => {
    const config = { duration: 300 };
    w1.value = withTiming(strength >= 1 ? 100 : 0, config);
    w2.value = withTiming(strength >= 2 ? 100 : 0, config);
    w3.value = withTiming(strength >= 3 ? 100 : 0, config);
    w4.value = withTiming(strength >= 4 ? 100 : 0, config);
  }, [strength]);

  const barStyle = (w: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      width: `${w.value}%`,
      backgroundColor: color,
      height: '100%',
      borderRadius: 2,
    }));

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        <View style={styles.track}>
          <Animated.View style={barStyle(w1)} />
        </View>
        <View style={styles.track}>
          <Animated.View style={barStyle(w2)} />
        </View>
        <View style={styles.track}>
          <Animated.View style={barStyle(w3)} />
        </View>
        <View style={styles.track}>
          <Animated.View style={barStyle(w4)} />
        </View>
      </View>
      <Text style={[styles.label, { color }]}>
        {getStrengthLabel(strength)}
      </Text>
    </View>
  );
};

// --- LOGIC ---
function calculateStrength(pass: string): number {
  let score = 0;
  if (!pass) return 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
  return score;
}

function getStrengthColor(score: number) {
  if (score <= 1) return '#EF4444'; // Red
  if (score === 2) return '#F59E0B'; // Amber
  if (score === 3) return '#34D399'; // Green
  return '#10B981'; // Emerald
}

function getStrengthLabel(score: number) {
  if (score === 0) return '';
  if (score <= 2) return 'WEAK SECURITY';
  if (score === 3) return 'MODERATE ENCRYPTION';
  return 'MAXIMUM SECURITY';
}

const styles = StyleSheet.create({
  container: { marginTop: 12, gap: 8 },
  bars: { flexDirection: 'row', gap: 4, height: 4 },
  track: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'right',
  },
});
