// Main Application Controller
class App {
    static lang = 'en';
    static currentQuestion = '';
    static currentReading = null;
    static hexagrams = [];
    static config = {
        readingDate: new Date(),
        readingTime: null,
        contextMinutes: 10,
        ziMethod: 'early',
        useAdvancedAstrology: false,
        memoryStartTime: null  // Timestamp when memory was last cleared
    };
    static meditationTimer = null;
    static askAgainSource = null; // Tracks if current reading was invoked via "Ask Again"
    static secondaryAbortController = null; // Global abort controller for secondary pipeline
    static fetchSecondaryEndpointsRunning = false; // Flag to prevent concurrent calls

    // Mobile detection
    static isMobile = window.matchMedia('(max-width: 767px)').matches;
    static isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    static currentFontSize = 20;
    static isHighContrast = false;

    // ============================================================================
    // JSON OPTIMIZER UTILITY - Reduces payload size for API calls
    // ============================================================================

    /**
     * Optimizes JSON payload for API calls by removing unnecessary fields
     * Keeps original data intact, returns reduced copy for transmission
     */
    static optimizeJSONForAPI(data, options = {}) {
        if (!data || typeof data !== 'object') return data;

        const {
            maxStringLength = 500,
            maxArrayLength = 50,
            preserveFields = [],
            removeFields = ['visualData', 'image', 'fdl', 'instructions', 'bottomRows'],
            compactBazi = true,
            compactAstrology = true,
            compactHexagram = true
        } = options;

        const processed = new WeakSet();

        const optimize = (obj, path = '') => {
            if (obj === null || obj === undefined) return obj;
            if (typeof obj !== 'object') {
                if (typeof obj === 'string' && obj.length > maxStringLength) {
                    return obj.substring(0, maxStringLength - 3) + '...';
                }
                return obj;
            }

            if (processed.has(obj)) return '[Circular]';

            // Handle arrays
            if (Array.isArray(obj)) {
                if (obj.length > maxArrayLength) {
                    return [...obj.slice(0, maxArrayLength), `...(${obj.length - maxArrayLength} more)`];
                }
                return obj.map((item, i) => optimize(item, `${path}[${i}]`));
            }

            processed.add(obj);

            // Handle special objects
            const result = {};

            // Compact BaZi objects
            if (compactBazi && (path.includes('Bazi') || obj.strength || obj.year?.stem)) {
                return this.compactBaziObject(obj);
            }

            // Compact Astrology objects
            if (compactAstrology && (path.includes('astrology') || obj.lifeGua || obj.lunarMansion)) {
                return this.compactAstrologyObject(obj);
            }

            // Compact Hexagram objects
            if (compactHexagram && (obj.trigramUpper || obj.trigram_upper || (obj.number && obj.name_en))) {
                return this.compactHexagramObject(obj);
            }

            for (const [key, value] of Object.entries(obj)) {
                // Skip removed fields
                if (removeFields.includes(key) && !preserveFields.includes(key)) continue;

                // Skip empty values
                if (value === '' || value === null || value === undefined) continue;
                if (Array.isArray(value) && value.length === 0) continue;
                if (typeof value === 'object' && Object.keys(value).length === 0) continue;

                result[key] = optimize(value, `${path}.${key}`);
            }

            return result;
        };

        return optimize(data);
    }

    /**
     * Compact BaZi object while preserving essential data for AI analysis
     * Includes all four pillars, day master, and strength information
     */
    static compactBaziObject(bazi) {
        if (!bazi) return undefined;
        
        // Helper to compact a pillar while keeping essential fields
        const compactPillar = (p) => p ? {
            stem: { 
                name: p.stem?.name, 
                element: p.stem?.element, 
                zh: p.stem?.zh 
            },
            branch: { 
                name: p.branch?.name, 
                element: p.branch?.element, 
                zh: p.branch?.zh,
                hidden: p.branch?.hidden
            }
        } : undefined;
        
        return {
            dayMaster: bazi.dayMaster ? {
                stem: bazi.dayMaster.stem,
                element: bazi.dayMaster.element,
                polarity: bazi.dayMaster.polarity
            } : undefined,
            strength: {
                result: bazi.strength?.result,
                yongShen: bazi.strength?.yongShen,
                favorable: bazi.strength?.favorable,
                unfavorable: bazi.strength?.unfavorable
            },
            year: compactPillar(bazi.year),
            month: compactPillar(bazi.month),
            day: compactPillar(bazi.day),
            hour: compactPillar(bazi.hour)
        };
    }

    /**
     * Compact Astrology object while preserving essential data
     */
    static compactAstrologyObject(astro) {
        if (!astro) return undefined;
        return {
            lifeGua: astro.lifeGua ? {
                number: astro.lifeGua.number,
                element: astro.lifeGua.element,
                trigram: astro.lifeGua.trigram
            } : undefined,
            lunarMansion: astro.lunarMansion ? {
                mansion: {
                    name: astro.lunarMansion.mansion?.name,
                    element: astro.lunarMansion.mansion?.element,
                    animal: astro.lunarMansion.mansion?.animal
                },
                degrees: astro.lunarMansion.degrees
            } : undefined,
            houtian: astro.houtian ? {
                lifePalace: astro.houtian.lifePalace,
                lifePalaceTrigram: astro.houtian.lifePalaceTrigram ? {
                    name: astro.houtian.lifePalaceTrigram.name,
                    element: astro.houtian.lifePalaceTrigram.element
                } : undefined
            } : undefined,
            xiantian: astro.xiantian ? {
                upperPosition: astro.xiantian.upperPosition,
                lowerPosition: astro.xiantian.lowerPosition
            } : undefined,
            taiSui: astro.taiSui ? {
                position: astro.taiSui.position,
                year: astro.taiSui.year
            } : undefined
        };
    }

    /**
     * Compact Hexagram object to essential fields only
     */
    static compactHexagramObject(hex) {
        if (!hex) return undefined;
        return {
            number: hex.number,
            name_en: hex.name_en,
            name_zh: hex.name_zh?.charAt(0),
            element: hex.element,
            trigramUpper: hex.trigramUpper || hex.trigram_upper ? {
                name: (hex.trigramUpper || hex.trigram_upper)?.name,
                element: (hex.trigramUpper || hex.trigram_upper)?.element
            } : undefined,
            trigramLower: hex.trigramLower || hex.trigram_lower ? {
                name: (hex.trigramLower || hex.trigram_lower)?.name,
                element: (hex.trigramLower || hex.trigram_lower)?.element
            } : undefined
        };
    }

    /**
     * Get size statistics for debugging
     */
    static getJSONSizeStats(original, optimized) {
        const originalSize = JSON.stringify(original).length;
        const optimizedSize = JSON.stringify(optimized).length;
        const savings = originalSize - optimizedSize;
        const percent = Math.round((savings / originalSize) * 100);
        return { originalSize, optimizedSize, savings, percent };
    }

    static adjustFontSize(delta) {
        this.currentFontSize = Math.max(16, Math.min(this.currentFontSize + delta * 2, 32));
        document.documentElement.style.fontSize = `${this.currentFontSize}px`;
        document.body.style.fontSize = `${this.currentFontSize}px`;
    }

    static toggleHighContrast() {
        this.isHighContrast = !this.isHighContrast;
        document.body.classList.toggle('high-contrast', this.isHighContrast);
        const btn = document.getElementById('contrastToggle');
        if (btn) {
            btn.style.background = this.isHighContrast ? 'var(--gold)' : 'rgba(255,255,255,0.1)';
            btn.style.color = this.isHighContrast ? '#000' : 'var(--text-main)';
        }
    }

    static toggleSingleReadMode() {
        this.isSingleReadMode = !this.isSingleReadMode;
        document.body.classList.toggle('single-read-mode', this.isSingleReadMode);

        // Persist preference
        Storage.set('singleReadMode', this.isSingleReadMode ? '1' : '0');

        // Update both desktop and mobile toggle buttons
        ['singleReadToggle', 'singleReadToggleMobile'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.style.background = this.isSingleReadMode ? 'var(--gold)' : 'rgba(255,255,255,0.1)';
                btn.style.color = this.isSingleReadMode ? '#000' : 'var(--text-main)';
                btn.setAttribute('aria-pressed', this.isSingleReadMode ? 'true' : 'false');
                btn.setAttribute('title', this.isSingleReadMode ? 'Exit Read Mode (Show Tabs)' : 'Enter Read Mode (Hide Tabs)');
            }
        });

        // Manage has-results class based on current reading state
        if (this.isSingleReadMode && this.currentReading) {
            document.body.classList.add('has-results');
        } else if (!this.isSingleReadMode) {
            document.body.classList.remove('has-results');
        }

        // Create or remove the floating exit button
        this._manageReadModeExitButton();

        // When entering read mode, all panels become visible at once.
        // Trigger deferred renders that normally wait for their tab to activate.
        if (this.isSingleReadMode) {
            // Trigger pending remedy diagram renders
            if (typeof UI !== 'undefined' && UI._pendingRemedyRenders) {
                UI._remedyRenderGen = (UI._remedyRenderGen || 0) + 1;
                const gen = UI._remedyRenderGen;
                setTimeout(() => UI._renderPendingRemedies(0, null, gen), 200);
            }
            // Trigger pending Bagua Medicine diagram render
            if (typeof UI !== 'undefined' && UI._pendingBaguaMedicineRender) {
                const { canvasId, canvasId2, fengShui, lang } = UI._pendingBaguaMedicineRender;
                setTimeout(() => {
                    UI.renderBaguaMedicineDiagram(canvasId, fengShui, lang);
                    if (canvasId2) UI.renderBaguaMedicineDiagramXiantian(canvasId2, fengShui, lang);
                }, 200);
            }
            // Trigger pending BaZi diagram render
            if (typeof UI !== 'undefined' && UI._pendingBaziRender) {
                const { birthBaziExtended, currentBaziExtended, lang } = UI._pendingBaziRender;
                setTimeout(() => {
                    UI.renderBaziEnhanced(birthBaziExtended, currentBaziExtended, lang);
                }, 200);
                UI._pendingBaziRender = null;
            }

            // Scroll to top for better reading experience
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * Create or remove the floating exit button for read mode
     */
    static _manageReadModeExitButton() {
        const existingBtn = document.getElementById('readModeExitBtn');

        if (this.isSingleReadMode && !existingBtn) {
            // Create exit button
            const btn = document.createElement('button');
            btn.id = 'readModeExitBtn';
            btn.className = 'read-mode-exit-btn';
            btn.innerHTML = '<span>Exit Read Mode</span>';
            btn.setAttribute('aria-label', 'Exit continuous read mode and show tabs');
            btn.onclick = () => this.toggleSingleReadMode();
            document.body.appendChild(btn);
        } else if (!this.isSingleReadMode && existingBtn) {
            // Remove exit button
            existingBtn.remove();
        }
    }

    static toggleBaziWizard() {
        const wizard = document.getElementById('bazi-wizard');
        if (wizard) {
            wizard.classList.toggle('active');
        }
    }

    static setNow() {
        const dateInput = document.getElementById('readingDate');
        const timeInput = document.getElementById('readingTime');
        const now = new Date();

        if (dateInput) {
            dateInput.valueAsDate = now;
            this.updateReadingDate();
        }

        if (timeInput) {
            const h = now.getHours().toString().padStart(2, '0');
            const m = now.getMinutes().toString().padStart(2, '0');
            timeInput.value = `${h}:${m}`;
            this.updateReadingTime();
        }
    }

    static async init() {
        // Check if UI is available
        if (typeof UI === 'undefined') {
            console.error('[App.init] UI class is not defined. Make sure ui.js is loaded before app.js');
            // Retry after a short delay
            setTimeout(() => App.init(), 100);
            return;
        }

        // Ensure calligraphic fonts are loaded for the renderer
        if (typeof SigilTools !== 'undefined' && SigilTools.ensureSealFontLoaded) {
            SigilTools.ensureSealFontLoaded().catch(err => console.warn('[App] Failed to load seal font:', err));
        }

        // Load data first
        this.hexagrams = await IChingCaster.fetchHexagramData();

        // Load Daoist remedies DB from Supabase gateway (non-blocking)
        this.loadRemediesDB();

        // Initialize UI
        document.getElementById('readingDate').valueAsDate = new Date();
        this.config.readingDate = new Date();

        // Load preferences
        const savedLang = Storage.get('yijingLang') || 'en';
        const savedContext = parseInt(Storage.get('contextMinutes'));
        const savedMemoryStart = Storage.get('memoryStartTime');

        if (!isNaN(savedContext)) {
            this.config.contextMinutes = savedContext;
            document.getElementById('contextMinutes').value = savedContext;
        }

        if (savedMemoryStart) {
            this.config.memoryStartTime = parseInt(savedMemoryStart);
            this.updateMemoryStatus();
        }

        // Restore Single Read Mode preference
        const savedReadMode = Storage.get('singleReadMode');
        if (savedReadMode === '1') {
            this.isSingleReadMode = true;
            document.body.classList.add('single-read-mode');
            ['singleReadToggle', 'singleReadToggleMobile'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.style.background = 'var(--gold)';
                    btn.style.color = '#000';
                    btn.setAttribute('aria-pressed', 'true');
                    btn.setAttribute('title', 'Exit Read Mode (Show Tabs)');
                }
            });
            // Create exit button
            this._manageReadModeExitButton();
        }

        // Permanently select Oscuro Vacio (dark)
        this.applyTheme('dark');

        this.setLanguage(savedLang);
        this.renderJournal();

        // Initialize Feng Shui visual effects (safely check if UI is available)
        if (typeof UI !== 'undefined' && UI.initFengShui) {
            UI.initFengShui();
        }

        // Initialize mobile features
        this.initMobileFeatures();

        // Listen for resize events to update mobile state
        window.addEventListener('resize', () => {
            this.isMobile = window.matchMedia('(max-width: 767px)').matches;
        });

        // Close BaZi wizard on outside click
        document.addEventListener('mousedown', (e) => {
            const wizard = document.getElementById('bazi-wizard');
            const content = document.querySelector('.bazi-wizard-content');
            if (wizard && wizard.classList.contains('active') && content && !content.contains(e.target)) {
                this.toggleBaziWizard();
            }
        });
    }

    static async loadRemediesDB() {
        try {
            // Use new dedicated remedies endpoint (v2.1+)
            const remediesUrl = CONFIG.REMEDIES_FUNCTION_URL ?
                `${CONFIG.REMEDIES_FUNCTION_URL}/remedies-db` :
                `${CONFIG.HEXAGRAM_FUNCTION_URL}/remedies-db`;
            const res = await fetch(remediesUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const envelope = await res.json();
            // Gateway wraps the DB in createSuccessResponse: { success, data, meta }
            const data = envelope.data ?? envelope;
            window.DAOIST_REMEDIES_DB = data;
            console.log('[App] DAOIST_REMEDIES_DB loaded from gateway. Keys:', Object.keys(data));
        } catch (err) {
            console.warn('[App] Failed to load DAOIST_REMEDIES_DB from gateway:', err.message);
        }
    }

    static initMobileFeatures() {
        // Prevent zoom on double-tap for iOS
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Add touch feedback for buttons
        if (this.isTouch) {
            document.querySelectorAll('button, .trigram-card, .question-item, .history-card').forEach(el => {
                el.addEventListener('touchstart', () => {
                    el.style.transform = 'scale(0.98)';
                }, { passive: true });

                el.addEventListener('touchend', () => {
                    el.style.transform = '';
                }, { passive: true });
            });
        }

        // Optimize meditation timer for mobile (shorter duration)
        if (this.isMobile) {
            console.log('[Mobile] Mobile device detected - optimized touch targets and shorter meditation');
        }
    }

    static toggleMobileMenu() {
        const menu = document.getElementById('mobile-menu');
        if (menu) {
            menu.classList.toggle('active');
            // Prevent body scroll when menu is open
            document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
        }
    }

    static async setLanguage(lang) {
        this.lang = lang;
        Storage.set('yijingLang', lang);

        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        const input = document.getElementById('questionInput');
        if (input && I18N[lang]) input.placeholder = I18N[lang].questionPlaceholder || 'Enter your inquiry...';

        // Update dynamic content if reading exists
        if (this.currentReading) {
            const hexTitle = document.querySelector('.hexagram-title');
            if (hexTitle) {
                const hex = this.currentReading.hex;
                hexTitle.textContent = `${hex.number}. ${hex['name_' + lang] || hex.name_en}`;
            }

            const fullData = this.hexagrams.find(h => h.number === this.currentReading.hex.number);
            if (fullData && typeof UI !== 'undefined') {
                // Re-render hexagram to update button labels
                UI.renderHexagram(this.currentReading.lines, this.currentReading.binaryKey, fullData, lang);
                UI.renderGraphicalSummary(this.currentReading, lang);
                UI.renderChineseText(fullData, lang);
                UI.renderTranslation(fullData, lang, this.currentReading.interpretation);
            }

            // Check if we need to fetch translation for the new language
            // Find source language dynamically (not always 'en')
            const sourceLang = this.getSourceLang(this.currentReading?.interpretation);
            const needsTranslation = lang !== sourceLang &&
                this.currentReading.interpretation &&
                (this.currentReading.interpretation[lang]?.analysis === this.currentReading.interpretation[sourceLang]?.analysis ||
                    !this.currentReading.interpretation[lang]?.analysis);

            // Collect translation promises to wait for completion
            const translationPromises = [];

            if (needsTranslation) {
                // First render source language interpretation so sections exist for translation service to find
                if (this.currentReading.interpretation && typeof UI !== 'undefined') {
                    UI.renderInterpretationTabbed(this.currentReading.interpretation, sourceLang, this.currentReading);
                    UI.initReadingTabs();
                }
                // Trigger main translation (interpretation + bagua medicine)
                // This handles its own loading animation
                translationPromises.push(this.fetchTranslationForLanguageChange(lang));

                // Remedy translation is not handled by fetchTranslationForLanguageChange, do it here
                if (this.currentReading.interpretation?.remedies && lang !== sourceLang) {
                    const hasRemedyTranslations = this.currentReading.interpretation.remedies[lang]?.remedies?.length > 0;
                    if (!hasRemedyTranslations) {
                        console.log(`[App.setLanguage] Remedy translations missing for ${lang}, triggering translation...`);
                        translationPromises.push(
                            this.translateRemediesForLanguage(lang).then(() => {
                                console.log(`[App.setLanguage] Remedy translation complete for ${lang}, re-rendering...`);
                                if (this.currentReading?.interpretation?.remedies) {
                                    UI.renderRemediesTabbed(this.currentReading.interpretation.remedies, lang);
                                }
                            }).catch(err => {
                                console.warn(`[App.setLanguage] Remedy translation failed for ${lang}:`, err);
                            })
                        );
                    }
                }
            } else if (this.currentReading.interpretation && typeof UI !== 'undefined') {
                // We already have translations, just render
                UI.renderInterpretationTabbed(this.currentReading.interpretation, lang, this.currentReading);
                UI.initReadingTabs();

                // Re-render remedies with new language
                if (this.currentReading.interpretation.remedies) {
                    UI.renderRemediesTabbed(this.currentReading.interpretation.remedies, lang);

                    // Check if we need to translate remedies for this language
                    const hasRemedyTranslations = this.currentReading.interpretation.remedies[lang]?.remedies?.length > 0;
                    if (!hasRemedyTranslations && lang !== 'en') {
                        console.log(`[App.setLanguage] Remedy translations missing for ${lang}, triggering translation...`);
                        // Show loading animation
                        const t = I18N[lang] || I18N['en'];
                        UI.renderAILoading(lang, t.translating || 'Translating...');
                        translationPromises.push(
                            this.translateRemediesForLanguage(lang).then(() => {
                                console.log(`[App.setLanguage] Remedy translation complete for ${lang}, re-rendering...`);
                                if (this.currentReading?.interpretation?.remedies) {
                                    UI.renderRemediesTabbed(this.currentReading.interpretation.remedies, lang);
                                }
                            }).catch(err => {
                                console.warn(`[App.setLanguage] Remedy translation failed for ${lang}:`, err);
                            })
                        );
                    }
                }

                // Re-render bagua medicine with new language
                if (this.currentReading.interpretation.baguaMedicine) {
                    const hasBaguaTranslations = this.currentReading.interpretation.baguaMedicine[lang]?.fengShui ||
                        this.currentReading.interpretation.baguaMedicine[lang]?.medicine;
                    if (!hasBaguaTranslations && lang !== 'en') {
                        console.log(`[App.setLanguage] Bagua Medicine translations missing for ${lang}, triggering translation...`);
                        // Show loading animation if not already showing
                        if (translationPromises.length === 0) {
                            const t = I18N[lang] || I18N['en'];
                            UI.renderAILoading(lang, t.translating || 'Translating...');
                        }
                        UI.renderBaguaMedicineLoading(lang);
                        translationPromises.push(
                            this.translateBaguaMedicineForLanguage(lang).then(() => {
                                console.log(`[App.setLanguage] Bagua Medicine translation complete for ${lang}, re-rendering...`);
                                if (this.currentReading?.interpretation?.baguaMedicine) {
                                    UI.renderBaguaMedicine(this.currentReading.interpretation.baguaMedicine, lang);
                                }
                            }).catch(err => {
                                console.warn(`[App.setLanguage] Bagua Medicine translation failed for ${lang}:`, err);
                                UI.renderBaguaMedicineError(lang);
                            })
                        );
                    } else {
                        // Render immediately if we already have translations
                        UI.renderBaguaMedicine(this.currentReading.interpretation.baguaMedicine, lang);
                    }
                }
            } else if (typeof UI !== 'undefined') {
                UI.renderAILoading(lang);
            }

            // Re-render Analysis tab with new language (astrology data only shown there)
            this.renderAnalysisTab();

            // Translate astrology tab dynamic text (DOM-based translation for non-English)
            // This must run AFTER renderAnalysisTab() since it re-renders the DOM
            if (lang !== 'en') {
                this.translateAstrologyTab(lang);
            }

            // Wait for all translations to complete before hiding loading
            if (translationPromises.length > 0) {
                console.log(`[App.setLanguage] Waiting for ${translationPromises.length} translation(s) to complete...`);
                await Promise.all(translationPromises);
                console.log('[App.setLanguage] All translations completed');
                // Hide loading animation after all translations complete
                UI.hideAILoading();
            }
        }

        // Translate static elements with data-i18n (do this AFTER dynamic content is rendered)
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (I18N[lang] && I18N[lang][key]) {
                if (key === 'meditationText') {
                    el.innerHTML = I18N[lang][key];
                } else {
                    el.textContent = I18N[lang][key];
                }
            }
        });

        // Translate select options
        document.querySelectorAll('select option[data-i18n]').forEach(opt => {
            const key = opt.dataset.i18n;
            if (I18N[lang] && I18N[lang][key]) {
                opt.textContent = I18N[lang][key];
            }
        });

        // Update journal section
        this.renderJournal();

        // Update Bagua strip labels (safely check if UI is available)
        if (typeof UI !== 'undefined' && UI.renderBaguaStrip) {
            UI.renderBaguaStrip(lang);
        }

        // Update memory status display
        this.updateMemoryStatus();
    }

    // Fetch translation when user changes language on an existing reading
    static async fetchTranslationForLanguageChange(targetLang) {
        // Use dynamic source language instead of hardcoded 'en'
        const sourceLang = this.getSourceLang(this.currentReading?.interpretation);
        if (!this.currentReading?.interpretation?.[sourceLang]) return;

        const t = I18N[targetLang] || I18N['en'];
        UI.renderAILoading(targetLang, t.translating || 'Translating...');

        try {
            // Use the new TranslationService for section-based translation
            const readingId = this.currentReading.requestTimestamp;
            const hexagramName = `${this.currentReading.hex.name_en} (${this.currentReading.hex.name_zh})`;

            // First, check if we have cached translations
            const hasCache = TranslationService.hasCachedTranslation(readingId, targetLang);

            if (hasCache) {
                console.log('[LANG_CHANGE] Using cached translations');
                // Apply cached translations
                const cached = TranslationService.getCachedTranslations(readingId, targetLang);
                Object.keys(cached).forEach(sectionId => {
                    TranslationService.applyTranslationToInterpretation(
                        this.currentReading.interpretation,
                        sectionId,
                        cached[sectionId],
                        targetLang
                    );
                });
            } else {
                console.log('[LANG_CHANGE] Translating visible sections...');
                // Translate only visible sections
                await TranslationService.translateVisibleSections(
                    readingId,
                    this.currentReading.interpretation,
                    targetLang,
                    hexagramName
                );
            }

            // Mark translatable elements
            TranslationService.markTranslatableElements();

            // Re-render interpretation with new translations
            UI.renderInterpretationTabbed(this.currentReading.interpretation, targetLang, this.currentReading);
            UI.initReadingTabs();

            // Re-render classical text sections (judgment, image, line texts) with translations
            const fullHexData = this.hexagrams?.find(h => h.number === this.currentReading?.hex?.number);
            if (fullHexData) {
                UI.renderTranslation(fullHexData, targetLang, this.currentReading.interpretation);
            }

            // Initialize lazy observer for sections not yet translated
            TranslationService.initLazyObserver(
                readingId,
                this.currentReading.interpretation,
                targetLang,
                hexagramName
            );

            // Re-render remedies with new language (remedies already have all languages from backend)
            if (this.currentReading.interpretation.remedies) {
                UI.renderRemediesTabbed(this.currentReading.interpretation.remedies, targetLang);
            }

            // Translate astrology tab if it is rendered
            this.translateAstrologyTab(targetLang);

            // Collect all async translation promises
            const translationPromises = [];

            // Re-render bagua medicine with new language
            if (this.currentReading.interpretation.baguaMedicine) {
                const hasBaguaTranslations = this.currentReading.interpretation.baguaMedicine[targetLang]?.fengShui ||
                    this.currentReading.interpretation.baguaMedicine[targetLang]?.medicine;
                if (!hasBaguaTranslations && targetLang !== sourceLang) {
                    console.log(`[LANG_CHANGE] Bagua Medicine translations missing for ${targetLang}, triggering translation...`);
                    // Show loading state first
                    UI.renderBaguaMedicineLoading(targetLang);
                    // Add to promises to wait for completion
                    translationPromises.push(
                        this.translateBaguaMedicineForLanguage(targetLang).then(() => {
                            if (this.currentReading?.interpretation?.baguaMedicine) {
                                UI.renderBaguaMedicine(this.currentReading.interpretation.baguaMedicine, targetLang);
                            }
                        }).catch(err => {
                            console.warn(`[LANG_CHANGE] Bagua Medicine translation failed for ${targetLang}:`, err);
                            UI.renderBaguaMedicineError(targetLang);
                        })
                    );
                } else {
                    // Render immediately if we already have translations
                    UI.renderBaguaMedicine(this.currentReading.interpretation.baguaMedicine, targetLang);
                }
            }

            // Wait for all translations to complete before hiding loading
            if (translationPromises.length > 0) {
                console.log(`[LANG_CHANGE] Waiting for ${translationPromises.length} translation(s) to complete...`);
                await Promise.all(translationPromises);
                console.log('[LANG_CHANGE] All translations completed');
            }

            // Note: UI.hideAILoading() is called by setLanguage after all translations complete

            // Update storage with new translation
            const history = Storage.getJSON('iChingHistory');
            const idx = history.findIndex(h => h.requestTimestamp === this.currentReading.requestTimestamp);
            if (idx !== -1) {
                history[idx].interpretation = this.currentReading.interpretation;
                Storage.setJSON('iChingHistory', history);
            }
        } catch (e) {
            console.warn('[LANG_CHANGE] Translation failed:', e.message);
            // Fallback to legacy translation method
            console.log('[LANG_CHANGE] Falling back to legacy translation');
            try {
                const result = await this.translateToLanguage(
                    this.currentReading.requestTimestamp,
                    this.currentReading.interpretation,
                    targetLang,
                    `${this.currentReading.hex.name_en} (${this.currentReading.hex.name_zh})`
                );
                this.currentReading.interpretation = result;
                UI.renderInterpretationTabbed(result, targetLang, this.currentReading);
                UI.initReadingTabs();
            } catch (fallbackError) {
                console.error('[LANG_CHANGE] Fallback translation also failed:', fallbackError);
                // Even if translation fails, render with current content
                UI.renderInterpretationTabbed(this.currentReading.interpretation, targetLang, this.currentReading);
                UI.initReadingTabs();
            }
            // Note: UI.hideAILoading() is called by setLanguage after all translations complete (or fail)
        }
    }

    // Cryptographically secure random integer generator
    // Uses Web Crypto API for cryptographically sound randomness
    static async getSecureRandomInt(min, max) {
        const range = max - min + 1;

        // Use Web Crypto API if available
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            // Generate a random 32-bit unsigned integer
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);

            // Use rejection sampling to avoid bias
            // This ensures uniform distribution across the range
            const maxValid = Math.floor(0x100000000 / range) * range;
            let randomValue = array[0];

            // Reject values that would create bias
            while (randomValue >= maxValid) {
                crypto.getRandomValues(array);
                randomValue = array[0];
            }

            return min + (randomValue % range);
        }

        // Fallback to Math.random() with additional entropy mixing
        // This shouldn't happen in modern browsers but provides a safety net
        console.warn('[RNG] Web Crypto API not available, using fallback');
        const timeEntropy = Date.now() % 1000;
        const mathRandom = Math.random();
        const mixed = (mathRandom * 997 + timeEntropy * 0.001) % 1;
        return Math.floor(mixed * range) + min;
    }

    // Generate a secure random hexagram line (6 or 9 for changing, 7 or 8 for static)
    // Uses the same cryptographic randomness as the meditation timer
    static async getSecureRandomLine() {
        // Traditional I Ching uses 3 coins:
        // 3 heads (9) = old yang (changing) - probability 1/8
        // 2 heads 1 tail (8) = young yin - probability 3/8
        // 1 head 2 tails (7) = young yang - probability 3/8
        // 3 tails (6) = old yin (changing) - probability 1/8

        const random = await this.getSecureRandomInt(1, 8);

        // Map 1-8 to line values with correct probabilities
        switch (random) {
            case 1: return { value: 9, isYang: true, isChanging: true };   // 1/8
            case 2: case 3: case 4: return { value: 8, isYang: false, isChanging: false }; // 3/8
            case 5: case 6: case 7: return { value: 7, isYang: true, isChanging: false };  // 3/8
            case 8: return { value: 6, isYang: false, isChanging: true };  // 1/8
            default: return { value: 7, isYang: true, isChanging: false };
        }
    }

    static applyTheme(themeName) {
        if (themeName === 'dark') {
            document.body.removeAttribute('data-theme');
            Storage.set('yijingTheme', 'dark');
            return;
        }
        const theme = FENG_SHUI_THEMES[themeName];
        if (!theme) return;
        document.body.setAttribute('data-theme', themeName);
        document.body.style.background = theme.bg;
        Storage.set('yijingTheme', themeName);
    }

    static updateReadingDate() {
        const dateInput = document.getElementById('readingDate');
        this.config.readingDate = dateInput.value ? new Date(dateInput.value) : new Date();
    }

    static updateReadingTime() {
        const timeInput = document.getElementById('readingTime');
        if (timeInput.value) {
            const [h, m] = timeInput.value.split(':').map(Number);
            this.config.readingTime = { hour: h, minute: m };
            this.config.useAdvancedAstrology = true;
        } else {
            this.config.readingTime = null;
            this.config.useAdvancedAstrology = false;
        }
    }

    static updateContextMinutes(val) {
        this.config.contextMinutes = parseInt(val);
        Storage.set('contextMinutes', val);
    }

    static async startConsultation() {
        console.log('[DEBUG] startConsultation called');

        const questionInput = document.getElementById('questionInput');
        if (!questionInput) {
            console.error('[DEBUG] questionInput not found');
            return;
        }

        const txt = questionInput.value.trim();
        console.log('[DEBUG] Question:', txt);

        if (!txt) {
            const msg = I18N[this.lang]?.questionPlaceholder || 'Please enter your question';
            alert(msg);
            return;
        }

        this.currentQuestion = txt;
        this.saveQuestion(txt);

        // Hide bookmarks and content during meditation
        const bookmarks = document.getElementById('resultsBookmarks');
        if (bookmarks) bookmarks.style.display = 'none';

        // Show meditation overlay
        const overlay = document.getElementById('meditation-overlay');
        if (!overlay) {
            console.error('[DEBUG] meditation-overlay not found');
            return;
        }

        console.log('[DEBUG] Showing meditation overlay');
        overlay.classList.add('active');

        // Meditation timer (25-45 seconds) using cryptographically secure randomness
        const initialTime = await this.getSecureRandomInt(25, 45);
        let timeLeft = initialTime;
        const disp = document.getElementById('meditation-timer');
        if (disp) {
            disp.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
        }

        if (this.meditationTimer) clearInterval(this.meditationTimer);
        this.meditationTimer = setInterval(() => {
            timeLeft--;
            if (disp) {
                disp.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
            }
            if (timeLeft <= 0) {
                clearInterval(this.meditationTimer);
                overlay.classList.remove('active');
                this.performCast();
            }
        }, 1000);
    }

    static async performCast() {
        try {
            // Show loading overlay with rotating quotes
            this.loadingOverlay.show();

            // Abort previous secondary pipeline if running
            if (this.secondaryAbortController) {
                this.secondaryAbortController.abort();
            }
            this.secondaryAbortController = new AbortController();

            this.loadingOverlay.addProcess('init', 'Initializing I Ching connection');
            this.loadingOverlay.logDebug('Starting casting process...', 'info');

            // Ensure data is loaded
            if (!this.hexagrams || this.hexagrams.length === 0) {
                this.hexagrams = await IChingCaster.fetchHexagramData();
            }
            this.loadingOverlay.completeProcess('init');

            this.loadingOverlay.addProcess('cast', 'Casting hexagram lines');
            // Cast lines
            const cast = await IChingCaster.castLines();
            this.loadingOverlay.completeProcess('cast');

            this.loadingOverlay.addProcess('hexagram', 'Calculating hexagram structure');
            // Find hexagram
            const hex = IChingCaster.findHexagram(this.hexagrams, cast.binaryKey);
            this.loadingOverlay.completeProcess('hexagram');

            this.loadingOverlay.addProcess('mansion', 'Computing lunar mansion position');
            // Calculate astrology
            const mansion = Astrology.getLunarMansion(this.config.readingDate);
            this.loadingOverlay.completeProcess('mansion');

            this.loadingOverlay.addProcess('bazi', 'Generating BaZi chart');
            // 1. Birth BaZi (Natal Chart) with Xiantian, Hetu, Luoshu
            let birthBazi = null;
            let birthBaziExtended = null;
            if (this.config.useAdvancedAstrology) {
                const timeStr = `${this.config.readingTime.hour}:${this.config.readingTime.minute}`;
                birthBazi = Astrology.getBaziChart(this.config.readingDate, timeStr);
                // Get comprehensive analysis including Xiantian, Hetu, Luoshu
                birthBaziExtended = Astrology.getComprehensiveBaziAnalysis(this.config.readingDate, timeStr);
            }

            // 2. Current BaZi (Moment Chart - Prasna) with Xiantian, Hetu, Luoshu
            const now = new Date();
            const currentTimeStr = `${now.getHours()}:${now.getMinutes()}`;
            const currentBazi = Astrology.getBaziChart(now, currentTimeStr);
            const currentBaziExtended = Astrology.getComprehensiveBaziAnalysis(now, currentTimeStr);
            console.log(`[App.submitReading] BaZi extended data:`, { birthBaziExtended: birthBaziExtended ? 'yes' : 'no', currentBaziExtended: currentBaziExtended ? 'yes' : 'no' });
            this.loadingOverlay.completeProcess('bazi');

            this.loadingOverlay.addProcess('equilibrium', 'Analyzing Five Elements balance');
            // Analyze equilibrium (binaryKey is bottom-to-top: first 3 = lower, last 3 = upper)
            const lower = TRIGRAMS[cast.binaryKey.substring(0, 3)];
            const upper = TRIGRAMS[cast.binaryKey.substring(3, 6)];
            const equilibrium = IChingCaster.analyzeEquilibrium(cast.lines, upper, lower);
            this.loadingOverlay.completeProcess('equilibrium');

            // Store reading immediately (without astrology - will be added async)
            const requestTimestamp = now.toISOString();
            this.currentReading = {
                hex,
                lines: cast.lines,
                binaryKey: cast.binaryKey,
                timestamp: cast.timestamp,
                requestTimestamp,
                mansion,
                birthBazi,
                currentBazi,
                birthBaziExtended,
                currentBaziExtended,
                chineseAstrology: null, // Will be populated async
                equilibrium,
                question: this.currentQuestion,
                interpretation: null
            };

            // Render results immediately (don't wait for astrology)
            UI.showStep(3);

            // Add has-results class for read mode support
            if (this.isSingleReadMode) {
                document.body.classList.add('has-results');
            }

            UI.renderHexagram(cast.lines, cast.binaryKey, hex, this.lang);
            UI.renderGraphicalSummary(this.currentReading, this.lang);

            // NOTE: Astrology data (Lunar Mansion, BaZi, Equilibrium) is now rendered 
            // ONLY in the Analysis tab, not inline on the oracle page
            // This keeps the oracle page focused on the reading, with detailed
            // astrology available in the Analysis tab

            // Fetch full data and AI
            const fullData = this.hexagrams.find(h => h.number === hex.number);
            if (fullData) {
                UI.renderChineseText(fullData, this.lang);
                UI.renderTranslation(fullData, this.lang);
            }

            // Save reading first (without AI interpretation)
            this.saveReading();
            this.renderJournal();

            // Render Analysis tab with Moment Influence and Technical Data
            this.renderAnalysisTab();

            // COMPOUNDED ANALYSIS PIPELINE
            // First, fetch the comprehensive astrology (BaZi, PaGua, Five Elements)
            console.log('[App.performCast] Starting Compounded Analysis Pipeline...');
            this.loadingOverlay.logDebug('Initiating core astrological compounding...', 'info');

            this.loadingOverlay.addProcess('astrology', 'Querying Chinese astrology data (BaZi, PaGua, Five Elements)');
            this.loadingOverlay.addProcess('ai', 'Requesting AI interpretation with compounded context');

            // Wait for Astrology FIRST to compound the data
            let compoundedAstroData = null;
            try {
                // Timeout astrology at 15 seconds to gracefully fallback
                compoundedAstroData = await Promise.race([
                    this.fetchChineseAstrologyAsync(this.currentReading),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Astrology timeout')), 15000))
                ]);
                this.loadingOverlay.completeProcess('astrology');
                this.loadingOverlay.logDebug('Astrology compounded successfully', 'completed');

                // Re-render analysis tab with astrology data before AI starts
                this.renderAnalysisTab();
            } catch (e) {
                console.warn('[App.performCast] Astrology fetch failed or timed out:', e.message);
                this.loadingOverlay.failProcess('astrology', e.message);
                // Proceed without astrology if it fails
            }

            // After astrology is compounded, pass context to AI
            try {
                await this.fetchAIInterpretation();
                this.loadingOverlay.completeProcess('ai');
                this.loadingOverlay.logDebug('AI interpretation received successfully', 'completed');
            } catch (e) {
                console.error('[App.performCast] AI interpretation failed:', e.message);
                this.loadingOverlay.failProcess('ai', e.message);
            }

            // All done - set complete and hide overlay
            this.loadingOverlay.setComplete();
            setTimeout(() => {
                this.loadingOverlay.hide();
            }, 500);

        } catch (e) {
            console.error(e);
            this.loadingOverlay.hide();
            alert(`Casting failed: ${e.message}`);
            UI.showStep(1);
        }
    }

    /**
     * Fetch Chinese Astrology data asynchronously (non-blocking)
     * This runs in parallel with other operations
     */
    static async fetchChineseAstrologyAsync(reading) {
        const now = new Date();
        const birthDateTime = this.config.useAdvancedAstrology
            ? new Date(`${this.config.readingDate.toDateString()} ${this.config.readingTime.hour}:${this.config.readingTime.minute}`)
            : null;

        const location = this.astroLocation || { latitude: 40.7128, longitude: -74.0060 };

        try {
            console.log('[App.fetchChineseAstrologyAsync] Starting async fetch...');
            if (this.loadingOverlay?.isActive) {
                this.loadingOverlay.logDebug(`Requesting astrology data for location: ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`, 'info');
            }

            const apiResult = await CHINESE_ASTROLOGY_API.calculate({
                date: now.toISOString(),
                location: location,
                birthDate: birthDateTime ? birthDateTime.toISOString() : null,
                birthLocation: birthDateTime ? location : null,
                includeQiMen: false,
                includeLunar: true,
                includeTaiSui: true
            });

            const chineseAstrologyData = apiResult.data;
            console.log('[App.fetchChineseAstrologyAsync] Data received:', {
                hasBagua: !!chineseAstrologyData?.bagua,
                hasHetu: !!chineseAstrologyData?.hetu,
                hasLuoshu: !!chineseAstrologyData?.luoshu
            });

            if (this.loadingOverlay?.isActive) {
                const features = [];
                if (chineseAstrologyData?.bagua) features.push('Bagua');
                if (chineseAstrologyData?.hetu) features.push('HeTu');
                if (chineseAstrologyData?.luoshu) features.push('LuoShu');
                if (chineseAstrologyData?.lunarMansion) features.push('Lunar Mansion');
                if (chineseAstrologyData?.taiSui) features.push('Tai Sui');
                this.loadingOverlay.logDebug(`Astrology data received: ${features.join(', ')}`, 'completed');
            }

            // Store in current reading
            if (this.currentReading && this.currentReading.requestTimestamp === reading.requestTimestamp) {
                this.currentReading.chineseAstrology = chineseAstrologyData;

                // Update the Astrology tab if it exists
                UI.renderChineseAstrologyComplete(chineseAstrologyData, this.lang, this.currentReading.hex);

                // Wait, we can translate it here:
                if (this.lang !== 'en') {
                    this.translateAstrologyTab(this.lang);
                }

                // Update Analysis tab with astrology data
                this.renderAnalysisTab();

                // Update interpretation with astrological context if it exists
                if (this.currentReading.interpretation) {
                    this.enhanceInterpretationWithAstrology(chineseAstrologyData);
                }

                // Update saved reading with astrology data
                this.saveReading();
            }

            return chineseAstrologyData;
        } catch (astroError) {
            console.warn('[App.fetchChineseAstrologyAsync] Failed:', astroError);
            return null;
        }
    }

    /**
     * Translate the Astrology UI tab text nodes using the optimized translation pipeline.
     */
    static async translateAstrologyTab(targetLang) {
        if (targetLang === 'en') return; // English is the default, no translation needed
        const container = document.getElementById('analysisAstrologyContent');
        if (!container) return;

        // Skip if already translated
        if (container.dataset.translatedLang === targetLang) return;

        console.log(`[App] Translating Astrology tab to ${targetLang}`);

        // Show visual indicator in the tab
        const originalOpacity = container.style.opacity;
        container.style.opacity = '0.5';

        try {
            const textNodes = [];
            const walkSourceNodes = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function (node) {
                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;

                        // Skip scripts, styles
                        if (['SCRIPT', 'STYLE'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;

                        // Skip specific classes that hold Chinese characters, Pinyin, or symbols
                        if (parent.closest('.zh, .py, .hz, .symbol-large, .trig-symbol, .hx-number, .time-badge, .direction-badge')) {
                            return NodeFilter.FILTER_REJECT;
                        }

                        if (node.nodeValue.trim().length > 1) { // Only translate meaningful words
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_REJECT;
                    }
                }
            );

            let node;
            const textsToTranslate = [];
            while ((node = walkSourceNodes.nextNode())) {
                textNodes.push(node);
                textsToTranslate.push(node.nodeValue.trim());
            }

            if (textsToTranslate.length === 0) {
                container.style.opacity = originalOpacity;
                return;
            }

            // Call the translate-text endpoint (action-based routing on the same function URL)
            const response = await fetch(CONFIG.TRANSLATE_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'translate-text',
                    texts: textsToTranslate,
                    targetLang: targetLang,
                    context: "Chinese Astrology terms, ten gods, five elements, and chart labels."
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            // The backend returns { translatedTexts: [...] }
            const translatedTexts = result.translatedTexts || result.data?.translatedTexts;

            if (translatedTexts && translatedTexts.length === textNodes.length) {
                textNodes.forEach((node, i) => {
                    const translatedText = translatedTexts[i];
                    if (translatedText && translatedText !== textsToTranslate[i]) {
                        node.nodeValue = node.nodeValue.replace(textsToTranslate[i], translatedText);
                    }
                });
                container.dataset.translatedLang = targetLang;
                console.log(`[App] Successfully translated Astrology tab to ${targetLang}`);
            }
        } catch (err) {
            console.error('[App] Failed to translate astrology tab:', err);
        } finally {
            container.style.opacity = originalOpacity;
        }
    }

    /**
     * Enhance interpretation by injecting technical data (JSON) for AI analysis
     * The AI should generate: Technical Analysis (classical) + Colloquial Analysis (modern)
     * Structure: celestialTechnical (JSON) → celestial (technical) + celestialColloquial (modern)
     */
    static enhanceInterpretationWithAstrology(astrologyData) {
        if (!this.currentReading?.interpretation) {
            console.warn('[App.enhanceInterpretationWithAstrology] No interpretation to enhance');
            return;
        }

        console.log('[App.enhanceInterpretationWithAstrology] Injecting technical data for AI analysis:', {
            hasAstrologyData: !!astrologyData,
            hasBagua: !!astrologyData?.bagua,
            hasTaiSui: !!astrologyData?.taiSui,
            hasHetu: !!astrologyData?.hetu,
            hasLuoshu: !!astrologyData?.luoshu,
            hasMansion: !!this.currentReading.mansion,
            hasCurrentBazi: !!this.currentReading.currentBazi,
            hasBirthBazi: !!this.currentReading.birthBazi
        });

        // Build technical data payload (JSON format for AI)
        const technicalData = this.buildTechnicalAstrologyData(astrologyData);

        // Inject technical data into all language sections
        // The AI should reference this to generate proper technical analysis
        ['en', 'es', 'it', 'zh'].forEach(lng => {
            if (this.currentReading.interpretation[lng]) {
                // Store raw technical data
                this.currentReading.interpretation[lng].celestialTechnical = JSON.stringify(technicalData, null, 2);

                // Note: We do NOT replace celestial or celestialColloquial here
                // The AI should generate those based on the technical data
                // If AI already generated them incorrectly, that's a prompt issue

                console.log(`[App.enhanceInterpretationWithAstrology] Injected technical data for ${lng}`);
            }
        });

        // Also store in reading for reference
        this.currentReading.technicalAstrologyData = technicalData;

        console.log('[App.enhanceInterpretationWithAstrology] Technical data injected:', Object.keys(technicalData));
    }

    /**
     * Build structured technical astrology data (JSON format for AI)
     */
    static buildTechnicalAstrologyData(astrologyData) {
        // Include current hexagram info as PRIMARY data
        const hexInfo = this.currentReading?.hex;
        const linesInfo = this.currentReading?.lines;

        const data = {
            timestamp: new Date().toISOString(),
            // PRIMARY FOCUS: The hexagram
            hexagram: hexInfo ? {
                number: hexInfo.number,
                name: { en: hexInfo.name_en, zh: hexInfo.name_zh },
                binaryKey: this.currentReading?.binaryKey,
                trigramUpper: hexInfo.trigramUpper,
                trigramLower: hexInfo.trigramLower
            } : null,
            movingLines: linesInfo ? linesInfo.map((l, idx) => ({
                position: idx + 1,
                isYang: l.isYang,
                isChanging: l.isChanging,
                value: l.value
            })).filter(l => l.isChanging) : [],
            // CELESTIAL CONTEXT: Astrology informs but does not replace hexagram
            lunarMansion: null,
            lifeGua: null,
            taiSui: null,
            heTu: null,
            luoShu: null,
            birthBazi: null,
            momentBazi: null,
            equilibrium: this.currentReading?.equilibrium || null
        };

        // Lunar Mansion
        if (this.currentReading.mansion) {
            const m = this.currentReading.mansion;
            data.lunarMansion = {
                number: m.num,
                name: { en: m.name_en, zh: m.name_zh },
                animal: m.animal,
                element: m.element,
                group: m.group,
                degrees: m.degrees
            };
        }

        // Life Gua (He Xian Gua)
        if (astrologyData?.bagua?.hexiangua) {
            const hg = astrologyData.bagua.hexiangua;
            data.lifeGua = {
                hexagramNumber: hg.hexagramNumber,
                hexagramName: hg.hexagramName,
                chineseName: hg.chineseName,
                trigramUpper: hg.trigramUpper,
                trigramLower: hg.trigramLower,
                element: hg.element,
                yinYang: hg.yinYang
            };
        }

        // Xian Tian (Pre-Heaven) and Hou Tian (Post-Heaven)
        if (astrologyData?.bagua?.xiantian) {
            data.xianTian = astrologyData.bagua.xiantian;
        }
        if (astrologyData?.bagua?.houtian) {
            data.houTian = astrologyData.bagua.houtian;
        }

        // Tai Sui
        if (astrologyData?.taiSui) {
            data.taiSui = {
                position: astrologyData.taiSui.currentPosition,
                annualInfluence: astrologyData.taiSui.annualInfluence,
                clashes: astrologyData.taiSui.clashes,
                recommendations: astrologyData.taiSui.recommendations
            };
        }

        // He Tu
        if (astrologyData?.hetu) {
            data.heTu = {
                generationNumber: astrologyData.hetu.personalNumbers?.generation,
                completionNumber: astrologyData.hetu.personalNumbers?.completion,
                lifePath: astrologyData.hetu.lifePath,
                elementalPhases: astrologyData.hetu.elementalPhases
            };
        }

        // Luo Shu
        if (astrologyData?.luoshu) {
            data.luoShu = {
                mingGua: astrologyData.luoshu.mingGua,
                fengShui: astrologyData.luoshu.fengshui
            };
        }

        // Birth BaZi (if available)
        if (this.currentReading.birthBazi) {
            data.birthBazi = this.formatBaziTechnical(this.currentReading.birthBazi);
            data.hasBirthData = true;
        } else {
            data.hasBirthData = false;
        }

        // Moment BaZi (Current Sky - always available)
        if (this.currentReading.currentBazi) {
            data.momentBazi = this.formatBaziTechnical(this.currentReading.currentBazi);
        }

        return data;
    }

    /**
     * Format BaZi data for technical JSON output
     * Includes all pillars, day master, and strength analysis
     */
    static formatBaziTechnical(bazi) {
        return {
            year: { stem: bazi.year?.stem, branch: bazi.year?.branch },
            month: { stem: bazi.month?.stem, branch: bazi.month?.branch },
            day: { stem: bazi.day?.stem, branch: bazi.day?.branch },
            hour: { stem: bazi.hour?.stem, branch: bazi.hour?.branch },
            dayMaster: bazi.dayMaster,
            strength: bazi.strength ? {
                result: bazi.strength.result,
                yongShen: bazi.strength.yongShen,
                favorable: bazi.strength.favorable,
                unfavorable: bazi.strength.unfavorable,
                score: bazi.strength.score
            } : null
        };
    }

    /**
     * Generate celestial introduction
     */
    static generateCelestialIntro(hasBirthData, t) {
        if (hasBirthData) {
            return t.celestialIntroWithBirth ||
                'The celestial influences at this moment weave together personal destiny threads with universal energies. Your birth chart provides the foundation, while the current sky offers timely guidance for this specific question.';
        } else {
            return t.celestialIntroWithoutBirth ||
                'The celestial influences at this moment offer universal guidance through the current sky (Tian Shi) and cosmic alignments. Without birth data, this reading focuses on present energies and timeless wisdom, offering guidance that applies to your current situation.';
        }
    }

    /**
     * Generate Lunar Mansion analysis
     */
    static generateLunarMansionAnalysis(mansion, t) {
        const mansionName = mansion.name_en || mansion.name_zh;
        const groupGuidance = {
            'Azure Dragon': t.azureDragonMeaning || 'The Azure Dragon of the East brings growth, new beginnings, and spring energy. Auspicious for starting ventures.',
            'Black Tortoise': t.blackTortoiseMeaning || 'The Black Tortoise of the North offers protection, wisdom, and winter reflection. Favorable for planning.',
            'White Tiger': t.whiteTigerMeaning || 'The White Tiger of the West brings completion, harvest, and autumn clarity. Good for finishing tasks.',
            'Vermilion Bird': t.vermilionBirdMeaning || 'The Vermilion Bird of the South ignites passion, communication, and summer brightness. Excellent for relationships.'
        };

        let text = `**${t.lunarMansion || 'Lunar Mansion'}: ${mansionName} (${mansion.name_zh})**\n`;
        text += `${t.animal || 'Animal'}: ${mansion.animal} | ${t.element || 'Element'}: ${mansion.element} | ${t.group || 'Group'}: ${mansion.group}\n`;
        text += `${groupGuidance[mansion.group] || ''}`;
        return text;
    }

    /**
     * Generate Life Gua (He Xian Gua) analysis
     */
    static generateLifeGuaAnalysis(hexiangua, t) {
        let text = `**${t.lifeGua || 'Life Gua'} (He Xian Gua): ${hexiangua.hexagramName}**\n`;
        text += `${hexiangua.chineseName} - ${t.hexagram || 'Hexagram'} #${hexiangua.hexagramNumber}\n`;
        text += `${hexiangua.meaning || ''}`;
        if (hexiangua.element) {
            text += ` (${hexiangua.element}`;
            if (hexiangua.yinYang) text += ` ${hexiangua.yinYang}`;
            text += ')';
        }
        return text;
    }

    /**
     * Generate Tai Sui analysis
     */
    static generateTaiSuiAnalysis(taiSui, t) {
        let text = `**${t.taiSui || 'Tai Sui'} (Grand Duke Jupiter)**\n`;
        if (taiSui.currentPosition) {
            text += `${t.position || 'Position'}: ${taiSui.currentPosition.zh || taiSui.currentPosition.direction} `;
            text += `(${taiSui.currentPosition.element || ''})\n`;
        }
        if (taiSui.annualInfluence) {
            text += `${taiSui.annualInfluence}\n`;
        }
        if (taiSui.clashes && taiSui.clashes.length > 0) {
            text += `${t.clashes || 'Clashes'}: ${taiSui.clashes.join(', ')}\n`;
        }
        return text;
    }

    /**
     * Generate He Tu (River Map) analysis
     */
    static generateHeTuAnalysis(hetu, t) {
        let text = `**${t.heTu || 'He Tu'} (${t.riverMap || 'River Map'})**\n`;
        if (hetu.personalNumbers) {
            text += `${t.generationNumber || 'Generation Number'}: ${hetu.personalNumbers.generation} `;
            text += `(${t.innerBlueprint || 'Inner Blueprint'})\n`;
            text += `${t.completionNumber || 'Completion Number'}: ${hetu.personalNumbers.completion} `;
            text += `(${t.outerExpression || 'Outer Expression'})\n`;
        }
        if (hetu.lifePath?.pathType) {
            text += `${t.lifePath || 'Life Path'}: ${hetu.lifePath.pathType}\n`;
        }
        return text;
    }

    /**
     * Generate Luo Shu (Magic Square) analysis
     */
    static generateLuoShuAnalysis(luoshu, t) {
        let text = `**${t.luoShu || 'Luo Shu'} (${t.magicSquare || 'Magic Square'})**\n`;
        if (luoshu.mingGua) {
            text += `${t.mingGua || 'Ming Gua'}: #${luoshu.mingGua.number} - ${luoshu.mingGua.element} `;
            text += `(${luoshu.mingGua.yinYang || ''})\n`;
        }
        if (luoshu.fengshui?.favorableDirections?.length > 0) {
            text += `${t.favorableDirections || 'Favorable Directions'}: ${luoshu.fengshui.favorableDirections.join(', ')}\n`;
        }
        return text;
    }

    /**
     * Generate Birth BaZi analysis (only when birth data available)
     */
    static generateBirthBaziAnalysis(bazi, t) {
        let text = `**${t.birthChart || 'Birth Chart'} (BaZi)**\n`;
        text += `${t.year || 'Year'}: ${bazi.year?.stem?.zh || ''}${bazi.year?.branch?.zh || ''} `;
        text += `${bazi.month?.stem?.zh || ''}${bazi.month?.branch?.zh || ''} `;
        text += `${bazi.day?.stem?.zh || ''}${bazi.day?.branch?.zh || ''} `;
        text += `${bazi.hour?.stem?.zh || ''}${bazi.hour?.branch?.zh || ''}\n`;
        if (bazi.dayMaster) {
            text += `${t.dayMaster || 'Day Master'}: ${bazi.dayMaster.zh} (${bazi.dayMaster.element} ${bazi.dayMaster.yinYang})\n`;
        }
        return text;
    }

    /**
     * Generate Moment (Current) BaZi analysis
     */
    static generateMomentBaziAnalysis(bazi, t) {
        let text = `**${t.currentSky || 'Current Sky'} (${t.momentChart || 'Moment Chart'})**\n`;
        text += `${t.year || 'Year'}: ${bazi.year?.stem?.zh || ''}${bazi.year?.branch?.zh || ''} `;
        text += `${bazi.month?.stem?.zh || ''}${bazi.month?.branch?.zh || ''} `;
        text += `${bazi.day?.stem?.zh || ''}${bazi.day?.branch?.zh || ''} `;
        text += `${bazi.hour?.stem?.zh || ''}${bazi.hour?.branch?.zh || ''}\n`;
        if (bazi.dayMaster) {
            text += `${t.dayMaster || 'Day Master'}: ${bazi.dayMaster.zh} (${bazi.dayMaster.element} ${bazi.dayMaster.yinYang}) - `;

            const elementGuidance = {
                'Wood': t.woodInfluence || 'Growth and expansion energy',
                'Fire': t.fireInfluence || 'Transformation and action energy',
                'Earth': t.earthInfluence || 'Stability and nurturing energy',
                'Metal': t.metalInfluence || 'Precision and refinement energy',
                'Water': t.waterInfluence || 'Wisdom and adaptability energy'
            };
            text += elementGuidance[bazi.dayMaster.element] || '';
        }
        return text;
    }

    /**
     * Generate astrological synthesis for this specific reading
     */
    static generateAstrologicalSynthesis(astrologyData, t) {
        let text = `**${t.readingInfluence || 'Influence on This Reading'}**\n`;

        const influences = [];

        // Lunar Mansion influence
        if (this.currentReading?.mansion) {
            const mansion = this.currentReading.mansion;
            const groupActions = {
                'Azure Dragon': t.azureDragonAction || 'Favorable for new beginnings and growth.',
                'Black Tortoise': t.blackTortoiseAction || 'Favorable for planning and inner work.',
                'White Tiger': t.whiteTigerAction || 'Favorable for completion and endings.',
                'Vermilion Bird': t.vermilionBirdAction || 'Favorable for communication and visibility.'
            };
            influences.push(groupActions[mansion.group] || '');
        }

        // Life Gua influence
        if (astrologyData?.bagua?.hexiangua?.meaning) {
            influences.push(`${t.lifeGuaInfluence || 'Life Gua indicates'}: ${astrologyData.bagua.hexiangua.meaning}`);
        }

        // Moving lines influence
        const movingCount = this.currentReading?.equilibrium?.movingCount || 0;
        if (movingCount === 1) {
            influences.push(t.oneMoving || 'One changing line suggests focused transformation.');
        } else if (movingCount > 1 && movingCount <= 3) {
            influences.push(t.severalMoving || 'Several changing lines indicate significant evolution.');
        } else if (movingCount > 3) {
            influences.push(t.manyMoving || 'Many changing lines suggest a major transformation period.');
        }

        if (influences.length > 0) {
            text += influences.join(' ');
        } else {
            text += t.neutralInfluence || 'The celestial influences are balanced at this moment.';
        }

        return text;
    }

    /**
     * Generate astrological influence text based on current sky
     */
    static generateAstrologicalInfluenceText(astrologyData) {
        const t = I18N[this.lang] || I18N['en'];
        const bazi = this.currentReading?.currentBazi;
        const mansion = this.currentReading?.mansion;

        let text = '';

        // Day Master influence
        if (bazi?.dayMaster) {
            const dm = bazi.dayMaster;
            text += `- ${t.dayMaster || 'Day Master'} ${dm.zh || ''} (${dm.element} ${dm.yinYang}): `;

            // Add element-specific guidance
            const elementGuidance = {
                'Wood': t.woodGuidance || 'Growth, expansion, and new beginnings are favored. Take initiative.',
                'Fire': t.fireGuidance || 'Clarity, transformation, and action are highlighted. Express yourself.',
                'Earth': t.earthGuidance || 'Stability, nurturing, and consolidation are key. Build foundations.',
                'Metal': t.metalGuidance || 'Precision, discernment, and letting go are important. Refine your approach.',
                'Water': t.waterGuidance || 'Wisdom, flow, and adaptability are emphasized. Trust your intuition.'
            };
            text += elementGuidance[dm.element] || '';
            text += '\n';
        }

        // Lunar Mansion influence
        if (mansion) {
            text += `- ${mansion.name_en} ${t.lunarMansion || 'Lunar Mansion'}: `;

            const mansionGuidance = {
                'Azure Dragon': t.azureDragonGuidance || 'Auspicious for new ventures and growth.',
                'Black Tortoise': t.blackTortoiseGuidance || 'Favorable for planning and preparation.',
                'White Tiger': t.whiteTigerGuidance || 'Good for completion and closure.',
                'Vermilion Bird': t.vermilionBirdGuidance || 'Excellent for communication and relationships.'
            };
            text += mansionGuidance[mansion.group] || '';
            text += '\n';
        }

        // Moving lines influence
        const movingCount = this.currentReading?.equilibrium?.movingCount || 0;
        if (movingCount > 0) {
            text += `- ${t.movingLines || 'Moving Lines'} (${movingCount}): `;
            if (movingCount === 1) {
                text += t.oneMovingGuidance || 'A single changing line indicates focused transformation in one area.';
            } else if (movingCount <= 3) {
                text += t.fewMovingGuidance || 'Multiple changing lines suggest significant but manageable change.';
            } else {
                text += t.manyMovingGuidance || 'Many changing lines indicate a major transformation is underway.';
            }
            text += '\n';
        }

        return text || t.noAstroInfluence || 'The celestial influences are neutral at this moment.';
    }

    static getContextForReading(currentReadingId, currentQuestion, includeFullDocuments = true) {
        const history = Storage.getJSON('iChingHistory');
        const now = Date.now();

        // Use memory start time if set, otherwise fall back to contextMinutes
        let timeCutoff;
        if (this.config.memoryStartTime) {
            // Use the later of memory start time or contextMinutes ago
            const contextCutoff = now - (this.config.contextMinutes * 60 * 1000);
            timeCutoff = Math.max(this.config.memoryStartTime, contextCutoff);
        } else {
            timeCutoff = now - (this.config.contextMinutes * 60 * 1000);
        }

        // Extract keywords from current question for relevance scoring
        const questionWords = currentQuestion.toLowerCase()
            .replace(/[?.,!;:]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3);

        // Check if we have an "Ask Again" source that should be included
        const askAgainTimestamp = this.askAgainSource;
        let askAgainReading = null;

        if (askAgainTimestamp && askAgainTimestamp !== currentReadingId) {
            askAgainReading = history.find(h => h.requestTimestamp === askAgainTimestamp);
        }

        // Score each historical reading by relevance
        const scoredHistory = history
            .filter(h => h.requestTimestamp !== currentReadingId && h.interpretation)
            .map(h => {
                const hWords = (h.questionText || '').toLowerCase().split(/\s+/);
                const keywordMatches = questionWords.filter(w => hWords.includes(w)).length;
                const ts = new Date(h.requestTimestamp).getTime();
                const isRecent = ts > timeCutoff;
                const hoursAgo = (now - ts) / (1000 * 60 * 60);
                const isAskAgainSource = askAgainTimestamp && h.requestTimestamp === askAgainTimestamp;

                // Relevance score: keyword matches + recency bonus + ask again bonus
                let score = keywordMatches * 2;
                if (isAskAgainSource) score += 100; // Highest priority for ask again source
                else if (isRecent) score += 10;
                else if (hoursAgo < 24) score += 3;
                else if (hoursAgo < 72) score += 1;

                return { ...h, score, isRecent, hoursAgo, isAskAgainSource };
            })
            .filter(h => h.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Top 5 most relevant

        if (scoredHistory.length === 0 && !askAgainReading) {
            return { text: "", count: 0, relevantReadings: [], historyAnalysis: "" };
        }

        // Build summary context for quick reference
        let contextStr = `\nContext from Relevant Previous Readings:\n`;
        contextStr += `The following previous readings provide context for the current inquiry:\n\n`;

        scoredHistory.forEach((h, i) => {
            const relevanceTag = h.isAskAgainSource ? 'Direct Context (Critical)' :
                h.isRecent ? 'Recent' : `${Math.round(h.hoursAgo)}h ago`;
            contextStr += `Past Reading ${i + 1} (${relevanceTag}): "${h.questionText}"\n`;
            contextStr += `  Hexagram: ${h.hex?.number || 'unknown'} - ${h.hex?.name_en || ''}\n`;
            if (h.mansion) {
                contextStr += `  Lunar Mansion: ${h.mansion.name_en} - ${h.mansion.group}\n`;
            }
            if (h.lines) {
                const movingCount = h.lines.filter(l => l.isChanging).length;
                contextStr += `  Lines: ${movingCount} moving lines\n`;
            }
            contextStr += `\n`;
        });
        contextStr += "[END CONTEXT SUMMARY]\n";

        // Build full History Analysis with complete documents
        let historyAnalysis = `\n================================================================================\n`;
        historyAnalysis += `                         HISTORICAL READINGS ANALYSIS\n`;
        historyAnalysis += `================================================================================\n\n`;
        historyAnalysis += `IMPORTANT: The following section contains FULL DOCUMENTS from previous readings.\n`;
        historyAnalysis += `These are NOT part of the current reading but provide context and continuity.\n`;
        historyAnalysis += `Each historical document is clearly marked with BEGIN/END markers.\n\n`;

        // Include ask again source first if available
        if (askAgainReading) {
            historyAnalysis += `>>> ASK AGAIN SOURCE (This reading was invoked as a follow-up to this document):\n`;
            historyAnalysis += this.formatHistoricalReading(askAgainReading, 0, true);
            historyAnalysis += `\n`;
        }

        // Include other relevant readings
        scoredHistory.forEach((h, i) => {
            const isAskAgain = h.isAskAgainSource;
            historyAnalysis += this.formatHistoricalReading(h, i + 1, isAskAgain);
        });

        historyAnalysis += `================================================================================\n`;
        historyAnalysis += `                         END HISTORICAL READINGS ANALYSIS\n`;
        historyAnalysis += `================================================================================\n`;

        return {
            text: contextStr,
            count: scoredHistory.length,
            relevantReadings: scoredHistory,
            historyAnalysis: historyAnalysis,
            askAgainReading: askAgainReading,
            historyEntries: scoredHistory // Pass raw entries for smart compression
        };
    }

    static formatHistoricalReading(reading, index, isAskAgainSource = false) {
        if (!reading) return `[HISTORICAL_READING_${index}_EMPTY]`;

        const timestamp = reading.requestTimestamp ? new Date(reading.requestTimestamp).toISOString() : 'unknown';
        const hex = reading.hex || {};
        const mansion = reading.mansion || {};
        const lines = reading.lines || [];
        const interpretation = reading.interpretation || {};

        let formatted = `\n[HISTORICAL_READING_${index}_BEGIN]\n`;
        formatted += `MARKER: ${isAskAgainSource ? 'ASK_AGAIN_SOURCE_DOCUMENT' : 'HISTORICAL_DOCUMENT'}\n`;
        formatted += `TIMESTAMP: ${timestamp}\n`;
        formatted += `ORIGINAL_QUESTION: "${reading.questionText || 'N/A'}"\n\n`;

        formatted += `--- CAST DETAILS ---\n`;
        formatted += `Hexagram: ${hex.number || 'N/A'} - ${hex.name_en || 'N/A'}\n`;
        formatted += `Binary: ${reading.binaryKey || 'N/A'}\n`;

        // Line details
        if (Array.isArray(lines) && lines.length === 6) {
            formatted += `\nLines (bottom to top):\n`;
            lines.forEach((line, i) => {
                if (line) {
                    const type = line.isYang ? 'Yang' : 'Yin';
                    const status = line.isChanging ? 'MOVING' : 'Static';
                    formatted += `  Line ${i + 1}: ${type} - ${status}\n`;
                }
            });
        }

        // Lunar Mansion details
        if (mansion && mansion.num) {
            formatted += `\n--- LUNAR MANSION ---\n`;
            formatted += `Name: ${mansion.name_en || 'N/A'}\n`;
            formatted += `Number: ${mansion.num}/28\n`;
            formatted += `Group: ${mansion.group || 'N/A'}\n`;
            formatted += `Element: ${mansion.element || 'N/A'}\n`;
            formatted += `Animal: ${mansion.animal || 'N/A'}\n`;
            formatted += `Degrees: ${mansion.degrees || 'N/A'}°\n`;
        }

        // BaZi details
        if (reading.birthBazi) {
            formatted += `\n--- BIRTH BA ZI ---\n`;
            const chart = reading.birthBazi;
            ['year', 'month', 'day', 'hour'].forEach(p => {
                if (chart[p] && chart[p].stem && chart[p].branch) {
                    formatted += `${p.toUpperCase()}: ${chart[p].stem.name || '?'}-${chart[p].branch.name || '?'} (${chart[p].tenGod ? chart[p].tenGod.zh : ''})\n`;
                }
            });
            if (chart.strength) formatted += `Strength: ${chart.strength.result || 'N/A'} (Yong Shen: ${chart.strength.yongShen || 'N/A'})\n`;
        }

        if (reading.currentBazi) {
            formatted += `\n--- CURRENT BA ZI ---\n`;
            const chart = reading.currentBazi;
            ['year', 'month', 'day', 'hour'].forEach(p => {
                if (chart[p] && chart[p].stem && chart[p].branch) {
                    formatted += `${p.toUpperCase()}: ${chart[p].stem.name || '?'}-${chart[p].branch.name || '?'} (${chart[p].tenGod ? chart[p].tenGod.zh : ''})\n`;
                }
            });
            if (chart.strength) formatted += `Moment Strength: ${chart.strength.result || 'N/A'}\n`;
        }

        // Five Elements analysis
        if (reading.equilibrium) {
            formatted += `\n--- FIVE ELEMENTS ANALYSIS ---\n`;
            formatted += `Yin-Yang: ${reading.equilibrium.yangCount || 0} Yang, ${reading.equilibrium.yinCount || 0} Yin (${reading.equilibrium.balanceState || 'N/A'})\n`;
            formatted += `Stability: ${reading.equilibrium.stabilityState || 'N/A'} (${reading.equilibrium.movingCount || 0} moving lines)\n`;
            if (reading.equilibrium.elements) {
                formatted += `Element Distribution:\n`;
                Object.entries(reading.equilibrium.elements).forEach(([el, val]) => {
                    formatted += `  ${el}: ${val}%\n`;
                });
            }
        }

        // AI Interpretation (if available)
        if (interpretation.en || interpretation.es || interpretation.it || interpretation.zh) {
            formatted += `\n--- AI INTERPRETATION (from previous reading) ---\n`;
            const enInterp = interpretation.en || interpretation.es || interpretation.it || interpretation.zh || {};
            if (enInterp.celestial) formatted += `Celestial Guidance: ${enInterp.celestial}\n`;
            if (enInterp.elements) formatted += `Five Elements: ${enInterp.elements}\n`;
            if (enInterp.analysis) formatted += `Analysis: ${enInterp.analysis}\n`;
            if (enInterp.advice) formatted += `Advice: ${enInterp.advice}\n`;
            if (enInterp.symbolism) formatted += `Symbolism: ${enInterp.symbolism}\n`;
            if (enInterp.movingLines) formatted += `Moving Lines: ${enInterp.movingLines}\n`;

            // Include Remedies
            const remedies = interpretation.remedies || reading.remedies;
            if (remedies && remedies.en && Array.isArray(remedies.en.remedies)) {
                formatted += `\n--- REMEDIES ---\n`;
                remedies.en.remedies.forEach(r => {
                    if (r && r.name) {
                        formatted += `  - ${r.name} (${r.type || 'remedy'}): ${(r.description || '').substring(0, 100)}...\n`;
                    }
                });
            } else if (remedies && Array.isArray(remedies.remedies)) {
                // Handle alternative structure
                formatted += `\n--- REMEDIES ---\n`;
                remedies.remedies.forEach(r => {
                    if (r && r.name) {
                        formatted += `  - ${r.name} (${r.type || 'remedy'}): ${(r.description || '').substring(0, 100)}...\n`;
                    }
                });
            }

            // Include Bagua Medicine
            const baguaMed = interpretation.baguaMedicine;
            if (baguaMed && baguaMed.en) {
                formatted += `\n--- BAGUA MEDICINE & FENG SHUI ---\n`;
                const med = baguaMed.en;
                if (med.directions) {
                    formatted += `  Feng Shui: Fav: ${med.directions.favorable || 'N/A'}, Unfav: ${med.directions.unfavorable || 'N/A'}\n`;
                }
                if (med.medicine) {
                    if (Array.isArray(med.medicine)) {
                        formatted += `  Medicine: ${med.medicine.map(m => m?.name || 'Unknown').join(', ')}\n`;
                    } else if (typeof med.medicine === 'string') {
                        formatted += `  Medicine: ${med.medicine.substring(0, 100)}...\n`;
                    }
                }
            }
        }

        formatted += `[HISTORICAL_READING_${index}_END]\n`;

        return formatted;
    }

    /**
     * Smart history summarization for API requests
     * Extracts only essential context to reduce payload size
     */
    // NEW: Smart history summarizer - extracts only technical data and results
    // Reduces payload from 3000+ chars to ~300 chars (90% reduction)
    static summarizeHistoryForRequest(historyAnalysis, historyEntries = null) {
        // If we have raw history entries, use them directly (preferred)
        if (historyEntries && Array.isArray(historyEntries) && historyEntries.length > 0) {
            return this.compressHistoryEntries(historyEntries);
        }

        // Fallback: parse from text
        if (!historyAnalysis || typeof historyAnalysis !== 'string') {
            return '';
        }

        // If already small, return as-is
        if (historyAnalysis.length < 200) {
            return historyAnalysis;
        }

        // Extract structured data from text
        const readings = this.parseHistoryText(historyAnalysis);
        return this.formatCompressedHistory(readings);
    }

    // Compress raw history entries into minimal format
    static compressHistoryEntries(entries) {
        if (!entries || entries.length === 0) return '';

        const compressed = entries.slice(0, 5).map(entry => {
            const interp = entry.interpretation || {};
            const en = interp.en || {};

            // Extract only essential technical data
            const technical = {
                // BaZi (if available)
                dm: en.birthBazi?.day?.stem?.name,
                str: en.birthBazi?.strength?.result,

                // Elements (if available)
                el: interp.elementsTechnical ?
                    this.extractElementBalance(interp.elementsTechnical) : null,

                // Celestial (if available)
                lm: interp.celestialTechnical ?
                    this.extractLunarMansion(interp.celestialTechnical) : null,

                // Core analysis theme (first 50 chars)
                core: en.analysis?.substring(0, 50) || null
            };

            // Clean null values
            Object.keys(technical).forEach(k => {
                if (technical[k] === null || technical[k] === undefined) delete technical[k];
            });

            return {
                q: entry.question?.substring(0, 50) || 'No question',
                h: entry.hexagram?.number,
                m: entry.lines?.filter(l => l === 1).length || 0, // moving lines count
                t: technical
            };
        });

        return JSON.stringify({
            c: entries.length,
            r: compressed
        });
    }

    // Parse history text into structured readings
    static parseHistoryText(text) {
        const readings = [];

        // Split by reading markers
        const readingBlocks = text.split(/Reading #\d+:|---\s*\n/).filter(b => b.trim());

        readingBlocks.slice(0, 5).forEach(block => {
            const reading = {
                question: this.extractPattern(block, /Question:\s*"([^"]+)"/),
                hexagram: this.extractPattern(block, /Hexagram:\s*(\d+)/),
                dayMaster: this.extractPattern(block, /Day Master:\s*([\w\s]+?)(?:\n|$)/),
                strength: this.extractPattern(block, /Strength:\s*(\w+)/),
                elements: this.extractElementSummary(block),
                remedyCount: (block.match(/Remedy:/g) || []).length
            };
            readings.push(reading);
        });

        return readings;
    }

    static extractPattern(text, regex) {
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }

    static extractElementSummary(text) {
        // Look for element counts
        const elemMatch = text.match(/(Wood|Fire|Earth|Metal|Water)[\s:]+(\d+)/gi);
        if (!elemMatch) return null;

        const counts = {};
        elemMatch.forEach(m => {
            const parts = m.split(/[\s:]+/);
            if (parts.length >= 2) {
                counts[parts[0].toLowerCase()] = parseInt(parts[1]) || 0;
            }
        });

        // Find strongest
        const strongest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return strongest ? `${strongest[0]}:${strongest[1]}` : null;
    }

    static extractLunarMansion(techData) {
        if (typeof techData === 'string') {
            const match = techData.match(/lunarMansion[^}]*name["\s:]+([^"\s,}]+)/i);
            return match ? match[1] : null;
        }
        return techData?.lunarMansion?.name;
    }

    static extractElementBalance(techData) {
        if (typeof techData === 'string') {
            try {
                const parsed = JSON.parse(techData);
                const counts = parsed.elementCounts;
                if (counts) {
                    const strongest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                    return strongest ? `${strongest[0]}:${strongest[1]}` : null;
                }
            } catch (e) { }
        }
        return null;
    }

    // Format compressed readings into minimal string
    static formatCompressedHistory(readings) {
        if (!readings || readings.length === 0) return '';

        const lines = readings.map(r => {
            const parts = [];
            if (r.question) parts.push(`Q:${r.question.substring(0, 30)}`);
            if (r.hexagram) parts.push(`H:${r.hexagram}`);
            if (r.dayMaster) parts.push(`DM:${r.dayMaster}`);
            if (r.strength) parts.push(`S:${r.strength.charAt(0)}`);
            if (r.elements) parts.push(`E:${r.elements}`);
            if (r.remedyCount) parts.push(`Rx:${r.remedyCount}`);
            return parts.join('|');
        });

        return `Prev ${readings.length}:` + lines.join(' || ');
    }

    // OLD: Simple text-based summarizer (kept for fallback compatibility)
    static summarizeHistoryForRequestOld(historyAnalysis) {
        const readingMatches = historyAnalysis.match(/\[HISTORICAL_READING_\d+_BEGIN\]/g);
        summary.count = readingMatches ? readingMatches.length : 0;

        // Build compact summary
        let compactSummary = `Previous Context (${summary.count} readings):\n`;

        if (summary.previousQuestions.length > 0) {
            compactSummary += `Questions: ${summary.previousQuestions.join(' | ')}\n`;
        }

        if (summary.previousHexagrams.length > 0) {
            compactSummary += `Hexagrams: ${summary.previousHexagrams.join(' | ')}\n`;
        }

        if (summary.previousRemedies.length > 0) {
            compactSummary += `Remedies: ${summary.previousRemedies.join(' | ')}\n`;
        }

        // If there's an ask-again marker, include that context
        if (historyAnalysis.includes('ASK_AGAIN_SOURCE_DOCUMENT')) {
            compactSummary += '\nNote: This is a follow-up to a previous reading.\n';
        }

        console.log(`[App.summarizeHistory] Reduced ${historyAnalysis.length} chars to ${compactSummary.length} chars (${Math.round(compactSummary.length / historyAnalysis.length * 100)}%)`);

        return compactSummary;
    }

    static async fetchAIInterpretation() {
        const hex = this.currentReading.hex;
        const lines = this.currentReading.lines;
        const readingId = this.currentReading.requestTimestamp;
        const mansion = this.currentReading.mansion;
        const lifePalace = this.currentReading.lifePalace;
        const equilibrium = this.currentReading.equilibrium;

        // Show loading state immediately
        UI.renderAILoading(this.lang);

        // Get context for this reading (includes history and ask again source)
        const contextData = this.getContextForReading(readingId, this.currentQuestion, true);

        // Prepare astrology data for AI - format it clearly
        const astroData = this.currentReading.chineseAstrology;
        const formattedAstrology = {};

        if (astroData) {
            // Life Gua (He Xian Gua)
            if (astroData.bagua?.hexiangua) {
                formattedAstrology.lifeGua = {
                    number: astroData.bagua.hexiangua.hexagramNumber,
                    name: astroData.bagua.hexiangua.hexagramName,
                    chineseName: astroData.bagua.hexiangua.chineseName,
                    meaning: astroData.bagua.hexiangua.meaning,
                    element: astroData.bagua.hexiangua.element,
                    yinYang: astroData.bagua.hexiangua.yinYang
                };
            }

            // Xian Tian Bagua (Pre-Heaven)
            if (astroData.bagua?.xiantian) {
                formattedAstrology.xiantian = astroData.bagua.xiantian;
            }

            // Hou Tian Bagua (Post-Heaven)
            if (astroData.bagua?.houtian) {
                formattedAstrology.houtian = astroData.bagua.houtian;
            }

            // Tai Sui (Grand Duke Jupiter)
            if (astroData.taiSui) {
                formattedAstrology.taiSui = {
                    position: astroData.taiSui.currentPosition,
                    annualInfluence: astroData.taiSui.annualInfluence,
                    clashes: astroData.taiSui.clashes || [],
                    recommendations: astroData.taiSui.recommendations || []
                };
            }

            // He Tu (River Map)
            if (astroData.hetu) {
                formattedAstrology.heTu = {
                    generationNumber: astroData.hetu.personalNumbers?.generation,
                    completionNumber: astroData.hetu.personalNumbers?.completion,
                    lifePath: astroData.hetu.lifePath,
                    elementalPhases: astroData.hetu.elementalPhases
                };
            }

            // Luo Shu (Magic Square)
            if (astroData.luoshu) {
                formattedAstrology.luoShu = {
                    mingGua: astroData.luoshu.mingGua,
                    fengShui: astroData.luoshu.fengshui
                };
            }

            // Lunar Mansion from API if available
            if (astroData.lunarMansion) {
                formattedAstrology.lunarMansion = astroData.lunarMansion;
            }

            // BaZi (Four Pillars) - Current/Moment
            if (astroData.bazi) {
                formattedAstrology.bazi = {
                    dayMaster: astroData.bazi.dayMaster,
                    year: astroData.bazi.year,
                    month: astroData.bazi.month,
                    day: astroData.bazi.day,
                    hour: astroData.bazi.hour,
                    strength: astroData.bazi.strength
                };
            }

            // BaZi Comparison (Birth vs Current) if birth date provided
            if (astroData.comparison?.birthBazi) {
                formattedAstrology.comparison = {
                    birthDayMaster: astroData.comparison.birthBazi.dayMaster,
                    currentInfluence: astroData.comparison.currentInfluence,
                    cycles: astroData.comparison.cycles
                };
            }
        }

        // Build the base request body for modular endpoints
        // Validate and sanitize input data
        const sanitizedLines = Array.isArray(lines) ? lines.map((l, i) => ({
            isYang: Boolean(l.isYang),
            isChanging: Boolean(l.isChanging)
        })) : [];

        if (sanitizedLines.length !== 6) {
            console.error(`[AI] Invalid lines array: expected 6, got ${sanitizedLines.length}`);
        }

        // Get full hexagram data including trigrams
        const fullHexData = this.hexagrams.find(h => h.number === hex?.number);

        // Get trigram elements from TRIGRAMS lookup (using binary key)
        const binaryKey = this.currentReading.binaryKey;
        const lowerTrigramCode = binaryKey?.substring(0, 3);
        const upperTrigramCode = binaryKey?.substring(3, 6);
        const lowerTrigram = lowerTrigramCode ? TRIGRAMS[lowerTrigramCode] : null;
        const upperTrigram = upperTrigramCode ? TRIGRAMS[upperTrigramCode] : null;

        const baseRequest = {
            question: String(this.currentQuestion || ''),
            hexagram: {
                number: Number(hex?.number) || 1,
                name_en: String(hex?.name_en || 'Unknown'),
                element: fullHexData?.element || hex?.element,
                // Include trigram data WITH ELEMENTS for element analysis
                trigramUpper: upperTrigram ? {
                    binary: upperTrigramCode,
                    name: upperTrigram.name?.en || upperTrigram.name,
                    element: upperTrigram.nature?.element || upperTrigram.element,
                    symbol: upperTrigram.symbol
                } : null,
                trigramLower: lowerTrigram ? {
                    binary: lowerTrigramCode,
                    name: lowerTrigram.name?.en || lowerTrigram.name,
                    element: lowerTrigram.nature?.element || lowerTrigram.element,
                    symbol: lowerTrigram.symbol
                } : null
            },
            lines: sanitizedLines,
            binaryKey: this.currentReading.binaryKey,
            mansion: mansion ? {
                num: mansion.num,
                name_en: mansion.name_en,
                group: mansion.group,
                element: mansion.element,
                animal: mansion.animal
            } : undefined,
            // Only include birthBazi if user provided birth data
            ...(this.currentReading.birthBazi && {
                birthBazi: this.currentReading.birthBazi,
                hasBirthData: true
            }),
            // Always include current/moment BaZi (we have this immediately from local calculation)
            momentBazi: this.currentReading.currentBazi,
            currentBazi: this.currentReading.currentBazi, // Keep for backward compatibility
            // Formatted astrology data for AI analysis (only if API has returned)
            astrology: Object.keys(formattedAstrology).length > 0 ? formattedAstrology : undefined,
            // Note to AI about data availability
            celestialDataStatus: Object.keys(formattedAstrology).length > 0
                ? 'complete'
                : 'pending_api_response',
            // Required output structure for analysis sections
            requiredOutputStructure: {
                description: "Each analysis section must follow 3-layer pipeline:",
                pipeline: [
                    "1. technicalData (JSON): Raw technical/astrology data",
                    "2. technicalAnalysis: Classical interpretation using ONLY canonical sources",
                    "3. colloquialAnalysis: Modern practical interpretation of classics"
                ],
                sections: ["celestial", "elements", "houtou", "analysis", "symbolism", "advice"]
            },
            // Analysis workflow: sequential processing with consolidation
            analysisWorkflow: {
                sequence: "Technical Data → Technical Analysis → Colloquial Analysis → Consolidation → Advice",
                description: "Each stage output feeds into the next stage as context",
                finalOutput: "advice"  // Final synthesized recommendation
            },
            // CRITICAL: Primary focus of the reading
            primaryFocus: {
                mainSubject: "The HEXAGRAM and its changing lines are the primary focus of the reading",
                astrologyRole: "Chinese astrology (BaZi, Lunar Mansion, Life Gua, Tai Sui, He Tu, Luo Shu) provides CELESTIAL CONTEXT to inform the hexagram interpretation - it does NOT replace the hexagram meaning",
                structure: [
                    "1. Begin with hexagram meaning from Zhou Yi",
                    "2. Analyze moving lines and their changes",
                    "3. Use astrology as cosmic timing/elemental context",
                    "4. Synthesize: How does the celestial context MODIFY or AMPLIFY the hexagram message?",
                    "5. Never let astrology overshadow the hexagram's core message"
                ]
            },
            // CRITICAL: Source material constraints
            sourceConstraints: {
                allowedSources: [
                    "Zhou Yi (I Ching) - Original hexagram texts",
                    "Dao De Jing (Tao Te Ching) - Laozi's wisdom",
                    "Zhuangzi - Daoist philosophy",
                    "Huainanzi - Astrological and cosmological texts",
                    "Classical Chinese astrology texts (BaZi, Zi Wei, Qi Men)",
                    "Traditional Five Elements theory",
                    "Bagua (Eight Trigrams) classical interpretations"
                ],
                forbiddenSources: [
                    "Modern self-help books",
                    "Contemporary psychology theories",
                    "Western esoteric traditions",
                    "Personal opinions not grounded in classics",
                    "Internet/blog wisdom",
                    "Financial investment advice"
                ],
                interpretationRules: [
                    "Classics can be interpreted in modern context (e.g., 'investment' as modern form of 'accumulation/resource management')",
                    "BUT advice must NOT give specific directives (do not say 'invest in X', 'buy Y', 'sell Z')",
                    "Focus on principles, virtues, timing, and universal patterns from the classics",
                    "Advice should guide HOW to think/decide, not WHAT specifically to do"
                ]
            },
            equilibrium: equilibrium ? {
                yangCount: equilibrium.yangCount,
                yinCount: equilibrium.yinCount,
                balanceState: equilibrium.balanceState,
                movingCount: equilibrium.movingCount
            } : undefined,
            lang: this.lang,
            historyAnalysis: contextData.historyAnalysis,
            historyEntries: contextData.historyEntries, // Pass raw entries for smart compression
            askAgainSource: this.askAgainSource
            // NOTE: systemInstructions removed — each backend section generator defines its own
            // system prompt. Sending it here only bloated every request payload for no effect.
        };

        // ====================================================================
        // 3-STEP PIPELINE: getResponse → formatAndVerify → translateToLang
        // ====================================================================
        const t = I18N[this.lang] || I18N['en'];

        // STEP 1: Get Response — try strategies 0→1→2→3 with fallbacks
        console.log('[PIPELINE] Step 1/3: Getting AI response...');
        UI.renderAILoading(this.lang, t.gatheringWisdom || 'Gathering wisdom...');
        const { result: rawResult, error, strategy } = await this.getAIResponse(baseRequest);

        if (!rawResult) {
            console.error('[PIPELINE] All interpretation endpoints failed, using fallback');
            const fallbackResult = this.createFallbackInterpretation();
            this.currentReading.interpretation = fallbackResult;
            UI.renderAIInterpretation(fallbackResult, this.lang);
            UI.hideAILoading();
            UI.showError(`Interpretation service temporarily unavailable. Using offline fallback. (${error?.message || 'Unknown error'})`);
            return;
        }

        // STEP 2: Format & Verify — structure, clean, post-process
        console.log('[PIPELINE] Step 2/3: Formatting and verifying response...');
        const verifiedResult = this.formatAndVerifyResponse(rawResult);

        // STEP 3: Translate to selected language
        console.log(`[PIPELINE] Step 3/3: Translating to ${this.lang}...`);
        const result = await this.translateToSelectedLanguage(verifiedResult);

        // RENDER & PERSIST
        console.log('[PIPELINE] Pipeline complete, rendering...');
        this.currentReading.interpretation = result;
        UI.renderAIInterpretation(result, this.lang);

        // Re-render translation with API-provided translations if any
        const hexData = this.hexagrams.find(h => h.number === this.currentReading.hex.number);
        if (hexData) {
            UI.renderTranslation(hexData, this.lang, result);
        }

        // Update storage with interpretation
        const history = Storage.getJSON('iChingHistory');
        const idx = history.findIndex(h => h.requestTimestamp === this.currentReading.requestTimestamp);
        if (idx !== -1) {
            history[idx].interpretation = result;
            Storage.setJSON('iChingHistory', history);
        }

        // Fetch secondary endpoints in parallel (remedies, bagua medicine/feng shui)
        // Skip if using Strategy 0 (3-tab) since those endpoints already return this data
        if (strategy !== 0) {
            await this.fetchSecondaryEndpoints(baseRequest, result);
        } else {
            console.log('[PIPELINE] Strategy 0 used - skipping secondary endpoints (already included in tabs)');
            // Ensure remedies and baguaMedicine from 3-tab response are properly stored
            if (result.remedies) {
                this.currentReading.interpretation.remedies = result.remedies;
                // Render remedies immediately since we already have them
                UI.renderRemediesTabbed(result.remedies, this.lang);
            }
            if (result.baguaMedicine) {
                this.currentReading.interpretation.baguaMedicine = result.baguaMedicine;
                // Render Bagua Medicine immediately since we already have it
                UI.renderBaguaMedicine(result.baguaMedicine, this.lang);
            }
        }

        // Hide loading animation after all critical translations are complete
        UI.hideAILoading();
    }

    // ========================================================================
    // PIPELINE STEP 1: Get AI Response
    // Tries 4 strategies with progressive fallback
    // Returns { result, error } where result is null if all strategies fail
    // ========================================================================
    static async getAIResponse(baseRequest) {
        let result = null;
        let error = null;
        const t = I18N[this.lang] || I18N['en'];

        // Strategy 0: NEW — 3-tab concurrent fetching (fastest, most efficient)
        try {
            console.log('[PIPELINE:GET] Strategy 0 — 3-tab concurrent fetching...');
            result = await this.fetchTabsConcurrent(baseRequest);
            if (result) {
                console.log('[PIPELINE:GET] Strategy 0 succeeded');
                return { result, error: null, strategy: 0 };
            }
        } catch (e) {
            console.warn('[PIPELINE:GET] Strategy 0 failed:', e.message);
            error = e;
        }

        // Strategy 1: Frontend-driven sequential section fetching (per-section HTTP calls)
        try {
            console.log('[PIPELINE:GET] Strategy 1 — Sequential section fetching...');
            result = await this.fetchSectionsSequential(baseRequest);
            if (result) {
                console.log('[PIPELINE:GET] Strategy 1 succeeded');
                return { result, error: null, strategy: 1 };
            }
        } catch (e) {
            console.warn('[PIPELINE:GET] Strategy 1 failed:', e.message);
            error = e;
        }

        // Strategy 2: Simple endpoint (single server-side call)
        try {
            console.log('[PIPELINE:GET] Strategy 2 — /interpret-simple...');
            UI.renderAILoading(this.lang, t.focusingQuery || 'Focusing query...');
            result = await this.callInterpretEndpoint('/interpret-simple', baseRequest, 60000);
            if (result) {
                console.log('[PIPELINE:GET] Strategy 2 succeeded');
                return { result, error: null, strategy: 2 };
            }
        } catch (e) {
            console.warn('[PIPELINE:GET] Strategy 2 failed:', e.message);
            error = e;
        }

        // Strategy 3: Legacy monolithic endpoint
        try {
            console.log('[PIPELINE:GET] Strategy 3 — /interpret (legacy)...');
            UI.renderAILoading(this.lang, t.usingTraditional || 'Using traditional method...');
            result = await this.callInterpretEndpoint('/interpret', baseRequest, 90000);
            if (result) {
                console.log('[PIPELINE:GET] Strategy 3 succeeded');
                return { result, error: null, strategy: 3 };
            }
        } catch (e) {
            console.error('[PIPELINE:GET] All strategies failed:', e.message);
            error = e;
        }

        return { result: null, error, strategy: null };
    }

    // ========================================================================
    // PIPELINE STEP 2: Format & Verify Response
    // Ensures structural integrity, cleans content, organizes sections
    // Operates on English content before translation for clean input
    // ========================================================================
    static formatAndVerifyResponse(result) {
        // Preserve remedies and baguaMedicine from 3-tab architecture
        const remedies = result.remedies;
        const baguaMedicine = result.baguaMedicine;
        
        // 2a. Ensure all language keys and required fields exist
        this.ensureInterpretationStructure(result);
        console.log('[PIPELINE:FMT] Structure ensured for all languages');

        // 2b. Post-process: clean filler, fix formatting, organize sections
        // Done BEFORE translation so the translator receives clean English input
        const processed = this.postProcessInterpretation(result);
        console.log('[PIPELINE:FMT] Post-processing complete');
        
        // Restore preserved fields
        if (remedies) processed.remedies = remedies;
        if (baguaMedicine) processed.baguaMedicine = baguaMedicine;

        return processed;
    }

    // ========================================================================
    // PIPELINE STEP 3: Translate to Selected Language
    // Translates verified English content to user's current language
    // Skips if language is English or unique translation already exists
    // Includes verification that classical texts (judgment, image, lines)
    // are actually translated and not echoed back in English
    // ========================================================================
    static async translateToSelectedLanguage(result) {
        const targetLang = this.lang;

        // No translation needed for English
        if (targetLang === 'en') {
            console.log('[PIPELINE:TRANSLATE] Language is English, skipping translation');
            return result;
        }

        // Find source language dynamically (not always 'en')
        const sourceLang = this.getSourceLang(result);

        // Check if we already have unique translated content
        const hasUniqueTranslation = result[targetLang]?.analysis &&
            result[targetLang].analysis !== result[sourceLang]?.analysis;
        if (hasUniqueTranslation) {
            console.log(`[PIPELINE:TRANSLATE] ${targetLang} already has unique content, skipping`);
            return result;
        }

        // No source content to translate from
        if (!result[sourceLang]?.analysis) {
            console.warn(`[PIPELINE:TRANSLATE] No ${sourceLang} analysis content to translate from`);
            return result;
        }

        const t = I18N[targetLang] || I18N['en'];
        UI.renderAILoading(targetLang, t.translating || 'Translating...');
        console.log(`[PIPELINE:TRANSLATE] Translating to ${targetLang}...`);

        // Clear old caches periodically
        this.clearOldTranslationCaches();

        const readingId = this.currentReading.requestTimestamp;
        const hexagramName = `${this.currentReading.hex.name_en} (${this.currentReading.hex.name_zh})`;

        // Primary: Section-based TranslationService
        try {
            await TranslationService.translateVisibleSections(
                readingId,
                result,
                targetLang,
                hexagramName
            );

            TranslationService.markTranslatableElements();

            // Initialize lazy observer for remaining sections
            TranslationService.initLazyObserver(
                readingId,
                result,
                targetLang,
                hexagramName
            );

            console.log(`[PIPELINE:TRANSLATE] Translation to ${targetLang} complete`);

            // DEBUG: Log what we have after translation
            if (result[targetLang]) {
                const t = result[targetLang];
                console.log(`[PIPELINE:TRANSLATE] ${targetLang} content after translation:`, {
                    hasAnalysis: !!t.analysis,
                    hasCelestial: !!t.celestial,
                    hasElements: !!t.elements,
                    hasAdvice: !!t.advice,
                    analysisPreview: t.analysis?.substring(0, 50),
                    celestialPreview: t.celestial?.substring(0, 50)
                });
            }
        } catch (e) {
            console.warn(`[PIPELINE:TRANSLATE] Section-based translation failed: ${e.message}`);

            // Fallback: Legacy monolithic translation
            try {
                console.log('[PIPELINE:TRANSLATE] Falling back to legacy translation...');
                const translated = await this.translateToLanguage(
                    readingId,
                    result,
                    targetLang,
                    hexagramName
                );
                // Merge legacy results back
                if (translated[targetLang]) {
                    result[targetLang] = { ...result[targetLang], ...translated[targetLang] };
                }
                console.log(`[PIPELINE:TRANSLATE] Legacy translation to ${targetLang} complete`);
            } catch (fallbackError) {
                console.error('[PIPELINE:TRANSLATE] All translation methods failed:', fallbackError.message);
            }
        }

        // VERIFY: Classical texts (judgment, image, lines) were actually translated
        // If they're identical to English, the translation endpoint echoed them back
        this.verifyClassicalTranslation(result, targetLang, readingId, hexagramName);

        return result;
    }

    // ========================================================================
    // Verify that classical texts (judgment, image, lines) in the target
    // language are actually translated and not Chinese echoed back.
    // If untranslated, clear them so renderTranslation falls back to DB data.
    // ========================================================================
    static verifyClassicalTranslation(result, targetLang, readingId, hexagramName) {
        if (targetLang === 'en') return;

        // For classical texts, compare against Chinese (the source), not English
        const zh = result.zh || {};
        const target = result[targetLang] || {};
        const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

        // Helper to check if text contains Chinese characters
        const hasChinese = (s) => /[\u4e00-\u9fa5]/.test(s || '');

        // Check judgment - if target still has Chinese, translation failed
        if (target.judgment && hasChinese(target.judgment)) {
            console.warn(`[PIPELINE:VERIFY] ${targetLang} judgment still contains Chinese — clearing so UI falls back to DB`);
            target.judgment = '';
        }

        // Check image - if target still has Chinese, translation failed
        if (target.image && hasChinese(target.image)) {
            console.warn(`[PIPELINE:VERIFY] ${targetLang} image still contains Chinese — clearing so UI falls back to DB`);
            target.image = '';
        }

        // Check lines - if any target line still has Chinese, translation failed
        if (Array.isArray(target.lines)) {
            const chineseLines = target.lines.filter(l => hasChinese(l));
            if (chineseLines.length > 0) {
                console.warn(`[PIPELINE:VERIFY] ${targetLang} lines still contain Chinese — clearing so UI falls back to DB`);
                target.lines = ['', '', '', '', '', ''];
            }
        }

        // Verify key interpretation fields too (analysis, advice, etc.)
        const en = result.en || {};
        const fieldsToCheck = ['analysis', 'celestial', 'elements', 'advice', 'symbolism', 'movingLines',
            'coreTechnical', 'coreColloquial', 'celestialTechnical', 'celestialColloquial',
            'elementsTechnical', 'elementsColloquial', 'houtouTechnical', 'houtouColloquial'];
        let translatedCount = 0;
        let untranslatedCount = 0;
        fieldsToCheck.forEach(field => {
            // Skip if no English source to compare
            if (!en[field] || !en[field].trim()) return;

            // Check if translation exists and is different from English
            if (target[field] && target[field].trim && target[field].trim()) {
                if (normalize(target[field]) === normalize(en[field])) {
                    untranslatedCount++;
                    console.warn(`[PIPELINE:VERIFY] ${targetLang}.${field} is identical to English`);
                } else {
                    translatedCount++;
                    console.log(`[PIPELINE:VERIFY] ${targetLang}.${field} is translated`);
                }
            } else {
                console.warn(`[PIPELINE:VERIFY] ${targetLang}.${field} is missing`);
            }
        });

        const totalFields = translatedCount + untranslatedCount;
        if (totalFields > 0) {
            console.log(`[PIPELINE:VERIFY] Summary: ${translatedCount}/${totalFields} fields translated, ${untranslatedCount} identical to English`);
        }
    }

    // OPTIMIZED: Max 3 concurrent connections, compact prompts, keep-alive
    static async fetchSectionsSequential(baseRequest) {
        console.log('[AI:OPT] Fetching with dependency-based chunks, compact prompts...');

        const timeoutMs = 60000;

        // Dependency-based chunks for proper context flow:
        // Layer 1: Foundation (no prior context needed)
        // Layer 2: Builds on celestial
        // Layer 3: Builds on Layer 1 + 2
        // Layer 4: Builds on everything
        const chunks = [
            ['celestial-astro', 'celestial-bazi'],                           // Layer 1: Foundation
            ['elements-analysis', 'houtou-emperor', 'houtou-master'],        // Layer 2: Builds on celestial
            ['elements-synthesis', 'core-technical', 'core-narrative'],       // Layer 3: Builds on Layer 1 + 2
            ['core-application', 'lines', 'classical']                       // Layer 4: Builds on everything
        ];

        const sectionsData = {};

        // Process chunks sequentially, sections within each chunk in parallel
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex];
            console.log(`[AI:OPT] Processing Layer ${chunkIndex + 1}: ${chunk.join(', ')}`);

            // Fetch chunk in parallel (max 3 at a time)
            const chunkPromises = chunk.map(async (section) => {
                try {
                    const data = await this.fetchSectionWithKeepAlive(section, baseRequest, timeoutMs);
                    return { section, data, success: true };
                } catch (e) {
                    console.warn(`[AI:OPT] ${section} failed: ${e.message}`);
                    return { section, data: null, success: false };
                }
            });

            const results = await Promise.all(chunkPromises);

            // Store successful results
            for (const result of results) {
                if (result.success && result.data) {
                    sectionsData[result.section] = result.data;
                }
            }

            // Accumulate cumulativeTechnicalData so subsequent generators receive prior context
            let addedContext = '';
            for (const result of results) {
                if (result.success && result.data) {
                    const d = result.data;
                    if (d.technicalAnalysis && typeof d.technicalAnalysis === 'string') {
                        addedContext += `\n[${result.section}]\n${d.technicalAnalysis.substring(0, 500)}\n`;
                    }
                    if (d.technicalData && typeof d.technicalData === 'string' && addedContext.length < 4000) {
                        addedContext += `[data:${result.section}] ${d.technicalData.substring(0, 300)}\n`;
                    }
                    // Phase 2: Include colloquialInterpretation in accumulated context
                    if (d.colloquialInterpretation && typeof d.colloquialInterpretation === 'string' && addedContext.length < 5000) {
                        addedContext += `[interpretation:${result.section}] ${d.colloquialInterpretation.substring(0, 400)}\n`;
                    }
                }
            }
            if (addedContext) {
                const existing = baseRequest.cumulativeTechnicalData || '';
                baseRequest.cumulativeTechnicalData = (existing + addedContext).substring(0, 8000);
                console.log(`[AI:OPT] cumulativeTechnicalData now ${baseRequest.cumulativeTechnicalData.length} chars`);
            }

            // Delay between chunks to let browser connection pool recover
            if (chunkIndex < chunks.length - 1) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // Compose results
        return this.clientSideComposeFromSections(sectionsData);
    }

    // ========================================================================
    // NEW: 3-Tab Concurrent Fetching (Strategy 0)
    // Fetches Interpretation, Remedies, and Feng Shui/Medicine tabs concurrently
    // Returns fully formatted, translated content for each tab
    // ========================================================================
    static async fetchTabsConcurrent(baseRequest) {
        console.log('[AI:TABS] Starting 3-tab concurrent fetch...');
        const t = I18N[this.lang] || I18N['en'];
        
        const timeoutMs = 60000;
        
        // Build common request data
        const tabRequest = {
            hexagram: baseRequest.hexagram,
            lines: baseRequest.lines,
            question: baseRequest.question,
            astrology: baseRequest.astrology,
            bazi: {
                birth: baseRequest.birthBazi,
                current: baseRequest.currentBazi
            },
            equilibrium: baseRequest.equilibrium,
            lang: this.lang
        };

        // Show loading indicator
        if (this.loadingOverlay) {
            this.loadingOverlay.addProcess('interpretation-tab', t.generatingInterp || 'Generating interpretation...');
            this.loadingOverlay.addProcess('remedies-tab', t.remedies || 'Remedies');
            this.loadingOverlay.addProcess('fengshui-medicine-tab', t.baguaMedicineTitle || 'Feng Shui & Medicine');
        }

        try {
            // Fetch all 3 tabs concurrently
            const [interpretationResult, remediesResult, fengshuiMedicineResult] = await Promise.all([
                // Tab 1: Interpretation
                this.fetchTab('interpretation-tab', tabRequest, timeoutMs).then(result => {
                    console.log('[AI:TABS] Interpretation tab received');
                    if (this.loadingOverlay) this.loadingOverlay.completeProcess('interpretation-tab');
                    return result;
                }).catch(err => {
                    console.warn('[AI:TABS] Interpretation tab failed:', err.message);
                    if (this.loadingOverlay) this.loadingOverlay.failProcess('interpretation-tab', err.message);
                    return null;
                }),
                
                // Tab 2: Remedies
                this.fetchTab('remedies-tab', tabRequest, timeoutMs).then(result => {
                    console.log('[AI:TABS] Remedies tab received');
                    if (this.loadingOverlay) this.loadingOverlay.completeProcess('remedies-tab');
                    return result;
                }).catch(err => {
                    console.warn('[AI:TABS] Remedies tab failed:', err.message);
                    if (this.loadingOverlay) this.loadingOverlay.failProcess('remedies-tab', err.message);
                    return null;
                }),
                
                // Tab 3: Feng Shui & Medicine
                this.fetchTab('fengshui-medicine-tab', tabRequest, timeoutMs).then(result => {
                    console.log('[AI:TABS] Feng Shui/Medicine tab received');
                    if (this.loadingOverlay) this.loadingOverlay.completeProcess('fengshui-medicine-tab');
                    return result;
                }).catch(err => {
                    console.warn('[AI:TABS] Feng Shui/Medicine tab failed:', err.message);
                    if (this.loadingOverlay) this.loadingOverlay.failProcess('fengshui-medicine-tab', err.message);
                    return null;
                })
            ]);

            // Check if we got at least the interpretation tab
            if (!interpretationResult) {
                throw new Error('Interpretation tab failed - cannot proceed without main analysis');
            }

            console.log('[AI:TABS] All tabs fetched successfully');

            // Handle compact format (c,e,a,d,r) or full format (celestial,elements,analysis,advice,quotedReferences)
            const normalizeInterpretation = (data) => {
                if (!data) return {};
                // Compact format
                if (data.c || data.e || data.a || data.d) {
                    return {
                        celestial: data.c || '',
                        elements: data.e || '',
                        analysis: data.a || '',
                        advice: data.d || '',
                        quotedReferences: data.r || []
                    };
                }
                // Full format
                return {
                    celestial: data.celestial || '',
                    elements: data.elements || '',
                    analysis: data.analysis || '',
                    advice: data.advice || '',
                    quotedReferences: data.quotedReferences || []
                };
            };
            
            const interp = normalizeInterpretation(interpretationResult);

            // Build result in the format expected by the UI
            return {
                [this.lang]: {
                    // Main interpretation
                    analysis: interp.analysis,
                    celestial: interp.celestial,
                    elements: interp.elements,
                    advice: interp.advice,
                    
                    // Quoted references
                    quotedReferences: interp.quotedReferences
                },
                
                // Remedies - store under current language (dynamic source language support)
                remedies: remediesResult ? { [this.lang]: { remedies: remediesResult.remedies || [] } } : null,
                
                // Feng Shui & Medicine - store under current language (dynamic source language support)
                baguaMedicine: fengshuiMedicineResult ? {
                    [this.lang]: {
                        fengShui: fengshuiMedicineResult.fengshui || fengshuiMedicineResult.fengShui || {},
                        medicine: fengshuiMedicineResult.medicine || {}
                    }
                } : null
            };
            
        } catch (error) {
            console.error('[AI:TABS] Concurrent fetch failed:', error);
            throw error;
        }
    }

    // Helper to fetch a single tab with retry logic
    static async fetchTab(tabName, requestData, timeoutMs, maxRetries = 2) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                console.log(`[AI:FETCH] Retry ${attempt}/${maxRetries} for ${tabName}...`);
                await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            
            try {
                const response = await fetch(`${CONFIG.HEXAGRAM_FUNCTION_URL}/${tabName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(requestData),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                const result = await response.json();
                
                if (result.error) {
                    throw new Error(result.error.message || 'Unknown error');
                }
                
                return result.data;
            } catch (error) {
                clearTimeout(timeoutId);
                lastError = error;
                
                // Don't retry on abort errors (user cancelled)
                if (error.name === 'AbortError') {
                    throw error;
                }
                
                console.warn(`[AI:FETCH] Attempt ${attempt + 1} failed for ${tabName}:`, error.message);
            }
        }
        
        throw lastError;
    }

    // Fetch with keep-alive headers for connection reuse
    static async fetchSectionWithKeepAlive(section, baseRequest, timeoutMs) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Build compact request (already optimized by buildSectionRequest)
        const sectionRequest = this.buildSectionRequest(section, baseRequest);
        
        // DEBUG: Log BaZi data being sent for celestial sections
        if (section.includes('celestial') || section.includes('bazi') || section.includes('houtou')) {
            console.log(`[AI:BUILD:${section}] BaZi data sent:`, {
                hasCurrentBazi: !!sectionRequest.currentBazi,
                hasMomentBazi: !!sectionRequest.momentBazi,
                hasBirthBazi: !!sectionRequest.birthBazi,
                currentBaziDayMaster: sectionRequest.currentBazi?.dayMaster,
                currentBaziStrength: sectionRequest.currentBazi?.strength?.result,
                currentBaziPillars: sectionRequest.currentBazi ? {
                    year: sectionRequest.currentBazi.year?.stem?.zh + sectionRequest.currentBazi.year?.branch?.zh,
                    month: sectionRequest.currentBazi.month?.stem?.zh + sectionRequest.currentBazi.month?.branch?.zh,
                    day: sectionRequest.currentBazi.day?.stem?.zh + sectionRequest.currentBazi.day?.branch?.zh,
                    hour: sectionRequest.currentBazi.hour?.stem?.zh + sectionRequest.currentBazi.hour?.branch?.zh
                } : null
            });
        }

        const requestBody = JSON.stringify(sectionRequest);

        try {
            const response = await fetch(`${CONFIG.HEXAGRAM_FUNCTION_URL}/${section}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Connection': 'keep-alive' // Option D: Connection reuse
                },
                body: requestBody,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.data;
        } catch (e) {
            clearTimeout(timeoutId);
            throw e;
        }
    }

    // Helper: Incremental compose with callback for accumulated result
    static async incrementalCompose(section, sectionData, timeoutMs, onSuccess) {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), timeoutMs);

        try {
            // Get current accumulated value from closure or global
            const currentAccumulated = this._composeAccumulated || null;

            const composeRequest = {
                section,
                sectionData,
                accumulated: currentAccumulated || undefined
            };

            const requestBody = JSON.stringify(composeRequest);

            const response = await fetch(`${CONFIG.HEXAGRAM_FUNCTION_URL}/interpret-compose`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody,
                signal: controller.signal
            });

            clearTimeout(tid);

            if (!response.ok) {
                console.warn(`[AI:COMPOSE] ${section} HTTP ${response.status}`);
                return false;
            }

            const result = await response.json();
            if (result.success) {
                const data = result.data?.interpretation || result.interpretation;
                this._composeAccumulated = data;
                if (onSuccess) onSuccess(data);
                console.log(`[AI:COMPOSE] ${section} succeeded`);
                return true;
            }

            console.warn(`[AI:COMPOSE] ${section} returned success=false`);
            return false;
        } catch (e) {
            clearTimeout(tid);
            console.warn(`[AI:COMPOSE] ${section} error: ${e.message}`);
            return false;
        }
    }

    // Helper: Client-side composition fallback when compose endpoint fails
    static clientSideComposeFromSections(sectionsData) {
        console.log('[AI:FALLBACK] Using client-side composition');
        console.log('[AI:FALLBACK] Sections received:', Object.keys(sectionsData));

        // Start with a base structure for all languages
        const result = { en: {}, es: {}, it: {}, zh: {} };
        const emptyLines = ['', '', '', '', '', ''];

        // Helper to add section data to result
        const addSection = (name, data) => {
            if (!data) return;

            // Add technical data (language-independent)
            if (data.technicalData) {
                result[`${name}TechnicalData`] = data.technicalData;
            }

            // Handle classical section specially (multilingual format)
            if (name === 'classical') {
                // Classical returns: { judgment: {en, es, it, zh}, image: {...}, lines: {...} }
                ['en', 'es', 'it', 'zh'].forEach(lang => {
                    if (data.judgment?.[lang]) {
                        result[lang].judgment = data.judgment[lang];
                    }
                    if (data.image?.[lang]) {
                        result[lang].image = data.image[lang];
                    }
                    if (data.lines?.[lang] && Array.isArray(data.lines[lang])) {
                        result[lang].lines = data.lines[lang];
                        result[lang].lineTexts = data.lines[lang];
                    }
                });
                return;
            }

            // Map backend field names to frontend field names
            // Backend returns: technicalAnalysis, colloquialInterpretation, etc.
            // Frontend expects: celestialTechnical, celestialColloquial, etc.
            const fieldMappings = {
                'celestial-astro': {
                    'technicalAnalysis': 'celestialTechnical',
                    'colloquialInterpretation': 'celestialColloquial',
                    'celestial': 'celestial',
                    'lunarMansion': 'lunarMansion'
                },
                'celestial-bazi': {
                    'technicalAnalysis': 'celestialTechnical',
                    'colloquialInterpretation': 'celestialColloquial',
                    'celestial': 'celestial',
                    'birthBazi': 'birthBazi',
                    'currentBazi': 'currentBazi'
                },
                'elements-analysis': {
                    'technicalAnalysis': 'elementsTechnical',
                    'composition': 'elementsTechnical',
                    'trigramRelationship': 'elementsTechnical',
                    'yinYangAnalysis': 'elementsTechnical'
                },
                'elements-synthesis': {
                    'colloquialInterpretation': 'elementsColloquial',
                    'elements': 'elements'
                },
                'houtou-emperor': {
                    'technicalAnalysis': 'houtouTechnical',
                    'colloquialInterpretation': 'houtouColloquial',
                    'emperorAnalysis': 'emperorAnalysis'
                },
                'houtou-master': {
                    'technicalAnalysis': 'houtouTechnical',
                    'colloquialInterpretation': 'houtouColloquial',
                    'masterAnalysis': 'masterAnalysis'
                },
                'core-technical': {
                    'technicalAnalysis': 'coreTechnical',
                    'symbolism': 'symbolism'
                },
                'core-narrative': {
                    'analysis': 'analysis',
                    'colloquialInterpretation': 'coreColloquial'
                },
                'core-application': {
                    'advice': 'advice',
                    'application': 'application',
                    'colloquialInterpretation': 'coreColloquial'
                },
                'lines': {
                    'movingLines': 'movingLines',
                    'lineTexts': 'lineTexts'
                }
            };

            const mapping = fieldMappings[name];
            if (mapping) {
                Object.entries(mapping).forEach(([backendField, frontendField]) => {
                    if (data[backendField] !== undefined && data[backendField] !== '') {
                        // For text fields, use the frontend field name
                        result.en[frontendField] = data[backendField];
                    }
                });
            } else {
                // Fallback: copy fields as-is
                const fields = ['technicalAnalysis', 'colloquialInterpretation', 'analysis', 'advice', 'symbolism'];
                fields.forEach(field => {
                    if (data[field]) {
                        result.en[field] = data[field];
                    }
                });
            }

            // Handle moving lines specially
            if (data.movingLines && Array.isArray(data.movingLines)) {
                result.en.movingLines = data.movingLines;
                if (!result.en.lines) result.en.lines = [...emptyLines];
                data.movingLines.forEach((line, idx) => {
                    if (idx < 6 && data.lineTexts && Array.isArray(data.lineTexts) && data.lineTexts[idx]) {
                        const lineNum = parseInt(line, 10);
                        if (lineNum >= 1 && lineNum <= 6) {
                            result.en.lines[lineNum - 1] = data.lineTexts[idx];
                        }
                    }
                });
            }
        };

        // Add all sections
        Object.entries(sectionsData).forEach(([name, data]) => {
            addSection(name, data);
        });

        // Debug: log what fields are in result.en
        const enFields = Object.keys(result.en).filter(k => result.en[k] && (typeof result.en[k] === 'string' ? result.en[k].length > 0 : true));
        console.log('[AI:FALLBACK] Fields in result.en:', enFields);

        // Seed es/it/zh with English content so the UI always has something to show.
        // The translation pipeline will overwrite each field with the proper translation.
        ['es', 'it', 'zh'].forEach(lang => {
            // Deep-copy arrays, shallow-copy everything else
            Object.entries(result.en).forEach(([key, val]) => {
                if (result[lang][key] === undefined || result[lang][key] === null ||
                    (typeof result[lang][key] === 'string' && result[lang][key].length === 0) ||
                    (Array.isArray(result[lang][key]) && result[lang][key].length === 0)) {
                    result[lang][key] = Array.isArray(val) ? [...val] : val;
                }
            });
        });
        console.log('[AI:FALLBACK] Seeded es/it/zh with', enFields.length, 'fields from en');

        return result;
    }

    // Fetch interpretation sections in parallel (client-side composition)
    static async fetchModularSectionsParallel(baseRequest) {
        console.log('[AI:MODULAR] Fetching sections in parallel...');

        // Use split endpoints for faster processing
        const sections = ['celestial-astro', 'celestial-bazi', 'elements-analysis', 'elements-synthesis', 'houtou-emperor', 'houtou-master', 'core-technical', 'core-narrative', 'core-application', 'lines', 'classical'];
        const timeoutMs = 90000; // Increased to 90s per section

        // Fetch all sections in parallel
        const sectionPromises = sections.map(section =>
            this.fetchSection(section, baseRequest, timeoutMs)
        );

        const sectionResults = await Promise.allSettled(sectionPromises);

        // Collect successful results
        const sectionsData = {};
        let failedSections = [];

        sectionResults.forEach((result, index) => {
            const sectionName = sections[index];
            if (result.status === 'fulfilled' && result.value) {
                sectionsData[sectionName] = result.value;
                // Debug logging for classical section
                if (sectionName === 'classical') {
                    console.log('[AI:MODULAR] Classical section received:', {
                        judgment: {
                            en: result.value.judgment?.en?.substring(0, 50),
                            es: result.value.judgment?.es?.substring(0, 50),
                            it: result.value.judgment?.it?.substring(0, 50),
                            zh: result.value.judgment?.zh?.substring(0, 50)
                        }
                    });
                }
            } else {
                failedSections.push(sectionName);
                console.warn(`[AI:MODULAR] Section ${sectionName} failed:`, result.reason?.message);
            }
        });

        // Detect "hollow" successes — sections that returned OK but have all-empty content
        const contentSections = ['celestial-astro', 'celestial-bazi', 'elements-analysis', 'core-technical', 'core-narrative', 'core-application'];
        const emptySections = [];
        contentSections.forEach(s => {
            if (sectionsData[s] && !sectionsData[s].technicalAnalysis) {
                emptySections.push(s);
                delete sectionsData[s];
                failedSections.push(s);
            }
        });
        // Also check elements-synthesis for hollow content
        if (sectionsData['elements-synthesis'] && !sectionsData['elements-synthesis'].colloquialInterpretation) {
            emptySections.push('elements-synthesis');
            delete sectionsData['elements-synthesis'];
            failedSections.push('elements-synthesis');
        }
        if (emptySections.length > 0) {
            console.warn(`[AI:MODULAR] Detected hollow (empty) sections: ${emptySections.join(', ')}, will retry...`);
        }

        // Merge elements sub-sections into one combined object
        if (sectionsData['elements-analysis'] || sectionsData['elements-synthesis']) {
            sectionsData.elements = {
                ...(sectionsData['elements-analysis'] || {}),
                ...(sectionsData['elements-synthesis'] || {})
            };
            delete sectionsData['elements-analysis'];
            delete sectionsData['elements-synthesis'];
            console.log('[AI:MODULAR] Merged elements-analysis + elements-synthesis into elements');
        }

        // Merge houtou sub-sections (emperor + master) into one combined object
        if (sectionsData['houtou-emperor'] || sectionsData['houtou-master']) {
            sectionsData.houtou = {
                ...(sectionsData['houtou-emperor'] || {}),
                ...(sectionsData['houtou-master'] || {}),
                ...(sectionsData.houtou || {})
            };
            delete sectionsData['houtou-emperor'];
            delete sectionsData['houtou-master'];
            console.log('[AI:MODULAR] Merged houtou-emperor + houtou-master into houtou');
        }

        // Merge core sub-sections (technical + narrative) into one combined object
        if (sectionsData['core-technical'] || sectionsData['core-narrative']) {
            sectionsData['core-analysis'] = {
                ...(sectionsData['core-technical'] || {}),
                ...(sectionsData['core-narrative'] || {}),
                ...(sectionsData['core-analysis'] || {}),
                ...(sectionsData.core || {})
            };
            delete sectionsData['core-technical'];
            delete sectionsData['core-narrative'];
            console.log('[AI:MODULAR] Merged core-technical + core-narrative into core-analysis');
        }

        // Retry failed/hollow sections sequentially (avoids parallel LLM overload)
        if (failedSections.length > 0) {
            console.log(`[AI:MODULAR] Retrying ${failedSections.length} failed section(s) sequentially: ${failedSections.join(', ')}`);
            const stillFailed = [];
            for (const section of failedSections) {
                try {
                    console.log(`[AI:MODULAR] Retrying section: ${section}...`);
                    const retryResult = await this.fetchSection(section, baseRequest, timeoutMs);
                    if (retryResult) {
                        // For content sections, verify the retry actually returned content
                        const isContent = contentSections.includes(section);
                        if (isContent && !retryResult.technicalAnalysis) {
                            console.warn(`[AI:MODULAR] Retry for ${section} returned hollow data again`);
                            stillFailed.push(section);
                        } else {
                            sectionsData[section] = retryResult;
                            console.log(`[AI:MODULAR] Retry for ${section} succeeded`);
                        }
                    } else {
                        stillFailed.push(section);
                    }
                } catch (e) {
                    console.warn(`[AI:MODULAR] Retry for ${section} also failed: ${e.message}`);
                    stillFailed.push(section);
                }
            }
            failedSections = stillFailed;
        }

        // After retries, merge celestial sub-sections if they exist from retries
        if (sectionsData['celestial-astro'] || sectionsData['celestial-bazi']) {
            sectionsData.celestial = {
                ...(sectionsData.celestial || {}),
                ...(sectionsData['celestial-astro'] || {}),
                ...(sectionsData['celestial-bazi'] || {})
            };
            delete sectionsData['celestial-astro'];
            delete sectionsData['celestial-bazi'];
            console.log('[AI:MODULAR] Merged celestial-astro + celestial-bazi into celestial');
        }

        // After retries, merge elements sub-sections if they exist from retries
        if (sectionsData['elements-analysis'] || sectionsData['elements-synthesis']) {
            sectionsData.elements = {
                ...(sectionsData.elements || {}),
                ...(sectionsData['elements-analysis'] || {}),
                ...(sectionsData['elements-synthesis'] || {})
            };
            delete sectionsData['elements-analysis'];
            delete sectionsData['elements-synthesis'];
        }

        // Remove sub-section names from failedSections and add 'elements' if both halves failed
        const elemAnalysisFailed = failedSections.includes('elements-analysis');
        const elemSynthesisFailed = failedSections.includes('elements-synthesis');
        failedSections = failedSections.filter(s => s !== 'elements-analysis' && s !== 'elements-synthesis');
        if (elemAnalysisFailed && elemSynthesisFailed) {
            failedSections.push('elements');
        }

        // Merge core sub-sections
        if (sectionsData['core-technical'] || sectionsData['core-narrative']) {
            sectionsData['core-analysis'] = {
                ...(sectionsData['core-technical'] || {}),
                ...(sectionsData['core-narrative'] || {}),
                ...(sectionsData['core-analysis'] || {})
            };
            delete sectionsData['core-technical'];
            delete sectionsData['core-narrative'];
            console.log('[AI:MODULAR] Merged core-technical + core-narrative into core-analysis');
        }

        // Merge houtou sub-sections
        if (sectionsData['houtou-emperor'] || sectionsData['houtou-master']) {
            sectionsData.houtou = {
                ...(sectionsData['houtou-emperor'] || {}),
                ...(sectionsData['houtou-master'] || {}),
                ...(sectionsData.houtou || {})
            };
            delete sectionsData['houtou-emperor'];
            delete sectionsData['houtou-master'];
            console.log('[AI:MODULAR] Merged houtou-emperor + houtou-master into houtou');
        }

        // If we have all sections, compose them
        if (failedSections.length === 0) {
            console.log('[AI:MODULAR] All sections fetched, composing...');
            return await this.composeSections(sectionsData);
        }

        // If some sections failed but we have core analysis and at least 2 others, try to compose anyway
        if ((sectionsData['core-analysis'] || sectionsData.core) && Object.keys(sectionsData).length >= 3) {
            console.log('[AI:MODULAR] Partial sections, attempting compose with fallbacks...');
            // Fill in missing sections with empty data (use canonical names)
            const canonicalSections = ['celestial-astro', 'celestial-bazi', 'elements', 'core-technical', 'core-narrative', 'core-application', 'lines', 'classical'];
            canonicalSections.forEach(s => {
                if (!sectionsData[s]) {
                    sectionsData[s] = this.getEmptySection(s);
                }
            });
            return await this.composeSections(sectionsData);
        }

        throw new Error(`Failed to fetch required sections: ${failedSections.join(', ')}`);
    }

    // Build a minimal request body for a given section (strip unused fields)
    static buildSectionRequest(section, baseRequest) {
        // Pass-through sections build their own request — skip common field validation
        const passThroughSections = ['remedies-translate', 'remedies-verify', 'fulu-drawing-generate',
            'fulu-drawing-verify', 'fulu-drawing', 'translate'];
        if (passThroughSections.includes(section)) {
            return baseRequest;
        }

        // Common fields all sections may need
        const { question, hexagram, lines, lang, historyAnalysis, askAgainSource, historyEntries } = baseRequest;

        // DEBUG: Validate common fields
        if (!question || typeof question !== 'string') {
            console.warn(`[AI:BUILD] Invalid question for ${section}:`, typeof question);
        }
        if (!hexagram || typeof hexagram !== 'object') {
            console.warn(`[AI:BUILD] Invalid hexagram for ${section}:`, typeof hexagram);
        }
        if (!Array.isArray(lines) || lines.length !== 6) {
            console.warn(`[AI:BUILD] Invalid lines for ${section}:`, Array.isArray(lines) ? `length ${lines.length}` : typeof lines);
        }

        // Smart history summarization to reduce payload size (90% reduction)
        // Pass historyEntries if available for better compression
        const summarizedHistory = this.summarizeHistoryForRequest(historyAnalysis, historyEntries);

        // Log compression stats
        const originalLength = historyAnalysis?.length || 0;
        const compressedLength = summarizedHistory?.length || 0;
        if (originalLength > 500) {
            const savings = ((originalLength - compressedLength) / originalLength * 100).toFixed(0);
            console.log(`[AI:BUILD] History compressed: ${originalLength} → ${compressedLength} chars (${savings}% reduction)`);
        }

        const base = { question, hexagram, lines, lang, historyAnalysis: summarizedHistory, askAgainSource };

        // Cumulative technical data from previous sections (simplified markdown format)
        // Truncate if too large to prevent NS_BINDING_ABORTED
        let cumulativeTechData = baseRequest.cumulativeTechnicalData || '';
        if (cumulativeTechData.length > 8000) {
            console.warn(`[AI:BUILD] Truncating cumulativeTechnicalData from ${cumulativeTechData.length} to 8000 chars`);
            cumulativeTechData = cumulativeTechData.substring(0, 8000) + '\n\n...[truncated]';
        }

        switch (section) {
            case 'celestial':
            case 'celestial-astro':
            case 'celestial-bazi':
            case 'houtou':
            case 'houtou-emperor':
            case 'houtou-master':
                // CRITICAL: Include complete BaZi data for accurate celestial analysis
                // All four pillars needed for proper Day Master strength calculation
                const compactBaziForCelestial = (bazi) => {
                    if (!bazi) return undefined;
                    // Compact pillar data while keeping essential info
                    const compactPillar = (p) => p ? {
                        stem: { name: p.stem?.name, element: p.stem?.element, zh: p.stem?.zh },
                        branch: { name: p.branch?.name, element: p.branch?.element, zh: p.branch?.zh, hidden: p.branch?.hidden }
                    } : undefined;
                    return {
                        dayMaster: bazi.dayMaster ? {
                            stem: bazi.dayMaster.stem,
                            element: bazi.dayMaster.element,
                            polarity: bazi.dayMaster.polarity
                        } : undefined,
                        strength: {
                            result: bazi.strength?.result,
                            yongShen: bazi.strength?.yongShen,
                            favorable: bazi.strength?.favorable,
                            unfavorable: bazi.strength?.unfavorable
                        },
                        year: compactPillar(bazi.year),
                        month: compactPillar(bazi.month),
                        day: compactPillar(bazi.day),
                        hour: compactPillar(bazi.hour)
                    };
                };
                // Compact astrology data
                const compactAstrology = baseRequest.astrology ? {
                    lifeGua: baseRequest.astrology.lifeGua ? {
                        number: baseRequest.astrology.lifeGua.number,
                        element: baseRequest.astrology.lifeGua.element
                    } : undefined,
                    lunarMansion: baseRequest.astrology.lunarMansion ? {
                        mansion: { name: baseRequest.astrology.lunarMansion.mansion?.name }
                    } : undefined,
                    houtian: baseRequest.astrology.houtian ? {
                        lifePalaceTrigram: baseRequest.astrology.houtian.lifePalaceTrigram ? {
                            name: baseRequest.astrology.houtian.lifePalaceTrigram.name
                        } : undefined
                    } : undefined
                } : undefined;
                return {
                    ...base,
                    mansion: baseRequest.mansion,
                    lifePalace: baseRequest.lifePalace,
                    birthBazi: compactBaziForCelestial(baseRequest.birthBazi),
                    currentBazi: compactBaziForCelestial(baseRequest.currentBazi),
                    momentBazi: compactBaziForCelestial(baseRequest.momentBazi),
                    astrology: compactAstrology,
                    celestialDataStatus: baseRequest.celestialDataStatus,
                    cumulativeTechnicalData: cumulativeTechData,
                    previousContext: cumulativeTechData
                };
            case 'elements-analysis':
            case 'elements-synthesis':
            case 'elements':
                // Include complete BaZi for accurate element analysis
                const compactBaziForElements = (bazi) => {
                    if (!bazi) return undefined;
                    const compactPillar = (p) => p ? {
                        stem: { name: p.stem?.name, element: p.stem?.element, zh: p.stem?.zh },
                        branch: { name: p.branch?.name, element: p.branch?.element, zh: p.branch?.zh }
                    } : undefined;
                    return {
                        dayMaster: { element: bazi.dayMaster?.element, stem: bazi.dayMaster?.stem },
                        strength: {
                            result: bazi.strength?.result,
                            favorable: bazi.strength?.favorable,
                            unfavorable: bazi.strength?.unfavorable
                        },
                        year: compactPillar(bazi.year),
                        month: compactPillar(bazi.month),
                        day: compactPillar(bazi.day),
                        hour: compactPillar(bazi.hour)
                    };
                };
                return {
                    ...base,
                    equilibrium: baseRequest.equilibrium,
                    birthBazi: compactBaziForElements(baseRequest.birthBazi),
                    currentBazi: compactBaziForElements(baseRequest.currentBazi),
                    momentBazi: compactBaziForElements(baseRequest.momentBazi),
                    astrology: baseRequest.astrology ? {
                        lifeGua: baseRequest.astrology.lifeGua ? { element: baseRequest.astrology.lifeGua.element } : undefined
                    } : undefined,
                    cumulativeTechnicalData: cumulativeTechData,
                    previousContext: cumulativeTechData
                };
            case 'advice':
                // Include essential BaZi data for advice section
                const compactBaziForAdvice = (bazi) => {
                    if (!bazi) return undefined;
                    return {
                        dayMaster: { element: bazi.dayMaster?.element, stem: bazi.dayMaster?.stem },
                        strength: {
                            result: bazi.strength?.result,
                            yongShen: bazi.strength?.yongShen,
                            favorable: bazi.strength?.favorable
                        },
                        day: {
                            stem: { name: bazi.day?.stem?.name, element: bazi.day?.stem?.element, zh: bazi.day?.stem?.zh },
                            branch: { name: bazi.day?.branch?.name, element: bazi.day?.branch?.element, zh: bazi.day?.branch?.zh }
                        }
                    };
                };
                return {
                    ...base,
                    previousContext: baseRequest.previousContext,
                    birthBazi: compactBaziForAdvice(baseRequest.birthBazi),
                    currentBazi: compactBaziForAdvice(baseRequest.currentBazi),
                    momentBazi: compactBaziForAdvice(baseRequest.momentBazi),
                    astrology: undefined, // Not needed for advice
                    cumulativeTechnicalData: cumulativeTechData
                };
            case 'core':
            case 'core-analysis':
            case 'core-technical':
            case 'core-narrative':
            case 'core-application':
            case 'lines':
                // Include complete BaZi data for comprehensive analysis
                const compactBaziForCore = (bazi) => {
                    if (!bazi) return undefined;
                    const compactPillar = (p) => p ? {
                        stem: { name: p.stem?.name, element: p.stem?.element, zh: p.stem?.zh },
                        branch: { name: p.branch?.name, element: p.branch?.element, zh: p.branch?.zh }
                    } : undefined;
                    return {
                        dayMaster: { element: bazi.dayMaster?.element, stem: bazi.dayMaster?.stem },
                        strength: {
                            result: bazi.strength?.result,
                            yongShen: bazi.strength?.yongShen,
                            favorable: bazi.strength?.favorable,
                            unfavorable: bazi.strength?.unfavorable
                        },
                        year: compactPillar(bazi.year),
                        month: compactPillar(bazi.month),
                        day: compactPillar(bazi.day),
                        hour: compactPillar(bazi.hour)
                    };
                };
                return {
                    ...base,
                    binaryKey: baseRequest.binaryKey,
                    equilibrium: baseRequest.equilibrium,
                    mansion: baseRequest.mansion,
                    birthBazi: compactBaziForCore(baseRequest.birthBazi),
                    currentBazi: compactBaziForCore(baseRequest.currentBazi),
                    momentBazi: compactBaziForCore(baseRequest.momentBazi),
                    astrology: baseRequest.astrology ? {
                        lifeGua: baseRequest.astrology.lifeGua ? { element: baseRequest.astrology.lifeGua.element } : undefined
                    } : undefined,
                    cumulativeTechnicalData: cumulativeTechData,
                    previousContext: cumulativeTechData,
                    analysisType: section === 'core-technical' ? 'technical' :
                        section === 'core-narrative' ? 'narrative' : 'full'
                };
            case 'classical':
                return { question, hexagram, lines, lang, binaryKey: baseRequest.binaryKey };
            case 'remedies':
            case 'remedies-select':
                // Include essential BaZi data for remedy selection
                const compactBaziForRemedies = (bazi) => {
                    if (!bazi) return undefined;
                    return {
                        dayMaster: { element: bazi.dayMaster?.element, stem: bazi.dayMaster?.stem },
                        strength: {
                            result: bazi.strength?.result,
                            yongShen: bazi.strength?.yongShen,
                            favorable: bazi.strength?.favorable
                        },
                        day: {
                            stem: { name: bazi.day?.stem?.name, element: bazi.day?.stem?.element },
                            branch: { name: bazi.day?.branch?.name, element: bazi.day?.branch?.element }
                        }
                    };
                };
                return {
                    ...base,
                    binaryKey: baseRequest.binaryKey,
                    birthBazi: compactBaziForRemedies(baseRequest.birthBazi),
                    equilibrium: baseRequest.equilibrium,
                    // Send only the compact colloquial context (~2KB) instead of full interpretation (~60KB)
                    interpretation: baseRequest.interpretationContext || {
                        celestialColloquial: '',
                        elementsColloquial: '',
                        coreColloquial: ''
                    },
                    astrology: baseRequest.astrology ? {
                        lifeGua: baseRequest.astrology.lifeGua ? { element: baseRequest.astrology.lifeGua.element } : undefined
                    } : undefined
                };
            // NOTE: 'remedies-translate', 'remedies-verify', 'fulu-drawing-*', 'translate'
            // are handled by the early return at the top of this method (pass-through sections)
            default:
                return base;
        }
    }

    // Fetch a single section from its dedicated endpoint
    static async fetchSection(section, baseRequest, timeoutMs, externalSignal = null, maxRetries = 3, context = null) {
        let attempt = 0;
        let lastError = null;

        while (attempt < maxRetries) {
            attempt++;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            // Link external signal if provided
            const onAbort = () => {
                clearTimeout(timeoutId);
                controller.abort();
            };

            if (externalSignal) {
                if (externalSignal.aborted) {
                    clearTimeout(timeoutId);
                    throw new DOMException('Aborted', 'AbortError');
                }
                externalSignal.addEventListener('abort', onAbort);
            }

            // Build and optimize the section request
            const sectionRequest = this.buildSectionRequest(section, baseRequest);

            // Add context from previous sections if provided
            if (context) {
                sectionRequest.previousContext = context;
            }

            // OPTIMIZE: Apply JSON optimizer to reduce payload size
            // Skip optimization for pass-through sections (translate, remedies-translate, etc.)
            // — their payloads are already structured and stripping fields like 'instructions'
            // would remove content that needs to be translated
            const passThroughSections = ['remedies-translate', 'remedies-verify', 'fulu-drawing-generate',
                'fulu-drawing-verify', 'fulu-drawing', 'translate'];
            const optimizedRequest = passThroughSections.includes(section)
                ? sectionRequest
                : this.optimizeJSONForAPI(sectionRequest, {
                    maxStringLength: 1000,
                    removeFields: ['visualData', 'image', 'fdl', 'instructions', 'bottomRows', 'structure'],
                    preserveFields: ['question', 'hexagram', 'lines', 'lang', 'birthBazi', 'currentBazi', 'momentBazi'],
                    compactBazi: false,  // Already compacted properly in buildSectionRequest
                    compactAstrology: false,  // Already compacted properly in buildSectionRequest
                    compactHexagram: false  // Already compacted properly in buildSectionRequest
                });

            try {
                // DEBUG: Validate request before sending
                let requestBody;
                try {
                    requestBody = JSON.stringify(optimizedRequest);

                    // Log optimization stats
                    const stats = this.getJSONSizeStats(sectionRequest, optimizedRequest);
                    if (stats.savings > 1000) {
                        console.log(`[AI:FETCH] ${section} optimized: ${stats.originalSize} → ${stats.optimizedSize} bytes (${stats.percent}% saved)`);
                    } else {
                        console.log(`[AI:FETCH] ${section} request size: ${requestBody.length} bytes`);
                    }

                    // Warn if request is too large (may cause NS_BINDING_ABORTED)
                    if (requestBody.length > 50000) {
                        console.warn(`[AI:FETCH] ${section} request is very large (${requestBody.length} bytes), may cause browser errors`);
                    }
                } catch (serializeError) {
                    console.error(`[AI:FETCH] ${section} JSON serialization failed:`, serializeError.message);
                    console.error('[AI:FETCH] Request object keys:', Object.keys(optimizedRequest));
                    throw new Error(`Request serialization failed: ${serializeError.message}`);
                }

                // Route to appropriate endpoint based on section type
                const getEndpointUrl = (sectionName) => {
                    // Remedies endpoints go to dedicated remedies function
                    if (sectionName.startsWith('remedies-') ||
                        sectionName === 'bagua-medicine' ||
                        sectionName === 'fulu-drawing') {
                        return `${CONFIG.REMEDIES_FUNCTION_URL}/${sectionName}`;
                    }
                    // Advice endpoints go to dedicated advice function
                    if (sectionName === 'advice' || sectionName === 'advice-translate') {
                        return `${CONFIG.ADVICE_FUNCTION_URL}/${sectionName}`;
                    }
                    // Default to main yijingtu function
                    return `${CONFIG.HEXAGRAM_FUNCTION_URL}/${sectionName}`;
                };

                const endpointUrl = getEndpointUrl(section);
                console.log(`[AI:FETCH] Routing ${section} to ${endpointUrl}`);

                const response = await fetch(endpointUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: requestBody,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                if (externalSignal) externalSignal.removeEventListener('abort', onAbort);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
                    const errorMsg = errorData.error?.message || errorData.error || 'Unknown error';
                    const errorCode = errorData.error?.code || 'HTTP_ERROR';
                    throw new Error(`[${errorCode}] HTTP ${response.status}: ${errorMsg}`);
                }

                const data = await response.json();
                if (!data.success) {
                    // Handle new standardized error format with code and details
                    const errorMsg = data.error?.message || data.error || 'API error';
                    const errorCode = data.error?.code || 'API_ERROR';
                    const details = data.error?.details ? ` - Details: ${JSON.stringify(data.error.details)}` : '';
                    throw new Error(`[${errorCode}] ${errorMsg}${details}`);
                }

                // Return data from new standardized response format
                return data.data;
            } catch (e) {
                clearTimeout(timeoutId);
                if (externalSignal) externalSignal.removeEventListener('abort', onAbort);

                lastError = e;
                const isTimeout = e.name === 'AbortError' && (!externalSignal || !externalSignal.aborted);
                const errorLabel = isTimeout ? 'Timeout' : e.message;

                console.warn(`[AI:FETCH] Section ${section} attempt ${attempt}/${maxRetries} failed: ${errorLabel}`);

                // Don't retry if aborted by user
                if (e.name === 'AbortError' && externalSignal && externalSignal.aborted) {
                    throw e;
                }

                // Wait before next attempt (exponential backoff)
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }
        }

        throw lastError || new Error(`Failed to fetch section ${section} after ${maxRetries} attempts`);
    }

    // Get empty section structure for fallback
    static getEmptySection(section) {
        switch (section) {
            case 'celestial':
                return {
                    technicalAnalysis: "",
                    colloquialInterpretation: "",
                    celestial: "",
                    birthBazi: { description: "", readingImpact: "" },
                    currentBazi: { description: "", readingImpact: "" },
                    lunarMansion: { description: "", influence: "", guidance: "" },
                    lifePalace: { description: "", impact: "" },
                    quotedReferences: []
                };
            case 'elements':
                return {
                    technicalAnalysis: "",
                    colloquialInterpretation: "",
                    composition: "",
                    trigramRelationship: "",
                    yinYangAnalysis: "",
                    recommendations: "",
                    elements: "",
                    quotedReferences: []
                };
            case 'elements-analysis':
                return {
                    technicalAnalysis: "",
                    composition: "",
                    trigramRelationship: "",
                    yinYangAnalysis: ""
                };
            case 'elements-synthesis':
                return {
                    colloquialInterpretation: "",
                    recommendations: "",
                    elements: "",
                    quotedReferences: []
                };
            case 'core':
            case 'core-analysis':
                return {
                    technicalAnalysis: "",
                    colloquialInterpretation: "", // Included for legacy core compatibility 
                    analysis: "",
                    advice: "",
                    symbolism: "",
                    quotedReferences: []
                };
            case 'core-application':
                return {
                    colloquialInterpretation: "",
                    advice: "",
                    quotedReferences: []
                };
            case 'lines':
                return {
                    movingLines: "",
                    lineTexts: ["", "", "", "", "", ""],
                    quotedReferences: []
                };
            case 'classical':
                return {
                    judgment: { en: "", es: "", it: "", zh: "" },
                    image: { en: "", es: "", it: "", zh: "" },
                    lines: { en: ["", "", "", "", "", ""], es: ["", "", "", "", "", ""], it: ["", "", "", "", "", ""], zh: ["", "", "", "", "", ""] }
                };
            case 'remedies':
                return {
                    en: { talisman: "", charm: "", talismanSource: "", charmSource: "" },
                    es: { talisman: "", charm: "", talismanSource: "", charmSource: "" },
                    it: { talisman: "", charm: "", talismanSource: "", charmSource: "" },
                    zh: { talisman: "", charm: "", talismanSource: "", charmSource: "" },
                    fuluContent: null,
                    backgroundColor: "",
                    strokeColor: ""
                };
            default:
                return {};
        }
    }

    // Compose sections into final interpretation format
    static async composeSections(sectionsData) {
        console.log('[AI:MODULAR] Composing sections client-side (optimized)...');
        // Optimization: Skip the heavy server-side compose endpoint which causes timeouts.
        // We already have all sections and their translations from the individual steps.
        // The clientSideCompose function intelligently merges them.
        return this.clientSideCompose(sectionsData);
    }

    // Client-side composition fallback
    static clientSideCompose(sectionsData) {
        console.log('[AI:MODULAR] Performing client-side composition...');
        const coreAnalysis = sectionsData['core-analysis'];
        const coreApplication = sectionsData['core-application'];

        console.log('[AI:MODULAR] Sections data:', {
            hasCelestialAstro: !!sectionsData['celestial-astro'],
            hasCelestialBazi: !!sectionsData['celestial-bazi'],
            hasCelestial: !!(sectionsData.celestial || sectionsData['celestial-astro'] || sectionsData['celestial-bazi']),
            hasElements: !!sectionsData.elements,
            hasHoutouEmperor: !!sectionsData['houtou-emperor'],
            hasHoutouMaster: !!sectionsData['houtou-master'],
            hasHoutou: !!(sectionsData.houtou || sectionsData['houtou-emperor'] || sectionsData['houtou-master']),
            hasCoreTechnical: !!sectionsData['core-technical'],
            hasCoreNarrative: !!sectionsData['core-narrative'],
            hasCoreAnalysis: !!(coreAnalysis || sectionsData['core-technical'] || sectionsData['core-narrative']),
            hasCoreApplication: !!coreApplication,
            hasLines: !!sectionsData.lines,
            hasClassical: !!sectionsData.classical
        });

        // Combine celestial-astro and celestial-bazi into single celestial object
        const celestialAstro = sectionsData['celestial-astro'] || {};
        const celestialBazi = sectionsData['celestial-bazi'] || {};
        const celestial = {
            ...celestialAstro,
            ...celestialBazi,
            ...(sectionsData.celestial || {}),
            // Preserve both technical data sources
            celestialAstroTechnicalData: celestialAstro.technicalData,
            celestialBaziTechnicalData: celestialBazi.technicalData,
            celestialAstroTechnical: celestialAstro.technicalAnalysis,
            celestialBaziTechnical: celestialBazi.technicalAnalysis
        };
        const { lines, classical } = sectionsData;
        // Combine elements-analysis and elements-synthesis with preserved technical data
        const elementsAnalysis = sectionsData['elements-analysis'] || {};
        const elementsSynthesis = sectionsData['elements-synthesis'] || {};
        const elements = {
            ...elementsAnalysis,
            ...elementsSynthesis,
            ...(sectionsData.elements || {}),
            elementsAnalysisTechnicalData: elementsAnalysis.technicalData,
            elementsSynthesisTechnicalData: elementsSynthesis.technicalData
        };
        // Combine houtou-emperor and houtou-master with preserved technical data
        const houtouEmperor = sectionsData['houtou-emperor'] || {};
        const houtouMaster = sectionsData['houtou-master'] || {};
        const houtou = {
            ...houtouEmperor,
            ...houtouMaster,
            ...(sectionsData.houtou || {}),
            houtouEmperorTechnicalData: houtouEmperor.technicalData,
            houtouMasterTechnicalData: houtouMaster.technicalData
        };
        // Combine core-technical and core-narrative with preserved technical data
        const core = sectionsData['core-technical'] || {};
        const coreNarrative = sectionsData['core-narrative'] || {};
        const coreAnalysisMerged = {
            ...core,
            ...coreNarrative,
            ...(sectionsData['core-analysis'] || {}),
            coreTechnicalData: core.technicalData,
            coreNarrativeTechnicalData: coreNarrative.technicalData
        };
        const result = { en: {}, es: {}, it: {}, zh: {} };

        ['en', 'es', 'it', 'zh'].forEach(lang => {
            result[lang] = {
                // === CELESTIAL SECTION (3-layer structure) ===
                // Layer 1: Technical Data (raw JSON)
                celestialData: celestial?.technicalData || "",
                // Layer 2: Technical Analysis (classical interpretation)
                celestialTechnical: celestial?.technicalAnalysis || "",
                // Layer 3: Colloquial Analysis (modern interpretation)
                celestialColloquial: celestial?.colloquialInterpretation || "",
                // Legacy combined field
                celestial: celestial?.celestial || "",

                // BAZI information
                birthBaziDescription: celestial?.birthBazi?.description || "",
                birthBaziImpact: celestial?.birthBazi?.readingImpact || "",
                currentBaziDescription: celestial?.currentBazi?.description || "",
                currentBaziImpact: celestial?.currentBazi?.readingImpact || "",

                // === ELEMENTS SECTION (3-layer structure) ===
                // Layer 1: Technical Data (raw JSON)
                elementsData: elements?.technicalData || "",
                // Layer 2: Technical Analysis (classical interpretation)
                elementsTechnical: elements?.technicalAnalysis || "",
                // Layer 3: Colloquial Analysis (modern interpretation)
                elementsColloquial: elements?.colloquialInterpretation || "",
                // Legacy combined field
                elements: elements?.elements || "",
                // Additional element analysis fields
                composition: elements?.composition || "",
                trigramRelationship: elements?.trigramRelationship || "",
                yinYangAnalysis: elements?.yinYangAnalysis || "",
                recommendations: elements?.recommendations || "",

                // === HOUTOU SECTION (3-layer structure) ===
                // Layer 1: Technical Data (raw JSON)
                houtouData: houtou?.technicalData || "",
                // Layer 2: Technical Analysis (classical interpretation)
                houtouTechnical: houtou?.technicalAnalysis || "",
                // Layer 3: Colloquial Analysis (modern interpretation)
                houtouColloquial: houtou?.colloquialInterpretation || "",
                // Sub-sections
                emperorAnalysis: houtou?.emperorAnalysis || "",
                masterAnalysis: houtou?.masterAnalysis || "",
                houtouDiagram: houtou?.diagramData || null,

                // === CORE/ANALYSIS SECTION (3-layer structure) ===
                // Layer 1: Technical Data (raw JSON)
                coreData: coreAnalysisMerged?.technicalData || coreAnalysis?.technicalData || core?.technicalData || "",
                // Layer 2: Technical Analysis (classical interpretation)
                coreTechnical: coreAnalysisMerged?.technicalAnalysis || coreAnalysis?.technicalAnalysis || core?.technicalAnalysis || "",
                // Layer 3: Colloquial Analysis (modern interpretation)
                coreColloquial: coreApplication?.colloquialInterpretation || coreAnalysisMerged?.colloquialInterpretation || core?.colloquialInterpretation || "",
                // Legacy combined fields
                analysis: coreAnalysisMerged?.analysis || coreAnalysis?.analysis || core?.analysis || core?.technicalAnalysis || "",
                advice: coreApplication?.advice || core?.advice || "",
                symbolism: coreAnalysisMerged?.symbolism || coreAnalysis?.symbolism || core?.symbolism || "",

                // Lines section
                movingLines: lines?.movingLines || "",

                // Classical texts
                judgment: classical?.judgment?.[lang] || classical?.judgment?.en || "",
                image: classical?.image?.[lang] || classical?.image?.en || "",
                lines: classical?.lines?.[lang] || classical?.lines?.en || ["", "", "", "", "", ""],

                // References
                quotedReferences: [
                    ...(celestial?.quotedReferences || []),
                    ...(elements?.quotedReferences || []),
                    ...(core?.quotedReferences || []),
                    ...(coreAnalysis?.quotedReferences || []),
                    ...(coreApplication?.quotedReferences || []),
                    ...(lines?.quotedReferences || []),
                    ...(houtou?.quotedReferences || [])
                ]
            };
        });

        console.log('[AI:MODULAR] clientSideCompose complete');

        return result;
    }

    // Fetch secondary endpoints in parallel: remedies, fulu drawing, bagua medicine/feng shui
    // Progressive orchestration to avoid timeouts and provide immediate results.
    static async fetchSecondaryEndpoints(baseRequest, interpretation) {
        // Prevent concurrent calls
        if (this.fetchSecondaryEndpointsRunning) {
            console.log('[AI:SECONDARY] Already running, skipping duplicate call');
            return;
        }
        this.fetchSecondaryEndpointsRunning = true;

        console.log('[AI:SECONDARY] Starting progressive remedies pipeline...');

        // Abort previous secondary pipeline if running
        if (this.secondaryAbortController) {
            this.secondaryAbortController.abort();
        }
        this.secondaryAbortController = new AbortController();
        const signal = this.secondaryAbortController.signal;

        // Show loading states in UI
        UI.renderRemediesLoading(this.lang);
        UI.renderBaguaMedicineLoading(this.lang);

        // Track critical promises that must complete before hiding main loading
        const criticalPromises = [];

        // Strip historyAnalysis and askAgainSource for secondary requests (not needed for remedies)
        const { historyAnalysis, askAgainSource, ...cleanRequest } = baseRequest;

        try {
            // STEP 1: Remedy Selection (English base)
            console.log('[AI:SECONDARY] Step 1: Selecting remedies...');
            const selectRequest = {
                ...cleanRequest,
                // Ensure hexagram has name_zh to satisfy strict validation
                hexagram: {
                    ...cleanRequest.hexagram,
                    name_zh: cleanRequest.hexagram?.name_zh || "Unknown"
                },
                // Include full interpretation for resonance scoring
                interpretation: interpretation,
                // Also provide colloquial snippets for smaller prompt context
                interpretationContext: {
                    celestialColloquial: interpretation[sourceLang]?.celestialColloquial || interpretation.celestial || '',
                    elementsColloquial: interpretation[sourceLang]?.elementsColloquial || interpretation.elements || '',
                    coreColloquial: interpretation[sourceLang]?.coreColloquial || interpretation.analysis || ''
                }
            };

            // Add recent remedies context for consistency
            const recentRemedies = this.getRecentRemedies(60); // Look back 60 minutes
            console.log('[AI:SECONDARY] Recent remedies context:', recentRemedies);

            // Add to request
            selectRequest.recentRemedies = recentRemedies;

            const selectData = await this.fetchSection('remedies-select', selectRequest, 50000, signal);

            if (selectData && !signal.aborted) {
                console.log('[AI:SECONDARY] Remedies selected successfully, raw data:', selectData);
                console.log('[AI:SECONDARY] selectData.remedies:', selectData?.remedies?.length || 0, 'items');
                console.log('[AI:SECONDARY] selectData.en:', !!selectData?.en);

                // Normalize flat structure { remedies: [...] } into lang-keyed structure
                // so all downstream code (render, translate, cache) sees a consistent shape
                if (selectData.remedies && !selectData.en) {
                    const rawRemedies = selectData.remedies;
                    const rawFuluList = selectData.fuluContentList || [];
                    // Build fuluContentList from remedy visualData if not already present
                    const fuluContentList = rawFuluList.length > 0 ? rawFuluList : rawRemedies.map(r => ({
                        id: r.id,
                        remedyType: r.type,
                        image: r.images || r.visualData?.image,
                        fdl: r.visualData?.fdl,
                        instructions: r.instructions,
                        usage: r.usage || []
                    }));
                    Object.keys(selectData).forEach(k => delete selectData[k]);
                    selectData.en = { remedies: rawRemedies };
                    selectData.fuluContentList = fuluContentList;
                    console.log(`[AI:SECONDARY] Normalized remedies: ${rawRemedies.length} items, ${fuluContentList.length} fulu entries`);
                }

                // FALLBACK: If no remedies returned, generate generic ones from local DB
                if (!selectData.en?.remedies?.length && typeof window !== 'undefined' && window.DAOIST_REMEDIES_DB) {
                    console.log('[AI:SECONDARY] No remedies from API, generating fallback from local DB...');
                    const fallbackRemedies = this.generateFallbackRemedies();
                    if (fallbackRemedies.length > 0) {
                        selectData.en = { remedies: fallbackRemedies };
                        selectData.fuluContentList = fallbackRemedies.map(r => ({
                            id: r.id,
                            remedyType: r.type,
                            image: r.images,
                            fdl: r.visualData?.fdl,
                            instructions: r.instructions,
                            usage: r.usage || []
                        }));
                        console.log(`[AI:SECONDARY] Generated ${fallbackRemedies.length} fallback remedies`);
                    }
                }

                // CLIENT-SIDE FIX: Merge images from local DB if missing in API response
                if (typeof window !== 'undefined' && window.DAOIST_REMEDIES_DB) {
                    const localDB = window.DAOIST_REMEDIES_DB;

                    // Helper to find image in local DB
                    const findImage = (id, type) => {
                        let entry = null;
                        if (type === 'fulu' && localDB.fulu) {
                            entry = localDB.fulu.find(f => f.id === id);
                        } else if (type === 'fengshui' && localDB.fengshui) {
                            entry = localDB.fengshui.find(f => f.id === id);
                        }
                        return entry ? entry.image : null;
                    };

                    // Helper to find full entry in local DB
                    const findEntry = (id, type) => {
                        let entry = null;
                        if (type === 'fulu' && localDB.fulu) {
                            entry = localDB.fulu.find(f => f.id === id);
                        } else if (type === 'fengshui' && localDB.fengshui) {
                            entry = localDB.fengshui.find(f => f.id === id);
                        }
                        return entry;
                    };

                    // 1. Fix fuluContentList (used for drawing)
                    if (selectData.fuluContentList && Array.isArray(selectData.fuluContentList)) {
                        selectData.fuluContentList.forEach(item => {
                            if (item.id) {
                                const type = item.remedyType || (item.id.startsWith('fs') ? 'fengshui' : 'fulu');
                                const localEntry = findEntry(item.id, type);

                                if (localEntry) {
                                    // Merge image if missing
                                    if (!item.image && localEntry.image) {
                                        console.log(`[AI:FIX] Merged image for ${item.id} from local DB`);
                                        item.image = localEntry.image;
                                    }

                                    // Merge FDL visual data if missing (critical for fulu canvas drawings)
                                    if (!item.fdl && localEntry.visualData?.fdl) {
                                        console.log(`[AI:FIX] Merged FDL for ${item.id} from local DB`);
                                        item.fdl = localEntry.visualData.fdl;
                                    }

                                    // Merge instructions if missing (important for fengshui diagrams)
                                    if (!item.instructions && localEntry.instructions) {
                                        console.log(`[AI:FIX] Merged instructions for ${item.id} from local DB`);
                                        item.instructions = localEntry.instructions;
                                    }
                                    // Also check structure.instructions for fengshui entries
                                    if (!item.instructions && localEntry.structure?.instructions) {
                                        console.log(`[AI:FIX] Merged structure.instructions for ${item.id} from local DB`);
                                        item.instructions = localEntry.structure.instructions;
                                    }

                                    // Merge usage if missing
                                    if (!item.usage && localEntry.usage) {
                                        item.usage = localEntry.usage;
                                    }
                                }
                            }
                        });
                    }

                    // 2. Fix remedies lists (used for text display)
                    ['en', 'es', 'it', 'zh'].forEach(lang => {
                        if (selectData[lang] && Array.isArray(selectData[lang].remedies)) {
                            selectData[lang].remedies.forEach(r => {
                                // Some remedies might not have 'image' field expected by UI
                                // UI mainly uses fuluContentList for canvas, but sometimes remedies list has visuals too
                                if (!r.image && r.id) {
                                    // Try to find matching fulu/fengshui entry
                                    // The type might be 'fulu' or 'fengshui'
                                    const type = r.type || (r.id.startsWith('fs') ? 'fengshui' : 'fulu');
                                    const img = findImage(r.id, type);
                                    if (img) {
                                        r.image = img;
                                    }
                                }
                            });
                        }
                    });
                }

                this.currentReading.interpretation.remedies = selectData;
                UI.renderRemediesTabbed(selectData, this.lang);
                this.updateStoredInterpretation();

                // Start parallel background tasks

                // STEP 2: Parallel Translation - wait for current language
                const remedyTranslationPromise = this.fetchRemediesTranslation(selectData, signal);
                if (this.lang !== 'en') {
                    // Current language remedy translation is critical
                    criticalPromises.push(remedyTranslationPromise);
                }

                // STEP 3: Fulu Drawing Pipeline (Generate then Verify)
                this.fetchFuluDrawingPipeline(selectData, cleanRequest, signal);

                // STEP 4: Bagua Medicine (Independent)
                const baguaPromise = this.fetchBaguaMedicine(cleanRequest, interpretation, signal);
                if (this.lang !== 'en') {
                    // Bagua Medicine translation is also critical
                    criticalPromises.push(baguaPromise);
                }

                // STEP 5: Dedicated Advice Generation (Independent - fire and forget)
                this.fetchDedicatedAdvice(baseRequest, signal);

                // STEP 6: Xiantian (Early Heaven) Spiritual Interpretation (fire and forget)
                this.fetchXiantianInterpretation(cleanRequest, signal);
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('[AI:SECONDARY] Pipeline aborted');
            } else {
                console.warn('[AI:SECONDARY] Selection failed:', e.message);
                UI.renderRemediesError(this.lang);
            }
            // Reset the running flag on error
            this.fetchSecondaryEndpointsRunning = false;
            return;
        }

        // Wait for critical translations (current language) before returning
        if (criticalPromises.length > 0) {
            console.log(`[AI:SECONDARY] Waiting for ${criticalPromises.length} critical translation(s)...`);
            await Promise.all(criticalPromises);
            console.log('[AI:SECONDARY] Critical translations completed');
        }

        // Reset the running flag
        this.fetchSecondaryEndpointsRunning = false;
    }

    // Helper: Parallel translation for each remedy and language
    // Returns a promise that resolves when current language remedies are translated
    static async fetchRemediesTranslation(selectData, signal) {
        const allLangs = ['es', 'it', 'zh'];
        const targetLangs = allLangs.filter(l => l !== this.lang);
        
        // Find source language dynamically (not always 'en')
        const sourceLang = this.getSourceLang(selectData);
        if (targetLangs.length === 0 && sourceLang === 'en') return;

        const langNames = { 'es': 'Spanish', 'it': 'Italian', 'zh': 'Chinese', 'en': 'English' };

        // Handle different response structures defensively
        // Source language is dynamic - could be en, es, it, or zh
        let remedies = [];
        if (selectData[sourceLang] && selectData[sourceLang].remedies) {
            remedies = selectData[sourceLang].remedies;
        } else if (selectData.remedies) {
            remedies = selectData.remedies;
        } else if (Array.isArray(selectData)) {
            remedies = selectData;
        }

        if (remedies.length === 0) {
            console.warn('[AI:TRANS] No remedies found to translate');
            return;
        }

        // Get relevance context defensively from source language
        const relevance = selectData[sourceLang]?.relevance || selectData.relevance || '';

        // HELPER: Translate a single remedy
        const translateRemedy = async (remedy, lang) => {
            if (signal.aborted) return null;
            try {
                console.log(`[AI:TRANS] Translating ${remedy.id} to ${lang}...`);
                const result = await this.fetchSection('remedies-translate', {
                    remedy,
                    targetLang: lang,
                    targetLangName: langNames[lang],
                    context: relevance
                }, 45000, signal);

                if (result && !signal.aborted) {
                    // Update local data structure
                    if (!this.currentReading.interpretation.remedies[lang]) {
                        this.currentReading.interpretation.remedies[lang] = { remedies: [] };
                    }
                    // Ensure fuluContentList is preserved in the language object
                    if (!this.currentReading.interpretation.remedies[lang].fuluContentList) {
                        this.currentReading.interpretation.remedies[lang].fuluContentList =
                            this.currentReading.interpretation.remedies.fuluContentList || [];
                    }
                    const langRemedies = this.currentReading.interpretation.remedies[lang].remedies;
                    const idx = langRemedies.findIndex(r => r.id === result.id);
                    if (idx !== -1) {
                        langRemedies[idx] = result;
                    } else {
                        langRemedies.push(result);
                    }

                    // Re-render if it's the current language
                    if (this.lang === lang) {
                        // Create a complete remedies object with fuluContentList
                        const remediesForRender = {
                            ...this.currentReading.interpretation.remedies[lang],
                            fuluContentList: this.currentReading.interpretation.remedies.fuluContentList ||
                                this.currentReading.interpretation.remedies[lang].fuluContentList || []
                        };
                        UI.renderRemediesTabbed({ [lang]: remediesForRender, fuluContentList: remediesForRender.fuluContentList }, lang);
                    }
                    this.updateStoredInterpretation();
                    return result;
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.warn(`[AI:TRANS] Failed for ${lang}:`, e.message);
            }
            return null;
        };

        // STEP 1: Prioritize current language translation (if not English)
        if (this.lang !== 'en') {
            console.log(`[AI:TRANS] Prioritizing current language: ${this.lang}`);
            for (const remedy of remedies) {
                await translateRemedy(remedy, this.lang);
                // Small delay between remedies
                await new Promise(r => setTimeout(r, 300));
            }
            console.log(`[AI:TRANS] Current language (${this.lang}) remedies complete`);
        }

        // STEP 2: Continue with other languages in background
        const otherLangs = allLangs.filter(l => l !== this.lang && l !== 'en');
        for (const lang of otherLangs) {
            for (const remedy of remedies) {
                if (signal.aborted) return;
                await translateRemedy(remedy, lang);
                // Small delay between requests
                await new Promise(r => setTimeout(r, 300));
            }
        }

        // STEP 3: Verification (Run after all translations complete)
        if (!signal.aborted) {
            this.fetchRemediesVerification(this.currentReading.interpretation.remedies, signal);
        }
    }

    // Helper: Fulu drawing generation and background verification
    static async fetchFuluDrawingPipeline(selectData, cleanRequest, signal) {
        // AI-generated fulu drawings are disabled.
        // Canvas now shows placeholder with talisman name until real historical
        // drawing data (FDL with source:'database') is added to the DB.
        // The fulu-drawing-generate and fulu-drawing-verify endpoints are preserved
        // for future use when authenticated drawing data needs server-side processing.
        console.log('[AI:FULU] Skipping AI drawing generation (DB-only policy). Canvas shows placeholder.');
    }

    // Helper: Translate remedies on-demand when user switches language
    static async translateRemediesForLanguage(targetLang) {
        // Find source language dynamically (not always 'en')
        const sourceLang = this.getSourceLang(this.currentReading?.interpretation?.remedies);
        if (!this.currentReading?.interpretation?.remedies?.[sourceLang]?.remedies) {
            console.warn('[AI:TRANS] No source remedies to translate from');
            return;
        }

        const remedies = this.currentReading.interpretation.remedies[sourceLang].remedies;
        const langNames = { es: 'Spanish', it: 'Italian', zh: 'Chinese' };
        const langName = langNames[targetLang] || targetLang;

        console.log(`[AI:TRANS] On-demand batch translation of ${remedies.length} remedies to ${targetLang}`);

        try {
            // Batch-translate all remedies in one call to the dedicated translate function
            const response = await fetch(CONFIG.TRANSLATE_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'remedies-translate',
                    remedies,
                    targetLang,
                    hexagramName: this.currentReading.hex?.name_en || ''
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const translatedRemedies = data.success ? (data.translated ?? []) : [];

            if (translatedRemedies.length > 0) {
                // Merge translations back, preserving original structural fields (id, type, fdl, etc.)
                const mergedRemedies = remedies.map(original => {
                    const translated = translatedRemedies.find(r => r.id === original.id) || {};
                    return {
                        ...original,
                        ...translated,
                        id: original.id,
                        type: original.type,
                        fdl: original.fdl,
                        instructions: translated.instructions || original.instructions || '',
                        relevance: translated.relevance || original.relevance || '',
                        description: translated.description || original.description || '',
                        application: translated.application || original.application || '',
                        name: translated.name || original.name || ''
                    };
                });

                // Update local data structure
                if (!this.currentReading.interpretation.remedies[targetLang]) {
                    this.currentReading.interpretation.remedies[targetLang] = { remedies: [] };
                }
                if (!this.currentReading.interpretation.remedies[targetLang].fuluContentList) {
                    this.currentReading.interpretation.remedies[targetLang].fuluContentList =
                        this.currentReading.interpretation.remedies.fuluContentList || [];
                }
                this.currentReading.interpretation.remedies[targetLang].remedies = mergedRemedies;

                console.log(`[AI:TRANS] Batch translation complete: ${mergedRemedies.length} remedies in ${targetLang}`);

                // Re-render if this is the active language
                if (this.lang === targetLang && typeof UI !== 'undefined') {
                    UI.renderRemediesTabbed(this.currentReading.interpretation.remedies, targetLang);
                }
                this.updateStoredInterpretation();
            }
        } catch (e) {
            console.warn(`[AI:TRANS] Batch remedy translation failed for ${targetLang}:`, e.message);
            // Fall back to one-by-one translation if batch fails
            console.log('[AI:TRANS] Falling back to sequential remedy translation...');
            for (const remedy of remedies) {
                try {
                    const result = await this.fetchSection('remedies-translate', {
                        remedy,
                        targetLang,
                        targetLangName: langName,
                        context: remedy.relevance || ''
                    }, 45000);
                    if (result) {
                        if (!this.currentReading.interpretation.remedies[targetLang]) {
                            this.currentReading.interpretation.remedies[targetLang] = { remedies: [] };
                        }
                        const langRemedies = this.currentReading.interpretation.remedies[targetLang].remedies;
                        const idx = langRemedies.findIndex(r => r.id === remedy.id);
                        const merged = { ...remedy, ...result, id: remedy.id, type: remedy.type, fdl: remedy.fdl };
                        if (idx !== -1) langRemedies[idx] = merged;
                        else langRemedies.push(merged);
                    }
                } catch (e2) {
                    console.warn(`[AI:TRANS] Sequential fallback failed for ${remedy.id}:`, e2.message);
                }
                await new Promise(r => setTimeout(r, 300));
            }
            if (this.lang === targetLang && typeof UI !== 'undefined') {
                UI.renderRemediesTabbed(this.currentReading.interpretation.remedies, targetLang);
            }
            this.updateStoredInterpretation();
        }
    }

    // Helper: Translate Bagua Medicine on-demand when user switches language
    static async translateBaguaMedicineForLanguage(targetLang) {
        // Find source language dynamically (not always 'en')
        const sourceLang = this.getSourceLang(this.currentReading?.interpretation?.baguaMedicine);
        if (!this.currentReading?.interpretation?.baguaMedicine?.[sourceLang]) {
            console.warn('[AI:BAGUA:TRANS] No source Bagua Medicine to translate from');
            return;
        }

        const langNames = { es: 'Spanish', it: 'Italian', zh: 'Chinese' };
        const langName = langNames[targetLang] || targetLang;

        console.log(`[AI:BAGUA:TRANS] Translating Bagua Medicine from ${sourceLang} to ${targetLang}`);

        try {
            // Extract content to translate from source language
            const sourceContent = this.currentReading.interpretation.baguaMedicine[sourceLang];
            const toTranslate = {
                fengShui: enContent.fengShui,
                medicine: enContent.medicine,
                alchemical: enContent.alchemical,
                houtian: enContent.houtian
            };

            // Call dedicated translation function directly
            const response = await fetch(CONFIG.TRANSLATE_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'translate',
                    content: toTranslate,
                    targetLang,
                    hexagramName: `Bagua Medicine - ${this.currentReading.hex?.name_en || 'Unknown'}`,
                    section: 'baguaMedicine'
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const result = data.success ? { translated: data.translated ?? data.data?.translated } : null;

            if (result?.translated) {
                console.log(`[AI:BAGUA:TRANS] Received translation for ${targetLang}:`, Object.keys(result.translated));

                // Update local data structure
                if (!this.currentReading.interpretation.baguaMedicine[targetLang]) {
                    this.currentReading.interpretation.baguaMedicine[targetLang] = {};
                }

                // Merge translated content
                Object.assign(this.currentReading.interpretation.baguaMedicine[targetLang], result.translated);

                // NOTE: Do NOT call UI.renderBaguaMedicine here.
                // Both callers (fetchTranslationForLanguageChange and setLanguage) already
                // call UI.renderBaguaMedicine in their .then() callbacks.  Rendering inside
                // this helper as well was causing triple-render and canvas 0×0 failures.
                this.updateStoredInterpretation();
            }
        } catch (e) {
            console.warn(`[AI:BAGUA:TRANS] Failed to translate Bagua Medicine to ${targetLang}:`, e.message);
        }
    }

    // Helper: Independent Bagua Medicine fetch
    static async fetchBaguaMedicine(cleanRequest, interpretation, signal) {
        try {
            // Find source language dynamically (not always 'en')
            const sourceLang = this.getSourceLang(interpretation);
            const baguaRequest = {
                ...cleanRequest,
                interpretation: {
                    celestial: interpretation[sourceLang]?.celestial || '',
                    elements: interpretation[sourceLang]?.elements || '',
                    analysis: interpretation[sourceLang]?.analysis || '',
                    advice: interpretation[sourceLang]?.advice || '',
                    movingLines: interpretation[sourceLang]?.movingLines || ''
                }
            };

            const baguaData = await this.fetchSection('bagua-medicine', baguaRequest, 45000, signal);

            if (baguaData && !signal.aborted) {
                console.log('[AI:BAGUA] Bagua Medicine fetched');
                // Normalize: ensure data is available under 'en' (as source for translation)
                // Backend returns { [lang]: { fengShui, medicine, ... } }
                const normalized = { ...baguaData };
                if (!normalized.en) {
                    // Use the first available language data as 'en' source
                    const firstLang = Object.keys(normalized).find(k => typeof normalized[k] === 'object' && normalized[k] !== null);
                    if (firstLang) normalized.en = normalized[firstLang];
                }
                this.currentReading.interpretation.baguaMedicine = normalized;
                UI.renderBaguaMedicine(normalized, this.lang);
                this.updateStoredInterpretation();

                // Translate Bagua Medicine if current language is not English
                if (this.lang !== 'en' && normalized.en) {
                    try {
                        await this.translateBaguaMedicineForLanguage(this.lang);
                        // Re-render with translated content
                        if (this.currentReading?.interpretation?.baguaMedicine) {
                            UI.renderBaguaMedicine(this.currentReading.interpretation.baguaMedicine, this.lang);
                        }
                    } catch (e) {
                        console.warn(`[AI:BAGUA] Translation to ${this.lang} failed:`, e.message);
                    }
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.warn('[AI:BAGUA] Fetch failed:', e.message);
                UI.renderBaguaMedicineError(this.lang);
            }
        }
    }

    // Helper: Fetch Dedicated Advice
    static async fetchDedicatedAdvice(baseRequest, signal) {
        try {
            // Check if we already have good advice from core-application
            const existingAdvice = this.currentReading.interpretation?.en?.advice;
            if (existingAdvice && existingAdvice.length > 100 && !existingAdvice.includes('Pigs and fishes')) {
                console.log('[AI:ADVICE] Good advice already exists from core-application, skipping dedicated fetch');
                return;
            }

            console.log('[AI:ADVICE] Fetching dedicated advice...');

            // Build comprehensive context from ALL available interpretation data
            const interp = this.currentReading.interpretation?.en || {};
            let contextStr = `Hexagram ${this.currentReading.hex.number}`;
            if (this.currentReading.hex.name_en) contextStr += ` - ${this.currentReading.hex.name_en}`;
            contextStr += '.\n';
            if (this.currentReading.equilibrium) {
                contextStr += `Elemental Balance: ${JSON.stringify(this.currentReading.equilibrium.elements)}.\n`;
            }
            // Include all available section analyses for rich context
            if (interp.celestial) contextStr += `CELESTIAL:\n${String(interp.celestial).substring(0, 600)}\n\n`;
            if (interp.elements) contextStr += `ELEMENTS:\n${String(interp.elements).substring(0, 600)}\n\n`;
            if (interp.houtou) contextStr += `HOUTOU:\n${String(interp.houtou).substring(0, 400)}\n\n`;
            if (interp.analysis) contextStr += `ANALYSIS:\n${String(interp.analysis).substring(0, 600)}\n\n`;
            if (interp.symbolism) contextStr += `SYMBOLISM:\n${String(interp.symbolism).substring(0, 400)}\n\n`;
            if (interp.movingLines) contextStr += `MOVING LINES:\n${String(interp.movingLines).substring(0, 400)}\n\n`;

            // Build advice request with the correct structure expected by backend
            const adviceReq = {
                question: baseRequest.question,
                hexagram: baseRequest.hexagram,
                lines: baseRequest.lines,
                lang: baseRequest.lang,
                birthBazi: baseRequest.birthBazi,
                currentBazi: baseRequest.currentBazi,
                previousContext: contextStr
            };

            const adviceData = await this.fetchSection('advice', adviceReq, 45000, signal);

            if (adviceData && adviceData.advice && !signal.aborted) {
                // Skip if the server returned an error message as advice
                const adviceText = String(adviceData.advice);
                if (adviceText.includes('generation failed') || adviceText.includes('not available')) {
                    console.warn('[AI:ADVICE] Server returned error-like advice, skipping');
                    return;
                }
                // Normalize: advice may be an object — extract string
                let adviceStr = adviceData.advice;
                if (typeof adviceStr === 'object' && adviceStr !== null) {
                    // Try common object shapes: { text: '...' }, { en: '...' }, or stringify
                    adviceStr = adviceStr.text || adviceStr.en || adviceStr.advice || JSON.stringify(adviceStr);
                }
                adviceStr = String(adviceStr);

                console.log('[AI:ADVICE] Advice received:', adviceStr.substring(0, 80));

                // Skip if the advice is just the judgment text (not real advice)
                if (adviceStr.includes('Pigs and fishes') || adviceStr.includes('Judgment')) {
                    console.warn('[AI:ADVICE] Advice appears to be judgment text, not real advice. Skipping.');
                    return;
                }

                // Update the interpretation object
                ['en', 'es', 'it', 'zh'].forEach(lang => {
                    if (!this.currentReading.interpretation[lang]) this.currentReading.interpretation[lang] = {};
                    this.currentReading.interpretation[lang].advice = adviceStr;
                });

                // Update UI immediately if Advice section is visible
                UI.renderInterpretationTabbed(this.currentReading.interpretation, this.lang, this.currentReading);
                this.updateStoredInterpretation();
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('[AI:ADVICE] Failed:', e.message);
        }
    }

    // Helper: Fetch Xiantian (Early Heaven) Spiritual Interpretation
    static async fetchXiantianInterpretation(cleanRequest, signal) {
        try {
            console.log('[AI:XIANTIAN] Fetching Xiantian spiritual interpretation...');

            // Use the new FDLIntegration if available, otherwise fall back to fetchSection
            if (typeof FDLIntegration !== 'undefined') {
                const xiantianData = await FDLIntegration.getXiantianInterpretation(
                    this.currentReading.hex,
                    this.currentReading.lines,
                    this.currentQuestion,
                    { lang: this.lang, includeFDL: true }
                );

                if (xiantianData && !signal.aborted) {
                    console.log('[AI:XIANTIAN] Xiantian interpretation received');

                    // Store in interpretation
                    if (!this.currentReading.interpretation.xiantian) {
                        this.currentReading.interpretation.xiantian = {};
                    }
                    this.currentReading.interpretation.xiantian[this.lang] = xiantianData.interpretation;

                    // Store FDL diagram
                    if (xiantianData.fdl) {
                        this.currentReading.interpretation.xiantianFDL = xiantianData.fdl;
                    }

                    // Render if UI supports it
                    if (UI.renderXiantianInterpretation) {
                        UI.renderXiantianInterpretation(xiantianData, this.lang);
                    }

                    this.updateStoredInterpretation();
                }
            } else {
                // Fallback: use the backend endpoint directly
                const changingLines = cleanRequest.lines.map((l, i) => l.isChanging ? i + 1 : null).filter(n => n !== null);
                const changingText = changingLines.length > 0 ? ` with changing lines ${changingLines.join(', ')}` : '';
                const query = `Hexagram ${cleanRequest.hexagram.number} (${cleanRequest.hexagram.name_en})${changingText}. Question: ${cleanRequest.question || 'General spiritual guidance'}`;

                const xiantianRequest = {
                    query,
                    hexagramNumber: cleanRequest.hexagram.number,
                    lang: this.lang,
                    includeFDL: true
                };

                const xiantianData = await this.fetchSection('interpret-xiantian', xiantianRequest, 45000, signal);

                if (xiantianData && !signal.aborted) {
                    console.log('[AI:XIANTIAN] Xiantian interpretation received (via fetchSection)');
                    if (!this.currentReading.interpretation.xiantian) {
                        this.currentReading.interpretation.xiantian = {};
                    }
                    this.currentReading.interpretation.xiantian[this.lang] = xiantianData.interpretation;
                    if (xiantianData.fdl) {
                        this.currentReading.interpretation.xiantianFDL = xiantianData.fdl;
                    }
                    this.updateStoredInterpretation();
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('[AI:XIANTIAN] Failed:', e.message);
        }
    }

    // Helper: Remedies verification
    static async fetchRemediesVerification(remediesData, signal) {
        try {
            const verified = await this.fetchSection('remedies-verify', { remedies: remediesData, lang: this.lang }, 30000, signal);
            if (verified && !signal.aborted) {
                console.log('[AI:REMEDIES] Verification complete');

                // CRITICAL FIX: Do NOT replace the entire remedies object.
                // The verify endpoint returns only corrected EN content and strips `fdl`,
                // `instructions`, and all translated language slots (es, it, zh).
                // Instead, merge selectively: update EN remedies field-by-field, preserving
                // fdl, instructions, and every existing language translation.
                const existing = this.currentReading.interpretation.remedies;

                // Normalise the verified response shape (handle en.remedies, remedies, or array)
                const verifiedRemedies = verified.en?.remedies || verified.remedies || (Array.isArray(verified) ? verified : []);

                if (verifiedRemedies.length > 0 && existing) {
                    const existingEn = existing.en || existing;
                    const existingList = existingEn.remedies || (Array.isArray(existingEn) ? existingEn : []);

                    verifiedRemedies.forEach(verifiedRemedy => {
                        const idx = existingList.findIndex(r => r.id === verifiedRemedy.id);
                        if (idx !== -1) {
                            // Merge: take verified fields but preserve fdl and instructions
                            // if the verify endpoint stripped them.
                            existingList[idx] = {
                                ...existingList[idx],
                                ...verifiedRemedy,
                                fdl: verifiedRemedy.fdl || existingList[idx].fdl,
                                instructions: verifiedRemedy.instructions || existingList[idx].instructions
                            };
                        }
                    });

                    console.log('[AI:REMEDIES] Merged verified remedies (fdl/instructions/languages preserved)');
                } else {
                    console.warn('[AI:REMEDIES] Verified response has no recognisable remedy list, skipping merge');
                }

                UI.renderRemediesTabbed(this.currentReading.interpretation.remedies, this.lang);
                this.updateStoredInterpretation();
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('[AI:VERIFY] Remedies verification failed:', e.message);
        }
    }

    // Update stored interpretation in localStorage
    static updateStoredInterpretation() {
        try {
            const history = Storage.getJSON('iChingHistory');
            const idx = history.findIndex(h => h.requestTimestamp === this.currentReading.requestTimestamp);
            if (idx !== -1) {
                history[idx].interpretation = this.currentReading.interpretation;
                Storage.setJSON('iChingHistory', history);
            }
        } catch (e) {
            console.warn('[STORAGE] Failed to update interpretation:', e);
        }
    }

    // Get cached translation from localStorage
    static getCachedTranslation(readingId, lang) {
        try {
            const cacheKey = `yijing_translation_${readingId}_${lang}`;
            const cached = Storage.getJSON(cacheKey);
            if (cached && cached.timestamp) {
                // Check if cache is still valid (30 days)
                const age = Date.now() - cached.timestamp;
                const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
                if (age < maxAge) {
                    console.log(`[CACHE] Found valid translation for ${lang}`);
                    return cached.data;
                }
            }
        } catch (e) {
            console.warn('[CACHE] Error reading cache:', e);
        }
        return null;
    }

    // Save translation to localStorage cache
    static saveTranslationCache(readingId, lang, data) {
        try {
            const cacheKey = `yijing_translation_${readingId}_${lang}`;
            Storage.setJSON(cacheKey, {
                timestamp: Date.now(),
                data: data
            });
            console.log(`[CACHE] Saved translation for ${lang}`);
        } catch (e) {
            console.warn('[CACHE] Error saving cache:', e);
        }
    }

    // Clear old translation caches to prevent storage bloat
    static clearOldTranslationCaches() {
        try {
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            const now = Date.now();
            let cleared = 0;

            // Iterate all localStorage keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('yijing_translation_')) {
                    try {
                        const cached = JSON.parse(localStorage.getItem(key));
                        if (cached && cached.timestamp && (now - cached.timestamp > maxAge)) {
                            localStorage.removeItem(key);
                            cleared++;
                        }
                    } catch (e) {
                        // Invalid cache entry, remove it
                        localStorage.removeItem(key);
                        cleared++;
                    }
                }
            }

            if (cleared > 0) {
                console.log(`[CACHE] Cleared ${cleared} old translation caches`);
            }
        } catch (e) {
            console.warn('[CACHE] Error clearing old caches:', e);
        }
    }

    // Translate interpretation content for a specific language
    static async translateInterpretation(readingId, baseContent, targetLang, hexagramName) {
        // Check cache first
        const cached = this.getCachedTranslation(readingId, targetLang);
        if (cached) {
            return cached;
        }

        // Call translation API
        console.log(`[TRANSLATE] Calling API for ${targetLang}...`);

        const controller = new AbortController();
        // Increase timeout to 90 seconds for translation
        const timeoutId = setTimeout(() => {
            console.warn(`[TRANSLATE] Timeout for ${targetLang}, aborting...`);
            controller.abort();
        }, 90000);

        try {
            const response = await fetch(CONFIG.TRANSLATE_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'translate',
                    content: baseContent,
                    targetLang,
                    hexagramName,
                    section: 'interpretation'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                // Handle new error format with error code and details
                const errorMsg = data.error?.message || data.error || 'Translation failed';
                const errorCode = data.error?.code || 'UNKNOWN_ERROR';
                throw new Error(`[${errorCode}] ${errorMsg}`);
            }

            // Support both new function shape (result.translated) and legacy (result.data.translated)
            const translated = data.translated ?? data.data?.translated;

            // Cache the result
            this.saveTranslationCache(readingId, targetLang, translated);

            return translated;
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                console.warn(`[TRANSLATE] Request aborted for ${targetLang} (timeout or user cancelled)`);
            } else {
                console.warn(`[TRANSLATE] Failed for ${targetLang}:`, e.message);
            }
            // Return base content (English) as fallback
            return baseContent;
        }
    }

    // Translate to a specific language (not all at once)
    static async translateToLanguage(readingId, result, targetLang, hexagramName) {
        // Find source language dynamically (not always 'en')
        const sourceLang = this.getSourceLang(result);
        
        // Skip if target is source or already has unique translation
        if (targetLang === sourceLang) return result;
        if (result[targetLang]?.analysis && result[targetLang].analysis !== result[sourceLang]?.analysis) {
            console.log(`[TRANSLATE] ${targetLang} already has unique content`);
            return result;
        }

        // Check cache first
        const cached = this.getCachedTranslation(readingId, targetLang);
        if (cached) {
            console.log(`[TRANSLATE] Using cached ${targetLang}`);
            result[targetLang] = {
                ...result[targetLang],
                celestial: cached.celestial,
                elements: cached.elements,
                analysis: cached.analysis,
                advice: cached.advice,
                symbolism: cached.symbolism,
                movingLines: cached.movingLines
            };
            return result;
        }

        // Need to translate
        const baseContent = {
            celestialTechnical: result[sourceLang]?.celestialTechnical,
            celestialColloquial: result[sourceLang]?.celestialColloquial,
            celestial: result[sourceLang]?.celestial,

            elementsTechnical: result[sourceLang]?.elementsTechnical,
            elementsColloquial: result[sourceLang]?.elementsColloquial,
            elements: result[sourceLang]?.elements,

            coreTechnical: result[sourceLang]?.coreTechnical,
            coreColloquial: result[sourceLang]?.coreColloquial,

            advice: result[sourceLang]?.advice,
            symbolism: result[sourceLang]?.symbolism,
            movingLines: result[sourceLang]?.movingLines
        };

        console.log(`[TRANSLATE] Fetching ${targetLang} from API...`);

        try {
            const translated = await this.translateInterpretation(
                readingId,
                baseContent,
                targetLang,
                hexagramName
            );

            result[targetLang] = {
                ...result[targetLang],
                celestialTechnical: translated.celestialTechnical,
                celestialColloquial: translated.celestialColloquial,
                celestial: translated.celestial,

                elementsTechnical: translated.elementsTechnical,
                elementsColloquial: translated.elementsColloquial,
                elements: translated.elements,

                coreTechnical: translated.coreTechnical,
                coreColloquial: translated.coreColloquial,

                advice: translated.advice,
                symbolism: translated.symbolism,
                movingLines: translated.movingLines
            };
        } catch (e) {
            console.warn(`[TRANSLATE] Failed for ${targetLang}:`, e.message);
            // Keep English fallback
        }

        return result;
    }

    // Helper to call interpretation endpoints with configurable timeout
    static async callInterpretEndpoint(endpoint, request, timeoutMs = 30000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            // DEBUG: Validate request before sending
            let requestBody;
            try {
                requestBody = JSON.stringify(request);
                console.log(`[AI:ENDPOINT] ${endpoint} request size: ${requestBody.length} bytes`);
            } catch (serializeError) {
                console.error(`[AI:ENDPOINT] ${endpoint} JSON serialization failed:`, serializeError.message);
                console.error('[AI:ENDPOINT] Request object keys:', Object.keys(request));
                throw new Error(`Request serialization failed: ${serializeError.message}`);
            }

            const response = await fetch(`${CONFIG.HEXAGRAM_FUNCTION_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestBody,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
                const errorMsg = errorData.error?.message || errorData.error || response.statusText;
                const errorCode = errorData.error?.code || 'HTTP_ERROR';
                throw new Error(`[${errorCode}] HTTP ${response.status}: ${errorMsg}`);
            }

            const data = await response.json();

            if (!data.success) {
                // Handle new standardized error format
                const errorMsg = data.error?.message || data.error || 'API returned unsuccessful response';
                const errorCode = data.error?.code || 'API_ERROR';
                const details = data.error?.details ? ` (${JSON.stringify(data.error.details)})` : '';
                throw new Error(`[${errorCode}] ${errorMsg}${details}`);
            }

            // Handle new standardized API response format (data.data.interpretation)
            return data.data?.interpretation || data.interpretation;
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeoutMs}ms`);
            }
            throw e;
        }
    }

    // Get count of recent readings (compact history)
    static getRecentReadingsCount(currentReadingId) {
        const history = Storage.getJSON('iChingHistory');
        const now = Date.now();

        // Use memory start time if set, otherwise fall back to contextMinutes
        let timeCutoff;
        if (this.config.memoryStartTime) {
            const contextCutoff = now - (this.config.contextMinutes * 60 * 1000);
            timeCutoff = Math.max(this.config.memoryStartTime, contextCutoff);
        } else {
            timeCutoff = now - (this.config.contextMinutes * 60 * 1000);
        }

        return history.filter(h =>
            h.requestTimestamp !== currentReadingId &&
            h.requestTimestamp &&
            new Date(h.requestTimestamp).getTime() > timeCutoff
        ).length;
    }

    // Clear all history and questions
    static clearHistory() {
        const t = I18N[this.lang] || I18N['en'];
        const confirmMsg = t.confirmClearHistory || 'This will permanently delete all saved questions and readings. Continue?';

        if (!confirm(confirmMsg)) return;

        // Clear storage
        Storage.setJSON('iChingHistory', []);
        Storage.setJSON('iChingQuestions', []);

        // Update UI
        this.renderJournal();

        // Show success message
        const successMsg = t.historyCleared || 'History cleared successfully';
        UI.showSuccess(successMsg);

        console.log('[MEMORY] History cleared');
    }

    // Clear memory - reset the time window so only new readings are considered
    static clearMemory() {
        const t = I18N[this.lang] || I18N['en'];
        const confirmMsg = t.confirmClearMemory || 'This will reset the memory window. Previous readings will remain in history but will not be considered for context. Continue?';

        if (!confirm(confirmMsg)) return;

        // Set memory start time to now
        const now = Date.now();
        this.config.memoryStartTime = now;
        Storage.set('memoryStartTime', now.toString());

        // Update UI
        this.updateMemoryStatus();

        // Show success message
        const successMsg = t.memoryCleared || 'Memory cleared - starting fresh from now';
        UI.showSuccess(successMsg);

        console.log('[MEMORY] Memory cleared at:', new Date(now).toISOString());
    }

    // Update memory status display
    static updateMemoryStatus() {
        const statusEl = document.getElementById('memoryStatus');
        if (!statusEl) return;

        const t = I18N[this.lang] || I18N['en'];

        if (this.config.memoryStartTime) {
            const startDate = new Date(this.config.memoryStartTime);
            const timeStr = startDate.toLocaleTimeString();
            const dateStr = startDate.toLocaleDateString();

            statusEl.textContent = (t.memoryActive || 'Memory active since') + ' ' + dateStr + ' ' + timeStr;
            statusEl.style.display = 'flex';
        } else {
            statusEl.style.display = 'none';
        }
    }

    // Get last question for context (compact history) - respects memory start time
    static getLastQuestion(currentReadingId) {
        const history = Storage.getJSON('iChingHistory');
        const now = Date.now();

        // Use memory start time if set, otherwise fall back to contextMinutes
        let timeCutoff;
        if (this.config.memoryStartTime) {
            const contextCutoff = now - (this.config.contextMinutes * 60 * 1000);
            timeCutoff = Math.max(this.config.memoryStartTime, contextCutoff);
        } else {
            timeCutoff = now - (this.config.contextMinutes * 60 * 1000);
        }

        const recent = history
            .filter(h => h.requestTimestamp !== currentReadingId && h.requestTimestamp)
            .filter(h => new Date(h.requestTimestamp).getTime() > timeCutoff)
            .slice(0, 1)[0];

        return recent ? recent.questionText : null;
    }

    // Find the first language key in an interpretation-like object that has actual content.
    // The 3-tab endpoints generate content directly in the user's selected language,
    // so the source is NOT always 'en'. This helper finds whatever language has data.
    static getSourceLang(obj) {
        if (!obj || typeof obj !== 'object') return 'en';
        const langKeys = ['en', 'es', 'it', 'zh'];
        // Prefer 'en' if it has content
        for (const lang of langKeys) {
            if (obj[lang] && typeof obj[lang] === 'object') {
                // Check it has at least one non-empty string value
                const hasContent = Object.values(obj[lang]).some(v =>
                    (typeof v === 'string' && v.length > 0) ||
                    (Array.isArray(v) && v.some(item => item && item.length > 0))
                );
                if (hasContent) return lang;
            }
        }
        return 'en'; // fallback
    }

    // Safety check to ensure interpretation has all required fields
    static ensureInterpretationStructure(result) {
        const emptyLines = ["", "", "", "", "", ""];
        const langs = ['en', 'es', 'it', 'zh'];
        const keys = [
            'celestialTechnical', 'celestialColloquial', 'celestial',
            'elementsTechnical', 'elementsColloquial', 'elements',
            'coreTechnical', 'coreColloquial', 'advice', 'symbolism',
            'movingLines', 'judgment', 'image'
        ];

        // Find the source language (the one with actual content)
        // The 3-tab endpoints generate directly in the user's language, not always 'en'
        const sourceLang = this.getSourceLang(result);
        const sourceData = result[sourceLang] || {};

        langs.forEach(lang => {
            if (!result[lang]) {
                // Seed from whichever language has the actual content
                result[lang] = { ...sourceData };
            }
            keys.forEach(key => {
                if (!result[lang][key]) result[lang][key] = "";
                if (typeof result[lang][key] === 'object') {
                    result[lang][key] = JSON.stringify(result[lang][key]);
                }
            });
            if (!result[lang].lines || !Array.isArray(result[lang].lines)) {
                result[lang].lines = emptyLines;
            }
            result[lang].lines = result[lang].lines.map(l => String(l || ''));
        });
    }

    static createFallbackInterpretation() {
        const t = I18N[this.lang] || I18N['en'];
        const fallbackText = "Interpretation unavailable";
        const emptyLines = ["", "", "", "", "", ""];
        return {
            en: { celestial: fallbackText, elements: "", analysis: fallbackText, advice: "", symbolism: "", movingLines: "", judgment: "", image: "", lines: emptyLines },
            es: { celestial: fallbackText, elements: "", analysis: "Interpretación no disponible", advice: "", symbolism: "", movingLines: "", judgment: "", image: "", lines: emptyLines },
            it: { celestial: fallbackText, elements: "", analysis: "Interpretazione non disponibile", advice: "", symbolism: "", movingLines: "", judgment: "", image: "", lines: emptyLines },
            zh: { celestial: fallbackText, elements: "", analysis: "解读不可用", advice: "", symbolism: "", movingLines: "", judgment: "", image: "", lines: emptyLines }
        };
    }

    /**
     * Post-Process AI Interpretation Response
     * Organizes, redacts, and enhances the quality of AI-generated content
     * Frontend orchestration phase for quality control
     */
    static postProcessInterpretation(result) {
        // Find source language dynamically (not always 'en')
        const sourceLang = this.getSourceLang(result);
        if (!result || !result[sourceLang]) return result;

        console.log('[AI:POST-PROCESS] Frontend orchestration: organizing and redacting interpretation...');

        const processSection = (text, sectionName = '') => {
            if (!text || typeof text !== 'string') return text;

            let cleaned = text;

            // 0. Remove literal \n strings and other escape sequences that sometimes appear
            cleaned = cleaned.replace(/\\n/g, '\n');
            cleaned = cleaned.replace(/\\t/g, ' ');
            cleaned = cleaned.replace(/\\"/g, '"');
            cleaned = cleaned.replace(/\\'/g, "'");

            // 1. Remove repetitive phrases and filler words
            const repetitivePatterns = [
                /\bin this reading\b,?\s*/gi,
                /\bfor this question\b,?\s*/gi,
                /\bfor your question\b,?\s*/gi,
                /\bregarding your inquiry\b,?\s*/gi,
                /\bas you can see\b,?\s*/gi,
                /\bit's important to note that\b,?\s*/gi,
                /\bi want to emphasize that\b,?\s*/gi,
                /\bremember that\b,?\s*/gi,
                /\bplease note that\b,?\s*/gi,
                /\bas mentioned\b,?\s*/gi,
                /\bas noted\b,?\s*/gi,
                /\bit should be noted\b,?\s*/gi,
                /\bneedless to say\b,?\s*/gi,
                /\bit goes without saying\b,?\s*/gi,
                /\bultimately\b,?\s*/gi,
                /\bat the end of the day\b,?\s*/gi,
                /\ball things considered\b,?\s*/gi,
                /\bin conclusion\b,?\s*/gi,
                /\bto summarize\b,?\s*/gi,
                /\bin summary\b,?\s*/gi,
                /\bas we can see\b,?\s*/gi,
                /\bthe fact is\b,?\s*/gi,
                /\bthe reality is\b,?\s*/gi
            ];

            repetitivePatterns.forEach(pattern => {
                cleaned = cleaned.replace(pattern, '');
            });

            // 2. Remove excessive newlines (more than 2)
            cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

            // 3. Remove markdown formatting artifacts that slip through
            cleaned = cleaned.replace(/\*\*\s*\*\*/g, '');
            cleaned = cleaned.replace(/___+/g, '---');
            cleaned = cleaned.replace(/\*\*\*\*+/g, '');

            // 4. Fix spacing issues - but preserve intentional newlines
            cleaned = cleaned.replace(/[ \t]+/g, ' ');  // Only normalize horizontal whitespace
            cleaned = cleaned.replace(/\n +/g, '\n');   // Remove leading spaces after newlines
            cleaned = cleaned.replace(/ +\n/g, '\n');   // Remove trailing spaces before newlines

            // 5. Remove section-agnostic filler content
            const fillerPatterns = [
                /the\s+celestial\s+forces\s+are\s+aligned\s*/gi,
                /the\s+energies\s+suggest\s*/gi,
                /the\s+reading\s+indicates\s*/gi
            ];

            fillerPatterns.forEach(pattern => {
                cleaned = cleaned.replace(pattern, '');
            });

            // 8. Trim whitespace but preserve internal structure
            cleaned = cleaned.trim();

            // 9. Ensure proper capitalization at start of each paragraph
            cleaned = cleaned.replace(/(^|\n\n)([a-z])/g, (match, separator, letter) => {
                return separator + letter.toUpperCase();
            });

            return cleaned;
        };

        const organizeSection = (section) => {
            if (!section) return section;

            // Extract the question context from the reading if available
            const questionContext = this.currentReading?.questionText || '';

            // Ensure consistent structure with proper fallback chain
            const organized = {
                // Primary display fields
                celestial: processSection(section.celestial || section.celestialColloquial || section.celestialTechnical || '', 'celestial'),
                elements: processSection(section.elements || section.elementsColloquial || section.elementsTechnical || '', 'elements'),
                analysis: processSection(section.analysis || section.coreTechnical || section.coreColloquial || '', 'analysis'),
                advice: processSection(section.advice || section.coreColloquial || '', 'advice'),
                symbolism: processSection(section.symbolism || '', 'symbolism'),
                movingLines: processSection(section.movingLines || '', 'movingLines'),

                // Classical text
                judgment: processSection(section.judgment || '', 'judgment'),
                image: processSection(section.image || '', 'image'),
                lines: Array.isArray(section.lines) ? section.lines : ['', '', '', '', '', ''],

                // Metadata
                quotedReferences: Array.isArray(section.quotedReferences) ? section.quotedReferences : [],

                // Technical variants (for advanced users)
                celestialTechnical: processSection(section.celestialTechnical || '', 'celestialTechnical'),
                celestialColloquial: processSection(section.celestialColloquial || '', 'celestialColloquial'),
                elementsTechnical: processSection(section.elementsTechnical || '', 'elementsTechnical'),
                elementsColloquial: processSection(section.elementsColloquial || '', 'elementsColloquial'),
                coreTechnical: processSection(section.coreTechnical || '', 'coreTechnical'),
                coreColloquial: processSection(section.coreColloquial || '', 'coreColloquial'),

                // Houtou (Emperor + Master analysis from backend)
                houtouTechnical: processSection(section.houtouTechnical || '', 'houtouTechnical'),
                houtouColloquial: processSection(section.houtouColloquial || '', 'houtouColloquial'),
                emperorAnalysis: processSection(section.emperorAnalysis || '', 'emperorAnalysis'),
                masterAnalysis: processSection(section.masterAnalysis || '', 'masterAnalysis'),

                // Houtian (Later Heaven) analysis based on Bazi
                houtian: processSection(section.houtian || section.laterHeaven || '', 'houtian'),
                baziAnalysis: processSection(section.baziAnalysis || '', 'baziAnalysis')
            };

            // Remove empty technical fields to reduce payload
            if (!organized.celestialTechnical) delete organized.celestialTechnical;
            if (!organized.celestialColloquial) delete organized.celestialColloquial;
            if (!organized.elementsTechnical) delete organized.elementsTechnical;
            if (!organized.elementsColloquial) delete organized.elementsColloquial;
            if (!organized.coreTechnical) delete organized.coreTechnical;
            if (!organized.coreColloquial) delete organized.coreColloquial;
            if (!organized.houtouTechnical) delete organized.houtouTechnical;
            if (!organized.houtouColloquial) delete organized.houtouColloquial;
            if (!organized.emperorAnalysis) delete organized.emperorAnalysis;
            if (!organized.masterAnalysis) delete organized.masterAnalysis;
            if (!organized.houtian) delete organized.houtian;
            if (!organized.baziAnalysis) delete organized.baziAnalysis;

            return organized;
        };

        // Process all language versions
        const languages = ['en', 'es', 'it', 'zh'];
        languages.forEach(lang => {
            if (result[lang]) {
                result[lang] = organizeSection(result[lang]);
            }
        });

        // Clean metadata
        if (result.metadata) {
            delete result.metadata.rawResponse;
            delete result.metadata.systemPrompt;
            delete result.metadata._internal;

            // Add post-processing timestamp
            result.metadata.postProcessed = new Date().toISOString();
        }

        console.log('[AI:POST-PROCESS] Frontend orchestration complete');
        return result;
    }

    static saveQuestion(txt) {
        const questions = Storage.getJSON('iChingQuestions');
        if (!questions.find(q => q.name === txt)) {
            questions.push({ id: Date.now().toString(), name: txt });
            Storage.setJSON('iChingQuestions', questions);
        }
    }

    static saveReading() {
        const history = Storage.getJSON('iChingHistory');
        const readingToSave = {
            ...this.currentReading,
            questionText: this.currentQuestion,
            askAgainSource: this.askAgainSource // Track if this was an Ask Again reading
        };

        // Check for duplicate (same requestTimestamp)
        const existingIndex = history.findIndex(h => h.requestTimestamp === readingToSave.requestTimestamp);
        if (existingIndex !== -1) {
            // Update existing entry instead of creating duplicate
            history[existingIndex] = readingToSave;
        } else {
            // Add new entry
            history.unshift(readingToSave);
        }

        if (history.length > 100) history.length = 100;
        Storage.setJSON('iChingHistory', history);

        // Reset askAgainSource after saving
        this.askAgainSource = null;
    }

    static getLinePositionName(position) {
        const names = {
            1: "Beginning (Bottom) - Foundation",
            2: "Second - Development",
            3: "Third - Challenge/Crisis",
            4: "Fourth - Transition",
            5: "Fifth - Ruler/Peak",
            6: "Top (Summit) - Culmination/Excess"
        };
        return names[position] || `Position ${position}`;
    }

    static getLinePositionMeaning(position, isYang, isChanging) {
        const meanings = {
            1: "The foundation, the beginning, what is emerging from below. Represents the root of the matter.",
            2: "Development and growth. The line of the 'official' - steady progress, building on foundations.",
            3: "The critical point, the doorway. Often indicates difficulty or danger before breakthrough.",
            4: "Transition, entering the upper trigram. Moving from inner to outer, from preparation to action.",
            5: "The ruler's position, the peak of influence. Where wisdom and authority meet. Most auspicious position.",
            6: "The summit, culmination, or excess. What has reached its extreme may transform. Beware of going too far."
        };

        let meaning = meanings[position] || "";

        if (isChanging) {
            meaning += " This line is MOVING, indicating active transformation in this aspect of the situation.";
        }

        return meaning;
    }

    static renderJournal() {
        // Render questions
        const questions = Storage.getJSON('iChingQuestions');
        const qList = document.getElementById('questionList');
        const emptyQ = document.getElementById('emptyQuestions');

        // Guard against missing elements (may not be on current page)
        if (!qList || !emptyQ) return;

        if (questions.length === 0) {
            qList.innerHTML = '';
            emptyQ.style.display = 'block';
        } else {
            emptyQ.style.display = 'none';
            qList.innerHTML = questions.map(q => {
                const escapedName = q.name.replace(/"/g, '&quot;').replace(/'/g, "\\'");
                const shortName = q.name.length > 50 ? q.name.substring(0, 50) + '...' : q.name;
                return `<li class="question-item" data-question-id="${q.id}" data-question-name="${escapedName}" title="${escapedName}">
                    <span class="question-text">${shortName}</span>
                    <span class="use-question-btn">Use</span>
                </li>`;
            }).join('');

            // Add click handlers
            qList.querySelectorAll('.question-item').forEach(item => {
                item.onclick = (e) => {
                    // Don't trigger if clicking the Use button (it will handle itself)
                    if (e.target.classList.contains('use-question-btn')) return;

                    const id = item.dataset.questionId;
                    const name = item.dataset.questionName;
                    App.selectQuestion(id, name);
                };
            });
        }

        // Render history
        const history = Storage.getJSON('iChingHistory');
        const hGrid = document.getElementById('historyGrid');
        const emptyH = document.getElementById('emptyHistory');

        // Guard against missing elements
        if (!hGrid || !emptyH) return;

        if (history.length === 0) {
            hGrid.innerHTML = '';
            emptyH.style.display = 'block';
        } else {
            emptyH.style.display = 'none';
            hGrid.innerHTML = history.slice(0, 50).map((h, idx) => {
                const timestamp = h.requestTimestamp || h.timestamp || '';
                const hexName = h.hex?.['name_' + this.lang] || h.hex?.name_en || 'Unknown';
                const mansionName = h.mansion?.['name_' + this.lang] || h.mansion?.name_en || '';
                const date = h.requestTimestamp ? new Date(h.requestTimestamp).toLocaleDateString() : '';
                const isAskAgainSource = h.askAgainSource ? true : false;
                const t = I18N[this.lang] || I18N['en'];
                return `
                <div class="history-card ${isAskAgainSource ? 'ask-again-source' : ''}" data-history-idx="${idx}" data-timestamp="${timestamp}">
                    <h4>${h.hex?.number || '?'}. ${hexName}</h4>
                    <p style="font-style: italic;">${h.questionText || ''}</p>
                    ${h.mansion ? `<p style="font-size: 0.85em; color: var(--water); display: flex; align-items: center; gap: 4px;">
                <span class="icon" style="width: 1.2em; height: 1.2em;"><svg><use href="#icon-moon"/></svg></span>
                ${mansionName}
            </p>` : ''}
                    ${date ? `<p style="font-size: 0.8em; opacity: 0.7;">${date}</p>` : ''}
                    <span class="view-btn">${t.viewDocument || 'View Document'}</span>
                </div>
            `}).join('');

            // Add click handlers
            hGrid.querySelectorAll('.history-card').forEach(card => {
                card.onclick = async () => {
                    const timestamp = card.dataset.timestamp;
                    await App.restoreReading(timestamp);
                };
            });
        }
    }

    static selectQuestion(id, name) {
        document.getElementById('questionInput').value = name;
        this.switchMainTab('oracle');
        UI.showStep(1);
    }

    static async restoreReading(timestamp) {
        const history = Storage.getJSON('iChingHistory');
        const reading = history.find(h => h.requestTimestamp === timestamp);
        if (!reading) {
            console.error('Reading not found for timestamp:', timestamp);
            return;
        }

        // Stop any existing lazy observer before loading new reading
        if (typeof TranslationService !== 'undefined') {
            TranslationService.stopLazyObserver();
        }

        this.currentQuestion = reading.questionText;
        this.currentReading = reading;

        document.getElementById('questionInput').value = reading.questionText;

        // Switch to oracle tab
        this.switchMainTab('oracle');

        UI.showStep(3);

        // Add has-results class for read mode support
        if (this.isSingleReadMode) {
            document.body.classList.add('has-results');
        }

        UI.renderHexagram(reading.lines, reading.binaryKey, reading.hex, this.lang);

        // Render graphical summary dashboard
        UI.renderGraphicalSummary(reading, this.lang);

        // NOTE: Astrology data is rendered ONLY in the Analysis tab, not inline

        // Restore text
        const fullData = this.hexagrams.find(h => h.number === reading.hex.number);
        if (fullData) {
            UI.renderChineseText(fullData, this.lang);
            UI.renderTranslation(fullData, this.lang, reading.interpretation);
        }

        if (reading.interpretation) {
            UI.renderAIInterpretation(reading.interpretation, this.lang);
            const remedies = reading.interpretation.remedies || reading.remedies;
            if (remedies) UI.renderRemediesTabbed(remedies, this.lang);
            if (reading.interpretation.fuluDrawing && remedies) {
                UI.renderFuluDrawing(reading.interpretation.fuluDrawing, remedies, this.lang);
            }
            if (reading.interpretation.baguaMedicine) {
                UI.renderBaguaMedicine(reading.interpretation.baguaMedicine, this.lang);
            }
            UI.hideAILoading();
        }

        // Render Analysis tab with restored reading data
        this.renderAnalysisTab();
    }

    static newReading() {
        document.getElementById('questionInput').value = '';
        this.currentQuestion = '';
        this.currentReading = null;
        this.askAgainSource = null; // Reset ask again source
        document.getElementById('meditation-overlay').classList.remove('active');
        if (this.meditationTimer) clearInterval(this.meditationTimer);
        // Stop lazy translation observer
        if (typeof TranslationService !== 'undefined') {
            TranslationService.stopLazyObserver();
        }
        // Clear has-results class for read mode
        document.body.classList.remove('has-results');
        UI.showStep(1);
    }

    /**
     * Generate fallback remedies from local DB when API returns empty
     */
    static generateFallbackRemedies() {
        if (!window.DAOIST_REMEDIES_DB) return [];

        const db = window.DAOIST_REMEDIES_DB;
        const remedies = [];

        // Get current hexagram number for matching
        const hexNumber = this.currentReading?.hex?.number;
        const equilibrium = this.currentReading?.equilibrium;

        // Helper to find matching remedies
        const findMatches = (pool, type) => {
            if (!pool || !Array.isArray(pool)) return [];

            return pool.map(entry => {
                let score = 0;
                // Match by hexagram
                if (hexNumber && entry.hexagrams?.includes(hexNumber)) score += 10;
                // Match by element balance
                if (equilibrium?.elements && entry.elements) {
                    const dominantEl = Object.entries(equilibrium.elements)
                        .sort((a, b) => b[1] - a[1])[0]?.[0];
                    if (entry.elements.includes(dominantEl)) score += 5;
                }
                // Verified entries get bonus
                if (entry.verified) score += 3;
                return { entry, score };
            })
                .sort((a, b) => b.score - a.score)
                .slice(0, 2) // Take top 2 from each type
                .map(({ entry }) => ({
                    id: entry.id,
                    type: type,
                    name: entry.name,
                    description: entry.description,
                    relevance: `Selected based on ${hexNumber ? `hexagram ${hexNumber} resonance` : 'general energetic alignment'} and traditional correspondences.`,
                    instructions: entry.structure?.instructions || entry.application || 'Apply according to traditional practice.',
                    application: entry.application || '',
                    alchemicalContext: entry.alchemicalContext || '',
                    source: entry.source,
                    visualData: entry.visualData,
                    images: entry.images,
                    usage: entry.usage || []
                }));
        };

        // Get remedies from both pools
        const fuluMatches = findMatches(db.fulu, 'fulu');
        const fengshuiMatches = findMatches(db.fengshui, 'fengshui');

        remedies.push(...fuluMatches, ...fengshuiMatches);

        console.log(`[App.generateFallbackRemedies] Generated ${remedies.length} fallback remedies (${fuluMatches.length} fulu, ${fengshuiMatches.length} fengshui)`);
        return remedies;
    }

    static async continueQuestion() {
        if (this.meditationTimer) clearInterval(this.meditationTimer);
        document.getElementById('meditation-overlay').classList.remove('active');
        // Mark that this is an "Ask Again" invocation - store the source reading
        this.askAgainSource = this.currentReading ? this.currentReading.requestTimestamp : null;
        await this.startConsultation();
    }

    static switchMainTab(tabName) {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-btn-${tabName}`).classList.add('active');
        document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Refresh journal when switching to journal tab
        if (tabName === 'journal') {
            this.renderJournal();
        }

        // Refresh analysis tab when switching to it
        if (tabName === 'analysis') {
            this.renderAnalysisTab();
        }
    }

    static renderAstrologyTab() {
        const container = document.getElementById('astrologyContent');
        const loading = document.getElementById('astrologyLoading');
        if (!container) return;

        // If we have current reading with astrology data, display it
        if (this.currentReading?.chineseAstrology) {
            container.innerHTML = '';
            if (loading) loading.style.display = 'none';
            UI.renderChineseAstrologyComplete(this.currentReading.chineseAstrology, this.lang, this.currentReading.hex);
        } else if (this.currentReading) {
            // Show loading if we have a reading but no astrology yet
            if (loading) loading.style.display = 'block';
            const t = I18N[this.lang] || I18N['en'];
            container.innerHTML = `
                <div class="astrology-placeholder">
                    <div class="loading-spinner"></div>
                    <p>${t.calculatingAstro || 'Calculating celestial influences...'}</p>
                    <p class="sub-text">${t.mayTake || 'This may take a moment...'}</p>
                </div>
            `;
        }
    }

    /**
     * Switch between Analysis sub-tabs
     */
    static switchAnalysisTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.analysis-sub-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        document.getElementById(`analysis-sub-tab-${tabName}`).classList.add('active');
        document.getElementById(`analysis-sub-tab-${tabName}`).setAttribute('aria-selected', 'true');

        // Update panels
        document.querySelectorAll('.analysis-sub-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`analysis-panel-${tabName}`).classList.add('active');
    }

    /**
     * Render the Analysis tab with all sub-tabs
     */
    static renderAnalysisTab() {
        // Pre-Analysis Section (formerly Technical Data)
        const preAnalysisContainer = document.getElementById('preAnalysisContent');
        if (preAnalysisContainer && this.currentReading) {
            this.renderPreAnalysis(preAnalysisContainer);
        }

        // Moment Influence (Current Sky) Section
        const momentContainer = document.getElementById('momentInfluenceContent');
        if (momentContainer && this.currentReading) {
            this.renderMomentInfluence(momentContainer);
        }

        // Astrology Section (Complete Chinese Astrology)
        const astroLoading = document.getElementById('analysisAstrologyLoading');
        const astroContent = document.getElementById('analysisAstrologyContent');
        if (astroContent) {
            if (this.currentReading?.chineseAstrology) {
                if (astroLoading) astroLoading.style.display = 'none';
                astroContent.innerHTML = '';
                UI.renderChineseAstrologyComplete(this.currentReading.chineseAstrology, this.lang, this.currentReading.hex);
            } else if (this.currentReading) {
                const t = I18N[this.lang] || I18N['en'];
                if (astroLoading) astroLoading.style.display = 'block';
                astroContent.innerHTML = `
                    <div class="astrology-placeholder-compact">
                        <div class="loading-spinner-small"></div>
                        <p>${t.calculatingAstro || 'Calculating celestial influences...'}</p>
                        <p class="sub-text">${t.mayTake || 'This may take 10-30 seconds...'}</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Render Pre-Analysis section showing data sent to AI
     */
    static renderPreAnalysis(container) {
        const t = I18N[this.lang] || I18N['en'];

        if (!this.currentReading) {
            container.innerHTML = `<p class="placeholder-small">${t.castReading || 'Cast a reading to see technical analysis data'}</p>`;
            return;
        }

        const hex = this.currentReading.hex;
        const reading = this.currentReading;
        const hasAstro = !!reading.chineseAstrology;

        let html = '<div class="preanalysis-content">';

        // Reading Summary Card
        html += `
            <div class="reading-summary-card">
                <h4>📋 ${t.hexagramDetails || 'Reading Summary'}</h4>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="label">${t.hexagram || 'Hexagram'}</span>
                        <span class="value">#${hex?.number} ${hex?.name_en}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">${t.judgment || 'Chinese'}</span>
                        <span class="value">${hex?.name_zh}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">${t.binary || 'Binary Key'}</span>
                        <span class="value mono">${reading.binaryKey}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">${t.movingLines || 'Moving Lines'}</span>
                        <span class="value">${reading.equilibrium?.movingCount || 0}</span>
                    </div>
                </div>
            </div>
        `;

        // Lines Cast
        if (reading.lines) {
            html += `
                <div class="tech-section">
                    <h4>🎲 ${t.coinTosses || 'Lines Cast'}</h4>
                    <div class="lines-detail">
                        ${reading.lines.map((line, i) => {
                const pos = 6 - i;
                const type = line.isYang ? (t.yang || 'Yang') : (t.yin || 'Yin');
                const changing = line.isChanging ? (t.changing || 'Changing') : (t.stable || 'Static');
                const icon = line.isYang ? '⚊' : '⚋';
                return `
                                <div class="line-detail-item ${line.isChanging ? 'changing' : ''}">
                                    <span class="line-pos">${pos}</span>
                                    <span class="line-icon">${icon}</span>
                                    <span class="line-type">${type}</span>
                                    <span class="line-status">${changing}</span>
                                    <span class="line-value">${line.value}</span>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        }

        // AI Prompt Data Preview - Shows what's being sent to AI
        html += `
            <div class="prompt-data-preview">
                <h4>${t.dataSentToAI || 'Data Sent to AI Interpreter'}</h4>
                <div class="prompt-grid">
                    <div class="prompt-item">
                        <span class="icon included">✓</span>
                        <span class="label">${t.hexagram || 'Hexagram'}</span>
                        <span class="status included">${t.included || 'Included'}</span>
                    </div>
                    <div class="prompt-item">
                        <span class="icon included">✓</span>
                        <span class="label">${t.lines || 'Lines'}</span>
                        <span class="status included">${t.included || 'Included'}</span>
                    </div>
                    <div class="prompt-item">
                        <span class="icon included">✓</span>
                        <span class="label">${t.binary || 'Binary Key'}</span>
                        <span class="status included">${t.included || 'Included'}</span>
                    </div>
                    <div class="prompt-item">
                        <span class="icon included">✓</span>
                        <span class="label">${t.lunarMansionTitle || 'Lunar Mansion'}</span>
                        <span class="status included">${t.included || 'Included'}</span>
                    </div>
                    <div class="prompt-item">
                        <span class="icon included">✓</span>
                        <span class="label">${t.yinYangBalance || 'Equilibrium'}</span>
                        <span class="status included">${t.included || 'Included'}</span>
                    </div>
                    <div class="prompt-item">
                        <span class="icon included">✓</span>
                        <span class="label">${t.currentBaziTitle || 'Current BaZi'}</span>
                        <span class="status included">${t.included || 'Included'}</span>
                    </div>
                    ${reading.birthBazi ? `
                    <div class="prompt-item">
                        <span class="icon included">✓</span>
                        <span class="label">${t.lifePalaceTitle || 'Birth BaZi'}</span>
                        <span class="status included">${t.included || 'Included'}</span>
                    </div>
                    ` : ''}
                    <div class="prompt-item">
                        <span class="icon ${hasAstro ? 'included' : 'pending'}">${hasAstro ? '✓' : '○'}</span>
                        <span class="label">${t.apiAstrology || 'API Astrology'}</span>
                        <span class="status ${hasAstro ? 'included' : 'pending'}">${hasAstro ? (t.included || 'Included') : (t.pending || 'Pending')}</span>
                    </div>
                    <div class="prompt-item">
                        <span class="icon ${hasAstro ? 'included' : 'pending'}">${hasAstro ? '✓' : '○'}</span>
                        <span class="label">${t.baguaAnalysis || 'Bagua Analysis'}</span>
                        <span class="status ${hasAstro ? 'included' : 'pending'}">${hasAstro ? (t.included || 'Included') : (t.pending || 'Pending')}</span>
                    </div>
                    <div class="prompt-item">
                        <span class="icon ${hasAstro ? 'included' : 'pending'}">${hasAstro ? '✓' : '○'}</span>
                        <span class="label">${t.hetuLuoshu || 'He Tu / Luo Shu'}</span>
                        <span class="status ${hasAstro ? 'included' : 'pending'}">${hasAstro ? (t.included || 'Included') : (t.pending || 'Pending')}</span>
                    </div>
                    ${this.baziConfig.latitude !== null ? `
                    <div class="prompt-item">
                        <span class="icon included">✓</span>
                        <span class="label">${t.locationCorrection || 'Location Correction'} (真太阳时)</span>
                        <span class="status included">${this.baziConfig.latitude.toFixed(1)}°, ${this.baziConfig.longitude.toFixed(1)}°</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Render Moment Influence (Current Sky BaZi) section
     */
    static renderMomentInfluence(container) {
        const t = I18N[this.lang] || I18N['en'];

        if (!this.currentReading) {
            container.innerHTML = `<p class="placeholder-small">${t.castMoment || 'Cast a reading to see current celestial influences'}</p>`;
            return;
        }

        const currentBazi = this.currentReading.currentBazi;
        const currentBaziExtended = this.currentReading.currentBaziExtended;
        const mansion = this.currentReading.mansion;
        const equilibrium = this.currentReading.equilibrium;
        const hex = this.currentReading.hex;
        const reading = this.currentReading;

        // Build Moment Influence HTML
        let html = '<div class="moment-influence-content">';

        // Current Sky BaZi
        if (currentBazi) {
            // Mapping from stem/branch names to translation keys
            const stemTransMap = {
                'Jia': 'stemJia', 'Yi': 'stemYi', 'Bing': 'stemBing', 'Ding': 'stemDing', 'Wu': 'stemWu',
                'Ji': 'stemJi', 'Geng': 'stemGeng', 'Xin': 'stemXin', 'Ren': 'stemRen', 'Gui': 'stemGui'
            };
            const branchTransMap = {
                'Zi': 'branchZi', 'Chou': 'branchChou', 'Yin': 'branchYin', 'Mao': 'branchMao', 'Chen': 'branchChen',
                'Si': 'branchSi', 'Wu': 'branchWu', 'Wei': 'branchWei', 'Shen': 'branchShen', 'You': 'branchYou',
                'Xu': 'branchXu', 'Hai': 'branchHai'
            };

            // Helper to get stem display with translation
            const getStemDisplay = (stem) => {
                if (!stem) return '?';
                const zh = stem.zh || stem.name || '?';
                const transKey = stemTransMap[stem.name];
                const trans = transKey ? (t[transKey] || stem.name) : stem.name;
                return `${zh} <span class="stem-trans">(${trans})</span>`;
            };

            // Helper to get branch display with translation
            const getBranchDisplay = (branch) => {
                if (!branch) return '?';
                const zh = branch.zh || branch.name || '?';
                const transKey = branchTransMap[branch.name];
                const trans = transKey ? (t[transKey] || branch.name) : branch.name;
                return `${zh} <span class="branch-trans">(${trans})</span>`;
            };

            // Helper to get element color class
            const getElementClass = (element) => {
                const elMap = {
                    'Wood': 'element-wood', 'Fire': 'element-fire', 'Earth': 'element-earth',
                    'Metal': 'element-metal', 'Water': 'element-water',
                    'wood': 'element-wood', 'fire': 'element-fire', 'earth': 'element-earth',
                    'metal': 'element-metal', 'water': 'element-water'
                };
                return elMap[element] || '';
            };

            html += `
                <div class="moment-bazi-section">
                    <h4>🌙 ${t.currentSky || 'Current Sky'} (${t.tianShi || 'Tian Shi'}) <span class="zh">天時</span></h4>
                    
                    <!-- Four Pillars Grid -->
                    <div class="bazi-pillars-row">
                        <div class="pillar-box hour">
                            <span class="pillar-label">${t.hour || 'Hour'} Pillar</span>
                            <span class="stem ${getElementClass(currentBazi.hour?.stem?.element)}">${getStemDisplay(currentBazi.hour?.stem)}</span>
                            <span class="branch ${getElementClass(currentBazi.hour?.branch?.element)}">${getBranchDisplay(currentBazi.hour?.branch)}</span>
                            ${currentBazi.hour?.branch?.hidden ? `<span class="hidden-stems">藏: ${currentBazi.hour.branch.hidden.join(' ')}</span>` : ''}
                        </div>
                        <div class="pillar-box day">
                            <span class="pillar-label">${t.day || 'Day'} Pillar</span>
                            <span class="stem day-master ${getElementClass(currentBazi.day?.stem?.element)}">${getStemDisplay(currentBazi.day?.stem)}</span>
                            <span class="branch ${getElementClass(currentBazi.day?.branch?.element)}">${getBranchDisplay(currentBazi.day?.branch)}</span>
                            ${currentBazi.day?.branch?.hidden ? `<span class="hidden-stems">藏: ${currentBazi.day.branch.hidden.join(' ')}</span>` : ''}
                        </div>
                        <div class="pillar-box month">
                            <span class="pillar-label">${t.month || 'Month'} Pillar</span>
                            <span class="stem ${getElementClass(currentBazi.month?.stem?.element)}">${getStemDisplay(currentBazi.month?.stem)}</span>
                            <span class="branch ${getElementClass(currentBazi.month?.branch?.element)}">${getBranchDisplay(currentBazi.month?.branch)}</span>
                            ${currentBazi.month?.branch?.hidden ? `<span class="hidden-stems">藏: ${currentBazi.month.branch.hidden.join(' ')}</span>` : ''}
                        </div>
                        <div class="pillar-box year">
                            <span class="pillar-label">${t.year || 'Year'} Pillar</span>
                            <span class="stem ${getElementClass(currentBazi.year?.stem?.element)}">${getStemDisplay(currentBazi.year?.stem)}</span>
                            <span class="branch ${getElementClass(currentBazi.year?.branch?.element)}">${getBranchDisplay(currentBazi.year?.branch)}</span>
                            ${currentBazi.year?.branch?.hidden ? `<span class="hidden-stems">藏: ${currentBazi.year.branch.hidden.join(' ')}</span>` : ''}
                        </div>
                    </div>

                    <!-- Day Master Info -->
                    ${currentBazi.dayMaster ? `
                        <div class="day-master-card">
                            <div class="dm-header">
                                <span class="dm-title">${t.dayMaster || 'Day Master'}</span>
                                <span class="dm-value ${getElementClass(currentBazi.dayMaster.element)}">
                                    ${currentBazi.dayMaster.zh} ${currentBazi.dayMaster.name} 
                                    <span class="dm-element">(${currentBazi.dayMaster.element} ${currentBazi.dayMaster.yinYang})</span>
                                </span>
                            </div>
                            <div class="dm-narrative">
                                <p>The Day Master represents your core self in this moment. 
                                <strong>${currentBazi.dayMaster.name} ${currentBazi.dayMaster.element}</strong> 
                                (${currentBazi.dayMaster.yinYang}) indicates 
                                ${currentBazi.dayMaster.element === 'Water' ? 'adaptability, flow, and wisdom' :
                        currentBazi.dayMaster.element === 'Fire' ? 'passion, energy, and transformation' :
                            currentBazi.dayMaster.element === 'Wood' ? 'growth, creativity, and expansion' :
                                currentBazi.dayMaster.element === 'Metal' ? 'structure, precision, and determination' :
                                    'stability, nurturing, and groundedness'}.</p>
                            </div>
                        </div>
                    ` : ''}

                    <!-- BaZi Narrative Analysis -->
                    <div class="bazi-narrative">
                        <h5>📖 BaZi Analysis</h5>
                        <div class="narrative-content">
                            <p class="narrative-paragraph">
                                <strong>Current Celestial Configuration:</strong> The sky reveals a 
                                <span class="highlight ${getElementClass(currentBazi.day?.stem?.element)}">${currentBazi.day?.stem?.element || 'balanced'}</span> 
                                Day Master (${currentBazi.day?.stem?.name || 'Unknown'}) 
                                ${currentBazi.strength ? `with <strong>${typeof currentBazi.strength === 'object' ? (currentBazi.strength.result || JSON.stringify(currentBazi.strength)) : currentBazi.strength}</strong> strength` : ''}.
                                ${currentBazi.favorableElements?.length ?
                    `Favorable elements are <span class="element-tag element-${typeof currentBazi.favorableElements[0] === 'string' ? currentBazi.favorableElements[0].toLowerCase() : 'unknown'}">${currentBazi.favorableElements.join(', ')}</span>.` : ''}
                            </p>
                            
                            <p class="narrative-paragraph">
                                <strong>Pillar Dynamics:</strong> The Year pillar 
                                <span class="pillar-mention">${currentBazi.year?.stem?.zh || '?'}${currentBazi.year?.branch?.zh || '?'}</span> 
                                represents cosmic influences and ancestral patterns.
                                The Month pillar 
                                <span class="pillar-mention">${currentBazi.month?.stem?.zh || '?'}${currentBazi.month?.branch?.zh || '?'}</span> 
                                governs career and external circumstances.
                                The Day pillar 
                                <span class="pillar-mention highlight">${currentBazi.day?.stem?.zh || '?'}${currentBazi.day?.branch?.zh || '?'}</span> 
                                represents the self and current focus.
                                The Hour pillar 
                                <span class="pillar-mention">${currentBazi.hour?.stem?.zh || '?'}${currentBazi.hour?.branch?.zh || '?'}</span> 
                                indicates children, dreams, and future potential.
                            </p>

                            ${currentBazi.strength ? `
                            <p class="narrative-paragraph">
                                <strong>Elemental Balance:</strong> The chart shows ${typeof currentBazi.strength === 'string' ? currentBazi.strength.toLowerCase() : (typeof currentBazi.strength === 'object' ? (currentBazi.strength.result || 'balanced').toLowerCase() : currentBazi.strength)} strength,
                                suggesting ${currentBazi.strength === 'Strong' || (typeof currentBazi.strength === 'object' && currentBazi.strength?.result === 'Strong') ? 'confidence and initiative, but potential rigidity' :
                        currentBazi.strength === 'Weak' || (typeof currentBazi.strength === 'object' && currentBazi.strength?.result === 'Weak') ? 'flexibility and adaptability, but need for support' :
                            'a harmonious balance of give and take'}.
                                ${currentBazi.favorableElements?.length ?
                        `Seek opportunities aligned with ${currentBazi.favorableElements.join(' and ')} energies.` : ''}
                                ${currentBazi.unfavorableElements?.length ?
                        `Exercise caution with ${currentBazi.unfavorableElements.join(' and ')} influences.` : ''}
                            </p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        // Location & Time Correction Info
        if (this.baziConfig.latitude !== null && this.baziConfig.longitude !== null) {
            html += `
                <div class="moment-location-section">
                    <h4>📍 ${t.locationTimeCorrection || 'Location & Time Correction'} <span class="zh">真太阳时校正</span></h4>
                    <div class="location-card">
                        <div class="location-coords">
                            <span class="coord-label">${t.latitude || 'Latitude'}:</span>
                            <span class="coord-value">${this.baziConfig.latitude.toFixed(2)}°</span>
                            <span class="coord-label">${t.longitude || 'Longitude'}:</span>
                            <span class="coord-value">${this.baziConfig.longitude.toFixed(2)}°</span>
                        </div>
                        <div class="correction-note">
                            <span class="correction-badge">真太阳时</span>
                            <span class="correction-text">${t.trueSolarTime || 'True Solar Time'} ${t.included || 'correction applied'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Lunar Mansion
        if (mansion) {
            const mansionName = mansion['name_' + this.lang] || mansion.name_en;
            html += `
                <div class="moment-mansion-section">
                    <h4>✨ ${t.lunarMansionTitle || 'Lunar Mansion'} <span class="zh">二十八宿</span></h4>
                    <div class="mansion-card">
                        <span class="mansion-name">${mansionName} <span class="zh">${mansion.name_zh}</span></span>
                        <span class="mansion-meta">${t[mansion.animal.toLowerCase()] || mansion.animal} · ${t[mansion.element.toLowerCase()] || mansion.element} · ${mansion.group}</span>
                    </div>
                </div>
            `;
        }

        // Equilibrium summary (Yin/Yang + Five Elements)
        if (equilibrium) {
            html += `
                <div class="moment-equilibrium-section">
                    <h4>⚖️ ${t.yinYangBalance || 'Equilibrium'} <span class="zh">平衡</span></h4>
                    <div class="equilibrium-summary">
                        <div class="eq-item">
                            <span class="eq-label">${t.yangLines || 'Yang Lines'}:</span>
                            <span class="eq-value yang">${equilibrium.yangCount}</span>
                        </div>
                        <div class="eq-item">
                            <span class="eq-label">${t.yinLines || 'Yin Lines'}:</span>
                            <span class="eq-value yin">${equilibrium.yinCount}</span>
                        </div>
                        <div class="eq-item">
                            <span class="eq-label">${t.balance || 'Balance'}:</span>
                            <span class="eq-value ${equilibrium.balanceState}">${equilibrium.balanceState}</span>
                        </div>
                        <div class="eq-item">
                            <span class="eq-label">${t.moving || 'Moving'}:</span>
                            <span class="eq-value moving">${equilibrium.movingCount}</span>
                        </div>
                    </div>
                    
                    <!-- Five Elements Distribution -->
                    ${equilibrium.elements ? `
                    <div class="five-elements-section">
                        <h5>${t.fiveElements || 'Five Elements'} <span class="zh">五行</span></h5>
                        <div class="elements-distribution">
                            ${Object.entries(equilibrium.elements).map(([el, val]) => {
                const elKey = el.toLowerCase();
                const elName = t[elKey] || el;
                const elSymbol = { wood: '🌳', fire: '🔥', earth: '🏔️', metal: '⚚', water: '💧' }[elKey] || '';
                const elClass = elKey;
                return `
                                    <div class="element-bar">
                                        <span class="element-label">${elSymbol} ${elName}</span>
                                        <div class="element-track">
                                            <div class="element-fill ${elClass}" style="width: ${val}%"></div>
                                        </div>
                                        <span class="element-value">${val}%</span>
                                    </div>
                                `;
            }).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }

        // Hexagram info
        if (hex) {
            const lower = TRIGRAMS[this.currentReading.binaryKey?.substring(0, 3)];
            const upper = TRIGRAMS[this.currentReading.binaryKey?.substring(3, 6)];
            const lang = this.lang || 'en';
            html += `
                <div class="moment-hexagram-section">
                    <h4>☯ ${t.hexagramTrigrams || 'Hexagram Trigrams'} <span class="zh">卦象</span></h4>
                    <div class="trigrams-row">
                        <div class="trigram-badge upper">
                            <span class="tg-label">${t.upper || 'Upper'}</span>
                            <span class="tg-name">${upper?.name?.[lang] || upper?.name?.en || '?'}</span>
                            <span class="tg-zh">${upper?.symbol || upper?.name?.zh || '?'}</span>
                        </div>
                        <div class="trigram-divider">+</div>
                        <div class="trigram-badge lower">
                            <span class="tg-label">${t.lower || 'Lower'}</span>
                            <span class="tg-name">${lower?.name?.[lang] || lower?.name?.en || '?'}</span>
                            <span class="tg-zh">${lower?.symbol || lower?.name?.zh || '?'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    static toggleFiveElementsInfo() {
        const msgs = {
            en: "Five Elements (Wu Xing):\n\u6728 Wood - Growth\n\u706b Fire - Energy\n\u571f Earth - Stability\n\u91d1 Metal - Structure\n\u6c34 Water - Wisdom",
            zh: "\u4e94\u884c\uff1a\n\u6728 - \u751f\u957f\n\u706b - \u80fd\u91cf\n\u571f - \u7a33\u5b9a\n\u91d1 - \u7ed3\u6784\n\u6c34 - \u667a\u6167",
            es: "Cinco Elementos:\n\u6728 Madera - Crecimiento\n\u706b Fuego - Energ\u00eda\n\u571f Tierra - Estabilidad\n\u91d1 Metal - Estructura\n\u6c34 Agua - Sabidur\u00eda",
            it: "Cinque Elementi:\n\u6728 Legno - Crescita\n\u706b Fuoco - Energia\n\u571f Terra - Stabilit\u00e0\n\u91d1 Metallo - Struttura\n\u6c34 Acqua - Saggezza"
        };
        alert(msgs[this.lang]);
    }

    // ============================================================================
    // BAZI LOCATION & TIME CONFIGURATION
    // ============================================================================

    static baziConfig = {
        latitude: null,
        longitude: null,
        useTrueSolarTime: true
    };

    static async detectBaziLocation() {
        const latInput = document.getElementById('baziLatitude');
        const lngInput = document.getElementById('baziLongitude');

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const lat = position.coords.latitude.toFixed(2);
            const lng = position.coords.longitude.toFixed(2);

            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;

            this.baziConfig.latitude = parseFloat(lat);
            this.baziConfig.longitude = parseFloat(lng);

            console.log('[App.detectBaziLocation] Location detected:', this.baziConfig);

        } catch (error) {
            console.error('[App.detectBaziLocation] Failed:', error);
            alert('Could not detect location. Please enter manually.\nError: ' + error.message);
        }
    }

    static applyBaziConfig() {
        const latInput = document.getElementById('baziLatitude');
        const lngInput = document.getElementById('baziLongitude');
        const dateInput = document.getElementById('baziDate');
        const timeInput = document.getElementById('baziTime');

        // Update config
        this.baziConfig.latitude = latInput?.value ? parseFloat(latInput.value) : null;
        this.baziConfig.longitude = lngInput?.value ? parseFloat(lngInput.value) : null;

        // Calculate true solar time correction if location provided
        let adjustedDate = new Date();
        if (dateInput?.value && timeInput?.value) {
            adjustedDate = new Date(`${dateInput.value}T${timeInput.value}`);
        }

        // Apply longitude correction (真太阳时 True Solar Time)
        if (this.baziConfig.longitude !== null) {
            adjustedDate = this.calculateTrueSolarTime(adjustedDate, this.baziConfig.longitude);
            console.log('[App.applyBaziConfig] Applied true solar time correction:', adjustedDate);
        }

        // Recalculate BaZi with adjusted time
        if (this.currentReading) {
            const timeStr = `${adjustedDate.getHours()}:${adjustedDate.getMinutes()}`;

            // Recalculate Current BaZi with adjusted time
            this.currentReading.currentBazi = Astrology.getBaziChart(adjustedDate, timeStr);
            this.currentReading.currentBaziExtended = Astrology.getComprehensiveBaziAnalysis(adjustedDate, timeStr);

            // Recalculate Lunar Mansion with location
            this.currentReading.mansion = Astrology.getLunarMansion(adjustedDate, this.baziConfig.latitude, this.baziConfig.longitude);

            // Update display
            this.renderAnalysisTab();

            // Show success message
            UI.showSuccess('BaZi recalculated with location correction (真太阳时)');
        }
    }

    /**
     * Calculate True Solar Time (真太阳时) from standard time and longitude
     * Each degree of longitude = 4 minutes time difference
     * Reference meridian for China is 120°E (Beijing time)
     */
    static calculateTrueSolarTime(standardDate, longitude) {
        const standardMeridian = 120; // Beijing time uses 120°E
        const longitudeDiff = longitude - standardMeridian;
        const minutesCorrection = longitudeDiff * 4; // 4 minutes per degree

        const trueSolarDate = new Date(standardDate.getTime() + minutesCorrection * 60000);

        console.log('[App.calculateTrueSolarTime] Correction:', {
            longitude,
            standardMeridian,
            longitudeDiff,
            minutesCorrection,
            originalTime: standardDate.toLocaleString(),
            adjustedTime: trueSolarDate.toLocaleString()
        });

        return trueSolarDate;
    }

    // ============================================================================
    // EXPORT FUNCTIONALITY
    // ============================================================================

    static async exportReading(format) {
        if (!this.currentReading) {
            alert('No reading to export. Please perform a reading first.');
            return;
        }

        const t = I18N[this.lang] || I18N['en'];
        const timestamp = new Date().toISOString().split('T')[0];
        const hexName = this.currentReading.hex?.name_en || 'Unknown';
        const filename = `yijing_reading_${hexName.replace(/\s+/g, '_')}_${timestamp}`;

        try {
            UI.showLoading(t.generatingExport || 'Generating export...');

            switch (format) {
                case 'md':
                    await this.exportToMarkdown(filename);
                    break;
                case 'html':
                    await this.exportToHTML(filename);
                    break;
                case 'pdf':
                    await this.exportToPDFServer(filename, false);
                    break;
                case 'pdf-full':
                    await this.exportToPDFServer(filename, true);
                    break;
                case 'svg':
                    await this.exportDiagramSVG(filename);
                    break;
                default:
                    throw new Error(`Unknown export format: ${format}`);
            }
            UI.showSuccess(`${t.exportSuccess || 'Export successful'}: ${filename}.${format}`);
        } catch (error) {
            console.error('Export failed:', error);
            UI.showError(`${t.exportError || 'Export failed'}: ${error.message}`);
        } finally {
            UI.hideLoading();
        }
    }

    static generateExportData(includeFullDetails = true) {
        const reading = this.currentReading;
        const interp = reading.interpretation?.[this.lang] || {};
        const hex = reading.hex;
        const lang = this.lang;

        const baseData = {
            question: reading.question,
            date: new Date(reading.requestTimestamp).toLocaleString(),
            hexagram: {
                number: hex?.number,
                name: hex?.[`name_${lang}`] || hex?.name_en,
                nameZh: hex?.name_zh,
                binary: reading.binaryKey
            },
            lines: reading.lines?.map((l, i) => ({
                position: i + 1,
                type: l.isYang ? 'Yang' : 'Yin',
                changing: l.isChanging,
                value: l.value
            })),
            mansion: reading.mansion,
            birthBazi: reading.birthBazi,
            currentBazi: reading.currentBazi,
            equilibrium: reading.equilibrium,
            interpretation: interp,
            remedies: reading.interpretation?.remedies?.[lang]?.remedies || []
        };

        if (includeFullDetails) {
            // Add extended BaZi analysis
            baseData.birthBaziExtended = reading.birthBaziExtended;
            baseData.currentBaziExtended = reading.currentBaziExtended;

            // Add Xiantian interpretation
            baseData.interpretation.xiantian = reading.interpretation?.xiantian?.[lang] || reading.interpretation?.xiantian;

            // Add Bagua Medicine
            baseData.interpretation.baguaMedicine = reading.interpretation?.baguaMedicine?.[lang] || reading.interpretation?.baguaMedicine;

            // Add FDL diagrams
            baseData.interpretation.fdlDiagrams = {
                xiantian: reading.interpretation?.xiantianFDL,
                fulu: reading.interpretation?.fuluDrawing
            };
        }

        return baseData;
    }

    static async exportToMarkdown(filename) {
        const data = this.generateExportData();
        const t = I18N[this.lang] || I18N['en'];

        let md = `# I Ching Reading - ${data.hexagram.name}\n\n`;
        md += `**Date:** ${data.date}  \n`;
        md += `**Hexagram:** ${data.hexagram.number} - ${data.hexagram.name} (${data.hexagram.nameZh})  \n`;
        md += `**Binary:** ${data.hexagram.binary}  \n\n`;

        md += `## Question\n\n${data.question}\n\n`;

        md += `## Cast Lines\n\n`;
        data.lines.forEach(line => {
            const changing = line.changing ? ' (Changing)' : '';
            md += `- Line ${line.position}: ${line.type}${changing}\n`;
        });
        md += '\n';

        if (data.mansion) {
            md += `## Lunar Mansion\n\n`;
            md += `**${data.mansion.name_en}** (${data.mansion.name_zh})\n\n`;
            md += `- Group: ${data.mansion.group}\n`;
            md += `- Element: ${data.mansion.element}\n`;
            md += `- Animal: ${data.mansion.animal}\n\n`;
        }

        if (data.interpretation.celestial) {
            md += `## Celestial Influences\n\n${data.interpretation.celestial}\n\n`;
        }

        if (data.interpretation.elements) {
            md += `## Five Elements Analysis\n\n${data.interpretation.elements}\n\n`;
        }

        if (data.interpretation.analysis) {
            md += `## Analysis\n\n${data.interpretation.analysis}\n\n`;
        }

        if (data.interpretation.advice) {
            md += `## Advice\n\n${data.interpretation.advice}\n\n`;
        }

        if (data.interpretation.movingLines) {
            md += `## Moving Lines\n\n${data.interpretation.movingLines}\n\n`;
        }

        if (data.remedies && data.remedies.length > 0) {
            md += `## Daoist Remedies\n\n`;
            data.remedies.forEach(r => {
                md += `### ${r.name} (${r.type.toUpperCase()})\n`;
                md += `**Relevance:** ${r.relevance}\n\n`;
                md += `${r.description}\n\n`;
                md += `**Instructions:** ${r.instructions}\n\n`;
                if (r.charm) {
                    md += `**Incantation:**\n${r.charm}\n\n`;
                }
                md += `*Source: ${r.source}*\n\n`;
            });
        }

        md += `---\n\n`;
        md += `*Generated by Yijingtu I Ching Oracle*`;

        this.downloadFile(`${filename}.md`, md, 'text/markdown');
    }

    static async exportToHTML(filename) {
        const data = this.generateExportData();
        const t = I18N[this.lang] || I18N['en'];

        // Capture hexagram diagram as SVG
        const hexagramSVG = this.captureHexagramSVG();

        let html = `<!DOCTYPE html>
<html lang="${this.lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>I Ching Reading - ${data.hexagram.name}</title>
    <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
        h1 { color: #8B4513; border-bottom: 2px solid #8B4513; padding-bottom: 10px; }
        h2 { color: #654321; margin-top: 30px; }
        .meta { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .lines { display: flex; flex-direction: column-reverse; align-items: center; margin: 20px 0; }
        .line { width: 120px; height: 20px; margin: 5px 0; display: flex; align-items: center; justify-content: center; }
        .yang { border-top: 4px solid #333; border-bottom: 4px solid #333; }
        .yin { position: relative; }
        .yin::before, .yin::after { content: ''; position: absolute; width: 45%; height: 4px; background: #333; }
        .yin::before { left: 0; }
        .yin::after { right: 0; }
        .changing { background: rgba(255,0,0,0.2); }
        .remedy { background: #fff8dc; padding: 15px; border-left: 4px solid #daa520; margin: 15px 0; }
        .quote { font-style: italic; color: #666; border-left: 3px solid #ccc; padding-left: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <h1>I Ching Reading</h1>
    <h2>${data.hexagram.number}. ${data.hexagram.name} <small>(${data.hexagram.nameZh})</small></h2>
    
    <div class="meta">
        <strong>Date:</strong> ${data.date}<br>
        <strong>Binary:</strong> ${data.hexagram.binary}
    </div>

    <h2>Question</h2>
    <p>${data.question}</p>

    <h2>Hexagram</h2>
    ${hexagramSVG}

    <h2>Cast Lines</h2>
    <div class="lines">
        ${data.lines.map((line, i) => `
            <div class="line ${line.type.toLowerCase()} ${line.changing ? 'changing' : ''}" title="Line ${i + 1}: ${line.type}${line.changing ? ' (Changing)' : ''}"></div>
        `).join('')}
    </div>

    ${data.mansion ? `
    <h2>Lunar Mansion</h2>
    <p><strong>${data.mansion.name_en}</strong> (${data.mansion.name_zh})<br>
    Group: ${data.mansion.group} | Element: ${data.mansion.element} | Animal: ${data.mansion.animal}</p>
    ` : ''}

    ${data.interpretation.celestial ? `
    <h2>Celestial Influences</h2>
    <div class="quote">${data.interpretation.celestial.replace(/\n/g, '<br>')}</div>
    ` : ''}

    ${data.interpretation.elements ? `
    <h2>Five Elements Analysis</h2>
    <div class="quote">${data.interpretation.elements.replace(/\n/g, '<br>')}</div>
    ` : ''}

    ${data.interpretation.analysis ? `
    <h2>Analysis</h2>
    <p>${data.interpretation.analysis.replace(/\n/g, '<br>')}</p>
    ` : ''}

    ${data.interpretation.advice ? `
    <h2>Advice</h2>
    <p>${data.interpretation.advice.replace(/\n/g, '<br>')}</p>
    ` : ''}

    ${data.interpretation.movingLines ? `
    <h2>Moving Lines</h2>
    <div class="quote">${data.interpretation.movingLines.replace(/\n/g, '<br>')}</div>
    ` : ''}

    ${data.remedies && data.remedies.length > 0 ? `
    <h2>Daoist Remedies</h2>
    ${data.remedies.map(r => `
        <div class="remedy">
            <h3>${r.name} <small>(${r.type.toUpperCase()})</small></h3>
            <p><strong>Relevance:</strong> ${r.relevance}</p>
            <p>${r.description.replace(/\n/g, '<br>')}</p>
            <p><strong>Instructions:</strong> ${r.instructions.replace(/\n/g, '<br>')}</p>
            ${r.charm ? `<h4>Incantation</h4><p>${r.charm.replace(/\n/g, '<br>')}</p>` : ''}
            <p style="font-size: 0.8em; opacity: 0.7;">Source: ${r.source}</p>
        </div>
    `).join('')}
    ` : ''}

    <hr style="margin-top: 40px;">
    <p style="text-align: center; color: #999; font-size: 0.9em;">
        Generated by Yijingtu I Ching Oracle
    </p>
</body>
</html>`;

        this.downloadFile(`${filename}.html`, html, 'text/html');
    }

    static async exportToPDFServer(filename, includeFullDetails = false) {
        // Call backend to generate fully rendered PDF
        const data = this.generateExportData(includeFullDetails);

        console.log(`[App] Exporting PDF with${includeFullDetails ? '' : 'out'} full details`);

        const response = await fetch(`${CONFIG.EXPORT_FUNCTION_URL}/export-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reading: data })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: 'PDF generation failed' } }));
            throw new Error(errorData.error?.message || 'PDF generation failed');
        }

        // Get PDF as blob
        const pdfBlob = await response.blob();
        const url = URL.createObjectURL(pdfBlob);

        // Download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static async exportDiagramSVG(filename) {
        // Export hexagram as SVG
        const data = this.generateExportData();

        const response = await fetch(`${CONFIG.EXPORT_FUNCTION_URL}/export-diagram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'hexagram',
                data: {
                    lines: data.lines,
                    number: data.hexagram.number,
                    width: 300,
                    height: 350
                },
                format: 'svg'
            })
        });

        if (!response.ok) {
            throw new Error('Diagram export failed');
        }

        const svgContent = await response.text();
        this.downloadFile(`${filename}_hexagram.svg`, svgContent, 'image/svg+xml');
    }

    static async exportBaguaStrip(filename) {
        // Export bagua strip
        const response = await fetch(`${CONFIG.EXPORT_FUNCTION_URL}/export-diagram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'bagua',
                data: { width: 800, height: 80 },
                format: 'svg'
            })
        });

        if (!response.ok) {
            throw new Error('Bagua export failed');
        }

        const svgContent = await response.text();
        this.downloadFile(`${filename}_bagua.svg`, svgContent, 'image/svg+xml');
    }

    static async exportElementsChart(filename) {
        // Export elements chart
        const data = this.generateExportData();

        if (!data.equilibrium?.elements) {
            throw new Error('No elements data available');
        }

        const response = await fetch(`${CONFIG.EXPORT_FUNCTION_URL}/export-diagram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'elements',
                data: {
                    elements: data.equilibrium.elements,
                    width: 400,
                    height: 250
                },
                format: 'svg'
            })
        });

        if (!response.ok) {
            throw new Error('Elements chart export failed');
        }

        const svgContent = await response.text();
        this.downloadFile(`${filename}_elements.svg`, svgContent, 'image/svg+xml');
    }

    static captureHexagramSVG() {
        // Try to capture the hexagram visualization from the DOM
        const hexagramEl = document.getElementById('hexagram-display');
        if (hexagramEl) {
            // Return a simplified SVG representation
            const lines = this.currentReading?.lines || [];
            let svg = '<svg width="140" height="180" style="display: block; margin: 0 auto;">';
            lines.forEach((line, i) => {
                const y = 20 + (i * 25);
                if (line.isYang) {
                    svg += '<line x1="20" y1="' + y + '" x2="120" y2="' + y + '" stroke="#000" stroke-width="6"';
                    if (line.isChanging) svg += ' stroke-dasharray="8,4"';
                    svg += '/>';
                } else {
                    svg += '<line x1="20" y1="' + y + '" x2="50" y2="' + y + '" stroke="#000" stroke-width="6"/>';
                    svg += '<line x1="90" y1="' + y + '" x2="120" y2="' + y + '" stroke="#000" stroke-width="6"/>';
                }
            });
            svg += '</svg>';
            return svg;
        }
        return '';
    }

    static downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Helper: Get list of remedies selected in recent history
    static getRecentRemedies(minutes = 60) {
        try {
            const history = Storage.getJSON('iChingHistory') || [];
            if (!history.length) return [];

            const now = Date.now();
            const cutoff = now - (minutes * 60 * 1000);

            // Filter for recent readings with remedies
            const recent = history.filter(h =>
                h.requestTimestamp &&
                (new Date(h.requestTimestamp).getTime() > cutoff) &&
                h.interpretation?.remedies?.en?.remedies?.length > 0
            );

            // Extract unique remedy names including fulu, fuzhou, feng shui, bagua elixir herbs
            const remedyNames = new Set();
            recent.forEach(h => {
                const remedies = h.interpretation.remedies.en.remedies;
                remedies.forEach(r => {
                    const name = r.name?.en || r.name;
                    if (name && typeof name === 'string') {
                        remedyNames.add(name);
                    }
                });
            });

            return Array.from(remedyNames);
        } catch (e) {
            console.warn('Error fetching recent remedies:', e);
            return [];
        }
    }

    // Helper: Get list of remedies selected in recent history
    static getRecentRemedies(minutes = 60) {
        try {
            const history = Storage.getJSON('iChingHistory') || [];
            if (!history.length) return [];

            const now = Date.now();
            const cutoff = now - (minutes * 60 * 1000);

            // Filter for recent readings with remedies
            const recent = history.filter(h =>
                h.requestTimestamp &&
                (new Date(h.requestTimestamp).getTime() > cutoff) &&
                h.interpretation?.remedies?.en?.remedies?.length > 0
            );

            // Extract unique remedy names including fulu, fuzhou, feng shui, bagua elixir herbs
            const remedyNames = new Set();
            recent.forEach(h => {
                const remedies = h.interpretation.remedies.en.remedies;
                remedies.forEach(r => {
                    const name = r.name?.en || r.name;
                    if (name && typeof name === 'string') {
                        remedyNames.add(name);
                    }
                });
            });

            return Array.from(remedyNames);
        } catch (e) {
            console.warn('Error fetching recent remedies:', e);
            return [];
        }
    }

    // ============================================================================
    // CHINESE ASTROLOGY FUNCTIONS
    // ============================================================================

    /**
     * Get user's location for astrology calculations
     */
    static async getAstroLocation() {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });

            this.astroLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            console.log('[App] Location acquired:', this.astroLocation);
            alert('Location set successfully!');
        } catch (error) {
            console.warn('Geolocation failed:', error);
            this.astroLocation = { latitude: 40.7128, longitude: -74.0060 };
            alert('Using default location (New York). Enter birth time for accurate calculations.');
        }
    }

    // ============================================================================
    // LOADING OVERLAY WITH QUOTES CONTROLLER
    // ============================================================================

    static loadingOverlay = {
        overlay: null,
        quoteInterval: null,
        progressInterval: null,
        messageIndex: 0,
        isActive: false,
        processes: new Map(),

        init() {
            this.overlay = document.getElementById('loadingOverlay');
            if (!this.overlay) {
                console.warn('[LoadingOverlay] Overlay element not found');
                return;
            }
        },

        show() {
            if (!this.overlay) this.init();
            if (!this.overlay) return;

            this.isActive = true;
            this.processes.clear();
            this.messageIndex = 0;

            // Block body scroll
            document.body.classList.add('loading-active');

            // Clear any existing intervals
            this.clearIntervals();

            // Show overlay with fade in
            this.overlay.style.opacity = '0';
            this.overlay.style.display = 'flex';
            setTimeout(() => {
                this.overlay.style.opacity = '1';
            }, 10);

            // Start quote rotation (21-37 seconds random interval)
            this.rotateQuote();
            this.quoteInterval = setInterval(() => {
                this.rotateQuote();
            }, this.getRandomInterval());

            // Start progress animation
            this.updateProgress();
            this.progressInterval = setInterval(() => {
                this.updateProgress();
            }, 2000);

            // Add initial debug message
            this.logDebug('System initialized', 'info');

            console.log('[LoadingOverlay] Showed with quote rotation');
        },

        hide() {
            this.isActive = false;
            this.clearIntervals();

            // Unblock body scroll
            document.body.classList.remove('loading-active');

            if (this.overlay) {
                // Fade out effect
                this.overlay.style.opacity = '0';
                setTimeout(() => {
                    this.overlay.style.display = 'none';
                    this.overlay.style.opacity = '1';
                }, 300);
            }

            console.log('[LoadingOverlay] Hidden');
        },

        clearIntervals() {
            if (this.quoteInterval) {
                clearInterval(this.quoteInterval);
                this.quoteInterval = null;
            }
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
                this.progressInterval = null;
            }
        },

        getRandomInterval() {
            // Random interval between 21 and 37 seconds
            return Math.floor(Math.random() * (37000 - 21000 + 1)) + 21000;
        },

        rotateQuote() {
            if (!this.isActive) return;

            const lang = App.lang || 'en';
            const quote = getRandomQuote(lang);

            const chineseEl = document.getElementById('quoteChinese');
            const textEl = document.getElementById('quoteText');
            const sourceEl = document.getElementById('quoteSource');

            if (chineseEl && textEl && sourceEl) {
                // Fade out
                const container = document.querySelector('.quote-container');
                if (container) {
                    container.style.animation = 'none';
                    setTimeout(() => {
                        chineseEl.textContent = quote.chinese || '';
                        textEl.textContent = quote.text;
                        sourceEl.textContent = quote.source;
                        container.style.animation = 'quoteFade 0.8s ease';
                    }, 50);
                }
            }

            // Reset interval with new random time
            if (this.quoteInterval) {
                clearInterval(this.quoteInterval);
                this.quoteInterval = setInterval(() => {
                    this.rotateQuote();
                }, this.getRandomInterval());
            }
        },

        updateProgress() {
            if (!this.isActive) return;

            const lang = App.lang || 'en';
            const stepEl = document.getElementById('processStep');

            if (stepEl) {
                const message = getProcessMessage(lang, this.messageIndex);
                stepEl.textContent = message;
                this.logDebug(message, 'processing');
                this.messageIndex++;
            }

            // Update progress bar based on completed processes
            this.updateProgressBar();
        },

        updateProgressBar() {
            const fill = document.getElementById('progressFill');
            if (!fill) return;

            const totalProcesses = this.processes.size || 5;
            const completedProcesses = Array.from(this.processes.values()).filter(p => p.status === 'completed').length;
            const progress = Math.min((completedProcesses / totalProcesses) * 100, 95); // Cap at 95% until fully done

            fill.style.width = `${progress}%`;
        },

        addProcess(name, description) {
            this.processes.set(name, {
                name,
                description,
                status: 'pending',
                startTime: Date.now()
            });
            this.logDebug(`Started: ${description}`, 'new');
            this.updateProgressBar();
        },

        updateProcess(name, status, message = '') {
            const process = this.processes.get(name);
            if (process) {
                process.status = status;
                process.message = message;
                process.endTime = status === 'completed' ? Date.now() : null;

                const logMessage = message || `${process.description} - ${status}`;
                this.logDebug(logMessage, status);
                this.updateProgressBar();
            }
        },

        completeProcess(name) {
            this.updateProcess(name, 'completed');
        },

        failProcess(name, error) {
            this.updateProcess(name, 'error', error);
        },

        logDebug(message, type = 'info') {
            const container = document.getElementById('debugMessages');
            if (!container) return;

            const timestamp = new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const msgEl = document.createElement('div');
            msgEl.className = `debug-message ${type}`;
            msgEl.innerHTML = `<span class="debug-timestamp">${timestamp}</span>${message}`;

            container.appendChild(msgEl);
            container.scrollTop = container.scrollHeight;

            // Keep only last 20 messages
            while (container.children.length > 20) {
                container.removeChild(container.firstChild);
            }
        },

        setComplete() {
            const statusEl = document.getElementById('debugStatus');
            if (statusEl) {
                statusEl.textContent = '✓ Complete';
                statusEl.style.color = '#4CAF50';
            }

            const fill = document.getElementById('progressFill');
            if (fill) {
                fill.style.width = '100%';
            }

            this.logDebug('All processes completed successfully', 'completed');
        }
    };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
