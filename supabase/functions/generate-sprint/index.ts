import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Ensure you have GEMINI_API_KEY set in your Supabase secrets
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // 2. Parse Request Body
    const { language, difficulty, userId } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
    if (!userId) throw new Error('Missing userId');

    // 3. Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 4. Check for Existing Sprint (Idempotency)
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

    // 5. Generate Content with Gemini
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

    // 6. Clean & Parse JSON
    // Remove markdown code fences if Gemini adds them
    rawText = rawText
      .replace(/^```json\s*/, '') // Remove starting ```json
      .replace(/^```\s*/, '') // Remove starting ```
      .replace(/\s*```$/, '') // Remove ending ```
      .trim();

    let tasks;
    try {
      tasks = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON Parse Failed:', rawText);
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // 7. Save to Database

    // Upsert ensures that if a race condition created a row, we handle it,
    // though the initial check usually covers this.
    const { error: insertError } = await supabase.from('daily_sprints').upsert(
      {
        user_id: userId,
        date: today,
        tasks: tasks,
        is_completed: false,
        xp_earned: 0,
        // created_at is handled by default now()
      },
      { onConflict: 'user_id, date' },
    );

    if (insertError) {
      console.error('DB Insert Error:', insertError);
      throw new Error(`Database Error: ${insertError.message}`);
    }

    console.log('Sprint generated and saved successfully.');

    // 8. Return Tasks to Client
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
