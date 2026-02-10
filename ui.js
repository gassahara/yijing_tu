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

        panel.innerHTML = `
            <div class="lunar-mansion-header">
                <div class="moon-icon">${mansion.symbol}</div>
                <div>
                    <div class="lunar-mansion-title">${mansion['name_' + lang] || mansion.name_en} ${mansion.name_zh}</div>
                    <div class="lunar-mansion-subtitle">${moonPhase.icon} ${moonPhase.name[lang]} • ${dateStr}</div>
                </div>
            </div>
            <div class="lunar-mansion-content">
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.elements}</div>
                    <div class="lunar-detail-value">${mansion.element}</div>
                </div>
                <div class="lunar-detail">
                    <div class="lunar-detail-label">${t.animal || 'Animal'}</div>
                    <div class="lunar-detail-value">${mansion.animal}</div>
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
        panel.style.display = 'block';
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
        const t = I18N[lang];
        const yangPercent = (eq.yangCount / 6) * 100;

        panel.innerHTML = `
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

    static renderHexagram(lines, binaryKey, hexagramData) {
        const container = document.getElementById('resultsContent');
        const upperKey = binaryKey.substring(0, 3);
        const lowerKey = binaryKey.substring(3, 6);
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

            <div class="bagua-container" id="baguaDisplay">
                ${Object.entries(TRIGRAMS).map(([key, tg]) => {
            const isActive = key === upperKey || key === lowerKey;
            return `
                    <div class="trigram-card ${isActive ? 'active' : ''}" data-trigram="${tg.name.en.toLowerCase()}" onclick="UI.highlightTrigram('${tg.name.en.toLowerCase()}')">
                        <span class="trigram-position">${tg.direction}</span>
                        <svg class="trigram-svg" viewBox="0 0 50 45">
                            ${key.split('').map((bit, i) =>
                bit === '1'
                    ? `<line x1="5" y1="${7 + i * 15}" x2="45" y2="${7 + i * 15}" />`
                    : `<line x1="5" y1="${7 + i * 15}" x2="45" y2="${7 + i * 15}" class="yin-line" />`
            ).join('')}
                        </svg>
                        <span class="trigram-symbol">${tg.symbol}</span>
                        <span class="trigram-name">${tg.name[App.lang]}</span>
                        <span class="trigram-chinese">${tg.nature.element}</span>
                    </div>`;
        }).join('')}
                <div class="bagua-center-symbol" onclick="App.toggleFiveElementsInfo()">☯️</div>
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

            <div id="aiSection" class="ai-section">
                <div class="ai-header-wrapper">
                    <h2>${t.aiInterpretation || 'AI Interpretation'}</h2>
                </div>
                <div class="interpretation-content" id="aiInterpretationContent">
                    <div class="loading"></div> ${t.consulting || 'Consulting oracle...'}
                </div>
            </div>
        `;
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
        
        // Get judgment for current language with fallback
        let judgment = hexData[`judgment_${lang}`];
        console.log(`JSON judgment_${lang}:`, judgment?.substring(0, 50));
        // Use API translation if JSON is missing
        if (!judgment && apiTranslations?.[lang]?.judgment) {
            judgment = apiTranslations[lang].judgment;
            console.log('Using API judgment for', lang);
        }
        if (!judgment && lang !== 'en') judgment = hexData.judgment_en;
        if (!judgment) judgment = hexData.judgment_zh;
        judgment = this.ensureString(judgment);
        
        // Get image for current language with fallback (nested object structure)
        let image = hexData.image?.[`image_${lang}`];
        // Use API translation if JSON is missing
        if (!image && apiTranslations?.[lang]?.image) {
            image = apiTranslations[lang].image;
            console.log('Using API image for', lang);
        }
        if (!image && lang !== 'en') image = hexData.image?.image_en;
        if (!image) image = hexData.image?.image_zh;
        image = this.ensureString(image);
        
        // Get lines for current language with fallback
        let lines = hexData[`lines_${lang}`];
        // Use API translation if JSON is missing
        if ((!lines || !lines.length) && apiTranslations?.[lang]?.lines?.length > 0) {
            lines = apiTranslations[lang].lines;
            console.log('Using API lines for', lang, 'count:', lines.length);
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

    static renderAILoading(lang) {
        const container = document.getElementById('aiInterpretationContent');
        if (!container) return;
        const t = I18N[lang] || I18N['en'];
        container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px; color: var(--gold);">
            <div class="loading"></div>
            <span>${t.loading || 'Loading...'}</span>
        </div>`;
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
}