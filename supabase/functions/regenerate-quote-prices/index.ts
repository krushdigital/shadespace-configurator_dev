import { createClient } from "npm:@supabase/supabase-js@2.39.3";

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

interface ConfigData {
  corners: number;
  measurements: Record<string, number>;
  edgeType: string;
  fabricType: string;
  currency: string;
  hardwareSelectionMode?: "standard" | "manual" | "none";
  measurementOption?: string;
  cornerHardware?: Array<Array<{
    catalogId: string;
    priceNzd: number;
    qty: number;
  }>>;
}

interface FabricPricingRow {
  edge_type: string;
  perimeter: number;
  prices: Record<string, number>;
}

interface CornerCostRow {
  edge_type: string;
  corners: number;
  cost_nzd: number;
}

interface HardwareCostRow {
  edge_type: string;
  corners: number;
  cost_nzd: number;
}

interface HardwarePack {
  edge_type: string;
  corners: number;
  price_nzd_override: number | null;
  prices: Record<string, number> | null;
}

interface PricingSetting {
  currency_code: string;
  market_markup: number;
  zonos_dhl_markup: number;
  exchange_rate: number;
}

interface HardwareItemRow {
  id: string;
  price_nzd: number;
  prices: Record<string, number> | null;
}

function computeQuotePrice(
  config: ConfigData,
  fabricPricing: FabricPricingRow[],
  cornerCosts: CornerCostRow[],
  hardwareCosts: HardwareCostRow[],
  hardwarePacks: HardwarePack[],
  hardwareItemsMap: Map<string, HardwareItemRow>,
  pricing: PricingSetting
): number {
  let perimeterMM = 0;
  const edgeKeys: string[] = [];

  for (let i = 0; i < config.corners; i++) {
    const nextIndex = (i + 1) % config.corners;
    const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
    edgeKeys.push(edgeKey);
    if (config.measurements[edgeKey]) {
      perimeterMM += config.measurements[edgeKey];
    }
  }

  const hasAllEdges = edgeKeys.every(
    (key) => config.measurements[key] && config.measurements[key] > 0
  );
  if (!hasAllEdges) return 0;

  const perimeterM = perimeterMM / 1000;
  const adjustedPerimeter = Math.round(perimeterM / 0.5) * 0.5;
  const edgeType = config.edgeType as "webbing" | "cabled";

  // Fabric cost lookup
  const fabricRows = fabricPricing.filter((r) => r.edge_type === edgeType);
  let fabricCostNZD = 0;
  const exactRow = fabricRows.find((r) => r.perimeter === adjustedPerimeter);
  if (exactRow && exactRow.prices[config.fabricType] != null) {
    fabricCostNZD = exactRow.prices[config.fabricType];
  } else if (fabricRows.length > 0) {
    const sorted = [...fabricRows].sort(
      (a, b) =>
        Math.abs(a.perimeter - adjustedPerimeter) -
        Math.abs(b.perimeter - adjustedPerimeter)
    );
    const closest = sorted[0];
    fabricCostNZD = closest.prices[config.fabricType] ?? 0;
  }

  // Corner cost lookup
  const cornerRow = cornerCosts.find(
    (r) => r.edge_type === edgeType && r.corners === config.corners
  );
  const cornerCostNZD = cornerRow?.cost_nzd ?? 0;

  // Hardware cost
  const resolvedMode: "standard" | "manual" | "none" =
    config.hardwareSelectionMode ??
    (config.measurementOption === "adjust" ? "standard" : "none");

  let hardwareLiveSubtotal = 0;

  if (resolvedMode === "standard") {
    const hwRow = hardwareCosts.find(
      (r) => r.edge_type === edgeType && r.corners === config.corners
    );
    let standardTotal = hwRow?.cost_nzd ?? 0;

    const pack = hardwarePacks.find(
      (p) => p.edge_type === edgeType && p.corners === config.corners
    );
    if (pack && pack.price_nzd_override != null) {
      standardTotal = Number(pack.price_nzd_override);
    }

    // Get live pack price
    if (pack) {
      const map = pack.prices || {};
      const direct = map[config.currency];
      if (typeof direct === "number" && direct > 0) {
        hardwareLiveSubtotal = direct;
      } else {
        hardwareLiveSubtotal = standardTotal * pricing.exchange_rate;
      }
    } else {
      hardwareLiveSubtotal = standardTotal * pricing.exchange_rate;
    }
  } else if (resolvedMode === "manual" && config.cornerHardware) {
    for (let i = 0; i < config.corners; i++) {
      const lines = config.cornerHardware[i] || [];
      for (const line of lines) {
        const catalogItem = hardwareItemsMap.get(line.catalogId);
        let livePerUnit: number;
        if (catalogItem) {
          const map = catalogItem.prices || {};
          const direct = map[config.currency];
          if (typeof direct === "number" && direct > 0) {
            livePerUnit = direct;
          } else {
            livePerUnit = catalogItem.price_nzd * pricing.exchange_rate;
          }
        } else {
          livePerUnit = line.priceNzd * pricing.exchange_rate;
        }
        hardwareLiveSubtotal += livePerUnit * line.qty;
      }
    }
  }

  // Apply markups to sail portion
  const sailOnlyBaseNZD = fabricCostNZD + cornerCostNZD;
  const markedUpSailNZD = sailOnlyBaseNZD * pricing.market_markup;
  const zonosSailNZD = sailOnlyBaseNZD * (pricing.zonos_dhl_markup - 1);
  const sailConverted =
    (markedUpSailNZD + zonosSailNZD) * pricing.exchange_rate;

  return Math.ceil(sailConverted + hardwareLiveSubtotal);
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      quoteIds,
      direction,
      statusFilter,
      sendNotification,
      dryRun,
    }: {
      quoteIds?: string[];
      direction: "down_only" | "up_only" | "both";
      statusFilter?: string[];
      sendNotification?: boolean;
      dryRun?: boolean;
    } = body;

    if (!direction || !["down_only", "up_only", "both"].includes(direction)) {
      return jsonResponse({ error: "Invalid direction" }, 400);
    }

    // Fetch pricing reference data
    const [fabricRes, cornerRes, hwCostRes, hwPackRes, hwItemsRes, pricingRes] =
      await Promise.all([
        supabase.from("fabric_pricing").select("*"),
        supabase.from("corner_costs").select("*"),
        supabase.from("hardware_costs").select("*"),
        supabase.from("hardware_packs").select("*").eq("is_active", true),
        supabase
          .from("hardware_catalog")
          .select("id, price_nzd, prices")
          .eq("is_active", true),
        supabase.from("pricing_settings").select("*").eq("is_active", true),
      ]);

    const fabricPricing: FabricPricingRow[] = fabricRes.data || [];
    const cornerCosts: CornerCostRow[] = cornerRes.data || [];
    const hardwareCosts: HardwareCostRow[] = hwCostRes.data || [];
    const hardwarePacks: HardwarePack[] = hwPackRes.data || [];
    const hardwareItemsMap = new Map<string, HardwareItemRow>();
    for (const item of hwItemsRes.data || []) {
      hardwareItemsMap.set(item.id, item);
    }
    const pricingSettingsMap = new Map<string, PricingSetting>();
    for (const ps of pricingRes.data || []) {
      pricingSettingsMap.set(ps.currency_code, ps);
    }

    // Fetch quotes to process
    let query = supabase
      .from("saved_quotes")
      .select(
        "id, quote_reference, quote_name, customer_email, config_data, calculations_data, locked_total, locked_total_currency, locked_total_base_nzd, locked_fx_rate, locked_market_markup, locked_zonos_dhl_markup, status"
      )
      .order("created_at", { ascending: false });

    if (quoteIds && quoteIds.length > 0) {
      query = query.in("id", quoteIds);
    }
    if (statusFilter && statusFilter.length > 0) {
      query = query.in("status", statusFilter);
    }

    const { data: quotes, error: quotesError } = await query;
    if (quotesError) {
      return jsonResponse({ error: quotesError.message }, 500);
    }

    const changes: Array<{
      quoteId: string;
      quoteReference: string;
      quoteName: string;
      customerEmail: string | null;
      oldPrice: number;
      newPrice: number;
      currency: string;
      status: "updated" | "skipped";
      reason?: string;
    }> = [];

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let notificationsSent = 0;

    for (const quote of quotes || []) {
      processed++;
      const config = quote.config_data as ConfigData;
      if (!config || !config.corners || !config.measurements) {
        skipped++;
        changes.push({
          quoteId: quote.id,
          quoteReference: quote.quote_reference,
          quoteName: quote.quote_name,
          customerEmail: quote.customer_email,
          oldPrice: 0,
          newPrice: 0,
          currency: "NZD",
          status: "skipped",
          reason: "Incomplete config data",
        });
        continue;
      }

      const currency = config.currency || "NZD";
      const pricing = pricingSettingsMap.get(currency);
      if (!pricing) {
        skipped++;
        changes.push({
          quoteId: quote.id,
          quoteReference: quote.quote_reference,
          quoteName: quote.quote_name,
          customerEmail: quote.customer_email,
          oldPrice: 0,
          newPrice: 0,
          currency,
          status: "skipped",
          reason: `No pricing settings for ${currency}`,
        });
        continue;
      }

      const newPrice = computeQuotePrice(
        config,
        fabricPricing,
        cornerCosts,
        hardwareCosts,
        hardwarePacks,
        hardwareItemsMap,
        pricing
      );

      if (newPrice <= 0) {
        skipped++;
        changes.push({
          quoteId: quote.id,
          quoteReference: quote.quote_reference,
          quoteName: quote.quote_name,
          customerEmail: quote.customer_email,
          oldPrice: 0,
          newPrice: 0,
          currency,
          status: "skipped",
          reason: "Could not calculate price (incomplete measurements)",
        });
        continue;
      }

      const oldPrice =
        quote.locked_total && quote.locked_total > 0
          ? Number(quote.locked_total)
          : Number(quote.calculations_data?.totalPrice || 0);

      // Direction filter
      const priceWentDown = newPrice < oldPrice;
      const priceWentUp = newPrice > oldPrice;

      if (direction === "down_only" && !priceWentDown) {
        skipped++;
        changes.push({
          quoteId: quote.id,
          quoteReference: quote.quote_reference,
          quoteName: quote.quote_name,
          customerEmail: quote.customer_email,
          oldPrice,
          newPrice,
          currency,
          status: "skipped",
          reason:
            newPrice === oldPrice ? "Price unchanged" : "Price went up (filter: down_only)",
        });
        continue;
      }

      if (direction === "up_only" && !priceWentUp) {
        skipped++;
        changes.push({
          quoteId: quote.id,
          quoteReference: quote.quote_reference,
          quoteName: quote.quote_name,
          customerEmail: quote.customer_email,
          oldPrice,
          newPrice,
          currency,
          status: "skipped",
          reason:
            newPrice === oldPrice ? "Price unchanged" : "Price went down (filter: up_only)",
        });
        continue;
      }

      if (newPrice === oldPrice) {
        skipped++;
        changes.push({
          quoteId: quote.id,
          quoteReference: quote.quote_reference,
          quoteName: quote.quote_name,
          customerEmail: quote.customer_email,
          oldPrice,
          newPrice,
          currency,
          status: "skipped",
          reason: "Price unchanged",
        });
        continue;
      }

      if (!dryRun) {
        // Compute base NZD for audit
        const sailOnlyBaseNZD = (() => {
          let perimeterMM = 0;
          for (let i = 0; i < config.corners; i++) {
            const nextIndex = (i + 1) % config.corners;
            const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
            if (config.measurements[edgeKey]) perimeterMM += config.measurements[edgeKey];
          }
          const adjustedPerimeter = Math.round(perimeterMM / 1000 / 0.5) * 0.5;
          const edgeType = config.edgeType as "webbing" | "cabled";
          const row = fabricPricing.find(
            (r) => r.edge_type === edgeType && r.perimeter === adjustedPerimeter
          );
          const fabricCost = row?.prices[config.fabricType] ?? 0;
          const cornerRow = cornerCosts.find(
            (r) => r.edge_type === edgeType && r.corners === config.corners
          );
          return fabricCost + (cornerRow?.cost_nzd ?? 0);
        })();

        const updatedCalcData = {
          ...(quote.calculations_data || {}),
          totalPrice: newPrice,
        };

        const { error: updateError } = await supabase
          .from("saved_quotes")
          .update({
            locked_total: newPrice,
            locked_total_currency: currency,
            locked_total_base_nzd: sailOnlyBaseNZD,
            locked_fx_rate: pricing.exchange_rate,
            locked_market_markup: pricing.market_markup,
            locked_zonos_dhl_markup: pricing.zonos_dhl_markup,
            locked_at: new Date().toISOString(),
            calculations_data: updatedCalcData,
          })
          .eq("id", quote.id);

        if (updateError) {
          skipped++;
          changes.push({
            quoteId: quote.id,
            quoteReference: quote.quote_reference,
            quoteName: quote.quote_name,
            customerEmail: quote.customer_email,
            oldPrice,
            newPrice,
            currency,
            status: "skipped",
            reason: `Update failed: ${updateError.message}`,
          });
          continue;
        }

        // Send price drop notification if enabled
        if (sendNotification && priceWentDown && quote.customer_email) {
          try {
            const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${anonKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                templateKey: "price_drop_notification",
                toEmail: quote.customer_email,
                quoteId: quote.id,
                extraContext: {
                  old_price: oldPrice,
                  new_price: newPrice,
                  savings: oldPrice - newPrice,
                  currency,
                },
              }),
            });
            notificationsSent++;
          } catch (_emailErr) {
            // Don't fail the whole operation for email issues
          }
        }

        updated++;
      } else {
        updated++;
      }

      changes.push({
        quoteId: quote.id,
        quoteReference: quote.quote_reference,
        quoteName: quote.quote_name,
        customerEmail: quote.customer_email,
        oldPrice,
        newPrice,
        currency,
        status: "updated",
      });
    }

    // Log to pricing_change_log for audit
    if (!dryRun && updated > 0) {
      await supabase.from("pricing_change_log").insert({
        table_name: "saved_quotes",
        operation: "bulk_price_regeneration",
        previous_data: { direction, statusFilter, quoteIds },
        new_data: {
          processed,
          updated,
          skipped,
          notificationsSent,
          changes: changes.filter((c) => c.status === "updated").map((c) => ({
            quoteId: c.quoteId,
            oldPrice: c.oldPrice,
            newPrice: c.newPrice,
            currency: c.currency,
          })),
        },
        changed_by: user.email || "admin",
        description: `Regenerated prices for ${updated} quotes (direction: ${direction})`,
      });
    }

    return jsonResponse({
      success: true,
      dryRun: !!dryRun,
      summary: { processed, updated, skipped, notificationsSent },
      changes,
    });
  } catch (error) {
    console.error("Error in regenerate-quote-prices:", error);
    return jsonResponse(
      { error: error.message || "An unexpected error occurred" },
      500
    );
  }
});
