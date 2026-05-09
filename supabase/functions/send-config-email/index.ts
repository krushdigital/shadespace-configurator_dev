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
    } = data;

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

    const reference = quoteReference || `SS-${Date.now()}`;

    let resolvedQuoteId = quoteId || null;
    if (!resolvedQuoteId && quoteReference) {
      const { data: qr } = await supabase
        .from("saved_quotes")
        .select("id")
        .eq("quote_reference", quoteReference)
        .maybeSingle();
      resolvedQuoteId = qr?.id || null;
    }

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
              resume_url: quoteUrl || "https://shadespace.com",
              pricing_locked_until: pricingLockedUntil
                ? new Date(pricingLockedUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                : "",
              canvas_image: resolvedCanvasUrl || "",
              fabric_type: Fabric_Type || "",
              fabric_color: fabricColor || "",
              shade_factor: Shade_Factor ? `${Shade_Factor}%` : "",
              edge_type: Edge_Type || "",
              wire_or_webbing: Wire_Thickness || Webbing_Edge_Width || "",
              wire_or_webbing_label: Wire_Thickness ? "Wire Thickness" : Webbing_Edge_Width ? "Webbing Width" : "",
              corners: corners || "",
              area: Area || "",
              perimeter: Perimeter || "",
              warranty_years: warranty || "15",
              price_formatted: typeof totalPrice === "number"
                ? `${(currency === "NZD" ? "NZ$" : currency === "USD" ? "US$" : currency === "AUD" ? "AU$" : currency || "")}${totalPrice.toFixed(2)}`
                : "",
              product_name: (Fabric_Type && fabricColor && corners)
                ? `Custom ${Fabric_Type} Shade Sail - ${fabricColor} - ${corners} Corner`
                : "Custom Shade Sail",
              edge_measurements_html: buildRows("Precise Measurements", backendEdgeMeasurements || edgeMeasurements, (k) => `${k.charAt(0)} \u2192 ${k.charAt(1)}`),
              diagonal_measurements_html: buildRows("Diagonal Measurements", backendDiagonalMeasurements || diagonalMeasurementsObj, (k) => `Diagonal ${k.charAt(0)} \u2192 ${k.charAt(1)}`),
              anchor_measurements_html: buildRows("Anchor Point Heights", backendAnchorMeasurements || anchorPointMeasurements, (k) => `Corner ${k}`),
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
