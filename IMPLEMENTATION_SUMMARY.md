# Implementation Summary: Issues 2 & 3

## Changes Made

### 1. Backend - Compact Prompts (Option B)

**File:** `supabase/functions/yijingtu/index.ts`

**`generateCelestialAstro()` - COMPACT:**
```typescript
// BEFORE: Full JSON (~2000 tokens)
const technicalData = { timestamp, hexagram: {...}, lunarMansion: {...} };
const userPrompt = `### TECHNICAL DATA (JSON)\n${JSON.stringify(technicalData, null, 2)}`;

// AFTER: Text format (~500 tokens)
const techSummary = `Hexagram: 1-乾|LunarMansion: Horn(Wood)|TaiSui: NE`;
const userPrompt = `DATA: ${techSummary}\nQUESTION: "${question}"`;
```

**System Prompt - COMPACT:**
```typescript
// BEFORE: 500+ tokens with detailed instructions
const systemPrompt = `You are a Daoist Astronomer...
CRITICAL REQUIREMENTS:
1. USE PROVIDED TECHNICAL DATA...
2. LUNAR MANSION: Analyze...
...`;

// AFTER: 50 tokens
const systemPrompt = `Yi Jing astrologer. Analyze Lunar Mansion and Tai Sui impact.
Output JSON: {technicalAnalysis, colloquialInterpretation, lunarMansion, celestial}`;
```

### 2. Frontend - Max 3 Concurrent (Option D)

**File:** `app.js`

**Connection Limiting:**
```javascript
const MAX_CONCURRENT = 3; // Was 9, now 3

// Process in chunks
for (let i = 0; i < sections.length; i += MAX_CONCURRENT) {
    const chunk = sections.slice(i, i + MAX_CONCURRENT);
    // Fetch 3 at a time
    const results = await Promise.all(chunk.map(fetch));
    await delay(1000); // Recovery time between chunks
}
```

**Connection Keep-Alive:**
```javascript
const response = await fetch(url, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Connection': 'keep-alive' // Reuse HTTP/2 streams
    },
    body: requestBody
});
```

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Concurrent connections | 9 | 3 |
| Prompt tokens (celestial) | ~2000 | ~500 |
| System prompt tokens | ~500 | ~50 |
| Total AI tokens per call | ~3500 | ~1500 |
| Browser connection pool | Exhausted (abort) | Healthy |

## Why This Works

**Issue 2 (Slow AI):**
- 50% fewer tokens = faster processing
- Compact text easier to parse than nested JSON
- Shorter prompts = less context for model to process

**Issue 3 (Parallel aborts):**
- 3 connections < 6 browser limit = no queue
- Keep-alive reuses HTTP/2 streams
- 1s delay between chunks lets pool recover

## Testing

```bash
# Deploy backend
supabase functions deploy yijingtu

# Test with browser console open
# Should see:
# [AI:OPT] Processing chunk 1: celestial-astro, celestial-bazi, elements-analysis
# [AI:OPT] Processing chunk 2: elements-synthesis, houtou-emperor, houtou-master
# ... (no NS_BINDING_ABORTED)
```
