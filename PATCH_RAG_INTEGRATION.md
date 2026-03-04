# RAG Integration Patch Guide

## Goal
Reduce Supabase function execution time by pre-fetching relevant facts in frontend using shared-rag service.

## Files Added
- `rag-integration.js` - RAG client for fetching relevant facts

## Integration Steps

### Step 1: Include the RAG script in HTML
Add to `yijingtu.html` before app.js:
```html
<script src="rag-integration.js"></script>
```

### Step 2: Modify interpretation request in app.js

Find the `performCast` or interpretation fetching function and add RAG enhancement:

```javascript
// BEFORE: Direct interpretation request
const response = await fetch(CONFIG.HEXAGRAM_FUNCTION_URL + '/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        question: question,
        hex: hexData,
        lang: this.lang
    })
});

// AFTER: With RAG pre-fetch
// 1. Fetch relevant facts first (parallel with other operations)
const ragPromise = window.ragIntegration.fetchRelevantFacts({
    question: question,
    hex: hexData,
    tradition: 'daoist'
});

// 2. Get local remedies from DB
const localRemedies = window.DAOIST_REMEDIES_DB ? 
    this.getLocalRemedies(hexData.number) : [];

// 3. Wait for RAG results
const ragData = await ragPromise;

// 4. Send enriched request to backend
const response = await fetch(CONFIG.HEXAGRAM_FUNCTION_URL + '/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        question: question,
        hex: hexData,
        lang: this.lang,
        // Pre-fetched context reduces backend work
        context: {
            localRemedies: localRemedies,
            ragFacts: ragData.facts,
            ragContext: ragData.context,
            sources: ragData.sources
        }
    })
});
```

### Step 3: Backend function modification

In your `yijingtu` function, check for provided context:

```typescript
// In interpretation handler
const { question, hex, lang, context } = await req.json();

let relevantFacts: any[] = [];
let contextString = '';

if (context?.ragContext) {
    // Use frontend-provided context (fast path)
    relevantFacts = context.ragFacts || [];
    contextString = context.ragContext;
    console.log('[Interpret] Using frontend-provided RAG context');
} else {
    // Fallback: Do RAG lookup in backend (slow path)
    const ragResult = await queryRAG({
        query: question,
        hexagram_number: hex.number,
        tradition: 'daoist'
    });
    relevantFacts = ragResult.facts;
    contextString = ragResult.context;
}

// Build prompt with context
const prompt = buildInterpretationPrompt({
    question,
    hex,
    relevantFacts,
    contextString
});
```

## Benefits

1. **Faster Functions**: Backend skips RAG lookup when frontend provides context
2. **Better Caching**: Frontend can cache RAG results across similar questions
3. **Parallel Loading**: RAG fetch happens while user is meditating/casting
4. **Fallback Safety**: If RAG fails, backend still has local DB remedies

## Usage Examples

### Example 1: Simple enrichment
```javascript
// In your interpretation pipeline
const ragData = await window.ragIntegration.fetchRelevantFacts({
    question: "Will my business succeed?",
    hex: currentHex,
    tradition: "daoist"
});

console.log(`Found ${ragData.facts.length} relevant facts`);
console.log(`Context length: ${ragData.context.length} chars`);
```

### Example 2: Search specific remedies
```javascript
const remedies = await window.ragIntegration.searchRemedies(
    "wealth prosperity abundance",
    { element: "metal", limit: 3 }
);
```

### Example 3: Combined local + RAG
```javascript
const enriched = await window.ragIntegration.getEnrichedRemedies(
    hexNumber, 
    userQuestion
);
// Returns { local: [...], ragEnriched: [...], combined: [...] }
```

## Testing

Check if RAG is working:
```javascript
const health = await window.ragIntegration.health();
console.log('RAG Health:', health);
```

Test fact fetching:
```javascript
const facts = await window.ragIntegration.fetchRelevantFacts({
    question: "How to improve relationships?",
    hex: { number: 31, name: "Influence" }
});
console.log(facts);
```
