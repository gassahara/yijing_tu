/**
 * RAG Integration for Yijing Tu
 * Fetches relevant facts from shared-rag service to enrich interpretations
 * Reduces backend function time by pre-filtering relevant context
 */

class RAGIntegration {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || (window.CONFIG?.SHARED_RAG_URL || 'https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/shared-rag');
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Fetch relevant facts for a reading context
     * @param {Object} context - Reading context
     * @param {string} context.question - User's question
     * @param {Object} context.hex - Hexagram data
     * @param {string} context.tradition - 'daoist', 'vedic', or null for both
     * @returns {Promise<Object>} Relevant facts and context string
     */
    async fetchRelevantFacts(context) {
        const { question, hex, tradition = 'daoist' } = context;
        
        // Build search query from question + hexagram theme
        const searchQuery = this.buildSearchQuery(question, hex);
        
        // Check cache
        const cacheKey = `${searchQuery}_${tradition}_${hex?.number || 'general'}`;
        const cached = this.getCached(cacheKey);
        if (cached) {
            console.log('[RAG] Returning cached results');
            return cached;
        }

        try {
            // Fetch from shared-rag
            const response = await fetch(`${this.baseUrl}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: searchQuery,
                    tradition: tradition,
                    hexagram_number: hex?.number || null,
                    max_context_length: 3000,
                    include_sources: true,
                    expand_query: true
                })
            });

            if (!response.ok) {
                throw new Error(`RAG query failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error?.message || 'RAG query unsuccessful');
            }

            const data = result.data || { context: '', facts: [], sources: [] };
            
            // Cache results
            this.setCached(cacheKey, data);
            
            console.log(`[RAG] Fetched ${data.facts?.length || 0} relevant facts`);
            
            return data;
        } catch (error) {
            console.warn('[RAG] Failed to fetch facts:', error.message);
            // Return empty context on failure - fallback to local DB
            return { context: '', facts: [], sources: [] };
        }
    }

    /**
     * Build optimized search query from question and hexagram
     */
    buildSearchQuery(question, hex) {
        const keywords = [];
        
        // Add question keywords (remove common words)
        const questionWords = question
            .toLowerCase()
            .replace(/[?.,!]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3 && !this.isStopWord(w));
        keywords.push(...questionWords.slice(0, 5));
        
        // Add hexagram theme if available
        if (hex?.name) {
            keywords.push(hex.name.toLowerCase());
        }
        if (hex?.judgment) {
            const judgmentWords = hex.judgment
                .toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 4 && !this.isStopWord(w));
            keywords.push(...judgmentWords.slice(0, 3));
        }
        
        return [...new Set(keywords)].join(' ');
    }

    /**
     * Quick search for specific remedy types
     */
    async searchRemedies(query, options = {}) {
        const { element, trigram, limit = 5 } = options;
        
        try {
            const response = await fetch(`${this.baseUrl}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    tradition: 'daoist',
                    element: element,
                    trigram: trigram,
                    limit: limit,
                    expand_query: true
                })
            });

            if (!response.ok) return [];
            
            const result = await response.json();
            return result.data || [];
        } catch (error) {
            console.warn('[RAG] Search failed:', error.message);
            return [];
        }
    }

    /**
     * Enhance interpretation request with RAG context
     * Call this before sending to interpretation function
     */
    async enhanceInterpretationRequest(requestData) {
        const { question, hex, lang } = requestData;
        
        // Fetch relevant facts
        const ragData = await this.fetchRelevantFacts({
            question,
            hex,
            tradition: 'daoist'
        });
        
        // Add to request data
        return {
            ...requestData,
            ragContext: ragData.context,
            ragSources: ragData.sources,
            // Flag to tell backend to skip its own RAG lookup
            useProvidedContext: true
        };
    }

    /**
     * Get combined remedies from local DB + RAG
     */
    async getEnrichedRemedies(hexNumber, question) {
        // Get local remedies
        const localRemedies = this.getLocalRemedies(hexNumber);
        
        // Get RAG-enriched context
        const ragData = await this.searchRemedies(question, {
            element: this.getHexagramElement(hexNumber)
        });
        
        return {
            local: localRemedies,
            ragEnriched: ragData,
            combined: this.mergeRemedySources(localRemedies, ragData)
        };
    }

    // Helper: Get local remedies from DAOIST_REMEDIES_DB
    getLocalRemedies(hexNumber) {
        if (!window.DAOIST_REMEDIES_DB) return [];
        
        const db = window.DAOIST_REMEDIES_DB;
        const remedies = [];
        
        // Match by hexagram number
        if (db.fulu) {
            db.fulu.forEach(fulu => {
                if (fulu.hexagrams?.includes(hexNumber)) {
                    remedies.push({ type: 'fulu', ...fulu });
                }
            });
        }
        
        return remedies;
    }

    // Helper: Get element for hexagram
    getHexagramElement(hexNumber) {
        const elementMap = {
            1: 'metal', 2: 'earth', 3: 'water', 4: 'water',
            5: 'water', 6: 'metal', 7: 'water', 8: 'earth',
            9: 'fire', 10: 'metal', 11: 'earth', 12: 'earth',
            13: 'fire', 14: 'fire', 15: 'earth', 16: 'earth',
            17: 'metal', 18: 'wood', 19: 'earth', 20: 'wood',
            21: 'fire', 22: 'fire', 23: 'earth', 24: 'earth',
            25: 'metal', 26: 'metal', 27: 'wood', 28: 'wood',
            29: 'water', 30: 'fire', 31: 'wood', 32: 'wood',
            33: 'metal', 34: 'metal', 35: 'fire', 36: 'fire',
            37: 'fire', 38: 'fire', 39: 'water', 40: 'water',
            41: 'earth', 42: 'wood', 43: 'metal', 44: 'metal',
            45: 'earth', 46: 'wood', 47: 'water', 48: 'water',
            49: 'fire', 50: 'fire', 51: 'wood', 52: 'earth',
            53: 'wood', 54: 'wood', 55: 'fire', 56: 'fire',
            57: 'wood', 58: 'metal', 59: 'water', 60: 'water',
            61: 'metal', 62: 'metal', 63: 'water', 64: 'fire'
        };
        return elementMap[hexNumber] || null;
    }

    // Helper: Merge local and RAG remedies
    mergeRemedySources(local, ragData) {
        const merged = [...local];
        
        // Add RAG facts as additional context
        if (ragData?.length > 0) {
            const ragContext = ragData.map(f => ({
                type: 'rag_fact',
                title: f.title,
                content: f.content?.substring(0, 500),
                source: f.source_id,
                score: f.score
            }));
            
            merged.push(...ragContext);
        }
        
        return merged;
    }

    // Simple cache methods
    getCached(key) {
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.time < this.cacheTimeout) {
            return entry.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCached(key, data) {
        this.cache.set(key, { data, time: Date.now() });
    }

    isStopWord(word) {
        const stopWords = new Set([
            'what', 'will', 'happen', 'how', 'when', 'where', 'who', 'why',
            'the', 'and', 'for', 'with', 'from', 'that', 'this', 'these',
            'about', 'into', 'through', 'during', 'before', 'after'
        ]);
        return stopWords.has(word.toLowerCase());
    }

    // Health check
    async health() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.RAGIntegration = RAGIntegration;
    // Create singleton instance
    window.ragIntegration = new RAGIntegration();
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RAGIntegration;
}
