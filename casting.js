class IChingCaster {
    static async fetchHexagramData() {
        try {
            const cached = Storage.get('iChingData_v4');
            if (cached) {
                return Object.values(JSON.parse(cached).hexagrams || {});
            }

            const response = await fetch(CONFIG.DB_URL + `?v=${Date.now()}`);
            if (!response.ok) throw new Error("Failed to fetch");

            const data = await response.json();
            Storage.set('iChingData_v4', JSON.stringify(data));
            return Object.values(data.hexagrams || {});
        } catch (e) {
            console.error("Could not load hexagram data:", e);
            return [];
        }
    }

    static async castLines() {
        // Fetch from quantum/random API (Supabase backend handles NIST/Drand to avoid CORS)
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error("Casting failed");

        const result = await response.json();
        
        // Handle new API response format (result.data.binaryString) or legacy format
        const binaryString = result.data?.binaryString || result.binaryString;
        const timestamp = result.data?.timestamp || result.timestamp;
        
        if (!binaryString) {
            throw new Error("Invalid response: binaryString not found");
        }

        // Generate 18 bits (6 lines × 3 coins)
        const rawBits = [];
        for (let i = 0; i < 18; i++) {
            const char = binaryString[i % binaryString.length];
            rawBits.push(char === '1' ? '1' : '0');
        }

        // Calculate lines (bottom to top)
        const lines = [];
        for (let i = 0; i < 6; i++) {
            const lineBits = rawBits.slice(i * 3, (i + 1) * 3);
            const sum = lineBits.reduce((acc, bit) => acc + (bit === '1' ? 3 : 2), 0);

            lines.push({
                value: sum,
                isYang: [7, 9].includes(sum),
                isChanging: [6, 9].includes(sum),
                binary: [7, 9].includes(sum) ? '1' : '0',
                bits: lineBits
            });
        }

        // Binary key bottom-to-top (line 1 to line 6) matching DB convention
        const binaryKey = lines.map(l => l.binary).join('');

        return {
            lines,
            rawBits,
            binaryKey,
            timestamp
        };
    }

    // Known corrections for hexagrams with wrong binary in the DB
    // Hex 61 (Inner Truth) is stored as 110011 (hex 28's binary) instead of 011110
    // Hex 60 (Limitation) is stored as 010011 (hex 47's binary) instead of 011010
    static DB_BINARY_FIXES = {
        '011110': 61,  // Wind over Lake = Inner Truth (中孚)
        '011010': 60   // Water over Lake = Limitation (節)
    };

    static findHexagram(hexagrams, binaryKey) {
        let hex = hexagrams.find(h => h.binary === binaryKey);

        // If not found, check if it's a known DB binary mismatch
        if (!hex && this.DB_BINARY_FIXES[binaryKey]) {
            const correctNumber = this.DB_BINARY_FIXES[binaryKey];
            hex = hexagrams.find(h => h.number === correctNumber);
            if (hex) {
                console.warn(`[findHexagram] Binary ${binaryKey} matched hex ${correctNumber} via DB correction (DB has wrong binary for this hexagram)`);
            }
        }

        // Final fallback: match by trigram decomposition (lower=0:3, upper=3:6)
        if (!hex) {
            const lowerTri = binaryKey.substring(0, 3);
            const upperTri = binaryKey.substring(3, 6);
            hex = hexagrams.find(h => {
                const hLower = h.binary?.substring(0, 3);
                const hUpper = h.binary?.substring(3, 6);
                // Check if any hexagram has matching trigrams (handles potential ordering issues)
                return (hLower === lowerTri && hUpper === upperTri) ||
                       (hLower === upperTri && hUpper === lowerTri);
            });
            if (hex) {
                console.warn(`[findHexagram] Binary ${binaryKey} matched hex ${hex.number} via trigram fallback`);
            }
        }

        if (!hex) {
            console.error(`Hexagram not found for binary: ${binaryKey}`);
            throw new Error(`Hexagram not found for binary: ${binaryKey}`);
        }
        return hex;
    }

    static analyzeEquilibrium(lines, upperTrigram, lowerTrigram) {
        const yangCount = lines.filter(l => l.isYang).length;
        const yinCount = 6 - yangCount;
        const movingCount = lines.filter(l => l.isChanging).length;

        let balanceState = '';
        if (yangCount === yinCount) balanceState = 'perfect';
        else if (yangCount > yinCount) balanceState = yangCount === 6 ? 'pureYang' : 'yangDominant';
        else balanceState = yinCount === 6 ? 'pureYin' : 'yinDominant';

        let stabilityState = '';
        if (movingCount === 0) stabilityState = 'stable';
        else if (movingCount === 6) stabilityState = 'totalChange';
        else if (movingCount <= 2) stabilityState = 'mostlyStable';
        else stabilityState = 'changing';

        // Calculate five elements distribution
        const elements = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
        [upperTrigram, lowerTrigram].forEach(tg => {
            if (tg && tg.element) {
                elements[tg.element] += 50;
            }
        });

        return {
            balanceState,
            stabilityState,
            yangCount,
            yinCount,
            movingCount,
            elements,
            upperTrigram,
            lowerTrigram
        };
    }
}