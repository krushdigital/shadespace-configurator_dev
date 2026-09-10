import React, { useState, useEffect } from 'react';
import { ConfiguratorState, FixedShapeType } from '../../types';

import { generateFixedShapePoints } from './FixedShapeDimensionsContent';

import points3 from '../../assets/icons/points-3.svg';
import points4 from '../../assets/icons/points-4.svg';
import points5 from '../../assets/icons/points-5.svg';
import points6 from '../../assets/icons/points-6.svg';
import points7 from '../../assets/icons/points-7.svg';
import points8 from '../../assets/icons/points-8.svg';

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
  { corners: 3, label: '3 points', description: 'Any triangle', icon: points3 },
  { corners: 4, label: '4 points', description: 'Most popular', icon: points4 },
  { corners: 5, label: '5 points', description: 'Heights required', icon: points5 },
  { corners: 6, label: '6 points', description: 'Heights required', icon: points6 },
  { corners: 7, label: '7 points', description: 'Heights required', icon: points7 },
  { corners: 8, label: '8 points', description: 'Heights required', icon: points8 },
];

interface ShapeTile {
  id: FixedShapeType;
  label: string;
  hint: string;
  corners: number;
}

const FIXED_SHAPES: ShapeTile[] = [
  { id: 'square', label: 'Square', hint: '1 measurement', corners: 4 },
  { id: 'rectangle', label: 'Rectangle', hint: '2 measurements', corners: 4 },
  { id: 'triangle', label: 'Triangle', hint: '1 measurement', corners: 3 },
  { id: 'right-angle-triangle', label: 'Right Angle Triangle', hint: '2 measurements', corners: 3 },
];

function ShapeTileIcon({ shapeId, selected, className }: { shapeId: string; selected?: boolean; className?: string }) {
  const cls = className || 'w-[72px] h-[72px]';
  const stroke = selected ? '#ffffff' : '#01312d';
  const fill = selected ? 'rgba(255,255,255,0.15)' : '#E7F2EA';
  const dotFill = selected ? 'rgba(255,255,255,0.3)' : '#fff';

  switch (shapeId) {
    case 'square':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12,12 Q50,22 88,12 Q78,50 88,88 Q50,78 12,88 Q22,50 12,12 Z" fill={fill} stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="88" cy="12" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="88" cy="88" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="12" cy="88" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
        </svg>
      );
    case 'rectangle':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6,28 Q50,37 94,28 Q88,50 94,72 Q50,63 6,72 Q12,50 6,28 Z" fill={fill} stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="6" cy="28" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="94" cy="28" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="94" cy="72" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="6" cy="72" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
        </svg>
      );
    case 'triangle':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50,10 Q63.8,52 93,85 Q50,76 7,85 Q36.2,52 50,10 Z" fill={fill} stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="50" cy="10" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="93" cy="85" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="7" cy="85" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
        </svg>
      );
    case 'right-angle-triangle':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18,12 Q46.9,56.6 88,88 Q49.6,80.7 18,88 Q25,53.8 18,12 Z" fill={fill} stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M28,88 V79 H18" fill="none" stroke={stroke} strokeWidth="2.5" />
          <circle cx="18" cy="12" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="18" cy="88" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="88" cy="88" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
        </svg>
      );
    case 'custom':
      return (
        <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="14" y1="40" x2="14" y2="92" stroke={stroke} strokeWidth="3" />
          <line x1="44" y1="16" x2="44" y2="88" stroke={stroke} strokeWidth="3" />
          <line x1="88" y1="30" x2="88" y2="90" stroke={stroke} strokeWidth="3" />
          <line x1="64" y1="58" x2="64" y2="94" stroke={stroke} strokeWidth="3" />
          <path d="M14,40 Q30,32 44,16 Q68,28 88,30 Q74,42 64,58 Q38,54 14,40 Z" fill={fill} stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" strokeDasharray="7 5" />
          <circle cx="14" cy="40" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="44" cy="16" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="88" cy="30" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
          <circle cx="64" cy="58" r="5" fill={dotFill} stroke={stroke} strokeWidth="3" />
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

  const selectedTileId: string | null =
    config.shapeMode === 'fixed' && config.fixedShapeType
      ? config.fixedShapeType
      : config.shapeMode === 'custom'
      ? 'custom'
      : null;

  const isCustomSelected = selectedTileId === 'custom';
  const isFixedSelected = selectedTileId !== null && !isCustomSelected;
  const isComplete = (isCustomSelected && config.corners >= 3) || isFixedSelected;

  useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && isComplete) {
      mobileGuidance.scrollToElement('continue-button-shape-size', 400);
      mobileGuidance.setHighlightTarget('continue-button-shape-size');
    }
  }, [isComplete, mobileGuidance?.isGuidanceActive]);

  const handleSelectFixed = (tile: ShapeTile) => {
    setTileError(false);
    const shapeChanged = tile.id !== config.fixedShapeType;
    updateConfig({
      shapeMode: 'fixed',
      fixedShapeType: tile.id,
      corners: tile.corners,
      measurementOption: 'exact',
      hardwareSelectionMode: 'none',
      ...(shapeChanged ? { measurements: {}, points: generateFixedShapePoints(tile.id, {}) } : {}),
    });
    mobileGuidance?.scrollToElement('continue-button-shape-size', 300);
  };

  const handleSelectCustom = () => {
    setTileError(false);
    updateConfig({
      shapeMode: 'custom',
      fixedShapeType: null,
      measurementOption: 'adjust',
      hardwareSelectionMode: 'standard',
    });
    mobileGuidance?.scrollToElement('fixing-points-section', 300);
  };

  const handleCornerChange = (corners: number) => {
    const points = generateRegularPoints(corners);
    updateConfig({
      corners,
      points,
      measurements: {},
      fixingHeights: Array(corners).fill(undefined),
      fixingTypes: Array(corners).fill(''),
      eyeOrientations: Array(corners).fill(''),
      attachmentTypes: Array(corners).fill(''),
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
    if (isCustomSelected && !config.corners) return;
    mobileGuidance?.clearHighlight();
    onNext();
  };

  const flowTitle = isCustomSelected ? 'Custom sail flow' : 'Fixed shape flow';
  const flowDesc = isCustomSelected
    ? 'Plot 3\u20138 fixing points, then measure every edge and diagonal. Covered by the Fit Guarantee.'
    : 'Standard geometric shape \u2014 only 1\u20132 measurements needed.';

  return (
    <div className="space-y-5">
      {/* Fixed shape tiles - 2x2 on mobile, 4-col on desktop */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {FIXED_SHAPES.map((tile) => {
          const isSelected = selectedTileId === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleSelectFixed(tile)}
              aria-checked={isSelected}
              role="radio"
              className={`relative cursor-pointer rounded-card p-[18px_10px_14px] flex flex-col items-center gap-2.5 text-center transition-all duration-200 min-h-[44px] ${
                isSelected
                  ? 'bg-white border-2 border-brand-green'
                  : tileError
                  ? 'bg-white border-2 border-red-400 hover:border-red-500'
                  : 'bg-white border-2 border-border-card hover:border-[#7bb08f]'
              }`}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-brand-green text-brand-lime text-[13px] font-extrabold flex items-center justify-center">
                  &#10003;
                </span>
              )}
              <ShapeTileIcon shapeId={tile.id} selected={false} className="w-[76px] h-[76px]" />
              <div>
                <div className="font-extrabold text-[16px] text-brand-green">{tile.label}</div>
                <div className="text-[13px] mt-0.5 text-text-muted">{tile.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom shape - full-width row below */}
      <button
        type="button"
        onClick={handleSelectCustom}
        aria-checked={isCustomSelected}
        role="radio"
        className={`relative w-full cursor-pointer rounded-card p-4 flex items-center gap-4 text-left transition-all duration-200 min-h-[44px] ${
          isCustomSelected
            ? 'bg-brand-green text-white border-2 border-dashed border-brand-green'
            : tileError
            ? 'bg-white border-2 border-dashed border-red-400 hover:border-red-500'
            : 'bg-white border-2 border-dashed border-[#7bb08f] hover:border-brand-mid'
        }`}
      >
        {isCustomSelected && (
          <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-brand-lime text-brand-green text-sm font-extrabold flex items-center justify-center">
            &#10003;
          </span>
        )}
        <div className="w-[68px] h-[68px] rounded-xl bg-white flex items-center justify-center flex-shrink-0">
          <ShapeTileIcon shapeId="custom" selected={false} className="w-[60px] h-[60px]" />
        </div>
        <div className="pr-8">
          <div className={`font-extrabold text-[17px] ${isCustomSelected ? 'text-white' : 'text-brand-green'}`}>Custom shape</div>
          <div className={`text-[14px] mt-0.5 ${isCustomSelected ? 'text-white/85' : 'text-text-muted'}`}>
            3&ndash;8 fixing points &middot; Made to measure &middot; Fit Guarantee
          </div>
        </div>
      </button>

      {/* Validation error */}
      {tileError && !selectedTileId && (
        <p className="text-sm text-red-600 font-medium">Please select a shape to continue</p>
      )}

      {/* Flow hint bar */}
      {selectedTileId && (
        <div className="flex items-center gap-2.5 bg-surface-soft rounded-xl px-4 py-3 text-sm text-[#23503f]">
          <span className="text-base">&rarr;</span>
          <span><strong>{flowTitle}</strong>&nbsp;&nbsp;{flowDesc}</span>
        </div>
      )}

      {/* Custom Shape: corner picker */}
      {isCustomSelected && (
        <div id="fixing-points-section">
          <h4 className="text-lg font-bold mb-4 text-brand-green">
            How many fixing points will your shade sail have?
          </h4>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {CORNER_OPTIONS.map((shape) => {
              const isSelected = config.corners === shape.corners;
              const hasError = !!validationErrors.corners && !config.corners;
              return (
                <button
                  key={shape.corners}
                  type="button"
                  onClick={() => handleCornerChange(shape.corners)}
                  className={`relative rounded-card p-[16px_10px_14px] flex flex-col items-center gap-2 text-center transition-all duration-200 cursor-pointer min-h-[44px] ${
                    isSelected
                      ? 'bg-white border-2 border-brand-green'
                      : hasError
                      ? 'bg-white border-2 border-red-400'
                      : 'bg-white border-2 border-border-card hover:border-[#7bb08f]'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-brand-green text-brand-lime text-[13px] font-extrabold flex items-center justify-center">
                      &#10003;
                    </span>
                  )}
                  <img
                    src={shape.icon}
                    alt={`${shape.label} sail`}
                    className="w-[84px] h-[84px]"
                  />
                  <div>
                    <div className="font-extrabold text-[16px] text-brand-green">{shape.label}</div>
                    <div className="text-[13px] mt-0.5 text-text-muted">
                      {shape.description}
                      {shape.corners === 4 && (
                        <span className="ml-1.5 inline-flex px-1.5 py-0.5 bg-brand-lime text-brand-green text-[9px] font-bold rounded-full align-middle">Popular</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fixing points hint */}
      {isCustomSelected && config.corners >= 3 && (
        <div className="flex items-center gap-2.5 bg-surface-soft rounded-xl px-4 py-3 text-sm text-[#23503f]">
          <span className="text-base">&rarr;</span>
          <span>You&rsquo;ve selected <strong>{config.corners} fixing points</strong>. Next, plot them on the diagram.</span>
        </div>
      )}

    </div>
  );
}
