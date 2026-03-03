/**
 * ============================================================================
 * 🛡️ SKILLSPRINT SECURE TRANSMISSION ENGINE (EDGE FUNCTION)
 * ============================================================================
 * Architecture:
 * - CORS-compliant for React Native/Web bridging.
 * - JWT Verification: Validates sender identity directly via Authorization header.
 * - Privacy Shield: Silently drops messages if the sender is blocked.
 * - Mute Engine: Bypasses notifications if the recipient has muted the thread.
 * - Zero-Knowledge Notification: Emits a generic "Secure Transmission" alert
 * without ever decrypting or exposing the payload contents.
 * - E2EE Support: Forwards the encrypted AES key to the database.
 * ============================================================================
 */

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // 1. Handle CORS Preflight (Crucial for React Native & Web clients)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Initialize Clients
    // Client A: The user's authenticated context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    // Client B: Admin context to bypass RLS for internal checks (Blocks/Mutes/Notifications)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 3. Verify Sender Identity via JWT
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized Access: Invalid JWT');
    }

    // 4. Parse Incoming Ciphertext Payload & AES Key
    const { conversationId, content, encrypted_aes_key } = await req.json();
    if (!conversationId || !content) {
      throw new Error('Malformed Payload: Missing required identifiers');
    }

    // 5. Resolve Recipient Identity
    const { data: participants, error: partError } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id);

    if (partError || !participants || participants.length === 0) {
      throw new Error('Invalid Route: Conversation does not exist or is empty');
    }
    const recipientId = participants[0]?.user_id;

    // 6. 🛡️ BLOCK ENGINE: Check if sender is blocked
    const { data: blockData } = await supabaseAdmin
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', recipientId)
      .eq('blocked_id', user.id)
      .single();

    if (blockData) {
      // SILENT DROP: Privacy Best Practice.
      // We tell the sender it succeeded so they don't know they are blocked,
      // but we completely drop the payload before it hits the database.
      return new Response(
        JSON.stringify({ success: true, status: 'dropped_by_shield' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // 7. Commit Encrypted Payload & AES Key to Database
    const { data: message, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
        encrypted_aes_key: encrypted_aes_key || null,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // 8. 🔇 MUTE ENGINE: Check if thread is silenced
    const { data: muteData } = await supabaseAdmin
      .from('muted_conversations')
      .select('id')
      .eq('user_id', recipientId)
      .eq('conversation_id', conversationId)
      .single();

    // 9. Dispatch Zero-Knowledge Notification
    if (!muteData) {
      // Get Sender's name for the notification UI
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('username, full_name')
        .eq('id', user.id)
        .single();

      const senderName =
        senderProfile?.full_name ||
        senderProfile?.username ||
        'Unknown Identity';

      await supabaseAdmin.from('notifications').insert({
        user_id: recipientId,
        title: 'Secure Transmission',
        message: `${senderName} sent an encrypted payload.`,
        type: 'SECURE_MESSAGE',
      });

      // NOTE: In production, APNs (Apple) or FCM (Google) Push Webhooks would trigger right here.
    }

    // 10. Return Success Handshake
    return new Response(JSON.stringify({ success: true, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error(`[Edge Security Error]: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
