import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  NZD: "NZ$",
  USD: "US$",
  AUD: "AU$",
  GBP: "\u00A3",
  EUR: "\u20AC",
  CAD: "CA$",
};

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${Number(amount).toFixed(2)}`;
}

function buildEdgeMeasurementsHTML(
  edgeMeasurements: Record<string, { formatted: string }> | undefined,
  backendEdgeMeasurements: Record<string, string> | undefined
): string {
  const source = backendEdgeMeasurements || edgeMeasurements;
  if (!source || Object.keys(source).length === 0) return "";

  let rows = "";
  for (const [key, value] of Object.entries(source)) {
    const label = `${key.charAt(0)} → ${key.charAt(1)}`;
    const display = typeof value === "string" ? value : (value as any).formatted || String(value);
    rows += `<tr>
      <td style="color: #307C31; padding: 6px 0; font-weight: bold; font-size: 14px;">${label}</td>
      <td style="color: #01312D; font-weight: 600; padding: 6px 0; text-align: right; font-size: 14px;">${display}</td>
    </tr>`;
  }

  return `<tr><td style="padding: 0 30px 20px 30px;">
    <h3 style="color: #01312D; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #BFF102; padding-bottom: 6px;">Precise Measurements</h3>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>`;
}

function buildDiagonalMeasurementsHTML(
  diagonalMeasurementsObj: Record<string, { formatted: string }> | undefined,
  backendDiagonalMeasurements: Record<string, string> | undefined
): string {
  const source = backendDiagonalMeasurements || diagonalMeasurementsObj;
  if (!source || Object.keys(source).length === 0) return "";

  let rows = "";
  for (const [key, value] of Object.entries(source)) {
    const label = `Diagonal ${key.charAt(0)} → ${key.charAt(1)}`;
    const display = typeof value === "string" ? value : (value as any).formatted || String(value);
    rows += `<tr>
      <td style="color: #307C31; padding: 6px 0; font-weight: bold; font-size: 14px;">${label}</td>
      <td style="color: #01312D; font-weight: 600; padding: 6px 0; text-align: right; font-size: 14px;">${display}</td>
    </tr>`;
  }

  return `<tr><td style="padding: 0 30px 20px 30px;">
    <h3 style="color: #01312D; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #BFF102; padding-bottom: 6px;">Diagonal Measurements</h3>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>`;
}

function buildAnchorMeasurementsHTML(
  anchorPointMeasurements: Record<string, { formatted: string }> | undefined,
  backendAnchorMeasurements: Record<string, string> | undefined
): string {
  const source = backendAnchorMeasurements || anchorPointMeasurements;
  if (!source || Object.keys(source).length === 0) return "";

  let rows = "";
  for (const [key, value] of Object.entries(source)) {
    const label = `Corner ${key}`;
    const display = typeof value === "string" ? value : (value as any).formatted || String(value);
    rows += `<tr>
      <td style="color: #307C31; padding: 6px 0; font-weight: bold; font-size: 14px;">${label}</td>
      <td style="color: #01312D; font-weight: 600; padding: 6px 0; text-align: right; font-size: 14px;">${display}</td>
    </tr>`;
  }

  return `<tr><td style="padding: 0 30px 20px 30px;">
    <h3 style="color: #01312D; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #BFF102; padding-bottom: 6px;">Anchor Point Heights</h3>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>`;
}

function generateConfigEmailHTML(data: any): string {
  const {
    firstName,
    lastName,
    email,
    currency,
    totalPrice,
    selectedFabric,
    selectedColor,
    corners,
    Fabric_Type,
    Shade_Factor,
    Edge_Type,
    Wire_Thickness,
    Webbing_Edge_Width,
    Area,
    Perimeter,
    canvasImage,
    quoteName,
    customerReference,
    quoteUrl,
    warranty,
    edgeMeasurements,
    diagonalMeasurementsObj,
    anchorPointMeasurements,
    backendEdgeMeasurements,
    backendDiagonalMeasurements,
    backendAnchorMeasurements,
    quoteReference,
    pricingLockedUntil,
  } = data;

  const customerName =
    firstName && lastName ? `${firstName} ${lastName}` : firstName || "there";
  const formattedPrice = formatPrice(totalPrice, currency);
  const fabricLabel = Fabric_Type || selectedFabric?.label || "N/A";
  const colorName = selectedColor?.name || data.fabricColor || "N/A";
  const shadeFactor = Shade_Factor || selectedColor?.shadeFactor || "";
  const edgeType = Edge_Type || "N/A";
  const wireThickness = Wire_Thickness || "";
  const webbingWidth = Webbing_Edge_Width || "";
  const warrantyYears = warranty || selectedFabric?.warrantyYears || "15";
  const areaDisplay = Area || "N/A";
  const perimeterDisplay = Perimeter || "N/A";
  const reference = quoteReference || `SS-${Date.now()}`;

  const lockedDate = pricingLockedUntil
    ? new Date(pricingLockedUntil).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const edgeMeasurementsHTML = buildEdgeMeasurementsHTML(edgeMeasurements, backendEdgeMeasurements);
  const diagonalHTML = buildDiagonalMeasurementsHTML(diagonalMeasurementsObj, backendDiagonalMeasurements);
  const anchorHTML = buildAnchorMeasurementsHTML(anchorPointMeasurements, backendAnchorMeasurements);

  const wireOrWebbingRow =
    wireThickness && wireThickness !== "N/A"
      ? `<tr>
          <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Wire Thickness</td>
          <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${wireThickness}</td>
        </tr>`
      : webbingWidth && webbingWidth !== "N/A"
      ? `<tr>
          <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Webbing Width</td>
          <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${webbingWidth}</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ShadeSpace Shade Sail Configuration</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica', Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0;">
    <!-- Logo Header -->
    <tr>
      <td style="background-color: #01312D; padding: 24px 20px; text-align: center;">
        <img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-white_3x_db41a610-bfc6-4f61-bb82-b95e27cd58d8.png?v=1728339549" alt="ShadeSpace" style="height: 40px; width: auto;" />
      </td>
    </tr>

    <!-- Green Banner -->
    <tr>
      <td style="background-color: #307C31; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Your Quote Summary</h1>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding: 30px 30px 15px 30px;">
        <p style="color: #01312D; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Hello, ${customerName}</p>
        <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.7;">
          Thank you for configuring your custom shade sail with ShadeSpace. Here is your quote summary and a detailed PDF is attached to this email for your records. You can access your quote anytime using the link below.
        </p>
      </td>
    </tr>

    <!-- Reference Card -->
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <div style="border: 2px solid #BFF102; border-radius: 10px; padding: 24px; text-align: center; background-color: #FAFFF0;">
          <div style="color: #64748B; font-size: 12px; margin-bottom: 4px;">Quote Name</div>
          <div style="color: #01312D; font-size: 18px; font-weight: bold; margin-bottom: 16px;">${quoteName || "Shade Sail Configuration"}</div>
          <div style="color: #01312D; font-size: 14px; font-weight: bold; margin-bottom: 4px;">Quote Reference</div>
          <div style="color: #307C31; font-size: 22px; font-weight: bold; font-family: 'Courier New', monospace; margin-bottom: 16px;">${reference}</div>
          ${customerReference ? `<div style="color: #64748B; font-size: 12px; margin-bottom: 4px;">Customer Reference</div>
          <div style="color: #01312D; font-size: 16px; font-weight: bold; margin-bottom: 16px;">${customerReference}</div>` : ""}
          ${lockedDate ? `<div style="color: #64748B; font-size: 12px; margin-bottom: 4px;">Valid Until</div>
          <div style="color: #01312D; font-size: 16px; font-weight: bold;">${lockedDate}</div>` : ""}
        </div>
      </td>
    </tr>

    <!-- CTA Button -->
    ${quoteUrl ? `<tr>
      <td style="padding: 0 30px 15px 30px; text-align: center;">
        <a href="${quoteUrl}" style="display: inline-block; background-color: #BFF102; color: #01312D; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: bold;">Access Your Quote</a>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 25px 30px; text-align: center;">
        <p style="color: #64748B; font-size: 12px; margin: 0 0 4px 0;">Or copy this link:</p>
        <p style="color: #307C31; font-size: 11px; margin: 0; word-break: break-all; font-family: 'Courier New', monospace;">${quoteUrl}</p>
      </td>
    </tr>` : ""}

    <!-- Configuration Summary -->
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <h3 style="color: #01312D; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #BFF102; padding-bottom: 6px;">Configuration Summary</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Fabric Material</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${fabricLabel}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Fabric Color</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${colorName}</td>
          </tr>
          ${shadeFactor ? `<tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Shade Factor</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${shadeFactor}%</td>
          </tr>` : ""}
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Edge Type</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${edgeType}</td>
          </tr>
          ${wireOrWebbingRow}
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Corners</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${corners}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Area</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${areaDisplay}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Perimeter</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${perimeterDisplay}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Warranty</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">${warrantyYears} Years</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 8px 0; font-size: 14px; font-weight: bold;">Your Shade Sail Price</td>
            <td style="color: #307C31; font-weight: bold; padding: 8px 0; text-align: right; font-size: 18px;">${formattedPrice} ${currency}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Edge Measurements -->
    ${edgeMeasurementsHTML}

    <!-- Diagonal Measurements -->
    ${diagonalHTML}

    <!-- Anchor Point Heights -->
    ${anchorHTML}

    <!-- Canvas Preview Image -->
    ${canvasImage ? `<tr>
      <td style="padding: 0 30px 20px 30px;">
        <h3 style="color: #01312D; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #BFF102; padding-bottom: 6px;">Shade Sail Preview</h3>
        <img src="${canvasImage}" alt="Shade Sail Preview" style="width: 100%; max-width: 540px; height: auto; border-radius: 8px; border: 1px solid #E2E8F0;" />
      </td>
    </tr>` : ""}

    <!-- Price Highlight -->
    <tr>
      <td style="padding: 0 30px 25px 30px;">
        <div style="background-color: #01312D; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="color: #ffffff; margin: 0 0 8px 0; font-size: 14px;">All-Inclusive Price to Your Door</p>
          <p style="background-color: #BFF102; color: #01312D; margin: 0; padding: 12px; border-radius: 8px; font-size: 24px; font-weight: bold;">
            ${formattedPrice} ${currency}
          </p>
          <ul style="color: #ffffff; margin: 12px 0 0 0; padding: 0; list-style: none; font-size: 11px; line-height: 1.8;">
            <li>&#10003; Express freight to your door included</li>
            <li>&#10003; All taxes &amp; duties included</li>
            <li>&#10003; No hidden costs or tariffs</li>
            <li>&#10003; Price locked for 30 days from configuration date</li>
          </ul>
        </div>
      </td>
    </tr>

    <!-- PDF Attachment Note -->
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; text-align: center;">
          <p style="color: #166534; font-size: 13px; margin: 0; font-weight: 600;">
            &#128206; A detailed PDF of your shade sail configuration is attached to this email.
          </p>
        </div>
      </td>
    </tr>

    <!-- Next Steps -->
    <tr>
      <td style="padding: 0 30px 25px 30px;">
        <div style="border-left: 4px solid #BFF102; background-color: #FAFFF0; border-radius: 0 8px 8px 0; padding: 16px 20px;">
          <h3 style="color: #01312D; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Next Steps</h3>
          <ul style="color: #334155; margin: 0; padding: 0 0 0 18px; font-size: 13px; line-height: 2;">
            <li>Your quote is valid for 30 days</li>
            <li>Use the link above to access and modify your quote</li>
            <li>Contact us if you have any questions</li>
            <li>Ready to proceed? Click the link to complete your purchase</li>
          </ul>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 13px; margin: 0 0 6px 0;">
          Thank you for choosing <strong>ShadeSpace</strong> for your custom shade solution.
        </p>
        <p style="color: #64748B; font-size: 12px; margin: 0;">
          Need help? Contact us at <a href="mailto:sails@shadespace.com" style="color: #307C31; text-decoration: underline;">sails@shadespace.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await req.json();
    const { email, pdf, currency, totalPrice, firstName, lastName, quoteName, quoteId, accessToken } = data;
    let { quoteUrl } = data;

    const supabaseUrlEnv = Deno.env.get("SUPABASE_URL") || "";
    // Ensure every outbound link routes through the canonical redirect so it
    // works on every regional Shopify domain (.com, .com.au, .co.uk, .ca, ...)
    if (!quoteUrl && quoteId && accessToken && supabaseUrlEnv) {
      const params = new URLSearchParams({
        id: quoteId,
        token: accessToken,
        src: "email",
      });
      quoteUrl = `${supabaseUrlEnv}/functions/v1/quote-redirect?${params.toString()}`;
    }

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email address is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    let shopifyCustomerId: string | null = null;
    let shopifyCustomerCreated = false;

    if (supabaseUrl && supabaseKey) {
      try {
        const shopifyResponse = await fetch(
          `${supabaseUrl}/functions/v1/add-shopify-customer`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
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

        const shopifyData = await shopifyResponse.json();
        if (shopifyData.success) {
          shopifyCustomerId = shopifyData.customer.id;
          shopifyCustomerCreated = shopifyData.customer.isNew;
        }
      } catch (shopifyError) {
        console.error("Failed to add customer to Shopify:", shopifyError);
      }
    }

    const emailHTML = generateConfigEmailHTML(data);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL =
      Deno.env.get("FROM_EMAIL") || "ShadeSpace <sails@shadespace.com>";

    let emailSent = false;
    const reference = data.quoteReference || `SS-${Date.now()}`;

    if (RESEND_API_KEY) {
      const emailPayload: any = {
        from: FROM_EMAIL,
        to: [email],
        subject: `Your ShadeSpace Quote Summary - ${reference} (PDF Attached)`,
        html: emailHTML,
      };

      if (pdf) {
        let pdfContent = pdf;
        if (pdfContent.startsWith("data:")) {
          pdfContent = pdfContent.split(",")[1];
        }

        emailPayload.attachments = [
          {
            filename: `ShadeSpace-Configuration-${reference}.pdf`,
            content: pdfContent,
            type: "application/pdf",
          },
        ];
      }

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (resendResponse.ok) {
        emailSent = true;
        console.log("Config email with PDF sent successfully to:", email);
      } else {
        const errText = await resendResponse.text();
        console.error("Resend API error:", resendResponse.status, errText);
      }
    } else {
      console.warn("RESEND_API_KEY not configured. Email not sent.");
    }

    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("npm:@supabase/supabase-js@2");
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.from("user_events").insert({
          event_type: "email_pdf_quote",
          event_data: {
            totalPrice,
            currency,
            corners: data.corners || null,
            fabricType: data.Fabric_Type || null,
            quoteName: quoteName || null,
            customerReference: data.customerReference || null,
            customerName:
              firstName && lastName ? `${firstName} ${lastName}` : null,
            sent_by: "edge_function",
            emailSent,
            shopifyCustomerCreated,
            quoteReference: reference,
          },
          customer_email: email,
          device_type: "server",
          customer_ip:
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            null,
          user_agent: req.headers.get("user-agent") || null,
          success: emailSent,
        });
      } catch (trackError) {
        console.error("Failed to track config email event:", trackError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        message: emailSent
          ? `Configuration email sent to ${email}`
          : "Email service not configured, but event tracked",
        shopifyCustomerCreated,
        shopifyCustomerId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-config-email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
