import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const BASE_URL = Deno.env.get("EMAIL_APP_BASE_URL") || "https://shadespace.com";
const CONFIGURATOR_URL = Deno.env.get("CONFIGURATOR_URL") || `${BASE_URL}/pages/shade-sail-configurator`;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function buildResumeUrl(id?: string, token?: string): string {
  if (!id || !token) return CONFIGURATOR_URL;
  return `${CONFIGURATOR_URL}?quote=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderTemplate(str: string, ctx: Record<string, any>): string {
  if (!str) return "";
  let out = str.replace(/\{\{#if\s+([\w_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, key, body) =>
    ctx[key] ? body : ""
  );
  out = out.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_m, key) => {
    const v = ctx[key];
    return v === undefined || v === null || v === "" ? "" : String(v);
  });
  return out;
}

function rewriteLinksForTracking(html: string, queueId: string, unsubUrl: string): string {
  return html.replace(/href="([^"]+)"/g, (_m, url) => {
    if (url.startsWith("mailto:") || url.includes("{{unsubscribe_url}}") || url === unsubUrl) return `href="${url}"`;
    const encoded = encodeURIComponent(url);
    return `href="${BASE_URL}/functions/v1/track-click?q=${queueId}&u=${encoded}"`;
  });
}

function buildContext(quote: any, sender: any, unsubUrl: string): Record<string, any> {
  const cfg = quote?.config_data || {};
  const calc = quote?.calculations_data || {};
  const firstName = quote?.customer_first_name || (quote?.customer_email?.split("@")[0]) || "there";
  const resumeUrl = buildResumeUrl(quote?.id, quote?.access_token);
  const labels = ["Fabric & Colour", "Style", "Corners", "Measurement Options", "Dimensions", "Heights & Anchor Points", "Review"];
  return {
    first_name: firstName,
    last_name: quote?.customer_last_name || "",
    applicant_name: [quote?.customer_first_name, quote?.customer_last_name].filter(Boolean).join(" ") || firstName,
    email: quote?.customer_email || "",
    quote_reference: quote?.quote_reference || "",
    quote_name: quote?.quote_name || "",
    current_step: quote?.current_step ?? "",
    current_step_label: labels[quote?.current_step] || "",
    resume_url: resumeUrl,
    quote_url: resumeUrl,
    pdf_url: quote?.pdf_url || resumeUrl,
    price: calc?.totalPrice ? Math.round(calc.totalPrice).toLocaleString() : "",
    currency: cfg?.currency || "",
    country: quote?.customer_country || "",
    fabric_type: cfg?.fabricType || "",
    fabric_color: cfg?.fabricColor || "",
    corners: cfg?.corners || "",
    style: cfg?.edgeType || cfg?.style || "",
    width: cfg?.measurements?.width || "",
    height: cfg?.measurements?.height || "",
    pricing_locked_until: quote?.pricing_locked_until
      ? new Date(quote.pricing_locked_until).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "",
    days_since_saved: quote?.created_at ? Math.round((Date.now() - new Date(quote.created_at).getTime()) / 86400000) : "",
    sender_first_name: sender?.signature_name || "the Shade Systems team",
    support_phone: sender?.signature_phone || "",
    unsubscribe_url: unsubUrl,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(SB_URL, SB_SERVICE);
    const body = await req.json();
    const { templateId, senderId, toEmail, quoteId, testMode, overrideSubject } = body;

    if (!templateId || !toEmail) {
      return new Response(JSON.stringify({ error: "templateId and toEmail required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: unsub } = await supabase.from("email_unsubscribes").select("email").eq("email", toEmail.toLowerCase()).maybeSingle();
    if (unsub && !testMode) {
      return new Response(JSON.stringify({ skipped: true, reason: "unsubscribed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: template } = await supabase.from("email_templates").select("*").eq("id", templateId).maybeSingle();
    if (!template) {
      return new Response(JSON.stringify({ error: "template not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const senderRowId = senderId || template.default_sender_id;
    const { data: sender } = await supabase.from("email_senders").select("*").eq("id", senderRowId).maybeSingle();
    if (!sender) {
      return new Response(JSON.stringify({ error: "sender not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let quote: any = null;
    if (quoteId) {
      const { data } = await supabase.from("saved_quotes").select("*").eq("id", quoteId).maybeSingle();
      quote = data;
      if (quote?.is_excluded && !testMode) {
        return new Response(JSON.stringify({ skipped: true, reason: "excluded" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    if (!quote && testMode) {
      quote = {
        id: "00000000-0000-0000-0000-000000000000",
        access_token: "demo",
        quote_reference: "QT-TEST-001",
        quote_name: "Sample Quote",
        customer_first_name: "Alex",
        customer_last_name: "Sample",
        customer_email: toEmail,
        customer_country: "NZ",
        current_step: 6,
        config_data: { currency: "NZD", fabricType: "Shadetex 320", fabricColor: "Charcoal", corners: 4 },
        calculations_data: { totalPrice: 1299 },
        created_at: new Date().toISOString(),
      };
    }

    // Insert queue row first so queueId is available for tracking links
    const { data: queueRow, error: qErr } = await supabase.from("email_queue").insert({
      template_id: template.id,
      sender_id: sender.id,
      quote_id: quote?.id && quote.id !== "00000000-0000-0000-0000-000000000000" ? quote.id : null,
      recipient_email: toEmail,
      status: "sending",
      scheduled_at: new Date().toISOString(),
    }).select().single();
    if (qErr) throw qErr;

    const unsubUrl = `${BASE_URL}/email/unsubscribe?email=${encodeURIComponent(toEmail)}`;
    const ctx = buildContext(quote, sender, unsubUrl);
    const subject = renderTemplate(overrideSubject || template.subject, ctx);
    let html = renderTemplate(template.html_body, ctx);
    html = rewriteLinksForTracking(html, queueRow.id, unsubUrl);
    const text = renderTemplate(template.text_body, ctx);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${sender.from_name} <${sender.from_email}>`,
        to: [toEmail],
        reply_to: sender.reply_to || sender.from_email,
        subject,
        html,
        text,
        headers: { "List-Unsubscribe": `<${unsubUrl}>` },
      }),
    });

    const resendJson = await resendRes.json();

    if (!resendRes.ok) {
      await supabase.from("email_queue").update({ status: "failed", error: JSON.stringify(resendJson) }).eq("id", queueRow.id);
      return new Response(JSON.stringify({ error: resendJson }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("email_queue").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_message_id: resendJson.id,
      subject_snapshot: subject,
      html_snapshot: html,
    }).eq("id", queueRow.id);

    await supabase.from("email_events").insert({ queue_id: queueRow.id, event_type: "sent" });

    return new Response(JSON.stringify({ ok: true, queueId: queueRow.id, messageId: resendJson.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
