/**
 * ============================================================
 *  fdl-generate  —  Supabase Edge Function
 * ============================================================
 *
 *  Converts a natural-language prompt into a valid FDL v2.0
 *  JSON document by calling the DeepSeek chat-completion API.
 *
 *  POST /functions/v1/fdl-generate
 *  ────────────────────────────────
 *  Request body (JSON):
 *  {
 *    "prompt":  string,          // required — free-form description
 *    "lang":    "en"|"zh"|"es"|"it",  // optional, default "en"
 *    "type":    string,          // optional hint: talisman / fengshui_diagram / …
 *    "context": object|null      // optional extra JSON merged into system prompt
 *  }
 *
 *  Response 200 (JSON):
 *  {
 *    "fdl":         object,   // FDL v2.0 document
 *    "description": string,   // one-sentence human-readable summary
 *    "raw":         string    // raw model output (useful for debugging)
 *  }
 *
 *  Environment variables required:
 *    DEEPSEEK_API_KEY
 *
 *  Deploy:
 *    supabase functions deploy fdl-generate
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL     = "deepseek-chat";
const DEFAULT_TIMEOUT   = 60_000;   // ms
const MAX_OUTPUT_TOKENS = 4096;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age":       "86400"
};

// ─────────────────────────────────────────────────────────────────────────────
//  FDL v2.0 SPECIFICATION INLINED FOR THE SYSTEM PROMPT
//  (The full spec lives in fdl/fdl-spec.js; this is a distilled version
//   suitable for inclusion in an AI system prompt.)
// ─────────────────────────────────────────────────────────────────────────────

const FDL_SYSTEM_PROMPT = `
You are an FDL (Fulu Drawing Language v2.0) diagram generator.
Your ONLY job is to output a valid FDL v2.0 JSON document — nothing else.

═══ FDL v2.0 DOCUMENT SCHEMA ════════════════════════════════════════════

{
  "version":     "2.0",                                // REQUIRED — always "2.0"
  "type":        "talisman|fengshui_diagram|taijitu|bagua_chart|bazi_chart|generic",
  "background":  "#1a1a2e",                            // CSS colour
  "title":       "Human-readable title",               // optional
  "arrangement": "houtian|xiantian",                   // optional — bagua arrangement
  "lang":        "en|zh|es|it",                        // display language
  "layers": [                                          // REQUIRED — back-to-front
    {
      "name":     "background",                        // REQUIRED — unique string
      "type":     "base_layer|highlight_layer|annotation_layer|overlay_layer|talisman_layer|grid_layer|symbol_layer",
      "opacity":  1.0,                                 // 0–1, default 1
      "visible":  true,
      "commands": [ /* Cmd… */ ]                       // REQUIRED
    }
  ]
}

═══ COMMAND CATALOGUE ═══════════════════════════════════════════════════

All x, y, w, h, r, cx, cy are in the VIRTUAL 1000×1000 CANVAS SPACE.
Angles: use RADIANS (except in style.labelAngle which accepts degrees).

── Primitive shapes ─────────────────────────────────────────────────────

{ "type":"rect",    "x":100, "y":100, "w":200, "h":150,
  "style":{ "fill":"#FFD700", "stroke":"#000", "strokeWidth":2, "radius":8 } }

{ "type":"circle",  "cx":500, "cy":500, "r":200,
  "style":{ "fill":"none", "stroke":"#D4AF37", "strokeWidth":3 } }

{ "type":"arc",     "cx":500, "cy":500, "r":180, "startAngle":0, "endAngle":3.14159,
  "style":{ "stroke":"#fff", "strokeWidth":2 } }

{ "type":"path",    "d":"M100,100 L400,200 Z",  /* SVG path */ "style":{…} }

{ "type":"polygon", "points":[[100,100],[200,50],[300,100],[300,200],[100,200]],
  "style":{ "fill":"rgba(255,0,0,0.3)", "stroke":"#F44336" } }

{ "type":"line",    "x1":100, "y1":100, "x2":400, "y2":400,
  "style":{ "stroke":"#fff", "strokeWidth":1.5, "dashArray":[6,4] } }

── Text ─────────────────────────────────────────────────────────────────

{ "type":"text",  "x":500, "y":50, "text":"Title",
  "style":{ "fontSize":32, "fill":"#FFD700", "fontFamily":"serif",
            "textAlign":"center", "textBaseline":"middle" } }

── Daoist symbols ───────────────────────────────────────────────────────

{ "type":"taijitu",  "cx":500, "cy":500, "r":180,
  "borderColor":"#D4AF37" }
  // Draws the full yin-yang circle (diametric S-curve).

{ "type":"bagua",    "cx":500, "cy":500, "r":220,
  "arrangement":"houtian",   // or "xiantian"
  "style":{ "stroke":"#D4AF37", "fill":"transparent",
            "textColor":"#fff", "fontSize":12 } }
  // Renders all 8 trigrams around a central Taijitu.

{ "type":"trigram",  "cx":500, "cy":500, "r":30,
  "name":"Li",            // Li Kan Zhen Xun Dui Qian Kun Gen
  "style":{ "stroke":"#fff", "lineWidth":3, "lineGap":4 } }

── Feng-Shui specific ───────────────────────────────────────────────────

{ "type":"highlight_sector",  "sector":"SE",  "trigram":"Xun",
  "color":"#8BC34A",   "opacity":0.35,   "r":200 }
  // Highlights one bagua sector.  Must follow a "bagua" command.

{ "type":"instruction_marker", "cx":700, "cy":300,
  "icon":"plant|crystal|color|number|element|water|avoid",
  "label":"Lucky bamboo",
  "style":{ "fill":"#4CAF50", "fontSize":11 } }

{ "type":"connection_line",  "from":[500,500], "to":[700,300],
  "style":{ "stroke":"rgba(255,255,255,0.5)", "strokeWidth":1, "dashArray":[4,4] } }

{ "type":"annotation",  "x":500, "y":880,  "text":"Southeast — Wealth sector",
  "style":{ "fill":"#ccc", "fontSize":13, "textAlign":"center" } }

── Talisman specific ────────────────────────────────────────────────────

{ "type":"seal_char",  "cx":500, "cy":200,  "char":"敕",  "size":80,
  "style":{ "fill":"#FF0000", "fontFamily":"'Noto Serif SC',serif" } }

{ "type":"thunder_header",  "cx":500, "cy":100,  "w":300,  "h":80,
  "style":{ "stroke":"#FF0000", "strokeWidth":3 } }

{ "type":"talisman_loop",  "cx":500, "cy":400,  "r":120,
  "chars":["令","符","急","如","律","令"],
  "style":{ "fill":"#FF0000", "fontSize":28 } }

── Structural / grid ────────────────────────────────────────────────────

{ "type":"grid",  "rows":3, "cols":3,  "x":100, "y":100, "w":800, "h":800,
  "style":{ "stroke":"rgba(255,255,255,0.15)", "strokeWidth":1 } }

{ "type":"directional_lines",  "cx":500, "cy":500,  "r":230,
  "count":8,   // 4 or 8 directions
  "style":{ "stroke":"rgba(255,255,255,0.2)", "strokeWidth":1 } }

═══ HOUTIAN (LATER HEAVEN) BAGUA — CANVAS ANGLES ════════════════════════

  Li  /S   → angle −90°  (top centre)         element Fire   color #F44336
  Xun /SE  → angle −45°  (top-right)           element Wood   color #8BC34A
  Zhen/E   → angle   0°  (right)               element Wood   color #4CAF50
  Gen /NE  → angle  45°  (bottom-right)        element Earth  color #FF8A65
  Kan /N   → angle  90°  (bottom centre)       element Water  color #2196F3
  Qian/NW  → angle 135°  (bottom-left)         element Metal  color #B0BEC5
  Dui /W   → angle 180°  (left)                element Metal  color #FFC107
  Kun /SW  → angle −135° (top-left)            element Earth  color #FFCC02

═══ SECTOR → LIFE AREA MAP ══════════════════════════════════════════════

  Li/S  → Fame & Reputation     Xun/SE → Wealth & Abundance
  Zhen/E → Family & Health      Gen/NE → Knowledge & Wisdom
  Kan/N → Career & Life Path    Qian/NW → Helpful People & Travel
  Dui/W → Children & Creativity Kun/SW → Love & Relationships
  Center → Health & Unity

═══ ELEMENT COLOURS ══════════════════════════════════════════════════════

  Fire #F44336  Wood #4CAF50  Water #2196F3  Metal #FFC107  Earth #FFB74D

═══ STRICT OUTPUT RULES ══════════════════════════════════════════════════

1. Output ONLY the JSON object. No markdown fences. No explanatory text.
2. The JSON must parse without errors.
3. For fengshui_diagram: include a "bagua" command on the first layer,
   then highlight_sector + instruction_marker commands on upper layers.
4. For talisman: use seal_char / thunder_header / talisman_loop commands.
5. The "description" field at the top level is a ONE-sentence plain-text
   summary for the UI — max 120 chars.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
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

/** Strip markdown code fences and leading/trailing whitespace. */
function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/,           "")
    .trim();
}

/** Call DeepSeek and return raw string content. */
async function callDeepSeek(
  systemPrompt: string,
  userMessage: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const res = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model:           DEFAULT_MODEL,
        temperature:     opts.temperature ?? 0.4,
        max_tokens:      opts.maxTokens   ?? MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
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

    const data = await res.json();
    if (!data.choices?.length) throw new Error("DeepSeek returned no choices");
    return data.choices[0].message.content as string;

  } finally {
    clearTimeout(timerId);
  }
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

  // ── Parse request body ───────────────────────────────────────────────────
  let body: {
    prompt:      string;
    lang?:       string;
    type?:       string;
    context?:    Record<string, unknown> | null;
  };

  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  const { prompt, lang = "en", type = null, context = null } = body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return errorResponse("'prompt' is required and must be a non-empty string");
  }

  // ── Guard: API key present ───────────────────────────────────────────────
  if (!DEEPSEEK_API_KEY) {
    return errorResponse("Server configuration error: DEEPSEEK_API_KEY not set", 503);
  }

  // ── Build user message ───────────────────────────────────────────────────
  const typeHint    = type    ? `\nDiagram type hint: ${type}`  : "";
  const langHint    = lang    ? `\nOutput language: ${lang}`    : "";
  const contextHint = context
    ? `\nAdditional context (merge into diagram):\n${JSON.stringify(context, null, 2)}`
    : "";

  const userMessage = [
    `Generate an FDL v2.0 JSON document for the following request:`,
    `"${prompt.trim()}"`,
    typeHint,
    langHint,
    contextHint,
    ``,
    `Remember: output ONLY the JSON object — no markdown, no text outside JSON.`,
    `The JSON must include a top-level "description" string field (≤120 chars).`
  ].join("\n").trim();

  // ── Call AI ──────────────────────────────────────────────────────────────
  let rawContent: string;
  try {
    rawContent = await callDeepSeek(FDL_SYSTEM_PROMPT, userMessage);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[fdl-generate] DeepSeek error:", msg);

    if (msg.includes("aborted") || msg.includes("timeout")) {
      return errorResponse("AI request timed out — try a simpler prompt", 504);
    }
    return errorResponse(`AI call failed: ${msg}`, 502);
  }

  // ── Parse FDL JSON ───────────────────────────────────────────────────────
  let fdlDoc: Record<string, unknown>;
  const cleaned = stripFences(rawContent);

  try {
    fdlDoc = JSON.parse(cleaned);
  } catch {
    console.error("[fdl-generate] JSON parse failed. Raw:", rawContent.slice(0, 500));
    return errorResponse(
      "Model returned invalid JSON — try rephrasing your prompt",
      422
    );
  }

  // Basic sanity check
  if (!fdlDoc.layers || !Array.isArray(fdlDoc.layers)) {
    return errorResponse(
      "Model output is not a valid FDL document (missing 'layers' array)",
      422
    );
  }

  // Ensure version field
  if (!fdlDoc.version) fdlDoc.version = "2.0";

  // Extract description (either from model output or synthesise)
  const description =
    typeof fdlDoc.description === "string"
      ? fdlDoc.description
      : `FDL diagram: ${prompt.trim().slice(0, 100)}`;

  // Remove description from the FDL doc itself (it's metadata, not a draw command)
  const { description: _desc, ...fdl } = fdlDoc;

  // ── Respond ──────────────────────────────────────────────────────────────
  return jsonResponse({ fdl, description, raw: rawContent });
});
