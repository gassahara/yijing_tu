// Test contrast ratios
function parseColor(color) {
    if (!color || typeof color !== 'string') return null;
    const hex = color.replace('#', '');
    if (hex.length === 3) {
        return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
    }
    if (hex.length >= 6) {
        return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
    }
    return null;
}

function luminance([r, g, b]) {
    const c = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrastRatio(fg, bg) {
    const fgRgb = parseColor(fg);
    const bgRgb = parseColor(bg);
    if (!fgRgb || !bgRgb) return 1;
    const L1 = Math.max(luminance(fgRgb), luminance(bgRgb));
    const L2 = Math.min(luminance(fgRgb), luminance(bgRgb));
    return (L1 + 0.05) / (L2 + 0.05);
}

console.log('Red (#CC0000) on Beige (#F5E6CA):', contrastRatio('#CC0000', '#F5E6CA').toFixed(2));
console.log('Red (#CC0000) on Yellow (#FFD700):', contrastRatio('#CC0000', '#FFD700').toFixed(2));
console.log('Black (#000000) on Yellow (#FFD700):', contrastRatio('#000000', '#FFD700').toFixed(2));
console.log('Dark Red (#8B0000) on Yellow (#FFD700):', contrastRatio('#8B0000', '#FFD700').toFixed(2));
console.log('---');
console.log('Threshold 1.5 - Red on Yellow passes?', contrastRatio('#CC0000', '#FFD700') > 1.5);
console.log('Threshold 3.0 - Red on Yellow passes?', contrastRatio('#CC0000', '#FFD700') > 3.0);
console.log('---');
console.log('Pure Red (#FF0000) on Yellow (#FFD700):', contrastRatio('#FF0000', '#FFD700').toFixed(2));
console.log('Threshold 1.5 - Pure Red on Yellow passes?', contrastRatio('#FF0000', '#FFD700') > 1.5);
