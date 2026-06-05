import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  delay_minutes: number;
  template_id: string;
  sender_id: string;
  max_sends_per_quote: number;
  max_sends_per_email: number | null;
  cooldown_days: number | null;
  suppress_if_purchased: boolean;
  suppression_window_hours: number | null;
  is_active: boolean;
}

interface Condition {
  field: string;
  operator: string;
  value: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let dryRun = false;
    let automationIdFilter: string | null = null;
    try {
      const body = await req.json();
      dryRun = body.dryRun === true;
      automationIdFilter = body.automationId || null;
    } catch {
      // empty body is fine
    }

    // Fetch active automations (or a specific one for dry-run)
    let automationsQuery = supabase
      .from("email_automations")
      .select("*")
      .eq("is_active", true);

    if (automationIdFilter) {
      automationsQuery = supabase
        .from("email_automations")
        .select("*")
        .eq("id", automationIdFilter);
    }

    const { data: automations, error: autoErr } = await automationsQuery;
    if (autoErr) throw autoErr;
    if (!automations || automations.length === 0) {
      return jsonResponse({ enqueued: 0, skipped: 0, automations_checked: 0 });
    }

    // Fetch conditions for all automations
    const autoIds = automations.map((a: Automation) => a.id);
    const { data: allConditions } = await supabase
      .from("email_automation_conditions")
      .select("*")
      .in("automation_id", autoIds);

    // Fetch unsubscribes
    const { data: unsubscribes } = await supabase
      .from("email_unsubscribes")
      .select("email");
    const unsubSet = new Set(
      (unsubscribes || []).map((u: { email: string }) => u.email.toLowerCase())
    );

    // Fetch suppressed customers
    const { data: suppressedRows } = await supabase
      .from("email_suppressed_customers")
      .select("email, quote_id, suppressed_at");

    // Global suppression window default
    const { data: pipelineCfg } = await supabase
      .from("email_pipeline_config")
      .select("suppression_window_hours_default")
      .eq("id", 1)
      .maybeSingle();
    const globalWindowHours = pipelineCfg?.suppression_window_hours_default ?? 24;

    let totalEnqueued = 0;
    let totalSkipped = 0;
    const dryRunResults: Array<{
      automation: string;
      candidates: number;
      eligible: number;
    }> = [];

    for (const automation of automations as Automation[]) {
      const conditions: Condition[] = (allConditions || []).filter(
        (c: { automation_id: string }) => c.automation_id === automation.id
      );

      // Check linked template is active
      if (automation.template_id) {
        const { data: tpl } = await supabase
          .from("email_templates")
          .select("is_active")
          .eq("id", automation.template_id)
          .maybeSingle();
        if (tpl && !tpl.is_active) continue;
      }

      const candidates = await findCandidateQuotes(
        supabase,
        automation,
        conditions
      );

      let eligible = 0;
      for (const quote of candidates) {
        if (!quote.customer_email) continue;
        const email = quote.customer_email.toLowerCase();

        // Skip unsubscribed
        if (unsubSet.has(email)) continue;

        // Skip excluded IPs
        if (quote.is_excluded) continue;

        // Skip if no marketing opt-in (for non-transactional)
        if (!quote.marketing_opt_in) continue;

        // Check purchase suppression with time-window logic
        if (automation.suppress_if_purchased) {
          const windowHours =
            automation.suppression_window_hours ?? globalWindowHours;
          if (
            isSupressedByPurchase(
              suppressedRows || [],
              email,
              quote,
              windowHours
            )
          ) {
            continue;
          }
        }

        // Check max_sends_per_quote
        const { count: quoteSendCount } = await supabase
          .from("email_queue")
          .select("id", { count: "exact", head: true })
          .eq("automation_id", automation.id)
          .eq("quote_id", quote.id)
          .in("status", ["pending", "sending", "sent"]);
        if ((quoteSendCount ?? 0) >= automation.max_sends_per_quote) continue;

        // Check max_sends_per_email
        if (automation.max_sends_per_email) {
          const { count: emailSendCount } = await supabase
            .from("email_queue")
            .select("id", { count: "exact", head: true })
            .eq("automation_id", automation.id)
            .eq("recipient_email", email)
            .in("status", ["pending", "sending", "sent"]);
          if ((emailSendCount ?? 0) >= automation.max_sends_per_email) continue;
        }

        // Check cooldown_days
        if (automation.cooldown_days) {
          const cooldownCutoff = new Date(
            Date.now() - automation.cooldown_days * 86400000
          ).toISOString();
          const { count: recentCount } = await supabase
            .from("email_queue")
            .select("id", { count: "exact", head: true })
            .eq("recipient_email", email)
            .in("status", ["sent", "sending", "pending"])
            .gte("scheduled_at", cooldownCutoff);
          if ((recentCount ?? 0) > 0) continue;
        }

        eligible++;

        if (!dryRun) {
          await supabase.from("email_queue").insert({
            automation_id: automation.id,
            template_id: automation.template_id,
            sender_id: automation.sender_id,
            quote_id: quote.id,
            recipient_email: email,
            scheduled_at: new Date().toISOString(),
            status: "pending",
          });
          totalEnqueued++;
        }
      }

      totalSkipped += candidates.length - eligible;
      if (dryRun) {
        dryRunResults.push({
          automation: automation.name,
          candidates: candidates.length,
          eligible,
        });
      }
    }

    if (dryRun) {
      return jsonResponse({
        dryRun: true,
        results: dryRunResults,
        total_eligible: dryRunResults.reduce((s, r) => s + r.eligible, 0),
      });
    }

    return jsonResponse({
      enqueued: totalEnqueued,
      skipped: totalSkipped,
      automations_checked: automations.length,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});

async function findCandidateQuotes(
  supabase: ReturnType<typeof createClient>,
  automation: Automation,
  conditions: Condition[]
) {
  const now = Date.now();
  const delayMs = automation.delay_minutes * 60 * 1000;
  const cutoff = new Date(now - delayMs).toISOString();
  // Only look back 14 days max to avoid processing ancient quotes
  const lookback = new Date(now - 14 * 86400000).toISOString();

  let query = supabase
    .from("saved_quotes")
    .select(
      "id, customer_email, current_step, status, created_at, updated_at, is_excluded, marketing_opt_in, config_data"
    )
    .not("customer_email", "is", null)
    .gte("updated_at", lookback)
    .lte("updated_at", cutoff)
    .gte("created_at", lookback);

  // Apply trigger-specific filters
  if (automation.trigger_type === "quote_reached_step") {
    const step = automation.trigger_config.step as number;
    query = query.eq("current_step", step);
    if (automation.trigger_config.status) {
      query = query.eq("status", automation.trigger_config.status as string);
    }
  } else if (automation.trigger_type === "pdf_downloaded") {
    query = query.not("pdf_path", "is", null);
  }

  // Apply additional conditions
  for (const cond of conditions) {
    switch (cond.operator) {
      case "eq":
        query = query.eq(cond.field, cond.value);
        break;
      case "neq":
        query = query.neq(cond.field, cond.value);
        break;
      case "gte":
        query = query.gte(cond.field, cond.value);
        break;
      case "lte":
        query = query.lte(cond.field, cond.value);
        break;
      case "contains":
        query = query.ilike(cond.field, `%${cond.value}%`);
        break;
    }
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data || [];
}

function isSupressedByPurchase(
  suppressedRows: Array<{
    email: string;
    quote_id: string | null;
    suppressed_at: string;
  }>,
  email: string,
  quote: { id: string; created_at: string },
  windowHours: number
): boolean {
  const matchingSuppressions = suppressedRows.filter(
    (s) => s.email.toLowerCase() === email
  );
  if (matchingSuppressions.length === 0) return false;

  for (const suppression of matchingSuppressions) {
    // Direct match: this exact quote was purchased
    if (suppression.quote_id === quote.id) return true;

    // Time-window match: another quote from same email was purchased
    // Suppress if the candidate quote was created within windowHours of the suppression
    if (suppression.quote_id !== null) {
      const suppressedAt = new Date(suppression.suppressed_at).getTime();
      const quoteCreatedAt = new Date(quote.created_at).getTime();
      const windowMs = windowHours * 3600000;
      // If the quote was created within the window of the purchase, suppress it
      if (Math.abs(quoteCreatedAt - suppressedAt) <= windowMs) {
        return true;
      }
    }

    // Blanket suppression (quote_id is null) -- suppress everything
    if (suppression.quote_id === null) return true;
  }

  return false;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
