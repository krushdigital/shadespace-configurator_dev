import { EXCHANGE_RATES } from '../data/pricing';

const LOCALIZATION_ATTEMPTED_KEY = 'shadespace_localization_attempted_v2';
const LEGACY_SESSION_KEY = 'shadespace_detected_currency';

export function readShopifyCurrency(): string | null {
  const raw = (window as any)?.Shopify?.currency?.active;
  if (typeof raw === 'string' && raw.length > 0) return raw.toUpperCase();
  return null;
}

export function readShopifyCountry(): string | null {
  const raw = (window as any)?.Shopify?.country;
  if (typeof raw === 'string' && raw.length > 0) return raw.toUpperCase();
  return null;
}

export function getShopifyDisplayCurrency(): string {
  const shopifyCurrency = readShopifyCurrency();
  if (shopifyCurrency && EXCHANGE_RATES[shopifyCurrency]) {
    return shopifyCurrency;
  }
  return 'USD';
}

async function fetchIpDetection(): Promise<{ currency: string | null; country: string | null }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return { currency: null, country: null };

    const res = await fetch(`${supabaseUrl}/functions/v1/detect-currency`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return { currency: null, country: null };
    const data = await res.json();
    return {
      currency: typeof data?.currency === 'string' ? data.currency.toUpperCase() : null,
      country: typeof data?.country === 'string' ? data.country.toUpperCase() : null,
    };
  } catch {
    return { currency: null, country: null };
  }
}

async function fetchShopifyMarkets(): Promise<string[] | null> {
  try {
    const res = await fetch('/browsing_context_suggestions.json', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const countries: string[] = [];
    const list = data?.detected_values?.country?.handle
      ? [data.detected_values.country.handle]
      : [];
    for (const c of list) {
      if (typeof c === 'string') countries.push(c.toUpperCase());
    }
    const suggestions = data?.suggestions?.countries;
    if (Array.isArray(suggestions)) {
      for (const entry of suggestions) {
        const code = entry?.handle || entry?.iso_code;
        if (typeof code === 'string') countries.push(code.toUpperCase());
      }
    }
    return countries.length > 0 ? countries : null;
  } catch {
    return null;
  }
}

async function logMismatch(payload: {
  detected_country: string;
  detected_currency: string;
  shopify_country: string;
  shopify_currency: string;
  action_taken: 'localization_switch' | 'no_matching_market' | 'no_change';
}) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;

    await fetch(`${supabaseUrl}/rest/v1/currency_mismatch_events`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // telemetry best-effort only
  }
}

function submitLocalizationForm(countryCode: string) {
  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/localization';
    form.style.display = 'none';

    const addField = (name: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    addField('form_type', 'localization');
    addField('utf8', '✓');
    addField('country_code', countryCode);
    addField('return_to', window.location.pathname + window.location.search);

    document.body.appendChild(form);
    form.submit();
  } catch {
    // swallow - we'll just leave the user on the current market
  }
}

function hasQuoteContext(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('quote') && params.get('token')) return true;
    if (sessionStorage.getItem('shadespace_active_quote')) return true;
  } catch {
    // ignore
  }
  return false;
}

export async function reconcileShopifyMarket(): Promise<void> {
  // Never perform a market redirect when the user is restoring a saved quote —
  // Shopify's localization form submission would reload the page and lose the
  // configurator's in-memory state. The customer can still switch markets manually.
  if (hasQuoteContext()) return;

  try {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }

  try {
    if (sessionStorage.getItem(LOCALIZATION_ATTEMPTED_KEY) === '1') return;
  } catch {
    // ignore
  }

  const shopifyCurrency = readShopifyCurrency();
  const shopifyCountry = readShopifyCountry();

  if (!shopifyCurrency && !shopifyCountry) return;

  const { currency: detectedCurrency, country: detectedCountry } = await fetchIpDetection();
  if (!detectedCountry) return;

  if (!shopifyCountry || detectedCountry === shopifyCountry) {
    return;
  }

  try {
    sessionStorage.setItem(LOCALIZATION_ATTEMPTED_KEY, '1');
  } catch {
    // ignore
  }

  const markets = await fetchShopifyMarkets();
  const marketAvailable = markets ? markets.includes(detectedCountry) : true;

  if (!marketAvailable) {
    await logMismatch({
      detected_country: detectedCountry,
      detected_currency: detectedCurrency ?? '',
      shopify_country: shopifyCountry ?? '',
      shopify_currency: shopifyCurrency ?? '',
      action_taken: 'no_matching_market',
    });
    return;
  }

  await logMismatch({
    detected_country: detectedCountry,
    detected_currency: detectedCurrency ?? '',
    shopify_country: shopifyCountry ?? '',
    shopify_currency: shopifyCurrency ?? '',
    action_taken: 'localization_switch',
  });

  submitLocalizationForm(detectedCountry);
}
