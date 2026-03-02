/**
 * HexagramUtils - Generalized hexagram data retrieval and JSON extraction
 * 
 * Consolidates scattered patterns from:
 * - casting.js (fetchHexagramData, findHexagram)
 * - translation-service.js (extractSectionContent)
 * - app.js (field extraction with fallbacks)
 * - ui.js (display field access)
 */

class HexagramUtils {
    // Cache configuration
    static CACHE_KEY = 'iChingData_v4';
    static CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

    // Known DB binary mismatches (hexagram number corrections)
    static DB_BINARY_FIXES = {
        '011110': 61,  // Wind over Lake = Inner Truth (中孚)
        '011010': 60   // Water over Lake = Limitation (節)
    };

    // Field path mappings for different response shapes
    static FIELD_MAPPINGS = {
        judgment: ['judgment', 'judgment_en', 'judgment_es', 'judgment_it', 'judgment_zh'],
        image: ['image', 'image.image_en', 'image.image_es', 'image.image_it', 'image.image_zh', 'image_en', 'image_es'],
        lines: ['lines', 'lines.en', 'lines.es', 'lines.it', 'lines.zh', 'lineTexts', 'lineTexts.en'],
        name: ['name', 'name.en', 'name.es', 'name.it', 'name.zh', 'chineseName'],
        number: ['number', 'id', 'hexagramNumber'],
        binary: ['binary', 'binaryKey', 'binary_string']
    };

    // Language suffix priority for fallback chains
    static LANG_PRIORITY = ['en', 'es', 'it', 'zh'];

    /**
     * ============================================================================
     * HEXAGRAM DATA FETCHING & CACHING
     * ============================================================================
     */

    /**
     * Fetch hexagram data with caching support
     * @param {string} url - URL to fetch hexagrams.json from
     * @param {Object} options - Options
     * @param {boolean} options.forceRefresh - Skip cache and fetch fresh
     * @param {number} options.ttlMs - Cache TTL in milliseconds
     * @returns {Promise<Array>} Array of hexagram objects
     */
    static async fetchHexagramData(url, options = {}) {
        const { forceRefresh = false, ttlMs = this.CACHE_TTL_MS } = options;

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = this.getCachedData(ttlMs);
            if (cached) {
                console.log('[HexagramUtils] Using cached hexagram data');
                return Array.isArray(cached) ? cached : Object.values(cached.hexagrams || {});
            }
        }

        try {
            const response = await fetch(`${url}?v=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch hexagram data`);
            }

            const data = await response.json();
            
            // Normalize to array
            const hexagrams = Array.isArray(data) ? data : Object.values(data.hexagrams || {});
            
            // Cache the result
            this.setCachedData(data);
            
            console.log(`[HexagramUtils] Fetched ${hexagrams.length} hexagrams`);
            return hexagrams;
        } catch (error) {
            console.error('[HexagramUtils] Failed to fetch hexagram data:', error);
            
            // Return stale cache as fallback if available
            const stale = this.getCachedData(Infinity);
            if (stale) {
                console.warn('[HexagramUtils] Returning stale cache as fallback');
                return Array.isArray(stale) ? stale : Object.values(stale.hexagrams || {});
            }
            
            return [];
        }
    }

    /**
     * Get cached hexagram data from localStorage
     * @param {number} maxAgeMs - Maximum age of cache in milliseconds
     * @returns {Object|null} Cached data or null
     */
    static getCachedData(maxAgeMs = this.CACHE_TTL_MS) {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;

            const parsed = JSON.parse(cached);
            
            // Check cache timestamp if available
            if (parsed._timestamp && (Date.now() - parsed._timestamp > maxAgeMs)) {
                return null;
            }
            
            return parsed;
        } catch (e) {
            return null;
        }
    }

    /**
     * Set cached hexagram data in localStorage
     * @param {Object} data - Data to cache
     */
    static setCachedData(data) {
        try {
            const toCache = typeof data === 'object' && !Array.isArray(data) 
                ? { ...data, _timestamp: Date.now() }
                : { hexagrams: data, _timestamp: Date.now() };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(toCache));
        } catch (e) {
            console.warn('[HexagramUtils] Failed to cache data:', e);
        }
    }

    /**
     * Clear cached hexagram data
     */
    static clearCache() {
        try {
            localStorage.removeItem(this.CACHE_KEY);
        } catch (e) {
            console.warn('[HexagramUtils] Failed to clear cache:', e);
        }
    }

    /**
     * ============================================================================
     * HEXAGRAM LOOKUP FUNCTIONS
     * ============================================================================
     */

    /**
     * Find hexagram by binary key with multiple fallback strategies
     * @param {Array} hexagrams - Array of hexagram objects
     * @param {string} binaryKey - 6-character binary string (e.g., '111111')
     * @param {Object} options - Options
     * @param {boolean} options.strict - Throw error if not found (default: true)
     * @returns {Object|null} Hexagram object or null
     */
    static findByBinary(hexagrams, binaryKey, options = {}) {
        const { strict = true } = options;

        if (!binaryKey || binaryKey.length !== 6) {
            if (strict) throw new Error(`Invalid binary key: ${binaryKey}`);
            return null;
        }

        // Strategy 1: Direct binary match
        let hex = hexagrams.find(h => h.binary === binaryKey);
        if (hex) return hex;

        // Strategy 2: Known DB binary fixes (for incorrect data)
        const fixedNumber = this.DB_BINARY_FIXES[binaryKey];
        if (fixedNumber) {
            hex = hexagrams.find(h => h.number === fixedNumber);
            if (hex) {
                console.warn(`[HexagramUtils] Binary ${binaryKey} matched hex ${fixedNumber} via DB correction`);
                return hex;
            }
        }

        // Strategy 3: Trigram decomposition fallback
        const lowerTri = binaryKey.substring(0, 3);
        const upperTri = binaryKey.substring(3, 6);
        hex = hexagrams.find(h => {
            if (!h.binary) return false;
            const hLower = h.binary.substring(0, 3);
            const hUpper = h.binary.substring(3, 6);
            return (hLower === lowerTri && hUpper === upperTri) ||
                   (hLower === upperTri && hUpper === lowerTri);
        });
        if (hex) {
            console.warn(`[HexagramUtils] Binary ${binaryKey} matched hex ${hex.number} via trigram fallback`);
            return hex;
        }

        if (strict) {
            throw new Error(`Hexagram not found for binary: ${binaryKey}`);
        }
        return null;
    }

    /**
     * Find hexagram by number
     * @param {Array} hexagrams - Array of hexagram objects
     * @param {number} number - Hexagram number (1-64)
     * @returns {Object|null} Hexagram object or null
     */
    static findByNumber(hexagrams, number) {
        return hexagrams.find(h => h.number === number || h.id === number) || null;
    }

    /**
     * Find hexagram by name (supports multiple languages)
     * @param {Array} hexagrams - Array of hexagram objects
     * @param {string} name - Name to search for
     * @param {string} lang - Language code (en, es, it, zh) or 'any'
     * @returns {Object|null} Hexagram object or null
     */
    static findByName(hexagrams, name, lang = 'any') {
        const searchName = name.toLowerCase().trim();
        
        return hexagrams.find(h => {
            if (lang === 'any' || lang === 'en') {
                const enName = this.getPath(h, 'name.en') || this.getPath(h, 'name');
                if (enName?.toLowerCase() === searchName) return true;
            }
            if (lang === 'any' || lang === 'es') {
                const esName = this.getPath(h, 'name.es');
                if (esName?.toLowerCase() === searchName) return true;
            }
            if (lang === 'any' || lang === 'it') {
                const itName = this.getPath(h, 'name.it');
                if (itName?.toLowerCase() === searchName) return true;
            }
            if (lang === 'any' || lang === 'zh') {
                const zhName = this.getPath(h, 'name.zh') || h.chineseName;
                if (zhName === name) return true; // Chinese: exact match
            }
            return false;
        }) || null;
    }

    /**
     * Find hexagram with flexible lookup (tries multiple strategies)
     * @param {Array} hexagrams - Array of hexagram objects
     * @param {string|number} query - Binary key, number, or name
     * @param {Object} options - Options
     * @returns {Object|null} Hexagram object or null
     */
    static findHexagram(hexagrams, query, options = {}) {
        if (!query || !hexagrams?.length) return null;

        // Try binary key first (6-character string of 0s and 1s)
        if (typeof query === 'string' && /^[01]{6}$/.test(query)) {
            return this.findByBinary(hexagrams, query, { strict: false });
        }

        // Try number
        if (typeof query === 'number' || /^\d{1,2}$/.test(query)) {
            return this.findByNumber(hexagrams, parseInt(query));
        }

        // Try name lookup
        if (typeof query === 'string') {
            return this.findByName(hexagrams, query, options.lang || 'any');
        }

        return null;
    }

    /**
     * ============================================================================
     * FIELD EXTRACTION WITH LANGUAGE FALLBACKS
     * ============================================================================
     */

    /**
     * Safely get a nested path from an object
     * @param {Object} obj - Source object
     * @param {string} path - Dot-notation path (e.g., 'image.image_en')
     * @param {*} defaultValue - Default if path not found
     * @returns {*} Value at path or default
     */
    static getPath(obj, path, defaultValue = null) {
        if (!obj || !path) return defaultValue;
        
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current !== undefined ? current : defaultValue;
    }

    /**
     * Get field with language fallback chain
     * Tries: specific lang -> en -> es -> it -> zh -> any available
     * @param {Object} hex - Hexagram object
     * @param {string} fieldBase - Base field name (e.g., 'judgment', 'image')
     * @param {string} targetLang - Preferred language code
     * @param {*} defaultValue - Default if nothing found
     * @returns {*} Field value or default
     */
    static getLocalizedField(hex, fieldBase, targetLang = 'en', defaultValue = '') {
        if (!hex) return defaultValue;

        // Build priority list: target lang first, then fallback chain
        const langPriority = [targetLang, ...this.LANG_PRIORITY.filter(l => l !== targetLang)];
        
        // Try each language variant
        for (const lang of langPriority) {
            // Try field_lang format (e.g., judgment_en)
            const flatKey = `${fieldBase}_${lang}`;
            if (hex[flatKey]) return hex[flatKey];
            
            // Try nested format (e.g., judgment.en or image.image_en)
            const nestedValue = this.getPath(hex, `${fieldBase}.${lang}`);
            if (nestedValue) return nestedValue;
            
            // Try nested object with lang key
            const nestedObj = this.getPath(hex, fieldBase);
            if (nestedObj && typeof nestedObj === 'object' && nestedObj[lang]) {
                return nestedObj[lang];
            }
        }
        
        // Try raw field value
        if (hex[fieldBase] && typeof hex[fieldBase] !== 'object') {
            return hex[fieldBase];
        }
        
        // For objects, try to find any non-empty value
        const objValue = hex[fieldBase];
        if (objValue && typeof objValue === 'object') {
            for (const lang of langPriority) {
                if (objValue[lang]) return objValue[lang];
            }
        }
        
        return defaultValue;
    }

    /**
     * Get judgment text with language fallback
     * @param {Object} hex - Hexagram object
     * @param {string} lang - Language code
     * @returns {string} Judgment text
     */
    static getJudgment(hex, lang = 'en') {
        return this.getLocalizedField(hex, 'judgment', lang, '');
    }

    /**
     * Get image text with language fallback
     * @param {Object} hex - Hexagram object
     * @param {string} lang - Language code
     * @returns {string} Image text
     */
    static getImage(hex, lang = 'en') {
        // Image has special nested structure: image.image_en
        const paths = [
            `image.image_${lang}`,
            `image_${lang}`,
            `image.${lang}`,
            lang === 'en' ? 'image' : null
        ].filter(Boolean);
        
        for (const path of paths) {
            const value = this.getPath(hex, path);
            if (value) return value;
        }
        
        // Fallback chain
        for (const fallbackLang of this.LANG_PRIORITY) {
            const value = this.getPath(hex, `image.image_${fallbackLang}`) || 
                         this.getPath(hex, `image_${fallbackLang}`);
            if (value) return value;
        }
        
        return '';
    }

    /**
     * Get line texts array with language fallback
     * @param {Object} hex - Hexagram object
     * @param {string} lang - Language code
     * @returns {Array} Array of 6 line texts
     */
    static getLines(hex, lang = 'en') {
        if (!hex) return [];

        // Try lines array directly
        if (Array.isArray(hex.lines)) {
            // Check if it's an array of strings or objects
            if (hex.lines.length === 6) {
                if (typeof hex.lines[0] === 'string') return hex.lines;
                // Array of objects with text property
                return hex.lines.map(l => l[lang] || l.en || l.text || '');
            }
        }

        // Try lines.lang format
        const nestedLines = this.getPath(hex, `lines.${lang}`) || 
                           this.getPath(hex, `lines.en`) ||
                           this.getPath(hex, `lines`);
        if (Array.isArray(nestedLines) && nestedLines.length === 6) {
            return nestedLines;
        }

        // Try lineTexts format
        const lineTexts = this.getPath(hex, `lineTexts.${lang}`) ||
                         this.getPath(hex, `lineTexts.en`) ||
                         this.getPath(hex, `lineTexts`);
        if (Array.isArray(lineTexts) && lineTexts.length === 6) {
            return lineTexts;
        }

        return [];
    }

    /**
     * Get specific line text
     * @param {Object} hex - Hexagram object
     * @param {number} lineNum - Line number (1-6, bottom to top)
     * @param {string} lang - Language code
     * @returns {string} Line text
     */
    static getLine(hex, lineNum, lang = 'en') {
        const lines = this.getLines(hex, lang);
        return lines[lineNum - 1] || '';
    }

    /**
     * Extract all classical texts for a hexagram
     * @param {Object} hex - Hexagram object
     * @param {string} lang - Language code
     * @returns {Object} { judgment, image, lines }
     */
    static getClassicalTexts(hex, lang = 'en') {
        return {
            judgment: this.getJudgment(hex, lang),
            image: this.getImage(hex, lang),
            lines: this.getLines(hex, lang)
        };
    }

    /**
     * ============================================================================
     * INTERPRETATION EXTRACTION (from API responses)
     * ============================================================================
     */

    /**
     * Extract section content from interpretation object
     * Handles multiple response shapes and normalizes to standard format
     * @param {Object} interpretation - Interpretation object (en/es/it/zh)
     * @param {string} sectionId - Section identifier
     * @returns {Object|null} Extracted content or null
     */
    static extractSection(interpretation, sectionId) {
        if (!interpretation) return null;

        const extractors = {
            classical: (i) => ({
                judgment: this.normalizeText(i.judgment),
                image: this.normalizeText(i.image),
                lines: Array.isArray(i.lines) ? i.lines : 
                       Array.isArray(i.lineTexts) ? i.lineTexts : []
            }),
            
            celestial: (i) => ({
                title: this.normalizeText(i.celestialTitle || i.title),
                narration: this.normalizeText(i.celestialNarration || i.narration),
                technicalData: i.technicalData || i.technical || null
            }),
            
            psychological: (i) => ({
                title: this.normalizeText(i.psychologicalTitle || i.title),
                narrative: this.normalizeText(i.psychologicalNarrative || i.narrative),
                situation: this.normalizeText(i.situation || i.context)
            }),
            
            mythological: (i) => ({
                title: this.normalizeText(i.mythologicalTitle || i.title),
                narrative: this.normalizeText(i.mythologicalNarrative || i.narrative),
                symbols: Array.isArray(i.symbols) ? i.symbols : []
            }),
            
            practical: (i) => ({
                questionAnalysis: this.normalizeText(i.questionAnalysis),
                recommendations: this.extractList(i.recommendations),
                actions: this.extractList(i.actions || i.keyActions)
            }),
            
            overall: (i) => ({
                synthesis: this.normalizeText(i.synthesis || i.overallSynthesis),
                verse: this.normalizeText(i.verse || i.poeticVerse)
            })
        };

        const extractor = extractors[sectionId];
        if (!extractor) {
            // Generic extraction: return all fields that aren't null/undefined
            const content = {};
            for (const [key, value] of Object.entries(interpretation)) {
                if (value !== null && value !== undefined) {
                    content[key] = typeof value === 'string' ? value : 
                                  Array.isArray(value) ? value : 
                                  JSON.stringify(value);
                }
            }
            return Object.keys(content).length > 0 ? content : null;
        }

        return extractor(interpretation);
    }

    /**
     * Extract content from all languages in a result object
     * @param {Object} result - Result with en/es/it/zh keys
     * @param {string} sectionId - Section to extract
     * @returns {Object} Content by language
     */
    static extractSectionAllLanguages(result, sectionId) {
        const content = {};
        for (const lang of this.LANG_PRIORITY) {
            if (result[lang]) {
                const extracted = this.extractSection(result[lang], sectionId);
                if (extracted && Object.keys(extracted).length > 0) {
                    content[lang] = extracted;
                }
            }
        }
        return content;
    }

    /**
     * ============================================================================
     * JSON PARSING UTILITIES
     * ============================================================================
     */

    /**
     * Safely parse JSON with multiple fallback strategies
     * @param {string} text - JSON string to parse
     * @param {*} defaultValue - Default value if parsing fails
     * @returns {*} Parsed object or default
     */
    static safeJsonParse(text, defaultValue = null) {
        if (!text) return defaultValue;
        if (typeof text !== 'string') return text; // Already an object

        // Strategy 1: Direct parse
        try {
            return JSON.parse(text);
        } catch (e) {
            // Continue to next strategy
        }

        // Strategy 2: Strip markdown code fences
        const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeFenceMatch) {
            try {
                return JSON.parse(codeFenceMatch[1].trim());
            } catch (e) {
                // Continue
            }
        }

        // Strategy 3: Extract JSON from between first { and last }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                // Continue
            }
        }

        // Strategy 4: Fix common JSON issues and retry
        const fixed = text
            .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas
            .replace(/'/g, '"')              // Fix single quotes
            .replace(/\n/g, '\\n')           // Escape newlines
            .replace(/\t/g, '\\t');          // Escape tabs
        
        try {
            return JSON.parse(fixed);
        } catch (e) {
            console.warn('[HexagramUtils] All JSON parse strategies failed');
            return defaultValue;
        }
    }

    /**
     * Validate that an object has required keys
     * @param {Object} obj - Object to validate
     * @param {Array} requiredKeys - List of required key paths
     * @returns {boolean} True if all keys present
     */
    static hasRequiredKeys(obj, requiredKeys) {
        if (!obj || typeof obj !== 'object') return false;
        
        return requiredKeys.every(key => {
            const value = this.getPath(obj, key);
            return value !== null && value !== undefined && value !== '';
        });
    }

    /**
     * ============================================================================
     * UTILITY HELPERS
     * ============================================================================
     */

    /**
     * Normalize text value (handle object/string/null)
     * @param {*} value - Value to normalize
     * @returns {string} Normalized string
     */
    static normalizeText(value) {
        if (!value) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'object') {
            // Try to extract text from object
            return value.en || value.text || JSON.stringify(value);
        }
        return String(value);
    }

    /**
     * Extract array from various formats
     * @param {*} value - Value to extract list from
     * @returns {Array} Extracted array
     */
    static extractList(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            // Try to parse as JSON array
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                // Split by newlines or commas
                return value.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
            }
        }
        return [];
    }

    /**
     * Get hexagram name in specified language
     * @param {Object} hex - Hexagram object
     * @param {string} lang - Language code
     * @returns {string} Hexagram name
     */
    static getName(hex, lang = 'en') {
        if (!hex) return '';
        
        const paths = [
            `name.${lang}`,
            `name_${lang}`,
            lang === 'en' ? 'name' : null,
            'chineseName'
        ].filter(Boolean);
        
        for (const path of paths) {
            const value = this.getPath(hex, path);
            if (value) return value;
        }
        
        // Fallback: any name field
        if (hex.name) {
            if (typeof hex.name === 'string') return hex.name;
            return hex.name.en || hex.name.es || hex.name.it || hex.name.zh || '';
        }
        
        return '';
    }

    /**
     * Convert binary key to lines array
     * @param {string} binaryKey - 6-character binary string
     * @returns {Array} Lines array with value, isYang, isChanging
     */
    static binaryToLines(binaryKey) {
        if (!binaryKey || binaryKey.length !== 6) return [];
        
        return binaryKey.split('').reverse().map((bit, idx) => {
            const isYang = bit === '1';
            return {
                position: idx + 1, // 1 = bottom, 6 = top
                value: isYang ? 7 : 8, // 7 = young yang, 8 = young yin
                isYang,
                isChanging: false,
                binary: bit
            };
        });
    }

    /**
     * Convert lines array to binary key
     * @param {Array} lines - Lines array (bottom to top)
     * @returns {string} Binary key
     */
    static linesToBinary(lines) {
        if (!Array.isArray(lines) || lines.length !== 6) return '';
        return lines.map(l => l.binary || (l.isYang ? '1' : '0')).join('');
    }

    /**
     * Calculate changing lines between two hexagrams
     * @param {string} binary1 - First binary key
     * @param {string} binary2 - Second binary key
     * @returns {Array} Array of changing line positions (1-6)
     */
    static getChangingLines(binary1, binary2) {
        if (!binary1 || !binary2 || binary1.length !== 6 || binary2.length !== 6) {
            return [];
        }
        
        const changing = [];
        for (let i = 0; i < 6; i++) {
            if (binary1[i] !== binary2[i]) {
                changing.push(i + 1); // 1-indexed position
            }
        }
        return changing;
    }
}

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HexagramUtils };
}
if (typeof window !== 'undefined') {
    window.HexagramUtils = HexagramUtils;
}
