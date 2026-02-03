import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';
import { Database } from '../supabase/database.types';
import { Platform } from 'react-native';

// SAFEGUARD: Ensure we don't crash if env vars are missing in development
// On Native, process.env can sometimes be undefined if not configured in babel.config.js
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing! Check .env and app.json. ' +
      'The app may crash or fail to connect.',
  );
}

// Fallback to empty string prevents immediate crash, but connection will fail gracefully
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      // CRITICAL FIX: Disable URL detection on Native to prevent linking crashes
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);
