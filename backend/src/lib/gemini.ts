/**
 * Shared Gemini 2.5 Flash client
 * Uses @google/generative-ai directly — no Genkit schema enforcement.
 * Robust: retry × 3 with exponential backoff, safe JSON parsing, never throws.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY || '';
if (!apiKey) {
  console.error('[Gemini] ⚠️  GOOGLE_GENAI_API_KEY is not set! All AI features will use fallback responses.');
} else {
  console.log('[Gemini] ✓ API key loaded (first 8 chars):', apiKey.substring(0, 8) + '...');
}

const genAI = new GoogleGenerativeAI(apiKey);

const MODEL = 'gemini-2.5-flash';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Safe JSON parser — 4 strategies before returning null.
 */
export function safeParseJSON<T = Record<string, unknown>>(raw: string): T | null {
  // 1. Direct parse
  try { return JSON.parse(raw) as T; } catch (_) {}

  // 2. Strip markdown code fences (```json ... ```) and parse
  try {
    const stripped = raw
      .replace(/^[\s\S]*?```(?:json)?\s*/i, '')  // remove everything up to and including ```json
      .replace(/\s*```[\s\S]*$/, '')              // remove closing ``` and everything after
      .trim();
    if (stripped.startsWith('{') || stripped.startsWith('[')) {
      return JSON.parse(stripped) as T;
    }
  } catch (_) {}

  // 3. Extract first { ... } block with greedy match
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
  } catch (_) {}

  // 4. Give up
  return null;
}

/**
 * Call Gemini 2.5 Flash and return raw text.
 * Retries up to 3 times on 503 / 429 / overloaded errors.
 * Throws on non-retryable errors after exhausting attempts.
 */
export async function callGemini(
  prompt: string,
  options: { temperature?: number; maxOutputTokens?: number } = {}
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      // Disable thinking mode for gemini-2.5-flash so all tokens go to output
      // (thinking consumes the token budget internally leaving very short responses)
      ...({ thinkingConfig: { thinkingBudget: 0 } } as object),
    },
  });

  const BACKOFF = [1000, 2000, 4000];

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      console.log(`[Gemini] ✓ attempt=${attempt} chars=${text.length}`);
      return text;
    } catch (err) {
      const msg = (err as Error).message || String(err);
      const isRetryable =
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('overloaded') ||
        msg.includes('high demand') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('quota');

      console.warn(`[Gemini] attempt=${attempt} failed: ${msg.substring(0, 300)}`);

      if (isRetryable && attempt < 3) {
        console.log(`[Gemini] retrying in ${BACKOFF[attempt - 1]}ms...`);
        await sleep(BACKOFF[attempt - 1]);
      } else {
        throw err; // let caller handle with fallback
      }
    }
  }

  throw new Error('[Gemini] All 3 attempts failed');
}

/**
 * Call Gemini and safely parse JSON from the response.
 * Returns parsed object or null if parsing fails — never throws.
 */
export async function callGeminiJSON<T = Record<string, unknown>>(
  prompt: string,
  options: { temperature?: number; maxOutputTokens?: number } = {}
): Promise<T | null> {
  try {
    const text = await callGemini(prompt, options);
    const parsed = safeParseJSON<T>(text);
    if (!parsed) {
      console.warn('[Gemini] Response received but JSON parsing failed. Raw response (first 400 chars):');
      console.warn(text.substring(0, 400));
    }
    return parsed;
  } catch (err) {
    console.error('[Gemini] callGeminiJSON failed:', (err as Error).message?.substring(0, 300));
    return null;
  }
}
