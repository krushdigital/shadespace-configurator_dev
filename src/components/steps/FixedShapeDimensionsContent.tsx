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
}

function generateFixedShapePoints(shape: FixedShapeType, measurements: { [key: string]: number }): { x: number; y: number }[] {
  const scale = 0.05;
  const cx = 300, cy = 300;

  switch (shape) {
    case 'triangle': {
      const edge = measurements['AB'] || 3000;
      const s = edge * scale;
      const h = (s * Math.sqrt(3)) / 2;
      return [
        { x: cx, y: cy - h * 0.6 },
        { x: cx + s / 2, y: cy + h * 0.4 },
        { x: cx - s / 2, y: cy + h * 0.4 },
      ];
    }
    case 'right-angle-triangle': {
      const a = (measurements['AB'] || 3000) * scale;
      const b = (measurements['BC'] || 3000) * scale;
      return [
        { x: cx - a / 2, y: cy + b / 3 },
        { x: cx - a / 2, y: cy - 2 * b / 3 },
        { x: cx + a / 2, y: cy + b / 3 },
      ];
    }
    case 'square': {
      const s = (measurements['AB'] || 3000) * scale;
      const half = s / 2;
      return [
        { x: cx - half, y: cy - half },
        { x: cx + half, y: cy - half },
        { x: cx + half, y: cy + half },
        { x: cx - half, y: cy + half },
      ];
    }
    case 'rectangle': {
      const w = (measurements['AB'] || 4000) * scale;
      const h = (measurements['BC'] || 3000) * scale;
      return [
        { x: cx - w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy + h / 2 },
        { x: cx - w / 2, y: cy + h / 2 },
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
      return { AB: edgeA, BC: edgeB, CA: Math.round(hypotenuse) };
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
  const edgeBMm = config.measurements['BC'] || 0;

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
      const points = generateFixedShapePoints(shape, newMeasurements);
      updateConfig({ measurements: newMeasurements, points });
    } else if (!config.points || config.points.length === 0) {
      const defaultPoints = generateFixedShapePoints(shape, {});
      updateConfig({ points: defaultPoints });
    }
  }, [shape]);

  const getEdgeALabel = () => {
    switch (shape) {
      case 'triangle': return 'Space Edge A → B → C (all equal)';
      case 'right-angle-triangle': return 'Space Edge A → B (base)';
      case 'square': return 'Space Edge A → B → C → D (all equal)';
      case 'rectangle': return 'Space Edge A → B (width)';
    }
  };

  const getEdgeBLabel = () => {
    switch (shape) {
      case 'right-angle-triangle': return 'Space Edge B → C (height)';
      case 'rectangle': return 'Space Edge B → C (depth)';
      default: return 'Space Edge B → C';
    }
  };

  const getCalculatedLabel = () => {
    if (shape === 'right-angle-triangle' && edgeAMm > 0 && edgeBMm > 0) {
      const hyp = Math.sqrt(edgeAMm * edgeAMm + edgeBMm * edgeBMm);
      return `Edge C → A (hypotenuse): ${formatMeasurement(hyp, unit)}`;
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

  return (
    <div className="p-4 sm:p-6">
      {/* Unit indicator bar - matching custom dimensions step */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#307C31] animate-pulse" />
          <span className="text-sm font-medium text-slate-700">
            Using {unit === 'imperial' ? 'Imperial (ft/in)' : 'Metric (mm)'}
          </span>
        </div>
        <button
          onClick={handleUnitChange}
          className="text-sm text-[#307C31] hover:text-[#01312D] font-medium underline decoration-dotted underline-offset-2 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Switch to {alternativeUnitName}
        </button>
      </div>

      {/* Info box - matching custom dimensions step */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
        <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h5 className="text-base font-bold text-blue-900 mb-1">
            Enter Your Desired Dimensions
          </h5>
          <p className="text-sm text-blue-800 leading-relaxed">
            Enter the measurements <strong>between your fixing points</strong>. We'll calculate the perfect sail size to fit your space, accounting for fabric stretch and tensioning hardware.
          </p>
        </div>
      </div>

      {/* Mobile-only shape preview (desktop uses sticky sidebar) */}
      {isMobile && (
        <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 mb-6" style={{ minHeight: 200 }}>
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
            />
          ) : (
            <Suspense fallback={<div className="w-full h-[200px] flex items-center justify-center text-gray-400 text-sm">Loading 3D...</div>}>
              <ShadeSail3DViewer
                points={config.points}
                fixingHeights={[]}
                measurements={config.measurements}
                corners={config.corners}
                unit={unit}
                fabricColor={config.fabricColor}
              />
            </Suspense>
          )}
        </div>
      )}

      {/* Measurement inputs - styled to match custom dimensions step */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{getEdgeALabel()}</label>
          {unit === 'imperial' ? (
            <DualImperialInput
              value={edgeADisplay}
              onChange={handleEdgeAChange}
              placeholder="Enter length"
              error={!!validationErrors['AB']}
            />
          ) : (
            <div className="relative">
              <input
                type="number"
                value={edgeADisplay > 0 ? edgeADisplay : ''}
                onChange={(e) => handleEdgeAChange(parseFloat(e.target.value) || 0)}
                placeholder="Enter length in mm"
                className={`w-full px-4 py-3 rounded-xl border-2 ${validationErrors['AB'] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-[#307C31]'} focus:ring-2 focus:ring-[#307C31]/20 focus:outline-none text-base transition-colors`}
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
                error={!!validationErrors['BC']}
              />
            ) : (
              <div className="relative">
                <input
                  type="number"
                  value={edgeBDisplay > 0 ? edgeBDisplay : ''}
                  onChange={(e) => handleEdgeBChange(parseFloat(e.target.value) || 0)}
                  placeholder="Enter length in mm"
                  className={`w-full px-4 py-3 rounded-xl border-2 ${validationErrors['BC'] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-[#307C31]'} focus:ring-2 focus:ring-[#307C31]/20 focus:outline-none text-base transition-colors`}
                />
                {edgeBMm > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    {formatSecondaryUnit(edgeBMm, unit)}
                  </span>
                )}
              </div>
            )}
            {validationErrors['BC'] && <p className="mt-1.5 text-xs text-red-600 font-medium">{validationErrors['BC']}</p>}
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
        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#307C31] hover:bg-[#BFF102]/5 text-sm text-slate-600 hover:text-[#01312D] transition-all duration-200"
      >
        <ArrowRight className="w-4 h-4" />
        {getCustomSwitchText()} <span className="font-semibold">Switch to Custom Shape</span>
      </button>

      {/* Live price preview */}
      {isComplete && calculations.totalPrice > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#F3FFE3] border border-[#307C31]/30 rounded-xl mt-6 transition-all duration-300 animate-[fadeIn_0.3s_ease-out]">
          <span className="text-sm font-medium text-[#01312D]">Estimated total</span>
          <span className="text-lg font-bold text-[#01312D]">{formatCurrency(calculations.totalPrice, config.currency)}</span>
        </div>
      )}

      {/* Navigation - matching custom dimensions step */}
      <div className="flex items-center justify-between pt-5 mt-6 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button variant="outline" onClick={onPrev} className="text-sm">
              Back
            </Button>
          )}
          {onSaveQuote && <SaveProgressButton onClick={onSaveQuote} />}
        </div>
        <Button
          onClick={onNext}
          disabled={!isComplete}
          className="text-sm"
        >
          Continue{nextStepTitle ? ` → ${nextStepTitle}` : ''}
        </Button>
      </div>
    </div>
  );
}
