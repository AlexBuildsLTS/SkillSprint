import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { task_id, user_id } = await req.json();

    // 1. Verify Task Existence and Ownership
    const { data: task, error: tErr } = await supabaseAdmin
      .from('sprint_tasks')
      .select('*')
      .eq('id', task_id)
      .eq('user_id', user_id)
      .single();

    if (tErr || !task || task.is_completed)
      throw new Error('Verification Failed');

    // 2. Add XP and Update Streak via Internal SQL Function
    const { data: result, error: rErr } = await supabaseAdmin.rpc(
      'internal_add_xp_and_streak',
      {
        target_user_id: user_id,
        xp_amount: task.task_content.xp_reward || 50,
      },
    );

    if (rErr) throw rErr;

    // 3. Mark Task as Completed
    await supabaseAdmin
      .from('sprint_tasks')
      .update({ is_completed: true })
      .eq('id', task_id);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
