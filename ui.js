class UI {
    static renderLunarMansion(mansion, date, lang) {
        const panel = document.getElementById('lunarMansionPanel');
        if (!mansion) {
            panel.style.display = 'none';
            return;
        }

        const moonPhase = Astrology.getMoonPhase(date);
        const dateStr = date.toLocaleDateString(
            lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'zh-CN',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );

        const t = I18N[lang];
        const groupColor = mansion.element.toLowerCase();

        panel.innerHTML = `
            <div class="lunar-mansion-header">
                <div class="moon-icon" role="img" aria-label="Moon Phase">${moonPhase.icon}</div>
                <div class="header-titles">
                    <div class="lunar-mansion-title">${mansion['name_' + lang] || mansion.name_en} ${mansion.name_zh}</div>
                    <div class="lunar-mansion-subtitle">${moonPhase.name[lang]} \u2022 ${dateStr}</div>
                </div>
            </div>
            <div class="lunar-mansion-content">
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.elements}</div>
                    <div class="lunar-detail-value" style="color: var(--${groupColor})">${t[groupColor] || mansion.element}</div>
                </div>
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.animal || 'Animal'}</div>
                    <div class="lunar-detail-value">${mansion.animal}</div>
                </div>
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.degrees || 'Degrees'}</div>
                    <div class="lunar-detail-value">${mansion.degrees}\u00b0</div>
                </div>
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.number || '#'}</div>
                    <div class="lunar-detail-value">${mansion.num} / 28</div>
                </div>
            </div>
            <div class="four-symbols-badge">${mansion['group_' + lang] || mansion.group}</div>
        `;
        panel.style.display = 'flex';
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
                <div class="moon-icon">
                    <svg class="icon" aria-hidden="true" style="width: 40px; height: 40px;"><use href="#icon-palace"/></svg>
                </div>
                <div class="header-titles">
                    <div class="lunar-mansion-title">${t.lifePalaceZiWei || 'Life Palace (Zi Wei)'}</div>
                    <div class="lunar-mansion-subtitle">${t.basedOnBirthTime || 'Based on birth time'}</div>
                </div>
            </div>
            <div class="palace-grid">
                <div class="palace-card">
                    <div class="palace-label">${t.lifePalace || 'Life Palace'}</div>
                    <div class="palace-value">${lifeBranch}</div>
                </div>
                <div class="palace-card">
                    <div class="palace-label">${t.bodyPalace || 'Body Palace'}</div>
                    <div class="palace-value">${bodyBranch}</div>
                </div>
            </div>
            ${hourPillar ? `
            <div class="lunar-detail" style="grid-column: 1 / -1; margin-top: 8px;">
                <div class="lunar-detail-label">${t.hourPillar || 'Hour Pillar'}</div>
                <div class="lunar-detail-value">${hourPillar}</div>
            </div>` : ''}
        `;
        panel.style.display = 'flex';
    }

    static renderEquilibrium(eq, lang) {
        const panel = document.getElementById('equilibriumPanel');
        const t = I18N[lang];
        const yangPercent = (eq.yangCount / 6) * 100;

        panel.innerHTML = `
            <h3 style="color: var(--gold); margin-top: 0; font-size: 1.4rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px; font-family: var(--font-zh);">
                <span class="icon" style="width: 1.5em; height: 1.5em;"><svg><use href="#icon-yinyang"/></svg></span>
                ${t.elements}
            </h3>
            <div class="equilibrium-grid">
                <div class="equilibrium-card">
                    <h4>${t.yinYangBalance || 'Yin-Yang Balance'}</h4>
                    <div style="margin: 12px 0;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 8px; font-weight: 600; color: var(--text-dim);">
                            <span>${t.yang || 'Yang'}: ${eq.yangCount}</span>
                            <span>${t.yin || 'Yin'}: ${eq.yinCount}</span>
                        </div>
                        <div class="balance-bar">
                            <div class="balance-fill yang" style="width: ${yangPercent}%;"></div>
                        </div>
                    </div>
                    <p style="font-weight: 700; color: var(--gold-bright); font-size: 1.1rem; margin-top: 8px;">
                        ${t[eq.balanceState] || eq.balanceState}
                    </p>
                </div>

                <div class="equilibrium-card">
                    <h4>${t.stability || 'Stability'}</h4>
                    <p style="font-size: 1.25rem; font-weight: 700; color: var(--fire); margin-bottom: 4px;">
                        ${t[eq.stabilityState] || eq.stabilityState}
                    </p>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">
                        ${eq.movingCount} ${t.movingLines} \u2022 ${6 - eq.movingCount} ${t.stable || 'Stable'}
                    </p>
                </div>

                <div class="equilibrium-card">
                    <h4>${t.upper || 'Upper'} ${t.trigram || 'Trigram'}</h4>
                    <div class="trigram-symbol" style="color: var(--${eq.upperTrigram?.element?.toLowerCase() || 'metal'}); font-size: 2rem;">
                        ${eq.upperTrigram?.symbol || '\u2630'}
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                        ${eq.upperTrigram?.name?.[lang] || ''}
                    </p>
                </div>

                <div class="equilibrium-card">
                    <h4>${t.lower || 'Lower'} ${t.trigram || 'Trigram'}</h4>
                    <div class="trigram-symbol" style="color: var(--${eq.lowerTrigram?.element?.toLowerCase() || 'metal'}); font-size: 2rem;">
                        ${eq.lowerTrigram?.symbol || '\u2630'}
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                        ${eq.lowerTrigram?.name?.[lang] || ''}
                    </p>
                </div>
            </div>
        `;
        panel.style.display = 'block';
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

    static renderBaguaStrip() {
        const strip = document.getElementById('baguaHexStrip');
        if (!strip) return;
        
        strip.innerHTML = Object.entries(TRIGRAMS).map(([key, tg], idx) => {
            // Use a linear layout for the strip but same card style
            return `
                <div class="trigram-card-node hex-${tg.name.en.toLowerCase()}" 
                     style="position: relative; transform: none; min-width: 120px;"
                     data-trigram="${tg.name.en.toLowerCase()}" 
                     onclick="UI.handleTrigramClick('${tg.name.en.toLowerCase()}', event)">
                    <span class="trigram-position">${tg.direction}</span>
                    <svg class="trigram-svg" viewBox="0 0 50 45">
                        ${key.split('').map((bit, i) =>
                            bit === '1'
                                ? `<line x1="5" y1="${7 + i * 15}" x2="45" y2="${7 + i * 15}" stroke="currentColor" stroke-width="3" stroke-linecap="round" />`
                                : `<line x1="5" y1="${7 + i * 15}" x2="45" y2="${7 + i * 15}" class="yin-line" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="18,4" />`
                        ).join('')}
                    </svg>
                    <span class="bagua-strip-name">${tg.name[App.lang]}</span>
                    <span class="trigram-chinese-text" onclick="UI.showTrigramPopup('${tg.name.en.toLowerCase()}', event)">${tg.symbol}</span>
                </div>
            `;
        }).join('');
    }

    static renderTrigramCardNode(tg, binaryKey, index, isActive = false) {
        const trigramId = tg.name.en.toLowerCase();
        
        // Strictly Traditionally Correct Later Heaven Layout (South at TOP)
        // Order: S, SW, W, NW, N, NE, E, SE
        const layout = {
            'S':  { x: 0,    y: -250 }, // Top
            'SW': { x: 177,  y: -177 }, // Top Right
            'W':  { x: 250,  y: 0 },    // Right
            'NW': { x: 177,  y: 177 },  // Bottom Right
            'N':  { x: 0,    y: 250 },  // Bottom
            'NE': { x: -177, y: 177 }, // Bottom Left
            'E':  { x: -250, y: 0 },   // Left
            'SE': { x: -177, y: -177 } // Top Left
        };

        const pos = layout[tg.direction] || { x: 0, y: 0 };

        return `
            <div class="trigram-card-node ${isActive ? 'active' : ''} hex-${trigramId}" 
                 style="transform: translate(${pos.x}px, ${pos.y}px)"
                 data-trigram="${trigramId}" 
                 onclick="UI.handleTrigramClick('${trigramId}', event)">
                <span class="trigram-position">${tg.direction}</span>
                <svg class="trigram-svg" viewBox="0 0 50 45">
                    ${binaryKey.split('').map((bit, i) =>
                        bit === '1'
                            ? `<line x1="5" y1="${7 + i * 15}" x2="45" y2="${7 + i * 15}" stroke="currentColor" stroke-width="3" stroke-linecap="round" />`
                            : `<line x1="5" y1="${7 + i * 15}" x2="45" y2="${7 + i * 15}" class="yin-line" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="18,4" />`
                    ).join('')}
                </svg>
                <span class="bagua-strip-name">${tg.name[App.lang]}</span>
                <span class="trigram-chinese-text" onclick="UI.showTrigramPopup('${trigramId}', event)">${tg.symbol}</span>
            </div>
        `;
    }

    static renderHexagram(lines, binaryKey, hexagramData) {
        const container = document.getElementById('resultsContent');
        const bookmarks = document.getElementById('resultsBookmarks');
        if (bookmarks) bookmarks.style.display = 'flex';
        
        const upperKey = binaryKey.substring(0, 3);
        const lowerKey = binaryKey.substring(3, 6);
        const upper = TRIGRAMS[upperKey];
        const lower = TRIGRAMS[lowerKey];
        const t = I18N[App.lang] || I18N['en'];

        // Define sections
        const sections = [
            { id: 'astro', title: 'Astrology', content: `
                <div class="astro-panels-grid">
                    <div id="lunarMansionPanel" class="lunar-mansion-panel" style="display: none;"></div>
                    <div id="lifePalacePanel" class="life-palace-panel" style="display: none;"></div>
                </div>`, full: false },
            { id: 'balance', title: 'Balance', content: `<div id="equilibriumPanel" class="equilibrium-panel" style="display: none;"></div>`, full: false },
            { id: 'visual', title: 'Visual', content: `
                <div class="top-section">
                    <div class="coin-tosses-section">
                        <h3 class="section-title">${t.coinTosses || 'Coin Tosses'}</h3>
                        <div id="coinTossGrid" class="coin-toss-grid"></div>
                    </div>
                    <div class="hexagram-visual">
                        <div class="hexagram-stack">
                            <div id="upperTrigramSymbol" class="trigram-symbol" style="color: var(--${upper?.element || 'metal'});">${upper?.symbol || '☰'}</div>
                            <div id="hexagramLines" class="hexagram-lines"></div>
                            <div id="lowerTrigramSymbol" class="trigram-symbol" style="color: var(--${lower?.element || 'metal'});">${lower?.symbol || '☰'}</div>
                        </div>
                    </div>
                    <div class="hexagram-info">
                        <h3 class="section-title">${t.hexagramDetails || 'Hexagram Details'}</h3>
                        <div id="hexagramDescription"></div>
                    </div>
                </div>`, full: true },
            { id: 'bagua', title: 'Bagua', content: `
                <div class="bagua-hex-layout" id="baguaDisplay">
                    ${Object.entries(TRIGRAMS).map(([key, tg], idx) => {
                        const isActive = key === upperKey || key === lowerKey;
                        return this.renderTrigramCardNode(tg, key, idx, isActive);
                    }).join('')}
                    <div class="bagua-center-symbol" onclick="App.toggleFiveElementsInfo()">
                        <svg class="icon" style="width: 100%; height: 100%;"><use href="#icon-yinyang"/></svg>
                    </div>
                </div>`, full: true },
            { id: 'texts', title: 'Classical Texts', content: `
                <div id="textPanels" class="text-display-grid-split">
                    <div class="text-panel">
                        <h4>${t.originalText || 'Original Text'}</h4>
                        <div id="originalText">${t.loading || 'Loading...'}</div>
                    </div>
                    <div class="text-panel">
                        <h4>${t.translation || 'Translation'}</h4>
                        <div id="translationText">${t.loading || 'Loading...'}</div>
                    </div>
                </div>`, full: true },
            { id: 'ai', title: 'AI Guide', content: `
                <div id="aiSection" class="ai-section">
                    <div class="ai-header-wrapper">
                        <h2>${t.aiInterpretation || 'AI Interpretation'}</h2>
                    </div>
                    <div class="interpretation-content" id="aiInterpretationContent">
                        <div class="loading"></div> ${t.consulting || 'Consulting oracle...'}
                    </div>
                </div>`, full: true }
        ];

        // Build Bookmarks
        if (bookmarks) {
            bookmarks.innerHTML = sections.map(s => `
                <a href="#section-${s.id}" class="bookmark-link">${s.title}</a>
            `).join('');
        }

        // Build HTML structure
        container.innerHTML = `
            <div class="result-header">
                <p class="current-question">${App.currentQuestion}</p>
                <h2 class="hexagram-title">${hexagramData.number}. ${hexagramData['name_' + App.lang] || hexagramData.name_en}</h2>
                <div class="action-buttons">
                    <button class="wizard-btn secondary" onclick="App.newReading()">${t.newReading || 'New Reading'}</button>
                    <button class="wizard-btn" onclick="App.continueQuestion()">${t.askAgain || 'Ask Again'}</button>
                </div>
            </div>

            <div class="results-grid-layout">
                ${sections.map(s => this.createSection(s.id, s.title, s.content, s.full)).join('')}
            </div>
        `;

        // Draw coin tosses using DOM methods (from _i.html)
        const cGrid = document.getElementById('coinTossGrid');
        if (cGrid) {
            cGrid.innerHTML = '';
            for (let i = lines.length - 1; i >= 0; i--) {
                const row = document.createElement('div');
                row.className = 'coin-row';
                lines[i].bits.forEach(b => {
                    const c = document.createElement('div');
                    c.className = `coin ${b === '1' ? 'head' : 'tail'}`;
                    c.textContent = b === '1' ? '☰' : '⚋';
                    row.appendChild(c);
                });
                cGrid.appendChild(row);
            }
        }

        // Draw hexagram lines using DOM methods (from _i.html)
        const lCont = document.getElementById('hexagramLines');
        if (lCont) {
            lCont.innerHTML = '';
            for (let i = lines.length - 1; i >= 0; i--) {
                const d = document.createElement('div');
                d.className = `line ${lines[i].isYang ? 'yang' : 'yin'}${lines[i].isChanging ? ' changing' : ''}`;
                if (lines[i].isChanging) {
                    const m = document.createElement('span');
                    m.className = 'changing-marker';
                    m.innerHTML = '<svg class="icon" style="width: 8px; height: 8px;"><use href="#icon-circle"/></svg>';
                    d.appendChild(m);
                }
                lCont.appendChild(d);
            }
        }

        // Draw hexagram description
        const desc = document.getElementById('hexagramDescription');
        if (desc) {
            desc.innerHTML = `
                <p class="hex-desc-text"><strong>${t.upper || 'Upper'}:</strong> ${upper?.name?.[App.lang] || ''} (${upper?.nature?.element})</p>
                <p class="hex-desc-text"><strong>${t.lower || 'Lower'}:</strong> ${lower?.name?.[App.lang] || ''} (${lower?.nature?.element})</p>
                <p class="hex-desc-text"><strong>${t.binary || 'Binary'}:</strong> ${binaryKey}</p>
                <p class="hex-desc-text"><strong>${t.decimal || 'Decimal'}:</strong> ${parseInt(binaryKey, 2)}</p>
            `;
        }
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
        console.log(`[renderTranslation] lang=${lang}, apiTranslations:`, !!apiTranslations);
        if (apiTranslations) {
            console.log(`[renderTranslation] API classical texts for ${lang}:`, {
                hasJudgment: !!apiTranslations[lang]?.judgment,
                hasImage: !!apiTranslations[lang]?.image,
                hasLines: !!(apiTranslations[lang]?.lines?.length > 0),
                judgmentPreview: apiTranslations[lang]?.judgment?.substring(0, 50),
                imagePreview: apiTranslations[lang]?.image?.substring(0, 50)
            });
        }
        
        // Check database values
        const dbJudgment = hexData[`judgment_${lang}`];
        const dbImage = hexData.image?.[`image_${lang}`];
        const dbLines = hexData[`lines_${lang}`];
        console.log(`[renderTranslation] Database values for ${lang}:`, {
            hasDbJudgment: !!dbJudgment,
            hasDbImage: !!dbImage,
            hasDbLines: !!(dbLines?.length > 0)
        });
        
        // Get judgment for current language with fallback
        let judgment = dbJudgment;
        // Use API translation if JSON is missing
        if (!judgment && apiTranslations?.[lang]?.judgment) {
            judgment = apiTranslations[lang].judgment;
            console.log('[renderTranslation] Using API judgment for', lang);
        }
        if (!judgment && lang !== 'en') judgment = hexData.judgment_en;
        if (!judgment) judgment = hexData.judgment_zh;
        judgment = this.ensureString(judgment);
        
        // Get image for current language with fallback (nested object structure)
        let image = dbImage;
        // Use API translation if JSON is missing
        if (!image && apiTranslations?.[lang]?.image) {
            image = apiTranslations[lang].image;
            console.log('[renderTranslation] Using API image for', lang);
        }
        if (!image && lang !== 'en') image = hexData.image?.image_en;
        if (!image) image = hexData.image?.image_zh;
        image = this.ensureString(image);
        
        // Get lines for current language with fallback
        let lines = dbLines;
        // Use API translation if JSON is missing
        if ((!lines || !lines.length) && apiTranslations?.[lang]?.lines?.length > 0) {
            lines = apiTranslations[lang].lines;
            console.log('[renderTranslation] Using API lines for', lang, 'count:', lines.length);
        }
        if ((!lines || !lines.length) && lang !== 'en') lines = hexData.lines_en;
        if (!lines || !lines.length) lines = hexData.lines_zh;
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

    static renderAILoading(lang, customMessage) {
        const t = I18N[lang] || I18N['en'];
        const message = customMessage || t.consulting || 'Consulting oracle...';
        
        // Use the new Feng Shui loading overlay with blur
        this.showLoading(message, t.pleaseWait || 'Connecting with the I Ching wisdom');
        
        // Also update the container for fallback
        const container = document.getElementById('aiInterpretationContent');
        if (container) {
            container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px; color: var(--gold);">
                <div class="loading"></div>
                <span>${message}</span>
            </div>`;
        }
    }
    
    static hideAILoading() {
        this.hideLoading();
    }

    static showError(message, duration = 5000) {
        // Create error toast notification
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(200, 50, 50, 0.9);
            color: #f1f5f9;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 0.9em;
            z-index: 10000;
            max-width: 80%;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static showSuccess(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(50, 150, 50, 0.9);
            color: #f1f5f9;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 0.9em;
            z-index: 10000;
            max-width: 80%;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static renderAIInterpretation(result, lang) {
        const container = document.getElementById('aiInterpretationContent');
        if (!container) return;
        
        if (!result) {
            container.innerHTML = '<div style="color: var(--text-dim); padding: 20px;">Loading...</div>';
            return;
        }

        const r = result[lang] || result.en;
        if (!r) {
            container.innerHTML = '<div style="color: var(--text-dim); padding: 20px;">Interpretation unavailable</div>';
            return;
        }

        const t = I18N[lang] || I18N['en'];
        let html = '';
        
        ['celestial', 'elements', 'analysis', 'symbolism', 'advice'].forEach(key => {
            if (r[key]) {
                const title = t[key] || key;
                // FIX: Ensure value is a string
                let value = r[key];
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                html += `<div class="interp-section">
                    <div class="interp-title">${title}</div>
                    <div class="interp-text">${value}</div>
                </div>`;
            }
        });

        if (r.movingLines && String(r.movingLines).length > 10) {
            // FIX: Ensure movingLines is a string
            let movingLinesText = r.movingLines;
            if (typeof movingLinesText === 'object') {
                movingLinesText = JSON.stringify(movingLinesText);
            }
            html += `<div class="interp-lines-box">
                <div class="interp-header">\u26a1 ${t.movingLines || 'Moving Lines'}</div>
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
        
        // On mobile, keep highlight longer for better visibility
        const timeout = window.matchMedia('(max-width: 767px)').matches ? 5000 : 3000;
        
        setTimeout(() => {
            document.querySelectorAll(`[data-trigram="${name}"]`).forEach(card => {
                card.classList.remove('active');
            });
        }, timeout);
    }
    
    // Mobile-optimized render functions
    static isMobile() {
        return window.matchMedia('(max-width: 767px)').matches;
    }
    
    static isTouchDevice() {
        return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    }

    static showStep(n) {
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`step-${n}`).classList.add('active');
    }

    // ============================================
    // FENG SHUI VISUAL EFFECTS
    // ============================================

    // Trigram data for popups
    static trigramData = {
        heaven: { symbol: '☰', chinese: '乾', pinyin: 'Qián', meaning: { en: 'Creativity, strength, father', es: 'Creatividad, fuerza, padre', it: 'Creatività, forza, padre', zh: '创造力、刚强、父亲' }, element: { en: 'Metal', es: 'Metal', it: 'Metallo', zh: '金' }, color: '#FFD700' },
        wind: { symbol: '☴', chinese: '巽', pinyin: 'Xùn', meaning: { en: 'Gentleness, penetration, wind', es: 'Gentileza, penetración, viento', it: 'Gentilezza, penetrazione, vento', zh: '温柔、渗透、风' }, element: { en: 'Wood', es: 'Madera', it: 'Legno', zh: '木' }, color: '#2E8B57' },
        fire: { symbol: '☲', chinese: '离', pinyin: 'Lí', meaning: { en: 'Brightness,依附, fire', es: 'Brillo, adhesión, fuego', it: 'Luminosità, attaccamento, fuoco', zh: '光明、依附、火' }, element: { en: 'Fire', es: 'Fuego', it: 'Fuoco', zh: '火' }, color: '#FF4500' },
        earth: { symbol: '☷', chinese: '坤', pinyin: 'Kūn', meaning: { en: 'Receptivity, devotion, mother', es: 'Receptividad, devoción, madre', it: 'Ricezione, devozione, madre', zh: '承载、顺从、母亲' }, element: { en: 'Earth', es: 'Tierra', it: 'Terra', zh: '土' }, color: '#8B4513' },
        thunder: { symbol: '☳', chinese: '震', pinyin: 'Zhèn', meaning: { en: 'Arousing, movement, thunder', es: 'Excitación, movimiento, trueno', it: 'Suscitazione, movimento, tuono', zh: '振动、启动、雷' }, element: { en: 'Wood', es: 'Madera', it: 'Legno', zh: '木' }, color: '#4A0080' },
        water: { symbol: '☵', chinese: '坑', pinyin: 'Kǎn', meaning: { en: 'Danger, abyss, water', es: 'Peligro, abismo, agua', it: 'Pericolo, abisso, acqua', zh: '陷阱、深渊、水' }, element: { en: 'Water', es: 'Agua', it: 'Acqua', zh: '水' }, color: '#1E3A5F' },
        mountain: { symbol: '☶', chinese: '艮', pinyin: 'Gèn', meaning: { en: 'Stillness, keeping still, mountain', es: 'Quietud, inmovilidad, montaña', it: 'Arresto, immobilità, montagna', zh: '止静、屑屈、山' }, element: { en: 'Earth', es: 'Tierra', it: 'Terra', zh: '土' }, color: '#5D4E37' },
        lake: { symbol: '☱', chinese: '兌', pinyin: 'Duì', meaning: { en: 'Joy, pleasure, lake', es: 'Alegría, placer, lago', it: 'Gioia, piacere, lago', zh: '悦乐、满足、泽' }, element: { en: 'Metal', es: 'Metal', it: 'Metallo', zh: '金' }, color: '#87CEEB' }
    };

    static handleTrigramClick(trigram, event) {
        // Prevent event bubbling if clicking the Chinese text
        if (event && event.target.classList.contains('trigram-chinese-text')) {
            return;
        }
        
        // Apply thunder shock effect
        const item = event ? event.currentTarget : document.querySelector(`[data-trigram="${trigram}"]`);
        if (item) {
            item.classList.add('thunder-shock');
            setTimeout(() => item.classList.remove('thunder-shock'), 300);
        }
        
        // Trigger thunder flash on body
        document.body.classList.add('thunder-flash');
        setTimeout(() => document.body.classList.remove('thunder-flash'), 200);
        
        // Original highlight functionality
        this.highlightTrigram(trigram);
    }

    static showTrigramPopup(trigram, event) {
        event.stopPropagation();
        
        const data = this.trigramData[trigram];
        if (!data) return;
        
        const lang = App.lang || 'en';
        const popup = document.getElementById('trigramPopup');
        
        // Update popup content
        document.getElementById('popupSymbol').textContent = data.symbol;
        document.getElementById('popupTitle').textContent = data.name?.[lang] || trigram;
        document.getElementById('popupChinese').textContent = `${data.chinese} ${data.pinyin}`;
        document.getElementById('popupMeaning').textContent = data.meaning[lang] || data.meaning.en;
        
        const elementSpan = document.getElementById('popupElement');
        elementSpan.textContent = data.element[lang] || data.element.en;
        elementSpan.style.background = `rgba(${this.hexToRgb(data.color)}, 0.2)`;
        elementSpan.style.color = data.color;
        elementSpan.style.border = `1px solid ${data.color}`;
        
        // Position popup near the clicked element
        const rect = event.currentTarget.getBoundingClientRect();
        const popupWidth = 280;
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        
        // Calculate position
        let left = rect.left + rect.width / 2 - popupWidth / 2;
        let top = rect.bottom + 10;
        
        // Keep popup within viewport on mobile
        if (isMobile) {
            left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));
            // If popup would go off bottom, show it above the element
            if (top + 200 > window.innerHeight) {
                top = rect.top - 210;
            }
        }
        
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        
        // Show popup
        popup.classList.add('active');
        
        // Close popup on click outside
        const closePopup = (e) => {
            if (!popup.contains(e.target)) {
                popup.classList.remove('active');
                document.removeEventListener('click', closePopup);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closePopup);
        }, 100);
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '255, 255, 255';
    }

    // Loading overlay with blur
    static showLoading(text, subtext = '') {
        const overlay = document.getElementById('apiLoadingOverlay');
        const textEl = document.getElementById('loadingText');
        const subtextEl = overlay.querySelector('.loading-subtext');
        
        if (textEl) textEl.textContent = text;
        if (subtext && subtextEl) {
            subtextEl.innerHTML = `${subtext}<span class="loading-dots"></span>`;
        }
        
        overlay.classList.add('active');
        document.body.classList.add('loading-active');
    }

    static hideLoading() {
        const overlay = document.getElementById('apiLoadingOverlay');
        overlay.classList.remove('active');
        document.body.classList.remove('loading-active');
    }

    // Wind dust animation
    static windDustInterval = null;
    static windDustParticles = [];

    static startWindDust() {
        if (this.windDustInterval) return;
        
        const container = document.getElementById('windDustContainer');
        if (!container) return;
        
        // Create initial particles
        for (let i = 0; i < 20; i++) {
            this.createWindParticle(container);
        }
        
        // Add new particles periodically
        this.windDustInterval = setInterval(() => {
            if (document.hidden) return; // Don't create particles if tab is hidden
            this.createWindParticle(container);
        }, 500);
    }

    static stopWindDust() {
        if (this.windDustInterval) {
            clearInterval(this.windDustInterval);
            this.windDustInterval = null;
        }
        
        const container = document.getElementById('windDustContainer');
        if (container) {
            container.innerHTML = '';
        }
        this.windDustParticles = [];
    }

    static createWindParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'wind-particle';
        
        // Random starting position
        const startY = Math.random() * window.innerHeight;
        particle.style.left = '-10px';
        particle.style.top = `${startY}px`;
        
        // Random properties
        const duration = 8 + Math.random() * 10;
        const drift = (Math.random() - 0.5) * 100;
        const size = 2 + Math.random() * 3;
        const opacity = 0.3 + Math.random() * 0.5;
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.opacity = opacity;
        particle.style.setProperty('--wind-drift', `${drift}px`);
        particle.style.animationDuration = `${duration}s`;
        
        container.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, duration * 1000);
    }

    // Initialize Feng Shui effects
    static initFengShui() {
        // Start wind dust animation
        this.startWindDust();
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopWindDust();
            } else {
                this.startWindDust();
            }
        });
    }
}