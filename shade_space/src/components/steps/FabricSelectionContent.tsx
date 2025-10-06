import React from 'react';
import { Button } from '../ui/Button';
import { FABRICS } from '../../data/fabrics';

export function FabricSelectionContent({ config, updateConfig, onNext, onPrev, showBackButton }: any) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Select Fabric Type</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FABRICS.map((fabric) => (
            <button
              key={fabric.id}
              onClick={() => updateConfig({ fabricType: fabric.id })}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                config.fabricType === fabric.id
                  ? 'border-[#BFF102] bg-[#BFF102]/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-semibold text-slate-900">{fabric.label}</div>
              <div className="text-sm text-slate-600 mt-1">{fabric.detailedDescription}</div>
            </button>
          ))}
        </div>
      </div>

      {config.fabricType && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Select Color</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {FABRICS.find(f => f.id === config.fabricType)?.colors.map((color) => (
              <button
                key={color.name}
                onClick={() => updateConfig({ fabricColor: color.name })}
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  config.fabricColor === color.name
                    ? 'border-[#BFF102] bg-[#BFF102]/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-medium text-slate-900">{color.name}</div>
                <div className="text-xs text-slate-600">Shade: {color.shadeFactor}%</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        {showBackButton && (
          <Button variant="outline" onClick={onPrev}>Back</Button>
        )}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!config.fabricType || !config.fabricColor}
          className="ml-auto"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
