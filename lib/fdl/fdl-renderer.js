/**
 * FDL Renderer - Standalone Canvas Renderer for Fulu Drawing Language v2.0
 *
 * A pure, dependency-free renderer that transforms FDL documents into canvas visualizations.
 * Supports all FDL v2.0 command types with proper layer compositing and coordinate mapping.
 *
 * No external dependencies. Virtual coordinate system: 1000x1000 mapped to actual canvas.
 */

class FDLRenderer {
  // Houtian bagua angles (Li/S to Kun/SW, counterclockwise from South)
  static HOUTIAN_ANGLES = {
    'Li': -Math.PI / 2,      // South
    'S': -Math.PI / 2,
    'Xun': -Math.PI / 4,     // Southeast
    'SE': -Math.PI / 4,
    'Zhen': 0,               // East
    'E': 0,
    'Gen': Math.PI / 4,      // Northeast
    'NE': Math.PI / 4,
    'Kan': Math.PI / 2,      // North
    'N': Math.PI / 2,
    'Qian': 3 * Math.PI / 4, // Northwest
    'NW': 3 * Math.PI / 4,
    'Dui': Math.PI,          // West
    'W': Math.PI,
    'Kun': -3 * Math.PI / 4, // Southwest
    'SW': -3 * Math.PI / 4
  };

  // Xiantian bagua angles (Qian/S to Kun/N - primordial arrangement)
  static XIANTIAN_ANGLES = {
    'Qian': -Math.PI / 2,    // South (Heaven)
    'S': -Math.PI / 2,
    'Dui': -Math.PI / 4,     // Southeast (Lake)
    'SE': -Math.PI / 4,
    'Li': 0,                 // East (Fire)
    'E': 0,
    'Zhen': Math.PI / 4,     // Northeast (Thunder)
    'NE': Math.PI / 4,
    'Kun': Math.PI / 2,      // North (Earth)
    'N': Math.PI / 2,
    'Gen': 3 * Math.PI / 4,  // Northwest (Mountain)
    'NW': 3 * Math.PI / 4,
    'Kan': Math.PI,          // West (Water)
    'W': Math.PI,
    'Xun': -3 * Math.PI / 4, // Southwest (Wind)
    'SW': -3 * Math.PI / 4
  };

  static getAngles(arrangement = 'houtian') {
    return arrangement === 'xiantian' ? this.XIANTIAN_ANGLES : this.HOUTIAN_ANGLES;
  }

  /**
   * Main entry point: render FDL document to canvas element
   * @param {string} canvasId - HTML canvas element ID
   * @param {object} fdlDoc - Parsed FDL document
   * @param {object} options - Rendering options (backgroundColor, etc)
   */
  static render(canvasId, fdlDoc, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) throw new Error(`Canvas element with id "${canvasId}" not found`);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context from canvas');

    const w = canvas.width;
    const h = canvas.height;

    this.renderToContext(ctx, w, h, fdlDoc, options);
  }

  /**
   * Lower-level rendering: draw FDL document into existing canvas context
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   * @param {number} w - Canvas width
   * @param {number} h - Canvas height
   * @param {object} fdlDoc - FDL document
   * @param {object} options - Rendering options
   */
  static renderToContext(ctx, w, h, fdlDoc, options = {}) {
    const bgColor = options.backgroundColor || '#ffffff';

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    if (!fdlDoc || !fdlDoc.layers) return;

    // Create scale factors: virtual 1000x1000 → actual canvas
    const scaleX = w / 1000;
    const scaleY = h / 1000;

    // Process each layer in order
    for (const layer of fdlDoc.layers) {
      ctx.save();

      // Apply layer opacity if specified
      if (layer.opacity !== undefined) {
        ctx.globalAlpha = layer.opacity;
      }

      // Transform to virtual coordinate space
      ctx.scale(scaleX, scaleY);

      // Render commands in layer
      if (layer.commands) {
        for (const cmd of layer.commands) {
          this._drawCommand(ctx, cmd, fdlDoc);
        }
      }

      ctx.restore();
    }
  }

  /**
   * Dispatch command rendering based on command type
   * @private
   */
  static _drawCommand(ctx, cmd, fdlDoc) {
    switch (cmd.type) {
      // Geometry
      case 'rect':
        this._drawRect(ctx, cmd);
        break;
      case 'circle':
        this._drawCircle(ctx, cmd);
        break;
      case 'arc':
        this._drawArc(ctx, cmd);
        break;
      case 'path':
        this._drawPath(ctx, cmd);
        break;
      case 'polygon':
        this._drawPolygon(ctx, cmd);
        break;
      case 'line':
        this._drawLine(ctx, cmd);
        break;

      // Text & symbols
      case 'text':
        this._drawText(ctx, cmd);
        break;
      case 'seal_char':
        this._drawSealChar(ctx, cmd);
        break;

      // Feng shui primitives
      case 'taijitu':
        this._drawTaijitu(ctx, cmd);
        break;
      case 'bagua':
        this.drawBagua(ctx, cmd.cx, cmd.cy, cmd.size, cmd);
        break;
      case 'trigram':
        this._drawTrigram(ctx, cmd);
        break;

      // Annotations & helpers
      case 'highlight_sector':
        this._drawHighlightSector(ctx, cmd);
        break;
      case 'instruction_marker':
        this._drawInstructionMarker(ctx, cmd);
        break;
      case 'connection_line':
        this._drawConnectionLine(ctx, cmd);
        break;
      case 'annotation':
        this._drawAnnotation(ctx, cmd);
        break;

      // Layout
      case 'grid':
        this._drawGrid(ctx, cmd);
        break;
      case 'directional_lines':
        this._drawDirectionalLines(ctx, cmd);
        break;

      // Special
      case 'thunder_header':
        this._drawThunderHeader(ctx, cmd);
        break;
      case 'talisman_loop':
        this._drawTalismanLoop(ctx, cmd);
        break;
    }
  }

  // ============================================================================
  // BASIC GEOMETRY
  // ============================================================================

  static _drawRect(ctx, cmd) {
    ctx.fillStyle = cmd.fill || '#000000';
    ctx.strokeStyle = cmd.stroke || 'none';
    ctx.lineWidth = cmd.lineWidth || 1;

    ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);

    if (cmd.stroke && cmd.stroke !== 'none') {
      ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h);
    }
  }

  static _drawCircle(ctx, cmd) {
    ctx.fillStyle = cmd.fill || '#000000';
    ctx.strokeStyle = cmd.stroke || 'none';
    ctx.lineWidth = cmd.lineWidth || 1;

    ctx.beginPath();
    ctx.arc(cmd.cx, cmd.cy, cmd.r, 0, 2 * Math.PI);
    ctx.fill();

    if (cmd.stroke && cmd.stroke !== 'none') {
      ctx.stroke();
    }
  }

  static _drawArc(ctx, cmd) {
    ctx.strokeStyle = cmd.stroke || '#000000';
    ctx.fillStyle = cmd.fill || 'none';
    ctx.lineWidth = cmd.lineWidth || 1;

    ctx.beginPath();
    const startAngle = cmd.startAngle || 0;
    const endAngle = cmd.endAngle || 2 * Math.PI;
    const ccw = cmd.ccw || false;
    ctx.arc(cmd.cx, cmd.cy, cmd.r, startAngle, endAngle, ccw);

    if (cmd.fill && cmd.fill !== 'none') {
      ctx.fill();
    }
    ctx.stroke();
  }

  static _drawPath(ctx, cmd) {
    if (!cmd.points || cmd.points.length < 2) return;

    ctx.fillStyle = cmd.fill || 'none';
    ctx.strokeStyle = cmd.stroke || '#000000';
    ctx.lineWidth = cmd.lineWidth || 1;
    ctx.lineCap = cmd.lineCap || 'round';
    ctx.lineJoin = cmd.lineJoin || 'round';

    ctx.beginPath();
    ctx.moveTo(cmd.points[0][0], cmd.points[0][1]);

    for (let i = 1; i < cmd.points.length; i++) {
      ctx.lineTo(cmd.points[i][0], cmd.points[i][1]);
    }

    if (cmd.closed) {
      ctx.closePath();
    }

    if (cmd.fill && cmd.fill !== 'none') {
      ctx.fill();
    }
    ctx.stroke();
  }

  static _drawPolygon(ctx, cmd) {
    if (!cmd.points || cmd.points.length < 3) return;

    ctx.fillStyle = cmd.fill || '#000000';
    ctx.strokeStyle = cmd.stroke || 'none';
    ctx.lineWidth = cmd.lineWidth || 1;

    ctx.beginPath();
    ctx.moveTo(cmd.points[0][0], cmd.points[0][1]);

    for (let i = 1; i < cmd.points.length; i++) {
      ctx.lineTo(cmd.points[i][0], cmd.points[i][1]);
    }
    ctx.closePath();

    ctx.fill();
    if (cmd.stroke && cmd.stroke !== 'none') {
      ctx.stroke();
    }
  }

  static _drawLine(ctx, cmd) {
    ctx.strokeStyle = cmd.stroke || '#000000';
    ctx.lineWidth = cmd.lineWidth || 1;
    ctx.lineCap = cmd.lineCap || 'round';

    ctx.beginPath();
    ctx.moveTo(cmd.x1, cmd.y1);
    ctx.lineTo(cmd.x2, cmd.y2);
    ctx.stroke();
  }

  // ============================================================================
  // TEXT & SYMBOLS
  // ============================================================================

  static _drawText(ctx, cmd) {
    ctx.fillStyle = cmd.color || '#000000';
    ctx.font = `${cmd.size || 20}px ${cmd.font || 'Arial'}`;
    ctx.textAlign = cmd.align || 'center';
    ctx.textBaseline = cmd.baseline || 'middle';

    ctx.fillText(cmd.text, cmd.x, cmd.y);
  }

  /**
   * Draw a stylised Chinese character as a seal (with red background, white text)
   */
  static _drawSealChar(ctx, cmd) {
    const size = cmd.size || 40;
    const x = cmd.x;
    const y = cmd.y;
    const char = cmd.char || '福';

    ctx.save();

    // Red background
    ctx.fillStyle = cmd.bgColor || '#cc0000';
    ctx.fillRect(x - size / 2, y - size / 2, size, size);

    // White text
    ctx.fillStyle = cmd.textColor || '#ffffff';
    ctx.font = `bold ${size * 0.7}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, x, y);

    // Black border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);

    ctx.restore();
  }

  // ============================================================================
  // FENG SHUI PRIMITIVES
  // ============================================================================

  /**
   * Draw Bagua octagon with trigrams - supports both Houtian and Xiantian arrangements
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} size - Outer radius of octagon
   * @param {object} opts - Options (colors, labels, arrangement, etc)
   */
  static drawBagua(ctx, cx, cy, size, opts = {}) {
    const arrangement = opts.arrangement || 'houtian';
    const angleStep = Math.PI / 4;
    
    // Define trigram data for both arrangements
    const arrangements = {
      houtian: {
        trigrams: ['Li', 'Xun', 'Zhen', 'Gen', 'Kan', 'Qian', 'Dui', 'Kun'],
        directions: ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'],
        hexagrams: ['☲', '☴', '☳', '☶', '☵', '☰', '☱', '☷'],
        qualities: ['Fire', 'Wind', 'Thunder', 'Mountain', 'Water', 'Heaven', 'Lake', 'Earth']
      },
      xiantian: {
        trigrams: ['Qian', 'Dui', 'Li', 'Zhen', 'Kun', 'Gen', 'Kan', 'Xun'],
        directions: ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'],
        hexagrams: ['☰', '☱', '☲', '☳', '☷', '☶', '☵', '☴'],
        qualities: ['Heaven', 'Lake', 'Fire', 'Thunder', 'Earth', 'Mountain', 'Water', 'Wind']
      }
    };
    
    const data = arrangements[arrangement] || arrangements.houtian;
    const angles = this.getAngles(arrangement);

    ctx.save();
    ctx.translate(cx, cy);

    // Draw octagon outline
    ctx.strokeStyle = opts.stroke || '#000000';
    ctx.lineWidth = opts.lineWidth || 2;
    ctx.beginPath();

    for (let i = 0; i < 8; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw inner circle
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw trigrams and their lines
    for (let i = 0; i < 8; i++) {
      const trigramName = data.trigrams[i];
      const angle = angles[trigramName];
      const radius = size * 0.35;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      // Draw trigram symbol
      ctx.fillStyle = opts.textColor || '#000000';
      ctx.font = `${opts.fontSize || 24}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.hexagrams[i], x, y);

      // Draw trigram lines (3 horizontal lines)
      this._drawTrigramLines(ctx, x, y, trigramName, opts);
      
      // Draw quality/element label if requested
      if (opts.showQualities) {
        const labelRadius = size * 0.55;
        const lx = labelRadius * Math.cos(angle);
        const ly = labelRadius * Math.sin(angle);
        ctx.font = `${(opts.fontSize || 16) * 0.7}px Arial`;
        ctx.fillStyle = opts.qualityColor || '#666666';
        ctx.fillText(data.qualities[i], lx, ly);
      }
    }

    // Draw compass labels (N, S, E, W)
    if (opts.showCompass !== false) {
      ctx.fillStyle = opts.compassColor || '#000000';
      ctx.font = `${opts.fontSize || 16}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const compassRadius = size * 0.75;
      const compassAngles = {
        'N': Math.PI / 2,
        'S': -Math.PI / 2,
        'E': 0,
        'W': Math.PI
      };

      for (const [dir, angle] of Object.entries(compassAngles)) {
        const cx = compassRadius * Math.cos(angle);
        const cy = compassRadius * Math.sin(angle);
        ctx.fillText(dir, cx, cy);
      }
    }

    ctx.restore();
  }

  /**
   * Draw trigram lines (three horizontal lines, solid or broken)
   * Yang (unbroken) = solid line, Yin (broken) = two dashes with gap
   * @private
   */
  static _drawTrigramLines(ctx, x, y, trigramName, opts) {
    // Simplified: draw 3 horizontal lines at different Y offsets
    // In real implementation, would check trigram type to determine solid/broken
    const lineSpacing = 8;
    const lineLength = 20;

    for (let i = -1; i <= 1; i++) {
      const lineY = y + i * lineSpacing;

      // For demo: alternate between solid and broken (proper impl uses trigram data)
      const isBroken = (trigramName === 'Xun' || trigramName === 'Kun');

      ctx.strokeStyle = opts.stroke || '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();

      if (isBroken) {
        // Draw two half-lines with gap
        ctx.moveTo(x - lineLength / 2, lineY);
        ctx.lineTo(x - lineLength / 4, lineY);
        ctx.moveTo(x + lineLength / 4, lineY);
        ctx.lineTo(x + lineLength / 2, lineY);
      } else {
        // Draw solid line
        ctx.moveTo(x - lineLength / 2, lineY);
        ctx.lineTo(x + lineLength / 2, lineY);
      }
      ctx.stroke();
    }
  }

  /**
   * Draw the Taijitu (yin-yang symbol)
   * Uses clip to enforce circle boundary, proper S-curve with bezier-like smoothness
   */
  static _drawTaijitu(ctx, cmd) {
    const x = cmd.x || 500;
    const y = cmd.y || 500;
    const r = cmd.r || 200;
    const borderColor = cmd.borderColor || '#000000';

    this.drawTaijitu(ctx, x, y, r, borderColor);
  }

  static drawTaijitu(ctx, x, y, r, borderColor = '#000000') {
    ctx.save();
    ctx.translate(x, y);

    // Clip to circle boundary
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
    ctx.clip();

    // Fill base (white/yang)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
    ctx.fill();

    // Draw yin (black S-curve)
    // Classic S-curve via proper arc composition:
    // - Right semicircle from -PI/2 to PI/2
    // - Upper half of bottom circle (CCW)
    // - Lower half of top circle (CW)
    ctx.fillStyle = '#000000';
    ctx.beginPath();

    // Right semicircle
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);

    // Upper half of bottom circle, CCW (sweeps from right to left at y=-r/2)
    ctx.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);

    // Lower half of top circle, CW (sweeps from left to right at y=r/2)
    ctx.arc(0, r / 2, r / 2, -Math.PI / 2, Math.PI / 2, false);

    ctx.closePath();
    ctx.fill();

    // Dot at top (yin in yang)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, r / 3, r / 6, 0, 2 * Math.PI);
    ctx.fill();

    // Dot at bottom (yang in yin)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, -r / 3, r / 6, 0, 2 * Math.PI);
    ctx.fill();

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  static _drawTrigram(ctx, cmd) {
    const name = cmd.name;
    const x = cmd.x || 500;
    const y = cmd.y || 500;
    const size = cmd.size || 50;

    ctx.save();
    ctx.translate(x, y);

    // Draw 3 lines representing trigram
    const lineSpacing = size / 3;
    const lineLength = size;

    for (let i = -1; i <= 1; i++) {
      const isBroken = (name === 'Xun' || name === 'Kun' || name === 'Dui');

      ctx.strokeStyle = cmd.stroke || '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();

      if (isBroken) {
        // Broken line (yin)
        ctx.moveTo(-lineLength / 2, i * lineSpacing);
        ctx.lineTo(-lineLength / 4, i * lineSpacing);
        ctx.moveTo(lineLength / 4, i * lineSpacing);
        ctx.lineTo(lineLength / 2, i * lineSpacing);
      } else {
        // Solid line (yang)
        ctx.moveTo(-lineLength / 2, i * lineSpacing);
        ctx.lineTo(lineLength / 2, i * lineSpacing);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // ============================================================================
  // ANNOTATIONS & HELPERS
  // ============================================================================

  static _drawHighlightSector(ctx, cmd) {
    const cx = cmd.cx || 500;
    const cy = cmd.cy || 500;
    const radius = cmd.radius || 300;
    const startAngle = cmd.startAngle || 0;
    const endAngle = cmd.endAngle || Math.PI / 4;
    const color = cmd.color || '#ffaa00';
    const label = cmd.label || '';

    ctx.save();

    // Draw pie slice with semi-transparency
    ctx.fillStyle = color + '40'; // Add alpha
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label if provided
    if (label) {
      const midAngle = (startAngle + endAngle) / 2;
      const labelRadius = radius * 0.6;
      const labelX = cx + labelRadius * Math.cos(midAngle);
      const labelY = cy + labelRadius * Math.sin(midAngle);

      ctx.fillStyle = color;
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelX, labelY);
    }

    ctx.restore();
  }

  static _drawInstructionMarker(ctx, cmd) {
    const x = cmd.x || 500;
    const y = cmd.y || 500;
    const size = cmd.size || 30;
    const type = cmd.markerType || 'circle'; // circle, triangle, star, arrow
    const color = cmd.color || '#ff0000';

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    switch (type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'star':
        this._drawStar(ctx, 0, 0, 5, size / 2, size / 4);
        ctx.fill();
        ctx.stroke();
        break;

      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 3, size / 4);
        ctx.lineTo(0, size / 6);
        ctx.lineTo(-size / 3, size / 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  static _drawStar(ctx, cx, cy, points, outerRadius, innerRadius) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = cx + radius * Math.cos(angle - Math.PI / 2);
      const y = cy + radius * Math.sin(angle - Math.PI / 2);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  static _drawConnectionLine(ctx, cmd) {
    ctx.strokeStyle = cmd.stroke || '#0066cc';
    ctx.lineWidth = cmd.lineWidth || 2;
    ctx.setLineDash(cmd.dashed ? [5, 5] : []);

    ctx.beginPath();
    ctx.moveTo(cmd.x1, cmd.y1);

    if (cmd.controlPoints && cmd.controlPoints.length > 0) {
      // Bezier curve through control points
      ctx.lineTo(cmd.controlPoints[0][0], cmd.controlPoints[0][1]);
    }

    ctx.lineTo(cmd.x2, cmd.y2);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  static _drawAnnotation(ctx, cmd) {
    const x = cmd.x || 500;
    const y = cmd.y || 500;
    const text = cmd.text || '';
    const bgColor = cmd.bgColor || '#ffffcc';
    const textColor = cmd.textColor || '#000000';
    const fontSize = cmd.fontSize || 12;

    ctx.save();

    // Measure text
    ctx.font = `${fontSize}px Arial`;
    const metrics = ctx.measureText(text);
    const width = metrics.width + 10;
    const height = fontSize + 6;

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Draw text
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + 5, y + 3);

    ctx.restore();
  }

  // ============================================================================
  // LAYOUT HELPERS
  // ============================================================================

  static _drawGrid(ctx, cmd) {
    const x = cmd.x || 0;
    const y = cmd.y || 0;
    const w = cmd.w || 1000;
    const h = cmd.h || 1000;
    const spacing = cmd.spacing || 100;
    const stroke = cmd.stroke || '#cccccc';
    const lineWidth = cmd.lineWidth || 0.5;

    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;

    // Vertical lines
    for (let i = 0; i * spacing <= w; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * spacing, y);
      ctx.lineTo(x + i * spacing, y + h);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i * spacing <= h; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + i * spacing);
      ctx.lineTo(x + w, y + i * spacing);
      ctx.stroke();
    }
  }

  static _drawDirectionalLines(ctx, cmd) {
    const cx = cmd.cx || 500;
    const cy = cmd.cy || 500;
    const radius = cmd.radius || 300;
    const stroke = cmd.stroke || '#000000';
    const lineWidth = cmd.lineWidth || 1;

    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;

    // Draw N, S, E, W lines from center
    const directions = [
      { angle: Math.PI / 2, label: 'N' },      // North
      { angle: -Math.PI / 2, label: 'S' },     // South
      { angle: 0, label: 'E' },                 // East
      { angle: Math.PI, label: 'W' }            // West
    ];

    for (const dir of directions) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(dir.angle), cy + radius * Math.sin(dir.angle));
      ctx.stroke();
    }
  }

  // ============================================================================
  // SPECIAL ELEMENTS
  // ============================================================================

  static _drawThunderHeader(ctx, cmd) {
    const x = cmd.x || 50;
    const y = cmd.y || 50;
    const width = cmd.width || 900;
    const height = cmd.height || 60;
    const text = cmd.text || '符咒';

    ctx.save();

    // Background
    ctx.fillStyle = cmd.bgColor || '#8B0000';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Text
    ctx.fillStyle = cmd.textColor || '#ffffff';
    ctx.font = `bold ${height * 0.6}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);

    ctx.restore();
  }

  static _drawTalismanLoop(ctx, cmd) {
    const cx = cmd.cx || 500;
    const cy = cmd.cy || 500;
    const radius = cmd.radius || 200;
    const count = cmd.count || 8;
    const char = cmd.char || '符';

    ctx.save();

    const angleStep = (2 * Math.PI) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      // Draw seal at this position
      ctx.fillStyle = cmd.charColor || '#cc0000';
      ctx.font = `${cmd.fontSize || 20}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, x, y);
    }

    ctx.restore();
  }
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof module !== 'undefined') {
  module.exports = { FDLRenderer };
}

// Browser global
if (typeof window !== 'undefined') {
  window.FDLRenderer = FDLRenderer;
}
