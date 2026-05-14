import jsPDF from 'jspdf';
import { ConfiguratorState, ShadeCalculations } from '../types';
import { getLiveFabrics } from '../hooks/useFabricCatalog';
import { formatMeasurement, formatArea, getDiagonalKeysForCorners } from './geometry';
import { formatCurrency } from './currencyFormatter';
import { captureSvgToBase64Png } from './svgCapture';
import { renderSailSvgOffscreen } from './renderSvgOffscreen';
import {
  PdfBlock,
  BlockColumn,
  getBlockColumn,
  getBlockDensityOverride,
  sanitizeCustomHtml,
} from './pdfBlocks';

export interface PdfTemplateBranding {
  primaryColor?: string;
  accentColor?: string;
  accentDark?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
}

export interface PdfTemplateChrome {
  brand?: PdfTemplateBranding;
  header?: { title?: string; tagline?: string };
  footer?: { line1?: string; line2?: string };
  paper?: 'A4' | 'Letter';
}

/**
 * Format measurement for PDF display with metric conversion in brackets for imperial
 * @param mm Measurement in millimeters
 * @param unit User's selected unit system
 * @returns Formatted string with both imperial and metric (in brackets) if imperial selected
 */
function formatMeasurementForPDF(mm: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const imperialDisplay = formatMeasurement(mm, 'imperial');
    const metricDisplay = `${Math.round(mm)}mm`;
    return `${imperialDisplay} (${metricDisplay})`;
  }
  return formatMeasurement(mm, 'metric');
}

/**
 * Format area for PDF display with metric conversion in brackets for imperial
 * @param mm2 Area in square millimeters
 * @param unit User's selected unit system
 * @returns Formatted string with both imperial and metric (in brackets) if imperial selected
 */
function formatAreaForPDF(mm2: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const imperialDisplay = formatArea(mm2, 'imperial');
    const m2 = mm2 / 1000000;
    const metricDisplay = `${m2.toFixed(2)} m²`;
    return `${imperialDisplay} (${metricDisplay})`;
  }
  return formatArea(mm2, 'metric');
}

// Function to load image, optimize it, and convert to Base64
async function loadImageAsBase64(
  url: string, 
  maxWidth: number = 400, 
  maxHeight: number = 400, 
  outputMimeType: string = 'image/jpeg',
  outputQuality: number = 0.6
): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Create canvas for resizing and compression
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      // Only resize if image is larger than max dimensions
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }
      
      // Set canvas dimensions to optimized size
      canvas.width = width;
      canvas.height = height;
      
      // Draw resized image with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to specified format with quality
      const dataUrl = canvas.toDataURL(outputMimeType, outputQuality);
      
      // Clean up object URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      
      resolve(dataUrl);
    };
    
    img.onerror = () => {
      // Clean up object URL on error
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    // Create object URL from blob and load it
    const objectUrl = URL.createObjectURL(blob);
    img.src = objectUrl;
  });
}

// Function to get image dimensions
async function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = base64;
  });
}



export interface CustomerDetails {
  firstName?: string;
  lastName?: string;
  email?: string;
  quoteName?: string;
  customerReference?: string | null;
  quoteUrl?: string;
}

export type PdfDensity = 'comfortable' | 'compact' | 'ultra';

export interface PdfLayoutOptions {
  density?: PdfDensity;
  columns?: 1 | 2;
  baseFontPt?: number;
  rowGapMm?: number;
  sectionGapMm?: number;
  returnBlob?: boolean;
}

interface ResolvedLayout {
  density: PdfDensity;
  columns: 1 | 2;
  fontTitle: number;
  fontSection: number;
  fontBody: number;
  fontSmall: number;
  rowGap: number;
  sectionGap: number;
  configRowGap: number;
}

function resolveLayout(opts?: PdfLayoutOptions): ResolvedLayout {
  const density: PdfDensity = opts?.density || 'comfortable';
  const columns: 1 | 2 = opts?.columns || 1;
  const presets: Record<PdfDensity, Omit<ResolvedLayout, 'density' | 'columns'>> = {
    comfortable: { fontTitle: 20, fontSection: 12, fontBody: 10, fontSmall: 8, rowGap: 5, sectionGap: 8, configRowGap: 7 },
    compact:     { fontTitle: 16, fontSection: 10, fontBody:  9, fontSmall: 7, rowGap: 4, sectionGap: 6, configRowGap: 5.5 },
    ultra:       { fontTitle: 14, fontSection:  9, fontBody:  8, fontSmall: 7, rowGap: 3.5, sectionGap: 4, configRowGap: 4.5 },
  };
  const preset = presets[density];
  return {
    density,
    columns,
    fontTitle: preset.fontTitle,
    fontSection: preset.fontSection,
    fontBody: opts?.baseFontPt ?? preset.fontBody,
    fontSmall: preset.fontSmall,
    rowGap: opts?.rowGapMm ?? preset.rowGap,
    sectionGap: opts?.sectionGapMm ?? preset.sectionGap,
    configRowGap: preset.configRowGap,
  };
}


// ----------------------------------------------------------------------------
// Block-driven PDF renderer (PDF Studio)
// ----------------------------------------------------------------------------

function hexToRgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!hex) return fallback;
  const m = hex.replace('#', '');
  if (m.length !== 6) return fallback;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return [Number.isFinite(r) ? r : fallback[0], Number.isFinite(g) ? g : fallback[1], Number.isFinite(b) ? b : fallback[2]];
}

interface BlockRenderCtx {
  pdf: jsPDF;
  config: ConfiguratorState;
  calc: ShadeCalculations;
  customer: CustomerDetails | undefined;
  layout: ResolvedLayout;
  globalLayout: ResolvedLayout;
  chrome: PdfTemplateChrome;
  colors: {
    primaryDark: [number, number, number];
    primaryGreen: [number, number, number];
    accent: [number, number, number];
    accentDark: [number, number, number];
    text: [number, number, number];
    muted: [number, number, number];
    light: [number, number, number];
    bgLight: [number, number, number];
    cardBg: [number, number, number];
  };
  diagramBase64?: string;
  fabricSwatchBase64?: string;
  logoBase64?: string;
  logoDimensions?: { width: number; height: number };
  pageWidth: number;
  pageHeight: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
}

interface PageCursor {
  y: number;
}

function ensureSpace(ctx: BlockRenderCtx, cursor: PageCursor, needed: number): void {
  if (cursor.y + needed > ctx.pageHeight - ctx.marginBottom) {
    ctx.pdf.addPage();
    cursor.y = ctx.marginTop;
  }
}

function drawSectionTitle(ctx: BlockRenderCtx, x: number, y: number, width: number, title: string, layout: ResolvedLayout): number {
  ctx.pdf.setTextColor(...ctx.colors.primaryDark);
  ctx.pdf.setFontSize(layout.fontSection);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text(title, x, y);
  ctx.pdf.setDrawColor(...ctx.colors.accent);
  ctx.pdf.setLineWidth(0.6);
  ctx.pdf.line(x, y + 1.5, x + width, y + 1.5);
  return y + layout.fontSection * 0.45 + 3;
}

function buildConfigDetails(ctx: BlockRenderCtx): Array<[string, string]> {
  const { config, calc } = ctx;
  const selectedFabric = getLiveFabrics().find(f => f.id === config.fabricType);
  const rows: Array<[string, string]> = [
    ['Fabric Material', selectedFabric?.label || 'Not selected'],
    ['Fabric Color', config.fabricColor || 'Not selected'],
    ['Corners', String(config.corners)],
    ['Total Area', formatAreaForPDF(calc.area * 1000000, config.unit)],
    ['Edge Reinforcement', config.edgeType === 'webbing' ? 'Webbing Reinforced' : config.edgeType === 'cabled' ? 'Cabled Edge' : 'Not selected'],
  ];
  return rows;
}

function renderKeyValueRows(
  ctx: BlockRenderCtx,
  rows: Array<[string, string]>,
  x: number,
  y: number,
  width: number,
  layout: ResolvedLayout,
  cursor: PageCursor,
): number {
  const labelX = x;
  const valueX = x + width - 2;
  ctx.pdf.setFontSize(layout.fontBody);
  for (const [label, value] of rows) {
    ensureSpace(ctx, cursor, layout.rowGap + 2);
    if (cursor.y !== y) y = cursor.y;
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setTextColor(...ctx.colors.muted);
    ctx.pdf.text(label, labelX, y);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setTextColor(...ctx.colors.text);
    ctx.pdf.text(value, valueX, y, { align: 'right' });
    y += layout.rowGap;
    cursor.y = y;
  }
  return y;
}

async function renderBlockContent(
  ctx: BlockRenderCtx,
  block: PdfBlock,
  x: number,
  startY: number,
  width: number,
  layout: ResolvedLayout,
  cursor: PageCursor,
): Promise<number> {
  const props = block.props || {};
  const title = (props.title as string) || '';
  const { pdf, config, calc, customer, colors } = ctx;
  let y = startY;

  switch (block.type) {
    case 'spacer': {
      const h = Math.max(0, Number(props.height) || 16) * 0.4;
      y += h;
      cursor.y = y;
      return y;
    }
    case 'divider': {
      const t = Math.max(0.1, Number(props.thickness) || 1) * 0.3;
      pdf.setDrawColor(...colors.muted);
      pdf.setLineWidth(t);
      pdf.line(x, y + 2, x + width, y + 2);
      y += 4;
      cursor.y = y;
      return y;
    }
    case 'pageBreak': {
      pdf.addPage();
      cursor.y = ctx.marginTop;
      return cursor.y;
    }
    case 'customText': {
      if (props.heading) {
        pdf.setTextColor(...colors.primaryDark);
        pdf.setFontSize(layout.fontSection);
        pdf.setFont('helvetica', 'bold');
        const align = (props.align as 'left' | 'center' | 'right') || 'left';
        const tx = align === 'center' ? x + width / 2 : align === 'right' ? x + width : x;
        pdf.text(String(props.heading), tx, y, { align });
        y += layout.fontSection * 0.5 + 1;
      }
      pdf.setFontSize(layout.fontBody);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.text);
      const align = (props.align as 'left' | 'center' | 'right') || 'left';
      const body = String(props.body || '');
      const lines = pdf.splitTextToSize(body, width);
      const tx = align === 'center' ? x + width / 2 : align === 'right' ? x + width : x;
      pdf.text(lines, tx, y, { align });
      y += lines.length * layout.fontBody * 0.42 + 2;
      cursor.y = y;
      return y;
    }
    case 'customImage': {
      const url = String(props.url || '');
      if (!url) return y;
      try {
        const b64 = await loadImageAsBase64(url, 800, 800, 'image/jpeg', 0.7);
        const dim = await getImageDimensions(b64);
        const propW = Math.min(Number(props.width) || 400, 600);
        const w = Math.min(propW * 0.4, width);
        const h = (dim.height / dim.width) * w;
        ensureSpace(ctx, cursor, h + 4);
        pdf.addImage(b64, 'JPEG', x + (width - w) / 2, y, w, h);
        y += h + 3;
        cursor.y = y;
      } catch {
        // ignore image errors
      }
      return y;
    }
    case 'customHtml': {
      const html = sanitizeCustomHtml(String(props.html || ''));
      const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!text) return y;
      pdf.setFontSize(layout.fontBody);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.text);
      const lines = pdf.splitTextToSize(text, width);
      pdf.text(lines, x, y);
      y += lines.length * layout.fontBody * 0.42 + 2;
      cursor.y = y;
      return y;
    }
    case 'quoteMeta': {
      y = drawSectionTitle(ctx, x, y, width, title || 'Quote Details', layout);
      const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim();
      const rows: Array<[string, string]> = [
        ['Customer Name', fullName || 'Not provided'],
        ['Email', customer?.email || 'Not provided'],
        ['Quote Reference', (customer as any)?.quoteReference || 'Pending'],
      ];
      if (customer?.quoteName) rows.push(['Quote Name', customer.quoteName]);
      if (customer?.customerReference) rows.push(['Customer Ref', customer.customerReference]);
      rows.push(['Date', date]);
      y = renderKeyValueRows(ctx, rows, x, y, width, layout, cursor);
      return y;
    }
    case 'summary': {
      y = drawSectionTitle(ctx, x, y, width, title || 'Shade Sail Summary', layout);
      const rows = buildConfigDetails(ctx);
      y = renderKeyValueRows(ctx, rows, x, y, width, layout, cursor);
      return y;
    }
    case 'stepSelections': {
      y = drawSectionTitle(ctx, x, y, width, title || 'Configurator Selections', layout);
      const fabric = getLiveFabrics().find(f => f.id === config.fabricType);
      const hwMode = config.hardwareSelectionMode || (config.measurementOption === 'adjust' ? 'standard' : 'none');
      const rows: Array<[string, string]> = [
        ['Manufacturing', config.measurementOption === 'exact' ? 'Exact dimensions' : 'Adjust to space'],
        ['Corners', `${config.corners}-corner`],
        ['Units', config.unit === 'metric' ? 'Metric' : 'Imperial'],
        ['Fabric', `${fabric?.label || config.fabricType || ''}${config.fabricColor ? ` - ${config.fabricColor}` : ''}`],
        ['Edge', config.edgeType === 'webbing' ? 'Webbing reinforced' : config.edgeType === 'cabled' ? 'Cabled' : 'Not selected'],
        ['Hardware', hwMode === 'standard' ? `Standard kit (${config.corners}-corner)` : hwMode === 'manual' ? 'Manual per corner' : 'None'],
        ['Fixing Points', config.fixingPointsInstalled === true ? 'Already installed' : config.fixingPointsInstalled === false ? 'Planning install' : 'Not specified'],
      ];
      y = renderKeyValueRows(ctx, rows, x, y, width, layout, cursor);
      return y;
    }
    case 'measurements': {
      y = drawSectionTitle(ctx, x, y, width, title || 'Precise Measurements', layout);
      pdf.setFontSize(layout.fontSmall);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colors.accentDark);
      pdf.text('Edge Lengths', x, y);
      y += layout.fontSmall * 0.5 + 1;
      const rows: Array<[string, string]> = [];
      for (let i = 0; i < config.corners; i++) {
        const next = (i + 1) % config.corners;
        const k = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + next)}`;
        const mm = config.measurements[k];
        rows.push([`Edge ${k.charAt(0)} \u2192 ${k.charAt(1)}`, mm ? formatMeasurementForPDF(mm, config.unit) : 'Not provided']);
      }
      y = renderKeyValueRows(ctx, rows, x, y, width, layout, cursor);
      const diagonals: Array<[string, string]> = [];
      if (config.corners >= 4) {
        for (const k of getDiagonalKeysForCorners(config.corners)) {
          const mm = config.measurements[k];
          if (mm) diagonals.push([`Diagonal ${k.charAt(0)} \u2192 ${k.charAt(1)}`, formatMeasurementForPDF(mm, config.unit)]);
        }
      }
      if (diagonals.length > 0) {
        y += 2;
        ensureSpace(ctx, cursor, layout.fontSmall + 4);
        pdf.setFontSize(layout.fontSmall);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...colors.accentDark);
        pdf.text('Diagonal Lengths', x, y);
        y += layout.fontSmall * 0.5 + 1;
        cursor.y = y;
        y = renderKeyValueRows(ctx, diagonals, x, y, width, layout, cursor);
      }
      return y;
    }
    case 'anchorPoints': {
      y = drawSectionTitle(ctx, x, y, width, title || 'Anchor Point Configuration', layout);
      const rows: Array<[string, string]> = [
        ['Fixing Points', config.fixingPointsInstalled === true ? 'Already installed' : config.fixingPointsInstalled === false ? 'Planning install' : 'Not specified'],
      ];
      const heights = config.fixingHeights || [];
      for (let i = 0; i < config.corners; i++) {
        const letter = String.fromCharCode(65 + i);
        const h = heights[i];
        const t = config.fixingTypes?.[i] || 'post';
        const o = config.eyeOrientations?.[i];
        const heightDisplay = h && h > 0 ? formatMeasurementForPDF(h, config.unit) : 'Not set';
        const detail = config.fixingPointsInstalled === true && o ? `${heightDisplay} (${t}, ${o} eye)` : `${heightDisplay} (${t})`;
        rows.push([`Corner ${letter}`, detail]);
      }
      y = renderKeyValueRows(ctx, rows, x, y, width, layout, cursor);
      return y;
    }
    case 'hardwareBreakdown': {
      y = drawSectionTitle(ctx, x, y, width, title || 'Corner Hardware', layout);
      const mode = config.hardwareSelectionMode || (config.measurementOption === 'adjust' ? 'standard' : 'none');
      pdf.setFontSize(layout.fontBody);
      if (mode === 'none') {
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(...colors.muted);
        pdf.text('No tensioning hardware included.', x, y);
        y += layout.rowGap;
      } else if (mode === 'standard') {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...colors.text);
        pdf.text(`Standard ${config.corners}-corner tensioning kit included`, x, y);
        y += layout.rowGap;
      } else {
        const cornerHw = config.cornerHardware || {};
        const perCornerLive = calc.hardwareBreakdown?.perCornerLivePrice || [];
        for (let i = 0; i < config.corners; i++) {
          ensureSpace(ctx, cursor, layout.rowGap * 3);
          if (cursor.y !== y) y = cursor.y;
          const letter = String.fromCharCode(65 + i);
          const lines = cornerHw[i] || [];
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...colors.text);
          pdf.text(`Corner ${letter}`, x, y);
          pdf.text(formatCurrency(perCornerLive[i] || 0, config.currency), x + width, y, { align: 'right' });
          y += layout.rowGap;
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...colors.muted);
          pdf.setFontSize(layout.fontSmall);
          if (lines.length === 0) {
            pdf.text('No hardware selected', x + 4, y);
            y += layout.rowGap;
          } else {
            for (const l of lines) {
              const live = l.livePriceCurrency === config.currency && l.livePrice != null ? l.livePrice * l.qty : 0;
              pdf.text(`${l.qty}x ${l.name}${l.sku ? ` (${l.sku})` : ''}`, x + 4, y);
              pdf.text(formatCurrency(live, config.currency), x + width, y, { align: 'right' });
              y += layout.rowGap;
            }
          }
          pdf.setFontSize(layout.fontBody);
          y += 1;
          cursor.y = y;
        }
      }
      cursor.y = y;
      return y;
    }
    case 'priceBreakdown': {
      y = drawSectionTitle(ctx, x, y, width, title || 'Price Breakdown', layout);
      const hw = calc.hardwareBreakdown;
      const hwLive = hw?.hardwareOnlyLivePrice || 0;
      const sail = Math.max(0, calc.totalPrice - Math.round(hwLive));
      const rows: Array<[string, string]> = [['Shade sail', formatCurrency(sail, config.currency)]];
      const mode = config.hardwareSelectionMode || (config.measurementOption === 'adjust' ? 'standard' : 'none');
      if (mode === 'standard') rows.push(['Tensioning Kit', 'Included']);
      else if (mode === 'manual' && hwLive > 0) rows.push(['Corner Hardware', formatCurrency(hwLive, config.currency)]);
      y = renderKeyValueRows(ctx, rows, x, y, width, layout, cursor);
      pdf.setDrawColor(...colors.light);
      pdf.setLineWidth(0.2);
      pdf.line(x, y - 1, x + width, y - 1);
      y += 1;
      pdf.setFontSize(layout.fontSection);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colors.primaryDark);
      pdf.text('Total', x, y + 3);
      pdf.text(formatCurrency(calc.totalPrice, config.currency), x + width, y + 3, { align: 'right' });
      y += layout.fontSection * 0.5 + 3;
      cursor.y = y;
      return y;
    }
    case 'pricingCallout': {
      const boxH = layout.density === 'comfortable' ? 22 : layout.density === 'compact' ? 18 : 14;
      ensureSpace(ctx, cursor, boxH + 2);
      pdf.setFillColor(...colors.primaryDark);
      pdf.rect(x, y, width, boxH, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(layout.fontSmall);
      pdf.setFont('helvetica', 'normal');
      pdf.text(title || 'All-Inclusive Price', x + width / 2, y + 5, { align: 'center' });
      pdf.setFontSize(layout.fontTitle);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colors.accent);
      pdf.text(formatCurrency(calc.totalPrice, config.currency), x + width / 2, y + boxH - 3, { align: 'center' });
      y += boxH + 2;
      cursor.y = y;
      return y;
    }
    case 'guarantee': {
      const items = [
        '15-year Fabric & Workmanship Warranty',
        'Weather-resistant materials & UV protection',
        'Professional installation guide included',
        'Free worldwide delivery (taxes & duties incl.)',
      ];
      const boxH = items.length * layout.rowGap + 12;
      ensureSpace(ctx, cursor, boxH + 2);
      pdf.setFillColor(...colors.bgLight);
      pdf.rect(x, y, width, boxH, 'F');
      pdf.setDrawColor(...colors.primaryGreen);
      pdf.setLineWidth(0.4);
      pdf.rect(x, y, width, boxH, 'S');
      pdf.setTextColor(...colors.primaryDark);
      pdf.setFontSize(layout.fontSection);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title || 'Premium Quality Guarantee', x + 3, y + 6);
      pdf.setFontSize(layout.fontBody);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.primaryGreen);
      let iy = y + 6 + layout.fontSection * 0.5 + 2;
      for (const it of items) {
        pdf.text(`\u2022 ${it}`, x + 3, iy);
        iy += layout.rowGap;
      }
      y += boxH + 2;
      cursor.y = y;
      return y;
    }
    case 'diagramImage': {
      y = drawSectionTitle(ctx, x, y, width, title || 'Shade Sail Diagram', layout);
      const maxW = Math.min(Number(props.maxWidth) || 520, 800) * 0.4;
      const targetW = Math.min(maxW, width);
      if (ctx.diagramBase64) {
        ensureSpace(ctx, cursor, targetW + 4);
        const cx = x + (width - targetW) / 2;
        pdf.addImage(ctx.diagramBase64, 'PNG', cx, y, targetW, targetW);
        y += targetW + 3;
      } else {
        pdf.setDrawColor(...colors.muted);
        pdf.setLineWidth(0.3);
        pdf.rect(x, y, width, 30);
        pdf.setFontSize(layout.fontSmall);
        pdf.setTextColor(...colors.muted);
        pdf.text('Diagram unavailable', x + width / 2, y + 16, { align: 'center' });
        y += 32;
      }
      cursor.y = y;
      return y;
    }
    case 'billOfMaterials': {
      y = drawSectionTitle(ctx, x, y, width, title || 'Itemised Bill of Materials', layout);
      const fabric = getLiveFabrics().find(f => f.id === config.fabricType);
      const hw = calc.hardwareBreakdown;
      const hwLive = hw?.hardwareOnlyLivePrice || 0;
      const sail = Math.max(0, calc.totalPrice - Math.round(hwLive));
      const mode = config.hardwareSelectionMode || (config.measurementOption === 'adjust' ? 'standard' : 'none');
      const rows: Array<[string, string]> = [
        [`${fabric?.label || ''} - ${config.fabricColor || ''}`.trim(), formatCurrency(sail, config.currency)],
        ['Edge reinforcement', 'Included'],
      ];
      if (mode === 'standard') rows.push([`Tensioning Kit (${config.corners}-corner)`, 'Included']);
      else if (mode === 'manual') rows.push(['Corner hardware', formatCurrency(hwLive, config.currency)]);
      y = renderKeyValueRows(ctx, rows, x, y, width, layout, cursor);
      pdf.setDrawColor(...colors.light);
      pdf.setLineWidth(0.2);
      pdf.line(x, y - 1, x + width, y - 1);
      y += 1;
      pdf.setFontSize(layout.fontSection);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colors.primaryDark);
      pdf.text('Total (all-in)', x, y + 3);
      pdf.text(formatCurrency(calc.totalPrice, config.currency), x + width, y + 3, { align: 'right' });
      y += layout.fontSection * 0.5 + 3;
      cursor.y = y;
      return y;
    }
    case 'resumeButton': {
      const label = String(props.label || 'Open My Saved Quote');
      const url = customer?.quoteUrl;
      const boxH = 18;
      ensureSpace(ctx, cursor, boxH + 4);
      pdf.setFillColor(...colors.primaryDark);
      pdf.rect(x, y, width, boxH, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(layout.fontSmall);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title || 'Resume Your Quote', x + width / 2, y + 5, { align: 'center' });
      pdf.setFillColor(...colors.accent);
      const btnW = Math.min(70, width - 8);
      const btnX = x + (width - btnW) / 2;
      pdf.rect(btnX, y + 7, btnW, 8, 'F');
      pdf.setTextColor(...colors.primaryDark);
      pdf.setFontSize(layout.fontBody);
      if (url) pdf.textWithLink(label, btnX + btnW / 2, y + 13, { url, align: 'center' });
      else pdf.text(label, btnX + btnW / 2, y + 13, { align: 'center' });
      y += boxH + 2;
      cursor.y = y;
      return y;
    }
    default:
      return y;
  }
}

interface ColumnGroup {
  left: PdfBlock[];
  right: PdfBlock[];
}

function groupBlocks(blocks: PdfBlock[]): Array<{ kind: 'full'; block: PdfBlock } | { kind: 'columns'; group: ColumnGroup }> {
  const out: Array<{ kind: 'full'; block: PdfBlock } | { kind: 'columns'; group: ColumnGroup }> = [];
  let pending: ColumnGroup | null = null;
  for (const b of blocks) {
    if (!b.visible) continue;
    const col = getBlockColumn(b);
    if (col === 'full') {
      if (pending) { out.push({ kind: 'columns', group: pending }); pending = null; }
      out.push({ kind: 'full', block: b });
    } else {
      if (!pending) pending = { left: [], right: [] };
      if (col === 'left') pending.left.push(b);
      else pending.right.push(b);
    }
  }
  if (pending) out.push({ kind: 'columns', group: pending });
  return out;
}

export interface BlockPdfOptions {
  layout?: PdfLayoutOptions;
  chrome?: PdfTemplateChrome;
  customer?: CustomerDetails;
  svgElement?: SVGElement;
  returnBlob?: boolean;
  isEmailSummary?: boolean;
}

export async function generatePdfFromBlocks(
  config: ConfiguratorState,
  calculations: ShadeCalculations,
  blocks: PdfBlock[],
  options: BlockPdfOptions = {},
): Promise<string | void> {
  const layout = resolveLayout(options.layout);
  const chrome = options.chrome || {};
  const paper: 'A4' | 'Letter' = chrome.paper === 'Letter' ? 'Letter' : 'a4' as any;
  const pdf = new jsPDF('p', 'mm', paper === 'Letter' ? 'letter' : 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 12;
  const marginTop = 38;
  const marginBottom = 18;
  const contentWidth = pageWidth - marginX * 2;

  const colors = {
    primaryDark: hexToRgb(chrome.brand?.primaryColor, [1, 49, 45]),
    primaryGreen: hexToRgb(chrome.brand?.accentDark, [48, 124, 49]),
    accent: hexToRgb(chrome.brand?.accentColor, [191, 241, 2]),
    accentDark: hexToRgb(chrome.brand?.accentDark, [48, 124, 49]),
    text: hexToRgb(chrome.brand?.textColor, [30, 41, 59]),
    muted: hexToRgb(chrome.brand?.mutedColor, [100, 116, 139]),
    light: [148, 163, 184] as [number, number, number],
    bgLight: [243, 255, 227] as [number, number, number],
    cardBg: hexToRgb(chrome.brand?.backgroundColor, [255, 255, 255]),
  };

  // Optional logo
  let logoBase64: string | undefined;
  let logoDimensions: { width: number; height: number } | undefined;
  const logoUrl = chrome.brand?.logoUrl
    || 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-color_3x_8d83ab71-75cc-4486-8cf3-b510cdb69aa7.png?v=1728339550';
  try {
    logoBase64 = await loadImageAsBase64(logoUrl, 200, 80, 'image/png', 0.9);
    logoDimensions = await getImageDimensions(logoBase64);
  } catch {
    // ignore
  }

  // Optional diagram capture
  let diagramBase64: string | undefined;
  if (options.svgElement) {
    try { diagramBase64 = await captureSvgToBase64Png(options.svgElement as SVGSVGElement, 800, 800); } catch { /* noop */ }
  }
  if (!diagramBase64 && config.points && config.points.length >= 3) {
    try { diagramBase64 = await renderSailSvgOffscreen(config, 800, 800); } catch { /* noop */ }
  }

  const ctx: BlockRenderCtx = {
    pdf,
    config,
    calc: calculations,
    customer: options.customer,
    layout,
    globalLayout: layout,
    chrome,
    colors,
    diagramBase64,
    logoBase64,
    logoDimensions,
    pageWidth,
    pageHeight,
    marginX,
    marginTop,
    marginBottom,
  };

  const drawHeader = () => {
    pdf.setFillColor(...colors.bgLight);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setFillColor(...colors.accent);
    pdf.rect(0, 28, pageWidth, 2, 'F');
    if (logoBase64 && logoDimensions) {
      const maxW = 50;
      const maxH = 16;
      const ar = logoDimensions.width / logoDimensions.height;
      let w = maxW;
      let h = w / ar;
      if (h > maxH) { h = maxH; w = h * ar; }
      pdf.addImage(logoBase64, 'PNG', marginX, 7, w, h);
    }
    pdf.setTextColor(...colors.primaryDark);
    pdf.setFontSize(layout.fontTitle);
    pdf.setFont('helvetica', 'bold');
    pdf.text(chrome.header?.title || 'Custom Shade Sail Quote', pageWidth - marginX, 15, { align: 'right' });
    pdf.setFontSize(layout.fontSmall);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...colors.accentDark);
    pdf.text(chrome.header?.tagline || '', pageWidth - marginX, 21, { align: 'right' });
  };

  const drawFooter = (pageNum: number, total: number) => {
    pdf.setFillColor(...colors.bgLight);
    pdf.rect(0, pageHeight - 14, pageWidth, 14, 'F');
    pdf.setTextColor(...colors.muted);
    pdf.setFontSize(layout.fontSmall);
    pdf.setFont('helvetica', 'normal');
    pdf.text(chrome.footer?.line1 || 'Generated by ShadeSpace Professional Configurator', marginX, pageHeight - 8);
    pdf.text(chrome.footer?.line2 || 'Visit shadespace.com for more information', marginX, pageHeight - 3);
    pdf.text(`Page ${pageNum} of ${total}`, pageWidth - marginX, pageHeight - 3, { align: 'right' });
  };

  drawHeader();
  const cursor: PageCursor = { y: marginTop };

  const groups = groupBlocks(blocks);
  for (const g of groups) {
    if (g.kind === 'full') {
      const layoutForBlock = applyDensityOverride(layout, g.block);
      const y = await renderBlockContent(ctx, g.block, marginX, cursor.y, contentWidth, layoutForBlock, cursor);
      cursor.y = Math.max(cursor.y, y) + layoutForBlock.sectionGap;
    } else {
      const colGap = 6;
      const colW = (contentWidth - colGap) / 2;
      const startY = cursor.y;
      let leftY = startY;
      let rightY = startY;
      const leftCursor: PageCursor = { y: startY };
      const rightCursor: PageCursor = { y: startY };
      for (const b of g.group.left) {
        const lp = applyDensityOverride(layout, b);
        leftY = await renderBlockContent(ctx, b, marginX, leftCursor.y, colW, lp, leftCursor);
        leftCursor.y = leftY + lp.sectionGap;
      }
      for (const b of g.group.right) {
        const lp = applyDensityOverride(layout, b);
        rightY = await renderBlockContent(ctx, b, marginX + colW + colGap, rightCursor.y, colW, lp, rightCursor);
        rightCursor.y = rightY + lp.sectionGap;
      }
      cursor.y = Math.max(leftCursor.y, rightCursor.y);
    }
  }

  // Footers (after all pages drawn)
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    drawFooter(p, total);
  }

  if (options.returnBlob) {
    const blob = pdf.output('blob');
    return URL.createObjectURL(blob);
  }
  if (options.isEmailSummary) {
    return pdf.output('datauristring');
  }
  const ts = new Date().toISOString().slice(0, 10);
  pdf.save(`ShadeSpace-Quote-${ts}.pdf`);
}

function applyDensityOverride(base: ResolvedLayout, block: PdfBlock): ResolvedLayout {
  const o = getBlockDensityOverride(block);
  if (!o || o === base.density) return base;
  return resolveLayout({ density: o, columns: base.columns });
}
