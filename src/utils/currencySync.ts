import { readShopifyCurrency, readShopifyCountry } from './currencyDetection';

type CurrencyMapping = {
  currency: string;
  preferred_country_code: string;
  preferred_domain: string;
};

type IpDetection = {
  countryCode: string | null;
  currency: string | null;
};

let mappingCache: CurrencyMapping[] | null = null;
let mappingPromise: Promise<CurrencyMapping[]> | null = null;
let ipDetectionCache: IpDetection | null = null;
let ipDetectionPromise: Promise<IpDetection> | null = null;

/**
 * Calls our detect-country edge function to get the customer's actual
 * country/currency based on their IP, independent of Shopify's geo-IP.
 */
export function detectCountryFromIp(): Promise<IpDetection> {
  if (ipDetectionCache) return Promise.resolve(ipDetectionCache);
  if (ipDetectionPromise) return ipDetectionPromise;

  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    ipDetectionCache = { countryCode: null, currency: null };
    return Promise.resolve(ipDetectionCache);
  }

  ipDetectionPromise = fetch(`${url}/functions/v1/detect-country`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(4000),
  })
    .then((res) => (res.ok ? res.json() : { countryCode: null, currency: null }))
    .then((data: { countryCode?: string | null; currency?: string | null }) => {
      ipDetectionCache = {
        countryCode: data.countryCode?.toUpperCase() || null,
        currency: data.currency?.toUpperCase() || null,
      };
      return ipDetectionCache;
    })
    .catch(() => {
      ipDetectionCache = { countryCode: null, currency: null };
      return ipDetectionCache;
    });

  return ipDetectionPromise;
}

export function getIpDetectionCache(): IpDetection | null {
  return ipDetectionCache;
}

function fetchCurrencyMap(): Promise<CurrencyMapping[]> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return Promise.resolve([]);
  return fetch(
    `${url}/rest/v1/currency_country_map?select=currency,preferred_country_code,preferred_domain`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
    .then((res) => (res.ok ? res.json() : []))
    .then((rows: CurrencyMapping[]) => {
      mappingCache = rows;
      return rows;
    })
    .catch(() => [] as CurrencyMapping[]);
}

export function preloadCurrencyMap(): Promise<CurrencyMapping[]> {
  if (mappingCache) return Promise.resolve(mappingCache);
  if (!mappingPromise) mappingPromise = fetchCurrencyMap();
  return mappingPromise;
}

async function loadCurrencyMap(): Promise<CurrencyMapping[]> {
  if (mappingCache) return mappingCache;
  return preloadCurrencyMap();
}

async function lookupTargetForCurrency(currency: string): Promise<CurrencyMapping | null> {
  const code = currency?.toUpperCase();
  if (!code) return null;
  const rows = await loadCurrencyMap();
  return rows.find((r) => r.currency === code) || null;
}

async function logCurrencySwitch(payload: Record<string, unknown>) {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    await fetch(`${url}/rest/v1/currency_switches`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort telemetry
  }
}

const SWITCH_ATTEMPT_KEY = 'shadespace_currency_switch_attempt';
const REDIRECT_FAILED_KEY = 'shadespace_currency_redirect_failed';

function getCurrentHost(): string {
  try {
    return window.location.hostname.toLowerCase();
  } catch {
    return '';
  }
}

function domainsEqual(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/^www\./, '').toLowerCase();
  return norm(a) === norm(b);
}

function markSwitchAttempt(signature: string) {
  try {
    sessionStorage.setItem(SWITCH_ATTEMPT_KEY, signature);
  } catch {
    // ignore
  }
}

function alreadyAttempted(signature: string): boolean {
  try {
    return sessionStorage.getItem(SWITCH_ATTEMPT_KEY) === signature;
  } catch {
    return false;
  }
}

function hasRedirectFailed(quoteId: string | null | undefined): boolean {
  if (!quoteId) return false;
  try {
    return sessionStorage.getItem(REDIRECT_FAILED_KEY) === quoteId;
  } catch {
    return false;
  }
}

function markRedirectFailed(quoteId: string | null | undefined) {
  if (!quoteId) return;
  try {
    sessionStorage.setItem(REDIRECT_FAILED_KEY, quoteId);
  } catch {
    // ignore
  }
}

async function logRedirectFailed(payload: Record<string, unknown>) {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    await fetch(`${url}/rest/v1/currency_switch_redirect_failures`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort telemetry
  }
}

export type CurrencyAlignmentResult =
  | { status: 'aligned'; currency: string }
  | { status: 'switching'; targetCountry: string }
  | { status: 'redirecting'; targetDomain: string }
  | { status: 'unsupported'; quoteCurrency: string };

/**
 * Align the Shopify storefront to the quote's currency.
 * - If target domain differs from current, redirect there with params preserved.
 * - If same domain but different country, submit /localization form to switch.
 * - If already aligned, return aligned.
 *
 * Before acting on a mismatch, verifies against independent IP geolocation
 * to avoid false positives from Shopify's geo-IP database being incorrect.
 */
export async function alignStorefrontToCurrency(
  quoteCurrency: string,
  opts: { quoteId?: string | null; triggeredBy?: string } = {}
): Promise<CurrencyAlignmentResult> {
  const target = await lookupTargetForCurrency(quoteCurrency);
  if (!target || !target.preferred_country_code) {
    return { status: 'unsupported', quoteCurrency };
  }

  const shopifyCurrency = (readShopifyCurrency() || '').toUpperCase();
  const shopifyCountry = (readShopifyCountry() || '').toUpperCase();
  const quoteCur = quoteCurrency.toUpperCase();

  if (shopifyCurrency === quoteCur) {
    markCurrencyVerified();
    return { status: 'aligned', currency: shopifyCurrency };
  }

  // Verify against independent IP geolocation before acting on the mismatch.
  // If the customer's real IP-based currency matches the quote currency,
  // Shopify's geo-IP is wrong -- treat as aligned and suppress the popup.
  const ipGeo = await detectCountryFromIp();
  if (ipGeo.currency && ipGeo.currency === quoteCur) {
    markCurrencyVerified();
    return { status: 'aligned', currency: quoteCur };
  }

  const currentHost = getCurrentHost();
  const targetHost = target.preferred_domain;

  // If the URL contains _ab=0&_fd=0, the user was explicitly sent to this domain
  // (e.g., from an email link). Skip cross-domain redirect to avoid a loop with
  // Shopify's geo-IP redirect sending them back here.
  const currentParams = new URLSearchParams(window.location.search);
  const arrivedViaDirectLink = currentParams.get('_ab') === '0' && currentParams.get('_fd') === '0';

  // Cross-domain redirect case
  if (targetHost && !domainsEqual(currentHost, targetHost) && !arrivedViaDirectLink) {
    if (hasRedirectFailed(opts.quoteId)) {
      return { status: 'unsupported', quoteCurrency: quoteCur };
    }
    const sig = `redirect:${targetHost}:${quoteCur}:${opts.quoteId || ''}`;
    if (alreadyAttempted(sig)) {
      return { status: 'aligned', currency: shopifyCurrency };
    }
    markSwitchAttempt(sig);

    void logCurrencySwitch({
      quote_id: opts.quoteId || null,
      quote_currency: quoteCur,
      storefront_currency_before: shopifyCurrency,
      storefront_country_before: shopifyCountry,
      target_country: target.preferred_country_code,
      domain: currentHost,
      triggered_by: `${opts.triggeredBy || 'quote_load'}_redirect`,
      user_agent: navigator.userAgent || '',
    });

    const url = new URL(window.location.href);
    const targetUrl = new URL(`https://${targetHost}${url.pathname}${url.search}${url.hash}`);
    targetUrl.searchParams.set('_ab', '0');
    targetUrl.searchParams.set('_fd', '0');

    const qid = opts.quoteId || null;
    window.setTimeout(() => {
      if (getCurrentHost() && !domainsEqual(getCurrentHost(), targetHost)) {
        markRedirectFailed(qid);
        void logRedirectFailed({
          quote_id: qid,
          quote_currency: quoteCur,
          target_domain: targetHost,
          origin_domain: currentHost,
          user_agent: navigator.userAgent || '',
        });
        try {
          window.dispatchEvent(new CustomEvent('shadespace:currency-redirect-failed', {
            detail: { targetHost, quoteId: qid, quoteCurrency: quoteCur },
          }));
        } catch {
          // ignore
        }
      }
    }, 5000);

    window.location.replace(targetUrl.toString());
    return { status: 'redirecting', targetDomain: targetHost };
  }

  // Same-domain /localization switch
  const sig = `localize:${target.preferred_country_code}:${quoteCur}:${opts.quoteId || ''}`;
  if (alreadyAttempted(sig)) {
    return { status: 'aligned', currency: shopifyCurrency };
  }
  markSwitchAttempt(sig);

  void logCurrencySwitch({
    quote_id: opts.quoteId || null,
    quote_currency: quoteCur,
    storefront_currency_before: shopifyCurrency,
    storefront_country_before: shopifyCountry,
    target_country: target.preferred_country_code,
    domain: currentHost,
    triggered_by: opts.triggeredBy || 'quote_load',
    user_agent: navigator.userAgent || '',
  });

  submitLocalizationForm(target.preferred_country_code);
  return { status: 'switching', targetCountry: target.preferred_country_code };
}

/**
 * Sets a flag on window that the Shopify theme can check to suppress
 * its native geolocation recommendation popup.
 */
function markCurrencyVerified() {
  try {
    (window as any).__shadespace_currency_verified = true;
  } catch {
    // ignore
  }
}

function submitLocalizationForm(countryCode: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/localization';
  form.style.display = 'none';

  const fields: Record<string, string> = {
    _method: 'PUT',
    form_type: 'localization',
    utf8: '\u2713',
    country_code: countryCode,
    return_to: window.location.pathname + window.location.search + window.location.hash,
  };

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

/**
 * Returns true if the live Shopify cart uses a different currency than `expected`.
 * Use as a guard before /cart/add.js.
 *
 * Verifies against independent IP geolocation to avoid false positives
 * when Shopify's geo-IP database is incorrect.
 */
export async function cartCurrencyMismatches(expected: string): Promise<{
  mismatch: boolean;
  cartCurrency: string | null;
  itemCount: number;
}> {
  try {
    const res = await fetch('/cart.js', { credentials: 'same-origin' });
    if (!res.ok) return { mismatch: false, cartCurrency: null, itemCount: 0 };
    const cart = await res.json();
    const cartCurrency: string | null = (cart?.currency || '').toUpperCase() || null;
    const itemCount: number = Number(cart?.item_count || 0);
    if (!cartCurrency) return { mismatch: false, cartCurrency: null, itemCount };

    const expectedUpper = expected.toUpperCase();
    if (cartCurrency === expectedUpper) {
      return { mismatch: false, cartCurrency, itemCount };
    }

    // Cart currency differs from expected -- verify with independent IP geo.
    // If the customer's real IP currency matches expected, Shopify's geo is wrong.
    const ipGeo = await detectCountryFromIp();
    if (ipGeo.currency && ipGeo.currency === expectedUpper) {
      markCurrencyVerified();
      return { mismatch: false, cartCurrency, itemCount };
    }

    return { mismatch: true, cartCurrency, itemCount };
  } catch {
    return { mismatch: false, cartCurrency: null, itemCount: 0 };
  }
}

export async function clearCart(): Promise<boolean> {
  try {
    const res = await fetch('/cart/clear.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    });
    return res.ok;
  } catch {
    return false;
  }
}
