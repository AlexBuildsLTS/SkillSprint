/**
 * ============================================================================
 * 🔐 SCREEN: SKILLSPRINT CORE ESTABLISHMENT (REGISTER) - V9.0 (REPAIRED)
 * ============================================================================
 * PATH: app/(auth)/register.tsx
 * STATUS: FIXED & VERIFIED
 * FIX: Restored Auth Context integration + Fixed Form State Binding.
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
import { useRouter, Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import {
  User,
  Mail,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Brain,
  Trophy,
  Cpu,
  Layers,
  Globe,
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

// UI COMPONENT SYSTEM
import { GlassCard } from '@/components/ui/GlassCard';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import Button from '@/components/ui/Button';

// ASSET: Identity
const APP_ICON = require('../../assets/images/favicons.png');

// --- THEME & CONFIG ---
const THEME = {
  indigo: '#6366f1',
  obsidian: '#020617',
  slate: '#94a3b8',
  white: '#ffffff',
  accent: '#10b981',
  glassBorder: 'rgba(255,255,255,0.08)',
};

// --- DATA ---
const BENTO_ITEMS = [
  {
    icon: Zap,
    title: 'Adaptive Sprints',
    desc: 'AI-generated challenges tuned precisely to technical gaps.',
  },
  {
    icon: Brain,
    title: 'Neural Caching',
    desc: 'Edge-computed spaced repetition algorithmic logic.',
  },
  {
    icon: Trophy,
    title: 'Elite Clusters',
    desc: 'Verified Global ranking for senior technical mastery.',
  },
  {
    icon: Cpu,
    title: 'Deno Wall',
    desc: 'Isolated progression via server-side secure worklets.',
  },
  {
    icon: Layers,
    title: 'Deep Tracks',
    desc: 'Multi-stage learning paths designed by Lead Architects.',
  },
  {
    icon: Globe,
    title: 'Global Nodes',
    desc: 'Synchronize technical progress across all device endpoints.',
  },
];

// --- MAIN SCREEN COMPONENT ---
export default function RegisterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // FORM STATE
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  });
  const [loading, setLoading] = useState(false);

  // CALLBACKS
  // Using useCallback ensures these functions don't change on every render,
  // preventing child components from re-rendering unnecessarily.
  const updateForm = useCallback((key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRegister = async () => {
    const { firstName, lastName, email, password, confirmPassword, agreed } =
      form;

    // 1. Validation
    if (!firstName || !lastName || !email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert(
        'Protocol Incomplete',
        'All identity fields are mandatory.',
      );
    }
    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Security Violation', 'Master tokens do not match.');
    }
    if (password.length < 8) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert(
        'Security Violation',
        'Token length insufficient (min 8).',
      );
    }
    if (!agreed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return Alert.alert(
        'Access Restricted',
        'Accept security protocols to initialize.',
      );
    }

    setLoading(true);
    try {
      // 2. Supabase Registration
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            username: email.split('@')[0] + Math.floor(Math.random() * 1000),
          },
        },
      });

      if (error) throw error;

      // 3. Success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Node Initialized',
        'Identity established. Check your email for verification if enabled, or proceed to login.',
        [{ text: 'PROCEED', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Establishment Failed',
        e.message || 'Network encryption error.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
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
            <View style={styles.desktopContainer}>
              <View style={styles.desktopSidebar}>
                <RegisterFormContent
                  form={form}
                  loading={loading}
                  updateForm={updateForm}
                  onRegister={handleRegister}
                />
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
            <ScrollView
              style={styles.mobileScroll}
              contentContainerStyle={styles.mobileScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.mobilePane}>
                <RegisterFormContent
                  form={form}
                  loading={loading}
                  updateForm={updateForm}
                  onRegister={handleRegister}
                />
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

// --- EXTRACTED FORM COMPONENT ---
// Keeps the input logic isolated but controlled by the parent state
const RegisterFormContent = memo(
  ({ form, loading, updateForm, onRegister }: any) => {
    const [showPassword, setShowPassword] = useState(false);
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
      <View style={{ width: '100%', maxWidth: 480 }}>
        <Animated.View
          entering={FadeInDown.duration(800).springify()}
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Provision new learner identity</Text>
        </Animated.View>

        <GlassCard intensity="heavy" style={styles.formCard}>
          <View style={{ gap: 20 }}>
            {/* Name Cluster */}
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>First Name</Text>
                <View style={styles.inputRow}>
                  <User size={16} color={THEME.slate} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Jane"
                    placeholderTextColor="#475569"
                    value={form.firstName}
                    onChangeText={(v) => updateForm('firstName', v)}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Last Name</Text>
                <View style={styles.inputRow}>
                  <User size={16} color={THEME.slate} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Doe"
                    placeholderTextColor="#475569"
                    value={form.lastName}
                    onChangeText={(v) => updateForm('lastName', v)}
                  />
                </View>
              </View>
            </View>

            {/* Identity Node */}
            <View>
              <Text style={styles.label}>Identity Email</Text>
              <View style={styles.inputRow}>
                <Mail size={16} color={THEME.slate} />
                <TextInput
                  style={styles.textInput}
                  placeholder="learner@skillsprint.ai"
                  autoCapitalize="none"
                  placeholderTextColor="#475569"
                  value={form.email}
                  onChangeText={(v) => updateForm('email', v)}
                />
              </View>
            </View>

            {/* Security Master Token */}
            <View>
              <Text style={styles.label}>Master Token</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={THEME.slate} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#475569"
                  value={form.password}
                  onChangeText={(v) => updateForm('password', v)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={THEME.slate} />
                  ) : (
                    <Eye size={16} color={THEME.slate} />
                  )}
                </TouchableOpacity>
              </View>
              <PasswordStrengthIndicator password={form.password} />
            </View>

            {/* Token Verification */}
            <View>
              <Text style={styles.label}>Confirm Token</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={THEME.slate} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#475569"
                  value={form.confirmPassword}
                  onChangeText={(v) => updateForm('confirmPassword', v)}
                />
              </View>
            </View>

            {/* Protocol Check */}
            <TouchableOpacity
              style={styles.protocolRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateForm('agreed', !form.agreed);
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  form.agreed && {
                    backgroundColor: THEME.indigo,
                    borderColor: THEME.indigo,
                  },
                ]}
              >
                {form.agreed && <CheckCircle2 size={12} color="#fff" />}
              </View>
              <Text style={styles.protocolText}>
                Accept Security Protocols & Terms
              </Text>
            </TouchableOpacity>

            <Button onPress={onRegister} disabled={loading} fullWidth size="lg">
              {loading ? <ActivityIndicator color={THEME.white} /> : 'REGISTER'}
            </Button>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Node already provisioned? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.switchLink}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </GlassCard>

        <View style={styles.integrityFooter}>
          <ShieldCheck size={14} color={THEME.slate} />
          <Text style={styles.integrityText}>
            ENCRYPTED IDENTITY REGISTRY V2.4
          </Text>
        </View>
      </View>
    );
  },
);
RegisterFormContent.displayName = 'RegisterFormContent';

// --- MARKETING CONTENT (BENTO GRID) ---
const MarketingContent = memo(({ isDesktop }: { isDesktop: boolean }) => (
  <View style={{ width: '100%', paddingBottom: 60 }}>
    <Animated.View
      entering={FadeInRight.duration(1000).springify()}
      style={{ marginBottom: 40 }}
    >
      <Text style={[styles.heroTitle, !isDesktop && styles.heroTitleMobile]}>
        Elite <Text style={{ color: THEME.indigo }}>Performance</Text>
      </Text>
      <Text style={[styles.heroSub, !isDesktop && styles.heroSubMobile]}>
        The production-grade habit engine for software engineers. Master complex
        technical systems in 5-minute sessions.
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
        BUILD 2026.04.12 | SECURE ENCLAVE ACTIVE
      </Text>
    </View>
  </View>
));
MarketingContent.displayName = 'MarketingContent';

// --- BENTO CARD COMPONENT ---
const Bento3DCard = memo(({ item, index, isDesktop }: any) => {
  const Icon = item.icon;
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const [layout, setLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: withSpring(scale.value, { damping: 12, stiffness: 100 }) },
    ],
    backgroundColor: interpolateColor(
      glowOpacity.value,
      [0, 1],
      ['rgba(15, 23, 42, 0.3)', 'rgba(99, 102, 241, 0.08)'],
    ),
    borderColor: interpolateColor(
      glowOpacity.value,
      [0, 1],
      ['rgba(255,255,255,0.05)', 'rgba(99, 102, 241, 0.4)'],
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
    const x =
      Platform.OS === 'web'
        ? event.nativeEvent.offsetX
        : event.nativeEvent.locationX;
    const y =
      Platform.OS === 'web'
        ? event.nativeEvent.offsetY
        : event.nativeEvent.locationY;

    if (layout.width > 0 && layout.height > 0) {
      rotateX.value = interpolate(
        y,
        [0, layout.height],
        [8, -8],
        Extrapolation.CLAMP,
      );
      rotateY.value = interpolate(
        x,
        [0, layout.width],
        [-8, 8],
        Extrapolation.CLAMP,
      );
    }
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(400 + index * 100).springify()}
      style={[
        styles.bentoCardContainer,
        { width: isDesktop ? '48%' : '100%' },
        animatedStyle,
      ]}
      onLayout={(e: LayoutChangeEvent) => setLayout(e.nativeEvent.layout)}
    >
      <Pressable
        style={styles.bentoInnerContent}
        onHoverIn={() => isDesktop && handleInteraction(true)}
        onHoverOut={() => isDesktop && handleInteraction(false)}
        onPressIn={() => handleInteraction(true)}
        onPressOut={() => handleInteraction(false)}
        // @ts-ignore
        onPointerMove={isDesktop ? handleMove : undefined}
        onTouchMove={!isDesktop ? handleMove : undefined}
      >
        <View style={styles.bentoIconBox}>
          <Icon size={26} color={THEME.indigo} strokeWidth={2.5} />
        </View>
        <Text style={styles.bentoTitle}>{item.title}</Text>
        <Text style={styles.bentoDesc}>{item.desc}</Text>
      </Pressable>
    </Animated.View>
  );
});
Bento3DCard.displayName = 'Bento3DCard';

// --- STYLES ---
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  desktopContainer: { flexDirection: 'row', flex: 1 },
  desktopSidebar: {
    width: '42%',
    height: '100%',
    paddingHorizontal: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    zIndex: 10,
  },
  desktopScroll: { flex: 1 },
  desktopScrollContent: { padding: 80, paddingBottom: 150 },
  mobileScroll: { flex: 1 },
  mobileScrollContent: { flexGrow: 1, paddingBottom: 80 },
  mobilePane: { padding: 24, paddingTop: 40 },
  mobileDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 40,
    marginHorizontal: 24,
  },
  brandHeader: { alignItems: 'center', marginBottom: 32 },
  brandIcon: { width: 140, height: 140, marginBottom: 24 },
  title: {
    color: THEME.white,
    fontSize: 40,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1.5,
  },
  subtitle: {
    color: THEME.slate,
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  formCard: {
    padding: 28,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  nameRow: { flexDirection: 'row', gap: 16 },
  label: {
    color: '#6366f1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputRow: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    color: THEME.white,
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '600',
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  protocolText: { color: THEME.slate, fontSize: 11 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#64748b', fontSize: 13 },
  switchLink: { color: THEME.indigo, fontWeight: '800', fontSize: 13 },
  integrityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    opacity: 0.3,
    gap: 10,
  },
  integrityText: {
    color: THEME.slate,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: THEME.white,
    fontSize: 64,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -4,
    lineHeight: 76,
  },
  heroTitleMobile: { fontSize: 42, lineHeight: 48 },
  heroSub: {
    color: '#64748b',
    fontSize: 20,
    lineHeight: 32,
    marginTop: 28,
    maxWidth: 580,
  },
  heroSubMobile: { fontSize: 16, lineHeight: 26 },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginTop: 64 },
  bentoCardContainer: { borderRadius: 28, borderWidth: 1, overflow: 'hidden' },
  bentoInnerContent: {
    padding: 36,
    minHeight: 230,
    justifyContent: 'flex-start',
  },
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
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  bentoDesc: { color: '#64748b', fontSize: 15, lineHeight: 24 },
  footerVersion: { marginTop: 100, opacity: 0.15 },
  versionText: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
