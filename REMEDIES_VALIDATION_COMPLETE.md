# Remedies Validation System - Complete

## Problem (Fixed)
AI was hallucinating remedies - generating fake remedies not in the database, leading to:
- Inconsistent selections
- Non-existent remedy IDs
- Generic/irrelevant recommendations

## Solution Implemented

### Backend (handleRemediesTab)

**1. Database Scoring Algorithm**
```typescript
const getScoredCandidates = (typePool: FuluEntry[]) => {
  return typePool.map(entry => {
    let score = 0;
    if (entry.hexagrams?.includes(hexagram.number)) score += 15;
    if (entry.trigram_associations?.includes(upperTrigram)) score += 7;
    if (entry.trigram_associations?.includes(lowerTrigram)) score += 7;
    // Keyword matching, verified boost, element matching...
    return { entry, score };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);
};
```

**2. Constrained AI Selection**
- AI receives ONLY top 10 scored remedies from database
- Can ONLY return existing IDs
- Validates selected IDs against database
- Falls back to top-scored if AI fails

**3. Database Enrichment**
```typescript
const entry = database.find(e => e.id === sel.id);
if (entry) {
  selectedRemedies.push({
    type: entry.remedyType,      // From DB
    id: entry.id,                // From DB
    name: entry.name,            // From DB
    description: entry.description?.[lang] || entry.description?.en,  // From DB
    instructions: entry.structure?.instructions || entry.instructions, // From DB
    relevance: sel.relevance || getRelevance(entry, lang, equilibrium) // AI or fallback
  });
}
```

### Frontend (renderRemediesTabbed)

**Normalizes remedy structure:**
```javascript
// Flat structure → Lang-keyed structure
if (remedies && remedies.remedies && !remedies.en) {
    remedies = { [lang]: { remedies: remedies.remedies } };
}
```

**Falls back to English if translation missing:**
```javascript
const displayLang = (remedies && remedies[lang] && remedies[lang].remedies?.length > 0) 
    ? lang 
    : 'en';
```

**Async translation for non-English:**
```javascript
const translateRemedyContent = async (remedy, lang) => {
    const fieldsToTranslate = ['relevance', 'description', 'instructions'];
    // Translates each field if needed
};
```

## Data Flow

```
1. User asks question in Spanish
   ↓
2. Backend scores ALL database remedies
   - Hexagram match (+15)
   - Trigram match (+7 each)
   - Keywords (+6)
   - Verified (+4)
   - Element match (+5)
   ↓
3. Top 10 scored remedies → AI
   ↓
4. AI selects 1 Fulu + 1 Environmental
   (constrained to catalog IDs only)
   ↓
5. Backend validates IDs against database
   ↓
6. Response uses DB content (name, desc, instructions)
   + AI relevance (or DB fallback)
   ↓
7. Frontend renders with translation if needed
```

## Anti-Hallucination Safeguards

| Layer | Protection |
|-------|------------|
| Scoring | Only existing DB entries get scored |
| Catalog | AI sees only top 10, not full DB |
| Validation | Selected IDs checked against DB |
| Enrichment | Response uses DB fields, not AI generation |
| Fallback | Top-scored used if AI fails |

## Response Format (Database-Validated)

```json
{
  "remedies": [
    {
      "type": "fulu",
      "id": "prosperity_fulu_01",
      "name": { "zh": "財富符", "en": "Prosperity Talisman" },
      "relevance": "AI-generated or DB fallback relevance text",
      "description": "From database (localized)",
      "instructions": "From database (localized)",
      "source": "Daoist tradition"
    },
    {
      "type": "fengshui",
      "id": "water_feature_north",
      "name": { "zh": "北方水景", "en": "North Water Feature" },
      "relevance": "...",
      "description": "...",
      "instructions": "..."
    }
  ]
}
```

## Testing Verification

- [x] Remedies selected from scored catalog
- [x] AI constrained to existing IDs only
- [x] Invalid IDs rejected during validation
- [x] Database content used for name/description/instructions
- [x] Fallback to top-scored if AI fails
- [x] 1 Fulu + 1 Environmental balance maintained
- [x] Element conflicts avoided (Day Master check)
- [x] Frontend handles missing translations gracefully
