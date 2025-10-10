import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ConfiguratorState, ShadeCalculations } from '../types';
import { FABRICS } from '../data/fabrics';
import { formatMeasurement, formatArea, getDiagonalKeysForCorners } from './geometry';
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

export async function generatePDF(
config: ConfiguratorState, calculations: ShadeCalculations, svgElement?: SVGElement | undefined, isEmailSummary?: boolean | undefined): Promise<string | void> {
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
    yPos += 15;
    
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
      ['Measurement Units:', config.unit === 'metric' ? 'Metric (mm/m)' : 'Imperial (in/ft)'],
      ['Manufacturing Option:', config.measurementOption === 'adjust' ? 'Adjust to fit space (hardware included)' : 'Exact dimensions (hardware not included)'],
      ...(config.measurementOption === 'adjust' ? [['Hardware Included:', 'Yes - Turnbuckles & Shackles']] : []),
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
      const isHardwareRow = label === 'Hardware Included:';
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
    yPos = 30;
    
    // Anchor Point Configuration (full width at top of page 2)
    const anchorPointsHeight = config.corners * 6 + 20;
    
    pdf.setTextColor(...primaryDark);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Anchor Point Configuration', 15, yPos);
    yPos += 12;
    
    pdf.setFillColor(255, 255, 255);
    pdf.rect(10, yPos - 5, pageWidth - 20, anchorPointsHeight, 'F');
    pdf.setDrawColor(...textLight);
    pdf.setLineWidth(0.2);
    pdf.rect(10, yPos - 5, pageWidth - 20, anchorPointsHeight, 'S');
    
    pdf.setTextColor(...primaryGreen);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Fixing Point Details', 15, yPos);
    yPos += 10;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    config.fixingHeights.forEach((height, index) => {
      const corner = String.fromCharCode(65 + index);
      const type = config.fixingTypes?.[index] || 'post';
      const orientation = config.eyeOrientations?.[index] || 'horizontal';
      
      const heightDisplay = height && height > 0 
        ? formatMeasurement(height, config.unit) 
        : 'Not set';
      
      pdf.setTextColor(...textMedium);
      pdf.text(`Corner ${corner}:`, 15, yPos);
      pdf.setTextColor(...textDark);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${heightDisplay} (${type}, ${orientation} eye)`, 50, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
    });
    
    yPos += 10; // Reduced spacing after anchor points
    
    // Add shade sail diagram if SVG element is provided
    if (svgElement) {
      console.log('🖼️ Starting shade sail diagram capture...');
      try {
        // Capture the SVG element as canvas
        const canvas = await html2canvas(svgElement, {
          backgroundColor: 'white', // White background to prevent black areas
          scale: 1, // Reduce scale for smaller file size
          width: 600,
          height: 600,
          useCORS: true,
          allowTaint: true,
          logging: false // Disable html2canvas logging
        });
        
        // Convert canvas to optimized JPEG
        const diagramBase64 = canvas.toDataURL('image/jpeg', 0.7); // Medium quality
        
        // Add diagram title
        pdf.setTextColor(...primaryDark);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Shade Sail Diagram', 15, yPos);
        yPos += 12;
        
        // Calculate diagram dimensions (maintain aspect ratio, fit within page)
        const maxDiagramWidth = pageWidth - 30; // Leave margins
        const maxDiagramHeight = 80; // Smaller square diagram to fit better
        
        // Make it a proper square, using the smaller of max width/height
        const diagramSize = Math.min(maxDiagramWidth, maxDiagramHeight);
        let diagramWidth = diagramSize;
        let diagramHeight = diagramSize;
        
        // Center the diagram horizontally
        const diagramX = (pageWidth - diagramWidth) / 2;
        
        // Add the diagram image
        pdf.addImage(diagramBase64, 'JPEG', diagramX, yPos, diagramWidth, diagramHeight);
        yPos += diagramHeight + 5;
        
        // Add diagram caption
        pdf.setTextColor(...textMedium);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Visual reference showing corner positions and measurements', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        console.log('✅ Shade sail diagram added successfully');
      } catch (error) {
        console.warn('⚠️ Diagram capture failed:', error);
        // Continue without diagram if capture fails
        yPos += 5;
      }
    }
    
    // Two-column layout at bottom of page 2
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