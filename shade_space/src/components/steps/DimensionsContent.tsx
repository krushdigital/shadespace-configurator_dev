import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface DimensionsContentProps {
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
  setHighlightedMeasurement?: (key: string | null) => void;
  highlightedMeasurement?: string | null;
  isMobile?: boolean;
}

export function DimensionsContent({
  config,
  updateConfig,
  validationErrors,
  typoSuggestions = {},
  dismissTypoSuggestion,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton,
  setHighlightedMeasurement
}: DimensionsContentProps) {
  const handleMeasurementChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateConfig({
      measurements: {
        ...config.measurements,
        [key]: numValue
      }
    });
  };

  const edges = [];
  for (let i = 0; i < config.corners; i++) {
    const nextIndex = (i + 1) % config.corners;
    const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
    edges.push({ key: edgeKey, label: `Edge ${edgeKey}` });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="bg-[#BFF102]/10 border border-[#307C31]/30 rounded-lg p-4">
          <p className="text-sm text-[#01312D]">
            <strong>Tip:</strong> Enter the measurements for each edge of your shade sail.
            All measurements should be in {config.unit === 'imperial' ? 'inches' : 'millimeters'}.
          </p>
        </div>

        {edges.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-bold text-[#01312D] mb-2">
              {label} ({config.unit === 'imperial' ? 'inches' : 'mm'})
            </label>
            <Input
              type="number"
              value={config.measurements[key] || ''}
              onChange={(e) => handleMeasurementChange(key, e.target.value)}
              onFocus={() => setHighlightedMeasurement?.(key)}
              onBlur={() => setHighlightedMeasurement?.(null)}
              placeholder={`Enter ${label} measurement`}
              error={!!validationErrors[key]}
              data-error={key}
            />
            {validationErrors[key] && (
              <p className="text-red-500 text-sm mt-1">{validationErrors[key]}</p>
            )}
            {typoSuggestions[key] && (
              <div className="bg-amber-50 border border-amber-500 rounded p-2 mt-2">
                <p className="text-sm text-amber-800">
                  Did you mean {typoSuggestions[key]}?
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      handleMeasurementChange(key, typoSuggestions[key].toString());
                      dismissTypoSuggestion?.(key);
                    }}
                    className="text-xs bg-amber-500 text-white px-2 py-1 rounded"
                  >
                    Use this value
                  </button>
                  <button
                    onClick={() => dismissTypoSuggestion?.(key)}
                    className="text-xs bg-slate-300 text-slate-700 px-2 py-1 rounded"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
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
