class IChingCaster {
    static async fetchHexagramData() {
        try {
            const cached = Storage.get('iChingData_v3');
            if (cached) {
                return Object.values(JSON.parse(cached).hexagrams || {});
            }

            const response = await fetch(CONFIG.DB_URL + `?v=${Date.now()}`);
            if (!response.ok) throw new Error("Failed to fetch");

            const data = await response.json();
            Storage.set('iChingData_v3', JSON.stringify(data));
            return Object.values(data.hexagrams || {});
        } catch (e) {
            console.error("Could not load hexagram data:", e);
            return [];
        }
    }

    static async castLines() {
        // Fetch from quantum/random API
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error("Casting failed");

        const { binaryString, timestamp } = await response.json();

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

        // Binary key is read from top to bottom (line 6 to line 1)
        const binaryKey = [...lines].reverse().map(l => l.binary).join('');

        return {
            lines,
            rawBits,
            binaryKey,
            timestamp
        };
    }

    static findHexagram(hexagrams, binaryKey) {
        const hex = hexagrams.find(h => h.binary === binaryKey);
        if (!hex) {
            console.error(`Hexagram not found for binary: ${binaryKey}`);
            // Return a fallback or throw
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