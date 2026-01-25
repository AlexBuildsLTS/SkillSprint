import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';



Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Initialize Client (using Service Role to bypass RLS for stats updates if needed)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 2. Auth Check (Get User from Token)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // 3. Get Data
    const { score } = await req.json();
    if (typeof score !== 'number') throw new Error('Invalid score');

    const xpEarned = 10 + score * 5;
    const today = new Date().toISOString().split('T')[0];

    // 4. Update Daily Sprint
    const { error: sprintError } = await supabaseClient
      .from('daily_sprints')
      .update({ is_completed: true, xp_earned: xpEarned })
      .eq('user_id', user.id)
      .eq('date', today);

    if (sprintError) throw sprintError;

    // 5. Update User Stats (Get current first to increment)
    const { data: stats, error: statsFetchError } = await supabaseClient
      .from('user_stats')
      .select('xp, total_sprints_completed')
      .eq('user_id', user.id)
      .single();

    if (statsFetchError) {
      // Handle case where stats might not exist yet (create them)
      await supabaseClient.from('user_stats').insert({
        user_id: user.id,
        xp: xpEarned,
        total_sprints_completed: 1,
        last_active_date: new Date().toISOString(),
      });
    } else {
      await supabaseClient
        .from('user_stats')
        .update({
          xp: (stats.xp || 0) + xpEarned,
          total_sprints_completed: (stats.total_sprints_completed || 0) + 1,
          last_active_date: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

    return new Response(JSON.stringify({ success: true, xpEarned }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
