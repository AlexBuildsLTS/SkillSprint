/**
 * =============================================================
 * 🔐 BIOMETRIC AUTHENTICATION PAGE
 * =============================================================
 * Configure biometric authentication settings
 * =============================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Fingerprint,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { GlassCard } from '@/components/ui/GlassCard';
import { secureStorage } from '@/lib/secureStorage';
import * as Haptics from 'expo-haptics';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export default function BiometricScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<
    LocalAuthentication.AuthenticationType[]
  >([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBiometricSupport();
    loadBiometricSetting();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsSupported(compatible);

      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsEnrolled(enrolled);

        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricType(types);
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setIsSupported(false);
    } finally {
      setLoading(false);
    }
  };

  const loadBiometricSetting = async () => {
    try {
      const stored = await secureStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(stored === 'true');
    } catch (error) {
      console.error('Error loading biometric setting:', error);
    }
  };

  const saveBiometricSetting = async (enabled: boolean) => {
    try {
      await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled.toString());
      setBiometricEnabled(enabled);
    } catch (error) {
      console.error('Error saving biometric setting:', error);
      Alert.alert('Error', 'Failed to save biometric setting');
    }
  };

  const testBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to test biometric',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Biometric authentication works correctly!');
      } else {
        if (result.error === 'user_cancel') {
          // User cancelled, no need to show error
          return;
        }
        Alert.alert('Authentication Failed', result.error || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to authenticate');
    }
  };

  const handleToggle = async (value: boolean) => {
    if (value && !isEnrolled) {
      Alert.alert(
        'Biometric Not Set Up',
        'Please set up biometric authentication in your device settings first.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (value) {
      // Test authentication before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric login',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await saveBiometricSetting(true);
      } else if (result.error !== 'user_cancel') {
        Alert.alert('Authentication Failed', 'Could not enable biometric authentication');
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await saveBiometricSetting(false);
    }
  };

  const getBiometricIcon = () => {
    if (Platform.OS === 'ios') {
      if (biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return      }
      return Fingerprint;
    } else {
      return Fingerprint;
    }
  };

  const getBiometricName = () => {
    if (Platform.OS === 'ios') {
      if (biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      }
      return 'Touch ID';
    }
    if (biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face Recognition';
    }
    if (biometricType.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    if (biometricType.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biometric';
  };

  const BiometricIcon = getBiometricIcon();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#020617]" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-white">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#020617]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Status Card */}
        <GlassCard intensity="light" className="mb-6">
          <View className="p-6">
            <View className="items-center mb-6">
              <View
                className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${
                  isSupported && isEnrolled
                    ? 'bg-green-500/20'
                    : 'bg-slate-500/20'
                }`}
              >
                {isSupported && isEnrolled && BiometricIcon ? (
                  <BiometricIcon size={40} color="#10b981" />
                ) : (
                  <XCircle size={40} color="#64748b" />
                )}
              </View>
              <Text className="text-xl font-black text-white text-center mb-2">
                {getBiometricName()}
              </Text>
              <View className="flex-row items-center gap-2">
                {isSupported && isEnrolled ? (
                  <>
                    <CheckCircle size={16} color="#10b981" />
                    <Text className="text-sm text-green-400 font-bold">
                      Available
                    </Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} color="#f59e0b" />
                    <Text className="text-sm text-amber-400 font-bold">
                      {!isSupported
                        ? 'Not Supported'
                        : !isEnrolled
                        ? 'Not Set Up'
                        : 'Unavailable'}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {!isSupported && (
              <View className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 mb-4">
                <Text className="text-sm text-amber-300">
                  Your device does not support biometric authentication.
                </Text>
              </View>
            )}

            {isSupported && !isEnrolled && (
              <View className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 mb-4">
                <Text className="text-sm text-amber-300">
                  Please set up {getBiometricName()} in your device settings
                  before enabling this feature.
                </Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Settings Card */}
        <GlassCard intensity="light" className="mb-6">
          <View className="p-2">
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-4 flex-1">
                <View className="items-center justify-center w-10 h-10 rounded-full bg-white/5">
                  <Shield size={20} color="#6366f1" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-white">
                    Enable {getBiometricName()}
                  </Text>
                  <Text className="text-sm text-slate-400 mt-1">
                    Use biometric authentication to sign in quickly and securely
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggle}
                disabled={!isSupported || !isEnrolled}
                trackColor={{ false: '#1e293b', true: '#6366f1' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </GlassCard>

        {/* Test Button */}
        {isSupported && isEnrolled && (
          <TouchableOpacity
            onPress={testBiometric}
            className="bg-indigo-500/20 border border-indigo-500/30 rounded-2xl p-4 items-center"
          >
            <Text className="text-base font-bold text-indigo-300">
              Test {getBiometricName()}
            </Text>
            <Text className="text-xs text-slate-400 mt-1">
              Verify your biometric authentication is working
            </Text>
          </TouchableOpacity>
        )}

        {/* Info Card */}
        <GlassCard intensity="light" className="mt-6">
          <View className="p-4">
            <Text className="text-sm font-bold text-slate-300 mb-2">
              About Biometric Authentication
            </Text>
            <Text className="text-xs text-slate-400 leading-5">
              Biometric authentication provides a secure and convenient way to
              access your account. Your biometric data is stored securely on your
              device and never shared with our servers.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
