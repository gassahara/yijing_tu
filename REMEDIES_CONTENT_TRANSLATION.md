# Remedies Content Translation

## Problem
The remedy content (relevance, description, instructions) was always displaying in English even when the UI language was set to Spanish or Italian. Only the titles/labels were translated.

## Solution
Added asynchronous translation of remedy content using the `translationService` in both `renderRemediesTabbed` and `renderRemediesLegacy`.

## Changes Made

### 1. ui.js - renderRemediesTabbed (line ~3309)
Added async translation helper and translation kickoff:

```javascript
// Helper to translate remedy content asynchronously
const translateRemedyContent = async (remedy, lang) => {
    if (lang === 'en' || !window.translationService) return remedy;
    
    const fieldsToTranslate = ['relevance', 'description', 'instructions'];
    for (const field of fieldsToTranslate) {
        if (remedy[field] && typeof remedy[field] === 'string') {
            try {
                const translated = await window.translationService.translateText(
                    remedy[field], lang, 'ui_content'
                );
                if (translated && translated !== remedy[field]) {
                    remedy[field] = translated;
                }
            } catch (err) {
                console.warn(`[UI] Failed to translate remedy ${field}:`, err);
            }
        }
    }
    return remedy;
};

// Kick off async translation for remedy content if not English
if (displayLang !== 'en' && window.translationService) {
    translateRemedyContent(remedy, displayLang).then(updatedRemedy => {
        // Update DOM with translated content
        const tabItems = document.querySelectorAll('.remedy-tab-item');
        tabItems.forEach(item => {
            const h3 = item.querySelector('h3');
            if (h3 && h3.textContent.includes(remedyName)) {
                // Update relevance, description, instructions in DOM
                ...
            }
        });
    }).catch(err => console.error('[UI] Failed to translate remedy content:', err));
}
```

### 2. ui.js - renderRemediesLegacy (line ~1506)
Added similar async translation logic for the legacy renderer.

## How It Works

1. When remedies are rendered in a non-English language:
   - The remedy content is first displayed in English (for immediate feedback)
   - An async translation request is kicked off for each remedy

2. The translation service translates:
   - `relevance` - The relevance/explanation text
   - `description` - The remedy description
   - `instructions` - Usage instructions

3. After translation completes:
   - The DOM is updated directly with the translated text
   - No full re-render needed

## Fallback Behavior

- If translation fails, the original English text remains
- If translation service is not available, shows English
- If already in English language, no translation needed

## Testing

To verify:
1. Cast a reading that returns remedies
2. Switch language to Spanish or Italian
3. Navigate to Remedies tab
4. Verify that:
   - Remedy names are translated (using the translation map)
   - Relevance text is translated
   - Description is translated
   - Instructions are translated

## Note

This translation happens asynchronously after the initial render, so there may be a brief moment where the text appears in English before being replaced with the translated version. This is intentional to avoid blocking the UI.
