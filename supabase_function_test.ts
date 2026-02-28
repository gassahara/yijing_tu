import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("[TEST] Function starting...");

serve(async (req) => {
  console.log(`[TEST] Request received: ${req.method} ${req.url}`);
  
  return new Response(
    JSON.stringify({ success: true, message: "Test function works!" }),
    { headers: { "Content-Type": "application/json" } }
  );
});

console.log("[TEST] Function started successfully");
