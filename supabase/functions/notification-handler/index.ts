/**
 * ============================================================================
 * 🔔 SKILLSPRINT NOTIFICATION HANDLER (EDGE FUNCTION)
 * ============================================================================
 * Architecture:
 * - Engine: Native Deno.serve.
 * - Auth: Uses the proven global header auth pattern (matching presence-handler).
 * - DB Bypass: Uses Admin client (Service Role) for safe backend mutations.
 * ============================================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

// Admin client bypasses RLS for system-level bulk operations
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
    // 2. Validate Identity via JWT (Using the correct, working pattern)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized Access' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse & Validate Payload
    const body = await req.json();
    const action = body?.action;
    const notificationId = body?.notificationId;

    const validActions = ['mark_read', 'mark_all_read', 'clear_all'];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 4. Route Database Actions (Using Admin Client to bypass RLS blocks)
    let dbError = null;

    switch (action) {
      case 'mark_read': {
        if (!notificationId) {
          return new Response(
            JSON.stringify({ error: 'notificationId is required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
        const { error: e1 } = await supabaseAdmin
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', user.id);
        dbError = e1;
        break;
      }

      case 'mark_all_read': {
        const { error: e2 } = await supabaseAdmin
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        dbError = e2;
        break;
      }

      case 'clear_all': {
        const { error: e3 } = await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('user_id', user.id);
        dbError = e3;
        break;
      }
    }

    // 5. Handle DB Errors gracefully
    if (dbError) {
      console.error('[DB Error]:', dbError);
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Return Success Handshake
    return new Response(
      JSON.stringify({ success: true, action_completed: action }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error(`[Notification Handler Error]:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
