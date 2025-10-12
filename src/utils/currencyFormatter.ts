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
  // Use user's browser currency if available, fallback to provided currency
  const userCurrency = window.Shopify?.currency?.active || currencyCode || 'USD';
  const exchangeRate = parseFloat(window.Shopify?.currency?.rate || '1');
  
  // Convert amount using Shopify's rate
  const convertedAmount = amount * exchangeRate;
  
  const symbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
  return `${symbol}${convertedAmount.toFixed(2)}`;
}

export function formatCurrencyCompact(amount: number, currencyCode?: string): string {
  const userCurrency = window.Shopify?.currency?.active || currencyCode || 'USD';
  const exchangeRate = parseFloat(window.Shopify?.currency?.rate || '1');
  
  const convertedAmount = amount * exchangeRate;
  const symbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
  
  if (convertedAmount >= 1000000) {
    return `${symbol}${(convertedAmount / 1000000).toFixed(1)}M`;
  } else if (convertedAmount >= 1000) {
    return `${symbol}${(convertedAmount / 1000).toFixed(1)}K`;
  } else {
    return `${symbol}${convertedAmount.toFixed(0)}`;
  }
}

// Helper function to get current user currency info
export function getUserCurrencyInfo() {
  return {
    currency: window.Shopify?.currency?.active || 'USD',
    rate: parseFloat(window.Shopify?.currency?.rate || '1')
  };
}
