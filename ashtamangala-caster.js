// Ashtamangala (Eight Auspicious Symbols) Caster
// Requires enhanced entropy collection with timing-based meditation periods

class AshtamangalaCaster {
    // Configuration for entropy collection
    static CONFIG = {
        // Initial wait period: 45-68 seconds
        initialWaitMin: 45000,
        initialWaitMax: 68000,
        // Second wave wait period: 63-75 seconds  
        secondWaveWaitMin: 63000,
        secondWaveWaitMax: 75000,
        // Minimum entropy required per beacon (512 bits = 64 bytes)
        minEntropyBits: 512,
        // Number of beacons for first wave
        firstWaveCount: 2,
        // Number of beacons for second wave
        secondWaveCount: 2,
        // Total beacons needed
        totalBeacons: 4
    };

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
        return Math.floor(Math.random() * range) + min;
    }

    // Wait for specified milliseconds
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Mix multiple entropy sources using XOR
    static mixEntropy(binaryStrings) {
        if (binaryStrings.length === 0) return '';
        if (binaryStrings.length === 1) return binaryStrings[0];
        
        const minLength = Math.min(...binaryStrings.map(s => s.length));
        let result = '';
        
        for (let i = 0; i < minLength; i++) {
            let xorResult = 0;
            for (const str of binaryStrings) {
                xorResult ^= parseInt(str[i], 10);
            }
            result += xorResult.toString();
        }
        
        return result;
    }

    // Mix entropy with local crypto seeds
    static async mixWithLocalSeeds(binaryString, numLocalSeeds = 2) {
        const localSeeds = [];
        
        // Generate local crypto seeds
        for (let i = 0; i < numLocalSeeds; i++) {
            const seed = new Uint8Array(64); // 512 bits
            crypto.getRandomValues(seed);
            const seedBinary = Array.from(seed)
                .map(byte => byte.toString(2).padStart(8, '0'))
                .join('');
            localSeeds.push(seedBinary);
        }
        
        // Mix all together
        return this.mixEntropy([binaryString, ...localSeeds]);
    }

    // Fetch entropy from RNG service
    static async fetchEntropy(mode = 'multiple', count = 2, specificSources) {
        const rngUrl = CONFIG.SHARED_RNG_URL || CONFIG.API_URL;
        const baseUrl = rngUrl.split('?')[0];
        
        let url = `${baseUrl}?mode=${mode}&count=${count}`;
        if (specificSources) {
            url += `&sources=${specificSources.join(',')}`;
        }
        
        console.log(`[AshtamangalaCaster] Fetching entropy: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Entropy fetch failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error?.message || "RNG service error");
        }
        
        // Log any warnings
        if (result.data?.warning) {
            console.warn('[AshtamangalaCaster] RNG Warning:', result.data.warning);
        }
        
        const binaryString = result.data?.binaryString;
        const totalBits = result.data?.totalBits || binaryString?.length || 0;
        
        if (!binaryString) {
            throw new Error("Invalid response: no binaryString");
        }
        
        // Verify minimum entropy
        if (totalBits < this.CONFIG.minEntropyBits) {
            console.warn(`[AshtamangalaCaster] Warning: Only ${totalBits} bits received (min ${this.CONFIG.minEntropyBits} recommended)`);
        }
        
        return {
            binaryString,
            totalBits,
            sources: result.data?.sources || [],
            qualityScore: result.data?.qualityScore,
            timestamp: result.data?.timestamp
        };
    }

    // Main casting method with two-wave entropy collection
    static async cast() {
        console.log('[AshtamangalaCaster] Starting Ashtamangala casting with enhanced entropy collection');
        
        const allEntropyStrings = [];
        const metadata = {
            waves: [],
            totalBits: 0,
            sourcesUsed: new Set()
        };
        
        // === FIRST WAVE ===
        // Wait random period: 45-68 seconds
        const firstWaitTime = await this.getSecureRandomInt(
            this.CONFIG.initialWaitMin,
            this.CONFIG.initialWaitMax
        );
        
        console.log(`[AshtamangalaCaster] First meditation period: ${(firstWaitTime / 1000).toFixed(1)}s`);
        
        // Emit event for UI to show meditation period
        this.emitStatus('meditation', {
            wave: 1,
            duration: firstWaitTime,
            message: 'First meditation period - collecting cosmic entropy'
        });
        
        await this.wait(firstWaitTime);
        
        // Fetch first 2 beacons (3 sources total including local mixing)
        console.log('[AshtamangalaCaster] Fetching first wave of beacons (2 sources)...');
        this.emitStatus('fetching', { wave: 1, count: this.CONFIG.firstWaveCount });
        
        const firstWave = await this.fetchEntropy('multiple', this.CONFIG.firstWaveCount);
        allEntropyStrings.push(firstWave.binaryString);
        metadata.waves.push({
            wave: 1,
            bits: firstWave.totalBits,
            sources: firstWave.sources,
            qualityScore: firstWave.qualityScore
        });
        metadata.totalBits += firstWave.totalBits;
        firstWave.sources.forEach(s => metadata.sourcesUsed.add(s));
        
        console.log(`[AshtamangalaCaster] First wave complete: ${firstWave.totalBits} bits from`, firstWave.sources);
        
        // === SECOND WAVE ===
        // Wait random period: 63-75 seconds
        const secondWaitTime = await this.getSecureRandomInt(
            this.CONFIG.secondWaveWaitMin,
            this.CONFIG.secondWaveWaitMax
        );
        
        console.log(`[AshtamangalaCaster] Second meditation period: ${(secondWaitTime / 1000).toFixed(1)}s`);
        
        this.emitStatus('meditation', {
            wave: 2,
            duration: secondWaitTime,
            message: 'Second meditation period - deepening cosmic connection'
        });
        
        await this.wait(secondWaitTime);
        
        // Fetch second 2 beacons
        console.log('[AshtamangalaCaster] Fetching second wave of beacons (2 sources)...');
        this.emitStatus('fetching', { wave: 2, count: this.CONFIG.secondWaveCount });
        
        const secondWave = await this.fetchEntropy('multiple', this.CONFIG.secondWaveCount);
        allEntropyStrings.push(secondWave.binaryString);
        metadata.waves.push({
            wave: 2,
            bits: secondWave.totalBits,
            sources: secondWave.sources,
            qualityScore: secondWave.qualityScore
        });
        metadata.totalBits += secondWave.totalBits;
        secondWave.sources.forEach(s => metadata.sourcesUsed.add(s));
        
        console.log(`[AshtamangalaCaster] Second wave complete: ${secondWave.totalBits} bits from`, secondWave.sources);
        
        // === MIX ALL ENTROPY ===
        console.log('[AshtamangalaCaster] Mixing all entropy sources...');
        this.emitStatus('mixing', { sources: allEntropyStrings.length + 2 }); // +2 for local seeds
        
        // First mix all beacon entropy
        const mixedBeaconEntropy = this.mixEntropy(allEntropyStrings);
        
        // Then mix with local crypto seeds
        const finalEntropy = await this.mixWithLocalSeeds(mixedBeaconEntropy, 2);
        
        console.log(`[AshtamangalaCaster] Final mixed entropy: ${finalEntropy.length} bits`);
        
        // === GENERATE ASHTAMANGALA RESULT ===
        // Ashtamangala uses 8 symbols, each can be in 3 states
        // We need enough entropy to determine the state of each symbol
        
        const symbols = this.generateSymbols(finalEntropy);
        
        const result = {
            symbols,
            entropy: finalEntropy,
            metadata: {
                ...metadata,
                sourcesUsed: Array.from(metadata.sourcesUsed),
                finalBits: finalEntropy.length,
                wavesCompleted: 2
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('[AshtamangalaCaster] Casting complete:', result);
        this.emitStatus('complete', result);
        
        return result;
    }

    // Generate 8 Ashtamangala symbols from entropy
    static generateSymbols(binaryString) {
        // Ashtamangala symbols and their meanings
        const symbolNames = [
            'parasol',      // Protection from harmful forces
            'goldenfish',   // Happiness and freedom
            'conch',        // Spreading teachings
            'lotus',        // Purity and spiritual unfoldment
            'vase',         // Inexhaustible treasures
            'knot',         // Eternal continuum of mind
            'victorybanner', // Victory over obstacles
            'wheel'         // Spiritual transformation
        ];
        
        // Consume ALL entropy by folding it down using XOR
        // Each symbol needs 2 bits for 3 states, so we need 16 bits total
        // We fold all available entropy into these 16 bits
        const entropyLength = binaryString.length;
        const foldedBits = new Array(16).fill(0);
        
        // XOR fold all entropy into 16 bits
        for (let i = 0; i < entropyLength; i++) {
            const bitValue = parseInt(binaryString[i], 10);
            const position = i % 16;
            foldedBits[position] ^= bitValue;
        }
        
        // Each symbol can be in 3 states: dormant (0), active (1), or transformative (2)
        // We use 2 bits per symbol to determine the state
        const symbols = [];
        
        for (let i = 0; i < 8; i++) {
            const highBit = foldedBits[i * 2];
            const lowBit = foldedBits[i * 2 + 1];
            const value = (highBit << 1) | lowBit;
            const bits = `${highBit}${lowBit}`;
            
            // Map 0-3 to 0-2 (transformative is rarer)
            let state;
            if (value === 0) state = 0; // dormant
            else if (value <= 2) state = 1; // active
            else state = 2; // transformative
            
            symbols.push({
                name: symbolNames[i],
                state,
                stateName: ['dormant', 'active', 'transformative'][state],
                bits,
                rawValue: value
            });
        }
        
        console.log(`[AshtamangalaCaster] Folded ${entropyLength} bits into 16 bits for 8 symbols`);
        
        return symbols;
    }

    // Event emitter for status updates (can be hooked into UI)
    static emitStatus(phase, data) {
        const event = new CustomEvent('ashtamangala-status', {
            detail: { phase, data, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
        console.log(`[AshtamangalaCaster] Status: ${phase}`, data);
    }

    // Quick cast method with reduced entropy (for testing)
    static async quickCast() {
        console.log('[AshtamangalaCaster] Quick cast (reduced entropy)');
        
        // Fetch from 2 sources without meditation delays
        const entropy = await this.fetchEntropy('multiple', 2);
        const mixedEntropy = await this.mixWithLocalSeeds(entropy.binaryString, 1);
        
        const symbols = this.generateSymbols(mixedEntropy);
        
        return {
            symbols,
            entropy: mixedEntropy,
            metadata: {
                totalBits: entropy.totalBits,
                sourcesUsed: entropy.sources,
                finalBits: mixedEntropy.length,
                quickCast: true
            },
            timestamp: new Date().toISOString()
        };
    }
}

// Expose to global scope
window.AshtamangalaCaster = AshtamangalaCaster;
