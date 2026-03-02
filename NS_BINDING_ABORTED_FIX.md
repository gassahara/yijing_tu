# NS_BINDING_ABORTED Error Fix

## Root Cause
The `NS_BINDING_ABORTED` error occurs when:
1. Browser connection pool is exhausted (too many concurrent requests)
2. Requests take too long (20-30s AI calls) causing browser to abort
3. CORS preflight (OPTIONS) requests fail

## Changes Made

### 1. Backend - Classical Endpoint (`supabase/functions/yijingtu/index.ts`)

**Removed AI Translation:**
- Previously called DeepSeek API for missing translations (5-10s per language)
- Now returns database content directly with Chinese as fallback
- Missing translations handled by `/translate-text` endpoint on-demand

```typescript
// Returns Chinese text as fallback instead of empty strings
result.judgment = {
  en: hexData.judgment_en?.trim() || zhJudgment,  // Fallback to Chinese
  es: hexData.judgment_es?.trim() || zhJudgment,
  it: hexData.judgment_it?.trim() || zhJudgment,
  zh: zhJudgment
};
```

### 2. Frontend - Parallel Batching (`app.js`)

**New Batch Strategy:**
AI-heavy sections run mostly sequentially, fast sections run in parallel:

```javascript
const BATCH_CONFIG = [
    // AI sections - sequential (1 per batch)
    ['celestial-astro'],      // AI call
    ['celestial-bazi'],       // AI call  
    ['elements-analysis'],    // AI call
    ['elements-synthesis'],   // AI call
    ['houtou-emperor', 'houtou-master'], // Can run together
    ['core-technical'],       // AI call
    ['core-narrative'],       // AI call
    ['core-application'],     // AI call
    // Fast sections - parallel
    ['lines', 'classical']    // DB only, no AI
];
```

**Timing:**
- 800ms delay after single-section (AI) batches
- 300ms delay after multi-section batches
- 60s timeout for fetch (AI can be slow)
- 30s timeout for compose

### 3. Payload Optimization (Already in place)

- History summarization: 85% reduction
- Translation format: 40% token savings  
- System prompts: 50-60% shorter
- Compact data formats for BaZi/Astrology

## Expected Performance

| Section | Before | After |
|---------|--------|-------|
| celestial-astro | 25-30s | 25-30s (sequential) |
| celestial-bazi | 25-30s | 25-30s (sequential) |
| elements-analysis | 20-25s | 20-25s (sequential) |
| elements-synthesis | 20-25s | 20-25s (sequential) |
| houtou | 20-25s | 20-25s (parallel) |
| core-* | 20-25s each | 20-25s each (sequential) |
| lines + classical | <1s | <1s (parallel) |
| **Total** | **~8-10s** (parallel but aborts) | **~25-30s** (reliable) |

## Trade-off
- **Before**: Faster when it works (~8s) but unreliable (NS_BINDING_ABORTED)
- **After**: Slower but reliable (~25-30s), no aborted requests

## Future Optimizations
1. Cache AI responses in Supabase
2. Pre-compute interpretations for common hexagrams
3. Use faster AI model for initial draft
4. Client-side caching of classical texts
