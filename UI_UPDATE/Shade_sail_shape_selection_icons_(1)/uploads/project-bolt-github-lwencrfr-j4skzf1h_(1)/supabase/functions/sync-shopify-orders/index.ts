import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  email: string;
  contact_email?: string;
  created_at: string;
  financial_status: string;
  note_attributes?: Array<{ name: string; value: string }>;
  line_items?: Array<{ properties?: Array<{ name: string; value: string }> }>;
  customer?: { id: number; email: string; first_name?: string; last_name?: string };
  shipping_address?: { first_name?: string; last_name?: string };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const shopDomain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const adminToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");

    if (!shopDomain || !adminToken) {
      console.error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_TOKEN");
      return jsonResponse({ error: "Missing Shopify configuration" }, 500);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the last sync timestamp
    const { data: syncState } = await supabase
      .from("email_sync_state")
      .select("last_synced_at")
      .eq("id", "shopify_orders")
      .maybeSingle();

    // Default to 24 hours ago if never synced
    const lastSynced = syncState?.last_synced_at
      ? new Date(syncState.last_synced_at).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch paid orders from Shopify since last sync
    const apiVersion = "2024-10";
    const ordersUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?status=any&financial_status=paid&created_at_min=${encodeURIComponent(lastSynced)}&limit=50`;

    const shopifyRes = await fetch(ordersUrl, {
      headers: {
        "X-Shopify-Access-Token": adminToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopifyRes.ok) {
      const errText = await shopifyRes.text();
      console.error("Shopify API error:", shopifyRes.status, errText);
      return jsonResponse(
        { error: `Shopify API error: ${shopifyRes.status}` },
        502
      );
    }

    const { orders } = (await shopifyRes.json()) as { orders: ShopifyOrder[] };
    let matched = 0;
    let skipped = 0;

    for (const order of orders) {
      const shopifyOrderId = String(order.id);
      const shopifyOrderNumber = order.name || `#${order.order_number}`;
      const customerEmail = (
        order.email || order.contact_email || order.customer?.email || ""
      ).toLowerCase().trim();
      const purchasedAt = order.created_at;

      if (!customerEmail) {
        skipped++;
        continue;
      }

      // Skip if already processed
      const { data: existing } = await supabase
        .from("saved_quotes")
        .select("id")
        .eq("shopify_order_id", shopifyOrderId)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Try to match by quote reference from note attributes or line item properties
      let matchedQuoteId: string | null = null;
      let matchedQuoteRef: string | null = null;

      const noteAttributes = order.note_attributes || [];
      const quoteRefAttr = noteAttributes.find(
        (attr) =>
          attr.name === "quote_reference" || attr.name === "Quote Reference"
      );

      let candidateRef: string | null = quoteRefAttr?.value || null;

      // Check line item properties for _locked_quote_reference
      if (!candidateRef && order.line_items) {
        for (const item of order.line_items) {
          const props = item.properties || [];
          const refProp = props.find(
            (p) => p.name === "_locked_quote_reference"
          );
          if (refProp?.value) {
            candidateRef = refProp.value;
            break;
          }
        }
      }

      if (candidateRef) {
        const { data: exactMatch } = await supabase
          .from("saved_quotes")
          .select("id, quote_reference")
          .eq("quote_reference", candidateRef)
          .maybeSingle();

        if (exactMatch) {
          matchedQuoteId = exactMatch.id;
          matchedQuoteRef = exactMatch.quote_reference;
        }
      }

      // Fallback: match by email
      if (!matchedQuoteId) {
        const { data: emailMatch } = await supabase
          .from("saved_quotes")
          .select("id, quote_reference")
          .ilike("customer_email", customerEmail)
          .in("status", ["quote_ready", "completed", "checkout_pending", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (emailMatch) {
          matchedQuoteId = emailMatch.id;
          matchedQuoteRef = emailMatch.quote_reference;
        }
      }

      if (matchedQuoteId) {
        const shippingFirst = order.shipping_address?.first_name || order.customer?.first_name || "";
        const shippingLast = order.shipping_address?.last_name || order.customer?.last_name || "";

        const { data: existingQuote } = await supabase
          .from("saved_quotes")
          .select("customer_first_name, customer_last_name, customer_email")
          .eq("id", matchedQuoteId)
          .maybeSingle();

        const updatePayload: Record<string, unknown> = {
          status: "purchased",
          shopify_order_id: shopifyOrderId,
          shopify_order_number: shopifyOrderNumber,
          purchased_at: purchasedAt,
        };

        if (!existingQuote?.customer_first_name && shippingFirst) {
          updatePayload.customer_first_name = shippingFirst;
        }
        if (!existingQuote?.customer_last_name && shippingLast) {
          updatePayload.customer_last_name = shippingLast;
        }
        if (!existingQuote?.customer_email && customerEmail) {
          updatePayload.customer_email = customerEmail;
        }

        await supabase
          .from("saved_quotes")
          .update(updatePayload)
          .eq("id", matchedQuoteId);

        await supabase.from("email_suppressed_customers").upsert(
          {
            email: customerEmail,
            shopify_customer_id: order.customer?.id
              ? String(order.customer.id)
              : null,
            first_order_at: purchasedAt,
            reason: "shopify_order_placed",
            order_id: shopifyOrderId,
            quote_id: matchedQuoteId,
            quote_reference: matchedQuoteRef,
          },
          { onConflict: "email,quote_id" }
        );

        matched++;
      } else {
        skipped++;
      }
    }

    // Update sync state
    await supabase.from("email_sync_state").upsert(
      {
        id: "shopify_orders",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    console.log("sync-shopify-orders completed", {
      total: orders.length,
      matched,
      skipped,
    });

    return jsonResponse({
      success: true,
      orders_fetched: orders.length,
      matched,
      skipped,
    });
  } catch (err) {
    console.error("sync-shopify-orders error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
