import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function verifyShopifyHmac(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return computed === hmacHeader;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const SHOPIFY_API_SECRET = Deno.env.get("SHOPIFY_API_SECRET");
    const rawBody = await req.text();

    if (SHOPIFY_API_SECRET) {
      const hmacHeader = req.headers.get("X-Shopify-Hmac-SHA256") || "";
      const valid = await verifyShopifyHmac(rawBody, hmacHeader, SHOPIFY_API_SECRET);
      if (!valid) {
        console.error("Invalid Shopify webhook HMAC signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const order = JSON.parse(rawBody);
    const email = (order.email || order.customer?.email || "").toLowerCase().trim();

    if (!email) {
      return new Response(
        JSON.stringify({ success: true, message: "No email on order, skipping" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SB_URL, SB_SERVICE);

    await supabase
      .from("email_suppressed_customers")
      .upsert(
        {
          email,
          shopify_customer_id: order.customer?.id ? String(order.customer.id) : null,
          first_order_at: order.created_at || new Date().toISOString(),
          reason: "shopify_order_placed",
          order_id: String(order.id),
        },
        { onConflict: "email", ignoreDuplicates: false },
      );

    const { count } = await supabase
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("recipient_email", email)
      .eq("status", "pending");

    let pendingCancelled = 0;
    if (count && count > 0) {
      await supabase
        .from("email_queue")
        .update({ status: "cancelled" })
        .eq("recipient_email", email)
        .eq("status", "pending");
      pendingCancelled = count;
    }

    console.log(`Suppressed ${email} (order ${order.id}), cancelled ${pendingCancelled} pending emails`);

    return new Response(
      JSON.stringify({ success: true, email, pending_cancelled: pendingCancelled }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("shopify-order-webhook error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
