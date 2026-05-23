import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ShopifyOrder {
  id: number;
  email: string;
  created_at: string;
  customer?: {
    id: number;
    email: string;
    tags?: string;
  };
}

async function fetchShopifyOrders(
  shopDomain: string,
  token: string,
  sinceDate: string,
): Promise<ShopifyOrder[]> {
  const apiVersion = "2025-01";
  const allOrders: ShopifyOrder[] = [];
  let url: string | null =
    `https://${shopDomain}/admin/api/${apiVersion}/orders.json?status=any&created_at_min=${encodeURIComponent(sinceDate)}&limit=250&fields=id,email,created_at,customer`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shopify API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const orders: ShopifyOrder[] = data.orders || [];
    allOrders.push(...orders);

    const linkHeader = res.headers.get("Link") || "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
  }

  return allOrders;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SHOPIFY_SHOP_DOMAIN = Deno.env.get("SHOPIFY_SHOP_DOMAIN");
    const SHOPIFY_ADMIN_API_TOKEN = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");

    if (!SHOPIFY_SHOP_DOMAIN || !SHOPIFY_ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Shopify credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SB_URL, SB_SERVICE);

    const { data: syncState } = await supabase
      .from("email_sync_state")
      .select("last_synced_at")
      .eq("id", "shopify_orders_sync")
      .maybeSingle();

    const sinceDate = syncState?.last_synced_at || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const syncStartTime = new Date().toISOString();

    const orders = await fetchShopifyOrders(SHOPIFY_SHOP_DOMAIN, SHOPIFY_ADMIN_API_TOKEN, sinceDate);

    let suppressed = 0;
    let pendingCancelled = 0;

    const emailMap = new Map<string, { order: ShopifyOrder }>();
    for (const order of orders) {
      const email = (order.email || order.customer?.email || "").toLowerCase().trim();
      if (!email) continue;
      if (!emailMap.has(email)) {
        emailMap.set(email, { order });
      }
    }

    for (const [email, { order }] of emailMap) {
      const { error } = await supabase
        .from("email_suppressed_customers")
        .upsert(
          {
            email: email,
            shopify_customer_id: order.customer?.id ? String(order.customer.id) : null,
            first_order_at: order.created_at,
            reason: "shopify_order_placed",
            order_id: String(order.id),
          },
          { onConflict: "email", ignoreDuplicates: false },
        );

      if (!error) suppressed++;

      const { count } = await supabase
        .from("email_queue")
        .select("id", { count: "exact", head: true })
        .eq("recipient_email", email)
        .eq("status", "pending");

      if (count && count > 0) {
        await supabase
          .from("email_queue")
          .update({ status: "cancelled" })
          .eq("recipient_email", email)
          .eq("status", "pending");
        pendingCancelled += count;
      }
    }

    await supabase
      .from("email_sync_state")
      .upsert({ id: "shopify_orders_sync", last_synced_at: syncStartTime, updated_at: new Date().toISOString() });

    await supabase.from("cron_run_log").insert({
      job_name: "sync-shopify-orders",
      status: "success",
      details: JSON.stringify({ orders_fetched: orders.length, emails_suppressed: suppressed, pending_cancelled: pendingCancelled }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        orders_fetched: orders.length,
        emails_suppressed: suppressed,
        pending_cancelled: pendingCancelled,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sync-shopify-orders error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
