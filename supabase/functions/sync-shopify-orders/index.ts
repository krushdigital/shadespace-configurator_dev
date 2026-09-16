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
  total_price?: string;
  currency?: string;
  note_attributes?: Array<{ name: string; value: string }>;
  line_items?: Array<{
    title?: string;
    quantity?: number;
    price?: string;
    properties?: Array<{ name: string; value: string }>;
  }>;
  customer?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
  };
}

async function fetchAllPaidOrders(
  shopDomain: string,
  adminToken: string,
  since: string
): Promise<ShopifyOrder[]> {
  const apiVersion = "2024-10";
  const allOrders: ShopifyOrder[] = [];
  let pageUrl: string | null =
    `https://${shopDomain}/admin/api/${apiVersion}/orders.json?status=any&financial_status=paid&created_at_min=${encodeURIComponent(since)}&limit=250`;

  while (pageUrl) {
    const res = await fetch(pageUrl, {
      headers: {
        "X-Shopify-Access-Token": adminToken,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shopify API ${res.status}: ${errText}`);
    }

    const { orders } = (await res.json()) as { orders: ShopifyOrder[] };
    allOrders.push(...orders);

    // Follow Link header for pagination
    const linkHeader = res.headers.get("Link") || "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = nextMatch ? nextMatch[1] : null;
  }

  return allOrders;
}

function extractQuoteReference(order: ShopifyOrder): string | null {
  const noteAttributes = order.note_attributes || [];
  const quoteRefAttr = noteAttributes.find(
    (attr) =>
      attr.name === "quote_reference" || attr.name === "Quote Reference"
  );
  if (quoteRefAttr?.value) return quoteRefAttr.value;

  if (order.line_items) {
    for (const item of order.line_items) {
      const props = item.properties || [];
      const refProp = props.find(
        (p) => p.name === "_locked_quote_reference"
      );
      if (refProp?.value) return refProp.value;
    }
  }

  return null;
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

    const lastSynced = syncState?.last_synced_at
      ? new Date(syncState.last_synced_at).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch ALL paid orders with pagination
    const orders = await fetchAllPaidOrders(shopDomain, adminToken, lastSynced);

    let matched = 0;
    let created = 0;
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

      // Try to match by quote reference
      let matchedQuoteId: string | null = null;
      let matchedQuoteRef: string | null = null;
      const candidateRef = extractQuoteReference(order);

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

      // Fallback: match by email on most recent non-purchased quote
      if (!matchedQuoteId) {
        const { data: emailMatch } = await supabase
          .from("saved_quotes")
          .select("id, quote_reference")
          .ilike("customer_email", customerEmail)
          .in("status", [
            "quote_ready",
            "completed",
            "checkout_pending",
            "in_progress",
          ])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (emailMatch) {
          matchedQuoteId = emailMatch.id;
          matchedQuoteRef = emailMatch.quote_reference;
        }
      }

      if (matchedQuoteId) {
        await markQuotePurchased(
          supabase,
          matchedQuoteId,
          matchedQuoteRef,
          shopifyOrderId,
          shopifyOrderNumber,
          customerEmail,
          purchasedAt,
          order
        );
        matched++;
      } else {
        // Create a quote record from the order so nothing is silently lost
        await createQuoteFromOrder(
          supabase,
          shopifyOrderId,
          shopifyOrderNumber,
          customerEmail,
          purchasedAt,
          order
        );
        created++;
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
      created,
      skipped,
    });

    return jsonResponse({
      success: true,
      orders_fetched: orders.length,
      matched,
      created,
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

async function markQuotePurchased(
  supabase: ReturnType<typeof createClient>,
  quoteId: string,
  quoteRef: string | null,
  shopifyOrderId: string,
  shopifyOrderNumber: string,
  customerEmail: string,
  purchasedAt: string,
  order: ShopifyOrder
) {
  const shippingFirst =
    order.shipping_address?.first_name || order.customer?.first_name || "";
  const shippingLast =
    order.shipping_address?.last_name || order.customer?.last_name || "";

  const { data: existingQuote } = await supabase
    .from("saved_quotes")
    .select(
      "customer_first_name, customer_last_name, customer_email, quote_thread_id"
    )
    .eq("id", quoteId)
    .maybeSingle();

  const updatePayload: Record<string, unknown> = {
    status: "purchased",
    shopify_order_id: shopifyOrderId,
    shopify_order_number: shopifyOrderNumber,
    purchased_at: purchasedAt,
    updated_at: new Date().toISOString(),
  };

  if (order.shipping_address) {
    updatePayload.shipping_address = order.shipping_address;
  }

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
    .eq("id", quoteId);

  // Update thread status if the quote belongs to a thread
  const threadId = existingQuote?.quote_thread_id;
  if (threadId) {
    await supabase
      .from("quote_threads")
      .update({
        status: "purchased",
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    // Mark this quote as the primary in the thread
    await supabase
      .from("saved_quotes")
      .update({ is_thread_primary: true })
      .eq("id", quoteId);

    // De-primary other quotes in the same thread
    await supabase
      .from("saved_quotes")
      .update({ is_thread_primary: false })
      .eq("quote_thread_id", threadId)
      .neq("id", quoteId);
  }

  // Add suppression record
  await supabase.from("email_suppressed_customers").upsert(
    {
      email: customerEmail,
      shopify_customer_id: order.customer?.id
        ? String(order.customer.id)
        : null,
      first_order_at: purchasedAt,
      reason: "shopify_order_placed",
      order_id: shopifyOrderId,
      quote_id: quoteId,
      quote_reference: quoteRef,
    },
    { onConflict: "email,quote_id" }
  );

  // Cancel all pending/queued emails for this quote and its thread
  await cancelPendingEmails(supabase, quoteId, customerEmail, threadId);
}

async function cancelPendingEmails(
  supabase: ReturnType<typeof createClient>,
  quoteId: string,
  email: string,
  threadId: string | null
) {
  // Cancel emails for the specific quote
  await supabase
    .from("email_queue")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("quote_id", quoteId)
    .in("status", ["pending", "queued"]);

  // Cancel emails for all quotes in the same thread
  if (threadId) {
    const { data: threadQuotes } = await supabase
      .from("saved_quotes")
      .select("id")
      .eq("quote_thread_id", threadId);

    if (threadQuotes && threadQuotes.length > 0) {
      const threadQuoteIds = threadQuotes.map((q: { id: string }) => q.id);
      await supabase
        .from("email_queue")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .in("quote_id", threadQuoteIds)
        .in("status", ["pending", "queued"]);
    }
  }

  // Also cancel by email address for any quotes not linked to the thread
  await supabase
    .from("email_queue")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("recipient_email", email)
    .in("status", ["pending", "queued"]);
}

async function createQuoteFromOrder(
  supabase: ReturnType<typeof createClient>,
  shopifyOrderId: string,
  shopifyOrderNumber: string,
  customerEmail: string,
  purchasedAt: string,
  order: ShopifyOrder
) {
  const shippingFirst =
    order.shipping_address?.first_name || order.customer?.first_name || "";
  const shippingLast =
    order.shipping_address?.last_name || order.customer?.last_name || "";

  // Generate a unique reference
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const reference = `SS-SYNC-${ts}-${rand}`;

  // Generate access token
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const accessToken = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const now = new Date().toISOString();

  const { error } = await supabase.from("saved_quotes").insert({
    quote_reference: reference,
    access_token: accessToken,
    customer_email: customerEmail,
    customer_first_name: shippingFirst || null,
    customer_last_name: shippingLast || null,
    status: "purchased",
    shopify_order_id: shopifyOrderId,
    shopify_order_number: shopifyOrderNumber,
    purchased_at: purchasedAt,
    shipping_address: order.shipping_address || null,
    config_data: {},
    calculations_data: {},
    current_step: 0,
    total_steps: 7,
    created_at: purchasedAt,
    updated_at: now,
    is_thread_primary: true,
    quote_name: `Order ${shopifyOrderNumber}`,
    name_auto_generated: true,
  });

  if (error) {
    console.error("Failed to create quote from order:", error, {
      shopifyOrderId,
    });
    return;
  }

  // Add suppression so no emails are ever sent for this customer
  await supabase.from("email_suppressed_customers").upsert(
    {
      email: customerEmail,
      shopify_customer_id: order.customer?.id
        ? String(order.customer.id)
        : null,
      first_order_at: purchasedAt,
      reason: "shopify_order_placed",
      order_id: shopifyOrderId,
      quote_id: null,
      quote_reference: reference,
    },
    { onConflict: "email,quote_id" }
  );
}
