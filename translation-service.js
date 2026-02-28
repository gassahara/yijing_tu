// Translation Service for Section-Based API Calls with Caching
class TranslationService {
    static CACHE_PREFIX = 'yijing_translations_';
    static CACHE_VERSION = '1.0';

    // Track which sections are currently being translated to avoid duplicate calls
    static activeTranslations = new Map();

    // IntersectionObserver for lazy loading
    static lazyObserver = null;

    // Pending translations queue for lazy loading
    static pendingLazyTranslations = new Map();

    // Section definitions with their translatable fields
    // NOTE: Remedies are NOT included here because the backend already generates
    // them in all languages (en, es, it, zh) in a nested structure.
    // Only interpretation sections need translation via this service.
    static SECTION_CONFIG = {
        celestial: {
            fields: ['celestialTechnical', 'celestialColloquial', 'celestial', 'birthBaziDescription', 'birthBaziImpact', 'currentBaziDescription', 'currentBaziImpact'],
            selector: '[data-translatable-section="celestial"]'
        },
        elements: {
            fields: ['elementsTechnical', 'elementsColloquial', 'elements'],
            selector: '[data-translatable-section="elements"]'
        },
        analysis: {
            fields: ['coreTechnical', 'coreColloquial', 'analysis', 'symbolism'],
            selector: '[data-translatable-section="analysis"]'
        },
        advice: {
            fields: ['advice', 'colloquialInterpretation', 'coreColloquial', 'coreApplication'],
            selector: '[data-translatable-section="advice"]'
        },
        lines: {
            fields: ['movingLines', 'lineTexts'],
            selector: '[data-translatable-section="lines"]'
        },
        houtou: {
            fields: ['houtouTechnical', 'houtouColloquial', 'emperorAnalysis', 'masterAnalysis'],
            selector: '[data-translatable-section="houtou"]'
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
                    console.log(`[TranslationService] Cache hit for ${readingId} (${lang})`);
                    return parsed.translations;
                }
            }
        } catch (e) {
            console.warn('[TranslationService] Cache read error:', e.message);
        }
        return null;
    }

    /**
     * Save translations to cache
     */
    static saveToCache(readingId, lang, translations) {
        try {
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
        if (!config || !interpretation) return null;

        const content = {};
        config.fields.forEach(field => {
            if (interpretation[field] !== undefined) {
                content[field] = interpretation[field];
            }
        });

        return Object.keys(content).length > 0 ? content : null;
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
     * Call the translation API for a section
     */
    static async callTranslateAPI(content, targetLang, hexagramName, sectionId) {
        console.log(`[TranslationService] Calling translate API for ${sectionId}`, Object.keys(content));
        
        const response = await fetch(`${CONFIG.HEXAGRAM_FUNCTION_URL}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,  // Send content directly, not wrapped
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

        // The API returns translated fields directly, not wrapped in sectionId
        const translated = result.data?.translated;
        
        console.log(`[TranslationService] Received translation for ${sectionId}:`, Object.keys(translated || {}));
        
        // Debug: log lineTexts if present
        if (translated?.lineTexts) {
            console.log(`[TranslationService] lineTexts received:`, translated.lineTexts.length, 'items');
        }
        
        return translated || content;
    }

    /**
     * Apply translated content to the interpretation object
     */
    static applyTranslationToInterpretation(interpretation, sectionId, translatedContent, targetLang) {
        if (!translatedContent) return interpretation;

        const config = this.SECTION_CONFIG[sectionId];
        if (!config) return interpretation;

        // Apply to the target language section (e.g., interpretation.es, interpretation.it)
        // Default to root if no targetLang specified (backward compatibility)
        const targetSection = targetLang ? (interpretation[targetLang] || (interpretation[targetLang] = {})) : interpretation;

        config.fields.forEach(field => {
            if (translatedContent[field] !== undefined) {
                targetSection[field] = translatedContent[field];
                // Debug: log when lineTexts is applied
                if (field === 'lineTexts') {
                    console.log(`[TranslationService] Applied lineTexts to ${targetLang}:`, translatedContent[field]?.length, 'items');
                }
            }
        });

        // CRITICAL FIX: lineTexts -> lines mapping for UI compatibility
        // The UI expects 'lines' but the translation API returns 'lineTexts'
        if (sectionId === 'lines' && translatedContent.lineTexts !== undefined) {
            targetSection.lines = translatedContent.lineTexts;
            console.log(`[TranslationService] Mapped lineTexts to lines for ${targetLang}:`, translatedContent.lineTexts?.length, 'items');
        }
        
        // CRITICAL FIX: advice section field name alignment
        // The backend returns 'colloquialInterpretation' but the composed interpretation uses 'coreColloquial'
        if (sectionId === 'advice') {
            if (translatedContent.colloquialInterpretation !== undefined) {
                targetSection.coreColloquial = translatedContent.colloquialInterpretation;
                targetSection.colloquialInterpretation = translatedContent.colloquialInterpretation;
                console.log(`[TranslationService] Applied colloquialInterpretation to both fields for ${targetLang}, length:`, translatedContent.colloquialInterpretation?.length);
            }
            if (translatedContent.coreColloquial !== undefined) {
                targetSection.coreColloquial = translatedContent.coreColloquial;
                targetSection.colloquialInterpretation = translatedContent.coreColloquial;
                console.log(`[TranslationService] Applied coreColloquial to both fields for ${targetLang}, length:`, translatedContent.coreColloquial?.length);
            }
            if (translatedContent.advice !== undefined) {
                console.log(`[TranslationService] Applied advice for ${targetLang}, length:`, translatedContent.advice?.length);
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
     */
    static async translateVisibleSections(readingId, interpretation, targetLang, hexagramName) {
        // Interpretation is the full result object with en, es, it, etc.
        // We need to extract from the English source (interpretation.en)
        const sourceContent = interpretation.en || interpretation;
        
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

        // Find ALL sections that have content (not just visible ones)
        // This ensures we translate everything, even if not currently in viewport
        const sectionsToTranslate = Object.keys(this.SECTION_CONFIG).filter(sectionId => {
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
        // We need to extract from the English source (interpretation.en)
        const sourceContent = interpretation.en || interpretation;
        
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
            const response = await fetch(`${CONFIG.SUPABASE_FUNCTION_URL}/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content,
                    targetLang: targetLang,
                    hexagramName: hexagramName,
                    section: 'classical',
                    isClassical: true  // Flag to indicate this is classical text
                })
            });

            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data?.translated) {
                // Save to cache
                if (!cached) {
                    this.saveToCache(readingId, targetLang, { classical: result.data.translated });
                }
                return result.data.translated;
            }
        } catch (error) {
            console.error('[TranslationService] Classical translation failed:', error);
        }

        return null;
    }
}

// Expose to global scope
window.TranslationService = TranslationService;