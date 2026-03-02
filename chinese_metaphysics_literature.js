/**
 * Chinese Metaphysics Ancient Literature Database
 * 
 * Star Horary Chinese Horoscope (Pa Gua / Ba Gua) and related systems
 * Based on classical texts from the Siku Quanshu and traditional sources
 * 
 * Systems covered:
 * - Ba Gua (Eight Trigrams) foundations
 * - San Shi (Three Styles) - Qi Men Dun Jia, Da Liu Ren
 * - Bazi (Four Pillars) with Shen Sha (Symbolic Stars)
 * - Zi Wei Dou Shu (Purple Star Astrology)
 * - Environmental horary (Feng Shui, Tai Sui, Flying Stars)
 * - He Tu (Yellow River Map) and Lo Shu analysis
 */

const CHINESE_METAPHYSICS_LITERATURE = {
  metadata: {
    version: "1.0.0",
    lastUpdated: "2026-02-26",
    description: "Ancient literature references for star horary Chinese horoscope systems (Pa Gua/Ba Gua)",
    compilation: "Academic research from classical Chinese metaphysical texts",
    sourceCannon: "Siku Quanshu (Complete Library of the Four Treasuries) and Daozang (Daoist Canon)"
  },

  // ============================================
  // 1. FOUNDATIONAL TEXTS - BA GUA & YI JING
  // ============================================

  foundationalTexts: {
    yi_jing: {
      title: {
        zh: "周易",
        en: "The Book of Changes (Zhou Yi)",
        pinyin: "Zhou Yi"
      },
      era: "Zhou Dynasty (approx. 1000 BCE)",
      significance: "The 'Source of all Wisdom' - introduces the Pre-Heaven (Xian Tian) and Post-Heaven (Hou Tian) Ba Gua arrangements. Every horary or Bazi system traces its logic back to the 64 Hexagrams found here.",
      keyConcepts: [
        "Pre-Heaven Bagua (Fu Xi arrangement) - Universal laws",
        "Post-Heaven Bagua (King Wen arrangement) - Cyclical change",
        "Eight Trigrams as forces of nature (Fire, Water, Wind, Mountain, etc.)"
      ],
      relevanceToHorary: "The Ba Gua acts as a compass for both time and direction in horary contexts."
    },

    huainanzi: {
      title: {
        zh: "淮南子",
        en: "Huainanzi (Master of Huainan)",
        pinyin: "Huainanzi"
      },
      era: "Han Dynasty (2nd Century BCE)",
      significance: "Essential text synthesizing cosmology, describing how the movements of the 'Great One' (Tai Yi) correlate with the eight directions of the Ba Gua.",
      keyConcepts: [
        "Tai Yi (Great One) movements",
        "Correlation between celestial bodies and eight directions",
        "Cosmological foundations of Chinese metaphysics"
      ],
      relevanceToHorary: "Provides the astronomical framework connecting stars to directional analysis."
    }
  },

  // ============================================
  // 2. STAR HORARY SYSTEMS (SAN SHI - 三式)
  // ============================================

  starHorarySystems: {
    overview: {
      name: "San Shi (Three Styles)",
      name_zh: "三式",
      description: "The highest forms of Chinese metaphysics for horary (predicting based on the moment of inquiry).",
      systems: ["Qi Men Dun Jia", "Da Liu Ren", "Tai Yi Shen Shu"]
    },

    qi_men_dun_jia: {
      name: {
        zh: "奇門遁甲",
        en: "Qi Men Dun Jia",
        pinyin: "Qi Men Dun Jia",
        translation: "Mystical Gates Escaping Technique"
      },
      primaryText: {
        title: "Qi Men Dun Jia Fu Yi (奇門遁甲賦役)",
        era: "Ming Dynasty"
      },
      description: "Originally used for military strategy, this system helps find the 'Hidden Jia' (the Emperor) to ensure success at a specific moment.",
      methodology: {
        grid: "3x3 grid (Lo Shu Square) - intrinsically tied to the Ba Gua",
        components: ["Stars (九星)", "Gates (八門)", "Deities (八神)"],
        tracking: "Tracks the movement of celestial influences through the eight directions"
      },
      nineStars: {
        description: "Linked to the Big Dipper (Bei Dou) plus 2 auxiliary stars",
        stars: [
          { number: 1, name: "Tian Peng", name_zh: "天蓬", translation: "Heavenly Mound" },
          { number: 2, name: "Tian Rui", name_zh: "天芮", translation: "Heavenly Grain" },
          { number: 3, name: "Tian Chong", name_zh: "天沖", translation: "Heavenly Balance" },
          { number: 4, name: "Tian Fu", name_zh: "天輔", translation: "Heavenly Assistant" },
          { number: 5, name: "Tian Qin", name_zh: "天禽", translation: "Heavenly Bird" },
          { number: 6, name: "Tian Xin", name_zh: "天心", translation: "Heavenly Heart" },
          { number: 7, name: "Tian Zhu", name_zh: "天柱", translation: "Heavenly Pillar" },
          { number: 8, name: "Tian Ren", name_zh: "天任", translation: "Heavenly Ambassador" },
          { number: 9, name: "Tian Ying", name_zh: "天英", translation: "Heavenly Hero" }
        ]
      },
      eightGates: {
        description: "Eight Gates representing different aspects of life and movement",
        gates: [
          { name: "Xiu", name_zh: "休門", translation: "Rest Gate", quality: "Recovery, nurturing" },
          { name: "Sheng", name_zh: "生門", translation: "Life Gate", quality: "Growth, prosperity" },
          { name: "Shang", name_zh: "傷門", translation: "Injury Gate", quality: "Conflict, competition" },
          { name: "Du", name_zh: "杜門", translation: "Block Gate", quality: "Obstacles, secrecy" },
          { name: "Jing", name_zh: "驚門", translation: "Surprise Gate", quality: "Alarm, anxiety" },
          { name: "Si", name_zh: "死門", translation: "Death Gate", quality: "Ending, stagnation" },
          { name: "Jing2", name_zh: "景門", translation: "View Gate", quality: "Expression, visibility" },
          { name: "Kai", name_zh: "開門", translation: "Open Gate", quality: "Beginnings, opportunities" }
        ]
      }
    },

    da_liu_ren: {
      name: {
        zh: "大六壬",
        en: "Da Liu Ren",
        pinyin: "Da Liu Ren",
        translation: "The Six Ren"
      },
      primaryText: {
        title: "Da Liu Ren Da Quan (大六壬大全)",
        era: "Ming-Qing Dynasties"
      },
      description: "Often considered the 'King of Horary,' it uses a cosmic board (Shi) to calculate the relationship between Earthly Branches and Heavenly Stems.",
      methodology: {
        board: "Cosmic board (Shi 式) with four layers",
        focus: "12 Earthly Branches with outcomes interpreted through Ba Gua elemental logic",
        components: ["Four Pillars of time", "Three Transmissions", "Heavenly Disk", "Earthly Plate"]
      },
      connectionToBagua: "While focusing on the 12 branches, outcomes are interpreted through the elemental logic of the Ba Gua."
    },

    zi_wei_dou_shu: {
      name: {
        zh: "紫微斗數",
        en: "Zi Wei Dou Shu",
        pinyin: "Zi Wei Dou Shu",
        translation: "Purple Star Astrology"
      },
      primaryText: {
        title: "Zi Wei Dou Shu Quan Shu (紫微斗數全書)",
        author: "Attributed to Chen Xi Yi",
        era: "Song Dynasty"
      },
      description: "The 'Star' part of the horary system. Uses a Polaris-centric map. While primarily for destiny (birth charts), can be used for horary by looking at current 'Flowing Date' stars.",
      methodology: {
        center: "Purple Star (Polaris) as center of the universe",
        palaces: "12 Palaces (Ming, Brothers, Spouse, Children, Wealth, Health, Travel, Friends, Career, Property, Spirit, Parents)",
        stars: "Over 100 stars mapped into the palaces"
      },
      horaryApplication: "By examining the current 'Flowing Date' (Liu Nian) stars, practitioners can determine auspicious timing."
    }
  },

  // ============================================
  // 3. BAZI WITH STAR POSITIONS (SHEN SHA)
  // ============================================

  baziSymbolicStars: {
    overview: {
      name: "Shen Sha",
      name_zh: "神煞",
      translation: "Symbolic Stars or Gods and Killers",
      description: "In Bazi, 'Star Positions' appear through Shen Sha - auxiliary spirits that provide specific flavor to a chart. These are mathematical coordinates derived from birth date and cyclical movements.",
      originText: "San Ming Tong Hui (三命通會) - Ming Dynasty",
      keyConcept: "Stars in Bazi are not physical celestial bodies but mathematical coordinates derived from the relationship between birth date and Earth/Jupiter cycles."
    },

    keyStars: [
      {
        name: "Tian Yi Gui Ren",
        name_zh: "天乙貴人",
        translation: "Noble Person Star",
        meaning: "The 'Guardian Angel' star - suggests help from powerful people and turning bad luck into good.",
        calculation: "Based on master of day (Heavenly Stem of birth day)",
        formula: {
          "Jia/Wu/Geng": ["Ox", "Goat"],
          "Yi/Ji": ["Rat", "Monkey"],
          "Bing/Ding": ["Pig", "Rooster"],
          "Ren/Gui": ["Snake", "Rabbit"],
          "Xin": ["Tiger", "Horse"]
        },
        ancientProverb: "One Nobleman in the chart is worth more than a room full of gold."
      },
      {
        name: "Tao Hua",
        name_zh: "桃花",
        translation: "Peach Blossom Star",
        meaning: "The star of attraction and sociability - governs romance, charisma, and likability.",
        calculation: "Based on Zodiac Animal (Birth Year or Day)",
        formula: {
          "Tiger/Horse/Dog": "Rabbit",
          "Snake/Rooster/Ox": "Horse",
          "Monkey/Rat/Dragon": "Rooster",
          "Pig/Rabbit/Goat": "Rat"
        },
        note: "In ancient texts, could imply 'illicit affairs' if too strong; today represents charisma for networking and social media."
      },
      {
        name: "Yi Ma",
        name_zh: "驛馬",
        translation: "Travelling Horse Star",
        meaning: "Represents movement, migration, and fast-paced change.",
        origin: "Named after the ancient imperial courier system",
        calculation: "Based on birth year branch",
        formula: {
          "Tiger": "Monkey",
          "Monkey": "Tiger",
          "Snake": "Pig",
          "Pig": "Snake",
          "Monkey/Rat/Dragon": "Tiger",
          "Pig/Rabbit/Goat": "Snake",
          "Tiger/Horse/Dog": "Monkey",
          "Snake/Rooster/Ox": "Pig"
        }
      },
      {
        name: "Wen Chang",
        name_zh: "文昌",
        translation: "Academic Star",
        meaning: "Governs intelligence, literary talent, and the ability to pass examinations.",
        calculation: "Based on master of day",
        historicalContext: "Crucial for ancient civil service examinations",
        formula: {
          "Jia": "Snake",
          "Yi": "Horse",
          "Bing/Wu": "Monkey",
          "Ding/Ji": "Rooster",
          "Geng": "Pig",
          "Xin": "Rat",
          "Ren": "Tiger",
          "Gui": "Rabbit"
        }
      },
      {
        name: "Yang Ren",
        name_zh: "羊刃",
        translation: "Sword Star / Goat Blade",
        meaning: "A star of extreme persistence and aggression - can lead to great power or great injury.",
        calculation: "Based on master of day",
        quality: "Double-edged - requires careful balancing"
      }
    ],

    starInterpretation: {
      yearPillar: "Influence comes from ancestors, social circle, or early childhood",
      monthPillar: "Affects career and relationship with parents/bosses",
      dayPillar: "Affects inner self and spouse",
      hourPillar: "Affects children, private thoughts, and late life"
    }
  },

  // ============================================
  // 4. ENVIRONMENTAL HORARY (DI LI)
  // ============================================

  environmentalHorary: {
    overview: {
      name: "Di Li",
      name_zh: "地理",
      translation: "Earthly Principles / Geomancy",
      description: "Systems that shift focus from the individual (Birth) to the environment (Space and Time). The 'External Weather' you walk through.",
      concept: "While Bazi is your 'Internal Map,' these environmental variations act as the 'External Weather'."
    },

    flyingStar: {
      name: "Xuan Kong Fei Xing",
      name_zh: "玄空飛星",
      translation: "Flying Star Feng Shui",
      description: "A building has a 'Birth Chart' based on the year it was built and its compass orientation.",
      keyConcepts: {
        buildingBirth: "Just as Bazi charts have 'Stars' in four pillars, a building has a 'Birth Chart'",
        starsAsNumbers: "Nine Stars of the Big Dipper (1-9) 'fly' through building sectors",
        horaryElement: "Stars change positions annually, monthly, and even hourly",
        loShu: "3x3 Magic Square - the 'map' where Ba Gua and Stars reside"
      }
    },

    taiSui: {
      name: "Tai Sui",
      name_zh: "太歲",
      translation: "Grand Duke",
      description: "The most famous 'local horoscope' - a 'Star' modeled after Jupiter's position that occupies a specific 15-degree compass segment each year.",
      ancientWarning: "Do not move earth or renovate in the direction of the Grand Duke.",
      environmentalRule: "If your front door faces the current year's Zodiac animal direction, your 'environmental horoscope' is considered 'clashing.'",
      remedy: "Placing a Pi Yao statue or other protective measures"
    },

    sanSheng: {
      name: "San Sheng",
      name_zh: "三勝",
      translation: "Three Victories",
      description: "Ancient military literature concept for finding 'Local Environmental Luck' using three factors:",
      factors: [
        { name: "Heavenly Luck", description: "Is the star alignment right?" },
        { name: "Earthly Luck", description: "Is the terrain (Ba Gua sector) favorable?" },
        { name: "Human Luck", description: "Is the commander's Bazi compatible with the time?" }
      ],
      application: "Borrowing Luck from the Environment - moving to rooms or cities where Environmental Stars are high when personal Bazi is in a 'low' period."
    }
  },

  // ============================================
  // 5. HE TU AND LO SHU STAR ANALYSIS
  // ============================================

  heTuLoShu: {
    heTu: {
      name: "He Tu",
      name_zh: "河圖",
      translation: "Yellow River Map",
      description: "Represents the fixed laws of the universe - the 'Original Order'.",
      origin: "Mythological origins from the Yellow River, revealed to Fu Xi",
      pattern: "Dot patterns representing the Five Elements in their pre-heaven state",
      significance: "Foundation of the Fixed Element system"
    },

    loShu: {
      name: "Lo Shu",
      name_zh: "洛書",
      translation: "Lo River Writing",
      description: "Represents the changing environment (Horary) - the dynamic application.",
      origin: "Revealed to Yu the Great from the Lo River turtle",
      pattern: "3x3 Magic Square where all lines sum to 15",
      significance: "Foundation of the Later Heaven arrangement and Flying Star Feng Shui"
    },

    relationship: {
      heTu: "Fixed, Pre-Heaven, Universal Laws (Body)",
      loShu: "Changing, Post-Heaven, Cyclical Application (Function)",
      analogy: "He Tu is the seed; Lo Shu is the growth pattern"
    }
  },

  // ============================================
  // 6. TEN ANCIENT LEGITIMATE REFERENCES
  // ============================================

  ancientReferences: [
    {
      number: 1,
      title: {
        zh: "黃帝內經",
        en: "Huangdi Neijing",
        translation: "The Yellow Emperor's Inner Canon"
      },
      era: "Han Dynasty (approx. 300 BCE - 200 CE)",
      focus: ["He Tu", "Luoshu", "Five Elements"],
      significance: "Foundational reference for how He Tu and Five Elements govern the human body and environment. Explains the 'San Sheng' (Three Powers) of Heaven, Earth, and Man.",
      category: "Medical-Cosmological Foundation"
    },
    {
      number: 2,
      title: {
        zh: "周易",
        en: "Yi Jing",
        translation: "The Book of Changes"
      },
      era: "Zhou Dynasty (approx. 1000 BCE)",
      focus: ["Ba Gua", "Cosmology", "64 Hexagrams"],
      significance: "The 'Source of all Wisdom.' Introduces Pre-Heaven and Post-Heaven Ba Gua arrangements. Every horary or Bazi system traces its logic back to the 64 Hexagrams.",
      category: "Source Text"
    },
    {
      number: 3,
      title: {
        zh: "淵海子平",
        en: "Yuan Hai Zi Ping",
        translation: "The Deep Sea of Zi Ping"
      },
      author: "Xu Zi Ping (compiled by Qin Hezhong)",
      era: "Song/Ming Dynasty",
      focus: ["BaZi", "Four Pillars"],
      significance: "The 'Bible' of Bazi. Shifted focus from Year Pillar to master of day, which is the standard for all modern Bazi analysis.",
      category: "Bazi Foundation"
    },
    {
      number: 4,
      title: {
        zh: "滴天髓",
        en: "Di Tian Sui",
        translation: "Dripping Marrow of the Heavens"
      },
      author: "Attributed to Jing Tu (Song) with commentaries by Liu Ji (Ming)",
      era: "Song/Ming Dynasty",
      focus: ["Advanced BaZi", "Qi Flow Analysis"],
      significance: "Most sophisticated text on Bazi. Moves away from 'superstitious' stars and focuses deeply on Qi flow and structural balance of elements.",
      category: "Advanced Bazi"
    },
    {
      number: 5,
      title: {
        zh: "奇門遁甲賦役",
        en: "Qi Men Dun Jia Fu Yi",
        translation: "The Hidden Jia Compendium"
      },
      era: "Ming Dynasty",
      focus: ["Qi Men Dun Jia", "Military Strategy"],
      significance: "Outlines the mathematical 3x3 grid for military and environmental horary. Explains how to track Nine Stars and Eight Gates to find the 'Hidden Jia' (The Emperor).",
      category: "Qi Men Dun Jia"
    },
    {
      number: 6,
      title: {
        zh: "協紀辨方書",
        en: "Xie Ji Bian Fang Shu",
        translation: "Treatise on Harmonizing Times and Directions"
      },
      era: "Qing Dynasty (commissioned by Emperor Qianlong)",
      focus: ["Tai Sui", "Date Selection", "Environmental Horoscopes"],
      significance: "The definitive imperial guide on 'Environmental Horoscopes.' Categorizes positions of Tai Sui and other 'Year Stars' to ensure construction doesn't clash with stars.",
      category: "Date Selection / Tai Sui"
    },
    {
      number: 7,
      title: {
        zh: "三命通會",
        en: "San Ming Tong Hui",
        translation: "The Compendium of Three Fates"
      },
      author: "Wan Min Ying",
      era: "Ming Dynasty",
      focus: ["BaZi", "Shen Sha", "Symbolic Stars"],
      significance: "Encyclopedic collection of Bazi theories. Famous for exhaustive list of Symbolic Stars (Nobleman, Peach Blossom) and how they influence the 'Environment' of a person's life.",
      category: "Symbolic Stars Reference"
    },
    {
      number: 8,
      title: {
        zh: "河圖洛書意象",
        en: "He Tu Luo Shu Yi Xiang",
        translation: "The Imagery of the He Tu and Luo Shu"
      },
      era: "Various (classical interpretations)",
      focus: ["He Tu", "Lo Shu", "Star Math"],
      significance: "Explains the 'Star Math' - how He Tu represents fixed universal laws while Luo Shu represents changing environment (Horary).",
      category: "He Tu / Lo Shu"
    },
    {
      number: 9,
      title: {
        zh: "紫微斗數全書",
        en: "Zi Wei Dou Shu Quan Shu",
        translation: "The Complete Book of Purple Star Astrology"
      },
      author: "Attributed to Chen Xi Yi",
      era: "Song Dynasty",
      focus: ["Star Positions", "12 Palaces"],
      significance: "Primary text for 'Star' horoscopes. Maps over 100 stars into 12 Palaces, providing a visual and environmental 'map' of a person's life and timing.",
      category: "Zi Wei Dou Shu"
    },
    {
      number: 10,
      title: {
        zh: "黃帝陰符經",
        en: "Huang Di Yin Fu Jing",
        translation: "The Yellow Emperor's Hidden Charm Classic"
      },
      era: "Tang Dynasty (approx.)",
      focus: ["San Sheng", "Heaven/Earth/Man", "Strategy"],
      significance: "Mystical text discussing the 'Three Victories.' Teaches how to align oneself with 'Killer/Star Energy' of the environment for success in life and warfare.",
      category: "Strategic Alignment"
    }
  ],

  // ============================================
  // 7. KEY CONCEPTS REFERENCE TABLE
  // ============================================

  keyConcepts: {
    loShuSquare: {
      name: "Lo Shu Square",
      name_zh: "洛書",
      description: "The 3x3 Magic Square - the 'map' where Ba Gua and Stars reside"
    },
    nineStars: {
      name: "Nine Stars",
      name_zh: "九星",
      description: "Beidou (Big Dipper) + 2 - these stars 'fly' through Ba Gua houses to change the luck of a sector"
    },
    heavenlyStems: {
      name: "Heavenly Stems",
      name_zh: "天干",
      description: "10 Cosmic Vibrations - represent the 'Star' energy interacting with the Trigrams"
    },
    earthlyBranches: {
      name: "Earthly Branches",
      name_zh: "地支",
      description: "12 Zodiac Animals - represent 'Time' and 'Space' coordinates"
    },
    threePowers: {
      name: "San Cai",
      name_zh: "三才",
      translation: "Three Powers / Three Talents",
      description: "Heaven (Tian), Earth (Di), and Man (Ren) - the tripartite division of the universe"
    }
  },

  // ============================================
  // 8. COMPARISON TABLES
  // ============================================

  comparisons: {
    systemsComparison: {
      description: "Birth vs. Environmental Horary Systems",
      rows: [
        {
          feature: "Focus",
          bazi: "The Person (Ren)",
          environmental: "The Space/Direction (Di)"
        },
        {
          feature: "Time Scale",
          bazi: "Fixed at birth, flows in 10-year cycles",
          environmental: "Changes Daily, Monthly, and Yearly"
        },
        {
          feature: "Analogy",
          bazi: "The Driver of the car",
          environmental: "The Road conditions and the weather"
        },
        {
          feature: "Ancient Text",
          bazi: "Di Tian Sui",
          environmental: "Guo Pu's Burial Book / Qi Men Dun Jia"
        }
      ]
    },

    baziVsStarSystems: {
      description: "Chinese Metaphysical Hierarchy",
      systems: [
        {
          system: "Bazi (The Pillars)",
          focus: "Five Elements (Metal, Wood, Water, Fire, Earth)",
          role: "The 'Body' of destiny"
        },
        {
          system: "Zi Wei Dou Shu",
          focus: "Star Positions in 12 Palaces",
          role: "The 'Spirit' mapped by Polaris"
        },
        {
          system: "Qi Men Dun Jia",
          focus: "Nine Stars (Big Dipper) for direction",
          role: "The 'Strategy' for action timing"
        }
      ]
    },

    referenceUtility: {
      description: "Summary Table of Reference Utility",
      rows: [
        { system: "BaZi", reference: "Yuan Hai Zi Ping", use: "Decoding the Personal 'DNA'" },
        { system: "Qi Men", reference: "Fu Yi", use: "Finding the 'Golden' direction/time" },
        { system: "Tai Sui", reference: "Xie Ji Bian Fang Shu", use: "Avoiding environmental conflict" },
        { system: "He Tu", reference: "Neijing / Yi Jing", use: "Understanding the 'Original Order'" }
      ]
    }
  },

  // ============================================
  // 9. HISTORICAL CONTEXT
  // ============================================

  historicalContext: {
    purposeOfHorary: {
      ancient: "In ancient literature, 'Horary' wasn't just about personal questions like 'Will I get the job?' It was often a matter of statecraft or survival.",
      baguaUsage: "The Ba Gua wasn't just a symbol on a flag; it was a mathematical grid used to calculate the path of least resistance in a constantly shifting universe."
    },

    westernMisconception: {
      note: "Many Westerners confuse the Ba Gua with the Zodiac.",
      clarification: "While they interact, the Ba Gua represents the Forces of Nature (Fire, Water, Wind, etc.), while the 'Stars' represent Specific Timings and Influences."
    },

    jupiterConnection: {
      description: "Many Shen Sha originated from the 28 Lunar Mansions and the Jupiter Cycle (which is why there are 12 Zodiac signs).",
      significance: "The Tai Sui (Grand Duke) is explicitly modeled on Jupiter's 12-year cycle through the zodiac."
    }
  }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CHINESE_METAPHYSICS_LITERATURE };
}
