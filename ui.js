class UI {
    // ============================================
    // FORMATTING UTILITIES - Proper Names & Badges
    // ============================================

    /**
     * Format an element with badge styling
     * @param {string} element - Element name (wood, fire, earth, metal, water)
     * @param {string} lang - Language code
     * @param {Object} options - Options { showZh: boolean, capitalize: boolean }
     * @returns {string} HTML string with badge
     */
    static formatElementBadge(element, lang = 'en', options = {}) {
        const { showZh = true, capitalize = true } = options;
        const t = I18N[lang] || I18N['en'];

        const elementMap = {
            wood: { zh: '木', color: 'wood' },
            fire: { zh: '火', color: 'fire' },
            earth: { zh: '土', color: 'earth' },
            metal: { zh: '金', color: 'metal' },
            water: { zh: '水', color: 'water' }
        };

        const el = element?.toLowerCase() || '';
        const data = elementMap[el];
        if (!data) return element;

        const name = t[el] || element;
        const displayName = capitalize ? name.charAt(0).toUpperCase() + name.slice(1) : name;
        const zhChar = showZh ? `<span class="zh">${data.zh}</span>` : '';

        return `<span class="element-badge ${data.color}">${displayName}${zhChar}</span>`;
    }

    /**
     * Format a trigram with badge styling
     * @param {Object} trigram - Trigram object with name, zh, element
     * @param {string} lang - Language code
     * @returns {string} HTML string with badge
     */
    static formatTrigramBadge(trigram, lang = 'en') {
        if (!trigram) return '';
        const t = I18N[lang] || I18N['en'];
        const name = trigram['name_' + lang] || trigram.name || trigram.name_en;
        const zh = trigram.zh || '';
        const element = (trigram.element || '').toLowerCase();

        const elementToTrigram = {
            wood: 'wind', fire: 'fire', earth: 'earth',
            metal: 'heaven', water: 'water'
        };

        // Map trigram names to their proper bagua names
        const nameMap = {
            'heaven': 'heaven', 'lake': 'lake', 'fire': 'fire', 'thunder': 'thunder',
            'wind': 'wind', 'water': 'water', 'mountain': 'mountain', 'earth': 'earth'
        };

        const baguaName = nameMap[name.toLowerCase()] || elementToTrigram[element] || 'earth';

        return `<span class="trigram-badge ${baguaName}"><span class="symbol">${zh}</span> ${name}</span>`;
    }

    /**
     * Format a BaZi stem with badge styling
     * @param {Object} stem - Stem object with zh, name, element
     * @param {string} lang - Language code
     * @returns {string} HTML string with badge
     */
    static formatStemBadge(stem, lang = 'en') {
        if (!stem) return '';
        const zh = stem.zh || '';
        const name = stem.name || '';
        const element = stem.element || '';

        return `<span class="stem-badge" title="${name} ${element}">${zh}</span>`;
    }

    /**
     * Format a BaZi branch with badge styling
     * @param {Object} branch - Branch object with zh, name, animal
     * @param {string} lang - Language code
     * @returns {string} HTML string with badge
     */
    static formatBranchBadge(branch, lang = 'en') {
        if (!branch) return '';
        const zh = branch.zh || '';
        const animal = branch.animal || '';

        return `<span class="branch-badge" title="${animal}">${zh}</span>`;
    }

    /**
     * Format master of day display
     * @param {Object} dayMaster - master of day object with zh, name, element
     * @param {string} lang - Language code
     * @returns {string} HTML string
     */
    static formatDayMasterBadge(dayMaster, lang = 'en') {
        if (!dayMaster) return '';
        const t = I18N[lang] || I18N['en'];
        const zh = dayMaster.zh || '';
        const name = dayMaster.name || '';
        const element = dayMaster.element || '';

        const elementClass = element.toLowerCase();

        return `
            <span class="daymaster-badge">
                <span class="stem">${zh}</span>
                <span class="name">${name}</span>
                <span class="element element-badge ${elementClass}">${t[elementClass] || element}</span>
            </span>
        `;
    }

    /**
     * Format Lunar Mansion display
     * @param {Object} mansion - Mansion object
     * @param {string} lang - Language code
     * @returns {string} HTML string
     */
    static formatMansionBadge(mansion, lang = 'en') {
        if (!mansion) return '';
        const name = mansion['name_' + lang] || mansion.name_en;
        const zh = mansion.zh || '';
        const animal = typeof ChineseAstrologyDisplay !== 'undefined' ? ChineseAstrologyDisplay.translateAnimal.call({lang}, mansion.animal) : (mansion.animal || '');

        return `
            <span class="mansion-badge">
                <span class="animal">${animal}</span>
                <span class="name">${zh} ${name}</span>
            </span>
        `;
    }

    /**
     * Format hexagram name display
     * @param {Object} hex - Hexagram object
     * @param {string} lang - Language code
     * @returns {string} HTML string
     */
    static formatHexagramBadge(hex, lang = 'en') {
        if (!hex) return '';
        const name = hex['name_' + lang] || hex.name_en;
        const zh = hex.name_zh || '';
        const number = hex.number || '';

        return `
            <span class="hexagram-badge">
                <span class="number">#${number}</span>
                <span class="name-zh">${zh}</span>
                <span class="name">${name}</span>
            </span>
        `;
    }

    /**
     * Format Yin/Yang indicator
     * @param {boolean} isYang - True if Yang
     * @param {string} lang - Language code
     * @returns {string} HTML string
     */
    static formatYinYangBadge(isYang, lang = 'en') {
        const t = I18N[lang] || I18N['en'];
        const type = isYang ? 'yang' : 'yin';
        const label = isYang ? (t.yang || 'Yang') : (t.yin || 'Yin');
        const symbol = isYang ? '☰' : '☷';

        return `<span class="yinyang-badge ${type}">${symbol} ${label}</span>`;
    }

    /**
     * Format compact interpretation text into rich HTML
     * Expands compact format (CELESTIAL:..., ELEMENTS:..., etc.) into styled sections
     * @param {string} text - Compact text from AI
     * @param {string} sectionType - 'celestial' | 'elements' | 'analysis' | 'advice'
     * @param {string} lang - Language code
     * @returns {string} Rich HTML
     */
    static formatCompactInterp(text, sectionType, lang = 'en') {
        if (!text) return '';
        const t = I18N[lang] || I18N['en'];

        // Remove section prefix if present (e.g., "CELESTIAL:" or "ELEMENTS:")
        const prefixes = ['CELESTIAL:', 'ELEMENTS:', 'ANALYSIS:', 'ADVICE:'];
        let cleanText = text;
        for (const prefix of prefixes) {
            if (cleanText.startsWith(prefix)) {
                cleanText = cleanText.slice(prefix.length).trim();
                break;
            }
        }

        // Split into paragraphs
        const paragraphs = cleanText.split(/\n+/).filter(p => p.trim());

        if (paragraphs.length === 0) return cleanText;

        // For advice section, format as numbered list
        if (sectionType === 'advice') {
            // Try to detect numbered items or split by sentences for advice
            const items = cleanText.match(/\d+[.)]\s+[^\d]+(?=\d+[.)]|$)/g) ||
                cleanText.split(/\.\s+(?=[A-Z])/).filter(s => s.trim().length > 10);

            if (items.length >= 3) {
                return `<ol class="advice-list">
                    ${items.map((item, i) => `<li>${this.highlightProperNames(item.trim(), lang)}</li>`).join('')}
                </ol>`;
            }
        }

        // Format as paragraphs with proper styling
        return paragraphs.map(p => {
            const highlighted = this.highlightProperNames(p.trim(), lang);
            return `<p>${highlighted}</p>`;
        }).join('');
    }

    /**
     * Process text to highlight proper names
     * @param {string} text - Input text
     * @param {string} lang - Language code
     * @returns {string} HTML with highlighted proper names
     */
    static highlightProperNames(text, lang = 'en') {
        if (!text) return '';
        const t = I18N[lang] || I18N['en'];

        // Element names to highlight
        const elements = ['wood', 'fire', 'earth', 'metal', 'water'];
        const elementNames = elements.map(e => t[e]?.toLowerCase()).filter(Boolean);

        // Create regex for element names
        if (elementNames.length > 0) {
            const elementRegex = new RegExp(`\\b(${elementNames.join('|')})\\b`, 'gi');
            text = text.replace(elementRegex, (match) => {
                const elementKey = elements.find(e =>
                    t[e]?.toLowerCase() === match.toLowerCase()
                );
                if (elementKey) {
                    return this.formatElementBadge(elementKey, lang, { showZh: false });
                }
                return match;
            });
        }

        return text;
    }

    static renderLunarMansion(mansion, date, lang) {
        // Support both old panel and new tabbed layout
        const panel = document.getElementById('lunarMansionPanel');
        const contentArea = document.getElementById('lunarMansionContent');

        if (!mansion) {
            if (panel) panel.style.display = 'none';
            return;
        }

        const moonPhase = Astrology.getMoonPhase(date);
        const dateStr = date.toLocaleDateString(
            lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'zh-CN',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );

        const t = I18N[lang];

        const html = `
            <div class="lunar-mansion-header">
                <div class="moon-icon">${mansion.symbol}</div>
                <div>
                    <div class="lunar-mansion-title">${this.formatMansionBadge(mansion, lang)}</div>
                    <div class="lunar-mansion-subtitle">${moonPhase.icon} ${moonPhase.name[lang]} • ${dateStr}</div>
                </div>
            </div>
            <div class="lunar-mansion-content">
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.elements}</div>
                    <div class="lunar-detail-value">${this.formatElementBadge(mansion.element, lang)}</div>
                </div>
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.animal || 'Animal'}</div>
                    <div class="lunar-detail-value">${typeof ChineseAstrologyDisplay !== 'undefined' ? ChineseAstrologyDisplay.translateAnimal.call({lang}, mansion.animal) : mansion.animal}</div>
                </div>
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.degrees || 'Degrees'}</div>
                    <div class="lunar-detail-value">${mansion.degrees}°</div>
                </div>
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.number || '#'}</div>
                    <div class="lunar-detail-value">${mansion.num}/28</div>
                </div>
            </div>
            <div class="four-symbols-badge">${mansion['group_' + lang] || mansion.group} ${mansion.group_zh}</div>
        `;

        if (panel) {
            panel.innerHTML = html;
            panel.style.display = 'block';
        }

        if (contentArea) {
            contentArea.innerHTML = html;
        }
    }

    static renderLifePalace(lifePalaceData, lang) {
        const panel = document.getElementById('lifePalacePanel');
        if (!lifePalaceData) {
            panel.style.display = 'none';
            return;
        }

        const { lifeNum, bodyNum, hourPillar } = lifePalaceData;
        const lifeBranch = EARTHLY_BRANCHES[lifeNum - 1];
        const bodyBranch = EARTHLY_BRANCHES[bodyNum - 1];
        const t = I18N[lang];

        panel.innerHTML = `
            <div class="lunar-mansion-header">
                <div class="moon-icon">🏛️</div>
                <div>
                    <div class="lunar-mansion-title">${t.lifePalaceZiWei || 'Life Palace (Zi Wei)'}</div>
                    <div class="lunar-mansion-subtitle">${t.basedOnBirthTime || 'Based on birth time'}</div>
                </div>
            </div>
            <div class="palace-grid">
                <div class="palace-card ming">
                    <div class="palace-label">${t.lifePalace || 'Life Palace'}</div>
                    <div class="palace-value">${lifeBranch}</div>
                </div>
                <div class="palace-card shen">
                    <div class="palace-label">${t.bodyPalace || 'Body Palace'}</div>
                    <div class="palace-value">${bodyBranch}</div>
                </div>
            </div>
            ${hourPillar ? `
            <div class="hour-pillar-display">
                <div class="lunar-detail-label">${t.hourPillar || 'Hour Pillar'}</div>
                <div class="hour-pillar-value">${hourPillar}</div>
            </div>` : ''}
        `;
        panel.style.display = 'block';
    }

    static renderEquilibrium(eq, lang) {
        const panel = document.getElementById('equilibriumPanel');
        const contentArea = document.getElementById('equilibriumContent');
        const t = I18N[lang];
        const yangPercent = (eq.yangCount / 6) * 100;

        const html = `
            <h3 style="color: var(--auspicious-red); margin-top: 0; font-size: 1.2em; text-align: center;">
                ☯️ ${t.elements}
            </h3>
            <div class="equilibrium-grid">
                <div class="equilibrium-card">
                    <h4>${t.yinYangBalance || 'Yin-Yang Balance'}</h4>
                    <div style="margin: 10px 0;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 6px; font-weight: 600;">
                            <span>${t.yang || 'Yang'}: ${eq.yangCount}</span>
                            <span>${t.yin || 'Yin'}: ${eq.yinCount}</span>
                        </div>
                        <div class="balance-bar">
                            <div class="balance-fill yang" style="width: ${yangPercent}%;"></div>
                        </div>
                    </div>
                    <p style="font-weight: 700; color: var(--auspicious-red); font-size: 1em; margin: 8px 0 0 0; text-align: center;">
                        ${t[eq.balanceState] || eq.balanceState}
                    </p>
                </div>

                <div class="equilibrium-card">
                    <h4>${t.stability || 'Stability'}</h4>
                    <p style="font-size: 1.1em; margin-bottom: 6px; font-weight: 700; color: var(--auspicious-red);">
                        ${t[eq.stabilityState] || eq.stabilityState}
                    </p>
                    <p style="font-size: 0.9em; color: var(--text-sub); margin: 0; font-weight: 600;">
                        ${eq.movingCount} ${t.movingLines} • ${6 - eq.movingCount} ${t.stable || 'Stable'}
                    </p>
                </div>

                <div class="equilibrium-card">
                    <h4>${t.upper || 'Upper'} ${t.trigram || 'Trigram'}</h4>
                    <div class="trigram-symbol" style="color: var(--${eq.upperTrigram?.element || 'metal'});">
                        ${eq.upperTrigram?.symbol || '☰'}
                    </div>
                    <p style="font-size: 0.8em; color: var(--text-sub);">
                        ${eq.upperTrigram?.name?.[lang] || ''}
                    </p>
                </div>

                <div class="equilibrium-card">
                    <h4>${t.lower || 'Lower'} ${t.trigram || 'Trigram'}</h4>
                    <div class="trigram-symbol" style="color: var(--${eq.lowerTrigram?.element || 'metal'});">
                        ${eq.lowerTrigram?.symbol || '☰'}
                    </div>
                    <p style="font-size: 0.8em; color: var(--text-sub);">
                        ${eq.lowerTrigram?.name?.[lang] || ''}
                    </p>
                </div>
            </div>
        `;

        if (panel) {
            panel.innerHTML = html;
            panel.style.display = 'block';
        }

        if (contentArea) {
            contentArea.innerHTML = html;
        }
    }

    static renderElementsGrid(elements, lang) {
        const t = I18N[lang] || I18N['en'];
        const container = document.getElementById('equilibriumPanel');
        if (!container) return;

        const elNames = {
            wood: { name: t.wood || 'Wood', color: '#66BB6A', char: '木' },
            fire: { name: t.fire || 'Fire', color: '#FF5252', char: '火' },
            earth: { name: t.earth || 'Earth', color: '#FFB74D', char: '土' },
            metal: { name: t.metal || 'Metal', color: '#CFD8DC', char: '金' },
            water: { name: t.water || 'Water', color: '#42A5F5', char: '水' }
        };

        let html = '<div class="elements-grid">';
        for (const [key, value] of Object.entries(elements)) {
            const el = elNames[key];
            html += `
                <div class="element-item">
                    <div class="element-value" style="color: ${el.color}">${value}%</div>
                    <div class="element-label">${el.name} ${el.char}</div>
                    <div class="balance-bar"><div class="balance-fill" style="width: ${value}%; background: ${el.color}"></div></div>
                </div>
            `;
        }
        html += '</div>';

        // Append to panel
        const existingGrid = container.querySelector('.elements-grid');
        if (existingGrid) {
            existingGrid.remove();
        }
        container.insertAdjacentHTML('beforeend', html);
    }

    static renderHexagram(lines, binaryKey, hexagramData) {
        const container = document.getElementById('resultsContent');
        // Binary key: positions 0-2 = lines 1-3 (bottom) = LOWER trigram
        //             positions 3-5 = lines 4-6 (top) = UPPER trigram
        const lowerKey = binaryKey.substring(0, 3);
        const upperKey = binaryKey.substring(3, 6);
        const upper = TRIGRAMS[upperKey];
        const lower = TRIGRAMS[lowerKey];

        // Build coin toss display - show from top (line 6) to bottom (line 1)
        // Line 6 is at index 5, Line 1 is at index 0
        let coinHtml = '<div class="coin-toss-grid">';
        for (let i = lines.length - 1; i >= 0; i--) {
            coinHtml += '<div class="coin-row">';
            lines[i].bits.forEach(bit => {
                coinHtml += `<div class="coin ${bit === '1' ? 'head' : 'tail'}">${bit === '1' ? '☰' : '⚋'}</div>`;
            });
            coinHtml += '</div>';
        }
        coinHtml += '</div>';

        // Build lines display - draw from top (line 6) to bottom (line 1)
        // Following _i.html approach: render from lines[5] down to lines[0]
        let linesHtml = '<div class="hexagram-lines">';
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            linesHtml += `<div class="line ${line.isYang ? 'yang' : 'yin'} ${line.isChanging ? 'changing' : ''}">`;
            if (line.isChanging) {
                linesHtml += '<span class="changing-marker">●</span>';
            }
            linesHtml += '</div>';
        }
        linesHtml += '</div>';

        const t = I18N[App.lang] || I18N['en'];

        // Render basic structure
        container.innerHTML = `
            <div class="result-header">
                <p class="current-question">${App.currentQuestion}</p>
                <h2 class="hexagram-title">${hexagramData.number}. ${hexagramData['name_' + App.lang] || hexagramData.name_en}</h2>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button class="wizard-btn secondary" onclick="App.newReading()">${t.newReading || 'New Reading'}</button>
                    <button class="wizard-btn" onclick="App.continueQuestion()">${t.askAgain || 'Ask Again'}</button>
                </div>
            </div>

            <div class="astro-panels-grid">
                <div id="lunarMansionPanel" class="lunar-mansion-panel" style="display: none;"></div>
                <div id="lifePalacePanel" class="life-palace-panel" style="display: none;"></div>
            </div>

            <div id="equilibriumPanel" class="equilibrium-panel" style="display: none;"></div>

            <div class="top-section">
                <div class="coin-tosses-section">
                    <h3 class="section-title">${t.coinTosses || 'Coin Tosses'}</h3>
                    ${coinHtml}
                </div>
                <div class="hexagram-visual">
                    <div class="hexagram-stack">
                        <div class="trigram-symbol" style="color: var(--${upper?.element || 'metal'});">${upper?.symbol || '☰'}</div>
                        ${linesHtml}
                        <div class="trigram-symbol" style="color: var(--${lower?.element || 'metal'});">${lower?.symbol || '☰'}</div>
                    </div>
                </div>
                <div class="hexagram-info">
                    <h3 class="section-title">${t.hexagramDetails || 'Hexagram Details'}</h3>
                    <p><strong>${t.upper || 'Upper'}:</strong> ${upper?.name?.[App.lang] || ''} (${upper?.nature?.element})</p>
                    <p><strong>${t.lower || 'Lower'}:</strong> ${lower?.name?.[App.lang] || ''} (${lower?.nature?.element})</p>
                    <p><strong>${t.binary || 'Binary'}:</strong> ${binaryKey}</p>
                    <p><strong>${t.decimal || 'Decimal'}:</strong> ${parseInt(binaryKey, 2)}</p>
                </div>
            </div>

            <!-- Bagua Display - Shows hexagram trigrams in both arrangements -->
            <div class="bagua-section-wrapper">
                <h3 class="bagua-section-title">☯ ${t.bagua || 'Bagua (Eight Trigrams)'} <span class="zh">八卦</span></h3>
                <p class="bagua-section-subtitle">${upper?.name?.[App.lang] || upper?.name?.en || ''} ${t.over || 'over'} ${lower?.name?.[App.lang] || lower?.name?.en || ''} — ${t.xiantian || 'Xian Tian'} & ${t.houtian || 'Hou Tian'}</p>
                
                <div class="bagua-arrangements-wrapper" id="baguaDisplay">
                    <!-- Xian Tian (Pre-Heaven) -->
                    <div class="bagua-arrangement xiantian">
                        <h4 class="arrangement-title">${t.xiantian || 'Xian Tian'} <span class="zh">先天八卦</span></h4>
                        <p class="arrangement-desc">${t.xiantianDesc || 'Fu Xi Arrangement · Primordial Nature'}</p>
                        <div class="trigrams-display">
                            ${this.renderArrangementTrigrams('xiantian', upperKey, lowerKey)}
                        </div>
                    </div>
                    
                    <!-- Hou Tian (Post-Heaven) -->
                    <div class="bagua-arrangement houtian">
                        <h4 class="arrangement-title">${t.houtian || 'Hou Tian'} <span class="zh">后天八卦</span></h4>
                        <p class="arrangement-desc">${t.houtianDesc || 'King Wen Arrangement · Manifest World'}</p>
                        <div class="trigrams-display">
                            ${this.renderArrangementTrigrams('houtian', upperKey, lowerKey)}
                        </div>
                    </div>
                </div>
            </div>

            <div id="textPanels" class="text-display-grid">
                <div class="text-panel">
                    <h4>${t.originalText || 'Original Text'}</h4>
                    <div id="originalText">${t.loading || 'Loading...'}</div>
                </div>
                <div class="text-panel">
                    <h4>${t.translation || 'Translation'}</h4>
                    <div id="translationText">${t.loading || 'Loading...'}</div>
                </div>
            </div>


            <!-- Tabbed Reading Analysis -->
            <div class="reading-tabs-container">
                <nav class="reading-tabs-nav" role="tablist">
                    <button class="reading-tab-btn active" data-tab="preanalysis" role="tab" aria-selected="true">
                        <span class="tab-icon">☯️</span>
                        <span>${t.preAnalysis || 'Pre-Analysis'}</span>
                    </button>
                    <button class="reading-tab-btn" data-tab="interpretation" role="tab" aria-selected="false">
                        <span class="tab-icon">📖</span>
                        <span>${t.aiInterpretation || 'Interpretation'}</span>
                    </button>
                    <button class="reading-tab-btn" data-tab="remedies" role="tab" aria-selected="false">
                        <span class="tab-icon">🜲</span>
                        <span>${t.remedies || 'Remedies'}</span>
                    </button>
                    <button class="reading-tab-btn" data-tab="medicine" role="tab" aria-selected="false">
                        <span class="tab-icon">🌿</span>
                        <span>${t.baguaMedicineTitle || 'Bagua Medicine'}</span>
                    </button>
                </nav>

                <!-- Pre-Analysis Tab - Simple Hexagram Info -->
                <div id="tab-preanalysis" class="reading-tab-panel active" role="tabpanel">
                    <div class="preanalysis-grid">
                        <div class="preanalysis-card" id="hexagramDetailsPanel">
                            <h4><span>☯️</span> ${t.hexagramDetails || 'Hexagram Details'}</h4>
                            <div id="hexagramDetailsContent">
                                <div class="hex-simple-info">
                                    <p><strong>${hexagramData.name_en || ''}</strong> <span class="zh">${hexagramData.name_zh || ''}</span></p>
                                    <p class="binary-key">Binary: ${binaryKey}</p>
                                    <p class="moving-lines">${lines.filter(l => l.isChanging).length} ${t.movingLines || 'moving lines'}</p>
                                </div>
                            </div>
                        </div>
                        <div class="preanalysis-card analysis-cta-card" id="astrologyCTAPanel">
                            <h4><span>🔮</span> ${t.technicalAnalysis || 'Technical Analysis'}</h4>
                            <div class="analysis-cta-content">
                                <p>${t.seeAnalysisTab || 'Detailed astrology and technical data available in the Analysis tab:'}</p>
                                <ul>
                                    <li>⚡ ${t.momentInfluenceTab || 'Moment Influence'} (${t.currentSky || 'Current Sky'} / BaZi)</li>
                                    <li>🌙 ${t.lunarMansion || 'Lunar Mansion'}</li>
                                    <li>⚖️ ${t.yinYangBalance || 'Yin-Yang Balance'}</li>
                                    <li>☯️ ${t.analysisDesc || 'Complete Chinese Astrology'}</li>
                                </ul>
                                <button class="btn-goto-analysis" onclick="App.switchMainTab('analysis')">
                                    ${t.goToAnalysis || 'View Analysis'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Interpretation Tab -->
                <div id="tab-interpretation" class="reading-tab-panel" role="tabpanel">
                    <div class="sub-tabs-nav">
                        <button class="sub-tab-btn active" data-subtab="overview">${t.overview || 'Overview'}</button>
                        <button class="sub-tab-btn" data-subtab="celestial">${t.celestial || 'Celestial'}</button>
                        <button class="sub-tab-btn" data-subtab="elements">${t.elements || 'Elements'}</button>
                        <button class="sub-tab-btn" data-subtab="analysis">${t.analysis || 'Analysis'}</button>
                        <button class="sub-tab-btn" data-subtab="advice">${t.advice || 'Advice'}</button>
                    </div>
                    <div id="interpretation-content-area">
                        <div class="loading"></div> ${t.consulting || 'Consulting oracle...'}
                    </div>
                </div>

                <!-- Remedies Tab -->
                <div id="tab-remedies" class="reading-tab-panel" role="tabpanel">
                    <div class="sub-tabs-nav">
                        <button class="sub-tab-btn active" data-subtab="all">${t.all || 'All'}</button>
                        <button class="sub-tab-btn" data-subtab="fulu">${t.talisman || 'Fulu'}</button>
                        <button class="sub-tab-btn" data-subtab="fengshui">${t.fengshui || 'Feng Shui'}</button>
                        <button class="sub-tab-btn" data-subtab="medicine">${t.medicine || 'Medicine'}</button>
                    </div>
                    <div id="remedies-content-area">
                        <div class="loading"></div> ${t.loading || 'Loading remedies...'}
                    </div>
                </div>

                <!-- Bagua Medicine Tab -->
                <div id="tab-medicine" class="reading-tab-panel" role="tabpanel">
                    <div id="baguaMedicine-content-area">
                        <div class="loading"></div> ${t.loading || 'Loading...'} ${t.baguaMedicineTitle || 'Bagua Medicine'}
                    </div>
                </div>
            </div>

            <!-- Legacy sections (hidden but referenced) -->
            <div id="aiSection" class="ai-section" style="display: none;">
                <div class="interpretation-content" id="aiInterpretationContent"></div>
            </div>
            <div id="remediesSection" class="remedies-section" style="display: none;">
                <div class="remedies-content" id="remediesContent"></div>
            </div>
            <div id="baguaMedicineSection" class="bagua-medicine-section remedies-section" style="display: none;">
                <div class="bagua-medicine-content" id="baguaMedicineContent"></div>
            </div>
        `;

        // Populate hexagram details in pre-analysis tab
        const hexDetailsContent = document.getElementById('hexagramDetailsContent');
        if (hexDetailsContent) {
            hexDetailsContent.innerHTML = `
                <div class="hexagram-mini-display">
                    <div style="font-size: 1.2em; color: var(--gold); margin-bottom: 8px;">${hexagramData.number}. ${hexagramData['name_' + App.lang] || hexagramData.name_en}</div>
                    <div style="font-size: 1.1em; color: var(--text-dim); margin-bottom: 8px;">${hexagramData.name_zh || ''}</div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.9em;">
                        <span><strong>${t.upper || 'Upper'}:</strong> ${upper?.name?.[App.lang] || ''}</span>
                        <span><strong>${t.lower || 'Lower'}:</strong> ${lower?.name?.[App.lang] || ''}</span>
                        <span><strong>${t.binary || 'Binary'}:</strong> ${binaryKey}</span>
                    </div>
                </div>
            `;
        }

        // Initialize tabs after rendering
        setTimeout(() => this.initReadingTabs(), 0);
    }

    static renderChineseText(hexData, lang) {
        const container = document.getElementById('originalText');
        if (!hexData || !container) return;

        const t = I18N[lang] || I18N['en'];

        let html = `<h5 style="font-size: 1.3em; margin-bottom: 12px; color: var(--gold);">
            ${hexData.name_zh || ''} <span style="font-size: 0.7em; color: var(--text-dim);">#${hexData.number}</span>
        </h5>`;

        if (hexData.judgment_zh) {
            html += `<div style="margin-bottom: 16px; padding: 12px; background: rgba(212,175,55,0.1); border-radius: 8px; border-left: 3px solid var(--gold);">
                <p style="font-weight: 700; color: var(--gold); margin-bottom: 6px;">${t.judgment || 'Judgment'}:</p>
                <p style="font-size: 1.15em; line-height: 1.8; font-family: 'Noto Serif SC', serif;">${hexData.judgment_zh}</p>
            </div>`;
        }

        if (hexData.image?.image_zh) {
            html += `<div style="margin-bottom: 16px; padding: 12px; background: rgba(102,187,106,0.1); border-radius: 8px; border-left: 3px solid var(--wood);">
                <p style="font-weight: 700; color: var(--wood); margin-bottom: 6px;">${t.image || 'Image'}:</p>
                <p style="font-size: 1.15em; line-height: 1.8; font-family: 'Noto Serif SC', serif;">${hexData.image.image_zh}</p>
            </div>`;
        }

        if (hexData.lines_zh?.length > 0) {
            html += `<div style="margin-top: 16px;">
                <p style="font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; color: var(--gold);">${t.lineTexts || 'Line Texts'}:</p>
                ${hexData.lines_zh.map((txt, i) => {
                if (!txt) return '';
                return `<div style="background: rgba(255,255,255,0.03); padding: 10px; margin-bottom: 8px; border-radius: 6px; border-left: 3px solid var(--gold);">
                        <p style="font-size: 0.85em; color: var(--text-dim); margin-bottom: 4px;">${t.lineTexts || 'Line'} ${i + 1}:</p>
                        <p style="font-size: 1.05em; font-family: 'Noto Serif SC', serif;">${txt}</p>
                    </div>`;
            }).join('')}
            </div>`;
        }

        container.innerHTML = html;
    }

    static ensureString(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
            // If it's an array, join with newlines
            if (Array.isArray(value)) {
                return value.map(v => String(v)).join('\n');
            }
            // Otherwise stringify
            return JSON.stringify(value);
        }
        return String(value);
    }

    static renderTranslation(hexData, lang, apiTranslations = null) {
        const container = document.getElementById('translationText');
        if (!hexData || !container) return;

        const t = I18N[lang] || I18N['en'];

        // Debug logging
        console.log(`renderTranslation: lang=${lang}, apiTranslations available:`, !!apiTranslations);
        if (apiTranslations) {
            console.log(`API translations for ${lang}:`, {
                judgment: apiTranslations[lang]?.judgment?.substring(0, 50),
                image: apiTranslations[lang]?.image?.substring(0, 50),
                lines: apiTranslations[lang]?.lines?.length
            });
        }

        // Helper: Check if text is actually translated (not just English or Chinese echoed back)
        // Compares against English AND Chinese sources to detect untranslated/echoed content
        const isActuallyTranslated = (text, englishSource, chineseSource) => {
            if (!text || !englishSource) return !!text;
            if (lang === 'en') return true;
            const normalizeWS = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
            const normalizedText = normalizeWS(text);
            // Reject if identical to English (API echoed English back)
            if (normalizedText === normalizeWS(englishSource)) return false;
            // Reject if identical to Chinese source (API echoed Chinese back untranslated)
            if (chineseSource && normalizedText === normalizeWS(chineseSource)) return false;
            return true;
        };

        // English and Chinese sources for comparison
        const enJudgment = hexData.judgment_en || apiTranslations?.en?.judgment || '';
        const enImage = hexData.image?.image_en || apiTranslations?.en?.image || '';
        const zhJudgment = hexData.judgment_zh || '';
        const zhImage = hexData.image?.image_zh || '';

        // Get judgment for current language with fallback
        let judgment = hexData[`judgment_${lang}`];
        console.log(`JSON judgment_${lang}:`, judgment?.substring(0, 50));
        // Use API translation if JSON is missing — but verify it's actually translated
        if (!judgment && apiTranslations?.[lang]?.judgment) {
            const candidate = apiTranslations[lang].judgment;
            if (isActuallyTranslated(candidate, enJudgment, zhJudgment)) {
                judgment = candidate;
                console.log(`[renderTranslation] Using API judgment for ${lang} (verified translated)`);
            } else {
                console.warn(`[renderTranslation] API judgment for ${lang} is identical to English or Chinese source, skipping`);
            }
        }
        // Fallback: English then Chinese
        if (!judgment && lang !== 'en') judgment = hexData.judgment_en;
        if (!judgment) judgment = hexData.judgment_zh;
        judgment = this.ensureString(judgment);

        // Get image for current language with fallback (nested object structure)
        let image = hexData.image?.[`image_${lang}`];
        // Use API translation if JSON is missing — but verify it's actually translated
        if (!image && apiTranslations?.[lang]?.image) {
            const candidate = apiTranslations[lang].image;
            if (isActuallyTranslated(candidate, enImage, zhImage)) {
                image = candidate;
                console.log(`[renderTranslation] Using API image for ${lang} (verified translated)`);
            } else {
                console.warn(`[renderTranslation] API image for ${lang} is identical to English or Chinese source, skipping`);
            }
        }
        if (!image && lang !== 'en') image = hexData.image?.image_en;
        if (!image) image = hexData.image?.image_zh;
        image = this.ensureString(image);

        // Get lines for current language with fallback
        let lines = hexData[`lines_${lang}`] || [];

        // Helper to check if lines are valid (not empty, not pending placeholders)
        const isValidLines = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) return false;
            const firstLine = String(arr[0] || '').toLowerCase();
            return firstLine.length > 0 && !firstLine.includes('pending') && !firstLine.includes('placeholder');
        };

        // Helper to check if lines are pending
        const isPending = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) return true;
            const firstLine = String(arr[0] || '').toLowerCase();
            return firstLine.includes('pending') || firstLine.includes('placeholder') || firstLine === '';
        };

        // Helper to check if translated lines differ from English source
        const areLinesTranslated = (translatedLines, englishLines) => {
            if (!Array.isArray(translatedLines) || !Array.isArray(englishLines)) return true;
            if (lang === 'en') return true;
            // Check first non-empty line
            for (let i = 0; i < translatedLines.length; i++) {
                const tl = String(translatedLines[i] || '').trim().toLowerCase();
                const el = String(englishLines[i] || '').trim().toLowerCase();
                if (tl && el && tl !== el) return true; // Found a difference
            }
            return false; // All lines identical to English
        };

        const enLines = hexData.lines_en || apiTranslations?.en?.lines || [];

        console.log(`[renderTranslation] Initial lines_${lang}:`, lines?.length, 'isValid:', isValidLines(lines));

        // Try API translations if JSON lines are missing or pending — with translation verification
        if (!isValidLines(lines) && apiTranslations?.[lang]?.lines?.length > 0) {
            const candidate = apiTranslations[lang].lines;
            if (areLinesTranslated(candidate, enLines)) {
                lines = candidate;
                console.log(`[renderTranslation] Using API lines for ${lang} (verified translated), count:`, lines.length);
            } else {
                console.warn(`[renderTranslation] API lines for ${lang} identical to English, skipping`);
            }
        }
        // Also check lineTexts key (used by lines section endpoint)
        if (!isValidLines(lines) && apiTranslations?.[lang]?.lineTexts?.length > 0) {
            const candidate = apiTranslations[lang].lineTexts;
            if (areLinesTranslated(candidate, enLines)) {
                lines = candidate;
                console.log(`[renderTranslation] Using API lineTexts for ${lang} (verified translated), count:`, lines.length);
            } else {
                console.warn(`[renderTranslation] API lineTexts for ${lang} identical to English, skipping`);
            }
        }

        // For non-English languages, fallback to English API translations
        if (!isValidLines(lines) && lang !== 'en') {
            if (apiTranslations?.en?.lines?.length > 0) {
                lines = apiTranslations.en.lines;
                console.log('[renderTranslation] Falling back to API en lines');
            } else if (apiTranslations?.en?.lineTexts?.length > 0) {
                lines = apiTranslations.en.lineTexts;
                console.log('[renderTranslation] Falling back to API en lineTexts');
            } else if (isValidLines(hexData.lines_en)) {
                lines = hexData.lines_en;
                console.log('[renderTranslation] Falling back to JSON lines_en');
            }
        }

        // Final fallback to Chinese if still no valid lines
        if (!isValidLines(lines)) {
            if (isValidLines(hexData.lines_zh)) {
                lines = hexData.lines_zh;
                console.log('[renderTranslation] Falling back to Chinese lines');
            } else {
                lines = [];
            }
        }

        // Ensure lines is an array of strings
        if (lines) {
            lines = lines.map(l => this.ensureString(l));
        }

        let html = `<h5 style="font-size: 1.2em; margin-bottom: 12px; color: var(--gold);">
            ${hexData[`name_${lang}`] || hexData.name_en || ''} <span style="font-size: 0.7em; color: var(--text-dim);">#${hexData.number}</span>
        </h5>`;

        if (judgment) {
            html += `<div style="margin-bottom: 16px; padding: 12px; background: rgba(212,175,55,0.1); border-radius: 8px; border: 1px solid rgba(212,175,55,0.3);">
                <p style="font-weight: 700; color: var(--gold); margin-bottom: 8px;">${t.judgment || 'Judgment'}:</p>
                <p>${judgment}</p>
            </div>`;
        }

        if (image) {
            html += `<div style="margin-bottom: 16px; padding: 12px; background: rgba(102,187,106,0.1); border-radius: 8px; border: 1px solid rgba(102,187,106,0.3);">
                <p style="font-weight: 700; color: var(--wood); margin-bottom: 8px;">${t.image || 'Image'}:</p>
                <p>${image}</p>
            </div>`;
        }

        if (lines?.length > 0) {
            html += `<div style="margin-top: 16px;">
                <p style="font-weight: 700; margin-bottom: 12px; border-bottom: 1px solid rgba(212,175,55,0.3); padding-bottom: 6px; color: var(--gold);">${t.lineTexts || 'Line Texts'}:</p>
                ${lines.map((txt, i) => {
                if (!txt) return '';
                return `<div style="background: rgba(255,255,255,0.03); border-left: 3px solid rgba(212,175,55,0.5); padding: 12px; margin-bottom: 10px; border-radius: 8px;">
                        <p style="font-weight: 700; font-size: 0.9em; color: var(--text-dim); margin-bottom: 6px;">${t.lineTexts || 'Line'} ${i + 1}:</p>
                        <p>${txt}</p>
                    </div>`;
            }).join('')}
            </div>`;
        }

        container.innerHTML = html || `<p style="color: var(--text-dim);">${t.translation || 'Translation not available.'}</p>`;
    }

    static renderAILoading(lang) {
        const container = document.getElementById('interpretation-content-area');
        if (!container) return;
        const t = I18N[lang] || I18N['en'];
        container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px; color: var(--gold);">
            <div class="loading"></div>
            <span>${t.loading || 'Loading...'}</span>
        </div>`;
    }

    static renderAIInterpretation(result, lang) {
        const container = document.getElementById('interpretation-content-area');
        if (!container) return;

        if (!result) {
            container.innerHTML = '<div style="color: var(--text-dim); padding: 20px;">Loading...</div>';
            return;
        }

        const r = result[lang] || result.en;
        if (!r) {
            container.innerHTML = `<div style="color: var(--text-dim); padding: 20px;">${I18N[lang]?.unavailable ? I18N[lang].unavailable : 'Interpretation unavailable'}</div>`;
            return;
        }

        const t = I18N[lang] || I18N['en'];
        let html = '';

        ['celestial', 'elements', 'houtou', 'analysis', 'symbolism', 'advice'].forEach(key => {
            // Check for technical/colloquial variants
            const technicalKey = key + 'Technical';
            const colloquialKey = key + 'Colloquial';
            const dataKey = key + 'Data'; // Raw technical JSON data

            // Layer 2: Technical Analysis (classical interpretation)
            let technicalAnalysis = r[technicalKey] || r[key + 'Analysis'];
            // Layer 3: Colloquial Analysis (modern interpretation)
            let colloquialData = r[colloquialKey];
            // Layer 1: Raw Technical Data (JSON)
            let technicalData = r[dataKey] || r[key + 'Data'];

            // Legacy: check if main section contains technical analysis
            if (!technicalAnalysis && r[key] && typeof r[key] === 'string' && r[key].length > 50) {
                technicalAnalysis = r[key];
            }

            // For houtou section, check multiple possible data keys
            if (key === 'houtou') {
                technicalAnalysis = r.houtou || r.houtouTechnical || r.houtouColloquial || technicalAnalysis;
            }

            // Only render if we have at least one layer
            if (technicalAnalysis || colloquialData || technicalData) {
                const title = t[key] || key;

                html += `<div class="interp-section" data-section="${key}">
                    <div class="interp-title">${title}</div>`;

                // Layer 1: Technical Data (JSON) - collapsible, shown first
                if (technicalData) {
                    const techString = typeof technicalData === 'string' ? technicalData : JSON.stringify(technicalData, null, 2);
                    html += `<details class="interp-tech-details" style="margin-bottom: 12px;">
                        <summary class="interp-tech-summary">${t.technicalData || '📊 Technical Data (JSON)'}</summary>
                        <div class="interp-tech-box"><pre style="white-space: pre-wrap; font-size: 0.8em; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 300px; overflow-y: auto;">${techString}</pre></div>
                    </details>`;
                }

                // Layer 2: Technical Analysis (classical) - main content
                if (technicalAnalysis) {
                    const techString = typeof technicalAnalysis === 'string' ? technicalAnalysis : JSON.stringify(technicalAnalysis);
                    html += `<div class="interp-text interp-technical" style="margin-bottom: 8px;">${this.formatParagraphs ? this.formatParagraphs(techString) : techString}</div>`;
                }

                // Layer 3: Colloquial/Modern Interpretation - collapsible
                if (colloquialData) {
                    const collString = typeof colloquialData === 'string' ? colloquialData : JSON.stringify(colloquialData);
                    html += `<details class="interp-coll-details" style="margin-top: 8px;">
                        <summary class="interp-coll-summary">${t.colloquialInterpretation || '💬 Modern Interpretation'}</summary>
                        <div class="interp-coll-box interp-colloquial">${this.formatParagraphs ? this.formatParagraphs(collString) : collString}</div>
                    </details>`;
                }

                // Houtou-specific sub-sections
                if (key === 'houtou') {
                    if (r.emperorAnalysis) {
                        html += `<div class="interp-section" style="margin-left: 12px; border-left: 2px solid rgba(212,175,55,0.3); padding-left: 12px; margin-top: 8px;">
                            <div class="interp-title" style="font-size: 0.95em;">${t.emperorAnalysis || 'Emperor Analysis'}</div>
                            <div class="interp-text">${this.formatParagraphs ? this.formatParagraphs(r.emperorAnalysis) : r.emperorAnalysis}</div>
                        </div>`;
                    }
                    if (r.masterAnalysis) {
                        html += `<div class="interp-section" style="margin-left: 12px; border-left: 2px solid rgba(212,175,55,0.3); padding-left: 12px; margin-top: 8px;">
                            <div class="interp-title" style="font-size: 0.95em;">${t.masterAnalysis || 'Master Analysis'}</div>
                            <div class="interp-text">${this.formatParagraphs ? this.formatParagraphs(r.masterAnalysis) : r.masterAnalysis}</div>
                        </div>`;
                    }
                }

                html += `</div>`; // Close interp-section
            }
        });

        if (r.movingLines && String(r.movingLines).length > 10) {
            // FIX: Ensure movingLines is a string
            let movingLinesText = r.movingLines;
            if (typeof movingLinesText === 'object') {
                movingLinesText = JSON.stringify(movingLinesText);
            }
            html += `<div class="interp-lines-box">
                <div class="interp-header">⚡ ${t.movingLines || 'Moving Lines'}</div>
                <div class="interp-text">${movingLinesText}</div>
            </div>`;
        }

        container.innerHTML = html || '<div style="color: var(--text-dim); padding: 20px;">No interpretation available</div>';
    }

    static highlightTrigram(name) {
        document.querySelectorAll('.trigram-card, .bagua-strip-item').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelectorAll(`[data-trigram="${name}"]`).forEach(card => {
            card.classList.add('active');
        });
        setTimeout(() => {
            document.querySelectorAll(`[data-trigram="${name}"]`).forEach(card => {
                card.classList.remove('active');
            });
        }, 3000);
    }

    static showStep(n) {
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`step-${n}`).classList.add('active');
    }

    static isMobile() {
        return window.matchMedia('(max-width: 767px)').matches;
    }

    static isTouchDevice() {
        return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    }

    static cleanRawText(text) {
        if (!text) return '';
        if (typeof text !== 'string') {
            text = typeof text === 'object' ? JSON.stringify(text) : String(text);
        }
        return text
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, ' ')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    static formatMarkdownInline(text) {
        if (!text) return '';
        let result = this.cleanRawText(text);

        // Remove bracket headers (e.g., [Authentic Instructions]) globally
        result = result.replace(/^\[[^\]]+\]\s*\n?/gm, '').trim();

        // Basic Markdown formatting
        result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, '<em>$1</em>');

        // Unicode character enhancement
        result = result.replace(/([\u4e00-\u9fa5])\s*\(([^)]*U\+[0-9A-F]+)\)/g,
            '<span class="char-with-unicode"><span class="zh-char">$1</span> <small class="unicode-label">($2)</small></span>');

        // Line breaks
        result = result.replace(/\n/g, '<br>');

        return result;
    }

    static formatMarkdownBlock(text) {
        if (!text) return '';
        const lines = text.split('\n');
        let html = '';
        let inList = false;
        let listType = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                if (inList) { html += `</${listType}>`; inList = false; }
                continue;
            }

            // Headings
            const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
            if (headingMatch) {
                if (inList) { html += `</${listType}>`; inList = false; }
                const level = Math.min(headingMatch[1].length + 2, 6);
                html += `<h${level} class="interp-subtitle">${this.formatMarkdownInline(headingMatch[2])}</h${level}>`;
                continue;
            }

            // Lists
            const listMatch = line.match(/^[-*]\s+(.+)$/);
            if (listMatch && !line.startsWith('**')) {
                if (!inList || listType !== 'ul') {
                    if (inList) html += `</${listType}>`;
                    html += '<ul class="interp-list">';
                    inList = true;
                    listType = 'ul';
                }
                html += `<li>${this.formatMarkdownInline(listMatch[1])}</li>`;
                continue;
            }

            const numListMatch = line.match(/^\d+\.\s+(.+)$/);
            if (numListMatch) {
                if (!inList || listType !== 'ol') {
                    if (inList) html += `</${listType}>`;
                    html += '<ol class="interp-list">';
                    inList = true;
                    listType = 'ol';
                }
                html += `<li>${this.formatMarkdownInline(numListMatch[1])}</li>`;
                continue;
            }

            // Regular paragraph line
            if (inList) { html += `</${listType}>`; inList = false; }
            html += `<p>${this.formatMarkdownInline(line)}</p>`;
        }

        if (inList) html += `</${listType}>`;
        return html;
    }

    static escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    static formatParagraphs(text, options = {}) {
        if (!text) return '';
        // Defensive: coerce non-string values (objects, arrays) to string
        if (typeof text !== 'string') {
            text = typeof text === 'object' ? JSON.stringify(text) : String(text);
        }
        text = this.cleanRawText(text);

        // Remove bracket headers globally
        text = text.replace(/^\[[^\]]+\]\s*\n?/gm, '').trim();

        // Check for Fuzhou structure (Chinese/Pinyin/Translation)
        const fuzhouLabels = ['Structure:', '結構:', 'Application:', '應用:', 'Instructions:', '指引:', 'Alchemical Context:', '丹道背景:', 'Contexto Alquímico:', 'Instrucciones:', 'Estructura:', 'Aplicación:'];
        const hasLabel = fuzhouLabels.some(label => text.includes(label));

        if (text.includes('\n') && !hasLabel) {
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length >= 2 && lines.length <= 4) {
                const hasChinese = /[\u4e00-\u9fa5]/.test(lines[0]);
                const hasMarkdown = /^#|^\*\*|\*/.test(lines[0]);
                if (hasChinese && !hasMarkdown) {
                    return lines.map((line, i) => {
                        const cls = i === 0 ? 'fuzhou-zh' : i === 1 ? 'fuzhou-pinyin' : 'fuzhou-trans';
                        const inline = this.formatMarkdownInline(line);
                        // Strip <br> for these specific classes as they are single lines
                        return `<p class="${cls}">${inline.replace(/<br>/g, '')}</p>`;
                    }).join('');
                }
            }
        }

        // Special handling for advice sections with numbered lists
        if (options.isAdvice || text.match(/^\d+\.|^[-•]\s/m)) {
            return this.formatAdviceContent(text);
        }

        // Markdown block detection
        const hasBlockMarkdown = /^#{1,4}\s|^[-*]\s|^\d+\.\s/m.test(text);
        if (hasBlockMarkdown) {
            return text.split(/\n\n+/).map(block => {
                if (!block.trim()) return '';
                return `<div class="interp-block">${this.formatMarkdownBlock(block.trim())}</div>`;
            }).join('');
        }

        // Standard paragraph formatting
        return text.split(/\n\n+/).map(p => {
            if (!p.trim()) return '';
            const trimmed = p.trim();
            // Detect subtitle-like short lines
            if (trimmed.length < 60 && !trimmed.endsWith('.') && !trimmed.includes('<') && !trimmed.includes('\n')) {
                return `<h4 class="interp-subtitle">${this.formatMarkdownInline(trimmed)}</h4>`;
            }
            return `<p>${this.formatMarkdownInline(trimmed)}</p>`;
        }).join('');
    }

    /**
     * Format advice content with proper list structure
     */
    static formatAdviceContent(text) {
        const lines = text.split('\n').filter(l => l.trim());
        let html = '';
        let currentList = [];
        let inList = false;
        let introText = '';

        lines.forEach((line, index) => {
            const trimmed = line.trim();

            // Check for numbered list item (1., 2., etc.)
            const numMatch = trimmed.match(/^(\d+)\.\s*(.+)$/);
            // Check for bullet point
            const bulletMatch = trimmed.match(/^[-•]\s*(.+)$/);
            // Check for bold header before list
            const headerMatch = trimmed.match(/^\*\*(.+?)\*\*[:\s]*$/);

            if (headerMatch) {
                // Close any open list first
                if (inList && currentList.length > 0) {
                    html += `<ol class="advice-list">${currentList.join('')}</ol>`;
                    currentList = [];
                    inList = false;
                }
                html += `<h4 class="advice-header">${headerMatch[1]}</h4>`;
            } else if (numMatch || bulletMatch) {
                const content = numMatch ? numMatch[2] : bulletMatch[1];
                if (!inList) inList = true;

                // Check for bold text at start of item
                const itemContent = this.formatMarkdownInline(content);
                currentList.push(`<li class="advice-item">${itemContent}</li>`);
            } else if (trimmed) {
                // Regular paragraph text
                if (inList && currentList.length > 0) {
                    html += `<ol class="advice-list">${currentList.join('')}</ol>`;
                    currentList = [];
                    inList = false;
                }
                if (index === 0 || !introText) {
                    html += `<p class="advice-intro">${this.formatMarkdownInline(trimmed)}</p>`;
                } else {
                    html += `<p>${this.formatMarkdownInline(trimmed)}</p>`;
                }
            }
        });

        // Close any remaining list
        if (inList && currentList.length > 0) {
            html += `<ol class="advice-list">${currentList.join('')}</ol>`;
        }

        return html;
    }

    static extractTitle(text) {
        if (!text) return null;
        const firstLine = text.split('\n')[0].trim();
        return firstLine.replace(/^#+\s*|\*\*|\*|:$/g, '').trim();
    }

    static removeTitle(text) {
        if (!text) return '';
        const lines = text.split('\n');
        if (lines.length > 1) {
            return lines.slice(1).join('\n').trim();
        }
        return text;
    }

    static createSection(id, title, content, isFullWidth = false) {
        return `
            <div id="section-${id}" class="section-wrapper ${isFullWidth ? 'full-width-section' : ''}">
                <button class="section-toggle-btn" onclick="UI.toggleSection('${id}', '${title}')" aria-expanded="true" aria-label="Toggle ${title}">
                    <svg class="icon icon-toggle" viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                    </svg>
                </button>
                <div id="content-${id}" class="section-content">
                    ${content}
                </div>
            </div>
        `;
    }

    static toggleSection(id, title) {
        const content = document.getElementById(`content-${id}`);
        const btn = document.querySelector(`#section-${id} .section-toggle-btn`);
        if (content && btn) {
            const isHidden = content.classList.toggle('hidden');
            if (isHidden) {
                btn.innerHTML = `Show ${title}`;
                btn.classList.add('collapsed');
            } else {
                btn.innerHTML = `<svg class="icon icon-toggle" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`;
                btn.classList.remove('collapsed');
            }
            btn.setAttribute('aria-expanded', !isHidden);
        }
    }

    static renderHoutouDiagram(canvasId, mansion, upperKey = null, lowerKey = null) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0) return; // Hidden or not layout yet

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const size = Math.min(rect.width, rect.height) * 0.9;

        ctx.clearRect(0, 0, rect.width, rect.height);

        if (typeof SigilTools !== 'undefined') {
            SigilTools.drawBagua(ctx, cx, cy, size, {}, '#d4af37');
            if (mansion) {
                this.highlightMansionPosition(ctx, cx, cy, size, mansion);
            }
            // Highlight active trigrams from the current hexagram
            if (upperKey || lowerKey) {
                this.highlightHexagramTrigrams(ctx, cx, cy, size, upperKey, lowerKey);
            }
        }
    }

    static highlightMansionPosition(ctx, cx, cy, size, mansion) {
        // Map mansion to trigram/direction based on Houtian arrangement (South at Top)
        // This mapping ensures the dot appears in the correct directional sector
        const mansionTrigramMap = {
            'Horn': { angle: Math.PI }, 'Neck': { angle: Math.PI }, 'Root': { angle: Math.PI }, // East (Zhen)
            'Room': { angle: -3 * Math.PI / 4 }, 'Heart': { angle: -3 * Math.PI / 4 }, 'Tail': { angle: -3 * Math.PI / 4 }, 'Winnowing': { angle: -3 * Math.PI / 4 }, // SE (Xun)
            'Dipper': { angle: Math.PI / 2 }, 'Ox': { angle: Math.PI / 2 }, 'Girl': { angle: Math.PI / 2 }, 'Emptiness': { angle: Math.PI / 2 }, // North (Kan)
            'Roof': { angle: 3 * Math.PI / 4 }, 'House': { angle: 3 * Math.PI / 4 }, 'Wall': { angle: 3 * Math.PI / 4 }, // NE (Gen)
            'Stride': { angle: 0 }, 'Harvest': { angle: 0 }, 'Stomach': { angle: 0 }, // West (Dui)
            'Hairy': { angle: Math.PI / 4 }, 'Net': { angle: Math.PI / 4 }, 'Turtle': { angle: Math.PI / 4 }, 'Three': { angle: Math.PI / 4 }, // NW (Qian)
            'Well': { angle: -Math.PI / 2 }, 'Ghost': { angle: -Math.PI / 2 }, 'Willow': { angle: -Math.PI / 2 }, // South (Li)
            'Star': { angle: -Math.PI / 4 }, 'Stretch': { angle: -Math.PI / 4 }, 'Wings': { angle: -Math.PI / 4 }, 'Chariot': { angle: -Math.PI / 4 } // SW (Kun)
        };

        const mapping = mansionTrigramMap[mansion.name_en];
        if (mapping) {
            const r = size / 2;
            const x = cx + Math.cos(mapping.angle) * r * 0.7;
            const y = cy + Math.sin(mapping.angle) * r * 0.7;
            const color = `var(--${mansion.element.toLowerCase()})`;

            // Draw highlight
            ctx.beginPath();
            ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(212, 175, 55, 0.4)'; // Gold transparent
            ctx.fill();

            // Draw dot
            ctx.beginPath();
            ctx.arc(x, y, size * 0.04, 0, Math.PI * 2);
            ctx.fillStyle = '#d4af37';
            ctx.fill();
        }
    }

    static renderBaziComparison(birthBazi, currentBazi, lang, birthBaziExtended = null, currentBaziExtended = null) {
        const panel = document.getElementById('lifePalacePanel');
        const contentArea = document.getElementById('lifePalaceContent');

        const t = I18N[lang] || I18N['en'];
        let html = '';

        if (birthBazi) {
            html += `<div class="bazi-section natal-bazi">
                <div class="bazi-section-header">
                    <span class="icon"><svg><use href="#icon-palace"/></svg></span>
                    <h4>${t.lifePalaceTitle || 'Birth Astrology (BaZi)'}</h4>
                </div>
                ${this.generateBaziHtml(birthBazi, lang)}
                ${birthBaziExtended ? this.generateExtendedBaziHtml(birthBaziExtended, lang) : ''}
            </div>`;
        }

        if (currentBazi) {
            html += `<div class="bazi-section current-bazi">
                <div class="bazi-section-header">
                    <span class="icon"><svg><use href="#icon-clock"/></svg></span>
                    <h4>${t.currentBaziTitle || 'Moment Influence (BaZi)'}</h4>
                </div>
                ${this.generateBaziHtml(currentBazi, lang)}
                ${currentBaziExtended ? this.generateExtendedBaziHtml(currentBaziExtended, lang) : ''}
            </div>`;
        }

        if (panel) {
            panel.innerHTML = html;
            panel.classList.add('bazi-comparison-view');
        }

        if (contentArea) {
            contentArea.innerHTML = html;
        }
        panel.style.display = 'block';

        // Render enhanced Bazi diagram with active component highlighting
        if (birthBaziExtended || currentBaziExtended) {
            console.log(`[UI.renderBaziComparison] Calling renderBaziEnhanced`, birthBaziExtended ? 'has birth data' : 'no birth', currentBaziExtended ? 'has current data' : 'no current');
            setTimeout(() => {
                this.renderBaziEnhanced(birthBaziExtended, currentBaziExtended, lang);
            }, 100);
        } else {
            console.log(`[UI.renderBaziComparison] No extended BaZi data, skipping enhanced diagram`);
        }
    }

    static generateExtendedBaziHtml(extended, lang) {
        const t = I18N[lang] || I18N['en'];
        const xiantian = extended.xiantian;
        const hetu = extended.hetu;
        const luoshu = extended.luoshu;

        return `
            <div class="extended-bazi-analysis">
                <!-- Xiantian (Early Heaven) Analysis -->
                <div class="xiantian-section analysis-subsection">
                    <h5 class="subsection-title">${t.xiantianTitle || '先天 Xiantian (Early Heaven)'}</h5>
                    <div class="xiantian-content">
                        <div class="three-treasures">
                            <div class="treasure-indicator">
                                <span class="treasure-label">${t.dominantTreasure || 'Dominant Treasure'}:</span>
                                <span class="treasure-value ${xiantian.threeTreasures.dominant}">
                                    ${xiantian.threeTreasures.dominantInfo.desc}
                                </span>
                            </div>
                            <div class="congenital-nature">
                                <span class="nature-label">${t.congenitalNature || 'Congenital Nature'}:</span>
                                <span class="nature-value">${xiantian.congenitalNature.description}</span>
                            </div>
                            <div class="cultivation-focus">
                                <strong>${t.cultivationFocus || 'Cultivation'}:</strong> ${xiantian.congenitalNature.cultivationFocus}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Hetu (River Map) Analysis -->
                <div class="hetu-section analysis-subsection">
                    <h5 class="subsection-title">${t.hetuTitle || '河圖 Hetu (River Map)'}</h5>
                    <div class="hetu-content">
                        <div class="life-path">
                            <div class="path-type">
                                <span class="path-label">${t.lifePathType || 'Life Path'}:</span>
                                <span class="path-value">${hetu.lifePath.pathType}</span>
                            </div>
                            <div class="generation-flow">
                                <strong>${t.elementFlow || 'Element Flow'}:</strong> 
                                ${hetu.generationAnalysis.dominantElement} ${t.dominant || 'dominant'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Luoshu (Lo Shu) Analysis -->
                <div class="luoshu-section analysis-subsection">
                    <h5 class="subsection-title">${t.luoshuTitle || '洛書 Luoshu (Magic Square)'}</h5>
                    <div class="luoshu-content">
                        <div class="ming-gua">
                            <div class="gua-number">
                                <span class="gua-label">${t.mingGua || 'Life Gua (Ming Gua)'}:</span>
                                <span class="gua-value">${luoshu.mingGua.number} - ${luoshu.mingGua.trigram}</span>
                            </div>
                            <div class="favorable-directions">
                                <strong>${t.favorableDirections || 'Favorable Directions'}:</strong>
                                <span class="directions-list">
                                    ${t.shengQi || 'Vitality'}: ${luoshu.mingGua.favorableDirections.shengQi},
                                    ${t.tianYi || 'Healing'}: ${luoshu.mingGua.favorableDirections.tianYi}
                                </span>
                            </div>
                            <div class="fengshui-advice">
                                ${luoshu.fengshui.annualAdvice}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Synthesis -->
                ${extended.synthesis ? `
                <div class="synthesis-section analysis-subsection">
                    <h5 class="subsection-title">${t.synthesisTitle || 'Synthesis'}</h5>
                    <div class="synthesis-content">
                        <ul class="recommendations-list">
                            ${extended.synthesis.recommendations.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render trigrams for a specific arrangement (xiantian or houtian)
     */
    static renderArrangementTrigrams(arrangement, upperKey, lowerKey) {
        const arr = arrangement === 'xiantian' ? BaguaCore.XIANTIAN : BaguaCore.HOUTIAN;
        const upperTrigram = arr.trigrams.find(t => t.binary === upperKey);
        const lowerTrigram = arr.trigrams.find(t => t.binary === lowerKey);

        if (!upperTrigram || !lowerTrigram) return '';

        const lang = typeof App !== 'undefined' ? App.lang : 'en';
        const tEl = (e) => typeof ChineseAstrologyDisplay !== 'undefined' ? ChineseAstrologyDisplay.translateElement.call({lang}, e) : e;
        const tDiv = typeof AstrologyI18N !== 'undefined' ? (AstrologyI18N.translations[lang]?.trigramDivider || 'over') : (typeof I18N !== 'undefined' ? (I18N[lang]?.over || 'over') : 'over');
        const tLabels = {
            upper: { en: 'Upper Trigram', es: 'Trigrama Superior', it: 'Trigramma Superiore', zh: '上卦' },
            lower: { en: 'Lower Trigram', es: 'Trigrama Inferior', it: 'Trigramma Inferiore', zh: '下卦' },
            spiritual: { en: 'Spiritual', es: 'Espiritual', it: 'Spirituale', zh: '靈性' },
            lifeArea: { en: 'Life Area', es: 'Área de Vida', it: 'Area di Vita', zh: '生活領域' }
        };

        const getElementClass = (element) => {
            if (!element) return '';
            const e = element.toLowerCase();
            if (e.includes('fire')) return 'fire';
            if (e.includes('water')) return 'water';
            if (e.includes('wood')) return 'wood';
            if (e.includes('metal')) return 'metal';
            if (e.includes('earth')) return 'earth';
            return '';
        };

        return `
            <div class="arr-trigram upper ${getElementClass(upperTrigram.element)}" data-trigram="${upperTrigram.name}">
                <div class="trig-header">
                    <span class="trig-position">${tLabels.upper[lang] || tLabels.upper.en} (${upperTrigram.dir})</span>
                    <span class="trig-element-badge">${tEl(upperTrigram.element)}</span>
                </div>
                <div class="trig-body">
                    <div class="trig-lines">${this.getTrigramLinesHtml(upperTrigram.binary)}</div>
                    <div class="trig-identity">
                        <span class="trig-zh">${upperTrigram.zh}</span>
                        <span class="trig-name">${upperTrigram.name}</span>
                    </div>
                </div>
                <div class="trig-meaning">
                    ${arrangement === 'xiantian'
                ? `<span class="meaning-label">${tLabels.spiritual[lang] || tLabels.spiritual.en}:</span> <span class="meaning-value">${upperTrigram.spiritual}</span>`
                : `<span class="meaning-label">${tLabels.lifeArea[lang] || tLabels.lifeArea.en}:</span> <span class="meaning-value">${upperTrigram.lifeArea}</span>`
            }
                </div>
            </div>

            <div class="arr-trigram-divider">
                <span class="divider-line-h"></span>
                <span class="divider-text">${tDiv}</span>
                <span class="divider-line-h"></span>
            </div>

            <div class="arr-trigram lower ${getElementClass(lowerTrigram.element)}" data-trigram="${lowerTrigram.name}">
                <div class="trig-header">
                    <span class="trig-position">${tLabels.lower[lang] || tLabels.lower.en} (${lowerTrigram.dir})</span>
                    <span class="trig-element-badge">${tEl(lowerTrigram.element)}</span>
                </div>
                <div class="trig-body">
                    <div class="trig-lines">${this.getTrigramLinesHtml(lowerTrigram.binary)}</div>
                    <div class="trig-identity">
                        <span class="trig-zh">${lowerTrigram.zh}</span>
                        <span class="trig-name">${lowerTrigram.name}</span>
                    </div>
                </div>
                <div class="trig-meaning">
                    ${arrangement === 'xiantian'
                ? `<span class="meaning-label">${tLabels.spiritual[lang] || tLabels.spiritual.en}:</span> <span class="meaning-value">${lowerTrigram.spiritual}</span>`
                : `<span class="meaning-label">${tLabels.lifeArea[lang] || tLabels.lifeArea.en}:</span> <span class="meaning-value">${lowerTrigram.lifeArea}</span>`
            }
                </div>
            </div>
        `;
    }

    static getTrigramLinesHtml(binary) {
        // Binary is stored bottom-to-top (line 1, line 2, line 3)
        // But we display top-to-bottom (line 3, line 2, line 1)
        const reversed = binary.split('').reverse();
        return `<svg class="trigram-lines-svg" viewBox="0 0 60 54" width="60" height="54">
            ${reversed.map((bit, i) =>
            bit === '1'
                ? `<line x1="5" y1="${9 + i * 18}" x2="55" y2="${9 + i * 18}" stroke="currentColor" stroke-width="4" stroke-linecap="round" />`
                : `<line x1="5" y1="${9 + i * 18}" x2="25" y2="${9 + i * 18}" stroke="currentColor" stroke-width="4" stroke-linecap="round" /><line x1="35" y1="${9 + i * 18}" x2="55" y2="${9 + i * 18}" stroke="currentColor" stroke-width="4" stroke-linecap="round" />`
        ).join('')}
        </svg>`;
    }

    static generateBaziHtml(bazi, lang) {
        const t = I18N[lang] || I18N['en'];
        const pillars = ['hour', 'day', 'month', 'year'];

        // Table
        const tableHtml = `
            <div class="bazi-table-container">
                <table class="bazi-classical-table">
                    <thead>
                        <tr><th></th>${pillars.map(p => `<th>${t[p + 'Pillar'] || p}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        <tr class="stems-row">
                            <td class="row-label">${t.heavenlyStem || 'Stem'}</td>
                            ${pillars.map(p => {
            const s = bazi[p].stem;
            return `<td style="color: var(--${s.element.toLowerCase()})">
                                    <div class="cell-zh">${s.zh}</div>
                                    <div class="cell-en">${s.name}</div>
                                    <div class="cell-god">${bazi[p].tenGod ? (lang === 'zh' ? bazi[p].tenGod.zh : bazi[p].tenGod[lang] || bazi[p].tenGod.zh) : ''}</div>
                                </td>`;
        }).join('')}
                        </tr>
                        <tr class="branches-row">
                            <td class="row-label">${t.earthlyBranch || 'Branch'}</td>
                            ${pillars.map(p => {
            const b = bazi[p].branch;
            return `<td style="color: var(--${b.element.toLowerCase()})">
                                    <div class="cell-zh">${b.zh}</div>
                                    <div class="cell-en">${b.name}</div>
                                    <div class="cell-god">${bazi[p].branchTenGod ? (lang === 'zh' ? bazi[p].branchTenGod.zh : bazi[p].branchTenGod[lang] || bazi[p].branchTenGod.zh) : ''}</div>
                                </td>`;
        }).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        // Canvas Diagram IDs
        const baziCanvasId = 'bazi-diagram-' + Math.random().toString(36).substr(2, 9);

        // Render Bazi Diagram async
        setTimeout(() => {
            const canvas = document.getElementById(baziCanvasId);
            if (canvas && typeof SigilTools !== 'undefined') {
                const ctx = canvas.getContext('2d');
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);

                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const size = Math.min(rect.width, rect.height) * 0.9;

                const pData = {
                    year: { stem: bazi.year?.stem?.zh, branch: bazi.year?.branch?.zh },
                    month: { stem: bazi.month?.stem?.zh, branch: bazi.month?.branch?.zh },
                    day: { stem: bazi.day?.stem?.zh, branch: bazi.day?.branch?.zh, element: bazi.day?.stem?.element },
                    hour: { stem: bazi.hour?.stem?.zh, branch: bazi.hour?.branch?.zh }
                };

                SigilTools.drawBaziDiagram(ctx, cx, cy, size, pData, '#d4af37');
            }
        }, 100);

        return `
            <div class="bazi-chart-summary">
                ${tableHtml}
                <div class="bazi-visual-layout">
                    <div class="bazi-diagram-wrapper" style="text-align: center; margin: 15px auto;">
                        <div class="diagram-label" style="font-size: 0.8em; opacity: 0.8; margin-bottom: 5px;">${t.baziDiagram || 'BaZi Diagram'}</div>
                        <canvas id="${baziCanvasId}" class="bazi-diagram-canvas" style="width: 200px; height: 200px; max-width: 100%;"></canvas>
                    </div>
                    <div class="bazi-mini-analysis">
                        <div class="analysis-stat"><span>${t.dayMaster}:</span> <strong style="color: var(--${bazi.day.stem.element.toLowerCase()})">${bazi.day.stem.zh} ${bazi.day.stem.name}</strong></div>
                        <div class="analysis-stat"><span>${t.strength}:</span> <strong>${t[bazi.strength.result.toLowerCase()] || bazi.strength.result}</strong></div>
                        <div class="analysis-stat"><span>${t.yongShen}:</span> <strong style="color: var(--${bazi.strength.yongShen.toLowerCase()})">${t[bazi.strength.yongShen.toLowerCase()] || bazi.strength.yongShen}</strong></div>
                    </div>
                </div>
            </div>
        `;
    }

    static hideAILoading() {
        this.hideLoading();
    }

    static renderRemedies(remedies, lang) {
        // DEPRECATED: Use renderRemediesTabbed instead
        // This function is kept for backwards compatibility but redirects to the tabbed version
        return this.renderRemediesTabbed(remedies, lang);
    }

    /**
     * Render complete Chinese Astrology using the new display module
     * Includes: BaZi, Bagua diagrams, He Tu, Luo Shu, Lunar Mansion, Tai Sui
     */
    static renderChineseAstrologyComplete(data, lang, hexagramInfo = null) {
        // Render ONLY to the Analysis tab Astrology sub-panel
        const analysisAstroContent = document.getElementById('analysisAstrologyContent');
        const analysisAstroLoading = document.getElementById('analysisAstrologyLoading');

        if (analysisAstroContent) {
            analysisAstroContent.innerHTML = '';
            if (analysisAstroLoading) analysisAstroLoading.style.display = 'none';

            if (typeof ChineseAstrologyDisplay !== 'undefined') {
                const wrapper = document.createElement('div');
                wrapper.className = 'astrology-wrapper';
                const displayData = { data: data };
                const trigrams = hexagramInfo ? {
                    upper: hexagramInfo.upper?.name || hexagramInfo.upperTrigram,
                    lower: hexagramInfo.lower?.name || hexagramInfo.lowerTrigram
                } : null;

                ChineseAstrologyDisplay.render(displayData, wrapper, trigrams, lang);
                analysisAstroContent.appendChild(wrapper);
                console.log('[UI.renderChineseAstrologyComplete] Rendered to Analysis tab > Astrology');
            }
        }
    }

    static renderRemediesLegacy(remedies, lang) {
        const container = document.getElementById('remediesContent');
        const section = document.getElementById('remediesSection');
        if (!container || !section) return;

        const displayLang = (remedies && remedies[lang] && remedies[lang].remedies?.length > 0) ? lang : 'en';
        if (!remedies || !remedies[displayLang] || !remedies[displayLang].remedies?.length) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        const t = I18N[lang] || I18N['en'];
        let html = '';
        const remedyList = remedies[displayLang].remedies;
        const fuluContentList = remedies.fuluContentList || [];

        // Helper to translate remedy content asynchronously (for legacy renderer)
        const translateRemedyContentLegacy = async (remedy, lang) => {
            if (lang === 'en' || !window.translationService) return remedy;

            const fieldsToTranslate = ['relevance', 'description', 'instructions'];
            for (const field of fieldsToTranslate) {
                if (remedy[field] && typeof remedy[field] === 'string') {
                    try {
                        const translated = await window.translationService.translateText(remedy[field], lang, 'ui_content');
                        if (translated && translated !== remedy[field]) {
                            remedy[field] = translated;
                        }
                    } catch (err) {
                        console.warn(`[UI] Failed to translate remedy ${field}:`, err);
                    }
                }
            }
            return remedy;
        };

        remedyList.forEach((remedy, index) => {
            const isTalisman = remedy.type === 'fulu';
            const isFengShui = remedy.type === 'fengshui';
            const hasVisual = isTalisman || isFengShui;
            let fuluContent = fuluContentList.find(f => f.id === remedy.id) || fuluContentList[index] || {};
            
            // Merge remedy.fdl and remedy.image from backend (3-tab architecture)
            if (remedy.fdl) fuluContent.fdl = remedy.fdl;
            if (remedy.image) fuluContent.image = remedy.image;
            if (remedy.visualData?.fdl) fuluContent.fdl = remedy.visualData.fdl;
            
            const hasImage = fuluContent.image || (Array.isArray(fuluContent.image) && fuluContent.image.length > 0);
            const imageUrls = hasImage ? (Array.isArray(fuluContent.image) ? fuluContent.image : [fuluContent.image]) : [];

            const typeLabel = isTalisman ? t.talisman : isFengShui ? t.fengshui : t.medicine;
            const icon = isTalisman ? '符' : isFengShui ? '風' : '丹';
            const accentClass = isTalisman ? 'talisman-section' : isFengShui ? 'fengshui-section' : 'medicine-section';

            // Get translated remedy name
            const remedyName = this._resolveRemedyName(remedy, displayLang);
            const remedyNameZh = typeof remedy.name === 'object' ? (remedy.name.zh || '') : (remedy.nameZh || '');

            // Kick off async translation for remedy content if not English
            if (displayLang !== 'en' && window.translationService) {
                translateRemedyContentLegacy(remedy, displayLang).then(updatedRemedy => {
                    // Update DOM with translated content
                    const items = document.querySelectorAll('.remedy-item-wrapper');
                    items.forEach(item => {
                        const titleDiv = item.querySelector('.remedy-name-title .en');
                        if (titleDiv && titleDiv.textContent === remedyName) {
                            // Update relevance
                            const relevanceBox = item.querySelector('.remedy-relevance-box p');
                            if (relevanceBox && updatedRemedy.relevance) {
                                relevanceBox.innerHTML = this.formatMarkdownInline(updatedRemedy.relevance);
                            }
                            // Update description
                            const descText = item.querySelector('.remedy-description-text');
                            if (descText && updatedRemedy.description) {
                                descText.innerHTML = this.formatParagraphs(updatedRemedy.description);
                            }
                            // Update instructions
                            const instructionsBox = item.querySelector('.remedy-instructions-box p');
                            if (instructionsBox && updatedRemedy.instructions) {
                                instructionsBox.innerHTML = this.formatMarkdownInline(updatedRemedy.instructions);
                            }
                        }
                    });
                }).catch(err => console.error('[UI] Failed to translate remedy content:', err));
            }

            html += `<div class="remedy-item-wrapper ${accentClass}">
                <div class="remedy-type-header"><span class="remedy-icon-circle">${icon}</span><h3>${typeLabel}</h3></div>
                <div class="remedy-relevance-box"><span class="relevance-label">${t.relevance || 'Relevance'}:</span><p>${this.formatMarkdownInline(remedy.relevance || remedy.description || t.noRelevanceAvailable || 'This remedy supports energetic balance based on the hexagram wisdom.')}</p></div>
                <div class="remedy-layout-grid">
                    ${hasVisual ? `<div class="remedy-visual-side">
                        ${hasImage ? `<div class="fulu-image-container">${imageUrls.map(url => `<img src="${url}" class="fulu-reference-image" onclick="UI.openImageModal('${url}', '${remedyName.replace(/'/g, "\\'")}')" loading="lazy" crossorigin="anonymous" />`).join('')}</div>` : ''}
                        <div class="fulu-canvas-container"><canvas id="fuluCanvas_${index}" width="400" height="400"></canvas></div>
                    </div>` : ''}
                    <div class="remedy-info-side">
                        <div class="remedy-name-title"><span class="zh">${remedyNameZh}</span>${remedyNameZh ? `<span class="pinyin">(${remedy.pinyin || ''})</span>` : ''}<div class="en">${remedyName}</div></div>
                        <div class="remedy-description-text">${this.formatParagraphs(remedy.description)}</div>
                        ${remedy.application ? `<div class="remedy-detail-block"><strong>${t.application}:</strong><p>${this.formatMarkdownInline(remedy.application)}</p></div>` : ''}
                        ${remedy.instructions ? `<div class="remedy-instructions-box"><strong>${t.instructions}:</strong><p>${this.formatMarkdownInline(remedy.instructions)}</p></div>` : ''}
                        <div class="remedy-source-footer"><strong>${t.source}:</strong> ${this._formatSource(remedy.source)}${remedy.verification ? ` <span class="verif-tag">${remedy.verification}</span>` : ''}</div>
                    </div>
                </div>
                ${remedy.charm ? this.renderCharm(remedy.charm, t) : ''}
            </div>`;
        });

        container.innerHTML = html;

        // Render canvases
        requestAnimationFrame(() => {
            remedyList.forEach((remedy, index) => {
                if ((remedy.type === 'fulu' || remedy.type === 'fengshui') && typeof SigilTools !== 'undefined') {
                    const canvasId = `fuluCanvas_${index}`;
                    let fuluContent = fuluContentList.find(f => f.id === remedy.id) || fuluContentList[index] || {};
                    const isFengShui = remedy.type === 'fengshui';

                    // For feng shui remedies: ensure instructions are available from local DB
                    if (isFengShui && !fuluContent.instructions && typeof DAOIST_REMEDIES_DB !== 'undefined' && DAOIST_REMEDIES_DB.fengshui) {
                        const localFS = DAOIST_REMEDIES_DB.fengshui.find(f => f.id === remedy.id);
                        if (localFS?.instructions) {
                            fuluContent = { ...fuluContent, instructions: localFS.instructions };
                            console.log(`[UI:FIX] Loaded fengshui instructions for ${remedy.id} from local DB`);
                        }
                    }

                    // Server FDL is valid for a talisman only if it is NOT a fengshui diagram
                    // (the server sometimes returns a fengshui-type FDL inside fuluContent.fdl,
                    //  which causes the tiny scattered green sector-highlight dots on a white canvas)
                    const serverFdlIsUsable = fuluContent.fdl &&
                        fuluContent.fdl.type !== 'fengshui_diagram' &&
                        fuluContent.fdl.source !== 'fengshui_generator' &&
                        fuluContent.fdl.source !== 'fengshui_fallback';

                    let fdlData = null;
                    if (isFengShui) {
                        fdlData = fuluContent.fdl || this.generateFengShuiFDL(fuluContent, lang);
                    } else if (serverFdlIsUsable) {
                        fdlData = fuluContent.fdl;
                    } else {
                        // Generate client-side talisman FDL from remedy data
                        fdlData = this.generateFuluFDL({
                            ...fuluContent,
                            name: fuluContent.name || remedy.name || '',
                            sealChars: fuluContent.sealChars || fuluContent.seal_characters ||
                                (remedy.nameZh ? [...remedy.nameZh].slice(0, 4) : undefined)
                        }, lang);
                    }

                    if (document.getElementById(canvasId)) {
                        // Determine background and stroke colors based on remedy type and FDL data
                        let bgColor, strokeCol;

                        if (isFengShui) {
                            // Feng Shui uses light background with dark ink
                            bgColor = '#f4f4f9';
                            strokeCol = '#0a0a1a'; // Darker ink for better contrast
                        } else {
                            // Fulu (talisman) - use FDL background, then explicit override, then more robust golden paper default
                            bgColor = fdlData?.background || fuluContent.backgroundColor || '#fceec1';
                            // Talismans usually use cinnabar red ink deeply
                            strokeCol = '#a91b0d';
                        }

                        SigilTools.draw(canvasId, {
                            fuluContent,
                            fdl: fdlData,
                            backgroundColor: bgColor,
                            strokeColor: strokeCol
                        }, 4);
                    }
                }
            });
        });
    }

    static renderFuluDrawing(fuluDrawing, remedies, lang) {
        // Fulu drawing is now integrated into renderRemediesTabbed
        // This function exists for backwards compatibility
        console.log('[UI] renderFuluDrawing called - Fulu rendering is now handled by renderRemediesTabbed');
    }

    static renderCharm(charmText, t) {
        const parsed = this.parseCharmText(charmText);
        if (!parsed.chinese && !parsed.translation) return '';

        return `<div class="remedy-charm-container">
            <div class="charm-header-label">${t.charm} — ${t.incantation || 'Incantation'}</div>
            <div class="incantation-scroll">
                ${parsed.chinese ? `<div class="charm-section-block"><div class="charm-section-title">${t.chineseText || 'Chinese'}</div><p class="fuzhou-zh">${this.formatMarkdownInline(parsed.chinese)}</p></div>` : ''}
                ${parsed.pinyin ? `<div class="charm-section-block"><div class="charm-section-title">${t.pronunciation || 'Pronunciation'}</div><p class="fuzhou-pinyin">${this.formatMarkdownInline(parsed.pinyin)}</p></div>` : ''}
                ${parsed.translation ? `<div class="charm-section-block"><div class="charm-section-title">${t.meaning || 'Meaning'}</div><p class="fuzhou-trans">${this.formatMarkdownInline(parsed.translation)}</p></div>` : ''}
            </div>
        </div>`;
    }

    static parseCharmText(text) {
        // Simple parser for bracketed charm text
        const parts = { chinese: '', pinyin: '', translation: '' };
        if (!text) return parts;

        text = text.replace(/^\[[^\]]+\]\s*\n?/gm, ''); // Remove headers
        const sections = text.split(/\n\n+/).filter(s => s.trim());

        if (sections.length >= 3) {
            parts.chinese = sections[0].trim();
            parts.pinyin = sections[1].trim();
            parts.translation = sections.slice(2).join('\n\n').trim();
        } else if (sections.length === 2) {
            parts.chinese = sections[0].trim();
            parts.translation = sections[1].trim();
        } else {
            parts.translation = text.trim();
        }
        return parts;
    }

    static generateFengShuiFDL(content, lang) {
        // Try to use FENG_SHUI_DGL_SPEC if available
        if (typeof FENG_SHUI_DGL_SPEC !== 'undefined' && content?.instructions) {
            try {
                const instructions = Array.isArray(content.instructions) ? content.instructions : [content.instructions];
                const generated = FENG_SHUI_DGL_SPEC.helpers.generateDiagram(instructions, { lang });

                // Check if the generated diagram has actual highlight/instruction commands (not just annotations)
                const hasHighlights = generated.layers?.some(l =>
                    l.name === 'sector_highlights' && l.commands?.length > 0
                );
                const hasInstructionMarkers = generated.layers?.some(l =>
                    l.name === 'instruction_overlay' && l.commands?.length > 0
                );

                if (hasHighlights || hasInstructionMarkers) {
                    return {
                        version: "1.0",
                        background: "#f4f4f9",
                        source: "fengshui_generator",
                        layers: generated.layers
                    };
                }

                // If FENG_SHUI_DGL_SPEC produced no highlights, try enriching with DB data
                console.log('[UI.generateFengShuiFDL] FENG_SHUI_DGL_SPEC produced no highlights, enriching with DB data...');
                const dbInstructions = this._getFengShuiDBInstructions(content);
                if (dbInstructions) {
                    const enriched = FENG_SHUI_DGL_SPEC.helpers.generateDiagram(
                        Array.isArray(dbInstructions) ? dbInstructions : [dbInstructions],
                        { lang }
                    );
                    const enrichedHasContent = enriched.layers?.some(l =>
                        (l.name === 'sector_highlights' || l.name === 'instruction_overlay') && l.commands?.length > 0
                    );
                    if (enrichedHasContent) {
                        return {
                            version: "1.0",
                            background: "#f4f4f9",
                            source: "fengshui_generator_enriched",
                            layers: enriched.layers
                        };
                    }
                }
                // Fall through to generic fallback
            } catch (e) {
                console.warn('[UI.generateFengShuiFDL] FENG_SHUI_DGL_SPEC failed, falling back to generic:', e);
            }
        }
        // Fallback: generate a generic Bagua-based FDL for Feng Shui
        // Support multiple data formats from backend
        let favorable = content.favorableDirections || content.favorable || content.directions || [];

        // If no directions found, try to extract from bagua.direction or sector
        if (favorable.length === 0 && content.bagua?.direction) {
            favorable = [content.bagua.direction];
        }
        if (favorable.length === 0 && content.sector) {
            favorable = [content.sector];
        }

        // Try to look up sector from DB using remedy ID
        if (favorable.length === 0 && content.remedy?.id && typeof DAOIST_REMEDIES_DB !== 'undefined' && DAOIST_REMEDIES_DB.fengshui) {
            const localFS = DAOIST_REMEDIES_DB.fengshui.find(f => f.id === content.remedy.id);
            if (localFS?.fdl?.sector) {
                favorable = [localFS.fdl.sector];
            } else if (localFS?.bagua?.direction) {
                favorable = [localFS.bagua.direction];
            }
        }

        // If still no directions, try to parse from instructions text (content or remedy)
        const instructionsSource = content.instructions || content.remedy?.instructions;
        if (favorable.length === 0 && instructionsSource) {
            const instructions = Array.isArray(instructionsSource) ? instructionsSource.join(' ') : instructionsSource;
            // Match patterns like "North (Kan)", "Southeast (Xun)", "South (Li)", etc.
            const directionMatches = instructions.match(/\b(North|South|East|West|Southeast|Southwest|Northeast|Northwest)\s*\([A-Z][a-z]+\)/g);
            if (directionMatches) {
                const dirMap = {
                    'North': 'N', 'South': 'S', 'East': 'E', 'West': 'W',
                    'Southeast': 'SE', 'Southwest': 'SW', 'Northeast': 'NE', 'Northwest': 'NW'
                };
                favorable = directionMatches.map(match => {
                    const dirName = match.split('(')[0].trim();
                    return dirMap[dirName];
                }).filter(Boolean);
            }
        }

        // Last resort: parse bare direction names without parenthesized trigram name
        if (favorable.length === 0 && instructionsSource) {
            const instructions = Array.isArray(instructionsSource) ? instructionsSource.join(' ') : instructionsSource;
            const dirMap = {
                'Northwest': 'NW', 'Northeast': 'NE', 'Southwest': 'SW', 'Southeast': 'SE',
                'North': 'N', 'South': 'S', 'East': 'E', 'West': 'W'
            };
            // Check longest names first to avoid partial matches
            for (const [dirName, dirCode] of Object.entries(dirMap)) {
                const regex = new RegExp(`\\b${dirName}\\b`, 'i');
                if (regex.test(instructions) && !favorable.includes(dirCode)) {
                    favorable.push(dirCode);
                }
            }
        }

        console.log(`[UI.generateFengShuiFDL] Content keys:`, Object.keys(content));
        console.log(`[UI.generateFengShuiFDL] Favorable directions:`, favorable);

        // Build highlight commands for favorable directions
        const highlightCommands = favorable.map(dir => {
            const trigram = this._directionToTrigram(dir);
            if (!trigram) return null;
            return {
                type: "highlight_sector",
                trigram: trigram,
                style: { fill: "#00FF0040", stroke: "#00FF00", strokeWidth: 3, glow: true, glowColor: "#00FF00" }
            };
        }).filter(Boolean);

        return {
            version: "2.0",
            background: "#f4f4f9",
            source: "fengshui_fallback",
            type: "fengshui_diagram",
            layers: [
                {
                    name: "base_bagua",
                    type: "base_layer",
                    commands: [
                        { type: "bagua", cx: 500, cy: 500, size: 900, arrangement: "houtian" }
                    ]
                },
                {
                    name: "directions",
                    type: "highlight_layer",
                    commands: highlightCommands
                }
            ]
        };
    }

    static _directionToTrigram(dir) {
        const map = { 'S': 'Li', 'SE': 'Xun', 'E': 'Zhen', 'NE': 'Gen', 'N': 'Kan', 'NW': 'Qian', 'W': 'Dui', 'SW': 'Kun' };
        return map[dir] || null;
    }

    // Look up the static DB instructions for a fengshui remedy (which contain direction keywords)
    static _getFengShuiDBInstructions(content) {
        const remedyId = content.remedy?.id || content.id;
        if (!remedyId || typeof DAOIST_REMEDIES_DB === 'undefined' || !DAOIST_REMEDIES_DB.fengshui) return null;
        const dbEntry = DAOIST_REMEDIES_DB.fengshui.find(f => f.id === remedyId);
        return dbEntry?.instructions || null;
    }

    // Remedy name translations for common remedies
    static REMEDY_NAME_TRANSLATIONS = {
        'Anti-Gossip Talisman': { es: 'Talismán Anti-Chismes', it: 'Talismano Anti-Pettegolezzi' },
        'Celestial Master Healing Talisman': { es: 'Talismán de Sanación del Maestro Celestial', it: 'Talismano di Guarigione del Maestro Celeste' },
        'Celestial Master\'s Five Thunders Talisman': { es: 'Talismán de los Cinco Truenos del Maestro Celestial', it: 'Talismano dei Cinque Tuoni del Maestro Celeste' },
        'Chief Artisan Talisman': { es: 'Talismán del Jefe Artesano', it: 'Talismano del Capo Artigiano' },
        'Divine Incantation for Purifying Heaven and Earth': { es: 'Encantación Divina para Purificar el Cielo y la Tierra', it: 'Incantesimo Divino per Purificare il Cielo e la Terra' },
        'Dui Palace Feng Shui — West (Children & Creativity)': { es: 'Feng Shui del Palacio Dui — Oeste (Hijos y Creatividad)', it: 'Feng Shui del Palazzo Dui — Ovest (Figli e Creatività)' },
        'Emissaries of Three Realms': { es: 'Emisarios de los Tres Reinos', it: 'Emissari dei Tre Regni' },
        'Five Element Qi-Vein Stabilization': { es: 'Estabilización del Qi-Vena de los Cinco Elementos', it: 'Stabilizzazione del Qi-Vena dei Cinque Elementi' },
        'Five Roads Wealth God Talisman': { es: 'Talismán del Dios de la Riqueza de los Cinco Caminos', it: 'Talismano del Dio della Ricchezza delle Cinque Strade' },
        'Five Talismans of Numinous Treasure': { es: 'Cinco Talismanes del Tesoro Numinoso', it: 'Cinque Talismani del Tesoro Numinoso' },
        'Gen Palace Feng Shui — Northeast (Knowledge & Wisdom)': { es: 'Feng Shui del Palacio Gen — Noreste (Conocimiento y Sabiduría)', it: 'Feng Shui del Palazzo Gen — Nordest (Conoscenza e Saggezza)' },
        'Golden Light Divine Incantation': { es: 'Encantación Divina de la Luz Dorada', it: 'Incantesimo Divino della Luce Dorata' },
        'Great Peace Talisman': { es: 'Talismán de la Gran Paz', it: 'Talismano della Grande Pace' },
        'Green-Black Universal Salvation': { es: 'Salvación Universal Verde-Negra', it: 'Salvezza Universale Verde-Nera' },
        'Harmonizing the Five Organs and Six Fu': { es: 'Armonización de los Cinco Órganos y las Seis Fu', it: 'Armonizzazione dei Cinque Organi e dei Sei Fu' },
        'Heavenly Mound Incantation': { es: 'Encantación del Montículo Celestial', it: 'Incantesimo del Tumulo Celeste' },
        'Heavenly Mound Talisman': { es: 'Talismán del Montículo Celestial', it: 'Talismano del Tumulo Celeste' },
        'Hua Tong Ming Talisman': { es: 'Talismán Hua Tong Ming', it: 'Talismano Hua Tong Ming' },
        'Jade Purity Brahma Talisman': { es: 'Talismán Brahma de la Pureza de Jade', it: 'Talismano Brahma della Purezza di Giada' },
        'Kan Palace Feng Shui — North (Career & Life Path)': { es: 'Feng Shui del Palacio Kan — Norte (Carrera y Camino de Vida)', it: 'Feng Shui del Palazzo Kan — Nord (Carriera e Percorso di Vita)' },
        'Kan-Li Fire and Water Balancing (Golden Elixir)': { es: 'Equilibrio de Fuego y Agua Kan-Li (Elixir Dorado)', it: 'Equilibrio Fuoco e Acqua Kan-Li (Elisir d\'Oro)' },
        'Kun Palace Feng Shui — Southwest (Love & Relationships)': { es: 'Feng Shui del Palacio Kun — Suroeste (Amor y Relaciones)', it: 'Feng Shui del Palazzo Kun — Sudovest (Amore e Relazioni)' },
        'Li Palace Feng Shui — South (Fame & Reputation)': { es: 'Feng Shui del Palacio Li — Sur (Fama y Reputación)', it: 'Feng Shui del Palazzo Li — Sud (Fama e Reputazione)' },
        'Lord Deng Thunder Deity Talisman': { es: 'Talismán de la Deidad del Trueno del Señor Deng', it: 'Talismano della Divinità del Tuono del Signore Deng' },
        'Lord Guan\'s Protection Talisman': { es: 'Talismán de Protección del Señor Guan', it: 'Talismano di Protezione del Signore Guan' },
        'Maoshan Harmony Talisman': { es: 'Talismán de la Armonía Maoshan', it: 'Talismano dell\'Armonia Maoshan' },
        'Mirror Talisman': { es: 'Talismán del Espejo', it: 'Talismano dello Specchio' },
        'Nine Palaces Talisman': { es: 'Talismán de los Nueve Palacios', it: 'Talismano dei Nove Palazzi' },
        'Nine-Phoenix Destroyer of Filth': { es: 'Destructor de Inmundicia de las Nueve Fénix', it: 'Distruttore di Immondizia delle Nove Fenici' },
        'Northern Dipper Talisman for Releasing Misfortunes': { es: 'Talismán de la Osa Mayor para Liberar Desgracias', it: 'Talismano del Grande Carro per Liberare le Sventure' },
        'Perfect Writs of the Five Sprouts': { es: 'Escritos Perfectos de los Cinco Brotes', it: 'Scritti Perfetti dei Cinque Germogli' },
        'Plain Numinosity Talisman': { es: 'Talismán de la Numinosidad Pura', it: 'Talismano della Numinosità Pura' },
        'Qian Palace Feng Shui — Northwest (Helpful People & Travel)': { es: 'Feng Shui del Palacio Qian — Noroeste (Personas Ayudantes y Viajes)', it: 'Feng Shui del Palazzo Qian — Nordovest (Persone Utili e Viaggi)' },
        'Red Writing on Five Tablets': { es: 'Escritura Roja en Cinco Tabletas', it: 'Scrittura Rossa su Cinque Tavolette' },
        'Seal of Marshal Tianpeng': { es: 'Sello del Mariscal Tianpeng', it: 'Sigillo del Marisciallo Tianpeng' },
        'Seal of the Yangping Jurisdiction': { es: 'Sello de la Jurisdicción de Yangping', it: 'Sigillo della Giurisdizione di Yangping' },
        'Secret Language of Great Brahma': { es: 'Lenguaje Secreto del Gran Brahma', it: 'Linguaggio Segreto del Grande Brahma' },
        'Soul Stabilization Peace Talisman': { es: 'Talismán de Paz para la Estabilización del Alma', it: 'Talismano di Pace per la Stabilizzazione dell\'Anima' },
        'Sword Talisman': { es: 'Talismán de la Espada', it: 'Talismano della Spada' },
        'Taiji Central Palace Feng Shui — Center (Health & Unity)': { es: 'Feng Shui del Palacio Central Taiji — Centro (Salud y Unidad)', it: 'Feng Shui del Palazzo Centrale Taiji — Centro (Salute e Unità)' },
        'Talisman for Expelling Sickness and Death': { es: 'Talismán para Expulsar la Enfermedad y la Muerte', it: 'Talismano per Scacciare la Malattia e la Morte' },
        'Talisman of Duke Yin Guarding the Pass': { es: 'Talismán del Duque Yin Guardando el Paso', it: 'Talismano del Duca Yin che Protegge il Passo' },
        'Talisman of Duke Yin for Separation': { es: 'Talismán del Duque Yin para la Separación', it: 'Talismano del Duca Yin per la Separazione' },
        'Talisman of Officers Wang and Ma': { es: 'Talismán de los Oficiales Wang y Ma', it: 'Talismano degli Ufficiali Wang e Ma' },
        'Talisman of the Sanxiao Goddesses': { es: 'Talismán de las Diosas Sanxiao', it: 'Talismano delle Dee Sanxiao' },
        'Talisman of the Seventh Lord of the Northern Dipper': { es: 'Talismán del Séptimo Señor de la Osa Mayor', it: 'Talismano del Settimo Signore del Grande Carro' },
        'Talisman to Open the Mind': { es: 'Talismán para Abrir la Mente', it: 'Talismano per Aprire la Mente' },
        'Three Sovereigns Talisman': { es: 'Talismán de los Tres Soberanos', it: 'Talismano dei Tre Sovrani' },
        'True Talismans of the Eight Effulgences': { es: 'Verdaderos Talismanes de las Ocho Efulgencias', it: 'Vere Talismano delle Otto Effulgenze' },
        'True Writs of the Eight Archivists': { es: 'Escritos Verdaderos de los Ocho Archiveros', it: 'Scritti Veri degli Otto Archivisti' },
        'Xun Palace Feng Shui — Southeast (Wealth & Abundance)': { es: 'Feng Shui del Palacio Xun — Sureste (Riqueza y Abundancia)', it: 'Feng Shui del Palazzo Xun — Sudest (Ricchezza e Abbondanza)' },
        'Yellow Register Talisman': { es: 'Talismán del Registro Amarillo', it: 'Talismano del Registro Giallo' },
        'Zhaijing Residence Stabilization': { es: 'Estabilización de la Residencia Zhaijing', it: 'Stabilizzazione della Residenza Zhaijing' },
        'Zhen Palace Feng Shui — East (Family & Health)': { es: 'Feng Shui del Palacio Zhen — Este (Familia y Salud)', it: 'Feng Shui del Palazzo Zhen — Est (Famiglia e Salute)' },
    };

    // Resolve remedy name from object {zh, en, pinyin} to a display string
    static _resolveRemedyName(remedy, lang) {
        if (!remedy?.name) return 'Unknown Remedy';
        // Object form: { zh, en, pinyin, es, it... }
        if (typeof remedy.name === 'object') {
            // Direct language match
            if (remedy.name[lang]) return remedy.name[lang];
            // Fallback: check REMEDY_NAME_TRANSLATIONS using the English name
            const enName = remedy.name.en || '';
            if (enName && lang !== 'en') {
                const translation = this.REMEDY_NAME_TRANSLATIONS[enName]?.[lang];
                if (translation) return translation;
            }
            return enName || remedy.name.zh || remedy.name.pinyin || 'Unknown Remedy';
        }
        // String form - check translation map
        if (typeof remedy.name === 'string') {
            const translation = this.REMEDY_NAME_TRANSLATIONS[remedy.name]?.[lang];
            return translation || remedy.name;
        }
        return String(remedy.name);
    }

    // Format source object or string for display
    static _formatSource(source) {
        if (!source) return '';
        // If it's already a string, return it cleaned
        if (typeof source === 'string') {
            return this.formatMarkdownInline(source);
        }
        // If it's an object, format it nicely
        if (typeof source === 'object') {
            const parts = [];
            if (source.textTitle || source.title) {
                parts.push(`<em>${source.textTitle || source.title}</em>`);
            }
            if (source.primary) {
                parts.push(source.primary);
            }
            if (source.references && Array.isArray(source.references)) {
                parts.push(`[${source.references.join(', ')}]`);
            }
            return parts.join(', ') || JSON.stringify(source);
        }
        return String(source);
    }

    // Generate a Five Elements / Yin-Yang medicine diagram — NOT a fulu talisman
    static generateMedicineFDL(content, lang) {
        const t = I18N[lang] || I18N['en'];
        return {
            version: "2.0",
            background: "#1a1a2e",
            source: "medicine_generator",
            type: "medicine_diagram",
            layers: [
                {
                    name: "base",
                    type: "base_layer",
                    commands: [
                        // Central Taijitu (Yin-Yang symbol)
                        { type: "taijitu", x: 500, y: 500, size: 200 },
                        // Five Element ring labels around the taijitu
                        { type: "text", content: "火 Fire", x: 500, y: 200, size: 28, style: { color: "#F44336", font: "NotoSerifSC" } },
                        { type: "text", content: "水 Water", x: 500, y: 800, size: 28, style: { color: "#2196F3", font: "NotoSerifSC" } },
                        { type: "text", content: "木 Wood", x: 850, y: 500, size: 28, style: { color: "#4CAF50", font: "NotoSerifSC" } },
                        { type: "text", content: "金 Metal", x: 150, y: 500, size: 28, style: { color: "#FFC107", font: "NotoSerifSC" } },
                        { type: "text", content: "土 Earth", x: 500, y: 500, size: 24, style: { color: "#FFB74D", font: "NotoSerifSC" } }
                    ]
                },
                {
                    name: "connections",
                    type: "overlay_layer",
                    commands: [
                        // Generating cycle arrows (simplified as lines)
                        { type: "text", content: "丹", x: 500, y: 130, size: 50, style: { color: "#d4af37", font: "NotoSerifSC" } },
                        { type: "text", content: "— 內丹 Internal Alchemy —", x: 500, y: 900, size: 18, style: { color: "#d4af37AA" } }
                    ]
                }
            ]
        };
    }

    static generateFuluFDL(content, lang) {
        // Generate basic FDL for talisman (Fulu) rendering
        const sealChars = content.sealChars || content.seal_characters || ['符', '咒'];
        const t = I18N[lang] || I18N['en'];

        const instText = content.instructions || content.remedy?.instructions;
        const numChars = sealChars.length;
        const mainY = numChars > 2 ? 600 : 640;

        const layers = [
            {
                name: "base",
                type: "base_layer",
                commands: [
                    // Mountain at top (y=150)
                    { type: "mountain", x: 500, y: 150, size: 120, style: { color: "#a91b0d", width: 6 } },
                    // Taijitu in center
                    { type: "taijitu", x: 500, y: 380, size: 140, style: { color: "#a91b0d", width: 6 } },
                    // Seal characters below center
                    { type: "seal_char", chars: sealChars, x: 500, y: mainY, size: numChars > 2 ? 60 : 100, style: { color: "#a91b0d" } }
                ]
            },
            {
                name: "title",
                type: "text_layer",
                commands: [
                    // Title at top
                    { type: "text", text: content.name || t.talisman || 'Fulu', x: 500, y: 60, style: { fontSize: 36, color: "#a91b0d", bold: true } }
                ]
            }
        ];

        if (instText) {
            const displayInst = typeof instText === 'string' ? instText : (Array.isArray(instText) ? instText.join(' ') : 'Usage Instructions');
            layers.push({
                name: "instructions",
                type: "text_layer",
                commands: [
                    { type: "text", text: displayInst.substring(0, 44) + (displayInst.length > 44 ? '...' : ''), x: 500, y: 920, style: { fontSize: 24, color: "#444444" } }
                ]
            });
        }

        return {
            version: "2.0",
            background: content.backgroundColor || "#fceec1", // robust golden yellow paper
            source: "fulu_generator",
            layers: layers
        };
    }

    static showLoading(text, subtext = '') {
        const overlay = document.getElementById('apiLoadingOverlay');
        const textEl = document.getElementById('loadingText');
        const subtextEl = overlay.querySelector('.loading-subtext');

        if (textEl) textEl.textContent = text;
        if (subtext && subtextEl) subtextEl.innerHTML = `${subtext}<span class="loading-dots"></span>`;

        overlay.classList.add('active');
        document.body.classList.add('loading-active');
    }

    static hideLoading() {
        document.getElementById('apiLoadingOverlay').classList.remove('active');
        document.body.classList.remove('loading-active');
    }

    static renderRemediesLoading(lang) {
        const container = document.getElementById('remedies-content-area');
        if (container) {
            container.innerHTML = `<div class="loading-placeholder"><div class="loading"></div> ${I18N[lang]?.loading || 'Loading...'} ${I18N[lang]?.remedies || 'Remedies'}</div>`;
        }
    }

    static renderRemediesError(lang) {
        const container = document.getElementById('remedies-content-area');
        const t = I18N[lang] || I18N['en'];
        if (container) container.innerHTML = `<div class="error-placeholder">${t.remedies || 'Remedies'} ${t.unavailable || 'unavailable'}</div>`;
    }

    static renderBaguaMedicineLoading(lang) {
        const container = document.getElementById('baguaMedicine-content-area');
        if (container) {
            container.innerHTML = `<div class="loading-placeholder"><div class="loading"></div> ${I18N[lang]?.loading || 'Loading...'} ${I18N[lang]?.baguaMedicineTitle || 'Bagua Medicine'}</div>`;
        }
    }

    static renderBaguaMedicineError(lang) {
        const container = document.getElementById('baguaMedicine-content-area');
        if (container) container.innerHTML = `<div class="error-placeholder">Bagua Medicine unavailable</div>`;
    }

    static _translateDirection(dir, lang) {
        if (!dir) return '';
        const t = I18N[lang] || I18N['en'];
        let d = dir.trim();
        // Standardize input mostly (it comes in as N, S, NE, SW or North, South)
        const match = d.match(/^(North|South|East|West|NE|NW|SE|SW|N|S|E|W)(\s*.*)?$/i);
        if (match) {
            const key = match[1].toUpperCase();
            const rest = match[2] || '';
            const map = {
                'NORTH': 'N', 'N': 'N',
                'SOUTH': 'S', 'S': 'S',
                'EAST': 'E', 'E': 'E',
                'WEST': 'W', 'W': 'W',
                'NORTHEAST': 'NE', 'NE': 'NE',
                'NORTHWEST': 'NW', 'NW': 'NW',
                'SOUTHEAST': 'SE', 'SE': 'SE',
                'SOUTHWEST': 'SW', 'SW': 'SW'
            };
            const stdKey = map[key];
            if (stdKey && t.directions && t.directions[stdKey]) {
                return t.directions[stdKey] + rest;
            }
            // Fallback translations if t.directions missing
            const fallbackEs = { 'N': 'Norte', 'S': 'Sur', 'E': 'Este', 'W': 'Oeste', 'NE': 'Noreste', 'NW': 'Noroeste', 'SE': 'Sureste', 'SW': 'Suroeste' };
            if (lang === 'es' && fallbackEs[stdKey]) return fallbackEs[stdKey] + rest;
        }
        return d;
    }

    static renderBaguaMedicine(data, lang) {
        console.log(`[UI.renderBaguaMedicine] Called`, data ? 'has data' : 'no data');
        const tabContentArea = document.getElementById('baguaMedicine-content-area');
        if (!tabContentArea) {
            console.warn(`[UI.renderBaguaMedicine] Container not found`);
            return;
        }
        if (!data) {
            console.warn(`[UI.renderBaguaMedicine] No data provided`);
            return;
        }

        const content = data[lang] || data.en || data;
        if (!content) {
            console.warn(`[UI.renderBaguaMedicine] No content available for lang ${lang}`);
            return;
        }
        const t = I18N[lang] || I18N['en'];

        // Generate unique canvas IDs for houtian and xiantian diagrams
        const ts = Date.now();
        const canvasId = 'baguaMedicineDiagram_hou_' + ts;
        const canvasId2 = 'baguaMedicineDiagram_xia_' + ts;

        let html = `<div class="remedy-item-wrapper medicine-section interp-item-wrapper">
             <div class="remedy-type-header"><span class="remedy-icon-circle">丹</span><h3>${t.baguaMedicineTitle}</h3></div>
             <div class="bagua-medicine-layout">
                <div class="bagua-diagrams-col">
                    <div class="bagua-diagram-container">
                        <div class="bagua-arrangement-label">後天 · Hòu Tiān</div>
                        <canvas id="${canvasId}" width="300" height="300" class="bagua-medicine-canvas"></canvas>
                        <div class="bagua-diagram-legend">
                            <span class="legend-item favorable"><span class="legend-color"></span> ${t.favorable || 'Favorable'}</span>
                            ${content.fengShui?.unfavorable ? `<span class="legend-item unfavorable"><span class="legend-color"></span> ${t.unfavorable || 'Unfavorable'}</span>` : ''}
                        </div>
                    </div>
                    <div class="bagua-diagram-container">
                        <div class="bagua-arrangement-label">先天 · Xiān Tiān</div>
                        <canvas id="${canvasId2}" width="300" height="300" class="bagua-medicine-canvas"></canvas>
                    </div>
                </div>
                <div class="remedy-info-side">`;

        const translatedFavorable = content.fengShui?.favorable ? content.fengShui.favorable.map(dir => this._translateDirection(dir, lang)) : null;
        const translatedUnfavorable = content.fengShui?.unfavorable ? content.fengShui.unfavorable.map(dir => this._translateDirection(dir, lang)) : null;

        if (content.fengShui) {
            html += `<div class="bagua-med-block feng-shui-block">
                <h3 class="bagua-med-title">${t.fengShui}</h3>`;
            // Format A: bagua-medicine endpoint (favorable/unfavorable arrays + guidance)
            if (translatedFavorable) {
                html += `<div class="feng-directions"><div class="feng-favorable"><strong>${t.favorable}:</strong> ${translatedFavorable.join(', ')}</div></div>`;
            }
            if (translatedUnfavorable) {
                html += `<div class="feng-directions"><div class="feng-unfavorable"><strong>${t.unfavorable || 'Unfavorable'}:</strong> ${translatedUnfavorable.join(', ')}</div></div>`;
            }
            if (content.fengShui.guidance) {
                html += `<div class="feng-guidance">${this.formatParagraphs(content.fengShui.guidance)}</div>`;
            }
            // Format B: fengshui-medicine-tab endpoint (directions/sectors/timing strings)
            if (content.fengShui.directions) {
                html += `<div class="feng-guidance">${this.formatParagraphs(content.fengShui.directions)}</div>`;
            }
            if (content.fengShui.sectors) {
                html += `<div class="feng-guidance">${this.formatParagraphs(content.fengShui.sectors)}</div>`;
            }
            if (content.fengShui.timing) {
                html += `<div class="feng-guidance"><em>${this.formatParagraphs(content.fengShui.timing)}</em></div>`;
            }
            html += `</div>`;
        }

        if (content.medicine) {
            html += `<div class="bagua-med-block medicine-block"><h3 class="bagua-med-title">${t.medicine}</h3>`;
            if (Array.isArray(content.medicine)) {
                // Format A: Array of remedy objects
                content.medicine.forEach(m => {
                    html += `<div class="medicine-item"><strong>${m.name || ''}</strong>${m.element ? ' (' + m.element + ')' : ''}: ${m.description || m.application || ''}</div>`;
                });
            } else if (typeof content.medicine === 'object') {
                // Format B: Object with recommendations/dietary/practices
                if (content.medicine.recommendations) {
                    html += `<div class="medicine-item">${this.formatParagraphs(content.medicine.recommendations)}</div>`;
                }
                if (content.medicine.dietary) {
                    html += `<div class="medicine-item">${this.formatParagraphs(content.medicine.dietary)}</div>`;
                }
                if (content.medicine.practices) {
                    html += `<div class="medicine-item">${this.formatParagraphs(content.medicine.practices)}</div>`;
                }
            } else if (typeof content.medicine === 'string') {
                html += `<div class="medicine-item">${this.formatParagraphs(content.medicine)}</div>`;
            }
            html += `</div>`;
        }

        html += `</div></div></div>`;

        // Only render to tabbed container
        tabContentArea.innerHTML = html;

        // Check if Medicine tab is visible or in read mode
        const medicineTab = document.getElementById('tab-medicine');
        const isTabActive = medicineTab && medicineTab.classList.contains('active');
        const isReadMode = document.body.classList.contains('single-read-mode');
        const isVisible = isTabActive || isReadMode;

        console.log(`[UI.renderBaguaMedicine] Tab visible: ${isVisible}, read mode: ${isReadMode}`);

        // Store both canvas IDs for deferred rendering
        this._pendingBaguaMedicineRender = {
            canvasId,
            canvasId2,
            fengShui: content.fengShui,
            lang
        };

        // Render immediately if visible, otherwise defer
        if (isVisible) {
            setTimeout(() => {
                console.log(`[UI.renderBaguaMedicine] Rendering both diagrams immediately`);
                this.renderBaguaMedicineDiagram(canvasId, content.fengShui, lang);
                this.renderBaguaMedicineDiagramXiantian(canvasId2, content.fengShui, lang);
            }, 100);
        } else {
            console.log(`[UI.renderBaguaMedicine] Rendering deferred until tab activation`);
        }
    }

    static renderBaguaMedicineDiagram(canvasId, fengShuiData, lang) {
        console.log(`[UI.renderBaguaMedicineDiagram] Called for ${canvasId}`, fengShuiData ? 'has data' : 'no data');
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`[UI.renderBaguaMedicineDiagram] Canvas ${canvasId} not found`);
            return;
        }
        if (typeof SigilTools === 'undefined') {
            console.warn(`[UI.renderBaguaMedicineDiagram] SigilTools not loaded`);
            return;
        }
        if (!fengShuiData) {
            console.warn(`[UI.renderBaguaMedicineDiagram] No fengShuiData`);
            return;
        }

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        // Use FDL from endpoint if available
        if (fengShuiData.visualData?.fdl && SigilTools.drawFDL) {
            try {
                SigilTools.drawFDL(ctx, w, h, fengShuiData.visualData.fdl, '#d4af37');
                return;
            } catch (e) {
                console.warn('[UI] FDL rendering failed, falling back to manual:', e);
            }
        }

        // Fallback: Build highlight style based on favorable/unfavorable directions
        const cx = w / 2;
        const cy = h / 2;
        const size = Math.min(w, h) * 0.85;
        const style = { activeTrigrams: [] };
        const highlightColors = {};

        // Map direction names to trigram names
        const directionToTrigram = {
            'S': 'Li', 'South': 'Li', 'Sur': 'Li',
            'SW': 'Kun', 'Southwest': 'Kun', 'Suroeste': 'Kun',
            'W': 'Dui', 'West': 'Dui', 'Oeste': 'Dui',
            'NW': 'Qian', 'Northwest': 'Qian', 'Noroeste': 'Qian',
            'N': 'Kan', 'North': 'Kan', 'Norte': 'Kan',
            'NE': 'Gen', 'Northeast': 'Gen', 'Noreste': 'Gen',
            'E': 'Zhen', 'East': 'Zhen', 'Este': 'Zhen',
            'SE': 'Xun', 'Southeast': 'Xun', 'Sureste': 'Xun'
        };

        // Process favorable directions
        if (fengShuiData.favorable && Array.isArray(fengShuiData.favorable)) {
            fengShuiData.favorable.forEach(dir => {
                const trimmed = dir.trim();
                const trigram = directionToTrigram[trimmed];
                if (trigram) {
                    style.activeTrigrams.push(trigram);
                    highlightColors[trigram] = '#4CAF50'; // Green for favorable
                }
            });
        }

        // Process unfavorable directions
        if (fengShuiData.unfavorable && Array.isArray(fengShuiData.unfavorable)) {
            fengShuiData.unfavorable.forEach(dir => {
                const trimmed = dir.trim();
                const trigram = directionToTrigram[trimmed];
                if (trigram && !highlightColors[trigram]) {
                    style.activeTrigrams.push(trigram);
                    highlightColors[trigram] = '#F44336'; // Red for unfavorable
                }
            });
        }

        // Draw the Bagua with highlights
        SigilTools.drawBagua(ctx, cx, cy, size, style, '#d4af37');

        // Draw additional highlights for favorable/unfavorable
        const trigramInfo = [
            { name: 'Li', dir: 'S', angle: -Math.PI / 2 },
            { name: 'Kun', dir: 'SW', angle: -3 * Math.PI / 4 },
            { name: 'Dui', dir: 'W', angle: Math.PI },
            { name: 'Qian', dir: 'NW', angle: 3 * Math.PI / 4 },
            { name: 'Kan', dir: 'N', angle: Math.PI / 2 },
            { name: 'Gen', dir: 'NE', angle: Math.PI / 4 },
            { name: 'Zhen', dir: 'E', angle: 0 },
            { name: 'Xun', dir: 'SE', angle: -Math.PI / 4 }
        ];

        trigramInfo.forEach(t => {
            if (highlightColors[t.name]) {
                const color = highlightColors[t.name];
                const isFavorable = color === '#4CAF50';
                const r = size * 0.38;
                const x = cx + Math.cos(t.angle) * r;
                const y = cy + Math.sin(t.angle) * r;
                const markerR = size * 0.12;

                // Draw filled sector highlight with higher opacity
                ctx.beginPath();
                ctx.arc(x, y, markerR, 0, Math.PI * 2);
                ctx.fillStyle = color + '55'; // ~33% opacity
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Draw glow effect
                ctx.save();
                ctx.shadowColor = color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(x, y, markerR * 0.7, 0, Math.PI * 2);
                ctx.strokeStyle = color + '80';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();

                // Draw direction label
                const translatedDir = typeof UI !== 'undefined' && UI._translateDirection ? UI._translateDirection(t.dir, lang) : t.dir;
                ctx.fillStyle = color;
                ctx.font = `bold ${size * 0.055}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(translatedDir, x, y - markerR * 0.2);

                // Draw favorable/unfavorable indicator symbol
                ctx.font = `${size * 0.04}px sans-serif`;
                ctx.fillText(isFavorable ? '✓' : '✗', x, y + markerR * 0.45);
            }
        });
    }

    /**
     * Render the Xiantian (Earlier Heaven / 先天) Bagua diagram for the medicine section.
     * Uses drawSingleBagua with arrangement:'xiantian', mapping the same favorable/unfavorable
     * directions to their xiantian trigram positions.
     */
    static renderBaguaMedicineDiagramXiantian(canvasId, fengShuiData, lang) {
        console.log(`[UI.renderBaguaMedicineDiagramXiantian] Called for ${canvasId}`);
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof SigilTools === 'undefined' || !fengShuiData) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            setTimeout(() => this.renderBaguaMedicineDiagramXiantian(canvasId, fengShuiData, lang), 200);
            return;
        }

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const size = Math.min(w, h) * 0.88;

        // Xiantian direction → trigram mapping (Earlier Heaven arrangement)
        const xiantianDirMap = {
            'S': 'Qian', 'SE': 'Dui', 'E': 'Li', 'NE': 'Zhen',
            'N': 'Kun', 'NW': 'Gen', 'W': 'Kan', 'SW': 'Xun',
            'South': 'Qian', 'Southeast': 'Dui', 'East': 'Li', 'Northeast': 'Zhen',
            'North': 'Kun', 'Northwest': 'Gen', 'West': 'Kan', 'Southwest': 'Xun'
        };

        const activeTrigrams = [];
        const highlightColors = {};

        (fengShuiData.favorable || []).forEach(dir => {
            const tg = xiantianDirMap[dir.trim()];
            if (tg) { activeTrigrams.push(tg); highlightColors[tg] = '#4CAF50'; }
        });
        (fengShuiData.unfavorable || []).forEach(dir => {
            const tg = xiantianDirMap[dir.trim()];
            if (tg && !highlightColors[tg]) { activeTrigrams.push(tg); highlightColors[tg] = '#F44336'; }
        });

        // Draw xiantian Bagua with highlights
        SigilTools.drawSingleBagua(ctx, cx, cy, size, {
            arrangement: 'xiantian',
            activeTrigrams,
            label: null,
            stroke: '#d4af37',
            highlightColor: Object.values(highlightColors)[0] || '#4CAF50',
            translateDirection: (dir) => typeof UI !== 'undefined' && UI._translateDirection ? UI._translateDirection(dir, lang) : dir
        });

        // Overlay colored rings for each highlighted trigram
        const xiantianAngles = {
            'Qian': -Math.PI / 2, 'Dui': -Math.PI / 4, 'Li': 0, 'Zhen': Math.PI / 4,
            'Kun': Math.PI / 2, 'Gen': 3 * Math.PI / 4, 'Kan': Math.PI, 'Xun': -3 * Math.PI / 4
        };
        // Reverse direction map: trigram → houtian direction (for labels)
        const trigramToDir = {};
        Object.entries(xiantianDirMap).forEach(([dir, tg]) => {
            if (dir.length <= 2) trigramToDir[tg] = dir; // Use short forms (S, NE, etc.)
        });

        Object.entries(highlightColors).forEach(([tg, color]) => {
            const angle = xiantianAngles[tg];
            if (angle === undefined) return;
            const isFavorable = color === '#4CAF50';
            const r = size * 0.38;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            const markerR = size * 0.12;

            // Filled highlight with higher opacity
            ctx.beginPath();
            ctx.arc(x, y, markerR, 0, Math.PI * 2);
            ctx.fillStyle = color + '55';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Glow effect
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x, y, markerR * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = color + '80';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // Favorable/unfavorable symbol
            ctx.fillStyle = color;
            ctx.font = `bold ${size * 0.04}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isFavorable ? '✓' : '✗', x, y);
        });
    }

    static renderXiantianInterpretation(data, lang) {
        const container = document.getElementById('xiantianSection');
        if (!container) {
            // Create section if it doesn't exist
            this.createXiantianSection();
        }

        const section = document.getElementById('xiantianSection');
        const content = document.getElementById('xiantianContent');
        if (!section || !content) return;

        const t = I18N[lang] || I18N['en'];
        const interp = data.interpretation || {};

        const canvasId = 'xiantianDiagram_' + Date.now();

        let html = `
            <div class="xiantian-layout">
                <div class="xiantian-diagram-container">
                    <canvas id="${canvasId}" width="400" height="400" class="xiantian-canvas"></canvas>
                    <div class="xiantian-legend">
                        <span class="legend-item xiantian-legend-item">
                            <span class="legend-color" style="background:#FF9800"></span> 
                            ${t.xiantian || 'Early Heaven (Xiantian)'}
                        </span>
                    </div>
                </div>
                <div class="xiantian-content">`;

        if (interp.spiritualEssence) {
            html += `<div class="xiantian-section">
                <h4>${t.spiritualEssence || 'Spiritual Essence'}</h4>
                <p>${interp.spiritualEssence}</p>
            </div>`;
        }

        if (interp.innerAlchemy) {
            html += `<div class="xiantian-section">
                <h4>${t.innerAlchemy || 'Inner Alchemy'}</h4>
                <p>${interp.innerAlchemy}</p>
            </div>`;
        }

        if (interp.cultivationAdvice) {
            html += `<div class="xiantian-section">
                <h4>${t.cultivationAdvice || 'Cultivation Advice'}</h4>
                <p>${interp.cultivationAdvice}</p>
            </div>`;
        }

        html += `</div></div>`;

        content.innerHTML = html;
        // Note: Xiantian section is now integrated into the Medicine tab
        // section.style.display = 'block';

        // Render the Xiantian diagram
        requestAnimationFrame(() => {
            this.renderXiantianDiagram(canvasId, data.fdl, data.trigrams);
        });
    }

    static createXiantianSection() {
        // Find the results content section and add Xiantian section before it
        const resultsContent = document.getElementById('resultsContent');
        if (!resultsContent) return;

        const section = document.createElement('div');
        section.id = 'xiantianSection';
        section.className = 'xiantian-section-wrapper';
        section.style.display = 'none';
        section.innerHTML = `
            <div class="xiantian-header">
                <h2>☯️ Early Heaven (Xiantian) Interpretation</h2>
                <p class="xiantian-subtitle">Primordial nature and spiritual cultivation perspective</p>
            </div>
            <div id="xiantianContent" class="xiantian-body"></div>
        `;

        resultsContent.parentNode.insertBefore(section, resultsContent.nextSibling);
    }

    static renderXiantianDiagram(canvasId, fdlData, trigrams) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Use FDLRenderer if available, otherwise fall back to SigilTools
        if (typeof FDLRenderer !== 'undefined' && fdlData) {
            FDLRenderer.render(canvasId, fdlData);
        } else if (typeof SigilTools !== 'undefined') {
            // Fallback: draw basic Xiantian using SigilTools
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            if (rect.width === 0) return;

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, rect.width, rect.height);

            // Draw using SigilTools with xiantian flag if supported
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const size = Math.min(rect.width, rect.height) * 0.8;

            // Try to use FDL-style rendering through SigilTools
            if (SigilTools.drawFDL && fdlData) {
                SigilTools.drawFDL(ctx, rect.width, rect.height, fdlData, '#D4AF37');
            } else if (SigilTools.drawBagua) {
                // Last resort: draw Houtian and note the limitation
                SigilTools.drawBagua(ctx, cx, cy, size, { activeTrigrams: trigrams ? [trigrams.upper, trigrams.lower] : [] }, '#D4AF37');

                // Add label noting this is Xiantian
                ctx.fillStyle = '#FFD700';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Xiantian (Early Heaven)', cx, 20);
            }
        }
    }

    static startWindDust() {
        const container = document.getElementById('windDustContainer');
        if (!container) return;

        if (!this._windInterval) {
            this._windInterval = setInterval(() => {
                if (document.hidden) return;
                const p = document.createElement('div');
                p.className = 'wind-particle';
                p.style.top = Math.random() * 100 + 'vh';
                p.style.animationDuration = (Math.random() * 10 + 5) + 's';
                p.style.opacity = Math.random() * 0.5;
                container.appendChild(p);
                setTimeout(() => p.remove(), 15000);
            }, 500);
        }
    }

    static stopWindDust() {
        if (this._windInterval) {
            clearInterval(this._windInterval);
            this._windInterval = null;
        }
    }

    static initFengShui() {
        this.startWindDust();
        document.addEventListener('visibilitychange', () => {
            document.hidden ? this.stopWindDust() : this.startWindDust();
        });
    }

    static openImageModal(url, title) {
        let modal = document.getElementById('imageModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'imageModal';
            modal.className = 'image-modal';
            modal.innerHTML = `<div class="image-modal-overlay"></div><div class="image-modal-content"><button class="image-modal-close">&times;</button><img id="imageModalImg" src="" /><div id="imageModalTitle" class="image-modal-title"></div></div>`;
            document.body.appendChild(modal);

            modal.querySelector('.image-modal-overlay').onclick = () => modal.style.display = 'none';
            modal.querySelector('.image-modal-close').onclick = () => modal.style.display = 'none';
        }

        document.getElementById('imageModalImg').src = url;
        document.getElementById('imageModalTitle').textContent = title;
        modal.style.display = 'flex';
    }

    static showSuccess(msg) {
        this.showToast(msg, 'success');
    }

    static showError(msg) {
        this.showToast(msg, 'error');
    }

    static showToast(msg, type) {
        const toast = document.createElement('div');
        toast.className = `${type}-toast`;
        toast.textContent = msg;
        toast.style.cssText = `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: ${type === 'success' ? 'rgba(50,150,50,0.9)' : 'rgba(200,50,50,0.9)'}; color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; animation: slideUp 0.3s ease;`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static renderBaguaStrip(lang) {
        const strip = document.getElementById('baguaHexStrip');
        if (!strip || typeof TRIGRAMS === 'undefined') return;

        // Houtian (Later Heaven) order - clockwise from South (top)
        // This matches the traditional Bagua arrangement
        const houtianOrder = ['101', '000', '011', '111', '010', '100', '001', '110'];
        // Corresponds to: Fire(S), Earth(SW), Lake(W), Heaven(NW), Water(N), Mountain(NE), Thunder(E), Wind(SE)

        strip.innerHTML = houtianOrder.map((key) => {
            const tg = TRIGRAMS[key];
            if (!tg) return '';

            // Build trigram SVG visualization
            const lines = key.split('').map((bit, i) => {
                const y = 8 + i * 6;
                return bit === '1'
                    ? `<line x1="2" y1="${y}" x2="22" y2="${y}" stroke="currentColor" stroke-width="2" />`
                    : `<line x1="2" y1="${y}" x2="9" y2="${y}" stroke="currentColor" stroke-width="2" /><line x1="15" y1="${y}" x2="22" y2="${y}" stroke="currentColor" stroke-width="2" />`;
            }).join('');

            const name = tg.name[lang] || tg.name.en;
            const trigramId = tg.name.en.toLowerCase();

            return `<div class="bagua-strip-item hex-${trigramId}" data-trigram="${trigramId}"
                 onclick="UI.handleTrigramClick('${trigramId}', event)" role="listitem">
                <div class="bagua-strip-symbol">
                    <svg viewBox="0 0 24 32" width="24" height="32">${lines}</svg>
                </div>
                <span class="bagua-strip-name">${name}</span>
                <span class="trigram-chinese-text">${tg.symbol}</span>
                <span class="trigram-direction">${tg.direction}</span>
            </div>`;
        }).join('');
    }

    static showBaguaDiagram(lang = 'en') {
        const t = I18N[lang] || I18N['en'];
        const instructions = [
            `${t.activatedForEnergy || 'Activated for energy'}: ${t.south || 'South'} (${t.fire || 'Fire'})`,
            `${t.balancedForHarmony || 'Balanced for harmony'}: ${t.west || 'West'} (${t.metal || 'Metal'})`,
            `${t.enhancedForGrowth || 'Enhanced for growth'}: ${t.east || 'East'} (${t.wood || 'Wood'})`
        ];

        const diagram = FENG_SHUI_DGL_SPEC.helpers.generateDiagram(instructions, {
            arrangement: "houtian",
            lang: App.lang
        });

        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');

        // Draw background
        ctx.fillStyle = diagram.background || '#1a1a2e';
        ctx.fillRect(0, 0, 1000, 1000);

        // Render the diagram
        SigilTools.renderFengShuiDiagram(diagram, ctx, 0, 0, 1000, '#d4af37');

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fengshui-modal';
        modal.innerHTML = `
            <div class="fengshui-modal-content">
                <div class="fengshui-modal-header">
                    <h3>${t.baguaDiagram || 'Bagua Diagram'} - ${t.laterHeaven || 'Later Heaven Arrangement'}</h3>
                    <button onclick="this.closest('.fengshui-modal').remove()" class="fengshui-modal-close">&times;</button>
                </div>
                <div class="fengshui-modal-body">
                    <canvas id="fengshuiCanvas" width="1000" height="1000"></canvas>
                    <div class="fengshui-modal-instructions">
                        <h4>${t.instructionsApplied || 'Instructions Applied'}:</h4>
                        <ul>
                            <li>${t.south || 'South'} (${t.fire || 'Fire'}) - ${t.activatedForEnergy || 'Activated for energy'}</li>
                            <li>${t.west || 'West'} (${t.metal || 'Metal'}) - ${t.balancedForHarmony || 'Balanced for harmony'}</li>
                            <li>${t.east || 'East'} (${t.wood || 'Wood'}) - ${t.enhancedForGrowth || 'Enhanced for growth'}</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Replace canvas with the rendered one
        const existingCanvas = modal.querySelector('#fengshuiCanvas');
        if (existingCanvas) {
            existingCanvas.parentNode.replaceChild(canvas, existingCanvas);
        }

        // Add CSS for modal
        if (!document.querySelector('#fengshuiModalStyles')) {
            const style = document.createElement('style');
            style.id = 'fengshuiModalStyles';
            style.textContent = `
                .fengshui-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    padding: 20px;
                }
                .fengshui-modal-content {
                    background: #1a1a2e;
                    border-radius: 10px;
                    padding: 20px;
                    max-width: 90%;
                    max-height: 90%;
                    overflow: auto;
                    box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
                }
                .fengshui-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .fengshui-modal-close {
                    background: none;
                    border: none;
                    color: #d4af37;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px 10px;
                }
                .fengshui-modal-body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .fengshui-modal-instructions {
                    background: #2a2a2a;
                    padding: 15px;
                    border-radius: 5px;
                }
                .fengshui-modal-instructions ul {
                    margin: 0;
                    padding-left: 20px;
                }
                .fengshui-modal-instructions li {
                    color: #d4af37;
                    margin-bottom: 5px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    static showBaguaDiagram(lang = 'en') {
        const t = I18N[lang] || I18N['en'];
        const instructions = [
            `${t.activatedForEnergy || 'Activated for energy'}: ${t.south || 'South'} (${t.fire || 'Fire'})`,
            `${t.balancedForHarmony || 'Balanced for harmony'}: ${t.west || 'West'} (${t.metal || 'Metal'})`,
            `${t.enhancedForGrowth || 'Enhanced for growth'}: ${t.east || 'East'} (${t.wood || 'Wood'})`
        ];

        const diagram = FENG_SHUI_DGL_SPEC.helpers.generateDiagram(instructions, {
            arrangement: "houtian",
            lang: App.lang
        });

        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');

        // Draw background
        ctx.fillStyle = diagram.background || '#1a1a2e';
        ctx.fillRect(0, 0, 1000, 1000);

        // Render the diagram
        SigilTools.renderFengShuiDiagram(diagram, ctx, 0, 0, 1000, '#d4af37');

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fengshui-modal';
        modal.innerHTML = `
            <div class="fengshui-modal-content">
                <div class="fengshui-modal-header">
                    <h3>${t.baguaDiagram || 'Bagua Diagram'} - ${t.laterHeaven || 'Later Heaven Arrangement'}</h3>
                    <button onclick="this.closest('.fengshui-modal').remove()" class="fengshui-modal-close">&times;</button>
                </div>
                <div class="fengshui-modal-body">
                    <canvas id="fengshuiCanvas" width="1000" height="1000"></canvas>
                    <div class="fengshui-modal-instructions">
                        <h4>${t.instructionsApplied || 'Instructions Applied'}:</h4>
                        <ul>
                            <li>${t.south || 'South'} (${t.fire || 'Fire'}) - ${t.activatedForEnergy || 'Activated for energy'}</li>
                            <li>${t.west || 'West'} (${t.metal || 'Metal'}) - ${t.balancedForHarmony || 'Balanced for harmony'}</li>
                            <li>${t.east || 'East'} (${t.wood || 'Wood'}) - ${t.enhancedForGrowth || 'Enhanced for growth'}</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Replace canvas with the rendered one
        const existingCanvas = modal.querySelector('#fengshuiCanvas');
        if (existingCanvas) {
            existingCanvas.parentNode.replaceChild(canvas, existingCanvas);
        }

        // Add CSS for modal
        if (!document.querySelector('#fengshuiModalStyles')) {
            const style = document.createElement('style');
            style.id = 'fengshuiModalStyles';
            style.textContent = `
                .fengshui-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    padding: 20px;
                }
                .fengshui-modal-content {
                    background: #1a1a2e;
                    border-radius: 10px;
                    padding: 20px;
                    max-width: 90%;
                    max-height: 90%;
                    overflow: auto;
                    box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
                }
                .fengshui-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .fengshui-modal-close {
                    background: none;
                    border: none;
                    color: #d4af37;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px 10px;
                }
                .fengshui-modal-body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .fengshui-modal-instructions {
                    background: #2a2a2a;
                    padding: 15px;
                    border-radius: 5px;
                }
                .fengshui-modal-instructions ul {
                    margin: 0;
                    padding-left: 20px;
                }
                .fengshui-modal-instructions li {
                    color: #d4af37;
                    margin-bottom: 5px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    static renderTrigramCardNode(tg, binaryKey, index, isActive, lang) {
        const trigramId = tg.name.en.toLowerCase();
        return `<div class="trigram-card-node ${isActive ? 'active' : ''} hex-${trigramId}" 
                 data-trigram="${trigramId}" onclick="UI.handleTrigramClick('${trigramId}', event)">
                <span class="trigram-position">${tg.direction}</span>
                <svg class="trigram-svg" viewBox="0 0 50 45">
                    ${binaryKey.split('').map((bit, i) => bit === '1' ? `<line x1="5" y1="${7 + i * 15}" x2="45" y2="${7 + i * 15}" stroke="currentColor" stroke-width="3" />` : `<line x1="5" y1="${7 + i * 15}" x2="45" y2="${7 + i * 15}" class="yin-line" stroke="currentColor" stroke-width="3" stroke-dasharray="18,4" />`).join('')}
                </svg>
                <span class="bagua-strip-name">${tg.name[lang] || tg.name.en}</span>
                <span class="trigram-chinese-text">${tg.symbol}</span>
            </div>`;
    }

    static handleTrigramClick(trigram, event) {
        const el = event.currentTarget;
        el.classList.add('thunder-shock');
        setTimeout(() => el.classList.remove('thunder-shock'), 300);
        document.querySelectorAll(`[data-trigram="${trigram}"]`).forEach(c => c.classList.add('active'));
        setTimeout(() => document.querySelectorAll(`[data-trigram="${trigram}"]`).forEach(c => c.classList.remove('active')), 3000);
    }



    // ═══════════════════════════════════════════════════════════════════════════════
    // TABBED INTERFACE INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════════

    static initReadingTabs() {
        // Main tabs
        document.querySelectorAll('.reading-tab-btn').forEach(btn => {
            if (btn.dataset.tabListenerAttached) return;
            btn.dataset.tabListenerAttached = 'true';
            btn.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchReadingTab(tabId);
            });
        });

        // Sub-tabs for interpretation
        document.querySelectorAll('#tab-interpretation .sub-tab-btn').forEach(btn => {
            if (btn.dataset.subTabListenerAttached) return;
            btn.dataset.subTabListenerAttached = 'true';
            btn.addEventListener('click', (e) => {
                const subtabId = e.currentTarget.dataset.subtab;
                this.switchSubTab('interpretation', subtabId);
            });
        });

        // Sub-tabs for remedies
        document.querySelectorAll('#tab-remedies .sub-tab-btn').forEach(btn => {
            if (btn.dataset.subTabListenerAttached) return;
            btn.dataset.subTabListenerAttached = 'true';
            btn.addEventListener('click', (e) => {
                const subtabId = e.currentTarget.dataset.subtab;
                this.switchSubTab('remedies', subtabId);
            });
        });
    }

    static switchReadingTab(tabId) {
        // Update buttons
        document.querySelectorAll('.reading-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
            btn.setAttribute('aria-selected', btn.dataset.tab === tabId);
        });

        // Update panels
        document.querySelectorAll('.reading-tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab-${tabId}`);
        });

        // Trigger diagram rendering when specific tabs are activated
        if (tabId === 'remedies') {
            console.log(`[UI] Tab ${tabId} activated, triggering remedy diagram render`);
            // Increment render generation to cancel any stale retries
            this._remedyRenderGen = (this._remedyRenderGen || 0) + 1;
            const currentGen = this._remedyRenderGen;

            // Multiple retries to ensure rendering happens after tab is fully visible
            setTimeout(() => this._renderPendingRemedies(0, null, currentGen), 100);
            setTimeout(() => this._renderPendingRemedies(0, null, currentGen), 500);
            setTimeout(() => this._renderPendingRemedies(0, null, currentGen), 1000);
        }
        if (tabId === 'medicine') {
            console.log(`[UI] Tab ${tabId} activated, triggering Bagua Medicine diagram render`);
            if (this._pendingBaguaMedicineRender) {
                const { canvasId, canvasId2, fengShui, lang } = this._pendingBaguaMedicineRender;
                setTimeout(() => {
                    console.log(`[UI] Rendering deferred Bagua Medicine diagrams (houtian + xiantian)`);
                    this.renderBaguaMedicineDiagram(canvasId, fengShui, lang);
                    if (canvasId2) this.renderBaguaMedicineDiagramXiantian(canvasId2, fengShui, lang);
                }, 100);
            }
        }
        if (tabId === 'preanalysis' && this._pendingBaziRender) {
            console.log(`[UI] Tab ${tabId} activated, triggering deferred BaZi diagram render`);
            const { birthBaziExtended, currentBaziExtended, lang } = this._pendingBaziRender;
            setTimeout(() => {
                this.renderBaziEnhanced(birthBaziExtended, currentBaziExtended, lang);
            }, 100);
            this._pendingBaziRender = null;
        }
    }

    static switchSubTab(section, subtabId) {
        const container = document.getElementById(`tab-${section}`);
        if (!container) return;

        // Update sub-tab buttons
        container.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === subtabId);
        });

        // Filter content based on subtab
        if (section === 'remedies') {
            this.filterRemediesByType(subtabId);
        } else if (section === 'interpretation') {
            this.filterInterpretationByType(subtabId);
        }
    }

    static filterRemediesByType(type) {
        const container = document.getElementById('remedies-content-area');
        if (!container) return;

        const items = container.querySelectorAll('.remedy-tab-item');
        items.forEach(item => {
            if (type === 'all') {
                item.style.display = 'block';
            } else {
                const itemType = item.dataset.type;
                item.style.display = itemType === type ? 'block' : 'none';
            }
        });
    }

    static filterInterpretationByType(type) {
        const container = document.getElementById('interpretation-content-area');
        if (!container) return;

        const cards = container.querySelectorAll('.tab-content-card');
        cards.forEach(card => {
            if (type === 'overview') {
                card.style.display = 'block';
            } else {
                const cardType = card.dataset.section;
                card.style.display = cardType === type ? 'block' : 'none';
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // HIGH CONTRAST TEXT UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════════

    static getContrastColor(bgColor) {
        if (!bgColor || typeof bgColor !== 'string') return '#d4af37';
        try {
            let hex = bgColor.replace('#', '');
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            if (hex.length < 6) return '#d4af37';
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance > 0.5 ? '#000000' : '#d4af37';
        } catch (e) {
            return '#d4af37';
        }
    }

    static ensureTextContrast(element, bgColor) {
        const contrastColor = this.getContrastColor(bgColor);
        element.style.color = contrastColor;

        // Add text shadow for better readability
        if (contrastColor === '#FFFFFF') {
            element.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
        } else {
            element.style.textShadow = '0 1px 2px rgba(255,255,255,0.3)';
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENHANCED RENDERING WITH TABS
    // ═══════════════════════════════════════════════════════════════════════════════

    static renderInterpretationTabbed(result, lang, reading = null) {
        const container = document.getElementById('interpretation-content-area');
        if (!container || !result) return;

        const r = result[lang] || result.en;
        if (!r) {
            container.innerHTML = '<div style="color: var(--text-dim); padding: 20px;">Interpretation unavailable</div>';
            return;
        }

        const t = I18N[lang] || I18N['en'];
        let html = '';

        // Inject astrology data into celestial section if available
        let celestialContent = r.celestial;
        if (celestialContent && reading?.chineseAstrology) {
            const astro = reading.chineseAstrology;
            const astroSummary = [];

            if (astro.bazi?.dayMaster) {
                astroSummary.push(this.formatDayMasterBadge(astro.bazi.dayMaster, lang));
            }
            if (astro.lunarMansion?.mansion) {
                astroSummary.push(this.formatMansionBadge(astro.lunarMansion.mansion, lang));
            }
            if (astro.taiSui?.currentPosition) {
                const taiSuiLabel = t.taiSui || 'Tai Sui';
                const tDir = typeof ChineseAstrologyDisplay !== 'undefined' ? ChineseAstrologyDisplay.translateDirection.call({lang}, astro.taiSui.currentPosition.direction) : astro.taiSui.currentPosition.direction;
                astroSummary.push(`<span class="yinyang-badge yang">${taiSuiLabel}: ${astro.taiSui.currentPosition.zh} (${tDir})</span>`);
            }
            if (astro.bagua?.hexiangua) {
                astroSummary.push(this.formatHexagramBadge({
                    number: astro.bagua.hexiangua.hexagramNumber,
                    name_zh: astro.bagua.hexiangua.hexagramNameZh || '',
                    name_en: astro.bagua.hexiangua.hexagramName
                }, lang));
            }

            if (astroSummary.length > 0) {
                const astroContextLabel = t.chineseAstrologyContext || 'Chinese Astrology Context';
                celestialContent = `**${astroContextLabel}:**<br>${astroSummary.join(' ')}<br><br>${celestialContent}`;
            }
        }

        // Build elements content with balance visualization if available
        let elementsContent = r.elements;
        if (reading?.equilibrium?.elements) {
            const el = reading.equilibrium.elements;
            // Use new formatElementBadge for consistent styling
            const woodBadge = this.formatElementBadge('wood', lang, { showZh: true });
            const fireBadge = this.formatElementBadge('fire', lang, { showZh: true });
            const earthBadge = this.formatElementBadge('earth', lang, { showZh: true });
            const metalBadge = this.formatElementBadge('metal', lang, { showZh: true });
            const waterBadge = this.formatElementBadge('water', lang, { showZh: true });

            // Determine dominant and deficient for highlighting
            const dominant = el.dominant || '';
            const deficient = el.deficient || '';

            const elHtml = `
                <div class="five-elements-balance">
                    <div class="element-bar">
                        <span class="el-label">${woodBadge}</span>
                        <div class="el-bar"><div class="el-fill wood ${dominant === 'wood' ? 'dominant' : ''} ${deficient === 'wood' ? 'deficient' : ''}" style="width:${el.wood || 0}%"></div></div>
                        <span class="el-value">${el.wood || 0}%</span>
                    </div>
                    <div class="element-bar">
                        <span class="el-label">${fireBadge}</span>
                        <div class="el-bar"><div class="el-fill fire ${dominant === 'fire' ? 'dominant' : ''} ${deficient === 'fire' ? 'deficient' : ''}" style="width:${el.fire || 0}%"></div></div>
                        <span class="el-value">${el.fire || 0}%</span>
                    </div>
                    <div class="element-bar">
                        <span class="el-label">${earthBadge}</span>
                        <div class="el-bar"><div class="el-fill earth ${dominant === 'earth' ? 'dominant' : ''} ${deficient === 'earth' ? 'deficient' : ''}" style="width:${el.earth || 0}%"></div></div>
                        <span class="el-value">${el.earth || 0}%</span>
                    </div>
                    <div class="element-bar">
                        <span class="el-label">${metalBadge}</span>
                        <div class="el-bar"><div class="el-fill metal ${dominant === 'metal' ? 'dominant' : ''} ${deficient === 'metal' ? 'deficient' : ''}" style="width:${el.metal || 0}%"></div></div>
                        <span class="el-value">${el.metal || 0}%</span>
                    </div>
                    <div class="element-bar">
                        <span class="el-label">${waterBadge}</span>
                        <div class="el-bar"><div class="el-fill water ${dominant === 'water' ? 'dominant' : ''} ${deficient === 'water' ? 'deficient' : ''}" style="width:${el.water || 0}%"></div></div>
                        <span class="el-value">${el.water || 0}%</span>
                    </div>
                </div>
            `;
            elementsContent = elHtml + (elementsContent ? `<div class="elements-text">${elementsContent}</div>` : '');
        }

        // Create cards for each section
        const sections = [
            { key: 'celestial', title: t.celestial || 'Celestial', icon: '✨', class: 'card-celestial', content: celestialContent },
            { key: 'elements', title: t.elements || 'Elements', icon: '🌍', class: 'card-elements', content: elementsContent },
            { key: 'analysis', title: t.analysis || 'Analysis', icon: '🔍', class: 'card-analysis' },
            { key: 'advice', title: t.advice || 'Advice', icon: '💡', class: 'card-advice' },
            { key: 'houtou', title: t.houtou || 'Later Heaven', icon: '☯️', class: 'card-houtou' }
        ];

        sections.forEach(section => {
            let content = section.content;

            // If no explicit content, try to get from result object
            if (!content) {
                // Try different field names based on section
                if (section.key === 'analysis') {
                    content = r.analysis || r.coreAnalysis || r.coreTechnical || r.coreColloquial || r.technicalAnalysis;
                } else if (section.key === 'advice') {
                    content = r.advice || r.coreApplication || r.coreColloquial;
                } else if (section.key === 'houtou') {
                    content = r.houtou || r.houtouTechnical || r.houtouColloquial || r.emperorAnalysis || r.masterAnalysis;
                } else {
                    content = r[section.key];
                }
            }

            // Build 3-layer structure (Technical Data / Technical Analysis / Colloquial)
            const sectionPrefix = section.key === 'celestial' ? 'celestial' :
                section.key === 'elements' ? 'elements' :
                    section.key === 'analysis' ? 'core' :
                        section.key === 'advice' ? 'core' :
                            section.key === 'houtou' ? 'houtou' : section.key;

            // Check for preserved technical data (celestial has both astro and bazi)
            const technicalDataAstro = r.celestialAstroTechnicalData;
            const technicalDataBazi = r.celestialBaziTechnicalData;
            const technicalDataElements = r.elementsAnalysisTechnicalData || r.elementsData;
            const technicalData = r[`${sectionPrefix}TechnicalData`] || r[`${section.key}Data`] || technicalDataAstro;
            const technicalAnalysis = r[`${sectionPrefix}Technical`] || r[`${section.key}Technical`];
            // Advice section has colloquialInterpretation directly from core-application endpoint
            const colloquialInterpretation = section.key === 'advice'
                ? (r.colloquialInterpretation || r.coreColloquial || r.advice)
                : (r[`${sectionPrefix}Colloquial`] || r[`${section.key}Colloquial`]);

            // Debug: log advice section fields
            if (section.key === 'advice') {
                console.log(`[UI.advice] Lang: ${lang}, has colloquialInterpretation: ${!!r.colloquialInterpretation}, has coreColloquial: ${!!r.coreColloquial}, has advice: ${!!r.advice}`);
                if (r.colloquialInterpretation) console.log(`[UI.advice] colloquialInterpretation length: ${r.colloquialInterpretation.length}, preview: ${r.colloquialInterpretation.substring(0, 50)}...`);
                if (r.coreColloquial) console.log(`[UI.advice] coreColloquial length: ${r.coreColloquial.length}, preview: ${r.coreColloquial.substring(0, 50)}...`);
            }

            // Special handling for narrative content (from core-narrative endpoint)
            const narrativeAnalysis = section.key === 'analysis' ? (r.analysis || r.narrativeAnalysis) : null;
            const narrativeColloquial = section.key === 'analysis' ? r.colloquialInterpretation : null;

            // If we have the 3-layer structure, build it properly (including narrative layers)
            // For advice section, also check for advice field directly
            const hasAdviceContent = section.key === 'advice' && (r.advice || r.colloquialInterpretation);
            const has3LayerStructure = technicalAnalysis || colloquialInterpretation || technicalDataAstro || technicalDataBazi || technicalDataElements || narrativeAnalysis || narrativeColloquial || hasAdviceContent;
            const hasSimpleContent = content && typeof content === 'string' && content.length > 10;

            if (has3LayerStructure || hasSimpleContent) {
                let layeredContent = '';

                // Layer 1: Technical Data (collapsible) - handle celestial specially
                if (section.key === 'celestial' && (technicalDataAstro || technicalDataBazi)) {
                    let dataHtml = '';
                    if (technicalDataAstro) {
                        const dataStr = typeof technicalDataAstro === 'object' ? JSON.stringify(technicalDataAstro, null, 2) : technicalDataAstro;
                        dataHtml += `<div class="tech-data-section"><strong>🌟 Astrology Data</strong><pre class="tech-data-json">${this.escapeHtml(dataStr)}</pre></div>`;
                    }
                    if (technicalDataBazi) {
                        const dataStr = typeof technicalDataBazi === 'object' ? JSON.stringify(technicalDataBazi, null, 2) : technicalDataBazi;
                        dataHtml += `<div class="tech-data-section"><strong>📅 BaZi Data</strong><pre class="tech-data-json">${this.escapeHtml(dataStr)}</pre></div>`;
                    }
                    layeredContent += `
                        <div class="technical-data-layer">
                            <details class="tech-data-details">
                                <summary>📊 Technical Data</summary>
                                ${dataHtml}
                            </details>
                        </div>
                    `;
                } else if (section.key === 'elements' && technicalDataElements) {
                    // Elements section - show element counts visualization + raw data
                    const dataStr = typeof technicalDataElements === 'object' ? JSON.stringify(technicalDataElements, null, 2) : technicalDataElements;
                    layeredContent += `
                        <div class="technical-data-layer">
                            <details class="tech-data-details">
                                <summary>📊 Five Elements Technical Data</summary>
                                <pre class="tech-data-json">${this.escapeHtml(dataStr)}</pre>
                            </details>
                        </div>
                    `;
                } else if (technicalData) {
                    const dataStr = typeof technicalData === 'object' ? JSON.stringify(technicalData, null, 2) : technicalData;
                    layeredContent += `
                        <div class="technical-data-layer">
                            <details class="tech-data-details">
                                <summary>📊 Technical Data</summary>
                                <pre class="tech-data-json">${this.escapeHtml(dataStr)}</pre>
                            </details>
                        </div>
                    `;
                }

                // Layer 2: Technical Analysis
                if (technicalAnalysis) {
                    layeredContent += `
                        <div class="technical-analysis-layer">
                            <div class="layer-label">🔬 ${t.technicalAnalysis || 'Technical Analysis'}</div>
                            ${this.formatParagraphs(technicalAnalysis)}
                        </div>
                    `;
                }

                // Layer 3: Colloquial Interpretation
                if (colloquialInterpretation) {
                    const isAdvice = section.key === 'advice' || section.key === 'core-application';
                    layeredContent += `
                        <div class="colloquial-layer">
                            <div class="layer-label">💬 ${isAdvice ? (t.practicalGuidance || 'Practical Guidance') : (t.interpretation || 'Interpretation')}</div>
                            ${this.formatParagraphs(colloquialInterpretation, { isAdvice })}
                        </div>
                    `;
                }

                // Layer 3b: Advice text (for advice section)
                if (section.key === 'advice' && r.advice && r.advice !== colloquialInterpretation) {
                    layeredContent += `
                        <div class="advice-layer">
                            <div class="layer-label">💡 ${t.advice || 'Advice'}</div>
                            ${this.formatParagraphs(r.advice, { isAdvice: true })}
                        </div>
                    `;
                }

                // Layer 4: Narrative Technical (from core-narrative endpoint)
                if (narrativeAnalysis) {
                    layeredContent += `
                        <div class="narrative-technical-layer">
                            <div class="layer-label">📖 ${t.narrativeTechnical || 'Narrative Analysis'}</div>
                            ${this.formatParagraphs(narrativeAnalysis)}
                        </div>
                    `;
                }

                // Layer 5: Narrative Colloquial (from core-narrative endpoint)
                if (narrativeColloquial) {
                    layeredContent += `
                        <div class="narrative-interpretation-layer">
                            <div class="layer-label">🎯 ${t.narrativeInterpretation || 'Narrative Interpretation'}</div>
                            ${this.formatParagraphs(narrativeColloquial)}
                        </div>
                    `;
                }

                // Fallback to regular content if no layered content
                if (!layeredContent && content) {
                    // Use formatCompactInterp to handle both compact and regular text
                    layeredContent = this.formatCompactInterp(content, section.key, lang);
                }

                // Special handling for analysis section - ensure we always show analysis text
                if (!layeredContent && section.key === 'analysis' && r.analysis) {
                    layeredContent = this.formatCompactInterp(r.analysis, 'analysis', lang);
                }

                // Always render section if we have any content
                if (layeredContent || content) {
                    let finalContent = layeredContent || (content ? this.formatCompactInterp(content, section.key, lang) : '');

                    // Apply highlighting to layered content if it doesn't already have badges
                    if (finalContent && !finalContent.includes('element-badge') && !finalContent.includes('trigram-badge')) {
                        finalContent = this.highlightProperNames(finalContent, lang);
                    }
                    html += `
                        <div class="tab-content-card ${section.class}" data-section="${section.key}">
                            <div class="card-title">
                                <span>${section.icon}</span>
                                <span>${section.title}</span>
                            </div>
                            <div class="card-content interp-text-enhanced ${layeredContent ? 'three-layer' : ''}">
                                ${finalContent}
                            </div>
                        </div>
                    `;
                }
            } // Close if (has3LayerStructure || hasSimpleContent)
        }); // Close forEach

        container.innerHTML = html || '<div style="color: var(--text-dim); padding: 20px;">No interpretation available</div>';

        // Mark sections as translatable for the TranslationService
        if (typeof TranslationService !== 'undefined') {
            this.markTranslatableSections();
        }
    } // Close renderInterpretationTabbed method

    /**
     * Mark interpretation sections as translatable
     */
    static markTranslatableSections() {
        // Mark each section card as translatable
        const sectionCards = document.querySelectorAll('.tab-content-card');
        sectionCards.forEach(card => {
            const sectionKey = card.dataset.section;
            if (sectionKey) {
                card.setAttribute('data-translatable-section', sectionKey);
            }
        });

        console.log(`[UI.markTranslatableSections] Marked ${sectionCards.length} sections as translatable`);
    }

    static renderRemediesTabbed(remedies, lang) {
        const container = document.getElementById('remedies-content-area');
        if (!container) return;

        // Normalize flat structure { remedies: [...], fuluContentList: [...] }
        // into lang-keyed structure { en: { remedies: [...] }, fuluContentList: [...] }
        if (remedies && remedies.remedies && !remedies.en && !remedies.es && !remedies.it && !remedies.zh) {
            remedies = {
                en: { remedies: remedies.remedies },
                fuluContentList: remedies.fuluContentList || []
            };
        }

        console.log(`[UI.renderRemediesTabbed] Called with lang=${lang}, available langs:`, Object.keys(remedies || {}));
        console.log(`[UI.renderRemediesTabbed] remedies[${lang}]:`, remedies?.[lang] ? `has ${remedies[lang].remedies?.length || 0} remedies` : 'not found');

        const displayLang = (remedies && remedies[lang] && remedies[lang].remedies?.length > 0) ? lang : 'en';
        console.log(`[UI.renderRemediesTabbed] Using displayLang: ${displayLang}`);

        if (!remedies || !remedies[displayLang] || !remedies[displayLang].remedies?.length) {
            console.log(`[UI.renderRemediesTabbed] No remedies to display for ${displayLang}`, remedies);
            const t = I18N[lang] || I18N['en'];
            container.innerHTML = `
                <div style="color: var(--text-dim); padding: 20px; text-align: center;">
                    <p>${t.noRemediesAvailable || 'No remedies available for this reading.'}</p>
                    <p style="font-size: 0.9em; opacity: 0.7; margin-top: 10px;">${t.tryAgainLater || 'Please try again or consult a practitioner for personalized guidance.'}</p>
                </div>`;
            return;
        }

        const t = I18N[lang] || I18N['en'];
        let html = '';
        const remedyList = remedies[displayLang].remedies;
        const fuluContentList = remedies.fuluContentList || [];

        // Helper to translate remedy content asynchronously
        const translateRemedyContent = async (remedy, lang) => {
            if (lang === 'en' || !window.translationService) return remedy;

            const fieldsToTranslate = ['relevance', 'description', 'instructions'];
            for (const field of fieldsToTranslate) {
                if (remedy[field] && typeof remedy[field] === 'string') {
                    try {
                        const translated = await window.translationService.translateText(remedy[field], lang, 'ui_content');
                        if (translated && translated !== remedy[field]) {
                            remedy[field] = translated;
                        }
                    } catch (err) {
                        console.warn(`[UI] Failed to translate remedy ${field}:`, err);
                    }
                }
            }
            return remedy;
        };

        remedyList.forEach((remedy, index) => {
            const isTalisman = remedy.type === 'fulu';
            const isFengShui = remedy.type === 'fengshui';
            const isMedicine = remedy.type === 'medicine';
            const type = isTalisman ? 'fulu' : isFengShui ? 'fengshui' : 'medicine';

            // Resolve name from object {zh, en} to string
            const remedyName = this._resolveRemedyName(remedy, displayLang);
            const remedyNameZh = typeof remedy.name === 'object' ? (remedy.name.zh || '') : (remedy.nameZh || '');

            // Get fulu content from multiple sources: backend fuluContentList, backend remedy.fdl, or local DB
            let fuluContent = fuluContentList.find(f => f.id === remedy.id) || fuluContentList[index] || {};
            
            // Merge remedy.fdl and remedy.image from backend if present (3-tab architecture)
            if (remedy.fdl) fuluContent.fdl = remedy.fdl;
            if (remedy.image) fuluContent.image = remedy.image;
            if (remedy.visualData?.fdl) fuluContent.fdl = remedy.visualData.fdl;

            // Kick off async translation for remedy content if not English
            if (displayLang !== 'en' && window.translationService) {
                translateRemedyContent(remedy, displayLang).then(updatedRemedy => {
                    // Update DOM with translated content
                    const tabItems = document.querySelectorAll('.remedy-tab-item');
                    tabItems.forEach(item => {
                        const h3 = item.querySelector('h3');
                        if (h3 && h3.textContent.includes(remedyName)) {
                            // Update relevance
                            const relevanceBox = item.querySelector('.remedy-relevance-box p');
                            if (relevanceBox && updatedRemedy.relevance) {
                                relevanceBox.innerHTML = this.formatMarkdownInline(updatedRemedy.relevance);
                            }
                            // Update description
                            const descText = item.querySelector('.remedy-description-text');
                            if (descText && updatedRemedy.description) {
                                descText.innerHTML = this.formatParagraphs(updatedRemedy.description);
                            }
                            // Update instructions
                            const instructionsBox = item.querySelector('.remedy-instructions-box p');
                            if (instructionsBox && updatedRemedy.instructions) {
                                instructionsBox.innerHTML = this.formatMarkdownInline(updatedRemedy.instructions);
                            }
                        }
                    });
                }).catch(err => console.error('[UI] Failed to translate remedy content:', err));
            }

            // Try to find instructions from other sources if missing in remedy
            if (!remedy.instructions && !remedy.application) {
                if (fuluContent.instructions) {
                    remedy.instructions = fuluContent.instructions;
                } else if (typeof DAOIST_REMEDIES_DB !== 'undefined') {
                    let localRecord = null;
                    if (isTalisman && DAOIST_REMEDIES_DB.fulu) {
                        localRecord = DAOIST_REMEDIES_DB.fulu.find(f => f.id === remedy.id);
                    } else if (isFengShui && DAOIST_REMEDIES_DB.fengshui) {
                        localRecord = DAOIST_REMEDIES_DB.fengshui.find(f => f.id === remedy.id);
                    }
                    if (localRecord && localRecord.instructions) {
                        remedy.instructions = localRecord.instructions;
                        // Kick off async translation for DB-sourced text if not EN
                        if (displayLang !== 'en' && window.translationService) {
                            window.translationService.translateText(remedy.instructions, displayLang, 'ui_content')
                                .then(translated => {
                                    if (translated && translated !== remedy.instructions) {
                                        remedy.instructions = translated;
                                        // Update the DOM node directly to avoid full re-render
                                        const tabItems = document.querySelectorAll('.remedy-tab-item');
                                        tabItems.forEach(item => {
                                            const h3 = item.querySelector('h3');
                                            if (h3 && h3.textContent.includes(remedyName)) {
                                                const p = item.querySelector('.remedy-instructions-box p');
                                                if (p) p.innerHTML = this.formatMarkdownInline(translated);
                                            }
                                        });
                                    }
                                }).catch(err => console.error("Failed to translate DB instructions", err));
                        }
                    }
                }
            }

            // Check for images in multiple sources
            const remedyImage = remedy.image || remedy.images;
            const hasImage = fuluContent.image || remedyImage || (Array.isArray(fuluContent.image) && fuluContent.image.length > 0);
            const imageUrls = hasImage ? (Array.isArray(fuluContent.image) ? fuluContent.image : fuluContent.image ? [fuluContent.image] : remedyImage ? [remedyImage] : []) : [];
            
            // hasFDL: check remedy.fdl, fuluContent.fdl, or remedy.visualData.fdl
            const hasFDL = fuluContent.fdl || remedy.fdl || remedy.visualData?.fdl || isFengShui || isTalisman || remedy.type === 'medicine';

            // Always show visual side since all types get FDL diagrams generated
            const showVisual = true;

            const typeLabel = isTalisman ? t.talisman : isFengShui ? t.fengshui : t.medicine;
            const icon = isTalisman ? '符' : isFengShui ? '風' : '丹';

            html += `
                <div class="remedy-tab-item" data-type="${type}">
                    <div class="remedy-tab-header">
                        <div class="remedy-tab-icon">${icon}</div>
                        <div class="remedy-tab-title">
                            <h3>${remedyName}</h3>
                            <div class="subtitle">${typeLabel}${remedyNameZh ? ' | ' + remedyNameZh : ''}</div>
                        </div>
                    </div>
                    <div class="remedy-layout-grid">
                        ${showVisual ? `<div class="remedy-visual-side">
                            ${hasImage ? `<div class="fulu-image-container">
                                ${imageUrls.map(url => `<img src="${url}" class="fulu-reference-image" onclick="UI.openImageModal('${url}', '${remedyName.replace(/'/g, '\\\'')}')" loading="lazy" crossorigin="anonymous" />`).join('')}
                            </div>` : ''}
                            <div class="fulu-canvas-container" style="min-height: 400px;">
                                <canvas id="fuluCanvas_${index}" width="400" height="400" style="width: 100%; height: 400px;"></canvas>
                            </div>
                        </div>` : ''}
                        <div class="remedy-info-side">
                            <div class="remedy-relevance-box">
                                <span class="relevance-label">${t.relevance || 'Relevance'}:</span>
                                <p>${this.formatMarkdownInline(remedy.relevance || remedy.description || t.noRelevanceAvailable || 'This remedy supports energetic balance based on the hexagram wisdom.')}</p>
                            </div>
                            <div class="remedy-description-text">${this.formatParagraphs(remedy.description)}</div>
                            ${remedy.application ? `<div class="remedy-detail-block">
                                <strong>${t.application}:</strong>
                                <p>${this.formatMarkdownInline(remedy.application)}</p>
                            </div>` : ''}
                            ${(remedy.instructions || remedy.application) ? `<div class="remedy-instructions-box">
                                <strong>${t.instructions || 'Instructions'}:</strong>
                                <p>${this.formatMarkdownInline(remedy.instructions || remedy.application || t.noInstructionsAvailable || 'Apply according to traditional practice.')}</p>
                            </div>` : `<div class="remedy-instructions-box remedy-instructions-missing">
                                <strong>${t.instructions || 'Instructions'}:</strong>
                                <p class="instructions-placeholder">${t.noInstructionsAvailable || 'Instructions not available. Apply according to traditional practice or consult a qualified practitioner.'}</p>
                            </div>`}
                            <div class="remedy-source-footer">
                                <strong>${t.source}:</strong> ${this._formatSource(remedy.source)}${remedy.verification ? ` <span class="verif-tag">${remedy.verification}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<div style="color: var(--text-dim); padding: 20px;">No remedies available</div>';

        // Render Fulu diagrams - check if remedies tab is active or in read mode
        const remediesTab = document.getElementById('tab-remedies');
        const isTabActive = remediesTab && remediesTab.classList.contains('active');
        const isReadMode = document.body.classList.contains('single-read-mode');
        const isVisible = isTabActive || isReadMode;

        console.log(`[UI.renderRemediesTabbed] Scheduling Fulu diagram rendering for ${remedyList.length} remedies, tab visible: ${isVisible}, read mode: ${isReadMode}`);

        // Store rendering context for later use when tab becomes visible
        this._remedyRenderGen = (this._remedyRenderGen || 0) + 1;
        const currentGen = this._remedyRenderGen;

        this._pendingRemedyRenders = remedyList.map((remedy, index) => {
            const isFengShui = remedy.type === 'fengshui';
            let fuluContent = fuluContentList.find(f => f.id === remedy.id) || fuluContentList[index] || {};

            // Lookup Fulu/Feng Shui data from DAOIST_REMEDIES_DB if available
            if (isFengShui && typeof DAOIST_REMEDIES_DB !== 'undefined' && DAOIST_REMEDIES_DB.fengshui) {
                const localFS = DAOIST_REMEDIES_DB.fengshui.find(f => f.id === remedy.id);
                if (localFS) {
                    if (!fuluContent.instructions && localFS.instructions) {
                        fuluContent = { ...fuluContent, instructions: localFS.instructions };
                    }
                    if (!fuluContent.fdl && localFS.visualData?.fdl) {
                        fuluContent = { ...fuluContent, fdl: localFS.visualData.fdl };
                    }
                }
            }

            // For Fulu, also check DAOIST_REMEDIES_DB.fulu
            const isTalisman = remedy.type === 'fulu';
            if (isTalisman && typeof DAOIST_REMEDIES_DB !== 'undefined' && DAOIST_REMEDIES_DB.fulu) {
                const localFulu = DAOIST_REMEDIES_DB.fulu.find(f => f.id === remedy.id);
                if (localFulu) {
                    if (!fuluContent.fdl && localFulu.visualData?.fdl) {
                        fuluContent = { ...fuluContent, fdl: localFulu.visualData.fdl };
                    }
                    if (!fuluContent.image && localFulu.image) {
                        fuluContent = { ...fuluContent, image: localFulu.image };
                    }
                }
            }

            // Also use remedy's instructions as fallback
            if (!fuluContent.instructions && remedy.instructions) {
                fuluContent = { ...fuluContent, instructions: remedy.instructions };
            }

            let fdlData = null;
            const resolvedName = this._resolveRemedyName(remedy, lang);
            console.log(`[UI.renderRemediesTabbed] Processing ${resolvedName}, type: ${remedy.type}, has fdl: ${!!fuluContent.fdl}, has instructions: ${!!fuluContent.instructions}`);

            if (fuluContent.fdl) {
                fdlData = fuluContent.fdl;
                console.log(`[UI.renderRemediesTabbed] Using existing FDL for ${resolvedName}`);
            } else if (isFengShui) {
                // Pass remedy for fallback instructions lookup
                fdlData = this.generateFengShuiFDL({ ...fuluContent, remedy }, lang);
                console.log(`[UI.renderRemediesTabbed] Generated FengShui FDL for ${resolvedName}: ${fdlData ? 'success' : 'failed'} `);
            } else if (remedy.type === 'medicine') {
                // Medicine: generate a Five Elements / Yin-Yang diagram, NOT a fulu talisman
                fdlData = this.generateMedicineFDL(fuluContent, lang);
                console.log(`[UI.renderRemediesTabbed] Generated Medicine FDL for ${resolvedName}: ${fdlData ? 'success' : 'failed'} `);
            } else {
                // For regular Fulu (talisman), generate FDL
                fdlData = this.generateFuluFDL(fuluContent, lang);
                console.log(`[UI.renderRemediesTabbed] Generated Fulu FDL for ${resolvedName}: ${fdlData ? 'success' : 'failed'} `);
            }

            return {
                canvasId: `fuluCanvas_${index}`,
                remedy,
                fuluContent,
                fdlData,
                isFengShui,
                lang
            };
        });

        // Only render immediately if tab is visible
        if (isVisible) {
            this._renderPendingRemedies(0, null, currentGen);
        } else {
            console.log(`[UI.renderRemediesTabbed] Tab not visible, rendering deferred until tab activation`);
        }
    }

    static _renderPendingRemedies(retryCount = 0, itemsOverride = null, generation = null) {
        // If a new generation has started, abort this stale render loop
        if (generation !== null && this._remedyRenderGen !== generation) {
            console.log(`[UI._renderPendingRemedies] Aborting stale render loop(gen ${generation} != current ${this._remedyRenderGen})`);
            return;
        }

        const items = itemsOverride || this._pendingRemedyRenders;
        if (!items) return;

        console.log(`[UI._renderPendingRemedies] Rendering ${items.length} remedies(attempt ${retryCount + 1})`);

        const itemsSnapshot = items.slice(); // snapshot to avoid mutation issues
        setTimeout(() => {
            // Check generation again after timeout
            if (generation !== null && this._remedyRenderGen !== generation) return;

            const missing = [];
            itemsSnapshot.forEach(({ canvasId, fdlData, isFengShui, fuluContent }) => {
                const canvas = document.getElementById(canvasId);
                if (!canvas) {
                    console.warn(`[UI._renderPendingRemedies] Canvas ${canvasId} not found`);
                    missing.push({ canvasId, fdlData, isFengShui, fuluContent });
                    return;
                }

                // Debug canvas state
                const rect = canvas.getBoundingClientRect();
                console.log(`[UI._renderPendingRemedies] Canvas ${canvasId}: ${rect.width}x${rect.height}, hasFDL: ${!!fdlData} `);

                // If canvas has zero size but exists, retry later
                if (rect.width === 0 || rect.height === 0) {
                    console.log(`[UI._renderPendingRemedies] Canvas ${canvasId} has zero size, will retry`);
                    missing.push({ canvasId, fdlData, isFengShui, fuluContent });
                    return;
                }

                // Hide canvas container if no FDL and no meaningful content
                if (!fdlData && !fuluContent?.image) {
                    console.log(`[UI._renderPendingRemedies] No FDL for ${canvasId}, hiding canvas`);
                    const container = canvas.closest('.fulu-canvas-container');
                    if (container) container.style.display = 'none';
                    return;
                }

                if (typeof SigilTools === 'undefined') {
                    console.warn(`[UI._renderPendingRemedies] SigilTools not loaded`);
                    return;
                }

                // Check if already rendered to avoid over-drawing if multiple Timeouts hit at once
                if (canvas.dataset.rendered === 'true') {
                    console.log(`[UI._renderPendingRemedies] Canvas ${canvasId} already rendered, skipping`);
                    // Skip redrawing but don't add to missing
                    return;
                }
                canvas.dataset.rendered = 'true';

                let bgColor, strokeCol;

                if (isFengShui) {
                    bgColor = '#f4f4f9';
                    strokeCol = '#0a0a1a'; // Darker ink for better contrast
                } else {
                    bgColor = fdlData?.background || fuluContent.backgroundColor || '#f5f5dc';
                    strokeCol = SigilTools.contrastColor ? SigilTools.contrastColor(bgColor) : this.getContrastColor(bgColor);
                    // Enhanced contrast colors - darker and more saturated
                    if (strokeCol === '#000000') strokeCol = '#4a0000'; // Deep cinnabar red
                    if (strokeCol === '#FFFFFF') strokeCol = '#ffd700'; // Bright gold
                }

                SigilTools.draw(canvasId, {
                    fuluContent,
                    fdl: fdlData,
                    backgroundColor: bgColor,
                    strokeColor: strokeCol
                }, 4);
            });

            // If some canvases were missing (DOM not ready yet), retry up to 4 times
            if (missing.length > 0 && retryCount < 4) {
                const delay = 300 * (retryCount + 1);
                console.log(`[UI._renderPendingRemedies] ${missing.length} canvas(es) missing, retrying in ${delay} ms`);
                setTimeout(() => this._renderPendingRemedies(retryCount + 1, missing, generation), delay);
            }
        }, 100);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // EXPORT TABBED READING
    // ═══════════════════════════════════════════════════════════════════════════════

    static exportTabbedReading(format) {
        const container = document.querySelector('.reading-tabs-container');
        if (!container) return;

        const t = I18N[App.lang] || I18N['en'];
        const timestamp = new Date().toISOString().split('T')[0];
        const question = App.currentQuestion || 'I Ching Reading';

        if (format === 'md') {
            let md = `# ${t.oracle || 'I Ching Oracle'} Reading\n\n`;
            md += `** ${t.dateLabel || 'Date'}:** ${new Date().toLocaleDateString()} \n\n`;
            md += `** ${t.question || 'Question'}:** ${question} \n\n`;
            md += `-- -\n\n`;

            // Pre-analysis
            md += `## ${t.preAnalysis || 'Pre-Analysis'} \n\n`;
            const hexDetails = document.getElementById('hexagramDetailsContent');
            if (hexDetails) md += hexDetails.innerText + '\n\n';

            // Interpretation
            md += `## ${t.aiInterpretation || 'Interpretation'} \n\n`;
            const interpContent = document.getElementById('interpretation-content-area');
            if (interpContent) {
                const cards = interpContent.querySelectorAll('.tab-content-card');
                cards.forEach(card => {
                    const title = card.querySelector('.card-title');
                    const content = card.querySelector('.card-content');
                    if (title && content) {
                        md += `### ${title.innerText} \n\n${content.innerText} \n\n`;
                    }
                });
            }

            // Remedies
            md += `## ${t.remedies || 'Remedies'} \n\n`;
            const remediesContent = document.getElementById('remedies-content-area');
            if (remediesContent) {
                const items = remediesContent.querySelectorAll('.remedy-tab-item');
                items.forEach(item => {
                    md += item.innerText + '\n\n---\n\n';
                });
            }

            const blob = new Blob([md], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `iching - reading - ${timestamp}.md`;
            a.click();
            URL.revokeObjectURL(url);

        } else if (format === 'html') {
            let html = `< !DOCTYPE html > <html><head><meta charset="UTF-8"><title>I Ching Reading</title>`;
            html += `<style>body{font - family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;color:#333}</style></head><body>`;
            html += `<h1>${t.oracle || 'I Ching Oracle'} Reading</h1>`;
            html += `<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>`;
            html += `<p><strong>Question:</strong> ${question}</p><hr>`;
            html += container.innerHTML;
            html += `</body></html>`;

            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `iching - reading - ${timestamp}.html`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }


    // ═══════════════════════════════════════════════════════════════════════════════
    // ENHANCED BAZI RENDERING WITH ACTIVE COMPONENT HIGHLIGHTING
    // ═══════════════════════════════════════════════════════════════════════════════

    static renderBaziEnhanced(birthBaziExtended, currentBaziExtended, lang) {
        console.log(`[UI.renderBaziEnhanced] Called with`, birthBaziExtended ? 'birth data' : 'no birth', currentBaziExtended ? 'current data' : 'no current');

        const container = document.getElementById('lifePalaceContent');
        if (!container) {
            console.warn(`[UI.renderBaziEnhanced] Container not found`);
            return;
        }

        // Skip if no extended data available
        if (!birthBaziExtended && !currentBaziExtended) {
            console.log(`[UI.renderBaziEnhanced] No extended data, skipping`);
            return;
        }

        // Check if container is visible (has dimensions)
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) {
            console.log(`[UI.renderBaziEnhanced] Container not visible, deferring render`);
            // Store for later rendering when tab becomes visible
            this._pendingBaziRender = { birthBaziExtended, currentBaziExtended, lang };
            return;
        }

        const t = I18N[lang] || I18N['en'];

        // Generate unique canvas ID
        const canvasId = 'baziEnhancedCanvas_' + Date.now();

        // Append to existing content instead of replacing
        let html = `
            <div class="bazi-enhanced-container">
                <div class="bazi-diagram-wrapper">
                    <canvas id="${canvasId}" width="500" height="500" class="bazi-enhanced-canvas"></canvas>
                    <div class="bazi-legend">
                        <div class="legend-item"><span class="legend-color" style="background:#4CAF50"></span> Hetu (Generation)</div>
                        <div class="legend-item"><span class="legend-color" style="background:#2196F3"></span> Luoshu (Directions)</div>
                        <div class="legend-item"><span class="legend-color" style="background:#FF9800"></span> Xiantian (Spiritual)</div>
                        <div class="legend-item"><span class="legend-color" style="background:#9C27B0"></span> Houtian (Manifested)</div>
                    </div>
                </div>
                <div class="bazi-details-grid">
        `;

        // Add birth Bazi details
        if (birthBaziExtended) {
            html += this.generateBaziDetailCards(birthBaziExtended, t.birthBaziTitle || 'Birth BaZi', lang);
        }

        // Add current Bazi details
        if (currentBaziExtended) {
            html += this.generateBaziDetailCards(currentBaziExtended, t.currentBaziTitle || 'Current BaZi', lang);
        }

        html += `</div></div>`;
        container.insertAdjacentHTML('beforeend', html);

        // Render the enhanced diagram
        console.log(`[UI.renderBaziEnhanced] Scheduling diagram render for ${canvasId}`, birthBaziExtended ? 'has data' : 'no data');
        setTimeout(() => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn(`[UI.renderBaziEnhanced] Canvas ${canvasId} not found`);
                return;
            }
            if (typeof SigilTools === 'undefined') {
                console.warn(`[UI.renderBaziEnhanced] SigilTools not loaded`);
                return;
            }
            if (!birthBaziExtended) {
                console.warn(`[UI.renderBaziEnhanced] No Bazi data - birthBaziExtended is null / undefined`);
                return;
            }
            console.log(`[UI.renderBaziEnhanced] Bazi data keys: `, Object.keys(birthBaziExtended || {}));

            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            if (rect.width === 0 || rect.height === 0) {
                console.warn(`[UI.renderBaziEnhanced] Canvas has zero size`);
                return;
            }

            console.log(`[UI.renderBaziEnhanced] Rendering diagram, canvas size: ${rect.width}x${rect.height} `);

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const size = Math.min(rect.width, rect.height) * 0.9;

            SigilTools.drawBaziEnhanced(ctx, cx, cy, size, birthBaziExtended, {
                stroke: '#d4af37',
                showHetu: true,
                showLuoshu: true,
                showXiantian: true,
                showHoutian: true
            });
            console.log(`[UI.renderBaziEnhanced] Diagram rendered successfully`);
        }, 200);
    }

    static generateBaziDetailCards(baziData, title, lang) {
        const t = I18N[lang] || I18N['en'];
        let html = `<div class="bazi-detail-section"><h4>${title}</h4>`;

        // Hetu info
        if (baziData.hetu) {
            html += `
            <div class="bazi-detail-card hetu-card">
                    <div class="card-header">河圖 Hetu</div>
                    <div class="card-content">
                        <div class="detail-row">
                            <span class="label">${t.dominantElement || 'Dominant'}:</span>
                            <span class="value">${baziData.hetu.generationAnalysis?.dominantElement || '-'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">${t.lifePathType || 'Life Path'}:</span>
                            <span class="value">${baziData.hetu.lifePath?.pathType || '-'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Luoshu info
        if (baziData.luoshu) {
            html += `
            <div class="bazi-detail-card luoshu-card">
                    <div class="card-header">洛書 Luoshu</div>
                    <div class="card-content">
                        <div class="detail-row">
                            <span class="label">${t.mingGua || 'Life Gua'}:</span>
                            <span class="value">${baziData.luoshu.mingGua?.number || '-'} (${baziData.luoshu.mingGua?.trigram || ''})</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">${t.favorableDirections || 'Favorable'}:</span>
                            <span class="value">${baziData.luoshu.mingGua?.favorableDirections?.shengQi || '-'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Xiantian info
        if (baziData.xiantian) {
            html += `
            <div class="bazi-detail-card xiantian-card">
                    <div class="card-header">先天 Xiantian</div>
                    <div class="card-content">
                        <div class="detail-row">
                            <span class="label">${t.dominantTreasure || 'Dominant Treasure'}:</span>
                            <span class="value">${baziData.xiantian.threeTreasures?.dominant || '-'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">${t.congenitalNature || 'Nature'}:</span>
                            <span class="value">${baziData.xiantian.congenitalNature?.description || '-'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // DUAL BAGUA RENDERING FOR ALL DIAGRAMS
    // ═══════════════════════════════════════════════════════════════════════════════

    static renderDualBaguaDiagram(containerId, options = {}) {
        const canvas = document.getElementById(containerId);
        if (!canvas || typeof SigilTools === 'undefined') return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const {
            houtianActive = [],
            xiantianActive = [],
            title = null
        } = options;

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Draw dual Bagua
        SigilTools.drawDualBagua(ctx, rect.width / 2, rect.height / 2 - (title ? 20 : 0),
            Math.min(rect.width, rect.height) * 0.85, {
            houtianActive,
            xiantianActive,
            showLabels: true,
            stroke: '#d4af37',
            highlightColor: '#00FF00',
            arrangement: 'both'
        });

        // Draw title if provided
        if (title) {
            ctx.fillStyle = '#d4af37';
            ctx.font = `bold 16px "Noto Serif SC", sans - serif`;
            ctx.textAlign = 'center';
            ctx.fillText(title, rect.width / 2, rect.height - 10);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // GRAPHICAL SUMMARY DASHBOARD FOR HOME
    // ═══════════════════════════════════════════════════════════════════════════════

    static renderGraphicalSummary(reading, lang) {
        const container = document.getElementById('graphicalSummary');
        if (!container || !reading) return;

        const t = I18N[lang] || I18N['en'];
        const hex = reading.hex;
        // Binary: positions 0-2 = lower trigram, positions 3-5 = upper trigram
        const lower = reading.binaryKey?.substring(0, 3);
        const upper = reading.binaryKey?.substring(3, 6);

        let html = `
            <div class="graphical-summary-container">
                <div class="summary-hexagram-section">
                    <h4>${hex?.name_en || ''} <span class="zh">${hex?.name_zh || ''}</span></h4>
                    <div class="summary-hexagram-display">
                        <div class="hex-visual-mini">
        `;

        // Draw hexagram lines
        if (reading.lines) {
            for (let i = reading.lines.length - 1; i >= 0; i--) {
                const line = reading.lines[i];
                html += `<div class="line-mini ${line.isYang ? 'yang' : 'yin'} ${line.isChanging ? 'changing' : ''}"></div>`;
            }
        }

        html += `
                        </div>
                        <div class="hex-info-mini">
                            <div class="trigram-pair">
                                <span class="trigram-badge upper">${TRIGRAMS[upper]?.name?.[lang] || TRIGRAMS[upper]?.name?.en || upper}</span>
                                <span class="trigram-connector">${t.over || 'over'}</span>
                                <span class="trigram-badge lower">${TRIGRAMS[lower]?.name?.[lang] || TRIGRAMS[lower]?.name?.en || lower}</span>
                            </div>
                            <div class="hex-number">#${hex?.number || ''}</div>
                        </div>
                    </div>
                </div>

                <div class="summary-bagua-section">
                    <h4>${t.baguaDiagram || 'Bagua Diagram'}</h4>
                    <div class="summary-bagua-container">
                        <canvas id="summaryBaguaCanvas" width="400" height="240"></canvas>
                    </div>
                    <div class="active-trigrams">
                        <span class="active-label">${t.active || 'Active'}:</span>
                        <span class="active-badges">
                            <span class="badge houtian">${TRIGRAMS[upper]?.name?.[lang] || TRIGRAMS[upper]?.name?.en || upper}</span>
                            <span class="badge houtian">${TRIGRAMS[lower]?.name?.[lang] || TRIGRAMS[lower]?.name?.en || lower}</span>
                        </span>
                    </div>
                </div>
        `;

        // Add elements summary if available
        if (reading.equilibrium) {
            html += `
            <div class="summary-elements-section">
                    <h4>${t.elements || 'Elements'}</h4>
                    <div class="yin-yang-mini">
                        <div class="balance-bar-mini">
                            <div class="yang-fill" style="width: ${(reading.equilibrium.yangCount / 6) * 100}%"></div>
                        </div>
                        <div class="balance-labels">
                            <span>☯️ ${reading.equilibrium.yangCount}Y / ${reading.equilibrium.yinCount}Y</span>
                        </div>
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;

        // Render mini Bagua diagram
        requestAnimationFrame(() => {
            this.renderSummaryBagua('summaryBaguaCanvas', upper, lower);
        });
    }

    static renderSummaryBagua(canvasId, upperKey, lowerKey) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof SigilTools === 'undefined') return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const upperTrigram = TRIGRAMS[upperKey];
        const lowerTrigram = TRIGRAMS[lowerKey];

        // Draw dual Bagua with active trigrams highlighted
        // Size must account for dual layout: total width ≈ size * 1.5 (two diagrams + gap + text)
        const baguaSize = Math.min(rect.width * 0.65, rect.height * 1.3);
        SigilTools.drawDualBagua(ctx, rect.width / 2, rect.height / 2, baguaSize, {
            houtianActive: [upperTrigram?.name, lowerTrigram?.name].filter(Boolean),
            xiantianActive: [], // Could calculate based on hexagram
            showLabels: false,
            stroke: '#d4af37',
            highlightColor: '#00FF00',
            arrangement: 'both'
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // UPDATE BAGUA MEDICINE DIAGRAM TO USE DUAL BAGUA
    // ═══════════════════════════════════════════════════════════════════════════════

    static renderBaguaMedicineDiagramDual(canvasId, fengShuiData, lang) {
        console.log(`[UI.renderBaguaMedicineDiagramDual] Called for ${canvasId}`);
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`[UI.renderBaguaMedicineDiagramDual] Canvas ${canvasId} not found`);
            return;
        }
        if (typeof SigilTools === 'undefined') {
            console.warn(`[UI.renderBaguaMedicineDiagramDual] SigilTools not loaded`);
            return;
        }
        if (!fengShuiData) {
            console.warn(`[UI.renderBaguaMedicineDiagramDual] No fengShuiData`);
            return;
        }

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            console.warn(`[UI.renderBaguaMedicineDiagramDual] Canvas has zero size`);
            return;
        }

        console.log(`[UI.renderBaguaMedicineDiagramDual] Canvas size: ${rect.width}x${rect.height} `);

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Map directions to trigram names for highlighting
        const directionToTrigram = {
            'S': 'Li', 'South': 'Li',
            'SE': 'Xun', 'Southeast': 'Xun',
            'E': 'Zhen', 'East': 'Zhen',
            'NE': 'Gen', 'Northeast': 'Gen',
            'N': 'Kan', 'North': 'Kan',
            'NW': 'Qian', 'Northwest': 'Qian',
            'W': 'Dui', 'West': 'Dui',
            'SW': 'Kun', 'Southwest': 'Kun'
        };

        const houtianActive = [];
        const xiantianActive = [];

        if (fengShuiData.favorable) {
            fengShuiData.favorable.forEach(dir => {
                const trigram = directionToTrigram[dir.trim()];
                if (trigram) houtianActive.push(trigram);
            });
        }

        if (fengShuiData.unfavorable) {
            fengShuiData.unfavorable.forEach(dir => {
                const trigram = directionToTrigram[dir.trim()];
                if (trigram && !houtianActive.includes(trigram)) {
                    houtianActive.push(trigram);
                }
            });
        }

        // Draw dual Bagua with highlights
        SigilTools.drawDualBagua(ctx, rect.width / 2, rect.height / 2 - 15,
            Math.min(rect.width, rect.height) * 0.85, {
            houtianActive,
            xiantianActive,
            showLabels: true,
            stroke: '#d4af37',
            highlightColor: '#00FF00',
            arrangement: 'both',
            translateDirection: (dir) => UI._translateDirection(dir, lang)
        });

        // Draw legend
        const t = I18N[lang] || I18N['en'];
        ctx.fillStyle = '#00FF00';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${t.favorable || 'Favorable'}: ${fengShuiData.favorable?.join(', ') || '-'} `,
            rect.width / 2, rect.height - 25);
        ctx.fillStyle = '#FF4444';
        ctx.fillText(`${t.unfavorable || 'Unfavorable'}: ${fengShuiData.unfavorable?.join(', ') || '-'} `,
            rect.width / 2, rect.height - 10);
    }
}
