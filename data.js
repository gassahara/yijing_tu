// API Configuration
const CONFIG = {
    DB_URL: "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/hexagrams.json",
    API_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu",
    // Supabase Function Endpoint (replaces direct DeepSeek calls)
    SUPABASE_FUNCTION_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu",
    // Legacy direct API keys (kept for reference, but not used in client)
    DEEPSEEK_KEY: "sk-4a39f094b5ee4e47a753e645541c934e",
    DEEPSEEK_URL: "https://api.deepseek.com/v1/chat/completions"
};

// Earthly Branches and Heavenly Stems
const EARTHLY_BRANCHES = ["Zi", "Chou", "Yin", "Mao", "Chen", "Si", "Wu", "Wei", "Shen", "You", "Xu", "Hai"];
const HEAVENLY_STEMS = ["Jia", "Yi", "Bing", "Ding", "Wu", "Ji", "Geng", "Xin", "Ren", "Gui"];

// 28 Lunar Mansions (Complete)
const LUNAR_MANSIONS = [
    { num: 1, name_zh: "角", name_en: "Horn", name_es: "Cuerno", name_it: "Corno", degrees: 12, animal: "Dragon", element: "Wood", group: "Azure Dragon", group_zh: "東方蒼龍", group_es: "Dragón Azul", group_it: "Drago Azzurro", symbol: "Dragon" },
    { num: 2, name_zh: "亢", name_en: "Neck", name_es: "Cuello", name_it: "Collo", degrees: 9, animal: "Dragon", element: "Metal", group: "Azure Dragon", group_zh: "東方蒼龍", group_es: "Dragón Azul", group_it: "Drago Azzurro", symbol: "Dragon" },
    { num: 3, name_zh: "氐", name_en: "Root", name_es: "Raíz", name_it: "Radice", degrees: 15, animal: "Badger", element: "Earth", group: "Azure Dragon", group_zh: "東方蒼龍", group_es: "Dragón Azul", group_it: "Drago Azzurro", symbol: "Badger" },
    { num: 4, name_zh: "房", name_en: "Room", name_es: "Habitación", name_it: "Stanza", degrees: 5, animal: "Rabbit", element: "Sun", group: "Azure Dragon", group_zh: "東方蒼龍", group_es: "Dragón Azul", group_it: "Drago Azzurro", symbol: "Rabbit" },
    { num: 5, name_zh: "心", name_en: "Heart", name_es: "Corazón", name_it: "Cuore", degrees: 5, animal: "Fox", element: "Moon", group: "Azure Dragon", group_zh: "東方蒼龍", group_es: "Dragón Azul", group_it: "Drago Azzurro", symbol: "Fox" },
    { num: 6, name_zh: "尾", name_en: "Tail", name_es: "Cola", name_it: "Coda", degrees: 18, animal: "Tiger", element: "Fire", group: "Azure Dragon", group_zh: "東方蒼龍", group_es: "Dragón Azul", group_it: "Drago Azzurro", symbol: "Tiger" },
    { num: 7, name_zh: "箕", name_en: "Winnowing Basket", name_es: "Cesta", name_it: "Cesto", degrees: 11, animal: "Leopard", element: "Wood", group: "Azure Dragon", group_zh: "東方蒼龍", group_es: "Dragón Azul", group_it: "Drago Azzurro", symbol: "Leopard" },
    { num: 8, name_zh: "斗", name_en: "Dipper", name_es: "Cucharón", name_it: "Mestolo", degrees: 26, animal: "Ox", element: "Wood", group: "Black Tortoise", group_zh: "北方玄武", group_es: "Tortuga Negra", group_it: "Tartaruga Nera", symbol: "Ox" },
    { num: 9, name_zh: "牛", name_en: "Ox", name_es: "Buey", name_it: "Bue", degrees: 8, animal: "Ox", element: "Earth", group: "Black Tortoise", group_zh: "北方玄武", group_es: "Tortuga Negra", group_it: "Tartaruga Nera", symbol: "Ox" },
    { num: 10, name_zh: "女", name_en: "Girl", name_es: "Niña", name_it: "Ragazza", degrees: 12, animal: "Bat", element: "Earth", group: "Black Tortoise", group_zh: "北方玄武", group_es: "Tortuga Negra", group_it: "Tartaruga Nera", symbol: "Bat" },
    { num: 11, name_zh: "虛", name_en: "Emptiness", name_es: "Vacío", name_it: "Vuoto", degrees: 10, animal: "Rat", element: "Sun", group: "Black Tortoise", group_zh: "北方玄武", group_es: "Tortuga Negra", group_it: "Tartaruga Nera", symbol: "Rat" },
    { num: 12, name_zh: "危", name_en: "Rooftop", name_es: "Techo", name_it: "Tetto", degrees: 17, animal: "Swallow", element: "Moon", group: "Black Tortoise", group_zh: "北方玄武", group_es: "Tortuga Negra", group_it: "Tartaruga Nera", symbol: "Swallow" },
    { num: 13, name_zh: "室", name_en: "Encampment", name_es: "Campamento", name_it: "Accampamento", degrees: 16, animal: "Pig", element: "Fire", group: "Black Tortoise", group_zh: "北方玄武", group_es: "Tortuga Negra", group_it: "Tartaruga Nera", symbol: "Pig" },
    { num: 14, name_zh: "壁", name_en: "Wall", name_es: "Muro", name_it: "Muro", degrees: 9, animal: "Porcupine", element: "Water", group: "Black Tortoise", group_zh: "北方玄武", group_es: "Tortuga Negra", group_it: "Tartaruga Nera", symbol: "Porcupine" },
    { num: 15, name_zh: "奎", name_en: "Legs", name_es: "Piernas", name_it: "Gambe", degrees: 16, animal: "Wolf", element: "Wood", group: "White Tiger", group_zh: "西方白虎", group_es: "Tigre Blanco", group_it: "Tigre Bianca", symbol: "Wolf" },
    { num: 16, name_zh: "婁", name_en: "Bond", name_es: "Vínculo", name_it: "Legame", degrees: 12, animal: "Dog", element: "Metal", group: "White Tiger", group_zh: "西方白虎", group_es: "Tigre Blanco", group_it: "Tigre Bianca", symbol: "Dog" },
    { num: 17, name_zh: "胃", name_en: "Stomach", name_es: "Estómago", name_it: "Stomaco", degrees: 14, animal: "Pheasant", element: "Earth", group: "White Tiger", group_zh: "西方白虎", group_es: "Tigre Blanco", group_it: "Tigre Bianca", symbol: "Pheasant" },
    { num: 18, name_zh: "昴", name_en: "Hairy Head", name_es: "Cabeza", name_it: "Testa", degrees: 11, animal: "Rooster", element: "Sun", group: "White Tiger", group_zh: "西方白虎", group_es: "Tigre Blanco", group_it: "Tigre Bianca", symbol: "Rooster" },
    { num: 19, name_zh: "畢", name_en: "Net", name_es: "Red", name_it: "Rete", degrees: 16, animal: "Crow", element: "Moon", group: "White Tiger", group_zh: "西方白虎", group_es: "Tigre Blanco", group_it: "Tigre Bianca", symbol: "Crow" },
    { num: 20, name_zh: "觜", name_en: "Turtle Beak", name_es: "Pico", name_it: "Becco", degrees: 2, animal: "Monkey", element: "Fire", group: "White Tiger", group_zh: "西方白虎", group_es: "Tigre Blanco", group_it: "Tigre Bianca", symbol: "Monkey" },
    { num: 21, name_zh: "參", name_en: "Three Stars", name_es: "Tres Estrellas", name_it: "Tre Stelle", degrees: 9, animal: "Ape", element: "Water", group: "White Tiger", group_zh: "西方白虎", group_es: "Tigre Blanco", group_it: "Tigre Bianca", symbol: "Ape" },
    { num: 22, name_zh: "井", name_en: "Well", name_es: "Pozo", name_it: "Pozzo", degrees: 33, animal: "Tapir", element: "Wood", group: "Vermilion Bird", group_zh: "南方朱雀", group_es: "Ave Bermeja", group_it: "Uccello Vermiglio", symbol: "Tapir" },
    { num: 23, name_zh: "鬼", name_en: "Ghost", name_es: "Fantasma", name_it: "Fantasma", degrees: 4, animal: "Sheep", element: "Metal", group: "Vermilion Bird", group_zh: "南方朱雀", group_es: "Ave Bermeja", group_it: "Uccello Vermiglio", symbol: "Sheep" },
    { num: 24, name_zh: "柳", name_en: "Willow", name_es: "Sauce", name_it: "Salice", degrees: 15, animal: "Deer", element: "Earth", group: "Vermilion Bird", group_zh: "南方朱雀", group_es: "Ave Bermeja", group_it: "Uccello Vermiglio", symbol: "Deer" },
    { num: 25, name_zh: "星", name_en: "Star", name_es: "Estrella", name_it: "Stella", degrees: 7, animal: "Horse", element: "Sun", group: "Vermilion Bird", group_zh: "南方朱雀", group_es: "Ave Bermeja", group_it: "Uccello Vermiglio", symbol: "Horse" },
    { num: 26, name_zh: "張", name_en: "Extended Net", name_es: "Red Extendida", name_it: "Rete Estesa", degrees: 18, animal: "Deer", element: "Moon", group: "Vermilion Bird", group_zh: "南方朱雀", group_es: "Ave Bermeja", group_it: "Uccello Vermiglio", symbol: "Deer" },
    { num: 27, name_zh: "翼", name_en: "Wings", name_es: "Alas", name_it: "Ali", degrees: 18, animal: "Snake", element: "Fire", group: "Vermilion Bird", group_zh: "南方朱雀", group_es: "Ave Bermeja", group_it: "Uccello Vermiglio", symbol: "Snake" },
    { num: 28, name_zh: "軫", name_en: "Chariot", name_es: "Carro", name_it: "Carro", degrees: 17, animal: "Worm", element: "Water", group: "Vermilion Bird", group_zh: "南方朱雀", group_es: "Ave Bermeja", group_it: "Uccello Vermiglio", symbol: "Worm" }
];

// Build cumulative degrees for calculations
let cumulativeDeg = 0;
LUNAR_MANSIONS.forEach(m => {
    m.startDeg = cumulativeDeg;
    cumulativeDeg += m.degrees;
    m.endDeg = cumulativeDeg;
});

// Trigram Data (8 Trigrams - Later Heaven Arrangement)
const TRIGRAMS = {
    '101': {
        name: { en: 'Fire', es: 'Fuego', it: 'Fuoco', zh: '離' },
        symbol: '☲',
        nature: { element: 'Fire', quality: 'Clarity' },
        direction: 'S',
        element: 'fire'
    },
    '000': {
        name: { en: 'Earth', es: 'Tierra', it: 'Terra', zh: '坤' },
        symbol: '☷',
        nature: { element: 'Earth', quality: 'Receptive' },
        direction: 'SW',
        element: 'earth'
    },
    '011': {
        name: { en: 'Lake', es: 'Lago', it: 'Lago', zh: '兌' },
        symbol: '☱',
        nature: { element: 'Metal', quality: 'Joy' },
        direction: 'W',
        element: 'metal'
    },
    '111': {
        name: { en: 'Heaven', es: 'Cielo', it: 'Cielo', zh: '乾' },
        symbol: '☰',
        nature: { element: 'Metal', quality: 'Creative' },
        direction: 'NW',
        element: 'metal'
    },
    '010': {
        name: { en: 'Water', es: 'Agua', it: 'Acqua', zh: '坎' },
        symbol: '☵',
        nature: { element: 'Water', quality: 'Danger' },
        direction: 'N',
        element: 'water'
    },
    '100': {
        name: { en: 'Mountain', es: 'Montaña', it: 'Montagna', zh: '艮' },
        symbol: '☶',
        nature: { element: 'Earth', quality: 'Still' },
        direction: 'NE',
        element: 'earth'
    },
    '001': {
        name: { en: 'Thunder', es: 'Trueno', it: 'Tuono', zh: '震' },
        symbol: '☳',
        nature: { element: 'Wood', quality: 'Arousing' },
        direction: 'E',
        element: 'wood'
    },
    '110': {
        name: { en: 'Wind', es: 'Viento', it: 'Vento', zh: '巽' },
        symbol: '☴',
        nature: { element: 'Wood', quality: 'Gentle' },
        direction: 'SE',
        element: 'wood'
    }
};

// Five Elements Themes
const FENG_SHUI_THEMES = {
    balanced: {
        name: "Balanced Five Elements",
        colors: ['#2E7D32', '#C62828', '#F57F17', '#FFB300', '#1565C0'],
        bg: 'linear-gradient(135deg, #FFF8E1 0%, #FFE0B2 25%, #FFCCBC 50%, #D7CCC8 75%, #CFD8DC 100%)'
    },
    wood: {
        name: "Wood (Growth)",
        colors: ['#1B5E20', '#2E7D32', '#388E3C', '#43A047', '#66BB6A'],
        bg: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 50%, #A5D6A7 100%)'
    },
    fire: {
        name: "Fire (Energy)",
        colors: ['#B71C1C', '#C62828', '#D32F2F', '#F44336', '#FF6F00'],
        bg: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 25%, #EF9A9A 50%, #E57373 75%, #FFB74D 100%)'
    },
    earth: {
        name: "Earth (Stability)",
        colors: ['#5D4037', '#795548', '#8D6E63', '#A1887F', '#D7CCC8'],
        bg: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 25%, #FFE082 50%, #FFD54F 75%, #D7CCC8 100%)'
    },
    metal: {
        name: "Metal (Structure)",
        colors: ['#3E2723', '#5D4037', '#795548', '#FFB300', '#FFA000'],
        bg: 'linear-gradient(135deg, #FFF8E1 0%, #F5F5DC 25%, #E6D7B8 50%, #D4C4A8 75%, #BCAAA4 100%)'
    },
    water: {
        name: "Water (Wisdom)",
        colors: ['#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#42A5F5'],
        bg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 25%, #90CAF9 50%, #64B5F6 75%, #42A5F5 100%)'
    }
};

// Internationalization
const I18N = {
    en: {
        oracle: "Oracle", journal: "Journal", step1Title: "What is on your mind?",
        next: "Begin", questionPlaceholder: "Type your question here...",
        meditationText: "Focus on your question...<br>The oracle will respond shortly.",
        meditationTitle: "MEDITATION",
        meditateCast: "Meditate & Cast",
        history: "History",
        coinTosses: "Coin Tosses", hexagramDetails: "Hexagram Details",
        originalText: "Original Text (Chinese)", translation: "Translation & Meaning",
        aiInterpretation: "AI Interpretation", newReading: "Ask New",
        askAgain: "Ask Again", questionJournal: "Question Journal",
        readingHistory: "Reading History", noQuestions: "No questions yet.",
        noReadings: "No readings yet.", memory: "Memory",
        birthTimeNotice: "Enter birth time for Life Palace (Zi Wei Dou Shu) calculation",
        trigramHeaven: "Heaven", trigramEarth: "Earth", trigramThunder: "Thunder",
        trigramWater: "Water", trigramMountain: "Mountain", trigramWind: "Wind",
        trigramFire: "Fire", trigramLake: "Lake",
        upper: "Upper", lower: "Lower", binary: "Binary", decimal: "Decimal", timestamp: "Time",
        celestial: "Celestial Guidance", elements: "Five Elements", yinYangBalance: "Yin-Yang Balance",
        stability: "Stability", yang: "Yang", yin: "Yin", stable: "Stable",
        lifePalace: "Life Palace", bodyPalace: "Body Palace", hourPillar: "Hour Pillar",
        basedOnBirthTime: "Based on birth time", lifePalaceZiWei: "Life Palace (Zi Wei)",
        trigram: "Trigram",
        analysis: "Analysis", advice: "Advice", symbolism: "Symbolism",
        movingLines: "Moving Lines",
        judgment: "Judgment", image: "Image", lineTexts: "Line Texts",
        wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water",
        loading: "Loading...", consulting: "Consulting oracle...",
        pleaseWait: "Connecting with the I Ching wisdom",
        translating: "Translating...",
        generatingInterp: "Generating interpretation...",
        gatheringWisdom: "Gathering wisdom...",
        focusingQuery: "Focusing the query...",
        usingTraditional: "Using traditional method...",
        loadingInterp: "Loading interpretation...",
        translatingTo: "Translating to",
        perfect: "Perfect Balance", pureYang: "Pure Yang", pureYin: "Pure Yin",
        yangDominant: "Yang Dominant", yinDominant: "Yin Dominant",
        totalChange: "Total Change", mostlyStable: "Mostly Stable", changing: "Changing",
        animal: "Animal", degrees: "Degrees", number: "Num",
        dateLabel: "Date (Lunar)", birthTimeLabel: "Birth Time", memoryLabel: "Memory", themeLabel: "Theme",
        themeDark: "Dark (Void)", themeBalanced: "Balanced", themeWood: "\u6728 Wood", themeFire: "\u706b Fire",
        themeEarth: "\u571f Earth", themeMetal: "\u91d1 Metal", themeWater: "\u6c34 Water",
        memoryOff: "Off", memory10min: "10 min", memory30min: "30 min", memory1hour: "1 hour", memory3hours: "3 hours",
        viewDocument: "View Document"
    },
    zh: {
        oracle: "占卜", journal: "日志", step1Title: "你在想什么？",
        next: "开始", questionPlaceholder: "输入您的问题...",
        meditationText: "专注于你的问题...<br>神谕即将回应。",
        meditationTitle: "冥想",
        meditateCast: "冥想占卜",
        history: "历史记录",
        coinTosses: "抛硬币", hexagramDetails: "卦象详情",
        originalText: "卦辞原文", translation: "白话解译",
        aiInterpretation: "AI解读", newReading: "新问",
        askAgain: "再问", questionJournal: "问题日志",
        readingHistory: "历史记录", noQuestions: "没有问题。",
        noReadings: "没有记录。", memory: "记忆",
        birthTimeNotice: "选填：输入出生时间以计算紫微斗数命宫",
        trigramHeaven: "乾", trigramEarth: "坤", trigramThunder: "震",
        trigramWater: "坎", trigramMountain: "艮", trigramWind: "巽",
        trigramFire: "离", trigramLake: "兑",
        upper: "上卦", lower: "下卦", binary: "二进制", decimal: "十进制", timestamp: "时间戳",
        celestial: "天体指引", elements: "五行分析", yinYangBalance: "阴阳平衡",
        stability: "稳定性", yang: "阳", yin: "阴", stable: "静爻",
        lifePalace: "命宫", bodyPalace: "身宫", hourPillar: "时柱",
        basedOnBirthTime: "基于出生时间", lifePalaceZiWei: "命宫 (紫微斗数)",
        trigram: "卦",
        analysis: "分析", advice: "建议", symbolism: "象征",
        movingLines: "动爻详解",
        judgment: "卦辞", image: "象", lineTexts: "爻辞",
        wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
        loading: "加载中...", consulting: "神谕思考中...",
        translating: "翻译中...",
        generatingInterp: "生成解读中...",
        gatheringWisdom: "汇聚智慧中...",
        focusingQuery: "聚焦问题中...",
        usingTraditional: "使用传统方法...",
        loadingInterp: "加载解读中...",
        translatingTo: "翻译至",
        perfect: "完美平衡", pureYang: "纯阳", pureYin: "纯阴",
        yangDominant: "阳盛", yinDominant: "阴盛",
        totalChange: "全变", mostlyStable: "基本稳定", changing: "变动中",
        animal: "动物", degrees: "度数", number: "编号",
        dateLabel: "日期 (农历)", birthTimeLabel: "出生时间", memoryLabel: "记忆", themeLabel: "主题",
        themeDark: "暗黑 (虚空)", themeBalanced: "平衡", themeWood: "\u6728", themeFire: "\u706b",
        themeEarth: "\u571f", themeMetal: "\u91d1", themeWater: "\u6c34",
        memoryOff: "关闭", memory10min: "10 分钟", memory30min: "30 分钟", memory1hour: "1 小时", memory3hours: "3 小时",
        viewDocument: "查看文档"
    },
    es: {
        oracle: "Oráculo", journal: "Diario", step1Title: "¿Qué tienes en mente?",
        next: "Comenzar", questionPlaceholder: "Escribe tu pregunta aquí...",
        meditationText: "Concéntrate...<br>El oráculo responderá pronto.",
        meditationTitle: "MEDITACIÓN",
        meditateCast: "Meditar y Lanzar",
        history: "Historial",
        coinTosses: "Monedas", hexagramDetails: "Detalles",
        originalText: "Texto Original (Chino)", translation: "Traducción",
        aiInterpretation: "Interpretación IA", newReading: "Nueva Consulta",
        askAgain: "Preguntar de Nuevo", questionJournal: "Diario de Preguntas",
        readingHistory: "Historial", noQuestions: "Sin preguntas.",
        noReadings: "Sin lecturas.", memory: "Memoria",
        birthTimeNotice: "Opcional: Hora para Palacio de la Vida (Zi Wei Dou Shu)",
        trigramHeaven: "Cielo", trigramEarth: "Tierra", trigramThunder: "Trueno",
        trigramWater: "Agua", trigramMountain: "Montaña", trigramWind: "Viento",
        trigramFire: "Fuego", trigramLake: "Lago",
        upper: "Superior", lower: "Inferior", binary: "Binario", decimal: "Decimal", timestamp: "Hora",
        celestial: "Guía Celestial", elements: "Cinco Elementos", yinYangBalance: "Balance Yin-Yang",
        stability: "Estabilidad", yang: "Yang", yin: "Yin", stable: "Estable",
        lifePalace: "Palacio de la Vida", bodyPalace: "Palacio del Cuerpo", hourPillar: "Pilar Horario",
        basedOnBirthTime: "Basado en hora de nacimiento", lifePalaceZiWei: "Palacio de la Vida (Zi Wei)",
        trigram: "Trigrama",
        analysis: "Análisis", advice: "Consejo", symbolism: "Simbolismo",
        movingLines: "Líneas Móviles",
        judgment: "Juicio", image: "Imagen", lineTexts: "Textos de Líneas",
        wood: "Madera", fire: "Fuego", earth: "Tierra", metal: "Metal", water: "Agua",
        loading: "Cargando...", consulting: "Consultando el oráculo...",
        pleaseWait: "Conectando con la sabiduría del I Ching",
        translating: "Traduciendo...",
        generatingInterp: "Generando interpretación...",
        gatheringWisdom: "Reuniendo sabiduría...",
        focusingQuery: "Enfocando la consulta...",
        usingTraditional: "Usando método tradicional...",
        loadingInterp: "Cargando interpretación...",
        translatingTo: "Traduciendo al",
        perfect: "Balance Perfecto", pureYang: "Yang Puro", pureYin: "Yin Puro",
        yangDominant: "Yang Dominante", yinDominant: "Yin Dominante",
        totalChange: "Cambio Total", mostlyStable: "Mayormente Estable", changing: "Cambiando",
        animal: "Animal", degrees: "Grados", number: "Núm",
        dateLabel: "Fecha (Lunar)", birthTimeLabel: "Hora Nac.", memoryLabel: "Memoria", themeLabel: "Tema",
        themeDark: "Oscuro (Vacío)", themeBalanced: "Equilibrado", themeWood: "\u6728 Madera", themeFire: "\u706b Fuego",
        themeEarth: "\u571f Tierra", themeMetal: "\u91d1 Metal", themeWater: "\u6c34 Agua",
        memoryOff: "Apagado", memory10min: "10 min", memory30min: "30 min", memory1hour: "1 hora", memory3hours: "3 horas",
        viewDocument: "Ver Documento"
    },
    it: {
        oracle: "Oracolo", journal: "Diario", step1Title: "Cosa hai in mente?",
        next: "Inizia", questionPlaceholder: "Scrivi la tua domanda...",
        meditationText: "Concentrati...<br>L'oracolo risponderà a breve.",
        meditationTitle: "MEDITAZIONE",
        meditateCast: "Medita e Lancia",
        history: "Cronologia",
        coinTosses: "Lanci", hexagramDetails: "Dettagli",
        originalText: "Testo Originale (Cinese)", translation: "Traduzione",
        aiInterpretation: "Interpretazione IA", newReading: "Nuova Domanda",
        askAgain: "Chiedi Ancora", questionJournal: "Diario delle Domande",
        readingHistory: "Cronologia", noQuestions: "Nessuna domanda.",
        noReadings: "Nessuna lettura.", memory: "Memoria",
        birthTimeNotice: "Opzionale: Ora per Palazzo della Vita (Zi Wei Dou Shu)",
        trigramHeaven: "Cielo", trigramEarth: "Terra", trigramThunder: "Tuono",
        trigramWater: "Acqua", trigramMountain: "Montagna", trigramWind: "Vento",
        trigramFire: "Fuoco", trigramLake: "Lago",
        upper: "Superiore", lower: "Inferiore", binary: "Binario", decimal: "Decimale", timestamp: "Orario",
        celestial: "Guida Celestiale", elements: "Cinque Elementi", yinYangBalance: "Bilancia Yin-Yang",
        stability: "Stabilità", yang: "Yang", yin: "Yin", stable: "Stabile",
        lifePalace: "Palazzo della Vita", bodyPalace: "Palazzo del Corpo", hourPillar: "Pilastro Orario",
        basedOnBirthTime: "Basato sull'ora di nascita", lifePalaceZiWei: "Palazzo della Vita (Zi Wei)",
        trigram: "Trigramma",
        analysis: "Analisi", advice: "Consiglio", symbolism: "Simbolismo",
        movingLines: "Linee in Movimento",
        judgment: "Giudizio", image: "Immagine", lineTexts: "Testi delle Linee",
        wood: "Legno", fire: "Fuoco", earth: "Terra", metal: "Metallo", water: "Acqua",
        loading: "Caricamento...", consulting: "Consultando l'oracolo...",
        pleaseWait: "Connessione con la saggezza dell'I Ching",
        translating: "Traducendo...",
        generatingInterp: "Generando interpretazione...",
        gatheringWisdom: "Raccogliendo saggezza...",
        focusingQuery: "Focalizzando la domanda...",
        usingTraditional: "Usando metodo tradizionale...",
        loadingInterp: "Caricando interpretazione...",
        translatingTo: "Traducendo in",
        perfect: "Equilibrio Perfetto", pureYang: "Yang Puro", pureYin: "Yin Puro",
        yangDominant: "Yang Dominante", yinDominant: "Yin Dominante",
        totalChange: "Cambio Totale", mostlyStable: "Prevalentemente Stabile", changing: "In Cambiamento",
        animal: "Animale", degrees: "Gradi", number: "Num",
        dateLabel: "Data (Lunare)", birthTimeLabel: "Ora Nascita", memoryLabel: "Memoria", themeLabel: "Tema",
        themeDark: "Scuro (Vuoto)", themeBalanced: "Equilibrato", themeWood: "\u6728 Legno", themeFire: "\u706b Fuoco",
        themeEarth: "\u571f Terra", themeMetal: "\u91d1 Metallo", themeWater: "\u6c34 Acqua",
        memoryOff: "Spento", memory10min: "10 min", memory30min: "30 min", memory1hour: "1 ora", memory3hours: "3 ore",
        viewDocument: "Visualizza Documento"
    }
};

// Storage Helper
const Storage = {
    get: (key) => { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set: (key, val) => { try { localStorage.setItem(key, val); } catch (e) { } },
    getJSON: (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } },
    setJSON: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { } }
};