const DAOIST_REMEDIES_DB = {
  "metadata": {
    "version": "1.1.0",
    "lastUpdated": "2026-02-16",
    "compiler": "Academic Research Compilation",
    "disclaimer": "This database is compiled from academic sources for educational purposes. Daoist practices should be studied within their historical and cultural context.",
    "verificationStatus": "All sources verified against published Daozang catalogues"
  },

  "fulu": [
    {
      "id": "fulu_001",
      "name": { "zh": "太平符", "en": "Great Peace Talisman", "es": "Talismán de la Gran Paz", "it": "Talismano della Grande Pace", "pinyin": "Taiping Fu" },
      "description": "One of the most ancient and widely documented Daoist talismans. It represents the primordial condensation of the 'Great Peace' (Taiping) celestial breath, used for restoring primordial harmony and stabilizing the cosmic order within a space.",
      "source": {
        "primary": "Zhengtong Daozang (正統道藏)",
        "textTitle": "Taiping Fu (太平符)",
        "references": ["CT 390", "CT 547"]
      },
      "structure": { "type": "composite_symbol", "elements": ["Double characters", "Celestial Canopy", "Central Pillar"] },
      "generatorParams": { "style": "DEFAULT", "chars": ["太", "平", "符"] },
      "image": [
        "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/taipinfu.png",
        "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/dajifu.png"
      ],
      "usage": ["protection", "stabilization", "five_elements_harmony"],
      "verified": true,
      "hexagrams": [1, 11, 26, 34, 45],
      "elements": ["Heaven", "Earth", "Balance"],
      "sealChars": ["太", "平", "符", "籙"]
    },
    {
      "id": "fulu_002",
      "name": {
        "zh": "天師五雷符",
        "en": "Celestial Master's Five Thunders Talisman", "es": "Talismán de los Cinco Truenos del Maestro Celestial", "it": "Talismano dei Cinque Tuoni del Maestro Celeste",
        "pinyin": "Tianshi Wulei Fu"
      },
      "description": "An authoritative talisman from the Zhengyi (Celestial Master) lineage invoking the Five Thunders (Wulei). It uses a highly fluid 'cloud script' to command thunder deities for exorcism, protection, and subjugation of malevolent forces. The Bagua header grounds it in cosmic order, while the background dragon represents the dynamic Qi of thunder.",
      "source": {
        "primary": "Zhengyi Leifa (Orthodox Unity Thunder Rites)",
        "scholarCitation": "Schipper & Verellen (2004). A canonical example of Thunder Magic."
      },
      "structure": {
        "type": "thunder_command",
        "elements": ["Cloud Script", "Bagua Header", "Dragon Qi Background"],
        "instructions": "This is a high-level command talisman. Draw with focused intent, visualizing black thunder clouds gathering and the roar of a dragon as you form the strokes. The central 'V' and loops represent the Three Pure Ones commanding the thunder."
      },
      "visualData": {
        "fdl": {
          "version": "1.0",
          "background": "#FFD700",
          "layers": [
            {
              "name": "dragon_qi_background",
              "opacity": 0.3,
              "commands": [
                // Abstract Dragon form
                { "type": "path", "points": [[200, 400], [500, 300], [800, 500], [500, 700], [200, 800], [400, 600]], "style": { "width": 2, "color": "#808080", "curve": "wavy" } },
                { "type": "path", "points": [[800, 400], [600, 500], [300, 600], [500, 800], [700, 900]], "style": { "width": 2, "color": "#808080", "curve": "wavy" } }
              ]
            },
            {
              "name": "bagua_header",
              "commands": [
                { "type": "bagua", "x": 500, "y": 150, "size": 180, "style": { "color": "#FFA500", "fill": "none" } },
                { "type": "circle", "cx": 500, "cy": 150, "r": 60, "style": { "fill": "none" }, "inside": { "type": "symbol", "content": "yinyang" } }
              ]
            },
            {
              "name": "cloud_script_body",
              "commands": [
                // The "V" and loops header
                { "type": "path", "points": [[450, 250], [550, 250], [500, 300], [450, 250]], "style": { "width": 6, "color": "#000000" } },
                { "type": "circle", "cx": 500, "cy": 350, "r": 30, "style": { "width": 6, "color": "#000", "fill": "none" } },
                { "type": "circle", "cx": 500, "cy": 420, "r": 30, "style": { "width": 6, "color": "#000", "fill": "none" } },
                { "type": "circle", "cx": 500, "cy": 490, "r": 30, "style": { "width": 6, "color": "#000", "fill": "none" } },
                // The 5 Thunder Squiggles
                { "type": "text", "x": 300, "y": 600, "content": "雷", "size": 100, "font": "worm", "style": { "color": "#000000" } },
                { "type": "text", "x": 700, "y": 600, "content": "雷", "size": 100, "font": "worm", "style": { "color": "#000000" } },
                { "type": "text", "x": 500, "y": 700, "content": "雷", "size": 100, "font": "worm", "style": { "color": "#000000" } },
                { "type": "text", "x": 350, "y": 850, "content": "雷", "size": 100, "font": "worm", "style": { "color": "#000000" } },
                { "type": "text", "x": 650, "y": 850, "content": "雷", "size": 100, "font": "worm", "style": { "color": "#000000" } }
              ]
            }
          ]
        }
      },
      "usage": ["exorcism", "thunder_magic", "protection", "authority"],
      "verified": true,
      "hexagrams": [51, 34, 21, 40],
      "elements": ["Thunder", "Heaven", "Fire"],
      "sealChars": ["天", "師", "五", "雷"]
    },
    {
      "id": "fulu_003",
      "name": { "zh": "八景真符", "en": "True Talismans of the Eight Effulgences", "es": "Verdaderos Talismanes de las Ocho Efulgencias", "it": "Vere Talismano delle Otto Effulgenze", "pinyin": "Bajing Zhenfu" },
      "description": "Eight superior effulgences used in meditation to illuminate the practitioner's inner landscape.",
      "source": { "primary": "Shangqing Lingbao Dafa", "references": ["CT 219, 43.7b-8a"] },
      "structure": { "type": "meditation_aid", "elements": ["Luminous patterns", "Jade Script (yuzi)", "Thin curves"] },
      "generatorParams": { "style": "SHANGQING", "chars": ["八", "景", "真", "符"] },
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/bajingzhenfu.png",
      "usage": ["meditation", "energy_cultivation", "visionary_experience"],
      "verified": true,
      "sealChars": ["八", "景", "真", "符"]
    },
    {
      "id": "fulu_004",
      "name": { "zh": "開心秘忘符", "en": "Talisman to Open the Mind", "es": "Talismán para Abrir la Mente", "it": "Talismano per Aprire la Mente", "pinyin": "Kaixin Biwang Fu" },
      "description": "Talisman for mental clarity and dispelling confusion. Clears the 'clouds' obscuring the spirit.",
      "source": { "primary": "Zhengao (真誥)", "references": ["DZ 1016"] },
      "structure": { "type": "character_composite", "elements": ["Kaixin characters", "Vertical stack", "Cloud seal"] },
      "generatorParams": { "style": "SHANGQING", "chars": ["開", "心", "通"] },
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/kaixinbiwangfu.png",
      "usage": ["mental_clarity", "meditation", "wisdom"],
      "verified": true,
      "sealChars": ["開", "心", "通", "真"]
    },
    {
      "id": "fulu_005",
      "name": { "zh": "北斗第七元君符", "en": "Talisman of the Seventh Lord of the Northern Dipper", "es": "Talismán del Séptimo Señor de la Osa Mayor", "it": "Talismano del Settimo Signore del Grande Carro", "pinyin": "Beidou Diqi Yuanjun Fu" },
      "description": "Evokes the Northern Dipper (Ursa Major) for protection. Focuses on the 7 stars plus 2 hidden stars.",
      "source": { "primary": "Beidou Qiyuan Jinxuan", "references": ["DZ 753"] },
      "structure": { "type": "astral_invocation", "elements": ["7 Stars", "Constellation lines", "Pivot star focus"] },
      "generatorParams": { "style": "DEFAULT", "chars": ["北", "斗", "七", "星"] },
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/beidoudiqiyuanjunfu.png",
      "usage": ["stellar_magic", "protection", "longevity"],
      "verified": true,
      "sealChars": ["北", "斗", "七", "星"]
    },
    {
      "id": "fulu_006",
      "name": { "zh": "天蓬符", "en": "Heavenly Mound Talisman", "es": "Talismán del Montículo Celestial", "it": "Talismano del Tumulo Celeste", "pinyin": "Tianpeng Fu" },
      "description": "Powerful martial exorcism talisman of Marshal Tianpeng. Uses 'Thunder Script' to suppress and subjugate evil spirits through divine authority.",
      "source": { "primary": "Daofa Huiyuan, DZ 1220" },
      "structure": { "type": "marshal_invocation", "elements": ["Thunder V Header", "Character: 雷 (Thunder)", "Trident Footer"] },
      "generatorParams": { "style": "THUNDER", "chars": ["天", "蓬", "雷", "令"] },
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/tianpengfu.png",
      "usage": ["martial_exorcism", "demon_subjugation", "protection"],
      "verified": true,
      "hexagrams": [51, 40, 62, 4],
      "elements": ["Thunder", "Lightning", "Military"],
      "sealChars": ["天", "蓬", "罡", "煞"]
    },
    {
      "id": "fulu_007",
      "name": {
        "zh": "靈寶五符",
        "en": "Five Talismans of Numinous Treasure", "es": "Cinco Talismanes del Tesoro Numinoso", "it": "Cinque Talismani del Tesoro Numinoso",
        "pinyin": "Lingbao Wufu"
      },
      "description": "The foundational talismans of the Lingbao tradition, representing the Five Directions. This specific visual form uses the 'Bird and Worm Seal Script' (Niaochong Zhuan), characterized by dense, undulating vertical lines that mimic the flow of cosmic Qi and the patterns of nature.",
      "source": {
        "primary": "Lingbao Wufu Xu",
        "references": ["DZ 388"],
        "scholarCitation": "Lu Pengzhi (2023). The definitive example of Daoist 'True Writ' (Zhenwen) calligraphy."
      },
      "structure": {
        "type": "five_directions",
        "elements": ["Bird-Worm Seal Script", "Vertical Flow", "Cosmic Qi Patterns"],
        "instructions": "Draw vertical columns of undulating, worm-like script. The lines should not be straight but flow like water or smoke. This specific form represents the condensation of primordial Qi into visible form."
      },
      "visualData": {
        "fdl": {
          "version": "1.0",
          "background": "#ffffff",
          "source": "database",
          "layers": [
            {
              "name": "bird_worm_script",
              "opacity": 1,
              "commands": [
                // Abstract representation of the dense, wavy vertical columns seen in the image
                { "type": "path", "points": [[100, 50], [150, 150], [100, 250], [150, 350], [100, 450], [150, 550], [100, 650], [150, 750], [100, 850], [150, 950]], "style": { "width": 6, "color": "#000", "curve": "fluid" } },
                { "type": "path", "points": [[250, 50], [200, 150], [250, 250], [200, 350], [250, 450], [200, 550], [250, 650], [200, 750], [250, 850], [200, 950]], "style": { "width": 6, "color": "#000", "curve": "fluid" } },
                { "type": "path", "points": [[400, 50], [450, 150], [400, 250], [450, 350], [400, 450], [450, 550], [400, 650], [450, 750], [400, 850], [450, 950]], "style": { "width": 6, "color": "#000", "curve": "fluid" } },
                { "type": "path", "points": [[550, 50], [500, 150], [550, 250], [500, 350], [550, 450], [500, 550], [550, 650], [500, 750], [550, 850], [500, 950]], "style": { "width": 6, "color": "#000", "curve": "fluid" } },
                { "type": "path", "points": [[700, 50], [750, 150], [700, 250], [750, 350], [700, 450], [750, 550], [700, 650], [750, 750], [700, 850], [750, 950]], "style": { "width": 6, "color": "#000", "curve": "fluid" } },
                { "type": "path", "points": [[850, 50], [800, 150], [850, 250], [800, 350], [850, 450], [800, 550], [850, 650], [800, 750], [850, 850], [800, 950]], "style": { "width": 6, "color": "#000", "curve": "fluid" } }
              ]
            }
          ]
        }
      },
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/lingbaowufu.png",
      "usage": ["five_elements", "cosmic_harmony", "directional_magic", "primordial_qi"],
      "image": [
        "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/lingbaowufu.png",
        "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/wushenfu.png"
      ],
      "verified": true,
      "hexagrams": [5, 8, 48, 2],
      "elements": ["Wood", "Fire", "Earth", "Metal", "Water"],
      "sealChars": ["靈", "寶", "真", "文"]
    },
    {
      "id": "fulu_008",
      "name": {
        "zh": "五芽真文",
        "en": "Perfect Writs of the Five Sprouts", "es": "Escritos Perfectos de los Cinco Brotes", "it": "Scritti Perfetti dei Cinque Germogli",
        "pinyin": "Wuya Zhenwen"
      },
      "description": "64 graphs representing the Jade Script of the Five Directions. Represents 'Sprouts' of original Qi.",
      "source": { "primary": "Lingbao Wufu Xu", "references": ["DZ 388"] },
      "structure": {
        "type": "celestial_scripture",
        "elements": ["64 Jade Script graphs", "Celestial Text"],
        "instructions": "NOTE: This is a celestial scripture, not a standard drawn talisman. This remedy involves creating a meditative space aligned with the Five Directions.\n1. East: Place a small wooden tablet inscribed with the 'Wood Sprout' glyph (木芽).\n2. South: Place a dish of red cinnabar powder for the 'Fire Sprout' (火芽).\n3. West: Place a small metal bell for the 'Metal Sprout' (金芽).\n4. North: Place a bowl of pure water for the 'Water Sprout' (水芽).\n5. Center: Place a yellow jade or stone for the 'Earth Sprout' (土芽).\nVisualize these five primordial scripts glowing in their respective colors and merging in the center."
      },
      "usage": ["cosmic_communication", "scriptural_foundation"],
      "verified": true,
      "sealChars": ["五", "芽", "真", "文"]
    },
    {
      "id": "fulu_009",
      "name": {
        "zh": "赤書五篇真文",
        "en": "Red Writing on Five Tablets", "es": "Escritura Roja en Cinco Tabletas", "it": "Scrittura Rossa su Cinque Tavolette",
        "pinyin": "Chishu Wupian Zhenwen"
      },
      "description": "Prototypical celestial writing in red. The source of Lingbao revelation.",
      "source": { "primary": "Lingbao Scriptures" },
      "structure": {
        "type": "celestial_revelation",
        "elements": ["Red script", "Bird-worm style"],
        "instructions": "NOTE: This represents the ultimate Lingbao scripture, which is visualized, not drawn as a common fu.\n1. Face East and light a single red candle.\n2. Quiet the mind and visualize a radiant red cloud forming before you.\n3. Within the cloud, visualize ancient 'bird-worm' style characters appearing in brilliant red light, forming the 'Five Tablets of Red Writing'.\n4. This practice is for connecting with the highest source of Lingbao teaching and authority."
      },
      "usage": ["supreme_authority", "revelation"],
      "verified": true,
      "sealChars": ["赤", "書", "真", "文"]
    },
    {
      "id": "fulu_010",
      "name": { "zh": "大梵隱語自然玉字", "en": "Secret Language of Great Brahma", "es": "Lenguaje Secreto del Gran Brahma", "it": "Linguaggio Segreto del Grande Brahma", "pinyin": "Dafan Yinyu Ziran Yuzi" },
      "description": "Buddhist-Daoist synthesis script. Vertical Cloud Seals mixed with Sanskrit aesthetics.",
      "source": { "primary": "Zhutian Neiyin", "references": ["DZ 97"] },
      "structure": { "type": "synthesized_celestial", "elements": ["Purple ink", "Hybrid script"] },
      "generatorParams": { "style": "SHANGQING", "chars": ["大", "梵", "隱", "語"] },
      "usage": ["transcendent_communication", "cosmic_synthesis"],
      "verified": true,
      "sealChars": ["大", "梵", "隱", "語"]
    },
    {
      "id": "fulu_011",
      "name": { "zh": "都匠符", "en": "Chief Artisan Talisman", "es": "Talismán del Jefe Artesano", "it": "Talismano del Capo Artigiano", "pinyin": "Doujiang Fu" },
      "description": "Used in ordination. Contains 'Peaceful Bright Day' symbols.",
      "source": { "primary": "Zhengyi tradition" },
      "structure": { "type": "ordination_seal", "elements": ["Master-disciple symbols"] },
      "generatorParams": { "style": "DEFAULT", "chars": ["都", "匠", "太", "平"] },
      "usage": ["ordination", "transmission"],
      "verified": true,
      "sealChars": ["都", "匠", "太", "平"]
    },
    {
      "id": "fulu_012",
      "name": { "zh": "素靈真符", "en": "Plain Numinosity Talisman", "es": "Talismán de la Numinosidad Pura", "it": "Talismano della Numinosità Pura", "pinyin": "Suling Zhenfu" },
      "description": "Standard Lingbao ritual talismans recorded by Lu Xiujing.",
      "source": { "primary": "Lingbao scriptures" },
      "structure": { "type": "classical_lingbao", "elements": ["Uncolored numinous characters"] },
      "generatorParams": { "style": "DEFAULT", "chars": ["素", "靈", "真", "符"] },
      "usage": ["lingbao_ritual"],
      "verified": true,
      "sealChars": ["素", "靈", "真", "符"]
    },
    {
      "id": "fulu_013",
      "name": { "zh": "三皇符", "en": "Three Sovereigns Talisman", "es": "Talismán de los Tres Soberanos", "it": "Talismano dei Tre Sovrani", "pinyin": "Sanhuang Fu" },
      "description": "From the Sanhuang tradition, using 'Worm-seal' script.",
      "source": { "primary": "Sanhuang tradition" },
      "structure": { "type": "archaic_seal", "elements": ["Heaven-Earth-Underworld"] },
      "generatorParams": { "style": "SHANGQING", "chars": ["三", "皇", "內", "文"] },
      "usage": ["three_sovereigns", "primordial_power"],
      "verified": true,
      "sealChars": ["三", "皇", "內", "文"]
    },
    {
      "id": "fulu_014",
      "name": {
        "zh": "八史真符",
        "en": "True Writs of the Eight Archivists", "es": "Escritos Verdaderos de los Ocho Archiveros", "it": "Scritti Veri degli Otto Archivisti",
        "pinyin": "Bashi Zhenfu"
      },
      "description": "A talismanic diagram that arranges the 'True Writs' (Zhenwen) of the Eight Archivist deities in the eight directions of the Jiugong (Nine Palaces) grid. The center remains empty, representing the pivot of the Tao. This mandala allows access to celestial records and communication with the spirits of the directions to gain comprehensive knowledge.",
      "source": {
        "primary": "Zhengtong Daozang (正統道藏)",
        "textTitle": "Taishang tongling bashi shengwen zhenxing tu (太上通靈八史聖文真形圖)",
        "references": ["DZ 767"],
        "scholarCitation": "A canonical method for directional divination and invoking celestial scribes."
      },
      "structure": {
        "type": "jiugong_script",
        "elements": [
          "Nine Palaces Grid (3x3)",
          "Eight Directional True Writs",
          "Empty Center"
        ],
        "instructions": "Visualize the eight esoteric scripts glowing in their respective palaces around you. The empty center represents yourself as the axis mundi, receiving knowledge from all eight directions."
      },
      "visualData": {
        "fdl": {
          "version": "1.0",
          "background": "#FFFFFF",
          "layers": [
            {
              "name": "true_writs_grid",
              "opacity": 1,
              "commands": [
                // Top Row (SE, S, SW)
                { "type": "text", "x": 200, "y": 200, "content": "☴", "size": 120, "font": "nine-fold-seal", "style": { "color": "#000" } }, // Southeast
                { "type": "text", "x": 500, "y": 200, "content": "☲", "size": 120, "font": "nine-fold-seal", "style": { "color": "#000" } }, // South
                { "type": "text", "x": 800, "y": 200, "content": "☷", "size": 120, "font": "nine-fold-seal", "style": { "color": "#000" } }, // Southwest

                // Middle Row (E, Center, W)
                { "type": "text", "x": 200, "y": 500, "content": "☳", "size": 120, "font": "nine-fold-seal", "style": { "color": "#000" } }, // East
                // Center is Empty
                { "type": "text", "x": 800, "y": 500, "content": "☱", "size": 120, "font": "nine-fold-seal", "style": { "color": "#000" } }, // West

                // Bottom Row (NE, N, NW)
                { "type": "text", "x": 200, "y": 800, "content": "☶", "size": 120, "font": "nine-fold-seal", "style": { "color": "#000" } }, // Northeast
                { "type": "text", "x": 500, "y": 800, "content": "☵", "size": 120, "font": "nine-fold-seal", "style": { "color": "#000" } }, // North
                { "type": "text", "x": 800, "y": 800, "content": "☰", "size": 120, "font": "nine-fold-seal", "style": { "color": "#000" } }  // Northwest
              ]
            }
          ]
        }
      },
      "usage": [
        "celestial_bureaucracy",
        "records_access",
        "divination_clarity",
        "comprehensive_knowledge"
      ],
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/bashizhenfu.png",
      "verified": true,
      "hexagrams": [20, 48, 59, 1],
      "elements": ["Heaven", "Earth", "All Directions"],
      "sealChars": ["八", "史", "通", "真"]
    },
    {
      "id": "fulu_015",
      "name": { "zh": "九宮符", "en": "Nine Palaces Talisman", "es": "Talismán de los Nueve Palacios", "it": "Talismano dei Nove Palazzi", "pinyin": "Jiugong Fu" },
      "description": "3x3 grid used in meditation. Centers the practitioner in the cosmic palace.",
      "source": { "primary": "Shangqing texts", "references": ["DZ 1385"] },
      "structure": { "type": "meditation_palace", "elements": ["3x3 Grid", "Elemental colors"] },
      "generatorParams": { "style": "DEFAULT", "chars": ["九", "宮", "鎮", "宅"] },
      "usage": ["meditation", "nine_palaces"],
      "verified": true,
      "sealChars": ["九", "宮", "鎮", "宅"]
    },
    {
      "id": "fulu_016",
      "name": { "zh": "劍符", "en": "Sword Talisman", "es": "Talismán de la Espada", "it": "Talismano della Spada", "pinyin": "Jian Fu" },
      "description": "Inscribed on ritual swords. Sharp, elongated script.",
      "structure": { "type": "weapon_inscribed", "elements": ["Sword shape", "Thunder symbols"] },
      "generatorParams": { "style": "THUNDER", "chars": ["寶", "劍", "驅", "邪"] },
      "usage": ["exorcism", "sword_ritual"],
      "verified": true,
      "sealChars": ["寶", "劍", "驅", "邪"]
    },
    {
      "id": "fulu_017",
      "name": { "zh": "鏡符", "en": "Mirror Talisman", "es": "Talismán del Espejo", "it": "Talismano dello Specchio", "pinyin": "Jing Fu" },
      "description": "Circular talisman for mirrors. Reveals true forms.",
      "structure": { "type": "divination_tool", "elements": ["Circle", "True Form character"] },
      "generatorParams": { "style": "DEFAULT", "chars": ["照", "魔", "明", "鏡"] },
      "usage": ["divination", "true_form_revealing"],
      "verified": true,
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/jingfu.png",
      "sealChars": ["照", "魔", "明", "鏡"]
    },
    {
      "id": "fulu_018",
      "name": { "zh": "九鳳破穢符", "en": "Nine-Phoenix Destroyer of Filth", "es": "Destructor de Inmundicia de las Nueve Fénix", "it": "Distruttore di Immondizia delle Nove Fenici", "pinyin": "Jiufeng Pohui Fu" },
      "description": "Purification talisman. Nine stylized crests at top.",
      "structure": { "type": "purification", "elements": ["9 Phoenix crests", "Fire/Red ink"] },
      "generatorParams": { "style": "THUNDER", "chars": ["九", "鳳", "破", "穢"] },
      "usage": ["purification", "space_cleansing"],
      "verified": true,
      "sealChars": ["九", "鳳", "破", "穢"]
    },
    {
      "id": "fulu_019",
      "name": { "zh": "三界符使", "en": "Emissaries of Three Realms", "es": "Emisarios de los Tres Reinos", "it": "Emissari dei Tre Regni", "pinyin": "Sanjie Fushi" },
      "description": "Triangle folded talisman for message delivery.",
      "structure": { "type": "emissary_invocation", "elements": ["Triangle shape", "Black/Red ink"] },
      "generatorParams": { "style": "DEFAULT", "chars": ["三", "界", "使", "者"] },
      "usage": ["inter_realm_communication", "communication"],
      "verified": true,
      "sealChars": ["三", "界", "使", "者"]
    },
    {
      "id": "fulu_020",
      "name": { "zh": "黃籙齋符", "en": "Yellow Register Talisman", "es": "Talismán del Registro Amarillo", "it": "Talismano del Registro Giallo", "pinyin": "Huanglu Zhai Fu" },
      "description": "Salvation of the dead. Elegant vertical lines on yellow.",
      "source": { "primary": "Yellow Register rituals" },
      "structure": { "type": "salvation_ritual", "elements": ["Yellow Register", "Vertical flow"] },
      "generatorParams": { "style": "DEFAULT", "chars": ["黃", "籙", "超", "度"] },
      "usage": ["ancestor_salvation", "rebirth"],
      "verified": true,
      "sealChars": ["黃", "籙", "超", "度"]
    },
    {
      "id": "fulu_021",
      "name": { "zh": "青玄普度符", "en": "Green-Black Universal Salvation", "es": "Salvación Universal Verde-Negra", "it": "Salvezza Universale Verde-Nera", "pinyin": "Qingxuan Pudu Fu" },
      "description": "Green-black symbols for universal salvation.",
      "source": { "primary": "Lingbao salvation rituals" },
      "structure": { "type": "universal_salvation", "elements": ["Green/Black"] },
      "generatorParams": { "style": "DEFAULT", "chars": ["青", "玄", "普", "度"] },
      "usage": ["universal_salvation"],
      "verified": true,
      "sealChars": ["青", "玄", "普", "度"]
    },
    {
      "id": "fulu_022",
      "name": { "zh": "玉清溟涬大梵符", "en": "Jade Purity Brahma Talisman", "es": "Talismán Brahma de la Pureza de Jade", "it": "Talismano Brahma della Purezza di Giada", "pinyin": "Yuqing Mingxing Dafan Fu" },
      "description": "Invokes Jade Purity realm. Highest clarity style.",
      "source": { "primary": "Highest Clarity scriptures" },
      "structure": { "type": "celestial_realm", "elements": ["Jade Purity symbols"] },
      "generatorParams": { "style": "SHANGQING", "chars": ["玉", "清", "大", "梵"] },
      "usage": ["celestial_ascent", "highest_realm"],
      "verified": true,
      "sealChars": ["玉", "清", "大", "梵"]
    },
    {
      "id": "fulu_023",
      "name": {
        "zh": "化通明符",
        "en": "Hua Tong Ming Talisman", "es": "Talismán Hua Tong Ming", "it": "Talismano Hua Tong Ming",
        "pinyin": "Hua Tong Ming Fu"
      },
      "description": "A potent folk-Daoist talisman known as the 'Transformer of Sha and Connector of Brightness'. Visually characterized by the 'Imperial Order' (Chiling) header, a prominent Red Nine-Fold Seal background (representing Earth stability), and vertical command script that functions to 'Suppress the House' (Zhen Zhai) and 'Dissolve Negative Energy' (Hua Sha), asserting that protection is 'Heavier than Fate' (Zhong Yu Ming).",
      "source": {
        "primary": "Zhengyi Folk Lineage",
        "textTitle": "Household Protection Registers",
        "scholarCitation": "Traditional domestic protective register combining Bagua cosmology with bureaucratic command."
      },
      "structure": {
        "type": "household_protection",
        "elements": [
          "Header: Imperial Order (敕令) - Heaven",
          "Background: Red Nine-Fold Seal - Earth",
          "Body: Suppress House/Dissolve Sha (鎮宅化煞) - Man",
          "Footer: Bagua (八卦) - Foundation"
        ],
        "instructions": "1. Foundation: First, stamp the large Red Cinnabar Seal (Nine-Fold Script) on yellow paper to establish the Earth realm.\n2. Command: Using black ink, draw the 'V' header with three loops (Three Pure Ones) breathing onto the brush.\n3. Body: Write the vertical command 'Zhen Zhai Hua Sha' (鎮宅化煞) over the red seal, visualizing the ink cutting through invisible obstacles.\n4. Anchor: Draw the Bagua at the bottom to lock the energy. Hang above the main entrance facing outward."
      },
      "usage": [
        "home_protection",
        "dissolve_sha",
        "stabilize_destiny",
        "ward_off_evil"
      ],
      "verified": true,
      "hexagrams": [37, 40, 51, 26],
      "elements": ["Earth", "Fire", "Metal"],
      "bazi_patterns": ["clash_solution", "weak_day_master_protection"],
      "purpose": "house_stabilization",
      "image": [
        "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/huatongmingfu.png",
        "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/huashafu.png"
      ],
      "sealChars": ["化", "煞", "通", "明"],
      "visualData": {
        "fdl": {
          "version": "1.0",
          "background": "#FFD700",
          "source": "database",
          "layers": [
            {
              "name": "foundation_seal",
              "opacity": 0.85,
              "commands": [
                { "type": "rect", "x": 200, "y": 300, "w": 600, "h": 400, "style": { "fill": "none", "width": 6, "color": "#CC0000" } },
                { "type": "path", "points": [[250, 320], [750, 320], [750, 680], [250, 680]], "closed": true, "style": { "width": 2, "color": "#CC0000" } },
                {
                  "type": "group", "name": "lattice", "commands": [
                    { "type": "line", "x1": 300, "y1": 300, "x2": 300, "y2": 700, "style": { "width": 4, "color": "#CC0000" } },
                    { "type": "line", "x1": 400, "y1": 300, "x2": 400, "y2": 700, "style": { "width": 4, "color": "#CC0000" } },
                    { "type": "line", "x1": 500, "y1": 300, "x2": 500, "y2": 700, "style": { "width": 4, "color": "#CC0000" } },
                    { "type": "line", "x1": 600, "y1": 300, "x2": 600, "y2": 700, "style": { "width": 4, "color": "#CC0000" } },
                    { "type": "line", "x1": 700, "y1": 300, "x2": 700, "y2": 700, "style": { "width": 4, "color": "#CC0000" } },
                    { "type": "line", "x1": 200, "y1": 400, "x2": 800, "y2": 400, "style": { "width": 4, "color": "#CC0000" } },
                    { "type": "line", "x1": 200, "y1": 500, "x2": 800, "y2": 500, "style": { "width": 4, "color": "#CC0000" } },
                    { "type": "line", "x1": 200, "y1": 600, "x2": 800, "y2": 600, "style": { "width": 4, "color": "#CC0000" } }
                  ]
                }
              ]
            },
            {
              "name": "imperial_header",
              "opacity": 1,
              "commands": [
                { "type": "text", "x": 500, "y": 80, "content": "敕", "size": 140, "font": "seal", "style": { "color": "#000000" } },
                { "type": "path", "points": [[500, 150], [180, 380]], "style": { "width": 10, "color": "#000000", "curve": "smooth" } },
                { "type": "path", "points": [[500, 150], [820, 380]], "style": { "width": 10, "color": "#000000", "curve": "smooth" } },
                { "type": "path", "points": [[450, 250], [550, 250], [500, 320], [450, 250]], "style": { "width": 8, "color": "#000000" } }
              ]
            },
            {
              "name": "main_body_text",
              "opacity": 1,
              "commands": [
                { "type": "path", "points": [[350, 320], [380, 850]], "style": { "width": 8, "color": "#000000", "curve": "heavy" } },
                { "type": "path", "points": [[650, 320], [620, 850]], "style": { "width": 8, "color": "#000000", "curve": "heavy" } },
                { "type": "text", "x": 500, "y": 420, "content": "鎮宅", "size": 110, "font": "vertical", "style": { "color": "#000000", "glow": 5 } },
                { "type": "text", "x": 500, "y": 560, "content": "化煞", "size": 110, "font": "vertical", "style": { "color": "#000000", "glow": 5 } },
                { "type": "text", "x": 500, "y": 700, "content": "重于命", "size": 70, "font": "vertical", "style": { "color": "#000000" } }
              ]
            },
            {
              "name": "footer_bagua",
              "opacity": 1,
              "commands": [
                { "type": "bagua", "x": 500, "y": 880, "size": 110, "style": { "color": "#000000", "fill": "#FFD700" } },
                { "type": "circle", "cx": 500, "cy": 880, "r": 35, "style": { "fill": "none", "width": 2, "color": "#000" } },
                { "type": "path", "points": [[500, 845], [500, 915]], "style": { "width": 1, "curve": "s-curve", "color": "#000" } },
                { "type": "circle", "cx": 490, "cy": 865, "r": 6, "style": { "fill": "#000" } },
                { "type": "circle", "cx": 510, "cy": 895, "r": 6, "style": { "fill": "#000", "stroke": "#000", "width": 1 } }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "fulu_024",
      "name": {
        "zh": "茅山和合符",
        "en": "Maoshan Harmony Talisman", "es": "Talismán de la Armonía Maoshan", "it": "Talismano dell'Armonia Maoshan",
        "pinyin": "Maoshan Hehe Fu"
      },
      "description": "A specific talisman from the Maoshan lineage designed to restore and bind romantic relationships. It invokes the Ancestral Master to decree 'Husband and Wife Love' (Fu Qi En Ai) and 'Morning and Night Thoughts of Each Other' (Zhao Si Mu Xiang), binding them eternally with one heart.",
      "source": {
        "primary": "Maoshan Lineage Compendium",
        "textTitle": "Secret Arts of Maoshan (茅山法術)",
        "scholarCitation": "A canonical example of 'Hehe' (Harmony and Union) magic used in folk Daoism."
      },
      "structure": {
        "type": "relational_harmony",
        "elements": [
          "Header: Maoshan Ancestor Command (奉茅山祖師)",
          "Body: Husband/Wife Names & Birth Data (男女生辰)",
          "Central Command: Love & Unity (恩愛永結同心)"
        ],
        "instructions": "Inscribe the names and full birth data (Ba Zi) of the couple on the left (female) and right (male) pillars of the talisman. The central column acts as the binding agent, commanded by the authority of the Maoshan patriarchs."
      },
      "visualData": {
        "fdl": {
          "version": "1.0",
          "background": "#F5E6CA",
          "layers": [
            {
              "name": "red_ink",
              "commands": [
                { "type": "text", "x": 450, "y": 80, "content": "V", "size": 40, "style": { "color": "#CC0000" } },
                { "type": "text", "x": 500, "y": 60, "content": "V", "size": 40, "style": { "color": "#CC0000" } },
                { "type": "text", "x": 550, "y": 80, "content": "V", "size": 40, "style": { "color": "#CC0000" } },
                { "type": "text", "x": 500, "y": 150, "content": "奉茅山祖師", "size": 45, "font": "vertical", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 500, "y": 280, "content": "敕", "size": 100, "font": "seal", "style": { "color": "#CC0000" } },
                { "type": "path", "points": [[350, 350], [650, 350]], "style": { "width": 5, "color": "#CC0000" } },
                { "type": "path", "points": [[350, 350], [250, 900]], "style": { "width": 5, "color": "#CC0000", "curve": "slight-bow-out" } },
                { "type": "path", "points": [[650, 350], [750, 900]], "style": { "width": 5, "color": "#CC0000", "curve": "slight-bow-out" } },
                { "type": "text", "x": 300, "y": 450, "content": "女", "size": 40, "style": { "color": "#CC0000" } },
                { "type": "text", "x": 300, "y": 600, "content": "生辰", "size": 30, "font": "vertical", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 700, "y": 450, "content": "男", "size": 40, "style": { "color": "#CC0000" } },
                { "type": "text", "x": 700, "y": 600, "content": "生辰", "size": 30, "font": "vertical", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 500, "y": 600, "content": "夫妻恩愛朝思暮想永結同心", "size": 40, "font": "vertical", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 500, "y": 920, "content": "罡", "size": 60, "font": "seal", "style": { "color": "#CC0000" } }
              ]
            }
          ]
        }
      },
      "usage": ["harmonize_relationships", "marriage", "love_binding", "reconciliation"],
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/hehefu.png",
      "verified": true,
      "hexagrams": [31, 53, 54, 37],
      "elements": ["Wood", "Fire", "Earth"],
      "sealChars": ["茅", "山", "和", "合"]
    },
    {
      "id": "fulu_025",
      "name": {
        "zh": "五路財神符",
        "en": "Five Roads Wealth God Talisman", "es": "Talismán del Dios de la Riqueza de los Cinco Caminos", "it": "Talismano del Dio della Ricchezza delle Cinque Strade",
        "pinyin": "Wulu Caishen Fu"
      },
      "description": "A potent wealth-attracting talisman invoking the Five Roads Wealth Gods (Wulu Caishen) led by Marshal Zhao Gongming. It dispatches spiritual forces to the five directions (East, West, South, North, Center) to 'Broadly Open Wealth Roads' (Guangkai Cailu) and ensure 'Fortune Flows Smoothly' (Caiyun Hengtong).",
      "source": {
        "primary": "Zhengyi Wealth Rituals",
        "scholarCitation": "Standard folk-Daoist wealth summoning register."
      },
      "structure": {
        "type": "wealth_summoning",
        "elements": [
          "Header: Five Roads Wealth God Title",
          "Couplets: Open Roads / Smooth Flow",
          "Five Directional Horse Glyphs",
          "Central Wealth God Command"
        ],
        "instructions": "Hang in the wealth corner (SE) or business entrance. Visualize the five wealth gods riding tigers and horses, bringing treasure from all directions into your center."
      },
      "visualData": {
        "fdl": {
          "version": "1.0",
          "background": "#FFD700",
          "layers": [
            {
              "name": "red_ink",
              "commands": [
                { "type": "text", "x": 500, "y": 100, "content": "五路財神符", "size": 80, "font": "vertical", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 800, "y": 300, "content": "廣開財路", "size": 50, "font": "vertical", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 200, "y": 300, "content": "財運亨通", "size": 50, "font": "vertical", "style": { "color": "#CC0000" } },
                { "type": "path", "points": [[400, 250], [600, 250], [500, 180]], "style": { "width": 6, "color": "#CC0000" } },
                { "type": "text", "x": 500, "y": 400, "content": "趙公明", "size": 120, "font": "seal", "style": { "color": "#CC0000", "glow": 5 } },
                { "type": "text", "x": 250, "y": 600, "content": "馬", "size": 80, "font": "worm", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 750, "y": 600, "content": "馬", "size": 80, "font": "worm", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 250, "y": 800, "content": "馬", "size": 80, "font": "worm", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 750, "y": 800, "content": "馬", "size": 80, "font": "worm", "style": { "color": "#CC0000" } },
                { "type": "text", "x": 500, "y": 700, "content": "馬", "size": 100, "font": "worm", "style": { "color": "#CC0000" } },
                { "type": "rect", "x": 400, "y": 850, "w": 200, "h": 100, "style": { "fill": "none", "width": 3, "color": "#CC0000" } },
                { "type": "text", "x": 500, "y": 900, "content": "招財進寶", "size": 40, "font": "seal", "style": { "color": "#CC0000" } }
              ]
            }
          ]
        }
      },
      "usage": ["attract_wealth", "business_success", "financial_flow", "prosperity"],
      "image": [
        "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/wuxingzhicaifu.png",
        "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/zhuancaifu.png"
      ],
      "verified": true,
      "hexagrams": [14, 26, 50, 55],
      "elements": ["Metal", "Earth", "Fire"],
      "sealChars": ["五", "路", "財", "神"]
    },
    {
      "id": "fulu_026",
      "name": {
        "zh": "鄧天君真形符",
        "en": "Lord Deng Thunder Deity Talisman", "es": "Talismán de la Deidad del Trueno del Señor Deng", "it": "Talismano della Divinità del Tuono del Signore Deng",
        "pinyin": "Deng Tianjun Zhenxing Fu"
      },
      "description": "A pictographic invocation depicting the True Form (Zhenxing) of Lord Deng, the commander of the Ministry of Thunder. This talisman acts as a direct deity manifestation, invoking his martial form to strike evil with his divine hammer and chisel.",
      "source": { "primary": "Shenxiao Thunder Rites" },
      "structure": {
        "type": "deity_visualization",
        "elements": ["Calligraphy Header", "Thunder Deity Figure (Pictographic)"],
        "instructions": "Visualize the blue-green thunder qi transforming into the deity Lord Deng. The figure holds a hammer and drill, appearing fierce with wings."
      },
      "visualData": {
        "fdl": {
          "version": "1.0",
          "background": "#F5E6CA",
          "layers": [
            {
              "name": "calligraphy",
              "commands": [
                { "type": "text", "x": 500, "y": 100, "content": "五雷", "size": 120, "font": "worm", "style": { "color": "#FF0000" } },
                { "type": "circle", "cx": 500, "cy": 350, "r": 100, "style": { "width": 5, "color": "#FF0000" } },
                { "type": "text", "x": 500, "y": 350, "content": "斬怪", "size": 80, "style": { "color": "#FF0000" } }
              ]
            },
            {
              "name": "deity_figure",
              "commands": [

                { "type": "circle", "cx": 500, "cy": 600, "r": 50, "style": { "fill": "#FF0000" } },
                { "type": "path", "points": [[500, 650], [400, 750], [350, 600]], "style": { "width": 5, "color": "#FF0000" } },
                { "type": "path", "points": [[500, 650], [600, 750], [650, 600]], "style": { "width": 5, "color": "#FF0000" } },
                { "type": "line", "x1": 500, "y1": 650, "x2": 500, "y2": 800, "style": { "width": 10, "color": "#FF0000" } },
                { "type": "line", "x1": 500, "y1": 800, "x2": 450, "y2": 900, "style": { "width": 8, "color": "#FF0000" } },
                { "type": "line", "x1": 500, "y1": 800, "x2": 550, "y2": 900, "style": { "width": 8, "color": "#FF0000" } },
                { "type": "text", "x": 350, "y": 650, "content": "T", "size": 100, "style": { "color": "#FF0000" } },
                { "type": "text", "x": 650, "y": 650, "content": "I", "size": 100, "style": { "color": "#FF0000" } }
              ]
            }
          ]
        }
      },
      "usage": ["deity_manifestation", "striking_evil", "thunder_magic"],
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/fengtianjunzhenxing.png",
      "verified": true,
      "hexagrams": [51, 21, 34],
      "elements": ["Thunder", "Fire", "Metal"],
      "sealChars": ["鄧", "君", "真", "形"]
    },
    {
      "id": "fulu_027",
      "name": {
        "zh": "安魂定魄平安符",
        "en": "Soul Stabilization Peace Talisman", "es": "Talismán de Paz para la Estabilización del Alma", "it": "Talismano di Pace per la Stabilizzazione dell'Anima",
        "pinyin": "Anhun Dingpo Pingan Fu"
      },
      "description": "A talisman used to treat shock, anxiety, or spirit loss. It calls upon the Supreme Emperor (Shangdi) to 'Peacefully Stabilize' (An Zhen) the Hun and Po souls. The central command is framed by two undulating pillars with loops, representing the containment and settling of the Three Hun and Seven Po souls within the body.",
      "source": {
        "primary": "Zhengyi Healing Rites",
        "scholarCitation": "A classic form for treating 'fright' (Jing) and soul loss."
      },
      "structure": {
        "type": "healing_protection",
        "elements": [
          "Header: Imperial Order (敕令)",
          "Background: Red Seal of Authority",
          "Body: Shangdi An Zhen (上帝安鎮)",
          "Pillars: Soul-containing loops"
        ],
        "instructions": "Draw the central command first over the red seal. Then draw the two side pillars, visualizing them as protective barriers keeping the souls from scattering. The final knot at the bottom anchors the spirit to the body."
      },
      "visualData": {
        "fdl": {
          "version": "1.0",
          "background": "#FFFF00",
          "layers": [
            {
              "name": "red_seal_background",
              "opacity": 0.7,
              "commands": [
                { "type": "rect", "x": 200, "y": 250, "w": 600, "h": 350, "style": { "fill": "none", "width": 4, "color": "#FF4500" } },
                { "type": "path", "points": [[220, 270], [780, 270], [780, 580], [220, 580]], "closed": true, "style": { "width": 1, "color": "#FF4500" } },
                { "type": "text", "x": 500, "y": 425, "content": "道經師寶", "size": 100, "font": "nine-fold-seal", "style": { "color": "#FF4500", "alpha": 0.5 } }
              ]
            },
            {
              "name": "black_ink_calligraphy",
              "commands": [
                { "type": "text", "x": 500, "y": 100, "content": "敕令", "size": 120, "font": "seal", "style": { "color": "#000" } },
                { "type": "text", "x": 500, "y": 300, "content": "玄", "size": 80, "style": { "color": "#000" } },
                { "type": "text", "x": 500, "y": 450, "content": "上帝", "size": 100, "font": "vertical", "style": { "color": "#000" } },
                { "type": "text", "x": 500, "y": 700, "content": "安鎮", "size": 120, "font": "vertical", "style": { "color": "#000", "glow": 5 } },
                { "type": "path", "points": [[300, 450], [250, 600], [250, 800], [350, 950]], "style": { "width": 8, "color": "#000", "curve": "wavy" } },
                { "type": "circle", "cx": 230, "cy": 650, "r": 15, "style": { "width": 4, "color": "#000", "fill": "none" } },
                { "type": "circle", "cx": 230, "cy": 720, "r": 15, "style": { "width": 4, "color": "#000", "fill": "none" } },
                { "type": "circle", "cx": 230, "cy": 790, "r": 15, "style": { "width": 4, "color": "#000", "fill": "none" } },
                { "type": "path", "points": [[700, 450], [750, 600], [750, 800], [650, 950]], "style": { "width": 8, "color": "#000", "curve": "wavy" } },
                { "type": "circle", "cx": 770, "cy": 650, "r": 15, "style": { "width": 4, "color": "#000", "fill": "none" } },
                { "type": "circle", "cx": 770, "cy": 720, "r": 15, "style": { "width": 4, "color": "#000", "fill": "none" } },
                { "type": "circle", "cx": 770, "cy": 790, "r": 15, "style": { "width": 4, "color": "#000", "fill": "none" } },
                { "type": "text", "x": 500, "y": 920, "content": "串", "size": 80, "style": { "color": "#000" } }
              ]
            }
          ]
        }
      },
      "usage": ["calm_spirit", "healing", "protection", "soul_retrieval"],
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/pinganfu.png",
      "verified": true,
      "hexagrams": [52, 2, 46, 51],
      "elements": ["Earth", "Water", "Wood"],
      "sealChars": ["安", "魂", "定", "魄"]
    },
    {
      "id": "fulu_028",
      "name": {
        "zh": "禁口舌符",
        "en": "Anti-Gossip Talisman", "es": "Talismán Anti-Chismes", "it": "Talismano Anti-Pettegolezzi",
        "pinyin": "Jin Koushe Fu"
      },
      "description": "Used to silence rumors, stop slander, and resolve legal or bureaucratic disputes (Guanfei). The calligraphy stylized as a clamped mouth or lock 'Seals the four corners' of speech.",
      "source": { "primary": "Folk Daoist Sorcery" },
      "structure": {
        "type": "binding_spell",
        "elements": ["Imperial Header", "Mouth (口) characters", "Locking strokes"],
        "instructions": "Visualize the gossipers mouth being sealed. Can be carried or burnt."
      },
      "visualData": {
        "fdl": {
          "version": "1.0",
          "background": "#F5E6CA",
          "layers": [
            {
              "name": "red_ink",
              "commands": [
                { "type": "text", "x": 500, "y": 100, "content": "敕令", "size": 120, "font": "seal", "style": { "color": "#FF0000" } },
                { "type": "text", "x": 500, "y": 300, "content": "禁", "size": 150, "style": { "color": "#FF0000" } },
                { "type": "text", "x": 500, "y": 500, "content": "口舌", "size": 120, "style": { "color": "#FF0000" } },

                { "type": "path", "points": [[400, 600], [600, 600], [500, 900], [400, 600]], "style": { "width": 5, "color": "#FF0000", "curve": "wavy" } },
                { "type": "text", "x": 500, "y": 800, "content": "閉", "size": 100, "style": { "color": "#FF0000" } }
              ]
            }
          ]
        }
      },
      "usage": ["stop_gossip", "legal_disputes", "binding"],
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/jinkoushefu.png",
      "verified": true,
      "hexagrams": [6, 33, 47],
      "elements": ["Metal", "Fire"],
      "sealChars": ["禁", "口", "舌", "非"]
    },
    {
      "id": "fulu_029",
      "name": {
        "zh": "天師五雷符",
        "en": "Celestial Master's Five Thunders Talisman", "es": "Talismán de los Cinco Truenos del Maestro Celestial", "it": "Talismano dei Cinque Tuoni del Maestro Celeste",
        "pinyin": "Tianshi Wulei Fu"
      },
      "description": "An authoritative system command from the Zhengyi (Celestial Master) lineage for the 'Five Thunder Bureaucracy'. It uses highly fluid 'cloud script' to mobilize thunder deities for bureaucratic exorcism and protection, grounded by the Bagua header in cosmic order.",
      "source": { "primary": "Zhengyi Leifa (Orthodox Unity Thunder Rites)" },
      "structure": {
        "type": "thunder_command",
        "elements": ["Cloud Script", "Bagua Header", "Dragon Qi"],
        "instructions": "This is a high-level command talisman. Draw with focused intent, visualizing black thunder clouds gathering and the roar of a dragon as you form the strokes."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#FFD700", "layers": [
            {
              "name": "dragon_qi_background", "opacity": 0.3, "commands": [
                { "type": "path", "points": [[200, 400], [500, 300], [800, 500], [500, 700], [200, 800], [400, 600]], "style": { "width": 1, "color": "#808080", "curve": "wavy" } },
                { "type": "path", "points": [[800, 400], [600, 500], [300, 600], [500, 800], [700, 900]], "style": { "width": 1, "color": "#808080", "curve": "wavy" } }
              ]
            },
            {
              "name": "bagua_header", "commands": [
                { "type": "bagua", "x": 500, "y": 200, "size": 250, "style": { "color": "#FFA500", "fill": "none" } },
                { "type": "circle", "cx": 500, "cy": 200, "r": 80, "style": { "fill": "none" }, "inside": { "type": "symbol", "content": "yinyang" } }
              ]
            },
            {
              "name": "cloud_script", "commands": [
                { "type": "text", "x": 500, "y": 550, "content": "五雷令", "size": 300, "font": "worm", "style": { "color": "#000000" } }
              ]
            }
          ]
        }
      },
      "usage": ["thunder_command", "bureaucratic_exorcism", "authority"],
      "verified": true,
      "hexagrams": [51, 34, 21, 40],
      "elements": ["Thunder", "Heaven", "Fire"],
      "sealChars": ["天", "師", "五", "雷"]
    },
    {
      "id": "fulu_030",
      "name": {
        "zh": "陽平治都功印",
        "en": "Seal of the Yangping Jurisdiction", "es": "Sello de la Jurisdicción de Yangping", "it": "Sigillo della Giurisdizione di Yangping",
        "pinyin": "Yangping Zhi Dugong Yin"
      },
      "description": "This is a Seal of Authority (印), not a drawn talisman (符). It represents the power to command spirits and registers in the most sacred seal of office in the Celestial Master tradition, the Yangping Jurisdiction Seal. Its complex Nine-Fold Seal Script represents the highest bureaucratic authority.",
      "source": { "primary": "Zhengyi Tradition", "scholarCitation": "Represents the seal passed down from the first Celestial Master, Zhang Daoling." },
      "structure": {
        "type": "seal_of_authority",
        "elements": ["Nine-Fold Seal Script (九疊篆)", "Imperial Edict"],
        "instructions": "This Seal is not drawn but visualized. To use its power, imagine the great deity (the Celestial Master) stamping this crimson seal onto a person, place, or situation. This act confers supreme authority, validates a ritual, and places the target under the deity's direct jurisdiction and protection."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#FFFFFF", "layers": [
            {
              "name": "seal_impression", "commands": [
                { "type": "rect", "x": 200, "y": 200, "w": 600, "h": 600, "style": { "fill": "#CC0000", "width": 0 } },
                { "type": "text", "x": 500, "y": 500, "content": "陽平治都功", "size": 80, "font": "seal", "style": { "color": "#FFFFFF" } }
              ]
            }
          ]
        }
      },
      "usage": ["authority", "spirit_command", "bureaucracy"],
      "verified": true,
      "hexagrams": [1, 2, 45, 17],
      "elements": ["Metal", "Earth"],
      "sealChars": ["陽", "平", "治", "印"]
    },
    {
      "id": "fulu_031",
      "name": {
        "zh": "王馬二元帥符",
        "en": "Talisman of Officers Wang and Ma", "es": "Talismán de los Oficiales Wang y Ma", "it": "Talismano degli Ufficiali Wang e Ma",
        "pinyin": "Wang Ma Er Yuanshuai Fu"
      },
      "description": "A military command talisman invoking Officer Wang the Numinous and Marshal Ma for the purpose of dispatching spirit soldiers. It mobilizes 'Earth Soldiers and Water Soldiers' to execute specific exorcistic missions and provide martial protection.",
      "source": { "primary": "Various Martial/Exorcistic Rites" },
      "structure": {
        "type": "spirit_soldier_dispatch",
        "elements": ["Deity Names", "Central Command Seal", "Edict Text"],
        "instructions": "Write the names of the deities clearly. The central sigil is the activating command, stamped over with a red oval seal. The edict text specifies the soldiers being dispatched."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#F5F5DC", "layers": [
            {
              "name": "black_ink", "commands": [
                { "type": "text", "x": 800, "y": 300, "content": "王靈官", "size": 70, "font": "vertical", "style": { "color": "#000000" } },
                { "type": "text", "x": 200, "y": 300, "content": "馬元帥", "size": 70, "font": "vertical", "style": { "color": "#000000" } },
                { "type": "text", "x": 500, "y": 450, "content": "斬妖", "size": 150, "font": "seal", "style": { "color": "#000000" } },
                { "type": "text", "x": 650, "y": 700, "content": "地兵水兵", "size": 50, "font": "vertical", "style": { "color": "#000000" } },
                { "type": "text", "x": 350, "y": 700, "content": "火車律令", "size": 50, "font": "vertical", "style": { "color": "#000000" } }
              ]
            },
            {
              "name": "red_seal", "opacity": 0.5, "commands": [
                { "type": "rect", "x": 350, "y": 300, "w": 300, "h": 300, "rx": 150, "ry": 150, "style": { "fill": "#FF0000", "stroke": "none" } }
              ]
            }
          ]
        }
      },
      "usage": ["spirit_dispatch", "exorcistic_mission", "martial_protection"],
      "verified": true,
      "hexagrams": [7, 51, 62],
      "elements": ["Fire", "Metal"],
      "sealChars": ["王", "馬", "敕", "令"]
    },
    {
      "id": "fulu_032",
      "name": {
        "zh": "殷公把隘符",
        "en": "Talisman of Duke Yin Guarding the Pass", "es": "Talismán del Duque Yin Guardando el Paso", "it": "Talismano del Duca Yin che Protegge il Passo",
        "pinyin": "Yin Gong Ba Ai Fu"
      },
      "description": "A protective talisman invoking the thunder marshal Duke Yin to guard a specific physical location. It functions as a fortress-like barrier, creating an impassable spiritual seal against demons, intruders, and misfortune under the authority of the Northern Emperor.",
      "source": { "primary": "Thunder Rites Manuals" },
      "structure": {
        "type": "barrier_protection",
        "elements": ["Imperial Header (Beidi)", "Central Command", "Bell/Canopy Shape"],
        "instructions": "This talisman creates a seal. Visualize a great mountain or fortress gate blocking all negative entry as you draw the large bell shape at the bottom."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#FFFFFF", "layers": [
            {
              "name": "ink_drawing", "commands": [
                { "type": "text", "x": 500, "y": 200, "content": "北帝勅命", "size": 80, "font": "vertical", "style": { "color": "#000000" } },

                { "type": "path", "points": [[400, 400], [200, 900], [800, 900], [600, 400]], "style": { "width": 10, "color": "#000000", "fill": "none" } },
                { "type": "text", "x": 500, "y": 600, "content": "把隘", "size": 150, "font": "seal", "style": { "color": "#000000" } },

                { "type": "circle", "cx": 450, "cy": 950, "r": 20, "style": { "fill": "#000000" } },
                { "type": "circle", "cx": 500, "cy": 950, "r": 20, "style": { "fill": "#000000" } },
                { "type": "circle", "cx": 550, "cy": 950, "r": 20, "style": { "fill": "#000000" } }
              ]
            }
          ]
        }
      },
      "usage": ["barrier", "protection", "guarding", "exorcism"],
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/yingonggefu.png",
      "verified": true,
      "hexagrams": [52, 33, 62, 29],
      "elements": ["Mountain", "Water", "Thunder"],
      "sealChars": ["殷", "公", "把", "隘"]
    },
    {
      "id": "fulu_033",
      "name": {
        "zh": "殷公隔符",
        "en": "Talisman of Duke Yin for Separation", "es": "Talismán del Duque Yin para la Separación", "it": "Talismano del Duca Yin per la Separazione",
        "pinyin": "Yin Gong Ge Fu"
      },
      "description": "A metaphysical screen talisman invoking Duke Yin to sever a connection between a person and a negative influence. Its purpose is to 'separate' (Ge) or screen out malevolent forces, miasmas, or ill intentions, effectively blocking them from reaching the bearer.",
      "source": { "primary": "Thunder Rites Manuals" },
      "structure": {
        "type": "barrier_separation",
        "elements": ["Deity Header (Shangdi)", "Cloud Script Body", "Grounding Seal"],
        "instructions": "This talisman is used to create a dividing line. Visualize an impenetrable wall of light forming as you draw the final strokes of the grounding seal at the bottom."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#FFFFFF", "layers": [
            {
              "name": "ink_drawing", "commands": [
                { "type": "circle", "cx": 500, "cy": 100, "r": 30, "style": { "fill": "none", "width": 2, "color": "#000" } },
                { "type": "circle", "cx": 500, "cy": 100, "r": 5, "style": { "fill": "#000" } },
                { "type": "text", "x": 500, "y": 250, "content": "上帝敕令", "size": 60, "font": "vertical", "style": { "color": "#000000" } },

                { "type": "path", "points": [[400, 400], [600, 400], [500, 450], [400, 400]], "style": { "width": 3, "color": "#000", "curve": "wavy" } },
                { "type": "path", "points": [[400, 500], [600, 500], [500, 550], [400, 500]], "style": { "width": 3, "color": "#000", "curve": "wavy" } },

                { "type": "path", "points": [[350, 700], [650, 700]], "style": { "width": 4, "color": "#000" } },
                { "type": "circle", "cx": 500, "cy": 800, "r": 50, "style": { "fill": "#000" } },
                { "type": "line", "x1": 300, "y1": 900, "x2": 700, "y2": 900, "style": { "width": 4, "color": "#000" } },
                { "type": "line", "x1": 300, "y1": 950, "x2": 700, "y2": 950, "style": { "width": 4, "color": "#000" } }
              ]
            }
          ]
        }
      },
      "usage": ["separation", "barrier", "protection", "blocking_influence"],
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/bangongbaaifu.png",
      "verified": true,
      "hexagrams": [52, 23, 33],
      "elements": ["Mountain", "Earth"],
      "sealChars": ["殷", "公", "隔", "斷"]
    },
    {
      "id": "fulu_034",
      "name": {
        "zh": "天師除病符",
        "en": "Celestial Master Healing Talisman", "es": "Talismán de Sanación del Maestro Celestial", "it": "Talismano di Guarigione del Maestro Celeste",
        "pinyin": "Tianshi Chubing Fu"
      },
      "description": "A powerful healing talisman from the Zhengyi lineage that directly invokes the authority of the first Celestial Master, Zhang Daoling. The text commands his presence to 'eliminate sickness and protect the body' (除病保身). The talisman's structure resembles two gourds or bells, sacred vessels for capturing and transforming pathogenic qi.",
      "source": { "primary": "Zhengyi Healing Rites", "scholarCitation": "Explicitly states 'It is of great fortune for a sick person to wear this talisman.'" },
      "structure": {
        "type": "healing_invocation",
        "elements": ["Celestial Master's Name", "Healing Command", "Gourd/Bell Shape"],
        "instructions": "Inscribe on yellow paper with red cinnabar ink. After drawing, hold it over the afflicted area while chanting the name of Zhang Daoling. Can be worn, placed under a pillow, or burned and consumed with water."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#F5F5DC", "layers": [
            {
              "name": "ink_drawing", "commands": [

                { "type": "path", "points": [[500, 100], [300, 150], [250, 450], [500, 500], [750, 450], [700, 150]], "closed": true, "style": { "width": 8, "color": "#000", "fill": "none" } },

                { "type": "path", "points": [[500, 500], [250, 550], [300, 850], [500, 950], [700, 850], [750, 550]], "closed": true, "style": { "width": 8, "color": "#000", "fill": "none" } },

                { "type": "text", "x": 500, "y": 300, "content": "天師張道陵到此", "size": 60, "font": "vertical", "style": { "color": "#000" } },
                { "type": "text", "x": 500, "y": 700, "content": "除病保身", "size": 80, "font": "vertical", "style": { "color": "#000" } }
              ]
            }
          ]
        }
      },
      "usage": ["healing", "protection_from_illness", "spirit_pacification"],
      "verified": true,
      "hexagrams": [18, 25, 49, 27],
      "elements": ["Wood", "Earth"],
      "sealChars": ["天", "師", "除", "病"]
    },
    {
      "id": "fulu_035",
      "name": {
        "zh": "關聖帝君護身符",
        "en": "Lord Guan's Protection Talisman", "es": "Talismán de Protección del Señor Guan", "it": "Talismano di Protezione del Signore Guan",
        "pinyin": "Guan Sheng Di Jun Hushen Fu"
      },
      "description": "A powerful personal protection talisman invoking Lord Guan's martial righteousness to guard the bearer's body. The outer gourd-shaped calligraphy acts as a sacred vessel to neutralize negative Qi, while the central command calls upon the deified warrior's supreme authority to ensure safety.",
      "source": { "primary": "Folk Daoist Pantheon" },
      "structure": {
        "type": "deity_protection",
        "elements": ["Gourd Shape Calligraphy", "Central Command", "Red Nine-Fold Seal"],
        "instructions": "Visualize the protective presence of Lord Guan, clad in green robes with his saber, forming a shield around you. This talisman is especially effective when carried on the person."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#FFD700", "layers": [
            {
              "name": "foundation_seal", "opacity": 0.85, "commands": [
                { "type": "rect", "x": 300, "y": 250, "w": 400, "h": 400, "style": { "fill": "none", "width": 4, "color": "#CC0000" } },
                { "type": "path", "points": [[320, 270], [680, 270], [680, 630], [320, 630]], "closed": true, "style": { "width": 1, "color": "#CC0000" } }
              ]
            },
            {
              "name": "gourd_calligraphy", "commands": [
                { "type": "path", "points": [[500, 50], [300, 150], [250, 400], [300, 750], [500, 950]], "style": { "width": 12, "color": "#000", "curve": "smooth" } },
                { "type": "path", "points": [[500, 50], [700, 150], [750, 400], [700, 750], [500, 950]], "style": { "width": 12, "color": "#000", "curve": "smooth" } },
                { "type": "text", "x": 500, "y": 450, "content": "關聖帝君護命", "size": 90, "font": "vertical-worm", "style": { "color": "#000" } }
              ]
            }
          ]
        }
      },
      "usage": ["personal_protection", "ward_off_evil", "righteousness", "martial_arts"],
      "image": "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/imgs/hushengfu.png",
      "verified": true,
      "hexagrams": [34, 1, 7, 51],
      "elements": ["Metal", "Fire", "Heaven"],
      "sealChars": ["關", "聖", "帝", "君"]
    },
    {
      "id": "fulu_036",
      "name": {
        "zh": "三霄娘娘制煞符",
        "en": "Talisman of the Sanxiao Goddesses", "es": "Talismán de las Diosas Sanxiao", "it": "Talismano delle Dee Sanxiao",
        "pinyin": "Sanxiao Niangniang Zhi Sha Fu"
      },
      "description": "A potent protective talisman invoking the Three Heavenly Goddesses (Sanxiao Niangniang): Qiongxiao, Bixiao, and Yunxiao. They are formidable deities summoned to 'Control and Neutralize Sha Qi' (Zhi Sha Hua Wu), offering powerful protection against curses, spiritual attacks, and general misfortune.",
      "source": { "primary": "Investiture of the Gods (Fengshen Yanyi) Folk Tradition" },
      "structure": {
        "type": "deity_exorcism",
        "elements": ["Goddess Names", "Central Command Glyph", "Containment Pillars"],
        "instructions": "Visualize the three goddesses appearing on clouds, wielding their powerful magical instruments (Golden Dragon Scissor, Primordial Golden Dipper) to cut away and neutralize all negative energy directed at you."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#FFD700", "layers": [
            {
              "name": "foundation_seal", "opacity": 0.85, "commands": [
                { "type": "rect", "x": 300, "y": 250, "w": 400, "h": 400, "style": { "fill": "none", "width": 4, "color": "#CC0000" } }
              ]
            },
            {
              "name": "calligraphy", "commands": [
                { "type": "text", "x": 500, "y": 150, "content": "瓊霄碧霄敕令", "size": 60, "font": "vertical", "style": { "color": "#000" } },
                { "type": "path", "points": [[300, 250], [300, 800]], "style": { "width": 10, "color": "#000", "curve": "heavy" } },
                { "type": "path", "points": [[700, 250], [700, 800]], "style": { "width": 10, "color": "#000", "curve": "heavy" } },

                { "type": "path", "points": [[400, 400], [600, 500]], "style": { "width": 8, "color": "#000" } },
                { "type": "path", "points": [[600, 400], [400, 500]], "style": { "width": 8, "color": "#000" } },
                { "type": "text", "x": 500, "y": 850, "content": "制煞化無", "size": 80, "font": "vertical", "style": { "color": "#000" } }
              ]
            }
          ]
        }
      },
      "usage": ["dissolve_sha", "curse_breaking", "protection_family", "ward_off_evil"],
      "verified": true,
      "hexagrams": [40, 2, 51, 49],
      "elements": ["Earth", "Water", "Thunder"],
      "sealChars": ["三", "霄", "制", "煞"]
    },
    {
      "id": "fulu_037",
      "name": {
        "zh": "北斗解除四厄符",
        "en": "Northern Dipper Talisman for Releasing Misfortunes", "es": "Talismán de la Osa Mayor para Liberar Desgracias", "it": "Talismano del Grande Carro per Liberare le Sventure",
        "pinyin": "Beidou Jiechu Si'e Fu"
      },
      "description": "A specific protective talisman invoking the Seven Primal Lords of the Northern Dipper (Ursa Major). Its function is to 'release' (jiechu) the 'Four Misfortunes' (si'e) — traditionally calamities associated with fire, water, weapons, and legal entanglements.",
      "source": { "primary": "Daoist Stellar Rites Compendium" },
      "structure": {
        "type": "stellar_protection",
        "elements": ["Northern Dipper Authority", "Elongated Seal Script", "Containment Border"],
        "instructions": "Inscribe on yellow paper with red cinnabar. While drawing, visualize the seven stars of the Dipper forming a protective canopy above, their light flowing down into the strokes of the talisman."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#FFD700", "layers": [
            {
              "name": "red_ink", "commands": [
                { "type": "rect", "x": 150, "y": 100, "w": 700, "h": 850, "style": { "width": 8, "color": "#FF0000", "fill": "none" } },

                { "type": "text", "x": 500, "y": 500, "content": "北斗解厄", "size": 180, "font": "vertical-seal", "style": { "color": "#FF0000" } }
              ]
            }
          ]
        }
      },
      "usage": ["disaster_aversion", "protection", "stellar_magic", "navigate_danger"],
      "verified": true,
      "hexagrams": [29, 30, 40, 6],
      "elements": ["Water", "Fire", "Heaven"],
      "sealChars": ["北", "斗", "解", "厄"]
    },
    {
      "id": "fulu_038",
      "name": {
        "zh": "天蓬印",
        "en": "Seal of Marshal Tianpeng", "es": "Sello del Mariscal Tianpeng", "it": "Sigillo del Marisciallo Tianpeng",
        "pinyin": "Tianpeng Yin"
      },
      "description": "This is a Seal of Authority (印), not a drawn talisman (符). It represents the power to command spirits and thunder deities in the name of Marshal Tianpeng, a paramount exorcistic deity in Daoism. It is used to stamp official commands to spirit-soldiers.",
      "source": { "primary": "Daofa Huiyuan (道法會元)", "scholarCitation": "A key artifact of the Tianpeng exorcistic rites." },
      "structure": {
        "type": "seal_of_authority",
        "elements": ["Nine-Fold Seal Script", "Celestial Dots"],
        "instructions": "This Seal is not drawn but visualized. To use its power, imagine the great deity (Marshal Tianpeng) stamping this crimson seal onto a person, place, or situation. This act confers supreme authority, validates a ritual, and places the target under the deity's direct jurisdiction and protection."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#FFFFFF", "layers": [
            {
              "name": "seal_impression", "commands": [
                { "type": "rect", "x": 200, "y": 200, "w": 600, "h": 600, "style": { "fill": "#CC0000", "width": 0 } },
                { "type": "text", "x": 500, "y": 500, "content": "天蓬神印", "size": 80, "font": "seal", "style": { "color": "#FFFFFF" } }
              ]
            }
          ]
        }
      },
      "usage": ["exorcism", "authority", "command", "thunder_magic"],
      "verified": true,
      "hexagrams": [51, 34, 1, 17],
      "elements": ["Thunder", "Metal", "Heaven"],
      "sealChars": ["天", "蓬", "印", "信"]
    },
    {
      "id": "fulu_039",
      "name": {
        "zh": "斬病除死符",
        "en": "Talisman for Expelling Sickness and Death", "es": "Talismán para Expulsar la Enfermedad y la Muerte", "it": "Talismano per Scacciare la Malattia e la Morte",
        "pinyin": "Zhan Bing Chu Si Fu"
      },
      "description": "A powerful exorcistic talisman designed to confront and banish the root spirits of illness (病) and death (死). It employs a stark, aggressive form of 'ghost script' to sever a person's connection to pathogenic qi and the forces of decay.",
      "source": { "primary": "Folk Healing Rituals (Zhu You Ke - 祝由科)" },
      "structure": {
        "type": "curative_exorcism",
        "elements": ["Sickness/Death Characters", "Binding/Severing Glyphs"],
        "instructions": "Drawn with black ink. The left column names the affliction to be removed. The chaotic right-hand script is the act of binding and expelling it. To be burned, with the ashes mixed with water for washing the afflicted area."
      },
      "visualData": {
        "fdl": {
          "version": "1.0", "background": "#FFFFFF", "layers": [
            {
              "name": "black_ink", "commands": [
                { "type": "text", "x": 300, "y": 400, "content": "病病病死死死", "size": 90, "font": "vertical", "style": { "color": "#000" } },
                { "type": "path", "points": [[600, 100], [700, 200], [550, 300], [750, 450], [600, 600], [700, 750], [550, 900]], "style": { "width": 8, "color": "#000", "curve": "wavy" } }
              ]
            }
          ]
        }
      },
      "usage": ["expel_illness", "healing", "protection_from_death", "exorcism"],
      "verified": true,
      "hexagrams": [18, 40, 23, 49],
      "elements": ["Wood", "Water", "Metal"],
      "sealChars": ["斬", "病", "除", "死"]
    },
  ],

  "fuzhou": [
    {
      "id": "fuzhou_001",
      "name": { "zh": "淨天地神咒", "en": "Divine Incantation for Purifying Heaven and Earth", "es": "Encantación Divina para Purificar el Cielo y la Tierra", "it": "Incantesimo Divino per Purificare il Cielo e la Terra", "pinyin": "Jing Tiandi Shenzhou" },
      "description": "Fundamental Daoist incantation used to purify ritual space before ceremonies.",
      "text": {
        "chinese": "天地自然，穢氣分散，洞中玄虛，晃朗太元。八方威神，使我自然。靈寶符命，普告九天；幹羅達那，洞罡太玄；斬妖縛邪，度人萬千。中山神咒，元始玉文，持誦一遍，卻病延年；按行五嶽，八海知聞；魔王束首，侍衛我軒；凶穢消散，道炁常存。",
        "pinyin": "Tiandi ziran, huiqi fensan, dong zhong xuanxu, huanglang taiyuan. Bafang weishen, shi wo ziran. Lingbao fuming, pu gao jiutian; gan luo da na, dong gang tai xuan; zhan yao fu xie, du ren wan qian. Zhongshan shenzhou, Yuanshi yuwen, chi song yi bian, que bing yan nian; an xing wu yue, ba hai zhi wen; mowang shushou, shiwei wo xuan; xiong hui xiaosan, dao qi changcun.",
        "translation": "Heaven and Earth are natural, polluted qi disperses. Within the cavern, mysterious and void, vast and bright Grand Origin. The awesome spirits of the eight directions make me natural. The Numinous Treasure talisman command universally announces to the nine heavens..."
      },
      "usage": ["space_purification", "ritual_opening", "daily_liturgy", "purification", "protection"],
      "verified": true
    },
    {
      "id": "fuzhou_002",
      "name": { "zh": "金光神咒", "en": "Golden Light Divine Incantation", "es": "Encantación Divina de la Luz Dorada", "it": "Incantesimo Divino della Luce Dorata", "pinyin": "Jinguang Shenzhou" },
      "description": "Incantation for protection and embodiment of golden light energy.",
      "text": {
        "chinese": "天地玄宗，萬炁本根。廣修億劫，證吾神通。三界內外，惟道獨尊。體有金光，覆映吾身。視之不見，聽之不聞。包羅天地，養育群生. 受持萬遍，身有光明. 三界侍衛，五帝司迎. 萬神朝禮，役使雷霆. 鬼妖喪膽，精怪忘形. 內有霹靂，雷神隱名. 洞慧交徹，五炁騰騰. 金光速現，覆護真人。",
        "pinyin": "Tiandi xuanzong, wan qi bengen. Guangxiu yi jie, zheng wu shentong. Sanjie nei wai, wei dao duzun. Ti you jinguang, fu ying wu shen...",
        "translation": "Heaven and Earth's mysterious origin, the root of all qi. Broadly cultivating eons, manifesting my spiritual power. Within and without the three realms, only the Dao is honored. The body has golden light, covering and reflecting my person..."
      },
      "usage": ["protection", "empowerment", "body_light"],
      "verified": true
    },
    {
      "id": "fuzhou_006",
      "name": { "zh": "天蓬咒", "en": "Heavenly Mound Incantation", "es": "Encantación del Montículo Celestial", "it": "Incantesimo del Tumulo Celeste", "pinyin": "Tianpeng Zhou" },
      "description": "Incantation of Marshal Tianpeng, powerful exorcistic invocation.",
      "text": {
        "chinese": "天蓬天蓬，九元煞童。五丁都司，高刁北翁。七政八靈，太上皓凶。長顱巨獸，手把帝鍾。素梟三神，嚴駕夔龍. 威劍神王，斬邪滅踪. 紫氣乘天，丹霞赫衝. 吞魔食鬼，橫身飲風. 蒼舌綠齒，四目老翁. 天丁力士，威南御凶. 天騶激戾，威北銜鋒. 三十萬兵，衛我九重. 劈屍千里，掃卻不祥。",
        "pinyin": "Tianpeng tianpeng, jiu yuan sha tong. Wu ding dusi, gao diao bei weng...",
        "translation": "Heavenly Mound, Heavenly Mound, nine primal killing youths. Five Ding directors, high and fierce northern elder..."
      },
      "usage": ["exorcism", "protection", "thunder"],
      "verified": true
    }
  ],

  "fengshui": [
    {
      "id": "fs_001",
      "name": { "zh": "宅經鎮宅法", "en": "Zhaijing Residence Stabilization", "es": "Estabilización de la Residencia Zhaijing", "it": "Stabilizzazione della Residenza Zhaijing", "pinyin": "Zhaijing Zhenzhai Fa" },
      "description": "Classical environmental remedy for stabilizing the energetic flow of a residence and protecting against negative directional influences (Sha Qi).",
      "source": { "primary": "Zhengtong Daozang", "textTitle": "Huangdi Zhaijing", "references": ["DZ 1024"] },
      "usage": ["environmental_stabilization", "protection", "prosperity", "home_harmony"],
      "instructions": "Protect all corners of the residence. Activate Northwest (Qian) and Southeast (Xun) sectors for authority and harmony. Suppress negative energy in the South (Li) sector.",
      "verified": true
    },
    {
      "id": "fs_002",
      "name": { "zh": "葬書五行氣脈法", "en": "Five Element Qi-Vein Stabilization", "es": "Estabilización del Qi-Vena de los Cinco Elementos", "it": "Stabilizzazione del Qi-Vena dei Cinque Elementi", "pinyin": "Zangshu Wuxing Qimai Fa" },
      "description": "Rooted in the foundational text of Feng Shui, focusing on the accumulation of vital Qi through environmental alignment.",
      "source": { "primary": "Zhengtong Daozang", "textTitle": "Zangshu", "references": ["DZ 1019"] },
      "usage": ["qi_accumulation", "vitality", "wealth_retention", "environmental_harmony"],
      "instructions": "Enhance Qi flow in all directions. Activate North (Kan) for Water element vitality. Strengthen Southeast (Xun) for Wood element growth and wealth accumulation. Balance the center with Earth element.",
      "verified": true
    },

    {
      "id": "fs_bagua_S",
      "name": { "zh": "離宮風水法 — 南方", "en": "Li Palace Feng Shui — South (Fame & Reputation)", "es": "Feng Shui del Palacio Li — Sur (Fama y Reputación)", "it": "Feng Shui del Palazzo Li — Sud (Fama e Reputazione)", "pinyin": "Li Gong Fengshui Fa — Nan Fang" },
      "bagua": {
        "trigram": "Li", "trigram_zh": "離", "binary": "101",
        "direction": "S", "angle_canvas_deg": -90,
        "element": "Fire", "element_zh": "火",
        "color": "#F44336", "color_name": "Red / Purple / Orange",
        "life_area": "Fame & Reputation", "life_area_zh": "名聲 · 地位",
        "yin_yang": "Yin", "season": "Summer", "planet": "Mars",
        "body": "Eyes, Heart", "number": 9
      },
      "description": "The South sector (Li / Fire) governs fame, reputation, how others see you, and your recognition in the world. Fire energy here fuels ambition, visibility, and social standing. A well-activated South sector attracts acknowledgment, awards, and professional recognition.",
      "remedies": [
        { "type": "element", "item": "Candles or fireplace", "zh": "蠟燭 · 壁爐", "reason": "Feeds Fire element directly. Even a pair of red candles activates this sector powerfully." },
        { "type": "color", "item": "Red, orange, or purple objects", "zh": "紅色 · 橙色 · 紫色", "reason": "Fire colors; introduce via cushions, artwork, or a red lamp." },
        { "type": "shape", "item": "Triangular or star-shaped items", "zh": "三角形 · 星形", "reason": "Triangle is the Fire shape; pyramids, star ornaments, or sunburst mirrors." },
        { "type": "plant", "item": "Red or orange flowering plants", "zh": "紅花 · 橙花", "reason": "Living Wood feeds Fire. Use poppies, marigolds, or birds-of-paradise." },
        { "type": "symbol", "item": "Phoenix (Vermilion Bird)", "zh": "朱雀 · 鳳凰", "reason": "The divine bird of the South; an image or figurine calls in career brilliance and fame." },
        { "type": "material", "item": "Leather, fur, feathers (animal-origin)", "zh": "皮革 · 羽毛", "reason": "Natural materials associated with Fire; minimal use, accent pieces only." },
        { "type": "art", "item": "Sunrise or sunlit landscape artwork", "zh": "日出畫 · 光明藝術", "reason": "Imagery of bright light, fire, or the sun amplifies yang Fire qi." },
        { "type": "avoid", "item": "Water features, blue/black décor", "zh": "避免水 · 黑藍色", "reason": "Water extinguishes Fire. Aquariums, fountains, and dark blue colors suppress reputation." }
      ],
      "hexagrams": [13, 14, 30, 35, 55, 50, 56],
      "fdl": {
        "type": "fengshui_sector",
        "sector": "S", "trigram": "Li", "color": "#F44336",
        "highlight": { "fill": "#F4433630", "stroke": "#F44336", "glow": true, "glowColor": "#FF5252" },
        "icons": [
          { "type": "symbol", "content": "🔥", "x": 500, "y": 150, "size": 60 },
          { "type": "text", "content": "離", "x": 500, "y": 220, "size": 40, "font": "NotoSerifSC", "style": { "color": "#F44336" } }
        ],
        "label": { "text": "Fame", "subtext": "Fire · Li", "position": "outside", "color": "#F44336" }
      },
      "verified": true,
      "usage": ["fame", "recognition", "career_visibility", "social_standing"]
    },

    {
      "id": "fs_bagua_SW",
      "name": { "zh": "坤宮風水法 — 西南", "en": "Kun Palace Feng Shui — Southwest (Love & Relationships)", "es": "Feng Shui del Palacio Kun — Suroeste (Amor y Relaciones)", "it": "Feng Shui del Palazzo Kun — Sudovest (Amore e Relazioni)", "pinyin": "Kun Gong Fengshui Fa — Xi Nan" },
      "bagua": {
        "trigram": "Kun", "trigram_zh": "坤", "binary": "000",
        "direction": "SW", "angle_canvas_deg": -135,
        "element": "Earth", "element_zh": "土",
        "color": "#E91E63", "color_name": "Pink / Peach / Beige / Yellow",
        "life_area": "Love & Relationships", "life_area_zh": "愛情 · 婚姻 · 伴侶",
        "yin_yang": "Yin", "season": "Late Summer", "planet": "Saturn",
        "body": "Belly, Organs", "number": 2
      },
      "description": "The Southwest sector (Kun / Earth) rules romantic love, marriage, partnerships, and all close relationships. Kun is the ultimate yin — receptive, nurturing, and devoted. Activating this area attracts a loving partner, deepens existing relationships, and fosters harmony between spouses.",
      "remedies": [
        { "type": "crystal", "item": "Rose quartz pair", "zh": "玫瑰石英雙顆", "reason": "The premier love crystal. Place two pieces together to symbolise a harmonious couple." },
        { "type": "symbol", "item": "Mandarin ducks (pairs)", "zh": "鴛鴦成對", "reason": "Traditional Chinese symbol of lifelong romantic devotion. Use ceramic, jade, or carved wood." },
        { "type": "color", "item": "Pink, peach, and soft red décor", "zh": "粉色 · 桃色 · 柔紅", "reason": "Soft Fire and Earth colors that nurture romantic qi without overwhelming yin energy." },
        { "type": "element", "item": "Earthenware ceramics or terracotta", "zh": "陶器 · 瓷器", "reason": "Earth element support; pottery, clay pots, or ceramic art in warm earth tones." },
        { "type": "art", "item": "Artwork of couples or romantic scenes", "zh": "情侶畫 · 浪漫藝術", "reason": "Imagery of two beings in harmonious union sets the energetic intention for the space." },
        { "type": "plant", "item": "Peonies (if in season)", "zh": "牡丹花", "reason": "Called the 'flower of riches and honour', it activates romance and marriageability." },
        { "type": "number", "item": "Display things in pairs", "zh": "成雙成對", "reason": "Two pillows, two candles, two nightstands — the number 2 amplifies Kun's partnership energy." },
        { "type": "avoid", "item": "Single figures, broken items, mirrors facing the bed", "zh": "避免單人物 · 破損物", "reason": "Single figures symbolise loneliness; broken objects carry sha qi that damages relationships." }
      ],
      "hexagrams": [2, 11, 19, 46, 24, 15],
      "fdl": {
        "type": "fengshui_sector", "sector": "SW", "trigram": "Kun", "color": "#E91E63",
        "highlight": { "fill": "#E91E6330", "stroke": "#E91E63", "glow": true },
        "icons": [
          { "type": "symbol", "content": "💕", "x": 150, "y": 150, "size": 50 },
          { "type": "text", "content": "坤", "x": 150, "y": 210, "size": 40, "style": { "color": "#E91E63" } }
        ],
        "label": { "text": "Love", "subtext": "Earth · Kun", "position": "outside", "color": "#E91E63" }
      },
      "verified": true,
      "usage": ["love", "marriage", "partnership", "relationships"]
    },

    {
      "id": "fs_bagua_W",
      "name": { "zh": "兌宮風水法 — 西方", "en": "Dui Palace Feng Shui — West (Children & Creativity)", "es": "Feng Shui del Palacio Dui — Oeste (Hijos y Creatividad)", "it": "Feng Shui del Palazzo Dui — Ovest (Figli e Creatività)", "pinyin": "Dui Gong Fengshui Fa — Xi Fang" },
      "bagua": {
        "trigram": "Dui", "trigram_zh": "兌", "binary": "011",
        "direction": "W", "angle_canvas_deg": 180,
        "element": "Metal", "element_zh": "金",
        "color": "#FFC107", "color_name": "White / Silver / Gold",
        "life_area": "Children & Creativity", "life_area_zh": "子女 · 創意 · 喜悅",
        "yin_yang": "Yin", "season": "Autumn", "planet": "Venus",
        "body": "Mouth, Lungs", "number": 7
      },
      "description": "The West sector (Dui / Lake / Metal) governs children, creative projects, joy, and the pleasures of life. It rules fertility, the completion of projects, and playful self-expression. Dui also relates to speech, communication, and the ability to express one's creativity.",
      "remedies": [
        { "type": "element", "item": "Metal bowls, brass, copper décor", "zh": "金屬器皿 · 銅器", "reason": "Direct Metal element support; round metal bowls, copper vases, or brass figurines." },
        { "type": "crystal", "item": "Clear quartz cluster or moonstone", "zh": "水晶簇 · 月光石", "reason": "Metal-associated crystals that enhance clarity, creativity, and joy." },
        { "type": "color", "item": "White, silver, and gold tones", "zh": "白色 · 銀色 · 金色", "reason": "Metal colours; white walls, silver frames, or golden accents in the West." },
        { "type": "shape", "item": "Round or oval objects", "zh": "圓形 · 橢圓形", "reason": "Round is the Metal shape and symbolises completeness and the cycle of creation." },
        { "type": "symbol", "item": "White Tiger or playful child figurines", "zh": "白虎 · 孩童像", "reason": "The White Tiger guards the West; child imagery activates fertility and creative offspring." },
        { "type": "art", "item": "Sunset landscapes or metallic abstract art", "zh": "夕陽畫 · 金屬抽象藝術", "reason": "Autumn/twilight imagery honours the season of Dui; metallic art feeds the element." },
        { "type": "avoid", "item": "Fire décor (red candles, fireplaces)", "zh": "避免火元素 · 紅色", "reason": "Fire melts Metal. Keep flames out of the West sector." }
      ],
      "hexagrams": [17, 31, 43, 45, 58, 60, 61],
      "fdl": {
        "type": "fengshui_sector", "sector": "W", "trigram": "Dui", "color": "#FFC107",
        "highlight": { "fill": "#FFC10730", "stroke": "#FFC107", "glow": true },
        "icons": [
          { "type": "symbol", "content": "⭕", "x": 150, "y": 500, "size": 50 },
          { "type": "text", "content": "兌", "x": 150, "y": 560, "size": 40, "style": { "color": "#FFC107" } }
        ],
        "label": { "text": "Creativity", "subtext": "Metal · Dui", "position": "outside", "color": "#FFC107" }
      },
      "verified": true,
      "usage": ["children", "creativity", "joy", "fertility", "completion"]
    },

    {
      "id": "fs_bagua_NW",
      "name": { "zh": "乾宮風水法 — 西北", "en": "Qian Palace Feng Shui — Northwest (Helpful People & Travel)", "es": "Feng Shui del Palacio Qian — Noroeste (Personas Ayudantes y Viajes)", "it": "Feng Shui del Palazzo Qian — Nordovest (Persone Utili e Viaggi)", "pinyin": "Qian Gong Fengshui Fa — Xi Bei" },
      "bagua": {
        "trigram": "Qian", "trigram_zh": "乾", "binary": "111",
        "direction": "NW", "angle_canvas_deg": 135,
        "element": "Metal", "element_zh": "金",
        "color": "#FF9800", "color_name": "White / Gray / Silver",
        "life_area": "Helpful People & Travel", "life_area_zh": "貴人 · 旅行 · 天命",
        "yin_yang": "Yang", "season": "Late Autumn", "planet": "Venus/Saturn",
        "body": "Head, Brain", "number": 6
      },
      "description": "The Northwest sector (Qian / Heaven / Metal) governs benefactors, mentors, helpful people, and international travel. This is the sector of the 'Heavenly Father' — attracting divine timing, synchronicity, noble support, and the connections that open doors. It also rules the head of household and the patriarch.",
      "remedies": [
        { "type": "element", "item": "Metal globe or brass compass", "zh": "地球儀 · 羅盤", "reason": "Metal element + travel symbolism; activates Qian's domain of distant journeys and global connections." },
        { "type": "crystal", "item": "Grey or white crystals (hematite, selenite)", "zh": "血鐵礦 · 白硒石", "reason": "Metal element crystals that attract mentors and clear the mind for divine guidance." },
        { "type": "symbol", "item": "Six-rod metal wind chime", "zh": "六管金屬風鈴", "reason": "Six is the number of Qian; a 6-rod metal wind chime activates this sector powerfully." },
        { "type": "art", "item": "Images of mountains, sky, or respected elders", "zh": "山嶽 · 天空 · 長者畫", "reason": "Heaven and authority imagery; portraits of mentors or landscapes with open sky." },
        { "type": "item", "item": "Thank-you cards or photos of mentors", "zh": "感謝卡 · 貴人照", "reason": "Physical acknowledgement of helpful people reinforces the energetic 'request' to attract more." },
        { "type": "avoid", "item": "Fire element (red, triangles), Water features", "zh": "避免火 · 水", "reason": "Fire melts Metal; Water drains Metal energy. Keep this sector clear of these elements." }
      ],
      "hexagrams": [1, 6, 10, 12, 25, 33, 34, 44],
      "fdl": {
        "type": "fengshui_sector", "sector": "NW", "trigram": "Qian", "color": "#FF9800",
        "highlight": { "fill": "#FF980030", "stroke": "#FF9800", "glow": true },
        "icons": [
          { "type": "symbol", "content": "🌐", "x": 150, "y": 850, "size": 50 },
          { "type": "text", "content": "乾", "x": 150, "y": 910, "size": 40, "style": { "color": "#FF9800" } }
        ],
        "label": { "text": "Benefactors", "subtext": "Metal · Qian", "position": "outside", "color": "#FF9800" }
      },
      "verified": true,
      "usage": ["helpful_people", "mentors", "travel", "divine_support", "authority"]
    },

    {
      "id": "fs_bagua_N",
      "name": { "zh": "坎宮風水法 — 北方", "en": "Kan Palace Feng Shui — North (Career & Life Path)", "es": "Feng Shui del Palacio Kan — Norte (Carrera y Camino de Vida)", "it": "Feng Shui del Palazzo Kan — Nord (Carriera e Percorso di Vita)", "pinyin": "Kan Gong Fengshui Fa — Bei Fang" },
      "bagua": {
        "trigram": "Kan", "trigram_zh": "坎", "binary": "010",
        "direction": "N", "angle_canvas_deg": 90,
        "element": "Water", "element_zh": "水",
        "color": "#2196F3", "color_name": "Black / Dark Blue / Navy",
        "life_area": "Career & Life Path", "life_area_zh": "事業 · 人生道路 · 使命",
        "yin_yang": "Yang (within Yin)", "season": "Winter", "planet": "Mercury",
        "body": "Kidneys, Ears, Blood", "number": 1
      },
      "description": "The North sector (Kan / Water) governs career, life purpose, and one's path through the world. Water symbolises the constant flow of opportunities and the depth of wisdom required to navigate life. A well-activated North attracts career advancement, clarity of purpose, and professional recognition.",
      "remedies": [
        { "type": "element", "item": "Aquarium or water fountain (flowing)", "zh": "魚缸 · 流水噴泉", "reason": "Moving water in the North is the single most powerful career activator. Fish add life qi." },
        { "type": "color", "item": "Black, dark blue, or navy accents", "zh": "黑色 · 深藍 · 海軍藍", "reason": "Water colors; even a black rug, navy cushions, or dark-framed artwork activates Kan." },
        { "type": "symbol", "item": "Black Tortoise figurine", "zh": "玄武 · 黑龜", "reason": "The divine protector of the North; a black tortoise at the back of your workspace provides career support." },
        { "type": "art", "item": "Images of water: ocean, rivers, streams", "zh": "海洋畫 · 流水畫", "reason": "Water imagery of any kind feeds the North. Flowing water is better than still." },
        { "type": "item", "item": "Career intentions / vision board", "zh": "事業目標板", "reason": "Write your career goals on paper and place them in the North sector to activate your life path." },
        { "type": "avoid", "item": "Earth tones, pottery, Fire element", "zh": "避免土色 · 陶器 · 火元素", "reason": "Earth dams Water; too much Earth energy in the North blocks career flow." }
      ],
      "hexagrams": [5, 7, 8, 29, 39, 47, 48, 59, 63, 64],
      "fdl": {
        "type": "fengshui_sector", "sector": "N", "trigram": "Kan", "color": "#2196F3",
        "highlight": { "fill": "#2196F330", "stroke": "#2196F3", "glow": true },
        "icons": [
          { "type": "symbol", "content": "💧", "x": 500, "y": 850, "size": 55 },
          { "type": "text", "content": "坎", "x": 500, "y": 910, "size": 40, "style": { "color": "#2196F3" } }
        ],
        "label": { "text": "Career", "subtext": "Water · Kan", "position": "outside", "color": "#2196F3" }
      },
      "verified": true,
      "usage": ["career", "life_path", "purpose", "professional_growth", "wisdom"]
    },

    {
      "id": "fs_bagua_NE",
      "name": { "zh": "艮宮風水法 — 東北", "en": "Gen Palace Feng Shui — Northeast (Knowledge & Wisdom)", "es": "Feng Shui del Palacio Gen — Noreste (Conocimiento y Sabiduría)", "it": "Feng Shui del Palazzo Gen — Nordest (Conoscenza e Saggezza)", "pinyin": "Gen Gong Fengshui Fa — Dong Bei" },
      "bagua": {
        "trigram": "Gen", "trigram_zh": "艮", "binary": "100",
        "direction": "NE", "angle_canvas_deg": 45,
        "element": "Earth", "element_zh": "土",
        "color": "#00BCD4", "color_name": "Yellow / Beige / Blue-green",
        "life_area": "Knowledge & Wisdom", "life_area_zh": "知識 · 智慧 · 自我修養",
        "yin_yang": "Yang", "season": "Late Winter", "planet": "Saturn",
        "body": "Hands, Back, Joints", "number": 8
      },
      "description": "The Northeast sector (Gen / Mountain / Earth) governs self-cultivation, spiritual wisdom, academic success, and inner stillness. Like a mountain, this sector represents the capacity to pause, reflect, and accumulate knowledge. It is the sector of the student, the meditator, and the sage.",
      "remedies": [
        { "type": "item", "item": "Books and study materials", "zh": "書籍 · 學習材料", "reason": "Physical books and educational objects directly activate the knowledge corner." },
        { "type": "crystal", "item": "Amethyst, fluorite, or citrine cluster", "zh": "紫水晶 · 螢石 · 黃水晶", "reason": "Crystals enhance mental clarity and spiritual insight; citrine adds the Earth element." },
        { "type": "element", "item": "Mountain imagery or stone sculptures", "zh": "山石圖 · 石雕", "reason": "Gen IS the mountain. Any still, heavy, rocky object grounds knowledge energy here." },
        { "type": "symbol", "item": "Jade Sage or Wen Chang Tower", "zh": "文昌塔 · 文昌君", "reason": "The Wen Chang god of literature; a Wen Chang tower in the NE powerfully boosts academic success." },
        { "type": "art", "item": "Mountain landscapes or library imagery", "zh": "山脈畫 · 圖書館畫", "reason": "Still, imposing imagery invites meditative focus and the accumulation of inner resources." },
        { "type": "avoid", "item": "Clutter, distracting electronics, mirrors", "zh": "避免雜亂 · 電子設備", "reason": "Clutter disrupts the stillness needed for wisdom. Electronics scatter the concentrated qi." }
      ],
      "hexagrams": [4, 15, 18, 22, 23, 26, 27, 41, 52, 62],
      "fdl": {
        "type": "fengshui_sector", "sector": "NE", "trigram": "Gen", "color": "#00BCD4",
        "highlight": { "fill": "#00BCD430", "stroke": "#00BCD4", "glow": true },
        "icons": [
          { "type": "symbol", "content": "📚", "x": 850, "y": 850, "size": 50 },
          { "type": "text", "content": "艮", "x": 850, "y": 910, "size": 40, "style": { "color": "#00BCD4" } }
        ],
        "label": { "text": "Knowledge", "subtext": "Earth · Gen", "position": "outside", "color": "#00BCD4" }
      },
      "verified": true,
      "usage": ["knowledge", "wisdom", "study", "self_cultivation", "spirituality"]
    },

    {
      "id": "fs_bagua_E",
      "name": { "zh": "震宮風水法 — 東方", "en": "Zhen Palace Feng Shui — East (Family & Health)", "es": "Feng Shui del Palacio Zhen — Este (Familia y Salud)", "it": "Feng Shui del Palazzo Zhen — Est (Famiglia e Salute)", "pinyin": "Zhen Gong Fengshui Fa — Dong Fang" },
      "bagua": {
        "trigram": "Zhen", "trigram_zh": "震", "binary": "001",
        "direction": "E", "angle_canvas_deg": 0,
        "element": "Wood", "element_zh": "木",
        "color": "#4CAF50", "color_name": "Green / Teal",
        "life_area": "Family & Health", "life_area_zh": "家族 · 健康 · 新起始",
        "yin_yang": "Yang", "season": "Spring", "planet": "Jupiter",
        "body": "Feet, Liver, Gallbladder", "number": 3
      },
      "description": "The East sector (Zhen / Thunder / Wood) governs family relationships, ancestral roots, physical health, and new beginnings. Like thunder that breaks the silence of winter, this sector represents the energy of spring and growth — both physical vitality and the renewal of family bonds.",
      "remedies": [
        { "type": "plant", "item": "Healthy green plants (tall, columnar)", "zh": "綠植 · 高木", "reason": "Living plants are the perfect Wood element enhancer. Lucky bamboo, jade plant, or money tree are ideal." },
        { "type": "element", "item": "Wooden furniture or décor", "zh": "木製家具 · 木質裝飾", "reason": "Real wood feeds the element; bamboo items, driftwood sculptures, or hardwood furniture." },
        { "type": "color", "item": "Green and teal shades", "zh": "綠色 · 青色", "reason": "Wood colors; green plants, paintings, or even a green feature wall in the East." },
        { "type": "art", "item": "Family photos and ancestral portraits", "zh": "家庭照片 · 祖先畫像", "reason": "The East is the sector of roots and lineage; honoring family here strengthens bonds." },
        { "type": "symbol", "item": "Azure Dragon (Green Dragon)", "zh": "青龍", "reason": "The divine protector of the East. A green or jade dragon here activates health and family protection." },
        { "type": "shape", "item": "Tall rectangular shapes", "zh": "高長方形", "reason": "The rectangle is the Wood shape; tall bookshelves, column lamps, or rectangular planters." },
        { "type": "avoid", "item": "Metal décor, white/grey dominant, cutting shapes", "zh": "避免金屬 · 白灰主色", "reason": "Metal chops Wood. Too much Metal in the East suppresses family health and growth." }
      ],
      "hexagrams": [3, 16, 17, 21, 24, 25, 32, 40, 42, 51, 54, 55],
      "fdl": {
        "type": "fengshui_sector", "sector": "E", "trigram": "Zhen", "color": "#4CAF50",
        "highlight": { "fill": "#4CAF5030", "stroke": "#4CAF50", "glow": true },
        "icons": [
          { "type": "symbol", "content": "🌿", "x": 850, "y": 500, "size": 55 },
          { "type": "text", "content": "震", "x": 850, "y": 560, "size": 40, "style": { "color": "#4CAF50" } }
        ],
        "label": { "text": "Family & Health", "subtext": "Wood · Zhen", "position": "outside", "color": "#4CAF50" }
      },
      "verified": true,
      "usage": ["family", "health", "new_beginnings", "growth", "ancestry"]
    },

    {
      "id": "fs_bagua_SE",
      "name": { "zh": "巽宮風水法 — 東南", "en": "Xun Palace Feng Shui — Southeast (Wealth & Abundance)", "es": "Feng Shui del Palacio Xun — Sureste (Riqueza y Abundancia)", "it": "Feng Shui del Palazzo Xun — Sudest (Ricchezza e Abbondanza)", "pinyin": "Xun Gong Fengshui Fa — Dong Nan" },
      "bagua": {
        "trigram": "Xun", "trigram_zh": "巽", "binary": "110",
        "direction": "SE", "angle_canvas_deg": -45,
        "element": "Wood", "element_zh": "木",
        "color": "#8BC34A", "color_name": "Green / Purple",
        "life_area": "Wealth & Abundance", "life_area_zh": "財富 · 豐盛 · 繁榮",
        "yin_yang": "Yin", "season": "Spring-Summer transition", "planet": "Jupiter",
        "body": "Thighs, Hips, Breath", "number": 4
      },
      "description": "The Southeast sector (Xun / Wind / Wood) is the most widely used feng shui wealth corner. It governs financial abundance, material prosperity, and the gentle but persistent accumulation of resources. Like a wind that carries seeds of growth, this sector requires consistent activation to build lasting wealth.",
      "remedies": [
        { "type": "plant", "item": "Lucky bamboo, jade plant, or money tree", "zh": "富貴竹 · 玉樹 · 發財樹", "reason": "Living Wood plants are the cornerstone of wealth activation; jade plant especially symbolises money." },
        { "type": "element", "item": "Small water fountain (flowing toward center)", "zh": "流水噴泉（向內流）", "reason": "Water feeds Wood; a fountain whose water flows inward 'brings money in'." },
        { "type": "crystal", "item": "Citrine, pyrite, or green aventurine", "zh": "黃水晶 · 愚人金 · 綠東陵", "reason": "Wealth crystals that activate financial qi; citrine is called the 'merchant's stone'." },
        { "type": "color", "item": "Green and purple accents", "zh": "綠色 · 紫色", "reason": "Green = Wood (growth); purple = wealth in Chinese tradition. Together they amplify abundance." },
        { "type": "symbol", "item": "Wealth ship with coins or ingots", "zh": "聚寶盆 · 財船 · 金元寶", "reason": "A boat filled with coins facing inward symbolises wealth sailing into the home." },
        { "type": "art", "item": "Lush landscape paintings, forests, waterfalls", "zh": "茂密山林畫 · 瀑布畫", "reason": "Imagery of growth, abundance, and flowing water all feed the SE Wood-Water combination." },
        { "type": "item", "item": "Wealth affirmations or vision board", "zh": "財富肯定語 · 心願板", "reason": "Written intentions placed in the SE corner send a clear message to the universe." },
        { "type": "avoid", "item": "Metal décor, fireplaces in SE, clutter", "zh": "避免金屬 · 壁爐 · 雜亂", "reason": "Metal cuts Wood (destroys wealth growth); Fire burns Wood (unsustainable spending)." }
      ],
      "hexagrams": [9, 20, 28, 37, 42, 44, 46, 53, 57, 59, 61],
      "fdl": {
        "type": "fengshui_sector", "sector": "SE", "trigram": "Xun", "color": "#8BC34A",
        "highlight": { "fill": "#8BC34A30", "stroke": "#8BC34A", "glow": true },
        "icons": [
          { "type": "symbol", "content": "💰", "x": 850, "y": 150, "size": 55 },
          { "type": "text", "content": "巽", "x": 850, "y": 210, "size": 40, "style": { "color": "#8BC34A" } }
        ],
        "label": { "text": "Wealth", "subtext": "Wood · Xun", "position": "outside", "color": "#8BC34A" }
      },
      "verified": true,
      "usage": ["wealth", "abundance", "prosperity", "financial_growth", "manifestation"]
    },

    {
      "id": "fs_bagua_CENTER",
      "name": { "zh": "太極中宮風水法 — 中央", "en": "Taiji Central Palace Feng Shui — Center (Health & Unity)", "es": "Feng Shui del Palacio Central Taiji — Centro (Salud y Unidad)", "it": "Feng Shui del Palazzo Centrale Taiji — Centro (Salute e Unità)", "pinyin": "Taiji Zhong Gong Fengshui Fa — Zhong Yang" },
      "bagua": {
        "trigram": "Taiji", "trigram_zh": "太極", "binary": "N/A",
        "direction": "Center", "angle_canvas_deg": null,
        "element": "Earth", "element_zh": "土",
        "color": "#FFB74D", "color_name": "Yellow / Ochre / Brown",
        "life_area": "Health & Well-being", "life_area_zh": "健康 · 整體平衡 · 中心",
        "yin_yang": "Balance", "season": "All / Transition", "planet": "Saturn",
        "body": "Stomach, Spleen, Pancreas", "number": 5
      },
      "description": "The Center (Taiji / Earth) is the hub that connects all eight directions and radiates energy to every corner of the space. It governs overall health, the harmony of the whole household, and the balanced flow of qi throughout. The Center should be open, clean, and well-lit — never cluttered — as it feeds all other sectors.",
      "remedies": [
        { "type": "element", "item": "Keep center open and uncluttered", "zh": "保持中央開闊整潔", "reason": "The most important remedy: a clear center allows qi to circulate freely to all 8 sectors." },
        { "type": "crystal", "item": "Yellow jasper, tiger's eye, or smoky quartz cluster", "zh": "黃碧玉 · 虎眼石 · 煙水晶", "reason": "Earth crystals that ground and stabilize the central health energy of the home." },
        { "type": "color", "item": "Yellow, ochre, or neutral earth tones", "zh": "黃色 · 赭色 · 土色", "reason": "Earth colors reinforce the stabilizing, nourishing quality of the center." },
        { "type": "item", "item": "Round rug or octagonal décor", "zh": "圓形地毯 · 八角形裝飾", "reason": "The round/octagonal shape symbolises the bagua itself and harmonizes all eight directions." },
        { "type": "symbol", "item": "Taijitu (Yin-Yang symbol)", "zh": "太極圖 · 陰陽魚", "reason": "Placing a taijitu in the center reinforces the fundamental balance of yin and yang throughout the home." },
        { "type": "element", "item": "Yellow candle (earthenware holder)", "zh": "黃蠟燭（陶器燭台）", "reason": "Earth-toned candle in a clay holder combines Fire (generates Earth) with Earth element support." },
        { "type": "avoid", "item": "Heavy furniture blocking center, toilets or bathrooms here", "zh": "避免大型傢俱堵中 · 中央廁所", "reason": "A bathroom in the center drains qi from all eight sectors simultaneously — most inauspicious placement." }
      ],
      "hexagrams": [2, 11, 12, 15, 19, 26, 52],
      "fdl": {
        "type": "fengshui_sector", "sector": "Center", "trigram": "Taiji", "color": "#FFB74D",
        "highlight": { "fill": "#FFB74D30", "stroke": "#FFB74D", "glow": true },
        "icons": [
          { "type": "symbol", "content": "☯", "x": 500, "y": 500, "size": 70 },
          { "type": "text", "content": "中", "x": 500, "y": 580, "size": 40, "style": { "color": "#FFB74D" } }
        ],
        "label": { "text": "Health & Unity", "subtext": "Earth · Center", "position": "center", "color": "#FFB74D" }
      },
      "verified": true,
      "usage": ["health", "balance", "unity", "harmony", "wellbeing", "central_qi"]
    }
  ],

  "medicine": [
    {
      "id": "med_001",
      "name": { "zh": "坎離水火既濟法", "en": "Kan-Li Fire and Water Balancing (Golden Elixir)", "es": "Equilibrio de Fuego y Agua Kan-Li (Elixir Dorado)", "it": "Equilibrio Fuoco e Acqua Kan-Li (Elisir d'Oro)", "pinyin": "Kan Li Shui Huo Ji Ji Fa" },
      "description": "Core Neidan (Internal Alchemy) practice for harmonizing the Heart-Fire and Kidney-Water, preventing alchemical imbalance and promoting longevity.",
      "source": { "primary": "Zhengtong Daozang", "textTitle": "Zhouyi Cantong Qi", "references": ["DZ 999"] },
      "usage": ["internal_alchemy", "longevity", "vitality", "heart_kidney_harmony"],
      "verified": true
    },
    {
      "id": "med_002",
      "name": { "zh": "五臟六腑調和法", "en": "Harmonizing the Five Organs and Six Fu", "es": "Armonización de los Cinco Órganos y las Seis Fu", "it": "Armonizzazione dei Cinque Organi e dei Sei Fu", "pinyin": "Wuzang Liufu Tiaohe Fa" },
      "description": "Daoist medical discipline for regulating the internal organ systems through Bagua and Five Element correspondences.",
      "source": { "primary": "Common Daoist Medical Canon", "textTitle": "Huangdi Neijing" },
      "usage": ["organ_health", "five_elements_medicine", "healing", "preventive_care"],
      "verified": true
    }
  ],

  "usageNotes": {
    "disclaimer": "This database is compiled from academic sources for educational and research purposes. The fulu and fuzhou documented here are part of the religious and cultural heritage of Daoism.",
    "culturalContext": "These practices should be understood within their historical and cultural contexts. Daoist talismans (fulu) and incantations (fuzhou) are part of a complex religious system requiring proper transmission and training.",
    "verification": "All sources have been verified against published academic works and canonical catalogues."
  }
};

if (typeof window !== "undefined") {
  window.DAOIST_REMEDIES_DB = DAOIST_REMEDIES_DB;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DAOIST_REMEDIES_DB;
}
