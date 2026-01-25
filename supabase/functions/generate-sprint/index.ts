import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { corsHeaders } from '../_shared/cors.ts';
import { Database } from '../../database.types.ts';

// 1. Maintainability: Define clear types for the AI-generated content
type SprintCard = {
  type: 'info' | 'mcq' | 'true_false';
  content?: string;
  question?: string;
  options?: string[];
  answer?: number | boolean;
};

const GEMINI_MODEL = 'gemini-1.5-flash';
const SPRINTS_TABLE = 'daily_sprints';

Deno.serve(async (req) => {
  // 2. Best Practice: Handle CORS preflight requests efficiently
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 3. Performance & Error Handling: Validate environment variables early
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
      console.error('Missing configuration: SUPABASE_URL, SUPABASE_ANON_KEY, or GEMINI_API_KEY');
      return Response.json({ error: 'Server configuration error' }, { status: 500, headers: corsHeaders });
    }

    // 4. Security: Robust authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing Authorization header' }, { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const today = new Date().toISOString().split('T')[0];

    // 5. Optimization: Cache check using maybeSingle() to avoid noisy 406 errors
    const { data: existing, error: fetchError } = await supabaseClient
      .from(SPRINTS_TABLE)
      .select('content')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing sprint:', fetchError);
    }

    if (existing?.content) {
      return Response.json(existing.content, { headers: corsHeaders });
    }

    // 6. Best Practice: Use Gemini's native JSON mode for reliable output
    // This eliminates the need for manual markdown stripping or regex cleaning.
    const genAI = new GoogleGenerativeAI(geminiApiKey); 

 const model = genAI.getGenerativeModel({ 
  model: GEMINI_MODEL 
});

    const prompt = `Generate a JSON array of 5 learning cards for a Software Engineer. 
    Types: 
    - 'info': { "type": "info", "content": "Educational text about a concept" }
    - 'mcq': { "type": "mcq", "question": "Question text", "options": ["Choice 0", "Choice 1", "Choice 2", "Choice 3"], "answer": 0 }
    - 'true_false': { "type": "true_false", "question": "Statement text", "answer": true }
    Topics: TypeScript, React Native, Supabase. 
    Provide exactly 5 diverse cards in a plain JSON array format.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // 7. Robustness: Safe parsing and validation of AI output
    let content: SprintCard[];
    try {
      content = JSON.parse(responseText);
      if (!Array.isArray(content)) {
        throw new Error('AI output is not a valid array');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText, parseError);
      return Response.json({ error: 'Failed to generate sprint content' }, { status: 502, headers: corsHeaders });
    }

    // 8. Persistence: Store the generated sprint for the user
    const { error: insertError } = await supabaseClient
      .from(SPRINTS_TABLE)
      .insert({
        user_id: user.id,
        date: today,
        content: content,
      });

    if (insertError) {
      console.error('Failed to cache generated sprint:', insertError);
      // We still return the content to the user even if caching failed
    }

    // 9. Best Practice: Standardized JSON response
    return Response.json(content, { headers: corsHeaders });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[generate-sprint error]: ${errorMessage}`, err);
    
    return Response.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
});
