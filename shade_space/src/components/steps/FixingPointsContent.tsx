import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface FixingPointsContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors: { [key: string]: string };
  typoSuggestions?: { [key: string]: number };
  dismissTypoSuggestion?: (key: string) => void;
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
}

export function FixingPointsContent({
  config,
  updateConfig,
  validationErrors,
  typoSuggestions = {},
  dismissTypoSuggestion,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton
}: FixingPointsContentProps) {
  const handleHeightChange = (index: number, value: string) => {
    const newHeights = [...(config.fixingHeights || [])];
    newHeights[index] = parseFloat(value) || 0;
    updateConfig({ fixingHeights: newHeights });
  };

  const handleTypeChange = (index: number, value: 'post' | 'building') => {
    const newTypes = [...(config.fixingTypes || [])];
    newTypes[index] = value;
    updateConfig({ fixingTypes: newTypes });
  };

  const handleOrientationChange = (index: number, value: 'horizontal' | 'vertical') => {
    const newOrientations = [...(config.eyeOrientations || [])];
    newOrientations[index] = value;
    updateConfig({ eyeOrientations: newOrientations });
  };

  const points = Array.from({ length: config.corners }, (_, i) => ({
    label: String.fromCharCode(65 + i),
    index: i
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="bg-[#BFF102]/10 border border-[#307C31]/30 rounded-lg p-4 mb-4">
        <p className="text-sm text-[#01312D]">
          <strong>Tip:</strong> Configure the height and attachment details for each fixing point.
          Heights should be in {config.unit === 'imperial' ? 'inches' : 'millimeters'}.
        </p>
      </div>

      <div className="space-y-6">
        {points.map(({ label, index }) => (
          <div key={label} className="border border-slate-200 rounded-lg p-4">
            <h4 className="font-bold text-[#01312D] mb-4">Point {label}</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#01312D] mb-2">
                  Height ({config.unit === 'imperial' ? 'inches' : 'mm'})
                </label>
                <Input
                  type="number"
                  value={config.fixingHeights?.[index] || ''}
                  onChange={(e) => handleHeightChange(index, e.target.value)}
                  placeholder="Enter height"
                  error={!!validationErrors[`height_${index}`]}
                />
                {validationErrors[`height_${index}`] && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors[`height_${index}`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#01312D] mb-2">
                  Attachment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTypeChange(index, 'post')}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      config.fixingTypes?.[index] === 'post'
                        ? 'border-[#BFF102] bg-[#BFF102]/10'
                        : 'border-slate-200 hover:border-[#307C31]'
                    }`}
                  >
                    <div className="font-semibold text-sm">Post</div>
                  </button>
                  <button
                    onClick={() => handleTypeChange(index, 'building')}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      config.fixingTypes?.[index] === 'building'
                        ? 'border-[#BFF102] bg-[#BFF102]/10'
                        : 'border-slate-200 hover:border-[#307C31]'
                    }`}
                  >
                    <div className="font-semibold text-sm">Building</div>
                  </button>
                </div>
                {validationErrors[`type_${index}`] && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors[`type_${index}`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#01312D] mb-2">
                  Eye Orientation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOrientationChange(index, 'horizontal')}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      config.eyeOrientations?.[index] === 'horizontal'
                        ? 'border-[#BFF102] bg-[#BFF102]/10'
                        : 'border-slate-200 hover:border-[#307C31]'
                    }`}
                  >
                    <div className="font-semibold text-sm">Horizontal</div>
                  </button>
                  <button
                    onClick={() => handleOrientationChange(index, 'vertical')}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      config.eyeOrientations?.[index] === 'vertical'
                        ? 'border-[#BFF102] bg-[#BFF102]/10'
                        : 'border-slate-200 hover:border-[#307C31]'
                    }`}
                  >
                    <div className="font-semibold text-sm">Vertical</div>
                  </button>
                </div>
                {validationErrors[`orientation_${index}`] && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors[`orientation_${index}`]}</p>
                )}
              </div>
            </div>
          </div>
        ))}
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
