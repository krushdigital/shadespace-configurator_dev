import { EXCHANGE_RATES } from '../data/pricing';

const LOCALIZATION_ATTEMPTED_KEY = 'shadespace_localization_attempted_v3';
const LOCALIZATION_ATTEMPTED_AT_KEY = 'shadespace_localization_attempted_at_v3';
const USER_SELECTED_MARKET_KEY = 'shadespace_user_selected_market';
const CLIENT_ID_KEY = 'shadespace_client_id';
const LEGACY_SESSION_KEY = 'shadespace_detected_currency';
const LEGACY_V2_KEY = 'shadespace_localization_attempted_v2';

const RECONCILE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

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

function getOrCreateClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = (crypto as any)?.randomUUID
        ? (crypto as any).randomUUID()
        : `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }
}

function hasQuoteParam(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return !!(params.get('quote') || params.get('token'));
  } catch {
    return false;
  }
}

function readLocalManualChoice(): { country: string; currency: string } | null {
  try {
    const raw = localStorage.getItem(USER_SELECTED_MARKET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.country === 'string') {
      return { country: parsed.country.toUpperCase(), currency: String(parsed.currency || '').toUpperCase() };
    }
    return null;
  } catch {
    return null;
  }
}

function writeLocalManualChoice(country: string, currency: string) {
  try {
    localStorage.setItem(
      USER_SELECTED_MARKET_KEY,
      JSON.stringify({ country: country.toUpperCase(), currency: currency.toUpperCase(), at: Date.now() })
    );
  } catch {
    // ignore
  }
}

async function fetchSupabasePreference(clientId: string): Promise<{ country: string; currency: string } | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;

    const url = `${supabaseUrl}/rest/v1/user_currency_preferences?client_id=eq.${encodeURIComponent(clientId)}&select=country_code,currency_code,expires_at&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const row = rows[0];
    if (row?.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
    return {
      country: String(row.country_code || '').toUpperCase(),
      currency: String(row.currency_code || '').toUpperCase(),
    };
  } catch {
    return null;
  }
}

async function upsertSupabasePreference(country: string, currency: string) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;

    const clientId = getOrCreateClientId();
    const payload = {
      client_id: clientId,
      country_code: country.toUpperCase(),
      currency_code: currency.toUpperCase(),
      user_agent: navigator.userAgent || '',
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await fetch(`${supabaseUrl}/rest/v1/user_currency_preferences?on_conflict=client_id`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // best effort
  }
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
  action_taken: 'localization_switch' | 'no_matching_market' | 'no_change' | 'skipped_user_preference' | 'skipped_quote_link' | 'skipped_cooldown';
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
    // swallow
  }
}

export function recordManualMarketChoice(country: string, currency: string) {
  if (!country) return;
  writeLocalManualChoice(country, currency);
  try {
    localStorage.setItem(LOCALIZATION_ATTEMPTED_KEY, '1');
    localStorage.setItem(LOCALIZATION_ATTEMPTED_AT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
  void upsertSupabasePreference(country, currency);
}

export function installLocalizationFormInterceptor() {
  try {
    if ((window as any).__shadespaceLocalizationInterceptorInstalled) return;
    (window as any).__shadespaceLocalizationInterceptorInstalled = true;

    document.addEventListener(
      'submit',
      (e) => {
        const target = e.target as HTMLFormElement | null;
        if (!target || target.tagName !== 'FORM') return;
        const action = (target.getAttribute('action') || '').toLowerCase();
        if (!action.includes('/localization')) return;

        const typeField = target.querySelector('input[name="form_type"]') as HTMLInputElement | null;
        if (typeField && typeField.value !== 'localization') return;

        const countryField = target.querySelector('input[name="country_code"]') as HTMLInputElement | null;
        const country = countryField?.value?.toUpperCase() || '';
        if (country) {
          const currency = readShopifyCurrency() || '';
          recordManualMarketChoice(country, currency);
        }
      },
      true
    );
  } catch {
    // ignore
  }
}

export async function reconcileShopifyMarket(): Promise<void> {
  try {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    sessionStorage.removeItem(LEGACY_V2_KEY);
  } catch {
    // ignore
  }

  const shopifyCurrency = readShopifyCurrency();
  const shopifyCountry = readShopifyCountry();

  if (hasQuoteParam()) {
    await logMismatch({
      detected_country: '',
      detected_currency: '',
      shopify_country: shopifyCountry ?? '',
      shopify_currency: shopifyCurrency ?? '',
      action_taken: 'skipped_quote_link',
    });
    return;
  }

  const localChoice = readLocalManualChoice();
  if (localChoice?.country) {
    await logMismatch({
      detected_country: '',
      detected_currency: '',
      shopify_country: shopifyCountry ?? '',
      shopify_currency: shopifyCurrency ?? '',
      action_taken: 'skipped_user_preference',
    });
    return;
  }

  try {
    if (localStorage.getItem(LOCALIZATION_ATTEMPTED_KEY) === '1') {
      const attemptedAt = Number(localStorage.getItem(LOCALIZATION_ATTEMPTED_AT_KEY) || '0');
      if (attemptedAt && Date.now() - attemptedAt < RECONCILE_COOLDOWN_MS) {
        await logMismatch({
          detected_country: '',
          detected_currency: '',
          shopify_country: shopifyCountry ?? '',
          shopify_currency: shopifyCurrency ?? '',
          action_taken: 'skipped_cooldown',
        });
        return;
      }
    }
  } catch {
    // ignore
  }

  const clientId = getOrCreateClientId();
  const remotePref = await fetchSupabasePreference(clientId);
  if (remotePref?.country) {
    writeLocalManualChoice(remotePref.country, remotePref.currency);
    await logMismatch({
      detected_country: '',
      detected_currency: '',
      shopify_country: shopifyCountry ?? '',
      shopify_currency: shopifyCurrency ?? '',
      action_taken: 'skipped_user_preference',
    });
    return;
  }

  if (!shopifyCurrency && !shopifyCountry) return;

  const { currency: detectedCurrency, country: detectedCountry } = await fetchIpDetection();
  if (!detectedCountry) return;

  if (!shopifyCountry || detectedCountry === shopifyCountry) {
    return;
  }

  try {
    localStorage.setItem(LOCALIZATION_ATTEMPTED_KEY, '1');
    localStorage.setItem(LOCALIZATION_ATTEMPTED_AT_KEY, String(Date.now()));
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
