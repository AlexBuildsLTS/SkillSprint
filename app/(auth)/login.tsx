/**
 * ============================================================================
 * PATH: app/(auth)/login.tsx
 * ARCHITECTURE: Responsive Hybrid (Split-Desktop / Stacked-Mobile)
 * FIX: Extracted components to prevent re-mounting on keystrokes.
 * FEATURES:
 * - 3D Gyroscopic-feel Tilt Cards.
 * - Performance-Optimized Reanimated v4 Worklets.
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
  LayoutChangeEvent,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Brain,
  Trophy,
  ShieldCheck,
  Cpu,
  Globe,
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
  interpolateColor,
  interpolate,
  Extrapolation,
  withSequence,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// INTERNAL UI SYSTEM
import { GlassCard } from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';

// ASSET: Identity
const APP_ICON = require('../../assets/images/favicons.png');

// --- THEME & CONFIG ---
const THEME = {
  indigo: '#6366f1',
  obsidian: '#020617',
  slate: '#94a3b8',
  white: '#ffffff',
  glassBorder: 'rgba(255,255,255,0.08)',
  accentGlow: 'rgba(99, 102, 241, 0.25)',
  errorRed: '#ef4444',
  cardBg: 'rgba(30, 41, 59, 0.4)',
};

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

// --- TYPES ---
type BentoItem = {
  icon: any;
  title: string;
  desc: string;
};

// --- DATA ---
const BENTO_ITEMS: BentoItem[] = [
  {
    icon: Zap,
    title: 'Adaptive Sprints',
    desc: 'AI-generated cards tuned precisely to your specific technical gaps.',
  },
  {
    icon: Brain,
    title: 'Neural Caching',
    desc: 'Advanced spaced repetition algorithms computed on the Deno Edge.',
  },
  {
    icon: Trophy,
    title: 'Elite Clusters',
    desc: 'Global ranking system for verified technical mastery and streaks.',
  },
  {
    icon: Cpu,
    title: 'Security-First',
    desc: 'All technical progression is verified via isolated server-side logic.',
  },
  {
    icon: Fingerprint,
    title: 'Secure Identity',
    desc: 'Identity management strictly handled via Supabase Auth services.',
  },
  {
    icon: Globe,
    title: 'Global Nodes',
    desc: 'Synchronize your learning data across all device endpoints instantly.',
  },
];

// --- MAIN SCREEN COMPONENT ---
export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // FORM STATE
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // CALLBACKS (Memoized)
  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();

    if (!trimmedEmail || !trimmedPass) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Credentials Required', 'Identity your learner node.');
    }

    setLoading(true);

    try {
      await signIn(trimmedEmail, trimmedPass);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Access Denied', error.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn, router]);

  return (
    <View style={styles.root}>
      {/* BACKGROUND GRADIENT */}
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {isDesktop ? (
            // ==================== DESKTOP (SPLIT VIEW) ====================
            <View style={styles.desktopContainer}>
              <View style={styles.desktopSidebar}>
                <View style={{ width: '100%', maxWidth: 420 }}>
                  <BrandHeader />
                  <LoginFormContent
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    loading={loading}
                    onLogin={handleLogin}
                  />
                  <SecurityFooter />
                </View>
              </View>

              <ScrollView
                style={styles.desktopScroll}
                contentContainerStyle={styles.desktopScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <MarketingContent isDesktop={true} />
              </ScrollView>
            </View>
          ) : (
            // ==================== MOBILE (UNIFIED SCROLL) ====================
            <ScrollView
              style={styles.mobileScroll}
              contentContainerStyle={styles.mobileScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.mobilePane}>
                <BrandHeader />
                <LoginFormContent
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  loading={loading}
                  onLogin={handleLogin}
                />
                <SecurityFooter />
              </View>
              <View style={styles.mobileDivider} />
              <View style={styles.mobilePane}>
                <MarketingContent isDesktop={false} />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// --- EXTRACTED COMPONENTS (PREVENTS RE-RENDER LOOPS) ---

const BrandHeader = memo(() => {
  const iconScale = useSharedValue(1);
  const iconRotate = useSharedValue(0);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  const handleIconPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    iconRotate.value = withSequence(
      withTiming(15, { duration: 100 }),
      withTiming(-15, { duration: 100 }),
      withTiming(0, { duration: 100 }),
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(1000).springify()}
      style={styles.brandHeader}
    >
      <Pressable
        onPressIn={() => (iconScale.value = withSpring(1.1))}
        onPressOut={() => (iconScale.value = withSpring(1))}
        onPress={handleIconPress}
      >
        <Animated.View style={animatedIconStyle}>
          <Image
            source={APP_ICON}
            style={styles.brandIcon}
            resizeMode="contain"
          />
        </Animated.View>
      </Pressable>
      <Text style={styles.subtitle}>Resume Technical Mastery</Text>
    </Animated.View>
  );
});
BrandHeader.displayName = 'BrandHeader';

const LoginFormContent = memo(
  ({ email, setEmail, password, setPassword, loading, onLogin }: any) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <GlassCard intensity="light" style={styles.formCard}>
        <View style={{ gap: 24 }}>
          {/* EMAIL */}
          <View>
            <Text style={styles.label}>Email Account</Text>
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

          {/* PASSWORD */}
          <View>
            <Text style={styles.label}>Password</Text>
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPassword(!showPassword);
                }}
                style={{ padding: 8 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={THEME.slate} />
                ) : (
                  <Eye size={18} color={THEME.slate} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* LOGIN BUTTON */}
          <Button
            onPress={onLogin}
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

          {/* REGISTER LINK */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>No Account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity
                onPress={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                }
              >
                <Text style={styles.switchLink}>Create Account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </GlassCard>
    );
  },
);
LoginFormContent.displayName = 'LoginFormContent';

const SecurityFooter = memo(() => (
  <View style={styles.securityTag}>
    <ShieldCheck size={12} color={THEME.slate} />
    <Text style={styles.securityText}>AES-256 BIT ENCRYPTED NODE</Text>
  </View>
));
SecurityFooter.displayName = 'SecurityFooter';

const MarketingContent = memo(({ isDesktop }: { isDesktop: boolean }) => (
  <View style={{ width: '100%', paddingBottom: 60 }}>
    <Animated.View
      entering={FadeInRight.duration(1200).springify().delay(200)}
      style={{ marginBottom: 40 }}
    >
      <Text style={[styles.heroTitle, !isDesktop && styles.heroTitleMobile]}>
        Elite <Text style={{ color: THEME.indigo }}>Micro-Learning</Text>
      </Text>
      <Text style={[styles.heroSub, !isDesktop && styles.heroSubMobile]}>
        Synchronize your technical growth with AI-tuned sprints. Master complex
        engineering patterns in daily 5-minute sessions.
      </Text>
    </Animated.View>

    <View style={styles.bentoGrid}>
      {BENTO_ITEMS.map((item, index) => (
        <Bento3DCard
          key={index}
          index={index}
          item={item}
          isDesktop={isDesktop}
        />
      ))}
    </View>

    <View style={styles.footerVersion}>
      <Text style={styles.versionText}>
        SYSTEM REV 8.0.0 | PRODUCTION ENCLAVE
      </Text>
    </View>
  </View>
));
MarketingContent.displayName = 'MarketingContent';

const Bento3DCard = memo(
  ({
    item,
    index,
    isDesktop,
  }: {
    item: BentoItem;
    index: number;
    isDesktop: boolean;
  }) => {
    const Icon = item.icon;
    const rotateX = useSharedValue(0);
    const rotateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);
    const [layout, setLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { perspective: 1000 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
        { scale: withSpring(scale.value, SPRING_CONFIG) },
      ],
      borderColor: interpolateColor(
        glowOpacity.value,
        [0, 1],
        ['rgba(255,255,255,0.05)', 'rgba(99, 102, 241, 0.5)'],
      ),
      backgroundColor: interpolateColor(
        glowOpacity.value,
        [0, 1],
        ['rgba(30, 41, 59, 0.4)', 'rgba(99, 102, 241, 0.08)'],
      ),
    }));

    const handleInteraction = (active: boolean) => {
      scale.value = withSpring(active ? 0.98 : 1);
      glowOpacity.value = withTiming(active ? 1 : 0);
      if (!active && !isDesktop) {
        rotateX.value = withSpring(0);
        rotateY.value = withSpring(0);
      }
    };

    const handleMove = (event: any) => {
      let x = 0;
      let y = 0;

      if (Platform.OS === 'web') {
        x = event.nativeEvent.offsetX;
        y = event.nativeEvent.offsetY;
      } else {
        x = event.nativeEvent.locationX;
        y = event.nativeEvent.locationY;
      }

      if (layout.width > 0 && layout.height > 0) {
        rotateX.value = interpolate(
          y,
          [0, layout.height],
          [10, -10],
          Extrapolation.CLAMP,
        );
        rotateY.value = interpolate(
          x,
          [0, layout.width],
          [-10, 10],
          Extrapolation.CLAMP,
        );
      }
    };

    return (
      <Animated.View
        entering={FadeInRight.delay(200 + index * 100).springify()}
        style={[
          styles.bentoCardContainer,
          { width: isDesktop ? '48%' : '100%' },
          animatedStyle,
        ]}
        onLayout={(e: LayoutChangeEvent) => setLayout(e.nativeEvent.layout)}
      >
        <Pressable
          style={styles.bentoInner}
          onHoverIn={() => isDesktop && handleInteraction(true)}
          onHoverOut={() => isDesktop && handleInteraction(false)}
          onPressIn={() => handleInteraction(true)}
          onPressOut={() => handleInteraction(false)}
          // @ts-ignore
          onPointerMove={isDesktop ? handleMove : undefined}
          onTouchMove={!isDesktop ? handleMove : undefined}
        >
          <View style={styles.bentoIconBox}>
            <Icon size={24} color={THEME.indigo} strokeWidth={2.5} />
          </View>
          <Text style={styles.bentoTitle}>{item.title}</Text>
          <Text style={styles.bentoDesc}>{item.desc}</Text>
        </Pressable>
      </Animated.View>
    );
  },
);
Bento3DCard.displayName = 'Bento3DCard';

// --- STYLESHEET ---
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },

  // DESKTOP LAYOUT
  desktopContainer: { flexDirection: 'row', flex: 1 },
  desktopSidebar: {
    width: '40%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    zIndex: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
  },
  desktopScroll: { flex: 1 },
  desktopScrollContent: { padding: 80, paddingBottom: 150 },

  // MOBILE LAYOUT
  mobileScroll: { flex: 1 },
  mobileScrollContent: { flexGrow: 1, paddingBottom: 100 },
  mobilePane: { padding: 24, paddingTop: 40 },
  mobileDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 40,
    marginHorizontal: 24,
  },

  // UI ELEMENTS
  brandHeader: { alignItems: 'center', marginBottom: 32 },
  brandIcon: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  subtitle: {
    color: THEME.slate,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  formCard: {
    padding: 32,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },

  label: {
    color: THEME.indigo,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputRow: {
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    color: THEME.white,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },

  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: {
    color: THEME.white,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1.5,
  },

  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: THEME.slate, fontSize: 13 },
  switchLink: { color: THEME.indigo, fontWeight: '800', fontSize: 13 },

  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    opacity: 0.4,
    gap: 8,
  },
  securityText: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // MARKETING TYPOGRAPHY
  heroTitle: {
    color: THEME.white,
    fontSize: 64,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -3,
    lineHeight: 70,
  },
  heroTitleMobile: {
    fontSize: 42,
    lineHeight: 48,
  },
  heroSub: {
    color: THEME.slate,
    fontSize: 20,
    lineHeight: 32,
    marginTop: 24,
    maxWidth: 600,
  },
  heroSubMobile: {
    fontSize: 16,
    lineHeight: 26,
  },

  // BENTO GRID
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 60,
  },
  bentoCardContainer: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bentoInner: {
    padding: 32,
    minHeight: 200,
    justifyContent: 'flex-start',
  },
  bentoIconBox: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bentoTitle: {
    color: THEME.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  bentoDesc: {
    color: THEME.slate,
    fontSize: 14,
    lineHeight: 22,
  },

  footerVersion: {
    marginTop: 80,
    alignItems: 'flex-start',
    opacity: 0.2,
  },
  versionText: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
