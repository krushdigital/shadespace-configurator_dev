import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShopifyCustomerPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  tags: string[];
  metafields?: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
  quoteReference?: string;
  totalPrice?: number;
  currency?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: ShopifyCustomerPayload = await req.json();
    const { email, tags, metafields, quoteReference, totalPrice, currency } = payload;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Shopify credentials from environment
    const SHOPIFY_SHOP_DOMAIN = Deno.env.get("SHOPIFY_SHOP_DOMAIN");
    const SHOPIFY_ADMIN_API_TOKEN = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
    const SHOPIFY_API_VERSION = "2025-01";

    if (!SHOPIFY_SHOP_DOMAIN || !SHOPIFY_ADMIN_API_TOKEN) {
      console.error("Shopify credentials not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Shopify integration not configured",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if customer already exists
    const searchUrl = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/customers/search.json?query=email:${encodeURIComponent(email)}`;

    const searchResponse = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Shopify search error:", errorText);
      throw new Error(`Shopify search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    if (searchData.customers && searchData.customers.length > 0) {
      // Customer exists, update tags and metadata
      const existingCustomer = searchData.customers[0];
      const customerId = existingCustomer.id;

      // Merge existing tags with new tags
      const existingTags = existingCustomer.tags ? existingCustomer.tags.split(", ") : [];
      const allTags = Array.from(new Set([...existingTags, ...tags]));

      const updateUrl = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/customers/${customerId}.json`;

      const updatePayload: any = {
        customer: {
          id: customerId,
          tags: allTags.join(", "),
        },
      };

      // Add metafields if provided
      if (metafields && metafields.length > 0) {
        updatePayload.customer.metafields = metafields;
      }

      const updateResponse = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error("Shopify update error:", errorData);
        throw new Error(`Shopify API error: ${JSON.stringify(errorData)}`);
      }

      await updateResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          customer: {
            id: String(customerId),
            email: email,
            isNew: false,
            tags: allTags,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new customer
    const customerPayload: any = {
      customer: {
        email: email,
        tags: tags.join(", "),
        verified_email: false,
        email_marketing_consent: {
          state: "not_subscribed",
          opt_in_level: "single_opt_in",
        },
        note: quoteReference ? `Quote saved: ${quoteReference}` : "Customer from configurator",
      },
    };

    // Add custom metafields for quote tracking
    const customerMetafields: any[] = metafields || [];

    if (quoteReference || totalPrice) {
      customerMetafields.push(
        {
          namespace: "custom",
          key: "last_quote_reference",
          value: quoteReference || "",
          type: "single_line_text_field",
        },
        {
          namespace: "custom",
          key: "last_quote_value",
          value: totalPrice ? totalPrice.toString() : "0",
          type: "number_decimal",
        },
        {
          namespace: "custom",
          key: "last_quote_currency",
          value: currency || "NZD",
          type: "single_line_text_field",
        },
        {
          namespace: "custom",
          key: "quote_saved_at",
          value: new Date().toISOString(),
          type: "date_time",
        }
      );
    }

    if (customerMetafields.length > 0) {
      customerPayload.customer.metafields = customerMetafields;
    }

    const shopifyEndpoint = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/customers.json`;

    const createResponse = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customerPayload),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error("Shopify create error:", errorData);
      throw new Error(`Shopify API error: ${JSON.stringify(errorData)}`);
    }

    const createdCustomer = await createResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: String(createdCustomer.customer.id),
          email: email,
          isNew: true,
          tags: tags,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in add-shopify-customer:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
