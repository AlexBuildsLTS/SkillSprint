// @ts-ignore
import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import { GoogleGenAI } from '@google/genai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GEMINI_MODEL = 'gemini-2.5-flash';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { topic } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    if (!geminiApiKey) throw new Error('Missing GEMINI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const client = new GoogleGenAI({ apiKey: geminiApiKey });

    const prompt = `Create a coding course on: ${topic}. 
    Return strictly valid JSON.
    Structure: {
      "track": { "title": "String", "description": "String", "difficulty": "BEGINNER", "slug": "String" },
      "lessons": [{ "title": "String", "order": 1, "xp_reward": 50, "content": { "type": "info", "text": "String" } }]
    }`;

    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (!result.responseId) {
      throw new Error('AI returned empty response');
    }
    const rawText = result.responseId;
    if (!rawText) throw new Error('AI returned empty response');

    const output = JSON.parse(rawText);

    // DB Insert
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .insert({
        title: output.track.title,
        description: output.track.description,
        difficulty: output.track.difficulty,
        slug: output.track.slug,
        is_published: true,
      })
      .select()
      .single();

    if (trackError) throw trackError;

    const lessons = output.lessons.map((l: any) => ({
      ...l,
      track_id: track.id,
    }));

    const { error: lessonError } = await supabase
      .from('lessons')
      .insert(lessons);
    if (lessonError) throw lessonError;

    return new Response(JSON.stringify({ success: true, trackId: track.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
