# Remedies Selection Fix - Database Validation

## Problem: AI Hallucination
The `handleRemediesTab` endpoint was generating remedies entirely from AI without validating against the database. This caused:
- Inconsistent remedy selection
- Remedies that don't exist in the authenticated catalog
- Generic or inappropriate recommendations
- Different results between `remedies-tab` and `remedies-select` endpoints

## Solution: Database-Backed Selection

### Backend Changes (index.ts)

#### 1. Scoring Algorithm (Same as `handleRemediesSelect`)
```typescript
const getScoredCandidates = (typePool: FuluEntry[]) => {
  return typePool.map(entry => {
    let score = 0;
    // Hexagram match: +15
    if (entry.hexagrams?.includes(hexagram.number)) score += 15;
    // Trigram matches: +7 each
    if (entry.trigram_associations?.includes(upperTrigram)) score += 7;
    if (entry.trigram_associations?.includes(lowerTrigram)) score += 7;
    // Keyword matching: +6 per match
    keywords.forEach(kw => {
      if (combinedContext.includes(kw.toLowerCase())) score += 6;
    });
    // Verified entries: +4
    if (entry.verified) score += 4;
    // Day Master element match: +5
    if (dayMasterElement && entry.elements?.includes(dayMasterElement)) score += 5;
    return { entry, score };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);
};
```

#### 2. AI Constrained to Catalog
```typescript
const systemPrompt = `You are a Daoist Remedy Selector. 
Select from AUTHENTICATED CATALOG:
${JSON.stringify(slimCatalog)}

STRICT RULES:
1. Select ONE fulu and ONE environmental remedy
2. Return ONLY existing IDs from the catalog
3. Consider element balance
4. Output: {"remedies": [{"id": "...", "relevance": "..."}]}`;
```

#### 3. Validation & Enrichment
```typescript
for (const sel of result.remedies) {
  const entry = database.find(e => e.id === sel.id);
  if (entry) {
    selectedRemedies.push({
      type: entry.remedyType,
      id: entry.id,
      name: entry.name,
      relevance: sel.relevance || getRelevance(entry, lang, equilibrium),
      description: entry.description?.[lang] || entry.description?.en,
      instructions: entry.structure?.instructions || entry.instructions,
      source: entry.source?.primary || "Daoist tradition"
    });
  }
}
```

#### 4. Fallback Mechanism
If AI fails, return top-scored remedies directly without AI enhancement.

## Key Improvements

| Before | After |
|--------|-------|
| AI generates from scratch | AI selects from validated catalog |
| No scoring system | Multi-factor scoring (hexagram, trigram, keywords, elements) |
| May invent remedies | Only returns IDs that exist in database |
| No conflict checking | Considers Day Master and Life Gua elements |
| Different from remedies-select | Same algorithm as remedies-select |

## Response Format (Unchanged)
```json
{
  "remedies": [
    {
      "type": "fulu|fengshui|medicine",
      "id": "db_entry_id",
      "name": { "zh": "...", "en": "..." },
      "relevance": "Why this fits (AI-generated)",
      "description": "From database",
      "instructions": "From database",
      "source": "Classical reference"
    }
  ]
}
```

## Testing Checklist
- [ ] Remedies are selected from actual database entries
- [ ] Fulu and environmental remedies are balanced (1 each)
- [ ] Relevance text is contextual to the reading
- [ ] Element conflicts are avoided (e.g., weak Water day master doesn't get Fire remedy)
- [ ] Hexagram associations are respected
- [ ] Trigram associations are considered
- [ ] Fallback works when AI fails
- [ ] Consistent with standalone `remedies-select` endpoint

## Files Modified
- `supabase/functions/yijingtu/index.ts` - `handleRemediesTab()` function
