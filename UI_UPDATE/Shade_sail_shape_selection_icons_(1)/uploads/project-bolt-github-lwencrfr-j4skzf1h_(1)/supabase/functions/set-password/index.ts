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
    const { token, password } = await req.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ error: "token and password are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SB_URL, SB_SERVICE);

    // Find the admin_users row with this setup token
    const { data: adminRow, error: lookupErr } = await supabase
      .from("admin_users")
      .select("id, auth_user_id, email, setup_token_expires_at")
      .eq("setup_token", token)
      .eq("status", "pending")
      .maybeSingle();

    if (lookupErr || !adminRow) {
      return new Response(JSON.stringify({ error: "Invalid or expired setup link" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check token expiry
    if (adminRow.setup_token_expires_at && new Date(adminRow.setup_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This setup link has expired. Ask your admin to resend the invitation." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!adminRow.auth_user_id) {
      return new Response(JSON.stringify({ error: "No auth account linked. Contact your admin." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Set the password on the Supabase Auth user
    const { error: updateErr } = await supabase.auth.admin.updateUserById(adminRow.auth_user_id, {
      password,
    });

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Activate the admin_users row and clear the token
    await supabase.from("admin_users").update({
      status: "active",
      activated_at: new Date().toISOString(),
      setup_token: null,
      setup_token_expires_at: null,
    }).eq("id", adminRow.id);

    return new Response(JSON.stringify({ ok: true, email: adminRow.email }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
