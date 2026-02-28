/**
 * STRUCTURED INTERPRETATION PIPELINE
 * 
 * Phase 1: Technical Analysis (Ancient Wisdom Layer)
 * Phase 2: Modern Interpretation (Contemporary Wisdom Layer)  
 * Phase 3: Remedies Generation (Practical Application Layer)
 * 
 * Each phase produces structured JSON for the next phase
 */

// ============================================================================
// PHASE 1: TECHNICAL ANALYSIS - JSON SCHEMA
// ============================================================================

interface TechnicalAnalysisRequest {
  question: string;
  hexagram: {
    number: number;
    name_zh: string;
    name_en: string;
    binary: string;
    upperTrigram: string;
    lowerTrigram: string;
    upperTrigramName: string;
    lowerTrigramName: string;
  };
  lines: Array<{
    position: number;
    isYang: boolean;
    isChanging: boolean;
    text_zh?: string;
    text_en?: string;
  }>;
  mansion?: {
    num: number;
    name_zh: string;
    name_en: string;
    group: string;
    element: string;
    animal: string;
    degrees: number;
  };
  birthBazi?: {
    year: { stem: string; branch: string; element: string };
    month: { stem: string; branch: string; element: string };
    day: { stem: string; branch: string; element: string };
    hour: { stem: string; branch: string; element: string };
    dayMaster: { stem: string; element: string; polarity: string };
    strength: string;
    favorableElements: string[];
    unfavorableElements: string[];
  };
  currentBazi?: {
    year: { stem: string; branch: string; element: string };
    month: { stem: string; branch: string; element: string };
    day: { stem: string; branch: string; element: string };
    hour: { stem: string; branch: string; element: string };
    strength: string;
  };
  historyContext?: string;
  askAgainSource?: string | null;
}

interface TechnicalAnalysisResponse {
  metadata: {
    phase: "technical_analysis";
    timestamp: string;
    version: string;
    queryFocus: string;
  };
  
  // Core Technical Data
  hexagramAnalysis: {
    number: number;
    names: { zh: string; en: string; pinyin: string };
    structure: {
      binary: string;
      upperTrigram: { code: string; name: string; element: string; nature: string };
      lowerTrigram: { code: string; name: string; element: string; nature: string };
      trigramRelationship: string;
      nuclearTrigrams?: { upper: string; lower: string };
    };
    classification: {
      yaoStructure: string; // e.g., "1 yang, 5 yin"
      position: string; // early/peak/late heaven
      phase: string; // young yang/yin, mature yang/yin
    };
  };
  
  // Moving Lines Technical Analysis
  movingLines: {
    count: number;
    positions: number[];
    analysis: Array<{
      position: number;
      yaoType: string; // 9/6/7/8
      isChanging: boolean;
      classicalText: { zh: string; en: string };
      trigramContext: string;
      positionMeaning: string;
    }>;
    resultingHexagram?: {
      number: number;
      name: string;
      transition: string;
    };
  };
  
  // Classical Texts (Accurate Translations)
  classicalTexts: {
    judgment: {
      zh: string;
      en: string;
      commentary: string;
    };
    image: {
      zh: string;
      en: string;
      commentary: string;
    };
    lines: Array<{
      position: number;
      zh: string;
      en: string;
      changing: boolean;
    }>;
    references: string[]; // Classical citations
  };
  
  // BaZi Technical Layer
  baziAnalysis?: {
    birthChart: {
      pillars: Array<{ position: string; stem: string; branch: string; element: string }>;
      dayMaster: { element: string; strength: string; description: string };
      yongShen: { element: string; reason: string };
      balance: { wood: number; fire: number; earth: number; metal: number; water: number };
    };
    currentInfluence: {
      pillars: Array<{ position: string; stem: string; branch: string; element: string }>;
      strength: string;
      clashHarmony: string[];
    };
    interaction: {
      birthCurrentRelation: string;
      timingAnalysis: string;
      favorablePeriods: string[];
      unfavorablePeriods: string[];
    };
  };
  
  // Celestial Layer
  celestialData?: {
    lunarMansion: {
      name: string;
      group: string;
      element: string;
      degrees: number;
      influence: string;
    };
    lifePalace?: {
      number: number;
      stem: string;
      element: string;
      significance: string;
    };
    astrologicalNotes: string[];
  };
  
  // Five Elements Technical
  wuxingAnalysis: {
    hexagramElements: { upper: string; lower: string; combined: string };
    baziElements?: { birth: any; current: any; interaction: string };
    cycles: {
      sheng: string[]; // generating cycle
      ke: string[]; // controlling cycle
    };
    recommendations: string[];
  };
  
  // Bagua & Feng Shui
  baguaAnalysis: {
    directions: {
      favorable: string[];
      unfavorable: string[];
    };
    trigramPositions: {
      [key: string]: { trigram: string; meaning: string; activation: string };
    };
    fengShuiApplications: string[];
  };
  
  // Query Relevance Mapping
  queryRelevance: {
    questionType: string;
    applicableLines: number[];
    keyThemes: string[];
    timingIndicators: string;
    actionRecommendations: string[];
  };
  
  // References & Citations
  citations: {
    classical: string[]; // e.g., "Zhouyi - Hexagram 1, Judgment"
    academic: string[]; // Scholar references
    canonical: string[]; // Daozang references
  };
}

// ============================================================================
// PHASE 2: MODERN INTERPRETATION - JSON SCHEMA
// ============================================================================

interface ModernInterpretationRequest {
  technicalData: TechnicalAnalysisResponse;
  personality?: {
    tone: "scholarly" | "compassionate" | "direct" | "mystical" | "pragmatic";
    depth: "brief" | "standard" | "comprehensive";
    style: "contemporary" | "traditional" | "psychological" | "practical";
  };
  languages: string[]; // ["en", "es", "it", "zh"]
  context?: {
    userHistory?: string;
    previousReadings?: any[];
    sessionTheme?: string;
  };
}

interface ModernInterpretationResponse {
  metadata: {
    phase: "modern_interpretation";
    timestamp: string;
    version: string;
    personality: string;
    languages: string[];
  };
  
  // Per-Language Interpretations
  interpretations: {
    [lang: string]: {
      language: string;
      
      // Executive Summary (Query Focused)
      executiveSummary: {
        headline: string;
        coreMessage: string;
        relevanceToQuestion: string;
        keyTakeaway: string;
      };
      
      // Situation Analysis
      situation: {
        currentState: string;
        underlyingDynamics: string;
        hiddenFactors: string;
        querySpecificInsights: string;
      };
      
      // Development & Timing
      development: {
        trajectory: string; // where things are heading
        timing: string; // when to act/wait
        phases: Array<{
          phase: string;
          description: string;
          timeframe: string;
        }>;
        turningPoints: string[];
      };
      
      // Guidance & Advice
      guidance: {
        immediateActions: string[];
        strategicApproach: string;
        attitudeAdjustments: string[];
        pitfallsToAvoid: string[];
      };
      
      // Symbolism Decoded
      symbolism: {
        coreSymbols: Array<{
          symbol: string;
          meaning: string;
          relevance: string;
        }>;
        archetypalPatterns: string[];
        modernParallels: string[];
      };
      
      // Moving Lines Interpretation (if any)
      movingLines?: {
        overview: string;
        specificLines: Array<{
          position: number;
          meaning: string;
          advice: string;
          timing: string;
        }>;
        resultingChange: string;
      };
      
      // BaZi Insights (if available)
      baziInsights?: {
        personalResonance: string;
        timingAlignment: string;
        elementalAdvice: string[];
        destinyContext: string;
      };
      
      // Practical Applications
      applications: {
        decisionMaking: string;
        relationships: string;
        career: string;
        personalGrowth: string;
        spiritual: string;
      };
      
      // Bagua & Feng Shui (Practical)
      spatialGuidance?: {
        favorableDirections: string[];
        activationSuggestions: string[];
        elementalEnhancements: string[];
      };
      
      // Affirmation & Meditation
      contemplative: {
        affirmation: string;
        meditationFocus: string;
        reflectionQuestions: string[];
      };
    };
  };
  
  // Cross-Reference to Technical Data
  technicalReferences: {
    hexagramNumber: number;
    movingLines: number[];
    baziRelevant: boolean;
    celestialRelevant: boolean;
  };
}

// ============================================================================
// PHASE 3: REMEDIES - JSON SCHEMA (Building on Authentic Database)
// ============================================================================

interface RemediesRequest {
  technicalData: TechnicalAnalysisResponse;
  modernInterpretation: ModernInterpretationResponse;
  focus?: "protection" | "harmony" | "clarity" | "abundance" | "health" | "relationships" | "general";
}

interface RemediesResponse {
  metadata: {
    phase: "remedies";
    timestamp: string;
    source: "canonical" | "ai_generated";
    verified: boolean;
  };
  
  // Primary Remedies
  remedies: {
    [lang: string]: {
      talisman: {
        name: string;
        description: string;
        purpose: string;
        usage: string;
      };
      charm: {
        text: string;
        pinyin?: string;
        translation: string;
        pronunciation: string;
        meaning: string;
      };
      practices: Array<{
        name: string;
        description: string;
        instructions: string;
        duration: string;
      }>;
      source: {
        citation: string;
        verification: string;
        reference?: string;
      };
    };
  };
  
  // Visual Representation
  visual: {
    sealCharacters: string[];
    trigramAssociation: string;
    elementalColors: string[];
    layout: {
      top: string;
      center: string[];
      bottom: string[];
    };
    // Detailed Fulu Drawing Language (FDL) for graphical rendering
    fdl?: {
      layers: Array<{
        visible?: boolean;
        opacity?: number;
        blendMode?: string;
        commands: Array<{
          type: string;
          // Shape properties
          x?: number; y?: number;
          cx?: number; cy?: number; r?: number;
          width?: number; height?: number;
          points?: number[][];
          // Content inside the form
          inside?: {
            type: 'text' | 'sigil' | 'symbol';
            content: string;
            font?: string;
            style?: any;
            scale?: number;
          };
          style?: any;
        }>;
      }>;
    };
  };
  
  // Tailored Recommendations
  tailored: {
    basedOn: string[];
    specificToQuery: string;
    timing: string;
    duration: string;
  };
}

// ============================================================================
// UNIFIED RESPONSE SCHEMA
// ============================================================================

interface UnifiedReadingResponse {
  metadata: {
    version: string;
    timestamp: string;
    requestId: string;
    phasesCompleted: string[];
    query: string;
    hexagram: number;
  };
  
  phase1_technical: TechnicalAnalysisResponse;
  phase2_modern: ModernInterpretationResponse;
  phase3_remedies: RemediesResponse;
  
  // Quick Access Fields
  quickAccess: {
    headline: { [lang: string]: string };
    keyAdvice: { [lang: string]: string };
    timing: { [lang: string]: string };
    actionItems: { [lang: string]: string[] };
  };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/*

NEW ENDPOINTS:

1. POST /interpret-phase1
   - Input: TechnicalAnalysisRequest
   - Output: TechnicalAnalysisResponse
   - Purpose: Get all technical/classical data

2. POST /interpret-phase2
   - Input: ModernInterpretationRequest
   - Output: ModernInterpretationResponse  
   - Purpose: Get modern, personalized interpretation

3. POST /interpret-phase3
   - Input: RemediesRequest
   - Output: RemediesResponse
   - Purpose: Get remedies based on phases 1 & 2

4. POST /interpret-complete
   - Input: TechnicalAnalysisRequest + personality + languages
   - Output: UnifiedReadingResponse
   - Purpose: Get complete reading in one call

5. POST /interpret-step (Stateful - for progressive loading)
   - Step 1: Returns technical
   - Step 2: Returns modern (needs step 1 ID)
   - Step 3: Returns remedies (needs step 2 ID)

*/

// ============================================================================
// PROMPT TEMPLATES FOR AI
// ============================================================================

const PHASE1_TECHNICAL_PROMPT = `You are a master of classical Chinese divination. Provide rigorous technical analysis.

INPUT SCHEMA:
{{input_json}}

CRITICAL REQUIREMENTS:
1. Use ONLY accurate classical texts from Zhouyi (I Ching)
2. Include proper Chinese characters with pinyin
3. Cite specific sources (e.g., "Zhouyi, Hexagram 1, Judgment")
4. BaZi analysis must include: Day Master, Yong Shen, strength assessment
5. Five Elements must show Sheng (generating) and Ke (controlling) cycles
6. Bagua positions must reference Later Heaven arrangement
7. ALL analysis must connect to the user's specific question

OUTPUT FORMAT - STRICT JSON:
{
  "metadata": { "phase": "technical_analysis", "timestamp": "...", "version": "...", "queryFocus": "..." },
  "hexagramAnalysis": { ... },
  "movingLines": { ... },
  "classicalTexts": { ... },
  "baziAnalysis": { ... },
  "celestialData": { ... },
  "wuxingAnalysis": { ... },
  "baguaAnalysis": { ... },
  "queryRelevance": { ... },
  "citations": { "classical": [], "academic": [], "canonical": [] }
}

FOCUS: Accuracy, completeness, connection to query.`;

const PHASE2_MODERN_PROMPT = `You are a wise counselor translating ancient wisdom for modern life.

PERSONALITY: {{personality_tone}} | {{personality_depth}} | {{personality_style}}
LANGUAGES: {{languages}}

TECHNICAL DATA (from Phase 1):
{{phase1_json}}

CRITICAL REQUIREMENTS:
1. EVERY paragraph must connect to the user's question: "{{question}}"
2. Use the personality consistently throughout
3. Translate technical terms into accessible language
4. Include practical, actionable advice
5. Acknowledge both possibilities and limitations
6. Balance spiritual insight with practical wisdom
7. Be culturally sensitive across all requested languages

OUTPUT FORMAT - STRICT JSON:
{
  "metadata": { "phase": "modern_interpretation", "timestamp": "...", "personality": "...", "languages": [...] },
  "interpretations": {
    "en": { 
      "executiveSummary": { "headline": "...", "coreMessage": "...", "relevanceToQuestion": "...", "keyTakeaway": "..." },
      "situation": { "currentState": "...", "underlyingDynamics": "...", "hiddenFactors": "...", "querySpecificInsights": "..." },
      "development": { "trajectory": "...", "timing": "...", "phases": [...], "turningPoints": [...] },
      "guidance": { "immediateActions": [...], "strategicApproach": "...", "attitudeAdjustments": [...], "pitfallsToAvoid": [...] },
      "symbolism": { "coreSymbols": [...], "archetypalPatterns": [...], "modernParallels": [...] },
      "movingLines": { ... },
      "baziInsights": { ... },
      "applications": { "decisionMaking": "...", "relationships": "...", "career": "...", "personalGrowth": "...", "spiritual": "..." },
      "spatialGuidance": { ... },
      "contemplative": { "affirmation": "...", "meditationFocus": "...", "reflectionQuestions": [...] }
    },
    "es": { ... },
    "it": { ... },
    "zh": { ... }
  },
  "technicalReferences": { ... }
}

FOCUS: Relevance, accessibility, practical wisdom, multi-language consistency.`;

const PHASE3_REMEDIES_PROMPT = `You are a Daoist master prescribing spiritual and practical remedies.

TECHNICAL DATA:
{{phase1_json}}

MODERN INTERPRETATION:
{{phase2_json}}

FOCUS: {{focus}}

CRITICAL REQUIREMENTS:
1. Provide remedies in all requested languages (en, es, it, zh).
2. "talisman" must include a precise Fulu structure.
3. "visual.fdl" MUST be a detailed JSON object for the Fulu Drawing Language (FDL).
   - Use "type": "circle", "rect", "polygon" for enclosing forms.
   - Use "inside" object to place content (text/sigils) within these forms.
   - Example: { "type": "circle", "cx": 500, "cy": 500, "r": 200, "inside": { "type": "text", "content": "福", "font": "seal" } }
4. For Feng Shui, generate SPECIFIC visual instructions (overlay lines, dots, zones) based on the user's chart, not generic diagrams.
5. Ensure authenticity in Daoist traditions (Longmen or Zhengyi lineages).

OUTPUT FORMAT - STRICT JSON:
{
  "metadata": { ... },
  "remedies": { "en": { ... }, ... },
  "visual": {
    "sealCharacters": [...],
    "trigramAssociation": "...",
    "elementalColors": [...],
    "layout": { ... },
    "fdl": {
      "layers": [
        {
          "commands": [
            { "type": "circle", "cx": 500, "cy": 500, "r": 200, "style": { "stroke": "#d4af37" }, "inside": { "type": "text", "content": "...", "font": "seal" } },
            ...
          ]
        }
      ]
    }
  },
  "tailored": { ... }
}

FOCUS: Authenticity, visual precision, actionable instructions.`;

// Export for use
export {
  TechnicalAnalysisRequest,
  TechnicalAnalysisResponse,
  ModernInterpretationRequest,
  ModernInterpretationResponse,
  RemediesRequest,
  RemediesResponse,
  UnifiedReadingResponse,
  PHASE1_TECHNICAL_PROMPT,
  PHASE2_MODERN_PROMPT,
  PHASE3_REMEDIES_PROMPT
};
