import React from 'react';
import { useState } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ShapeCanvas } from '../ShapeCanvas';
import { Tooltip } from '../ui/Tooltip';
import { convertMmToUnit, convertUnitToMm, formatMeasurement, getDiagonalKeysForCorners } from '../../utils/geometry';
import { PricingSummaryBox } from '../PricingSummaryBox';
import { AlertCircle } from 'lucide-react';

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
  highlightedMeasurement = null
}: DimensionsContentProps) {

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
  const getCornerLabel = (index: number) => String.fromCharCode(65 + index);

  return (
    <div className="px-6 pt-6 pb-6">
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
              Enter measurements in the fields below to calculate pricing. All measurements are in {config.unit === 'imperial' ? 'inches' : 'millimeters'}.
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
            Precise Measurements ({config.unit === 'metric' ? 'mm' : 'inches'})
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
                    <label className="block text-xs md:text-sm font-medium text-[#01312D] mb-1">
                      Edge {getCornerLabel(index)} → {getCornerLabel(nextIndex)}
                    </label>
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
                     />
                     <div className={`absolute ${isSuccess ? 'right-11' : 'right-3'} top-1/2 transform -translate-y-1/2 text-xs text-[#01312D]/70 transition-all duration-200`}>
                       {config.unit === 'metric' ? 'mm' : 'in'}
                     </div>
                   </div>
                   
                   {/* Typo Warning */}
                   {typoSuggestions[edgeKey] && (
                     <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                       <div className="flex items-center justify-between gap-2">
                         <div className="flex-1">
                           <p className="text-sm text-amber-800">
                            <strong>Possible typo:</strong> Did you mean {formatMeasurement(typoSuggestions[edgeKey], config.unit, true)}?
                           </p>
                         </div>
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
                      <span className="text-xs bg-red-100 text-[#c53030] px-1.5 py-0.5 rounded-full font-medium self-start mt-1">
                        Required for Order
                      </span>
                    </div>
                    <Tooltip
                      content={
                        <div>
                          <p className="text-sm text-[#01312D] font-medium mb-2">
                            Why are diagonals needed?
                          </p>
                          <p className="text-sm text-[#01312D]/70 mb-3">
                            Diagonal measurements ensure our manufacturing team can create the exact shape you need. While not required for pricing, they're essential for production accuracy.
                          </p>
                          <div className="bg-[#BFF102]/10 border border-[#BFF102] rounded-lg p-2">
                            <p className="text-sm text-[#01312D]">
                              <strong>Tip:</strong> You can proceed to see pricing, but diagonals will be required before placing your order.
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
                      const label = `Diagonal ${key.charAt(0)} → ${key.charAt(1)}`;
                      
                      return (
                        <div key={key}>
                          <label className="block text-xs md:text-sm font-medium text-[#01312D] mb-1">
                            {label}
                          </label>
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
                            className="text-base pr-12"
                            error={validationErrors[key]}
                            errorKey={key}
                            isSuccess={!!(config.measurements[key] && config.measurements[key] > 0 && !validationErrors[key])}
                            isSuggestedTypo={!!typoSuggestions[key]}
                          />
                          
                          {/* Typo Warning */}
                          {typoSuggestions[key] && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm text-amber-800">
                                    <strong>Possible typo:</strong> Did you mean {formatMeasurement(typoSuggestions[key], config.unit)}?
                                  </p>
                                </div>
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
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-4 border-t border-slate-200 mt-6">
        <div className="flex flex-col sm:flex-row gap-4">
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
          <div className="flex-1 flex flex-col gap-2">
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
                  <Button
                    onClick={onNext}
                    size="md"
                    className={shouldDisable ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Continue to {nextStepTitle}
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}