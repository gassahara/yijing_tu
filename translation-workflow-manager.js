/**
 * TranslationWorkflowManager - Orchestrates translation workflow with redaction verification
 * Handles section completion detection, translation triggering, and quality verification
 */
class TranslationWorkflowManager {
    static SECTION_STATES = new Map();
    static TRANSLATION_QUEUE = [];
    static isProcessing = false;
    static VERIFICATION_RULES = {
        technicalAnalysis: {
            requiredFields: ['structure', 'mechanism', 'relationships'],
            forbiddenPatterns: [
                /\bin simple terms\b/gi,
                /\bto put it simply\b/gi,
                /\bin other words\b/gi,
                /\bessentially\b/gi
            ],
            formattingRules: {
                mustHaveParagraphs: true,
                minParagraphLength: 50,
                maxParagraphLength: 500,
                requireStructuredHeadings: false
            }
        },
        colloquialAnalysis: {
            requiredFields: [],
            allowedPatterns: [
                /\bthis means\b/gi,
                /\bthink of it as\b/gi,
                /\blike when\b/gi,
                /\bimagine\b/gi
            ],
            formattingRules: {
                mustHaveParagraphs: true,
                minParagraphLength: 30,
                maxParagraphLength: 400,
                tone: 'conversational'
            }
        }
    };

    /**
     * Initialize workflow tracking for a reading
     */
    static initializeReading(readingId, interpretation) {
        this.SECTION_STATES.set(readingId, {
            id: readingId,
            sections: {
                celestial: { status: 'pending', content: null, verified: false },
                elements: { status: 'pending', content: null, verified: false },
                core: { status: 'pending', content: null, verified: false },
                lines: { status: 'pending', content: null, verified: false }
            },
            interpretation: interpretation,
            language: 'en',
            targetLanguages: [],
            lastUpdated: Date.now()
        });
        console.log(`[TranslationWorkflow] Initialized reading ${readingId}`);
    }

    /**
     * Mark a section as complete and trigger verification/translation workflow
     */
    static async markSectionComplete(readingId, sectionId, content) {
        const reading = this.SECTION_STATES.get(readingId);
        if (!reading) {
            console.warn(`[TranslationWorkflow] Reading ${readingId} not found`);
            return;
        }

        const section = reading.sections[sectionId];
        if (!section) {
            console.warn(`[TranslationWorkflow] Section ${sectionId} not found`);
            return;
        }

        // Update section status
        section.status = 'completed';
        section.content = content;
        section.completedAt = Date.now();

        console.log(`[TranslationWorkflow] Section ${sectionId} marked complete for reading ${readingId}`);

        // Trigger redaction verification
        const verificationResult = await this.verifySectionRedaction(sectionId, content);
        section.verified = verificationResult.valid;
        section.verificationIssues = verificationResult.issues;

        if (!verificationResult.valid) {
            console.warn(`[TranslationWorkflow] Section ${sectionId} failed verification:`, verificationResult.issues);
            section.status = 'needs_revision';
            return;
        }

        // Queue translation for target languages
        for (const targetLang of reading.targetLanguages) {
            this.queueTranslation(readingId, sectionId, targetLang);
        }

        // Process translation queue
        await this.processTranslationQueue();
    }

    /**
     * Verify section content for redaction issues
     */
    static async verifySectionRedaction(sectionId, content) {
        const issues = [];
        let valid = true;

        // Check for technical analysis sections
        if (sectionId === 'celestial' || sectionId === 'elements') {
            const technicalFields = ['celestialTechnical', 'elementsTechnical'];
            for (const field of technicalFields) {
                if (content[field]) {
                    const result = this.verifyTechnicalAnalysis(content[field]);
                    if (!result.valid) {
                        valid = false;
                        issues.push(...result.issues.map(i => `${field}: ${i}`));
                    }
                }
            }

            const colloquialFields = ['celestialColloquial', 'elementsColloquial', 'celestial', 'elements'];
            for (const field of colloquialFields) {
                if (content[field]) {
                    const result = this.verifyColloquialAnalysis(content[field]);
                    if (!result.valid) {
                        valid = false;
                        issues.push(...result.issues.map(i => `${field}: ${i}`));
                    }
                }
            }
        }

        // Check for core analysis
        if (sectionId === 'core') {
            if (content.analysis || content.coreTechnical) {
                const result = this.verifyTechnicalAnalysis(content.analysis || content.coreTechnical);
                if (!result.valid) {
                    valid = false;
                    issues.push(...result.issues.map(i => `analysis: ${i}`));
                }
            }

            if (content.advice || content.coreColloquial) {
                const result = this.verifyColloquialAnalysis(content.advice || content.coreColloquial);
                if (!result.valid) {
                    valid = false;
                    issues.push(...result.issues.map(i => `advice: ${i}`));
                }
            }
        }

        // Check for repetition across fields
        const repetitionResult = this.checkForRepetition(content);
        if (repetitionResult.hasRepetition) {
            valid = false;
            issues.push(`Repetition detected: ${repetitionResult.details}`);
        }

        // Check for code errors or irrelevant data
        const qualityResult = this.checkContentQuality(content);
        if (!qualityResult.valid) {
            valid = false;
            issues.push(...qualityResult.issues);
        }

        return { valid, issues };
    }

    /**
     * Verify technical analysis formatting
     */
    static verifyTechnicalAnalysis(text) {
        const rules = this.VERIFICATION_RULES.technicalAnalysis;
        const issues = [];

        if (!text || typeof text !== 'string') {
            return { valid: false, issues: ['Empty or invalid technical analysis'] };
        }

        // Check for forbidden patterns
        rules.forbiddenPatterns.forEach(pattern => {
            if (pattern.test(text)) {
                issues.push(`Contains colloquial phrase: "${pattern.source.replace(/\\b/g, '')}"`);
            }
        });

        // Check paragraph structure
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        if (rules.formattingRules.mustHaveParagraphs && paragraphs.length === 0) {
            issues.push('Technical analysis should have paragraph structure');
        }

        paragraphs.forEach((para, idx) => {
            const length = para.trim().length;
            if (length < rules.formattingRules.minParagraphLength) {
                issues.push(`Paragraph ${idx + 1} too short (${length} chars, min: ${rules.formattingRules.minParagraphLength})`);
            }
            if (length > rules.formattingRules.maxParagraphLength) {
                issues.push(`Paragraph ${idx + 1} too long (${length} chars, max: ${rules.formattingRules.maxParagraphLength})`);
            }
        });

        // Check for technical depth indicators
        const technicalIndicators = [
            /\b(wuxing|five elements|trigram|hexagram|stem|branch|qi|chi)\b/gi,
            /\b( yang | yin |yang\/yin)\b/gi,
            /\b(correspondence|transformation|mutation)\b/gi
        ];
        
        const hasTechnicalContent = technicalIndicators.some(pattern => pattern.test(text));
        if (!hasTechnicalContent) {
            issues.push('Technical analysis lacks Daoist technical terminology');
        }

        return { valid: issues.length === 0, issues };
    }

    /**
     * Verify colloquial analysis formatting
     */
    static verifyColloquialAnalysis(text) {
        const rules = this.VERIFICATION_RULES.colloquialAnalysis;
        const issues = [];

        if (!text || typeof text !== 'string') {
            return { valid: false, issues: ['Empty or invalid colloquial analysis'] };
        }

        // Check paragraph structure
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        if (rules.formattingRules.mustHaveParagraphs && paragraphs.length === 0) {
            issues.push('Colloquial analysis should have paragraph structure');
        }

        paragraphs.forEach((para, idx) => {
            const length = para.trim().length;
            if (length < rules.formattingRules.minParagraphLength) {
                issues.push(`Paragraph ${idx + 1} too short (${length} chars, min: ${rules.formattingRules.minParagraphLength})`);
            }
            if (length > rules.formattingRules.maxParagraphLength) {
                issues.push(`Paragraph ${idx + 1} too long (${length} chars, max: ${rules.formattingRules.maxParagraphLength})`);
            }
        });

        // Check for overly technical language
        const overlyTechnicalPatterns = [
            /\b(therefore|thus|hence|consequently)\b/gi,
            /\b(moreover|furthermore|additionally)\b/gi,
            /\b(it is evident that|it is clear that)\b/gi
        ];

        let technicalCount = 0;
        overlyTechnicalPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) technicalCount += matches.length;
        });

        if (technicalCount > 3) {
            issues.push('Colloquial analysis contains too many formal transitional phrases');
        }

        return { valid: issues.length === 0, issues };
    }

    /**
     * Check for repetition across different fields
     */
    static checkForRepetition(content) {
        const texts = [];
        const fieldNames = [];

        Object.entries(content).forEach(([key, value]) => {
            if (typeof value === 'string' && value.length > 50) {
                texts.push(value.toLowerCase());
                fieldNames.push(key);
            }
        });

        const similarities = [];
        for (let i = 0; i < texts.length; i++) {
            for (let j = i + 1; j < texts.length; j++) {
                const similarity = this.calculateSimilarity(texts[i], texts[j]);
                if (similarity > 0.7) {
                    similarities.push(`${fieldNames[i]} and ${fieldNames[j]} (${(similarity * 100).toFixed(1)}% similar)`);
                }
            }
        }

        return {
            hasRepetition: similarities.length > 0,
            details: similarities.join(', ')
        };
    }

    /**
     * Calculate text similarity using simple n-gram approach
     */
    static calculateSimilarity(text1, text2) {
        const getNGrams = (text, n = 3) => {
            const words = text.split(/\s+/).filter(w => w.length > 2);
            const ngrams = [];
            for (let i = 0; i <= words.length - n; i++) {
                ngrams.push(words.slice(i, i + n).join(' '));
            }
            return ngrams;
        };

        const grams1 = new Set(getNGrams(text1));
        const grams2 = new Set(getNGrams(text2));

        const intersection = new Set([...grams1].filter(x => grams2.has(x)));
        const union = new Set([...grams1, ...grams2]);

        return intersection.size / union.size;
    }

    /**
     * Check content for quality issues
     */
    static checkContentQuality(content) {
        const issues = [];

        Object.entries(content).forEach(([key, value]) => {
            if (typeof value !== 'string') return;

            // Check for code snippets
            if (/```[\s\S]*?```/.test(value) || /`[^`]+`/.test(value)) {
                issues.push(`${key} contains code blocks`);
            }

            // Check for JSON/XML data
            if (/\{[\s\S]*\}/.test(value) || /<[\w-]+>[\s\S]*<\/[\w-]+>/.test(value)) {
                issues.push(`${key} may contain structured data/code`);
            }

            // Check for URLs
            if (/https?:\/\/[^\s]+/.test(value)) {
                issues.push(`${key} contains URLs`);
            }

            // Check for excessive repetition of phrases
            const words = value.toLowerCase().split(/\s+/);
            const wordCounts = {};
            words.forEach(w => {
                wordCounts[w] = (wordCounts[w] || 0) + 1;
            });

            const repeatedWords = Object.entries(wordCounts)
                .filter(([word, count]) => count > 5 && word.length > 4)
                .map(([word]) => word);

            if (repeatedWords.length > 3) {
                issues.push(`${key} has repetitive vocabulary: ${repeatedWords.join(', ')}`);
            }
        });

        return { valid: issues.length === 0, issues };
    }

    /**
     * Queue a translation job
     */
    static queueTranslation(readingId, sectionId, targetLang) {
        const job = {
            id: `${readingId}_${sectionId}_${targetLang}_${Date.now()}`,
            readingId,
            sectionId,
            targetLang,
            priority: this.getSectionPriority(sectionId),
            queuedAt: Date.now(),
            attempts: 0
        };

        this.TRANSLATION_QUEUE.push(job);
        console.log(`[TranslationWorkflow] Queued translation: ${sectionId} -> ${targetLang}`);
    }

    /**
     * Get priority for section translation
     */
    static getSectionPriority(sectionId) {
        const priorities = {
            core: 1,
            celestial: 2,
            elements: 3,
            lines: 4
        };
        return priorities[sectionId] || 5;
    }

    /**
     * Process the translation queue
     */
    static async processTranslationQueue() {
        if (this.isProcessing || this.TRANSLATION_QUEUE.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log(`[TranslationWorkflow] Processing ${this.TRANSLATION_QUEUE.length} translation jobs`);

        // Sort by priority
        this.TRANSLATION_QUEUE.sort((a, b) => a.priority - b.priority);

        while (this.TRANSLATION_QUEUE.length > 0) {
            const job = this.TRANSLATION_QUEUE.shift();
            
            try {
                await this.executeTranslationJob(job);
                // Small delay between translations to avoid rate limiting
                await new Promise(r => setTimeout(r, 500));
            } catch (error) {
                console.error(`[TranslationWorkflow] Translation job failed:`, error);
                job.attempts++;
                if (job.attempts < 3) {
                    this.TRANSLATION_QUEUE.push(job);
                }
            }
        }

        this.isProcessing = false;
        console.log('[TranslationWorkflow] Translation queue processed');
    }

    /**
     * Execute a single translation job
     */
    static async executeTranslationJob(job) {
        const reading = this.SECTION_STATES.get(job.readingId);
        if (!reading) return;

        const section = reading.sections[job.sectionId];
        if (!section || !section.content) return;

        // Use existing TranslationService
        const hexagramName = reading.interpretation?.hexagramName || '';
        const result = await TranslationService.translateSection(
            job.readingId,
            job.sectionId,
            section.content,
            job.targetLang,
            hexagramName
        );

        // Apply translation to interpretation
        TranslationService.applyTranslationToInterpretation(
            reading.interpretation,
            job.sectionId,
            result,
            job.targetLang
        );

        // Trigger UI update
        if (typeof UI !== 'undefined' && UI.renderAIInterpretation) {
            UI.renderAIInterpretation(reading.interpretation, job.targetLang);
        }

        console.log(`[TranslationWorkflow] Translation complete: ${job.sectionId} -> ${job.targetLang}`);
    }

    /**
     * Set target languages for a reading
     */
    static setTargetLanguages(readingId, languages) {
        const reading = this.SECTION_STATES.get(readingId);
        if (reading) {
            reading.targetLanguages = languages.filter(l => l !== 'en');
            console.log(`[TranslationWorkflow] Set target languages for ${readingId}:`, reading.targetLanguages);
        }
    }

    /**
     * Get workflow status for a reading
     */
    static getWorkflowStatus(readingId) {
        const reading = this.SECTION_STATES.get(readingId);
        if (!reading) return null;

        return {
            readingId,
            sections: Object.entries(reading.sections).map(([id, section]) => ({
                id,
                status: section.status,
                verified: section.verified,
                issues: section.verificationIssues || []
            })),
            targetLanguages: reading.targetLanguages,
            pendingTranslations: this.TRANSLATION_QUEUE.filter(j => j.readingId === readingId).length
        };
    }

    /**
     * Clear workflow data for a reading
     */
    static clearReading(readingId) {
        this.SECTION_STATES.delete(readingId);
        this.TRANSLATION_QUEUE = this.TRANSLATION_QUEUE.filter(j => j.readingId !== readingId);
        console.log(`[TranslationWorkflow] Cleared reading ${readingId}`);
    }
}

// Expose to global scope
window.TranslationWorkflowManager = TranslationWorkflowManager;
