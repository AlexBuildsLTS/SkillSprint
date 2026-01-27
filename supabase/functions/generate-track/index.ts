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
    if (!topic) throw new Error('Topic is required');

    // 1. Optimized Prompt for your specific SQL Schema
    const prompt = `Create a micro-learning track for "${topic}" in RAW JSON format. 
    Schema:
    {
      "track": { "title": "...", "description": "...", "slug": "...", "icon": "book", "color_gradient": "from-blue-600-to-indigo-700" },
      "lessons": [{
        "title": "...", "order": 1, "xp_reward": 50,
        "content": { "text": "Lesson text...", "code": "Code snippet..." },
        "quiz": { "question": "...", "options": ["A", "B", "C"], "answer": 0, "explanation": "..." }
      }]
    }
    Return ONLY the JSON. No markdown blocks. Generate exactly 5 lessons.`;

    // 2. Call Gemini via native fetch (Working model from ai-chat)
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

    if (!aiText) throw new Error('AI returned an empty response.');

    // SAFE PARSE: Strip potential markdown backticks that crash JSON.parse
    aiText = aiText.replace(/```json|```/g, '').trim();
    const data = JSON.parse(aiText);

    // 3. Database Sync: Track -> Lessons -> Questions
    const { data: track, error: tErr } = await supabaseAdmin
      .from('tracks')
      .insert(data.track)
      .select()
      .single();
    if (tErr) throw new Error(`Track Error: ${tErr.message}`);

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

      if (lErr) throw new Error(`Lesson Error: ${lErr.message}`);

      // Insert into your questions table based on your schema
      const { error: qErr } = await supabaseAdmin.from('questions').insert({
        lesson_id: lesson.id,
        type: 'mcq',
        question: l.quiz.question,
        options: l.quiz.options,
        answer: l.quiz.answer,
        explanation: l.quiz.explanation,
      });
      if (qErr) throw new Error(`Question Error: ${qErr.message}`);
    }

    return new Response(JSON.stringify({ success: true, trackId: track.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Generate Track Error]:', msg);
    // Returning 200 with the error message so your Dashboard Alert shows the REAL error
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
