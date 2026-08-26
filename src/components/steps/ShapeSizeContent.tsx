import React, { useState, useEffect } from 'react';
import { ConfiguratorState, FixedShapeType } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SaveProgressButton } from '../SaveProgressButton';
import { SketchUploadModal } from '../SketchUploadModal';
import { ParsedSketchData } from '../../utils/sketchParser';
import { Triangle, Square, Pentagon, Hexagon, Octagon, Upload, Ruler, Info, HelpCircle } from 'lucide-react';

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
  onSketchApply?: (data: ParsedSketchData) => void;
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

const FIXED_SHAPES: { id: FixedShapeType; label: string; description: string; corners: number }[] = [
  { id: 'triangle', label: 'Triangle', description: 'Equilateral - all sides equal', corners: 3 },
  { id: 'right-angle-triangle', label: 'Right Angle Triangle', description: 'Two sides + calculated hypotenuse', corners: 3 },
  { id: 'square', label: 'Square', description: 'All sides equal length', corners: 4 },
  { id: 'rectangle', label: 'Rectangle', description: 'Two pairs of equal sides', corners: 4 },
];

function ShapeIcon({ shape, className }: { shape: FixedShapeType; className?: string }) {
  const cls = className || 'w-8 h-8';
  switch (shape) {
    case 'triangle':
      return <Triangle className={cls} />;
    case 'right-angle-triangle':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21 L3 3 L21 21 Z" />
          <rect x="3" y="17" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'square':
      return <Square className={cls} />;
    case 'rectangle':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="1" />
        </svg>
      );
  }
}

function generateRegularPoints(corners: number) {
  const centerX = 300;
  const centerY = 300;
  const radius = 160;
  const points: { x: number; y: number }[] = [];

  if (corners === 5) {
    points.push(
      { x: 156, y: 180 },
      { x: 300, y: 140 },
      { x: 444, y: 180 },
      { x: 420, y: 420 },
      { x: 180, y: 420 }
    );
    return points;
  }

  if (corners === 6) {
    points.push(
      { x: 156, y: 156 },
      { x: 300, y: 140 },
      { x: 444, y: 156 },
      { x: 444, y: 444 },
      { x: 300, y: 460 },
      { x: 156, y: 444 }
    );
    return points;
  }

  if (corners === 7) {
    points.push(
      { x: 156, y: 170 },
      { x: 300, y: 140 },
      { x: 444, y: 170 },
      { x: 460, y: 310 },
      { x: 400, y: 440 },
      { x: 200, y: 440 },
      { x: 140, y: 310 }
    );
    return points;
  }

  if (corners === 8) {
    points.push(
      { x: 180, y: 150 },
      { x: 300, y: 140 },
      { x: 420, y: 150 },
      { x: 460, y: 270 },
      { x: 460, y: 390 },
      { x: 370, y: 460 },
      { x: 230, y: 460 },
      { x: 140, y: 350 }
    );
    return points;
  }

  // Default circular layout for 3 and 4 point shapes
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
  onSketchApply,
  mobileGuidance,
}: ShapeSizeContentProps) {
  const [showSketchModal, setShowSketchModal] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showSketchInfo, setShowSketchInfo] = useState(false);
  const [fixedShapeError, setFixedShapeError] = useState(false);

  const selectedMode = config.shapeMode || null;
  const selectedFixedShape = config.fixedShapeType || null;

  const isComplete =
    (selectedMode === 'custom' && config.corners >= 3) ||
    (selectedMode === 'fixed' && !!selectedFixedShape);

  // Show guidance hint after 600ms if nothing selected
  useEffect(() => {
    if (isStepOpen && !selectedMode) {
      const timer = setTimeout(() => setShowHint(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowHint(false);
    }
  }, [selectedMode, isStepOpen]);

  // Mobile guidance: scroll to continue when sub-selection is complete
  useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && isComplete) {
      mobileGuidance.scrollToElement('continue-button-shape-size', 400);
      mobileGuidance.setHighlightTarget('continue-button-shape-size');
    }
  }, [isComplete, mobileGuidance?.isGuidanceActive]);

  const handleSelectCustom = () => {
    updateConfig({
      shapeMode: 'custom',
      fixedShapeType: null,
      measurementOption: 'adjust',
      hardwareSelectionMode: 'standard',
    });
  };

  const handleSelectFixedShape = (shape: FixedShapeType) => {
    setFixedShapeError(false);
    const corners = FIXED_SHAPES.find(s => s.id === shape)!.corners;
    const shapeChanged = shape !== config.fixedShapeType;
    updateConfig({
      shapeMode: 'fixed',
      fixedShapeType: shape,
      corners,
      measurementOption: 'exact',
      hardwareSelectionMode: 'none',
      ...(shapeChanged ? { measurements: {}, points: [] } : {}),
    });
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

  return (
    <div className="p-6 space-y-6">
      {/* Guidance hint */}
      {showHint && !selectedMode && (
        <div className="guidance-hint inline-flex items-center gap-2 px-3 py-1.5 bg-[#BFF102]/20 border border-[#BFF102]/40 rounded-full text-xs font-medium text-[#01312D]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#307C31] animate-pulse" />
          Select your shape type to get started
        </div>
      )}

      {/* Shape Mode Toggle */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Choose your shape type</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Custom Shape Option */}
          <button
            onClick={handleSelectCustom}
            aria-label="Select Custom Shape"
            className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
              selectedMode === 'custom'
                ? 'border-[#307C31] bg-[#307C31]/5 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${selectedMode === 'custom' ? 'bg-[#307C31]/15 text-[#307C31]' : 'bg-gray-100 text-gray-600'}`}>
                <Hexagon className="w-6 h-6" />
              </div>
              <span className="font-semibold text-gray-900 text-base">Custom Shape</span>
              <div className={`ml-auto w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                selectedMode === 'custom' ? 'border-[#307C31] bg-[#307C31]' : 'border-gray-300'
              }`}>
                {selectedMode === 'custom' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              For any irregular shape with 3 to 8 corners. Measure each edge and diagonal for a precise fit.
            </p>
            <span
              className="inline-block mt-2 px-2 py-0.5 text-xs font-semibold bg-[#307C31]/15 text-[#307C31] rounded-full relative cursor-help"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              Includes Fit Guarantee
              {showTooltip && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-10">
                  If your custom sail does not fit your space, we remake it free
                  <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                </span>
              )}
            </span>
          </button>

          {/* Fixed Shape Option */}
          <button
            onClick={() => {
              if (selectedMode !== 'fixed') {
                updateConfig({
                  shapeMode: 'fixed',
                  fixedShapeType: null,
                  measurementOption: 'exact',
                  hardwareSelectionMode: 'none',
                });
              }
            }}
            aria-label="Select Fixed Shape"
            className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
              selectedMode === 'fixed'
                ? 'border-[#307C31] bg-[#307C31]/5 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${selectedMode === 'fixed' ? 'bg-[#307C31]/15 text-[#307C31]' : 'bg-gray-100 text-gray-600'}`}>
                <Ruler className="w-6 h-6" />
              </div>
              <span className="font-semibold text-gray-900 text-base">Fixed Shape</span>
              <div className={`ml-auto w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                selectedMode === 'fixed' ? 'border-[#307C31] bg-[#307C31]' : 'border-gray-300'
              }`}>
                {selectedMode === 'fixed' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Standard geometric shapes. Only 1-2 measurements needed.
            </p>
          </button>
        </div>
      </div>

      {/* Custom Shape Sub-content: Sketch Upload + Corner Count Grid */}
      {selectedMode === 'custom' && (
        <div className="space-y-6">
          {/* Sketch Upload Card */}
          {onSketchApply && (
            <div>
              {/* Mobile: compact single-line row */}
              <div
                className="sm:hidden group cursor-pointer border-2 border-dashed border-[#307C31]/40 hover:border-[#307C31] bg-[#307C31]/5 hover:bg-[#307C31]/10 rounded-xl px-4 py-3 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-[#307C31] flex-shrink-0" />
                  <span
                    onClick={() => setShowSketchModal(true)}
                    className="text-sm font-semibold text-[#01312D] flex-1"
                  >
                    Have a sketch? <span className="underline">Upload it</span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowSketchInfo(!showSketchInfo); }}
                    className="w-7 h-7 rounded-full bg-[#307C31]/10 flex items-center justify-center flex-shrink-0"
                    aria-label="More info about sketch upload"
                  >
                    <Info className="w-3.5 h-3.5 text-[#307C31]" />
                  </button>
                </div>
                {showSketchInfo && (
                  <p className="mt-2 text-xs text-slate-600 pl-8">
                    Upload your sketch and we'll auto-fill all dimensions for you.
                  </p>
                )}
              </div>

              {/* Desktop: full-size card */}
              <div
                onClick={() => setShowSketchModal(true)}
                className="hidden sm:block group cursor-pointer border-2 border-dashed border-[#307C31]/40 hover:border-[#307C31] bg-[#307C31]/5 hover:bg-[#307C31]/10 rounded-xl p-5 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#307C31]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#307C31]/25 transition-colors">
                    <Upload className="w-6 h-6 text-[#307C31]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#01312D]">
                      Already have a sketch with measurements?
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Upload your shade sail sketch and we'll fill in the dimensions for you
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1.5 bg-[#307C31] text-white text-xs font-semibold rounded-lg group-hover:bg-[#256325] transition-colors">
                      Upload Sketch
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Or select your shape below</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            </div>
          )}

          {/* Corner Count Grid */}
          <div>
            <h4 className={`text-lg font-semibold mb-4 ${
              !config.corners && mobileGuidance?.isGuidanceActive ? 'shiny-text-guidance' : 'text-slate-900'
            }`}>
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
                      <Icon
                        className="w-10 h-10 mx-auto mb-2 text-[#0e302d]"
                        aria-label={`${shape.corners} corners shape`}
                      />
                      <h5 className="font-semibold text-slate-900 mb-1">
                        {shape.label}
                      </h5>
                      <p className="text-xs text-slate-600">
                        {shape.description}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Shape Sub-options */}
      {selectedMode === 'fixed' && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Select shape</p>
          {fixedShapeError && (
            <p className="text-xs text-red-600 font-medium mb-2">Please select a shape to continue</p>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {FIXED_SHAPES.map(shape => (
              <button
                key={shape.id}
                onClick={() => handleSelectFixedShape(shape.id)}
                aria-label={`Select ${shape.label} shape`}
                className={`relative p-3 rounded-lg border-2 transition-all duration-150 text-left h-[56px] ${
                  selectedFixedShape === shape.id
                    ? 'border-[#307C31] bg-[#307C31]/5 shadow-sm'
                    : fixedShapeError
                    ? 'border-red-400 bg-red-50 hover:border-red-500 animate-[pulse-error_0.8s_ease-in-out_3]'
                    : 'border-[#307C31]/20 bg-[#307C31]/[0.02] hover:border-[#307C31]/40 hover:bg-[#307C31]/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShapeIcon
                    shape={shape.id}
                    className={`w-6 h-6 flex-shrink-0 ${
                      selectedFixedShape === shape.id ? 'text-[#307C31]' : fixedShapeError ? 'text-red-400' : 'text-[#307C31]/60'
                    }`}
                  />
                  <span className={`text-sm font-medium ${
                    selectedFixedShape === shape.id ? 'text-[#01312D]' : 'text-gray-800'
                  }`}>
                    {shape.label}
                  </span>
                  <span className="group/tip ml-auto flex-shrink-0 relative">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg opacity-0 group-hover/tip:opacity-100 transition-opacity z-20">
                      {shape.description}
                      <span className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-gray-900" />
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sketch Upload Modal */}
      {onSketchApply && (
        <SketchUploadModal
          open={showSketchModal}
          onClose={() => setShowSketchModal(false)}
          onApply={(data) => {
            setShowSketchModal(false);
            onSketchApply(data);
          }}
        />
      )}

      {/* Navigation Footer */}
      <div className="flex flex-col gap-4 pt-4 border-t border-slate-200">
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
          {mobileGuidance?.currentHighlightTarget === 'continue-button-shape-size' ? (
            <div className="energy-border-chase-btn w-full" id="continue-button-shape-size" data-guidance-id="continue-button-shape-size">
              <Button
                onClick={() => {
                  if (selectedMode === 'fixed' && !selectedFixedShape) {
                    setFixedShapeError(true);
                    return;
                  }
                  mobileGuidance?.clearHighlight();
                  onNext();
                }}
                size="md"
                className={`w-full py-4 sm:py-2 ${!isComplete ? 'opacity-50' : ''}`}
              >
                <span className="flex flex-col items-center leading-tight">
                  <span>Continue</span>
                  {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                if (selectedMode === 'fixed' && !selectedFixedShape) {
                  setFixedShapeError(true);
                  return;
                }
                mobileGuidance?.clearHighlight();
                onNext();
              }}
              size="md"
              id="continue-button-shape-size"
              data-guidance-id="continue-button-shape-size"
              className={`w-full py-4 sm:py-2 ${!isComplete ? 'opacity-50' : ''}`}
            >
              <span className="flex flex-col items-center leading-tight">
                <span>Continue</span>
                {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
              </span>
            </Button>
          )}
        </div>

        {/* Desktop Layout: Back, Save Progress, and Continue on same row */}
        <div className="hidden sm:flex gap-4">
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
          {mobileGuidance?.currentHighlightTarget === 'continue-button-shape-size' ? (
            <div className="energy-border-chase-btn flex-1" id="continue-button-shape-size" data-guidance-id="continue-button-shape-size">
              <Button
                onClick={() => {
                  if (selectedMode === 'fixed' && !selectedFixedShape) {
                    setFixedShapeError(true);
                    return;
                  }
                  mobileGuidance?.clearHighlight();
                  onNext();
                }}
                size="md"
                className={`w-full ${!isComplete ? 'opacity-50' : ''}`}
              >
                <span className="flex flex-col items-center leading-tight">
                  <span>Continue</span>
                  {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                if (selectedMode === 'fixed' && !selectedFixedShape) {
                  setFixedShapeError(true);
                  return;
                }
                mobileGuidance?.clearHighlight();
                onNext();
              }}
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
