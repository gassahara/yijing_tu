import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Lazy-loaded PDF library
let pdfLibCache: any = null;
async function getPdfLib() {
  if (!pdfLibCache) {
    pdfLibCache = await import("https://esm.sh/pdf-lib@1.17.1");
  }
  return pdfLibCache;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================================================
// SVG GENERATORS
// ============================================================================

function generateHexagramSVG(lines: Array<{ isYang: boolean, isChanging: boolean }>, width = 200, height = 240): string {
  const lineHeight = height / 8;
  const lineWidth = width * 0.7;
  const startX = (width - lineWidth) / 2;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="#1a1a2e"/>`;
  
  for (let i = 0; i < 6; i++) {
    const y = 30 + i * lineHeight;
    const line = lines[5 - i];
    
    if (line.isYang) {
      svg += `<rect x="${startX}" y="${y}" width="${lineWidth}" height="8" fill="#d4af37"/>`;
    } else {
      const gap = lineWidth * 0.2;
      const segmentWidth = (lineWidth - gap) / 2;
      svg += `<rect x="${startX}" y="${y}" width="${segmentWidth}" height="8" fill="#d4af37"/>`;
      svg += `<rect x="${startX + segmentWidth + gap}" y="${y}" width="${segmentWidth}" height="8" fill="#d4af37"/>`;
    }
    
    if (line.isChanging) {
      svg += `<circle cx="${width - 20}" cy="${y + 4}" r="5" fill="#ff6b6b"/>`;
    }
  }
  
  svg += `</svg>`;
  return svg;
}

function generateBaguaStripSVG(width = 800, height = 60): string {
  const trigrams = ['☰','☱','☲','☳','☴','☵','☶','☷'];
  const names = ['Qian','Dui','Li','Zhen','Xun','Kan','Gen','Kun'];
  const cellWidth = width / 8;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="#1a1a2e"/>`;
  
  trigrams.forEach((tri, i) => {
    const x = i * cellWidth;
    svg += `<rect x="${x}" y="0" width="${cellWidth}" height="${height}" fill="${i % 2 === 0 ? '#16213e' : '#1a1a2e'}"/>`;
    svg += `<text x="${x + cellWidth/2}" y="${height/2 - 5}" text-anchor="middle" fill="#d4af37" font-size="20">${tri}</text>`;
    svg += `<text x="${x + cellWidth/2}" y="${height/2 + 20}" text-anchor="middle" fill="#aaa" font-size="10">${names[i]}</text>`;
  });
  
  svg += `</svg>`;
  return svg;
}

// ============================================================================
// PDF GENERATOR
// ============================================================================

async function generatePDF(data: any): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await getPdfLib();
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  
  let y = height - 50;
  const margin = 50;
  
  const addText = (text: string, size: number, isBold = false, color = rgb(0, 0, 0)) => {
    const f = isBold ? fontBold : font;
    page.drawText(text.substring(0, 100), { x: margin, y, size, font: f, color });
    y -= size * 1.2;
  };
  
  addText(`I Ching Reading - ${data.hexagram?.name || 'Unknown'}`, 18, true, rgb(0.2, 0.2, 0.4));
  y -= 10;
  
  if (data.question) {
    addText(`Question: ${data.question}`, 12, false, rgb(0.3, 0.3, 0.3));
    y -= 10;
  }
  
  addText("Interpretation will be added here...", 10);
  
  return pdfDoc.save();
}

// ============================================================================
// SERVER
// ============================================================================

serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: true, data: { message: "Export API", endpoints: ["/export-pdf", "/export-diagram"] } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const body = await req.json();
    
    if (url.pathname.endsWith('/export-pdf')) {
      const pdfBytes = await generatePDF(body);
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="iching-${Date.now()}.pdf"`,
          "X-Request-ID": requestId
        }
      });
    }
    
    if (url.pathname.endsWith('/export-diagram')) {
      const { type, data } = body;
      let content = '';
      let filename = '';
      
      if (type === 'hexagram') {
        content = generateHexagramSVG(data.lines);
        filename = `hexagram-${data.number || 'reading'}.svg`;
      } else if (type === 'bagua') {
        content = generateBaguaStripSVG();
        filename = 'bagua-strip.svg';
      }
      
      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Request-ID": requestId
        }
      });
    }
    
    return new Response(
      JSON.stringify({ success: false, error: "Unknown endpoint" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error(`[EXPORT] Error: ${error.message}`);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

console.log("[EXPORT] Function started");
