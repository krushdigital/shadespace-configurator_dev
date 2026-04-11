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

function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
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

function getSubPath(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/base-pricing");
  return (parts[1] || "").replace(/^\//, "");
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));
  return { headers, rows };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const subPath = getSubPath(req);

    if (req.method === "GET" && (subPath === "" || subPath === "/")) {
      const supabase = createClient(supabaseUrl, anonKey);
      const [fabricTypes, fabricPricing, cornerCosts, hardwareCosts, edgeFeatures] =
        await Promise.all([
          supabase.from("fabric_types").select("*").order("display_order"),
          supabase.from("fabric_pricing").select("*").order("edge_type").order("perimeter"),
          supabase.from("corner_costs").select("*").order("edge_type").order("corners"),
          supabase.from("hardware_costs").select("*").order("edge_type").order("corners"),
          supabase.from("edge_features").select("*").order("edge_type").order("min_perimeter"),
        ]);

      return jsonResponse({
        success: true,
        data: {
          fabricTypes: fabricTypes.data || [],
          fabricPricing: fabricPricing.data || [],
          cornerCosts: cornerCosts.data || [],
          hardwareCosts: hardwareCosts.data || [],
          edgeFeatures: edgeFeatures.data || [],
        },
      });
    }

    if (req.method === "GET" && subPath.startsWith("csv-export")) {
      const url = new URL(req.url);
      const table = url.searchParams.get("table");
      const supabase = createClient(supabaseUrl, anonKey);

      if (table === "fabric_pricing") {
        const edgeType = url.searchParams.get("edge_type");
        const { data: fabricTypes } = await supabase
          .from("fabric_types")
          .select("id, label")
          .order("display_order");
        let query = supabase.from("fabric_pricing").select("*").order("perimeter");
        if (edgeType && ["webbing", "cabled"].includes(edgeType)) {
          query = query.eq("edge_type", edgeType);
        }
        const { data: rows } = await query;

        const typeIds = (fabricTypes || []).map((t: { id: string }) => t.id);
        const csvHeader = ["perimeter", ...typeIds].join(",");
        const csvRows = (rows || []).map((r: { edge_type: string; perimeter: number; prices: Record<string, number> }) => {
          const prices = typeIds.map((id: string) => r.prices[id] ?? "");
          return [r.perimeter, ...prices].join(",");
        });
        const filename = edgeType ? `fabric_pricing_${edgeType}.csv` : "fabric_pricing.csv";
        return csvResponse([csvHeader, ...csvRows].join("\n"), filename);
      }

      if (table === "corner_costs" || table === "hardware_costs") {
        const { data: rows } = await supabase.from(table).select("*").order("edge_type").order("corners");
        const csvHeader = "edge_type,corners,cost_nzd";
        const csvRows = (rows || []).map((r: { edge_type: string; corners: number; cost_nzd: number }) =>
          `${r.edge_type},${r.corners},${r.cost_nzd}`
        );
        return csvResponse([csvHeader, ...csvRows].join("\n"), `${table}.csv`);
      }

      if (table === "edge_features") {
        const { data: rows } = await supabase.from("edge_features").select("*").order("edge_type").order("min_perimeter");
        const csvHeader = "edge_type,feature_name,min_perimeter,max_perimeter,feature_value";
        const csvRows = (rows || []).map((r: { edge_type: string; feature_name: string; min_perimeter: number; max_perimeter: number; feature_value: number }) =>
          `${r.edge_type},${r.feature_name},${r.min_perimeter},${r.max_perimeter},${r.feature_value}`
        );
        return csvResponse([csvHeader, ...csvRows].join("\n"), "edge_features.csv");
      }

      if (table === "pricing_settings") {
        const { data: rows } = await supabase.from("pricing_settings").select("*").order("display_order");
        const csvHeader = "currency_code,currency_name,currency_symbol,market_markup,zonos_dhl_markup,exchange_rate,is_active,display_order";
        const csvRows = (rows || []).map((r: Record<string, unknown>) =>
          `${r.currency_code},${r.currency_name},${r.currency_symbol},${r.market_markup},${r.zonos_dhl_markup},${r.exchange_rate},${r.is_active},${r.display_order}`
        );
        return csvResponse([csvHeader, ...csvRows].join("\n"), "pricing_settings.csv");
      }

      return jsonResponse({ error: "Invalid table name" }, 400);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const changedBy = user.email || "admin";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "PUT" && subPath === "fabric-pricing") {
      const { id, prices } = await req.json();
      if (!id || !prices) return jsonResponse({ error: "Missing id or prices" }, 400);

      const { data: existing } = await supabase.from("fabric_pricing").select("*").eq("id", id).maybeSingle();
      if (!existing) return jsonResponse({ error: "Row not found" }, 404);

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_pricing",
        operation: "update",
        previous_data: existing,
        new_data: { ...existing, prices },
        changed_by: changedBy,
        description: `Updated fabric pricing for ${existing.edge_type} ${existing.perimeter}m`,
      });

      const { data, error } = await supabase
        .from("fabric_pricing")
        .update({ prices, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      return jsonResponse({ success: true, data });
    }

    if (req.method === "PUT" && subPath === "corner-costs") {
      const { id, cost_nzd } = await req.json();
      if (!id || cost_nzd === undefined) return jsonResponse({ error: "Missing id or cost_nzd" }, 400);

      const { data: existing } = await supabase.from("corner_costs").select("*").eq("id", id).maybeSingle();
      if (!existing) return jsonResponse({ error: "Row not found" }, 404);

      await supabase.from("pricing_change_log").insert({
        table_name: "corner_costs",
        operation: "update",
        previous_data: existing,
        new_data: { ...existing, cost_nzd },
        changed_by: changedBy,
        description: `Updated ${existing.edge_type} corner cost for ${existing.corners} corners: ${existing.cost_nzd} -> ${cost_nzd}`,
      });

      const { data, error } = await supabase
        .from("corner_costs")
        .update({ cost_nzd, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      return jsonResponse({ success: true, data });
    }

    if (req.method === "PUT" && subPath === "hardware-costs") {
      const { id, cost_nzd } = await req.json();
      if (!id || cost_nzd === undefined) return jsonResponse({ error: "Missing id or cost_nzd" }, 400);

      const { data: existing } = await supabase.from("hardware_costs").select("*").eq("id", id).maybeSingle();
      if (!existing) return jsonResponse({ error: "Row not found" }, 404);

      await supabase.from("pricing_change_log").insert({
        table_name: "hardware_costs",
        operation: "update",
        previous_data: existing,
        new_data: { ...existing, cost_nzd },
        changed_by: changedBy,
        description: `Updated ${existing.edge_type} hardware cost for ${existing.corners} corners: ${existing.cost_nzd} -> ${cost_nzd}`,
      });

      const { data, error } = await supabase
        .from("hardware_costs")
        .update({ cost_nzd, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      return jsonResponse({ success: true, data });
    }

    if (req.method === "PUT" && subPath === "edge-features") {
      const { id, feature_value, min_perimeter, max_perimeter } = await req.json();
      if (!id) return jsonResponse({ error: "Missing id" }, 400);

      const { data: existing } = await supabase.from("edge_features").select("*").eq("id", id).maybeSingle();
      if (!existing) return jsonResponse({ error: "Row not found" }, 404);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (feature_value !== undefined) updates.feature_value = feature_value;
      if (min_perimeter !== undefined) updates.min_perimeter = min_perimeter;
      if (max_perimeter !== undefined) updates.max_perimeter = max_perimeter;

      await supabase.from("pricing_change_log").insert({
        table_name: "edge_features",
        operation: "update",
        previous_data: existing,
        new_data: { ...existing, ...updates },
        changed_by: changedBy,
        description: `Updated ${existing.edge_type} ${existing.feature_name} feature`,
      });

      const { data, error } = await supabase.from("edge_features").update(updates).eq("id", id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return jsonResponse({ success: true, data });
    }

    if (req.method === "POST" && subPath === "fabric-types") {
      const { id, label, display_order } = await req.json();
      if (!id || !label) return jsonResponse({ error: "Missing id or label" }, 400);

      const { data: existing } = await supabase.from("fabric_types").select("*").eq("id", id).maybeSingle();
      if (existing) return jsonResponse({ error: "Fabric type already exists" }, 409);

      const { data, error } = await supabase
        .from("fabric_types")
        .insert({ id, label, display_order: display_order ?? 99, is_active: true })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const { data: pricingRows } = await supabase.from("fabric_pricing").select("id, prices");
      if (pricingRows && pricingRows.length > 0) {
        for (const row of pricingRows) {
          const updatedPrices = { ...row.prices, [id]: 0 };
          await supabase.from("fabric_pricing").update({ prices: updatedPrices }).eq("id", row.id);
        }
      }

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_types",
        operation: "create",
        previous_data: null,
        new_data: data,
        changed_by: changedBy,
        description: `Added new fabric type: ${label} (${id})`,
      });

      return jsonResponse({ success: true, data });
    }

    if (req.method === "PUT" && subPath === "fabric-types") {
      const { id, label, is_active, display_order } = await req.json();
      if (!id) return jsonResponse({ error: "Missing id" }, 400);

      const { data: existing } = await supabase.from("fabric_types").select("*").eq("id", id).maybeSingle();
      if (!existing) return jsonResponse({ error: "Fabric type not found" }, 404);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (label !== undefined) updates.label = label;
      if (is_active !== undefined) updates.is_active = is_active;
      if (display_order !== undefined) updates.display_order = display_order;

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_types",
        operation: "update",
        previous_data: existing,
        new_data: { ...existing, ...updates },
        changed_by: changedBy,
        description: `Updated fabric type: ${existing.label}`,
      });

      const { data, error } = await supabase.from("fabric_types").update(updates).eq("id", id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return jsonResponse({ success: true, data });
    }

    if (req.method === "POST" && subPath === "csv-upload") {
      const { table, csv_data, mode, edge_type } = await req.json();
      if (!table || !csv_data) return jsonResponse({ error: "Missing table or csv_data" }, 400);
      if (!["replace", "merge"].includes(mode)) return jsonResponse({ error: "Mode must be 'replace' or 'merge'" }, 400);

      const { headers, rows } = parseCsv(csv_data);
      if (rows.length === 0) return jsonResponse({ error: "CSV contains no data rows" }, 400);

      if (table === "fabric_pricing") {
        if (!edge_type || !["webbing", "cabled"].includes(edge_type)) {
          return jsonResponse({ error: "edge_type must be 'webbing' or 'cabled'" }, 400);
        }

        if (headers.length < 2 || headers[0] !== "perimeter") {
          return jsonResponse({ error: "CSV must have headers: perimeter,<fabric_type_ids...>" }, 400);
        }

        const fabricTypeIds = headers.slice(1);
        const currentQuery = supabase.from("fabric_pricing").select("*").eq("edge_type", edge_type);
        const { data: currentData } = await currentQuery;

        const newRows = rows.map((row) => {
          const prices: Record<string, number> = {};
          fabricTypeIds.forEach((ftId, i) => {
            const val = parseFloat(row[i + 1]);
            if (!isNaN(val)) prices[ftId] = val;
          });
          return {
            edge_type,
            perimeter: parseFloat(row[0]),
            prices,
          };
        });

        const invalidRows = newRows.filter((r) => isNaN(r.perimeter) || r.perimeter <= 0);
        if (invalidRows.length > 0) {
          return jsonResponse({ error: "Invalid rows found. perimeter must be a positive number." }, 400);
        }

        await supabase.from("pricing_change_log").insert({
          table_name: "fabric_pricing",
          operation: mode === "replace" ? "bulk_replace" : "bulk_merge",
          previous_data: currentData,
          new_data: newRows,
          changed_by: changedBy,
          description: `CSV ${mode} (${edge_type}): ${newRows.length} fabric pricing rows`,
        });

        if (mode === "replace") {
          await supabase.from("fabric_pricing").delete().eq("edge_type", edge_type);
          const { error } = await supabase.from("fabric_pricing").insert(
            newRows.map((r) => ({ edge_type: r.edge_type, perimeter: r.perimeter, prices: r.prices }))
          );
          if (error) throw new Error(error.message);
        } else {
          for (const row of newRows) {
            await supabase
              .from("fabric_pricing")
              .upsert(
                { edge_type: row.edge_type, perimeter: row.perimeter, prices: row.prices, updated_at: new Date().toISOString() },
                { onConflict: "edge_type,perimeter" }
              );
          }
        }

        return jsonResponse({ success: true, rows_processed: newRows.length, mode, edge_type });
      }

      if (table === "corner_costs" || table === "hardware_costs") {
        if (headers.length < 3 || headers[0] !== "edge_type" || headers[1] !== "corners" || headers[2] !== "cost_nzd") {
          return jsonResponse({ error: "CSV must have headers: edge_type,corners,cost_nzd" }, 400);
        }

        const { data: currentData } = await supabase.from(table).select("*");
        const newRows = rows.map((row) => ({
          edge_type: row[0],
          corners: parseInt(row[1]),
          cost_nzd: parseFloat(row[2]),
        }));

        const invalidRows = newRows.filter(
          (r) => !["webbing", "cabled"].includes(r.edge_type) || isNaN(r.corners) || isNaN(r.cost_nzd)
        );
        if (invalidRows.length > 0) {
          return jsonResponse({ error: "Invalid rows found" }, 400);
        }

        await supabase.from("pricing_change_log").insert({
          table_name: table,
          operation: mode === "replace" ? "bulk_replace" : "bulk_merge",
          previous_data: currentData,
          new_data: newRows,
          changed_by: changedBy,
          description: `CSV ${mode}: ${newRows.length} ${table} rows`,
        });

        if (mode === "replace") {
          await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
          const { error } = await supabase.from(table).insert(newRows);
          if (error) throw new Error(error.message);
        } else {
          for (const row of newRows) {
            await supabase
              .from(table)
              .upsert(
                { ...row, updated_at: new Date().toISOString() },
                { onConflict: "edge_type,corners" }
              );
          }
        }

        return jsonResponse({ success: true, rows_processed: newRows.length, mode });
      }

      if (table === "pricing_settings") {
        if (headers[0] !== "currency_code") {
          return jsonResponse({ error: "CSV must start with currency_code header" }, 400);
        }

        const { data: currentData } = await supabase.from("pricing_settings").select("*");

        await supabase.from("pricing_change_log").insert({
          table_name: "pricing_settings",
          operation: mode === "replace" ? "bulk_replace" : "bulk_merge",
          previous_data: currentData,
          new_data: rows,
          changed_by: changedBy,
          description: `CSV ${mode}: ${rows.length} pricing settings rows`,
        });

        for (const row of rows) {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => { obj[h] = row[i]; });

          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (obj.market_markup) updates.market_markup = parseFloat(String(obj.market_markup));
          if (obj.zonos_dhl_markup) updates.zonos_dhl_markup = parseFloat(String(obj.zonos_dhl_markup));
          if (obj.exchange_rate) updates.exchange_rate = parseFloat(String(obj.exchange_rate));
          if (obj.currency_name) updates.currency_name = obj.currency_name;
          if (obj.currency_symbol) updates.currency_symbol = obj.currency_symbol;
          if (obj.is_active !== undefined) updates.is_active = String(obj.is_active) === "true";
          if (obj.display_order) updates.display_order = parseInt(String(obj.display_order));

          await supabase
            .from("pricing_settings")
            .update(updates)
            .eq("currency_code", String(obj.currency_code));
        }

        return jsonResponse({ success: true, rows_processed: rows.length, mode });
      }

      return jsonResponse({ error: "Invalid table for CSV upload" }, 400);
    }

    if (req.method === "POST" && subPath === "undo") {
      const { change_id } = await req.json();
      if (!change_id) return jsonResponse({ error: "Missing change_id" }, 400);

      const { data: change } = await supabase
        .from("pricing_change_log")
        .select("*")
        .eq("id", change_id)
        .maybeSingle();

      if (!change) return jsonResponse({ error: "Change not found" }, 404);
      if (change.is_undone) return jsonResponse({ error: "Change already undone" }, 400);
      if (!change.previous_data) return jsonResponse({ error: "No previous data to restore" }, 400);

      const tableName = change.table_name;
      const prevData = change.previous_data;

      if (change.operation === "bulk_replace" || change.operation === "bulk_merge") {
        await supabase.from(tableName).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (Array.isArray(prevData) && prevData.length > 0) {
          const cleanRows = prevData.map((row: Record<string, unknown>) => {
            const { id: _id, ...rest } = row;
            return rest;
          });
          const { error } = await supabase.from(tableName).insert(cleanRows);
          if (error) throw new Error(`Undo insert failed: ${error.message}`);
        }
      } else if (change.operation === "update") {
        const { id: rowId, ...restData } = prevData as Record<string, unknown>;
        if (rowId) {
          const { error } = await supabase.from(tableName).update(restData).eq("id", rowId);
          if (error) throw new Error(`Undo update failed: ${error.message}`);
        }
      } else if (change.operation === "create") {
        const { id: rowId } = prevData as Record<string, unknown>;
        if (!rowId) {
          const newData = change.new_data as Record<string, unknown>;
          if (newData?.id) {
            await supabase.from(tableName).delete().eq("id", newData.id);
          }
        }
      }

      await supabase.from("pricing_change_log").update({ is_undone: true }).eq("id", change_id);

      await supabase.from("pricing_change_log").insert({
        table_name: tableName,
        operation: "undo",
        previous_data: change.new_data,
        new_data: change.previous_data,
        changed_by: changedBy,
        description: `Undo: ${change.description}`,
      });

      return jsonResponse({ success: true, message: "Change undone successfully" });
    }

    if (req.method === "GET" && subPath === "change-log") {
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const tableName = url.searchParams.get("table");

      let query = supabase
        .from("pricing_change_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tableName) {
        query = query.eq("table_name", tableName);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return jsonResponse({ success: true, data });
    }

    if (req.method === "POST" && subPath === "fabric-pricing") {
      const { edge_type, perimeter, prices } = await req.json();
      if (!edge_type || perimeter === undefined || !prices) {
        return jsonResponse({ error: "Missing edge_type, perimeter, or prices" }, 400);
      }

      const { data, error } = await supabase
        .from("fabric_pricing")
        .insert({ edge_type, perimeter, prices })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_pricing",
        operation: "create",
        previous_data: null,
        new_data: data,
        changed_by: changedBy,
        description: `Added fabric pricing row: ${edge_type} ${perimeter}m`,
      });

      return jsonResponse({ success: true, data });
    }

    if (req.method === "DELETE" && subPath.startsWith("fabric-pricing/")) {
      const id = subPath.split("/")[1];
      const { data: existing } = await supabase.from("fabric_pricing").select("*").eq("id", id).maybeSingle();
      if (!existing) return jsonResponse({ error: "Row not found" }, 404);

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_pricing",
        operation: "delete",
        previous_data: existing,
        new_data: null,
        changed_by: changedBy,
        description: `Deleted fabric pricing row: ${existing.edge_type} ${existing.perimeter}m`,
      });

      const { error } = await supabase.from("fabric_pricing").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Error in base-pricing function:", error);
    return jsonResponse(
      { error: error.message || "An unexpected error occurred" },
      500
    );
  }
});
