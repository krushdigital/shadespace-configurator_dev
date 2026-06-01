import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BATCH_SIZE = 20;
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Recover stale "sending" items (stuck for > 10 min without a resend ID)
    const staleCutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
    await supabase
      .from("email_queue")
      .update({ status: "pending" })
      .eq("status", "sending")
      .is("resend_message_id", null)
      .lt("scheduled_at", staleCutoff);

    // 2. Skip queue items whose automation or template is paused
    const { data: pausedAutomations } = await supabase
      .from("email_automations")
      .select("id")
      .eq("is_active", false);
    const pausedAutoIds = (pausedAutomations || []).map(
      (a: { id: string }) => a.id
    );

    if (pausedAutoIds.length > 0) {
      await supabase
        .from("email_queue")
        .update({ status: "skipped" })
        .in("automation_id", pausedAutoIds)
        .in("status", ["pending", "sending"]);
    }

    // Also skip items whose template is inactive
    const { data: pausedTemplates } = await supabase
      .from("email_templates")
      .select("id")
      .eq("is_active", false);
    const pausedTplIds = (pausedTemplates || []).map(
      (t: { id: string }) => t.id
    );

    if (pausedTplIds.length > 0) {
      await supabase
        .from("email_queue")
        .update({ status: "skipped" })
        .in("template_id", pausedTplIds)
        .in("status", ["pending", "sending"]);
    }

    // 3. Fetch pending items ready to send
    const { data: pendingItems, error: fetchErr } = await supabase
      .from("email_queue")
      .select(
        "id, automation_id, template_id, sender_id, quote_id, recipient_email, subject_snapshot, html_snapshot"
      )
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;
    if (!pendingItems || pendingItems.length === 0) {
      return jsonResponse({ sent: 0, failed: 0, pending_count: 0 });
    }

    // Mark batch as "sending"
    const batchIds = pendingItems.map((i: { id: string }) => i.id);
    await supabase
      .from("email_queue")
      .update({ status: "sending" })
      .in("id", batchIds);

    // Load templates and senders for rendering
    const templateIds = [
      ...new Set(pendingItems.map((i: { template_id: string }) => i.template_id).filter(Boolean)),
    ];
    const senderIds = [
      ...new Set(pendingItems.map((i: { sender_id: string }) => i.sender_id).filter(Boolean)),
    ];

    const [{ data: templates }, { data: senders }] = await Promise.all([
      supabase
        .from("email_templates")
        .select("id, subject, html_body")
        .in("id", templateIds),
      supabase
        .from("email_senders")
        .select("id, from_name, from_email, reply_to")
        .in("id", senderIds),
    ]);

    const tplMap = new Map(
      (templates || []).map((t: { id: string }) => [t.id, t])
    );
    const senderMap = new Map(
      (senders || []).map((s: { id: string }) => [s.id, s])
    );

    let sent = 0;
    let failed = 0;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    for (const item of pendingItems) {
      try {
        const template = tplMap.get(item.template_id) as {
          subject: string;
          html_body: string;
        } | undefined;
        const sender = senderMap.get(item.sender_id) as {
          from_name: string;
          from_email: string;
          reply_to: string | null;
        } | undefined;

        if (!template || !sender) {
          await supabase
            .from("email_queue")
            .update({ status: "failed", error: "Missing template or sender" })
            .eq("id", item.id);
          failed++;
          continue;
        }

        // Render template with quote data
        let subject = item.subject_snapshot || template.subject;
        let html = item.html_snapshot || template.html_body;

        // If no snapshot, fetch quote data for variable substitution
        if (!item.subject_snapshot && item.quote_id) {
          const { data: quote } = await supabase
            .from("saved_quotes")
            .select(
              "quote_reference, customer_first_name, customer_last_name, customer_email, quote_name, config_data, access_token"
            )
            .eq("id", item.quote_id)
            .maybeSingle();

          if (quote) {
            const vars: Record<string, string> = {
              "{{first_name}}": quote.customer_first_name || "",
              "{{last_name}}": quote.customer_last_name || "",
              "{{email}}": quote.customer_email || "",
              "{{quote_reference}}": quote.quote_reference || "",
              "{{quote_name}}": quote.quote_name || "",
              "{{access_token}}": quote.access_token || "",
            };
            for (const [key, val] of Object.entries(vars)) {
              subject = subject.replaceAll(key, val);
              html = html.replaceAll(key, val);
            }
          }
        }

        // Build unsubscribe link
        const unsubLink = `${Deno.env.get("SUPABASE_URL")}/functions/v1/email-unsubscribe?email=${encodeURIComponent(item.recipient_email)}`;
        html = html.replaceAll("{{unsubscribe_url}}", unsubLink);

        // Send via Resend
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${sender.from_name} <${sender.from_email}>`,
            to: [item.recipient_email],
            reply_to: sender.reply_to || undefined,
            subject,
            html,
            headers: {
              "List-Unsubscribe": `<${unsubLink}>`,
            },
          }),
        });

        if (!resendRes.ok) {
          const errBody = await resendRes.text();
          await supabase
            .from("email_queue")
            .update({
              status: "failed",
              error: `Resend ${resendRes.status}: ${errBody}`,
            })
            .eq("id", item.id);

          // Log to failures table
          await supabase.from("email_send_failures").insert({
            queue_id: item.id,
            recipient_email: item.recipient_email,
            error_code: String(resendRes.status),
            error_message: errBody,
            automation_id: item.automation_id,
          });
          failed++;
          continue;
        }

        const resendData = await resendRes.json();

        await supabase
          .from("email_queue")
          .update({
            status: "sent",
            resend_message_id: resendData.id,
            sent_at: new Date().toISOString(),
            subject_snapshot: subject,
            html_snapshot: html,
          })
          .eq("id", item.id);

        // Log sent event
        await supabase.from("email_events").insert({
          queue_id: item.id,
          event_type: "sent",
          occurred_at: new Date().toISOString(),
        });

        sent++;
      } catch (itemErr) {
        await supabase
          .from("email_queue")
          .update({
            status: "failed",
            error: itemErr instanceof Error ? itemErr.message : String(itemErr),
          })
          .eq("id", item.id);
        failed++;
      }
    }

    // Count remaining pending
    const { count: remainingPending } = await supabase
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    return jsonResponse({
      sent,
      failed,
      pending_count: remainingPending ?? 0,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
