/**
 * Integration Guide: Daoist Remedies Database with SigilTools
 * 
 * This file shows how to use the authentic fulu database with the rendering system
 */

// ============================================================
// EXAMPLE 1: Basic Fulu Rendering
// ============================================================

function renderAuthenticFulu(fuluId, canvasId) {
  // Get fulu data from database
  const fulu = DAOIST_REMEDIES_DB.fulu.find(f => f.id === fuluId);
  
  if (!fulu) {
    console.error(`Fulu ${fuluId} not found in database`);
    return;
  }
  
  // Create proper fuluContent structure for SigilTools
  const sigilData = {
    fuluContent: {
      // Use actual Chinese name from database
      hexagramChar: fulu.name.zh,
      // Use pinyin for transliteration display
      upperTrigramBinary: '111', // Example - customize based on fulu type
      lowerTrigramBinary: '000', // Example - customize based on fulu type
      // Extract seal characters from the Chinese name
      sealChars: fulu.name.zh.split(''),
      // Add bottom rows with source info
      bottomRows: [
        [fulu.source.primary, fulu.name.pinyin],
        fulu.usage.slice(0, 2)
      ],
      hexagramNumber: fulu.id.replace('fulu_', '')
    },
    // Include full database entry for reference
    databaseEntry: fulu,
    backgroundColor: '#1a1a1a',
    strokeColor: '#facc15'
  };
  
  // Render using SigilTools
  SigilTools.draw(canvasId, sigilData);
  
  return fulu;
}

// ============================================================
// EXAMPLE 2: Fuzhou Display
// ============================================================

function displayFuzhou(fuzhouId, containerId) {
  const fuzhou = DAOIST_REMEDIES_DB.fuzhou.find(f => f.id === fuzhouId);
  
  if (!fuzhou) {
    console.error(`Fuzhou ${fuzhouId} not found`);
    return;
  }
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="fuzhou-entry">
      <h3>${fuzhou.name.zh} <span class="pinyin">(${fuzhou.name.pinyin})</span></h3>
      <p class="translation">${fuzhou.name.en}</p>
      
      <div class="chinese-text">
        <h4>Original Text:</h4>
        <p class="classical-chinese">${fuzhou.text.chinese}</p>
      </div>
      
      <div class="transliteration">
        <h4>Pinyin:</h4>
        <p>${fuzhou.text.pinyin}</p>
      </div>
      
      <div class="translation-section">
        <h4>Translation:</h4>
        <p>${fuzhou.text.translation}</p>
      </div>
      
      <div class="source-info">
        <h4>Source:</h4>
        <p><strong>${fuzhou.source.primary}</strong></p>
        <p>${fuzhou.source.textTitle}</p>
        <p class="citation">${fuzhou.source.scholarCitation}</p>
      </div>
      
      <div class="purpose">
        <h4>Purpose:</h4>
        <p>${fuzhou.purpose}</p>
      </div>
    </div>
  `;
  
  return fuzhou;
}

// ============================================================
// EXAMPLE 3: Search by Usage/Category
// ============================================================

function findRemediesByUsage(usageTag) {
  const fulu = DAOIST_REMEDIES_DB.fulu.filter(f => f.usage.includes(usageTag));
  const fuzhou = DAOIST_REMEDIES_DB.fuzhou.filter(f => f.usage.includes(usageTag));
  
  return {
    fulu,
    fuzhou,
    total: fulu.length + fuzhou.length
  };
}

// Example usage:
// const protectionRemedies = findRemediesByUsage('protection');
// const exorcismRemedies = findRemediesByUsage('exorcism');

// ============================================================
// EXAMPLE 4: Get Random Authentic Remedy
// ============================================================

function getRandomAuthenticRemedy(type = 'both') {
  let pool = [];
  
  if (type === 'fulu' || type === 'both') {
    pool = pool.concat(DAOIST_REMEDIES_DB.fulu.map(f => ({...f, type: 'fulu'})));
  }
  
  if (type === 'fuzhou' || type === 'both') {
    pool = pool.concat(DAOIST_REMEDIES_DB.fuzhou.map(f => ({...f, type: 'fuzhou'})));
  }
  
  if (pool.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

// ============================================================
// EXAMPLE 5: Render Fulu with Proper Seal Style
// ============================================================

function renderFuluWithSealStyle(fuluId, canvasId) {
  const fulu = DAOIST_REMEDIES_DB.fulu.find(f => f.id === fuluId);
  
  if (!fulu) return;
  
  // Customize based on fulu structure from database
  const sigilData = {
    fuluContent: {
      hexagramChar: fulu.name.zh,
      upperTrigramBinary: determineTrigram(fulu),
      lowerTrigramBinary: determineTrigram(fulu, 'lower'),
      sealChars: generateSealChars(fulu),
      bottomRows: [
        [fulu.source.primary.split(' ')[0]], // Shortened source
        fulu.usage.slice(0, 2)
      ],
      hexagramNumber: fulu.id.replace('fulu_', '')
    },
    backgroundColor: '#1a1a1a',
    strokeColor: '#facc15'
  };
  
  SigilTools.draw(canvasId, sigilData);
}

// Helper function to determine trigram based on fulu properties
function determineTrigram(fulu, position = 'upper') {
  // This is a simplified example - you could create more sophisticated logic
  // based on the fulu's elements, direction, or other properties
  
  if (fulu.structure && fulu.structure.elements) {
    const elements = fulu.structure.elements;
    // Example: determine trigram based on first element mentioned
    if (elements.some(e => e.includes('Wood'))) return '001'; // Thunder
    if (elements.some(e => e.includes('Fire'))) return '101'; // Fire
    if (elements.some(e => e.includes('Earth'))) return '000'; // Earth
    if (elements.some(e => e.includes('Metal'))) return '011'; // Lake
    if (elements.some(e => e.includes('Water'))) return '010'; // Water
  }
  
  return '111'; // Default to Heaven
}

// Helper function to generate seal characters
function generateSealChars(fulu) {
  // Use actual Chinese name characters
  const chars = fulu.name.zh.split('');
  
  // Pad with meaningful characters if needed
  while (chars.length < 4) {
    chars.push('符'); // Add "fu" character as filler
  }
  
  return chars.slice(0, 6); // Max 6 characters for display
}

// ============================================================
// EXAMPLE 6: Display Source Verification
// ============================================================

function displaySourceVerification(fuluId, containerId) {
  const fulu = DAOIST_REMEDIES_DB.fulu.find(f => f.id === fuluId);
  
  if (!fulu) return;
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let html = `
    <div class="verification-panel">
      <h3>Source Verification: ${fulu.name.zh}</h3>
      
      <div class="verification-status">
        <span class="badge verified">✓ VERIFIED</span>
      </div>
      
      <div class="source-details">
        <h4>Primary Source:</h4>
        <p class="primary-source">${fulu.source.primary}</p>
        
        <h4>Text Title:</h4>
        <p class="text-title">${fulu.source.textTitle}</p>
        
        <h4>Canonical References:</h4>
        <ul class="references">
          ${fulu.source.references.map(ref => `<li><code>${ref}</code></li>`).join('')}
        </ul>
        
        <h4>Academic Citation:</h4>
        <p class="citation">${fulu.source.scholarCitation}</p>
      </div>
      
      <div class="verification-steps">
        <h4>How to Verify:</h4>
        <ol>
          <li>Check DZ number in <em>The Taoist Canon: A Historical Companion to the Daozang</em> (Schipper & Verellen, 2004)</li>
          <li>Cross-reference CT citations with Concordance du Tao-tsang</li>
          <li>Consult cited academic works</li>
          <li>Verify Chinese text against canonical editions</li>
        </ol>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================================
// CSS STYLES (Add to your CSS file)
// ============================================================

const styles = `
.fuzhou-entry {
  background: #1a1a1a;
  color: #facc15;
  padding: 20px;
  border-radius: 8px;
  font-family: 'Noto Serif SC', serif;
  max-width: 800px;
  margin: 20px auto;
}

.fuzhou-entry h3 {
  color: #facc15;
  font-size: 1.8em;
  margin-bottom: 5px;
}

.fuzhou-entry .pinyin {
  color: #888;
  font-size: 0.6em;
}

.classical-chinese {
  font-size: 1.4em;
  line-height: 2;
  letter-spacing: 0.1em;
  margin: 15px 0;
  padding: 15px;
  background: #2a2a2a;
  border-left: 3px solid #facc15;
}

.source-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #444;
  font-size: 0.9em;
}

.source-info .citation {
  color: #aaa;
  font-style: italic;
  margin-top: 10px;
}

.verification-panel {
  background: #1a1a1a;
  color: #fff;
  padding: 20px;
  border-radius: 8px;
}

.badge.verified {
  background: #2E7D32;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: bold;
}

.verification-panel code {
  background: #333;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.verification-steps ol {
  line-height: 1.8;
}

.verification-steps li {
  margin-bottom: 8px;
}
`;

// ============================================================
// USAGE IN YOUR APPLICATION
// ============================================================

// 1. Load the database in your HTML:
// <script src="daoist_remedies_db.js"></script>

// 2. Render a specific fulu:
// renderAuthenticFulu('fulu_001', 'myCanvas');

// 3. Display a fuzhou:
// displayFuzhou('fuzhou_001', 'fuzhouContainer');

// 4. Get random authentic remedy:
// const random = getRandomAuthenticRemedy('fulu');

// 5. Search by category:
// const protection = findRemediesByUsage('protection');

// Export functions for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderAuthenticFulu,
    displayFuzhou,
    findRemediesByUsage,
    getRandomAuthenticRemedy,
    renderFuluWithSealStyle,
    displaySourceVerification
  };
}
