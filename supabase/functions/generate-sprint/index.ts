import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GEMINI_MODEL = 'gemini-2.0-flash';
const SPRINTS_TABLE = 'daily_sprints';

const SPRINT_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ['info', 'mcq', 'true_false'] },
      title: { type: Type.STRING },
      content: { type: Type.STRING },
      xp_reward: { type: Type.INTEGER },
      correctAnswer: { type: Type.INTEGER },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      explanation: { type: Type.STRING },
    },
    required: ['type', 'title', 'content', 'xp_reward'],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabaseAdmin
      .from(SPRINTS_TABLE)
      .select('content')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (existing?.content) {
      return new Response(JSON.stringify(existing.content), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new GoogleGenAI({ apiKey: geminiApiKey });
    const prompt = `Generate 5 learning cards about React Native. Technical and accurate.`;

    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: SPRINT_SCHEMA,
        temperature: 0.4,
      },
    });

    // Extract the text response from the result object
    let rawText = '';
    if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      rawText = result.candidates[0].content.parts[0].text;
    } else {
      throw new Error('AI did not return a valid response');
    }
    const content = JSON.parse(rawText);

    if (!Array.isArray(content)) throw new Error('AI returned invalid JSON');

    const { error: insertError } = await supabaseAdmin
      .from(SPRINTS_TABLE)
      .upsert(
        { user_id: user.id, date: today, content: content },
        { onConflict: 'user_id,date' },
      );

    if (insertError) throw insertError;

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
