import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  trackQuoteRequested,
  trackProgressSaved,
  subscribeToMarketing,
} from "./klaviyo.ts";

// Public page the configurator is embedded on — used to build resume links
// for Klaviyo follow-up emails.
const CONFIGURATOR_PAGE_URL = "https://shadespace.com/pages/shade-sail-configurator";

function buildResumeUrl(quoteId: string, accessToken: string): string {
  return `${CONFIGURATOR_PAGE_URL}?quote=${encodeURIComponent(quoteId)}&token=${encodeURIComponent(accessToken)}&_ab=0&_fd=0`;
}

/**
 * Notify Klaviyo about a quote save (non-blocking, never throws).
 * - quote_ready / completed  -> "Quote Requested" (triggers the follow-up flow)
 * - in_progress              -> "Configurator Progress Saved" (analytics only)
 * - checkout_pending / admin-created quotes -> nothing
 */
async function notifyKlaviyo(opts: {
  status: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  quoteReference: string | null;
  quoteId: string;
  accessToken: string | null;
  quoteName?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  config?: Record<string, unknown> | null;
  currentStep?: number | null;
  marketingOptIn: boolean;
  isAdminCreated: boolean;
}): Promise<void> {
  try {
    if (!opts.email || !opts.quoteReference || opts.isAdminCreated) return;
    if (opts.status === "checkout_pending") return;

    const cfg = (opts.config || {}) as Record<string, unknown>;
    const base = {
      email: opts.email,
      firstName: opts.firstName || null,
      lastName: opts.lastName || null,
      quoteReference: opts.quoteReference,
      quoteId: opts.quoteId,
      quoteName: opts.quoteName || null,
      totalPrice: opts.totalPrice ?? null,
      currency: opts.currency || null,
      corners: typeof cfg.corners === "number" ? (cfg.corners as number) : null,
      fabricType: typeof cfg.fabricType === "string" ? (cfg.fabricType as string) : null,
      fabricColor: typeof cfg.fabricColor === "string" ? (cfg.fabricColor as string) : null,
      status: opts.status,
      resumeUrl: opts.accessToken
        ? buildResumeUrl(opts.quoteId, opts.accessToken)
        : null,
    };

    if (opts.status === "quote_ready" || opts.status === "completed") {
      await trackQuoteRequested(base);
    } else if (opts.status === "in_progress") {
      await trackProgressSaved({ ...base, currentStep: opts.currentStep ?? null });
    }

    if (opts.marketingOptIn) {
      await subscribeToMarketing(opts.email);
    }
  } catch (err) {
    console.error("[klaviyo] notifyKlaviyo failed (non-blocking):", err);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateReference(): string {
  const digits = "0123456789";
  let num = "";
  for (let i = 0; i < 6; i++) {
    num += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return `SS-${num}`;
}

function getClientIp(req: Request): string | null {
  const headers = [
    "cf-connecting-ip",
    "x-real-ip",
    "x-forwarded-for",
  ];
  for (const h of headers) {
    const val = req.headers.get(h);
    if (val) {
      return val.split(",")[0].trim();
    }
  }
  return null;
}

function isValidPublicIp(ip: unknown): ip is string {
  if (typeof ip !== "string") return false;
  const v = ip.trim();
  if (!v) return false;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = v.match(ipv4);
  if (m) {
    const octets = m.slice(1).map(Number);
    if (octets.some((o) => o > 255)) return false;
    if (octets[0] === 10) return false;
    if (octets[0] === 127) return false;
    if (octets[0] === 192 && octets[1] === 168) return false;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return false;
    if (octets[0] === 169 && octets[1] === 254) return false;
    return true;
  }
  // Basic IPv6 sanity check (exclude loopback / link-local)
  if (v.includes(":")) {
    if (v === "::1") return false;
    if (v.toLowerCase().startsWith("fe80:")) return false;
    return /^[0-9a-fA-F:]+$/.test(v);
  }
  return false;
}

// Prefer a browser-supplied client IP (captured via a direct call to
// detect-country) over the request header, since save-quote is reached
// through the Shopify App Proxy and the header reflects the proxy hop.
function resolveClientIp(bodyIp: unknown, req: Request): string | null {
  if (isValidPublicIp(bodyIp)) return bodyIp.trim();
  return getClientIp(req);
}

async function resolveCountry(ip: string): Promise<{ country: string; countryCode: string } | null> {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "success") {
      return { country: data.country, countryCode: data.countryCode };
    }
  } catch {
    // Non-blocking -- geolocation failure should not block quote save
  }
  return null;
}

function generateAccessToken(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

const STATUS_RANK: Record<string, number> = {
  purchased: 1,
  quote_ready: 2,
  completed: 3,
  checkout_pending: 4,
  in_progress: 5,
  expired: 6,
};

async function assignQuoteToThread(
  supabase: ReturnType<typeof createClient>,
  quoteId: string,
  email: string | null,
  customerReference: string | null,
  corners: number | null,
  status: string,
  value: number | null,
  currency: string | null
): Promise<string | null> {
  if (!email) return null;

  const normalizedEmail = email.toLowerCase().trim();

  // Check if there's a customer_thread_config override
  const { data: config } = await supabase
    .from("customer_thread_config")
    .select("always_separate_threads, default_thread_type")
    .eq("customer_email", normalizedEmail)
    .maybeSingle();

  const alwaysSeparate = config?.always_separate_threads ?? false;
  const threadType = config?.default_thread_type ?? "residential";

  if (alwaysSeparate) {
    // Commercial customer: always create a new thread
    const { data: newThread } = await supabase
      .from("quote_threads")
      .insert({
        customer_email: normalizedEmail,
        customer_reference: customerReference || null,
        thread_type: threadType,
        primary_quote_id: quoteId,
        status,
        quote_count: 1,
        latest_value: value,
        latest_currency: currency,
      })
      .select("id")
      .single();

    if (newThread) {
      await supabase
        .from("saved_quotes")
        .update({ quote_thread_id: newThread.id, is_thread_primary: true })
        .eq("id", quoteId);
      return newThread.id;
    }
    return null;
  }

  // Try to find an existing thread to join
  let matchedThreadId: string | null = null;

  // Strategy 1: Match by customer_reference (if provided)
  if (customerReference) {
    const { data: refMatch } = await supabase
      .from("quote_threads")
      .select("id")
      .eq("customer_email", normalizedEmail)
      .eq("customer_reference", customerReference)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (refMatch) matchedThreadId = refMatch.id;
  }

  // Strategy 2: Match by same email + same corners + within 7 days (no reference)
  if (!matchedThreadId && !customerReference) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: recentThreads } = await supabase
      .from("quote_threads")
      .select("id, primary_quote_id")
      .eq("customer_email", normalizedEmail)
      .is("customer_reference", null)
      .gte("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (recentThreads && recentThreads.length > 0 && corners !== null) {
      for (const thread of recentThreads) {
        if (!thread.primary_quote_id) continue;
        const { data: primaryQuote } = await supabase
          .from("saved_quotes")
          .select("config_data")
          .eq("id", thread.primary_quote_id)
          .maybeSingle();

        if (primaryQuote) {
          const threadCorners = primaryQuote.config_data?.corners;
          if (threadCorners === corners) {
            matchedThreadId = thread.id;
            break;
          }
        }
      }
    }
  }

  if (matchedThreadId) {
    // Join existing thread
    await supabase
      .from("saved_quotes")
      .update({ quote_thread_id: matchedThreadId, is_thread_primary: false })
      .eq("id", quoteId);

    // Recalculate primary for this thread
    await recalculateThreadPrimary(supabase, matchedThreadId);
    return matchedThreadId;
  }

  // No match: create a new thread
  const { data: newThread } = await supabase
    .from("quote_threads")
    .insert({
      customer_email: normalizedEmail,
      customer_reference: customerReference || null,
      thread_type: threadType,
      primary_quote_id: quoteId,
      status,
      quote_count: 1,
      latest_value: value,
      latest_currency: currency,
    })
    .select("id")
    .single();

  if (newThread) {
    await supabase
      .from("saved_quotes")
      .update({ quote_thread_id: newThread.id, is_thread_primary: true })
      .eq("id", quoteId);
    return newThread.id;
  }

  return null;
}

async function recalculateThreadPrimary(
  supabase: ReturnType<typeof createClient>,
  threadId: string
): Promise<void> {
  // Find the best quote in this thread
  const { data: quotes } = await supabase
    .from("saved_quotes")
    .select("id, status, locked_total, locked_total_currency, calculations_data, config_data, updated_at")
    .eq("quote_thread_id", threadId)
    .order("updated_at", { ascending: false });

  if (!quotes || quotes.length === 0) return;

  // Sort by status rank then recency
  quotes.sort((a, b) => {
    const rankA = STATUS_RANK[a.status] ?? 99;
    const rankB = STATUS_RANK[b.status] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
  });

  const primary = quotes[0];
  const primaryValue = primary.locked_total ?? primary.calculations_data?.totalPrice ?? null;
  const primaryCurrency = primary.locked_total_currency ?? primary.config_data?.currency ?? null;

  // Set all to non-primary first
  await supabase
    .from("saved_quotes")
    .update({ is_thread_primary: false })
    .eq("quote_thread_id", threadId);

  // Set the winner as primary
  await supabase
    .from("saved_quotes")
    .update({ is_thread_primary: true })
    .eq("id", primary.id);

  // Update thread metadata
  await supabase
    .from("quote_threads")
    .update({
      primary_quote_id: primary.id,
      status: primary.status,
      quote_count: quotes.length,
      latest_value: primaryValue,
      latest_currency: primaryCurrency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (req.method === "GET") {
      return handleGet(req, supabase);
    } else if (req.method === "POST") {
      return handlePost(req, supabase);
    } else if (req.method === "PUT") {
      return handlePut(req, supabase);
    } else if (req.method === "PATCH") {
      return handlePatch(req, supabase);
    }
    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("save-quote error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});

async function handleGet(
  req: Request,
  supabase: ReturnType<typeof createClient>
) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token");

  if (!id || !token) {
    return jsonResponse({ error: "id and token are required" }, 400);
  }

  const { data: quote, error } = await supabase
    .from("saved_quotes")
    .select("*")
    .eq("id", id)
    .eq("access_token", token)
    .maybeSingle();

  if (error || !quote) {
    return jsonResponse(
      { success: false, error: "Quote not found or invalid token" },
      404
    );
  }

  // Update last accessed
  await supabase
    .from("saved_quotes")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", id);

  // Determine pricing status
  const pricingLockedUntil = quote.pricing_locked_until;
  const pricingStatus =
    pricingLockedUntil && new Date(pricingLockedUntil) > new Date()
      ? "locked"
      : "live";

  return jsonResponse({
    success: true,
    quote: {
      id: quote.id,
      quote_reference: quote.quote_reference,
      quote_name: quote.quote_name,
      customer_reference: quote.customer_reference,
      name_auto_generated: quote.name_auto_generated,
      customer_email: quote.customer_email,
      customer_first_name: quote.customer_first_name,
      customer_last_name: quote.customer_last_name,
      config_data: quote.config_data,
      calculations_data: quote.calculations_data,
      pricing_snapshot: quote.pricing_snapshot,
      locked_total: quote.locked_total,
      locked_total_currency: quote.locked_total_currency,
      locked_total_base_nzd: quote.locked_total_base_nzd,
      locked_fx_rate: quote.locked_fx_rate,
      locked_market_markup: quote.locked_market_markup,
      locked_zonos_dhl_markup: quote.locked_zonos_dhl_markup,
      locked_at: quote.locked_at,
      created_at: quote.created_at,
      expires_at: quote.expires_at,
      pricing_locked_until: pricingLockedUntil,
      pricing_status: pricingStatus,
      status: quote.status,
      current_step: quote.current_step,
      total_steps: quote.total_steps,
      shopify_order_id: quote.shopify_order_id,
      shopify_order_number: quote.shopify_order_number,
      purchased_at: quote.purchased_at,
    },
  });
}

async function handlePost(
  req: Request,
  supabase: ReturnType<typeof createClient>
) {
  const body = await req.json();
  const {
    config,
    calculations,
    email,
    quoteName,
    customerReference,
    currentStep,
    totalSteps,
    pricingSnapshot,
    firstName,
    lastName,
    canvasImageUrl,
    canvasImage3DUrl,
    status: requestedStatus,
    createdByAdminId,
    salesRepName,
    createdVia,
    clientIp: bodyClientIp,
    marketingOptIn,
  } = body;

  if (!config || !calculations) {
    return jsonResponse(
      { error: "config and calculations are required" },
      400
    );
  }

  const reference = generateReference();
  const accessToken = generateAccessToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
  const pricingLockedUntil = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000
  ); // 14 days

  const nameAutoGenerated = !quoteName;
  const finalQuoteName = quoteName || `Quote ${reference}`;

  // Determine initial status
  const validStatuses = [
    "in_progress",
    "quote_ready",
    "completed",
    "checkout_pending",
  ];
  const initialStatus = requestedStatus && validStatuses.includes(requestedStatus)
    ? requestedStatus
    : "quote_ready";

  // Determine locked total from calculations
  const lockedTotal =
    calculations.totalPrice && calculations.totalPrice > 0
      ? calculations.totalPrice
      : null;
  const lockedCurrency = config.currency || null;

  // Extract client IP and resolve country (non-blocking)
  const clientIp = resolveClientIp(bodyClientIp, req);
  let customerCountry: string | null = null;
  let customerCountryCode: string | null = null;
  if (clientIp) {
    const geo = await resolveCountry(clientIp);
    if (geo) {
      customerCountry = geo.country;
      customerCountryCode = geo.countryCode;
    }
  }

  const insertPayload: Record<string, unknown> = {
    quote_reference: reference,
    access_token: accessToken,
    customer_email: email || null,
    customer_first_name: firstName || null,
    customer_last_name: lastName || null,
    config_data: config,
    calculations_data: calculations,
    quote_name: finalQuoteName,
    customer_reference: customerReference || null,
    name_auto_generated: nameAutoGenerated,
    current_step: currentStep ?? 7,
    total_steps: totalSteps ?? 7,
    completion_percentage: currentStep && totalSteps
      ? Math.round((currentStep / totalSteps) * 100)
      : 100,
    status: initialStatus,
    expires_at: expiresAt.toISOString(),
    pricing_locked_until: pricingLockedUntil.toISOString(),
    pricing_snapshot: pricingSnapshot || null,
    locked_total: lockedTotal,
    locked_total_currency: lockedCurrency,
    locked_at: lockedTotal ? now.toISOString() : null,
    diagram_public_url: canvasImageUrl || null,
    diagram_3d_public_url: canvasImage3DUrl || null,
    customer_ip: clientIp,
    customer_country: customerCountry,
    customer_country_code: customerCountryCode,
    // Explicit consent from the form checkbox when provided; falls back to
    // the legacy implicit behaviour (email present = opted in).
    marketing_opt_in: typeof marketingOptIn === "boolean" ? marketingOptIn : !!email,
    ...(createdByAdminId ? { created_by_admin_id: createdByAdminId } : {}),
    ...(salesRepName ? { sales_rep_name: salesRepName } : {}),
    ...(createdVia ? { created_via: createdVia } : {}),
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("saved_quotes")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr) {
    console.error("Insert error:", insertErr);
    return jsonResponse({ success: false, error: insertErr.message }, 500);
  }

  // Assign to thread (non-blocking for the response, but we await for consistency)
  try {
    await assignQuoteToThread(
      supabase,
      inserted.id,
      email || null,
      customerReference || null,
      config.corners ?? null,
      initialStatus,
      lockedTotal,
      lockedCurrency
    );
  } catch (threadErr) {
    console.warn("Thread assignment failed (non-blocking):", threadErr);
  }

  // Skip Shopify customer creation for checkout_pending (no email available)
  let shopifyCustomerCreated = false;
  let shopifyCustomerId: string | null = null;

  if (email && initialStatus !== "checkout_pending") {
    try {
      const addCustomerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/add-shopify-customer`;
      const custResponse = await fetch(addCustomerUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          quoteReference: reference,
        }),
      });
      if (custResponse.ok) {
        const custData = await custResponse.json();
        if (custData.customerId) {
          shopifyCustomerCreated = true;
          shopifyCustomerId = custData.customerId;
          await supabase
            .from("saved_quotes")
            .update({ shopify_customer_id: shopifyCustomerId })
            .eq("id", inserted.id);
        }
      }
    } catch (custErr) {
      console.warn("Shopify customer creation failed (non-blocking):", custErr);
    }
  }

  // Klaviyo: fire "Quote Requested" for quote_ready saves so the marketing
  // follow-up flow takes over. Non-blocking, never throws.
  await notifyKlaviyo({
    status: initialStatus,
    email: email || null,
    firstName: firstName || null,
    lastName: lastName || null,
    quoteReference: reference,
    quoteId: inserted.id,
    accessToken,
    quoteName: finalQuoteName,
    totalPrice: lockedTotal,
    currency: lockedCurrency,
    config,
    currentStep: currentStep ?? null,
    marketingOptIn: typeof marketingOptIn === "boolean" ? marketingOptIn : !!email,
    isAdminCreated: !!createdByAdminId || createdVia === "admin_quote_builder",
  });

  return jsonResponse({
    success: true,
    quote: {
      id: inserted.id,
      reference,
      expiresAt: expiresAt.toISOString(),
      pricingLockedUntil: pricingLockedUntil.toISOString(),
      quoteName: finalQuoteName,
      customerReference: customerReference || null,
      nameAutoGenerated,
      accessToken,
      shopifyCustomerCreated,
      shopifyCustomerId,
      currentStep: currentStep ?? 7,
      totalSteps: totalSteps ?? 7,
      status: initialStatus,
    },
  });
}

async function handlePut(
  req: Request,
  supabase: ReturnType<typeof createClient>
) {
  const body = await req.json();
  const {
    id,
    token,
    config,
    calculations,
    email,
    quoteName,
    customerReference,
    currentStep,
    totalSteps,
    pricingSnapshot,
    firstName,
    lastName,
    canvasImageUrl,
    canvasImage3DUrl,
    status: requestedStatus,
    clientIp: bodyClientIp,
    marketingOptIn,
  } = body;

  if (!id || !token) {
    return jsonResponse({ error: "id and token are required" }, 400);
  }
  if (!config || !calculations) {
    return jsonResponse({ error: "config and calculations are required" }, 400);
  }

  const { data: existing } = await supabase
    .from("saved_quotes")
    .select("id, quote_reference, access_token, quote_name, name_auto_generated, customer_email, pricing_locked_until, expires_at, quote_thread_id, status")
    .eq("id", id)
    .eq("access_token", token)
    .maybeSingle();

  if (!existing) {
    return jsonResponse(
      { success: false, error: "Quote not found or invalid token" },
      404
    );
  }

  const validStatuses = ["in_progress", "quote_ready", "completed", "checkout_pending"];
  const finalStatus = requestedStatus && validStatuses.includes(requestedStatus)
    ? requestedStatus
    : undefined;

  const nameAutoGenerated = !quoteName;
  const finalQuoteName = quoteName || existing.quote_name;

  const lockedTotal =
    calculations.totalPrice && calculations.totalPrice > 0
      ? calculations.totalPrice
      : null;
  const lockedCurrency = config.currency || null;

  // Resolve IP/country on update too
  const clientIp = resolveClientIp(bodyClientIp, req);
  let customerCountry: string | null = null;
  let customerCountryCode: string | null = null;
  if (clientIp) {
    const geo = await resolveCountry(clientIp);
    if (geo) {
      customerCountry = geo.country;
      customerCountryCode = geo.countryCode;
    }
  }

  const updatePayload: Record<string, unknown> = {
    config_data: config,
    calculations_data: calculations,
    customer_email: email || existing.customer_email || null,
    customer_first_name: firstName || null,
    customer_last_name: lastName || null,
    quote_name: finalQuoteName,
    customer_reference: customerReference || null,
    name_auto_generated: nameAutoGenerated,
    current_step: currentStep ?? 7,
    total_steps: totalSteps ?? 7,
    completion_percentage: currentStep && totalSteps
      ? Math.round((currentStep / totalSteps) * 100)
      : 100,
    pricing_snapshot: pricingSnapshot || null,
    locked_total: lockedTotal,
    locked_total_currency: lockedCurrency,
    locked_at: lockedTotal ? new Date().toISOString() : null,
    diagram_public_url: canvasImageUrl || null,
    diagram_3d_public_url: canvasImage3DUrl || null,
    updated_at: new Date().toISOString(),
  };

  if (finalStatus) {
    updatePayload.status = finalStatus;
  }
  if (typeof marketingOptIn === "boolean") {
    updatePayload.marketing_opt_in = marketingOptIn;
  }
  if (clientIp) {
    updatePayload.customer_ip = clientIp;
  }
  if (customerCountry) {
    updatePayload.customer_country = customerCountry;
    updatePayload.customer_country_code = customerCountryCode;
  }

  const { error: updateErr } = await supabase
    .from("saved_quotes")
    .update(updatePayload)
    .eq("id", id);

  if (updateErr) {
    console.error("Update error:", updateErr);
    return jsonResponse({ success: false, error: updateErr.message }, 500);
  }

  // Recalculate thread primary if status changed or this quote has a thread
  try {
    if (existing.quote_thread_id) {
      await recalculateThreadPrimary(supabase, existing.quote_thread_id);
    } else {
      // Quote wasn't assigned yet (e.g. was created before threading), assign now
      const effectiveEmail = email || existing.customer_email;
      if (effectiveEmail) {
        await assignQuoteToThread(
          supabase,
          id,
          effectiveEmail,
          customerReference || null,
          config.corners ?? null,
          finalStatus || existing.status || "quote_ready",
          lockedTotal,
          lockedCurrency
        );
      }
    }
  } catch (threadErr) {
    console.warn("Thread recalculation failed (non-blocking):", threadErr);
  }

  // Klaviyo: fire on updates too (e.g. resumed quote re-saved as quote_ready,
  // or an email added to an existing quote). unique_id dedup on Klaviyo's side
  // makes repeat fires for the same quote harmless.
  const klaviyoEmail = email || existing.customer_email || null;
  const effectiveStatus = finalStatus || existing.status || "quote_ready";
  await notifyKlaviyo({
    status: effectiveStatus,
    email: klaviyoEmail,
    firstName: firstName || null,
    lastName: lastName || null,
    quoteReference: existing.quote_reference,
    quoteId: existing.id,
    accessToken: token,
    quoteName: finalQuoteName,
    totalPrice: lockedTotal,
    currency: lockedCurrency,
    config,
    currentStep: currentStep ?? null,
    marketingOptIn: typeof marketingOptIn === "boolean" ? marketingOptIn : false,
    isAdminCreated: false,
  });

  return jsonResponse({
    success: true,
    quote: {
      id: existing.id,
      reference: existing.quote_reference,
      expiresAt: existing.expires_at,
      pricingLockedUntil: existing.pricing_locked_until,
      quoteName: finalQuoteName,
      customerReference: customerReference || null,
      nameAutoGenerated,
      accessToken: token,
      shopifyCustomerCreated: false,
      shopifyCustomerId: null,
      currentStep: currentStep ?? 7,
      totalSteps: totalSteps ?? 7,
      status: finalStatus || "quote_ready",
    },
  });
}

async function handlePatch(
  req: Request,
  supabase: ReturnType<typeof createClient>
) {
  const body = await req.json();
  const { id, token, status } = body;

  if (!id || !token) {
    return jsonResponse({ error: "id and token are required" }, 400);
  }

  // Verify access
  const { data: existing } = await supabase
    .from("saved_quotes")
    .select("id, quote_thread_id")
    .eq("id", id)
    .eq("access_token", token)
    .maybeSingle();

  if (!existing) {
    return jsonResponse(
      { success: false, error: "Quote not found or invalid token" },
      404
    );
  }

  const updatePayload: Record<string, unknown> = {};
  if (status) {
    updatePayload.status = status;
    updatePayload.updated_at = new Date().toISOString();
  }

  if (Object.keys(updatePayload).length > 0) {
    await supabase.from("saved_quotes").update(updatePayload).eq("id", id);

    // Recalculate thread primary on status change
    if (existing.quote_thread_id && status) {
      try {
        await recalculateThreadPrimary(supabase, existing.quote_thread_id);
      } catch (threadErr) {
        console.warn("Thread recalculation failed (non-blocking):", threadErr);
      }
    }
  }

  return jsonResponse({ success: true });
}
