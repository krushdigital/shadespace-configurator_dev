import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';

interface CombinedMeasurementContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors: { [key: string]: string };
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
}

export function CombinedMeasurementContent({
  config,
  updateConfig,
  validationErrors,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton
}: CombinedMeasurementContentProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-[#01312D] mb-3">
            Select Measurement Units
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => updateConfig({ unit: 'metric' })}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                config.unit === 'metric'
                  ? 'border-[#BFF102] bg-[#BFF102]/10'
                  : 'border-slate-200 hover:border-[#307C31]'
              }`}
            >
              <div className="font-bold text-[#01312D] mb-2">Metric</div>
              <p className="text-sm text-[#01312D]/60">Measurements in millimeters (mm)</p>
            </button>

            <button
              onClick={() => updateConfig({ unit: 'imperial' })}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                config.unit === 'imperial'
                  ? 'border-[#BFF102] bg-[#BFF102]/10'
                  : 'border-slate-200 hover:border-[#307C31]'
              }`}
            >
              <div className="font-bold text-[#01312D] mb-2">Imperial</div>
              <p className="text-sm text-[#01312D]/60">Measurements in inches (")</p>
            </button>
          </div>
          {validationErrors.unit && (
            <p className="text-red-500 text-sm mt-2">{validationErrors.unit}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-[#01312D] mb-3">
            Measurement Option
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => updateConfig({ measurementOption: 'adjust' })}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                config.measurementOption === 'adjust'
                  ? 'border-[#BFF102] bg-[#BFF102]/10'
                  : 'border-slate-200 hover:border-[#307C31]'
              }`}
            >
              <div className="font-bold text-[#01312D] mb-2">Adjust to Fit</div>
              <p className="text-sm text-[#01312D]/60">
                We'll adjust dimensions slightly to optimize for manufacturing. Hardware pack included.
              </p>
            </button>

            <button
              onClick={() => updateConfig({ measurementOption: 'exact' })}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                config.measurementOption === 'exact'
                  ? 'border-[#BFF102] bg-[#BFF102]/10'
                  : 'border-slate-200 hover:border-[#307C31]'
              }`}
            >
              <div className="font-bold text-[#01312D] mb-2">Exact Dimensions</div>
              <p className="text-sm text-[#01312D]/60">
                Your exact measurements will be used. Hardware pack not included.
              </p>
            </button>
          </div>
          {validationErrors.measurementOption && (
            <p className="text-red-500 text-sm mt-2">{validationErrors.measurementOption}</p>
          )}
        </div>
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
