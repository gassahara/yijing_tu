# Interpretation Pipeline Quick Reference

## Common Tasks

### Make an Optimized Interpretation Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/yijingtu-interpret/interpret \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "question": "Should I start my business?",
    "hexagram": {
      "number": 1,
      "name_en": "The Creative",
      "name_zh": "乾",
      "element": "Metal",
      "trigramUpper": { "name": "Heaven", "element": "Metal" },
      "trigramLower": { "name": "Heaven", "element": "Metal" }
    },
    "lines": [
      { "isYang": true, "isChanging": false },
      { "isYang": true, "isChanging": true },
      { "isYang": true, "isChanging": false },
      { "isYang": true, "isChanging": false },
      { "isYang": true, "isChanging": true },
      { "isYang": true, "isChanging": false }
    ],
    "sections": ["technical", "advice"]
  }'
```

### Generate Single Section

```bash
curl -X POST https://your-project.supabase.co/functions/v1/yijingtu-interpret/interpret-section \
  -H "Content-Type: application/json" \
  -d '{
    "section": "technical",
    "question": "...",
    "hexagram": { "number": 1, ... },
    "lines": [...]
  }'
```

## Data Compression

### Compress Hexagram Data

```javascript
import { compressHexagramData } from './lib/interpretation-pipeline.js';

const compressed = compressHexagramData({
  number: 1,
  name_zh: "乾",
  name_en: "The Creative",
  trigramUpper: { name: "Heaven", element: "Metal" },
  trigramLower: { name: "Heaven", element: "Metal" }
});

// Result: { n: 1, zh: "乾", en: "The Creative", ut: "Heaven", lte: "Heaven" }
```

### Compress BaZi Data

```javascript
import { compressBaziData } from './lib/interpretation-pipeline.js';

const compressed = compressBaziData(baziData);
// Result: { dm: "甲", dme: "Wood", str: "strong", fe: ["Water", "Wood"], ue: ["Metal"] }
```

### Count Tokens

```javascript
import { countTokens } from './lib/interpretation-pipeline.js';

const tokens = countTokens(promptText);
console.log(`Prompt uses ${tokens} tokens`);
```

## Validation

### Validate Response

```javascript
import { ResponseValidator, VALIDATION_SCHEMAS } from './lib/interpretation-pipeline.js';

const validator = new ResponseValidator(VALIDATION_SCHEMAS.technical);
const isValid = validator.validate({
  technicalAnalysis: "Analysis text...",
  quotedReferences: ["Zhouyi Hexagram 1"]
});

if (!isValid) {
  console.log(validator.getErrors());
  // ["technicalAnalysis: too short (20 < 50)", ...]
}
```

### Custom Validation

```javascript
const customSchema = {
  advice: {
    type: 'string',
    required: true,
    minLength: 50,
    validator: (value) => {
      if (value.includes('trust yourself')) {
        return 'Contains motivational cliché';
      }
      return true;
    }
  }
};

const validator = new ResponseValidator(customSchema);
```

## JSON Repair

### Repair Malformed JSON

```javascript
import { attemptJSONRepair } from './lib/interpretation-pipeline.js';

const result = attemptJSONRepair('{ "key": "value", }');  // trailing comma
if (result.success) {
  console.log(result.data);  // { key: "value" }
}
```

### Verify and Repair Response

```javascript
import { verifyAndRepairResponse } from './lib/interpretation-pipeline.js';

const result = verifyAndRepairResponse(
  rawResponse,
  validator,
  { autoRepair: true }
);

if (result.success) {
  console.log(result.data);
} else {
  console.log(result.errors);
}
```

## Complete Pipeline

### Client-Side Pipeline

```javascript
import { InterpretationPipeline } from './lib/interpretation-pipeline.js';

const pipeline = new InterpretationPipeline({
  maxRetries: 3,
  autoRepair: true,
  strictValidation: true,
  tokenBudget: 2500
});

const result = await pipeline.generateComplete(
  {
    question: "Should I start my business?",
    hexagram: { number: 1, name_en: "The Creative", ... },
    lines: [...],
    birthBazi: {...},
    equilibrium: {...}
  },
  async (systemPrompt, userPrompt, options) => {
    const res = await fetch('/api/interpret', {
      method: 'POST',
      body: JSON.stringify({ systemPrompt, userPrompt, options })
    });
    return res.text();
  }
);

console.log(result.metrics);
// { tokensIn: 3200, tokensOut: 1800, apiCalls: 6, retries: 1, repairs: 0 }
```

## Response Handling

### Handle Partial Success

```javascript
const result = await fetch('/yijingtu-interpret/interpret', {...});
const data = await result.json();

if (data.success) {
  // All sections succeeded
  renderAll(data.results);
} else if (data.partial) {
  // Some sections succeeded
  if (data.results.technical?.success) {
    renderTechnical(data.results.technical.data);
  }
  if (data.results.advice?.error) {
    showWarning('Advice generation failed');
  }
}
```

### Access Section Data

```javascript
// Technical analysis
const technical = result.results.technical?.data?.technicalAnalysis;

// Advice
const advice = result.results.advice?.data?.advice;

// Moving lines
const movingLines = result.results.movingLines?.data?.movingLines;
const lineTexts = result.results.movingLines?.data?.lineTexts;

// Elements
const elements = result.results.elements?.data?.technicalAnalysis;

// BaZi
const bazi = result.results.bazi?.data?.celestial;
```

## Section Types

| Section | Description | When to Use |
|---------|-------------|-------------|
| `technical` | Classical structural analysis | Always |
| `colloquial` | Accessible narrative | For general users |
| `advice` | Practical orientations | For actionable guidance |
| `movingLines` | Yao Ci commentary | When lines are changing |
| `elements` | Wuxing analysis | For elemental focus |
| `bazi` | Astrological context | When birth data provided |

## Token Budgets

| Component | Budget |
|-----------|--------|
| System prompt | 800 tokens |
| User prompt | 3000 tokens |
| Response | 2000 tokens |
| **Total per call** | **4000 tokens** |

### Per-Section Budgets

| Section | Response Budget |
|---------|-----------------|
| technical | 1800 |
| colloquial | 1500 |
| advice | 2000 |
| movingLines | 2000 |
| elements | 1500 |
| bazi | 1200 |

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `VALIDATION_ERROR` | Missing required fields | Check request format |
| `JSON_PARSE_ERROR` | AI returned invalid JSON | Auto-repair attempted |
| `MISSING_FIELD` | Required field missing in response | Auto-filled placeholder |
| `PLACEHOLDER_CONTENT` | "Unknown" or similar detected | Request retry |
| `CONTENT_TOO_SHORT` | Below minimum length | Request retry |
| `EXTERNAL_API_ERROR` | DeepSeek API error | Retry with backoff |

## Compression Reference

### Hexagram Compression

| Full Key | Compressed | Type |
|----------|------------|------|
| `number` | `n` | number |
| `name_zh` | `zh` | string |
| `name_en` | `en` | string |
| `element` | `el` | string |
| `trigramUpper.name` | `ut` | string |
| `trigramLower.name` | `lte` | string |

### Classical Text Compression

| Full Key | Compressed |
|----------|------------|
| `judgment_zh` | `j.z` |
| `judgment_en` | `j.e` |
| `image_zh` | `i.z` |
| `image_en` | `i.e` |
| `commentary_desc` | `c` |
| `lines_zh[position]` | `l[p].z` |
| `lines_en[position]` | `l[p].e` |

### BaZi Compression

| Full Key | Compressed |
|----------|------------|
| `dayMaster.stem` | `dm` |
| `dayMaster.element` | `dme` |
| `strength.result` | `str` |
| `strength.favorable` | `fe` |
| `strength.unfavorable` | `ue` |
| `year.stem.zh + year.branch.zh` | `p.y` |
| `month.stem.zh + month.branch.zh` | `p.m` |
| `day.stem.zh + day.branch.zh` | `p.d` |
| `hour.stem.zh + hour.branch.zh` | `p.h` |

## Testing

### Test Compression

```javascript
const full = { /* full hexagram data */ };
const compressed = compressHexagramData(full);

console.log('Before:', countTokens(JSON.stringify(full)));
console.log('After:', countTokens(JSON.stringify(compressed)));
console.log('Reduction:', `${(1 - countTokens(JSON.stringify(compressed)) / countTokens(JSON.stringify(full))) * 100}%`);
```

### Test Validation

```javascript
const validator = new ResponseValidator(VALIDATION_SCHEMAS.advice);

// Should fail
const bad = { advice: "Trust yourself and take action!" };
console.log(validator.validate(bad));  // false

// Should pass
const good = { advice: "The Judgment states... Consider waiting for favorable timing." };
console.log(validator.validate(good));  // true
```

## Deployment Checklist

- [ ] Deploy `yijingtu-interpret` function
- [ ] Set `DEEPSEEK_API_KEY` secret
- [ ] Test with sample requests
- [ ] Update client to use compressed format
- [ ] Add error handling for partial success
- [ ] Monitor metrics (latency, tokens, success rate)
- [ ] Document any customizations

## Troubleshooting

### High Token Usage

```javascript
// Check input size
const tokens = countTokens(JSON.stringify(request));
if (tokens > 3000) {
  console.warn('Request too large, compress data');
}
```

### Validation Failures

```javascript
// Check what failed
console.log(validator.getErrors());

// Common fixes:
// - "Missing: X" -> Add required field
// - "Type mismatch" -> Check data types
// - "too short" -> Increase content length
// - "contains placeholder" -> Regenerate content
```

### JSON Parse Errors

```javascript
// Enable auto-repair
const result = verifyAndRepairResponse(raw, validator, { autoRepair: true });

// If still failing, check raw response
console.log(result.raw);
```

### Slow Performance

```javascript
// Use selective sections
const sections = ['technical', 'advice'];  // Skip colloquial

// Monitor metrics
const result = await pipeline.generateComplete(request, apiCaller);
console.log(result.metrics);
// Check apiCalls, retries, duration
```

## Resources

- **Full Guide**: `INTERPRETATION_OPTIMIZATION.md`
- **Schema Reference**: `interpretation_schemas.ts`
- **Client Library**: `lib/interpretation-pipeline.js`
- **Server Function**: `supabase/functions/yijingtu-interpret/index.ts`
- **Summary**: `INTERPRETATION_REFACTOR_SUMMARY.md`
