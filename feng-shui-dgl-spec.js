/**
 * Feng Shui Diagram Graphics Language (FS-DGL) Specification v1.0
 * 
 * This specification defines a specialized extension to FDL (Fulu Drawing Language)
 * for rendering interactive Feng Shui Bagua diagrams with highlighting, labeling,
 * and instructional overlays.
 * 
 * Key Features:
 * - Trigram highlighting based on directional instructions
 * - Dynamic labeling of Bagua sectors
 * - Instruction overlays with visual indicators
 * - Element-based color coding
 * - Support for both Later Heaven (Houtian) and Early Heaven (Xiantian) arrangements
 */

const FENG_SHUI_DGL_SPEC = {
    version: "1.0",
    description: "Feng Shui Bagua Diagram Graphics Language Specification",
    
    // ============================================================================
    // 1. CORE STRUCTURE
    // ============================================================================
    
    structure: {
        type: "fengshui_diagram",
        arrangement: "houtian", // "houtian" (Later Heaven) or "xiantian" (Early Heaven)
        size: { w: 1000, h: 1000 },
        background: "#1a1a2e",
        
        layers: [
            // Layer 0: Base Bagua
            {
                name: "bagua_base",
                type: "base_layer",
                commands: [
                    { type: "bagua", x: 500, y: 500, size: 800, style: { arrangement: "houtian" } }
                ]
            },
            
            // Layer 1: Directional Grid
            {
                name: "directional_grid",
                type: "grid_layer",
                commands: [
                    // 8 directional lines
                    { type: "directional_lines", center: [500, 500], radius: 400 }
                ]
            },
            
            // Layer 2: Sector Highlights
            {
                name: "sector_highlights",
                type: "highlight_layer",
                opacity: 0.4,
                commands: [] // Populated dynamically based on instructions
            },
            
            // Layer 3: Labels & Annotations
            {
                name: "labels",
                type: "annotation_layer",
                commands: [] // Populated dynamically
            },
            
            // Layer 4: Instructions & Indicators
            {
                name: "instruction_overlay",
                type: "overlay_layer",
                commands: [] // Populated dynamically
            }
        ]
    },
    
    // ============================================================================
    // 2. TRIGRAM DEFINITIONS (Later Heaven - Houtian)
    // ============================================================================
    // Houtian (Later Heaven) 後天八卦 arrangement — SOUTH at TOP (canvas coordinate system)
    // Canvas: (0,0) is top-left, y increases downward.
    // Angles are in degrees using canvas convention:
    //   -90° = top (South), 0° = right (East), 90° = bottom (North), ±180° = left (West)
    //
    //  South (Li/Fire)     at top    (-90°)
    //  North (Kan/Water)   at bottom  (90°)
    //  East  (Zhen/Thunder) at right   (0°)
    //  West  (Dui/Lake)    at left   (180°)
    //  SE    (Xun/Wind)    top-right  (-45°)
    //  SW    (Kun/Earth)   top-left   (-135°)
    //  NE    (Gen/Mountain) bottom-right (45°)
    //  NW    (Qian/Heaven) bottom-left  (135°)

    trigrams: {
        houtian: [
            {
                name: "Li",
                chinese: "離",
                direction: "S",
                angle: -90,   // Top of canvas  (South)
                element: "Fire",
                color: "#F44336",
                binary: [1, 0, 1],
                position: { x: 500, y: 150 }   // Top center
            },
            {
                name: "Xun",
                chinese: "巽",
                direction: "SE",
                angle: -45,   // Top-right  (South-East)
                element: "Wood",
                color: "#8BC34A",
                binary: [1, 1, 0],
                position: { x: 850, y: 150 }   // Top right
            },
            {
                name: "Zhen",
                chinese: "震",
                direction: "E",
                angle: 0,     // Right  (East)
                element: "Wood",
                color: "#4CAF50",
                binary: [0, 0, 1],
                position: { x: 850, y: 500 }   // Right center
            },
            {
                name: "Gen",
                chinese: "艮",
                direction: "NE",
                angle: 45,    // Bottom-right  (North-East)
                element: "Earth",
                color: "#00BCD4",
                binary: [1, 0, 0],
                position: { x: 850, y: 850 }   // Bottom right
            },
            {
                name: "Kan",
                chinese: "坎",
                direction: "N",
                angle: 90,    // Bottom of canvas  (North)
                element: "Water",
                color: "#2196F3",
                binary: [0, 1, 0],
                position: { x: 500, y: 850 }   // Bottom center
            },
            {
                name: "Qian",
                chinese: "乾",
                direction: "NW",
                angle: 135,   // Bottom-left  (North-West)
                element: "Metal",
                color: "#FF9800",
                binary: [1, 1, 1],
                position: { x: 150, y: 850 }   // Bottom left
            },
            {
                name: "Dui",
                chinese: "兌",
                direction: "W",
                angle: 180,   // Left  (West)
                element: "Metal",
                color: "#FFC107",
                binary: [0, 1, 1],
                position: { x: 150, y: 500 }   // Left center
            },
            {
                name: "Kun",
                chinese: "坤",
                direction: "SW",
                angle: -135,  // Top-left  (South-West)
                element: "Earth",
                color: "#E91E63",
                binary: [0, 0, 0],
                position: { x: 150, y: 150 }   // Top left
            }
        ]
    },
    
    // ============================================================================
    // 3. COMMAND TYPES
    // ============================================================================
    
    commandTypes: {
        // Highlight a specific trigram/sector
        highlightSector: {
            description: "Highlight a Bagua sector with color and optional label",
            parameters: {
                type: "highlight_sector",
                trigram: "String - Trigram name (Li, Kun, Dui, Qian, Kan, Gen, Zhen, Xun)",
                direction: "String - Alternative: direction (S, SW, W, NW, N, NE, E, SE)",
                style: {
                    fill: "Color - Fill color with opacity",
                    stroke: "Color - Border color",
                    strokeWidth: "Number - Border width",
                    glow: "Boolean - Add glow effect",
                    glowColor: "Color - Glow color",
                    glowRadius: "Number - Glow radius"
                },
                label: {
                    text: "String - Label text",
                    subtext: "String - Secondary text",
                    position: "String - 'inside', 'outside', 'radial'",
                    fontSize: "Number",
                    color: "Color"
                }
            }
        },
        
        // Add instruction marker
        instructionMarker: {
            description: "Mark a sector with an instruction indicator",
            parameters: {
                type: "instruction_marker",
                trigram: "String - Target trigram",
                direction: "String - Alternative: direction",
                instruction: {
                    type: "String - 'activate', 'suppress', 'balance', 'enhance', 'avoid'",
                    text: "String - Instruction text",
                    icon: "String - Icon identifier"
                },
                style: {
                    markerType: "String - 'circle', 'triangle', 'star', 'arrow'",
                    color: "Color",
                    size: "Number"
                }
            }
        },
        
        // Add connecting lines between sectors
        connectionLine: {
            description: "Draw connection between two sectors",
            parameters: {
                type: "connection_line",
                from: "String - Source trigram or direction",
                to: "String - Target trigram or direction",
                style: {
                    color: "Color",
                    width: "Number",
                    dash: "Array - Dash pattern",
                    arrow: "Boolean - Add arrowheads"
                }
            }
        },
        
        // Add text annotation
        annotation: {
            description: "Add text annotation to the diagram",
            parameters: {
                type: "annotation",
                position: "String - 'center', 'top', 'bottom', or [x, y]",
                text: "String - Primary text",
                subtext: "String - Secondary text",
                style: {
                    fontSize: "Number",
                    color: "Color",
                    align: "String - 'left', 'center', 'right'",
                    background: "Color - Optional background"
                }
            }
        }
    },
    
    // ============================================================================
    // 4. EXAMPLE USAGE
    // ============================================================================
    
    examples: {
        // Example 1: Highlight Southeast for Wealth Enhancement
        wealthEnhancement: {
            description: "Activate Xun (SE) sector for wealth enhancement",
            layers: [
                {
                    name: "sector_highlights",
                    commands: [
                        {
                            type: "highlight_sector",
                            trigram: "Xun",
                            style: {
                                fill: "#8BC34A40",
                                stroke: "#8BC34A",
                                strokeWidth: 3,
                                glow: true,
                                glowColor: "#8BC34A",
                                glowRadius: 20
                            },
                            label: {
                                text: "Wealth",
                                subtext: "Wood - Xun",
                                position: "outside",
                                fontSize: 14,
                                color: "#8BC34A"
                            }
                        }
                    ]
                },
                {
                    name: "instruction_overlay",
                    commands: [
                        {
                            type: "instruction_marker",
                            trigram: "Xun",
                            instruction: {
                                type: "enhance",
                                text: "Add water element here",
                                icon: "water"
                            },
                            style: {
                                markerType: "star",
                                color: "#2196F3",
                                size: 25
                            }
                        }
                    ]
                },
                {
                    name: "labels",
                    commands: [
                        {
                            type: "annotation",
                            position: "bottom",
                            text: "Southeast Activation",
                            subtext: "Enhance with water features or plants",
                            style: {
                                fontSize: 16,
                                color: "#d4af37",
                                align: "center"
                            }
                        }
                    ]
                }
            ]
        },
        
        // Example 2: Multiple sectors for protection
        protectionLayout: {
            description: "Activate protective sectors (NW, NE, SW, SE corners)",
            layers: [
                {
                    name: "sector_highlights",
                    commands: [
                        {
                            type: "highlight_sector",
                            trigram: "Qian",
                            style: { fill: "#FF980030", stroke: "#FF9800", strokeWidth: 2 }
                        },
                        {
                            type: "highlight_sector",
                            trigram: "Gen",
                            style: { fill: "#00BCD430", stroke: "#00BCD4", strokeWidth: 2 }
                        },
                        {
                            type: "highlight_sector",
                            trigram: "Kun",
                            style: { fill: "#E91E6330", stroke: "#E91E63", strokeWidth: 2 }
                        },
                        {
                            type: "highlight_sector",
                            trigram: "Xun",
                            style: { fill: "#8BC34A30", stroke: "#8BC34A", strokeWidth: 2 }
                        }
                    ]
                },
                {
                    name: "instruction_overlay",
                    commands: [
                        {
                            type: "instruction_marker",
                            trigram: "Qian",
                            instruction: { type: "protect", text: "Metal guardian" },
                            style: { markerType: "circle", color: "#FF9800", size: 20 }
                        },
                        {
                            type: "instruction_marker",
                            trigram: "Gen",
                            instruction: { type: "protect", text: "Earth mountain" },
                            style: { markerType: "triangle", color: "#00BCD4", size: 20 }
                        }
                    ]
                }
            ]
        }
    },

    // ============================================================================
    // 5. BAGUA SECTOR GRAPHICS — FDL rendering spec per sector
    // ============================================================================
    // Each sector entry defines: highlight style, icon positions, remedy symbol list,
    // and the complete FDL overlay for rendering an annotated sector diagram.

    sectorGraphics: {
        // South — Li / Fire / Fame & Reputation
        S: {
            trigram: "Li", element: "Fire", color: "#F44336",
            canvasAngleDeg: -90, position: { x: 500, y: 150 },
            highlight: { fill: "#F4433625", stroke: "#F44336", strokeWidth: 3, glow: true, glowColor: "#FF5252", glowRadius: 25 },
            remedyIcons: ["🕯️", "🏆", "🦚", "🌺"],
            remedyColors: ["#F44336", "#FF7043", "#D32F2F"],
            fdlOverlay: {
                version: "1.0", type: "fengshui_diagram",
                background: "#1a1a2e",
                layers: [
                    { name: "bagua_base", type: "base_layer", commands: [{ type: "bagua", x: 500, y: 500, size: 800 }] },
                    { name: "sector_highlight", opacity: 0.4, commands: [{ type: "highlight_sector", trigram: "Li", style: { fill: "#F4433640", stroke: "#F44336", strokeWidth: 4, glow: true, glowColor: "#FF5252" }, label: { text: "Fame", subtext: "火 Fire · 南 South", position: "outside", fontSize: 14, color: "#F44336" } }] },
                    { name: "remedy_markers", commands: [
                        { type: "instruction_marker", trigram: "Li", instruction: { type: "enhance", text: "🕯️ Candles — Fire element activation" }, style: { markerType: "star", color: "#FF5252", size: 22 } }
                    ]}
                ]
            }
        },
        // Southwest — Kun / Earth / Love & Relationships
        SW: {
            trigram: "Kun", element: "Earth", color: "#E91E63",
            canvasAngleDeg: -135, position: { x: 150, y: 150 },
            highlight: { fill: "#E91E6325", stroke: "#E91E63", strokeWidth: 3, glow: true, glowColor: "#F06292", glowRadius: 25 },
            remedyIcons: ["💕", "🦆", "💎", "🌹"],
            remedyColors: ["#E91E63", "#F06292", "#880E4F"],
            fdlOverlay: {
                version: "1.0", type: "fengshui_diagram", background: "#1a1a2e",
                layers: [
                    { name: "bagua_base", type: "base_layer", commands: [{ type: "bagua", x: 500, y: 500, size: 800 }] },
                    { name: "sector_highlight", opacity: 0.4, commands: [{ type: "highlight_sector", trigram: "Kun", style: { fill: "#E91E6340", stroke: "#E91E63", strokeWidth: 4, glow: true }, label: { text: "Love", subtext: "土 Earth · 西南 SW", position: "outside", fontSize: 14, color: "#E91E63" } }] },
                    { name: "remedy_markers", commands: [{ type: "instruction_marker", trigram: "Kun", instruction: { type: "enhance", text: "💕 Pairs — Mandarin ducks, rose quartz" }, style: { markerType: "circle", color: "#F06292", size: 22 } }] }
                ]
            }
        },
        // West — Dui / Metal / Children & Creativity
        W: {
            trigram: "Dui", element: "Metal", color: "#FFC107",
            canvasAngleDeg: 180, position: { x: 150, y: 500 },
            highlight: { fill: "#FFC10725", stroke: "#FFC107", strokeWidth: 3, glow: true, glowColor: "#FFD54F", glowRadius: 25 },
            remedyIcons: ["⭕", "🔔", "💎", "🌙"],
            remedyColors: ["#FFC107", "#FFD54F", "#F57F17"],
            fdlOverlay: {
                version: "1.0", type: "fengshui_diagram", background: "#1a1a2e",
                layers: [
                    { name: "bagua_base", type: "base_layer", commands: [{ type: "bagua", x: 500, y: 500, size: 800 }] },
                    { name: "sector_highlight", opacity: 0.4, commands: [{ type: "highlight_sector", trigram: "Dui", style: { fill: "#FFC10740", stroke: "#FFC107", strokeWidth: 4, glow: true }, label: { text: "Creativity", subtext: "金 Metal · 西 West", position: "outside", fontSize: 14, color: "#FFC107" } }] },
                    { name: "remedy_markers", commands: [{ type: "instruction_marker", trigram: "Dui", instruction: { type: "enhance", text: "⭕ Round metal objects — Wind chime" }, style: { markerType: "circle", color: "#FFC107", size: 22 } }] }
                ]
            }
        },
        // Northwest — Qian / Metal / Helpful People & Travel
        NW: {
            trigram: "Qian", element: "Metal", color: "#FF9800",
            canvasAngleDeg: 135, position: { x: 150, y: 850 },
            highlight: { fill: "#FF980025", stroke: "#FF9800", strokeWidth: 3, glow: true, glowColor: "#FFCC02", glowRadius: 25 },
            remedyIcons: ["🌐", "🔔", "🦁", "🧭"],
            remedyColors: ["#FF9800", "#FFB300", "#E65100"],
            fdlOverlay: {
                version: "1.0", type: "fengshui_diagram", background: "#1a1a2e",
                layers: [
                    { name: "bagua_base", type: "base_layer", commands: [{ type: "bagua", x: 500, y: 500, size: 800 }] },
                    { name: "sector_highlight", opacity: 0.4, commands: [{ type: "highlight_sector", trigram: "Qian", style: { fill: "#FF980040", stroke: "#FF9800", strokeWidth: 4, glow: true }, label: { text: "Benefactors", subtext: "金 Metal · 西北 NW", position: "outside", fontSize: 14, color: "#FF9800" } }] },
                    { name: "remedy_markers", commands: [{ type: "instruction_marker", trigram: "Qian", instruction: { type: "enhance", text: "🔔 6-rod metal wind chime" }, style: { markerType: "circle", color: "#FFB300", size: 22 } }] }
                ]
            }
        },
        // North — Kan / Water / Career & Life Path
        N: {
            trigram: "Kan", element: "Water", color: "#2196F3",
            canvasAngleDeg: 90, position: { x: 500, y: 850 },
            highlight: { fill: "#2196F325", stroke: "#2196F3", strokeWidth: 3, glow: true, glowColor: "#64B5F6", glowRadius: 25 },
            remedyIcons: ["💧", "🐢", "🌊", "🌀"],
            remedyColors: ["#2196F3", "#64B5F6", "#0D47A1"],
            fdlOverlay: {
                version: "1.0", type: "fengshui_diagram", background: "#1a1a2e",
                layers: [
                    { name: "bagua_base", type: "base_layer", commands: [{ type: "bagua", x: 500, y: 500, size: 800 }] },
                    { name: "sector_highlight", opacity: 0.4, commands: [{ type: "highlight_sector", trigram: "Kan", style: { fill: "#2196F340", stroke: "#2196F3", strokeWidth: 4, glow: true }, label: { text: "Career", subtext: "水 Water · 北 North", position: "outside", fontSize: 14, color: "#2196F3" } }] },
                    { name: "remedy_markers", commands: [{ type: "instruction_marker", trigram: "Kan", instruction: { type: "enhance", text: "💧 Flowing water fountain facing inward" }, style: { markerType: "circle", color: "#2196F3", size: 22 } }] }
                ]
            }
        },
        // Northeast — Gen / Earth / Knowledge & Wisdom
        NE: {
            trigram: "Gen", element: "Earth", color: "#00BCD4",
            canvasAngleDeg: 45, position: { x: 850, y: 850 },
            highlight: { fill: "#00BCD425", stroke: "#00BCD4", strokeWidth: 3, glow: true, glowColor: "#4DD0E1", glowRadius: 25 },
            remedyIcons: ["📚", "🗻", "🔮", "🧘"],
            remedyColors: ["#00BCD4", "#4DD0E1", "#006064"],
            fdlOverlay: {
                version: "1.0", type: "fengshui_diagram", background: "#1a1a2e",
                layers: [
                    { name: "bagua_base", type: "base_layer", commands: [{ type: "bagua", x: 500, y: 500, size: 800 }] },
                    { name: "sector_highlight", opacity: 0.4, commands: [{ type: "highlight_sector", trigram: "Gen", style: { fill: "#00BCD440", stroke: "#00BCD4", strokeWidth: 4, glow: true }, label: { text: "Knowledge", subtext: "土 Earth · 東北 NE", position: "outside", fontSize: 14, color: "#00BCD4" } }] },
                    { name: "remedy_markers", commands: [{ type: "instruction_marker", trigram: "Gen", instruction: { type: "enhance", text: "📚 Books + Amethyst crystal" }, style: { markerType: "triangle", color: "#00BCD4", size: 22 } }] }
                ]
            }
        },
        // East — Zhen / Wood / Family & Health
        E: {
            trigram: "Zhen", element: "Wood", color: "#4CAF50",
            canvasAngleDeg: 0, position: { x: 850, y: 500 },
            highlight: { fill: "#4CAF5025", stroke: "#4CAF50", strokeWidth: 3, glow: true, glowColor: "#81C784", glowRadius: 25 },
            remedyIcons: ["🌿", "🐉", "🌱", "🪵"],
            remedyColors: ["#4CAF50", "#81C784", "#1B5E20"],
            fdlOverlay: {
                version: "1.0", type: "fengshui_diagram", background: "#1a1a2e",
                layers: [
                    { name: "bagua_base", type: "base_layer", commands: [{ type: "bagua", x: 500, y: 500, size: 800 }] },
                    { name: "sector_highlight", opacity: 0.4, commands: [{ type: "highlight_sector", trigram: "Zhen", style: { fill: "#4CAF5040", stroke: "#4CAF50", strokeWidth: 4, glow: true }, label: { text: "Family", subtext: "木 Wood · 東 East", position: "outside", fontSize: 14, color: "#4CAF50" } }] },
                    { name: "remedy_markers", commands: [{ type: "instruction_marker", trigram: "Zhen", instruction: { type: "enhance", text: "🌿 Living green plants — Lucky bamboo" }, style: { markerType: "circle", color: "#4CAF50", size: 22 } }] }
                ]
            }
        },
        // Southeast — Xun / Wood / Wealth & Abundance
        SE: {
            trigram: "Xun", element: "Wood", color: "#8BC34A",
            canvasAngleDeg: -45, position: { x: 850, y: 150 },
            highlight: { fill: "#8BC34A25", stroke: "#8BC34A", strokeWidth: 3, glow: true, glowColor: "#AED581", glowRadius: 25 },
            remedyIcons: ["💰", "🪴", "💎", "🌊"],
            remedyColors: ["#8BC34A", "#AED581", "#33691E"],
            fdlOverlay: {
                version: "1.0", type: "fengshui_diagram", background: "#1a1a2e",
                layers: [
                    { name: "bagua_base", type: "base_layer", commands: [{ type: "bagua", x: 500, y: 500, size: 800 }] },
                    { name: "sector_highlight", opacity: 0.4, commands: [{ type: "highlight_sector", trigram: "Xun", style: { fill: "#8BC34A40", stroke: "#8BC34A", strokeWidth: 4, glow: true, glowColor: "#8BC34A" }, label: { text: "Wealth", subtext: "木 Wood · 東南 SE", position: "outside", fontSize: 14, color: "#8BC34A" } }] },
                    { name: "remedy_markers", commands: [{ type: "instruction_marker", trigram: "Xun", instruction: { type: "enhance", text: "💰 Citrine + money plant + inward fountain" }, style: { markerType: "star", color: "#8BC34A", size: 22 } }] }
                ]
            }
        },
        // Center — Taiji / Earth / Health & Unity
        Center: {
            trigram: "Taiji", element: "Earth", color: "#FFB74D",
            canvasAngleDeg: null, position: { x: 500, y: 500 },
            highlight: { fill: "#FFB74D25", stroke: "#FFB74D", strokeWidth: 2, glow: false },
            remedyIcons: ["☯", "🪨", "🌕", "🏮"],
            remedyColors: ["#FFB74D", "#FFCC80", "#E65100"],
            fdlOverlay: {
                version: "1.0", type: "fengshui_diagram", background: "#1a1a2e",
                layers: [
                    { name: "bagua_base", type: "base_layer", commands: [{ type: "bagua", x: 500, y: 500, size: 800 }] },
                    { name: "center_highlight", opacity: 0.3, commands: [{ type: "circle", cx: 500, cy: 500, r: 160, style: { fill: "#FFB74D20", stroke: "#FFB74D", strokeWidth: 2 } }] },
                    { name: "taijitu", commands: [{ type: "symbol", content: "yinyang", x: 500, y: 500, size: 120, color: "#FFB74D" }] }
                ]
            }
        }
    },

    // ============================================================================
    // 5. HELPER FUNCTIONS FOR DYNAMIC GENERATION
    // ============================================================================
    
    helpers: {
        translations: {
            en: { Fire: "Fire", Earth: "Earth", Metal: "Metal", Water: "Water", Wood: "Wood", S: "South", SW: "Southwest", W: "West", NW: "Northwest", N: "North", NE: "Northeast", E: "East", SE: "Southeast" },
            es: { Fire: "Fuego", Earth: "Tierra", Metal: "Metal", Water: "Agua", Wood: "Madera", S: "Sur", SW: "Suroeste", W: "Oeste", NW: "Noroeste", N: "Norte", NE: "Noreste", E: "Este", SE: "Sureste" },
            it: { Fire: "Fuoco", Earth: "Terra", Metal: "Metallo", Water: "Acqua", Wood: "Legno", S: "Sud", SW: "Sud-ovest", W: "Ovest", NW: "Nord-ovest", N: "Nord", NE: "Nord-est", E: "Est", SE: "Sud-est" },
            zh: { Fire: "火", Earth: "土", Metal: "金", Water: "水", Wood: "木", S: "南", SW: "西南", W: "西", NW: "西北", N: "北", NE: "东北", E: "东", SE: "东南" }
        },

        /**
         * Convert natural language instruction to FS-DGL commands
         * @param {string} instruction - Natural language Feng Shui instruction
         * @param {string} lang - Language code
         * @returns {Array} Array of FS-DGL commands
         */
        parseInstruction(instruction, lang = 'en') {
            const commands = [];
            const lower = instruction.toLowerCase();
            const t = this.translations[lang] || this.translations['en'];

            // Item/remedy keyword list (specific phrases first, generic elements last)
            const ITEM_KEYWORDS = [
                ['water feature', 'Water Feature'], ['water fountain', 'Fountain'],
                ['aquarium', 'Aquarium'], ['fish tank', 'Aquarium'],
                ['lucky bamboo', 'Bamboo'], ['bamboo', 'Bamboo'],
                ['wind chime', 'Wind Chime'], ['wind chimes', 'Wind Chime'],
                ['salt lamp', 'Salt Lamp'], ['himalayan', 'Salt Lamp'],
                ['crystals', 'Crystals'], ['crystal', 'Crystal'],
                ['gemstone', 'Gemstone'], ['amethyst', 'Crystal'],
                ['candles', 'Candles'], ['candle', 'Candle'],
                ['incense', 'Incense'],
                ['mirror', 'Mirror'], ['mirrors', 'Mirror'],
                ['coins', 'Coins'], ['coin', 'Coins'],
                ['bells', 'Bells'], ['bell', 'Bells'],
                ['plants', 'Plants'], ['plant', 'Plants'],
                ['flowers', 'Flowers'], ['flower', 'Flowers'],
                ['fountain', 'Fountain'],
                ['artwork', 'Artwork'], ['painting', 'Artwork'],
                ['symbol', 'Symbol'], ['charm', 'Charm'],
                ['lamp', 'Lamp'], ['light', 'Light'], ['lantern', 'Lantern'],
                ['rug', 'Rug'], ['carpet', 'Rug'],
                ['dragon', 'Dragon'], ['phoenix', 'Phoenix'],
                ['turtle', 'Turtle'], ['tortoise', 'Turtle'],
                ['wood', 'Wood'], ['tree', 'Wood'],
                ['metal', 'Metal'], ['iron', 'Metal'], ['copper', 'Metal'],
                ['earth', 'Earth'], ['stone', 'Stone'], ['rocks', 'Stone'],
                ['water', 'Water'],
                ['fire', 'Fire'], ['flame', 'Fire'],
            ];

            // Extract a short item/remedy keyword from a text snippet
            const extractItemFromText = (text) => {
                const lower = text.toLowerCase();
                for (const [kw, label] of ITEM_KEYWORDS) {
                    if (lower.includes(kw)) return label;
                }
                return null;
            };

            // Translate an extracted English label using the current language's translation table.
            // Element names (Water, Wood, Fire, Metal, Earth) are in the `t` object.
            // Non-element items (Crystals, Bamboo, etc.) fall back to the English label.
            const translateLabel = (label) => {
                if (!label) return null;
                return t[label] || label;
            };

            // Extract the item relevant to a specific direction by searching its clause first,
            // then translate the result to the selected language.
            const extractItemLabel = (instr, dirKeyword) => {
                // Split instruction into sentences/clauses and find the one mentioning this direction
                const clauses = instr.split(/[.;]+/).map(s => s.trim()).filter(Boolean);
                const dirRegex = new RegExp(`\\b${dirKeyword}\\b`, 'i');
                const relevantClause = clauses.find(c => dirRegex.test(c));
                // Try the direction-specific clause first, fall back to the full instruction text
                const englishLabel = extractItemFromText(relevantClause || '') || extractItemFromText(instr);
                return translateLabel(englishLabel);
            };

            // Direction mappings
            const directionMap = {
                'southeast': 'Xun', 'se': 'Xun',
                'south': 'Li', 's': 'Li',
                'southwest': 'Kun', 'sw': 'Kun',
                'west': 'Dui', 'w': 'Dui',
                'northwest': 'Qian', 'nw': 'Qian',
                'north': 'Kan', 'n': 'Kan',
                'northeast': 'Gen', 'ne': 'Gen',
                'east': 'Zhen', 'e': 'Zhen'
            };
            
            // Action mappings
            const actionMap = {
                'activate': { type: 'enhance', color: '#4CAF50' },
                'enhance': { type: 'enhance', color: '#4CAF50' },
                'strengthen': { type: 'enhance', color: '#4CAF50' },
                'suppress': { type: 'suppress', color: '#F44336' },
                'avoid': { type: 'avoid', color: '#F44336' },
                'reduce': { type: 'suppress', color: '#F44336' },
                'balance': { type: 'balance', color: '#FFC107' },
                'harmonize': { type: 'balance', color: '#FFC107' }
            };
            
            // Find directions mentioned
            for (const [dir, trigram] of Object.entries(directionMap)) {
                // Use regex with word boundaries to avoid partial matches (e.g. 'news' matching 'n')
                const regex = new RegExp(`\\b${dir}\\b`, 'i');
                if (regex.test(lower)) {
                    // Determine action
                    let action = { type: 'enhance', color: '#d4af37' };
                    for (const [actionKey, actionValue] of Object.entries(actionMap)) {
                        if (lower.includes(actionKey)) {
                            action = actionValue;
                            break;
                        }
                    }
                    
                    // Get trigram info for element color
                    const trigramInfo = FENG_SHUI_DGL_SPEC.trigrams.houtian.find(t => t.name === trigram);
                    const elementTrans = t[trigramInfo.element] || trigramInfo.element;
                    const dirTrans = t[trigramInfo.direction] || trigramInfo.direction;

                    commands.push({
                        type: "highlight_sector",
                        trigram: trigram,
                        style: {
                            fill: trigramInfo.color + '40',
                            stroke: trigramInfo.color,
                            strokeWidth: 3,
                            glow: true,
                            glowColor: trigramInfo.color,
                            glowRadius: 15
                        },
                        label: {
                            text: trigramInfo.name,
                            subtext: `${elementTrans} - ${dirTrans}`,
                            position: "outside",
                            fontSize: 12,
                            color: trigramInfo.color
                        }
                    });
                    
                    commands.push({
                        type: "instruction_marker",
                        trigram: trigram,
                        instruction: {
                            type: action.type,
                            text: extractItemLabel(instruction, dir) || (t[trigramInfo.element] || trigramInfo.element)
                        },
                        style: {
                            markerType: action.type === 'enhance' ? 'star' : 
                                       action.type === 'suppress' ? 'triangle' : 'circle',
                            color: action.color,
                            size: 22
                        }
                    });
                }
            }
            
            return commands;
        },
        
        /**
         * Generate complete FS-DGL structure from multiple instructions
         * @param {Array} instructions - Array of instruction strings
         * @param {Object} options - Configuration options
         * @returns {Object} Complete FS-DGL structure
         */
        generateDiagram(instructions, options = {}) {
            const defaultOptions = {
                arrangement: "houtian",
                background: "#1a1a2e",
                showAllLabels: true,
                showConnections: false,
                lang: 'en'
            };
            
            const config = { ...defaultOptions, ...options };
            
            // Base structure
            const diagram = {
                version: "1.0",
                type: "fengshui_diagram",
                arrangement: config.arrangement,
                background: config.background,
                size: { w: 1000, h: 1000 },
                layers: [
                    {
                        name: "bagua_base",
                        commands: [
                            { type: "bagua", x: 500, y: 500, size: 800, style: { arrangement: config.arrangement } }
                        ]
                    },
                    {
                        name: "directional_grid",
                        type: "grid_layer",
                        commands: [
                            { type: "directional_lines", center: [500, 500], radius: 400 }
                        ]
                    },
                    {
                        name: "sector_highlights",
                        opacity: 0.5,
                        commands: []
                    },
                    {
                        name: "instruction_overlay",
                        commands: []
                    },
                    {
                        name: "labels",
                        commands: []
                    }
                ]
            };
            
            // Add label annotations for all trigrams if requested
            if (config.showAllLabels) {
                const trigrams = FENG_SHUI_DGL_SPEC.trigrams[config.arrangement];
                trigrams.forEach(t => {
                    diagram.layers[4].commands.push({
                        type: "annotation",
                        position: [t.position.x, t.position.y - 40],
                        text: t.chinese,
                        subtext: t.name,
                        style: {
                            fontSize: 14,
                            color: t.color,
                            align: "center"
                        }
                    });
                });
            }
            
            // Process instructions
            instructions.forEach(instruction => {
                const commands = this.parseInstruction(instruction, config.lang);
                commands.forEach(cmd => {
                    if (cmd.type === "highlight_sector") {
                        diagram.layers[2].commands.push(cmd);
                    } else if (cmd.type === "instruction_marker") {
                        diagram.layers[3].commands.push(cmd);
                    }
                });
            });
            
            return diagram;
        }
    }
};

// Expose to global scope
window.FENG_SHUI_DGL_SPEC = FENG_SHUI_DGL_SPEC;
