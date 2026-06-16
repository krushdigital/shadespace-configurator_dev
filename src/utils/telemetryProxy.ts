/**
 * telemetryProxy.ts
 *
 * Centralised client-side helper for best-effort telemetry writes.
 *
 * All writes are routed through the Shopify App Proxy instead of calling
 * Supabase REST/edge-function endpoints directly from the browser.  This
 * removes VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from every call-site
 * and ensures no Supabase credentials appear in the browser bundle for write
 * operations.
 *
 * App proxy base path:  /apps/shade_space
 * Route prefix:         /api/v1/public/telemetry
 *
 * Full storefront URLs (relative):
 *   /apps/shade_space/api/v1/public/telemetry/user-currency-preferences
 *   /apps/shade_space/api/v1/public/telemetry/currency-switches
 *   /apps/shade_space/api/v1/public/telemetry/currency-switch-redirect-failures
 *   /apps/shade_space/api/v1/public/telemetry/mobile-scroll-diagnostics
 *   /apps/shade_space/api/v1/public/telemetry/acknowledgment-consents
 *   /apps/shade_space/api/v1/public/telemetry/user-events
 */

const TELEMETRY_BASE = '/apps/shade_space/api/v1/public/telemetry';

/**
 * Fire-and-forget POST to a telemetry proxy endpoint.
 *
 * Never throws — all errors are silently swallowed because these are
 * best-effort analytics writes that must never affect user-facing behaviour.
 *
 * Uses `keepalive: true` where supported so that writes issued just before a
 * page unload (e.g. currency redirect) are not cancelled by the browser.
 */
export async function proxyTelemetryWrite(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch(`${TELEMETRY_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // best-effort: ignore network failures
  }
}

// ---------------------------------------------------------------------------
// Typed helpers – one per Supabase table
// ---------------------------------------------------------------------------

export interface UserCurrencyPreferencesPayload {
  client_id: string;
  country_code: string | null;
  currency_code: string | null;
  user_agent: string;
  updated_at: string;
  expires_at: string;
}

export function trackUserCurrencyPreference(payload: UserCurrencyPreferencesPayload): void {
  void proxyTelemetryWrite('user-currency-preferences', payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------

export interface CurrencySwitchPayload {
  quote_id: string | null;
  quote_currency: string;
  storefront_currency_before: string;
  storefront_country_before: string;
  target_country: string;
  domain: string;
  triggered_by: string;
  user_agent: string;
}

export function trackCurrencySwitch(payload: CurrencySwitchPayload): void {
  void proxyTelemetryWrite('currency-switches', payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------

export interface CurrencySwitchRedirectFailurePayload {
  quote_id: string | null;
  quote_currency: string;
  target_domain: string;
  origin_domain: string;
  user_agent: string;
}

export function trackCurrencySwitchRedirectFailure(
  payload: CurrencySwitchRedirectFailurePayload,
): void {
  void proxyTelemetryWrite(
    'currency-switch-redirect-failures',
    payload as Record<string, unknown>,
  );
}

// ---------------------------------------------------------------------------

export interface MobileScrollDiagnosticsPayload {
  element_id: string;
  browser: string;
  user_agent: string;
  inner_height: number;
  visual_viewport_height: number;
  target_scroll_y: number;
  final_scroll_y: number;
  align_mode: string;
}

export function trackMobileScrollDiagnostic(payload: MobileScrollDiagnosticsPayload): void {
  void proxyTelemetryWrite('mobile-scroll-diagnostics', payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------

export interface AcknowledgmentConsentPayload {
  quote_reference: string;
  agreed_at: string;
  user_agent: string;
  statements_version: string;
  statements_snapshot: string[];
}

export function trackAcknowledgmentConsent(payload: AcknowledgmentConsentPayload): void {
  void proxyTelemetryWrite('acknowledgment-consents', payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------

export interface UserEventPayload {
  eventType: string;
  eventData?: Record<string, unknown>;
  quoteId?: string | null;
  customerEmail?: string | null;
  success?: boolean;
  errorMessage?: string | null;
}

export function trackUserEvent(payload: UserEventPayload): void {
  void proxyTelemetryWrite('user-events', payload as Record<string, unknown>);
}
