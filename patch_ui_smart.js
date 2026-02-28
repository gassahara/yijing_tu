const fs = require('fs');

let uiJs = fs.readFileSync('ui.js', 'utf8');
const outputTxt = fs.readFileSync('output.txt', 'utf8');

// Find the UI class block in output.txt
const classStart = outputTxt.indexOf('class UI {');
if (classStart === -1) { console.error("UI class not found in backup"); process.exit(1); }

// Walk forward to find the matching closing brace of class UI
let bracketCount = 0;
let i = classStart;
let foundFirst = false;
let classEnd = -1;
while(i < outputTxt.length) {
    if(outputTxt[i] === '{') { foundFirst = true; bracketCount++; }
    if(outputTxt[i] === '}') { bracketCount--; }
    if(foundFirst && bracketCount === 0) { classEnd = i; break; }
    i++;
}

if (classEnd === -1) { console.error("Could not find end of UI class"); process.exit(1); }

const uiClassBlock = outputTxt.substring(classStart, classEnd + 1);
console.log(`UI class block: chars ${classStart} to ${classEnd}, length: ${uiClassBlock.length}`);

// Get all method names within the UI class block
const backupMethods = new Set(
    [...uiClassBlock.matchAll(/    static ([a-zA-Z0-9]+)\(/g)].map(m => m[1])
);

// Get current methods in ui.js
const currentMethods = new Set(
    [...uiJs.matchAll(/    static ([a-zA-Z0-9]+)\(/g)].map(m => m[1])
);

const missing = [...backupMethods].filter(fn => !currentMethods.has(fn));
console.log(`Missing ${missing.length} methods:`, missing.join(', '));

// Extract each from within the UI class block
const extractFunc = (funcName) => {
    const startStr = `    static ${funcName}(`;
    let startIndex = uiClassBlock.indexOf(startStr);
    if (startIndex === -1) return '';
    
    let bracketCount = 0;
    let i = startIndex;
    let foundFirst = false;
    while(i < uiClassBlock.length) {
        if(uiClassBlock[i] === '{') { foundFirst = true; bracketCount++; }
        if(uiClassBlock[i] === '}') { bracketCount--; }
        if(foundFirst && bracketCount === 0) {
            return '\n' + uiClassBlock.substring(startIndex, i + 1) + '\n';
        }
        i++;
    }
    return '';
};

let toInject = '';
for (const fn of missing) {
    const code = extractFunc(fn);
    if (code) {
        console.log('Restoring:', fn);
        toInject += code;
    } else {
        console.log('Could not extract:', fn);
    }
}

const lastBraceIndex = uiJs.lastIndexOf('}');
const newUiJs = uiJs.substring(0, lastBraceIndex) + toInject + '\n' + uiJs.substring(lastBraceIndex);
fs.writeFileSync('ui.js', newUiJs);
console.log('Done.');
