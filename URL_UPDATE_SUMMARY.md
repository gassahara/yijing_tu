# URL Update Summary

## Deployed Function URLs

| Function | Deployed URL |
|----------|-------------|
| hexagram | `https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu` |
| astrology | `https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/bazi-astrol` |
| export | `https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijing-export` |

## Frontend Configuration Updates

### 1. data.js - CONFIG object
```javascript
const CONFIG = {
    // Split Function Endpoints
    HEXAGRAM_FUNCTION_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu",
    ASTROLOGY_FUNCTION_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/bazi-astrol",
    EXPORT_FUNCTION_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijing-export",
    
    // Legacy aliases (for backward compatibility)
    API_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu/random",
    SUPABASE_FUNCTION_URL: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu",
    ...
};
```

### 2. app.js - API Calls
Updated to use specific function URLs:
- `/export-pdf`, `/export-diagram` → `CONFIG.EXPORT_FUNCTION_URL`
- `/interpret-compose`, sections, `/translate` → `CONFIG.HEXAGRAM_FUNCTION_URL`
- `/remedies-db` → `CONFIG.HEXAGRAM_FUNCTION_URL`

### 3. chinese-astrology-client.js
```javascript
const CHINESE_ASTROLOGY_API = {
    baseUrl: "https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/bazi-astrol",
    ...
};
```

### 4. chinese-astrology-integration.js
```javascript
const ASTROLOGY_CONFIG = {
    apiUrl: 'https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/bazi-astrol/chinese-astrology',
    ...
};
```

## Endpoint Mapping

### Hexagram Function (yijingtu)
- `GET /random` - Random number generation
- `GET /health` - Health check
- `POST /interpret` - I Ching interpretation
- `POST /interpret-compose` - Section composition
- `POST /translate` - Translation
- `POST /{section}` - Individual sections (celestial, elements, etc.)
- `GET /remedies-db` - Remedies database

### Astrology Function (bazi-astrol)
- `POST /chinese-astrology` - BaZi, Lunar Mansion, He Tu, Luo Shu calculations

### Export Function (yijing-export)
- `POST /export-pdf` - PDF generation
- `POST /export-diagram` - SVG diagram export

## Testing

```bash
# Test hexagram function
curl https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu/health
curl https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu/random

# Test astrology function
curl -X POST https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/bazi-astrol/chinese-astrology \
  -H "Content-Type: application/json" \
  -d '{"date":"2024-01-01T00:00:00Z","location":{"longitude":120}}'

# Test export function
curl https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijing-export
```

## Files Modified

1. `/data.js` - Added new CONFIG URLs
2. `/app.js` - Updated API calls to use split function URLs
3. `/chinese-astrology-client.js` - Updated baseUrl
4. `/chinese-astrology-integration.js` - Updated apiUrl
