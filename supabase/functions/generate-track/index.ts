import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// 1. CONFIGURATION
const GEMINI_MODEL = 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// 2. TYPES
interface LessonContent {
  text: string;
  code: string;
}

interface Quiz {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface GeneratedLesson {
  title: string;
  order: number;
  xp_reward: number;
  content: LessonContent;
  quiz: Quiz;
}

interface GeneratedTrack {
  track: {
    title: string;
    description: string;
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    icon: string;
    color_gradient: string;
  };
  lessons: GeneratedLesson[];
}

// 3. SERVER INITIALIZATION
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { topic } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
    if (!topic) throw new Error('Topic is required');

    // 4. EMULATOR-AWARE PROMPT
    // We strictly instruct Gemini to include keywords that trigger your specific Emulator visuals.
    const prompt = `
      You are the Curriculum Architect for "SkillSprint", a gamified coding app.
      Create a 5-lesson micro-learning track for: "${topic}".
      
      CRITICAL EMULATOR RULES (Must apply to Code Snippets):
      - If Python (Data/Math): Include 'import numpy' or 'tensor' to trigger Data Visualizer.
      - If Python (Logic/Game): Include comments like '# snake_game' or 'class Snake' to trigger the Arcade Game Engine.
      - If Java: Include 'SpringApplication' or 'Bean' to trigger the JVM Heap Visualizer.
      - If Kotlin: Include 'Composable', 'Modifier', or 'Column' to trigger the Mobile UI Renderer.
      - If Web/JS: Include 'console.log' or 'function' for the Standard Terminal.

      OUTPUT FORMAT:
      Return ONLY RAW JSON. No Markdown.
      Structure:
      {
        "track": { 
          "title": "Short catchy title", 
          "description": "2 sentence summary", 
          "difficulty": "BEGINNER",
          "icon": "code",
          "color_gradient": "from-indigo-500-to-purple-500"
        },
        "lessons": [
          {
            "title": "Lesson Title", 
            "order": 1, 
            "xp_reward": 100,
            "content": { 
              "text": "Educational explanation (max 3 sentences).", 
              "code": "The code snippet following the Emulator Rules above." 
            },
            "quiz": { 
              "question": "Challenging question", 
              "options": ["A", "B", "C", "D"], 
              "answer": 0, 
              "explanation": "Why A is correct" 
            }
          }
        ]
      }
    `;

    // 5. CALL GEMINI
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

    if (!aiText) {
      console.error('Gemini Error:', JSON.stringify(resultData));
      throw new Error('AI synthesis failed.');
    }

    // 6. CLEAN & PARSE
    aiText = aiText.replace(/```json|```/g, '').trim();
    const data: GeneratedTrack = JSON.parse(aiText);

    // 7. DB SYNC: Track -> Lessons -> Questions

    // Initialize Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Generate Slug
    const uniqueSlug = `${data.track.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    // Insert Track
    const { data: track, error: tErr } = await supabaseAdmin
      .from('tracks')
      .insert({
        ...data.track,
        slug: uniqueSlug,
        is_published: true, // Auto-publish so it appears in the app immediately
        is_premium: false,
      })
      .select()
      .single();

    if (tErr) throw new Error(`Track Insert Error: ${tErr.message}`);

    // Insert Lessons & Questions Loop
    for (const l of data.lessons) {
      const { data: lesson, error: lErr } = await supabaseAdmin
        .from('lessons')
        .insert({
          track_id: track.id,
          title: l.title,
          content: l.content, // JSONB content
          order: l.order,
          xp_reward: l.xp_reward,
        })
        .select()
        .single();

      if (lErr) throw new Error(`Lesson Insert Error: ${lErr.message}`);

      // Insert Quiz
      const { error: qErr } = await supabaseAdmin.from('questions').insert({
        lesson_id: lesson.id,
        type: 'mcq',
        question: l.quiz.question,
        options: l.quiz.options,
        answer: l.quiz.answer,
        explanation: l.quiz.explanation,
      });

      if (qErr) throw new Error(`Question Insert Error: ${qErr.message}`);
    }

    // 8. SUCCESS RESPONSE
    return new Response(JSON.stringify({ success: true, trackId: track.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Synthesis Error';
    console.error('[Generate Track Error]:', msg);

    // Return 200 so the UI can display the error message gracefully
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
