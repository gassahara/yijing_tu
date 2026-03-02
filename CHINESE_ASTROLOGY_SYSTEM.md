# Chinese Astrology System - Implementation Summary

## 🎯 Overview
A comprehensive Chinese astrology calculation system with precise longitude-based corrections (ayanamsa), including Bagua, He Tu, lunar mansions, and star horary systems.

## 📁 Files Created/Modified

### 1. API Endpoint
**File:** `supabase_functions/chinese-astrology.ts`

**Features:**
- **Ayanamsa Calculation** - Longitude-based time correction (歷差)
- **BaZi (Four Pillars)** - Complete chart with symbolic stars
- **Bagua (八卦) Analysis**
  - Xian Tian (Pre-Heaven/Fu Xi) arrangement
  - Hou Tian (Post-Heaven/King Wen) arrangement
  - Personal hexagram calculation
  - Trigram interactions and resonance
- **He Tu (河图) Analysis**
  - Generative sequence of Five Elements
  - Personal He Tu numbers
  - Elemental flow analysis
  - Constellation identification
- **28 Lunar Mansions** - Precise lunar position calculations
- **Tai Sui (太歲)** - Grand Duke analysis
- **Qi Men Dun Jia** - Real-time plate calculations

### 2. Client Module
**File:** `chinese-astrology-client.js`

**Functions:**
- `CHINESE_ASTROLOGY_API.calculate()` - Main API interface
- `ChineseAstrologyDisplay.render()` - Renders all components
- `GeoLocationHelper` - Gets user's position for ayanamsa
- Individual renderers for each system

### 3. Styles
**File:** `chinese-astrology.css`

**Sections:**
- Ayanamsa display
- BaZi chart with symbolic stars
- Bagua arrangements (Xian Tian & Hou Tian)
- He Tu diagram and numbers
- Lunar mansion display
- Tai Sui analysis
- Qi Men Dun Jia plate

### 4. Literature Database
**File:** `chinese_metaphysics_literature.js`

Contains 10+ ancient references including:
- Zhou Yi (周易) - Bagua foundations
- He Tu Luo Shu Yi Xiang (河圖洛書意象)
- San Ming Tong Hui (三命通會)
- Qi Men Dun Jia Fu Yi (奇門遁甲賦役)

### 5. Test Page
**File:** `test_chinese_astrology.html`

Interactive testing interface with:
- Location detection
- Date/time selection
- Birth chart comparison
- All systems toggle

## 🔮 Features Detail

### Ayanamsa (Longitude Correction)
```typescript
calculateAyanamsa(date: Date, location: LocationData): {
  originalTime: string;
  correctedTime: string;
  longitudeCorrection: number;
  timeDifference: string;
  equationOfTime: number;
}
```
For every 15° of longitude difference = 1 hour correction

### Bagua (八卦) Analysis

#### Xian Tian (先天) - Pre-Heaven
- Congenital nature, spiritual essence
- Personal trigram based on master of day
- Elemental flow pattern

#### Hou Tian (后天) - Post-Heaven  
- Manifested reality, life path
- Life Palace trigram calculation
- Temporal influences

#### Personal Hexagram
- Upper trigram (from year)
- Lower trigram (from day/month)
- King Wen sequence number
- Line configuration

### He Tu (河图) Analysis

#### The Five Directions
- Center: 5/10 - Earth
- North: 1/6 - Water (white/black)
- South: 2/7 - Fire (black/white)
- East: 3/8 - Wood (white/black)
- West: 4/9 - Metal (black/white)

#### Personal Numbers
- Year/Month/Day/Hour numbers
- Life Number (sum reduced to 1-9)
- Destiny Number (from master of day)

#### Elemental Flow Analysis
- Sequence through pillars
- Dominant element identification
- Deficient element warnings
- Cultivation recommendations

### Symbolic Stars (Shen Sha 神煞)
| Star | Chinese | Source |
|------|---------|--------|
| Noble Person | 天乙貴人 | Day Stem |
| Peach Blossom | 桃花 | Year Branch |
| Academic Star | 文昌 | Day Stem |
| Travelling Horse | 驛馬 | Year Branch |
| Goat Blade | 羊刃 | Day Stem |

## 🚀 Deployment

```bash
# Deploy the Supabase function
supabase functions deploy chinese-astrology

# Or copy to functions directory
cp supabase_functions/chinese-astrology.ts supabase/functions/
```

## 📊 API Usage

### Request
```json
{
  "date": "2026-02-26T12:00:00Z",
  "location": {
    "longitude": 121.47,
    "latitude": 31.23
  },
  "includeQiMen": true,
  "includeLunar": true,
  "includeTaiSui": true
}
```

### Response
```json
{
  "timestamp": "2026-02-26T12:00:00Z",
  "ayanamsa": { /* longitude correction */ },
  "bazi": { /* four pillars with shen sha */ },
  "bagua": { /* xiantian & houtian analysis */ },
  "hetu": { /* river map analysis */ },
  "lunarMansion": { /* 28 xiu position */ },
  "taiSui": { /* grand duke analysis */ },
  "qiMen": { /* mystical gates plate */ }
}
```

## 🎨 UI Integration

```javascript
// Display complete astrology
await displayChineseAstrology(container, {
    date: new Date().toISOString(),
    location: { longitude: 121.47, latitude: 31.23 },
    birthDate: '1990-01-01T00:00:00Z'
});

// Or use API directly
const data = await CHINESE_ASTROLOGY_API.calculate({
    date: new Date().toISOString(),
    location: { longitude, latitude }
});

ChineseAstrologyDisplay.render(data, container);
```

## 📖 Ancient Sources

### For Bagua & He Tu:
1. **Zhou Yi (周易)** - c. 1000 BCE - Source of all trigram wisdom
2. **Xici Zhuan (系辞传)** - Commentary on the Appended Phrases
3. **Shuo Gua (说卦)** - Discussion of the Trigrams
4. **He Tu Luo Shu Yi Xiang** - He Tu and Lo Shu imagery

### For BaZi & Shen Sha:
5. **San Ming Tong Hui (三命通会)** - Ming Dynasty
6. **Di Tian Sui (滴天髓)** - Song/Ming Dynasty
7. **Yuan Hai Zi Ping (渊海子平)** - Song Dynasty

### For Qi Men & Tai Sui:
8. **Qi Men Dun Jia Fu Yi** - Ming Dynasty
9. **Xie Ji Bian Fang Shu** - Qing Dynasty
10. **Huainanzi** - Han Dynasty

## 🔄 Version History

| Version | Changes |
|---------|---------|
| 2.1.0 | Added Bagua (Xian Tian & Hou Tian) and He Tu analysis |
| 2.0.0 | Initial release with ayanamsa, BaZi, lunar mansions, Tai Sui, Qi Men |

## 🧪 Testing

Open `test_chinese_astrology.html` in a browser to test:
1. Location detection for ayanamsa
2. Complete BaZi with symbolic stars
3. Bagua arrangements and personal hexagram
4. He Tu numbers and elemental flow
5. Lunar mansion position
6. Tai Sui analysis
7. Qi Men Dun Jia plate
8. Birth chart comparison

## 📝 Notes

- All calculations use the **120°E reference meridian** (China standard)
- Ayanamsa accounts for both longitude difference and equation of time
- Bagua analysis includes both Pre-Heaven (congenital) and Post-Heaven (manifested) perspectives
- He Tu analysis follows the generative sequence (Water→Fire→Wood→Metal→Earth)
- Qi Men uses simplified but accurate Ju (plate setup) calculations
