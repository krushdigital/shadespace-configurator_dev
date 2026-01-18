import jsPDF from 'jspdf';
import { ConfiguratorState, ShadeCalculations, Point } from '../types';
import { FABRICS } from '../data/fabrics';
import { formatMeasurement, formatArea, getDiagonalKeysForCorners, scalePolygonToCanvas, calculateCentroid } from './geometry';
import { formatCurrency } from './currencyFormatter';

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

// Function to convert SVG element to base64 PNG image
async function convertSvgToBase64Png(
  svgElement: SVGElement,
  width: number = 800,
  height: number = 800
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const pngDataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(svgUrl);
          resolve(pngDataUrl);
        } else {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('Failed to get canvas context'));
        }
      };

      img.onerror = function () {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Failed to load SVG image'));
      };

      img.src = svgUrl;
    } catch (error) {
      reject(error);
    }
  });
}

async function drawShadeSailDiagram(
  pdf: jsPDF,
  config: ConfiguratorState,
  x: number,
  y: number,
  width: number,
  height: number,
  fabricSwatchBase64?: string
): Promise<void> {
  const points = config.points;
  if (!points || points.length < 3) return;

  const scaledPoints = scalePolygonToCanvas(points, width, height, 15);
  const centroid = calculateCentroid(scaledPoints);

  const pdfPoints = scaledPoints.map(p => ({
    x: x + p.x,
    y: y + p.y
  }));
  const pdfCentroid = { x: x + centroid.x, y: y + centroid.y };

  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
  const selectedColor = selectedFabric?.colors.find(c => c.name === config.fabricColor);

  // Default to a visible green color
  let fillColor: [number, number, number] = [48, 124, 49];
  if (selectedColor?.hex) {
    const hex = selectedColor.hex.replace('#', '');
    fillColor = [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16)
    ];
  }

  // If we have a fabric swatch, use it as a tiled texture within the shape
  if (fabricSwatchBase64) {
    // First, draw the shape filled with a semi-transparent version of the color
    pdf.setFillColor(...fillColor);
    pdf.setDrawColor(48, 124, 49);
    pdf.setLineWidth(0.5);

    const lines: { op: string; c: number[] }[] = [];
    pdfPoints.forEach((point, index) => {
      if (index === 0) {
        lines.push({ op: 'm', c: [point.x, point.y] });
      } else {
        lines.push({ op: 'l', c: [point.x, point.y] });
      }
    });
    lines.push({ op: 'h', c: [] });

    // Draw filled shape
    (pdf as any).path(lines, 'FD');

    // Now overlay the fabric texture using addImage with clipping
    // Calculate bounding box of the shape
    const minX = Math.min(...pdfPoints.map(p => p.x));
    const maxX = Math.max(...pdfPoints.map(p => p.x));
    const minY = Math.min(...pdfPoints.map(p => p.y));
    const maxY = Math.max(...pdfPoints.map(p => p.y));
    const shapeWidth = maxX - minX;
    const shapeHeight = maxY - minY;

    // Add the fabric texture as an overlay within the shape bounds
    // Using a semi-transparent overlay effect
    try {
      // Create a clipping path
      pdf.saveGraphicsState();
      const clipLines: { op: string; c: number[] }[] = [];
      pdfPoints.forEach((point, index) => {
        if (index === 0) {
          clipLines.push({ op: 'm', c: [point.x, point.y] });
        } else {
          clipLines.push({ op: 'l', c: [point.x, point.y] });
        }
      });
      clipLines.push({ op: 'h', c: [] });
      clipLines.push({ op: 'W', c: [] }); // Clip
      clipLines.push({ op: 'n', c: [] }); // End path without drawing

      (pdf as any).path(clipLines);

      // Add texture with slight transparency to show the fabric pattern
      pdf.addImage(fabricSwatchBase64, 'JPEG', minX, minY, shapeWidth, shapeHeight, undefined, 'FAST');

      pdf.restoreGraphicsState();
    } catch (error) {
      console.warn('Failed to add fabric texture to PDF:', error);
    }
  } else {
    // No fabric texture, just fill with solid color
    pdf.setFillColor(...fillColor);
    pdf.setDrawColor(48, 124, 49);
    pdf.setLineWidth(0.5);

    const lines: { op: string; c: number[] }[] = [];
    pdfPoints.forEach((point, index) => {
      if (index === 0) {
        lines.push({ op: 'm', c: [point.x, point.y] });
      } else {
        lines.push({ op: 'l', c: [point.x, point.y] });
      }
    });
    lines.push({ op: 'h', c: [] });

    // Draw filled shape
    (pdf as any).path(lines, 'FD');
  }

  for (let i = 0; i < config.corners; i++) {
    const nextIndex = (i + 1) % config.corners;
    const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
    const measurement = config.measurements[edgeKey];

    if (measurement) {
      const from = pdfPoints[i];
      const to = pdfPoints[nextIndex];
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;

      const edgeX = to.x - from.x;
      const edgeY = to.y - from.y;
      const perpX = -edgeY;
      const perpY = edgeX;
      const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);

      if (perpLength > 0) {
        const normalizedPerpX = perpX / perpLength;
        const normalizedPerpY = perpY / perpLength;

        const toCentroidX = pdfCentroid.x - midX;
        const toCentroidY = pdfCentroid.y - midY;
        const dotProduct = normalizedPerpX * toCentroidX + normalizedPerpY * toCentroidY;
        const direction = dotProduct > 0 ? -1 : 1;

        const labelOffset = 5;
        const labelX = midX + normalizedPerpX * labelOffset * direction;
        const labelY = midY + normalizedPerpY * labelOffset * direction;

        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(5, 150, 105);
        pdf.text(formatMeasurement(measurement, config.unit), labelX, labelY, { align: 'center' });
      }
    }
  }

  if (config.corners >= 4) {
    const diagonalKeys = getDiagonalKeysForCorners(config.corners);
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.3);

    diagonalKeys.forEach(key => {
      const measurement = config.measurements[key];
      if (measurement) {
        const fromIndex = key.charCodeAt(0) - 65;
        const toIndex = key.charCodeAt(1) - 65;

        if (fromIndex < pdfPoints.length && toIndex < pdfPoints.length) {
          const from = pdfPoints[fromIndex];
          const to = pdfPoints[toIndex];

          pdf.setLineDashPattern([1, 1], 0);
          pdf.line(from.x, from.y, to.x, to.y);
          pdf.setLineDashPattern([], 0);

          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          const edgeX = to.x - from.x;
          const edgeY = to.y - from.y;
          const perpX = -edgeY;
          const perpY = edgeX;
          const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);

          if (perpLength > 0) {
            const normalizedPerpX = perpX / perpLength;
            const normalizedPerpY = perpY / perpLength;

            const toCentroidX = pdfCentroid.x - midX;
            const toCentroidY = pdfCentroid.y - midY;
            const dotProduct = normalizedPerpX * toCentroidX + normalizedPerpY * toCentroidY;
            const direction = dotProduct > 0 ? -1 : 1;

            const labelOffset = 4;
            const labelX = midX + normalizedPerpX * labelOffset * direction;
            const labelY = midY + normalizedPerpY * labelOffset * direction;

            pdf.setFontSize(5);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(59, 130, 246);
            pdf.text(formatMeasurement(measurement, config.unit), labelX, labelY, { align: 'center' });
          }
        }
      }
    });
  }

  const cornerRadius = 2;
  pdf.setFillColor(48, 124, 49);
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.3);

  pdfPoints.forEach((point, index) => {
    pdf.circle(point.x, point.y, cornerRadius, 'FD');

    const dx = point.x - pdfCentroid.x;
    const dy = point.y - pdfCentroid.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    let labelX = point.x;
    let labelY = point.y;
    if (length > 0) {
      const normalizedX = dx / length;
      const normalizedY = dy / length;
      const labelOffset = 5;
      labelX = point.x + normalizedX * labelOffset;
      labelY = point.y + normalizedY * labelOffset;
    }

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text(String.fromCharCode(65 + index), labelX, labelY + 0.5, { align: 'center' });
  });

  if (config.measurementOption === 'adjust') {
    pdfPoints.forEach((point, index) => {
      const dx = pdfCentroid.x - point.x;
      const dy = pdfCentroid.y - point.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const normalizedX = dx / length;
        const normalizedY = dy / length;
        const turnbuckleLength = 3;

        const startX = point.x + normalizedX * cornerRadius;
        const startY = point.y + normalizedY * cornerRadius;
        const endX = startX + normalizedX * turnbuckleLength;
        const endY = startY + normalizedY * turnbuckleLength;

        pdf.setDrawColor(220, 38, 38);
        pdf.setLineWidth(0.5);
        pdf.line(startX, startY, endX, endY);
      }
    });
  }
}

export interface CustomerDetails {
  firstName?: string;
  lastName?: string;
  email?: string;
  quoteName?: string;
  customerReference?: string | null;
}

export async function generatePDF(
config: ConfiguratorState, calculations: ShadeCalculations, svgElement?: SVGElement | undefined, isEmailSummary?: boolean | undefined, customerDetails?: CustomerDetails): Promise<string | void> {
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
    
    const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
    const selectedColor = selectedFabric?.colors.find(c => c.name === config.fabricColor);
    
    // Hardware pack image mapping
    const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
      3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
      4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
      5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
      6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
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

    // Convert SVG canvas to PNG for diagram if available
    let canvasDiagramBase64: string | undefined;
    if (svgElement) {
      console.log('🎨 Converting SVG canvas to PNG for diagram...');
      try {
        canvasDiagramBase64 = await convertSvgToBase64Png(svgElement, 800, 800);
        console.log('✅ SVG canvas converted to PNG successfully');
      } catch (error) {
        console.warn('⚠️ SVG canvas conversion failed, will use manual drawing:', error);
        // SVG conversion failed - will fall back to manual drawing
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
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Custom Shade Sail Quote', 15, yPos);
    yPos += 12;

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

    // Determine if fabric color is fire retardant
    const isFireRetardant = selectedFabric?.id === 'extrablock330' && 
      config.fabricColor && 
      !['Yellow', 'Red', 'Cream', 'Beige'].includes(config.fabricColor);
    
    // Determine if it's ExtraBlock with non-FR color
    const isExtrablockNonFRColor = selectedFabric?.id === 'extrablock330' && 
      config.fabricColor && 
      ['Yellow', 'Red', 'Cream', 'Beige'].includes(config.fabricColor);
    
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
          ? `${(calculations.webbingWidth * 0.0393701).toFixed(2)}"`
          : `${calculations.webbingWidth}mm`
      ]] : []),
      ...(config.edgeType === 'cabled' && calculations.wireThickness ? [[
        'Wire Thickness:',
        config.unit === 'imperial'
          ? `${(calculations.wireThickness * 0.0393701).toFixed(2)}"`
          : `${calculations.wireThickness}mm`
      ]] : []),
      ['Number of Corners:', config.corners.toString()],
      ['Total Area:', formatArea(calculations.area * 1000000, config.unit)],
      ['Total Perimeter:', formatMeasurement(calculations.perimeter * 1000, config.unit)],
      ['Total Weight:', config.unit === 'imperial'
        ? `${(calculations.totalWeightGrams / 1000 * 2.20462).toFixed(1)} lb`
        : `${(calculations.totalWeightGrams / 1000).toFixed(1)} kg`],
      ['Measurement Units:', config.unit === 'metric' ? 'Metric: mm' : 'Imperial: Inches'],
      ['Manufacturing Option:', config.measurementOption === 'adjust' ? 'Adjust to fit space (hardware included)' : 'Exact dimensions (hardware not included)'],
      ...(config.measurementOption === 'adjust' ? [['Tensioning Hardware Included:', 'Yes - Turnbuckles & Shackles']] : []),
      ['Fixing Points Installed:', config.fixingPointsInstalled === true ? 'Yes - Already Installed' : config.fixingPointsInstalled === false ? 'No - Planning Installation' : 'Not specified'],
    ];
    
    // Configuration summary card
    const configSummaryHeight = configDetails.length * 7 + 20;
    pdf.setFillColor(...backgroundLight);
    pdf.rect(10, yPos - 5, pageWidth - 20, configSummaryHeight, 'F');
    pdf.setDrawColor(...textLight);
    pdf.setLineWidth(0.2);
    pdf.rect(10, yPos - 5, pageWidth - 20, configSummaryHeight, 'S');
    
    pdf.setTextColor(...primaryDark);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Configuration Summary', 15, yPos);
    yPos += 10;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    configDetails.forEach(([label, value]) => {
      const isColorRow = label === 'Fabric Color:';
      const isHardwareRow = label === 'Tensioning Hardware Included:';
      pdf.setTextColor(...textMedium);
      pdf.text(label, 20, yPos);
      pdf.setTextColor(...textDark);
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, 80, yPos);
      
      // Add fabric swatch image next to color
      if (isColorRow && fabricSwatchBase64) {
        const swatchSize = 6;
        const valueWidth = pdf.getTextWidth(value);
        const swatchX = 80 + valueWidth + 5; // Position after the color name with 5mm gap
        pdf.addImage(fabricSwatchBase64, 'PNG', swatchX, yPos - 4, swatchSize, swatchSize);
      }
      
      // Add hardware pack image next to hardware info
      if (isHardwareRow && hardwarePackBase64) {
        const swatchSize = 8;
        const valueWidth = pdf.getTextWidth(value);
        const swatchX = 80 + valueWidth + 5; // Position after the hardware text with 5mm gap
        pdf.addImage(hardwarePackBase64, 'PNG', swatchX, yPos - 5, swatchSize, swatchSize);
      }
      
      pdf.setFont('helvetica', 'normal');
      yPos += 7;
    });
    
    yPos += 20; // Reduced spacing after configuration summary
    
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
          diagonalMeasurements.push([`Diagonal ${key.charAt(0)} to ${key.charAt(1)}:`, formatMeasurement(config.measurements[key], config.unit)]);
        }
      });
    }
    const diagonalMeasurementsCount = diagonalMeasurements.length;

    const maxMeasurementsCount = Math.max(edgeMeasurementsCount, diagonalMeasurementsCount);
    const measurementCardHeight = Math.max(maxMeasurementsCount * 5 + 15, 40); // Reduced height for page 1

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
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];
        
        const label = `Edge ${String.fromCharCode(65 + i)} to ${String.fromCharCode(65 + nextIndex)}:`;
        const value = measurement ? formatMeasurement(measurement, config.unit) : 'Not provided';
        
        pdf.setTextColor(...textMedium);
        pdf.text(label, leftColX + 5, currentEdgeY);
        pdf.setTextColor(...textDark);
        pdf.setFont('helvetica', 'bold');
        pdf.text(value, leftColX + 50, currentEdgeY);
        pdf.setFont('helvetica', 'normal');
        currentEdgeY += 5;
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
        currentDiagonalY += 5;
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
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];
        
        const label = `Edge ${String.fromCharCode(65 + i)} to ${String.fromCharCode(65 + nextIndex)}:`;
        const value = measurement ? formatMeasurement(measurement, config.unit) : 'Not provided';
        
        pdf.setTextColor(...textMedium);
        pdf.text(label, leftColX + 5, currentEdgeY);
        pdf.setTextColor(...textDark);
        pdf.setFont('helvetica', 'bold');
        pdf.text(value, leftColX + 50, currentEdgeY);
        pdf.setFont('helvetica', 'normal');
        currentEdgeY += 5;
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
        ? formatMeasurement(height, config.unit)
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

    if (config.points && config.points.length >= 3) {
      if (canvasDiagramBase64) {
        console.log('📸 Using SVG canvas screenshot for diagram');
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
      } else {
        console.log('✏️ Using manual drawing for diagram (SVG not available)');
        await drawShadeSailDiagram(
          pdf,
          config,
          rightColX + 2,
          diagramCardY + 2,
          colWidth - 4,
          diagramHeight,
          fabricSwatchBase64
        );
      }
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