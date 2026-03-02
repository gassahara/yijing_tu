# Translation Fixes Part 2 - UI Labels and Missing Translations

## Issues Fixed

### 1. Celestial Section Labels Not Translated
**Problem**: The celestial section was using hardcoded English labels:
- "Day Master:" instead of "Maestro del Día" (Spanish)
- "Lunar Mansion:" instead of "Mansión Lunar" (Spanish)
- "Tai Sui:" (not translated)
- "Life Gua:" instead of "Gua de Vida" (Spanish)
- Element names like "Wood" instead of "Madera"

**Fix**: 
- Added translation keys to I18N in data.js:
  - `dayMaster`, `lunarMansion`, `taiSui`, `lifeGua`
  - `chineseAstrologyContext`
- Updated `ui.js` `renderInterpretationTabbed` to use translated labels
- Added `translateElement()` helper to translate element names (Wood→Madera, etc.)
- Also fixed Five Elements labels in the elements balance visualization

**Files Modified**:
- `ui.js` - Lines 3128-3200 (celestial content building)
- `data.js` - Added keys to en (line 248), es (line 921), it (line 1254)

### 2. Image Texts Not Translated
**Problem**: `hexagrams.json` only has `image_en` and `image_zh`, missing `image_es` and `image_it`.

**Root Cause**: The JSON file doesn't contain Spanish/Italian image translations.

**Status**: The code at `ui.js:541-554` does attempt to use API translations when JSON is missing, but the classical section translation needs to be triggered and completed.

**Recommended Fix**: Add image_es and image_it to hexagrams.json (64 hexagrams × 2 languages = 128 translations needed).

**Workaround**: The TranslationService should translate image texts via the classical section endpoint.

### 3. Line Texts Showing Chinese
**Problem**: Line texts showing classical Chinese (e.g., "初九：同人于門，無咎") instead of Spanish.

**Fix Applied**:
- Added classical section lines mapping in `translation-service.js:478-481`:
```javascript
if (sectionId === 'classical' && translatedContent.lines !== undefined) {
    targetSection.lines = translatedContent.lines;
}
```

**Note**: The lines translation should work if the classical section is being translated. If still showing Chinese, the translation might not be triggering or the data structure is different.

## Remaining Work

### For Image Texts (Long-term fix)
Add `image_es` and `image_it` fields to all 64 hexagrams in `hexagrams.json`. Example:
```json
"image": {
    "image_zh": "...",
    "image_en": "...",
    "image_es": "El cielo junto con el fuego: La imagen de la Comunidad con los Hombres...",
    "image_it": "Il cielo insieme al fuoco: L'immagine della Comunità con gli Uomini...",
    "source": "..."
}
```

### For Line Texts (If still not working)
Debug the classical section translation flow:
1. Check if `extractSectionContent` finds the lines data
2. Check if `translateSection` is called for classical section
3. Check if `applyTranslationToInterpretation` stores lines correctly
4. Check if `renderTranslation` receives the apiTranslations parameter

## Testing Checklist

- [ ] Celestial section shows translated labels (Maestro del Día, Mansión Lunar, etc.)
- [ ] Element names are translated (Madera, Fuego, Tierra, Metal, Agua)
- [ ] Five Elements balance bars show translated element names
- [ ] Line texts show Spanish/Italian translations (not Chinese)
- [ ] Image texts show Spanish/Italian translations (not English)
