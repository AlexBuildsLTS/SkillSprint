import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { 
  Settings, 
  LifeBuoy, 
  LogOut, 
  ChevronRight, 
  ShieldCheck, 
  CreditCard,
  Camera 
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { GlassCard } from '@/components/ui/GlassCard';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, refreshUserData } = useAuth();
  const [uploading, setUploading] = useState(false);
  
  const isStaff = user?.profile?.role === 'ADMIN' || user?.profile?.role === 'MODERATOR';

  // HANDLE IMAGE PICKER & UPLOAD
  const uploadAvatar = async () => {
    if (!user) {
      Alert.alert('Authentication Error', 'You must be logged in to upload an avatar.');
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

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(image.base64!), {
          contentType: image.mimeType ?? 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 4. Update Profile Record
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 5. Refresh Context
      await refreshUserData();
      Alert.alert('Success', 'Profile picture updated.');

    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const MenuItem = ({ icon: Icon, label, onPress, color = "white" }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center justify-between p-4 border-b border-white/5 last:border-0"
    >
      <View className="flex-row items-center gap-4">
        <View className="items-center justify-center w-10 h-10 rounded-full bg-white/5">
          <Icon size={20} color={color} />
        </View>
        <Text className="text-base font-bold text-white">{label}</Text>
      </View>
      <ChevronRight size={16} color="#475569" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#020617]" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        
        {/* AVATAR HEADER */}
        <View className="items-center mb-8">
          <TouchableOpacity 
            onPress={uploadAvatar} 
            disabled={uploading}
            className="relative mb-4"
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
                  {user?.profile?.username?.[0]?.toUpperCase()}
                </Text>
              )}
            </View>
            
            {/* Edit Badge */}
            <View className="absolute bottom-[-6px] right-[-6px] bg-indigo-500 p-2 rounded-xl border-4 border-[#020617]">
              <Camera size={16} color="white" />
            </View>
          </TouchableOpacity>

          <Text className="text-2xl font-black text-white">{user?.profile?.full_name}</Text>
          <Text className="font-medium text-slate-400">@{user?.profile?.username}</Text>
          
          {isStaff && (
            <View className="px-3 py-1 mt-2 border rounded-full bg-indigo-500/20 border-indigo-500/30">
              <Text className="text-xs font-bold text-indigo-300 uppercase">{user?.profile?.role}</Text>
            </View>
          )}
        </View>

        {/* MENU GROUPS */}
        <View className="gap-6">
          <GlassCard intensity="light">
            <MenuItem 
              icon={LifeBuoy} 
              label="Support Center" 
              onPress={() => router.push('/(tabs)/support')} 
              color="#38bdf8"
            />
            <MenuItem 
              icon={Settings} 
              label="Settings & Security" 
              onPress={() => router.push('/(tabs)/settings')} 
            />
          </GlassCard>

          <GlassCard intensity="light">
            <MenuItem 
              icon={CreditCard} 
              label="Subscription" 
              onPress={() => {}} 
            />
            <MenuItem 
              icon={ShieldCheck} 
              label="Privacy Policy" 
              onPress={() => {}} 
            />
          </GlassCard>

          <TouchableOpacity 
            onPress={signOut}
            className="flex-row items-center justify-center p-4 mt-4 border rounded-2xl bg-red-500/10 border-red-500/20"
          >
            <LogOut size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text className="font-bold text-red-400">Terminate Session</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}