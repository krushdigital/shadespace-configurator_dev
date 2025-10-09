import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';

interface EdgeTypeContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors: { [key: string]: string };
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
}

export function EdgeTypeContent({
  config,
  updateConfig,
  validationErrors,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton
}: EdgeTypeContentProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-bold text-[#01312D] mb-3">
          Select Edge Reinforcement Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => updateConfig({ edgeType: 'webbing' })}
            className={`p-6 border-2 rounded-lg text-left transition-all ${
              config.edgeType === 'webbing'
                ? 'border-[#BFF102] bg-[#BFF102]/10'
                : 'border-slate-200 hover:border-[#307C31]'
            }`}
          >
            <div className="font-bold text-[#01312D] mb-2">Webbing Reinforced</div>
            <p className="text-sm text-[#01312D]/60">
              Heavy-duty webbing reinforcement for standard installations. Includes stainless steel hardware.
            </p>
          </button>

          <button
            onClick={() => updateConfig({ edgeType: 'cabled' })}
            className={`p-6 border-2 rounded-lg text-left transition-all ${
              config.edgeType === 'cabled'
                ? 'border-[#BFF102] bg-[#BFF102]/10'
                : 'border-slate-200 hover:border-[#307C31]'
            }`}
          >
            <div className="font-bold text-[#01312D] mb-2">Cabled Edge</div>
            <p className="text-sm text-[#01312D]/60">
              Stainless steel cable sewn into the edge for maximum strength and tension. Professional grade.
            </p>
          </button>
        </div>
        {validationErrors.edgeType && (
          <p className="text-red-500 text-sm mt-2">{validationErrors.edgeType}</p>
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
