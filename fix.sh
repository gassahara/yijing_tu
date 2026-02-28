#!/bin/bash

# Fix UI layout, restore missing components in Balance/Equilibrium, and fix Astrology display
cat > ui.js << 'EOF'
/**
 * UI Controller for Yijingtu
 * Handles all DOM manipulation, rendering, and visual interactions.
 * Optimized for performance and stability.
 */
class UI {
    // ========================================================================
    // UTILITIES
    // ========================================================================

    static isMobile() {
        return window.matchMedia('(max-width: 767px)').matches;
    }

    static cleanRawText(text) {
        if (!text || typeof text !== 'string') return text;
        return text.replace(/\\n/g, '\n').trim();
    }

    static formatParagraphs(text) {
        if (!text) return '';
        text = this.cleanRawText(text).replace(/^\[[^\]]+\]\s*\n?/gm, '').trim();
        return text.split(/\n\n+/).map(p => {
            if (!p.trim()) return '';
            return `<p class="interp-text">${p.trim()}</p>`;
        }).join('');
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

    // ========================================================================
    // LAYOUT STYLES INJECTION
    // ========================================================================
    
    static injectLayoutStyles() {
        if (document.getElementById('layout-fixes-css')) return;
        const style = document.createElement('style');
        style.id = 'layout-fixes-css';
        style.innerHTML = `
            :root {
                --gold: #d4af37;
                --text-main: #f0f0f0;
                --bg-card: rgba(16, 20, 24, 0.8);
            }

            /* Main Grid */
            @media (min-width: 1024px) {
                .results-grid-layout {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 30px;
                    align-items: start;
                    width: 100%;
                }
                .full-width-section {
                    grid-column: 1 / -1;
                }
                .top-section {
                    display: grid;
                    grid-template-columns: auto 1fr auto;
                    gap: 40px;
                    align-items: center;
                    justify-content: center;
                }
            }

            .section-wrapper {
                background: var(--bg-card);
                border: 1px solid rgba(212, 175, 55, 0.15);
                border-radius: 12px;
                overflow: hidden;
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 20px;
                display: flex;
                flex-direction: column;
            }
            
            .section-content {
                padding: 25px;
                width: 100%;
                box-sizing: border-box;
            }

            /* Equilibrium / Balance Cards */
            .equilibrium-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-top: 15px;
            }
            .equilibrium-card {
                background: rgba(255,255,255,0.03);
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                border: 1px solid rgba(212,175,55,0.1);
            }

            /* Astro Grid */
            .astro-panels-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 20px;
                height: 100%;
            }
            
            /* Houtou Canvas Constraint */
            .houtou-diagram-container {
                margin: 20px auto;
                text-align: center;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                max-width: 250px; /* Constrain width */
            }
            
            .houtou-canvas {
                width: 100% !important;
                height: auto !important;
                aspect-ratio: 1/1;
                filter: drop-shadow(0 0 10px rgba(212,175,55,0.1));
            }

            /* Text Panels */
            .text-display-grid-split {
                display: grid;
                grid-template-columns: 1fr;
                gap: 25px;
            }
            @media (min-width: 900px) {
                .text-display-grid-split {
                    grid-template-columns: 1fr 1fr;
                }
            }
            
            .text-panel {
                background: rgba(0,0,0,0.2);
                padding: 20px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.05);
            }

            /* General Typography */
            .interp-text {
                font-size: 1.1rem;
                line-height: 1.7;
                color: var(--text-main);
                margin-bottom: 1em;
            }

            h3, h4 { margin-top: 0; color: var(--gold); }
            
            /* Bookmarks Bar - Center it */
            .results-bookmarks {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 10px;
                margin: 20px 0;
                padding: 10px;
                background: rgba(0,0,0,0.3);
                border-radius: 30px;
                border: 1px solid rgba(212,175,55,0.2);
            }
        `;
        document.head.appendChild(style);
    }

    // ========================================================================
    // RENDER LOGIC
    // ========================================================================

    static showStep(n) {
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
        const step = document.getElementById(`step-${n}`);
        if (step) step.classList.add('active');
    }

    static createSection(id, title, content, isFullWidth = false) {
        return `
            <div id="section-${id}" class="section-wrapper ${isFullWidth ? 'full-width-section' : ''}">
                <button class="section-toggle-btn" onclick="UI.toggleSection('${id}')" aria-label="Toggle ${title}">
                    <span style="display:flex;align-items:center;gap:10px;">${title}</span>
                    <svg class="icon icon-toggle" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
                </button>
                <div id="content-${id}" class="section-content">
                    ${content}
                </div>
            </div>
        `;
    }

    static toggleSection(id) {
        const content = document.getElementById(`content-${id}`);
        if (content) content.classList.toggle('hidden');
    }

    static renderHexagram(lines, binaryKey, hexData, lang) {
        this.injectLayoutStyles();
        
        // Store for highlighting
        this.upperBinary = binaryKey.substring(3, 6);
        this.lowerBinary = binaryKey.substring(0, 3);
        
        const upper = TRIGRAMS[this.upperBinary];
        const lower = TRIGRAMS[this.lowerBinary];
        const t = I18N[lang] || I18N['en'];
        const container = document.getElementById('resultsContent');
        const bookmarks = document.getElementById('resultsBookmarks');
        if (bookmarks) bookmarks.style.display = 'flex';

        // Section Definitions
        const sections = [
            { 
                id: 'visual', title: t.visual || 'Visual', full: true, 
                content: `
                <div class="top-section">
                    <div id="coinTossGrid" class="coin-toss-grid"></div>
                    <div class="hexagram-visual" style="margin: 0 auto; text-align: center;">
                        <div style="color:var(--gold);font-size:3em;line-height:0.8;">${upper?.symbol}</div>
                        <div id="hexLinesContainer" style="display:flex;flex-direction:column-reverse;gap:6px;margin:10px 0;"></div>
                        <div style="color:var(--gold);font-size:3em;line-height:0.8;">${lower?.symbol}</div>
                    </div>
                    <div class="hex-meta">
                        <p><strong>${t.upper}:</strong> ${upper?.name?.en} (${upper?.element})</p>
                        <p><strong>${t.lower}:</strong> ${lower?.name?.en} (${lower?.element})</p>
                        <p><strong>${t.binary}:</strong> ${binaryKey}</p>
                    </div>
                </div>`
            },
            { id: 'astro', title: t.celestial || 'Astrology', full: false, content: `<div class="astro-panels-grid"><div id="lunarMansionPanel" class="astro-panel"></div><div id="lifePalacePanel" class="astro-panel"></div></div>` },
            { id: 'balance', title: t.equilibrium || 'Balance', full: false, content: `<div id="equilibriumPanel"></div>` },
            { id: 'texts', title: t.originalText || 'Text', full: true, content: `<div id="textPanels" class="text-display-grid-split"><div id="originalText" class="text-panel"></div><div id="translationText" class="text-panel"></div></div>` },
            { id: 'ai', title: t.aiInterpretation || 'AI', full: true, content: `<div id="aiInterpretationContent"></div>` },
            { id: 'remedies', title: t.remedies || 'Remedies', full: true, content: `<div id="remediesContent"></div>` },
            { id: 'bagua-medicine', title: t.baguaMedicineTitle || 'Bagua Medicine', full: true, content: `<div id="baguaMedicineContent"></div>` }
        ];

        // Build HTML
        container.innerHTML = `
            <div class="result-header">
                <h2>${hexData.number}. ${hexData['name_' + lang] || hexData.name_en}</h2>
                <p class="current-question">${App.currentQuestion || ''}</p>
                <div class="action-buttons">
                    <button class="wizard-btn secondary" onclick="App.newReading()">${t.newReading}</button>
                    <button class="wizard-btn" onclick="App.continueQuestion()">${t.askAgain}</button>
                </div>
            </div>
            <div class="results-grid-layout">
                ${sections.map(s => this.createSection(s.id, s.title, s.content, s.full)).join('')}
            </div>
        `;
        
        // Populate Visuals
        if(bookmarks) bookmarks.innerHTML = sections.map(s => `<a href="#section-${s.id}" class="bookmark-link">${s.title}</a>`).join('');
        this.renderCoinsVisual(lines);
        this.renderLinesVisual(lines);
    }

    static renderCoinsVisual(lines) {
        const grid = document.getElementById('coinTossGrid');
        if(!grid) return;
        lines.slice().reverse().forEach(l => {
            const row = document.createElement('div');
            row.className = 'coin-row';
            l.bits.forEach(b => {
                const c = document.createElement('div');
                c.className = `coin ${b === '1' ? 'head' : 'tail'}`;
                c.innerText = b === '1' ? '☰' : '⚋';
                row.appendChild(c);
            });
            grid.appendChild(row);
        });
    }

    static renderLinesVisual(lines) {
        const container = document.getElementById('hexLinesContainer');
        if (!container) return;
        
        lines.forEach(l => {
            const div = document.createElement('div');
            div.style.cssText = `width:160px;height:16px;background:${l.isYang?'var(--gold)':'transparent'};display:flex;justify-content:space-between;position:relative;`;
            
            if (!l.isYang) {
                div.innerHTML = `<span style="width:45%;height:100%;background:var(--gold)"></span><span style="width:45%;height:100%;background:var(--gold)"></span>`;
            }
            if (l.isChanging) {
                const marker = document.createElement('div');
                marker.style.cssText = "position:absolute;right:-20px;color:red;font-weight:bold;";
                marker.innerText = "o";
                div.appendChild(marker);
            }
            container.appendChild(div);
        });
    }

    // ========================================================================
    // ASTROLOGY (Houtou & Life Palace)
    // ========================================================================

    static renderLunarMansion(mansion, date, lang, analysis = null) {
        const panel = document.getElementById('lunarMansionPanel');
        if (!mansion || !panel) return;
        
        const t = I18N[lang] || I18N['en'];
        const canvasId = `houtou_${Date.now()}`;
        
        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="margin:0;display:flex;align-items:center;gap:10px;">
                    <svg width="20" height="20"><use href="#icon-moon"/></svg> 
                    ${t.lunarMansionTitle}
                </h3>
            </div>
            <div class="houtou-diagram-container">
                <canvas id="${canvasId}" class="houtou-canvas"></canvas>
                <div style="font-size:0.8em;color:#aaa;margin-top:8px;">Houtian Bagua</div>
            </div>
            <div style="margin-top:20px;border-top:1px solid rgba(255,255,255,0.1);padding-top:15px;">
                <div class="lunar-detail"><span class="lunar-detail-label">${t.name}:</span> <span class="lunar-detail-value">${mansion['name_' + lang] || mansion.name_en}</span></div>
                <div class="lunar-detail"><span class="lunar-detail-label">${t.animal}:</span> <span class="lunar-detail-value">${mansion.animal} (${mansion.group})</span></div>
                <div class="lunar-detail"><span class="lunar-detail-label">${t.element}:</span> <span class="lunar-detail-value" style="color:var(--${mansion.element.toLowerCase()})">${mansion.element}</span></div>
                ${analysis ? `<div class="interp-text" style="margin-top:15px;">${analysis}</div>` : ''}
            </div>
        `;
        
        setTimeout(() => this.renderHoutouDiagram(canvasId, mansion), 0);
    }

    static renderHoutouDiagram(canvasId, mansion) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Force square size for Bagua
        const size = 350;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparent
        ctx.clearRect(0,0, size, size);

        // Active Trigrams from stored state
        const activeTrigrams = [];
        if (typeof TRIGRAMS !== 'undefined') {
            if (this.upperBinary && TRIGRAMS[this.upperBinary]) activeTrigrams.push(TRIGRAMS[this.upperBinary].name.en);
            if (this.lowerBinary && TRIGRAMS[this.lowerBinary]) activeTrigrams.push(TRIGRAMS[this.lowerBinary].name.en);
        }

        if (typeof SigilTools !== 'undefined') {
            SigilTools.drawBagua(ctx, size/2, size/2, size, { activeTrigrams }, '#d4af37');
            if(mansion) this.highlightMansionPosition(ctx, size/2, size/2, size, mansion);
        }
    }

    static highlightMansionPosition(ctx, cx, cy, size, mansion) {
        const mansionTrigramMap = {
            'Horn': { angle: Math.PI }, 'Neck': { angle: Math.PI }, 'Root': { angle: Math.PI }, 
            'Room': { angle: -3 * Math.PI / 4 }, 'Heart': { angle: -3 * Math.PI / 4 }, 'Tail': { angle: -3 * Math.PI / 4 }, 'Winnowing': { angle: -3 * Math.PI / 4 },
            'Dipper': { angle: Math.PI / 2 }, 'Ox': { angle: Math.PI / 2 }, 'Girl': { angle: Math.PI / 2 }, 'Emptiness': { angle: Math.PI / 2 },
            'Roof': { angle: 3 * Math.PI / 4 }, 'House': { angle: 3 * Math.PI / 4 }, 'Wall': { angle: 3 * Math.PI / 4 },
            'Stride': { angle: 0 }, 'Harvest': { angle: 0 }, 'Stomach': { angle: 0 },
            'Hairy': { angle: Math.PI / 4 }, 'Net': { angle: Math.PI / 4 }, 'Turtle': { angle: Math.PI / 4 }, 'Three': { angle: Math.PI / 4 },
            'Well': { angle: -Math.PI / 2 }, 'Ghost': { angle: -Math.PI / 2 }, 'Willow': { angle: -Math.PI / 2 },
            'Star': { angle: -Math.PI / 4 }, 'Stretch': { angle: -Math.PI / 4 }, 'Wings': { angle: -Math.PI / 4 }, 'Chariot': { angle: -Math.PI / 4 }
        };

        const mapping = mansionTrigramMap[mansion.name_en];
        if (mapping) {
            const r = size / 2;
            const x = cx + Math.cos(mapping.angle) * r * 0.7;
            const y = cy + Math.sin(mapping.angle) * r * 0.7;

            ctx.beginPath();
            ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, size * 0.04, 0, Math.PI * 2);
            ctx.fillStyle = '#d4af37';
            ctx.fill();
        }
    }

    // ========================================================================
    // BAZI COMPARISON
    // ========================================================================

    static renderBaziComparison(birthBazi, currentBazi, lang) {
        const panel = document.getElementById('lifePalacePanel');
        if (!panel) return;
        const t = I18N[lang] || I18N['en'];

        let html = '';
        if (birthBazi) {
            html += `<div class="bazi-section">
                <h4>${t.lifePalaceTitle || 'Birth Astrology'}</h4>
                ${this.generateBaziHtml(birthBazi, lang)}
            </div>`;
        }
        if (currentBazi) {
            html += `<div class="bazi-section" style="margin-top:20px;">
                <h4>${t.currentBaziTitle || 'Moment Influence'}</h4>
                ${this.generateBaziHtml(currentBazi, lang)}
            </div>`;
        }
        panel.innerHTML = html;
        panel.style.display = 'block';
    }

    static generateBaziHtml(bazi, lang) {
        const t = I18N[lang] || I18N['en'];
        const pillars = ['hour', 'day', 'month', 'year'];
        
        return `
            <div class="bazi-table-container">
                <table class="bazi-classical-table">
                    <thead><tr><th></th>${pillars.map(p => `<th>${t[p + 'Pillar'] || p}</th>`).join('')}</tr></thead>
                    <tbody>
                        <tr>
                            <td>Stem</td>
                            ${pillars.map(p => {
                                const s = bazi[p].stem;
                                return `<td style="color:var(--${s.element.toLowerCase()})"><div>${s.zh}</div><div style="font-size:0.8em">${s.name}</div></td>`;
                            }).join('')}
                        </tr>
                        <tr>
                            <td>Branch</td>
                            ${pillars.map(p => {
                                const b = bazi[p].branch;
                                return `<td style="color:var(--${b.element.toLowerCase()})"><div>${b.zh}</div><div style="font-size:0.8em">${b.name}</div></td>`;
                            }).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // ========================================================================
    // EQUILIBRIUM / BALANCE RENDERER (Fixed layout)
    // ========================================================================

    static renderEquilibrium(eq, lang) {
        const panel = document.getElementById('equilibriumPanel');
        if (!panel) return;
        const t = I18N[lang] || I18N['en'];
        
        const upper = eq.upperTrigram || { name: {}, symbol: '-' };
        const lower = eq.lowerTrigram || { name: {}, symbol: '-' };
        
        panel.innerHTML = `
            <h3 style="text-align:center;margin-bottom:20px;">${t.yinYangBalance}</h3>
            <div class="equilibrium-grid">
                <!-- Yin-Yang Card -->
                <div class="equilibrium-card">
                    <h4>Balance</h4>
                    <div style="display:flex;justify-content:space-between;margin:10px 0;">
                        <span>Yang: ${eq.yangCount}</span>
                        <span>Yin: ${eq.yinCount}</span>
                    </div>
                    <div class="balance-bar" style="height:6px;background:#333;border-radius:3px;">
                        <div style="width:${(eq.yangCount/6)*100}%;height:100%;background:var(--gold);"></div>
                    </div>
                    <p style="margin-top:10px;font-weight:bold;color:var(--gold);">${t[eq.balanceState] || eq.balanceState}</p>
                </div>
                
                <!-- Stability Card -->
                <div class="equilibrium-card">
                    <h4>${t.stability}</h4>
                    <p style="font-size:1.4em;color:var(--gold);margin:10px 0;">${t[eq.stabilityState] || eq.stabilityState}</p>
                    <p style="font-size:0.9em;color:#aaa;">${eq.movingCount} Moving Lines</p>
                </div>

                <!-- Upper Trigram -->
                <div class="equilibrium-card">
                    <h4>${t.upperTrigram}</h4>
                    <div style="font-size:2.5em;line-height:1;margin:5px 0;color:var(--${upper.element?.toLowerCase() || 'metal'})">${upper.symbol}</div>
                    <p>${upper.name?.[lang] || upper.name?.en}</p>
                </div>

                <!-- Lower Trigram -->
                <div class="equilibrium-card">
                    <h4>${t.lowerTrigram}</h4>
                    <div style="font-size:2.5em;line-height:1;margin:5px 0;color:var(--${lower.element?.toLowerCase() || 'metal'})">${lower.symbol}</div>
                    <p>${lower.name?.[lang] || lower.name?.en}</p>
                </div>
            </div>
        `;
        
        // Add Elements Grid below
        this.renderElementsGrid(eq.elements, lang);
    }
    
    static renderElementsGrid(elements, lang) {
        const container = document.getElementById('equilibriumPanel');
        if(!container) return;
        
        const elNames = {
            wood: { color: '#66BB6A', char: '木' },
            fire: { color: '#FF5252', char: '火' },
            earth: { color: '#FFB300', char: '土' },
            metal: { color: '#CFD8DC', char: '金' },
            water: { color: '#42A5F5', char: '水' }
        };

        let html = `<div style="margin-top:20px;">
            <h4 style="text-align:center;margin-bottom:10px;">Five Elements Distribution</h4>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">`;
            
        for(let [el, val] of Object.entries(elements)) {
             const info = elNames[el.toLowerCase()] || { color: '#888', char: '?' };
             html += `
                <div style="text-align:center;">
                    <div style="font-size:0.9em;margin-bottom:5px;">${val}%</div>
                    <div style="height:60px;background:#333;border-radius:4px;position:relative;overflow:hidden;">
                        <div style="position:absolute;bottom:0;width:100%;height:${val}%;background:${info.color};transition:height 0.5s;"></div>
                    </div>
                    <div style="font-size:0.8em;margin-top:5px;color:#aaa;">${el}</div>
                </div>`;
        }
        html += `</div></div>`;
        container.insertAdjacentHTML('beforeend', html);
    }
    
    // ========================================================================
    // OTHER RENDERERS
    // ========================================================================

    static renderRemedies(remedies, lang) {
        const container = document.getElementById('remediesContent');
        if (!container || !remedies) return;
        const langData = remedies[lang] || remedies.en;
        if (!langData?.remedies) return;

        let html = `<div class="remedy-layout-grid">`;
        langData.remedies.forEach((r, i) => {
            const canvasId = `remedy_canvas_${i}`;
            html += `
                <div class="remedy-card section-wrapper">
                    <div class="remedy-visual-side">
                        <div class="fulu-canvas-container">
                            <canvas id="${canvasId}" width="400" height="900"></canvas>
                        </div>
                    </div>
                    <div class="section-content">
                        <h3>${r.name}</h3>
                        <div class="remedy-description-text">${this.formatParagraphs(r.description)}</div>
                        <h4>Instructions</h4>
                        <div class="remedy-description-text">${this.formatParagraphs(r.instructions)}</div>
                    </div>
                </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
        
        // Draw Fulu
        setTimeout(() => {
            langData.remedies.forEach((r, i) => {
                const fuluList = remedies.fuluContentList || [];
                const fData = fuluList.find(f => f.id === r.id) || fuluList[i];
                if (fData && typeof SigilTools !== 'undefined') {
                    SigilTools.draw(`remedy_canvas_${i}`, {
                        fuluContent: fData,
                        backgroundColor: r.type === 'fengshui' ? '#f4f4f9' : '#F5E6CA',
                        strokeColor: '#8B0000'
                    });
                }
            });
        }, 100);
    }

    static renderAIInterpretation(result, lang) {
        const container = document.getElementById('aiInterpretationContent');
        if (!container || !result) return;
        const r = result[lang] || result.en;
        container.innerHTML = this.formatParagraphs(r.analysis || r.coreColloquial || '');
    }
    
    static renderBaguaMedicine(data, lang) {
        const container = document.getElementById('baguaMedicineContent');
        if (!container || !data) return;
        const t = data[lang] || data.en;
        let html = `<div class="interp-text">`;
        if (t.medicine) html += `<h4>Medicine</h4><p>${t.medicine}</p>`;
        if (t.fengShui) html += `<h4>Feng Shui</h4><p>${JSON.stringify(t.fengShui)}</p>`;
        html += `</div>`;
        container.innerHTML = html;
    }

    static renderChineseText(hexData, lang) {
         const el = document.getElementById('originalText');
         if(el && hexData) {
             el.innerHTML = `<h5 style="color:var(--gold);margin-bottom:10px;">Original Text</h5>
             <div class="interp-text" style="font-family:'Noto Serif SC',serif;font-size:1.2em;">${hexData.judgment_zh}</div>
             <div class="interp-text" style="font-family:'Noto Serif SC',serif;font-size:1.1em;margin-top:10px;color:#aaa;">${hexData.image?.image_zh}</div>`;
         }
    }
    
    static renderTranslation(hexData, lang, apiData) {
         const el = document.getElementById('translationText');
         if(el && hexData) {
             el.innerHTML = `<h5 style="color:var(--gold);margin-bottom:10px;">Translation</h5>
             <div class="interp-text">${hexData['judgment_'+lang] || hexData.judgment_en}</div>
             <div class="interp-text" style="margin-top:10px;">${hexData.image?.['image_'+lang] || hexData.image?.image_en}</div>`;
         }
    }
    
    static renderAILoading(lang) {
        const el = document.getElementById('aiInterpretationContent');
        if(el) el.innerHTML = '<div class="loading">Loading interpretation...</div>';
    }
    
    static hideAILoading() {
        const el = document.querySelector('.loading');
        if(el) el.remove();
    }
    
    static renderBaguaStrip(lang) {
        this.injectLayoutStyles();
        const strip = document.getElementById('baguaHexStrip');
        if (!strip || typeof TRIGRAMS === 'undefined') return;
        strip.innerHTML = Object.entries(TRIGRAMS).map(([key, tg]) => `
            <div class="trigram-card-node" onclick="UI.handleTrigramClick('${tg.name.en.toLowerCase()}', event)">
                <div class="trigram-position">${tg.direction}</div>
                <div class="trigram-chinese-text">${tg.symbol}</div>
                <div class="bagua-strip-name">${tg.name[lang]}</div>
            </div>
        `).join('');
    }
    
    static handleTrigramClick(name, e) {
        // Animation logic
    }
    
    // Effects stubs
    static initFengShui() {}
    static startWindDust() {}
    static stopWindDust() {}
    static renderRemediesLoading() {}
    static renderBaguaMedicineLoading() {}
    static renderRemediesError() {}
    static renderBaguaMedicineError() {}
    static showSuccess(msg) { console.log(msg); }
    static showError(msg) { console.error(msg); }
}
EOF

echo "Fixes applied: Layout Grid, Balance Panel, Astrology Layout, and Text Rendering"
