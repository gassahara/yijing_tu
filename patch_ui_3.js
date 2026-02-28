const fs = require('fs');

let uiJs = fs.readFileSync('ui.js', 'utf8');
const outputTxt = fs.readFileSync('output.txt', 'utf8');

const lastBraceIndex = uiJs.lastIndexOf('}');

const extractFunc = (funcName) => {
    // Try both "static funcName" and plain "funcName" (methods)
    const startStr = `    static ${funcName}(`;
    let startIndex = outputTxt.indexOf(startStr);
    if (startIndex === -1) {
        console.log("Could not find:", funcName);
        return '';
    }
    let bracketCount = 0;
    let i = startIndex;
    let foundFirst = false;
    while(i < outputTxt.length) {
        if(outputTxt[i] === '{') { foundFirst = true; bracketCount++; }
        if(outputTxt[i] === '}') { bracketCount--; }
        if(foundFirst && bracketCount === 0) {
            return outputTxt.substring(startIndex, i + 1) + '\n\n';
        }
        i++;
    }
    return '';
};

const missing = [
    'initFengShui',
    'hideAILoading',
    'hideLoading',
    'showLoading',
    'showError',
    'showSuccess',
    'renderFuluDrawing',
    'renderCharm',
    'generateFengShuiFDL',
    'openImageModal',
    'formatMarkdownInline',
    'formatParagraphs',
    'extractTitle',
    'removeTitle',
    'cleanRawText',
];

let toInject = '';
for (const fn of missing) {
    const code = extractFunc(fn);
    if (code) {
        console.log('Restored:', fn);
        toInject += code;
    }
}

const newUiJs = uiJs.substring(0, lastBraceIndex) + '\n' + toInject + uiJs.substring(lastBraceIndex);
fs.writeFileSync('ui.js', newUiJs);
console.log('Done. ui.js patched with remaining missing functions.');
