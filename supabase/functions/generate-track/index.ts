import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Strict Prompt Engineering for Structured Data
    const prompt = `
      You are a Senior Curriculum Architect for a coding platform.
      Create a comprehensive learning track for: "${topic}".
      
      REQUIREMENTS:
      1. Determine the category based on the topic: 'FRONTEND', 'BACKEND', 'SYSTEMS', or 'DATA'.
      2. Difficulty should be 'BEGINNER' unless the topic is inherently complex.
      3. Generate exactly 5 progressive lessons.
      4. Each lesson MUST have a 'content' object with 'text' and 'starter_code'.
      5. Each lesson MUST have a 'quiz' object with 'question', 'options' (4 items), 'answer' (index 0-3), and 'explanation'.
      6. Code snippets must be valid and educational.

      OUTPUT FORMAT (Strict JSON, no markdown):
      {
        "track": {
          "title": "Title Case Name",
          "description": "Engaging description under 150 chars.",
          "category": "BACKEND",
          "difficulty": "BEGINNER",
          "icon": "code", 
          "color_gradient": "from-blue-500-to-cyan-500"
        },
        "lessons": [
          {
            "title": "Lesson 1 Title",
            "order": 1,
            "xp_reward": 100,
            "content": {
              "text": "Clear, concise explanation of the concept.",
              "starter_code": "print('Hello')"
            },
            "quiz": {
              "question": "Test understanding",
              "options": ["Correct", "Wrong 1", "Wrong 2", "Wrong 3"],
              "answer": 0,
              "explanation": "Why correct is correct."
            }
          }
        ]
      }
    `;

    // 2. Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Low temp for strict JSON adherence
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error('AI returned empty response');

    // Clean potential markdown wrappers
    rawText = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    const result = JSON.parse(rawText);

    // 3. Database Insertion Transaction
    // A. Insert Track
    const slug =
      result.track.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
      '-' +
      Date.now().toString().slice(-4);

    const { data: trackData, error: trackError } = await supabase
      .from('tracks')
      .insert({
        title: result.track.title,
        slug: slug,
        description: result.track.description,
        category: result.track.category,
        difficulty: result.track.difficulty,
        icon: result.track.icon,
        color_gradient: result.track.color_gradient,
        is_published: false, // Draft mode by default for safety
      })
      .select()
      .single();

    if (trackError) throw trackError;

    // B. Insert Lessons and Questions
    for (const lesson of result.lessons) {
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          track_id: trackData.id,
          title: lesson.title,
          order: lesson.order,
          xp_reward: lesson.xp_reward,
          content: lesson.content, // helper to ensure jsonb compatibility
        })
        .select()
        .single();

      if (lessonError) throw lessonError;

      // C. Insert Quiz Question
      const { error: quizError } = await supabase.from('questions').insert({
        lesson_id: lessonData.id,
        type: 'mcq',
        question: lesson.quiz.question,
        options: lesson.quiz.options,
        answer: lesson.quiz.answer, // Storing index or value depending on your DB constraint, assumed JSONB or text match
        explanation: lesson.quiz.explanation,
      });

      if (quizError) throw quizError;
    }

    return new Response(JSON.stringify({ success: true, track: trackData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating track:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
