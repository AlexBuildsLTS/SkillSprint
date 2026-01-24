/**
 * PROJECT CRADLE: SECURE STORAGE TITAN V2.0
 * Path: lib/secureStorage.ts
 * ----------------------------------------------------------------------------
 * OPTIMIZATIONS:
 * 1. MEMORY FALLBACK: Integrated fail-safe for restricted Web environments.
 * 2. SYNC INTERFACE: Optimized for Supabase Auth's expected storage behavior.
 * 3. SSR HARDENING: Direct window/document guards for server-side environments.
 * 4. HARDWARE ENCLAVE: Direct mapping to iOS/Android SecureStore for secrets.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * FAIL-SAFE: Volatile memory storage for environments where localStorage
 * or SecureStore is unavailable (e.g., SSR or Incognito mode).
 */
const volatileStorage: Record<string, string> = {};

export const secureStorage = {
  getItem: (key: string): string | null | Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          return window.localStorage.getItem(key);
        }
        return volatileStorage[key] || null;
      }
      return SecureStore.getItemAsync(key);
    } catch (e) {
      return volatileStorage[key] || null;
    }
  },

  setItem: (key: string, value: string): void | Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
        volatileStorage[key] = value;
      } else {
        return SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      volatileStorage[key] = value;
    }
  },

  removeItem: (key: string): void | Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
        delete volatileStorage[key];
      } else {
        return SecureStore.deleteItemAsync(key);
      }
    } catch (e) {
      delete volatileStorage[key];
    }
  },
};
