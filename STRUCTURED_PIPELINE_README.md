# Structured Interpretation Pipeline Documentation

## Overview

The Yijingtu API now supports a **3-Phase Structured Interpretation Pipeline** that separates technical/classical analysis from modern personalized interpretation, providing:

1. **Phase 1**: Technical analysis with accurate classical texts, BaZi diagrams, Bagua analysis
2. **Phase 2**: Modern interpretation with personality settings, multi-language support
3. **Phase 3**: Authentic Daoist remedies from verified database

## Why Structured Pipeline?

### Problems with Old Approach:
- ❌ Mixed technical and modern content
- ❌ Inconsistent formatting
- ❌ Limited language support
- ❌ Query relevance often lost
- ❌ No clear separation of concerns

### New Approach Benefits:
- ✅ **Technical First**: Accurate classical data before interpretation
- ✅ **Query Focused**: Every section connects to the question
- ✅ **Multi-Language**: Simultaneous translation to all requested languages
- ✅ **Personality Driven**: Tone and style customization
- ✅ **Structured JSON**: Machine-readable, consistent format
- ✅ **Authentic Remedies**: Verified Daoist sources

## Phase 1: Technical Analysis

### Endpoint
```
POST /interpret-phase1
```

### Input Schema
```json
{
  "question": "string (required)",
  "hexagram": {
    "number": "number (1-64)",
    "name_zh": "string",
    "name_en": "string"
  },
  "lines": [
    {
      "isYang": "boolean",
      "isChanging": "boolean"
    }
  ],
  "binaryKey": "string (6 digits)",
  "upperTrigram": "string (3 digits)",
  "lowerTrigram": "string (3 digits)",
  "mansion": { /* optional */ },
  "birthBazi": { /* optional */ },
  "currentBazi": { /* optional */ },
  "historyContext": "string (optional)"
}
```

### Output Schema
```json
{
  "phase": "technical_analysis",
  "data": {
    "metadata": {
      "phase": "technical_analysis",
      "timestamp": "ISO8601",
      "version": "3.0",
      "queryFocus": "extracted theme from question"
    },
    "hexagramAnalysis": {
      "number": 1,
      "names": { "zh": "乾", "en": "The Creative", "pinyin": "Qián" },
      "structure": {
        "binary": "111111",
        "upperTrigram": { "code": "111", "name": "Heaven", "element": "Metal", "nature": "Creative" },
        "lowerTrigram": { "code": "111", "name": "Heaven", "element": "Metal", "nature": "Creative" },
        "trigramRelationship": "Heaven over Heaven - pure yang energy",
        "nuclearTrigrams": { "upper": "...", "lower": "..." }
      },
      "classification": {
        "yaoStructure": "6 yang lines",
        "position": "Early Heaven - beginning of cycle",
        "phase": "Young Yang - initiating energy"
      }
    },
    "movingLines": {
      "count": 2,
      "positions": [2, 5],
      "analysis": [
        {
          "position": 2,
          "yaoType": "9",
          "isChanging": true,
          "classicalText": { "zh": "...", "en": "..." },
          "trigramContext": "In the inner trigram",
          "positionMeaning": "Development phase - steady progress"
        }
      ],
      "resultingHexagram": { "number": 13, "name": "Fellowship", "transition": "..." }
    },
    "classicalTexts": {
      "judgment": { "zh": "元亨利貞", "en": "...", "commentary": "..." },
      "image": { "zh": "天行健", "en": "...", "commentary": "..." },
      "lines": [...],
      "references": ["Zhouyi Hexagram 1, Judgment", "Xiangzhuan commentary"]
    },
    "baziAnalysis": {
      "birthChart": { "pillars": [...], "dayMaster": {...}, "yongShen": {...}, "balance": {...} },
      "currentInfluence": { "pillars": [...], "strength": "...", "clashHarmony": [...] },
      "interaction": { "birthCurrentRelation": "...", "timingAnalysis": "...", "favorablePeriods": [...], "unfavorablePeriods": [...] }
    },
    "celestialData": {
      "lunarMansion": { "name": "Horn", "group": "Azure Dragon", "element": "Wood", "degrees": 12, "influence": "..." },
      "lifePalace": { "number": 5, "stem": "Wu", "element": "Fire", "significance": "..." },
      "astrologicalNotes": [...]
    },
    "wuxingAnalysis": {
      "hexagramElements": { "upper": "Metal", "lower": "Metal", "combined": "Double Metal - creative power" },
      "baziElements": { "birth": {...}, "current": {...}, "interaction": "..." },
      "cycles": { "sheng": ["Metal produces Water", ...], "ke": ["Metal controls Wood", ...] },
      "recommendations": [...]
    },
    "baguaAnalysis": {
      "directions": { "favorable": ["Northwest", "West"], "unfavorable": ["East", "Southeast"] },
      "trigramPositions": { "Northwest": { "trigram": "Heaven", "meaning": "...", "activation": "..." } },
      "fengShuiApplications": ["Activate Northwest with metal objects", "..."]
    },
    "queryRelevance": {
      "questionType": "Career/Leadership",
      "applicableLines": [2, 5],
      "keyThemes": ["Initiation", "Creative power", "Leadership"],
      "timingIndicators": "Early stage - time to begin",
      "actionRecommendations": ["Take initiative", "Lead with clarity", "..."]
    },
    "citations": {
      "classical": ["Zhouyi, Hexagram 1", "Shuogua (Discussion of Trigrams)"],
      "academic": ["Lynn (1994), The Classic of Changes"],
      "canonical": ["DZ 1, Lingbao Wuliang Duren"]
    }
  }
}
```

### Key Features
- **Accurate Classical Texts**: Judgment, Image, Line texts with Chinese originals
- **Complete BaZi**: Pillars, master of day, Yong Shen, elemental balance
- **Celestial Data**: Lunar mansion, Life Palace (if birth time provided)
- **Five Elements**: Hexagram + BaZi interaction, generating/controlling cycles
- **Bagua Analysis**: Later Heaven directions, Feng Shui applications
- **Query Relevance**: EVERY section ties back to the specific question

## Phase 2: Modern Interpretation

### Endpoint
```
POST /interpret-phase2
```

### Input Schema
```json
{
  "phase1Data": { /* Technical analysis from Phase 1 */ },
  "personality": {
    "tone": "scholarly|compassionate|direct|mystical|pragmatic",
    "depth": "brief|standard|comprehensive",
    "style": "contemporary|traditional|psychological|practical"
  },
  "languages": ["en", "es", "it", "zh"],
  "context": {
    "userHistory": "string (optional)",
    "previousReadings": [],
    "sessionTheme": "string (optional)"
  }
}
```

### Output Schema
```json
{
  "phase": "modern_interpretation",
  "data": {
    "metadata": {
      "phase": "modern_interpretation",
      "timestamp": "ISO8601",
      "personality": "compassionate|standard|contemporary",
      "languages": ["en", "es", "it", "zh"]
    },
    "interpretations": {
      "en": {
        "executiveSummary": {
          "headline": "A time for bold initiation and creative leadership",
          "coreMessage": "The Creative (Hexagram 1) shows pure yang energy...",
          "relevanceToQuestion": "For your career question, this indicates...",
          "keyTakeaway": "Begin now with confidence, but maintain patience through the process"
        },
        "situation": {
          "currentState": "You are at the beginning of a creative cycle...",
          "underlyingDynamics": "The double Heaven trigrams indicate...",
          "hiddenFactors": "Line 2 changing suggests...",
          "querySpecificInsights": "Regarding your specific situation..."
        },
        "development": {
          "trajectory": "This hexagram suggests upward, expansive energy...",
          "timing": "The time is favorable for beginning, but results develop gradually",
          "phases": [
            { "phase": "Initiation", "description": "...", "timeframe": "Next 2-3 weeks" }
          ],
          "turningPoints": ["When line 2 manifests...", "..."]
        },
        "guidance": {
          "immediateActions": ["Take the first step", "..."],
          "strategicApproach": "Lead with clarity while remaining adaptable...",
          "attitudeAdjustments": ["Cultivate patience", "..."],
          "pitfallsToAvoid": ["Rushing before preparation", "..."]
        },
        "symbolism": {
          "coreSymbols": [
            { "symbol": "Heaven/Sky", "meaning": "Creative power, father, leader", "relevance": "In your situation, this represents..." }
          ],
          "archetypalPatterns": ["The Hero's Journey beginning", "..."],
          "modernParallels": ["Startup founder energy", "..."]
        },
        "movingLines": {
          "overview": "Two moving lines indicate significant transformation...",
          "specificLines": [
            { "position": 2, "meaning": "", "advice": "", "timing": "" }
          ],
          "resultingChange": "Moving to Hexagram 13 (Fellowship) suggests..."
        },
        "baziInsights": {
          "personalResonance": "Your master of day of Fire harmonizes with...",
          "timingAlignment": "Current Metal month supports...",
          "elementalAdvice": ["Strengthen Water element for balance", "..."],
          "destinyContext": "This reading aligns with your life's creative phase"
        },
        "applications": {
          "decisionMaking": "Trust your intuition but verify with facts...",
          "relationships": "Lead with generosity rather than dominance...",
          "career": "Perfect time for initiating new projects...",
          "personalGrowth": "Develop your leadership qualities...",
          "spiritual": "Connect with universal creative energy..."
        },
        "spatialGuidance": {
          "favorableDirections": ["Northwest - for clarity", "..."],
          "activationSuggestions": ["Place metal objects in NW", "..."],
          "elementalEnhancements": ["Use white/gold colors", "..."]
        },
        "contemplative": {
          "affirmation": "I am a vessel of creative power...",
          "meditationFocus": "Visualize golden light expanding...",
          "reflectionQuestions": ["What am I being called to create?", "..."]
        }
      },
      "es": { /* Same structure in Spanish */ },
      "it": { /* Same structure in Italian */ },
      "zh": { /* Same structure in Chinese */ }
    },
    "technicalReferences": {
      "hexagramNumber": 1,
      "movingLines": [2, 5],
      "baziRelevant": true,
      "celestialRelevant": true
    }
  }
}
```

### Personality Options

**Tone:**
- `scholarly`: Academic, detailed, precise
- `compassionate`: Warm, empathetic, supportive
- `direct`: Clear, concise, no-nonsense
- `mystical`: Poetic, spiritual, evocative
- `pragmatic`: Practical, action-oriented, realistic

**Depth:**
- `brief`: 2-3 sentences per section
- `standard`: Paragraphs with key details
- `comprehensive`: Full exploration with examples

**Style:**
- `contemporary`: Modern language, current references
- `traditional`: Classical tone, historical context
- `psychological`: Jungian/archetypal focus
- `practical`: Step-by-step guidance

## Phase 3: Remedies

### Endpoint
```
POST /interpret-phase3
```

### Input Schema
```json
{
  "phase1Data": { /* From Phase 1 */ },
  "phase2Data": { /* From Phase 2 */ },
  "focus": "protection|harmony|clarity|abundance|health|relationships|general"
}
```

### Output Schema
```json
{
  "phase": "remedies",
  "data": {
    "en": {
      "talisman": "Description of the authentic talisman",
      "charm": "Incantation with pinyin and translation",
      "practices": [
        {
          "name": "Morning meditation",
          "description": "...",
          "instructions": "...",
          "duration": "10-15 minutes"
        }
      ],
      "source": {
        "citation": "Zhengtong Daozang (正統道藏) - DZ 388",
        "verification": "Verified from canonical source",
        "reference": "Lingbao Wufu Xu"
      }
    },
    "visual": {
      "sealCharacters": ["太", "平", "符", "籙"],
      "trigramAssociation": "111000",
      "elementalColors": ["#FFD700", "#FFFFFF"],
      "layout": {
        "top": "Hexagram character",
        "center": ["Seal characters"],
        "bottom": ["Source info", "Usage tags"]
      }
    },
    "tailored": {
      "basedOn": ["Hexagram 1", "Metal element", "Creative focus"],
      "specificToQuery": "Selected for career initiation",
      "timing": "Best practiced during Metal hours (3-7pm)",
      "duration": "21 days for full effect"
    }
  }
}
```

## Complete Pipeline

### Endpoint
```
POST /interpret-complete
```

### Input
Combines all inputs from Phase 1 + personality + languages

### Output
```json
{
  "metadata": {
    "version": "v2.0",
    "timestamp": "...",
    "requestId": "...",
    "phasesCompleted": ["technical_analysis", "modern_interpretation", "remedies"],
    "query": "Your question here",
    "hexagram": 1
  },
  "phase1_technical": { /* Full Phase 1 data */ },
  "phase2_modern": { /* Full Phase 2 data */ },
  "phase3_remedies": { /* Full Phase 3 data */ },
  "quickAccess": {
    "headline": { "en": "...", "es": "...", "it": "...", "zh": "..." },
    "keyAdvice": { "en": "...", ... },
    "timing": { "en": "...", ... },
    "actionItems": { "en": [...], ... }
  }
}
```

## Usage Examples

### Example 1: Step-by-Step
```javascript
// Step 1: Get technical analysis
const phase1 = await fetch('/interpret-phase1', {
  method: 'POST',
  body: JSON.stringify({
    question: "Should I start my own business?",
    hexagram: { number: 1, name_zh: "乾", name_en: "The Creative" },
    lines: [{isYang: true, isChanging: false}, ...],
    binaryKey: "111111",
    birthBazi: { /* optional */ }
  })
});
const technicalData = await phase1.json();

// Step 2: Get modern interpretation
const phase2 = await fetch('/interpret-phase2', {
  method: 'POST',
  body: JSON.stringify({
    phase1Data: technicalData.data,
    personality: { tone: "pragmatic", depth: "standard", style: "contemporary" },
    languages: ["en", "es"]
  })
});
const modernData = await phase2.json();

// Step 3: Get remedies
const phase3 = await fetch('/interpret-phase3', {
  method: 'POST',
  body: JSON.stringify({
    phase1Data: technicalData.data,
    phase2Data: modernData.data,
    focus: "abundance"
  })
});
const remediesData = await phase3.json();
```

### Example 2: Complete Pipeline
```javascript
const complete = await fetch('/interpret-complete', {
  method: 'POST',
  body: JSON.stringify({
    question: "Should I start my own business?",
    hexagram: { number: 1, name_zh: "乾", name_en: "The Creative" },
    lines: [...],
    binaryKey: "111111",
    personality: { tone: "compassionate", depth: "comprehensive", style: "contemporary" },
    languages: ["en", "es", "it", "zh"],
    birthBazi: { /* optional */ }
  })
});
const fullReading = await complete.json();
```

## Query Focus Requirement

**CRITICAL**: All AI prompts include explicit instructions that EVERY section must connect to the user's question.

### Example Query Connections:
- **Career Question**: Hexagram 1 → "This creative energy supports new ventures"
- **Relationship Question**: Hexagram 31 → "Attraction requires mutual response"
- **Health Question**: Hexagram 27 → "Nourishment of body and spirit"

## Error Handling

Each phase has specific error codes:
- `PHASE1_ERROR`: Technical analysis failed
- `PHASE2_ERROR`: Modern interpretation failed  
- `PHASE3_ERROR`: Remedies generation failed
- `COMPLETE_ERROR`: Full pipeline failed

## PDF Export Fixed

The PDF export has been enhanced with:
- Null/undefined checking
- Better error messages
- Stack traces for debugging
- Sanitized input validation

## Migration Guide

### From Old API:
```javascript
// Old way
const response = await fetch('/interpret-modular', {...});
```

### To New API:
```javascript
// New way - Complete pipeline
const response = await fetch('/interpret-complete', {
  ...oldBody,
  personality: { tone: "compassionate", depth: "standard", style: "contemporary" },
  languages: ["en", "es", "it"]
});

// Or step-by-step for progressive loading
const phase1 = await fetch('/interpret-phase1', {...});
showTechnicalView(phase1.data);

const phase2 = await fetch('/interpret-phase2', {...});
showModernView(phase2.data);

const phase3 = await fetch('/interpret-phase3', {...});
showRemediesView(phase3.data);
```

## Performance

- Phase 1: ~2-3 seconds (technical analysis)
- Phase 2: ~3-5 seconds (multi-language interpretation)
- Phase 3: ~1-2 seconds (remedies selection)
- Complete: ~6-10 seconds (all phases)

## Caching

- Phase 1 results cached for 10 minutes (same hexagram/question)
- Phase 2 cached per personality/language combination
- Phase 3 cached per focus type

## References

- `interpretation_schemas.ts` - Full TypeScript interfaces
- `INTEGRATION_README.md` - Database documentation
- `DATABASE_DOCUMENTATION.md` - Fulu/Fuzhou sources
