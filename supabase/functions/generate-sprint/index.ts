import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: CORS_HEADERS });

  try {
    const { language, difficulty, userId } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    // 1. Check if a sprint already exists for today
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const today = new Date().toISOString().split('T')[0];

    const { data: existingSprint } = await supabase
      .from('daily_sprints')
      .select('tasks')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existingSprint) {
      return new Response(JSON.stringify(existingSprint.tasks), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Prompt Gemini for JSON Structure
    const prompt = `
      Generate 5 distinct coding tasks for ${language} at ${difficulty} level.
      Return ONLY valid JSON array. No markdown. No comments.
      Format:
      [
        {
          "id": 1,
          "type": "quiz",
          "title": "Topic Name",
          "content": "Question text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 0,
          "explanation": "Why A is correct."
        },
        {
          "id": 2,
          "type": "code",
          "title": "Coding Challenge",
          "content": "Problem description",
          "codeSnippet": "def buggy_function():\\n  pass", 
          "answer": "Correct output or fixed code",
          "explanation": "Fix explanation"
        }
      ]
      Ensure a mix of 'quiz' and 'code' types.
    `;

    const geminiResp = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
      }),
    });

    const geminiData = await geminiResp.json();
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Clean markdown if Gemini adds it
    rawText = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const tasks = JSON.parse(rawText);

    // 3. Store in Database
    await supabase.from('daily_sprints').insert({
      user_id: userId,
      date: today,
      tasks: tasks,
      is_completed: false,
      xp_earned: 0,
    });

    return new Response(JSON.stringify(tasks), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.warn('Sprint Gen Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
