import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://vflkhntzwfovnuyccxow.supabase.co";
const HEXAGRAM_BUCKET_PATH = "/storage/v1/object/public/bucket/hexagrams.json";

// Cache for hexagram data loaded from bucket
let hexagramCache: any = null;
let currentAIProvider = 'GEMINI';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const VERBOSITY = 4;

function log(level: number, msg: string) {
    if (level <= VERBOSITY) {
        const tag = `[v${level}]`;
        console.log(`${tag} ${msg}`);
    }
}

function check(condition: boolean, message: string) {
    if (!condition) {
        log(4, `[FAIL] Check failed: ${message}`);
        throw new Error(`Check failed: ${message}`);
    }
    log(4, `[PASS] Check passed: ${message}`);
}

async function fetchWithRetries(url: string, opts: RequestInit = {}, attempts = 5, initialDelay = 400): Promise<Response> {
    let attempt = 0;
    while (attempt < attempts) {
        try {
            log(4, `Fetching (attempt ${attempt + 1}/${attempts}): ${url}`);
            const res = await fetch(url, opts);
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                const errMsg = `HTTP ${res.status} ${res.statusText} for ${url} ${text ? `- body: ${text.slice(0, 200)}` : ''}`;
                if (res.status >= 500 && attempt < attempts - 1) {
                    throw new Error(errMsg);
                } else if (res.status >= 400) {
                    throw new Error(errMsg);
                }
            }
            log(4, `[OK] Fetch success: ${url}`);
            return res;
        } catch (err) {
            attempt++;
            log(4, `Fetch error on attempt ${attempt} for ${url}: ${err.message}`);
            if (attempt >= attempts) {
                throw new Error(`Failed to fetch ${url} after ${attempts} attempts: ${err.message}`);
            }
            const delay = initialDelay * Math.pow(2, attempt - 1);
            log(4, `Waiting ${delay}ms before retry...`);
            await sleep(delay);
        }
    }
    throw new Error(`Unreachable fetchWithRetries loop end for ${url}`);
}

function verifyAndParseJSON(text: string, requiredKeys: string[]) {
    try {
        const cleanedText = text.replace(/```json\n?/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanedText);
        for (const key of requiredKeys) {
            if (!(key in parsed)) throw new Error(`Verification failed: Missing required key '${key}'.`);
        }
        return parsed;
    } catch (error) {
        throw new Error(`Failed to parse or verify API response: ${error.message}. Original text: ${text.slice(0, 500)}`);
    }
}

// Load hexagram data from Supabase bucket (cached)
async function getHexagramData(): Promise<any> {
    if (hexagramCache) {
        log(4, "Using cached hexagram data");
        return hexagramCache;
    }

    const bucketUrl = `${SUPABASE_URL}${HEXAGRAM_BUCKET_PATH}`;
    log(4, `[BUCKET LOADER] Loading hexagram data from: ${bucketUrl}`);

    const response = await fetchWithRetries(bucketUrl);
    hexagramCache = await response.json();

    check(hexagramCache && hexagramCache.hexagrams, "Hexagram data loaded from bucket");
    check(Object.keys(hexagramCache.hexagrams).length === 64, "All 64 hexagrams present in data");

    log(4, `[BUCKET LOADER] Successfully loaded ${Object.keys(hexagramCache.hexagrams).length} hexagrams (v${hexagramCache.version})`);
    return hexagramCache;
}

// Get hexagram by number - returns full data structure
async function getHexagram(hexagramNumber: number): Promise<any> {
    log(4, `[HEXAGRAM LOOKUP] Fetching hexagram #${hexagramNumber}`);

    if (hexagramNumber < 1 || hexagramNumber > 64) {
        throw new Error(`Invalid hexagram number: ${hexagramNumber}. Must be between 1-64`);
    }

    const data = await getHexagramData();
    const hexagram = data.hexagrams[hexagramNumber.toString()];

    if (!hexagram) {
        throw new Error(`Hexagram #${hexagramNumber} not found in data.`);
    }

    log(4, `[HEXAGRAM LOOKUP] Found: ${hexagram.name_zh} (${hexagram.name_en})`);
    return hexagram;
}

// Format hexagram data in the original API structure for backwards compatibility
function formatHexagramForAPI(hexagram: any): any {
    return {
        hexagram_number: hexagram.number,
        name_zh: hexagram.name_zh,
        sections: {
            gua_ci: hexagram.judgment_zh || "",
            yao_ci: hexagram.lines_zh || [],
            // These would need to be added to hexagrams.json for full compatibility
            tuan_zhuan: hexagram.tuan_zhuan || "",
            xiang_zhuan: hexagram.xiang_zhuan || { main: "", lines: [] },
            wenyan: hexagram.wenyan || ""
        },
        metadata: {
            source: "supabase_bucket",
            version: hexagramCache?.version || "1.0",
            retrieved_at: new Date().toISOString()
        }
    };
}

async function _callGeminiAPI(prompt: string, config: any) {
    await sleep(500);
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY environment variable not set");

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }]
            }
        ],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ],
        generationConfig: {
            temperature: config.temperature || 0.5,
            maxOutputTokens: config.maxOutputTokens,
            ...(config.response_mime_type && { response_mime_type: config.response_mime_type })
        }
    };

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }
    );

    if (!res.ok) throw new Error(`Gemini API HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.candidates || data.candidates.length === 0) throw new Error(`Gemini returned no candidates.`);
    return data.candidates[0].content.parts[0].text;
}

async function _callDeepSeekAPI(prompt: string, config: any) {
    await sleep(500);
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY environment variable not set");

    const payload = {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: config.systemPrompt || "You are a helpful assistant." },
            { role: "user", content: prompt }
        ],
        stream: false,
        max_tokens: config.maxOutputTokens
    };

    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`DeepSeek API HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
}

async function getInterpretation(prompt: string, maxOutputTokens: number, configOverrides: any = {}) {
    const config = { maxOutputTokens, ...configOverrides };
    log(4, `[getInterpretation] Calling AI provider (${currentAIProvider}) with prompt.`);

    if (currentAIProvider === 'DEEPSEEK') {
        return await _callDeepSeekAPI(prompt, config);
    }

    try {
        return await _callGeminiAPI(prompt, config);
    } catch (error) {
        if (error.message.includes("503")) {
            log(4, "[FAILOVER] Gemini 503 error detected. Switching to DeepSeek for this request.");
            currentAIProvider = 'DEEPSEEK';
            return await _callDeepSeekAPI(prompt, config);
        }
        throw error;
    }
}

async function getTranslation(hexagram: any, targetLanguage: string, attempts = 3) {
    // Map language to key prefix
    const langMap: { [key: string]: string } = {
        'english': 'en',
        'spanish': 'es',
        'italian': 'it',
        'en': 'en',
        'es': 'es',
        'it': 'it'
    };
    const langKey = langMap[targetLanguage.toLowerCase()] || targetLanguage.toLowerCase().slice(0, 2);

    // Check if translation already exists in the cached data
    const nameKey = `name_${langKey}`;
    const judgmentKey = `judgment_${langKey}`;
    const linesKey = `lines_${langKey}`;

    if (hexagram[nameKey] && hexagram[judgmentKey]) {
        log(4, `[TRANSLATION] Using pre-existing ${targetLanguage} translation for ${hexagram.name_zh}`);
        return {
            name_zh: hexagram[nameKey],
            judgment_zh: hexagram[judgmentKey],
            lines_zh: hexagram[linesKey] || []
        };
    }

    // Fall back to AI translation
    log(4, `[TRANSLATION] Generating ${targetLanguage} translation via AI for ${hexagram.name_zh}`);

    const translatableData = {
        name_zh: hexagram.name_zh,
        judgment_zh: hexagram.judgment_zh || "",
        lines_zh: hexagram.lines_zh || []
    };

    const prompt = `Translate the Chinese values in the following JSON object to ${targetLanguage}. Maintain the exact JSON structure. Your response must be ONLY the translated JSON object, with no surrounding text or markdown.
EXAMPLE (for English):
Input: { "name_zh": "乾", "judgment_zh": "元亨。利貞。", "lines_zh": ["初九：潛龍勿用。"] }
Output: { "name_zh": "The Creative", "judgment_zh": "Sublime success. Perseverance furthers.", "lines_zh": ["First line, nine: Hidden dragon. Do not act."] }
DATA TO TRANSLATE:
${JSON.stringify(translatableData, null, 2)}`;

    const config = {
        temperature: 0.2,
        systemPrompt: "You are a precise translation API. Your only output must be a valid JSON object.",
        response_mime_type: "application/json"
    };

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            log(4, `Translation attempt ${attempt}/${attempts} for ${hexagram.name_zh} to ${targetLanguage}...`);
            const rawResponse = await getInterpretation(prompt, 2048, config);
            return verifyAndParseJSON(rawResponse, ['name_zh', 'judgment_zh', 'lines_zh']);
        } catch (error) {
            log(4, `Translation attempt ${attempt} failed: ${error.message}`);
            if (attempt >= attempts) {
                throw new Error(`Failed to get a valid translation for "${hexagram.name_zh}" after ${attempts} attempts.`);
            }
            await sleep(500 * attempt);
        }
    }
    throw new Error(`Translation function for "${hexagram.name_zh}" failed definitively.`);
}

async function lookupAndSummarizeHexagrams(hexagramNumbers: number[]) {
    if (!hexagramNumbers || hexagramNumbers.length === 0) return "";

    const summaries = await Promise.all(hexagramNumbers.map(async (num) => {
        try {
            const hex = await getHexagram(num);
            return `Hexagram ${num} (${hex.name_zh} - ${hex.name_en}):
- Judgment (卦辞): ${hex.judgment_zh || "Not found."}
- English: ${hex.judgment_en || "Not found."}
- Upper Trigram: ${hex.trigrams?.upper_name || "Unknown"} (${hex.trigrams?.upper || ""})
- Lower Trigram: ${hex.trigrams?.lower_name || "Unknown"} (${hex.trigrams?.lower || ""})
`;
        } catch (error) {
            console.error(`Failed to lookup/summarize hexagram #${num}: ${error.message}`);
            return `Hexagram ${num}: (Could not be retrieved - ${error.message})\n`;
        }
    }));

    return summaries.join('\n');
}

async function getSynthesizedInterpretation(initialPrompt: string, inputParams: any) {
    log(4, `[SYNTHESIS_V2] Starting double-synthesis interpretation for inputs: ${JSON.stringify(inputParams)}`);
    log(4, `[SYNTHESIS_V2_PROMPT] Full initial prompt:\n---\n${initialPrompt}\n---`);

    const MAX_OUTPUT_LENGTH = 1200;
    const API_CALL_DELAY = 300;
    const successfulInterpretations: string[] = [];

    // Get 3 initial interpretations
    for (let i = 0; i < 3; i++) {
        try {
            log(4, `[SYNTHESIS_V2] Requesting initial interpretation pass ${i + 1}...`);
            const interpretation = await getInterpretation(initialPrompt, MAX_OUTPUT_LENGTH);
            if (interpretation) {
                successfulInterpretations.push(interpretation);
            }
            if (i < 2) {
                log(4, `[SYNTHESIS_V2] Waiting ${API_CALL_DELAY}ms before next API call.`);
                await sleep(API_CALL_DELAY);
            }
        } catch (error) {
            log(4, `[SYNTHESIS_V2] Initial interpretation pass ${i + 1} failed: ${error.message}`);
        }
    }

    if (successfulInterpretations.length === 0) {
        const errorReasons = successfulInterpretations.join('; ');
        throw new Error(`All interpretation passes failed. Reasons: [${errorReasons}]`);
    }

    if (successfulInterpretations.length === 1) {
        log(4, "[SYNTHESIS_V2] Only one interpretation succeeded. Returning it directly.");
        return successfulInterpretations[0];
    }

    // First synthesis pass
    const synthesisPrompt1 = `You are a master synthesizer of spiritual and philosophical texts. The following are several different interpretations of an I Ching reading. Your task is to combine them into a single, cohesive, and eloquent analysis.

**MEMORY/CONTEXT:**
Consider the following historical context from previous readings if available:
${inputParams.historyAnalysis || "No previous context provided."}

**YOUR PRIMARY GOAL:**
Weave these into a single narrative. It is critical that you DO NOT lose the context of the original I Ching hexagrams. Your synthesis must be firmly grounded in their meaning and respect any continuity from the provided HISTORY.

**INSTRUCTIONS:**
1.  **Identify and State the Subject:** Begin by stating the name(s) of the hexagram(s) being discussed (e.g., "The reading of Hexagram 13, Seeking Harmony, speaks to a time of...").
2.  **Connect the Trigrams:** Explain how the interaction of the upper and lower trigrams (e.g., "With Fire over Heaven...") creates the central theme of the hexagram.
3.  **Synthesize the Insights:** Combine the key ideas, themes, and advice from the interpretations below into a flowing, unified analysis. Do not simply list them.
4.  **Ground in Text:** Ensure your final analysis is clearly based on the meaning of the hexagrams and the commentaries provided in the source material.
5.  **Weave, Don't List:** Do not treat the interpretations as separate items. Weave their insights together into a unified narrative.
6.  **Ground the Analysis:** Explicitly reference the meaning of the hexagrams, their trigrams, and key phrases from the provided text to support your points.
7.  **Provide Practical Context:** Frame the reading as advice for daily life, inferring that the user has asked a question about a common life area like work, love, or personal growth.
8.  **Avoid Clichés:** Do not use generic or ambiguous statements. Provide specific, insightful advice.

**INTERPRETATIONS TO SYNTHESIZE:**
--- Interpretation 1 ---
${successfulInterpretations[0]}
--- Interpretation 2 ---
${successfulInterpretations[1]}
--- Interpretation 3 ---
${successfulInterpretations[2] || "Not available."}
---

Begin your synthesized analysis now:`;

    log(4, `[SYNTHESIS_V3] Synthesizing ${successfulInterpretations.length} interpretations (Pass 1).`);
    log(4, `[SYNTHESIS_V3_PROMPT_PASS_1] Full prompt for first synthesis:\n---\n${synthesisPrompt1}\n---`);

    const firstSynthesis = await getInterpretation(synthesisPrompt1, MAX_OUTPUT_LENGTH);

    // Second synthesis pass - distillation
    const synthesisPrompt2 = `You are a master editor and Daoist scholar. Your task is to distill the following I Ching analysis into its most essential and eloquent core message.

**YOUR PRIMARY GOAL:**
Refine this text into a powerful, focused interpretation. It is critical that you DO NOT lose the context of the original I Ching hexagrams. Your final text must be firmly grounded in their meaning.

**INSTRUCTIONS:**
1.  **Identify and State the Subject:** Begin by stating the name(s) of the hexagram(s) being discussed (e.g., "The reading of Hexagram 13, Seeking Harmony, speaks to a time of...").
2.  **Connect the Trigrams:** Explain how the interaction of the upper and lower trigrams (e.g., "With Fire over Heaven...") creates the central theme of the hexagram.
3.  **Synthesize the Insights:** Combine the key ideas, themes, and advice from the interpretations below into a flowing, unified analysis. Do not simply list them.
4.  **Ground in Text:** Ensure your final analysis is clearly based on the meaning of the hexagrams and the commentaries provided in the source material.
5.  **Identify the Core Theme:** What is the single most important principle or lesson in this text?
6.  **Focus on Action:** Extract the most critical actionable advice. What should the user *do*?
7.  **Eliminate Fluff:** Remove any repetitive phrases or introductory remarks.
8.  **Add Profound Wisdom:** Conclude the interpretation with a relevant and currently used Chinese proverb (e.g., a 'chengyu') that encapsulates the core message.
9.  **Maintain the Tone:** The result should be concise, powerful, and wise.

**TEXT TO DISTILL:**
---
${firstSynthesis}
---

Distill this text into its core message now:`;

    log(4, `[SYNTHESIS_V3] Distilling the first synthesis into a final summary (Pass 2).`);
    log(4, `[SYNTHESIS_V3_PROMPT_PASS_2] Full prompt for second synthesis:\n---\n${synthesisPrompt2}\n---`);

    const finalInterpretation = await getInterpretation(synthesisPrompt2, MAX_OUTPUT_LENGTH);

    log(4, `[SYNTHESIS_V3] Double synthesis complete.`);
    return finalInterpretation;
}

// NEW: Full interpretation endpoint for client-side readings
// This moves all DeepSeek interactions server-side
interface InterpretationRequest {
    question: string;
    hexagram: {
        number: number;
        name_en: string;
        name_zh: string;
        name_es?: string;
        name_it?: string;
    };
    lines: Array<{
        isYang: boolean;
        isChanging: boolean;
        bits: string[];
    }>;
    binaryKey: string;
    mansion?: {
        num: number;
        name_en: string;
        name_zh: string;
        name_es?: string;
        name_it?: string;
        group: string;
        group_zh: string;
        group_es?: string;
        group_it?: string;
        element: string;
        animal: string;
        degrees: number;
        symbol: string;
    };
    lifePalace?: {
        lifeNum: number;
        bodyNum: number;
        hourPillar?: string;
    };
    equilibrium?: {
        yangCount: number;
        yinCount: number;
        balanceState: string;
        stabilityState: string;
        movingCount: number;
        elements: { [key: string]: number };
    };
    historyAnalysis?: string;
    askAgainSource?: string | null;
    lang?: string;
}

function getLinePositionName(position: number): string {
    const names: { [key: number]: string } = {
        1: "Beginning (Bottom) - Foundation",
        2: "Second - Development",
        3: "Third - Challenge/Crisis",
        4: "Fourth - Transition",
        5: "Fifth - Ruler/Peak",
        6: "Top (Summit) - Culmination/Excess"
    };
    return names[position] || `Position ${position}`;
}

function getLinePositionMeaning(position: number, isYang: boolean, isChanging: boolean): string {
    const meanings: { [key: number]: string } = {
        1: "The foundation, the beginning, what is emerging from below. Represents the root of the matter.",
        2: "Development and growth. The line of the 'official' - steady progress, building on foundations.",
        3: "The critical point, the doorway. Often indicates difficulty or danger before breakthrough.",
        4: "Transition, entering the upper trigram. Moving from inner to outer, from preparation to action.",
        5: "The ruler's position, the peak of influence. Where wisdom and authority meet. Most auspicious position.",
        6: "The summit, culmination, or excess. What has reached its extreme may transform. Beware of going too far."
    };
    
    let meaning = meanings[position] || "";
    
    if (isChanging) {
        meaning += " This line is MOVING, indicating active transformation in this aspect of the situation.";
    }
    
    return meaning;
}

async function buildInterpretationPrompt(request: InterpretationRequest): Promise<{ systemPrompt: string; userPrompt: string }> {
    const { question, hexagram, lines, binaryKey, mansion, lifePalace, equilibrium, historyAnalysis, askAgainSource } = request;
    
    // Build line analysis
    let lineAnalysis = "\n=== LINE ANALYSIS ===\n";
    lineAnalysis += "The hexagram consists of 6 lines, cast from bottom (Line 1) to top (Line 6).\n";
    lineAnalysis += "Each line is either Yin (broken, receptive) or Yang (solid, active).\n";
    lineAnalysis += "Moving lines (changing) indicate dynamic energies in transition.\n\n";
    
    const changingLines: number[] = [];
    lines.forEach((line, i) => {
        const type = line.isYang ? 'Yang' : 'Yin';
        const status = line.isChanging ? 'MOVING (Changing)' : 'Static';
        const position = i + 1;
        const meaning = getLinePositionMeaning(position, line.isYang, line.isChanging);
        lineAnalysis += `Line ${position} (Position: ${getLinePositionName(position)}): ${type} - ${status}\n`;
        lineAnalysis += `  Position meaning: ${meaning}\n`;
        if (line.isChanging) {
            changingLines.push(position);
        }
    });
    
    if (changingLines.length > 0) {
        lineAnalysis += `\nMOVING LINES DETECTED: ${changingLines.join(', ')}\n`;
        lineAnalysis += `These lines transform this hexagram into a future/potential state.\n`;
    }
    
    // Build astro context
    let astroContext = "\n=== CELESTIAL/ASTROLOGICAL CONTEXT ===\n";
    
    if (mansion) {
        astroContext += `\n--- LUNAR MANSION ANALYSIS ---\n`;
        astroContext += `The 28 Lunar Mansions (二十八宿) are an ancient Chinese astronomical system dividing the ecliptic into 28 segments.\n`;
        astroContext += `Each mansion has specific characteristics that influence divination.\n\n`;
        astroContext += `CURRENT MANSION PARAMETERS:\n`;
        astroContext += `  Name: ${mansion.name_en} (${mansion.name_zh})\n`;
        astroContext += `  Number: ${mansion.num}/28 in the sequence\n`;
        astroContext += `  Celestial Group: ${mansion.group} (${mansion.group_zh})\n`;
        astroContext += `  Element: ${mansion.element} (influences energy quality)\n`;
        astroContext += `  Animal Spirit: ${mansion.animal} (symbolic representation)\n`;
        astroContext += `  Degrees: ${mansion.degrees}° (celestial span)\n`;
        astroContext += `  Symbol: ${mansion.symbol}\n\n`;
        astroContext += `LUNAR MANSION INTERPRETATION INSTRUCTIONS:\n`;
        astroContext += `  1. Describe the symbolic meaning of the ${mansion.name_en} mansion\n`;
        astroContext += `  2. Explain how ${mansion.group} energy manifests in this context\n`;
        astroContext += `  3. Analyze the ${mansion.element} element influence on the question\n`;
        astroContext += `  4. Connect the ${mansion.animal} symbolism to the seeker's situation\n`;
        astroContext += `  5. Provide specific guidance based on this mansion's traditional associations\n`;
    }
    
    if (lifePalace) {
        const earthlyBranches = ["Zi", "Chou", "Yin", "Mao", "Chen", "Si", "Wu", "Wei", "Shen", "You", "Xu", "Hai"];
        const lifeBranch = earthlyBranches[lifePalace.lifeNum - 1];
        const bodyBranch = earthlyBranches[lifePalace.bodyNum - 1];
        astroContext += `\n--- LIFE PALACE ANALYSIS (Zi Wei Dou Shu) ---\n`;
        astroContext += `Zi Wei Dou Shu (Purple Star Astrology) provides insights based on birth time.\n\n`;
        astroContext += `LIFE PALACE PARAMETERS:\n`;
        astroContext += `  Life Palace (命宫): ${lifeBranch} - represents destiny, personality, life path\n`;
        astroContext += `  Body Palace (身宫): ${bodyBranch} - represents physical constitution, later life\n`;
        if (lifePalace.hourPillar) {
            astroContext += `  Hour Pillar (时柱): ${lifePalace.hourPillar} - current temporal influence\n`;
        }
        astroContext += `\nLIFE PALACE INTERPRETATION INSTRUCTIONS:\n`;
        astroContext += `  1. Explain the significance of ${lifeBranch} as Life Palace\n`;
        astroContext += `  2. Describe how Life Palace energy affects the current question\n`;
        astroContext += `  3. Connect Body Palace ${bodyBranch} to physical/practical aspects\n`;
        astroContext += `  4. Provide guidance based on the palace positions\n`;
    }
    
    // Build Five Elements context
    let elementsContext = "";
    if (equilibrium) {
        elementsContext = `\n=== FIVE ELEMENTS (WU XING) ANALYSIS ===\n`;
        elementsContext += `The Five Elements (Wood, Fire, Earth, Metal, Water) represent fundamental energies.\n`;
        elementsContext += `Their balance and interaction patterns reveal the situation's dynamics.\n\n`;
        elementsContext += `FIVE ELEMENTS PARAMETERS:\n`;
        elementsContext += `  Yin-Yang Distribution: ${equilibrium.yangCount} Yang, ${equilibrium.yinCount} Yin\n`;
        elementsContext += `  Balance State: ${equilibrium.balanceState}\n`;
        elementsContext += `  Stability: ${equilibrium.stabilityState} (${equilibrium.movingCount} moving lines)\n`;
        elementsContext += `\nElement Distribution:\n`;
        Object.entries(equilibrium.elements).forEach(([el, val]) => {
            elementsContext += `  ${el}: ${val}%\n`;
        });
        elementsContext += `\nFIVE ELEMENTS INTERPRETATION INSTRUCTIONS:\n`;
        elementsContext += `  1. Analyze the elemental composition of this hexagram\n`;
        elementsContext += `  2. Explain elemental relationships (generating, controlling cycles)\n`;
        elementsContext += `  3. Describe how the Yin-Yang balance affects the situation\n`;
        elementsContext += `  4. Identify which elements are strong/weak and their implications\n`;
        elementsContext += `  5. Provide specific advice based on Five Element dynamics\n`;
    }
    
    const systemPrompt = `You are an advanced I Ching (Yi Jing) oracle interpreter with expertise in Chinese astrology, Five Elements theory, and classical divination.

CORE PRINCIPLE: Every section of your response must directly address the user's specific question. Do not give generic readings - always connect the hexagram wisdom to the QUESTION asked.

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no explanations outside the JSON.

Format:
{
  "en": {"celestial": "text", "elements": "text", "analysis": "text", "advice": "text", "symbolism": "text", "movingLines": "text", "judgment": "text", "image": "text", "lines": ["l1","l2","l3","l4","l5","l6"]},
  "es": {"celestial": "text", "elements": "text", "analysis": "text", "advice": "text", "symbolism": "text", "movingLines": "text", "judgment": "text", "image": "text", "lines": ["l1","l2","l3","l4","l5","l6"]},
  "it": {"celestial": "text", "elements": "text", "analysis": "text", "advice": "text", "symbolism": "text", "movingLines": "text", "judgment": "text", "image": "text", "lines": ["l1","l2","l3","l4","l5","l6"]},
  "zh": {"celestial": "text", "elements": "text", "analysis": "text", "advice": "text", "symbolism": "text", "movingLines": "text", "judgment": "text", "image": "text", "lines": ["l1","l2","l3","l4","l5","l6"]}
}

SECTION GUIDELINES (all must reference the QUESTION):
- celestial: Detailed lunar mansion analysis + Life Palace interpretation if available. Connect astrology to the question.
- elements: Comprehensive Five Elements analysis. Explain elemental dynamics and their effect on the situation.
- analysis: Core hexagram meaning interpreted specifically for this exact question. Go beyond generic meanings.
- advice: Practical, actionable guidance that directly addresses the question. Be specific, not vague.
- symbolism: Symbolic meanings relevant to the question's context. Include trigram, animal, and celestial symbols.
- movingLines: Deep interpretation of changing lines specifically for this question. Address line positions and their meanings.
- judgment: Hexagram judgment text translation (if missing from database). Keep faithful to classical meaning.
- image: Xiang (Image) text translation (if missing from database). Preserve poetic quality.
- lines: Array of 6 line commentaries, each specific to the question and position. Line 1 = bottom, Line 6 = top.

All text fields must be strings. "lines" must be an array of exactly 6 strings.`;

    const userPrompt = `================================================================================
                              I CHING DIVINATION REQUEST
================================================================================

>>> CURRENT QUESTION (THIS IS THE FOCUS OF ALL ANALYSIS):
"${question}"

CRITICAL INSTRUCTION: Every section of your response must specifically address 
this question. Do not provide generic I Ching readings. All interpretations 
must illuminate THIS SPECIFIC QUESTION.

${historyAnalysis || ""}

================================================================================
                              CURRENT READING
================================================================================

>>> HEXAGRAM CAST:
Number: ${hexagram.number}
Name: ${hexagram.name_en} (${hexagram.name_zh || ''})
Binary: ${binaryKey}

${lineAnalysis}

${astroContext}

${elementsContext}

>>> MISSING TRANSLATIONS (please provide these):
None - translations handled by client.

================================================================================
                           SECTION-SPECIFIC INSTRUCTIONS
================================================================================

1. CELESTIAL SECTION:
   - Provide detailed lunar mansion analysis based on the parameters above
   - Explain the mansion's symbolic meaning and relevance to the question
   - Connect the celestial group and element to the situation
   - Include Life Palace interpretation if birth time was provided
   - Make every insight specific to: "${question}"

2. ELEMENTS SECTION:
   - Analyze the Five Elements composition
   - Explain elemental relationships (generating, controlling cycles)
   - Connect Yin-Yang balance to the question
   - Describe stability/mutation dynamics
   - Provide practical elemental recommendations

3. ANALYSIS SECTION:
   - Core hexagram meaning for: "${question}"
   - Go beyond generic meanings - be specific and contextual
   - Address the querent's underlying concerns
   - Explain the "why" and "how" of the situation

4. ADVICE SECTION:
   - Actionable, practical guidance
   - Specific steps the querent can take
   - Timing recommendations if relevant
   - What to embrace vs. what to avoid

5. SYMBOLISM SECTION:
   - Trigram symbolism (upper and lower)
   - Animal symbols (${mansion?.animal || 'N/A'} from lunar mansion)
   - Celestial symbolism
   - Color/directional associations
   - How these symbols relate to the question

6. MOVING LINES SECTION:
   - Detailed interpretation of lines: ${changingLines.length > 0 ? changingLines.join(', ') : 'None (static hexagram)'}
   - Each moving line's specific message for this question
   - How lines transform the hexagram
   - Temporal sequencing (which changes happen first)

7. CLASSICAL TEXTS (judgment, image, lines):
   - Provide translations for ALL 4 languages (en, es, it, zh)
   - Preserve classical meaning while making it accessible
   - Connect classical wisdom to modern context

${askAgainSource ? `
>>> ADDITIONAL INSTRUCTION - ASK AGAIN CONTEXT:
This reading was invoked via "Ask Again" from a previous reading.
The historical document marked [ASK_AGAIN_SOURCE_DOCUMENT] is the direct 
predecessor to this reading. Consider the continuity between these readings 
and how the current hexagram relates to the previous one.
` : ''}

================================================================================
                              RESPONSE FORMAT
================================================================================

Respond with a SINGLE valid JSON object containing all 4 language keys.
Each language must have all 9 sections (celestial, elements, analysis, advice, 
symbolism, movingLines, judgment, image, lines).

All content must specifically address: "${question}"

================================================================================`;

    return { systemPrompt, userPrompt };
}

function parseInterpretationResponse(content: string): any {
    try {
        // Try to extract JSON from code block first
        let jsonStr: string | null = null;
        const codeBlockMatch = content.match(/```json\s*([\s\S]*?)(?:```|$)/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim();
        } else {
            // Find JSON by looking for the outermost braces
            const startIdx = content.indexOf('{');
            const endIdx = content.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                jsonStr = content.substring(startIdx, endIdx + 1);
            }
        }
        
        if (!jsonStr) jsonStr = content.trim();
        
        // Check if JSON appears truncated (unclosed braces)
        const openBraces = (jsonStr.match(/\{/g) || []).length;
        const closeBraces = (jsonStr.match(/\}/g) || []).length;
        const openBrackets = (jsonStr.match(/\[/g) || []).length;
        const closeBrackets = (jsonStr.match(/\]/g) || []).length;
        
        // Add missing closing braces/brackets
        while (closeBraces < openBraces) {
            jsonStr += '}';
        }
        while (closeBrackets < openBrackets) {
            jsonStr += ']';
        }
        
        // Clean up common JSON issues but preserve structure
        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
        
        const result = JSON.parse(jsonStr);

        // FIX: Ensure all language keys exist with fallback
        if (!result.en) result.en = result;
        ['en', 'es', 'it', 'zh'].forEach((lang: string) => {
            if (!result[lang]) result[lang] = result.en || {};
        });

        // FIX: Ensure all section values are strings (not objects), except lines which is an array
        ['en', 'es', 'it', 'zh'].forEach((lang: string) => {
            if (result[lang]) {
                // Stringify all text fields
                ['celestial', 'elements', 'analysis', 'advice', 'symbolism', 'movingLines', 'judgment', 'image'].forEach((key: string) => {
                    if (result[lang][key] && typeof result[lang][key] === 'object') {
                        result[lang][key] = JSON.stringify(result[lang][key]);
                    }
                    if (!result[lang][key]) result[lang][key] = "";
                });
                // Handle lines array separately - must be array of strings
                if (!result[lang].lines) {
                    result[lang].lines = [];
                } else if (typeof result[lang].lines === 'string') {
                    try {
                        const parsed = JSON.parse(result[lang].lines);
                        result[lang].lines = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        result[lang].lines = [];
                    }
                } else if (!Array.isArray(result[lang].lines)) {
                    result[lang].lines = [];
                }
                // Ensure each line is a string
                result[lang].lines = result[lang].lines.map((l: any) => String(l || ''));
            }
        });
        
        return result;
    } catch (e) {
        log(4, `JSON parse error: ${e.message}`);
        // Create fallback structure
        const emptyLines = ["", "", "", "", "" ,""];
        const truncatedContent = content.replace(/```json\s*|\s*```/g, '').substring(0, 500);
        return {
            en: { celestial: "", elements: "", analysis: truncatedContent, advice: "", symbolism: "", movingLines: "", judgment: "", image: "", lines: emptyLines },
            es: { celestial: "", elements: "", analysis: "Ver análisis en inglés", advice: "", symbolism: "", movingLines: "", judgment: "", image: "", lines: emptyLines },
            it: { celestial: "", elements: "", analysis: "Vedi analisi in inglese", advice: "", symbolism: "", movingLines: "", judgment: "", image: "", lines: emptyLines },
            zh: { celestial: "", elements: "", analysis: "见英文分析", advice: "", symbolism: "", movingLines: "", judgment: "", image: "", lines: emptyLines }
        };
    }
}

// Lightweight interpretation - single language, single pass
// Uses less memory and completes faster
async function getSimpleInterpretation(request: InterpretationRequest): Promise<any> {
    log(4, `[INTERPRET_SIMPLE] Hexagram ${request.hexagram.number}, question: "${request.question.substring(0, 40)}..."`);
    
    const { hexagram, question, lines, mansion, equilibrium, historyAnalysis } = request;
    
    // Count moving lines
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);
    
    // Compact prompt - essential info only
    const systemPrompt = `You are an I Ching oracle. Respond with ONLY valid JSON.
MEMORY/CONTEXT: Consider the following historical readings if available:
${historyAnalysis || "No previous context."}

Format:
{
  "celestial": "lunar mansion analysis (2-3 sentences)",
  "elements": "five elements analysis (2-3 sentences)",
  "analysis": "core hexagram meaning for the question (3-4 sentences)",
  "advice": "practical actionable guidance (2-3 sentences)",
  "symbolism": "key symbols and their meanings (2-3 sentences)",
  "movingLines": "interpretation of changing lines or 'No moving lines'",
  "judgment": "hexagram judgment translation",
  "image": "xiang text translation",
  "lines": ["line1 commentary", "line2", "line3", "line4", "line5", "line6"]
}
All fields must be strings. Lines array must have exactly 6 strings.`;

    const userPrompt = `QUESTION: "${question}"

HEXAGRAM: ${hexagram.number} - ${hexagram.name_en} (${hexagram.name_zh})
LINES (bottom to top): ${lines.map(l => l.isYang ? (l.isChanging ? '9' : '7') : (l.isChanging ? '6' : '8')).join('-')}
MOVING LINES: ${changingLines.length > 0 ? changingLines.join(', ') : 'None'}

${mansion ? `LUNAR MANSION: ${mansion.name_en} (${mansion.group}, ${mansion.element})` : ''}
${equilibrium ? `BALANCE: ${equilibrium.yangCount}Y/${equilibrium.yinCount}Y, ${equilibrium.movingCount} moving` : ''}

Provide a complete I Ching interpretation addressing the question.`;

    log(4, `[INTERPRET_SIMPLE] Calling API...`);
    const config = {
        maxOutputTokens: 2000, // Reduced from 4000 to save memory
        systemPrompt: systemPrompt
    };
    
    const rawResponse = await _callDeepSeekAPI(userPrompt, config);
    
    log(4, `[INTERPRET_SIMPLE] Parsing...`);
    const result = parseInterpretationResponse(rawResponse);
    
    log(4, `[INTERPRET_SIMPLE] Done.`);
    return result;
}

// Multi-language interpretation - calls API 4 times in sequence
// More reliable than single large call that exceeds memory
async function getMultiLanguageInterpretation(request: InterpretationRequest): Promise<any> {
    log(4, `[INTERpret_MULTI] Starting sequential multi-language interpretation...`);
    
    const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'it', name: 'Italian' },
        { code: 'zh', name: 'Chinese' }
    ];
    
    const result: any = {};
    
    for (const lang of languages) {
        try {
            log(4, `[INTERpret_MULTI] Getting ${lang.name}...`);
            const langResult = await getLanguageSpecificInterpretation(request, lang.code, lang.name);
            result[lang.code] = langResult;
            
            // Small delay between calls to avoid rate limits
            if (lang.code !== 'zh') await sleep(200);
        } catch (error) {
            log(4, `[INTERpret_MULTI] ${lang.name} failed: ${error.message}`);
            // Use English as fallback
            result[lang.code] = result.en || createEmptyInterpretation();
        }
    }
    
    log(4, `[INTERpret_MULTI] All languages complete.`);
    return result;
}

// Get interpretation for a specific language
async function getLanguageSpecificInterpretation(request: InterpretationRequest, langCode: string, langName: string): Promise<any> {
    const { hexagram, question, lines, mansion, equilibrium, historyAnalysis } = request;
    
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);
    
    const systemPrompt = `You are an I Ching oracle. Respond with ONLY valid JSON.
Language: ${langName} (${langCode})
MEMORY/CONTEXT: Reference previous relevant readings from this history if they provide continuity:
${historyAnalysis || "No previous history."}

Format: {"celestial": "...", "elements": "...", "analysis": "...", "advice": "...", "symbolism": "...", "movingLines": "...", "judgment": "...", "image": "...", "lines": ["l1","l2","l3","l4","l5","l6"]}
All values must be strings in ${langName}. Lines array must have exactly 6 strings.`;

    const userPrompt = `QUESTION (${langCode}): "${question}"

HEXAGRAM ${hexagram.number}: ${hexagram.name_en} / ${hexagram.name_zh}${hexagram[`name_${langCode}`] ? ` / ${hexagram[`name_${langCode}`]}` : ''}
LINES: ${lines.map(l => l.isYang ? (l.isChanging ? '9' : '7') : (l.isChanging ? '6' : '8')).join('-')}
MOVING: ${changingLines.length > 0 ? changingLines.join(', ') : 'None'}
${mansion ? `MANSION: ${mansion.name_en} (${mansion[`name_${langCode}`] || mansion.group})` : ''}

Provide I Ching interpretation in ${langName}.`;

    const config = {
        maxOutputTokens: 1500, // Small limit per language
        systemPrompt: systemPrompt
    };
    
    const rawResponse = await _callDeepSeekAPI(userPrompt, config);
    return parseSingleLanguageResponse(rawResponse);
}

// Parse response for single language format
function parseSingleLanguageResponse(content: string): any {
    try {
        let jsonStr: string | null = null;
        const codeBlockMatch = content.match(/```json\s*([\s\S]*?)(?:```|$)/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim();
        } else {
            const startIdx = content.indexOf('{');
            const endIdx = content.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                jsonStr = content.substring(startIdx, endIdx + 1);
            }
        }
        
        if (!jsonStr) jsonStr = content.trim();
        
        // Fix truncated JSON
        const openBraces = (jsonStr.match(/\{/g) || []).length;
        const closeBraces = (jsonStr.match(/\}/g) || []).length;
        const openBrackets = (jsonStr.match(/\[/g) || []).length;
        const closeBrackets = (jsonStr.match(/\]/g) || []).length;
        
        let fixed = jsonStr;
        while ((fixed.match(/\}/g) || []).length < (fixed.match(/\{/g) || []).length) fixed += '}';
        while ((fixed.match(/\]/g) || []).length < (fixed.match(/\[/g) || []).length) fixed += ']';
        fixed = fixed.replace(/,\s*([}\]])/g, '$1');
        
        const result = JSON.parse(fixed);
        
        // Normalize
        const keys = ['celestial', 'elements', 'analysis', 'advice', 'symbolism', 'movingLines', 'judgment', 'image'];
        keys.forEach(key => {
            if (!result[key]) result[key] = "";
            if (typeof result[key] === 'object') result[key] = JSON.stringify(result[key]);
        });
        
        if (!result.lines || !Array.isArray(result.lines)) {
            result.lines = ["", "", "", "", "", ""];
        }
        result.lines = result.lines.map((l: any) => String(l || ''));
        
        return result;
    } catch (e) {
        return createEmptyInterpretation();
    }
}

function createEmptyInterpretation() {
    return {
        celestial: "",
        elements: "",
        analysis: "Interpretation unavailable",
        advice: "",
        symbolism: "",
        movingLines: "",
        judgment: "",
        image: "",
        lines: ["", "", "", "", "", ""]
    };
}

// Legacy full interpretation (kept for backwards compatibility)
// WARNING: May exceed memory limits on large prompts
async function getFullInterpretation(request: InterpretationRequest): Promise<any> {
    log(4, `[INTERPRET_FULL] WARNING: Using full interpretation - may exceed memory limits`);
    
    // Use sequential approach instead of single large call
    return await getMultiLanguageInterpretation(request);
}

// ============================================================================
// MODULAR INTERPRETATION SYSTEM
// Each section is generated separately and composed together
// This reduces memory per call and enables parallel processing
// ============================================================================

// JSON Schema Definitions for type safety
interface CelestialSection {
    lunarMansion: {
        description: string;
        influence: string;
        guidance: string;
    };
    lifePalace?: {
        description: string;
        impact: string;
    };
    celestial: string; // Full combined text
}

interface ElementsSection {
    composition: string;
    trigramRelationship: string;
    yinYangAnalysis: string;
    recommendations: string;
    elements: string; // Full combined text
}

interface CoreSection {
    analysis: string;
    advice: string;
    symbolism: string;
}

interface LinesSection {
    movingLines: string;
    lineTexts?: string[]; // Individual line interpretations
}

interface ClassicalSection {
    judgment: Record<string, string>;
    image: Record<string, string>;
    lines: Record<string, string[]>;
}

// Section 1: Celestial/Astrology Analysis
async function generateCelestialSection(request: InterpretationRequest): Promise<CelestialSection> {
    log(4, `[SECTION:celestial] Generating celestial analysis...`);
    
    const { mansion, lifePalace, question, historyAnalysis } = request;
    
    const systemPrompt = `You are an expert in Chinese astrology and the 28 Lunar Mansions.
Respond with ONLY valid JSON in this exact format:
{
  "lunarMansion": {
    "description": "2-3 sentences describing the mansion's symbolic meaning",
    "influence": "2-3 sentences on how this mansion affects the question",
    "guidance": "1-2 sentences of specific guidance"
  },
  "lifePalace": {
    "description": "2 sentences describing the palace significance (if applicable)",
    "impact": "2 sentences on how it affects the reading (if applicable)"
  },
  "celestial": "Combined flowing narrative (5-6 sentences total)"
}
If no life palace data, use empty strings for those fields.
MEMORY/CONTEXT: Reference previous relevant readings from the HISTORY section if they provide continuity.`;

    const userPrompt = `QUESTION: "${question}"

${historyAnalysis || ""}

${mansion ? `LUNAR MANSION: ${mansion.name_en} (${mansion.name_zh})
- Group: ${mansion.group}
- Element: ${mansion.element}
- Animal: ${mansion.animal}
- Number: ${mansion.num}/28` : 'No lunar mansion data'}

${lifePalace ? `LIFE PALACE: ${lifePalace.lifeNum} (Zi Wei position: ${lifePalace.lifeNum})
BODY PALACE: ${lifePalace.bodyNum}
${lifePalace.hourPillar ? `HOUR PILLAR: ${lifePalace.hourPillar}` : ''}` : 'No life palace data'}

Provide celestial/astrological analysis addressing the question.`;

    const config = { maxOutputTokens: 800, systemPrompt };
    const rawResponse = await _callDeepSeekAPI(userPrompt, config);
    
    try {
        const parsed = JSON.parse(rawResponse.replace(/```json\s*|\s*```/g, '').trim());
        return {
            lunarMansion: parsed.lunarMansion || { description: "", influence: "", guidance: "" },
            lifePalace: parsed.lifePalace || { description: "", impact: "" },
            celestial: parsed.celestial || ""
        };
    } catch (e) {
        log(4, `[SECTION:celestial] Parse error: ${e.message}`);
        return {
            lunarMansion: { description: "", influence: "", guidance: "" },
            lifePalace: { description: "", impact: "" },
            celestial: rawResponse.substring(0, 500)
        };
    }
}

// Section 2: Five Elements Analysis
async function generateElementsSection(request: InterpretationRequest): Promise<ElementsSection> {
    log(4, `[SECTION:elements] Generating elements analysis...`);
    
    const { equilibrium, binaryKey, question, historyAnalysis } = request;
    const upperTrigram = binaryKey?.substring(0, 3);
    const lowerTrigram = binaryKey?.substring(3, 6);
    
    const systemPrompt = `You are an expert in Five Elements (Wu Xing) theory.
Respond with ONLY valid JSON in this exact format:
{
  "composition": "2-3 sentences on the elemental composition",
  "trigramRelationship": "2-3 sentences on upper/lower trigram element interaction",
  "yinYangAnalysis": "2 sentences on the balance and its meaning",
  "recommendations": "2-3 sentences of practical elemental advice",
  "elements": "Combined flowing narrative (5-6 sentences total)"
}
MEMORY/CONTEXT: If previous readings show an elemental trend or shift, mention it briefly.`;

    const userPrompt = `QUESTION: "${question}"

${historyAnalysis || ""}

${equilibrium ? `FIVE ELEMENTS DATA:
- Yang Lines: ${equilibrium.yangCount}
- Yin Lines: ${equilibrium.yinCount}
- Balance: ${equilibrium.balanceState}
- Moving Lines: ${equilibrium.movingCount}
- Stability: ${equilibrium.stabilityState}` : 'No elements data'}

${binaryKey ? `TRIGRAMS:
- Upper: ${upperTrigram}
- Lower: ${lowerTrigram}` : ''}

Provide Five Elements analysis addressing the question.`;

    const config = { maxOutputTokens: 800, systemPrompt };
    const rawResponse = await _callDeepSeekAPI(userPrompt, config);
    
    try {
        const parsed = JSON.parse(rawResponse.replace(/```json\s*|\s*```/g, '').trim());
        return {
            composition: parsed.composition || "",
            trigramRelationship: parsed.trigramRelationship || "",
            yinYangAnalysis: parsed.yinYangAnalysis || "",
            recommendations: parsed.recommendations || "",
            elements: parsed.elements || ""
        };
    } catch (e) {
        log(4, `[SECTION:elements] Parse error: ${e.message}`);
        return {
            composition: "",
            trigramRelationship: "",
            yinYangAnalysis: "",
            recommendations: "",
            elements: rawResponse.substring(0, 500)
        };
    }
}

// Section 3: Core Interpretation (Analysis, Advice, Symbolism)
async function generateCoreSection(request: InterpretationRequest): Promise<CoreSection> {
    log(4, `[SECTION:core] Generating core interpretation...`);
    
    const { hexagram, question, lines, historyAnalysis } = request;
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);
    
    const systemPrompt = `You are a wise I Ching interpreter providing the heart of the reading.
Respond with ONLY valid JSON in this exact format:
{
  "analysis": "4-5 sentences interpreting the hexagram meaning for this specific question. Be insightful and contextual.",
  "advice": "3-4 sentences of actionable, practical guidance. What should the person do?",
  "symbolism": "3-4 sentences explaining key symbols and their relevance to the question."
}
MEMORY/CONTEXT: CRITICAL. Look at the HISTORY section. If this is a follow-up or related to previous questions, EXPLICITLY mention the continuity or shift in energy from previous readings.`;

    const userPrompt = `QUESTION: "${question}"

${historyAnalysis || ""}

HEXAGRAM: ${hexagram.number} - ${hexagram.name_en} (${hexagram.name_zh})
LINES: ${lines.map(l => l.isYang ? 'Yang' : 'Yin').join(', ')}
${changingLines.length > 0 ? `MOVING LINES: ${changingLines.join(', ')}` : 'STATIC HEXAGRAM (no moving lines)'}

Provide the core interpretation addressing the question directly.`;

    const config = { maxOutputTokens: 1000, systemPrompt };
    const rawResponse = await _callDeepSeekAPI(userPrompt, config);
    
    try {
        const parsed = JSON.parse(rawResponse.replace(/```json\s*|\s*```/g, '').trim());
        return {
            analysis: parsed.analysis || "",
            advice: parsed.advice || "",
            symbolism: parsed.symbolism || ""
        };
    } catch (e) {
        log(4, `[SECTION:core] Parse error: ${e.message}`);
        return {
            analysis: rawResponse.substring(0, 300),
            advice: "",
            symbolism: ""
        };
    }
}

// Section 4: Moving Lines Analysis
async function generateLinesSection(request: InterpretationRequest): Promise<LinesSection> {
    log(4, `[SECTION:lines] Generating moving lines analysis...`);
    
    const { hexagram, question, lines, historyAnalysis } = request;
    const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(Boolean);
    
    if (changingLines.length === 0) {
        return {
            movingLines: "No moving lines. This is a static hexagram, indicating a stable situation with the energy concentrated in the present moment.",
            lineTexts: []
        };
    }
    
    const systemPrompt = `You are an expert in I Ching line interpretations.
Respond with ONLY valid JSON in this exact format:
{
  "movingLines": "4-5 sentences interpreting the changing lines as a whole, their sequence, and what they reveal about the situation's evolution",
  "lineTexts": ["Line 1 interpretation", "Line 2 interpretation", "Line 3 interpretation", "Line 4 interpretation", "Line 5 interpretation", "Line 6 interpretation"]
}
For lineTexts, provide specific commentary for EACH of the 6 lines. If a line is not moving, provide its general meaning. All 6 array elements must be present.
MEMORY/CONTEXT: Reference previous readings if the changing energy shows a progression from past states.`;

    const userPrompt = `QUESTION: "${question}"

${historyAnalysis || ""}

HEXAGRAM: ${hexagram.number} - ${hexagram.name_en}
MOVING LINES: ${changingLines.join(', ')}

Provide interpretation of the moving lines and all line texts.`;

    const config = { maxOutputTokens: 1200, systemPrompt };
    const rawResponse = await _callDeepSeekAPI(userPrompt, config);
    
    try {
        const parsed = JSON.parse(rawResponse.replace(/```json\s*|\s*```/g, '').trim());
        return {
            movingLines: parsed.movingLines || "",
            lineTexts: parsed.lineTexts || ["", "", "", "", "", ""]
        };
    } catch (e) {
        log(4, `[SECTION:lines] Parse error: ${e.message}`);
        return {
            movingLines: rawResponse.substring(0, 500),
            lineTexts: ["", "", "", "", "", ""]
        };
    }
}

// Section 5: Classical Texts (Judgment, Image, Lines) - Multi-language
async function generateClassicalSection(request: InterpretationRequest): Promise<ClassicalSection> {
    log(4, `[SECTION:classical] Generating classical texts...`);
    
    const { hexagram } = request;
    
    // Get full hexagram data from cache
    const hexData = await getHexagram(hexagram.number);
    
    // Check if translations exist in database
    const result: ClassicalSection = {
        judgment: { en: "", es: "", it: "", zh: "" },
        image: { en: "", es: "", it: "", zh: "" },
        lines: { en: ["", "", "", "", "", ""], es: ["", "", "", "", "" ,""], it: ["", "", "", "", "", ""], zh: ["", "", "", "", "", ""] }
    };
    
    // Use existing translations from database if available
    // Store original values first to detect what needs translation
    const hasTranslation = {
        judgment: { en: false, es: false, it: false, zh: false },
        image: { en: false, es: false, it: false, zh: false },
        lines: { en: false, es: false, it: false, zh: false }
    };
    
    if (hexData) {
        // Check what translations actually exist
        hasTranslation.judgment.en = !!hexData.judgment_en;
        hasTranslation.judgment.es = !!hexData.judgment_es;
        hasTranslation.judgment.it = !!hexData.judgment_it;
        hasTranslation.judgment.zh = !!hexData.judgment_zh;
        
        hasTranslation.image.en = !!hexData.image?.image_en;
        hasTranslation.image.es = !!hexData.image?.image_es;
        hasTranslation.image.it = !!hexData.image?.image_it;
        hasTranslation.image.zh = !!hexData.image?.image_zh;
        
        hasTranslation.lines.en = !!(hexData.lines_en?.length > 0);
        hasTranslation.lines.es = !!(hexData.lines_es?.length > 0);
        hasTranslation.lines.it = !!(hexData.lines_it?.length > 0);
        hasTranslation.lines.zh = !!(hexData.lines_zh?.length > 0);
        
        log(4, `[SECTION:classical] DB check for hexagram ${hexagram.number}:`);
        log(4, `  judgment: en=${hasTranslation.judgment.en}, es=${hasTranslation.judgment.es}, it=${hasTranslation.judgment.it}, zh=${hasTranslation.judgment.zh}`);
        log(4, `  image: en=${hasTranslation.image.en}, es=${hasTranslation.image.es}, it=${hasTranslation.image.it}, zh=${hasTranslation.image.zh}`);
        log(4, `  lines: en=${hasTranslation.lines.en}, es=${hasTranslation.lines.es}, it=${hasTranslation.lines.it}, zh=${hasTranslation.lines.zh}`);
        
        // Set values - use specific translation if available, otherwise fallback
        result.judgment = {
            en: hexData.judgment_en || hexData.judgment_zh || "",
            es: hexData.judgment_es || "",
            it: hexData.judgment_it || "",
            zh: hexData.judgment_zh || ""
        };
        
        result.image = {
            en: hexData.image?.image_en || hexData.image?.image_zh || "",
            es: hexData.image?.image_es || "",
            it: hexData.image?.image_it || "",
            zh: hexData.image?.image_zh || ""
        };
        
        result.lines = {
            en: hexData.lines_en || hexData.lines_zh || ["", "", "", "", "", ""],
            es: hexData.lines_es || ["", "", "", "", "", ""],
            it: hexData.lines_it || ["", "", "", "", "", ""],
            zh: hexData.lines_zh || ["", "", "", "", "", ""]
        };
    }
    
    // Determine which languages need translation (don't have their own translations)
    const missingLangs: string[] = [];
    if (!hasTranslation.judgment.es) missingLangs.push('es');
    if (!hasTranslation.judgment.it) missingLangs.push('it');
    // Note: zh should always exist as it's the original text
    if (!hasTranslation.judgment.zh) {
        log(4, `[SECTION:classical] WARNING: Chinese original text missing for hexagram ${hexagram.number}`);
    }
    
    // Remove duplicates
    const uniqueMissingLangs = [...new Set(missingLangs)];
    
    if (uniqueMissingLangs.length > 0) {
        log(4, `[SECTION:classical] Generating missing translations in PARALLEL for: ${uniqueMissingLangs.join(', ')}`);
        
        // Translate all missing languages in parallel
        const translationPromises = uniqueMissingLangs.map(async (lang) => {
            try {
                const langNames: { [key: string]: string } = {
                    'es': 'Spanish',
                    'it': 'Italian',
                    'zh': 'Chinese'
                };
                const langName = langNames[lang] || lang;
                
                const systemPrompt = `You are a precise translator of classical Chinese texts.
Translate the following I Ching texts to ${langName}. Preserve the poetic and philosophical quality.
Respond with ONLY valid JSON: {"judgment": "...", "image": "...", "lines": ["l1", "l2", "l3", "l4", "l5", "l6"]}`;

                const userPrompt = `HEXAGRAM ${hexagram.number}: ${hexData.name_zh} - ${hexData.name_en}

CHINESE JUDGMENT (卦辞):
${hexData.judgment_zh}

CHINESE IMAGE (象):
${hexData.image?.image_zh}

CHINESE LINES (爻):
${(hexData.lines_zh || []).join('\n')}

Translate to ${langName}.`;

                const config = { maxOutputTokens: 1500, systemPrompt };
                const rawResponse = await _callDeepSeekAPI(userPrompt, config);
                
                const parsed = JSON.parse(rawResponse.replace(/```json\s*|\s*```/g, '').trim());
                result.judgment[lang] = parsed.judgment || result.judgment.en;
                result.image[lang] = parsed.image || result.image.en;
                result.lines[lang] = parsed.lines || result.lines.en;
                
                log(4, `[SECTION:classical] Successfully generated ${lang} translation`);
            } catch (e) {
                log(4, `[SECTION:classical] Translation failed for ${lang}: ${e.message}`);
                // Keep existing value (which might be empty or fallback)
                if (!result.judgment[lang]) result.judgment[lang] = result.judgment.en;
                if (!result.image[lang]) result.image[lang] = result.image.en;
                if (!result.lines[lang] || result.lines[lang].length === 0) result.lines[lang] = result.lines.en;
            }
        });
        
        // Wait for all translations to complete in parallel
        await Promise.all(translationPromises);
        
        log(4, `[SECTION:classical] All parallel translations completed`);
        log(4, `[SECTION:classical] Final result: es="${result.judgment.es?.substring(0, 50)}...", it="${result.judgment.it?.substring(0, 50)}..."`);
    } else {
        log(4, `[SECTION:classical] All translations available in database`);
    }
    
    return result;
}

// Composer: Combine all sections into final format
async function composeInterpretation(
    celestial: CelestialSection,
    elements: ElementsSection,
    core: CoreSection,
    lines: LinesSection,
    classical: ClassicalSection,
    targetLang: string = 'en'
): Promise<any> {
    log(4, `[COMPOSE] Composing final interpretation with translations`);
    
    const result: any = {
        en: {},
        es: {},
        it: {},
        zh: {}
    };
    
    // Start with English content for all languages as base
    const baseContent = {
        celestial: celestial.celestial,
        elements: elements.elements,
        analysis: core.analysis,
        advice: core.advice,
        symbolism: core.symbolism,
        movingLines: lines.movingLines
    };
    
    // English gets the original content
    result.en = {
        ...baseContent,
        judgment: classical.judgment.en,
        image: classical.image.en,
        lines: classical.lines.en
    };
    
    // For other languages, we need to translate the dynamic content
    const languagesToTranslate = [
        { code: 'es', name: 'Spanish' },
        { code: 'it', name: 'Italian' },
        { code: 'zh', name: 'Chinese' }
    ];
    
    for (const { code, name } of languagesToTranslate) {
        // Check if we have classical texts in this language
        // A translation exists if: it's not empty AND it's different from English
        const judgmentValue = classical.judgment[code] || "";
        const hasJudgment = judgmentValue.trim() !== '';
        const hasImage = classical.image[code] && classical.image[code].trim() !== '';
        const hasLines = classical.lines[code] && classical.lines[code].length > 0 && 
                         classical.lines[code].some((l: string) => l && l.trim() !== '');
        
        // Also check it's actually different from English (not just a fallback)
        const isDifferentFromEn = judgmentValue !== classical.judgment.en;
        
        const hasClassical = hasJudgment && isDifferentFromEn;
        
        log(4, `[COMPOSE] ${code}: judgmentValue="${judgmentValue.substring(0, 40)}...", hasJudgment=${hasJudgment}, isDifferent=${isDifferentFromEn}`);
        
        if (hasClassical) {
            // We have classical texts in this language
            log(4, `[COMPOSE] Using ${code} translations from classical section`);
            result[code] = {
                ...baseContent, // English dynamic content (AI interp)
                judgment: classical.judgment[code],
                image: classical.image[code],
                lines: classical.lines[code]
            };
        } else {
            // No classical texts available, use English for Yijing texts
            // But still include them in the structure
            log(4, `[COMPOSE] Falling back to English for ${code} classical texts`);
            result[code] = {
                ...baseContent,
                judgment: classical.judgment.en,
                image: classical.image.en,
                lines: classical.lines.en
            };
        }
    }
    
    log(4, `[COMPOSE] Final result structure:`, Object.keys(result));
    log(4, `[COMPOSE] ES judgment: "${result.es?.judgment?.substring(0, 50)}..."`);
    log(4, `[COMPOSE] IT judgment: "${result.it?.judgment?.substring(0, 50)}..."`);
    
    return result;
}

// Translate dynamic sections (celestial, elements, core, movingLines) to target language
async function translateDynamicContent(
    content: { celestial: string; elements: string; analysis: string; advice: string; symbolism: string; movingLines: string },
    targetLang: string,
    targetLangName: string
): Promise<{ celestial: string; elements: string; analysis: string; advice: string; symbolism: string; movingLines: string }> {
    log(4, `[TRANSLATE] Translating dynamic content to ${targetLangName}`);
    
    const systemPrompt = `You are a professional translator specializing in I Ching and Chinese philosophy.
Translate the following I Ching interpretation from English to ${targetLangName}.
Maintain the spiritual and philosophical tone.
Respond with ONLY valid JSON in this exact format:
{
  "celestial": "translated celestial guidance",
  "elements": "translated five elements analysis", 
  "analysis": "translated core analysis",
  "advice": "translated practical advice",
  "symbolism": "translated symbolism",
  "movingLines": "translated moving lines interpretation"
}`;

    const userPrompt = `Translate this I Ching interpretation to ${targetLangName}:

CELESTIAL GUIDANCE:
${content.celestial}

FIVE ELEMENTS:
${content.elements}

ANALYSIS:
${content.analysis}

ADVICE:
${content.advice}

SYMBOLISM:
${content.symbolism}

MOVING LINES:
${content.movingLines}

Provide translation in ${targetLangName}.`;

    try {
        const config = { maxOutputTokens: 1500, systemPrompt };
        const rawResponse = await _callDeepSeekAPI(userPrompt, config);
        
        const parsed = JSON.parse(rawResponse.replace(/```json\s*|\s*```/g, '').trim());
        return {
            celestial: parsed.celestial || content.celestial,
            elements: parsed.elements || content.elements,
            analysis: parsed.analysis || content.analysis,
            advice: parsed.advice || content.advice,
            symbolism: parsed.symbolism || content.symbolism,
            movingLines: parsed.movingLines || content.movingLines
        };
    } catch (e) {
        log(4, `[TRANSLATE] Translation to ${targetLangName} failed: ${e.message}`);
        // Return original English content as fallback
        return content;
    }
}

// Translate dynamic sections (celestial, elements, core, movingLines) to target language
async function translateInterpretationContent(
    content: { 
        celestial: string; 
        elements: string; 
        analysis: string; 
        advice: string; 
        symbolism: string; 
        movingLines: string;
    },
    targetLang: string,
    targetLangName: string,
    hexagramName: string
): Promise<{ 
    celestial: string; 
    elements: string; 
    analysis: string; 
    advice: string; 
    symbolism: string; 
    movingLines: string;
}> {
    log(4, `[TRANSLATE] Translating interpretation to ${targetLangName}`);
    
    const systemPrompt = `You are a professional translator specializing in I Ching, Chinese philosophy, and spiritual texts.
Translate the following I Ching interpretation from English to ${targetLangName}.
Maintain the poetic, wise, and philosophical tone. Use proper ${targetLangName} terminology for I Ching concepts.

CRITICAL: Your response must be ONLY a valid JSON object with exactly these fields:
{
  "celestial": "translated celestial guidance",
  "elements": "translated five elements analysis",
  "analysis": "translated core analysis",
  "advice": "translated practical advice",
  "symbolism": "translated symbolism explanation",
  "movingLines": "translated moving lines interpretation"
}`;

    const userPrompt = `HEXAGRAM: ${hexagramName}

Translate this I Ching interpretation to ${targetLangName}:

--- CELESTIAL GUIDANCE ---
${content.celestial}

--- FIVE ELEMENTS ---
${content.elements}

--- ANALYSIS ---
${content.analysis}

--- ADVICE ---
${content.advice}

--- SYMBOLISM ---
${content.symbolism}

--- MOVING LINES ---
${content.movingLines}

Provide the complete translation in ${targetLangName} as a JSON object.`;

    try {
        const config = { 
            maxOutputTokens: 2000, 
            systemPrompt,
            temperature: 0.3 // Lower temperature for more consistent translation
        };
        const rawResponse = await _callDeepSeekAPI(userPrompt, config);
        
        // Parse JSON response
        let jsonStr = rawResponse.replace(/```json\s*|\s*```/g, '').trim();
        const startIdx = jsonStr.indexOf('{');
        const endIdx = jsonStr.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            jsonStr = jsonStr.substring(startIdx, endIdx + 1);
        }
        
        const parsed = JSON.parse(jsonStr);
        
        return {
            celestial: parsed.celestial || content.celestial,
            elements: parsed.elements || content.elements,
            analysis: parsed.analysis || content.analysis,
            advice: parsed.advice || content.advice,
            symbolism: parsed.symbolism || content.symbolism,
            movingLines: parsed.movingLines || content.movingLines
        };
    } catch (e) {
        log(4, `[TRANSLATE] Translation failed: ${e.message}`);
        // Return original English content as fallback
        return content;
    }
}

async function verifyAndCorrectResponse(initialResponse: any, originalRequest: InterpretationRequest): Promise<any> {
    log(4, `[VERIFY] Verifying interpretation quality...`);
    
    // Skip verification for simple/single-section requests to save time/cost
    // Only verify full interpretations or synthesized results
    
    const verificationPrompt = `You are a strict I Ching supervisor. Review the following interpretation for accuracy and relevance to the user's question.

USER QUESTION: "${originalRequest.question}"
HEXAGRAM: ${originalRequest.hexagram.number} (${originalRequest.hexagram.name_en})

INTERPRETATION TO VERIFY:
${JSON.stringify(initialResponse, null, 2)}

TASK:
1. Check if the "analysis" and "advice" sections directly address the user's specific question.
2. Ensure the "movingLines" interpretation matches the actual changing lines (if any).
3. Verify that the tone is helpful and wise, not generic.

If the interpretation is good, return the ORIGINAL JSON exactly as is.
If significant issues are found (e.g. generic response, wrong lines discussed), return a CORRECTED JSON object with improved content.

CRITICAL: Your output must be ONLY the final valid JSON object.`;

    const config = { 
        maxOutputTokens: 2500, 
        systemPrompt: "You are a quality control agent. Return only valid JSON.",
        temperature: 0.1 // Low temp for strict verification
    };

    try {
        // Use a faster model/call for verification if possible, or just the standard one
        const rawResponse = await _callDeepSeekAPI(verificationPrompt, config);
        const validated = parseInterpretationResponse(rawResponse);
        
        // Basic sanity check on the validated response
        if (validated && validated.en && validated.en.analysis) {
            log(4, `[VERIFY] Verification complete. Returning validated response.`);
            return validated;
        } else {
            log(4, `[VERIFY] Validation returned malformed data. Using original.`);
            return initialResponse;
        }
    } catch (e) {
        log(4, `[VERIFY] Verification check failed: ${e.message}. Using original response.`);
        return initialResponse;
    }
}

// Main modular interpretation function
async function getModularInterpretation(request: InterpretationRequest): Promise<any> {
    log(4, `[MODULAR] Starting modular interpretation for hexagram ${request.hexagram.number}`);
    
    try {
        // Run independent sections in parallel
        const [celestial, elements, core, lines, classical] = await Promise.all([
            generateCelestialSection(request),
            generateElementsSection(request),
            generateCoreSection(request),
            generateLinesSection(request),
            generateClassicalSection(request)
        ]);
        
        log(4, `[MODULAR] All sections generated, composing...`);
        
        // Compose final result
        const composed = await composeInterpretation(celestial, elements, core, lines, classical, request.lang);
        
        // NEW: Verification Step
        const finalResult = await verifyAndCorrectResponse(composed, request);
        
        log(4, `[MODULAR] Complete.`);
        return finalResult;
        
    } catch (e) {
        log(4, `[MODULAR] Error: ${e.message}`);
        throw e;
    }
}

// Main server handler
serve(async (req) => {
    // Reset AI provider for each request
    currentAIProvider = 'GEMINI';

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter((p) => p);

    try {
        const lastSegment = pathParts.pop() || '';
        const secondLastSegment = pathParts.pop() || '';
        const endpoint = lastSegment;
        
        log(4, `[ROUTING] Method: ${req.method}, Path: ${url.pathname}, Endpoint: ${endpoint}, lastSegment: ${lastSegment}, secondLastSegment: ${secondLastSegment}`);

        // POST endpoints
        if (req.method === 'POST') {
            const body = await req.json();
            if (!body) throw new Error("Request body cannot be empty.");

            let prompt;
            let interpretation;

            if (endpoint === 'samequestion') {
                const { hexagrams } = body;
                if (!Array.isArray(hexagrams) || hexagrams.length === 0) {
                    throw new Error("Request must include a 'hexagrams' array.");
                }
                log(4, `[API_REQUEST] /${endpoint} | Hexagrams: [${hexagrams.join(', ')}]`);

                const hexagramSummary = await lookupAndSummarizeHexagrams(hexagrams);
                prompt = `You are a wise Daoist master and scholar of the I Ching. A user, seeking guidance on a personal matter (likely related to their career, relationships, or personal growth), has received the following hexagram reading. Provide a deep and practical interpretation based on the ancient texts.

**HEXAGRAM DATA:**
---
${hexagramSummary}
---

**YOUR TASK:**
Provide a multi-faceted interpretation that is both philosophically deep and practically useful.`;

                interpretation = await getSynthesizedInterpretation(prompt, { endpoint, hexagrams });
            }
            else if (endpoint === 'differentquestion') {
                const { current_hexagram, previous_hexagrams = [] } = body;
                if (!current_hexagram) throw new Error("Request must include a 'current_hexagram' number.");
                log(4, `[API_REQUEST] /${endpoint} | Current: ${current_hexagram}, Previous: [${previous_hexagrams.join(', ')}]`);

                const currentSummary = await lookupAndSummarizeHexagrams([current_hexagram]);
                const previousSummary = await lookupAndSummarizeHexagrams(previous_hexagrams);

                prompt = `You are a wise Daoist master and scholar of the I Ching. A user, who is tracking their journey, has received a new reading in the context of previous ones. Your task is to interpret the meaning of this transition.

**PREVIOUS HEXAGRAM(S) SUMMARY:**
---
${previousSummary || "No previous readings in this context."}
---

**CURRENT HEXAGRAM DATA:**
---
${currentSummary}
---

**YOUR TASK:**
Interpret the CURRENT hexagram, explaining how it represents a shift, evolution, or new phase in relation to the PREVIOUS hexagrams. Focus on the narrative of change.`;

                interpretation = await getSynthesizedInterpretation(prompt, { endpoint, current_hexagram, previous_hexagrams });
            }
            else if (endpoint === 'interpret') {
                // LEGACY: Full multi-language interpretation
                // WARNING: May exceed memory/time limits. Use /interpret-simple or /interpret-multi instead.
                const interpretationRequest: InterpretationRequest = body;
                
                if (!interpretationRequest.question) throw new Error("Request must include a 'question'.");
                if (!interpretationRequest.hexagram) throw new Error("Request must include 'hexagram' data.");
                if (!interpretationRequest.lines || !Array.isArray(interpretationRequest.lines)) {
                    throw new Error("Request must include 'lines' array.");
                }
                
                log(4, `[API_REQUEST] /interpret (legacy) | Hexagram: ${interpretationRequest.hexagram.number}`);
                
                const result = await getFullInterpretation(interpretationRequest);
                
                return new Response(JSON.stringify({ success: true, interpretation: result }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }
            else if (endpoint === 'interpret-simple') {
                // NEW: Lightweight single-language interpretation
                // Fast, low memory usage, returns single language (English)
                const interpretationRequest: InterpretationRequest = body;
                
                if (!interpretationRequest.question) throw new Error("Request must include a 'question'.");
                if (!interpretationRequest.hexagram) throw new Error("Request must include 'hexagram' data.");
                if (!interpretationRequest.lines || !Array.isArray(interpretationRequest.lines)) {
                    throw new Error("Request must include 'lines' array.");
                }
                
                log(4, `[API_REQUEST] /interpret-simple | Hexagram: ${interpretationRequest.hexagram.number}`);
                
                const result = await getSimpleInterpretation(interpretationRequest);
                
                // Wrap in multi-language format for client compatibility
                const wrappedResult = {
                    en: result,
                    es: { ...result, analysis: "Ver análisis en inglés" },
                    it: { ...result, analysis: "Vedi analisi in inglese" },
                    zh: { ...result, analysis: "见英文分析" }
                };
                
                return new Response(JSON.stringify({ success: true, interpretation: wrappedResult }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }
            else if (endpoint === 'interpret-multi') {
                // NEW: Multi-language interpretation using sequential calls
                // More reliable than single large call, but slower
                const interpretationRequest: InterpretationRequest = body;
                
                if (!interpretationRequest.question) throw new Error("Request must include a 'question'.");
                if (!interpretationRequest.hexagram) throw new Error("Request must include 'hexagram' data.");
                if (!interpretationRequest.lines || !Array.isArray(interpretationRequest.lines)) {
                    throw new Error("Request must include 'lines' array.");
                }
                
                log(4, `[API_REQUEST] /interpret-multi | Hexagram: ${interpretationRequest.hexagram.number}`);
                
                const result = await getMultiLanguageInterpretation(interpretationRequest);
                
                return new Response(JSON.stringify({ success: true, interpretation: result }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }
            else if (endpoint === 'interpret-modular') {
                // NEW: Modular interpretation - all sections in parallel
                // Most efficient, uses separate prompts for each section
                const interpretationRequest: InterpretationRequest = body;
                
                if (!interpretationRequest.question) throw new Error("Request must include a 'question'.");
                if (!interpretationRequest.hexagram) throw new Error("Request must include 'hexagram' data.");
                if (!interpretationRequest.lines || !Array.isArray(interpretationRequest.lines)) {
                    throw new Error("Request must include 'lines' array.");
                }
                
                log(4, `[API_REQUEST] /interpret-modular | Hexagram: ${interpretationRequest.hexagram.number}`);
                
                const result = await getModularInterpretation(interpretationRequest);
                
                return new Response(JSON.stringify({ success: true, interpretation: result }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }
            else if (endpoint === 'interpret-section') {
                // Generate a single section only
                const { section, ...requestData } = body;
                const interpretationRequest: InterpretationRequest = requestData;
                
                if (!section) throw new Error("Request must include 'section' parameter");
                if (!interpretationRequest.question) throw new Error("Request must include a 'question'.");
                
                log(4, `[API_REQUEST] /interpret-section/${section}`);
                
                let result: any;
                switch (section) {
                    case 'celestial':
                        result = await generateCelestialSection(interpretationRequest);
                        break;
                    case 'elements':
                        result = await generateElementsSection(interpretationRequest);
                        break;
                    case 'core':
                        result = await generateCoreSection(interpretationRequest);
                        break;
                    case 'lines':
                        result = await generateLinesSection(interpretationRequest);
                        break;
                    case 'classical':
                        result = await generateClassicalSection(interpretationRequest);
                        break;
                    default:
                        throw new Error(`Unknown section: ${section}. Valid: celestial, elements, core, lines, classical`);
                }
                
                return new Response(JSON.stringify({ success: true, section, data: result }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }
            else if (endpoint === 'interpret-compose') {
                // Compose pre-generated sections into final format
                const { celestial, elements, core, lines, classical, lang } = body;
                
                if (!celestial || !elements || !core || !lines || !classical) {
                    throw new Error("Request must include all sections: celestial, elements, core, lines, classical");
                }
                
                log(4, `[API_REQUEST] /interpret-compose`);
                
                const result = await composeInterpretation(celestial, elements, core, lines, classical, lang);
                
                return new Response(JSON.stringify({ success: true, interpretation: result }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }
            else if (endpoint === 'translate') {
                // Translate interpretation content to target language
                const { content, targetLang, hexagramName } = body;
                
                if (!content) throw new Error("Request must include 'content' to translate");
                if (!targetLang) throw new Error("Request must include 'targetLang'");
                
                const langNames: { [key: string]: string } = {
                    'es': 'Spanish',
                    'it': 'Italian', 
                    'zh': 'Chinese',
                    'en': 'English'
                };
                
                if (targetLang === 'en') {
                    // No translation needed for English
                    return new Response(JSON.stringify({ 
                        success: true, 
                        translated: content,
                        targetLang: 'en'
                    }), {
                        headers: { "Content-Type": "application/json", ...corsHeaders }
                    });
                }
                
                log(4, `[API_REQUEST] /translate | Target: ${targetLang}`);
                
                const translated = await translateInterpretationContent(
                    content,
                    targetLang,
                    langNames[targetLang] || targetLang,
                    hexagramName || 'I Ching Reading'
                );
                
                return new Response(JSON.stringify({ 
                    success: true, 
                    translated,
                    targetLang,
                    cached: false
                }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }
            else {
                throw new Error(`Endpoint not found for POST ${url.pathname}`);
            }
        }

        // GET endpoints
        if (req.method === 'GET') {
            // GET /hexagram-reading/:number
            if (secondLastSegment === 'hexagram-reading' && lastSegment) {
                const hexagramNumber = parseInt(lastSegment, 10);
                if (isNaN(hexagramNumber)) throw new Error(`Invalid hexagram number: "${lastSegment}".`);

                log(4, `[API_REQUEST] GET /hexagram-reading/${hexagramNumber}`);
                const hexagram = await getHexagram(hexagramNumber);
                const originalData = formatHexagramForAPI(hexagram);

                // Get translations in parallel
                const [englishResult, spanishResult, italianResult] = await Promise.allSettled([
                    getTranslation(hexagram, 'English'),
                    getTranslation(hexagram, 'Spanish'),
                    getTranslation(hexagram, 'Italian')
                ]);

                const response = {
                    success: true,
                    original: originalData,
                    translations: {
                        english: englishResult.status === 'fulfilled' ? englishResult.value : { error: englishResult.reason.message },
                        spanish: spanishResult.status === 'fulfilled' ? spanishResult.value : { error: spanishResult.reason.message },
                        italian: italianResult.status === 'fulfilled' ? italianResult.value : { error: italianResult.reason.message }
                    }
                };

                return new Response(JSON.stringify(response), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }

            // GET /cache-status
            if (lastSegment === 'cache-status') {
                await getHexagramData().catch((err) => {
                    return new Response(JSON.stringify({
                        success: false,
                        error: `Cache load failed: ${err.message}`
                    }), {
                        status: 500,
                        headers: { "Content-Type": "application/json", ...corsHeaders }
                    });
                });

                return new Response(JSON.stringify({
                    success: true,
                    cache_size: Object.keys(hexagramCache?.hexagrams || {}).length,
                    expected_size: 64,
                    version: hexagramCache?.version || "unknown",
                    source: "supabase_bucket",
                    timestamp: new Date().toISOString()
                }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders }
                });
            }

            // GET / - NIST beacon for randomness (default endpoint)
            log(4, "[API_REQUEST] GET / - Fetching NIST beacon");
            const nistResponse = await fetch('https://beacon.nist.gov/beacon/2.0/pulse/last');
            if (!nistResponse.ok) throw new Error(`NIST Beacon API error: ${nistResponse.status}`);
            const nistData = await nistResponse.json();
            const binaryString = nistData.pulse.outputValue
                .split('')
                .map((hex: string) => parseInt(hex, 16).toString(2).padStart(4, '0'))
                .join('');

            return new Response(JSON.stringify({
                success: true,
                timestamp: nistData.pulse.timeStamp,
                binaryString
            }), {
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        throw new Error(`Endpoint not found for ${req.method} ${url.pathname}`);

    } catch (error) {
        console.error(`[SERVER] Fatal error on ${req.method} ${req.url}:`, error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
        });
    }
});
