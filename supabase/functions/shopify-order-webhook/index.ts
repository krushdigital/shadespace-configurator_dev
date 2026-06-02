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

async function verifyShopifyHmac(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computedHmac = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );
  return computedHmac === hmacHeader;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    const shopifySecret = Deno.env.get("SHOPIFY_API_SECRET");
    if (shopifySecret) {
      const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";
      const valid = await verifyShopifyHmac(rawBody, hmacHeader, shopifySecret);
      if (!valid) {
        console.error("Invalid Shopify HMAC signature");
        return jsonResponse({ error: "Invalid signature" }, 401);
      }
    }

    const order = JSON.parse(rawBody);

    const shopifyOrderId = String(order.id);
    const shopifyOrderNumber = order.name || `#${order.order_number}`;
    const customerEmail = (
      order.email ||
      order.contact_email ||
      order.customer?.email ||
      ""
    ).toLowerCase().trim();
    const purchasedAt = order.created_at || new Date().toISOString();

    if (!customerEmail) {
      console.error("No email found in order payload", { orderId: shopifyOrderId });
      return jsonResponse({ error: "No customer email in order" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if this order was already processed
    const { data: existingOrder } = await supabase
      .from("saved_quotes")
      .select("id")
      .eq("shopify_order_id", shopifyOrderId)
      .maybeSingle();

    if (existingOrder) {
      return jsonResponse({ success: true, message: "Order already processed", matched_quote_id: existingOrder.id });
    }

    // Try to match by quote reference in note attributes
    let matchedQuoteId: string | null = null;
    let matchedQuoteRef: string | null = null;

    const noteAttributes = order.note_attributes || [];
    const quoteRefAttr = noteAttributes.find(
      (attr: { name: string; value: string }) =>
        attr.name === "quote_reference" || attr.name === "Quote Reference"
    );

    if (quoteRefAttr?.value) {
      const { data: exactMatch } = await supabase
        .from("saved_quotes")
        .select("id, quote_reference")
        .eq("quote_reference", quoteRefAttr.value)
        .maybeSingle();

      if (exactMatch) {
        matchedQuoteId = exactMatch.id;
        matchedQuoteRef = exactMatch.quote_reference;
      }
    }

    // Fallback: match by email on the most recent non-purchased quote
    if (!matchedQuoteId) {
      const { data: emailMatch } = await supabase
        .from("saved_quotes")
        .select("id, quote_reference")
        .ilike("customer_email", customerEmail)
        .in("status", ["quote_ready", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (emailMatch) {
        matchedQuoteId = emailMatch.id;
        matchedQuoteRef = emailMatch.quote_reference;
      }
    }

    // Update the matched quote with purchase info and backfill customer details
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
    }

    // Insert suppression record
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

    console.log("Order processed", {
      shopifyOrderId,
      shopifyOrderNumber,
      customerEmail,
      matchedQuoteId,
      matchedQuoteRef,
    });

    return jsonResponse({
      success: true,
      matched_quote_id: matchedQuoteId,
      matched_quote_reference: matchedQuoteRef,
    });
  } catch (err) {
    console.error("shopify-order-webhook error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
