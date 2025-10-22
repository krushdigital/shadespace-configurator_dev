import React, { useState, useEffect, forwardRef, useRef, useMemo } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { PriceSummaryDisplay } from '../PriceSummaryDisplay';
import { InteractiveMeasurementCanvas, InteractiveMeasurementCanvasRef } from '../InteractiveMeasurementCanvas';
import { AccordionItem } from '../ui/AccordionItem';
import { FABRICS } from '../../data/fabrics';
import { convertMmToUnit, formatMeasurement, formatArea, validatePolygonGeometry, formatDualMeasurement, getDualMeasurementValues, getDiagonalKeysForCorners } from '../../utils/geometry';
import { formatCurrency } from '../../utils/currencyFormatter';

interface ReviewContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors?: { [key: string]: string };
  onNext?: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  // Pricing and order props (lifted from local state)
  isGeneratingPDF: boolean;
  handleGeneratePDF: () => void;
  showEmailInput: boolean;
  email: string;
  setEmail: (email: string) => void;
  handleEmailSummary: () => void;
  acknowledgments: {
    customManufactured: boolean;
    measurementsAccurate: boolean;
    installationNotIncluded: boolean;
    structuralResponsibility: boolean;
  };
  handleAcknowledgmentChange: (key: keyof ReviewContentProps['acknowledgments']) => void;
  handleAddToCart: (orderData: any) => void;
  allDiagonalsEntered: boolean;
  allAcknowledgmentsChecked: boolean;
  canAddToCart: boolean;
  hasAllEdgeMeasurements: boolean;
  isMobile?: boolean;
  handleCancelEmailInput: () => void;
  canvasRef: React.RefObject<InteractiveMeasurementCanvasRef>;
  loading: boolean
  setLoading: (loading: boolean) => void;
  setShowLoadingOverlay: (loading: boolean) => void;
  quoteReference?: string | null;
  onSaveQuote?: () => void;
}

export const ReviewContent = forwardRef<HTMLDivElement, ReviewContentProps>(({
  config,
  updateConfig,
  calculations,
  nextStepTitle = '',
  showBackButton = false,
  onPrev,
  isGeneratingPDF,
  handleGeneratePDF,
  showEmailInput,
  email,
  setEmail,
  handleEmailSummary,
  acknowledgments,
  handleAcknowledgmentChange,
  handleAddToCart,
  allDiagonalsEntered,
  allAcknowledgmentsChecked,
  canAddToCart,
  hasAllEdgeMeasurements,
  isMobile = false,
  handleCancelEmailInput,
  canvasRef,
  loading,
  setLoading,
  setShowLoadingOverlay,
  onSaveQuote
}, ref) => {
  const [highlightedMeasurement, setHighlightedMeasurement] = useState<string | null>(null);
  const [showValidationFeedback, setShowValidationFeedback] = useState(false);
  const [buttonShake, setButtonShake] = useState(false);
  const diagonalCardRef = useRef<HTMLDivElement>(null);
  const acknowledgementsCardRef = useRef<HTMLDivElement>(null);
  const addToCartButtonRef = useRef<HTMLDivElement>(null);
  const [detectedCurrency, setDetectedCurrency] = useState("")

  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
  const selectedColor = selectedFabric?.colors.find(c => c.name === config.fabricColor);

  console.log({
    config,
    updateConfig,
    calculations,
    nextStepTitle,
    showBackButton,
    onPrev,
    isGeneratingPDF,
    handleGeneratePDF,
    showEmailInput,
    email,
    setEmail,
    handleEmailSummary,
    acknowledgments,
    handleAcknowledgmentChange,
    handleAddToCart,
    allDiagonalsEntered,
    allAcknowledgmentsChecked,
    canAddToCart,
    hasAllEdgeMeasurements,
    isMobile,
    handleCancelEmailInput,
    canvasRef,
    loading,
    setLoading,
    setShowLoadingOverlay
  });





  // Validate polygon geometry
  const geometryValidation = useMemo(() => {
    if (config.corners < 3 || calculations.area > 0) {
      return { isValid: true, errors: [] };
    }

    // Only validate if all required measurements are present
    if (!hasAllEdgeMeasurements || !allDiagonalsEntered) {
      return { isValid: true, errors: [] };
    }

    return validatePolygonGeometry(config.measurements, config.corners);
  }, [config.measurements, config.corners, calculations.area, hasAllEdgeMeasurements, allDiagonalsEntered]);

  const updateMeasurement = (edgeKey: string, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      const mmValue = config.unit === 'imperial' ? numericValue * 25.4 : numericValue;
      const newMeasurements = { ...config.measurements, [edgeKey]: mmValue };
      updateConfig({ measurements: newMeasurements });
    } else if (value === '') {
      // Allow clearing the field
      const newMeasurements = { ...config.measurements };
      delete newMeasurements[edgeKey];
      updateConfig({ measurements: newMeasurements });
    }
  };

  const getDiagonalMeasurements = () => {
    const diagonals = [];

    if (config.corners === 4) {
      diagonals.push(
        { key: 'AC', label: 'Diagonal A → C', hasValue: !!config.measurements['AC'] },
        { key: 'BD', label: 'Diagonal B → D', hasValue: !!config.measurements['BD'] }
      );
    } else if (config.corners === 5) {
      diagonals.push(
        { key: 'AC', label: 'Diagonal A → C', hasValue: !!config.measurements['AC'] },
        { key: 'AD', label: 'Diagonal A → D', hasValue: !!config.measurements['AD'] },
        { key: 'CE', label: 'Diagonal C → E', hasValue: !!config.measurements['CE'] },
        { key: 'BD', label: 'Diagonal B → D', hasValue: !!config.measurements['BD'] },
        { key: 'BE', label: 'Diagonal B → E', hasValue: !!config.measurements['BE'] }
      );
    } else if (config.corners === 6) {
      diagonals.push(
        { key: 'AC', label: 'Diagonal A → C', hasValue: !!config.measurements['AC'] },
        { key: 'AD', label: 'Diagonal A → D', hasValue: !!config.measurements['AD'] },
        { key: 'AE', label: 'Diagonal A → E', hasValue: !!config.measurements['AE'] },
        { key: 'BD', label: 'Diagonal B → D', hasValue: !!config.measurements['BD'] },
        { key: 'BE', label: 'Diagonal B → E', hasValue: !!config.measurements['BE'] },
        { key: 'BF', label: 'Diagonal B → F', hasValue: !!config.measurements['BF'] },
        { key: 'CE', label: 'Diagonal C → E', hasValue: !!config.measurements['CE'] },
        { key: 'CF', label: 'Diagonal C → F', hasValue: !!config.measurements['CF'] },
        { key: 'DF', label: 'Diagonal D → F', hasValue: !!config.measurements['DF'] }
      );
    }

    return diagonals;
  };

  const diagonalMeasurements = getDiagonalMeasurements();

  // Only show diagonal input section for 4+ corners if diagonals were NOT initially provided
  const shouldShowDiagonalInputSection = config.corners >= 4 && !config.diagonalsInitiallyProvided;

  interface ConvertSvgToPngOptions {
    width?: number;
    height?: number;
  }

  const convertSvgToPng = async (
    svgElement: SVGSVGElement,
    width?: number,
    height?: number
  ): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      try {
        // Serialize SVG to string
        const svgString: string = new XMLSerializer().serializeToString(svgElement);

        // Create a blob from the SVG string
        const svgBlob: Blob = new Blob([svgString], { type: 'image/svg+xml' });
        const svgUrl: string = URL.createObjectURL(svgBlob);

        // Create an image element
        const img: HTMLImageElement = new Image();
        img.onload = function () {
          // Create a canvas with the desired dimensions
          const canvas: HTMLCanvasElement = document.createElement('canvas');
          canvas.width = width || img.width;
          canvas.height = height || img.height;

          // Draw the image on the canvas
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Convert canvas to PNG
            const pngUrl: string = canvas.toDataURL('image/png');

            // Clean up
            URL.revokeObjectURL(svgUrl);

            // Convert data URL to blob
            fetch(pngUrl)
              .then(res => res.blob())
              .then((blob: Blob) => {
                resolve(blob);
              })
              .catch(error => reject(error));
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
        reject(error as Error);
      }
    });
  };


  // Add this function to your component
  const uploadImageToShopify = async (blob: Blob, filename: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', blob, filename);

      const response = await fetch('/apps/shade_space/api/v1/public/file/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image to Shopify');
      }

      const result = await response.json();

      if (result.success && result.url) {
        return result.url;
      } else {
        console.error('Shopify upload failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error uploading image to Shopify:', error);
      return null;
    }
  };

  const handleAttemptAddToCart = async () => {
    if (!canAddToCart) {
      // Immediately trigger validation feedback
      setShowValidationFeedback(true);

      // Shake the button to provide immediate feedback
      setButtonShake(true);
      setTimeout(() => setButtonShake(false), 500);

      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        let targetElement: HTMLElement | null = null;

        // Identify which section needs attention
        if (!allDiagonalsEntered && shouldShowDiagonalInputSection) {
          targetElement = diagonalCardRef.current;
        } else if (!allAcknowledgmentsChecked) {
          targetElement = acknowledgementsCardRef.current;
        }

        if (targetElement) {
          // Calculate scroll position
          const isMobileView = window.innerWidth < 1024;
          const headerOffset = isMobileView ? 100 : 120;
          const viewportOffset = window.innerHeight * 0.15;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset - viewportOffset;

          // Scroll to the incomplete section
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });

          // Apply pulse animation after scroll completes
          setTimeout(() => {
            targetElement?.classList.add('pulse-error');
            setTimeout(() => {
              targetElement?.classList.remove('pulse-error');
            }, 2400);
          }, 600);
        }
      }, 50);

      // Do not proceed with cart addition
      return;
    } else {
      setShowValidationFeedback(false);

      // Get the SVG element
      const svgElement = canvasRef.current?.getSVGElement();
      let canvasImageUrl = null;

      if (svgElement) {
        try {
          const canvasImageBlob = await convertSvgToPng(svgElement, 600, 500);

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `shade-sail-${config.corners}corner-${timestamp}.png`;

          canvasImageUrl = await uploadImageToShopify(canvasImageBlob, filename);

          if (!canvasImageUrl) {
            console.warn('Failed to upload canvas image to Shopify, proceeding without image');
          }
        } catch (error) {
          console.error('Error processing canvas image:', error);
        }
      }

      // FIXED: Properly calculate edge measurements
      const edgeMeasurements: { [key: string]: { unit: string; formatted: string } } = {};
      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];

        if (measurement && measurement > 0) {
          edgeMeasurements[edgeKey] = {
            unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
            formatted: formatMeasurement(measurement, config.unit)
          };
        }
      }

      const diagonalMeasurementsObj: { [key: string]: { unit: string; formatted: string } } = {};

      // Use the same diagonal keys that are displayed in the UI
      const diagonalKeys = [];
      if (config.corners === 4) {
        diagonalKeys.push('AC', 'BD');
      } else if (config.corners === 5) {
        diagonalKeys.push('AC', 'AD', 'CE', 'BD', 'BE');
      } else if (config.corners === 6) {
        diagonalKeys.push('AC', 'AD', 'AE', 'BD', 'BE', 'BF', 'CE', 'CF', 'DF');
      }

      diagonalKeys.forEach((diagonalKey) => {
        const measurement = config.measurements[diagonalKey];
        if (measurement && measurement > 0) {
          diagonalMeasurementsObj[diagonalKey] = {
            unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
            formatted: formatMeasurement(measurement, config.unit)
          };
        }
      });


      const anchorPointMeasurements: { [key: string]: { unit: string; formatted: string } } = {};
      config.fixingHeights.forEach((height, index) => {
        const corner = String.fromCharCode(65 + index);
        anchorPointMeasurements[corner] = {
          unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
          formatted: formatMeasurement(height, config.unit)
        };
      });

      // Create backend-only dual measurement objects for Shopify admin
      const backendEdgeMeasurements: Record<string, string> = {};
      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];
        if (measurement && measurement > 0) {
          backendEdgeMeasurements[edgeKey] = formatDualMeasurement(measurement, config.unit);
        }
      }

      const backendDiagonalMeasurements: Record<string, string> = {};
      // Reuse diagonalKeys already declared above
      diagonalKeys.forEach(key => {
        const measurement = config.measurements[key];
        if (measurement && measurement > 0) {
          backendDiagonalMeasurements[key] = formatDualMeasurement(measurement, config.unit);
        }
      });

      const backendAnchorMeasurements: Record<string, string> = {};
      config.fixingHeights.forEach((height, index) => {
        const corner = String.fromCharCode(65 + index);
        if (height && height > 0) {
          backendAnchorMeasurements[corner] = formatDualMeasurement(height, config.unit);
        }
      });

      const hardwareIncluded = config.measurementOption === 'adjust';
      const hardwareText = hardwareIncluded ? 'Included' : 'Not Included';

      if (canvasImageUrl) {
        const orderData = {
          fabricType: config.fabricType,
          fabricColor: config.fabricColor,
          edgeType: config.edgeType,
          corners: config.corners,
          unit: config.unit,
          currency: config.currency,
          measurementOption: config.measurementOption,
          hardware_included: hardwareText,
          measurements: config.measurements,
          area: calculations.area,
          perimeter: calculations.perimeter,
          totalPrice: calculations.totalPrice,
          totalWeightGrams: calculations.totalWeightGrams,
          selectedFabric: selectedFabric,
          selectedColor: selectedColor,
          canvasImageUrl: canvasImageUrl,
          warranty: selectedFabric?.warrantyYears || "",
          fixingHeights: config.fixingHeights,
          fixingTypes: config.fixingTypes,
          fixingPointsInstalled: config.fixingPointsInstalled,
          ...(config.fixingPointsInstalled === true && { eyeOrientations: config.eyeOrientations }),
          // Add the properly calculated measurements
          edgeMeasurements: edgeMeasurements,
          diagonalMeasurementsObj: diagonalMeasurementsObj,
          anchorPointMeasurements: anchorPointMeasurements,
          // Additional metadata
          Fabric_Type: config.fabricType === 'extrablock330' && config.fabricColor && ['Yellow', 'Red', 'Cream', 'Beige'].includes(config.fabricColor) ?
            'Not FR Certified' : selectedFabric?.label,
          Shade_Factor: selectedColor?.shadeFactor,
          Edge_Type: config.edgeType === 'webbing' ? 'Webbing Reinforced' : 'Cabled Edge',
          Wire_Thickness: config.unit === 'imperial' ?
            calculations?.wireThickness !== undefined ? `${(calculations.wireThickness * 0.0393701).toFixed(2)}"` : 'N/A'
            : calculations?.wireThickness !== undefined ? `${calculations.wireThickness}mm` : 'N/A',
          Area: formatArea(calculations.area * 1000000, config.unit),
          Perimeter: formatMeasurement(calculations.perimeter * 1000, config.unit),
          createdAt: new Date().toISOString(),
          // Add dual measurements for backend/fulfillment
          backendEdgeMeasurements,
          backendDiagonalMeasurements,
          backendAnchorMeasurements,
          originalUnit: config.unit
        };

        handleAddToCart(orderData);
      }
    }
  };

  // Enhanced PDF generation with SVG element
  const handleGeneratePDFWithSVG = async () => {
    const svgElement = canvasRef.current?.getSVGElement();
    await handleGeneratePDF(svgElement);
  };




  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Main Layout - Left Content + Right Sticky Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Content Column - Configuration Summary, Measurements, Heights, etc. */}
          <div className="lg:col-span-2 space-y-6">
            {/* Configuration Summary */}
            <h4 className="text-lg font-semibold text-slate-900 mb-3">
              Configuration Summary
            </h4>
            <Card className="p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Fabric Material:</span>
                  <span className="font-medium text-slate-900">{selectedFabric?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Fabric Color:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {config.fabricColor}
                    </span>
                    {selectedColor?.imageUrl && (
                      <img
                        src={selectedColor.imageUrl}
                        alt={config.fabricColor}
                        className="w-6 h-6 rounded-full border border-slate-300 shadow-sm object-cover"
                      />
                    )}
                    {config.fabricType === 'extrablock330' &&
                      config.fabricColor &&
                      ['Yellow', 'Red', 'Cream', 'Beige'].includes(config.fabricColor) && (
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          Not FR Certified
                        </span>
                      )}
                  </div>
                </div>
                {selectedColor?.shadeFactor && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Shade Factor:</span>
                    <span className="font-medium text-slate-900">{selectedColor.shadeFactor}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Edge Type:</span>
                  <span className="font-medium text-slate-900">
                    {config.edgeType === 'webbing' ? 'Webbing Reinforced' : 'Cabled Edge'}
                  </span>
                </div>
                {config.edgeType === 'webbing' && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Webbing Width:</span>
                    <span className="font-medium text-slate-900">
                      {config.unit === 'imperial'
                        ? `${(calculations.webbingWidth * 0.0393701).toFixed(2)}"`
                        : `${calculations.webbingWidth}mm`
                      }
                    </span>
                  </div>
                )}
                {config.edgeType === 'cabled' && calculations.wireThickness && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Wire Thickness:</span>
                    <span className="font-medium text-slate-900">
                      {config.unit === 'imperial'
                        ? `${(calculations.wireThickness * 0.0393701).toFixed(2)}"`
                        : `${calculations.wireThickness}mm`
                      }
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Corners:</span>
                  <span className="font-medium text-slate-900">{config.corners}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Fixing Points Installed:</span>
                  <span className="font-medium text-slate-900">
                    {config.fixingPointsInstalled === true ? 'Yes - Already Installed' : config.fixingPointsInstalled === false ? 'No - Planning Installation' : 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Area:</span>
                  <span className="font-medium text-slate-900">
                    {formatArea(calculations.area * 1000000, config.unit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Perimeter:</span>
                  <span className="font-medium text-slate-900">
                    {formatMeasurement(calculations.perimeter * 1000, config.unit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Weight:</span>
                  <span className="font-medium text-slate-900">
                    {config.unit === 'imperial'
                      ? `${(calculations.totalWeightGrams / 1000 * 2.20462).toFixed(1)} lb`
                      : `${(calculations.totalWeightGrams / 1000).toFixed(1)} kg`
                    }
                  </span>
                </div>
                {config.measurementOption === 'adjust' && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tensioning Hardware Included:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">Yes</span>
                      {(() => {
                        const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
                          3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
                          4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
                          5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
                          6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
                        };
                        const hardwarePackImageUrl = HARDWARE_PACK_IMAGES[config.corners];
                        return hardwarePackImageUrl ? (
                          <img
                            src={hardwarePackImageUrl}
                            alt={`${config.corners} Corner Hardware Pack`}
                            className="w-8 h-8 rounded border border-slate-300 shadow-sm object-cover"
                          />
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Geometric Validation Warning */}
            {!geometryValidation.isValid && calculations.area === 0 && hasAllEdgeMeasurements && allDiagonalsEntered && (
              <Card className="p-4 mb-4 border-2 border-red-500 bg-red-50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-red-800 mb-2">
                      Invalid Measurements Detected
                    </h4>
                    <p className="text-sm text-red-700 mb-3">
                      Your measurements create a geometrically impossible shape. This usually happens when measurements are entered incorrectly or contain typos. Please verify and correct the following issues:
                    </p>
                    <div className="space-y-2">
                      {geometryValidation.errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">•</span>
                          <p className="text-sm text-red-700 font-mono">{error}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                      <p className="text-sm text-red-800">
                        <strong>Note:</strong> The triangle inequality theorem states that the sum of any two sides of a triangle must be greater than the third side. Please check your edge and diagonal measurements for accuracy.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Precise Measurements Summary */}
            <div>
              {isMobile ? (
                <AccordionItem
                  trigger={
                    <span className="flex items-center gap-2">
                      <span>Edge & Diagonal Measurements</span>
                      <span className="bg-[#01312D] text-white text-xs px-2 py-0.5 rounded-full">
                        {config.corners + (config.corners >= 4 ? diagonalMeasurements.length : 0)}
                      </span>
                    </span>
                  }
                  defaultOpen={false}
                >
                  <Card className="p-3 mt-2">
                    <div className="space-y-3">
                      <div>
                        <h6 className="text-xs font-semibold text-slate-700 mb-2">Edge Lengths:</h6>
                        <div className="space-y-1 text-xs">
                          {Array.from({ length: config.corners }, (_, index) => {
                            const nextIndex = (index + 1) % config.corners;
                            const edgeKey = `${String.fromCharCode(65 + index)}${String.fromCharCode(65 + nextIndex)}`;
                            const measurement = config.measurements[edgeKey];

                            return (
                              <div key={edgeKey} className="flex justify-between">
                                <span className="text-slate-600">
                                  Edge {String.fromCharCode(65 + index)} → {String.fromCharCode(65 + nextIndex)}:
                                </span>
                                <span className="font-medium text-slate-900">
                                  {measurement ? formatMeasurement(measurement, config.unit) : 'Not set'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {config.corners >= 4 && diagonalMeasurements.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <h6 className="text-xs font-semibold text-slate-700 mb-2">Diagonal Lengths:</h6>
                          <div className="space-y-1 text-xs">
                            {diagonalMeasurements.map((diagonal) => {
                              const measurement = config.measurements[diagonal.key];

                              return (
                                <div key={diagonal.key} className="flex justify-between">
                                  <span className="text-slate-600">
                                    Diagonal {diagonal.key}:
                                  </span>
                                  <span className="font-medium text-slate-900">
                                    {measurement ? formatMeasurement(measurement, config.unit) : 'Not set'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </AccordionItem>
              ) : (
                <>
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">
                    Precise Measurements
                  </h4>
                  <Card className="p-4 mb-4">
                    <div className="space-y-3">
                      <div>
                        <h6 className="text-sm font-medium text-slate-700 mb-2">Edge Lengths:</h6>
                        <div className="space-y-1 text-sm">
                          {Array.from({ length: config.corners }, (_, index) => {
                            const nextIndex = (index + 1) % config.corners;
                            const edgeKey = `${String.fromCharCode(65 + index)}${String.fromCharCode(65 + nextIndex)}`;
                            const measurement = config.measurements[edgeKey];

                            return (
                              <div key={edgeKey} className="flex justify-between">
                                <span className="text-slate-600">
                                  Edge {String.fromCharCode(65 + index)} → {String.fromCharCode(65 + nextIndex)}:
                                </span>
                                <span className="font-medium text-slate-900">
                                  {measurement ? formatMeasurement(measurement, config.unit) : 'Not set'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {config.corners >= 4 && diagonalMeasurements.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-slate-700 mb-2">Diagonal Lengths:</h6>
                          <div className="space-y-1 text-sm">
                            {diagonalMeasurements.map((diagonal) => {
                              const measurement = config.measurements[diagonal.key];

                              return (
                                <div key={diagonal.key} className="flex justify-between">
                                  <span className="text-slate-600">
                                    Diagonal {diagonal.key}:
                                  </span>
                                  <span className="font-medium text-slate-900">
                                    {measurement ? formatMeasurement(measurement, config.unit) : 'Not set'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </>
              )}
            </div>

            {/* Anchor Point Heights */}
            <div>
              {isMobile ? (
                <AccordionItem
                  trigger={
                    <span className="flex items-center gap-2">
                      <span>Anchor Point Heights</span>
                      <span className="bg-[#01312D] text-white text-xs px-2 py-0.5 rounded-full">
                        {config.corners}
                      </span>
                    </span>
                  }
                  defaultOpen={false}
                >
                  <Card className="p-3 mt-2">
                    <div className="space-y-2 text-xs">
                      {config.fixingHeights.map((height, index) => {
                        const corner = String.fromCharCode(65 + index);
                        const type = config.fixingTypes?.[index] || 'post';
                        const orientation = config.eyeOrientations?.[index];

                        return (
                          <div key={index} className="flex justify-between">
                            <span className="text-slate-600">Point {corner}:</span>
                            <div className="text-right">
                              <div className="font-medium text-slate-900">
                                {formatMeasurement(height, config.unit)}
                                {' ('}{type}
                                {config.fixingPointsInstalled === true && orientation && `, ${orientation} eye`}
                                {')'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </AccordionItem>
              ) : (
                <>
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">
                    Anchor Point Heights
                  </h4>
                  <Card className="p-4 mb-4">
                    <div className="space-y-2 text-sm">
                      {config.fixingHeights.map((height, index) => {
                        const corner = String.fromCharCode(65 + index);
                        const type = config.fixingTypes?.[index] || 'post';
                        const orientation = config.eyeOrientations?.[index];

                        return (
                          <div key={index} className="flex justify-between">
                            <span className="text-slate-600">Anchor Point {corner}:</span>
                            <div className="text-right">
                              <div className="font-medium text-slate-900">
                                {formatMeasurement(height, config.unit)}
                                {' ('}{type}
                                {config.fixingPointsInstalled === true && orientation && `, ${orientation} eye`}
                                {')'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* Right Sticky Sidebar - Diagram and Diagonal Inputs */}
          <div className="lg:col-span-2 lg:sticky lg:top-8 lg:self-start space-y-6">
            {/* Shade Sail Preview */}
            <div ref={ref} className="shade-canvas-container">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">
                Shade Sail Preview
              </h4>
              <InteractiveMeasurementCanvas
                ref={canvasRef}
                config={config}
                updateConfig={updateConfig}
                highlightedMeasurement={highlightedMeasurement}
                onMeasurementHover={setHighlightedMeasurement}
                compact={false}
                readonly={false}
                isMobile={isMobile}
              />
              <div className="mt-2 text-xs text-slate-500">
                Visual reference only<br />
                Corner labels show edge positions
              </div>
            </div>

            {/* Diagonal Measurements */}
            {shouldShowDiagonalInputSection && (
              <Card
                ref={diagonalCardRef}
                className={`p-6 border-2 transition-all duration-300 ${allDiagonalsEntered
                  ? 'border-emerald-500 bg-emerald-50'
                  : showValidationFeedback && !allDiagonalsEntered
                    ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-300 shadow-xl'
                    : 'border-blue-400 bg-blue-50/50 shadow-md'
                  }`}>
                <div className="mb-4">
                  <h4 className={`text-lg font-semibold mb-2 ${allDiagonalsEntered ? 'text-emerald-700' : 'text-blue-900'
                    }`}>
                    {allDiagonalsEntered
                      ? 'Diagonal Measurements Complete ✓'
                      : 'Almost There! Add Diagonal Measurements to Complete Order'
                    }
                  </h4>
                  <p className={`text-sm font-medium ${allDiagonalsEntered ? 'text-emerald-700' : 'text-blue-800'
                    }`}>
                    {allDiagonalsEntered
                      ? 'All diagonal measurements have been entered. You can modify them below if needed.'
                      : 'To ensure manufacturing accuracy, we need diagonal measurements. Enter all measurements below to unlock checkout.'
                    }
                  </p>
                  {!allDiagonalsEntered && (
                    <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-blue-900">
                          {showValidationFeedback
                            ? '⚠ Please fill in all diagonal measurements above before adding to cart.'
                            : 'Why diagonals? They help our team create your exact shape with precision. This final step ensures your shade sail fits perfectly.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diagonalMeasurements.map((diagonal) => (
                    <div key={diagonal.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {diagonal.label}
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={config.measurements[diagonal.key]
                            ? Math.round(convertMmToUnit(config.measurements[diagonal.key], config.unit))
                            : ''}
                          onChange={(e) => updateMeasurement(diagonal.key, e.target.value)}
                          onFocus={() => setHighlightedMeasurement(diagonal.key)}
                          onBlur={() => setHighlightedMeasurement(null)}
                          placeholder={config.unit === 'imperial' ? '240' : '6000'}
                          min="100"
                          step={config.unit === 'imperial' ? '1' : '10'}
                          className={`${diagonal.hasValue ? 'pr-16' : 'pr-12'} ${diagonal.hasValue
                            ? '!border-emerald-500 !bg-emerald-50 !ring-2 !ring-emerald-200'
                            : 'border-blue-300 bg-blue-50/30 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                          isSuccess={diagonal.hasValue}
                        />
                        <div className={`absolute ${diagonal.hasValue ? 'right-11' : 'right-3'} top-1/2 transform -translate-y-1/2 text-xs text-slate-500 transition-all duration-200`}>
                          {config.unit === 'metric' ? 'mm' : 'in'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </Card>
            )}
          </div>
        </div>

        {/* Pricing Summary - Only show on mobile (desktop uses sticky sidebar) */}
        {isMobile && (
          <PriceSummaryDisplay
            config={config}
            calculations={calculations}
          />
        )}

        {/* Important Acknowledgments - Full width on desktop */}
        <Card
          ref={acknowledgementsCardRef}
          className={`${isMobile ? 'p-4 mt-4' : 'p-6 mt-6'} border-2 transition-all duration-300 ${allAcknowledgmentsChecked
            ? 'bg-emerald-50 border-emerald-200'
            : showValidationFeedback && !allAcknowledgmentsChecked
              ? 'bg-red-100 border-red-600 ring-4 ring-red-300 shadow-xl'
              : !allAcknowledgmentsChecked
                ? '!border-red-500 bg-red-50 hover:!border-red-600 shadow-md'
                : 'bg-slate-50 border-slate-200'
            } `}>
          <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-slate-900 ${isMobile ? 'mb-3' : 'mb-4'}`}>
            {isMobile ? 'Acknowledgments' : 'Important Acknowledgments'}
            {allAcknowledgmentsChecked && (
              <span className="ml-2 text-emerald-600">✓</span>
            )}
          </h4>
          <div className={`${isMobile ? 'space-y-3 text-xs' : 'space-y-4 text-sm'}`}>
            <div className={`flex items-start gap-3 ${isMobile ? 'p-1' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
              <input
                type="checkbox"
                className="acknowledgment-checkbox mt-0.5 flex-shrink-0"
                checked={acknowledgments.customManufactured}
                onChange={() => handleAcknowledgmentChange('customManufactured')}
                required
              />
              <span className={
                showValidationFeedback && !acknowledgments.customManufactured
                  ? 'text-red-700'
                  : allAcknowledgmentsChecked
                    ? 'text-emerald-700'
                    : 'text-slate-700'
              }>
                I understand this shade sail is custom manufactured and cannot be returned or exchanged.
              </span>
            </div>
            <div className={`flex items-start gap-3 ${isMobile ? 'p-1' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
              <input
                type="checkbox"
                className="acknowledgment-checkbox mt-0.5 flex-shrink-0"
                checked={acknowledgments.measurementsAccurate}
                onChange={() => handleAcknowledgmentChange('measurementsAccurate')}
                required
              />
              <span className={
                showValidationFeedback && !acknowledgments.measurementsAccurate
                  ? 'text-red-700'
                  : allAcknowledgmentsChecked
                    ? 'text-emerald-700'
                    : 'text-slate-700'
              }>
                I confirm all measurements provided are accurate and verified on-site.
              </span>
            </div>
            <div className={`flex items-start gap-3 ${isMobile ? 'p-1' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
              <input
                type="checkbox"
                className="acknowledgment-checkbox mt-0.5 flex-shrink-0"
                checked={acknowledgments.installationNotIncluded}
                onChange={() => handleAcknowledgmentChange('installationNotIncluded')}
                required
              />
              <span className={
                showValidationFeedback && !acknowledgments.installationNotIncluded
                  ? 'text-red-700'
                  : allAcknowledgmentsChecked
                    ? 'text-emerald-700'
                    : 'text-slate-700'
              }>
                I acknowledge installation is not included and I am responsible for proper installation.
              </span>
            </div>
            <div className={`flex items-start gap-3 ${isMobile ? 'p-1' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
              <input
                type="checkbox"
                className="acknowledgment-checkbox mt-0.5 flex-shrink-0"
                checked={acknowledgments.structuralResponsibility}
                onChange={() => handleAcknowledgmentChange('structuralResponsibility')}
                required
              />
              <span className={
                showValidationFeedback && !acknowledgments.structuralResponsibility
                  ? 'text-red-700'
                  : allAcknowledgmentsChecked
                    ? 'text-emerald-700'
                    : 'text-slate-700'
              }>
                I understand structural adequacy of fixing points is my responsibility.
              </span>
            </div>
          </div>

          {showValidationFeedback && !allAcknowledgmentsChecked && (
            <div className={`${isMobile ? 'mt-3 p-2' : 'mt-4 p-3'} bg-red-100 border border-red-300 rounded-lg`}>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-red-800`}>
                <strong>Required:</strong> Please check all acknowledgments to proceed.
              </p>
            </div>
          )}
        </Card>

        {/* Mobile Action Buttons - Save Quote, PDF and Email (positioned after acknowledgments) */}
        {isMobile && allDiagonalsEntered && (
          <div className="space-y-3 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={onSaveQuote}
              className="w-full flex items-center justify-center gap-2 border-2 border-[#307C31] text-[#307C31] hover:bg-[#307C31] hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save Quote
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDFWithSVG}
              disabled={isGeneratingPDF}
              className="w-full border-2 border-[#307C31] text-[#307C31] hover:bg-[#307C31] hover:text-white"
            >
              {isGeneratingPDF ? 'Generating...' : 'Download PDF Quote'}
            </Button>

            {!showEmailInput ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailSummary}
                className="w-full border-2 border-[#307C31] text-[#307C31] hover:bg-[#307C31] hover:text-white"
              >
                Email Summary
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleEmailSummary}
                    className="w-full"
                  >
                    Send Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEmailInput}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Action Buttons - Full width on desktop */}
        <div className="flex flex-col gap-4 pt-4 border-t border-slate-200 mt-6">
          <div className="flex flex-col sm:flex-row gap-4" ref={addToCartButtonRef}>
            {showBackButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrev}
                className="sm:w-auto"
              >
                Back
              </Button>
            )}

            <Button
              size={isMobile ? "lg" : "md"}
              className={`flex-1 transition-all duration-200 ${buttonShake ? 'shake' : ''} ${!canAddToCart && !loading
                ? '!bg-[#01312D]/40 hover:!bg-[#01312D]/50 !text-white/80 !opacity-70 !shadow-md hover:!shadow-lg !cursor-pointer'
                : loading
                  ? '!opacity-50 !cursor-not-allowed !bg-gray-400 hover:!bg-gray-400 !text-gray-600'
                  : ''
                }`}
              onClick={() => {
                if (canAddToCart) {
                  setLoading(true);
                  setShowLoadingOverlay(true);
                }
                handleAttemptAddToCart();
              }}
              disabled={loading}
            >
              {loading ? (
                'ADDING TO CART...'
              ) : canAddToCart ? (
                `ADD TO CART - ${formatCurrency(calculations.totalPrice, config.currency)}`
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-xs sm:text-sm">Complete above requirements to</span>
                  <span className="text-base font-semibold">ADD TO CART</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});