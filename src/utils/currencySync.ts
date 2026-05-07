import { readShopifyCurrency, readShopifyCountry } from './currencyDetection';

type CurrencyMapping = {
  currency: string;
  preferred_country_code: string;
  preferred_domain: string;
};

let mappingCache: CurrencyMapping[] | null = null;

async function loadCurrencyMap(): Promise<CurrencyMapping[]> {
  if (mappingCache) return mappingCache;
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const res = await fetch(
      `${url}/rest/v1/currency_country_map?select=currency,preferred_country_code,preferred_domain`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as CurrencyMapping[];
    mappingCache = rows;
    return rows;
  } catch {
    return [];
  }
}

export async function lookupTargetForCurrency(currency: string): Promise<CurrencyMapping | null> {
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
    return { status: 'aligned', currency: shopifyCurrency };
  }

  const currentHost = getCurrentHost();
  const targetHost = target.preferred_domain;

  // Cross-domain redirect case
  if (targetHost && !domainsEqual(currentHost, targetHost)) {
    const sig = `redirect:${targetHost}:${quoteCur}`;
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
    window.location.replace(targetUrl.toString());
    return { status: 'redirecting', targetDomain: targetHost };
  }

  // Same-domain /localization switch
  const sig = `localize:${target.preferred_country_code}:${quoteCur}`;
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
    return {
      mismatch: cartCurrency !== expected.toUpperCase(),
      cartCurrency,
      itemCount,
    };
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
