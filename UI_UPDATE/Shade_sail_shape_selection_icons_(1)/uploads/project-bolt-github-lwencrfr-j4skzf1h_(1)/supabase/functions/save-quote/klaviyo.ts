// Klaviyo integration for the Shade Space configurator.
//
// Fires server-side events into Shade Space's Klaviyo account so the
// "Custom Quote Follow-Up 2.0" flow can take over marketing follow-up
// after the app's own transactional emails (which remain unchanged).
//
// Safety properties:
// - No-ops (with a log line) when KLAVIYO_PRIVATE_KEY is not set, so this
//   can be deployed before the secret exists.
// - Never throws: every call is wrapped and only logs on failure. A Klaviyo
//   outage can never block a quote save.
// - Deduplicated: events carry a unique_id derived from the quote reference,
//   so re-saves / retries of the same quote never re-trigger the flow.
//
// Secret setup: Supabase Dashboard -> Project Settings -> Edge Functions ->
// Secrets -> add KLAVIYO_PRIVATE_KEY (a private key with events:write,
// profiles:write and subscriptions:write scopes).

const KLAVIYO_API = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2025-07-15";
// Master email list ("Email List" in Klaviyo) — also the Welcome flow trigger.
const KLAVIYO_LIST_ID = "URwxNF";
const TIMEOUT_MS = 6000;

function getKey(): string | null {
  const key = Deno.env.get("KLAVIYO_PRIVATE_KEY");
  if (!key) {
    console.log("[klaviyo] KLAVIYO_PRIVATE_KEY not set; skipping Klaviyo call");
    return null;
  }
  return key;
}

async function klaviyoPost(
  key: string,
  path: string,
  payload: unknown
): Promise<boolean> {
  const res = await fetch(`${KLAVIYO_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${key}`,
      accept: "application/vnd.api+json",
      "content-type": "application/vnd.api+json",
      revision: KLAVIYO_REVISION,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok && res.status !== 202) {
    const body = await res.text().catch(() => "");
    console.error(`[klaviyo] ${path} -> HTTP ${res.status}: ${body.slice(0, 400)}`);
    return false;
  }
  return true;
}

export interface QuoteEventParams {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  quoteReference: string; // e.g. "SS-018437"
  quoteId?: string | null;
  quoteName?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  corners?: number | null;
  fabricType?: string | null;
  fabricColor?: string | null;
  status?: string | null;
  resumeUrl?: string | null;
}

/**
 * Fire the "Quote Requested" event that triggers the Klaviyo quote
 * follow-up flow. Deduplicated per quote reference.
 */
export async function trackQuoteRequested(p: QuoteEventParams): Promise<void> {
  try {
    const key = getKey();
    if (!key || !p.email) return;

    const properties: Record<string, unknown> = {
      // The flow's first split branches on the exact string "Now".
      Readiness: "Now",
      quote_id: p.quoteReference,
      status: p.status || "quote_ready",
      source: "configurator",
    };
    if (p.totalPrice != null) properties.quote_total = p.totalPrice;
    if (p.currency) properties.currency = p.currency;
    if (p.corners != null) properties.sail_shape = `${p.corners} corner`;
    if (p.fabricType) properties.fabric = p.fabricType;
    if (p.fabricColor) properties.colour = p.fabricColor;
    if (p.quoteName) properties.quote_name = p.quoteName;
    if (p.resumeUrl) properties.resume_url = p.resumeUrl;

    const profileAttributes: Record<string, unknown> = { email: p.email };
    if (p.firstName) profileAttributes.first_name = p.firstName;
    if (p.lastName) profileAttributes.last_name = p.lastName;

    const ok = await klaviyoPost(key, "/events/", {
      data: {
        type: "event",
        attributes: {
          unique_id: `${p.quoteReference}-quote-requested`,
          metric: {
            data: {
              type: "metric",
              // Exact name required — maps to the metric the flow triggers on.
              attributes: { name: "Quote Requested" },
            },
          },
          profile: { data: { type: "profile", attributes: profileAttributes } },
          ...(p.totalPrice != null ? { value: p.totalPrice } : {}),
          properties,
        },
      },
    });
    if (ok) console.log(`[klaviyo] Quote Requested sent for ${p.quoteReference}`);
  } catch (err) {
    console.error("[klaviyo] trackQuoteRequested failed (non-blocking):", err);
  }
}

/**
 * Fire a lightweight "Configurator Progress Saved" event for mid-configurator
 * saves (steps 1-5). No flow is attached to this yet; it exists so a future
 * "finish your design" flow can be built without another code change.
 */
export async function trackProgressSaved(
  p: QuoteEventParams & { currentStep?: number | null }
): Promise<void> {
  try {
    const key = getKey();
    if (!key || !p.email) return;

    const step = p.currentStep ?? 0;
    const ok = await klaviyoPost(key, "/events/", {
      data: {
        type: "event",
        attributes: {
          // Dedup per quote+step: repeat saves of the same step are ignored,
          // advancing a step records a fresh event.
          unique_id: `${p.quoteReference}-progress-step-${step}`,
          metric: {
            data: {
              type: "metric",
              attributes: { name: "Configurator Progress Saved" },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: p.email,
                ...(p.firstName ? { first_name: p.firstName } : {}),
                ...(p.lastName ? { last_name: p.lastName } : {}),
              },
            },
          },
          properties: {
            quote_id: p.quoteReference,
            configurator_step: step,
            status: p.status || "in_progress",
            source: "configurator",
            ...(p.resumeUrl ? { resume_url: p.resumeUrl } : {}),
          },
        },
      },
    });
    if (ok) console.log(`[klaviyo] Progress Saved sent for ${p.quoteReference} step ${step}`);
  } catch (err) {
    console.error("[klaviyo] trackProgressSaved failed (non-blocking):", err);
  }
}

/**
 * Subscribe a customer to email marketing (master list). Called only when
 * the customer has ticked the marketing opt-in. Idempotent: subscribing an
 * already-subscribed profile is a no-op on Klaviyo's side, and this never
 * overrides a previous unsubscribe back to subscribed without consent
 * (Klaviyo treats an explicit re-subscribe request as fresh consent from
 * the form the customer just submitted).
 */
export async function subscribeToMarketing(email: string): Promise<void> {
  try {
    const key = getKey();
    if (!key || !email) return;

    // NOTE: the subscription endpoint only accepts email/phone + subscriptions
    // on the profile — names are set by the event call instead.
    const ok = await klaviyoPost(key, "/profile-subscription-bulk-create-jobs/", {
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          custom_source: "Shade Sail Configurator",
          profiles: {
            data: [
              {
                type: "profile",
                attributes: {
                  email,
                  subscriptions: {
                    email: { marketing: { consent: "SUBSCRIBED" } },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: { data: { type: "list", id: KLAVIYO_LIST_ID } },
        },
      },
    });
    if (ok) console.log(`[klaviyo] subscribe request accepted for ${email}`);
  } catch (err) {
    console.error("[klaviyo] subscribeToMarketing failed (non-blocking):", err);
  }
}
