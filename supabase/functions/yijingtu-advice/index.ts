import { serve } from "https://deno.land/std@0.168.0/http/server.ts";


// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400"
};

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const API_VERSION = "v2.1-advice";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

// ============================================================================
// LOGGING UTILITY
// ============================================================================

function log(level: number, message: string): void {
  const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
  const levelName = levels[level] || 'LOG';
  console.log(`[${levelName}] ${message}`);
}

// ============================================================================
// AI CALL UTILITIES
// ============================================================================

async function callAI(prompt: string, maxTokens: number, options: any = {}): Promise<string> {
  const { systemPrompt, temperature = 0.7 } = options;

  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const messages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
    : [{ role: "user", content: prompt }];

  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI call failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ============================================================================
// HEXAGRAM DATA FETCHING
// ============================================================================

const HEXAGRAMS_BUCKET_URL = "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/hexagrams.json";
let HEXAGRAM_CACHE: any = null;
let HEXAGRAM_CACHE_TIME = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getHexagramData(): Promise<any> {
  const now = Date.now();
  if (HEXAGRAM_CACHE && (now - HEXAGRAM_CACHE_TIME) < CACHE_TTL_MS) {
    return HEXAGRAM_CACHE;
  }

  try {
    const response = await fetch(`${HEXAGRAMS_BUCKET_URL}?v=${now}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    HEXAGRAM_CACHE = data;
    HEXAGRAM_CACHE_TIME = now;
    return data;
  } catch (error: any) {
    log(1, `[HEXAGRAM] Fetch failed: ${error.message}`);
    return HEXAGRAM_CACHE || { hexagrams: [] };
  }
}

async function getHexagram(number: number): Promise<any> {
  const data = await getHexagramData();
  const hexagrams = Array.isArray(data) ? data : Object.values(data.hexagrams || {});
  return hexagrams.find((h: any) => h.number === number) || null;
}

// ============================================================================
// ADVICE GENERATION
// ============================================================================

interface AdviceRequest {
  hexagram: {
    number: number;
    name_en?: string;
    name_zh?: string;
  };
  question: string;
  lines: Array<{ isChanging: boolean; value: number }>;
  previousContext?: string;
}

async function generateAdvice(request: AdviceRequest): Promise<{ advice: string; quotedReferences: string[] }> {
  log(3, `[ADVICE] Generating classical-grounded advice...`);

  const { hexagram, question, lines, previousContext } = request;
  const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean) as number[];

  // Fetch classical texts
  let hexData: any = null;
  try {
    hexData = await getHexagram(hexagram.number);
  } catch (e) {
    log(1, `[ADVICE] Could not fetch hexagram data: ${e}`);
  }

  const classicalContext = [
    hexData?.judgment_en ? `JUDGMENT: "${hexData.judgment_en}"` : "",
    hexData?.image?.image_en ? `IMAGE: "${hexData.image.image_en}"` : "",
    hexData?.commentary_desc ? `COMMENTARY: ${hexData.commentary_desc}` : "",
    ...changingLines.map((ln: number) => hexData?.lines_en?.[ln - 1]
      ? `LINE ${ln}: "${hexData.lines_en[ln - 1]}"` : "")
  ].filter(Boolean).join('\n');

  const systemPrompt = `ROLE: Yi Jing textual scholar extracting practical orientations

VERIFICATION CHECKLIST - Verify before output:
✓ Did I cite classical source for EACH of the 4-6 orientations?
✓ Are all orientations grounded in Judgment, Image, or Line texts?
✓ Did I begin each orientation with quoted classical passage?
✓ NO motivational clichés ("trust yourself", "be bold", "take action")?
✓ NO invented guidance beyond provided classical texts?
✓ Tone is scholarly/interpretive, not life-coaching?

RULES:
1. ALL guidance must be derived explicitly from the classical texts provided (Judgment, Image, moving Line texts).
2. Begin each orientation by citing the specific classical passage it is derived from, in quotation marks, followed by a brief explication of its relevance.
3. Do NOT invent guidance that is not supported by the classical corpus.
4. Provide 4-6 orientations. Each must identify its classical source text.
5. Do NOT use: motivational language, life-coaching clichés, "take action", "be bold", "trust yourself".
6. Plain text only — no markdown, no bullet symbols. Separate orientations with a blank line.
7. The tone is scholarly and interpretive, not pastoral or prescriptive.`;

  const userPrompt = `Q: "${question}"

HEX: #${hexagram.number} ${hexagram.name_zh||''}/${hexagram.name_en||''}
MOVING: [${changingLines.join(',')||'none'}]

CLASSICAL:
${classicalContext || "(Texts unavailable)"}

CONTEXT:
${previousContext || "None"}

Provide 4-6 classically-grounded orientations. Quote passage first, then explain.`;

  try {
    const response = await callAI(userPrompt, 2000, {
      systemPrompt,
      temperature: 0.2
    });

    let advice = response.trim();

    // Handle JSON-wrapped responses
    if (advice.startsWith('{') && advice.endsWith('}')) {
      try {
        const parsed = JSON.parse(advice);
        advice = parsed.advice || parsed.content || advice;
      } catch {
        // Not valid JSON, use as-is
      }
    }

    log(3, `[ADVICE] Generated (${advice.length} chars)`);

    // Extract quoted references
    const quotedReferences: string[] = [];
    const quoteMatches = advice.match(/"([^"]+)"/g);
    if (quoteMatches) {
      quoteMatches.forEach((match: string) => {
        const clean = match.replace(/"/g, '').trim();
        if (clean.length > 10 && !quotedReferences.includes(clean)) {
          quotedReferences.push(clean);
        }
      });
    }

    return { advice, quotedReferences };
  } catch (error: any) {
    log(0, `[ADVICE] Generation failed: ${error.message}`);
    return {
      advice: "Advice generation encountered an error. Please review the technical analysis for guidance.",
      quotedReferences: []
    };
  }
}

// ============================================================================
// TRANSLATION PASS
// ============================================================================

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
  zh: 'Chinese'
};

async function translateAdvice(
  advice: string,
  quotedReferences: string[],
  targetLang: string,
  hexagramContext: { number: number; name: string }
): Promise<{ advice: string; quotedReferences: string[] }> {
  const targetLangName = LANG_NAMES[targetLang] || targetLang;
  log(3, `[TRANSLATE] Translating advice to ${targetLangName}...`);

  const systemPrompt = `You are a professional translator and Yi Jing scholar.
Translate the provided advice from English to ${targetLangName}.

STRICT RULES:
1. FAITHFUL TRANSLATION: Do NOT summarize. Every orientation must be fully translated.
2. PRESERVE STRUCTURE: Maintain the citation format (quotation marks around classical passages).
3. SCHOLARLY TONE: Keep the scholarly, interpretive tone. Do NOT make it casual or motivational.
4. CLASSICAL TERMS: Keep Chinese terms in their original characters (e.g., 卦名, 文言).
5. Return ONLY the translated advice text, no JSON wrapper.`;

  const userPrompt = `HEXAGRAM: ${hexagramContext.number} - ${hexagramContext.name}
TARGET LANGUAGE: ${targetLangName}

ADVICE TO TRANSLATE:
${advice}

QUOTED REFERENCES (for context):
${quotedReferences.map((r, i) => `${i + 1}. "${r}"`).join('\n')}

Translate the advice completely. Return only the translated text.`;

  try {
    const translated = await callAI(userPrompt, 2500, {
      systemPrompt,
      temperature: 0.2
    });

    log(3, `[TRANSLATE] Completed (${translated.length} chars)`);

    return {
      advice: translated.trim(),
      quotedReferences // Keep original references
    };
  } catch (error: any) {
    log(1, `[TRANSLATE] Failed: ${error.message}`);
    return { advice, quotedReferences }; // Fallback to original
  }
}

async function translateAdviceBatch(
  enAdvice: { advice: string; quotedReferences: string[] },
  targetLangs: string[],
  hexagramContext: { number: number; name: string }
): Promise<Record<string, { advice: string; quotedReferences: string[] }>> {
  const result: Record<string, { advice: string; quotedReferences: string[] }> = {
    en: enAdvice
  };

  // Translate sequentially to avoid rate limits
  for (const lang of targetLangs) {
    if (lang === 'en') continue;
    try {
      const translated = await translateAdvice(
        enAdvice.advice,
        enAdvice.quotedReferences,
        lang,
        hexagramContext
      );
      result[lang] = translated;
    } catch (e) {
      log(1, `[TRANSLATE] Failed for ${lang}: ${e}`);
      result[lang] = enAdvice; // Fallback
    }
  }

  return result;
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

function createSuccessResponse(data: any, requestId: string, startTime: number) {
  return {
    success: true,
    data,
    meta: {
      version: API_VERSION,
      timestamp: new Date().toISOString(),
      requestId,
      durationMs: Date.now() - startTime
    }
  };
}

function createErrorResponse(message: string, code: string, requestId: string, startTime: number) {
  return {
    success: false,
    error: { message, code },
    meta: {
      version: API_VERSION,
      timestamp: new Date().toISOString(),
      requestId,
      durationMs: Date.now() - startTime
    }
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "").split("/").pop() || "";

    let body: any = {};
    if (req.method === "POST") {
      body = await req.json().catch(() => ({}));
    }

    let result: any;

    switch (path) {
      // Generate advice
      case "advice":
      case "generate": {
        const { hexagram, question, lines, previousContext, translate } = body;

        if (!hexagram || !question) {
          throw new Error("hexagram and question are required");
        }

        // Generate English advice
        const enAdvice = await generateAdvice({
          hexagram,
          question,
          lines: lines || [],
          previousContext
        });

        // Translation pass if requested
        if (translate && Array.isArray(translate) && translate.length > 0) {
          const translations = await translateAdviceBatch(
            enAdvice,
            translate,
            { number: hexagram.number, name: hexagram.name_en || '' }
          );
          // Flatten: return { advice: string, quotedReferences: [], translations: { lang: { advice, quotedReferences } } }
          result = {
            advice: enAdvice.advice,
            quotedReferences: enAdvice.quotedReferences,
            translations
          };
        } else {
          // Simple case: return flat { advice: string, quotedReferences: [] }
          result = {
            advice: enAdvice.advice,
            quotedReferences: enAdvice.quotedReferences
          };
        }
        break;
      }

      // Translate existing advice
      case "advice-translate":
      case "translate": {
        const { advice, quotedReferences, targetLang, hexagram } = body;

        if (!advice || !targetLang) {
          throw new Error("advice and targetLang are required");
        }

        result = await translateAdvice(
          advice,
          quotedReferences || [],
          targetLang,
          hexagram || { number: 0, name: '' }
        );
        break;
      }

      // Root endpoint
      case "yijingtu-advice":
      case "":
        return new Response(
          JSON.stringify(createSuccessResponse({
            message: "Yijingtu Advice API",
            version: API_VERSION,
            endpoints: {
              "POST /advice": "Generate classically-grounded advice (with optional translation pass)",
              "POST /advice-translate": "Translate existing advice to target language"
            },
            features: {
              classicalGrounding: "Advice derived from Judgment, Image, and Line texts",
              citationFormat: "Each orientation cites its classical source",
              translationPass: "Request multiple translations in one call via 'translate' array"
            }
          }, requestId, startTime)),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      default:
        throw new Error(`Unknown endpoint: ${path}`);
    }

    return new Response(
      JSON.stringify(createSuccessResponse(result, requestId, startTime)),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    log(0, `[ERROR] ${error.message}`);

    return new Response(
      JSON.stringify(createErrorResponse(
        error.message,
        "ADVICE_ERROR",
        requestId,
        startTime
      )),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
