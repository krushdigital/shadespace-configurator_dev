import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { DualImperialInput } from '../ui/DualImperialInput';
import { ShapeCanvas } from '../ShapeCanvas';
import { Tooltip } from '../ui/Tooltip';
import { convertMmToUnit, convertUnitToMm, formatMeasurement, getDiagonalKeysForCorners, formatSecondaryUnit, reconstructPolygonFromMeasurements, hasRequiredMeasurements, validatePolygonGeometry, calculateTriangleSideRange, getShapeAccuracy, getHeightRequirement, areHeightsProvided } from '../../utils/geometry';
import { PricingSummaryBox } from '../PricingSummaryBox';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SaveProgressButton } from '../SaveProgressButton';
import { CollapsibleToggleControl } from '../ui/CollapsibleToggleControl';
import { toast } from 'react-toastify';

interface DimensionsContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors?: {[key: string]: string};
  typoSuggestions?: {[key: string]: number};
  onNext: () => void;
  onPrev: () => void;
  setValidationErrors?: (errors: {[key: string]: string}) => void;
  setTypoSuggestions?: (suggestions: {[key: string]: number}) => void;
  dismissTypoSuggestion?: (fieldKey: string) => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  setHighlightedMeasurement?: (measurement: string | null) => void;
  // Pricing props for mobile summary
  isGeneratingPDF?: boolean;
  handleGeneratePDF?: () => void;
  showEmailInput?: boolean;
  email?: string;
  setEmail?: (email: string) => void;
  handleEmailSummary?: () => void;
  hasAllEdgeMeasurements?: boolean;
  isMobile?: boolean;
  highlightedMeasurement?: string | null;
  onSaveQuote?: () => void;
  highlightedCorner?: number | null;
  setHighlightedCorner?: (corner: number | null) => void;
  navigateToHeights?: boolean;
  setNavigateToHeights?: (value: boolean) => void;
  navigateToDiagonals?: boolean;
  setNavigateToDiagonals?: (value: boolean) => void;
}

export function DimensionsContent({
  config,
  updateConfig,
  calculations,
  onNext,
  onPrev,
  validationErrors = {},
  typoSuggestions = {},
  nextStepTitle = '',
  showBackButton = false,
  setValidationErrors,
  setTypoSuggestions,
  dismissTypoSuggestion,
  setHighlightedMeasurement,
  // Pricing props
  isGeneratingPDF = false,
  handleGeneratePDF = () => {},
  showEmailInput = false,
  email = '',
  setEmail = () => {},
  handleEmailSummary = () => {},
  hasAllEdgeMeasurements = false,
  isMobile = false,
  highlightedMeasurement = null,
  onSaveQuote = () => {},
  highlightedCorner = null,
  setHighlightedCorner = () => {},
  navigateToHeights = false,
  setNavigateToHeights = () => {},
  navigateToDiagonals = false,
  setNavigateToDiagonals = () => {}
}: DimensionsContentProps) {
  const heightRequirement = getHeightRequirement(config.corners, config.measurementOption);
  const heightsAreProvided = areHeightsProvided(config.fixingHeights, config.corners);
  const [showHeightsSection, setShowHeightsSection] = useState(false);
  const heightsSectionRef = React.useRef<HTMLDivElement>(null);
  const diagonalsSectionRef = React.useRef<HTMLDivElement>(null);
  const [geometryWarnings, setGeometryWarnings] = useState<{[key: string]: string}>({});
  const lastValidPointsRef = React.useRef(config.points);

  // Helper function to convert error messages with mm units to user's preferred unit
  const convertErrorMessageUnits = (errorMessage: string): string => {
    // Pattern: "Diagonal XX (YYYmm) is too long/short. With your edge measurements, it should be at least/cannot exceed ZZZmm."
    const diagonalMatch = errorMessage.match(/Diagonal ([A-Z]+) \((\d+)mm\) is (too long|too short)\. With your edge measurements, it (should be at least|cannot exceed) (\d+)mm/);

    if (diagonalMatch) {
      const [, diagonalName, currentValue, condition, phrase, suggestedValue] = diagonalMatch;
      const currentFormatted = formatMeasurement(parseFloat(currentValue), config.unit);
      const suggestedFormatted = formatMeasurement(parseFloat(suggestedValue), config.unit);

      return `Diagonal ${diagonalName} (${currentFormatted}) is ${condition}. With your edge measurements, it ${phrase} ${suggestedFormatted}.`;
    }

    // Return original message if pattern doesn't match
    return errorMessage;
  };

  const updateMeasurement = (edgeKey: string, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      const mmValue = convertUnitToMm(numericValue, config.unit);
      const newMeasurements = { ...config.measurements, [edgeKey]: mmValue };
      updateConfig({ measurements: newMeasurements });

      // Clear geometry warnings immediately when user updates measurements
      setGeometryWarnings({});

      // Clear any existing errors/suggestions for this field while typing
      if (setValidationErrors && setTypoSuggestions) {
        const newErrors = { ...validationErrors };
        const newSuggestions = { ...typoSuggestions };

        // Clear errors and suggestions for this field while user is typing
        delete newErrors[edgeKey];
        delete newSuggestions[edgeKey];

        setValidationErrors(newErrors);
        setTypoSuggestions(newSuggestions);
      }
    } else if (value === '') {
      // Allow complete clearing
      const newMeasurements = { ...config.measurements };
      delete newMeasurements[edgeKey];
      updateConfig({ measurements: newMeasurements });

      // Clear geometry warnings when user clears a field
      setGeometryWarnings({});

      if (setValidationErrors && setTypoSuggestions) {
        const newErrors = { ...validationErrors };
        const newSuggestions = { ...typoSuggestions };
        delete newErrors[edgeKey];
        delete newSuggestions[edgeKey];
        setValidationErrors(newErrors);
        setTypoSuggestions(newSuggestions);
      }
    } else {
      // Handle partial input (like "." or "33.") - don't update measurements but allow typing
      // Clear errors when field is emptied
      if (setValidationErrors && setTypoSuggestions) {
        const newErrors = { ...validationErrors };
        const newSuggestions = { ...typoSuggestions };
        delete newErrors[edgeKey];
        delete newSuggestions[edgeKey];
        setValidationErrors(newErrors);
        setTypoSuggestions(newSuggestions);
      }
    }
  };

  const applyEdgeTypoCorrection = (edgeKey: string) => {
    const correctedValue = typoSuggestions[edgeKey];
    if (correctedValue) {
      const newMeasurements = { ...config.measurements, [edgeKey]: correctedValue };
      updateConfig({ measurements: newMeasurements });
      
      // Clear validation errors and suggestions for this field
      if (setValidationErrors && setTypoSuggestions) {
        const newErrors = { ...validationErrors };
        const newSuggestions = { ...typoSuggestions };
        delete newErrors[edgeKey];
        delete newSuggestions[edgeKey];
        setValidationErrors(newErrors);
        setTypoSuggestions(newSuggestions);
      }
    }
  };

  const applyTypoCorrection = (measurementKey: string) => {
    const correctedValue = typoSuggestions[measurementKey];
    if (correctedValue) {
      const newMeasurements = { ...config.measurements, [measurementKey]: correctedValue };
      updateConfig({ measurements: newMeasurements });

      // Clear validation errors and suggestions for this field
      if (setValidationErrors && setTypoSuggestions) {
        const newErrors = { ...validationErrors };
        const newSuggestions = { ...typoSuggestions };
        delete newErrors[measurementKey];
        delete newSuggestions[measurementKey];
        setValidationErrors(newErrors);
        setTypoSuggestions(newSuggestions);
      }
    }
  };

  const updateFixingHeight = (index: number, height: number) => {
    const mmHeight = convertUnitToMm(height, config.unit);
    const newHeights = [...config.fixingHeights];
    while (newHeights.length < config.corners) {
      newHeights.push(0);
    }
    newHeights[index] = mmHeight;
    updateConfig({ fixingHeights: newHeights, heightsProvidedByUser: true });
  };

  const updateFixingType = (index: number, type: 'post' | 'building') => {
    const newTypes = [...(config.fixingTypes || [])];
    while (newTypes.length < config.corners) {
      newTypes.push('post');
    }
    newTypes[index] = type;
    updateConfig({ fixingTypes: newTypes, heightsProvidedByUser: true });
  };

  const getCornerLabel = (index: number) => String.fromCharCode(65 + index);

  // Handle navigation to heights section
  React.useEffect(() => {
    if (navigateToHeights && heightsSectionRef.current) {
      // Expand the heights section
      setShowHeightsSection(true);

      // Wait for accordion expansion animation to complete
      setTimeout(() => {
        if (heightsSectionRef.current) {
          const isMobileView = window.innerWidth < 1024;
          const headerOffset = isMobileView ? 120 : 140;
          const viewportOffset = window.innerHeight * 0.1; // 10% from top

          const elementPosition = heightsSectionRef.current.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset - viewportOffset;

          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });

          // Add pulse animation
          setTimeout(() => {
            heightsSectionRef.current?.classList.add('pulse-highlight');
            setTimeout(() => {
              heightsSectionRef.current?.classList.remove('pulse-highlight');
              // Clear the navigation flag
              setNavigateToHeights(false);
            }, 2000);
          }, 600);
        }
      }, 350); // Match accordion animation duration
    }
  }, [navigateToHeights, setNavigateToHeights]);

  // Handle navigation to diagonals section
  React.useEffect(() => {
    if (navigateToDiagonals && diagonalsSectionRef.current) {
      // Wait for any initial rendering to complete
      setTimeout(() => {
        if (diagonalsSectionRef.current) {
          const isMobileView = window.innerWidth < 1024;
          const headerOffset = isMobileView ? 120 : 140;
          const viewportOffset = window.innerHeight * 0.15; // 15% from top for better visibility

          const elementPosition = diagonalsSectionRef.current.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset - viewportOffset;

          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });

          // Add pulse animation
          setTimeout(() => {
            diagonalsSectionRef.current?.classList.add('pulse-highlight');
            setTimeout(() => {
              diagonalsSectionRef.current?.classList.remove('pulse-highlight');
              // Clear the navigation flag
              setNavigateToDiagonals(false);
            }, 2000);
          }, 600);
        }
      }, 350);
    }
  }, [navigateToDiagonals, setNavigateToDiagonals]);

  // Auto-reconstruct polygon from measurements with debouncing
  useEffect(() => {
    // Only auto-reconstruct if shape hasn't been manually adjusted
    if (config.hasManuallyAdjustedShape) {
      return;
    }

    // Debounce the reconstruction to avoid excessive calculations
    const timer = setTimeout(() => {
      // Check if we have all required measurements
      if (hasRequiredMeasurements(config.measurements, config.corners)) {
        // Validate geometry first
        const validation = validatePolygonGeometry(config.measurements, config.corners);

        console.log('Running geometry validation:', {
          corners: config.corners,
          measurements: config.measurements,
          isValid: validation.isValid,
          errors: validation.errors
        });

        if (!validation.isValid) {
          // Geometry is invalid - preserve last valid shape and show warnings
          console.log('Geometry validation failed - setting warning:', validation.errors[0]);
          const errorMessage = validation.errors[0] || 'Invalid measurements';
          const convertedError = convertErrorMessageUnits(errorMessage);
          setGeometryWarnings({ general: convertedError });
          // Keep the last valid points - don't update
          return;
        }

        // Clear any previous geometry warnings
        console.log('Geometry validation passed - clearing warnings');
        setGeometryWarnings({});

        // Attempt to reconstruct the polygon
        const reconstructedPoints = reconstructPolygonFromMeasurements(
          config.measurements,
          config.corners,
          600,
          600
        );

        // If reconstruction succeeded, update the points and store as last valid
        if (reconstructedPoints && reconstructedPoints.length === config.corners) {
          console.log('Auto-reconstructing shape from measurements:', {
            corners: config.corners,
            measurementKeys: Object.keys(config.measurements),
            pointsCount: reconstructedPoints.length
          });
          lastValidPointsRef.current = reconstructedPoints;
          updateConfig({ points: reconstructedPoints });
        } else {
          console.log('Reconstruction failed or returned null - preserving last valid shape:', {
            corners: config.corners,
            requiredMeasurements: hasRequiredMeasurements(config.measurements, config.corners),
            reconstructedPoints
          });
          // Keep the last valid points
        }
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.measurements, config.corners, config.hasManuallyAdjustedShape]);

  // Handler to reset shape to measurements
  const handleResetToMeasurements = useCallback(() => {
    if (hasRequiredMeasurements(config.measurements, config.corners)) {
      const reconstructedPoints = reconstructPolygonFromMeasurements(
        config.measurements,
        config.corners,
        600,
        600
      );

      if (reconstructedPoints && reconstructedPoints.length === config.corners) {
        updateConfig({
          points: reconstructedPoints,
          hasManuallyAdjustedShape: false
        });
      }
    }
  }, [config.measurements, config.corners, updateConfig]);

  // Handler for toggle switch
  const handleToggleMode = useCallback((isAutomatic: boolean) => {
    if (isAutomatic) {
      // Switching to Automatic mode - always allow the switch
      updateConfig({ hasManuallyAdjustedShape: false });

      if (hasRequiredMeasurements(config.measurements, config.corners)) {
        // If all measurements are present, reconstruct the shape
        const reconstructedPoints = reconstructPolygonFromMeasurements(
          config.measurements,
          config.corners,
          600,
          600
        );

        if (reconstructedPoints && reconstructedPoints.length === config.corners) {
          updateConfig({
            points: reconstructedPoints,
            hasManuallyAdjustedShape: false
          });
          toast.success('Switched to Automatic mode - shape fitted to measurements');
        } else {
          toast.info('Switched to Automatic mode - shape will update as you enter measurements');
        }
      } else {
        // Partial or no measurements - still allow the switch
        toast.info('Switched to Automatic mode - shape will update as you enter measurements');
      }
    } else {
      // Switching to Manual mode
      updateConfig({ hasManuallyAdjustedShape: true });
      toast.info('Switched to Manual mode - drag corners to customize shape');
    }
  }, [config.measurements, config.corners, updateConfig]);

  return (
    <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
      {/* Measurement Context Banner */}
      {config.measurementOption === 'adjust' && (
        <div className="mb-4 p-3 sm:mb-6 sm:p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h5 className="text-base font-bold text-blue-900 mb-1">
                You're Measuring Your Space
              </h5>
              <p className="text-sm text-blue-800 leading-relaxed">
                Enter the measurements <strong>between your fixing points</strong> (the space where the shade will be installed). We'll calculate the perfect sail size to fit your space, accounting for fabric stretch and tensioning hardware.
              </p>
            </div>
          </div>
        </div>
      )}

      {config.measurementOption === 'exact' && (
        <div className="mb-4 p-3 sm:mb-6 sm:p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h5 className="text-base font-bold text-amber-900 mb-1">
                You're Specifying Finished Shade Dimensions
              </h5>
              <p className="text-sm text-amber-800 leading-relaxed">
                Enter the exact measurements for <strong>the finished shade sail</strong> as you want it manufactured. We'll make it to these precise dimensions with no adjustments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Diagram - Only show on mobile */}
      {isMobile && (
        <div className="mb-4 sm:mb-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">
            Interactive Measurement Guide
          </h4>

          <div className="relative overflow-hidden rounded-lg">
            <ShapeCanvas
              config={config}
              updateConfig={updateConfig}
              readonly={false}
              snapToGrid={true}
              highlightedMeasurement={highlightedMeasurement}
              isMobile={isMobile}
              measurementOption={config.measurementOption}
              unit={config.unit}
            />

            {/* Shape Mode Toggle Control - Bottom Right Corner */}
            <div className="absolute bottom-2 right-2 z-10">
              <CollapsibleToggleControl
                isAutoMode={!config.hasManuallyAdjustedShape}
                onToggle={(isAuto) => handleToggleMode(isAuto)}
                isMobile={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Perimeter Too Large Warning */}
      {validationErrors.perimeterTooLarge && (
        <div className="mb-4 p-3 sm:mb-6 sm:p-4 bg-red-100 border-2 border-red-500 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-red-800 mb-1">
                Shade Sail Too Large
              </h4>
              <p className="text-red-700">
                {validationErrors.perimeterTooLarge}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Geometry Warning */}
      {Object.keys(geometryWarnings).length > 0 && (
        <div className="mb-4 p-3 sm:mb-6 sm:p-4 bg-amber-100 border-2 border-amber-500 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-amber-900 mb-1">
                Invalid Measurements
              </h4>
              <p className="text-amber-800 mb-2">
                {geometryWarnings.general}
              </p>
              {config.corners === 3 && (() => {
                const AB = config.measurements['AB'];
                const BC = config.measurements['BC'];
                const CA = config.measurements['CA'];
                if (AB && BC) {
                  const range = calculateTriangleSideRange(AB, BC);
                  return (
                    <p className="text-sm text-amber-700 mt-2">
                      <strong>Suggested range for CA:</strong> {convertMmToUnit(range.min, config.unit).toFixed(0)} - {convertMmToUnit(range.max, config.unit).toFixed(0)} {config.unit === 'metric' ? 'mm' : 'inches'}
                    </p>
                  );
                }
                if (AB && CA) {
                  const range = calculateTriangleSideRange(AB, CA);
                  return (
                    <p className="text-sm text-amber-700 mt-2">
                      <strong>Suggested range for BC:</strong> {convertMmToUnit(range.min, config.unit).toFixed(0)} - {convertMmToUnit(range.max, config.unit).toFixed(0)} {config.unit === 'metric' ? 'mm' : 'inches'}
                    </p>
                  );
                }
                if (BC && CA) {
                  const range = calculateTriangleSideRange(BC, CA);
                  return (
                    <p className="text-sm text-amber-700 mt-2">
                      <strong>Suggested range for AB:</strong> {convertMmToUnit(range.min, config.unit).toFixed(0)} - {convertMmToUnit(range.max, config.unit).toFixed(0)} {config.unit === 'metric' ? 'mm' : 'inches'}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-y-3 sm:gap-y-4">
        {/* Measurement Inputs */}
        <div>
          <h4 className="text-sm md:text-base lg:text-lg font-semibold text-[#01312D] mt-3 mb-2 sm:mt-4 sm:mb-3">
            {config.measurementOption === 'adjust'
              ? `Space Measurements - Distance Between Fixing Points`
              : `Finished Shade Dimensions`}
            {' '}({config.unit === 'metric' ? 'mm' : 'inches'})
          </h4>
          <Card className={`p-2 sm:p-3 md:p-4 ${
            Object.keys(validationErrors).some(key => 
              key !== 'typoSuggestions' && key !== 'perimeterTooLarge' && 
              (key.includes('AB') || key.includes('BC') || key.includes('CD') || key.includes('DA') || 
               key.includes('AC') || key.includes('BD') || key.includes('AE') || key.includes('BE') || 
               key.includes('CE') || key.includes('AD') || key.includes('BF') || key.includes('CF') || 
               key.includes('DF'))
            ) ? 'border-2 !border-red-500 bg-red-50' : ''
          }`}>
            <div className="space-y-2 sm:space-y-3">
              {/* Edge measurements */}
              {Array.from({ length: config.corners }, (_, index) => {
                const nextIndex = (index + 1) % config.corners;
                const edgeKey = `${getCornerLabel(index)}${getCornerLabel(nextIndex)}`;
                const currentValue = config.measurements[edgeKey] 
                  ? Math.round(convertMmToUnit(config.measurements[edgeKey], config.unit))
                  : '';
                const hasValidValue = config.measurements[edgeKey] && config.measurements[edgeKey] > 0;
                const hasError = validationErrors[edgeKey];
                const isSuccess = hasValidValue && !hasError;
                
                return (
                  <div key={edgeKey}>
                     <DualImperialInput
                      value={config.measurements[edgeKey]
                        ? convertMmToUnit(config.measurements[edgeKey], config.unit)
                        : 0}
                       onChange={(value) => {
                         if (value === 0) {
                           const newMeasurements = { ...config.measurements };
                           delete newMeasurements[edgeKey];
                           updateConfig({ measurements: newMeasurements });

                           // Clear validation errors for this field
                           if (setValidationErrors && setTypoSuggestions) {
                             const newErrors = { ...validationErrors };
                             const newSuggestions = { ...typoSuggestions };
                             delete newErrors[edgeKey];
                             delete newSuggestions[edgeKey];
                             setValidationErrors(newErrors);
                             setTypoSuggestions(newSuggestions);
                           }
                         } else {
                           updateMeasurement(edgeKey, String(value));
                         }
                       }}
                       onFocus={() => setHighlightedMeasurement(edgeKey)}
                       onBlur={() => setHighlightedMeasurement(null)}
                       unit={config.unit}
                       className={`text-sm sm:text-base`}
                       isSuccess={isSuccess}
                      error={validationErrors[edgeKey]}
                      errorKey={edgeKey}
                      label={config.measurementOption === 'adjust'
                        ? `Space Edge ${getCornerLabel(index)} → ${getCornerLabel(nextIndex)} (Fixing Point to Fixing Point)`
                        : `Shade Edge ${getCornerLabel(index)} → ${getCornerLabel(nextIndex)} (Finished Sail)`}
                      secondaryValue={config.measurements[edgeKey] ? formatSecondaryUnit(config.measurements[edgeKey], config.unit) : ''}
                      showConversion={true}
                      allowFormatSwitch={true}
                     />

                   {/* Typo Warning */}
                   {typoSuggestions[edgeKey] && (
                     <div className="mt-1.5 p-2 sm:mt-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                       <div className="flex flex-col gap-2">
                         <p className="text-sm text-amber-800 w-full">
                          <strong>Possible typo:</strong> Did you mean {formatMeasurement(typoSuggestions[edgeKey], config.unit, true)}?
                         </p>
                         <div className="flex gap-2">
                           <button
                            onClick={() => applyEdgeTypoCorrection(edgeKey)}
                             className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors"
                           >
                             Correct
                           </button>
                           <button
                            onClick={() => dismissTypoSuggestion?.(edgeKey)}
                             className="px-3 py-1 bg-white border border-amber-600 text-amber-800 text-sm rounded hover:bg-amber-50 transition-colors"
                           >
                             Dismiss
                           </button>
                         </div>
                       </div>
                     </div>
                   )}
                  </div>
                );
              })}

              {/* Diagonal measurements for 4+ corners */}
              {config.corners >= 4 && config.corners <= 6 && (() => {
                const shapeAccuracyInfo = getShapeAccuracy(config.measurements, config.corners);
                const isApproximate = shapeAccuracyInfo.accuracy === 'approximate';

                return (
                <>
                <div ref={diagonalsSectionRef} className={`pt-2 sm:pt-3 border-t-2 ${isApproximate ? 'border-amber-300 bg-amber-50/30 -mx-2 px-2 sm:-mx-3 sm:px-3 md:-mx-4 md:px-4 pb-2 sm:pb-3 rounded-b-lg' : 'border-[#307C31]/30'}`}>
                  {isApproximate && (
                    <div className="mb-3 p-2 bg-amber-100 border border-amber-300 rounded-lg">
                      <p className="text-xs sm:text-sm text-amber-800 font-medium">
                        {(() => {
                          const minimumDiagonals = config.corners - 3;
                          if (minimumDiagonals === 1) {
                            return 'Add at least one diagonal to see your exact shape in the preview above';
                          }
                          return `Add at least ${minimumDiagonals} diagonals to see your exact shape in the preview above`;
                        })()}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <div className="flex flex-col">
                      <h5 className={`text-xs sm:text-sm md:text-base font-medium ${isApproximate ? 'text-amber-900' : 'text-[#01312D]'}`}>
                        Diagonal Measurements {isApproximate && '- Recommended for Accurate Preview'}
                      </h5>
                      <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium self-start mt-1">
                        Optional Now - Required at Checkout
                      </span>
                    </div>
                    <Tooltip
                      content={
                        <div>
                          <p className="text-sm text-[#01312D] font-medium mb-2">
                            Two-Step Process:
                          </p>
                          <div className="space-y-2 mb-3">
                            <div className="flex items-start gap-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#BFF102] text-[#01312D] text-xs font-bold flex-shrink-0">1</span>
                              <p className="text-sm text-[#01312D]/80">
                                Enter edge measurements → Get instant pricing
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#BFF102] text-[#01312D] text-xs font-bold flex-shrink-0">2</span>
                              <p className="text-sm text-[#01312D]/80">
                                Add diagonals at checkout → Complete your order
                              </p>
                            </div>
                          </div>
                          <div className="bg-[#BFF102]/10 border border-[#BFF102] rounded-lg p-2">
                            <p className="text-sm text-[#01312D]">
                              <strong>Why are diagonals needed?</strong> They ensure our manufacturing team can create your exact shape with precision accuracy.
                              {config.measurementOption === 'adjust' && (
                                <span className="block mt-1">
                                  <em>Note: Measure diagonals between the fixing points in your space.</em>
                                </span>
                              )}
                              {config.measurementOption === 'exact' && (
                                <span className="block mt-1">
                                  <em>Note: Provide diagonal measurements of the finished shade sail.</em>
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      }
                    >
                      <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                        ?
                      </span>
                    </Tooltip>
                  </div>
                  <div className="space-y-2">
                    {getDiagonalKeysForCorners(config.corners).map((key) => {
                      const hasValidValue = config.measurements[key] && config.measurements[key] > 0;
                      const hasError = validationErrors[key];
                      const isSuccess = hasValidValue && !hasError;
                      
                      // Generate label from key (e.g., 'AC' -> 'Diagonal A → C')
                      const label = config.measurementOption === 'adjust'
                        ? `Space Diagonal ${key.charAt(0)} → ${key.charAt(1)} (Between Fixing Points)`
                        : `Shade Diagonal ${key.charAt(0)} → ${key.charAt(1)} (Finished Sail)`;
                      
                      return (
                        <div key={key}>
                            <DualImperialInput
                             value={config.measurements[key]
                               ? convertMmToUnit(config.measurements[key], config.unit)
                               : 0}
                              onChange={(value) => {
                                if (value === 0) {
                                  const newMeasurements = { ...config.measurements };
                                  delete newMeasurements[key];
                                  updateConfig({ measurements: newMeasurements });

                                  // Clear validation errors and typo suggestions for this field
                                  if (setValidationErrors && setTypoSuggestions) {
                                    const newErrors = { ...validationErrors };
                                    const newSuggestions = { ...typoSuggestions };
                                    delete newErrors[key];
                                    delete newSuggestions[key];
                                    setValidationErrors(newErrors);
                                    setTypoSuggestions(newSuggestions);
                                  }
                                } else {
                                  updateMeasurement(key, String(value));
                                }
                              }}
                              onFocus={() => setHighlightedMeasurement?.(key)}
                              onBlur={() => setHighlightedMeasurement?.(null)}
                              unit={config.unit}
                              className={`text-sm sm:text-base`}
                              error={validationErrors[key]}
                              errorKey={key}
                              isSuccess={!!(config.measurements[key] && config.measurements[key] > 0 && !validationErrors[key])}
                              label={label}
                              secondaryValue={config.measurements[key] ? formatSecondaryUnit(config.measurements[key], config.unit) : ''}
                              showConversion={true}
                              allowFormatSwitch={true}
                            />

                          {/* Typo Warning */}
                          {typoSuggestions[key] && (
                            <div className="mt-1.5 p-2 sm:mt-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex flex-col gap-2">
                                <p className="text-sm text-amber-800 w-full">
                                  <strong>Possible typo:</strong> Did you mean {formatMeasurement(typoSuggestions[key], config.unit)}?
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => applyTypoCorrection(key)}
                                    className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors"
                                  >
                                    Correct
                                  </button>
                                  <button
                                    onClick={() => dismissTypoSuggestion?.(key)}
                                    className="px-3 py-1 bg-white border border-amber-600 text-amber-800 text-sm rounded hover:bg-amber-50 transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                </>
                );
              })()}
            </div>
          </Card>
        </div>

        {/* Heights and Anchor Points Section - Shown based on corner count and measurement option */}
        {heightRequirement !== 'none' && (
          <div className="mt-4 sm:mt-6" ref={heightsSectionRef}>
            <Card
              className={`overflow-hidden transition-all duration-300 ${
                showHeightsSection
                  ? 'border-2 border-[#307C31]'
                  : 'border border-slate-300'
              }`}
            >
              <button
                onClick={() => setShowHeightsSection(!showHeightsSection)}
                className="w-full p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition-colors gap-2 sm:gap-3 cursor-pointer"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex-shrink-0 pt-1 sm:pt-0">
                    {showHeightsSection ? (
                      <ChevronUp className="w-5 h-5 text-[#307C31]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm sm:text-base font-semibold text-[#01312D]">
                        Height Information {heightRequirement === 'required-at-checkout' ? '(required)' : '(optional)'}
                      </h5>
                      {heightRequirement === 'required-at-checkout' && (
                        <Tooltip
                          content={
                            <div>
                              <p className="text-xs text-white font-medium mb-1">
                                Required at Checkout
                              </p>
                              <p className="text-xs text-white/90 leading-relaxed">
                                Shade sails with {config.corners} corners require height measurements for each fixing point before checkout. This ensures proper tension, water runoff, and structural integrity for complex installations. You can add them now or during the review step.
                              </p>
                            </div>
                          }
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-blue-600 rounded-full cursor-help hover:bg-blue-700">
                            i
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1.5">
                      {heightRequirement === 'required-at-checkout'
                        ? `${config.corners} corner shade sails require height measurements for each fixing point to ensure proper installation`
                        : showHeightsSection
                        ? 'Providing this information allows for more customized manufacturing'
                        : 'Click to add height and attachment information for a more customized fit'}
                    </p>
                  </div>
                </div>
              </button>

              {showHeightsSection && (
                <div className="p-3 sm:p-4 border-t border-slate-200 space-y-2 sm:space-y-3">
                  {/* Height inputs for each corner */}
                  <div className="space-y-2">
                    {Array.from({ length: config.corners }, (_, index) => (
                      <Card key={index} className="p-2 border-l-4 border-l-[#01312D]">
                        <div className="space-y-1.5">
                          <h6 className="font-semibold text-[#01312D] text-xs">
                            Anchor Point {getCornerLabel(index)}
                          </h6>

                          <div className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr] md:gap-3">
                            {/* Height Input */}
                            <div>
                              <DualImperialInput
                                value={config.fixingHeights[index]
                                  ? convertMmToUnit(config.fixingHeights[index], config.unit)
                                  : 0}
                                onChange={(value) => {
                                  if (value === 0) {
                                    const newHeights = [...config.fixingHeights];
                                    newHeights[index] = 0;
                                    updateConfig({ fixingHeights: newHeights });
                                  } else {
                                    updateFixingHeight(index, value);
                                  }
                                }}
                                onFocus={() => setHighlightedCorner(index)}
                                onBlur={() => setHighlightedCorner(null)}
                                unit={config.unit}
                                className="text-sm"
                                isSuccess={!!(config.fixingHeights[index] && config.fixingHeights[index] > 0)}
                                label={
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-[#01312D]">
                                      Height from Ground
                                    </span>
                                    <Tooltip
                                      content={
                                        <div>
                                          <p className="text-xs text-[#01312D] font-medium mb-1">
                                            What is this measurement?
                                          </p>
                                          <p className="text-xs text-[#01312D]/80 leading-relaxed">
                                            Height is measured from ground level to the anchor point. This helps ensure proper sail tension and water runoff.
                                          </p>
                                        </div>
                                      }
                                    >
                                      <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-[10px] bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                                        ?
                                      </span>
                                    </Tooltip>
                                  </div>
                                }
                                showConversion={false}
                                allowFormatSwitch={true}
                              />
                            </div>

                            {/* Attachment Type */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-xs font-medium text-[#01312D]">
                                  Attachment Type
                                </span>
                                <Tooltip
                                  content={
                                    <div>
                                      <p className="text-xs text-[#01312D] font-medium mb-1">
                                        Attachment Type
                                      </p>
                                      <p className="text-xs text-[#01312D]/70">
                                        Post: Freestanding pole. Building: Wall, roof, or structure.
                                      </p>
                                    </div>
                                  }
                                >
                                  <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-[10px] bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                                    ?
                                  </span>
                                </Tooltip>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => updateFixingType(index, 'post')}
                                  className={`w-full px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border ${
                                    config.fixingTypes?.[index] === 'post'
                                      ? 'bg-[#01312D] text-[#F3FFE3] border-[#01312D]'
                                      : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-slate-300'
                                  }`}
                                >
                                  Post
                                </button>
                                <button
                                  onClick={() => updateFixingType(index, 'building')}
                                  className={`w-full px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border ${
                                    config.fixingTypes?.[index] === 'building'
                                      ? 'bg-[#01312D] text-[#F3FFE3] border-[#01312D]'
                                      : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-slate-300'
                                  }`}
                                >
                                  Building
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Installation Guidelines */}
                  <Card className="p-2 sm:p-3 bg-slate-50 border-slate-200">
                    <h6 className="text-xs md:text-sm font-semibold text-[#01312D] mb-2">
                      Installation Guidelines
                    </h6>
                    <ul className="space-y-1 text-xs text-slate-600">
                      <li className="flex items-start">
                        <span className="w-1.5 h-1.5 bg-[#307C31] rounded-full mt-1.5 mr-2 flex-shrink-0" />
                        Heights are measured from ground level to the anchor point
                      </li>
                      <li className="flex items-start">
                        <span className="w-1.5 h-1.5 bg-[#307C31] rounded-full mt-1.5 mr-2 flex-shrink-0" />
                        Different heights create natural water runoff and proper sail tension
                      </li>
                      <li className="flex items-start">
                        <span className="w-1.5 h-1.5 bg-[#307C31] rounded-full mt-1.5 mr-2 flex-shrink-0" />
                        Minimum recommended height is {config.unit === 'imperial' ? '7.2ft' : '2.2m'} for clearance
                      </li>
                    </ul>
                  </Card>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-slate-200 mt-4 sm:mt-6">
        {(() => {
          if (config.corners === 0) {
            return null;
          }

          let edgeCount = 0;
          for (let i = 0; i < config.corners; i++) {
            const nextIndex = (i + 1) % config.corners;
            const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
            const measurement = config.measurements[edgeKey];
            if (measurement && measurement > 0) {
              edgeCount++;
            }
          }

          const hasUnacknowledgedTypos = Object.keys(typoSuggestions).length > 0;
          const missingCount = config.corners - edgeCount;
          const shouldDisable = edgeCount !== config.corners || hasUnacknowledgedTypos;

          const hasQuote = calculations.totalPrice > 0 && edgeCount === config.corners;

          return (
            <>
              {shouldDisable && (
                <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  {hasUnacknowledgedTypos ? (
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>Please review and address the measurement warnings above</span>
                    </span>
                  ) : missingCount > 0 ? (
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-slate-500" />
                      <span>{missingCount} edge measurement{missingCount !== 1 ? 's' : ''} required to continue</span>
                    </span>
                  ) : null}
                </div>
              )}

              {/* Removed premature quote ready message - users haven't completed all steps yet */}

              {/* Navigation Buttons */}
              {/* Mobile Layout: Back and Save Progress on same row, Continue below */}
              <div className="flex sm:hidden flex-col gap-3">
                <div className="flex gap-3">
                  {showBackButton && (
                    <Button
                      variant="outline"
                      size="md"
                      onClick={onPrev}
                      className="flex-1"
                    >
                      Back
                    </Button>
                  )}
                  {onSaveQuote && (
                    <SaveProgressButton
                      onClick={onSaveQuote}
                      className="flex-1"
                    />
                  )}
                </div>
                <Button
                  onClick={onNext}
                  size="md"
                  className={`w-full py-4 sm:py-2 ${shouldDisable ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Continue to {nextStepTitle}
                </Button>
              </div>

              {/* Desktop Layout: Back, Save Progress, and Continue on same row */}
              <div className="hidden sm:flex items-center gap-4">
                {showBackButton && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={onPrev}
                    className="w-auto"
                  >
                    Back
                  </Button>
                )}
                {onSaveQuote && (
                  <SaveProgressButton
                    onClick={onSaveQuote}
                    className="w-auto"
                  />
                )}
                <Button
                  onClick={onNext}
                  size="md"
                  className={`flex-1 ${shouldDisable ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Continue to {nextStepTitle}
                </Button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}