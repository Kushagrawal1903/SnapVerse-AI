// Supabase Edge Function: AI Advisor
// Deploy with: supabase functions deploy ai-advisor
// Set secret: supabase secrets set GEMMA_API_KEY=your_key

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

    // Get Gemma API key from secrets
    const GEMMA_API_KEY = Deno.env.get('GEMMA_API_KEY');
    if (!GEMMA_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMMA_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, projectSnapshot, message, history } = await req.json();

    if (action === 'analyze') {
      // Non-streaming analysis
      const prompt = `${SYSTEM_PROMPT}\n\nAnalyze this reel project and return ONLY a valid JSON array of 3-6 improvement suggestions:\n\nProject: ${JSON.stringify(projectSnapshot)}\n\nReturn format: [{"id":"unique","category":"Category","priority":"high|medium|low","title":"Short Title","suggestion":"2-3 sentence actionable tip"}]`;

      const gemmaResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent?key=${GEMMA_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        }
      );

      const data = await gemmaResponse.json();
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

      const gemmaResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:streamGenerateContent?alt=sse&key=${GEMMA_API_KEY}`,
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
      const reader = gemmaResponse.body?.getReader();
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

    if (action === 'analyze_reel') {
      const { frames, urlOrName } = await req.json();
      
      const parts = [
        { text: `Analyze this short-form video reel (Title/URL: ${urlOrName}) and score it across these 6 dimensions.
For each, give a score 0-100 and 2-3 specific, actionable improvements.
Return ONLY valid JSON:
{
"overallScore": number,
"scores": {
"hook": { "score": number, "analysis": string, "fixes": string[] },
"pacing": { "score": number, "analysis": string, "fixes": string[] },
"audio": { "score": number, "analysis": string, "fixes": string[] },
"visuals": { "score": number, "analysis": string, "fixes": string[] },
"captions": { "score": number, "analysis": string, "fixes": string[] },
"cta": { "score": number, "analysis": string, "fixes": string[] }
},
"viralPrediction": "low" | "medium" | "high" | "very_high",
"topFix": string,
"hook3SecondAnalysis": string,
"bestMoment": { "timestamp": number, "reason": string }
}` }
      ];

      // Add base64 frames if provided
      if (frames && Array.isArray(frames)) {
        for (const frame of frames) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: frame
            }
          });
        }
      }

      const gemmaResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent?key=${GEMMA_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
          }),
        }
      );

      const data = await gemmaResponse.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      
      try {
        const clean = text.replace(/```json\n?|```\n?/g, '').trim();
        const parsed = JSON.parse(clean);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: text }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'viral_breakdown') {
      const { url } = await req.json();
      
      // Attempt to fetch URL metadata to give Gemini context
      let metadata = '';
      try {
        // Since many platforms block direct scraping, we try a simple fetch or oEmbed if possible.
        // For edge functions, a simple fetch might get basic meta tags.
        const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }});
        if (pageRes.ok) {
          const html = await pageRes.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) || html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i);
          
          if (titleMatch) metadata += `Title: ${titleMatch[1]}\n`;
          if (descMatch) metadata += `Description: ${descMatch[1]}\n`;
        }
      } catch (e) {
        console.warn('Failed to fetch url metadata', e);
      }

      const prompt = `This is a viral short-form video URL: ${url}
Context from page metadata (if any):
${metadata || 'No metadata available.'}

Reverse-engineer exactly why it works, or infer a viral template based on the URL context.
Return JSON ONLY:
{
"hookType": string (e.g. "Question hook", "Shock value", "Tutorial promise"),
"hookTiming": number (seconds),
"cutRhythm": string,
"averageClipLength": number,
"audioAnalysis": string,
"emotionalArc": string,
"textStrategy": string,
"whatToSteal": string[],
"templateSteps": string[]
}`;

      const gemmaResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent?key=${GEMMA_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
          }),
        }
      );

      const data = await gemmaResponse.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      
      try {
        const clean = text.replace(/```json\n?|```\n?/g, '').trim();
        const parsed = JSON.parse(clean);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: text }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
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
