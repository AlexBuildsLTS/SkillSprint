import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 4. Error Handling: Validate that critical environment variables are set.
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing critical environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
  );
}

/**
 * Supabase client initialized with the Service Role Key.
 * This client bypasses Row Level Security (RLS) and should only be used
 * for administrative tasks within Supabase Edge Functions.
 *
 * 1. Readability & Maintainability: Using clear, validated constants.
 * 3. Best Practices: Fails fast on missing configuration and includes JSDoc for clarity.
 */
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);
