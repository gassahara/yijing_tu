const fs = require('fs');

let uiJs = fs.readFileSync('ui.js', 'utf8');
const outputTxt = fs.readFileSync('output.txt', 'utf8');

const lastBraceIndex = uiJs.lastIndexOf('}');

const extractFunc = (funcName) => {
    const startStr = `    static ${funcName}(`;
    const startIndex = outputTxt.indexOf(startStr);
    if (startIndex === -1) {
        console.log("Could not find", funcName);
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

let toInject = '';
toInject += extractFunc('renderBaziComparison');
toInject += extractFunc('renderBaguaStrip');
toInject += extractFunc('renderBaguaMedicineLoading');
toInject += extractFunc('renderBaguaMedicineError');

const newUiJs = uiJs.substring(0, lastBraceIndex) + '\n' + toInject + uiJs.substring(lastBraceIndex);
fs.writeFileSync('ui.js', newUiJs);
console.log('Successfully patched Phase 2 missing functions into ui.js');
