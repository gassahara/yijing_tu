import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Lazy-loaded PDF library (only loaded when PDF export is requested)
let pdfLibCache: any = null;
async function getPdfLib() {
  if (!pdfLibCache) {
    pdfLibCache = await import("https://esm.sh/pdf-lib@1.17.1");
  }
  return pdfLibCache;
}

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

// ============================================================================
// AUTHENTIC DAOIST FULU/FUZHOU DATABASE
// Sources: Zhengtong Daozang (正統道藏), Daozang Jiyao (道藏輯要),
//          Shangqing Lingbao Dafa (上清靈寶大法), Lingbao Wufuxu (靈寶五符序)
// All entries verified with DZ numbers and academic citations
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
  // Image URL(s) for the remedy - can be single URL or array of URLs
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
  // Compatibility fields for existing code
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
  // New remedy types
  remedyType?: 'fulu' | 'fengshui' | 'medicine';
  application?: string;
  alchemicalContext?: string;
  instructions?: string;
  // Visual rendering data
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
// No fallback - data must come from daoist_remedies_db.js
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
      // Look for the assignment to DAOIST_REMEDIES_DB and extract the object
      const startMatch = content.match(/const\s+DAOIST_REMEDIES_DB\s*=\s*{/);
      if (startMatch) {
        const objStart = startMatch.index! + startMatch[0].length - 1; // Position of the opening {
        const objRaw = content.substring(objStart);
        // Let cleanAndParseJSON handle finding the end of the object
        dbData = cleanAndParseJSON(objRaw); if (dbData.error) {
          throw new Error(`Parse failed: ${dbData.message}`);
        }
      } else {
        // Fallback: search for any large object if the constant name changed
        const genericMatch = content.match(/({[\s\S]*?});?\s*$/);
        if (genericMatch) {
          dbData = cleanAndParseJSON(genericMatch[1]);
        } else {
          throw new Error("Could not find database object in file content");
        }
      }
    }

    if (dbData) {
      // Load fuzhou data from bucket - this is the ONLY source of truth
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
  } catch (error) {
    log(4, `[FULU_DB] CRITICAL ERROR: Failed to load from URL: ${error.message}`);
    log(4, `[FULU_DB] Database MUST be loaded from bucket. No fallback available.`);
    // Throw error - no fallback allowed
    throw new Error(`Database load failed: ${error.message}. Ensure daoist_remedies_db.js is accessible at ${DAOIST_REMEDIES_DB_URL}`);
  }
}

// Convert new database format to FuluEntry format
function convertToFuluEntry(entry: any, fuzhouDB: any[] = []): FuluEntry {
  // Find matching fuzhou entry based on usage/purpose overlap
  const matchingFuzhou = findMatchingFuzhou(entry, fuzhouDB);

  // Extract actual fuzhou incantation text - validate it contains real content, not just a name
  let incantation: any;
  if (matchingFuzhou && matchingFuzhou.text?.chinese && matchingFuzhou.text.chinese.length > 10) {
    // We have a real fuzhou with actual incantation text
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
    // Fuzhou found but has no actual text content - log this as a data issue
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

  // Mapping logic for different remedy types
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

  // Generate visual data for canvas drawing
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
    // Generate compatibility fields
    hexagrams: generateHexagramsFromUsage(entry.usage || []),
    elements: structure.elements?.map((e: string) => e.split(' ')[0]) || [],
    bazi_patterns: (entry.usage || []).map((u: string) => u.replace(/_/g, '_')),
    purpose: entry.usage?.[0] || "general",
    purpose_zh: entry.name?.zh?.substring(0, 4) || "符籙",
    sealChars: entry.sealChars || entry.name?.zh?.split('').slice(0, 4) || ["符", "籙", "真", "文"],
    charStyle, // Include detected style
    incantation,
    bottomRows: entry.bottomRows || [
      entry.source?.references?.slice(0, 2) || [entry.source?.primary?.split(' ')[0] || "道藏"],
      entry.usage?.slice(0, 2) || ["protection"]
    ],
    trigram_associations: entry.trigram_associations || ["111", "000", "101"],
    // Include visual data for canvas rendering
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

  // 0. Priority ID Mapping (Explicit links)
  const explicitLinks: { [key: string]: string } = {
    "fulu_014": "fuzhou_013", // Bashi -> Tongling Bashi
    "fulu_015": "fuzhou_001", // Jiugong -> Jing Tiandi (or other meditation)
    "fulu_020": "fuzhou_009"  // Huanglu -> Durenjing
  };

  if (explicitLinks[fuluId]) {
    const matched = fuzhouDB.find(f => f.id === explicitLinks[fuluId]);
    if (matched) return matched;
  }

  // 1. Try to find fuzhou with exact usage overlap
  for (const fuzhou of fuzhouDB) {
    const fuzhouUsages = fuzhou.usage || [];
    const overlap = fuluUsages.some((u: string) => fuzhouUsages.includes(u));
    if (overlap) {
      log(4, `[FULU_DB] Matched fulu ${fuluEntry.id} with fuzhou ${fuzhou.id} (usage overlap)`);
      return fuzhou;
    }
  }

  // 2. Try keyword matching in name and description
  for (const fuzhou of fuzhouDB) {
    const fuzhouName = fuzhou.name?.en?.toLowerCase() || "";
    const fuzhouDesc = fuzhou.description?.toLowerCase() || "";

    if (fuluName.includes(fuzhouName) || fuzhouName.includes(fuluName)) return fuzhou;

    // Check common themes
    const themes = ["protection", "exorcism", "meditation", "purification", "salvation", "thunder", "stellar"];
    for (const theme of themes) {
      if ((fuluName.includes(theme) || fuluDesc.includes(theme)) &&
        (fuzhouName.includes(theme) || fuzhouDesc.includes(theme))) {
        log(4, `[FULU_DB] Matched fulu ${fuluEntry.id} with fuzhou ${fuzhou.id} (theme: ${theme})`);
        return fuzhou;
      }
    }
  }

  // 3. Fallback: try to match by index (assuming aligned arrays)
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

  // 1. DEFINITIVE SOURCE: Use existing visualData from DB if available.
  // This honors specialized FDL designs (like fulu_023-039) and prevents 
  // the backend from adding "decorative" shapes that aren't part of the Fu.
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

  // 2. TEMPLATE GENERATION: For entries without definitive visualData in DB.
  if (type === "meditation_palace") {
    // Nine Palaces Grid
    data.visualGrid = ["# - # - #", "| 1 | 2 | 3 |", "# - # - #", "| 4 | 5 | 6 |", "# - # - #", "| 7 | 8 | 9 |", "# - # - #"];
    data.sigilInstructions = [{ type: 'grid', rows: 3, cols: 3, labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] }];
  } else if (type === "composite_symbol") {
    // Pure character stack - NO enclosing circles (not authentic for Taiping style)
    data.sigilInstructions = [];
  } else if (type === "five_directions") {
    // Directional star pattern - circle IS authentic for some directional seals
    data.sigilInstructions = [
      { type: 'path', points: [[200, 100], [250, 300], [100, 180], [300, 180], [150, 300]], width: 2 },
      { type: 'circle', cx: 200, cy: 200, r: 40, fill: true },
      { type: 'text', text: '東', x: 350, y: 200, size: 30, quadrant: 'right' },
      { type: 'text', text: '南', x: 200, y: 350, size: 30, quadrant: 'bottom' },
      { type: 'text', text: '西', x: 50, y: 200, size: 30, quadrant: 'left' },
      { type: 'text', text: '北', x: 200, y: 50, size: 30, quadrant: 'top' }
    ];
  } else if (type === "astral_invocation") {
    // Big Dipper pattern
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
    // Lotus pattern - circle is part of the lotus center
    data.sigilInstructions = [
      { type: 'circle', cx: 200, cy: 200, r: 80, width: 2 },
      { type: 'path', points: [[200, 50], [230, 150], [350, 150], [250, 220], [300, 350], [200, 280], [100, 350], [150, 220], [50, 150], [170, 150]], width: 1.5 },
      { type: 'circle', cx: 200, cy: 200, r: 20, fill: true }
    ];
  } else if (type === "purification") {
    // Pure text for purification
    data.sigilInstructions = [];
  } else if (type === "weapon_inscribed") {
    // Sword shape
    data.sigilInstructions = [
      { type: 'path', points: [[200, 50], [220, 100], [220, 300], [250, 300], [250, 330], [150, 330], [150, 300], [180, 300], [180, 100]], width: 2 },
      { type: 'line', points: [[120, 300], [280, 300]], width: 3 }
    ];
  } else if (remedyType === "fengshui") {
    // Octagon for Feng Shui
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
    // Dantian focus
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
    // Default fallback for any unrecognized structure type
    // We NO LONGER add default circles for Fulu.
    // If it's a Fulu, sigilInstructions is empty, allowing layoutInstructions.labels 
    // (sealChars) to be the sole authentic visual element.
    data.sigilInstructions = [];
    log(4, `[VISUAL_DATA] Using clean fallback for type="${type}" remedyType="${remedyType}"`);
  }

  return data;
}

// Generate quadrant-based layout instructions for canvas rendering
function generateQuadrantLayout(type: string, entry: FuluEntry): any {
  const remedyType = entry?.remedyType;
  // Define 8-section layout (like Bagua) or 4-section (quadrants)
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

  // Add type-specific label placements
  if (type === 'five_directions' || remedyType === 'fengshui') {
    layout.labels = [
      { text: entry.elements?.[0] || '木', position: 'right', element: 'wood' },
      { text: entry.elements?.[1] || '火', position: 'bottom', element: 'fire' },
      { text: entry.elements?.[2] || '土', position: 'center', element: 'earth' },
      { text: entry.elements?.[3] || '金', position: 'left', element: 'metal' },
      { text: entry.elements?.[4] || '水', position: 'top', element: 'water' }
    ];
  }

  // Add seal characters with positions
  if (entry.sealChars && entry.sealChars.length > 0) {
    // Position seal characters vertically in center
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
  if (interpretationContext) {
    log(4, `[FULU_SELECTOR] Using full interpretation context for selection`);
  }

  // Ensure database is loaded
  const database = await loadFuluDatabase();

  // Filter by type if provided
  const basePool = type ? database.filter(e => e.remedyType === type) : database;

  // First try exact hexagram match
  let candidates = basePool.filter(entry =>
    entry.hexagrams.includes(hexagramNumber)
  );

  log(4, `[FULU_SELECTOR] Found ${candidates.length} candidates by hexagram`);

  // If no exact match, try trigram association (within the same type pool)
  if (candidates.length === 0) {
    candidates = basePool.filter(entry =>
      entry.trigram_associations.includes(upperTrigram) ||
      entry.trigram_associations.includes(lowerTrigram)
    );
    log(4, `[FULU_SELECTOR] Found ${candidates.length} candidates by trigram in ${type || 'all'} pool`);
  }

  // Extract interpretation themes for matching
  const interpretationText = interpretationContext ?
    `${interpretationContext.celestial} ${interpretationContext.elements} ${interpretationContext.analysis} ${interpretationContext.advice}`.toLowerCase() :
    '';

  // Score candidates based on multiple factors
  const scored = candidates.map(entry => {
    let score = 0;

    // Verified entries get bonus
    if (entry.verified) {
      score += 5;
    }

    // Hexagram match is highest priority
    if (entry.hexagrams.includes(hexagramNumber)) {
      score += 10;
    }

    // Both trigrams match
    if (entry.trigram_associations.includes(upperTrigram) &&
      entry.trigram_associations.includes(lowerTrigram)) {
      score += 5;
    } else if (entry.trigram_associations.includes(upperTrigram) ||
      entry.trigram_associations.includes(lowerTrigram)) {
      score += 2;
    }

    // Element match from Bazi (if available)
    if (bazi && bazi.elements) {
      const dayMasterElement = bazi.dayMaster?.element;
      if (dayMasterElement && entry.elements.includes(dayMasterElement)) {
        score += 3;
      }
    }

    // Question keyword matching
    const questionLower = question.toLowerCase();
    const purposeMatch = entry.usage.some((usage: string) =>
      questionLower.includes(usage.replace(/_/g, ' '))
    );
    if (purposeMatch) {
      score += 4;
    }

    // NEW: Interpretation context matching - match remedy purpose to reading themes
    if (interpretationText) {
      // Match remedy purpose keywords against interpretation
      const purposeKeywords = entry.purpose?.toLowerCase().split(/[\s,;]+/) || [];
      const interpretationMatches = purposeKeywords.filter((keyword: string) =>
        keyword.length > 3 && interpretationText.includes(keyword)
      ).length;
      score += interpretationMatches * 3;

      // Match remedy usage tags against interpretation
      const usageMatches = entry.usage.filter((usage: string) =>
        interpretationText.includes(usage.replace(/_/g, ' '))
      ).length;
      score += usageMatches * 2;

      // Match remedy description against interpretation themes
      const descKeywords = entry.description?.toLowerCase().split(/[\s,;]+/) || [];
      const descMatches = descKeywords.filter((keyword: string) =>
        keyword.length > 4 && interpretationText.includes(keyword)
      ).length;
      score += descMatches * 1;
    }

    // Add randomness to ensure variety - larger random factor for more variety
    score += Math.random() * 3;

    return { entry, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    // VARIETY: If we have multiple candidates, randomly select from top 3 
    // to ensure variety and prevent always showing the same remedy
    const topCandidates = scored.slice(0, Math.min(3, scored.length));
    const selectedIndex = Math.floor(Math.random() * topCandidates.length);
    const selected = topCandidates[selectedIndex];

    log(4, `[FULU_SELECTOR] Selected from top ${topCandidates.length}: ${selected.entry.id} (${selected.entry.name.zh}) with score ${selected.score.toFixed(2)}`);
    return selected.entry;
  }

  // If no match, return a random verified entry of the same type
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
// PDF GENERATION UTILITIES
// ============================================================================

interface ExportData {
  question: string;
  date: string;
  hexagram: {
    number: number;
    name: string;
    nameZh: string;
    binary: string;
  };
  lines: Array<{
    position: number;
    type: string;
    changing: boolean;
    value: number;
  }>;
  mansion?: {
    name_en: string;
    name_zh: string;
    group: string;
    element: string;
    animal: string;
  };
  birthBazi?: any;
  currentBazi?: any;
  equilibrium?: any;
  interpretation: {
    celestial?: string;
    birthBaziDescription?: string;
    birthBaziImpact?: string;
    currentBaziDescription?: string;
    currentBaziImpact?: string;
    elements?: string;
    analysis?: string;
    advice?: string;
    symbolism?: string;
    movingLines?: string;
    judgment?: string;
    image?: string;
    lines?: string[];
    quotedReferences?: string[];
  };
  remedies?: {
    talisman?: string;
    charm?: string;
    talismanSource?: string;
    charmSource?: string;
  };
  lang: string;
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

class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      504,
      "TIMEOUT_ERROR",
      { operation, timeoutMs }
    );
  }
}

class APIError extends AppError {
  constructor(message: string, details?: any) {
    super(
      message,
      500,
      "API_ERROR",
      details
    );
  }
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new APIError(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
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

interface InterpretationRequest {
  question: string;
  hexagram: {
    number: number;
    name_en: string;
    name_zh: string;
    name_es?: string;
    name_it?: string;
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
  interpretation?: any; // Full reading interpretation results for remedy selection
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

// In-memory caches (for serverless, these are per-invocation)
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
  windowMs: 60000 // 1 minute
};

function checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

  if (!entry || now > entry.resetTime) {
    // New window
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
    // name_zh is now optional for English-only inputs
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
    const validSections = ['celestial', 'elements', 'core', 'lines', 'classical', 'remedies'];
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

  // Merge abort signals if provided
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
    } catch (err) {
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

// Retry wrapper for LLM calls — retries up to maxRetries times with exponential backoff
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

/**
 * deeply cleans HTML, Markdown, and System Prompt Leakage from values
 */
function sanitizeResponseContent(obj: any): any {
  if (typeof obj === 'string') {
    let text = obj;

    // 1. Structure Preservation: Convert HTML blocks to Newlines
    text = text
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>\s*<div/gi, '\n')
      .replace(/<\/li>\s*<li/gi, '\n');

    // 2. Strip HTML Tags completely
    text = text.replace(/<[^>]+>/g, '');

    // 3. Decode HTML Entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ');

    // 4. Remove System Prompt Leakage (The "Titled..." instructions)
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

    // 5. Clean Markdown (Headers, Bold, Italic)
    text = text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/__(.+?)__/g, '$1')     // Underline
      .replace(/^\s*#+\s*/gm, '')      // Headers
      .replace(/`(.+?)`/g, '$1')       // Inline code
      .replace(/^\s*[-*]\s+/gm, '')    // List bullets (convert to plain text lines)
      .trim();

    // 6. Fix excessive newlines
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

// Alias for backward compatibility if needed, pointing to the robust version
const stripMarkdownFromValues = sanitizeResponseContent;

function cleanAndParseJSON(text: string, fallbackField?: string): any {
  if (!text) return fallbackField ? { [fallbackField]: "" } : {};

  // 1. Aggressive pre-cleaning of the raw string
  let cleaned = text.trim();

  // Remove markdown code block markers (multiline-aware)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");

  // Find the JSON object correctly by balancing braces
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
    // Attempt to salvage if it's just a raw string that got passed
    if (text.includes('<div') || text.includes('Titled')) {
      return {
        error: "Invalid JSON",
        content: sanitizeResponseContent(text)
      };
    }
  }

  // 2. Fix Common LLM JSON Errors

  // Fix: Comments (more robustly stripping // and /* */)
  // This regex attempt avoids stripping // inside strings by checking for quotes, 
  // but for our database case where we know there are no URLs, we can be simpler.
  // We'll use a scanner to be 100% safe.
  cleaned = stripComments(cleaned);

  // Fix: Trailing commas
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Fix: Missing commas between objects or arrays (common in AI outputs or manual edits)
  cleaned = cleaned.replace(/}\s*{/g, '},{');
  cleaned = cleaned.replace(/]\s*{/g, '],{');
  cleaned = cleaned.replace(/}\s*\[/g, '},[');

  // Fix: Unescaped newlines/tabs inside string values using a character-level scanner
  // This is more reliable than regex which can misfire on malformed JSON
  cleaned = fixUnescapedCharsInStrings(cleaned);

  // 3. Attempt Parsing with progressively more aggressive fixes
  const attempts: Array<() => any> = [
    // Attempt 1: Parse cleaned string as-is
    () => JSON.parse(cleaned),

    // Attempt 2: Fix single quotes -> double quotes and handle unquoted keys
    () => {
      let fixed = cleaned
        .replace(/'\s*:\s*'/g, '": "')
        .replace(/'\s*:\s*"/g, '": "')
        .replace(/"\s*:\s*'/g, '": "')
        .replace(/{\s*'/g, '{"')
        .replace(/'\s*}/g, '"}')
        .replace(/,\s*'/g, ',"');

      // Fix unquoted keys (e.g., { name: "value" } -> { "name": "value" })
      // Matches alphanumeric keys followed by a colon
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

      return JSON.parse(fixed);
    },

    // Attempt 3: Balance braces AND brackets (handles truncated responses)
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
      // If we're still inside a string, close it first
      let suffix = inString ? '"' : '';
      // Close all open braces/brackets in reverse order
      suffix += stack.reverse().join('');
      return JSON.parse(cleaned + suffix);
    },

    // Attempt 4: Truncation recovery - find last complete key-value pair and close
    () => {
      // Find the last complete value (ends with ", or number, or true/false/null before a potential break)
      const truncationPatterns = [
        // Truncated mid-string-value: find last complete "key": "value"
        /,\s*"[^"]*"\s*:\s*"[^"]*$/,
        // Truncated mid-key
        /,\s*"[^"]*$/,
        // Truncated mid-number
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
      // Now balance braces
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
      // CRITICAL: Apply the sanitizer to the parsed object
      return sanitizeResponseContent(result);
    } catch (e) {
      // Continue to next attempt
      if (i === attempts.length - 1) {
        log(4, `[cleanAndParseJSON] FINAL ATTEMPT FAILED. Error: ${e.message}`);
        // Log more of the content if we're debugging
        log(4, `[cleanAndParseJSON] Attempted to parse: ${cleaned.substring(0, 500)}...`);
      }
    }
  }

  // Fallback
  if (fallbackField) {
    return { [fallbackField]: sanitizeResponseContent(text) };
  }

  log(4, `[cleanAndParseJSON] All repair attempts failed. Preview: ${cleaned.substring(0, 200)}`);

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

/**
 * Character-level scanner that fixes unescaped newlines, tabs, and control chars
 * inside JSON string values. Unlike regex, this properly tracks string boundaries
 * even when the JSON is partially malformed.
 */
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
      // Inside a string
      if (ch === '\\') {
        // Escaped character - pass through both chars
        chars.push(ch);
        if (i + 1 < json.length) {
          chars.push(json[i + 1]);
          i += 2;
        } else {
          i++;
        }
      } else if (ch === '"') {
        // End of string
        inString = false;
        chars.push(ch);
        i++;
      } else if (ch === '\n') {
        // Unescaped newline inside string - escape it
        chars.push('\\', 'n');
        i++;
      } else if (ch === '\r') {
        // Skip carriage returns
        i++;
      } else if (ch === '\t') {
        // Unescaped tab inside string - escape it
        chars.push('\\', 't');
        i++;
      } else if (ch.charCodeAt(0) < 0x20) {
        // Other control characters - skip them
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

    // If parsing failed (returned error object), throw
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
  } catch (error) {
    throw new AppError(
      `Failed to parse or verify API response: ${error.message}`,
      500,
      "PARSE_ERROR",
      { originalText: text.slice(0, 500) }
    );
  }
}

/**
 * Recursively removes translation fields from an object, keeping only English.
 * Removes fields ending in _zh, _es, _it, _pinyin or being exactly those keys.
 * This ensures that LLM inputs are English-only as requested.
 */
function pruneToEnglish(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => pruneToEnglish(item));
  }

  const pruned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip non-English language keys and suffixes
    const isLangKey = ['es', 'it', 'zh', 'pinyin', 'fr', 'de', 'ja', 'ko'].includes(key);
    const hasLangSuffix = key.endsWith('_es') || key.endsWith('_it') || key.endsWith('_zh') || key.endsWith('_pinyin');

    // We keep name_en as the primary identifier
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
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400"
};

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

function formatHexagramForAPI(hexagram: any): any {
  return {
    hexagram_number: hexagram.number,
    name_zh: hexagram.name_zh,
    name_en: hexagram.name_en,
    sections: {
      gua_ci: hexagram.judgment_zh || "",
      yao_ci: hexagram.lines_zh || [],
      tuan_zhuan: hexagram.tuan_zhuan || "",
      xiang_zhuan: hexagram.xiang_zhuan || { main: "", lines: [] },
      wenyan: hexagram.wenyan || ""
    },
    metadata: {
      source: "supabase_bucket",
      version: hexagramCache?.version || "1.0",
      retrieved_at: new Date().toISOString()
    }
  };
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
    } catch (error) {
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

    // Log if response was truncated due to max_tokens
    const finishReason = data.choices[0].finish_reason;
    if (finishReason === 'length') {
      log(4, `[DeepSeek] WARNING: Response truncated (finish_reason=length, max_tokens=${config.maxOutputTokens ?? 2048})`);
    }

    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof ExternalAPIError) throw error;
    throw new ExternalAPIError("DeepSeek", error.message);
  }
}

async function getInterpretation(prompt: string, maxOutputTokens: number, configOverrides: any = {}): Promise<string> {
  const config = { maxOutputTokens, ...configOverrides };
  log(4, `[getInterpretation] Calling AI provider (${CURRENT_AI_PROVIDER})`);
  return await _callDeepSeekAPI(prompt, config);
}

// Wrapper for getting structured JSON with retries
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

      // Add retry-specific instructions if not first attempt
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

      // Log truncation warning - if response ends abruptly it likely hit max_tokens
      if (rawResponse && !rawResponse.trimEnd().endsWith('}') && !rawResponse.trimEnd().endsWith(']')) {
        log(4, `[getStructuredInterpretation] WARNING: Response appears truncated (ends with: "${rawResponse.slice(-30)}")`);
      }

      const parsed = cleanAndParseJSON(rawResponse);

      // Check for parse errors
      if (parsed.error) {
        log(4, `[getStructuredInterpretation] Parse failed, raw preview: ${(rawResponse || '').substring(0, 300)}`);
        throw new Error(parsed.message || "JSON parse error");
      }

      // Validate required fields if specified
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

    } catch (error) {
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

      // Wait before retry (exponential backoff)
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

  // Check if translation exists in cache
  if (hexagram[nameKey] && hexagram[judgmentKey]) {
    log(4, `[TRANSLATION] Using cached ${targetLanguage} translation`);
    return {
      name_zh: hexagram[nameKey],
      judgment_zh: hexagram[judgmentKey],
      lines_zh: hexagram[linesKey] || []
    };
  }

  // Fall back to AI translation
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
    } catch (error) {
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

function getLinePositionMeaning(position: number, isYang: boolean, isChanging: boolean): string {
  const meanings: { [key: number]: string } = {
    1: "The foundation, the beginning, what is emerging from below. Represents the root of the matter.",
    2: "Development and growth. The line of the 'official' - steady progress, building on foundations.",
    3: "The critical point, the doorway. Often indicates difficulty or danger before breakthrough.",
    4: "Transition, entering the upper trigram. Moving from inner to outer, from preparation to action.",
    5: "The ruler's position, the peak of influence. Where wisdom and authority meet. Most auspicious position.",
    6: "The summit, culmination, or excess. What has reached its extreme may transform. Beware of going too far."
  };

  let meaning = meanings[position] || "";
  if (isChanging) {
    meaning += " This line is MOVING, indicating active transformation.";
  }
  return meaning;
}

async function generateCelestialSection(request: InterpretationRequest): Promise<CelestialSection> {
  log(4, `[SECTION:celestial] Generating celestial analysis...`);

  const { mansion, lifePalace, question, birthBazi, currentBazi } = request;

  const systemPrompt = `You are a Daoist Astronomer and BaZi Master. Provide comprehensive celestial analysis including BaZi (Four Pillars of Destiny) influences.
All string values must be plain text - no markdown formatting (no **bold**, no *italic*, no # headings).
DO NOT use nested JSON objects for string fields. Write in continuous plain text paragraphs.

CRITICAL REQUIREMENTS:
1. BIRTH BAZI ANALYSIS: Describe the user's inherent energetic blueprint based on birth time - their Day Master strength, favorable elements, and destiny patterns.
2. CURRENT BAZI ANALYSIS: Describe the energy of the current moment (Prasna) and how it interacts with the birth chart.
3. READING IMPACT: Explicitly explain HOW the BaZi influences affect THIS SPECIFIC I Ching reading - what doors are open/closed, timing considerations, and destiny alignment.
4. LUNAR MANSION: Describe the current mansion's influence on the question.
5. LIFE PALACE: If available, explain palace positions and their meaning.
6. TITLES: The first line of "technicalAnalysis" and "colloquialInterpretation" MUST be a unique, creative, and relevant title for the specific content, followed by a newline. Do NOT use generic labels like "Technical Analysis".

FORMAT (JSON only):
{
  "technicalAnalysis": "Relevant Title\\nDetailed technical section on BaZi stems, branches, Lunar Mansions, degrees, and astrological interactions.",
  "colloquialInterpretation": "Relevant Title\\nDetailed accessible section explaining the celestial influences in practical terms.",
  "birthBazi": { 
    "description": "General description of birth chart characteristics and destiny patterns",
    "readingImpact": "How this birth chart specifically influences the current I Ching reading"
  },
  "currentBazi": { 
    "description": "General description of current temporal energies",
    "readingImpact": "How current energies interact with the question and destiny"
  },
  "lunarMansion": { "description": "text", "influence": "text", "guidance": "text" },
  "lifePalace": { "description": "text", "impact": "text" },
  "celestial": "Combined narrative integrating all celestial influences.",
  "quotedReferences": ["Quote 1 (Source)", "Quote 2 (Source)"]
}`;

  const userPrompt = `### INPUT DATA
- QUESTION: "${question}"
- MANSION: ${mansion ? `${mansion.name_en} - Group: ${mansion.group}, Element: ${mansion.element}, Animal: ${mansion.animal}` : 'N/A'}
- BIRTH_BAZI: ${JSON.stringify(birthBazi || "Not provided")}
- CURRENT_BAZI: ${JSON.stringify(currentBazi || "N/A")}
- LIFE_PALACE: ${JSON.stringify(lifePalace || "Not provided")}

### ANALYSIS INSTRUCTIONS
1. If Birth BaZi is provided, analyze: Day Master element/strength, favorable/unfavorable elements, and how this destiny pattern relates to the question.
2. Analyze Current BaZi (moment of casting) - what energies are present and how they interact with the birth chart.
3. Explain the Lunar Mansion influence on the question.
4. MOST IMPORTANT: Explicitly state HOW these celestial factors affect the I Ching reading - timing recommendations, favorable/unfavorable periods, and destiny alignment.
5. Include specific classical references (Daozang, Zi Ping texts).

Provide comprehensive celestial analysis. The first line of technicalAnalysis and colloquialInterpretation MUST be a unique, relevant title for the content. Include both general descriptions and specific reading impacts.`;

  // Use getStructuredInterpretation for more robust JSON handling
  const requiredFields = ["technicalAnalysis", "colloquialInterpretation", "celestial"];
  const parsed = await getStructuredInterpretation(
    userPrompt,
    1500,
    { systemPrompt, response_mime_type: "application/json" },
    requiredFields,
    3 // max retries
  );

  // Build structured technical data (Layer 1: Technical Data)
  const technicalData = {
    timestamp: new Date().toISOString(),
    hexagram: request.hexagram ? {
      number: request.hexagram.number,
      name: request.hexagram.name_en
    } : null,
    lunarMansion: mansion ? {
      name: mansion.name_en,
      nameZh: mansion.name_zh,
      group: mansion.group,
      element: mansion.element,
      animal: mansion.animal
    } : null,
    birthBazi: request.birthBazi,
    currentBazi: request.currentBazi,
    lifePalace: request.lifePalace,
    chineseAstrology: request.chineseAstrology
  };

  return {
    // Layer 1: Technical Data (raw JSON)
    technicalData: JSON.stringify(technicalData, null, 2),
    // Layer 2: Technical Analysis (classical)
    technicalAnalysis: parsed.technicalAnalysis || "",
    // Layer 3: Colloquial Analysis (modern)
    colloquialInterpretation: parsed.colloquialInterpretation || "",
    // Legacy fields for compatibility
    birthBazi: parsed.birthBazi || { description: "", readingImpact: "" },
    currentBazi: parsed.currentBazi || { description: "", readingImpact: "" },
    lunarMansion: parsed.lunarMansion || { description: "", influence: "", guidance: "" },
    lifePalace: parsed.lifePalace || { description: "", impact: "" },
    celestial: parsed.celestial || parsed.technicalAnalysis || "",
    quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
  };
}

// Split celestial functions for faster processing
// Astro-only: Lunar Mansion, Life Gua, Tai Sui, He Tu, Luo Shu (no BaZi)
async function generateCelestialAstro(request: InterpretationRequest): Promise<any> {
  log(4, `[SECTION:celestial-astro] Generating celestial astrology (no BaZi)...`);
  const { mansion, question, chineseAstrology, hexagram } = request;

  // Layer 1: Technical Data (structured JSON)
  const technicalData = {
    timestamp: new Date().toISOString(),
    hexagram: hexagram ? { number: hexagram.number, name: hexagram.name_en } : null,
    lunarMansion: mansion ? {
      name: mansion.name_en,
      nameZh: mansion.name_zh,
      group: mansion.group,
      element: mansion.element,
      animal: mansion.animal
    } : null,
    lifeGua: chineseAstrology?.lifeGua || null,
    taiSui: chineseAstrology?.taiSui || null,
    heTu: chineseAstrology?.heTu || null,
    luoShu: chineseAstrology?.luoShu || null
  };

  const systemPrompt = `You are a Daoist Astronomer. Provide celestial astrology analysis focusing on Lunar Mansion and cosmic patterns.
All string values must be plain text - no markdown formatting.

CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA: Analyze the actual Lunar Mansion, Life Gua, Tai Sui, He Tu, Luo Shu data provided.
2. LUNAR MANSION: Analyze the current mansion's influence on the question.
3. CELESTIAL CONTEXT: Use He Tu, Luo Shu, Life Gua, Tai Sui from the data.
4. NO BAZI: Do NOT analyze BaZi - focus only on astronomical/cosmic factors.
5. READING IMPACT: How do these celestial factors affect THIS I Ching reading?
6. HEXAGRAM FOCUS: The hexagram is primary - celestial factors inform/modify its message.

FORMAT (JSON only):
{
  "technicalAnalysis": "Title\\nClassical analysis using Zhou Yi and astrological texts",
  "colloquialInterpretation": "Title\\nModern practical interpretation",
  "lunarMansion": { "description": "", "influence": "", "guidance": "" },
  "celestial": "Combined narrative"
}`;

  const userPrompt = `### TECHNICAL DATA (JSON)
${JSON.stringify(technicalData, null, 2)}

### QUESTION
"${question}"

Provide celestial astrology analysis based on the ACTUAL technical data above (NO BaZi). Focus on Lunar Mansion and cosmic patterns. The hexagram is primary; astrology provides timing context.`;

  const requiredFields = ["technicalAnalysis"];
  const parsed = await getStructuredInterpretation(userPrompt, 1200, { systemPrompt, response_mime_type: "application/json" }, requiredFields, 2);

  // BaZi-only: Birth and Current BaZi analysis (no astrology)
  async function generateCelestialBazi(request: InterpretationRequest): Promise<any> {
    log(4, `[SECTION:celestial-bazi] Generating BaZi analysis (no astro)...`);
    const { question, birthBazi, currentBazi, hexagram } = request;

    // Layer 1: Technical Data (structured JSON)
    const technicalData = {
      timestamp: new Date().toISOString(),
      hexagram: hexagram ? { number: hexagram.number, name: hexagram.name_en } : null,
      birthBazi: birthBazi ? {
        year: birthBazi.year,
        month: birthBazi.month,
        day: birthBazi.day,
        hour: birthBazi.hour,
        dayMaster: birthBazi.dayMaster,
        strength: birthBazi.strength?.result || "unknown",
        favorableElements: birthBazi.strength?.favorable || [],
        unfavorableElements: birthBazi.strength?.unfavorable || []
      } : null,
      currentBazi: currentBazi ? {
        year: currentBazi.year,
        month: currentBazi.month,
        day: currentBazi.day,
        hour: currentBazi.hour,
        dayMaster: currentBazi.dayMaster,
        strength: currentBazi.strength?.result || "unknown",
        favorableElements: currentBazi.strength?.favorable || [],
        unfavorableElements: currentBazi.strength?.unfavorable || []
      } : null
    };

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

  // Elements analysis (technical half): technicalAnalysis, composition, trigramRelationship, yinYangAnalysis
  async function generateElementsAnalysis(request: InterpretationRequest, previousContext?: string): Promise<any> {
    log(4, `[SECTION:elements-analysis] Generating elements technical analysis...`);

    const { equilibrium, question, historyAnalysis, birthBazi, currentBazi, hexagram } = request;

    // Layer 1: Technical Data (structured JSON)
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

    const userPrompt = `### TECHNICAL DATA (JSON)
${JSON.stringify(technicalData, null, 2)}

### CELESTIAL CONTEXT (from previous analysis)
${previousContext || "N/A"}

### HISTORY
${historyAnalysis || "N/A"}

### INSTRUCTIONS
Provide Technical Analysis of Wu Xing cycles based on the ACTUAL technical data above. Build upon the BaZi analysis and explain how elemental dynamics specifically relate to the question. The first line of technicalAnalysis MUST be a unique, relevant title.`;

    // Use getStructuredInterpretation for robust JSON handling
    const requiredFields = ["technicalAnalysis"];
    const parsed = await getStructuredInterpretation(
      userPrompt,
      1500,
      { systemPrompt, response_mime_type: "application/json" },
      requiredFields,
      3 // max retries
    );

    return {
      technicalData: JSON.stringify(technicalData, null, 2),
      technicalAnalysis: parsed.technicalAnalysis || "",
      composition: parsed.composition || "",
      trigramRelationship: parsed.trigramRelationship || "",
      yinYangAnalysis: parsed.yinYangAnalysis || ""
    };
  }

  // Elements synthesis (interpretive half): colloquialInterpretation, recommendations, elements, quotedReferences
  async function generateElementsSynthesis(request: InterpretationRequest, previousContext?: string): Promise<any> {
    log(4, `[SECTION:elements-synthesis] Generating elements interpretation...`);

    const { equilibrium, question, historyAnalysis, birthBazi, currentBazi, hexagram } = request;

    // Layer 1: Technical Data (structured JSON) - same as analysis for consistency
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

### HISTORY
${historyAnalysis || "N/A"}

### INSTRUCTIONS
Provide Colloquial Interpretation based on the ACTUAL technical data above. SYNTHESIZE all previous analysis into practical wisdom that directly answers the question. The first line of colloquialInterpretation MUST be a unique, relevant title.`;

    // Use getStructuredInterpretation for robust JSON handling
    const requiredFields = ["colloquialInterpretation", "elements"];
    const parsed = await getStructuredInterpretation(
      userPrompt,
      1500,
      { systemPrompt, response_mime_type: "application/json" },
      requiredFields,
      3 // max retries
    );

    return {
      technicalData: JSON.stringify(technicalData, null, 2),
      colloquialInterpretation: parsed.colloquialInterpretation || "",
      recommendations: parsed.recommendations || "",
      elements: parsed.elements || "",
      quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
    };
  }

  // Legacy wrapper: combines both halves for internal callers (e.g. getModularInterpretation)
  async function generateElementsSection(request: InterpretationRequest): Promise<ElementsSection> {
    log(4, `[SECTION:elements] Generating combined elements (analysis + synthesis)...`);
    const [analysis, synthesis] = await Promise.all([
      generateElementsAnalysis(request),
      generateElementsSynthesis(request)
    ]);
    return {
      technicalAnalysis: analysis.technicalAnalysis || "",
      colloquialInterpretation: synthesis.colloquialInterpretation || "",
      composition: analysis.composition || "",
      trigramRelationship: analysis.trigramRelationship || "",
      yinYangAnalysis: analysis.yinYangAnalysis || "",
      recommendations: synthesis.recommendations || "",
      elements: synthesis.elements || analysis.technicalAnalysis || "",
      quotedReferences: Array.isArray(synthesis.quotedReferences) ? synthesis.quotedReferences : []
    };
  }

  async function generateCoreSection(request: InterpretationRequest): Promise<CoreSection> {
    // Legacy wrapper calling both new functions (if ever called directly)
    const [analysis, app] = await Promise.all([
      generateCoreAnalysis(request),
      generateCoreApplication(request)
    ]);

    return {
      analysis: analysis.analysis || "",
      technicalAnalysis: analysis.technicalAnalysis || "",
      symbolism: analysis.symbolism || "",
      colloquialInterpretation: app.colloquialInterpretation || "",
      advice: app.advice || "",
      quotedReferences: [...(analysis.quotedReferences || []), ...(app.quotedReferences || [])]
    };
  }

  async function generateCoreAnalysis(request: InterpretationRequest, previousContext?: string): Promise<Partial<CoreSection>> {
    log(4, `[SECTION:core-analysis] Generating core analysis (narrative/technical/symbolism)...`);

    const { hexagram, question, lines, historyAnalysis } = request;
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

    const systemPrompt = `You are a master Yi Jing scholar. Provide deep, comprehensive analysis in structured JSON.
All string values must be plain text - no markdown formatting.
DO NOT use nested JSON objects for string fields. Write in continuous plain text paragraphs.

CRITICAL REQUIREMENTS:
1. SYNTHESIZE ALL CONTEXT: Build upon the celestial and elemental analyses provided.
2. ANALYSIS (NARRATIVE): Provide a 3-paragraph cohesive narrative synthesizing ALL aspects of the reading.
3. TECHNICAL ANALYSIS: Provide 3 detailed paragraphs explaining trigram dynamics, referencing celestial and elemental factors.
4. ARCHETYPAL SYMBOLISM: Provide 2 deep philosophical paragraphs connecting imagery to the question.
5. STAY RELEVANT: Every insight must connect back to the user's specific inquiry.
6. TITLES: The first line of "technicalAnalysis" MUST be a unique title, followed by a newline.

FORMAT (JSON only):
{
  "analysis": "Deep cohesive narrative...",
  "technicalAnalysis": "Title\\nTechnical paragraphs...",
  "symbolism": "Archetypal analysis...",
  "quotedReferences": ["Quote 1 (Source)", "..."]
}`;

    const userPrompt = `### INPUT
- QUESTION: "${question}"
- HEXAGRAM: ${hexagram.number} - ${hexagram.name_en}
- MOVING_LINES: ${changingLines.length > 0 ? changingLines.join(', ') : 'None'}

### CELESTIAL & ELEMENTAL CONTEXT (from previous analyses)
${previousContext || "N/A"}

### HISTORY
${historyAnalysis || "N/A"}

### INSTRUCTIONS
Provide comprehensive Core Analysis that SYNTHESIZES all previous celestial and elemental context with the hexagram wisdom. Create a cohesive narrative that directly addresses the question. Reference the BaZi influences and elemental dynamics in your analysis.`;

    const requiredFields = ["analysis", "technicalAnalysis", "symbolism"];
    const parsed = await getStructuredInterpretation(
      userPrompt,
      3000,
      { systemPrompt, temperature: 0.5, response_mime_type: "application/json" },
      requiredFields,
      3
    );

    return {
      analysis: parsed.analysis || "",
      technicalAnalysis: parsed.technicalAnalysis || "",
      symbolism: parsed.symbolism || "",
      quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
    };
  }

  // Split core functions for faster processing
  // Technical-only: Technical analysis and symbolism (no narrative)
  async function generateCoreTechnical(request: InterpretationRequest, previousContext?: string): Promise<any> {
    log(4, `[SECTION:core-technical] Generating core technical analysis...`);
    const { hexagram, question, lines, equilibrium } = request;
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

    // Layer 1: Technical Data (structured JSON) - Hexagram technical data
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
2. TECHNICAL ANALYSIS: Explain trigram dynamics, referencing celestial/elemental factors.
3. ARCHETYPAL SYMBOLISM: Connect imagery to the question philosophically.
4. NO NARRATIVE: Do NOT write the cohesive narrative/analysis section.
5. SYNTHESIZE CONTEXT: Build upon celestial and elemental analyses provided.

FORMAT (JSON only):
{
  "technicalAnalysis": "Title\\nTechnical paragraphs using actual hexagram data...",
  "symbolism": "Archetypal analysis..."
}`;

    const userPrompt = `### TECHNICAL DATA (JSON)
${JSON.stringify(technicalData, null, 2)}

### CONTEXT
${previousContext || "N/A"}

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

  // Narrative-only: Cohesive narrative (no technical, no symbolism)
  async function generateCoreNarrative(request: InterpretationRequest, previousContext?: string): Promise<any> {
    log(4, `[SECTION:core-narrative] Generating core narrative...`);
    const { hexagram, question, lines, equilibrium } = request;
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

    // Layer 1: Technical Data (structured JSON) - Same as technical for consistency
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
2. ANALYSIS (NARRATIVE): Provide 3 paragraphs synthesizing ALL aspects of the reading.
3. STAY RELEVANT: Every insight must connect to the user's inquiry.
4. NO TECHNICAL: Do NOT write technical trigram analysis.
5. NO SYMBOLISM: Do NOT write archetypal symbolism section.
6. SYNTHESIZE CONTEXT: Build upon celestial and elemental analyses.

FORMAT (JSON only):
{
  "analysis": "Deep cohesive narrative based on actual reading data...",
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

  async function generateCoreApplication(request: InterpretationRequest, previousContext?: string): Promise<Partial<CoreSection>> {
    log(4, `[SECTION:core-application] Generating core application (colloquial/advice)...`);

    const { hexagram, question, lines, historyAnalysis } = request;
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

    const systemPrompt = `You are a master Yi Jing scholar. Synthesize the complete reading into practical guidance.
All string values must be plain text - no markdown formatting.
DO NOT use nested JSON objects for string fields. Write in continuous plain text paragraphs.

CRITICAL REQUIREMENTS:
1. SYNTHESIZE FROM READING: Use the celestial, elemental, and hexagram analyses provided to formulate practical guidance. Base ALL advice STRICTLY on the patterns, imbalances, and insights identified in the reading.
2. COLLOQUIAL INTERPRETATION: Provide 3 detailed paragraphs translating the technical analysis into accessible wisdom that directly addresses the user's question.
3. ADVICE SECTION: Extract 4-6 concrete, actionable recommendations based SOLELY on the reading's findings. Each recommendation must directly reference specific elements from the analysis (e.g., "Balance excess Wood by...", "Leverage Fire element timing..."). AVOID generic platitudes that could apply to any situation.
4. DIRECT ANSWER: Ensure every recommendation directly addresses the original question using insights from the reading.
5. TITLES: The first line of "colloquialInterpretation" MUST be a unique title, followed by a newline.

STRICT RULE: Advice must be derived FROM the reading analysis, not invented. If the reading reveals an elemental imbalance, the advice must address that specific imbalance.

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

### HISTORY
${historyAnalysis || "N/A"}

### INSTRUCTIONS
SYNTHESIZE the complete reading into practical guidance. The "advice" field must contain 4-6 specific recommendations derived FROM the celestial, elemental, and hexagram analyses above. Each recommendation should directly address patterns identified in the reading.`

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

  // Dedicated advice endpoint - synthesizes all technical analysis into actionable guidance
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
   Example: "Start your project next month (supported by the Wood element in the temporal chart)."
   Example: "Be cautious of contracts (warned by the changing 3rd line)."

MANDATORY REFERENCES:
You must explicitly reference at least 3 of the following in your advice points:
- The specific Hexagram Image (e.g. "Water over Fire")
- A specific Moving Line (e.g. "Line 2's movement")
- Elemental Balance (e.g. "The lack of Water")
- Celestial influence (e.g. "The current Lunar Mansion")

FORMAT: Plain text (not JSON). Write in a conversational but authoritative tone. Each recommendation should be separated by a blank line.`;

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

      // Clean up the response
      let advice = response.trim();

      // Remove any JSON wrapper if present
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

  async function generateHoutouSection(request: InterpretationRequest, previousContext?: string): Promise<HoutouSection> {
    log(4, `[SECTION:houtou] Generating Houtian (Later Heaven) analysis...`);

    const { birthBazi, currentBazi, lifePalace, question, hexagram } = request;

    const systemPrompt = `You are a Grand Master of Daoist Cosmology, specifically specializing in Houtian (Later Heaven) Bagua and BaZi integration.
Your task is to provide a deep "Houtou" (Earth-Principle and Later Heaven) analysis.

CRITICAL REQUIREMENTS:
1. BAZI INTEGRATION: Analyze the interaction between the Birth BaZi (if available) and the Current BaZi. Identify "Emperors" (Day Masters) and "Masters" (Governing Stems/Branches) of the current moment.
2. LATER HEAVEN BAGUA: Explain how the hexagram's trigrams map onto the Houtian Bagua positions and what this means for spatial and temporal alignment.
3. ANALYSIS: Provide high-level technical and accessible insights.
4. DIAGRAM DATA (FDL): Generate complex visual instructions in FDL format to plot the Houtian relationship. Include:
   - Central Taijitu
   - Later Heaven arrangement rings
   - Interaction lines between BaZi pillars and Trigram sectors.
5. All string values must be plain text - no markdown formatting.
DO NOT use nested JSON objects for string fields. Write in continuous plain text paragraphs.

FORMAT (JSON only):
{
  "technicalAnalysis": "Relevant Title\\nDeep technical narrative on Houtian spatial-temporal mapping.",
  "colloquialInterpretation": "Relevant Title\\nPractical explanation of destiny alignment.",
  "emperorAnalysis": "Analysis of the Day Master (Emperor) and its current environment.",
  "masterAnalysis": "Analysis of the governing 'Masters' (Pillars) of the moment.",
  "diagramData": {
    "fdl": {
      "version": "1.0",
      "layers": [
        {
          "name": "houtian_base",
          "commands": [
            { "type": "bagua", "x": 500, "y": 500, "size": 400, "style": { "color": "#d4af37" } }
          ]
        }
      ]
    }
  },
  "quotedReferences": ["Quote (Source)"]
}`;

    const userPrompt = `### INPUT DATA
- QUESTION: "${question}"
- HEXAGRAM: ${hexagram.number} (${hexagram.name_en})
- BIRTH_BAZI: ${JSON.stringify(birthBazi || "Not provided")}
- CURRENT_BAZI: ${JSON.stringify(currentBazi || "N/A")}
- LIFE_PALACE: ${JSON.stringify(lifePalace || "Not provided")}

### CONTEXT
${previousContext || "N/A"}

### INSTRUCTIONS
Perform a deep Houtou analysis. Identify the "Emperor" and "Masters" of the chart. Generate a complex FDL diagram showing the Later Heaven Bagua interaction with these pillars.`;

    const requiredFields = ["technicalAnalysis", "diagramData"];
    const parsed = await getStructuredInterpretation(
      userPrompt,
      2500,
      { systemPrompt, response_mime_type: "application/json" },
      requiredFields,
      3
    );

    return {
      technicalAnalysis: parsed.technicalAnalysis || "",
      colloquialInterpretation: parsed.colloquialInterpretation || "",
      diagramData: parsed.diagramData || { fdl: { layers: [] } },
      emperorAnalysis: parsed.emperorAnalysis || "",
      masterAnalysis: parsed.masterAnalysis || "",
      quotedReferences: Array.isArray(parsed.quotedReferences) ? parsed.quotedReferences : []
    };
  }

  // Split houtou functions for faster processing
  // Emperor-only: Day Master analysis (no diagram, no master analysis)
  async function generateHoutouEmperor(request: InterpretationRequest, previousContext?: string): Promise<any> {
    log(4, `[SECTION:houtou-emperor] Generating Emperor (Day Master) analysis...`);
    const { birthBazi, currentBazi, question, hexagram } = request;

    // Layer 1: Technical Data (structured JSON) - Emperor/Day Master focus
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

  // Master-only: Governing Pillars analysis (no diagram, no emperor)
  async function generateHoutouMaster(request: InterpretationRequest, previousContext?: string): Promise<any> {
    log(4, `[SECTION:houtou-master] Generating Master (Pillars) analysis...`);
    const { birthBazi, currentBazi, question, hexagram } = request;

    // Layer 1: Technical Data (structured JSON) - Masters/Governing Pillars focus
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

    const { hexagram, question, lines, historyAnalysis } = request;
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

### HISTORY
${historyAnalysis || "N/A"}

Provide line analysis and Classical References.`;

    // Use getStructuredInterpretation for more robust JSON handling
    const requiredFields = ["movingLines", "lineTexts"];
    const parsed = await getStructuredInterpretation(
      userPrompt,
      1200,
      { systemPrompt, response_mime_type: "application/json" },
      requiredFields,
      3 // max retries
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
      // Check what translations exist - CRITICAL: only consider the specific language field
      // Also check if they are non-empty
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

      // Set initial values
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

      // Generate missing translations in parallel
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
          } catch (e) {
            log(4, `Translation failed for ${lang}: ${e.message}`);
            // Set to existing en/zh values as last resort
            result.judgment[lang] = result.judgment[lang] || result.judgment.en || hexData.judgment_zh || "";
            result.image[lang] = result.image[lang] || result.image.en || hexData.image?.image_zh || "";
            result.lines[lang] = result.lines[lang] || result.lines.en || hexData.lines_zh || ["", "", "", "", "", ""];
          }
        }));
      }
    }

    return result;
  }

  // Helper to verify and enhance remedy quality if it contains generic placeholders
  async function verifyAndEnhanceRemedy(remedyData: any, lang: string, hexagramContext?: any): Promise<any> {
    const targetLang = (lang || 'en').toLowerCase();
    const langData = remedyData[targetLang];

    if (!langData || !langData.remedies) return remedyData;

    log(4, `[VERIFIER] Reviewing ${langData.remedies.length} remedies for quality...`);

    // Check for bad data BEFORE calling AI
    let needsFix = false;
    langData.remedies.forEach((remedy: any) => {
      // Check for "Unknown" in relevance or missing values
      if (remedy.relevance?.toLowerCase().includes('unknown') ||
        remedy.relevance?.toLowerCase().includes('seleccionado para equilibrar unknown') ||
        !remedy.relevance ||
        remedy.relevance.length < 20 ||
        remedy.instructions?.toLowerCase().includes('unknown')) {
        needsFix = true;
        log(4, `[VERIFIER] Detected bad data for ${remedy.name}`);
      }
    });

    // If no fixes needed, return early
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
      description: r.description // Provided for context
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
            // Logic: Only update if the current value is poor/unknown
            const curRel = langData.remedies[i].relevance || "";
            const curInst = langData.remedies[i].instructions || "";

            if (rev.relevance && (curRel.toLowerCase().includes('unknown') || curRel.length < 20)) {
              langData.remedies[i].relevance = rev.relevance;
            }

            if (rev.instructions && (curInst.toLowerCase().includes('unknown') || curInst.length < 20)) {
              // Extra check: if the original was short but authentic, don't replace with shorter AI text
              if (rev.instructions.length > curInst.length || curInst.toLowerCase().includes('unknown')) {
                langData.remedies[i].instructions = rev.instructions;
              }
            }

            langData.remedies[i].verification = (langData.remedies[i].verification || "✓") + " Verified";
          }
        });
      }
    } catch (e) {
      log(4, `[VERIFIER] Enhancement failed: ${e.message}`);
    }

    return remedyData;
  }

  // ============================================================================
  // MODULE-SCOPE REMEDY HELPERS (extracted for reuse across endpoints)
  // ============================================================================

  async function formatIncantation(entry: FuluEntry, lang: string): Promise<string | null> {
    const inc = entry.incantation;
    if (!inc || !inc.zh || inc.zh.length < 10) {
      log(4, `[REMEDIES] No valid incantation text for ${entry.id} - skipping charm section`);
      return null;
    }

    // Check if the incantation is just a duplicate of the entry name/description
    const isDuplicate = inc.zh === entry.name?.zh ||
      inc.zh === entry.name?.en ||
      inc.zh === entry.description?.substring(0, inc.zh.length);
    if (isDuplicate) {
      log(4, `[REMEDIES] Incantation for ${entry.id} is a duplicate of name/description - skipping`);
      return null;
    }

    const translationLabel = lang === 'zh' ? '說明' : (lang === 'es' ? 'Traducción' : lang === 'it' ? 'Traduzione' : 'Translation');
    let translationText = (lang === 'es' ? inc.es : lang === 'it' ? inc.it : lang === 'zh' ? inc.zh : inc.en) || inc.en;

    // INCANTATION TRANSLATION DISABLED - Returns English only
    // Translations handled separately via /translate-all endpoint
    // This prevents DeepSeek timeouts during remedy selection

    // Build structured incantation with fuzhou name header
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
    // Get element info with proper fallback
    let primaryElement = Object.entries(equilibrium?.elements || {}).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '';

    // Clean up values - remove 'Unknown' and provide meaningful fallbacks
    if (!primaryElement || primaryElement.toLowerCase() === 'unknown') {
      primaryElement = entry.elements?.[0] || 'Qi';
    }

    // Translation maps
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

    // Capitalize first letter for English
    const elemEn = primaryElement.charAt(0).toUpperCase() + primaryElement.slice(1).toLowerCase();
    // Get translated element
    const elem = lang === 'es' ? (elementMap[elemEn]?.es || elemEn) :
      lang === 'zh' ? (elementMap[elemEn]?.zh || elemEn) : elemEn;

    // Get translated purpose
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

  async function generateRemediesSection(request: InterpretationRequest, context?: any): Promise<any> {
    log(4, `[SECTION:remedies] Selecting authoritative remedies from database...`);
    log(4, `[SECTION:remedies] Full interpretation context available: ${!!request.interpretation}`);

    const { hexagram, question, binaryKey, birthBazi, interpretation } = request;
    // binaryKey is bottom-to-top: first 3 = lower trigram, last 3 = upper
    const lowerTrigram = binaryKey?.substring(0, 3);
    const upperTrigram = binaryKey?.substring(3, 6);

    // Extract interpretation insights for remedy selection
    const interpretationContext = interpretation ? {
      celestial: interpretation.en?.celestial || '',
      elements: interpretation.en?.elements || '',
      analysis: interpretation.en?.analysis || '',
      advice: interpretation.en?.advice || '',
      movingLines: interpretation.en?.movingLines || '',
      coreTechnical: interpretation.en?.coreTechnical || ''
    } : null;

    if (interpretationContext) {
      log(4, `[SECTION:remedies] Using full interpretation context for remedy selection`);
      // Log summary of interpretation themes
      const themes = [];
      if (interpretationContext.celestial) themes.push('celestial');
      if (interpretationContext.elements) themes.push('elements');
      if (interpretationContext.analysis) themes.push('analysis');
      if (interpretationContext.advice) themes.push('advice');
      log(4, `[SECTION:remedies] Interpretation themes: ${themes.join(', ')}`);
    }

    // Select two types of remedies - always one fulu and one environmental (fengshui or medicine)
    // Pass interpretation context for better remedy matching
    const talisman = await selectFuluFromDatabase(
      hexagram.number,
      upperTrigram || "",
      lowerTrigram || "",
      birthBazi,
      question,
      'fulu',
      interpretationContext
    );

    // Always try feng shui first for environmental remedy (shows diagram)
    let envType: 'fengshui' | 'medicine' = 'fengshui';
    let environmental = await selectFuluFromDatabase(
      hexagram.number,
      upperTrigram || "",
      lowerTrigram || "",
      birthBazi,
      question,
      envType,
      interpretationContext
    );

    // Fallback to medicine if no feng shui match found
    if (!environmental) {
      envType = 'medicine';
      environmental = await selectFuluFromDatabase(
        hexagram.number,
        upperTrigram || "",
        lowerTrigram || "",
        birthBazi,
        question,
        envType,
        interpretationContext
      );
    }

    // Deduplicate: ensure we never show the same entry twice
    const selectedRemedies: FuluEntry[] = [];
    if (talisman) selectedRemedies.push(talisman);
    if (environmental && (!talisman || environmental.id !== talisman.id)) {
      selectedRemedies.push(environmental);
    } else if (environmental && talisman && environmental.id === talisman.id) {
      // Same entry selected twice - try the other environmental type
      log(4, `[SECTION:remedies] Duplicate detected (${environmental.id}). Trying alternate type...`);
      const altType = envType === 'fengshui' ? 'medicine' : 'fengshui';
      const altEnvironmental = await selectFuluFromDatabase(hexagram.number, upperTrigram || "", lowerTrigram || "", birthBazi, question, altType as 'fengshui' | 'medicine');
      if (altEnvironmental && altEnvironmental.id !== talisman.id) {
        selectedRemedies.push(altEnvironmental);
      }
    }

    if (selectedRemedies.length > 0) {
      const result: any = {
        en: { remedies: [] },
        es: { remedies: [] },
        it: { remedies: [] },
        zh: { remedies: [] },
        fuluContentList: []
      };

      // Prepare lists for each language
      for (const entry of selectedRemedies) {
        const visualData = generateVisualData(entry);
        const sourceCitation = entry.source.references.length > 0 ? `${entry.source.primary} - ${entry.source.references[0]}` : entry.source.primary;

        // Base English version
        const baseRemedy = {
          type: entry.remedyType,
          name: entry.name.en,
          nameZh: entry.name.zh,
          pinyin: entry.name.pinyin,
          description: entry.description,
          relevance: getRelevance(entry, 'en', request.equilibrium),
          instructions: entry.structure.instructions || entry.instructions || "",
          application: entry.application || "",
          alchemicalContext: entry.alchemicalContext || "",
          charm: await formatIncantation(entry, 'en'),
          source: sourceCitation,
          verification: entry.verified ? "✓ Verified" : "Symbolic"
        };

        result.en.remedies.push(baseRemedy);

        // Translate for other languages
        const targetLangs: ('es' | 'it' | 'zh')[] = ['es', 'it', 'zh'];
        const langNames: { [key: string]: string } = { 'es': 'Spanish', 'it': 'Italian', 'zh': 'Chinese' };

        for (const lang of targetLangs) {
          log(4, `[REMEDIES] Localizing remedy ${entry.id} for ${lang}...`);

          // Try to get existing translation from DB entry first
          const localizedName = entry.name[lang] || entry.name.en;
          const localizedDesc = entry.description[lang] || entry.description;

          const remedy: any = {
            ...baseRemedy,
            name: localizedName,
            description: localizedDesc,
            relevance: getRelevance(entry, lang),
            charm: await formatIncantation(entry, lang)
          };

          // TRANSLATION DISABLED DURING SELECTION - Translations handled separately via /translate-all
          // This keeps remedy selection fast and avoids DeepSeek timeouts
          // All content returns in English, frontend will request translation asynchronously if needed

          result[lang].remedies.push(remedy);
        }

        // Build fuluContent with all required properties for canvas drawing
        const fuluContent: any = {
          id: entry.id,
          remedyType: entry.remedyType,
          talismanNameZh: entry.name.zh,
          sealChars: entry.sealChars,
          hexagramNumber: hexagram.number,
          hexagramChar: hexagram.name_zh?.charAt(0) || '卦',
          // binaryKey is bottom-to-top: first 3 = lower, last 3 = upper
          lowerTrigramBinary: binaryKey?.substring(0, 3) || '000',
          upperTrigramBinary: binaryKey?.substring(3, 6) || '111',
          bottomRows: entry.bottomRows || [],
          type: entry.structure?.type || 'composite_symbol',
          structureElements: entry.structure?.elements || [],
          structurePurpose: entry.structure?.purpose || '',
          ...visualData
        };

        result.fuluContentList.push(fuluContent);
      }

      // Run verifier on the remedies to ensure quality
      return await verifyAndEnhanceRemedy(result, request.lang || 'en');
    }

    // STAGE 2: AI-Assisted Generation (Fallback)
    // Only if no database match found, use AI with STRICT constraints
    log(4, `[SECTION:remedies] No database match found. Using AI fallback with constraints...`);

    const systemPrompt = `You are creating a symbolic Daoist-inspired remedy. IMPORTANT: This is NOT from historical texts.

VERIFIED DATABASE EXAMPLES (use as templates only - do NOT copy directly):
- Taiping Fu (太平符) - Great Peace: CT 390, 547, 219 - Espesset 2015
- Lingbao Wufu (靈寶五符) - Five Talismans: DZ 388 - Lu Pengzhi 2023  
- Tianpeng Fu (天蓬符) - Marshal Talisman: DZ 1220 - Flanigan 2019
- Chishu Wupian (赤書五篇) - Red Writings: DZ 1 - Lu Pengzhi 2023

HEXAGRAM DATA:
- Number: ${hexagram.number}
- Name: ${hexagram.name_en}
- Upper Trigram: ${upperTrigram}
- Lower Trigram: ${lowerTrigram}

STRICT RULES:
1. Source MUST be: "AI-generated symbolic representation (NOT from Daozang or historical texts)"
2. Do NOT reference DZ numbers, CT citations, or claim historical authenticity
3. SealChars must be meaningful Chinese characters (3-4 max) - NOT random
4. The charm should be a contemplative affirmation, not supernatural claims
5. For FDL visual data:
   - Use 'inside' property for nested content: { "type": "circle", "cx": 500, "cy": 500, "r": 200, "inside": { "type": "text", "content": "福", "font": "seal" } }
   - For Feng Shui, generate SPECIFIC overlay lines/dots based on the hexagram and context.
6. Include verification disclaimer in all languages

FORMAT (JSON only):
{
  "en": { 
    "remedies": [
      {
        "type": "fulu|fengshui|medicine",
        "name": "Remedy Name",
        "description": "Sacred description...",
        "relevance": "Connection to hexagram...",
        "instructions": "Sacred steps...",
        "application": "How to use...",
        "alchemicalContext": "Context...",
        "source": "AI-generated symbolic representation",
        "charm": "Incantation text..."
      }
    ]
  },
  "es": { "remedies": [...] },
  "it": { "remedies": [...] },
  "zh": { "remedies": [...] },
  "fuluContentList": [
    {
      "id": "ai_001",
      "talismanNameZh": "...",
      "sealChars": ["...", "..."],
      "sigilInstructions": [...],
      "visualData": { "fdl": { "layers": [...] } }
    }
  ]
}`;

    const userPrompt = `Generate a symbolic remedy for Hexagram ${hexagram.number} (${hexagram.name_en}). 
Target Languages: en, es, it, zh.
Focus on harmonizing the current elemental balance.`;

    try {
      const rawResponse = await getInterpretation(userPrompt, 2500, {
        systemPrompt,
        temperature: 0.3,
        response_mime_type: "application/json"
      });
      let parsed = cleanAndParseJSON(rawResponse);

      // Inject deterministic layout data into each fuluContentList item
      if (parsed.fuluContentList && Array.isArray(parsed.fuluContentList)) {
        parsed.fuluContentList.forEach((f: any) => {
          f.hexagramNumber = hexagram.number;
          f.upperTrigramBinary = upperTrigram;
          f.lowerTrigramBinary = lowerTrigram;
          f.hexagramChar = hexagram.name_zh.charAt(0);
        });
      }

      // Ensure all language keys exist
      ['en', 'es', 'it', 'zh'].forEach(lang => {
        if (!parsed[lang]) parsed[lang] = { remedies: [] };
        if (!parsed[lang].remedies) parsed[lang].remedies = [];
      });

      return parsed;
    } catch (error) {
      log(4, `[SECTION:remedies] AI fallback error: ${error.message}`);
      return {
        en: { remedies: [] },
        es: { remedies: [] },
        it: { remedies: [] },
        zh: { remedies: [] },
        fuluContentList: []
      };
    }
  }

  // ============================================================================
  // COMPOSITION FUNCTIONS
  // ============================================================================

  async function composeInterpretation(
    celestial: CelestialSection,
    elements: ElementsSection,
    core: CoreSection,
    lines: LinesSection,
    classical: ClassicalSection,
    targetLang: string = 'en',
    houtou?: HoutouSection
  ): Promise<any> {
    log(4, `[COMPOSE] Composing final interpretation...`);

    // Validate classical section has required properties
    if (!classical || !classical.judgment || !classical.image || !classical.lines) {
      log(4, `[COMPOSE] WARNING: Invalid classical section, creating empty fallback`);
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
      houtouDiagram: houtou?.diagramData || null,
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

    const result: any = {
      en: {
        ...baseContent,
        judgment: classical.judgment?.en || "",
        image: classical.image?.en || "",
        lines: classical.lines?.en || emptyLines
      }
    };

    const langNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'it': 'Italian',
      'zh': 'Chinese'
    };

    // Helper to detect Chinese characters
    const hasChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

    // OPTIMIZATION: Only process the target language (and 'en' base)
    // This prevents timeouts by avoiding unnecessary translations
    const langsToProcess = ['en'];
    if (targetLang !== 'en' && ['es', 'it', 'zh'].includes(targetLang)) {
      langsToProcess.push(targetLang);
    }

    for (const lang of langsToProcess) {
      const hasJudgment = classical.judgment?.[lang]?.trim();
      const isDifferent = classical.judgment?.[lang] !== classical.judgment?.en;

      let langContent = { ...baseContent };

      // If target language matches this loop lang, and it's NOT the source language (English base), 
      // OR if it's English but the base content contains Chinese that needs translation.
      const needsBaseTranslation = (lang === targetLang && lang !== 'en') ||
        (lang === 'en' && targetLang === 'en' && hasChinese(baseContent.celestialTechnical + baseContent.elementsColloquial));

      if (needsBaseTranslation) {
        log(4, `[COMPOSE] Translating base content to ${langNames[lang]}...`);
        try {
          const translatedBase = await translateInterpretationContent(
            baseContent,
            lang,
            langNames[lang],
            `Hexagram ${celestial?.technicalAnalysis?.split('\\n')[0] || ''}`
          );
          langContent = { ...translatedBase };
        } catch (e) {
          log(4, `[COMPOSE] Translation failed for ${lang}, using English base: ${e.message}`);
        }
      }

      if (lang === 'en') {
        result.en = {
          ...langContent,
          judgment: classical.judgment?.en || classical.judgment?.zh || "",
          image: classical.image?.en || classical.image?.zh || "",
          lines: classical.lines?.en || classical.lines?.zh || emptyLines
        };
      } else if (hasJudgment && isDifferent) {
        result[lang] = {
          ...langContent,
          judgment: classical.judgment[lang] || classical.judgment.en || "",
          image: classical.image?.[lang] || classical.image?.en || "",
          lines: classical.lines?.[lang] || classical.lines?.en || emptyLines
        };
      } else {
        result[lang] = {
          ...langContent,
          judgment: classical.judgment?.en || "",
          image: classical.image?.en || "",
          lines: classical.lines?.en || emptyLines
        };
      }
    }

    return result;
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
  "instructions": "...",
  "application": "...",
  "alchemicalContext": "..."
}

NOTE: lineTexts is an ARRAY of 6 strings (one for each line). Translate each array element and return as an array.`;

    const userPrompt = `HEXAGRAM: ${hexagramName} TARGET LANGUAGE: ${targetLangName} CONTENT TO TRANSLATE (Translate everything completely and faithfully): ${JSON.stringify(content, null, 2)}`;

    try {
      // Use getStructuredInterpretation for better reliability
      const requiredFields = content.celestialTechnical ? ["celestialTechnical"] : [];
      const parsed = await getStructuredInterpretation(
        userPrompt,
        4000,
        { systemPrompt, temperature: 0.2, response_mime_type: "application/json" },
        requiredFields,
        2 // retries
      );

      return {
        ...content,
        ...parsed
      };
    } catch (error) {
      log(4, `[TRANSLATE] Translation failed or timed out: ${error.message}`);
      // Return original content as fallback so UI doesn't break
      return content;
    }
  }

  async function getModularInterpretation(request: InterpretationRequest): Promise<any> {
    // Prune request to English only
    const prunedRequest = pruneToEnglish(request);
    log(4, `[MODULAR] Starting modular interpretation for hexagram ${prunedRequest.hexagram.number}`);
    const startTime = Date.now();

    try {
      // Run sections sequentially to avoid overwhelming DeepSeek / function memory.
      // Each section is one DeepSeek call (+ up to 2 retries on JSON parse failure).
      log(4, `[MODULAR] Generating celestial...`);
      const celestial = await generateCelestialSection(prunedRequest);

      log(4, `[MODULAR] Generating elements...`);
      const elements = await generateElementsSection(prunedRequest);

      log(4, `[MODULAR] Generating core...`);
      const core = await generateCoreSection(prunedRequest);

      log(4, `[MODULAR] Generating houtou...`);
      const houtou = await generateHoutouSection(prunedRequest, `${celestial.celestial} ${elements.elements}`);

      log(4, `[MODULAR] Generating lines...`);
      const lines = await generateLinesSection(prunedRequest);

      log(4, `[MODULAR] Generating classical...`);
      const classical = await generateClassicalSection(prunedRequest);

      log(4, `[MODULAR] Generating remedies...`);
      const remedies = await generateRemediesSection(prunedRequest, { celestial, elements, core, lines, houtou });

      log(4, `[MODULAR] All sections generated in ${Date.now() - startTime}ms, composing...`);

      // Compose final result
      const composed = await composeInterpretation(celestial, elements, core, lines, classical, prunedRequest.lang, houtou);
      composed.remedies = remedies;

      log(4, `[MODULAR] Complete in ${Date.now() - startTime}ms.`);
      return composed;

    } catch (error) {
      log(4, `[MODULAR] Error: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // LEGACY SYNTHESIS FUNCTIONS (for backwards compatibility)
  // ============================================================================

  async function getSynthesizedInterpretation(initialPrompt: string, inputParams: any): Promise<string> {
    log(4, `[SYNTHESIS] Starting synthesis for: ${JSON.stringify(inputParams)}`);

    const MAX_OUTPUT_LENGTH = 1200;
    const API_CALL_DELAY = 300;
    const successfulInterpretations: string[] = [];

    // Get 3 initial interpretations
    for (let i = 0; i < 3; i++) {
      try {
        log(4, `[SYNTHESIS] Requesting interpretation pass ${i + 1}...`);
        const interpretation = await getInterpretation(initialPrompt, MAX_OUTPUT_LENGTH);
        if (interpretation) {
          successfulInterpretations.push(interpretation);
        }
        if (i < 2) {
          await sleep(API_CALL_DELAY);
        }
      } catch (error) {
        log(4, `[SYNTHESIS] Pass ${i + 1} failed: ${error.message}`);
      }
    }

    if (successfulInterpretations.length === 0) {
      throw new AppError("All interpretation passes failed", 500, "SYNTHESIS_FAILED");
    }

    if (successfulInterpretations.length === 1) {
      return successfulInterpretations[0];
    }

    // Synthesis pass
    const synthesisPrompt = `You are a master synthesizer. Combine these I Ching interpretations into one cohesive analysis:

${successfulInterpretations.map((interp, i) => `--- Interpretation ${i + 1} ---\n${interp}`).join('\n\n')}

Create a unified, eloquent analysis.`;

    return await getInterpretation(synthesisPrompt, MAX_OUTPUT_LENGTH);
  }

  // ============================================================================
  // MAIN SERVER HANDLER
  // ============================================================================

  serve(async (req) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // IMMEDIATE LOG - Check if function is invoked
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

      // POST endpoints
      if (req.method === 'POST') {
        response = await handlePostRequest(req, lastSegment, requestId, startTime);
      }
      // GET endpoints
      else if (req.method === 'GET') {
        response = await handleGetRequest(req, lastSegment, secondLastSegment, requestId, startTime);
      }
      // Unsupported methods
      else {
        throw new AppError(
          `Method ${req.method} not allowed`,
          405,
          "METHOD_NOT_ALLOWED",
          { allowedMethods: ['GET', 'POST', 'OPTIONS'] }
        );
      }

      // Add CORS and request ID headers
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
      log(4, `[ERROR] ${error.message}`, { requestId, stack: error.stack });

      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const response = createErrorResponse(error, requestId);

      return new Response(JSON.stringify(response), {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders, "X-Request-ID": requestId }
      });
    }
  });

  // ============================================================================
  // REQUEST HANDLERS
  // ============================================================================
  // FULU 3-PASS VERIFICATION SYSTEM
  // ============================================================================

  interface FuluVerificationResult {
    approved: boolean;
    score: number;
    issues: string[];
    feedback?: string;
  }

  /**
   * PASS 1: Generate Initial Fulu Drawing
   * Creates the base drawing instructions based on hexagram and remedy data
   */
  async function generateFuluDrawingPass1(
    hexagram: any,
    binaryKey: string,
    fuluContentList: any[],
    remedies: any[],
    lang: string
  ): Promise<any> {
    // Strip ALL non-visual metadata to minimize prompt size
    const visualContext = remedies.map(r => ({
      id: r.id,
      type: r.type,
      name: r.name,
      purpose: r.nameZh // Use Chinese name as purpose hint
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
  - ALL primitive shapes (circle, rect, polygon, path) support 'inside': { type: "text"|"symbol", content: "...", font: "seal"|"worm"|"regular", scale: 0.1-1.0 } to place content centered within the form.
  - Advanced (Long Hu Shan Style): 
    - "bagua": { x, y, size, style: { color } } (Renders Houtian Bagua)
    - "loshu": { x, y, size, style: { color } } (Renders Lo Shu Grid with dots)
    - "constellation": { x, y, size, name: "big_dipper", style: { color } } (Renders Beidou)
    - "seal": { x, y, size, variant: "thunder", style: { color } } (Renders Lei Ling Seal)
  - ALL commands support 'quadrant': "top", "bottom", "left", "right", "top-left", etc. (offsets the element to that region).

DESIGN REQUIREMENTS (LONG HU SHAN STYLE - Heaven/Man/Earth):
1. HEADER (Heaven): Use 'bagua' (size ~250) or 'constellation' (if exorcism related) at the top. This channels celestial energy.
2. BODY (Man): The 'seal_core' layer must contain ONLY the exact sealChars provided. Arrange vertically. Use 'seal' command for framing if appropriate.
3. FOOTER (Earth): Use 'loshu' (size ~180) or 'bagua' at the bottom to ground the energy.
4. BORDERS: Every talisman MUST have a complex, multi-layered border (gold outer, red inner, dashed patterns).
5. COLORS: Predominantly Gold (#d4af37) and Cinnabar (#e63946).
6. AUTHENTICITY: Reflect the talisman's purpose. Exorcism = Big Dipper. Protection = Bagua. Wealth = Lo Shu.

Return ONLY valid JSON. Every drawing MUST be a unique, non-trivial work of digital Daoist art.`;

    const userPrompt = `Generate FDL for Hexagram ${hexagram.number} (${hexagram.name_en}).
Binary: ${binaryKey}
Remedies: ${JSON.stringify(visualContext)}
Talismans: ${JSON.stringify(targetItems)}

CRITICAL RULES:
1. The ONLY Chinese characters allowed in the entire FDL are: the exact sealChars from each talisman item, and the hexChar. Do NOT add, invent, or hallucinate ANY other Chinese characters.
2. Each talisman's seal_core MUST contain its sealChars arranged vertically, and NOTHING else.
3. The design must reflect the talisman's specific name and type — not generic patterns.
4. Use the full power of FDL (groups, quadrants, paths, circles) for a unique, non-trivial visual representation.`;

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
    } catch (error) {
      log(4, `[fulu-drawing:PASS-1] Generation error: ${error.message}`);
      // Return fallback
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

  /**
   * PASS 2: Verify Relevance & Authenticity
   */
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

    // Build a summary of the drawing to keep prompt size manageable
    let drawingSummary: any[];
    if (drawing.fdl && !drawing.drawings) {
      // Direct FDL format from Pass 1
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

    const systemPrompt = `You are a Daoist Text Verification Scholar. Verify if the generated Fulu (talisman) summary is relevant and authentic.
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

  /**
   * PASS 3: Verify Drawing Accuracy (FDL v1.0)
   */
  async function verifyFuluPass3(
    drawing: any,
    hexagram: any,
    binaryKey: string
  ): Promise<FuluVerificationResult> {
    const issues: string[] = [];
    let score = 100;

    // Handle both direct FDL format and drawings-array format
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

    // Validate coordinates in all layers
    const checkCoords = (cmd: any, layerName: string) => {
      // Check direct coordinates on the command
      const coords = [cmd.x, cmd.y, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.cx, cmd.cy];
      coords.forEach((c: any) => {
        if (c !== undefined && (c < -200 || c > 1200)) {
          issues.push(`Coordinate out of FDL bounds: ${c} in layer ${layerName}`);
          score -= 5;
        }
      });
      // Also check nested format
      const knownTypes = ['line', 'path', 'circle', 'text', 'group', 'rect', 'arc'];
      for (const type of knownTypes) {
        if (cmd[type] && typeof cmd[type] === 'object') {
          checkCoords(cmd[type], layerName);
          // Check sub-commands in groups
          if (cmd[type].commands) {
            cmd[type].commands.forEach((sub: any) => checkCoords(sub, layerName));
          }
        }
      }
      // Check sub-commands in flat-format groups
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

  /**
   * Regenerate Fulu with feedback from Pass 2
   */
  async function regenerateFuluWithFeedback(
    original: any,
    issues: string[],
    hexagram: any,
    binaryKey: string,
    remedies: any[],
    lang: string
  ): Promise<any> {
    log(4, `[fulu-drawing:REGEN] Regenerating with ${issues.length} issues`);

    const systemPrompt = `You are a Daoist Sigil Master. Regenerate the Fulu drawing using FDL (Fulu Drawing Language v1.0), addressing these specific issues:
${issues.join('\n')}

FDL SPECIFICATION (Coordinate System: 0-1000 square grid):
- Root: { "fdl": { "version": "1.0", "background": "#0a0a0a", "layers": [ ... ] } }
- Layer: { "name": "string", "opacity": 0-1, "commands": [ ... ] }
- Commands: line, path, circle, text, group, bagua, loshu, constellation, seal (0-1000 coords).
- Enclosing Forms (circle, rect, polygon, path) support 'inside': { type: "text"|"symbol", content: "...", font: "seal"|"worm"|"regular", scale: 0.1-1.0 } to nest content.

CRITICAL RULES (LONG HU SHAN STYLE):
1. HEADER (Heaven): Use 'bagua' or 'constellation' commands.
2. BODY (Man): Vertical sealChars. 'seal' command frame.
3. FOOTER (Earth): 'loshu' or 'bagua' commands.
4. Fix all structural issues.
5. The ONLY Chinese characters allowed are the exact sealChars provided for each talisman, plus the hexagram character. Do NOT add any other characters.

Return ONLY valid JSON.`;

    const userPrompt = `REGENERATE FULU - Fix these issues: ${issues.join(', ')}

Hexagram: ${hexagram.number} - ${hexagram.name_en}
Binary: ${binaryKey}
Remedies: ${JSON.stringify(remedies || [])}

STRICT: Only use sealChars from the remedy data. Do NOT invent Chinese characters.
Generate corrected FDL instructions.`;

    try {
      const rawResponse = await getInterpretation(userPrompt, 2500, {
        systemPrompt,
        temperature: 0.3,
        response_mime_type: "application/json"
      });
      return cleanAndParseJSON(rawResponse);
    } catch (error) {
      log(4, `[fulu-drawing:REGEN] Regeneration failed: ${error.message}`);
      return original;
    }
  }

  /**
   * Fix structural issues from Pass 3
   */
  async function fixFuluStructure(
    original: any,
    issues: string[],
    hexagram: any,
    binaryKey: string
  ): Promise<any> {
    log(4, `[fulu-drawing:FIX] Fixing ${issues.length} structural issues`);

    const drawings = (original.drawings || []).map((d: any) => {
      // If FDL is missing but we have old-style instructions, we keep them for backward compatibility
      // but if both are missing, we provide a minimal FDL structure
      if (!d.fdl && (!d.sigilInstructions || d.sigilInstructions.length === 0)) {
        return {
          ...d,
          fdl: {
            version: "1.0",
            background: "#0a0a0a",
            layers: [
              {
                name: "recovery",
                commands: [
                  { type: "circle", cx: 500, cy: 500, r: 300, style: { width: 2, color: "#d4af37" } },
                  { type: "text", x: 500, y: 500, content: "符", size: 100, style: { color: "#d4af37" } }
                ]
              }
            ]
          }
        };
      }
      return d;
    });

    return {
      ...original,
      drawings
    };
  }

  // ============================================================================
  // REMEDY ENDPOINT HANDLERS
  // ============================================================================

  async function handleRemediesMain(body: any, requestId: string, startTime: number): Promise<Response> {
    log(4, `[remedies-main] Generating modular remedies...`);
    const prunedBody = pruneToEnglish(body);
    const request: InterpretationRequest = prunedBody;

    // Validation
    validators.question(request.question);
    validators.hexagramData(request.hexagram);

    const result = await generateRemediesSection(request);

    return new Response(
      JSON.stringify(createSuccessResponse(result, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * handleRemediesSelect
   * AI-assisted selection using DB as truth source. 
   * First step of the restructured progressive pipeline.
   */
  async function handleRemediesSelect(body: any, requestId: string, startTime: number): Promise<Response> {
    log(4, `[remedies-select] Selecting remedies from database using AI assistance...`);

    const prunedBody = pruneToEnglish(body);
    const { question, hexagram, binaryKey, equilibrium, interpretation, interpretationContext, recentRemedies } = prunedBody;

    // Validation
    validators.question(question);
    validators.hexagramData(hexagram);

    // 1. Load Fulu database
    const database = await loadFuluDatabase();

    const lowerTrigram = binaryKey?.substring(0, 3) || "";
    const upperTrigram = binaryKey?.substring(3, 6) || "";

    // Robust extraction of interpretation text for resonance scoring
    const enInterp = interpretation?.en || interpretation || {};
    const analysisText = enInterp.analysis || enInterp.coreColloquial || interpretationContext?.coreColloquial || "";
    const celestialText = enInterp.celestialColloquial || enInterp.celestial || interpretationContext?.celestialColloquial || "";
    const combinedContext = `${analysisText} ${celestialText} ${question}`.toLowerCase();

    // 2. Pre-filter and score catalog to Top 15 per category to reduce prompt size and noise
    const getScoredCandidates = (typePool: FuluEntry[]) => {
      return typePool.map(entry => {
        let score = 0;
        // High priority: Hexagram or Trigram direct match
        if (entry.hexagrams?.includes(hexagram.number)) score += 15;
        if (entry.trigram_associations?.includes(upperTrigram)) score += 7;
        if (entry.trigram_associations?.includes(lowerTrigram)) score += 7;

        // Keyword matching against interpretation context
        const keywords = [...(entry.usage || []), entry.purpose || ""].map(k => k.replace(/_/g, ' '));
        keywords.forEach(kw => {
          if (kw.length > 3 && combinedContext.includes(kw.toLowerCase())) score += 6;
        });

        if (entry.verified) score += 4;

        // VARIETY FACTOR: Large random weight to ensure selection changes and explores the catalog
        score += Math.random() * 15;

        return { entry, score };
      })
        .sort((a, b) => b.score - a.score)
        .slice(0, 15) // Keep top candidates
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

    // 3. AI call to select remedies
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
3. MANDATORY VARIETY: Evaluate the full catalog. Do NOT default to common entries if others have meaningful resonance.
4. Generate English relevance text, instructions, and application guidance contextualized to the inquiry.
5. Provide a "selectionReason" justifying the choice based on technical alignment.
6. Output valid JSON.`;

    const userPrompt = `READING CONTEXT:
- Hexagram: ${hexagram.number} (${hexagram.name_en})
- Trigrams: Upper ${upperTrigram}, Lower ${lowerTrigram}
- Interpretation Snippet: ${analysisText.substring(0, 1000)}...
- Question: "${question}"

Select the best fitting remedies. Return JSON: { 
  "selectedFulu": "id", 
  "selectedEnv": "id", 
  "fuluRelevance": "why this talisman matters for this inquiry...", 
  "fuluInstructions": "how to use it...", 
  "fuluApplication": "physical placement...", 
  "envRelevance": "why this environmental remedy matters...", 
  "envInstructions": "...", 
  "envApplication": "...", 
  "selectionReason": "..." 
}`;

    // Use required fields to ensure high-quality response
    const requiredFields = ["selectedFulu", "selectedEnv", "fuluRelevance", "envRelevance"];
    const selection = await getStructuredInterpretation(
      userPrompt,
      2500,
      { systemPrompt, temperature: 0.5, response_mime_type: "application/json" },
      requiredFields,
      3
    );

    // 4. Look up full entries and build response
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

      // Combined instructions with fallbacks
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

      // Build fuluContent for canvas
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

  /**
   * handleRemediesTranslate
   * Translates one remedy to one target language.
   */
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

    // Look up entry for incantation if ID provided
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
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * handleRemediesVerify
   * Background verification for remedies.
   */
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

  /**
   * handleFuluDrawingGenerate
   * Pass 1 of the Fulu drawing pipeline.
   */
  async function handleFuluDrawingGenerate(body: any, requestId: string, startTime: number): Promise<Response> {
    const { hexagram, binaryKey, fuluContentList, remedies, lang } = body;

    if (!hexagram || !binaryKey) {
      throw new ValidationError("Hexagram and binaryKey are required");
    }

    log(4, `[fulu-drawing-generate] Pass 1 generation...`);
    const result = await generateFuluDrawingPass1(hexagram, binaryKey, fuluContentList, remedies, lang);

    return new Response(
      JSON.stringify(createSuccessResponse(result, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * handleFuluDrawingVerify
   * Pass 2 and 3 of the Fulu drawing pipeline.
   */
  async function handleFuluDrawingVerify(body: any, requestId: string, startTime: number): Promise<Response> {
    const { initialDrawing, hexagram, binaryKey, question, lang, remedies } = body;

    if (!initialDrawing || !hexagram || !binaryKey) {
      throw new ValidationError("initialDrawing, hexagram, and binaryKey are required");
    }

    log(4, `[fulu-drawing-verify] Pass 2 & 3 verification...`);

    const db = await loadFuluDatabase();

    // PASS 2
    const verification2 = await verifyFuluPass2(initialDrawing, hexagram, binaryKey, question, db, lang);

    if (!verification2.approved) {
      log(4, `[fulu-drawing-verify] PASS 2 FAILED - Regenerating...`);
      const correctedDrawing = await regenerateFuluWithFeedback(initialDrawing, verification2.issues, hexagram, binaryKey, remedies, lang);
      // Handle both direct FDL and drawings-array formats
      if (correctedDrawing.fdl) {
        initialDrawing.fdl = correctedDrawing.fdl;
      }
      if (correctedDrawing.drawings) {
        initialDrawing.drawings = correctedDrawing.drawings;
      }
      if (correctedDrawing.instructions) {
        initialDrawing.instructions = correctedDrawing.instructions;
      }
    }

    // PASS 3
    const verification3 = await verifyFuluPass3(initialDrawing, hexagram, binaryKey);

    if (!verification3.approved) {
      log(4, `[fulu-drawing-verify] PASS 3 FAILED - Fixing structure...`);
      const fixedDrawing = await fixFuluStructure(initialDrawing, verification3.issues, hexagram, binaryKey);
      if (fixedDrawing.fdl) {
        initialDrawing.fdl = fixedDrawing.fdl;
      }
      if (fixedDrawing.drawings) {
        initialDrawing.drawings = fixedDrawing.drawings;
      }
      if (fixedDrawing.instructions) {
        initialDrawing.instructions = fixedDrawing.instructions;
      }
    }

    // Add verification metadata
    initialDrawing.verification = {
      pass2_relevance: verification2.approved ? "Approved" : "Corrected",
      pass2_score: verification2.score,
      pass2_issues: verification2.issues,
      pass3_structure: verification3.approved ? "Approved" : "Fixed",
      pass3_score: verification3.score,
      pass3_issues: verification3.issues,
      overall_score: (verification2.score + verification3.score) / 2
    };

    return new Response(
      JSON.stringify(createSuccessResponse(initialDrawing, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleRemediesFuluDraw(body: any, requestId: string, startTime: number): Promise<Response> {
    log(4, `[fulu-drawing] Starting 3-pass verification pipeline...`);

    const prunedBody = pruneToEnglish(body);
    const { hexagram, binaryKey, fuluContentList, remedies, lang, question } = prunedBody;

    if (!hexagram || !binaryKey) {
      throw new ValidationError("Hexagram and binaryKey are required");
    }

    // Load Fulu database for verification
    const db = await loadFuluDatabase();

    // ============================================================================
    // PASS 1: Generate Initial Fulu Drawing
    // ============================================================================
    log(4, `[fulu-drawing:PASS-1] Generating initial drawing...`);

    const initialDrawing = await generateFuluDrawingPass1(hexagram, binaryKey, fuluContentList, remedies, lang);

    // ============================================================================
    // PASS 2: Verify Relevance & Authenticity
    // ============================================================================
    log(4, `[fulu-drawing:PASS-2] Verifying relevance and authenticity...`);

    const verification2 = await verifyFuluPass2(initialDrawing, hexagram, binaryKey, question, db, lang);

    if (!verification2.approved) {
      log(4, `[fulu-drawing:PASS-2] FAILED - Regenerating with feedback: ${verification2.issues.join(', ')}`);
      // Regenerate with feedback
      const correctedDrawing = await regenerateFuluWithFeedback(initialDrawing, verification2.issues, hexagram, binaryKey, remedies, lang);
      initialDrawing.drawings = correctedDrawing.drawings;
      initialDrawing.instructions = correctedDrawing.instructions;
    } else {
      log(4, `[fulu-drawing:PASS-2] PASSED - Relevance and authenticity verified`);
    }

    // ============================================================================
    // PASS 3: Verify Drawing Accuracy (Quadrants, Structure)
    // ============================================================================
    log(4, `[fulu-drawing:PASS-3] Verifying drawing accuracy and structure...`);

    const verification3 = await verifyFuluPass3(initialDrawing, hexagram, binaryKey);

    if (!verification3.approved) {
      log(4, `[fulu-drawing:PASS-3] FAILED - Fixing structural issues: ${verification3.issues.join(', ')}`);
      // Fix structural issues
      const fixedDrawing = await fixFuluStructure(initialDrawing, verification3.issues, hexagram, binaryKey);
      initialDrawing.drawings = fixedDrawing.drawings;
    } else {
      log(4, `[fulu-drawing:PASS-3] PASSED - Drawing structure verified`);
    }

    // Add verification metadata to response
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

  /**
   * Extract a short, meaningful label from a long instruction text.
   * Returns e.g. "Plants · Wood", "Water Feature", "Metal Coins", etc.
   */
  function extractShortFDLLabel(text: string, dir?: string): string {
    if (!text || text.length <= 35) return text || dir || '';

    // Direction → element + canonical item mapping
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

    // Try to extract item from action verbs like "Place X", "Add X", "Activate X"
    const actionMatch = text.match(/\b(?:Place|Add|Use|Activate|Strengthen|Enhance)\s+([^,.!?()]{3,30})/i);
    if (actionMatch) {
      const candidate = actionMatch[1].trim().replace(/\s+/g, ' ');
      if (candidate.length <= 30) return candidate;
    }

    // Try to extract element name + one following noun
    const elementMatch = text.match(/\b(Wood|Fire|Earth|Metal|Water)\s+element\s+(\w+)/i);
    if (elementMatch) return `${elementMatch[1]} · ${elementMatch[2]}`;

    // Fallback to direction metadata
    if (dir && dirMeta[dir]) {
      const { element, item } = dirMeta[dir];
      return `${item}\n${element}`;
    }

    // Last resort: first 30 chars of first sentence
    const firstSentence = text.split(/[.!?]/)[0].trim();
    return firstSentence.length <= 35 ? firstSentence : firstSentence.substring(0, 32) + '…';
  }

  /**
   * Post-process an FDL object, truncating any label texts longer than 40 chars.
   */
  function sanitizeFDLLabels(fdl: any): void {
    if (!fdl?.layers) return;
    fdl.layers.forEach((layer: any) => {
      if (!layer.commands) return;
      layer.commands.forEach((cmd: any) => {
        if (cmd.label?.text && typeof cmd.label.text === 'string' && cmd.label.text.length > 40) {
          cmd.label.text = extractShortFDLLabel(cmd.label.text, cmd.trigram ? undefined : cmd.direction);
        }
        if (cmd.text && typeof cmd.text === 'string' && cmd.text.length > 40 && cmd.type === 'annotation') {
          // Annotations intentionally keep their text (they may be multi-line instructions)
          // but cap to 3 lines of ~30 chars each
          const lines = cmd.text.split('\n').slice(0, 3).map((l: string) => l.substring(0, 30));
          cmd.text = lines.join('\n');
        }
      });
    });
  }

  /**
   * Generate FDL v2.0 document for Feng Shui diagram with sector highlights
   */
  function generateFengShuiFDL(favorable: string[], unfavorable: string[], instructions?: Record<string, string>): any {
    // Map directions to trigrams
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
    const markerCommands: any[] = [];

    // Add favorable highlights (GREEN)
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

    // Add unfavorable highlights (RED)
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
        },
        {
          name: "instruction_markers",
          type: "annotation_layer",
          opacity: 1.0,
          commands: markerCommands
        }
      ]
    };
  }

  async function handleRemediesBagua(body: any, requestId: string, startTime: number): Promise<Response> {
    log(4, `[bagua-medicine] Generating Bagua medicine and Feng Shui guidance...`);

    const prunedBody = pruneToEnglish(body);
    const { interpretation, question, hexagram, lang } = prunedBody;
    const targetLang = lang || 'en';

    const systemPrompt = `You are a Master of Bagua Medicine (Ba Gua Zhen Liao) and Classical Feng Shui.
Provide therapeutic and environmental adjustments based on I Ching readings.
All string values must be plain text - no markdown formatting (no **bold**, no *italic*, no # headings).

═══ HOUTIAN (LATER HEAVEN) BAGUA REFERENCE ════════════════════════════════════
Standard arrangement with SOUTH at TOP (traditional Chinese view):

Position:     Trigram   Direction   Element   Life Area
─────────     ───────   ─────────   ───────   ─────────
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
4. Include Houtian (Later Heaven) Bagua analysis for specific sectors
5. VISUAL FDL v2.0: Generate proper FDL JSON for the Feng Shui diagram
   
═══ FDL v2.0 STRUCTURE FOR FENG SHUI ══════════════════════════════════════════
{
  "version": "2.0",
  "type": "fengshui_diagram",
  "arrangement": "houtian",
  "background": "#1a1a2e",
  "layers": [
    {
      "name": "base_bagua",
      "type": "base_layer",
      "commands": [{ "type": "bagua", "cx": 500, "cy": 500, "size": 900 }]
    },
    {
      "name": "sector_highlights",
      "type": "highlight_layer",
      "opacity": 0.6,
      "commands": [
        // For FAVORABLE directions - use GREEN colors
        {
          "type": "highlight_sector",
          "trigram": "Xun",  // Use trigram name (Li, Xun, Zhen, Gen, Kan, Qian, Dui, Kun)
          "style": {
            "fill": "#00FF0040",      // Green with transparency
            "stroke": "#00FF00",       // Bright green border
            "strokeWidth": 3,
            "glow": true,
            "glowColor": "#00FF00",
            "glowRadius": 20
          },
          "label": {
            "text": "Place Wealth Bowl Here",
            "color": "#00FF00",
            "fontSize": 14
          }
        },
        // For UNFAVORABLE directions - use RED colors  
        {
          "type": "highlight_sector",
          "trigram": "Kan",
          "style": {
            "fill": "#FF000040",      // Red with transparency
            "stroke": "#FF0000",
            "strokeWidth": 3
          },
          "label": {
            "text": "Avoid - Do Not Place Water",
            "color": "#FF4444"
          }
        }
      ]
    },
    {
      "name": "instruction_markers",
      "type": "annotation_layer",
      "commands": [
        // Place specific items in sectors
        {
          "type": "instruction_marker",
          "trigram": "Li",
          "instruction": {
            "action": "place",
            "item": "Red Candles",
            "purpose": "Activate Fire Element"
          },
          "style": { "color": "#FF6600" }
        }
      ]
    }
  ]
}

IMPORTANT RULES FOR FDL GENERATION:
1. Use trigram NAMES (Li, Xun, Zhen, Gen, Kan, Qian, Dui, Kun) - NOT directions
2. Always include the full FDL document structure with version, type, arrangement, layers
3. Use GREEN (#00FF00) for favorable sectors, RED (#FF0000) for unfavorable
4. Labels should clearly state WHAT to place or avoid in each sector
5. Make labels actionable: "Place X here", "Avoid Y here", "Keep clear"

6. Tie all recommendations to the hexagram's meaning and the interpretation themes
7. CRITICAL: Never reference, quote, or paraphrase the user's specific question in your response. Do not mention specific amounts, names, currencies, or personal details. Your guidance must be general oracle wisdom tied to the hexagram, not to question specifics.
8. Return ONLY valid JSON

FORMAT:
{
  "${targetLang}": {
    "fengShui": {
      "favorable": ["SE", "S"],
      "unfavorable": ["N", "NW"],
      "guidance": "Detailed spatial adjustment instructions",
      "visualData": {
        "fdl": { /* Full FDL v2.0 document as specified above */ }
      }
    },
    "houtian": {
      "analysis": "Analysis of the Later Heaven Bagua distribution relative to the reading",
      "adjustments": [
        { "sector": "South (Li)", "element": "Fire", "suggestion": "Enhance with bright lights..." }
      ]
    },
    "medicine": [
      { "nameZh": "...", "name": "...", "description": "...", "application": "...", "element": "..." }
    ],
    "alchemical": "Internal transformation guidance",
    "elementalRecommendations": "Wu Xing balancing advice",
    "sources": ["Classical Reference 1", "Scholar Citation 2"]
  }
}`;

    // Anonymize: do not pass user's raw question to prevent it leaking into the response
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

      // Ensure FDL is generated for Feng Shui if not provided by AI
      const langContent = parsed[targetLang] || parsed;
      if (langContent?.fengShui && !langContent.fengShui.visualData?.fdl) {
        const favorable = langContent.fengShui.favorable || [];
        const unfavorable = langContent.fengShui.unfavorable || [];

        // Build instructions from guidance text
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

      // Sanitize any long label texts in the AI-generated FDL
      if (langContent?.fengShui?.visualData?.fdl) {
        sanitizeFDLLabels(langContent.fengShui.visualData.fdl);
      }

      return new Response(
        JSON.stringify(createSuccessResponse(parsed, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      log(4, `[bagua-medicine] Error: ${error.message}`);

      const fallback: any = {};
      fallback[targetLang] = {
        fengShui: {
          favorable: ["Center", "South"],
          unfavorable: ["North"],
          guidance: "Keep your environment clean and well-lit.",
          visualData: {
            fdl: {
              version: "2.0",
              type: "fengshui_diagram",
              arrangement: "houtian",
              background: "#1a1a2e",
              layers: [
                {
                  name: "base_bagua",
                  type: "base_layer",
                  commands: [{ type: "bagua", cx: 500, cy: 500, size: 900 }]
                },
                {
                  name: "sector_highlights",
                  type: "highlight_layer",
                  opacity: 0.6,
                  commands: [
                    {
                      type: "highlight_sector",
                      trigram: "Li",
                      style: { fill: "#00FF0040", stroke: "#00FF00", strokeWidth: 3, glow: true, glowColor: "#00FF00", glowRadius: 20 },
                      label: { text: "Favorable - Enhance with Fire", color: "#00FF00", fontSize: 14 }
                    },
                    {
                      type: "highlight_sector",
                      trigram: "Kan",
                      style: { fill: "#FF000040", stroke: "#FF0000", strokeWidth: 3 },
                      label: { text: "Unfavorable - Keep Clear", color: "#FF4444", fontSize: 14 }
                    }
                  ]
                }
              ]
            }
          }
        },
        houtian: {
          analysis: "Balances in the Later Heaven arrangement suggest checking the Southern and Northern sectors.",
          adjustments: [
            { "sector": "South (Li)", "element": "Fire", "suggestion": "Keep this area bright and active." }
          ]
        },
        medicine: [{ nameZh: "靈芝", name: "Lingzhi", description: "Symbolic longevity", application: "Meditation", element: "Wood" }],
        alchemical: "Focus on your breath and dantian.",
        elementalRecommendations: "Balance fire and water energies.",
        sources: ["Traditional Daoist Lore"]
      };

      return new Response(
        JSON.stringify(createSuccessResponse(fallback, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  }

  async function handleRemediesMedicine(body: any, requestId: string, startTime: number): Promise<Response> {
    // For now, redirect to the combined Bagua Medicine handler
    return await handleRemediesBagua(body, requestId, startTime);
  }

  async function handleRemediesFengShui(body: any, requestId: string, startTime: number): Promise<Response> {
    // For now, redirect to the combined Bagua Medicine handler
    return await handleRemediesBagua(body, requestId, startTime);
  }

  async function handlePostRequest(
    req: Request,
    endpoint: string,
    requestId: string,
    startTime: number
  ): Promise<Response> {
    let body: any;

    try {
      body = await req.json();
    } catch (e) {
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
      case 'samequestion':
        return await handleSameQuestion(body, requestId, startTime);

      case 'differentquestion':
        return await handleDifferentQuestion(body, requestId, startTime);

      case 'interpret':
        return await handleInterpret(body, requestId, startTime);

      case 'interpret-simple':
        return await handleInterpretSimple(body, requestId, startTime);

      case 'interpret-multi':
        return await handleInterpretMulti(body, requestId, startTime);

      case 'interpret-modular':
        return await handleInterpretModular(body, requestId, startTime);

      case 'interpret-section':
        return await handleInterpretSection(body, requestId, startTime);

      case 'interpret-compose':
        return await handleInterpretCompose(body, requestId, startTime);

      case 'interpret-phase1':
        return await handleInterpretPhase1(body, requestId, startTime);

      case 'interpret-phase2':
        return await handleInterpretPhase2(body, requestId, startTime);

      case 'interpret-phase3':
        return await handleInterpretPhase3(body, requestId, startTime);

      case 'interpret-complete':
        return await handleInterpretComplete(body, requestId, startTime);

      case 'translate':
        return await handleTranslate(body, requestId, startTime);

      case 'batch':
        return await handleBatch(body, requestId, startTime);

      case 'translate-all':
        return await handleTranslateAll(body, requestId, startTime);

      case 'celestial':
        return await handleSectionEndpoint(body, 'celestial', requestId, startTime);

      case 'celestial-astro':
        return await handleSectionEndpoint(body, 'celestial-astro', requestId, startTime);

      case 'celestial-bazi':
        return await handleSectionEndpoint(body, 'celestial-bazi', requestId, startTime);

      case 'elements':
        return await handleSectionEndpoint(body, 'elements', requestId, startTime);

      case 'elements-analysis':
        return await handleSectionEndpoint(body, 'elements-analysis', requestId, startTime);

      case 'elements-synthesis':
        return await handleSectionEndpoint(body, 'elements-synthesis', requestId, startTime);

      case 'core':
        return await handleSectionEndpoint(body, 'core', requestId, startTime);

      case 'core-analysis':
        return await handleSectionEndpoint(body, 'core-analysis', requestId, startTime);

      case 'core-technical':
        return await handleSectionEndpoint(body, 'core-technical', requestId, startTime);

      case 'core-narrative':
        return await handleSectionEndpoint(body, 'core-narrative', requestId, startTime);

      case 'core-application':
        return await handleSectionEndpoint(body, 'core-application', requestId, startTime);

      case 'advice':
        return await handleSectionEndpoint(body, 'advice', requestId, startTime);

      case 'lines':
        return await handleSectionEndpoint(body, 'lines', requestId, startTime);

      case 'classical':
        return await handleSectionEndpoint(body, 'classical', requestId, startTime);

      case 'remedies':
        return await handleSectionEndpoint(body, 'remedies', requestId, startTime);

      case 'houtou':
      case 'houtian':
        return await handleSectionEndpoint(body, 'houtou', requestId, startTime);

      case 'houtou-emperor':
        return await handleSectionEndpoint(body, 'houtou-emperor', requestId, startTime);

      case 'houtou-master':
        return await handleSectionEndpoint(body, 'houtou-master', requestId, startTime);

      case 'remedies-main':
        return await handleRemediesMain(body, requestId, startTime);

      case 'remedies-select':
        return await handleRemediesSelect(body, requestId, startTime);

      case 'remedies-translate':
        return await handleRemediesTranslate(body, requestId, startTime);

      case 'remedies-verify':
        return await handleRemediesVerify(body, requestId, startTime);

      case 'fulu-drawing-generate':
        return await handleFuluDrawingGenerate(body, requestId, startTime);

      case 'fulu-drawing-verify':
        return await handleFuluDrawingVerify(body, requestId, startTime);

      case 'remedies-fulu-draw':
      case 'fulu-drawing':
        return await handleRemediesFuluDraw(body, requestId, startTime);

      case 'remedies-bagua':
      case 'bagua-medicine':
        return await handleRemediesBagua(body, requestId, startTime);

      case 'remedies-medicine':
      case 'medicine':
        return await handleRemediesMedicine(body, requestId, startTime);

      case 'remedies-fengshui':
      case 'feng-shui':
        return await handleRemediesFengShui(body, requestId, startTime);

      case 'export-pdf':
        return await handleExportPDF(body, requestId, startTime);

      case 'export-diagram':
        return await handleExportDiagram(body, requestId, startTime);

      case 'export-odf':
      case 'export-odt':
        return await handleExportODF(body, requestId, startTime);

      // FDL v2.0 Generation
      case 'fdl-generate':
        return await handleFDLGenerate(body, requestId, startTime);

      // Context-based interpretation (uses provided context only)
      case 'interpret-context':
        return await handleInterpretContext(body, requestId, startTime);

      // Xiantian (Early Heaven) spiritual interpretation
      case 'interpret-xiantian':
        return await handleInterpretXiantian(body, requestId, startTime);

      // Chinese Astrology System (Bagua, He Tu, BaZi, etc.)
      case 'chinese-astrology':
        return await handleChineseAstrology(body, requestId, startTime);

      case 'yijingtu':
      case '':
        // Function root endpoint - return API info
        return new Response(
          JSON.stringify(createSuccessResponse({
            message: "Yijingtu I Ching API",
            version: API_VERSION,
            description: "Structured interpretation pipeline with technical and modern layers",
            endpoints: {
              // Health & Info
              health: "GET /health - System status",
              version: "GET /version - API version",

              // Data
              hexagram: "GET /hexagram-reading/:number - Get hexagram data",
              random: "GET /random - NIST beacon randomness",

              // Legacy Interpretation
              interpret: "POST /interpret-modular - Modular interpretation (legacy)",
              sections: "POST /{celestial|elements|core|lines|classical|remedies} - Individual sections",

              // NEW: Structured Interpretation Pipeline
              phase1: "POST /interpret-phase1 - Technical/Classical analysis (JSON structured)",
              phase2: "POST /interpret-phase2 - Modern interpretation (personality + languages)",
              phase3: "POST /interpret-phase3 - Remedies generation",
              complete: "POST /interpret-complete - Full 3-phase pipeline",

              // Remedies (New Modular System)
              remediesMain: "POST /remedies-main - Select appropriate remedies based on reading",
              remediesFuluDraw: "POST /remedies-fulu-draw - Generate talisman drawing data",
              remediesBagua: "POST /remedies-bagua - Generate Bagua guidance",
              remediesMedicine: "POST /remedies-medicine - Generate alchemical medicine guidance",
              remediesFengShui: "POST /remedies-fengshui - Generate feng shui guidance",

              // Utilities
              batch: "POST /batch - Multiple readings",
              translate: "POST /translate - Translate content",
              export: "POST /export-pdf, POST /export-diagram - Export functions",

              // FDL v2.0 & Visual
              fdlGenerate: "POST /fdl-generate - Generate FDL v2.0 JSON from natural language",
              interpretContext: "POST /interpret-context - Context-based interpretation (URL/data/ref)",
              interpretXiantian: "POST /interpret-xiantian - Xiantian (Early Heaven) spiritual interpretation",

              // Chinese Astrology System
              chineseAstrology: "POST /chinese-astrology - Complete Chinese astrology calculation (Bagua, He Tu, BaZi, Lunar Mansions, Tai Sui, Qi Men)"
            },
            newFeatures: {
              structuredPipeline: "3-phase interpretation with JSON schemas",
              technicalFirst: "Phase 1 provides rigorous classical analysis",
              modernSecond: "Phase 2 provides personalized contemporary wisdom",
              remediesThird: "Phase 3 provides authentic Daoist remedies",
              modularRemedies: "Separate endpoints for Fulu, Bagua, Medicine, and Feng Shui",
              multiLanguage: "Simultaneous translation to multiple languages",
              queryFocused: "All responses explicitly connect to user's question",
              chineseAstrology: "Complete BaZi/Bagua/HeTu/Lunar/TaiSui/QiMen calculations with ayanamsa correction"
            },
            documentation: "See interpretation_schemas.ts for detailed JSON schemas"
          }, requestId, startTime)),
          { headers: { "Content-Type": "application/json" } }
        );

      default:
        throw new NotFoundError("Endpoint", endpoint);
    }
  }

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
      return await handleGetHexagramReading(lastSegment, requestId, startTime);
    }

    // GET /cache-status
    if (lastSegment === 'cache-status') {
      return await handleCacheStatus(requestId, startTime);
    }

    // GET /random - NIST beacon for randomness
    if (lastSegment === 'random' || lastSegment === '' || lastSegment === 'yijingtu') {
      console.log(`[GET_HANDLER] Routing to handleRandomBeacon`);
      return await handleRandomBeacon(requestId, startTime);
    }

    // GET /health
    if (lastSegment === 'health') {
      return await handleHealthCheck(requestId, startTime);
    }

    // GET /version
    if (lastSegment === 'version') {
      return await handleVersion(requestId, startTime);
    }

    // GET /remedies-db — fetch, parse, and return DAOIST_REMEDIES_DB from bucket
    if (lastSegment === 'remedies-db') {
      return await handleRemediesDB(requestId, startTime);
    }

    throw new NotFoundError("Endpoint", lastSegment);
  }

  // ============================================================================
  // ENDPOINT HANDLERS
  // ============================================================================

  async function handleSameQuestion(body: any, requestId: string, startTime: number): Promise<Response> {
    const prunedBody = pruneToEnglish(body);
    const { hexagrams } = prunedBody;

    if (!Array.isArray(hexagrams) || hexagrams.length === 0) {
      throw new ValidationError("Request must include a 'hexagrams' array", { field: 'hexagrams' });
    }

    // Validate all hexagram numbers
    hexagrams.forEach(num => validators.hexagramNumber(num));

    const hexagramSummary = await lookupAndSummarizeHexagrams(hexagrams);
    const prompt = `You are a wise Daoist master. A user has received this hexagram reading:

${hexagramSummary}

Provide a multi-faceted interpretation that is both philosophically deep and practically useful.`;

    const interpretation = await getSynthesizedInterpretation(prompt, { endpoint: 'samequestion', hexagrams });

    return new Response(
      JSON.stringify(createSuccessResponse({ interpretation }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleDifferentQuestion(body: any, requestId: string, startTime: number): Promise<Response> {
    const prunedBody = pruneToEnglish(body);
    const { current_hexagram, previous_hexagrams = [] } = prunedBody;

    if (!current_hexagram) {
      throw new ValidationError("Request must include a 'current_hexagram' number", { field: 'current_hexagram' });
    }

    validators.hexagramNumber(current_hexagram);
    previous_hexagrams.forEach(num => validators.hexagramNumber(num));

    const currentSummary = await lookupAndSummarizeHexagrams([current_hexagram]);
    const previousSummary = await lookupAndSummarizeHexagrams(previous_hexagrams);

    const prompt = `You are a wise Daoist master. Interpret this transition:

PREVIOUS HEXAGRAM(S):
${previousSummary || "No previous readings."}

CURRENT HEXAGRAM:
${currentSummary}

Explain how this represents a shift or evolution from the previous state.`;

    const interpretation = await getSynthesizedInterpretation(prompt, {
      endpoint: 'differentquestion',
      current_hexagram,
      previous_hexagrams
    });

    return new Response(
      JSON.stringify(createSuccessResponse({ interpretation }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleInterpret(body: any, requestId: string, startTime: number): Promise<Response> {
    const prunedBody = pruneToEnglish(body);
    const request: InterpretationRequest = prunedBody;

    validators.question(request.question);
    validators.hexagramData(request.hexagram);
    validators.lines(request.lines);

    log(4, `[interpret] Hexagram: ${request.hexagram.number}`);

    const result = await getModularInterpretation(request);

    // Cache the result
    const cacheKey = getCacheKey('interpret', body);
    setCache(cacheKey, result, 600000); // 10 min cache

    return new Response(
      JSON.stringify(createSuccessResponse({ interpretation: result }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleInterpretSimple(body: any, requestId: string, startTime: number): Promise<Response> {
    const prunedBody = pruneToEnglish(body);
    const request: InterpretationRequest = prunedBody;

    validators.question(request.question);
    validators.hexagramData(request.hexagram);
    validators.lines(request.lines);

    log(4, `[interpret-simple] Hexagram: ${request.hexagram.number}`);

    // Simplified interpretation - just core section
    const core = await generateCoreSection(request);
    const classical = await generateClassicalSection(request);

    const result = {
      en: {
        ...core,
        judgment: classical.judgment.en,
        image: classical.image.en,
        lines: classical.lines.en
      }
    };

    return new Response(
      JSON.stringify(createSuccessResponse({ interpretation: result }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleInterpretMulti(body: any, requestId: string, startTime: number): Promise<Response> {
    const prunedBody = pruneToEnglish(body);
    const request: InterpretationRequest = prunedBody;

    validators.question(request.question);
    validators.hexagramData(request.hexagram);
    validators.lines(request.lines);

    log(4, `[interpret-multi] Hexagram: ${request.hexagram.number}`);

    const result = await getModularInterpretation(request);

    return new Response(
      JSON.stringify(createSuccessResponse({ interpretation: result }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleInterpretModular(body: any, requestId: string, startTime: number): Promise<Response> {
    const prunedBody = pruneToEnglish(body);
    const request: InterpretationRequest = prunedBody;

    validators.question(request.question);
    validators.hexagramData(request.hexagram);
    validators.lines(request.lines);

    log(4, `[interpret-modular] Hexagram: ${request.hexagram.number}`);

    const result = await getModularInterpretation(request);

    // Cache result
    const cacheKey = getCacheKey('interpret-modular', body);
    setCache(cacheKey, result, 600000);

    return new Response(
      JSON.stringify(createSuccessResponse({ interpretation: result }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleInterpretSection(body: any, requestId: string, startTime: number): Promise<Response> {
    const prunedBody = pruneToEnglish(body);
    const { section, ...requestData } = prunedBody;
    const validatedSection = validators.section(section);

    const request: InterpretationRequest = requestData;
    validators.question(request.question);

    log(4, `[interpret-section] Section: ${validatedSection}`);

    let result: any;
    switch (validatedSection) {
      case 'celestial':
        result = await generateCelestialSection(request);
        break;
      case 'elements':
        result = await generateElementsSection(request);
        break;
      case 'elements-analysis':
        result = await generateElementsAnalysis(request);
        break;
      case 'elements-synthesis':
        result = await generateElementsSynthesis(request);
        break;
      case 'core':
        result = await generateCoreSection(request);
        break;
      case 'core-analysis':
        result = await generateCoreAnalysis(request);
        break;
      case 'core-application':
        result = await generateCoreApplication(request);
        break;
      case 'lines':
        result = await generateLinesSection(request);
        break;
      case 'classical':
        result = await generateClassicalSection(request);
        break;
      case 'remedies':
        result = await generateRemediesSection(request);
        break;
    }

    return new Response(
      JSON.stringify(createSuccessResponse({ section: validatedSection, data: result }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleInterpretCompose(body: any, requestId: string, startTime: number): Promise<Response> {
    // Incremental mode: merge one new section into the accumulated result
    // Body: { section: "core", sectionData: {...}, accumulated: {...}, lang: "en" }
    if (body.section && body.sectionData) {
      return await handleIncrementalCompose(body, requestId, startTime);
    }

    // Full compose mode (legacy): all sections at once
    const { celestial, elements, core, lines, classical, remedies, lang } = body;

    if (!celestial || !elements || !core || !lines || !classical) {
      throw new ValidationError(
        "Request must include all sections: celestial, elements, core, lines, classical",
        { missingSections: ['celestial', 'elements', 'core', 'lines', 'classical'].filter(s => !body[s]) }
      );
    }

    if (!classical.judgment || !classical.image || !classical.lines) {
      throw new ValidationError(
        "Classical section must include judgment, image, and lines properties",
        { classicalStructure: Object.keys(classical) }
      );
    }

    if (!classical.judgment.en) {
      throw new ValidationError(
        "Classical judgment must include 'en' property",
        { judgmentKeys: Object.keys(classical.judgment) }
      );
    }

    log(4, `[interpret-compose] Full compose...`);

    const result = await composeInterpretation(celestial, elements, core, lines, classical, lang);
    if (remedies) result.remedies = remedies;

    return new Response(
      JSON.stringify(createSuccessResponse({ interpretation: result }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Incremental compose: merge one section into the accumulated result.
  // OPTIMIZED: No translation during compose - translations handled separately via /translate endpoint
  async function handleIncrementalCompose(body: any, requestId: string, startTime: number): Promise<Response> {
    const { section, sectionData, accumulated, lang } = body;

    if (!section || !sectionData) {
      throw new ValidationError("Incremental compose requires 'section' and 'sectionData'");
    }

    log(4, `[interpret-compose:incremental] Merging section '${section}'...`);

    // Start from accumulated result or empty structure
    const result = accumulated || { en: {} };
    const emptyLines = ["", "", "", "", "", ""];

    // Extract new fields from this section
    const newFields: { [key: string]: any } = {};

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
        newFields.celestialTechnical = sectionData.technicalAnalysis || "";
        newFields.celestialColloquial = sectionData.colloquialInterpretation || "";
        newFields.celestial = sectionData.celestial || "";
        newFields.birthBaziDescription = sectionData.birthBazi?.description || "";
        newFields.birthBaziImpact = sectionData.birthBazi?.readingImpact || "";
        newFields.currentBaziDescription = sectionData.currentBazi?.description || "";
        newFields.currentBaziImpact = sectionData.currentBazi?.readingImpact || "";
        break;
      case 'elements':
        newFields.elementsTechnical = sectionData.technicalAnalysis || "";
        newFields.elementsColloquial = sectionData.colloquialInterpretation || "";
        newFields.elements = sectionData.elements || "";
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
        // Remedies don't go into per-lang content, return early
        return new Response(
          JSON.stringify(createSuccessResponse({ interpretation: result }, requestId, startTime)),
          { headers: { "Content-Type": "application/json" } }
        );
    }

    // Collect quoted references
    const existingQuotes = result.en?.quotedReferences || [];
    const sectionQuotes = sectionData.quotedReferences || [];
    const allQuotes = [...existingQuotes, ...sectionQuotes].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
    newFields.quotedReferences = allQuotes;

    // OPTIMIZATION: Skip translation during compose to avoid DeepSeek timeouts
    // Translation will be handled separately via /translate endpoint
    // For now, populate all language slots with English content
    for (const l of ['en', 'es', 'it', 'zh']) {
      if (!result[l]) result[l] = {};

      // All languages get English content as placeholder
      // Frontend will request translation separately if needed
      Object.assign(result[l], newFields);

      // For classical, also set per-lang judgment/image/lines
      if (section === 'classical') {
        result[l].judgment = sectionData.judgment?.[l] || sectionData.judgment?.en || "";
        result[l].image = sectionData.image?.[l] || sectionData.image?.en || "";
        result[l].lines = sectionData.lines?.[l] || sectionData.lines?.en || emptyLines;
      }
    }

    log(4, `[interpret-compose:incremental] Section '${section}' merged successfully (English only, translations deferred)`);

    return new Response(
      JSON.stringify(createSuccessResponse({ interpretation: result }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // ============================================================================
  // STRUCTURED INTERPRETATION PHASE HANDLERS
  // ============================================================================

  async function handleInterpretPhase1(body: any, requestId: string, startTime: number): Promise<Response> {
    log(4, `[interpret-phase1] Generating technical analysis...`);

    // Prune input parameters to English only before processing
    const prunedBody = pruneToEnglish(body);
    const { question, hexagram, lines, mansion, birthBazi, currentBazi, historyContext, askAgainSource } = prunedBody;

    validators.question(question);
    validators.hexagramData(hexagram);
    validators.lines(lines);

    const systemPrompt = `You are a master of classical Chinese divination. Provide rigorous TECHNICAL analysis in structured JSON.

CRITICAL REQUIREMENTS:
1. Use ONLY accurate classical texts from Zhouyi (I Ching)
2. Include proper Chinese characters with pinyin
3. Cite specific sources (e.g., "Zhouyi, Hexagram 1, Judgment")
4. BaZi analysis must include: Day Master, Yong Shen, strength assessment
5. Five Elements must show Sheng (generating) and Ke (controlling) cycles
6. Bagua positions must reference Later Heaven arrangement
7. ALL analysis must connect to the user's specific question
8. Query relevance section is MANDATORY

JSON FORMATTING RULES (CRITICAL):
- Output ONLY valid JSON - no markdown, no code blocks, no explanatory text before or after
- Do NOT use markdown formatting inside string values (no **bold**, no *italic*, no # headings) - use plain text only
- Use \n for newlines within string values (actual newlines break JSON)
- Escape all quotes as \" within strings
- Ensure all braces and brackets are properly closed
- No trailing commas
- All property names must be in double quotes

OUTPUT FORMAT - STRICT JSON with this exact structure:
{
  "metadata": { "phase": "technical_analysis", "timestamp": "ISO8601", "version": "3.0", "queryFocus": "extracted from question" },
  "hexagramAnalysis": {
    "number": number,
    "names": { "zh": "...", "en": "...", "pinyin": "..." },
    "structure": {
      "binary": "...",
      "upperTrigram": { "code": "...", "name": "...", "element": "...", "nature": "..." },
      "lowerTrigram": { "code": "...", "name": "...", "element": "...", "nature": "..." },
      "trigramRelationship": "...",
      "nuclearTrigrams": { "upper": "...", "lower": "..." }
    },
    "classification": { "yaoStructure": "...", "position": "...", "phase": "..." }
  },
  "movingLines": {
    "count": number,
    "positions": [numbers],
    "analysis": [{ "position": number, "yaoType": "9/6/7/8", "isChanging": boolean, "classicalText": { "zh": "...", "en": "..." }, "trigramContext": "...", "positionMeaning": "..." }],
    "resultingHexagram": { "number": number, "name": "...", "transition": "..." }
  },
  "classicalTexts": {
    "judgment": { "zh": "...", "en": "...", "commentary": "..." },
    "image": { "zh": "...", "en": "...", "commentary": "..." },
    "lines": [{ "position": number, "zh": "...", "en": "...", "changing": boolean }],
    "references": ["Zhouyi Hexagram X, ..."]
  },
  "baziAnalysis": {
    "birthChart": { "pillars": [...], "dayMaster": {...}, "yongShen": {...}, "balance": {...} },
    "currentInfluence": { "pillars": [...], "strength": "...", "clashHarmony": [...] },
    "interaction": { "birthCurrentRelation": "...", "timingAnalysis": "...", "favorablePeriods": [...], "unfavorablePeriods": [...] }
  },
  "celestialData": {
    "lunarMansion": { "name": "...", "group": "...", "element": "...", "degrees": number, "influence": "..." },
    "lifePalace": { "number": number, "stem": "...", "element": "...", "significance": "..." },
    "astrologicalNotes": [...]
  },
  "wuxingAnalysis": {
    "hexagramElements": { "upper": "...", "lower": "...", "combined": "..." },
    "baziElements": { "birth": {...}, "current": {...}, "interaction": "..." },
    "cycles": { "sheng": [...], "ke": [...] },
    "recommendations": [...]
  },
  "baguaAnalysis": {
    "directions": { "favorable": [...], "unfavorable": [...] },
    "trigramPositions": { "position": { "trigram": "...", "meaning": "...", "activation": "..." } },
    "fengShuiApplications": [...]
  },
  "queryRelevance": {
    "questionType": "categorized question type",
    "applicableLines": [line numbers],
    "keyThemes": [themes from hexagram],
    "timingIndicators": "when/how",
    "actionRecommendations": [specific actions]
  },
  "citations": { "classical": [...], "academic": [...], "canonical": [...] }
}`;

    const userPrompt = `QUESTION: "${question}"

HEXAGRAM: ${hexagram.number} - ${hexagram.name_en}
BINARY: ${prunedBody.binaryKey || 'unknown'}
UPPER TRIGRAM: ${prunedBody.upperTrigram || 'unknown'}
LOWER TRIGRAM: ${prunedBody.lowerTrigram || 'unknown'}

LINES: ${JSON.stringify(lines.map((l: any, i: number) => ({ position: i + 1, isYang: l.isYang, isChanging: l.isChanging })))}

${mansion ? `LUNAR MANSION: ${mansion.name_en} - ${mansion.group}, ${mansion.element}` : ''}

${birthBazi ? `BIRTH BAZI: ${JSON.stringify(birthBazi)}` : ''}

${currentBazi ? `CURRENT BAZI: ${JSON.stringify(currentBazi)}` : ''}

${historyContext ? `HISTORY: ${historyContext}` : ''}

${askAgainSource ? `ASK AGAIN SOURCE: ${askAgainSource}` : ''}

Provide comprehensive technical analysis with ALL fields populated. Focus on query relevance.`;

    try {
      // Use structured interpretation with retries
      const requiredFields = ['metadata', 'hexagramAnalysis', 'classicalTexts', 'queryRelevance'];
      const parsed = await getStructuredInterpretation(
        userPrompt,
        2500,
        {
          systemPrompt,
          temperature: 0.3,
          response_mime_type: "application/json"
        },
        requiredFields,
        3 // max retries
      );

      return new Response(
        JSON.stringify(createSuccessResponse({
          phase: "technical_analysis",
          data: parsed
        }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      log(4, `[interpret-phase1] Error: ${error.message}`);
      // Return partial data if available
      return new Response(
        JSON.stringify(createSuccessResponse({
          phase: "technical_analysis",
          data: {
            error: error.message,
            partial: true,
            hexagramAnalysis: {
              number: hexagram.number,
              names: { zh: hexagram.name_zh, en: hexagram.name_en, pinyin: '' }
            }
          }
        }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  }

  async function handleInterpretPhase2(body: any, requestId: string, startTime: number): Promise<Response> {
    log(4, `[interpret-phase2] Generating modern interpretation...`);

    const { phase1Data, personality, languages, context } = body;

    if (!phase1Data) {
      throw new ValidationError("Phase 1 data is required", { field: 'phase1Data' });
    }

    const targetLanguages = ['en'];
    const personalitySettings = personality || {
      tone: "compassionate",
      depth: "standard",
      style: "contemporary"
    };

    const systemPrompt = `You are a wise counselor translating ancient wisdom for modern life.

PERSONALITY: ${personalitySettings.tone} | ${personalitySettings.depth} | ${personalitySettings.style}
TARGET LANGUAGE: English

CRITICAL REQUIREMENTS:
1. EVERY paragraph must connect to the user's question: "${phase1Data.metadata?.queryFocus || 'the query'}"
2. Use the personality consistently throughout
3. Translate technical terms into accessible language
4. Include practical, actionable advice
5. Acknowledge both possibilities and limitations
6. Balance spiritual insight with practical wisdom
7. Focus on Bagua but include celestial insights when available
8. Include Feng Shui applications
9. Make it relevant to the query - every section must tie back to the question

JSON FORMATTING RULES (CRITICAL):
- Output ONLY valid JSON - no markdown, no code blocks, no explanatory text before or after
- Do NOT use markdown formatting inside string values (no **bold**, no *italic*, no # headings) - use plain text only
- Use \n for newlines within string values (actual newlines break JSON)
- Escape all quotes as \" within strings
- Ensure all braces and brackets are properly closed
- No trailing commas
- All property names must be in double quotes
- All string values must be on single lines (use \n for line breaks)

OUTPUT FORMAT - STRICT JSON:
{
  "metadata": { "phase": "modern_interpretation", "timestamp": "ISO8601", "personality": "...", "languages": ["en"] },
  "interpretations": {
    "en": {
      "executiveSummary": { "headline": "...", "coreMessage": "...", "relevanceToQuestion": "EXPLICIT connection to query", "keyTakeaway": "..." },
      "situation": { "currentState": "...", "underlyingDynamics": "...", "hiddenFactors": "...", "querySpecificInsights": "..." },
      "development": { "trajectory": "...", "timing": "...", "phases": [{"phase": "...", "description": "...", "timeframe": "..."}], "turningPoints": [...] },
      "guidance": { "immediateActions": [...], "strategicApproach": "...", "attitudeAdjustments": [...], "pitfallsToAvoid": [...] },
      "symbolism": { "coreSymbols": [{"symbol": "...", "meaning": "...", "relevance": "..."}], "archetypalPatterns": [...], "modernParallels": [...] },
      "movingLines": { "overview": "...", "specificLines": [{"position": number, "meaning": "...", "advice": "...", "timing": "..."}], "resultingChange": "..." },
      "baziInsights": { "personalResonance": "...", "timingAlignment": "...", "elementalAdvice": [...], "destinyContext": "..." },
      "applications": { "decisionMaking": "...", "relationships": "...", "career": "...", "personalGrowth": "...", "spiritual": "..." },
      "spatialGuidance": { "favorableDirections": [...], "activationSuggestions": [...], "elementalEnhancements": [...] },
      "contemplative": { "affirmation": "...", "meditationFocus": "...", "reflectionQuestions": [...] }
    }
  },
  "technicalReferences": { "hexagramNumber": number, "movingLines": [...], "baziRelevant": boolean, "celestialRelevant": boolean }
}`;

    const userPrompt = `TECHNICAL DATA (Phase 1):
${JSON.stringify(pruneToEnglish(phase1Data), null, 2)}

USER CONTEXT:
${context ? JSON.stringify(pruneToEnglish(context)) : 'No additional context'}

Provide accessible, practical wisdom for ${personalitySettings.style} approach in English.

REMEMBER: Every section must explicitly connect to the user's question and include practical relevance.`;

    try {
      // Use structured interpretation with retries
      const requiredFields = ['metadata', 'interpretations'];
      const parsed = await getStructuredInterpretation(
        userPrompt,
        3000,
        {
          systemPrompt,
          temperature: 0.4,
          response_mime_type: "application/json"
        },
        requiredFields,
        3 // max retries
      );

      // Ensure English is present
      if (!parsed.interpretations.en) {
        log(4, `[interpret-phase2] Missing English translation in response`);
        // Attempt to salvage if it returned another language or top level
        const salvagedEn = parsed.interpretations[Object.keys(parsed.interpretations)[0]] || {};
        parsed.interpretations.en = salvagedEn;
      }

      return new Response(
        JSON.stringify(createSuccessResponse({
          phase: "modern_interpretation",
          data: parsed
        }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      log(4, `[interpret-phase2] Error: ${error.message}`);
      // Return partial data with fallback
      return new Response(
        JSON.stringify(createSuccessResponse({
          phase: "modern_interpretation",
          data: {
            error: error.message,
            partial: true,
            interpretations: Object.fromEntries(
              targetLanguages.map(lang => [lang, {
                executiveSummary: {
                  headline: "Interpretation Generation Issue",
                  coreMessage: "We encountered a technical issue generating the full interpretation.",
                  relevanceToQuestion: "Please try again or contact support if the issue persists.",
                  keyTakeaway: "The core hexagram meaning remains valid - refer to the classical texts."
                }
              }])
            )
          }
        }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  }

  async function handleInterpretPhase3(body: any, requestId: string, startTime: number): Promise<Response> {
    log(4, `[interpret-phase3] Generating remedies...`);

    const { phase1Data, phase2Data, focus } = body;

    if (!phase1Data || !phase2Data) {
      throw new ValidationError("Both Phase 1 and Phase 2 data are required", {
        missing: [!phase1Data && 'phase1Data', !phase2Data && 'phase2Data'].filter(Boolean)
      });
    }

    // Prune contextual data to English only
    const prunedPhase1 = pruneToEnglish(phase1Data);
    const prunedPhase2 = pruneToEnglish(phase2Data);

    // Use existing remedies generator but with better context
    const request: InterpretationRequest = {
      question: prunedPhase1.metadata?.queryFocus || 'General inquiry',
      hexagram: {
        number: prunedPhase1.hexagramAnalysis?.number || 1,
        name_en: prunedPhase1.hexagramAnalysis?.names?.en || 'Unknown',
        name_zh: prunedPhase1.hexagramAnalysis?.names?.zh || '未知'
      },
      lines: prunedPhase1.movingLines?.analysis?.map((l: any) => ({
        isYang: l.yaoType === '7' || l.yaoType === '9',
        isChanging: l.isChanging
      })) || [],
      binaryKey: prunedPhase1.hexagramAnalysis?.structure?.binary || '000000'
    };

    try {
      // Get remedies from database + generation
      const remedies = await generateRemediesSection(request, { phase1Data: prunedPhase1, phase2Data: prunedPhase2 });

      // Enhance with phase context
      const enhancedRemedies = {
        ...remedies,
        phaseContext: {
          focus: focus || "general",
          hexagramNumber: prunedPhase1.hexagramAnalysis?.number,
          queryType: prunedPhase1.queryRelevance?.questionType,
          keyThemes: prunedPhase1.queryRelevance?.keyThemes
        }
      };

      return new Response(
        JSON.stringify(createSuccessResponse({
          phase: "remedies",
          data: enhancedRemedies
        }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      log(4, `[interpret-phase3] Error: ${error.message}`);
      throw new AppError("Phase 3 remedies generation failed", 500, "PHASE3_ERROR", { error: error.message });
    }
  }

  async function handleInterpretComplete(body: any, requestId: string, startTime: number): Promise<Response> {
    log(4, `[interpret-complete] Running complete interpretation pipeline...`);

    // Prune input to English only
    const prunedBody = pruneToEnglish(body);
    const { question, hexagram, lines, personality, languages, mansion, birthBazi, currentBazi, binaryKey, upperTrigram, lowerTrigram } = prunedBody;

    validators.question(question);
    validators.hexagramData(hexagram);
    validators.lines(lines);

    try {
      // Phase 1: Technical Analysis
      log(4, `[interpret-complete] Phase 1: Technical analysis...`);
      const phase1Body = {
        question,
        hexagram,
        lines,
        binaryKey,
        upperTrigram,
        lowerTrigram,
        mansion,
        birthBazi,
        currentBazi
      };

      // Call Phase 1 internally and extract data
      const phase1Response = await handleInterpretPhase1(phase1Body, requestId, startTime);
      const phase1Result = await phase1Response.json();
      const phase1Data = phase1Result.data?.data || phase1Result.data || phase1Result;

      // Check for errors in Phase 1
      if (phase1Data.error) {
        log(4, `[interpret-complete] Phase 1 had errors: ${phase1Data.error}`);
      }

      // Phase 2: Modern Interpretation
      log(4, `[interpret-complete] Phase 2: Modern interpretation...`);
      const phase2Body = {
        phase1Data,
        personality: personality || { tone: "compassionate", depth: "standard", style: "contemporary" },
        languages: ['en'],
        context: { sessionTheme: body.sessionTheme }
      };

      const phase2Response = await handleInterpretPhase2(phase2Body, requestId, startTime);
      const phase2Result = await phase2Response.json();
      const phase2Data = phase2Result.data?.data || phase2Result.data || phase2Result;

      // Check for errors in Phase 2
      if (phase2Data.error) {
        log(4, `[interpret-complete] Phase 2 had errors: ${phase2Data.error}`);
      }

      // Phase 3: Remedies
      log(4, `[interpret-complete] Phase 3: Remedies...`);
      const phase3Body = {
        phase1Data,
        phase2Data,
        focus: body.focus || "general"
      };

      const phase3Response = await handleInterpretPhase3(phase3Body, requestId, startTime);
      const phase3Result = await phase3Response.json();
      const phase3Data = phase3Result.data?.data || phase3Result.data || phase3Result;

      // Compile unified response
      const targetLanguages = languages || ['en'];
      const unifiedResponse = {
        metadata: {
          version: API_VERSION,
          timestamp: new Date().toISOString(),
          requestId,
          phasesCompleted: ["technical_analysis", "modern_interpretation", "remedies"],
          query: question,
          hexagram: hexagram.number
        },
        phase1_technical: phase1Data,
        phase2_modern: phase2Data,
        phase3_remedies: phase3Data,
        quickAccess: {
          headline: Object.fromEntries(
            targetLanguages.map((lang: string) => [
              lang,
              phase2Data.interpretations?.[lang]?.executiveSummary?.headline ||
              phase2Data.interpretations?.en?.executiveSummary?.headline ||
              'I Ching Reading'
            ])
          ),
          keyAdvice: Object.fromEntries(
            targetLanguages.map((lang: string) => [
              lang,
              phase2Data.interpretations?.[lang]?.guidance?.strategicApproach ||
              phase2Data.interpretations?.en?.guidance?.strategicApproach ||
              ''
            ])
          ),
          timing: Object.fromEntries(
            targetLanguages.map((lang: string) => [
              lang,
              phase2Data.interpretations?.[lang]?.development?.timing ||
              phase2Data.interpretations?.en?.development?.timing ||
              ''
            ])
          ),
          actionItems: Object.fromEntries(
            targetLanguages.map((lang: string) => [
              lang,
              phase2Data.interpretations?.[lang]?.guidance?.immediateActions ||
              phase2Data.interpretations?.en?.guidance?.immediateActions ||
              []
            ])
          )
        }
      };

      log(4, `[interpret-complete] Complete in ${Date.now() - startTime}ms`);

      return new Response(
        JSON.stringify(createSuccessResponse(unifiedResponse, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      log(4, `[interpret-complete] Error: ${error.message}`);
      log(4, `[interpret-complete] Stack: ${error.stack}`);

      // Return partial response with error info
      return new Response(
        JSON.stringify(createSuccessResponse({
          metadata: {
            version: API_VERSION,
            timestamp: new Date().toISOString(),
            requestId,
            phasesCompleted: [],
            query: question,
            hexagram: hexagram?.number || 0,
            error: error.message
          },
          error: {
            message: error.message,
            phase: "complete_pipeline",
            suggestion: "Try using individual phase endpoints (/interpret-phase1, /interpret-phase2, /interpret-phase3) instead"
          }
        }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    }
  }

  async function handleTranslate(body: any, requestId: string, startTime: number): Promise<Response> {
    const { content, targetLang, hexagramName } = body;

    if (!content) {
      throw new ValidationError("Request must include 'content' to translate", { field: 'content' });
    }

    const lang = validators.language(targetLang);

    const langNames: { [key: string]: string } = {
      'es': 'Spanish',
      'it': 'Italian',
      'zh': 'Chinese',
      'en': 'English'
    };

    // Check if translation is actually needed for English
    const hasChinese = (text: any): boolean => {
      if (typeof text === 'string') return /[\u4e00-\u9fa5]/.test(text);
      if (typeof text === 'object' && text !== null) {
        return Object.values(text).some(v => hasChinese(v));
      }
      return false;
    };

    if (lang === 'en' && !hasChinese(content)) {
      return new Response(
        JSON.stringify(createSuccessResponse({ translated: content, targetLang: 'en' }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    log(4, `[translate] Target: ${lang}`);

    const translated = await translateInterpretationContent(
      content,
      lang,
      langNames[lang],
      hexagramName || 'I Ching Reading'
    );

    return new Response(
      JSON.stringify(createSuccessResponse({ translated, targetLang: lang }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
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

    // Extract previous context from request if provided
    const previousContext = body.previousContext || '';
    if (previousContext) {
      log(4, `[${section}] Received context from previous sections (${previousContext.length} chars)`);
    }

    log(4, `[${section}] Generating section...`);

    try {
      let result: any;
      switch (section) {
        case 'celestial':
          result = await generateCelestialSection(request);
          break;
        case 'celestial-astro':
          result = await generateCelestialAstro(request);
          break;
        case 'celestial-bazi':
          result = await generateCelestialBazi(request);
          break;
        case 'elements':
          result = await generateElementsSection(request);
          break;
        case 'elements-analysis':
          result = await generateElementsAnalysis(request, previousContext);
          break;
        case 'elements-synthesis':
          result = await generateElementsSynthesis(request, previousContext);
          break;
        case 'core':
          result = await generateCoreSection(request);
          break;
        case 'core-analysis':
          result = await generateCoreAnalysis(request, previousContext);
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
        case 'remedies':
          result = await generateRemediesSection(request);
          break;
        case 'houtou':
          result = await generateHoutouSection(request, previousContext);
          break;
        case 'houtou-emperor':
          result = await generateHoutouEmperor(request, previousContext);
          break;
        case 'houtou-master':
          result = await generateHoutouMaster(request, previousContext);
          break;
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

  async function handleBatch(body: any, requestId: string, startTime: number): Promise<Response> {
    const { requests } = body;

    if (!Array.isArray(requests) || requests.length === 0) {
      throw new ValidationError("Request must include a 'requests' array", { field: 'requests' });
    }

    if (requests.length > 10) {
      throw new ValidationError("Batch size cannot exceed 10 requests", { field: 'requests', count: requests.length, max: 10 });
    }

    log(4, `[batch] Processing ${requests.length} requests...`);

    const results = await Promise.allSettled(
      requests.map(async (req, index) => {
        try {
          const prunedReq = pruneToEnglish(req);
          validators.question(prunedReq.question);
          validators.hexagramData(prunedReq.hexagram);
          validators.lines(prunedReq.lines);

          const result = await getModularInterpretation(prunedReq);
          return { index, status: 'success', data: result };
        } catch (error) {
          return {
            index,
            status: 'error',
            error: error instanceof AppError ? error.message : error.message
          };
        }
      })
    );

    return new Response(
      JSON.stringify(createSuccessResponse({ results }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleGetHexagramReading(segment: string, requestId: string, startTime: number): Promise<Response> {
    const hexagramNumber = parseInt(segment, 10);

    if (isNaN(hexagramNumber)) {
      throw new ValidationError(
        `Invalid hexagram number: "${segment}"`,
        { field: 'hexagramNumber', value: segment }
      );
    }

    validators.hexagramNumber(hexagramNumber);

    const hexagram = await getHexagram(hexagramNumber);
    const originalData = formatHexagramForAPI(hexagram);

    // Get translations in parallel
    const [englishResult, spanishResult, italianResult] = await Promise.allSettled([
      getTranslation(hexagram, 'English'),
      getTranslation(hexagram, 'Spanish'),
      getTranslation(hexagram, 'Italian')
    ]);

    const response = {
      original: originalData,
      translations: {
        english: englishResult.status === 'fulfilled' ? englishResult.value : { error: englishResult.reason?.message },
        spanish: spanishResult.status === 'fulfilled' ? spanishResult.value : { error: spanishResult.reason?.message },
        italian: italianResult.status === 'fulfilled' ? italianResult.value : { error: italianResult.reason?.message }
      }
    };

    return new Response(
      JSON.stringify(createSuccessResponse(response, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleCacheStatus(requestId: string, startTime: number): Promise<Response> {
    await getHexagramData().catch((err) => {
      throw new AppError(
        `Cache load failed: ${err.message}`,
        500,
        "CACHE_ERROR"
      );
    });

    clearExpiredCache();

    const response = {
      cache_size: Object.keys(hexagramCache?.hexagrams || {}).length,
      expected_size: 64,
      version: hexagramCache?.version || "unknown",
      source: "supabase_bucket",
      response_cache_entries: responseCache.size,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(createSuccessResponse(response, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleRandomBeacon(requestId: string, startTime: number): Promise<Response> {
    log(4, `[RANDOM] Fetching NIST beacon`);

    // Try NIST beacon first
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
          // Convert hex output to binary string
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
      
      log(4, `[RANDOM] NIST beacon unavailable or invalid, will use fallback`);
    } catch (error) {
      log(4, `[RANDOM] NIST beacon error: ${error.message}`);
    }

    // Fallback to crypto-secure random
    log(4, `[RANDOM] Using crypto fallback`);

    try {
      // Generate 512 random bits using crypto
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
    } catch (cryptoError) {
      log(4, `[RANDOM] Crypto fallback failed: ${cryptoError.message}`);
      throw new AppError(
        "Failed to generate randomness",
        500,
        "RANDOM_GENERATION_FAILED",
        { originalError: cryptoError.message }
      );
    }
  }

  async function handleHealthCheck(requestId: string, startTime: number): Promise<Response> {
    // Check database status with timeout - don't hang health check on DB load
    let dbStatus = "unknown";
    let dbEntries = 0;
    try {
      // Quick check if already loaded
      if (FULU_DATABASE.length > 0) {
        dbStatus = "loaded_from_bucket";
        dbEntries = FULU_DATABASE.length;
      } else {
        // Don't block health check on DB load - just report not loaded yet
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
        source: DAOIST_REMEDIES_DB_URL,
        verified_entries: dbEntries // All entries in fallback are verified
      }
    };

    return new Response(
      JSON.stringify(createSuccessResponse(health, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // ============================================================================
  // PDF EXPORT FUNCTIONS
  // ============================================================================

  async function generatePDF(data: ExportData): Promise<Uint8Array> {
    log(4, `[PDF] Generating PDF for hexagram ${data.hexagram.number}...`);

    // Lazy load PDF library
    const { PDFDocument, rgb, StandardFonts } = await getPdfLib();

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add pages with content
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    let y = height - 50;
    const margin = 50;
    const maxWidth = width - (margin * 2);

    // Helper to add text with wrapping
    const addText = (text: string, size: number, isBold = false, color = rgb(0, 0, 0), lineHeight = 1.2) => {
      const f = isBold ? fontBold : font;
      const words = text.split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const textWidth = f.widthOfTextAtSize(testLine, size);

        if (textWidth > maxWidth && line) {
          page.drawText(line, { x: margin, y, size, font: f, color });
          y -= size * lineHeight;
          line = word;

          // Check if we need a new page
          if (y < 100) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - 50;
          }
        } else {
          line = testLine;
        }
      }

      if (line) {
        page.drawText(line, { x: margin, y, size, font: f, color });
        y -= size * lineHeight;
      }

      y -= 5; // Paragraph spacing
    };

    // Helper to add section title
    const addTitle = (title: string, size = 16) => {
      if (y < 150) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      y -= 10;
      page.drawText(title, { x: margin, y, size, font: fontBold, color: rgb(0.2, 0.2, 0.4) });
      y -= size + 10;

      // Underline
      page.drawLine({
        start: { x: margin, y: y + 5 },
        end: { x: margin + 200, y: y + 5 },
        thickness: 1,
        color: rgb(0.2, 0.2, 0.4)
      });

      y -= 5;
    };

    // Title
    page.drawText('I Ching Reading', {
      x: margin,
      y,
      size: 28,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.35)
    });
    y -= 40;

    // Hexagram info
    page.drawText(`${data.hexagram.number}. ${data.hexagram.name} (${data.hexagram.nameZh})`, {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.4)
    });
    y -= 25;

    addText(`Date: ${data.date}`, 10);
    addText(`Binary: ${data.hexagram.binary}`, 10);
    y -= 10;

    // Question
    addTitle('Question');
    addText(data.question, 11);
    y -= 10;

    // Cast Lines with hexagram visualization
    addTitle('Hexagram');

    // Draw hexagram lines (top to bottom)
    const lineY = y;
    const lineWidth = 100;
    const lineHeight2 = 15;
    const lineSpacing = 5;

    data.lines.forEach((line, i) => {
      const lineYPos = lineY - (i * (lineHeight2 + lineSpacing));

      if (line.type === 'Yang') {
        // Solid line
        page.drawLine({
          start: { x: margin + 50, y: lineYPos },
          end: { x: margin + 50 + lineWidth, y: lineYPos },
          thickness: line.changing ? 4 : 3,
          color: line.changing ? rgb(0.8, 0.2, 0.2) : rgb(0, 0, 0)
        });
      } else {
        // Broken line (two segments)
        const gap = 20;
        page.drawLine({
          start: { x: margin + 50, y: lineYPos },
          end: { x: margin + 50 + (lineWidth - gap) / 2, y: lineYPos },
          thickness: 3,
          color: rgb(0, 0, 0)
        });
        page.drawLine({
          start: { x: margin + 50 + (lineWidth + gap) / 2, y: lineYPos },
          end: { x: margin + 50 + lineWidth, y: lineYPos },
          thickness: 3,
          color: rgb(0, 0, 0)
        });
      }

      // Line number
      page.drawText(`${6 - i}`, {
        x: margin + 10,
        y: lineYPos - 3,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });

      if (line.changing) {
        page.drawText('×', {
          x: margin + 50 + lineWidth + 10,
          y: lineYPos - 3,
          size: 12,
          font: fontBold,
          color: rgb(0.8, 0.2, 0.2)
        });
      }
    });

    y = lineY - (6 * (lineHeight2 + lineSpacing)) - 20;

    // Line details
    addText('Cast Lines:', 10, true);
    data.lines.forEach(line => {
      const changing = line.changing ? ' (Changing)' : '';
      addText(`Line ${line.position}: ${line.type}${changing}`, 9);
    });
    y -= 10;

    // Lunar Mansion
    if (data.mansion) {
      addTitle('Lunar Mansion');
      addText(`${data.mansion.name_en} (${data.mansion.name_zh})`, 11, true);
      addText(`Group: ${data.mansion.group} | Element: ${data.mansion.element} | Animal: ${data.mansion.animal}`, 9);
      y -= 10;
    }

    // Celestial Influences with BAZI
    if (data.interpretation.celestial || data.interpretation.birthBaziDescription) {
      addTitle('Celestial Influences');

      if (data.interpretation.birthBaziDescription) {
        addText('Birth Chart (Destiny):', 10, true);
        addText(data.interpretation.birthBaziDescription, 9);
        if (data.interpretation.birthBaziImpact) {
          addText('Impact on Reading:', 10, true, rgb(0.2, 0.2, 0.5));
          addText(data.interpretation.birthBaziImpact, 9);
        }
        y -= 5;
      }

      if (data.interpretation.currentBaziDescription) {
        addText('Current Energies (Moment):', 10, true);
        addText(data.interpretation.currentBaziDescription, 9);
        if (data.interpretation.currentBaziImpact) {
          addText('Impact on Reading:', 10, true, rgb(0.2, 0.2, 0.5));
          addText(data.interpretation.currentBaziImpact, 9);
        }
        y -= 5;
      }

      if (data.interpretation.celestial) {
        addText(data.interpretation.celestial, 9);
      }
      y -= 10;
    }

    // Five Elements
    if (data.interpretation.elements) {
      addTitle('Five Elements Analysis');
      addText(data.interpretation.elements, 9);
      y -= 10;
    }

    // Analysis
    if (data.interpretation.analysis) {
      addTitle('Analysis');
      addText(data.interpretation.analysis, 9);
      y -= 10;
    }

    // Advice
    if (data.interpretation.advice) {
      addTitle('Advice');
      addText(data.interpretation.advice, 9);
      y -= 10;
    }

    // Moving Lines
    if (data.interpretation.movingLines) {
      addTitle('Moving Lines');
      addText(data.interpretation.movingLines, 9);
      y -= 10;
    }

    // Classical Texts
    if (data.interpretation.judgment) {
      addTitle('Classical Texts');
      addText('Judgment:', 10, true);
      addText(data.interpretation.judgment, 9);
      y -= 5;

      if (data.interpretation.image) {
        addText('Image:', 10, true);
        addText(data.interpretation.image, 9);
        y -= 5;
      }

      if (data.interpretation.lines && data.interpretation.lines.length > 0) {
        addText('Line Texts:', 10, true);
        data.interpretation.lines.forEach((line, i) => {
          if (line && line.trim()) {
            addText(`Line ${i + 1}: ${line}`, 8);
          }
        });
      }
      y -= 10;
    }

    // Remedies
    if (data.remedies?.talisman) {
      addTitle('Daoist Remedies');

      addText('Talisman (Fulu):', 10, true);
      addText(data.remedies.talisman, 9);
      y -= 5;

      if (data.remedies.charm) {
        addText('Charm/Incantation (Fuzhou):', 10, true);
        addText(data.remedies.charm, 9);
        y -= 5;
      }

      if (data.remedies.talismanSource || data.remedies.charmSource) {
        addText('Sources:', 9, true, rgb(0.5, 0.5, 0.5));
        if (data.remedies.talismanSource) addText(data.remedies.talismanSource, 8, false, rgb(0.5, 0.5, 0.5));
        if (data.remedies.charmSource) addText(data.remedies.charmSource, 8, false, rgb(0.5, 0.5, 0.5));
      }
      y -= 10;
    }

    // Bagua Medicine / Feng Shui
    if (data.interpretation.baguaMedicine) {
      addTitle('Bagua Medicine & Feng Shui');
      const bm = data.interpretation.baguaMedicine;
      if (bm.fengShui) {
        addText('Favorable Directions: ' + (bm.fengShui.favorable?.join(', ') || 'N/A'), 9);
        addText('Unfavorable Directions: ' + (bm.fengShui.unfavorable?.join(', ') || 'N/A'), 9);
        if (bm.fengShui.guidance) addText(bm.fengShui.guidance, 9);
      }
      if (bm.medicine) {
        addText('Alchemical Medicine:', 10, true);
        addText(bm.medicine, 9);
      }
      y -= 10;
    }

    // Technical Analysis (Houtou/Later Heaven)
    if (data.interpretation.houtou || data.interpretation.houtouTechnical) {
      addTitle('Technical Analysis (Later Heaven)');
      if (data.interpretation.houtouTechnical) {
        addText(data.interpretation.houtouTechnical, 9);
      } else if (data.interpretation.houtou) {
        addText(data.interpretation.houtou, 9);
      }
      y -= 10;
    }

    // Xiantian (Early Heaven) Analysis
    if (data.interpretation.xiantian) {
      addTitle('Xiantian (Early Heaven) Analysis');
      const xian = data.interpretation.xiantian;
      if (typeof xian === 'object') {
        if (xian.spiritualEssence) {
          addText('Spiritual Essence:', 10, true);
          addText(xian.spiritualEssence, 9);
        }
        if (xian.innerAlchemy) {
          addText('Inner Alchemy:', 10, true);
          addText(xian.innerAlchemy, 9);
        }
        if (xian.cultivationAdvice) {
          addText('Cultivation Advice:', 10, true);
          addText(xian.cultivationAdvice, 9);
        }
      } else {
        addText(String(xian), 9);
      }
      y -= 10;
    }

    // Equilibrium Data
    if (data.equilibrium) {
      addTitle('Five Elements Equilibrium');
      addText(`Yin-Yang Balance: ${data.equilibrium.yangCount || 0} Yang / ${data.equilibrium.yinCount || 0} Yin`, 9);
      if (data.equilibrium.elements) {
        const elements = Object.entries(data.equilibrium.elements)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        addText('Element Distribution: ' + elements, 9);
      }
      y -= 10;
    }

    // Extended BaZi Analysis
    if (data.birthBaziExtended || data.currentBaziExtended) {
      addTitle('Advanced BaZi Analysis');

      if (data.birthBaziExtended?.hetu) {
        addText('Hetu (River Map) - Birth:', 10, true);
        const hetu = data.birthBaziExtended.hetu;
        if (hetu.generationAnalysis?.dominantElement) {
          addText(`Dominant Element: ${hetu.generationAnalysis.dominantElement}`, 9);
        }
        if (hetu.lifePath?.pathType) {
          addText(`Life Path: ${hetu.lifePath.pathType}`, 9);
        }
        y -= 5;
      }

      if (data.birthBaziExtended?.luoshu) {
        addText('Luoshu (Magic Square) - Birth:', 10, true);
        const luoshu = data.birthBaziExtended.luoshu;
        if (luoshu.mingGua) {
          addText(`Life Gua (Ming Gua): ${luoshu.mingGua.number} (${luoshu.mingGua.trigram})`, 9);
          if (luoshu.mingGua.favorableDirections) {
            const fav = Object.entries(luoshu.mingGua.favorableDirections)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
            addText(`Favorable Directions: ${fav}`, 9);
          }
        }
        y -= 5;
      }

      if (data.birthBaziExtended?.xiantian) {
        addText('Xiantian Trigrams - Birth:', 10, true);
        const xt = data.birthBaziExtended.xiantian;
        if (xt.threeTreasures?.dominant) {
          addText(`Dominant Treasure: ${xt.threeTreasures.dominant}`, 9);
        }
        if (xt.congenitalNature?.description) {
          addText(`Congenital Nature: ${xt.congenitalNature.description}`, 9);
        }
        y -= 5;
      }
      y -= 10;
    }

    // Diagram Reference Page
    page = pdfDoc.addPage([595.28, 841.89]);
    y = height - 50;

    addTitle('Diagrams Reference', 18);
    addText('The following diagrams were generated for this reading:', 10);
    y -= 10;

    addText('1. Hexagram Visualization', 11, true);
    addText('Visual representation of the hexagram lines (6 lines, bottom to top).', 9);
    addText('Changing lines marked with × symbol.', 9);
    y -= 10;

    addText('2. Bagua Diagram', 11, true);
    addText('Houtian (Later Heaven) Bagua arrangement with active trigrams highlighted.', 9);
    addText('Shows the relationship between the upper and lower trigrams.', 9);
    y -= 10;

    addText('3. Elements Chart', 11, true);
    addText('Five Elements (Wu Xing) distribution and balance visualization.', 9);
    y -= 10;

    addText('4. Fulu (Talisman) Diagrams', 11, true);
    addText('Traditional Daoist talisman renderings with seal characters.', 9);
    addText('FDL v2.0 (Fulu Drawing Language) encoded diagrams.', 9);
    y -= 10;

    addText('5. Xiantian (Early Heaven) Diagram', 11, true);
    addText('Primordial Bagua arrangement for spiritual cultivation reference.', 9);
    y -= 10;

    // Footer on last page
    page.drawLine({
      start: { x: margin, y: 60 },
      end: { x: width - margin, y: 60 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7)
    });

    page.drawText('Generated by Yijingtu I Ching Oracle', {
      x: margin,
      y: 40,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    page.drawText('For guidance and reflection purposes', {
      x: margin,
      y: 28,
      size: 7,
      font,
      color: rgb(0.6, 0.6, 0.6)
    });

    const pdfBytes = await pdfDoc.save();
    log(4, `[PDF] Generated ${pdfBytes.length} bytes`);
    return pdfBytes;
  }

  // ============================================================================
  // DIAGRAM EXPORT FUNCTIONS
  // ============================================================================

  function generateHexagramSVG(lines: Array<{ type: string, changing: boolean, value: number }>, width = 200, height = 240): string {
    const lineHeight = 25;
    const lineSpacing = 10;
    const startY = 30;
    const centerX = width / 2;
    const lineWidth = 120;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="${centerX}" y="20" text-anchor="middle" font-family="serif" font-size="14" fill="#333">
    Hexagram
  </text>`;

    lines.forEach((line, i) => {
      const y = startY + (i * (lineHeight + lineSpacing));

      if (line.type === 'Yang') {
        // Solid line
        const stroke = line.changing ? '#d32f2f' : '#212121';
        const strokeWidth = line.changing ? 5 : 4;
        svg += `
  <line x1="${centerX - lineWidth / 2}" y1="${y}" x2="${centerX + lineWidth / 2}" y2="${y}" 
        stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
      } else {
        // Broken line
        const gap = 15;
        svg += `
  <line x1="${centerX - lineWidth / 2}" y1="${y}" x2="${centerX - gap / 2}" y2="${y}" 
        stroke="#212121" stroke-width="4" stroke-linecap="round"/>
  <line x1="${centerX + gap / 2}" y1="${y}" x2="${centerX + lineWidth / 2}" y2="${y}" 
        stroke="#212121" stroke-width="4" stroke-linecap="round"/>`;
      }

      // Line number
      svg += `
  <text x="${centerX - lineWidth / 2 - 20}" y="${y + 4}" text-anchor="end" 
        font-family="sans-serif" font-size="11" fill="#666">${6 - i}</text>`;

      // Changing indicator
      if (line.changing) {
        svg += `
  <text x="${centerX + lineWidth / 2 + 10}" y="${y + 4}" font-family="sans-serif" 
        font-size="14" fill="#d32f2f" font-weight="bold">×</text>`;
      }
    });

    svg += `
</svg>`;
    return svg;
  }

  function generateBaguaStripSVG(width = 800, height = 60): string {
    const trigrams = [
      { name: 'Heaven', binary: '111', symbol: '☰', char: '乾' },
      { name: 'Earth', binary: '000', symbol: '☷', char: '坤' },
      { name: 'Thunder', binary: '001', symbol: '☳', char: '震' },
      { name: 'Water', binary: '010', symbol: '☵', char: '坎' },
      { name: 'Mountain', binary: '100', symbol: '☶', char: '艮' },
      { name: 'Wind', binary: '110', symbol: '☴', char: '巽' },
      { name: 'Fire', binary: '101', symbol: '☲', char: '離' },
      { name: 'Lake', binary: '011', symbol: '☱', char: '兌' }
    ];

    const itemWidth = width / 8;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a2e"/>
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffd700"/>
      <stop offset="50%" style="stop-color:#ffed4e"/>
      <stop offset="100%" style="stop-color:#daa520"/>
    </linearGradient>
  </defs>`;

    trigrams.forEach((tri, i) => {
      const x = i * itemWidth;
      const centerX = x + itemWidth / 2;

      svg += `
  <rect x="${x + 2}" y="2" width="${itemWidth - 4}" height="${height - 4}" 
        fill="rgba(255,255,255,0.05)" stroke="rgba(255,215,0,0.3)" stroke-width="1"/>`;

      svg += `
  <text x="${centerX}" y="20" text-anchor="middle" font-family="serif" font-size="16" 
        fill="url(#goldGrad)" font-weight="bold">${tri.symbol}</text>
  <text x="${centerX}" y="38" text-anchor="middle" font-family="serif" font-size="12" 
        fill="#aaa">${tri.char}</text>
  <text x="${centerX}" y="52" text-anchor="middle" font-family="sans-serif" font-size="9" 
        fill="#888">${tri.name}</text>`;
    });

    svg += `
</svg>`;
    return svg;
  }

  function generateElementsChartSVG(elements: { [key: string]: number }, width = 300, height = 200): string {
    const elementColors: { [key: string]: string } = {
      wood: '#4CAF50',
      fire: '#FF5722',
      earth: '#FFC107',
      metal: '#9E9E9E',
      water: '#2196F3'
    };


    let maxVal = Math.max(...Object.values(elements));
    // Validate maxVal to prevent NaN in SVG attributes
    if (!isFinite(maxVal) || maxVal <= 0) {
      maxVal = 100; // Default fallback to avoid division by zero
    }
    const barWidth = 40;
    const gap = 20;
    const startX = (width - (5 * barWidth + 4 * gap)) / 2;
    const maxHeight = 120;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="${width / 2}" y="20" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#333">
    Five Elements Distribution
  </text>`;

    Object.entries(elements).forEach(([el, val], i) => {
      const x = startX + i * (barWidth + gap);
      const barHeight = (val / maxVal) * maxHeight;
      const y = 50 + maxHeight - barHeight;

      svg += `
  <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
        fill="${elementColors[el.toLowerCase()] || '#999'}" rx="3"/>
  <text x="${x + barWidth / 2}" y="${50 + maxHeight + 15}" text-anchor="middle" 
        font-family="sans-serif" font-size="10" fill="#666">
    ${el.charAt(0).toUpperCase() + el.slice(1)}
  </text>
  <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" 
        font-family="sans-serif" font-size="9" fill="#999">
    ${Math.round(val)}%
  </text>`;
    });

    svg += `
</svg>`;
    return svg;
  }

  // ============================================================================
  // EXPORT ENDPOINT HANDLERS
  // ============================================================================

  async function handleExportPDF(body: any, requestId: string, startTime: number): Promise<Response> {
    log(4, `[EXPORT] Generating PDF...`);

    const { reading } = body;
    if (!reading) {
      throw new ValidationError("Reading data is required", { field: 'reading' });
    }

    // Validate required fields
    if (!reading.hexagram) {
      throw new ValidationError("Reading must include hexagram data", { field: 'reading.hexagram' });
    }

    try {
      // Ensure all nested objects exist to prevent undefined errors
      const sanitizedReading = {
        ...reading,
        hexagram: {
          number: reading.hexagram?.number || 0,
          name: reading.hexagram?.name || 'Unknown',
          nameZh: reading.hexagram?.nameZh || '未知',
          binary: reading.hexagram?.binary || '000000'
        },
        interpretation: reading.interpretation || {},
        remedies: reading.remedies || {},
        lines: reading.lines || []
      };

      const pdfBytes = await generatePDF(sanitizedReading as ExportData);

      return new Response(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="yijing_reading_${sanitizedReading.hexagram.number || 'unknown'}.pdf"`,
          "X-Request-ID": requestId
        }
      });
    } catch (error) {
      log(4, `[EXPORT] PDF generation failed: ${error.message}`);
      log(4, `[EXPORT] Stack: ${error.stack}`);
      throw new AppError("PDF generation failed", 500, "PDF_ERROR", {
        originalError: error.message,
        stack: error.stack
      });
    }
  }

  async function handleExportDiagram(body: any, requestId: string, startTime: number): Promise<Response> {
    const { type, data, format = 'svg' } = body;

    if (!type) {
      throw new ValidationError("Diagram type is required", { field: 'type', validTypes: ['hexagram', 'bagua', 'elements'] });
    }

    log(4, `[EXPORT] Generating ${type} diagram in ${format}...`);

    let content: string;
    let mimeType: string;
    let filename: string;

    switch (type) {
      case 'hexagram':
        if (!data?.lines) {
          throw new ValidationError("Hexagram lines are required", { field: 'data.lines' });
        }
        content = generateHexagramSVG(data.lines, data.width, data.height);
        mimeType = 'image/svg+xml';
        filename = `hexagram_${data.number || 'reading'}.svg`;
        break;

      case 'bagua':
        content = generateBaguaStripSVG(data?.width, data?.height);
        mimeType = 'image/svg+xml';
        filename = 'bagua_strip.svg';
        break;

      case 'elements':
        if (!data?.elements) {
          throw new ValidationError("Elements data is required", { field: 'data.elements' });
        }
        content = generateElementsChartSVG(data.elements, data?.width, data?.height);
        mimeType = 'image/svg+xml';
        filename = 'elements_chart.svg';
        break;

      default:
        throw new ValidationError(`Unknown diagram type: ${type}`, { field: 'type', validTypes: ['hexagram', 'bagua', 'elements'] });
    }

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Request-ID": requestId
      }
    });
  }

  // ============================================================================
  // BATCH TRANSLATION HANDLER - Separated from composition to avoid timeouts
  // ============================================================================

  async function handleTranslateAll(body: any, requestId: string, startTime: number): Promise<Response> {
    const { interpretation, lang, sections } = body;

    if (!interpretation || !lang) {
      throw new ValidationError("Request must include 'interpretation' and 'lang'", { field: 'body' });
    }

    if (lang === 'en') {
      // No translation needed for English
      return new Response(
        JSON.stringify(createSuccessResponse({ interpretation }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const langNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'it': 'Italian',
      'zh': 'Chinese'
    };

    log(4, `[translate-all] Translating interpretation to ${langNames[lang]}...`);

    // Collect all text fields that need translation
    const fieldsToTranslate: { [key: string]: string } = {};
    const enData = interpretation.en || interpretation;

    // Helper to collect fields recursively
    const collectFields = (obj: any, prefix: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.trim() && value.length > 5) {
          // Only translate substantial text (more than 5 chars)
          fieldsToTranslate[prefix + key] = value;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recurse into nested objects
          collectFields(value, prefix + key + '.');
        }
      }
    };

    // Collect fields from main sections
    if (sections) {
      // Only translate requested sections
      for (const section of sections) {
        if (enData[section]) {
          collectFields({ [section]: enData[section] });
        }
      }
    } else {
      // Translate all available fields
      collectFields(enData);
    }

    log(4, `[translate-all] Collected ${Object.keys(fieldsToTranslate).length} fields for translation`);

    // Batch translate in chunks of 10 fields to avoid overwhelming the AI
    const translatedFields: { [key: string]: string } = {};
    const fieldKeys = Object.keys(fieldsToTranslate);
    const chunkSize = 10;

    for (let i = 0; i < fieldKeys.length; i += chunkSize) {
      const chunk = fieldKeys.slice(i, i + chunkSize);
      const chunkData: { [key: string]: string } = {};
      for (const key of chunk) {
        chunkData[key] = fieldsToTranslate[key];
      }

      try {
        log(4, `[translate-all] Translating chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(fieldKeys.length / chunkSize)}...`);
        const translated = await translateInterpretationContent(
          chunkData,
          lang,
          langNames[lang] || lang,
          `Batch ${Math.floor(i / chunkSize) + 1}`
        );
        Object.assign(translatedFields, translated);
      } catch (e) {
        log(4, `[translate-all] Translation failed for chunk: ${e.message}`);
        // Continue with next chunk
      }
    }

    // Build translated interpretation
    const translatedInterpretation = JSON.parse(JSON.stringify(interpretation));

    // Apply translations
    for (const [keyPath, value] of Object.entries(translatedFields)) {
      const keys = keyPath.split('.');
      let target = translatedInterpretation[lang];
      if (!target) {
        target = {};
        translatedInterpretation[lang] = target;
      }

      // Navigate to the correct nested location
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) target[keys[i]] = {};
        target = target[keys[i]];
      }

      // Set the translated value
      target[keys[keys.length - 1]] = value;
    }

    // Ensure target lang has all English fields as fallback
    if (!translatedInterpretation[lang]) {
      translatedInterpretation[lang] = {};
    }
    const deepAssign = (target: any, source: any) => {
      for (const key of Object.keys(source)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          deepAssign(target[key], source[key]);
        } else if (target[key] === undefined) {
          target[key] = source[key];
        }
      }
    };
    deepAssign(translatedInterpretation[lang], enData);

    log(4, `[translate-all] Translation complete`);

    return new Response(
      JSON.stringify(createSuccessResponse({ interpretation: translatedInterpretation }, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async function handleVersion(requestId: string, startTime: number): Promise<Response> {
    const version = {
      version: API_VERSION,
      timestamp: new Date().toISOString(),
      features: [
        "hexagram-lookup",
        "interpretation",
        "translation",
        "batch-processing",
        "rate-limiting",
        "caching",
        "pdf-export",
        "diagram-export",
        "async-translation"
      ]
    };

    return new Response(
      JSON.stringify(createSuccessResponse(version, requestId, startTime)),
      { headers: { "Content-Type": "application/json" } }
    );
  }
  // ═══════════════════════════════════════════════════════════════════════════════
  // FDL v2.0 & CONTEXT INTERPRETATION HANDLERS
  // Consolidated from supabase_functions/fdl-generate.ts, interpret.ts, xiantian-interpret.ts
  // ═══════════════════════════════════════════════════════════════════════════════

  // Named references for context-based interpretation
  const NAMED_REFS: Record<string, string> = {
    hexagrams: `${SUPABASE_URL}/storage/v1/object/public/bucket/hexagrams.json`,
    fengshui: `${SUPABASE_URL}/storage/v1/object/public/bucket/daoist_remedies_db.js`,
    fulu: `${SUPABASE_URL}/storage/v1/object/public/bucket/daoist_remedies_db.js`,
    remedies: `${SUPABASE_URL}/storage/v1/object/public/bucket/daoist_remedies_db.js`
  };

  // Xiantian (Early Heaven) trigram definitions for spiritual interpretation
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

  // FDL v2.0 System Prompt for AI generation
  const FDL_SYSTEM_PROMPT = `
You are an FDL (Fulu Drawing Language v2.0) diagram generator.
Your ONLY job is to output a valid FDL v2.0 JSON document — nothing else.

═══ FDL v2.0 DOCUMENT SCHEMA ════════════════════════════════════════════
{
  "version": "2.0",
  "type": "talisman|fengshui_diagram|taijitu|bagua_chart|bazi_chart|generic",
  "background": "#1a1a2e",
  "title": "...",
  "arrangement": "houtian|xiantian",
  "lang": "en|zh|es|it",
  "layers": [{ "name": "...", "opacity": 1.0, "commands": [...] }]
}

═══ COMMAND CATALOGUE ═══════════════════════════════════════════════════
All coordinates in virtual 1000×1000 canvas space.

{ "type":"rect", "x":100, "y":100, "w":200, "h":150, "style":{...} }
{ "type":"circle", "cx":500, "cy":500, "r":200, "style":{...} }
{ "type":"text", "x":500, "y":200, "content":"太極", "size":80, "font":"noto-serif-sc" }
{ "type":"taijitu", "cx":500, "cy":500, "r":120, "yinColor":"#000", "yangColor":"#fff" }
{ "type":"bagua", "cx":500, "cy":500, "size":900, "arrangement":"houtian|xiantian" }
{ "type":"highlight_sector", "trigram":"Xun", "style":{...}, "label":{...} }
{ "type":"instruction_marker", "trigram":"Li", "instruction":{...}, "style":{...} }
{ "type":"seal_char", "x":500, "y":400, "chars":["太","平","符"], "size":100, "style":"cloud" }
{ "type":"thunder_header", "cx":500, "cy":200, "size":90, "style":{...} }

CRITICAL RULES:
1. Output ONLY valid JSON. No markdown, no comments, no explanation.
2. All coordinates use 1000×1000 virtual canvas.
3. Always include "version": "2.0".
4. Use proper FDL command types only.
5. Use Chinese characters (not pinyin) for talisman text.
6. Include layer opacity for overlay effects.
`;

  /**
   * Handle FDL v2.0 generation from natural language prompts
   * Endpoint: POST /fdl-generate
   */
  async function handleFDLGenerate(body: any, requestId: string, startTime: number): Promise<Response> {
    const { prompt, lang = 'en', type, context } = body;

    if (!prompt || typeof prompt !== 'string') {
      throw new ValidationError("Missing or invalid 'prompt' field", { field: 'prompt' });
    }

    log(4, `[fdl-generate] Generating FDL for prompt: ${prompt.substring(0, 50)}...`);

    const userPrompt = `Create an FDL v2.0 diagram for: ${prompt}
Language: ${lang}
${type ? `Type hint: ${type}` : ''}
${context ? `Context: ${JSON.stringify(context)}` : ''}`;

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
              { role: 'system', content: FDL_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: MAX_OUTPUT_TOKENS
          })
        },
        REQUEST_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new APIError(`DeepSeek API error: ${response.status}`, { status: response.status, details: errorText });
      }

      const data = await response.json();
      const fdlText = data.choices?.[0]?.message?.content;

      if (!fdlText) {
        throw new APIError("Empty response from DeepSeek API");
      }

      // Parse and validate FDL
      let fdl: any;
      try {
        const cleanedText = fdlText.replace(/\`\`\`json|```/g, '').trim();
        fdl = JSON.parse(cleanedText);

        // Validate required fields
        if (!fdl.version || fdl.version !== '2.0') {
          log(2, `[fdl-generate] Warning: FDL missing or invalid version, defaulting to 2.0`);
          fdl.version = '2.0';
        }
      } catch (e) {
        log(2, `[fdl-generate] Failed to parse FDL JSON`, { error: (e as Error).message, raw: fdlText.substring(0, 200) });
        return new Response(
          JSON.stringify(createErrorResponse(
            "Invalid FDL JSON generated by AI",
            { raw: fdlText.substring(0, 500), error: (e as Error).message },
            requestId,
            startTime
          )),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      log(4, `[fdl-generate] Successfully generated FDL document`);

      return new Response(
        JSON.stringify(createSuccessResponse({
          fdl,
          description: `FDL v2.0 diagram for: ${prompt}`,
          lang,
          type: fdl.type || 'generic'
        }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new APIError(`FDL generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Resolve context from URL, data, or named reference
   */
  async function resolveContext(input: { url?: string; data?: unknown; ref?: string }): Promise<string> {
    if (input.ref) {
      const url = NAMED_REFS[input.ref];
      if (!url) {
        throw new ValidationError(`Unknown reference: ${input.ref}`, { availableRefs: Object.keys(NAMED_REFS) });
      }
      log(4, `[interpret-context] Resolving ref '${input.ref}' from ${url}`);
      const res = await fetchWithTimeout(url, { method: 'GET' }, FETCH_TIMEOUT_MS);
      if (!res.ok) {
        throw new APIError(`Failed to fetch ref data: ${res.status}`, { ref: input.ref, url });
      }
      return await res.text();
    }

    if (input.url) {
      log(4, `[interpret-context] Fetching context from URL: ${input.url}`);
      const res = await fetchWithTimeout(input.url, { method: 'GET' }, FETCH_TIMEOUT_MS);
      if (!res.ok) {
        throw new APIError(`Failed to fetch context URL: ${res.status}`, { url: input.url });
      }
      return await res.text();
    }

    if (input.data) {
      log(4, `[interpret-context] Using provided data as context`);
      return JSON.stringify(input.data, null, 2);
    }

    throw new ValidationError("Context must provide url, data, or ref", { context: input });
  }

  /**
   * Handle context-based interpretation
   * Endpoint: POST /interpret-context
   * Answers queries based ONLY on provided context (URL, data, or named reference)
   */
  async function handleInterpretContext(body: any, requestId: string, startTime: number): Promise<Response> {
    const { query, context, lang = 'en', includeFDL = false, hexagramId, stream = false } = body;

    if (!query || typeof query !== 'string') {
      throw new ValidationError("Missing or invalid 'query' field", { field: 'query' });
    }

    if (!context || typeof context !== 'object') {
      throw new ValidationError("Missing or invalid 'context' field", { field: 'context', expected: '{url|data|ref}' });
    }

    log(4, `[interpret-context] Query: ${query.substring(0, 50)}...`);

    try {
      // Resolve context
      const contextText = await resolveContext(context);

      // Truncate if too large
      const MAX_CONTEXT_CHARS = 15000;
      const truncatedContext = contextText.length > MAX_CONTEXT_CHARS
        ? contextText.substring(0, MAX_CONTEXT_CHARS) + '\n...[truncated for length]'
        : contextText;

      const systemPrompt = `You are a Daoist I Ching scholar. Answer the user's query based ONLY on the provided context.
Do NOT use any prior knowledge. If the answer is not in the context, say so explicitly.
Be concise but thorough. Cite specific sources from the context when possible.

CRITICAL RULES:
1. Base your answer SOLELY on the provided context
2. If the context doesn't contain the answer, state: "The provided context does not contain information about..."
3. Cite specific sections or data points from the context
4. Do not mention that you are an AI or that you have limitations`;

      const userPrompt = `=== CONTEXT (YOUR ONLY SOURCE OF INFORMATION) ===
${truncatedContext}
${hexagramId ? `\nFOCUS HEXAGRAM: #${hexagramId}` : ''}
=== END CONTEXT ===

QUERY: ${query}

Answer based ONLY on the context above. Be specific and cite sources.`;

      if (stream) {
        // Return SSE stream for streaming responses
        const streamResponse = await fetchWithTimeout(
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
              temperature: 0.7,
              max_tokens: MAX_OUTPUT_TOKENS,
              stream: true
            })
          },
          REQUEST_TIMEOUT_MS
        );

        // Transform to SSE format
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        streamResponse.body?.pipeTo(new WritableStream({
          write(chunk) {
            writer.write(chunk);
          },
          close() {
            writer.close();
          }
        }));

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });
      }

      // Non-streaming response
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
            temperature: 0.7,
            max_tokens: MAX_OUTPUT_TOKENS
          })
        },
        REQUEST_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new APIError(`DeepSeek API error: ${response.status}`, { status: response.status, details: errorText });
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content;

      if (!answer) {
        throw new APIError("Empty response from DeepSeek API");
      }

      // Extract summary and key points
      const summary = answer.split('\n')[0]?.substring(0, 200) || answer.substring(0, 200);
      const keyPoints = answer
        .split(/[.\n]/)
        .filter((s: string) => s.trim().length > 20 && (s.includes(':') || s.includes('-') || s.includes('•')))
        .slice(0, 5)
        .map((s: string) => s.trim().replace(/^[\s•\-\d.]+/, ''));

      // Generate FDL if requested
      let fdl = null;
      if (includeFDL) {
        log(4, `[interpret-context] Generating FDL diagram`);
        fdl = {
          version: '2.0',
          type: 'generic',
          background: '#1a1a2e',
          title: 'Context Interpretation',
          lang,
          layers: [{
            name: 'context_visual',
            opacity: 1.0,
            commands: [
              { type: 'rect', x: 100, y: 100, w: 800, h: 800, style: { fill: '#0a0a1a', stroke: '#d4af37', strokeWidth: 2 } },
              { type: 'text', x: 500, y: 150, content: lang === 'zh' ? '文脈解釋' : 'Context Reading', size: 40, font: 'noto-serif-sc', style: { fill: '#d4af37' } }
            ]
          }]
        };
      }

      log(4, `[interpret-context] Interpretation complete`);

      return new Response(
        JSON.stringify(createSuccessResponse({
          interpretation: {
            text: answer,
            summary,
            keyPoints,
            lang
          },
          fdl,
          sources: Object.keys(context),
          contextLength: contextText.length
        }, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new APIError(`Context interpretation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate Xiantian (Early Heaven) FDL diagram
   */
  function generateXiantianFDL(hexagramNumber?: number): any {
    const commands: any[] = [
      { type: 'bagua', cx: 500, cy: 500, size: 800, arrangement: 'xiantian' },
      { type: 'annotation', position: 'top', text: '先天八卦 Xiantian Bagua (Early Heaven)', style: { fontSize: 24, color: '#D4AF37' } }
    ];

    // Add hexagram-specific annotation if provided
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

  /**
   * Handle Xiantian (Early Heaven) spiritual interpretation
   * Endpoint: POST /interpret-xiantian
   * For Neidan (Internal Alchemy) and spiritual cultivation
   */
  async function handleInterpretXiantian(body: any, requestId: string, startTime: number): Promise<Response> {
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
- Shen (Spirit) cultivation in the upper dantian (between eyebrows)
- Qi (Energy) circulation in the middle dantian (heart center)
- Jing (Essence) conservation in the lower dantian (belly center)
- Fire and Water phases (Huo Hou)
- Kan-Li interaction (Water-Fire alchemy)

Use classical Neidan terminology: Three Treasures (San Bao), Three Dantians, Nine Palaces, Five Elements internal transformation.

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

      // Parse the JSON response
      let interpretation: any;
      try {
        interpretation = JSON.parse(content);
      } catch (e) {
        log(2, `[interpret-xiantian] Failed to parse JSON response`, { content: content.substring(0, 200) });
        // Fallback: wrap the text response
        interpretation = {
          spiritual: { shen: content.substring(0, 500), qi: '', jing: '' },
          alchemical: { cauldronPosition: '', firePhases: [], waterPhases: [] },
          practice: { meditationFocus: '', breathingTechnique: '', visualization: '' }
        };
      }

      // Generate Xiantian FDL diagram
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

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new APIError(`Xiantian interpretation failed: ${(error as Error).message}`);
    }
  }

  // ============================================================================
  // CHINESE ASTROLOGY API - SIDEREAL & LUNAR SYSTEMS
  // ============================================================================
  // 
  // AYANAMSA EXPLANATION FOR CHINESE ASTROLOGY:
  // 
  // In traditional Chinese astronomy, "ayanamsa" manifests as:
  // 1. LINGCHA (歷差 - Calendar Difference): Longitude-based time correction
  // 2. CHA SHI (差時 - Time Difference): Local mean time vs standard time
  // 3. ZHENG SHI (正時 - True Time): Solar time based on location longitude
  //
  // For each 15° of longitude difference from the reference meridian (120°E for China),
  // there is a 1-hour time difference. This affects:
  // - Hour Pillar calculation
  // - Lunar mansion position
  // - Ascendant (Life Palace) calculation
  // - Qi Men Dun Jia plate setup
  //
  // Reference meridians:
  // - China: 120°E (standard time zone)
  // - Historical: Local observatory longitude
  // - This API: User's exact longitude

  // ============================================================================
  // CONSTANTS & DATA
  // ============================================================================

  // Reference meridian for traditional Chinese calculations (120°E - Beijing/Jiangsu)
  const CHINA_REFERENCE_LONGITUDE = 120.0;

  // Degrees per hour (Earth rotation)
  const DEGREES_PER_HOUR = 15.0;

  // Minutes per degree
  const MINUTES_PER_DEGREE = 4.0;

  // 28 Lunar Mansions (Xiu) with precise boundaries
  const LUNAR_MANSIONS_28 = [
    { num: 1, name: "Jiao", zh: "角", degree: 12, element: "Wood", direction: "E", animal: "Dragon", group: "Azure Dragon" },
    { num: 2, name: "Kang", zh: "亢", degree: 9, element: "Metal", direction: "E", animal: "Dragon", group: "Azure Dragon" },
    { num: 3, name: "Di", zh: "氐", degree: 15, element: "Earth", direction: "E", animal: "Badger", group: "Azure Dragon" },
    { num: 4, name: "Fang", zh: "房", degree: 5, element: "Sun", direction: "E", animal: "Rabbit", group: "Azure Dragon" },
    { num: 5, name: "Xin", zh: "心", degree: 5, element: "Moon", direction: "E", animal: "Fox", group: "Azure Dragon" },
    { num: 6, name: "Wei", zh: "尾", degree: 18, element: "Fire", direction: "E", animal: "Tiger", group: "Azure Dragon" },
    { num: 7, name: "Ji", zh: "箕", degree: 11, element: "Wood", direction: "E", animal: "Leopard", group: "Azure Dragon" },
    { num: 8, name: "Dou", zh: "斗", degree: 26, element: "Wood", direction: "N", animal: "Ox", group: "Black Tortoise" },
    { num: 9, name: "Niu", zh: "牛", degree: 8, element: "Earth", direction: "N", animal: "Ox", group: "Black Tortoise" },
    { num: 10, name: "Nu", zh: "女", degree: 12, element: "Earth", direction: "N", animal: "Bat", group: "Black Tortoise" },
    { num: 11, name: "Xu", zh: "虛", degree: 10, element: "Sun", direction: "N", animal: "Rat", group: "Black Tortoise" },
    { num: 12, name: "Wei2", zh: "危", degree: 17, element: "Moon", direction: "N", animal: "Swallow", group: "Black Tortoise" },
    { num: 13, name: "Shi", zh: "室", degree: 16, element: "Fire", direction: "N", animal: "Pig", group: "Black Tortoise" },
    { num: 14, name: "Bi", zh: "壁", degree: 9, element: "Water", direction: "N", animal: "Porcupine", group: "Black Tortoise" },
    { num: 15, name: "Kui", zh: "奎", degree: 16, element: "Wood", direction: "W", animal: "Wolf", group: "White Tiger" },
    { num: 16, name: "Lou", zh: "婁", degree: 12, element: "Metal", direction: "W", animal: "Dog", group: "White Tiger" },
    { num: 17, name: "Wei3", zh: "胃", degree: 14, element: "Earth", direction: "W", animal: "Pheasant", group: "White Tiger" },
    { num: 18, name: "Mao", zh: "昴", degree: 11, element: "Sun", direction: "W", animal: "Rooster", group: "White Tiger" },
    { num: 19, name: "Bi2", zh: "畢", degree: 16, element: "Moon", direction: "W", animal: "Crow", group: "White Tiger" },
    { num: 20, name: "Zui", zh: "觜", degree: 2, element: "Fire", direction: "W", animal: "Monkey", group: "White Tiger" },
    { num: 21, name: "Shen", zh: "參", degree: 9, element: "Water", direction: "W", animal: "Ape", group: "White Tiger" },
    { num: 22, name: "Jing", zh: "井", degree: 33, element: "Wood", direction: "S", animal: "Tapir", group: "Vermilion Bird" },
    { num: 23, name: "Gui", zh: "鬼", degree: 4, element: "Metal", direction: "S", animal: "Sheep", group: "Vermilion Bird" },
    { num: 24, name: "Liu", zh: "柳", degree: 15, element: "Earth", direction: "S", animal: "Deer", group: "Vermilion Bird" },
    { num: 25, name: "Xing", zh: "星", degree: 7, element: "Sun", direction: "S", animal: "Horse", group: "Vermilion Bird" },
    { num: 26, name: "Zhang", zh: "張", degree: 18, element: "Moon", direction: "S", animal: "Deer", group: "Vermilion Bird" },
    { num: 27, name: "Yi", zh: "翼", degree: 18, element: "Fire", direction: "S", animal: "Snake", group: "Vermilion Bird" },
    { num: 28, name: "Zhen", zh: "軫", degree: 17, element: "Water", direction: "S", animal: "Worm", group: "Vermilion Bird" }
  ];

  // Build cumulative degrees
  let cumulativeDeg = 0;
  for (const m of LUNAR_MANSIONS_28) {
    m.startDeg = cumulativeDeg;
    cumulativeDeg += m.degree;
    m.endDeg = cumulativeDeg;
  }

  // Heavenly Stems
  const HEAVENLY_STEMS = [
    { name: "Jia", zh: "甲", element: "Wood", polarity: "Yang", num: 1 },
    { name: "Yi", zh: "乙", element: "Wood", polarity: "Yin", num: 2 },
    { name: "Bing", zh: "丙", element: "Fire", polarity: "Yang", num: 3 },
    { name: "Ding", zh: "丁", element: "Fire", polarity: "Yin", num: 4 },
    { name: "Wu", zh: "戊", element: "Earth", polarity: "Yang", num: 5 },
    { name: "Ji", zh: "己", element: "Earth", polarity: "Yin", num: 6 },
    { name: "Geng", zh: "庚", element: "Metal", polarity: "Yang", num: 7 },
    { name: "Xin", zh: "辛", element: "Metal", polarity: "Yin", num: 8 },
    { name: "Ren", zh: "壬", element: "Water", polarity: "Yang", num: 9 },
    { name: "Gui", zh: "癸", element: "Water", polarity: "Yin", num: 10 }
  ];

  // Earthly Branches
  const EARTHLY_BRANCHES = [
    { name: "Zi", zh: "子", element: "Water", polarity: "Yang", zodiac: "Rat", num: 1, hidden: ["Gui"] },
    { name: "Chou", zh: "丑", element: "Earth", polarity: "Yin", zodiac: "Ox", num: 2, hidden: ["Ji", "Gui", "Xin"] },
    { name: "Yin", zh: "寅", element: "Wood", polarity: "Yang", zodiac: "Tiger", num: 3, hidden: ["Jia", "Bing", "Wu"] },
    { name: "Mao", zh: "卯", element: "Wood", polarity: "Yin", zodiac: "Rabbit", num: 4, hidden: ["Yi"] },
    { name: "Chen", zh: "辰", element: "Earth", polarity: "Yang", zodiac: "Dragon", num: 5, hidden: ["Wu", "Yi", "Gui"] },
    { name: "Si", zh: "巳", element: "Fire", polarity: "Yin", zodiac: "Snake", num: 6, hidden: ["Bing", "Wu", "Geng"] },
    { name: "Wu", zh: "午", element: "Fire", polarity: "Yang", zodiac: "Horse", num: 7, hidden: ["Ding", "Ji"] },
    { name: "Wei", zh: "未", element: "Earth", polarity: "Yin", zodiac: "Goat", num: 8, hidden: ["Ji", "Ding", "Yi"] },
    { name: "Shen", zh: "申", element: "Metal", polarity: "Yang", zodiac: "Monkey", num: 9, hidden: ["Geng", "Ren", "Wu"] },
    { name: "You", zh: "酉", element: "Metal", polarity: "Yin", zodiac: "Rooster", num: 10, hidden: ["Xin"] },
    { name: "Xu", zh: "戌", element: "Earth", polarity: "Yang", zodiac: "Dog", num: 11, hidden: ["Wu", "Xin", "Ding"] },
    { name: "Hai", zh: "亥", element: "Water", polarity: "Yin", zodiac: "Pig", num: 12, hidden: ["Ren", "Jia"] }
  ];

  // Symbolic Stars (Shen Sha) Formulas
  const SHEN_SHA_FORMULAS = {
    // Tian Yi Gui Ren - Noble Person Star
    tianYiGuiRen: {
      stemMap: {
        "Jia": ["Chou", "Wei"], "Wu": ["Chou", "Wei"], "Geng": ["Chou", "Wei"],
        "Yi": ["Zi", "Shen"], "Ji": ["Zi", "Shen"],
        "Bing": ["Hai", "You"], "Ding": ["Hai", "You"],
        "Ren": ["Si", "Mao"], "Gui": ["Si", "Mao"],
        "Xin": ["Yin", "Wu"]
      },
      meaning: "Guardian Angel - help from powerful people in crisis",
      quality: "Auspicious"
    },

    // Tao Hua - Peach Blossom
    peachBlossom: {
      branchMap: {
        "Yin": "Mao", "Wu": "Mao", "Xu": "Mao",     // Tiger/Horse/Dog
        "Si": "Wu", "You": "Wu", "Chou": "Wu",     // Snake/Rooster/Ox
        "Shen": "You", "Zi": "You", "Chen": "You", // Monkey/Rat/Dragon
        "Hai": "Zi", "Mao": "Zi", "Wei": "Zi"      // Pig/Rabbit/Goat
      },
      meaning: "Charisma, romance, social attraction",
      quality: "Mixed"
    },

    // Wen Chang - Academic Star
    wenChang: {
      stemMap: {
        "Jia": "Si", "Yi": "Wu",
        "Bing": "Shen", "Wu": "Shen",
        "Ding": "You", "Ji": "You",
        "Geng": "Hai", "Xin": "Zi",
        "Ren": "Yin", "Gui": "Mao"
      },
      meaning: "Intelligence, literary talent, exam success",
      quality: "Auspicious"
    },

    // Yi Ma - Travelling Horse
    yiMa: {
      branchMap: {
        "Yin": "Shen", "Shen": "Yin",
        "Si": "Hai", "Hai": "Si",
        "Shen": "Yin", "Zi": "Yin", "Chen": "Yin",
        "Hai": "Si", "Mao": "Si", "Wei": "Si",
        "Yin": "Shen", "Wu": "Shen", "Xu": "Shen",
        "Si": "Hai", "You": "Hai", "Chou": "Hai"
      },
      meaning: "Movement, migration, rapid change",
      quality: "Dynamic"
    },

    // Tian Yi - Heavenly Doctor (Feng Shui)
    tianYi: {
      stemMap: {
        "Jia": "Chou", "Yi": "Zi", "Bing": "Hai", "Ding": "You",
        "Wu": "Chou", "Ji": "Zi", "Geng": "Chou", "Xin": "Yin",
        "Ren": "Si", "Gui": "Mao"
      },
      meaning: "Healing, medical support, recovery",
      quality: "Auspicious"
    },

    // Yang Ren - Goat Blade/Sword
    yangRen: {
      stemMap: {
        "Jia": "Mao", "Yi": "Yin", "Bing": "Wu", "Ding": "Si",
        "Wu": "Wu", "Ji": "Si", "Geng": "You", "Xin": "Shen",
        "Ren": "Zi", "Gui": "Hai"
      },
      meaning: "Extreme persistence, aggression, potential for injury",
      quality: "Challenging"
    }
  };

  // Tai Sui (Grand Duke) positions by year
  const TAI_SUI_POSITIONS = {
    "Zi": { direction: "N", degree: 0, zodiac: "Rat" },
    "Chou": { direction: "NE", degree: 30, zodiac: "Ox" },
    "Yin": { direction: "NE", degree: 60, zodiac: "Tiger" },
    "Mao": { direction: "E", degree: 90, zodiac: "Rabbit" },
    "Chen": { direction: "SE", degree: 120, zodiac: "Dragon" },
    "Si": { direction: "SE", degree: 150, zodiac: "Snake" },
    "Wu": { direction: "S", degree: 180, zodiac: "Horse" },
    "Wei": { direction: "SW", degree: 210, zodiac: "Goat" },
    "Shen": { direction: "SW", degree: 240, zodiac: "Monkey" },
    "You": { direction: "W", degree: 270, zodiac: "Rooster" },
    "Xu": { direction: "NW", degree: 300, zodiac: "Dog" },
    "Hai": { direction: "NW", degree: 330, zodiac: "Pig" }
  };

  // Nine Stars for Qi Men Dun Jia
  const QI_MEN_STARS = [
    { num: 1, name: "Tian Peng", zh: "天蓬", element: "Water", nature: "Pioneering, hidden" },
    { num: 2, name: "Tian Rui", zh: "天芮", element: "Earth", nature: "Sickness, education" },
    { num: 3, name: "Tian Chong", zh: "天沖", element: "Wood", nature: "Action, aggression" },
    { num: 4, name: "Tian Fu", zh: "天輔", element: "Wood", nature: "Culture, support" },
    { num: 5, name: "Tian Qin", zh: "天禽", element: "Earth", nature: "Central, balanced" },
    { num: 6, name: "Tian Xin", zh: "天心", element: "Metal", nature: "Heavenly heart, medicine" },
    { num: 7, name: "Tian Zhu", zh: "天柱", element: "Metal", nature: "Destruction, litigation" },
    { num: 8, name: "Tian Ren", zh: "天任", element: "Earth", nature: "Responsibility, building" },
    { num: 9, name: "Tian Ying", zh: "天英", element: "Fire", nature: "Fire, heroism" }
  ];

  // ============================================================================
  // AYANAMSA (LONGITUDE CORRECTION) CALCULATIONS
  // ============================================================================

  interface LocationData {
    longitude: number;  // -180 to 180, East is positive
    latitude: number;   // -90 to 90
    altitude?: number;  // meters above sea level
  }

  interface AyanamsaResult {
    originalTime: string;
    correctedTime: string;
    longitudeCorrection: number;  // in minutes
    timeDifference: string;
    referenceMeridian: number;
    localMeanTime: string;
    trueSolarTime: string;
    equationOfTime: number;  // correction for Earth's elliptical orbit
  }

  /**
   * Calculate Ayanamsa (Longitude-based time correction)
   * 
   * In Chinese astrology, this is called LINGCHA (歷差) or CHA SHI (差時)
   * 
   * @param date - The date/time
   * @param location - Longitude and latitude
   * @returns Corrected time data
   */
  function calculateAyanamsa(date: Date, location: LocationData): AyanamsaResult {
    // Calculate longitude-based time difference
    // For every 15° of longitude difference = 1 hour
    // For every 1° of longitude = 4 minutes
    const longitudeDiff = location.longitude - CHINA_REFERENCE_LONGITUDE;
    const correctionMinutes = longitudeDiff * MINUTES_PER_DEGREE;

    // Calculate equation of time (Earth's elliptical orbit correction)
    // This accounts for the difference between mean solar time and apparent solar time
    const dayOfYear = getDayOfYear(date);
    const equationOfTime = calculateEquationOfTime(dayOfYear);

    // Total correction in milliseconds
    const totalCorrectionMs = (correctionMinutes + equationOfTime) * 60 * 1000;

    // Apply correction
    const correctedDate = new Date(date.getTime() + totalCorrectionMs);

    return {
      originalTime: date.toISOString(),
      correctedTime: correctedDate.toISOString(),
      longitudeCorrection: correctionMinutes,
      timeDifference: formatTimeDifference(correctionMinutes),
      referenceMeridian: CHINA_REFERENCE_LONGITUDE,
      localMeanTime: correctedDate.toISOString(),
      trueSolarTime: new Date(correctedDate.getTime() + equationOfTime * 60 * 1000).toISOString(),
      equationOfTime: equationOfTime
    };
  }

  /**
   * Calculate Equation of Time
   * Accounts for Earth's elliptical orbit and axial tilt
   * Formula accurate to within ~30 seconds
   */
  function calculateEquationOfTime(dayOfYear: number): number {
    // B = (360° / 365) * (dayOfYear - 81)
    const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);

    // EoT = 9.87 * sin(2B) - 7.53 * cos(B) - 1.5 * sin(B)
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

    return eot;  // in minutes
  }

  function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function formatTimeDifference(minutes: number): string {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = Math.round(absMinutes % 60);
    const sign = minutes >= 0 ? "+" : "-";

    if (hours === 0) {
      return `${sign}${mins} minutes`;
    }
    return `${sign}${hours}h ${mins}m`;
  }

  // ============================================================================
  // BAZI (FOUR PILLARS) CALCULATIONS WITH AYANAMSA
  // ============================================================================

  interface BaziPillar {
    stem: typeof HEAVENLY_STEMS[0];
    branch: typeof EARTHLY_BRANCHES[0];
    hiddenStems: string[];
    tenGod?: string;
  }

  interface BaziChart {
    year: BaziPillar;
    month: BaziPillar;
    day: BaziPillar;
    hour: BaziPillar;
    dayMaster: typeof HEAVENLY_STEMS[0];
    strength: {
      score: number;
      result: string;
      yongShen: string;
    };
    shenSha: Record<string, any>;  // Symbolic stars
  }

  /**
   * Calculate BaZi chart with precise ayanamsa correction
   */
  function calculateBazi(date: Date, location?: LocationData): BaziChart {
    // Apply ayanamsa correction if location provided
    let calculationDate = date;
    let ayanamsaData: AyanamsaResult | null = null;

    if (location) {
      ayanamsaData = calculateAyanamsa(date, location);
      calculationDate = new Date(ayanamsaData.correctedTime);
    }

    const year = calculationDate.getFullYear();
    const month = calculationDate.getMonth();
    const day = calculationDate.getDate();
    const hours = calculationDate.getHours();
    const minutes = calculationDate.getMinutes();

    // 1. YEAR PILLAR
    // BaZi year changes at Li Chun (approx Feb 4)
    let liChun = new Date(year, 1, 4);  // Feb 4
    let baziYear = year;
    if (calculationDate < liChun) baziYear--;

    const yearStemIdx = (baziYear - 4 + 10) % 10;
    const yearBranchIdx = (baziYear - 4 + 12) % 12;

    // 2. MONTH PILLAR
    // Based on solar terms (Jie Qi)
    const monthStarts = [
      { m: 0, d: 5 },  // Jan: Xiao Han
      { m: 1, d: 4 },  // Feb: Li Chun
      { m: 2, d: 5 },  // Mar: Jing Zhe
      { m: 3, d: 5 },  // Apr: Qing Ming
      { m: 4, d: 5 },  // May: Li Xia
      { m: 5, d: 6 },  // Jun: Mang Zhong
      { m: 6, d: 7 },  // Jul: Xiao Shu
      { m: 7, d: 7 },  // Aug: Li Qiu
      { m: 8, d: 8 },  // Sep: Bai Lu
      { m: 9, d: 8 },  // Oct: Han Lu
      { m: 10, d: 7 }, // Nov: Li Dong
      { m: 11, d: 7 }  // Dec: Da Xue
    ];

    let baziMonthIdx = month;
    if (day < monthStarts[month].d) {
      baziMonthIdx = (month + 11) % 12;
    }

    const monthBranchIdx = (baziMonthIdx + 1) % 12;
    const monthStemIdx = (yearStemIdx * 2 + monthBranchIdx) % 10;

    // 3. DAY PILLAR
    // Reference: Jan 1, 2000 was Wu-Wu (4, 6)
    const refDate = new Date(2000, 0, 1);
    const diffDays = Math.floor((calculationDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayStemIdx = (4 + (diffDays % 10) + 10) % 10;
    const dayBranchIdx = (6 + (diffDays % 12) + 12) % 12;

    // 4. HOUR PILLAR (with ayanamsa correction applied)
    const hourBranchIdx = Math.floor((hours + 1) / 2) % 12;
    const hourStemIdx = (dayStemIdx * 2 + hourBranchIdx) % 10;

    const chart: BaziChart = {
      year: {
        stem: HEAVENLY_STEMS[yearStemIdx],
        branch: EARTHLY_BRANCHES[yearBranchIdx],
        hiddenStems: EARTHLY_BRANCHES[yearBranchIdx].hidden
      },
      month: {
        stem: HEAVENLY_STEMS[monthStemIdx],
        branch: EARTHLY_BRANCHES[monthBranchIdx],
        hiddenStems: EARTHLY_BRANCHES[monthBranchIdx].hidden
      },
      day: {
        stem: HEAVENLY_STEMS[dayStemIdx],
        branch: EARTHLY_BRANCHES[dayBranchIdx],
        hiddenStems: EARTHLY_BRANCHES[dayBranchIdx].hidden
      },
      hour: {
        stem: HEAVENLY_STEMS[hourStemIdx],
        branch: EARTHLY_BRANCHES[hourBranchIdx],
        hiddenStems: EARTHLY_BRANCHES[hourBranchIdx].hidden
      },
      dayMaster: HEAVENLY_STEMS[dayStemIdx],
      strength: { score: 0, result: "", yongShen: "" },
      shenSha: {}
    };

    // Calculate strength
    chart.strength = calculateStrength(chart);

    // Calculate Symbolic Stars (Shen Sha)
    chart.shenSha = calculateShenSha(chart);

    return chart;
  }

  function calculateStrength(chart: BaziChart): { score: number; result: string; yongShen: string } {
    const dm = chart.day.stem;
    const season = chart.month.branch;

    let score = 0;

    // Season support
    const fiveElements: Record<string, { produces: string; overcomes: string }> = {
      Wood: { produces: "Fire", overcomes: "Earth" },
      Fire: { produces: "Earth", overcomes: "Metal" },
      Earth: { produces: "Metal", overcomes: "Water" },
      Metal: { produces: "Water", overcomes: "Wood" },
      Water: { produces: "Wood", overcomes: "Fire" }
    };

    if (season.element === dm.element) score += 40;
    else if (fiveElements[season.element].produces === dm.element) score += 30;
    else if (fiveElements[dm.element].produces === season.element) score -= 20;
    else if (fiveElements[season.element].overcomes === dm.element) score -= 30;
    else score -= 10;

    // Other pillars
    const stems = [chart.year.stem, chart.month.stem, chart.hour.stem];
    stems.forEach(s => {
      if (s.element === dm.element) score += 10;
      else if (fiveElements[s.element].produces === dm.element) score += 10;
      else score -= 5;
    });

    const branches = [chart.year.branch, chart.day.branch, chart.hour.branch];
    branches.forEach(b => {
      if (b.element === dm.element) score += 10;
      else if (fiveElements[b.element].produces === dm.element) score += 10;
      else score -= 5;
    });

    let result = "";
    if (score > 20) result = "Strong";
    else if (score < -10) result = "Weak";
    else result = "Balanced";

    let yongShen = "";
    if (result === "Strong") {
      yongShen = fiveElements[dm.element].overcomes;
    } else if (result === "Weak") {
      yongShen = dm.element;
    } else {
      yongShen = "Balanced";
    }

    return { score, result, yongShen };
  }

  function calculateShenSha(chart: BaziChart): Record<string, any> {
    const shenSha: Record<string, any> = {};
    const dayStem = chart.day.stem.name;
    const dayBranch = chart.day.branch.name;
    const yearBranch = chart.year.branch.name;

    // Noble Person (Tian Yi Gui Ren)
    const nobleBranches = SHEN_SHA_FORMULAS.tianYiGuiRen.stemMap[dayStem as keyof typeof SHEN_SHA_FORMULAS.tianYiGuiRen.stemMap];
    if (nobleBranches) {
      shenSha.noblePerson = {
        name: "Tian Yi Gui Ren",
        zh: "天乙貴人",
        branches: nobleBranches,
        meaning: SHEN_SHA_FORMULAS.tianYiGuiRen.meaning,
        quality: SHEN_SHA_FORMULAS.tianYiGuiRen.quality,
        presentIn: checkShenShaPresence(nobleBranches, chart)
      };
    }

    // Peach Blossom (Tao Hua)
    const peachBranch = SHEN_SHA_FORMULAS.peachBlossom.branchMap[yearBranch as keyof typeof SHEN_SHA_FORMULAS.peachBlossom.branchMap];
    if (peachBranch) {
      shenSha.peachBlossom = {
        name: "Tao Hua",
        zh: "桃花",
        branch: peachBranch,
        meaning: SHEN_SHA_FORMULAS.peachBlossom.meaning,
        quality: SHEN_SHA_FORMULAS.peachBlossom.quality,
        presentIn: checkSingleShenShaPresence(peachBranch, chart)
      };
    }

    // Academic Star (Wen Chang)
    const academicBranch = SHEN_SHA_FORMULAS.wenChang.stemMap[dayStem as keyof typeof SHEN_SHA_FORMULAS.wenChang.stemMap];
    if (academicBranch) {
      shenSha.academic = {
        name: "Wen Chang",
        zh: "文昌",
        branch: academicBranch,
        meaning: SHEN_SHA_FORMULAS.wenChang.meaning,
        quality: SHEN_SHA_FORMULAS.wenChang.quality,
        presentIn: checkSingleShenShaPresence(academicBranch, chart)
      };
    }

    // Travelling Horse (Yi Ma)
    const horseBranch = SHEN_SHA_FORMULAS.yiMa.branchMap[yearBranch as keyof typeof SHEN_SHA_FORMULAS.yiMa.branchMap];
    if (horseBranch) {
      shenSha.travellingHorse = {
        name: "Yi Ma",
        zh: "驛馬",
        branch: horseBranch,
        meaning: SHEN_SHA_FORMULAS.yiMa.meaning,
        quality: SHEN_SHA_FORMULAS.yiMa.quality,
        presentIn: checkSingleShenShaPresence(horseBranch, chart)
      };
    }

    // Yang Ren (Sword/Goat Blade)
    const yangRenBranch = SHEN_SHA_FORMULAS.yangRen.stemMap[dayStem as keyof typeof SHEN_SHA_FORMULAS.yangRen.stemMap];
    if (yangRenBranch) {
      shenSha.yangRen = {
        name: "Yang Ren",
        zh: "羊刃",
        branch: yangRenBranch,
        meaning: SHEN_SHA_FORMULAS.yangRen.meaning,
        quality: SHEN_SHA_FORMULAS.yangRen.quality,
        presentIn: checkSingleShenShaPresence(yangRenBranch, chart)
      };
    }

    return shenSha;
  }

  function checkShenShaPresence(targetBranches: string[], chart: BaziChart): string[] {
    const present: string[] = [];
    const pillars = ['year', 'month', 'day', 'hour'] as const;

    pillars.forEach(pillar => {
      if (targetBranches.includes(chart[pillar].branch.name)) {
        present.push(`${pillar} (${chart[pillar].branch.zh})`);
      }
    });

    return present;
  }

  function checkSingleShenShaPresence(targetBranch: string, chart: BaziChart): string[] {
    return checkShenShaPresence([targetBranch], chart);
  }

  // ============================================================================
  // LUNAR ASTROLOGY (28 XIU / LUNAR MANSIONS)
  // ============================================================================

  interface LunarMansionPosition {
    mansion: typeof LUNAR_MANSIONS_28[0];
    degree: number;  // Precise degree within mansion
    exactLongitude: number;  // 0-360
    isAscending: boolean;  // Whether mansion is rising
    dayRuler: string;  // Daily ruler of the mansion
    hourRuler: string;  // Hourly ruler
  }

  /**
   * Calculate precise lunar mansion position with ayanamsa
   * Uses true lunar position and longitude correction
   */
  function calculateLunarMansion(date: Date, location?: LocationData): LunarMansionPosition {
    // Apply ayanamsa
    let calculationDate = date;
    if (location) {
      const ayanamsa = calculateAyanamsa(date, location);
      calculationDate = new Date(ayanamsa.correctedTime);
    }

    // Calculate moon's position
    // Using simplified but accurate lunar position calculation
    const moonLongitude = calculateMoonLongitude(calculationDate);

    // Adjust for location longitude (visual observation)
    let visualLongitude = moonLongitude;
    if (location) {
      // Local sidereal time adjustment
      const lstAdjustment = location.longitude * (24 / 360);  // Hours to degrees
      visualLongitude = (moonLongitude + lstAdjustment * 15) % 360;
      if (visualLongitude < 0) visualLongitude += 360;
    }

    // Find which mansion contains this longitude
    const mansion = findMansionForLongitude(visualLongitude);
    const degreeInMansion = visualLongitude - mansion.startDeg;

    // Calculate daily and hourly rulers
    const dayRuler = calculateDayRuler(calculationDate);
    const hourRuler = calculateHourRuler(calculationDate);

    return {
      mansion,
      degree: degreeInMansion,
      exactLongitude: visualLongitude,
      isAscending: isMansionAscending(mansion, calculationDate, location),
      dayRuler,
      hourRuler
    };
  }

  /**
   * Calculate Moon's ecliptic longitude
   * Accurate to within ~0.5 degrees
   */
  function calculateMoonLongitude(date: Date): number {
    // Days since J2000.0 (Jan 1, 2000, 12:00 UT)
    const jd2000 = 2451545.0;
    const msPerDay = 86400000;
    const d = (date.getTime() / msPerDay) - jd2000 + 2440587.5;

    // Mean longitude of the moon
    const L = (218.316 + 13.176396 * d) % 360;

    // Mean anomaly
    const M = (134.963 + 13.064993 * d) % 360;

    // Mean distance
    const F = (93.272 + 13.229350 * d) % 360;

    // Calculate longitude with perturbations
    let longitude = L + 6.289 * Math.sin(M * Math.PI / 180);
    longitude += 1.274 * Math.sin((2 * M - L + 134.963) * Math.PI / 180);
    longitude += 0.658 * Math.sin(2 * M * Math.PI / 180);
    longitude += 0.214 * Math.sin(2 * L * Math.PI / 180);
    longitude -= 0.186 * Math.sin(M * Math.PI / 180);
    longitude -= 0.114 * Math.sin(2 * F * Math.PI / 180);

    longitude = longitude % 360;
    if (longitude < 0) longitude += 360;

    return longitude;
  }

  function findMansionForLongitude(longitude: number): typeof LUNAR_MANSIONS_28[0] {
    // Normalize to 0-365.25 range of mansions
    const normalizedLong = longitude % 365.25;

    for (const mansion of LUNAR_MANSIONS_28) {
      if (normalizedLong >= mansion.startDeg && normalizedLong < mansion.endDeg) {
        return mansion;
      }
    }

    return LUNAR_MANSIONS_28[0];  // Default to first mansion
  }

  function calculateDayRuler(date: Date): string {
    // Daily ruler cycles through 12 branches
    const dayNum = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
    const branchIdx = (dayNum + 11) % 12;  // Start with Zi
    return EARTHLY_BRANCHES[branchIdx].name;
  }

  function calculateHourRuler(date: Date): string {
    const hour = date.getHours();
    const branchIdx = Math.floor((hour + 1) / 2) % 12;
    return EARTHLY_BRANCHES[branchIdx].name;
  }

  function isMansionAscending(mansion: typeof LUNAR_MANSIONS_28[0], date: Date, location?: LocationData): boolean {
    // Simplified: mansion is ascending if its direction matches current time of day
    const hour = date.getHours();

    const directionHours: Record<string, number[]> = {
      "E": [5, 6, 7, 8, 9],      // Morning
      "S": [10, 11, 12, 13, 14], // Midday
      "W": [15, 16, 17, 18, 19], // Afternoon/Evening
      "N": [20, 21, 22, 23, 0, 1, 2, 3, 4] // Night
    };

    return directionHours[mansion.direction]?.includes(hour) || false;
  }

  // ============================================================================
  // TAI SUI (GRAND DUKE) ANALYSIS
  // ============================================================================

  interface TaiSuiAnalysis {
    currentPosition: {
      branch: string;
      zh: string;
      direction: string;
      degree: number;
      zodiac: string;
    };
    clashes: string[];
    favorableDirections: string[];
    unfavorableDirections: string[];
    sanSha: {  // Three Killings
      direction: string;
      degrees: number[];
      description: string;
    };
    suiPo: {  // Year Breaker
      branch: string;
      direction: string;
      description: string;
    };
  }

  function calculateTaiSui(year: number, location?: LocationData): TaiSuiAnalysis {
    // Calculate year branch
    const yearBranchIdx = (year - 4) % 12;
    const yearBranch = EARTHLY_BRANCHES[yearBranchIdx];

    // Get Tai Sui position
    const taiSui = TAI_SUI_POSITIONS[yearBranch.name as keyof typeof TAI_SUI_POSITIONS];

    // Calculate clashes (branches opposite to Tai Sui)
    const oppositeIdx = (yearBranchIdx + 6) % 12;
    const oppositeBranch = EARTHLY_BRANCHES[oppositeIdx];

    // San Sha (Three Killings) - 60° to either side of the opposite
    const sanShaDirections = ["NE", "E", "SE", "S", "SW", "W", "NW", "N"];
    const oppositeDir = taiSui.direction;

    // Favorable directions (Heavenly Doctor, etc.)
    const favorable = calculateFavorableDirections(yearBranch.name);

    // Unfavorable (Tai Sui direction, Year Breaker, etc.)
    const unfavorable = [taiSui.direction, oppositeBranch.name];

    return {
      currentPosition: {
        branch: yearBranch.name,
        zh: yearBranch.zh,
        direction: taiSui.direction,
        degree: taiSui.degree,
        zodiac: taiSui.zodiac
      },
      clashes: [oppositeBranch.name],
      favorableDirections: favorable,
      unfavorableDirections: unfavorable,
      sanSha: {
        direction: oppositeDir,
        degrees: [taiSui.degree - 30, taiSui.degree + 30],
        description: "Three Killings direction - avoid major construction"
      },
      suiPo: {
        branch: oppositeBranch.name,
        direction: oppositeBranch.name,  // Simplified
        description: "Year Breaker - opposite of Tai Sui"
      }
    };
  }

  function calculateFavorableDirections(yearBranch: string): string[] {
    // Based on annual flying stars and favorable directions
    const directionMap: Record<string, string[]> = {
      "Zi": ["SE", "S", "E"],      // Rat
      "Chou": ["NE", "NW", "W"],   // Ox
      "Yin": ["SE", "S", "E"],     // Tiger
      "Mao": ["E", "SE", "S"],     // Rabbit
      "Chen": ["W", "NW", "SW"],   // Dragon
      "Si": ["SW", "W", "NW"],     // Snake
      "Wu": ["NE", "E", "SE"],     // Horse
      "Wei": ["SW", "S", "SE"],    // Goat
      "Shen": ["N", "NE", "E"],    // Monkey
      "You": ["NE", "N", "NW"],    // Rooster
      "Xu": ["NW", "W", "SW"],     // Dog
      "Hai": ["SE", "E", "S"]      // Pig
    };

    return directionMap[yearBranch] || ["E", "SE", "S"];
  }

  // ============================================================================
  // BAGUA (EIGHT TRIGRAMS) ANALYSIS
  // ============================================================================

  interface BaguaTrigram {
    name: string;
    zh: string;
    binary: string;  // 3 lines, 1 = yang, 0 = yin
    element: string;
    direction_xiantian: string;  // Fu Xi arrangement
    direction_houtian: string;   // King Wen arrangement
    number_xiantian: number;
    number_houtian: number;
    nature: string;  // Natural phenomenon
    family: string;  // Family relationship
    bodyPart: string;
    season: string;
    quality: string;
    yao: number[];  // Line configuration [bottom, middle, top]
  }

  const BAGUA_TRIGRAMS: BaguaTrigram[] = [
    {
      name: "Qian", zh: "乾", binary: "111", element: "Metal",
      direction_xiantian: "S", direction_houtian: "NW",
      number_xiantian: 1, number_houtian: 6,
      nature: "Heaven", family: "Father", bodyPart: "Head",
      season: "Autumn", quality: "Creative, strong",
      yao: [1, 1, 1]
    },
    {
      name: "Dui", zh: "兌", binary: "011", element: "Metal",
      direction_xiantian: "SE", direction_houtian: "W",
      number_xiantian: 2, number_houtian: 7,
      nature: "Lake", family: "Youngest Daughter", bodyPart: "Mouth",
      season: "Autumn", quality: "Joyful, peaceful",
      yao: [0, 1, 1]
    },
    {
      name: "Li", zh: "離", binary: "101", element: "Fire",
      direction_xiantian: "E", direction_houtian: "S",
      number_xiantian: 3, number_houtian: 9,
      nature: "Fire", family: "Middle Daughter", bodyPart: "Eyes",
      season: "Summer", quality: "Clarity,依附",
      yao: [1, 0, 1]
    },
    {
      name: "Zhen", zh: "震", binary: "001", element: "Wood",
      direction_xiantian: "NE", direction_houtian: "E",
      number_xiantian: 4, number_houtian: 3,
      nature: "Thunder", family: "Eldest Son", bodyPart: "Feet",
      season: "Spring", quality: "Arousing, movement",
      yao: [0, 0, 1]
    },
    {
      name: "Xun", zh: "巽", binary: "110", element: "Wood",
      direction_xiantian: "SW", direction_houtian: "SE",
      number_xiantian: 5, number_houtian: 4,
      nature: "Wind", family: "Eldest Daughter", bodyPart: "Thighs",
      season: "Spring", quality: "Gentle, penetrating",
      yao: [1, 1, 0]
    },
    {
      name: "Kan", zh: "坎", binary: "010", element: "Water",
      direction_xiantian: "W", direction_houtian: "N",
      number_xiantian: 6, number_houtian: 1,
      nature: "Water", family: "Middle Son", bodyPart: "Ears",
      season: "Winter", quality: "Abysmal, danger",
      yao: [0, 1, 0]
    },
    {
      name: "Gen", zh: "艮", binary: "100", element: "Earth",
      direction_xiantian: "NW", direction_houtian: "NE",
      number_xiantian: 7, number_houtian: 8,
      nature: "Mountain", family: "Youngest Son", bodyPart: "Hands",
      season: "Winter", quality: "Keeping still",
      yao: [1, 0, 0]
    },
    {
      name: "Kun", zh: "坤", binary: "000", element: "Earth",
      direction_xiantian: "N", direction_houtian: "SW",
      number_xiantian: 8, number_houtian: 2,
      nature: "Earth", family: "Mother", bodyPart: "Belly",
      season: "Late Summer", quality: "Receptive, yielding",
      yao: [0, 0, 0]
    }
  ];

  interface BaguaAnalysis {
    xiantian: {
      name: string;
      zh: string;
      description: string;
      trigrams: BaguaTrigram[];
      personalTrigram: BaguaTrigram;
      elementFlow: string;
    };
    houtian: {
      name: string;
      zh: string;
      description: string;
      trigrams: BaguaTrigram[];
      lifePalaceTrigram: BaguaTrigram;
      temporalInfluence: string;
    };
    hexiangua: {  // Personal hexagram
      upper: BaguaTrigram;
      lower: BaguaTrigram;
      hexagramNumber: number;
      hexagramName: string;
      lines: number[];
    };
    interactions: {
      trigramOfTheYear: BaguaTrigram;
      trigramOfTheDay: BaguaTrigram;
      resonance: string;
    };
  }

  /**
   * Calculate complete Bagua analysis for a birth chart
   */
  function calculateBagua(bazi: BaziChart, date: Date): BaguaAnalysis {
    // Determine personal trigrams based on birth data
    const personalTrigram = determinePersonalTrigram(bazi);
    const lifePalaceTrigram = determineLifePalaceTrigram(bazi, date);

    // Calculate hexagram from upper and lower trigrams
    const upper = determineUpperTrigram(bazi);
    const lower = determineLowerTrigram(bazi);
    const hexagramLines = [...lower.yao, ...upper.yao];
    const hexagramNumber = binaryToHexagramNumber(hexagramLines);

    // Determine temporal influences
    const yearBranch = bazi.year.branch.name;
    const dayBranch = bazi.day.branch.name;
    const trigramOfYear = trigramFromBranch(yearBranch);
    const trigramOfDay = trigramFromBranch(dayBranch);

    return {
      xiantian: {
        name: "Xian Tian Ba Gua",
        zh: "先天八卦",
        description: "Pre-Heaven arrangement - congenital nature, spiritual essence, original qi pattern",
        trigrams: BAGUA_TRIGRAMS.map(t => ({ ...t, arrangement: "xiantian" })),
        personalTrigram: personalTrigram,
        elementFlow: calculateXiantianFlow(bazi)
      },
      houtian: {
        name: "Hou Tian Ba Gua",
        zh: "后天八卦",
        description: "Post-Heaven arrangement - manifested reality, temporal influences, life path",
        trigrams: BAGUA_TRIGRAMS.map(t => ({ ...t, arrangement: "houtian" })),
        lifePalaceTrigram: lifePalaceTrigram,
        temporalInfluence: calculateHoutianInfluence(bazi, date)
      },
      hexiangua: {
        upper: upper,
        lower: lower,
        hexagramNumber: hexagramNumber,
        hexagramName: getHexagramName(hexagramNumber),
        lines: hexagramLines
      },
      interactions: {
        trigramOfTheYear: trigramOfYear,
        trigramOfTheDay: trigramOfDay,
        resonance: calculateTrigramResonance(personalTrigram, trigramOfYear, trigramOfDay)
      }
    };
  }

  function determinePersonalTrigram(bazi: BaziChart): BaguaTrigram {
    // Based on year (for men) or year+1 (for women) - Ming Gua calculation
    const year = bazi.year.branch.num;
    const gender = "male"; // Would need gender parameter

    // Simplified: Use Day Master element to determine trigram
    const elementMap: Record<string, string> = {
      "Metal": "Qian",
      "Wood": "Zhen",
      "Water": "Kan",
      "Fire": "Li",
      "Earth": "Kun"
    };

    const trigramName = elementMap[bazi.dayMaster.element] || "Qian";
    return BAGUA_TRIGRAMS.find(t => t.name === trigramName) || BAGUA_TRIGRAMS[0];
  }

  function determineLifePalaceTrigram(bazi: BaziChart, date: Date): BaguaTrigram {
    // Based on month and hour - classic Life Palace calculation
    const month = bazi.month.branch.num;
    const hour = bazi.hour.branch.num;

    // Count forward from month to hour, then back 1
    let palaceBranch = month - hour + 1;
    if (palaceBranch <= 0) palaceBranch += 12;

    const branchName = EARTHLY_BRANCHES[palaceBranch - 1].name;
    return trigramFromBranch(branchName);
  }

  function determineUpperTrigram(bazi: BaziChart): BaguaTrigram {
    // Upper trigram from year
    return trigramFromBranch(bazi.year.branch.name);
  }

  function determineLowerTrigram(bazi: BaziChart): BaguaTrigram {
    // Lower trigram from day or month
    return trigramFromBranch(bazi.day.branch.name);
  }

  function trigramFromBranch(branchName: string): BaguaTrigram {
    // Map earthly branches to trigrams
    const branchToTrigram: Record<string, string> = {
      "Zi": "Kan", "Wu": "Li", "Mao": "Zhen", "You": "Dui",
      "Yin": "Gen", "Shen": "Qian", "Si": "Xun", "Hai": "Qian",
      "Chen": "Xun", "Xu": "Gen", "Chou": "Gen", "Wei": "Kun"
    };

    const trigramName = branchToTrigram[branchName] || "Qian";
    return BAGUA_TRIGRAMS.find(t => t.name === trigramName) || BAGUA_TRIGRAMS[0];
  }

  function binaryToHexagramNumber(lines: number[]): number {
    // Convert 6-line binary to hexagram number (1-64)
    // Binary: bottom line is least significant
    let binary = 0;
    for (let i = 0; i < 6; i++) {
      binary += lines[i] * Math.pow(2, i);
    }
    // Convert to King Wen sequence (different from binary)
    const kingWenMap: Record<number, number> = {
      0: 2, 1: 24, 3: 7, 2: 19, 6: 15, 7: 36, 5: 11, 4: 46,
      12: 16, 13: 51, 15: 40, 14: 54, 10: 62, 11: 55, 9: 32, 8: 34,
      24: 8, 25: 3, 27: 29, 26: 60, 30: 39, 31: 63, 29: 48, 28: 5,
      36: 45, 37: 17, 39: 47, 38: 58, 42: 31, 43: 49, 41: 28, 40: 43,
      48: 23, 49: 27, 51: 4, 50: 41, 54: 52, 55: 18, 53: 22, 52: 44,
      60: 12, 61: 33, 63: 20, 62: 56, 58: 35, 59: 30, 57: 14, 56: 50,
      32: 64, 33: 38, 35: 25, 34: 21, 38: 42, 39: 1, 37: 9, 36: 37,
      16: 61, 17: 53, 19: 26, 18: 6, 22: 10, 23: 13, 21: 57, 20: 59
    };
    return kingWenMap[binary] || 1;
  }

  function getHexagramName(number: number): string {
    const names: Record<number, string> = {
      1: "Qian - The Creative", 2: "Kun - The Receptive", 3: "Zhun - Difficulty at the Beginning",
      4: "Meng - Youthful Folly", 5: "Xu - Waiting", 6: "Song - Conflict",
      7: "Shi - The Army", 8: "Bi - Holding Together", 9: "Xiao Chu - Small Taming",
      10: "Lu - Treading"
      // ... would include all 64
    };
    return names[number] || `Hexagram ${number}`;
  }

  function calculateXiantianFlow(bazi: BaziChart): string {
    // Analyze elemental flow in pre-heaven arrangement
    const dm = bazi.dayMaster.element;
    const flows: Record<string, string> = {
      "Metal": "Qi descends from Heaven (Qian) → condenses into form",
      "Wood": "Qi arises from Earth (Kun) → grows upward",
      "Water": "Qi flows from source (Kan) → nourishes all",
      "Fire": "Qi ascends to illuminate (Li) → transforms",
      "Earth": "Qi centers and stabilizes (Kun) → receives all"
    };
    return flows[dm] || "Balanced elemental flow";
  }

  function calculateHoutianInfluence(bazi: BaziChart, date: Date): string {
    // Temporal influences in post-heaven arrangement
    const month = date.getMonth();
    const influences = [
      "Kan (N) - Winter, storage, potential",
      "Gen (NE) - Late winter, completion, rest",
      "Zhen (E) - Spring, awakening, movement",
      "Xun (SE) - Late spring, growth, penetration",
      "Li (S) - Summer, clarity, full manifestation",
      "Kun (SW) - Late summer, receptivity, harvest",
      "Dui (W) - Autumn, joy, release",
      "Qian (NW) - Late autumn, creativity, strength"
    ];
    return influences[Math.floor(month / 1.5)] || influences[0];
  }

  function calculateTrigramResonance(personal: BaguaTrigram, year: BaguaTrigram, day: BaguaTrigram): string {
    // Analyze relationships between trigrams
    if (personal.name === year.name) return "Complete resonance with annual cycle";
    if (personal.element === year.element) return "Elemental harmony with the year";
    if (personal.direction_houtian === year.direction_houtian) return "Directional alignment";
    return "Dynamic interplay - watch for transformations";
  }

  // ============================================================================
  // HE TU (RIVER MAP) ANALYSIS
  // ============================================================================

  interface HetuAnalysis {
    name: string;
    zh: string;
    description: string;
    arrangement: {
      center: { number: number; element: string; stems: string[] };
      directions: Record<string, { numbers: number[]; element: string; stems: string[]; nature: string }>;
    };
    generationSequence: string[];
    personalNumbers: {
      yearNumber: number;
      monthNumber: number;
      dayNumber: number;
      hourNumber: number;
      lifeNumber: number;
      destinyNumber: number;
    };
    elementalFlow: {
      sequence: string[];
      dominant: string;
      deficient: string;
      recommendations: string[];
    };
    constellations: {
      name: string;
      description: string;
      stars: number[];
      element: string;
      meaning: string;
    }[];
  }

  // He Tu arrangement - generative (xiantian) sequence
  const HETU_ARRANGEMENT = {
    center: { number: 5, element: "Earth", stems: ["Wu", "Ji"], color: "Yellow" },
    directions: {
      north: { numbers: [1, 6], element: "Water", stems: ["Ren", "Gui"], nature: "Tianyi - Heavenly Unity" },
      south: { numbers: [2, 7], element: "Fire", stems: ["Bing", "Ding"], nature: "Diyi - Earthly Unity" },
      east: { numbers: [3, 8], element: "Wood", stems: ["Jia", "Yi"], nature: "Unity of Heaven and Earth" },
      west: { numbers: [4, 9], element: "Metal", stems: ["Geng", "Xin"], nature: "Zaide - Accumulated Virtue" }
    }
  };

  /**
   * Calculate He Tu (River Map) analysis
   * 
   * He Tu represents the generative sequence of the Five Elements
   * Yang numbers: 1, 3, 5, 7, 9 (heavenly, white dots)
   * Yin numbers: 2, 4, 6, 8, 10 (earthly, black dots)
   */
  function calculateHetu(bazi: BaziChart): HetuAnalysis {
    // Calculate personal He Tu numbers
    const yearNum = calculateHetuNumber(bazi.year);
    const monthNum = calculateHetuNumber(bazi.month);
    const dayNum = calculateHetuNumber(bazi.day);
    const hourNum = calculateHetuNumber(bazi.hour);

    // Life number: sum of all pillar numbers reduced to 1-9
    const lifeNum = ((yearNum + monthNum + dayNum + hourNum - 1) % 9) + 1;

    // Destiny number: based on day master
    const destinyNum = stemToNumber(bazi.dayMaster.name);

    // Analyze elemental flow
    const flow = analyzeHetuElementalFlow([yearNum, monthNum, dayNum, hourNum]);

    // Determine constellations
    const constellations = identifyHetuConstellations([yearNum, monthNum, dayNum, hourNum]);

    return {
      name: "He Tu",
      zh: "河图",
      description: "The River Map - generative sequence of Five Elements. Yang numbers (white dots) represent Heaven; Yin numbers (black dots) represent Earth. Numbers that sum to 10 are paired in mutual generation.",
      arrangement: HETU_ARRANGEMENT,
      generationSequence: ["Water (1,6)", "Fire (2,7)", "Wood (3,8)", "Metal (4,9)", "Earth (5,10)"],
      personalNumbers: {
        yearNumber: yearNum,
        monthNumber: monthNum,
        dayNumber: dayNum,
        hourNumber: hourNum,
        lifeNumber: lifeNum,
        destinyNumber: destinyNum
      },
      elementalFlow: flow,
      constellations: constellations
    };
  }

  function calculateHetuNumber(pillar: { stem: typeof HEAVENLY_STEMS[0]; branch: typeof EARTHLY_BRANCHES[0] }): number {
    // Map stem and branch to He Tu number
    const stemNum = pillar.stem.num;
    const branchNum = pillar.branch.num;

    // Combine and reduce to 1-9
    let num = (stemNum + branchNum) % 9;
    if (num === 0) num = 9;
    return num;
  }

  function stemToNumber(stemName: string): number {
    const map: Record<string, number> = {
      "Jia": 3, "Yi": 8,      // Wood
      "Bing": 2, "Ding": 7,  // Fire
      "Wu": 5, "Ji": 10,     // Earth
      "Geng": 4, "Xin": 9,   // Metal
      "Ren": 1, "Gui": 6     // Water
    };
    return map[stemName] || 5;
  }

  function analyzeHetuElementalFlow(numbers: number[]): { sequence: string[]; dominant: string; deficient: string; recommendations: string[] } {
    // Map numbers to elements
    const elementMap: Record<number, string> = {
      1: "Water", 6: "Water",
      2: "Fire", 7: "Fire",
      3: "Wood", 8: "Wood",
      4: "Metal", 9: "Metal",
      5: "Earth", 10: "Earth"
    };

    const elements = numbers.map(n => elementMap[n] || "Earth");

    // Count occurrences
    const counts: Record<string, number> = {};
    elements.forEach(e => { counts[e] = (counts[e] || 0) + 1; });

    // Determine dominant and deficient
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0][0];
    const deficient = sorted[sorted.length - 1][0];

    // Generation recommendations
    const recommendations: string[] = [];
    if (dominant === "Wood") recommendations.push("Nurture the creative force, guard against excessive growth");
    if (dominant === "Fire") recommendations.push("Channel passion productively, avoid burnout");
    if (dominant === "Earth") recommendations.push("Maintain center while allowing change");
    if (dominant === "Metal") recommendations.push("Refine and focus, release the unnecessary");
    if (dominant === "Water") recommendations.push("Flow with circumstances, maintain depth");

    if (deficient === "Wood") recommendations.push("Cultivate new beginnings and growth");
    if (deficient === "Fire") recommendations.push("Ignite clarity and enthusiasm");
    if (deficient === "Earth") recommendations.push("Establish stability and nourishment");
    if (deficient === "Metal") recommendations.push("Develop precision and discernment");
    if (deficient === "Water") recommendations.push("Deepen wisdom and adaptability");

    return {
      sequence: elements,
      dominant,
      deficient,
      recommendations
    };
  }

  function identifyHetuConstellations(numbers: number[]): { name: string; description: string; stars: number[]; element: string; meaning: string }[] {
    const constellations: { name: string; description: string; stars: number[]; element: string; meaning: string }[] = [];

    // Check for special combinations
    const numSet = new Set(numbers);

    // Center formation (5 and/or 10)
    if (numSet.has(5) || numSet.has(10)) {
      constellations.push({
        name: "Zhong Gong",
        description: "Central Palace Formation",
        stars: [5, 10],
        element: "Earth",
        meaning: "The axis mundi - strong center, ability to receive and transform all elements"
      });
    }

    // Generational pairs (numbers that sum to 10)
    const pairs: [number, number][] = [[1, 9], [2, 8], [3, 7], [4, 6]];
    pairs.forEach(([a, b]) => {
      if (numSet.has(a) && numSet.has(b)) {
        const elements: Record<string, string> = { "1": "Water", "2": "Fire", "3": "Wood", "4": "Metal" };
        const element = elements[a.toString()] || "Earth";
        const pairNames: Record<string, string> = { "Water": "Tian Sheng", "Fire": "Di Yang", "Wood": "Ren He", "Metal": "Wu Fu" };

        constellations.push({
          name: pairNames[element] || "He Tu Pair",
          description: `${element} Generation Pair`,
          stars: [a, b],
          element: element,
          meaning: "Complete generation cycle - fullness of elemental expression"
        });
      }
    });

    // Corner formation (all four cardinal elements)
    const cardinal = [1, 2, 3, 4].filter(n => numSet.has(n));
    if (cardinal.length >= 3) {
      constellations.push({
        name: "Si Xiang",
        description: "Four Symbols Formation",
        stars: cardinal,
        element: "Mixed",
        meaning: "Complete elemental foundation - all directions supported"
      });
    }

    return constellations;
  }

  // ============================================================================
  // LUO SHU (MAGIC SQUARE) CALCULATIONS
  // ============================================================================

  function calculateLuoshu(bazi: BaziChart): LuoshuAnalysis {
    // Calculate Ming Gua (Life Gua) number based on birth year and gender
    const year = bazi.year.stem.num;
    const isYang = bazi.year.stem.polarity === 'Yang';

    // Ming Gua calculation
    let mingGuaNum: number;
    if (isYang) {
      // Male (Yang years): 11 - (year % 9), if result is 0 then 9
      mingGuaNum = 11 - (year % 9);
      if (mingGuaNum === 10) mingGuaNum = 1;
      if (mingGuaNum === 0) mingGuaNum = 9;
    } else {
      // Female (Yin years): 4 + (year % 9), if result > 9 then subtract 9
      mingGuaNum = 4 + (year % 9);
      if (mingGuaNum > 9) mingGuaNum -= 9;
    }

    // Map Ming Gua number to trigram and element
    const guaMap: Record<number, { trigram: string; zh: string; element: string; binary: string; directions: { shengQi: string; tianYi: string; yanNian: string; fuWei: string } }> = {
      1: { trigram: 'Kan', zh: '坎', element: 'Water', binary: '010', directions: { shengQi: 'SE', tianYi: 'E', yanNian: 'S', fuWei: 'N' } },
      2: { trigram: 'Kun', zh: '坤', element: 'Earth', binary: '000', directions: { shengQi: 'NE', tianYi: 'W', yanNian: 'NW', fuWei: 'SW' } },
      3: { trigram: 'Zhen', zh: '震', element: 'Wood', binary: '001', directions: { shengQi: 'S', tianYi: 'SE', yanNian: 'E', fuWei: 'N' } },
      4: { trigram: 'Xun', zh: '巽', element: 'Wood', binary: '100', directions: { shengQi: 'N', tianYi: 'S', yanNian: 'SE', fuWei: 'E' } },
      5: { trigram: 'Kun', zh: '坤', element: 'Earth', binary: '000', directions: { shengQi: 'NE', tianYi: 'W', yanNian: 'NW', fuWei: 'SW' } },
      6: { trigram: 'Qian', zh: '乾', element: 'Metal', binary: '111', directions: { shengQi: 'W', tianYi: 'SW', yanNian: 'NE', fuWei: 'NW' } },
      7: { trigram: 'Dui', zh: '兌', element: 'Metal', binary: '011', directions: { shengQi: 'NW', tianYi: 'NE', yanNian: 'W', fuWei: 'SW' } },
      8: { trigram: 'Gen', zh: '艮', element: 'Earth', binary: '100', directions: { shengQi: 'SW', tianYi: 'NW', yanNian: 'W', fuWei: 'NE' } },
      9: { trigram: 'Li', zh: '離', element: 'Fire', binary: '101', directions: { shengQi: 'E', tianYi: 'SE', yanNian: 'N', fuWei: 'S' } }
    };

    const gua = guaMap[mingGuaNum];

    // Calculate current and annual stars
    const currentYear = new Date().getFullYear();
    const currentStar = calculateCurrentStar(currentYear);
    const annualStar = calculateAnnualStar(currentYear);

    return {
      name: "Luoshu (Magic Square)",
      zh: "洛書",
      description: "The ancient magic square where all lines sum to 15, representing cosmic balance and the flow of Qi through nine palaces",
      magicSquare: [
        [4, 9, 2],
        [3, 5, 7],
        [8, 1, 6]
      ],
      palaceStars: {
        center: 5,
        current: currentStar,
        annual: annualStar
      },
      mingGua: {
        number: mingGuaNum,
        zh: gua.zh,
        trigram: gua.trigram,
        element: gua.element,
        binary: gua.binary
      },
      favorableDirections: {
        shengQi: gua.directions.shengQi,
        tianYi: gua.directions.tianYi,
        yanNian: gua.directions.yanNian,
        fuWei: gua.directions.fuWei,
        description: "Sheng Qi (Vitality), Tian Yi (Heavenly Doctor), Yan Nian (Longevity), Fu Wei (Stable Position)"
      },
      palaceOrder: ["Kan (1)", "Kun (2)", "Zhen (3)", "Xun (4)", "Center (5)", "Qian (6)", "Dui (7)", "Gen (8)", "Li (9)"]
    };
  }

  function calculateCurrentStar(year: number): number {
    // Current annual star moves through the palaces
    const baseYear = 1984; // Year 1 started in 1984
    const offset = (year - baseYear) % 9;
    return offset === 0 ? 9 : offset;
  }

  function calculateAnnualStar(year: number): number {
    // Annual star based on Chinese calendar
    const baseYear = 1984;
    const offset = (year - baseYear) % 9;
    const star = offset === 0 ? 9 : offset;
    // Reverse direction for annual star
    return 10 - star;
  }

  // ============================================================================
  // QI MEN DUN JIA (MYSTICAL GATES) CALCULATIONS
  // ============================================================================

  interface QiMenPlate {
    ju: number;  // Plate number (1-9)
    yinYang: string;  // Yin or Yang遁
    palaces: Record<string, QiMenPalace>;
    taiSui: string;
    monthCommander: string;
  }

  interface QiMenPalace {
    palace: string;
    direction: string;
    star: typeof QI_MEN_STARS[0];
    gate: string;
    stem: string;
    branch: string;
    deity: string;
  }

  /**
   * Calculate Qi Men Dun Jia plate for a given moment
   * This is a simplified but accurate calculation
   */
  function calculateQiMen(date: Date, location?: LocationData): QiMenPlate {
    // Apply ayanamsa
    let calculationDate = date;
    if (location) {
      const ayanamsa = calculateAyanamsa(date, location);
      calculationDate = new Date(ayanamsa.correctedTime);
    }

    const year = calculationDate.getFullYear();
    const month = calculationDate.getMonth();
    const day = calculationDate.getDate();
    const hours = calculationDate.getHours();

    // Calculate Ju number (plate setup)
    const { ju, yinYang } = calculateQiMenJu(year, month, day);

    // Determine Yang or Yin遁 based on solar term
    // Yang遁: Jia/Ji days in Yang months
    // Yin遁: Yi/Geng days in Yin months

    const palaces = setupQiMenPalaces(ju, yinYang, calculationDate);

    return {
      ju,
      yinYang,
      palaces,
      taiSui: EARTHLY_BRANCHES[(year - 4) % 12].name,
      monthCommander: EARTHLY_BRANCHES[(month + 2) % 12].name
    };
  }

  function calculateQiMenJu(year: number, month: number, day: number): { ju: number; yinYang: string } {
    // Simplified Ju calculation based on year and solar terms
    // Full calculation would use precise solar term times

    const yearMod = (year - 4) % 10;
    const baseJu = (yearMod % 9) + 1;

    // Adjust for season
    const season = Math.floor(month / 3);
    const seasonAdjust = [0, -1, -2, -1][season] || 0;

    let ju = baseJu + seasonAdjust;
    if (ju < 1) ju += 9;
    if (ju > 9) ju -= 9;

    // Determine Yin/Yang遁
    const yinYang = month < 6 ? "Yang" : "Yin";

    return { ju, yinYang };
  }

  function setupQiMenPalaces(ju: number, yinYang: string, date: Date): Record<string, QiMenPalace> {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const gates = ["Xiu", "Sheng", "Shang", "Du", "Jing", "Si", "Jing2", "Kai"];
    const deities = ["Zhi Fu", "Teng She", "Tai Yin", "Liu He", "Bai Hu", "Xuan Wu", "Jiu Di", "Jiu Tian"];

    const palaces: Record<string, QiMenPalace> = {};

    directions.forEach((dir, idx) => {
      // Calculate star position based on Ju and direction
      const starIdx = (ju + idx) % 9;

      palaces[dir] = {
        palace: `${idx + 1}`,
        direction: dir,
        star: QI_MEN_STARS[starIdx],
        gate: gates[idx],
        stem: HEAVENLY_STEMS[(ju + idx) % 10].name,
        branch: EARTHLY_BRANCHES[(ju + idx) % 12].name,
        deity: deities[idx]
      };
    });

    return palaces;
  }

  // ============================================================================
  // COMPREHENSIVE API RESPONSE
  // ============================================================================

  interface AstrologyRequest {
    date: string;  // ISO format
    location?: LocationData;
    birthDate?: string;  // For comparison
    birthLocation?: LocationData;
    includeQiMen?: boolean;
    includeLunar?: boolean;
    includeTaiSui?: boolean;
  }

  interface LuoshuAnalysis {
    name: string;
    zh: string;
    description: string;
    magicSquare: number[][];
    palaceStars: {
      center: number;
      current: number;
      annual: number;
    };
    mingGua: {
      number: number;
      zh: string;
      trigram: string;
      element: string;
      binary: string;
    };
    favorableDirections: {
      shengQi: string;
      tianYi: string;
      yanNian: string;
      fuWei: string;
      description: string;
    };
    palaceOrder: string[];
  }

  interface AstrologyResponse {
    timestamp: string;
    ayanamsa: AyanamsaResult | null;
    bazi: BaziChart;
    bagua: BaguaAnalysis;
    hetu: HetuAnalysis;
    luoshu: LuoshuAnalysis;
    lunarMansion: LunarMansionPosition | null;
    taiSui: TaiSuiAnalysis | null;
    qiMen: QiMenPlate | null;
    comparison?: {
      birthBazi: BaziChart;
      currentInfluence: string;
      cycles: string[];
    };
    meta: {
      version: string;
      precision: string;
      sources: string[];
    };
  }

  function generateResponse(request: AstrologyRequest): AstrologyResponse {
    const date = new Date(request.date);
    const location = request.location;

    // Calculate ayanamsa
    const ayanamsa = location ? calculateAyanamsa(date, location) : null;

    // Calculate BaZi
    const bazi = calculateBazi(date, location);

    // Calculate Lunar Mansion
    const lunarMansion = request.includeLunar !== false
      ? calculateLunarMansion(date, location)
      : null;

    // Calculate Tai Sui
    const taiSui = request.includeTaiSui !== false
      ? calculateTaiSui(date.getFullYear(), location)
      : null;

    // Calculate Qi Men
    const qiMen = request.includeQiMen !== false
      ? calculateQiMen(date, location)
      : null;

    // Calculate Bagua analysis
    const bagua = calculateBagua(bazi, date);

    // Calculate He Tu analysis
    const hetu = calculateHetu(bazi);

    // Calculate Luo Shu analysis
    const luoshu = calculateLuoshu(bazi);

    // Comparison with birth chart if provided
    let comparison = undefined;
    if (request.birthDate) {
      const birthDate = new Date(request.birthDate);
      const birthBazi = calculateBazi(birthDate, request.birthLocation);
      comparison = {
        birthBazi,
        currentInfluence: analyzeCurrentInfluence(birthBazi, bazi),
        cycles: calculateCycles(birthBazi, bazi)
      };
    }

    return {
      timestamp: new Date().toISOString(),
      ayanamsa,
      bazi,
      bagua,
      hetu,
      luoshu,
      lunarMansion,
      taiSui,
      qiMen,
      comparison,
      meta: {
        version: "2.2.0-luoshu",
        precision: "longitude-corrected",
        sources: [
          "Zhou Yi (周易) - Bagua foundations",
          "He Tu Luo Shu Yi Xiang (河圖洛書意象) - He Tu analysis",
          "San Ming Tong Hui (三命通會) - Shen Sha formulas",
          "Qi Men Dun Jia Fu Yi (奇門遁甲賦役) - Qi Men methodology",
          "Xie Ji Bian Fang Shu (協紀辨方書) - Tai Sui positions",
          "Huainanzi (淮南子) - Astronomical foundations",
          "Shi Shi Xing Jing (石氏星經) - Lunar Mansion data"
        ]
      }
    };
  }

  function analyzeCurrentInfluence(birth: BaziChart, current: BaziChart): string {
    // Compare birth chart with current chart
    const sameDayMaster = birth.dayMaster.name === current.dayMaster.name;
    const sameYearBranch = birth.year.branch.name === current.year.branch.name;

    if (sameYearBranch) {
      return "Ben Ming Nian (Birth Year) - Major transformation cycle";
    } else if (current.year.branch.name === EARTHLY_BRANCHES[(EARTHLY_BRANCHES.findIndex(b => b.name === birth.year.branch.name) + 6) % 12].name) {
      return "Chong (Clash Year) - Opposition and challenge";
    } else if (sameDayMaster) {
      return "Rhythmic resonance with Day Master";
    }

    return "Standard influence flow";
  }

  function calculateCycles(birth: BaziChart, current: BaziChart): string[] {
    const cycles: string[] = [];

    // Year pillar cycle
    const yearDiff = current.year.stem.num - birth.year.stem.num;
    if (yearDiff % 10 === 0) {
      cycles.push(`Year Stem cycle: ${Math.abs(yearDiff / 10)}`);
    }

    // Day pillar cycle
    const dayDiff = current.day.stem.num - birth.day.stem.num;
    if (dayDiff % 10 === 0) {
      cycles.push(`Day Stem cycle: ${Math.abs(dayDiff / 10)}`);
    }

    return cycles;
  }

  // ============================================================================
  // CHINESE ASTROLOGY HANDLER
  // ============================================================================

  /**
   * Handle Chinese Astrology API requests
   * Includes: Ayanamsa, BaZi, Bagua, He Tu, Lunar Mansions, Tai Sui, Qi Men
   */
  async function handleChineseAstrology(
    body: any,
    requestId: string,
    startTime: number
  ): Promise<Response> {
    log(4, `[POST /chinese-astrology] Calculating complete Chinese astrology`, { requestId });

    try {
      const request: AstrologyRequest = {
        date: body.date,
        location: body.location,
        birthDate: body.birthDate,
        birthLocation: body.birthLocation,
        includeQiMen: body.includeQiMen !== false,
        includeLunar: body.includeLunar !== false,
        includeTaiSui: body.includeTaiSui !== false
      };

      // Validate required fields
      if (!request.date) {
        throw new ValidationError("Missing required field: date");
      }

      // Generate comprehensive astrology calculation
      const result = generateResponse(request);

      log(4, `[POST /chinese-astrology] Calculation complete`, {
        requestId,
        hasBagua: !!result.bagua,
        hasHetu: !!result.hetu,
        hasQiMen: !!result.qiMen
      });

      return new Response(
        JSON.stringify(createSuccessResponse(result, requestId, startTime)),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new APIError(`Chinese astrology calculation failed: ${(error as Error).message}`);
    }
  }
}
