/**
 * ============================================================
 *  interpret  —  Supabase Edge Function
 * ============================================================
 *
 *  Answers a query based ONLY on the supplied context.
 *  The AI model is strictly instructed NOT to use any prior
 *  knowledge beyond what is explicitly provided in the context.
 *
 *  POST /functions/v1/interpret
 *  ─────────────────────────────
 *  Request body (JSON):
 *  {
 *    "query":      string,                // required — the question / instruction
 *    "context":    {                      // required — at least one key
 *      "url":  "https://…/data.json",    // fetch this URL and use its content
 *      "data": { …any JSON object… },    // use this object directly
 *      "ref":  "hexagrams"|"fengshui"|"fulu"  // named reference resolved server-side
 *    },
 *    "lang":       "en"|"zh"|"es"|"it",  // optional, default "en"
 *    "includeFDL": boolean,              // optional — also produce an FDL diagram
 *    "hexagramId": string|null,          // optional — narrow context to one hexagram
 *    "stream":     boolean               // optional — stream SSE tokens (default false)
 *  }
 *
 *  Response 200 (JSON, when stream=false):
 *  {
 *    "interpretation": {
 *      "text":        string,            // main answer text
 *      "summary":     string,            // 1-sentence TL;DR
 *      "keyPoints":   string[],          // 3-5 bullet points
 *      "lang":        string
 *    },
 *    "fdl":   object | null,             // FDL v2.0 doc, if includeFDL=true
 *    "sources": string[]                 // resolved source identifiers
 *  }
 *
 *  When stream=true the response is text/event-stream.
 *  Each SSE event looks like:  data: {"delta":"token text"}\n\n
 *  Followed by:                data: [DONE]\n\n
 *
 *  Environment variables required:
 *    DEEPSEEK_API_KEY
 *    SUPABASE_URL     (optional, defaults to project URL)
 *
 *  Named context references (ref field):
 *    "hexagrams"  → ${SUPABASE_URL}/storage/v1/object/public/bucket/hexagrams.json
 *    "fengshui"   → ${SUPABASE_URL}/storage/v1/object/public/bucket/daoist_remedies_db.js
 *    "fulu"       → ${SUPABASE_URL}/storage/v1/object/public/bucket/daoist_remedies_db.js
 *
 *  Deploy:
 *    supabase functions deploy interpret
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const DEEPSEEK_API_KEY  = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ??
                          "https://vflkhntzwfovnuyccxow.supabase.co";
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL     = "deepseek-chat";
const FETCH_TIMEOUT     = 15_000;   // ms — for external context fetch
const AI_TIMEOUT        = 90_000;   // ms — for DeepSeek call
const MAX_OUTPUT_TOKENS = 3000;
const MAX_CONTEXT_CHARS = 40_000;   // truncate huge contexts to avoid token overflow

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age":       "86400"
};

// ─────────────────────────────────────────────────────────────────────────────
//  NAMED REFERENCE REGISTRY
//  Maps logical names → Supabase bucket URLs
// ─────────────────────────────────────────────────────────────────────────────

const NAMED_REFS: Record<string, string> = {
  hexagrams: `${SUPABASE_URL}/storage/v1/object/public/bucket/hexagrams.json`,
  fengshui:  `${SUPABASE_URL}/storage/v1/object/public/bucket/daoist_remedies_db.js`,
  fulu:      `${SUPABASE_URL}/storage/v1/object/public/bucket/daoist_remedies_db.js`
};

// ─────────────────────────────────────────────────────────────────────────────
//  CONTEXT RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

interface ContextInput {
  url?:  string;
  data?: unknown;
  ref?:  string;
}

interface ResolvedContext {
  text:    string;   // serialised context ready for AI prompt
  sources: string[]; // human-readable source labels
}

/** Fetch a URL and return its text, with a timeout. */
async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT): Promise<string> {
  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timerId);
  }
}

/**
 * Parse a daoist_remedies_db.js file (which is a JS assignment, not pure JSON)
 * into a plain object.  Handles both:
 *   const DAOIST_REMEDIES_DB = [...];
 *   var DAOIST_REMEDIES_DB = [...];
 */
function parseRemediesDB(jsText: string): unknown {
  // Strip the assignment prefix and any trailing ; or module.exports line
  const match = jsText.match(/(?:const|var|let)\s+DAOIST_REMEDIES_DB\s*=\s*([\s\S]+?)(?:;\s*(?:module|if)\b|;\s*$)/);
  if (match) {
    try { return JSON.parse(match[1]); } catch { /* fall through */ }
  }
  // Try naive eval-safe extraction: find the first [ and match to end
  const start = jsText.indexOf("[");
  const end   = jsText.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try { return JSON.parse(jsText.slice(start, end + 1)); } catch { /* fall through */ }
  }
  // Return raw text — the model can still reason over it
  return jsText;
}

/**
 * Resolve the supplied context descriptor into a single text block
 * that will be inserted into the AI system prompt.
 */
async function resolveContext(ctx: ContextInput, hexagramId?: string): Promise<ResolvedContext> {
  const parts: string[]  = [];
  const sources: string[] = [];

  // ── 1. Named reference ───────────────────────────────────────────────────
  if (ctx.ref) {
    const refName = ctx.ref.toLowerCase().trim();
    const refUrl  = NAMED_REFS[refName];

    if (!refUrl) {
      parts.push(`[WARNING: Unknown reference "${ctx.ref}" — no data loaded]`);
    } else {
      try {
        let rawText = await fetchWithTimeout(refUrl);
        let parsed: unknown;

        if (refName === "hexagrams") {
          parsed = JSON.parse(rawText);

          // Narrow to a single hexagram if hexagramId provided
          if (hexagramId && Array.isArray(parsed)) {
            const id = Number(hexagramId);
            const single = (parsed as Array<{ id: number }>).find(h => h.id === id);
            if (single) {
              parsed = single;
              sources.push(`hexagrams.json — hexagram #${hexagramId}`);
            } else {
              sources.push(`hexagrams.json — all 64 hexagrams`);
            }
          } else {
            sources.push(`hexagrams.json — all 64 hexagrams`);
          }
        } else {
          // daoist_remedies_db.js — filter by type if helpful
          parsed = parseRemediesDB(rawText);
          if (refName === "fengshui" && Array.isArray(parsed)) {
            const fsEntries = (parsed as Array<{ remedyType?: string; id?: string }>)
              .filter(e => e.remedyType === "fengshui" || (e.id && e.id.startsWith("fs_")));
            if (fsEntries.length > 0) {
              parsed = fsEntries;
              sources.push(`daoist_remedies_db.js — ${fsEntries.length} feng-shui entries`);
            } else {
              sources.push(`daoist_remedies_db.js — full database`);
            }
          } else {
            sources.push(`daoist_remedies_db.js — full database`);
          }
        }

        const serialised = JSON.stringify(parsed, null, 2);
        parts.push(`--- REFERENCE: ${refName} ---\n${serialised}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        parts.push(`[ERROR loading reference "${refName}": ${msg}]`);
        sources.push(`${refName} (load failed)`);
      }
    }
  }

  // ── 2. External URL ──────────────────────────────────────────────────────
  if (ctx.url) {
    try {
      const text = await fetchWithTimeout(ctx.url);
      parts.push(`--- EXTERNAL URL: ${ctx.url} ---\n${text}`);
      sources.push(ctx.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      parts.push(`[ERROR fetching URL "${ctx.url}": ${msg}]`);
      sources.push(`${ctx.url} (fetch failed)`);
    }
  }

  // ── 3. Inline JSON data ──────────────────────────────────────────────────
  if (ctx.data !== undefined) {
    const serialised = typeof ctx.data === "string"
      ? ctx.data
      : JSON.stringify(ctx.data, null, 2);
    parts.push(`--- INLINE DATA ---\n${serialised}`);
    sources.push("inline-data");
  }

  if (parts.length === 0) {
    parts.push("[No context provided — answering from general knowledge]");
    sources.push("none");
  }

  // Truncate to avoid token overflow
  let text = parts.join("\n\n");
  if (text.length > MAX_CONTEXT_CHARS) {
    text = text.slice(0, MAX_CONTEXT_CHARS) + "\n\n[…CONTEXT TRUNCATED…]";
  }

  return { text, sources };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(contextText: string, lang: string, includeFDL: boolean): string {
  const fdlBlock = includeFDL ? `
═══ IF THE QUERY CALLS FOR A VISUAL DIAGRAM ════════════════════════════════════
Also include an "fdl" key in your JSON output containing a valid FDL v2.0 diagram.
FDL is a JSON drawing language: { "version":"2.0", "type":"...", "background":"#1a1a2e",
"layers": [ { "name":"...", "commands": [ {type, ...params} ] } ] }
Available command types: rect, circle, arc, path, polygon, line, text,
  taijitu, bagua, trigram, highlight_sector, instruction_marker,
  connection_line, annotation, seal_char, thunder_header, talisman_loop,
  grid, directional_lines.
Coordinates: virtual 1000×1000 canvas. If not applicable set "fdl": null.
` : "";

  return `
You are a Daoist knowledge interpreter.

YOUR ONLY SOURCE OF INFORMATION IS THE CONTEXT BLOCK BELOW.
Do NOT draw on any prior training knowledge beyond what is explicitly present
in the context. If the answer is not in the context, say so clearly.

CONTEXT:
════════════════════════════════════════════════════════════════
${contextText}
════════════════════════════════════════════════════════════════

RESPONSE FORMAT — output EXACTLY this JSON structure, nothing else:
{
  "interpretation": {
    "text":      "Full answer text (markdown OK)",
    "summary":   "One-sentence TL;DR (max 150 chars)",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "lang":      "${lang}"
  },
  "fdl": null${includeFDL ? " or a valid FDL v2.0 object" : ""},
  "sources": ["source label 1", …]
}
${fdlBlock}
STRICT RULES:
1. Output ONLY the JSON object — no markdown fences, no surrounding text.
2. Base ALL claims strictly on the provided context.
3. If the context is insufficient, set interpretation.text = "Insufficient context to answer this query."
4. "keyPoints" must have 3–5 items.
5. Respond in language: ${lang}.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
//  DEEPSEEK HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function stripFences(text: string): string {
  return text.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

async function callDeepSeek(systemPrompt: string, userMessage: string): Promise<string> {
  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), AI_TIMEOUT);

  try {
    const res = await fetch(DEEPSEEK_ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model:           DEFAULT_MODEL,
        temperature:     0.3,
        max_tokens:      MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt  },
          { role: "user",   content: userMessage   }
        ]
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (!data.choices?.length) throw new Error("DeepSeek returned no choices");
    return data.choices[0].message.content as string;

  } finally {
    clearTimeout(timerId);
  }
}

/** Streaming version — yields SSE lines. */
async function* streamDeepSeek(
  systemPrompt: string,
  userMessage:  string
): AsyncGenerator<string> {
  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), AI_TIMEOUT);

  try {
    const res = await fetch(DEEPSEEK_ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model:       DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens:  MAX_OUTPUT_TOKENS,
        stream:      true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage  }
        ]
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek HTTP ${res.status}: ${text}`);
    }

    const reader  = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer    = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines  = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") { yield "data: [DONE]\n\n"; return; }
        try {
          const obj   = JSON.parse(raw);
          const delta = obj.choices?.[0]?.delta?.content ?? "";
          if (delta) yield `data: ${JSON.stringify({ delta })}\n\n`;
        } catch { /* skip malformed line */ }
      }
    }
    yield "data: [DONE]\n\n";

  } finally {
    clearTimeout(timerId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {

  // ── CORS preflight ───────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed — use POST", 405);
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: {
    query:       string;
    context:     ContextInput;
    lang?:       string;
    includeFDL?: boolean;
    hexagramId?: string | null;
    stream?:     boolean;
  };

  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  const {
    query,
    context    = {},
    lang       = "en",
    includeFDL = false,
    hexagramId = null,
    stream     = false
  } = body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return errorResponse("'query' is required and must be a non-empty string");
  }

  if (!context || (typeof context !== "object")) {
    return errorResponse("'context' must be an object with at least one of: url, data, ref");
  }

  if (!DEEPSEEK_API_KEY) {
    return errorResponse("Server configuration error: DEEPSEEK_API_KEY not set", 503);
  }

  // ── Resolve context ──────────────────────────────────────────────────────
  let resolved: ResolvedContext;
  try {
    resolved = await resolveContext(context, hexagramId ?? undefined);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[interpret] Context resolution error:", msg);
    return errorResponse(`Failed to resolve context: ${msg}`, 502);
  }

  // ── Build prompts ────────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(resolved.text, lang, includeFDL);
  const userMessage  = `Query: ${query.trim()}`;

  // ── STREAMING path ───────────────────────────────────────────────────────
  if (stream) {
    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamDeepSeek(systemPrompt, userMessage)) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const errChunk = `data: ${JSON.stringify({ error: msg })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errChunk));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
        ...corsHeaders
      }
    });
  }

  // ── Non-streaming path ───────────────────────────────────────────────────
  let rawContent: string;
  try {
    rawContent = await callDeepSeek(systemPrompt, userMessage);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[interpret] DeepSeek error:", msg);

    if (msg.includes("aborted") || msg.includes("timeout")) {
      return errorResponse("AI request timed out", 504);
    }
    return errorResponse(`AI call failed: ${msg}`, 502);
  }

  // ── Parse model output ───────────────────────────────────────────────────
  let parsed: {
    interpretation?: {
      text?:      string;
      summary?:   string;
      keyPoints?: string[];
      lang?:      string;
    };
    fdl?:     unknown;
    sources?: string[];
  };

  const cleaned = stripFences(rawContent);

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[interpret] JSON parse failed. Raw:", rawContent.slice(0, 500));
    // Graceful degradation — wrap raw text
    parsed = {
      interpretation: {
        text:      rawContent,
        summary:   "See full text above.",
        keyPoints: [],
        lang
      },
      fdl:     null,
      sources: resolved.sources
    };
  }

  // Merge server-resolved sources with any model-reported sources
  const mergedSources = Array.from(new Set([
    ...resolved.sources,
    ...((parsed.sources ?? []) as string[])
  ]));

  // Build final response
  const interpretation = {
    text:      parsed.interpretation?.text      ?? rawContent,
    summary:   parsed.interpretation?.summary   ?? "",
    keyPoints: parsed.interpretation?.keyPoints ?? [],
    lang:      parsed.interpretation?.lang      ?? lang
  };

  const fdlResult = includeFDL
    ? (parsed.fdl && typeof parsed.fdl === "object" ? parsed.fdl : null)
    : null;

  return jsonResponse({
    interpretation,
    fdl:     fdlResult,
    sources: mergedSources
  });
});
