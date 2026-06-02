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

interface OrderPayload {
  customer_email: string;
  shopify_order_id: string;
  shopify_order_number: string;
  quote_reference?: string;
  purchased_at?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const expectedToken = Deno.env.get("ORDER_SYNC_SECRET");
    if (
      expectedToken &&
      authHeader !== `Bearer ${expectedToken}`
    ) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: OrderPayload = await req.json();

    if (!body.customer_email || !body.shopify_order_id) {
      return jsonResponse(
        { error: "customer_email and shopify_order_id are required" },
        400
      );
    }

    const email = body.customer_email.toLowerCase().trim();
    const purchasedAt = body.purchased_at || new Date().toISOString();

    // Find matching saved quote(s)
    let matchedQuoteId: string | null = null;
    let matchedQuoteRef: string | null = null;

    if (body.quote_reference) {
      // Exact match by quote reference
      const { data: exactMatch } = await supabase
        .from("saved_quotes")
        .select("id, quote_reference")
        .eq("quote_reference", body.quote_reference)
        .maybeSingle();

      if (exactMatch) {
        matchedQuoteId = exactMatch.id;
        matchedQuoteRef = exactMatch.quote_reference;
      }
    }

    if (!matchedQuoteId) {
      // Fallback: match by email on non-expired, non-purchased quotes
      const { data: emailMatch } = await supabase
        .from("saved_quotes")
        .select("id, quote_reference")
        .ilike("customer_email", email)
        .in("status", ["quote_ready", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (emailMatch) {
        matchedQuoteId = emailMatch.id;
        matchedQuoteRef = emailMatch.quote_reference;
      }
    }

    // Update the matched quote with purchase info
    if (matchedQuoteId) {
      await supabase
        .from("saved_quotes")
        .update({
          status: "purchased",
          shopify_order_id: body.shopify_order_id,
          shopify_order_number: body.shopify_order_number,
          purchased_at: purchasedAt,
        })
        .eq("id", matchedQuoteId);
    }

    // Insert into email_suppressed_customers for automation suppression
    await supabase.from("email_suppressed_customers").upsert(
      {
        email,
        shopify_customer_id: null,
        first_order_at: purchasedAt,
        reason: "shopify_order_placed",
        order_id: body.shopify_order_id,
        quote_id: matchedQuoteId,
        quote_reference: matchedQuoteRef,
      },
      { onConflict: "email,quote_id" }
    );

    return jsonResponse({
      success: true,
      matched_quote_id: matchedQuoteId,
      matched_quote_reference: matchedQuoteRef,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
