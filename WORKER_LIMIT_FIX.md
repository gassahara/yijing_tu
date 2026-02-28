# WORKER_LIMIT Fix Summary

## Problem
Supabase function returning HTTP 546 with error:
```json
{"code":"WORKER_LIMIT","message":"Function failed due to not having enough compute resources"}
```

## Root Causes
1. **Heavy pdf-lib import at startup** - The PDF library was being imported at the top level, consuming significant memory during function initialization
2. **Database loading on health check** - The health check was trying to load the Fulu database from an external URL, which could hang
3. **No timeouts on external fetches** - Multiple fetch calls had no timeout, causing the function to hang indefinitely

## Fixes Applied

### 1. Lazy-loaded PDF Library
Changed from:
```typescript
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
```

To:
```typescript
let pdfLibCache: any = null;
async function getPdfLib() {
  if (!pdfLibCache) {
    pdfLibCache = await import("https://esm.sh/pdf-lib@1.17.1");
  }
  return pdfLibCache;
}
```

And in `generatePDF()`:
```typescript
const { PDFDocument, rgb, StandardFonts } = await getPdfLib();
```

### 2. Fixed Health Check
Changed health check to not block on database loading:
```typescript
// Quick check if already loaded
if (FULU_DATABASE.length > 0) {
  dbStatus = "loaded_from_bucket";
  dbEntries = FULU_DATABASE.length;
} else {
  // Don't block health check on DB load
  dbStatus = "not_loaded";
  dbEntries = 0;
}
```

### 3. Added Timeouts to All External Fetches

#### handleRemediesDB:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);
const response = await fetch(DAOIST_REMEDIES_DB_URL, {
  signal: controller.signal
});
clearTimeout(timeoutId);
```

#### loadFuluDatabase:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 8000);
const response = await fetch(DAOIST_REMEDIES_DB_URL, {
  signal: controller.signal
});
clearTimeout(timeoutId);
```

#### handleRandomBeacon:
- Restructured to always fall back to crypto if NIST fails
- Added proper error handling to prevent hangs

### 4. Added Debug Logging
Added console.log at function boot to verify invocation:
```typescript
console.log(`[BOOT] Function invoked: ${req.method} ${req.url}`);
```

## Testing
After deploying, test with:
```bash
curl -v https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/yijingtu/health
```

Should return quickly with status 200 and JSON response.

## Deployment Notes
1. Deploy the updated supabase_function.ts
2. The function should now boot much faster (no heavy pdf-lib import at startup)
3. Health check should respond immediately without waiting for DB load
4. All external fetches have timeouts to prevent hanging
