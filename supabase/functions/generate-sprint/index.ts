import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_MODEL = 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

Deno.serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Auth & Setup
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
      throw new Error('Unauthorized: ' + (authError?.message || 'No user'));

    const { language = 'Python', difficulty = 'INTERMEDIATE' } =
      await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

    console.log(`Generating sprint for: ${language} (${difficulty})`);

    // 3. Robust Prompt
    const prompt = `
      Generate 5 micro-learning coding tasks for ${language} (${difficulty}).
      Return RAW JSON only. No Markdown.
      
      Structure:
      {
        "tasks": [
          {
            "title": "Task Title",
            "content": "Question or Instruction",
            "type": "code" (if coding needed) or "quiz",
            "codeSnippet": "Initial code (include '# snake_game' if it's a game task, or 'import numpy' for data)",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": 0
          }
        ]
      }
    `;

    // 4. Call Gemini
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: 'application/json',
        },
      }),
    });

    const resultData = await response.json();
    const aiText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      console.error('Gemini Empty Response:', resultData);
      throw new Error('AI returned empty response');
    }

    // 5. Parse & Sanitize
    const cleanedText = aiText.replace(/```json|```/g, '').trim();
    let generated;
    try {
      generated = JSON.parse(cleanedText);
    } catch (e) {
      console.error('JSON Parse Error:', e, cleanedText);
      throw new Error('Invalid JSON from AI');
    }

    // 6. DB Log (Fire & Forget to prevent blocking)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // We try to log, but don't fail the request if DB is locked/missing
    try {
      const tasksToInsert = generated.tasks.map((t: any) => ({
        user_id: user.id,
        language,
        difficulty,
        task_content: t,
        task_hash: btoa(t.title + t.content).substring(0, 20), // Simple hash
      }));
      await supabaseAdmin.from('sprint_tasks').insert(tasksToInsert);
    } catch (dbErr) {
      console.warn('Failed to log sprint tasks:', dbErr);
    }

    // 7. Return Success
    return new Response(JSON.stringify(generated.tasks), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Sprint Generation Failed:', error.message);

    // FALLBACK: Return a static sprint so the app doesn't crash
    const fallbackTasks = [
      {
        title: 'Emergency Backup Protocol',
        content:
          'The AI is offline. Write a Python script to reboot the system.',
        type: 'code',
        codeSnippet:
          '# snake_game_backup\nclass System:\n  def reboot(self):\n    pass',
        options: ['Run', 'Debug', 'Exit', 'Help'],
        correctAnswer: 0,
      },
    ];

    return new Response(JSON.stringify(fallbackTasks), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
