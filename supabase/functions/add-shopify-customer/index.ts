import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DesignEntry {
  reference: string;
  name: string;
  customer_ref?: string;
  resume_url: string;
  price?: number;
  currency?: string;
  saved_at: string;
  status: "in_progress" | "quote_ready";
  current_step?: number;
  total_steps?: number;
  thumbnail_url?: string;
  corners?: number;
  fabric?: string;
}

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
  designEntry?: DesignEntry;
}

const MAX_SAVED_DESIGNS = 25;

async function getExistingDesigns(
  shopDomain: string,
  apiVersion: string,
  token: string,
  customerId: number | string,
): Promise<DesignEntry[]> {
  const url = `https://${shopDomain}/admin/api/${apiVersion}/customers/${customerId}/metafields.json?namespace=custom&key=saved_designs`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const metafield = data.metafields?.[0];
  if (!metafield?.value) return [];
  try {
    return JSON.parse(metafield.value) as DesignEntry[];
  } catch {
    return [];
  }
}

async function upsertDesignsMetafield(
  shopDomain: string,
  apiVersion: string,
  token: string,
  customerId: number | string,
  designs: DesignEntry[],
): Promise<void> {
  const url = `https://${shopDomain}/admin/api/${apiVersion}/customers/${customerId}/metafields.json`;
  await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metafield: {
        namespace: "custom",
        key: "saved_designs",
        value: JSON.stringify(designs),
        type: "json",
      },
    }),
  });
}

function mergeDesignEntry(existing: DesignEntry[], entry: DesignEntry): DesignEntry[] {
  const idx = existing.findIndex((d) => d.reference === entry.reference);
  let updated: DesignEntry[];
  if (idx >= 0) {
    updated = [...existing];
    updated[idx] = { ...updated[idx], ...entry, saved_at: entry.saved_at };
  } else {
    updated = [entry, ...existing];
  }
  return updated.slice(0, MAX_SAVED_DESIGNS);
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
    const { email, tags, metafields, quoteReference, totalPrice, currency, designEntry } = payload;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      const allTags = Array.from(new Set([...existingTags, ...tags, "has_saved_designs"]));

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

      // Update saved_designs metafield with the new design entry
      if (designEntry) {
        try {
          const existingDesigns = await getExistingDesigns(
            SHOPIFY_SHOP_DOMAIN, SHOPIFY_API_VERSION, SHOPIFY_ADMIN_API_TOKEN, customerId
          );
          const updatedDesigns = mergeDesignEntry(existingDesigns, designEntry);
          await upsertDesignsMetafield(
            SHOPIFY_SHOP_DOMAIN, SHOPIFY_API_VERSION, SHOPIFY_ADMIN_API_TOKEN, customerId, updatedDesigns
          );
        } catch (metafieldErr) {
          console.error("Failed to update saved_designs metafield:", metafieldErr);
        }
      }

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

    const customerPayload: any = {
      customer: {
        email: email,
        first_name: payload.firstName || undefined,
        last_name: payload.lastName || undefined,
        tags: [...tags, "account_created", "has_saved_designs"].join(", "),
        verified_email: true,
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

    // Add saved_designs metafield for new customer
    if (designEntry) {
      customerMetafields.push({
        namespace: "custom",
        key: "saved_designs",
        value: JSON.stringify([designEntry]),
        type: "json",
      });
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
    const newCustomerId = createdCustomer.customer.id;

    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: String(newCustomerId),
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
