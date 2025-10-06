import React from 'react';
import { Button } from '../ui/Button';

export function CombinedMeasurementContent({ config, updateConfig, onNext, onPrev, showBackButton }: any) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Select Unit of Measurement</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateConfig({ unit: 'metric' })}
            className={`p-6 border-2 rounded-lg text-center transition-all ${
              config.unit === 'metric'
                ? 'border-[#BFF102] bg-[#BFF102]/10'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-lg font-semibold text-slate-900">Metric</div>
            <div className="text-sm text-slate-600 mt-1">Millimeters (mm)</div>
          </button>
          <button
            onClick={() => updateConfig({ unit: 'imperial' })}
            className={`p-6 border-2 rounded-lg text-center transition-all ${
              config.unit === 'imperial'
                ? 'border-[#BFF102] bg-[#BFF102]/10'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-lg font-semibold text-slate-900">Imperial</div>
            <div className="text-sm text-slate-600 mt-1">Inches (in)</div>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Measurement Handling</label>
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => updateConfig({ measurementOption: 'adjust' })}
            className={`p-6 border-2 rounded-lg text-left transition-all ${
              config.measurementOption === 'adjust'
                ? 'border-[#BFF102] bg-[#BFF102]/10'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-semibold text-slate-900">Adjust to Fit</div>
            <div className="text-sm text-slate-600 mt-1">
              We'll adjust measurements slightly for optimal fit and tension
            </div>
          </button>
          <button
            onClick={() => updateConfig({ measurementOption: 'exact' })}
            className={`p-6 border-2 rounded-lg text-left transition-all ${
              config.measurementOption === 'exact'
                ? 'border-[#BFF102] bg-[#BFF102]/10'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-semibold text-slate-900">Exact Dimensions</div>
            <div className="text-sm text-slate-600 mt-1">
              Use exact measurements as specified (for specific installations)
            </div>
          </button>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        {showBackButton && (
          <Button variant="outline" onClick={onPrev}>Back</Button>
        )}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!config.unit || !config.measurementOption}
          className="ml-auto"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
