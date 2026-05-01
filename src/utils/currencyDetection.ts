import { EXCHANGE_RATES } from '../data/pricing';

const SESSION_KEY = 'shadespace_detected_currency';

const COUNTRY_EXPECTED_CURRENCIES: { [country: string]: string[] } = {
  NZ: ['NZD'],
  AU: ['AUD'],
  US: ['USD'],
  GB: ['GBP'],
  CA: ['CAD'],
  AE: ['AED'],
  AT: ['EUR'], BE: ['EUR'], CY: ['EUR'], DE: ['EUR'], EE: ['EUR'], ES: ['EUR'],
  FI: ['EUR'], FR: ['EUR'], GR: ['EUR'], HR: ['EUR'], IE: ['EUR'], IT: ['EUR'],
  LT: ['EUR'], LU: ['EUR'], LV: ['EUR'], MT: ['EUR'], NL: ['EUR'], PT: ['EUR'],
  SI: ['EUR'], SK: ['EUR'],
};

function isSupported(code: string | null | undefined): boolean {
  if (!code) return false;
  return Object.prototype.hasOwnProperty.call(EXCHANGE_RATES, code.toUpperCase());
}

function readUrlOverride(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('currency');
    if (override && isSupported(override.toUpperCase())) {
      return override.toUpperCase();
    }
  } catch {
    // ignore
  }
  return null;
}

function readShopifyCurrency(): string | null {
  const raw = (window as any)?.Shopify?.currency?.active;
  if (typeof raw === 'string' && raw.length > 0) return raw.toUpperCase();
  return null;
}

async function fetchIpDetection(): Promise<{ currency: string | null; country: string | null }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return { currency: null, country: null };
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/detect-currency`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return { currency: null, country: null };
    const data = await res.json();
    const currency =
      typeof data?.currency === 'string' ? data.currency.toUpperCase() : null;
    const country =
      typeof data?.country === 'string' ? data.country.toUpperCase() : null;
    return { currency, country };
  } catch {
    return { currency: null, country: null };
  }
}

function reconcileShopifyAndIp(
  shopifyCurrency: string | null,
  ipCurrency: string | null,
  ipCountry: string | null,
): string | null {
  if (!shopifyCurrency && !ipCurrency) return null;

  if (!shopifyCurrency) {
    return isSupported(ipCurrency) ? ipCurrency!.toUpperCase() : 'USD';
  }

  if (!ipCurrency || !ipCountry) {
    return isSupported(shopifyCurrency) ? shopifyCurrency : 'USD';
  }

  const expected = COUNTRY_EXPECTED_CURRENCIES[ipCountry];

  if (expected && expected.includes(shopifyCurrency)) {
    return shopifyCurrency;
  }

  if (expected && !expected.includes(shopifyCurrency)) {
    return isSupported(ipCurrency) ? ipCurrency : 'USD';
  }

  if (isSupported(shopifyCurrency)) return shopifyCurrency;
  if (isSupported(ipCurrency)) return ipCurrency;

  return 'USD';
}

export async function resolveUserCurrency(): Promise<string> {
  const override = readUrlOverride();
  if (override) {
    try {
      sessionStorage.setItem(SESSION_KEY, override);
    } catch {
      // ignore
    }
    return override;
  }

  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached && isSupported(cached)) return cached;
  } catch {
    // ignore
  }

  const shopifyCurrency = readShopifyCurrency();
  const { currency: ipCurrency, country: ipCountry } = await fetchIpDetection();

  let resolved = reconcileShopifyAndIp(shopifyCurrency, ipCurrency, ipCountry);

  if (!resolved || !isSupported(resolved)) {
    resolved = 'USD';
  }

  try {
    sessionStorage.setItem(SESSION_KEY, resolved);
  } catch {
    // ignore
  }

  return resolved;
}
