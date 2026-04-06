const TOKEN_STORAGE_KEY = 'shade_configurator_quote_tokens';

export interface QuoteToken {
  quoteId: string;
  accessToken: string;
  quoteName: string;
  quoteReference: string;
  email?: string;
  savedAt: string;
  expiresAt: string;
  pricingLockedUntil?: string;
}

export interface TokenStore {
  tokens: QuoteToken[];
  version: number;
}

function getTokenStore(): TokenStore {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      return { tokens: [], version: 1 };
    }

    const parsed = JSON.parse(stored);
    return {
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
      version: parsed.version || 1,
    };
  } catch (error) {
    console.error('Failed to load token store:', error);
    return { tokens: [], version: 1 };
  }
}

function saveTokenStore(store: TokenStore): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Failed to save token store:', error);
  }
}

export function addQuoteToken(
  quoteId: string,
  accessToken: string,
  quoteName: string,
  quoteReference: string,
  expiresAt: string,
  email?: string,
  pricingLockedUntil?: string
): void {
  const store = getTokenStore();

  const existingIndex = store.tokens.findIndex(t => t.quoteId === quoteId);

  const newToken: QuoteToken = {
    quoteId,
    accessToken,
    quoteName,
    quoteReference,
    email,
    savedAt: new Date().toISOString(),
    expiresAt,
    pricingLockedUntil,
  };

  if (existingIndex >= 0) {
    store.tokens[existingIndex] = newToken;
  } else {
    store.tokens.push(newToken);
  }

  saveTokenStore(store);
}

export function getQuoteToken(quoteId: string): QuoteToken | null {
  const store = getTokenStore();
  const token = store.tokens.find(t => t.quoteId === quoteId);
  return token || null;
}

export function getAllQuoteTokens(email?: string): QuoteToken[] {
  const store = getTokenStore();

  let tokens = store.tokens;

  if (email) {
    tokens = tokens.filter(t => t.email?.toLowerCase() === email.toLowerCase());
  }

  return tokens.sort((a, b) =>
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function getAccessTokens(email?: string): string[] {
  return getAllQuoteTokens(email).map(t => t.accessToken);
}

export function removeQuoteToken(quoteId: string): void {
  const store = getTokenStore();
  store.tokens = store.tokens.filter(t => t.quoteId !== quoteId);
  saveTokenStore(store);
}

export function clearAllTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function cleanupExpiredTokens(_store?: TokenStore): void {
}

export function importQuoteFromUrl(url: string): { quoteId: string; accessToken: string } | null {
  try {
    const urlObj = new URL(url);
    const quoteId = urlObj.searchParams.get('quote');
    const token = urlObj.searchParams.get('token');

    if (!quoteId || !token) {
      return null;
    }

    return { quoteId, accessToken: token };
  } catch (error) {
    console.error('Failed to parse quote URL:', error);
    return null;
  }
}

export function hasTokenForEmail(email: string): boolean {
  return getAllQuoteTokens(email).length > 0;
}

export function getTokenCount(): number {
  const store = getTokenStore();
  return store.tokens.length;
}
