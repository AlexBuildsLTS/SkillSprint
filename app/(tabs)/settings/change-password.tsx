/**
 * =============================================================
 * 🔒 CHANGE PASSWORD PAGE
 * =============================================================
 * Secure password change functionality with Visual Feedback
 * =============================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

export default function ChangePasswordScreen() {
  const { user } = useAuth();

  // Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility State
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Logic State
  const [loading, setLoading] = useState(false);
  const [isNewPasswordValid, setIsNewPasswordValid] = useState(false);

  const handleChangePassword = async () => {
    // 1. Basic Field Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Missing Fields', 'Please fill in all password fields.');
      return;
    }

    // 2. Strength Validation (Enforced by Component)
    if (!isNewPasswordValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Weak Password',
        'Please ensure your new password meets all security requirements.',
      );
      return;
    }

    // 3. Match Validation
    if (newPassword !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    // 4. Different from Old Validation
    if (currentPassword === newPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Redundant',
        'New password must be different from your current password.',
      );
      return;
    }

    setLoading(true);
    try {
      // 5. Verify Current Password via Supabase Login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect.');
      }

      // 6. Update to New Password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your password has been updated securely.', [
        {
          text: 'OK',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Update Failed',
        error.message || 'Could not update password.',
      );
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({
    label,
    value,
    onChangeText,
    showPassword,
    onToggleVisibility,
    placeholder,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    showPassword: boolean;
    onToggleVisibility: () => void;
    placeholder: string;
  }) => (
    <View className="mb-4">
      <Text className="mb-2 ml-1 text-xs font-bold tracking-wider uppercase text-slate-400">
        {label}
      </Text>
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          secureTextEntry={!showPassword}
          className="px-4 py-4 pr-12 text-base text-white border bg-slate-900/50 border-white/10 rounded-xl focus:border-indigo-500"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={onToggleVisibility}
          className="absolute top-0 bottom-0 justify-center right-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {showPassword ? (
            <EyeOff size={20} color="#64748b" />
          ) : (
            <Eye size={20} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#020617]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <GlassCard
          intensity="light"
          className="mb-6 border-white/5 bg-slate-900/40"
        >
          <View className="p-6">
            {/* Header Icon */}
            <View className="items-center mb-8">
              <View className="items-center justify-center w-16 h-16 mb-4 border rounded-full shadow-lg bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10">
                <Lock size={32} color="#6366f1" />
              </View>
              <Text className="text-xl font-black text-center text-white">
                Secure Vault
              </Text>
              <Text className="px-4 mt-2 text-sm text-center text-slate-400">
                Update your master key. Ensure your new credentials meet the
                complexity protocols below.
              </Text>
            </View>

            {/* Inputs */}
            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              showPassword={showCurrentPassword}
              onToggleVisibility={() =>
                setShowCurrentPassword(!showCurrentPassword)
              }
              placeholder="Enter current password"
            />

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              showPassword={showNewPassword}
              onToggleVisibility={() => setShowNewPassword(!showNewPassword)}
              placeholder="Enter new password"
            />

            {/* LIVE STRENGTH INDICATOR */}
            <PasswordStrengthIndicator password={newPassword} />

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              showPassword={showConfirmPassword}
              onToggleVisibility={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              placeholder="Confirm new password"
            />

            {/* Submit Button */}
            <Button
              onPress={handleChangePassword}
              disabled={loading}
              className="mt-6 bg-indigo-600"
              size="lg"
              fullWidth
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold tracking-wide text-white">
                  UPDATE CREDENTIALS
                </Text>
              )}
            </Button>
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
