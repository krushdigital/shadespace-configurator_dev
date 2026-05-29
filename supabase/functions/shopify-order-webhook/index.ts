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

function extractQuoteReferences(order: any): string[] {
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
    const quoteRefs = extractQuoteReferences(order);
    let pendingCancelled = 0;

    if (quoteRefs.length > 0) {
      for (const ref of quoteRefs) {
        const { data: quote } = await supabase
          .from("saved_quotes")
          .select("id")
          .eq("quote_reference", ref)
          .maybeSingle();

        await supabase
          .from("email_suppressed_customers")
          .upsert(
            {
              email,
              shopify_customer_id: order.customer?.id ? String(order.customer.id) : null,
              first_order_at: order.created_at || new Date().toISOString(),
              reason: "shopify_order_placed",
              order_id: String(order.id),
              quote_id: quote?.id || null,
              quote_reference: ref,
            },
            { onConflict: "idx_email_suppressed_email_quote", ignoreDuplicates: false },
          );

        if (quote?.id) {
          // Populate customer details from Shopify order into the saved quote
          const orderFirstName = order.shipping_address?.first_name
            || order.customer?.first_name || "";
          const orderLastName = order.shipping_address?.last_name
            || order.customer?.last_name || "";

          if (orderFirstName || orderLastName || email) {
            const updateFields: Record<string, unknown> = {};
            if (orderFirstName) updateFields.customer_first_name = orderFirstName;
            if (orderLastName) updateFields.customer_last_name = orderLastName;
            if (email) updateFields.customer_email = email;

            await supabase
              .from("saved_quotes")
              .update(updateFields)
              .eq("id", quote.id)
              .or("customer_first_name.is.null,customer_first_name.eq.");
          }

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
      // No quote reference - blanket suppression
      await supabase
        .from("email_suppressed_customers")
        .upsert(
          {
            email,
            shopify_customer_id: order.customer?.id ? String(order.customer.id) : null,
            first_order_at: order.created_at || new Date().toISOString(),
            reason: "shopify_order_placed",
            order_id: String(order.id),
            quote_id: null,
            quote_reference: null,
          },
          { onConflict: "idx_email_suppressed_email_quote", ignoreDuplicates: false },
        );

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
        pendingCancelled = count;
      }
    }

    console.log(`Suppressed ${email} for ${quoteRefs.length || 'all'} quotes (order ${order.id}), cancelled ${pendingCancelled} pending emails`);

    return new Response(
      JSON.stringify({ success: true, email, quote_references: quoteRefs, pending_cancelled: pendingCancelled }),
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
