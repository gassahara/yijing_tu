const fs = require('fs');

let uiJs = fs.readFileSync('ui.js', 'utf8');
const outputTxt = fs.readFileSync('output.txt', 'utf8');

// Find the last closing brace in ui.js which closes class UI
const lastBraceIndex = uiJs.lastIndexOf('}');

// Extract the needed functions from output.txt
// Specifically renderRemedies, renderRemediesLoading, renderRemediesError, renderBaguaMedicine
// Let's use regex to grab them
const extractFunc = (funcName) => {
    const startStr = `    static ${funcName}(`;
    const startIndex = outputTxt.indexOf(startStr);
    if (startIndex === -1) return '';
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

let toInject = '';
toInject += extractFunc('renderRemedies');
toInject += extractFunc('renderRemediesLoading');
toInject += extractFunc('renderRemediesError');
toInject += extractFunc('renderBaguaMedicine');

// Let's check if renderHoutouDiagram is in output.txt
toInject += extractFunc('renderHoutouDiagram');

// Insert into ui.js before the last brace
const newUiJs = uiJs.substring(0, lastBraceIndex) + '\n' + toInject + uiJs.substring(lastBraceIndex);
fs.writeFileSync('ui.js', newUiJs);
console.log('Successfully patched missing functions into ui.js');
