/**
 * ============================================================================
 * 🟢 SKILLSPRINT PRESENCE HANDLER (EDGE FUNCTION)
 * ============================================================================
 * Architecture:
 * - Validates user JWT before processing.
 * - Uses Service Role to bypass strict RLS for system-level presence tracking.
 * - Security: Strict Enum validation prevents payload poisoning.
 * - Engine: Uses native Deno.serve for maximum v8 throughput.
 * ============================================================================
 */

import {
  createClient,
  SupabaseClient,
  User,
} from 'https://esm.sh/@supabase/supabase-js@2.40.0'; // Updated version for potential latest features/fixes
import { corsHeaders } from '../_shared/cors.ts';

// Define explicit types for better maintainability and safety (Best Practice)
type PresenceStatus = 'ONLINE' | 'OFFLINE' | 'BUSY';

// Configuration check and global client initialization (Best Practice/Error Handling)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  // Throw a specific error during initialization if critical env vars are missing
  throw new Error(
    'Missing critical Supabase environment variables (URL, SERVICE_ROLE_KEY, or ANON_KEY).',
  );
}

// Use Service Role for admin operations - initialized only once (Performance)
const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
);

const VALID_STATUSES: PresenceStatus[] = ['ONLINE', 'OFFLINE', 'BUSY'];

Deno.serve(async (req: Request): Promise<Response> => {
  // 1. Handle CORS Preflight (Performance: Exit early)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // 2. Validate Identity and Parse Payload concurrently (Performance)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      // Return 401 Unauthorized immediately
      throw new HttpError('Missing Authorization header', 401);
    }

    // Initialize client for user authentication, scoped to the request
    const supabaseClient: SupabaseClient = createClient(
      SUPABASE_URL,
      ANON_KEY,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data, error: userError } = await supabaseClient.auth.getUser();
    const user: User | null = data.user;

    if (userError || !user) {
      // Return 401 Unauthorized for invalid/expired token
      throw new HttpError('Unauthorized Access: Invalid or expired JWT', 401);
    }

    // 3. Parse Payload
    let payload: { status?: unknown };
    try {
      payload = await req.json();
    } catch (_e) {
      // Handle non-JSON body requests
      throw new HttpError('Invalid JSON payload', 400);
    }

    const { status } = payload;

    // 4. 🛡️ SECURITY: Strict Enum Validation (Maintainability/Safety)
    if (!VALID_STATUSES.includes(status as PresenceStatus)) {
      throw new HttpError(
        `Invalid presence status. Expected one of: ${VALID_STATUSES.join(', ')}`,
        400,
      );
    }
    const presenceStatus = status as PresenceStatus;

    // 5. Commit to Database (Use explicit timezone awareness if necessary, but ISO string is standard)
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        presence_status: presenceStatus,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      // Throw DB error, defaulting to 500 Internal Server Error if specific error type is unknown
      throw new HttpError('Database update failed', 500);
    }

    // 6. Return Success
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    // Consolidated Error Handling
    if (e instanceof HttpError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Catch unexpected errors (e.g., DB errors, runtime errors)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      {
        status: 500, // Always return 500 for unexpected server errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

// Custom error class for cleaner HTTP status handling (Best Practice)
class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
