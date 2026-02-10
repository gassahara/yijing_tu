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

    static async init() {
        // Load data first
        this.hexagrams = await IChingCaster.fetchHexagramData();

        // Initialize UI
        document.getElementById('readingDate').valueAsDate = new Date();
        this.config.readingDate = new Date();

        // Load preferences
        const savedLang = Storage.get('yijingLang') || 'en';
        const savedContext = parseInt(Storage.get('contextMinutes'));
        const savedTheme = Storage.get('yijingTheme') || 'dark';

        if (!isNaN(savedContext)) {
            this.config.contextMinutes = savedContext;
            document.getElementById('contextMinutes').value = savedContext;
        }

        this.applyTheme(savedTheme);
        document.getElementById('elementTheme').value = savedTheme;

        this.setLanguage(savedLang);
        this.renderJournal();
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
            // Show loading if interpretation not yet loaded, otherwise show interpretation
            if (this.currentReading.interpretation) {
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

    static startConsultation() {
        const txt = document.getElementById('questionInput').value.trim();
        if (!txt) {
            alert(I18N[this.lang].questionPlaceholder);
            return;
        }

        this.currentQuestion = txt;
        this.saveQuestion(txt);
        
        // Show meditation overlay
        const overlay = document.getElementById('meditation-overlay');
        overlay.classList.add('active');
        
        // Meditation timer (25-45 seconds)
        let timeLeft = Math.floor(Math.random() * 21) + 25;
        const disp = document.getElementById('meditation-timer');
        disp.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;

        if (this.meditationTimer) clearInterval(this.meditationTimer);
        this.meditationTimer = setInterval(() => {
            timeLeft--;
            disp.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
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

    static getRecentContext(currentReadingId) {
        const history = Storage.getJSON('iChingHistory');
        const now = Date.now();
        const cutoff = now - (this.config.contextMinutes * 60 * 1000);

        const relevant = history.filter(h => {
            const ts = new Date(h.requestTimestamp).getTime();
            return ts > cutoff && h.interpretation && h.requestTimestamp !== currentReadingId;
        });

        if (relevant.length === 0) return { text: "", count: 0 };

        let contextStr = `\n[CONTEXT - Last ${this.config.contextMinutes} minutes]\n`;
        relevant.forEach((h, i) => {
            contextStr += `Reading ${i + 1}: "${h.questionText}" - Hexagram ${h.hex?.number || 'unknown'}\n`;
        });
        contextStr += "[END CONTEXT]\n";
        return { text: contextStr, count: relevant.length };
    }

    static async fetchAIInterpretation() {
        try {
            const hex = this.currentReading.hex;
            const lines = this.currentReading.lines;
            const readingId = this.currentReading.requestTimestamp;

            // Show loading state
            ['en', 'es', 'it', 'zh'].forEach(lang => {
                const container = document.getElementById(`interpretation-${lang}`);
                if (container) container.innerHTML = '<div class="loading"></div> Loading...';
            });

            // Get context from recent readings
            const { text: contextBlock, count: contextCount } = this.getRecentContext(readingId);

            // Build line analysis
            let lineAnalysis = "\nLINE ANALYSIS:";
            const changingLines = [];
            lines.forEach((line, i) => {
                const type = line.isYang ? 'Yang' : 'Yin';
                const status = line.isChanging ? 'MOVING (Changing)' : 'Static';
                lineAnalysis += `\nLine ${i + 1}: ${type} - ${status}`;
                if (line.isChanging) {
                    changingLines.push(i + 1);
                }
            });

            // Build astro context
            let astroContext = "";
            if (this.currentReading.mansion) {
                astroContext += `\nLUNAR MANSION: ${this.currentReading.mansion.name_en} (${this.currentReading.mansion.name_zh}) - ${this.currentReading.mansion.group}, ${this.currentReading.mansion.element} element`;
            }
            if (this.currentReading.lifePalace) {
                astroContext += `\nLIFE PALACE: ${this.currentReading.lifePalace.hourPillar || 'N/A'}`;
            }

            // Get full hexagram data for missing translations
            const fullData = this.hexagrams.find(h => h.number === hex.number);
            let missingTranslations = "";
            const missingFields = { es: [], it: [], zh: [] };
            
            if (fullData) {
                ['es', 'it', 'zh'].forEach(lang => {
                    if (!fullData[`judgment_${lang}`]) {
                        missingFields[lang].push('judgment');
                    }
                    if (!fullData.image?.[`image_${lang}`]) {
                        missingFields[lang].push('image');
                    }
                    if (!fullData[`lines_${lang}`] || !fullData[`lines_${lang}`].length) {
                        missingFields[lang].push('lines');
                    }
                    if (missingFields[lang].length > 0) {
                        missingTranslations += `\nMissing ${lang.toUpperCase()}: ${missingFields[lang].join(', ')}`;
                    }
                });
            }

            const systemPrompt = `You are an advanced I Ching (Yi Jing) oracle interpreter.

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no explanations.

Format:
{
  "en": {"celestial": "text", "elements": "text", "analysis": "text", "advice": "text", "symbolism": "text", "movingLines": "text", "judgment": "text", "image": "text", "lines": ["l1","l2","l3","l4","l5","l6"]},
  "es": {"celestial": "text", "elements": "text", "analysis": "text", "advice": "text", "symbolism": "text", "movingLines": "text", "judgment": "text", "image": "text", "lines": ["l1","l2","l3","l4","l5","l6"]},
  "it": {"celestial": "text", "elements": "text", "analysis": "text", "advice": "text", "symbolism": "text", "movingLines": "text", "judgment": "text", "image": "text", "lines": ["l1","l2","l3","l4","l5","l6"]},
  "zh": {"celestial": "text", "elements": "text", "analysis": "text", "advice": "text", "symbolism": "text", "movingLines": "text", "judgment": "text", "image": "text", "lines": ["l1","l2","l3","l4","l5","l6"]}
}

All text fields must be strings. "lines" must be an array of exactly 6 strings (line commentaries for lines 1-6).
Provide complete translations for ALL languages, especially those marked as missing in the user prompt.`;

            const userPrompt = `${contextBlock}QUESTION: "${this.currentQuestion}"
HEXAGRAM ${hex.number}: ${hex.name_en} (${hex.name_zh || ''})
BINARY: ${lines.map(l => l.isYang ? '1' : '0').reverse().join('')}
${lineAnalysis}
${astroContext}
${missingTranslations || "\nProvide complete hexagram text translations for all 4 languages."}

INSTRUCTIONS:
1. Provide detailed readings (celestial, elements, analysis, advice, symbolism, movingLines) for ALL 4 LANGUAGES
2. ALSO provide hexagram TEXT translations: "judgment" (hexagram statement), "image" (xiang text), and "lines" array with 6 line commentaries
3. Each section should be 2-3 sentences
4. Ensure "lines" array has exactly 6 entries (one for each line 1-6)`;

            const response = await fetch(CONFIG.DEEPSEEK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.DEEPSEEK_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 4000
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            const content = data.choices[0].message.content;

            let result;
            try {
                // Try to extract JSON from code block first
                let jsonStr = null;
                const codeBlockMatch = content.match(/```json\s*([\s\S]*?)(?:```|$)/);
                if (codeBlockMatch) {
                    jsonStr = codeBlockMatch[1].trim();
                } else {
                    // Find JSON by looking for the outermost braces
                    const startIdx = content.indexOf('{');
                    const endIdx = content.lastIndexOf('}');
                    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                        jsonStr = content.substring(startIdx, endIdx + 1);
                    }
                }
                
                if (!jsonStr) jsonStr = content.trim();
                
                // Check if JSON appears truncated (unclosed braces)
                const openBraces = (jsonStr.match(/\{/g) || []).length;
                const closeBraces = (jsonStr.match(/\}/g) || []).length;
                const openBrackets = (jsonStr.match(/\[/g) || []).length;
                const closeBrackets = (jsonStr.match(/\]/g) || []).length;
                
                // Add missing closing braces/brackets
                while (closeBraces < openBraces) {
                    jsonStr += '}';
                }
                while (closeBrackets < openBrackets) {
                    jsonStr += ']';
                }
                
                // Clean up common JSON issues but preserve structure
                jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
                
                result = JSON.parse(jsonStr);

                // FIX: Ensure all language keys exist with fallback
                if (!result.en) result.en = result;
                ['en', 'es', 'it', 'zh'].forEach(lang => {
                    if (!result[lang]) result[lang] = result.en || {};
                });

                // FIX: Ensure all section values are strings (not objects), except lines which is an array
                ['en', 'es', 'it', 'zh'].forEach(lang => {
                    if (result[lang]) {
                        // Stringify all text fields
                        ['celestial', 'elements', 'analysis', 'advice', 'symbolism', 'movingLines', 'judgment', 'image'].forEach(key => {
                            if (result[lang][key] && typeof result[lang][key] === 'object') {
                                result[lang][key] = JSON.stringify(result[lang][key]);
                            }
                            if (!result[lang][key]) result[lang][key] = "";
                        });
                        // Handle lines array separately - must be array of strings
                        if (!result[lang].lines) {
                            result[lang].lines = [];
                        } else if (typeof result[lang].lines === 'string') {
                            // If lines came as a string, try to parse it
                            try {
                                const parsed = JSON.parse(result[lang].lines);
                                result[lang].lines = Array.isArray(parsed) ? parsed : [];
                            } catch (e) {
                                result[lang].lines = [];
                            }
                        } else if (!Array.isArray(result[lang].lines)) {
                            result[lang].lines = [];
                        }
                        // Ensure each line is a string
                        result[lang].lines = result[lang].lines.map(l => String(l || ''));
                    }
                });
            } catch (e) {
                console.error('JSON parse error:', e, 'Content:', content.substring(0, 300));
                // Create fallback structure from raw content
                const truncatedContent = content.replace(/```json\s*|\s*```/g, '').substring(0, 500);
                result = {
                    en: { celestial: "", elements: "", analysis: truncatedContent, advice: "", symbolism: "", movingLines: "" },
                    es: { celestial: "", elements: "", analysis: "Ver análisis en inglés", advice: "", symbolism: "", movingLines: "" },
                    it: { celestial: "", elements: "", analysis: "Vedi analisi in inglese", advice: "", symbolism: "", movingLines: "" },
                    zh: { celestial: "", elements: "", analysis: "见英文分析", advice: "", symbolism: "", movingLines: "" }
                };
            }

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

        } catch (e) {
            console.error('AI Error:', e);
            const result = this.createFallbackInterpretation();
            this.currentReading.interpretation = result;
            UI.renderAIInterpretation(result, this.lang);
        }
    }

    static createFallbackInterpretation() {
        const t = I18N[this.lang] || I18N['en'];
        const fallbackText = "Interpretation unavailable";
        return {
            en: { celestial: fallbackText, elements: "", analysis: fallbackText, advice: "", symbolism: "", movingLines: "" },
            es: { celestial: fallbackText, elements: "", analysis: "Interpretación no disponible", advice: "", symbolism: "", movingLines: "" },
            it: { celestial: fallbackText, elements: "", analysis: "Interpretazione non disponibile", advice: "", symbolism: "", movingLines: "" },
            zh: { celestial: fallbackText, elements: "", analysis: "解读不可用", advice: "", symbolism: "", movingLines: "" }
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
        history.unshift({
            ...this.currentReading,
            questionText: this.currentQuestion
        });
        if (history.length > 100) history.length = 100;
        Storage.setJSON('iChingHistory', history);
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
                return `<li class="question-item" data-question-id="${q.id}" data-question-name="${escapedName}">${q.name}</li>`;
            }).join('');
            
            // Add click handlers
            qList.querySelectorAll('.question-item').forEach(item => {
                item.onclick = () => {
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
                return `
                <div class="history-card" data-history-idx="${idx}" data-timestamp="${timestamp}">
                    <h4>${h.hex?.number || '?'}. ${hexName}</h4>
                    <p style="font-style: italic;">${h.questionText || ''}</p>
                    ${h.mansion ? `<p style="font-size: 0.85em; color: var(--water);">🌙 ${mansionName}</p>` : ''}
                    ${date ? `<p style="font-size: 0.8em; opacity: 0.7;">${date}</p>` : ''}
                </div>
            `}).join('');
            
            // Add click handlers
            hGrid.querySelectorAll('.history-card').forEach(card => {
                card.onclick = () => {
                    const timestamp = card.dataset.timestamp;
                    App.restoreReading(timestamp);
                };
            });
        }
    }

    static selectQuestion(id, name) {
        document.getElementById('questionInput').value = name;
        this.switchMainTab('oracle');
        UI.showStep(1);
    }

    static restoreReading(timestamp) {
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
            UI.renderAIInterpretation(reading.interpretation, this.lang);
        }
    }

    static newReading() {
        document.getElementById('questionInput').value = '';
        this.currentQuestion = '';
        this.currentReading = null;
        document.getElementById('meditation-overlay').classList.remove('active');
        if (this.meditationTimer) clearInterval(this.meditationTimer);
        UI.showStep(1);
    }

    static continueQuestion() {
        if (this.meditationTimer) clearInterval(this.meditationTimer);
        document.getElementById('meditation-overlay').classList.remove('active');
        this.startConsultation();
    }

    static switchMainTab(tabName) {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-btn-${tabName}`).classList.add('active');
        document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
    }

    static toggleFiveElementsInfo() {
        const msgs = {
            en: "Five Elements (Wu Xing):\n🌳 Wood - Growth\n🔥 Fire - Energy\n🏔️ Earth - Stability\n⚡ Metal - Structure\n💧 Water - Wisdom",
            zh: "五行：\n🌳 木 - 生长\n🔥 火 - 能量\n🏔️ 土 - 稳定\n⚡ 金 - 结构\n💧 水 - 智慧",
            es: "Cinco Elementos:\n🌳 Madera - Crecimiento\n🔥 Fuego - Energía\n🏔️ Tierra - Estabilidad\n⚡ Metal - Estructura\n💧 Agua - Sabiduría",
            it: "Cinque Elementi:\n🌳 Legno - Crescita\n🔥 Fuoco - Energia\n🏔️ Terra - Stabilità\n⚡ Metallo - Struttura\n💧 Acqua - Saggezza"
        };
        alert(msgs[this.lang]);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
