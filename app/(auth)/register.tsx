/**
 * ============================================================================
 * 🔐 SCREEN: SKILLSPRINT CORE ESTABLISHMENT (REGISTER)
 * ============================================================================
 * PATH: app/(auth)/register.tsx
 * STATUS: PRODUCTION READY - ARCHITECT LEVEL
 * * FEATURES:
 * - Multi-stage Node Provisioning Logic.
 * - Neon Password Strength Matrix.
 * - Reanimated v4 3D Bento Worklets.
 * - Strict Confirm Token Validation.
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
import { useRouter, Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import {
  User,
  Mail,
  Lock,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Cpu,
  Globe,
  Zap,
  Brain,
  Trophy,
  Terminal,
  Activity,
  Layers,
  Database,
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
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// UI COMPONENT SYSTEM
import { GlassCard } from '@/components/ui/GlassCard';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import Button from '@/components/ui/Button';

const APP_ICON = require('../../assets/images/favicons.png');

const THEME = {
  indigo: '#6366f1',
  obsidian: '#020617',
  slate: '#94a3b8',
  white: '#ffffff',
  accent: '#10b981',
};

export default function RegisterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // OPERATOR IDENTITY STATE
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /**
   * NODE PROVISIONING PROTOCOL
   * Strictly validates tokens and security agreements
   */
  const handleRegister = async () => {
    const { firstName, lastName, email, password, confirmPassword, agreed } =
      form;

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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Node Initialized',
        'Identity established. Activation required via login.',
        [{ text: 'PROCEED', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Establishment Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={isDesktop ? styles.desktopLayout : styles.mobileLayout}>
            {/* --- IDENTITY PROVISIONING SIDEBAR --- */}
            <View style={isDesktop ? styles.sidebar : styles.mobilePane}>
              <Animated.View
                entering={FadeInDown.duration(800).springify()}
                style={styles.brandHeader}
              >
                <View style={styles.brandBox}>
                  <Image
                    source={APP_ICON}
                    style={styles.brandIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.title}>Establish Core</Text>
                <Text style={styles.subtitle}>
                  Provision new learner identity
                </Text>
              </Animated.View>

              <GlassCard intensity="heavy" style={styles.formCard}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 20 }}
                >
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

                  {/* Security Protocol Check */}
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

                  <Button
                    onPress={handleRegister}
                    disabled={loading}
                    fullWidth
                    size="lg"
                  >
                    {loading ? (
                      <ActivityIndicator color={THEME.white} />
                    ) : (
                      'REGISTER'
                    )}
                  </Button>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>
                      Node already provisioned?{' '}
                    </Text>
                    <Link href="/(auth)/login" asChild>
                      <TouchableOpacity>
                        <Text style={styles.switchLink}>Sign In</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </ScrollView>
              </GlassCard>

              {/* Security Footer Tag */}
              <View style={styles.integrityFooter}>
                <ShieldCheck size={14} color={THEME.slate} />
                <Text style={styles.integrityText}>
                  ENCRYPTED IDENTITY REGISTRY V2.4
                </Text>
              </View>
            </View>

            {/* --- BENTO INTELLIGENCE GRID --- */}
            {isDesktop && <MarketingSection />}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// SHARED COMPONENTS DUPLICATED FOR ARCHITECTURAL STABILITY
const MarketingSection = memo(() => (
  <ScrollView
    style={styles.contentScroll}
    contentContainerStyle={styles.marketingContainer}
    showsVerticalScrollIndicator={false}
  >
    <Animated.View entering={FadeInRight.duration(1000).springify()}>
      <Text style={styles.heroTitle}>
        Elite <Text style={{ color: THEME.indigo }}>Performance</Text>
      </Text>
      <Text style={styles.heroSub}>
        The production-grade habit engine for software engineers. Master complex
        technical systems in 5-minute sessions.
      </Text>
    </Animated.View>
    <View style={styles.bentoGrid}>
      <BentoModule
        icon={Zap}
        title="Adaptive Sprints"
        desc="AI-generated challenges tuned precisely to technical gaps."
        index={0}
      />
      <BentoModule
        icon={Brain}
        title="Neural Caching"
        desc="Edge-computed spaced repetition algorithmic logic."
        index={1}
      />
      <BentoModule
        icon={Trophy}
        title="Elite Clusters"
        desc="Verified Global ranking for senior technical mastery."
        index={2}
      />
      <BentoModule
        icon={Cpu}
        title="Deno Wall"
        desc="Isolated progression via server-side secure worklets."
        index={3}
      />
      <BentoModule
        icon={Layers}
        title="Deep Tracks"
        desc="Multi-stage learning paths designed by Lead Architects."
        index={4}
      />
      <BentoModule
        icon={Globe}
        title="Global Nodes"
        desc="Synchronize technical progress across all device endpoints."
        index={5}
      />
    </View>
    <View style={styles.footerVersion}>
      <Text style={styles.versionText}>
        BUILD 2026.04.12 | SECURE ENCLAVE ACTIVE
      </Text>
    </View>
  </ScrollView>
));
MarketingSection.displayName = 'MarketingSection';

const BentoModule = React.forwardRef(
  ({ icon: Icon, title, desc, index }: any, ref: React.Ref<View>) => {
    const rotateX = useSharedValue(0);
    const rotateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const glow = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { perspective: 1200 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
        { scale: withSpring(scale.value, { damping: 12, stiffness: 100 }) },
      ],
      backgroundColor: interpolateColor(
        glow.value,
        [0, 1],
        ['rgba(15, 23, 42, 0.3)', 'rgba(99, 102, 241, 0.08)'],
      ),
      borderColor: interpolateColor(
        glow.value,
        [0, 1],
        ['rgba(255,255,255,0.05)', 'rgba(99, 102, 241, 0.4)'],
      ),
    }));

    const onPointerMove = (e: any) => {
      if (Platform.OS === 'web') {
        const { nativeEvent } = e;
        rotateY.value = interpolate(
          nativeEvent.offsetX,
          [0, 300],
          [-8, 8],
          Extrapolation.CLAMP,
        );
        rotateX.value = interpolate(
          nativeEvent.offsetY,
          [0, 250],
          [8, -8],
          Extrapolation.CLAMP,
        );
      }
    };

    return (
      <Animated.View
        ref={ref}
        entering={FadeInRight.delay(400 + index * 100).springify()}
        style={[
          { width: '48%', borderRadius: 28, borderWidth: 1 },
          animatedStyle,
        ]}
      >
        <Pressable
          onPointerEnter={() => {
            scale.value = 1.04;
            glow.value = withTiming(1);
          }}
          onPointerLeave={() => {
            scale.value = 1;
            glow.value = withTiming(0);
            rotateX.value = withSpring(0);
            rotateY.value = withSpring(0);
          }}
          onPointerMove={onPointerMove}
          onTouchStart={() => {
            scale.value = 0.98;
            glow.value = withTiming(1);
          }}
          onTouchEnd={() => {
            scale.value = 1;
            glow.value = withTiming(0);
          }}
          style={styles.bentoInnerContent}
        >
          <View style={styles.bentoIconBox}>
            <Icon size={26} color={THEME.indigo} strokeWidth={2.5} />
          </View>
          <Text style={styles.bentoTitle}>{title}</Text>
          <Text style={styles.bentoDesc}>{desc}</Text>
        </Pressable>
      </Animated.View>
    );
  },
);
BentoModule.displayName = 'BentoModule';

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
  brandHeader: { alignItems: 'center', marginBottom: 32 },
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
  formCard: { padding: 28, borderRadius: 44, borderBottomWidth: 0 },
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
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#64748b', fontSize: 13 },
  switchLink: { color: THEME.indigo, fontWeight: '800', fontSize: 13 },
  nameRow: { flexDirection: 'row', gap: 16 },
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
  contentScroll: { flex: 1, backgroundColor: '#010409' },
  marketingContainer: { padding: 80, paddingBottom: 120 },
  heroTitle: {
    color: THEME.white,
    fontSize: 64,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -4,
    lineHeight: 76,
  },
  heroSub: {
    color: '#64748b',
    fontSize: 20,
    lineHeight: 32,
    marginTop: 28,
    maxWidth: 580,
  },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginTop: 64 },
  bentoInnerContent: { padding: 36, minHeight: 230 },
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
  footerVersion: { marginTop: 100, opacity: 0.15 },
  versionText: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
