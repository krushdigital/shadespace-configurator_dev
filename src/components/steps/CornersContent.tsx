import React from 'react';
import { ConfiguratorState } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Triangle, Square, Pentagon, Hexagon } from 'lucide-react';
import { SaveProgressButton } from '../SaveProgressButton';

interface CornersContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: {[key: string]: string};
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
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
  { corners: 6, label: '6 Fixing Points', icon: Hexagon, description: 'Modern hexagonal shape' }
];

export function CornersContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {}, onSaveQuote, mobileGuidance }: CornersContentProps) {
  React.useEffect(() => {
    console.log('[Corners] Effect triggered', {
      isGuidanceActive: mobileGuidance?.isGuidanceActive,
      corners: config.corners
    });

    if (mobileGuidance?.isGuidanceActive && config.corners >= 3) {
      console.log('[Corners] Auto-scrolling to continue button');
      mobileGuidance.scrollToElement('continue-button-corners', 400);
      mobileGuidance.setHighlightTarget('continue-button-corners', 5000);
    }
  }, [config.corners, mobileGuidance?.isGuidanceActive]);
  const generateRegularPoints = (corners: number) => {
    const centerX = 300;
    const centerY = 300;
    const radius = 200;
    const points = [];
    
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

    updateConfig({
      corners,
      points,
      measurements: {}, // Reset measurements when corners change
      fixingHeights: newHeights,
      fixingTypes: newTypes,
      eyeOrientations: newOrientations
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-900 mb-4">
          How many fixing points will your shade sail have?
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <Button
            onClick={() => {
              mobileGuidance?.clearHighlight();
              onNext();
            }}
            size="md"
            id="continue-button-corners"
            data-guidance-id="continue-button-corners"
            className={`w-full py-4 sm:py-2 ${!config.corners ? 'opacity-50' : ''} ${
              mobileGuidance?.currentHighlightTarget === 'continue-button-corners' ? 'pulsate-guidance' : ''
            }`}
          >
            Continue to {nextStepTitle}
          </Button>
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
          <Button
            onClick={() => {
              mobileGuidance?.clearHighlight();
              onNext();
            }}
            size="md"
            className={`flex-1 ${!config.corners ? 'opacity-50' : ''}`}
          >
            Continue to {nextStepTitle}
          </Button>
        </div>
      </div>
    </div>
  );
}