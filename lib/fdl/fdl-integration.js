/**
 * ============================================================
 *  FDL Integration Module
 * ============================================================
 * 
 *  Bridges the new FDL v2.0 system with the existing app.
 *  This is the ADAPTER layer - uses the general FDL library
 *  and adapts it for the specific application needs.
 */

'use strict';

/**
 * FDLIntegration - Connects FDL system to the I Ching app
 */
class FDLIntegration {
  static config = {
    endpoints: {
      generate: '/functions/v1/fdl-generate',
      interpret: '/functions/v1/interpret',
      xiantian: '/functions/v1/interpret-xiantian'
    }
  };

  /**
   * Generate an FDL document from a natural language description
   */
  static async generateFDL(prompt, options = {}) {
    try {
      const response = await fetch(`${CONFIG.SUPABASE_FUNCTION_URL}/fdl-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          lang: options.lang || App.lang || 'en',
          type: options.type || 'generic',
          context: options.context || null
        })
      });

      if (!response.ok) throw new Error(`FDL generate error: ${response.status}`);
      
      const data = await response.json();
      return data.fdl;
    } catch (e) {
      console.error('[FDLIntegration] Generate failed:', e);
      // Return a fallback simple FDL
      return this.createFallbackFDL(prompt);
    }
  }

  /**
   * Interpret a query with context (URL, data, or reference)
   */
  static async interpretWithContext(query, context, options = {}) {
    try {
      const response = await fetch(`${CONFIG.SUPABASE_FUNCTION_URL}/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context,
          lang: options.lang || App.lang || 'en',
          includeFDL: options.includeFDL || false,
          hexagramId: options.hexagramId || null
        })
      });

      if (!response.ok) throw new Error(`Interpret error: ${response.status}`);
      
      return await response.json();
    } catch (e) {
      console.error('[FDLIntegration] Interpret failed:', e);
      return null;
    }
  }

  /**
   * Get Xiantian (Early Heaven) spiritual interpretation
   */
  static async getXiantianInterpretation(hexagram, lines, question, options = {}) {
    try {
      // Build query string from hexagram data and question
      const changingLines = lines.map((l, i) => l.isChanging ? i + 1 : null).filter(n => n !== null);
      const changingText = changingLines.length > 0 ? ` with changing lines ${changingLines.join(', ')}` : '';
      const query = `Hexagram ${hexagram.number} (${hexagram.name_en || hexagram.name})${changingText}. Question: ${question || 'General spiritual guidance'}`;
      
      const response = await fetch(`${CONFIG.SUPABASE_FUNCTION_URL}/interpret-xiantian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          hexagramNumber: hexagram.number,
          lang: options.lang || App.lang || 'en',
          includeFDL: options.includeFDL !== false
        })
      });

      if (!response.ok) throw new Error(`Xiantian error: ${response.status}`);
      
      return await response.json();
    } catch (e) {
      console.error('[FDLIntegration] Xiantian failed:', e);
      return null;
    }
  }

  /**
   * Render an FDL document to a canvas element
   */
  static renderFDL(canvasId, fdlDoc, options = {}) {
    if (typeof FDLRenderer !== 'undefined') {
      FDLRenderer.render(canvasId, fdlDoc, options);
    } else {
      console.warn('[FDLIntegration] FDLRenderer not loaded');
    }
  }

  /**
   * Create a Bagua diagram (Houtian or Xiantian)
   */
  static createBaguaDiagram(arrangement = 'houtian', activeTrigrams = [], options = {}) {
    const baguaData = arrangement === 'xiantian' 
      ? BaguaCore.XIANTIAN.trigrams 
      : BaguaCore.HOUTIAN.trigrams;

    return {
      version: '2.0',
      type: 'bagua_chart',
      arrangement,
      background: options.background || '#1a1a2e',
      title: options.title || `${arrangement === 'xiantian' ? 'Xiantian' : 'Houtian'} Bagua`,
      layers: [
        {
          name: 'base',
          type: 'base_layer',
          commands: [{
            type: 'bagua',
            cx: 500,
            cy: 500,
            size: 800,
            arrangement,
            showLabels: true,
            style: { stroke: options.stroke || '#D4AF37' }
          }]
        },
        ...(activeTrigrams.length > 0 ? [{
          name: 'highlights',
          type: 'highlight_layer',
          opacity: 0.5,
          commands: activeTrigrams.map(t => {
            const trigram = baguaData.find(tr => tr.name === t);
            return {
              type: 'highlight_sector',
              trigram: t,
              style: {
                fill: (trigram?.color || '#FFD700') + '40',
                stroke: trigram?.color || '#FFD700',
                strokeWidth: 3,
                glow: true
              },
              label: trigram ? {
                text: trigram.zh,
                subtext: arrangement === 'xiantian' ? trigram.spiritual : trigram.lifeArea,
                position: 'outside',
                color: trigram.color
              } : undefined
            };
          })
        }] : [])
      ]
    };
  }

  /**
   * Create a talisman FDL from seal characters
   */
  static createTalismanFDL(sealChars, options = {}) {
    return {
      version: '2.0',
      type: 'talisman',
      background: options.background || '#f5f5dc',
      title: options.title || 'Talisman',
      layers: [
        {
          name: 'talisman_body',
          type: 'talisman_layer',
          commands: [
            ...(options.thunderHeader ? [{ type: 'thunder_header', cx: 500, cy: 180, size: 90, style: { stroke: '#1a0a0a', strokeWidth: 6 } }] : []),
            { type: 'seal_char', x: 500, y: 500, chars: sealChars, size: options.sealSize || 100, style: options.sealStyle || 'cloud' }
          ]
        }
      ]
    };
  }

  /**
   * Create a comparison diagram showing both Houtian and Xiantian
   */
  static createComparisonDiagram(hexagram, options = {}) {
    const upperBinary = hexagram.binary?.substring(0, 3) || '111';
    const lowerBinary = hexagram.binary?.substring(3, 6) || '000';
    
    const binaryToName = {
      '111': 'Qian', '011': 'Dui', '101': 'Li', '001': 'Zhen',
      '000': 'Kun', '100': 'Gen', '010': 'Kan', '110': 'Xun'
    };

    const upper = binaryToName[upperBinary];
    const lower = binaryToName[lowerBinary];

    return {
      houtian: this.createBaguaDiagram('houtian', [upper, lower], { ...options, title: 'Houtian (Manifested)' }),
      xiantian: this.createBaguaDiagram('xiantian', [upper, lower], { ...options, title: 'Xiantian (Primordial)' })
    };
  }

  // Fallback FDL when AI generation fails
  static createFallbackFDL(prompt) {
    return {
      version: '2.0',
      type: 'generic',
      background: '#1a1a2e',
      title: 'Fallback Diagram',
      layers: [{
        name: 'fallback',
        type: 'base_layer',
        commands: [{
          type: 'text',
          x: 500,
          y: 500,
          content: 'FDL Generation Failed',
          size: 40,
          style: { color: '#D4AF37' }
        }]
      }]
    };
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FDLIntegration };
} else {
  window.FDLIntegration = FDLIntegration;
}
