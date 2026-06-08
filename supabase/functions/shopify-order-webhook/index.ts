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

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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

    // Try to match by quote reference from note attributes or line item properties
    let matchedQuoteId: string | null = null;
    let matchedQuoteRef: string | null = null;

    // Strategy 1: Check order-level note_attributes
    const noteAttributes = order.note_attributes || [];
    const quoteRefAttr = noteAttributes.find(
      (attr: { name: string; value: string }) =>
        attr.name === "quote_reference" || attr.name === "Quote Reference"
    );

    let candidateRef: string | null = quoteRefAttr?.value || null;

    // Strategy 2: Check line item properties for _locked_quote_reference
    if (!candidateRef && order.line_items) {
      for (const item of order.line_items) {
        const props = item.properties || [];
        const refProp = props.find(
          (p: { name: string; value: string }) =>
            p.name === "_locked_quote_reference"
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

    // Fallback: match by email on the most recent non-purchased quote
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

    // If still no match, create a quote record from order data for fulfilment PDF
    if (!matchedQuoteId) {
      const createdQuote = await createQuoteFromOrder(supabase, order, customerEmail, shopifyOrderId, shopifyOrderNumber, purchasedAt);
      if (createdQuote) {
        matchedQuoteId = createdQuote.id;
        matchedQuoteRef = createdQuote.quote_reference;
      }
    }

    // Update the matched quote with purchase info and backfill customer details
    if (matchedQuoteId) {
      const shippingFirst = order.shipping_address?.first_name || order.customer?.first_name || "";
      const shippingLast = order.shipping_address?.last_name || order.customer?.last_name || "";

      const { data: existingQuote } = await supabase
        .from("saved_quotes")
        .select("customer_first_name, customer_last_name, customer_email, quote_thread_id, auto_generated_from_order")
        .eq("id", matchedQuoteId)
        .maybeSingle();

      // Skip update if we just created this quote from the order (already populated)
      if (!existingQuote?.auto_generated_from_order) {
        const updatePayload: Record<string, unknown> = {
          status: "purchased",
          shopify_order_id: shopifyOrderId,
          shopify_order_number: shopifyOrderNumber,
          purchased_at: purchasedAt,
          updated_at: new Date().toISOString(),
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

        // Store shipping address and order notes for fulfilment PDF
        if (order.shipping_address) {
          updatePayload.shipping_address = {
            address1: order.shipping_address.address1 || "",
            address2: order.shipping_address.address2 || "",
            city: order.shipping_address.city || "",
            province: order.shipping_address.province || "",
            zip: order.shipping_address.zip || "",
            country: order.shipping_address.country || "",
          };
        }
        if (order.note) {
          updatePayload.order_notes = order.note;
        }
        if (order.total_weight) {
          updatePayload.estimated_weight_kg = order.total_weight / 1000;
        }

        await supabase
          .from("saved_quotes")
          .update(updatePayload)
          .eq("id", matchedQuoteId);
      }

      // Thread-aware: mark entire thread as converted and suppress emails
      const threadId = existingQuote?.quote_thread_id;
      if (threadId) {
        // Set purchased quote as the primary
        await supabase
          .from("saved_quotes")
          .update({ is_thread_primary: false })
          .eq("quote_thread_id", threadId)
          .neq("id", matchedQuoteId);

        await supabase
          .from("saved_quotes")
          .update({ is_thread_primary: true })
          .eq("id", matchedQuoteId);

        // Update thread metadata
        const { count: threadCount } = await supabase
          .from("saved_quotes")
          .select("id", { count: "exact", head: true })
          .eq("quote_thread_id", threadId);

        const { data: purchasedQuote } = await supabase
          .from("saved_quotes")
          .select("locked_total, locked_total_currency, calculations_data, config_data")
          .eq("id", matchedQuoteId)
          .maybeSingle();

        const value = purchasedQuote?.locked_total ?? purchasedQuote?.calculations_data?.totalPrice ?? null;
        const currency = purchasedQuote?.locked_total_currency ?? purchasedQuote?.config_data?.currency ?? null;

        await supabase
          .from("quote_threads")
          .update({
            primary_quote_id: matchedQuoteId,
            status: "purchased",
            quote_count: threadCount ?? 1,
            latest_value: value,
            latest_currency: currency,
            updated_at: new Date().toISOString(),
          })
          .eq("id", threadId);

        // Cancel pending emails for ALL quotes in this thread
        const { data: threadQuotes } = await supabase
          .from("saved_quotes")
          .select("id")
          .eq("quote_thread_id", threadId);

        if (threadQuotes && threadQuotes.length > 0) {
          const threadQuoteIds = threadQuotes.map((q: { id: string }) => q.id);
          for (let i = 0; i < threadQuoteIds.length; i += 50) {
            const batch = threadQuoteIds.slice(i, i + 50);
            await supabase
              .from("email_queue")
              .update({ status: "skipped" })
              .in("status", ["pending", "sending"])
              .in("quote_id", batch);
          }
        }
      }
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

async function createQuoteFromOrder(
  supabase: ReturnType<typeof createClient>,
  order: Record<string, unknown>,
  customerEmail: string,
  shopifyOrderId: string,
  shopifyOrderNumber: string,
  purchasedAt: string
): Promise<{ id: string; quote_reference: string } | null> {
  try {
    const lineItems = (order.line_items as Array<Record<string, unknown>>) || [];
    if (lineItems.length === 0) return null;

    const item = lineItems[0];
    const props = (item.properties as Array<{ name: string; value: string }>) || [];

    const getProp = (name: string): string | null => {
      const p = props.find((pr) => pr.name === name);
      return p?.value || null;
    };

    // Extract config from line item properties
    const corners = parseInt(getProp("Corners") || getProp("corners") || "4", 10);
    const fabricMaterial = getProp("Fabric Material") || getProp("fabric_material") || "";
    const fabricColor = getProp("Fabric Color") || getProp("fabric_color") || "";
    const edgeType = getProp("Edge Type") || getProp("edge_type") || "";
    const currency = getProp("_locked_currency") || "NZD";
    const totalPrice = parseFloat(getProp("_locked_total") || String(item.price || 0));

    const configData: Record<string, unknown> = {
      corners,
      fabricType: fabricMaterial,
      fabricColor,
      edgeType,
      currency,
      measurements: {},
      measurementOption: getProp("_fabrication_type") === "fabricated_to_fit" ? "adjust" : "exact",
    };

    const calculationsData = {
      totalPrice,
      currency,
    };

    // Generate reference
    const digits = "0123456789";
    let num = "";
    for (let i = 0; i < 6; i++) {
      num += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    const quoteReference = `SS-${num}`;

    const shippingFirst = (order.shipping_address as Record<string, string>)?.first_name || (order.customer as Record<string, string>)?.first_name || "";
    const shippingLast = (order.shipping_address as Record<string, string>)?.last_name || (order.customer as Record<string, string>)?.last_name || "";

    const insertPayload: Record<string, unknown> = {
      quote_reference: quoteReference,
      access_token: generateToken(),
      customer_email: customerEmail,
      customer_first_name: shippingFirst || null,
      customer_last_name: shippingLast || null,
      config_data: configData,
      calculations_data: calculationsData,
      quote_name: `Order ${shopifyOrderNumber}`,
      name_auto_generated: true,
      current_step: 7,
      total_steps: 7,
      completion_percentage: 100,
      status: "purchased",
      shopify_order_id: shopifyOrderId,
      shopify_order_number: shopifyOrderNumber,
      purchased_at: purchasedAt,
      locked_total: totalPrice || null,
      locked_total_currency: currency,
      locked_at: purchasedAt,
      auto_generated_from_order: true,
      marketing_opt_in: false,
      is_thread_primary: true,
    };

    if (order.shipping_address) {
      const addr = order.shipping_address as Record<string, string>;
      insertPayload.shipping_address = {
        address1: addr.address1 || "",
        address2: addr.address2 || "",
        city: addr.city || "",
        province: addr.province || "",
        zip: addr.zip || "",
        country: addr.country || "",
      };
    }
    if (order.note) {
      insertPayload.order_notes = order.note;
    }
    if (order.total_weight) {
      insertPayload.estimated_weight_kg = (order.total_weight as number) / 1000;
    }

    const { data: inserted, error } = await supabase
      .from("saved_quotes")
      .insert(insertPayload)
      .select("id, quote_reference")
      .single();

    if (error) {
      console.error("Failed to create quote from order:", error);
      return null;
    }

    // Create a thread for this auto-generated quote
    const { data: newThread } = await supabase
      .from("quote_threads")
      .insert({
        customer_email: customerEmail,
        primary_quote_id: inserted.id,
        status: "purchased",
        quote_count: 1,
        latest_value: totalPrice || null,
        latest_currency: currency,
      })
      .select("id")
      .single();

    if (newThread) {
      await supabase
        .from("saved_quotes")
        .update({ quote_thread_id: newThread.id })
        .eq("id", inserted.id);
    }

    console.log("Auto-created quote from order:", { id: inserted.id, ref: inserted.quote_reference });
    return inserted;
  } catch (err) {
    console.error("createQuoteFromOrder error:", err);
    return null;
  }
}
