# BaZi Location & Time Correction Update

## Changes Made

### 1. Terminology Fixes
- **Prasna** → **Tian Shi (天時)** - Changed "Current Sky (Prasna)" to "Current Sky (Tian Shi) 天時"
- Removed incorrect "ayanamsa" reference (which is Vedic astrology terminology)
- Using Chinese term **真太阳时** (True Solar Time) for time correction

### 2. BaZi Configuration Panel (Analysis Tab > Moment Influence)
Added new configuration panel with:
- **Latitude** input (with decimal precision)
- **Longitude** input (with decimal precision)
- **Date** selector
- **Time** selector
- **Detect My Location** button - Uses browser geolocation API
- **Apply & Recalculate** button - Applies corrections and recalculates

### 3. True Solar Time Correction (真太阳时)
Traditional Chinese astrology uses local apparent solar time, not standard clock time.

**Calculation:**
- Reference meridian: 120°E (Beijing time)
- Each degree of longitude = 4 minutes time difference
- Formula: `adjustedTime = standardTime + (longitude - 120) × 4 minutes`

**Example:**
- Location: New York City (74°W = -74°)
- Difference from Beijing: -74 - 120 = -194°
- Time correction: -194 × 4 = -776 minutes (-12.9 hours)

### 4. Location-Aware Lunar Mansion Calculation
Updated `Astrology.getLunarMansion()` to accept:
- `latitude` - For location-specific lunar calculations
- `longitude` - For true solar time correction

### 5. UI Updates

#### Moment Influence Tab Shows:
- BaZi four pillars with proper Chinese characters
- Location coordinates (when provided)
- "真太阳时" correction badge
- Lunar mansion with location info

#### Pre-Analysis Tab Shows:
- "Location Correction (真太阳时)" in data sent to AI
- Coordinates when applied

### 6. Data Flow
1. User enters location or clicks "Detect My Location"
2. User clicks "Apply & Recalculate"
3. `App.applyBaziConfig()`:
   - Calculates true solar time correction
   - Recalculates Current BaZi with adjusted time
   - Recalculates Lunar Mansion with location
   - Updates Analysis tab display
4. All AI prompts now include location-corrected data

## Usage Instructions

### For Accurate BaZi Calculation:
1. Go to **Analysis** tab > **Moment Influence** sub-tab
2. Enter your location OR click "📍 Detect My Location"
3. Adjust date/time if needed (defaults to current)
4. Click "Apply & Recalculate"
5. The BaZi pillars and Lunar Mansion will update with location correction

### Without Location:
- Uses system timezone (may be inaccurate for BaZi)
- Still provides useful approximation

## Technical Notes

### Files Modified:
- `index.html` - Added BaZi configuration panel
- `app.js` - Added location detection, time correction, recalculation logic
- `astrology.js` - Updated getLunarMansion() with location support
- `tabbed-layout.css` - Added styling for config panel and location display
- `data.js` - Added translation keys

### API Impact:
All AI interpretation sections now receive location-corrected data:
- `currentBazi` - Recalculated with true solar time
- `mansion` - Recalculated with location
- `birthBazi` - Can also use location (if birth location known)
