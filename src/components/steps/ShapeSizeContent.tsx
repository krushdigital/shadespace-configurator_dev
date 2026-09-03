import React, { useState, useEffect } from 'react';
import { ConfiguratorState, FixedShapeType } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SaveProgressButton } from '../SaveProgressButton';
import { Triangle, Square, Pentagon, Hexagon, Octagon } from 'lucide-react';
import { generateFixedShapePoints } from './FixedShapeDimensionsContent';

interface ShapeSizeContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: { [key: string]: string };
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  isStepOpen?: boolean;
  onSaveQuote?: () => void;
  mobileGuidance?: {
    isGuidanceActive: boolean;
    currentHighlightTarget: string | null;
    scrollToElement: (elementId: string, delay?: number, offset?: number) => void;
    setHighlightTarget: (targetId: string | null, duration?: number) => void;
    clearHighlight: () => void;
  };
}

const CORNER_OPTIONS = [
  { corners: 3, label: '3 Fixing Points', icon: Triangle, description: 'Classic triangular shade' },
  { corners: 4, label: '4 Fixing Points', icon: Square, description: 'Most popular choice' },
  { corners: 5, label: '5 Fixing Points', icon: Pentagon, description: 'Unique five-sided design' },
  { corners: 6, label: '6 Fixing Points', icon: Hexagon, description: 'Modern hexagonal shape' },
  { corners: 7, label: '7 Fixing Points', icon: Hexagon, description: 'Extended multi-point design' },
  { corners: 8, label: '8 Fixing Points', icon: Octagon, description: 'Maximum coverage layout' },
];

interface ShapeTile {
  id: FixedShapeType | 'custom';
  label: string;
  hint: string;
  corners?: number;
}

const SHAPE_TILES: ShapeTile[] = [
  { id: 'square', label: 'Square', hint: '1 measurement', corners: 4 },
  { id: 'rectangle', label: 'Rectangle', hint: '2 measurements', corners: 4 },
  { id: 'triangle', label: 'Triangle', hint: '1 measurement', corners: 3 },
  { id: 'right-angle-triangle', label: 'Right Angle Triangle', hint: '2 measurements', corners: 3 },
  { id: 'custom', label: 'Custom Shape', hint: '3\u20138 fixing points' },
];

function ShapeTileIcon({ shapeId, className }: { shapeId: string; className?: string }) {
  const cls = className || 'w-[72px] h-[72px]';
  switch (shapeId) {
    case 'square':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12,12 Q50,22 88,12 Q78,50 88,88 Q50,78 12,88 Q22,50 12,12 Z" fill="#E7F2EA" stroke="#01312d" strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="88" cy="12" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="88" cy="88" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="12" cy="88" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
        </svg>
      );
    case 'rectangle':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6,28 Q50,37 94,28 Q88,50 94,72 Q50,63 6,72 Q12,50 6,28 Z" fill="#E7F2EA" stroke="#01312d" strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="6" cy="28" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="94" cy="28" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="94" cy="72" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="6" cy="72" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
        </svg>
      );
    case 'triangle':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50,10 Q63.8,52 93,85 Q50,76 7,85 Q36.2,52 50,10 Z" fill="#E7F2EA" stroke="#01312d" strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="50" cy="10" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="93" cy="85" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="7" cy="85" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
        </svg>
      );
    case 'right-angle-triangle':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18,12 Q46.9,56.6 88,88 Q49.6,80.7 18,88 Q25,53.8 18,12 Z" fill="#E7F2EA" stroke="#01312d" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M28,88 V79 H18" fill="none" stroke="#01312d" strokeWidth="2.5" />
          <circle cx="18" cy="12" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="18" cy="88" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="88" cy="88" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
        </svg>
      );
    case 'custom':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="14" y1="40" x2="14" y2="92" stroke="#01312d" strokeWidth="3" />
          <line x1="44" y1="16" x2="44" y2="88" stroke="#01312d" strokeWidth="3" />
          <line x1="88" y1="30" x2="88" y2="90" stroke="#01312d" strokeWidth="3" />
          <line x1="64" y1="58" x2="64" y2="94" stroke="#01312d" strokeWidth="3" />
          <path d="M14,40 Q30,32 44,16 Q68,28 88,30 Q74,42 64,58 Q38,54 14,40 Z" fill="#E7F2EA" stroke="#01312d" strokeWidth="3.5" strokeLinejoin="round" strokeDasharray="7 5" />
          <circle cx="14" cy="40" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="44" cy="16" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="88" cy="30" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
          <circle cx="64" cy="58" r="5" fill="#fff" stroke="#01312d" strokeWidth="3" />
        </svg>
      );
    default:
      return null;
  }
}

function generateRegularPoints(corners: number) {
  const centerX = 300;
  const centerY = 300;
  const radius = 160;
  const points: { x: number; y: number }[] = [];

  if (corners === 5) {
    return [
      { x: 156, y: 180 }, { x: 300, y: 140 }, { x: 444, y: 180 },
      { x: 420, y: 420 }, { x: 180, y: 420 },
    ];
  }
  if (corners === 6) {
    return [
      { x: 156, y: 156 }, { x: 300, y: 140 }, { x: 444, y: 156 },
      { x: 444, y: 444 }, { x: 300, y: 460 }, { x: 156, y: 444 },
    ];
  }
  if (corners === 7) {
    return [
      { x: 156, y: 170 }, { x: 300, y: 140 }, { x: 444, y: 170 },
      { x: 460, y: 310 }, { x: 400, y: 440 }, { x: 200, y: 440 }, { x: 140, y: 310 },
    ];
  }
  if (corners === 8) {
    return [
      { x: 180, y: 150 }, { x: 300, y: 140 }, { x: 420, y: 150 },
      { x: 460, y: 270 }, { x: 460, y: 390 }, { x: 370, y: 460 },
      { x: 230, y: 460 }, { x: 140, y: 350 },
    ];
  }

  const startAngle = -3 * Math.PI / 4;
  for (let i = 0; i < corners; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / corners;
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  return points;
}

export function ShapeSizeContent({
  config,
  updateConfig,
  validationErrors = {},
  onNext,
  onPrev,
  nextStepTitle = '',
  showBackButton = false,
  isStepOpen = true,
  onSaveQuote,
  mobileGuidance,
}: ShapeSizeContentProps) {
  const [tileError, setTileError] = useState(false);

  // Determine current selection from config
  const selectedTileId: string | null =
    config.shapeMode === 'fixed' && config.fixedShapeType
      ? config.fixedShapeType
      : config.shapeMode === 'custom'
      ? 'custom'
      : null;

  const isCustomSelected = selectedTileId === 'custom';
  const isFixedSelected = selectedTileId !== null && !isCustomSelected;

  // Determine if step is complete enough to continue
  const isComplete =
    (isCustomSelected && config.corners >= 3) || isFixedSelected;

  // Mobile guidance: scroll to continue when sub-selection is complete
  useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && isComplete) {
      mobileGuidance.scrollToElement('continue-button-shape-size', 400);
      mobileGuidance.setHighlightTarget('continue-button-shape-size');
    }
  }, [isComplete, mobileGuidance?.isGuidanceActive]);

  const handleSelectTile = (tile: ShapeTile) => {
    setTileError(false);
    if (tile.id === 'custom') {
      updateConfig({
        shapeMode: 'custom',
        fixedShapeType: null,
        measurementOption: 'adjust',
        hardwareSelectionMode: 'standard',
      });
      mobileGuidance?.scrollToElement('fixing-points-section', 300);
    } else {
      const shapeChanged = tile.id !== config.fixedShapeType;
      updateConfig({
        shapeMode: 'fixed',
        fixedShapeType: tile.id as FixedShapeType,
        corners: tile.corners!,
        measurementOption: 'exact',
        hardwareSelectionMode: 'none',
        ...(shapeChanged ? { measurements: {}, points: generateFixedShapePoints(tile.id as FixedShapeType, {}) } : {}),
      });
      mobileGuidance?.scrollToElement('continue-button-shape-size', 300);
    }
  };

  const handleCornerChange = (corners: number) => {
    const points = generateRegularPoints(corners);
    const newHeights = Array(corners).fill(undefined);
    const newTypes = Array(corners).fill('');
    const newOrientations = Array(corners).fill('');
    const newAttachmentTypes = Array(corners).fill('');

    updateConfig({
      corners,
      points,
      measurements: {},
      fixingHeights: newHeights,
      fixingTypes: newTypes,
      eyeOrientations: newOrientations,
      attachmentTypes: newAttachmentTypes,
      fixingPointsInstalled: undefined,
      diagonalsInitiallyProvided: undefined,
      heightsProvidedByUser: undefined,
      hasManuallyAdjustedShape: false,
    });
  };

  const handleContinue = () => {
    if (!selectedTileId) {
      setTileError(true);
      return;
    }
    if (isCustomSelected && !config.corners) {
      return;
    }
    mobileGuidance?.clearHighlight();
    onNext();
  };

  // Flow hint text
  const flowTitle = isCustomSelected ? 'Custom sail flow' : 'Fixed shape flow';
  const flowDesc = isCustomSelected
    ? 'Plot 3\u20138 fixing points, then measure every edge and diagonal. Covered by the Fit Guarantee.'
    : 'Standard geometric shape \u2014 only 1\u20132 measurements needed.';

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Shape Tile Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-3.5" role="radiogroup" aria-label="Sail shape">
        {SHAPE_TILES.map((tile) => {
          const isSelected = selectedTileId === tile.id;
          const isCustomTile = tile.id === 'custom';
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleSelectTile(tile)}
              aria-checked={isSelected}
              role="radio"
              className={`
                relative cursor-pointer rounded-2xl px-3 py-5 sm:px-3 sm:py-5
                flex flex-col items-center gap-3 text-center
                transition-all duration-200
                ${isCustomTile
                  ? 'bg-[#f2f8f3] border-2 border-dashed col-span-2 sm:col-span-1'
                  : 'bg-[#fbfdfb] border-2 border-solid'
                }
                ${isSelected
                  ? 'border-[#2e7d4f] shadow-[inset_0_0_0_1px_#2e7d4f]'
                  : tileError
                  ? 'border-red-400 hover:border-red-500'
                  : isCustomTile
                  ? 'border-[#7bb08f] hover:border-[#2e7d4f]'
                  : 'border-[#dfe7e1] hover:border-[#7bb08f]'
                }
              `}
            >
              {/* Checkmark badge */}
              {isSelected && (
                <span className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-[#2e7d4f] text-white text-[13px] font-bold flex items-center justify-center">
                  &#10003;
                </span>
              )}
              <ShapeTileIcon shapeId={tile.id} className="w-[72px] h-[72px] sm:w-[82px] sm:h-[82px]" />
              <span className="font-bold text-[15px] text-[#01312d] leading-tight">{tile.label}</span>
              <span className="text-xs text-[#6b8478]">{tile.hint}</span>
              {isCustomTile && (
                <span className="inline-block mt-0.5 px-2 py-0.5 text-[11px] font-semibold bg-[#2e7d4f]/15 text-[#2e7d4f] rounded-full">
                  Includes Fit Guarantee
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Validation error */}
      {tileError && !selectedTileId && (
        <p className="text-sm text-red-600 font-medium">Please select a shape to continue</p>
      )}

      {/* Flow hint bar */}
      {selectedTileId && (
        <div className="flex items-center gap-2.5 bg-[#eef5ef] rounded-xl px-4 py-3 text-sm text-[#23503f]">
          <span className="text-base">&rarr;</span>
          <span>
            <strong>{flowTitle}</strong>&nbsp;&nbsp;{flowDesc}
          </span>
        </div>
      )}

      {/* Custom Shape: corner picker (shown on both mobile and desktop) */}
      {isCustomSelected && (
        <div id="fixing-points-section">
          <h4 className="text-lg font-semibold mb-4 text-[#01312d]">
            How many fixing points will your shade sail have?
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {CORNER_OPTIONS.map((shape) => {
              const Icon = shape.icon;
              const hasError = validationErrors.corners && !config.corners;
              return (
                <Card
                  key={shape.corners}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    config.corners === shape.corners
                      ? '!ring-2 !ring-[#01312D] !border-2 !border-[#01312D]'
                      : hasError
                      ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600'
                      : 'hover:border-slate-300'
                  }`}
                  onClick={() => handleCornerChange(shape.corners)}
                >
                  <div className="text-center">
                    <Icon className="w-10 h-10 mx-auto mb-2 text-[#01312d]" aria-label={`${shape.corners} corners shape`} />
                    <h5 className="font-semibold text-[#01312d] mb-1">{shape.label}</h5>
                    <p className="text-xs text-[#6b8478]">{shape.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[#dfe7e1]">
        <div className="flex sm:hidden flex-col gap-3">
          <div className="flex gap-3">
            {showBackButton && (
              <Button variant="outline" size="md" onClick={onPrev} className="flex-1">
                Back
              </Button>
            )}
            {onSaveQuote && (
              <SaveProgressButton onClick={onSaveQuote} className="flex-1" />
            )}
          </div>
          {mobileGuidance?.currentHighlightTarget === 'continue-button-shape-size' ? (
            <div className="energy-border-chase-btn w-full" id="continue-button-shape-size" data-guidance-id="continue-button-shape-size">
              <Button onClick={handleContinue} size="md" className={`w-full py-4 ${!isComplete ? 'opacity-50' : ''}`}>
                <span className="flex flex-col items-center leading-tight">
                  <span>Continue</span>
                  {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleContinue}
              size="md"
              id="continue-button-shape-size"
              data-guidance-id="continue-button-shape-size"
              className={`w-full py-4 ${!isComplete ? 'opacity-50' : ''}`}
            >
              <span className="flex flex-col items-center leading-tight">
                <span>Continue</span>
                {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
              </span>
            </Button>
          )}
        </div>

        <div className="hidden sm:flex gap-4">
          {showBackButton && (
            <Button variant="outline" size="md" onClick={onPrev} className="w-auto">
              Back
            </Button>
          )}
          {onSaveQuote && (
            <SaveProgressButton onClick={onSaveQuote} className="w-auto" />
          )}
          {mobileGuidance?.currentHighlightTarget === 'continue-button-shape-size' ? (
            <div className="energy-border-chase-btn flex-1" id="continue-button-shape-size" data-guidance-id="continue-button-shape-size">
              <Button onClick={handleContinue} size="md" className={`w-full ${!isComplete ? 'opacity-50' : ''}`}>
                <span className="flex flex-col items-center leading-tight">
                  <span>Continue</span>
                  {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleContinue}
              size="md"
              id="continue-button-shape-size"
              data-guidance-id="continue-button-shape-size"
              className={`flex-1 ${!isComplete ? 'opacity-50' : ''}`}
            >
              <span className="flex flex-col items-center leading-tight">
                <span>Continue</span>
                {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
