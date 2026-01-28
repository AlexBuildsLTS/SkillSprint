import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * PRODUCTION GENERATOR: 20 Refined Tasks per Language
 * Languages: Python, JavaScript, TypeScript, Java, Rust
 */

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { language, difficulty, user_id } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

    const prompt = `Generate exactly 20 micro-learning coding tasks for ${language} at ${difficulty} level.
    Each task must have: title, description, starter_code, expected_output, and xp_reward.
    Return ONLY RAW JSON in this format: { "tasks": [...] }. 
    Tasks should scale in complexity from basic syntax to logical challenges.`;

    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    const resultData = await response.json();
    const aiText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error('AI Response Failed');

    const { tasks } = JSON.parse(aiText.replace(/```json|```/g, '').trim());

    // Securely log tasks to prevent replay attacks
    const tasksToInsert = tasks.map((t: any) => ({
      user_id,
      language,
      difficulty,
      task_content: t,
      task_hash: crypto.randomUUID(), // Unique proof-of-work ID
      is_completed: false,
    }));

    const { data: savedTasks, error: dbErr } = await supabaseAdmin
      .from('sprint_tasks')
      .insert(tasksToInsert)
      .select();

    if (dbErr) throw dbErr;

    return new Response(JSON.stringify({ tasks: savedTasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
