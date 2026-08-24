import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ConfiguratorState, ShadeCalculations, FixedShapeType } from '../../types';
import { Button } from '../ui/Button';
import { DualImperialInput } from '../ui/DualImperialInput';
import { ShapeCanvas } from '../ShapeCanvas';
import { convertMmToUnit, convertUnitToMm, formatMeasurement } from '../../utils/geometry';
import { SaveProgressButton } from '../SaveProgressButton';
import { ArrowRight, Info } from 'lucide-react';
import {
  getAlternativeUnit,
  getAlternativeUnitName,
  setStoredUnitPreference
} from '../../utils/unitAutoSelection';
import { analytics } from '../../utils/analytics';
import { getUserCurrencyInfo } from '../../utils/currencyFormatter';
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
  const shape = config.fixedShapeType!;
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

  // Recompute points when shape changes
  useEffect(() => {
    if (edgeAMm > 0) {
      const newMeasurements = computeFixedShapeMeasurements(shape, edgeAMm, edgeBMm || edgeAMm);
      const points = generateFixedShapePoints(shape, newMeasurements);
      updateConfig({ measurements: newMeasurements, points });
    }
  }, [shape]);

  const getEdgeALabel = () => {
    switch (shape) {
      case 'triangle': return 'Edge Length';
      case 'right-angle-triangle': return 'Edge A (base)';
      case 'square': return 'Edge Length';
      case 'rectangle': return 'Edge A (width)';
    }
  };

  const getEdgeBLabel = () => {
    switch (shape) {
      case 'right-angle-triangle': return 'Edge B (height)';
      case 'rectangle': return 'Edge B (depth)';
      default: return 'Edge B';
    }
  };

  const getCalculatedLabel = () => {
    if (shape === 'right-angle-triangle' && edgeAMm > 0 && edgeBMm > 0) {
      const hyp = Math.sqrt(edgeAMm * edgeAMm + edgeBMm * edgeBMm);
      return `Edge C (hypotenuse): ${formatMeasurement(hyp, unit)}`;
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
    <div className="p-6 space-y-6">
      {/* Unit toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Dimensions
        </h3>
        <button
          onClick={handleUnitChange}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
        >
          Switch to {alternativeUnitName}
        </button>
      </div>

      {/* Shape preview */}
      <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50" style={{ minHeight: 220 }}>
        {show3D && (
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <button
              onClick={() => setViewMode('plan')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'plan' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border'}`}
            >Plan</button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2 py-1 text-xs rounded ${viewMode === '3d' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border'}`}
            >3D</button>
          </div>
        )}
        {viewMode === 'plan' || !show3D ? (
          <ShapeCanvas
            points={config.points}
            corners={config.corners}
            measurements={config.measurements}
            unit={unit}
            interactive={false}
            width={isMobile ? 320 : 440}
            height={220}
          />
        ) : (
          <Suspense fallback={<div className="w-full h-[220px] flex items-center justify-center text-gray-400 text-sm">Loading 3D...</div>}>
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

      {/* Measurement inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{getEdgeALabel()}</label>
          {unit === 'imperial' ? (
            <DualImperialInput
              value={edgeADisplay}
              onChange={handleEdgeAChange}
              placeholder="Enter length"
              error={!!validationErrors['AB']}
            />
          ) : (
            <input
              type="number"
              value={edgeADisplay > 0 ? edgeADisplay : ''}
              onChange={(e) => handleEdgeAChange(parseFloat(e.target.value) || 0)}
              placeholder="Enter length in mm"
              className={`w-full px-3 py-2.5 rounded-lg border ${validationErrors['AB'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm`}
            />
          )}
          {validationErrors['AB'] && <p className="mt-1 text-xs text-red-600">{validationErrors['AB']}</p>}
        </div>

        {needsTwoInputs && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{getEdgeBLabel()}</label>
            {unit === 'imperial' ? (
              <DualImperialInput
                value={edgeBDisplay}
                onChange={handleEdgeBChange}
                placeholder="Enter length"
                error={!!validationErrors['BC']}
              />
            ) : (
              <input
                type="number"
                value={edgeBDisplay > 0 ? edgeBDisplay : ''}
                onChange={(e) => handleEdgeBChange(parseFloat(e.target.value) || 0)}
                placeholder="Enter length in mm"
                className={`w-full px-3 py-2.5 rounded-lg border ${validationErrors['BC'] ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm`}
              />
            )}
            {validationErrors['BC'] && <p className="mt-1 text-xs text-red-600">{validationErrors['BC']}</p>}
          </div>
        )}

        {/* Auto-calculated edge */}
        {getCalculatedLabel() && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-blue-800">{getCalculatedLabel()}</span>
          </div>
        )}
      </div>

      {/* Switch to custom shape */}
      <button
        onClick={onSwitchToCustom}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 text-sm text-gray-600 hover:text-emerald-700 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        {getCustomSwitchText()} <span className="font-medium">Switch to Custom Shape</span>
      </button>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button variant="outline" onClick={onPrev} className="text-sm">
              Back
            </Button>
          )}
          <SaveProgressButton onSaveQuote={onSaveQuote} />
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
