import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CACHE_TTL_HOURS = 24;

function extractIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();
  return null;
}

async function lookupIpapi(ip: string): Promise<{ currency: string; country: string } | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "shadespace-configurator" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    const currency = typeof data.currency === "string" ? data.currency.toUpperCase() : "";
    const country = typeof data.country === "string" ? data.country.toUpperCase() : "";
    if (!currency) return null;
    return { currency, country };
  } catch {
    return null;
  }
}

async function lookupIpwho(ip: string): Promise<{ currency: string; country: string } | null> {
  try {
    const res = await fetch(`https://ipwho.is/${ip}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.success === false) return null;
    const currency = typeof data?.currency?.code === "string" ? data.currency.code.toUpperCase() : "";
    const country = typeof data?.country_code === "string" ? data.country_code.toUpperCase() : "";
    if (!currency) return null;
    return { currency, country };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const ip = extractIp(req);

    if (!ip) {
      return new Response(
        JSON.stringify({ currency: null, country: null, ip: null, source: "no-ip" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { data: cached } = await supabase
      .from("ip_currency_cache")
      .select("currency, country, detected_at")
      .eq("ip", ip)
      .gte("detected_at", cutoff)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({
          currency: cached.currency,
          country: cached.country,
          ip,
          source: "cache",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result = await lookupIpapi(ip);
    if (!result) result = await lookupIpwho(ip);

    if (!result) {
      return new Response(
        JSON.stringify({ currency: null, country: null, ip, source: "lookup-failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("ip_currency_cache").upsert({
      ip,
      currency: result.currency,
      country: result.country,
      detected_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        currency: result.currency,
        country: result.country,
        ip,
        source: "lookup",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ currency: null, country: null, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
