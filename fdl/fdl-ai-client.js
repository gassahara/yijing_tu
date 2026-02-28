/**
 * ============================================================
 *  FDL AI Client  (fdl/fdl-ai-client.js)
 * ============================================================
 *
 *  Browser-side client for the two AI-powered FDL endpoints:
 *
 *  1. generateFDL(prompt, options?)
 *     → Calls /fdl-generate: converts a natural-language description
 *       into a valid FDL v2.0 JSON document.
 *
 *  2. interpretContext(query, context, options?)
 *     → Calls /interpret: answers a query based ONLY on the
 *       supplied context (URL, JSON object, or named reference).
 *       Returns a structured interpretation + optional FDL diagram.
 *
 *  Both functions return Promises and handle retries / error normalisation.
 *
 *  Configuration
 *  ─────────────
 *  Call FDLAIClient.configure({ baseUrl, apiKey, timeout? }) once at startup.
 *  baseUrl defaults to the Supabase functions URL.
 */

"use strict";

// ─────────────────────────────────────────────────────────────────────────────
//  DEFAULT CONFIGURATION (override via FDLAIClient.configure)
// ─────────────────────────────────────────────────────────────────────────────

const _defaults = {
  baseUrl:  "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1",
  apiKey:   "",          // Supabase anon key; set via configure()
  timeout:  30_000,      // ms
  retries:  1,
  lang:     "en"
};

let _cfg = { ..._defaults };

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

const FDLAIClient = {

  /**
   * One-time configuration. Call this before any other method.
   * @param {{ baseUrl?, apiKey?, timeout?, retries?, lang? }} opts
   */
  configure(opts = {}) {
    _cfg = { ..._cfg, ...opts };
  },

  // ── 1. FDL GENERATION ───────────────────────────────────────────────────

  /**
   * Generate an FDL v2.0 document from a natural-language prompt.
   *
   * @param {string} prompt
   *   Free-form description of what to draw.
   *   Examples:
   *   • "Highlight the Southeast sector for wealth, add a water feature marker"
   *   • "Draw a Five Thunders talisman on gold background"
   *   • "Show a bagua with North (career) and South (fame) activated"
   *
   * @param {object} [options]
   * @param {string}  [options.lang]        — override language (en/zh/es/it)
   * @param {string}  [options.type]        — hint for diagram type (talisman/fengshui_diagram/…)
   * @param {object}  [options.extraContext] — additional JSON context merged into the prompt
   *
   * @returns {Promise<{ fdl: object, description: string, raw?: string }>}
   */
  async generateFDL(prompt, options = {}) {
    const body = {
      prompt,
      lang:    options.lang  || _cfg.lang,
      type:    options.type  || null,
      context: options.extraContext || null
    };
    const result = await _call("fdl-generate", body);
    return result;   // { fdl, description }
  },

  // ── 2. CONTEXTUAL INTERPRETATION ─────────────────────────────────────

  /**
   * Interpret a query based ONLY on the supplied context.
   * The AI model is instructed never to go beyond the provided information.
   *
   * @param {string} query
   *   The question or instruction.
   *   Examples:
   *   • "What feng-shui remedies should I use for the wealth sector?"
   *   • "Which hexagram best represents career stagnation?"
   *   • "Summarise the remedy for hexagram 29"
   *
   * @param {object} context
   *   One of:
   *   • { url: "https://…/hexagrams.json" }       — fetch & use that document
   *   • { data: { …any JSON… } }                   — use this object directly
   *   • { ref: "hexagrams" | "fengshui" | "fulu" } — named reference resolved server-side
   *   Multiple keys can be combined; they are merged.
   *
   * @param {object} [options]
   * @param {string}  [options.lang]          — response language
   * @param {boolean} [options.includeFDL]    — ask the model to also produce an FDL diagram
   * @param {string}  [options.hexagramId]    — narrow context to a single hexagram
   *
   * @returns {Promise<{ interpretation: object, fdl?: object, sources: string[] }>}
   */
  async interpretContext(query, context = {}, options = {}) {
    const body = {
      query,
      context,
      lang:       options.lang       || _cfg.lang,
      includeFDL: options.includeFDL ?? false,
      hexagramId: options.hexagramId || null
    };
    const result = await _call("interpret", body);
    return result;   // { interpretation, fdl?, sources }
  },

  // ── 3. CONVENIENCE WRAPPERS ─────────────────────────────────────────

  /**
   * Quick shortcut: generate a Feng-Shui sector diagram FDL.
   * @param {string|string[]} sectors — e.g. "SE" or ["SE","N"]
   * @param {string} [instruction]    — e.g. "activate for wealth"
   * @param {string} [lang]
   */
  async generateSectorDiagram(sectors, instruction = "activate", lang) {
    const sectorList = Array.isArray(sectors) ? sectors.join(", ") : sectors;
    const prompt = `Draw a Feng-Shui bagua diagram highlighting the ${sectorList} sector(s). ${instruction}.`;
    return this.generateFDL(prompt, { type: "fengshui_diagram", lang: lang || _cfg.lang });
  },

  /**
   * Quick shortcut: generate a talisman FDL for a given hexagram.
   * @param {number} hexagramNumber
   * @param {string} [purpose]
   */
  async generateHexagramTalisman(hexagramNumber, purpose = "general blessing") {
    const prompt = `Draw a Daoist talisman inspired by I Ching hexagram ${hexagramNumber} for the purpose of ${purpose}.`;
    return this.generateFDL(prompt, { type: "talisman" });
  },

  /**
   * Interpret a hexagram based on the hexagrams.json database.
   * @param {number|string} hexagramId
   * @param {string} question
   * @param {string} [lang]
   */
  async interpretHexagram(hexagramId, question, lang) {
    return this.interpretContext(question,
      { ref: "hexagrams" },
      { lang: lang || _cfg.lang, hexagramId: String(hexagramId), includeFDL: true }
    );
  },

  /**
   * Get feng-shui remedies for a life area, grounded in the daoist_remedies_db.
   * @param {string} lifeArea — e.g. "Wealth & Abundance", "Career", "Love"
   * @param {string} [lang]
   */
  async getFengShuiRemedies(lifeArea, lang) {
    return this.interpretContext(
      `What are the feng-shui remedies and bagua sector for: ${lifeArea}?`,
      { ref: "fengshui" },
      { lang: lang || _cfg.lang, includeFDL: true }
    );
  },

  // ── 4. STREAMING (optional, if the endpoint supports SSE) ───────────

  /**
   * Stream tokens from the interpret endpoint into a callback.
   * Only works when the server sends text/event-stream.
   * Falls back to a normal call if streaming is not supported.
   *
   * @param {string} query
   * @param {object} context
   * @param {function(token: string): void} onToken
   * @param {object} [options]
   */
  async streamInterpretation(query, context, onToken, options = {}) {
    const url = `${_cfg.baseUrl}/interpret`;
    const headers = _buildHeaders();
    const body = JSON.stringify({ query, context, lang: options.lang || _cfg.lang,
                                  stream: true, includeFDL: false });

    let response;
    try {
      response = await _fetchWithTimeout(url, { method:"POST", headers, body });
    } catch (e) {
      throw _normalise(e);
    }

    const ct = response.headers.get("content-type") || "";
    if (!ct.includes("text/event-stream")) {
      // Server didn't support streaming — parse as JSON
      const data = await response.json();
      onToken(data.interpretation?.text || JSON.stringify(data));
      return data;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") return;
          try { onToken(JSON.parse(raw).delta || ""); } catch (_) { /* skip */ }
        }
      }
    }
  }

};

// ─────────────────────────────────────────────────────────────────────────────
//  INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function _buildHeaders() {
  const h = { "Content-Type": "application/json" };
  if (_cfg.apiKey) h["Authorization"] = `Bearer ${_cfg.apiKey}`;
  return h;
}

async function _fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), _cfg.timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function _call(endpoint, body, attempt = 0) {
  const url = `${_cfg.baseUrl}/${endpoint}`;
  const headers = _buildHeaders();

  let response;
  try {
    response = await _fetchWithTimeout(url, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body)
    });
  } catch (e) {
    if (attempt < _cfg.retries) {
      await _sleep(800 * (attempt + 1));
      return _call(endpoint, body, attempt + 1);
    }
    throw _normalise(e);
  }

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try { const j = await response.json(); msg += `: ${j.error || j.message || JSON.stringify(j)}`; } catch (_) {}
    if (response.status >= 500 && attempt < _cfg.retries) {
      await _sleep(1000 * (attempt + 1));
      return _call(endpoint, body, attempt + 1);
    }
    throw new Error(`FDLAIClient [${endpoint}]: ${msg}`);
  }

  return response.json();
}

function _normalise(err) {
  if (err.name === "AbortError") return new Error("FDLAIClient: request timed out");
  return err;
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== "undefined") {
  module.exports = { FDLAIClient };
}
