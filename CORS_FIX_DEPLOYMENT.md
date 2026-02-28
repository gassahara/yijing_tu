# CORS Fix and Function Deployment Guide

## Issue
Cross-Origin Request Blocked: CORS request did not succeed when calling `/yijingtu/houtou` endpoint.

## Root Cause
The Supabase Edge Function needs to be redeployed with the consolidated code.

## Solution

### Step 1: Deploy the Main Function
```bash
# Deploy the consolidated yijingtu function
supabase functions deploy yijingtu

# Or using npx
npx supabase functions deploy yijingtu
```

### Step 2: Verify CORS Headers
The main function (`supabase_function.ts`) already includes proper CORS headers:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400"
};
```

### Step 3: Verify Function Endpoints
The following endpoints are now consolidated in `supabase_function.ts`:

| Endpoint | Handler | Description |
|----------|---------|-------------|
| `/yijingtu` | Root | API info |
| `/yijingtu/chinese-astrology` | `handleChineseAstrology` | Complete astrology |
| `/yijingtu/houtou` | `handleSectionEndpoint` | Later Heaven analysis |
| `/yijingtu/interpret` | `handleInterpret` | AI interpretation |
| `/yijingtu/fdl-generate` | `handleFDLGenerate` | FDL diagram generation |
| `/yijingtu/interpret-xiantian` | `handleInterpretXiantian` | Xian Tian interpretation |

### Step 4: Delete Separate Functions (Optional)
Once the main function is working, you can delete the separate functions:

```bash
# These are now consolidated in the main yijingtu function
supabase functions delete chinese-astrology
supabase functions delete fdl-generate
supabase functions delete interpret
supabase functions delete xiantian-interpret
```

### Step 5: Test the Deployment
1. Open `test_chinese_astrology.html`
2. Check browser console for errors
3. If CORS still fails, the client will use local fallback

## Local Fallback
The client now includes a local calculation fallback that works without the API:

```javascript
// In chinese-astrology-client.js
calculateLocal(params) {
    // Simple BaZi calculation
    // Returns basic chart data
}
```

## Troubleshooting

### If CORS still fails after deployment:

1. **Check Supabase Dashboard**
   - Go to Supabase Dashboard > Edge Functions
   - Verify `yijingtu` function is deployed
   - Check function logs for errors

2. **Verify Function URL**
   ```
   https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu/chinese-astrology
   ```

3. **Test with curl**
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -d '{"date":"2026-02-26T12:00:00Z"}' \
     https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu/chinese-astrology
   ```

4. **Check Browser Console**
   - Look for preflight OPTIONS request
   - Verify response headers include Access-Control-Allow-Origin

## Files Updated
- `supabase_function.ts` - Consolidated all functions
- `chinese-astrology-client.js` - Added fallback, fixed URL
- `chinese-astrology.css` - Complete styles

## Deployment Checklist
- [ ] Deploy `supabase_function.ts` as `yijingtu`
- [ ] Test Chinese astrology endpoint
- [ ] Test houtou endpoint
- [ ] Delete old separate functions (optional)
- [ ] Verify CORS headers in browser
