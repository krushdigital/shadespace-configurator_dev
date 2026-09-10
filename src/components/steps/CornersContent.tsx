import React, { useState, useEffect } from 'react';
import { ConfiguratorState } from '../../types';
import { generateRegularPolygonPoints } from '../../utils/geometry';

import points3 from '../../assets/icons/points-3.svg';
import points4 from '../../assets/icons/points-4.svg';
import points5 from '../../assets/icons/points-5.svg';
import points6 from '../../assets/icons/points-6.svg';
import points7 from '../../assets/icons/points-7.svg';
import points8 from '../../assets/icons/points-8.svg';

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
  { corners: 3, label: '3 points', description: 'Classic triangular shade', icon: points3 },
  { corners: 4, label: '4 points', description: 'Most popular choice', icon: points4 },
  { corners: 5, label: '5 points', description: 'Five-sided design', icon: points5 },
  { corners: 6, label: '6 points', description: 'Hexagonal shape', icon: points6 },
  { corners: 7, label: '7 points', description: 'Multi-point design', icon: points7 },
  { corners: 8, label: '8 points', description: 'Maximum coverage', icon: points8 },
];

export function CornersContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {}, isStepOpen = true, onSaveQuote, mobileGuidance }: CornersContentProps) {
  React.useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && config.corners >= 3) {
      mobileGuidance.scrollToElement('continue-button-corners', 400);
      mobileGuidance.setHighlightTarget('continue-button-corners');
    }
  }, [config.corners, mobileGuidance?.isGuidanceActive]);

  const handleShapeChange = (corners: number) => {
    const points = generateRegularPolygonPoints(corners);
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SHAPE_OPTIONS.map((shape) => {
          const isSelected = config.corners === shape.corners;

          return (
            <button
              key={shape.corners}
              type="button"
              onClick={() => handleShapeChange(shape.corners)}
              className={`relative rounded-card p-5 pb-4 flex flex-col items-center gap-3 text-center transition-all duration-200 cursor-pointer min-h-[44px] ${
                isSelected
                  ? 'bg-[#fbfdfb] border-[3px] border-brand-mid'
                  : 'bg-[#fbfdfb] border-2 border-border-card hover:border-[#7bb08f]'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-brand-mid text-white text-[13px] font-bold flex items-center justify-center">
                  &#10003;
                </div>
              )}
              <img src={shape.icon} alt={`${shape.label} sail`} className="w-[72px] h-[72px]" />
              <div>
                <div className="font-bold text-[15px] text-brand-green">{shape.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{shape.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {config.corners >= 3 && (
        <div className="flex items-center gap-2.5 bg-surface-soft rounded-xl px-4 py-3 text-sm text-[#23503f]">
          <span className="text-base">&rarr;</span>
          <span>You&rsquo;ve selected <strong>{config.corners} fixing points</strong>. Next, plot them on the diagram.</span>
        </div>
      )}
    </div>
  );
}
