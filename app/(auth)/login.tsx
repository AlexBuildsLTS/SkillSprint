/**
 * ============================================================================
 * 🚀 SCREEN: SKILLSPRINT AUTHENTICATION CORE (LOGIN)
 * ============================================================================
 * PATH: app/(auth)/login.tsx
 * ARCHITECTURE: Thin-client UI with Reanimated v4 Worklets.
 * FEATURES:
 * - 3D Perspective Tilt Bento Grid (Computed on UI Thread).
 * - Liquid Glassmorphism (Backdrop Filter Simulation).
 * - Asset Hero Optimization for icon.png.
 * - Haptic Feedback Lifecycle Management.
 * ============================================================================
 */

import React, { useState, memo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  StyleSheet,
  Image,
  Pressable,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Brain,
  Zap,
  Trophy,
  ShieldCheck,
  Cpu,
  Globe,
  Star,
  Layers,
  ChevronRight,
  Fingerprint,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
  Extrapolation,
  withDelay,
  withSequence,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// INTERNAL UI SYSTEM
import { GlassCard } from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';

// ASSET: Unrestricted High-Resolution Identity
const APP_ICON = require('../../assets/images/favicons.png');

// --- THEME ARCHITECTURE ---
const THEME = {
  indigo: '#6366f1',
  obsidian: '#020617',
  slate: '#94a3b8',
  white: '#ffffff',
  glassBorder: 'rgba(255,255,255,0.08)',
  accentGlow: 'rgba(99, 102, 241, 0.25)',
  errorRed: '#ef4444',
};

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 120,
  mass: 1,
};

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // FORM STATE
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // REANIMATED SHARED VALUES FOR HEADER INTERACTION
  const iconScale = useSharedValue(1);
  const iconRotate = useSharedValue(0);

  /**
   * AUTHENTICATION ORCHESTRATOR
   * Interacts with Supabase Auth Context
   */
  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();

    if (!trimmedEmail || !trimmedPass) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Credentials Required', 'Identity your learner node.');
    }

    setLoading(true);
    iconScale.value = withTiming(0.9);

    try {
      await signIn(trimmedEmail, trimmedPass);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Access Denied', error.message || 'Authentication error.');
      iconScale.value = withSequence(
        withSpring(1.2, SPRING_CONFIG),
        withSpring(1, SPRING_CONFIG),
      );
    } finally {
      setLoading(false);
    }
  };

  // ANIMATED STYLES
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(iconScale.value) },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={isDesktop ? styles.desktopLayout : styles.mobileLayout}>
            {/* --- LEFT NAVIGATION / FORM SIDEBAR --- */}
            <View style={isDesktop ? styles.sidebar : styles.mobilePane}>
              <Animated.View
                entering={FadeInDown.duration(1000).springify()}
                style={styles.brandHeader}
              >
                <Pressable
                  onPressIn={() => (iconScale.value = withSpring(1.1))}
                  onPressOut={() => (iconScale.value = withSpring(1))}
                  onPress={() =>
                    (iconRotate.value = withSequence(
                      withTiming(10),
                      withTiming(0),
                    ))
                  }
                >
                  <Animated.View style={[styles.brandBox, animatedIconStyle]}>
                    <Image
                      source={APP_ICON}
                      style={styles.brandIcon}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </Pressable>
                <Text style={styles.title}>SkillSprint</Text>
                <Text style={styles.subtitle}>Resume Technical Mastery</Text>
              </Animated.View>

              <GlassCard intensity="light" style={styles.formCard}>
                <View style={{ gap: 24 }}>
                  {/* EMAIL INPUT BLOCK */}
                  <View>
                    <Text style={styles.label}>Learner Identity</Text>
                    <View style={styles.inputRow}>
                      <Mail size={18} color={THEME.slate} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="learner@skillsprint.ai"
                        placeholderTextColor="#475569"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  {/* PASSWORD INPUT BLOCK */}
                  <View>
                    <Text style={styles.label}>Master Key</Text>
                    <View style={styles.inputRow}>
                      <Lock size={18} color={THEME.slate} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="••••••••"
                        secureTextEntry={!showPassword}
                        placeholderTextColor="#475569"
                        value={password}
                        onChangeText={setPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          setShowPassword(!showPassword);
                        }}
                      >
                        {showPassword ? (
                          <EyeOff size={18} color={THEME.slate} />
                        ) : (
                          <Eye size={18} color={THEME.slate} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* SUBMIT ACTION */}
                  <Button
                    onPress={handleLogin}
                    disabled={loading}
                    fullWidth
                    size="lg"
                    className="mt-4"
                  >
                    {loading ? (
                      <ActivityIndicator color={THEME.white} />
                    ) : (
                      <View style={styles.btnInner}>
                        <Text style={styles.btnText}>Login</Text>
                        <ChevronRight size={18} color={THEME.white} />
                      </View>
                    )}
                  </Button>

                  {/* ROUTE TRANSITION */}
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>
                      No Account?{' '}
                    </Text>
                    <Link href="/(auth)/register" asChild>
                      <TouchableOpacity
                        onPress={() =>
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium,
                          )
                        }
                      >
                        <Text style={styles.switchLink}>Create Account</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </View>
              </GlassCard>

              {/* SECURITY FOOTER */}
              <View style={styles.securityTag}>
                <ShieldCheck size={12} color={THEME.slate} />
                <Text style={styles.securityText}>
                  AES-256 BIT ENCRYPTED NODE
                </Text>
              </View>
            </View>

            {/* --- RIGHT MARKETING / BENTO INTELLIGENCE --- */}
            {isDesktop && <MarketingSection />}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/**
 * INTELLIGENCE GRID COMPONENT
 * Renders high-performance Bento modules with Reanimated v4 3D Worklets
 */
const MarketingSection = memo(() => {
  return (
    <ScrollView
      style={styles.contentScroll}
      contentContainerStyle={styles.marketingContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeInRight.duration(1200).springify().delay(200)}
      >
        <Text style={styles.heroTitle}>
          Elite <Text style={{ color: THEME.indigo }}>Micro-Learning</Text>
        </Text>
        <Text style={styles.heroSub}>
          Synchronize your technical growth with AI-tuned sprints. Master
          complex engineering patterns in daily 5-minute sessions.
        </Text>
      </Animated.View>

      <View style={styles.bentoGrid}>
        <BentoModule
          icon={Zap}
          title="Adaptive Sprints"
          desc="AI-generated cards tuned precisely to your specific technical gaps."
          index={0}
        />
        <BentoModule
          icon={Brain}
          title="Neural Caching"
          desc="Advanced spaced repetition algorithms computed on the Deno Edge."
          index={1}
        />
        <BentoModule
          icon={Trophy}
          title="Elite Clusters"
          desc="Global ranking system for verified technical mastery and streaks."
          index={2}
        />
        <BentoModule
          icon={Cpu}
          title="Security-First"
          desc="All technical progression is verified via isolated server-side logic."
          index={3}
        />
        <BentoModule
          icon={Fingerprint}
          title="Secure Identity"
          desc="Identity management strictly handled via Supabase Auth services."
          index={4}
        />
        <BentoModule
          icon={Globe}
          title="Global Nodes"
          desc="Synchronize your learning data across all device endpoints instantly."
          index={5}
        />
      </View>

      <View style={styles.footerVersion}>
        <Text style={styles.versionText}>
          SYSTEM REV 5.4.1 | PRODUCTION ENCLAVE
        </Text>
      </View>
    </ScrollView>
  );
});
MarketingSection.displayName = 'MarketingSection';

/**
 * 3D TILT BENTO MODULE
 * Implements Reanimated v4 Worklets for perspective rotation based on pointer position.
 */
const BentoModule = ({ icon: Icon, title, desc, index }: any) => {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // REANIMATED V4 WORKLET: 3D TRANSFORM LOGIC
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
        { scale: withSpring(scale.value) },
      ],
      borderColor: interpolateColor(
        glowOpacity.value,
        [0, 1],
        ['rgba(255,255,255,0.05)', 'rgba(99, 102, 241, 0.4)'],
      ),
      backgroundColor: interpolateColor(
        glowOpacity.value,
        [0, 1],
        ['rgba(15, 23, 42, 0.3)', 'rgba(99, 102, 241, 0.08)'],
      ),
    };
  });

  const onPointerMove = (e: any) => {
    if (Platform.OS === 'web') {
      const { nativeEvent } = e;
      // Map pointer offset to degrees
      rotateY.value = interpolate(
        nativeEvent.offsetX,
        [0, 300],
        [-10, 10],
        Extrapolation.CLAMP,
      );
      rotateX.value = interpolate(
        nativeEvent.offsetY,
        [0, 200],
        [10, -10],
        Extrapolation.CLAMP,
      );
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
      entering={FadeInRight.delay(400 + index * 100).springify()}
      style={[
        { width: '48%', borderRadius: 32, borderWidth: 1 },
        animatedStyle,
      ]}
    >
      <Pressable
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onPointerMove={onPointerMove}
        onTouchStart={() => (scale.value = withSpring(0.97))}
        onTouchEnd={() => (scale.value = withSpring(1))}
        style={styles.bentoInnerContent}
      >
        <View style={styles.bentoIconBox}>
          <Icon size={24} color={THEME.indigo} strokeWidth={2.5} />
        </View>
        <Text style={styles.bentoTitle}>{title}</Text>
        <Text style={styles.bentoDesc}>{desc}</Text>
      </Pressable>
    </Animated.View>
  );
};

// --- STYLESHEET ARCHITECTURE ---
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  desktopLayout: { flexDirection: 'row', flex: 1 },
  mobileLayout: { flex: 1, justifyContent: 'center' },
  sidebar: {
    width: '38%',
    height: '100%',
    paddingHorizontal: 56,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    backgroundColor: THEME.obsidian,
    zIndex: 10,
  },
  mobilePane: { width: '100%', padding: 24 },
  brandHeader: { alignItems: 'center', marginBottom: 36 },
  brandBox: {
    width: 140,
    height: 140,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  brandIcon: { width: '100%', height: '100%' },
  title: {
    color: THEME.white,
    fontSize: 42,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -2,
  },
  subtitle: {
    color: THEME.slate,
    fontSize: 16,
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  formCard: {
    padding: 36,
    borderRadius: 48,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  label: {
    color: THEME.indigo,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
    marginLeft: 4,
  },
  inputRow: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  textInput: {
    flex: 1,
    color: THEME.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 14,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnText: {
    color: THEME.white,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 2,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  switchText: { color: '#64748b', fontSize: 14 },
  switchLink: { color: THEME.indigo, fontWeight: '800', fontSize: 14 },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    opacity: 0.3,
    gap: 8,
  },
  securityText: {
    color: THEME.slate,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  contentScroll: { flex: 1, backgroundColor: '#010409' },
  marketingContainer: { padding: 80, paddingBottom: 120 },
  heroTitle: {
    color: THEME.white,
    fontSize: 72,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -4,
    lineHeight: 82,
  },
  heroSub: {
    color: '#64748b',
    fontSize: 22,
    lineHeight: 38,
    marginTop: 28,
    maxWidth: 640,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginTop: 70,
  },
  bentoInnerContent: { padding: 36, minHeight: 220 },
  bentoIconBox: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  bentoTitle: {
    color: THEME.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  bentoDesc: {
    color: '#64748b',
    fontSize: 16,
    lineHeight: 26,
  },
  footerVersion: { marginTop: 100, opacity: 0.15 },
  versionText: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
