import { ConfiguratorState, ShadeCalculations } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface SavedQuote {
  id: string;
  reference: string;
  expiresAt: string;
}

export interface QuoteData {
  id: string;
  quote_reference: string;
  customer_email?: string;
  config_data: ConfiguratorState;
  calculations_data: ShadeCalculations;
  created_at: string;
  expires_at: string;
  status: string;
}

/**
 * Save a quote to the database
 */
export async function saveQuote(
  config: ConfiguratorState,
  calculations: ShadeCalculations,
  email?: string
): Promise<SavedQuote> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/save-quote`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config,
      calculations,
      email: email || null,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to save quote');
  }

  return {
    id: data.quote.id,
    reference: data.quote.reference,
    expiresAt: data.quote.expiresAt,
  };
}

/**
 * Retrieve a quote by ID
 */
export async function getQuoteById(id: string): Promise<QuoteData> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/save-quote?id=${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to retrieve quote');
  }

  return data.quote;
}

/**
 * Retrieve a quote by reference number
 */
export async function getQuoteByReference(reference: string): Promise<QuoteData> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/save-quote?reference=${encodeURIComponent(reference)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to retrieve quote');
  }

  return data.quote;
}

/**
 * Retrieve all quotes for an email address
 */
export async function getQuotesByEmail(email: string): Promise<QuoteData[]> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/save-quote?email=${encodeURIComponent(email)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to retrieve quotes');
  }

  return data.quotes;
}

/**
 * Update quote status (e.g., mark as completed)
 */
export async function updateQuoteStatus(
  id: string,
  status: 'saved' | 'completed' | 'expired'
): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/save-quote`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, status }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to update quote status');
  }
}

/**
 * Generate a shareable quote URL
 */
export function generateQuoteUrl(quoteId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}${window.location.pathname}?quote=${quoteId}`;
}

/**
 * Get quote ID from URL if present
 */
export function getQuoteIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('quote');
}

/**
 * Format expiration date for display
 */
export function formatExpirationDate(expiresAt: string): string {
  const date = new Date(expiresAt);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if quote is expired
 */
export function isQuoteExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
