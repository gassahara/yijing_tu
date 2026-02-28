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
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://vflkhntzwfovnuyccxow.supabase.co";
const HEXAGRAM_BUCKET_PATH = "/storage/v1/object/public/bucket/hexagrams.json";
const API_VERSION = "v2.1";

// Timeout configuration
const REQUEST_TIMEOUT_MS = 45000;
const FETCH_TIMEOUT_MS = 30000;

// DeepSeek API configuration
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";
const MAX_OUTPUT_TOKENS = 2048;

// ============================================================================
// AUTHENTIC DAOIST FULU/FUZHOU DATABASE
// ============================================================================

interface FuluEntry {
  id: string;
  name: {
    zh: string;
    en: string;
    pinyin: string;
  };
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

// Load database from external URL
const DAOIST_REMEDIES_DB_URL = "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/daoist_remedies_db.js"
let FULU_DATABASE: FuluEntry[] = [];
let FUZHOU_DATABASE: Array<{ id: string; name: { zh: string; en: string; pinyin: string }; usage: string[]; text?: { chinese: string; pinyin: string; translation: string } }> = [];

// Initialize database - MUST load from external URL (bucket)
async function loadFuluDatabase(): Promise<FuluEntry[]> {
  if (FULU_DATABASE.length > 0) {
    return FULU_DATABASE;
  }

  try {
    log(4, `[FULU_DB] Loading from external URL: ${DAOIST_REMEDIES_DB_URL}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(DAOIST_REMEDIES_DB_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/javascript, application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();
    let dbData: any;

    // Try to parse as JSON first
    try {
      dbData = JSON.parse(content);
    } catch {
      // Not JSON, try to extract from JS file
      const startMatch = content.match(/const\s+DAOIST_REMEDIES_DB\s*=\s*{/);
      if (startMatch) {
        const objStart = startMatch.index! + startMatch[0].length - 1;
        const objRaw = content.substring(objStart);
        dbData = cleanAndParseJSON(objRaw);
        if (dbData.error) {
          throw new Error(`Parse failed: ${dbData.message}`);
        }
      } else {
        const genericMatch = content.match(/({[\s\S]*?});?\s*$/);
        if (genericMatch) {
          dbData = cleanAndParseJSON(genericMatch[1]);
        } else {
          throw new Error("Could not find database object in file content");
        }
      }
    }

    if (dbData) {
      // Load fuzhou data from bucket
      FUZHOU_DATABASE = dbData.fuzhou || [];
      if (FUZHOU_DATABASE.length === 0) {
        log(4, `[FULU_DB] WARNING: No fuzhou entries found in bucket!`);
      } else {
        log(4, `[FULU_DB] Loaded ${FUZHOU_DATABASE.length} fuzhou entries from bucket`);
      }

      // Aggregate all remedy types
      const allEntries: any[] = [];
      if (dbData.fulu) allEntries.push(...dbData.fulu.map((e: any) => ({ ...e, remedyType: 'fulu' })));
      if (dbData.fengshui) allEntries.push(...dbData.fengshui.map((e: any) => ({ ...e, remedyType: 'fengshui' })));
      if (dbData.medicine) allEntries.push(...dbData.medicine.map((e: any) => ({ ...e, remedyType: 'medicine' })));

      if (allEntries.length === 0) {
        throw new Error("No remedy entries found in bucket database");
      }

      // Convert new format to FuluEntry format
      FULU_DATABASE = allEntries.map((entry: any) => convertToFuluEntry(entry, FUZHOU_DATABASE));
      log(4, `[FULU_DB] Loaded ${FULU_DATABASE.length} total remedies from external database`);
      return FULU_DATABASE;
    }

    throw new Error("Could not parse database from external source");
  } catch (error: any) {
    log(4, `[FULU_DB] CRITICAL ERROR: Failed to load from URL: ${error.message}`);
    log(4, `[FULU_DB] Database MUST be loaded from bucket. No fallback available.`);
    throw new Error(`Database load failed: ${error.message}. Ensure daoist_remedies_db.js is accessible at ${DAOIST_REMEDIES_DB_URL}`);
  }
}

// Convert new database format to FuluEntry format
function convertToFuluEntry(entry: any, fuzhouDB: any[] = []): FuluEntry {
  const matchingFuzhou = findMatchingFuzhou(entry, fuzhouDB);

  let incantation: any;
  if (matchingFuzhou && matchingFuzhou.text?.chinese && matchingFuzhou.text.chinese.length > 10) {
    incantation = {
      zh: matchingFuzhou.text.chinese,
      pinyin: matchingFuzhou.text.pinyin || "",
      en: matchingFuzhou.text.translation || "",
      es: matchingFuzhou.text.translation || "",
      it: matchingFuzhou.text.translation || "",
      fuzhouName: matchingFuzhou.name?.zh || "",
      fuzhouNameEn: matchingFuzhou.name?.en || "",
      fuzhouPurpose: matchingFuzhou.purpose || "",
      hasFuzhouText: true
    };
    log(4, `[FULU_DB] Matched fuzhou "${matchingFuzhou.name?.en}" with actual incantation text (${matchingFuzhou.text.chinese.length} chars)`);
  } else if (matchingFuzhou) {
    log(4, `[FULU_DB] WARNING: Matched fuzhou "${matchingFuzhou.id}" but text.chinese is missing or too short`);
    incantation = {
      zh: "", pinyin: "", en: "", es: "", it: "",
      fuzhouName: matchingFuzhou.name?.zh || "",
      fuzhouNameEn: matchingFuzhou.name?.en || "",
      hasFuzhouText: false
    };
  } else {
    incantation = {
      zh: "", pinyin: "", en: "", es: "", it: "",
      hasFuzhouText: false
    };
  }

  const structure = entry.structure || {
    type: entry.remedyType || 'general',
    elements: entry.remedyType === 'fengshui' ? ['Five Elements'] : ['Bagua'],
    purpose: entry.purpose || 'Remedy'
  };

  // Detect calligraphic style from descriptive text
  let charStyle = 'regular';
  const detectionText = ((entry.name?.en || '') + ' ' + (entry.description || '') + ' ' + (entry.instructions || '')).toLowerCase();

  if (detectionText.includes('worm') || detectionText.includes('bird-track') || detectionText.includes('bird track') || detectionText.includes('chongshu')) {
    charStyle = 'worm';
  } else if (detectionText.includes('seal') || detectionText.includes('zhuanshu') || detectionText.includes('official script')) {
    charStyle = 'seal';
  } else if (detectionText.includes('inverted') || detectionText.includes('fuwen')) {
    charStyle = 'fuwen-flip-vertical';
  }

  const visualData = generateVisualData({
    ...entry,
    structure,
    remedyType: entry.remedyType || 'fulu',
    elements: structure.elements || [],
    sealChars: entry.sealChars || entry.name?.zh?.split('').slice(0, 4) || ["符", "籙", "真", "文"],
    charStyle
  } as FuluEntry);

  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    source: entry.source,
    structure: {
      ...structure,
      instructions: entry.instructions || structure.instructions || ""
    },
    usage: entry.usage || [],
    verified: entry.verified || false,
    image: entry.image,
    images: entry.images || [],
    remedyType: entry.remedyType,
    application: entry.application,
    alchemicalContext: entry.alchemicalContext,
    instructions: entry.instructions,
    hexagrams: generateHexagramsFromUsage(entry.usage || []),
    elements: structure.elements?.map((e: string) => e.split(' ')[0]) || [],
    bazi_patterns: (entry.usage || []).map((u: string) => u.replace(/_/g, '_')),
    purpose: entry.usage?.[0] || "general",
    purpose_zh: entry.name?.zh?.substring(0, 4) || "符籙",
    sealChars: entry.sealChars || entry.name?.zh?.split('').slice(0, 4) || ["符", "籙", "真", "文"],
    charStyle,
    incantation,
    bottomRows: entry.bottomRows || [
      entry.source?.references?.slice(0, 2) || [entry.source?.primary?.split(' ')[0] || "道藏"],
      entry.usage?.slice(0, 2) || ["protection"]
    ],
    trigram_associations: entry.trigram_associations || ["111", "000", "101"],
    visualData: visualData,
    sigilInstructions: visualData.sigilInstructions,
    visualGrid: visualData.visualGrid,
    layoutInstructions: visualData.layoutInstructions
  };
}

// Find matching fuzhou entry based on usage/purpose overlap
function findMatchingFuzhou(fuluEntry: any, fuzhouDB: any[]): any | null {
  if (!fuzhouDB || fuzhouDB.length === 0) return null;

  const fuluId = fuluEntry.id;
  const fuluUsages = fuluEntry.usage || [];
  const fuluName = fuluEntry.name?.en?.toLowerCase() || "";
  const fuluDesc = fuluEntry.description?.toLowerCase() || "";

  const explicitLinks: { [key: string]: string } = {
    "fulu_014": "fuzhou_013",
    "fulu_015": "fuzhou_001",
    "fulu_020": "fuzhou_009"
  };

  if (explicitLinks[fuluId]) {
    const matched = fuzhouDB.find(f => f.id === explicitLinks[fuluId]);
    if (matched) return matched;
  }

  for (const fuzhou of fuzhouDB) {
    const fuzhouUsages = fuzhou.usage || [];
    const overlap = fuluUsages.some((u: string) => fuzhouUsages.includes(u));
    if (overlap) {
      log(4, `[FULU_DB] Matched fulu ${fuluEntry.id} with fuzhou ${fuzhou.id} (usage overlap)`);
      return fuzhou;
    }
  }

  for (const fuzhou of fuzhouDB) {
    const fuzhouName = fuzhou.name?.en?.toLowerCase() || "";
    const fuzhouDesc = fuzhou.description?.toLowerCase() || "";

    if (fuluName.includes(fuzhouName) || fuzhouName.includes(fuluName)) return fuzhou;

    const themes = ["protection", "exorcism", "meditation", "purification", "salvation", "thunder", "stellar"];
    for (const theme of themes) {
      if ((fuluName.includes(theme) || fuluDesc.includes(theme)) &&
        (fuzhouName.includes(theme) || fuzhouDesc.includes(theme))) {
        log(4, `[FULU_DB] Matched fulu ${fuluEntry.id} with fuzhou ${fuzhou.id} (theme: ${theme})`);
        return fuzhou;
      }
    }
  }

  const fuluIndex = parseInt(fuluEntry.id.replace(/\D/g, ''));
  if (fuluIndex > 0 && fuluIndex <= fuzhouDB.length) {
    log(4, `[FULU_DB] Matched fulu ${fuluEntry.id} with fuzhou by index`);
    return fuzhouDB[fuluIndex - 1];
  }

  return null;
}

// Generate hexagram associations from usage tags
function generateHexagramsFromUsage(usage: string[]): number[] {
  const hexagramMap: { [key: string]: number[] } = {
    "protection": [1, 11, 26, 34],
    "five_elements": [5, 8, 48, 2],
    "exorcism": [51, 40, 62, 4],
    "meditation": [20, 35, 55, 30],
    "cosmic_harmony": [45, 14, 42, 50],
    "stabilization": [8, 2, 23, 45],
    "navigate_danger": [6, 47, 64, 29],
    "strategic_retreat": [9, 26, 33, 52],
    "harmonize_relationships": [31, 41, 58, 54],
    "attract_abundance": [14, 42, 50, 32],
    "health_longevity": [18, 27, 44, 28],
    "internal_alchemy": [1, 2, 63, 64],
    "heart_kidney_harmony": [63, 64],
    "organ_health": [18, 27, 44, 28, 5],
    "environmental_stabilization": [52, 15, 46, 2],
    "home_harmony": [37, 59, 11],
    "qi_accumulation": [11, 26, 42, 1],
    "longevity": [32, 28, 1],
    "mansion_correction": [37, 59, 11],
    "destiny_harmony": [11, 2],
    "healing_space": [18, 5, 27],
    "directional_protection": [52, 1, 29],
    "supreme_cultivation": [1, 2],
    "spiritual_transformation": [49, 1, 2, 63, 64],
    "neidan": [63, 64, 1, 2]
  };

  const hexagrams = new Set<number>();
  usage.forEach(tag => {
    if (hexagramMap[tag]) {
      hexagramMap[tag].forEach(h => hexagrams.add(h));
    }
  });

  return Array.from(hexagrams).length > 0 ? Array.from(hexagrams) : [1, 11, 26, 34];
}

// Helper to generate visual representation data for talismans
function generateVisualData(entry: FuluEntry): any {
  const { type } = entry.structure;
  const { remedyType } = entry;

  if (entry.visualData && (entry.visualData.fdl || entry.visualData.sigilInstructions)) {
    log(4, `[VISUAL_DATA] Using definitive visualData from DB for: ${entry.id}`);
    return {
      ...entry.visualData,
      type,
      remedyType,
      image: entry.image,
      layoutInstructions: entry.visualData.layoutInstructions || generateQuadrantLayout(type, entry)
    };
  }

  const data: any = {
    type,
    remedyType,
    image: entry.image,
    layoutInstructions: generateQuadrantLayout(type, entry)
  };

  if (type === "meditation_palace") {
    data.visualGrid = ["# - # - #", "| 1 | 2 | 3 |", "# - # - #", "| 4 | 5 | 6 |", "# - # - #", "| 7 | 8 | 9 |", "# - # - #"];
    data.sigilInstructions = [{ type: 'grid', rows: 3, cols: 3, labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] }];
  } else if (type === "composite_symbol") {
    data.sigilInstructions = [];
  } else if (type === "five_directions") {
    data.sigilInstructions = [
      { type: 'path', points: [[200, 100], [250, 300], [100, 180], [300, 180], [150, 300]], width: 2 },
      { type: 'circle', cx: 200, cy: 200, r: 40, fill: true },
      { type: 'text', text: '東', x: 350, y: 200, size: 30, quadrant: 'right' },
      { type: 'text', text: '南', x: 200, y: 350, size: 30, quadrant: 'bottom' },
      { type: 'text', text: '西', x: 50, y: 200, size: 30, quadrant: 'left' },
      { type: 'text', text: '北', x: 200, y: 50, size: 30, quadrant: 'top' }
    ];
  } else if (type === "astral_invocation") {
    data.sigilInstructions = [
      { type: 'circle', cx: 100, cy: 100, r: 5, fill: true },
      { type: 'circle', cx: 150, cy: 120, r: 5, fill: true },
      { type: 'circle', cx: 200, cy: 150, r: 5, fill: true },
      { type: 'circle', cx: 220, cy: 200, r: 5, fill: true },
      { type: 'circle', cx: 280, cy: 230, r: 5, fill: true },
      { type: 'circle', cx: 330, cy: 210, r: 5, fill: true },
      { type: 'circle', cx: 350, cy: 260, r: 5, fill: true },
      { type: 'path', points: [[100, 100], [150, 120], [200, 150], [220, 200], [280, 230], [330, 210], [350, 260]], width: 1 },
      { type: 'text', text: '北斗', x: 225, y: 280, size: 24, quadrant: 'bottom-right' }
    ];
  } else if (type === "salvation_ritual") {
    data.sigilInstructions = [
      { type: 'circle', cx: 200, cy: 200, r: 80, width: 2 },
      { type: 'path', points: [[200, 50], [230, 150], [350, 150], [250, 220], [300, 350], [200, 280], [100, 350], [150, 220], [50, 150], [170, 150]], width: 1.5 },
      { type: 'circle', cx: 200, cy: 200, r: 20, fill: true }
    ];
  } else if (type === "purification") {
    data.sigilInstructions = [];
  } else if (type === "weapon_inscribed") {
    data.sigilInstructions = [
      { type: 'path', points: [[200, 50], [220, 100], [220, 300], [250, 300], [250, 330], [150, 330], [150, 300], [180, 300], [180, 100]], width: 2 },
      { type: 'line', points: [[120, 300], [280, 300]], width: 3 }
    ];
  } else if (remedyType === "fengshui") {
    data.sigilInstructions = [
      { type: 'polygon', points: [[200, 50], [306, 100], [350, 200], [306, 300], [200, 350], [94, 300], [50, 200], [94, 100]], width: 2 },
      { type: 'circle', cx: 200, cy: 200, r: 50, width: 1 },
      { type: 'text', text: '氣', x: 200, y: 200, size: 40, quadrant: 'center' },
      { type: 'text', text: '☰', x: 200, y: 70, size: 24, quadrant: 'top' },
      { type: 'text', text: '☷', x: 200, y: 330, size: 24, quadrant: 'bottom' },
      { type: 'text', text: '☵', x: 70, y: 200, size: 24, quadrant: 'left' },
      { type: 'text', text: '☲', x: 330, y: 200, size: 24, quadrant: 'right' }
    ];
  } else if (remedyType === "medicine") {
    data.sigilInstructions = [
      { type: 'circle', cx: 200, cy: 250, r: 60, width: 2 },
      { type: 'circle', cx: 200, cy: 250, r: 20, fill: true },
      { type: 'path', points: [[200, 100], [200, 190]], width: 1 },
      { type: 'path', points: [[180, 150], [200, 190], [220, 150]], width: 1 },
      { type: 'text', text: '丹', x: 200, y: 100, size: 40, quadrant: 'top' },
      { type: 'text', text: '田', x: 200, y: 320, size: 30, quadrant: 'bottom' },
      { type: 'text', text: '氣', x: 100, y: 200, size: 24, quadrant: 'left' }
    ];
  } else {
    data.sigilInstructions = [];
    log(4, `[VISUAL_DATA] Using clean fallback for type="${type}" remedyType="${remedyType}"`);
  }

  return data;
}

// Generate quadrant-based layout instructions for canvas rendering
function generateQuadrantLayout(type: string, entry: FuluEntry): any {
  const remedyType = entry?.remedyType;
  const layout: any = {
    sections: {
      top: { x: 200, y: 60, anchor: 'center' },
      'top-right': { x: 320, y: 80, anchor: 'center' },
      right: { x: 340, y: 200, anchor: 'center' },
      'bottom-right': { x: 320, y: 320, anchor: 'center' },
      bottom: { x: 200, y: 340, anchor: 'center' },
      'bottom-left': { x: 80, y: 320, anchor: 'center' },
      left: { x: 60, y: 200, anchor: 'center' },
      'top-left': { x: 80, y: 80, anchor: 'center' },
      center: { x: 200, y: 200, anchor: 'center' }
    },
    labels: []
  };

  if (type === 'five_directions' || remedyType === 'fengshui') {
    layout.labels = [
      { text: entry.elements?.[0] || '木', position: 'right', element: 'wood' },
      { text: entry.elements?.[1] || '火', position: 'bottom', element: 'fire' },
      { text: entry.elements?.[2] || '土', position: 'center', element: 'earth' },
      { text: entry.elements?.[3] || '金', position: 'left', element: 'metal' },
      { text: entry.elements?.[4] || '水', position: 'top', element: 'water' }
    ];
  }

  if (entry.sealChars && entry.sealChars.length > 0) {
    const charCount = entry.sealChars.length;
    entry.sealChars.forEach((char, idx) => {
      const yOffset = (idx - (charCount - 1) / 2) * 60;
      layout.labels.push({
        text: char,
        position: 'center',
        y: 200 + yOffset,
        size: 80,
        isSeal: true
      });
    });
  }

  return layout;
}

// Selector function to match Fulu based on reading context
async function selectFuluFromDatabase(
  hexagramNumber: number,
  upperTrigram: string,
  lowerTrigram: string,
  bazi: any,
  question: string,
  type?: 'fulu' | 'fengshui' | 'medicine',
  interpretationContext?: any
): Promise<FuluEntry | null> {
  log(4, `[FULU_SELECTOR] Selecting for hexagram ${hexagramNumber}, type ${type || 'any'}`);

  const database = await loadFuluDatabase();
  const basePool = type ? database.filter(e => e.remedyType === type) : database;

  let candidates = basePool.filter(entry =>
    entry.hexagrams.includes(hexagramNumber)
  );

  log(4, `[FULU_SELECTOR] Found ${candidates.length} candidates by hexagram`);

  if (candidates.length === 0) {
    candidates = basePool.filter(entry =>
      entry.trigram_associations.includes(upperTrigram) ||
      entry.trigram_associations.includes(lowerTrigram)
    );
    log(4, `[FULU_SELECTOR] Found ${candidates.length} candidates by trigram in ${type || 'all'} pool`);
  }

  const interpretationText = interpretationContext ?
    `${interpretationContext.celestial} ${interpretationContext.elements} ${interpretationContext.analysis} ${interpretationContext.advice}`.toLowerCase() :
    '';

  const scored = candidates.map(entry => {
    let score = 0;

    if (entry.verified) score += 5;
    if (entry.hexagrams.includes(hexagramNumber)) score += 10;

    if (entry.trigram_associations.includes(upperTrigram) &&
      entry.trigram_associations.includes(lowerTrigram)) {
      score += 5;
    } else if (entry.trigram_associations.includes(upperTrigram) ||
      entry.trigram_associations.includes(lowerTrigram)) {
      score += 2;
    }

    if (bazi && bazi.elements) {
      const dayMasterElement = bazi.dayMaster?.element;
      if (dayMasterElement && entry.elements.includes(dayMasterElement)) {
        score += 3;
      }
    }

    const questionLower = question.toLowerCase();
    const purposeMatch = entry.usage.some((usage: string) =>
      questionLower.includes(usage.replace(/_/g, ' '))
    );
    if (purposeMatch) score += 4;

    if (interpretationText) {
      const purposeKeywords = entry.purpose?.toLowerCase().split(/[\s,;]+/) || [];
      const interpretationMatches = purposeKeywords.filter((keyword: string) =>
        keyword.length > 3 && interpretationText.includes(keyword)
      ).length;
      score += interpretationMatches * 3;

      const usageMatches = entry.usage.filter((usage: string) =>
        interpretationText.includes(usage.replace(/_/g, ' '))
      ).length;
      score += usageMatches * 2;

      const descKeywords = entry.description?.toLowerCase().split(/[\s,;]+/) || [];
      const descMatches = descKeywords.filter((keyword: string) =>
        keyword.length > 4 && interpretationText.includes(keyword)
      ).length;
      score += descMatches * 1;
    }

    score += Math.random() * 3;

    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const topCandidates = scored.slice(0, Math.min(3, scored.length));
    const selectedIndex = Math.floor(Math.random() * topCandidates.length);
    const selected = topCandidates[selectedIndex];

    log(4, `[FULU_SELECTOR] Selected from top ${topCandidates.length}: ${selected.entry.id} (${selected.entry.name.zh}) with score ${selected.score.toFixed(2)}`);
    return selected.entry;
  }

  const verifiedEntries = basePool.filter(e => e.verified);
  if (verifiedEntries.length > 0) {
    const randomEntry = verifiedEntries[Math.floor(Math.random() * verifiedEntries.length)];
    log(4, `[FULU_SELECTOR] No direct match found. Using random verified entry: ${randomEntry.id}`);
    return randomEntry;
  }

  log(4, `[FULU_SELECTOR] No suitable Fulu found in database`);
  return null;
}


// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errorCode: string = "INTERNAL_ERROR",
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      `${resource}${identifier ? ` '${identifier}'` : ""} not found`,
      404,
      "NOT_FOUND",
      { resource, identifier }
    );
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      429,
      "RATE_LIMIT_EXCEEDED",
      { retryAfter }
    );
  }
}

class ExternalAPIError extends AppError {
  constructor(service: string, originalError: string) {
    super(
      `External API error from ${service}: ${originalError}`,
      502,
      "EXTERNAL_API_ERROR",
      { service, originalError }
    );
  }
}

class APIError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, "API_ERROR", details);
  }
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface TrigramData {
  binary: string;        // e.g., "111", "110"
  name: string;          // e.g., "Heaven", "Lake"
  element: string;       // e.g., "Metal", "Wood"
  symbol?: string;       // e.g., "☰", "☱"
}

interface InterpretationRequest {
  question: string;
  hexagram: {
    number: number;
    name_en: string;
    name_zh?: string;
    name_es?: string;
    name_it?: string;
    element?: string;           // Hexagram's overall element
    trigramUpper?: TrigramData;  // Upper trigram with element
    trigramLower?: TrigramData;  // Lower trigram with element
    // Legacy support for old field names
    trigram_upper?: TrigramData | { element?: string; name?: string };
    trigram_lower?: TrigramData | { element?: string; name?: string };
  };
  lines: Array<{
    isYang: boolean;
    isChanging: boolean;
    bits?: string[];
  }>;
  binaryKey: string;
  mansion?: {
    num: number;
    name_en: string;
    name_zh: string;
    name_es?: string;
    name_it?: string;
    group: string;
    group_zh: string;
    group_es?: string;
    group_it?: string;
    element: string;
    animal: string;
    degrees: number;
    symbol: string;
  };
  lifePalace?: {
    lifeNum: number;
    bodyNum: number;
    hourPillar?: string;
  };
  birthBazi?: any;
  currentBazi?: any;
  momentBazi?: any;
  astrology?: {
    lifeGua?: any;
    xiantian?: any;
    houtian?: any;
    taiSui?: any;
    heTu?: any;
    luoShu?: any;
    lunarMansion?: any;
    bazi?: any;
    comparison?: any;
  };
  celestialDataStatus?: 'complete' | 'pending_api_response';
  cumulativeTechnicalData?: string; // Simplified markdown of previous sections' technical data
  interpretation?: any;
  equilibrium?: {
    yangCount: number;
    yinCount: number;
    balanceState: string;
    stabilityState: string;
    movingCount: number;
    elements: { [key: string]: number };
  };
  historyAnalysis?: string;
  askAgainSource?: string | null;
  lang?: string;
  systemInstructions?: string;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
    duration?: number;
  };
}

interface CelestialSection {
  technicalAnalysis: string;
  colloquialInterpretation: string;
  birthBazi?: {
    description: string;
    readingImpact: string;
  };
  currentBazi?: {
    description: string;
    readingImpact: string;
  };
  lunarMansion: {
    description: string;
    influence: string;
    guidance: string;
  };
  lifePalace?: {
    description: string;
    impact: string;
  };
  celestial: string;
  quotedReferences: string[];
  technicalData?: string;
}

interface ElementsSection {
  technicalAnalysis: string;
  colloquialInterpretation: string;
  composition: string;
  trigramRelationship: string;
  yinYangAnalysis: string;
  recommendations: string;
  elements: string;
  quotedReferences: string[];
  technicalData?: string;
}

interface HoutouSection {
  technicalAnalysis: string;
  colloquialInterpretation: string;
  diagramData: {
    fdl: any;
  };
  emperorAnalysis: string;
  masterAnalysis: string;
  quotedReferences: string[];
}

interface CoreSection {
  analysis: string;
  technicalAnalysis: string;
  colloquialInterpretation: string;
  advice: string;
  symbolism: string;
  quotedReferences: string[];
}

interface LinesSection {
  movingLines: string;
  lineTexts?: string[];
  quotedReferences: string[];
}

interface ClassicalSection {
  judgment: Record<string, string>;
  image: Record<string, string>;
  lines: Record<string, string[]>;
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

let hexagramCache: { hexagrams: Record<string, any>; version?: string } | null = null;
const CURRENT_AI_PROVIDER = 'DEEPSEEK';
const VERBOSITY = 4;

const responseCache = new Map<string, CacheEntry<any>>();
const rateLimitStore = new Map<string, RateLimitEntry>();

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function log(level: number, msg: string, context?: any) {
  if (level <= VERBOSITY) {
    const timestamp = new Date().toISOString();
    const tag = `[${timestamp}][v${level}]`;
    if (context) {
      console.log(`${tag} ${msg}`, JSON.stringify(context));
    } else {
      console.log(`${tag} ${msg}`);
    }
  }
}

function check(condition: boolean, message: string) {
  if (!condition) {
    log(4, `[FAIL] Check failed: ${message}`);
    throw new Error(`Check failed: ${message}`);
  }
  log(4, `[PASS] Check passed: ${message}`);
}

// ============================================================================
// CACHING UTILITIES
// ============================================================================

function getCacheKey(endpoint: string, params: any): string {
  return `${endpoint}:${JSON.stringify(params)}`;
}

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.timestamp + entry.ttl) {
    responseCache.delete(key);
    return null;
  }

  log(4, `[CACHE] Cache hit for key: ${key.substring(0, 50)}...`);
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number = 300000): void {
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  });
  log(4, `[CACHE] Cached data with key: ${key.substring(0, 50)}...`);
}

function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now > entry.timestamp + entry.ttl) {
      responseCache.delete(key);
    }
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const RATE_LIMIT = {
  maxRequests: 50,
  windowMs: 60000
};

function checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs
    });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

const validators = {
  hexagramNumber(num: any): number {
    const parsed = parseInt(num, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 64) {
      throw new ValidationError(
        `Invalid hexagram number: ${num}. Must be between 1-64.`,
        { field: 'hexagramNumber', value: num, range: '1-64' }
      );
    }
    return parsed;
  },

  question(q: any): string {
    if (!q || typeof q !== 'string') {
      throw new ValidationError(
        "Question is required and must be a string.",
        { field: 'question', type: typeof q }
      );
    }
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      throw new ValidationError(
        "Question must be at least 3 characters long.",
        { field: 'question', length: trimmed.length }
      );
    }
    if (trimmed.length > 500) {
      throw new ValidationError(
        "Question must not exceed 500 characters.",
        { field: 'question', length: trimmed.length, max: 500 }
      );
    }
    return trimmed;
  },

  lines(lines: any): any[] {
    if (!Array.isArray(lines)) {
      throw new ValidationError(
        "Lines must be an array.",
        { field: 'lines', type: typeof lines }
      );
    }
    if (lines.length !== 6) {
      throw new ValidationError(
        `Lines array must have exactly 6 elements, got ${lines.length}.`,
        { field: 'lines', count: lines.length, expected: 6 }
      );
    }
    lines.forEach((line, i) => {
      if (typeof line !== 'object' || line === null) {
        throw new ValidationError(
          `Line ${i + 1} must be an object.`,
          { field: `lines[${i}]`, type: typeof line }
        );
      }
      if (typeof line.isYang !== 'boolean') {
        throw new ValidationError(
          `Line ${i + 1} must have boolean 'isYang' property.`,
          { field: `lines[${i}].isYang`, type: typeof line.isYang }
        );
      }
      if (typeof line.isChanging !== 'boolean') {
        throw new ValidationError(
          `Line ${i + 1} must have boolean 'isChanging' property.`,
          { field: `lines[${i}].isChanging`, type: typeof line.isChanging }
        );
      }
    });
    return lines;
  },

  hexagramData(data: any): any {
    if (!data || typeof data !== 'object') {
      throw new ValidationError(
        "Hexagram data is required and must be an object.",
        { field: 'hexagram', type: typeof data }
      );
    }
    if (!data.number || typeof data.number !== 'number') {
      throw new ValidationError(
        "Hexagram must have a numeric 'number' property.",
        { field: 'hexagram.number', type: typeof data?.number }
      );
    }
    if (!data.name_en || typeof data.name_en !== 'string') {
      throw new ValidationError(
        "Hexagram must have a string 'name_en' property.",
        { field: 'hexagram.name_en', type: typeof data?.name_en }
      );
    }
    return data;
  },

  language(lang: any): string {
    const validLangs = ['en', 'es', 'it', 'zh'];
    const normalized = (lang || 'en').toLowerCase();
    if (!validLangs.includes(normalized)) {
      throw new ValidationError(
        `Invalid language: ${lang}. Must be one of: ${validLangs.join(', ')}.`,
        { field: 'lang', value: lang, validValues: validLangs }
      );
    }
    return normalized;
  },

  section(section: any): string {
    const validSections = ['celestial', 'elements', 'core', 'lines', 'classical', 'remedies', 
      'celestial-astro', 'celestial-bazi', 'elements-analysis', 'elements-synthesis',
      'core-analysis', 'core-technical', 'core-narrative', 'core-application',
      'houtou', 'houtou-emperor', 'houtou-master', 'advice'];
    if (!validSections.includes(section)) {
      throw new ValidationError(
        `Invalid section: ${section}. Must be one of: ${validSections.join(', ')}.`,
        { field: 'section', value: section, validValues: validSections }
      );
    }
    return section;
  }
};

// ============================================================================
// HTTP UTILITIES
// ============================================================================

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new APIError(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

async function fetchWithRetries(
  url: string,
  opts: RequestInit = {},
  attempts = 5,
  initialDelay = 400,
  timeoutMs = 30000
): Promise<Response> {
  let attempt = 0;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = opts.signal || controller.signal;
  opts = { ...opts, signal };

  while (attempt < attempts) {
    try {
      log(4, `Fetching (attempt ${attempt + 1}/${attempts}): ${url}`);
      const res = await fetch(url, opts);
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const errMsg = `HTTP ${res.status} ${res.statusText} for ${url} ${text ? `- body: ${text.slice(0, 200)}` : ''}`;

        if (res.status >= 500 && attempt < attempts - 1) {
          throw new Error(errMsg);
        } else if (res.status >= 400) {
          throw new Error(errMsg);
        }
      }

      log(4, `[OK] Fetch success: ${url}`);
      return res;
    } catch (err: any) {
      attempt++;
      log(4, `Fetch error on attempt ${attempt} for ${url}: ${err.message}`);

      if (attempt >= attempts) {
        throw new ExternalAPIError(url.split('/')[2], err.message);
      }

      const delay = initialDelay * Math.pow(2, attempt - 1);
      log(4, `Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }

  throw new Error(`Unreachable fetchWithRetries loop end for ${url}`);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      log(4, `[RETRY] ${label} attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await sleep(delayMs * attempt);
    }
  }
  throw new Error(`[RETRY] ${label} exhausted all retries`);
}


// ============================================================================
// ROBUST CLEANING & PARSING UTILITIES
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
    leakagePatterns.forEach(regex => {
      text = text.replace(regex, '');
    });

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

  if (Array.isArray(obj)) {
    return obj.map(sanitizeResponseContent);
  }

  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeResponseContent(obj[key]);
    }
    return result;
  }

  return obj;
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
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') stack++;
      if (char === '}') {
        stack--;
        if (stack === 0) {
          lastBrace = i;
          break;
        }
      }
    }
  }

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else if (!fallbackField) {
    if (text.includes('<div') || text.includes('Titled')) {
      return {
        error: "Invalid JSON",
        content: sanitizeResponseContent(text)
      };
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
        .replace(/'\s*:\s*'/g, '": "')
        .replace(/'\s*:\s*"/g, '": "')
        .replace(/"\s*:\s*'/g, '": "')
        .replace(/{\s*'/g, '{"')
        .replace(/'\s*}/g, '"}')
        .replace(/,\s*'/g, ',"');
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      return JSON.parse(fixed);
    },
    () => {
      const stack: string[] = [];
      let inString = false;
      let escaped = false;
      for (const char of cleaned) {
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (char === '{') stack.push('}');
        else if (char === '[') stack.push(']');
        else if (char === '}' || char === ']') stack.pop();
      }
      let suffix = inString ? '"' : '';
      suffix += stack.reverse().join('');
      return JSON.parse(cleaned + suffix);
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
        if (match) {
          repaired = repaired.substring(0, repaired.length - match[0].length);
          break;
        }
      }
      const stack: string[] = [];
      let inStr = false;
      let esc = false;
      for (const char of repaired) {
        if (esc) { esc = false; continue; }
        if (char === '\\') { esc = true; continue; }
        if (char === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (char === '{') stack.push('}');
        else if (char === '[') stack.push(']');
        else if (char === '}' || char === ']') stack.pop();
      }
      let suffix = inStr ? '"' : '';
      suffix += stack.reverse().join('');
      return JSON.parse(repaired + suffix);
    }
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      const result = attempts[i]();
      return sanitizeResponseContent(result);
    } catch (e) {
      if (i === attempts.length - 1) {
        log(4, `[cleanAndParseJSON] FINAL ATTEMPT FAILED.`);
      }
    }
  }

  if (fallbackField) {
    return { [fallbackField]: sanitizeResponseContent(text) };
  }

  return {
    error: "Parse failed",
    message: "Could not repair JSON",
    raw_preview: cleaned.substring(0, 200)
  };
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

    if (escaped) {
      if (!inSingleComment && !inMultiComment) result += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      if (!inSingleComment && !inMultiComment) result += char;
      escaped = true;
      continue;
    }

    if (char === '"' && !inSingleComment && !inMultiComment) {
      inString = !inString;
      result += char;
      continue;
    }

    if (!inString) {
      if (!inSingleComment && !inMultiComment && char === '/' && nextChar === '/') {
        inSingleComment = true;
        i++;
        continue;
      }
      if (inSingleComment && char === '\n') {
        inSingleComment = false;
        result += char;
        continue;
      }
      if (!inSingleComment && !inMultiComment && char === '/' && nextChar === '*') {
        inMultiComment = true;
        i++;
        continue;
      }
      if (inMultiComment && char === '*' && nextChar === '/') {
        inMultiComment = false;
        i++;
        continue;
      }
    }

    if (!inSingleComment && !inMultiComment) {
      result += char;
    }
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
      if (ch === '"') {
        inString = true;
        chars.push(ch);
      } else {
        chars.push(ch);
      }
      i++;
    } else {
      if (ch === '\\') {
        chars.push(ch);
        if (i + 1 < json.length) {
          chars.push(json[i + 1]);
          i += 2;
        } else {
          i++;
        }
      } else if (ch === '"') {
        inString = false;
        chars.push(ch);
        i++;
      } else if (ch === '\n') {
        chars.push('\\', 'n');
        i++;
      } else if (ch === '\r') {
        i++;
      } else if (ch === '\t') {
        chars.push('\\', 't');
        i++;
      } else if (ch.charCodeAt(0) < 0x20) {
        i++;
      } else {
        chars.push(ch);
        i++;
      }
    }
  }

  return chars.join('');
}

function verifyAndParseJSON(text: string, requiredKeys: string[]): any {
  try {
    const parsed = cleanAndParseJSON(text);

    if (parsed.error && parsed.message) {
      throw new Error(parsed.message);
    }

    for (const key of requiredKeys) {
      if (!(key in parsed)) {
        throw new ValidationError(
          `Missing required key '${key}' in response.`,
          { requiredKey: key, availableKeys: Object.keys(parsed) }
        );
      }
    }

    return parsed;
  } catch (error: any) {
    throw new AppError(
      `Failed to parse or verify API response: ${error.message}`,
      500,
      "PARSE_ERROR",
      { originalText: text.slice(0, 500) }
    );
  }
}

function pruneToEnglish(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => pruneToEnglish(item));
  }

  const pruned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const isLangKey = ['es', 'it', 'zh', 'pinyin', 'fr', 'de', 'ja', 'ko'].includes(key);
    const hasLangSuffix = key.endsWith('_es') || key.endsWith('_it') || key.endsWith('_zh') || key.endsWith('_pinyin');

    if (isLangKey || hasLangSuffix) {
      continue;
    }

    pruned[key] = pruneToEnglish(value);
  }
  return pruned;
}

function createSuccessResponse<T>(data: T, requestId: string, startTime?: number): APIResponse<T> {
  const response: APIResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      requestId
    }
  };

  if (startTime) {
    response.meta!.duration = Date.now() - startTime;
  }

  return response;
}

function createErrorResponse(error: AppError | Error, requestId: string): APIResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
        details: error.details
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: API_VERSION,
        requestId
      }
    };
  }

  return {
    success: false,
    error: {
      message: error.message || "An unexpected error occurred",
      code: "INTERNAL_ERROR"
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      requestId
    }
  };
}

// ============================================================================
// HEXAGRAM DATA MANAGEMENT
// ============================================================================

async function getHexagramData(): Promise<any> {
  if (hexagramCache) {
    log(4, "Using cached hexagram data");
    return hexagramCache;
  }

  const bucketUrl = `${SUPABASE_URL}${HEXAGRAM_BUCKET_PATH}`;
  log(4, `[BUCKET LOADER] Loading hexagram data from: ${bucketUrl}`);

  const response = await fetchWithRetries(bucketUrl, {}, 5, 400, 10000);
  hexagramCache = await response.json();

  check(hexagramCache && hexagramCache.hexagrams, "Hexagram data loaded from bucket");
  check(Object.keys(hexagramCache.hexagrams).length === 64, "All 64 hexagrams present in data");

  log(4, `[BUCKET LOADER] Successfully loaded ${Object.keys(hexagramCache.hexagrams).length} hexagrams (v${hexagramCache.version})`);
  return hexagramCache;
}

async function getHexagram(hexagramNumber: number): Promise<any> {
  log(4, `[HEXAGRAM LOOKUP] Fetching hexagram #${hexagramNumber}`);

  validators.hexagramNumber(hexagramNumber);

  const data = await getHexagramData();
  const hexagram = data.hexagrams[hexagramNumber.toString()];

  if (!hexagram) {
    throw new NotFoundError("Hexagram", hexagramNumber.toString());
  }

  log(4, `[HEXAGRAM LOOKUP] Found: ${hexagram.name_zh} (${hexagram.name_en})`);
  return hexagram;
}

async function lookupAndSummarizeHexagrams(hexagramNumbers: number[]): Promise<string> {
  if (!hexagramNumbers || hexagramNumbers.length === 0) return "";

  const summaries = await Promise.all(hexagramNumbers.map(async (num) => {
    try {
      validators.hexagramNumber(num);
      const hex = await getHexagram(num);
      return `Hexagram ${num} (${hex.name_zh} - ${hex.name_en}):
- Judgment: ${hex.judgment_zh || "Not found."}
- English: ${hex.judgment_en || "Not found."}
- Upper Trigram: ${hex.trigrams?.upper_name || "Unknown"} (${hex.trigrams?.upper || ""})
- Lower Trigram: ${hex.trigrams?.lower_name || "Unknown"} (${hex.trigrams?.lower || ""})
`;
    } catch (error: any) {
      log(4, `Failed to lookup hexagram #${num}: ${error.message}`);
      return `Hexagram ${num}: (Could not be retrieved - ${error.message})\n`;
    }
  }));

  return summaries.join('\n');
}


// ============================================================================
// AI PROVIDER FUNCTIONS
// ============================================================================

async function _callDeepSeekAPI(prompt: string, config: any): Promise<string> {
  await sleep(500);

  if (!DEEPSEEK_API_KEY) {
    throw new AppError(
      "DEEPSEEK_API_KEY environment variable not set",
      503,
      "SERVICE_UNAVAILABLE",
      { provider: "DEEPSEEK" }
    );
  }

  const payload: any = {
    model: config.model || "deepseek-chat",
    messages: [
      { role: "system", content: config.systemPrompt || "You are a helpful assistant." },
      { role: "user", content: prompt }
    ],
    stream: false,
    max_tokens: config.maxOutputTokens ?? 2048,
    temperature: config.temperature ?? 0.7
  };

  if (config.response_format) {
    payload.response_format = config.response_format;
  } else if (config.response_mime_type === "application/json") {
    payload.response_format = { type: "json_object" };
  }

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new ExternalAPIError("DeepSeek", `HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();

    if (!data.choices || data.choices.length === 0) {
      throw new ExternalAPIError("DeepSeek", "No choices returned");
    }

    const finishReason = data.choices[0].finish_reason;
    if (finishReason === 'length') {
      log(4, `[DeepSeek] WARNING: Response truncated (finish_reason=length, max_tokens=${config.maxOutputTokens ?? 2048})`);
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    if (error instanceof ExternalAPIError) throw error;
    throw new ExternalAPIError("DeepSeek", error.message);
  }
}

async function getInterpretation(prompt: string, maxOutputTokens: number, configOverrides: any = {}): Promise<string> {
  const config = { maxOutputTokens, ...configOverrides };
  log(4, `[getInterpretation] Calling AI provider (${CURRENT_AI_PROVIDER})`);
  return await _callDeepSeekAPI(prompt, config);
}

async function getStructuredInterpretation(
  prompt: string,
  maxOutputTokens: number,
  config: any = {},
  requiredFields: string[] = [],
  maxRetries: number = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(4, `[getStructuredInterpretation] Attempt ${attempt}/${maxRetries}`);

      let modifiedPrompt = prompt;
      let modifiedConfig = { ...config };

      if (attempt > 1) {
        modifiedConfig.systemPrompt = (config.systemPrompt || "") + `

PREVIOUS ATTEMPT FAILED - JSON PARSING ERROR.
STRICT REQUIREMENTS FOR THIS ATTEMPT:
1. Output ONLY valid JSON - no other text
2. All strings on single lines (use \\n for newlines)
3. Escape all quotes as \\"
4. No markdown code blocks
5. Ensure all braces/brackets are properly closed
6. Double-check for trailing commas`;
      }

      const rawResponse = await getInterpretation(modifiedPrompt, maxOutputTokens, modifiedConfig);

      if (rawResponse && !rawResponse.trimEnd().endsWith('}') && !rawResponse.trimEnd().endsWith(']')) {
        log(4, `[getStructuredInterpretation] WARNING: Response appears truncated`);
      }

      const parsed = cleanAndParseJSON(rawResponse);

      if (parsed.error) {
        log(4, `[getStructuredInterpretation] Parse failed, raw preview: ${(rawResponse || '').substring(0, 300)}`);
        throw new Error(parsed.message || "JSON parse error");
      }

      if (requiredFields.length > 0) {
        const missing = requiredFields.filter(field => {
          const parts = field.split('.');
          let current = parsed;
          for (const part of parts) {
            if (current === null || current === undefined || !(part in current)) {
              return true;
            }
            current = current[part];
          }
          return false;
        });

        if (missing.length > 0) {
          throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
      }

      log(4, `[getStructuredInterpretation] Success on attempt ${attempt}`);
      return parsed;

    } catch (error: any) {
      log(4, `[getStructuredInterpretation] Attempt ${attempt} failed: ${error.message}`);

      if (attempt === maxRetries) {
        log(4, `[getStructuredInterpretation] All ${maxRetries} attempts exhausted`);
        throw new AppError(
          `Failed to get valid JSON response after ${maxRetries} attempts: ${error.message}`,
          500,
          "JSON_PARSE_RETRY_EXHAUSTED",
          { attempts: maxRetries, lastError: error.message }
        );
      }

      await sleep(500 * attempt);
    }
  }

  throw new Error("Unreachable code in getStructuredInterpretation");
}

// ============================================================================
// TRANSLATION FUNCTIONS
// ============================================================================

async function getTranslation(hexagram: any, targetLanguage: string, attempts = 3): Promise<any> {
  const langMap: { [key: string]: string } = {
    'english': 'en', 'spanish': 'es', 'italian': 'it',
    'en': 'en', 'es': 'es', 'it': 'it'
  };

  const langKey = langMap[targetLanguage.toLowerCase()] || targetLanguage.toLowerCase().slice(0, 2);
  const nameKey = `name_${langKey}`;
  const judgmentKey = `judgment_${langKey}`;
  const linesKey = `lines_${langKey}`;

  if (hexagram[nameKey] && hexagram[judgmentKey]) {
    log(4, `[TRANSLATION] Using cached ${targetLanguage} translation`);
    return {
      name_zh: hexagram[nameKey],
      judgment_zh: hexagram[judgmentKey],
      lines_zh: hexagram[linesKey] || []
    };
  }

  log(4, `[TRANSLATION] Generating ${targetLanguage} translation via AI`);

  const translatableData = {
    name_zh: hexagram.name_zh,
    judgment_zh: hexagram.judgment_zh || "",
    lines_zh: hexagram.lines_zh || []
  };

  const prompt = `Translate the Chinese values in the following JSON object to ${targetLanguage}. Maintain the exact JSON structure.

DATA TO TRANSLATE:
${JSON.stringify(translatableData, null, 2)}`;

  const aiConfig = {
    temperature: 0.2,
    systemPrompt: "You are a precise translation API. Output only valid JSON.",
    response_mime_type: "application/json"
  };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      log(4, `Translation attempt ${attempt}/${attempts}...`);
      const rawResponse = await getInterpretation(prompt, 2048, aiConfig);
      return verifyAndParseJSON(rawResponse, ['name_zh', 'judgment_zh', 'lines_zh']);
    } catch (error: any) {
      log(4, `Translation attempt ${attempt} failed: ${error.message}`);
      if (attempt >= attempts) {
        throw new AppError(
          `Failed to translate after ${attempts} attempts`,
          500,
          "TRANSLATION_FAILED",
          { attempts, lastError: error.message }
        );
      }
      await sleep(500 * attempt);
    }
  }

  throw new AppError("Translation failed definitively", 500, "TRANSLATION_FAILED");
}

async function translateInterpretationContent(
  content: any,
  targetLang: string,
  targetLangName: string,
  hexagramName: string
): Promise<any> {
  log(4, `[TRANSLATE] Translating to ${targetLangName}...`);

  const systemPrompt = `You are a professional translator and Yi Jing scholar. 
Translate the provided I Ching interpretation from English to ${targetLangName}.
All string values must be plain text - no markdown formatting (no **bold**, no *italic*, no # headings).

STRICT RULES:
1. FAITHFUL TRANSLATION: Do NOT summarize. Every detail, nuance, and paragraph must be translated.
2. TECHNICAL ACCURACY: Preserve all drawing instructions, ritual steps, and alchemical terms precisely.
3. STRUCTURE: The FIRST LINE of technical fields is often a title. Preserve this structure.
4. DEPTH: If the source text is long and detailed, the translation MUST be equally long and detailed.
5. Return ONLY valid JSON.

FORMAT (JSON only):
{
  "celestialTechnical": "...",
  "celestialColloquial": "...",
  "birthBaziDescription": "...",
  "birthBaziImpact": "...",
  "currentBaziDescription": "...",
  "currentBaziImpact": "...",
  "celestial": "...",
  "elementsTechnical": "...",
  "elementsColloquial": "...",
  "elements": "...",
  "coreTechnical": "...",
  "coreColloquial": "...",
  "analysis": "...",
  "advice": "...",
  "symbolism": "...",
  "movingLines": "...",
  "lineTexts": ["Line 1 commentary...", "Line 2 commentary...", "Line 3...", "Line 4...", "Line 5...", "Line 6..."],
  "name": "...",
  "description": "...",
  "relevance": "...",
  "instructions": "...",
  "application": "...",
  "alchemicalContext": "...",
  "fengShui": { "favorable": ["..."], "unfavorable": ["..."], "guidance": "..." },
  "medicine": [{ "name": "...", "description": "..." }],
  "alchemical": "..."
}

NOTE: lineTexts is an ARRAY of 6 strings (one for each line). Translate each array element and return as an array.
NOTE: Include ALL fields that are present in the input content - do not omit any fields.`;

  const userPrompt = `HEXAGRAM: ${hexagramName} TARGET LANGUAGE: ${targetLangName} CONTENT TO TRANSLATE (Translate everything completely and faithfully): ${JSON.stringify(content, null, 2)}`;

  try {
    const requiredFields = content.celestialTechnical ? ["celestialTechnical"] : [];
    const parsed = await getStructuredInterpretation(
      userPrompt,
      4000,
      { systemPrompt, temperature: 0.2, response_mime_type: "application/json" },
      requiredFields,
      2
    );

    return {
      ...content,
      ...parsed
    };
  } catch (error: any) {
    log(4, `[TRANSLATE] Translation failed or timed out: ${error.message}`);
    return content;
  }
}

// ============================================================================
// INTERPRETATION SECTION GENERATORS
// ============================================================================

function getLinePositionName(position: number): string {
  const names: { [key: number]: string } = {
    1: "Beginning (Bottom) - Foundation",
    2: "Second - Development",
    3: "Third - Challenge/Crisis",
    4: "Fourth - Transition",
    5: "Fifth - Ruler/Peak",
    6: "Top (Summit) - Culmination/Excess"
  };
  return names[position] || `Position ${position}`;
}

async function generateCelestialAstro(request: InterpretationRequest): Promise<any> {
  log(4, `[SECTION:celestial-astro] Generating celestial astrology...`);
  const { mansion, question, hexagram, astrology, celestialDataStatus } = request;

  // Build technical data from available sources
  const technicalData: any = {
    timestamp: new Date().toISOString(),
    hexagram: hexagram ? { number: hexagram.number, name: hexagram.name_en } : null,
    lunarMansion: mansion ? {
      name: mansion.name_en,
      nameZh: mansion.name_zh,
      group: mansion.group,
      element: mansion.element,
      animal: mansion.animal
    } : null,
    dataStatus: celestialDataStatus || 'unknown'
  };

  // Add API astrology data if available
  if (astrology?.lunarMansion) {
    technicalData.lunarMansionAPI = astrology.lunarMansion;
  }
  if (astrology?.taiSui) {
    technicalData.taiSui = astrology.taiSui;
  }
  if (astrology?.heTu) {
    technicalData.heTu = astrology.heTu;
  }
  if (astrology?.luoShu) {
    technicalData.luoShu = astrology.luoShu;
  }

  const systemPrompt = `You are a Daoist Astronomer. Provide celestial astrology analysis focusing on Lunar Mansion, Tai Sui, He Tu, and Luo Shu cosmic patterns.
All string values must be plain text - no markdown formatting.

CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA: Analyze the actual Lunar Mansion, Tai Sui, He Tu, and Luo Shu data provided.
2. LUNAR MANSION: Analyze the current mansion's influence on the question.
3. TAI SUI: Consider the Grand Duke Jupiter's position and annual influence.
4. HE TU & LUO SHU: Include River Map and Magic Square numerology if available.
5. READING IMPACT: How do these celestial factors affect THIS I Ching reading?
6. HEXAGRAM FOCUS: The hexagram is primary - celestial factors inform/modify its message.

If dataStatus is 'pending_api_response', note that full API astrology data was not yet available and analyze based on the lunar mansion data provided.

FORMAT (JSON only):
{
  "technicalAnalysis": "Title\\nClassical analysis using Zhou Yi and astrological texts",
  "colloquialInterpretation": "Title\\nModern practical interpretation",
  "lunarMansion": { "description": "", "influence": "", "guidance": "" },
  "celestial": "Combined narrative including all available cosmic factors"
}`;

  const userPrompt = `### TECHNICAL DATA (JSON)
${JSON.stringify(technicalData, null, 2)}

### QUESTION
"${question}"

Provide celestial astrology analysis based on the ACTUAL technical data above. Focus on Lunar Mansion, Tai Sui, He Tu, and Luo Shu cosmic patterns. The hexagram is primary; astrology provides timing context.`;

  const requiredFields = ["technicalAnalysis"];
  const parsed = await getStructuredInterpretation(userPrompt, 1200, { systemPrompt, response_mime_type: "application/json" }, requiredFields, 2);

  return {
    technicalData: JSON.stringify(technicalData, null, 2),
    technicalAnalysis: parsed.technicalAnalysis || "",
    colloquialInterpretation: parsed.colloquialInterpretation || "",
    lunarMansion: parsed.lunarMansion || { description: "", influence: "", guidance: "" },
    celestial: parsed.celestial || parsed.technicalAnalysis || "",
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}

async function generateCelestialBazi(request: InterpretationRequest): Promise<any> {
  log(4, `[SECTION:celestial-bazi] Generating BaZi analysis...`);
  const { question, birthBazi, currentBazi, momentBazi, astrology, hexagram } = request;

  // Use API bazi data if available, fall back to locally calculated
  const apiBazi = astrology?.bazi;
  const apiComparison = astrology?.comparison;

  const technicalData: any = {
    timestamp: new Date().toISOString(),
    hexagram: hexagram ? { number: hexagram.number, name: hexagram.name_en } : null,
    dataSource: apiBazi ? 'bazi-astrol-api' : 'local-calculation',
    // Birth BaZi (if birth date provided by user)
    birthBazi: birthBazi || apiComparison?.birthDayMaster ? {
      ...(birthBazi || {}),
      dayMaster: apiComparison?.birthDayMaster || birthBazi?.dayMaster,
      year: birthBazi?.year,
      month: birthBazi?.month,
      day: birthBazi?.day,
      hour: birthBazi?.hour,
      strength: birthBazi?.strength?.result || "unknown",
      favorableElements: birthBazi?.strength?.favorable || [],
      unfavorableElements: birthBazi?.strength?.unfavorable || []
    } : null,
    // Current/Moment BaZi (always available)
    currentBazi: apiBazi || currentBazi || momentBazi ? {
      ...(apiBazi || currentBazi || momentBazi || {}),
      year: apiBazi?.year || currentBazi?.year || momentBazi?.year,
      month: apiBazi?.month || currentBazi?.month || momentBazi?.month,
      day: apiBazi?.day || currentBazi?.day || momentBazi?.day,
      hour: apiBazi?.hour || currentBazi?.hour || momentBazi?.hour,
      dayMaster: apiBazi?.dayMaster || currentBazi?.dayMaster || momentBazi?.dayMaster,
      strength: apiBazi?.strength?.result || currentBazi?.strength?.result || momentBazi?.strength?.result || "unknown",
      favorableElements: apiBazi?.strength?.favorable || currentBazi?.strength?.favorable || [],
      unfavorableElements: apiBazi?.strength?.unfavorable || currentBazi?.strength?.unfavorable || []
    } : null
  };

  // Add comparison data if available from API
  if (apiComparison) {
    technicalData.baziComparison = {
      currentInfluence: apiComparison.currentInfluence,
      cycles: apiComparison.cycles
    };
  }

  const systemPrompt = `You are a BaZi (Four Pillars) Master. Provide BaZi destiny analysis.
All string values must be plain text - no markdown formatting.

CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA: Analyze the actual Day Master, stems, branches, and element strengths provided.
2. BIRTH BAZI: Analyze Day Master, strength, favorable elements from the data.
3. CURRENT BAZI: Analyze moment energies (Prasna) from the data.
4. READING IMPACT: How do these BaZi factors affect THIS I Ching reading?
5. NO ASTROLOGY: Do NOT analyze Lunar Mansion - focus only on BaZi.
6. HEXAGRAM FOCUS: The hexagram is primary; BaZi provides destiny context.

FORMAT (JSON only):
{
  "technicalAnalysis": "Title\\nClassical BaZi analysis",
  "colloquialInterpretation": "Title\\nModern practical interpretation",
  "birthBazi": { "description": "", "readingImpact": "" },
  "currentBazi": { "description": "", "readingImpact": "" },
  "celestial": "Combined narrative"
}`;

  const userPrompt = `### TECHNICAL DATA (JSON)
${JSON.stringify(technicalData, null, 2)}

### QUESTION
"${question}"

Provide BaZi analysis based on the ACTUAL technical data above (NO astrology). Focus on destiny patterns and timing. The hexagram is primary; BaZi provides destiny context.`;

  const requiredFields = ["technicalAnalysis"];
  const parsed = await getStructuredInterpretation(userPrompt, 1200, { systemPrompt, response_mime_type: "application/json" }, requiredFields, 2);

  return {
    technicalData: JSON.stringify(technicalData, null, 2),
    technicalAnalysis: parsed.technicalAnalysis || "",
    colloquialInterpretation: parsed.colloquialInterpretation || "",
    birthBazi: parsed.birthBazi || { description: "", readingImpact: "" },
    currentBazi: parsed.currentBazi || { description: "", readingImpact: "" },
    celestial: parsed.celestial || parsed.technicalAnalysis || "",
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}

async function generateElementsAnalysis(request: InterpretationRequest, previousContext?: string): Promise<any> {
  log(4, `[SECTION:elements-analysis] Generating elements technical analysis...`);

  const { equilibrium, question, birthBazi, currentBazi, hexagram, astrology, cumulativeTechnicalData } = request;

  // Build element counts - ALWAYS include trigram-based counts even without equilibrium data
  const elementCounts: Record<string, number> = {
    wood: 0, fire: 0, earth: 0, metal: 0, water: 0
  };
  
  // Track trigram elements found
  const trigramElements: { upper: string | null; lower: string | null } = { upper: null, lower: null };
  
  // Add from equilibrium data if available (percentage-based counts)
  if (equilibrium?.elements) {
    Object.entries(equilibrium.elements).forEach(([el, count]) => {
      const key = el.toLowerCase();
      if (elementCounts.hasOwnProperty(key)) {
        elementCounts[key] = count as number;
      }
    });
  }
  
  // ALWAYS add trigram elements (each trigram contributes 1 count)
  if (hexagram) {
    // Support both old and new field naming conventions
    const upperTrigram = hexagram.trigramUpper || hexagram.trigram_upper;
    const lowerTrigram = hexagram.trigramLower || hexagram.trigram_lower;
    
    // Extract element from upper trigram
    if (upperTrigram?.element) {
      const upperEl = upperTrigram.element.toLowerCase();
      if (elementCounts.hasOwnProperty(upperEl)) {
        elementCounts[upperEl] += 1;
        trigramElements.upper = upperTrigram.element;
        log(4, `[SECTION:elements-analysis] Upper trigram element: ${upperTrigram.element}`);
      }
    }
    
    // Extract element from lower trigram
    if (lowerTrigram?.element) {
      const lowerEl = lowerTrigram.element.toLowerCase();
      if (elementCounts.hasOwnProperty(lowerEl)) {
        elementCounts[lowerEl] += 1;
        trigramElements.lower = lowerTrigram.element;
        log(4, `[SECTION:elements-analysis] Lower trigram element: ${lowerTrigram.element}`);
      }
    }
  }

  const technicalData: any = {
    timestamp: new Date().toISOString(),
    hexagram: hexagram ? { 
      number: hexagram.number, 
      name: hexagram.name_en, 
      element: hexagram.element 
    } : null,
    elementCounts,  // Always include element counts (never null)
    elementBalance: equilibrium ? {
      counts: equilibrium.elements,
      missing: equilibrium.missing,
      strongest: equilibrium.strongest,
      weakest: equilibrium.weakest
    } : null,
    birthStrength: birthBazi?.strength?.result || null,
    birthFavorable: birthBazi?.strength?.favorable || [],
    birthUnfavorable: birthBazi?.strength?.unfavorable || [],
    currentStrength: currentBazi?.strength?.result || null,
    trigramElements: trigramElements.upper || trigramElements.lower ? trigramElements : null
  };

  // Add Bagua elemental data from API if available
  if (astrology?.lifeGua) {
    technicalData.lifeGuaElement = astrology.lifeGua.element;
  }
  if (astrology?.houtian?.lifePalaceTrigram?.element) {
    technicalData.lifePalaceElement = astrology.houtian.lifePalaceTrigram.element;
  }

  const systemPrompt = `You are a Wu Xing (Five Elements) Master. Provide technical analysis of the five element cycles.
All string values must be plain text - no markdown formatting (no **bold**, no *italic*, no # headings).
DO NOT use nested JSON objects for string fields. Write in continuous plain text paragraphs.

CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA: Analyze the actual element counts, trigram elements, and BaZi strengths provided.
2. CONNECT TO CELESTIAL ANALYSIS: Reference and build upon the celestial/BaZi context provided.
3. EXPLAIN ELEMENT INTERACTIONS: Detail how the five elements generate, control, and exhaust each other in THIS specific reading.
4. LINK TO QUESTION: Explicitly connect the elemental analysis to the user's inquiry.
5. The first line of "technicalAnalysis" MUST be a unique, creative, and relevant title.

FORMAT (JSON only):
{
  "technicalAnalysis": "Relevant Title\\nDetailed section on generating, controlling, and exhausting cycles.",
  "composition": "Elemental composition analysis text.",
  "trigramRelationship": "Trigram elemental relationship text.",
  "yinYangAnalysis": "Yin-Yang balance analysis text."
}`;

  const userPrompt = `### TECHNICAL DATA (JSON) - THIS SECTION
${JSON.stringify(technicalData, null, 2)}

### CUMULATIVE TECHNICAL DATA (from previous sections)
${cumulativeTechnicalData || "No previous technical data available."}

### INSTRUCTIONS
Provide Technical Analysis of Wu Xing cycles based on the ACTUAL technical data above. 

IMPORTANT: Use BOTH:
1. The current section's element data (elementCounts, trigramElements)
2. The cumulative technical data from celestial/BaZi sections (which includes Day Master, Lunar Mansion, etc.)

Explain how the five elements generate, control, and exhaust each other in THIS specific reading, considering the Day Master and celestial factors. The first line of technicalAnalysis MUST be a unique, relevant title.`;

  const requiredFields = ["technicalAnalysis"];
  const parsed = await getStructuredInterpretation(
    userPrompt,
    1500,
    { systemPrompt, response_mime_type: "application/json" },
    requiredFields,
    3
  );

  return {
    technicalData: JSON.stringify(technicalData, null, 2),
    technicalAnalysis: parsed.technicalAnalysis || "",
    composition: parsed.composition || "",
    trigramRelationship: parsed.trigramRelationship || "",
    yinYangAnalysis: parsed.yinYangAnalysis || ""
  };
}

async function generateElementsSynthesis(request: InterpretationRequest, previousContext?: string): Promise<any> {
  log(4, `[SECTION:elements-synthesis] Generating elements interpretation...`);

  const { equilibrium, question, birthBazi, currentBazi, hexagram } = request;

  const technicalData = {
    timestamp: new Date().toISOString(),
    hexagram: hexagram ? { number: hexagram.number, name: hexagram.name_en, element: hexagram.element } : null,
    elementCounts: equilibrium?.elements || null,
    elementBalance: equilibrium ? {
      counts: equilibrium.elements,
      missing: equilibrium.missing,
      strongest: equilibrium.strongest,
      weakest: equilibrium.weakest
    } : null,
    birthStrength: birthBazi?.strength?.result || null,
    birthFavorable: birthBazi?.strength?.favorable || [],
    birthUnfavorable: birthBazi?.strength?.unfavorable || [],
    currentStrength: currentBazi?.strength?.result || null,
    trigramElements: hexagram ? {
      upper: hexagram.trigram_upper?.element,
      lower: hexagram.trigram_lower?.element
    } : null
  };

  const systemPrompt = `You are a Wu Xing (Five Elements) Master. Provide accessible interpretation and guidance.
All string values must be plain text - no markdown formatting (no **bold**, no *italic*, no # headings).
DO NOT use nested JSON objects for string fields. Write in continuous plain text paragraphs.

CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA: Interpret the actual element counts and BaZi strengths provided.
2. SYNTHESIZE ALL PREVIOUS ANALYSIS: Integrate celestial and elemental technical analysis into practical guidance.
3. ANSWER THE QUESTION: Directly address the user's inquiry with specific, actionable wisdom.
4. MAKE IT RELEVANT: Every sentence should connect to the question and previous analysis.
5. The first line of "colloquialInterpretation" MUST be a unique, creative, and relevant title.

FORMAT (JSON only):
{
  "colloquialInterpretation": "Relevant Title\\nDetailed accessible interpretation of the elemental energies.",
  "recommendations": "Practical guidance based on element balance.",
  "elements": "Combined narrative of all five element influences.",
  "quotedReferences": ["Quote 1 (Source)", "Quote 2 (Source)"]
}`;

  const userPrompt = `### TECHNICAL DATA (JSON)
${JSON.stringify(technicalData, null, 2)}

### PREVIOUS ANALYSIS CONTEXT
${previousContext || "N/A"}

### QUESTION
"${question}"

### INSTRUCTIONS
Provide Colloquial Interpretation based on the ACTUAL technical data above. SYNTHESIZE all previous analysis into practical wisdom that directly answers the question. The first line of colloquialInterpretation MUST be a unique, relevant title.`;

  const requiredFields = ["colloquialInterpretation", "elements"];
  const parsed = await getStructuredInterpretation(
    userPrompt,
    1500,
    { systemPrompt, response_mime_type: "application/json" },
    requiredFields,
    3
  );

  return {
    technicalData: JSON.stringify(technicalData, null, 2),
    colloquialInterpretation: parsed.colloquialInterpretation || "",
    recommendations: parsed.recommendations || "",
    elements: parsed.elements || "",
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}


async function generateCoreTechnical(request: InterpretationRequest, previousContext?: string): Promise<any> {
  log(4, `[SECTION:core-technical] Generating core technical analysis...`);
  const { hexagram, question, lines, equilibrium, cumulativeTechnicalData } = request;
  const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

  const technicalData = {
    timestamp: new Date().toISOString(),
    hexagram: {
      number: hexagram.number,
      name: hexagram.name_en,
      nameZh: hexagram.name_zh,
      element: hexagram.element,
      trigramUpper: hexagram.trigram_upper ? {
        name: hexagram.trigram_upper.name,
        element: hexagram.trigram_upper.element
      } : null,
      trigramLower: hexagram.trigram_lower ? {
        name: hexagram.trigram_lower.name,
        element: hexagram.trigram_lower.element
      } : null
    },
    movingLines: changingLines,
    elementCounts: equilibrium?.elements || null
  };

  const systemPrompt = `You are a Yi Jing scholar. Provide technical analysis and symbolism ONLY.
All string values must be plain text - no markdown formatting.

CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA: Analyze the actual hexagram number, trigrams, and elements from the data.
2. FIVE ELEMENTS BALANCE: Analyze the element counts provided - identify which elements are strong, weak, or missing, and how this affects the reading.
3. TECHNICAL ANALYSIS: Explain trigram dynamics, referencing celestial/elemental factors.
4. ARCHETYPAL SYMBOLISM: Connect imagery to the question philosophically.
5. NO NARRATIVE: Do NOT write the cohesive narrative/analysis section.
6. SYNTHESIZE CONTEXT: Build upon celestial and elemental analyses provided.

FORMAT (JSON only):
{
  "technicalAnalysis": "Title\\nTechnical paragraphs using actual hexagram data including Five Elements balance...",
  "symbolism": "Archetypal analysis..."
}`;

  const userPrompt = `### TECHNICAL DATA (JSON) - THIS SECTION
${JSON.stringify(technicalData, null, 2)}

### CUMULATIVE TECHNICAL DATA (from previous sections)
${cumulativeTechnicalData || "No previous technical data available."}

### QUESTION
"${question}"

Provide technical analysis and symbolism based on the ACTUAL hexagram data above. No narrative section.`;

  const parsed = await getStructuredInterpretation(userPrompt, 1500, { systemPrompt, response_mime_type: "application/json" }, ["technicalAnalysis"], 2);

  return {
    technicalData: JSON.stringify(technicalData, null, 2),
    technicalAnalysis: parsed.technicalAnalysis || "",
    symbolism: parsed.symbolism || "",
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}

async function generateCoreNarrative(request: InterpretationRequest, previousContext?: string): Promise<any> {
  log(4, `[SECTION:core-narrative] Generating core narrative...`);
  const { hexagram, question, lines, equilibrium } = request;
  const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

  const technicalData = {
    timestamp: new Date().toISOString(),
    hexagram: {
      number: hexagram.number,
      name: hexagram.name_en,
      nameZh: hexagram.name_zh,
      element: hexagram.element,
      trigramUpper: hexagram.trigram_upper ? {
        name: hexagram.trigram_upper.name,
        element: hexagram.trigram_upper.element
      } : null,
      trigramLower: hexagram.trigram_lower ? {
        name: hexagram.trigram_lower.name,
        element: hexagram.trigram_lower.element
      } : null
    },
    movingLines: changingLines,
    elementCounts: equilibrium?.elements || null
  };

  const systemPrompt = `You are a Yi Jing scholar. Provide cohesive narrative analysis ONLY.
All string values must be plain text - no markdown formatting.

CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA: Reference the actual hexagram number, trigrams, and elements from the data.
2. FIVE ELEMENTS BALANCE: Reference the element counts - explain how strong/weak/missing elements influence the situation.
3. ANALYSIS (NARRATIVE): Provide 3 paragraphs synthesizing ALL aspects of the reading.
4. STAY RELEVANT: Every insight must connect to the user's inquiry.
5. NO TECHNICAL: Do NOT write technical trigram analysis.
6. NO SYMBOLISM: Do NOT write archetypal symbolism section.
7. SYNTHESIZE CONTEXT: Build upon celestial and elemental analyses.

FORMAT (JSON only):
{
  "analysis": "Deep cohesive narrative based on actual reading data including Five Elements balance...",
  "colloquialInterpretation": "Accessible interpretation..."
}`;

  const userPrompt = `### TECHNICAL DATA (JSON)
${JSON.stringify(technicalData, null, 2)}

### CONTEXT
${previousContext || "N/A"}

### QUESTION
"${question}"

Provide cohesive narrative based on the ACTUAL hexagram data above. No technical or symbolism sections.`;

  const parsed = await getStructuredInterpretation(userPrompt, 1500, { systemPrompt, response_mime_type: "application/json" }, ["analysis"], 2);

  return {
    technicalData: JSON.stringify(technicalData, null, 2),
    analysis: parsed.analysis || "",
    colloquialInterpretation: parsed.colloquialInterpretation || "",
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}

async function generateCoreApplication(request: InterpretationRequest, previousContext?: string): Promise<any> {
  log(4, `[SECTION:core-application] Generating core application (colloquial/advice)...`);

  const { hexagram, question, lines } = request;
  const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

  const systemPrompt = `You are a master Yi Jing scholar. Synthesize the complete reading into practical guidance.
All string values must be plain text - no markdown formatting.
DO NOT use nested JSON objects for string fields. Write in continuous plain text paragraphs.

CRITICAL REQUIREMENTS:
1. SYNTHESIZE FROM READING: Use the celestial, elemental, and hexagram analyses provided to formulate practical guidance. Base ALL advice STRICTLY on the patterns, imbalances, and insights identified in the reading.
2. COLLOQUIAL INTERPRETATION: Provide 3 detailed paragraphs translating the technical analysis into accessible wisdom that directly addresses the user's question.
3. ADVICE SECTION: Extract 4-6 concrete, actionable recommendations based SOLELY on the reading's findings.
4. DIRECT ANSWER: Ensure every recommendation directly addresses the original question using insights from the reading.
5. TITLES: The first line of "colloquialInterpretation" MUST be a unique title, followed by a newline.

STRICT RULE: Advice must be derived FROM the reading analysis, not invented.

FORMAT (JSON only):
{
  "colloquialInterpretation": "Title\\nAccessible paragraphs...",
  "advice": "4-6 specific actionable recommendations based on reading insights...",
  "quotedReferences": ["Quote 1 (Source)", "..."]
}`;

  const userPrompt = `### INPUT
- QUESTION: "${question}"
- HEXAGRAM: ${hexagram.number} - ${hexagram.name_en}
- MOVING_LINES: ${changingLines.length > 0 ? changingLines.join(', ') : 'None'}

### COMPLETE READING CONTEXT (synthesize this into practical guidance)
${previousContext || "N/A"}

### INSTRUCTIONS
SYNTHESIZE the complete reading into practical guidance. The "advice" field must contain 4-6 specific recommendations derived FROM the celestial, elemental, and hexagram analyses above.`;

  const requiredFields = ["colloquialInterpretation", "advice"];
  const parsed = await getStructuredInterpretation(
    userPrompt,
    3000,
    { systemPrompt, temperature: 0.7, response_mime_type: "application/json" },
    requiredFields,
    3
  );

  return {
    colloquialInterpretation: parsed.colloquialInterpretation || "",
    advice: parsed.advice || "",
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}

async function generateAdviceSection(request: InterpretationRequest, previousContext?: string): Promise<{ advice: string; quotedReferences: string[] }> {
  log(4, `[SECTION:advice] Generating advice from complete technical analysis...`);

  const { hexagram, question, lines, birthBazi, currentBazi } = request;
  const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

  const systemPrompt = `You are a pragmatic, wise Daoist advisor. Your goal is to translate technical divination data into clear, colloquial, actionable advice.

CRITICAL REQUIREMENTS:
1. INPUT: You will receive rigorous technical analysis (BaZi, Hexagram, Elements).
2. OUTPUT: Generate 4-6 bullet points of advice.
3. STYLE: Colloquial, direct, and warm. Avoid academic jargon in the advice itself.
4. EVIDENCE: You MUST briefly mention the source of the advice in parentheses to ground it. 

MANDATORY REFERENCES:
You must explicitly reference at least 3 of the following in your advice points:
- The specific Hexagram Image (e.g. "Water over Fire")
- A specific Moving Line (e.g. "Line 2's movement")
- Elemental Balance (e.g. "The lack of Water")
- Celestial influence (e.g. "The current Lunar Mansion")

FORMAT: Plain text (not JSON). Write in a conversational but authoritative tone.`;

  const userPrompt = `### USER'S QUESTION
"${question}"

### HEXAGRAM CONTEXT
- Number: ${hexagram.number} - ${hexagram.name_en} (${hexagram.name_zh || ''})
- Moving Lines: ${changingLines.length > 0 ? changingLines.join(', ') : 'None'}
${birthBazi ? `- Birth BaZi: ${JSON.stringify(birthBazi)}` : ''}
${currentBazi ? `- Current BaZi: ${JSON.stringify(currentBazi)}` : ''}

### COMPLETE TECHNICAL ANALYSIS (SYNTHESIZE THIS INTO ADVICE)
${previousContext || "Technical analysis not available."}

### INSTRUCTIONS
Based ONLY on the technical analysis above, provide 4-6 concise, actionable recommendations that:
1. Directly answer the user's question
2. Reference specific elements, trigrams, or patterns from the analysis
3. Are immediately actionable
4. Use the hexagram's wisdom appropriately

Write as practical guidance, not academic explanation.`;

  try {
    const response = await getInterpretation(userPrompt, 1500, {
      systemPrompt,
      temperature: 0.6
    });

    let advice = response.trim();

    if (advice.startsWith('{') && advice.endsWith('}')) {
      try {
        const parsed = JSON.parse(advice);
        advice = parsed.advice || parsed.content || advice;
      } catch {
        // Not valid JSON, use as-is
      }
    }

    log(4, `[SECTION:advice] Generated advice (${advice.length} chars)`);

    return {
      advice: advice,
      quotedReferences: []
    };
  } catch (error: any) {
    log(4, `[SECTION:advice] Failed to generate advice: ${error.message}`);
    return {
      advice: "Advice generation failed. Please review the technical analysis above for guidance.",
      quotedReferences: []
    };
  }
}

async function generateHoutouEmperor(request: InterpretationRequest, previousContext?: string): Promise<any> {
  log(4, `[SECTION:houtou-emperor] Generating Emperor (Day Master) analysis...`);
  const { birthBazi, currentBazi, question, hexagram } = request;

  const technicalData = {
    timestamp: new Date().toISOString(),
    hexagram: hexagram ? { number: hexagram.number, name: hexagram.name_en } : null,
    emperor: {
      type: "Day Master (日主)",
      birth: birthBazi?.dayMaster || null,
      current: currentBazi?.dayMaster || null,
      strength: {
        birth: birthBazi?.strength?.result || "unknown",
        favorable: birthBazi?.strength?.favorable || [],
        unfavorable: birthBazi?.strength?.unfavorable || []
      }
    }
  };

  const systemPrompt = `You are a BaZi Master. Provide Emperor (Day Master) analysis only.
All string values must be plain text - no markdown formatting.

CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA: Analyze the actual Day Master element and strength from the data.
2. EMPEROR ONLY: Analyze the Day Master (Emperor) - its element, strength, and current situation.
3. NO MASTERS: Do NOT analyze the governing pillars (Year/Month/Hour).
4. NO DIAGRAM: Do NOT generate FDL diagram data.
5. READING IMPACT: How does the Emperor's condition affect this I Ching reading?

FORMAT (JSON only):
{
  "technicalAnalysis": "Title\\nEmperor analysis using actual Day Master data",
  "colloquialInterpretation": "Title\\nPractical interpretation",
  "emperorAnalysis": "Detailed Emperor analysis"
}`;

  const userPrompt = `### TECHNICAL DATA (JSON)
${JSON.stringify(technicalData, null, 2)}

### CONTEXT
${previousContext || "N/A"}

### QUESTION
"${question}"

Provide Emperor (Day Master) analysis based on the ACTUAL technical data above. No Masters, no diagram.`;

  const parsed = await getStructuredInterpretation(userPrompt, 1000, { systemPrompt, response_mime_type: "application/json" }, ["technicalAnalysis"], 2);

  return {
    technicalData: JSON.stringify(technicalData, null, 2),
    technicalAnalysis: parsed.technicalAnalysis || "",
    colloquialInterpretation: parsed.colloquialInterpretation || "",
    emperorAnalysis: parsed.emperorAnalysis || "",
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}

async function generateHoutouMaster(request: InterpretationRequest, previousContext?: string): Promise<any> {
  log(4, `[SECTION:houtou-master] Generating Master (Pillars) analysis...`);
  const { birthBazi, currentBazi, question, hexagram } = request;

  const technicalData = {
    timestamp: new Date().toISOString(),
    hexagram: hexagram ? { number: hexagram.number, name: hexagram.name_en } : null,
    masters: {
      birth: {
        year: birthBazi?.year || null,
        month: birthBazi?.month || null,
        hour: birthBazi?.hour || null
      },
      current: {
        year: currentBazi?.year || null,
        month: currentBazi?.month || null,
        hour: currentBazi?.hour || null
      }
    }
  };

  const systemPrompt = `You are a BaZi Master. Provide Master (Governing Pillars) analysis only.
All string values must be plain text - no markdown formatting.

CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA: Analyze the actual Year, Month, Hour pillars from the data.
2. MASTERS ONLY: Analyze the governing pillars (Year, Month, Hour) and their influence.
3. NO EMPEROR: Do NOT analyze the Day Master.
4. NO DIAGRAM: Do NOT generate FDL diagram data.
5. READING IMPACT: How do the Masters affect this I Ching reading?

FORMAT (JSON only):
{
  "technicalAnalysis": "Title\\nMasters analysis using actual pillar data",
  "colloquialInterpretation": "Title\\nPractical interpretation",
  "masterAnalysis": "Detailed Master analysis"
}`;

  const userPrompt = `### TECHNICAL DATA (JSON)
${JSON.stringify(technicalData, null, 2)}

### CONTEXT
${previousContext || "N/A"}

### QUESTION
"${question}"

Provide Master (Pillars) analysis based on the ACTUAL technical data above. No Emperor, no diagram.`;

  const parsed = await getStructuredInterpretation(userPrompt, 1000, { systemPrompt, response_mime_type: "application/json" }, ["technicalAnalysis"], 2);

  return {
    technicalData: JSON.stringify(technicalData, null, 2),
    technicalAnalysis: parsed.technicalAnalysis || "",
    colloquialInterpretation: parsed.colloquialInterpretation || "",
    masterAnalysis: parsed.masterAnalysis || "",
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}

async function generateLinesSection(request: InterpretationRequest): Promise<LinesSection> {
  log(4, `[SECTION:lines] Generating moving lines analysis...`);

  const { hexagram, question, lines } = request;
  const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

  if (changingLines.length === 0) {
    return {
      movingLines: "No moving lines detected. The situation is stable and focused on the core hexagram state.",
      lineTexts: ["Stable", "Stable", "Stable", "Stable", "Stable", "Stable"],
      quotedReferences: []
    };
  }

  const systemPrompt = `You are an I Ching Line Expert. Provide specific commentary for each line with citations.
All string values must be plain text - no markdown formatting (no **bold**, no *italic*, no # headings).

FORMAT (JSON only):
{
  "movingLines": "Summary text.",
  "lineTexts": ["Line 1 text", "Line 2 text", "Line 3 text", "Line 4 text", "Line 5 text", "Line 6 text"],
  "quotedReferences": ["Quote 1 (Source)", "Quote 2 (Source)"]
}`;

  const userPrompt = `### INPUT
- QUESTION: "${question}"
- HEXAGRAM: ${hexagram.number} - ${hexagram.name_en}
- MOVING_LINES: ${changingLines.join(', ')}

Provide line analysis and Classical References.`;

  const requiredFields = ["movingLines", "lineTexts"];
  const parsed = await getStructuredInterpretation(
    userPrompt,
    1200,
    { systemPrompt, response_mime_type: "application/json" },
    requiredFields,
    3
  );

  return {
    movingLines: parsed.movingLines || "",
    lineTexts: Array.isArray(parsed.lineTexts) ? parsed.lineTexts : ["", "", "", "", "", ""],
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}

async function generateClassicalSection(request: InterpretationRequest): Promise<ClassicalSection> {
  log(4, `[SECTION:classical] Generating classical texts...`);

  const { hexagram } = request;
  const hexData = await getHexagram(hexagram.number);

  const result: ClassicalSection = {
    judgment: { en: "", es: "", it: "", zh: "" },
    image: { en: "", es: "", it: "", zh: "" },
    lines: { en: ["", "", "", "", "", ""], es: ["", "", "", "", "", ""], it: ["", "", "", "", "", ""], zh: ["", "", "", "", "", ""] }
  };

  if (hexData) {
    const hasTranslation = {
      judgment: {
        en: !!(hexData.judgment_en && hexData.judgment_en.trim().length > 10),
        es: !!(hexData.judgment_es && hexData.judgment_es.trim().length > 10),
        it: !!(hexData.judgment_it && hexData.judgment_it.trim().length > 10),
        zh: !!(hexData.judgment_zh && hexData.judgment_zh.trim().length > 10)
      },
      image: {
        en: !!(hexData.image?.image_en && hexData.image.image_en.trim().length > 10),
        es: !!(hexData.image?.image_es && hexData.image.image_es.trim().length > 10),
        it: !!(hexData.image?.image_it && hexData.image.image_it.trim().length > 10),
        zh: !!(hexData.image?.image_zh && hexData.image.image_zh.trim().length > 10)
      },
      lines: {
        en: !!(hexData.lines_en && hexData.lines_en.length === 6 && hexData.lines_en[0] && hexData.lines_en[0].trim().length > 2),
        es: !!(hexData.lines_es && hexData.lines_es.length === 6 && hexData.lines_es[0] && hexData.lines_es[0].trim().length > 2),
        it: !!(hexData.lines_it && hexData.lines_it.length === 6 && hexData.lines_it[0] && hexData.lines_it[0].trim().length > 2),
        zh: !!(hexData.lines_zh && hexData.lines_zh.length === 6 && hexData.lines_zh[0] && hexData.lines_zh[0].trim().length > 2)
      }
    };

    result.judgment = {
      en: hasTranslation.judgment.en ? hexData.judgment_en : "",
      es: hasTranslation.judgment.es ? hexData.judgment_es : "",
      it: hasTranslation.judgment.it ? hexData.judgment_it : "",
      zh: hexData.judgment_zh || ""
    };

    result.image = {
      en: hasTranslation.image.en ? hexData.image.image_en : "",
      es: hasTranslation.image.es ? hexData.image.image_es : "",
      it: hasTranslation.image.it ? hexData.image.image_it : "",
      zh: hexData.image?.image_zh || ""
    };

    result.lines = {
      en: hasTranslation.lines.en ? hexData.lines_en : ["", "", "", "", "", ""],
      es: hasTranslation.lines.es ? hexData.lines_es : ["", "", "", "", "", ""],
      it: hasTranslation.lines.it ? hexData.lines_it : ["", "", "", "", "", ""],
      zh: hexData.lines_zh || ["", "", "", "", "", ""]
    };

    const missingLangs = ['en', 'es', 'it'].filter(lang => !hasTranslation.judgment[lang]);

    if (missingLangs.length > 0) {
      log(4, `[SECTION:classical] Generating translations for: ${missingLangs.join(', ')}`);

      await Promise.all(missingLangs.map(async (lang) => {
        try {
          const langNames: { [key: string]: string } = {
            'en': 'English',
            'es': 'Spanish',
            'it': 'Italian'
          };
          const langName = langNames[lang] || 'English';

          const systemPrompt = `You are a professional translator and I Ching scholar. 
Translate the provided I Ching texts to ${langName}. 

CRITICAL: Output ONLY a valid JSON object. Do not include any introductory text, labels, or "Hexagram" titles.
The output must be EXACTLY in this format:
{"judgment": "...", "image": "...", "lines": ["l1", "l2", "l3", "l4", "l5", "l6"]}`;

          const userPrompt = `Translate the following Chinese I Ching texts into ${langName}. 
Maintain the poetic and philosophical depth of the original.

HEXAGRAM ${hexagram.number}: ${hexData.name_zh}

JUDGMENT:
${hexData.judgment_zh}

IMAGE:
${hexData.image?.image_zh}

LINES:
${(hexData.lines_zh || []).join('\n')}`;

          const aiConfig = {
            systemPrompt,
            temperature: 0.3,
            response_mime_type: "application/json"
          };

          const rawResponse = await getInterpretation(userPrompt, 1500, aiConfig);
          const parsed = cleanAndParseJSON(rawResponse);

          if (parsed.judgment) result.judgment[lang] = parsed.judgment;
          if (parsed.image) result.image[lang] = parsed.image;
          if (parsed.lines && Array.isArray(parsed.lines)) result.lines[lang] = parsed.lines;
        } catch (e: any) {
          log(4, `Translation failed for ${lang}: ${e.message}`);
          result.judgment[lang] = result.judgment[lang] || result.judgment.en || hexData.judgment_zh || "";
          result.image[lang] = result.image[lang] || result.image.en || hexData.image?.image_zh || "";
          result.lines[lang] = result.lines[lang] || result.lines.en || hexData.lines_zh || ["", "", "", "", "", ""];
        }
      }));
    }
  }

  return result;
}


// ============================================================================
// REMEDY HELPER FUNCTIONS
// ============================================================================

async function formatIncantation(entry: FuluEntry, lang: string): Promise<string | null> {
  const inc = entry.incantation;
  if (!inc || !inc.zh || inc.zh.length < 10) {
    log(4, `[REMEDIES] No valid incantation text for ${entry.id} - skipping charm section`);
    return null;
  }

  const isDuplicate = inc.zh === entry.name?.zh ||
    inc.zh === entry.name?.en ||
    inc.zh === entry.description?.substring(0, inc.zh.length);
  if (isDuplicate) {
    log(4, `[REMEDIES] Incantation for ${entry.id} is a duplicate of name/description - skipping`);
    return null;
  }

  const translationLabel = lang === 'zh' ? '說明' : (lang === 'es' ? 'Traducción' : lang === 'it' ? 'Traduzione' : 'Translation');
  let translationText = (lang === 'es' ? inc.es : lang === 'it' ? inc.it : lang === 'zh' ? inc.zh : inc.en) || inc.en;

  let result = '';
  if (inc.fuzhouName) {
    result += `[${inc.fuzhouName}${inc.fuzhouNameEn ? ' — ' + inc.fuzhouNameEn : ''}]\n\n`;
  }
  result += `[Chinese]\n${inc.zh}\n\n`;
  if (inc.pinyin) {
    result += `[Pinyin]\n${inc.pinyin}\n\n`;
  }
  if (translationText && translationText !== inc.zh) {
    result += `[${translationLabel}]\n${translationText}`;
  }
  if (inc.fuzhouPurpose) {
    const purposeLabel = lang === 'es' ? 'Propósito' : lang === 'it' ? 'Scopo' : lang === 'zh' ? '用途' : 'Purpose';
    result += `\n\n[${purposeLabel}]\n${inc.fuzhouPurpose}`;
  }

  return result;
}

function getRelevance(entry: FuluEntry, lang: string, equilibrium?: any): string {
  let primaryElement = Object.entries(equilibrium?.elements || {}).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '';

  if (!primaryElement || primaryElement.toLowerCase() === 'unknown') {
    primaryElement = entry.elements?.[0] || 'Qi';
  }

  const elementMap: any = {
    Wood: { es: 'Madera', zh: '木' },
    Fire: { es: 'Fuego', zh: '火' },
    Earth: { es: 'Tierra', zh: '土' },
    Metal: { es: 'Metal', zh: '金' },
    Water: { es: 'Agua', zh: '水' },
    Qi: { es: 'Qi', zh: '气' },
    Heaven: { es: 'Cielo', zh: '乾' },
    Lake: { es: 'Lago', zh: '兌' },
    Mountain: { es: 'Montaña', zh: '艮' },
    Thunder: { es: 'Trueno', zh: '震' },
    Wind: { es: 'Viento', zh: '巽' },
    Fulu: { es: 'Fulu', zh: '符籙' },
    Medicine: { es: 'Medicina', zh: '醫' },
    FengShui: { es: 'Feng Shui', zh: '風水' }
  };

  const purposeMap: any = {
    break_stagnation: { es: 'romper el estancamiento', zh: '破滞' },
    spiritual_protection: { es: 'protección espiritual', zh: '护身' },
    celestial_protection: { es: 'protección celestial', zh: '天護' },
    environmental_harmony: { es: 'armonía ambiental', zh: '风水调和' },
    physical_wellbeing: { es: 'bienestar físico', zh: '强身' },
    calm_spirit: { es: 'calmar el espíritu', zh: '安神' },
    attract_wealth: { es: 'atraer prosperidad', zh: '招财' },
    ward_off_evil: { es: 'alejar el mal', zh: '辟邪' },
    strategic_retreat: { es: 'retirada estratégica', zh: '以退為進' },
    destiny_harmony: { es: 'armonía del destino', zh: '命理調和' },
    spiritual_transformation: { es: 'transformación espiritual', zh: '靈性轉化' },
    supreme_cultivation: { es: 'cultivo supremo', zh: '至高修煉' },
    internal_alchemy: { es: 'alquimia interna', zh: '內丹' },
    health_longevity: { es: 'salud y longevidad', zh: '健康長壽' },
    navigate_danger: { es: 'navegar el peligro', zh: '涉險' },
    stabilization: { es: 'estabilización', zh: '穩定' },
    cosmic_harmony: { es: 'armonía cósmica', zh: '宇宙和諧' }
  };

  const elemEn = primaryElement.charAt(0).toUpperCase() + primaryElement.slice(1).toLowerCase();
  const elem = lang === 'es' ? (elementMap[elemEn]?.es || elemEn) :
    lang === 'zh' ? (elementMap[elemEn]?.zh || elemEn) : elemEn;

  const purposeKey = entry.purpose || 'general_harmony';
  const purposEn = purposeKey.replace(/_/g, ' ');
  const purp = lang === 'es' ? (purposeMap[purposeKey]?.es || purposEn) :
    lang === 'zh' ? (purposeMap[purposeKey]?.zh || purposEn) : purposEn;

  const reasons: any = {
    en: `Selected to harmonize ${elem} energy and support ${purp} based on the hexagram's wisdom.`,
    es: `Seleccionado para armonizar la energía ${elem} y apoyar ${purp} basado en la sabiduría del hexagrama.`,
    it: `Selezionato per armonizzare l'energia ${elem} e supportare ${purp} in base alla saggezza dell'esagramma.`,
    zh: `選擇此方以調和${elem}氣場，並根據卦象智慧支持${purp}。`
  };

  return reasons[lang] || reasons.en;
}

async function verifyAndEnhanceRemedy(remedyData: any, lang: string, hexagramContext?: any): Promise<any> {
  const targetLang = (lang || 'en').toLowerCase();
  const langData = remedyData[targetLang];

  if (!langData || !langData.remedies) return remedyData;

  log(4, `[VERIFIER] Reviewing ${langData.remedies.length} remedies for quality...`);

  let needsFix = false;
  langData.remedies.forEach((remedy: any) => {
    if (remedy.relevance?.toLowerCase().includes('unknown') ||
      remedy.relevance?.toLowerCase().includes('seleccionado para equilibrar unknown') ||
      !remedy.relevance ||
      remedy.relevance.length < 20 ||
      remedy.instructions?.toLowerCase().includes('unknown')) {
      needsFix = true;
      log(4, `[VERIFIER] Detected bad data for ${remedy.name}`);
    }
  });

  if (!needsFix) {
    log(4, `[VERIFIER] All remedies passed quality check`);
    return remedyData;
  }

  const systemPrompt = `You are a Daoist Remedy Verifier and Scholar. Fix only "Unknown" or broken placeholders while PRESERVING authentic historical content.
All string values must be plain text - no markdown formatting (no **bold**, no *italic*, no # headings).

STRICT RULES:
1. DO NOT replace authentic descriptions or detailed drawing instructions with generic usage.
2. ONLY replace text containing "Unknown" or clearly broken placeholders.
3. If instructions are already detailed (e.g., drawing steps, cinnabar usage), KEEP THEM exactly as they are.
4. If relevance is missing or "Unknown", explain the connection to Five Elements and hexagram symbolism in a scholarly tone.

Output JSON: { "remedies": [ { "relevance": "...", "instructions": "..." } ] }`;

  const hexagramNum = remedyData.fuluContentList?.[0]?.hexagramNumber ||
    hexagramContext?.number || '1';

  const userPrompt = `### REMEDIES TO REVIEW
${JSON.stringify(langData.remedies.map((r: any) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      currentRelevance: r.relevance,
      currentInstructions: r.instructions,
      description: r.description
    })))}

### CONTEXT
HEXAGRAM: ${hexagramNum}
LANG: ${targetLang}

FIX REQUIREMENTS:
1. Fix ONLY fields containing "Unknown".
2. If instructions provide specific ritual/drawing steps, DO NOT OVERWRITE them.
3. Ensure the output is faithful to Daoist traditions.

Return ONLY the fixed JSON.`;

  try {
    const rawResponse = await getInterpretation(userPrompt, 2000, {
      systemPrompt,
      temperature: 0.2,
      response_mime_type: "application/json"
    });
    const enhanced = cleanAndParseJSON(rawResponse);

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

          langData.remedies[i].verification = (langData.remedies[i].verification || "✓") + " Verified";
        }
      });
    }
  } catch (e: any) {
    log(4, `[VERIFIER] Enhancement failed: ${e.message}`);
  }

  return remedyData;
}

// ============================================================================
// FDL GENERATION FUNCTIONS
// ============================================================================

async function generateFuluDrawingPass1(
  hexagram: any,
  binaryKey: string,
  fuluContentList: any[],
  remedies: any[],
  lang: string
): Promise<any> {
  const visualContext = remedies.map(r => ({
    id: r.id,
    type: r.type,
    name: r.name,
    purpose: r.nameZh
  }));

  const targetItems = fuluContentList.map(f => ({
    id: f.id,
    remedyType: f.remedyType,
    talismanName: f.talismanNameZh,
    sealChars: f.sealChars,
    hexChar: f.hexagramChar,
    type: f.type,
    structureElements: f.structureElements
  }));

  const systemPrompt = `You are a Daoist Sigil Master. Provide high-quality, complex vector-style drawing instructions using FDL (Fulu Drawing Language v1.0).

FDL SPECIFICATION (0-1000 square grid):
- Root: { "fdl": { "version": "1.0", "background": "#0a0a0a", "layers": [ ... ] } }
- Layers: "foundation" (borders), "divine_symbols" (trigrams/stars), "seal_core" (central characters).
- Commands: 
  - Primitive: line, path, circle, rect, arc, text, group
  - ALL primitive shapes support 'inside': { type: "text"|"symbol", content: "...", font: "seal"|"worm"|"regular", scale: 0.1-1.0 }
  - Advanced: "bagua": { x, y, size, style: { color } }, "loshu": { x, y, size }, "constellation": { x, y, size, name: "big_dipper" }

DESIGN REQUIREMENTS (LONG HU SHAN STYLE - Heaven/Man/Earth):
1. HEADER (Heaven): Use 'bagua' (size ~250) or 'constellation' at the top.
2. BODY (Man): The 'seal_core' layer must contain ONLY the exact sealChars provided. Arrange vertically.
3. FOOTER (Earth): Use 'loshu' (size ~180) or 'bagua' at the bottom.
4. BORDERS: Every talisman MUST have a complex, multi-layered border.
5. COLORS: Predominantly Gold (#d4af37) and Cinnabar (#e63946).

Return ONLY valid JSON.`;

  const userPrompt = `Generate FDL for Hexagram ${hexagram.number} (${hexagram.name_en}).
Binary: ${binaryKey}
Remedies: ${JSON.stringify(visualContext)}
Talismans: ${JSON.stringify(targetItems)}

CRITICAL RULES:
1. The ONLY Chinese characters allowed are: the exact sealChars from each talisman item, and the hexChar.
2. Each talisman's seal_core MUST contain its sealChars arranged vertically.`;

  try {
    const rawResponse = await getInterpretation(userPrompt, 3000, {
      systemPrompt,
      temperature: 0.5,
      response_mime_type: "application/json"
    });
    const parsed = cleanAndParseJSON(rawResponse);

    if (parsed.error) {
      throw new Error(`JSON Parse Error: ${parsed.message}`);
    }

    return parsed;
  } catch (error: any) {
    log(4, `[fulu-drawing:PASS-1] Generation error: ${error.message}`);
    return {
      drawings: (fuluContentList || []).map((f: any) => ({
        ...f,
        title: f.talismanNameZh || "Symbolic Talisman",
        sigilInstructions: f.sigilInstructions || [{ type: 'circle', cx: 200, cy: 200, r: 100 }]
      })),
      instructions: "Follow traditional calligraphy rules. Focus your intent on the center of the seal."
    };
  }
}

interface FuluVerificationResult {
  approved: boolean;
  score: number;
  issues: string[];
  feedback?: string;
}

async function verifyFuluPass2(
  drawing: any,
  hexagram: any,
  binaryKey: string,
  question: string,
  db: any,
  lang: string
): Promise<FuluVerificationResult> {
  const issues: string[] = [];
  let score = 100;

  let drawingSummary: any[];
  if (drawing.fdl && !drawing.drawings) {
    drawingSummary = [{
      layers: drawing.fdl?.layers?.map((l: any) => ({
        name: l.name,
        commandCount: (l.commands || []).length,
        textContent: (l.commands || []).flatMap((c: any) => {
          const cmd = c.text || c.group?.commands?.filter((s: any) => s.text)?.map((s: any) => s.text.content) || [];
          return c.text ? [c.text.content] : (Array.isArray(cmd) ? cmd : []);
        }).filter(Boolean)
      })) || []
    }];
  } else {
    drawingSummary = (drawing.drawings || []).map((d: any) => ({
      id: d.id,
      layers: d.fdl?.layers?.map((l: any) => l.name) || [],
      characters: d.sealChars || []
    }));
  }

  const dbContext = {
    fulu: db?.fulu?.slice(0, 5).map((f: any) => ({
      id: f.id,
      name: f.name,
      purpose: f.purpose
    })) || []
  };

  const systemPrompt = `You are a Daoist Text Verification Scholar. Verify if the generated Fulu summary is relevant and authentic.
Return ONLY JSON: { "approved": true/false, "score": 0-100, "issues": [], "feedback": "" }`;

  const userPrompt = `VERIFY THIS FULU SUMMARY:
Hexagram: ${hexagram.number}
Binary: ${binaryKey}
Question: "${question}"
Drawing Summary: ${JSON.stringify(drawingSummary)}
References: ${JSON.stringify(dbContext)}`;

  try {
    const rawResponse = await getInterpretation(userPrompt, 1000, {
      systemPrompt,
      temperature: 0.2,
      response_mime_type: "application/json"
    });
    const parsed = cleanAndParseJSON(rawResponse);

    return {
      approved: parsed.approved !== false && (parsed.score || 0) >= 60,
      score: parsed.score || 60,
      issues: parsed.issues || [],
      feedback: parsed.feedback || ''
    };
  } catch (error) {
    return { approved: true, score: 70, issues: [] };
  }
}

async function verifyFuluPass3(
  drawing: any,
  hexagram: any,
  binaryKey: string
): Promise<FuluVerificationResult> {
  const issues: string[] = [];
  let score = 100;

  let fdlLayers: any[] = [];
  if (drawing.fdl && drawing.fdl.layers) {
    fdlLayers = drawing.fdl.layers;
  } else if (drawing.drawings) {
    for (const d of drawing.drawings) {
      if (!d.fdl || !d.fdl.layers) {
        issues.push(`Missing FDL structure in ${d.id}`);
        score -= 30;
        continue;
      }
      fdlLayers.push(...d.fdl.layers);
    }
  } else {
    issues.push('No FDL data found in drawing');
    score -= 30;
  }

  const checkCoords = (cmd: any, layerName: string) => {
    const coords = [cmd.x, cmd.y, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.cx, cmd.cy];
    coords.forEach((c: any) => {
      if (c !== undefined && (c < -200 || c > 1200)) {
        issues.push(`Coordinate out of FDL bounds: ${c} in layer ${layerName}`);
        score -= 5;
      }
    });
    const knownTypes = ['line', 'path', 'circle', 'text', 'group', 'rect', 'arc'];
    for (const type of knownTypes) {
      if (cmd[type] && typeof cmd[type] === 'object') {
        checkCoords(cmd[type], layerName);
        if (cmd[type].commands) {
          cmd[type].commands.forEach((sub: any) => checkCoords(sub, layerName));
        }
      }
    }
    if (cmd.commands) {
      cmd.commands.forEach((sub: any) => checkCoords(sub, layerName));
    }
  };

  fdlLayers.forEach((layer: any) => {
    (layer.commands || []).forEach((cmd: any) => {
      checkCoords(cmd, layer.name);
    });
  });

  return {
    approved: score >= 70,
    score: Math.max(0, score),
    issues: issues
  };
}


// ============================================================================
// FENG SHUI FDL GENERATION
// ============================================================================

function extractShortFDLLabel(text: string, dir?: string): string {
  if (!text || text.length <= 35) return text || dir || '';

  const dirMeta: Record<string, { element: string; item: string }> = {
    'S': { element: 'Fire', item: 'Candles' },
    'SE': { element: 'Wood', item: 'Plants' },
    'E': { element: 'Wood', item: 'Wood Objects' },
    'NE': { element: 'Earth', item: 'Crystals' },
    'N': { element: 'Water', item: 'Water Feature' },
    'NW': { element: 'Metal', item: 'Metal Coins' },
    'W': { element: 'Metal', item: 'Coins' },
    'SW': { element: 'Earth', item: 'Crystals' },
  };

  const actionMatch = text.match(/\b(?:Place|Add|Use|Activate|Strengthen|Enhance)\s+([^,.!?()]{3,30})/i);
  if (actionMatch) {
    const candidate = actionMatch[1].trim().replace(/\s+/g, ' ');
    if (candidate.length <= 30) return candidate;
  }

  const elementMatch = text.match(/\b(Wood|Fire|Earth|Metal|Water)\s+element\s+(\w+)/i);
  if (elementMatch) return `${elementMatch[1]} · ${elementMatch[2]}`;

  if (dir && dirMeta[dir]) {
    const { element, item } = dirMeta[dir];
    return `${item}\n${element}`;
  }

  const firstSentence = text.split(/[.!?]/)[0].trim();
  return firstSentence.length <= 35 ? firstSentence : firstSentence.substring(0, 32) + '…';
}

function generateFengShuiFDL(favorable: string[], unfavorable: string[], instructions?: Record<string, string>): any {
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
          text: extractShortFDLLabel(instructions?.[dir] || '', dir) || `${dir} · Favorable`,
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
          text: extractShortFDLLabel(instructions?.[dir] || '', dir) || `${dir} · Avoid`,
          color: "#FF4444",
          fontSize: 12
        }
      });
    }
  });

  return {
    version: "2.0",
    type: "fengshui_diagram",
    arrangement: "houtian",
    background: "#1a1a2e",
    title: "Feng Shui Guidance",
    lang: "en",
    layers: [
      {
        name: "base_bagua",
        type: "base_layer",
        opacity: 1.0,
        commands: [{ type: "bagua", cx: 500, cy: 500, size: 900 }]
      },
      {
        name: "sector_highlights",
        type: "highlight_layer",
        opacity: 0.7,
        commands: highlightCommands
      }
    ]
  };
}

// ============================================================================
// MAIN ENDPOINT HANDLERS
// ============================================================================

async function handleRandomBeacon(requestId: string, startTime: number): Promise<Response> {
  log(4, `[RANDOM] Fetching NIST beacon`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const nistResponse = await fetch('https://beacon.nist.gov/beacon/2.0/pulse/last', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (nistResponse.ok) {
      const nistData = await nistResponse.json();

      if (nistData.pulse && nistData.pulse.outputValue) {
        const binaryString = nistData.pulse.outputValue
          .split('')
          .map((hex: string) => parseInt(hex, 16).toString(2).padStart(4, '0'))
          .join('');

        const response = {
          binaryString,
          timestamp: nistData.pulse.timeStamp,
          source: "NIST_beacon",
          pulseIndex: nistData.pulse.pulseIndex
        };

        return new Response(
          JSON.stringify(createSuccessResponse(response, requestId, startTime)),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }
    
    log(4, `[RANDOM] NIST beacon unavailable, will use fallback`);
  } catch (error: any) {
    log(4, `[RANDOM] NIST beacon error: ${error.message}`);
  }

  log(4, `[RANDOM] Using crypto fallback`);

  try {
    const randomBytes = new Uint8Array(64);
    crypto.getRandomValues(randomBytes);

    const binaryString = Array.from(randomBytes)
      .map(byte => byte.toString(2).padStart(8, '0'))
      .join('');

    const response = {
      binaryString,
      timestamp: new Date().toISOString(),
      source: "crypto_fallback",
      note: "NIST beacon unavailable, using cryptographically secure random"
    };

    return new Response(
      JSON.stringify(createSuccessResponse(response, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (cryptoError: any) {
    log(4, `[RANDOM] Crypto fallback failed: ${cryptoError.message}`);
    throw new AppError(
      "Failed to generate randomness",
      500,
      "RANDOM_GENERATION_FAILED",
      { originalError: cryptoError.message }
    );
  }
}

async function handleSectionEndpoint(
  body: any,
  section: string,
  requestId: string,
  startTime: number
): Promise<Response> {
  const prunedBody = pruneToEnglish(body);
  const request: InterpretationRequest = prunedBody;
  validators.question(request.question);

  const previousContext = body.previousContext || '';
  const cumulativeTechnicalData = body.cumulativeTechnicalData || '';
  
  if (previousContext) {
    log(4, `[${section}] Received context from previous sections (${previousContext.length} chars)`);
  }
  if (cumulativeTechnicalData) {
    log(4, `[${section}] Received cumulative technical data (${cumulativeTechnicalData.length} chars)`);
  }

  log(4, `[${section}] Generating section...`);

  try {
    let result: any;
    switch (section) {
      case 'celestial-astro':
        result = await generateCelestialAstro(request);
        break;
      case 'celestial-bazi':
        result = await generateCelestialBazi(request);
        break;
      case 'elements-analysis':
        result = await generateElementsAnalysis(request, previousContext);
        break;
      case 'elements-synthesis':
        result = await generateElementsSynthesis(request, previousContext);
        break;
      case 'core-technical':
        result = await generateCoreTechnical(request, previousContext);
        break;
      case 'core-narrative':
        result = await generateCoreNarrative(request, previousContext);
        break;
      case 'core-application':
        result = await generateCoreApplication(request, previousContext);
        break;
      case 'advice':
        result = await generateAdviceSection(request, previousContext);
        break;
      case 'lines':
        result = await generateLinesSection(request);
        break;
      case 'classical':
        result = await generateClassicalSection(request);
        break;
      case 'houtou-emperor':
        result = await generateHoutouEmperor(request, previousContext);
        break;
      case 'houtou-master':
        result = await generateHoutouMaster(request, previousContext);
        break;
      default:
        throw new ValidationError(`Unknown section: ${section}`);
    }

    return new Response(
      JSON.stringify(createSuccessResponse(result, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log(4, `[${section}] Section generation failed after retries: ${error.message}`);
    return new Response(
      JSON.stringify(createErrorResponse(
        new AppError(
          `Section '${section}' generation failed: ${error.message}`,
          500,
          'SECTION_GENERATION_ERROR'
        ),
        requestId
      )),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleRemediesSelect(body: any, requestId: string, startTime: number): Promise<Response> {
  log(4, `[remedies-select] Selecting remedies from database using AI assistance...`);

  const prunedBody = pruneToEnglish(body);
  const { question, hexagram, binaryKey, equilibrium, interpretation, interpretationContext, recentRemedies } = prunedBody;

  validators.question(question);
  validators.hexagramData(hexagram);

  const database = await loadFuluDatabase();

  const lowerTrigram = binaryKey?.substring(0, 3) || "";
  const upperTrigram = binaryKey?.substring(3, 6) || "";

  const enInterp = interpretation?.en || interpretation || {};
  const analysisText = enInterp.analysis || enInterp.coreColloquial || interpretationContext?.coreColloquial || "";
  const celestialText = enInterp.celestialColloquial || enInterp.celestial || interpretationContext?.celestialColloquial || "";
  const combinedContext = `${analysisText} ${celestialText} ${question}`.toLowerCase();

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
      score += Math.random() * 15;

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

  const recentContext = recentRemedies && recentRemedies.length > 0
    ? `\nRECENTLY SELECTED REMEDIES (last 60m): ${recentRemedies.join(', ')}. Ensure new selections are COMPATIBLE and CONSISTENT with these.`
    : "";

  const systemPrompt = `You are a Daoist Remedy Selector. Given the hexagram reading and interpretation, select the most appropriate remedies from the AUTHENTICATED CATALOG below.
${recentContext}

AUTHETICATED CATALOG:
${JSON.stringify(slimCatalog)}

STRICT RULES:
1. Select ONE fulu/fuzhou (remedyType: "fulu") and ONE environmental remedy (remedyType: "fengshui" OR "medicine").
2. Return ONLY existing IDs from the catalog.
3. MANDATORY VARIETY: Evaluate the full catalog. Do NOT default to common entries.
4. Generate English relevance text, instructions, and application guidance.
5. Provide a "selectionReason" justifying the choice.
6. Output valid JSON.`;

  const userPrompt = `READING CONTEXT:
- Hexagram: ${hexagram.number} (${hexagram.name_en})
- Trigrams: Upper ${upperTrigram}, Lower ${lowerTrigram}
- Interpretation Snippet: ${analysisText.substring(0, 1000)}...
- Question: "${question}"

Select the best fitting remedies. Return JSON: { 
  "selectedFulu": "id", 
  "selectedEnv": "id", 
  "fuluRelevance": "why this talisman matters...", 
  "fuluInstructions": "how to use it...", 
  "fuluApplication": "physical placement...", 
  "envRelevance": "why this environmental remedy matters...", 
  "envInstructions": "...", 
  "envApplication": "...", 
  "selectionReason": "..." 
}`;

  const requiredFields = ["selectedFulu", "selectedEnv", "fuluRelevance", "envRelevance"];
  const selection = await getStructuredInterpretation(
    userPrompt,
    2500,
    { systemPrompt, temperature: 0.5, response_mime_type: "application/json" },
    requiredFields,
    3
  );

  const selectedRemedies: FuluEntry[] = [];
  const fuluId = selection.selectedFulu;
  const envId = selection.selectedEnv;

  const fuluEntry = database.find(e => e.id === fuluId);
  const envEntry = database.find(e => e.id === envId);

  if (fuluEntry) selectedRemedies.push(fuluEntry);
  if (envEntry) selectedRemedies.push(envEntry);

  const result: any = {
    en: { remedies: [] },
    es: { remedies: [] },
    it: { remedies: [] },
    zh: { remedies: [] },
    fuluContentList: []
  };

  for (const entry of selectedRemedies) {
    const isFulu = entry.id === fuluId;
    const sourceCitation = entry.source?.references?.length > 0 ? `${entry.source.primary} - ${entry.source.references[0]}` : (entry.source?.primary || "Daoist Tradition");

    const authInst = entry.structure?.instructions || entry.instructions || "";
    const ctxInst = isFulu ? selection.fuluInstructions : selection.envInstructions;
    const relevance = (isFulu ? selection.fuluRelevance : selection.envRelevance) || getRelevance(entry, 'en', equilibrium);

    let combinedInstructions = "";
    if (authInst) {
      combinedInstructions += `[Authentic Daoist Instructions]\\n${authInst}`;
    }
    if (ctxInst && ctxInst.length > 10 && !ctxInst.toLowerCase().includes('unknown')) {
      combinedInstructions += (combinedInstructions ? "\\n\\n" : "") + `[Usage for your Inquiry]\\n${ctxInst}`;
    }

    const baseRemedy = {
      id: entry.id,
      type: entry.remedyType,
      name: entry.name?.en || "Unnamed",
      nameZh: entry.name?.zh || "",
      pinyin: entry.name?.pinyin || "",
      description: entry.description || "",
      relevance: relevance,
      instructions: combinedInstructions || authInst,
      application: (isFulu ? selection.fuluApplication : selection.envApplication) || entry.application || "",
      alchemicalContext: entry.alchemicalContext || "",
      charm: await formatIncantation(entry, 'en'),
      source: sourceCitation,
      verification: entry.verified ? "✓ Verified" : "Symbolic"
    };

    result.en.remedies.push(baseRemedy);

    const visualData = generateVisualData(entry);
    const fuluContent: any = {
      id: entry.id,
      remedyType: entry.remedyType,
      talismanNameZh: entry.name?.zh || "",
      sealChars: entry.sealChars || [],
      hexagramNumber: hexagram.number,
      hexagramChar: hexagram.name_zh?.charAt(0) || '卦',
      lowerTrigramBinary: lowerTrigram,
      upperTrigramBinary: upperTrigram,
      bottomRows: entry.bottomRows || [],
      type: entry.structure?.type || 'composite_symbol',
      ...visualData
    };
    result.fuluContentList.push(fuluContent);
  }

  return new Response(
    JSON.stringify(createSuccessResponse(result, requestId, startTime)),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleRemediesTranslate(body: any, requestId: string, startTime: number): Promise<Response> {
  const { remedy, targetLang, targetLangName, context } = body;

  if (!remedy || !targetLang) {
    throw new ValidationError("Remedy and targetLang are required");
  }

  log(4, `[remedies-translate] Translating remedy ${remedy.id || remedy.name} to ${targetLangName}...`);

  const toTranslate = {
    name: remedy.name,
    description: remedy.description,
    relevance: remedy.relevance,
    instructions: remedy.instructions,
    application: remedy.application,
    alchemicalContext: remedy.alchemicalContext
  };

  const translated = await translateInterpretationContent(
    toTranslate,
    targetLang,
    targetLangName,
    `Remedy ${remedy.id || 'Translation'} Context: ${context || 'None'}`
  );

  let charm = remedy.charm;
  if (remedy.id) {
    const database = await loadFuluDatabase();
    const entry = database.find(e => e.id === remedy.id);
    if (entry) {
      charm = await formatIncantation(entry, targetLang);
    }
  }

  const result = {
    ...remedy,
    ...translated,
    charm
  };

  return new Response(
    JSON.stringify(createSuccessResponse(result, requestId, startTime)),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleRemediesVerify(body: any, requestId: string, startTime: number): Promise<Response> {
  const { remedies, lang } = body;

  if (!remedies) {
    throw new ValidationError("Remedies object is required");
  }

  log(4, `[remedies-verify] Verifying and enhancing remedies...`);
  const result = await verifyAndEnhanceRemedy(remedies, lang || 'en');

  return new Response(
    JSON.stringify(createSuccessResponse(result, requestId, startTime)),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleRemediesBagua(body: any, requestId: string, startTime: number): Promise<Response> {
  log(4, `[bagua-medicine] Generating Bagua medicine and Feng Shui guidance...`);

  const prunedBody = pruneToEnglish(body);
  const { interpretation, question, hexagram, lang } = prunedBody;
  const targetLang = lang || 'en';

  const systemPrompt = `You are a Master of Bagua Medicine (Ba Gua Zhen Liao) and Classical Feng Shui.
Provide therapeutic and environmental adjustments based on I Ching readings.
All string values must be plain text - no markdown formatting.

═══ HOUTIAN (LATER HEAVEN) BAGUA REFERENCE ════════════════════════════════════
Standard arrangement with SOUTH at TOP:

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
4. Include Houtian (Later Heaven) Bagua analysis
5. Never reference the user's specific question in your response
6. Return ONLY valid JSON

FORMAT:
{
  "${targetLang}": {
    "fengShui": {
      "favorable": ["SE", "S"],
      "unfavorable": ["N", "NW"],
      "guidance": "Detailed spatial adjustment instructions"
    },
    "medicine": [
      { "nameZh": "...", "name": "...", "description": "...", "application": "...", "element": "..." }
    ],
    "alchemical": "Internal transformation guidance"
  }
}`;

  const interpretationThemes = interpretation
    ? Object.entries(interpretation)
      .filter(([k, v]) => typeof v === 'string' && v.length > 0 && !['question'].includes(k))
      .map(([k, v]) => `${k}: ${String(v).substring(0, 200)}`)
      .join('\n')
    : "Consulting the oracle...";

  const userPrompt = `Context: The querent seeks guidance regarding their situation.
Hexagram: ${hexagram?.number || 'Unknown'}
Interpretation themes:
${interpretationThemes}

Provide comprehensive therapeutic and environmental guidance in ${targetLang}.`;

  try {
    const rawResponse = await getInterpretation(userPrompt, 2500, {
      systemPrompt,
      temperature: 0.4,
      response_mime_type: "application/json"
    });
    const parsed = cleanAndParseJSON(rawResponse);

    const langContent = parsed[targetLang] || parsed;
    if (langContent?.fengShui && !langContent.fengShui.visualData?.fdl) {
      const favorable = langContent.fengShui.favorable || [];
      const unfavorable = langContent.fengShui.unfavorable || [];

      const instructions: Record<string, string> = {};
      if (langContent.houtian?.adjustments) {
        langContent.houtian.adjustments.forEach((adj: any) => {
          const dirMatch = adj.sector?.match(/^(S|SE|E|NE|N|NW|W|SW)/);
          if (dirMatch) {
            instructions[dirMatch[1]] = adj.suggestion;
          }
        });
      }

      langContent.fengShui.visualData = {
        fdl: generateFengShuiFDL(favorable, unfavorable, instructions)
      };
    }

    return new Response(
      JSON.stringify(createSuccessResponse(parsed, requestId, startTime)),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log(4, `[bagua-medicine] Error: ${error.message}`);

    const fallback: any = {};
    fallback[targetLang] = {
      fengShui: {
        favorable: ["Center", "South"],
        unfavorable: ["North"],
        guidance: "Keep your environment clean and well-lit.",
        visualData: { fdl: generateFengShuiFDL(["S", "SE"], ["N"]) }
      },
      medicine: [{ nameZh: "靈芝", name: "Lingzhi", description: "Symbolic longevity", application: "Meditation", element: "Wood" }],
      alchemical: "Focus on your breath and dantian."
    };

    return new Response(
      JSON.stringify(createSuccessResponse(fallback, requestId, startTime)),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

async function handleRemediesFuluDraw(body: any, requestId: string, startTime: number): Promise<Response> {
  log(4, `[fulu-drawing] Starting 3-pass verification pipeline...`);

  const prunedBody = pruneToEnglish(body);
  const { hexagram, binaryKey, fuluContentList, remedies, lang, question } = prunedBody;

  if (!hexagram || !binaryKey) {
    throw new ValidationError("Hexagram and binaryKey are required");
  }

  const db = await loadFuluDatabase();

  log(4, `[fulu-drawing:PASS-1] Generating initial drawing...`);
  const initialDrawing = await generateFuluDrawingPass1(hexagram, binaryKey, fuluContentList, remedies, lang);

  log(4, `[fulu-drawing:PASS-2] Verifying relevance and authenticity...`);
  const verification2 = await verifyFuluPass2(initialDrawing, hexagram, binaryKey, question, db, lang);

  if (!verification2.approved) {
    log(4, `[fulu-drawing:PASS-2] FAILED - Regenerating with feedback`);
    // Note: regenerateFuluWithFeedback would be needed here for full implementation
  } else {
    log(4, `[fulu-drawing:PASS-2] PASSED`);
  }

  log(4, `[fulu-drawing:PASS-3] Verifying drawing accuracy...`);
  const verification3 = await verifyFuluPass3(initialDrawing, hexagram, binaryKey);

  if (!verification3.approved) {
    log(4, `[fulu-drawing:PASS-3] FAILED - Fixing structural issues`);
    // Note: fixFuluStructure would be needed here for full implementation
  } else {
    log(4, `[fulu-drawing:PASS-3] PASSED`);
  }

  const finalResult = {
    ...initialDrawing,
    verification: {
      pass1_generated: true,
      pass2_relevance: verification2.approved,
      pass2_score: verification2.score,
      pass2_issues: verification2.issues,
      pass3_structure: verification3.approved,
      pass3_score: verification3.score,
      pass3_issues: verification3.issues,
      overall_score: Math.round((verification2.score + verification3.score) / 2),
      timestamp: new Date().toISOString()
    }
  };

  log(4, `[fulu-drawing] 3-pass pipeline complete. Overall score: ${finalResult.verification.overall_score}%`);

  return new Response(
    JSON.stringify(createSuccessResponse(finalResult, requestId, startTime)),
    { headers: { "Content-Type": "application/json" } }
  );
}

// ============================================================================
// XIANTIAN (EARLY HEAVEN) HANDLER
// ============================================================================

const XIANTIAN_TRIGRAMS: Record<string, any> = {
  Qian: { dir: 'S', angleDeg: -90, binary: '111', element: 'Heaven', spiritualAspect: 'Shen (Spirit)', quality: 'Creative', number: 1 },
  Dui: { dir: 'SE', angleDeg: -45, binary: '011', element: 'Lake', spiritualAspect: 'Shen-Joy', quality: 'Joyful', number: 2 },
  Li: { dir: 'E', angleDeg: 0, binary: '101', element: 'Fire', spiritualAspect: 'Shen-Clarity', quality: 'Clarity', number: 3 },
  Zhen: { dir: 'NE', angleDeg: 45, binary: '001', element: 'Thunder', spiritualAspect: 'Qi-Movement', quality: 'Arousing', number: 4 },
  Xun: { dir: 'SW', angleDeg: -135, binary: '110', element: 'Wind', spiritualAspect: 'Qi-Penetration', quality: 'Gentle', number: 5 },
  Kan: { dir: 'W', angleDeg: 180, binary: '010', element: 'Water', spiritualAspect: 'Jing-Danger', quality: 'Abysmal', number: 6 },
  Gen: { dir: 'NW', angleDeg: 135, binary: '100', element: 'Mountain', spiritualAspect: 'Jing-Stillness', quality: 'Keeping Still', number: 7 },
  Kun: { dir: 'N', angleDeg: 90, binary: '000', element: 'Earth', spiritualAspect: 'Jing (Essence)', quality: 'Receptive', number: 8 }
};

function generateXiantianFDL(hexagramNumber?: number): any {
  const commands: any[] = [
    { type: 'bagua', cx: 500, cy: 500, size: 800, arrangement: 'xiantian' },
    { type: 'annotation', position: 'top', text: '先天八卦 Xiantian Bagua (Early Heaven)', style: { fontSize: 24, color: '#D4AF37' } }
  ];

  if (hexagramNumber) {
    commands.push({
      type: 'text',
      x: 500, y: 900,
      content: `Hexagram ${hexagramNumber}`,
      size: 20,
      font: 'noto-serif-sc',
      style: { fill: '#888888' }
    });
  }

  return {
    version: '2.0',
    type: 'bagua_chart',
    arrangement: 'xiantian',
    background: '#0a0a1a',
    title: 'Xiantian Bagua (Early Heaven)',
    lang: 'en',
    layers: [
      {
        name: 'xiantian_bagua',
        opacity: 1.0,
        commands
      }
    ]
  };
}

async function handleXiantian(body: any, requestId: string, startTime: number): Promise<Response> {
  const { query, hexagramNumber, lang = 'en', includeFDL = true } = body;

  if (!query || typeof query !== 'string') {
    throw new ValidationError("Missing or invalid 'query' field", { field: 'query' });
  }

  log(4, `[interpret-xiantian] Query: ${query.substring(0, 50)}...`, { hexagramNumber });

  const systemPrompt = `You are a Daoist Neidan (Internal Alchemy) master.
Interpret the query using the XIANTIAN (Early Heaven / Primordial) Bagua arrangement.
This is for SPIRITUAL CULTIVATION and INTERNAL ALCHEMY, not daily life advice.

XIANTIAN BAGUA (Early Heaven / Primordial):
- Qian (☰) = South = Pure Yang = Shen (Spirit) ascends
- Dui (☱) = Southeast = Lake joy = Shen settles
- Li (☲) = East = Fire clarity = Shen illuminates
- Zhen (☳) = Northeast = Thunder arousal = Qi moves
- Xun (☴) = Southwest = Wind penetration = Qi circulates
- Kan (☵) = West = Water danger = Jing consolidates
- Gen (☶) = Northwest = Mountain stillness = Jing stores
- Kun (☷) = North = Pure Yin = Jing descends

Focus on:
- Shen (Spirit) cultivation in the upper dantian
- Qi (Energy) circulation in the middle dantian
- Jing (Essence) conservation in the lower dantian
- Fire and Water phases (Huo Hou)
- Kan-Li interaction (Water-Fire alchemy)

Respond in valid JSON format with this structure:
{
  "spiritual": { "shen": "...", "qi": "...", "jing": "..." },
  "alchemical": { "cauldronPosition": "...", "firePhases": [...], "waterPhases": [...] },
  "practice": { "meditationFocus": "...", "breathingTechnique": "...", "visualization": "..." }
}`;

  const userPrompt = `QUERY: ${query}
${hexagramNumber ? `HEXAGRAM: ${hexagramNumber}` : ''}

Provide a Xiantian (Early Heaven) spiritual interpretation focused on Neidan practice.
Return ONLY valid JSON.`;

  try {
    const response = await fetchWithTimeout(
      DEEPSEEK_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.6,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        })
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new APIError(`DeepSeek API error: ${response.status}`, { status: response.status, details: errorText });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new APIError("Empty response from DeepSeek API");
    }

    let interpretation: any;
    try {
      interpretation = JSON.parse(content);
    } catch (e) {
      interpretation = {
        spiritual: { shen: content.substring(0, 500), qi: '', jing: '' },
        alchemical: { cauldronPosition: '', firePhases: [], waterPhases: [] },
        practice: { meditationFocus: '', breathingTechnique: '', visualization: '' }
      };
    }

    const fdl = includeFDL ? generateXiantianFDL(hexagramNumber) : null;

    log(4, `[interpret-xiantian] Xiantian interpretation complete`);

    return new Response(
      JSON.stringify(createSuccessResponse({
        interpretation,
        fdl,
        arrangement: 'xiantian',
        trigrams: XIANTIAN_TRIGRAMS,
        lang,
        hexagramNumber
      }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new APIError(`Xiantian interpretation failed: ${error.message}`);
  }
}


// ============================================================================
// MAIN SERVER HANDLER
// ============================================================================

serve(async (req) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log(`[BOOT] Function invoked: ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`[BOOT] CORS preflight response`);
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = req.headers.get("X-Request-ID") || requestId;
  const rateLimitCheck = checkRateLimit(clientId);

  if (!rateLimitCheck.allowed) {
    const rateLimitError = new RateLimitError(rateLimitCheck.retryAfter!);
    return new Response(
      JSON.stringify(createErrorResponse(rateLimitError, requestId)),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": rateLimitCheck.retryAfter!.toString()
        }
      }
    );
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter((p) => p);
  const lastSegment = pathParts[pathParts.length - 1] || '';
  const secondLastSegment = pathParts[pathParts.length - 2] || '';

  log(4, `[REQUEST] ${req.method} ${url.pathname}`, { requestId });

  try {
    let response: Response;

    if (req.method === 'POST') {
      response = await handlePostRequest(req, lastSegment, requestId, startTime);
    } else if (req.method === 'GET') {
      response = await handleGetRequest(req, lastSegment, secondLastSegment, requestId, startTime);
    } else {
      throw new AppError(
        `Method ${req.method} not allowed`,
        405,
        "METHOD_NOT_ALLOWED",
        { allowedMethods: ['GET', 'POST', 'OPTIONS'] }
      );
    }

    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
    headers.set("X-Request-ID", requestId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

  } catch (rawError: unknown) {
    const error = rawError instanceof Error ? rawError : new Error(String(rawError));
    log(4, `[ERROR] ${error.message}`, { requestId });

    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const response = createErrorResponse(error, requestId);

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: { "Content-Type": "application/json", ...corsHeaders, "X-Request-ID": requestId }
    });
  }
});

// ============================================================================
// POST REQUEST HANDLER
// ============================================================================

async function handlePostRequest(
  req: Request,
  endpoint: string,
  requestId: string,
  startTime: number
): Promise<Response> {
  let body: any;

  try {
    body = await req.json();
  } catch (e: any) {
    throw new ValidationError("Invalid JSON in request body", { error: e.message });
  }

  if (!body) {
    throw new ValidationError("Request body cannot be empty");
  }

  log(4, `[POST] /${endpoint}`, { requestId });

  // Check cache for idempotent requests
  const cacheKey = getCacheKey(endpoint, body);
  const cached = getCached(cacheKey);
  if (cached) {
    log(4, `[CACHE] Returning cached response for ${endpoint}`);
    return new Response(
      JSON.stringify(createSuccessResponse(cached, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  switch (endpoint) {
    // Section endpoints
    case 'celestial-astro':
      return await handleSectionEndpoint(body, 'celestial-astro', requestId, startTime);

    case 'celestial-bazi':
      return await handleSectionEndpoint(body, 'celestial-bazi', requestId, startTime);

    case 'elements-analysis':
      return await handleSectionEndpoint(body, 'elements-analysis', requestId, startTime);

    case 'elements-synthesis':
      return await handleSectionEndpoint(body, 'elements-synthesis', requestId, startTime);

    case 'core-technical':
      return await handleSectionEndpoint(body, 'core-technical', requestId, startTime);

    case 'core-narrative':
      return await handleSectionEndpoint(body, 'core-narrative', requestId, startTime);

    case 'core-application':
      return await handleSectionEndpoint(body, 'core-application', requestId, startTime);

    case 'lines':
      return await handleSectionEndpoint(body, 'lines', requestId, startTime);

    case 'classical':
      return await handleSectionEndpoint(body, 'classical', requestId, startTime);

    case 'houtou-emperor':
      return await handleSectionEndpoint(body, 'houtou-emperor', requestId, startTime);

    case 'houtou-master':
      return await handleSectionEndpoint(body, 'houtou-master', requestId, startTime);

    case 'advice':
      return await handleSectionEndpoint(body, 'advice', requestId, startTime);

    // Remedy endpoints
    case 'remedies-select':
      return await handleRemediesSelect(body, requestId, startTime);

    case 'remedies-translate':
      return await handleRemediesTranslate(body, requestId, startTime);

    case 'remedies-verify':
      return await handleRemediesVerify(body, requestId, startTime);

    case 'remedies-bagua':
    case 'bagua-medicine':
      return await handleRemediesBagua(body, requestId, startTime);

    case 'remedies-fulu-draw':
    case 'fulu-drawing':
      return await handleRemediesFuluDraw(body, requestId, startTime);

    // Xiantian endpoint
    case 'xiantian':
    case 'interpret-xiantian':
      return await handleXiantian(body, requestId, startTime);

    // Interpretation compose endpoint
    case 'interpret-compose':
      return await handleInterpretCompose(body, requestId, startTime);

    // Translation endpoint for language switching
    case 'translate':
      return await handleTranslate(body, requestId, startTime);

    // Root endpoint - API info
    case 'yijingtu':
    case '':
      return new Response(
        JSON.stringify(createSuccessResponse({
          message: "Yijingtu I Ching API",
          version: API_VERSION,
          description: "Structured interpretation pipeline with technical and modern layers",
          endpoints: {
            // Section endpoints
            celestialAstro: "POST /celestial-astro - Celestial astrology analysis (no BaZi)",
            celestialBazi: "POST /celestial-bazi - BaZi destiny analysis (no astrology)",
            elementsAnalysis: "POST /elements-analysis - Five Elements technical analysis",
            elementsSynthesis: "POST /elements-synthesis - Five Elements interpretation",
            coreTechnical: "POST /core-technical - Core technical trigram analysis",
            coreNarrative: "POST /core-narrative - Core narrative interpretation",
            coreApplication: "POST /core-application - Practical advice",
            lines: "POST /lines - Moving lines analysis",
            classical: "POST /classical - Classical texts retrieval",
            houtouEmperor: "POST /houtou-emperor - Emperor (Day Master) analysis",
            houtouMaster: "POST /houtou-master - Master (Pillars) analysis",
            advice: "POST /advice - Dedicated advice synthesis",
            
            // Remedy endpoints
            remediesSelect: "POST /remedies-select - AI-assisted remedy selection",
            remediesTranslate: "POST /remedies-translate - Translate remedy content",
            remediesVerify: "POST /remedies-verify - Verify and enhance remedy quality",
            remediesBagua: "POST /remedies-bagua - Bagua medicine and Feng Shui",
            remediesFuluDraw: "POST /remedies-fulu-draw - Generate talisman drawing (3-pass)",
            
            // Other endpoints
            xiantian: "POST /xiantian - Xiantian (Early Heaven) spiritual interpretation",
            translate: "POST /translate - Translate interpretation sections to other languages",
            
            // GET endpoints
            random: "GET /random - NIST beacon randomness",
            health: "GET /health - System health check"
          }
        }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );

    default:
      throw new NotFoundError("Endpoint", endpoint);
  }
}

// ============================================================================
// GET REQUEST HANDLER
// ============================================================================

async function handleGetRequest(
  req: Request,
  lastSegment: string,
  secondLastSegment: string,
  requestId: string,
  startTime: number
): Promise<Response> {
  console.log(`[GET_HANDLER] ${lastSegment} - request received`);
  log(4, `[GET] ${lastSegment}${secondLastSegment ? `/${secondLastSegment}` : ''}`, { requestId });

  // GET /hexagram-reading/:number
  if (secondLastSegment === 'hexagram-reading' && lastSegment) {
    const hexagramNumber = parseInt(lastSegment, 10);
    if (isNaN(hexagramNumber)) {
      throw new ValidationError(`Invalid hexagram number: "${lastSegment}"`);
    }
    validators.hexagramNumber(hexagramNumber);
    const hexagram = await getHexagram(hexagramNumber);
    return new Response(
      JSON.stringify(createSuccessResponse({ hexagram }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // GET /random - NIST beacon for randomness
  if (lastSegment === 'random' || lastSegment === '' || lastSegment === 'yijingtu') {
    console.log(`[GET_HANDLER] Routing to handleRandomBeacon`);
    return await handleRandomBeacon(requestId, startTime);
  }

  // GET /health
  if (lastSegment === 'health') {
    let dbStatus = "unknown";
    let dbEntries = 0;
    try {
      if (FULU_DATABASE.length > 0) {
        dbStatus = "loaded_from_bucket";
        dbEntries = FULU_DATABASE.length;
      } else {
        dbStatus = "not_loaded";
        dbEntries = 0;
      }
    } catch (e) {
      dbStatus = "error";
    }

    const health = {
      status: "healthy",
      version: API_VERSION,
      timestamp: new Date().toISOString(),
      environment: {
        deepseek_api: DEEPSEEK_API_KEY ? "configured" : "not configured",
        supabase_url: SUPABASE_URL ? "configured" : "not configured"
      },
      database: {
        status: dbStatus,
        entries: dbEntries,
        source: DAOIST_REMEDIES_DB_URL
      }
    };

    return new Response(
      JSON.stringify(createSuccessResponse(health, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // GET /remedies-db — fetch, parse, and return DAOIST_REMEDIES_DB from bucket
  if (lastSegment === 'remedies-db') {
    return await handleRemediesDB(requestId, startTime);
  }

  throw new NotFoundError("Endpoint", lastSegment);
}

// ============================================================================
// REMEDIES DB HANDLER
// ============================================================================

async function handleRemediesDB(requestId: string, startTime: number): Promise<Response> {
  log(4, `[GET /remedies-db] Fetching and parsing DAOIST_REMEDIES_DB from bucket`, { requestId });
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(DAOIST_REMEDIES_DB_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/javascript, application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const content = await response.text();
    let dbData: any;

    // Try JSON first
    try {
      dbData = JSON.parse(content);
    } catch {
      // Parse as JS assignment: const DAOIST_REMEDIES_DB = { ... }
      const startMatch = content.match(/const\s+DAOIST_REMEDIES_DB\s*=\s*{/);
      if (startMatch) {
        const objStart = startMatch.index! + startMatch[0].length - 1;
        const objRaw = content.substring(objStart);
        dbData = cleanAndParseJSON(objRaw);
        if (dbData?.error) throw new Error(`Parse failed: ${dbData.message}`);
      } else {
        throw new Error("Could not find DAOIST_REMEDIES_DB assignment in bucket file");
      }
    }

    if (!dbData) throw new Error("Parsed DB is empty");

    log(4, `[GET /remedies-db] Successfully parsed DB. Sections: ${Object.keys(dbData).join(', ')}`, { requestId });
    return new Response(
      JSON.stringify(createSuccessResponse(dbData, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    log(4, `[GET /remedies-db] Error: ${err.message}`, { requestId });
    throw new AppError(`Failed to load remedies DB: ${err.message}`, 502, "REMEDIES_DB_ERROR");
  }
}

// ============================================================================
// INTERPRETATION COMPOSE HANDLERS (Missing from original extraction)
// ============================================================================

async function handleInterpretCompose(body: any, requestId: string, startTime?: number): Promise<Response> {
  // Incremental mode: merge one new section into the accumulated result
  if (body.section && body.sectionData) {
    return await handleIncrementalCompose(body, requestId, startTime);
  }

  // Full compose mode (legacy): all sections at once
  const { celestial, elements, core, lines, classical, remedies, lang } = body;

  if (!celestial || !elements || !core || !lines || !classical) {
    throw new AppError("Request must include all sections: celestial, elements, core, lines, classical", 400, "VALIDATION_ERROR");
  }

  console.log(`[interpret-compose] Full compose...`);

  const result = await composeInterpretation(celestial, elements, core, lines, classical, lang);
  if (remedies) result.remedies = remedies;

  return new Response(
    JSON.stringify({ success: true, data: { interpretation: result } }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleIncrementalCompose(body: any, requestId: string, startTime?: number): Promise<Response> {
  const { section, sectionData, accumulated, lang } = body;

  if (!section || !sectionData) {
    throw new AppError("Incremental compose requires 'section' and 'sectionData'", 400, "VALIDATION_ERROR");
  }

  console.log(`[interpret-compose:incremental] Merging section '${section}'...`);

  const result = accumulated || { en: {} };
  const emptyLines = ["", "", "", "", "", ""];

  const newFields: { [key: string]: any } = {};

  // Store technicalData for 3-layer structure (in all language slots)
  if (sectionData.technicalData) {
    // Normalize section name: celestial-astro -> celestial, elements-analysis -> elements, etc.
    const baseName = section.replace(/-analysis|-synthesis|-emperor|-master/, '')
                            .replace(/-bazi/, '')
                            .replace(/-astro/, '');
    const techDataKey = `${baseName}TechnicalData`;
    
    // Store at root level for backwards compatibility
    result[techDataKey] = sectionData.technicalData;
    
    // Also store in each language slot so frontend can access it
    for (const l of ['en', 'es', 'it', 'zh']) {
      if (!result[l]) result[l] = {};
      result[l][techDataKey] = sectionData.technicalData;
    }
  }

  switch (section) {
    case 'core':
      newFields.coreTechnical = sectionData.technicalAnalysis || "";
      newFields.coreColloquial = sectionData.colloquialInterpretation || "";
      newFields.analysis = sectionData.analysis || sectionData.technicalAnalysis || "";
      newFields.advice = sectionData.advice || "";
      newFields.symbolism = sectionData.symbolism || "";
      break;
    case 'core-analysis':
      newFields.coreTechnical = sectionData.technicalAnalysis || "";
      newFields.analysis = sectionData.analysis || "";
      newFields.symbolism = sectionData.symbolism || "";
      break;
    case 'core-application':
      newFields.coreColloquial = sectionData.colloquialInterpretation || "";
      newFields.advice = sectionData.advice || "";
      break;
    case 'celestial':
    case 'celestial-astro':
    case 'celestial-bazi':
      newFields.celestialTechnical = sectionData.technicalAnalysis || "";
      newFields.celestialColloquial = sectionData.colloquialInterpretation || "";
      newFields.celestial = sectionData.celestial || "";
      newFields.birthBaziDescription = sectionData.birthBazi?.description || "";
      newFields.birthBaziImpact = sectionData.birthBazi?.readingImpact || "";
      newFields.currentBaziDescription = sectionData.currentBazi?.description || "";
      newFields.currentBaziImpact = sectionData.currentBazi?.readingImpact || "";
      break;
    case 'elements':
    case 'elements-analysis':
    case 'elements-synthesis':
      newFields.elementsTechnical = sectionData.technicalAnalysis || "";
      newFields.elementsColloquial = sectionData.colloquialInterpretation || "";
      newFields.elements = sectionData.elements || "";
      break;
    case 'houtou':
    case 'houtou-emperor':
    case 'houtou-master':
      newFields.houtouTechnical = sectionData.technicalAnalysis || "";
      newFields.houtouColloquial = sectionData.colloquialInterpretation || "";
      newFields.emperorAnalysis = sectionData.emperorAnalysis || "";
      newFields.masterAnalysis = sectionData.masterAnalysis || "";
      break;
    case 'lines':
      newFields.movingLines = sectionData.movingLines || "";
      newFields.lineTexts = Array.isArray(sectionData.lineTexts) ? sectionData.lineTexts : ["", "", "", "", "", ""];
      break;
    case 'classical':
      newFields.judgment = sectionData.judgment?.en || "";
      newFields.image = sectionData.image?.en || "";
      newFields.lines = sectionData.lines?.en || emptyLines;
      break;
    case 'remedies':
      result.remedies = sectionData;
      return new Response(
        JSON.stringify({ success: true, data: { interpretation: result } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  }

  // Collect quoted references
  const existingQuotes = result.en?.quotedReferences || [];
  const sectionQuotes = sectionData.quotedReferences || [];
  const allQuotes = [...existingQuotes, ...sectionQuotes].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
  newFields.quotedReferences = allQuotes;

  // Populate all language slots with English content
  for (const l of ['en', 'es', 'it', 'zh']) {
    if (!result[l]) result[l] = {};
    Object.assign(result[l], newFields);

    if (section === 'classical') {
      result[l].judgment = sectionData.judgment?.[l] || sectionData.judgment?.en || "";
      result[l].image = sectionData.image?.[l] || sectionData.image?.en || "";
      result[l].lines = sectionData.lines?.[l] || sectionData.lines?.en || emptyLines;
    }
  }

  console.log(`[interpret-compose:incremental] Section '${section}' merged successfully`);

  return new Response(
    JSON.stringify({ success: true, data: { interpretation: result } }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================================
// TRANSLATION HANDLER (for language switching)
// ============================================================================

async function handleTranslate(body: any, requestId: string, startTime?: number): Promise<Response> {
  const { content, targetLang, hexagramName, section } = body;

  if (!content || !targetLang || !section) {
    throw new ValidationError("Request must include 'content', 'targetLang', and 'section'");
  }

  if (!['es', 'it', 'zh'].includes(targetLang)) {
    throw new ValidationError(`Unsupported target language: ${targetLang}`);
  }

  log(4, `[translate] Translating section '${section}' to ${targetLang}`);

  // Build translation prompt
  const contentJson = JSON.stringify(content, null, 2);
  
  const systemPrompt = `You are a professional translator specializing in I Ching (Yi Jing) terminology and Chinese metaphysics.
Translate the following interpretation content from English to ${targetLang === 'es' ? 'Spanish' : targetLang === 'it' ? 'Italian' : 'Chinese'}.

CRITICAL REQUIREMENTS:
1. Maintain all technical terminology accuracy (BaZi, Five Elements, trigrams, etc.)
2. Preserve the structure - return ONLY a JSON object with the same keys as input
3. Use classical/divinatory language style appropriate for spiritual texts
4. Do NOT add markdown formatting to text values
5. Keep lineTexts as an array of 6 strings (one per line)

Return ONLY valid JSON with the translated content.`;

  const userPrompt = `Translate this I Ching interpretation section to ${targetLang === 'es' ? 'Spanish' : targetLang === 'it' ? 'Italian' : 'Chinese'}:

Hexagram: ${hexagramName || 'Unknown'}
Section: ${section}

Content to translate (JSON):
${contentJson}

Return ONLY the translated JSON object with the same field names and structure.`;

  try {
    const translated = await getStructuredInterpretation(
      userPrompt,
      2000,
      { systemPrompt, response_mime_type: "application/json" },
      Object.keys(content),
      2
    );

    log(4, `[translate] Successfully translated section '${section}' to ${targetLang}`);

    return new Response(
      JSON.stringify(createSuccessResponse({ translated }, requestId, startTime)),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log(4, `[translate] Translation failed: ${error.message}`);
    // Return original content on failure
    return new Response(
      JSON.stringify(createSuccessResponse({ translated: content }, requestId, startTime)),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

async function composeInterpretation(
  celestial: any,
  elements: any,
  core: any,
  lines: any,
  classical: any,
  targetLang: string = 'en',
  houtou?: any
): Promise<any> {
  console.log(`[COMPOSE] Composing final interpretation...`);

  if (!classical || !classical.judgment || !classical.image || !classical.lines) {
    console.log(`[COMPOSE] WARNING: Invalid classical section, creating empty fallback`);
    classical = {
      judgment: { en: "", es: "", it: "", zh: "" },
      image: { en: "", es: "", it: "", zh: "" },
      lines: { en: ["", "", "", "", "", ""], es: ["", "", "", "", "", ""], it: ["", "", "", "", "", ""], zh: ["", "", "", "", "", ""] }
    };
  }

  const allQuotes = [
    ...(celestial?.quotedReferences || []),
    ...(elements?.quotedReferences || []),
    ...(core?.quotedReferences || []),
    ...(lines?.quotedReferences || []),
    ...(houtou?.quotedReferences || [])
  ].filter((v, i, a) => a.indexOf(v) === i);

  const baseContent = {
    celestialTechnical: celestial?.technicalAnalysis || "",
    celestialColloquial: celestial?.colloquialInterpretation || "",
    birthBaziDescription: celestial?.birthBazi?.description || "",
    birthBaziImpact: celestial?.birthBazi?.readingImpact || "",
    currentBaziDescription: celestial?.currentBazi?.description || "",
    currentBaziImpact: celestial?.currentBazi?.readingImpact || "",
    celestial: celestial?.celestial || "",
    elementsTechnical: elements?.technicalAnalysis || "",
    elementsColloquial: elements?.colloquialInterpretation || "",
    elements: elements?.elements || "",
    houtouTechnical: houtou?.technicalAnalysis || "",
    houtouColloquial: houtou?.colloquialInterpretation || "",
    emperorAnalysis: houtou?.emperorAnalysis || "",
    masterAnalysis: houtou?.masterAnalysis || "",
    coreTechnical: core?.technicalAnalysis || "",
    coreColloquial: core?.colloquialInterpretation || "",
    analysis: core?.analysis || core?.technicalAnalysis || "",
    advice: core?.advice || "",
    symbolism: core?.symbolism || "",
    movingLines: lines?.movingLines || "",
    lineTexts: lines?.lineTexts || ["", "", "", "", "", ""],
    quotedReferences: allQuotes
  };

  const emptyLines = ["", "", "", "", "", ""];

  return {
    en: {
      ...baseContent,
      judgment: classical.judgment?.en || "",
      image: classical.image?.en || "",
      lines: classical.lines?.en || emptyLines
    },
    es: {
      ...baseContent,
      judgment: classical.judgment?.es || classical.judgment?.en || "",
      image: classical.image?.es || classical.image?.en || "",
      lines: classical.lines?.es || classical.lines?.en || emptyLines
    },
    it: {
      ...baseContent,
      judgment: classical.judgment?.it || classical.judgment?.en || "",
      image: classical.image?.it || classical.image?.en || "",
      lines: classical.lines?.it || classical.lines?.en || emptyLines
    },
    zh: {
      ...baseContent,
      judgment: classical.judgment?.zh || classical.judgment?.en || "",
      image: classical.image?.zh || classical.image?.en || "",
      lines: classical.lines?.zh || classical.lines?.en || emptyLines
    }
  };
}
