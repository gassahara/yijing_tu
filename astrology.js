class Astrology {
    /**
     * Get Lunar Mansion (28 Mansions) for a given date
     * @param {Date} date - The date to calculate for
     * @param {number} latitude - Optional latitude for location-specific calculations
     * @param {number} longitude - Optional longitude for true solar time correction
     * @returns {Object} Lunar mansion data
     */
    static getLunarMansion(date, latitude = null, longitude = null) {
        // Apply true solar time correction if longitude provided (真太阳时)
        let adjustedDate = date;
        if (longitude !== null) {
            adjustedDate = this.calculateTrueSolarTime(date, longitude);
        }
        
        const start = new Date(adjustedDate.getFullYear(), 0, 0);
        const diff = adjustedDate - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const springEquinoxDay = 79;
        let sunLongitude = ((dayOfYear - springEquinoxDay) / 365.25) * 360;
        if (sunLongitude < 0) sunLongitude += 360;

        // Find the mansion
        let mansion = LUNAR_MANSIONS[0];
        for (let m of LUNAR_MANSIONS) {
            if (sunLongitude >= m.startDeg && sunLongitude < m.endDeg) {
                mansion = m;
                break;
            }
        }
        
        // Add location info if provided
        if (latitude !== null && longitude !== null) {
            return {
                ...mansion,
                location: { latitude, longitude },
                calculationMethod: 'trueSolarTime'
            };
        }
        
        return mansion;
    }
    
    /**
     * Calculate True Solar Time (真太阳时) from standard time and longitude
     * @param {Date} standardDate - Standard clock time
     * @param {number} longitude - Location longitude in degrees
     * @returns {Date} Adjusted date with true solar time
     */
    static calculateTrueSolarTime(standardDate, longitude) {
        const standardMeridian = 120; // Beijing time uses 120°E
        const longitudeDiff = longitude - standardMeridian;
        const minutesCorrection = longitudeDiff * 4; // 4 minutes per degree
        
        return new Date(standardDate.getTime() + minutesCorrection * 60000);
    }

    static getMoonPhase(date) {
        const lunarCycle = 29.53058867;
        const known = new Date('2000-01-06');
        const diff = (date - known) / (1000 * 60 * 60 * 24);
        const phase = (diff % lunarCycle) / lunarCycle;

        if (phase < 0.0625 || phase >= 0.9375) return { icon: '\u25CF', name: { en: 'New Moon', es: 'Luna Nueva', it: 'Luna Nuova', zh: '新月' } };
        if (phase < 0.1875) return { icon: '\u263D', name: { en: 'Waxing Crescent', es: 'Creciente', it: 'Crescente', zh: '眉月' } };
        if (phase < 0.3125) return { icon: '\u25D0', name: { en: 'First Quarter', es: 'Cuarto Creciente', it: 'Primo Quarto', zh: '上弦月' } };
        if (phase < 0.4375) return { icon: '\u25D1', name: { en: 'Waxing Gibbous', es: 'Gibosa Creciente', it: 'Gibbosa Crescente', zh: '盈凸月' } };
        if (phase < 0.5625) return { icon: '\u25CB', name: { en: 'Full Moon', es: 'Luna Llena', it: 'Luna Piena', zh: '满月' } };
        if (phase < 0.6875) return { icon: '\u25D1', name: { en: 'Waning Gibbous', es: 'Gibosa Menguante', it: 'Gibbosa Calante', zh: '亏凸月' } };
        if (phase < 0.8125) return { icon: '\u25D0', name: { en: 'Last Quarter', es: 'Cuarto Menguante', it: 'Ultimo Quarto', zh: '下弦月' } };
        return { icon: '\u263E', name: { en: 'Waning Crescent', es: 'Menguante', it: 'Calante', zh: '残月' } };
    }

    static getBaziChart(date, time = "12:00") {
        const [hours, minutes] = time.split(':').map(Number);
        const birthDate = new Date(date);
        birthDate.setHours(hours, minutes);

        // 1. Year Pillar
        // BaZi year changes at Li Chun (approx Feb 4)
        const year = birthDate.getFullYear();
        let liChun = new Date(year, 1, 4); 
        // Adjustment: Year starts from Jia-Zi (1924, 1984, 2044)
        // 1900 was Geng-Zi (Stem 6, Branch 0)
        let baziYear = year;
        if (birthDate < liChun) baziYear--;
        const yearStemIdx = (baziYear - 4 + 10) % 10;
        const yearBranchIdx = (baziYear - 4 + 12) % 12;

        // 2. Month Pillar
        // Months start at specific solar terms
        // Simplified month calculation based on approx solar term dates
        // Index 0: Jan (Chou), Index 1: Feb (Yin), etc.
        const monthStarts = [
            { m: 0, d: 5 },  // Jan: Xiao Han (approx Jan 5) -> Chou month
            { m: 1, d: 4 },  // Feb: Li Chun (approx Feb 4) -> Yin month
            { m: 2, d: 5 },  // Mar: Jing Zhe (approx Mar 5) -> Mao month
            { m: 3, d: 5 },  // Apr: Qing Ming (approx Apr 5) -> Chen month
            { m: 4, d: 5 },  // May: Li Xia (approx May 5) -> Si month
            { m: 5, d: 6 },  // Jun: Mang Zhong (approx Jun 6) -> Wu month
            { m: 6, d: 7 },  // Jul: Xiao Shu (approx Jul 7) -> Wei month
            { m: 7, d: 7 },  // Aug: Li Qiu (approx Aug 7) -> Shen month
            { m: 8, d: 8 },  // Sep: Bai Lu (approx Sep 8) -> You month
            { m: 9, d: 8 },  // Oct: Han Lu (approx Oct 8) -> Xu month
            { m: 10, d: 7 }, // Nov: Li Dong (approx Nov 7) -> Hai month
            { m: 11, d: 7 }  // Dec: Da Xue (approx Dec 7) -> Zi month
        ];
        
        let baziMonthIdx = birthDate.getMonth();
        if (birthDate.getDate() < monthStarts[baziMonthIdx].d) {
            baziMonthIdx = (baziMonthIdx + 11) % 12;
        }
        
        // Month Branch: Feb is Yin (2), Jan is Chou (1), Dec is Zi (0)
        const monthBranchIdx = (baziMonthIdx + 1) % 12;
        // Month Stem calculation: (Year Stem * 2 + Month Branch) % 10
        const monthStemIdx = (yearStemIdx * 2 + monthBranchIdx) % 10;

        // 3. Day Pillar
        // Reference: Jan 1, 2000 was Wu-Wu (4, 6)
        const refDate = new Date(2000, 0, 1);
        const diffDays = Math.floor((birthDate - refDate) / (1000 * 60 * 60 * 24));
        const dayStemIdx = (4 + (diffDays % 10) + 10) % 10;
        const dayBranchIdx = (6 + (diffDays % 12) + 12) % 12;

        // 4. Hour Pillar
        const hourBranchIdx = Math.floor((hours + 1) / 2) % 12;
        // Hour Stem calculation: (Day Stem * 2 + Hour Branch) % 10
        const hourStemIdx = (dayStemIdx * 2 + hourBranchIdx) % 10;

        const chart = {
            year: { stem: HEAVENLY_STEMS[yearStemIdx], branch: EARTHLY_BRANCHES[yearBranchIdx] },
            month: { stem: HEAVENLY_STEMS[monthStemIdx], branch: EARTHLY_BRANCHES[monthBranchIdx] },
            day: { stem: HEAVENLY_STEMS[dayStemIdx], branch: EARTHLY_BRANCHES[dayBranchIdx] },
            hour: { stem: HEAVENLY_STEMS[hourStemIdx], branch: EARTHLY_BRANCHES[hourBranchIdx] }
        };

        // Day Master is the Day Stem
        const dayMaster = chart.day.stem;
        
        // Calculate Ten Gods for each pillar
        const calculateTenGod = (targetStem, dm) => {
            const relations = {
                "Same": { same: "Friend", diff: "Rob Wealth" },
                "Produced": { same: "Eating God", diff: "Hurting Officer" },
                "Produces": { same: "Indirect Resource", diff: "Direct Resource" },
                "Controlled": { same: "Indirect Wealth", diff: "Direct Wealth" },
                "Controls": { same: "Seven Killings", diff: "Direct Officer" }
            };
            
            let relation;
            if (targetStem.element === dm.element) relation = "Same";
            else if (FIVE_ELEMENTS[dm.element].produces === targetStem.element) relation = "Produced";
            else if (FIVE_ELEMENTS[targetStem.element].produces === dm.element) relation = "Produces";
            else if (FIVE_ELEMENTS[dm.element].overcomes === targetStem.element) relation = "Controlled";
            else relation = "Controls";

            const polarityMatch = targetStem.polarity === dm.polarity ? "same" : "diff";
            return TEN_GODS[relations[relation][polarityMatch]];
        };

        chart.year.tenGod = calculateTenGod(chart.year.stem, dayMaster);
        chart.month.tenGod = calculateTenGod(chart.month.stem, dayMaster);
        chart.hour.tenGod = calculateTenGod(chart.hour.stem, dayMaster);
        // Day branch ten god is usually based on its main hidden stem
        const getBranchTenGod = (branch, dm) => {
            const mainHiddenStemZh = branch.hidden[0];
            const mainHiddenStem = HEAVENLY_STEMS.find(s => s.zh === mainHiddenStemZh);
            return calculateTenGod(mainHiddenStem, dm);
        };
        chart.year.branchTenGod = getBranchTenGod(chart.year.branch, dayMaster);
        chart.month.branchTenGod = getBranchTenGod(chart.month.branch, dayMaster);
        chart.day.branchTenGod = getBranchTenGod(chart.day.branch, dayMaster);
        chart.hour.branchTenGod = getBranchTenGod(chart.hour.branch, dayMaster);

        // Strength Analysis (Simplified)
        chart.strength = this.analyzeStrength(chart);

        return chart;
    }

    static analyzeStrength(chart) {
        const dm = chart.day.stem;
        const season = chart.month.branch;
        
        let score = 0;
        
        // 1. Season Support (The most important factor in Zi Ping)
        if (season.element === dm.element) score += 40; // Same element
        else if (FIVE_ELEMENTS[season.element].produces === dm.element) score += 30; // Season produces DM
        else if (FIVE_ELEMENTS[dm.element].produces === season.element) score -= 20; // DM produces season (weakens)
        else if (FIVE_ELEMENTS[season.element].overcomes === dm.element) score -= 30; // Season overcomes DM
        else score -= 10; // DM overcomes season

        // 2. Other Pillars Support
        const stems = [chart.year.stem, chart.month.stem, chart.hour.stem];
        stems.forEach(s => {
            if (s.element === dm.element) score += 10;
            else if (FIVE_ELEMENTS[s.element].produces === dm.element) score += 10;
            else score -= 5;
        });

        const branches = [chart.year.branch, chart.day.branch, chart.hour.branch];
        branches.forEach(b => {
            if (b.element === dm.element) score += 10;
            else if (FIVE_ELEMENTS[b.element].produces === dm.element) score += 10;
            else score -= 5;
        });

        let result = "";
        if (score > 20) result = "Strong";
        else if (score < -10) result = "Weak";
        else result = "Balanced";

        // Useful God (Yong Shen) suggestion
        let yongShen = "";
        if (result === "Strong") {
            // Need to weaken: find what DM overcomes or what overcomes DM
            yongShen = FIVE_ELEMENTS[dm.element].overcomes; 
        } else if (result === "Weak") {
            // Need to strengthen: find what produces DM or same element
            yongShen = dm.element;
        } else {
            yongShen = "Balanced";
        }

        return { score, result, yongShen };
    }

    static getHourBranch(hour, minute, ziMethod = 'early') {
        if (ziMethod === 'early') {
            if (hour === 23) return { branch: 12, dayChange: 0 };
        } else {
            if (hour === 23) return { branch: 1, dayChange: 1 };
        }
        const hourBranches = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12];
        return { branch: hourBranches[hour] || 1, dayChange: 0 };
    }

    static calculateLifePalace(month, hour) {
        let result = (month - hour) % 12;
        if (result <= 0) result += 12;
        return result;
    }

    static calculateBodyPalace(lifePalace, hour) {
        let result = (lifePalace + hour) % 12;
        if (result === 0) result = 12;
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // XIANTIAN (Early Heaven) Analysis for Bazi
    // Used for: congenital nature, spiritual cultivation, inner alchemy
    // ═══════════════════════════════════════════════════════════════════════════════

    static getXiantianAnalysis(chart) {
        const xiantianTrigrams = {
            Qian: { name: 'Qian', zh: '乾', dir: 'S', binary: '111', element: 'Heaven', spiritual: 'Pure Yang / Spirit (Shen)', number: 6 },
            Dui:  { name: 'Dui', zh: '兌', dir: 'SE', binary: '011', element: 'Metal', spiritual: 'Soul (Hun) / Joy', number: 7 },
            Li:   { name: 'Li', zh: '離', dir: 'E', binary: '101', element: 'Fire', spiritual: 'Intention (Yi) / Clarity', number: 9 },
            Zhen: { name: 'Zhen', zh: '震', dir: 'NE', binary: '001', element: 'Wood', spiritual: 'Will (Zhi) / Arousing', number: 3 },
            Kun:  { name: 'Kun', zh: '坤', dir: 'N', binary: '000', element: 'Earth', spiritual: 'Pure Yin / Body (Jing)', number: 2 },
            Gen:  { name: 'Gen', zh: '艮', dir: 'NW', binary: '100', element: 'Earth', spiritual: 'Intuition (Po) / Stillness', number: 8 },
            Kan:  { name: 'Kan', zh: '坎', dir: 'W', binary: '010', element: 'Water', spiritual: 'Vitality (Jing) / Danger', number: 1 },
            Xun:  { name: 'Xun', zh: '巽', dir: 'SW', binary: '110', element: 'Wind', spiritual: 'Breath (Qi) / Gentle', number: 4 }
        };

        // Map stems/branches to Xiantian trigrams based on elemental resonance
        const getTrigramForPillar = (pillar) => {
            const element = pillar.stem.element;
            const polarity = pillar.stem.polarity;
            
            // Yang elements map to Yang trigrams, Yin to Yin
            const mapping = {
                'Wood': polarity === 'Yang' ? 'Zhen' : 'Xun',
                'Fire': polarity === 'Yang' ? 'Li' : 'Li', // Li is middle yang
                'Earth': polarity === 'Yang' ? 'Gen' : 'Kun',
                'Metal': polarity === 'Yang' ? 'Qian' : 'Dui',
                'Water': polarity === 'Yang' ? 'Kan' : 'Kan' // Kan is middle yin
            };
            
            return xiantianTrigrams[mapping[element]];
        };

        const yearTrigram = getTrigramForPillar(chart.year);
        const monthTrigram = getTrigramForPillar(chart.month);
        const dayTrigram = getTrigramForPillar(chart.day);
        const hourTrigram = getTrigramForPillar(chart.hour);

        // Calculate congenital nature (先天命)
        const dayMaster = chart.day.stem;
        const congenitalElement = dayMaster.element;
        const congenitalPolarity = dayMaster.polarity;

        // Determine Three Treasures (三寶) alignment
        const threeTreasures = {
            jing: { trigram: 'Kan', element: 'Water', palace: 'Lower Dantian', desc: 'Essence/Vitality' },
            qi: { trigram: 'Xun', element: 'Wind/Wood', palace: 'Middle Dantian', desc: 'Energy/Breath' },
            shen: { trigram: 'Qian', element: 'Heaven', palace: 'Upper Dantian', desc: 'Spirit/Consciousness' }
        };

        // Check which treasure is strongest based on chart
        const pillarToTreasure = {
            'Water': 'jing', 'Wood': 'qi', 'Fire': 'qi', 'Earth': 'jing', 'Metal': 'shen', 'Heaven': 'shen'
        };

        let treasureScores = { jing: 0, qi: 0, shen: 0 };
        [chart.year, chart.month, chart.day, chart.hour].forEach(pillar => {
            const treasure = pillarToTreasure[pillar.stem.element] || 'qi';
            treasureScores[treasure]++;
            // Branches contribute half
            const branchTreasure = pillarToTreasure[pillar.branch.element] || 'qi';
            treasureScores[branchTreasure] += 0.5;
        });

        const dominantTreasure = Object.entries(treasureScores)
            .sort((a, b) => b[1] - a[1])[0][0];

        return {
            arrangement: 'xiantian',
            zhName: '先天八卦',
            description: 'Early Heaven arrangement - for congenital nature and spiritual cultivation',
            pillars: {
                year: { trigram: yearTrigram, pillar: chart.year },
                month: { trigram: monthTrigram, pillar: chart.month },
                day: { trigram: dayTrigram, pillar: chart.day },
                hour: { trigram: hourTrigram, pillar: chart.hour }
            },
            congenitalNature: {
                element: congenitalElement,
                polarity: congenitalPolarity,
                description: `Congenital nature is ${congenitalPolarity} ${congenitalElement}`,
                cultivationFocus: this.getCultivationFocus(congenitalElement, congenitalPolarity)
            },
            threeTreasures: {
                scores: treasureScores,
                dominant: dominantTreasure,
                dominantInfo: threeTreasures[dominantTreasure],
                all: threeTreasures
            },
            neidanGuidance: this.getNeidanGuidance(chart, dominantTreasure),
            spiritualAspects: {
                yearSpirit: yearTrigram.spiritual,
                monthSpirit: monthTrigram.spiritual,
                daySpirit: dayTrigram.spiritual,
                hourSpirit: hourTrigram.spiritual
            }
        };
    }

    static getCultivationFocus(element, polarity) {
        const focus = {
            'Wood': 'Cultivate flexibility and growth. Practice liver/qing qi circulation.',
            'Fire': 'Cultivate clarity and joy. Practice heart shen illumination.',
            'Earth': 'Cultivate stability and centeredness. Practice spleen qi consolidation.',
            'Metal': 'Cultivate purity and precision. Practice lung qi purification.',
            'Water': 'Cultivate depth and wisdom. Practice kidney jing conservation.'
        };
        return focus[element] || 'Balance all elements';
    }

    static getNeidanGuidance(chart, dominantTreasure) {
        const guidance = {
            jing: {
                focus: 'Conserve and refine essence (Jing)',
                practices: ['Meditation on lower dantian', 'Kidney breathing', 'Sexual energy conservation'],
                warnings: ['Avoid excessive activity', 'Protect the kidneys', 'Rest before midnight']
            },
            qi: {
                focus: 'Cultivate and circulate energy (Qi)',
                practices: ['Qigong movements', 'Tai chi', 'Breath work (Tu Na)'],
                warnings: ['Avoid stagnant postures', 'Maintain smooth breathing', 'Circulate before storing']
            },
            shen: {
                focus: 'Refine and elevate spirit (Shen)',
                practices: ['Meditation on third eye', 'Visualization practices', 'Spiritual contemplation'],
                warnings: ['Ground after spiritual work', 'Avoid excessive mental activity', 'Balance with physical practice']
            }
        };
        return guidance[dominantTreasure] || guidance.qi;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // HETU (River Map) Analysis
    // Ancient diagram showing the generation sequence of Five Elements
    // ═══════════════════════════════════════════════════════════════════════════════

    static getHetuAnalysis(chart) {
        // Hetu numbers and their elemental correspondences
        const hetuNumbers = {
            1: { element: 'Water', polarity: 'Yin', position: 'North', dots: { white: 0, black: 6 } },
            2: { element: 'Fire', polarity: 'Yin', position: 'South', dots: { white: 0, black: 7 } },
            3: { element: 'Wood', polarity: 'Yang', position: 'East', dots: { white: 8, black: 0 } },
            4: { element: 'Metal', polarity: 'Yin', position: 'West', dots: { white: 9, black: 0 } },
            5: { element: 'Earth', polarity: 'Yang', position: 'Center', dots: { white: 5, black: 5 } },
            6: { element: 'Water', polarity: 'Yang', position: 'North', dots: { white: 0, black: 6 } },
            7: { element: 'Fire', polarity: 'Yang', position: 'South', dots: { white: 0, black: 7 } },
            8: { element: 'Wood', polarity: 'Yin', position: 'East', dots: { white: 8, black: 0 } },
            9: { element: 'Metal', polarity: 'Yang', position: 'West', dots: { white: 9, black: 0 } },
            10: { element: 'Earth', polarity: 'Yin', position: 'Center', dots: { white: 5, black: 5 } }
        };

        // Generation pairs (Xiang Sheng)
        const generationPairs = [
            [1, 6], // Water generates
            [2, 7], // Fire generates  
            [3, 8], // Wood generates
            [4, 9], // Metal generates
            [5, 10] // Earth generates (and is generated by all)
        ];

        // Map chart pillars to Hetu numbers
        const getHetuNumber = (pillar) => {
            const stemIdx = HEAVENLY_STEMS.findIndex(s => s.zh === pillar.stem.zh);
            const branchIdx = EARTHLY_BRANCHES.findIndex(b => b.zh === pillar.branch.zh);
            
            // Simplified mapping: use (stem + branch) % 10 + 1
            let num = ((stemIdx + branchIdx) % 10) + 1;
            return num;
        };

        const yearNum = getHetuNumber(chart.year);
        const monthNum = getHetuNumber(chart.month);
        const dayNum = getHetuNumber(chart.day);
        const hourNum = getHetuNumber(chart.hour);

        const pillarNumbers = { year: yearNum, month: monthNum, day: dayNum, hour: hourNum };

        // Analyze generation cycles
        const generationAnalysis = this.analyzeHetuCycles(pillarNumbers, hetuNumbers);

        return {
            name: 'Hetu',
            zhName: '河圖',
            description: 'River Map - Generation sequence of Five Elements',
            pillarNumbers,
            elements: {
                year: hetuNumbers[yearNum].element,
                month: hetuNumbers[monthNum].element,
                day: hetuNumbers[dayNum].element,
                hour: hetuNumbers[hourNum].element
            },
            generationPairs,
            generationAnalysis,
            lifePath: this.getHetuLifePath(pillarNumbers, hetuNumbers),
            elementalGeneration: this.getElementalGenerationFlow(chart, hetuNumbers, pillarNumbers)
        };
    }

    static analyzeHetuCycles(numbers, hetuNumbers) {
        const nums = Object.values(numbers);
        const elements = nums.map(n => hetuNumbers[n].element);
        
        // Count element frequencies
        const elementCount = {};
        elements.forEach(e => { elementCount[e] = (elementCount[e] || 0) + 1; });

        // Check for generation support
        const generationSupport = [];
        const elementPairs = [
          [elements[0], elements[1]], // Year-Month
          [elements[1], elements[2]], // Month-Day
          [elements[2], elements[3]]  // Day-Hour
        ];

        elementPairs.forEach(([from, to], idx) => {
            const pillars = [['year', 'month'], ['month', 'day'], ['day', 'hour']][idx];
            if (FIVE_ELEMENTS[from]?.produces === to) {
                generationSupport.push({
                    from: { pillar: pillars[0], element: from },
                    to: { pillar: pillars[1], element: to },
                    type: 'generates',
                    strength: 'strong'
                });
            }
        });

        return {
            elementDistribution: elementCount,
            generationSupport,
            dominantElement: Object.entries(elementCount).sort((a, b) => b[1] - a[1])[0][0],
            balance: this.assessHetuBalance(elementCount)
        };
    }

    static assessHetuBalance(elementCount) {
        const total = Object.values(elementCount).reduce((a, b) => a + b, 0);
        const max = Math.max(...Object.values(elementCount));
        
        if (max / total > 0.6) return 'Imbalanced - one element dominant';
        if (max / total > 0.4) return 'Moderately balanced';
        return 'Well balanced';
    }

    static getHetuLifePath(numbers, hetuNumbers) {
        // Year = Foundation/Ancestry
        // Month = Growth/Development  
        // Day = Essence/Self
        // Hour = Expression/Outcome

        const path = {
            foundation: { number: numbers.year, ...hetuNumbers[numbers.year] },
            development: { number: numbers.month, ...hetuNumbers[numbers.month] },
            essence: { number: numbers.day, ...hetuNumbers[numbers.day] },
            expression: { number: numbers.hour, ...hetuNumbers[numbers.hour] }
        };

        // Determine path type based on element flow
        const elements = [path.foundation.element, path.development.element, 
                         path.essence.element, path.expression.element];
        
        let pathType = 'Variable';
        const uniqueElements = new Set(elements).size;
        
        if (uniqueElements === 1) pathType = 'Focused (单一)';
        else if (uniqueElements === 2) pathType = 'Dual (二元)';
        else if (uniqueElements === 4) pathType = 'Diverse (多元)';

        return { path, pathType, elements };
    }

    static getElementalGenerationFlow(chart, hetuNumbers, pillarNumbers) {
        // Analyze how elements generate/support each other in the chart
        const dayMaster = chart.day.stem.element;
        
        const flow = {
            dayMaster,
            supportedBy: [],
            supports: [],
            cycles: []
        };

        ['year', 'month', 'hour'].forEach(pillar => {
            const pElement = hetuNumbers[pillarNumbers[pillar]].element;
            
            if (FIVE_ELEMENTS[pElement]?.produces === dayMaster) {
                flow.supportedBy.push({ pillar, element: pElement });
            }
            if (FIVE_ELEMENTS[dayMaster]?.produces === pElement) {
                flow.supports.push({ pillar, element: pElement });
            }
        });

        return flow;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // LUOSHU (Lo Shu) Analysis
    // Magic square for overcoming/control cycle and Feng Shui applications
    // ═══════════════════════════════════════════════════════════════════════════════

    static getLuoshuAnalysis(chart) {
        // Lo Shu magic square (3x3)
        // 4 9 2
        // 3 5 7  
        // 8 1 6
        const luoshuSquare = [
            [4, 9, 2],
            [3, 5, 7],
            [8, 1, 6]
        ];

        // Element mapping for Lo Shu numbers
        const luoshuElements = {
            1: { element: 'Water', direction: 'North', trigram: 'Kan', color: '#1565C0' },
            2: { element: 'Earth', direction: 'SW', trigram: 'Kun', color: '#8D6E63' },
            3: { element: 'Wood', direction: 'East', trigram: 'Zhen', color: '#2E7D32' },
            4: { element: 'Wood', direction: 'SE', trigram: 'Xun', color: '#4CAF50' },
            5: { element: 'Earth', direction: 'Center', trigram: null, color: '#795548' },
            6: { element: 'Metal', direction: 'NW', trigram: 'Qian', color: '#FFB300' },
            7: { element: 'Metal', direction: 'West', trigram: 'Dui', color: '#FFC107' },
            8: { element: 'Earth', direction: 'NE', trigram: 'Gen', color: '#6D4C41' },
            9: { element: 'Fire', direction: 'South', trigram: 'Li', color: '#C62828' }
        };

        // Map pillars to Lo Shu numbers
        const getLuoshuNumber = (pillar) => {
            // Use branch primarily (earthly/manifested energy)
            const branchIdx = EARTHLY_BRANCHES.findIndex(b => b.zh === pillar.branch.zh);
            // Map 12 branches to 9 numbers
            const mapping = [1, 8, 3, 4, 9, 2, 7, 6, 1, 6, 7, 2]; // Water-Earth-Wood-Wood-Fire-Earth-Metal-Metal-Water...
            return mapping[branchIdx] || 5;
        };

        const yearNum = getLuoshuNumber(chart.year);
        const monthNum = getLuoshuNumber(chart.month);
        const dayNum = getLuoshuNumber(chart.day);
        const hourNum = getLuoshuNumber(chart.hour);

        const pillarNumbers = { year: yearNum, month: monthNum, day: dayNum, hour: hourNum };

        // Calculate palace positions
        const palacePositions = this.calculateLuoshuPalaces(pillarNumbers, luoshuElements);

        // Analyze control cycles (overcoming)
        const controlAnalysis = this.analyzeLuoshuControl(pillarNumbers, luoshuElements);

        // Calculate Ming Gua (Life Gua) based on year
        const mingGua = this.calculateMingGua(chart.year.branch);

        return {
            name: 'Luoshu',
            zhName: '洛書',
            description: 'Lo Shu - Magic square for manifested reality and Feng Shui',
            square: luoshuSquare,
            pillarNumbers,
            palacePositions,
            elements: {
                year: luoshuElements[yearNum],
                month: luoshuElements[monthNum],
                day: luoshuElements[dayNum],
                hour: luoshuElements[hourNum]
            },
            controlAnalysis,
            mingGua,
            fengshui: this.getLuoshuFengshui(pillarNumbers, luoshuElements, mingGua),
            directions: this.getLuoshuDirections(pillarNumbers, luoshuElements)
        };
    }

    static calculateLuoshuPalaces(numbers, luoshuElements) {
        // Map each pillar to its palace position in the 9-grid
        const positions = {};
        
        Object.entries(numbers).forEach(([pillar, num]) => {
            const info = luoshuElements[num];
            positions[pillar] = {
                number: num,
                palace: info.direction,
                element: info.element,
                trigram: info.trigram
            };
        });

        return positions;
    }

    static analyzeLuoshuControl(numbers, luoshuElements) {
        // Analyze overcoming/control cycles
        const controlCycles = [];
        const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
        const overcomes = { Wood: 'Earth', Fire: 'Metal', Earth: 'Water', Metal: 'Wood', Water: 'Fire' };

        const pillarElements = {
            year: luoshuElements[numbers.year].element,
            month: luoshuElements[numbers.month].element,
            day: luoshuElements[numbers.day].element,
            hour: luoshuElements[numbers.hour].element
        };

        const pairs = [['year', 'month'], ['month', 'day'], ['day', 'hour']];
        
        pairs.forEach(([from, to]) => {
            const fromEl = pillarElements[from];
            const toEl = pillarElements[to];
            
            if (overcomes[fromEl] === toEl) {
                controlCycles.push({
                    type: 'controls',
                    from: { pillar: from, element: fromEl },
                    to: { pillar: to, element: toEl },
                    effect: 'Restriction or discipline needed'
                });
            } else if (overcomes[toEl] === fromEl) {
                controlCycles.push({
                    type: 'controlled_by',
                    from: { pillar: from, element: fromEl },
                    to: { pillar: to, element: toEl },
                    effect: 'Support through challenge'
                });
            }
        });

        return { cycles: controlCycles, pillarElements };
    }

    static calculateMingGua(yearBranch) {
        // Calculate Gua number based on birth year
        // For men: (11 - (year % 9)) || 9
        // For women: (4 + (year % 9)) || 9
        // Simplified version using branch index
        const branchIdx = EARTHLY_BRANCHES.findIndex(b => b.zh === yearBranch.zh);
        const baseNum = (branchIdx % 9) + 1;
        
        return {
            number: baseNum,
            element: ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Metal', 'Metal', 'Earth', 'Fire'][baseNum - 1],
            trigram: ['Kan', 'Kun', 'Zhen', 'Xun', 'Center', 'Qian', 'Dui', 'Gen', 'Li'][baseNum - 1],
            favorableDirections: this.getFavorableDirections(baseNum)
        };
    }

    static getFavorableDirections(guaNumber) {
        const directions = {
            1: { shengQi: 'SE', tianYi: 'E', yanNian: 'S', fuWei: 'N' },
            2: { shengQi: 'NE', tianYi: 'W', yanNian: 'NW', fuWei: 'SW' },
            3: { shengQi: 'S', tianYi: 'N', yanNian: 'SE', fuWei: 'E' },
            4: { shengQi: 'N', tianYi: 'S', yanNian: 'E', fuWei: 'SE' },
            5: { shengQi: 'NE', tianYi: 'W', yanNian: 'NW', fuWei: 'SW' },
            6: { shengQi: 'W', tianYi: 'SW', yanNian: 'NE', fuWei: 'NW' },
            7: { shengQi: 'NW', tianYi: 'NE', yanNian: 'SW', fuWei: 'W' },
            8: { shengQi: 'SW', tianYi: 'NW', yanNian: 'W', fuWei: 'NE' },
            9: { shengQi: 'E', tianYi: 'SE', yanNian: 'N', fuWei: 'S' }
        };
        return directions[guaNumber] || directions[5];
    }

    static getLuoshuFengshui(numbers, luoshuElements, mingGua) {
        const dayPalace = luoshuElements[numbers.day];
        
        return {
            dayMasterPosition: {
                palace: dayPalace.direction,
                element: dayPalace.element,
                trigram: dayPalace.trigram
            },
            mingGuaPosition: mingGua,
            favorableSectors: mingGua.favorableDirections,
            annualAdvice: `Your day master resides in the ${dayPalace.direction} palace (${dayPalace.element} element). ` +
                         `Favor the ${mingGua.favorableDirections.shengQi} direction for new ventures.`
        };
    }

    static getLuoshuDirections(numbers, luoshuElements) {
        return {
            year: luoshuElements[numbers.year].direction,
            month: luoshuElements[numbers.month].direction,
            day: luoshuElements[numbers.day].direction,
            hour: luoshuElements[numbers.hour].direction,
            advice: this.getDirectionalAdvice(numbers, luoshuElements)
        };
    }

    static getDirectionalAdvice(numbers, luoshuElements) {
        const dayDir = luoshuElements[numbers.day].direction;
        const hourDir = luoshuElements[numbers.hour].direction;
        
        return {
            favorable: [dayDir, luoshuElements[numbers.month].direction],
            personal: dayDir,
            activity: hourDir,
            note: `Face ${dayDir} for meditation, ${hourDir} for active work.`
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // COMPREHENSIVE BAZI ANALYSIS
    // Combines all three systems: Xiantian, Hetu, and Luoshu
    // ═══════════════════════════════════════════════════════════════════════════════

    static getComprehensiveBaziAnalysis(date, time = "12:00") {
        const chart = this.getBaziChart(date, time);
        
        return {
            chart,
            xiantian: this.getXiantianAnalysis(chart),
            hetu: this.getHetuAnalysis(chart),
            luoshu: this.getLuoshuAnalysis(chart),
            synthesis: this.synthesizeBaziAnalysis(chart)
        };
    }

    static synthesizeBaziAnalysis(chart) {
        const xiantian = this.getXiantianAnalysis(chart);
        const hetu = this.getHetuAnalysis(chart);
        const luoshu = this.getLuoshuAnalysis(chart);

        // Synthesize findings from all three systems
        return {
            spiritualPath: {
                congenitalFocus: xiantian.congenitalNature.cultivationFocus,
                dominantTreasure: xiantian.threeTreasures.dominant,
                treasureInfo: xiantian.threeTreasures.dominantInfo
            },
            lifePath: {
                generationFlow: hetu.elementalGenerationFlow,
                pathType: hetu.lifePath.pathType,
                dominantElement: hetu.generationAnalysis.dominantElement
            },
            manifestedReality: {
                mingGua: luoshu.mingGua,
                fengshui: luoshu.fengshui,
                controlCycles: luoshu.controlAnalysis.cycles
            },
            recommendations: this.generateRecommendations(xiantian, hetu, luoshu)
        };
    }

    static generateRecommendations(xiantian, hetu, luoshu) {
        const recs = [];
        
        // Based on Xiantian
        recs.push(`Spiritual focus: ${xiantian.neidanGuidance.focus}`);
        recs.push(`Cultivation: ${xiantian.congenitalNature.cultivationFocus}`);
        
        // Based on Hetu
        recs.push(`Life path: ${hetu.lifePath.pathType} - embrace your elemental flow`);
        
        // Based on Luoshu
        const favDir = luoshu.mingGua.favorableDirections.shengQi;
        recs.push(`Feng Shui: Face ${favDir} for important activities`);
        
        return recs;
    }
}