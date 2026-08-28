import React, { useState, useEffect } from 'react';
import { ConfiguratorState } from '../../types';
import { Button } from '../ui/Button';
import { Triangle, Square, Pentagon, Hexagon, Octagon } from 'lucide-react';
import { SaveProgressButton } from '../SaveProgressButton';

interface CornersContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: {[key: string]: string};
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

const SHAPE_OPTIONS = [
  { corners: 3, label: '3 Fixing Points', icon: Triangle, description: 'Classic triangular shade' },
  { corners: 4, label: '4 Fixing Points', icon: Square, description: 'Most popular choice' },
  { corners: 5, label: '5 Fixing Points', icon: Pentagon, description: 'Unique five-sided design' },
  { corners: 6, label: '6 Fixing Points', icon: Hexagon, description: 'Modern hexagonal shape' },
  { corners: 7, label: '7 Fixing Points', icon: Hexagon, description: 'Extended multi-point design' },
  { corners: 8, label: '8 Fixing Points', icon: Octagon, description: 'Maximum coverage layout' }
];

export function CornersContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {}, isStepOpen = true, onSaveQuote, mobileGuidance }: CornersContentProps) {
  React.useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && config.corners >= 3) {
      mobileGuidance.scrollToElement('continue-button-corners', 400);
      mobileGuidance.setHighlightTarget('continue-button-corners');
    }
  }, [config.corners, mobileGuidance?.isGuidanceActive]);

  const generateRegularPoints = (corners: number) => {
    const centerX = 300;
    const centerY = 300;
    const radius = 160;
    const points = [];

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

    const startAngle = -3 * Math.PI / 4;
    for (let i = 0; i < corners; i++) {
      const angle = startAngle + (i * 2 * Math.PI) / corners;
      points.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    }

    return points;
  };

  const handleShapeChange = (corners: number) => {
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
      hasManuallyAdjustedShape: false
    });
  };

  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (isStepOpen && !config.corners) {
      const timer = setTimeout(() => setShowHint(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowHint(false);
    }
  }, [config.corners, isStepOpen]);

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        {showHint && !config.corners && (
          <div className="guidance-hint mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#eef5ef] border border-[#7bb08f] rounded-full text-xs font-medium text-[#23503f]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d4f] animate-pulse" />
            Select the number of fixing points for your sail
          </div>
        )}
        <h4 className={`text-lg font-semibold mb-4 ${
          !config.corners && mobileGuidance?.isGuidanceActive ? 'shiny-text-guidance' : 'text-[#01312d]'
        }`}>
          How many fixing points will your shade sail have?
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {SHAPE_OPTIONS.map((shape) => {
            const Icon = shape.icon;
            const isSelected = config.corners === shape.corners;
            const hasError = validationErrors.corners && !config.corners;

            return (
              <button
                key={shape.corners}
                type="button"
                className={`relative rounded-2xl border-2 p-4 sm:p-5 text-center transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-[#2e7d4f] shadow-[inset_0_0_0_1px_#2e7d4f] bg-white'
                    : hasError
                    ? 'border-red-400 bg-red-50 hover:border-red-500'
                    : 'border-[#dfe7e1] bg-white hover:border-[#7bb08f] hover:shadow-md'
                }`}
                onClick={() => handleShapeChange(shape.corners)}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-[#2e7d4f] text-white text-[13px] font-bold flex items-center justify-center">
                    &#10003;
                  </span>
                )}
                <Icon className="w-10 h-10 mx-auto mb-2 text-[#01312d]" />
                <h5 className="font-bold text-[15px] text-[#01312d] mb-0.5">
                  {shape.label}
                </h5>
                <p className="text-xs text-[#6b8478]">
                  {shape.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

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
          {mobileGuidance?.currentHighlightTarget === 'continue-button-corners' ? (
            <div className="energy-border-chase-btn w-full" id="continue-button-corners" data-guidance-id="continue-button-corners">
              <Button
                onClick={() => { mobileGuidance?.clearHighlight(); onNext(); }}
                size="md"
                className={`w-full py-4 ${!config.corners ? 'opacity-50' : ''}`}
              >
                <span className="flex flex-col items-center leading-tight">
                  <span>Continue</span>
                  {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => { mobileGuidance?.clearHighlight(); onNext(); }}
              size="md"
              id="continue-button-corners"
              data-guidance-id="continue-button-corners"
              className={`w-full py-4 ${!config.corners ? 'opacity-50' : ''}`}
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
          {mobileGuidance?.currentHighlightTarget === 'continue-button-corners' ? (
            <div className="energy-border-chase-btn flex-1" id="continue-button-corners" data-guidance-id="continue-button-corners">
              <Button
                onClick={() => { mobileGuidance?.clearHighlight(); onNext(); }}
                size="md"
                className={`w-full ${!config.corners ? 'opacity-50' : ''}`}
              >
                <span className="flex flex-col items-center leading-tight">
                  <span>Continue</span>
                  {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => { mobileGuidance?.clearHighlight(); onNext(); }}
              size="md"
              id="continue-button-corners"
              data-guidance-id="continue-button-corners"
              className={`flex-1 ${!config.corners ? 'opacity-50' : ''}`}
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
