import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function conditionPasses(row: any, c: any): boolean {
  const path = c.field.split(".");
  let v: any = row;
  for (const p of path) v = v?.[p];
  const val = c.value;
  switch (c.operator) {
    case "eq": return String(v) === val;
    case "neq": return String(v) !== val;
    case "gte": return Number(v) >= Number(val);
    case "lte": return Number(v) <= Number(val);
    case "contains": return String(v || "").toLowerCase().includes(String(val).toLowerCase());
    case "in": return val.split(",").map((s: string) => s.trim()).includes(String(v));
    default: return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(SB_URL, SB_SERVICE);
    const { dryRun = false, automationId = null } = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    let autoQ = supabase.from("email_automations").select("*").eq("is_active", true);
    if (automationId) autoQ = supabase.from("email_automations").select("*").eq("id", automationId);
    const { data: automations } = await autoQ;
    if (!automations) return new Response(JSON.stringify({ enqueued: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let enqueued = 0;
    const report: any[] = [];

    const { data: unsubRows } = await supabase.from("email_unsubscribes").select("email");
    const unsubSet = new Set((unsubRows || []).map((r: any) => String(r.email).toLowerCase()));

    for (const a of automations) {
      if (a.template_id) {
        const { data: tpl } = await supabase
          .from("email_templates")
          .select("is_active")
          .eq("id", a.template_id)
          .maybeSingle();
        if (tpl && tpl.is_active === false) continue;
      }

      const { data: conds } = await supabase.from("email_automation_conditions").select("*").eq("automation_id", a.id);

      let candidates: any[] = [];
      const cfg = a.trigger_config || {};

      if (a.trigger_type === "quote_saved" || a.trigger_type === "quote_reached_step") {
        let q = supabase.from("saved_quotes").select("*").not("customer_email", "is", null);
        if (a.respect_exclusions) q = q.eq("is_excluded", false);
        if (cfg.step !== undefined) q = q.eq("current_step", cfg.step);
        if (cfg.status) q = q.eq("status", cfg.status);
        const cutoff = new Date(Date.now() - a.delay_minutes * 60000).toISOString();
        q = q.lte("updated_at", cutoff).gte("updated_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());
        const { data } = await q.limit(500);
        candidates = data || [];
      } else if (a.trigger_type === "pdf_downloaded") {
        const hours = cfg.hours_since || 48;
        const start = new Date(Date.now() - hours * 3600000 - 3600000).toISOString();
        const end = new Date(Date.now() - hours * 3600000).toISOString();
        const { data: events } = await supabase.from("user_events")
          .select("quote_id, customer_email")
          .eq("event_type", "pdf_download")
          .gte("created_at", start).lte("created_at", end);
        const quoteIds = (events || []).map((e: any) => e.quote_id).filter(Boolean);
        if (quoteIds.length) {
          let q = supabase.from("saved_quotes").select("*").in("id", quoteIds);
          if (a.respect_exclusions) q = q.eq("is_excluded", false);
          const { data } = await q;
          candidates = data || [];
        }
      }

      for (const row of candidates) {
        if ((conds || []).some((c: any) => !conditionPasses(row, c))) continue;
        if (!row.customer_email) continue;
        if (unsubSet.has(String(row.customer_email).toLowerCase())) continue;
        if (row.marketing_opt_in === false) continue;

        const { count } = await supabase.from("email_queue")
          .select("id", { count: "exact", head: true })
          .eq("automation_id", a.id)
          .eq("quote_id", row.id);
        if ((count || 0) >= a.max_sends_per_quote) continue;

        if (dryRun) { report.push({ automation: a.name, quote: row.quote_reference, email: row.customer_email }); continue; }

        await supabase.from("email_queue").insert({
          automation_id: a.id,
          template_id: a.template_id,
          sender_id: a.sender_id,
          quote_id: row.id,
          recipient_email: row.customer_email,
          status: "pending",
          scheduled_at: new Date().toISOString(),
        });
        enqueued++;
      }
    }

    return new Response(JSON.stringify({ enqueued, report }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
