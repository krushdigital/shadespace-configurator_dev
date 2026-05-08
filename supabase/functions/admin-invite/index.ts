import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Shade Systems <hello@shadespace.com>";
const APP_BASE = Deno.env.get("ADMIN_APP_BASE_URL") || Deno.env.get("EMAIL_APP_BASE_URL") || "https://shadespace.com/admin";

function buildInviteHtml(opts: { inviterName: string; inviteeName: string; acceptUrl: string; role: string }) {
  const roleLabel = opts.role === "super_admin" ? "Super Admin" : "Admin";
  return `<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff">
        <div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;opacity:.8">Shade Systems</div>
        <div style="font-size:22px;font-weight:700;margin-top:4px">Admin Dashboard invitation</div>
      </td></tr>
      <tr><td style="padding:28px 32px;font-size:15px;line-height:1.55">
        <p>Hi${opts.inviteeName ? ` ${opts.inviteeName}` : ""},</p>
        <p><strong>${opts.inviterName}</strong> has invited you to join the Shade Systems Admin Dashboard as a <strong>${roleLabel}</strong>.</p>
        <p>Click the button below to accept your invitation and sign in. You'll be able to sign in with Google once you accept.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${opts.acceptUrl}" style="background:#0f3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Accept invitation</a>
        </p>
        <p style="font-size:13px;color:#4b5563">Or copy this link into your browser:<br/><a href="${opts.acceptUrl}" style="color:#0f3d2e;word-break:break-all">${opts.acceptUrl}</a></p>
        <p style="font-size:12px;color:#6b7280;margin-top:24px">If you weren't expecting this invite, you can safely ignore it.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280">Shade Systems - configurator.shadespace.com</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html, text }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || JSON.stringify(json));
  return json;
}

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
      return new Response(JSON.stringify({ error: "Not authorised" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, full_name, role } = await req.json();
    if (!email || !["admin", "super_admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "email and role (admin|super_admin) required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emailLower = email.toLowerCase().trim();
    const redirectTo = `${APP_BASE}/admin/callback`;

    const { data: existing } = await supabase.from("admin_users").select("id,status").ilike("email", emailLower).maybeSingle();
    if (existing && existing.status === "active") {
      return new Response(JSON.stringify({ error: "This admin is already active" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inviteData, error: invErr } = await supabase.auth.admin.inviteUserByEmail(emailLower, {
      data: { full_name, invited_by: caller.email, role },
      redirectTo,
    });

    let authUserId: string | null = inviteData?.user?.id ?? null;
    let acceptUrl = redirectTo;

    if (invErr && /already been registered|already exists/i.test(invErr.message)) {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: emailLower,
        options: { redirectTo },
      });
      if (linkErr) {
        return new Response(JSON.stringify({ error: linkErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      acceptUrl = linkData.properties?.action_link || redirectTo;
      authUserId = linkData.user?.id ?? null;
    } else if (invErr) {
      return new Response(JSON.stringify({ error: invErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: "invite",
        email: emailLower,
        options: { redirectTo },
      });
      if (linkData?.properties?.action_link) acceptUrl = linkData.properties.action_link;
    }

    const payload = {
      email: emailLower,
      full_name: full_name || "",
      role,
      status: "pending",
      auth_user_id: authUserId,
      invited_by: caller.id,
      invited_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("admin_users").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("admin_users").insert(payload);
    }

    const inviterName = caller.full_name || caller.email || "A Shade Systems super admin";
    const html = buildInviteHtml({ inviterName, inviteeName: full_name || "", acceptUrl, role });
    const text = `${inviterName} has invited you to join the Shade Systems Admin Dashboard as a ${role === "super_admin" ? "Super Admin" : "Admin"}.

Accept the invitation:
${acceptUrl}

If you weren't expecting this invite, you can safely ignore it.`;

    try {
      await sendViaResend(emailLower, `You're invited to the Shade Systems Admin (${role === "super_admin" ? "Super Admin" : "Admin"})`, html, text);
    } catch (e) {
      await supabase.from("admin_audit_log").insert({
        actor_id: caller.id, actor_email: caller.email, action: "invite_email_failed",
        target_email: emailLower, metadata: { error: e instanceof Error ? e.message : String(e) },
      });
      return new Response(JSON.stringify({ error: "Invite stored but email failed: " + (e instanceof Error ? e.message : String(e)) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("admin_audit_log").insert({
      actor_id: caller.id, actor_email: caller.email, action: "invite",
      target_email: emailLower, metadata: { role, full_name },
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
