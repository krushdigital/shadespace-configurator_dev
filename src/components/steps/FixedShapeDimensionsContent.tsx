import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ConfiguratorState, ShadeCalculations, FixedShapeType } from '../../types';
import { Button } from '../ui/Button';
import { DualImperialInput } from '../ui/DualImperialInput';
import { ShapeCanvas } from '../ShapeCanvas';
import { convertMmToUnit, convertUnitToMm, formatMeasurement, formatSecondaryUnit } from '../../utils/geometry';
import { SaveProgressButton } from '../SaveProgressButton';
import { ArrowRight, Info, RefreshCw } from 'lucide-react';
import {
  getAlternativeUnit,
  getAlternativeUnitName,
  setStoredUnitPreference
} from '../../utils/unitAutoSelection';
import { analytics } from '../../utils/analytics';
import { getUserCurrencyInfo, formatCurrency } from '../../utils/currencyFormatter';
import { supports3DForCorners } from '../../utils/canRender3D';

const ShadeSail3DViewer = lazy(() => import('../ShadeSail3DViewer'));

interface FixedShapeDimensionsContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors?: { [key: string]: string };
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  onSaveQuote?: () => void;
  onSwitchToCustom?: () => void;
  isMobile?: boolean;
  device3DTier?: 'high' | 'low' | 'none';
  setHighlightedMeasurement?: (measurement: string | null) => void;
  highlightedMeasurement?: string | null;
}

function generateFixedShapePoints(shape: FixedShapeType, measurements: { [key: string]: number }): { x: number; y: number }[] {
  const cx = 300, cy = 300;
  const maxSpan = 400;

  switch (shape) {
    case 'triangle': {
      const edge = measurements['AB'] || 3000;
      const s = edge;
      const h = (s * Math.sqrt(3)) / 2;
      const scale = maxSpan / Math.max(s, h);
      const sw = s * scale;
      const sh = h * scale;
      return [
        { x: cx, y: cy - sh * 0.6 },
        { x: cx + sw / 2, y: cy + sh * 0.4 },
        { x: cx - sw / 2, y: cy + sh * 0.4 },
      ];
    }
    case 'right-angle-triangle': {
      const a = measurements['AB'] || 3000;
      const b = measurements['CA'] || 3000;
      const scale = maxSpan / Math.max(a, b);
      const sw = a * scale;
      const sh = b * scale;
      return [
        { x: cx - sw / 2, y: cy + sh / 2 },
        { x: cx - sw / 2, y: cy - sh / 2 },
        { x: cx + sw / 2, y: cy + sh / 2 },
      ];
    }
    case 'square': {
      const s = (measurements['AB'] || 3000);
      const scale = maxSpan / s;
      const half = (s * scale) / 2;
      return [
        { x: cx - half, y: cy - half },
        { x: cx + half, y: cy - half },
        { x: cx + half, y: cy + half },
        { x: cx - half, y: cy + half },
      ];
    }
    case 'rectangle': {
      const w = measurements['AB'] || 4000;
      const h = measurements['BC'] || 3000;
      const scale = maxSpan / Math.max(w, h);
      const sw = w * scale;
      const sh = h * scale;
      return [
        { x: cx - sw / 2, y: cy - sh / 2 },
        { x: cx + sw / 2, y: cy - sh / 2 },
        { x: cx + sw / 2, y: cy + sh / 2 },
        { x: cx - sw / 2, y: cy + sh / 2 },
      ];
    }
  }
}

function computeFixedShapeMeasurements(shape: FixedShapeType, edgeA: number, edgeB: number): { [key: string]: number } {
  switch (shape) {
    case 'triangle':
      return { AB: edgeA, BC: edgeA, CA: edgeA };
    case 'right-angle-triangle': {
      const hypotenuse = Math.sqrt(edgeA * edgeA + edgeB * edgeB);
      return { AB: edgeA, BC: Math.round(hypotenuse), CA: edgeB };
    }
    case 'square':
      return { AB: edgeA, BC: edgeA, CD: edgeA, DA: edgeA };
    case 'rectangle':
      return { AB: edgeA, BC: edgeB, CD: edgeA, DA: edgeB };
  }
}

export function FixedShapeDimensionsContent({
  config,
  updateConfig,
  calculations,
  validationErrors = {},
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton,
  onSaveQuote,
  onSwitchToCustom,
  isMobile,
  device3DTier,
  setHighlightedMeasurement,
  highlightedMeasurement,
}: FixedShapeDimensionsContentProps) {
  const shape = config.fixedShapeType;
  if (!shape) return null;
  const unit = config.unit || 'metric';
  const [viewMode, setViewMode] = useState<'plan' | '3d'>('plan');

  const currencyInfo = getUserCurrencyInfo();
  const alternativeUnitName = getAlternativeUnitName(unit);

  const handleUnitChange = () => {
    const newUnit = getAlternativeUnit(unit);
    analytics.unitManuallyChanged(unit, newUnit, currencyInfo.currency, false);
    setStoredUnitPreference(newUnit, currencyInfo.currency, true);
    updateConfig({ unit: newUnit });
  };

  const needsTwoInputs = shape === 'right-angle-triangle' || shape === 'rectangle';

  const edgeAMm = config.measurements['AB'] || 0;
  const edgeBMm = shape === 'right-angle-triangle' ? (config.measurements['CA'] || 0) : (config.measurements['BC'] || 0);

  const edgeADisplay = edgeAMm > 0 ? convertMmToUnit(edgeAMm, unit) : 0;
  const edgeBDisplay = edgeBMm > 0 ? convertMmToUnit(edgeBMm, unit) : 0;

  const handleEdgeAChange = useCallback((value: number) => {
    const mm = Math.round(convertUnitToMm(value, unit));
    if (mm <= 0) return;
    const newMeasurements = computeFixedShapeMeasurements(shape, mm, edgeBMm || mm);
    const points = generateFixedShapePoints(shape, newMeasurements);
    updateConfig({ measurements: newMeasurements, points });
  }, [shape, unit, edgeBMm, updateConfig]);

  const handleEdgeBChange = useCallback((value: number) => {
    const mm = Math.round(convertUnitToMm(value, unit));
    if (mm <= 0) return;
    const newMeasurements = computeFixedShapeMeasurements(shape, edgeAMm || mm, mm);
    const points = generateFixedShapePoints(shape, newMeasurements);
    updateConfig({ measurements: newMeasurements, points });
  }, [shape, unit, edgeAMm, updateConfig]);

  useEffect(() => {
    if (edgeAMm > 0) {
      const newMeasurements = computeFixedShapeMeasurements(shape, edgeAMm, edgeBMm || edgeAMm);
      if (shape === 'rectangle' && edgeAMm > 0 && edgeBMm > 0) {
        const points = generateFixedShapePoints(shape, newMeasurements);
        updateConfig({ measurements: newMeasurements, points });
      } else {
        const defaultPoints = generateFixedShapePoints(shape, {});
        updateConfig({ measurements: newMeasurements, points: defaultPoints });
      }
    } else if (!config.points || config.points.length === 0) {
      const defaultPoints = generateFixedShapePoints(shape, {});
      updateConfig({ points: defaultPoints });
    }
  }, [shape]);

  const getEdgeALabel = () => {
    switch (shape) {
      case 'triangle': return 'Sail Edge A → B → C (all equal)';
      case 'right-angle-triangle': return 'Sail Edge A → B (base)';
      case 'square': return 'Sail Edge A → B → C → D (all equal)';
      case 'rectangle': return 'Sail Edge A → B (width)';
    }
  };

  const getEdgeBLabel = () => {
    switch (shape) {
      case 'right-angle-triangle': return 'Sail Edge A → C (height)';
      case 'rectangle': return 'Sail Edge B → C (depth)';
      default: return 'Sail Edge B → C';
    }
  };

  const getCalculatedLabel = () => {
    if (shape === 'right-angle-triangle' && edgeAMm > 0 && edgeBMm > 0) {
      const hyp = Math.sqrt(edgeAMm * edgeAMm + edgeBMm * edgeBMm);
      return `Edge B → C (hypotenuse): ${formatMeasurement(hyp, unit)}`;
    }
    return null;
  };

  const getCustomSwitchText = () => {
    switch (shape) {
      case 'triangle':
      case 'right-angle-triangle':
        return 'Need a different shape triangle?';
      case 'square':
        return 'Not perfectly square, or need varying heights?';
      case 'rectangle':
        return 'Not perfectly rectangular, or need varying heights?';
    }
  };

  const isComplete = needsTwoInputs ? (edgeAMm > 0 && edgeBMm > 0) : edgeAMm > 0;

  const show3D = device3DTier !== 'none' && supports3DForCorners(config.corners);

  const sailPrice = calculations.totalPrice - (calculations.hardwareBreakdown?.hardwareOnlyLivePrice || 0);

  return (
    <div className="p-4 sm:p-6">
      {/* Unit indicator bar - matching custom dimensions step */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2e7d4f] animate-pulse" />
          <span className="text-sm font-medium text-slate-700">
            Using {unit === 'imperial' ? 'Imperial (ft/in)' : 'Metric (mm)'}
          </span>
        </div>
        <button
          onClick={handleUnitChange}
          className="text-sm text-[#2e7d4f] hover:text-[#01312D] font-medium underline decoration-dotted underline-offset-2 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Switch to {alternativeUnitName}
        </button>
      </div>

      {/* Info box */}
      <div className="flex gap-3 p-3 sm:p-4 bg-blue-50 border border-blue-100 rounded-xl mb-4 sm:mb-6">
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h5 className="text-sm sm:text-base font-bold text-blue-900 sm:mb-1">
            Enter Your Desired Sail Dimensions
          </h5>
          <p className="hidden sm:block text-sm text-blue-800 leading-relaxed">
            Enter the <strong>finished sail measurements</strong>. These are the actual dimensions of the shade sail itself, not the distance between your fixing points.
          </p>
          <p className="sm:hidden text-xs text-blue-800">
            The finished sail size, not fixing point distance.
          </p>
        </div>
      </div>

      {/* Mobile-only shape preview (desktop uses sticky sidebar) */}
      {isMobile && (
        <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 mb-6 h-[350px]">
          {show3D && (
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <button
                onClick={() => setViewMode('plan')}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg min-h-[44px] ${viewMode === 'plan' ? 'bg-[#01312D] text-white' : 'bg-white text-gray-600 border'}`}
              >Plan</button>
              <button
                onClick={() => setViewMode('3d')}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg min-h-[44px] ${viewMode === '3d' ? 'bg-[#01312D] text-white' : 'bg-white text-gray-600 border'}`}
              >3D</button>
            </div>
          )}
          {viewMode === 'plan' || !show3D ? (
            <ShapeCanvas
              config={config}
              updateConfig={updateConfig}
              readonly={true}
              unit={unit}
              isMobile={isMobile}
              measurementOption="exact"
              highlightedMeasurement={highlightedMeasurement}
            />
          ) : (
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Loading 3D...</div>}>
              <ShadeSail3DViewer
                config={config}
                highlightedMeasurement={highlightedMeasurement}
                activeSection="dimensions"
              />
            </Suspense>
          )}
        </div>
      )}

      {/* Measurement inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{getEdgeALabel()}</label>
          {unit === 'imperial' ? (
            <DualImperialInput
              value={edgeADisplay}
              onChange={handleEdgeAChange}
              placeholder="Enter length"
              error={!!validationErrors['AB']}
              onFocus={() => setHighlightedMeasurement?.('AB')}
              onBlur={() => setHighlightedMeasurement?.(null)}
            />
          ) : (
            <div className="relative">
              <input
                type="number"
                value={edgeADisplay > 0 ? edgeADisplay : ''}
                onChange={(e) => handleEdgeAChange(parseFloat(e.target.value) || 0)}
                onFocus={() => setHighlightedMeasurement?.('AB')}
                onBlur={() => setHighlightedMeasurement?.(null)}
                placeholder="Enter length in mm"
                className={`w-full px-4 py-3 rounded-xl border-2 ${validationErrors['AB'] ? 'border-red-400 bg-red-50' : 'border-[#dfe7e1] focus:border-[#2e7d4f]'} focus:ring-2 focus:ring-[#2e7d4f]/20 focus:outline-none text-base transition-colors`}
              />
              {edgeAMm > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  {formatSecondaryUnit(edgeAMm, unit)}
                </span>
              )}
            </div>
          )}
          {validationErrors['AB'] && <p className="mt-1.5 text-xs text-red-600 font-medium">{validationErrors['AB']}</p>}
        </div>

        {needsTwoInputs && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{getEdgeBLabel()}</label>
            {unit === 'imperial' ? (
              <DualImperialInput
                value={edgeBDisplay}
                onChange={handleEdgeBChange}
                placeholder="Enter length"
                error={!!(shape === 'right-angle-triangle' ? validationErrors['CA'] : validationErrors['BC'])}
                onFocus={() => setHighlightedMeasurement?.(shape === 'right-angle-triangle' ? 'CA' : 'BC')}
                onBlur={() => setHighlightedMeasurement?.(null)}
              />
            ) : (
              <div className="relative">
                <input
                  type="number"
                  value={edgeBDisplay > 0 ? edgeBDisplay : ''}
                  onChange={(e) => handleEdgeBChange(parseFloat(e.target.value) || 0)}
                  onFocus={() => setHighlightedMeasurement?.(shape === 'right-angle-triangle' ? 'CA' : 'BC')}
                  onBlur={() => setHighlightedMeasurement?.(null)}
                  placeholder="Enter length in mm"
                  className={`w-full px-4 py-3 rounded-xl border-2 ${(shape === 'right-angle-triangle' ? validationErrors['CA'] : validationErrors['BC']) ? 'border-red-400 bg-red-50' : 'border-[#dfe7e1] focus:border-[#2e7d4f]'} focus:ring-2 focus:ring-[#2e7d4f]/20 focus:outline-none text-base transition-colors`}
                />
                {edgeBMm > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    {formatSecondaryUnit(edgeBMm, unit)}
                  </span>
                )}
              </div>
            )}
            {(shape === 'right-angle-triangle' ? validationErrors['CA'] : validationErrors['BC']) && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">
                {shape === 'right-angle-triangle' ? validationErrors['CA'] : validationErrors['BC']}
              </p>
            )}
          </div>
        )}

        {/* Auto-calculated edge */}
        {getCalculatedLabel() && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <Info className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium text-emerald-800">{getCalculatedLabel()}</span>
          </div>
        )}
      </div>

      {/* Switch to custom shape */}
      <button
        onClick={onSwitchToCustom}
        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[#dfe7e1] hover:border-[#2e7d4f] hover:bg-[#eef5ef] text-sm text-[#6b8478] hover:text-[#01312D] transition-all duration-200"
      >
        <ArrowRight className="w-4 h-4" />
        {getCustomSwitchText()} <span className="font-semibold">Switch to Custom Shape</span>
      </button>

      {/* Live price preview - sail only (hardware shown on next step) */}
      {isComplete && sailPrice > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#eef5ef] border border-[#2e7d4f]/30 rounded-xl mt-6 transition-all duration-300 animate-[fadeIn_0.3s_ease-out]">
          <span className="text-sm font-medium text-[#01312D]">Sail price estimate</span>
          <span className="text-lg font-bold text-[#01312D]">{formatCurrency(sailPrice, config.currency)}</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-3 pt-5 mt-6 border-t border-[#dfe7e1]">
        {(showBackButton || onSaveQuote) && (
          <div className="grid grid-cols-2 gap-2">
            {showBackButton && (
              <Button variant="outline" onClick={onPrev} className="text-sm w-full">
                Back
              </Button>
            )}
            {onSaveQuote && (
              <SaveProgressButton onClick={onSaveQuote} className="w-full" />
            )}
          </div>
        )}
        <Button
          onClick={onNext}
          disabled={!isComplete}
          className="text-sm w-full"
        >
          Continue{nextStepTitle ? ` → ${nextStepTitle}` : ''}
        </Button>
      </div>
    </div>
  );
}
