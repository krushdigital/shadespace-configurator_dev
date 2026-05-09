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
const SHOPIFY_ADMIN_TOKEN = Deno.env.get("SHOPIFY_ADMIN_TOKEN") || "";
const HARDWARE_COLLECTION_HANDLE = Deno.env.get("SHOPIFY_HARDWARE_COLLECTION_HANDLE") || "hardware";

const QUERY = `
  query HardwareProducts($cursor: String) {
    collectionByHandle(handle: "${HARDWARE_COLLECTION_HANDLE}") {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) {
      return new Response(JSON.stringify({
        error: "Shopify credentials missing",
        missing: [!SHOPIFY_STORE && "SHOPIFY_STORE_DOMAIN", !SHOPIFY_ADMIN_TOKEN && "SHOPIFY_ADMIN_TOKEN"].filter(Boolean),
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SB_URL, SB_SERVICE);
    const endpoint = `https://${SHOPIFY_STORE}/admin/api/2024-10/graphql.json`;

    const collected: any[] = [];
    let cursor: string | null = null;
    let pages = 0;

    while (pages < 20) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify({ query: QUERY, variables: { cursor } }),
      });
      const json = await res.json();
      if (!res.ok || json?.errors) {
        return new Response(JSON.stringify({ error: "Shopify request failed", details: json }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const coll = json?.data?.collectionByHandle;
      if (!coll) {
        return new Response(JSON.stringify({ error: `Collection "${HARDWARE_COLLECTION_HANDLE}" not found on Shopify` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const edge of coll.products.edges) collected.push(edge.node);
      if (!coll.products.pageInfo.hasNextPage) break;
      cursor = coll.products.pageInfo.endCursor;
      pages += 1;
    }

    const now = new Date().toISOString();
    let upserts = 0;
    const seenVariantIds = new Set<string>();

    for (const product of collected) {
      const variant = product.variants?.edges?.[0]?.node;
      if (!variant) continue;
      const variantId = String(variant.id).split("/").pop() || variant.id;
      const productId = String(product.id).split("/").pop() || product.id;
      const priceNzd = Number(variant.price?.amount || 0);
      const compareAt = variant.compareAtPrice?.amount ? Number(variant.compareAtPrice.amount) : null;
      const tags: string[] = product.tags || [];
      const categoryId = categoryIdFromProduct(product.title, product.productType || "", tags);
      seenVariantIds.add(variantId);

      const { error } = await supabase.from("hardware_catalog").upsert({
        shopify_variant_id: variantId,
        shopify_product_id: productId,
        shopify_handle: product.handle,
        sku: variant.sku || null,
        name: product.title,
        short_description: (product.description || "").slice(0, 180),
        long_description: product.description || "",
        material: "316 Marine Grade Stainless Steel",
        image_url: product.featuredImage?.url || "",
        category_id: categoryId,
        price_nzd: priceNzd,
        compare_at_nzd: compareAt,
        tags,
        is_active: true,
        last_synced_at: now,
        updated_at: now,
      }, { onConflict: "shopify_variant_id" });

      if (!error) upserts += 1;
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
      JSON.stringify({ ok: true, fetched: collected.length, upserts, deactivated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
