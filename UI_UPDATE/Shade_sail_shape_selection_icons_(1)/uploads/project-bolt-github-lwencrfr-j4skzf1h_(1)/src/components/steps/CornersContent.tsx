import React, { useState, useEffect } from 'react';
import { ConfiguratorState } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Triangle, Square, Pentagon, Hexagon, Octagon, Upload } from 'lucide-react';
import { SaveProgressButton } from '../SaveProgressButton';
import { SketchUploadModal } from '../SketchUploadModal';
import { ParsedSketchData } from '../../utils/sketchParser';

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
  onSketchApply?: (data: ParsedSketchData) => void;
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

export function CornersContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {}, isStepOpen = true, onSaveQuote, onSketchApply, mobileGuidance }: CornersContentProps) {
  const [showSketchModal, setShowSketchModal] = useState(false);
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

    // Custom realistic shade sail shapes for 5 and 6 points
    if (corners === 5) {
      // 5-point concave shade sail shape (scaled down for better padding)
      // Top edge: A (left), B (center-top), C (right)
      // Bottom edge: E (bottom-left), D (bottom-right)
      points.push(
        { x: 156, y: 180 },  // A - top-left
        { x: 300, y: 140 },  // B - top-center (highest point)
        { x: 444, y: 180 },  // C - top-right
        { x: 420, y: 420 },  // D - bottom-right
        { x: 180, y: 420 }   // E - bottom-left
      );
      return points;
    }

    if (corners === 6) {
      points.push(
        { x: 156, y: 156 },  // A - top-left
        { x: 300, y: 140 },  // B - top-center
        { x: 444, y: 156 },  // C - top-right
        { x: 444, y: 444 },  // D - bottom-right
        { x: 300, y: 460 },  // E - bottom-center
        { x: 156, y: 444 }   // F - bottom-left
      );
      return points;
    }

    if (corners === 7) {
      points.push(
        { x: 156, y: 170 },  // A - top-left
        { x: 300, y: 140 },  // B - top-center
        { x: 444, y: 170 },  // C - top-right
        { x: 460, y: 310 },  // D - right
        { x: 400, y: 440 },  // E - bottom-right
        { x: 200, y: 440 },  // F - bottom-left
        { x: 140, y: 310 }   // G - left
      );
      return points;
    }

    if (corners === 8) {
      points.push(
        { x: 180, y: 150 },  // A - top-left
        { x: 300, y: 140 },  // B - top-center
        { x: 420, y: 150 },  // C - top-right
        { x: 460, y: 270 },  // D - right-upper
        { x: 460, y: 390 },  // E - right-lower
        { x: 370, y: 460 },  // F - bottom-right
        { x: 230, y: 460 },  // G - bottom-left
        { x: 140, y: 350 }   // H - left
      );
      return points;
    }

    // Default circular layout for 3 and 4 point shapes
    // Start with A in top-left, work clockwise
    // For all shapes, start at top-left (-135 degrees)
    const startAngle = -3 * Math.PI / 4; // -135 degrees = top-left

    for (let i = 0; i < corners; i++) {
      // Go clockwise (positive angle increment)
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
      measurements: {}, // Reset all measurements when corners change
      fixingHeights: newHeights,
      fixingTypes: newTypes,
      eyeOrientations: newOrientations,
      attachmentTypes: newAttachmentTypes, // Reset attachment types
      fixingPointsInstalled: undefined, // Reset installation status
      diagonalsInitiallyProvided: undefined, // Clear diagonal flags
      heightsProvidedByUser: undefined, // Clear height flags
      hasManuallyAdjustedShape: false // Reset manual adjustment flag
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
    <div className="p-6">
      {/* Sketch Upload Card */}
      {onSketchApply && (
        <div className="mb-6">
          <div
            onClick={() => setShowSketchModal(true)}
            className="group cursor-pointer border-2 border-dashed border-[#307C31]/40 hover:border-[#307C31] bg-[#307C31]/5 hover:bg-[#307C31]/10 rounded-xl p-5 transition-all duration-200"
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

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Or select your shape below</span>
            <div className="flex-1 h-px bg-slate-200" />
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

      <div className="mb-6">
        {showHint && !config.corners && (
          <div className="guidance-hint mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#BFF102]/20 border border-[#BFF102]/40 rounded-full text-xs font-medium text-[#01312D]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#307C31] animate-pulse" />
            Select the number of fixing points for your sail
          </div>
        )}
        <h4 className={`text-lg font-semibold mb-4 ${
          !config.corners && mobileGuidance?.isGuidanceActive ? 'shiny-text-guidance' : 'text-slate-900'
        }`}>
          How many fixing points will your shade sail have?
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {SHAPE_OPTIONS.map((shape) => {
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
                onClick={() => handleShapeChange(shape.corners)}
              >
                <div className="text-center">
                  <Icon className="w-10 h-10 mx-auto mb-2 text-[#0e302d]" />
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
          {mobileGuidance?.currentHighlightTarget === 'continue-button-corners' ? (
            <div className="energy-border-chase-btn w-full" id="continue-button-corners" data-guidance-id="continue-button-corners">
              <Button
                onClick={() => {
                  mobileGuidance?.clearHighlight();
                  onNext();
                }}
                size="md"
                className={`w-full py-4 sm:py-2 ${!config.corners ? 'opacity-50' : ''}`}
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
                mobileGuidance?.clearHighlight();
                onNext();
              }}
              size="md"
              id="continue-button-corners"
              data-guidance-id="continue-button-corners"
              className={`w-full py-4 sm:py-2 ${!config.corners ? 'opacity-50' : ''}`}
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
          {mobileGuidance?.currentHighlightTarget === 'continue-button-corners' ? (
            <div className="energy-border-chase-btn flex-1" id="continue-button-corners" data-guidance-id="continue-button-corners">
              <Button
                onClick={() => {
                  mobileGuidance?.clearHighlight();
                  onNext();
                }}
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
              onClick={() => {
                mobileGuidance?.clearHighlight();
                onNext();
              }}
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