import { useState, useEffect } from 'react';

export interface PricingSetting {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  market_markup: number;
  zonos_dhl_markup: number;
  exchange_rate: number;
  is_active: boolean;
  display_order: number;
  updated_at: string;
  created_at: string;
}

interface PricingSettingsState {
  settings: PricingSetting[];
  settingsMap: Record<string, PricingSetting>;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const CACHE_DURATION_MS = 5 * 60 * 1000;

let cachedSettings: PricingSetting[] | null = null;
let cachedSettingsMap: Record<string, PricingSetting> | null = null;
let cacheTimestamp: number | null = null;

const DEFAULT_SETTINGS: Record<string, Omit<PricingSetting, 'id' | 'created_at' | 'updated_at'>> = {
  NZD: { currency_code: 'NZD', currency_name: 'New Zealand Dollar', currency_symbol: 'NZ$', market_markup: 1.00, zonos_dhl_markup: 1.00, exchange_rate: 1.00, is_active: true, display_order: 1 },
  USD: { currency_code: 'USD', currency_name: 'US Dollar', currency_symbol: 'US$', market_markup: 1.30, zonos_dhl_markup: 1.00, exchange_rate: 0.58, is_active: true, display_order: 2 },
  AUD: { currency_code: 'AUD', currency_name: 'Australian Dollar', currency_symbol: 'AU$', market_markup: 0.90, zonos_dhl_markup: 1.00, exchange_rate: 0.88, is_active: true, display_order: 3 },
  GBP: { currency_code: 'GBP', currency_name: 'British Pound', currency_symbol: '£', market_markup: 1.68, zonos_dhl_markup: 1.00, exchange_rate: 0.43, is_active: true, display_order: 4 },
  EUR: { currency_code: 'EUR', currency_name: 'Euro', currency_symbol: '€', market_markup: 1.652, zonos_dhl_markup: 1.00, exchange_rate: 0.50, is_active: true, display_order: 5 },
  CAD: { currency_code: 'CAD', currency_name: 'Canadian Dollar', currency_symbol: 'CA$', market_markup: 1.30, zonos_dhl_markup: 1.00, exchange_rate: 0.81, is_active: true, display_order: 6 },
  AED: { currency_code: 'AED', currency_name: 'UAE Dirham', currency_symbol: 'AED', market_markup: 2.10, zonos_dhl_markup: 1.00, exchange_rate: 2.19, is_active: true, display_order: 7 },
};

function buildSettingsMap(settings: PricingSetting[]): Record<string, PricingSetting> {
  const map: Record<string, PricingSetting> = {};
  for (const s of settings) {
    map[s.currency_code] = s;
  }
  return map;
}

function getDefaultSettingsArray(): PricingSetting[] {
  return Object.values(DEFAULT_SETTINGS).map((s) => ({
    ...s,
    id: '',
    created_at: '',
    updated_at: '',
  })) as PricingSetting[];
}

export function usePricingSettings(): PricingSettingsState & { refetch: () => Promise<void> } {
  const [state, setState] = useState<PricingSettingsState>(() => {
    if (cachedSettings && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      console.log('📦 Using cached pricing settings:', cachedSettings); // ADDED
      return {
        settings: cachedSettings,
        settingsMap: cachedSettingsMap!,
        loading: false,
        error: null,
        lastFetched: cacheTimestamp,
      };
    }
    const defaults = getDefaultSettingsArray();
    console.log('⚠️ No cache, using defaults:', defaults); // ADDED
    return {
      settings: defaults,
      settingsMap: buildSettingsMap(defaults),
      loading: true,
      error: null,
      lastFetched: null,
    };
  });

  const fetchSettings = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      console.log('🌐 Fetching pricing settings from:', `${supabaseUrl}/functions/v1/pricing-settings`); // ADDED

      const response = await fetch(`${supabaseUrl}/functions/v1/pricing-settings`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 API Response:', data); // ADDED

      if (data.success && data.settings?.length > 0) {
        const settings = data.settings.map((s: PricingSetting) => ({
          ...s,
          market_markup: Number(s.market_markup),
          zonos_dhl_markup: Number(s.zonos_dhl_markup),
          exchange_rate: Number(s.exchange_rate),
        }));
        const settingsMap = buildSettingsMap(settings);

        console.log('✅ Processed settings:', settings); // ADDED
        console.log('✅ Settings map:', settingsMap); // ADDED

        cachedSettings = settings;
        cachedSettingsMap = settingsMap;
        cacheTimestamp = Date.now();

        setState({
          settings,
          settingsMap,
          loading: false,
          error: null,
          lastFetched: Date.now(),
        });
      } else {
        throw new Error('No pricing settings returned');
      }
    } catch (err) {
      console.error('❌ Failed to fetch pricing settings, using defaults:', err);
      const defaults = getDefaultSettingsArray();
      setState((prev) => ({
        ...prev,
        settings: prev.settings.length > 0 ? prev.settings : defaults,
        settingsMap: Object.keys(prev.settingsMap).length > 0 ? prev.settingsMap : buildSettingsMap(defaults),
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  };

  useEffect(() => {
    if (cachedSettings && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      console.log('📦 Using cached settings in useEffect'); // ADDED
      setState({
        settings: cachedSettings,
        settingsMap: cachedSettingsMap!,
        loading: false,
        error: null,
        lastFetched: cacheTimestamp,
      });
      return;
    }
    console.log('🔄 Fetching fresh settings'); // ADDED
    fetchSettings();
  }, []);

  return { ...state, refetch: fetchSettings };
}

export function getPricingForCurrency(
  settingsMap: Record<string, PricingSetting>,
  currencyCode: string
): { marketMarkup: number; zonosDhlMarkup: number; exchangeRate: number; symbol: string } {
  console.log('🎯 getPricingForCurrency called with:', { currencyCode, settingsMapKeys: Object.keys(settingsMap) }); // ADDED
  
  const setting = settingsMap[currencyCode] || settingsMap['USD'];
  console.log('📦 Selected setting:', setting); // ADDED
  
  if (!setting) {
    console.log('⚠️ No setting found, using fallback'); // ADDED
    return { marketMarkup: 1.30, zonosDhlMarkup: 1.00, exchangeRate: 0.58, symbol: 'US$' };
  }
  
  const result = {
    marketMarkup: setting.market_markup,
    zonosDhlMarkup: setting.zonos_dhl_markup,
    exchangeRate: setting.exchange_rate,
    symbol: setting.currency_symbol,
  };
  
  console.log('✅ Returning:', result); // ADDED
  return result;
}