import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================================================
// RANDOM BEACON (NIST + Fallback)
// ============================================================================

async function handleRandomBeacon(): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const nistResponse = await fetch('https://beacon.nist.gov/beacon/2.0/pulse/last', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (nistResponse.ok) {
      const nistData = await nistResponse.json();
      if (nistData.pulse?.outputValue) {
        const binaryString = nistData.pulse.outputValue
          .split('')
          .map((hex: string) => parseInt(hex, 16).toString(2).padStart(4, '0'))
          .join('');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { binaryString, source: "NIST", timestamp: nistData.pulse.timeStamp }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  } catch (e) {
    // Fall through to crypto
  }
  
  // Crypto fallback
  const randomBytes = new Uint8Array(64);
  crypto.getRandomValues(randomBytes);
  const binaryString = Array.from(randomBytes)
    .map(byte => byte.toString(2).padStart(8, '0'))
    .join('');
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { binaryString, source: "crypto", timestamp: new Date().toISOString() }
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================================
// INTERPRETATION (Basic version)
// ============================================================================

async function handleInterpret(body: any, requestId: string) {
  const { question, hexagram, lines } = body;
  
  if (!DEEPSEEK_API_KEY) {
    return { 
      success: true, 
      data: { 
        interpretation: {
          celestial: "Celestial guidance placeholder",
          elements: "Five elements analysis placeholder",
          analysis: `Analysis for ${hexagram?.name || 'hexagram'} regarding: ${question}`,
          advice: "Advice placeholder"
        }
      }
    };
  }
  
  try {
    const response = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a wise I Ching master. Provide thoughtful interpretation.' },
          { role: 'user', content: `Hexagram: ${hexagram?.name || 'Unknown'}\nQuestion: ${question}\nProvide interpretation.` }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    const interpretation = data.choices?.[0]?.message?.content || "No interpretation available";
    
    return { 
      success: true, 
      data: { 
        interpretation: {
          celestial: interpretation.substring(0, 500),
          elements: "Generated via DeepSeek",
          analysis: interpretation,
          advice: "See full analysis"
        }
      }
    };
  } catch (error: any) {
    console.error(`[INTERPRET] Error: ${error.message}`);
    return { 
      success: true, 
      data: { 
        interpretation: {
          celestial: "Service temporarily unavailable",
          elements: "Please try again later",
          analysis: `Question: ${question}`,
          advice: "Consider meditating on the hexagram image"
        }
      }
    };
  }
}

// ============================================================================
// SERVER
// ============================================================================

serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  const path = url.pathname;
  
  try {
    // Random endpoint
    if (path.endsWith('/random') || path === '/functions/v1/hexagram' || path === '/functions/v1/hexagram/') {
      return await handleRandomBeacon();
    }
    
    // Health check
    if (path.endsWith('/health')) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { status: "healthy", version: "hexagram-v1" }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Interpretation endpoint
    if (req.method === 'POST' && path.endsWith('/interpret')) {
      const body = await req.json();
      const result = await handleInterpret(body, requestId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Remedies endpoints
    if (req.method === 'POST' && path.endsWith('/remedies-select')) {
      const body = await req.json();
      return await handleRemediesSelect(body, requestId);
    }
    
    if (req.method === 'POST' && path.endsWith('/bagua-medicine')) {
      const body = await req.json();
      return await handleBaguaMedicine(body, requestId);
    }
    
    if (req.method === 'POST' && path.endsWith('/advice')) {
      const body = await req.json();
      return await handleAdvice(body, requestId);
    }
    
    if (req.method === 'POST' && path.endsWith('/interpret-xiantian')) {
      const body = await req.json();
      return await handleXiantian(body, requestId);
    }
    
    // Default
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          message: "Hexagram API", 
          endpoints: ["/random", "/health", "/interpret", "/remedies-select", "/bagua-medicine", "/advice", "/interpret-xiantian"] 
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error(`[HEXAGRAM] Error: ${error.message}`);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

console.log("[HEXAGRAM] Function started");

// ============================================================================
// SIMPLIFIED REMEDIES HANDLERS
// ============================================================================

// Minimal Fulu database loader - returns hardcoded essential remedies
async function loadFuluDatabase(): Promise<any[]> {
  return [
    {
      id: "fulu-protection-001",
      remedyType: "fulu",
      name: { en: "Protection Talisman", zh: "護身符", pinyin: "Hù Shēn Fú" },
      purpose: "protection",
      description: "A traditional Daoist talisman for personal protection and warding off negative influences.",
      usage: ["protection", "warding", "spiritual_defense"],
      verified: true,
      source: { primary: "Daoist Canon", references: ["Zhengtong Daozang"] },
      sealChars: ["護", "身", "符"],
      bottomRows: [],
      structure: { type: "seal", instructions: "Carry on person or place at entryway" }
    },
    {
      id: "fulu-wealth-001",
      remedyType: "fulu",
      name: { en: "Wealth Talisman", zh: "招財符", pinyin: "Zhāo Cái Fú" },
      purpose: "wealth",
      description: "Traditional talisman to attract prosperity and abundance.",
      usage: ["wealth", "prosperity", "abundance"],
      verified: true,
      source: { primary: "Daoist Tradition" },
      sealChars: ["財", "源", "廣"],
      bottomRows: [],
      structure: { type: "seal", instructions: "Place in wealth corner (Southeast)" }
    },
    {
      id: "fs-water-001",
      remedyType: "fengshui",
      name: { en: "Water Feature", zh: "水景", pinyin: "Shuǐ Jǐng" },
      purpose: "flow",
      description: "Flowing water element to activate Qi and promote abundance.",
      usage: ["wealth", "flow", "career"],
      verified: true,
      source: { primary: "Feng Shui Classics" },
      application: "Place in North for career or Southeast for wealth"
    },
    {
      id: "med-herbs-001",
      remedyType: "medicine",
      name: { en: "Ginseng Tonic", zh: "人參", pinyin: "Rén Shēn" },
      purpose: "vitality",
      description: "Traditional herbal remedy for energy and longevity.",
      usage: ["health", "vitality", "longevity"],
      verified: true,
      source: { primary: "Traditional Chinese Medicine" },
      application: "Prepare as tea or add to soups"
    }
  ];
}

// Simplified remedies-select handler
async function handleRemediesSelect(body: any, requestId: string): Promise<Response> {
  const { question, hexagram, equilibrium } = body;
  
  const database = await loadFuluDatabase();
  
  // Simple selection based on hexagram number
  const fulu = database.find(e => e.remedyType === 'fulu' && (hexagram?.number % 2 === 1)) || database[0];
  const env = database.find(e => e.remedyType !== 'fulu' && (hexagram?.number % 2 === 0)) || database[2];
  
  const selectedRemedies = [fulu, env].filter(Boolean);
  
  const result: any = {
    en: { remedies: [] },
    es: { remedies: [] },
    it: { remedies: [] },
    zh: { remedies: [] },
    fuluContentList: []
  };
  
  for (const entry of selectedRemedies) {
    const baseRemedy = {
      id: entry.id,
      type: entry.remedyType,
      name: entry.name?.en || "Unnamed",
      nameZh: entry.name?.zh || "",
      pinyin: entry.name?.pinyin || "",
      description: entry.description || "",
      relevance: `This ${entry.purpose} remedy aligns with your inquiry about "${question?.substring(0, 50)}..."`,
      instructions: entry.structure?.instructions || entry.application || "",
      application: entry.application || "",
      alchemicalContext: entry.purpose || "",
      charm: entry.sealChars?.join(" ") || "",
      source: entry.source?.primary || "Daoist Tradition",
      verification: entry.verified ? "✓ Verified" : "Symbolic"
    };
    
    result.en.remedies.push(baseRemedy);
    
    // Simplified content for other languages
    ['es', 'it', 'zh'].forEach(lang => {
      result[lang].remedies.push({
        ...baseRemedy,
        name: entry.name?.[lang] || entry.name?.en || "Unnamed",
        relevance: `[${lang.toUpperCase()}] ${baseRemedy.relevance}`,
        instructions: baseRemedy.instructions
      });
    });
    
    result.fuluContentList.push({
      id: entry.id,
      remedyType: entry.remedyType,
      talismanNameZh: entry.name?.zh || "",
      sealChars: entry.sealChars || [],
      hexagramNumber: hexagram?.number || 1,
      hexagramChar: hexagram?.name_zh?.charAt(0) || '卦',
      type: entry.structure?.type || 'composite_symbol'
    });
  }
  
  return new Response(
    JSON.stringify({ success: true, data: result }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Simplified bagua-medicine handler
async function handleBaguaMedicine(body: any, requestId: string): Promise<Response> {
  const { hexagram, lang = 'en' } = body;
  
  const favorable = ['S', 'E', 'N'];
  const unfavorable = ['W', 'SW'];
  
  const content: any = {
    fengShui: {
      favorable,
      unfavorable,
      guidance: "Based on your hexagram, favor the South and East directions for important activities. Avoid West and Southwest if possible.",
      arrangement: "Place water features in North for career support. Keep the center area clear for Qi flow."
    }
  };
  
  // Add translations
  if (lang === 'es') {
    content.fengShui.guidance = "Según su hexagrama, favorezca las direcciones Sur y Este. Evite Oeste y Suroeste si es posible.";
  } else if (lang === 'it') {
    content.fengShui.guidance = "Secondo il tuo esagramma, favorisci le direzioni Sud e Est. Evita Ovest e Sudovest se possibile.";
  } else if (lang === 'zh') {
    content.fengShui.guidance = "根據您的卦象，有利方向為南和東。盡量避免西和西南方向。";
  }
  
  const result = { [lang]: content };
  
  return new Response(
    JSON.stringify({ success: true, data: result }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Simplified advice handler
async function handleAdvice(body: any, requestId: string): Promise<Response> {
  const { question, interpretation, lang = 'en' } = body;
  
  const advice = {
    guidance: "Focus on maintaining balance in your approach. The hexagram suggests patience and careful observation before action.",
    practical: ["Take time to reflect", "Seek counsel from trusted advisors", "Avoid hasty decisions"],
    timing: "Favorable timing will emerge within 7-14 days",
    caution: "Beware of overconfidence"
  };
  
  if (lang === 'es') {
    advice.guidance = "Enfoquese en mantener el equilibrio. El hexagrama sugiere paciencia y observación cuidadosa.";
  } else if (lang === 'it') {
    advice.guidance = "Concentrati sul mantenere l'equilibrio. L'esagramma suggerisce pazienza e osservazione attenta.";
  } else if (lang === 'zh') {
    advice.guidance = "專注於保持平衡。卦象建議耐心等待，仔細觀察後再行動。";
  }
  
  const result = { [lang]: advice };
  
  return new Response(
    JSON.stringify({ success: true, data: result }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Simplified xiantian handler
async function handleXiantian(body: any, requestId: string): Promise<Response> {
  const { hexagram, lang = 'en' } = body;
  
  const content = {
    spiritual: "The Xiantian (Early Heaven) arrangement reveals the spiritual essence of your inquiry.",
    meditation: "Sit in quiet reflection facing South. Visualize the trigrams harmonizing within.",
    insight: "Your question touches on fundamental patterns that pre-exist your current situation."
  };
  
  if (lang === 'es') {
    content.spiritual = "La disposición Xiantian revela la esencia espiritual de su consulta.";
  } else if (lang === 'it') {
    content.spiritual = "La disposizione Xiantian rivela l'essenza spirituale della tua consultazione.";
  } else if (lang === 'zh') {
    content.spiritual = "先天八卦排列揭示了您問題的精神本質。";
  }
  
  const result = { [lang]: content };
  
  return new Response(
    JSON.stringify({ success: true, data: result }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
