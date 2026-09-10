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
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Shade Systems <sails@shadespace.com>";
const ADMIN_URL = "https://shadespace.com.au/pages/shade-sail-configurator/?admin=true";
const SETUP_URL = "https://shadespace.com.au/pages/shade-sail-configurator/?setup-password=true";

function buildAdminInviteHtml(opts: { inviterName: string; inviteeName: string; role: string; setupUrl: string }) {
  const roleLabel = opts.role === "super_admin" ? "Super Admin" : "Admin";
  return `<!doctype html><html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]--><!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]--></head><body style="margin:0;background:#f6f7f8;font-family:Helvetica,Arial,sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f8;padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb">
      <tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff">
        <p style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px 0;color:#ffffff;opacity:.8">SHADE SYSTEMS</p>
        <p style="font-size:22px;font-weight:700;margin:0;color:#ffffff">Admin Dashboard Invitation</p>
      </td></tr>
      <tr><td style="padding:28px 32px;font-size:15px;line-height:23px;mso-line-height-rule:exactly;">
        <p style="margin:0 0 16px 0;">Hi${opts.inviteeName ? ` ${opts.inviteeName}` : ""},</p>
        <p style="margin:0 0 16px 0;"><strong>${opts.inviterName}</strong> has invited you to join the Shade Systems Admin Dashboard as a <strong>${roleLabel}</strong>.</p>
        <p style="margin:0 0 16px 0;">Click the button below to set up your password and get started.</p>
        <p style="text-align:center;margin:28px 0">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${opts.setupUrl}" style="height:42px;v-text-anchor:middle;width:250px;" arcsize="19%" strokecolor="#0f3d2e" fillcolor="#0f3d2e"><w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;">Set up your password</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${opts.setupUrl}" style="background:#0f3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Set up your password</a><!--<![endif]-->
        </p>
        <p style="font-size:13px;color:#4b5563;margin:0 0 16px 0;">Or copy this link into your browser:<br/><a href="${opts.setupUrl}" style="color:#0f3d2e;word-break:break-all">${opts.setupUrl}</a></p>
        <p style="font-size:13px;color:#4b5563;margin:0 0 16px 0;">Alternatively, you can <a href="${ADMIN_URL}" style="color:#0f3d2e">sign in with Google</a> if your email is a Google account.</p>
        <p style="font-size:12px;color:#6b7280;margin:24px 0 0 0;">This link expires in 72 hours. If you weren't expecting this invite, you can safely ignore it.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280">Shade Systems - shadespace.com</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function buildTeamMemberInviteHtml(opts: { inviterName: string; inviteeName: string; setupUrl: string }) {
  return `<!doctype html><html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]--><!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]--></head><body style="margin:0;background:#f6f7f8;font-family:Helvetica,Arial,sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f8;padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb">
      <tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff">
        <p style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px 0;color:#ffffff;opacity:.8">SHADE SYSTEMS</p>
        <p style="font-size:22px;font-weight:700;margin:0;color:#ffffff">You're invited to the team</p>
      </td></tr>
      <tr><td style="padding:28px 32px;font-size:15px;line-height:23px;mso-line-height-rule:exactly;">
        <p style="margin:0 0 16px 0;">Hi${opts.inviteeName ? ` ${opts.inviteeName}` : ""},</p>
        <p style="margin:0 0 16px 0;"><strong>${opts.inviterName}</strong> has invited you to join the Shade Systems team dashboard.</p>
        <p style="margin:0 0 16px 0;">Click the button below to set up your password and get started.</p>
        <p style="text-align:center;margin:28px 0">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${opts.setupUrl}" style="height:42px;v-text-anchor:middle;width:230px;" arcsize="19%" strokecolor="#0f3d2e" fillcolor="#0f3d2e"><w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;">Set up your password</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${opts.setupUrl}" style="background:#0f3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Set up your password</a><!--<![endif]-->
        </p>
        <p style="font-size:13px;color:#4b5563;margin:0 0 16px 0;">Or copy this link into your browser:<br/><a href="${opts.setupUrl}" style="color:#0f3d2e;word-break:break-all">${opts.setupUrl}</a></p>
        <p style="font-size:12px;color:#6b7280;margin:24px 0 0 0;">This link expires in 72 hours. If you weren't expecting this invite, you can safely ignore it.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280">Shade Systems - shadespace.com</td></tr>
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

function generateSetupToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
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
    if (!email || !["admin", "super_admin", "team_member"].includes(role)) {
      return new Response(JSON.stringify({ error: "email and role (admin|super_admin|team_member) required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emailLower = email.toLowerCase().trim();

    const { data: existing } = await supabase.from("admin_users").select("id,status").ilike("email", emailLower).maybeSingle();
    if (existing && existing.status === "active") {
      return new Response(JSON.stringify({ error: "This user is already active" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user already exists in Supabase Auth
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existingAuthUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === emailLower);

    let authUserId: string | null = existingAuthUser?.id ?? null;

    if (!existingAuthUser) {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: emailLower,
        email_confirm: true,
        user_metadata: { full_name, invited_by: caller.email, role },
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      authUserId = newUser.user?.id ?? null;
    }

    // Generate a setup token for all roles so they can set their password
    const setupToken = generateSetupToken();

    // Upsert admin_users record
    const payload: Record<string, any> = {
      email: emailLower,
      full_name: full_name || "",
      role,
      status: "pending",
      auth_user_id: authUserId,
      invited_by: caller.id,
      invited_at: new Date().toISOString(),
      setup_token: setupToken,
      setup_token_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    };

    if (existing) {
      await supabase.from("admin_users").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("admin_users").insert(payload);
    }

    // Send appropriate invite email
    const inviterName = caller.full_name || caller.email || "A Shade Systems super admin";
    const setupUrl = `${SETUP_URL}&token=${setupToken}`;
    let html: string;
    let text: string;
    let subject: string;

    if (role === "team_member") {
      html = buildTeamMemberInviteHtml({ inviterName, inviteeName: full_name || "", setupUrl });
      text = `${inviterName} has invited you to join the Shade Systems team dashboard.\n\nSet up your password here:\n${setupUrl}\n\nThis link expires in 72 hours.\n\nIf you weren't expecting this invite, you can safely ignore it.`;
      subject = "You're invited to the Shade Systems team";
    } else {
      html = buildAdminInviteHtml({ inviterName, inviteeName: full_name || "", role, setupUrl });
      text = `${inviterName} has invited you to join the Shade Systems Admin Dashboard as a ${role === "super_admin" ? "Super Admin" : "Admin"}.\n\nSet up your password here:\n${setupUrl}\n\nAlternatively, you can sign in with Google at:\n${ADMIN_URL}\n\nThis link expires in 72 hours.\n\nIf you weren't expecting this invite, you can safely ignore it.`;
      subject = "You're invited to the Shade Systems Admin Dashboard";
    }

    try {
      await sendViaResend(emailLower, subject, html, text);
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
