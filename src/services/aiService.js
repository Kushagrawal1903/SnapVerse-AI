import { supabase, isSupabaseConfigured } from '../lib/supabase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are "AI Director" — an expert video editor and creative director built into SnapVerse, an AI-powered reel editing app. You analyze the user's project state and provide concise, actionable coaching.

Your personality: Professional but warm. Think of yourself as a talented creative director looking over someone's shoulder. You notice things they might miss and suggest improvements.

When analyzing a project, provide feedback in these categories:
- PACING: Are clip lengths balanced? Is the rhythm engaging?
- COMPOSITION: Are visual elements well-arranged?
- AUDIO: Is audio balanced? Are there gaps or clipping?
- STORY: Does the sequence tell a coherent story?
- POLISH: Missing transitions? Text alignment? Color consistency?
- PLATFORM: Is it optimized for the target platform (Reels/TikTok/Shorts)?

Keep it to 3-6 suggestions maximum. Be specific, not generic.`;

// ═══════════════════════════════════════
// Analyze Project (returns JSON suggestions)
// ═══════════════════════════════════════

export async function analyzeProject(projectSnapshot) {
  const prompt = `Analyze this reel project and return ONLY a valid JSON array of improvement cards (no markdown, no explanation):
  
Project: ${JSON.stringify(projectSnapshot)}

Return format:
[{"id":"unique_id","category":"Pacing|Hook|Audio|Visual|Captions|Structure","priority":"high|medium|low","title":"short title","suggestion":"2-3 sentence actionable tip"}]`;

  // Try Supabase Edge Function first
  if (isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: 'analyze', projectSnapshot }),
          }
        );
        if (response.ok) {
          const text = await response.text();
          return parseJsonResponse(text);
        }
      }
    } catch (e) {
      console.warn('Edge function failed, trying fallback:', e);
    }
  }

  // Fallback: direct Gemini API with env var key
  if (GEMINI_API_KEY) {
    return await callGeminiDirect(prompt);
  }

  // No AI available
  return [{ id: 'no-ai', category: 'Structure', priority: 'low', title: 'AI Not Configured', suggestion: 'Set up a Gemini API key to get AI-powered suggestions for your project.' }];
}

// ═══════════════════════════════════════
// Chat with AI Director (streaming)
// ═══════════════════════════════════════

export async function* chatStream(message, history, projectSnapshot) {
  // Try Supabase Edge Function
  if (isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: 'chat', message, history, projectSnapshot }),
          }
        );
        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            yield decoder.decode(value);
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Edge function chat failed, trying fallback:', e);
    }
  }

  // Fallback: direct Gemini with env var key
  if (GEMINI_API_KEY) {
    const contextMessage = `[Current project context: ${JSON.stringify(projectSnapshot)}]\n\nUser question: ${message}`;
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemma-3-4b-it' });

    const chatSession = model.startChat({
      systemInstruction: SYSTEM_PROMPT,
      history: (history || []).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    });

    const result = await chatSession.sendMessageStream(contextMessage);
    for await (const chunk of result.stream) {
      yield chunk.text();
    }
    return;
  }

  yield 'AI is not configured. Please set up a Gemini API key or configure Supabase Edge Functions.';
}

// Non-streaming chat fallback
export async function chatWithAI(message, projectSnapshot) {
  let fullResponse = '';
  for await (const chunk of chatStream(message, [], projectSnapshot)) {
    fullResponse += chunk;
  }
  return fullResponse;
}

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

async function callGeminiDirect(prompt) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemma-3-4b-it' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseJsonResponse(text);
  } catch (e) {
    console.error('Gemini direct call failed:', e);
    return [{ id: 'error', category: 'Structure', priority: 'low', title: 'Analysis Failed', suggestion: e.message }];
  }
}

function parseJsonResponse(text) {
  try {
    // Strip markdown code fences if present
    const clean = text.replace(/```json\n?|```\n?/g, '').trim();
    const jsonMatch = clean.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(clean);
  } catch {
    return [{ id: 'parse-error', category: 'Structure', priority: 'low', title: 'AI Response', suggestion: text.slice(0, 200) }];
  }
}

export function isAIAvailable() {
  return isSupabaseConfigured() || !!GEMINI_API_KEY;
}
