/**
 * ============================================================
 *  FDL Core Library - Fulu Drawing Language v2.0
 * ============================================================
 * 
 *  A reusable, self-contained library for FDL document handling.
 *  This is the GENERAL LIBRARY - no app-specific code.
 * 
 *  Modules:
 *  - FDLSpec: The specification and schema definitions
 *  - FDLValidator: Document validation
 *  - FDLUtils: Utility functions for FDL manipulation
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  FDL SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────

const FDLSpec = {
  version: "2.0",
  description: "Fulu Drawing Language - Daoist diagram specification",

  // Document schema
  documentSchema: {
    version: { type: "string", required: true, default: "2.0" },
    type: { 
      type: "string", 
      required: false, 
      default: "generic",
      enum: ["generic", "talisman", "fengshui_diagram", "taijitu", "bagua_chart", "bazi_chart", "mixed"]
    },
    background: { type: "string", required: false, default: "#1a1a2e" },
    title: { type: "string", required: false },
    arrangement: { type: "string", required: false, enum: ["houtian", "xiantian"] },
    lang: { type: "string", required: false, default: "en", enum: ["en", "zh", "es", "it"] },
    layers: { type: "array", required: true }
  },

  // Layer schema
  layerSchema: {
    name: { type: "string", required: true },
    type: { 
      type: "string", 
      required: false,
      enum: ["base_layer", "highlight_layer", "annotation_layer", "overlay_layer", 
             "talisman_layer", "grid_layer", "symbol_layer"]
    },
    opacity: { type: "number", required: false, default: 1.0, min: 0, max: 1 },
    visible: { type: "boolean", required: false, default: true },
    commands: { type: "array", required: true }
  },

  // Command definitions
  commands: {
    // Primitives
    rect: { params: ['x', 'y', 'w', 'h', 'style'] },
    circle: { params: ['cx', 'cy', 'r', 'style'] },
    arc: { params: ['cx', 'cy', 'r', 'startAngle', 'endAngle', 'style'] },
    path: { params: ['points', 'closed', 'curve', 'style'] },
    polygon: { params: ['points', 'style'] },
    line: { params: ['x1', 'y1', 'x2', 'y2', 'style'] },
    
    // Text
    text: { params: ['x', 'y', 'content', 'size', 'font', 'align', 'baseline', 'style'] },
    
    // Daoist symbols
    taijitu: { params: ['cx', 'cy', 'r', 'yinColor', 'yangColor', 'borderColor'] },
    bagua: { params: ['cx', 'cy', 'size', 'arrangement', 'activeTrigrams', 'showLabels', 'style'] },
    trigram: { params: ['x', 'y', 'binary', 'size', 'orientation', 'style'] },
    
    // Feng Shui
    highlight_sector: { params: ['trigram', 'direction', 'style', 'label'] },
    instruction_marker: { params: ['trigram', 'direction', 'instruction', 'style'] },
    connection_line: { params: ['from', 'to', 'style'] },
    annotation: { params: ['x', 'y', 'position', 'text', 'subtext', 'style'] },
    directional_lines: { params: ['cx', 'cy', 'r', 'style'] },
    
    // Talisman
    seal_char: { params: ['x', 'y', 'chars', 'size', 'style'] },
    thunder_header: { params: ['cx', 'cy', 'size', 'style'] },
    talisman_loop: { params: ['cx', 'cy', 'r', 'style'] },
    
    // Layout
    grid: { params: ['x', 'y', 'w', 'h', 'cols', 'rows', 'style'] }
  },

  // Bagua arrangements
  bagua: {
    houtian: [
      { name: "Li", zh: "離", dir: "S", angle: -90, binary: "101", element: "Fire", color: "#F44336" },
      { name: "Xun", zh: "巽", dir: "SE", angle: -45, binary: "110", element: "Wood", color: "#8BC34A" },
      { name: "Zhen", zh: "震", dir: "E", angle: 0, binary: "001", element: "Wood", color: "#4CAF50" },
      { name: "Gen", zh: "艮", dir: "NE", angle: 45, binary: "100", element: "Earth", color: "#00BCD4" },
      { name: "Kan", zh: "坎", dir: "N", angle: 90, binary: "010", element: "Water", color: "#2196F3" },
      { name: "Qian", zh: "乾", dir: "NW", angle: 135, binary: "111", element: "Metal", color: "#FF9800" },
      { name: "Dui", zh: "兌", dir: "W", angle: 180, binary: "011", element: "Metal", color: "#FFC107" },
      { name: "Kun", zh: "坤", dir: "SW", angle: -135, binary: "000", element: "Earth", color: "#E91E63" }
    ],
    xiantian: [
      { name: "Qian", zh: "乾", dir: "S", angle: -90, binary: "111", element: "Heaven", color: "#FF9800", quality: "Pure Yang" },
      { name: "Dui", zh: "兌", dir: "SE", angle: -45, binary: "011", element: "Metal", color: "#FFC107", quality: "Lake/Joy" },
      { name: "Li", zh: "離", dir: "E", angle: 0, binary: "101", element: "Fire", color: "#F44336", quality: "Fire/Clarity" },
      { name: "Zhen", zh: "震", dir: "NE", angle: 45, binary: "001", element: "Wood", color: "#4CAF50", quality: "Thunder/Arousing" },
      { name: "Kun", zh: "坤", dir: "N", angle: 90, binary: "000", element: "Earth", color: "#E91E63", quality: "Pure Yin" },
      { name: "Gen", zh: "艮", dir: "NW", angle: 135, binary: "100", element: "Earth", color: "#00BCD4", quality: "Mountain/Stillness" },
      { name: "Kan", zh: "坎", dir: "W", angle: 180, binary: "010", element: "Water", color: "#2196F3", quality: "Water/Danger" },
      { name: "Xun", zh: "巽", dir: "SW", angle: -135, binary: "110", element: "Wind", color: "#8BC34A", quality: "Wind/Gentle" }
    ]
  },

  getBagua(arrangement = 'houtian') {
    return this.bagua[arrangement] || this.bagua.houtian;
  },

  getTrigram(name, arrangement = 'houtian') {
    return this.getBagua(arrangement).find(t => t.name === name);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  FDL VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

const FDLValidator = {
  validate(doc) {
    const errors = [];
    
    // Check version
    if (!doc.version) {
      errors.push({ field: 'version', message: 'Version is required' });
    } else if (doc.version !== '2.0') {
      errors.push({ field: 'version', message: 'Version must be "2.0"' });
    }
    
    // Check layers
    if (!Array.isArray(doc.layers)) {
      errors.push({ field: 'layers', message: 'Layers must be an array' });
    } else {
      doc.layers.forEach((layer, i) => {
        if (!layer.name) {
          errors.push({ field: `layers[${i}].name`, message: 'Layer name is required' });
        }
        if (!Array.isArray(layer.commands)) {
          errors.push({ field: `layers[${i}].commands`, message: 'Layer commands must be an array' });
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  FDL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const FDLUtils = {
  createDocument(type = 'generic', options = {}) {
    return {
      version: '2.0',
      type,
      background: options.background || '#1a1a2e',
      title: options.title || '',
      arrangement: options.arrangement || 'houtian',
      lang: options.lang || 'en',
      layers: []
    };
  },

  createLayer(name, type = 'base_layer', options = {}) {
    return {
      name,
      type,
      opacity: options.opacity ?? 1.0,
      visible: options.visible ?? true,
      commands: []
    };
  },

  addCommand(layer, type, params) {
    layer.commands.push({ type, ...params });
    return layer;
  },

  // Merge multiple FDL documents (layers from each)
  merge(docs) {
    const merged = this.createDocument('mixed');
    docs.forEach((doc, i) => {
      if (doc.layers) {
        doc.layers.forEach(layer => {
          merged.layers.push({
            ...layer,
            name: `${layer.name}_doc${i}`
          });
        });
      }
    });
    return merged;
  }
};

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FDLSpec, FDLValidator, FDLUtils };
} else {
  window.FDLCore = { FDLSpec, FDLValidator, FDLUtils };
}
