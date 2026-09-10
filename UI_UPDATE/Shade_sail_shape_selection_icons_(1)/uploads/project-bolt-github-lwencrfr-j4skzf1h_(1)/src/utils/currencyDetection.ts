import { EXCHANGE_RATES } from '../data/pricing';

const CLIENT_ID_KEY = 'shadespace_client_id';

const LEGACY_KEYS = [
  'shadespace_detected_currency',
  'shadespace_localization_attempted_v2',
  'shadespace_localization_attempted_v3',
  'shadespace_localization_attempted_at_v3',
  'shadespace_user_selected_market',
];

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

function clearLegacyFlags() {
  for (const key of LEGACY_KEYS) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  }
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

async function recordManualSelection(country: string, currency: string) {
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
    // best effort analytics only
  }
}

export function installLocalizationFormInterceptor() {
  try {
    if ((window as any).__shadespaceLocalizationInterceptorInstalled) return;
    (window as any).__shadespaceLocalizationInterceptorInstalled = true;

    clearLegacyFlags();

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
          void recordManualSelection(country, currency);
        }
      },
      true
    );
  } catch {
    // ignore
  }
}
