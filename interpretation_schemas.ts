/**
 * STRUCTURED INTERPRETATION PIPELINE - OPTIMIZED v3.0
 * 
 * This file defines the TypeScript interfaces and schemas for the
 * token-optimized interpretation system with verification pipeline.
 * 
 * Key Features:
 * - Compressed data formats for token efficiency
 * - Validation schemas for response correctness
 * - Parallel section generation support
 * - Auto-repair and fallback mechanisms
 * 
 * @version 3.0
 */

// ============================================================================
// COMPRESSED DATA FORMATS (Token-Optimized)
// ============================================================================

/**
 * Compressed hexagram data for prompts
 * Reduces token usage by ~80% compared to full format
 */
interface CompressedHexagram {
  n: number;           // number
  zh: string;          // name_zh (truncated)
  en: string;          // name_en (truncated)
  el?: string;         // element
  ut?: string;         // upper trigram name
  lte?: string;        // lower trigram name
}

/**
 * Compressed classical texts
 */
interface CompressedClassical {
  j: {                // judgment
    z: string;         // zh (truncated)
    e: string;         // en (truncated)
  };
  i: {                // image
    z: string;
    e: string;
  };
  c: string;           // commentary (truncated)
  l: Array<{          // lines
    p: number;         // position
    z: string;         // zh
    e: string;         // en
  }>;
}

/**
 * Compressed BaZi data
 */
interface CompressedBazi {
  dm?: string;         // dayMaster stem
  dme?: string;        // dayMaster element
  str?: string;        // strength result
  fe?: string[];       // favorable elements
  ue?: string[];       // unfavorable elements
  p?: {                // pillars (optional)
    y: string;         // year
    m: string;         // month
    d: string;         // day
    h?: string;        // hour
  };
}

/**
 * Compressed element equilibrium
 */
interface CompressedElements {
  w: number;           // wood
  f: number;           // fire
  e: number;           // earth
  m: number;           // metal
  wa: number;          // water
}

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

interface OptimizedInterpretationRequest {
  /** User's question (max 200 chars for token efficiency) */
  question: string;
  
  /** Hexagram data */
  hexagram: {
    number: number;
    name_en: string;
    name_zh?: string;
    element?: string;
    trigramUpper?: { name: string; element: string };
    trigramLower?: { name: string; element: string };
  };
  
  /** Six lines of the hexagram */
  lines: Array<{
    isYang: boolean;
    isChanging: boolean;
  }>;
  
  /** Optional birth BaZi for astrological context */
  birthBazi?: {
    dayMaster?: { stem?: string; element?: string };
    strength?: {
      result?: string;
      favorable?: string[];
      unfavorable?: string[];
    };
    year?: { stem?: { zh?: string }; branch?: { zh?: string } };
    month?: { stem?: { zh?: string }; branch?: { zh?: string } };
    day?: { stem?: { zh?: string }; branch?: { zh?: string } };
    hour?: { stem?: { zh?: string }; branch?: { zh?: string } };
  };
  
  /** Optional current/moment BaZi */
  currentBazi?: {
    dayMaster?: { stem?: string; element?: string };
    strength?: {
      result?: string;
      favorable?: string[];
      unfavorable?: string[];
    };
    year?: { stem?: { zh?: string }; branch?: { zh?: string } };
    month?: { stem?: { zh?: string }; branch?: { zh?: string } };
    day?: { stem?: { zh?: string }; branch?: { zh?: string } };
    hour?: { stem?: { zh?: string }; branch?: { zh?: string } };
  };
  
  /** Optional element equilibrium analysis */
  equilibrium?: {
    elements: {
      wood: number;
      fire: number;
      earth: number;
      metal: number;
      water: number;
    };
    missing?: string[];
    strongest?: string;
    weakest?: string;
  };
  
  /** 
   * Sections to generate (defaults to all)
   * Select only needed sections for token efficiency
   */
  sections?: Array<'technical' | 'colloquial' | 'advice' | 'movingLines' | 'elements' | 'bazi'>;
  
  /** Target language for response */
  lang?: 'en' | 'es' | 'it' | 'zh';
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

interface SectionResult<T = any> {
  /** Whether this section was successfully generated */
  success: boolean;
  
  /** Generated data (if successful) */
  data?: T;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Whether auto-repair was applied */
  repaired?: boolean;
  
  /** Number of attempts made */
  attempt?: number;
}

interface OptimizedInterpretationResponse {
  /** Overall success (all sections succeeded) */
  success: boolean;
  
  /** Partial success (some sections succeeded) */
  partial: boolean;
  
  /** Individual section results */
  results: {
    technical?: SectionResult<TechnicalSection>;
    colloquial?: SectionResult<ColloquialSection>;
    advice?: SectionResult<AdviceSection>;
    movingLines?: SectionResult<MovingLinesSection>;
    elements?: SectionResult<ElementsSection>;
    bazi?: SectionResult<BaziSection>;
  };
  
  /** Response metadata */
  meta: {
    version: string;
    requestId: string;
    duration: number;
    sectionsGenerated: number;
    sectionsSuccessful: number;
  };
}

// ============================================================================
// SECTION DATA SCHEMAS
// ============================================================================

interface TechnicalSection {
  /** Technical analysis grounded in classical texts */
  technicalAnalysis: string;
  
  /** Archetypal symbolism */
  symbolism?: string;
  
  /** Classical citations */
  quotedReferences: string[];
}

interface ColloquialSection {
  /** Hermeneutic narrative */
  analysis: string;
  
  /** Accessible explanation */
  colloquialInterpretation: string;
  
  /** Classical citations */
  quotedReferences: string[];
}

interface AdviceSection {
  /** Practical orientations with citations */
  advice: string;
  
  /** Classical citations */
  quotedReferences: string[];
}

interface MovingLinesSection {
  /** Summary of moving lines dynamic */
  movingLines: string;
  
  /** Array of 6 line commentaries */
  lineTexts: [string, string, string, string, string, string];
  
  /** Classical citations */
  quotedReferences: string[];
}

interface ElementsSection {
  /** Wuxing analysis */
  technicalAnalysis: string;
  
  /** Elemental composition */
  composition?: string;
  
  /** Trigram elemental correspondences */
  trigramRelationship?: string;
  
  /** Yin-Yang analysis */
  yinYangAnalysis?: string;
  
  /** Recommendations based on elements */
  recommendations?: string;
}

interface BaziSection {
  /** Compounded BaZi analysis */
  technicalAnalysis: string;
  
  /** Birth BaZi description and impact */
  birthBazi?: {
    description: string;
    readingImpact: string;
  };
  
  /** Current BaZi description and impact */
  currentBazi?: {
    description: string;
    readingImpact: string;
  };
  
  /** Combined celestial narrative */
  celestial?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Field validation configuration
 */
interface FieldValidation {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: RegExp;
  noMarkdown?: boolean;
  noPlaceholder?: boolean;
  items?: FieldValidation;
  properties?: Record<string, FieldValidation>;
  validator?: (value: any) => true | string;
}

/**
 * Validation schemas for each section type
 */
const ValidationSchemas: Record<string, Record<string, FieldValidation>> = {
  technical: {
    technicalAnalysis: { 
      type: 'string', 
      required: true, 
      minLength: 50,
      maxLength: 2000,
      noPlaceholder: true
    },
    symbolism: { type: 'string', maxLength: 1000 },
    quotedReferences: { 
      type: 'array', 
      items: { type: 'string', minLength: 5 },
      maxItems: 10
    }
  },
  
  colloquial: {
    analysis: { 
      type: 'string', 
      required: true, 
      minLength: 100,
      maxLength: 2000,
      noMarkdown: true,
      noPlaceholder: true
    },
    colloquialInterpretation: { 
      type: 'string', 
      required: true,
      minLength: 50,
      maxLength: 1500,
      noMarkdown: true
    },
    quotedReferences: { type: 'array', items: { type: 'string' } }
  },
  
  advice: {
    advice: { 
      type: 'string', 
      required: true, 
      minLength: 50,
      maxLength: 1500,
      validator: (v) => {
        const clichés = ['trust yourself', 'be bold', 'take action', 'believe in yourself', 'you can do it'];
        const found = clichés.filter(c => v.toLowerCase().includes(c));
        return found.length === 0 ? true : `Contains clichés: ${found.join(', ')}`;
      }
    },
    quotedReferences: { type: 'array', items: { type: 'string' } }
  },
  
  movingLines: {
    movingLines: { 
      type: 'string', 
      required: true, 
      minLength: 50,
      maxLength: 1500
    },
    lineTexts: { 
      type: 'array', 
      required: true,
      minItems: 6,
      maxItems: 6,
      items: { type: 'string' }
    },
    quotedReferences: { type: 'array', items: { type: 'string' } }
  },
  
  elements: {
    technicalAnalysis: { type: 'string', required: true, minLength: 50 },
    composition: { type: 'string', maxLength: 800 },
    trigramRelationship: { type: 'string', maxLength: 500 },
    yinYangAnalysis: { type: 'string', maxLength: 500 },
    recommendations: { type: 'string', maxLength: 800 }
  },
  
  bazi: {
    technicalAnalysis: { type: 'string', required: true, minLength: 50 },
    birthBazi: {
      type: 'object',
      properties: {
        description: { type: 'string', maxLength: 800 },
        readingImpact: { type: 'string', maxLength: 500 }
      }
    },
    currentBazi: {
      type: 'object',
      properties: {
        description: { type: 'string', maxLength: 800 },
        readingImpact: { type: 'string', maxLength: 500 }
      }
    },
    celestial: { type: 'string', maxLength: 1000 }
  }
};

// ============================================================================
// PIPELINE CONFIGURATION
// ============================================================================

interface PipelineConfig {
  /** Maximum retries per section */
  maxRetries: number;
  
  /** Enable auto-repair of responses */
  autoRepair: boolean;
  
  /** Strict validation (fail on warnings) */
  strictValidation: boolean;
  
  /** Maximum tokens per response */
  tokenBudget: number;
  
  /** Temperature for AI calls (0-1) */
  temperature?: number;
}

interface PipelineMetrics {
  /** Total input tokens */
  tokensIn: number;
  
  /** Total output tokens */
  tokensOut: number;
  
  /** Number of API calls made */
  apiCalls: number;
  
  /** Number of retry attempts */
  retries: number;
  
  /** Number of auto-repairs applied */
  repairs: number;
}

// ============================================================================
// TOKEN BUDGETS
// ============================================================================

const TokenBudgets = {
  /** Maximum system prompt size */
  SYSTEM_PROMPT_MAX: 800,
  
  /** Maximum user prompt size */
  USER_PROMPT_MAX: 3000,
  
  /** Maximum response size */
  RESPONSE_MAX: 2000,
  
  /** Maximum total per API call */
  TOTAL_PER_CALL: 4000,
  
  /** Per-section budgets */
  SECTIONS: {
    technical: 1800,
    colloquial: 1500,
    advice: 2000,
    movingLines: 2000,
    elements: 1500,
    bazi: 1200
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Compressed formats
  CompressedHexagram,
  CompressedClassical,
  CompressedBazi,
  CompressedElements,
  
  // Request/Response
  OptimizedInterpretationRequest,
  OptimizedInterpretationResponse,
  SectionResult,
  
  // Section data
  TechnicalSection,
  ColloquialSection,
  AdviceSection,
  MovingLinesSection,
  ElementsSection,
  BaziSection,
  
  // Validation
  FieldValidation,
  ValidationSchemas,
  
  // Configuration
  PipelineConfig,
  PipelineMetrics,
  TokenBudgets
};

// Default export for convenience
export default {
  ValidationSchemas,
  TokenBudgets
};
