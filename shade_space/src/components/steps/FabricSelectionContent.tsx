import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { FABRICS } from '../../data/fabrics';

interface FabricSelectionContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors: { [key: string]: string };
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
}

export function FabricSelectionContent({
  config,
  updateConfig,
  validationErrors,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton
}: FabricSelectionContentProps) {
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#01312D] mb-3">
            Select Fabric Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FABRICS.map((fabric) => (
              <button
                key={fabric.id}
                onClick={() => updateConfig({ fabricType: fabric.id as any })}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  config.fabricType === fabric.id
                    ? 'border-[#BFF102] bg-[#BFF102]/10'
                    : 'border-slate-200 hover:border-[#307C31]'
                }`}
              >
                <div className="font-bold text-[#01312D]">{fabric.label}</div>
                <div className="text-sm text-[#01312D]/60 mt-1">
                  {fabric.detailedDescription}
                </div>
              </button>
            ))}
          </div>
          {validationErrors.fabricType && (
            <p className="text-red-500 text-sm mt-2">{validationErrors.fabricType}</p>
          )}
        </div>

        {selectedFabric && (
          <div>
            <label className="block text-sm font-bold text-[#01312D] mb-3">
              Select Color
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selectedFabric.colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => updateConfig({ fabricColor: color.name })}
                  className={`p-3 border-2 rounded-lg transition-all ${
                    config.fabricColor === color.name
                      ? 'border-[#BFF102] bg-[#BFF102]/10'
                      : 'border-slate-200 hover:border-[#307C31]'
                  }`}
                >
                  <div className="font-semibold text-[#01312D] text-sm">{color.name}</div>
                  {color.imageUrl && (
                    <img
                      src={color.imageUrl}
                      alt={color.name}
                      className="w-full h-16 object-cover rounded mt-2"
                    />
                  )}
                </button>
              ))}
            </div>
            {validationErrors.fabricColor && (
              <p className="text-red-500 text-sm mt-2">{validationErrors.fabricColor}</p>
            )}
          </div>
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
