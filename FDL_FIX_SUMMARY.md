# FDL and Images Fix Summary

## Problem
Fulu (Talisman) FDL (Five Dragons Language) diagrams and reference images were not being rendered when using the 3-tab architecture, showing:
- "Apply according to traditional practice" (fallback instructions)
- No talisman diagram (FDL)
- No reference images

## Root Cause
The frontend was only looking for FDL and images in `fuluContentList` (separate data structure from standalone fetch), but the 3-tab architecture passes them directly in `remedy.fdl` and `remedy.image`.

## Fix Applied

### Frontend (ui.js)

**For new tabbed renderer (line ~3795):**
```javascript
let fuluContent = fuluContentList.find(f => f.id === remedy.id) || fuluContentList[index] || {};

// Merge remedy.fdl and remedy.image from backend if present (3-tab architecture)
if (remedy.fdl) fuluContent.fdl = remedy.fdl;
if (remedy.image) fuluContent.image = remedy.image;
if (remedy.visualData?.fdl) fuluContent.fdl = remedy.visualData.fdl;
```

**For legacy renderer (line ~1790):**
```javascript
let fuluContent = fuluContentList.find(f => f.id === remedy.id) || fuluContentList[index] || {};

// Merge remedy.fdl and remedy.image from backend (3-tab architecture)
if (remedy.fdl) fuluContent.fdl = remedy.fdl;
if (remedy.image) fuluContent.image = remedy.image;
if (remedy.visualData?.fdl) fuluContent.fdl = remedy.visualData.fdl;
```

**Image detection updated:**
```javascript
// Check for images in multiple sources
const remedyImage = remedy.image || remedy.images;
const hasImage = fuluContent.image || remedyImage || ...;
const imageUrls = hasImage ? (Array.isArray(fuluContent.image) ? ... : remedyImage ? [remedyImage] : []) : [];

// FDL detection updated
const hasFDL = fuluContent.fdl || remedy.fdl || remedy.visualData?.fdl || ...;
```

## Data Flow

### Before (Broken)
```
3-tab backend ──→ remedy (no fdl/image fields checked)
                      ↓
              fuluContentList (empty in 3-tab)
                      ↓
              No FDL rendered
```

### After (Fixed)
```
3-tab backend ──→ remedy.fdl / remedy.image
                      ↓
              Merge into fuluContent
                      ↓
              FDL rendered on canvas
```

## Backend Response (3-tab)
```json
{
  "remedies": [
    {
      "type": "fulu",
      "id": "fulu_001",
      "name": { "zh": "太平符", "en": "Great Peace Talisman" },
      "relevance": "...",
      "fdl": { "type": "fulu_canvas", "background": "...", "elements": [...] },
      "image": "https://.../talisman.jpg"
    }
  ]
}
```

## Testing Checklist
- [ ] Fulu talisman shows FDL diagram
- [ ] Reference images display
- [ ] Instructions show from database (not fallback)
- [ ] Both 3-tab and standalone fetch work
- [ ] Legacy renderer also works
