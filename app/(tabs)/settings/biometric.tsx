/**
 * =============================================================
 * 🔐 BIOMETRIC AUTHENTICATION PAGE (FINAL PRODUCTION)
 * =============================================================
 * - Android Optimized: Correct Intents & Icons
 * - UI Preserved: GlassCard + NativeWind
 * - Zero-Knowledge Logic: Secure Store implementation
 * =============================================================
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Fingerprint,
  ScanFace, // Auto-detects Face ID / Face Unlock
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Smartphone,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { GlassCard } from '@/components/ui/GlassCard';
import { secureStorage } from '@/lib/secureStorage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export default function BiometricScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [supportedTypes, setSupportedTypes] = useState<
    LocalAuthentication.AuthenticationType[]
  >([]);
  const [isHardwareSupported, setIsHardwareSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // LOGIC: Re-scan hardware every time screen focuses (Vital for Android)
  useFocusEffect(
    useCallback(() => {
      checkBiometricStatus();
      loadBiometricSetting();
    }, []),
  );

  const checkBiometricStatus = async () => {
    setLoading(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      setIsHardwareSupported(hasHardware);

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsEnrolled(enrolled);

      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      setSupportedTypes(types);
    } catch (error) {
      console.error('[Biometric] Check Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBiometricSetting = async () => {
    try {
      const stored = await secureStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(stored === 'true');
    } catch (error) {
      console.error('[Biometric] Load Failed:', error);
    }
  };

  const saveBiometricSetting = async (enabled: boolean) => {
    try {
      await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled.toString());
      setBiometricEnabled(enabled);
    } catch (error) {
      console.error('[Biometric] Save Failed:', error);
      Alert.alert('Error', 'Could not save setting');
    }
  };

  const handleToggle = async (value: boolean) => {
    if (value) {
      if (!isHardwareSupported) {
        Alert.alert('Not Supported', 'This device lacks biometric hardware.');
        return;
      }
      if (!isEnrolled) {
        promptToEnroll();
        return;
      }

      // Verify identity before enabling (Security Best Practice)
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm to enable biometrics',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        if (Platform.OS !== 'web')
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await saveBiometricSetting(true);
      }
    } else {
      if (Platform.OS !== 'web')
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await saveBiometricSetting(false);
    }
  };

  const testBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Biometric Test',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        if (Platform.OS !== 'web')
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Biometric ID Verified!');
      } else if (result.error !== 'user_cancel') {
        Alert.alert('Failed', 'Verification failed.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // LOGIC: Android-specific settings linking
  const promptToEnroll = () => {
    Alert.alert(
      'Setup Required',
      `Please set up ${getBiometricName()} in your device settings first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('App-Prefs:root=TOUCHID_PASSCODE');
            } else {
              Linking.sendIntent('android.settings.SECURITY_SETTINGS');
            }
          },
        },
      ],
    );
  };

  // UI: Dynamic Icons based on Hardware (Face vs Finger)
  const getBiometricIcon = () => {
    if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      )
    ) {
      return ScanFace;
    }
    if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      )
    ) {
      return Fingerprint;
    }
    return Smartphone;
  };

  const getBiometricName = () => {
    if (Platform.OS === 'ios') {
      if (
        supportedTypes.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        )
      )
        return 'Face ID';
      return 'Touch ID';
    }
    if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      )
    )
      return 'Face Unlock';
    if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      )
    )
      return 'Fingerprint';
    return 'Biometric';
  };

  const BiometricIcon = getBiometricIcon();
  const biometricName = getBiometricName();
  const isReady = isHardwareSupported && isEnrolled;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#020617] items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#020617]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* HEADER: Dynamic Status Card */}
        <GlassCard intensity="light" className="mb-6">
          <View className="p-6">
            <View className="items-center mb-6">
              <View
                className={`w-24 h-24 rounded-full items-center justify-center mb-4 border-2 ${
                  isReady
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                {isReady ? (
                  <BiometricIcon size={48} color="#10b981" />
                ) : (
                  <XCircle size={48} color="#64748b" />
                )}
              </View>
              <Text className="mb-2 text-xl font-black text-center text-white">
                {biometricName}
              </Text>
              <View className="flex-row items-center gap-2">
                {isReady ? (
                  <>
                    <CheckCircle size={16} color="#10b981" />
                    <Text className="text-sm font-bold text-green-400">
                      SECURE & AVAILABLE
                    </Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} color="#f59e0b" />
                    <Text className="text-sm font-bold text-amber-400">
                      {!isHardwareSupported ? 'NOT SUPPORTED' : 'NOT SET UP'}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {!isReady && (
              <View className="p-4 mb-4 border bg-amber-500/10 rounded-xl border-amber-500/20">
                <Text className="text-sm text-amber-300">
                  {!isHardwareSupported
                    ? 'Your device does not support this feature.'
                    : `Please configure ${biometricName} in your device settings.`}
                </Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* SETTINGS CONTROL */}
        <GlassCard intensity="light" className="mb-6">
          <View className="p-2">
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center flex-1 gap-4">
                <View className="items-center justify-center w-10 h-10 rounded-full bg-white/5">
                  <Shield size={20} color="#6366f1" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-white">
                    Biometric Login
                  </Text>
                  <Text className="mt-1 text-sm text-slate-400">
                    Use {biometricName} for instant access
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggle}
                disabled={!isReady}
                trackColor={{ false: '#1e293b', true: '#6366f1' }}
                thumbColor={biometricEnabled ? '#ffffff' : '#94a3b8'}
              />
            </View>
          </View>
        </GlassCard>

        {/* TEST BUTTON (Only if Ready) */}
        {isReady && (
          <TouchableOpacity
            onPress={testBiometric}
            className="items-center p-4 mb-6 border bg-indigo-500/20 border-indigo-500/30 rounded-2xl"
          >
            <Text className="text-base font-bold text-indigo-300">
              Test {biometricName} Sensor
            </Text>
            <Text className="mt-1 text-xs text-slate-400">
              Verify your hardware is responding correctly
            </Text>
          </TouchableOpacity>
        )}

        {/* INFO FOOTER */}
        <GlassCard intensity="light" className="mt-2">
          <View className="p-4">
            <Text className="mb-2 text-sm font-bold text-slate-300">
              Privacy & Security
            </Text>
            <Text className="text-xs leading-5 text-slate-400">
              Biometric data is stored in your device&lsquo;s Secure Enclave.
              SkillSprint never accesses or transmits your raw biometric
              information.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
