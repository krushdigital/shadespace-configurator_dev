import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CurrencyDetectionResponse {
  currency: string;
  country_code: string;
  country_name: string;
  method: 'cache' | 'api' | 'fallback';
  cached: boolean;
}

interface IPApiResponse {
  currency?: string;
  countryCode?: string;
  country?: string;
  status?: string;
}

interface IpApiComResponse {
  currency?: string;
  countryCode?: string;
  country?: string;
  status?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const ipAddress = url.searchParams.get('ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (ipAddress === 'unknown') {
      throw new Error('Unable to determine IP address');
    }

    const ipHash = await hashIP(ipAddress);

    const isRateLimited = await checkRateLimit(supabase, ipHash);
    if (isRateLimited) {
      await logDetection(supabase, ipHash, null, 'rate_limited', null, false, 'Rate limit exceeded', Date.now() - startTime);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const cachedSession = await checkCache(supabase, ipHash);
    if (cachedSession) {
      await updateLastAccessed(supabase, ipHash);
      await logDetection(supabase, ipHash, cachedSession.currency_code, 'cache', null, true, null, Date.now() - startTime);
      
      return new Response(
        JSON.stringify({
          currency: cachedSession.currency_code,
          country_code: cachedSession.country_code,
          country_name: cachedSession.country_name,
          method: 'cache',
          cached: true,
        } as CurrencyDetectionResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let currencyData = await detectCurrencyFromAPI(ipAddress);
    
    if (currencyData.currency) {
      await saveToCache(supabase, ipHash, currencyData.currency, currencyData.country_code, currencyData.country_name);
      await logDetection(supabase, ipHash, currencyData.currency, 'api', currencyData.api_provider, true, null, Date.now() - startTime);
      
      return new Response(
        JSON.stringify({
          currency: currencyData.currency,
          country_code: currencyData.country_code,
          country_name: currencyData.country_name,
          method: 'api',
          cached: false,
        } as CurrencyDetectionResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const fallbackCurrency = 'USD';
    await logDetection(supabase, ipHash, fallbackCurrency, 'fallback', null, true, 'API detection failed, using fallback', Date.now() - startTime);
    
    return new Response(
      JSON.stringify({
        currency: fallbackCurrency,
        country_code: 'US',
        country_name: 'United States',
        method: 'fallback',
        cached: false,
      } as CurrencyDetectionResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Currency detection error:', error);
    
    return new Response(
      JSON.stringify({
        currency: 'USD',
        country_code: 'US',
        country_name: 'United States',
        method: 'fallback',
        cached: false,
        error: error.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'salt-secret-key');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkRateLimit(supabase: any, ipHash: string): Promise<boolean> {
  const RATE_LIMIT = 10;
  const WINDOW_MINUTES = 60;

  const { data: counter, error } = await supabase
    .from('rate_limit_counters')
    .select('*')
    .eq('ip_address', ipHash)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error:', error);
    return false;
  }

  if (!counter) {
    await supabase.from('rate_limit_counters').insert({
      ip_address: ipHash,
      request_count: 1,
      window_start: new Date().toISOString(),
    });
    return false;
  }

  const windowStart = new Date(counter.window_start);
  const now = new Date();
  const minutesPassed = (now.getTime() - windowStart.getTime()) / (1000 * 60);

  if (minutesPassed >= WINDOW_MINUTES) {
    await supabase
      .from('rate_limit_counters')
      .update({
        request_count: 1,
        window_start: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('ip_address', ipHash);
    return false;
  }

  if (counter.request_count >= RATE_LIMIT) {
    return true;
  }

  await supabase
    .from('rate_limit_counters')
    .update({
      request_count: counter.request_count + 1,
      updated_at: now.toISOString(),
    })
    .eq('ip_address', ipHash);

  return false;
}

async function checkCache(supabase: any, ipHash: string): Promise<any> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('ip_address', ipHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('Cache check error:', error);
    return null;
  }

  return data;
}

async function updateLastAccessed(supabase: any, ipHash: string): Promise<void> {
  await supabase
    .from('user_sessions')
    .update({ last_accessed: new Date().toISOString() })
    .eq('ip_address', ipHash);
}

async function saveToCache(supabase: any, ipHash: string, currency: string, countryCode: string, countryName: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const { error: deleteError } = await supabase
    .from('user_sessions')
    .delete()
    .eq('ip_address', ipHash);

  if (deleteError) {
    console.error('Cache cleanup error:', deleteError);
  }

  const { error: insertError } = await supabase.from('user_sessions').insert({
    ip_address: ipHash,
    currency_code: currency,
    country_code: countryCode,
    country_name: countryName,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    console.error('Cache save error:', insertError);
  }
}

async function detectCurrencyFromAPI(ip: string): Promise<{ currency: string | null; country_code: string; country_name: string; api_provider: string }> {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data: IPApiResponse = await response.json();

    if (data.currency && data.status !== 'fail') {
      return {
        currency: data.currency,
        country_code: data.countryCode || '',
        country_name: data.country || '',
        api_provider: 'ipapi.co',
      };
    }
  } catch (error) {
    console.error('ipapi.co error:', error);
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data: IpApiComResponse = await response.json();

    if (data.currency && data.status !== 'fail') {
      return {
        currency: data.currency,
        country_code: data.countryCode || '',
        country_name: data.country || '',
        api_provider: 'ip-api.com',
      };
    }
  } catch (error) {
    console.error('ip-api.com error:', error);
  }

  return { currency: null, country_code: '', country_name: '', api_provider: 'none' };
}

async function logDetection(
  supabase: any,
  ipHash: string,
  currency: string | null,
  method: string,
  apiProvider: string | null,
  success: boolean,
  errorMessage: string | null,
  responseTimeMs: number
): Promise<void> {
  await supabase.from('currency_detection_logs').insert({
    ip_address: ipHash,
    detected_currency: currency,
    detection_method: method,
    api_provider: apiProvider,
    success: success,
    error_message: errorMessage,
    response_time_ms: responseTimeMs,
  });
}
