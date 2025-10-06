import { useState, useEffect } from 'react';
import { detectCurrency, getCachedCurrency } from '../utils/currencyDetection';

interface UseCurrencyDetectionResult {
  currency: string;
  isLoading: boolean;
  error: string | null;
  detectionMethod: 'localStorage' | 'supabase' | 'api' | 'fallback' | null;
}

export function useCurrencyDetection(): UseCurrencyDetectionResult {
  const [currency, setCurrency] = useState<string>(() => {
    return getCachedCurrency() || 'USD';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [detectionMethod, setDetectionMethod] = useState<'localStorage' | 'supabase' | 'api' | 'fallback' | null>(null);

  useEffect(() => {
    let isMounted = true;

    const performDetection = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await detectCurrency();

        if (isMounted) {
          setCurrency(result.currency);
          setDetectionMethod(result.method);
          console.log(`Currency detected: ${result.currency} via ${result.method}`);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Currency detection failed';
          setError(errorMessage);
          setCurrency('USD');
          setDetectionMethod('fallback');
          console.error('Currency detection error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    performDetection();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    currency,
    isLoading,
    error,
    detectionMethod,
  };
}
