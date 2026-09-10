import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHOPIFY_STORE = Deno.env.get("SHOPIFY_STORE_DOMAIN") || "";
const SHOPIFY_STOREFRONT_TOKEN = Deno.env.get("SHOPIFY_STOREFRONT_TOKEN") || "";
const HARDWARE_COLLECTION_HANDLE = Deno.env.get("SHOPIFY_HARDWARE_COLLECTION_HANDLE") || "shade-sail-hardware";

// Currency -> representative country code for Shopify @inContext presentment lookup.
// These must match storefront markets configured on Shopify Markets.
const CURRENCY_COUNTRY_MAP: Array<{ currency: string; country: string }> = [
  { currency: "NZD", country: "NZ" },
  { currency: "AUD", country: "AU" },
  { currency: "USD", country: "US" },
  { currency: "GBP", country: "GB" },
  { currency: "EUR", country: "DE" },
  { currency: "CAD", country: "CA" },
];

const QUERY = `
  query HardwareProducts($handle: String!, $cursor: String, $country: CountryCode!) @inContext(country: $country) {
    collection(handle: $handle) {
      products(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id handle title description tags productType
            featuredImage { url }
            variants(first: 1) {
              edges {
                node {
                  id sku title
                  price { amount currencyCode }
                  compareAtPrice { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }
  }
`;

function categoryIdFromProduct(title: string, productType: string, tags: string[]): string | null {
  const haystack = `${title} ${productType} ${tags.join(" ")}`.toLowerCase();
  if (/ratchet/.test(haystack)) return "ratchet_kit";
  if (/bow shackle/.test(haystack)) return "bow_shackle";
  if (/captive/.test(haystack)) return "captive_d_shackle";
  if (/d[- ]?shackle/.test(haystack)) return "d_shackle";
  if (/turnbuckle.*hook|hook.*turnbuckle|hook[- ]?eye/.test(haystack)) return "turnbuckle_hook_eye";
  if (/turnbuckle.*jaw|jaw.*jaw/.test(haystack)) return "turnbuckle_jaw_jaw";
  if (/chain/.test(haystack)) return "chain";
  if (/eye bolt/.test(haystack)) return "eye_bolt";
  if (/pad eye/.test(haystack)) return "pad_eye";
  if (/snap hook|carabiner/.test(haystack)) return "snap_hook";
  return null;
}

interface VariantRow {
  variantId: string;
  productId: string;
  handle: string;
  title: string;
  description: string;
  tags: string[];
  productType: string;
  sku: string | null;
  imageUrl: string;
  prices: Record<string, number>;
  compareAtPrices: Record<string, number>;
}

async function fetchCollection(endpoint: string, country: string): Promise<any[]> {
  const collected: any[] = [];
  let cursor: string | null = null;
  let pages = 0;
  while (pages < 20) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { handle: HARDWARE_COLLECTION_HANDLE, cursor, country },
      }),
    });
    const json = await res.json();
    if (!res.ok || json?.errors) {
      throw new Error(`Shopify request failed for country ${country}: ${JSON.stringify(json?.errors || json)}`);
    }
    const coll = json?.data?.collection;
    if (!coll) {
      throw new Error(`Collection "${HARDWARE_COLLECTION_HANDLE}" not found for country ${country}`);
    }
    for (const edge of coll.products.edges) collected.push(edge.node);
    if (!coll.products.pageInfo.hasNextPage) break;
    cursor = coll.products.pageInfo.endCursor;
    pages += 1;
  }
  return collected;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (!SHOPIFY_STORE || !SHOPIFY_STOREFRONT_TOKEN) {
      return new Response(JSON.stringify({
        error: "Shopify credentials missing",
        missing: [!SHOPIFY_STORE && "SHOPIFY_STORE_DOMAIN", !SHOPIFY_STOREFRONT_TOKEN && "SHOPIFY_STOREFRONT_TOKEN"].filter(Boolean),
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SB_URL, SB_SERVICE);
    const endpoint = `https://${SHOPIFY_STORE}/api/2024-10/graphql.json`;

    // Build variantId -> VariantRow map by iterating each configured market.
    const rowMap = new Map<string, VariantRow>();

    for (const { currency, country } of CURRENCY_COUNTRY_MAP) {
      const products = await fetchCollection(endpoint, country);
      for (const product of products) {
        const variant = product.variants?.edges?.[0]?.node;
        if (!variant) continue;
        const variantId = String(variant.id).split("/").pop() || variant.id;
        const productId = String(product.id).split("/").pop() || product.id;
        const row = rowMap.get(variantId) || {
          variantId,
          productId,
          handle: product.handle,
          title: product.title,
          description: product.description || "",
          tags: product.tags || [],
          productType: product.productType || "",
          sku: variant.sku || null,
          imageUrl: product.featuredImage?.url || "",
          prices: {},
          compareAtPrices: {},
        };
        const amount = Number(variant.price?.amount || 0);
        if (Number.isFinite(amount) && amount > 0) {
          row.prices[currency] = amount;
        }
        const compare = variant.compareAtPrice?.amount ? Number(variant.compareAtPrice.amount) : null;
        if (compare != null && Number.isFinite(compare) && compare > 0) {
          row.compareAtPrices[currency] = compare;
        }
        rowMap.set(variantId, row);
      }
    }

    const now = new Date().toISOString();
    let upserts = 0;
    const upsertErrors: string[] = [];
    const seenVariantIds = new Set<string>();

    for (const row of rowMap.values()) {
      seenVariantIds.add(row.variantId);
      const categoryId = categoryIdFromProduct(row.title, row.productType, row.tags);
      const priceNzd = row.prices["NZD"] ?? 0;
      const compareNzd = row.compareAtPrices["NZD"] ?? null;

      const { error } = await supabase.from("hardware_catalog").upsert({
        shopify_variant_id: row.variantId,
        shopify_product_id: row.productId,
        shopify_handle: row.handle,
        sku: row.sku,
        name: row.title,
        short_description: row.description.slice(0, 180),
        long_description: row.description,
        material: "316 Marine Grade Stainless Steel",
        image_url: row.imageUrl,
        category_id: categoryId,
        price_nzd: priceNzd,
        compare_at_nzd: compareNzd,
        prices: row.prices,
        presentment_synced_at: now,
        tags: row.tags,
        is_active: true,
        last_synced_at: now,
        updated_at: now,
      }, { onConflict: "shopify_variant_id" });

      if (!error) {
        upserts += 1;
      } else if (upsertErrors.length < 3) {
        upsertErrors.push(`${row.variantId}: ${error.message}`);
      }
    }

    let deactivated = 0;
    if (seenVariantIds.size > 0) {
      const { data: stale } = await supabase
        .from("hardware_catalog")
        .select("id, shopify_variant_id")
        .not("shopify_variant_id", "is", null);
      const staleIds = (stale || [])
        .filter((r) => r.shopify_variant_id && !seenVariantIds.has(r.shopify_variant_id))
        .map((r) => r.id);
      if (staleIds.length > 0) {
        const { error } = await supabase
          .from("hardware_catalog")
          .update({ is_active: false, updated_at: now })
          .in("id", staleIds);
        if (!error) deactivated = staleIds.length;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        variants: rowMap.size,
        upserts,
        deactivated,
        currenciesSynced: CURRENCY_COUNTRY_MAP.map((m) => m.currency),
        upsertErrors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
