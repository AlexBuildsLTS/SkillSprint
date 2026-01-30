import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

Deno.serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { language, difficulty } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    // 2. Initialize Supabase Client
    // We use the Auth Header from the request to get the User Context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    // 3. Get the Real User ID from the JWT (Fixes the "undefined" bug)
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized: Invalid or missing token');
    }
    const userId = user.id; // <--- This is now guaranteed to be the correct UUID

    // 4. Initialize Admin Client for Database Operations (Bypass RLS for saving)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const today = new Date().toISOString().split('T')[0];

    // 5. Check Cache
    const { data: existingSprint } = await supabaseAdmin
      .from('daily_sprints')
      .select('tasks')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existingSprint) {
      console.log('Cache Hit: Returning existing sprint');
      return new Response(JSON.stringify(existingSprint.tasks), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 6. Generate Gemini Content
    const prompt = `
      Generate 5 distinct coding tasks for ${language} at ${difficulty} level.
      Return ONLY valid JSON array. No markdown. No comments.

      STRICT GENERATION RULES:
      1. Use MODERN standards only (e.g., JavaScript ES2023+, Python 3.11+, React 18+).
      2. Do NOT generate questions based on deprecated features.
      3. For "True/False" or "Quiz" questions, ensure the answer is unambiguously correct in 2024.
      4. Avoid "trick" questions about features that have changed recently.

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
    `;

    const geminiResp = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
      }),
    });

    if (!geminiResp.ok) {
      const text = await geminiResp.text();
      throw new Error(`Gemini API Error: ${geminiResp.status} ${text}`);
    }

    const geminiData = await geminiResp.json();
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Clean markdown
    rawText = rawText
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
    const tasks = JSON.parse(rawText);

    // 7. Save to Database (Using Admin Client & Valid UserID)
    const { error: dbError } = await supabaseAdmin.from('daily_sprints').upsert(
      {
        user_id: userId,
        date: today,
        tasks: tasks,
        language: language,
        difficulty: difficulty,
        is_completed: false,
        xp_earned: 0,
      },
      { onConflict: 'user_id, date' },
    );

    if (dbError) {
      console.error('CRITICAL DB SAVE ERROR:', dbError);
      throw new Error(`Database Save Failed: ${dbError.message}`);
    }

    return new Response(JSON.stringify(tasks), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sprint Gen Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, // Return 500 so you know it failed
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
