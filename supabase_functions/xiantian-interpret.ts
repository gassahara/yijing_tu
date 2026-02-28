/**
 * ============================================================
 *  xiantian-interpret  —  Supabase Edge Function
 * ============================================================
 *
 *  Generates spiritual/inner cultivation interpretations using
 *  the Xiantian (Early Heaven) bagua arrangement.
 *
 *  POST /functions/v1/xiantian-interpret
 *  ─────────────────────────────────────
 *  Request body (JSON):
 *  {
 *    "hexagram": { number: 1, name: "Qian", binary: "111111" },
 *    "lines": [ { isYang: true, isChanging: false }, ... ],
 *    "question": "string?",
 *    "context": {
 *      "natalChart": { /* BaZi data */ },
 *      "meditationStage": "string?"
 *    },
 *    "lang": "en" | "zh" | "es" | "it",
 *    "includeFDL": boolean  // Generate Xiantian diagram
 *  }
 *
 *  Response 200 (JSON):
 *  {
 *    "interpretation": {
 *      "spiritualEssence": "string",
 *      "innerAlchemy": "string",
 *      "congenitalNature": "string",
 *      "cultivationAdvice": "string",
 *      "xiantianAnalysis": {
 *        "upperTrigramSpiritual": "string",
 *        "lowerTrigramSpiritual": "string",
 *        "elementalHarmony": "string",
 *        "shenQiJing": "string"  // Spirit/Qi/Essence mapping
 *      }
 *    },
 *    "fdl": object | null,  // Xiantian bagua diagram
 *    "references": string[]
 *  }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// Xiantian trigram spiritual meanings
const XIANTIAN_TRIGRAMS: Record<string, any> = {
  Qian: { zh: "乾", element: "Heaven", spiritual: "Pure Yang / Spirit (Shen)", direction: "S", quality: "Creative" },
  Dui: { zh: "兌", element: "Metal", spiritual: "Soul (Hun) / Joy", direction: "SE", quality: "Joyful" },
  Li: { zh: "離", element: "Fire", spiritual: "Intention (Yi) / Clarity", direction: "E", quality: "Clarity" },
  Zhen: { zh: "震", element: "Wood", spiritual: "Will (Zhi) / Arousing", direction: "NE", quality: "Arousing" },
  Kun: { zh: "坤", element: "Earth", spiritual: "Pure Yin / Body (Jing)", direction: "N", quality: "Receptive" },
  Gen: { zh: "艮", element: "Earth", spiritual: "Intuition (Po) / Stillness", direction: "NW", quality: "Still" },
  Kan: { zh: "坎", element: "Water", spiritual: "Vitality (Jing) / Danger", direction: "W", quality: "Abysmal" },
  Xun: { zh: "巽", element: "Wind", spiritual: "Breath (Qi) / Gentle", direction: "SW", quality: "Gentle" }
};

// Generate Xiantian FDL diagram
function generateXiantianFDL(activeTrigrams: string[] = []) {
  return {
    version: "2.0",
    type: "bagua_chart",
    arrangement: "xiantian",
    background: "#0a0a1a",
    title: "Xiantian (Early Heaven) Arrangement",
    layers: [
      {
        name: "base",
        type: "base_layer",
        commands: [{ type: "bagua", cx: 500, cy: 500, size: 900, arrangement: "xiantian" }]
      },
      {
        name: "taijitu",
        type: "symbol_layer",
        commands: [{ type: "taijitu", cx: 500, cy: 500, r: 120, yinColor: "#1a1a2e", yangColor: "#f5f5f5", borderColor: "#D4AF37" }]
      },
      ...(activeTrigrams.length > 0 ? [{
        name: "highlights",
        type: "highlight_layer",
        opacity: 0.6,
        commands: activeTrigrams.map(t => ({
          type: "highlight_sector",
          trigram: t,
          style: { fill: "#FFD70040", stroke: "#FFD700", strokeWidth: 3, glow: true, glowColor: "#FFD700" },
          label: { text: XIANTIAN_TRIGRAMS[t]?.zh || t, subtext: XIANTIAN_TRIGRAMS[t]?.spiritual || "", position: "outside", color: "#FFD700" }
        }))
      }] : [])
    ]
  };
}

async function generateXiantianInterpretation(request: any) {
  const { hexagram, lines, question, context, lang = 'en' } = request;
  
  // Extract trigrams from binary
  const upperBinary = hexagram.binary?.substring(0, 3) || '111';
  const lowerBinary = hexagram.binary?.substring(3, 6) || '111';
  
  // Map binary to trigram names for Xiantian
  const binaryToName: Record<string, string> = {
    '111': 'Qian', '011': 'Dui', '101': 'Li', '001': 'Zhen',
    '000': 'Kun', '100': 'Gen', '010': 'Kan', '110': 'Xun'
  };
  
  const upperTrigram = binaryToName[upperBinary] || 'Qian';
  const lowerTrigram = binaryToName[lowerBinary] || 'Kun';
  
  const upperData = XIANTIAN_TRIGRAMS[upperTrigram];
  const lowerData = XIANTIAN_TRIGRAMS[lowerTrigram];
  
  // Build system prompt for Xiantian interpretation
  const systemPrompt = `You are a Daoist inner alchemy (neidan) master interpreting the I Ching through the Xiantian (Early Heaven) lens.

Xiantian represents the PRIMORDIAL state - before manifestation, the congenital nature (本性).
Key concepts:
- Shen (Spirit) = Qian (Heaven) at South
- Qi (Breath) = Xun (Wind) at Southwest  
- Jing (Essence) = Kan (Water) at West
- Hun (Ethereal Soul) = Dui (Lake) at Southeast
- Po (Corporeal Soul) = Gen (Mountain) at Northwest
- Yi (Intention) = Li (Fire) at East
- Zhi (Will) = Zhen (Thunder) at Northeast
- Body/Matter = Kun (Earth) at North

Provide interpretations focused on:
1. Spiritual essence and congenital nature
2. Inner alchemy (neidan) implications
3. Meditation/cultivation guidance
4. Pre-heaven (xiantian) vs post-heaven (houtian) dynamics

Respond in ${lang} language.`;

  const userPrompt = `Hexagram ${hexagram.number} - Upper: ${upperTrigram} (${upperData.zh}, ${upperData.spiritual}), Lower: ${lowerTrigram} (${lowerData.zh}, ${lowerData.spiritual})

Question: ${question || "General spiritual inquiry"}

Provide:
1. Spiritual Essence - the congenital nature revealed
2. Inner Alchemy - how to work with this energy
3. Shen/Qi/Jing mapping - which aspects are active
4. Cultivation Advice - practical meditation/gongfu guidance
5. Xiantian Analysis - how this differs from mundane (houtian) interpretation`;

  // Call DeepSeek
  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Parse sections
  const sections = content.split(/\n\d+\.|\n##?\s+/).filter(s => s.trim());
  
  return {
    interpretation: {
      text: content,
      summary: sections[0]?.substring(0, 200) || '',
      spiritualEssence: sections.find((s: string) => s.toLowerCase().includes('essence')) || sections[0] || '',
      innerAlchemy: sections.find((s: string) => s.toLowerCase().includes('alchemy')) || sections[1] || '',
      congenitalNature: sections.find((s: string) => s.toLowerCase().includes('congenital')) || sections[2] || '',
      cultivationAdvice: sections.find((s: string) => s.toLowerCase().includes('cultivation') || s.toLowerCase().includes('advice')) || sections[3] || '',
      xiantianAnalysis: {
        upperTrigramSpiritual: upperData.spiritual,
        lowerTrigramSpiritual: lowerData.spiritual,
        elementalHarmony: `${upperData.element} above ${lowerData.element}`,
        shenQiJing: `Shen:${upperData.quality}/Qi:Breath/Jing:${lowerData.quality}`
      }
    },
    trigrams: { upper: upperTrigram, lower: lowerTrigram },
    references: ['Xiantian Bagua (Early Heaven)', 'Neidan (Inner Alchemy)', 'Congenital Nature (Xiantian Xing)']
  };
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request = await req.json();
    
    // Generate interpretation
    const result = await generateXiantianInterpretation(request);
    
    // Generate FDL if requested
    if (request.includeFDL) {
      result.fdl = generateXiantianFDL([result.trigrams.upper, result.trigrams.lower]);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
