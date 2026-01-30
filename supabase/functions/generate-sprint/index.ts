import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { language, difficulty } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    // 1. Authenticate User & Get Real ID
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized: Invalid token');
    const userId = user.id;

    // 2. Initialize Admin Client (Bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const today = new Date().toISOString().split('T')[0];

    // 3. CHECK CACHE (Language Specific)
    const { data: existingSprint } = await supabaseAdmin
      .from('daily_sprints')
      .select('tasks')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('language', language)
      .maybeSingle();

    if (existingSprint) {
      console.log('Cache Hit: Returning existing sprint');
      return new Response(JSON.stringify(existingSprint.tasks), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 4. CHECK LIMITS (Role Based)
    // A. Get User Role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const userRole = profile?.role || 'MEMBER';

    // B. Count usage today
    const { count } = await supabaseAdmin
      .from('daily_sprints')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('date', today);

    const currentUsage = count || 0;

    // C. Define Limits
    let dailyLimit = 1;
    if (userRole === 'PREMIUM' || userRole === 'MODERATOR') dailyLimit = 3;
    if (userRole === 'ADMIN') dailyLimit = 9999; // <--- YOU ARE HERE

    // D. Enforce
    if (currentUsage >= dailyLimit) {
      throw new Error(
        `Daily limit reached! You are a ${userRole} and can only generate ${dailyLimit} sprints per day.`,
      );
    }

    // 5. Generate Gemini Content (ALL LANGUAGES SUPPORTED)
    const prompt = `
      Generate 5 distinct coding tasks for ${language} at ${difficulty} level.
      Return ONLY valid JSON array. No markdown. No comments.

      STRICT GENERATION RULES:
      1. Use MODERN standards for ${language} (e.g., latest stable version features).
      2. Do NOT generate questions based on deprecated features.
      3. For "True/False" or "Quiz" questions, ensure the answer is unambiguously correct in 2024+.
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

    rawText = rawText
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
    const tasks = JSON.parse(rawText);

    // 6. Save to Database
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
      { onConflict: 'user_id, date, language' },
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
      status: 400, // Frontend handles 400 as a user-facing error
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
