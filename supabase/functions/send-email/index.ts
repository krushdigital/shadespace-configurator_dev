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

const CURRENCY_DOMAIN_MAP: Record<string, string> = {
  AUD: "shadespace.com.au",
  NZD: "shadespace.com.au",
  USD: "shadespace.com",
  CAD: "shadespace.com",
  GBP: "shadespace.com",
  EUR: "shadespace.com",
};

function buildResumeUrl(id?: string, token?: string, currency?: string): string | null {
  if (!id || !token) return null;
  const domain = (currency && CURRENCY_DOMAIN_MAP[currency.toUpperCase()]) || new URL(BASE_URL).hostname;
  const base = `https://${domain}/pages/shade-sail-configurator`;
  const url = new URL(base);
  url.searchParams.set("quote", id);
  url.searchParams.set("token", token);
  url.searchParams.set("_ab", "0");
  url.searchParams.set("_fd", "0");
  const fragment = `quote=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  return `${url.toString()}#${fragment}`;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderTemplate(str: string, ctx: Record<string, any>): string {
  if (!str) return "";
  let out = str.replace(/\{\{#if\s+([\w_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, key, body) =>
    ctx[key] ? body : ""
  );
  out = out.replace(/\{\{\{\s*([\w_]+)\s*\}\}\}/g, (_m, key) => {
    const v = ctx[key];
    return v === undefined || v === null ? "" : String(v);
  });
  out = out.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_m, key) => {
    const v = ctx[key];
    return v === undefined || v === null || v === "" ? "" : String(v);
  });
  return out;
}

function stripHeaderBanner(html: string): string {
  return html.replace(/<!--\s*HEADER_BANNER_START\s*-->[\s\S]*?<!--\s*HEADER_BANNER_END\s*-->/g, "");
}

function buildDefaultSignatureHtml(sender: any): string {
  const name = sender?.signature_name;
  const phone = sender?.signature_phone;
  if (!name && !phone) return "";
  const lines: string[] = [];
  if (name) lines.push(`<strong>${escapeHtml(name)}</strong>`);
  if (phone) lines.push(escapeHtml(phone));
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:14px;line-height:1.5;color:#374151;">${lines.join("<br>")}</div>`;
}

function appendSignature(html: string, signatureHtml: string): string {
  if (!signatureHtml) return html;
  const wrapped = `<!-- SIGNATURE_BLOCK -->${signatureHtml}<!-- /SIGNATURE_BLOCK -->`;
  if (html.includes("<!-- SIGNATURE_SLOT -->")) {
    return html.replace("<!-- SIGNATURE_SLOT -->", wrapped);
  }
  const anchors = [
    /(<p[^>]*>\s*-\s*\{\{\s*sender_first_name\s*\}\}\s*<\/p>)/i,
    /(<p[^>]*>\s*-\s*[A-Za-z][A-Za-z .'-]{0,40}\s*<\/p>)/i,
  ];
  for (const re of anchors) {
    if (re.test(html)) return html.replace(re, `$1${wrapped}`);
  }
  if (html.includes("</body>")) return html.replace("</body>", `${wrapped}</body>`);
  return html + wrapped;
}

function applyTemplateTransforms(
  html: string,
  template: any,
  sender: any,
): string {
  let out = html;
  if (template?.include_header === false) {
    out = stripHeaderBanner(out);
  }
  if (template?.include_signature) {
    const sigHtml = (sender?.signature_html && String(sender.signature_html).trim())
      || buildDefaultSignatureHtml(sender);
    if (sigHtml) out = appendSignature(out, sigHtml);
  }
  return out;
}

function rewriteLinksForTracking(html: string, queueId: string, unsubUrl: string): string {
  return html.replace(/href="([^"]+)"/g, (_m, url) => {
    if (url.startsWith("mailto:") || url.includes("{{unsubscribe_url}}") || url === unsubUrl) return `href="${url}"`;
    if (url.includes("/pages/shade-sail-configurator")) return `href="${url}"`;
    const encoded = encodeURIComponent(url);
    return `href="${SB_URL}/functions/v1/track-click?q=${queueId}&u=${encoded}"`;
  });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NZD: "NZ$", USD: "US$", AUD: "AU$", GBP: "\u00A3", EUR: "\u20AC", CAD: "CA$",
};

function formatPriceDisplay(amount: number | undefined, currency: string): string {
  if (!amount && amount !== 0) return "";
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "";
  return `${symbol}${Number(amount).toFixed(2)}`;
}

function rowsHtml(title: string, source: Record<string, any> | undefined, labelFn: (k: string) => string): string {
  if (!source || Object.keys(source).length === 0) return "";
  let rows = "";
  for (const [key, value] of Object.entries(source)) {
    const display = typeof value === "string" ? value : (value as any)?.formatted ?? String(value);
    rows += `<tr><td style="color:#307C31;padding:6px 0;font-weight:bold;font-size:14px;">${labelFn(key)}</td><td style="color:#01312D;font-weight:600;padding:6px 0;text-align:right;font-size:14px;">${display}</td></tr>`;
  }
  return `<div style="padding:0 30px 20px 30px;"><h3 style="color:#01312D;margin:0 0 12px 0;font-size:16px;border-bottom:2px solid #BFF102;padding-bottom:6px;">${title}</h3><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></div>`;
}

function measurementRowsOnly(source: Record<string, any> | undefined, labelFn: (k: string) => string): string {
  if (!source || Object.keys(source).length === 0) return "";
  let rows = "";
  for (const [key, value] of Object.entries(source)) {
    const display = typeof value === "string" ? value : (value as any)?.formatted ?? String(value);
    rows += `<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;width:45%;border-bottom:1px solid #f1f5f9;">${labelFn(key)}</td><td style="color:#0f172a;padding:10px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">${display}</td></tr>`;
  }
  return `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function buildContext(quote: any, sender: any, unsubUrl: string, extra: Record<string, any> = {}): Record<string, any> {
  const cfg = quote?.config_data || {};
  const calc = quote?.calculations_data || {};
  const firstName = quote?.customer_first_name || (quote?.customer_email?.split("@")[0]) || "there";
  const lastName = quote?.customer_last_name || "";
  const customerName = [quote?.customer_first_name, lastName].filter(Boolean).join(" ") || firstName;
  const currency = cfg?.currency || "";
  const resumeUrl = buildResumeUrl(quote?.id, quote?.access_token, currency) || extra.resume_url || extra.quote_url || CONFIGURATOR_URL;
  const labels = ["Fabric & Colour", "Style", "Corners", "Measurement Options", "Dimensions", "Heights & Anchor Points", "Review"];

  const totalPrice = calc?.totalPrice;
  const edgeType = cfg?.edgeType || cfg?.style || "";
  const fabricType = cfg?.fabricType || "";
  const fabricColor = cfg?.fabricColor || "";
  const corners = cfg?.corners || "";
  const wireThickness = cfg?.wireThickness || calc?.wireThickness || "";
  const webbingWidth = cfg?.webbingWidth || calc?.webbingWidth || "";
  const shadeFactor = calc?.shadeFactor || cfg?.shadeFactor || "";
  const area = calc?.area || "";
  const perimeter = calc?.perimeter || "";
  const warrantyYears = cfg?.warrantyYears || calc?.warrantyYears || "15";
  const productName = cfg?.productName || (fabricType && fabricColor && corners ? `Custom ${fabricType} Shade Sail - ${fabricColor} - ${corners} Corner` : "Custom Shade Sail");

  const edgeMeasurements = calc?.edgeMeasurements || cfg?.edgeMeasurements;
  const diagonalMeasurements = calc?.diagonalMeasurements || cfg?.diagonalMeasurements;
  const anchorMeasurements = calc?.anchorPointMeasurements || cfg?.anchorPointMeasurements;

  const wireOrWebbing = wireThickness || webbingWidth || "";
  const wireOrWebbingLabel = wireThickness ? "Wire Thickness" : webbingWidth ? "Webbing Width" : "";

  return {
    first_name: firstName,
    last_name: lastName,
    customer_name: customerName,
    applicant_name: customerName,
    email: quote?.customer_email || "",
    quote_reference: quote?.quote_reference || "",
    quote_name: quote?.quote_name || "",
    current_step: quote?.current_step ?? "",
    current_step_label: labels[quote?.current_step] || "",
    resume_url: resumeUrl,
    quote_url: resumeUrl,
    pdf_url: quote?.pdf_url || resumeUrl,
    price: totalPrice ? Math.round(totalPrice).toLocaleString() : "",
    price_formatted: formatPriceDisplay(totalPrice, currency),
    currency,
    country: quote?.customer_country || "",
    fabric_type: fabricType,
    fabric_color: fabricColor,
    corners,
    style: edgeType,
    edge_type: edgeType,
    wire_thickness: wireThickness,
    webbing_width: webbingWidth,
    wire_or_webbing: wireOrWebbing,
    wire_or_webbing_label: wireOrWebbingLabel,
    product_name: productName,
    shade_factor: shadeFactor ? `${shadeFactor}%` : "",
    area: typeof area === "number" ? `${area.toFixed(2)} m\u00B2` : (area || ""),
    perimeter: typeof perimeter === "number" ? `${perimeter}mm` : (perimeter || ""),
    warranty_years: warrantyYears,
    canvas_image: extra.canvas_image || quote?.diagram_url || quote?.resolved_diagram_url || "",
    ...extra,
    resume_url: resumeUrl,
    quote_url: resumeUrl,
    pdf_url: quote?.pdf_url || resumeUrl,
    edge_measurements_html: rowsHtml("Precise Measurements", edgeMeasurements, (k) => `${k.charAt(0)} \u2192 ${k.charAt(1)}`),
    diagonal_measurements_html: rowsHtml("Diagonal Measurements", diagonalMeasurements, (k) => `Diagonal ${k.charAt(0)} \u2192 ${k.charAt(1)}`),
    anchor_measurements_html: rowsHtml("Anchor Point Heights", anchorMeasurements, (k) => `Corner ${k}`),
    edge_measurements_rows: measurementRowsOnly(edgeMeasurements, (k) => `${k.charAt(0)} \u2192 ${k.charAt(1)}`),
    diagonal_measurements_rows: measurementRowsOnly(diagonalMeasurements, (k) => `Diagonal ${k.charAt(0)} \u2192 ${k.charAt(1)}`),
    anchor_measurements_rows: measurementRowsOnly(anchorMeasurements, (k) => `Corner ${k}`),
    width: cfg?.measurements?.width || "",
    height: cfg?.measurements?.height || "",
    pricing_locked_until:
      typeof extra.pricing_locked_until === "string" && extra.pricing_locked_until
        ? extra.pricing_locked_until
        : quote?.pricing_locked_until
          ? new Date(quote.pricing_locked_until).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : "",
    no_price_yet: !totalPrice,
    days_since_saved: quote?.created_at ? Math.round((Date.now() - new Date(quote.created_at).getTime()) / 86400000) : "",
    sender_first_name: sender?.signature_name || "the ShadeSpace team",
    support_phone: sender?.signature_phone || "",
    unsubscribe_url: unsubUrl,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(SB_URL, SB_SERVICE);
    const body = await req.json();
    const { templateId, templateKey, senderId, toEmail, quoteId, testMode, overrideSubject, attachments, contextExtras, previewOnly } = body;

    if ((!templateId && !templateKey) || (!toEmail && !previewOnly)) {
      return new Response(JSON.stringify({ error: "templateId or templateKey, and toEmail required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!RESEND_API_KEY && !previewOnly) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const templateQuery = supabase.from("email_templates").select("*");
    const { data: template } = templateId
      ? await templateQuery.eq("id", templateId).maybeSingle()
      : await templateQuery.eq("template_key", templateKey).maybeSingle();
    if (!template) {
      return new Response(JSON.stringify({ error: "template not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (template.is_active === false && !previewOnly) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "template_inactive" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!template.transactional) {
      const { data: unsub } = await supabase.from("email_unsubscribes").select("email").eq("email", toEmail.toLowerCase()).maybeSingle();
      if (unsub && !testMode) {
        return new Response(JSON.stringify({ skipped: true, reason: "unsubscribed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
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
      if (!quote?.resolved_diagram_url) {
        if (quote?.diagram_public_url) {
          quote.resolved_diagram_url = quote.diagram_public_url;
        } else if (quote?.diagram_image_path) {
          const { data: pub } = supabase.storage.from("quote-assets").getPublicUrl(quote.diagram_image_path);
          if (pub?.publicUrl) quote.resolved_diagram_url = pub.publicUrl;
        }
      }
      if (quote?.marketing_opt_in === false && !template?.transactional && !testMode) {
        return new Response(JSON.stringify({ skipped: true, reason: "marketing_opt_in_false" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    if (!quote && (testMode || previewOnly)) {
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

    // Preview-only mode: render HTML with real context and return without sending
    if (previewOnly) {
      const unsubPreview = `${BASE_URL}/email/unsubscribe?email=${encodeURIComponent(toEmail || "preview@example.com")}`;
      const previewCtx = buildContext(quote, sender, unsubPreview, contextExtras || {});
      const previewSubject = renderTemplate(template.subject_locked ? template.subject : (overrideSubject || template.subject), previewCtx);
      const transformedBody = applyTemplateTransforms(template.html_body, template, sender);
      const previewHtml = renderTemplate(transformedBody, previewCtx);
      return new Response(JSON.stringify({ ok: true, preview: true, subject: previewSubject, html: previewHtml }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    const ctx = buildContext(quote, sender, unsubUrl, contextExtras || {});
    const effectiveSubject = template.subject_locked ? template.subject : (overrideSubject || template.subject);
    const subject = renderTemplate(effectiveSubject, ctx);
    const transformedBodyForSend = applyTemplateTransforms(template.html_body, template, sender);
    let html = renderTemplate(transformedBodyForSend, ctx);
    html = rewriteLinksForTracking(html, queueRow.id, unsubUrl);
    const text = renderTemplate(template.text_body, ctx);

    const resolvedAttachments: Array<{ filename: string; content: string; type?: string }> = [];
    let autoPdfDiagnostic: string | null = null;

    const callerHasPdf = Array.isArray(attachments) && attachments.some((a: any) => a?.type === "application/pdf" || a?.filename?.endsWith?.(".pdf"));
    const shouldAutoPdf = (template?.attach_pdf === true || body?.generatePdfFromQuote === true)
      && quote
      && quote.id
      && quote.id !== "00000000-0000-0000-0000-000000000000"
      && !callerHasPdf;

    if (shouldAutoPdf) {
      const boundPdfTemplateId = (template as any)?.pdf_template_id as string | null | undefined;
      const storedPath = (quote as any).pdf_path as string | null;
      const ref = quote.quote_reference || "Quote";
      const pattern = (template as any)?.pdf_filename_pattern as string | null | undefined;
      const sanitize = (s: unknown) => String(s ?? "").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
      const filename = pattern
        ? renderTemplate(pattern, {
            quote_reference: ref,
            quote_name: sanitize(quote.quote_name),
            customer_first_name: sanitize(quote.customer_first_name),
            customer_last_name: sanitize(quote.customer_last_name),
          })
        : `ShadeSpace-Quote-${ref}.pdf`;
      const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

      if (boundPdfTemplateId) {
        autoPdfDiagnostic = `legacy generate-pdf path is disabled; pdfTemplateId=${boundPdfTemplateId} ignored. Use stored pdf or caller-provided attachment.`;
      }

      if (resolvedAttachments.length === 0 && storedPath) {
        try {
          const { data: file, error: dErr } = await supabase.storage.from("quote-assets").download(storedPath);
          if (file) {
            const buf = new Uint8Array(await file.arrayBuffer());
            let bin = "";
            for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
            resolvedAttachments.push({
              filename: safeFilename,
              content: btoa(bin),
              type: "application/pdf",
            });
            autoPdfDiagnostic = `attached stored pdf bytes=${buf.length} path=${storedPath}`;
          } else {
            autoPdfDiagnostic = `stored pdf download failed: ${dErr?.message || "unknown"} path=${storedPath}`;
          }
        } catch (pdfErr) {
          autoPdfDiagnostic = `stored pdf read threw: ${pdfErr instanceof Error ? pdfErr.message : String(pdfErr)}`;
        }
      } else if (resolvedAttachments.length === 0) {
        autoPdfDiagnostic = "no stored pdf for this quote and no bound pdf template render succeeded — nothing to attach";
      }
    } else if (template?.attach_pdf === true || body?.generatePdfFromQuote === true) {
      autoPdfDiagnostic = `auto-pdf skipped (callerHasPdf=${callerHasPdf}, quoteId=${quote?.id || 'none'})`;
    }

    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att?.content) {
          const raw = String(att.content);
          resolvedAttachments.push({
            filename: att.filename || "attachment",
            content: raw.startsWith("data:") ? raw.split(",")[1] : raw,
            type: att.type || "application/octet-stream",
          });
        } else if (att?.storage_path) {
          const { data: file } = await supabase.storage.from("quote-assets").download(att.storage_path);
          if (file) {
            const buf = new Uint8Array(await file.arrayBuffer());
            let binary = "";
            for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
            resolvedAttachments.push({
              filename: att.filename || att.storage_path.split("/").pop() || "attachment.pdf",
              content: btoa(binary),
              type: att.type || "application/pdf",
            });
          }
        }
      }
    }

    const resendPayload: Record<string, any> = {
      from: `${sender.from_name} <${sender.from_email}>`,
      to: [toEmail],
      reply_to: sender.reply_to || sender.from_email,
      subject,
      html,
      text,
    };
    if (!template.transactional) {
      resendPayload.headers = { "List-Unsubscribe": `<${unsubUrl}>` };
    }
    if (resolvedAttachments.length > 0) {
      resendPayload.attachments = resolvedAttachments.map(({ filename, content }) => ({ filename, content }));
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
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
      attachments: resolvedAttachments.map(({ filename, type }) => ({ filename, type })),
      attach_status: autoPdfDiagnostic,
      error: null,
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
