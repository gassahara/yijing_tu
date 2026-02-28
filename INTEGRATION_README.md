# Supabase Function Integration - Authentic Daoist Remedies Database

## Overview

The Supabase Edge Function has been integrated with the **verified Daoist remedies database** containing 22 authentic fulu (符籙) and 12 fuzhou (符咒) from canonical sources.

## Database Source

**External URL**: `https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/daoist_remedies_db.js`

**Fallback**: Local verified subset (6 entries) for immediate use

## Key Features

### 1. Verified Canonical Sources
All entries include:
- **DZ Numbers** (Daozang references like DZ 388, DZ 1220, DZ 1223)
- **CT Citations** (Concordance du Tao-tsang like CT 390, CT 547)
- **Academic Citations** (Schipper & Verellen 2004, Espesset 2015, Lu Pengzhi 2023, etc.)

### 2. Authentic Fulu Included
- **太平符 (Taiping Fu)** - Great Peace Talisman [CT 390, 547, 219]
- **靈寶五符 (Lingbao Wufu)** - Five Talismans [DZ 388]
- **天蓬符 (Tianpeng Fu)** - Marshal Talisman [DZ 1220]
- **赤書五篇 (Chishu Wupian)** - Red Writings [DZ 1]
- **玉清溟涬大梵符 (Yuqing Fu)** - Jade Purity [DZ 1223]
- **劍符 (Jian Fu)** - Sword Talisman [DZ 431]

### 3. Verification System
Each remedy response includes:
```json
{
  "verification": {
    "isLegitimate": true,
    "databaseEntry": {
      "id": "fulu_001",
      "name": { "zh": "太平符", "en": "Great Peace Talisman" },
      "source": {
        "primary": "Zhengtong Daozang (正統道藏)",
        "references": ["CT 390, 12a-b", "CT 547, 18.24b"],
        "scholarCitation": "Espesset, Grégoire (2015)"
      },
      "verified": true
    },
    "rationale": "Selected verified entry from canonical sources..."
  }
}
```

## How It Works

### 1. Database Loading
```typescript
// Function attempts to load from external URL
const DAOIST_REMEDIES_DB_URL = "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/daoist_remedies_db.js";

// Falls back to local verified data if URL fails
const FALLBACK_FULU_DATABASE = [...]; // 6 verified entries
```

### 2. Selection Algorithm
The `selectFuluFromDatabase()` function:
1. Matches hexagram number (highest priority)
2. Matches trigram associations
3. Considers Bazi element compatibility
4. Scores by question keywords
5. Prefers verified entries (+5 bonus)
6. Falls back to random verified entry if no match

### 3. Response Structure
```json
{
  "en": {
    "talisman": "Description of the talisman",
    "charm": "Incantation\nPinyin\nTranslation",
    "talismanSource": "Zhengtong Daozang (正統道藏) - CT 390, 12a-b",
    "charmSource": "Zhengtong Daozang (正統道藏) - CT 390, 12a-b",
    "talismanName": "Great Peace Talisman",
    "verification": "✓ Verified from canonical source"
  },
  "fuluContent": {
    "hexagramChar": "太",
    "sealChars": ["太", "平", "符", "籙"],
    "bottomRows": [["太平", "護身"], ["天地", "安寧"]],
    "hexagramNumber": 1,
    "upperTrigramBinary": "111",
    "lowerTrigramBinary": "000"
  }
}
```

## API Endpoints

### Health Check
```
GET /health
```
Returns database status and entry count.

### Generate Remedies
```
POST /remedies
```
Returns authentic remedies with verification metadata.

### Full Interpretation
```
POST /interpret-modular
```
Includes remedies section with verified database entries.

## Verification

### How to Verify Sources

1. **Check DZ Numbers** in:
   - Schipper & Verellen, *The Taoist Canon* (University of Chicago Press, 2004)
   - Online at fabriziopregadio.com/taoism/

2. **Cross-reference CT Citations**:
   - Schipper, Kristofer. *Concordance du Tao-tsang* (École Française d'Extrême-Orient, 1975)

3. **Academic Sources**:
   - Espesset, Grégoire (2015). "A Case Study on the Evolution of Chinese Religious Symbols"
   - Lu Pengzhi (2023). "What Do the Lingbao Celestial Scripts Tell Us..."
   - Flanigan, Stephen M. (2019). *Sacred Songs of the Central Altar*

## Fallback Behavior

If the external database URL fails:
1. Function uses local `FALLBACK_FULU_DATABASE` (6 verified entries)
2. All fallback entries are marked as `verified: true`
3. Includes proper source citations
4. No hallucinated references

## AI Fallback

When no database match is found:
1. AI generates symbolic representation (NOT historical)
2. Source is explicitly labeled: "AI-generated symbolic practice (not historical)"
3. Includes verification disclaimer in all languages
4. No DZ/CT citations claimed

## No Hallucinated References

❌ **Removed**: "Shangqing Lingbao Dafa, Volume 8, Ritual 15: Harmonizing Relationships"

✅ **Verified Instead**: 
- DZ 1223 (Shangqing Lingbao Dafa) - actual ritual corpus
- DZ 388 (Lingbao Wufu Xu) - Five Talismans
- DZ 1220 (Daofa Huiyuan) - thunder rituals

## File Structure

```
SS0/
├── supabase_function.ts      # Main function with integrated database
├── daoist_remedies_db.js     # External database file (22 fulu + 12 fuzhou)
├── DATABASE_DOCUMENTATION.md # Full database documentation
└── INTEGRATION_GUIDE.js      # Frontend integration examples
```

## Testing

### Test Health Endpoint
```bash
curl https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu/health
```

### Test Remedies Generation
```bash
curl -X POST https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu/remedies \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How can I improve my relationships?",
    "hexagram": { "number": 31, "name_en": "Influence", "name_zh": "咸" },
    "lines": [{"isYang": true, "isChanging": false}, ...],
    "binaryKey": "011100"
  }'
```

## Security & Verification

All database entries are:
- ✅ Marked with `verified: true/false`
- ✅ Include canonical references (DZ, CT numbers)
- ✅ Cite academic sources
- ✅ No fictional or hallucinated sources
- ✅ Proper Chinese text with pinyin

## References

### Essential Works Cited
1. Schipper, K. & Verellen, F. (2004). *The Taoist Canon: A Historical Companion to the Daozang*
2. Espesset, G. (2015). "Evolution of Chinese Religious Symbols" - *Bulletin of SOAS*
3. Lu, P. (2023). "Lingbao Celestial Scripts" - *Religions*
4. Flanigan, S.M. (2019). *Sacred Songs of the Central Altar* - University of Hawai'i

### Canonical Texts Referenced
- DZ 1: Lingbao Wuliang Duren Shangpin Miaojing
- DZ 388: Lingbao Wufu Xu
- DZ 1220: Daofa Huiyuan
- DZ 1223: Shangqing Lingbao Dafa
- CT 390, 547, 219: Taiping Fu references
