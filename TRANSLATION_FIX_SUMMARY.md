# Translation Fix Summary

## Overview

The Astrology tab (Analysis tab → Astrology sub-tab) has extensive untranslated content. While the main UI has proper `data-i18n` attributes, the dynamically rendered astrology content in `chinese-astrology-client.js` is almost entirely hardcoded in English.

## Files Affected

| File | Issue | Strings to Fix |
|------|-------|----------------|
| `chinese-astrology-client.js` | Hardcoded English in innerHTML | ~150+ strings |
| `yijingtu.html` | Minor missing data-i18n | ~5 strings |
| `data.js` | Missing translation keys | ~80 keys |

## Root Cause

The `chinese-astrology-client.js` file renders astrology content dynamically using template literals with hardcoded English:

```javascript
// Line ~116
<div class="label">Reference Meridian</div>

// Line ~142
<h3>⚡ Current Sky (BaZi) <span class="zh">天時八字</span></h3>

// Line ~188
<th>Pillar</th>
<th>Heavenly Stem<br><span class="sub">天干</span></th>
```

These strings are never run through the translation system.

## Sections Needing Translation

### 1. Ayanamsa (Location Correction)
- "Ayanamsa (Longitude Correction)"
- "Reference Meridian"
- "Time Correction"
- "True Solar Time"

### 2. BaZi Current Sky & Birth Chart
- "Current Sky (BaZi)"
- "Birth Chart (BaZi)"
- "Natal Chart" badge
- Date/time formatting

### 3. Four Pillars Table
- Column headers: "Pillar", "Heavenly Stem", "Earthly Branch", "Hidden Stems"
- Pillar labels: "Hour", "Day", "Month", "Year"

### 4. master of day Panel
- "master of day"
- "Strength"
- "Useful God"
- "Unknown" (fallback)

### 5. Symbolic Stars (神煞)
- "Symbolic Stars"
- All star names: "Noble Person", "Peach Blossom", "Academic", "Travelling", "Goat Blade"

### 6. Bagua (Eight Trigrams)
- Section titles and subtitles
- "Selected Hexagram Trigrams"
- "Upper Trigram" / "Lower Trigram"
- "over" (divider)
- Xian Tian and Hou Tian descriptions
- Position labels

### 7. He Tu (River Map)
- Title and subtitle
- Element labels in SVG: "Earth 土", "Water 水", "Fire 火", "Wood 木", "Metal 金"
- "Personal Numbers"
- Labels: "Year", "Month", "Day", "Hour", "Life", "Destiny"
- "Elemental Flow"
- "Dominant" / "Deficient"

### 8. Luo Shu (Magic Square)
- Title and subtitle
- "All lines sum to 15"
- "Life Gua"
- "Favorable Directions"
- Direction names: "Sheng Qi", "Tian Yi", "Yan Nian", "Fu Wei"

### 9. Lunar Mansion
- Detail labels: "Element", "Direction", "Degrees", "Day Ruler", "Hour Ruler", "Longitude"

### 10. Tai Sui
- "Grand Duke of the Year"
- "San Sha" description
- "Sui Po" label and "Opposite"
- "Annual" note

## Implementation Solution

### Step 1: Add Translation Keys to data.js

Add ~80 new keys to the I18N object for each language (en, es, it, zh).

### Step 2: Modify chinese-astrology-client.js

Option A: Use data-i18n attributes (Recommended)
```javascript
// Change from:
<div class="label">Reference Meridian</div>

// To:
<div class="label" data-i18n="referenceMeridian">Reference Meridian</div>

// Then after insertion:
if (window.TranslationService) {
    TranslationService.translateElement(div);
}
```

Option B: Use I18N object directly
```javascript
// Add lang parameter to render functions
renderBaZiCurrent(bazi, lang = 'en') {
    const t = I18N[lang] || I18N['en'];
    div.innerHTML = `<h3>${t.currentSkyBazi}</h3>`;
}
```

### Step 3: Minor HTML fixes

Add missing data-i18n attributes in yijingtu.html.

## Code Changes Required

### chinese-astrology-client.js Changes

1. Add `data-i18n` attributes to all hardcoded strings
2. Add `data-i18n="zh"` for Chinese text that should always stay Chinese
3. Call `TranslationService.translateElement()` after inserting HTML
4. Pass language parameter from caller (App class)

### data.js Changes

Add these key categories:
- `ayanamsa*`: 4 keys
- `*Bazi`: 3 keys
- `pillar*`: 4 keys
- `*Label`: 10+ keys
- `star*`: 6 keys
- `bagua*`: 15+ keys
- `hetu*`: 10+ keys
- `luoshu*`: 10+ keys
- `lunar*`: 7 keys
- `taiSui*`: 8 keys

Total: ~80 new translation keys per language

## Testing

After implementing:
1. Set language to Spanish
2. Open Analysis → Astrology tab
3. Verify all text appears in Spanish
4. Check that Chinese characters (zh spans) remain
5. Test switching languages dynamically

## Priority

**HIGH** - The astrology tab is a major feature and currently provides poor UX for non-English speakers.

## Estimated Effort

- Adding translation keys: 2-3 hours
- Modifying chinese-astrology-client.js: 3-4 hours
- Testing and refinement: 1-2 hours
- **Total: ~6-9 hours**
