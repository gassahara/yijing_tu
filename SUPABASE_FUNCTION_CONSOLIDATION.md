# Supabase Function Consolidation Summary

## 📦 Files Consolidated

All Chinese astrology functionality has been merged into the main `supabase_function.ts` file.

### Source Files Merged:
1. `supabase_functions/chinese-astrology.ts` → Consolidated into `supabase_function.ts`

## 📊 Final Structure

### Main File: `supabase_function.ts` (9,350 lines)

#### Existing Content (Lines 1-7,758):
- Environment configuration
- Fulu/Fuzhou database interfaces
- Hexagram data structures
- All existing handlers:
  - `handlePostRequest()`
  - `handleGetRequest()`
  - `handleInterpret()` and variants
  - `handleRemedies*()` functions
  - `handleFDLGenerate()`
  - `handleExport*()` functions
- Xiantian interpretation
- Main `serve()` function

#### New Content (Lines 7,759-9,350):
- **Chinese Astrology Constants** (Lines 7,765-7,850)
  - 28 Lunar Mansions
  - 10 Heavenly Stems
  - 12 Earthly Branches
  - 8 Bagua Trigrams
  - He Tu arrangement
  - Shen Sha formulas
  - Qi Men stars

- **Ayanamsa Calculations** (Lines 7,850-7,950)
  - `calculateAyanamsa()` - Longitude-based time correction
  - `calculateEquationOfTime()` - Earth's orbital correction
  - Local mean time calculations

- **BaZi (Four Pillars)** (Lines 7,950-8,100)
  - `calculateBazi()` - Complete chart calculation
  - `calculateStrength()` - master of day strength analysis
  - `calculateShenSha()` - Symbolic stars

- **Bagua (八卦) Analysis** (Lines 8,100-8,400)
  - `calculateBagua()` - Complete Bagua analysis
  - `determinePersonalTrigram()` - Xian Tian trigram
  - `determineLifePalaceTrigram()` - Hou Tian trigram
  - `binaryToHexagramNumber()` - Hexagram calculation
  - Xian Tian (Pre-Heaven) arrangement
  - Hou Tian (Post-Heaven) arrangement
  - Personal hexagram generation

- **He Tu (河图) Analysis** (Lines 8,400-8,650)
  - `calculateHetu()` - River Map analysis
  - `calculateHetuNumber()` - Personal number calculation
  - `analyzeHetuElementalFlow()` - Five Elements flow
  - `identifyHetuConstellations()` - Star formations
  - Generative sequence analysis

- **Lunar Mansion (28 Xiu)** (Lines 8,650-8,800)
  - `calculateLunarMansion()` - Precise moon position
  - `calculateMoonLongitude()` - Astronomical calculation
  - Day/Hour ruler determination

- **Tai Sui (太歲)** (Lines 8,800-8,900)
  - `calculateTaiSui()` - Grand Duke analysis
  - `calculateFavorableDirections()` - Annual directions
  - San Sha (Three Killings) calculation

- **Qi Men Dun Jia** (Lines 8,900-9,000)
  - `calculateQiMen()` - Mystical gates plate
  - `calculateQiMenJu()` - Plate setup
  - `setupQiMenPalaces()` - Palace configuration

- **Response Generation** (Lines 9,000-9,150)
  - `generateResponse()` - Complete API response
  - `analyzeCurrentInfluence()` - Birth vs current
  - `calculateCycles()` - Cycle analysis

- **Handler Integration** (Lines 9,308-9,350)
  - `handleChineseAstrology()` - Main handler function

## 🔗 Integration Points

### 1. Switch Case Added (Line 5,043):
```typescript
case 'chinese-astrology':
  return await handleChineseAstrology(body, requestId, startTime);
```

### 2. API Version Updated:
- Previous: `v2.0`
- Current: `v2.1`

### 3. Endpoint Documentation Added:
```typescript
chineseAstrology: "POST /chinese-astrology - Complete Chinese astrology calculation (Bagua, He Tu, BaZi, Lunar Mansions, Tai Sui, Qi Men)"
```

### 4. New Features Documentation:
```typescript
chineseAstrology: "Complete BaZi/Bagua/HeTu/Lunar/TaiSui/QiMen calculations with ayanamsa correction"
```

## 📡 API Endpoint

### URL:
```
POST /functions/v1/yijingtu/chinese-astrology
```

### Request Body:
```json
{
  "date": "2026-02-26T12:00:00Z",
  "location": {
    "longitude": 121.47,
    "latitude": 31.23
  },
  "birthDate": "1990-01-01T00:00:00Z",
  "birthLocation": {
    "longitude": 116.40,
    "latitude": 39.90
  },
  "includeQiMen": true,
  "includeLunar": true,
  "includeTaiSui": true
}
```

### Response:
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-02-26T12:00:00Z",
    "ayanamsa": { /* longitude correction */ },
    "bazi": { /* four pillars */ },
    "bagua": { /* xiantian & houtian */ },
    "hetu": { /* river map */ },
    "lunarMansion": { /* 28 xiu */ },
    "taiSui": { /* grand duke */ },
    "qiMen": { /* mystical gates */ }
  },
  "meta": { /* request info */ }
}
```

## 🧪 Testing

Open `test_chinese_astrology.html` to test the consolidated API:
- Location detection for ayanamsa
- Complete BaZi with symbolic stars
- Bagua arrangements (Xian Tian & Hou Tian)
- He Tu numbers and elemental flow
- Lunar mansion position
- Tai Sui analysis
- Qi Men Dun Jia plate

## 📚 Client-Side Files

These files remain separate for browser usage:
- `chinese-astrology-client.js` - API client
- `chinese-astrology.css` - Display styles
- `chinese_metaphysics_literature.js` - Reference data
- `test_chinese_astrology.html` - Test interface

## 🚀 Deployment

```bash
# Deploy the consolidated function
supabase functions deploy yijingtu

# Or if using npx
npx supabase functions deploy yijingtu
```

## ✨ Features Included

### Ayanamsa (歷差)
- Longitude-based time correction
- Equation of time adjustment
- Local mean time calculation
- True solar time

### BaZi (八字)
- Four Pillars calculation
- master of day strength analysis
- Symbolic stars (Shen Sha):
  - Tian Yi Gui Ren (Noble Person)
  - Tao Hua (Peach Blossom)
  - Wen Chang (Academic Star)
  - Yi Ma (Travelling Horse)
  - Yang Ren (Goat Blade)

### Bagua (八卦)
- Xian Tian (Pre-Heaven) arrangement
- Hou Tian (Post-Heaven) arrangement
- Personal trigram calculation
- Life Palace trigram
- Personal hexagram (upper + lower)
- Trigram interactions and resonance

### He Tu (河图)
- Five directions analysis
- Personal He Tu numbers
- Elemental flow sequence
- Dominant/deficient elements
- Constellation identification

### 28 Lunar Mansions (二十八宿)
- Precise moon longitude
- Mansion position with degrees
- Daily and hourly rulers
- Ascending/descending status

### Tai Sui (太歲)
- Annual Grand Duke position
- Favorable/unfavorable directions
- San Sha (Three Killings)
- Sui Po (Year Breaker)

### Qi Men Dun Jia (奇門遁甲)
- 3x3 palace grid
- 9 Stars (Big Dipper + 2)
- 8 Gates
- 8 Deities
- Ju (plate setup) calculation
