import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

console.log("[MINIMAL] Function starting...");

serve(async (req) => {
  const requestId = generateRequestId();
  console.log(`[MINIMAL] Request: ${req.method} ${req.url}`);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Health check
  if (path.endsWith('/health')) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { status: "healthy", version: "minimal" },
        meta: { requestId, timestamp: new Date().toISOString() }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Random endpoint
  if (path.endsWith('/random') || path === '/functions/v1/yijingtu' || path === '/functions/v1/yijingtu/') {
    const randomBytes = new Uint8Array(64);
    crypto.getRandomValues(randomBytes);
    const binaryString = Array.from(randomBytes)
      .map(byte => byte.toString(2).padStart(8, '0'))
      .join('');
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          binaryString,
          timestamp: new Date().toISOString(),
          source: "crypto"
        },
        meta: { requestId, timestamp: new Date().toISOString() }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Default - API info
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        message: "Yijingtu Minimal API",
        endpoints: ["/health", "/random"]
      },
      meta: { requestId }
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

console.log("[MINIMAL] Function started");
