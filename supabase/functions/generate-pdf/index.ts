import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import Puppeteer for headless browser PDF generation
import puppeteer from "npm:puppeteer@21.5.0"

interface CornerHardwareLine {
  catalog_id?: string;
  catalogId?: string;
  name: string;
  sku?: string;
  qty: number;
  priceNzd: number;
  livePrice?: number;
  livePriceCurrency?: string;
}

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
  fixingPointsInstalled?: boolean;
  currency: string;
  quoteName?: string;
  customerReference?: string;
  hardwareSelectionMode?: 'standard' | 'manual' | 'none';
  cornerHardware?: { [cornerIndex: number]: CornerHardwareLine[] };
}

interface ShadeCalculations {
  area: number;
  perimeter: number;
  fabricCost: number;
  edgeCost: number;
  hardwareCost: number;
  hardwareBreakdown?: {
    mode: 'standard' | 'manual' | 'none';
    subtotalNzd: number;
    perCornerNzd: number[];
    sailOnlyPriceNzd: number;
    hardwareOnlyPriceNzd: number;
    liveCurrency?: string;
    hardwareOnlyLivePrice?: number;
    perCornerLivePrice?: number[];
    standardPackLivePrice?: number | null;
  };
  totalPrice: number;
  webbingWidth: number;
  wireThickness?: number;
  totalWeightGrams?: number;
}

interface PDFRequest {
  config: ConfiguratorState;
  calculations: ShadeCalculations;
  quoteId?: string;
  accessToken?: string;
}

interface QuoteContext {
  id: string;
  accessToken: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerEmail: string | null;
  quoteReference: string | null;
  quoteName: string | null;
  customerReference: string | null;
  diagramPublicUrl: string | null;
  createdAt: string | null;
}

const PUBLIC_APP_BASE = 'https://shadespace.com/pages/shade-sail-configurator';

function buildResumeUrl(quoteId: string, accessToken: string): string {
  return `${PUBLIC_APP_BASE}?quote=${encodeURIComponent(quoteId)}&token=${encodeURIComponent(accessToken)}`;
}

async function fetchQuoteContext(quoteId?: string, accessToken?: string): Promise<QuoteContext | null> {
  if (!quoteId) return null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return null;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await supabase
      .from('saved_quotes')
      .select('id, access_token, customer_first_name, customer_last_name, customer_email, quote_reference, quote_name, customer_reference, diagram_public_url, created_at')
      .eq('id', quoteId)
      .maybeSingle();
    if (!data) return null;
    const token = accessToken || data.access_token;
    return {
      id: data.id,
      accessToken: token,
      customerFirstName: data.customer_first_name,
      customerLastName: data.customer_last_name,
      customerEmail: data.customer_email,
      quoteReference: data.quote_reference,
      quoteName: data.quote_name,
      customerReference: data.customer_reference,
      diagramPublicUrl: data.diagram_public_url,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.warn('[generate-pdf] Failed to fetch quote context:', err);
    return null;
  }
}

interface FabricRecord {
  id: string;
  label: string;
  uvProtection: string;
  warrantyYears: number;
  madeIn: string;
}

interface FabricColorRecord {
  fabricId: string;
  name: string;
  isFireRetardant: boolean;
  shadeFactor: number | null;
}

type PdfBlockType =
  | 'summary'
  | 'measurements'
  | 'anchorPoints'
  | 'hardwareBreakdown'
  | 'priceBreakdown'
  | 'guarantee'
  | 'pricingCallout'
  | 'quoteMeta'
  | 'diagramImage'
  | 'billOfMaterials'
  | 'resumeButton'
  | 'customText'
  | 'customImage'
  | 'customHtml'
  | 'divider'
  | 'spacer';

interface PdfBlock {
  id: string;
  type: PdfBlockType;
  visible: boolean;
  props: Record<string, unknown>;
}

interface PdfTemplate {
  brand: {
    primaryColor: string;
    accentColor: string;
    accentDark: string;
    textColor: string;
    mutedColor: string;
    backgroundColor: string;
    logoUrl: string;
    fontFamily: string;
  };
  header: { title: string; tagline: string };
  footer: { line1: string; line2: string };
  sections: {
    showSummary: boolean;
    showMeasurements: boolean;
    showAnchorPoints: boolean;
    showHardwareBreakdown: boolean;
    showPriceBreakdown: boolean;
    showGuarantee: boolean;
    showPricingCallout: boolean;
  };
  paper: 'A4' | 'Letter';
  blocks: PdfBlock[];
}

function sanitizeCustomHtml(html: string): string {
  if (!html) return '';
  let out = html;
  out = out.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  out = out.replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, '');
  out = out.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/javascript:/gi, '');
  return out;
}

function escapeHtmlText(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] as string));
}

const DEFAULT_BLOCKS_ORDER: PdfBlock[] = [
  { id: 'b-quoteMeta', type: 'quoteMeta', visible: true, props: { title: 'Quote Details' } },
  { id: 'b-diagram', type: 'diagramImage', visible: true, props: { title: 'Shade Sail Diagram', maxWidth: 520 } },
  { id: 'b-summary', type: 'summary', visible: true, props: { title: 'Shade Sail Summary' } },
  { id: 'b-measurements', type: 'measurements', visible: true, props: { title: 'Precise Measurements' } },
  { id: 'b-anchor', type: 'anchorPoints', visible: true, props: { title: 'Anchor Point Configuration' } },
  { id: 'b-hardware', type: 'hardwareBreakdown', visible: true, props: { title: 'Corner Hardware Breakdown' } },
  { id: 'b-bom', type: 'billOfMaterials', visible: true, props: { title: 'Itemised Bill of Materials' } },
  { id: 'b-price', type: 'priceBreakdown', visible: true, props: { title: 'Price Breakdown' } },
  { id: 'b-guarantee', type: 'guarantee', visible: true, props: { title: 'Premium Quality Guarantee' } },
  { id: 'b-callout', type: 'pricingCallout', visible: true, props: { title: 'All-Inclusive Price to Your Door' } },
  { id: 'b-resume', type: 'resumeButton', visible: true, props: { title: 'Resume Your Quote & Add to Cart', label: 'Open My Saved Quote' } },
];

const DEFAULT_PDF_TEMPLATE: PdfTemplate = {
  brand: {
    primaryColor: '#01312D',
    accentColor: '#BFF102',
    accentDark: '#307C31',
    textColor: '#01312D',
    mutedColor: '#64748B',
    backgroundColor: '#FFFFFF',
    logoUrl: '',
    fontFamily: 'Helvetica, Arial, sans-serif',
  },
  header: { title: 'Custom Shade Sail Quote', tagline: 'Where Cool Spaces Begin' },
  footer: {
    line1: 'Generated by ShadeSpace Professional Configurator',
    line2: 'Visit shadespace.com for more information',
  },
  sections: {
    showSummary: true,
    showMeasurements: true,
    showAnchorPoints: true,
    showHardwareBreakdown: true,
    showPriceBreakdown: true,
    showGuarantee: true,
    showPricingCallout: true,
  },
  paper: 'A4',
  blocks: DEFAULT_BLOCKS_ORDER,
};

function normalizeBlocks(input: unknown): PdfBlock[] {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_BLOCKS_ORDER;
  return input
    .filter((b) => b && typeof b === 'object')
    .map((raw) => {
      const b = raw as Partial<PdfBlock>;
      return {
        id: typeof b.id === 'string' && b.id ? b.id : Math.random().toString(36).slice(2, 10),
        type: (b.type as PdfBlockType) || 'customText',
        visible: b.visible !== false,
        props: (b.props && typeof b.props === 'object' ? b.props : {}) as Record<string, unknown>,
      };
    });
}

async function fetchActiveTemplate(): Promise<PdfTemplate> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return DEFAULT_PDF_TEMPLATE;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await supabase
      .from('pdf_templates')
      .select('config, blocks')
      .eq('is_active', true)
      .maybeSingle();
    if (!data) return DEFAULT_PDF_TEMPLATE;
    const cfg = (data.config || {}) as Partial<PdfTemplate>;
    return {
      brand: { ...DEFAULT_PDF_TEMPLATE.brand, ...(cfg.brand || {}) },
      header: { ...DEFAULT_PDF_TEMPLATE.header, ...(cfg.header || {}) },
      footer: { ...DEFAULT_PDF_TEMPLATE.footer, ...(cfg.footer || {}) },
      sections: { ...DEFAULT_PDF_TEMPLATE.sections, ...(cfg.sections || {}) },
      paper: (cfg.paper as 'A4' | 'Letter') || DEFAULT_PDF_TEMPLATE.paper,
      blocks: normalizeBlocks(data.blocks),
    };
  } catch (err) {
    console.warn('[generate-pdf] Failed to fetch active template, using defaults:', err);
    return DEFAULT_PDF_TEMPLATE;
  }
}

async function fetchFabricContext(
  fabricType: string | undefined,
  fabricColor: string | undefined,
): Promise<{ fabric: FabricRecord | null; color: FabricColorRecord | null }> {
  if (!fabricType) return { fabric: null, color: null };
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return { fabric: null, color: null };

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: fabricRow } = await supabase
      .from('fabric_catalog')
      .select('id, label, uv_protection, warranty_years, made_in')
      .eq('id', fabricType)
      .maybeSingle();

    const fabric: FabricRecord | null = fabricRow
      ? {
          id: fabricRow.id,
          label: fabricRow.label,
          uvProtection: fabricRow.uv_protection,
          warrantyYears: Number(fabricRow.warranty_years) || 10,
          madeIn: fabricRow.made_in,
        }
      : null;

    let color: FabricColorRecord | null = null;
    if (fabricColor) {
      const { data: colorRow } = await supabase
        .from('fabric_colors')
        .select('fabric_type_id, color_name, is_fire_retardant, shade_factor')
        .eq('fabric_type_id', fabricType)
        .eq('color_name', fabricColor)
        .maybeSingle();
      if (colorRow) {
        color = {
          fabricId: colorRow.fabric_type_id,
          name: colorRow.color_name,
          isFireRetardant: !!colorRow.is_fire_retardant,
          shadeFactor: colorRow.shade_factor == null ? null : Number(colorRow.shade_factor),
        };
      }
    }

    if (!fabric) {
      console.warn(`[generate-pdf] Unknown fabric id "${fabricType}" — catalog lookup failed`);
    }

    return { fabric, color };
  } catch (err) {
    console.warn('[generate-pdf] Fabric catalog fetch error:', err);
    return { fabric: null, color: null };
  }
}

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

async function generateHTMLContent(
  config: ConfiguratorState,
  calculations: ShadeCalculations,
  quote: QuoteContext | null,
): Promise<string> {
  const [{ fabric: selectedFabric, color: selectedColor }, template] = await Promise.all([
    fetchFabricContext(config.fabricType, config.fabricColor),
    fetchActiveTemplate(),
  ]);
  const resumeUrl = quote ? buildResumeUrl(quote.id, quote.accessToken) : null;
  const brand = template.brand;
  const sections = template.sections;
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
  
  // Fire-retardant status comes from the catalog color record (admin-managed).
  const isFireRetardant = !!selectedColor?.isFireRetardant;
  const isNonFRColor = !!selectedColor && !selectedColor.isFireRetardant;

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

  // Hardware + price breakdown calculations
  const resolvedHardwareMode: 'standard' | 'manual' | 'none' =
    config.hardwareSelectionMode || (config.measurementOption === 'adjust' ? 'standard' : 'none');
  const hwBreakdown = calculations.hardwareBreakdown;
  const hwLiveTotal = hwBreakdown?.hardwareOnlyLivePrice ?? 0;
  const perCornerLive = hwBreakdown?.perCornerLivePrice ?? [];
  const sailDisplay = Math.max(0, calculations.totalPrice - Math.round(hwLiveTotal));

  const titleOf = (block: PdfBlock, fallback: string) =>
    typeof block.props?.title === 'string' && block.props.title ? String(block.props.title) : fallback;

  const renderSummary = (block: PdfBlock) => `
        <div class="section">
            <h2 class="section-title">${escapeHtmlText(titleOf(block, 'Shade Sail Summary'))}</h2>
            <div class="config-grid">
                <div class="config-item">
                    <span class="config-label">Fabric Material:</span>
                    <span class="config-value">${selectedFabric?.label || 'Not selected'}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Fabric Color:</span>
                    <span class="config-value">
                        ${config.fabricColor || 'Not selected'}
                        ${isNonFRColor ? '<span style="color: #DC2626; font-size: 10px; background: #FEE2E2; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">(Not FR Certified)</span>' : ''}
                    </span>
                </div>
                ${selectedColor?.shadeFactor != null ? `
                <div class="config-item">
                    <span class="config-label">Shade Factor:</span>
                    <span class="config-value">${selectedColor.shadeFactor}%</span>
                </div>
                ` : ''}
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
                    <span class="config-value">${isFireRetardant ? 'Yes' : isNonFRColor ? 'No (Selected color is not FR certified)' : 'No'}</span>
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
                    <span class="config-value">${formatWeight(calculations.totalWeightGrams ?? 0, config.unit)}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Measurement Units:</span>
                    <span class="config-value">${config.unit === 'metric' ? 'Metric (mm/m)' : 'Imperial (in/ft)'}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Manufacturing Option:</span>
                    <span class="config-value">${config.measurementOption === 'adjust' ? 'Adjust to fit space' : 'Exact dimensions'}</span>
                </div>
                ${(() => {
                  const mode = config.hardwareSelectionMode || (config.measurementOption === 'adjust' ? 'standard' : 'none');
                  if (mode === 'standard') {
                    return `
                <div class="config-item">
                    <span class="config-label">Tensioning Hardware Included:</span>
                    <span class="config-value">
                        Yes - Hardware Tensioning Kit
                        ${HARDWARE_PACK_IMAGES[config.corners] ? `
                        <img src="${HARDWARE_PACK_IMAGES[config.corners]}"
                             alt="${config.corners} Corner Hardware Pack"
                             style="width: 20px; height: 20px; margin-left: 8px; border-radius: 3px; border: 1px solid #E2E8F0; vertical-align: middle; object-fit: cover;" />
                        ` : ''}
                    </span>
                </div>`;
                  }
                  if (mode === 'manual') {
                    return `
                <div class="config-item">
                    <span class="config-label">Tensioning Hardware:</span>
                    <span class="config-value">Manual per corner (see breakdown below)</span>
                </div>`;
                  }
                  return '';
                })()}
                <div class="config-item">
                    <span class="config-label">Fixing Points Installed:</span>
                    <span class="config-value">${config.fixingPointsInstalled === true ? 'Yes - Already Installed' : config.fixingPointsInstalled === false ? 'No - Planning Installation' : 'Not specified'}</span>
                </div>
            </div>
        </div>`;

  const renderMeasurements = (block: PdfBlock) => `
        <div class="section">
            <h2 class="section-title">${escapeHtmlText(titleOf(block, 'Precise Measurements'))}</h2>
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
        </div>`;

  const renderAnchor = (block: PdfBlock) => `
        <div class="section">
            <h2 class="section-title">${escapeHtmlText(titleOf(block, 'Anchor Point Configuration'))}</h2>
            <div class="anchor-points">
                ${anchorPoints.map(point => `
                    <div class="anchor-item">
                        <span class="anchor-corner">Corner ${point.corner}:</span>
                        <span class="anchor-details">${point.height} (${point.type}, ${point.orientation} eye)</span>
                    </div>
                `).join('')}
            </div>
        </div>`;

  const renderHardwareBreakdown = (block: PdfBlock) => {
    if (resolvedHardwareMode !== 'manual' || !config.cornerHardware) return '';
    return `
        <div class="section">
            <h2 class="section-title">${escapeHtmlText(titleOf(block, 'Corner Hardware Breakdown'))}</h2>
            <div class="anchor-points">
                ${Array.from({ length: config.corners }, (_, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const lines = (config.cornerHardware && config.cornerHardware[i]) || [];
                  const cornerLive = perCornerLive[i] ?? 0;
                  return `
                  <div style="padding: 10px 0; border-bottom: 1px solid #E2E8F0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span class="anchor-corner">Corner ${letter}</span>
                      <span class="anchor-corner">${formatCurrency(cornerLive, config.currency)}</span>
                    </div>
                    ${lines.length === 0 ? '<div class="anchor-details" style="padding-left: 12px;">No hardware selected</div>' : lines.map(line => {
                      const skuPart = line.sku ? ` (${line.sku})` : '';
                      const lineLive = line.livePriceCurrency === config.currency && line.livePrice != null
                        ? line.livePrice * line.qty
                        : 0;
                      return `<div style="display: flex; justify-content: space-between; padding-left: 12px; font-size: 11px; color: #64748B;">
                        <span>${line.qty}x ${line.name}${skuPart}</span>
                        <span>${formatCurrency(lineLive, config.currency)}</span>
                      </div>`;
                    }).join('')}
                  </div>`;
                }).join('')}
            </div>
        </div>`;
  };

  const renderPriceBreakdown = (block: PdfBlock) => {
    if (!hwBreakdown) return '';
    return `
        <div class="section">
            <h2 class="section-title">${escapeHtmlText(titleOf(block, 'Price Breakdown'))}</h2>
            <div class="anchor-points">
                <div class="anchor-item">
                    <span class="anchor-details">Shade sail:</span>
                    <span class="anchor-corner">${formatCurrency(sailDisplay, config.currency)}</span>
                </div>
                ${resolvedHardwareMode === 'standard' ? `
                <div class="anchor-item">
                    <span class="anchor-details">Hardware Tensioning Kit:</span>
                    <span class="anchor-corner" style="color: #307C31;">Included</span>
                </div>
                ` : ''}
                ${resolvedHardwareMode === 'manual' && hwLiveTotal > 0 ? `
                <div class="anchor-item">
                    <span class="anchor-details">Corner hardware:</span>
                    <span class="anchor-corner">${formatCurrency(hwLiveTotal, config.currency)}</span>
                </div>
                ` : ''}
                <div class="anchor-item" style="border-top: 2px solid ${brand.primaryColor}; border-bottom: none; margin-top: 4px; padding-top: 10px;">
                    <span class="anchor-corner" style="font-size: 14px;">Total:</span>
                    <span class="anchor-corner" style="font-size: 14px; color: ${brand.primaryColor};">${formatCurrency(calculations.totalPrice, config.currency)}</span>
                </div>
            </div>
        </div>`;
  };

  const renderGuarantee = (block: PdfBlock) => `
        <div class="guarantee-section">
            <div class="guarantee-title">${escapeHtmlText(titleOf(block, 'Premium Quality Guarantee'))}</div>
            <ul class="guarantee-list">
                <li>${selectedFabric?.warrantyYears || 10}-year Fabric & Workmanship Warranty</li>
                <li>Weather-resistant materials and UV protection</li>
                <li>Professional installation guide included</li>
                <li>Free worldwide shipping with no hidden costs</li>
            </ul>
        </div>`;

  const renderPricingCallout = (block: PdfBlock) => `
        <div class="price-section">
            <div class="price-title">${escapeHtmlText(titleOf(block, 'All-Inclusive Price to Your Door'))}</div>
            <div class="price-amount">${formatCurrency(calculations.totalPrice, config.currency)}</div>
            <ul class="price-features">
                <li>Express freight to your door included</li>
                <li>All taxes & duties included</li>
                <li>No hidden costs or tariffs</li>
            </ul>
        </div>`;

  const renderQuoteMeta = (block: PdfBlock) => {
    const fullName = [quote?.customerFirstName, quote?.customerLastName].filter(Boolean).join(' ').trim();
    const createdDate = quote?.createdAt
      ? new Date(quote.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const rows: Array<[string, string]> = [];
    if (fullName) rows.push(['Customer Name', fullName]);
    if (quote?.customerEmail) rows.push(['Email', quote.customerEmail]);
    if (quote?.quoteReference) rows.push(['Quote Reference', quote.quoteReference]);
    if (quote?.quoteName || config.quoteName) rows.push(['Quote Name', String(quote?.quoteName || config.quoteName)]);
    if (quote?.customerReference || config.customerReference) rows.push(['Customer Reference', String(quote?.customerReference || config.customerReference)]);
    rows.push(['Date', createdDate]);
    if (rows.length === 0) return '';
    return `
        <div class="section">
            <h2 class="section-title">${escapeHtmlText(titleOf(block, 'Quote Details'))}</h2>
            <div class="config-grid">
                ${rows.map(([label, value]) => `
                <div class="config-item">
                    <span class="config-label">${escapeHtmlText(label)}:</span>
                    <span class="config-value">${escapeHtmlText(value)}</span>
                </div>
                `).join('')}
            </div>
        </div>`;
  };

  const renderDiagramImage = (block: PdfBlock) => {
    const url = quote?.diagramPublicUrl;
    if (!url) return '';
    const maxWidth = Number(block.props?.maxWidth) || 520;
    return `
        <div class="section" style="text-align: center;">
            <h2 class="section-title" style="text-align: left;">${escapeHtmlText(titleOf(block, 'Shade Sail Diagram'))}</h2>
            <img src="${escapeHtmlText(url)}" alt="Shade sail diagram" style="max-width: ${maxWidth}px; width: 100%; height: auto; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; background: #FFFFFF;" />
        </div>`;
  };

  const renderBillOfMaterials = (block: PdfBlock) => {
    const items: Array<{ name: string; qty: string; amount: string }> = [];
    const fabricLabel = selectedFabric?.label || 'Shade sail fabric';
    const colorLabel = config.fabricColor ? ` - ${config.fabricColor}` : '';
    items.push({
      name: `${fabricLabel}${colorLabel} (${formatArea(calculations.area * 1000000, config.unit)})`,
      qty: '1',
      amount: formatCurrency(sailDisplay, config.currency),
    });
    if (config.edgeType === 'webbing') {
      items.push({
        name: `Webbing reinforcement (${formatMeasurement(calculations.perimeter * 1000, config.unit)} perimeter)`,
        qty: '1',
        amount: 'Included',
      });
    } else if (config.edgeType === 'cabled') {
      items.push({
        name: `Cabled edge (${formatMeasurement(calculations.perimeter * 1000, config.unit)} perimeter)`,
        qty: '1',
        amount: 'Included',
      });
    }
    if (resolvedHardwareMode === 'standard') {
      items.push({
        name: `Hardware Tensioning Kit (${config.corners}-corner pack)`,
        qty: '1',
        amount: 'Included',
      });
    } else if (resolvedHardwareMode === 'manual' && config.cornerHardware) {
      for (let i = 0; i < config.corners; i++) {
        const letter = String.fromCharCode(65 + i);
        const lines = config.cornerHardware[i] || [];
        lines.forEach((line) => {
          const skuPart = line.sku ? ` (${line.sku})` : '';
          const lineLive = line.livePriceCurrency === config.currency && line.livePrice != null
            ? line.livePrice * line.qty
            : 0;
          items.push({
            name: `Corner ${letter}: ${line.name}${skuPart}`,
            qty: String(line.qty),
            amount: formatCurrency(lineLive, config.currency),
          });
        });
      }
    }
    return `
        <div class="section">
            <h2 class="section-title">${escapeHtmlText(titleOf(block, 'Itemised Bill of Materials'))}</h2>
            <div class="anchor-points">
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 2px solid ${brand.primaryColor}; font-weight: bold; color: ${brand.primaryColor}; font-size: 12px;">
                    <span style="flex: 1;">Item</span>
                    <span style="width: 50px; text-align: center;">Qty</span>
                    <span style="width: 110px; text-align: right;">Amount</span>
                </div>
                ${items.map((item) => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 11px;">
                    <span style="flex: 1; color: ${brand.textColor};">${escapeHtmlText(item.name)}</span>
                    <span style="width: 50px; text-align: center; color: ${brand.mutedColor};">${escapeHtmlText(item.qty)}</span>
                    <span style="width: 110px; text-align: right; font-weight: bold; color: ${brand.primaryColor};">${escapeHtmlText(item.amount)}</span>
                </div>
                `).join('')}
                <div style="display: flex; justify-content: space-between; padding: 10px 0 2px; font-weight: bold; font-size: 13px;">
                    <span style="flex: 1; color: ${brand.primaryColor};">Total (all-inclusive)</span>
                    <span style="width: 110px; text-align: right; color: ${brand.primaryColor};">${formatCurrency(calculations.totalPrice, config.currency)}</span>
                </div>
            </div>
        </div>`;
  };

  const renderResumeButton = (block: PdfBlock) => {
    if (!resumeUrl) return '';
    const label = typeof block.props?.label === 'string' && block.props.label
      ? String(block.props.label)
      : 'Open My Saved Quote';
    const title = titleOf(block, 'Resume Your Quote & Add to Cart');
    return `
        <div class="section" style="text-align: center; page-break-inside: avoid;">
            <div style="background: ${brand.primaryColor}; border-radius: 10px; padding: 24px 20px;">
                <div style="color: #FFFFFF; font-size: 16px; font-weight: bold; margin-bottom: 8px;">${escapeHtmlText(title)}</div>
                <div style="color: rgba(255,255,255,0.85); font-size: 12px; margin-bottom: 16px;">Pick up exactly where you left off and add this configuration to your cart.</div>
                <a href="${escapeHtmlText(resumeUrl)}" style="display: inline-block; background: ${brand.accentColor}; color: ${brand.primaryColor}; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 28px; border-radius: 8px;">${escapeHtmlText(label)}</a>
                <div style="color: rgba(255,255,255,0.7); font-size: 10px; margin-top: 12px; word-break: break-all;">${escapeHtmlText(resumeUrl)}</div>
            </div>
        </div>`;
  };

  const renderCustomText = (block: PdfBlock) => {
    const heading = escapeHtmlText(block.props?.heading ?? '');
    const body = escapeHtmlText(block.props?.body ?? '').replace(/\n/g, '<br/>');
    const align = String(block.props?.align ?? 'left');
    return `
        <div class="section" style="text-align: ${align};">
            ${heading ? `<h2 class="section-title">${heading}</h2>` : ''}
            <div style="color: ${brand.textColor}; font-size: 13px; line-height: 1.6;">${body}</div>
        </div>`;
  };

  const renderCustomImage = (block: PdfBlock) => {
    const url = typeof block.props?.url === 'string' ? block.props.url : '';
    if (!url || !/^https?:\/\//i.test(url)) return '';
    const alt = escapeHtmlText(block.props?.alt ?? '');
    const width = Number(block.props?.width) || 400;
    return `
        <div class="section" style="text-align: center;">
            <img src="${escapeHtmlText(url)}" alt="${alt}" style="max-width: ${width}px; width: 100%; height: auto; border-radius: 8px;" />
        </div>`;
  };

  const renderCustomHtml = (block: PdfBlock) => {
    const html = sanitizeCustomHtml(String(block.props?.html ?? ''));
    return `<div class="section">${html}</div>`;
  };

  const renderDivider = (block: PdfBlock) => {
    const thickness = Number(block.props?.thickness) || 1;
    return `<hr style="border: none; border-top: ${thickness}px solid #E2E8F0; margin: 20px 0;" />`;
  };

  const renderSpacer = (block: PdfBlock) => {
    const height = Number(block.props?.height) || 16;
    return `<div style="height: ${height}px;"></div>`;
  };

  const renderBlock = (block: PdfBlock): string => {
    if (!block.visible) return '';
    switch (block.type) {
      case 'summary': return renderSummary(block);
      case 'measurements': return renderMeasurements(block);
      case 'anchorPoints': return renderAnchor(block);
      case 'hardwareBreakdown': return renderHardwareBreakdown(block);
      case 'priceBreakdown': return renderPriceBreakdown(block);
      case 'guarantee': return renderGuarantee(block);
      case 'pricingCallout': return renderPricingCallout(block);
      case 'quoteMeta': return renderQuoteMeta(block);
      case 'diagramImage': return renderDiagramImage(block);
      case 'billOfMaterials': return renderBillOfMaterials(block);
      case 'resumeButton': return renderResumeButton(block);
      case 'customText': return renderCustomText(block);
      case 'customImage': return renderCustomImage(block);
      case 'customHtml': return renderCustomHtml(block);
      case 'divider': return renderDivider(block);
      case 'spacer': return renderSpacer(block);
      default: return '';
    }
  };

  // Legacy section toggles filter: if template was saved before blocks existed, they still gate dynamic blocks.
  const sectionGate = (type: PdfBlockType): boolean => {
    switch (type) {
      case 'summary': return sections.showSummary !== false;
      case 'measurements': return sections.showMeasurements !== false;
      case 'anchorPoints': return sections.showAnchorPoints !== false;
      case 'hardwareBreakdown': return sections.showHardwareBreakdown !== false;
      case 'priceBreakdown': return sections.showPriceBreakdown !== false;
      case 'guarantee': return sections.showGuarantee !== false;
      case 'pricingCallout': return sections.showPricingCallout !== false;
      default: return true;
    }
  };

  const blocksHtml = template.blocks
    .filter((b) => b.visible && sectionGate(b.type))
    .map((b) => renderBlock(b))
    .join('\n');

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
            font-family: ${brand.fontFamily};
            line-height: 1.6;
            color: ${brand.textColor};
            background: ${brand.backgroundColor};
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
            background: linear-gradient(135deg, #F3FFE3 0%, ${brand.accentColor} 100%);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            position: relative;
        }

        .logo {
            font-size: 24px;
            font-weight: bold;
            color: ${brand.primaryColor};
            margin-bottom: 5px;
        }

        .logo-img {
            max-height: 40px;
            max-width: 180px;
            margin-bottom: 8px;
            display: block;
        }

        .tagline {
            color: ${brand.accentDark};
            font-size: 12px;
        }
        
        .quote-info {
            position: absolute;
            top: 20px;
            right: 20px;
            text-align: right;
        }
        
        .quote-info h2 {
            color: ${brand.primaryColor};
            font-size: 16px;
            margin-bottom: 5px;
        }

        .quote-info p {
            color: ${brand.mutedColor};
            font-size: 11px;
        }

        .main-title {
            font-size: 28px;
            font-weight: bold;
            color: ${brand.primaryColor};
            margin-bottom: 30px;
            text-align: center;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: ${brand.primaryColor};
            margin-bottom: 15px;
            border-bottom: 2px solid ${brand.accentColor};
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
            color: ${brand.mutedColor};
            font-weight: 500;
        }

        .config-value {
            color: ${brand.primaryColor};
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
            color: ${brand.accentDark};
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
            color: ${brand.mutedColor};
        }

        .measurement-value {
            color: ${brand.primaryColor};
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
            color: ${brand.primaryColor};
        }

        .anchor-details {
            color: ${brand.mutedColor};
            font-size: 11px;
        }

        .guarantee-section {
            background: linear-gradient(135deg, #F3FFE3 0%, ${brand.accentColor} 20%);
            border: 2px solid ${brand.accentDark};
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
        }

        .guarantee-title {
            color: ${brand.primaryColor};
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .guarantee-list {
            list-style: none;
            color: ${brand.accentDark};
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
            background: ${brand.primaryColor};
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
            background: ${brand.accentColor};
            color: ${brand.primaryColor};
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
            color: ${brand.mutedColor};
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
            ${brand.logoUrl ? `<img class="logo-img" src="${brand.logoUrl}" alt="logo" />` : '<div class="logo">ShadeSpace</div>'}
            <div class="tagline">${template.header.tagline}</div>
            <div class="quote-info">
                <h2>Quote Generated</h2>
                <p>${date}</p>
                <p>Quote ID: SS-${Date.now()}</p>
            </div>
        </div>

        <!-- Main Title -->
        <h1 class="main-title">${template.header.title}</h1>
        ${config.quoteName ? `
        <div style="background: linear-gradient(135deg, #F3FFE3 0%, ${brand.accentColor} 100%); border: 2px solid ${brand.accentDark}; border-radius: 10px; padding: 15px; margin-bottom: 20px; text-align: center;">
          <div style="color: ${brand.accentDark}; font-size: 12px; font-weight: bold; margin-bottom: 5px;">QUOTE NAME</div>
          <div style="color: ${brand.primaryColor}; font-size: 20px; font-weight: bold;">${config.quoteName}</div>
          ${config.customerReference ? `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid ${brand.accentDark};">
            <div style="color: ${brand.accentDark}; font-size: 10px; font-weight: bold; margin-bottom: 3px;">CUSTOMER REFERENCE</div>
            <div style="color: ${brand.primaryColor}; font-size: 14px; font-weight: 600;">${config.customerReference}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}

        ${blocksHtml}

        <!-- Footer -->
        <div class="footer">
            <p>${template.footer.line1}</p>
            <p>${template.footer.line2}</p>
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

    const { config, calculations, quoteId, accessToken }: PDFRequest = await req.json()

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

    // Fetch quote context for customer info, diagram, and resume link
    const quoteContext = await fetchQuoteContext(quoteId, accessToken)

    // Generate HTML content
    const htmlContent = await generateHTMLContent(config, calculations, quoteContext)
    const activeTemplate = await fetchActiveTemplate()

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
      format: activeTemplate.paper === 'Letter' ? 'Letter' : 'A4',
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

    // Track PDF generation event
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        await supabase.from('user_events').insert({
          event_type: 'pdf_download',
          event_data: {
            totalPrice: calculations.totalPrice,
            currency: config.currency,
            area: calculations.area,
            corners: config.corners,
            fabricType: config.fabricType,
            generated_by: 'edge_function'
          },
          customer_email: null,
          device_type: 'server',
          customer_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
          success: true
        })

        console.log('PDF download event tracked successfully')
      }
    } catch (trackError) {
      console.error('Failed to track PDF event:', trackError)
    }

    const sanitizeFilename = (name: string): string => {
      if (!name) return '';
      return name
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, '-')
        .replace(/\.+$/g, '')
        .replace(/^\.+/g, '')
        .substring(0, 100);
    };

    let pdfFilename = 'ShadeSpace-Quote';
    if (config.quoteName) {
      const sanitizedName = sanitizeFilename(config.quoteName);
      if (sanitizedName) {
        pdfFilename = `ShadeSpace-${sanitizedName}`;
      }
    }
    pdfFilename += `-${new Date().toISOString().slice(0, 10)}.pdf`;

    // Return PDF as response
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFilename}"`
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