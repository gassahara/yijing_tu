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
const API_VERSION = "v2.1-remedies";

const REQUEST_TIMEOUT_MS = 45000;
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

// ============================================================================
// JSON CLEANING & PARSING UTILITIES
// ============================================================================

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

function parseJSModuleObject(content: string, varName: string): any | null {
  try {
    return JSON.parse(content);
  } catch { /* not JSON, try JS extraction */ }
  const pattern = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*`);
  const startMatch = content.match(pattern);
  if (startMatch) {
    const afterAssignment = content.substring(startMatch.index! + startMatch[0].length);
    const parsed = cleanAndParseJSON(afterAssignment);
    if (parsed && !parsed.error && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      return parsed;
    }
  }
  const parsed = cleanAndParseJSON(content);
  if (parsed && !parsed.error && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
    return parsed;
  }
  return null;
}

// ============================================================================
// LOGGING UTILITY
// ============================================================================

function log(level: number, message: string): void {
  const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
  const levelName = levels[level] || 'LOG';
  console.log(`[${levelName}] ${message}`);
}

// ============================================================================
// DAOIST REMEDIES DATABASE
// ============================================================================

interface FuluEntry {
  id: string;
  name: { zh: string; en: string; pinyin: string };
  description: string;
  source: {
    primary: string;
    textTitle: string;
    references: string[];
    scholarCitation: string;
  };
  structure: {
    type: string;
    elements: string[];
    purpose: string;
    instructions?: string;
  };
  usage: string[];
  verified: boolean;
  image?: string | string[];
  images?: Array<{
    description: string;
    source: string;
    url: string;
    date: string;
    catalogNumber: string;
    credit: string;
    note?: string;
  }>;
  hexagrams: number[];
  elements: string[];
  bazi_patterns: string[];
  purpose: string;
  purpose_zh: string;
  sealChars: string[];
  incantation: {
    zh: string;
    pinyin: string;
    en: string;
    es: string;
    it: string;
    hasFuzhouText?: boolean;
    fuzhouName?: string;
    fuzhouNameEn?: string;
    fuzhouPurpose?: string;
  };
  bottomRows: string[][];
  trigram_associations: string[];
  remedyType?: 'fulu' | 'fengshui' | 'medicine';
  application?: string;
  alchemicalContext?: string;
  instructions?: string;
  visualData?: any;
  charStyle?: string;
  sigilInstructions?: any[];
  visualGrid?: string[];
  layoutInstructions?: any;
}

const DAOIST_REMEDIES_DB_URL = "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/daoist_remedies_db.js";
let FULU_DATABASE: FuluEntry[] = [];

async function loadFuluDatabase(): Promise<FuluEntry[]> {
  if (FULU_DATABASE.length > 0) return FULU_DATABASE;

  try {
    log(3, `[FULU_DB] Loading from external URL...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(DAOIST_REMEDIES_DB_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/javascript, application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const content = await response.text();
    log(3, `[FULU_DB] Fetched ${content.length} chars, content-type: ${response.headers.get('content-type')}`);
    // Use shared parseJSModuleObject which handles both pure JSON
    // and JS module format (const DAOIST_REMEDIES_DB = {...};)
    const dbData = parseJSModuleObject(content, "DAOIST_REMEDIES_DB");
    if (!dbData) {
      throw new Error("Could not parse DAOIST_REMEDIES_DB from fetched content");
    }
    log(3, `[FULU_DB] Parsed successfully. Keys: ${Object.keys(dbData).join(', ')}`);

    const entries: FuluEntry[] = [];
    if (dbData.fulu && Array.isArray(dbData.fulu)) {
      entries.push(...dbData.fulu.map((e: any) => ({ ...e, remedyType: 'fulu' as const })));
    }
    if (dbData.fengshui && Array.isArray(dbData.fengshui)) {
      entries.push(...dbData.fengshui.map((e: any) => ({ ...e, remedyType: 'fengshui' as const })));
    }
    if (dbData.medicine && Array.isArray(dbData.medicine)) {
      entries.push(...dbData.medicine.map((e: any) => ({ ...e, remedyType: 'medicine' as const })));
    }

    if (entries.length === 0) {
      log(1, `[FULU_DB] WARNING: Parsed DB but found 0 entries. Keys in dbData: ${Object.keys(dbData).join(', ')}`);
    }

    FULU_DATABASE = entries;
    log(3, `[FULU_DB] Loaded ${entries.length} entries (fulu: ${entries.filter(e => e.remedyType === 'fulu').length}, fengshui: ${entries.filter(e => e.remedyType === 'fengshui').length}, medicine: ${entries.filter(e => e.remedyType === 'medicine').length})`);
    return entries;
  } catch (error: any) {
    log(0, `[FULU_DB] Load failed: ${error.message}`);
    // FALLBACK: Return hardcoded minimal remedies so the function never returns empty
    log(2, `[FULU_DB] Using hardcoded fallback remedies`);
    return getFallbackRemedies();
  }
}

// Hardcoded fallback remedies when database is inaccessible
function getFallbackRemedies(): FuluEntry[] {
  return [
    {
      id: "fulu_taiping",
      name: { zh: "太平符", en: "Great Peace Talisman", pinyin: "Taiping Fu" },
      description: "One of the most ancient and widely documented Daoist talismans. It represents the primordial condensation of the 'Great Peace' (Taiping) celestial breath, used for restoring primordial harmony and stabilizing the cosmic order within a space.",
      source: { primary: "Zhengtong Daozang (正統道藏)", textTitle: "Taiping Fu (太平符)", references: ["CT 390", "CT 547"] },
      structure: { type: "composite_symbol", elements: ["Double characters", "Celestial Canopy", "Central Pillar"], instructions: "Place this talisman in the center of your home or sacred space to stabilize energy and promote harmony. Visualize golden light emanating from the characters." },
      usage: ["protection", "stabilization", "five_elements_harmony"],
      verified: true,
      hexagrams: [1, 11, 26, 34, 45, 61],
      elements: ["Heaven", "Earth", "Balance"],
      remedyType: 'fulu'
    },
    {
      id: "fulu_wulei",
      name: { zh: "天師五雷符", en: "Celestial Master's Five Thunders Talisman", pinyin: "Tianshi Wulei Fu" },
      description: "An authoritative talisman from the Zhengyi (Celestial Master) lineage invoking the Five Thunders (Wulei). It commands thunder deities for protection and subjugation of malevolent forces.",
      source: { primary: "Zhengyi Leifa (Orthodox Unity Thunder Rites)", scholarCitation: "Schipper & Verellen (2004)" },
      structure: { type: "thunder_command", elements: ["Cloud Script", "Bagua Header", "Dragon Qi Background"], instructions: "Draw with focused intent, visualizing protective thunder energy. The Bagua header grounds it in cosmic order." },
      usage: ["exorcism", "thunder_magic", "protection", "authority"],
      verified: true,
      hexagrams: [51, 34, 21, 40, 61],
      elements: ["Thunder", "Heaven", "Fire"],
      remedyType: 'fulu'
    },
    {
      id: "fs_qian_position",
      name: { zh: "乾位風水", en: "Heaven (Qian) Position Feng Shui", pinyin: "Qian Wei Fengshui" },
      description: "Feng Shui activation for the Northwest (Qian/Heaven) position. Enhances leadership, authority, and clarity through proper elemental arrangement.",
      source: { primary: "Classical Feng Shui Texts", textTitle: "Eight Mansions Method" },
      structure: { type: "environmental", elements: ["Metal objects", "Circular forms", "White/Gold colors"], instructions: "Place metal objects in the Northwest sector. Use white, gold, or silver colors. Ensure the area is clean and uncluttered to allow Qi flow." },
      usage: ["career", "leadership", "authority", "clarity"],
      verified: true,
      hexagrams: [1, 11, 26, 44],
      elements: ["Metal", "Heaven"],
      remedyType: 'fengshui'
    },
    {
      id: "fs_kun_position",
      name: { zh: "坤位風水", en: "Earth (Kun) Position Feng Shui", pinyin: "Kun Wei Fengshui" },
      description: "Feng Shui activation for the Southwest (Kun/Earth) position. Enhances receptivity, nurturing energy, and stability through earth element enhancement.",
      source: { primary: "Classical Feng Shui Texts", textTitle: "Eight Mansions Method" },
      structure: { type: "environmental", elements: ["Earth/Clay objects", "Square forms", "Yellow/Brown colors"], instructions: "Place earth elements (crystals, stones, pottery) in the Southwest sector. Use yellow, brown, or earth tones. Keep the area stable and grounded." },
      usage: ["relationships", "nurturing", "stability", "receptivity"],
      verified: true,
      hexagrams: [2, 11, 16, 20, 23],
      elements: ["Earth", "Yin"],
      remedyType: 'fengshui'
    }
  ] as FuluEntry[];
}

// ============================================================================
// AI CALL UTILITIES
// ============================================================================

async function callAI(prompt: string, maxTokens: number, options: any = {}): Promise<string> {
  const { systemPrompt, temperature = 0.7, response_mime_type } = options;

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

async function getStructuredInterpretation(
  prompt: string,
  maxTokens: number,
  options: any,
  requiredKeys: string[] = []
): Promise<any> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const content = await callAI(prompt, maxTokens, options);
      const parsed = cleanAndParseJSON(content);

      if (requiredKeys.length > 0) {
        const missing = requiredKeys.filter(k => !parsed[k]);
        if (missing.length > 0) {
          throw new Error(`Missing required keys: ${missing.join(', ')}`);
        }
      }

      return sanitizeResponseContent(parsed);
    } catch (error: any) {
      lastError = error;
      log(1, `[getStructuredInterpretation] Attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw lastError || new Error("Failed to get structured interpretation");
}

// ============================================================================
// TRANSLATION UTILITIES
// ============================================================================

async function translateRemedyContent(
  content: any,
  targetLang: string,
  targetLangName: string,
  context: string
): Promise<any> {
  log(3, `[TRANSLATE] Translating remedy to ${targetLangName}...`);

  const systemPrompt = `ROLE: Professional translator and Daoist scholar

VERIFICATION CHECKLIST - Verify before output:
✓ Did I translate EVERY detail without summarizing?
✓ Did I preserve all Chinese characters (符咒, 八卦 terms)?
✓ Did I keep all pinyin pronunciation guides?
✓ Did I preserve all ritual steps in instructions?
✓ Did I maintain technical alchemical terminology?
✓ Is output valid JSON with same structure as input?

STRICT RULES:
1. FAITHFUL TRANSLATION: Do NOT summarize. Every detail must be translated.
2. TECHNICAL ACCURACY: Preserve all ritual steps, alchemical terms, and Chinese pinyin.
3. Keep Chinese characters (e.g., 符咒 names, 八卦 terms) in their original form.
4. Return ONLY valid JSON with the same structure as input.

FIELDS TO TRANSLATE:
- name: Keep Chinese characters, translate descriptive parts
- description: Full faithful translation
- relevance: Full faithful translation  
- instructions: Full faithful translation (preserve all ritual steps)
- application: Full faithful translation
- alchemicalContext: Full faithful translation
- incantation: Keep Chinese characters, translate pronunciation guides`;

  const userPrompt = `CONTEXT: ${context}

CONTENT TO TRANSLATE:
${JSON.stringify(content, null, 2)}

Return ONLY valid JSON with translated fields.`;

  const translated = await getStructuredInterpretation(userPrompt, 3000, {
    systemPrompt,
    temperature: 0.2
  });

  return translated;
}

// ============================================================================
// REMEDY SELECTION
// ============================================================================

async function selectRemedies(body: any): Promise<any> {
  log(3, `[SELECT] Selecting remedies...`);

  const { question, hexagram, binaryKey, equilibrium, interpretation, recentRemedies } = body;

  if (!question || !hexagram) {
    throw new Error("Question and hexagram are required");
  }

  log(3, `[SELECT] Input: hexagram=${hexagram.number}, question="${question?.substring(0, 50)}..."`);

  let database = await loadFuluDatabase();
  
  // Use fallback if database is empty
  if (database.length === 0) {
    log(2, `[SELECT] Database empty, using hardcoded fallback remedies`);
    database = getFallbackRemedies();
  }
  
  log(3, `[SELECT] Database loaded: ${database.length} entries`);
  const lowerTrigram = binaryKey?.substring(0, 3) || "";
  const upperTrigram = binaryKey?.substring(3, 6) || "";

  const enInterp = interpretation?.en || interpretation || {};
  const analysisText = enInterp.analysis || enInterp.coreColloquial || "";
  const celestialText = enInterp.celestialColloquial || enInterp.celestial || "";
  const combinedContext = `${analysisText} ${celestialText} ${question}`.toLowerCase();

  // Score candidates
  const getScoredCandidates = (typePool: FuluEntry[]) => {
    return typePool.map(entry => {
      let score = 0;
      if (entry.hexagrams?.includes(hexagram.number)) score += 15;
      if (entry.trigram_associations?.includes(upperTrigram)) score += 7;
      if (entry.trigram_associations?.includes(lowerTrigram)) score += 7;

      const keywords = [...(entry.usage || []), entry.purpose || ""].map(k => k.replace(/_/g, ' '));
      keywords.forEach(kw => {
        if (kw.length > 3 && combinedContext.includes(kw.toLowerCase())) score += 6;
      });

      if (entry.verified) score += 4;
      score += Math.random() * 5;

      return { entry, score };
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(s => s.entry);
  };

  const fuluPool = getScoredCandidates(database.filter(e => e.remedyType === 'fulu'));
  const envPool = getScoredCandidates(database.filter(e => e.remedyType !== 'fulu'));

  const slimCatalog = [...fuluPool, ...envPool].map(entry => ({
    id: entry.id,
    name: entry.name?.en || "Unnamed",
    purpose: entry.purpose || "General Balance",
    usage: entry.usage || [],
    remedyType: entry.remedyType
  }));

  // AI selection
  const systemPrompt = `ROLE: Daoist Remedy Selector

VERIFICATION CHECKLIST - Verify before output:
✓ Did I select 2-4 remedies total?
✓ Is at least one remedy a Fulu (talisman) type?
✓ Is at least one remedy environmental (Feng Shui/Medicine)?
✓ Do selected IDs match exactly with provided catalog?
✓ Does each relevance explain hexagram connection specifically?
✓ Are instructions customized to the reading, not generic?

SELECTION CRITERIA:
1. Match remedy purpose to the hexagram's core meaning
2. Match remedy type to the question domain (health, relationship, career, etc.)
3. Balance: at least one Fulu (talisman) and one environmental remedy
4. Prioritize remedies that align with elemental imbalances

OUTPUT FORMAT:
{
  "remedies": [
    {
      "id": "remedy_id_from_catalog",
      "relevance": "2-3 sentence scholarly explanation of why this remedy applies",
      "instructions": "Specific application instructions based on the hexagram reading"
    }
  ]
}`;

  const userPrompt = `HEX: #${hexagram.number} ${hexagram.name_en}
Q: "${question}"
EQUILIBRIUM: ${equilibrium?.balanceState || 'unknown'}
${equilibrium?.elements ? `WUXING: W:${Math.round(equilibrium.elements.wood)} F:${Math.round(equilibrium.elements.fire)} E:${Math.round(equilibrium.elements.earth)} M:${Math.round(equilibrium.elements.metal)} Wa:${Math.round(equilibrium.elements.water)}` : ''}

CATALOG: ${slimCatalog.map((r: any) => `${r.id}:${r.name}[${r.type}]`).join('; ')}

Select 2-4 appropriate remedies with scholarly relevance explanations.`;

  const selection = await getStructuredInterpretation(userPrompt, 2000, {
    systemPrompt,
    temperature: 0.3
  }, ["remedies"]);

  log(3, `[SELECT] AI selected: ${selection.remedies?.length || 0} remedies`);
  if (selection.remedies?.length > 0) {
    log(3, `[SELECT] AI selected IDs: ${selection.remedies.map((r: any) => r.id).join(', ')}`);
  }

  // Enrich with full remedy data — try exact match first, then fuzzy match
  const enrichedRemedies = selection.remedies.map((sel: any) => {
    let entry = database.find(e => e.id === sel.id);

    // Fuzzy match: try case-insensitive, or partial ID match
    if (!entry && sel.id) {
      const selIdLower = sel.id.toLowerCase();
      entry = database.find(e => e.id.toLowerCase() === selIdLower) ||
        database.find(e => e.id.toLowerCase().includes(selIdLower) || selIdLower.includes(e.id.toLowerCase()));
    }

    // Match by name if ID matching failed
    if (!entry && sel.name) {
      const selNameLower = (typeof sel.name === 'string' ? sel.name : sel.name.en || '').toLowerCase();
      if (selNameLower.length > 3) {
        entry = database.find(e => {
          const eName = (e.name?.en || '').toLowerCase();
          return eName === selNameLower || eName.includes(selNameLower) || selNameLower.includes(eName);
        });
      }
    }

    if (!entry) {
      log(2, `[SELECT] Could not find remedy: id=${sel.id}, name=${sel.name || 'unknown'}`);
      return null;
    }

    // Fix: Use AI instructions, but fall back to database instructions if missing
    const dbInstructions = entry.structure?.instructions || entry.application || "";
    const finalInstructions = sel.instructions || dbInstructions || "Apply according to traditional practice.";
    
    return {
      id: entry.id,
      type: entry.remedyType,
      name: entry.name,
      description: entry.description,
      relevance: sel.relevance,
      instructions: finalInstructions,
      application: entry.application || "",
      alchemicalContext: entry.alchemicalContext || "",
      incantation: entry.incantation,
      source: entry.source,
      visualData: entry.visualData,
      images: entry.images
    };
  }).filter(Boolean);

  // Fallback: if AI selection yielded no matches, pick top-scored candidates directly
  log(3, `[SELECT] Checking fallback: enriched=${enrichedRemedies.length}, slimCatalog=${slimCatalog.length}, fuluPool=${fuluPool.length}, envPool=${envPool.length}`);
  
  if (enrichedRemedies.length === 0 && slimCatalog.length > 0) {
    log(2, `[SELECT] AI selection produced 0 matches — using top-scored candidates as fallback`);
    const fallbackPool = [...fuluPool.slice(0, 1), ...envPool.slice(0, 1)];
    for (const entry of fallbackPool) {
      // Fix: Use structure.instructions as fallback for instructions
      const fallbackInstructions = entry.structure?.instructions || entry.application || "Apply according to traditional practice.";
      enrichedRemedies.push({
        id: entry.id,
        type: entry.remedyType,
        name: entry.name,
        description: entry.description,
        relevance: "Selected based on hexagram resonance and elemental alignment.",
        instructions: fallbackInstructions,
        application: entry.application || "",
        alchemicalContext: entry.alchemicalContext || "",
        incantation: entry.incantation,
        source: entry.source,
        visualData: entry.visualData,
        images: entry.images
      });
    }
  }

  log(3, `[SELECT] Returning ${enrichedRemedies.length} enriched remedies`);
  
  // DEBUG: Log first remedy if available
  if (enrichedRemedies.length > 0) {
    log(3, `[SELECT] First remedy: ${enrichedRemedies[0].id}, type: ${enrichedRemedies[0].type}`);
  } else {
    log(1, `[SELECT] WARNING: Returning 0 remedies!`);
  }
  
  return { remedies: enrichedRemedies };
}

// ============================================================================
// REMEDY VERIFICATION
// ============================================================================

async function verifyRemedies(body: any): Promise<any> {
  const { remedies, lang = 'en' } = body;

  if (!remedies) {
    throw new Error("Remedies object is required");
  }

  log(3, `[VERIFY] Verifying remedies...`);

  const targetLang = lang.toLowerCase();
  const langData = remedies[targetLang];

  if (!langData || !langData.remedies) return remedies;

  let needsFix = false;
  langData.remedies.forEach((remedy: any) => {
    if (remedy.relevance?.toLowerCase().includes('unknown') ||
      remedy.relevance?.toLowerCase().includes('seleccionado para equilibrar unknown') ||
      !remedy.relevance ||
      remedy.relevance.length < 20 ||
      remedy.instructions?.toLowerCase().includes('unknown')) {
      needsFix = true;
    }
  });

  if (!needsFix) {
    log(3, `[VERIFY] All remedies passed quality check`);
    return remedies;
  }

  const systemPrompt = `ROLE: Daoist Remedy Verifier

VERIFICATION CHECKLIST - Verify before output:
✓ Did I ONLY fix fields containing "Unknown" or broken placeholders?
✓ Did I preserve detailed instructions (drawing steps, cinnabar usage)?
✓ Did I NOT replace authentic descriptions with generic text?
✓ Is output valid JSON with same structure?

STRICT RULES:
1. DO NOT replace authentic descriptions with generic usage.
2. ONLY replace text containing "Unknown" or clearly broken placeholders.
3. If instructions are detailed (drawing steps, cinnabar usage), KEEP THEM exactly.

Output JSON: { "remedies": [ { "relevance": "...", "instructions": "..." } ] }`;

  const userPrompt = `REMEDIES TO REVIEW:
${JSON.stringify(langData.remedies.map((r: any) => ({
    id: r.id,
    type: r.type,
    name: r.name,
    currentRelevance: r.relevance,
    currentInstructions: r.instructions
  })))}

FIX REQUIREMENTS:
1. Fix ONLY fields containing "Unknown".
2. Keep all detailed ritual/drawing instructions intact.
3. Ensure scholarly tone for relevance descriptions.

Return ONLY the fixed JSON.`;

  try {
    const enhanced = await getStructuredInterpretation(userPrompt, 2000, {
      systemPrompt,
      temperature: 0.2
    });

    if (enhanced.remedies && Array.isArray(enhanced.remedies)) {
      enhanced.remedies.forEach((rev: any, i: number) => {
        if (langData.remedies[i]) {
          const curRel = langData.remedies[i].relevance || "";
          const curInst = langData.remedies[i].instructions || "";

          if (rev.relevance && (curRel.toLowerCase().includes('unknown') || curRel.length < 20)) {
            langData.remedies[i].relevance = rev.relevance;
          }

          if (rev.instructions && (curInst.toLowerCase().includes('unknown') || curInst.length < 20)) {
            if (rev.instructions.length > curInst.length || curInst.toLowerCase().includes('unknown')) {
              langData.remedies[i].instructions = rev.instructions;
            }
          }

          langData.remedies[i].verified = "✓ Verified";
        }
      });
    }
  } catch (e: any) {
    log(1, `[VERIFY] Enhancement failed: ${e.message}`);
  }

  return remedies;
}

// ============================================================================
// BAGUA MEDICINE & FENG SHUI
// ============================================================================

function generateFengShuiDiagram(favorable: string[], unfavorable: string[], instructions?: Record<string, string>): any {
  const directionToTrigram: Record<string, string> = {
    'S': 'Li', 'South': 'Li',
    'SE': 'Xun', 'Southeast': 'Xun',
    'E': 'Zhen', 'East': 'Zhen',
    'NE': 'Gen', 'Northeast': 'Gen',
    'N': 'Kan', 'North': 'Kan',
    'NW': 'Qian', 'Northwest': 'Qian',
    'W': 'Dui', 'West': 'Dui',
    'SW': 'Kun', 'Southwest': 'Kun'
  };

  const highlightCommands: any[] = [];

  favorable.forEach(dir => {
    const trigram = directionToTrigram[dir];
    if (trigram) {
      highlightCommands.push({
        type: "highlight_sector",
        trigram,
        style: {
          fill: "#00FF0040",
          stroke: "#00FF00",
          strokeWidth: 3,
          glow: true,
          glowColor: "#00FF00",
          glowRadius: 20
        },
        label: {
          text: instructions?.[dir] || `${dir} · Favorable`,
          color: "#00FF00",
          fontSize: 12
        }
      });
    }
  });

  unfavorable.forEach(dir => {
    const trigram = directionToTrigram[dir];
    if (trigram) {
      highlightCommands.push({
        type: "highlight_sector",
        trigram,
        style: {
          fill: "#FF000040",
          stroke: "#FF0000",
          strokeWidth: 3,
          glow: true,
          glowColor: "#FF0000",
          glowRadius: 15
        },
        label: {
          text: instructions?.[dir] || `${dir} · Avoid`,
          color: "#FF4444",
          fontSize: 12
        }
      });
    }
  });

  // Return FS-DGL format (Feng Shui Diagram Graphics Language), NOT FDL
  return {
    version: "1.0",
    type: "fengshui_diagram",
    arrangement: "houtian",
    background: "#1a1a2e",
    title: "Feng Shui Guidance",
    lang: "en",
    favorable,
    unfavorable,
    sectors: highlightCommands
  };
}

async function generateBaguaMedicine(body: any): Promise<any> {
  log(3, `[BAGUA] Generating Bagua medicine...`);

  const { interpretation, question, hexagram, lang = 'en' } = body;
  const targetLang = lang;

  const systemPrompt = `ROLE: Master of Bagua Medicine (Ba Gua Zhen Liao) and Classical Feng Shui

VERIFICATION CHECKLIST - Verify before output:
✓ Did I provide specific favorable directions (N, S, E, W, etc.)?
✓ Did I provide specific unfavorable directions?
✓ Did I include Bagua Medicine (herbs, acupoints, or alchemical practices)?
✓ Did I reference Houtian (Later Heaven) Bagua arrangement?
✓ Did I include Alchemical/Neidan context?
✓ Did I avoid referencing user's specific question text?
✓ Is output valid JSON with correct structure?

HOUTIAN (LATER HEAVEN) BAGUA REFERENCE:
Position:     Trigram   Direction   Element   Life Area
Top           Li (離)    South       Fire      Fame/Reputation
Top-Right     Xun (巽)   Southeast   Wood      Wealth/Abundance
Right         Zhen (震)  East        Wood      Family/Health
Bottom-Right  Gen (艮)   Northeast   Earth     Knowledge
Bottom        Kan (坎)   North       Water     Career
Bottom-Left   Qian (乾)  Northwest   Metal     Benefactors
Left          Dui (兌)   West        Metal     Creativity
Top-Left      Kun (坤)   Southwest   Earth     Relationships

CRITICAL REQUIREMENTS:
1. Provide Feng Shui directions (favorable/unfavorable)
2. Suggest specific Bagua Medicine (herbs, acupoints, or alchemical practices)
3. Include Alchemical context (Neidan)
4. Include Houtian Bagua analysis
5. Never reference the user's specific question
6. Return ONLY valid JSON

FORMAT:
{
  "${targetLang}": {
    "fengShui": {
      "favorable": ["S", "SE"],
      "unfavorable": ["N", "NW"],
      "guidance": "Detailed guidance text..."
    },
    "medicine": [
      {
        "name": "Herb or practice name",
        "nameZh": "中文名称",
        "description": "Usage description",
        "application": "How to apply"
      }
    ],
    "alchemical": "Neidan practice guidance",
    "baguaAnalysis": "Houtian Bagua interpretation"
  }
}`;

  const userPrompt = `HEX: #${hexagram?.number} ${hexagram?.name_en}
CONTEXT: ${typeof interpretation?.en === 'string' ? interpretation.en.substring(0, 400) : JSON.stringify(interpretation?.en || {}).slice(0, 400)}

Generate Bagua Medicine and Feng Shui guidance.`;

  const result = await getStructuredInterpretation(userPrompt, 2500, {
    systemPrompt,
    temperature: 0.4
  });

  // Add FS-DGL diagram data
  const fsData = result[targetLang] || result;
  if (fsData.fengShui) {
    fsData.fengShui.diagram = generateFengShuiDiagram(
      fsData.fengShui.favorable || [],
      fsData.fengShui.unfavorable || []
    );
  }

  return result;
}

// ============================================================================
// FULU DRAWING
// ============================================================================

async function generateFuluDrawing(body: any): Promise<any> {
  log(3, `[FULU] Generating fulu drawing...`);

  const { remedyId, hexagram, targetLang = 'en' } = body;

  const database = await loadFuluDatabase();
  const entry = database.find(e => e.id === remedyId);

  if (!entry) {
    throw new Error(`Remedy ${remedyId} not found in database`);
  }

  // Generate FDL (Fulu Drawing Language) format
  const fdl = {
    version: "2.0",
    type: "fulu_seal",
    background: "#0a0a0a",
    title: entry.name?.en || "Daoist Talisman",
    sealName: entry.name,
    purpose: entry.purpose,
    incantation: entry.incantation,
    layers: [
      {
        name: "foundation",
        type: "border_layer",
        commands: [
          { type: "rect", x: 50, y: 50, width: 400, height: 500, stroke: "#FFD700", strokeWidth: 3 },
          { type: "rect", x: 60, y: 60, width: 380, height: 480, stroke: "#FF0000", strokeWidth: 1 }
        ]
      },
      {
        name: "seal_core",
        type: "character_layer",
        commands: (entry.sealChars || []).map((char: string, i: number) => ({
          type: "text",
          x: 250,
          y: 150 + i * 80,
          text: char,
          fontSize: 48,
          color: "#FF0000",
          fontFamily: "Noto Serif SC"
        }))
      },
      {
        name: "incantation",
        type: "text_layer",
        commands: [
          {
            type: "text",
            x: 250,
            y: 520,
            text: entry.incantation?.[targetLang] || entry.incantation?.en || "",
            fontSize: 12,
            color: "#FFD700",
            textAlign: "center"
          }
        ]
      }
    ]
  };

  return {
    fdl,
    remedy: {
      id: entry.id,
      name: entry.name,
      purpose: entry.purpose,
      incantation: entry.incantation
    }
  };
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

    // Parse body for POST requests
    let body: any = {};
    if (req.method === "POST") {
      body = await req.json().catch(() => ({}));
    }

    let result: any;

    switch (path) {
      // Remedy selection
      case "remedies-select":
      case "select":
        result = await selectRemedies(body);
        break;

      // Remedy translation
      case "remedies-translate":
      case "translate": {
        const { remedy, targetLang, targetLangName, context } = body;
        if (!remedy || !targetLang) throw new Error("remedy and targetLang required");

        const toTranslate = {
          name: remedy.name,
          description: remedy.description,
          relevance: remedy.relevance,
          instructions: remedy.instructions,
          application: remedy.application,
          alchemicalContext: remedy.alchemicalContext
        };

        const translated = await translateRemedyContent(toTranslate, targetLang, targetLangName || targetLang, context || "");
        result = { ...remedy, ...translated };
        break;
      }

      // Remedy verification
      case "remedies-verify":
      case "verify":
        result = await verifyRemedies(body);
        break;

      // Bagua medicine & Feng Shui
      case "remedies-bagua":
      case "bagua-medicine":
        result = await generateBaguaMedicine(body);
        break;

      // Fulu drawing
      case "remedies-fulu-draw":
      case "fulu-drawing":
        result = await generateFuluDrawing(body);
        break;

      // Database endpoint
      case "remedies-db":
      case "db": {
        const db = await loadFuluDatabase();
        result = {
          fulu: db.filter(e => e.remedyType === 'fulu'),
          fengshui: db.filter(e => e.remedyType === 'fengshui'),
          medicine: db.filter(e => e.remedyType === 'medicine'),
          _meta: { totalEntries: db.length, dbUrl: DAOIST_REMEDIES_DB_URL }
        };
        break;
      }
      
      // Debug endpoint to check DB connectivity
      case "remedies-db-check":
      case "db-check": {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(DAOIST_REMEDIES_DB_URL, {
            method: 'HEAD',
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          result = {
            dbUrl: DAOIST_REMEDIES_DB_URL,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            accessible: response.ok
          };
        } catch (e: any) {
          result = {
            dbUrl: DAOIST_REMEDIES_DB_URL,
            error: e.message,
            accessible: false
          };
        }
        break;
      }

      // Root endpoint
      case "yijingtu-remedies":
      case "":
        return new Response(
          JSON.stringify(createSuccessResponse({
            message: "Yijingtu Remedies API",
            version: API_VERSION,
            endpoints: {
              "POST /remedies-select": "Select appropriate remedies for a reading",
              "POST /remedies-translate": "Translate remedy content",
              "POST /remedies-verify": "Verify and fix remedy quality issues",
              "POST /remedies-bagua": "Generate Bagua Medicine and Feng Shui",
              "POST /remedies-fulu-draw": "Generate Fulu drawing (FDL format)",
              "GET /remedies-db": "Get full remedies database",
              "GET /remedies-db-check": "Debug: Check database URL accessibility"
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
        "REMEDIES_ERROR",
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
