import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { topic } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
    if (!topic) throw new Error('Topic identifier is required');

    // 1. Technical Prompt ensuring specific schema compliance
    const prompt = `Create a technical learning track for "${topic}".
    Return ONLY RAW JSON. Schema:
    {
      "track": { "title": "...", "description": "...", "difficulty": "BEGINNER" },
      "lessons": [{
        "title": "...", "order": 1, "xp_reward": 50,
        "content": { "text": "Technical breakdown...", "code": "Implementation..." },
        "quiz": { "question": "...", "options": ["A", "B", "C"], "answer": 0, "explanation": "..." }
      }]
    }
    Generate exactly 5 lessons.`;

    // 2. Fetch via working ai-chat model
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
    let aiText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error('AI synthesis failed.');

    aiText = aiText.replace(/```json|```/g, '').trim();
    const data = JSON.parse(aiText);

    /**
     * 3. THE FIX: Generate a unique slug and set IS_PUBLISHED to TRUE
     * This ensures the UI query (is_published=eq.true) finds the data immediately.
     */
    const uniqueSlug = `${topic.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const { data: track, error: tErr } = await supabaseAdmin
      .from('tracks')
      .insert({
        ...data.track,
        slug: uniqueSlug,
        is_published: true, // <--- EXPLICITLY TRUE
        is_premium: false,
        icon: 'book',
        color_gradient: 'from-blue-600-to-indigo-700',
      })
      .select()
      .single();

    if (tErr) throw new Error(`Track Data Commit Failed: ${tErr.message}`);

    // 4. Batch Processing for Lessons and Questions
    for (const l of data.lessons) {
      const { data: lesson, error: lErr } = await supabaseAdmin
        .from('lessons')
        .insert({
          track_id: track.id,
          title: l.title,
          content: l.content,
          order: l.order,
          xp_reward: l.xp_reward,
        })
        .select()
        .single();

      if (lErr) throw new Error(`Lesson Node Failed: ${lErr.message}`);

      await supabaseAdmin.from('questions').insert({
        lesson_id: lesson.id,
        type: 'mcq',
        question: l.quiz.question,
        options: l.quiz.options,
        answer: l.quiz.answer,
        explanation: l.quiz.explanation,
      });
    }

    return new Response(JSON.stringify({ success: true, trackId: track.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Synthesis Error';
    console.error('[Track Generator Error]:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
