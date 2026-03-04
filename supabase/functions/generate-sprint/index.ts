import { createClient } from '@supabase/supabase-js';

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};
Deno.serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { language, difficulty } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
    if (!language || !difficulty)
      throw new Error('Missing language or difficulty parameters');

    // 2. Initialize Supabase Client to verify the user
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
    if (authError || !user)
      throw new Error('Unauthorized: Invalid or missing token');

    const userId = user.id;

    // 3. Initialize Admin Client for saving
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const today = new Date().toISOString().split('T')[0];

    // 4. Check Cache (Respecting User + Date + Language)
    const { data: existingSprint } = await supabaseAdmin
      .from('daily_sprints')
      .select('tasks')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('language', language)
      .maybeSingle();

    if (existingSprint && existingSprint.tasks) {
      return new Response(JSON.stringify(existingSprint.tasks), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Generate Gemini Content (Forcing Mixed Output)
    const prompt = `
      Generate exactly 5 coding tasks for ${language} at ${difficulty} level.
      You MUST include a mix of BOTH "quiz" (multiple choice) and "code" (write code to execute) tasks.
      Return ONLY a valid JSON array. No markdown blocks, no backticks, no comments.

      STRICT GENERATION RULES:
      1. Use MODERN standards only.
      2. For "code" tasks, provide a valid "codeSnippet" to start, and the EXACT expected "answer" output that will be printed to the console.
      
      Format EXACTLY like this:
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
          "answer": "Expected console output goes here",
          "explanation": "How to solve it."
        }
      ]
    `;

    const geminiResp = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2500 },
      }),
    });

    if (!geminiResp.ok) {
      const text = await geminiResp.text();
      throw new Error(`Gemini API Error: ${text}`);
    }

    const geminiData = await geminiResp.json();
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // 🛡️ AGGRESSIVE JSON CLEANING
    rawText = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let tasks;
    try {
      tasks = JSON.parse(rawText);
    } catch (e) {
      throw new Error(
        `AI returned invalid JSON: ${rawText.substring(0, 100)}...`,
      );
    }

    // 6. Save to Database using the exact existing unique constraint
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

    if (dbError) throw new Error(`Database Save Failed: ${dbError.message}`);

    return new Response(JSON.stringify(tasks), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Sprint Edge Error]:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
