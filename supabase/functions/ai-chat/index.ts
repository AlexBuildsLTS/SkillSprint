import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';


const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { prompt, image, userId } = await req.json();

    // 1. Get API key: prefer user's key, fallback to global
    let apiKey = Deno.env.get('GEMINI_API_KEY');

    if (userId) {
      try {
        const { data: userSecret } = await supabaseAdmin
          .from('user_secrets')
          .select('api_key_encrypted')
          .eq('user_id', userId)
          .eq('service', 'gemini')
          .maybeSingle();

        if (userSecret?.api_key_encrypted) {
          apiKey = decryptMessage(userSecret.api_key_encrypted);
        }
      } catch (error) {
        console.warn('Failed to fetch user API key, using global key:', error);
      }
    }

    if (!apiKey) throw new Error('No API key available');
    if (!prompt) throw new Error('Prompt is missing');

    // 2. Build the Content Parts
    const parts: GeminiPart[] = [{ text: prompt }];

    if (image) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: image, // Base64 string without prefix
        },
      });
    }

    // 3. Call Gemini v1beta
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: 'You are NorthFinance CFO AI. Analyze financial data objectively. You are a tool, not a regulated financial advisor. Provide concise, professional, and actionable insights.',
            },
          ],
        },
        contents: [{ role: 'user', parts }],
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          topP: 0.8,
          topK: 40,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API Error:', data.error);
      return new Response(
        JSON.stringify({ text: `Google Error: ${data.error.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      const reason = data.candidates?.[0]?.finishReason || 'UNKNOWN';
      return new Response(
        JSON.stringify({
          text: `AI Output Restricted (${reason}). Please try rephrasing.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ text: aiText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Edge Error';
    console.error('[Edge Function Error]:', msg);
    return new Response(JSON.stringify({ text: `Edge Error: ${msg}` }), {
      status: 200, // Return 200 so the UI can display the error message nicely
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// deno-lint-ignore camelcase
function decryptMessage(_api_key_encrypted: any): string | undefined {
  throw new Error('Function not implemented.');
}
