import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { totalXP } = await req.json();
    const authHeader = req.headers.get('Authorization')!.replace('Bearer ', '');

    // Authenticate user from JWT
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(authHeader);

    if (!user) throw new Error('User not found');

    // Fetch current stats
    const { data: stats } = await supabaseAdmin
      .from('user_stats')
      .select('xp')
      .eq('user_id', user.id)
      .single();

    // Upsert the new XP and active date
    const { error } = await supabaseAdmin.from('user_stats').upsert({
      user_id: user.id,
      xp: (stats?.xp || 0) + totalXP,
      last_active_date: new Date().toISOString(),
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const error = err as Error;
    console.error('[Complete Sprint Error]:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
