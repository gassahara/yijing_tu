class IChingCaster {
    static async fetchHexagramData() {
        try {
            const cached = Storage.get('iChingData_v5');
            if (cached) {
                return Object.values(JSON.parse(cached).hexagrams || {});
            }

            const response = await fetch(CONFIG.DB_URL + `?v=${Date.now()}`);
            if (!response.ok) throw new Error("Failed to fetch");

            const data = await response.json();
            Storage.set('iChingData_v5', JSON.stringify(data));
            return Object.values(data.hexagrams || {});
        } catch (e) {
            console.error("Could not load hexagram data:", e);
            return [];
        }
    }

    // Get secure random integer using Web Crypto API
    static async getSecureRandomInt(min, max) {
        const range = max - min + 1;
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            const maxValid = Math.floor(0x100000000 / range) * range;
            let randomValue = array[0];
            while (randomValue >= maxValid) {
                crypto.getRandomValues(array);
                randomValue = array[0];
            }
            return min + (randomValue % range);
        }
        // Fallback
        return Math.floor(Math.random() * range) + min;
    }

    // Mix multiple entropy sources using XOR
    static mixEntropy(binaryStrings) {
        if (binaryStrings.length === 0) return '';
        if (binaryStrings.length === 1) return binaryStrings[0];
        
        // Find minimum length
        const minLength = Math.min(...binaryStrings.map(s => s.length));
        let result = '';
        
        // XOR all bits together
        for (let i = 0; i < minLength; i++) {
            let xorResult = 0;
            for (const str of binaryStrings) {
                xorResult ^= parseInt(str[i], 10);
            }
            result += xorResult.toString();
        }
        
        return result;
    }

    static async castLines() {
        // Fetch from 2 sources with mode=multiple for enhanced entropy
        const rngUrl = CONFIG.SHARED_RNG_URL || CONFIG.API_URL;
        const baseUrl = rngUrl.split('?')[0]; // Remove any existing query params
        const fullUrl = `${baseUrl}?mode=multiple&count=2`;
        
        console.log('[IChingCaster] Fetching entropy from 2 sources:', fullUrl);
        
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error("Casting failed: " + response.statusText);

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error?.message || "RNG service returned error");
        }
        
        // Log warning if present
        if (result.data?.warning) {
            console.warn('[IChingCaster] RNG Warning:', result.data.warning);
        }
        
        // Handle multi-source response
        let binaryString;
        const sources = result.data?.sources || [];
        
        if (sources.length > 1 && result.data?.source === 'mixed') {
            // Multiple sources were mixed server-side
            binaryString = result.data.binaryString;
            console.log('[IChingCaster] Using server-mixed entropy from', sources.length, 'sources:', sources.join(', '));
        } else if (result.data?.entropy) {
            // Single source with hex format
            const hex = result.data.entropy;
            binaryString = hex.split('').map(h => parseInt(h, 16).toString(2).padStart(4, '0')).join('');
        } else {
            // Legacy format
            binaryString = result.data?.binaryString || result.binaryString;
        }
        
        const timestamp = result.data?.timestamp || result.timestamp;
        const totalBits = result.data?.totalBits || binaryString?.length || 0;
        
        if (!binaryString) {
            throw new Error("Invalid response: binaryString not found");
        }

        console.log('[IChingCaster] Received', totalBits, 'bits of entropy from', sources.join(', '));

        // Consume ALL available entropy for maximum randomness
        // We mix all entropy together using XOR folding to extract 18 bits
        const entropyLength = binaryString.length;
        
        // Fold all entropy down to 18 bits using XOR
        // This ensures every bit of entropy influences the final result
        const foldedBits = new Array(18).fill(0);
        
        for (let i = 0; i < entropyLength; i++) {
            const bitValue = parseInt(binaryString[i], 10);
            const position = i % 18;
            foldedBits[position] ^= bitValue;
        }
        
        const rawBits = foldedBits.map(b => b.toString());
        
        console.log('[IChingCaster] Folded', entropyLength, 'bits into 18 bits via XOR mixing');

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
            timestamp,
            entropyBits: totalBits,
            sources: sources,
            qualityScore: result.data?.qualityScore
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