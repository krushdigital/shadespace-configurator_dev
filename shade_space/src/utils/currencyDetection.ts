import { createClient } from '@supabase/supabase-js';
import { EXCHANGE_RATES } from '../data/pricing';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

const CACHE_KEY = 'shade_space_currency';
const CACHE_EXPIRY_DAYS = 7;

interface CurrencyCache {
  currency: string;
  country_code: string;
  country_name: string;
  timestamp: number;
}

interface CurrencyDetectionResult {
  currency: string;
  country_code: string;
  country_name: string;
  method: 'localStorage' | 'supabase' | 'api' | 'fallback';
}

export async function detectCurrency(): Promise<CurrencyDetectionResult> {
  const localCache = checkLocalStorageCache();
  if (localCache) {
    return {
      ...localCache,
      method: 'localStorage',
    };
  }

  try {
    const userIP = await getUserIP();
    const ipHash = await hashIP(userIP);

    const supabaseCache = await checkSupabaseCache(ipHash);
    if (supabaseCache) {
      saveToLocalStorage(supabaseCache);
      return {
        ...supabaseCache,
        method: 'supabase',
      };
    }

    const apiResult = await detectFromEdgeFunction(userIP);
    if (apiResult) {
      saveToLocalStorage(apiResult);
      return {
        ...apiResult,
        method: 'api',
      };
    }
  } catch (error) {
    console.error('Currency detection error:', error);
  }

  const fallback = {
    currency: 'USD',
    country_code: 'US',
    country_name: 'United States',
  };
  saveToLocalStorage(fallback);

  return {
    ...fallback,
    method: 'fallback',
  };
}

function checkLocalStorageCache(): CurrencyCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CurrencyCache = JSON.parse(cached);
    const expiryTime = data.timestamp + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    if (Date.now() < expiryTime && EXCHANGE_RATES[data.currency]) {
      return data;
    }

    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.error('localStorage cache check error:', error);
    return null;
  }
}

function saveToLocalStorage(data: { currency: string; country_code: string; country_name: string }): void {
  try {
    const cacheData: CurrencyCache = {
      ...data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('localStorage save error:', error);
  }
}

async function getUserIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.error('IP detection error:', error);
    return 'unknown';
  }
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'salt-secret-key');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkSupabaseCache(ipHash: string): Promise<{ currency: string; country_code: string; country_name: string } | null> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      console.log('Supabase not configured, skipping cache check');
      return null;
    }

    const { data, error } = await client
      .from('user_sessions')
      .select('currency_code, country_code, country_name')
      .eq('ip_address', ipHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('Supabase cache check error:', error);
      return null;
    }

    if (data && EXCHANGE_RATES[data.currency_code]) {
      await client
        .from('user_sessions')
        .update({ last_accessed: new Date().toISOString() })
        .eq('ip_address', ipHash);

      return {
        currency: data.currency_code,
        country_code: data.country_code || '',
        country_name: data.country_name || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Supabase cache error:', error);
    return null;
  }
}

async function detectFromEdgeFunction(ip: string): Promise<{ currency: string; country_code: string; country_name: string } | null> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Supabase not configured, skipping edge function detection');
      return null;
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/detect-currency?ip=${encodeURIComponent(ip)}`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Edge function response not ok:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.currency && EXCHANGE_RATES[data.currency]) {
      return {
        currency: data.currency,
        country_code: data.country_code || '',
        country_name: data.country_name || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Edge function error:', error);
    return null;
  }
}

export function clearCurrencyCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

export function getCachedCurrency(): string | null {
  const cached = checkLocalStorageCache();
  return cached ? cached.currency : null;
}
