import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import Puppeteer for headless browser PDF generation
import puppeteer from "npm:puppeteer@21.5.0"

interface ConfiguratorState {
  fabricType: string;
  fabricColor: string;
  edgeType: string;
  corners: number;
  unit: 'metric' | 'imperial';
  measurementOption: 'adjust' | 'exact';
  measurements: { [key: string]: number };
  fixingHeights: number[];
  fixingTypes?: ('post' | 'building')[];
  eyeOrientations?: ('horizontal' | 'vertical')[];
  currency: string;
}

interface ShadeCalculations {
  area: number;
  perimeter: number;
  fabricCost: number;
  edgeCost: number;
  hardwareCost: number;
  totalPrice: number;
  webbingWidth: number;
  wireThickness?: number;
}

interface PDFRequest {
  config: ConfiguratorState;
  calculations: ShadeCalculations;
}

// Fabric data (simplified version)
const FABRICS = [
  {
    id: 'monotec370',
    label: 'Monotec 370',
    uvProtection: '95%+',
    warrantyYears: 15,
    madeIn: 'Australia'
  },
  {
    id: 'extrablock330',
    label: 'ExtraBlock 330',
    uvProtection: '98%+',
    warrantyYears: 10,
    madeIn: 'South Africa'
  },
  {
    id: 'shadetec320',
    label: 'Shadetec 320',
    uvProtection: '90%+',
    warrantyYears: 10,
    madeIn: 'South Korea'
  }
];

// Utility functions
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

function formatArea(mm2: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const sqInches = mm2 * (0.0393701 * 0.0393701);
    const sqFeet = sqInches / 144;
    return sqFeet >= 1 ? `${sqFeet.toFixed(1)} ft²` : `${Math.round(sqInches)} in²`;
  }
  const m2 = mm2 / 1000000;
  return `${m2.toFixed(2)} m²`;
}

function formatCurrency(amount: number, currencyCode: string): string {
  const symbols: { [key: string]: string } = {
    'NZD': 'NZ$',
    'USD': 'US$',
    'AUD': 'AU$',
    'GBP': '£',
    'EUR': '€',
    'CAD': 'CA$'
  };
  const symbol = symbols[currencyCode] || currencyCode;
  return `${symbol}${amount.toFixed(2)}`;
}

function formatWeight(totalWeightGrams: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const pounds = (totalWeightGrams / 1000) * 2.20462;
    return `${pounds.toFixed(1)} lb`;
  } else {
    const kilograms = totalWeightGrams / 1000;
    return `${kilograms.toFixed(1)} kg`;
  }
}

function generateHTMLContent(config: ConfiguratorState, calculations: ShadeCalculations): string {
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Hardware pack image mapping
  const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
    3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
    4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
    5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
    6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
  };
  
   // Determine if it's ExtraBlock with non-FR color
   const isExtrablockNonFRColor = selectedFabric?.id === 'extrablock330' && 
     config.fabricColor && 
     ['Yellow', 'Red', 'Cream', 'Beige'].includes(config.fabricColor);
   
  // Determine if fabric color is fire retardant
  const isFireRetardant = selectedFabric?.id === 'extrablock330' && 
    config.fabricColor && 
    !['Yellow', 'Red', 'Cream', 'Beige'].includes(config.fabricColor);

  // Generate edge measurements
  const edgeMeasurements = [];
  for (let i = 0; i < config.corners; i++) {
    const nextIndex = (i + 1) % config.corners;
    const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
    const measurement = config.measurements[edgeKey];
    edgeMeasurements.push({
      label: `Edge ${String.fromCharCode(65 + i)} to ${String.fromCharCode(65 + nextIndex)}`,
      value: measurement ? formatMeasurement(measurement, config.unit) : 'Not provided'
    });
  }

  // Generate diagonal measurements
  const diagonalMeasurements = [];
  if (config.corners >= 4) {
    const diagonalKeys = [];
    if (config.corners === 4) {
      diagonalKeys.push('AC', 'BD');
    } else if (config.corners === 5) {
      diagonalKeys.push('AC', 'AD', 'AE', 'BD', 'BE');
    } else if (config.corners === 6) {
      diagonalKeys.push('AC', 'AD', 'AE', 'BD', 'BE', 'BF', 'CE', 'CF', 'DF');
    }
    
    diagonalKeys.forEach(key => {
      if (config.measurements[key]) {
        diagonalMeasurements.push({
          label: `Diagonal ${key.charAt(0)} to ${key.charAt(1)}`,
          value: formatMeasurement(config.measurements[key], config.unit)
        });
      }
    });
  }

  // Generate anchor point details
  const anchorPoints = [];
  for (let i = 0; i < config.corners; i++) {
    const corner = String.fromCharCode(65 + i);
    const height = config.fixingHeights[i];
    const type = config.fixingTypes?.[i] || 'post';
    const orientation = config.eyeOrientations?.[i] || 'horizontal';
    
    anchorPoints.push({
      corner,
      height: height && height > 0 ? formatMeasurement(height, config.unit) : 'Not set',
      type,
      orientation
    });
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShadeSpace Quote</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Helvetica', Arial, sans-serif;
            line-height: 1.6;
            color: #1E293B;
            background: white;
        }
        
        .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
            page-break-after: always;
        }
        
        .header {
            background: linear-gradient(135deg, #F3FFE3 0%, #BFF102 100%);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            position: relative;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #01312D;
            margin-bottom: 5px;
        }
        
        .tagline {
            color: #307C31;
            font-size: 12px;
        }
        
        .quote-info {
            position: absolute;
            top: 20px;
            right: 20px;
            text-align: right;
        }
        
        .quote-info h2 {
            color: #01312D;
            font-size: 16px;
            margin-bottom: 5px;
        }
        
        .quote-info p {
            color: #64748B;
            font-size: 11px;
        }
        
        .main-title {
            font-size: 28px;
            font-weight: bold;
            color: #01312D;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #01312D;
            margin-bottom: 15px;
            border-bottom: 2px solid #BFF102;
            padding-bottom: 5px;
        }
        
        .config-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .config-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #E2E8F0;
        }
        
        .config-label {
            color: #64748B;
            font-weight: 500;
        }
        
        .config-value {
            color: #01312D;
            font-weight: bold;
        }
        
        .measurements-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .measurement-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 15px;
        }
        
        .measurement-card h3 {
            color: #307C31;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .measurement-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 11px;
        }
        
        .measurement-label {
            color: #64748B;
        }
        
        .measurement-value {
            color: #01312D;
            font-weight: bold;
        }
        
        .anchor-points {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 15px;
        }
        
        .anchor-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #E2E8F0;
        }
        
        .anchor-item:last-child {
            border-bottom: none;
        }
        
        .anchor-corner {
            font-weight: bold;
            color: #01312D;
        }
        
        .anchor-details {
            color: #64748B;
            font-size: 11px;
        }
        
        .guarantee-section {
            background: linear-gradient(135deg, #F3FFE3 0%, #BFF102 20%);
            border: 2px solid #307C31;
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
        }
        
        .guarantee-title {
            color: #01312D;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .guarantee-list {
            list-style: none;
            color: #307C31;
        }
        
        .guarantee-list li {
            margin-bottom: 5px;
            font-size: 12px;
        }
        
        .guarantee-list li:before {
            content: "✓ ";
            font-weight: bold;
            margin-right: 5px;
        }
        
        .price-section {
            background: #01312D;
            color: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        
        .price-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .price-amount {
            background: #BFF102;
            color: #01312D;
            font-size: 24px;
            font-weight: bold;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
        }
        
        .price-features {
            list-style: none;
            margin-top: 15px;
        }
        
        .price-features li {
            margin-bottom: 5px;
            font-size: 12px;
        }
        
        .price-features li:before {
            content: "• ";
            margin-right: 5px;
        }
        
        .footer {
            background: #F8FAFC;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin-top: 40px;
            font-size: 10px;
            color: #64748B;
        }
        
        @media print {
            .page {
                margin: 0;
                padding: 15mm;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <!-- Header -->
        <div class="header">
            <div class="logo">ShadeSpace</div>
            <div class="tagline">Where Cool Spaces Begin</div>
            <div class="quote-info">
                <h2>Quote Generated</h2>
                <p>${date}</p>
                <p>Quote ID: SS-${Date.now()}</p>
            </div>
        </div>
        
        <!-- Main Title -->
        <h1 class="main-title">Custom Shade Sail Quote</h1>
        
        <!-- Configuration Summary -->
        <div class="section">
            <h2 class="section-title">Shade Sail Summary</h2>
            <div class="config-grid">
                <div class="config-item">
                    <span class="config-label">Fabric Material:</span>
                    <span class="config-value">${selectedFabric?.label || 'Not selected'}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Fabric Color:</span>
                    <span class="config-value">
                        ${config.fabricColor || 'Not selected'}
                        ${isExtrablockNonFRColor ? '<span style="color: #DC2626; font-size: 10px; background: #FEE2E2; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">(Not FR Certified)</span>' : ''}
                    </span>
                </div>
                <div class="config-item">
                    <span class="config-label">Fabric Made In:</span>
                    <span class="config-value">${selectedFabric?.madeIn || 'Not specified'}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Warranty:</span>
                    <span class="config-value">${selectedFabric ? `${selectedFabric.warrantyYears} Years` : 'Not specified'}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Fire Retardant:</span>
                    <span class="config-value">${isFireRetardant ? 'Yes' : isExtrablockNonFRColor ? 'No (Selected color is not FR certified)' : 'No'}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Edge Reinforcement:</span>
                    <span class="config-value">${config.edgeType === 'webbing' ? 'Webbing Reinforced' : config.edgeType === 'cabled' ? 'Cabled Edge' : 'Not selected'}</span>
                </div>
                ${config.edgeType === 'webbing' ? `
                <div class="config-item">
                    <span class="config-label">Webbing Width:</span>
                    <span class="config-value">
                        ${config.unit === 'imperial' 
                          ? `${(calculations.webbingWidth * 0.0393701).toFixed(2)}"`
                          : `${calculations.webbingWidth}mm`
                        }
                    </span>
                </div>
                ` : ''}
                ${config.edgeType === 'cabled' && calculations.wireThickness ? `
                <div class="config-item">
                    <span class="config-label">Wire Thickness:</span>
                    <span class="config-value">
                        ${config.unit === 'imperial' 
                          ? `${(calculations.wireThickness * 0.0393701).toFixed(2)}"`
                          : `${calculations.wireThickness}mm`
                        }
                    </span>
                </div>
                ` : ''}
                <div class="config-item">
                    <span class="config-label">Number of Corners:</span>
                    <span class="config-value">${config.corners}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Total Area:</span>
                    <span class="config-value">${formatArea(calculations.area * 1000000, config.unit)}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Total Perimeter:</span>
                    <span class="config-value">${formatMeasurement(calculations.perimeter * 1000, config.unit)}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Total Weight:</span>
                    <span class="config-value">${formatWeight(calculations.totalWeightGrams, config.unit)}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Measurement Units:</span>
                    <span class="config-value">${config.unit === 'metric' ? 'Metric (mm/m)' : 'Imperial (in/ft)'}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Manufacturing Option:</span>
                    <span class="config-value">${config.measurementOption === 'adjust' ? 'Adjust to fit space (hardware included)' : 'Exact dimensions (hardware not included)'}</span>
                </div>
                ${config.measurementOption === 'adjust' ? `
                <div class="config-item">
                    <span class="config-label">Hardware Included:</span>
                    <span class="config-value">
                        Yes - Turnbuckles & Shackles
                        ${HARDWARE_PACK_IMAGES[config.corners] ? `
                        <img src="${HARDWARE_PACK_IMAGES[config.corners]}" 
                             alt="${config.corners} Corner Hardware Pack" 
                             style="width: 20px; height: 20px; margin-left: 8px; border-radius: 3px; border: 1px solid #E2E8F0; vertical-align: middle; object-fit: cover;" />
                        ` : ''}
                    </span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Measurements -->
        <div class="section">
            <h2 class="section-title">Precise Measurements</h2>
            <div class="measurements-grid">
                <div class="measurement-card">
                    <h3>Edge Lengths</h3>
                    ${edgeMeasurements.map(m => `
                        <div class="measurement-item">
                            <span class="measurement-label">${m.label}:</span>
                            <span class="measurement-value">${m.value}</span>
                        </div>
                    `).join('')}
                </div>
                ${diagonalMeasurements.length > 0 ? `
                <div class="measurement-card">
                    <h3>Diagonal Lengths</h3>
                    ${diagonalMeasurements.map(m => `
                        <div class="measurement-item">
                            <span class="measurement-label">${m.label}:</span>
                            <span class="measurement-value">${m.value}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Anchor Points -->
        <div class="section">
            <h2 class="section-title">Anchor Point Configuration</h2>
            <div class="anchor-points">
                ${anchorPoints.map(point => `
                    <div class="anchor-item">
                        <span class="anchor-corner">Corner ${point.corner}:</span>
                        <span class="anchor-details">${point.height} (${point.type}, ${point.orientation} eye)</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Premium Quality Guarantee -->
        <div class="guarantee-section">
            <div class="guarantee-title">Premium Quality Guarantee</div>
            <ul class="guarantee-list">
                <li>${selectedFabric?.warrantyYears || 10}-year Fabric & Workmanship Warranty</li>
                <li>Weather-resistant materials and UV protection</li>
                <li>Professional installation guide included</li>
                <li>Free worldwide shipping with no hidden costs</li>
            </ul>
        </div>
        
        <!-- Pricing -->
        <div class="price-section">
            <div class="price-title">Shade Sail Price</div>
            <div class="price-amount">All Inclusive Price: ${formatCurrency(calculations.totalPrice, config.currency)}</div>
            <ul class="price-features">
                <li>Includes Fast Express Shipping Worldwide To Your Door</li>
                <li>Includes Taxes & Duties</li>
                <li>No Hidden Costs</li>
            </ul>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Generated by ShadeSpace Professional Configurator</p>
            <p>Visit shadespace.com for more information</p>
            <p>Configuration saved: ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>
  `;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { config, calculations }: PDFRequest = await req.json()

    if (!config || !calculations) {
      return new Response(
        JSON.stringify({ error: 'Missing config or calculations data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Starting PDF generation for config:', config.corners, 'corners')

    // Generate HTML content
    const htmlContent = generateHTMLContent(config, calculations)

    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // Set content and wait for it to load
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    })

    await browser.close()

    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    // Return PDF as response
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ShadeSpace-Quote-${new Date().toISOString().slice(0, 10)}-${Date.now()}.pdf"`
      }
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate PDF', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})