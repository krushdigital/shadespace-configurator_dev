import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(SB_URL, SB_SERVICE);
    const { data: pending } = await supabase.from("email_queue")
      .select("id, template_id, sender_id, quote_id, recipient_email")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    let sent = 0, failed = 0;
    for (const q of pending || []) {
      await supabase.from("email_queue").update({ status: "sending" }).eq("id", q.id);
      const res = await fetch(`${SB_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SB_SERVICE}` },
        body: JSON.stringify({
          templateId: q.template_id,
          senderId: q.sender_id,
          toEmail: q.recipient_email,
          quoteId: q.quote_id,
          reuseQueueId: q.id,
        }),
      });
      if (res.ok) sent++; else {
        failed++;
        const txt = await res.text();
        await supabase.from("email_queue").update({ status: "failed", error: txt.slice(0, 500) }).eq("id", q.id);
      }
    }

    return new Response(JSON.stringify({ sent, failed, pending_count: pending?.length || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
