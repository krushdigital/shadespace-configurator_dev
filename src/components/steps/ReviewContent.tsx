import React, { useState, useEffect, forwardRef, useRef, useMemo } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Tooltip } from '../ui/Tooltip';
import { PriceSummaryDisplay } from '../PriceSummaryDisplay';
import { InteractiveMeasurementCanvas, InteractiveMeasurementCanvasRef } from '../InteractiveMeasurementCanvas';
import { AccordionItem } from '../ui/AccordionItem';
import { FABRICS } from '../../data/fabrics';
import { convertMmToUnit, formatMeasurement, formatArea, validatePolygonGeometry, formatDualMeasurement, getDualMeasurementValues, getDiagonalKeysForCorners } from '../../utils/geometry';
import { formatCurrency } from '../../utils/currencyFormatter';
import { SaveProgressButton } from '../SaveProgressButton';
import { ConfigurationChecklist, ConfigurationChecklistRef } from '../ConfigurationChecklist';

interface ReviewContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors?: { [key: string]: string };
  onNext?: () => void;
  onPrev: (options?: { navigateToHeights?: boolean; navigateToDiagonals?: boolean }) => void;
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
  const checklistRef = useRef<ConfigurationChecklistRef>(null);
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
    // For 3-corner shapes: only need edge measurements
    // For 4+ corner shapes: need both edge AND diagonal measurements
    if (!hasAllEdgeMeasurements) {
      return { isValid: true, errors: [] };
    }

    // For shapes with 4+ corners, skip validation until diagonals are entered
    if (config.corners >= 4 && !allDiagonalsEntered) {
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

  // Convert technical geometry errors into user-friendly messages
  const getUserFriendlyErrors = (errors: string[]): string[] => {
    return errors.map(error => {
      // Handle diagonal validation errors (they already contain user-friendly messages)
      if (error.includes('Diagonal') && (error.includes('too long') || error.includes('too short'))) {
        // Convert mm measurements to user's preferred unit
        const diagonalMatch = error.match(/Diagonal ([A-Z]+) \((\d+)mm\) is (too long|too short)\. With your edge measurements, it (should be at least|cannot exceed) (\d+)mm/);

        if (diagonalMatch) {
          const [, diagonalName, currentValue, condition, phrase, suggestedValue] = diagonalMatch;
          const currentFormatted = formatMeasurement(parseFloat(currentValue), config.unit);
          const suggestedFormatted = formatMeasurement(parseFloat(suggestedValue), config.unit);

          return `Diagonal ${diagonalName} (${currentFormatted}) is ${condition}. With your edge measurements, it ${phrase} ${suggestedFormatted}.`;
        }

        // Return the error as-is if pattern doesn't match (it's already user-friendly)
        return error;
      }

      // Extract the measurements from the technical error message
      // Format: "Triangle ABC: Triangle inequality violated: X + Y = Z ≤ W"
      const match = error.match(/Triangle [A-Z]+: Triangle inequality violated: (\d+) \+ (\d+) = (\d+) ≤ (\d+)/);

      if (match) {
        const [, val1, val2, sum, val3] = match;
        const measurement1 = formatMeasurement(parseFloat(val1), config.unit);
        const measurement2 = formatMeasurement(parseFloat(val2), config.unit);
        const measurement3 = formatMeasurement(parseFloat(val3), config.unit);

        return `Some measurements don't add up correctly: ${measurement1} + ${measurement2} should be larger than ${measurement3}`;
      }

      // Fallback for other error formats
      return "Some of your measurements may contain typos or inconsistencies";
    });
  };

  const friendlyErrors = useMemo(() =>
    getUserFriendlyErrors(geometryValidation.errors),
    [geometryValidation.errors, config.unit]
  );

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

      // Use setTimeout to ensure state updates are processed and shake animation starts
      setTimeout(() => {
        let targetElement: HTMLElement | null = null;

        // Identify which section needs attention - prioritize in order of workflow
        // 1. Check edge measurements first (these are in a previous step, so redirect there)
        if (!hasAllEdgeMeasurements) {
          // For edge measurements, we should redirect to the dimensions step
          // But since we're on review, we'll scroll to the checklist which shows the issue
          targetElement = checklistRef.current?.getDiagonalSectionElement()?.parentElement || null;
        }
        // 2. Check diagonal measurements
        else if (!allDiagonalsEntered && shouldShowDiagonalInputSection) {
          // On desktop: Expand the diagonal section programmatically
          // On mobile: Just highlight it (no expansion available)
          checklistRef.current?.expandDiagonals();
          targetElement = checklistRef.current?.getDiagonalSectionElement() || null;
        }
        // 3. Check acknowledgments
        else if (!allAcknowledgmentsChecked) {
          targetElement = acknowledgementsCardRef.current;
        }

        if (targetElement) {
          // Calculate scroll position with proper offsets for mobile and desktop
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
            // For edge measurements (redirect case) or diagonals, the checklist handles highlighting
            if (!hasAllEdgeMeasurements) {
              // Highlight the entire checklist card
              const checklistCard = targetElement;
              if (checklistCard) {
                checklistCard.classList.add('pulse-error');
                setTimeout(() => {
                  checklistCard.classList.remove('pulse-error');
                }, 2400);
              }
            } else if (!allDiagonalsEntered && shouldShowDiagonalInputSection) {
              // Diagonal section handles its own highlighting via the ref
              // Additional pulse for emphasis on mobile
              if (isMobile && targetElement) {
                targetElement.classList.add('pulse-error');
                setTimeout(() => {
                  targetElement.classList.remove('pulse-error');
                }, 2400);
              }
            } else if (!allAcknowledgmentsChecked) {
              // Highlight acknowledgments section
              targetElement?.classList.add('pulse-error');
              setTimeout(() => {
                targetElement?.classList.remove('pulse-error');
              }, 2400);
            }
          }, 600);
        }
      }, 100);

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


      // Only include anchor point measurements if user provided them AND NOT a 3-corner sail AND measurementOption is 'adjust'
      const anchorPointMeasurements: { [key: string]: { unit: string; formatted: string } } = {};
      if (config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && config.fixingHeights && config.fixingHeights.length > 0) {
        config.fixingHeights.forEach((height, index) => {
          if (height && height > 0) {
            const corner = String.fromCharCode(65 + index);
            anchorPointMeasurements[corner] = {
              unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
              formatted: formatMeasurement(height, config.unit)
            };
          }
        });
      }

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

      // Only include backend anchor measurements if user provided them AND NOT a 3-corner sail AND measurementOption is 'adjust'
      const backendAnchorMeasurements: Record<string, string> = {};
      if (config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && config.fixingHeights && config.fixingHeights.length > 0) {
        config.fixingHeights.forEach((height, index) => {
          const corner = String.fromCharCode(65 + index);
          if (height && height > 0) {
            backendAnchorMeasurements[corner] = formatDualMeasurement(height, config.unit);
          }
        });
      }

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
          // Only include fixing heights data if user provided them AND NOT a 3-corner sail AND measurementOption is 'adjust'
          ...(config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && {
            fixingHeights: config.fixingHeights,
            fixingTypes: config.fixingTypes,
          }),
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
        {/* Configuration Checklist */}
        <ConfigurationChecklist
          ref={checklistRef}
          config={config}
          updateConfig={updateConfig}
          hasAllEdgeMeasurements={hasAllEdgeMeasurements}
          allDiagonalsEntered={allDiagonalsEntered}
          shouldShowDiagonalInputSection={shouldShowDiagonalInputSection}
          diagonalMeasurements={diagonalMeasurements}
          onNavigateToDimensions={() => onPrev({ navigateToDiagonals: true })}
          onNavigateToHeights={() => onPrev({ navigateToHeights: true })}
          highlightedMeasurement={highlightedMeasurement}
          setHighlightedMeasurement={setHighlightedMeasurement}
          updateMeasurement={updateMeasurement}
          geometryValidation={geometryValidation}
          friendlyErrors={friendlyErrors}
          isMobile={isMobile}
        />
        {/* Main Layout - Left Content + Right Sticky Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Content Column - Configuration Summary, Measurements, Heights, etc. */}
          <div className="lg:col-span-2 space-y-6">
            {/* Configuration Summary */}
            {!isMobile && (
              <h4 className="text-lg font-semibold text-slate-900 mb-3">
                Configuration Summary
              </h4>
            )}
            {isMobile ? (
              <AccordionItem
                trigger={
                  <span className="text-sm font-medium">Configuration Details</span>
                }
                defaultOpen={false}
              >
                <Card className="p-3 mt-2">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Fabric:</span>
                      <span className="font-medium text-slate-900">{selectedFabric?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Color:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {config.fabricColor}
                        </span>
                        {selectedColor?.imageUrl && (
                          <img
                            src={selectedColor.imageUrl}
                            alt={config.fabricColor}
                            className="w-5 h-5 rounded-full border border-slate-300 object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Edge:</span>
                      <span className="font-medium text-slate-900">
                        {config.edgeType === 'webbing' ? 'Webbing' : 'Cabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Corners:</span>
                      <span className="font-medium text-slate-900">{config.corners}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Area:</span>
                      <span className={`font-medium ${
                        calculations.area === 0 && hasAllEdgeMeasurements
                          ? 'text-red-600 font-bold'
                          : 'text-slate-900'
                      }`}>
                        {calculations.area === 0 && hasAllEdgeMeasurements
                          ? 'Error in measurements'
                          : formatArea(calculations.area * 1000000, config.unit)
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Weight:</span>
                      <span className="font-medium text-slate-900">
                        {config.unit === 'imperial'
                          ? `${(calculations.totalWeightGrams / 1000 * 2.20462).toFixed(1)} lb`
                          : `${(calculations.totalWeightGrams / 1000).toFixed(1)} kg`
                        }
                      </span>
                    </div>
                    {config.measurementOption === 'adjust' && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Hardware:</span>
                        <span className="font-medium text-slate-900">Included</span>
                      </div>
                    )}
                  </div>
                </Card>
              </AccordionItem>
            ) : (
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
                  <span className="text-slate-600">Area:</span>
                  <span className={`font-medium ${
                    calculations.area === 0 && hasAllEdgeMeasurements
                      ? 'text-red-600 font-bold'
                      : 'text-slate-900'
                  }`}>
                    {calculations.area === 0 && hasAllEdgeMeasurements
                      ? 'Error - See Below'
                      : formatArea(calculations.area * 1000000, config.unit)
                    }
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
            )}

            {/* Invalid Measurement Warning - Show prominently when area is 0 with all measurements AND diagonals are entered (or not required) */}
            {calculations.area === 0 && hasAllEdgeMeasurements && (config.corners < 4 || allDiagonalsEntered) && (
              <Card className="p-4 mb-4 border-2 border-red-500 bg-red-50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-red-900 mb-2">
                      {config.corners === 3 ? 'Invalid Triangle Measurements' : 'Invalid Shape Measurements'}
                    </h4>
                    <p className="text-sm text-red-800 mb-3">
                      The measurements you've entered cannot form a valid {config.corners === 3 ? 'triangle' : 'shape'}. This is why the area cannot be calculated.
                    </p>
                    {config.corners === 3 ? (
                      <div className="p-3 bg-red-100 border border-red-300 rounded mb-3">
                        <p className="text-sm text-red-900 font-medium mb-2">
                          <strong>Triangle Rule:</strong> The sum of any two sides must be greater than the third side.
                        </p>
                        <div className="text-xs text-red-800 space-y-1 mt-2">
                        {(() => {
                          const AB = config.measurements['AB'] || 0;
                          const BC = config.measurements['BC'] || 0;
                          const CA = config.measurements['CA'] || 0;

                          const checks = [
                            { sides: 'B→C + C→A', sum: BC + CA, compare: 'A→B', value: AB, valid: BC + CA > AB },
                            { sides: 'A→B + B→C', sum: AB + BC, compare: 'C→A', value: CA, valid: AB + BC > CA },
                            { sides: 'A→B + C→A', sum: AB + CA, compare: 'B→C', value: BC, valid: AB + CA > BC }
                          ];

                          return checks.map((check, idx) => (
                            <div key={idx} className={`flex items-start gap-2 ${!check.valid ? 'font-bold text-red-900' : ''}`}>
                              <span>{check.valid ? '✓' : '✗'}</span>
                              <span>
                                {check.sides} ({formatMeasurement(check.sum, config.unit)}) {check.valid ? '>' : '≤'} {check.compare} ({formatMeasurement(check.value, config.unit)})
                                {!check.valid && <span className="ml-2 text-red-700">← Problem here!</span>}
                              </span>
                            </div>
                          ));
                        })()}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-100 border border-red-300 rounded mb-3">
                        <p className="text-sm text-red-900 font-medium mb-2">
                          <strong>Geometry Issue:</strong> {config.corners === 4 ? 'Your diagonal measurements don\'t match your edge measurements.' : 'Your diagonal measurements are incompatible with your edge measurements.'}
                        </p>
                        <p className="text-xs text-red-800 mt-2">
                          For a {config.corners}-corner shape, the diagonals must form valid triangles with the edges. The measurements you've entered create an impossible geometry.
                        </p>
                      </div>
                    )}

                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                      <p className="text-sm text-yellow-900 mb-2">
                        <strong>Common Causes:</strong>
                      </p>
                      <ul className="text-xs text-yellow-800 space-y-1 ml-4 list-disc">
                        <li>Typo or missing digit (e.g., 1344mm instead of 13440mm)</li>
                        <li>Mixed units (e.g., entering some measurements in cm instead of mm)</li>
                        <li>Swapped or transposed numbers</li>
                        <li>Incorrect tape measure reading</li>
                        {config.corners >= 4 && <li>Diagonals measured incorrectly or swapped</li>}
                      </ul>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-blue-900 font-semibold mb-1">
                            What to do:
                          </p>
                          <p className="text-sm text-blue-800">
                            Please go back and re-check your {config.corners === 3 ? 'edge' : 'edge and diagonal'} measurements. Make sure all measurements are in the same unit ({config.unit === 'metric' ? 'millimeters' : 'inches'}) and verify each measurement on-site before proceeding.
                          </p>
                        </div>
                      </div>
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
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span>Measurements</span>
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
                        <h6 className="text-xs font-semibold text-slate-700 mb-2">Edges</h6>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          {Array.from({ length: config.corners }, (_, index) => {
                            const nextIndex = (index + 1) % config.corners;
                            const edgeKey = `${String.fromCharCode(65 + index)}${String.fromCharCode(65 + nextIndex)}`;
                            const measurement = config.measurements[edgeKey];

                            return (
                              <div key={edgeKey} className="flex justify-between">
                                <span className="text-slate-600">
                                  {String.fromCharCode(65 + index)}-{String.fromCharCode(65 + nextIndex)}:
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
                          <h6 className="text-xs font-semibold text-slate-700 mb-2">Diagonals</h6>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            {diagonalMeasurements.map((diagonal) => {
                              const measurement = config.measurements[diagonal.key];

                              return (
                                <div key={diagonal.key} className="flex justify-between">
                                  <span className="text-slate-600">
                                    {diagonal.key}:
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

            {/* Anchor Point Heights - Only show if user provided height data AND not for 3-corner sails AND measurementOption is 'adjust' */}
            {config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && config.fixingHeights && config.fixingHeights.some(h => h > 0) && (
              <div>
                {isMobile ? (
                  <AccordionItem
                    trigger={
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span>Heights</span>
                        <span className="bg-[#01312D] text-white text-xs px-2 py-0.5 rounded-full">
                          {config.corners}
                        </span>
                      </span>
                    }
                    defaultOpen={false}
                  >
                    <Card className="p-3 mt-2">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        {config.fixingHeights.map((height, index) => {
                          const corner = String.fromCharCode(65 + index);
                          const type = config.fixingTypes?.[index] || 'post';

                          return (
                            <div key={index} className="flex justify-between">
                              <span className="text-slate-600">{corner}:</span>
                              <div className="text-right">
                                <div className="font-medium text-slate-900">
                                  {formatMeasurement(height, config.unit)}
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

                          return (
                            <div key={index} className="flex justify-between">
                              <span className="text-slate-600">Anchor Point {corner}:</span>
                              <div className="text-right">
                                <div className="font-medium text-slate-900">
                                  {formatMeasurement(height, config.unit)} ({type})
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
            )}

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

          </div>
        </div>

        {/* Pricing Summary - Compact on mobile */}
        {isMobile && (
          <Card className="p-3 mb-4 bg-gradient-to-br from-[#01312D] to-[#024f3a] text-white">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-white/80 mb-0.5">Order Total</p>
                <p className="text-2xl font-bold">{formatCurrency(calculations.totalPrice, config.currency)}</p>
              </div>
              <div className="text-right">
                {(config.corners < 4 || (config.corners >= 4 && allDiagonalsEntered && calculations.area > 0)) && (
                  <p className="text-xs text-white/80">{formatArea(calculations.area * 1000000, config.unit)}</p>
                )}
                <p className="text-xs text-white/80">{config.corners} corners</p>
              </div>
            </div>
            <p className="text-xs text-white/90 font-medium">Includes express freight, taxes & duties (to your door)</p>
          </Card>
        )}

        {/* Important Acknowledgments - Full width on desktop */}
        <Card
          ref={acknowledgementsCardRef}
          className={`${isMobile ? 'p-3 mt-4' : 'p-6 mt-6'} border-2 transition-all duration-300 ${allAcknowledgmentsChecked
            ? 'bg-emerald-50 border-emerald-200'
            : showValidationFeedback && !allAcknowledgmentsChecked && allDiagonalsEntered
              ? 'bg-red-100 border-red-600 ring-4 ring-red-300 shadow-xl'
              : !allAcknowledgmentsChecked && allDiagonalsEntered
                ? '!border-red-500 bg-red-50 hover:!border-red-600 shadow-md'
                : 'bg-slate-50 border-slate-200'
            } `}>
          <h4 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-slate-900 ${isMobile ? 'mb-2' : 'mb-4'}`}>
            {isMobile ? 'Confirm Understanding' : 'Important Acknowledgments'}
            {allAcknowledgmentsChecked && (
              <span className="ml-2 text-emerald-600">✓</span>
            )}
          </h4>
          <div className={`${isMobile ? 'space-y-2 text-xs' : 'space-y-4 text-sm'}`}>
            <div className={`flex items-start gap-2 ${isMobile ? '' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
              <input
                type="checkbox"
                className="acknowledgment-checkbox mt-0.5 flex-shrink-0"
                checked={acknowledgments.customManufactured}
                onChange={() => handleAcknowledgmentChange('customManufactured')}
                required
              />
              <span className={
                showValidationFeedback && !acknowledgments.customManufactured && allDiagonalsEntered
                  ? 'text-red-700'
                  : allAcknowledgmentsChecked
                    ? 'text-emerald-700'
                    : 'text-slate-700'
              }>
                {isMobile ? 'Custom made - no returns/exchanges' : 'I understand this shade sail is custom manufactured and cannot be returned or exchanged.'}
              </span>
            </div>
            <div className={`flex items-start gap-2 ${isMobile ? '' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
              <input
                type="checkbox"
                className="acknowledgment-checkbox mt-0.5 flex-shrink-0"
                checked={acknowledgments.measurementsAccurate}
                onChange={() => handleAcknowledgmentChange('measurementsAccurate')}
                required
              />
              <span className={
                showValidationFeedback && !acknowledgments.measurementsAccurate && allDiagonalsEntered
                  ? 'text-red-700'
                  : allAcknowledgmentsChecked
                    ? 'text-emerald-700'
                    : 'text-slate-700'
              }>
                {isMobile ? 'Measurements are accurate' : 'I confirm all measurements provided are accurate and verified on-site.'}
              </span>
            </div>
            <div className={`flex items-start gap-2 ${isMobile ? '' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
              <input
                type="checkbox"
                className="acknowledgment-checkbox mt-0.5 flex-shrink-0"
                checked={acknowledgments.installationNotIncluded}
                onChange={() => handleAcknowledgmentChange('installationNotIncluded')}
                required
              />
              <span className={
                showValidationFeedback && !acknowledgments.installationNotIncluded && allDiagonalsEntered
                  ? 'text-red-700'
                  : allAcknowledgmentsChecked
                    ? 'text-emerald-700'
                    : 'text-slate-700'
              }>
                {isMobile ? 'Installation not included' : 'I acknowledge installation is not included and I am responsible for proper installation.'}
              </span>
            </div>
            <div className={`flex items-start gap-2 ${isMobile ? '' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
              <input
                type="checkbox"
                className="acknowledgment-checkbox mt-0.5 flex-shrink-0"
                checked={acknowledgments.structuralResponsibility}
                onChange={() => handleAcknowledgmentChange('structuralResponsibility')}
                required
              />
              <span className={
                showValidationFeedback && !acknowledgments.structuralResponsibility && allDiagonalsEntered
                  ? 'text-red-700'
                  : allAcknowledgmentsChecked
                    ? 'text-emerald-700'
                    : 'text-slate-700'
              }>
                {isMobile ? 'Structural adequacy is my responsibility' : 'I understand structural adequacy of fixing points is my responsibility.'}
              </span>
            </div>

            {/* Conditional Height Disclaimer - Only show if heights not provided AND measurementOption is 'adjust' */}
            {config.corners !== 3 && config.measurementOption === 'adjust' && !config.heightsProvidedByUser && (
              <div className={`flex items-start gap-2 ${isMobile ? '' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
                <input
                  type="checkbox"
                  className="acknowledgment-checkbox mt-0.5 flex-shrink-0"
                  checked={true}
                  readOnly
                  disabled
                />
                <div className="flex-1">
                  <div className="flex flex-col gap-2">
                    <span className="text-slate-700">
                      {isMobile ? 'Standard manufacturing (heights not provided)' : 'I understand height information was not provided and manufacturing will use standard process.'}
                    </span>
                    {!isMobile && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-600">Not required - standard manufacturing process will be used</span>
                        <div className="flex items-center gap-1">
                          <Tooltip content="Providing anchor point heights allows for more precise manufacturing customized to your installation. Standard manufacturing will be used if heights are not provided.">
                            <span className="text-blue-600 hover:text-blue-800 inline-flex items-center justify-center" role="button" tabIndex={0}>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                            </span>
                          </Tooltip>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPrev({ navigateToHeights: true })}
                            className="text-xs py-1 px-3 border-blue-300 text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                          >
                            Add Heights →
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {showValidationFeedback && !allAcknowledgmentsChecked && allDiagonalsEntered && (
            <div className={`${isMobile ? 'mt-2 p-2' : 'mt-4 p-3'} bg-red-100 border border-red-300 rounded-lg`}>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-red-800`}>
                <strong>Required:</strong> {isMobile ? 'Check all items' : 'Please check all acknowledgments to proceed.'}
              </p>
            </div>
          )}
        </Card>

        {/* Quality Assurance Note - Moved outside acknowledgments card */}
        {!isMobile && (
          <div className="mt-3 px-2">
            <p className="text-sm text-slate-600">
              <svg className="w-4 h-4 inline-block mr-1 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Our team will verify all measurements before manufacturing and contact you if adjustments are needed.
            </p>
          </div>
        )}

        {/* Mobile Action Buttons - Save Quote and PDF only (positioned after acknowledgments) */}
        {isMobile && allDiagonalsEntered && (
          <div className="space-y-2 lg:hidden">
            {onSaveQuote && (
              <SaveProgressButton
                onClick={onSaveQuote}
                className="w-full"
              />
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDFWithSVG}
              disabled={isGeneratingPDF}
              className="w-full border-2 border-[#307C31] text-[#307C31] hover:bg-[#307C31] hover:text-white text-xs py-2"
            >
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
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