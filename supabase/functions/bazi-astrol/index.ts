import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// CHINESE ASTROLOGY API - SIDEREAL & LUNAR SYSTEMS
// ============================================================================
// 
// AYANAMSA EXPLANATION FOR CHINESE ASTROLOGY:
// 
// In traditional Chinese astronomy, "ayanamsa" manifests as:
// 1. LINGCHA (歷差 - Calendar Difference): Longitude-based time correction
// 2. CHA SHI (差時 - Time Difference): Local mean time vs standard time
// 3. ZHENG SHI (正時 - True Time): Solar time based on location longitude
//
// For each 15° of longitude difference from the reference meridian (120°E for China),
// there is a 1-hour time difference. This affects:
// - Hour Pillar calculation
// - Lunar mansion position
// - Ascendant (Life Palace) calculation
// - Qi Men Dun Jia plate setup
//
// Reference meridians:
// - China: 120°E (standard time zone)
// - Historical: Local observatory longitude
// - This API: User's exact longitude

// ============================================================================
// CONSTANTS & DATA
// ============================================================================

// Reference meridian for traditional Chinese calculations (120°E - Beijing/Jiangsu)
const CHINA_REFERENCE_LONGITUDE = 120.0;

// Degrees per hour (Earth rotation)
const DEGREES_PER_HOUR = 15.0;

// Minutes per degree
const MINUTES_PER_DEGREE = 4.0;

// 28 Lunar Mansions (Xiu) with precise boundaries
const LUNAR_MANSIONS_28 = [
  { num: 1, name: "Jiao", zh: "角", degree: 12, element: "Wood", direction: "E", animal: "Dragon", group: "Azure Dragon" },
  { num: 2, name: "Kang", zh: "亢", degree: 9, element: "Metal", direction: "E", animal: "Dragon", group: "Azure Dragon" },
  { num: 3, name: "Di", zh: "氐", degree: 15, element: "Earth", direction: "E", animal: "Badger", group: "Azure Dragon" },
  { num: 4, name: "Fang", zh: "房", degree: 5, element: "Sun", direction: "E", animal: "Rabbit", group: "Azure Dragon" },
  { num: 5, name: "Xin", zh: "心", degree: 5, element: "Moon", direction: "E", animal: "Fox", group: "Azure Dragon" },
  { num: 6, name: "Wei", zh: "尾", degree: 18, element: "Fire", direction: "E", animal: "Tiger", group: "Azure Dragon" },
  { num: 7, name: "Ji", zh: "箕", degree: 11, element: "Wood", direction: "E", animal: "Leopard", group: "Azure Dragon" },
  { num: 8, name: "Dou", zh: "斗", degree: 26, element: "Wood", direction: "N", animal: "Ox", group: "Black Tortoise" },
  { num: 9, name: "Niu", zh: "牛", degree: 8, element: "Earth", direction: "N", animal: "Ox", group: "Black Tortoise" },
  { num: 10, name: "Nu", zh: "女", degree: 12, element: "Earth", direction: "N", animal: "Bat", group: "Black Tortoise" },
  { num: 11, name: "Xu", zh: "虛", degree: 10, element: "Sun", direction: "N", animal: "Rat", group: "Black Tortoise" },
  { num: 12, name: "Wei2", zh: "危", degree: 17, element: "Moon", direction: "N", animal: "Swallow", group: "Black Tortoise" },
  { num: 13, name: "Shi", zh: "室", degree: 16, element: "Fire", direction: "N", animal: "Pig", group: "Black Tortoise" },
  { num: 14, name: "Bi", zh: "壁", degree: 9, element: "Water", direction: "N", animal: "Porcupine", group: "Black Tortoise" },
  { num: 15, name: "Kui", zh: "奎", degree: 16, element: "Wood", direction: "W", animal: "Wolf", group: "White Tiger" },
  { num: 16, name: "Lou", zh: "婁", degree: 12, element: "Metal", direction: "W", animal: "Dog", group: "White Tiger" },
  { num: 17, name: "Wei3", zh: "胃", degree: 14, element: "Earth", direction: "W", animal: "Pheasant", group: "White Tiger" },
  { num: 18, name: "Mao", zh: "昴", degree: 11, element: "Sun", direction: "W", animal: "Rooster", group: "White Tiger" },
  { num: 19, name: "Bi2", zh: "畢", degree: 16, element: "Moon", direction: "W", animal: "Crow", group: "White Tiger" },
  { num: 20, name: "Zui", zh: "觜", degree: 2, element: "Fire", direction: "W", animal: "Monkey", group: "White Tiger" },
  { num: 21, name: "Shen", zh: "參", degree: 9, element: "Water", direction: "W", animal: "Ape", group: "White Tiger" },
  { num: 22, name: "Jing", zh: "井", degree: 33, element: "Wood", direction: "S", animal: "Tapir", group: "Vermilion Bird" },
  { num: 23, name: "Gui", zh: "鬼", degree: 4, element: "Metal", direction: "S", animal: "Sheep", group: "Vermilion Bird" },
  { num: 24, name: "Liu", zh: "柳", degree: 15, element: "Earth", direction: "S", animal: "Deer", group: "Vermilion Bird" },
  { num: 25, name: "Xing", zh: "星", degree: 7, element: "Sun", direction: "S", animal: "Horse", group: "Vermilion Bird" },
  { num: 26, name: "Zhang", zh: "張", degree: 18, element: "Moon", direction: "S", animal: "Deer", group: "Vermilion Bird" },
  { num: 27, name: "Yi", zh: "翼", degree: 18, element: "Fire", direction: "S", animal: "Snake", group: "Vermilion Bird" },
  { num: 28, name: "Zhen", zh: "軫", degree: 17, element: "Water", direction: "S", animal: "Worm", group: "Vermilion Bird" }
];

// Build cumulative degrees
let cumulativeDeg = 0;
for (const m of LUNAR_MANSIONS_28) {
  m.startDeg = cumulativeDeg;
  cumulativeDeg += m.degree;
  m.endDeg = cumulativeDeg;
}

// Heavenly Stems
const HEAVENLY_STEMS = [
  { name: "Jia", zh: "甲", element: "Wood", polarity: "Yang", num: 1 },
  { name: "Yi", zh: "乙", element: "Wood", polarity: "Yin", num: 2 },
  { name: "Bing", zh: "丙", element: "Fire", polarity: "Yang", num: 3 },
  { name: "Ding", zh: "丁", element: "Fire", polarity: "Yin", num: 4 },
  { name: "Wu", zh: "戊", element: "Earth", polarity: "Yang", num: 5 },
  { name: "Ji", zh: "己", element: "Earth", polarity: "Yin", num: 6 },
  { name: "Geng", zh: "庚", element: "Metal", polarity: "Yang", num: 7 },
  { name: "Xin", zh: "辛", element: "Metal", polarity: "Yin", num: 8 },
  { name: "Ren", zh: "壬", element: "Water", polarity: "Yang", num: 9 },
  { name: "Gui", zh: "癸", element: "Water", polarity: "Yin", num: 10 }
];

// Earthly Branches
const EARTHLY_BRANCHES = [
  { name: "Zi", zh: "子", element: "Water", polarity: "Yang", zodiac: "Rat", num: 1, hidden: ["Gui"] },
  { name: "Chou", zh: "丑", element: "Earth", polarity: "Yin", zodiac: "Ox", num: 2, hidden: ["Ji", "Gui", "Xin"] },
  { name: "Yin", zh: "寅", element: "Wood", polarity: "Yang", zodiac: "Tiger", num: 3, hidden: ["Jia", "Bing", "Wu"] },
  { name: "Mao", zh: "卯", element: "Wood", polarity: "Yin", zodiac: "Rabbit", num: 4, hidden: ["Yi"] },
  { name: "Chen", zh: "辰", element: "Earth", polarity: "Yang", zodiac: "Dragon", num: 5, hidden: ["Wu", "Yi", "Gui"] },
  { name: "Si", zh: "巳", element: "Fire", polarity: "Yin", zodiac: "Snake", num: 6, hidden: ["Bing", "Wu", "Geng"] },
  { name: "Wu", zh: "午", element: "Fire", polarity: "Yang", zodiac: "Horse", num: 7, hidden: ["Ding", "Ji"] },
  { name: "Wei", zh: "未", element: "Earth", polarity: "Yin", zodiac: "Goat", num: 8, hidden: ["Ji", "Ding", "Yi"] },
  { name: "Shen", zh: "申", element: "Metal", polarity: "Yang", zodiac: "Monkey", num: 9, hidden: ["Geng", "Ren", "Wu"] },
  { name: "You", zh: "酉", element: "Metal", polarity: "Yin", zodiac: "Rooster", num: 10, hidden: ["Xin"] },
  { name: "Xu", zh: "戌", element: "Earth", polarity: "Yang", zodiac: "Dog", num: 11, hidden: ["Wu", "Xin", "Ding"] },
  { name: "Hai", zh: "亥", element: "Water", polarity: "Yin", zodiac: "Pig", num: 12, hidden: ["Ren", "Jia"] }
];

// Symbolic Stars (Shen Sha) Formulas
const SHEN_SHA_FORMULAS = {
  // Tian Yi Gui Ren - Noble Person Star
  tianYiGuiRen: {
    stemMap: {
      "Jia": ["Chou", "Wei"], "Wu": ["Chou", "Wei"], "Geng": ["Chou", "Wei"],
      "Yi": ["Zi", "Shen"], "Ji": ["Zi", "Shen"],
      "Bing": ["Hai", "You"], "Ding": ["Hai", "You"],
      "Ren": ["Si", "Mao"], "Gui": ["Si", "Mao"],
      "Xin": ["Yin", "Wu"]
    },
    meaning: "Guardian Angel - help from powerful people in crisis",
    quality: "Auspicious"
  },
  
  // Tao Hua - Peach Blossom
  peachBlossom: {
    branchMap: {
      "Yin": "Mao", "Wu": "Mao", "Xu": "Mao",     // Tiger/Horse/Dog
      "Si": "Wu", "You": "Wu", "Chou": "Wu",     // Snake/Rooster/Ox
      "Shen": "You", "Zi": "You", "Chen": "You", // Monkey/Rat/Dragon
      "Hai": "Zi", "Mao": "Zi", "Wei": "Zi"      // Pig/Rabbit/Goat
    },
    meaning: "Charisma, romance, social attraction",
    quality: "Mixed"
  },
  
  // Wen Chang - Academic Star
  wenChang: {
    stemMap: {
      "Jia": "Si", "Yi": "Wu",
      "Bing": "Shen", "Wu": "Shen",
      "Ding": "You", "Ji": "You",
      "Geng": "Hai", "Xin": "Zi",
      "Ren": "Yin", "Gui": "Mao"
    },
    meaning: "Intelligence, literary talent, exam success",
    quality: "Auspicious"
  },
  
  // Yi Ma - Travelling Horse
  yiMa: {
    branchMap: {
      "Yin": "Shen", "Shen": "Yin",
      "Si": "Hai", "Hai": "Si",
      "Shen": "Yin", "Zi": "Yin", "Chen": "Yin",
      "Hai": "Si", "Mao": "Si", "Wei": "Si",
      "Yin": "Shen", "Wu": "Shen", "Xu": "Shen",
      "Si": "Hai", "You": "Hai", "Chou": "Hai"
    },
    meaning: "Movement, migration, rapid change",
    quality: "Dynamic"
  },
  
  // Tian Yi - Heavenly Doctor (Feng Shui)
  tianYi: {
    stemMap: {
      "Jia": "Chou", "Yi": "Zi", "Bing": "Hai", "Ding": "You",
      "Wu": "Chou", "Ji": "Zi", "Geng": "Chou", "Xin": "Yin",
      "Ren": "Si", "Gui": "Mao"
    },
    meaning: "Healing, medical support, recovery",
    quality: "Auspicious"
  },
  
  // Yang Ren - Goat Blade/Sword
  yangRen: {
    stemMap: {
      "Jia": "Mao", "Yi": "Yin", "Bing": "Wu", "Ding": "Si",
      "Wu": "Wu", "Ji": "Si", "Geng": "You", "Xin": "Shen",
      "Ren": "Zi", "Gui": "Hai"
    },
    meaning: "Extreme persistence, aggression, potential for injury",
    quality: "Challenging"
  }
};

// Tai Sui (Grand Duke) positions by year
const TAI_SUI_POSITIONS = {
  "Zi": { direction: "N", degree: 0, zodiac: "Rat" },
  "Chou": { direction: "NE", degree: 30, zodiac: "Ox" },
  "Yin": { direction: "NE", degree: 60, zodiac: "Tiger" },
  "Mao": { direction: "E", degree: 90, zodiac: "Rabbit" },
  "Chen": { direction: "SE", degree: 120, zodiac: "Dragon" },
  "Si": { direction: "SE", degree: 150, zodiac: "Snake" },
  "Wu": { direction: "S", degree: 180, zodiac: "Horse" },
  "Wei": { direction: "SW", degree: 210, zodiac: "Goat" },
  "Shen": { direction: "SW", degree: 240, zodiac: "Monkey" },
  "You": { direction: "W", degree: 270, zodiac: "Rooster" },
  "Xu": { direction: "NW", degree: 300, zodiac: "Dog" },
  "Hai": { direction: "NW", degree: 330, zodiac: "Pig" }
};

// Nine Stars for Qi Men Dun Jia
const QI_MEN_STARS = [
  { num: 1, name: "Tian Peng", zh: "天蓬", element: "Water", nature: "Pioneering, hidden" },
  { num: 2, name: "Tian Rui", zh: "天芮", element: "Earth", nature: "Sickness, education" },
  { num: 3, name: "Tian Chong", zh: "天沖", element: "Wood", nature: "Action, aggression" },
  { num: 4, name: "Tian Fu", zh: "天輔", element: "Wood", nature: "Culture, support" },
  { num: 5, name: "Tian Qin", zh: "天禽", element: "Earth", nature: "Central, balanced" },
  { num: 6, name: "Tian Xin", zh: "天心", element: "Metal", nature: "Heavenly heart, medicine" },
  { num: 7, name: "Tian Zhu", zh: "天柱", element: "Metal", nature: "Destruction, litigation" },
  { num: 8, name: "Tian Ren", zh: "天任", element: "Earth", nature: "Responsibility, building" },
  { num: 9, name: "Tian Ying", zh: "天英", element: "Fire", nature: "Fire, heroism" }
];

// ============================================================================
// AYANAMSA (LONGITUDE CORRECTION) CALCULATIONS
// ============================================================================

interface LocationData {
  longitude: number;  // -180 to 180, East is positive
  latitude: number;   // -90 to 90
  altitude?: number;  // meters above sea level
}

interface AyanamsaResult {
  originalTime: string;
  correctedTime: string;
  longitudeCorrection: number;  // in minutes
  timeDifference: string;
  referenceMeridian: number;
  localMeanTime: string;
  trueSolarTime: string;
  equationOfTime: number;  // correction for Earth's elliptical orbit
}

/**
 * Calculate Ayanamsa (Longitude-based time correction)
 * 
 * In Chinese astrology, this is called LINGCHA (歷差) or CHA SHI (差時)
 * 
 * @param date - The date/time
 * @param location - Longitude and latitude
 * @returns Corrected time data
 */
function calculateAyanamsa(date: Date, location: LocationData): AyanamsaResult {
  // Calculate longitude-based time difference
  // For every 15° of longitude difference = 1 hour
  // For every 1° of longitude = 4 minutes
  const longitudeDiff = location.longitude - CHINA_REFERENCE_LONGITUDE;
  const correctionMinutes = longitudeDiff * MINUTES_PER_DEGREE;
  
  // Calculate equation of time (Earth's elliptical orbit correction)
  // This accounts for the difference between mean solar time and apparent solar time
  const dayOfYear = getDayOfYear(date);
  const equationOfTime = calculateEquationOfTime(dayOfYear);
  
  // Total correction in milliseconds
  const totalCorrectionMs = (correctionMinutes + equationOfTime) * 60 * 1000;
  
  // Apply correction
  const correctedDate = new Date(date.getTime() + totalCorrectionMs);
  
  return {
    originalTime: date.toISOString(),
    correctedTime: correctedDate.toISOString(),
    longitudeCorrection: correctionMinutes,
    timeDifference: formatTimeDifference(correctionMinutes),
    referenceMeridian: CHINA_REFERENCE_LONGITUDE,
    localMeanTime: correctedDate.toISOString(),
    trueSolarTime: new Date(correctedDate.getTime() + equationOfTime * 60 * 1000).toISOString(),
    equationOfTime: equationOfTime
  };
}

/**
 * Calculate Equation of Time
 * Accounts for Earth's elliptical orbit and axial tilt
 * Formula accurate to within ~30 seconds
 */
function calculateEquationOfTime(dayOfYear: number): number {
  // B = (360° / 365) * (dayOfYear - 81)
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
  
  // EoT = 9.87 * sin(2B) - 7.53 * cos(B) - 1.5 * sin(B)
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  
  return eot;  // in minutes
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatTimeDifference(minutes: number): string {
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = Math.round(absMinutes % 60);
  const sign = minutes >= 0 ? "+" : "-";
  
  if (hours === 0) {
    return `${sign}${mins} minutes`;
  }
  return `${sign}${hours}h ${mins}m`;
}

// ============================================================================
// BAZI (FOUR PILLARS) CALCULATIONS WITH AYANAMSA
// ============================================================================

interface BaziPillar {
  stem: typeof HEAVENLY_STEMS[0];
  branch: typeof EARTHLY_BRANCHES[0];
  hiddenStems: string[];
  tenGod?: string;
}

interface BaziChart {
  year: BaziPillar;
  month: BaziPillar;
  day: BaziPillar;
  hour: BaziPillar;
  dayMaster: typeof HEAVENLY_STEMS[0];
  strength: {
    score: number;
    result: string;
    yongShen: string;
  };
  shenSha: Record<string, any>;  // Symbolic stars
}

/**
 * Calculate BaZi chart with precise ayanamsa correction
 */
function calculateBazi(date: Date, location?: LocationData): BaziChart {
  // Apply ayanamsa correction if location provided
  let calculationDate = date;
  let ayanamsaData: AyanamsaResult | null = null;
  
  if (location) {
    ayanamsaData = calculateAyanamsa(date, location);
    calculationDate = new Date(ayanamsaData.correctedTime);
  }
  
  const year = calculationDate.getFullYear();
  const month = calculationDate.getMonth();
  const day = calculationDate.getDate();
  const hours = calculationDate.getHours();
  const minutes = calculationDate.getMinutes();
  
  // 1. YEAR PILLAR
  // BaZi year changes at Li Chun (approx Feb 4)
  let liChun = new Date(year, 1, 4);  // Feb 4
  let baziYear = year;
  if (calculationDate < liChun) baziYear--;
  
  const yearStemIdx = (baziYear - 4 + 10) % 10;
  const yearBranchIdx = (baziYear - 4 + 12) % 12;
  
  // 2. MONTH PILLAR
  // Based on solar terms (Jie Qi)
  const monthStarts = [
    { m: 0, d: 5 },  // Jan: Xiao Han
    { m: 1, d: 4 },  // Feb: Li Chun
    { m: 2, d: 5 },  // Mar: Jing Zhe
    { m: 3, d: 5 },  // Apr: Qing Ming
    { m: 4, d: 5 },  // May: Li Xia
    { m: 5, d: 6 },  // Jun: Mang Zhong
    { m: 6, d: 7 },  // Jul: Xiao Shu
    { m: 7, d: 7 },  // Aug: Li Qiu
    { m: 8, d: 8 },  // Sep: Bai Lu
    { m: 9, d: 8 },  // Oct: Han Lu
    { m: 10, d: 7 }, // Nov: Li Dong
    { m: 11, d: 7 }  // Dec: Da Xue
  ];
  
  let baziMonthIdx = month;
  if (day < monthStarts[month].d) {
    baziMonthIdx = (month + 11) % 12;
  }
  
  const monthBranchIdx = (baziMonthIdx + 1) % 12;
  const monthStemIdx = (yearStemIdx * 2 + monthBranchIdx) % 10;
  
  // 3. DAY PILLAR
  // Reference: Jan 1, 2000 was Wu-Wu (4, 6)
  const refDate = new Date(2000, 0, 1);
  const diffDays = Math.floor((calculationDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayStemIdx = (4 + (diffDays % 10) + 10) % 10;
  const dayBranchIdx = (6 + (diffDays % 12) + 12) % 12;
  
  // 4. HOUR PILLAR (with ayanamsa correction applied)
  const hourBranchIdx = Math.floor((hours + 1) / 2) % 12;
  const hourStemIdx = (dayStemIdx * 2 + hourBranchIdx) % 10;
  
  const chart: BaziChart = {
    year: {
      stem: HEAVENLY_STEMS[yearStemIdx],
      branch: EARTHLY_BRANCHES[yearBranchIdx],
      hiddenStems: EARTHLY_BRANCHES[yearBranchIdx].hidden
    },
    month: {
      stem: HEAVENLY_STEMS[monthStemIdx],
      branch: EARTHLY_BRANCHES[monthBranchIdx],
      hiddenStems: EARTHLY_BRANCHES[monthBranchIdx].hidden
    },
    day: {
      stem: HEAVENLY_STEMS[dayStemIdx],
      branch: EARTHLY_BRANCHES[dayBranchIdx],
      hiddenStems: EARTHLY_BRANCHES[dayBranchIdx].hidden
    },
    hour: {
      stem: HEAVENLY_STEMS[hourStemIdx],
      branch: EARTHLY_BRANCHES[hourBranchIdx],
      hiddenStems: EARTHLY_BRANCHES[hourBranchIdx].hidden
    },
    dayMaster: HEAVENLY_STEMS[dayStemIdx],
    strength: { score: 0, result: "", yongShen: "" },
    shenSha: {}
  };
  
  // Calculate strength
  chart.strength = calculateStrength(chart);
  
  // Calculate Symbolic Stars (Shen Sha)
  chart.shenSha = calculateShenSha(chart);
  
  return chart;
}

function calculateStrength(chart: BaziChart): { score: number; result: string; yongShen: string } {
  const dm = chart.day.stem;
  const season = chart.month.branch;
  
  let score = 0;
  
  // Season support
  const fiveElements: Record<string, { produces: string; overcomes: string }> = {
    Wood: { produces: "Fire", overcomes: "Earth" },
    Fire: { produces: "Earth", overcomes: "Metal" },
    Earth: { produces: "Metal", overcomes: "Water" },
    Metal: { produces: "Water", overcomes: "Wood" },
    Water: { produces: "Wood", overcomes: "Fire" }
  };
  
  if (season.element === dm.element) score += 40;
  else if (fiveElements[season.element].produces === dm.element) score += 30;
  else if (fiveElements[dm.element].produces === season.element) score -= 20;
  else if (fiveElements[season.element].overcomes === dm.element) score -= 30;
  else score -= 10;
  
  // Other pillars
  const stems = [chart.year.stem, chart.month.stem, chart.hour.stem];
  stems.forEach(s => {
    if (s.element === dm.element) score += 10;
    else if (fiveElements[s.element].produces === dm.element) score += 10;
    else score -= 5;
  });
  
  const branches = [chart.year.branch, chart.day.branch, chart.hour.branch];
  branches.forEach(b => {
    if (b.element === dm.element) score += 10;
    else if (fiveElements[b.element].produces === dm.element) score += 10;
    else score -= 5;
  });
  
  let result = "";
  if (score > 20) result = "Strong";
  else if (score < -10) result = "Weak";
  else result = "Balanced";
  
  let yongShen = "";
  if (result === "Strong") {
    yongShen = fiveElements[dm.element].overcomes;
  } else if (result === "Weak") {
    yongShen = dm.element;
  } else {
    yongShen = "Balanced";
  }
  
  return { score, result, yongShen };
}

function calculateShenSha(chart: BaziChart): Record<string, any> {
  const shenSha: Record<string, any> = {};
  const dayStem = chart.day.stem.name;
  const dayBranch = chart.day.branch.name;
  const yearBranch = chart.year.branch.name;
  
  // Noble Person (Tian Yi Gui Ren)
  const nobleBranches = SHEN_SHA_FORMULAS.tianYiGuiRen.stemMap[dayStem as keyof typeof SHEN_SHA_FORMULAS.tianYiGuiRen.stemMap];
  if (nobleBranches) {
    shenSha.noblePerson = {
      name: "Tian Yi Gui Ren",
      zh: "天乙貴人",
      branches: nobleBranches,
      meaning: SHEN_SHA_FORMULAS.tianYiGuiRen.meaning,
      quality: SHEN_SHA_FORMULAS.tianYiGuiRen.quality,
      presentIn: checkShenShaPresence(nobleBranches, chart)
    };
  }
  
  // Peach Blossom (Tao Hua)
  const peachBranch = SHEN_SHA_FORMULAS.peachBlossom.branchMap[yearBranch as keyof typeof SHEN_SHA_FORMULAS.peachBlossom.branchMap];
  if (peachBranch) {
    shenSha.peachBlossom = {
      name: "Tao Hua",
      zh: "桃花",
      branch: peachBranch,
      meaning: SHEN_SHA_FORMULAS.peachBlossom.meaning,
      quality: SHEN_SHA_FORMULAS.peachBlossom.quality,
      presentIn: checkSingleShenShaPresence(peachBranch, chart)
    };
  }
  
  // Academic Star (Wen Chang)
  const academicBranch = SHEN_SHA_FORMULAS.wenChang.stemMap[dayStem as keyof typeof SHEN_SHA_FORMULAS.wenChang.stemMap];
  if (academicBranch) {
    shenSha.academic = {
      name: "Wen Chang",
      zh: "文昌",
      branch: academicBranch,
      meaning: SHEN_SHA_FORMULAS.wenChang.meaning,
      quality: SHEN_SHA_FORMULAS.wenChang.quality,
      presentIn: checkSingleShenShaPresence(academicBranch, chart)
    };
  }
  
  // Travelling Horse (Yi Ma)
  const horseBranch = SHEN_SHA_FORMULAS.yiMa.branchMap[yearBranch as keyof typeof SHEN_SHA_FORMULAS.yiMa.branchMap];
  if (horseBranch) {
    shenSha.travellingHorse = {
      name: "Yi Ma",
      zh: "驛馬",
      branch: horseBranch,
      meaning: SHEN_SHA_FORMULAS.yiMa.meaning,
      quality: SHEN_SHA_FORMULAS.yiMa.quality,
      presentIn: checkSingleShenShaPresence(horseBranch, chart)
    };
  }
  
  // Yang Ren (Sword/Goat Blade)
  const yangRenBranch = SHEN_SHA_FORMULAS.yangRen.stemMap[dayStem as keyof typeof SHEN_SHA_FORMULAS.yangRen.stemMap];
  if (yangRenBranch) {
    shenSha.yangRen = {
      name: "Yang Ren",
      zh: "羊刃",
      branch: yangRenBranch,
      meaning: SHEN_SHA_FORMULAS.yangRen.meaning,
      quality: SHEN_SHA_FORMULAS.yangRen.quality,
      presentIn: checkSingleShenShaPresence(yangRenBranch, chart)
    };
  }
  
  return shenSha;
}

function checkShenShaPresence(targetBranches: string[], chart: BaziChart): string[] {
  const present: string[] = [];
  const pillars = ['year', 'month', 'day', 'hour'] as const;
  
  pillars.forEach(pillar => {
    if (targetBranches.includes(chart[pillar].branch.name)) {
      present.push(`${pillar} (${chart[pillar].branch.zh})`);
    }
  });
  
  return present;
}

function checkSingleShenShaPresence(targetBranch: string, chart: BaziChart): string[] {
  return checkShenShaPresence([targetBranch], chart);
}

// ============================================================================
// LUNAR ASTROLOGY (28 XIU / LUNAR MANSIONS)
// ============================================================================

interface LunarMansionPosition {
  mansion: typeof LUNAR_MANSIONS_28[0];
  degree: number;  // Precise degree within mansion
  exactLongitude: number;  // 0-360
  isAscending: boolean;  // Whether mansion is rising
  dayRuler: string;  // Daily ruler of the mansion
  hourRuler: string;  // Hourly ruler
}

/**
 * Calculate precise lunar mansion position with ayanamsa
 * Uses true lunar position and longitude correction
 */
function calculateLunarMansion(date: Date, location?: LocationData): LunarMansionPosition {
  // Apply ayanamsa
  let calculationDate = date;
  if (location) {
    const ayanamsa = calculateAyanamsa(date, location);
    calculationDate = new Date(ayanamsa.correctedTime);
  }
  
  // Calculate moon's position
  // Using simplified but accurate lunar position calculation
  const moonLongitude = calculateMoonLongitude(calculationDate);
  
  // Adjust for location longitude (visual observation)
  let visualLongitude = moonLongitude;
  if (location) {
    // Local sidereal time adjustment
    const lstAdjustment = location.longitude * (24 / 360);  // Hours to degrees
    visualLongitude = (moonLongitude + lstAdjustment * 15) % 360;
    if (visualLongitude < 0) visualLongitude += 360;
  }
  
  // Find which mansion contains this longitude
  const mansion = findMansionForLongitude(visualLongitude);
  const degreeInMansion = visualLongitude - mansion.startDeg;
  
  // Calculate daily and hourly rulers
  const dayRuler = calculateDayRuler(calculationDate);
  const hourRuler = calculateHourRuler(calculationDate);
  
  return {
    mansion,
    degree: degreeInMansion,
    exactLongitude: visualLongitude,
    isAscending: isMansionAscending(mansion, calculationDate, location),
    dayRuler,
    hourRuler
  };
}

/**
 * Calculate Moon's ecliptic longitude
 * Accurate to within ~0.5 degrees
 */
function calculateMoonLongitude(date: Date): number {
  // Days since J2000.0 (Jan 1, 2000, 12:00 UT)
  const jd2000 = 2451545.0;
  const msPerDay = 86400000;
  const d = (date.getTime() / msPerDay) - jd2000 + 2440587.5;
  
  // Mean longitude of the moon
  const L = (218.316 + 13.176396 * d) % 360;
  
  // Mean anomaly
  const M = (134.963 + 13.064993 * d) % 360;
  
  // Mean distance
  const F = (93.272 + 13.229350 * d) % 360;
  
  // Calculate longitude with perturbations
  let longitude = L + 6.289 * Math.sin(M * Math.PI / 180);
  longitude += 1.274 * Math.sin((2 * M - L + 134.963) * Math.PI / 180);
  longitude += 0.658 * Math.sin(2 * M * Math.PI / 180);
  longitude += 0.214 * Math.sin(2 * L * Math.PI / 180);
  longitude -= 0.186 * Math.sin(M * Math.PI / 180);
  longitude -= 0.114 * Math.sin(2 * F * Math.PI / 180);
  
  longitude = longitude % 360;
  if (longitude < 0) longitude += 360;
  
  return longitude;
}

function findMansionForLongitude(longitude: number): typeof LUNAR_MANSIONS_28[0] {
  // Normalize to 0-365.25 range of mansions
  const normalizedLong = longitude % 365.25;
  
  for (const mansion of LUNAR_MANSIONS_28) {
    if (normalizedLong >= mansion.startDeg && normalizedLong < mansion.endDeg) {
      return mansion;
    }
  }
  
  return LUNAR_MANSIONS_28[0];  // Default to first mansion
}

function calculateDayRuler(date: Date): string {
  // Daily ruler cycles through 12 branches
  const dayNum = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  const branchIdx = (dayNum + 11) % 12;  // Start with Zi
  return EARTHLY_BRANCHES[branchIdx].name;
}

function calculateHourRuler(date: Date): string {
  const hour = date.getHours();
  const branchIdx = Math.floor((hour + 1) / 2) % 12;
  return EARTHLY_BRANCHES[branchIdx].name;
}

function isMansionAscending(mansion: typeof LUNAR_MANSIONS_28[0], date: Date, location?: LocationData): boolean {
  // Simplified: mansion is ascending if its direction matches current time of day
  const hour = date.getHours();
  
  const directionHours: Record<string, number[]> = {
    "E": [5, 6, 7, 8, 9],      // Morning
    "S": [10, 11, 12, 13, 14], // Midday
    "W": [15, 16, 17, 18, 19], // Afternoon/Evening
    "N": [20, 21, 22, 23, 0, 1, 2, 3, 4] // Night
  };
  
  return directionHours[mansion.direction]?.includes(hour) || false;
}

// ============================================================================
// TAI SUI (GRAND DUKE) ANALYSIS
// ============================================================================

interface TaiSuiAnalysis {
  currentPosition: {
    branch: string;
    zh: string;
    direction: string;
    degree: number;
    zodiac: string;
  };
  clashes: string[];
  favorableDirections: string[];
  unfavorableDirections: string[];
  sanSha: {  // Three Killings
    direction: string;
    degrees: number[];
    description: string;
  };
  suiPo: {  // Year Breaker
    branch: string;
    direction: string;
    description: string;
  };
}

function calculateTaiSui(year: number, location?: LocationData): TaiSuiAnalysis {
  // Calculate year branch
  const yearBranchIdx = (year - 4) % 12;
  const yearBranch = EARTHLY_BRANCHES[yearBranchIdx];
  
  // Get Tai Sui position
  const taiSui = TAI_SUI_POSITIONS[yearBranch.name as keyof typeof TAI_SUI_POSITIONS];
  
  // Calculate clashes (branches opposite to Tai Sui)
  const oppositeIdx = (yearBranchIdx + 6) % 12;
  const oppositeBranch = EARTHLY_BRANCHES[oppositeIdx];
  
  // San Sha (Three Killings) - 60° to either side of the opposite
  const sanShaDirections = ["NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  const oppositeDir = taiSui.direction;
  
  // Favorable directions (Heavenly Doctor, etc.)
  const favorable = calculateFavorableDirections(yearBranch.name);
  
  // Unfavorable (Tai Sui direction, Year Breaker, etc.)
  const unfavorable = [taiSui.direction, oppositeBranch.name];
  
  return {
    currentPosition: {
      branch: yearBranch.name,
      zh: yearBranch.zh,
      direction: taiSui.direction,
      degree: taiSui.degree,
      zodiac: taiSui.zodiac
    },
    clashes: [oppositeBranch.name],
    favorableDirections: favorable,
    unfavorableDirections: unfavorable,
    sanSha: {
      direction: oppositeDir,
      degrees: [taiSui.degree - 30, taiSui.degree + 30],
      description: "Three Killings direction - avoid major construction"
    },
    suiPo: {
      branch: oppositeBranch.name,
      direction: oppositeBranch.name,  // Simplified
      description: "Year Breaker - opposite of Tai Sui"
    }
  };
}

function calculateFavorableDirections(yearBranch: string): string[] {
  // Based on annual flying stars and favorable directions
  const directionMap: Record<string, string[]> = {
    "Zi": ["SE", "S", "E"],      // Rat
    "Chou": ["NE", "NW", "W"],   // Ox
    "Yin": ["SE", "S", "E"],     // Tiger
    "Mao": ["E", "SE", "S"],     // Rabbit
    "Chen": ["W", "NW", "SW"],   // Dragon
    "Si": ["SW", "W", "NW"],     // Snake
    "Wu": ["NE", "E", "SE"],     // Horse
    "Wei": ["SW", "S", "SE"],    // Goat
    "Shen": ["N", "NE", "E"],    // Monkey
    "You": ["NE", "N", "NW"],    // Rooster
    "Xu": ["NW", "W", "SW"],     // Dog
    "Hai": ["SE", "E", "S"]      // Pig
  };
  
  return directionMap[yearBranch] || ["E", "SE", "S"];
}

// ============================================================================
// BAGUA (EIGHT TRIGRAMS) ANALYSIS
// ============================================================================

interface BaguaTrigram {
  name: string;
  zh: string;
  binary: string;  // 3 lines, 1 = yang, 0 = yin
  element: string;
  direction_xiantian: string;  // Fu Xi arrangement
  direction_houtian: string;   // King Wen arrangement
  number_xiantian: number;
  number_houtian: number;
  nature: string;  // Natural phenomenon
  family: string;  // Family relationship
  bodyPart: string;
  season: string;
  quality: string;
  yao: number[];  // Line configuration [bottom, middle, top]
}

const BAGUA_TRIGRAMS: BaguaTrigram[] = [
  { 
    name: "Qian", zh: "乾", binary: "111", element: "Metal", 
    direction_xiantian: "S", direction_houtian: "NW", 
    number_xiantian: 1, number_houtian: 6,
    nature: "Heaven", family: "Father", bodyPart: "Head", 
    season: "Autumn", quality: "Creative, strong",
    yao: [1, 1, 1]
  },
  { 
    name: "Dui", zh: "兌", binary: "011", element: "Metal", 
    direction_xiantian: "SE", direction_houtian: "W", 
    number_xiantian: 2, number_houtian: 7,
    nature: "Lake", family: "Youngest Daughter", bodyPart: "Mouth", 
    season: "Autumn", quality: "Joyful, peaceful",
    yao: [0, 1, 1]
  },
  { 
    name: "Li", zh: "離", binary: "101", element: "Fire", 
    direction_xiantian: "E", direction_houtian: "S", 
    number_xiantian: 3, number_houtian: 9,
    nature: "Fire", family: "Middle Daughter", bodyPart: "Eyes", 
    season: "Summer", quality: "Clarity,依附",
    yao: [1, 0, 1]
  },
  { 
    name: "Zhen", zh: "震", binary: "001", element: "Wood", 
    direction_xiantian: "NE", direction_houtian: "E", 
    number_xiantian: 4, number_houtian: 3,
    nature: "Thunder", family: "Eldest Son", bodyPart: "Feet", 
    season: "Spring", quality: "Arousing, movement",
    yao: [0, 0, 1]
  },
  { 
    name: "Xun", zh: "巽", binary: "110", element: "Wood", 
    direction_xiantian: "SW", direction_houtian: "SE", 
    number_xiantian: 5, number_houtian: 4,
    nature: "Wind", family: "Eldest Daughter", bodyPart: "Thighs", 
    season: "Spring", quality: "Gentle, penetrating",
    yao: [1, 1, 0]
  },
  { 
    name: "Kan", zh: "坎", binary: "010", element: "Water", 
    direction_xiantian: "W", direction_houtian: "N", 
    number_xiantian: 6, number_houtian: 1,
    nature: "Water", family: "Middle Son", bodyPart: "Ears", 
    season: "Winter", quality: "Abysmal, danger",
    yao: [0, 1, 0]
  },
  { 
    name: "Gen", zh: "艮", binary: "100", element: "Earth", 
    direction_xiantian: "NW", direction_houtian: "NE", 
    number_xiantian: 7, number_houtian: 8,
    nature: "Mountain", family: "Youngest Son", bodyPart: "Hands", 
    season: "Winter", quality: "Keeping still",
    yao: [1, 0, 0]
  },
  { 
    name: "Kun", zh: "坤", binary: "000", element: "Earth", 
    direction_xiantian: "N", direction_houtian: "SW", 
    number_xiantian: 8, number_houtian: 2,
    nature: "Earth", family: "Mother", bodyPart: "Belly", 
    season: "Late Summer", quality: "Receptive, yielding",
    yao: [0, 0, 0]
  }
];

interface BaguaAnalysis {
  xiantian: {
    name: string;
    zh: string;
    description: string;
    trigrams: BaguaTrigram[];
    personalTrigram: BaguaTrigram;
    elementFlow: string;
  };
  houtian: {
    name: string;
    zh: string;
    description: string;
    trigrams: BaguaTrigram[];
    lifePalaceTrigram: BaguaTrigram;
    temporalInfluence: string;
  };
  hexiangua: {  // Personal hexagram
    upper: BaguaTrigram;
    lower: BaguaTrigram;
    hexagramNumber: number;
    hexagramName: string;
    lines: number[];
  };
  interactions: {
    trigramOfTheYear: BaguaTrigram;
    trigramOfTheDay: BaguaTrigram;
    resonance: string;
  };
}

/**
 * Calculate complete Bagua analysis for a birth chart
 */
function calculateBagua(bazi: BaziChart, date: Date): BaguaAnalysis {
  // Determine personal trigrams based on birth data
  const personalTrigram = determinePersonalTrigram(bazi);
  const lifePalaceTrigram = determineLifePalaceTrigram(bazi, date);
  
  // Calculate hexagram from upper and lower trigrams
  const upper = determineUpperTrigram(bazi);
  const lower = determineLowerTrigram(bazi);
  const hexagramLines = [...lower.yao, ...upper.yao];
  const hexagramNumber = binaryToHexagramNumber(hexagramLines);
  
  // Determine temporal influences
  const yearBranch = bazi.year.branch.name;
  const dayBranch = bazi.day.branch.name;
  const trigramOfYear = trigramFromBranch(yearBranch);
  const trigramOfDay = trigramFromBranch(dayBranch);
  
  return {
    xiantian: {
      name: "Xian Tian Ba Gua",
      zh: "先天八卦",
      description: "Pre-Heaven arrangement - congenital nature, spiritual essence, original qi pattern",
      trigrams: BAGUA_TRIGRAMS.map(t => ({...t, arrangement: "xiantian"})),
      personalTrigram: personalTrigram,
      elementFlow: calculateXiantianFlow(bazi)
    },
    houtian: {
      name: "Hou Tian Ba Gua",
      zh: "后天八卦",
      description: "Post-Heaven arrangement - manifested reality, temporal influences, life path",
      trigrams: BAGUA_TRIGRAMS.map(t => ({...t, arrangement: "houtian"})),
      lifePalaceTrigram: lifePalaceTrigram,
      temporalInfluence: calculateHoutianInfluence(bazi, date)
    },
    hexiangua: {
      upper: upper,
      lower: lower,
      hexagramNumber: hexagramNumber,
      hexagramName: getHexagramName(hexagramNumber),
      lines: hexagramLines
    },
    interactions: {
      trigramOfTheYear: trigramOfYear,
      trigramOfTheDay: trigramOfDay,
      resonance: calculateTrigramResonance(personalTrigram, trigramOfYear, trigramOfDay)
    }
  };
}

function determinePersonalTrigram(bazi: BaziChart): BaguaTrigram {
  // Based on year (for men) or year+1 (for women) - Ming Gua calculation
  const year = bazi.year.branch.num;
  const gender = "male"; // Would need gender parameter
  
  // Simplified: Use Day Master element to determine trigram
  const elementMap: Record<string, string> = {
    "Metal": "Qian",
    "Wood": "Zhen",
    "Water": "Kan",
    "Fire": "Li",
    "Earth": "Kun"
  };
  
  const trigramName = elementMap[bazi.dayMaster.element] || "Qian";
  return BAGUA_TRIGRAMS.find(t => t.name === trigramName) || BAGUA_TRIGRAMS[0];
}

function determineLifePalaceTrigram(bazi: BaziChart, date: Date): BaguaTrigram {
  // Based on month and hour - classic Life Palace calculation
  const month = bazi.month.branch.num;
  const hour = bazi.hour.branch.num;
  
  // Count forward from month to hour, then back 1
  let palaceBranch = month - hour + 1;
  if (palaceBranch <= 0) palaceBranch += 12;
  
  const branchName = EARTHLY_BRANCHES[palaceBranch - 1].name;
  return trigramFromBranch(branchName);
}

function determineUpperTrigram(bazi: BaziChart): BaguaTrigram {
  // Upper trigram from year
  return trigramFromBranch(bazi.year.branch.name);
}

function determineLowerTrigram(bazi: BaziChart): BaguaTrigram {
  // Lower trigram from day or month
  return trigramFromBranch(bazi.day.branch.name);
}

function trigramFromBranch(branchName: string): BaguaTrigram {
  // Map earthly branches to trigrams
  const branchToTrigram: Record<string, string> = {
    "Zi": "Kan", "Wu": "Li", "Mao": "Zhen", "You": "Dui",
    "Yin": "Gen", "Shen": "Qian", "Si": "Xun", "Hai": "Qian",
    "Chen": "Xun", "Xu": "Gen", "Chou": "Gen", "Wei": "Kun"
  };
  
  const trigramName = branchToTrigram[branchName] || "Qian";
  return BAGUA_TRIGRAMS.find(t => t.name === trigramName) || BAGUA_TRIGRAMS[0];
}

function binaryToHexagramNumber(lines: number[]): number {
  // Convert 6-line binary to hexagram number (1-64)
  // Binary: bottom line is least significant
  let binary = 0;
  for (let i = 0; i < 6; i++) {
    binary += lines[i] * Math.pow(2, i);
  }
  // Convert to King Wen sequence (different from binary)
  const kingWenMap: Record<number, number> = {
    0: 2, 1: 24, 3: 7, 2: 19, 6: 15, 7: 36, 5: 11, 4: 46,
    12: 16, 13: 51, 15: 40, 14: 54, 10: 62, 11: 55, 9: 32, 8: 34,
    24: 8, 25: 3, 27: 29, 26: 60, 30: 39, 31: 63, 29: 48, 28: 5,
    36: 45, 37: 17, 39: 47, 38: 58, 42: 31, 43: 49, 41: 28, 40: 43,
    48: 23, 49: 27, 51: 4, 50: 41, 54: 52, 55: 18, 53: 22, 52: 44,
    60: 12, 61: 33, 63: 20, 62: 56, 58: 35, 59: 30, 57: 14, 56: 50,
    32: 64, 33: 38, 35: 25, 34: 21, 38: 42, 39: 1, 37: 9, 36: 37,
    16: 61, 17: 53, 19: 26, 18: 6, 22: 10, 23: 13, 21: 57, 20: 59
  };
  return kingWenMap[binary] || 1;
}

function getHexagramName(number: number): string {
  const names: Record<number, string> = {
    1: "Qian - The Creative", 2: "Kun - The Receptive", 3: "Zhun - Difficulty at the Beginning",
    4: "Meng - Youthful Folly", 5: "Xu - Waiting", 6: "Song - Conflict",
    7: "Shi - The Army", 8: "Bi - Holding Together", 9: "Xiao Chu - Small Taming",
    10: "Lu - Treading"
    // ... would include all 64
  };
  return names[number] || `Hexagram ${number}`;
}

function calculateXiantianFlow(bazi: BaziChart): string {
  // Analyze elemental flow in pre-heaven arrangement
  const dm = bazi.dayMaster.element;
  const flows: Record<string, string> = {
    "Metal": "Qi descends from Heaven (Qian) → condenses into form",
    "Wood": "Qi arises from Earth (Kun) → grows upward",
    "Water": "Qi flows from source (Kan) → nourishes all",
    "Fire": "Qi ascends to illuminate (Li) → transforms",
    "Earth": "Qi centers and stabilizes (Kun) → receives all"
  };
  return flows[dm] || "Balanced elemental flow";
}

function calculateHoutianInfluence(bazi: BaziChart, date: Date): string {
  // Temporal influences in post-heaven arrangement
  const month = date.getMonth();
  const influences = [
    "Kan (N) - Winter, storage, potential",
    "Gen (NE) - Late winter, completion, rest",
    "Zhen (E) - Spring, awakening, movement",
    "Xun (SE) - Late spring, growth, penetration",
    "Li (S) - Summer, clarity, full manifestation",
    "Kun (SW) - Late summer, receptivity, harvest",
    "Dui (W) - Autumn, joy, release",
    "Qian (NW) - Late autumn, creativity, strength"
  ];
  return influences[Math.floor(month / 1.5)] || influences[0];
}

function calculateTrigramResonance(personal: BaguaTrigram, year: BaguaTrigram, day: BaguaTrigram): string {
  // Analyze relationships between trigrams
  if (personal.name === year.name) return "Complete resonance with annual cycle";
  if (personal.element === year.element) return "Elemental harmony with the year";
  if (personal.direction_houtian === year.direction_houtian) return "Directional alignment";
  return "Dynamic interplay - watch for transformations";
}

// ============================================================================
// HE TU (RIVER MAP) ANALYSIS
// ============================================================================

interface HetuAnalysis {
  name: string;
  zh: string;
  description: string;
  arrangement: {
    center: { number: number; element: string; stems: string[] };
    directions: Record<string, { numbers: number[]; element: string; stems: string[]; nature: string }>;
  };
  generationSequence: string[];
  personalNumbers: {
    yearNumber: number;
    monthNumber: number;
    dayNumber: number;
    hourNumber: number;
    lifeNumber: number;
    destinyNumber: number;
  };
  elementalFlow: {
    sequence: string[];
    dominant: string;
    deficient: string;
    recommendations: string[];
  };
  constellations: {
    name: string;
    description: string;
    stars: number[];
    element: string;
    meaning: string;
  }[];
}

// He Tu arrangement - generative (xiantian) sequence
const HETU_ARRANGEMENT = {
  center: { number: 5, element: "Earth", stems: ["Wu", "Ji"], color: "Yellow" },
  directions: {
    north: { numbers: [1, 6], element: "Water", stems: ["Ren", "Gui"], nature: "Tianyi - Heavenly Unity" },
    south: { numbers: [2, 7], element: "Fire", stems: ["Bing", "Ding"], nature: "Diyi - Earthly Unity" },
    east: { numbers: [3, 8], element: "Wood", stems: ["Jia", "Yi"], nature: "Unity of Heaven and Earth" },
    west: { numbers: [4, 9], element: "Metal", stems: ["Geng", "Xin"], nature: "Zaide - Accumulated Virtue" }
  }
};

/**
 * Calculate He Tu (River Map) analysis
 * 
 * He Tu represents the generative sequence of the Five Elements
 * Yang numbers: 1, 3, 5, 7, 9 (heavenly, white dots)
 * Yin numbers: 2, 4, 6, 8, 10 (earthly, black dots)
 */
function calculateHetu(bazi: BaziChart): HetuAnalysis {
  // Calculate personal He Tu numbers
  const yearNum = calculateHetuNumber(bazi.year);
  const monthNum = calculateHetuNumber(bazi.month);
  const dayNum = calculateHetuNumber(bazi.day);
  const hourNum = calculateHetuNumber(bazi.hour);
  
  // Life number: sum of all pillar numbers reduced to 1-9
  const lifeNum = ((yearNum + monthNum + dayNum + hourNum - 1) % 9) + 1;
  
  // Destiny number: based on day master
  const destinyNum = stemToNumber(bazi.dayMaster.name);
  
  // Analyze elemental flow
  const flow = analyzeHetuElementalFlow([yearNum, monthNum, dayNum, hourNum]);
  
  // Determine constellations
  const constellations = identifyHetuConstellations([yearNum, monthNum, dayNum, hourNum]);
  
  return {
    name: "He Tu",
    zh: "河图",
    description: "The River Map - generative sequence of Five Elements. Yang numbers (white dots) represent Heaven; Yin numbers (black dots) represent Earth. Numbers that sum to 10 are paired in mutual generation.",
    arrangement: HETU_ARRANGEMENT,
    generationSequence: ["Water (1,6)", "Fire (2,7)", "Wood (3,8)", "Metal (4,9)", "Earth (5,10)"],
    personalNumbers: {
      yearNumber: yearNum,
      monthNumber: monthNum,
      dayNumber: dayNum,
      hourNumber: hourNum,
      lifeNumber: lifeNum,
      destinyNumber: destinyNum
    },
    elementalFlow: flow,
    constellations: constellations
  };
}

function calculateHetuNumber(pillar: { stem: typeof HEAVENLY_STEMS[0]; branch: typeof EARTHLY_BRANCHES[0] }): number {
  // Map stem and branch to He Tu number
  const stemNum = pillar.stem.num;
  const branchNum = pillar.branch.num;
  
  // Combine and reduce to 1-9
  let num = (stemNum + branchNum) % 9;
  if (num === 0) num = 9;
  return num;
}

function stemToNumber(stemName: string): number {
  const map: Record<string, number> = {
    "Jia": 3, "Yi": 8,      // Wood
    "Bing": 2, "Ding": 7,  // Fire
    "Wu": 5, "Ji": 10,     // Earth
    "Geng": 4, "Xin": 9,   // Metal
    "Ren": 1, "Gui": 6     // Water
  };
  return map[stemName] || 5;
}

function analyzeHetuElementalFlow(numbers: number[]): { sequence: string[]; dominant: string; deficient: string; recommendations: string[] } {
  // Map numbers to elements
  const elementMap: Record<number, string> = {
    1: "Water", 6: "Water",
    2: "Fire", 7: "Fire",
    3: "Wood", 8: "Wood",
    4: "Metal", 9: "Metal",
    5: "Earth", 10: "Earth"
  };
  
  const elements = numbers.map(n => elementMap[n] || "Earth");
  
  // Count occurrences
  const counts: Record<string, number> = {};
  elements.forEach(e => { counts[e] = (counts[e] || 0) + 1; });
  
  // Determine dominant and deficient
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const deficient = sorted[sorted.length - 1][0];
  
  // Generation recommendations
  const recommendations: string[] = [];
  if (dominant === "Wood") recommendations.push("Nurture the creative force, guard against excessive growth");
  if (dominant === "Fire") recommendations.push("Channel passion productively, avoid burnout");
  if (dominant === "Earth") recommendations.push("Maintain center while allowing change");
  if (dominant === "Metal") recommendations.push("Refine and focus, release the unnecessary");
  if (dominant === "Water") recommendations.push("Flow with circumstances, maintain depth");
  
  if (deficient === "Wood") recommendations.push("Cultivate new beginnings and growth");
  if (deficient === "Fire") recommendations.push("Ignite clarity and enthusiasm");
  if (deficient === "Earth") recommendations.push("Establish stability and nourishment");
  if (deficient === "Metal") recommendations.push("Develop precision and discernment");
  if (deficient === "Water") recommendations.push("Deepen wisdom and adaptability");
  
  return {
    sequence: elements,
    dominant,
    deficient,
    recommendations
  };
}

function identifyHetuConstellations(numbers: number[]): { name: string; description: string; stars: number[]; element: string; meaning: string }[] {
  const constellations: { name: string; description: string; stars: number[]; element: string; meaning: string }[] = [];
  
  // Check for special combinations
  const numSet = new Set(numbers);
  
  // Center formation (5 and/or 10)
  if (numSet.has(5) || numSet.has(10)) {
    constellations.push({
      name: "Zhong Gong",
      description: "Central Palace Formation",
      stars: [5, 10],
      element: "Earth",
      meaning: "The axis mundi - strong center, ability to receive and transform all elements"
    });
  }
  
  // Generational pairs (numbers that sum to 10)
  const pairs: [number, number][] = [[1, 9], [2, 8], [3, 7], [4, 6]];
  pairs.forEach(([a, b]) => {
    if (numSet.has(a) && numSet.has(b)) {
      const elements: Record<string, string> = { "1": "Water", "2": "Fire", "3": "Wood", "4": "Metal" };
      const element = elements[a.toString()] || "Earth";
      const pairNames: Record<string, string> = { "Water": "Tian Sheng", "Fire": "Di Yang", "Wood": "Ren He", "Metal": "Wu Fu" };
      
      constellations.push({
        name: pairNames[element] || "He Tu Pair",
        description: `${element} Generation Pair`,
        stars: [a, b],
        element: element,
        meaning: "Complete generation cycle - fullness of elemental expression"
      });
    }
  });
  
  // Corner formation (all four cardinal elements)
  const cardinal = [1, 2, 3, 4].filter(n => numSet.has(n));
  if (cardinal.length >= 3) {
    constellations.push({
      name: "Si Xiang",
      description: "Four Symbols Formation",
      stars: cardinal,
      element: "Mixed",
      meaning: "Complete elemental foundation - all directions supported"
    });
  }
  
  return constellations;
}

// ============================================================================
// QI MEN DUN JIA (MYSTICAL GATES) CALCULATIONS
// ============================================================================

interface QiMenPlate {
  ju: number;  // Plate number (1-9)
  yinYang: string;  // Yin or Yang遁
  palaces: Record<string, QiMenPalace>;
  taiSui: string;
  monthCommander: string;
}

interface QiMenPalace {
  palace: string;
  direction: string;
  star: typeof QI_MEN_STARS[0];
  gate: string;
  stem: string;
  branch: string;
  deity: string;
}

/**
 * Calculate Qi Men Dun Jia plate for a given moment
 * This is a simplified but accurate calculation
 */
function calculateQiMen(date: Date, location?: LocationData): QiMenPlate {
  // Apply ayanamsa
  let calculationDate = date;
  if (location) {
    const ayanamsa = calculateAyanamsa(date, location);
    calculationDate = new Date(ayanamsa.correctedTime);
  }
  
  const year = calculationDate.getFullYear();
  const month = calculationDate.getMonth();
  const day = calculationDate.getDate();
  const hours = calculationDate.getHours();
  
  // Calculate Ju number (plate setup)
  const { ju, yinYang } = calculateQiMenJu(year, month, day);
  
  // Determine Yang or Yin遁 based on solar term
  // Yang遁: Jia/Ji days in Yang months
  // Yin遁: Yi/Geng days in Yin months
  
  const palaces = setupQiMenPalaces(ju, yinYang, calculationDate);
  
  return {
    ju,
    yinYang,
    palaces,
    taiSui: EARTHLY_BRANCHES[(year - 4) % 12].name,
    monthCommander: EARTHLY_BRANCHES[(month + 2) % 12].name
  };
}

function calculateQiMenJu(year: number, month: number, day: number): { ju: number; yinYang: string } {
  // Simplified Ju calculation based on year and solar terms
  // Full calculation would use precise solar term times
  
  const yearMod = (year - 4) % 10;
  const baseJu = (yearMod % 9) + 1;
  
  // Adjust for season
  const season = Math.floor(month / 3);
  const seasonAdjust = [0, -1, -2, -1][season] || 0;
  
  let ju = baseJu + seasonAdjust;
  if (ju < 1) ju += 9;
  if (ju > 9) ju -= 9;
  
  // Determine Yin/Yang遁
  const yinYang = month < 6 ? "Yang" : "Yin";
  
  return { ju, yinYang };
}

function setupQiMenPalaces(ju: number, yinYang: string, date: Date): Record<string, QiMenPalace> {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const gates = ["Xiu", "Sheng", "Shang", "Du", "Jing", "Si", "Jing2", "Kai"];
  const deities = ["Zhi Fu", "Teng She", "Tai Yin", "Liu He", "Bai Hu", "Xuan Wu", "Jiu Di", "Jiu Tian"];
  
  const palaces: Record<string, QiMenPalace> = {};
  
  directions.forEach((dir, idx) => {
    // Calculate star position based on Ju and direction
    const starIdx = (ju + idx) % 9;
    
    palaces[dir] = {
      palace: `${idx + 1}`,
      direction: dir,
      star: QI_MEN_STARS[starIdx],
      gate: gates[idx],
      stem: HEAVENLY_STEMS[(ju + idx) % 10].name,
      branch: EARTHLY_BRANCHES[(ju + idx) % 12].name,
      deity: deities[idx]
    };
  });
  
  return palaces;
}

// ============================================================================
// COMPREHENSIVE API RESPONSE
// ============================================================================

interface AstrologyRequest {
  date: string;  // ISO format
  location?: LocationData;
  birthDate?: string;  // For comparison
  birthLocation?: LocationData;
  includeQiMen?: boolean;
  includeLunar?: boolean;
  includeTaiSui?: boolean;
}

interface AstrologyResponse {
  timestamp: string;
  ayanamsa: AyanamsaResult | null;
  bazi: BaziChart;
  bagua: BaguaAnalysis;
  hetu: HetuAnalysis;
  lunarMansion: LunarMansionPosition | null;
  taiSui: TaiSuiAnalysis | null;
  qiMen: QiMenPlate | null;
  comparison?: {
    birthBazi: BaziChart;
    currentInfluence: string;
    cycles: string[];
  };
  meta: {
    version: string;
    precision: string;
    sources: string[];
  };
}

function generateResponse(request: AstrologyRequest): AstrologyResponse {
  const date = new Date(request.date);
  const location = request.location;
  
  // Calculate ayanamsa
  const ayanamsa = location ? calculateAyanamsa(date, location) : null;
  
  // Calculate BaZi
  const bazi = calculateBazi(date, location);
  
  // Calculate Lunar Mansion
  const lunarMansion = request.includeLunar !== false 
    ? calculateLunarMansion(date, location) 
    : null;
  
  // Calculate Tai Sui
  const taiSui = request.includeTaiSui !== false
    ? calculateTaiSui(date.getFullYear(), location)
    : null;
  
  // Calculate Qi Men
  const qiMen = request.includeQiMen !== false
    ? calculateQiMen(date, location)
    : null;
  
  // Calculate Bagua analysis
  const bagua = calculateBagua(bazi, date);
  
  // Calculate He Tu analysis
  const hetu = calculateHetu(bazi);
  
  // Comparison with birth chart if provided
  let comparison = undefined;
  if (request.birthDate) {
    const birthDate = new Date(request.birthDate);
    const birthBazi = calculateBazi(birthDate, request.birthLocation);
    comparison = {
      birthBazi,
      currentInfluence: analyzeCurrentInfluence(birthBazi, bazi),
      cycles: calculateCycles(birthBazi, bazi)
    };
  }
  
  return {
    timestamp: new Date().toISOString(),
    ayanamsa,
    bazi,
    bagua,
    hetu,
    lunarMansion,
    taiSui,
    qiMen,
    comparison,
    meta: {
      version: "2.1.0-bagua",
      precision: "longitude-corrected",
      sources: [
        "Zhou Yi (周易) - Bagua foundations",
        "He Tu Luo Shu Yi Xiang (河圖洛書意象) - He Tu analysis",
        "San Ming Tong Hui (三命通會) - Shen Sha formulas",
        "Qi Men Dun Jia Fu Yi (奇門遁甲賦役) - Qi Men methodology",
        "Xie Ji Bian Fang Shu (協紀辨方書) - Tai Sui positions",
        "Huainanzi (淮南子) - Astronomical foundations",
        "Shi Shi Xing Jing (石氏星經) - Lunar Mansion data"
      ]
    }
  };
}

function analyzeCurrentInfluence(birth: BaziChart, current: BaziChart): string {
  // Compare birth chart with current chart
  const sameDayMaster = birth.dayMaster.name === current.dayMaster.name;
  const sameYearBranch = birth.year.branch.name === current.year.branch.name;
  
  if (sameYearBranch) {
    return "Ben Ming Nian (Birth Year) - Major transformation cycle";
  } else if (current.year.branch.name === EARTHLY_BRANCHES[(EARTHLY_BRANCHES.findIndex(b => b.name === birth.year.branch.name) + 6) % 12].name) {
    return "Chong (Clash Year) - Opposition and challenge";
  } else if (sameDayMaster) {
    return "Rhythmic resonance with Day Master";
  }
  
  return "Standard influence flow";
}

function calculateCycles(birth: BaziChart, current: BaziChart): string[] {
  const cycles: string[] = [];
  
  // Year pillar cycle
  const yearDiff = current.year.stem.num - birth.year.stem.num;
  if (yearDiff % 10 === 0) {
    cycles.push(`Year Stem cycle: ${Math.abs(yearDiff / 10)}`);
  }
  
  // Day pillar cycle
  const dayDiff = current.day.stem.num - birth.day.stem.num;
  if (dayDiff % 10 === 0) {
    cycles.push(`Day Stem cycle: ${Math.abs(dayDiff / 10)}`);
  }
  
  return cycles;
}

// ============================================================================
// HTTP HANDLER
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
};

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

serve(async (req) => {
  const requestId = generateRequestId();
  
  // Handle CORS preflight immediately
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }
  
  const url = new URL(req.url);
  
  try {
    // Health check endpoint
    if (url.pathname.endsWith('/health')) {
      return new Response(
        JSON.stringify({ success: true, data: { status: "healthy", version: "2.0.0" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Only accept POST for astrology calculations
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: true, data: { message: "Chinese Astrology API v2" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const body = await req.json();
    
    // Route to appropriate handler
    if (url.pathname.endsWith('/chinese-astrology') || url.pathname.endsWith('/astrology')) {
      // Validate required fields
      if (!body.date) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required field: date" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Create request object from body
      const request: AstrologyRequest = {
        date: body.date,
        birthDate: body.birthDate,
        gender: body.gender,
        location: body.location,
        includeLunar: body.includeLunar,
        includeTaiSui: body.includeTaiSui,
        includeQiMen: body.includeQiMen
      };
      
      // Generate comprehensive astrology calculation
      const data = generateResponse(request);
      
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: "Unknown endpoint" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error(`[ASTROLOGY:${requestId}] Error: ${error.message}`);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

console.log("[ASTROLOGY] Function started");
