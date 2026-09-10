import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, svix-signature, svix-id, svix-timestamp",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const mapType: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const payload = await req.json();
    const supabase = createClient(SB_URL, SB_SERVICE);

    const type = payload?.type;
    const data = payload?.data || {};
    const messageId = data?.email_id || data?.id;

    const mapped = mapType[type];
    if (!mapped || !messageId) {
      return new Response(JSON.stringify({ ignored: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: queueRow } = await supabase.from("email_queue").select("id").eq("resend_message_id", messageId).maybeSingle();
    if (!queueRow) {
      return new Response(JSON.stringify({ ignored: true, reason: "no queue row" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("email_events").insert({
      queue_id: queueRow.id,
      event_type: mapped,
      url: data?.link || null,
      user_agent: data?.user_agent || null,
      ip: data?.ip || null,
    });

    if (mapped === "bounced" || mapped === "complained") {
      await supabase.from("email_queue").update({ status: "failed", error: `${mapped} via webhook` }).eq("id", queueRow.id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
