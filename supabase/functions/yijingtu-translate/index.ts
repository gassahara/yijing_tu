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
// ENVIRONMENT
// ============================================================================

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

// ============================================================================
// LOGGING
// ============================================================================

function log(msg: string): void {
  console.log(`[yijingtu-translate] ${msg}`);
}

// ============================================================================
// DEEPSEEK API
// ============================================================================

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 3000,
  temperature: number = 0.15
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    stream: false,
    max_tokens: maxTokens,
    temperature,
    response_format: { type: "json_object" }
  };

  const res = await fetch(DEEPSEEK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek returned empty content");
  }
  return content;
}

// ============================================================================
// LANGUAGE HELPERS
// ============================================================================

function langName(code: string): string {
  const names: Record<string, string> = {
    es: "Spanish",
    it: "Italian",
    zh: "Chinese (Traditional characters, classical register)"
  };
  return names[code] || code;
}

// ============================================================================
// ECHO DETECTION
//
// Returns true if the translated output is identical (or nearly so) to the
// English source, indicating the model failed to translate.
// ============================================================================

function detectEcho(source: Record<string, any>, translated: Record<string, any>): boolean {
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

  let totalFields = 0;
  let echoFields = 0;

  for (const key of Object.keys(source)) {
    const src = source[key];
    const tgt = translated[key];

    if (typeof src === "string" && src.length > 20 && typeof tgt === "string") {
      totalFields++;
      if (normalize(src) === normalize(tgt)) echoFields++;
    } else if (Array.isArray(src) && Array.isArray(tgt) && src.length > 0) {
      // Check first element of array
      const srcFirst = String(src[0]);
      const tgtFirst = String(tgt[0]);
      if (srcFirst.length > 20) {
        totalFields++;
        if (normalize(srcFirst) === normalize(tgtFirst)) echoFields++;
      }
    }
  }

  if (totalFields === 0) return false;
  // If more than 60% of fields are unchanged, it's an echo
  return echoFields / totalFields > 0.6;
}

// ============================================================================
// SYSTEM PROMPTS — one per content category
// ============================================================================

const SYSTEM_PROMPTS: Record<string, string> = {

  // ── Classical: Judgment, Image, Line texts from Zhou Yi ──────────────────
  classical: `You are a scholarly translator of classical Chinese divination texts.
Your task is to translate Yi Jing (I Ching) classical passages — the Judgment (Tuan Ci), Image Commentary (Xiang Ci), and individual Line Texts (Yao Ci) — from English into the target language.

RULES:
1. Preserve the terse, oracular register of Zhou Yi. These are ancient ritual proclamations, not modern prose.
2. Do NOT paraphrase, summarize, or add explanatory words not present in the source.
3. Preserve syntactic parallelism and rhythmic structure where possible.
4. Keep proper nouns (names of rulers, places, animals) untranslated or transliterated if no canonical equivalent exists.
5. Do NOT add markdown formatting.
6. Return ONLY a valid JSON object with exactly the same keys as the input. No commentary outside the JSON.`,

  // ── Interpretation sections: celestial, elements, houtou, core, analysis ─
  interpretation: `You are a translator of Chinese metaphysical scholarship.
Your task is to translate Yi Jing interpretation content — BaZi astrology, Five Elements analysis, Heavenly Stems and Earthly Branches — from English into the target language.

RULES:
1. Preserve Chinese romanised terminology in its established form: BaZi, Wu Xing, Wuxing, Yin/Yang, Qi, etc.
2. TRANSLATE English descriptive names: hexagram names (e.g. "Nourishment" → target language), trigram names (e.g. "Mountain", "Thunder" → target language), element names (e.g. "Fire", "Water" → target language).
3. Translate faithfully and completely. Do NOT summarize. Every paragraph must be rendered.
4. Maintain paragraph structure exactly as in the source.
5. Do NOT add markdown formatting (no **bold**, no *italic*, no # headings).
6. The first sentence of a technical section often functions as a title — preserve this structural role.
7. Return ONLY a valid JSON object with exactly the same keys as the input. No commentary outside the JSON.`,

  // ── Moving Lines: Yao Ci commentaries ────────────────────────────────────
  lines: `You are a translator specialising in the Yao Ci (Line Texts) tradition of Zhou Yi commentary.
Your task is to translate Yi Jing moving-line commentaries from English into the target language.

RULES:
1. Each line text is an independent oracular statement — translate each one completely.
2. Preserve the symbolic, allusive register (e.g. "the dragon submerges", "the crane calls from the shadows").
3. Do NOT domesticate or rationalise symbolic imagery into plain speech.
4. Maintain the same six-element array structure.
5. Do NOT add markdown formatting.
6. Return ONLY a valid JSON object with exactly the same keys as the input. The "lineTexts" field must remain an array of 6 strings. No commentary outside the JSON.`,

  // ── Remedies: Fulu, Feng Shui, medicine ──────────────────────────────────
  remedies: `You are a translator of Daoist ritual and traditional Chinese medicine texts.
Your task is to translate remedy prescriptions — including Fulu talisman instructions, Feng Shui adjustments, and herbal medicine guidance — from English into the target language.

RULES:
1. Use a reverent, instructional register appropriate for sacred ritual texts.
2. Preserve all ritual action verbs precisely (burn, bury, hang, write, recite, etc.).
3. Keep all Chinese technical terms (Fulu, Fuzhou, Bagua, etc.) in their established form.
4. Translate ritual incantations literally — do NOT interpret or re-interpret their meaning.
5. Preserve array structure: remedies is an array of remedy objects; translate each field within each object.
6. Do NOT add markdown formatting.
7. Return ONLY a valid JSON object with exactly the same keys as the input. No commentary outside the JSON.`,

  // ── Bagua Medicine ───────────────────────────────────────────────────────
  baguaMedicine: `You are a translator of traditional Chinese cosmological medicine texts.
Your task is to translate Bagua-based health diagnostics and treatment recommendations from English into the target language.

RULES:
1. Preserve all anatomical terms and Chinese medicine concepts (Qi, meridians, organ systems, Five Elements correspondences).
2. Translate both descriptive and prescriptive text faithfully and completely.
3. Keep Chinese proper terms (Bagua, Gua, Zang-Fu, etc.) in their established form.
4. Do NOT add markdown formatting.
5. Return ONLY a valid JSON object with exactly the same keys as the input. No commentary outside the JSON.`,

  // ── MD-LDL Layout Language ────────────────────────────────────────────────
  mdldl: `You are a translator of Yi Jing interpretation content formatted in MD-LDL (Markdown Layout Definition Language).
Your task is to translate the CONTENT while preserving the MD-LDL structure exactly.

MD-LDL STRUCTURE (DO NOT MODIFY):
- @page {lang:XX layout:tabbed} - Page directive
- ## {id:NAME type:TYPE icon:EMOJI order:N} - Section headers
- ### {type:TYPE priority:N} - Layer headers  
- @text {class:CLASS} - Component directive
- @badges - Badge component
- @quote {source:NAME} - Quote component
- @card {style:STYLE} - Card component
- header:[text] - Card header
- footer:[text] - Card footer
- --- - Card body separator

RULES:
1. PRESERVE ALL MD-LDL syntax: @directives, ## section headers, ### layer headers, {properties}, [content placeholders]
2. Translate ONLY the text inside [brackets] and after headers/labels
3. Keep all property names, IDs, types, class names in English
4. Keep emoji icons as-is
5. Keep the @page {lang:XX...} line but change XX to target language code
6. Preserve all line breaks and structure exactly
7. Return the complete MD-LDL document with translated content`
};

// ============================================================================
// SECTION → PROMPT CATEGORY MAPPING
// ============================================================================

function getPromptCategory(section: string): string {
  if (section === "classical") return "classical";
  if (section === "lines") return "lines";
  if (section === "remedies") return "remedies";
  if (section === "baguaMedicine" || section === "bagua-medicine") return "baguaMedicine";
  // celestial, elements, houtou, core, analysis, advice, all interpretation sections
  return "interpretation";
}

// ============================================================================
// TOKEN BUDGETS — generous to avoid truncation
// ============================================================================

function getTokenBudget(section: string): number {
  const budgets: Record<string, number> = {
    classical: 2500,
    lines: 3000,
    remedies: 4000,
    baguaMedicine: 3000,
    "bagua-medicine": 3000,
    celestial: 4000,
    elements: 4000,
    houtou: 3000,
    core: 4500,
    analysis: 3500,
    advice: 3000
  };
  return budgets[section] ?? 3500;
}

// ============================================================================
// JSON CLEANING & PARSING UTILITIES (inlined from _shared/json-utils.ts)
// ============================================================================

/**
 * Recursively sanitize AI response content:
 * - Strip HTML tags, decode entities
 * - Remove markdown formatting artifacts
 * - Clean up AI leakage patterns (e.g. "Titled technical section...")
 */
function sanitizeResponseContent(obj: any): any {
  if (typeof obj === 'string') {
    let text = obj;
    text = text
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>\s*<div/gi, '\n')
      .replace(/<\/li>\s*<li/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ');
    const leakagePatterns = [
      /^Titled technical section.*?(?=\w)/i,
      /^Titled accessible section.*?(?=\w)/i,
      /^Titled section.*?(?=\w)/i,
      /^This section contains.*?(?=\w)/i,
      /^JSON output:?/i,
      /^Output format:?/i
    ];
    leakagePatterns.forEach(regex => { text = text.replace(regex, ''); });
    text = text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/^\s*#+\s*/gm, '')
      .replace(/`(.+?)`/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '')
      .trim();
    text = text.replace(/\n{3,}/g, '\n\n');
    return text;
  }
  if (Array.isArray(obj)) return obj.map(sanitizeResponseContent);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) result[key] = sanitizeResponseContent(obj[key]);
    return result;
  }
  return obj;
}

/**
 * Strip JS-style comments (// and /* ... *​/) from a string,
 * preserving content inside double-quoted strings.
 */
function stripComments(json: string): string {
  let result = '';
  let inString = false;
  let inSingleComment = false;
  let inMultiComment = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const nextChar = json[i + 1];
    if (escaped) { if (!inSingleComment && !inMultiComment) result += char; escaped = false; continue; }
    if (char === '\\' && inString) { if (!inSingleComment && !inMultiComment) result += char; escaped = true; continue; }
    if (char === '"' && !inSingleComment && !inMultiComment) { inString = !inString; result += char; continue; }
    if (!inString) {
      if (!inSingleComment && !inMultiComment && char === '/' && nextChar === '/') { inSingleComment = true; i++; continue; }
      if (inSingleComment && char === '\n') { inSingleComment = false; result += char; continue; }
      if (!inSingleComment && !inMultiComment && char === '/' && nextChar === '*') { inMultiComment = true; i++; continue; }
      if (inMultiComment && char === '*' && nextChar === '/') { inMultiComment = false; i++; continue; }
    }
    if (!inSingleComment && !inMultiComment) result += char;
  }
  return result;
}

/**
 * Escape raw newlines, tabs, and control characters inside JSON strings.
 * Only tracks double-quote delimited strings.
 */
function fixUnescapedCharsInStrings(json: string): string {
  const chars: string[] = [];
  let inString = false;
  let i = 0;
  while (i < json.length) {
    const ch = json[i];
    if (!inString) {
      if (ch === '"') { inString = true; chars.push(ch); } else { chars.push(ch); }
      i++;
    } else {
      if (ch === '\\') {
        chars.push(ch);
        if (i + 1 < json.length) { chars.push(json[i + 1]); i += 2; } else { i++; }
      } else if (ch === '"') { inString = false; chars.push(ch); i++; }
      else if (ch === '\n') { chars.push('\\', 'n'); i++; }
      else if (ch === '\r') { i++; }
      else if (ch === '\t') { chars.push('\\', 't'); i++; }
      else if (ch.charCodeAt(0) < 0x20) { i++; }
      else { chars.push(ch); i++; }
    }
  }
  return chars.join('');
}

/**
 * Robust JSON parser with multiple recovery strategies:
 * 1. Direct JSON.parse
 * 2. Single-quote → double-quote fixing
 * 3. Unclosed brace/bracket repair
 * 4. Truncation repair + brace closing
 *
 * Uses correct stack-based brace matching that only tracks " quotes
 * (not ' or `) and decrements depth before checking for zero.
 *
 * @param text - Raw text potentially containing JSON (from AI responses, JS files, etc.)
 * @param fallbackField - If set, wraps unparseable text in { [fallbackField]: text }
 */
function cleanAndParseJSON(text: string, fallbackField?: string): any {
  if (!text) return fallbackField ? { [fallbackField]: "" } : {};
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return fallbackField ? { [fallbackField]: "" } : {};
  let lastBrace = -1;
  let stack = 0;
  let inString = false;
  let escaped = false;
  for (let i = firstBrace; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
      if (char === '{') stack++;
      if (char === '}') { stack--; if (stack === 0) { lastBrace = i; break; } }
    }
  }
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else if (!fallbackField) {
    if (text.includes('<div') || text.includes('Titled')) {
      return { error: "Invalid JSON", content: sanitizeResponseContent(text) };
    }
  }
  cleaned = stripComments(cleaned);
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  cleaned = cleaned.replace(/}\s*{/g, '},{');
  cleaned = cleaned.replace(/]\s*{/g, '],{');
  cleaned = cleaned.replace(/}\s*\[/g, '},[');
  cleaned = fixUnescapedCharsInStrings(cleaned);
  const attempts: Array<() => any> = [
    () => JSON.parse(cleaned),
    () => {
      let fixed = cleaned
        .replace(/'\s*:\s*'/g, '": "').replace(/'\s*:\s*"/g, '": "')
        .replace(/"\s*:\s*'/g, '": "').replace(/{\s*'/g, '{"')
        .replace(/'\s*}/g, '"}').replace(/,\s*'/g, ',"');
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      return JSON.parse(fixed);
    },
    () => {
      const stk: string[] = [];
      let inStr = false, esc = false;
      for (const char of cleaned) {
        if (esc) { esc = false; continue; }
        if (char === '\\') { esc = true; continue; }
        if (char === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (char === '{') stk.push('}');
        else if (char === '[') stk.push(']');
        else if (char === '}' || char === ']') stk.pop();
      }
      return JSON.parse(cleaned + (inStr ? '"' : '') + stk.reverse().join(''));
    },
    () => {
      const truncationPatterns = [
        /,\s*"[^"]*"\s*:\s*"[^"]*$/,
        /,\s*"[^"]*$/,
        /,\s*"[^"]*"\s*:\s*[\d.]+$/,
      ];
      let repaired = cleaned;
      for (const pattern of truncationPatterns) {
        const match = repaired.match(pattern);
        if (match) { repaired = repaired.substring(0, repaired.length - match[0].length); break; }
      }
      const stk: string[] = [];
      let inStr = false, esc = false;
      for (const char of repaired) {
        if (esc) { esc = false; continue; }
        if (char === '\\') { esc = true; continue; }
        if (char === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (char === '{') stk.push('}');
        else if (char === '[') stk.push(']');
        else if (char === '}' || char === ']') stk.pop();
      }
      return JSON.parse(repaired + (inStr ? '"' : '') + stk.reverse().join(''));
    }
  ];
  for (let i = 0; i < attempts.length; i++) {
    try {
      const result = attempts[i]();
      return sanitizeResponseContent(result);
    } catch (_e) { /* try next strategy */ }
  }
  if (fallbackField) return { [fallbackField]: sanitizeResponseContent(text) };
  return { error: "Parse failed", message: "Could not repair JSON", raw_preview: cleaned.substring(0, 200) };
}

// ============================================================================
// MD-LDL TRANSLATION
// ============================================================================

async function translateMDLDL(
  mdlLayout: string,
  targetLang: string,
  hexagramName: string,
  attempt: number = 1
): Promise<string> {
  const target = langName(targetLang);
  const systemPrompt = SYSTEM_PROMPTS['mdldl'];
  
  const userPrompt = `Translate the following MD-LDL content to ${target}.

Hexagram: ${hexagramName || "Unknown"}

MD-LDL Content:
${mdlLayout}

Return ONLY the complete MD-LDL with translated content. Preserve all @directives, ## headers, ### layers, and {properties} exactly. Only translate text inside [brackets] and after headers.`;

  log(`translateMDLDL: lang='${targetLang}' attempt=${attempt}`);

  try {
    const raw = await callDeepSeek(systemPrompt, userPrompt, 2500, 0.15);
    
    // Basic validation - check if it looks like MD-LDL
    const trimmed = raw.trim();
    const hasPage = trimmed.includes('@page');
    const hasSections = (trimmed.match(/##\s*\{/g) || []).length >= 2;
    
    if (!hasPage || !hasSections) {
      log(`MD-LDL validation failed on attempt ${attempt}, retrying...`);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 800));
        return translateMDLDL(mdlLayout, targetLang, hexagramName, attempt + 1);
      }
      log('MD-LDL validation failed after retries, returning original');
      return mdlLayout;
    }
    
    // Update the lang attribute in @page
    return trimmed.replace(/@page\s*\{lang:[a-z]{2}/, `@page {lang:${targetLang}`);
  } catch (error) {
    log(`MD-LDL translation failed: ${error.message}`);
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 800));
      return translateMDLDL(mdlLayout, targetLang, hexagramName, attempt + 1);
    }
    return mdlLayout;
  }
}

// ============================================================================
// CORE TRANSLATION LOGIC
// ============================================================================

async function translateContent(
  content: Record<string, any>,
  targetLang: string,
  section: string,
  hexagramName: string,
  attempt: number = 1
): Promise<Record<string, any>> {
  // SPECIAL HANDLING: If content has mdlLayout, translate it specially
  if (content.mdlLayout && typeof content.mdlLayout === 'string' && content.mdlLayout.length > 100) {
    log(`translateContent: Detected MD-LDL content, using specialized translator`);
    const translatedLayout = await translateMDLDL(content.mdlLayout, targetLang, hexagramName);
    return {
      ...content,
      mdlLayout: translatedLayout,
      mdlParsed: undefined // Clear parsed cache since content changed
    };
  }

  const category = getPromptCategory(section);
  const systemPrompt = SYSTEM_PROMPTS[category];
  const isEnglish = targetLang === 'en';
  const target = isEnglish ? 'English (formatting only)' : langName(targetLang);
  const budget = getTokenBudget(section);

  const userPrompt = isEnglish 
    ? `Format and beautify the following I Ching content. Keep all text in English, but improve readability with proper paragraph structure, consistent styling, and clear formatting.

Hexagram: ${hexagramName || "Unknown"}
Section: ${section}

Content (JSON):
${JSON.stringify(content, null, 2)}

Return ONLY a valid JSON object with exactly the same keys, with all text values formatted in English. Apply proper paragraph breaks and consistent styling.`
    : `Translate the following I Ching content to ${target}.

Hexagram: ${hexagramName || "Unknown"}
Section: ${section}

Content (JSON):
${JSON.stringify(content, null, 2)}

Return ONLY a valid JSON object with exactly the same keys, with all text values translated to ${target}.`;

  log(`translateContent: section='${section}' lang='${targetLang}' budget=${budget} attempt=${attempt}`);

  const raw = await callDeepSeek(systemPrompt, userPrompt, budget, 0.15);

  // Use the shared repair pipeline — handles markdown fences, truncation, bad escapes, etc.
  const parseResult = cleanAndParseJSON(raw);
  if (parseResult.error) {
    log(`JSON parse failed on attempt ${attempt}: ${parseResult.message}`);
    if (attempt < 2) {
      log("Retrying translation...");
      await new Promise(r => setTimeout(r, 800));
      return translateContent(content, targetLang, section, hexagramName, attempt + 1);
    }
    log("Giving up, returning original content");
    return content;
  }
  const parsed: Record<string, any> = parseResult;

  // Echo detection
  if (detectEcho(content, parsed)) {
    log(`Echo detected for section '${section}' to ${targetLang} on attempt ${attempt}`);
    if (attempt < 2) {
      log("Retrying with reinforced prompt...");
      await new Promise(r => setTimeout(r, 800));
      return translateContent(content, targetLang, section, hexagramName, attempt + 1);
    }
    log("Echo persists after retry, returning original");
    return content;
  }

  // Ensure all original keys are present (fill missing with original)
  let filledCount = 0;
  for (const key of Object.keys(content)) {
    if (parsed[key] === undefined || parsed[key] === null) {
      parsed[key] = content[key];
      filledCount++;
    }
  }
  if (filledCount > 0) {
    log(`${filledCount} keys missing from translation, filled with originals`);
  }

  return parsed;
}

// ============================================================================
// HANDLERS
// ============================================================================

// POST /translate
// Body: { content: {...}, targetLang: 'es'|'it'|'zh', section: string, hexagramName?: string }
// Response: { translated: {...} }
async function handleTranslate(body: any, requestId: string): Promise<Response> {
  const { content, targetLang, section, hexagramName } = body;

  if (!content || typeof content !== "object") {
    return errorResponse(400, "Missing or invalid 'content' field", requestId);
  }
  if (!targetLang || !["en", "es", "it", "zh"].includes(targetLang)) {
    return errorResponse(400, `Invalid 'targetLang': must be en, es, it, or zh`, requestId);
  }
  if (!section || typeof section !== "string") {
    return errorResponse(400, "Missing 'section' field", requestId);
  }

  // ALL languages including English go through the API for formatting/styling
  const translated = await translateContent(content, targetLang, section, hexagramName || "");

  return new Response(
    JSON.stringify({ success: true, requestId, translated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /translate-all
// Body: { sections: { sectionName: {...}, ... }, targetLang, hexagramName? }
// Response: { translated: { sectionName: {...}, ... } }
// Translates multiple sections in parallel.
async function handleTranslateAll(body: any, requestId: string): Promise<Response> {
  const { sections, targetLang, hexagramName } = body;

  if (!sections || typeof sections !== "object") {
    return errorResponse(400, "Missing or invalid 'sections' field", requestId);
  }
  if (!targetLang || !["en", "es", "it", "zh"].includes(targetLang)) {
    return errorResponse(400, `Invalid 'targetLang': must be en, es, it, or zh`, requestId);
  }

  const sectionEntries = Object.entries(sections) as [string, Record<string, any>][];
  log(`translate-all: ${sectionEntries.length} sections to ${targetLang}`);

  // For English, just return as-is (formatting only)
  if (targetLang === 'en') {
    return new Response(
      JSON.stringify({ success: true, requestId, translated: sections }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Translate all sections in parallel (DeepSeek can handle concurrent calls)
  const results = await Promise.allSettled(
    sectionEntries.map(([sectionName, content]) =>
      translateContent(content, targetLang, sectionName, hexagramName || "")
        .then(translated => ({ sectionName, translated }))
    )
  );

  const translated: Record<string, any> = {};
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const sectionName = sectionEntries[i][0];
    if (result.status === "fulfilled") {
      translated[sectionName] = result.value.translated;
    } else {
      log(`Section '${sectionName}' failed: ${result.reason}`);
      // Fallback to original on failure
      translated[sectionName] = sections[sectionName];
    }
  }

  return new Response(
    JSON.stringify({ success: true, requestId, translated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /translate-text
// Body: { texts: string[], targetLang, context?: string }
// Response: { translatedTexts: string[] }
// Batch-translate an array of short UI strings (labels, headers, terms).
async function handleTranslateText(body: any, requestId: string): Promise<Response> {
  const { texts, targetLang, context } = body;

  if (!Array.isArray(texts) || texts.length === 0) {
    return errorResponse(400, "Missing or empty 'texts' array", requestId);
  }
  if (!targetLang || !["en", "es", "it", "zh"].includes(targetLang)) {
    return errorResponse(400, `Invalid 'targetLang': must be en, es, it, or zh`, requestId);
  }

  const target = langName(targetLang);
  log(`translate-text: ${texts.length} items to ${targetLang}`);

  // For English, return texts as-is (formatting only)
  if (targetLang === 'en') {
    return new Response(
      JSON.stringify({ success: true, requestId, translatedTexts: texts }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const systemPrompt = `You are a translator for a Chinese metaphysical application UI.
Translate short labels, headers, and technical terms from English into ${target}.
${context ? `Context: ${context}` : ""}

RULES:
1. Preserve Chinese characters (漢字), Pinyin romanisations, compass directions, and numeric values exactly as given.
2. Only translate the English words/phrases; do not alter non-English content.
3. Keep translations concise — these are UI labels, not prose.
4. Return ONLY a valid JSON object: { "translations": ["translated1", "translated2", ...] }
5. The output array MUST have exactly the same length as the input array, in the same order.`;

  const userPrompt = `Translate these ${texts.length} UI strings to ${target}:
${JSON.stringify(texts)}`;

  try {
    const raw = await callDeepSeek(systemPrompt, userPrompt, Math.max(2000, texts.length * 30), 0.1);
    const parsed = cleanAndParseJSON(raw);
    const translatedTexts: string[] = parsed.translations || [];

    // Validate length matches — fall back to originals for any missing entries
    const result: string[] = texts.map((original: string, i: number) =>
      (translatedTexts[i] && translatedTexts[i].trim().length > 0) ? translatedTexts[i] : original
    );

    return new Response(
      JSON.stringify({ success: true, requestId, translatedTexts: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    log(`translate-text error: ${err.message}`);
    return errorResponse(500, err.message || "Translation failed", requestId);
  }
}

// POST /remedies-translate
// Body: { remedies: [...], targetLang, hexagramName? }
// Response: { translated: [...] }
// Specialized handler for the remedies array structure.
async function handleRemediesTranslate(body: any, requestId: string): Promise<Response> {
  const { remedies, targetLang, hexagramName } = body;

  if (!Array.isArray(remedies)) {
    return errorResponse(400, "Missing or invalid 'remedies' array", requestId);
  }
  if (!targetLang || !["en", "es", "it", "zh"].includes(targetLang)) {
    return errorResponse(400, `Invalid 'targetLang': must be en, es, it, or zh`, requestId);
  }

  log(`remedies-translate: ${remedies.length} remedies to ${targetLang}`);

  // For English, return as-is (formatting only)
  if (targetLang === 'en') {
    return new Response(
      JSON.stringify({ success: true, requestId, translated: remedies }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Translate the remedies array as a single batch to preserve relational context
  const contentWrapper = { remedies };
  const translated = await translateContent(
    contentWrapper,
    targetLang,
    "remedies",
    hexagramName || ""
  );

  const translatedRemedies = translated.remedies ?? remedies;

  return new Response(
    JSON.stringify({ success: true, requestId, translated: translatedRemedies }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================================
// FORMAT ENDPOINT (Layout formatting without translation)
// ============================================================================

// POST /format
// Body: { content: {...}, section: string, lang?: string }
// Response: { formatted: {...} }
async function handleFormat(body: any, requestId: string): Promise<Response> {
  const { content, section, lang = 'en' } = body;

  if (!content || typeof content !== "object") {
    return errorResponse(400, "Missing or invalid 'content' field", requestId);
  }
  if (!section || typeof section !== "string") {
    return errorResponse(400, "Missing 'section' field", requestId);
  }

  log(`format: section='${section}' lang='${lang}'`);

  // Call AI to format/beautify the content
  const formatted = await formatContent(content, section, lang);

  return new Response(
    JSON.stringify({ success: true, requestId, formatted }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function formatContent(
  content: Record<string, any>,
  section: string,
  lang: string,
  attempt: number = 1
): Promise<Record<string, any>> {
  const budget = getTokenBudget(section);

  const systemPrompt = `ROLE: Professional text formatter for I Ching content.

Your task is to format and beautify the provided text while keeping it in the SAME language.
Do NOT translate - only improve layout, paragraph structure, and readability.

FORMATTING RULES:
1. Keep ALL text in the original language (${lang})
2. Apply proper paragraph breaks (2-4 sentences per paragraph)
3. Remove excessive whitespace and normalize spacing
4. Maintain section prefixes like "CELESTIAL:", "ELEMENTS:", "ANALYSIS:", "ADVICE:"
5. Preserve all technical terms, names, and special vocabulary
6. Ensure consistent styling throughout

Return ONLY valid JSON with the same keys as input.`;

  const userPrompt = `Format the following I Ching content for better readability.
Keep the text in ${lang} language - do NOT translate.

Section: ${section}

Content (JSON):
${JSON.stringify(content, null, 2)}

Return ONLY the formatted JSON object with the same field names and structure.`;

  try {
    const raw = await callDeepSeek(systemPrompt, userPrompt, budget, 0.1);
    
    // Use the shared repair pipeline
    const parseResult = cleanAndParseJSON(raw);
    if (parseResult.error) {
      log(`Format JSON parse failed on attempt ${attempt}: ${parseResult.message}`);
      if (attempt < 2) {
        log("Retrying format...");
        await new Promise(r => setTimeout(r, 500));
        return formatContent(content, section, lang, attempt + 1);
      }
      log("Giving up, returning original content");
      return content;
    }
    
    return parseResult as Record<string, any>;
  } catch (err) {
    log(`Format error: ${err.message}`);
    return content;
  }
}

// ============================================================================
// ERROR HELPER
// ============================================================================

function errorResponse(status: number, message: string, requestId: string): Response {
  return new Response(
    JSON.stringify({ success: false, requestId, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================================
// ROUTER
// ============================================================================

serve(async (req: Request) => {
  const requestId = req.headers.get("X-Request-ID") || crypto.randomUUID();

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed", requestId);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body", requestId);
  }

  const url = new URL(req.url);
  // Support both path-based routing and action field in body
  const pathSegment = url.pathname.split("/").pop() || "";
  const action = body.action || pathSegment;

  log(`Request: action='${action}' requestId='${requestId}'`);

  try {
    switch (action) {
      case "translate":
      case "yijingtu-translate":
        return await handleTranslate(body, requestId);

      case "translate-all":
        return await handleTranslateAll(body, requestId);

      case "translate-text":
        return await handleTranslateText(body, requestId);

      case "remedies-translate":
        return await handleRemediesTranslate(body, requestId);

      case "format":
        return await handleFormat(body, requestId);

      default:
        // Default to single-section translate (backward compat with existing callers
        // that POST directly to the function URL without an action path segment)
        if (body.content && body.targetLang && body.section) {
          return await handleTranslate(body, requestId);
        }
        return errorResponse(404, `Unknown action: '${action}'. Use: translate, translate-all, remedies-translate, format`, requestId);
    }
  } catch (err: any) {
    log(`Unhandled error: ${err.message}`);
    return errorResponse(500, err.message || "Internal error", requestId);
  }
});
