// Translation Service for Section-Based API Calls with Caching
class TranslationService {
    static CACHE_PREFIX = 'yijing_translations_';
    static CACHE_VERSION = '1.0';

    /**
     * Find the source language from an interpretation object
     * The 3-tab endpoints generate content directly in the user's language, not always 'en'
     */
    static getSourceLang(obj) {
        if (!obj || typeof obj !== 'object') return 'en';
        
        // Priority order: check languages that are likely to have content
        const langs = ['en', 'es', 'it', 'zh'];
        
        // First pass: find language with substantial content
        for (const lang of langs) {
            const data = obj[lang];
            if (data && typeof data === 'object') {
                // Check for meaningful content (not just empty strings)
                const hasContent = Object.values(data).some(v => 
                    v && (typeof v === 'string' ? v.length > 10 : true)
                );
                if (hasContent) return lang;
            }
        }
        
        // Fallback: return first available key that looks like a language code
        const firstLang = Object.keys(obj).find(k => 
            ['en', 'es', 'it', 'zh'].includes(k) && obj[k] && typeof obj[k] === 'object'
        );
        
        return firstLang || 'en';
    }

    // Track which sections are currently being translated to avoid duplicate calls
    static activeTranslations = new Map();

    // IntersectionObserver for lazy loading
    static lazyObserver = null;

    // Pending translations queue for lazy loading
    static pendingLazyTranslations = new Map();

    // Section definitions with their translatable fields
    // FIXED: Field names now match backend response structure
    // Backend returns: technicalAnalysis, colloquialInterpretation, etc.
    // We map these to frontend field names
    static SECTION_CONFIG = {
        celestial: {
            fields: ['celestialTechnical', 'celestialColloquial', 'celestial', 'birthBaziDescription', 'birthBaziImpact', 'currentBaziDescription', 'currentBaziImpact'],
            frontendFields: ['celestialTechnical', 'celestialColloquial', 'celestial', 'birthBaziDescription', 'birthBaziImpact', 'currentBaziDescription', 'currentBaziImpact'],
            selector: '[data-translatable-section="celestial"]'
        },
        elements: {
            fields: ['elementsTechnical', 'elementsColloquial', 'elements', 'composition', 'trigramRelationship', 'yinYangAnalysis'],
            frontendFields: ['elementsTechnical', 'elementsColloquial', 'elements', 'composition', 'trigramRelationship', 'yinYangAnalysis'],
            selector: '[data-translatable-section="elements"]'
        },
        analysis: {
            fields: ['coreTechnical', 'coreColloquial', 'analysis', 'symbolism'],
            frontendFields: ['coreTechnical', 'coreColloquial', 'analysis', 'symbolism'],
            selector: '[data-translatable-section="analysis"]'
        },
        advice: {
            fields: ['advice', 'application', 'coreColloquial'],
            frontendFields: ['advice', 'application', 'coreColloquial'],
            selector: '[data-translatable-section="advice"]'
        },
        lines: {
            fields: ['movingLines', 'lineTexts'],
            frontendFields: ['movingLines', 'lineTexts'],
            selector: '[data-translatable-section="lines"]'
        },
        houtou: {
            fields: ['houtouTechnical', 'houtouColloquial', 'emperorAnalysis', 'masterAnalysis'],
            frontendFields: ['houtouTechnical', 'houtouColloquial', 'emperorAnalysis', 'masterAnalysis'],
            selector: '[data-translatable-section="houtou"]'
        },
        classical: {
            fields: ['judgment', 'image', 'lines'],
            frontendFields: ['judgment', 'image', 'lines'],
            selector: '[data-translatable-section="classical"]'
        },
        // MD-LDL layout - special handling for structure-aware translation
        mdldl: {
            fields: ['mdlLayout'],
            frontendFields: ['mdlLayout'],
            selector: '[data-md-ldl-container]'
        }
    };

    /**
     * Get cache key for a specific reading and language
     */
    static getCacheKey(readingId, lang) {
        return `${this.CACHE_PREFIX}${readingId}_${lang}`;
    }

    /**
     * Get cached translations for a reading
     */
    static getCachedTranslations(readingId, lang) {
        try {
            const key = this.getCacheKey(readingId, lang);
            const cached = localStorage.getItem(key);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Check cache version
                if (parsed.version === this.CACHE_VERSION) {
                    // Validate that cached translations are not empty
                    const translations = parsed.translations;
                    if (translations && Object.keys(translations).length > 0) {
                        // Check if any section has actual content
                        const hasValidContent = Object.values(translations).some(section => {
                            if (!section) return false;
                            return Object.values(section).some(value =>
                                value && (typeof value === 'string' ? value.length > 10 : true)
                            );
                        });
                        if (hasValidContent) {
                            console.log(`[TranslationService] Cache hit for ${readingId} (${lang})`);
                            return translations;
                        } else {
                            console.log(`[TranslationService] Cache entry empty for ${readingId} (${lang}), clearing`);
                            localStorage.removeItem(key);
                        }
                    } else {
                        console.log(`[TranslationService] Cache entry invalid for ${readingId} (${lang}), clearing`);
                        localStorage.removeItem(key);
                    }
                } else {
                    // Version mismatch, clear old cache
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            console.warn('[TranslationService] Cache read error:', e.message);
        }
        return null;
    }

    /**
     * Save translations to cache (only if they contain actual content)
     */
    static saveToCache(readingId, lang, translations) {
        try {
            // Validate translations before saving
            if (!translations || Object.keys(translations).length === 0) {
                console.log(`[TranslationService] Not saving empty translations for ${readingId} (${lang})`);
                return;
            }

            // Check if any section has actual content
            const hasValidContent = Object.values(translations).some(section => {
                if (!section) return false;
                return Object.values(section).some(value =>
                    value && (typeof value === 'string' ? value.length > 10 : true)
                );
            });

            if (!hasValidContent) {
                console.log(`[TranslationService] Not saving empty translations for ${readingId} (${lang})`);
                return;
            }

            const key = this.getCacheKey(readingId, lang);
            const cacheData = {
                version: this.CACHE_VERSION,
                timestamp: Date.now(),
                readingId,
                lang,
                translations
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
            console.log(`[TranslationService] Saved to cache: ${readingId} (${lang})`);
        } catch (e) {
            console.warn('[TranslationService] Cache write error:', e.message);
        }
    }

    /**
     * Clear old cached translations (keep last 50 readings)
     */
    static clearOldCache() {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith(this.CACHE_PREFIX));
            if (keys.length > 50) {
                const sortedKeys = keys
                    .map(k => ({
                        key: k,
                        data: JSON.parse(localStorage.getItem(k) || '{}')
                    }))
                    .sort((a, b) => (b.data.timestamp || 0) - (a.data.timestamp || 0))
                    .slice(50)
                    .map(item => item.key);

                sortedKeys.forEach(k => localStorage.removeItem(k));
                console.log(`[TranslationService] Cleared ${sortedKeys.length} old cache entries`);
            }
        } catch (e) {
            console.warn('[TranslationService] Cache cleanup error:', e.message);
        }
    }

    /**
     * Check if a section is visible/rendered in the DOM
     */
    static isSectionVisible(sectionId) {
        const config = this.SECTION_CONFIG[sectionId];
        if (!config) return false;

        // First try the marked element
        let element = document.querySelector(config.selector);

        // If not found, look for the section card directly
        if (!element) {
            element = document.querySelector(`.tab-content-card[data-section="${sectionId}"]`);
            if (element) {
                // Mark it for future use
                element.setAttribute('data-translatable-section', sectionId);
            }
        }

        if (!element) return false;

        // Check if element is in viewport or near it
        const rect = element.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight + 100 && rect.bottom > -100;

        return isInViewport && element.offsetParent !== null;
    }

    /**
     * Extract translatable content for a section from the interpretation data
     */
    static extractSectionContent(interpretation, sectionId) {
        const config = this.SECTION_CONFIG[sectionId];
        if (!config || !interpretation) {
            console.log(`[TranslationService] No config or interpretation for ${sectionId}`);
            return null;
        }

        const content = {};
        // Try both backend field names and frontend field names
        const fieldsToCheck = config.fields || [];
        const frontendFields = config.frontendFields || [];

        // Debug: log available fields in interpretation
        const availableFields = Object.keys(interpretation).filter(k =>
            interpretation[k] && (typeof interpretation[k] === 'string' ? interpretation[k].length > 0 : true)
        );

        // SPECIAL HANDLING for MD-LDL section
        if (sectionId === 'mdldl') {
            if (interpretation.mdlLayout && typeof interpretation.mdlLayout === 'string' && interpretation.mdlLayout.length > 100) {
                console.log(`[TranslationService] mdldl: found mdlLayout (${interpretation.mdlLayout.length} chars)`);
                return { mdlLayout: interpretation.mdlLayout };
            }
            return null;
        }

        // SPECIAL HANDLING for classical section - extract text from nested structure
        if (sectionId === 'classical') {
            // Classical texts are stored as {en, es, it, zh} objects
            // Prefer English as translation source — it's far more reliable as source for
            // Spanish/Italian than Classical Chinese, which most LLMs echo back unchanged.
            // Chinese is kept as a secondary fallback only when English is absent.
            if (interpretation.judgment) {
                const judgmentText = typeof interpretation.judgment === 'object'
                    ? (interpretation.judgment.en || interpretation.judgment.zh || '')
                    : interpretation.judgment;
                if (judgmentText) content.judgment = judgmentText;
            }
            if (interpretation.image) {
                const imageText = typeof interpretation.image === 'object'
                    ? (interpretation.image.en || interpretation.image.zh || '')
                    : interpretation.image;
                if (imageText) content.image = imageText;
            }
            if (interpretation.lines) {
                const linesArr = Array.isArray(interpretation.lines)
                    ? interpretation.lines
                    : (interpretation.lines.en || interpretation.lines.zh || []);
                if (Array.isArray(linesArr) && linesArr.length > 0) content.lines = linesArr;
            }

            const foundFields = Object.keys(content);
            if (foundFields.length > 0) {
                console.log(`[TranslationService] classical: found ${foundFields.length} fields`, foundFields);
            }
            return foundFields.length > 0 ? content : null;
        }

        // Check backend field names (e.g., technicalAnalysis)
        fieldsToCheck.forEach(field => {
            if (interpretation[field] !== undefined && interpretation[field] !== '' && interpretation[field] !== null) {
                content[field] = interpretation[field];
            }
        });

        // Check frontend field names (e.g., celestialTechnical)
        frontendFields.forEach(field => {
            if (interpretation[field] !== undefined && interpretation[field] !== '' && interpretation[field] !== null) {
                content[field] = interpretation[field];
            }
        });

        const foundFields = Object.keys(content);
        if (foundFields.length > 0) {
            console.log(`[TranslationService] ${sectionId}: found ${foundFields.length} fields`, foundFields);
        } else {
            console.log(`[TranslationService] ${sectionId}: no content found. Available:`, availableFields.slice(0, 10));
        }

        return foundFields.length > 0 ? content : null;
    }

    /**
     * Translate a specific section via API
     */
    static async translateSection(readingId, sectionId, content, targetLang, hexagramName) {
        const cacheKey = `${readingId}_${sectionId}_${targetLang}`;

        // Check if already translating this section
        if (this.activeTranslations.has(cacheKey)) {
            console.log(`[TranslationService] Translation already in progress for ${sectionId}`);
            return this.activeTranslations.get(cacheKey);
        }

        console.log(`[TranslationService] Translating section: ${sectionId} to ${targetLang}`);

        const translationPromise = this.callTranslateAPI(content, targetLang, hexagramName, sectionId)
            .then(result => {
                this.activeTranslations.delete(cacheKey);
                return result;
            })
            .catch(error => {
                this.activeTranslations.delete(cacheKey);
                throw error;
            });

        this.activeTranslations.set(cacheKey, translationPromise);
        return translationPromise;
    }

    /**
     * Translate MD-LDL layout as a single unit
     * This preserves structure while translating only the content
     */
    static async translateMDLDL(readingId, mdlLayout, targetLang, hexagramName) {
        const cacheKey = `${readingId}_mdldl_${targetLang}`;

        // Check if already translating
        if (this.activeTranslations.has(cacheKey)) {
            console.log(`[TranslationService] MD-LDL translation already in progress`);
            return this.activeTranslations.get(cacheKey);
        }

        console.log(`[TranslationService] Translating MD-LDL layout to ${targetLang} (${mdlLayout.length} chars)`);

        const translationPromise = this.callTranslateMDLDLAPI(mdlLayout, targetLang, hexagramName)
            .then(result => {
                this.activeTranslations.delete(cacheKey);
                return result;
            })
            .catch(error => {
                this.activeTranslations.delete(cacheKey);
                throw error;
            });

        this.activeTranslations.set(cacheKey, translationPromise);
        return translationPromise;
    }

    /**
     * Call the translation API for MD-LDL with retry logic
     */
    static async callTranslateMDLDLAPI(mdlLayout, targetLang, hexagramName, maxRetries = 2) {
        let lastError = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                console.log(`[TranslationService] MD-LDL retry attempt ${attempt}/${maxRetries} in 3 seconds...`);
                await new Promise(r => setTimeout(r, 3000));
            }

            try {
                // Route to the dedicated translation function
                const response = await fetch(CONFIG.TRANSLATE_FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'translate',
                        content: { mdlLayout },  // Wrap in object for API
                        targetLang: targetLang,
                        hexagramName: hexagramName,
                        section: 'mdldl'  // Special section identifier
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
                }

                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error?.message || 'MD-LDL translation failed');
                }

                // Extract the translated layout from the response
                const translated = data.translated;
                if (translated && translated.mdlLayout && translated.mdlLayout.length > 100) {
                    console.log(`[TranslationService] MD-LDL translation received: ${translated.mdlLayout.length} chars`);
                    return translated.mdlLayout;
                } else if (typeof translated === 'string' && translated.length > 100) {
                    // Direct string return (alternative API format)
                    console.log(`[TranslationService] MD-LDL translation received (string): ${translated.length} chars`);
                    return translated;
                } else {
                    throw new Error('Invalid MD-LDL translation response');
                }

            } catch (error) {
                lastError = error;
                console.warn(`[TranslationService] MD-LDL translation attempt ${attempt + 1} failed:`, error.message);
            }
        }

        throw lastError || new Error('MD-LDL translation failed after all retries');
    }

    /**
     * Call the translation API for a section with retry logic
     */
    static async callTranslateAPI(content, targetLang, hexagramName, sectionId, maxRetries = 1) {
        console.log(`[TranslationService] Calling translate API for ${sectionId}`, Object.keys(content));

        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                console.log(`[TranslationService] Retry attempt ${attempt}/${maxRetries} for ${sectionId} in 2 seconds...`);
                await new Promise(r => setTimeout(r, 2000));
            }

            try {
                // Route to the dedicated translation function
                const response = await fetch(CONFIG.TRANSLATE_FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'translate',
                        content: content,
                        targetLang: targetLang,
                        hexagramName: hexagramName,
                        section: sectionId
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Translation API error: ${response.status} - ${errorText}`);
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error?.message || 'Translation failed');
                }

                // The API returns translated fields directly (result.translated for new function,
                // result.data.translated for legacy — support both)
                const translated = result.translated ?? result.data?.translated;

                console.log(`[TranslationService] Received translation for ${sectionId}:`, Object.keys(translated || {}));

                // Debug: log lineTexts if present
                if (translated?.lineTexts) {
                    console.log(`[TranslationService] lineTexts received:`, translated.lineTexts.length, 'items');
                }

                // Echo-detection: check that at least one string field actually changed.
                // If the API echoed the source content back unchanged, discard the result.
                if (translated && typeof content === 'object') {
                    const normalizeWS = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
                    const hasActualTranslation = Object.keys(translated).some(key => {
                        const src = content[key];
                        const tgt = translated[key];
                        if (typeof src === 'string' && typeof tgt === 'string' && src.length > 5) {
                            return normalizeWS(tgt) !== normalizeWS(src);
                        }
                        // For arrays (lines), compare first element
                        if (Array.isArray(src) && Array.isArray(tgt) && src.length > 0 && tgt.length > 0) {
                            return normalizeWS(String(tgt[0])) !== normalizeWS(String(src[0]));
                        }
                        return true; // non-string fields pass through
                    });
                    if (!hasActualTranslation) {
                        console.warn(`[TranslationService] Echo detected for section '${sectionId}' — translation API returned source unchanged, discarding`);
                        return content; // return original so UI can fall back to English
                    }
                }

                return translated || content;

            } catch (error) {
                console.warn(`[TranslationService] Attempt ${attempt + 1} failed for ${sectionId}:`, error.message);
                lastError = error;
                // Only retry on 500s or network errors (not 400s)
                if (error.message.includes('400') || error.message.includes('403')) {
                    throw error;
                }
            }
        }

        throw lastError;
    }

    /**
     * Apply translated content to the interpretation object
     */
    static applyTranslationToInterpretation(interpretation, sectionId, translatedContent, targetLang) {
        if (!translatedContent) return interpretation;

        const config = this.SECTION_CONFIG[sectionId];
        if (!config) return interpretation;

        // Apply to the target language section (e.g., interpretation.es, interpretation.it)
        const targetSection = targetLang ? (interpretation[targetLang] || (interpretation[targetLang] = {})) : interpretation;

        // Build field mapping: backend field -> frontend field
        const fieldMapping = {};
        if (config.fields && config.frontendFields) {
            config.fields.forEach((backendField, index) => {
                const frontendField = config.frontendFields[index];
                if (frontendField && backendField !== frontendField) {
                    fieldMapping[backendField] = frontendField;
                }
            });
        }

        // CRITICAL FIX: Clear fields that will be translated to avoid English fallback
        // The backend pre-populates all language sections with English content
        // We need to clear them so translated content takes precedence
        const fieldsToClear = Object.entries(translatedContent)
            .filter(([_, value]) => value !== undefined && value !== null && value !== '' &&
                (typeof value === 'string' ? value.length > 0 : (Array.isArray(value) ? value.length > 0 : true)))
            .map(([backendField, _]) => fieldMapping[backendField] || backendField);

        if (fieldsToClear.length > 0) {
            console.log(`[TranslationService] Clearing ${fieldsToClear.length} fields in ${targetLang} before translation:`, fieldsToClear);
            fieldsToClear.forEach(field => delete targetSection[field]);
        }

        // Apply translated content with field name mapping
        const appliedFields = [];
        Object.entries(translatedContent).forEach(([backendField, value]) => {
            const frontendField = fieldMapping[backendField] || backendField;
            // Check for valid value (string with length or non-empty array)
            const hasValue = value !== undefined && value !== null && value !== '' &&
                (typeof value === 'string' ? value.length > 0 : (Array.isArray(value) ? value.length > 0 : true));
            if (hasValue) {
                targetSection[frontendField] = value;
                appliedFields.push(frontendField);
            }
        });

        if (appliedFields.length > 0) {
            console.log(`[TranslationService] Applied section '${sectionId}' to ${targetLang}:`, appliedFields);
        }

        // CRITICAL FIX: lineTexts -> lines mapping for UI compatibility
        if (sectionId === 'lines' && (translatedContent.lineTexts !== undefined || targetSection.lineTexts !== undefined)) {
            targetSection.lines = translatedContent.lineTexts || targetSection.lineTexts;
            console.log(`[TranslationService] Mapped lineTexts to lines for ${targetLang}:`, targetSection.lines?.length, 'items');
        }
        
        // CRITICAL FIX: classical section lines -> lines mapping
        if (sectionId === 'classical' && translatedContent.lines !== undefined) {
            targetSection.lines = translatedContent.lines;
            console.log(`[TranslationService] Mapped classical lines for ${targetLang}:`, targetSection.lines?.length, 'items');
        }

        // CRITICAL FIX: advice section field name alignment
        if (sectionId === 'advice') {
            if (targetSection.colloquialInterpretation !== undefined) {
                targetSection.coreColloquial = targetSection.colloquialInterpretation;
                console.log(`[TranslationService] Synced colloquialInterpretation to coreColloquial for ${targetLang}`);
            }
            if (targetSection.coreColloquial !== undefined && !targetSection.colloquialInterpretation) {
                targetSection.colloquialInterpretation = targetSection.coreColloquial;
            }
        }

        // CRITICAL FIX: Parse translated MD-LDL layout
        if (sectionId === 'mdldl' && targetSection.mdlLayout && typeof LayoutLanguage !== 'undefined') {
            try {
                targetSection.mdlParsed = LayoutLanguage.parse(targetSection.mdlLayout);
                console.log(`[TranslationService] Parsed translated MD-LDL for ${targetLang}`);
            } catch (e) {
                console.warn(`[TranslationService] Failed to parse translated MD-LDL:`, e.message);
            }
        }

        return interpretation;
    }

    /**
     * Mark elements as translatable with data attributes
     * Call this after rendering sections
     */
    static markTranslatableElements() {
        // Mark celestial section
        const celestialPanel = document.getElementById('lunarMansionPanel');
        if (celestialPanel) {
            celestialPanel.setAttribute('data-translatable-section', 'celestial');
        }

        // Mark elements section
        const equilibriumPanel = document.getElementById('equilibriumPanel');
        if (equilibriumPanel) {
            equilibriumPanel.setAttribute('data-translatable-section', 'elements');
        }

        // Mark core section
        const aiPanel = document.getElementById('aiInterpretationPanel');
        if (aiPanel) {
            const coreContent = aiPanel.querySelector('.core-interpretation');
            if (coreContent) {
                coreContent.setAttribute('data-translatable-section', 'core');
            }
        }

        // Mark lines section
        const movingLinesPanel = document.getElementById('movingLinesPanel');
        if (movingLinesPanel) {
            movingLinesPanel.setAttribute('data-translatable-section', 'lines');
        }

        // Mark remedies section
        const remediesPanel = document.getElementById('remediesPanel');
        if (remediesPanel) {
            remediesPanel.setAttribute('data-translatable-section', 'remedies');
        }
    }

    /**
     * Translate all sections for a reading
     * This is the main entry point
     * 
     * MD-LDL OPTIMIZATION: If source has mdlLayout, translate entire layout in ONE call
     * instead of section-by-section. This preserves structure and reduces API calls.
     */
    static async translateVisibleSections(readingId, interpretation, targetLang, hexagramName) {
        // Interpretation is the full result object with en, es, it, etc.
        // Find source language dynamically (not always 'en')
        const sourceLang = this.getSourceLang(interpretation);
        const sourceContent = interpretation[sourceLang] || interpretation;

        // Check cache first
        const cached = this.getCachedTranslations(readingId, targetLang);
        if (cached) {
            console.log(`[TranslationService] Using cached translations for ${readingId}`);
            // Apply cached translations to interpretation
            Object.keys(cached).forEach(sectionId => {
                this.applyTranslationToInterpretation(interpretation, sectionId, cached[sectionId], targetLang);
            });
            return interpretation;
        }

        // MD-LDL OPTIMIZATION: Check if we have MD-LDL layout to translate as single unit
        if (sourceContent.mdlLayout && sourceContent.mdlLayout.length > 100) {
            console.log(`[TranslationService] MD-LDL detected! Translating entire layout in ONE call...`);
            try {
                const translatedLayout = await this.translateMDLDL(
                    readingId,
                    sourceContent.mdlLayout,
                    targetLang,
                    hexagramName
                );
                
                // Apply the translated MD-LDL to target language
                const targetSection = interpretation[targetLang] || (interpretation[targetLang] = {});
                targetSection.mdlLayout = translatedLayout;
                
                // Parse the translated layout
                if (typeof LayoutLanguage !== 'undefined') {
                    try {
                        targetSection.mdlParsed = LayoutLanguage.parse(translatedLayout);
                        console.log(`[TranslationService] Parsed translated MD-LDL for ${targetLang}`);
                    } catch (e) {
                        console.warn(`[TranslationService] Failed to parse translated MD-LDL:`, e.message);
                    }
                }
                
                // Save to cache
                this.saveToCache(readingId, targetLang, { mdldl: { mdlLayout: translatedLayout } });
                this.clearOldCache();
                
                console.log(`[TranslationService] MD-LDL translation complete for ${targetLang}`);
                return interpretation;
            } catch (error) {
                console.error(`[TranslationService] MD-LDL translation failed:`, error);
                console.log(`[TranslationService] Falling back to section-by-section translation...`);
            }
        }

        // FALLBACK: Traditional section-by-section translation (for non-MD-LDL content)
        const sectionsToTranslate = Object.keys(this.SECTION_CONFIG).filter(sectionId => {
            // Skip MD-LDL section if we're doing fallback (it would have been handled above)
            if (sectionId === 'mdldl') return false;
            
            // Check if this section has content to translate (from English source)
            const content = this.extractSectionContent(sourceContent, sectionId);
            const hasContent = content && Object.keys(content).length > 0 &&
                Object.values(content).some(v => v && (typeof v === 'string' ? v.length > 0 : true));
            if (hasContent) {
                console.log(`[TranslationService] Section ${sectionId} has content to translate`);
            }
            return hasContent;
        });

        if (sectionsToTranslate.length === 0) {
            console.log('[TranslationService] No sections with content to translate');
            return interpretation;
        }

        console.log(`[TranslationService] Translating ${sectionsToTranslate.length} sections sequentially:`, sectionsToTranslate);

        // Translate sections sequentially to avoid NS_BINDING_ABORTED
        const translationResults = {};
        for (const sectionId of sectionsToTranslate) {
            const content = this.extractSectionContent(sourceContent, sectionId);
            try {
                const translated = await this.translateSection(
                    readingId,
                    sectionId,
                    content,
                    targetLang,
                    hexagramName
                );
                translationResults[sectionId] = translated;
                this.applyTranslationToInterpretation(interpretation, sectionId, translated, targetLang);

                // Small delay between sections
                await new Promise(r => setTimeout(r, 300));
            } catch (error) {
                console.error(`[TranslationService] Failed to translate ${sectionId}:`, error);
            }
        }

        // Save to cache
        this.saveToCache(readingId, targetLang, translationResults);
        this.clearOldCache();

        return interpretation;
    }

    /**
     * Translate a specific section on demand (e.g., when user expands it)
     */
    static async translateSectionOnDemand(readingId, sectionId, interpretation, targetLang, hexagramName) {
        // Interpretation is the full result object with en, es, it, etc.
        // Find source language dynamically (not always 'en')
        const sourceLang = this.getSourceLang(interpretation);
        const sourceContent = interpretation[sourceLang] || interpretation;

        // Check if already in cache
        const cached = this.getCachedTranslations(readingId, targetLang);
        if (cached && cached[sectionId]) {
            console.log(`[TranslationService] Using cached translation for ${sectionId}`);
            this.applyTranslationToInterpretation(interpretation, sectionId, cached[sectionId], targetLang);
            return interpretation;
        }

        const content = this.extractSectionContent(sourceContent, sectionId);
        if (!content) {
            console.warn(`[TranslationService] No content found for section ${sectionId}`);
            return interpretation;
        }

        try {
            const translated = await this.translateSection(
                readingId,
                sectionId,
                content,
                targetLang,
                hexagramName
            );

            // Update cache
            const existingCache = this.getCachedTranslations(readingId, targetLang) || {};
            existingCache[sectionId] = translated;
            this.saveToCache(readingId, targetLang, existingCache);

            this.applyTranslationToInterpretation(interpretation, sectionId, translated, targetLang);
            return interpretation;
        } catch (error) {
            console.error(`[TranslationService] Failed to translate ${sectionId}:`, error);
            return interpretation;
        }
    }

    /**
     * Check if a reading has cached translations for a language
     */
    static hasCachedTranslation(readingId, lang) {
        return this.getCachedTranslations(readingId, lang) !== null;
    }

    /**
     * Initialize lazy loading observer for on-demand translations
     */
    static initLazyObserver(readingId, interpretation, targetLang, hexagramName) {
        // Clean up existing observer
        if (this.lazyObserver) {
            this.lazyObserver.disconnect();
        }

        // Clear pending translations
        this.pendingLazyTranslations.clear();

        // Create new observer
        this.lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.getAttribute('data-translatable-section');
                    if (sectionId && !this.pendingLazyTranslations.has(sectionId)) {
                        // Check if already cached
                        const cached = this.getCachedTranslations(readingId, targetLang);
                        if (!cached || !cached[sectionId]) {
                            console.log(`[TranslationService] Section ${sectionId} became visible, scheduling translation`);
                            this.pendingLazyTranslations.set(sectionId, true);

                            // Debounce - wait a bit to avoid rapid translations
                            setTimeout(() => {
                                if (this.pendingLazyTranslations.has(sectionId)) {
                                    this.translateSectionOnDemand(
                                        readingId,
                                        sectionId,
                                        interpretation,
                                        targetLang,
                                        hexagramName
                                    ).then(() => {
                                        // Re-render the section with new translations
                                        if (typeof UI !== 'undefined' && UI.renderAIInterpretation) {
                                            UI.renderAIInterpretation(interpretation, targetLang);
                                        }
                                    }).catch(err => {
                                        console.warn(`[TranslationService] Lazy translation failed for ${sectionId}:`, err);
                                    }).finally(() => {
                                        this.pendingLazyTranslations.delete(sectionId);
                                    });
                                }
                            }, 500);
                        }
                    }
                }
            });
        }, {
            root: null,
            rootMargin: '100px', // Start loading when section is 100px from viewport
            threshold: 0.1
        });

        // Observe all translatable sections
        Object.keys(this.SECTION_CONFIG).forEach(sectionId => {
            const config = this.SECTION_CONFIG[sectionId];
            const elements = document.querySelectorAll(config.selector);
            elements.forEach(el => {
                // Only observe if not already cached
                const cached = this.getCachedTranslations(readingId, targetLang);
                if (!cached || !cached[sectionId]) {
                    this.lazyObserver.observe(el);
                }
            });
        });
    }

    /**
     * Stop lazy loading observer
     */
    static stopLazyObserver() {
        if (this.lazyObserver) {
            this.lazyObserver.disconnect();
            this.lazyObserver = null;
        }
        this.pendingLazyTranslations.clear();
    }

    /**
     * Clear all translation caches
     */
    static clearAllCaches() {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith(this.CACHE_PREFIX));
            keys.forEach(k => localStorage.removeItem(k));
            console.log(`[TranslationService] Cleared ${keys.length} translation caches`);
        } catch (e) {
            console.error('[TranslationService] Error clearing caches:', e);
        }
    }

    /**
     * Translate classical texts (judgment, image, lines) to target language
     * This is called when pre-translated texts are not available in the database
     */
    static async translateClassicalTexts(readingId, hexData, targetLang, hexagramName) {
        const cacheKey = `${readingId}_classical_${targetLang}`;

        // Check cache first
        const cached = this.getCachedTranslations(readingId, targetLang);
        if (cached && cached.classical) {
            console.log(`[TranslationService] Using cached classical translations`);
            return cached.classical;
        }

        // Prepare content for translation
        const content = {
            judgment: hexData.judgment_zh || '',
            image: hexData.image?.image_zh || '',
            lines: hexData.lines_zh || []
        };

        // Check if we actually need translation
        const needsTranslation = targetLang !== 'zh' && (
            !hexData[`judgment_${targetLang}`] ||
            !hexData.image?.[`image_${targetLang}`] ||
            !hexData[`lines_${targetLang}`]?.every(l => l && l.trim().length > 5)
        );

        if (!needsTranslation) {
            console.log(`[TranslationService] Classical texts already available in ${targetLang}`);
            return null;
        }

        console.log(`[TranslationService] Translating classical texts to ${targetLang}...`);

        try {
            const response = await fetch(CONFIG.TRANSLATE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'translate',
                    content: content,
                    targetLang: targetLang,
                    hexagramName: hexagramName,
                    section: 'classical'
                })
            });

            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }

            const result = await response.json();
            // Support both new function shape (result.translated) and legacy (result.data.translated)
            const translatedData = result.translated ?? result.data?.translated;

            if (result.success && translatedData) {
                // Save to cache
                if (!cached) {
                    this.saveToCache(readingId, targetLang, { classical: translatedData });
                }
                return translatedData;
            }
        } catch (error) {
            console.error('[TranslationService] Classical translation failed:', error);
        }

        return null;
    }

    /**
     * Translate and format a single text string.
     * ALL languages including English go through the API for proper formatting/styling.
     * The API handles both translation (if needed) AND beautifying.
     * 
     * @param {string} text - The text to translate/format
     * @param {string} targetLang - Target language code ('en', 'es', 'it', 'zh')
     * @param {string} context - Context hint for translation ('ui_content', 'classical', etc.)
     * @returns {Promise<string>} - Translated/formatted text
     */
    static async translateText(text, targetLang, context = 'ui_content') {
        if (!text || typeof text !== 'string') return text;
        
        // Always call the API for formatting/beautifying, even for English
        // The API handles both translation AND styling
        try {
            const response = await fetch(CONFIG.TRANSLATE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'translate',
                    content: { text },
                    targetLang: targetLang,
                    section: context
                })
            });

            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }

            const result = await response.json();
            const translated = result.translated ?? result.data?.translated;
            
            if (result.success && translated && translated.text) {
                return translated.text;
            }
            
            // Fallback to original text
            return text;
        } catch (error) {
            console.warn('[TranslationService] Text translation failed:', error);
            return text; // Return original on error
        }
    }
}

// Expose to global scope
window.TranslationService = TranslationService;