import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    // Extract request metadata
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const customerIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Determine device type from user agent
    let deviceType = 'unknown';
    if (userAgent) {
      if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
        deviceType = /ipad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
      } else {
        deviceType = 'desktop';
      }
    }

    // Track event using database function
    const { data, error } = await supabase.rpc('track_user_event', {
      p_event_type: eventType,
      p_event_data: eventData,
      p_quote_id: quoteId,
      p_customer_email: customerEmail,
      p_customer_ip: customerIp,
      p_user_agent: userAgent,
      p_device_type: deviceType,
      p_success: success,
      p_error_message: errorMessage,
    });

    if (error) {
      console.error('Error tracking event:', error);
      throw new Error(`Failed to track event: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, eventId: data }),
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