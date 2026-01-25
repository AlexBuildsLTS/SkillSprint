// @ts-ignore
import { GoogleGenAI, Part } from '@google/genai';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * --- CONFIGURATION ---
 * Using Gemini 2.0 Flash for its speed and efficiency in technical tutoring.
 */
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * System Instruction:
 * This guides the AI's overall behavior and tone.
 */
const SYSTEM_INSTRUCTION = `You are 'SprintBot', the AI tutor for SkillSprint. 
Your goal is to help users learn coding, React Native, and system design. 
Keep answers concise, technical, and educational. 
If asked about code, provide clean snippets.`;

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Validate Environment
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Server configuration error: Missing GEMINI_API_KEY');
    }

    // 3. Request Parsing & Validation
    const { prompt, image } = await req.json().catch(() => ({}));

    if (!prompt || typeof prompt !== 'string') {
      return Response.json(
        { text: "I need a prompt to help you! What's on your mind?" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 4. Initialize Client (New SDK)
    // Note: The new SDK accepts the key in the constructor object
    const client = new GoogleGenAI({ apiKey });

    // 5. Build Content Parts
    const parts: Part[] = [{ text: prompt }];

    if (image) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: image,
        },
      });
    }

    // 6. Generate Content
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4, // Balanced for technical accuracy
        maxOutputTokens: 1024,
      },
    });

    console.log(`[AI Chat]: Generated response for prompt: "${prompt.substring(0, 20)}..."`);

    // 7. Extract Text (New SDK Method)
    const aiText = result.response.text();

    if (!aiText) {
      throw new Error('AI returned empty response');
    }

    // 8. Successful Response
    return Response.json({ text: aiText }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('[AI Chat Error]:', error);

    // Friendly error message for the UI
    const message = "I'm having trouble connecting right now. Please try again in a moment.";

    return Response.json(
      { text: message },
      {
        status: 200, // Keep 200 to prevent UI crashes
        headers: corsHeaders,
      },
    );
  }
});