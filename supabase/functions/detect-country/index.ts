import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  AU: "AUD",
  NZ: "NZD",
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  IE: "EUR",
  PT: "EUR",
  FI: "EUR",
  GR: "EUR",
  JP: "JPY",
  SG: "SGD",
  AE: "AED",
};

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first && first !== "127.0.0.1" && first !== "::1") return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

async function resolveCountry(
  ip: string
): Promise<{ country: string; countryCode: string } | null> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "success") {
      return { country: data.country, countryCode: data.countryCode };
    }
  } catch {
    // non-blocking
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const ip = getClientIp(req);
  if (!ip) {
    return new Response(
      JSON.stringify({ error: "no_ip", country: null, countryCode: null, currency: null, ip: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Check cache first
  const { data: cached } = await supabase
    .from("ip_currency_cache")
    .select("currency, country")
    .eq("ip", ip)
    .maybeSingle();

  if (cached && cached.country) {
    const countryCode = cached.country.toUpperCase();
    const currency = cached.currency?.toUpperCase() || COUNTRY_TO_CURRENCY[countryCode] || "USD";
    return new Response(
      JSON.stringify({ countryCode, currency, ip, cached: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Resolve via ip-api.com
  const geo = await resolveCountry(ip);
  if (!geo) {
    return new Response(
      JSON.stringify({ error: "geo_failed", countryCode: null, currency: null, ip }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const countryCode = geo.countryCode.toUpperCase();
  const currency = COUNTRY_TO_CURRENCY[countryCode] || "USD";

  // Cache the result
  await supabase
    .from("ip_currency_cache")
    .upsert(
      { ip, currency, country: countryCode, detected_at: new Date().toISOString() },
      { onConflict: "ip" }
    );

  return new Response(
    JSON.stringify({ countryCode, currency, ip, cached: false }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
