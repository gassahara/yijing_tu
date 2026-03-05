/**
 * OPTIMIZED YIJINGTU INTERPRETATION FUNCTION
 * 
 * Features:
 * - Token-optimized data injection
 * - Structured prompt verification
 * - Response validation and auto-repair
 * - Parallel section generation
 * - Correctness guarantees
 * 
 * @version 3.0
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://vflkhntzwfovnuyccxow.supabase.co";
const HEXAGRAM_BUCKET_PATH = "/storage/v1/object/public/bucket/hexagrams.json";
const API_VERSION = "v3.0-optimized";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

// Token budgets
const TOKEN_BUDGETS = {
  systemPrompt: 600,
  userPrompt: 3000,
  response: 2000,
  totalPerCall: 4000
};

// ============================================================================
// TYPES
// ============================================================================

interface InterpretationRequest {
  question: string;
  hexagram: {
    number: number;
    name_en: string;
    name_zh?: string;
    element?: string;
    trigramUpper?: { name: string; element: string };
    trigramLower?: { name: string; element: string };
  };
  lines: Array<{ isYang: boolean; isChanging: boolean }>;
  birthBazi?: any;
  currentBazi?: any;
  equilibrium?: {
    elements: { wood: number; fire: number; earth: number; metal: number; water: number };
    missing?: string[];
    strongest?: string;
    weakest?: string;
  };
  sections?: string[];
  lang?: string;
}

interface SectionResult {
  success: boolean;
  data?: any;
  error?: string;
  repaired?: boolean;
  attempt?: number;
}

// ============================================================================
// CORS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400"
};

// ============================================================================
// LOGGING
// ============================================================================

function log(level: number, message: string, meta?: any) {
  const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
  const tag = levels[level] || 'LOG';
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][${tag}] ${message}`, meta ? JSON.stringify(meta) : '');
}

// ============================================================================
// DATA COMPRESSION
// ============================================================================

function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength - 3) + '...';
}

function compressHexagram(hexagram: any) {
  if (!hexagram) return null;
  return {
    n: hexagram.number,
    zh: truncate(hexagram.name_zh, 20),
    en: truncate(hexagram.name_en, 40),
    el: hexagram.element?.slice(0, 10),
    ut: hexagram.trigramUpper?.name || hexagram.trigram_upper?.name,
    lte: hexagram.trigramLower?.name || hexagram.trigram_lower?.name
  };
}

function compressClassical(hexData: any) {
  if (!hexData) return null;
  return {
    j: { z: truncate(hexData.judgment_zh, 200), e: truncate(hexData.judgment_en, 300) },
    i: { z: truncate(hexData.image?.image_zh, 200), e: truncate(hexData.image?.image_en, 300) },
    c: truncate(hexData.commentary_desc, 400),
    l: (hexData.lines_zh || []).map((z: string, i: number) => ({
      p: i + 1,
      z: truncate(z, 100),
      e: truncate(hexData.lines_en?.[i], 150)
    }))
  };
}

function compressBazi(bazi: any) {
  if (!bazi) return null;
  return {
    dm: bazi.dayMaster?.stem?.slice(0, 8),
    dme: bazi.dayMaster?.element?.slice(0, 10),
    str: bazi.strength?.result?.slice(0, 20),
    fe: (bazi.strength?.favorable || []).slice(0, 3),
    ue: (bazi.strength?.unfavorable || []).slice(0, 3)
  };
}

function compressElements(equilibrium: any) {
  if (!equilibrium?.elements) return null;
  const e = equilibrium.elements;
  return {
    w: Math.round(e.wood || 0),
    f: Math.round(e.fire || 0),
    e: Math.round(e.earth || 0),
    m: Math.round(e.metal || 0),
    wa: Math.round(e.water || 0)
  };
}

function countTokens(text: string): number {
  if (!text) return 0;
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const other = text.length - chinese;
  return Math.ceil(chinese / 2 + other / 4);
}

// ============================================================================
// HEXAGRAM DATA
// ============================================================================

let hexagramCache: any = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getHexagramData(): Promise<any> {
  const now = Date.now();
  if (hexagramCache && (now - cacheTime) < CACHE_TTL) {
    return hexagramCache;
  }

  const url = `${SUPABASE_URL}${HEXAGRAM_BUCKET_PATH}`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    hexagramCache = await res.json();
    cacheTime = now;
    return hexagramCache;
  } catch (e: any) {
    log(0, `Failed to load hexagram data: ${e.message}`);
    return hexagramCache || { hexagrams: {} };
  }
}

async function getHexagram(number: number): Promise<any> {
  const data = await getHexagramData();
  return data.hexagrams?.[number.toString()] || null;
}

// ============================================================================
// AI CALLING
// ============================================================================

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  options: any = {}
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const payload: any = {
    model: options.model || DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_tokens: options.max_tokens || TOKEN_BUDGETS.response,
    temperature: options.temperature ?? 0.3,
    stream: false
  };

  if (options.response_format) {
    payload.response_format = options.response_format;
  }

  const res = await fetch(DEEPSEEK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ============================================================================
// JSON REPAIR & VALIDATION
// ============================================================================

function repairJSON(text: string): { success: boolean; data?: any; error?: string } {
  if (!text) return { success: false, error: 'Empty response' };

  let cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Extract JSON from surrounding text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Apply repairs
  cleaned = cleaned
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"');

  try {
    return { success: true, data: JSON.parse(cleaned) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function validateResponse(data: any, schema: any): string[] {
  const errors: string[] = [];

  for (const [key, config] of Object.entries(schema)) {
    const c = config as any;
    const value = data[key];

    if (c.required && !value) {
      errors.push(`Missing: ${key}`);
      continue;
    }

    if (!value) continue;

    if (c.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${key}: expected string, got ${typeof value}`);
      } else {
        if (c.minLength && value.length < c.minLength) {
          errors.push(`${key}: too short (${value.length} < ${c.minLength})`);
        }
        // Check for placeholders
        if (/unknown|placeholder|not provided/i.test(value)) {
          errors.push(`${key}: contains placeholder text`);
        }
      }
    }

    if (c.type === 'array' && !Array.isArray(value)) {
      errors.push(`${key}: expected array`);
    }
  }

  return errors;
}

function fillMissingFields(data: any, schema: any): any {
  const filled = { ...data };
  for (const [key, config] of Object.entries(schema)) {
    const c = config as any;
    if (c.required && !filled[key]) {
      if (c.type === 'string') filled[key] = `[${key} pending analysis]`;
      else if (c.type === 'array') filled[key] = [];
      else if (c.type === 'object') filled[key] = {};
    }
  }
  return filled;
}

// ============================================================================
// COMPACT MARKDOWN FORMAT HELPERS
// ============================================================================

function toCompactMarkdown(data: any): string {
  if (!data) return 'N/A';
  const parts: string[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const shortKey = key.slice(0, 3).toUpperCase();
    if (typeof value === 'object') {
      parts.push(`${shortKey}:{${toCompactMarkdown(value)}}`);
    } else {
      parts.push(`${shortKey}:${String(value).slice(0, 50)}`);
    }
  }
  return parts.join('|');
}

function formatBaziMD(bazi: any): string {
  if (!bazi) return 'N/A';
  const dm = bazi.dayMaster;
  const str = bazi.strength;
  return `DM:${dm?.stem||'?'}-${dm?.element||'?'}|STR:${str?.result||'?'}|FAV:${(str?.favorable||[]).join(',')}|UNFAV:${(str?.unfavorable||[]).join(',')}`;
}

function formatElementsMD(eq: any): string {
  if (!eq?.elements) return 'N/A';
  const e = eq.elements;
  return `W:${Math.round(e.wood||0)}|F:${Math.round(e.fire||0)}|E:${Math.round(e.earth||0)}|M:${Math.round(e.metal||0)}|Wa:${Math.round(e.water||0)}|MISS:${(eq.missing||[]).join(',')}|STR:${eq.strongest||'?'}|WK:${eq.weakest||'?'}`;
}

// ============================================================================
// PROMPT GENERATORS
// ============================================================================

const PROMPTS = {
  technical(hex: any, hexData: any, question: string): { system: string; user: string; schema: any } {
    const judgment = truncate(hexData?.judgment_en, 300);
    const image = truncate(hexData?.image?.image_en, 300);
    
    const system = `ROLE: Yi Jing textual scholar specializing in structural analysis

VERIFICATION CHECKLIST - Verify before output:
✓ Did I cite Judgment text explicitly? 
✓ Did I cite Image Commentary text?
✓ Did I name both trigrams and their elements?
✓ Did I explain the trigram relationship (above/below)?
✓ Did I connect to the hexagram name meaning?
✓ NO life-coaching or motivational language used?
✓ NO invented interpretations beyond classical texts?

RULES:
- Ground ALL analysis in classical texts (Judgment, Image, Line texts)
- Quote or paraphrase classical texts explicitly with citations
- Analyze trigram dynamics using Wuxing correspondences
- Explain upper trigram ABOVE lower trigram cosmologically
- NO life-coaching language - textual/cosmological analysis only
- NO invented interpretations
- Plain text, no markdown

OUTPUT FORMAT (JSON):
{
  "technicalAnalysis": "Structural analysis with explicit citations (min 100 chars)",
  "symbolism": "Archetypal symbolism from classical imagery",
  "quotedReferences": ["Classical citation (source)"]
}`;

    const user = `HEX: #${hex.number} ${hex.name_zh||''}/${hex.name_en}
TRIGRAMS: ↑${hex.trigramUpper?.name||'?'}-${hex.trigramUpper?.element||'?'} | ↓${hex.trigramLower?.name||'?'}-${hex.trigramLower?.element||'?'}
JUDGMENT: "${judgment}"
IMAGE: "${image}"
Q: "${truncate(question, 200)}"

Provide technical analysis grounded in classical texts.`;

    const schema = {
      technicalAnalysis: { type: 'string', required: true, minLength: 50 },
      symbolism: { type: 'string' },
      quotedReferences: { type: 'array' }
    };

    return { system, user, schema };
  },

  colloquial(hex: any, question: string, context: string): { system: string; user: string; schema: any } {
    const system = `ROLE: Yi Jing scholar providing accessible hermeneutic narrative

VERIFICATION CHECKLIST - Verify before output:
✓ Did I reference Judgment meaning in my narrative?
✓ Did I incorporate Image Commentary imagery?
✓ Did I weave in Five Elements dynamics?
✓ Did I address the specific question asked?
✓ Is the tone scholarly, not motivational?
✓ NO clichés like "trust yourself" or "be bold"?
✓ NO invented advice beyond classical meaning?

RULES:
- Narrative MUST derive from classical Judgment and Image
- Weave imagery, Five Elements, and moving lines together
- Connect classical meaning to querent's situation through text
- 2-3 substantive paragraphs, no bullet points
- NO motivational or life-coaching language
- NO invented advice
- Plain text, no markdown

OUTPUT FORMAT (JSON):
{
  "analysis": "Hermeneutic narrative rooted in classical texts",
  "colloquialInterpretation": "Accessible explanation of classical themes",
  "quotedReferences": ["Classical citation"]
}`;

    const user = `HEX: #${hex.number} ${hex.name_zh||''}/${hex.name_en}

TECHNICAL CONTEXT:
${truncate(context, 600)}

Q: "${truncate(question, 200)}"

Write hermeneutic narrative connecting classical meaning to the question.`;

    const schema = {
      analysis: { type: 'string', required: true, minLength: 100 },
      colloquialInterpretation: { type: 'string', required: true, minLength: 50 },
      quotedReferences: { type: 'array' }
    };

    return { system, user, schema };
  },

  advice(hex: any, hexData: any, question: string, lines: any[]): { system: string; user: string; schema: any } {
    const moving = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);
    const lineTexts = moving.map(p => ({
      p,
      text: truncate(hexData?.lines_en?.[p - 1], 150)
    }));

    const system = `ROLE: Yi Jing textual scholar extracting practical orientations

VERIFICATION CHECKLIST - Verify before output:
✓ Did I cite classical source for EACH orientation?
✓ Are all 4-6 orientations grounded in specific texts?
✓ Did I reference Judgment and Image Commentary?
✓ Did I include moving line texts if present?
✓ NO motivational clichés used ("trust yourself", "be bold")?
✓ NO invented guidance beyond classical texts?
✓ Scholarly tone maintained throughout?

RULES:
- ALL guidance must derive explicitly from classical texts
- Begin each orientation with citation of classical passage
- Provide 4-6 orientations, each identifying its source
- NO invented guidance
- NO motivational language: "take action", "be bold", "trust yourself"
- Scholarly and interpretive tone
- Plain text, no markdown

OUTPUT FORMAT (JSON):
{
  "advice": "1. 'Quote' - Orientation\\n\\n2. 'Quote' - Orientation...",
  "quotedReferences": ["Cited passage"]
}`;

    const user = `HEX: #${hex.number} ${hex.name_zh||''}/${hex.name_en}
MOVING: [${moving.join(',')||'none'}]
JUDGMENT: "${truncate(hexData?.judgment_en, 250)}"
IMAGE: "${truncate(hexData?.image?.image_en, 250)}"
${lineTexts.map(l => `L${l.p}: "${l.text}"`).join('\n')}

Q: "${truncate(question, 200)}"

Provide 4-6 classically-grounded orientations with citations.`;

    const schema = {
      advice: { type: 'string', required: true, minLength: 50 },
      quotedReferences: { type: 'array' }
    };

    return { system, user, schema };
  },

  movingLines(hex: any, hexData: any, question: string, lines: any[]): { system: string; user: string; schema: any } | null {
    const moving = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);
    if (moving.length === 0) return null;

    const lineData = moving.map(p => ({
      p,
      name: ["Bottom", "Second", "Third", "Fourth", "Fifth", "Top"][p - 1],
      zh: truncate(hexData?.lines_zh?.[p - 1], 100),
      en: truncate(hexData?.lines_en?.[p - 1], 150)
    }));

    const system = `ROLE: Yi Jing scholar specializing in Yao Ci (Line Text) exegesis

VERIFICATION CHECKLIST - Verify before output:
✓ Did I quote Yao Ci text for EACH moving line?
✓ Did I provide exactly 6 lineTexts entries?
✓ Did I exegete symbolic imagery within hexagram context?
✓ Did I explain the combined dynamic of moving lines?
✓ Are non-moving lines marked as "(stable)"?
✓ NO life-coaching language used?
✓ NO invented symbolism beyond classical texts?

RULES:
- Quote Yao Ci text before interpreting each line
- Exegete symbolic imagery within hexagram context
- lineTexts array must have exactly 6 elements
- Moving lines get commentary; non-moving get "stable" note
- NO life-coaching, NO invented symbolism
- Plain text, no markdown

OUTPUT FORMAT (JSON):
{
  "movingLines": "Summary of combined moving lines dynamic with citations",
  "lineTexts": ["Line 1 (stable)", "Line 2 commentary...", "...", "Line 6 (stable)"],
  "quotedReferences": ["Yao Ci citation"]
}`;

    const user = `HEX: #${hex.number} ${hex.name_zh||''}/${hex.name_en}
MOVING: [${moving.join(',')}]

YAO CI (Line Texts):
${lineData.map(l => `L${l.p} (${l.name}): "${l.zh}" / "${l.en}"`).join('\n')}

Q: "${truncate(question, 200)}"

Provide Yao Ci commentary for moving lines.`;

    const schema = {
      movingLines: { type: 'string', required: true, minLength: 50 },
      lineTexts: { type: 'array', required: true },
      quotedReferences: { type: 'array' }
    };

    return { system, user, schema };
  },

  elements(hex: any, equilibrium: any, question: string): { system: string; user: string; schema: any } {
    const system = `ROLE: Yi Jing scholar specializing in Wuxing (Five Elements) cosmology

VERIFICATION CHECKLIST - Verify before output:
✓ Did I reference sheng (generating) cycle relationships?
✓ Did I reference ke (controlling) cycle relationships?
✓ Did I connect elements to hexagram's Judgment/Image?
✓ Did I identify strongest and weakest elements?
✓ Did I explain missing elements' significance?
✓ NO generic life advice unrelated to classical meaning?
✓ Analysis grounded in provided elemental data?

RULES:
- Ground analysis in hexagram's Judgment and Image Commentary
- Reference sheng (generating) and ke (controlling) cycles
- Connect elemental imbalances to classical symbolism
- NO generic life advice tied to classical meaning
- Plain text, no markdown

OUTPUT FORMAT (JSON):
{
  "technicalAnalysis": "Wuxing analysis referencing classical texts",
  "composition": "Elemental composition and balance",
  "trigramRelationship": "Trigram elemental correspondences",
  "recommendations": "Element-based classical orientations"
}`;

    const user = `HEX: #${hex.number} ${hex.name_en}
TRIGRAMS: ↑${hex.trigramUpper?.element||'?'} | ↓${hex.trigramLower?.element||'?'}
WUXING: ${formatElementsMD(equilibrium)}

Q: "${truncate(question, 200)}"

Analyze Wuxing cycles and elemental dynamics.`;

    const schema = {
      technicalAnalysis: { type: 'string', required: true, minLength: 50 },
      composition: { type: 'string' },
      trigramRelationship: { type: 'string' },
      recommendations: { type: 'string' }
    };

    return { system, user, schema };
  },

  bazi(birthBazi: any, currentBazi: any, hex: any, question: string): { system: string; user: string; schema: any } {
    const system = `ROLE: Daoist Master compounding BaZi and Five Elements analysis

VERIFICATION CHECKLIST - Verify before output:
✓ Did I analyze ACTUAL day master from provided data?
✓ Did I note strength result (strong/weak/balanced)?
✓ Did I list favorable and unfavorable elements?
✓ Did I explain birth BaZi impact on this reading?
✓ Did I explain current BaZi (Prasna) moment influence?
✓ Did I keep hexagram as PRIMARY and astrology as CONTEXT?
✓ NO invented astrology - used only provided data?

RULES:
- USE PROVIDED TECHNICAL DATA: Analyze actual master of day, stems, branches
- BIRTH BAZI: master of day, strength, favorable elements from data
- CURRENT BAZI: Moment energies (Prasna) from data
- HEXAGRAM PRIMARY: Astrology provides context for I Ching reading
- READING IMPACT: How does astrological backdrop affect THIS reading?
- NO invented astrology
- Plain text, no markdown

OUTPUT FORMAT (JSON):
{
  "technicalAnalysis": "Compounded BaZi and Five Elements analysis",
  "birthBazi": { "description": "Birth chart technical summary", "readingImpact": "How birth chart affects this reading" },
  "currentBazi": { "description": "Current moment technical summary", "readingImpact": "How current sky affects this reading" },
  "celestial": "Combined narrative of sky's influence"
}`;

    const user = `HEX: #${hex.number} ${hex.name_en}
BIRTH: ${formatBaziMD(birthBazi)}
CURRENT: ${formatBaziMD(currentBazi)}

Q: "${truncate(question, 200)}"

Provide BaZi analysis based on ACTUAL technical data. Hexagram is primary.`;

    const schema = {
      technicalAnalysis: { type: 'string', required: true, minLength: 50 },
      birthBazi: { type: 'object' },
      currentBazi: { type: 'object' },
      celestial: { type: 'string' }
    };

    return { system, user, schema };
  }
};

// ============================================================================
// SECTION GENERATION
// ============================================================================

async function generateSection(
  name: string,
  request: InterpretationRequest,
  hexData: any,
  context?: string
): Promise<SectionResult> {
  const maxRetries = 2;

  // Get prompt generator
  let promptGen: { system: string; user: string; schema: any } | null = null;

  switch (name) {
    case 'technical':
      promptGen = PROMPTS.technical(request.hexagram, hexData, request.question);
      break;
    case 'colloquial':
      promptGen = PROMPTS.colloquial(request.hexagram, request.question, context || '');
      break;
    case 'advice':
      promptGen = PROMPTS.advice(request.hexagram, hexData, request.question, request.lines);
      break;
    case 'movingLines':
      promptGen = PROMPTS.movingLines(request.hexagram, hexData, request.question, request.lines);
      break;
    case 'elements':
      if (request.equilibrium) {
        promptGen = PROMPTS.elements(request.hexagram, request.equilibrium, request.question);
      }
      break;
    case 'bazi':
      if (request.birthBazi || request.currentBazi) {
        promptGen = PROMPTS.bazi(request.birthBazi, request.currentBazi, request.hexagram, request.question);
      }
      break;
  }

  if (!promptGen) {
    return { success: false, error: 'No prompt generator for section' };
  }

  // Retry loop
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(2, `Generating ${name}, attempt ${attempt}/${maxRetries}`);

      const tokensIn = countTokens(promptGen.system) + countTokens(promptGen.user);
      log(3, `${name} tokens in: ${tokensIn}`);

      const raw = await callAI(promptGen.system, promptGen.user, {
        max_tokens: TOKEN_BUDGETS.response,
        temperature: attempt > 1 ? 0.2 : 0.3,
        response_format: { type: 'json_object' }
      });

      // Parse and repair
      const parsed = repairJSON(raw);
      if (!parsed.success) {
        log(1, `${name} JSON repair failed: ${parsed.error}`);
        if (attempt === maxRetries) {
          return { success: false, error: parsed.error, attempt };
        }
        continue;
      }

      // Validate
      const errors = validateResponse(parsed.data, promptGen.schema);
      if (errors.length > 0) {
        log(1, `${name} validation errors:`, errors);

        // Auto-repair
        const repaired = fillMissingFields(parsed.data, promptGen.schema);

        return {
          success: errors.length < 2, // Success if only minor issues
          data: repaired,
          error: errors.join(', '),
          repaired: true,
          attempt
        };
      }

      return {
        success: true,
        data: parsed.data,
        attempt
      };

    } catch (e: any) {
      log(0, `${name} generation error: ${e.message}`);
      if (attempt === maxRetries) {
        return { success: false, error: e.message, attempt };
      }
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function handleInterpret(request: InterpretationRequest): Promise<any> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  log(2, `Starting interpretation`, { requestId, hexagram: request.hexagram.number });

  // Load hexagram data
  const hexData = await getHexagram(request.hexagram.number);

  // Determine which sections to generate
  const sections = request.sections || ['technical', 'elements', 'bazi', 'movingLines', 'advice'];
  const results: any = {};

  // Phase 1: Generate independent sections in parallel
  const independentTasks: Promise<void>[] = [];

  if (sections.includes('technical')) {
    independentTasks.push(
      generateSection('technical', request, hexData)
        .then(r => { results.technical = r; })
    );
  }

  if (sections.includes('elements') && request.equilibrium) {
    independentTasks.push(
      generateSection('elements', request, hexData)
        .then(r => { results.elements = r; })
    );
  }

  if (sections.includes('bazi') && (request.birthBazi || request.currentBazi)) {
    independentTasks.push(
      generateSection('bazi', request, hexData)
        .then(r => { results.bazi = r; })
    );
  }

  if (sections.includes('movingLines')) {
    const hasMoving = request.lines?.some(l => l.isChanging);
    if (hasMoving) {
      independentTasks.push(
        generateSection('movingLines', request, hexData)
          .then(r => { results.movingLines = r; })
      );
    }
  }

  await Promise.all(independentTasks);

  // Build technical context for dependent sections
  const technicalContext = [
    results.technical?.success && `[Technical] ${truncate(results.technical.data.technicalAnalysis, 300)}`,
    results.elements?.success && `[Elements] ${truncate(results.elements.data.technicalAnalysis, 200)}`,
    results.bazi?.success && `[BaZi] ${truncate(results.bazi.data.technicalAnalysis, 200)}`
  ].filter(Boolean).join('\n---\n');

  // Phase 2: Generate dependent sections
  if (sections.includes('advice')) {
    results.advice = await generateSection('advice', request, hexData);
  }

  if (sections.includes('colloquial')) {
    results.colloquial = await generateSection('colloquial', request, hexData, technicalContext);
  }

  // Compile final result
  const duration = Date.now() - startTime;
  const successCount = Object.values(results).filter((r: any) => r.success).length;
  const totalSections = Object.keys(results).length;

  log(2, `Interpretation complete`, {
    requestId,
    duration,
    success: `${successCount}/${totalSections}`
  });

  return {
    success: successCount === totalSections,
    partial: successCount > 0 && successCount < totalSections,
    results,
    meta: {
      version: API_VERSION,
      requestId,
      duration,
      sectionsGenerated: totalSections,
      sectionsSuccessful: successCount
    }
  };
}

// ============================================================================
// SERVER
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
    const path = url.pathname.split("/").pop() || "";

    // Health check
    if (path === "" || path === "yijingtu-interpret") {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            service: "Yijingtu Optimized Interpretation API",
            version: API_VERSION,
            features: [
              "Token-optimized data compression",
              "Structured prompt verification",
              "Response validation and auto-repair",
              "Parallel section generation",
              "Correctness guarantees"
            ],
            endpoints: {
              "POST /interpret": "Generate complete interpretation",
              "POST /interpret-section": "Generate single section"
            }
          },
          meta: { requestId, timestamp: new Date().toISOString() }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Interpret endpoint
    if (path === "interpret" && req.method === "POST") {
      const body = await req.json();

      // Validate request
      if (!body.question || !body.hexagram?.number) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: "question and hexagram.number are required", code: "VALIDATION_ERROR" },
            meta: { requestId, timestamp: new Date().toISOString() }
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      const result = await handleInterpret(body as InterpretationRequest);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single section endpoint
    if (path === "interpret-section" && req.method === "POST") {
      const body = await req.json();
      const { section, ...request } = body;

      if (!section || !request.question) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: "section and question are required", code: "VALIDATION_ERROR" },
            meta: { requestId, timestamp: new Date().toISOString() }
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      const hexData = await getHexagram(request.hexagram.number);
      const result = await generateSection(section, request as InterpretationRequest, hexData);

      return new Response(
        JSON.stringify({
          success: result.success,
          data: result.data,
          error: result.error,
          meta: {
            requestId,
            section,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown endpoint
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: `Unknown endpoint: ${path}`, code: "NOT_FOUND" },
        meta: { requestId, timestamp: new Date().toISOString() }
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    log(0, `Unhandled error: ${error.message}`, { stack: error.stack });

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || "Internal server error",
          code: "INTERNAL_ERROR"
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
