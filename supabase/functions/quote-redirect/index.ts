import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CANONICAL_ORIGIN = "https://shadespace.com";
const CANONICAL_PATH = "/pages/shade-sail-configurator";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || url.searchParams.get("quote") || "";
    const token = url.searchParams.get("token") || "";
    const source = url.searchParams.get("src") || "direct";

    if (!id || !token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing id or token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("npm:@supabase/supabase-js@2");
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("quote_link_events").insert({
          quote_id: id,
          source,
          landed_host: "",
          had_token: Boolean(token),
          user_agent: req.headers.get("user-agent") || "",
        });
      } catch {
        // telemetry best-effort only
      }
    }

    const target = new URL(`${CANONICAL_ORIGIN}${CANONICAL_PATH}`);
    target.searchParams.set("quote", id);
    target.searchParams.set("token", token);
    if (source) target.searchParams.set("src", source);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: target.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Redirect failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
