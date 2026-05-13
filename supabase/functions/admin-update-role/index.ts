import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "missing token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SB_URL, SB_SERVICE);
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: caller } = await supabase.from("admin_users").select("*").eq("auth_user_id", userData.user.id).eq("status", "active").maybeSingle();
    if (!caller || caller.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "not authorised" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { adminUserId, role, status } = await req.json();
    if (!adminUserId) return new Response(JSON.stringify({ error: "adminUserId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (role && !["admin", "super_admin"].includes(role)) return new Response(JSON.stringify({ error: "invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (status && !["pending", "active", "disabled"].includes(status)) return new Response(JSON.stringify({ error: "invalid status" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (adminUserId === caller.id && role && role !== "super_admin") {
      return new Response(JSON.stringify({ error: "You cannot demote yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const patch: any = {};
    if (role) patch.role = role;
    if (status) patch.status = status;
    const { error } = await supabase.from("admin_users").update(patch).eq("id", adminUserId);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabase.from("admin_audit_log").insert({
      actor_id: caller.id,
      actor_email: caller.email,
      action: "update_role",
      target_admin_id: adminUserId,
      metadata: patch,
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
