import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const url = new URL(req.url);
    const tokens = url.searchParams.get('tokens');

    if (!tokens) {
      return new Response(
        JSON.stringify({ error: 'Tokens parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse tokens array from JSON string
    let tokenArray: string[];
    try {
      tokenArray = JSON.parse(tokens);
      if (!Array.isArray(tokenArray) || tokenArray.length === 0) {
        throw new Error('Tokens must be a non-empty array');
      }
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid tokens format. Must be a JSON array of token strings.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const searchText = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'saved';
    const fabricType = url.searchParams.get('fabricType');
    const corners = url.searchParams.get('corners');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    // Retrieve all quotes matching the provided tokens
    let query = supabase
      .from('saved_quotes')
      .select('*', { count: 'exact' })
      .in('access_token', tokenArray);

    if (status === 'active') {
      query = query
        .eq('status', 'saved')
        .gte('expires_at', new Date().toISOString());
    } else if (status === 'expiring') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      query = query
        .eq('status', 'saved')
        .lte('expires_at', sevenDaysFromNow.toISOString())
        .gte('expires_at', new Date().toISOString());
    } else if (status === 'expired') {
      query = query.lt('expires_at', new Date().toISOString());
    } else if (status === 'completed') {
      query = query.eq('status', 'completed');
    } else if (status === 'all') {
      // No status filter
    } else {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: allQuotes, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch quotes: ${fetchError.message}`);
    }

    let filteredQuotes = allQuotes || [];

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filteredQuotes = filteredQuotes.filter(quote =>
        quote.quote_name?.toLowerCase().includes(searchLower) ||
        quote.customer_reference?.toLowerCase().includes(searchLower) ||
        quote.quote_reference?.toLowerCase().includes(searchLower)
      );
    }

    if (fabricType) {
      filteredQuotes = filteredQuotes.filter(quote =>
        quote.config_data?.fabricType === fabricType
      );
    }

    if (corners) {
      const cornerCount = parseInt(corners);
      filteredQuotes = filteredQuotes.filter(quote =>
        quote.config_data?.corners === cornerCount
      );
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      filteredQuotes = filteredQuotes.filter(quote =>
        quote.calculations_data?.totalPrice >= min
      );
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      filteredQuotes = filteredQuotes.filter(quote =>
        quote.calculations_data?.totalPrice <= max
      );
    }

    filteredQuotes.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'expires_at':
          aVal = new Date(a.expires_at).getTime();
          bVal = new Date(b.expires_at).getTime();
          break;
        case 'price':
          aVal = a.calculations_data?.totalPrice || 0;
          bVal = b.calculations_data?.totalPrice || 0;
          break;
        case 'quote_name':
          aVal = a.quote_name?.toLowerCase() || '';
          bVal = b.quote_name?.toLowerCase() || '';
          break;
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    const totalFiltered = filteredQuotes.length;
    const totalPages = Math.ceil(totalFiltered / pageSize);

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedQuotes = filteredQuotes.slice(startIndex, endIndex);

    const stats = {
      total: totalFiltered,
      active: filteredQuotes.filter(q =>
        q.status === 'saved' && new Date(q.expires_at) > new Date()
      ).length,
      expiring: filteredQuotes.filter(q => {
        const expiresAt = new Date(q.expires_at);
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        return q.status === 'saved' && expiresAt > now && expiresAt <= sevenDaysFromNow;
      }).length,
      expired: filteredQuotes.filter(q =>
        new Date(q.expires_at) < new Date()
      ).length,
      completed: filteredQuotes.filter(q => q.status === 'completed').length,
    };

    return new Response(
      JSON.stringify({
        success: true,
        quotes: paginatedQuotes,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalResults: totalFiltered,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        stats,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in search-quotes function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );