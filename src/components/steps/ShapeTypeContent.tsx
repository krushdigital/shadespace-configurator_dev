import React from 'react';
import { ConfiguratorState, FixedShapeType } from '../../types';
import { generateFixedShapePoints } from './FixedShapeDimensionsContent';

import squareIcon from '../../assets/icons/square.svg';
import rectangleIcon from '../../assets/icons/rectangle.svg';
import triangleIcon from '../../assets/icons/triangle.svg';
import rightTriangleIcon from '../../assets/icons/right-triangle.svg';
import customCombinedIcon from '../../assets/icons/custom-combined.svg';

interface ShapeTypeContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  onNext?: () => void;
  onPrev?: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  onSaveQuote?: () => void;
}

const FIXED_SHAPES: { id: FixedShapeType; label: string; hint: string; corners: number; icon: string }[] = [
  { id: 'square', label: 'Square', hint: '1 measurement', corners: 4, icon: squareIcon },
  { id: 'rectangle', label: 'Rectangle', hint: '2 measurements', corners: 4, icon: rectangleIcon },
  { id: 'triangle', label: 'Triangle', hint: '1 measurement', corners: 3, icon: triangleIcon },
  { id: 'right-angle-triangle', label: 'Right Angle Triangle', hint: '2 measurements', corners: 3, icon: rightTriangleIcon },
];

export function ShapeTypeContent({
  config,
  updateConfig,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton,
  onSaveQuote,
}: ShapeTypeContentProps) {
  const selectedMode = config.shapeMode || null;
  const selectedFixedShape = config.fixedShapeType || null;
  const isCustomSelected = selectedMode === 'custom';

  const handleSelectCustom = () => {
    const switchingFromFixed = config.shapeMode === 'fixed';
    updateConfig({
      shapeMode: 'custom',
      fixedShapeType: null,
      measurementOption: 'adjust',
      ...(switchingFromFixed ? {
        measurements: {},
        points: [],
        fixingHeights: [],
        fixingTypes: undefined,
        eyeOrientations: undefined,
        heightsProvidedByUser: false,
        cornerHardware: {},
        hardwareSelectionMode: undefined,
        diagonalsInitiallyProvided: false,
      } : {}),
    });
  };

  const handleSelectFixedShape = (shape: FixedShapeType) => {
    const corners = FIXED_SHAPES.find(s => s.id === shape)!.corners;
    const shapeChanged = shape !== config.fixedShapeType;
    updateConfig({
      shapeMode: 'fixed',
      fixedShapeType: shape,
      corners,
      measurementOption: 'exact',
      ...(shapeChanged ? { measurements: {}, points: generateFixedShapePoints(shape, {}), cornerHardware: {}, hardwareSelectionMode: undefined } : {}),
    });
  };

  const isFixedSelected = (id: FixedShapeType) => selectedMode === 'fixed' && selectedFixedShape === id;

  const flowTitle = isCustomSelected ? 'Custom sail flow' : 'Fixed shape flow';
  const flowDesc = isCustomSelected
    ? 'Plot 3\u20138 fixing points, then measure every edge and diagonal. Covered by the Fit Guarantee.'
    : 'Standard geometric shape \u2014 only 1\u20132 measurements needed.';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 desktop:grid-cols-5 gap-3">
        {FIXED_SHAPES.map(shape => {
          const selected = isFixedSelected(shape.id);
          return (
            <button
              key={shape.id}
              onClick={() => handleSelectFixedShape(shape.id)}
              className={`relative cursor-pointer rounded-card p-5 pb-4 flex flex-col items-center gap-3 text-center transition-all duration-200 min-h-[44px] ${
                selected
                  ? 'bg-[#fbfdfb] border-[3px] border-brand-mid'
                  : 'bg-[#fbfdfb] border-2 border-border-card hover:border-[#7bb08f]'
              }`}
            >
              {selected && (
                <div className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-brand-mid text-white text-[13px] font-bold flex items-center justify-center">
                  &#10003;
                </div>
              )}
              <img src={shape.icon} alt={`${shape.label} sail`} className="w-[82px] h-[82px]" />
              <div>
                <div className="font-bold text-[15px] text-brand-green">{shape.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{shape.hint}</div>
              </div>
            </button>
          );
        })}

        {/* Custom shape - dashed border */}
        <button
          onClick={handleSelectCustom}
          className={`relative cursor-pointer rounded-card p-5 pb-4 flex flex-col items-center gap-3 text-center transition-all duration-200 min-h-[44px] ${
            isCustomSelected
              ? 'bg-[#f2f8f3] border-[3px] border-brand-mid'
              : 'bg-[#f2f8f3] border-2 border-dashed border-[#7bb08f] hover:border-brand-mid'
          }`}
        >
          {isCustomSelected && (
            <div className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-brand-mid text-white text-[13px] font-bold flex items-center justify-center">
              &#10003;
            </div>
          )}
          <img src={customCombinedIcon} alt="Custom shape sail" className="w-[82px] h-[82px]" />
          <div>
            <div className="font-bold text-[15px] text-brand-green">Custom Shape</div>
            <div className="text-xs text-text-muted mt-0.5">3&ndash;8 fixing points</div>
          </div>
        </button>
      </div>

      {/* Flow hint banner */}
      {(selectedMode === 'fixed' || selectedMode === 'custom') && (
        <div className="flex items-center gap-2.5 bg-surface-soft rounded-xl px-4 py-3 text-sm text-[#23503f]">
          <span className="text-base">&rarr;</span>
          <span><strong>{flowTitle}</strong> &nbsp;{flowDesc}</span>
        </div>
      )}
    </div>
  );
}
