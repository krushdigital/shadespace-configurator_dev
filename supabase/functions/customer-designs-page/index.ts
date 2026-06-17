import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";

const PROXY_TIMESTAMP_TOLERANCE_S = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://shadespace.myshopify.com",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export interface SavedQuoteRow {
  id: string;
  quote_reference: string;
  quote_name: string;
  customer_reference: string | null;
  status: string;
  current_step: number | null;
  total_steps: number | null;
  locked_total: number | null;
  locked_total_currency: string | null;
  pricing_locked_until: string | null;
  created_at: string;
  access_token: string;
  diagram_public_url: string | null;
  config_data: Record<string, unknown>;
  shopify_order_number: string | null;
  purchased_at: string | null;
}

export function verifyShopifyProxy(query: URLSearchParams, secret: string): boolean {
  if (!secret) return false;

  const signature = query.get("signature");
  if (!signature) return false;

  const params: string[] = [];
  for (const [key, value] of query.entries()) {
    if (key !== "signature") {
      params.push(`${key}=${value}`);
    }
  }
  params.sort();
  const message = params.join("");

  const hmac = createHmac("sha256", secret);
  hmac.update(message);
  const computed = hmac.digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export function validateTimestamp(query: URLSearchParams): boolean {
  const ts = query.get("timestamp");
  if (!ts) return false;
  const tsNum = parseInt(ts, 10);
  if (isNaN(tsNum)) return false;
  const nowS = Math.floor(Date.now() / 1000);
  return Math.abs(nowS - tsNum) <= PROXY_TIMESTAMP_TOLERANCE_S;
}

function formatPrice(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    NZD: "$", AUD: "$", USD: "$", CAD: "$", GBP: "\u00a3", EUR: "\u20ac",
  };
  const symbol = symbols[currency.toUpperCase()] || "$";
  return `${symbol}${amount.toFixed(2)} ${currency.toUpperCase()}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getProgressText(step: number | null, total: number | null): string {
  if (!step && step !== 0) return "Just started";
  const t = total || 7;
  return `Step ${step + 1} of ${t}`;
}

function buildResumeUrl(quoteId: string, token: string, currency?: string): string {
  const domainMap: Record<string, string> = {
    AUD: "shadespace.com.au", NZD: "shadespace.com.au",
    USD: "shadespace.com", CAD: "shadespace.com",
    GBP: "shadespace.com", EUR: "shadespace.com",
  };
  const domain = (currency && domainMap[currency.toUpperCase()]) || "shadespace.com.au";
  const safeId = encodeURIComponent(quoteId);
  const safeToken = encodeURIComponent(token);
  return `https://${domain}/pages/shade-sail-configurator?quote=${safeId}&token=${safeToken}&_ab=0&_fd=0#quote=${safeId}&token=${safeToken}`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function renderDesignCard(q: SavedQuoteRow): string {
  const isReady = q.status === "quote_ready";
  const isPurchased = q.status === "purchased";
  const currency = q.locked_total_currency || (q.config_data?.currency as string) || "NZD";
  const resumeUrl = buildResumeUrl(q.id, q.access_token, currency);
  const addToCartUrl = `${resumeUrl}&action=add-to-cart`;
  const corners = q.config_data?.corners ?? "?";
  const thumbnail = q.diagram_public_url
    ? `<img src="${escapeHtml(q.diagram_public_url)}" alt="Shade sail diagram" style="width:100%;height:140px;object-fit:contain;border-radius:8px;background:#f1f5f9;margin-bottom:14px;" />`
    : `<div style="width:100%;height:140px;border-radius:8px;background:linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%);display:flex;align-items:center;justify-content:center;margin-bottom:14px;">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" stroke-width="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
       </div>`;

  let statusBadge: string;
  if (isPurchased) {
    const orderLabel = q.shopify_order_number ? ` \u2014 Order ${escapeHtml(q.shopify_order_number)}` : "";
    statusBadge = `<span style="display:inline-block;background:#01312D;color:#ffffff;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;">Purchased${orderLabel}</span>`;
  } else if (isReady) {
    statusBadge = `<span style="display:inline-block;background:#dcfce7;color:#166534;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;">Ready to Purchase</span>`;
  } else {
    statusBadge = `<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;">In Progress</span>`;
  }

  let priceSection: string;
  if (isPurchased && q.locked_total) {
    priceSection = `<div style="font-size:20px;font-weight:800;color:#01312D;margin:10px 0 4px 0;">${formatPrice(q.locked_total, currency)}</div>
       <div style="font-size:11px;color:#64748B;">Purchased ${q.purchased_at ? formatDate(q.purchased_at) : ""}</div>`;
  } else if (isReady && q.locked_total) {
    priceSection = `<div style="font-size:20px;font-weight:800;color:#01312D;margin:10px 0 4px 0;">${formatPrice(q.locked_total, currency)}</div>
       ${q.pricing_locked_until ? `<div style="font-size:11px;color:#64748B;">Price locked until ${formatDate(q.pricing_locked_until)}</div>` : ""}`;
  } else {
    priceSection = `<div style="font-size:13px;color:#64748B;margin:10px 0 4px 0;">${getProgressText(q.current_step, q.total_steps)}</div>`;
  }

  let actions: string;
  if (isPurchased) {
    actions = `<a href="${escapeHtml(resumeUrl)}" style="display:block;text-align:center;background:#ffffff;color:#01312D;border:2px solid #01312D;text-decoration:none;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;margin-top:16px;">View Design</a>`;
  } else if (isReady) {
    actions = `<div style="display:flex;gap:8px;margin-top:16px;">
        <a href="${escapeHtml(resumeUrl)}" style="flex:1;display:block;text-align:center;background:#ffffff;color:#307C31;border:2px solid #307C31;text-decoration:none;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;">Review</a>
        <a href="${escapeHtml(addToCartUrl)}" style="flex:1;display:block;text-align:center;background:#307C31;color:#ffffff;text-decoration:none;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;">Add to Cart</a>
       </div>`;
  } else {
    actions = `<a href="${escapeHtml(resumeUrl)}" style="display:block;text-align:center;background:#307C31;color:#ffffff;text-decoration:none;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;margin-top:16px;">Continue Designing</a>`;
  }

  return `
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      ${thumbnail}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        ${statusBadge}
        <span style="font-size:11px;color:#94a3b8;">${String(corners)} corners</span>
      </div>
      <h3 style="margin:8px 0 2px 0;font-size:16px;font-weight:700;color:#01312D;line-height:1.3;">${escapeHtml(q.quote_name)}</h3>
      <div style="font-size:11px;color:#64748B;font-family:'Courier New',monospace;">${escapeHtml(q.quote_reference)}</div>
      ${q.customer_reference ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">Ref: ${escapeHtml(q.customer_reference)}</div>` : ""}
      ${priceSection}
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Saved ${formatDate(q.created_at)}</div>
      ${actions}
    </div>`;
}

function renderPage(designs: SavedQuoteRow[], customerName: string): string {
  const purchasedDesigns = designs.filter((d) => d.status === "purchased");
  const readyDesigns = designs.filter((d) => d.status === "quote_ready");
  const inProgressDesigns = designs.filter((d) => d.status !== "quote_ready" && d.status !== "purchased");

  const emptyState = `
    <div style="text-align:center;padding:60px 20px;">
      <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" stroke-width="1.5" style="margin:0 auto 20px auto;display:block;">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
      </svg>
      <h2 style="color:#01312D;font-size:20px;font-weight:700;margin:0 0 8px 0;">No saved designs yet</h2>
      <p style="color:#64748B;font-size:14px;margin:0 0 24px 0;">Start designing your custom shade sail and save your progress at any time.</p>
      <a href="https://shadespace.com.au/pages/shade-sail-configurator" style="display:inline-block;background:#307C31;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:700;">Start Designing</a>
    </div>`;

  const purchasedSection = purchasedDesigns.length > 0
    ? `<div style="margin-bottom:32px;">
        <h2 style="color:#01312D;font-size:18px;font-weight:700;margin:0 0 16px 0;">Purchased (${purchasedDesigns.length})</h2>
        <div class="designs-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">
          ${purchasedDesigns.map(renderDesignCard).join("")}
        </div>
       </div>`
    : "";

  const readySection = readyDesigns.length > 0
    ? `<div style="margin-bottom:32px;">
        <h2 style="color:#01312D;font-size:18px;font-weight:700;margin:0 0 16px 0;">Ready to Purchase (${readyDesigns.length})</h2>
        <div class="designs-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">
          ${readyDesigns.map(renderDesignCard).join("")}
        </div>
       </div>`
    : "";

  const progressSection = inProgressDesigns.length > 0
    ? `<div style="margin-bottom:32px;">
        <h2 style="color:#01312D;font-size:18px;font-weight:700;margin:0 0 16px 0;">In Progress (${inProgressDesigns.length})</h2>
        <div class="designs-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">
          ${inProgressDesigns.map(renderDesignCard).join("")}
        </div>
       </div>`
    : "";

  return `<style>
  * { box-sizing: border-box; }
  .account-nav { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
  .account-nav a { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 999px; font-size: 14px; font-weight: 600; text-decoration: none; border: 2px solid #01312D; color: #01312D; background: #ffffff; transition: background 0.15s, color 0.15s; }
  .account-nav a.active, .account-nav a:hover { background: #01312D; color: #ffffff; }
  @media (max-width: 640px) {
    .designs-grid { grid-template-columns: 1fr !important; }
    .page-container { padding: 20px 16px !important; }
    .account-nav { gap: 6px; }
    .account-nav a { font-size: 13px; padding: 9px 16px; }
  }
</style>
<div class="page-container" style="max-width:960px;margin:0 auto;padding:40px 24px;">
  <div style="margin-bottom:32px;">
    <div class="account-nav">
      <a href="/account/orders">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        My Orders
      </a>
      <a href="/pages/my-designs" class="active">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        My Designs
      </a>
      <a href="/account">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        My Profile
      </a>
    </div>
    <h1 style="color:#01312D;font-size:28px;font-weight:800;margin:0 0 6px 0;">My Shade Sail Designs</h1>
    <p style="color:#64748B;font-size:14px;margin:0;">Hi ${escapeHtml(customerName)} \u2014 all your saved configurations in one place.</p>
  </div>
  ${designs.length > 0 ? `${purchasedSection}${readySection}${progressSection}` : emptyState}
  <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">Need help? <a href="mailto:sails@shadespace.com" style="color:#307C31;text-decoration:underline;">sails@shadespace.com</a></p>
  </div>
</div>`;
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams;

    const shopifySecret = Deno.env.get("SHOPIFY_API_SECRET") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      console.error("[customer-designs-page] FATAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
      return new Response("<h1>Service unavailable</h1>", {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    if (!shopifySecret) {
      console.error("[customer-designs-page] FATAL: SHOPIFY_API_SECRET missing");
      return new Response("<h1>Service misconfigured</h1>", {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    if (!verifyShopifyProxy(query, shopifySecret)) {
      return new Response("<h1>Unauthorized</h1>", {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    if (!validateTimestamp(query)) {
      return new Response("<h1>Request expired</h1>", {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    let customerEmail = "";
    let customerName = "there";

    customerEmail = query.get("customer_email") || query.get("logged_in_customer_email") || "";
    if (customerEmail) {
      customerName = query.get("customer_name") || query.get("logged_in_customer_name") || "there";
    }

    if (!customerEmail) {
      const tokenEmail = query.get("email") ?? "";
      const tokenValue = query.get("token") ?? "";

      if (tokenEmail && tokenValue) {
        const sb = createClient(supabaseUrl, serviceKey);
        const { data: tokenRow } = await sb
          .from("saved_quotes")
          .select("customer_email")
          .eq("access_token", tokenValue)
          .eq("customer_email", tokenEmail)
          .limit(1)
          .maybeSingle();
        if (tokenRow?.customer_email) {
          customerEmail = tokenRow.customer_email;
        }
      }
    }

    console.log("[customer-designs-page] resolved:", { hasEmail: !!customerEmail });

    if (!customerEmail) {
      const signInHtml = `<div style="padding:60px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;text-align:center;">
  <div style="max-width:400px;margin:0 auto;">
    <h1 style="color:#01312D;font-size:24px;font-weight:800;margin:0 0 12px 0;">Sign in to view your designs</h1>
    <p style="color:#64748B;font-size:14px;margin:0 0 28px 0;">Sign in with your email to see all your saved shade sail configurations.</p>
    <a href="/account/login?return_to=/pages/my-designs" style="display:inline-block;background:#307C31;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:999px;font-size:15px;font-weight:700;">Sign In</a>
  </div>
</div>`;
      return new Response(signInHtml, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: quotes, error } = await supabase
      .from("saved_quotes")
      .select(
        "id, quote_reference, quote_name, customer_reference, status, current_step, total_steps, locked_total, locked_total_currency, pricing_locked_until, created_at, access_token, diagram_public_url, config_data, shopify_order_number, purchased_at",
      )
      .eq("customer_email", customerEmail)
      .in("status", ["in_progress", "quote_ready", "purchased"])
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      console.error("[customer-designs-page] Supabase error:", error);
      throw new Error("Failed to load designs");
    }

    const html = renderPage((quotes ?? []) as SavedQuoteRow[], customerName);

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[customer-designs-page] unhandled error:", err);
    return new Response(
      "<h1>Something went wrong</h1><p>Please try again later.</p>",
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } },
    );
  }
}

Deno.serve(handleRequest);
