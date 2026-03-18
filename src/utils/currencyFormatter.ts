import { CURRENCY_SYMBOLS } from '../data/pricing';

// Get currency info from Shopify's global object
declare global {
  interface Window {
    Shopify: {
      currency: {
        active: string;
        rate: string;
      };
    };
  }
}

export function formatCurrency(amount: number, currencyCode?: string): string {
  const displayCurrency = currencyCode || window.Shopify?.currency?.active || 'USD';
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatCurrencyCompact(amount: number, currencyCode?: string): string {
  const displayCurrency = currencyCode || window.Shopify?.currency?.active || 'USD';
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;

  if (amount >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  } else {
    return `${symbol}${amount.toFixed(0)}`;
  }
}

// Helper function to get current user currency info
export function getUserCurrencyInfo() {
  return {
    currency: window.Shopify?.currency?.active || 'USD',
    rate: parseFloat(window.Shopify?.currency?.rate || '1')
  };
}
