import React from 'react';
import { useState } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ShapeCanvas } from '../ShapeCanvas';
import { Tooltip } from '../ui/Tooltip';
import { convertMmToUnit, convertUnitToMm, formatMeasurement, getDiagonalKeysForCorners, formatSecondaryUnit } from '../../utils/geometry';
import { PricingSummaryBox } from '../PricingSummaryBox';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SaveProgressButton } from '../SaveProgressButton';

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
  setHighlightedCorner = () => {}
}: DimensionsContentProps) {
  const [showHeightsSection, setShowHeightsSection] = useState(false);

  const updateMeasurement = (edgeKey: string, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      const mmValue = convertUnitToMm(numericValue, config.unit);
      const newMeasurements = { ...config.measurements, [edgeKey]: mmValue };
      updateConfig({ measurements: newMeasurements });
      
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

  return (
    <div className="px-6 pt-6 pb-6">
      {/* Measurement Context Banner */}
      {config.measurementOption === 'adjust' && (
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
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
        <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
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
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">
            Interactive Measurement Guide
          </h4>

          {/* Canvas Tip */}
          <div className="p-3 bg-[#BFF102]/10 border border-[#307C31]/30 rounded-lg mb-4">
            <p className="text-sm text-[#01312D]">
              <strong>Tip:</strong> Drag the corners on the canvas to visualize your shape.
              {config.measurementOption === 'adjust'
                ? 'Enter your space measurements (distance between fixing points) in the fields below to calculate pricing.'
                : 'Enter your desired shade dimensions in the fields below to calculate pricing.'}
              {' '}All measurements are in {config.unit === 'imperial' ? 'inches' : 'millimeters'}.
            </p>
          </div>
          
          <ShapeCanvas 
            config={config} 
            updateConfig={updateConfig}
            readonly={false}
            snapToGrid={true}
            highlightedMeasurement={highlightedMeasurement}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Perimeter Too Large Warning */}
      {validationErrors.perimeterTooLarge && (
        <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 rounded-lg">
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

      <div className="grid grid-cols-1 gap-y-4">
        {/* Measurement Inputs */}
        <div>
          <h4 className="text-base md:text-lg font-semibold text-[#01312D] mt-4 mb-3">
            {config.measurementOption === 'adjust'
              ? `Space Measurements - Distance Between Fixing Points`
              : `Finished Shade Dimensions`}
            {' '}({config.unit === 'metric' ? 'mm' : 'inches'})
          </h4>
          <Card className={`p-3 md:p-4 ${
            Object.keys(validationErrors).some(key => 
              key !== 'typoSuggestions' && key !== 'perimeterTooLarge' && 
              (key.includes('AB') || key.includes('BC') || key.includes('CD') || key.includes('DA') || 
               key.includes('AC') || key.includes('BD') || key.includes('AE') || key.includes('BE') || 
               key.includes('CE') || key.includes('AD') || key.includes('BF') || key.includes('CF') || 
               key.includes('DF'))
            ) ? 'border-2 !border-red-500 bg-red-50' : ''
          }`}>
            <div className="space-y-3">
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
                   <div className="relative">
                     <Input
                       type="number"
                      value={config.measurements[edgeKey]
                        ? (config.unit === 'imperial'
                          ? String(Math.round(convertMmToUnit(config.measurements[edgeKey], config.unit) * 100) / 100)
                          : Math.round(convertMmToUnit(config.measurements[edgeKey], config.unit)).toString()
                        )
                        : ''}
                       onChange={(e) => {
                         if (e.target.value === '') {
                           // Allow complete clearing
                           const newMeasurements = { ...config.measurements };
                           delete newMeasurements[edgeKey];
                           updateConfig({ measurements: newMeasurements });
                         } else {
                           updateMeasurement(edgeKey, e.target.value);
                         }
                       }}
                       onFocus={() => setHighlightedMeasurement(edgeKey)}
                       onBlur={() => setHighlightedMeasurement(null)}
                       placeholder={config.unit === 'imperial' ? '120' : '3000'}
                       min="100"
                      step={config.unit === 'imperial' ? '0.1' : '10'}
                      autoComplete="off"
                       className={`text-base ${isSuccess ? 'pr-16' : 'pr-12'}`}
                       isSuccess={isSuccess}
                       isSuggestedTypo={!!typoSuggestions[edgeKey]}
                      error={validationErrors[edgeKey]}
                      errorKey={edgeKey}
                      label={config.measurementOption === 'adjust'
                        ? `Space Edge ${getCornerLabel(index)} → ${getCornerLabel(nextIndex)} (Fixing Point to Fixing Point)`
                        : `Shade Edge ${getCornerLabel(index)} → ${getCornerLabel(nextIndex)} (Finished Sail)`}
                      secondaryValue={config.measurements[edgeKey] ? formatSecondaryUnit(config.measurements[edgeKey], config.unit) : ''}
                     />
                     <div className={`absolute ${isSuccess ? 'right-11' : 'right-3'} top-1/2 transform -translate-y-1/2 text-xs text-[#01312D]/70 transition-all duration-200`}>
                       {config.unit === 'metric' ? 'mm' : 'in'}
                     </div>
                   </div>
                   
                   {/* Typo Warning */}
                   {typoSuggestions[edgeKey] && (
                     <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
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
              {config.corners >= 4 && config.corners <= 6 && (
                <>
                <div className="pt-3 border-t border-[#307C31]/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex flex-col">
                      <h5 className="text-sm md:text-base font-medium text-[#01312D]">
                        Diagonal Measurements
                      </h5>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium self-start mt-1">
                        Optional Now • Required at Checkout
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
                              <p className="text-sm text-[#01312D]/70">
                                Enter edge measurements → Get instant pricing
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#BFF102] text-[#01312D] text-xs font-bold flex-shrink-0">2</span>
                              <p className="text-sm text-[#01312D]/70">
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
                          <div className="relative">
                            <Input
                              type="number"
                             value={config.measurements[key]
                               ? (config.unit === 'imperial'
                                 ? String(Math.round(convertMmToUnit(config.measurements[key], config.unit) * 100) / 100)
                                 : Math.round(convertMmToUnit(config.measurements[key], config.unit)).toString()
                               )
                               : ''}
                              onChange={(e) => {
                                if (e.target.value === '') {
                                  const newMeasurements = { ...config.measurements };
                                  delete newMeasurements[key];
                                  updateConfig({ measurements: newMeasurements });
                                  if (setValidationErrors) {
                                    const newErrors = { ...validationErrors };
                                    delete newErrors[key];
                                    setValidationErrors(newErrors);
                                  }
                                } else {
                                  updateMeasurement(key, e.target.value);
                                }
                              }}
                              onFocus={() => setHighlightedMeasurement?.(key)}
                              onBlur={() => setHighlightedMeasurement?.(null)}
                              placeholder={config.unit === 'imperial' ? '240' : '6000'}
                              min="100"
                             step={config.unit === 'imperial' ? '0.1' : '10'}
                             autoComplete="off"
                              className={`text-base ${isSuccess ? 'pr-16' : 'pr-12'}`}
                              error={validationErrors[key]}
                              errorKey={key}
                              isSuccess={!!(config.measurements[key] && config.measurements[key] > 0 && !validationErrors[key])}
                              isSuggestedTypo={!!typoSuggestions[key]}
                              label={label}
                              secondaryValue={config.measurements[key] ? formatSecondaryUnit(config.measurements[key], config.unit) : ''}
                            />
                            <div className={`absolute ${isSuccess ? 'right-11' : 'right-3'} top-1/2 transform -translate-y-1/2 text-xs text-[#01312D]/70 transition-all duration-200`}>
                              {config.unit === 'metric' ? 'mm' : 'in'}
                            </div>
                          </div>
                          
                          {/* Typo Warning */}
                          {typoSuggestions[key] && (
                            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
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

                  {/* Success Message when all diagonals are entered */}
                  {config.corners >= 4 && (() => {
                    const diagonalKeys = getDiagonalKeysForCorners(config.corners);
                    const allDiagonalsEntered = diagonalKeys.every(key =>
                      config.measurements[key] && config.measurements[key] > 0
                    );

                    if (allDiagonalsEntered) {
                      return (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm text-emerald-900 font-medium">
                                Perfect! All measurements complete
                              </p>
                              <p className="text-xs text-emerald-800 mt-0.5">
                                You've entered all diagonals and can proceed directly to checkout after reviewing your order.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Optional Heights and Anchor Points Section - Only shown for "adjust" measurement option */}
        {config.corners !== 3 && config.measurementOption === 'adjust' && (
          <div className="mt-6">
            <Card
              className={`overflow-hidden transition-all duration-300 ${
                showHeightsSection ? 'border-2 border-[#307C31]' : 'border border-slate-300'
              }`}
            >
              <button
                onClick={() => setShowHeightsSection(!showHeightsSection)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {showHeightsSection ? (
                      <ChevronUp className="w-5 h-5 text-[#307C31]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div className="text-left">
                    <h5 className="text-base font-semibold text-[#01312D] flex items-center gap-2">
                      Optional: Heights & Anchor Points for Custom Fit
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Optional
                      </span>
                    </h5>
                    <p className="text-sm text-slate-600 mt-1">
                      {showHeightsSection
                        ? 'Providing this information allows for more customized manufacturing'
                        : 'Click to add height and attachment information for a more customized fit'}
                    </p>
                  </div>
                </div>
              </button>

              {showHeightsSection && (
                <div className="p-4 pt-0 border-t border-slate-200 space-y-4">
                  <div className="p-3 bg-[#BFF102]/10 border border-[#307C31]/30 rounded-lg">
                    <p className="text-sm text-[#01312D]">
                      <strong>Note:</strong> Adding heights and anchor point details helps us manufacture a sail that fits your specific installation perfectly. However, this information is not required to complete your order.
                    </p>
                  </div>

                  {/* Height inputs for each corner */}
                  <div className="space-y-3">
                    {Array.from({ length: config.corners }, (_, index) => (
                      <Card key={index} className="p-3 border-l-4 border-l-[#01312D]">
                        <div className="space-y-2">
                          <h6 className="font-semibold text-[#01312D] text-sm">
                            Anchor Point {getCornerLabel(index)} Configuration
                          </h6>

                          <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2">
                            {/* Height Input */}
                            <div>
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={config.fixingHeights[index]
                                    ? (config.unit === 'imperial'
                                      ? String(Math.round(convertMmToUnit(config.fixingHeights[index], config.unit) * 100) / 100)
                                      : Math.round(convertMmToUnit(config.fixingHeights[index], config.unit)).toString()
                                    )
                                    : ''}
                                  onChange={(e) => {
                                    if (e.target.value === '') {
                                      const newHeights = [...config.fixingHeights];
                                      newHeights[index] = 0;
                                      updateConfig({ fixingHeights: newHeights });
                                    } else {
                                      const numValue = parseFloat(e.target.value);
                                      if (!isNaN(numValue)) {
                                        updateFixingHeight(index, numValue);
                                      }
                                    }
                                  }}
                                  onFocus={() => setHighlightedCorner(index)}
                                  onBlur={() => setHighlightedCorner(null)}
                                  placeholder={config.unit === 'imperial' ? '100' : '2500'}
                                  autoComplete="off"
                                  className="flex-1 py-2 pr-12"
                                  step={config.unit === 'imperial' ? '0.1' : '10'}
                                  label={
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-[#01312D]">
                                        Height from Ground
                                      </span>
                                      <Tooltip
                                        content={
                                          <div>
                                            <p className="text-sm text-[#01312D] font-medium mb-2">
                                              What is this measurement?
                                            </p>
                                            <p className="text-sm text-[#01312D]/80 mb-3 leading-relaxed">
                                              Height is measured from ground level (or your chosen datum level) to the anchor point. This helps ensure proper sail tension and water runoff.
                                            </p>
                                          </div>
                                        }
                                      >
                                        <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                                          ?
                                        </span>
                                      </Tooltip>
                                    </div>
                                  }
                                  secondaryValue={config.fixingHeights[index] && config.fixingHeights[index] > 0 ? formatSecondaryUnit(config.fixingHeights[index], config.unit) : ''}
                                />
                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-[#01312D]/50">
                                  {config.unit === 'metric' ? 'mm' : 'in'}
                                </span>
                              </div>
                            </div>

                            {/* Attachment Type */}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-[#01312D]">
                                  Attachment Type
                                </span>
                                <Tooltip
                                  content={
                                    <div>
                                      <p className="text-sm text-[#01312D] font-medium mb-1">
                                        Attachment Type
                                      </p>
                                      <p className="text-sm text-[#01312D]/70">
                                        Post: Freestanding pole installation. Building: Attached to wall, roof, or existing structure.
                                      </p>
                                    </div>
                                  }
                                >
                                  <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                                    ?
                                  </span>
                                </Tooltip>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => updateFixingType(index, 'post')}
                                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border-2 ${
                                    config.fixingTypes?.[index] === 'post'
                                      ? 'bg-[#01312D] text-[#F3FFE3] shadow-md !border-[#01312D]'
                                      : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-[#307C31]/30'
                                  }`}
                                >
                                  Post
                                </button>
                                <button
                                  onClick={() => updateFixingType(index, 'building')}
                                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border-2 ${
                                    config.fixingTypes?.[index] === 'building'
                                      ? 'bg-[#01312D] text-[#F3FFE3] shadow-md !border-[#01312D]'
                                      : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-[#307C31]/30'
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
                  <Card className="p-3 bg-slate-50 border-slate-200">
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

      <div className="flex flex-col gap-4 pt-4 border-t border-slate-200 mt-6">
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