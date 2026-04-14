import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateSaveProgressHTML(data: {
  firstName: string;
  lastName: string;
  email: string;
  quoteReference: string;
  quoteName: string;
  quoteUrl: string;
  pricingLockedUntil: string;
}): string {
  const {
    firstName,
    lastName,
    quoteReference,
    quoteName,
    quoteUrl,
    pricingLockedUntil,
  } = data;

  const customerName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || "there";

  const lockedDate = new Date(pricingLockedUntil).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ShadeSpace Configuration</title>
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
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Your Configuration Has Been Saved!</h1>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding: 30px 30px 15px 30px;">
        <p style="color: #01312D; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Hello, ${customerName}</p>
        <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.7;">
          Thank you for saving your custom shade sail configuration with ShadeSpace. Your progress has been saved and you can access it anytime using the link below.
        </p>
      </td>
    </tr>

    <!-- Reference Card -->
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <div style="border: 2px solid #BFF102; border-radius: 10px; padding: 24px; text-align: center; background-color: #FAFFF0;">
          <div style="color: #64748B; font-size: 12px; margin-bottom: 4px;">Configuration Name</div>
          <div style="color: #01312D; font-size: 18px; font-weight: bold; margin-bottom: 16px;">${quoteName}</div>
          <div style="color: #01312D; font-size: 14px; font-weight: bold; margin-bottom: 4px;">Reference</div>
          <div style="color: #307C31; font-size: 22px; font-weight: bold; font-family: 'Courier New', monospace; margin-bottom: 16px;">${quoteReference}</div>
          <div style="color: #64748B; font-size: 12px; margin-bottom: 4px;">Price Locked Until</div>
          <div style="color: #01312D; font-size: 16px; font-weight: bold;">${lockedDate}</div>
        </div>
      </td>
    </tr>

    <!-- CTA Button -->
    <tr>
      <td style="padding: 0 30px 15px 30px; text-align: center;">
        <a href="${quoteUrl}" style="display: inline-block; background-color: #BFF102; color: #01312D; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: bold;">Resume Your Configuration</a>
      </td>
    </tr>

    <!-- Fallback Link -->
    <tr>
      <td style="padding: 0 30px 25px 30px; text-align: center;">
        <p style="color: #64748B; font-size: 12px; margin: 0 0 4px 0;">Or copy this link:</p>
        <p style="color: #307C31; font-size: 11px; margin: 0; word-break: break-all; font-family: 'Courier New', monospace;">${quoteUrl}</p>
      </td>
    </tr>

    <!-- Next Steps -->
    <tr>
      <td style="padding: 0 30px 25px 30px;">
        <div style="border-left: 4px solid #BFF102; background-color: #FAFFF0; border-radius: 0 8px 8px 0; padding: 16px 20px;">
          <h3 style="color: #01312D; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Next Steps</h3>
          <ul style="color: #334155; margin: 0; padding: 0 0 0 18px; font-size: 13px; line-height: 2;">
            <li>Your pricing is locked for 30 days</li>
            <li>Use the link above to resume your configuration</li>
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
    const {
      email,
      firstName,
      lastName,
      quoteReference,
      quoteName,
      quoteUrl,
      pricingLockedUntil,
      expiresAt,
    } = data;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email address is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const lockedUntil = pricingLockedUntil || expiresAt;

    const emailHTML = generateSaveProgressHTML({
      firstName: firstName || "",
      lastName: lastName || "",
      email,
      quoteReference: quoteReference || "N/A",
      quoteName: quoteName || "Shade Sail Configuration",
      quoteUrl: quoteUrl || "https://shadespace.com",
      pricingLockedUntil: lockedUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "ShadeSpace <sails@shadespace.com>";

    let emailSent = false;

    if (RESEND_API_KEY) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: `Your ShadeSpace Configuration - ${quoteReference || "Saved"}`,
          html: emailHTML,
        }),
      });

      if (resendResponse.ok) {
        emailSent = true;
        console.log("Save progress email sent successfully to:", email);
      } else {
        const errText = await resendResponse.text();
        console.error("Resend API error:", resendResponse.status, errText);
      }
    } else {
      console.warn("RESEND_API_KEY not configured. Email not sent.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("npm:@supabase/supabase-js@2");
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.from("user_events").insert({
          event_type: "save_progress_email_sent",
          event_data: {
            quoteReference,
            quoteName,
            emailSent,
            sent_by: "edge_function",
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
        console.error("Failed to track save progress email event:", trackError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        message: emailSent
          ? `Configuration saved email sent to ${email}`
          : "Email service not configured, but event tracked",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-save-progress-email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
