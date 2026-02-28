/**
 * ============================================================
 *  FDL — Fulu Drawing Language  (Unified Specification v2.0)
 * ============================================================
 *
 *  A single, self-contained drawing language for ALL Daoist
 *  visual artefacts: talismans (fulu), Bagua / Feng-Shui diagrams,
 *  Taijitu, Bazi charts, and any mixed composition.
 *
 *  Design goals
 *  ─────────────
 *  1. One language for everything — no separate FS-DGL or FDL dialects.
 *  2. JSON-serialisable, AI-generatable, human-readable.
 *  3. Renderer-agnostic — the spec says *what*, the renderer decides *how*.
 *  4. Layered composition — every diagram is a stack of named layers.
 *  5. Coordinate system — virtual 1000 × 1000 canvas; (0,0) = top-left.
 *
 *  ╔══════════════════════════════════════════════════════╗
 *  ║  GRAMMAR SUMMARY                                     ║
 *  ║  FDL document = {                                    ║
 *  ║    version, type, background,                        ║
 *  ║    title?, arrangement?, lang?,                      ║
 *  ║    layers: [ Layer, ... ]                            ║
 *  ║  }                                                   ║
 *  ║  Layer  = { name, opacity?, commands: [ Cmd, ... ] } ║
 *  ║  Cmd    = { type, ...params }                        ║
 *  ╚══════════════════════════════════════════════════════╝
 *
 *  This file is the canonical specification and is imported
 *  by both the renderer and the AI prompt builder.
 */

"use strict";

// ─────────────────────────────────────────────────────────────────────────────
//  CORE DOCUMENT SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const FDL_SPEC = {

  version: "2.0",
  description: "Unified Fulu Drawing Language — covers talismans, Bagua, Taijitu, Bazi, and Feng-Shui diagrams",

  // ── Document root ──────────────────────────────────────────────────────────
  documentSchema: {
    version:     { type: "string",  required: true,  example: "2.0",
                   description: "Always '2.0' for this spec." },
    type:        { type: "string",  required: false, default: "generic",
                   enum: ["generic","talisman","fengshui_diagram","taijitu",
                          "bagua_chart","bazi_chart","mixed"],
                   description: "Semantic type of the diagram. Affects default rendering hints." },
    background:  { type: "string",  required: false, default: "#1a1a2e",
                   description: "CSS colour for the canvas background." },
    title:       { type: "string",  required: false,
                   description: "Human-readable title shown in the UI." },
    arrangement: { type: "string",  required: false,
                   enum: ["houtian","xiantian"],
                   description: "Bagua arrangement: 'houtian' (Later Heaven) or 'xiantian' (Early Heaven). Only relevant when a 'bagua' command is present." },
    lang:        { type: "string",  required: false, default: "en",
                   enum: ["en","zh","es","it"],
                   description: "Primary display language for auto-generated labels." },
    layers:      { type: "array",   required: true,
                   description: "Ordered list of Layer objects, rendered back-to-front." }
  },

  // ── Layer schema ───────────────────────────────────────────────────────────
  layerSchema: {
    name:     { type: "string",  required: true,
                description: "Unique identifier for the layer (e.g. 'background', 'bagua_base', 'sector_highlights')." },
    type:     { type: "string",  required: false,
                enum: ["base_layer","highlight_layer","annotation_layer","overlay_layer",
                       "talisman_layer","grid_layer","symbol_layer"],
                description: "Optional semantic hint for the renderer." },
    opacity:  { type: "number",  required: false, default: 1.0, min: 0, max: 1,
                description: "Layer-level opacity applied after all commands are drawn." },
    visible:  { type: "boolean", required: false, default: true,
                description: "Set false to hide the layer without removing it." },
    commands: { type: "array",   required: true,
                description: "Ordered list of drawing commands." }
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  COMMAND CATALOGUE
  //  All coordinates are in the 1000 × 1000 virtual canvas space.
  //  Style objects are always optional; sensible defaults are applied.
  // ─────────────────────────────────────────────────────────────────────────
  commands: {

    // ── Primitive shapes ────────────────────────────────────────────────────

    rect: {
      description: "Axis-aligned rectangle.",
      params: {
        x: "number — left edge", y: "number — top edge",
        w: "number — width",    h: "number — height",
        style: "StyleObject?"
      },
      example: { type:"rect", x:100, y:100, w:200, h:150,
                 style:{ fill:"#FFD700", stroke:"#000", strokeWidth:2, radius:8 } }
    },

    circle: {
      description: "Circle centred at (cx, cy).",
      params: {
        cx:"number", cy:"number", r:"number — radius",
        style:"StyleObject?"
      },
      example: { type:"circle", cx:500, cy:500, r:80,
                 style:{ fill:"#8BC34A40", stroke:"#8BC34A", strokeWidth:3 } }
    },

    arc: {
      description: "Arc or partial ring.",
      params: {
        cx:"number", cy:"number", r:"number",
        startAngle:"number — radians", endAngle:"number — radians",
        counterclockwise:"boolean? default false",
        style:"StyleObject?"
      },
      example: { type:"arc", cx:500, cy:500, r:100, startAngle:-1.5708, endAngle:0,
                 style:{ stroke:"#F44336", strokeWidth:4, fill:"none" } }
    },

    path: {
      description: "Polyline or smooth curve through a list of points.",
      params: {
        points:"Array<[x,y]> — at least 2 points",
        closed:"boolean? — close the path back to start",
        style:"StyleObject?",
        curve:"string? — 'straight' | 'smooth' | 'wavy' | 'fluid'"
      },
      example: { type:"path",
                 points:[[200,300],[400,200],[600,400],[800,300]],
                 curve:"smooth",
                 style:{ stroke:"#D4AF37", strokeWidth:3, fill:"none" } }
    },

    polygon: {
      description: "Closed polygon (convenience wrapper over path with closed:true).",
      params: { points:"Array<[x,y]>", style:"StyleObject?" },
      example: { type:"polygon",
                 points:[[500,100],[700,700],[300,700]],
                 style:{ fill:"#FF000030", stroke:"#FF0000", strokeWidth:2 } }
    },

    line: {
      description: "Single straight line segment.",
      params: { x1:"number", y1:"number", x2:"number", y2:"number", style:"StyleObject?" },
      example: { type:"line", x1:100, y1:100, x2:900, y2:900,
                 style:{ stroke:"#ffffff", strokeWidth:1, dash:[8,4] } }
    },

    // ── Text & glyphs ────────────────────────────────────────────────────────

    text: {
      description: "Render a string at (x, y). Use for Chinese characters, labels, etc.",
      params: {
        x:"number", y:"number",
        content:"string — the text to render",
        size:"number — font size in virtual px (default 40)",
        font:"string? — 'default' | 'noto-serif-sc' | 'vertical' | 'worm' | 'seal'",
        align:"string? — 'left'|'center'|'right' (default 'center')",
        baseline:"string? — 'top'|'middle'|'bottom' (default 'middle')",
        style:"StyleObject?"
      },
      example: { type:"text", x:500, y:200, content:"太極", size:80,
                 font:"noto-serif-sc", style:{ color:"#D4AF37" } }
    },

    // ── Composite Daoist shapes ──────────────────────────────────────────────

    taijitu: {
      description: "Draw a Taijitu (Yin-Yang symbol) centred at (cx, cy). Uses the diametric S-curve construction.",
      params: {
        cx:"number", cy:"number",
        r:"number — radius",
        yinColor:"string? — default '#000000'",
        yangColor:"string? — default '#FFFFFF'",
        borderColor:"string? — stroke colour for outer ring"
      },
      example: { type:"taijitu", cx:500, cy:500, r:120,
                 yinColor:"#000", yangColor:"#fff", borderColor:"#D4AF37" }
    },

    bagua: {
      description: "Draw a full Bagua octagram with trigram lines and labels. Arrangement is set at the document level.",
      params: {
        cx:"number — centre x (default 500)", cy:"number — centre y (default 500)",
        size:"number — outer diameter (default 900)",
        arrangement:"string? — 'houtian'|'xiantian' — overrides document-level setting",
        activeTrigrams:"Array<string>? — trigram names to highlight (e.g. ['Li','Xun'])",
        showLabels:"boolean? (default true)",
        showCompass:"boolean? (default true)",
        showBranches:"boolean? (default true)",
        style:"StyleObject?"
      },
      example: { type:"bagua", cx:500, cy:500, size:900,
                 activeTrigrams:["Li","Xun"], style:{ stroke:"#D4AF37" } }
    },

    trigram: {
      description: "Draw a single trigram glyph (three lines) at position (x,y).",
      params: {
        x:"number", y:"number",
        binary:"string — 3-char e.g. '101' (1=yang, 0=yin)",
        size:"number? — total height (default 60)",
        orientation:"string? — 'horizontal'|'vertical' (default horizontal)",
        style:"StyleObject?"
      },
      example: { type:"trigram", x:500, y:400, binary:"101", size:70,
                 style:{ stroke:"#F44336", strokeWidth:3 } }
    },

    // ── Feng-Shui diagram commands ─────────────────────────────────────────

    highlight_sector: {
      description: "Colour-fill and optionally label a Bagua sector (pie-slice). Requires a bagua command on a lower layer.",
      params: {
        trigram:"string — trigram name (Li|Kun|Dui|Qian|Kan|Gen|Zhen|Xun)",
        direction:"string? — alternative to trigram: N|NE|E|SE|S|SW|W|NW",
        style:{
          fill:"string? — RGBA fill",
          stroke:"string? — border colour",
          strokeWidth:"number?",
          glow:"boolean?",
          glowColor:"string?",
          glowRadius:"number?"
        },
        label:{
          text:"string?",
          subtext:"string?",
          position:"string? — 'inside'|'outside'|'radial'",
          fontSize:"number?",
          color:"string?"
        }
      },
      example: { type:"highlight_sector", trigram:"Xun",
                 style:{ fill:"#8BC34A30", stroke:"#8BC34A", strokeWidth:3, glow:true, glowColor:"#8BC34A" },
                 label:{ text:"Wealth", subtext:"Wood · Xun", position:"outside", color:"#8BC34A" } }
    },

    instruction_marker: {
      description: "Place a shaped marker inside a Bagua sector with an instruction tooltip.",
      params: {
        trigram:"string", direction:"string?",
        instruction:{
          type:"string — 'activate'|'suppress'|'balance'|'enhance'|'avoid'|'protect'",
          text:"string",
          icon:"string?"
        },
        style:{
          markerType:"string — 'circle'|'triangle'|'star'|'arrow'|'diamond'",
          color:"string", size:"number"
        }
      },
      example: { type:"instruction_marker", trigram:"Li",
                 instruction:{ type:"enhance", text:"🕯️ Add candles here" },
                 style:{ markerType:"star", color:"#F44336", size:25 } }
    },

    connection_line: {
      description: "Draw an annotated line between two Bagua sectors.",
      params: {
        from:"string — trigram name or direction",
        to:"string — trigram name or direction",
        style:{ color:"string?", strokeWidth:"number?", dash:"Array?", arrow:"boolean?" }
      },
      example: { type:"connection_line", from:"Xun", to:"Li",
                 style:{ color:"#FFD700", strokeWidth:2, arrow:true } }
    },

    annotation: {
      description: "Free-floating text annotation, optionally with a background box.",
      params: {
        x:"number? — or use position keyword",
        y:"number?",
        position:"string? — 'center'|'top'|'bottom'|'topleft'|'topright'",
        text:"string",
        subtext:"string?",
        style:{ fontSize:"number?", color:"string?", align:"string?",
                background:"string?", padding:"number?", radius:"number?" }
      },
      example: { type:"annotation", position:"bottom",
                 text:"Southeast Activation",
                 subtext:"Enhance with water features or plants",
                 style:{ fontSize:16, color:"#D4AF37", background:"#1a1a2e99" } }
    },

    // ── Talisman-specific commands ────────────────────────────────────────

    seal_char: {
      description: "Render one or more characters in stylised 'seal script' (篆書) style for talisman bodies.",
      params: {
        x:"number", y:"number",
        chars:"Array<string> — list of Chinese characters",
        size:"number?",
        style:"string? — 'default'|'cloud'|'thunder'|'worm'|'bird'|'shangqing'"
      },
      example: { type:"seal_char", x:500, y:400, chars:["太","平","符"], size:100, style:"cloud" }
    },

    thunder_header: {
      description: "Draws the classic Thunder V-header found on many Zhengyi talismans (三尖狀).",
      params: { cx:"number", cy:"number", size:"number?", style:"StyleObject?" },
      example: { type:"thunder_header", cx:500, cy:200, size:80, style:{ stroke:"#000", strokeWidth:6 } }
    },

    talisman_loop: {
      description: "Draws a closed 'cloud loop' used in the body of many fulu.",
      params: { cx:"number", cy:"number", r:"number?", style:"StyleObject?" },
      example: { type:"talisman_loop", cx:500, cy:350, r:35, style:{ stroke:"#000", strokeWidth:5 } }
    },

    // ── Layout helpers ────────────────────────────────────────────────────

    grid: {
      description: "Draw a regular grid of lines (useful for Jiugong / Nine Palaces diagrams).",
      params: {
        x:"number", y:"number", w:"number", h:"number",
        cols:"number", rows:"number",
        style:"StyleObject?"
      },
      example: { type:"grid", x:100, y:100, w:800, h:800, cols:3, rows:3,
                 style:{ stroke:"#ffffff30", strokeWidth:1 } }
    },

    directional_lines: {
      description: "Draw 8 radial lines from a centre point representing the 8 directions.",
      params: {
        cx:"number", cy:"number",
        r:"number — line length",
        style:"StyleObject?"
      },
      example: { type:"directional_lines", cx:500, cy:500, r:400,
                 style:{ stroke:"#ffffff20", strokeWidth:1, dash:[4,4] } }
    }

  }, // end commands

  // ─────────────────────────────────────────────────────────────────────────
  //  STYLE OBJECT
  // ─────────────────────────────────────────────────────────────────────────
  styleObject: {
    fill:         "string? — CSS colour (including rgba). Use 'none' for transparent.",
    stroke:       "string? — CSS colour for outlines.",
    strokeWidth:  "number? — line thickness in virtual px.",
    dash:         "Array<number>? — dash pattern e.g. [8,4].",
    color:        "string? — alias for stroke AND fill on text commands.",
    opacity:      "number? — override for this element (0–1).",
    radius:       "number? — border-radius for rects.",
    glow:         "boolean? — add drop-shadow glow effect.",
    glowColor:    "string?",
    glowRadius:   "number?",
    shadow:       "boolean?",
    shadowColor:  "string?",
    shadowBlur:   "number?",
    curve:        "string? — for path: 'straight'|'smooth'|'wavy'|'fluid'"
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  BAGUA REFERENCE (Houtian / Later Heaven 後天八卦)
  //  Angles in canvas degrees: South = −90°, East = 0°, North = +90°, West = ±180°
  // ─────────────────────────────────────────────────────────────────────────
  houtianBagua: [
    { name:"Li",   zh:"離", dir:"S",  angleDeg:-90,  binary:"101", element:"Fire",  color:"#F44336", number:9,  lifeArea:"Fame & Reputation"     },
    { name:"Xun",  zh:"巽", dir:"SE", angleDeg:-45,  binary:"110", element:"Wood",  color:"#8BC34A", number:4,  lifeArea:"Wealth & Abundance"     },
    { name:"Zhen", zh:"震", dir:"E",  angleDeg:0,    binary:"001", element:"Wood",  color:"#4CAF50", number:3,  lifeArea:"Family & Health"         },
    { name:"Gen",  zh:"艮", dir:"NE", angleDeg:45,   binary:"100", element:"Earth", color:"#00BCD4", number:8,  lifeArea:"Knowledge & Wisdom"      },
    { name:"Kan",  zh:"坎", dir:"N",  angleDeg:90,   binary:"010", element:"Water", color:"#2196F3", number:1,  lifeArea:"Career & Life Path"      },
    { name:"Qian", zh:"乾", dir:"NW", angleDeg:135,  binary:"111", element:"Metal", color:"#FF9800", number:6,  lifeArea:"Helpful People & Travel" },
    { name:"Dui",  zh:"兌", dir:"W",  angleDeg:180,  binary:"011", element:"Metal", color:"#FFC107", number:7,  lifeArea:"Children & Creativity"   },
    { name:"Kun",  zh:"坤", dir:"SW", angleDeg:-135, binary:"000", element:"Earth", color:"#E91E63", number:2,  lifeArea:"Love & Relationships"    }
  ],

  // ─────────────────────────────────────────────────────────────────────────
  //  BAGUA REFERENCE (Xiantian / Early Heaven 先天八卦)
  //  The primordial arrangement before the "fall" into the manifested world.
  //  Used for: congenital nature, spiritual cultivation, inner alchemy (neidan)
  //  
  //  Key differences from Houtian:
  //  - Qian (Heaven) at South (top) - pure Yang
  //  - Kun (Earth) at North (bottom) - pure Yin
  //  - Elemental opposites face each other across the center
  //  - Used for spiritual/natal analysis vs manifested/life situations
  // ─────────────────────────────────────────────────────────────────────────
  xiantianBagua: [
    { name:"Qian", zh:"乾", dir:"S",  angleDeg:-90,  binary:"111", element:"Heaven", color:"#FF9800", number:6,  quality:"Pure Yang", spiritualAspect:"Spirit / Shen", trigram:"☰" },
    { name:"Dui",  zh:"兌", dir:"SE", angleDeg:-45,  binary:"011", element:"Metal",  color:"#FFC107", number:7,  quality:"Lake/Joy", spiritualAspect:"Soul / Hun", trigram:"☱" },
    { name:"Li",   zh:"離", dir:"E",  angleDeg:0,    binary:"101", element:"Fire",   color:"#F44336", number:9,  quality:"Fire/Clarity", spiritualAspect:"Intention / Yi", trigram:"☲" },
    { name:"Zhen", zh:"震", dir:"NE", angleDeg:45,   binary:"001", element:"Wood",   color:"#4CAF50", number:3,  quality:"Thunder/Arousing", spiritualAspect:"Will / Zhi", trigram:"☳" },
    { name:"Kun",  zh:"坤", dir:"N",  angleDeg:90,   binary:"000", element:"Earth",  color:"#E91E63", number:2,  quality:"Pure Yin", spiritualAspect:"Body / Jing", trigram:"☷" },
    { name:"Gen",  zh:"艮", dir:"NW", angleDeg:135,  binary:"100", element:"Earth",  color:"#00BCD4", number:8,  quality:"Mountain/Stillness", spiritualAspect:"Intuition / Po", trigram:"☶" },
    { name:"Kan",  zh:"坎", dir:"W",  angleDeg:180,  binary:"010", element:"Water",  color:"#2196F3", number:1,  quality:"Water/Danger", spiritualAspect:"Vitality / Jing", trigram:"☵" },
    { name:"Xun",  zh:"巽", dir:"SW", angleDeg:-135, binary:"110", element:"Wind",   color:"#8BC34A", number:4,  quality:"Wind/Gentle", spiritualAspect:"Breath / Qi", trigram:"☴" }
  ],

  // Helper to get bagua by arrangement
  getBagua(arrangement = 'houtian') {
    return arrangement === 'xiantian' ? this.xiantianBagua : this.houtianBagua;
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  COMPLETE EXAMPLE DOCUMENTS
  // ─────────────────────────────────────────────────────────────────────────
  examples: {

    // ── 1. Minimal talisman ───────────────────────────────────────────────
    simpleTalisman: {
      version: "2.0", type: "talisman", background: "#fffef0",
      title: "Simple Peace Talisman",
      layers: [
        {
          name: "body", type: "talisman_layer",
          commands: [
            { type:"thunder_header", cx:500, cy:180, size:90, style:{ stroke:"#1a0a0a", strokeWidth:6 } },
            { type:"talisman_loop", cx:500, cy:330, r:40, style:{ stroke:"#000", strokeWidth:5 } },
            { type:"talisman_loop", cx:500, cy:430, r:40, style:{ stroke:"#000", strokeWidth:5 } },
            { type:"talisman_loop", cx:500, cy:530, r:40, style:{ stroke:"#000", strokeWidth:5 } },
            { type:"seal_char", x:500, y:720, chars:["太","平","符"], size:110, style:"cloud" }
          ]
        }
      ]
    },

    // ── 2. Feng-Shui wealth activation ───────────────────────────────────
    wealthActivation: {
      version: "2.0", type: "fengshui_diagram", background: "#1a1a2e",
      title: "SE Wealth Activation (Xun)",
      arrangement: "houtian",
      layers: [
        { name:"base",   type:"base_layer",
          commands:[ { type:"bagua", cx:500, cy:500, size:900 } ] },
        { name:"grid",   type:"grid_layer",
          commands:[ { type:"directional_lines", cx:500, cy:500, r:420,
                       style:{ stroke:"#ffffff15", strokeWidth:1 } } ] },
        { name:"highlight", type:"highlight_layer", opacity:0.6,
          commands:[
            { type:"highlight_sector", trigram:"Xun",
              style:{ fill:"#8BC34A35", stroke:"#8BC34A", strokeWidth:4, glow:true, glowColor:"#8BC34A", glowRadius:20 },
              label:{ text:"Wealth", subtext:"木 Wood · 東南 SE", position:"outside", color:"#8BC34A" } }
          ] },
        { name:"markers", type:"overlay_layer",
          commands:[
            { type:"instruction_marker", trigram:"Xun",
              instruction:{ type:"enhance", text:"💰 Citrine + money plant" },
              style:{ markerType:"star", color:"#8BC34A", size:28 } }
          ] },
        { name:"title",  type:"annotation_layer",
          commands:[
            { type:"annotation", position:"top",
              text:"Wealth Sector — Southeast",
              subtext:"Add citrine, lucky bamboo, or an inward-flowing fountain",
              style:{ fontSize:15, color:"#8BC34A", background:"#0a0a1a99" } }
          ] }
      ]
    },

    // ── 3. Taijitu with Bagua surround ────────────────────────────────────
    taijituDiagram: {
      version: "2.0", type: "bagua_chart", background: "#0a0a1a",
      title: "Taijitu within Bagua",
      arrangement: "houtian",
      layers: [
        { name:"bagua", type:"base_layer",
          commands:[ { type:"bagua", cx:500, cy:500, size:880 } ] },
        { name:"symbol", type:"symbol_layer",
          commands:[ { type:"taijitu", cx:500, cy:500, r:110,
                       yinColor:"#000", yangColor:"#fff", borderColor:"#D4AF37" } ] }
      ]
    },

    // ── 4. Five-Thunder exorcism talisman ────────────────────────────────
    fiveThunderTalisman: {
      version: "2.0", type: "talisman", background: "#FFD700",
      title: "Five Thunders Talisman (Tianshi Wulei Fu)",
      layers: [
        { name:"dragon_qi", type:"talisman_layer", opacity:0.3,
          commands:[
            { type:"path", points:[[200,400],[500,300],[800,500],[500,700],[200,800],[400,600]],
              curve:"wavy", style:{ strokeWidth:2, stroke:"#808080" } }
          ] },
        { name:"bagua_header", type:"talisman_layer",
          commands:[
            { type:"bagua", cx:500, cy:150, size:220, showBranches:false, showCompass:false,
              style:{ stroke:"#FFA500" } },
            { type:"taijitu", cx:500, cy:150, r:55, yinColor:"#000", yangColor:"#fff", borderColor:"#FFA500" }
          ] },
        { name:"cloud_script", type:"talisman_layer",
          commands:[
            { type:"thunder_header", cx:500, cy:280, size:90, style:{ stroke:"#000", strokeWidth:6 } },
            { type:"talisman_loop", cx:500, cy:360, r:35, style:{ stroke:"#000", strokeWidth:6 } },
            { type:"talisman_loop", cx:500, cy:450, r:35, style:{ stroke:"#000", strokeWidth:6 } },
            { type:"talisman_loop", cx:500, cy:540, r:35, style:{ stroke:"#000", strokeWidth:6 } },
            { type:"seal_char", x:280, y:660, chars:["雷"], size:100, style:"thunder" },
            { type:"seal_char", x:500, y:720, chars:["雷"], size:100, style:"thunder" },
            { type:"seal_char", x:720, y:660, chars:["雷"], size:100, style:"thunder" },
            { type:"seal_char", x:360, y:840, chars:["雷"], size:100, style:"thunder" },
            { type:"seal_char", x:640, y:840, chars:["雷"], size:100, style:"thunder" }
          ] }
      ]
    },

    // ── 5. Nine-Palaces (Jiugong) talisman grid ──────────────────────────
    jiugongGrid: {
      version: "2.0", type: "mixed", background: "#fff8e1",
      title: "Eight Archivists — Jiugong Grid",
      layers: [
        { name:"grid_lines", type:"base_layer",
          commands:[
            { type:"grid", x:100, y:100, w:800, h:800, cols:3, rows:3,
              style:{ stroke:"#1a0a0a80", strokeWidth:2 } }
          ] },
        { name:"seals", type:"talisman_layer",
          commands:[
            // Eight directional positions + empty center
            { type:"text", x:500, y:145, content:"北", size:70, font:"noto-serif-sc",
              style:{ color:"#2196F3" } },
            { type:"text", x:167, y:145, content:"東北", size:55, style:{ color:"#00BCD4" } },
            { type:"text", x:833, y:145, content:"東北\u200b", size:55, style:{ color:"#00BCD4" } },
            { type:"text", x:167, y:500, content:"西", size:70, font:"noto-serif-sc",
              style:{ color:"#FFC107" } },
            { type:"text", x:833, y:500, content:"東", size:70, font:"noto-serif-sc",
              style:{ color:"#4CAF50" } },
            { type:"text", x:500, y:500, content:"中", size:80, font:"noto-serif-sc",
              style:{ color:"#D4AF37" } },
            { type:"text", x:167, y:855, content:"西南", size:55, style:{ color:"#E91E63" } },
            { type:"text", x:500, y:855, content:"南", size:70, font:"noto-serif-sc",
              style:{ color:"#F44336" } },
            { type:"text", x:833, y:855, content:"西北", size:55, style:{ color:"#FF9800" } }
          ] }
      ]
    }

  }, // end examples

  // ─────────────────────────────────────────────────────────────────────────
  //  AI GENERATION GUIDELINES
  //  Included verbatim in the system prompt for the fdl-generate endpoint.
  // ─────────────────────────────────────────────────────────────────────────
  aiGenerationGuidelines: `
You are an FDL (Fulu Drawing Language v2.0) diagram generator.

RULES — follow ALL of them:
1. Output ONLY a valid JSON object matching the FDL v2.0 schema. No extra text.
2. Coordinates use a 1000×1000 virtual canvas; (0,0) = top-left.
3. All angles are in RADIANS unless inside a "style" or "label" field (where degrees are accepted).
4. For Feng-Shui diagrams: set type="fengshui_diagram" and arrangement="houtian".
   The Houtian Bagua has South (Li/Fire) at the TOP of the canvas (angle −90°).
5. For talismans: set type="talisman".
6. Always include a "bagua" command on the base layer before any highlight_sector commands.
7. Colours must be valid CSS hex or rgba strings.
8. The "layers" array is rendered bottom-to-top (first = furthest back).
9. Use the "taijitu" command (not a Unicode ☯ text) when a yin-yang symbol is requested.
10. Trigram names for highlight_sector: Li, Xun, Zhen, Gen, Kan, Qian, Dui, Kun.

HOUTIAN SECTOR → LIFE AREA MAP:
  Li/S  → Fame & Reputation | Xun/SE → Wealth & Abundance | Zhen/E → Family & Health
  Gen/NE → Knowledge & Wisdom | Kan/N → Career & Life Path | Qian/NW → Helpful People & Travel
  Dui/W → Children & Creativity | Kun/SW → Love & Relationships | Center → Health & Unity

ELEMENT COLOURS: Fire=#F44336  Wood=#4CAF50  Water=#2196F3  Metal=#FFC107  Earth=#FFB74D
`.trim()

}; // end FDL_SPEC

// ─────────────────────────────────────────────────────────────────────────────
//  VALIDATION HELPERS (lightweight, no external deps)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a list of validation errors for an FDL document, or [] if valid.
 * @param {object} doc
 * @returns {string[]}
 */
function validateFDL(doc) {
  const errors = [];
  if (!doc || typeof doc !== "object") { errors.push("Document must be a plain object."); return errors; }
  if (!doc.version) errors.push("Missing required field: version");
  if (!Array.isArray(doc.layers)) { errors.push("Missing required field: layers (must be array)"); return errors; }
  doc.layers.forEach((layer, li) => {
    if (!layer.name) errors.push(`Layer[${li}]: missing 'name'`);
    if (!Array.isArray(layer.commands)) errors.push(`Layer[${li}] '${layer.name}': 'commands' must be an array`);
    else layer.commands.forEach((cmd, ci) => {
      if (!cmd.type) errors.push(`Layer[${li}] cmd[${ci}]: missing 'type'`);
      else if (!FDL_SPEC.commands[cmd.type])
        errors.push(`Layer[${li}] cmd[${ci}]: unknown command type '${cmd.type}'`);
    });
  });
  return errors;
}

/**
 * Migrate a legacy FDL v1 or FS-DGL document to FDL v2.
 * - v1 FDL had "symbol" commands with content:"yinyang" → becomes "taijitu"
 * - FS-DGL had a separate trigrams[] → ignored (bagua command handles it)
 * @param {object} doc
 * @returns {object} new FDL v2 document
 */
function migrateLegacyFDL(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const out = { ...doc, version: "2.0" };

  // Ensure layers exist
  if (!Array.isArray(out.layers)) out.layers = [];

  out.layers = out.layers.map(layer => {
    const cmds = (layer.commands || []).map(cmd => {
      // Legacy "symbol" with content:"yinyang" → taijitu
      if (cmd.type === "symbol" && cmd.content === "yinyang") {
        return {
          type: "taijitu",
          cx: cmd.x ?? 500, cy: cmd.y ?? 500, r: (cmd.size ?? 100) / 2,
          borderColor: cmd.color ?? cmd.style?.color ?? "#D4AF37"
        };
      }
      // Legacy fengshui "bagua" command: pass through (already compatible)
      return cmd;
    });
    return { ...layer, commands: cmds };
  });

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== "undefined") {
  module.exports = { FDL_SPEC, validateFDL, migrateLegacyFDL };
}
