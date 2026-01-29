import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { language, difficulty, userId } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
    if (!userId) throw new Error('Missing userId');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Check for Existing Sprint
    const today = new Date().toISOString().split('T')[0];

    const { data: existingSprint } = await supabase
      .from('daily_sprints')
      .select('tasks')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (
      existingSprint &&
      existingSprint.tasks &&
      existingSprint.tasks.length > 0
    ) {
      console.log('Returning existing sprint for today.');
      return new Response(JSON.stringify(existingSprint.tasks), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Generate with Gemini
    console.log(`Generating sprint for ${language} (${difficulty})...`);

    const prompt = `
      Generate 5 distinct coding tasks for ${language} at ${difficulty} level.
      Return ONLY valid JSON array. No markdown. No comments.
      
      Structure the response exactly like this:
      [
        {
          "id": 1,
          "type": "quiz",
          "title": "Concept Check",
          "content": "A clear question about ${language} syntax or concepts.",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Brief explanation."
        },
        {
          "id": 2,
          "type": "code",
          "title": "Bug Fix Challenge",
          "content": "Describe a bug in the code below.",
          "codeSnippet": "function broken() { ... }", 
          "answer": "The corrected code or expected output.",
          "explanation": "What was fixed."
        }
      ]
      
      IMPORTANT:
      - Mix "quiz" and "code" types (e.g., 2 quiz, 3 code).
      - Ensure code snippets are valid ${language}.
      - Do not wrap in \`\`\`json blocks. Just raw JSON.
    `;

    const geminiResp = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2500 },
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const geminiData = await geminiResp.json();
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    rawText = rawText
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();

    let tasks;
    try {
      tasks = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON Parse Failed:', rawText);
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // 3. Save to Database (WITH CATEGORIES)
    const { error: insertError } = await supabase.from('daily_sprints').upsert(
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

    if (insertError) {
      console.error('DB Insert Error:', insertError);
      throw new Error(`Database Error: ${insertError.message}`);
    }

    console.log('Sprint generated and saved successfully.');

    return new Response(JSON.stringify(tasks), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Generate Sprint Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
