// @ts-ignore
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const GEMINI_MODEL = 'gemini-2.0-flash';

const TRACK_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    track: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        difficulty: { type: Type.STRING, enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] },
        icon: { type: Type.STRING },
        slug: { type: Type.STRING }
      },
      required: ["title", "description", "difficulty", "slug"]
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
              code: { type: Type.STRING }
            }
          }
        },
        required: ["title", "order", "xp_reward", "content"]
      }
    }
  },
  required: ["track", "lessons"]
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { topic } = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY");

    // Initialize Gemini Client
    const client = new GoogleGenAI({ apiKey: geminiApiKey });

    console.log(`Generating track for: ${topic}`);

    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `Create a coding course about: "${topic}".` }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: TRACK_SCHEMA,
      }
    });

    // 🛑 Safe Parsing Logic
    let rawText = "";
    // @ts-ignore
    if (typeof result.response.text === 'function') {
        // @ts-ignore
        rawText = result.response.text();
    } else {
        // Fallback for older/different response structures
        rawText = JSON.stringify(result);
    }

    if (!rawText) throw new Error("AI returned empty response");

    // Attempt Parse
    let output;
    try {
        output = JSON.parse(rawText);
    } catch (e) {
        console.error("JSON Parse Error. Raw:", rawText);
        throw new Error("Failed to parse AI JSON response.");
    }

    // Insert Track
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .insert({ ...output.track, is_published: true })
      .select()
      .single();

    if (trackError) {
        console.error("Track Insert Error:", trackError);
        throw trackError;
    }

    // Insert Lessons
    const lessonsData = output.lessons.map((l: any) => ({
      ...l,
      track_id: track.id
    }));

    const { error: lessonError } = await supabaseAdmin.from('lessons').insert(lessonsData);
    
    if (lessonError) {
        console.error("Lesson Insert Error:", lessonError);
        throw lessonError;
    }

    return new Response(JSON.stringify({ success: true, trackId: track.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error("Critical Error:", err);
    
    // RETURN 200 WITH ERROR DETAILS
    // This prevents the "FunctionsHttpError" in the browser and lets you see the real message
    return new Response(JSON.stringify({ 
        success: false, 
        error: err.message || "Unknown Error",
        details: JSON.stringify(err)
    }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});