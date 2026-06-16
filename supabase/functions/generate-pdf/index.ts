import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.warn("generate-pdf: legacy server-rendered PDF endpoint is retired. Caller must use the client-rendered PDF passed via send-config-email.");
  return new Response(
    JSON.stringify({
      success: false,
      error: "generate-pdf is retired. Use the client-side block-driven PDF generator and pass the rendered PDF as an attachment via send-config-email.",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
