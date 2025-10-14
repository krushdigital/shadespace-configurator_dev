import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'POST') {
      // Save a new quote
      const { config, calculations, email } = await req.json();

      if (!config || !calculations) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: config and calculations' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Generate unique quote reference
      const { data: refData, error: refError } = await supabase
        .rpc('generate_quote_reference');

      if (refError) {
        throw new Error(`Failed to generate quote reference: ${refError.message}`);
      }

      const quoteReference = refData;

      // Insert the quote
      const { data: quote, error: insertError } = await supabase
        .from('saved_quotes')
        .insert({
          quote_reference: quoteReference,
          customer_email: email || null,
          config_data: config,
          calculations_data: calculations,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to save quote: ${insertError.message}`);
      }

      // If email provided, add to Shopify customers
      let shopifyCustomerId: string | null = null;
      let shopifyCustomerCreated = false;

      if (email) {
        try {
          const shopifyResponse = await fetch(
            `${supabaseUrl}/functions/v1/add-shopify-customer`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email,
                tags: ['quote_saved', 'configurator_user'],
                quoteReference: quoteReference,
                totalPrice: calculations.totalPrice,
                currency: config.currency,
              }),
            }
          );

          const shopifyData = await shopifyResponse.json();

          if (shopifyData.success) {
            shopifyCustomerId = shopifyData.customer.id;
            shopifyCustomerCreated = shopifyData.customer.isNew;

            // Update the quote with Shopify customer ID
            await supabase
              .from('saved_quotes')
              .update({
                shopify_customer_id: shopifyCustomerId,
                source: 'manual_save'
              })
              .eq('id', quote.id);
          }
        } catch (shopifyError) {
          console.error('Failed to add customer to Shopify:', shopifyError);
          // Continue even if Shopify integration fails
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          quote: {
            id: quote.id,
            reference: quote.quote_reference,
            expiresAt: quote.expires_at,
            shopifyCustomerCreated: shopifyCustomerCreated,
            shopifyCustomerId: shopifyCustomerId,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === 'GET') {
      // Retrieve a quote by ID or reference
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      const reference = url.searchParams.get('reference');
      const email = url.searchParams.get('email');

      if (email) {
        // Get all quotes for an email
        const { data: quotes, error } = await supabase
          .from('saved_quotes')
          .select('id, quote_reference, created_at, expires_at, status, config_data, calculations_data')
          .eq('customer_email', email)
          .eq('status', 'saved')
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Failed to retrieve quotes: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, quotes }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      let query = supabase
        .from('saved_quotes')
        .select('*')
        .eq('status', 'saved')
        .gte('expires_at', new Date().toISOString());

      if (id) {
        query = query.eq('id', id);
      } else if (reference) {
        query = query.eq('quote_reference', reference);
      } else {
        return new Response(
          JSON.stringify({ error: 'Missing required parameter: id, reference, or email' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { data: quote, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Quote not found or expired' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw new Error(`Failed to retrieve quote: ${error.message}`);
      }

      // Update last_accessed_at
      await supabase
        .from('saved_quotes')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', quote.id);

      return new Response(
        JSON.stringify({ success: true, quote }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method === 'PATCH') {
      // Update quote status
      const { id, status } = await req.json();

      if (!id || !status) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: id and status' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { error } = await supabase
        .from('saved_quotes')
        .update({ status })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to update quote: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in save-quote function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});