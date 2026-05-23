import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ShopifyLineItem {
  title?: string;
  properties?: Array<{ name: string; value: string }>;
}

interface ShopifyOrder {
  id: number;
  email: string;
  created_at: string;
  note?: string;
  note_attributes?: Array<{ name: string; value: string }>;
  line_items?: ShopifyLineItem[];
  customer?: {
    id: number;
    email: string;
  };
}

// Extract quote references from order notes, note_attributes, and line item properties
function extractQuoteReferences(order: ShopifyOrder): string[] {
  const refs = new Set<string>();
  const refPattern = /\b(SS-[A-Z0-9]{6,})\b/gi;

  if (order.note) {
    for (const match of order.note.matchAll(refPattern)) refs.add(match[1].toUpperCase());
  }

  if (order.note_attributes) {
    for (const attr of order.note_attributes) {
      const val = `${attr.name} ${attr.value}`;
      for (const match of val.matchAll(refPattern)) refs.add(match[1].toUpperCase());
    }
  }

  if (order.line_items) {
    for (const item of order.line_items) {
      if (item.title) {
        for (const match of item.title.matchAll(refPattern)) refs.add(match[1].toUpperCase());
      }
      if (item.properties) {
        for (const prop of item.properties) {
          const val = `${prop.name} ${prop.value}`;
          for (const match of val.matchAll(refPattern)) refs.add(match[1].toUpperCase());
        }
      }
    }
  }

  return [...refs];
}

async function fetchShopifyOrders(
  shopDomain: string,
  token: string,
  sinceDate: string,
): Promise<ShopifyOrder[]> {
  const apiVersion = "2025-01";
  const allOrders: ShopifyOrder[] = [];
  let url: string | null =
    `https://${shopDomain}/admin/api/${apiVersion}/orders.json?status=any&created_at_min=${encodeURIComponent(sinceDate)}&limit=250&fields=id,email,created_at,customer,note,note_attributes,line_items`;

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

    for (const order of orders) {
      const email = (order.email || order.customer?.email || "").toLowerCase().trim();
      if (!email) continue;

      const quoteRefs = extractQuoteReferences(order);

      if (quoteRefs.length > 0) {
        // Per-quote suppression: look up quote IDs by reference
        for (const ref of quoteRefs) {
          const { data: quote } = await supabase
            .from("saved_quotes")
            .select("id")
            .eq("quote_reference", ref)
            .maybeSingle();

          const { error } = await supabase
            .from("email_suppressed_customers")
            .upsert(
              {
                email,
                shopify_customer_id: order.customer?.id ? String(order.customer.id) : null,
                first_order_at: order.created_at,
                reason: "shopify_order_placed",
                order_id: String(order.id),
                quote_id: quote?.id || null,
                quote_reference: ref,
              },
              { onConflict: "idx_email_suppressed_email_quote", ignoreDuplicates: false },
            );

          if (!error) suppressed++;

          // Cancel pending emails for this specific quote
          if (quote?.id) {
            const { count } = await supabase
              .from("email_queue")
              .select("id", { count: "exact", head: true })
              .eq("recipient_email", email)
              .eq("quote_id", quote.id)
              .eq("status", "pending");

            if (count && count > 0) {
              await supabase
                .from("email_queue")
                .update({ status: "cancelled" })
                .eq("recipient_email", email)
                .eq("quote_id", quote.id)
                .eq("status", "pending");
              pendingCancelled += count;
            }
          }
        }
      } else {
        // No quote reference found - insert blanket suppression (quote_id = null)
        const { error } = await supabase
          .from("email_suppressed_customers")
          .upsert(
            {
              email,
              shopify_customer_id: order.customer?.id ? String(order.customer.id) : null,
              first_order_at: order.created_at,
              reason: "shopify_order_placed",
              order_id: String(order.id),
              quote_id: null,
              quote_reference: null,
            },
            { onConflict: "idx_email_suppressed_email_quote", ignoreDuplicates: false },
          );

        if (!error) suppressed++;

        // Cancel all pending emails for this email
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
