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

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (req.method === "GET") {
      const supabase = createClient(supabaseUrl, anonKey);
      const url = new URL(req.url);
      const includeInactive = url.searchParams.get("all") === "true";

      let query = supabase
        .from("pricing_settings")
        .select("*")
        .order("display_order", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch pricing settings: ${error.message}`);
      }

      return jsonResponse({ success: true, settings: data });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "PUT") {
      const { currency_code, updates } = await req.json();

      if (!currency_code || !updates) {
        return jsonResponse(
          { error: "Missing required fields: currency_code, updates" },
          400
        );
      }

      const allowedFields = [
        "market_markup",
        "zonos_dhl_markup",
        "exchange_rate",
        "is_active",
        "currency_name",
        "currency_symbol",
        "display_order",
      ];
      const sanitizedUpdates: Record<string, unknown> = {};
      for (const key of Object.keys(updates)) {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = updates[key];
        }
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        return jsonResponse({ error: "No valid fields to update" }, 400);
      }

      const { data: existing, error: fetchError } = await supabase
        .from("pricing_settings")
        .select("*")
        .eq("currency_code", currency_code)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to fetch current settings: ${fetchError.message}`);
      }

      if (!existing) {
        return jsonResponse(
          { error: `Currency ${currency_code} not found` },
          404
        );
      }

      const historyRecords = [];
      for (const [field, newValue] of Object.entries(sanitizedUpdates)) {
        const oldValue = existing[field];
        if (String(oldValue) !== String(newValue)) {
          historyRecords.push({
            currency_code,
            field_changed: field,
            old_value: String(oldValue),
            new_value: String(newValue),
            changed_by: user.email || "admin",
          });
        }
      }

      sanitizedUpdates.updated_at = new Date().toISOString();

      const { data: updated, error: updateError } = await supabase
        .from("pricing_settings")
        .update(sanitizedUpdates)
        .eq("currency_code", currency_code)
        .select()
        .maybeSingle();

      if (updateError) {
        throw new Error(`Failed to update pricing settings: ${updateError.message}`);
      }

      if (historyRecords.length > 0) {
        const { error: historyError } = await supabase
          .from("pricing_history")
          .insert(historyRecords);

        if (historyError) {
          console.error("Failed to log pricing history:", historyError);
        }
      }

      return jsonResponse({
        success: true,
        setting: updated,
        changes_logged: historyRecords.length,
      });
    }

    if (req.method === "POST") {
      const { currency_code, currency_name, currency_symbol, market_markup, zonos_dhl_markup, exchange_rate, display_order } = await req.json();

      if (!currency_code || !currency_name || !currency_symbol) {
        return jsonResponse(
          { error: "Missing required fields: currency_code, currency_name, currency_symbol" },
          400
        );
      }

      const { data, error } = await supabase
        .from("pricing_settings")
        .insert({
          currency_code,
          currency_name,
          currency_symbol,
          market_markup: market_markup ?? 1.0,
          zonos_dhl_markup: zonos_dhl_markup ?? 1.0,
          exchange_rate: exchange_rate ?? 1.0,
          is_active: true,
          display_order: display_order ?? 99,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create pricing setting: ${error.message}`);
      }

      const { error: historyError } = await supabase
        .from("pricing_history")
        .insert({
          currency_code,
          field_changed: "created",
          old_value: "n/a",
          new_value: JSON.stringify({ currency_name, currency_symbol, market_markup, zonos_dhl_markup, exchange_rate }),
          changed_by: user.email || "admin",
        });

      if (historyError) {
        console.error("Failed to log creation history:", historyError);
      }

      return jsonResponse({ success: true, setting: data });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("Error in pricing-settings function:", error);
    return jsonResponse(
      { error: error.message || "An unexpected error occurred" },
      500
    );
  }
});
