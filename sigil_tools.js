/**
 * SigilTools - Specialized canvas drawing utilities for Daoist Fulu (Talismans)
 */
class SigilTools {
    static draw(canvasId, sigilData, verbosity = 0) {
        console.log(`[SigilTools.draw] Starting draw for ${canvasId}`, sigilData ? 'has data' : 'no data');
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`[SigilTools.draw] Canvas ${canvasId} not found`);
            return;
        }

        // Check if canvas or any parent is hidden
        let elem = canvas;
        let isHidden = false;
        while (elem) {
            const style = window.getComputedStyle(elem);
            if (style.display === 'none' || style.visibility === 'hidden') {
                isHidden = true;
                break;
            }
            elem = elem.parentElement;
        }

        if (isHidden) {
            console.log(`[SigilTools.draw] Canvas ${canvasId} is hidden, waiting for visibility...`);
            // Wait longer and check less frequently
            setTimeout(() => this.draw(canvasId, sigilData, verbosity), 500);
            return;
        }

        let rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            console.log(`[SigilTools.draw] Canvas ${canvasId} has zero size (${rect.width}x${rect.height}), retrying...`);
            setTimeout(() => this.draw(canvasId, sigilData, verbosity), 200);
            return;
        }

        console.log(`[SigilTools.draw] Canvas ${canvasId} size: ${rect.width}x${rect.height}`);

        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.scale(dpr, dpr);
        const logicalW = rect.width;
        const logicalH = rect.height;

        const { fuluContent, sigilInstructions, fdl, backgroundColor, strokeColor } = sigilData;

        // Clear and Background
        ctx.clearRect(0, 0, logicalW, logicalH);

        // 1. Background — FDL background takes priority, then explicit, then dark default
        const fdlBg = fdl ? this.normalizeColor(fdl.background) : null;
        const bg = fdlBg || backgroundColor || '#0a0a0a';
        console.log('[BG-DEBUG]', 'fdlBg:', fdlBg, 'bg:', bg, 'fdl?.background:', fdl?.background);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, logicalW, logicalH);

        // 2. Glow — auto-derive contrasting stroke from actual background
        const stroke = strokeColor || this.contrastColor(bg) || '#d4af37';
        const grad = ctx.createRadialGradient(logicalW / 2, logicalH / 2, 0, logicalW / 2, logicalH / 2, logicalW / 2);
        grad.addColorStop(0, `${stroke}15`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, logicalW, logicalH);

        // 3. FDL or Instructions or Fallback
        console.log(`[SigilTools.draw] FDL check:`, fdl ? `has FDL with ${fdl.layers?.length || 0} layers` : 'no FDL', 'bg:', bg, 'stroke:', stroke);
        if (fdl) {
            // Override any explicit command colors that would be low-contrast on this background
            this._recolorFDLForBg(fdl, bg, stroke);
            console.log(`[SigilTools.draw] Calling drawFDL with stroke: ${stroke}`);
            this.drawFDL(ctx, logicalW, logicalH, fdl, stroke);
        } else if (sigilInstructions) {
            // Legacy handling if needed
        } else if (fuluContent) {
            // Fallback: render talisman name / seal characters when no FDL available
            console.log(`[SigilTools.draw] Drawing Fulu placeholder`);
            this._drawFuluPlaceholder(ctx, logicalW, logicalH, fuluContent, stroke);
        } else {
            // Last resort: draw something so user knows it's a Fulu
            console.log(`[SigilTools.draw] Drawing default placeholder`);
            this._drawDefaultPlaceholder(ctx, logicalW, logicalH, stroke);
        }

        // 4. Border
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.3;
        ctx.strokeRect(8, 8, logicalW - 16, logicalH - 16);
        ctx.globalAlpha = 1.0;
    }

    static normalizeColor(color) {
        if (!color) return color;
        if (typeof color !== 'string') return null;
        if (color.startsWith('#') || color.startsWith('rgb')) return color;
        if (/^[0-9a-fA-F]{3,8}$/.test(color)) return '#' + color;
        return color;
    }

    /**
     * Derive a contrasting ink color for a given background.
     * Light backgrounds → dark ink; dark backgrounds → gold ink.
     */
    static contrastColor(bgColor) {
        if (!bgColor || typeof bgColor !== 'string') return '#d4af37';
        try {
            let hex = bgColor.replace('#', '');
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            if (hex.length < 6) return '#d4af37';
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            // Light bg → dark red/black ink; Dark bg → gold ink
            return luminance > 0.5 ? '#1a0a0a' : '#d4af37';
        } catch (e) {
            return '#d4af37';
        }
    }

    /**
     * Parse a hex/rgb color string → [r, g, b] 0-255. Returns null on failure.
     */
    static _parseColor(color) {
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

    /** WCAG relative luminance for a parsed [r,g,b] triple */
    static _luminance([r, g, b]) {
        const c = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }

    /** WCAG contrast ratio between two hex colors (≥ 4.5 = AA compliant) */
    static _contrastRatio(fg, bg) {
        const fgRgb = this._parseColor(fg);
        const bgRgb = this._parseColor(bg);
        if (!fgRgb || !bgRgb) return 1;
        const L1 = Math.max(this._luminance(fgRgb), this._luminance(bgRgb));
        const L2 = Math.min(this._luminance(fgRgb), this._luminance(bgRgb));
        return (L1 + 0.05) / (L2 + 0.05);
    }

    /**
     * Walk all FDL layer commands and replace any explicit color that has
     * contrast ratio < 3.0 against the canvas background with the stroke color.
     * This fixes gold/yellow text on yellow backgrounds, etc.
     */
    static _recolorFDLForBg(fdl, bg, stroke) {
        if (!fdl?.layers) return;
        const MIN_RATIO = 1.5; // Lower threshold to allow traditional red ink on beige paper
        const fixColor = (color, context = '') => {
            if (!color || color === 'transparent' || color === 'none') return color;
            const ratio = this._contrastRatio(color, bg);
            const shouldReplace = ratio < MIN_RATIO;
            console.log(`[_recolorFDLForBg] ${context}: color=${color} bg=${bg} ratio=${ratio.toFixed(2)} min=${MIN_RATIO} replace=${shouldReplace}`);
            return shouldReplace ? stroke : color;
        };
        fdl.layers.forEach((layer, li) => {
            if (!layer.commands) return;
            layer.commands.forEach((cmd, ci) => {
                if (cmd.style) {
                    if (cmd.style.color) cmd.style.color = fixColor(cmd.style.color, `layer${li}.cmd${ci}.style.color`);
                    if (cmd.style.stroke) cmd.style.stroke = fixColor(cmd.style.stroke, `layer${li}.cmd${ci}.style.stroke`);
                    // Don't override transparent/semi-transparent fills (sector highlights)
                    if (cmd.style.fill && !cmd.style.fill.endsWith('40') && !cmd.style.fill.endsWith('30')) {
                        cmd.style.fill = fixColor(cmd.style.fill, `layer${li}.cmd${ci}.style.fill`);
                    }
                }
                if (cmd.label?.color) cmd.label.color = fixColor(cmd.label.color, `layer${li}.cmd${ci}.label.color`);
            });
        });
    }

    // ========================================================================
    // ADVANCED DIAGRAMS
    // ========================================================================

    static drawBagua(ctx, cx, cy, size, style = {}, stroke) {
        ctx.save();

        const r = size / 2;
        const octR = r * 0.95; // Octagon radius
        const textR = r * 1.15; // Label radius

        // Draw Octagon Frame
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI / 4) - Math.PI / 8;
            const x = cx + Math.cos(angle) * octR;
            const y = cy + Math.sin(angle) * octR;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Inner Circle (Taiji boundary)
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Trigram Definitions (Houtian - Later Heaven arrangement)
        // Standard Houtian arrangement with SOUTH at TOP (traditional Chinese view)
        // Li (Fire) at South/Top, Kan (Water) at North/Bottom
        // Zhen (Thunder) at East/Right, Dui (Lake) at West/Left
        // Canvas: -PI/2 = Top, 0 = Right, PI/2 = Bottom, PI = Left.
        const trigrams = [
            { name: 'Li', chinese: '離', dir: 'S', bin: [1, 0, 1], angle: -Math.PI / 2, branches: ['午'] }, // South = Top
            { name: 'Kun', chinese: '坤', dir: 'SW', bin: [0, 0, 0], angle: -3 * Math.PI / 4, branches: ['未', '申'] }, // SW
            { name: 'Dui', chinese: '兌', dir: 'W', bin: [0, 1, 1], angle: Math.PI, branches: ['酉'] }, // West = Left
            { name: 'Qian', chinese: '乾', dir: 'NW', bin: [1, 1, 1], angle: 3 * Math.PI / 4, branches: ['戌', '亥'] }, // NW
            { name: 'Kan', chinese: '坎', dir: 'N', bin: [0, 1, 0], angle: Math.PI / 2, branches: ['子'] }, // North = Bottom
            { name: 'Gen', chinese: '艮', dir: 'NE', bin: [1, 0, 0], angle: Math.PI / 4, branches: ['丑', '寅'] }, // NE
            { name: 'Zhen', chinese: '震', dir: 'E', bin: [0, 0, 1], angle: 0, branches: ['卯'] }, // East = Right
            { name: 'Xun', chinese: '巽', dir: 'SE', bin: [1, 1, 0], angle: -Math.PI / 4, branches: ['辰', '巳'] } // SE
        ];

        // Highlight Logic
        const activeSet = new Set();
        if (style.activeTrigrams && Array.isArray(style.activeTrigrams)) {
            // style.activeTrigrams should be array of english names e.g., ['Heaven', 'Earth'] or binary strings
            style.activeTrigrams.forEach(t => activeSet.add(t));
        }

        const triW = size * 0.15;
        const triH = size * 0.12;

        trigrams.forEach(t => {
            const isHighlighted = activeSet.has(t.name) || activeSet.has(t.bin.join('')) || activeSet.has(t.chinese);

            const x = cx + Math.cos(t.angle) * (r * 0.65);
            const y = cy + Math.sin(t.angle) * (r * 0.65);

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(t.angle + Math.PI / 2);

            // Draw Trigram Lines
            const gap = triH / 3;
            const lineW = triW;
            const halfW = lineW / 2;
            const yStart = -triH / 2;

            ctx.strokeStyle = isHighlighted ? '#FF4500' : stroke; // Red-Orange if active
            ctx.lineWidth = isHighlighted ? 4 : 2;
            if (isHighlighted) {
                ctx.shadowColor = '#FF4500';
                ctx.shadowBlur = 10;
            } else {
                ctx.shadowBlur = 0;
            }

            // Draw lines (Bottom line is index 0 in visual stack usually, but array is [Top, Mid, Bottom]?)
            // Houtian arrays above: Li [1,0,1]. Dui [0,1,1] (Top broken, Mid solid, Bot solid).
            // Let's render top-down.
            t.bin.forEach((line, i) => {
                const ly = yStart + i * gap;
                ctx.beginPath();
                if (line === 1) {
                    ctx.moveTo(-halfW, ly);
                    ctx.lineTo(halfW, ly);
                } else {
                    ctx.moveTo(-halfW, ly);
                    ctx.lineTo(-halfW * 0.2, ly);
                    ctx.moveTo(halfW * 0.2, ly);
                    ctx.lineTo(halfW, ly);
                }
                ctx.stroke();
            });
            ctx.restore();

            // Draw Trigram Name (Chinese) inside
            ctx.fillStyle = isHighlighted ? '#FF4500' : stroke;
            ctx.font = `bold ${size * 0.08}px "Noto Serif SC", serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const charX = cx + Math.cos(t.angle) * (r * 0.4);
            const charY = cy + Math.sin(t.angle) * (r * 0.4);
            ctx.fillText(t.chinese, charX, charY);

            // Draw Earthly Branches (Hours) outside
            if (t.branches) {
                ctx.font = `${size * 0.05}px "Noto Serif SC", serif`;
                ctx.fillStyle = stroke; // Use stroke color for visibility

                // If 1 branch (Cardinals), place straight out
                // If 2 branches (Intercardinals), split angles
                if (t.branches.length === 1) {
                    const bx = cx + Math.cos(t.angle) * textR;
                    const by = cy + Math.sin(t.angle) * textR;
                    ctx.fillText(t.branches[0], bx, by);
                } else {
                    const spread = Math.PI / 12; // 15 degrees
                    const b1x = cx + Math.cos(t.angle - spread) * textR;
                    const b1y = cy + Math.sin(t.angle - spread) * textR;
                    ctx.fillText(t.branches[0], b1x, b1y);

                    const b2x = cx + Math.cos(t.angle + spread) * textR;
                    const b2y = cy + Math.sin(t.angle + spread) * textR;
                    ctx.fillText(t.branches[1], b2x, b2y);
                }
            }
        });

        // Compass direction labels (N, S, E, W) at the outer edge
        ctx.fillStyle = stroke;
        ctx.font = `bold ${size * 0.055}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const compassR = r * 1.28;
        const compassDirs = [
            { label: 'S', angle: -Math.PI / 2 },
            { label: 'E', angle: 0 },
            { label: 'N', angle: Math.PI / 2 },
            { label: 'W', angle: Math.PI }
        ];
        compassDirs.forEach(d => {
            ctx.fillText(d.label, cx + Math.cos(d.angle) * compassR, cy + Math.sin(d.angle) * compassR);
        });

        // Center Symbol (Taijitu)
        this.drawTaijitu(ctx, cx, cy, r * 0.25, stroke);

        ctx.restore();
    }

    static drawTaijitu(ctx, x, y, r, color) {
        ctx.save();
        ctx.translate(x, y);

        // Determine yang/yin colors based on the stroke color brightness
        // Light stroke (gold) → dark background → use white yang / dark yin
        // Dark stroke → use dark yang / white yin
        const yinColor = '#000000';
        const yangColor = '#FFFFFF';
        const dotR = r / 6; // Standard dot size (1/6 of main radius)

        // 1. Clip all drawing to the outer circle boundary (ensures perfect diametric symmetry)
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();

        // 2. Fill entire circle with yang (white) color as base
        ctx.fillStyle = yangColor;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // 3. Fill yin (dark) S-shaped half using the classic diametric S-curve:
        //    - Right semicircle of outer circle (top → bottom, clockwise)
        //    - Upper half of bottom small circle (counterclockwise, subtracts bump)
        //    - Lower half of top small circle (clockwise, adds bump)
        //    Result: exactly 50% of the circle area, diametrically balanced.
        ctx.fillStyle = yinColor;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false); // right semicircle
        ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);  // upper half of bottom small ⊙ (CCW)
        ctx.arc(0, -r / 2, r / 2, -Math.PI / 2, Math.PI / 2, false); // lower half of top small ⊙ (CW)
        ctx.closePath();
        ctx.fill();

        // 4. Yang dot inside yin half (at bottom centre of yin region)
        ctx.fillStyle = yangColor;
        ctx.beginPath();
        ctx.arc(0, r / 2, dotR, 0, Math.PI * 2);
        ctx.fill();

        // 5. Yin dot inside yang half (at top centre of yang region)
        ctx.fillStyle = yinColor;
        ctx.beginPath();
        ctx.arc(0, -r / 2, dotR, 0, Math.PI * 2);
        ctx.fill();

        // 6. Restore clip and draw outer border ring
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, r * 0.04);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // 7. S-dividing line (thin inner boundary for clarity)
        ctx.strokeStyle = 'rgba(128,128,128,0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
        ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
        ctx.arc(0, -r / 2, r / 2, -Math.PI / 2, Math.PI / 2, false);
        ctx.stroke();

        ctx.restore();
    }

    // Stub for Bazi diagram if needed by other files, leveraging Bagua
    static drawBaziDiagram(ctx, cx, cy, size, pillars, stroke) {
        this.drawBagua(ctx, cx, cy, size, {}, stroke);
        // ... pillar drawing logic (simplified for this patch) ...
    }

    // ========================================================================
    // FDL (Fulu Drawing Language) RENDERER
    // Processes layers and commands from FS-DGL spec or AI-generated FDL
    // ========================================================================

    static drawFDL(ctx, w, h, fdl, stroke) {
        console.log(`[SigilTools.drawFDL] Called with w=${w}, h=${h}, layers=${fdl?.layers?.length}`);
        if (!fdl || !fdl.layers) {
            console.warn(`[SigilTools.drawFDL] No FDL or no layers`);
            return;
        }

        const cx = w / 2;
        const cy = h / 2;
        const baseSize = Math.min(w, h) * 0.85;

        // Resolve trigram position on the canvas given a trigram name or direction
        // Houtian (Later Heaven) arrangement: SOUTH at TOP
        // Li=South=Top, Kan=North=Bottom, Zhen=East=Right, Dui=West=Left
        const trigramAngles = {
            'Li': -Math.PI / 2, 'S': -Math.PI / 2,        // South at top
            'Xun': -Math.PI / 4, 'SE': -Math.PI / 4,      // SE at top-right
            'Zhen': 0, 'E': 0,                            // East at right
            'Gen': Math.PI / 4, 'NE': Math.PI / 4,        // NE at bottom-right
            'Kan': Math.PI / 2, 'N': Math.PI / 2,         // North at bottom
            'Qian': 3 * Math.PI / 4, 'NW': 3 * Math.PI / 4, // NW at bottom-left
            'Dui': Math.PI, 'W': Math.PI,                 // West at left
            'Kun': -3 * Math.PI / 4, 'SW': -3 * Math.PI / 4 // SW at top-left
        };

        const getTrigramPos = (name) => {
            const angle = trigramAngles[name];
            if (angle === undefined) return { x: cx, y: cy, angle: 0 };
            const r = baseSize * 0.35;
            return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, angle };
        };

        const getTrigramOuterPos = (name) => {
            const angle = trigramAngles[name];
            if (angle === undefined) return { x: cx, y: cy };
            const r = baseSize * 0.48;
            return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
        };

        // Scale coordinates from 1000x1000 virtual space to actual canvas
        const sx = (x) => (x / 1000) * w;
        const sy = (y) => (y / 1000) * h;

        // Draw base Bagua first if any layer requests it
        const hasBase = fdl.layers.some(l =>
            l.commands && l.commands.some(c => c.type === 'bagua')
        );
        if (hasBase || fdl.type === 'fengshui_diagram') {
            this.drawBagua(ctx, cx, cy, baseSize, {}, stroke);
        }

        // Process layers in order
        console.log(`[SigilTools.drawFDL] Processing ${fdl.layers.length} layers`);
        fdl.layers.forEach((layer, idx) => {
            if (!layer.commands || !Array.isArray(layer.commands)) {
                console.log(`[SigilTools.drawFDL] Layer ${idx}: no commands`);
                return;
            }
            console.log(`[SigilTools.drawFDL] Layer ${idx}: ${layer.commands.length} commands`);

            const layerOpacity = layer.opacity !== undefined ? layer.opacity : 1;
            ctx.save();
            ctx.globalAlpha = layerOpacity;

            layer.commands.forEach((cmd, cmdIdx) => {
                try {
                    console.log(`[SigilTools.drawFDL] Executing command ${cmdIdx}: ${cmd.type}`);
                    this._drawFDLCommand(ctx, cmd, { cx, cy, w, h, baseSize, stroke, sx, sy, getTrigramPos, getTrigramOuterPos });
                } catch (e) {
                    console.warn('[SigilTools:drawFDL] Command error:', cmd.type, e.message, e.stack);
                }
            });

            ctx.restore();
        });
    }

    static _drawFDLCommand(ctx, cmd, opts) {
        const { cx, cy, w, h, baseSize, stroke, sx, sy, getTrigramPos, getTrigramOuterPos } = opts;

        switch (cmd.type) {
            case 'bagua':
                // Already drawn in base pass
                break;

            case 'highlight_sector': {
                const trigramName = cmd.trigram || cmd.direction;
                if (!trigramName) break;
                const pos = getTrigramPos(trigramName);
                const r = baseSize * 0.15;
                const style = cmd.style || {};

                ctx.save();
                // Glow effect
                if (style.glow && style.glowColor) {
                    ctx.shadowColor = style.glowColor;
                    ctx.shadowBlur = style.glowRadius || 15;
                }

                // Fill sector arc
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, baseSize * 0.45, pos.angle - Math.PI / 8, pos.angle + Math.PI / 8);
                ctx.closePath();
                ctx.fillStyle = style.fill || `${stroke}30`;
                ctx.fill();
                ctx.strokeStyle = style.stroke || stroke;
                ctx.lineWidth = style.strokeWidth || 2;
                ctx.stroke();

                // Label (supports \n multi-line)
                if (cmd.label?.text) {
                    const labelPos = getTrigramOuterPos(trigramName);
                    ctx.fillStyle = cmd.label.color || stroke;
                    ctx.font = `bold ${cmd.label.fontSize || 12}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const labelLines = String(cmd.label.text).split('\n');
                    const labelLineH = (cmd.label.fontSize || 12) + 3;
                    const labelStartY = (labelPos.y - 8) - ((labelLines.length - 1) * labelLineH) / 2;
                    labelLines.forEach((line, i) => ctx.fillText(line.trim(), labelPos.x, labelStartY + i * labelLineH));
                    if (cmd.label.subtext) {
                        const subtextY = labelStartY + labelLines.length * labelLineH + 2;
                        ctx.font = `${(cmd.label.fontSize || 12) - 2}px sans-serif`;
                        ctx.globalAlpha = 0.7;
                        ctx.fillText(cmd.label.subtext, labelPos.x, subtextY);
                        ctx.globalAlpha = 1;
                    }
                }
                ctx.restore();
                break;
            }

            case 'instruction_marker': {
                const trigramName = cmd.trigram || cmd.direction;
                if (!trigramName) break;
                const pos = getTrigramPos(trigramName);
                const style = cmd.style || {};
                const markerSize = style.size || 24;
                const color = style.color || stroke;

                ctx.save();
                ctx.fillStyle = color;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;

                // Draw marker based on type
                if (style.markerType === 'star') {
                    this._drawStar(ctx, pos.x, pos.y, markerSize / 2, 5);
                } else if (style.markerType === 'triangle') {
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y - markerSize / 2);
                    ctx.lineTo(pos.x - markerSize / 2, pos.y + markerSize / 2);
                    ctx.lineTo(pos.x + markerSize / 2, pos.y + markerSize / 2);
                    ctx.closePath();
                    ctx.fill();
                } else if (style.markerType === 'arrow') {
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y - markerSize / 2);
                    ctx.lineTo(pos.x, pos.y + markerSize / 4);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(pos.x - 5, pos.y + markerSize / 4 - 5);
                    ctx.lineTo(pos.x, pos.y + markerSize / 4);
                    ctx.lineTo(pos.x + 5, pos.y + markerSize / 4 - 5);
                    ctx.stroke();
                } else {
                    // Default: diamond shape for instruction
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y - markerSize / 2);
                    ctx.lineTo(pos.x + markerSize / 2, pos.y);
                    ctx.lineTo(pos.x, pos.y + markerSize / 2);
                    ctx.lineTo(pos.x - markerSize / 2, pos.y);
                    ctx.closePath();
                    ctx.globalAlpha = 0.6;
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    ctx.stroke();
                }

                // Build instruction text from various formats
                let instructionText = '';
                if (cmd.label?.text) {
                    instructionText = cmd.label.text;
                } else if (cmd.instruction?.text) {
                    instructionText = cmd.instruction.text;
                } else if (cmd.instruction?.item) {
                    // Format: "Place {item} - {purpose}"
                    const action = cmd.instruction.action || 'Place';
                    const purpose = cmd.instruction.purpose || '';
                    instructionText = `${action} ${cmd.instruction.item}`;
                    if (purpose) instructionText += ` - ${purpose}`;
                }

                // Draw instruction text
                if (instructionText) {
                    ctx.fillStyle = cmd.label?.color || color;
                    ctx.font = `bold ${cmd.label?.fontSize || Math.max(10, baseSize * 0.032)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.globalAlpha = 0.9;

                    // Wrap text if too long
                    const maxWidth = baseSize * 0.25;
                    const words = instructionText.split(' ');
                    let line = '';
                    let lines = [];

                    for (let i = 0; i < words.length; i++) {
                        const testLine = line + words[i] + ' ';
                        const metrics = ctx.measureText(testLine);
                        if (metrics.width > maxWidth && i > 0) {
                            lines.push(line);
                            line = words[i] + ' ';
                        } else {
                            line = testLine;
                        }
                    }
                    lines.push(line);

                    // Draw lines
                    const lineHeight = (cmd.label?.fontSize || 12) * 1.2;
                    const startY = pos.y + markerSize / 2 + 8;
                    lines.forEach((line, i) => {
                        ctx.fillText(line.trim(), pos.x, startY + i * lineHeight);
                    });

                    ctx.globalAlpha = 1;
                }
                ctx.restore();
                break;
            }

            case 'connection_line': {
                const fromPos = getTrigramPos(cmd.from);
                const toPos = getTrigramPos(cmd.to);
                const style = cmd.style || {};
                ctx.save();
                ctx.strokeStyle = style.color || stroke;
                ctx.lineWidth = style.width || 1.5;
                if (style.dash) ctx.setLineDash(style.dash);
                ctx.beginPath();
                ctx.moveTo(fromPos.x, fromPos.y);
                ctx.lineTo(toPos.x, toPos.y);
                if (style.arrow) {
                    const arrowSize = style.arrowSize || 8;
                    const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
                    const headAngle = Math.PI / 6;
                    ctx.moveTo(toPos.x, toPos.y);
                    ctx.lineTo(
                        toPos.x - Math.cos(angle - headAngle) * arrowSize,
                        toPos.y - Math.sin(angle - headAngle) * arrowSize
                    );
                    ctx.moveTo(toPos.x, toPos.y);
                    ctx.lineTo(
                        toPos.x - Math.cos(angle + headAngle) * arrowSize,
                        toPos.y - Math.sin(angle + headAngle) * arrowSize
                    );
                }
                ctx.stroke();
                ctx.restore();
                break;
            }

            case 'annotation': {
                const style = cmd.style || {};
                let ax, ay;
                if (Array.isArray(cmd.position)) {
                    ax = sx(cmd.position[0]);
                    ay = sy(cmd.position[1]);
                } else if (cmd.position === 'top') {
                    ax = cx; ay = 20;
                } else if (cmd.position === 'bottom') {
                    ax = cx; ay = h - 20;
                } else {
                    ax = cx; ay = cy;
                }

                ctx.save();
                ctx.fillStyle = style.color || stroke;
                ctx.font = `bold ${style.fontSize || 14}px sans-serif`;
                ctx.textAlign = style.align || 'center';
                ctx.textBaseline = 'middle';

                if (cmd.text) {
                    const textLines = cmd.text.split('\n');
                    const lineH = (style.fontSize || 14) + 3;
                    if (style.background) {
                        const maxWidth = Math.max(...textLines.map(l => ctx.measureText(l.trim()).width));
                        const pad = 6;
                        const totalH = textLines.length * lineH;
                        ctx.fillStyle = style.background;
                        ctx.fillRect(ax - maxWidth / 2 - pad, ay - totalH / 2 - pad, maxWidth + pad * 2, totalH + pad * 2);
                        ctx.fillStyle = style.color || stroke;
                    }
                    const startY = ay - ((textLines.length - 1) * lineH) / 2;
                    textLines.forEach((line, i) => ctx.fillText(line.trim(), ax, startY + i * lineH));
                } else if (style.background) {
                    const metrics = ctx.measureText('');
                    const pad = 6;
                    ctx.fillStyle = style.background;
                    ctx.fillRect(ax - metrics.width / 2 - pad, ay - (style.fontSize || 14) / 2 - pad, metrics.width + pad * 2, (style.fontSize || 14) + pad * 2);
                    ctx.fillStyle = style.color || stroke;
                }

                if (cmd.subtext) {
                    ctx.font = `${(style.fontSize || 14) - 2}px sans-serif`;
                    ctx.globalAlpha = 0.7;
                    ctx.fillText(cmd.subtext, ax, ay + (style.fontSize || 14) + 4);
                    ctx.globalAlpha = 1;
                }
                ctx.restore();
                break;
            }

            case 'text': {
                const text = cmd.text || cmd.content || '';
                const tx = cmd.x !== undefined ? sx(cmd.x) : cx;
                const ty = cmd.y !== undefined ? sy(cmd.y) : cy;
                const tStyle = cmd.style || {};
                const fontSize = tStyle.fontSize || cmd.size || 16;
                const isVertical = cmd.font && cmd.font.includes('vertical');
                ctx.save();
                ctx.fillStyle = tStyle.color || stroke;
                // Add subtle shadow for better visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = fontSize * 0.1;
                ctx.shadowOffsetX = fontSize * 0.02;
                ctx.shadowOffsetY = fontSize * 0.02;
                ctx.font = `${tStyle.bold ? 'bold ' : ''}${fontSize}px "Noto Serif SC", serif`;
                ctx.textAlign = tStyle.align || 'center';
                ctx.textBaseline = tStyle.baseline || 'middle';
                if (isVertical) {
                    // Draw characters vertically (top to bottom)
                    const chars = text.split('');
                    const lineHeight = fontSize * 1.1;
                    const totalHeight = chars.length * lineHeight;
                    chars.forEach((char, i) => {
                        ctx.fillText(char, tx, ty - totalHeight/2 + i * lineHeight + lineHeight/2);
                    });
                } else {
                    ctx.fillText(text, tx, ty);
                }
                ctx.restore();
                break;
            }

            case 'mountain': {
                const mx = cmd.x !== undefined ? sx(cmd.x) : cx;
                const my = cmd.y !== undefined ? sy(cmd.y) : cy - baseSize * 0.35;
                const mSize = cmd.size ? sx(cmd.size) : baseSize * 0.15;
                ctx.save();
                const mStyle = cmd.style || {};
                ctx.strokeStyle = mStyle.color || stroke;
                ctx.lineWidth = mStyle.width ? mStyle.width : (baseSize > 400 ? 4 : 2);
                ctx.beginPath();
                ctx.moveTo(mx - mSize, my + mSize / 2);
                ctx.lineTo(mx - mSize / 2, my - mSize / 2);
                ctx.lineTo(mx, my + mSize / 4);
                ctx.lineTo(mx + mSize / 2, my - mSize / 2);
                ctx.lineTo(mx + mSize, my + mSize / 2);
                ctx.stroke();
                ctx.restore();
                break;
            }

            case 'taijitu': {
                const tx = cmd.x !== undefined ? sx(cmd.x) : cx;
                const ty = cmd.y !== undefined ? sy(cmd.y) : cy;
                const tSize = cmd.size ? sx(cmd.size) : baseSize * 0.1;
                ctx.save();
                const tStyle = cmd.style || {};
                ctx.strokeStyle = tStyle.color || stroke;
                ctx.fillStyle = tStyle.color || stroke;
                ctx.lineWidth = tStyle.width ? tStyle.width : (baseSize > 400 ? 4 : 2);
                ctx.beginPath();
                ctx.arc(tx, ty, tSize, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(tx, ty - tSize / 2, tSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(tx, ty + tSize / 2, tSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(tx, ty - tSize / 2, tSize / 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(tx, ty + tSize / 2, tSize / 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
                break;
            }

            case 'seal_char': {
                const chars = cmd.chars || ['符', '咒'];
                const scx = cmd.x !== undefined ? sx(cmd.x) : cx;
                const scy = cmd.y !== undefined ? sy(cmd.y) : cy;
                const scSize = cmd.size ? sx(cmd.size) : baseSize * 0.12;
                const scStyle = cmd.style || {};
                const cols = cmd.cols || Math.min(chars.length, 2);
                const rows = Math.ceil(chars.length / cols);
                ctx.save();
                ctx.fillStyle = scStyle.color || stroke;
                ctx.font = `bold ${scSize}px "Noto Serif SC", serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const scStartX = scx - ((cols - 1) * scSize * 1.2) / 2;
                const scStartY = scy - ((rows - 1) * scSize * 1.2) / 2;
                chars.forEach((char, i) => {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    ctx.fillText(char, scStartX + col * scSize * 1.2, scStartY + row * scSize * 1.2);
                });
                ctx.restore();
                break;
            }

            case 'rect': {
                const rx = cmd.x !== undefined ? sx(cmd.x) : cx;
                const ry = cmd.y !== undefined ? sy(cmd.y) : cy;
                const rw = cmd.w ? sx(cmd.w) : cmd.width ? sx(cmd.width) : baseSize * 0.2;
                const rh = cmd.h ? sy(cmd.h) : cmd.height ? sy(cmd.height) : baseSize * 0.1;
                const rStyle = cmd.style || {};
                ctx.save();
                ctx.strokeStyle = rStyle.color || stroke;
                ctx.lineWidth = rStyle.width || 2;
                if (rStyle.fill && rStyle.fill !== 'none') { ctx.fillStyle = rStyle.fill; ctx.fillRect(rx - rw / 2, ry - rh / 2, rw, rh); }
                ctx.strokeRect(rx - rw / 2, ry - rh / 2, rw, rh);
                ctx.restore();
                break;
            }

            case 'circle': {
                const ccx = cmd.x !== undefined ? sx(cmd.x) : cx;
                const ccy = cmd.y !== undefined ? sy(cmd.y) : cy;
                const cr = cmd.radius ? sx(cmd.radius) : cmd.size ? sx(cmd.size / 2) : baseSize * 0.1;
                const cStyle = cmd.style || {};
                ctx.save();
                ctx.strokeStyle = cStyle.color || stroke;
                ctx.lineWidth = cStyle.width || 2;
                if (cStyle.fill && cStyle.fill !== 'none') { ctx.fillStyle = cStyle.fill; ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, Math.PI * 2); ctx.fill(); }
                ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
                break;
            }

            case 'line': {
                const pts = cmd.points || [];
                if (pts.length < 2) break;
                const lStyle = cmd.style || {};
                ctx.save();
                ctx.strokeStyle = lStyle.color || stroke;
                ctx.lineWidth = lStyle.width || 2;
                ctx.beginPath();
                pts.forEach((pt, i) => {
                    const px = Array.isArray(pt) ? sx(pt[0]) : sx(pt.x);
                    const py = Array.isArray(pt) ? sy(pt[1]) : sy(pt.y);
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                });
                ctx.stroke();
                ctx.restore();
                break;
            }

            default:
                // Unknown command type — skip silently
                break;
        }
    }

    /**
     * Execute FDL command
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} cmd - FDL command
     * @param {string} stroke - Stroke color
     */
    static executeFDLCommand(ctx, cmd, stroke = "#d4af37") {
        if (!cmd || !cmd.type) return;

        const h = ctx.canvas.height;
        const w = ctx.canvas.width;
        const cx = w / 2;
        const cy = h / 2;
        const size = Math.min(w, h);

        // Helper function to scale coordinates
        const sx = (v) => v * (size / 1000);
        const sy = (v) => v * (size / 1000);

        switch (cmd.type) {
            case 'bagua': {
                const baguaX = cmd.cx !== undefined ? sx(cmd.cx) : cmd.x !== undefined ? sx(cmd.x) : sx(500);
                const baguaY = cmd.cy !== undefined ? sy(cmd.cy) : cmd.y !== undefined ? sy(cmd.y) : sy(500);
                const baguaSize = cmd.size !== undefined ? sx(cmd.size) : sx(400);
                this.drawBagua(ctx, baguaX, baguaY, baguaSize, cmd.style || {}, stroke);
                break;
            }

            case 'directional_lines':
                const center = cmd.center || [500, 500];
                const radius = cmd.radius || 400;
                ctx.save();
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 0.5;
                ctx.globalAlpha = 0.3;
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    ctx.beginPath();
                    ctx.moveTo(sx(center[0]), sy(center[1]));
                    ctx.lineTo(
                        sx(center[0]) + Math.cos(angle) * sx(radius),
                        sy(center[1]) + Math.sin(angle) * sy(radius)
                    );
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                ctx.restore();
                break;

            case 'highlight_sector': {
                // Fallback trigram definitions if FENG_SHUI_DGL_SPEC is not available
                const defaultTrigrams = [
                    { name: 'Li', direction: 'S', position: { x: 500, y: 150 }, color: '#F44336' },
                    { name: 'Xun', direction: 'SE', position: { x: 850, y: 150 }, color: '#8BC34A' },
                    { name: 'Zhen', direction: 'E', position: { x: 850, y: 500 }, color: '#4CAF50' },
                    { name: 'Gen', direction: 'NE', position: { x: 850, y: 850 }, color: '#00BCD4' },
                    { name: 'Kan', direction: 'N', position: { x: 500, y: 850 }, color: '#2196F3' },
                    { name: 'Qian', direction: 'NW', position: { x: 150, y: 850 }, color: '#FF9800' },
                    { name: 'Dui', direction: 'W', position: { x: 150, y: 500 }, color: '#FFC107' },
                    { name: 'Kun', direction: 'SW', position: { x: 150, y: 150 }, color: '#E91E63' }
                ];
                const trigrams = (typeof FENG_SHUI_DGL_SPEC !== 'undefined' && FENG_SHUI_DGL_SPEC.trigrams?.houtian) 
                    ? FENG_SHUI_DGL_SPEC.trigrams.houtian 
                    : defaultTrigrams;
                const trigram = trigrams.find(t => t.name === cmd.trigram || t.direction === cmd.direction);
                if (!trigram) break;

                const x = sx(trigram.position.x);
                const y = sy(trigram.position.y);
                const labelStyle = cmd.label || {};
                const style = cmd.style || {};

                // Draw highlight circle
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, sx(60), 0, Math.PI * 2);
                ctx.fillStyle = style.fill || (trigram.color + '40');
                ctx.fill();
                if (style.stroke) {
                    ctx.strokeStyle = style.stroke;
                    ctx.lineWidth = style.strokeWidth || 3;
                    if (style.glow) {
                        ctx.shadowColor = style.glowColor || trigram.color;
                        ctx.shadowBlur = style.glowRadius || 20;
                    }
                    ctx.stroke();
                }
                ctx.restore();

                // Draw label (supports \n multi-line)
                if (labelStyle.text) {
                    ctx.save();
                    ctx.fillStyle = labelStyle.color || trigram.color;
                    ctx.font = `bold ${labelStyle.fontSize || 14}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const baseY = y + (labelStyle.position === 'outside' ? 40 : 0);
                    const lblLines = String(labelStyle.text).split('\n');
                    const lblLineH = (labelStyle.fontSize || 14) + 3;
                    const lblStartY = baseY - ((lblLines.length - 1) * lblLineH) / 2;
                    lblLines.forEach((line, i) => ctx.fillText(line.trim(), x, lblStartY + i * lblLineH));
                    if (labelStyle.subtext) {
                        const subtextY = lblStartY + lblLines.length * lblLineH + 2;
                        ctx.font = `${(labelStyle.fontSize || 14) - 2}px sans-serif`;
                        ctx.globalAlpha = 0.7;
                        ctx.fillText(labelStyle.subtext, x, subtextY);
                        ctx.globalAlpha = 1;
                    }
                    ctx.restore();
                }
                break;
            }

            case 'instruction_marker': {
                // Fallback trigram definitions if FENG_SHUI_DGL_SPEC is not available
                const defaultTrigrams = [
                    { name: 'Li', direction: 'S', position: { x: 500, y: 150 }, color: '#F44336' },
                    { name: 'Xun', direction: 'SE', position: { x: 850, y: 150 }, color: '#8BC34A' },
                    { name: 'Zhen', direction: 'E', position: { x: 850, y: 500 }, color: '#4CAF50' },
                    { name: 'Gen', direction: 'NE', position: { x: 850, y: 850 }, color: '#00BCD4' },
                    { name: 'Kan', direction: 'N', position: { x: 500, y: 850 }, color: '#2196F3' },
                    { name: 'Qian', direction: 'NW', position: { x: 150, y: 850 }, color: '#FF9800' },
                    { name: 'Dui', direction: 'W', position: { x: 150, y: 500 }, color: '#FFC107' },
                    { name: 'Kun', direction: 'SW', position: { x: 150, y: 150 }, color: '#E91E63' }
                ];
                const trigrams = (typeof FENG_SHUI_DGL_SPEC !== 'undefined' && FENG_SHUI_DGL_SPEC.trigrams?.houtian) 
                    ? FENG_SHUI_DGL_SPEC.trigrams.houtian 
                    : defaultTrigrams;
                const trigram = trigrams.find(t => t.name === cmd.trigram || t.direction === cmd.direction);
                if (!trigram) break;

                const x = sx(trigram.position.x);
                const y = sy(trigram.position.y);
                const instruction = cmd.instruction || {};
                const style = cmd.style || {};

                // Draw marker
                ctx.save();
                ctx.fillStyle = style.color || trigram.color;
                ctx.strokeStyle = style.color || trigram.color;

                switch (style.markerType || 'circle') {
                    case 'circle':
                        ctx.beginPath();
                        ctx.arc(x, y, sx(style.size || 20), 0, Math.PI * 2);
                        ctx.fill();
                        break;

                    case 'triangle':
                        ctx.beginPath();
                        for (let i = 0; i < 3; i++) {
                            const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
                            const px = x + Math.cos(angle) * sx(style.size || 20);
                            const py = y + Math.sin(angle) * sy(style.size || 20);
                            if (i === 0) ctx.moveTo(px, py);
                            else ctx.lineTo(px, py);
                        }
                        ctx.closePath();
                        ctx.fill();
                        break;

                    case 'star':
                        this._drawStar(ctx, x, y, sx(style.size || 20), 5);
                        break;

                    case 'arrow':
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x - sx(style.size || 15), y);
                        ctx.lineTo(x + sx(style.size || 15), y);
                        ctx.moveTo(x + sx(style.size || 15) - sx(5), y - sx(3));
                        ctx.lineTo(x + sx(style.size || 15), y);
                        ctx.lineTo(x + sx(style.size || 15) - sx(5), y + sx(3));
                        ctx.stroke();
                        break;
                }

                // Draw instruction text
                if (instruction.text) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = `bold ${12}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(instruction.text.substring(0, 15), x, y - (style.size || 20) - 12);
                }
                ctx.restore();
                break;
            }

            case 'connection_line':
                const fromPos = this.getTrigramPos(cmd.from);
                const toPos = this.getTrigramPos(cmd.to);
                const style = cmd.style || {};
                ctx.save();
                ctx.strokeStyle = style.color || stroke;
                ctx.lineWidth = style.width || 1.5;
                if (style.dash) ctx.setLineDash(style.dash);
                ctx.beginPath();
                ctx.moveTo(fromPos.x, fromPos.y);
                ctx.lineTo(toPos.x, toPos.y);
                if (style.arrow) {
                    const arrowSize = style.arrowSize || 8;
                    const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
                    const headAngle = Math.PI / 6;
                    ctx.moveTo(toPos.x, toPos.y);
                    ctx.lineTo(
                        toPos.x - Math.cos(angle - headAngle) * arrowSize,
                        toPos.y - Math.sin(angle - headAngle) * arrowSize
                    );
                    ctx.moveTo(toPos.x, toPos.y);
                    ctx.lineTo(
                        toPos.x - Math.cos(angle + headAngle) * arrowSize,
                        toPos.y - Math.sin(angle + headAngle) * arrowSize
                    );
                }
                ctx.stroke();
                ctx.restore();
                break;

            case 'annotation':
                const annStyle = cmd.style || {};
                let ax, ay;
                if (Array.isArray(cmd.position)) {
                    ax = sx(cmd.position[0]);
                    ay = sy(cmd.position[1]);
                } else if (cmd.position === 'top') {
                    ax = cx; ay = 20;
                } else if (cmd.position === 'bottom') {
                    ax = cx; ay = h - 20;
                } else {
                    ax = cx; ay = cy;
                }

                ctx.save();
                ctx.fillStyle = annStyle.color || stroke;
                ctx.font = `bold ${annStyle.fontSize || 14}px sans-serif`;
                ctx.textAlign = annStyle.align || 'center';
                ctx.textBaseline = 'middle';

                if (cmd.text) {
                    const textLines = cmd.text.split('\n');
                    const lineH = (annStyle.fontSize || 14) + 3;
                    if (annStyle.background) {
                        const maxWidth = Math.max(...textLines.map(l => ctx.measureText(l.trim()).width));
                        const pad = 6;
                        const totalH = textLines.length * lineH;
                        ctx.fillStyle = annStyle.background;
                        ctx.fillRect(ax - maxWidth / 2 - pad, ay - totalH / 2 - pad, maxWidth + pad * 2, totalH + pad * 2);
                        ctx.fillStyle = annStyle.color || stroke;
                    }
                    const startY = ay - ((textLines.length - 1) * lineH) / 2;
                    textLines.forEach((line, i) => ctx.fillText(line.trim(), ax, startY + i * lineH));
                } else if (annStyle.background) {
                    const metrics = ctx.measureText('');
                    const pad = 6;
                    ctx.fillStyle = annStyle.background;
                    ctx.fillRect(ax - metrics.width / 2 - pad, ay - (annStyle.fontSize || 14) / 2 - pad, metrics.width + pad * 2, (annStyle.fontSize || 14) + pad * 2);
                    ctx.fillStyle = annStyle.color || stroke;
                }

                if (cmd.subtext) {
                    ctx.font = `${(annStyle.fontSize || 14) - 2}px sans-serif`;
                    ctx.globalAlpha = 0.7;
                    ctx.fillText(cmd.subtext, ax, ay + (annStyle.fontSize || 14) + 4);
                    ctx.globalAlpha = 1;
                }
                ctx.restore();
                break;

            case 'text': {
                // Support both backend format (content) and frontend format (text)
                const text = cmd.text || cmd.content || '';
                const tx = cmd.x !== undefined ? sx(cmd.x) :
                    cmd.position?.x !== undefined ? sx(cmd.position.x) : cx;
                const ty = cmd.y !== undefined ? sy(cmd.y) :
                    cmd.position?.y !== undefined ? sy(cmd.position.y) : cy;
                const tStyle = cmd.style || {};
                // Support backend font sizes - scale them properly
                const fontSize = (tStyle.fontSize || cmd.size || 16) * (baseSize / 400);
                const textColor = tStyle.color || stroke;
                const isVertical = cmd.font && cmd.font.includes('vertical');
                console.log(`[drawFDL:text] Drawing "${text.substring(0, 15)}..." at ${Math.round(tx)},${Math.round(ty)} size:${Math.round(fontSize)} color:${textColor} vertical:${isVertical} canvas:${w}x${h}`);
                ctx.save();
                ctx.fillStyle = textColor;
                // Add subtle shadow for better visibility against similar backgrounds
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = fontSize * 0.1;
                ctx.shadowOffsetX = fontSize * 0.02;
                ctx.shadowOffsetY = fontSize * 0.02;
                ctx.font = `${tStyle.bold ? 'bold ' : ''}${fontSize}px "Noto Serif SC", serif`;
                ctx.textAlign = tStyle.align || 'center';
                ctx.textBaseline = tStyle.baseline || 'middle';
                
                if (isVertical) {
                    // Draw characters vertically (top to bottom)
                    const chars = text.split('');
                    const lineHeight = fontSize * 1.1;
                    const totalHeight = chars.length * lineHeight;
                    chars.forEach((char, i) => {
                        ctx.fillText(char, tx, ty - totalHeight/2 + i * lineHeight + lineHeight/2);
                    });
                } else {
                    ctx.fillText(text, tx, ty);
                }
                ctx.restore();
                break;
            }

            case 'mountain': {
                // Draw mountain symbol (three peaks) at top
                const mx = cmd.x !== undefined ? sx(cmd.x) :
                    cmd.position?.x !== undefined ? sx(cmd.position.x) : cx;
                const my = cmd.y !== undefined ? sy(cmd.y) :
                    cmd.position?.y !== undefined ? sy(cmd.position.y) : cy - baseSize * 0.35;
                const mSize = cmd.size || baseSize * 0.15;
                ctx.save();
                const mStyle = cmd.style || {};
                ctx.strokeStyle = mStyle.color || stroke;
                ctx.lineWidth = mStyle.width || 3;
                ctx.beginPath();
                // Three peaks
                ctx.moveTo(mx - mSize, my + mSize / 2);
                ctx.lineTo(mx - mSize / 2, my - mSize / 2);
                ctx.lineTo(mx, my + mSize / 4);
                ctx.lineTo(mx + mSize / 2, my - mSize / 2);
                ctx.lineTo(mx + mSize, my + mSize / 2);
                ctx.stroke();
                ctx.restore();
                break;
            }

            case 'taijitu': {
                // Draw simplified taijitu (yin-yang) symbol
                const tx = cmd.x !== undefined ? sx(cmd.x) :
                    cmd.position?.x !== undefined ? sx(cmd.position.x) : cx;
                const ty = cmd.y !== undefined ? sy(cmd.y) :
                    cmd.position?.y !== undefined ? sy(cmd.position.y) : cy;
                const tSize = (cmd.size || 80) * (baseSize / 1000);
                ctx.save();
                const tStyle = cmd.style || {};
                ctx.strokeStyle = tStyle.color || stroke;
                ctx.fillStyle = tStyle.color || stroke;
                ctx.lineWidth = tStyle.width || 3;
                // Outer circle
                ctx.beginPath();
                ctx.arc(tx, ty, tSize, 0, Math.PI * 2);
                ctx.stroke();
                // S-curve divider
                ctx.beginPath();
                ctx.arc(tx, ty - tSize / 2, tSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(tx, ty + tSize / 2, tSize / 2, 0, Math.PI * 2);
                ctx.stroke();
                // Center dots
                ctx.beginPath();
                ctx.arc(tx, ty - tSize / 2, tSize / 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(tx, ty + tSize / 2, tSize / 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
                break;
            }

            case 'seal_char': {
                // Draw seal characters in a grid
                const chars = cmd.chars || ['符', '咒'];
                const scx = cmd.x !== undefined ? sx(cmd.x) :
                    cmd.position?.x !== undefined ? sx(cmd.position.x) : cx;
                const scy = cmd.y !== undefined ? sy(cmd.y) :
                    cmd.position?.y !== undefined ? sy(cmd.position.y) : cy;
                const scSize = (cmd.size || 60) * (baseSize / 1000);
                const scStyle = cmd.style || {};
                const cols = cmd.cols || Math.min(chars.length, 2);
                const rows = Math.ceil(chars.length / cols);
                ctx.save();
                ctx.fillStyle = scStyle.color || stroke;
                ctx.font = `bold ${scSize}px "Noto Serif SC", serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const startX = scx - ((cols - 1) * scSize * 1.2) / 2;
                const startY = scy - ((rows - 1) * scSize * 1.2) / 2;
                chars.forEach((char, i) => {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    ctx.fillText(char, startX + col * scSize * 1.2, startY + row * scSize * 1.2);
                });
                ctx.restore();
                break;
            }

            case 'rect': {
                const rx = cmd.x !== undefined ? sx(cmd.x) :
                    cmd.position?.x !== undefined ? sx(cmd.position.x) : cx;
                const ry = cmd.y !== undefined ? sy(cmd.y) :
                    cmd.position?.y !== undefined ? sy(cmd.position.y) : cy;
                // Support both backend (w/h) and frontend (width/height) formats
                const rw = cmd.w ? sx(cmd.w) : cmd.width ? sx(cmd.width) - sx(0) : baseSize * 0.2;
                const rh = cmd.h ? sy(cmd.h) : cmd.height ? sy(cmd.height) - sy(0) : baseSize * 0.1;
                const rStyle = cmd.style || {};
                ctx.save();
                ctx.strokeStyle = rStyle.color || stroke;
                ctx.lineWidth = rStyle.width || 2;
                if (rStyle.fill) {
                    ctx.fillStyle = rStyle.fill;
                    ctx.fillRect(rx - rw / 2, ry - rh / 2, rw, rh);
                }
                ctx.strokeRect(rx - rw / 2, ry - rh / 2, rw, rh);
                ctx.restore();
                break;
            }

            case 'circle': {
                const circX = cmd.cx !== undefined ? sx(cmd.cx) : cmd.x !== undefined ? sx(cmd.x) : cx;
                const circY = cmd.cy !== undefined ? sy(cmd.cy) : cmd.y !== undefined ? sy(cmd.y) : cy;
                const circR = cmd.r ? sx(cmd.r) : baseSize * 0.1;
                const circStyle = cmd.style || {};
                ctx.save();
                ctx.strokeStyle = circStyle.color || stroke;
                ctx.lineWidth = circStyle.width || 2;
                ctx.beginPath();
                ctx.arc(circX, circY, circR, 0, Math.PI * 2);
                if (circStyle.fill) {
                    ctx.fillStyle = circStyle.fill;
                    ctx.fill();
                }
                ctx.stroke();
                ctx.restore();
                break;
            }

            case 'path': {
                const style = cmd.style || {};
                const points = cmd.points || [];
                if (points.length < 2) break;
                ctx.save();
                ctx.strokeStyle = style.color || stroke;
                ctx.lineWidth = style.width || 2;
                ctx.beginPath();
                ctx.moveTo(sx(points[0][0]), sy(points[0][1]));
                for (let pi = 1; pi < points.length; pi++) {
                    ctx.lineTo(sx(points[pi][0]), sy(points[pi][1]));
                }
                if (style.closed) ctx.closePath();
                if (style.fill) {
                    ctx.fillStyle = style.fill;
                    ctx.fill();
                }
                ctx.stroke();
                ctx.restore();
                break;
            }

            case 'symbol': {
                // Draw emoji symbols (used in Feng Shui diagrams)
                const symbol = cmd.content || cmd.symbol || '◆';
                const sx_pos = cmd.x !== undefined ? sx(cmd.x) : cx;
                const sy_pos = cmd.y !== undefined ? sy(cmd.y) : cy;
                const symSize = cmd.size || 60;
                ctx.save();
                ctx.font = `${symSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(symbol, sx_pos, sy_pos);
                ctx.restore();
                break;
            }

            default:
                // Unknown command type — skip silently
                break;
        }
    }

    /**
     * Get trigram position for connection lines
     * @param {string} trigramOrDirection - Trigram name or direction
     * @returns {Object} Position object with x and y
     */
    static getTrigramPos(trigramOrDirection) {
        // Fallback trigram definitions if FENG_SHUI_DGL_SPEC is not available
        const defaultTrigrams = [
            { name: 'Li', direction: 'S', position: { x: 500, y: 150 } },
            { name: 'Xun', direction: 'SE', position: { x: 850, y: 150 } },
            { name: 'Zhen', direction: 'E', position: { x: 850, y: 500 } },
            { name: 'Gen', direction: 'NE', position: { x: 850, y: 850 } },
            { name: 'Kan', direction: 'N', position: { x: 500, y: 850 } },
            { name: 'Qian', direction: 'NW', position: { x: 150, y: 850 } },
            { name: 'Dui', direction: 'W', position: { x: 150, y: 500 } },
            { name: 'Kun', direction: 'SW', position: { x: 150, y: 150 } }
        ];
        const trigrams = (typeof FENG_SHUI_DGL_SPEC !== 'undefined' && FENG_SHUI_DGL_SPEC.trigrams?.houtian) 
            ? FENG_SHUI_DGL_SPEC.trigrams.houtian 
            : defaultTrigrams;
        const trigram = trigrams.find(t => t.name === trigramOrDirection || t.direction === trigramOrDirection);
        if (!trigram) return { x: 500, y: 500 };

        return {
            x: trigram.position.x,
            y: trigram.position.y
        };
    }



    static _drawStar(ctx, x, y, r, points) {
        const innerR = r * 0.4;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const radius = i % 2 === 0 ? r : innerR;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    static _drawFuluPlaceholder(ctx, w, h, fuluContent, stroke) {
        const cx = w / 2;
        const cy = h / 2;

        // Draw talisman name (Chinese) as main visual
        const nameZh = fuluContent.talismanNameZh || fuluContent.hexagramChar || '';
        const sealChars = fuluContent.sealChars || [];

        if (nameZh) {
            ctx.fillStyle = stroke;
            ctx.font = `bold ${Math.min(w, h) * 0.12}px "Noto Serif SC", serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(nameZh, cx, cy * 0.4);
        }

        // Draw seal characters in a grid
        if (sealChars.length > 0) {
            const charSize = Math.min(w, h) * 0.18;
            ctx.font = `bold ${charSize}px "Noto Serif SC", serif`;
            ctx.fillStyle = stroke;
            ctx.globalAlpha = 0.8;
            const cols = Math.min(sealChars.length, 2);
            const rows = Math.ceil(sealChars.length / cols);
            const startY = cy - (rows * charSize * 0.6) / 2;
            sealChars.forEach((char, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = cx + (col - (cols - 1) / 2) * charSize * 1.2;
                const y = startY + row * charSize * 1.2 + charSize * 0.8;
                ctx.fillText(char, x, y);
            });
            ctx.globalAlpha = 1;
        }

        // Draw a decorative border
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        const pad = 15;
        ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
        // Inner border
        ctx.lineWidth = 1;
        ctx.strokeRect(pad + 6, pad + 6, w - pad * 2 - 12, h - pad * 2 - 12);
        ctx.globalAlpha = 1;
    }

    /**
     * Draw default placeholder when no content available
     */
    static _drawDefaultPlaceholder(ctx, w, h, stroke) {
        const cx = w / 2;
        const cy = h / 2;
        const size = Math.min(w, h) * 0.4;

        // Draw a simple talisman shape
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;

        // Outer rectangle (talisman shape)
        ctx.strokeRect(cx - size / 2, cy - size * 0.6, size, size * 1.2);

        // Inner decorative lines
        ctx.beginPath();
        ctx.moveTo(cx - size / 3, cy - size * 0.4);
        ctx.lineTo(cx + size / 3, cy - size * 0.4);
        ctx.moveTo(cx - size / 3, cy + size * 0.4);
        ctx.lineTo(cx + size / 3, cy + size * 0.4);
        ctx.stroke();

        // Center circle (Taijitu placeholder)
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
        ctx.stroke();

        // Text
        ctx.fillStyle = stroke;
        ctx.font = `bold ${size * 0.12}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText('符', cx, cy - size * 0.5);

        ctx.globalAlpha = 1;
    }

    /**
     * Generate complete FS-DGL diagram from instructions
     * @param {Array} instructions - Array of feng shui instructions
     * @param {Object} options - Configuration options
     * @returns {Object} Complete FS-DGL structure
     */
    static generateFengShuiDiagram(instructions, options = {}) {
        const defaultOptions = {
            arrangement: "houtian",
            background: "#1a1a2e",
            showAllLabels: true,
            showConnections: false,
            lang: "en"
        };

        const config = { ...defaultOptions, ...options };

        // Base structure
        const diagram = {
            version: "1.0",
            type: "fengshui_diagram",
            arrangement: config.arrangement,
            background: config.background,
            size: { w: 1000, h: 1000 },
            layers: [
                {
                    name: "bagua_base",
                    commands: [
                        { type: "bagua", x: 500, y: 500, size: 800, style: { arrangement: config.arrangement } }
                    ]
                },
                {
                    name: "directional_grid",
                    type: "grid_layer",
                    commands: [
                        { type: "directional_lines", center: [500, 500], radius: 400 }
                    ]
                },
                {
                    name: "sector_highlights",
                    type: "highlight_layer",
                    opacity: 0.5,
                    commands: []
                },
                {
                    name: "instruction_overlay",
                    type: "overlay_layer",
                    commands: []
                },
                {
                    name: "labels",
                    type: "annotation_layer",
                    commands: []
                }
            ]
        };

        // Add label annotations for all trigrams if requested
        if (config.showAllLabels) {
            const trigrams = FENG_SHUI_DGL_SPEC.trigrams[config.arrangement];
            trigrams.forEach(t => {
                diagram.layers[4].commands.push({
                    type: "annotation",
                    position: [t.position.x, t.position.y - 40],
                    text: t.chinese,
                    subtext: t.name,
                    style: {
                        fontSize: 14,
                        color: t.color,
                        align: "center"
                    }
                });
            });
        }

        // Process instructions
        instructions.forEach(instruction => {
            const commands = FENG_SHUI_DGL_SPEC.helpers.parseInstruction(instruction, config.lang);
            commands.forEach(cmd => {
                if (cmd.type === "highlight_sector") {
                    diagram.layers[2].commands.push(cmd);
                } else if (cmd.type === "instruction_marker") {
                    diagram.layers[3].commands.push(cmd);
                }
            });
        });

        return diagram;
    }

    /**
     * Render FS-DGL diagram
     * @param {Object} fsDglData - FS-DGL data structure
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Size of diagram
     * @param {string} stroke - Stroke color
     */
    static renderFengShuiDiagram(fsDglData, ctx, x, y, size, stroke = "#d4af37") {
        if (!fsDglData || !fsDglData.layers) return;

        const sx = (v) => v * (size / 1000);
        const sy = (v) => v * (size / 1000);

        fsDglData.layers.forEach(layer => {
            if (!layer.commands || !Array.isArray(layer.commands)) return;

            layer.commands.forEach(cmd => {
                // Adjust coordinates for FS-DGL coordinates (center-based)
                const adjustedCmd = { ...cmd };
                if (cmd.x !== undefined && cmd.y !== undefined) {
                    adjustedCmd.x = sx(cmd.x);
                    adjustedCmd.y = sy(cmd.y);
                }
                if (cmd.size !== undefined) {
                    adjustedCmd.size = sx(cmd.size);
                }
                if (cmd.center !== undefined) {
                    adjustedCmd.center = [sx(cmd.center[0]), sy(cmd.center[1])];
                }
                if (cmd.radius !== undefined) {
                    adjustedCmd.radius = sx(cmd.radius);
                }
                if (cmd.position !== undefined && Array.isArray(cmd.position)) {
                    adjustedCmd.position = [sx(cmd.position[0]), sy(cmd.position[1])];
                }

                // Execute the command
                this.executeFDLCommand(ctx, adjustedCmd, stroke);
            });
        });
    }



    // ═══════════════════════════════════════════════════════════════════════════════
    // DUAL BAGUA DIAGRAM - Shows both Houtian and Xiantian arrangements
    // ═══════════════════════════════════════════════════════════════════════════════

    static drawDualBagua(ctx, cx, cy, size, options = {}) {
        const {
            houtianActive = [],
            xiantianActive = [],
            showLabels = true,
            stroke = '#d4af37',
            highlightColor = '#00FF00',
            arrangement = 'both' // 'both', 'houtian', 'xiantian'
        } = options;

        ctx.save();

        if (arrangement === 'both') {
            // Draw side by side
            const halfSize = size * 0.45;
            const gap = size * 0.08;

            // Left: Houtian (Later Heaven)
            this.drawSingleBagua(ctx, cx - halfSize - gap / 2, cy, halfSize, {
                arrangement: 'houtian',
                activeTrigrams: houtianActive,
                label: showLabels ? '後天 Houtian' : null,
                stroke,
                highlightColor,
                translateDirection: options.translateDirection
            });

            // Right: Xiantian (Early Heaven)
            this.drawSingleBagua(ctx, cx + halfSize + gap / 2, cy, halfSize, {
                arrangement: 'xiantian',
                activeTrigrams: xiantianActive,
                label: showLabels ? '先天 Xiantian' : null,
                stroke,
                highlightColor,
                translateDirection: options.translateDirection
            });

        } else {
            // Single arrangement
            this.drawSingleBagua(ctx, cx, cy, size, {
                arrangement,
                activeTrigrams: arrangement === 'houtian' ? houtianActive : xiantianActive,
                label: showLabels ? (arrangement === 'houtian' ? '後天 Houtian' : '先天 Xiantian') : null,
                stroke,
                highlightColor,
                translateDirection: options.translateDirection
            });
        }

        ctx.restore();
    }

    static drawSingleBagua(ctx, cx, cy, size, options = {}) {
        const {
            arrangement = 'houtian',
            activeTrigrams = [],
            label = null,
            stroke = '#d4af37',
            highlightColor = '#00FF00',
            translateDirection = (d) => d
        } = options;

        ctx.save();

        const r = size / 2;
        const octR = r * 0.95;
        const textR = r * 1.15;

        // Draw outer octagon
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI / 4) - Math.PI / 8;
            const x = cx + Math.cos(angle) * octR;
            const y = cy + Math.sin(angle) * octR;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw inner circle
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = stroke;
        ctx.stroke();

        // Trigram definitions based on arrangement
        const trigrams = arrangement === 'houtian' ? [
            { name: 'Li', chinese: '離', dir: 'S', bin: [1, 0, 1], angle: -Math.PI / 2, element: 'Fire', spiritual: 'Shen' },
            { name: 'Kun', chinese: '坤', dir: 'SW', bin: [0, 0, 0], angle: -3 * Math.PI / 4, element: 'Earth', spiritual: 'Jing' },
            { name: 'Dui', chinese: '兌', dir: 'W', bin: [0, 1, 1], angle: Math.PI, element: 'Metal', spiritual: 'Hun' },
            { name: 'Qian', chinese: '乾', dir: 'NW', bin: [1, 1, 1], angle: 3 * Math.PI / 4, element: 'Metal', spiritual: 'Shen' },
            { name: 'Kan', chinese: '坎', dir: 'N', bin: [0, 1, 0], angle: Math.PI / 2, element: 'Water', spiritual: 'Jing' },
            { name: 'Gen', chinese: '艮', dir: 'NE', bin: [1, 0, 0], angle: Math.PI / 4, element: 'Earth', spiritual: 'Po' },
            { name: 'Zhen', chinese: '震', dir: 'E', bin: [0, 0, 1], angle: 0, element: 'Wood', spiritual: 'Zhi' },
            { name: 'Xun', chinese: '巽', dir: 'SE', bin: [1, 1, 0], angle: -Math.PI / 4, element: 'Wood', spiritual: 'Qi' }
        ] : [
            // Xiantian (Early Heaven) - Primordial arrangement
            { name: 'Qian', chinese: '乾', dir: 'S', bin: [1, 1, 1], angle: -Math.PI / 2, element: 'Heaven', spiritual: 'Pure Yang' },
            { name: 'Dui', chinese: '兌', dir: 'SE', bin: [0, 1, 1], angle: -Math.PI / 4, element: 'Lake', spiritual: 'Hun-Joy' },
            { name: 'Li', chinese: '離', dir: 'E', bin: [1, 0, 1], angle: 0, element: 'Fire', spiritual: 'Yi-Clarity' },
            { name: 'Zhen', chinese: '震', dir: 'NE', bin: [0, 0, 1], angle: Math.PI / 4, element: 'Thunder', spiritual: 'Zhi-Will' },
            { name: 'Kun', chinese: '坤', dir: 'N', bin: [0, 0, 0], angle: Math.PI / 2, element: 'Earth', spiritual: 'Pure Yin' },
            { name: 'Gen', chinese: '艮', dir: 'NW', bin: [1, 0, 0], angle: 3 * Math.PI / 4, element: 'Mountain', spiritual: 'Po-Intuition' },
            { name: 'Kan', chinese: '坎', dir: 'W', bin: [0, 1, 0], angle: Math.PI, element: 'Water', spiritual: 'Jing-Danger' },
            { name: 'Xun', chinese: '巽', dir: 'SW', bin: [1, 1, 0], angle: -3 * Math.PI / 4, element: 'Wind', spiritual: 'Qi-Breath' }
        ];

        const activeSet = new Set(activeTrigrams);
        const triW = size * 0.15;
        const triH = size * 0.12;

        // Draw connecting lines for active trigrams
        if (activeTrigrams.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = highlightColor + '40';
            ctx.lineWidth = 2;
            let first = true;
            trigrams.forEach(t => {
                if (activeSet.has(t.name)) {
                    const x = cx + Math.cos(t.angle) * (r * 0.65);
                    const y = cy + Math.sin(t.angle) * (r * 0.65);
                    if (first) {
                        ctx.moveTo(x, y);
                        first = false;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });
            ctx.stroke();
        }

        trigrams.forEach(t => {
            const isActive = activeSet.has(t.name);
            const x = cx + Math.cos(t.angle) * (r * 0.65);
            const y = cy + Math.sin(t.angle) * (r * 0.65);

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(t.angle + Math.PI / 2);

            // Draw trigram lines
            const gap = triH / 3;
            const lineW = triW;
            const halfW = lineW / 2;
            const yStart = -triH / 2;

            ctx.strokeStyle = isActive ? highlightColor : stroke;
            ctx.lineWidth = isActive ? 4 : 2;
            if (isActive) {
                ctx.shadowColor = highlightColor;
                ctx.shadowBlur = 15;
            } else {
                ctx.shadowBlur = 0;
            }

            t.bin.forEach((line, i) => {
                const ly = yStart + i * gap;
                ctx.beginPath();
                if (line === 1) {
                    ctx.moveTo(-halfW, ly);
                    ctx.lineTo(halfW, ly);
                } else {
                    ctx.moveTo(-halfW, ly);
                    ctx.lineTo(-halfW * 0.2, ly);
                    ctx.moveTo(halfW * 0.2, ly);
                    ctx.lineTo(halfW, ly);
                }
                ctx.stroke();
            });
            ctx.restore();

            // Draw trigram character
            ctx.fillStyle = isActive ? highlightColor : stroke;
            ctx.font = `bold ${size * 0.08}px "Noto Serif SC", serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const charX = cx + Math.cos(t.angle) * (r * 0.4);
            const charY = cy + Math.sin(t.angle) * (r * 0.4);
            ctx.fillText(t.chinese, charX, charY);

            // Draw active indicator
            if (isActive) {
                ctx.beginPath();
                ctx.arc(charX, charY, size * 0.06, 0, Math.PI * 2);
                ctx.strokeStyle = highlightColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw direction labels
            ctx.fillStyle = isActive ? highlightColor : stroke;
            ctx.font = `${size * 0.04}px sans-serif`;
            const dirX = cx + Math.cos(t.angle) * (r * 1.1);
            const dirY = cy + Math.sin(t.angle) * (r * 1.1);
            ctx.fillText(translateDirection(t.dir), dirX, dirY);
        });

        // Draw title label
        if (label) {
            ctx.fillStyle = stroke;
            ctx.font = `bold ${size * 0.08}px "Noto Serif SC", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(label, cx, cy - r * 1.3);
        }

        // Draw center Taijitu
        this.drawTaijitu(ctx, cx, cy, r * 0.22, stroke);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENHANCED BAZI DIAGRAM - Shows Hetu, Luoshu, Xiantian, Houtian highlights
    // ═══════════════════════════════════════════════════════════════════════════════

    static drawBaziEnhanced(ctx, cx, cy, size, baziData, options = {}) {
        const {
            stroke = '#d4af37',
            showHetu = true,
            showLuoshu = true,
            showXiantian = true,
            showHoutian = true
        } = options;

        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw main circle border
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.stroke();

        // Calculate positions for four systems
        const innerSize = size * 0.35;
        const offset = size * 0.22;

        // Top: Hetu (River Map)
        if (showHetu && baziData.hetu) {
            this.drawHetuMini(ctx, cx, cy - offset, innerSize, baziData.hetu, stroke);
        }

        // Right: Luoshu (Magic Square)
        if (showLuoshu && baziData.luoshu) {
            this.drawLuoshuMini(ctx, cx + offset, cy, innerSize, baziData.luoshu, stroke);
        }

        // Bottom: Xiantian
        if (showXiantian && baziData.xiantian) {
            this.drawXiantianMini(ctx, cx, cy + offset, innerSize, baziData.xiantian, stroke);
        }

        // Left: Houtian
        if (showHoutian && baziData.chart) {
            this.drawHoutianMini(ctx, cx - offset, cy, innerSize, baziData.chart, stroke);
        }

        // Center: master of day info
        this.drawBaziCenterInfo(ctx, cx, cy, size * 0.25, baziData, stroke);

        // Draw connecting lines between systems
        ctx.strokeStyle = stroke + '30';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy - offset + innerSize / 2);
        ctx.lineTo(cx, cy + offset - innerSize / 2);
        ctx.moveTo(cx - offset + innerSize / 2, cy);
        ctx.lineTo(cx + offset - innerSize / 2, cy);
        ctx.stroke();

        ctx.restore();
    }

    static drawHetuMini(ctx, cx, cy, size, hetuData, stroke) {
        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Title
        ctx.fillStyle = stroke;
        ctx.font = `bold ${size * 0.12}px "Noto Serif SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('河圖 Hetu', cx, cy - size * 0.35);

        // Show dominant element and path type
        if (hetuData.generationAnalysis) {
            const dominant = hetuData.generationAnalysis.dominantElement;
            const pathType = hetuData.lifePath?.pathType || '';

            ctx.fillStyle = '#4CAF50';
            ctx.font = `${size * 0.1}px sans-serif`;
            ctx.fillText(dominant, cx, cy);
            ctx.font = `${size * 0.08}px sans-serif`;
            ctx.fillText(pathType, cx, cy + size * 0.15);
        }

        ctx.restore();
    }

    static drawLuoshuMini(ctx, cx, cy, size, luoshuData, stroke) {
        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Title
        ctx.fillStyle = stroke;
        ctx.font = `bold ${size * 0.12}px "Noto Serif SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('洛書 Luoshu', cx, cy - size * 0.35);

        // Show Ming Gua
        if (luoshuData.mingGua) {
            const guaNum = luoshuData.mingGua.number;
            const trigram = luoshuData.mingGua.trigram;

            ctx.fillStyle = '#2196F3';
            ctx.font = `bold ${size * 0.15}px sans-serif`;
            ctx.fillText(guaNum.toString(), cx, cy - size * 0.05);
            ctx.font = `${size * 0.1}px "Noto Serif SC", sans-serif`;
            ctx.fillText(trigram, cx, cy + size * 0.15);
        }

        ctx.restore();
    }

    static drawXiantianMini(ctx, cx, cy, size, xiantianData, stroke) {
        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(255, 152, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Title
        ctx.fillStyle = stroke;
        ctx.font = `bold ${size * 0.12}px "Noto Serif SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('先天 Xiantian', cx, cy - size * 0.35);

        // Show dominant treasure
        if (xiantianData.threeTreasures) {
            const dominant = xiantianData.threeTreasures.dominant;
            const treasureInfo = xiantianData.threeTreasures.dominantInfo;

            ctx.fillStyle = '#FF9800';
            ctx.font = `bold ${size * 0.12}px sans-serif`;
            ctx.fillText(dominant.toUpperCase(), cx, cy - size * 0.05);
            if (treasureInfo) {
                ctx.font = `${size * 0.08}px sans-serif`;
                ctx.fillText(treasureInfo.palace || '', cx, cy + size * 0.15);
            }
        }

        ctx.restore();
    }

    static drawHoutianMini(ctx, cx, cy, size, chart, stroke) {
        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(156, 39, 176, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#9C27B0';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Title
        ctx.fillStyle = stroke;
        ctx.font = `bold ${size * 0.12}px "Noto Serif SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('後天 Houtian', cx, cy - size * 0.35);

        // Show master of day
        if (chart.day && chart.day.stem) {
            const stem = chart.day.stem;
            ctx.fillStyle = '#9C27B0';
            ctx.font = `bold ${size * 0.15}px "Noto Serif SC", sans-serif`;
            ctx.fillText(stem.zh, cx, cy - size * 0.05);
            ctx.font = `${size * 0.09}px sans-serif`;
            ctx.fillText(`${stem.element} ${stem.polarity}`, cx, cy + size * 0.15);
        }

        ctx.restore();
    }

    static drawBaziCenterInfo(ctx, cx, cy, size, baziData, stroke) {
        ctx.save();

        // Center circle
        ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (baziData.chart && baziData.chart.day) {
            const dayMaster = baziData.chart.day.stem;
            const strength = baziData.chart.strength;

            // master of day character
            ctx.fillStyle = stroke;
            ctx.font = `bold ${size * 0.35}px "Noto Serif SC", serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dayMaster.zh, cx, cy - size * 0.1);

            // Strength indicator
            ctx.font = `${size * 0.15}px sans-serif`;
            ctx.fillText(strength?.result || '', cx, cy + size * 0.25);
        }

        ctx.restore();
    }
}


