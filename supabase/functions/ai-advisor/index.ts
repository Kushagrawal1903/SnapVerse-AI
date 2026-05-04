// Supabase Edge Function: AI Advisor
// Deploy with: supabase functions deploy ai-advisor
// Set secret: supabase secrets set GEMINI_API_KEY=your_key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are "AI Director" — an expert video editor and creative director built into SnapVerse, an AI-powered reel editing app. You analyze the user's project state and provide concise, actionable coaching.

When analyzing, provide feedback as JSON array with fields: id, category, priority, title, suggestion.
Categories: Pacing, Hook, Audio, Visual, Captions, Structure
Priorities: high, medium, low

When chatting, be conversational but professional. Give specific, actionable advice.`;

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Gemini API key from secrets
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, projectSnapshot, message, history } = await req.json();

    if (action === 'analyze') {
      // Non-streaming analysis
      const prompt = `${SYSTEM_PROMPT}\n\nAnalyze this reel project and return ONLY a valid JSON array of 3-6 improvement suggestions:\n\nProject: ${JSON.stringify(projectSnapshot)}\n\nReturn format: [{"id":"unique","category":"Category","priority":"high|medium|low","title":"Short Title","suggestion":"2-3 sentence actionable tip"}]`;

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        }
      );

      const data = await geminiResponse.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

      return new Response(text, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (action === 'chat') {
      // Streaming chat
      const contents = [];

      // Add history
      if (history?.length) {
        for (const msg of history) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }

      // Add current message with context
      contents.push({
        role: 'user',
        parts: [{ text: `[Project context: ${JSON.stringify(projectSnapshot)}]\n\n${message}` }],
      });

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
          }),
        }
      );

      // Stream the response
      const reader = geminiResponse.body?.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) {
            controller.close();
            return;
          }
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            // Parse SSE events
            const lines = text.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const parsed = JSON.parse(jsonStr);
                  const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  if (chunk) {
                    controller.enqueue(encoder.encode(chunk));
                  }
                } catch {}
              }
            }
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
