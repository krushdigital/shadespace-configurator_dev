import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await req.json();
    const {
      email,
      pdf,
      currency,
      totalPrice,
      firstName,
      lastName,
      quoteName,
      quoteUrl,
      quoteId,
      quoteReference,
      pricingLockedUntil,
      canvasImage,
      Fabric_Type,
      Shade_Factor,
      Edge_Type,
      Wire_Thickness,
      Webbing_Edge_Width,
      Area,
      Perimeter,
      corners,
      fabricColor,
      warranty,
      backendEdgeMeasurements,
      backendDiagonalMeasurements,
      backendAnchorMeasurements,
      edgeMeasurements,
      diagonalMeasurementsObj,
      anchorPointMeasurements,
      cornerHardware,
      hardwareBreakdown,
    } = data;
    console.log("send-config-email received", {
      pdf_type: typeof pdf,
      pdf_len: typeof pdf === "string" ? pdf.length : 0,
      backendEdge_keys: backendEdgeMeasurements ? Object.keys(backendEdgeMeasurements).length : 0,
      backendDiag_keys: backendDiagonalMeasurements ? Object.keys(backendDiagonalMeasurements).length : 0,
      backendAnchor_keys: backendAnchorMeasurements ? Object.keys(backendAnchorMeasurements).length : 0,
      Area, Perimeter, Wire_Thickness,
    });

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceKey;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Preserve existing Shopify customer sync (unchanged behavior)
    let shopifyCustomerId: string | null = null;
    let shopifyCustomerCreated = false;
    try {
      const shopifyResponse = await fetch(
        `${supabaseUrl}/functions/v1/add-shopify-customer`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            firstName: firstName || null,
            lastName: lastName || null,
            tags: ["quote_saved", "email_pdf_quote_requested"],
            totalPrice,
            currency,
          }),
        }
      );
      const shopifyData = await shopifyResponse.json().catch(() => null);
      if (shopifyData?.success) {
        shopifyCustomerId = shopifyData.customer?.id || null;
        shopifyCustomerCreated = !!shopifyData.customer?.isNew;
      }
    } catch (shopifyError) {
      console.error("Failed to add customer to Shopify:", shopifyError);
    }

    let resolvedQuoteId = quoteId || null;
    let resolvedQuoteRow: {
      id: string;
      quote_reference: string | null;
      pricing_locked_until: string | null;
      total_price: number | null;
      currency: string | null;
    } | null = null;

    if (resolvedQuoteId) {
      const { data: qr } = await supabase
        .from("saved_quotes")
        .select("id, quote_reference, pricing_locked_until, total_price, currency")
        .eq("id", resolvedQuoteId)
        .maybeSingle();
      resolvedQuoteRow = qr || null;
    }
    if (!resolvedQuoteRow && quoteReference) {
      const { data: qr } = await supabase
        .from("saved_quotes")
        .select("id, quote_reference, pricing_locked_until, total_price, currency")
        .eq("quote_reference", quoteReference)
        .maybeSingle();
      if (qr) {
        resolvedQuoteRow = qr;
        resolvedQuoteId = qr.id;
      }
    }

    const resolvedReference = quoteReference || resolvedQuoteRow?.quote_reference || null;
    if (!resolvedReference) {
      console.warn("send-config-email: no quote_reference resolved; email will omit reference", {
        quoteId,
        quoteReference,
      });
    }
    const reference = resolvedReference || "";

    const resolvedPricingLockedUntil =
      pricingLockedUntil || resolvedQuoteRow?.pricing_locked_until || null;
    const resolvedTotalPrice =
      typeof totalPrice === "number"
        ? totalPrice
        : resolvedQuoteRow?.total_price != null
          ? Number(resolvedQuoteRow.total_price)
          : null;
    const resolvedCurrency = currency || resolvedQuoteRow?.currency || "";

    // If canvasImage is a data URL (which email clients commonly strip or bloat),
    // upload it to Supabase Storage and use the public URL instead.
    let resolvedCanvasUrl: string = "";
    if (typeof canvasImage === "string" && canvasImage.length > 0) {
      if (canvasImage.startsWith("data:image")) {
        try {
          const match = canvasImage.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
          if (match) {
            const mime = match[1];
            const ext = mime.split("/")[1]?.replace("+xml", "") || "png";
            const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
            const path = `email-diagrams/${resolvedQuoteId || "anon"}-${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage.from("quote-assets")
              .upload(path, bytes, { contentType: mime, upsert: true });
            if (!upErr) {
              const { data: pub } = supabase.storage.from("quote-assets").getPublicUrl(path);
              resolvedCanvasUrl = pub?.publicUrl || "";
            }
          }
        } catch (e) {
          console.error("canvas upload failed", e);
        }
      } else {
        resolvedCanvasUrl = canvasImage;
      }
    }
    if (!resolvedCanvasUrl && resolvedQuoteId) {
      const { data: qRow } = await supabase.from("saved_quotes").select("diagram_image_path, diagram_public_url").eq("id", resolvedQuoteId).maybeSingle();
      if (qRow?.diagram_public_url) {
        resolvedCanvasUrl = qRow.diagram_public_url;
      } else if (qRow?.diagram_image_path) {
        const { data: pub } = supabase.storage.from("quote-assets").getPublicUrl(qRow.diagram_image_path);
        resolvedCanvasUrl = pub?.publicUrl || "";
      }
    }

    if (resolvedCanvasUrl && resolvedQuoteId) {
      await supabase.from("saved_quotes")
        .update({ diagram_public_url: resolvedCanvasUrl })
        .eq("id", resolvedQuoteId);
    }

    let storedPdfPath: string | null = null;
    if (typeof pdf === "string" && pdf.length > 0 && resolvedQuoteId) {
      try {
        const base64 = pdf.startsWith("data:") ? pdf.split(",")[1] : pdf;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const path = `quote-pdfs/${resolvedQuoteId}/ShadeSpace-Quote-${reference}-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from("quote-assets")
          .upload(path, bytes, { contentType: "application/pdf", upsert: true });
        if (!upErr) {
          storedPdfPath = path;
          await supabase.from("saved_quotes")
            .update({ pdf_path: path })
            .eq("id", resolvedQuoteId);
        } else {
          console.error("pdf upload failed", upErr);
        }
      } catch (e) {
        console.error("pdf upload threw", e);
      }
    }

    const { data: cfgRow } = await supabase
      .from("email_pipeline_config")
      .select("use_studio_transactional")
      .eq("id", 1)
      .maybeSingle();
    const useStudio = cfgRow?.use_studio_transactional !== false;

    let emailSent = false;
    let errMessage: string | null = null;

    if (useStudio) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("id")
        .eq("template_key", "pdf_quote_delivery")
        .maybeSingle();

      if (template?.id) {
        const attachments = pdf
          ? [{
              filename: `ShadeSpace-Quote-${reference}.pdf`,
              content: pdf,
              type: "application/pdf",
            }]
          : [];

        const customerName = [firstName, lastName].filter(Boolean).join(" ") || firstName || "there";

        const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateId: template.id,
            toEmail: email,
            quoteId: resolvedQuoteId,
            attachments,
            contextExtras: {
              first_name: firstName || "",
              last_name: lastName || "",
              customer_name: customerName,
              quote_reference: reference,
              quote_name: quoteName || "Shade Sail Configuration",
              ...(quoteUrl ? { resume_url: quoteUrl } : {}),
              ...(resolvedPricingLockedUntil
                ? {
                    pricing_locked_until: new Date(resolvedPricingLockedUntil).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  }
                : {}),
              canvas_image: resolvedCanvasUrl || "",
              fabric_type: Fabric_Type || "",
              fabric_color: fabricColor || "",
              shade_factor: Shade_Factor ? `${Shade_Factor}%` : "",
              edge_type: Edge_Type || "",
              wire_or_webbing: formatWireValue(Wire_Thickness || Webbing_Edge_Width),
              wire_or_webbing_label: Wire_Thickness ? "Wire Thickness" : Webbing_Edge_Width ? "Webbing Width" : "",
              corners: corners || "",
              area: formatArea(Area),
              perimeter: formatLinear(Perimeter),
              warranty_years: warranty || "15",
              ...(resolvedTotalPrice != null
                ? {
                    price_formatted: `${
                      resolvedCurrency === "NZD"
                        ? "NZ$"
                        : resolvedCurrency === "USD"
                          ? "US$"
                          : resolvedCurrency === "AUD"
                            ? "AU$"
                            : resolvedCurrency || ""
                    }${resolvedTotalPrice.toFixed(2)}`,
                  }
                : {}),
              product_name: (Fabric_Type && fabricColor && corners)
                ? `Custom ${Fabric_Type} Shade Sail - ${fabricColor} - ${corners} Corner`
                : "Custom Shade Sail",
              edge_measurements_html: buildRows("Precise Measurements", backendEdgeMeasurements || edgeMeasurements, (k) => `${k.charAt(0)} \u2192 ${k.charAt(1)}`),
              diagonal_measurements_html: buildRows("Diagonal Measurements", backendDiagonalMeasurements || diagonalMeasurementsObj, (k) => `Diagonal ${k.charAt(0)} \u2192 ${k.charAt(1)}`),
              anchor_measurements_html: buildRows("Anchor Point Heights", backendAnchorMeasurements || anchorPointMeasurements, (k) => `Corner ${k}`),
              corner_hardware_html: buildHardwareRows(cornerHardware, hardwareBreakdown),
            },
          }),
        });

        const sendJson = await sendRes.json().catch(() => null);
        emailSent = sendRes.ok && !!sendJson?.ok;
        if (!emailSent) errMessage = sendJson?.error ? JSON.stringify(sendJson.error) : `HTTP ${sendRes.status}`;
      } else {
        errMessage = "Transactional PDF template missing";
      }
    } else {
      errMessage = "Studio transactional flag disabled";
    }

    try {
      await supabase.from("user_events").insert({
        event_type: "email_pdf_quote",
        event_data: {
          totalPrice,
          currency,
          corners: corners || null,
          fabricType: Fabric_Type || null,
          quoteName: quoteName || null,
          customerName: firstName && lastName ? `${firstName} ${lastName}` : null,
          sent_by: "email_studio",
          emailSent,
          shopifyCustomerCreated,
          quoteReference: reference,
        },
        customer_email: email,
        device_type: "server",
        customer_ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
        success: emailSent,
      });
    } catch (trackError) {
      console.error("Failed to track config email event:", trackError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        message: emailSent
          ? `Configuration email sent to ${email}`
          : errMessage || "Email service not configured, but event tracked",
        shopifyCustomerCreated,
        shopifyCustomerId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-config-email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildRows(title: string, source: Record<string, any> | undefined, labelFn: (k: string) => string): string {
  if (!source || Object.keys(source).length === 0) return "";
  let rows = "";
  for (const [key, value] of Object.entries(source)) {
    const display = typeof value === "string" ? value : (value as any)?.formatted ?? String(value);
    rows += `<tr><td style="color:#307C31;padding:6px 0;font-weight:bold;font-size:14px;">${labelFn(key)}</td><td style="color:#01312D;font-weight:600;padding:6px 0;text-align:right;font-size:14px;">${display}</td></tr>`;
  }
  return `<div style="padding:0 30px 20px 30px;"><h3 style="color:#01312D;margin:0 0 12px 0;font-size:16px;border-bottom:2px solid #BFF102;padding-bottom:6px;">${title}</h3><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></div>`;
}

function formatArea(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") return `${value.toFixed(2)} m\u00B2`;
  const s = String(value).trim();
  if (!s) return "";
  if (/[a-z\u00B2"']/i.test(s)) return s;
  const n = Number(s);
  return Number.isFinite(n) ? `${n.toFixed(2)} m\u00B2` : s;
}

function formatLinear(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (value < 50) return `${value.toFixed(2)} m`;
    return `${Math.round(value)} mm`;
  }
  const s = String(value).trim();
  if (!s) return "";
  if (/[a-z"']/i.test(s)) return s;
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  if (n < 50) return `${n.toFixed(2)} m`;
  return `${Math.round(n)} mm`;
}

function formatWireValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") return `${value}mm`;
  const s = String(value).trim();
  if (!s) return "";
  if (/[a-z"']/i.test(s)) return s;
  const n = Number(s);
  return Number.isFinite(n) ? `${n}mm` : s;
}

function buildHardwareRows(cornerHardware: any, hardwareBreakdown: any): string {
  const lines: Array<{ label: string; value: string }> = [];

  if (cornerHardware && typeof cornerHardware === "object") {
    const entries = Array.isArray(cornerHardware)
      ? cornerHardware.map((items, idx) => [String.fromCharCode(65 + idx), items] as [string, any])
      : Object.entries(cornerHardware);
    for (const [cornerKey, items] of entries) {
      if (!Array.isArray(items) || items.length === 0) continue;
      const parts = items
        .filter((it: any) => it && (it.name || it.sku))
        .map((it: any) => {
          const name = it.name || it.sku || "Hardware";
          const qty = Number(it.qty || it.quantity || 1);
          return qty > 1 ? `${name} \u00D7${qty}` : name;
        });
      if (parts.length > 0) {
        lines.push({ label: `Corner ${cornerKey}`, value: parts.join(", ") });
      }
    }
  }

  if (lines.length === 0 && Array.isArray(hardwareBreakdown)) {
    for (const item of hardwareBreakdown) {
      if (!item) continue;
      const name = item.name || item.sku;
      if (!name) continue;
      const qty = Number(item.qty || item.quantity || 1);
      lines.push({ label: name, value: qty > 1 ? `\u00D7${qty}` : "\u00D71" });
    }
  }

  if (lines.length === 0) return "";

  let rows = "";
  for (const { label, value } of lines) {
    rows += `<tr><td style="color:#307C31;padding:6px 0;font-weight:bold;font-size:14px;vertical-align:top;">${label}</td><td style="color:#01312D;font-weight:600;padding:6px 0;text-align:right;font-size:14px;vertical-align:top;">${value}</td></tr>`;
  }
  return `<div style="padding:0 30px 20px 30px;"><h3 style="color:#01312D;margin:0 0 12px 0;font-size:16px;border-bottom:2px solid #BFF102;padding-bottom:6px;">Corner Hardware</h3><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></div>`;
}
