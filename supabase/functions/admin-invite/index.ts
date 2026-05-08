import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getCaller(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient(SB_URL, SB_SERVICE);
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return null;
  const { data: admin } = await supabase.from("admin_users")
    .select("*").eq("auth_user_id", data.user.id).eq("status", "active").maybeSingle();
  return admin;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const caller = await getCaller(req);
    if (!caller || caller.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Not authorised" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, full_name, role } = await req.json();
    if (!email || !["admin", "super_admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "email and role (admin|super_admin) required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SB_URL, SB_SERVICE);
    const emailLower = email.toLowerCase().trim();

    const { data: existing } = await supabase.from("admin_users").select("id,status").ilike("email", emailLower).maybeSingle();
    if (existing && existing.status !== "disabled") {
      return new Response(JSON.stringify({ error: "An admin with that email already exists" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const redirectTo = `${new URL(req.url).origin.replace("/functions/v1", "")}/admin/callback`;
    const { data: invited, error: invErr } = await supabase.auth.admin.inviteUserByEmail(emailLower, {
      data: { full_name, invited_by: caller.email },
      redirectTo,
    });
    if (invErr) {
      return new Response(JSON.stringify({ error: invErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = {
      email: emailLower,
      full_name: full_name || "",
      role,
      status: "pending",
      auth_user_id: invited?.user?.id ?? null,
      invited_by: caller.id,
      invited_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("admin_users").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("admin_users").insert(payload);
    }

    await supabase.from("admin_audit_log").insert({
      actor_id: caller.id,
      actor_email: caller.email,
      action: "invite",
      target_email: emailLower,
      metadata: { role, full_name },
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
