import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

/**
 * Edge Function: complete-sprint
 * Handles the logic when a user finishes their daily sprint.
 * 1. Validates the user's session.
 * 2. Calculates XP based on the score.
 * 3. Updates user_stats (XP, total sprints, last active).
 * 4. Marks today's daily sprint as completed.
 */

Deno.serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authorization Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the user's token to get their identity
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse and Validate Request Body
    const body = await req.json().catch(() => ({}));
    const { score } = body;

    if (typeof score !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid score provided. Expected a number.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Business Logic: Calculate Earned XP
    // Base reward: 10 XP | Performance reward: 5 XP per point
    const earnedXP = 10 + (score * 5);
    const today = new Date().toISOString().split('T')[0];

    // 4. Update Database
    // We use supabaseAdmin to ensure these internal tables are updated correctly 
    // even if Row Level Security (RLS) restricts direct user writes.

    // A. Fetch current stats (needed for incrementing XP safely)
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select('xp, total_sprints_completed')
      .eq('user_id', user.id)
      .single();

    if (statsError || !stats) {
      throw new Error('User stats profile not found');
    }

    // B. Execute Updates
    // We perform these as separate calls, but they could be combined into an RPC for true atomicity.
    const [statsUpdate, sprintUpdate] = await Promise.all([
      // Update User Stats
      supabaseAdmin
        .from('user_stats')
        .update({
          xp: stats.xp + earnedXP,
          total_sprints_completed: (stats.total_sprints_completed || 0) + 1,
          last_active_date: new Date().toISOString(),
        })
        .eq('user_id', user.id),

      // Update Daily Sprint Status
      supabaseAdmin
        .from('daily_sprints')
        .update({
          is_completed: true,
          xp_earned: earnedXP,
        })
        .eq('user_id', user.id)
        .eq('date', today)
    ]);

    if (statsUpdate.error) throw statsUpdate.error;
    // We don't throw if sprintUpdate fails as it might just mean the user is re-submitting 
    // or did a sprint not tracked in daily_sprints table.

    // 5. Final Response
    return new Response(
      JSON.stringify({
        success: true,
        xpEarned: earnedXP,
        newTotalXp: stats.xp + earnedXP,
        message: 'Sprint completed successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error('Error in complete-sprint:', err);
    const message = err instanceof Error ? err.message : 'An internal error occurred';
    
    return new Response(JSON.stringify({ error: message }), {
      status: err instanceof Error && message.includes('found') ? 404 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
