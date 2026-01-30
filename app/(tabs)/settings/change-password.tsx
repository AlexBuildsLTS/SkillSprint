/**
 * =============================================================
 * 🔒 CHANGE PASSWORD PAGE (OPTIMIZED)
 * =============================================================
 * PATH: app/(tabs)/settings/change-password.tsx
 * STATUS: FIXED & OPTIMIZED
 * FEATURES:
 * - Extracted Components (Fixes re-render focus loss).
 * - Secure Password Validation Logic.
 * - Visual Feedback (Haptics + Strength Meter).
 * =============================================================
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

// --- THEME ---
const THEME = {
  obsidian: '#020617',
  slate: '#94a3b8',
  white: '#ffffff',
  indigo: '#6366f1',
  indigoGlow: 'rgba(99, 102, 241, 0.25)',
  inputBg: 'rgba(30, 41, 59, 0.5)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
};

// --- EXTRACTED COMPONENT (Prevents re-mount on keystroke) ---
const PasswordInput = memo(
  ({
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
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          secureTextEntry={!showPassword}
          style={styles.textInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={onToggleVisibility}
          style={styles.eyeIcon}
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
  ),
);
PasswordInput.displayName = 'PasswordInput';

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

  // HANDLER
  const handleChangePassword = async () => {
    // 1. Basic Field Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Missing Fields', 'Please fill in all password fields.');
      return;
    }

    // 2. Match Validation
    if (newPassword !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    // 3. Different from Old Validation
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
      // 4. Verify Current Password
      // Note: Supabase doesn't have a direct "verify password" API without signing in.
      // Signing in again updates the session tokens.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect.');
      }

      // 5. Update to New Password
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

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <GlassCard intensity="light" style={styles.card}>
              <View style={styles.cardContent}>
                {/* Header Icon */}
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    <Lock size={32} color={THEME.indigo} />
                  </View>
                  <Text style={styles.title}>Secure Vault</Text>
                  <Text style={styles.subtitle}>
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
                  onToggleVisibility={() =>
                    setShowNewPassword(!showNewPassword)
                  }
                  placeholder="Enter new password"
                />

                {/* LIVE STRENGTH INDICATOR */}
                <View style={{ marginBottom: 24 }}>
                  <PasswordStrengthIndicator password={newPassword} />
                </View>

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
                  size="lg"
                  fullWidth
                >
                  {loading ? (
                    <ActivityIndicator color={THEME.white} />
                  ) : (
                    <Text style={styles.btnText}>UPDATE CREDENTIALS</Text>
                  )}
                </Button>
              </View>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.obsidian,
  },
  scrollContent: {
    padding: 24,
  },
  card: {
    marginBottom: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: THEME.borderColor,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Glassy dark
    overflow: 'hidden',
  },
  cardContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: THEME.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    color: THEME.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: THEME.slate,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.borderColor,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
  },
  textInput: {
    color: THEME.white,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingRight: 48, // Space for eye icon
    height: '100%',
    fontWeight: '500',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: THEME.indigo,
  },
  btnText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
