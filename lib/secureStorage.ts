import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * PRODUCTION SECURE STORAGE (SSR SAFE)
 * Today's Tech: Ensures SSR compatibility for Expo Web 2026.
 */
const isWeb = Platform.OS === 'web';
const isServer = typeof window === 'undefined';

export const secureStorage = {
  setItem: async (key: string, value: string) => {
    if (isWeb) {
      if (!isServer) {
        localStorage.setItem(key, value);
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  getItem: async (key: string) => {
    if (isWeb) {
      if (isServer) return null; // Prevent Node.js crash
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  removeItem: async (key: string) => {
    if (isWeb) {
      if (!isServer) {
        localStorage.removeItem(key);
      }
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
