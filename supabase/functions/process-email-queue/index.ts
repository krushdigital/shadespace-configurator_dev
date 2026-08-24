import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BATCH_SIZE = 20;
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes (reduced from 10)
const RESEND_TIMEOUT_MS = 15_000; // 15-second timeout per Resend API call

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Recover stale "sending" items (stuck without a resend ID)
    const staleCutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
    const { data: staleItems } = await supabase
      .from("email_queue")
      .update({ status: "pending" })
      .eq("status", "sending")
      .is("resend_message_id", null)
      .lt("scheduled_at", staleCutoff)
      .select("id");
    const recoveredCount = staleItems?.length ?? 0;

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
      return jsonResponse({ sent: 0, failed: 0, recovered: recoveredCount, pending_count: 0 });
    }

    // Mark batch as "sending" one-by-one so a crash doesn't strand the whole batch
    // (We still mark them up-front so another concurrent invocation doesn't double-pick them)
    const batchIds = pendingItems.map((i: { id: string }) => i.id);
    await supabase
      .from("email_queue")
      .update({ status: "sending" })
      .in("id", batchIds);

    // Pre-load templates and senders for the batch
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
        .select("id, from_name, from_email, reply_to, first_name")
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
          first_name: string | null;
        } | undefined;

        if (!template || !sender) {
          await markFailed(supabase, item.id, "Missing template or sender");
          failed++;
          continue;
        }

        if (!resendApiKey) {
          await markFailed(supabase, item.id, "RESEND_API_KEY not configured");
          failed++;
          continue;
        }

        // Render template with quote data
        let subject = item.subject_snapshot || template.subject;
        let html = item.html_snapshot || template.html_body;

        if (!item.subject_snapshot && item.quote_id) {
          const { data: quote } = await supabase
            .from("saved_quotes")
            .select(
              "quote_reference, customer_first_name, customer_last_name, customer_email, quote_name, config_data, calculations_data, access_token, locked_total"
            )
            .eq("id", item.quote_id)
            .maybeSingle();

          if (quote) {
            const quoteCurrency = quote.config_data?.currency || "AUD";
            let domain = "www.shadespace.com.au";
            if (quoteCurrency !== "AUD" && quoteCurrency !== "NZD") {
              domain = "www.shadespace.com";
            }
            const directUrl = `https://${domain}/pages/custom-shade-sail-designer?quote=${encodeURIComponent(item.quote_id)}&token=${encodeURIComponent(quote.access_token)}&_ab=0&_fd=0#quote=${encodeURIComponent(item.quote_id)}&token=${encodeURIComponent(quote.access_token)}`;
            const sbUrl = Deno.env.get("SUPABASE_URL");
            const resumeUrl = `${sbUrl}/functions/v1/track-click?q=${encodeURIComponent(item.id)}&u=${encodeURIComponent(directUrl)}`;

            const cfg = quote.config_data || {};
            const calc = quote.calculations_data || {};
            const corners = String(cfg.corners || cfg.numCorners || "");
            const price = quote.locked_total
              ? String(quote.locked_total)
              : calc.totalPrice
                ? String(calc.totalPrice)
                : "";
            const currency = cfg.currency || "AUD";
            const area = calc.area ? String(calc.area) : "";

            const vars: Record<string, string> = {
              "{{first_name}}": quote.customer_first_name || "",
              "{{last_name}}": quote.customer_last_name || "",
              "{{email}}": quote.customer_email || "",
              "{{quote_reference}}": quote.quote_reference || "",
              "{{quote_name}}": quote.quote_name || "",
              "{{access_token}}": quote.access_token || "",
              "{{resume_url}}": resumeUrl,
              "{{sender_first_name}}": sender.first_name || sender.from_name.split(" ")[0] || "",
              "{{fabric_type}}": cfg.fabricType || "",
              "{{fabric_color}}": cfg.fabricColor || "",
              "{{corners}}": corners,
              "{{price}}": price,
              "{{currency}}": currency,
              "{{area}}": area,
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

        const senderFirstName = sender.first_name || sender.from_name.split(" ")[0] || "";
        subject = subject.replaceAll("{{sender_first_name}}", senderFirstName);
        html = html.replaceAll("{{sender_first_name}}", senderFirstName);

        // Send via Resend with a timeout to prevent hanging
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

        let resendRes: Response;
        try {
          resendRes = await fetch("https://api.resend.com/emails", {
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
            signal: controller.signal,
          });
        } catch (fetchErr) {
          clearTimeout(timeout);
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          await markFailed(supabase, item.id, `Resend fetch error: ${msg}`, item.recipient_email, item.automation_id);
          failed++;
          continue;
        }
        clearTimeout(timeout);

        if (!resendRes.ok) {
          const errBody = await resendRes.text();
          await markFailed(
            supabase,
            item.id,
            `Resend ${resendRes.status}: ${errBody}`,
            item.recipient_email,
            item.automation_id
          );
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

        await supabase.from("email_events").insert({
          queue_id: item.id,
          event_type: "sent",
          occurred_at: new Date().toISOString(),
        });

        sent++;
      } catch (itemErr) {
        // Catch-all: no matter what goes wrong with this individual item, mark it failed and continue
        const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
        await markFailed(supabase, item.id, msg).catch(() => {});
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
      recovered: recoveredCount,
      pending_count: remainingPending ?? 0,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  queueId: string,
  error: string,
  recipientEmail?: string,
  automationId?: string | null
) {
  await supabase
    .from("email_queue")
    .update({ status: "failed", error })
    .eq("id", queueId);

  if (recipientEmail) {
    await supabase.from("email_send_failures").insert({
      queue_id: queueId,
      recipient_email: recipientEmail,
      error_code: "PROCESS_ERROR",
      error_message: error,
      automation_id: automationId ?? null,
    }).catch(() => {});
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
