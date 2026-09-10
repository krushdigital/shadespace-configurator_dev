import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const queueId = url.searchParams.get("q");
    const target = url.searchParams.get("u");
    if (!queueId || !target) {
      return new Response("Missing parameters", { status: 400 });
    }
    const decoded = decodeURIComponent(target);
    const supabase = createClient(SB_URL, SB_SERVICE);
    await supabase.from("email_events").insert({
      queue_id: queueId,
      event_type: "clicked",
      url: decoded,
      user_agent: req.headers.get("user-agent") || "",
      ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim(),
    });
    return new Response(null, { status: 302, headers: { Location: decoded } });
  } catch (err) {
    return new Response(`Redirect error: ${err instanceof Error ? err.message : err}`, { status: 500 });
  }
});
