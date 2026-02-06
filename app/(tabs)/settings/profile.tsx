/**
 * =============================================================
 * 👤 PROFILE EDIT PAGE
 * =============================================================
 * Purpose: Enterprise-grade profile management interface.
 * Features: Balanced Pill Toast, Supabase Storage integration,
 * and responsive layout orchestration.
 * =============================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { User, Mail, Camera, Save, CheckCircle2 } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { decode } from 'base64-arraybuffer';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';

export default function ProfileEditScreen() {
  // --- Hooks & Context ---
  const { user, refreshUserData } = useAuth();
  const insets = useSafeAreaInsets();

  // --- Local State ---
  const [fullName, setFullName] = useState(user?.profile?.full_name || '');
  const [username, setUsername] = useState(user?.profile?.username || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  /**
   * @module NotificationSystem
   * Triggers haptic feedback and a refined, balanced confirmation toast.
   */
  const triggerSuccess = () => {
    setShowToast(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setShowToast(false), 3000);
  };

  /**
   * @module AvatarManagement
   * Handles binary image upload to Supabase 'avatars' bucket.
   */
  const uploadAvatar = async () => {
    if (!user) return;
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0].base64) return;

      const image = result.assets[0];
      const fileName = `${user.id}/avatar_${Date.now()}.${image.uri.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(image.base64!), {
          contentType: image.mimeType ?? 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshUserData();
      triggerSuccess();
    } catch (error: any) {
      Alert.alert('Upload Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  /**
   * @module ProfilePersistence
   * Updates PostgreSQL profile data via Supabase.
   */
  const handleSave = async () => {
    if (!user) return;
    if (!username.trim() || username.length < 3) {
      Alert.alert(
        'Validation Error',
        'Username must be at least 3 characters.',
      );
      return;
    }

    setSaving(true);
    try {
      const updates: { full_name?: string; username?: string } = {};
      if (fullName.trim() !== user.profile?.full_name)
        updates.full_name = fullName.trim();
      if (username.trim() !== user.profile?.username)
        updates.username = username.trim();

      if (Object.keys(updates).length === 0) {
        triggerSuccess(); // Indicate completion even if no diff
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;

      await refreshUserData();
      triggerSuccess();
    } catch (error: any) {
      Alert.alert('Save Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#020617]" edges={['top']}>
      {/* 🟢 CENTERED PILL SUCCESS TOAST */}
      {showToast && (
        <View
          style={{ top: insets.top + 165 }}
          className="absolute left-0 right-0 z-[100] items-center justify-center px-4"
        >
          <Animated.View
            entering={FadeInUp.springify().damping(60)}
            exiting={FadeOut.duration(400)}
            className="flex-row items-center bg-[#064e3b] border border-[#10b981]/40 py-3 px-6 rounded-full shadow-2xl"
          >
            <View className="bg-[#10b981] p-1 rounded-full mr-3">
              <CheckCircle2 size={16} color="#011709" />
            </View>
            <View>
              <Text className="text-sm font-bold text-green-400">
                Successful
              </Text>
              <Text className="text-emerald-200/60 text-[13px] leading-3">
                Profile synced
              </Text>
            </View>
          </Animated.View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: Platform.OS === 'ios' ? 140 : 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* @module UI_AvatarSection */}
          <View className="items-center mb-10">
            <TouchableOpacity
              onPress={uploadAvatar}
              disabled={uploading}
              activeOpacity={0.8}
              className="relative"
            >
              <View className="w-32 h-32 rounded-[36px] border-4 border-indigo-500/20 bg-indigo-500/10 overflow-hidden items-center justify-center">
                {uploading ? (
                  <ActivityIndicator color="#10b981" />
                ) : user?.profile?.avatar_url ? (
                  <Image
                    source={{ uri: user.profile.avatar_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-5xl font-black text-indigo-400">
                    {user?.profile?.username?.[0]?.toUpperCase() || 'U'}
                  </Text>
                )}
              </View>
              <View className="absolute bottom-0 right-0 bg-indigo-600 p-2.5 rounded-2xl border-4 border-[#020617]">
                <Camera size={18} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          {/* @module UI_FormFields */}
          <GlassCard intensity="light" className="mb-8">
            <View className="p-6">
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-indigo-400 mb-6">
                Account Identity
              </Text>

              <View className="gap-y-5">
                <View>
                  <Text className="mb-2 ml-1 text-xs font-bold text-slate-400">
                    Full Name
                  </Text>
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter full name"
                    placeholderTextColor="#475569"
                    className="px-4 py-4 font-medium text-white border bg-slate-950/40 border-slate-800/60 rounded-2xl"
                  />
                </View>

                <View>
                  <Text className="mb-2 ml-1 text-xs font-bold text-slate-400">
                    Username
                  </Text>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    placeholder="Username"
                    placeholderTextColor="#475569"
                    className="px-4 py-4 font-medium text-white border bg-slate-950/40 border-slate-800/60 rounded-2xl"
                  />
                </View>

                <View>
                  <Text className="mb-2 ml-1 text-xs font-bold text-slate-400">
                    Email (Verified)
                  </Text>
                  <View className="flex-row items-center px-4 py-4 border bg-slate-900/30 border-slate-800/30 rounded-2xl">
                    <Mail size={16} color="#475569" />
                    <Text className="ml-3 font-medium text-slate-500">
                      {user?.email}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* @module UI_ActionSection */}
          <View className="px-6">
            <Button onPress={handleSave} disabled={saving} variant="primary">
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center justify-center py-1">
                  <Save size={18} color="white" />
                  <Text className="ml-2 text-base font-extrabold text-white">
                    Save Profile
                  </Text>
                </View>
              )}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
