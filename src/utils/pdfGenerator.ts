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

export async function generatePDF(
config: ConfiguratorState, calculations: ShadeCalculations, svgElement?: SVGElement | undefined, isEmailSummary?: boolean | undefined, customerDetails?: CustomerDetails, layoutOptions?: PdfLayoutOptions): Promise<string | void> {
  const layout = resolveLayout(layoutOptions);
  console.log('🚀 Starting PDF generation...');
  console.log('📱 User agent:', navigator.userAgent);
  console.log('📊 Config corners:', config.corners);
  console.log('🖼️ SVG element provided:', !!svgElement);
  
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    console.log('📄 jsPDF initialized successfully');
    
    // Application colors (matching the app's design)
    const primaryDark = [1, 49, 45]; // #01312D
    const primaryGreen = [48, 124, 49]; // #307C31
    const accentGreen = [191, 241, 2]; // #BFF102
    const textDark = [30, 41, 59]; // #1E293B
    const textMedium = [100, 116, 139]; // #64748B
    const textLight = [148, 163, 184]; // #94A3B8
    const backgroundLight = [248, 250, 252]; // #F8FAFC
    const lightGreenBg = [243, 255, 227]; // #F3FFE3
    const headerBg = [243, 255, 227]; // #F3FFE3 - Header background color
    
    // Load and optimize logo image
    const logoUrl = 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-color_3x_8d83ab71-75cc-4486-8cf3-b510cdb69aa7.png?v=1728339550';
    let logoBase64: string | undefined;
    let logoDimensions: { width: number; height: number } | undefined;
    
    console.log('🖼️ Loading and optimizing logo image...');
    try {
      // Optimize logo: use PNG to preserve transparency, smaller size for header
      logoBase64 = await loadImageAsBase64(logoUrl, 200, 80, 'image/png', 0.9);
      logoDimensions = await getImageDimensions(logoBase64);
      console.log('✅ Logo loaded and optimized successfully');
    } catch (error) {
      console.warn('⚠️ Logo loading failed:', error);
      // Logo loading failed - PDF will continue without logo
    }

    // Header with gradient background
    pdf.setFillColor(...headerBg);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Add a subtle accent strip
    pdf.setFillColor(...accentGreen);
    pdf.rect(0, 35, pageWidth, 5, 'F');
    
    const selectedFabric = getLiveFabrics().find(f => f.id === config.fabricType);
    const selectedColor = selectedFabric?.colors.find(c => c.name === config.fabricColor);
    
    // Hardware pack image mapping
    const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
      3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
      4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
      5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
      6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
      7: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
      8: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
    };
    
    // Load and optimize fabric swatch image if available
    let fabricSwatchBase64: string | undefined;
    if (selectedColor?.imageUrl) {
      console.log('🎨 Loading and optimizing fabric swatch image...');
      try {
        // Optimize fabric swatch: very small since it's just a color reference, use JPEG
        fabricSwatchBase64 = await loadImageAsBase64(selectedColor.imageUrl, 100, 100, 'image/jpeg', 0.5);
        console.log('✅ Fabric swatch loaded and optimized successfully');
      } catch (error) {
        console.warn('⚠️ Fabric swatch loading failed:', error);
        // Fabric swatch loading failed - PDF will continue without swatch
      }
    }

    // Load and optimize hardware pack image if applicable
    let hardwarePackBase64: string | undefined;
    if (config.measurementOption === 'adjust' && HARDWARE_PACK_IMAGES[config.corners]) {
      console.log('🔧 Loading and optimizing hardware pack image...');
      try {
        // Optimize hardware pack image: medium size for product reference, use JPEG
        hardwarePackBase64 = await loadImageAsBase64(HARDWARE_PACK_IMAGES[config.corners], 150, 150, 'image/jpeg', 0.6);
        console.log('✅ Hardware pack image loaded and optimized successfully');
      } catch (error) {
        console.warn('⚠️ Hardware pack image loading failed:', error);
        // Hardware pack image loading failed - PDF will continue without image
      }
    }

    let canvasDiagramBase64: string | undefined;
    if (svgElement) {
      try {
        canvasDiagramBase64 = await captureSvgToBase64Png(svgElement as SVGSVGElement, 800, 800);
      } catch (error) {
        console.warn('SVG capture failed, trying offscreen render:', error);
      }
    }
    if (!canvasDiagramBase64 && config.points && config.points.length >= 3) {
      try {
        canvasDiagramBase64 = await renderSailSvgOffscreen(config, 800, 800);
      } catch (error) {
        console.warn('Offscreen render also failed:', error);
      }
    }

    // Company logo with proper aspect ratio
    if (logoBase64 && logoDimensions) {
      console.log('📝 Adding logo to PDF...');
      const maxLogoWidth = 60;
      const maxLogoHeight = 20;
      
      // Calculate aspect ratio
      const aspectRatio = logoDimensions.width / logoDimensions.height;
      
      // Calculate actual dimensions maintaining aspect ratio
      let logoWidth = maxLogoWidth;
      let logoHeight = logoWidth / aspectRatio;
      
      // If height exceeds max, recalculate based on height
      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight;
        logoWidth = logoHeight * aspectRatio;
      }
      
      pdf.addImage(logoBase64, 'PNG', 15, 8, logoWidth, logoHeight);
    }

    console.log('📝 Adding basic PDF content...');
    // Quote title and date
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    pdf.text(`Quote Generated: ${date}`, pageWidth - 15, 15, { align: 'right' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Quote ID: SS-${Date.now()}`, pageWidth - 15, 22, { align: 'right' });
    
    let yPos = 55;

    // Main title
    pdf.setTextColor(...textDark);
    pdf.setFontSize(layout.fontTitle);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Custom Shade Sail Quote', 15, yPos);
    yPos += layout.density === 'comfortable' ? 12 : layout.density === 'compact' ? 9 : 7;

    // Customer Details Section (if provided)
    if (customerDetails && (customerDetails.firstName || customerDetails.quoteName)) {
      const hasCustomerName = customerDetails.firstName && customerDetails.lastName;
      const hasQuoteName = customerDetails.quoteName;
      const hasEmail = customerDetails.email;
      const hasReference = customerDetails.customerReference;

      const customerDetailsCount = [hasCustomerName, hasQuoteName, hasEmail, hasReference].filter(Boolean).length;
      const customerDetailsHeight = customerDetailsCount * 6 + 16;

      pdf.setFillColor(...lightGreenBg);
      pdf.rect(10, yPos - 3, pageWidth - 20, customerDetailsHeight, 'F');
      pdf.setDrawColor(...primaryGreen);
      pdf.setLineWidth(0.5);
      pdf.rect(10, yPos - 3, pageWidth - 20, customerDetailsHeight, 'S');

      pdf.setTextColor(...primaryGreen);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Quote Prepared For:', 15, yPos + 4);
      yPos += 12;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');

      if (hasCustomerName) {
        pdf.setTextColor(...textMedium);
        pdf.text('Customer:', 15, yPos);
        pdf.setTextColor(...textDark);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${customerDetails.firstName} ${customerDetails.lastName}`, 50, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
      }

      if (hasEmail) {
        pdf.setTextColor(...textMedium);
        pdf.text('Email:', 15, yPos);
        pdf.setTextColor(...textDark);
        pdf.setFont('helvetica', 'bold');
        pdf.text(customerDetails.email!, 50, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
      }

      if (hasQuoteName) {
        pdf.setTextColor(...textMedium);
        pdf.text('Shade Sail Name:', 15, yPos);
        pdf.setTextColor(...textDark);
        pdf.setFont('helvetica', 'bold');
        pdf.text(customerDetails.quoteName!, 50, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
      }

      if (hasReference) {
        pdf.setTextColor(...textMedium);
        pdf.text('Reference:', 15, yPos);
        pdf.setTextColor(...textDark);
        pdf.setFont('helvetica', 'bold');
        pdf.text(customerDetails.customerReference!, 50, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
      }

      yPos += 8;
    } else {
      yPos += 3;
    }

    const isFireRetardant = selectedFabric?.isFireRetardant && selectedColor?.isFireRetardant;
    const isExtrablockNonFRColor = selectedFabric?.isFireRetardant && selectedColor && !selectedColor.isFireRetardant;
    
    const configDetails = [
      ['Fabric Material:', selectedFabric?.label || 'Not selected'],
      ['Fabric Color:', `${config.fabricColor || 'Not selected'}${selectedColor?.shadeFactor ? ` (SF ${selectedColor.shadeFactor}%)` : ''}${isExtrablockNonFRColor ? ' (Not FR Certified)' : ''}`],
      ['Warranty:', selectedFabric ? `${selectedFabric.warrantyYears} Years` : 'Not specified'],
      ['Fabric Made In:', selectedFabric?.madeIn || 'Not specified'],
      ['Fire Retardant:', isFireRetardant ? 'Yes' : isExtrablockNonFRColor ? 'No (Selected color is not FR certified)' : 'No'],
      ['Edge Reinforcement:', config.edgeType === 'webbing' ? 'Webbing Reinforced' : config.edgeType === 'cabled' ? 'Cabled Edge' : 'Not selected'],
      ...(config.edgeType === 'webbing' ? [[
        'Webbing Width:',
        config.unit === 'imperial'
          ? `${(calculations.webbingWidth * 0.0393701).toFixed(2)}" (${calculations.webbingWidth}mm)`
          : `${calculations.webbingWidth}mm`
      ]] : []),
      ...(config.edgeType === 'cabled' && calculations.wireThickness ? [[
        'Wire Thickness:',
        config.unit === 'imperial'
          ? `${(calculations.wireThickness * 0.0393701).toFixed(2)}" (${calculations.wireThickness}mm)`
          : `${calculations.wireThickness}mm`
      ]] : []),
      ['Number of Corners:', config.corners.toString()],
      ['Total Area:', formatAreaForPDF(calculations.area * 1000000, config.unit)],
      ['Total Perimeter:', formatMeasurementForPDF(calculations.perimeter * 1000, config.unit)],
      ['Total Weight:', config.unit === 'imperial'
        ? `${(calculations.totalWeightGrams / 1000 * 2.20462).toFixed(1)} lb (${(calculations.totalWeightGrams / 1000).toFixed(1)} kg)`
        : `${(calculations.totalWeightGrams / 1000).toFixed(1)} kg`],
      ['Measurement Units:', config.unit === 'metric' ? 'Metric: mm' : 'Imperial: Inches'],
      ['Manufacturing Option:', config.measurementOption === 'adjust' ? 'Adjust to fit space' : 'Exact dimensions'],
      ...((() => {
        const mode = config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none');
        if (mode === 'standard') return [['Tensioning Hardware Included:', 'Yes - Hardware Tensioning Kit']];
        if (mode === 'manual') return [['Tensioning Hardware:', 'Manual per corner (see breakdown below)']];
        return [];
      })()),
      ['Fixing Points Installed:', config.fixingPointsInstalled === true ? 'Yes - Already Installed' : config.fixingPointsInstalled === false ? 'No - Planning Installation' : 'Not specified'],
    ];
    
    // Configuration summary card. In 2-column mode the rows are split across two
    // columns inside the card so the section uses roughly half the vertical space.
    const cfgRowsPerCol = layout.columns === 2 ? Math.ceil(configDetails.length / 2) : configDetails.length;
    const configSummaryHeight = cfgRowsPerCol * layout.configRowGap + (layout.density === 'comfortable' ? 20 : 14);
    pdf.setFillColor(...backgroundLight);
    pdf.rect(10, yPos - 5, pageWidth - 20, configSummaryHeight, 'F');
    pdf.setDrawColor(...textLight);
    pdf.setLineWidth(0.2);
    pdf.rect(10, yPos - 5, pageWidth - 20, configSummaryHeight, 'S');

    pdf.setTextColor(...primaryDark);
    pdf.setFontSize(layout.fontSection);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Configuration Summary', 15, yPos);
    const configHeaderY = yPos;
    yPos += layout.density === 'comfortable' ? 10 : 7;

    pdf.setFontSize(layout.fontBody);
    pdf.setFont('helvetica', 'normal');

    const configStartY = yPos;
    const colSplit = layout.columns === 2 ? Math.ceil(configDetails.length / 2) : configDetails.length;
    const col2X = pageWidth / 2 + 5;
    configDetails.forEach((entry, idx) => {
      const [label, value] = entry as [string, string];
      const inCol2 = layout.columns === 2 && idx >= colSplit;
      if (inCol2 && idx === colSplit) yPos = configStartY;
      const labelX = inCol2 ? col2X : 20;
      const valueX = inCol2 ? col2X + 40 : 80;
      const _label = label;
      const _value = value;
      // Render row
      const isColorRow = _label === 'Fabric Color:';
      const isHardwareRow = _label === 'Tensioning Hardware Included:' || _label === 'Tensioning Hardware:';
      pdf.setTextColor(...textMedium);
      pdf.text(_label, labelX, yPos);
      pdf.setTextColor(...textDark);
      pdf.setFont('helvetica', 'bold');
      pdf.text(_value, valueX, yPos);
      if (isColorRow && fabricSwatchBase64) {
        const swatchSize = 6;
        const valueWidth = pdf.getTextWidth(_value);
        pdf.addImage(fabricSwatchBase64, 'PNG', valueX + valueWidth + 5, yPos - 4, swatchSize, swatchSize);
      }
      if (isHardwareRow && hardwarePackBase64) {
        const swatchSize = 8;
        const valueWidth = pdf.getTextWidth(_value);
        pdf.addImage(hardwarePackBase64, 'PNG', valueX + valueWidth + 5, yPos - 5, swatchSize, swatchSize);
      }
      pdf.setFont('helvetica', 'normal');
      yPos += layout.configRowGap;
    });
    // After 2-column rendering, snap yPos to the bottom of the card so the next
    // section starts below it (not in the middle of a row).
    if (layout.columns === 2) {
      yPos = configHeaderY + configSummaryHeight;
    }
    yPos += layout.sectionGap;

    // Hardware breakdown (manual mode)
    const resolvedHardwareMode: 'standard' | 'manual' | 'none' =
      config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none');
    const hwBreakdown = calculations.hardwareBreakdown;
    const hwLiveTotal = hwBreakdown?.hardwareOnlyLivePrice ?? 0;
    const perCornerLive = hwBreakdown?.perCornerLivePrice ?? [];
    const sailDisplay = Math.max(0, calculations.totalPrice - Math.round(hwLiveTotal));

    if (
      resolvedHardwareMode === 'manual' &&
      config.cornerHardware
    ) {
      pdf.setTextColor(...primaryDark);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Corner Hardware Breakdown', 15, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      for (let i = 0; i < config.corners; i++) {
        const letter = String.fromCharCode(65 + i);
        const lines = config.cornerHardware[i] || [];
        const cornerLive = perCornerLive[i] ?? 0;
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...textDark);
        pdf.text(`Corner ${letter}`, 20, yPos);
        pdf.text(
          formatCurrency(cornerLive, config.currency),
          pageWidth - 20,
          yPos,
          { align: 'right' }
        );
        yPos += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...textMedium);
        if (lines.length === 0) {
          pdf.text('No hardware selected', 25, yPos);
          yPos += 6;
        } else {
          for (const line of lines) {
            const skuPart = line.sku ? ` (${line.sku})` : '';
            const lineLive = line.livePriceCurrency === config.currency && line.livePrice != null
              ? line.livePrice * line.qty
              : 0;
            pdf.text(`${line.qty}x ${line.name}${skuPart}`, 25, yPos);
            pdf.text(
              formatCurrency(lineLive, config.currency),
              pageWidth - 20,
              yPos,
              { align: 'right' }
            );
            yPos += 5;
          }
        }
        yPos += 2;
      }
      yPos += 6;
    }

    // Price breakdown
    if (hwBreakdown) {
      pdf.setTextColor(...primaryDark);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Price Breakdown', 15, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textMedium);
      pdf.text('Shade sail:', 20, yPos);
      pdf.setTextColor(...textDark);
      pdf.text(
        formatCurrency(sailDisplay, config.currency),
        pageWidth - 20,
        yPos,
        { align: 'right' }
      );
      yPos += 6;

      if (resolvedHardwareMode === 'standard') {
        pdf.setTextColor(...textMedium);
        pdf.text('Hardware Tensioning Kit:', 20, yPos);
        pdf.setTextColor(...primaryGreen);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Included', pageWidth - 20, yPos, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
      } else if (resolvedHardwareMode === 'manual' && hwLiveTotal > 0) {
        pdf.setTextColor(...textMedium);
        pdf.text('Corner hardware:', 20, yPos);
        pdf.setTextColor(...textDark);
        pdf.text(
          formatCurrency(hwLiveTotal, config.currency),
          pageWidth - 20,
          yPos,
          { align: 'right' }
        );
        yPos += 6;
      }

      pdf.setDrawColor(...textLight);
      pdf.setLineWidth(0.2);
      pdf.line(20, yPos - 1, pageWidth - 20, yPos - 1);
      yPos += 3;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...primaryDark);
      pdf.text('Total:', 20, yPos);
      pdf.text(
        formatCurrency(calculations.totalPrice, config.currency),
        pageWidth - 20,
        yPos,
        { align: 'right' }
      );
      pdf.setFont('helvetica', 'normal');
      yPos += 10;
    }

    // Measurements section
    pdf.setTextColor(...primaryDark);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Precise Measurements', 15, yPos);
    yPos += 10; // Reduced spacing
    
    // Calculate dynamic heights for measurement cards
    const edgeMeasurementsCount = config.corners;
    const diagonalMeasurements = [];
    if (config.corners >= 4) {
      const diagonalKeys = getDiagonalKeysForCorners(config.corners);
      diagonalKeys.forEach(key => {
        if (config.measurements[key]) {
          diagonalMeasurements.push([`Diagonal ${key.charAt(0)} to ${key.charAt(1)}:`, formatMeasurementForPDF(config.measurements[key], config.unit)]);
        }
      });
    }
    const diagonalMeasurementsCount = diagonalMeasurements.length;

    const maxMeasurementsCount = Math.max(edgeMeasurementsCount, diagonalMeasurementsCount);
    const measurementCardHeight = Math.max(maxMeasurementsCount * layout.rowGap + 15, 30);

    const leftColX = 10;
    const rightColX = pageWidth / 2 + 5;
    const colWidth = (pageWidth - 30) / 2;

    if (diagonalMeasurements.length > 0) {
      // Two-column layout: Edge Lengths (left) and Diagonal Lengths (right)
      
      // Edge measurements card
      pdf.setFillColor(255, 255, 255);
      pdf.rect(leftColX, yPos - 5, colWidth, measurementCardHeight, 'F');
      pdf.setDrawColor(...textLight);
      pdf.rect(leftColX, yPos - 5, colWidth, measurementCardHeight, 'S');
      
      pdf.setTextColor(...primaryGreen);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Edge Lengths', leftColX + 5, yPos);
      let currentEdgeY = yPos + 10;
      
      pdf.setFontSize(layout.fontSmall);
      pdf.setFont('helvetica', 'normal');

      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];

        const label = `Edge ${String.fromCharCode(65 + i)} to ${String.fromCharCode(65 + nextIndex)}:`;
        const value = measurement ? formatMeasurementForPDF(measurement, config.unit) : 'Not provided';

        pdf.setTextColor(...textMedium);
        pdf.text(label, leftColX + 5, currentEdgeY);
        pdf.setTextColor(...textDark);
        pdf.setFont('helvetica', 'bold');
        pdf.text(value, leftColX + 50, currentEdgeY);
        pdf.setFont('helvetica', 'normal');
        currentEdgeY += layout.rowGap;
      }

      // Diagonal measurements card
      pdf.setFillColor(255, 255, 255);
      pdf.rect(rightColX, yPos - 5, colWidth, measurementCardHeight, 'F');
      pdf.setDrawColor(...textLight);
      pdf.rect(rightColX, yPos - 5, colWidth, measurementCardHeight, 'S');
      
      pdf.setTextColor(...primaryGreen);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Diagonal Lengths', rightColX + 5, yPos);
      let currentDiagonalY = yPos + 10;
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      diagonalMeasurements.forEach(([label, value]) => {
        pdf.setTextColor(...textMedium);
        pdf.text(label, rightColX + 5, currentDiagonalY);
        pdf.setTextColor(...textDark);
        pdf.setFont('helvetica', 'bold');
        pdf.text(value, rightColX + 50, currentDiagonalY);
        pdf.setFont('helvetica', 'normal');
        currentDiagonalY += layout.rowGap;
      });
    } else {
      // Two-column layout: Edge Lengths (left) and Anchor Point Configuration (right)
      
      // Edge measurements card
      pdf.setFillColor(255, 255, 255);
      pdf.rect(leftColX, yPos - 5, colWidth, measurementCardHeight, 'F');
      pdf.setDrawColor(...textLight);
      pdf.rect(leftColX, yPos - 5, colWidth, measurementCardHeight, 'S');
      
      pdf.setTextColor(...primaryGreen);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Edge Lengths', leftColX + 5, yPos);
      let currentEdgeY = yPos + 10;
      
      pdf.setFontSize(layout.fontSmall);
      pdf.setFont('helvetica', 'normal');

      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];

        const label = `Edge ${String.fromCharCode(65 + i)} to ${String.fromCharCode(65 + nextIndex)}:`;
        const value = measurement ? formatMeasurementForPDF(measurement, config.unit) : 'Not provided';

        pdf.setTextColor(...textMedium);
        pdf.text(label, leftColX + 5, currentEdgeY);
        pdf.setTextColor(...textDark);
        pdf.setFont('helvetica', 'bold');
        pdf.text(value, leftColX + 50, currentEdgeY);
        pdf.setFont('helvetica', 'normal');
        currentEdgeY += layout.rowGap;
      }
    }
    
    // Force new page for Page 2 content
    pdf.addPage();
    yPos = 25;

    // Calculate anchor points section height
    const anchorPointsHeight = config.corners * 6 + 35;
    const diagramHeight = 75;
    const topRowHeight = Math.max(anchorPointsHeight, diagramHeight + 15);

    // TOP ROW: Two-column layout - Anchor Point Config (left) and Shade Sail Preview (right)

    // LEFT COLUMN: Anchor Point Configuration
    pdf.setTextColor(...primaryDark);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Anchor Point Configuration', leftColX + 5, yPos);

    const anchorCardY = yPos + 5;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(leftColX, anchorCardY, colWidth, anchorPointsHeight, 'F');
    pdf.setDrawColor(...textLight);
    pdf.setLineWidth(0.2);
    pdf.rect(leftColX, anchorCardY, colWidth, anchorPointsHeight, 'S');

    let anchorY = anchorCardY + 8;

    pdf.setTextColor(...textMedium);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Fixing Points Installed:', leftColX + 5, anchorY);
    pdf.setTextColor(...textDark);
    pdf.setFont('helvetica', 'bold');
    const installationStatus = config.fixingPointsInstalled === true
      ? 'Yes - Already Installed'
      : config.fixingPointsInstalled === false
      ? 'No - Planning Installation'
      : 'Not specified';
    pdf.text(installationStatus, leftColX + 45, anchorY);
    anchorY += 8;

    pdf.setTextColor(...primaryGreen);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Fixing Point Details', leftColX + 5, anchorY);
    anchorY += 8;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');

    config.fixingHeights.forEach((height, index) => {
      const corner = String.fromCharCode(65 + index);
      const type = config.fixingTypes?.[index] || 'post';
      const orientation = config.eyeOrientations?.[index];

      const heightDisplay = height && height > 0
        ? formatMeasurementForPDF(height, config.unit)
        : 'Not set';

      pdf.setTextColor(...textMedium);
      pdf.text(`Corner ${corner}:`, leftColX + 5, anchorY);
      pdf.setTextColor(...textDark);
      pdf.setFont('helvetica', 'bold');

      if (config.fixingPointsInstalled === true && orientation) {
        pdf.text(`${heightDisplay} (${type}, ${orientation} eye)`, leftColX + 30, anchorY);
      } else {
        pdf.text(`${heightDisplay} (${type})`, leftColX + 30, anchorY);
      }

      pdf.setFont('helvetica', 'normal');
      anchorY += 6;
    });

    // RIGHT COLUMN: Shade Sail Preview diagram
    pdf.setTextColor(...primaryDark);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Shade Sail Preview', rightColX + 5, yPos);

    const diagramCardY = yPos + 5;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(rightColX, diagramCardY, colWidth, diagramHeight + 10, 'F');
    pdf.setDrawColor(...textLight);
    pdf.setLineWidth(0.2);
    pdf.rect(rightColX, diagramCardY, colWidth, diagramHeight + 10, 'S');

    if (config.points && config.points.length >= 3 && canvasDiagramBase64) {
      const padding = 2;
      const availableWidth = colWidth - (padding * 2);
      const availableHeight = diagramHeight;
      const diagramSize = Math.min(availableWidth, availableHeight);
      const centerX = rightColX + padding + (availableWidth - diagramSize) / 2;
      const centerY = diagramCardY + padding + (availableHeight - diagramSize) / 2;

      pdf.addImage(
        canvasDiagramBase64,
        'PNG',
        centerX,
        centerY,
        diagramSize,
        diagramSize
      );
    }

    pdf.setTextColor(...textMedium);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Corner positions and measurements', rightColX + colWidth / 2, diagramCardY + diagramHeight + 7, { align: 'center' });

    yPos = yPos + topRowHeight + 15;

    // BOTTOM ROW: Two-column layout
    const guaranteeHeight = 45;
    const priceCardHeight = 40;
    const maxColumnHeight = Math.max(guaranteeHeight, priceCardHeight);
    
    // Premium Quality Guarantee (left column)
    pdf.setFillColor(...lightGreenBg);
    pdf.rect(leftColX, yPos - 5, colWidth, guaranteeHeight, 'F');
    pdf.setDrawColor(...primaryGreen);
    pdf.setLineWidth(0.5);
    pdf.rect(leftColX, yPos - 5, colWidth, guaranteeHeight, 'S');
    
    pdf.setTextColor(...primaryDark);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Premium Quality Guarantee', leftColX + 5, yPos);
    yPos += 8;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...primaryGreen);
    
    const guaranteeItems = [
      `• ${selectedFabric?.warrantyYears || 10}-year Fabric & Workmanship Warranty`,
      '• Weather-resistant materials and UV protection',
      '• Professional installation guide included',
      '• Free express delivery worldwide including',
      '  taxes and any duties/tariffs',
      '• No hidden costs'
    ];
    
    let guaranteeY = yPos;
    guaranteeItems.forEach(item => {
      pdf.text(item, leftColX + 5, guaranteeY);
      guaranteeY += 5;
    });
    
    // Reset yPos for right column
    yPos -= 8;
    
    // Shade Sail Price (right column)
    pdf.setFillColor(255, 255, 255);
    pdf.rect(rightColX, yPos - 5, colWidth, priceCardHeight, 'F');
    pdf.setDrawColor(...textLight);
    pdf.setLineWidth(0.5);
    pdf.rect(rightColX, yPos - 5, colWidth, priceCardHeight, 'S');
    
    // Price header
    pdf.setTextColor(...primaryDark);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Shade Sail Price', rightColX + 5, yPos);
    
    // Price amount with accent background
    const priceBoxY = yPos + 6;
    const priceBoxHeight = 25;
    pdf.setFillColor(...accentGreen);
    pdf.rect(rightColX + 5, priceBoxY, colWidth - 10, priceBoxHeight, 'F');
    
    // Price text
    pdf.setTextColor(...primaryDark);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const priceText = `${formatCurrency(calculations.totalPrice, config.currency)}`;
    const priceX = rightColX + (colWidth / 2);
    pdf.text(priceText, priceX, priceBoxY + 16, { align: 'center' });
    
    // Add smaller "INC TAX" text below the price
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('INC TAX', priceX, priceBoxY + 22, { align: 'center' });
    
    // Update yPos to account for the tallest column
    yPos += maxColumnHeight + 15;

    // Resume Your Quote section (with clickable link)
    if (customerDetails?.quoteUrl) {
      const quoteBoxHeight = 28;
      pdf.setFillColor(...primaryGreen);
      pdf.rect(leftColX, yPos - 5, pageWidth - 30, quoteBoxHeight, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resume Your Quote & Add to Cart', leftColX + 5, yPos + 2);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Click the link below to return to your saved configuration at any time:', leftColX + 5, yPos + 9);

      pdf.setTextColor(...accentGreen);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      const linkY = yPos + 16;
      const linkText = customerDetails.quoteUrl;
      pdf.textWithLink(linkText, leftColX + 5, linkY, { url: customerDetails.quoteUrl });

      const linkWidth = pdf.getTextWidth(linkText);
      pdf.setDrawColor(...accentGreen);
      pdf.setLineWidth(0.2);
      pdf.line(leftColX + 5, linkY + 0.5, leftColX + 5 + linkWidth, linkY + 0.5);

      yPos += quoteBoxHeight + 10;
    }

    // Footer
    pdf.setFillColor(...backgroundLight);
    pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    pdf.setTextColor(...textMedium);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Generated by ShadeSpace Professional Configurator', 15, pageHeight - 12);
    pdf.text('Visit shadespace.com for more information', 15, pageHeight - 5);
    
    pdf.setTextColor(...textLight);
    pdf.setFontSize(7);
    pdf.text(`Configuration saved: ${new Date().toISOString()}`, pageWidth - 15, pageHeight - 5, { align: 'right' });
    
    // Mobile-specific download handling
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `ShadeSpace-Quote-${timestamp}-${Date.now()}.pdf`;
    
    console.log('💾 Preparing PDF download...');

    // For in-app previews (PDF Studio), return a blob URL without triggering a download.
    if (layoutOptions?.returnBlob) {
      const pdfBlob = pdf.output('blob');
      return URL.createObjectURL(pdfBlob);
    }

        // For email summary, return base64 string
    if (isEmailSummary) {
      console.log('📧 Generating PDF as base64 for email');
      const pdfBase64 = pdf.output('datauristring'); // This returns base64 data URI
      console.log('✅ PDF base64 generated successfully');
      return pdfBase64;
    }


    console.log('📱 Filename:', filename);
    
    // Check if user is on iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    console.log('🍎 Is iOS device:', isIOS);
    
    if (isIOS) {
      console.log('📱 Using iOS-specific download method...');
      // For iOS devices, open PDF in new tab for better compatibility
      const pdfBlob = pdf.output('blob');
      console.log('📦 PDF blob created, size:', pdfBlob.size, 'bytes');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      console.log('🔗 Blob URL created:', pdfUrl);
      
      

      // Create a temporary link element for download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = filename;
      link.style.display = 'none';

      console.log('🔗 Triggering download via temporary link...');
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('✅ Download triggered successfully');
      
      // Clean up the blob URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
        console.log('🧹 Blob URL cleaned up');
      }, 1000);
    } else {
      console.log('🖥️ Using standard download method...');
      // For other devices, use standard save method
      pdf.save(filename);
      console.log('✅ PDF saved successfully');
    }
    
    console.log('🎉 PDF generation completed successfully');
    
  } catch (error) {
    console.error('❌ Critical error during PDF generation:', error);
    console.error('📊 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    throw error; // Re-throw to maintain existing error handling
  }
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
  const selectedColor = selectedFabric?.colors.find(c => c.name === config.fabricColor);
  const isFR = selectedFabric?.isFireRetardant && selectedColor?.isFireRetardant;
  const isExtraNonFR = selectedFabric?.isFireRetardant && selectedColor && !selectedColor.isFireRetardant;
  const rows: Array<[string, string]> = [
    ['Fabric Material', selectedFabric?.label || 'Not selected'],
    ['Fabric Color', `${config.fabricColor || 'Not selected'}${selectedColor?.shadeFactor ? ` (SF ${selectedColor.shadeFactor}%)` : ''}${isExtraNonFR ? ' (Not FR)' : ''}`],
    ['Warranty', selectedFabric ? `${selectedFabric.warrantyYears} Years` : 'Not specified'],
    ['Made In', selectedFabric?.madeIn || 'Not specified'],
    ['Fire Retardant', isFR ? 'Yes' : isExtraNonFR ? 'No (color)' : 'No'],
    ['Edge', config.edgeType === 'webbing' ? 'Webbing Reinforced' : config.edgeType === 'cabled' ? 'Cabled Edge' : 'Not selected'],
    ['Corners', String(config.corners)],
    ['Total Area', formatAreaForPDF(calc.area * 1000000, config.unit)],
    ['Total Perimeter', formatMeasurementForPDF(calc.perimeter * 1000, config.unit)],
    ['Total Weight', config.unit === 'imperial'
      ? `${(calc.totalWeightGrams / 1000 * 2.20462).toFixed(1)} lb`
      : `${(calc.totalWeightGrams / 1000).toFixed(1)} kg`],
    ['Units', config.unit === 'metric' ? 'Metric' : 'Imperial'],
    ['Manufacturing', config.measurementOption === 'adjust' ? 'Adjust to space' : 'Exact dimensions'],
  ];
  if (config.edgeType === 'webbing') {
    rows.push(['Webbing Width', `${calc.webbingWidth}mm`]);
  }
  if (config.edgeType === 'cabled' && calc.wireThickness) {
    rows.push(['Wire Thickness', `${calc.wireThickness}mm`]);
  }
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