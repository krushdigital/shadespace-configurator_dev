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
      firstName,
      lastName,
      quoteReference,
      quoteName,
      quoteUrl,
      pricingLockedUntil,
      expiresAt,
      quoteId,
    } = data;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check feature flag
    const { data: cfgRow } = await supabase
      .from("email_pipeline_config")
      .select("use_studio_transactional")
      .eq("id", 1)
      .maybeSingle();
    const useStudio = cfgRow?.use_studio_transactional !== false;

    let resolvedQuoteId = quoteId || null;
    let resolvedAccessToken: string | null = null;
    if (!resolvedQuoteId && quoteReference) {
      const { data: qr } = await supabase
        .from("saved_quotes")
        .select("id, access_token")
        .eq("quote_reference", quoteReference)
        .maybeSingle();
      resolvedQuoteId = qr?.id || null;
      resolvedAccessToken = qr?.access_token || null;
    }
    if (!resolvedAccessToken && resolvedQuoteId) {
      const { data: qt } = await supabase
        .from("saved_quotes")
        .select("access_token")
        .eq("id", resolvedQuoteId)
        .maybeSingle();
      resolvedAccessToken = qt?.access_token || null;
    }

    if (useStudio) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("id, is_active")
        .eq("template_key", "configuration_saved")
        .maybeSingle();

      if (template && template.is_active === false) {
        return new Response(
          JSON.stringify({ success: true, emailSent: false, skipped: true, reason: "template_inactive" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (template?.id) {
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
            contextExtras: {
              first_name: firstName || "",
              last_name: lastName || "",
              customer_name: [firstName, lastName].filter(Boolean).join(" ") || firstName || "there",
              quote_reference: quoteReference || "",
              quote_name: quoteName || "Shade Sail Configuration",
              ...(quoteUrl ? { resume_url: quoteUrl } : {}),
              pricing_locked_until: pricingLockedUntil || expiresAt
                ? new Date(pricingLockedUntil || expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                : "",
              account_designs_url: resolvedAccessToken && email
                ? `https://shadespace.com.au/apps/shade_space/my-designs?email=${encodeURIComponent(email)}&token=${encodeURIComponent(resolvedAccessToken)}`
                : "https://shadespace.com.au/apps/shade_space/my-designs",
            },
          }),
        });

        const sendJson = await sendRes.json().catch(() => null);
        const emailSent = sendRes.ok && !!sendJson?.ok;

        await supabase.from("user_events").insert({
          event_type: "save_progress_email_sent",
          event_data: { quoteReference, quoteName, emailSent, sent_by: "email_studio" },
          customer_email: email,
          device_type: "server",
          customer_ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          user_agent: req.headers.get("user-agent") || null,
          success: emailSent,
        });

        if (!emailSent) {
          try {
            const reason = sendJson?.reason || sendJson?.error || `HTTP ${sendRes.status}`;
            await supabase.from("email_send_failures").insert({
              recipient_email: email,
              quote_reference: quoteReference || "",
              quote_id: resolvedQuoteId || null,
              template_key: "configuration_saved",
              failure_reason: typeof reason === "string" ? reason : JSON.stringify(reason),
              edge_function: "send-save-progress-email",
            });
          } catch (e) {
            console.error("Failed to log email_send_failure:", e);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            emailSent,
            message: emailSent
              ? `Configuration saved email sent to ${email}`
              : sendJson?.error || "Email Studio did not send",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fallback: legacy direct Resend path (kept for safety if template missing or flag off)
    return new Response(
      JSON.stringify({ success: false, emailSent: false, error: "Transactional template not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
