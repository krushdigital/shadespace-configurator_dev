import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { Input } from './ui/Input';
import { ConfiguratorState } from '../types';
import { convertMmToUnit, formatMeasurement } from '../utils/geometry';

interface ConfigurationChecklistProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  hasAllEdgeMeasurements: boolean;
  allDiagonalsEntered: boolean;
  shouldShowDiagonalInputSection: boolean;
  diagonalMeasurements: Array<{ key: string; label: string; hasValue: boolean }>;
  onNavigateToDimensions?: () => void;
  onNavigateToHeights?: () => void;
  highlightedMeasurement: string | null;
  setHighlightedMeasurement: (key: string | null) => void;
  updateMeasurement: (edgeKey: string, value: string) => void;
  geometryValidation?: { isValid: boolean; errors: string[] };
  friendlyErrors?: string[];
  isMobile?: boolean;
}

export interface ConfigurationChecklistRef {
  expandDiagonals: () => void;
  getDiagonalSectionElement: () => HTMLDivElement | null;
}

export const ConfigurationChecklist = forwardRef<ConfigurationChecklistRef, ConfigurationChecklistProps>((
  {
    config,
    hasAllEdgeMeasurements,
    allDiagonalsEntered,
    shouldShowDiagonalInputSection,
    diagonalMeasurements,
    onNavigateToDimensions,
    onNavigateToHeights,
    highlightedMeasurement,
    setHighlightedMeasurement,
    updateMeasurement,
    geometryValidation,
    friendlyErrors = [],
    isMobile = false,
  },
  ref
) => {
  const [diagonalsExpanded, setDiagonalsExpanded] = useState(!allDiagonalsEntered);
  const [validationExpanded, setValidationExpanded] = useState(false);
  const [isEditingDiagonals, setIsEditingDiagonals] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const diagonalSectionRef = useRef<HTMLDivElement>(null);
  const mobileDiagonalSectionRef = useRef<HTMLDivElement>(null);
  const firstEmptyInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    expandDiagonals: () => {
      if (isMobile) {
        // On mobile, just highlight the section since there's no expansion
        setIsHighlighted(true);
        setTimeout(() => {
          setIsHighlighted(false);
        }, 2400);
      } else {
        // On desktop, expand and focus
        setDiagonalsExpanded(true);
        setIsHighlighted(true);
        setTimeout(() => {
          setIsHighlighted(false);
        }, 2400);
        setTimeout(() => {
          if (firstEmptyInputRef.current) {
            firstEmptyInputRef.current.focus();
          }
        }, 800);
      }
    },
    getDiagonalSectionElement: () => isMobile ? mobileDiagonalSectionRef.current : diagonalSectionRef.current,
  }));

  const hasHeightInformation = config.corners !== 3 &&
    config.measurementOption === 'adjust' &&
    config.heightsProvidedByUser;

  const showHeightOptional = config.corners !== 3 &&
    config.measurementOption === 'adjust' &&
    !config.heightsProvidedByUser;

  const hasValidationIssues = geometryValidation &&
    !geometryValidation.isValid &&
    hasAllEdgeMeasurements &&
    allDiagonalsEntered &&
    friendlyErrors.length > 0;

  const allRequirementsMet = hasAllEdgeMeasurements &&
    (!shouldShowDiagonalInputSection || allDiagonalsEntered);

  if (allRequirementsMet && !showHeightOptional && !hasValidationIssues && !isEditingDiagonals) {
    // Mobile: Slim success indicator
    if (isMobile) {
      return (
        <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Configuration Complete
              </p>
              <p className="text-xs text-emerald-700">
                Review below and add to cart
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Desktop: No notice shown
    return null;
  }

  const remainingCount = [
    !hasAllEdgeMeasurements,
    shouldShowDiagonalInputSection && !allDiagonalsEntered,
  ].filter(Boolean).length;

  const completionPercentage = (() => {
    // Calculate total required items
    const total = shouldShowDiagonalInputSection ? 2 : 1;

    // Calculate completed items
    let completed = 0;

    // Count edge measurements if complete
    if (hasAllEdgeMeasurements) {
      completed++;
    }

    // Count diagonal measurements only if they're required AND complete
    if (shouldShowDiagonalInputSection && allDiagonalsEntered) {
      completed++;
    }

    return Math.round((completed / total) * 100);
  })();

  // Mobile: Compact progress bar design
  if (isMobile) {
    return (
      <div className="mb-4 bg-white border-2 border-emerald-700 rounded-lg overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-emerald-50 p-3 border-b border-emerald-600">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-emerald-900">
              {remainingCount > 0 ? `${remainingCount} ${remainingCount === 1 ? 'item' : 'items'} remaining` : 'Complete'}
            </p>
            <span className="text-xs font-medium text-emerald-800">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-emerald-200 rounded-full h-2">
            <div
              className="bg-emerald-700 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Compact Checklist Items */}
        <div className="p-3 space-y-2">
          {/* Edge Measurements */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              {hasAllEdgeMeasurements ? (
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              )}
              <span className={`text-xs font-medium ${hasAllEdgeMeasurements ? 'text-emerald-900' : 'text-slate-900'}`}>
                Edge measurements
              </span>
            </div>
            {!hasAllEdgeMeasurements && onNavigateToDimensions && (
              <button
                onClick={onNavigateToDimensions}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
              >
                Enter →
              </button>
            )}
          </div>

          {/* Diagonal Measurements - Mobile: No inline editing */}
          {shouldShowDiagonalInputSection && (
            <div
              ref={mobileDiagonalSectionRef}
              className={`flex items-center justify-between p-2 rounded transition-all duration-300 ${isHighlighted ? 'bg-red-100 ring-2 ring-red-400' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1">
                {allDiagonalsEntered ? (
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={`text-xs font-medium ${allDiagonalsEntered ? 'text-emerald-900' : 'text-slate-900'}`}>
                  Diagonal measurements
                </span>
              </div>
              {!allDiagonalsEntered && onNavigateToDimensions && (
                <button
                  onClick={onNavigateToDimensions}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  Enter →
                </button>
              )}
            </div>
          )}

          {/* Optional: Height Information */}
          {showHeightOptional && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <span className="text-xs font-medium text-blue-900">Heights (optional)</span>
                  <p className="text-xs text-blue-700">Standard process if not provided</p>
                </div>
              </div>
              {onNavigateToHeights && (
                <button
                  onClick={onNavigateToHeights}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  Add →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: Full card with inline editing
  return (
    <Card className="p-4 sm:p-6 mb-6 bg-emerald-50 border-2 border-emerald-700 transition-all duration-300">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-6 h-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-emerald-900">
            {remainingCount > 0
              ? `Complete Your Configuration (${remainingCount} ${remainingCount === 1 ? 'item' : 'items'} remaining)`
              : 'Configuration Checklist'
            }
          </h4>
          <p className="text-sm text-emerald-800 mt-1">
            Complete the following requirements to proceed with your order
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Edge Measurements */}
        <div className={`flex items-start gap-3 p-3 bg-white rounded-lg border transition-all duration-300 ${
          !hasAllEdgeMeasurements
            ? 'border-red-300 bg-red-50'
            : 'border-blue-200'
        }`}>
          <div className="flex-shrink-0 mt-0.5">
            {hasAllEdgeMeasurements ? (
              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${hasAllEdgeMeasurements ? 'text-emerald-900' : 'text-slate-900'}`}>
              Edge measurements {hasAllEdgeMeasurements ? 'entered' : 'required'}
            </p>
            {!hasAllEdgeMeasurements && onNavigateToDimensions && (
              <button
                onClick={onNavigateToDimensions}
                className="mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded bg-emerald-100 hover:bg-emerald-200 transition-colors"
              >
                Go Back to Enter Measurements →
              </button>
            )}
          </div>
        </div>

        {/* Diagonal Measurements - Desktop only inline editing */}
        {shouldShowDiagonalInputSection && (
          <div
            ref={diagonalSectionRef}
            className={`bg-white rounded-lg border-2 transition-all duration-300 ${
              isHighlighted
                ? 'border-red-500 ring-4 ring-red-300 shadow-xl pulse-error'
                : 'border-emerald-700'
            }`}
          >
            <div className="flex items-start gap-3 p-3">
              <div className="flex-shrink-0 mt-0.5">
                {allDiagonalsEntered ? (
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${allDiagonalsEntered ? 'text-emerald-900' : 'text-slate-900'}`}>
                    Diagonal measurements {allDiagonalsEntered ? 'complete' : 'required'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Tooltip content="Diagonal measurements ensure manufacturing accuracy and help our team create your exact shade shape with precision.">
                      <span className="text-emerald-700 hover:text-emerald-900 inline-flex items-center justify-center" role="button" tabIndex={0}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </Tooltip>
                    <button
                      onClick={() => setDiagonalsExpanded(!diagonalsExpanded)}
                      className="text-emerald-700 hover:text-emerald-900 font-medium text-sm bg-transparent border-0 p-0 cursor-pointer"
                    >
                      {diagonalsExpanded ? 'Collapse ▲' : 'Enter Diagonals ▼'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {diagonalsExpanded && (
              <div className="px-3 pb-3 pt-0 border-t border-emerald-200 mt-2">
                <div className={`rounded-lg p-3 mb-3 mt-3 transition-colors duration-300 ${
                  isHighlighted ? 'bg-red-100 border-2 border-red-400' : 'bg-emerald-50'
                }`}>
                  <p className={`text-xs font-semibold ${
                    isHighlighted ? 'text-red-900' : 'text-emerald-800'
                  }`}>
                    {isHighlighted ? '⚠️ Please enter all diagonal measurements below to proceed:' : 'Measure the straight-line distance between non-adjacent corners. Enter all measurements below.'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diagonalMeasurements.map((diagonal, index) => {
                    const isFirstEmpty = !diagonal.hasValue && diagonalMeasurements.slice(0, index).every(d => d.hasValue);
                    return (
                      <div key={diagonal.key}>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {diagonal.label}
                        </label>
                        <div className="relative">
                          <Input
                            ref={isFirstEmpty ? firstEmptyInputRef : undefined}
                            type="number"
                            value={config.measurements[diagonal.key]
                              ? Math.round(convertMmToUnit(config.measurements[diagonal.key], config.unit))
                              : ''}
                            onChange={(e) => updateMeasurement(diagonal.key, e.target.value)}
                            onFocus={() => {
                              setHighlightedMeasurement(diagonal.key);
                              setIsEditingDiagonals(true);
                            }}
                            onBlur={() => {
                              setHighlightedMeasurement(null);
                              setIsEditingDiagonals(false);
                            }}
                            placeholder={config.unit === 'imperial' ? '240' : '6000'}
                            min="100"
                            step={config.unit === 'imperial' ? '1' : '10'}
                            className={`${diagonal.hasValue ? 'pr-16' : 'pr-12'} ${diagonal.hasValue
                              ? '!border-emerald-500 !bg-emerald-50 !ring-2 !ring-emerald-200'
                              : isHighlighted && !diagonal.hasValue
                                ? '!border-red-400 !bg-red-50 !ring-2 !ring-red-200'
                                : 'border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500'
                            }`}
                            isSuccess={diagonal.hasValue}
                          />
                          <div className={`absolute ${diagonal.hasValue ? 'right-11' : 'right-3'} bottom-[15px] text-xs text-slate-500 pointer-events-none`}>
                            {config.unit === 'metric' ? 'mm' : 'in'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optional: Height Information */}
        {showHeightOptional && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-blue-900">
                  Height information (optional)
                </p>
                <p className="text-xs text-blue-700">
                  Not required - standard manufacturing process will be used
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Tooltip content="Providing anchor point heights allows for more precise manufacturing customized to your installation. Standard manufacturing will be used if heights are not provided.">
                    <span className="text-blue-600 hover:text-blue-800 inline-flex items-center justify-center" role="button" tabIndex={0}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </Tooltip>
                  {onNavigateToHeights && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNavigateToHeights}
                      className="text-xs py-1 px-3 border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                    >
                      Add Heights →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Issues */}
        {hasValidationIssues && (
          <div className="bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3 p-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-yellow-900">
                    Measurement review suggested
                  </p>
                  <button
                    onClick={() => setValidationExpanded(!validationExpanded)}
                    className="text-yellow-700 hover:text-yellow-900 font-medium text-sm bg-transparent border-0 p-0 cursor-pointer"
                  >
                    {validationExpanded ? 'Hide Details ▲' : 'Review Details ▼'}
                  </button>
                </div>
                {!validationExpanded && (
                  <p className="text-xs text-yellow-700 mt-1">
                    Some measurements may need verification. You can still complete your order.
                  </p>
                )}
              </div>
            </div>

            {validationExpanded && (
              <div className="px-3 pb-3 pt-0 border-t border-yellow-200 mt-2">
                <div className="space-y-2 mt-3">
                  {friendlyErrors.slice(0, 3).map((error, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-yellow-800">
                      <span className="text-yellow-600 font-bold">•</span>
                      <p>{error}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-emerald-800">
                      <strong>You can still proceed!</strong> Our team will verify all measurements before manufacturing and contact you if adjustments are needed.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});
