import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PAGE = (msg: string) => `<!doctype html><html><head><meta charset="utf-8"/><title>Email preferences</title><style>body{font-family:Helvetica,Arial,sans-serif;background:#f8fafc;color:#1f2937;margin:0;padding:40px 20px;text-align:center}.card{background:#fff;max-width:480px;margin:0 auto;border-radius:12px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}h1{font-size:20px;margin:0 0 12px}p{line-height:1.6;color:#475569}</style></head><body><div class="card"><h1>Shade Systems</h1><p>${msg}</p></div></body></html>`;

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    if (!email) return new Response(PAGE("Missing email parameter."), { headers: { "Content-Type": "text/html" } });

    const supabase = createClient(SB_URL, SB_SERVICE);
    await supabase.from("email_unsubscribes").insert({ email: email.toLowerCase() }).select();

    return new Response(PAGE(`You have been unsubscribed from <strong>${email}</strong>. We will not send further automated emails. Reply to any previous conversation if you want help.`), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    return new Response(PAGE(`Error: ${err instanceof Error ? err.message : String(err)}`), { headers: { "Content-Type": "text/html" } });
  }
});
