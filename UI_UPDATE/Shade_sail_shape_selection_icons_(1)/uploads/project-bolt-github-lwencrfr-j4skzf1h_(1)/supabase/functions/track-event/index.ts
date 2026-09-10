import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function lookupGeo(ip: string): Promise<{ country: string; countryCode: string } | null> {
  if (!ip || ip === 'unknown') return null;
  const cleanIp = ip.split(',')[0].trim();
  if (!cleanIp || cleanIp === '127.0.0.1' || cleanIp === '::1') return null;

  try {
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'success') {
      return { country: data.country, countryCode: data.countryCode };
    }
  } catch {
    // geo lookup failure should never block event tracking
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      eventType,
      eventData = {},
      quoteId = null,
      customerEmail = null,
      success = true,
      errorMessage = null,
    } = await req.json();

    if (!eventType) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: eventType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const rawIpHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const customerIp = rawIpHeader === 'unknown' ? 'unknown' : (rawIpHeader.split(',')[0].trim() || 'unknown');

    let deviceType = 'unknown';
    if (userAgent) {
      if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
        deviceType = /ipad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
      } else {
        deviceType = 'desktop';
      }
    }

    const geo = await lookupGeo(customerIp);

    const { data, error } = await supabase
      .from('user_events')
      .insert({
        event_type: eventType,
        event_data: eventData,
        quote_id: quoteId,
        customer_email: customerEmail,
        customer_ip: customerIp,
        customer_ip_raw: rawIpHeader,
        user_agent: userAgent,
        device_type: deviceType,
        success: success,
        error_message: errorMessage,
        customer_country: geo?.country || null,
        customer_country_code: geo?.countryCode || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error tracking event:', error);
      throw new Error(`Failed to track event: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, eventId: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in track-event function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
