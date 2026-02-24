import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

/**
 * 🌐 HOOK: USE PRESENCE
 * Manages user's availability state via the 'presence-handler' Edge Function.
 * Adheres to the Deno Wall principle: no direct Supabase profile updates.
 */
export const usePresence = () => {
  const { user, refreshUserData } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = useCallback(async (status: 'ONLINE' | 'OFFLINE' | 'BUSY') => {
    if (!user) return;
    
    setIsUpdating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // 1. Invoke the Edge Function (Deno Wall)
      await api.updatePresence(status);
      
      // 2. Refresh local session/profile context
      if (refreshUserData) await refreshUserData();
      
      console.log(`Presence updated to: ${status}`);
    } catch (error) {
      console.error('Failed to update presence:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdating(false);
    }
  }, [user, refreshUserData]);

  return {
    currentStatus: user?.profile?.presence_status || 'OFFLINE',
    updateStatus,
    isUpdating
  };
};
