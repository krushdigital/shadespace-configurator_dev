import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';

interface CornersContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors: { [key: string]: string };
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
}

export function CornersContent({
  config,
  updateConfig,
  validationErrors,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton
}: CornersContentProps) {
  const cornerOptions = [3, 4, 5, 6];

  return (
    <div className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-bold text-[#01312D] mb-3">
          Select Number of Fixing Points
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cornerOptions.map((num) => (
            <button
              key={num}
              onClick={() => updateConfig({ corners: num })}
              className={`p-6 border-2 rounded-lg transition-all ${
                config.corners === num
                  ? 'border-[#BFF102] bg-[#BFF102]/10'
                  : 'border-slate-200 hover:border-[#307C31]'
              }`}
            >
              <div className="text-3xl font-bold text-[#01312D] mb-1">{num}</div>
              <div className="text-sm text-[#01312D]/60">Corners</div>
            </button>
          ))}
        </div>
        {validationErrors.corners && (
          <p className="text-red-500 text-sm mt-2">{validationErrors.corners}</p>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-200">
        {showBackButton && (
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
        )}
        <Button variant="primary" onClick={onNext} className="ml-auto">
          {nextStepTitle ? `Next: ${nextStepTitle}` : 'Next'}
        </Button>
      </div>
    </div>
  );
}
