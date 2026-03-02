/**
 * Astrology I18N Helper
 * 
 * Provides translations for static labels in the astrology tab.
 * Dynamic content (interpretations) should use the translation endpoint.
 * 
 * Usage:
 *   const t = AstrologyI18N.getTranslations(lang);
 *   div.innerHTML = `<h3>${t.currentSkyBazi}</h3>`;
 */

const AstrologyI18N = {
    // Translation data for static astrology labels
    translations: {
        en: {
            // Ayanamsa
            ayanamsaTitle: "Ayanamsa (Longitude Correction)",
            referenceMeridian: "Reference Meridian",
            timeCorrection: "Time Correction",
            trueSolarTime: "True Solar Time",

            // BaZi Sections
            currentSkyBazi: "Current Sky (BaZi)",
            birthChartBazi: "Birth Chart (BaZi)",
            natalChart: "Natal Chart",
            momentChart: "Moment Chart",

            // Pillars Table
            pillar: "Pillar",
            heavenlyStem: "Heavenly Stem",
            heavenlyStemShort: "Stem",
            earthlyBranch: "Earthly Branch",
            earthlyBranchShort: "Branch",
            hiddenStems: "Hidden Stems",
            hiddenStemsShort: "Hidden",
            hourPillar: "Hour",
            dayPillar: "Day",
            monthPillar: "Month",
            yearPillar: "Year",

            // master of day Panel
            dayMaster: "master of day",
            strength: "Strength",
            usefulGod: "Useful God",
            unknown: "Unknown",
            notAvailable: "N/A",

            // Symbolic Stars
            symbolicStars: "Symbolic Stars",
            noblePerson: "Noble Person",
            peachBlossom: "Peach Blossom",
            academic: "Academic",
            travellingHorse: "Travelling Horse",
            goatBlade: "Goat Blade",
            presentIn: "Present in",
            absent: "—",

            // Bagua
            baguaTitle: "Bagua (Eight Trigrams)",
            baguaSubtitle: "Hexagram Trigrams in Pre-Heaven & Post-Heaven Arrangements",
            selectedHexagramTrigrams: "Selected Hexagram Trigrams",
            upperTrigram: "UPPER TRIGRAM",
            upperTrigramZh: "上卦 (外卦)",
            lowerTrigram: "LOWER TRIGRAM",
            lowerTrigramZh: "下卦 (内卦)",
            trigramDivider: "over",
            xiantianTitle: "Xian Tian",
            xiantianDesc: "Fu Xi Arrangement · Primordial Nature",
            xiantianUpper: "Upper Position",
            xiantianLower: "Lower Position",
            xiantianMeaning: "Xian Tian Meaning",
            xiantianMeaningText: "Represents primordial nature, congenital tendencies, and spiritual essence before manifesting in the physical world.",
            houtianTitle: "Hou Tian",
            houtianDesc: "King Wen Arrangement · Manifest World",
            houtianUpper: "Upper Position",
            houtianLower: "Lower Position",
            houtianMeaning: "Hou Tian Meaning",
            houtianMeaningText: "Represents manifested reality, temporal influences, seasonal cycles, and practical application in daily life.",

            // He Tu
            hetuTitle: "He Tu",
            hetuSubtitle: "River Map · Generation Sequence",
            personalNumbers: "Personal Numbers",
            elementalFlow: "Elemental Flow",
            dominant: "Dominant",
            deficient: "Deficient",
            generation: "Generation",
            completion: "Completion",

            // Luo Shu
            luoshuTitle: "Luo Shu",
            luoshuSubtitle: "Magic Square · Nine Palaces",
            luoshuNote: "All lines sum to 15",
            lifeGua: "Life Gua",
            favorableDirections: "Favorable Directions",
            shengQi: "Sheng Qi",
            shengQiZh: "生氣",
            tianYi: "Tian Yi",
            tianYiZh: "天醫",
            yanNian: "Yan Nian",
            yanNianZh: "延年",
            fuWei: "Fu Wei",
            fuWeiZh: "伏位",
            mingGua: "Ming Gua",

            // Lunar Mansion
            lunarMansionTitle: "Lunar Mansion",
            element: "Element",
            direction: "Direction",
            degrees: "Degrees",
            dayRuler: "Day Ruler",
            hourRuler: "Hour Ruler",
            longitude: "Longitude",

            // Tai Sui
            taiSuiTitle: "Tai Sui",
            grandDukeOfYear: "Grand Duke of the Year",
            sanSha: "San Sha 三煞",
            sanShaDesc: "Three Killings direction - avoid major construction",
            suiPo: "Sui Po 歲破",
            opposite: "Opposite",
            annual: "Annual",

            // Error
            noAstrologyData: "No astrology data available",

            // Misc
            current: "Current",
            birth: "Birth",
            now: "Now",
            saveClose: "Save & Close",
            detectLocation: "Detect My Location",
            applyRecalculate: "Apply & Recalculate"
        },

        zh: {
            // Ayanamsa
            ayanamsaTitle: "經度修正",
            referenceMeridian: "參考子午線",
            timeCorrection: "時間修正",
            trueSolarTime: "真太陽時",

            // BaZi Sections
            currentSkyBazi: "天時八字",
            birthChartBazi: "命盤八字",
            natalChart: "本命盤",
            momentChart: "當前命盤",

            // Pillars Table
            pillar: "柱",
            heavenlyStem: "天干",
            heavenlyStemShort: "干",
            earthlyBranch: "地支",
            earthlyBranchShort: "支",
            hiddenStems: "藏干",
            hiddenStemsShort: "藏",
            hourPillar: "時柱",
            dayPillar: "日柱",
            monthPillar: "月柱",
            yearPillar: "年柱",

            // master of day Panel
            dayMaster: "日主",
            strength: "強弱",
            usefulGod: "用神",
            unknown: "未知",
            notAvailable: "不適用",

            // Symbolic Stars
            symbolicStars: "神煞",
            noblePerson: "天乙貴人",
            peachBlossom: "桃花",
            academic: "文昌",
            travellingHorse: "驛馬",
            goatBlade: "羊刃",
            presentIn: "出現於",
            absent: "—",

            // Bagua
            baguaTitle: "八卦",
            baguaSubtitle: "先天八卦與後天八卦",
            selectedHexagramTrigrams: "本卦兩儀",
            upperTrigram: "上卦",
            upperTrigramZh: "外卦",
            lowerTrigram: "下卦",
            lowerTrigramZh: "內卦",
            trigramDivider: "上",
            xiantianTitle: "先天八卦",
            xiantianDesc: "伏羲排列 · 先天本質",
            xiantianUpper: "上位",
            xiantianLower: "下位",
            xiantianMeaning: "先天意義",
            xiantianMeaningText: "代表先天本質、先天傾向和靈性本質，在物質世界顯現之前。",
            houtianTitle: "後天八卦",
            houtianDesc: "文王排列 · 顯現世界",
            houtianUpper: "上位",
            houtianLower: "下位",
            houtianMeaning: "後天意義",
            houtianMeaningText: "代表顯現的現實、時間影響、季節周期和日常生活中的實際應用。",

            // He Tu
            hetuTitle: "河圖",
            hetuSubtitle: "河圖 · 生成數",
            personalNumbers: "個人數字",
            elementalFlow: "五行流通",
            dominant: "旺",
            deficient: "弱",
            generation: "生數",
            completion: "成數",

            // Luo Shu
            luoshuTitle: "洛書",
            luoshuSubtitle: "洛書 · 九宮",
            luoshuNote: "每條線之和為15",
            lifeGua: "命卦",
            favorableDirections: "吉方",
            shengQi: "生氣",
            shengQiZh: "生氣",
            tianYi: "天醫",
            tianYiZh: "天醫",
            yanNian: "延年",
            yanNianZh: "延年",
            fuWei: "伏位",
            fuWeiZh: "伏位",
            mingGua: "命卦",

            // Lunar Mansion
            lunarMansionTitle: "二十八宿",
            element: "五行",
            direction: "方向",
            degrees: "度數",
            dayRuler: "日度主",
            hourRuler: "時度主",
            longitude: "經度",

            // Tai Sui
            taiSuiTitle: "太歲",
            grandDukeOfYear: "流年太歲",
            sanSha: "三煞",
            sanShaDesc: "三煞方位 - 避免大興土木",
            suiPo: "歲破",
            opposite: "對沖",
            annual: "年度",

            // Error
            noAstrologyData: "沒有可用的占星數據",

            // Misc
            current: "當前",
            birth: "出生",
            now: "現在",
            saveClose: "保存並關閉",
            detectLocation: "檢測我的位置",
            applyRecalculate: "應用並重新計算"
        },

        es: {
            // Ayanamsa
            ayanamsaTitle: "Ayanamsa (Corrección de Longitud)",
            referenceMeridian: "Meridiano de Referencia",
            timeCorrection: "Corrección de Tiempo",
            trueSolarTime: "Tiempo Solar Verdadero",

            // BaZi Sections
            currentSkyBazi: "Cielo Actual (BaZi)",
            birthChartBazi: "Carta Natal (BaZi)",
            natalChart: "Carta Natal",
            momentChart: "Carta del Momento",

            // Pillars Table
            pillar: "Pilar",
            heavenlyStem: "Tallo Celestial",
            heavenlyStemShort: "Tallo",
            earthlyBranch: "Rama Terrenal",
            earthlyBranchShort: "Rama",
            hiddenStems: "Tallos Ocultos",
            hiddenStemsShort: "Ocultos",
            hourPillar: "Hora",
            dayPillar: "Día",
            monthPillar: "Mes",
            yearPillar: "Año",

            // master of day Panel
            dayMaster: "Maestro del Día",
            strength: "Fuerza",
            usefulGod: "Dios Útil",
            unknown: "Desconocido",
            notAvailable: "N/A",

            // Symbolic Stars
            symbolicStars: "Estrellas Simbólicas",
            noblePerson: "Persona Noble",
            peachBlossom: "Flor de Durazno",
            academic: "Académica",
            travellingHorse: "Caballo Viajero",
            goatBlade: "Hoja de Cabra",
            presentIn: "Presente en",
            absent: "—",

            // Bagua
            baguaTitle: "Bagua (Ocho Trigramas)",
            baguaSubtitle: "Trigramas del Hexagrama en Arreglos Cielo Pre y Post",
            selectedHexagramTrigrams: "Trigramas del Hexagrama Seleccionado",
            upperTrigram: "TRIGRAMA SUPERIOR",
            upperTrigramZh: "上卦 (外卦)",
            lowerTrigram: "TRIGRAMA INFERIOR",
            lowerTrigramZh: "下卦 (内卦)",
            trigramDivider: "sobre",
            xiantianTitle: "Xian Tian",
            xiantianDesc: "Arreglo Fu Xi · Naturaleza Primordial",
            xiantianUpper: "Posición Superior",
            xiantianLower: "Posición Inferior",
            xiantianMeaning: "Significado Xian Tian",
            xiantianMeaningText: "Representa la naturaleza primordial, tendencias congénitas y esencia espiritual antes de manifestarse en el mundo físico.",
            houtianTitle: "Hou Tian",
            houtianDesc: "Arreglo Rey Wen · Mundo Manifestado",
            houtianUpper: "Posición Superior",
            houtianLower: "Posición Inferior",
            houtianMeaning: "Significado Hou Tian",
            houtianMeaningText: "Representa la realidad manifestada, influencias temporales, ciclos estacionales y aplicación práctica en la vida diaria.",

            // He Tu
            hetuTitle: "He Tu",
            hetuSubtitle: "Mapa del Río · Secuencia de Generación",
            personalNumbers: "Números Personales",
            elementalFlow: "Flujo Elemental",
            dominant: "Dominante",
            deficient: "Deficiente",
            generation: "Generación",
            completion: "Completación",

            // Luo Shu
            luoshuTitle: "Luo Shu",
            luoshuSubtitle: "Cuadrado Mágico · Nueve Palacios",
            luoshuNote: "Todas las líneas suman 15",
            lifeGua: "Gua de Vida",
            favorableDirections: "Direcciones Favorables",
            shengQi: "Sheng Qi",
            shengQiZh: "生氣",
            tianYi: "Tian Yi",
            tianYiZh: "天醫",
            yanNian: "Yan Nian",
            yanNianZh: "延年",
            fuWei: "Fu Wei",
            fuWeiZh: "伏位",
            mingGua: "Ming Gua",

            // Lunar Mansion
            lunarMansionTitle: "Mansión Lunar",
            element: "Elemento",
            direction: "Dirección",
            degrees: "Grados",
            dayRuler: "Regente Diurno",
            hourRuler: "Regente Horario",
            longitude: "Longitud",

            // Tai Sui
            taiSuiTitle: "Tai Sui",
            grandDukeOfYear: "Gran Duque del Año",
            sanSha: "San Sha 三煞",
            sanShaDesc: "Dirección de las Tres Muertes - evitar construcción mayor",
            suiPo: "Sui Po 歲破",
            opposite: "Opuesto",
            annual: "Anual",

            // Error
            noAstrologyData: "No hay datos astrológicos disponibles",

            // Misc
            current: "Actual",
            birth: "Nacimiento",
            now: "Ahora",
            saveClose: "Guardar y Cerrar",
            detectLocation: "Detectar Mi Ubicación",
            applyRecalculate: "Aplicar y Recalcular"
        },

        it: {
            // Ayanamsa
            ayanamsaTitle: "Ayanamsa (Correzione Longitudine)",
            referenceMeridian: "Meridiano di Riferimento",
            timeCorrection: "Correzione Tempo",
            trueSolarTime: "Tempo Solare Vero",

            // BaZi Sections
            currentSkyBazi: "Cielo Attuale (BaZi)",
            birthChartBazi: "Carta Natale (BaZi)",
            natalChart: "Carta Natale",
            momentChart: "Carta del Momento",

            // Pillars Table
            pillar: "Pilastro",
            heavenlyStem: "Stelo Celeste",
            heavenlyStemShort: "Stelo",
            earthlyBranch: "Ramo Terrestre",
            earthlyBranchShort: "Ramo",
            hiddenStems: "Steli Nascosti",
            hiddenStemsShort: "Nascosti",
            hourPillar: "Ora",
            dayPillar: "Giorno",
            monthPillar: "Mese",
            yearPillar: "Anno",

            // master of day Panel
            dayMaster: "Maestro del Giorno",
            strength: "Forza",
            usefulGod: "Dio Utile",
            unknown: "Sconosciuto",
            notAvailable: "N/D",

            // Symbolic Stars
            symbolicStars: "Stelle Simboliche",
            noblePerson: "Persona Nobile",
            peachBlossom: "Fiore di Pesco",
            academic: "Accademica",
            travellingHorse: "Cavallo Viaggiatore",
            goatBlade: "Lama di Capra",
            presentIn: "Presente in",
            absent: "—",

            // Bagua
            baguaTitle: "Bagua (Otto Trigrammi)",
            baguaSubtitle: "Trigrammi dell'Esagramma negli Arrangiamenti Cielo Pre e Post",
            selectedHexagramTrigrams: "Trigrammi dell'Esagramma Selezionato",
            upperTrigram: "TRIGRAMMA SUPERIORE",
            upperTrigramZh: "上卦 (外卦)",
            lowerTrigram: "TRIGRAMMA INFERIORE",
            lowerTrigramZh: "下卦 (内卦)",
            trigramDivider: "su",
            xiantianTitle: "Xian Tian",
            xiantianDesc: "Arrangiamento Fu Xi · Natura Primordiale",
            xiantianUpper: "Posizione Superiore",
            xiantianLower: "Posizione Inferiore",
            xiantianMeaning: "Significato Xian Tian",
            xiantianMeaningText: "Rappresenta la natura primordiale, tendenze congenite ed essenza spirituale prima di manifestarsi nel mondo fisico.",
            houtianTitle: "Hou Tian",
            houtianDesc: "Arrangiamento Re Wen · Mondo Manifestato",
            houtianUpper: "Posizione Superiore",
            houtianLower: "Posizione Inferiore",
            houtianMeaning: "Significato Hou Tian",
            houtianMeaningText: "Rappresenta la realtà manifestata, influenze temporali, cicli stagionali e applicazione pratica nella vita quotidiana.",

            // He Tu
            hetuTitle: "He Tu",
            hetuSubtitle: "Mappa del Fiume · Sequenza di Generazione",
            personalNumbers: "Numeri Personali",
            elementalFlow: "Flusso Elementale",
            dominant: "Dominante",
            deficient: "Deficiente",
            generation: "Generazione",
            completion: "Completamento",

            // Luo Shu
            luoshuTitle: "Luo Shu",
            luoshuSubtitle: "Quadrato Magico · Nove Palazzi",
            luoshuNote: "Tutte le linee sommano a 15",
            lifeGua: "Gua di Vita",
            favorableDirections: "Direzioni Favorevoli",
            shengQi: "Sheng Qi",
            shengQiZh: "生氣",
            tianYi: "Tian Yi",
            tianYiZh: "天醫",
            yanNian: "Yan Nian",
            yanNianZh: "延年",
            fuWei: "Fu Wei",
            fuWeiZh: "伏位",
            mingGua: "Ming Gua",

            // Lunar Mansion
            lunarMansionTitle: "Mansione Lunare",
            element: "Elemento",
            direction: "Direzione",
            degrees: "Gradi",
            dayRuler: "Reggente Diurno",
            hourRuler: "Reggente Orario",
            longitude: "Longitudine",

            // Tai Sui
            taiSuiTitle: "Tai Sui",
            grandDukeOfYear: "Gran Duca dell'Anno",
            sanSha: "San Sha 三煞",
            sanShaDesc: "Direzione delle Tre Uccisioni - evitare costruzioni maggiori",
            suiPo: "Sui Po 歲破",
            opposite: "Opposto",
            annual: "Annuale",

            // Error
            noAstrologyData: "Nessun dato astrologico disponibile",

            // Misc
            current: "Attuale",
            birth: "Nascita",
            now: "Ora",
            saveClose: "Salva e Chiudi",
            detectLocation: "Rileva la Mia Posizione",
            applyRecalculate: "Applica e Ricalcola"
        }
    },

    /**
     * Get translations for a specific language
     * Falls back to English if language not found
     */
    getTranslations(lang) {
        return this.translations[lang] || this.translations['en'];
    },

    /**
     * Get a single translation
     */
    t(key, lang) {
        const translations = this.getTranslations(lang);
        return translations[key] || this.translations['en'][key] || key;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AstrologyI18N;
}
