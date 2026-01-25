/**
 * =============================================================
 * 👤 PROFILE EDIT PAGE
 * =============================================================
 * Edit user profile information
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Camera, Save } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as Haptics from 'expo-haptics';

export default function ProfileEditScreen() {
  const { user, refreshUserData } = useAuth();
  const [fullName, setFullName] = useState(user?.profile?.full_name || '');
  const [username, setUsername] = useState(user?.profile?.username || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadAvatar = async () => {
    if (!user) {
      Alert.alert(
        'Authentication Error',
        'You must be logged in to upload an avatar.',
      );
      return;
    }
    try {
      setUploading(true);

      // 1. Pick Image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled || !result.assets || !result.assets[0].base64) {
        return; // User cancelled
      }

      const image = result.assets[0];
      const fileExt = image.uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 2. Upload to Supabase Storage (avatars bucket)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(image.base64!), {
          contentType: image.mimeType ?? 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // 4. Update Profile Record
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 5. Refresh Context
      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile picture updated.');
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert(
        'Error',
        'Username can only contain letters, numbers, and underscores',
      );
      return;
    }

    setSaving(true);
    try {
      const updates: { full_name?: string; username?: string } = {};

      if (fullName.trim() !== user.profile?.full_name) {
        updates.full_name = fullName.trim();
      }

      if (username.trim() !== user.profile?.username) {
        // Check if username is already taken
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim())
          .neq('id', user.id)
          .single();

        if (existing) {
          Alert.alert('Error', 'Username is already taken');
          setSaving(false);
          return;
        }

        updates.username = username.trim();
      }

      if (Object.keys(updates).length === 0) {
        Alert.alert('Info', 'No changes to save');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#020617]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Avatar Section */}
        <GlassCard intensity="light" className="mb-6">
          <View className="p-6">
            <View className="items-center mb-6">
              <TouchableOpacity
                onPress={uploadAvatar}
                disabled={uploading}
                className="relative"
              >
                <View className="items-center justify-center w-32 h-32 overflow-hidden border-2 border-indigo-500/30 bg-indigo-500/10 rounded-3xl">
                  {uploading ? (
                    <ActivityIndicator color="#6366f1" />
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

                {/* Edit Badge */}
                <View className="absolute bottom-[-6px] right-[-6px] bg-indigo-500 p-2 rounded-xl border-4 border-[#020617]">
                  <Camera size={16} color="white" />
                </View>
              </TouchableOpacity>

              <Text className="text-sm text-slate-400 mt-4 text-center">
                Tap to change profile picture
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Profile Information */}
        <GlassCard intensity="light" className="mb-6">
          <View className="p-6">
            <View className="mb-6">
              <View className="flex-row items-center gap-3 mb-4">
                <View className="w-10 h-10 rounded-full bg-indigo-500/20 items-center justify-center">
                  <User size={20} color="#6366f1" />
                </View>
                <Text className="text-lg font-black text-white">
                  Profile Information
                </Text>
              </View>
            </View>

            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-300 mb-2">
                Full Name
              </Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#64748b"
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-base"
                autoCapitalize="words"
              />
            </View>

            {/* Username */}
            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-300 mb-2">
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="#64748b"
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-base"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text className="text-xs text-slate-500 mt-2">
                Username can only contain letters, numbers, and underscores
              </Text>
            </View>

            {/* Email (Read-only) */}
            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-300 mb-2">
                Email
              </Text>
              <View className="flex-row items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                <Mail size={20} color="#64748b" />
                <Text className="text-base text-slate-400 flex-1">
                  {user?.email}
                </Text>
              </View>
              <Text className="text-xs text-slate-500 mt-2">
                Email cannot be changed here. Use change password to update
                email.
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Save Button */}
        <Button onPress={handleSave} disabled={saving} className="mb-6">
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View className="flex-row items-center gap-2">
              <Save size={20} color="#ffffff" />
              <Text className="text-base font-black text-white">
                Save Changes
              </Text>
            </View>
          )}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
