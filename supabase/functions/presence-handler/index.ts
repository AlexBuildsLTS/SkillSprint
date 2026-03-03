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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Validate Identity
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized Access');

    // 3. Parse Payload
    const { status } = await req.json();

    // 4. 🛡️ SECURITY: Strict Enum Validation
    const validStatuses = ['ONLINE', 'OFFLINE', 'BUSY'];
    if (!validStatuses.includes(status)) {
      throw new Error(
        `Invalid presence status. Expected one of: ${validStatuses.join(', ')}`,
      );
    }

    // 5. Commit to Database
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        presence_status: status,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;

    // 6. Return Success
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[Presence Error]:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
