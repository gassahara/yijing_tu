# Function Split Guide

The original `supabase_function.ts` (374KB, ~10,000 lines) has been split into 3 smaller functions:

## Structure

```
supabase_functions/
├── hexagram/
│   └── index.ts    # Main I Ching interpretation, random number generation
├── export/
│   └── index.ts    # PDF and SVG export
├── astrology/
│   └── index.ts    # Chinese astrology (BaZi, Lunar Mansion, etc.)
└── config.toml     # Function configuration
```

## Endpoints

### 1. Hexagram Function
- `GET /hexagram` - API info
- `GET /hexagram/random` - NIST/crypto random numbers
- `GET /hexagram/health` - Health check
- `POST /hexagram/interpret` - I Ching interpretation

### 2. Export Function  
- `GET /export` - API info
- `POST /export/export-pdf` - Generate PDF
- `POST /export/export-diagram` - Generate SVG diagrams

### 3. Astrology Function
- `GET /astrology` - API info
- `POST /astrology/chinese-astrology` - BaZi calculations

## Deployment

```bash
cd /Users/gerardorojas/Downloads/SS1/supabase_functions

# Deploy all functions
supabase functions deploy hexagram
supabase functions deploy export
supabase functions deploy astrology

# Or deploy from project root
supabase functions deploy --project-ref vflkhntzwfovnuyccxow
```

## Frontend Configuration

Update `data.js` CONFIG:

```javascript
const CONFIG = {
  // Split function URLs
  HEXAGRAM_FUNCTION_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/hexagram",
  EXPORT_FUNCTION_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/export",
  ASTROLOGY_FUNCTION_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/astrology",
  
  // Legacy (for backward compatibility during transition)
  SUPABASE_FUNCTION_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu",
  API_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/hexagram/random",
  DB_URL: "https://vflkhntzwfovnuyccxow.supabase.co/storage/v1/object/public/bucket/hexagrams.json"
};
```

## Testing

```bash
# Test hexagram function
curl https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/hexagram/health

# Test random
curl https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/hexagram/random

# Test astrology
curl -X POST https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/astrology/chinese-astrology \
  -H "Content-Type: application/json" \
  -d '{"date":"2024-01-01T00:00:00Z","location":{"longitude":120}}'
```

## Migration Plan

1. Deploy new functions (hexagram, export, astrology)
2. Test each function individually
3. Update frontend to use new endpoints
4. Keep original yijingtu function as fallback during transition
5. Once stable, remove original monolithic function

## Size Comparison

| Function | Lines | Size |
|----------|-------|------|
| Original (yijingtu) | ~10,000 | 374 KB |
| hexagram | 201 | 6 KB |
| export | 183 | 5 KB |
| astrology | 1,668 | 48 KB |
| **Total** | **~2,052** | **~59 KB** |

The split functions are **6x smaller** than the original monolithic function!
