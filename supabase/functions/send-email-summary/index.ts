import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Currency symbols mapping
const CURRENCY_SYMBOLS: { [key: string]: string } = {
  'NZD': 'NZ$',
  'USD': 'US$',
  'AUD': 'AU$',
  'GBP': '£',
  'EUR': '€',
  'CAD': 'CA$'
};

// Format currency with proper symbol
function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  return `${symbol}${amount.toFixed(2)}`;
}

// Format measurement
function formatMeasurement(mm: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const inches = mm * 0.0393701;
    if (inches >= 12) {
      const feet = Math.floor(inches / 12);
      const remainingInches = inches % 12;
      return parseFloat(remainingInches.toFixed(1)) > 0
        ? `${feet}'${remainingInches.toFixed(1)}"` 
        : `${feet}'`;
    }
    return `${inches.toFixed(1)}"`;
  }
  return `${Math.round(mm)}mm`;
}

// Format area
function formatArea(mm2: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const sqInches = mm2 * (0.0393701 * 0.0393701);
    const sqFeet = sqInches / 144;
    return sqFeet >= 1 ? `${sqFeet.toFixed(1)} ft²` : `${Math.round(sqInches)} in²`;
  }
  const m2 = mm2 / 1000000;
  return `${m2.toFixed(2)} m²`;
}

// Generate email HTML
function generateEmailHTML(data: any): string {
  const {
    email,
    currency,
    totalPrice,
    selectedFabric,
    selectedColor,
    corners,
    unit,
    area,
    perimeter,
    edgeMeasurements,
    diagonalMeasurementsObj,
    anchorPointMeasurements,
    canvasImage,
    Fabric_Type,
    Edge_Type,
    Wire_Thickness,
    Area,
    Perimeter,
    quoteName,
    customerReference,
    firstName,
    lastName,
    quoteUrl,
    measurementOption,
    hardwareSelectionMode,
    cornerHardware,
    hardwareBreakdown,
    backendEdgeMeasurements,
    backendDiagonalMeasurements,
  } = data;

  const resolvedHardwareMode: 'standard' | 'manual' | 'none' =
    hardwareSelectionMode || (measurementOption === 'adjust' ? 'standard' : 'none');
  const hwLiveTotal = hardwareBreakdown?.hardwareOnlyLivePrice ?? 0;
  const perCornerLive: number[] = hardwareBreakdown?.perCornerLivePrice ?? [];
  const sailDisplay = Math.max(0, totalPrice - Math.round(hwLiveTotal));

  const edgesRows: Array<{ label: string; value: string }> = Array.isArray(backendEdgeMeasurements)
    ? backendEdgeMeasurements.map((m: any) => ({ label: m.label || m.key || '', value: m.value || '' }))
    : (edgeMeasurements && typeof edgeMeasurements === 'object'
        ? Object.entries(edgeMeasurements).map(([k, v]) => ({ label: `Edge ${k}`, value: String(v) }))
        : []);
  const diagonalsRows: Array<{ label: string; value: string }> = Array.isArray(backendDiagonalMeasurements)
    ? backendDiagonalMeasurements.map((m: any) => ({ label: m.label || m.key || '', value: m.value || '' }))
    : (diagonalMeasurementsObj && typeof diagonalMeasurementsObj === 'object'
        ? Object.entries(diagonalMeasurementsObj).map(([k, v]) => ({ label: `Diagonal ${k}`, value: String(v) }))
        : []);

  const formattedPrice = formatCurrency(totalPrice, currency);
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
  const customerName = firstName && lastName ? `${firstName} ${lastName}` : (firstName || '');
  const greeting = customerName ? `Dear ${customerName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShadeSpace Quote Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica', Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #F3FFE3 0%, #BFF102 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #01312D; margin: 0; font-size: 28px;">ShadeSpace</h1>
        <p style="color: #307C31; margin: 5px 0 0 0; font-size: 14px;">Where Cool Spaces Begin</p>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding: 30px 20px;">
        <p style="color: #01312D; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">${greeting}</p>
        <h2 style="color: #01312D; margin: 0 0 10px 0; font-size: 22px;">Your Custom Shade Sail Quote</h2>
        <p style="color: #64748B; margin: 0; font-size: 14px; line-height: 1.6;">
          Thank you for designing your custom shade sail! Here's a summary of your configuration.
        </p>
      </td>
    </tr>

    <!-- Customer & Quote Details -->
    <tr>
      <td style="padding: 0 20px 20px 20px;">
        <div style="background: linear-gradient(135deg, #F3FFE3 0%, #BFF102 100%); border: 2px solid #307C31; border-radius: 10px; padding: 20px;">
          ${customerName ? `
          <div style="margin-bottom: 15px;">
            <div style="color: #307C31; font-size: 10px; font-weight: bold; margin-bottom: 5px;">PREPARED FOR</div>
            <div style="color: #01312D; font-size: 18px; font-weight: bold;">${customerName}</div>
            <div style="color: #64748B; font-size: 12px;">${email}</div>
          </div>
          ` : ''}
          ${quoteName ? `
          <div style="${customerName ? 'padding-top: 15px; border-top: 1px solid #307C31;' : ''}">
            <div style="color: #307C31; font-size: 10px; font-weight: bold; margin-bottom: 5px;">SHADE SAIL NAME</div>
            <div style="color: #01312D; font-size: 20px; font-weight: bold;">${quoteName}</div>
          </div>
          ` : ''}
          ${customerReference ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #307C31;">
            <div style="color: #307C31; font-size: 10px; font-weight: bold; margin-bottom: 5px;">CUSTOMER REFERENCE</div>
            <div style="color: #01312D; font-size: 16px; font-weight: 600;">${customerReference}</div>
          </div>
          ` : ''}
        </div>
      </td>
    </tr>

    <!-- Canvas Preview -->
    ${canvasImage ? `
    <tr>
      <td style="padding: 0 20px 20px 20px;">
        <img src="${canvasImage}" alt="Shade Sail Preview" style="width: 100%; max-width: 560px; height: auto; border-radius: 8px; border: 1px solid #E2E8F0;" />
      </td>
    </tr>
    ` : ''}
    
    <!-- Price Highlight -->
    <tr>
      <td style="padding: 0 20px 30px 20px;">
        <div style="background-color: #01312D; border-radius: 10px; padding: 25px; text-align: center;">
          <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px;">All-Inclusive Price to Your Door</p>
          <p style="background-color: #BFF102; color: #01312D; margin: 0; padding: 15px; border-radius: 8px; font-size: 28px; font-weight: bold;">
            ${formattedPrice}
          </p>
          <ul style="color: #ffffff; margin: 15px 0 0 0; padding: 0; list-style: none; font-size: 12px; line-height: 1.8;">
            <li>✓ Express freight to your door included</li>
            <li>✓ All taxes & duties included</li>
            <li>✓ No hidden costs or tariffs</li>
            <li>✓ Price locked for 30 days from quote date</li>
          </ul>
        </div>
      </td>
    </tr>
    
    <!-- Configuration Details -->
    <tr>
      <td style="padding: 0 20px 20px 20px;">
        <h3 style="color: #01312D; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #BFF102; padding-bottom: 8px;">Configuration Summary</h3>
        <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Fabric Material:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${Fabric_Type}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Fabric Color:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${selectedColor?.name || 'N/A'}</td>
          </tr>
          ${selectedColor?.shadeFactor != null ? `
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Shade Factor:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${selectedColor.shadeFactor}%</td>
          </tr>
          ` : ''}
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Edge Type:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${Edge_Type}</td>
          </tr>
          ${Wire_Thickness && Wire_Thickness !== 'N/A' ? `
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Wire Thickness:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${Wire_Thickness}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Number of Corners:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${corners}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Total Area:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${Area}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Total Perimeter:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${Perimeter}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Currency:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${currency} (${currencySymbol})</td>
          </tr>
        </table>
      </td>
    </tr>
    
    ${(edgesRows.length > 0 || diagonalsRows.length > 0) ? `
    <!-- Precise Measurements -->
    <tr>
      <td style="padding: 0 20px 20px 20px;">
        <h3 style="color: #01312D; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #BFF102; padding-bottom: 8px;">Precise Measurements</h3>
        <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
          ${edgesRows.map(m => `
          <tr>
            <td style="color: #64748B; padding: 6px 0; border-bottom: 1px solid #E2E8F0;">${m.label}:</td>
            <td style="color: #01312D; font-weight: 600; padding: 6px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${m.value}</td>
          </tr>
          `).join('')}
          ${diagonalsRows.map(m => `
          <tr>
            <td style="color: #64748B; padding: 6px 0; border-bottom: 1px solid #E2E8F0;">${m.label}:</td>
            <td style="color: #01312D; font-weight: 600; padding: 6px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${m.value}</td>
          </tr>
          `).join('')}
        </table>
      </td>
    </tr>
    ` : ''}

    ${resolvedHardwareMode === 'manual' && cornerHardware ? `
    <!-- Corner Hardware Breakdown -->
    <tr>
      <td style="padding: 0 20px 20px 20px;">
        <h3 style="color: #01312D; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #BFF102; padding-bottom: 8px;">Corner Hardware Breakdown</h3>
        ${Array.from({ length: corners }, (_, i) => {
          const letter = String.fromCharCode(65 + i);
          const lines = cornerHardware[i] || cornerHardware[String(i)] || [];
          const cornerLive = perCornerLive[i] ?? 0;
          return `
          <div style="padding: 10px 0; border-bottom: 1px solid #E2E8F0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color: #01312D; font-weight: bold; font-size: 14px;">Corner ${letter}</td>
                <td style="color: #01312D; font-weight: bold; font-size: 14px; text-align: right;">${formatCurrency(cornerLive, currency)}</td>
              </tr>
            </table>
            ${lines.length === 0 ? '<div style="padding-left: 12px; font-size: 12px; color: #64748B;">No hardware selected</div>' : (lines as any[]).map(line => {
              const skuPart = line.sku ? ` (${line.sku})` : '';
              const lineLive = line.livePriceCurrency === currency && line.livePrice != null
                ? line.livePrice * line.qty
                : 0;
              return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 4px;">
                <tr>
                  <td style="padding-left: 12px; font-size: 12px; color: #64748B;">${line.qty}x ${line.name}${skuPart}</td>
                  <td style="font-size: 12px; color: #64748B; text-align: right;">${formatCurrency(lineLive, currency)}</td>
                </tr>
              </table>`;
            }).join('')}
          </div>`;
        }).join('')}
      </td>
    </tr>
    ` : ''}

    ${hardwareBreakdown ? `
    <!-- Price Breakdown -->
    <tr>
      <td style="padding: 0 20px 20px 20px;">
        <h3 style="color: #01312D; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #BFF102; padding-bottom: 8px;">Price Breakdown</h3>
        <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Shade sail:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${formatCurrency(sailDisplay, currency)}</td>
          </tr>
          ${resolvedHardwareMode === 'standard' ? `
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Hardware Tensioning Kit:</td>
            <td style="color: #307C31; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">Included</td>
          </tr>
          ` : ''}
          ${resolvedHardwareMode === 'manual' && hwLiveTotal > 0 ? `
          <tr>
            <td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">Corner hardware:</td>
            <td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0;">${formatCurrency(hwLiveTotal, currency)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="color: #01312D; font-weight: bold; padding: 10px 0; border-top: 2px solid #01312D;">Total:</td>
            <td style="color: #01312D; font-weight: bold; padding: 10px 0; text-align: right; border-top: 2px solid #01312D;">${formatCurrency(totalPrice, currency)}</td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}

    <!-- Warranty -->
    <tr>
      <td style="padding: 0 20px 30px 20px;">
        <div style="background: linear-gradient(135deg, #F3FFE3 0%, #BFF102 20%); border: 2px solid #307C31; border-radius: 10px; padding: 20px;">
          <h3 style="color: #01312D; margin: 0 0 10px 0; font-size: 16px;">Premium Quality Guarantee</h3>
          <ul style="color: #307C31; margin: 0; padding: 0 0 0 20px; font-size: 12px; line-height: 1.8;">
            <li>${selectedFabric?.warrantyYears || 10}-year Fabric & Workmanship Warranty</li>
            <li>Weather-resistant materials and UV protection</li>
            <li>Professional installation guide included</li>
            <li>Free worldwide shipping with no hidden costs</li>
          </ul>
        </div>
      </td>
    </tr>
    

    ${quoteUrl ? `
    <!-- Resume Your Quote -->
    <tr>
      <td style="padding: 0 20px 30px 20px;">
        <div style="background-color: #307C31; border-radius: 10px; padding: 25px; text-align: center;">
          <h3 style="color: #ffffff; margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">Resume Your Quote & Add to Cart</h3>
          <p style="color: #ffffff; margin: 0 0 18px 0; font-size: 13px; opacity: 0.9;">
            Click below to return to your saved configuration, review your details, and add to cart when you are ready.
          </p>
          <a href="${quoteUrl}" style="display: inline-block; background-color: #307C31; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">Resume & Add to Cart</a>
          <p style="color: #ffffff; margin: 12px 0 0 0; font-size: 11px; opacity: 0.7;">
            Your price is locked for 30 days from the quote date.
          </p>
        </div>
      </td>
    </tr>
    ` : `
    <!-- CTA Button -->
    <tr>
      <td style="padding: 0 20px 30px 20px; text-align: center;">
        <a href="https://shadespace.com" style="display: inline-block; background-color: #307C31; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">Complete Your Order</a>
      </td>
    </tr>
    `}

    <!-- Footer -->
    <tr>
      <td style="background-color: #F8FAFC; padding: 20px; text-align: center; font-size: 12px; color: #64748B;">
        <p style="margin: 0 0 10px 0;">Your detailed PDF quote is attached to this email.</p>
        ${quoteUrl ? `<p style="margin: 0 0 10px 0;"><a href="${quoteUrl}" style="color: #307C31; text-decoration: underline;">Click here to resume your quote</a></p>` : ''}
        <p style="margin: 0;">Questions? Visit <a href="https://shadespace.com" style="color: #307C31; text-decoration: none;">shadespace.com</a></p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await req.json();
    const { email, pdf, currency, totalPrice } = data;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add customer to Shopify
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    let shopifyCustomerId: string | null = null;
    let shopifyCustomerCreated = false;

    if (supabaseUrl && supabaseKey) {
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
              firstName: data.firstName || null,
              lastName: data.lastName || null,
              tags: ['quote_saved', 'email_pdf_quote_requested'],
              totalPrice: totalPrice,
              currency: currency,
            }),
          }
        );

        const shopifyData = await shopifyResponse.json();

        if (shopifyData.success) {
          shopifyCustomerId = shopifyData.customer.id;
          shopifyCustomerCreated = shopifyData.customer.isNew;
        }
      } catch (shopifyError) {
        console.error('Failed to add customer to Shopify:', shopifyError);
      }
    }

    // Generate email HTML with proper currency formatting
    const emailHTML = generateEmailHTML(data);

    // Get email credentials from environment
    const SMTP_HOST = Deno.env.get('SMTP_HOST');
    const SMTP_PORT = Deno.env.get('SMTP_PORT');
    const SMTP_USER = Deno.env.get('SMTP_USER');
    const SMTP_PASS = Deno.env.get('SMTP_PASS');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'sails@shadespace.com';

    // console.log({SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL})

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error('SMTP credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured. Please contact support.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email would be sent to:', email);
    console.log('Currency:', currency);
    console.log('Total Price:', formatCurrency(totalPrice, currency));

    // Track email summary event
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('npm:@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.from('user_events').insert({
          event_type: 'email_pdf_quote',
          event_data: {
            totalPrice: totalPrice,
            currency: currency,
            corners: data.corners || null,
            fabricType: data.Fabric_Type || null,
            quoteName: data.quoteName || null,
            customerReference: data.customerReference || null,
            customerName: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : null,
            sent_by: 'edge_function',
            shopifyCustomerCreated: shopifyCustomerCreated
          },
          customer_email: email,
          device_type: 'server',
          customer_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
          user_agent: req.headers.get('user-agent') || null,
          success: true
        });

        console.log('Email summary event tracked successfully');
      }
    } catch (trackError) {
      console.error('Failed to track email event:', trackError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `PDF quote sent to ${email}`,
        shopifyCustomerCreated: shopifyCustomerCreated,
        shopifyCustomerId: shopifyCustomerId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});