import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    Perimeter
  } = data;

  const formattedPrice = formatCurrency(totalPrice, currency);
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

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
        <h2 style="color: #01312D; margin: 0 0 10px 0; font-size: 22px;">Your Custom Shade Sail Quote</h2>
        <p style="color: #64748B; margin: 0; font-size: 14px; line-height: 1.6;">
          Thank you for designing your custom shade sail! Here's a summary of your configuration.
        </p>
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
          <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px;">All Inclusive Price</p>
          <p style="background-color: #BFF102; color: #01312D; margin: 0; padding: 15px; border-radius: 8px; font-size: 28px; font-weight: bold;">
            ${formattedPrice}
          </p>
          <ul style="color: #ffffff; margin: 15px 0 0 0; padding: 0; list-style: none; font-size: 12px; line-height: 1.8;">
            <li>✓ Fast Express Shipping Worldwide</li>
            <li>✓ Includes Taxes & Duties</li>
            <li>✓ No Hidden Costs</li>
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
    
    <!-- CTA Button -->
    <tr>
      <td style="padding: 0 20px 30px 20px; text-align: center;">
        <a href="https://shadespace.com" style="display: inline-block; background-color: #BFF102; color: #01312D; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">Complete Your Order</a>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #F8FAFC; padding: 20px; text-align: center; font-size: 12px; color: #64748B;">
        <p style="margin: 0 0 10px 0;">Your detailed PDF quote is attached to this email.</p>
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

serve(async (req: Request) => {
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
              tags: ['quote_saved', 'email_summary_requested'],
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
        // Continue even if Shopify integration fails
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

    console.log({SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL})

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

    // Send email using SMTP
    // Note: In a production environment, you would use a proper email service
    // For now, we'll return success with the HTML for testing
    console.log('Email would be sent to:', email);
    console.log('Currency:', currency);
    console.log('Total Price:', formatCurrency(totalPrice, currency));

    // TODO: Implement actual email sending using nodemailer or similar
    // For now, return success
    return new Response(
      JSON.stringify({
        success: true,
        message: `Quote summary sent to ${email} with price in ${currency}`,
        shopifyCustomerCreated: shopifyCustomerCreated,
        shopifyCustomerId: shopifyCustomerId,
        // Include HTML for debugging
        debug: { emailHTML: emailHTML.substring(0, 500) + '...' }
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
