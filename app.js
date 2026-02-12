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
        useAdvancedAstrology: false
    };
    static meditationTimer = null;
    static askAgainSource = null; // Tracks if current reading was invoked via "Ask Again"
    
    // Mobile detection
    static isMobile = window.matchMedia('(max-width: 767px)').matches;
    static isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    static currentFontSize = 20;
    static isHighContrast = false;

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

    static async init() {
        // Load data first
        this.hexagrams = await IChingCaster.fetchHexagramData();

        // Initialize UI
        document.getElementById('readingDate').valueAsDate = new Date();
        this.config.readingDate = new Date();

        // Load preferences
        const savedLang = Storage.get('yijingLang') || 'en';
        const savedContext = parseInt(Storage.get('contextMinutes'));

        if (!isNaN(savedContext)) {
            this.config.contextMinutes = savedContext;
            document.getElementById('contextMinutes').value = savedContext;
        }

        // Permanently select Oscuro Vacio (dark)
        this.applyTheme('dark');

        this.setLanguage(savedLang);
        this.renderJournal();
        
        // Initialize Feng Shui visual effects
        UI.initFengShui();
        UI.renderBaguaStrip();
        
        // Initialize mobile features
        this.initMobileFeatures();
        
        // Listen for resize events to update mobile state
        window.addEventListener('resize', () => {
            this.isMobile = window.matchMedia('(max-width: 767px)').matches;
        });
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

    static setLanguage(lang) {
        this.lang = lang;
        Storage.set('yijingLang', lang);

        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

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

        const input = document.getElementById('questionInput');
        if (input && I18N[lang]) input.placeholder = I18N[lang].questionPlaceholder || 'Enter your inquiry...';
        
        // Update dynamic content if reading exists
        if (this.currentReading) {
            const fullData = this.hexagrams.find(h => h.number === this.currentReading.hex.number);
            if (fullData) {
                // Re-render hexagram to update button labels
                UI.renderHexagram(this.currentReading.lines, this.currentReading.binaryKey, fullData);
                UI.renderChineseText(fullData, lang);
                UI.renderTranslation(fullData, lang, this.currentReading.interpretation);
            }
            
            // Check if we need to fetch translation for the new language
            const needsTranslation = lang !== 'en' && 
                this.currentReading.interpretation &&
                (this.currentReading.interpretation[lang]?.analysis === this.currentReading.interpretation.en?.analysis ||
                 !this.currentReading.interpretation[lang]?.analysis);
            
            if (needsTranslation) {
                // Trigger async translation
                this.fetchTranslationForLanguageChange(lang);
            } else if (this.currentReading.interpretation) {
                UI.renderAIInterpretation(this.currentReading.interpretation, lang);
            } else {
                UI.renderAILoading(lang);
            }
            
            UI.renderLunarMansion(this.currentReading.mansion, new Date(this.currentReading.requestTimestamp), lang);
            if (this.currentReading.lifePalace) {
                UI.renderLifePalace(this.currentReading.lifePalace, lang);
            }
            if (this.currentReading.equilibrium) {
                UI.renderEquilibrium(this.currentReading.equilibrium, lang);
                UI.renderElementsGrid(this.currentReading.equilibrium.elements, lang);
            }
        }
        
        // Update journal section
        this.renderJournal();
    }

    // Fetch translation when user changes language on an existing reading
    static async fetchTranslationForLanguageChange(targetLang) {
        if (!this.currentReading?.interpretation?.en) return;
        
        const t = I18N[targetLang] || I18N['en'];
        UI.renderAILoading(targetLang, t.translating || 'Translating...');
        
        try {
            const result = await this.translateToLanguage(
                this.currentReading.requestTimestamp,
                this.currentReading.interpretation,
                targetLang,
                `${this.currentReading.hex.name_en} (${this.currentReading.hex.name_zh})`
            );
            
            this.currentReading.interpretation = result;
            UI.renderAIInterpretation(result, targetLang);
            UI.hideAILoading(); // Hide Feng Shui loading overlay
            
            // Update storage with new translation
            const history = Storage.getJSON('iChingHistory');
            const idx = history.findIndex(h => h.requestTimestamp === this.currentReading.requestTimestamp);
            if (idx !== -1) {
                history[idx].interpretation = result;
                Storage.setJSON('iChingHistory', history);
            }
        } catch (e) {
            console.warn('[LANG_CHANGE] Translation failed:', e.message);
            // Still render with what we have
            UI.renderAIInterpretation(this.currentReading.interpretation, targetLang);
            UI.hideAILoading(); // Hide Feng Shui loading overlay
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
            // Ensure data is loaded
            if (!this.hexagrams || this.hexagrams.length === 0) {
                this.hexagrams = await IChingCaster.fetchHexagramData();
            }

            // Cast lines
            const cast = await IChingCaster.castLines();

            // Find hexagram
            const hex = IChingCaster.findHexagram(this.hexagrams, cast.binaryKey);

            // Calculate astrology
            const mansion = Astrology.getLunarMansion(this.config.readingDate);
            let lifePalaceData = null;

            if (this.config.useAdvancedAstrology) {
                const lunarDate = Astrology.getLunarDate(this.config.readingDate);
                const hourInfo = Astrology.getHourBranch(
                    this.config.readingTime.hour,
                    this.config.readingTime.minute,
                    this.config.ziMethod
                );
                const lifeNum = Astrology.calculateLifePalace(lunarDate.month, hourInfo.branch);
                const bodyNum = Astrology.calculateBodyPalace(lifeNum, hourInfo.branch);

                const dayStem = Astrology.getDayStem(
                    this.config.readingDate.getFullYear(),
                    this.config.readingDate.getMonth() + 1,
                    this.config.readingDate.getDate()
                );
                const hourStemNum = Astrology.calculateHourStem(dayStem, hourInfo.branch);
                const hourStem = HEAVENLY_STEMS[hourStemNum - 1];
                const hourBranch = EARTHLY_BRANCHES[hourInfo.branch - 1];

                lifePalaceData = {
                    lifeNum,
                    bodyNum,
                    hourPillar: hourStem + hourBranch
                };
            }

            // Analyze equilibrium
            const upper = TRIGRAMS[cast.binaryKey.substring(0, 3)];
            const lower = TRIGRAMS[cast.binaryKey.substring(3, 6)];
            const equilibrium = IChingCaster.analyzeEquilibrium(cast.lines, upper, lower);

            // Store reading
            const requestTimestamp = new Date().toISOString();
            this.currentReading = {
                hex,
                lines: cast.lines,
                binaryKey: cast.binaryKey,
                timestamp: cast.timestamp,
                requestTimestamp,
                mansion,
                lifePalace: lifePalaceData,
                equilibrium,
                question: this.currentQuestion,
                interpretation: null
            };

            // Render results
            UI.showStep(3);
            UI.renderHexagram(cast.lines, cast.binaryKey, hex);
            UI.renderLunarMansion(mansion, this.config.readingDate, this.lang);

            if (lifePalaceData) {
                UI.renderLifePalace(lifePalaceData, this.lang);
            }

            UI.renderEquilibrium(equilibrium, this.lang);
            UI.renderElementsGrid(equilibrium.elements, this.lang);

            // Fetch full data and AI
            const fullData = this.hexagrams.find(h => h.number === hex.number);
            if (fullData) {
                UI.renderChineseText(fullData, this.lang);
                UI.renderTranslation(fullData, this.lang);
            }

            // Save reading first (without AI interpretation)
            this.saveReading();
            this.renderJournal();
            
            // Fetch AI interpretation and update the saved reading
            await this.fetchAIInterpretation();

        } catch (e) {
            console.error(e);
            alert(`Casting failed: ${e.message}`);
            UI.showStep(1);
        }
    }

    static getContextForReading(currentReadingId, currentQuestion, includeFullDocuments = true) {
        const history = Storage.getJSON('iChingHistory');
        const now = Date.now();
        const timeCutoff = now - (this.config.contextMinutes * 60 * 1000);
        
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
            contextStr += `  Hexagram: ${h.hex?.number || 'unknown'} - ${h.hex?.name_en || ''} (${h.hex?.name_zh || ''})\n`;
            if (h.mansion) {
                contextStr += `  Lunar Mansion: ${h.mansion.name_en} (${h.mansion.name_zh}) - ${h.mansion.group}\n`;
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
            askAgainReading: askAgainReading
        };
    }
    
    static formatHistoricalReading(reading, index, isAskAgainSource = false) {
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
        formatted += `Hexagram: ${hex.number || 'N/A'} - ${hex.name_en || 'N/A'} (${hex.name_zh || 'N/A'})\n`;
        formatted += `Binary: ${reading.binaryKey || 'N/A'}\n`;
        
        // Line details
        if (lines.length === 6) {
            formatted += `\nLines (bottom to top):\n`;
            lines.forEach((line, i) => {
                const type = line.isYang ? 'Yang' : 'Yin';
                const status = line.isChanging ? 'MOVING' : 'Static';
                formatted += `  Line ${i + 1}: ${type} - ${status}\n`;
            });
        }
        
        // Lunar Mansion details
        if (mansion.num) {
            formatted += `\n--- LUNAR MANSION ---\n`;
            formatted += `Name: ${mansion.name_en} (${mansion.name_zh})\n`;
            formatted += `Number: ${mansion.num}/28\n`;
            formatted += `Group: ${mansion.group} (${mansion.group_zh})\n`;
            formatted += `Element: ${mansion.element || 'N/A'}\n`;
            formatted += `Animal: ${mansion.animal || 'N/A'}\n`;
            formatted += `Degrees: ${mansion.degrees || 'N/A'}°\n`;
        }
        
        // Life Palace details
        if (reading.lifePalace) {
            formatted += `\n--- LIFE PALACE (Zi Wei) ---\n`;
            formatted += `Life Palace: ${reading.lifePalace.lifeNum ? EARTHLY_BRANCHES[reading.lifePalace.lifeNum - 1] : 'N/A'}\n`;
            formatted += `Body Palace: ${reading.lifePalace.bodyNum ? EARTHLY_BRANCHES[reading.lifePalace.bodyNum - 1] : 'N/A'}\n`;
            if (reading.lifePalace.hourPillar) {
                formatted += `Hour Pillar: ${reading.lifePalace.hourPillar}\n`;
            }
        }
        
        // Five Elements analysis
        if (reading.equilibrium) {
            formatted += `\n--- FIVE ELEMENTS ANALYSIS ---\n`;
            formatted += `Yin-Yang: ${reading.equilibrium.yangCount} Yang, ${reading.equilibrium.yinCount} Yin (${reading.equilibrium.balanceState})\n`;
            formatted += `Stability: ${reading.equilibrium.stabilityState} (${reading.equilibrium.movingCount} moving lines)\n`;
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
            const enInterp = interpretation.en || {};
            if (enInterp.celestial) formatted += `Celestial Guidance: ${enInterp.celestial}\n`;
            if (enInterp.elements) formatted += `Five Elements: ${enInterp.elements}\n`;
            if (enInterp.analysis) formatted += `Analysis: ${enInterp.analysis}\n`;
            if (enInterp.advice) formatted += `Advice: ${enInterp.advice}\n`;
            if (enInterp.symbolism) formatted += `Symbolism: ${enInterp.symbolism}\n`;
            if (enInterp.movingLines) formatted += `Moving Lines: ${enInterp.movingLines}\n`;
        }
        
        formatted += `[HISTORICAL_READING_${index}_END]\n`;
        
        return formatted;
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
        
        // Build the base request body for modular endpoints
        const baseRequest = {
            question: this.currentQuestion,
            hexagram: {
                number: hex.number,
                name_en: hex.name_en,
                name_zh: hex.name_zh
            },
            lines: lines.map(l => ({
                isYang: l.isYang,
                isChanging: l.isChanging
            })),
            binaryKey: this.currentReading.binaryKey,
            mansion: mansion ? {
                num: mansion.num,
                name_en: mansion.name_en,
                name_zh: mansion.name_zh,
                group: mansion.group,
                element: mansion.element,
                animal: mansion.animal
            } : undefined,
            lifePalace: lifePalace ? {
                lifeNum: lifePalace.lifeNum,
                bodyNum: lifePalace.bodyNum,
                hourPillar: lifePalace.hourPillar
            } : undefined,
            equilibrium: equilibrium ? {
                yangCount: equilibrium.yangCount,
                yinCount: equilibrium.yinCount,
                balanceState: equilibrium.balanceState,
                movingCount: equilibrium.movingCount
            } : undefined,
            lang: this.lang,
            historyAnalysis: contextData.historyAnalysis,
            askAgainSource: this.askAgainSource
        };

        // STRATEGY 1: Try the modular endpoint first (all sections in parallel on server)
        // This is the most efficient - single request, parallel processing
        let result = null;
        let error = null;
        const t = I18N[this.lang] || I18N['en'];

        try {
            console.log('[AI] Trying /interpret-modular (parallel sections)...');
            UI.renderAILoading(this.lang, t.consulting || 'Consulting oracle...');
            
            result = await this.callInterpretEndpoint('/interpret-modular', baseRequest, 45000);
            console.log('[AI] /interpret-modular succeeded');
        } catch (e) {
            console.warn('[AI] /interpret-modular failed:', e.message);
            error = e;
        }
        
        // STRATEGY 2: If modular failed, try fetching sections individually in parallel
        if (!result) {
            console.log('[AI] Trying parallel section fetching...');
            UI.renderAILoading(this.lang, t.gatheringWisdom || 'Gathering wisdom...');
            
            try {
                result = await this.fetchModularSectionsParallel(baseRequest);
                console.log('[AI] Parallel sections succeeded');
            } catch (e) {
                console.warn('[AI] Parallel sections failed:', e.message);
                error = e;
            }
        }

        // STRATEGY 3: Fallback to simple endpoint
        if (!result) {
            try {
                console.log('[AI] Trying /interpret-simple...');
                UI.renderAILoading(this.lang, t.focusingQuery || 'Focusing query...');
                result = await this.callInterpretEndpoint('/interpret-simple', baseRequest, 25000);
                console.log('[AI] /interpret-simple succeeded');
            } catch (e) {
                console.warn('[AI] /interpret-simple failed:', e.message);
                error = e;
            }
        }

        // STRATEGY 4: Final fallback to legacy
        if (!result) {
            try {
                console.log('[AI] Trying /interpret (legacy)...');
                UI.renderAILoading(this.lang, t.usingTraditional || 'Using traditional method...');
                result = await this.callInterpretEndpoint('/interpret', baseRequest, 60000);
                console.log('[AI] /interpret succeeded');
            } catch (e) {
                console.error('[AI] All endpoints failed:', e.message);
                error = e;
            }
        }

        // Handle result
        if (result) {
            this.ensureInterpretationStructure(result);
            
            // Clear old caches periodically
            this.clearOldTranslationCaches();
            
            // If we only have English content, translate to SELECTED language only
            const needsTranslation = this.lang !== 'en' && 
                (result[this.lang]?.analysis === result.en?.analysis || !result[this.lang]?.analysis);
            
            if (needsTranslation && result.en?.analysis) {
                const t = I18N[this.lang] || I18N['en'];
                console.log(`[AI] Translation needed for ${this.lang}`);
                UI.renderAILoading(this.lang, t.translating || 'Translating...');
                
                try {
                    result = await this.translateToLanguage(
                        this.currentReading.requestTimestamp,
                        result,
                        this.lang,
                        `${this.currentReading.hex.name_en} (${this.currentReading.hex.name_zh})`
                    );
                } catch (e) {
                    console.warn('[AI] Translation failed:', e.message);
                    // Continue with what we have
                }
            }
            
            this.currentReading.interpretation = result;
            UI.renderAIInterpretation(result, this.lang);
            UI.hideAILoading(); // Hide Feng Shui loading overlay
            
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
        } else {
            // All attempts failed - use fallback
            console.error('[AI] All interpretation endpoints failed, using fallback');
            const fallbackResult = this.createFallbackInterpretation();
            this.currentReading.interpretation = fallbackResult;
            UI.renderAIInterpretation(fallbackResult, this.lang);
            UI.hideAILoading(); // Hide Feng Shui loading overlay
            UI.showError(`Interpretation service temporarily unavailable. Using offline fallback. (${error?.message || 'Unknown error'})`);
        }
    }

    // Fetch interpretation sections in parallel (client-side composition)
    static async fetchModularSectionsParallel(baseRequest) {
        console.log('[AI:MODULAR] Fetching sections in parallel...');
        
        const sections = ['celestial', 'elements', 'core', 'lines', 'classical'];
        const timeoutMs = 15000; // 15s per section
        
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
        
        // If we have all sections, compose them
        if (failedSections.length === 0) {
            console.log('[AI:MODULAR] All sections fetched, composing...');
            return await this.composeSections(sectionsData);
        }
        
        // If some sections failed but we have core and at least 2 others, try to compose anyway
        if (sectionsData.core && Object.keys(sectionsData).length >= 3) {
            console.log('[AI:MODULAR] Partial sections, attempting compose with fallbacks...');
            // Fill in missing sections with empty data
            sections.forEach(s => {
                if (!sectionsData[s]) {
                    sectionsData[s] = this.getEmptySection(s);
                }
            });
            return await this.composeSections(sectionsData);
        }
        
        throw new Error(`Failed to fetch required sections: ${failedSections.join(', ')}`);
    }

    // Fetch a single section
    static async fetchSection(section, baseRequest, timeoutMs) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            const response = await fetch(`${CONFIG.SUPABASE_FUNCTION_URL}/interpret-section`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...baseRequest, section }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'API error');
            }
            
            return data.data;
        } catch (e) {
            clearTimeout(timeoutId);
            throw e;
        }
    }

    // Get empty section structure for fallback
    static getEmptySection(section) {
        switch (section) {
            case 'celestial':
                return { lunarMansion: { description: "", influence: "", guidance: "" }, lifePalace: { description: "", impact: "" }, celestial: "" };
            case 'elements':
                return { composition: "", trigramRelationship: "", yinYangAnalysis: "", recommendations: "", elements: "" };
            case 'core':
                return { analysis: "", advice: "", symbolism: "" };
            case 'lines':
                return { movingLines: "", lineTexts: ["", "", "", "", "", ""] };
            case 'classical':
                return {
                    judgment: { en: "", es: "", it: "", zh: "" },
                    image: { en: "", es: "", it: "", zh: "" },
                    lines: { en: ["", "", "", "", "", ""], es: ["", "", "", "", "", ""], it: ["", "", "", "", "", ""], zh: ["", "", "", "", "", ""] }
                };
            default:
                return {};
        }
    }

    // Compose sections into final interpretation format
    static async composeSections(sectionsData) {
        console.log('[AI:MODULAR] Calling compose endpoint...');
        console.log('[AI:MODULAR] Sending classical data:', {
            judgment: {
                en: sectionsData.classical?.judgment?.en?.substring(0, 50),
                es: sectionsData.classical?.judgment?.es?.substring(0, 50),
                it: sectionsData.classical?.judgment?.it?.substring(0, 50),
                zh: sectionsData.classical?.judgment?.zh?.substring(0, 50)
            }
        });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            const response = await fetch(`${CONFIG.SUPABASE_FUNCTION_URL}/interpret-compose`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    celestial: sectionsData.celestial,
                    elements: sectionsData.elements,
                    core: sectionsData.core,
                    lines: sectionsData.lines,
                    classical: sectionsData.classical,
                    lang: this.lang
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                // If compose fails, do client-side composition
                console.log('[AI:MODULAR] Compose endpoint failed, using client-side composition');
                return this.clientSideCompose(sectionsData);
            }
            
            const data = await response.json();
            if (!data.success) {
                return this.clientSideCompose(sectionsData);
            }
            
            console.log('[AI:MODULAR] Compose result:', {
                es: data.interpretation?.es?.judgment?.substring(0, 50),
                it: data.interpretation?.it?.judgment?.substring(0, 50)
            });
            
            return data.interpretation;
        } catch (e) {
            clearTimeout(timeoutId);
            console.log('[AI:MODULAR] Compose error, using client-side composition:', e.message);
            return this.clientSideCompose(sectionsData);
        }
    }

    // Client-side composition fallback
    static clientSideCompose(sectionsData) {
        console.log('[AI:MODULAR] Performing client-side composition...');
        console.log('[AI:MODULAR] Classical data in clientSideCompose:', {
            judgment: {
                en: sectionsData.classical?.judgment?.en?.substring(0, 50),
                es: sectionsData.classical?.judgment?.es?.substring(0, 50),
                it: sectionsData.classical?.judgment?.it?.substring(0, 50)
            }
        });
        
        const { celestial, elements, core, lines, classical } = sectionsData;
        const result = { en: {}, es: {}, it: {}, zh: {} };
        
        ['en', 'es', 'it', 'zh'].forEach(lang => {
            result[lang] = {
                celestial: celestial?.celestial || "",
                elements: elements?.elements || "",
                analysis: core?.analysis || "",
                advice: core?.advice || "",
                symbolism: core?.symbolism || "",
                movingLines: lines?.movingLines || "",
                judgment: classical?.judgment?.[lang] || classical?.judgment?.en || "",
                image: classical?.image?.[lang] || classical?.image?.en || "",
                lines: classical?.lines?.[lang] || classical?.lines?.en || ["", "", "", "", "", ""]
            };
        });
        
        console.log('[AI:MODULAR] clientSideCompose result:', {
            es: result.es?.judgment?.substring(0, 50),
            it: result.it?.judgment?.substring(0, 50)
        });
        
        return result;
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
        // Increase timeout to 45 seconds for translation
        const timeoutId = setTimeout(() => {
            console.warn(`[TRANSLATE] Timeout for ${targetLang}, aborting...`);
            controller.abort();
        }, 45000);
        
        try {
            const response = await fetch(`${CONFIG.SUPABASE_FUNCTION_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: baseContent,
                    targetLang,
                    hexagramName
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Translation failed');
            }
            
            // Cache the result
            this.saveTranslationCache(readingId, targetLang, data.translated);
            
            return data.translated;
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
        // Skip if English or already has translation different from English
        if (targetLang === 'en') return result;
        if (result[targetLang]?.analysis && result[targetLang].analysis !== result.en.analysis) {
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
            celestial: result.en.celestial,
            elements: result.en.elements,
            analysis: result.en.analysis,
            advice: result.en.advice,
            symbolism: result.en.symbolism,
            movingLines: result.en.movingLines
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
                celestial: translated.celestial,
                elements: translated.elements,
                analysis: translated.analysis,
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
            const response = await fetch(`${CONFIG.SUPABASE_FUNCTION_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'API returned unsuccessful response');
            }

            return data.interpretation;
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
        const timeCutoff = Date.now() - (this.config.contextMinutes * 60 * 1000);
        
        return history.filter(h => 
            h.requestTimestamp !== currentReadingId && 
            h.requestTimestamp &&
            new Date(h.requestTimestamp).getTime() > timeCutoff
        ).length;
    }

    // Get last question for context (compact history)
    static getLastQuestion(currentReadingId) {
        const history = Storage.getJSON('iChingHistory');
        const timeCutoff = Date.now() - (this.config.contextMinutes * 60 * 1000);
        
        const recent = history
            .filter(h => h.requestTimestamp !== currentReadingId && h.requestTimestamp)
            .filter(h => new Date(h.requestTimestamp).getTime() > timeCutoff)
            .slice(0, 1)[0];
        
        return recent ? recent.questionText : null;
    }

    // Safety check to ensure interpretation has all required fields
    static ensureInterpretationStructure(result) {
        const emptyLines = ["", "", "", "", "", ""];
        const langs = ['en', 'es', 'it', 'zh'];
        const keys = ['celestial', 'elements', 'analysis', 'advice', 'symbolism', 'movingLines', 'judgment', 'image'];
        
        langs.forEach(lang => {
            if (!result[lang]) {
                result[lang] = result.en || {};
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
        history.unshift(readingToSave);
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

        this.currentQuestion = reading.questionText;
        this.currentReading = reading;

        document.getElementById('questionInput').value = reading.questionText;
        
        // Switch to oracle tab
        this.switchMainTab('oracle');

        UI.showStep(3);
        UI.renderHexagram(reading.lines, reading.binaryKey, reading.hex);

        if (reading.mansion) {
            UI.renderLunarMansion(reading.mansion, new Date(reading.requestTimestamp), this.lang);
        }
        if (reading.lifePalace) {
            UI.renderLifePalace(reading.lifePalace, this.lang);
        }
        if (reading.equilibrium) {
            UI.renderEquilibrium(reading.equilibrium, this.lang);
            UI.renderElementsGrid(reading.equilibrium.elements, this.lang);
        }

        // Restore text
        const fullData = this.hexagrams.find(h => h.number === reading.hex.number);
        if (fullData) {
            UI.renderChineseText(fullData, this.lang);
            UI.renderTranslation(fullData, this.lang, reading.interpretation);
        }

        if (reading.interpretation) {
            // Check if we have cached translations for current language
            let interpretation = reading.interpretation;
            
            // If current language is not English and translation is missing/same as English
            if (this.lang !== 'en' && interpretation[this.lang]?.analysis === interpretation.en?.analysis) {
                const cached = this.getCachedTranslation(reading.requestTimestamp, this.lang);
                if (cached) {
                    console.log(`[RESTORE] Using cached ${this.lang} translation`);
                    interpretation = {
                        ...interpretation,
                        [this.lang]: {
                            ...interpretation[this.lang],
                            celestial: cached.celestial,
                            elements: cached.elements,
                            analysis: cached.analysis,
                            advice: cached.advice,
                            symbolism: cached.symbolism,
                            movingLines: cached.movingLines
                        }
                    };
                } else {
                    console.log(`[RESTORE] No cached translation for ${this.lang}, using English`);
                }
            }
            
            UI.renderAIInterpretation(interpretation, this.lang);
            UI.hideAILoading(); // Hide Feng Shui loading overlay
        }
    }

    static newReading() {
        document.getElementById('questionInput').value = '';
        this.currentQuestion = '';
        this.currentReading = null;
        this.askAgainSource = null; // Reset ask again source
        document.getElementById('meditation-overlay').classList.remove('active');
        if (this.meditationTimer) clearInterval(this.meditationTimer);
        UI.showStep(1);
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
    }

    static toggleFiveElementsInfo() {
        const msgs = {
                    en: "Five Elements (Wu Xing):\n\u6728 Wood - Growth\n\u706b Fire - Energy\n\u571f Earth - Stability\n\u91d1 Metal - Structure\n\u6c34 Water - Wisdom",
                    zh: "\u4e94\u884c\uff1a\n\u6728 - \u751f\u957f\n\u706b - \u80fd\u91cf\n\u571f - \u7a33\u5b9a\n\u91d1 - \u7ed3\u6784\n\u6c34 - \u667a\u6167",
                    es: "Cinco Elementos:\n\u6728 Madera - Crecimiento\n\u706b Fuego - Energ\u00eda\n\u571f Tierra - Estabilidad\n\u91d1 Metal - Estructura\n\u6c34 Agua - Sabidur\u00eda",
                    it: "Cinque Elementi:\n\u6728 Legno - Crescita\n\u706b Fuoco - Energia\n\u571f Terra - Stabilit\u00e0\n\u91d1 Metallo - Struttura\n\u6c34 Acqua - Saggezza"        };
        alert(msgs[this.lang]);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
