import React, { useState, useEffect, forwardRef, useRef, useMemo, lazy, Suspense } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Tooltip } from '../ui/Tooltip';
import { PriceSummaryDisplay } from '../PriceSummaryDisplay';
import { DeliveryEstimate } from '../DeliveryEstimate';
import { InteractiveMeasurementCanvas, InteractiveMeasurementCanvasRef } from '../InteractiveMeasurementCanvas';
import { AccordionItem } from '../ui/AccordionItem';
import { useFabricCatalog } from '../../hooks/useFabricCatalog';
import { convertMmToUnit, formatMeasurement, formatArea, validatePolygonGeometry, formatDualMeasurement, getDualMeasurementValues, getDiagonalKeysForCorners, isHeightRequiredForCheckout, areHeightsProvided, computeShapeConfidence } from '../../utils/geometry';
import { formatCurrency } from '../../utils/currencyFormatter';
import { supports3DForCorners } from '../../utils/canRender3D';
import { ConfigurationChecklist, ConfigurationChecklistRef } from '../ConfigurationChecklist';
import { useHardwareCatalog, getDefaultPack, getLiveHardwarePrice } from '../../hooks/useHardwareCatalog';
import { StandardPackPreview } from '../StandardPackPreview';
import { getPricingForCurrency, PricingSetting } from '../../hooks/usePricingSettings';
import { Box, Layers, Check } from 'lucide-react';
import { renderSailPngBlob } from '../../utils/renderSvgOffscreen';

const ShadeSail3DViewer = lazy(() => import('../ShadeSail3DViewer'));

interface ReviewContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors?: { [key: string]: string };
  onNext?: () => void;
  onPrev: (options?: { navigateToHeights?: boolean; navigateToDiagonals?: boolean }) => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  agreedToAcknowledgments: boolean;
  onToggleAgreement: () => void;
  handleAddToCart: (orderData: any) => void;
  allDiagonalsEntered: boolean;
  allAcknowledgmentsChecked: boolean;
  canAddToCart: boolean;
  hasAllEdgeMeasurements: boolean;
  isMobile?: boolean;
  canvasRef: React.RefObject<InteractiveMeasurementCanvasRef>;
  loading: boolean
  setLoading: (loading: boolean) => void;
  setShowLoadingOverlay: (loading: boolean) => void;
  quoteReference?: string | null;
  onSaveQuote?: () => void;
  pricingSettingsMap?: Record<string, PricingSetting>;
  viewMode?: 'plan' | '3d';
  onViewModeChange?: (mode: 'plan' | '3d') => void;
  device3DTier?: 'high' | 'low' | 'none';
  adminMode?: boolean;
}

export const ReviewContent = forwardRef<HTMLDivElement, ReviewContentProps>(({
  config,
  updateConfig,
  calculations,
  nextStepTitle = '',
  showBackButton = false,
  onPrev,
  agreedToAcknowledgments,
  onToggleAgreement,
  handleAddToCart,
  allDiagonalsEntered,
  allAcknowledgmentsChecked,
  canAddToCart,
  hasAllEdgeMeasurements,
  isMobile = false,
  canvasRef,
  loading,
  setLoading,
  setShowLoadingOverlay,
  onSaveQuote,
  pricingSettingsMap,
  viewMode: externalViewMode,
  onViewModeChange,
  device3DTier = 'none',
  adminMode = false,
}, ref) => {
  const [highlightedMeasurement, setHighlightedMeasurement] = useState<string | null>(null);
  const [internalViewMode, setInternalViewMode] = useState<'plan' | '3d'>('plan');
  const rawReviewViewMode = externalViewMode ?? internalViewMode;
  const review3DAvailable = supports3DForCorners(config.corners);
  const reviewViewMode = review3DAvailable ? rawReviewViewMode : 'plan';
  const setReviewViewMode = onViewModeChange ?? setInternalViewMode;
  const [showValidationFeedback, setShowValidationFeedback] = useState(false);
  const [buttonShake, setButtonShake] = useState(false);
  const checklistRef = useRef<ConfigurationChecklistRef>(null);
  const acknowledgementsCardRef = useRef<HTMLDivElement>(null);
  const addToCartButtonRef = useRef<HTMLDivElement>(null);
  const [detectedCurrency, setDetectedCurrency] = useState("")

  const isFixedShape = config.shapeMode === 'fixed';

  const { fabrics: FABRICS } = useFabricCatalog();
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
  const selectedColor = selectedFabric?.colors.find(c => c.name === config.fabricColor);

  const { items: hardwareItems, packs: hardwarePacks } = useHardwareCatalog();
  const hardwareItemsById = useMemo(() => {
    const m = new Map<string, typeof hardwareItems[number]>();
    for (const it of hardwareItems) m.set(it.id, it);
    return m;
  }, [hardwareItems]);
  const hardwareMode: 'standard' | 'manual' | 'none' =
    config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none');
  const hardwareEdgeType = (config.edgeType as 'webbing' | 'cabled') || 'webbing';
  const hardwarePack = getDefaultPack(hardwarePacks, hardwareEdgeType, config.corners);
  const hardwarePricing = pricingSettingsMap
    ? getPricingForCurrency(pricingSettingsMap, config.currency)
    : { marketMarkup: 1, zonosDhlMarkup: 1, exchangeRate: 1, symbol: 'NZ$' };
  const hardwareOnlyDisplay = calculations.hardwareBreakdown?.hardwareOnlyLivePrice
    ?? ((calculations.hardwareBreakdown?.hardwareOnlyPriceNzd || 0) * hardwarePricing.exchangeRate);
  const perCornerLiveDisplay = calculations.hardwareBreakdown?.perCornerLivePrice ?? [];
  const totalHardwareItems = useMemo(() => {
    if (hardwareMode === 'standard' && hardwarePack) {
      return hardwarePack.items.reduce((sum, p) => sum + (p.qty || 0), 0);
    }
    if (hardwareMode === 'manual') {
      const map = config.cornerHardware || {};
      let total = 0;
      for (let i = 0; i < config.corners; i++) {
        const lines = map[i] || [];
        for (const l of lines) total += l.qty || 0;
      }
      return total;
    }
    return 0;
  }, [hardwareMode, hardwarePack, config.cornerHardware, config.corners]);
  const livePriceForLine = (line: { catalogId: string; priceNzd: number; qty: number; livePrice?: number; livePriceCurrency?: string }) => {
    const catalogItem = hardwareItemsById.get(line.catalogId);
    if (catalogItem) {
      return getLiveHardwarePrice(catalogItem, config.currency, hardwarePricing.exchangeRate) * line.qty;
    }
    if (line.livePriceCurrency === config.currency && line.livePrice != null) {
      return line.livePrice * line.qty;
    }
    return line.priceNzd * line.qty * hardwarePricing.exchangeRate;
  };

  console.log({
    config,
    updateConfig,
    calculations,
    nextStepTitle,
    showBackButton,
    onPrev,
    agreedToAcknowledgments,
    onToggleAgreement,
    handleAddToCart,
    allDiagonalsEntered,
    allAcknowledgmentsChecked,
    canAddToCart,
    hasAllEdgeMeasurements,
    isMobile,
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
    const keys = getDiagonalKeysForCorners(config.corners);
    return keys.map(key => ({
      key,
      label: `Diagonal ${key[0]} → ${key[1]}`,
      hasValue: !!config.measurements[key]
    }));
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
console.log('✌️result --->', result);

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
        // 3. Check height measurements (for 5+ corner sails)
        else if (isHeightRequiredForCheckout(config.corners, config.measurementOption) &&
                 !areHeightsProvided(config.fixingHeights, config.corners)) {
          // Navigate back to dimensions step to enter heights
          onPrev({ navigateToHeights: true });
          return;
        }
        // 3b. Check attachment types (required at checkout for 5+ corners, or 4 corners with heights provided)
        else if (
          (config.corners >= 5 || (config.corners === 4 && config.heightsProvidedByUser)) &&
          config.fixingTypes &&
          Array.from({ length: config.corners }, (_, i) => config.fixingTypes?.[i]).some(t => t !== 'post' && t !== 'building')
        ) {
          onPrev({ navigateToHeights: true });
          return;
        }
        // 4. Check acknowledgments
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
            } else if (isHeightRequiredForCheckout(config.corners, config.measurementOption) &&
                       !areHeightsProvided(config.fixingHeights, config.corners)) {
              // Heights section handles its own highlighting via the ref
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

      // Render the rich configurator diagram (ShadeSVGCore) so the order's
      // technical drawing matches the in-app quote PDF.
      let canvasImageUrl = null;

      try {
        const canvasImageBlob = await renderSailPngBlob(config, 800, 800);
        if (canvasImageBlob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `shade-sail-${config.corners}corner-${timestamp}.png`;

          canvasImageUrl = await uploadImageToShopify(canvasImageBlob, filename);

          if (!canvasImageUrl) {
            console.warn('Failed to upload canvas image to Shopify, proceeding without image');
          }
        }
      } catch (error) {
        console.error('Error processing canvas image:', error);
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
      const diagonalKeys = getDiagonalKeysForCorners(config.corners);

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
          Fabric_Type: selectedFabric?.isFireRetardant && selectedColor && !selectedColor.isFireRetardant ?
            'Not FR Certified' : selectedFabric?.label,
          Shade_Factor: selectedColor?.shadeFactor,
          Edge_Type: config.edgeType === 'webbing' ? 'Webbing Reinforced' : 'Cabled Edge',
          Thread: 'Sewn with SolarFix\u00AE PTFE thread',
          Wire_Thickness: calculations?.wireThickness !== undefined
            ? config.unit === 'imperial'
              ? `${(calculations.wireThickness * 0.0393701).toFixed(2)}" (${calculations.wireThickness}mm)`
              : `${calculations.wireThickness}mm`
            : 'N/A',
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

  return (
    <div className="p-6">
      {hasAllEdgeMeasurements && calculations.totalPrice > 0 && (
        <div className="flex items-center gap-2 bg-[#BFF102]/10 border border-[#BFF102]/40 rounded-lg px-4 py-3 mb-6">
          <svg className="w-5 h-5 text-[#307C31] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-[#01312D]">
            Your quote is ready! You can now <button type="button" onClick={onSaveQuote} className="font-bold underline text-[#307C31] hover:text-[#1a5c44] transition-colors cursor-pointer">save and receive a detailed PDF quote</button> via email with your specifications, pricing, and a link to resume anytime.
          </p>
        </div>
      )}
      <div className="space-y-6">
        {/* Configuration Checklist - Desktop only at top (hidden for fixed shapes) */}
        {!isMobile && !isFixedShape && (
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
        )}

        {/* Shape Confidence Score */}
        {!isFixedShape && config.corners >= 4 && allDiagonalsEntered && (() => {
          const confidence = computeShapeConfidence(config.measurements, config.corners, config.fixingHeights);
          if (confidence.status === 'pending') return null;
          const statusColors: Record<string, string> = {
            excellent: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            good: 'bg-blue-50 border-blue-200 text-blue-800',
            warning: 'bg-amber-50 border-amber-200 text-amber-800',
            error: 'bg-red-50 border-red-200 text-red-800',
            pending: 'bg-slate-50 border-slate-200 text-slate-600'
          };
          return (
            <div className={`p-3 sm:p-4 rounded-xl border ${statusColors[confidence.status]}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Shape Accuracy: {Math.round(confidence.percentage)}%
                </span>
                {confidence.measuredBD > 0 && (
                  <span className="text-xs opacity-70">
                    BD deviation: {confidence.bdDeviation.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs mt-1 opacity-80">{confidence.message}</p>
            </div>
          );
        })()}
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
                defaultOpen={true}
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
                      <span className="text-slate-600">Thread:</span>
                      <span className="font-medium text-slate-900">SolarFix® PTFE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Corners:</span>
                      <span className="font-medium text-slate-900">{config.corners}</span>
                    </div>
                    {(config.corners < 4 || allDiagonalsEntered) && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Area:</span>
                        <span className="font-medium text-slate-900">
                          {formatArea(calculations.area * 1000000, config.unit)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Weight:</span>
                      <span className="font-medium text-slate-900">
                        {config.unit === 'imperial'
                          ? `${(calculations.totalWeightGrams / 1000 * 2.20462).toFixed(1)} lb (${(calculations.totalWeightGrams / 1000).toFixed(1)} kg)`
                          : `${(calculations.totalWeightGrams / 1000).toFixed(1)} kg`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Hardware:</span>
                      <span className="font-medium text-slate-900">
                        {hardwareMode === 'standard' ? (
                          <StandardPackPreview pack={hardwarePack} itemsById={hardwareItemsById} corners={config.corners}>
                            <span className="font-medium text-slate-900">Hardware Tensioning Kit (included)</span>
                          </StandardPackPreview>
                        ) : hardwareMode === 'manual' ? 'Manual per corner' : 'Not included'}
                      </span>
                    </div>
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
                    {selectedFabric?.isFireRetardant && selectedColor && !selectedColor.isFireRetardant && (
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
                <div className="flex justify-between">
                  <span className="text-slate-600">Shape:</span>
                  <span className="font-medium text-slate-900">
                    {config.shapeMode === 'fixed' && config.fixedShapeType
                      ? `Fixed - ${config.fixedShapeType === 'right-angle-triangle' ? 'Right Angle Triangle' : config.fixedShapeType.charAt(0).toUpperCase() + config.fixedShapeType.slice(1)}`
                      : `Custom (${config.corners} corners)`
                    }
                  </span>
                </div>
                {config.edgeType === 'webbing' && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Webbing Width:</span>
                    <span className="font-medium text-slate-900">
                      {config.unit === 'imperial'
                        ? `${(calculations.webbingWidth * 0.0393701).toFixed(2)}" (${calculations.webbingWidth}mm)`
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
                        ? `${(calculations.wireThickness * 0.0393701).toFixed(2)}" (${calculations.wireThickness}mm)`
                        : `${calculations.wireThickness}mm`
                      }
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Thread:</span>
                  <span className="font-medium text-slate-900">SolarFix® PTFE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Corners:</span>
                  <span className="font-medium text-slate-900">{config.corners}</span>
                </div>
                {(config.corners < 4 || allDiagonalsEntered) && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Area:</span>
                    <span className="font-medium text-slate-900">
                      {formatArea(calculations.area * 1000000, config.unit)}
                    </span>
                  </div>
                )}
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
                      ? `${(calculations.totalWeightGrams / 1000 * 2.20462).toFixed(1)} lb (${(calculations.totalWeightGrams / 1000).toFixed(1)} kg)`
                      : `${(calculations.totalWeightGrams / 1000).toFixed(1)} kg`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Hardware:</span>
                  <span className="font-medium text-slate-900">
                    {hardwareMode === 'standard' ? (
                      <StandardPackPreview pack={hardwarePack} itemsById={hardwareItemsById} corners={config.corners}>
                        <span className="font-medium text-slate-900">Hardware Tensioning Kit (included)</span>
                      </StandardPackPreview>
                    ) : hardwareMode === 'manual' ? 'Manual per corner' : 'Not included'}
                  </span>
                </div>
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


          </div>

          {/* Right Sticky Sidebar - Diagram and Diagonal Inputs */}
          <div className="lg:col-span-2 lg:sticky lg:top-8 lg:self-start space-y-6">
            {/* Shade Sail Preview */}
            <div ref={ref} className="shade-canvas-container">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-slate-900">
                  Shade Sail Preview
                </h4>
                {review3DAvailable && (!isMobile || device3DTier !== 'none') && (
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setReviewViewMode('plan')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                        reviewViewMode === 'plan'
                          ? 'bg-white shadow-sm text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Plan
                    </button>
                    <button
                      onClick={() => setReviewViewMode('3d')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                        reviewViewMode === '3d'
                          ? 'bg-white shadow-sm text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      3D
                    </button>
                  </div>
                )}
              </div>

              {reviewViewMode === 'plan' ? (
                <>
                  <InteractiveMeasurementCanvas
                    ref={canvasRef}
                    config={config}
                    updateConfig={updateConfig}
                    highlightedMeasurement={highlightedMeasurement}
                    onMeasurementHover={setHighlightedMeasurement}
                    compact={false}
                    readonly={false}
                    isMobile={isMobile}
                    plainBackground={true}
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Visual reference only<br />
                    Corner labels show edge positions
                  </div>
                </>
              ) : (
                <div className="h-[500px]">
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-full bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-3 border-slate-300 border-t-slate-700 rounded-full mx-auto mb-3"></div>
                        <p className="text-sm text-slate-500">Loading 3D viewer...</p>
                      </div>
                    </div>
                  }>
                    <ShadeSail3DViewer
                      config={config}
                      highlightedMeasurement={highlightedMeasurement}
                      activeSection="review"
                    />
                  </Suspense>
                </div>
              )}
            </div>

          </div>

          {/* Full-width sections below the two-column grid row */}
          <div className="lg:col-span-4 space-y-4">
            {/* Hardware & Price Breakdown - Collapsible (hidden for fixed shapes) */}
            {!isFixedShape && <AccordionItem
              defaultOpen={false}
              trigger={
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span>Hardware & Price Breakdown</span>
                  {totalHardwareItems > 0 && (
                    <span className="bg-[#01312D] text-white text-xs px-2 py-0.5 rounded-full">
                      {totalHardwareItems}
                    </span>
                  )}
                </span>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                <Card className="p-4 md:p-5">
                  <h3 className="text-base font-bold text-slate-900 mb-3">Hardware Breakdown</h3>
                  {hardwareMode === 'standard' && hardwarePack && (
                    <div>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="text-sm font-semibold text-slate-900">Hardware Tensioning Kit</div>
                        <span className="text-xs font-semibold text-[#307C31] bg-[#307C31]/10 px-2 py-0.5 rounded-full">Included in sail price</span>
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                        {hardwarePack.items.map((p, idx) => {
                          const it = hardwareItemsById.get(p.catalog_id);
                          if (!it) return null;
                          return (
                            <div key={idx} className="flex items-center gap-3 px-3 py-2">
                              {it.image_url && (
                                <img src={it.image_url} alt={it.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">{it.name.replace(/-\d+mm$/, '')}</div>
                              </div>
                              <div className="text-xs font-semibold text-slate-600 flex-shrink-0">× {p.qty}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {hardwareMode === 'manual' && (
                    <div className="space-y-3">
                      <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                        {Array.from({ length: config.corners }, (_, i) => {
                          const letter = String.fromCharCode(65 + i);
                          const lines = (config.cornerHardware || {})[i] || [];
                          const cornerLive = perCornerLiveDisplay[i] ?? 0;
                          return (
                            <div key={i} className="px-3 py-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">{letter}</div>
                                  <div className="text-sm font-semibold text-slate-900">Corner {letter}</div>
                                </div>
                                <div className="text-sm font-semibold text-[#D97706]">{formatCurrency(cornerLive, config.currency)}</div>
                              </div>
                              {lines.length === 0 ? (
                                <div className="text-xs text-slate-500 ml-8">No hardware selected</div>
                              ) : (
                                <div className="ml-8 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-xs text-slate-700">
                                  {lines.map((l, li) => (
                                    <React.Fragment key={li}>
                                      <span className="truncate">{l.qty}× {l.name}{l.sku ? ` (${l.sku})` : ''}</span>
                                      <span className="text-slate-500 text-right">{formatCurrency(livePriceForLine(l), config.currency)}</span>
                                    </React.Fragment>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center rounded-lg bg-slate-100 px-3 py-1.5">
                        <span className="text-sm font-semibold text-slate-700">Hardware subtotal</span>
                        <span className="text-sm font-bold text-[#D97706]">{formatCurrency(hardwareOnlyDisplay, config.currency)}</span>
                      </div>
                    </div>
                  )}
                  {hardwareMode === 'none' && (
                    <div className="text-sm text-slate-700">No hardware — the sail ships with corner D-rings sewn in only.</div>
                  )}
                </Card>

                {/* Price Breakdown */}
                <Card className="p-4 md:p-5">
                  <h3 className="text-base font-bold text-slate-900 mb-3">Price Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Shade sail:</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(
                          hardwareMode === 'manual'
                            ? calculations.totalPrice - Math.round(hardwareOnlyDisplay)
                            : calculations.totalPrice,
                          config.currency,
                        )}
                      </span>
                    </div>
                    {hardwareMode === 'manual' && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Hardware:</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(hardwareOnlyDisplay, config.currency)}</span>
                      </div>
                    )}
                    {hardwareMode === 'standard' && (
                      <div className="flex justify-between text-xs">
                        <StandardPackPreview pack={hardwarePack} itemsById={hardwareItemsById} corners={config.corners}>
                          <span className="text-slate-500">Hardware Tensioning Kit included</span>
                        </StandardPackPreview>
                        <span className="text-slate-500">Included</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-900 font-semibold">Total:</span>
                      <span className="font-bold text-[#01312D]">{formatCurrency(calculations.totalPrice, config.currency)}</span>
                    </div>
                  </div>
                  <DeliveryEstimate className="mt-3" />
                </Card>
              </div>
            </AccordionItem>}

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

                      {!isFixedShape && config.corners >= 4 && diagonalMeasurements.length > 0 && (
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
                <AccordionItem
                  defaultOpen={false}
                  trigger={
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span>Precise Measurements</span>
                      <span className="bg-[#01312D] text-white text-xs px-2 py-0.5 rounded-full">
                        {config.corners + (config.corners >= 4 ? diagonalMeasurements.length : 0)}
                      </span>
                    </span>
                  }
                >
                  <Card className="p-4 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                      <div>
                        <h6 className="text-sm font-medium text-slate-700 mb-2">Edge Lengths</h6>
                        <div className="space-y-1 text-sm">
                          {Array.from({ length: config.corners }, (_, index) => {
                            const nextIndex = (index + 1) % config.corners;
                            const edgeKey = `${String.fromCharCode(65 + index)}${String.fromCharCode(65 + nextIndex)}`;
                            const measurement = config.measurements[edgeKey];

                            return (
                              <div key={edgeKey} className="flex items-baseline gap-3">
                                <span className="text-slate-600 whitespace-nowrap min-w-[100px]">
                                  Edge {String.fromCharCode(65 + index)} → {String.fromCharCode(65 + nextIndex)}:
                                </span>
                                <span className="font-medium text-slate-900 whitespace-nowrap tabular-nums">
                                  {measurement ? formatMeasurement(measurement, config.unit) : 'Not set'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {!isFixedShape && config.corners >= 4 && diagonalMeasurements.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-slate-700 mb-2">Diagonal Lengths</h6>
                          <div className="space-y-1 text-sm">
                            {diagonalMeasurements.map((diagonal) => {
                              const measurement = config.measurements[diagonal.key];

                              return (
                                <div key={diagonal.key} className="flex items-baseline gap-3">
                                  <span className="text-slate-600 whitespace-nowrap min-w-[100px]">
                                    Diagonal {diagonal.key}:
                                  </span>
                                  <span className="font-medium text-slate-900 whitespace-nowrap tabular-nums">
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
                  <AccordionItem
                    defaultOpen={false}
                    trigger={
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span>Anchor Point Heights</span>
                        <span className="bg-[#01312D] text-white text-xs px-2 py-0.5 rounded-full">
                          {config.corners}
                        </span>
                      </span>
                    }
                  >
                    <Card className="p-4 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1.5 text-sm">
                        {config.fixingHeights.map((height, index) => {
                          const corner = String.fromCharCode(65 + index);
                          const type = config.fixingTypes?.[index] || 'post';

                          return (
                            <div key={index} className="flex items-baseline gap-3">
                              <span className="text-slate-600 whitespace-nowrap min-w-[120px]">Anchor Point {corner}:</span>
                              <span className="font-medium text-slate-900 whitespace-nowrap tabular-nums">
                                {formatMeasurement(height, config.unit)} ({type})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </AccordionItem>
                )}
              </div>
            )}

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
            <DeliveryEstimate className="mt-3" />
          </Card>
        )}

        {/* Configuration Checklist - Mobile only after price */}
        {isMobile && (
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
        )}

        {/* Important Acknowledgments - Full width on desktop (hidden for fixed shapes) */}
        {!isFixedShape && <Card
          ref={acknowledgementsCardRef}
          className={`${isMobile ? 'p-3 mt-4' : 'p-6 mt-6'} border-2 transition-all duration-300 ${allAcknowledgmentsChecked
            ? 'bg-emerald-50 border-emerald-200'
            : showValidationFeedback && !allAcknowledgmentsChecked && allDiagonalsEntered
              ? 'bg-red-100 border-red-600 ring-4 ring-red-300 shadow-xl'
              : !allAcknowledgmentsChecked && allDiagonalsEntered
                ? '!border-red-500 bg-red-50 hover:!border-red-600 shadow-md'
                : 'bg-slate-50 border-slate-200'
            } `}>
          <h4 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-slate-900 ${isMobile ? 'mb-1' : 'mb-2'}`}>
            Before we cut your fabric
            {allAcknowledgmentsChecked && (
              <span className="ml-2 text-emerald-600">✓</span>
            )}
          </h4>
          <p className={`${isMobile ? 'text-xs mb-2' : 'text-sm mb-4'} text-slate-600`}>
            Your sail is made to your measurements, so let's get this right together.
          </p>
          <div className={`${isMobile ? 'space-y-2 text-xs' : 'space-y-4 text-sm'}`}>
            <ul className={`${isMobile ? 'space-y-1.5 pl-5' : 'space-y-2 pl-6'} list-disc text-slate-700 marker:text-slate-400`}>
              <li>{isMobile ? 'Measurements are point-to-point and checked. We check again before cutting.' : "My measurements are point-to-point and I've checked them. Our team checks them again before anything is cut, and we'll contact you if something looks off."}</li>
              <li>
                {isMobile ? 'Fixing points are in place and sound. Not sure? ' : 'My fixing points are in place and structurally sound. Not sure? '}
                <a
                  href="https://shadespace.com/pages/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#307C31] underline hover:text-[#01312D]"
                >
                  Talk to us first
                </a>
                {isMobile ? '' : " — we'd rather have that conversation now than after."}
              </li>
              <li>{isMobile ? "Made for me, can't be resold or returned — backed by our Fit Guarantee." : "I understand this is made for me and can't be resold, which is why it isn't returnable — and why we back it with our Fit Guarantee."}</li>
              <li>{isMobile ? "I'm arranging my own installation (step-by-step guide included)." : "I'm arranging my own installation. Our step-by-step guide is included; most customers do it themselves in an afternoon."}</li>
            </ul>
            <div className={`rounded-lg border border-emerald-200 bg-emerald-50 ${isMobile ? 'p-2' : 'p-3'}`}>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-900 leading-relaxed`}>
                <span className="font-semibold">Our promise:</span> if we make it and it doesn't fit the space you measured, we'll make you another one free — and you keep the first one.
              </p>
            </div>

            <label className={`flex items-start gap-3 cursor-pointer ${isMobile ? 'mt-3 p-2' : 'mt-4 p-3'} rounded-lg border-2 transition-colors ${
              agreedToAcknowledgments
                ? 'bg-emerald-50 border-emerald-300'
                : showValidationFeedback && !agreedToAcknowledgments && allDiagonalsEntered
                  ? 'bg-red-50 border-red-400'
                  : 'bg-white border-slate-300 hover:border-slate-400'
            }`}>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={agreedToAcknowledgments}
                onChange={onToggleAgreement}
                required
              />
              <span
                aria-hidden="true"
                className="mt-0.5 flex-shrink-0 inline-flex items-center justify-center peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500"
                style={{
                  width: isMobile ? 20 : 24,
                  height: isMobile ? 20 : 24,
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  border: `2px solid ${agreedToAcknowledgments ? '#10b981' : '#94a3b8'}`,
                  backgroundColor: agreedToAcknowledgments ? '#10b981' : '#ffffff',
                }}
              >
                {agreedToAcknowledgments && (
                  <Check size={isMobile ? 14 : 16} strokeWidth={3} color="#ffffff" />
                )}
              </span>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold ${
                agreedToAcknowledgments
                  ? 'text-emerald-800'
                  : showValidationFeedback && !agreedToAcknowledgments && allDiagonalsEntered
                    ? 'text-red-700'
                    : 'text-slate-800'
              }`}>
                {isMobile
                  ? 'I agree to all acknowledgments above'
                  : 'I have read and agree to all of the acknowledgments listed above.'}
              </span>
            </label>

            {/* Conditional Height Disclaimer - Only show if heights not provided AND measurementOption is 'adjust' */}
            {config.corners !== 3 && config.measurementOption === 'adjust' && !config.heightsProvidedByUser && (
              <div className={`flex items-start gap-2 ${isMobile ? '' : 'p-2 -ml-2 rounded hover:bg-slate-50 transition-colors'}`}>
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex-shrink-0 inline-flex items-center justify-center"
                  style={{
                    width: isMobile ? 20 : 24,
                    height: isMobile ? 20 : 24,
                    borderRadius: 4,
                    boxSizing: 'border-box',
                    border: '2px solid #10b981',
                    backgroundColor: '#10b981',
                    opacity: 0.7,
                  }}
                >
                  <Check size={isMobile ? 14 : 16} strokeWidth={3} color="#ffffff" />
                </span>
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
        </Card>}

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

        {/* Action Buttons - Full width on desktop */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 mt-6">
          {/* Back button - Full width */}
          {showBackButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              className="w-full"
            >
              Back
            </Button>
          )}

          {/* Save & Email Quote button - Full width (mobile - review step) */}
          {!adminMode && isMobile && onSaveQuote && (
            <Button
              variant="outline"
              size="lg"
              onClick={onSaveQuote}
              className="w-full !border-2 !border-[#307C31] !bg-gradient-to-r !from-[#BFF102]/10 !to-white hover:!from-[#307C31] hover:!to-[#307C31] !text-[#01312D] hover:!text-white transition-all duration-300 flex flex-col items-center justify-center py-4 font-semibold"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-base">Save & Email Quote</span>
              </div>
              <span className="text-xs font-medium mt-1 opacity-90">Receive a detailed PDF quote via email</span>
            </Button>
          )}

          {/* Add to Cart button - Full width (hidden in admin mode) */}
          {!adminMode && (
          <Button
            ref={addToCartButtonRef}
            size={isMobile ? "lg" : "md"}
            className={`w-full transition-all duration-200 ${buttonShake ? 'shake' : ''} ${
              allAcknowledgmentsChecked && canAddToCart && !loading ? 'pulsate-cta' : ''
            } ${!canAddToCart && !loading
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
          )}

          {/* Admin mode: Save Quote button */}
          {adminMode && onSaveQuote && (
            <Button
              size="md"
              onClick={onSaveQuote}
              className="w-full"
            >
              SAVE QUOTE - {formatCurrency(calculations.totalPrice, config.currency)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});