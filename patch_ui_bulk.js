const fs = require('fs');

let uiJs = fs.readFileSync('ui.js', 'utf8');
const outputTxt = fs.readFileSync('output.txt', 'utf8');

// Get current methods
const current = new Set(
    [...uiJs.matchAll(/    static ([a-zA-Z0-9]+)\(/g)].map(m => m[1])
);

// Get all methods from backup
const allBackup = [...outputTxt.matchAll(/    static ([a-zA-Z0-9]+)\(/g)].map(m => m[1]);
// Unique and only those missing from current
const missing = [...new Set(allBackup)].filter(fn => !current.has(fn));

console.log(`Found ${missing.length} missing methods:`, missing.join(', '));

const extractFunc = (funcName) => {
    const startStr = `    static ${funcName}(`;
    let startIndex = outputTxt.indexOf(startStr);
    if (startIndex === -1) return '';
    let bracketCount = 0;
    let i = startIndex;
    let foundFirst = false;
    while(i < outputTxt.length) {
        if(outputTxt[i] === '{') { foundFirst = true; bracketCount++; }
        if(outputTxt[i] === '}') { bracketCount--; }
        if(foundFirst && bracketCount === 0) {
            return '    ' + outputTxt.substring(startIndex, i + 1).trim() + '\n\n';
        }
        i++;
    }
    return '';
};

let toInject = '';
for (const fn of missing) {
    const code = extractFunc(fn);
    if (code) toInject += code;
}

const lastBraceIndex = uiJs.lastIndexOf('}');
const newUiJs = uiJs.substring(0, lastBraceIndex) + '\n' + toInject + uiJs.substring(lastBraceIndex);
fs.writeFileSync('ui.js', newUiJs);
console.log('Done. All missing methods injected.');
