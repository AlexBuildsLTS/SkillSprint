import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type, Schema } from '@google/genai';



const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GEMINI_MODEL = 'gemini-2.0-flash';

const TRACK_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    track: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        difficulty: {
          type: Type.STRING,
          enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
        },
        icon: { type: Type.STRING },
        slug: { type: Type.STRING },
      },
      required: ['title', 'description', 'difficulty', 'slug'],
    },
    lessons: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          order: { type: Type.INTEGER },
          xp_reward: { type: Type.INTEGER },
          content: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              text: { type: Type.STRING },
              code: { type: Type.STRING },
            },
          },
        },
        required: ['title', 'order', 'xp_reward', 'content'],
      },
    },
  },
  required: ['track', 'lessons'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { topic } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    if (!geminiApiKey) throw new Error('Missing GEMINI_API_KEY');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const client = new GoogleGenAI({ apiKey: geminiApiKey });

    console.log(`Generating track for: ${topic}`);

    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: `Create a coding course on: ${topic}.` }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: TRACK_SCHEMA,
      },
    });

    const rawText = result.response.text();
    if (!rawText)
      throw new Error('AI returned empty response (Possible Rate Limit)');

    const output = JSON.parse(rawText);

    // Database Insert
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .insert({ ...output.track, is_published: true })
      .select()
      .single();

    if (trackError) throw trackError;

    const lessonsData = output.lessons.map((l: any) => ({
      ...l,
      track_id: track.id,
    }));

    const { error: lessonError } = await supabaseAdmin
      .from('lessons')
      .insert(lessonsData);
    if (lessonError) throw lessonError;

    return new Response(JSON.stringify({ success: true, trackId: track.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Function Error:', err);
    // Return actual error to client for debugging
    return new Response(
      JSON.stringify({ error: err.message, details: err.toString() }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
