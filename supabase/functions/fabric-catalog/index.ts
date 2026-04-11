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
  const parts = url.pathname.split("/fabric-catalog");
  return (parts[1] || "").replace(/^\//, "");
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

      const [fabricsRes, colorsRes] = await Promise.all([
        supabase
          .from("fabric_catalog")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("fabric_colors")
          .select("*")
          .eq("is_in_stock", true)
          .order("display_order"),
      ]);

      return jsonResponse({
        success: true,
        data: {
          fabrics: fabricsRes.data || [],
          colors: colorsRes.data || [],
        },
      });
    }

    if (req.method === "GET" && subPath === "admin") {
      const user = await getAuthenticatedUser(req);
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const [fabricsRes, colorsRes] = await Promise.all([
        supabase.from("fabric_catalog").select("*").order("display_order"),
        supabase
          .from("fabric_colors")
          .select("*")
          .order("fabric_type_id")
          .order("display_order"),
      ]);

      return jsonResponse({
        success: true,
        data: {
          fabrics: fabricsRes.data || [],
          colors: colorsRes.data || [],
        },
      });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
    const changedBy = user.email || "admin";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "POST" && subPath === "fabrics") {
      const body = await req.json();
      const {
        id,
        label,
        description,
        detailed_description,
        benefits,
        best_for,
        uv_protection,
        warranty_years,
        made_in,
        weight_per_sqm,
        badge_text,
        is_fire_retardant,
        display_order,
      } = body;

      if (!id || !label)
        return jsonResponse({ error: "Missing id or label" }, 400);

      const { data: existing } = await supabase
        .from("fabric_catalog")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (existing)
        return jsonResponse({ error: "Fabric type already exists" }, 409);

      const { data, error } = await supabase
        .from("fabric_catalog")
        .insert({
          id,
          label,
          description: description || "",
          detailed_description: detailed_description || "",
          benefits: benefits || [],
          best_for: best_for || [],
          uv_protection: uv_protection || "",
          warranty_years: warranty_years ?? 10,
          made_in: made_in || "",
          weight_per_sqm: weight_per_sqm ?? 0,
          badge_text: badge_text || "",
          is_fire_retardant: is_fire_retardant ?? false,
          display_order: display_order ?? 99,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const { data: ftExists } = await supabase
        .from("fabric_types")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (!ftExists) {
        await supabase
          .from("fabric_types")
          .insert({ id, label, display_order: display_order ?? 99, is_active: true });

        const { data: pricingRows } = await supabase
          .from("fabric_pricing")
          .select("id, prices");
        if (pricingRows && pricingRows.length > 0) {
          for (const row of pricingRows) {
            const updatedPrices = { ...row.prices, [id]: 0 };
            await supabase
              .from("fabric_pricing")
              .update({ prices: updatedPrices })
              .eq("id", row.id);
          }
        }
      }

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_catalog",
        operation: "create",
        previous_data: null,
        new_data: data,
        changed_by: changedBy,
        description: `Added new fabric: ${label} (${id})`,
      });

      return jsonResponse({ success: true, data });
    }

    if (req.method === "PUT" && subPath === "fabrics") {
      const body = await req.json();
      const { id, ...updates } = body;
      if (!id) return jsonResponse({ error: "Missing id" }, 400);

      const { data: existing } = await supabase
        .from("fabric_catalog")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!existing) return jsonResponse({ error: "Fabric not found" }, 404);

      const allowedFields = [
        "label",
        "description",
        "detailed_description",
        "benefits",
        "best_for",
        "uv_protection",
        "warranty_years",
        "made_in",
        "weight_per_sqm",
        "badge_text",
        "is_fire_retardant",
        "display_order",
        "is_active",
      ];

      const cleanUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      for (const key of allowedFields) {
        if (updates[key] !== undefined) cleanUpdates[key] = updates[key];
      }

      if (cleanUpdates.label !== undefined || cleanUpdates.is_active !== undefined) {
        const ftUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (cleanUpdates.label !== undefined) ftUpdates.label = cleanUpdates.label;
        if (cleanUpdates.is_active !== undefined) ftUpdates.is_active = cleanUpdates.is_active;
        if (cleanUpdates.display_order !== undefined) ftUpdates.display_order = cleanUpdates.display_order;
        await supabase.from("fabric_types").update(ftUpdates).eq("id", id);
      }

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_catalog",
        operation: "update",
        previous_data: existing,
        new_data: { ...existing, ...cleanUpdates },
        changed_by: changedBy,
        description: `Updated fabric: ${existing.label}`,
      });

      const { data, error } = await supabase
        .from("fabric_catalog")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      return jsonResponse({ success: true, data });
    }

    if (req.method === "POST" && subPath === "colors") {
      const body = await req.json();
      const {
        fabric_type_id,
        color_name,
        image_url,
        text_color,
        shade_factor,
        is_fire_retardant,
        display_order,
      } = body;

      if (!fabric_type_id || !color_name)
        return jsonResponse(
          { error: "Missing fabric_type_id or color_name" },
          400
        );

      const { data, error } = await supabase
        .from("fabric_colors")
        .insert({
          fabric_type_id,
          color_name,
          image_url: image_url || "",
          text_color: text_color || "#FFFFFF",
          shade_factor: shade_factor ?? 0,
          is_fire_retardant: is_fire_retardant ?? false,
          is_in_stock: true,
          display_order: display_order ?? 99,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_colors",
        operation: "create",
        previous_data: null,
        new_data: data,
        changed_by: changedBy,
        description: `Added color "${color_name}" to ${fabric_type_id}`,
      });

      return jsonResponse({ success: true, data });
    }

    if (req.method === "PUT" && subPath === "colors") {
      const body = await req.json();
      const { id, ...updates } = body;
      if (!id) return jsonResponse({ error: "Missing id" }, 400);

      const { data: existing } = await supabase
        .from("fabric_colors")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!existing) return jsonResponse({ error: "Color not found" }, 404);

      const allowedFields = [
        "color_name",
        "image_url",
        "text_color",
        "shade_factor",
        "is_fire_retardant",
        "is_in_stock",
        "display_order",
      ];

      const cleanUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      for (const key of allowedFields) {
        if (updates[key] !== undefined) cleanUpdates[key] = updates[key];
      }

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_colors",
        operation: "update",
        previous_data: existing,
        new_data: { ...existing, ...cleanUpdates },
        changed_by: changedBy,
        description: `Updated color "${existing.color_name}" (${existing.fabric_type_id})${
          cleanUpdates.is_in_stock !== undefined
            ? `: stock ${cleanUpdates.is_in_stock ? "enabled" : "disabled"}`
            : ""
        }`,
      });

      const { data, error } = await supabase
        .from("fabric_colors")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      return jsonResponse({ success: true, data });
    }

    if (req.method === "PUT" && subPath === "colors/bulk-stock") {
      const { updates: stockUpdates } = await req.json();
      if (!Array.isArray(stockUpdates) || stockUpdates.length === 0)
        return jsonResponse({ error: "Missing updates array" }, 400);

      const results = [];
      for (const item of stockUpdates) {
        const { id: colorId, is_in_stock } = item;
        if (!colorId || is_in_stock === undefined) continue;

        const { data: existing } = await supabase
          .from("fabric_colors")
          .select("*")
          .eq("id", colorId)
          .maybeSingle();
        if (!existing) continue;

        if (existing.is_in_stock !== is_in_stock) {
          await supabase
            .from("fabric_colors")
            .update({
              is_in_stock,
              updated_at: new Date().toISOString(),
            })
            .eq("id", colorId);

          results.push({
            id: colorId,
            color_name: existing.color_name,
            is_in_stock,
          });
        }
      }

      if (results.length > 0) {
        await supabase.from("pricing_change_log").insert({
          table_name: "fabric_colors",
          operation: "bulk_stock_update",
          previous_data: null,
          new_data: results,
          changed_by: changedBy,
          description: `Bulk stock update: ${results.length} color(s) changed`,
        });
      }

      return jsonResponse({ success: true, updated: results.length, results });
    }

    if (req.method === "DELETE" && subPath.startsWith("colors/")) {
      const colorId = subPath.split("/")[1];
      if (!colorId || colorId === "bulk-stock")
        return jsonResponse({ error: "Missing color id" }, 400);

      const { data: existing } = await supabase
        .from("fabric_colors")
        .select("*")
        .eq("id", colorId)
        .maybeSingle();
      if (!existing) return jsonResponse({ error: "Color not found" }, 404);

      await supabase.from("pricing_change_log").insert({
        table_name: "fabric_colors",
        operation: "delete",
        previous_data: existing,
        new_data: null,
        changed_by: changedBy,
        description: `Deleted color "${existing.color_name}" from ${existing.fabric_type_id}`,
      });

      const { error } = await supabase
        .from("fabric_colors")
        .delete()
        .eq("id", colorId);
      if (error) throw new Error(error.message);

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Error in fabric-catalog function:", error);
    return jsonResponse(
      { error: error.message || "An unexpected error occurred" },
      500
    );
  }
});
