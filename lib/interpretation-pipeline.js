/**
 * OPTIMIZED INTERPRETATION PIPELINE
 * 
 * Features:
 * - Token-optimized data injection
 * - Prompt verification and validation
 * - Response correctness checking
 * - Compact data formats
 * - Streaming-friendly structure
 * 
 * @version 3.0
 */

// ============================================================================
// TOKEN OPTIMIZATION CONSTANTS
// ============================================================================

const TOKEN_LIMITS = {
  // Maximum tokens for different prompt sections
  SYSTEM_PROMPT_MAX: 800,
  TECHNICAL_DATA_MAX: 2500,
  CONTEXT_MAX: 800,
  QUESTION_MAX: 200,

  // Response token budgets
  TECHNICAL_RESPONSE: 800,
  COLLOQUIAL_RESPONSE: 600,
  ADVICE_RESPONSE: 600,
  TOTAL_RESPONSE: 2500
};

const COMPACT_KEYS = {
  // Map verbose keys to compact equivalents for AI prompts
  hexagramNumber: 'hN',
  hexagramName: 'hName',
  name_zh: 'nZh',
  name_en: 'nEn',
  judgment_zh: 'jZh',
  judgment_en: 'jEn',
  image_zh: 'iZh',
  image_en: 'iEn',
  lines_zh: 'lZh',
  lines_en: 'lEn',
  movingLines: 'mL',
  upperTrigram: 'uT',
  lowerTrigram: 'lT',
  element: 'el',
  birthBazi: 'bBz',
  currentBazi: 'cBz',
  dayMaster: 'dM',
  strength: 'str',
  favorableElements: 'fE',
  unfavorableElements: 'uE',
  lunarMansion: 'lM',
  question: 'q',
  technicalAnalysis: 'tA',
  colloquialInterpretation: 'cI',
  quotedReferences: 'qR'
};

// ============================================================================
// DATA COMPRESSION UTILITIES
// ============================================================================

/**
 * Compress hexagram data for token-efficient prompts
 * Removes redundant fields and uses compact notation
 */
function compressHexagramData(hexagram) {
  if (!hexagram) return null;

  return {
    n: hexagram.number,
    zh: truncate(hexagram.name_zh, 20),
    en: truncate(hexagram.name_en, 40),
    el: hexagram.element?.slice(0, 10),
    ut: hexagram.trigramUpper?.name || hexagram.trigram_upper?.name,
    lt: hexagram.trigramLower?.name || hexagram.trigram_lower?.name
  };
}

/**
 * Compress classical texts - keep only essential content
 */
function compressClassicalTexts(hexData) {
  if (!hexData) return null;

  return {
    j: {
      z: truncate(hexData.judgment_zh, 200),
      e: truncate(hexData.judgment_en, 300)
    },
    i: {
      z: truncate(hexData.image?.image_zh, 200),
      e: truncate(hexData.image?.image_en, 300)
    },
    c: truncate(hexData.commentary_desc, 400),
    l: (hexData.lines_zh || []).map((z, i) => ({
      p: i + 1,
      z: truncate(z, 100),
      e: truncate(hexData.lines_en?.[i], 150)
    }))
  };
}

/**
 * Compress BaZi data to essential elements only
 */
function compressBaziData(bazi) {
  if (!bazi) return null;

  const compact = {
    dm: bazi.dayMaster?.stem?.slice(0, 8),
    dme: bazi.dayMaster?.element?.slice(0, 10),
    str: bazi.strength?.result?.slice(0, 20),
    fe: (bazi.strength?.favorable || []).slice(0, 3).map(e => e.slice(0, 10)),
    ue: (bazi.strength?.unfavorable || []).slice(0, 3).map(e => e.slice(0, 10))
  };

  // Add pillars only if needed for technical analysis
  if (bazi.year) {
    compact.p = {
      y: `${bazi.year.stem?.zh || ''}${bazi.year.branch?.zh || ''}`,
      m: `${bazi.month.stem?.zh || ''}${bazi.month.branch?.zh || ''}`,
      d: `${bazi.day.stem?.zh || ''}${bazi.day.branch?.zh || ''}`,
      h: bazi.hour ? `${bazi.hour.stem?.zh || ''}${bazi.hour.branch?.zh || ''}` : null
    };
  }

  return compact;
}

/**
 * Compress element equilibrium data
 */
function compressElements(equilibrium) {
  if (!equilibrium?.elements) return null;

  const { elements, missing, strongest, weakest } = equilibrium;
  return {
    w: Math.round(elements.wood || 0),
    f: Math.round(elements.fire || 0),
    e: Math.round(elements.earth || 0),
    m: Math.round(elements.metal || 0),
    wa: Math.round(elements.water || 0),
    miss: missing?.slice(0, 2),
    strong: strongest?.slice(0, 10),
    weak: weakest?.slice(0, 10)
  };
}

/**
 * Create ultra-compact technical context for colloquial layers
 * This replaces full JSON with a markdown summary
 */
function createCompactContext(sections) {
  const parts = [];

  if (sections.celestial?.technicalAnalysis) {
    parts.push(`[Celestial] ${truncate(sections.celestial.technicalAnalysis, 300)}`);
  }
  if (sections.elements?.technicalAnalysis) {
    parts.push(`[Elements] ${truncate(sections.elements.technicalAnalysis, 200)}`);
  }
  if (sections.core?.technicalAnalysis) {
    parts.push(`[Core] ${truncate(sections.core.technicalAnalysis, 300)}`);
  }

  return parts.join('\n---\n');
}

// ============================================================================
// TEXT UTILITIES
// ============================================================================

function truncate(text, maxLength) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function sanitizeForPrompt(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control chars
    .replace(/\n{3,}/g, '\n\n') // Normalize newlines
    .trim();
}

function countTokens(text) {
  // Rough estimation: ~4 chars per token for English, ~2 for Chinese
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}

// ============================================================================
// PROMPT VERIFICATION SYSTEM
// ============================================================================

/**
 * Schema validator for AI responses
 */
class ResponseValidator {
  constructor(schema) {
    this.schema = schema;
    this.errors = [];
  }

  validate(response) {
    this.errors = [];

    if (!response || typeof response !== 'object') {
      this.errors.push('Response must be an object');
      return false;
    }

    for (const [key, config] of Object.entries(this.schema)) {
      this.validateField(key, response[key], config, '');
    }

    return this.errors.length === 0;
  }

  validateField(key, value, config, path) {
    const fullPath = path ? `${path}.${key}` : key;

    // Required check
    if (config.required && (value === undefined || value === null)) {
      this.errors.push(`Missing required field: ${fullPath}`);
      return;
    }

    if (value === undefined || value === null) return;

    // Type check
    if (config.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== config.type) {
        this.errors.push(`Type mismatch for ${fullPath}: expected ${config.type}, got ${actualType}`);
        return;
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (config.minLength && value.length < config.minLength) {
        this.errors.push(`${fullPath} too short: ${value.length} < ${config.minLength}`);
      }
      if (config.maxLength && value.length > config.maxLength) {
        // Auto-truncate instead of error
        value = truncate(value, config.maxLength);
      }
      if (config.pattern && !config.pattern.test(value)) {
        this.errors.push(`${fullPath} does not match required pattern`);
      }
      // Check for common AI errors
      if (config.noMarkdown && /[*#`\[\]]/.test(value)) {
        this.errors.push(`${fullPath} contains markdown formatting`);
      }
      if (config.noPlaceholder && /unknown|placeholder|not provided/i.test(value)) {
        this.errors.push(`${fullPath} contains placeholder text`);
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (config.minItems && value.length < config.minItems) {
        this.errors.push(`${fullPath} has too few items: ${value.length} < ${config.minItems}`);
      }
      if (config.maxItems && value.length > config.maxItems) {
        this.errors.push(`${fullPath} has too many items: ${value.length} > ${config.maxItems}`);
      }
      if (config.items) {
        value.forEach((item, i) => {
          this.validateField(i.toString(), item, config.items, fullPath);
        });
      }
    }

    // Object validations
    if (typeof value === 'object' && !Array.isArray(value) && config.properties) {
      for (const [propKey, propConfig] of Object.entries(config.properties)) {
        this.validateField(propKey, value[propKey], propConfig, fullPath);
      }
    }

    // Custom validator
    if (config.validator && typeof config.validator === 'function') {
      const result = config.validator(value);
      if (result !== true) {
        this.errors.push(`${fullPath}: ${result}`);
      }
    }
  }

  getErrors() {
    return this.errors;
  }
}

// Predefined schemas for each section
const VALIDATION_SCHEMAS = {
  technical: {
    technicalAnalysis: {
      type: 'string',
      required: true,
      minLength: 50,
      maxLength: 2000,
      noPlaceholder: true
    },
    quotedReferences: {
      type: 'array',
      items: { type: 'string', minLength: 5 },
      maxItems: 10
    }
  },

  colloquial: {
    colloquialInterpretation: {
      type: 'string',
      required: true,
      minLength: 30,
      maxLength: 1500,
      noMarkdown: true,
      noPlaceholder: true
    },
    analysis: {
      type: 'string',
      maxLength: 2000,
      noMarkdown: true
    }
  },

  advice: {
    advice: {
      type: 'string',
      required: true,
      minLength: 20,
      maxLength: 1500,
      validator: (v) => {
        // Check for life-coaching clichés
        const clichés = ['trust yourself', 'be bold', 'take action', 'believe in', 'you can do it'];
        const found = clichés.filter(c => v.toLowerCase().includes(c));
        return found.length === 0 ? true : `Contains clichés: ${found.join(', ')}`;
      }
    }
  },

  movingLines: {
    movingLines: {
      type: 'string',
      required: true,
      minLength: 20,
      maxLength: 1500
    },
    lineTexts: {
      type: 'array',
      required: true,
      minItems: 6,
      maxItems: 6,
      items: { type: 'string' }
    }
  },

  elements: {
    technicalAnalysis: { type: 'string', required: true, minLength: 30 },
    composition: { type: 'string', maxLength: 800 },
    trigramRelationship: { type: 'string', maxLength: 500 },
    yinYangAnalysis: { type: 'string', maxLength: 500 }
  },

  bazi: {
    technicalAnalysis: { type: 'string', required: true, minLength: 30 },
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
    }
  }
};

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

/**
 * Build optimized system prompt with token budget awareness
 */
function buildSystemPrompt(role, rules, format, options = {}) {
  const parts = [
    `ROLE: ${role}`,
    '',
    'RULES:',
    ...rules.map(r => `- ${r}`),
    ''
  ];

  if (options.verification) {
    parts.push('VERIFICATION:', '- Before outputting, verify all rules are followed', '');
  }

  parts.push('OUTPUT FORMAT (JSON only):', JSON.stringify(format, null, 2));

  const prompt = parts.join('\n');

  // Verify token budget
  const tokens = countTokens(prompt);
  if (tokens > TOKEN_LIMITS.SYSTEM_PROMPT_MAX) {
    console.warn(`[PROMPT] System prompt exceeds budget: ${tokens} > ${TOKEN_LIMITS.SYSTEM_PROMPT_MAX}`);
  }

  return prompt;
}

/**
 * Build compact user prompt with compressed data
 */
function buildUserPrompt(question, technicalData, context, options = {}) {
  const parts = [];

  // Compressed technical data
  if (technicalData) {
    parts.push('DATA:', JSON.stringify(technicalData));
  }

  // Compact context from previous sections
  if (context && !options.skipContext) {
    const compactCtx = typeof context === 'string'
      ? truncate(context, TOKEN_LIMITS.CONTEXT_MAX)
      : createCompactContext(context);
    if (compactCtx) {
      parts.push('', 'CONTEXT:', compactCtx);
    }
  }

  // Question (always last for emphasis)
  if (question) {
    parts.push('', `Q: "${sanitizeForPrompt(truncate(question, TOKEN_LIMITS.QUESTION_MAX))}"`);
  }

  return parts.join('\n');
}

// ============================================================================
// SECTION-SPECIFIC PROMPT GENERATORS
// ============================================================================

const PromptGenerators = {
  /**
   * Technical analysis prompt - grounded in classical texts
   */
  technical(hexagram, hexData, question, context) {
    const compressedHex = compressHexagramData(hexagram);
    const classical = compressClassicalTexts(hexData);

    const systemPrompt = buildSystemPrompt(
      'Yi Jing textual scholar specializing in structural and elemental analysis',
      [
        'Ground ALL analysis in the classical texts provided (Judgment, Image, Line texts)',
        'Quote or paraphrase classical texts explicitly',
        'Analyze trigram dynamics using Wuxing (Five Elements) correspondences',
        'Reference moving lines using their classical Yao Ci texts',
        'NO life-coaching language - this is textual/cosmological analysis',
        'NO invented interpretations not supported by classical corpus',
        'Plain text only - no markdown'
      ],
      {
        technicalAnalysis: 'Structural analysis grounded in Judgment/Image with explicit citations',
        symbolism: 'Archetypal symbolism drawn directly from classical imagery',
        quotedReferences: ['Classical citation (source)']
      },
      { verification: true }
    );

    const userPrompt = buildUserPrompt(
      question,
      { h: compressedHex, c: classical },
      context
    );

    return { systemPrompt, userPrompt, validator: new ResponseValidator(VALIDATION_SCHEMAS.technical) };
  },

  /**
   * Colloquial/narrative interpretation prompt
   */
  colloquial(hexagram, question, technicalContext) {
    const compressedHex = compressHexagramData(hexagram);

    const systemPrompt = buildSystemPrompt(
      'Yi Jing scholar providing accessible hermeneutic narrative',
      [
        'Narrative MUST derive from classical Judgment and Image Commentary',
        'Weave together classical imagery, Five Elements, and moving lines',
        'Connect classical meaning to querent\'s situation through text',
        '2-3 substantive paragraphs, no bullet points or headings',
        'NO motivational or life-coaching language',
        'NO invented advice not supported by classical corpus',
        'Plain text - no markdown'
      ],
      {
        analysis: 'Hermeneutic narrative rooted in classical texts',
        colloquialInterpretation: 'Accessible explanation of classical themes',
        quotedReferences: ['Classical citation']
      }
    );

    // Use compact context instead of full technical data
    const userPrompt = buildUserPrompt(
      question,
      { h: compressedHex },
      technicalContext,
      { skipContext: false }
    );

    return { systemPrompt, userPrompt, validator: new ResponseValidator(VALIDATION_SCHEMAS.colloquial) };
  },

  /**
   * Advice generation prompt
   */
  advice(hexagram, hexData, question, lines, context) {
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

    // Extract only relevant line texts for changing lines
    const lineTexts = changingLines.map(pos => ({
      p: pos,
      z: truncate(hexData?.lines_zh?.[pos - 1], 100),
      e: truncate(hexData?.lines_en?.[pos - 1], 150)
    }));

    const systemPrompt = buildSystemPrompt(
      'Yi Jing textual scholar extracting practical orientations from classical sources',
      [
        'ALL guidance must derive explicitly from classical texts provided',
        'Begin each orientation with citation of specific classical passage',
        'Provide 4-6 orientations, each identifying its classical source',
        'NO invented guidance not supported by classical corpus',
        'NO motivational language or life-coaching clichés',
        'NO "take action", "be bold", "trust yourself" language',
        'Tone is scholarly and interpretive, not pastoral',
        'Plain text - no markdown, no bullet symbols'
      ],
      {
        advice: "1. 'Quote' - Orientation\\n\\n2. 'Quote' - Orientation...",
        quotedReferences: ['Cited passage']
      },
      { verification: true }
    );

    const userPrompt = buildUserPrompt(
      question,
      {
        h: { n: hexagram.number, zh: hexagram.name_zh, en: hexagram.name_en },
        mL: changingLines,
        lines: lineTexts,
        j: truncate(hexData?.judgment_en, 300),
        i: truncate(hexData?.image?.image_en, 300)
      },
      context
    );

    return { systemPrompt, userPrompt, validator: new ResponseValidator(VALIDATION_SCHEMAS.advice) };
  },

  /**
   * Moving lines analysis prompt
   */
  movingLines(hexagram, hexData, question, lines) {
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);

    if (changingLines.length === 0) {
      return null; // No prompt needed for stable hexagram
    }

    const lineData = changingLines.map(pos => ({
      p: pos,
      name: ["Bottom", "Second", "Third", "Fourth", "Fifth", "Top"][pos - 1],
      z: truncate(hexData?.lines_zh?.[pos - 1], 150),
      e: truncate(hexData?.lines_en?.[pos - 1], 200)
    }));

    const systemPrompt = buildSystemPrompt(
      'Yi Jing scholar specializing in Yao Ci (Line Text) exegesis',
      [
        'For each moving line, quote Yao Ci text before interpreting',
        'Exegete line\'s symbolic imagery within hexagram context',
        'lineTexts array must have exactly 6 elements',
        'Moving lines get classical commentary; non-moving get terse "stable" note',
        'movingLines synthesizes combined dynamic of all active lines',
        'NO life-coaching, NO invented symbolism',
        'Plain text - no markdown'
      ],
      {
        movingLines: 'Summary of combined moving lines dynamic with citations',
        lineTexts: ['Line 1 (stable)', 'Line 2 commentary...', '...', 'Line 6 (stable)'],
        quotedReferences: ['Yao Ci citation (line position)']
      }
    );

    const userPrompt = buildUserPrompt(
      question,
      {
        h: { n: hexagram.number, zh: hexagram.name_zh, en: hexagram.name_en },
        lines: lineData
      },
      null
    );

    return { systemPrompt, userPrompt, validator: new ResponseValidator(VALIDATION_SCHEMAS.movingLines) };
  },

  /**
   * Five Elements analysis prompt
   */
  elements(hexagram, equilibrium, question, context) {
    const compressedHex = compressHexagramData(hexagram);
    const compressedElements = compressElements(equilibrium);

    const systemPrompt = buildSystemPrompt(
      'Yi Jing scholar specializing in Wuxing (Five Elements) cosmology',
      [
        'Ground elemental analysis in hexagram\'s Judgment and Image Commentary',
        'Reference Wuxing sheng (generating) and ke (controlling) cycles precisely',
        'Connect elemental imbalances to classical symbolism',
        'NO generic life advice - keep tied to classical meaning',
        'Plain text - no markdown'
      ],
      {
        technicalAnalysis: 'Detailed Wuxing analysis referencing classical texts',
        composition: 'Elemental composition and balance',
        trigramRelationship: 'Trigram elemental correspondences',
        yinYangAnalysis: 'Yin-Yang polarity analysis'
      }
    );

    const userPrompt = buildUserPrompt(
      question,
      { h: compressedHex, el: compressedElements },
      context
    );

    return { systemPrompt, userPrompt, validator: new ResponseValidator(VALIDATION_SCHEMAS.elements) };
  },

  /**
   * BaZi analysis prompt
   */
  bazi(birthBazi, currentBazi, hexagram, question) {
    const compressedBirth = compressBaziData(birthBazi);
    const compressedCurrent = compressBaziData(currentBazi);

    const systemPrompt = buildSystemPrompt(
      'Daoist Master compounding BaZi, PaGua, and Five Elements analysis',
      [
        'USE PROVIDED TECHNICAL DATA: Analyze actual master of day, stems, branches',
        'BIRTH BAZI: Analyze master of day, strength, favorable elements from data',
        'CURRENT BAZI: Analyze moment energies (Prasna) from data',
        'HEXAGRAM CENTRALITY: Hexagram is primary; astrology provides context',
        'READING IMPACT: How does astrological backdrop affect THIS I Ching reading?',
        'NO invented astrology not supported by provided data',
        'Plain text - no markdown'
      ],
      {
        technicalAnalysis: 'Classical compounded BaZi, PaGua, Five Elements analysis',
        colloquialInterpretation: 'Practical interpretation prioritizing hexagram in context',
        birthBazi: { description: '', readingImpact: '' },
        currentBazi: { description: '', readingImpact: '' },
        celestial: 'Combined narrative explaining sky\'s influence on the cast'
      }
    );

    const userPrompt = buildUserPrompt(
      question,
      {
        h: { n: hexagram.number, en: hexagram.name_en },
        bz: compressedBirth,
        cz: compressedCurrent
      },
      null
    );

    return { systemPrompt, userPrompt, validator: new ResponseValidator(VALIDATION_SCHEMAS.bazi) };
  }
};

// ============================================================================
// RESPONSE VERIFICATION & REPAIR
// ============================================================================

/**
 * Verify and repair AI responses
 */
function verifyAndRepairResponse(rawResponse, validator, options = {}) {
  const result = {
    success: false,
    data: null,
    errors: [],
    repaired: false,
    raw: rawResponse
  };

  // Step 1: Parse JSON
  let parsed;
  try {
    parsed = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
  } catch (parseError) {
    // Attempt repair
    const repaired = attemptJSONRepair(rawResponse);
    if (repaired.success) {
      parsed = repaired.data;
      result.repaired = true;
    } else {
      result.errors.push(`JSON parse failed: ${parseError.message}`);
      return result;
    }
  }

  // Step 2: Validate against schema
  if (validator) {
    const isValid = validator.validate(parsed);
    if (!isValid) {
      result.errors.push(...validator.getErrors());

      // Attempt field-level repairs if enabled
      if (options.autoRepair) {
        parsed = attemptFieldRepair(parsed, validator.schema);
        result.repaired = true;

        // Re-validate
        const reValid = validator.validate(parsed);
        if (reValid) {
          result.errors = []; // Clear errors if repair succeeded
        }
      }
    }
  }

  // Step 3: Content quality checks
  const qualityIssues = checkContentQuality(parsed);
  if (qualityIssues.length > 0) {
    result.errors.push(...qualityIssues);
  }

  result.data = parsed;
  result.success = result.errors.length === 0;

  return result;
}

/**
 * Attempt to repair malformed JSON
 */
function attemptJSONRepair(text) {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'Invalid input' };
  }

  let cleaned = text.trim();

  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

  // Remove control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Extract JSON from surrounding text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Common repairs
  const repairs = [
    // Fix trailing commas
    { pattern: /,(\s*[}\]])/g, replacement: '$1' },
    // Fix unquoted keys
    { pattern: /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, replacement: '$1"$2":' },
    // Fix single quotes
    { pattern: /'/g, replacement: '"' },
    // Fix unescaped newlines in strings
    { pattern: /(?<=")[^"]*\n[^"]*(?=")/g, replacement: (m) => m.replace(/\n/g, '\\n') }
  ];

  for (const { pattern, replacement } of repairs) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  try {
    const parsed = JSON.parse(cleaned);
    return { success: true, data: parsed };
  } catch (e) {
    return { success: false, error: e.message, attempt: cleaned };
  }
}

/**
 * Attempt to repair specific field issues
 */
function attemptFieldRepair(data, schema) {
  const repaired = { ...data };

  for (const [key, config] of Object.entries(schema)) {
    if (config.required && !repaired[key]) {
      // Generate fallback based on type
      if (config.type === 'string') {
        repaired[key] = `[${key} generation pending - classical analysis in progress]`;
      } else if (config.type === 'array') {
        repaired[key] = [];
      } else if (config.type === 'object') {
        repaired[key] = {};
      }
    }

    // Type coercion
    if (repaired[key] !== undefined && config.type) {
      const actualType = Array.isArray(repaired[key]) ? 'array' : typeof repaired[key];
      if (actualType !== config.type) {
        if (config.type === 'string') {
          repaired[key] = String(repaired[key]);
        } else if (config.type === 'array' && !Array.isArray(repaired[key])) {
          repaired[key] = [repaired[key]];
        }
      }
    }
  }

  return repaired;
}

/**
 * Check content for quality issues
 */
function checkContentQuality(data) {
  const issues = [];

  if (!data) return issues;

  // Check for placeholder content
  const placeholderPatterns = [
    /unknown|not provided|placeholder|pending/i,
    /\[.+?generation pending.+?\]/i
  ];

  function checkValue(value, path) {
    if (typeof value === 'string') {
      for (const pattern of placeholderPatterns) {
        if (pattern.test(value)) {
          issues.push(`Placeholder content detected at ${path}`);
        }
      }

      // Check for excessive repetition
      const words = value.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words);
      if (words.length > 20 && uniqueWords.size / words.length < 0.3) {
        issues.push(`Possible repetitive content at ${path}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        checkValue(v, path ? `${path}.${k}` : k);
      }
    }
  }

  checkValue(data, '');
  return issues;
}

// ============================================================================
// PIPELINE ORCHESTRATION
// ============================================================================

/**
 * Optimized interpretation pipeline
 * Manages token budgets, verification, and error recovery
 */
class InterpretationPipeline {
  constructor(options = {}) {
    this.options = {
      maxRetries: 3,
      autoRepair: true,
      strictValidation: true,
      tokenBudget: TOKEN_LIMITS.TOTAL_RESPONSE,
      ...options
    };
    this.metrics = {
      tokensIn: 0,
      tokensOut: 0,
      apiCalls: 0,
      retries: 0,
      repairs: 0
    };
  }

  /**
   * Generate a complete interpretation with all sections
   */
  async generateComplete(request, apiCaller) {
    const { hexagram, question, lines, birthBazi, currentBazi, equilibrium } = request;
    const results = {};

    // Fetch hexagram data once
    const hexData = request.hexData || null;

    // Phase 1: Independent sections (can be parallelized)
    const independentTasks = [];

    // Technical analysis
    independentTasks.push(
      this.generateSection('technical', () =>
        PromptGenerators.technical(hexagram, hexData, question, null)
        , apiCaller).then(r => { results.technical = r; })
    );

    // Elements analysis
    if (equilibrium) {
      independentTasks.push(
        this.generateSection('elements', () =>
          PromptGenerators.elements(hexagram, equilibrium, question, null)
          , apiCaller).then(r => { results.elements = r; })
      );
    }

    // BaZi analysis
    if (birthBazi || currentBazi) {
      independentTasks.push(
        this.generateSection('bazi', () =>
          PromptGenerators.bazi(birthBazi, currentBazi, hexagram, question)
          , apiCaller).then(r => { results.bazi = r; })
      );
    }

    // Moving lines
    const hasMovingLines = lines?.some(l => l.isChanging);
    if (hasMovingLines) {
      independentTasks.push(
        this.generateSection('movingLines', () =>
          PromptGenerators.movingLines(hexagram, hexData, question, lines)
          , apiCaller).then(r => { results.movingLines = r; })
      );
    }

    await Promise.all(independentTasks);

    // Phase 2: Dependent sections (need technical context)
    const technicalContext = this.buildTechnicalContext(results);

    // Colloquial interpretation
    results.colloquial = await this.generateSection('colloquial', () =>
      PromptGenerators.colloquial(hexagram, question, technicalContext)
      , apiCaller);

    // Advice
    results.advice = await this.generateSection('advice', () =>
      PromptGenerators.advice(hexagram, hexData, question, lines, technicalContext)
      , apiCaller);

    return {
      success: true,
      results,
      metrics: this.metrics,
      technicalContext
    };
  }

  /**
   * Generate a single section with retry and verification
   */
  async generateSection(name, promptGenerator, apiCaller) {
    let lastError;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const { systemPrompt, userPrompt, validator } = promptGenerator();

        // Count input tokens
        this.metrics.tokensIn += countTokens(systemPrompt) + countTokens(userPrompt);
        this.metrics.apiCalls++;

        // Call API
        const rawResponse = await apiCaller(systemPrompt, userPrompt, {
          max_tokens: this.options.tokenBudget,
          temperature: attempt > 1 ? 0.3 : 0.5, // Lower temp on retries
          response_format: { type: 'json_object' }
        });

        // Count output tokens
        this.metrics.tokensOut += countTokens(rawResponse);

        // Verify and repair
        const verification = verifyAndRepairResponse(
          rawResponse,
          validator,
          { autoRepair: this.options.autoRepair }
        );

        if (!verification.success && attempt < this.options.maxRetries) {
          lastError = verification.errors.join(', ');
          this.metrics.retries++;
          continue;
        }

        if (verification.repaired) {
          this.metrics.repairs++;
        }

        return {
          success: verification.success,
          data: verification.data,
          errors: verification.errors,
          repaired: verification.repaired,
          attempt
        };

      } catch (error) {
        lastError = error.message;
        this.metrics.retries++;

        if (attempt === this.options.maxRetries) {
          break;
        }

        // Exponential backoff
        await this.delay(1000 * attempt);
      }
    }

    return {
      success: false,
      error: lastError,
      attempt: this.options.maxRetries
    };
  }

  /**
   * Build compact technical context for dependent sections
   */
  buildTechnicalContext(results) {
    const parts = [];

    if (results.technical?.success) {
      parts.push(`[Technical] ${truncate(results.technical.data.technicalAnalysis, 300)}`);
    }
    if (results.elements?.success) {
      parts.push(`[Elements] ${truncate(results.elements.data.technicalAnalysis, 200)}`);
    }
    if (results.bazi?.success) {
      parts.push(`[BaZi] ${truncate(results.bazi.data.technicalAnalysis, 200)}`);
    }

    return parts.join('\n---\n');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Core classes
    InterpretationPipeline,
    ResponseValidator,

    // Prompt generators
    PromptGenerators,

    // Utilities
    compressHexagramData,
    compressClassicalTexts,
    compressBaziData,
    compressElements,
    createCompactContext,
    buildSystemPrompt,
    buildUserPrompt,
    verifyAndRepairResponse,
    attemptJSONRepair,

    // Constants
    TOKEN_LIMITS,
    VALIDATION_SCHEMAS,

    // Helpers
    truncate,
    sanitizeForPrompt,
    countTokens
  };
}

// Browser export
if (typeof window !== 'undefined') {
  window.InterpretationPipeline = {
    InterpretationPipeline,
    ResponseValidator,
    PromptGenerators,
    utils: {
      compressHexagramData,
      compressClassicalTexts,
      compressBaziData,
      compressElements,
      truncate,
      countTokens
    },
    constants: {
      TOKEN_LIMITS,
      VALIDATION_SCHEMAS
    }
  };
}
