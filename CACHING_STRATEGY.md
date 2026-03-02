# Caching Strategy for AI Interpretations

## 1. Database Cache Table

```sql
-- Create cache table
CREATE TABLE interpretation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT UNIQUE NOT NULL, -- hexagram_number:moving_lines_hash
    hexagram_number INTEGER NOT NULL,
    moving_lines INTEGER[] DEFAULT '{}',
    section TEXT NOT NULL, -- 'celestial-astro', 'elements-analysis', etc.
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index for fast lookup
CREATE INDEX idx_cache_lookup ON interpretation_cache(cache_key, section);
```

## 2. Edge Function Cache Logic

```typescript
// At start of generate functions
async function getCachedSection(cacheKey: string, section: string) {
  const { data } = await supabase
    .from('interpretation_cache')
    .select('data')
    .eq('cache_key', cacheKey)
    .eq('section', section)
    .gt('expires_at', new Date().toISOString())
    .single();
  return data?.data;
}

async function setCachedSection(cacheKey: string, section: string, data: any) {
  await supabase.from('interpretation_cache').upsert({
    cache_key: cacheKey,
    section,
    data,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
}
```

## 3. Cache Hit Rate Expected

- 64 hexagrams × average 3 moving line combinations = ~200 common combinations
- Cache hit rate: 60-70% for repeat users
- AI calls reduced from 8 to 2-3 per reading

## 4. Implementation Priority

1. **High priority**: Cache classical texts (never change)
2. **Medium**: Cache celestial-astro, elements-analysis (change by date, not by question)
3. **Low**: Cache core-analysis (question-specific)

---

## Strategy B: Batch AI Calls (Reduce from 8 to 2 calls)

Instead of 8 separate AI calls, make 2 larger calls:

```typescript
// Call 1: All "technical" sections
const technicalPrompt = `
Generate technical analysis for:
1. CELESTIAL ASTRO: Lunar mansion ${mansion}, Tai Sui ${taiSui}...
2. ELEMENTS: Balance ${JSON.stringify(elements)}...
3. HOUTOU: master of day ${dayMaster}...

Output JSON:
{
  "celestial": { "technicalAnalysis": "...", "lunarMansion": {...} },
  "elements": { "technicalAnalysis": "...", "elementCounts": {...} },
  "houtou": { "technicalAnalysis": "...", "emperorAnalysis": "..." }
}
`;

// Call 2: All "narrative" sections  
const narrativePrompt = `
Generate narrative interpretation based on technical data above...
Output JSON with analysis, colloquialInterpretation, advice
`;
```

**Result**: 2 AI calls instead of 8 = 4x faster

---

## Strategy C: Progressive/Streaming Loading

Show results as they arrive instead of waiting for all:

```javascript
// In frontend
const sections = ['celestial', 'elements', 'houtou', 'core', 'lines'];

sections.forEach(section => {
  fetchSection(section).then(data => {
    // Render this section immediately
    UI.renderSection(section, data);
  });
});

// Show loading spinner per-section, not global
```

---

## Strategy D: Client-Side AI (Future)

Use smaller local models for simple sections:

```javascript
// Use transformers.js for local inference
import { pipeline } from '@xenova/transformers';

const generator = await pipeline('text-generation', 'Xenova/Qwen2-0.5B');

// For simple translations or short interpretations
const result = await generator(prompt, { max_length: 200 });
```

---

## Recommended Implementation Order

1. **Quick win**: Add server-side caching (2-3 hours, 60% improvement)
2. **Medium**: Batch AI calls (4-6 hours, 4x faster)
3. **Long-term**: Progressive loading UX (2-3 hours, better perceived speed)
