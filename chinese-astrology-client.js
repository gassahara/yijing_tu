/**
 * Chinese Astrology Client Module v4.2
 * Enhanced with Feng Shui auspicious colors and improved readability
 */

const CHINESE_ASTROLOGY_API = {
    baseUrl: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/bazi-astrol",
    
    async calculate(params) {
        try {
            const response = await fetch(`${this.baseUrl}/chinese-astrology`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(params)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (error) {
            console.warn('API failed, using local:', error);
            return this.calculateLocal(params);
        }
    },
    
    calculateLocal(params) {
        const date = new Date(params.date);
        const year = date.getFullYear();
        const stems = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
        const branches = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
        
        return {
            data: {
                timestamp: new Date().toISOString(),
                bazi: {
                    year: { stem: { name: stems[(year-4)%10], zh: '甲', element: 'Wood', polarity: 'Yang' }, branch: { name: branches[(year-4)%12], zh: '寅', element: 'Wood', zodiac: 'Tiger' }, hiddenStems: ['甲'] },
                    month: { stem: { name: stems[(year-2)%10], zh: '丙', element: 'Fire', polarity: 'Yang' }, branch: { name: branches[(year+2)%12], zh: '辰', element: 'Earth', zodiac: 'Dragon' }, hiddenStems: ['戊'] },
                    day: { stem: { name: 'Xin', zh: '辛', element: 'Metal', polarity: 'Yin' }, branch: { name: 'Wei', zh: '未', element: 'Earth', zodiac: 'Goat' }, hiddenStems: ['己'] },
                    hour: { stem: { name: 'Yi', zh: '乙', element: 'Wood', polarity: 'Yin' }, branch: { name: 'Wei', zh: '未', element: 'Earth', zodiac: 'Goat' }, hiddenStems: ['己'] },
                    dayMaster: { name: 'Xin', zh: '辛', element: 'Metal', polarity: 'Yin' },
                    strength: { result: 'Balanced', score: 10, yongShen: 'Earth' },
                    shenSha: { noblePerson: { name: 'Tian Yi', zh: '天乙', presentIn: ['day'] } }
                },
                bagua: {
                    xiantian: { personalTrigram: { name: 'Qian', zh: '乾', binary: '111', element: 'Metal', quality: 'Creative' }, elementFlow: 'Qi descends' },
                    houtian: { lifePalaceTrigram: { name: 'Li', zh: '離', binary: '101', element: 'Fire', direction_houtian: 'S' }, temporalInfluence: 'Summer' },
                    hexiangua: { hexagramNumber: 1, hexagramName: 'Qian - Creative', lines: [1,1,1,1,1,1], upper: { name: 'Qian' }, lower: { name: 'Qian' } }
                },
                hetu: { personalNumbers: { yearNumber: 3, monthNumber: 7, dayNumber: 9, hourNumber: 8, lifeNumber: 5, destinyNumber: 8 }, elementalFlow: { sequence: ['Wood', 'Fire', 'Earth', 'Metal', 'Water'], dominant: 'Earth', deficient: 'Water', recommendations: ['Cultivate'] }, constellations: [] },
                luoshu: { mingGua: { number: 6, trigram: 'Qian', element: 'Metal' }, favorableDirections: { shengQi: 'W', tianYi: 'SW', yanNian: 'NW' } },
                lunarMansion: { mansion: { num: 27, name: 'Yi', zh: '翼', element: 'Fire', direction: 'S', group: 'Vermilion Bird', animal: 'Snake' }, degree: 15, exactLongitude: 180, dayRuler: 'Si', hourRuler: 'Wu' },
                taiSui: { currentPosition: { branch: 'Yin', zh: '寅', direction: 'NE', degree: 45, zodiac: 'Tiger' }, sanSha: { description: 'Avoid NE' }, suiPo: { branch: 'Shen' } }
            }
        };
    }
};

/**
 * Enhanced Chinese Astrology Display with Feng Shui colors
 */
const ChineseAstrologyDisplay = {
    
    // Current language (set by render)
    lang: 'en',
    
    // I18N helper - checks AstrologyI18N first (detailed astrology labels), then I18N from data.js
    t(key) {
        // Priority 1: AstrologyI18N (dedicated astrology translations for all languages)
        if (typeof AstrologyI18N !== 'undefined' && AstrologyI18N.translations?.[this.lang]?.[key]) {
            return AstrologyI18N.translations[this.lang][key];
        }
        // Priority 2: I18N from data.js (general UI translations)
        if (typeof I18N !== 'undefined' && I18N[this.lang]?.[key]) {
            return I18N[this.lang][key];
        }
        // Fallback: AstrologyI18N English, then I18N English, then key
        if (typeof AstrologyI18N !== 'undefined' && AstrologyI18N.translations?.en?.[key]) {
            return AstrologyI18N.translations.en[key];
        }
        if (typeof I18N !== 'undefined' && I18N['en']?.[key]) {
            return I18N['en'][key];
        }
        return key;
    },
    
    /**
     * Main render function - routes to appropriate sections
     */
    render(data, container, hexagramTrigrams = null, lang = 'en') {
        this.lang = lang || 'en';
        container.innerHTML = '';
        if (!data?.data) {
            container.innerHTML = `<div class="error">${this.t('noAstrologyData')}</div>`;
            return;
        }
        const d = data.data;
        
        // Build sections
        const sections = [];
        
        if (d.ayanamsa) sections.push(this.renderAyanamsa(d.ayanamsa));
        if (d.bazi) sections.push(this.renderBaZiCurrent(d.bazi));
        
        // Comparison section with birth chart
        if (d.comparison?.birthBazi) {
            sections.push(this.renderBaZiBirth(d.comparison.birthBazi, d.bazi));
        }
        
        // Bagua - now with hexagram context
        if (d.bagua) {
            sections.push(this.renderBaguaEnhanced(d.bagua, hexagramTrigrams));
        }
        
        if (d.hetu) sections.push(this.renderHeTu(d.hetu));
        if (d.luoshu) sections.push(this.renderLuoShu(d.luoshu));
        if (d.lunarMansion) sections.push(this.renderLunarMansion(d.lunarMansion));
        if (d.taiSui) sections.push(this.renderTaiSui(d.taiSui));
        
        sections.forEach(s => container.appendChild(s));
        
        // Scroll to bagua section if hexagram trigrams are provided
        if (hexagramTrigrams) {
            setTimeout(() => {
                const baguaSection = container.querySelector('.bagua-enhanced');
                if (baguaSection) {
                    baguaSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
    },

    /**
     * Render Ayanamsa (Longitude Correction)
     */
    renderAyanamsa(a) {
        const div = document.createElement('div');
        div.className = 'section ayanamsa';
        div.innerHTML = `
            <h3>📍 ${this.t('ayanamsa')} <span class="zh">經度修正</span></h3>
            <div class="ayanamsa-grid">
                <div class="info-card">
                    <span class="label">${this.t('referenceMeridian')}</span>
                    <span class="value">${a.referenceMeridian}°E</span>
                </div>
                <div class="info-card">
                    <span class="label">${this.t('timeCorrection')}</span>
                    <span class="value">${a.timeDifference}</span>
                </div>
                <div class="info-card highlight">
                    <span class="label">${this.t('trueSolarTime')}</span>
                    <span class="value">${new Date(a.trueSolarTime).toLocaleTimeString()}</span>
                </div>
            </div>`;
        return div;
    },

    /**
     * Render Current Sky BaZi
     */
    renderBaZiCurrent(bazi) {
        const div = document.createElement('div');
        div.className = 'section bazi current';
        div.innerHTML = `
            <div class="section-header">
                <h3>⚡ ${this.t('currentSky')} <span class="zh">天時八字</span></h3>
                <div class="time-badge">${new Date().toLocaleString()}</div>
            </div>
            <div class="bazi-grid">
                ${this.renderPillarsTable(bazi)}
                ${this.renderDayMasterPanel(bazi, true)}
            </div>`;
        return div;
    },

    /**
     * Render Birth Chart BaZi
     */
    renderBaZiBirth(bazi, current) {
        const div = document.createElement('div');
        div.className = 'section bazi birth';
        div.innerHTML = `
            <div class="section-header">
                <h3>🏛️ ${this.t('birthChart')} <span class="zh">命盤八字</span></h3>
                <div class="birth-badge">${this.t('natalChart')}</div>
            </div>
            <div class="bazi-grid">
                ${this.renderPillarsTable(bazi, current)}
                ${this.renderDayMasterPanel(bazi, true)}
            </div>`;
        return div;
    },

    /**
     * Render the Four Pillars table
     */
    renderPillarsTable(bazi, current = null) {
        const tenGods = {
            'Friend': '比肩', 'Rob Wealth': '劫財', 'Eating God': '食神', 
            'Hurting Officer': '傷官', 'Direct Wealth': '正財', 'Indirect Wealth': '偏財',
            'Direct Officer': '正官', 'Seven Killings': '七殺', 'Direct Resource': '正印', 
            'Indirect Resource': '偏印'
        };
        const pillars = ['hour', 'day', 'month', 'year'];
        const labels = { 
            hour: `<span class="pillar-zh">時柱</span><span class="pillar-en">${this.t('hour')}</span>`, 
            day: `<span class="pillar-zh">日柱</span><span class="pillar-en">${this.t('day')}</span>`, 
            month: `<span class="pillar-zh">月柱</span><span class="pillar-en">${this.t('month')}</span>`, 
            year: `<span class="pillar-zh">年柱</span><span class="pillar-en">${this.t('year')}</span>` 
        };
        
        let html = `<div class="pillars-table"><table><thead><tr><th>${this.t('pillar')}</th><th>${this.t('heavenlyStem')}<br><span class="sub">天干</span></th><th>${this.t('earthlyBranch')}<br><span class="sub">地支</span></th><th>${this.t('hiddenStems')}<br><span class="sub">藏干</span></th></tr></thead><tbody>`;
        
        pillars.forEach(p => {
            const data = bazi[p];
            if (!data) return;
            const tg = data.tenGod?.zh || '';
            const tgZh = tenGods[tg] || '';
            
            // Highlight matching pillars when comparing
            let highlight = '';
            if (current && current[p]) {
                if (current[p].stem.name === data.stem.name && current[p].branch.name === data.branch.name) {
                    highlight = 'class="highlight match"';
                }
            }
            
            html += `<tr ${highlight}>
                <td class="pillar-label">${labels[p]}</td>
                <td class="stem" data-element="${data.stem.element}">
                    <span class="hz">${data.stem.zh}</span>
                    <span class="py">${data.stem.name}</span>
                    <span class="polarity ${data.stem.polarity.toLowerCase()}">${data.stem.polarity}</span>
                    ${tgZh ? `<span class="tg">${tgZh}</span>` : ''}
                </td>
                <td class="branch" data-element="${data.branch.element}">
                    <span class="hz">${data.branch.zh}</span>
                    <span class="py">${data.branch.name}</span>
                    <span class="zodiac">${data.branch.zodiac}</span>
                </td>
                <td class="hidden">${(data.hiddenStems || []).map(h => `<span class="hs">${h}</span>`).join('')}</td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        return html;
    },

    /**
     * Render Day Master panel with Shen Sha stars
     */
    renderDayMasterPanel(bazi, showStars = false) {
        const dm = bazi.dayMaster || {};
        const st = bazi.strength || {};
        
        let starsHtml = '';
        if (showStars && bazi.shenSha) {
            starsHtml = `<div class="stars-panel"><h4>${this.t('symbolicStars')} <span class="zh">神煞</span></h4><div class="stars-grid">`;
            const starOrder = ['noblePerson', 'peachBlossom', 'academicStar', 'travellingHorse', 'goatBlade'];
            const starNames = {
                noblePerson: { zh: '天乙', name: this.t('noblePerson') },
                peachBlossom: { zh: '桃花', name: this.t('peachBlossom') },
                academicStar: { zh: '文昌', name: this.t('academicStar') },
                travellingHorse: { zh: '驛馬', name: this.t('travellingHorse') },
                goatBlade: { zh: '羊刃', name: this.t('goatBlade') }
            };
            
            starOrder.forEach(key => {
                const v = bazi.shenSha[key];
                if (!v) return;
                const present = v.presentIn?.length > 0;
                const starInfo = starNames[key];
                starsHtml += `<div class="star-item ${present ? 'present' : ''}">
                    <div class="star-main">
                        <span class="star-zh">${v.zh || starInfo.zh}</span>
                        <span class="star-name">${v.name || starInfo.name}</span>
                    </div>
                    ${present ? `<span class="star-loc">${v.presentIn.join(', ')}</span>` : '<span class="star-absent">—</span>'}
                </div>`;
            });
            starsHtml += '</div></div>';
        }
        
        return `<div class="daymaster-panel">
            <div class="dm-card" data-element="${dm.element}">
                <div class="dm-header">
                    <h4>${this.t('dayMaster')} <span class="zh">日主</span></h4>
                    <span class="element-tag ${dm.element?.toLowerCase()}">${dm.element}</span>
                </div>
                <div class="dm-display">
                    <span class="dm-hz">${dm.zh || '?'}</span>
                    <div class="dm-info">
                        <div class="dm-name">${dm.name || 'Unknown'}</div>
                        <div class="dm-polarity ${dm.polarity?.toLowerCase()}">${dm.polarity || ''}</div>
                    </div>
                </div>
                <div class="strength-bar">
                    <div class="st-header">
                        <span class="st-label">${this.t('strength')} <span class="zh">強弱</span></span>
                        <span class="st-result ${st.result?.toLowerCase().replace(/\s+/g, '-')}">${st.result || 'Unknown'}</span>
                    </div>
                    <div class="st-meter"><div class="st-fill" style="width:${Math.min(100, Math.max(0, 50+(st.score||0)))}%"></div></div>
                    <div class="yong-shen">
                        <span class="ys-label">${this.t('yongShen')} <span class="zh">用神</span>:</span>
                        <span class="ys-element ${st.yongShen?.toLowerCase()}">${st.yongShen || 'N/A'}</span>
                    </div>
                </div>
            </div>
            ${starsHtml}
        </div>`;
    },

    /**
     * Enhanced Bagua render - Organized by Hexagram Trigrams
     * Shows selected hexagram's trigrams in both Xian Tian and Hou Tian arrangements
     */
    renderBaguaEnhanced(bagua, hexagramTrigrams = null) {
        const div = document.createElement('div');
        div.className = 'section bagua-enhanced';
        
        const xt = bagua.xiantian || {};
        const ht = bagua.houtian || {};
        const hx = bagua.hexiangua || {};
        
        // Selected hexagram trigrams
        const upperName = hexagramTrigrams?.upper || hx.upper?.name;
        const lowerName = hexagramTrigrams?.lower || hx.lower?.name;
        
        // Get trigram data for both arrangements
        const xtTrigrams = this.getXianTianTrigrams();
        const htTrigrams = this.getHouTianTrigrams();
        
        // Find selected trigrams in each arrangement
        const upperXT = xtTrigrams.find(t => t.n === upperName);
        const lowerXT = xtTrigrams.find(t => t.n === lowerName);
        const upperHT = htTrigrams.find(t => t.n === upperName);
        const lowerHT = htTrigrams.find(t => t.n === lowerName);
        
        div.innerHTML = `
            <div class="bagua-main-header">
                <h3>☯ ${this.t('bagua')} <span class="zh">八卦</span></h3>
                <p class="bagua-subtitle">${this.t('baguaSubtitle')}</p>
            </div>
            
            <!-- Selected Hexagram Trigrams Display -->
            <div class="selected-hexagram-trigrams">
                <div class="trigrams-title">
                    <span class="title-icon">◈</span>
                    <span>${this.t('selectedHexagramTrigrams')}</span>
                    <span class="title-zh">本卦兩儀</span>
                </div>
                <div class="trigrams-pair-display">
                    <div class="trig-display upper-trigram">
                        <div class="trig-label">
                            <span class="label-en">${this.t('upperTrigram')}</span>
                            <span class="label-zh">上卦 (外卦)</span>
                        </div>
                        <div class="trig-content">
                            <span class="trig-symbol">${this.getSymbol(upperXT?.binary)}</span>
                            <div class="trig-names">
                                <span class="name-zh">${upperXT?.z || '?'}</span>
                                <span class="name-en">${upperName || '?'}</span>
                            </div>
                            <span class="trig-element ${upperXT?.e?.toLowerCase()}">${upperXT?.e || ''}</span>
                        </div>
                    </div>
                    
                    <div class="trigrams-divider">
                        <span class="divider-line"></span>
                        <span class="divider-text">${this.t('over')}</span>
                        <span class="divider-line"></span>
                    </div>
                    
                    <div class="trig-display lower-trigram">
                        <div class="trig-label">
                            <span class="label-en">${this.t('lowerTrigram')}</span>
                            <span class="label-zh">下卦 (内卦)</span>
                        </div>
                        <div class="trig-content">
                            <span class="trig-symbol">${this.getSymbol(lowerXT?.binary)}</span>
                            <div class="trig-names">
                                <span class="name-zh">${lowerXT?.z || '?'}</span>
                                <span class="name-en">${lowerName || '?'}</span>
                            </div>
                            <span class="trig-element ${lowerXT?.e?.toLowerCase()}">${lowerXT?.e || ''}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Two Arrangements Side by Side -->
            <div class="arrangements-container">
                
                <!-- Xian Tian (Pre-Heaven) -->
                <div class="arrangement-panel xiantian">
                    <div class="arrangement-header">
                        <div class="header-icon">☯</div>
                        <div class="header-titles">
                            <h4>${this.t('xiantian')} <span class="zh">先天八卦</span></h4>
                            <span class="arrangement-desc">${this.t('xiantianDesc')}</span>
                        </div>
                    </div>
                    
                    <div class="arrangement-content">
                        ${this.createXianTianSVG(upperName, lowerName)}
                        
                        <div class="selected-trigrams-info">
                            <div class="trig-info-card upper" data-element="${upperXT?.e}">
                                <div class="card-header">
                                    <span class="position-label">${this.t('upperPosition')}</span>
                                    <span class="direction-badge">${upperXT ? this.getXianTianDirection(upperXT.n) : ''}</span>
                                </div>
                                <div class="card-body">
                                    <span class="symbol-large">${this.getSymbol(upperXT?.binary)}</span>
                                    <div class="names">
                                        <span class="zh">${upperXT?.z}</span>
                                        <span class="en">${upperXT?.n}</span>
                                    </div>
                                    <div class="nature">${upperXT ? this.getNature(upperXT.nature) : ''}</div>
                                </div>
                            </div>
                            
                            <div class="trig-info-card lower" data-element="${lowerXT?.e}">
                                <div class="card-header">
                                    <span class="position-label">${this.t('lowerPosition')}</span>
                                    <span class="direction-badge">${lowerXT ? this.getXianTianDirection(lowerXT.n) : ''}</span>
                                </div>
                                <div class="card-body">
                                    <span class="symbol-large">${this.getSymbol(lowerXT?.binary)}</span>
                                    <div class="names">
                                        <span class="zh">${lowerXT?.z}</span>
                                        <span class="en">${lowerXT?.n}</span>
                                    </div>
                                    <div class="nature">${lowerXT ? this.getNature(lowerXT.nature) : ''}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="arrangement-meaning">
                        <strong>${this.t('xiantianMeaningTitle')}</strong> ${this.t('xiantianMeaning')}
                    </div>
                </div>
                
                <!-- Hou Tian (Post-Heaven) -->
                <div class="arrangement-panel houtian">
                    <div class="arrangement-header">
                        <div class="header-icon">☯</div>
                        <div class="header-titles">
                            <h4>${this.t('houtian')} <span class="zh">后天八卦</span></h4>
                            <span class="arrangement-desc">${this.t('houtianDesc')}</span>
                        </div>
                    </div>
                    
                    <div class="arrangement-content">
                        ${this.createHouTianSVG(upperName, lowerName)}
                        
                        <div class="selected-trigrams-info">
                            <div class="trig-info-card upper" data-element="${upperHT?.e}">
                                <div class="card-header">
                                    <span class="position-label">${this.t('upperPosition')}</span>
                                    <span class="direction-badge">${upperHT ? this.getHouTianDirection(upperHT.n) : ''}</span>
                                </div>
                                <div class="card-body">
                                    <span class="symbol-large">${this.getSymbol(upperHT?.binary)}</span>
                                    <div class="names">
                                        <span class="zh">${upperHT?.z}</span>
                                        <span class="en">${upperHT?.n}</span>
                                    </div>
                                    <div class="season">${upperHT ? this.getSeason(upperHT.season) : ''}</div>
                                </div>
                            </div>
                            
                            <div class="trig-info-card lower" data-element="${lowerHT?.e}">
                                <div class="card-header">
                                    <span class="position-label">${this.t('lowerPosition')}</span>
                                    <span class="direction-badge">${lowerHT ? this.getHouTianDirection(lowerHT.n) : ''}</span>
                                </div>
                                <div class="card-body">
                                    <span class="symbol-large">${this.getSymbol(lowerHT?.binary)}</span>
                                    <div class="names">
                                        <span class="zh">${lowerHT?.z}</span>
                                        <span class="en">${lowerHT?.n}</span>
                                    </div>
                                    <div class="season">${lowerHT ? this.getSeason(lowerHT.season) : ''}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="arrangement-meaning">
                        <strong>${this.t('houtianMeaningTitle')}</strong> ${this.t('houtianMeaning')}
                    </div>
                </div>
                
            </div>
            
            <!-- Combined Hexagram Display -->
            <div class="combined-hexagram-panel">
                <div class="hexagram-title">
                    <span class="hx-number">${hx.hexagramNumber || '?'}</span>
                    <span class="hx-name-zh">${hx.hexagramName?.split(' ')[0] || ''}</span>
                    <span class="hx-name-en">${hx.hexagramName?.split(' ').slice(1).join(' ') || this.t('hexagram') || 'Hexagram'}</span>
                </div>
                <div class="hexagram-lines-display">
                    ${(hx.lines || [1,1,1,1,1,1]).slice().reverse().map((l, i) => 
                        `<div class="hx-line ${l?'yang':'yin'} ${i<3?'lower':'upper'}">
                            <span class="line-visual">${l?'━━━━━━━':'━━   ━━'}</span>
                            <span class="line-position">${this.getOrdinal(i)}</span>
                        </div>`
                    ).join('')}
                </div>
                ${hx.guaCi ? `<div class="gua-ci-quote">${hx.guaCi}</div>` : ''}
            </div>`;
        
        return div;
    },
    
    getXianTianTrigrams() {
        return [
            {n:'Qian', z:'乾', s:'☰', e:'Metal', nature:'Heaven', binary:'111'},
            {n:'Dui', z:'兌', s:'☱', e:'Metal', nature:'Lake', binary:'011'},
            {n:'Li', z:'離', s:'☲', e:'Fire', nature:'Fire', binary:'101'},
            {n:'Zhen', z:'震', s:'☳', e:'Wood', nature:'Thunder', binary:'001'},
            {n:'Xun', z:'巽', s:'☴', e:'Wood', nature:'Wind', binary:'110'},
            {n:'Kan', z:'坎', s:'☵', e:'Water', nature:'Water', binary:'010'},
            {n:'Gen', z:'艮', s:'☶', e:'Earth', nature:'Mountain', binary:'100'},
            {n:'Kun', z:'坤', s:'☷', e:'Earth', nature:'Earth', binary:'000'}
        ];
    },
    
    getHouTianTrigrams() {
        return [
            {n:'Li', z:'離', s:'☲', e:'Fire', nature:'Fire', binary:'101', season:'Summer'},
            {n:'Kun', z:'坤', s:'☷', e:'Earth', nature:'Earth', binary:'000', season:'Late Summer'},
            {n:'Dui', z:'兌', s:'☱', e:'Metal', nature:'Lake', binary:'011', season:'Autumn'},
            {n:'Qian', z:'乾', s:'☰', e:'Metal', nature:'Heaven', binary:'111', season:'Autumn'},
            {n:'Kan', z:'坎', s:'☵', e:'Water', nature:'Water', binary:'010', season:'Winter'},
            {n:'Gen', z:'艮', s:'☶', e:'Earth', nature:'Mountain', binary:'100', season:'Winter'},
            {n:'Zhen', z:'震', s:'☳', e:'Wood', nature:'Thunder', binary:'001', season:'Spring'},
            {n:'Xun', z:'巽', s:'☴', e:'Wood', nature:'Wind', binary:'110', season:'Spring'}
        ];
    },
    
    getXianTianDirection(trigramName) {
        const dirs = { Qian: 'S', Dui: 'SE', Li: 'E', Zhen: 'NE', Xun: 'N', Kan: 'NW', Gen: 'W', Kun: 'SW' };
        return dirs[trigramName] || '';
    },
    
    getHouTianDirection(trigramName) {
        const dirs = { Li: 'S', Kun: 'SW', Dui: 'W', Qian: 'NW', Kan: 'N', Gen: 'NE', Zhen: 'E', Xun: 'SE' };
        return dirs[trigramName] || '';
    },

    /**
     * Create Xian Tian SVG with optional highlighting
     */
    createXianTianSVG(highlightUpper = null, highlightLower = null) {
        // Xian Tian (Fu Xi) arrangement - pre-heaven
        const positions = {
            Qian: { x: 150, y: 40, deg: 0, dir: 'S' },      // ☰ Heaven - South
            Dui: { x: 240, y: 80, deg: 45, dir: 'SE' },     // ☱ Lake - Southeast
            Li: { x: 270, y: 150, deg: 90, dir: 'E' },      // ☲ Fire - East
            Zhen: { x: 240, y: 220, deg: 135, dir: 'NE' },  // ☳ Thunder - Northeast
            Xun: { x: 150, y: 260, deg: 180, dir: 'N' },    // ☴ Wind - North
            Kan: { x: 60, y: 220, deg: 225, dir: 'NW' },    // ☵ Water - Northwest
            Gen: { x: 30, y: 150, deg: 270, dir: 'W' },     // ☶ Mountain - West
            Kun: { x: 60, y: 80, deg: 315, dir: 'SW' }      // ☷ Earth - Southwest
        };
        
        const trigrams = [
            {n:'Qian', z:'乾', s:'☰', e:'Metal', nature:'Heaven', binary:'111'},
            {n:'Dui', z:'兌', s:'☱', e:'Metal', nature:'Lake', binary:'011'},
            {n:'Li', z:'離', s:'☲', e:'Fire', nature:'Fire', binary:'101'},
            {n:'Zhen', z:'震', s:'☳', e:'Wood', nature:'Thunder', binary:'001'},
            {n:'Xun', z:'巽', s:'☴', e:'Wood', nature:'Wind', binary:'110'},
            {n:'Kan', z:'坎', s:'☵', e:'Water', nature:'Water', binary:'010'},
            {n:'Gen', z:'艮', s:'☶', e:'Earth', nature:'Mountain', binary:'100'},
            {n:'Kun', z:'坤', s:'☷', e:'Earth', nature:'Earth', binary:'000'}
        ];
        
        // Auspicious Feng Shui colors
        const fengShuiColors = {
            Metal: { main: '#FFD700', light: '#FFF8DC', dark: '#B8860B', text: '#8B4513' },
            Wood: { main: '#228B22', light: '#90EE90', dark: '#006400', text: '#FFFFFF' },
            Water: { main: '#1E90FF', light: '#87CEEB', dark: '#00008B', text: '#FFFFFF' },
            Fire: { main: '#DC143C', light: '#FF6B6B', dark: '#8B0000', text: '#FFFFFF' },
            Earth: { main: '#D2691E', light: '#DEB887', dark: '#8B4513', text: '#FFFFFF' }
        };
        
        let svg = '<svg viewBox="0 0 300 300" class="bagua-svg xiantian">';
        
        // Background octagon with gradient
        svg += '<defs>';
        svg += '<radialGradient id="xtCenter" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#FFF8DC"/><stop offset="100%" style="stop-color:#F5DEB3"/></radialGradient>';
        svg += '</defs>';
        
        // Outer octagon frame
        svg += '<polygon points="150,25 255,65 285,150 255,235 150,275 45,235 15,150 45,65" fill="#1a1a2e" stroke="#d4af37" stroke-width="3"/>';
        svg += '<polygon points="150,35 245,70 272,150 245,230 150,265 55,230 28,150 55,70" fill="url(#xtCenter)" stroke="#8B4513" stroke-width="2"/>';
        
        // Center Yin-Yang with glow
        svg += '<circle cx="150" cy="150" r="40" fill="#1a1a2e" stroke="#d4af37" stroke-width="2"/>';
        svg += '<circle cx="150" cy="150" r="35" fill="#fff"/>';
        svg += '<text x="150" y="162" text-anchor="middle" font-size="36" fill="#1a1a2e">☯</text>';
        
        // Trigrams
        trigrams.forEach(t => {
            const pos = positions[t.n];
            const colors = fengShuiColors[t.e];
            const isHighlighted = (t.n === highlightUpper || t.n === highlightLower);
            
            // Glow effect for highlighted trigrams
            if (isHighlighted) {
                svg += `<circle cx="${pos.x}" cy="${pos.y}" r="32" fill="none" stroke="#d4af37" stroke-width="4" class="pulse-glow"/>`;
            }
            
            // Main circle with element color
            svg += `<circle cx="${pos.x}" cy="${pos.y}" r="28" fill="${colors.main}" stroke="${colors.dark}" stroke-width="${isHighlighted ? 4 : 2}" class="${isHighlighted ? 'highlighted-trigram' : ''}"/>`;
            
            // Trigram symbol
            svg += `<text x="${pos.x}" y="${pos.y-2}" text-anchor="middle" font-size="20" fill="${colors.text}" font-weight="bold">${t.s}</text>`;
            
            // Chinese name
            svg += `<text x="${pos.x}" y="${pos.y+14}" text-anchor="middle" font-size="11" fill="${colors.text}">${t.z}</text>`;
            
            // Direction label
            svg += `<text x="${pos.x}" y="${pos.y+24}" text-anchor="middle" font-size="8" fill="#666">${pos.dir}</text>`;
        });
        
        // Connecting lines showing sequence
        svg += '<path d="M 150,40 Q 200,75 240,80" fill="none" stroke="#d4af37" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>';
        
        return svg + '</svg>';
    },

    /**
     * Create Hou Tian SVG with optional highlighting
     */
    createHouTianSVG(highlightUpper = null, highlightLower = null) {
        // Hou Tian (King Wen) arrangement - post-heaven
        const positions = {
            Li: { x: 150, y: 40, dir: 'S', season: 'Summer' },      // ☲ Fire - South
            Kun: { x: 240, y: 80, dir: 'SW', season: 'Late Summer' }, // ☷ Earth - Southwest
            Dui: { x: 270, y: 150, dir: 'W', season: 'Autumn' },    // ☱ Lake - West
            Qian: { x: 240, y: 220, dir: 'NW', season: 'Autumn' },  // ☰ Heaven - Northwest
            Kan: { x: 150, y: 260, dir: 'N', season: 'Winter' },    // ☵ Water - North
            Gen: { x: 60, y: 220, dir: 'NE', season: 'Winter' },    // ☶ Mountain - Northeast
            Zhen: { x: 30, y: 150, dir: 'E', season: 'Spring' },    // ☳ Thunder - East
            Xun: { x: 60, y: 80, dir: 'SE', season: 'Spring' }      // ☴ Wind - Southeast
        };
        
        const trigrams = [
            {n:'Li', z:'離', s:'☲', e:'Fire', nature:'Fire', binary:'101'},
            {n:'Kun', z:'坤', s:'☷', e:'Earth', nature:'Earth', binary:'000'},
            {n:'Dui', z:'兌', s:'☱', e:'Metal', nature:'Lake', binary:'011'},
            {n:'Qian', z:'乾', s:'☰', e:'Metal', nature:'Heaven', binary:'111'},
            {n:'Kan', z:'坎', s:'☵', e:'Water', nature:'Water', binary:'010'},
            {n:'Gen', z:'艮', s:'☶', e:'Earth', nature:'Mountain', binary:'100'},
            {n:'Zhen', z:'震', s:'☳', e:'Wood', nature:'Thunder', binary:'001'},
            {n:'Xun', z:'巽', s:'☴', e:'Wood', nature:'Wind', binary:'110'}
        ];
        
        // Auspicious Feng Shui colors - enhanced
        const fengShuiColors = {
            Metal: { main: '#FFD700', light: '#FFF8DC', dark: '#B8860B', text: '#4a4a00' },
            Wood: { main: '#32CD32', light: '#90EE90', dark: '#006400', text: '#fff' },
            Water: { main: '#4169E1', light: '#87CEEB', dark: '#00008B', text: '#fff' },
            Fire: { main: '#FF4500', light: '#FF6B6B', dark: '#8B0000', text: '#fff' },
            Earth: { main: '#CD853F', light: '#DEB887', dark: '#8B4513', text: '#fff' }
        };
        
        let svg = '<svg viewBox="0 0 300 300" class="bagua-svg houtian">';
        
        // Background with seasonal gradient
        svg += '<defs>';
        svg += '<radialGradient id="htCenter" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#FFF5E6"/><stop offset="100%" style="stop-color:#FFE4B5"/></radialGradient>';
        svg += '</defs>';
        
        // Outer frame
        svg += '<polygon points="150,25 255,65 285,150 255,235 150,275 45,235 15,150 45,65" fill="#16213e" stroke="#d4af37" stroke-width="3"/>';
        svg += '<polygon points="150,35 245,70 272,150 245,230 150,265 55,230 28,150 55,70" fill="url(#htCenter)" stroke="#CD853F" stroke-width="2"/>';
        
        // Center with compass
        svg += '<circle cx="150" cy="150" r="40" fill="#16213e" stroke="#d4af37" stroke-width="2"/>';
        svg += '<circle cx="150" cy="150" r="35" fill="#fff"/>';
        svg += '<text x="150" y="140" text-anchor="middle" font-size="14" fill="#333" font-weight="bold">N</text>';
        svg += '<text x="150" y="170" text-anchor="middle" font-size="14" fill="#333" font-weight="bold">S</text>';
        svg += '<text x="150" y="155" text-anchor="middle" font-size="24" fill="#d4af37">☯</text>';
        
        // Trigrams arranged by compass directions
        trigrams.forEach(t => {
            const pos = positions[t.n];
            const colors = fengShuiColors[t.e];
            const isHighlighted = (t.n === highlightUpper || t.n === highlightLower);
            
            // Glow for highlighted
            if (isHighlighted) {
                svg += `<circle cx="${pos.x}" cy="${pos.y}" r="32" fill="none" stroke="#d4af37" stroke-width="5" class="pulse-glow"/>`;
            }
            
            // Main circle
            svg += `<circle cx="${pos.x}" cy="${pos.y}" r="28" fill="${colors.main}" stroke="${isHighlighted ? '#d4af37' : colors.dark}" stroke-width="${isHighlighted ? 4 : 2}" class="${isHighlighted ? 'highlighted-trigram' : ''}"/>`;
            
            // Symbol
            svg += `<text x="${pos.x}" y="${pos.y-2}" text-anchor="middle" font-size="20" fill="${colors.text}" font-weight="bold">${t.s}</text>`;
            
            // Name
            svg += `<text x="${pos.x}" y="${pos.y+14}" text-anchor="middle" font-size="11" fill="${colors.text}">${t.z}</text>`;
            
            // Direction
            svg += `<text x="${pos.x}" y="${pos.y+24}" text-anchor="middle" font-size="8" fill="#666">${pos.dir}</text>`;
        });
        
        return svg + '</svg>';
    },

    /**
     * He Tu (River Map) with enhanced visual design
     */
    renderHeTu(hetu) {
        const div = document.createElement('div');
        div.className = 'section hetu-enhanced';
        const pn = hetu.personalNumbers || {};
        
        // Feng Shui element colors
        const elementColors = {
            Water: { bg: '#1E3A5F', text: '#87CEEB', accent: '#4169E1' },
            Fire: { bg: '#8B0000', text: '#FFD700', accent: '#FF4500' },
            Wood: { bg: '#2F4F2F', text: '#90EE90', accent: '#228B22' },
            Metal: { bg: '#4a4a00', text: '#FFD700', accent: '#B8860B' },
            Earth: { bg: '#8B4513', text: '#F5DEB3', accent: '#D2691E' }
        };
        
        div.innerHTML = `
            <div class="hetu-header">
                <h3>🌊 ${this.t('hetu')} <span class="zh">河图</span></h3>
                <span class="hetu-subtitle">${this.t('hetuSubtitle')}</span>
            </div>
            <div class="hetu-container">
                <div class="hetu-diagram">
                    <svg viewBox="0 0 400 400" class="hetu-svg">
                        <!-- Center Earth -->
                        <circle cx="200" cy="200" r="55" fill="${elementColors.Earth.bg}" stroke="#d4af37" stroke-width="3"/>
                        <text x="200" y="195" text-anchor="middle" fill="${elementColors.Earth.text}" font-size="22" font-weight="bold">5·10</text>
                        <text x="200" y="220" text-anchor="middle" fill="${elementColors.Earth.text}" font-size="12">Earth 土</text>
                        
                        <!-- North Water -->
                        <circle cx="200" cy="70" r="45" fill="${elementColors.Water.bg}" stroke="${elementColors.Water.accent}" stroke-width="3"/>
                        <text x="200" y="65" text-anchor="middle" fill="${elementColors.Water.text}" font-size="20" font-weight="bold">1·6</text>
                        <text x="200" y="85" text-anchor="middle" fill="${elementColors.Water.text}" font-size="11">Water 水</text>
                        
                        <!-- South Fire -->
                        <circle cx="200" cy="330" r="45" fill="${elementColors.Fire.bg}" stroke="${elementColors.Fire.accent}" stroke-width="3"/>
                        <text x="200" y="325" text-anchor="middle" fill="${elementColors.Fire.text}" font-size="20" font-weight="bold">2·7</text>
                        <text x="200" y="345" text-anchor="middle" fill="${elementColors.Fire.text}" font-size="11">Fire 火</text>
                        
                        <!-- East Wood -->
                        <circle cx="330" cy="200" r="45" fill="${elementColors.Wood.bg}" stroke="${elementColors.Wood.accent}" stroke-width="3"/>
                        <text x="330" y="195" text-anchor="middle" fill="${elementColors.Wood.text}" font-size="20" font-weight="bold">3·8</text>
                        <text x="330" y="215" text-anchor="middle" fill="${elementColors.Wood.text}" font-size="11">Wood 木</text>
                        
                        <!-- West Metal -->
                        <circle cx="70" cy="200" r="45" fill="${elementColors.Metal.bg}" stroke="${elementColors.Metal.accent}" stroke-width="3"/>
                        <text x="70" y="195" text-anchor="middle" fill="${elementColors.Metal.text}" font-size="20" font-weight="bold">4·9</text>
                        <text x="70" y="215" text-anchor="middle" fill="${elementColors.Metal.text}" font-size="11">Metal 金</text>
                        
                        <!-- Connection lines showing generation cycle -->
                        <path d="M 200,115 L 200,145" stroke="#90EE90" stroke-width="3" stroke-dasharray="5,3" marker-end="url(#arrowhead)"/>
                        <path d="M 245,200 L 285,200" stroke="#FFD700" stroke-width="3" stroke-dasharray="5,3"/>
                        <path d="M 200,255 L 200,285" stroke="#FF4500" stroke-width="3" stroke-dasharray="5,3"/>
                        <path d="M 115,200 L 155,200" stroke="#87CEEB" stroke-width="3" stroke-dasharray="5,3"/>
                    </svg>
                </div>
                <div class="hetu-data">
                    <div class="hetu-numbers-card">
                        <h4>${this.t('personalNumbers')} <span class="zh">個人數字</span></h4>
                        <div class="numbers-grid">
                            <div class="num-item year"><span class="label">${this.t('yearLabel')}</span><span class="value">${pn.yearNumber || '-'}</span></div>
                            <div class="num-item month"><span class="label">${this.t('monthLabel')}</span><span class="value">${pn.monthNumber || '-'}</span></div>
                            <div class="num-item day"><span class="label">${this.t('dayLabel')}</span><span class="value">${pn.dayNumber || '-'}</span></div>
                            <div class="num-item hour"><span class="label">${this.t('hourLabel')}</span><span class="value">${pn.hourNumber || '-'}</span></div>
                            <div class="num-item life highlight"><span class="label">${this.t('lifeLabel')}</span><span class="value">${pn.lifeNumber || '-'}</span></div>
                            <div class="num-item destiny highlight"><span class="label">${this.t('destinyLabel')}</span><span class="value">${pn.destinyNumber || '-'}</span></div>
                        </div>
                    </div>
                    <div class="hetu-flow-card">
                        <h4>${this.t('elementalFlow')} <span class="zh">五行流通</span></h4>
                        <div class="flow-sequence">${(hetu.elementalFlow?.sequence || []).map((e,i,a) =>
                            `<span class="flow-item ${e.toLowerCase()}">${e} ${this.getElementZh(e)}</span>${i<a.length-1?'<span class="flow-arrow">→</span>':''}`
                        ).join('')}</div>
                        <div class="flow-analysis">
                            <div class="dominant"><span class="label">${this.t('dominant')}:</span><span class="value ${hetu.elementalFlow?.dominant?.toLowerCase()}">${hetu.elementalFlow?.dominant || 'N/A'}</span></div>
                            <div class="deficient"><span class="label">${this.t('deficient')}:</span><span class="value ${hetu.elementalFlow?.deficient?.toLowerCase()}">${hetu.elementalFlow?.deficient || 'N/A'}</span></div>
                        </div>
                    </div>
                </div>
            </div>`;
        return div;
    },

    /**
     * Luo Shu (Magic Square) with enhanced visuals
     */
    renderLuoShu(luoshu) {
        const div = document.createElement('div');
        div.className = 'section luoshu-enhanced';
        const mg = luoshu.mingGua || {};
        const fd = luoshu.favorableDirections || {};
        
        // Element color mapping
        const elementStyles = {
            Metal: { bg: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', text: '#4a4a00', border: '#DAA520' },
            Wood: { bg: 'linear-gradient(135deg, #228B22 0%, #006400 100%)', text: '#fff', border: '#32CD32' },
            Water: { bg: 'linear-gradient(135deg, #4169E1 0%, #00008B 100%)', text: '#fff', border: '#1E90FF' },
            Fire: { bg: 'linear-gradient(135deg, #FF4500 0%, #8B0000 100%)', text: '#fff', border: '#DC143C' },
            Earth: { bg: 'linear-gradient(135deg, #D2691E 0%, #8B4513 100%)', text: '#fff', border: '#CD853F' }
        };
        
        const style = elementStyles[mg.element] || elementStyles.Earth;
        
        div.innerHTML = `
            <div class="luoshu-header">
                <h3>🔢 ${this.t('luoshu')} <span class="zh">洛书</span></h3>
                <span class="luoshu-subtitle">${this.t('luoshuSubtitle')}</span>
            </div>
            <div class="luoshu-container">
                <div class="magic-square-container">
                    <div class="magic-square">
                        <div class="sq-row">
                            <div class="cell wood" data-num="4"><b>4</b><span>SE</span></div>
                            <div class="cell fire" data-num="9"><b>9</b><span>S</span></div>
                            <div class="cell earth" data-num="2"><b>2</b><span>SW</span></div>
                        </div>
                        <div class="sq-row">
                            <div class="cell wood" data-num="3"><b>3</b><span>E</span></div>
                            <div class="cell earth center" data-num="5"><b>5</b><span>C</span></div>
                            <div class="cell metal" data-num="7"><b>7</b><span>W</span></div>
                        </div>
                        <div class="sq-row">
                            <div class="cell earth" data-num="8"><b>8</b><span>NE</span></div>
                            <div class="cell water" data-num="1"><b>1</b><span>N</span></div>
                            <div class="cell metal" data-num="6"><b>6</b><span>NW</span></div>
                        </div>
                    </div>
                    <div class="luoshu-note">${this.t('magicSquareNote')}</div>
                </div>
                <div class="luoshu-info">
                    ${mg.number ? `
                    <div class="minggua-card" style="background: ${style.bg}; border-color: ${style.border}">
                        <h4>${this.t('lifeGua')} <span class="zh">命卦</span></h4>
                        <div class="gua-display">
                            <div class="gua-number">${mg.number}</div>
                            <div class="gua-details">
                                <div class="gua-trigram">${mg.trigram} ${mg.zh || ''}</div>
                                <div class="gua-element" style="color: ${style.text}">${mg.element}</div>
                                <div class="gua-binary">${mg.binary || ''}</div>
                            </div>
                        </div>
                    </div>` : ''}
                    ${fd.shengQi ? `
                    <div class="fav-dirs-card">
                        <h4>${this.t('favorableDirections')} <span class="zh">吉方</span></h4>
                        <div class="dirs-grid">
                            <div class="dir-item shengqi">
                                <span class="dir-icon">✦</span>
                                <div class="dir-info">
                                    <span class="dir-name">${this.t('shengQi')} <span class="zh">生氣</span></span>
                                    <span class="dir-value">${fd.shengQi}</span>
                                </div>
                            </div>
                            <div class="dir-item tianyi">
                                <span class="dir-icon">✦</span>
                                <div class="dir-info">
                                    <span class="dir-name">${this.t('tianYi')} <span class="zh">天醫</span></span>
                                    <span class="dir-value">${fd.tianYi}</span>
                                </div>
                            </div>
                            <div class="dir-item yannian">
                                <span class="dir-icon">✦</span>
                                <div class="dir-info">
                                    <span class="dir-name">${this.t('yanNian')} <span class="zh">延年</span></span>
                                    <span class="dir-value">${fd.yanNian}</span>
                                </div>
                            </div>
                            <div class="dir-item fuwei">
                                <span class="dir-icon">○</span>
                                <div class="dir-info">
                                    <span class="dir-name">${this.t('fuWei')} <span class="zh">伏位</span></span>
                                    <span class="dir-value">${fd.fuWei || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>` : ''}
                </div>
            </div>`;
        return div;
    },

    /**
     * Lunar Mansion with enhanced design
     */
    renderLunarMansion(m) {
        const div = document.createElement('div');
        div.className = 'section lunar-enhanced';
        const mn = m.mansion || {};
        
        // Group colors
        const groupColors = {
            'Azure Dragon': { bg: '#1a472a', accent: '#228B22' },
            'Vermilion Bird': { bg: '#8B0000', accent: '#DC143C' },
            'White Tiger': { bg: '#4a4a4a', accent: '#C0C0C0' },
            'Black Tortoise': { bg: '#191970', accent: '#4169E1' }
        };
        
        const colors = groupColors[mn.group] || { bg: '#4a4a4a', accent: '#666' };
        
        div.innerHTML = `
            <div class="lunar-header-bar" style="background: linear-gradient(90deg, ${colors.bg} 0%, ${colors.accent} 100%)">
                <h3>🌙 ${this.t('lunarMansion')} <span class="zh">二十八宿</span></h3>
                <span class="lunar-number">${mn.num || '?'}/28</span>
            </div>
            <div class="lunar-card">
                <div class="lunar-main">
                    <div class="lunar-symbol" style="background: ${colors.accent}">${mn.symbol || mn.animal?.[0] || '☯'}</div>
                    <div class="lunar-identity">
                        <div class="lunar-name">
                            <span class="hz">${mn.zh || ''}</span>
                            <span class="en">${mn.name || ''}</span>
                        </div>
                        <div class="lunar-group">${mn.group || ''} ${mn.group_zh || ''}</div>
                    </div>
                    <div class="lunar-animal">${mn.animal || ''}</div>
                </div>
                <div class="lunar-details">
                    <div class="detail-item"><span class="label">${this.t('element')}</span><span class="value ${mn.element?.toLowerCase()}">${mn.element || ''}</span></div>
                    <div class="detail-item"><span class="label">${this.t('direction')}</span><span class="value">${mn.direction || ''}</span></div>
                    <div class="detail-item"><span class="label">${this.t('degrees')}</span><span class="value">${(m.degree || 0).toFixed(1)}°</span></div>
                    <div class="detail-item"><span class="label">${this.t('dayRuler')}</span><span class="value">${m.dayRuler || ''}</span></div>
                    <div class="detail-item"><span class="label">${this.t('hourRuler')}</span><span class="value">${m.hourRuler || ''}</span></div>
                    <div class="detail-item longitude"><span class="label">${this.t('longitude')}</span><span class="value">${(m.exactLongitude || 0).toFixed(2)}°</span></div>
                </div>
            </div>`;
        return div;
    },

    /**
     * Tai Sui with warning styling
     */
    renderTaiSui(t) {
        const div = document.createElement('div');
        div.className = 'section taisui-enhanced';
        const p = t.currentPosition || {};
        
        div.innerHTML = `
            <div class="taisui-header">
                <h3>👑 ${this.t('taiSui')} <span class="zh">太歲</span></h3>
                <span class="taisui-year">${this.t('grandDukeOfYear')}</span>
            </div>
            <div class="taisui-grid">
                <div class="taisui-position">
                    <div class="position-main">
                        <div class="branch-large">${p.zh || '?'}</div>
                        <div class="branch-details">
                            <div class="branch-name">${p.branch || ''} ${p.zodiac || ''}</div>
                            <div class="branch-direction">${p.direction || ''} ${p.degree || 0}°</div>
                        </div>
                    </div>
                </div>
                <div class="taisui-warnings">
                    <div class="warning-card sansha">
                        <div class="warning-icon">⚠️</div>
                        <div class="warning-content">
                            <b>${this.t('sanSha')} 三煞</b>
                            <span>${t.sanSha?.description || this.t('avoidConstruction')}</span>
                        </div>
                    </div>
                    <div class="warning-card suipo">
                        <div class="warning-icon">⚡</div>
                        <div class="warning-content">
                            <b>${this.t('suiPo')} 歲破</b>
                            <span>${this.t('opposite')}: ${t.suiPo?.branch || ''} ${t.suiPo?.zh || ''}</span>
                        </div>
                    </div>
                    ${t.annualTaiSui ? `
                    <div class="annual-note">
                        <span class="note-label">${this.t('annual')}:</span>
                        <span class="note-text">${t.annualTaiSui.text || ''}</span>
                    </div>` : ''}
                </div>
            </div>`;
        return div;
    },

    // Helper methods
    getSymbol(binary) {
        return {'111':'☰','011':'☱','101':'☲','001':'☳','110':'☴','010':'☵','100':'☶','000':'☷'}[binary] || '☯';
    },
    
    getElementZh(element) {
        const map = { 'Wood': '木', 'Fire': '火', 'Earth': '土', 'Metal': '金', 'Water': '水' };
        return map[element] || '';
    },

    getOrdinal(reverseIndex) {
        const ordinals = {
            en: ['6th','5th','4th','3rd','2nd','1st'],
            es: ['6ª','5ª','4ª','3ª','2ª','1ª'],
            it: ['6ª','5ª','4ª','3ª','2ª','1ª'],
            zh: ['六','五','四','三','二','初']
        };
        return (ordinals[this.lang] || ordinals.en)[reverseIndex] || '';
    },

    getNature(nature) {
        const map = {
            en: { Heaven: 'Heaven', Lake: 'Lake', Fire: 'Fire', Thunder: 'Thunder', Wind: 'Wind', Water: 'Water', Mountain: 'Mountain', Earth: 'Earth' },
            es: { Heaven: 'Cielo', Lake: 'Lago', Fire: 'Fuego', Thunder: 'Trueno', Wind: 'Viento', Water: 'Agua', Mountain: 'Montaña', Earth: 'Tierra' },
            it: { Heaven: 'Cielo', Lake: 'Lago', Fire: 'Fuoco', Thunder: 'Tuono', Wind: 'Vento', Water: 'Acqua', Mountain: 'Montagna', Earth: 'Terra' },
            zh: { Heaven: '天', Lake: '澤', Fire: '火', Thunder: '雷', Wind: '風', Water: '水', Mountain: '山', Earth: '地' }
        };
        return (map[this.lang] || map.en)[nature] || nature;
    },

    getSeason(season) {
        const map = {
            en: { Summer: 'Summer', 'Late Summer': 'Late Summer', Autumn: 'Autumn', Winter: 'Winter', Spring: 'Spring' },
            es: { Summer: 'Verano', 'Late Summer': 'Fin de Verano', Autumn: 'Otoño', Winter: 'Invierno', Spring: 'Primavera' },
            it: { Summer: 'Estate', 'Late Summer': 'Fine Estate', Autumn: 'Autunno', Winter: 'Inverno', Spring: 'Primavera' },
            zh: { Summer: '夏', 'Late Summer': '長夏', Autumn: '秋', Winter: '冬', Spring: '春' }
        };
        return (map[this.lang] || map.en)[season] || season;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHINESE_ASTROLOGY_API, ChineseAstrologyDisplay };
}
