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

    const { adminUserId } = await req.json();
    if (!adminUserId) return new Response(JSON.stringify({ error: "adminUserId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (adminUserId === caller.id) {
      return new Response(JSON.stringify({ error: "You cannot delete yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: target } = await supabase.from("admin_users").select("*").eq("id", adminUserId).maybeSingle();
    if (!target) return new Response(JSON.stringify({ error: "target not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (target.role === "super_admin") {
      const { count } = await supabase.from("admin_users").select("id", { count: "exact", head: true }).eq("role", "super_admin").eq("status", "active");
      if ((count || 0) <= 1) {
        return new Response(JSON.stringify({ error: "Cannot delete the last super admin" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { error: delAdminErr } = await supabase.from("admin_users").delete().eq("id", target.id);
    if (delAdminErr) {
      return new Response(JSON.stringify({ error: delAdminErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let authDeleteMessage: string | null = null;
    if (target.auth_user_id) {
      const { error: delAuthErr } = await supabase.auth.admin.deleteUser(target.auth_user_id);
      if (delAuthErr) authDeleteMessage = delAuthErr.message;
    }

    await supabase.from("admin_audit_log").insert({
      actor_id: caller.id,
      actor_email: caller.email,
      action: "delete",
      target_email: target.email,
      metadata: { role: target.role, auth_delete_error: authDeleteMessage },
    });

    return new Response(JSON.stringify({ ok: true, authDeleteMessage }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
