import { supabase, isSupabaseConfigured } from '../lib/supabase';

const GEMMA_API_KEY = import.meta.env.VITE_GEMMA_API_KEY;
// Gemma-only configuration.
// We dynamically resolve the exact model ID using ListModels so it matches what your API key supports.
const GEMMA_ONLY = (import.meta.env.VITE_GEMMA_ONLY ?? 'true') !== 'false';
const PREFERRED_GEMMA_MODEL = import.meta.env.VITE_GEMMA_MODEL || 'gemma-3-27b-it';
const GEMMA_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

let resolvedGemmaModel = null;
let resolvedGemmaCandidates = null;

async function resolveGemmaModelId() {
  if (resolvedGemmaModel) return resolvedGemmaModel;
  if (!GEMMA_API_KEY) return null;

  // List models available to this API key and pick a Gemma model that supports generateContent.
  const res = await fetch(`${GEMMA_API_BASE}/models?key=${encodeURIComponent(GEMMA_API_KEY)}`);
  if (!res.ok) {
    throw new Error(`Failed to list models (${res.status}). Check VITE_GEMMA_API_KEY.`);
  }
  const json = await res.json();
  const models = Array.isArray(json.models) ? json.models : [];

  const supportsGenerate = (m) =>
    Array.isArray(m.supportedGenerationMethods) &&
    m.supportedGenerationMethods.includes('generateContent');

  const byName = new Map(models.map((m) => [m.name, m]));

  // Most APIs return model names like "models/<id>".
  const preferredFull = PREFERRED_GEMMA_MODEL.startsWith('models/')
    ? PREFERRED_GEMMA_MODEL
    : `models/${PREFERRED_GEMMA_MODEL}`;

  if (byName.has(preferredFull) && supportsGenerate(byName.get(preferredFull))) {
    resolvedGemmaModel = PREFERRED_GEMMA_MODEL;
    return resolvedGemmaModel;
  }

  // If the preferred model isn't present, try to find a closest Gemma 3 27B instruct model.
  const candidates = models
    .filter(supportsGenerate)
    .map((m) => m.name?.replace(/^models\//, ''))
    .filter(Boolean);
  resolvedGemmaCandidates = candidates;

  const gemma3Candidates = candidates.filter((id) => id.startsWith('gemma-3') && id.includes('27b') && id.includes('it'));
  if (gemma3Candidates.length > 0) {
    resolvedGemmaModel = gemma3Candidates[0];
    return resolvedGemmaModel;
  }

  const anyGemmaCandidates = candidates.filter((id) => id.startsWith('gemma-'));
  if (anyGemmaCandidates.length > 0) {
    resolvedGemmaModel = anyGemmaCandidates[0];
    return resolvedGemmaModel;
  }

  throw new Error(
    `No Gemma model with generateContent is available for this API key. ` +
      `Run ListModels and ensure Gemma access is enabled.`
  );
}

async function getGemmaCandidates() {
  if (resolvedGemmaCandidates?.length) return resolvedGemmaCandidates;
  await resolveGemmaModelId();
  return resolvedGemmaCandidates || [];
}

function isTransientGemmaError(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('[500') ||
    msg.includes('internal error') ||
    msg.includes('rate limit') ||
    msg.includes('[503') ||
    msg.includes('unavailable') ||
    msg.includes('timeout') ||
    msg.includes('temporarily')
  );
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function withRetries(fn, { retries = 2, baseDelayMs = 350 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isTransientGemmaError(e) || attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function getModel(genAI, modelId) {
  return genAI.getGenerativeModel({ model: modelId });
}

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
  const prompt = `${SYSTEM_PROMPT}

TASK:
Analyze the following reel project JSON and return ONLY a valid JSON array of 3 to 6 improvement cards.

Rules:
- Output MUST be a JSON array (no markdown, no prose).
- Each item MUST include: id, category, priority, title, suggestion.
- suggestion must be 2-3 sentences and directly actionable.

Project:
${JSON.stringify(projectSnapshot)}

Return format (example shape only):
[{"id":"unique_id","category":"Pacing|Hook|Audio|Visual|Captions|Structure","priority":"high|medium|low","title":"short title","suggestion":"2-3 sentence actionable tip"}]`;

  // Try Supabase Edge Function first (unless forced Gemma-only)
  if (!GEMMA_ONLY && isSupabaseConfigured()) {
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

  // Fallback: direct Gemma API with env var key
  if (GEMMA_API_KEY) {
    return await callGemmaDirect(prompt);
  }

  // No AI available
  return [{ id: 'no-ai', category: 'Structure', priority: 'low', title: 'AI Not Configured', suggestion: 'Set up a Gemma API key to get AI-powered suggestions for your project.' }];
}

// ═══════════════════════════════════════
// Chat with AI Director (streaming)
// ═══════════════════════════════════════

export async function* chatStream(message, history, projectSnapshot) {
  // Try Supabase Edge Function (unless forced Gemma-only)
  if (!GEMMA_ONLY && isSupabaseConfigured()) {
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

  // Fallback: direct Gemma with env var key
  if (GEMMA_API_KEY) {
    const contextMessage = `[Current project context: ${JSON.stringify(projectSnapshot)}]\n\nUser question: ${message}`;
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMMA_API_KEY);
    const candidates = await getGemmaCandidates();
    const preferred = await resolveGemmaModelId();
    const ordered = [preferred, ...candidates.filter((c) => c !== preferred)].filter(Boolean);

    let lastErr = null;
    for (const modelId of ordered) {
      try {
        const model = await getModel(genAI, modelId);
        const chatSession = model.startChat({
          systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] },
          history: (history || []).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        });

        const result = await withRetries(
          () => chatSession.sendMessageStream(contextMessage),
          { retries: 2, baseDelayMs: 450 }
        );

        for await (const chunk of result.stream) {
          yield chunk.text();
        }
        return;
      } catch (e) {
        lastErr = e;
        if (!isTransientGemmaError(e)) break;
      }
    }

    throw lastErr || new Error('Gemma chat failed.');
  }

  yield 'AI is not configured. Please set up a Gemma API key or configure Supabase Edge Functions.';
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

async function callGemmaDirect(prompt) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMMA_API_KEY);
    const candidates = await getGemmaCandidates();
    const preferred = await resolveGemmaModelId();
    const ordered = [preferred, ...candidates.filter((c) => c !== preferred)].filter(Boolean);

    let lastErr = null;
    for (const modelId of ordered) {
      try {
        const model = await getModel(genAI, modelId);
        const result = await withRetries(
          () =>
            model.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          { retries: 2, baseDelayMs: 450 }
        );
        const text = result.response.text();
        const parsed = parseJsonArray(text);
        if (parsed) return parsed;

        // Repair pass: ask the model to convert its previous output into the required JSON array.
        const repairPrompt = `Convert the following text into the required JSON array format.
Return ONLY valid JSON array. No markdown.

Required array item shape:
{"id":"unique_id","category":"Pacing|Hook|Audio|Visual|Captions|Structure","priority":"high|medium|low","title":"short title","suggestion":"2-3 sentence actionable tip"}

Text to convert:
${text}`;

        const repaired = await withRetries(
          () =>
            model.generateContent({
              contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          { retries: 2, baseDelayMs: 450 }
        );

        const repairedText = repaired.response.text();
        const repairedParsed = parseJsonArray(repairedText);
        if (repairedParsed) return repairedParsed;

        return parseJsonResponse(text);
      } catch (e) {
        lastErr = e;
        if (!isTransientGemmaError(e)) break;
      }
    }

    throw lastErr || new Error('Gemma generateContent failed.');
  } catch (e) {
    console.error('Gemma direct call failed:', e);
    return [{ id: 'error', category: 'Structure', priority: 'low', title: 'Analysis Failed', suggestion: e.message }];
  }
}

function parseJsonArray(text) {
  try {
    const clean = String(text || '').replace(/```json\n?|```\n?/g, '').trim();
    const jsonMatch = clean.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonObject(text) {
  try {
    const clean = String(text || '').replace(/```json\n?|```\n?/g, '').trim();
    const objectMatch = clean.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      const parsed = JSON.parse(objectMatch[0]);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    }
    const parsed = JSON.parse(clean);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
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
  return isSupabaseConfigured() || !!GEMMA_API_KEY;
}

// ═══════════════════════════════════════
// Transcription (Karaoke Captions)
// ═══════════════════════════════════════

export async function transcribeAudio(blob) {
  if (!GEMMA_API_KEY) {
    throw new Error('Gemma API key is required for auto-captions.');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(GEMMA_API_KEY);
  const modelId = await resolveGemmaModelId();
  const model = genAI.getGenerativeModel({ model: modelId });

  // Convert blob to base64
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const prompt = `Transcribe this audio and return ONLY valid JSON with word-level timestamps in this exact format:
{
  "captions": [
    {
      "words": [
        {"word": "Hello", "start": 0.0, "end": 0.5},
        {"word": "world", "start": 0.5, "end": 1.0}
      ],
      "start": 0.0,
      "end": 1.0
    }
  ]
}
Make sure to break down the transcription into logical phrases (up to 5-7 words per caption block). Do not return markdown. Just the raw JSON object.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: blob.type || 'audio/webm',
        data: base64Data
      }
    }
  ]);

  const text = result.response.text();
  
  try {
    const clean = text.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error('Failed to parse Gemma transcription JSON:', text);
    throw new Error('Failed to parse transcription response.');
  }
}

// ═══════════════════════════════════════
// Reel Analyzer & Viral Breakdown
// ═══════════════════════════════════════

export async function analyzeReel(urlOrName, frames) {
  // Call Supabase Edge Function (unless forced Gemma-only)
  if (!GEMMA_ONLY && isSupabaseConfigured()) {
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
            body: JSON.stringify({ action: 'analyze_reel', urlOrName, frames }),
          }
        );
        if (response.ok) {
          return await response.json();
        } else {
          const err = await response.json();
          throw new Error(err.error || 'Failed to analyze reel');
        }
      }
    } catch (e) {
      console.warn('Edge function failed, trying fallback:', e);
    }
  }
  
  // Fallback: direct Gemma API with env var key
  if (GEMMA_API_KEY) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMMA_API_KEY);
    const candidates = await getGemmaCandidates();
    const preferred = await resolveGemmaModelId();
    const ordered = [preferred, ...candidates.filter((c) => c !== preferred)].filter(Boolean);
    
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

    let lastErr = null;
    for (const modelId of ordered) {
      try {
        const model = await getModel(genAI, modelId);
        const result = await withRetries(
          () =>
            model.generateContent({
              contents: [{ role: 'user', parts }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          { retries: 2, baseDelayMs: 450 }
        );
        const text = result.response.text();
        const parsed = parseJsonObject(text);
        if (parsed) return parsed;

        const repairPrompt = `Convert this output into VALID JSON object only (no markdown, no prose).
Required keys:
overallScore, scores, viralPrediction, topFix, hook3SecondAnalysis, bestMoment.

Original output:
${text}`;

        const repaired = await withRetries(
          () =>
            model.generateContent({
              contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          { retries: 2, baseDelayMs: 450 }
        );
        const repairedParsed = parseJsonObject(repaired.response.text());
        if (repairedParsed) return repairedParsed;
      } catch (e) {
        lastErr = e;
        if (!isTransientGemmaError(e)) break;
      }
    }
    console.error('Gemma direct call failed:', lastErr);
    throw new Error('Failed to analyze reel locally: ' + (lastErr?.message || 'Unknown error'));
  }

  throw new Error("AI is not configured. Please set up a Gemma API key or configure Supabase to use this feature.");
}

export async function getViralBreakdown(url) {
  // Call Supabase Edge Function (unless forced Gemma-only)
  if (!GEMMA_ONLY && isSupabaseConfigured()) {
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
            body: JSON.stringify({ action: 'viral_breakdown', url }),
          }
        );
        if (response.ok) {
          return await response.json();
        } else {
          const err = await response.json();
          throw new Error(err.error || 'Failed to get viral breakdown');
        }
      }
    } catch (e) {
      console.warn('Edge function failed, trying fallback:', e);
    }
  }
  
  // Fallback: direct Gemma API with env var key
  if (GEMMA_API_KEY) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMMA_API_KEY);
    const candidates = await getGemmaCandidates();
    const preferred = await resolveGemmaModelId();
    const ordered = [preferred, ...candidates.filter((c) => c !== preferred)].filter(Boolean);

    let metadata = '';
    try {
      const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
      if (pageRes.ok) {
        const html = await pageRes.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
        if (titleMatch) metadata += `Title: ${titleMatch[1]}\n`;
        if (descMatch) metadata += `Description: ${descMatch[1]}\n`;
      }
    } catch (e) {}

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

    let lastErr = null;
    for (const modelId of ordered) {
      try {
        const model = await getModel(genAI, modelId);
        const result = await withRetries(
          () =>
            model.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          { retries: 2, baseDelayMs: 450 }
        );
        const text = result.response.text();
        const parsed = parseJsonObject(text);
        if (parsed) return parsed;

        const repairPrompt = `Convert this output into VALID JSON object only (no markdown, no prose).
Required keys:
hookType, hookTiming, cutRhythm, averageClipLength, audioAnalysis, emotionalArc, textStrategy, whatToSteal, templateSteps.

Original output:
${text}`;

        const repaired = await withRetries(
          () =>
            model.generateContent({
              contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          { retries: 2, baseDelayMs: 450 }
        );
        const repairedParsed = parseJsonObject(repaired.response.text());
        if (repairedParsed) return repairedParsed;
      } catch (e) {
        lastErr = e;
        if (!isTransientGemmaError(e)) break;
      }
    }
    console.error('Gemma direct call failed:', lastErr);
    throw new Error('Failed to get viral breakdown locally: ' + (lastErr?.message || 'Unknown error'));
  }

  throw new Error("AI is not configured. Please set up a Gemma API key or configure Supabase to use this feature.");
}
